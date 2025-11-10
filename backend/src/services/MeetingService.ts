import { ObjectId, OptionalUnlessRequiredId, UpdateFilter } from 'mongodb';
import { Meeting, MeetingCreate, MeetingUpdate, Recording, MeetingRecordingOrderItem, RecordingResponse } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument } from '../types/documents';
import { meetingDocumentToMeeting } from '../utils/mongoMappers';
import { getRecordingsByMeetingId } from './RecordingService';
import { getNotesByMeetingId } from './NoteService';
import { internal } from '../utils/errors';
import { normalizeHotwords } from '../utils/hotwordUtils';
import { mergeHotwordsIntoMeeting } from './meetingHotwordHelpers';
import { getById as getUserById } from './UserService';
import { HotwordService } from './HotwordService';
import { normalizeAgendaItems } from '../utils/agendaUtils';

const getMeetingsCollection = () => getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
const hotwordService = new HotwordService();

type MeetingMemberBase = NonNullable<MeetingDocument['members']>[number];

type MeetingMemberEntry = MeetingMemberBase | string | { toString: () => string };

const toObjectIdOrUndefined = (value?: string): ObjectId | undefined => {
  if (!value || !ObjectId.isValid(value)) {
    return undefined;
  }
  return new ObjectId(value);
};

const recordingResponseToRecording = (recording: RecordingResponse): Recording => ({
  _id: toObjectIdOrUndefined(recording._id) ?? new ObjectId(),
  originalFileName: recording.originalFileName,
  createdAt: new Date(recording.createdAt),
  updatedAt: recording.updatedAt ? new Date(recording.updatedAt) : undefined,
  duration: recording.duration,
  fileSize: recording.fileSize,
  transcription: recording.transcription,
  verbatimTranscript: recording.verbatimTranscript,
  speakerSegments: recording.speakerSegments,
  timeStampedNotes: recording.timeStampedNotes,
  alignmentItems: recording.alignmentItems,
  numSpeakers: recording.numSpeakers,
  sampleRate: recording.sampleRate,
  channels: recording.channels,
  format: recording.format,
  source: recording.source,
  speakerNames: recording.speakerNames,
  hotwords: recording.hotwords,
  organizedSpeeches: recording.organizedSpeeches,
  meetingId: toObjectIdOrUndefined(recording.meetingId),
  ownerId: toObjectIdOrUndefined(recording.ownerId),
});

const normalizeRecordingOrderEntries = (
  order: MeetingRecordingOrderItem[] | undefined
): MeetingRecordingOrderItem[] | undefined => {
  if (!Array.isArray(order)) {
    return undefined;
  }

  const normalized = order
    .map((entry, idx) => {
      if (!entry || !entry.recordingId) {
        return null;
      }
      const raw = entry.recordingId;
      const recordingId = raw instanceof ObjectId
        ? raw
        : ObjectId.isValid(raw)
          ? new ObjectId(raw)
          : null;
      if (!recordingId) {
        return null;
      }
      return {
        recordingId,
        index: typeof entry.index === 'number' ? entry.index : idx,
        enabled: entry.enabled !== false,
      } satisfies MeetingRecordingOrderItem;
    })
    .filter((value): value is MeetingRecordingOrderItem => value !== null)
    .sort((a, b) => a.index - b.index)
    .map((entry, idx) => ({
      ...entry,
      index: idx,
    }));

  return normalized.length > 0 ? normalized : [];
};

export const getMeetingsForUser = async (
  userId: string,
  limit?: number | 'all',
): Promise<Meeting[]> => {
  const meetingsCollection = getMeetingsCollection();
  const uid = new ObjectId(userId);

  const pipeline: any[] = [
    {
      $match: {
        $or: [
          { ownerId: uid },
          { members: { $elemMatch: { $eq: uid } } }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $lookup: {
        from: COLLECTIONS.RECORDINGS,
        localField: '_id',
        foreignField: 'meetingId',
        as: 'recordings'
      }
    },
    {
      $lookup: {
        from: COLLECTIONS.NOTES,
        localField: '_id',
        foreignField: 'meetingId',
        as: 'notes'
      }
    },
    {
      $addFields: {
        recordings: {
          $map: {
            input: '$recordings',
            as: 'recording',
            in: {
              $mergeObjects: [
              '$$recording',
              {
                createdAt: { $ifNull: ['$$recording.createdAt', new Date()] },
                updatedAt: { $ifNull: ['$$recording.updatedAt', null] }
              }
              ]
            }
          }
        }
      }
    }
  ];

  if (limit !== 'all') {
    const limitCount = typeof limit === 'number' ? limit : 100;
    pipeline.push({ $limit: limitCount });
  }

  const meetings = await meetingsCollection.aggregate<MeetingDocument>(pipeline).toArray();
  return meetings.map(meetingDocumentToMeeting);
};

export const getAllMeetings = async (limit?: number | 'all'): Promise<Meeting[]> => {
  const meetingsCollection = getMeetingsCollection();

  const pipeline: any[] = [
    {
      $sort: { createdAt: -1 }
    },
    {
      $lookup: {
        from: COLLECTIONS.RECORDINGS,
        localField: '_id',
        foreignField: 'meetingId',
        as: 'recordings'
      }
    },
    {
      $lookup: {
        from: COLLECTIONS.NOTES,
        localField: '_id',
        foreignField: 'meetingId',
        as: 'notes'
      }
    },
    {
      $addFields: {
        recordings: {
          $map: {
            input: '$recordings',
            as: 'recording',
            in: {
              $mergeObjects: [
              '$$recording',
              {
                createdAt: { $ifNull: ['$$recording.createdAt', new Date()] },
                updatedAt: { $ifNull: ['$$recording.updatedAt', null] }
              }
              ]
            }
          }
        }
      }
    }
  ];

  if (limit !== 'all') {
    const limitCount = typeof limit === 'number' ? limit : 100;
    pipeline.push({ $limit: limitCount });
  }

  const meetings = await meetingsCollection.aggregate<MeetingDocument>(pipeline).toArray();
  return meetings.map(meetingDocumentToMeeting);
};

export const getMeetingById = async (id: string, options: { includeRecordings?: boolean } = {}): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const meeting = await collection.findOne({ _id: new ObjectId(id) });
  if (!meeting) {
    return null;
  }
  const { includeRecordings = true } = options;
  if (!includeRecordings) {
    const notes = await getNotesByMeetingId(id);
    return meetingDocumentToMeeting({ ...meeting, notes });
  }
  const recordings = await getRecordingsByMeetingId(id);
  const recordingDocs = recordings.map(recordingResponseToRecording);
  const notes = await getNotesByMeetingId(id);
  return meetingDocumentToMeeting({ ...meeting, recordings: recordingDocs, notes });
};

export const createMeeting = async (request: MeetingCreate, ownerId?: string): Promise<Meeting> => {
  const collection = getMeetingsCollection();
  const now = new Date();
  const normalizedHotwords = normalizeHotwords(request.hotwords);
  const validStatuses: Meeting['status'][] = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  const status: Meeting['status'] = request.status && validStatuses.includes(request.status)
    ? request.status
    : 'scheduled';
  const scheduledStart = request.scheduledStart ?? (status === 'in_progress' ? now : undefined);

  const meetingId = new ObjectId();
  const normalizedAgenda = normalizeAgendaItems(request.agenda);

  const meetingDoc: OptionalUnlessRequiredId<MeetingDocument> = {
    _id: meetingId,
    title: request.title,
    summary: request.summary,
    agenda: normalizedAgenda,
    status,
    createdAt: now,
    updatedAt: now,
    scheduledStart,
    recordings: [],
    recordingOrder: normalizeRecordingOrderEntries(request.recordingOrder) ?? [],
    finalTranscript: undefined,
    ownerId: ownerId && ObjectId.isValid(ownerId) ? new ObjectId(ownerId) : undefined,
    members: [],
  };

  if (normalizedHotwords !== undefined) {
    meetingDoc.hotwords = normalizedHotwords;
  }

  const result = await collection.insertOne(meetingDoc);
  const insertedMeeting = await collection.findOne({ _id: result.insertedId });

  if (!insertedMeeting) {
    throw internal('创建会议失败', 'meeting.create_failed');
  }

  return meetingDocumentToMeeting(insertedMeeting);
};

export const updateMeeting = async (id: string, request: MeetingUpdate): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const updateData = { ...request };
  if ('_id' in updateData) {
    delete updateData._id;
  }
  if (request.hotwords !== undefined) {
    updateData.hotwords = normalizeHotwords(request.hotwords) ?? [];
  }
  // Always use the id from the URL parameter, not from the request body
  const updateFields: Partial<MeetingDocument> = { ...updateData, updatedAt: new Date() };

  if (Array.isArray(updateData.recordingOrder)) {
    updateFields.recordingOrder = normalizeRecordingOrderEntries(updateData.recordingOrder) ?? [];
  }
  if (Array.isArray(updateData.agenda)) {
    const normalizedAgenda = normalizeAgendaItems(updateData.agenda);
    if (normalizedAgenda !== undefined) {
      updateFields.agenda = normalizedAgenda;
    }
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return meetingDocumentToMeeting(result);
};

export const deleteMeeting = async (id: string): Promise<boolean> => {
  const collection = getMeetingsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
};

export const removeRecordingFromMeeting = async (
  meetingId: string,
  recordingId: string
): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const update = {
    $pull: { recordings: { _id: new ObjectId(recordingId) } },
    $set: { updatedAt: new Date() },
  } as unknown as UpdateFilter<MeetingDocument>;
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    update,
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return meetingDocumentToMeeting(result);
};

export const updateConcatenatedRecording = async (meetingId: string, recording: Recording | null): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const updateOperations: Record<string, any> = {
    $set: { updatedAt: new Date() }
  };

  if (recording) {
    updateOperations.$set.concatenatedRecording = recording;
    updateOperations.$unset = { ...(updateOperations.$unset || {}), combinedRecording: '' };
  } else {
    updateOperations.$unset = { concatenatedRecording: '', combinedRecording: '' };
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    updateOperations,
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return meetingDocumentToMeeting(result);
};

export const getMeetingsByStatus = async (status: Meeting['status']): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({ status }).toArray();
  return meetings.map(meetingDocumentToMeeting);
};

export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const now = new Date();
  const meetings = await collection
    .find({
      scheduledStart: { $gt: now }
    })
    .toArray();
  return meetings.map(meetingDocumentToMeeting);
};

export async function addMember(meetingId: string, userId: string): Promise<Meeting | null> {
  const collection = getMeetingsCollection();
  const meetingObjectId = new ObjectId(meetingId);
  const memberObjectId = new ObjectId(userId);

  const existingMeeting = await collection.findOne(
    { _id: meetingObjectId },
    { projection: { members: 1 } }
  );

  if (!existingMeeting) {
    return null;
  }

  const members = Array.isArray(existingMeeting.members)
    ? (existingMeeting.members as MeetingMemberEntry[])
    : [];
  const alreadyMember = members.some((member) => {
    if (member instanceof ObjectId) {
      return member.equals(memberObjectId);
    }
    if (typeof member === 'string') {
      return member === userId;
    }
    if (member && typeof (member as { toString?: unknown }).toString === 'function') {
      return (member as { toString: () => string }).toString() === userId;
    }
    return false;
  });

  const update: UpdateFilter<MeetingDocument> = {
    $addToSet: { members: memberObjectId },
    $set: { updatedAt: new Date() },
  };

  await collection.updateOne({ _id: meetingObjectId }, update);

  if (!alreadyMember) {
    const user = await getUserById(userId);
    const additions: string[] = [];

    if (user?.name && user.name.trim().length > 0) {
      additions.push(user.name.trim());
    }

    if (user?.aliases) {
      const aliasHotwords = normalizeHotwords(user.aliases);
      if (aliasHotwords && aliasHotwords.length > 0) {
        additions.push(...aliasHotwords);
      }
    }

    const publicHotwords = await hotwordService.getPublicHotwordsForOwner(userId);
    if (publicHotwords.length > 0) {
      additions.push(...publicHotwords.map((hotword) => hotword.word));
    }

    if (additions.length > 0) {
      await mergeHotwordsIntoMeeting(meetingObjectId, additions);
    }
  }

  const updatedMeeting = await collection.findOne({ _id: meetingObjectId });

  return updatedMeeting ? meetingDocumentToMeeting(updatedMeeting) : null;
}

export async function removeMember(meetingId: string, userId: string): Promise<Meeting | null> {
  const collection = getMeetingsCollection();
  const update = {
    $pull: { members: new ObjectId(userId) },
    $set: { updatedAt: new Date() },
  } as unknown as UpdateFilter<MeetingDocument>;
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    update,
    { returnDocument: 'after' }
  );
  return result ? meetingDocumentToMeeting(result) : null;
}

export async function isOwner(meetingId: string, userId: string): Promise<boolean> {
  const collection = getMeetingsCollection();
  const doc = await collection.findOne({ _id: new ObjectId(meetingId) }, { projection: { ownerId: 1 } });
  return !!doc && !!doc.ownerId && doc.ownerId.toString() === userId;
}

export async function isMember(meetingId: string, userId: string): Promise<boolean> {
  const collection = getMeetingsCollection();
  const uid = new ObjectId(userId);
  const doc = await collection.findOne(
    { _id: new ObjectId(meetingId), members: { $elemMatch: { $eq: uid } } },
    { projection: { _id: 1 } }
  );
  return !!doc;
}

export const meetingService = {
  getMeetingsForUser,
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  removeRecordingFromMeeting,
  updateConcatenatedRecording,
  getMeetingsByStatus,
  getUpcomingMeetings,
  addMember,
  removeMember,
  isOwner,
  isMember,
};

export default meetingService;

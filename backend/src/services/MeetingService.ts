import { ObjectId } from 'mongodb';
import { Meeting, MeetingCreate, MeetingUpdate, Recording, MeetingRecordingOrderItem } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument } from '../types/documents';
import { meetingDocumentToMeeting } from '../utils/mongoMappers';
import { getRecordingsByMeetingId } from './RecordingService';
import { internal } from '../utils/errors';

const getMeetingsCollection = () => getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);

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

  const meetings = await meetingsCollection.aggregate(pipeline).toArray();
  return meetings.map((doc) => meetingDocumentToMeeting(doc as MeetingDocument));
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

  const meetings = await meetingsCollection.aggregate(pipeline).toArray();
  return meetings.map((doc) => meetingDocumentToMeeting(doc as MeetingDocument));
};

export const getMeetingById = async (id: string, options: { includeRecordings?: boolean } = {}): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const meeting = await collection.findOne({ _id: new ObjectId(id) });
  if (!meeting) {
    return null;
  }
  const { includeRecordings = true } = options;
  if (!includeRecordings) {
    return meetingDocumentToMeeting(meeting);
  }
  const recordings = await getRecordingsByMeetingId(id);
  // Convert RecordingResponse[] to Recording[]
  const recordingDocs = recordings.map(recording => {
    return {
      ...recording,
      _id: recording._id,
      createdAt: new Date(recording.createdAt),
      updatedAt: recording.updatedAt ? new Date(recording.updatedAt) : undefined
    };
  });
  return meetingDocumentToMeeting({ ...meeting, recordings: recordingDocs as any });
};

export const createMeeting = async (request: MeetingCreate, ownerId?: string): Promise<Meeting> => {
  const collection = getMeetingsCollection();
  const now = new Date();

  const meetingDoc: Omit<MeetingDocument, '_id'> = {
    title: request.title,
    summary: request.summary,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
    scheduledStart: request.scheduledStart,
    recordings: [],
    recordingOrder: normalizeRecordingOrderEntries(request.recordingOrder) ?? [],
    finalTranscript: undefined,
    participants: request.participants,
    ownerId: ownerId && ObjectId.isValid(ownerId) ? new ObjectId(ownerId) : undefined,
    members: [],
  };

  const result = await collection.insertOne(meetingDoc as any);
  const insertedMeeting = await collection.findOne({ _id: result.insertedId });

  if (!insertedMeeting) {
    throw internal('Failed to create meeting', 'meeting.create_failed');
  }

  return meetingDocumentToMeeting(insertedMeeting);
};

export const updateMeeting = async (id: string, request: MeetingUpdate): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const updateData = { ...request };
  if ('_id' in updateData) {
    delete updateData._id;
  }
  // Always use the id from the URL parameter, not from the request body
  const updateFields: Partial<MeetingDocument> = { ...updateData, updatedAt: new Date() };

  if (Array.isArray(updateData.recordingOrder)) {
    updateFields.recordingOrder = normalizeRecordingOrderEntries(updateData.recordingOrder) ?? [];
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

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    {
      $pull: { recordings: { _id: new ObjectId(recordingId) } } as any,
      $set: { updatedAt: new Date() }
    },
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

export const getMeetingsByStatus = async (status: string): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({ status: status as any }).toArray();
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
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    {
      $addToSet: { members: new ObjectId(userId) },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' }
  );
  return result ? meetingDocumentToMeeting(result) : null;
}

export async function removeMember(meetingId: string, userId: string): Promise<Meeting | null> {
  const collection = getMeetingsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    {
      // Mongo types can be overly strict here; the runtime accepts this shape
      $pull: { members: new ObjectId(userId) } as any,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' }
  );
  return result ? meetingDocumentToMeeting(result) : null;
}

export async function isOwner(meetingId: string, userId: string): Promise<boolean> {
  const collection = getMeetingsCollection();
  const doc = await collection.findOne({ _id: new ObjectId(meetingId) }, { projection: { ownerId: 1 } as any });
  return !!doc && !!doc.ownerId && doc.ownerId.toString() === userId;
}

export async function isMember(meetingId: string, userId: string): Promise<boolean> {
  const collection = getMeetingsCollection();
  const uid = new ObjectId(userId);
  const doc = await collection.findOne({ _id: new ObjectId(meetingId), members: { $elemMatch: { $eq: uid } } }, { projection: { _id: 1 } as any });
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

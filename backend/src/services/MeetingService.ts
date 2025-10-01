import { ObjectId } from 'mongodb';
import { Meeting, MeetingCreate, MeetingUpdate, Recording } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument } from '../types/documents';
import { meetingDocumentToMeeting } from '../utils/mongoMappers';
import { getRecordingsByMeetingId } from './RecordingService';
import { internal } from '../utils/errors';

const getMeetingsCollection = () => getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);

export const getMeetingsForUser = async (userId: string): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const uid = new ObjectId(userId);
  const meetings = await collection.find({ $or: [
    { ownerId: uid },
    { members: { $elemMatch: { $eq: uid } } },
  ] }).toArray();
  return meetings.map(meetingDocumentToMeeting);
};

export const getAllMeetings = async (): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({}).toArray();
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

export const createMeeting = async (request: MeetingCreate, ownerId: string): Promise<Meeting> => {
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
    finalTranscript: undefined,
    participants: request.participants,
    ownerId: new ObjectId(ownerId),
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
  const updateData = request;

  // Always use the id from the URL parameter, not from the request body
  const updateFields: Partial<MeetingDocument> = { ...updateData, updatedAt: new Date() };

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

export const updateCombinedRecording = async (meetingId: string, recording: Recording | null): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const updateOperations: Record<string, any> = {
    $set: { updatedAt: new Date() }
  };

  if (recording) {
    updateOperations.$set.combinedRecording = recording;
  } else {
    updateOperations.$unset = { combinedRecording: '' };
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
      $pull: { members: new ObjectId(userId) },
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
  updateCombinedRecording,
  getMeetingsByStatus,
  getUpcomingMeetings,
  addMember,
  removeMember,
  isOwner,
  isMember,
};

export default meetingService;

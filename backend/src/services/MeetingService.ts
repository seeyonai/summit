import { ObjectId } from 'mongodb';
import { Meeting, MeetingCreate, MeetingUpdate, Recording } from '../types';
import { getCollection, COLLECTIONS, MeetingDocument, meetingToApp } from '../types/mongodb';
import { getRecordingsByMeetingId } from './RecordingService';

const getMeetingsCollection = () => getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);

export const getAllMeetings = async (): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({}).toArray();
  return meetings.map(meetingToApp);
};

export const getMeetingById = async (id: string, options: { includeRecordings?: boolean } = {}): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const meeting = await collection.findOne({ _id: new ObjectId(id) });
  if (!meeting) {
    return null;
  }
  const { includeRecordings = true } = options;
  if (!includeRecordings) {
    return meetingToApp(meeting);
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
  return meetingToApp({ ...meeting, recordings: recordingDocs as any });
};

export const createMeeting = async (request: MeetingCreate): Promise<Meeting> => {
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
    participants: request.participants
  };

  const result = await collection.insertOne(meetingDoc as any);
  const insertedMeeting = await collection.findOne({ _id: result.insertedId });

  if (!insertedMeeting) {
    throw new Error('Failed to create meeting');
  }

  return meetingToApp(insertedMeeting);
};

export const updateMeeting = async (id: string, request: MeetingUpdate): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const { _id, ...updateData } = request;

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

  return meetingToApp(result);
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

  return meetingToApp(result);
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

  return meetingToApp(result);
};

export const getMeetingsByStatus = async (status: string): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({ status: status as any }).toArray();
  return meetings.map(meetingToApp);
};

export const getUpcomingMeetings = async (): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const now = new Date();
  const meetings = await collection
    .find({
      scheduledStart: { $gt: now }
    })
    .toArray();
  return meetings.map(meetingToApp);
};

export const meetingService = {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  removeRecordingFromMeeting,
  updateCombinedRecording,
  getMeetingsByStatus,
  getUpcomingMeetings
};

export default meetingService;

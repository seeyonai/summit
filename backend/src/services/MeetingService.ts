import { ObjectId } from 'mongodb';
import { Meeting, MeetingCreate, MeetingUpdate, Recording } from '../types';
import { getCollection, COLLECTIONS, MeetingDocument, meetingToApp } from '../types/mongodb';

const getMeetingsCollection = () => getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);

export const getAllMeetings = async (): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({}).toArray();
  return meetings.map(meetingToApp);
};

export const getMeetingById = async (id: string): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const meeting = await collection.findOne({ _id: new ObjectId(id) });
  return meeting ? meetingToApp(meeting) : null;
};

export const createMeeting = async (request: MeetingCreate): Promise<Meeting> => {
  const collection = getMeetingsCollection();
  const now = new Date();

  const meetingDoc: Omit<MeetingDocument, '_id'> = {
    title: request.title,
    description: request.description,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
    scheduledStart: request.scheduledStart,
    recordings: [],
    finalTranscript: undefined,
    participants: request.participants
  };

  const result = await collection.insertOne(meetingDoc);
  const insertedMeeting = await collection.findOne({ _id: result.insertedId });

  if (!insertedMeeting) {
    throw new Error('Failed to create meeting');
  }

  return meetingToApp(insertedMeeting);
};

export const updateMeeting = async (id: string, request: MeetingUpdate): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();
  const { _id, ...updateData } = request;

  const updateFields: Partial<MeetingDocument> = { ...updateData, updatedAt: new Date() };

  if (updateData.recordings) {
    updateFields.recordings = updateData.recordings.map((recording) => ({
      ...recording,
      _id: recording._id instanceof ObjectId
        ? recording._id
        : ObjectId.isValid(recording._id) ? new ObjectId(recording._id) : new ObjectId(),
      createdAt: recording.createdAt instanceof Date ? recording.createdAt : new Date(recording.createdAt),
    }));
  }

  const result = await collection.findOneAndUpdate(
    { _id: _id || new ObjectId(id) },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  return result.value ? meetingToApp(result.value) : null;
};

export const deleteMeeting = async (id: string): Promise<boolean> => {
  const collection = getMeetingsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
};

export const addRecordingToMeeting = async (meetingId: string, recording: Recording): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    {
      $push: { recordings: recording },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );

  return result.value ? meetingToApp(result.value) : null;
};

export const removeRecordingFromMeeting = async (
  meetingId: string,
  recordingId: string
): Promise<Meeting | null> => {
  const collection = getMeetingsCollection();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(meetingId) },
    {
      $pull: { recordings: { _id: new ObjectId(recordingId) } },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );

  return result.value ? meetingToApp(result.value) : null;
};

export const getMeetingsByStatus = async (status: string): Promise<Meeting[]> => {
  const collection = getMeetingsCollection();
  const meetings = await collection.find({ status }).toArray();
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
  addRecordingToMeeting,
  removeRecordingFromMeeting,
  getMeetingsByStatus,
  getUpcomingMeetings
};

export default meetingService;

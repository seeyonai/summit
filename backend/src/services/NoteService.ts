import { ObjectId, OptionalUnlessRequiredId } from 'mongodb';
import { Note, NoteCreate, NoteUpdate } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, NoteDocument } from '../types/documents';
import { noteDocumentToNote } from '../utils/mongoMappers';
import { internal } from '../utils/errors';

const getNotesCollection = () => getCollection<NoteDocument>(COLLECTIONS.NOTES);

export const getAllNotes = async (limit?: number | 'all'): Promise<Note[]> => {
  const notesCollection = getNotesCollection();

  const pipeline: any[] = [
    {
      $sort: { createdAt: -1 }
    },
    {
      $lookup: {
        from: COLLECTIONS.MEETINGS,
        localField: 'meetingId',
        foreignField: '_id',
        as: 'meeting'
      }
    },
    {
      $addFields: {
        meeting: { $arrayElemAt: ['$meeting', 0] }
      }
    }
  ];

  if (limit !== 'all') {
    const limitCount = typeof limit === 'number' ? limit : 100;
    pipeline.push({ $limit: limitCount });
  }

  const notes = await notesCollection.aggregate<NoteDocument>(pipeline).toArray();
  return notes.map(noteDocumentToNote);
};

export const getNotesForUser = async (userId: string, limit?: number | 'all'): Promise<Note[]> => {
  const notesCollection = getNotesCollection();
  const uid = new ObjectId(userId);

  const pipeline: any[] = [
    {
      $match: { ownerId: uid }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $lookup: {
        from: COLLECTIONS.MEETINGS,
        localField: 'meetingId',
        foreignField: '_id',
        as: 'meeting'
      }
    },
    {
      $addFields: {
        meeting: { $arrayElemAt: ['$meeting', 0] }
      }
    }
  ];

  if (limit !== 'all') {
    const limitCount = typeof limit === 'number' ? limit : 100;
    pipeline.push({ $limit: limitCount });
  }

  const notes = await notesCollection.aggregate<NoteDocument>(pipeline).toArray();
  return notes.map(noteDocumentToNote);
};

export const getNoteById = async (id: string): Promise<Note | null> => {
  const collection = getNotesCollection();
  const note = await collection.findOne({ _id: new ObjectId(id) });
  if (!note) {
    return null;
  }
  return noteDocumentToNote(note);
};

export const getNotesByMeetingId = async (meetingId: string): Promise<Note[]> => {
  const collection = getNotesCollection();
  const notes = await collection.find({ meetingId: new ObjectId(meetingId) }).sort({ createdAt: -1 }).toArray();
  return notes.map(noteDocumentToNote);
};

export const createNote = async (request: NoteCreate, ownerId?: string): Promise<Note> => {
  const collection = getNotesCollection();
  const now = new Date();

  const noteId = new ObjectId();

  const noteDoc: OptionalUnlessRequiredId<NoteDocument> = {
    _id: noteId,
    title: request.title,
    content: request.content,
    status: request.status || 'draft',
    tags: request.tags,
    meetingId: request.meetingId ? new ObjectId(request.meetingId as any) : undefined,
    ownerId: ownerId && ObjectId.isValid(ownerId) ? new ObjectId(ownerId) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(noteDoc);
  const insertedNote = await collection.findOne({ _id: result.insertedId });

  if (!insertedNote) {
    throw internal('创建速记失败', 'note.create_failed');
  }

  return noteDocumentToNote(insertedNote);
};

export const updateNote = async (id: string, request: NoteUpdate): Promise<Note | null> => {
  const collection = getNotesCollection();
  const updateData = { ...request };
  if ('_id' in updateData) {
    delete updateData._id;
  }

  const updateFields: Partial<NoteDocument> = { ...updateData, updatedAt: new Date() };

  if (updateData.meetingId !== undefined) {
    updateFields.meetingId = updateData.meetingId ? new ObjectId(updateData.meetingId as any) : undefined;
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return noteDocumentToNote(result);
};

export const deleteNote = async (id: string): Promise<boolean> => {
  const collection = getNotesCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
};

export const associateWithMeeting = async (noteId: string, meetingId: string): Promise<Note | null> => {
  return updateNote(noteId, { meetingId: new ObjectId(meetingId) as any });
};

export const disassociateFromMeeting = async (noteId: string): Promise<Note | null> => {
  const collection = getNotesCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(noteId) },
    { $unset: { meetingId: '' }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return noteDocumentToNote(result);
};

export const noteService = {
  getAllNotes,
  getNotesForUser,
  getNoteById,
  getNotesByMeetingId,
  createNote,
  updateNote,
  deleteNote,
  associateWithMeeting,
  disassociateFromMeeting,
};

export default noteService;

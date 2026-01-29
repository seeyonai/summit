import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import noteService from '../services/NoteService';
import { NoteCreate, NoteUpdate, Note } from '../types';
import { RequestWithUser } from '../types/auth';

const router = Router();

const toIsoString = (value?: Date | string): string | undefined => {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const serializeNote = (note: Note) => ({
  ...note,
  _id: note._id.toString(),
  meetingId: note.meetingId ? note.meetingId.toString() : undefined,
  ownerId: note.ownerId ? note.ownerId.toString() : undefined,
  createdAt: toIsoString(note.createdAt),
  updatedAt: toIsoString(note.updatedAt),
});

// Get notes for current user (default limit 100; use ?all=true to fetch all)
router.get('/', async (req: Request, res: Response) => {
  try {
    const r = req as RequestWithUser;
    const userId = r.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const all = typeof req.query.all === 'string' && ['true', '1', 'yes'].includes(req.query.all.toLowerCase());
    const desired = all ? 'all' : 101;
    const list = r.user?.role === 'admin' ? await noteService.getAllNotes(desired) : await noteService.getNotesForUser(userId, desired);
    const overLimit = !all && list.length > 100;
    const items = overLimit ? list.slice(0, 100) : list;
    const fetchedAll = all || !overLimit;
    res.json({ items: items.map(serializeNote), fetchedAll });
  } catch (error) {
    console.error('Error getting notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get note by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }
    const note = await noteService.getNoteById(id);

    if (!note) {
      return res.status(404).json({ error: `Note not found (ID: ${id})` });
    }

    res.json(serializeNote(note));
  } catch (error) {
    console.error('Error getting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new note
router.post('/', async (req: Request, res: Response) => {
  try {
    const r = req as RequestWithUser;
    const userId = r.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const request: NoteCreate = req.body;

    // Validate required fields
    if (!request.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!request.content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await noteService.createNote(request, userId);
    res.status(201).json(serializeNote(note));
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update note
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request: NoteUpdate = req.body;

    const note = await noteService.updateNote(id, request);

    if (!note) {
      return res.status(404).json({ error: `Note not found (ID: ${id})` });
    }

    res.json(serializeNote(note));
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete note
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await noteService.deleteNote(id);

    if (!deleted) {
      return res.status(404).json({ error: `Note not found (ID: ${id})` });
    }

    res.json({ message: '速记删除成功' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Associate note with meeting
router.post('/:id/associate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID is required' });
    }

    if (!ObjectId.isValid(meetingId)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }

    const note = await noteService.associateWithMeeting(id, meetingId);

    if (!note) {
      return res.status(404).json({ error: `Note not found (ID: ${id})` });
    }

    res.json(serializeNote(note));
  } catch (error) {
    console.error('Error associating note with meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disassociate note from meeting
router.post('/:id/disassociate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const note = await noteService.disassociateFromMeeting(id);

    if (!note) {
      return res.status(404).json({ error: `Note not found (ID: ${id})` });
    }

    res.json(serializeNote(note));
  } catch (error) {
    console.error('Error disassociating note from meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export note as text file
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const note = await noteService.getNoteById(id);

    if (!note) {
      return res.status(404).json({ error: `Note not found (ID: ${id})` });
    }

    // Generate text content
    const textContent = `${note.title}
${'='.repeat(note.title.length)}

${note.content}

---
Status: ${note.status}
${note.tags && note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : ''}
Created: ${note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt}
${note.updatedAt ? `Updated: ${note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt}` : ''}
`;

    // Set response headers for file download
    const filename = `${note.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    res.send(textContent);
  } catch (error) {
    console.error('Error exporting note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ObjectId, type Filter } from 'mongodb';
import { asyncHandler } from '../middleware/errorHandler';
import type { RequestWithUser } from '../types/auth';
import { verifyJwt } from '../utils/jwt';
import { getCollection } from '../config/database';
import { COLLECTIONS, RecordingDocument, MeetingDocument } from '../types/documents';
import { getFilesBaseDir, resolveExistingPathFromCandidate } from '../utils/filePaths';
import { getMimeType } from '../utils/recordingHelpers';
import { forbidden, notFound } from '../utils/errors';
import { debug, debugWarn } from '../utils/logger';

const router = Router();

async function findRecordingById(id: string): Promise<RecordingDocument | null> {
  const col = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
  if (!ObjectId.isValid(id)) return null;
  const filter: Filter<RecordingDocument> = { _id: new ObjectId(id) };
  return col.findOne(filter);
}

async function userHasAccess(rec: RecordingDocument, userId: string, role?: string): Promise<boolean> {
  if (role === 'admin') {
    return true;
  }
  if (rec.ownerId && rec.ownerId.toString() === userId) {
    return true;
  }
  if (!rec.meetingId) {
    return false;
  }
  const meetingCollection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
  const meetingFilter: Filter<MeetingDocument> = { _id: rec.meetingId };
  const meeting = await meetingCollection.findOne(meetingFilter);
  if (!meeting) return false;
  const isOwner = meeting.ownerId && meeting.ownerId.toString() === userId;
  const isMember = Array.isArray(meeting.members) && meeting.members.some((m) => m.toString() === userId);
  return !!isOwner || !!isMember;
}

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const r = req as RequestWithUser;
  let userId = r.user?.userId;
  let role = r.user?.role;
  if (!userId) {
    const header = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : queryToken;
    if (!token) {
      debugWarn('File access denied: missing token');
      throw forbidden('Unauthorized', 'auth.unauthorized');
    }
    try {
      const payload = verifyJwt(token);
      userId = payload.userId;
      role = payload.role;
      debug('File access via query/header token', { userId, role });
    } catch {
      debugWarn('File access denied: invalid token');
      throw forbidden('Unauthorized', 'auth.unauthorized');
    }
  }
  const { id } = req.params as { id: string };
  debug('File request received', { id, userId, role });
  const rec = await findRecordingById(id);
  if (!rec) {
    debugWarn('File not found in DB', { id });
    throw notFound('Recording not found', 'recording.not_found');
  }
  const allowed = await userHasAccess(rec, userId!, role);
  if (!allowed) {
    debugWarn('File access forbidden', { id, userId, role });
    throw forbidden('Not allowed due to file access forbidden', 'recording.forbidden');
  }

  const baseDir = getFilesBaseDir();
  const ext = rec.format ?? 'wav';
  const storedName = `${rec._id.toString()}.${ext}`;
  const absolutePath = await resolveExistingPathFromCandidate(baseDir, storedName);

  const stat = fs.statSync(absolutePath);
  const mime = getMimeType(path.basename(absolutePath));
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const chunkSize = (end - start) + 1;
      debug('Streaming ranged file response', { file: path.basename(absolutePath), start, end, chunkSize });
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', String(chunkSize));
      res.setHeader('Content-Type', mime);
      const stream = fs.createReadStream(absolutePath, { start, end });
      stream.pipe(res);
      return;
    }
  }

  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Type', mime);
  debug('Streaming full file response', { file: path.basename(absolutePath), size: stat.size });
  const stream = fs.createReadStream(absolutePath);
  stream.pipe(res);
}));

export default router;

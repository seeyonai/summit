import type { NextFunction, Response } from 'express';
import { unauthorized, forbidden, notFound } from '../utils/errors';
import { verifyJwt } from '../utils/jwt';
import type { RequestWithUser } from '../types/auth';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument } from '../types/documents';
import type { RecordingDocument } from '../types/documents';

export function authenticate(req: RequestWithUser, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header || typeof header !== 'string') {
    next(unauthorized('Missing Authorization header', 'auth.missing_token'));
    return;
  }
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    next(unauthorized('Invalid Authorization header', 'auth.invalid_header'));
    return;
  }
  try {
    const payload = verifyJwt(token);
    req.user = payload;
    next();
  } catch (err) {
    next(unauthorized('Invalid or expired token', 'auth.invalid_token'));
  }
}

export function requireOwner() {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const meetingId = (req.params as any).id || (req.params as any).meetingId;
    if (!req.user || !meetingId) {
      next(unauthorized('Unauthorized', 'auth.unauthorized'));
      return;
    }
    const collection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
    const meeting = await collection.findOne({ _id: new ObjectId(meetingId) });
    if (!meeting || !meeting.ownerId) {
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    if (meeting.ownerId.toString() !== req.user.userId) {
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    next();
  };
}

export function requireMemberOrOwner() {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const meetingId = (req.params as any).id || (req.params as any).meetingId;
    if (!req.user || !meetingId) {
      next(unauthorized('Unauthorized', 'auth.unauthorized'));
      return;
    }
    const collection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
    const meeting = await collection.findOne({ _id: new ObjectId(meetingId) });
    if (!meeting) {
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    const isOwner = meeting.ownerId && meeting.ownerId.toString() === req.user.userId;
    const isMember = (meeting.members || []).some((m) => m.toString() === req.user?.userId);
    if (!isOwner && !isMember) {
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    next();
  };
}

export function requireAdmin(req: RequestWithUser, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized('Unauthorized', 'auth.unauthorized'));
    return;
  }
  if (req.user.role !== 'admin') {
    next(forbidden('Admin only', 'auth.admin_only'));
    return;
  }
  next();
}

async function findRecordingByIdentifier(recordingId: string): Promise<RecordingDocument | null> {
  const col = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
  if (ObjectId.isValid(recordingId)) {
    const byId = await col.findOne({ _id: new ObjectId(recordingId) } as any);
    if (byId) return byId;
  }
  // externalId fallback
  return col.findOne({ externalId: recordingId } as any);
}

async function hasMeetingReadAccess(meeting: MeetingDocument | null, userId: string): Promise<boolean> {
  if (!meeting) return false;
  const isOwner = meeting.ownerId && meeting.ownerId.toString() === userId;
  const isMember = (meeting.members || []).some((m) => m.toString() === userId);
  return !!isOwner || !!isMember;
}

async function hasMeetingWriteAccess(meeting: MeetingDocument | null, userId: string): Promise<boolean> {
  if (!meeting) return false;
  return !!meeting.ownerId && meeting.ownerId.toString() === userId;
}

export function requireRecordingReadAccess() {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(unauthorized('Unauthorized', 'auth.unauthorized'));
        return;
      }
      const { recordingId } = req.params as any;
      const rec = await findRecordingByIdentifier(recordingId);
      if (!rec) {
        next(notFound('Recording not found', 'recording.not_found'));
        return;
      }
      if (!rec.meetingId) {
        next(forbidden('Not allowed', 'recording.forbidden'));
        return;
      }
      const meeting = await getCollection<MeetingDocument>(COLLECTIONS.MEETINGS).findOne({ _id: rec.meetingId });
      if (!(await hasMeetingReadAccess(meeting, req.user.userId))) {
        next(forbidden('Not allowed', 'recording.forbidden'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRecordingWriteAccess() {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(unauthorized('Unauthorized', 'auth.unauthorized'));
        return;
      }
      const { recordingId } = req.params as any;
      const rec = await findRecordingByIdentifier(recordingId);
      if (!rec) {
        next(notFound('Recording not found', 'recording.not_found'));
        return;
      }
      if (!rec.meetingId) {
        next(forbidden('Not allowed', 'recording.forbidden'));
        return;
      }
      const meeting = await getCollection<MeetingDocument>(COLLECTIONS.MEETINGS).findOne({ _id: rec.meetingId });
      if (!(await hasMeetingWriteAccess(meeting, req.user.userId))) {
        next(forbidden('Not allowed', 'recording.forbidden'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

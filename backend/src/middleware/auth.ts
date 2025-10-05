import type { NextFunction, Response } from 'express';
import { unauthorized, forbidden, notFound } from '../utils/errors';
import { verifyJwt } from '../utils/jwt';
import type { RequestWithUser } from '../types/auth';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database';
import { COLLECTIONS, MeetingDocument } from '../types/documents';
import type { RecordingDocument } from '../types/documents';
import { debug, debugWarn } from '../utils/logger';

export function authenticate(req: RequestWithUser, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header || typeof header !== 'string') {
    debugWarn('Auth failed: missing Authorization header');
    next(unauthorized('Missing Authorization header', 'auth.missing_token'));
    return;
  }
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    debugWarn('Auth failed: invalid Authorization header');
    next(unauthorized('Invalid Authorization header', 'auth.invalid_header'));
    return;
  }
  try {
    const payload = verifyJwt(token);
    req.user = payload;
    debug('Auth success', { userId: payload.userId, role: payload.role });
    next();
  } catch (err) {
    debugWarn('Auth failed: invalid or expired token');
    next(unauthorized('Invalid or expired token', 'auth.invalid_token'));
  }
}

export function requireOwner() {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const meetingId = req.params.id || req.params.meetingId;
    if (!req.user || !meetingId) {
      debugWarn('requireOwner: unauthorized or missing meetingId');
      next(unauthorized('Unauthorized', 'auth.unauthorized'));
      return;
    }
    if (req.user.role === 'admin') {
      debug('requireOwner: admin bypass', { userId: req.user.userId });
      next();
      return;
    }
    const collection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
    const meeting = await collection.findOne({ _id: new ObjectId(meetingId) });
    if (!meeting || !meeting.ownerId) {
      debugWarn('requireOwner: meeting not found or has no owner', { meetingId });
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    if (meeting.ownerId.toString() !== req.user.userId) {
      debugWarn('requireOwner: user is not owner', { meetingId, userId: req.user.userId });
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    debug('requireOwner: access granted', { meetingId, userId: req.user.userId });
    next();
  };
}

export function requireMemberOrOwner() {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const meetingId = req.params.id || req.params.meetingId;
    if (!req.user || !meetingId) {
      debugWarn('requireMemberOrOwner: unauthorized or missing meetingId');
      next(unauthorized('Unauthorized', 'auth.unauthorized'));
      return;
    }
    if (req.user.role === 'admin') {
      debug('requireMemberOrOwner: admin bypass', { userId: req.user.userId });
      next();
      return;
    }
    const collection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
    const meeting = await collection.findOne({ _id: new ObjectId(meetingId) });
    if (!meeting) {
      debugWarn('requireMemberOrOwner: meeting not found', { meetingId });
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    const isOwner = meeting.ownerId && meeting.ownerId.toString() === req.user.userId;
    const isMember = (meeting.members || []).some((m) => m.toString() === req.user?.userId);
    if (!isOwner && !isMember) {
      debugWarn('requireMemberOrOwner: access denied', { meetingId, userId: req.user.userId });
      next(forbidden('Not allowed', 'auth.forbidden'));
      return;
    }
    debug('requireMemberOrOwner: access granted', { meetingId, userId: req.user.userId, isOwner, isMember });
    next();
  };
}

export function requireAdmin(req: RequestWithUser, res: Response, next: NextFunction): void {
  if (!req.user) {
    debugWarn('requireAdmin: missing user');
    next(unauthorized('Unauthorized', 'auth.unauthorized'));
    return;
  }
  if (req.user.role !== 'admin') {
    debugWarn('requireAdmin: user not admin', { userId: req.user.userId, role: req.user.role });
    next(forbidden('Admin only', 'auth.admin_only'));
    return;
  }
  debug('requireAdmin: access granted', { userId: req.user.userId });
  next();
}

async function findRecordingByIdentifier(recordingId: string): Promise<RecordingDocument | null> {
  const col = getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
  if (ObjectId.isValid(recordingId)) {
    const byId = await col.findOne({ _id: new ObjectId(recordingId) });
    if (byId) return byId;
  }
  return null;
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
      if (req.user.role === 'admin') {
        next();
        return;
      }
      const { recordingId } = req.params;
      const rec = await findRecordingByIdentifier(recordingId);
      if (!rec) {
        next(notFound('Recording not found', 'recording.not_found'));
        return;
      }
      // Recording owner can always read
      if (rec.ownerId && rec.ownerId.toString() === req.user.userId) {
        next();
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
      if (req.user.role === 'admin') {
        next();
        return;
      }
      const { recordingId } = req.params;
      const rec = await findRecordingByIdentifier(recordingId);
      if (!rec) {
        next(notFound('Recording not found', 'recording.not_found'));
        return;
      }
      // Recording owner can always write
      if (rec.ownerId && rec.ownerId.toString() === req.user.userId) {
        next();
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

import { Hotword } from '../types';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database';
import { COLLECTIONS, HotwordDocument } from '../types/documents';
import { hotwordDocumentToHotword } from '../utils/mongoMappers';
import { conflict, forbidden, internal, notFound } from '../utils/errors';
import type { JwtPayload } from '../types/auth';

export class HotwordService {
  async getHotwordsForUser(user: JwtPayload): Promise<Hotword[]> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    // Public active hotwords + all of user's own hotwords (active/inactive)
    const cursor = collection.find({
      $or: [
        { isPublic: true, isActive: true },
        { ownerId: new ObjectId(user.userId) },
      ],
    });
    const hotwords = await cursor.toArray();
    return hotwords.map(hotwordDocumentToHotword);
  }

  async createHotword(word: string, user: JwtPayload, isPublic?: boolean): Promise<Hotword> {
    const trimmedWord = word.trim();
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    
    // Check if hotword already exists
    const existing = await collection.findOne({ 
      word: { $regex: new RegExp(`^${trimmedWord}$`, 'i') },
      isActive: true
    });
    
    if (existing) {
      throw conflict('Hotword already exists', 'hotword.exists');
    }

    const makePublic = user.role === 'admin' ? !!isPublic : false;
    const hotwordDoc: Omit<HotwordDocument, '_id'> = {
      word: trimmedWord,
      createdAt: new Date(),
      isActive: true,
      isPublic: makePublic,
      ownerId: makePublic ? undefined : new ObjectId(user.userId),
    };

    const result = await collection.insertOne(hotwordDoc as any);
    const insertedHotword = await collection.findOne({ _id: result.insertedId });
    
    if (!insertedHotword) {
      throw internal('Failed to create hotword', 'hotword.create_failed');
    }
    
    return hotwordDocumentToHotword(insertedHotword);
  }

  async updateHotword(id: string, update: {word?: string, isActive?: boolean, isPublic?: boolean}, user: JwtPayload): Promise<Hotword> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    
    // Check if hotword exists
    const hotword = await collection.findOne({ _id: new ObjectId(id) });
    if (!hotword) {
      throw notFound('Hotword not found', 'hotword.not_found');
    }

    // Permission checks
    if (hotword.isPublic) {
      if (user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
    } else if (hotword.ownerId) {
      const isOwner = hotword.ownerId.toString() === user.userId;
      if (!isOwner && user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
    } else {
      // If no ownerId and not public, treat as admin-only legacy
      if (user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
    }

    // Check if new word already exists (excluding current hotword)
    if (update.word && update.word.trim().length > 0) {
      const existing = await collection.findOne({ 
        _id: { $ne: new ObjectId(id) },
        word: { $regex: new RegExp(`^${update.word}$`, 'i') },
      });

      if (existing && existing._id.toString() !== id) {
        throw conflict('Hotword already exists', 'hotword.exists');
      }
    }

    const setUpdate: Record<string, unknown> = {};
    if (typeof update.word === 'string' && update.word.trim().length > 0) setUpdate.word = update.word.trim();
    if (typeof update.isActive === 'boolean') setUpdate.isActive = update.isActive;
    if (typeof update.isPublic === 'boolean') {
      if (user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
      setUpdate.isPublic = update.isPublic;
      // If switching to private, assign ownerId to admin if none
      if (update.isPublic === false && !hotword.ownerId) {
        setUpdate.ownerId = new ObjectId(user.userId);
      }
      // If switching to public, clear ownerId
      if (update.isPublic === true) {
        setUpdate.ownerId = undefined;
      }
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: setUpdate },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw internal('Failed to update hotword', 'hotword.update_failed');
    }

    return hotwordDocumentToHotword(result);
  }

  async deleteHotword(id: string, user: JwtPayload): Promise<void> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      throw notFound('Hotword not found', 'hotword.not_found');
    }

    // Permission checks
    if (existing.isPublic) {
      if (user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
    } else if (existing.ownerId) {
      const isOwner = existing.ownerId.toString() === user.userId;
      if (!isOwner && user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
    } else {
      if (user.role !== 'admin') throw forbidden('Not allowed', 'hotword.forbidden');
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false } }
    );

    if (!result) {
      throw notFound('Hotword not found', 'hotword.not_found');
    }
  }

  async getHotwordsByIdsForUser(ids: string[], user: JwtPayload): Promise<Hotword[]> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    const objectIds = ids.map(id => new ObjectId(id));
    const hotwords = await collection.find({
      _id: { $in: objectIds },
      isActive: true,
      $or: [
        { isPublic: true },
        { ownerId: new ObjectId(user.userId) },
      ],
    }).toArray();
    return hotwords.map(hotwordDocumentToHotword);
  }

  // Get all hotwords including inactive ones (for admin purposes)
  async getAllHotwordsWithInactive(): Promise<Hotword[]> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    const hotwords = await collection.find({}).toArray();
    return hotwords.map(hotwordDocumentToHotword);
  }

  // Restore a deleted hotword
  async restoreHotword(id: string): Promise<Hotword> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: true } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw notFound('Hotword not found', 'hotword.not_found');
    }

    return hotwordDocumentToHotword(result);
  }

  // Bulk create hotwords, skipping invalid or existing ones
  async createHotwordsBulk(
    words: string[],
    user: JwtPayload,
    isPublic?: boolean
  ): Promise<{ created: Hotword[]; skipped: { word: string; reason: string }[] }> {
    const created: Hotword[] = [];
    const skipped: { word: string; reason: string }[] = [];

    const seen = new Set<string>();

    const isAdmin = user.role === 'admin';
    const makePublic = isAdmin ? !!isPublic : false;

    const validate = (w: string): string | null => {
      const trimmed = w.trim();
      if (!trimmed) return 'empty';
      if (trimmed.length < 1) return 'too_short';
      if (trimmed.length > 50) return 'too_long';
      const re = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/;
      if (!re.test(trimmed)) return 'invalid_chars';
      return null;
    };

    for (const raw of words) {
      if (typeof raw !== 'string') {
        skipped.push({ word: String(raw), reason: 'not_string' });
        continue;
      }

      const word = raw.trim().replace(/\s+/g, ' ');
      const key = word.toLowerCase();
      if (seen.has(key)) {
        skipped.push({ word, reason: 'duplicate' });
        continue;
      }
      seen.add(key);

      const validationError = validate(word);
      if (validationError) {
        skipped.push({ word, reason: validationError });
        continue;
      }

      try {
        // Reuse single-create logic (includes existence check and permissions)
        const hotword = await this.createHotword(word, user, makePublic);
        created.push(hotword);
      } catch (err) {
        // Map known conflicts to a stable reason; others as generic failure
        const reason = err && typeof err === 'object' && 'code' in (err as any)
          ? ((err as any).code === 'hotword.exists' ? 'exists' : 'failed')
          : 'failed';
        skipped.push({ word, reason });
      }
    }

    return { created, skipped };
  }
}

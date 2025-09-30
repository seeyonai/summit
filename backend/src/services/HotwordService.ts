import { Hotword } from '../types';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database';
import { COLLECTIONS, HotwordDocument } from '../types/documents';
import { hotwordDocumentToHotword } from '../utils/mongoMappers';
import { conflict, internal, notFound } from '../utils/errors';

export class HotwordService {
  async getAllHotwords(): Promise<Hotword[]> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    const hotwords = await collection.find({ isActive: true }).toArray();
    return hotwords.map(hotwordDocumentToHotword);
  }

  async createHotword(word: string): Promise<Hotword> {
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

    const hotwordDoc: Omit<HotwordDocument, '_id'> = {
      word: trimmedWord,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const result = await collection.insertOne(hotwordDoc as any);
    const insertedHotword = await collection.findOne({ _id: result.insertedId });
    
    if (!insertedHotword) {
      throw internal('Failed to create hotword', 'hotword.create_failed');
    }
    
    return hotwordDocumentToHotword(insertedHotword);
  }

  async updateHotword(id: string, update: {word?: string, isActive?: boolean}): Promise<Hotword> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    
    // Check if hotword exists
    const hotword = await collection.findOne({ _id: new ObjectId(id) });
    if (!hotword) {
      throw notFound('Hotword not found', 'hotword.not_found');
    }

    // Check if new word already exists (excluding current hotword)
    const existing = await collection.findOne({ 
      _id: { $ne: new ObjectId(id) },
      word: { $regex: new RegExp(`^${update.word}$`, 'i') },
    });

    if (existing && existing._id.toString() !== id) {
      throw conflict('Hotword already exists', 'hotword.exists');
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw internal('Failed to update hotword', 'hotword.update_failed');
    }

    return hotwordDocumentToHotword(result);
  }

  async deleteHotword(id: string): Promise<void> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false } }
    );

    if (!result) {
      throw notFound('Hotword not found', 'hotword.not_found');
    }
  }

  async getHotwordsByIds(ids: string[]): Promise<Hotword[]> {
    const collection = getCollection<HotwordDocument>(COLLECTIONS.HOTWORDS);
    const objectIds = ids.map(id => new ObjectId(id));
    const hotwords = await collection.find({
      _id: { $in: objectIds },
      isActive: true
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
}

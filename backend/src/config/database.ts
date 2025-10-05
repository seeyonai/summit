import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';
import { debug, debugWarn } from '../utils/logger';

// Load environment variables from .env file
dotenv.config({ quiet: true });

let db: Db;
let client: MongoClient;

// MongoDB connection URI - defaults to local MongoDB instance
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
// Database name - defaults to 'summit'
const DB_NAME = process.env.DB_NAME || 'summit';

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    const redactUri = (uri: string): string => {
      try {
        const u = new URL(uri);
        if (u.username || u.password) {
          u.password = '****';
        }
        return u.toString();
      } catch {
        return uri.replace(/:\\S+@/, ':****@');
      }
    };

    debug('Connecting to MongoDB', { uri: redactUri(MONGODB_URI), dbName: DB_NAME });
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.info('✅ Connected to MongoDB');
    debug('MongoDB connected', { dbName: DB_NAME });
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    debugWarn('MongoDB connection error (debug):', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.info('🔌 Disconnected from MongoDB');
    debug('MongoDB client closed');
  }
}

export function getCollection<T extends Document>(collectionName: string): Collection<T> {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db.collection<T>(collectionName);
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

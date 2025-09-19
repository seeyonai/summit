import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

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
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
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
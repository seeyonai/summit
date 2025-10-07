import { ObjectId, OptionalUnlessRequiredId } from 'mongodb';
import crypto from 'crypto';
import { getCollection } from '../config/database';
import { COLLECTIONS, UserDocument } from '../types/documents';
import { badRequest, conflict, internal, notFound, unauthorized } from '../utils/errors';

const ITERATIONS = 120000;
const KEYLEN = 32;
const DIGEST = 'sha256';

function usersCollection() {
  return getCollection<UserDocument>(COLLECTIONS.USERS);
}

async function countUsers(): Promise<number> {
  const col = usersCollection();
  return col.countDocuments({});
}

function hashPassword(password: string, salt: string): string {
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return derived.toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function createUser(email: string, password: string, name?: string, aliases?: string) {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm || !password) {
    throw badRequest('Email and password are required', 'user.invalid_payload');
  }
  const col = usersCollection();
  const existing = await col.findOne({ email: emailNorm });
  if (existing) {
    throw conflict('Email already registered', 'user.email_taken');
  }
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const role: 'admin' | 'user' = (await countUsers()) === 0 ? 'admin' : 'user';
  const now = new Date();
  const doc: OptionalUnlessRequiredId<UserDocument> = {
    _id: new ObjectId(),
    email: emailNorm,
    name,
    ...(typeof aliases === 'string' ? { aliases: aliases.trim() } : {}),
    role,
    passwordHash,
    salt,
    authType: 'local',
    createdAt: now,
    updatedAt: now,
  };
  const result = await col.insertOne(doc);
  const inserted = await col.findOne({ _id: result.insertedId });
  if (!inserted) {
    throw internal('Failed to create user', 'user.create_failed');
  }
  return inserted;
}

export async function createExternalUser(email: string, name: string, externalUserId: string, authType: 'unsafe_auth' = 'unsafe_auth') {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm || !name || !externalUserId) {
    throw badRequest('Email, name, and external user ID are required', 'user.invalid_payload');
  }
  const col = usersCollection();
  const existing = await col.findOne({ email: emailNorm });
  if (existing) {
    throw conflict('Email already registered', 'user.email_taken');
  }
  const role: 'admin' | 'user' = (await countUsers()) === 0 ? 'admin' : 'user';
  const now = new Date();
  const doc: OptionalUnlessRequiredId<UserDocument> = {
    _id: new ObjectId(),
    email: emailNorm,
    name,
    role,
    externalUserId,
    authType,
    passwordHash: '',
    salt: '',
    createdAt: now,
    updatedAt: now,
  };
  const result = await col.insertOne(doc);
  const inserted = await col.findOne({ _id: result.insertedId });
  if (!inserted) {
    throw internal('Failed to create user', 'user.create_failed');
  }
  return inserted;
}

export async function findByEmail(email: string): Promise<UserDocument | null> {
  const col = usersCollection();
  return col.findOne({ email: email.trim().toLowerCase() });
}

export async function findByExternalUserId(externalUserId: string): Promise<UserDocument | null> {
  const col = usersCollection();
  return col.findOne({ externalUserId });
}

export async function getById(id: string): Promise<UserDocument | null> {
  const col = usersCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export function verifyPassword(user: UserDocument, password: string): boolean {
  const hash = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

export async function searchUsers(q: string, limit: number = 20): Promise<Array<Pick<UserDocument, '_id' | 'email' | 'name' | 'aliases' | 'role'>>> {
  const col = usersCollection();
  const query: Record<string, unknown> = {};
  if (q && q.trim().length > 0) {
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { email: { $regex: regex } },
      { name: { $regex: regex } },
    ];
  }
  const docs = await col.find(query).limit(limit).toArray();
  return docs.map((u) => ({ _id: u._id, email: u.email, name: u.name, aliases: u.aliases, role: u.role }));
}

export async function findByIds(ids: string[]): Promise<Array<Pick<UserDocument, '_id' | 'email' | 'name' | 'aliases' | 'role'>>> {
  const objectIds = ids
    .map((id) => {
      try { return new ObjectId(id); } catch { return null; }
    })
    .filter((v): v is ObjectId => !!v);
  if (objectIds.length === 0) return [];
  const col = usersCollection();
  const docs = await col.find({ _id: { $in: objectIds } }).toArray();
  return docs.map((u) => ({ _id: u._id, email: u.email, name: u.name, aliases: u.aliases, role: u.role }));
}

export async function updateRole(userId: string, role: 'admin' | 'user'): Promise<Pick<UserDocument, '_id' | 'email' | 'name' | 'aliases' | 'role'>> {
  const col = usersCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!result) {
    throw notFound('User not found', 'user.not_found');
  }
  return { _id: result._id, email: result.email, name: result.name, aliases: result.aliases, role: result.role };
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; aliases?: string }
): Promise<Pick<UserDocument, '_id' | 'email' | 'name' | 'aliases' | 'role'>> {
  const col = usersCollection();
  const setDoc: Partial<UserDocument> = { updatedAt: new Date() };
  if (typeof updates.name === 'string') {
    // allow empty string to clear name
    setDoc.name = updates.name.trim();
  }
  if (typeof updates.aliases === 'string') {
    setDoc.aliases = updates.aliases.trim();
  }
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: setDoc },
    { returnDocument: 'after' }
  );
  if (!result) {
    throw notFound('User not found', 'user.not_found');
  }
  return { _id: result._id, email: result.email, name: result.name, aliases: result.aliases, role: result.role };
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  if (!currentPassword || !newPassword) {
    throw badRequest('Current and new passwords are required', 'auth.invalid_payload');
  }
  const col = usersCollection();
  const user = await col.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    throw notFound('User not found', 'user.not_found');
  }
  if (!verifyPassword(user, currentPassword)) {
    throw unauthorized('Current password is incorrect', 'auth.invalid_password');
  }
  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);
  await col.updateOne(
    { _id: user._id },
    { $set: { salt, passwordHash, updatedAt: new Date() } }
  );
}

export const userService = {
  createUser,
  createExternalUser,
  findByEmail,
  findByExternalUserId,
  getById,
  verifyPassword,
  searchUsers,
  findByIds,
  updateRole,
  updateProfile,
  updatePassword,
  countUsers,
};

export default userService;

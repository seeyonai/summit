import crypto from 'crypto';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const DEFAULT_EXPIRES_IN_SECONDS = parseExpiry(process.env.JWT_EXPIRES_IN || '7d');

function base64url(input: Buffer | string): string {
  const buff = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buff
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseExpiry(value: string): number {
  // Supports s, m, h, d suffix; defaults to seconds if numeric
  const match = String(value).trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return 7 * 24 * 60 * 60; // 7d fallback
  const amount = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 'm': return amount * 60;
    case 'h': return amount * 60 * 60;
    case 'd': return amount * 24 * 60 * 60;
    default: return amount; // seconds
  }
}

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn?: string | number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (typeof expiresIn === 'number' ? expiresIn : parseExpiry(String(expiresIn || DEFAULT_EXPIRES_IN_SECONDS)));

  const body: JwtPayload = { ...payload, iat, exp };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
  const encodedSignature = base64url(signature);
  return `${data}.${encodedSignature}`;
}

export function verifyJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = base64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
  if (signature !== expected) {
    throw new Error('Invalid signature');
  }
  const payloadJson = Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const payload = JSON.parse(payloadJson) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) {
    throw new Error('Token expired');
  }
  return payload;
}


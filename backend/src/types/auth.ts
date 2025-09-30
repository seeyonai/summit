import type { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

export type RequestWithUser = Request & { user?: JwtPayload };

export interface AuthResponseUser {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
}


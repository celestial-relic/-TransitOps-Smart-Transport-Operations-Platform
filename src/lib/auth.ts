import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────

export interface AuthPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

// ── Password ───────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Token ──────────────────────────────────────────────────────────────

export async function createToken(payload: {
  userId: string;
  email: string;
  role: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as AuthPayload;
}

// ── Request Auth ───────────────────────────────────────────────────────

function extractToken(request: NextRequest): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // 2. Cookie fallback
  const cookie = request.cookies.get('token');
  return cookie?.value ?? null;
}

export async function getAuthUser(request: NextRequest): Promise<AuthPayload | null> {
  const token = extractToken(request);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthPayload> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireRole(
  request: NextRequest,
  roles: string[],
): Promise<AuthPayload> {
  const user = await requireAuth(request);
  if (!roles.includes(user.role)) {
    throw new Error(`Insufficient permissions. Required roles: ${roles.join(', ')}`);
  }
  return user;
}

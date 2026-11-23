import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDatabase } from '../db/connection';
export const SESSION_COOKIE = 'salary_session';
const SESSION_SECONDS = 8 * 60 * 60;
export type User = { id: string; name: string; email: string; role: 'admin' | 'hr'; mustChangePassword: number; active: number; sessionVersion: number };
export function hashPassword(password: string) {
  const salt = randomBytes(32).toString('hex');
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
}
export function matchesPassword(password: string, salt: string, hash: string) {
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return value;
}
export async function verifyCredentials(email: string, password: string) {
  const [user] = await getDatabase().query<User & { salt: string; hash: string }>(`SELECT id, name, email, role, must_change_password AS mustChangePassword, active, session_version AS sessionVersion, password_salt AS salt, password_hash AS hash FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
  // Perform password work even when the account does not exist.
  const valid = matchesPassword(password, user?.salt ?? 'missing-user', user?.hash ?? '00'.repeat(32));
  return user && user.active && valid ? user : null;
}
export function createSession(user: User, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id: String(user.id), version: user.sessionVersion, expires: now + SESSION_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('hex')}`;
}
export async function verifySession(token: string | undefined, now = Date.now()): Promise<User | null> {
  if (!token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = createHmac('sha256', secret()).update(payload).digest();
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof value.id !== 'string' || typeof value.expires !== 'number' || value.expires <= now) return null;
    const [user] = await getDatabase().query<User>(`SELECT id, name, email, role, must_change_password AS mustChangePassword, active, session_version AS sessionVersion FROM users WHERE id = ?`, [value.id]);
    return user?.active && user.sessionVersion === value.version ? user : null;
  } catch { return null; }
}
export function cookieOptions() {
  return { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_SECONDS };
}
export function requestUser(request: Request) {
  const token = (request.headers.get('cookie') ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return verifySession(token);
}
export async function requireAuth(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (user.mustChangePassword) return NextResponse.json({ error: 'Change your initial password first' }, { status: 403 });
  return null;
}

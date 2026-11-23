import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestUser, verifyCredentials, hashPassword } from '@/server/auth/session';
import { getDatabase } from '@/server/db/connection';
import { apiError } from '@/lib/http';
export async function POST(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const value = z.object({ currentPassword: z.string().min(1).max(200), password: z.string().min(12).max(200) }).parse(await request.json());
    if (value.currentPassword === value.password) return NextResponse.json({ error: 'Choose a different password' }, { status: 400 });
    if (!await verifyCredentials(user.email, value.currentPassword)) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    const password = hashPassword(value.password);
    await getDatabase().execute('UPDATE users SET password_salt = ?, password_hash = ?, must_change_password = FALSE, session_version = session_version + 1 WHERE id = ?', [password.salt, password.hash, user.id]);
    return NextResponse.json({ saved: true });
  } catch (error) { return apiError(error); }
}

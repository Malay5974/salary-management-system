import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requestUser, hashPassword } from '@/server/auth/session';
import { getDatabase } from '@/server/db/connection';
import { apiError } from '@/lib/http';
async function allowed(request: Request) {
  const user = await requestUser(request);
  return user?.role === 'admin' && !user.mustChangePassword;
}
export async function GET(request: Request) {
  if (!await allowed(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  return NextResponse.json(await getDatabase().query('SELECT id, name, email, active, must_change_password AS mustChangePassword FROM users WHERE role = ? ORDER BY id DESC', ['hr']));
}
export async function POST(request: Request) {
  if (!await allowed(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const value = z.object({ name: z.string().trim().min(1).max(80), email: z.email().max(254) }).strict().parse(await request.json());
    const temporaryPassword = randomBytes(15).toString('base64url');
    const password = hashPassword(temporaryPassword);
    await getDatabase().execute("INSERT INTO users (name,email,role,password_salt,password_hash) VALUES (?,?,'hr',?,?)", [value.name, value.email.toLowerCase(), password.salt, password.hash]);
    return NextResponse.json({ temporaryPassword }, { status: 201 });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  if (!await allowed(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const value = z.object({ id: z.coerce.number().int().positive(), action: z.enum(['enable','disable','reset']) }).strict().parse(await request.json());
    const db = getDatabase();
    let temporaryPassword: string | undefined;
    let result;
    if (value.action === 'reset') {
      temporaryPassword = randomBytes(15).toString('base64url');
      const password = hashPassword(temporaryPassword);
      result = await db.execute("UPDATE users SET password_salt=?,password_hash=?,must_change_password=TRUE,session_version=session_version+1 WHERE id=? AND role='hr'", [password.salt,password.hash,value.id]);
    } else result = await db.execute("UPDATE users SET active=?,session_version=session_version+1 WHERE id=? AND role='hr'", [value.action === 'enable',value.id]);
    if (!result.affectedRows) return NextResponse.json({error:'HR user not found'}, {status:404});
    return NextResponse.json({ saved:true, temporaryPassword });
  } catch(error) { return apiError(error); }
}

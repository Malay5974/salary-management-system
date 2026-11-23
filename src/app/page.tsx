import Dashboard from '@/components/Dashboard';
import Login from '@/components/Login';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/server/auth/session';

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token) ? <Dashboard /> : <Login />;
}

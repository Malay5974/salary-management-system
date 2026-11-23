import Link from 'next/link';
import Account from '@/components/Account';
import Dashboard from '@/components/Dashboard';
import Login from '@/components/Login';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/server/auth/session';

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await verifySession(token);
  if (!user) return <Login />;
  if (user.mustChangePassword) return <Account user={user} />;
  return <><Link href='/account' className="workspace-account-link">Account{user.role === 'admin' ? ' / Manage HR users' : ' / Change password'}</Link><Dashboard /></>;
}

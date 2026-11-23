'use client';

import { useState } from 'react';

export default function Login() {
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setWorking(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.get('email'), password: values.get('password') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Sign in failed');
      window.location.reload();
    } catch (cause) { setError((cause as Error).message); setWorking(false); }
  };
  return <main className="login-page"><section className="login-card"><div className="login-mark">◈</div><div className="eyebrow">ACME / PEOPLE</div><h1>Salary workspace</h1><p>Sign in with the HR demo account to review salary records and insights.</p><form className="form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary wide" disabled={working}>{working ? 'Signing in…' : 'Sign in'}</button></form><small>Assessment data is synthetic.</small></section></main>;
}

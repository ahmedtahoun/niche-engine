'use client';
import { useActionState } from 'react';
import { login } from '../actions';

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form className="login" action={action}>
      <h1>Admin</h1>
      {!configured && <p className="dev">Set ADMIN_PASSWORD on the server to enable sign in.</p>}
      <label style={{ display: 'grid', gap: 4 }}>Password<input id="password" name="password" type="password" autoComplete="current-password" required /></label>
      {state?.error && <p style={{ color: 'var(--a-bad)', margin: 0 }} role="alert">{state.error}</p>}
      <button className="mini pri" style={{ minHeight: 42 }} disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

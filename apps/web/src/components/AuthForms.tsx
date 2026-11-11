'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { registerAction, signInAction, signOutAction, type AuthResult } from '@/app/actions';

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [res, setRes] = useState<AuthResult | null>(null);
  const [pending, start] = useTransition();
  const fail = res && !res.ok ? res : null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = mode === 'in' ? await signInAction(phone, password) : await registerAction(phone, name, password);
      setRes(r);
      if (r.ok) router.refresh();
    });
  };
  const inv = (f: string) => ({ 'aria-invalid': fail?.field === f, 'aria-describedby': fail?.field === f ? 'auth-err' : undefined });
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12 }} noValidate>
      <div className="chips" role="tablist">
        <button type="button" role="tab" className="chip" aria-pressed={mode === 'in'} onClick={() => { setMode('in'); setRes(null); }}>عندي حساب</button>
        <button type="button" role="tab" className="chip" aria-pressed={mode === 'up'} onClick={() => { setMode('up'); setRes(null); }}>حساب جديد</button>
      </div>
      <label className="field">رقم الموبايل<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} placeholder="01xxxxxxxxx" {...inv('phone')} /></label>
      {mode === 'up' && <label className="field">الاسم<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" {...inv('name')} /></label>}
      <label className="field">كلمة السر<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} {...inv('password')} /></label>
      {fail && <span className="ferr" id="auth-err" role="alert">{fail.error}</span>}
      <button className="btn primary block" disabled={pending}>{pending ? '…' : mode === 'in' ? 'دخول' : 'اعمل الحساب'}</button>
      <span className="muted small">نسيت كلمة السر؟ كلم خدمة العملاء على واتساب ونرجعهالك.</span>
    </form>
  );
}

export function SignOut() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button className="btn ghost block" disabled={pending} onClick={() => start(async () => { await signOutAction(); router.refresh(); })}>خروج</button>;
}

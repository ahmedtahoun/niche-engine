'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { registerAction, signInAction, signOutAction, type AuthResult } from '@/app/actions';
import { useSpeak } from './I18n';

export function AuthForms() {
  const router = useRouter();
  const { t } = useSpeak();
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
        <button type="button" role="tab" className="chip" aria-pressed={mode === 'in'} onClick={() => { setMode('in'); setRes(null); }}>{t('haveAccount')}</button>
        <button type="button" role="tab" className="chip" aria-pressed={mode === 'up'} onClick={() => { setMode('up'); setRes(null); }}>{t('newAccount')}</button>
      </div>
      <label className="field">{t('phone')}<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'start' }} placeholder="01xxxxxxxxx" {...inv('phone')} /></label>
      {mode === 'up' && <label className="field">{t('name')}<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" {...inv('name')} /></label>}
      <label className="field">{t('password')}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} {...inv('password')} /></label>
      {fail && <span className="ferr" id="auth-err" role="alert">{fail.error}</span>}
      <button className="btn primary block" disabled={pending}>{pending ? '…' : mode === 'in' ? t('signIn') : t('createAccount')}</button>
      <span className="muted small">{t('forgot')}</span>
    </form>
  );
}

export function SignOut() {
  const router = useRouter();
  const { t } = useSpeak();
  const [pending, start] = useTransition();
  return <button className="btn ghost block" disabled={pending} onClick={() => start(async () => { await signOutAction(); router.refresh(); })}>{t('signOut')}</button>;
}

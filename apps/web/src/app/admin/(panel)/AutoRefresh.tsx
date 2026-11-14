'use client';
// Re-reads the page from the server every few seconds while the tab is visible (admin → Traffic "Right now").
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') { router.refresh(); setAt(new Date()); } };
    const id = setInterval(tick, seconds * 1000);
    const onShow = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onShow); };
  }, [router, seconds]);
  return <span className="sub">updates every {seconds}s · {at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Cairo' })}</span>;
}

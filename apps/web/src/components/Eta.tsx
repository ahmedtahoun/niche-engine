'use client';
// "Arrives Sunday 15 November to [governorate ▾]": every governorate, not just Cairo and Giza.
// The last governorate picked (here or at checkout) is remembered in this browser.
import { useEffect, useState } from 'react';
import { etaDate, GOVERNORATES } from '@/lib/eta';
import { useSpeak } from './I18n';

const KEY = 'ne_gov';

export function EtaPicker() {
  const s = useSpeak();
  const [gov, setGov] = useState(GOVERNORATES[0]);
  useEffect(() => {
    try { const g = localStorage.getItem(KEY); if (g && GOVERNORATES.includes(g)) setGov(g); } catch { /* storage blocked */ }
  }, []);
  return (
    <div>
      <b>{s.t('eta.cairo', { day: s.date(etaDate(gov), true) })}</b>{' '}
      <label className="eta-gov">
        <span className="sr-only">{s.t('eta.to')}</span>
        {s.t('eta.toShort')}{' '}
        <select value={gov} onChange={(e) => { setGov(e.target.value); try { localStorage.setItem(KEY, e.target.value); } catch { /* storage blocked */ } }}>
          {GOVERNORATES.map((g) => <option key={g} value={g}>{s.gov(g)}</option>)}
        </select>
      </label>
    </div>
  );
}

'use client';
// Pick the customer's Bosta area for an order (orders placed before the area picker, or when Bosta
// couldn't be reached at checkout). Saving it creates the waiting shipments.
import { useState, useTransition } from 'react';
import { AreaPicker, type AreaValue } from '@/components/AreaPicker';
import { setOrderArea } from '../../../actions';

export function AreaFix({ id, governorate, area, districtId }: { id: number; governorate: string; area: string; districtId?: string }) {
  const [v, setV] = useState<AreaValue>({ area, districtId });
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const changed = v.districtId && v.districtId !== districtId;
  return (
    <div className="area-fix">
      <AreaPicker className="fld" inputId={`area-${id}`} governorate={governorate} value={v} onChange={(x) => { setV(x); setMsg(''); }} label={<span>Bosta area {districtId ? '✓' : '(not picked yet)'}</span>}
        placeholder="Type the area… e.g. مدينة نصر" noneText="Not in Bosta's list for this governorate." en={false} dir="rtl" />
      {changed && <button className="mini pri" disabled={pending} onClick={() => start(async () => { const r = await setOrderArea(id, v.area, v.districtId!); setMsg(r.ok ? 'Saved.' : r.error ?? 'Could not save.'); })}>{pending ? 'Saving…' : 'Save area'}</button>}
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}

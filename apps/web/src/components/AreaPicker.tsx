'use client';
// Area picker (same idea as shop.wheretospot.com's checkout): the customer types their area and
// picks it from Bosta's own district list for the governorate, so every order carries the exact
// Bosta district and ships without anyone guessing. If the list can't load, it's a plain text box.
import { useEffect, useMemo, useRef, useState } from 'react';
import { exactArea, indexAreas, searchAreas, type AreaResult, type District } from '@/lib/bosta-areas';

const cache = new Map<string, Promise<District[] | null>>();
function loadDistricts(governorate: string): Promise<District[] | null> {
  if (!cache.has(governorate)) {
    cache.set(governorate, fetch(`/api/areas?gov=${encodeURIComponent(governorate)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && Array.isArray(j.districts) && j.districts.length ? (j.districts as District[]) : null))
      .catch(() => null)
      .then((list) => { if (!list) cache.delete(governorate); return list; }));
  }
  return cache.get(governorate)!;
}

export interface AreaValue { area: string; districtId?: string }

export function AreaPicker({ governorate, value, onChange, label, placeholder, noneText, en, invalid, describedBy, dir, className = 'field', inputId = 'area-input' }: {
  governorate: string; value: AreaValue; onChange: (v: AreaValue) => void; label: React.ReactNode; placeholder: string; noneText: string; en: boolean;
  invalid?: boolean; describedBy?: string; dir?: 'rtl' | 'ltr'; /** 'field' on the store, 'fld' in the admin. */ className?: string; inputId?: string;
}) {
  const [list, setList] = useState<District[] | null | undefined>(undefined); // undefined = loading, null = unavailable
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setList(undefined);
    loadDistricts(governorate).then((l) => { if (live) setList(l); });
    return () => { live = false; };
  }, [governorate]);

  const index = useMemo(() => (list ? indexAreas(list) : null), [list]);

  // A saved address (or a name typed before the list loaded) that clearly names one district is picked for the customer.
  // A district from another governorate is dropped.
  useEffect(() => {
    if (!index || !list) return;
    if (value.districtId && list.some((d) => d.id === value.districtId)) return;
    const hit = value.area ? exactArea(index, value.area) : null;
    if (hit) onChange({ area: en ? hit.titleEn : hit.title, districtId: hit.districtId });
    else if (value.districtId) onChange({ area: value.area });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const results: AreaResult[] = useMemo(() => (index && !value.districtId ? searchAreas(index, value.area, 8) : []), [index, value.area, value.districtId]);
  const pick = (r: AreaResult) => { onChange({ area: en ? r.titleEn : r.title, districtId: r.districtId }); setOpen(false); };

  if (list === null) {
    return <label className={className}>{label}<input dir={dir} value={value.area} onChange={(e) => onChange({ area: e.target.value })} aria-invalid={invalid} aria-describedby={describedBy} /></label>;
  }
  const showList = open && !value.districtId && value.area.trim().length >= 2 && index;
  return (
    <div className={`${className} area-pick`} ref={box}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId} role="combobox" aria-expanded={Boolean(showList)} aria-controls={`${inputId}-list`} aria-autocomplete="list" autoComplete="off" dir={dir}
        value={value.area} placeholder={placeholder} aria-invalid={invalid} aria-describedby={describedBy}
        onChange={(e) => { onChange({ area: e.target.value }); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList || !results.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter') { e.preventDefault(); pick(results[active]); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {value.districtId && <span className="area-ok" aria-hidden>✓</span>}
      {showList && (
        <ul id={`${inputId}-list`} role="listbox" className="area-list">
          {results.length ? results.map((r, i) => (
            <li key={`${r.districtId}|${r.title}`} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }} onMouseEnter={() => setActive(i)}>
              <b>{en ? r.titleEn : r.title}</b><small>{en ? r.subEn : r.sub}</small>
            </li>
          )) : <li className="none">{noneText}</li>}
        </ul>
      )}
    </div>
  );
}

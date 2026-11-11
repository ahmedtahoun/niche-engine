import Link from 'next/link';
import { allNiches } from '@/lib/niches';
import type { OrderStatus } from '@/lib/orders';

export const EGP = (n: number) => `EGP ${Math.round(n).toLocaleString('en-US')}`;
export const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
export const ago = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
};

export const STATUS: Record<OrderStatus, [string, string]> = {
  awaiting_confirm: ['Awaiting WhatsApp confirm', 'warn'],
  confirmed: ['Waiting for sellers', 'info'],
  accepted: ['Waybills ready', 'info'],
  picked: ['With courier', 'info'],
  delivered: ['Delivered', 'ok'],
  refused: ['Refused at door', 'bad'],
  cancelled: ['Cancelled', 'mute'],
};

export const Pill = ({ kind, children }: { kind: string; children: React.ReactNode }) => <span className={`pill ${kind}`}>{children}</span>;

/** Reads ?niche=… and returns the selected niche id, or null for all. */
export function pickNiche(sp: { niche?: string }) {
  return sp.niche && allNiches()[sp.niche] ? sp.niche : null;
}

export function NicheTabs({ base, current, extra = '' }: { base: string; current: string | null; extra?: string }) {
  const all = Object.values(allNiches());
  return (
    <nav className="adm-tabs" aria-label="Niche">
      <Link href={`${base}${extra ? `?${extra}` : ''}`} aria-current={!current ? 'true' : undefined}>All niches</Link>
      {all.map((c) => (
        <Link key={c.id} href={`${base}?niche=${c.id}${extra ? `&${extra}` : ''}`} aria-current={current === c.id ? 'true' : undefined}>{c.brand.nameEn}</Link>
      ))}
    </nav>
  );
}

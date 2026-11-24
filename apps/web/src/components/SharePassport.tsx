'use client';
// Share the passport: the phone's share sheet (Instagram, WhatsApp…) when available, WhatsApp otherwise.
// In compact mode (order page) it is just a link to the full passport.
import Link from 'next/link';

export function SharePassport({ url, text, label, compact }: { url: string; text: string; label: string; compact?: boolean }) {
  if (compact) return <Link className="btn ghost block" href={url}>{label}</Link>;
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { return; /* closed the share sheet */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  };
  return <button type="button" className="btn primary block" onClick={share}>📤 {label}</button>;
}

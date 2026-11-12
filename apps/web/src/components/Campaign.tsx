'use client';
// Remembers the campaign link a visitor arrived from (utm_source=instagram&utm_campaign=box…, or an
// ad click id) for 30 days, so the order shows where it came from. The latest link wins.
import { useEffect } from 'react';

const KEY = 'ne_utm';
const DAYS = 30;

export function CampaignTracker() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const get = (k: string) => q.get(`utm_${k}`) ?? undefined;
      const source = get('source') ?? (q.get('fbclid') ? 'facebook' : q.get('gclid') ? 'google' : q.get('ttclid') ? 'tiktok' : undefined);
      if (!source) return;
      localStorage.setItem(KEY, JSON.stringify({ source, medium: get('medium') ?? (q.get('fbclid') || q.get('gclid') || q.get('ttclid') ? 'paid' : undefined), campaign: get('campaign'), content: get('content'), at: Date.now() }));
    } catch { /* storage blocked */ }
  }, []);
  return null;
}

/** The saved campaign, if it is less than 30 days old. */
export function savedCampaign(): Record<string, string> | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as ({ at: number } & Record<string, string>) | null;
    if (!v || Date.now() - v.at > DAYS * 864e5) return undefined;
    const { at: _at, ...rest } = v;
    return rest;
  } catch {
    return undefined;
  }
}

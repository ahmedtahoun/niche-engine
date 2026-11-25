// Loads and validates every niche settings file once per server process.
// The files (niches/*.json) are bundled into the app by scripts/gen-niches.mjs, because
// Cloudflare Workers have no file system to read them from at runtime.
import { validateNiche, type NicheConfig } from '@niche-engine/core';
import { nicheFiles } from './niche-files.generated.ts';

let cache: Record<string, NicheConfig> | null = null;

export function allNiches(): Record<string, NicheConfig> {
  if (cache) return cache;
  const out: Record<string, NicheConfig> = {};
  for (const [f, raw] of Object.entries(nicheFiles)) {
    const cfg = structuredClone(raw) as NicheConfig;
    const problems = validateNiche(cfg);
    if (problems.length) throw new Error(`niches/${f} is invalid:\n- ${problems.join('\n- ')}`);
    out[cfg.id] = cfg;
  }
  cache = out;
  return out;
}

export function getNiche(id: string): NicheConfig | null {
  return allNiches()[id] ?? null;
}

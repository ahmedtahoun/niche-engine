// Loads and validates every niche settings file once per server process.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { validateNiche, type NicheConfig } from '@niche-engine/core';


// NICHES_DIR is set in the Docker image; locally the folder is found from the repo or apps/web.
const DIR = [process.env.NICHES_DIR, path.join(process.cwd(), 'niches'), path.join(process.cwd(), '..', '..', 'niches')].find((d): d is string => Boolean(d) && existsSync(d!)) ?? path.join(process.cwd(), 'niches');
let cache: Record<string, NicheConfig> | null = null;

export function allNiches(): Record<string, NicheConfig> {
  if (cache) return cache;
  const out: Record<string, NicheConfig> = {};
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    const cfg = JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) as NicheConfig;
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

// Validates every niche config in /niches. Run: npm run check:niches
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateNiche, type NicheConfig } from '../src/config.ts';

const dir = join(import.meta.dirname, '..', '..', '..', 'niches');
let failed = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const cfg = JSON.parse(readFileSync(join(dir, f), 'utf8')) as NicheConfig;
  const problems = validateNiche(cfg);
  if (problems.length) {
    failed++;
    console.log(`✗ ${f}\n  - ${problems.join('\n  - ')}`);
  } else console.log(`✓ ${f} (${cfg.brand.nameEn}, ${cfg.status})`);
}
process.exit(failed ? 1 : 0);

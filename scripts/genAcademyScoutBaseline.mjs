/**
 * Round 585: the scout baseline the packs round is held to, captured BEFORE
 * makeProspect learned to take a potential band and a random source
 * (docs/design/round-580-tycoon-merge.md, section 6 and Round 585 section 8).
 *
 * Packs draw generated kids through the same generator the scouts use. Passing
 * the band and the random source in must not move a single scout find, so this
 * records 500 finds exactly as the academy made them before the change: twenty
 * seeds, every region, the academy ticking at its own quarter second, each kid
 * written the moment the scouts bring him in, whole and as JSON.
 * scripts/simTycoonPacks.mjs requires today's academy to produce the same 500,
 * byte for byte.
 *
 * Its name does not start with sim, so runAllSims skips it. It refuses to
 * overwrite an existing baseline unless given --force, because rerunning it after
 * the packs round lands would record the new generator as its own baseline.
 *   node scripts/genAcademyScoutBaseline.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/data/academyScoutBaseline.json');
if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(ROOT, OUT)} already exists. It is a pre-packs record; rerunning it now would not be one.`);
  process.exit(1);
}

export function scoutFinds(W, count = 500) {
  const finds = [];
  for (let seed = 1; finds.length < count; seed += 1) {
    const s = W.newFactory(0, seed * 7919);
    s.rep = (seed - 1) % W.REGIONS.length;
    s.levels = { ...s.levels, scouting: seed % 4, dorms: 2 };
    for (let step = 0; step < 400000 && finds.length < count; step += 1) {
      const before = s.prospects.map(p => p.id);
      W.tick(s, 0.25);
      for (const p of s.prospects) if (!before.includes(p.id)) finds.push(JSON.stringify(p));
      /* free the bed again so the scouts keep working, in the order they arrived */
      while (s.prospects.length >= W.capacity(s)) s.prospects.shift();
      if (finds.length >= seed * 25) break;
    }
  }
  return finds.slice(0, count);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-baseline-'));
  const bundle = path.join(tmp, 'academy.mjs');
  execSync(`npx --no-install esbuild "${path.join(ROOT, 'src/lib/wonderkidFactory.ts')}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${bundle}" --log-level=error`, { cwd: ROOT, shell: true });
  const W = await import('file:///' + bundle.split(path.sep).join('/'));
  fs.rmSync(tmp, { recursive: true, force: true });
  const finds = scoutFinds(W);
  const regions = new Set(finds.map(f => JSON.parse(f).potential >= 90 ? 'high' : 'low'));
  fs.writeFileSync(OUT, JSON.stringify({
    captured: 'Round 585, before makeProspect took a band and a random source',
    finds,
  }, null, 1) + '\n');
  console.log(`wrote ${finds.length} scout finds to ${path.relative(ROOT, OUT)} (potential spread: ${[...regions].join(', ')})`);
}

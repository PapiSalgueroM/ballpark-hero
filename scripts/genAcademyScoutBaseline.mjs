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

/* A generated name that turns out to be a real man gets renamed in
   src/lib/intlNames.ts (Round 899: Lamine Gassama became Lamine Gassama-Ndoye).
   That moves the name on the finds he was drawn into and nothing else, so the
   baseline takes the same rename here instead of being re-recorded:
     node scripts/genAcademyScoutBaseline.mjs --rename "<old name>=<new name>" --why "<round and reason>"
   Only the name field of finds carrying exactly the old name changes, every
   other find stays byte for byte, and the rename is listed in the file. It
   refuses when no find carries the old name, so it can never pass by changing
   nothing. S8 then still holds every other byte of the 500 finds. */
function renameInBaseline(spec, why) {
  const eq = spec.indexOf('=');
  const from = spec.slice(0, eq), to = spec.slice(eq + 1);
  if (eq < 1 || !to || from === to || !why) {
    console.error('usage: --rename "<old name>=<new name>" --why "<round and reason>"');
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  let changed = 0;
  const finds = base.finds.map(f => {
    const p = JSON.parse(f);
    if (p.name !== from) return f;
    if (JSON.stringify(p) !== f) { console.error(`a find does not round trip as JSON, refusing: ${f.slice(0, 80)}`); process.exit(1); }
    changed += 1;
    return JSON.stringify({ ...p, name: to });
  });
  if (changed === 0) { console.error(`no find in the baseline is named ${from}; nothing to rename`); process.exit(1); }
  const renamed = [...(base.renamed ?? []), { from, to, finds: changed, why }];
  fs.writeFileSync(OUT, JSON.stringify({ captured: base.captured, renamed, finds }, null, 1) + '\n');
  console.log(`renamed ${from} to ${to} in ${changed} of ${finds.length} scout finds in ${path.relative(ROOT, OUT)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const argAfter = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
if (isMain && argAfter('--rename') !== null) {
  renameInBaseline(argAfter('--rename'), argAfter('--why'));
} else if (isMain) {
  if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
    console.error(`${path.relative(ROOT, OUT)} already exists. It is a pre-packs record; rerunning it now would not be one.`);
    process.exit(1);
  }
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

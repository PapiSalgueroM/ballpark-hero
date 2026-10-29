// Reviewer (run lens): retired saves made with the BASE's code (Round 1569's head), for the branch's board to load.
// Usage (repo root on the runner): node .rc/x/review-run-genbase.mjs /tmp/base <out.json> [per sport]
// Each save is what the base board would hold for a retired career: { c, phase: 'retired', teamQuality, coach: null }.
// Three classes in turn: stamped with a salt (since Round 1051), a salt and no stamp (1038 to 1051), neither (older).
// Names cycle through a 24 letter name (the input's cap), a name with an apostrophe and accents, and a plain one.
// The base's card for each save (hallRecordFor after the base board's load repairs) is recorded beside it.
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const N = Number(process.argv[4] || 16);
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const entry = [
  "export { hallRecordFor, stampHallCalibration } from './src/lib/careerHallOfFame.ts';",
  "export { repairSummerOnLoad, newSummerSalt } from './src/lib/usCareerSummer.ts';",
  "export { repairHallOnLoad } from './src/lib/usCareerRetirementFlow.ts';",
  ...SPORTS.map(s => `export { ${s.toUpperCase()}_CAREER_SPORT as SPORT_${s} } from './src/lib/${s}CareerSport.ts';`),
].join('\n');
const TMP = mkdtempSync(path.join(os.tmpdir(), 'base-saves-'));
const BUNDLE = path.join(TMP, 'b.mjs');
await build({
  stdin: { contents: entry, resolveDir: BASE, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE,
  absWorkingDir: BASE, logLevel: 'error', alias: { '@': path.join(BASE, 'src') }, jsx: 'automatic',
  nodePaths: [path.resolve('node_modules')],
  banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
  clear: () => store.clear(), key: () => null, get length() { return store.size; },
};
const W = await import(pathToFileURL(BUNDLE).href);
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const NAMES = ['Maximilian Featherstonex', "José D'Angelo Núñez", null];
const out = { base: BASE, perSport: N, sports: {} };
const outcomes = {};
for (const [si, slug] of SPORTS.entries()) {
  const S = W[`SPORT_${slug}`];
  const positions = Object.keys(S.create.archetypes);
  const eras = S.create.eras.map(e => e.id);
  const rows = [];
  outcomes[slug] = {};
  for (let i = 0; rows.length < N && i < N * 4; i += 1) {
    const rng = seeded(9000 + i * 4 + si);
    const pos = positions[i % positions.length];
    const arch = S.create.archetypes[pos][Math.floor(rng() * S.create.archetypes[pos].length)];
    const name = NAMES[i % 3] ?? `Base ${slug} ${i}`;
    const c = S.startCareer(name, pos, arch, rng, null, eras[i % eras.length]);
    const kind = ['stamped', 'saltOnly', 'old'][i % 3];
    const salt = W.newSummerSalt(rng);
    if (kind !== 'old') c.summerSalt = salt;
    let tq = S.rollTeamQuality(null, rng);
    S.assignRole(c, tq, rng);
    for (let y = 0; y < 40 && !S.shouldRetire(c); y += 1) { S.simSeason(c, tq, rng); S.progress(c, rng); tq = S.rollTeamQuality(tq, rng); }
    c.retired = true;
    if (kind === 'stamped') W.stampHallCalibration(c);
    const raw = JSON.stringify({ c, phase: 'retired', teamQuality: tq, coach: null });
    // The base board's load, in memory: the repairs it makes before the card reads the career.
    const loaded = S.repairNetWorth(JSON.parse(raw).c);
    if (!loaded.role) loaded.role = 'starter';
    W.repairSummerOnLoad(loaded);
    W.repairHallOnLoad(loaded);
    const card = W.hallRecordFor(S.hall, loaded);
    outcomes[slug][card.outcome] = (outcomes[slug][card.outcome] ?? 0) + 1;
    rows.push({ kind, name, raw, card, legacyHof: S.legacyOf(loaded).hof });
  }
  out.sports[slug] = rows;
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`base saves: ${N} a sport from ${BASE}; outcomes ${JSON.stringify(outcomes)}`);

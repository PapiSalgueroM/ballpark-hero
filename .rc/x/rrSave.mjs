// Round 1302 review (run lens). A match saved at half time on the BASE with reviews asked for, loaded and finished on any tree.
//   node rrSave.mjs make <file>   (run from the base tree's root)
//   node rrSave.mjs load <file>   (run from any tree's root): prints D lines that two trees can be compared by
// The leagues: one the base and the branch both cover (premier), several only the branch covers, one neither covers.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2], file = process.argv[3];
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-save-'));
const bundle = path.join(work, 'cm.cjs');
await build({ entryPoints: [path.join(root, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => { store.clear(); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const cm = createRequire(import.meta.url)(bundle);
for (const k of ['startCareer', 'playNextEntry', 'startSecondHalf', 'resumeMatch', 'saveCareer', 'loadCareer', 'REAL_LEAGUES', 'liveFeed']) if (cm[k] === undefined) { console.log('ABORT: engine export missing: ' + k); process.exit(2); }
const realRandom = Math.random, realNow = Date.now;
function run(seed, fn) {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; }
}
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 24);
const LEAGUES = ['premier', 'austria', 'serieb', 'mlsEast', 'denmark', 'brasileirao', 'championship', 'ligamx'];

if (mode === 'make') {
  const saves = [];
  for (const [c, id] of LEAGUES.entries()) {
    const league = cm.REAL_LEAGUES.find(l => l.id === id);
    if (!league) { console.log(`MAKE no league ${id} in this engine`); continue; }
    const club = league.clubs[0];
    const start = run(7100 + c, () => cm.startCareer(club));
    let pick = null;
    for (let t = 0; t < 80 && !pick?.withReview; t++) {
      const stop = run(7300 + c * 97 + t, () => cm.playNextEntry(start, { noCoach: true, varReviews: true }));
      if (stop.kind !== 'halftime' || !stop.state.live) continue;
      const lines = cm.liveFeed(stop.state.live).filter(e => e.kind === 'var').length;
      if (!pick || lines > 0) pick = { stop, withReview: lines > 0, lines, seed: 7300 + c * 97 + t };
      if (stop.state.live.varReviews !== true) break;
    }
    if (!pick) { console.log(`MAKE ${id} ${club}: no half time stop`); continue; }
    store.clear(); run(1, () => cm.saveCareer(pick.stop.state));
    saves.push({ id, club, comp: pick.stop.state.live.compLabel, litAtKickoff: pick.stop.state.live.varReviews === true, firstHalfReviewLines: pick.lines, storage: Object.fromEntries(store.entries()) });
    console.log(`MAKE ${id} ${club} (${pick.stop.state.live.compLabel}): lit at kickoff ${pick.stop.state.live.varReviews === true}, ${pick.lines} review line(s) in the first half, seed ${pick.seed}`);
  }
  fs.writeFileSync(file, JSON.stringify({ saves }));
  console.log(`MAKE wrote ${saves.length} half time saves`);
} else if (mode === 'load') {
  const { saves } = JSON.parse(fs.readFileSync(file, 'utf8'));
  let bad = 0;
  for (const s of saves) {
    store.clear(); for (const [k, v] of Object.entries(s.storage)) store.set(k, v);
    const loaded = run(2, () => cm.loadCareer());
    if (!loaded || !loaded.live) { bad += 1; console.log(`D ${s.id} ${s.club} DID NOT LOAD as a live match`); continue; }
    const lit = loaded.live.varReviews === true;
    const done = run(515151, () => { const second = cm.startSecondHalf(loaded); return second ? cm.resumeMatch(second) : null; });
    const play = done?.report?.detail?.play ?? [];
    const lines = play.filter(e => e.kind === 'var').length;
    const h2 = play.filter(e => e.kind === 'var' && e.minute > 45).length;
    if (lit !== s.litAtKickoff) { bad += 1; console.log(`FAIL ${s.id} ${s.club}: lit at kickoff ${s.litAtKickoff}, after loading ${lit}`); }
    if (!s.litAtKickoff && lines) { bad += 1; console.log(`FAIL ${s.id} ${s.club}: kicked off without reviews and finished with ${lines} review line(s)`); }
    console.log(`D ${s.id} ${s.club} lit=${lit} kind=${done?.kind} score=${done?.report?.homeGoals}-${done?.report?.awayGoals} reviewLines=${lines} secondHalfReviewLines=${h2} match=${sha(done?.report)} after=${sha(done?.state)}`);
  }
  console.log(`LOAD ${saves.length} saves: ${bad} failure(s)`);
  process.exit(bad ? 1 : 0);
} else { console.log('ABORT: unknown mode'); process.exit(2); }

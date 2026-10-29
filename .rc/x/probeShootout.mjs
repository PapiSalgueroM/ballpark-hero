/* Release BS fix proof for BS-cm410-1 (never committed; built on the verifier's probe-vfbs.mjs).
   Plays the first cup tie of Real Madrid, Manchester City and Bayern Munich under SEEDS seeds on two engines:
   HEAD (SHOOT_HEAD, default src/lib/clubManager.ts) and BASE (SHOOT_BASE, the source before the fix, which the
   request line writes from da4f42889 into src/lib/clubManager.base410.ts). A third bundle only sets the clubs up,
   so the two compared bundles see the same plays in the same order and their module counters stay in step.
   Asserts: over every play the winner, the decider, the global draw count and the saved state are equal on both
   (the fix touches only the detached display stream), the shown score agrees with the winner, and on HEAD the
   assigned penalty taker, when he is on at the whistle, takes the first kick of every default shootout.
   Before proof: SHOOT_HEAD=src/lib/clubManager.base410.ts must exit 1 on the taker check alone. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = process.cwd();
const SEEDS = Number(process.env.SEEDS ?? 200);
const HEAD = path.join(ROOT, process.env.SHOOT_HEAD ?? 'src/lib/clubManager.ts');
const BASE = path.join(ROOT, process.env.SHOOT_BASE ?? 'src/lib/clubManager.base410.ts');
assert.ok(fs.existsSync(BASE), `no base source at ${BASE}`);
const realRandom = Math.random, realNow = Date.now;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shoot-'));
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
async function engine(source, name) {
  const file = path.join(tmp, `${name}.mjs`);
  buildSync({ stdin: { contents: `export * from ${JSON.stringify(source)};`, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error',
    alias: { '@/lib/clubManager': source, '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(file).href);
}
function seeded(seed, run) {
  let a = seed | 0, n = 0;
  Math.random = () => { n += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => Date.UTC(2026, 9, 1);
  try { return { value: run(), draws: n }; } finally { Math.random = realRandom; Date.now = realNow; }
}
const sha = v => createHash('sha1').update(JSON.stringify(v)).digest('hex');
const setup = await engine(BASE, 'setup');
const head = await engine(HEAD, 'head');
const base = await engine(BASE, 'base');
const t = { plays: 0, pens: 0, withKicks: 0, takerOn: 0, takerFirst: 0, winDiff: 0, drawDiff: 0, stateDiff: 0, scoreDiff: 0 };
for (const club of ['Real Madrid', 'Manchester City', 'Bayern Munich']) {
  const atCup = seeded(782002, () => {
    let state = setup.startCareer(club);
    const target = state.calendar.findIndex(e => e.type === 'cup');
    for (let g = 0; state.week < target && g < 60; g += 1) {
      const out = setup.playNextEntry(state, { skipHalftime: true, untilWeek: target });
      state = out.state; if (out.kind === 'reached') break;
    }
    assert.equal(state.week, target, `${club} did not reach the cup`);
    return state;
  }).value;
  const tk = atCup.squad.find(p => p.id === atCup.setPieces?.penalties);
  assert.ok(tk && !atCup.shootoutOrder, `${club}: an assigned taker and no shootout order are required`);
  let shown = 0;
  for (let s = 1; s <= SEEDS; s += 1) {
    const seed = 410000 + s * 7919;
    const a = seeded(seed, () => base.playNextEntry(atCup, { skipHalftime: true }));
    const b = seeded(seed, () => head.playNextEntry(atCup, { skipHalftime: true }));
    t.plays += 1;
    const ra = a.value.report, rb = b.value.report;
    if (a.draws !== b.draws) t.drawDiff += 1;
    if (sha(a.value.state) !== sha(b.value.state)) t.stateDiff += 1;
    if (ra?.won !== rb?.won || ra?.shootoutWon !== rb?.shootoutWon || ra?.decidedBy !== rb?.decidedBy) t.winDiff += 1;
    if (rb?.decidedBy !== 'pens') continue;
    t.pens += 1;
    if (!rb.shootout) continue;
    t.withKicks += 1;
    const kicks = rb.shootout.kicks;
    if (rb.shootout.mine !== kicks[kicks.length - 1].mine || (rb.shootout.mine > rb.shootout.theirs) !== rb.shootoutWon) t.scoreDiff += 1;
    const d = rb.detail;
    const on = (d?.myRatings ?? []).some(r => r.name === tk.name) && !(d?.subs ?? []).some(x => x.offId === tk.id || x.off === tk.name)
      && !(d?.cards ?? []).some(c => c.kind === 'red' && (c.id === tk.id || c.name === tk.name));
    const mine = kicks.filter(k => k.side === 'me').map(k => k.taker);
    if (on) { t.takerOn += 1; if (mine[0] === tk.name) t.takerFirst += 1; }
    if (shown < 1) { shown += 1; console.log(`  ${club} seed ${seed} ${rb.shootout.mine}-${rb.shootout.theirs}: my first five ${mine.slice(0, 5).join(', ')}; assigned taker ${tk.name}`); }
  }
}
console.log(`SHOOTOUT ${JSON.stringify(t)}`);
const exact = t.winDiff === 0 && t.drawDiff === 0 && t.stateDiff === 0 && t.scoreDiff === 0 && t.withKicks >= 40;
const first = t.takerOn >= 30 && t.takerFirst === t.takerOn;
console.log(`lockstep with the base engine over ${t.plays} plays: ${exact ? 'EXACT' : 'NOT EXACT'}; assigned taker first in ${t.takerFirst} of ${t.takerOn} default shootouts he was on for`);
console.log(exact && first ? 'shootout probe: green' : 'shootout probe: RED');
process.exit(exact && first ? 0 : 1);

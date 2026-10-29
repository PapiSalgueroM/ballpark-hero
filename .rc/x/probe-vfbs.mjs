/* Skeptic probe for BS-cm410-1. Plays the first cup tie of three real clubs under many seeds on the PR head and
   on a copy with the suggested fix, and reports who takes my kicks in a default (no order) shootout. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = process.cwd();
const SEEDS = Number(process.env.SEEDS ?? 300);
const realRandom = Math.random;
const realNow = Date.now;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vfbs-'));
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });

const headSrc = path.join(ROOT, 'src/lib/clubManager.ts');
const text = fs.readFileSync(headSrc, 'utf8');
const OLD = '    const sides = shootoutSides(state, [], finished, theirs, oppS);';
assert.equal(text.split(OLD).length, 2, 'the default order line is not in the head source exactly once');
const NEW = [
  "    const gk = finished.find(x => x.slot?.allowed.includes('GK'))?.p ?? finished.find(x => !x.slot && x.p.position === 'GK')?.p ?? null;",
  '    const best = finished.map(x => x.p).filter(p => p !== gk && p.id !== taker?.id).sort((a, b) => b.rating - a.rating).map(p => p.id);',
  '    const sides = shootoutSides(state, taker ? [taker.id, ...best] : best, finished, theirs, oppS);',
].join('\n');
const fixedSrc = path.join(ROOT, 'src/lib/clubManager.vfbsfix.ts');
fs.writeFileSync(fixedSrc, text.replace(OLD, NEW));
const copySrc = path.join(ROOT, 'src/lib/clubManager.vfbscopy.ts');
fs.writeFileSync(copySrc, text);
function firstDiff(x, y, at = '') {
  if (x === y) return null;
  if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return `${at}: ${JSON.stringify(x)?.slice(0, 160)} vs ${JSON.stringify(y)?.slice(0, 160)}`;
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) { const d = firstDiff(x[k], y[k], `${at}.${k}`); if (d) return d; }
  return null;
}
const diffPaths = new Map(); let copyDiff = 0; let shownDiff = 0; let fixVsCopy = 0;

async function engine(source, name) {
  const file = path.join(tmp, `${name}.mjs`);
  buildSync({ stdin: { contents: `export * from ${JSON.stringify(source)};`, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error',
    alias: { '@/lib/clubManager': source, '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(file).href);
}
function seeded(seed, run) {
  let a = seed | 0; let n = 0;
  Math.random = () => { n += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => Date.UTC(2026, 9, 1);
  try { return { value: run(), draws: n }; } finally { Math.random = realRandom; Date.now = realNow; }
}
const GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'ATT', RW: 'ATT', CF: 'ATT', ST: 'ATT' };
const sha = v => createHash('sha1').update(JSON.stringify(v)).digest('hex');

const head = await engine(headSrc, 'head');
const fixed = await engine(fixedSrc, 'fixed');
const copyEngine = await engine(copySrc, 'copy');
let total = { pens: 0, withDetail: 0, takerOn: 0, takerKicked: 0, takerFirstFive: 0, takerFirstKick: 0,
  fixPens: 0, fixTakerFirstKick: 0, fixTakerOn: 0, winDiff: 0, drawDiff: 0, stateDiff: 0, scoreDiff: 0 };
const groups = {}; const fixGroups = {};
for (const club of ['Real Madrid', 'Manchester City', 'Bayern Munich']) {
  const atCup = seeded(782002, () => {
    let state = head.startCareer(club);
    const target = state.calendar.findIndex(e => e.type === 'cup');
    assert.ok(target >= 0, `${club} has no cup`);
    for (let g = 0; state.week < target && g < 60; g += 1) {
      const out = head.playNextEntry(state, { skipHalftime: true, untilWeek: target });
      state = out.state; if (out.kind === 'reached') break;
    }
    assert.equal(state.week, target, `${club} did not reach the cup`);
    return state;
  }).value;
  const byName = new Map(atCup.squad.map(p => [p.name, p]));
  const tk = atCup.squad.find(p => p.id === atCup.setPieces?.penalties);
  assert.ok(tk, `${club} has no assigned penalty taker`);
  assert.ok(!atCup.shootoutOrder, `${club} has a shootout order set`);
  /* The exact default list on the starting eleven, read off the exported helper the PR calls. */
  const xi = head.effectiveXIWithSlots(atCup);
  const list = head.shootoutSides(atCup, [], xi, [], 70).mine.takers.map(t => `${t.name} (${byName.get(t.name)?.position} ${t.rating})`);
  console.log(`${club}: assigned penalty taker ${tk.name} (${tk.position} ${tk.rating}); default list on the starting eleven: ${list.map((s, i) => `${i + 1}. ${s}`).join(', ')}`);
  let shown = 0; let cPens = 0; let cKicked = 0;
  for (let s = 1; s <= SEEDS; s += 1) {
    const seed = 410000 + s * 7919;
    const a = seeded(seed, () => head.playNextEntry(atCup, { skipHalftime: true }));
    const b = seeded(seed, () => fixed.playNextEntry(atCup, { skipHalftime: true }));
    const ra = a.value.report; const rb = b.value.report;
    if (a.draws !== b.draws) total.drawDiff += 1;
    const c = seeded(seed, () => copyEngine.playNextEntry(atCup, { skipHalftime: true }));
    if (sha(a.value.state) !== sha(c.value.state)) copyDiff += 1;
    if (sha(b.value.state) !== sha(c.value.state)) fixVsCopy += 1;
    if (c.draws !== b.draws || c.value.report?.won !== rb?.won || c.value.report?.shootoutWon !== rb?.shootoutWon) fixVsCopy += 1000;
    if (sha(a.value.state) !== sha(b.value.state)) {
      total.stateDiff += 1;
      const d = firstDiff(a.value.state, b.value.state) ?? 'none';
      const key = d.split(':')[0].replace(/\.\d+/g, '.N');
      diffPaths.set(key, (diffPaths.get(key) ?? 0) + 1);
      if (shownDiff < 3) { shownDiff += 1; console.log(`  state diff seed ${seed} decidedBy ${ra?.decidedBy}: ${d}`); }
    }
    if (ra?.won !== rb?.won || ra?.shootoutWon !== rb?.shootoutWon || ra?.decidedBy !== rb?.decidedBy) total.winDiff += 1;
    if (rb?.shootout && (rb.shootout.mine !== rb.shootout.kicks.at(-1).mine || (rb.shootout.mine > rb.shootout.theirs) !== rb.shootoutWon)) total.scoreDiff += 1;
    if (ra?.decidedBy !== 'pens') continue;
    total.pens += 1; cPens += 1;
    if (!ra.shootout) continue;
    total.withDetail += 1;
    const mine = ra.shootout.kicks.filter(k => k.side === 'me').map(k => k.taker);
    const opp = ra.shootout.kicks.filter(k => k.side === 'opp').map(k => k.taker);
    const d = ra.detail;
    const on = (d?.myRatings ?? []).some(r => r.name === tk.name) && !(d?.subs ?? []).some(x => x.offId === tk.id || x.off === tk.name)
      && !(d?.cards ?? []).some(c => c.kind === 'red' && (c.id === tk.id || c.name === tk.name));
    if (on) total.takerOn += 1;
    const at = mine.indexOf(tk.name);
    if (at >= 0) { total.takerKicked += 1; cKicked += 1; }
    if (at >= 0 && at < 5) total.takerFirstFive += 1;
    if (at === 0) total.takerFirstKick += 1;
    for (const n of mine.slice(0, 5)) { const g = GROUP[byName.get(n)?.position] ?? '?'; groups[g] = (groups[g] ?? 0) + 1; }
    if (rb.shootout) {
      total.fixPens += 1;
      const fm = rb.shootout.kicks.filter(k => k.side === 'me').map(k => k.taker);
      if (on) { total.fixTakerOn += 1; if (fm[0] === tk.name) total.fixTakerFirstKick += 1; }
      for (const n of fm.slice(0, 5)) { const g = GROUP[byName.get(n)?.position] ?? '?'; fixGroups[g] = (fixGroups[g] ?? 0) + 1; }
    }
    if (shown < 2) {
      shown += 1;
      const tag = n => `${n} (${byName.get(n)?.position} ${byName.get(n)?.rating})`;
      console.log(`  seed ${seed} ${ra.shootout.mine}-${ra.shootout.theirs} head, my first five: ${mine.slice(0, 5).map(tag).join(', ')}; ${tk.name} at my kick ${at >= 0 ? at + 1 : 'none'} of ${mine.length}; their first: ${opp[0]}`);
      if (rb.shootout) console.log(`    fixed, same seed ${rb.shootout.mine}-${rb.shootout.theirs}: ${rb.shootout.kicks.filter(k => k.side === 'me').slice(0, 5).map(k => tag(k.taker)).join(', ')}`);
    }
  }
  console.log(`  ${club}: ${cPens} pens of ${SEEDS} seeds, taker kicked in ${cKicked}`);
}
fs.rmSync(fixedSrc);
fs.rmSync(copySrc);
console.log(`CONTROL head vs identical copy bundle: saved state differs ${copyDiff} of ${SEEDS * 3}`);
console.log(`state diff paths head vs fix: ${JSON.stringify([...diffPaths])}`);
console.log(`FIX vs identical fresh copy bundle (counters in lockstep): saved state, draws or winner differ ${fixVsCopy} of ${SEEDS * 3}`);
console.log(`HEAD: ${total.pens} default shootouts, ${total.withDetail} with kicks; assigned taker on at the whistle in ${total.takerOn}, kicked at all in ${total.takerKicked}, in my first five in ${total.takerFirstFive}, first kick in ${total.takerFirstKick}; my first-five kicks by group ${JSON.stringify(groups)}`);
console.log(`FIX: ${total.fixPens} shootouts with kicks; taker on and kicking first in ${total.fixTakerFirstKick} of ${total.fixTakerOn}; first-five by group ${JSON.stringify(fixGroups)}`);
console.log(`FIX vs HEAD over ${SEEDS * 3} plays: winner or decider differs ${total.winDiff}, draw count differs ${total.drawDiff}, saved state differs ${total.stateDiff}; fixed shown score disagrees with winner ${total.scoreDiff}`);
const ok = total.withDetail > 0 && total.winDiff === 0 && total.drawDiff === 0 && fixVsCopy === 0 && total.scoreDiff === 0;
console.log(ok ? 'PROBE VFBS DONE' : 'PROBE VFBS FIX NOT EXACT');
process.exit(ok ? 0 : 1);

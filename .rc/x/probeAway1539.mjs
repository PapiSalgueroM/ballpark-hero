/* Round 1539 one shot legs (never committed): run from the repo root.
 * Leg A (decision 4, the away match): 200 seeded trips of 0 to 13 hours. The head
 *   plays exactly min(floor(capped seconds / 1680), playable) matchdays, and its first
 *   k results and its state after k equal those of the head lib with 1800 written back
 *   (k = that lib's count), on the same rolls.
 * Leg B (design 3.2): the pack pace visitor model (simTycoonPackPace's loop, copied),
 *   returns at visits 2 to 10, 100 seeds, both policies: the share of returns whose card
 *   says "the final matchday is waiting for you" (left <= 1 with a league result), 1800
 *   against 1680, and the mean away matchdays a return.
 * Exit 0 when leg A holds, 1 when it does not, 2 when it could not run. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1539-'));
const HEAD_LINE = 'export const AWAY_MATCHDAY_SEC = 1680;';
const src = fs.readFileSync(LIB, 'utf8');
if (src.split(HEAD_LINE).length !== 2) { console.error('ABORTED: the head clock line is not in the lib exactly once'); process.exit(2); }

async function bundle(name, contents) {
  const output = path.join(temp, `${name}.mjs`);
  await build({
    stdin: { contents, resolveDir: path.join(ROOT, 'src/lib'), loader: 'ts', sourcefile: `${name}.ts` },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
  });
  return import(pathToFileURL(output).href);
}
const H = await bundle('head', src);
const O = await bundle('old', src.replace(HEAD_LINE, 'export const AWAY_MATCHDAY_SEC = 1800;'));
if (H.AWAY_MATCHDAY_SEC !== 1680 || O.AWAY_MATCHDAY_SEC !== 1800) { console.error('ABORTED: the two bundles do not carry 1680 and 1800'); process.exit(2); }

function mulberry(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---- Leg A ---- */
let bad = 0;
const gains = {};
for (let i = 0; i < 200; i += 1) {
  const pick = mulberry(9000 + i);
  const division = Math.floor(pick() * 10);
  const shape = H.leagueShape(division);
  const f = H.newTycoon(0);
  const league = { ...H.newLeague(i % 3, division, i % 4), matchday: Math.floor(pick() * shape.matchdays) };
  if (pick() < 0.2) league.carryover = H.legacyOpponentName({ ...f, league });
  const away = Math.floor(pick() * 3);
  const s = {
    ...f, rep: i % 3, levels: { ...f.levels, squad: Math.floor(pick() * 80) }, minute: Math.floor(pick() * 90),
    streak: i % 6, legacyPerks: away ? { away } : {}, league, bestDivision: division, savedAt: 0,
  };
  const ms = Math.floor(pick() * 13 * 3600) * 1000;
  const capped = H.awaySecondsOf(s, ms);
  const nH = Math.floor(capped / H.AWAY_MATCHDAY_SEC);
  const nO = Math.floor(O.awaySecondsOf(s, ms) / O.AWAY_MATCHDAY_SEC);
  const want = Math.min(Math.floor(capped / 1680), H.awayMatchdaysPlayable(s, 1e6));
  const head = H.playAwayMatchdays(s, nH, mulberry(i + 1));
  const old = O.playAwayMatchdays(s, nO, mulberry(i + 1));
  const headK = H.playAwayMatchdays(s, old.results.length, mulberry(i + 1));
  const msgs = [];
  if (head.results.length !== want) msgs.push(`head played ${head.results.length}, the rule says ${want}`);
  try { assert.deepEqual(head.results.slice(0, old.results.length), old.results); } catch { msgs.push('first k results differ'); }
  try { assert.deepEqual(headK.state, old.state); } catch { msgs.push('state after k differs'); }
  const gain = head.results.length - old.results.length;
  gains[gain] = (gains[gain] ?? 0) + 1;
  if (gain < 0) msgs.push(`the head played fewer (${gain})`);
  if (msgs.length) { bad += 1; if (bad <= 5) console.log(`  BAD trip ${i}: division ${division}, ${(ms / 3600e3).toFixed(2)} h, ${msgs.join('; ')}`); }
}
console.log(`Leg A: ${200 - bad} of 200 trips hold (count = min(floor(capped / 1680), playable), first k results and the state after k equal the 1800 lib's); head minus old matchdays: ${JSON.stringify(gains)}`);

/* ---- Leg B ---- */
const DT = 0.2;
function returns(T, seed, policy) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  const out = [];
  const upgrade = () => {
    for (;;) {
      const full = T.attendance(s) >= T.capacity(s) - 5;
      const options = T.TRACKS.filter(t => T.canBuy(s, t.id)).sort((a, b) =>
        T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
      if (!options.length) break;
      s = T.buy(s, options[0].id);
    }
  };
  for (let visit = 1; visit <= 10; visit += 1) {
    const now = (visit - 1) * 12 * 3600 * 1000;
    if (visit > 1) {
      const pay = T.offlineEarnings(s, now);
      const count = Math.floor(T.awaySecondsOf(s, now) / T.AWAY_MATCHDAY_SEC);
      const paid = { ...s, money: s.money + pay, lifetime: s.lifetime + pay, savedAt: now };
      const away = T.playAwayMatchdays(paid, count, roll);
      s = away.state;
      const lg = s.league;
      const league = lg && away.results.some(r => !r.friendly);
      out.push({ n: away.results.length, waiting: Boolean(league && T.leagueShape(lg.division).matchdays - lg.matchday <= 1), big: Boolean(lg && T.leagueShape(lg.division).clubs === 10) });
    }
    upgrade();
    if (policy === 'immediate' && T.canPrestige(s)) s = T.prestige(s, now);
    for (let step = 1; step <= Math.round(300 / DT); step += 1) {
      const r = T.tick(s, DT, roll);
      s = r.state;
      const season = r.events.find(e => ['title', 'seasonEnd'].includes(e.kind) && e.position !== undefined);
      if (step % Math.round(2 / DT) === 0) upgrade();
      if (T.canPrestige(s) && (policy === 'immediate' || season)) s = T.prestige(s, now + step * DT * 1000);
    }
    s.savedAt = now + 300000;
  }
  return out;
}
for (const policy of ['immediate', 'afterFinal']) {
  for (const [name, T] of [['1800', O], ['1680', H]]) {
    const all = [];
    for (let seed = 1; seed <= 100; seed += 1) all.push(...returns(T, seed, policy));
    const waiting = all.filter(r => r.waiting).length;
    const big = all.filter(r => r.big);
    const bigWaiting = big.filter(r => r.waiting).length;
    const mean = all.reduce((a, r) => a + r.n, 0) / all.length;
    console.log(`Leg B ${policy} at ${name}: ${waiting} of ${all.length} returns find the final waiting (${(100 * waiting / all.length).toFixed(1)}%); in ten club divisions ${bigWaiting} of ${big.length}; mean away matchdays a return ${mean.toFixed(2)}`);
  }
}
fs.rmSync(temp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);

/* NBA Stat Line, Round 336: the blend engine holds its own laws.
 *
 * The engine (pool build, target draw, combination, scoring) is PURE over
 * injected rows, so this harness drives it with SYNTHETIC fixture rows,
 * invented names like "Fixture Guard 12" that ship nowhere; the real game's
 * rows come from bref_nba_player_seasons at runtime. The laws:
 *   1. POOL BUILD: combined 2TM..5TM rows, sub 500 minute rows and rows
 *      with missing counting stats never enter the pickable pool;
 *   2. TARGET DETERMINISM AND VARIETY: the same date deals the same target
 *      byte identical, and a simulated year deals a year of genuinely
 *      different targets (the Round 212 failure class);
 *   3. ERA GATING: a target with steals or blocks admits no pre 1973-74
 *      season and nothing with null stocks; a 3P% target admits nothing
 *      before 1979-80; and the gate never excludes its own anchor;
 *   4. ACHIEVABILITY: every target is a real season's line, so the anchor
 *      plus its four best complements must score near the maximum,
 *      measured over a year of targets with a floor set below the
 *      measured minimum;
 *   5. SPLITS ARE RECOMPUTED, NOT AVERAGED: a planted fixture where the
 *      two answers disagree by six points must give the recomputed one;
 *   6. NULL SAFETY: pre 1974 picks with null steals and blocks combine and
 *      score without a single NaN;
 *   7. SCORING IDENTITIES: an exact match is exactly 100, a line a full
 *      scale off on every stat is exactly 0, and widening the miss on one
 *      stat never raises the score;
 *   8. SEARCH: prefix matches outrank substring matches and excluded keys
 *      never surface.
 *
 * NEGATIVE CONTROL: SIM_NBASL_CONTROL=avgsplit rewrites the split
 * recomputation in a bundled copy to average the five percentages, and
 * section 5 must go red, proving the discriminating fixture actually
 * discriminates.
 *
 * Run: node scripts/simNbaStatLine.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_NBASL_CONTROL || '';
if (CONTROL && CONTROL !== 'avgsplit') { console.error(`SIM_NBASL_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/nbaStatLine.entry.mjs`;
const BUNDLE = `${TMP}/nbaStatLine.bundle.mjs`;

let libPath = `${ROOT}/src/lib/nbaStatLine.ts`;
if (CONTROL === 'avgsplit') {
  const src = fs.readFileSync(libPath, 'utf8');
  const needle = 'const splitPct = splitAtts > 0 ? (splitMakes / splitAtts) * 100 : 0;';
  if (!src.includes(needle)) { console.error('control run: the split recompute line is not in the source, refusing to run a dead control'); process.exit(1); }
  libPath = `${TMP}/nbaStatLine.control.ts`;
  fs.writeFileSync(libPath, src.replace(needle,
    'const splitPct = picks.length > 0 ? picks.reduce((a, p) => { const [mk, at] = splitParts(p, split); return a + (at > 0 ? (mk / at) * 100 : 0); }, 0) / picks.length : 0;'));
  console.log('NEGATIVE CONTROL ON: the split recompute replaced with an average of percentages in a bundled copy, section 5 must now go red');
}
fs.writeFileSync(ENTRY, `export * as sl from '${libPath}';\n`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { sl } = await import(pathToFileURL(BUNDLE).href);
const {
  PICK_COUNT, STOCKS_FLOOR_YEAR, THREES_FLOOR_YEAR,
  buildDailyTarget, buildPool, combineLine, eligiblePoolFor,
  scoreCombined, suggestSeasons,
} = sl;

/* ---- Synthetic fixture rows. Invented names, shipped nowhere. ---- */
function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const seasonStr = endYear => `${endYear - 1}-${String(endYear % 100).padStart(2, '0')}`;

function fixtureRows(seed) {
  const rng = lehmer(seed);
  const rows = [];
  const KINDS = ['Guard', 'Wing', 'Forward', 'Big', 'Center', 'Combo'];
  let playerNo = 0;
  /* 48 archetype clusters. Each archetype fixes a per-36 shape and an era
     band; its 60 seasons jitter around it so near neighbors exist for the
     achievability law, the way real history clusters around roles. */
  for (let a = 0; a < 48; a += 1) {
    const base = {
      pts: 8 + rng() * 24,
      trb: 2 + rng() * 12,
      ast: 1 + rng() * 10,
      stl: 0.5 + rng() * 2,
      blk: 0.1 + rng() * 2.4,
      fgPct: 0.40 + rng() * 0.18,
      ftPct: 0.62 + rng() * 0.28,
      threePa36: rng() < 0.5 ? 4 + rng() * 5 : rng() * 2,
      threePct: 0.28 + rng() * 0.14,
    };
    const eraStart = 1955 + Math.floor(rng() * 64); // end years 1955..2026
    for (let n = 0; n < 60; n += 1) {
      playerNo += 1;
      const name = `Fixture ${KINDS[a % KINDS.length]} ${playerNo}`;
      const endYear = Math.min(2026, eraStart + Math.floor(rng() * 8));
      const minutes = 500 + Math.floor(rng() * 2700);
      const j = () => 0.9 + rng() * 0.2; // plus or minus ten percent
      const p36 = {
        pts: base.pts * j(), trb: base.trb * j(), ast: base.ast * j(),
        stl: base.stl * j(), blk: base.blk * j(),
      };
      const tot = v => Math.round((v / 36) * minutes);
      const fga = Math.max(50, tot(p36.pts * 0.45 + 2));
      const fta = Math.max(20, tot(p36.pts * 0.28));
      const modernStocks = endYear >= 1974;
      const modernThrees = endYear >= 1980;
      const threePa = modernThrees ? Math.round((base.threePa36 * j() / 36) * minutes) : null;
      rows.push({
        season: seasonStr(endYear), player_name: name, position: 'SF', team: 'FXA',
        minutes,
        pts: tot(p36.pts), trb: tot(p36.trb), ast: tot(p36.ast),
        stl: modernStocks ? tot(p36.stl) : null,
        blk: modernStocks ? tot(p36.blk) : null,
        fg: Math.round(fga * base.fgPct * j()), fga,
        ft: Math.round(fta * base.ftPct * Math.min(1, j())), fta,
        three_p: threePa != null ? Math.round(threePa * base.threePct * j()) : null,
        three_pa: threePa,
      });
    }
  }
  return rows;
}

/* SIM_NBASL_SEED regenerates the fixture universe, used to measure the
   floors below across seeds before they were set. Default is the shipped
   deterministic run. */
const ROWS = fixtureRows(Number(process.env.SIM_NBASL_SEED || 20260829));
/* Planted junk that must never reach the pool. */
const JUNK = [
  { season: '1998-99', player_name: 'Fixture Traded 1', position: 'SG', team: '2TM', minutes: 2000, pts: 900, trb: 300, ast: 200, stl: 80, blk: 20, fg: 350, fga: 800, ft: 180, fta: 220, three_p: 20, three_pa: 70 },
  { season: '2004-05', player_name: 'Fixture Traded 2', position: 'C', team: '3TM', minutes: 1500, pts: 600, trb: 500, ast: 100, stl: 50, blk: 90, fg: 250, fga: 500, ft: 100, fta: 150, three_p: 0, three_pa: 2 },
  { season: '2010-11', player_name: 'Fixture Bench 3', position: 'PG', team: 'FXB', minutes: 300, pts: 120, trb: 40, ast: 60, stl: 20, blk: 5, fg: 45, fga: 110, ft: 25, fta: 30, three_p: 5, three_pa: 20 },
  { season: '1948-49', player_name: 'Fixture Ghost 4', position: 'F', team: 'FXB', minutes: null, pts: 700, trb: null, ast: 100, stl: null, blk: null, fg: null, fga: null, ft: 200, fta: 280, three_p: null, three_pa: null },
  { season: '2015-16', player_name: 'Fixture Hole 5', position: 'SF', team: 'FXB', minutes: 1400, pts: null, trb: 200, ast: 150, stl: 60, blk: 30, fg: 280, fga: 600, ft: 120, fta: 150, three_p: 60, three_pa: 170 },
];
const POOL = buildPool([...ROWS, ...JUNK]);

const days = (() => {
  const out = [];
  const d0 = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(d0.getTime() + i * 86400000);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
  }
  return out;
})();

console.log('1) pool build: the junk stays out');
{
  const byName = new Set(POOL.map(s => s.player));
  if (POOL.length < 2000) fail(`fixture pool built only ${POOL.length} seasons, the fixtures are broken`);
  for (const s of POOL) {
    if (['2TM', '3TM', '4TM', '5TM'].includes(s.team)) fail(`combined row ${s.key} entered the pool`);
    if (s.minutes < 500) fail(`${s.key} entered the pool with ${s.minutes} minutes`);
  }
  for (const junkName of ['Fixture Traded 1', 'Fixture Traded 2', 'Fixture Bench 3', 'Fixture Ghost 4', 'Fixture Hole 5']) {
    if (byName.has(junkName)) fail(`planted junk row "${junkName}" entered the pool`);
  }
  console.log(`   ${POOL.length} pool seasons from ${ROWS.length + JUNK.length} raw rows, all five planted junk rows rejected`);
}

console.log('2) target determinism, and a year of different targets');
{
  const a = JSON.stringify(buildDailyTarget(POOL, '2026-08-29'));
  const b = JSON.stringify(buildDailyTarget(POOL, '2026-08-29'));
  if (a !== b) fail('the same date dealt two different targets');
  const prints = new Set();
  let stocks = 0; const splitCount = { FG: 0, FT: 0, '3P': 0 };
  for (const day of days) {
    const built = buildDailyTarget(POOL, day);
    prints.add(JSON.stringify(built.target));
    if (built.target.stl != null) stocks += 1;
    splitCount[built.target.split] += 1;
  }
  /* Measured over six fixture seeds: 365 days deal 349 to 352 distinct
     targets (a dozen anchor repeats is honest birthday chance in a 2.9k
     pool). Floor 320, comfortably under every measured run and a world
     away from the Round 212 failure shape of two targets a year. */
  if (prints.size < 320) fail(`a year of daily targets dealt only ${prints.size} distinct targets`);
  if (stocks === 0 || stocks === 365) fail(`stocks gating never varied across the year (${stocks}/365 with steals and blocks)`);
  console.log(`   365 days dealt ${prints.size} distinct targets, ${stocks} with stocks, splits FG ${splitCount.FG} / FT ${splitCount.FT} / 3P ${splitCount['3P']}`);
}

console.log('3) era gating, and the gate never orphans its anchor');
{
  let gated = 0; let open = 0;
  for (const day of days) {
    const built = buildDailyTarget(POOL, day);
    const pool = eligiblePoolFor(POOL, built.target);
    if (built.target.stl != null) {
      gated += 1;
      for (const s of pool) {
        if (s.endYear < STOCKS_FLOOR_YEAR) { fail(`${day}: pre-${STOCKS_FLOOR_YEAR} season ${s.key} in a stocks gated pool`); break; }
        if (s.stl == null || s.blk == null) { fail(`${day}: null stocks season ${s.key} in a stocks gated pool`); break; }
      }
    } else {
      open += 1;
      if (!pool.some(s => s.endYear < STOCKS_FLOOR_YEAR)) fail(`${day}: an open target's pool lost its pre-1974 seasons`);
    }
    if (built.target.split === '3P' && pool.some(s => s.endYear < THREES_FLOOR_YEAR || s.threePa == null)) {
      fail(`${day}: a 3P% target admitted a season without a three point line`);
    }
    if (!pool.some(s => s.key === built.anchorKey)) fail(`${day}: the gate excluded its own anchor ${built.anchorKey}`);
  }
  console.log(`   365 targets: ${gated} stocks gated pools clean of pre-1974, ${open} open pools kept theirs, every anchor pickable`);
}

console.log('4) achievability: the anchor and four friends land near the top');
{
  let worst = 101; let sum = 0; let n = 0;
  for (let i = 0; i < 365; i += 3) {
    const built = buildDailyTarget(POOL, days[i]);
    const pool = eligiblePoolFor(POOL, built.target);
    const anchor = pool.find(s => s.key === built.anchorKey);
    if (!anchor) { fail(`${days[i]}: anchor missing from its own pool`); continue; }
    const others = pool
      .filter(s => s.key !== anchor.key)
      .map(s => ({ s, solo: scoreCombined(built.target, combineLine([s], built.target.split)).total }))
      .sort((x, y) => y.solo - x.solo)
      .slice(0, PICK_COUNT - 1)
      .map(x => x.s);
    const total = scoreCombined(built.target, combineLine([anchor, ...others], built.target.split)).total;
    worst = Math.min(worst, total);
    sum += total; n += 1;
  }
  /* Measured over six fixture seeds: the anchor plus its four best
     complements scores mean 96.9 to 97.2 with a minimum of 91 to 94 across
     122 sampled targets. Floor 85, well under every measured minimum and
     far above anything a broken blend could reach. */
  if (worst < 85) fail(`a target's best five pick blend scored only ${worst}`);
  console.log(`   ${n} targets: anchor plus best four scores mean ${(sum / n).toFixed(1)}, minimum ${worst}`);
}

console.log('5) splits recomputed from summed makes and attempts, never averaged');
{
  /* Discriminating fixture: 100 of 200 (50%) with 10 of 100 (10%).
     Recomputed: 110/300 = 36.67%. Averaged: 30%. Six and a half points of
     daylight, so only one answer can pass. */
  const A = POOL.find(s => s.fga > 0);
  const mk = (fg, fga, minutes) => ({ ...A, key: `x|${fg}|${fga}`, player: 'Fixture Split A', minutes, fg, fga, stl: 1, blk: 1 });
  const combined = combineLine([mk(100, 200, 1000), mk(10, 100, 1000)], 'FG');
  const recomputed = (110 / 300) * 100;
  const averaged = 30;
  const gotRecomputed = Math.abs(combined.splitPct - recomputed) < 1e-9;
  const gotAveraged = Math.abs(combined.splitPct - averaged) < 1e-9;
  if (CONTROL === 'avgsplit') {
    if (gotAveraged && !gotRecomputed) {
      console.log(`simNbaStatLine control: green. The averaged copy answered ${combined.splitPct.toFixed(2)}% and the check caught it.`);
      process.exit(0);
    }
    console.error(`simNbaStatLine control: RED. The averaged copy still answered ${combined.splitPct.toFixed(2)}%, the check cannot see the difference.`);
    process.exit(1);
  }
  if (!gotRecomputed) fail(`combined FG% came back ${combined.splitPct.toFixed(2)}%, expected the recomputed ${recomputed.toFixed(2)}%${gotAveraged ? ' (this IS the averaged answer)' : ''}`);
  console.log(`   50% on 200 attempts with 10% on 100 attempts blends to ${combined.splitPct.toFixed(2)}%, not the averaged 30%`);
}

console.log('6) null stocks combine without a NaN');
{
  const old = POOL.filter(s => s.endYear < STOCKS_FLOOR_YEAR).slice(0, PICK_COUNT);
  if (old.length < PICK_COUNT) fail(`fixtures hold only ${old.length} pre-1974 seasons, the null law has nothing to chew`);
  const noStocksTarget = (() => {
    for (const day of days) {
      const b = buildDailyTarget(POOL, day);
      if (b.target.stl == null) return b.target;
    }
    return null;
  })();
  if (!noStocksTarget) { fail('a year of targets never dealt one without stocks'); }
  else {
    const combined = combineLine(old, noStocksTarget.split);
    if (combined.stl !== null || combined.blk !== null) fail('pre-1974 picks combined to a non null steals or blocks number');
    const scored = scoreCombined(noStocksTarget, combined);
    const nums = [scored.total, ...scored.breakdown.flatMap(s => [s.target, s.actual, s.closeness])];
    const nans = nums.filter(v => !Number.isFinite(v)).length;
    if (nans > 0) fail(`${nans} non finite numbers in a null stocks scoring pass`);
    console.log(`   five pre-1974 picks combined to null stocks and scored ${scored.total} with every number finite`);
  }
}

console.log('7) scoring identities');
{
  const t = buildDailyTarget(POOL, '2026-03-15').target;
  const exact = {
    minutes: 5000, pts: t.pts, trb: t.trb, ast: t.ast,
    stl: t.stl, blk: t.blk, splitMakes: 0, splitAtts: 0, splitPct: t.splitPct,
  };
  const perfect = scoreCombined(t, exact).total;
  if (perfect !== 100) fail(`an exact match scored ${perfect}, not 100`);
  const wild = scoreCombined(t, {
    ...exact,
    pts: t.pts + 50, trb: t.trb + 40, ast: t.ast + 30,
    stl: t.stl != null ? t.stl + 10 : null, blk: t.blk != null ? t.blk + 10 : null,
    splitPct: t.splitPct + 60,
  }).total;
  if (wild !== 0) fail(`a line a full scale off everywhere scored ${wild}, not 0`);
  let prev = 101; let broke = false;
  for (let d = 0; d <= 20; d += 0.5) {
    const s = scoreCombined(t, { ...exact, pts: t.pts + d }).total;
    if (s > prev) { fail(`widening the points miss from ${d - 0.5} to ${d} RAISED the score ${prev} -> ${s}`); broke = true; break; }
    prev = s;
  }
  console.log(`   exact match 100, everything wrong 0, points miss monotone${broke ? '' : ' across 41 widths'}`);
}

console.log('8) search: prefixes first, exclusions respected');
{
  const results = suggestSeasons(POOL, 'fixture gu');
  if (results.length === 0) fail('a two word prefix query found nothing in a pool full of Fixture Guards');
  if (results.some(s => !s.player.toLowerCase().startsWith('fixture gu'))) fail('a full prefix query surfaced a non prefix match ahead of the cut');
  const one = results[0];
  const excluded = suggestSeasons(POOL, 'fixture gu', new Set([one.key]));
  if (excluded.some(s => s.key === one.key)) fail(`excluded key ${one.key} surfaced anyway`);
  const short = suggestSeasons(POOL, 'f');
  if (short.length !== 0) fail('a one letter query returned suggestions');
  console.log(`   "fixture gu" found ${results.length} prefix matches, exclusion held, one letter stays silent`);
}

console.log('');
if (CONTROL === 'avgsplit') { console.error('simNbaStatLine control: RED. The control never reached its check.'); process.exit(1); }
if (failures > 0) { console.error(`simNbaStatLine: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simNbaStatLine: green. Every target is a real line, and the blend is honest about it.');

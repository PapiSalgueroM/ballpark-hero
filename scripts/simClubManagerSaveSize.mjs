/*
 * Round 634 harness: a Club Manager save stays small, shrinks when it is not,
 * and the write says whether it happened.
 *
 * The first live report of 2026-09-13 ("Manager career doesnt save if you
 * leave the website") pointed at saveCareer, which swallowed every throw. A
 * browser out of storage for the origin, or blocking it in a private window,
 * dropped the career and the player was told nothing. Before touching it the
 * save was measured rather than assumed, and the numbers changed the round:
 *
 * MEASURED, on the shipped engine before Round 634, fifteen seasons headless
 * at three clubs of different sizes (the probe that became section 1):
 *
 *   club          day one   season 1   season 3   season 8   season 15
 *   Real Madrid    47,313    133,560    149,692    160,609    162,157
 *   Everton        43,024    124,034    139,241    162,155    164,258
 *   Lincoln City   43,255    124,758    142,379    163,528    165,659
 *
 *   per season growth after season 3, mean: 1,039 / 2,085 / 1,940 bytes
 *   biggest fields at a season's end (Everton, season 6): pairResults 48,491
 *   (reset every summer), h2h 23,045 (capped 300), world 20,844 (rebuilt
 *   every summer), squad 11,634, clubForm 11,459 (330 clubs, 5 results
 *   each), transferLog 7,603 (capped 80), resultLog 6,036 (capped 60).
 *
 * So nothing grows without bound. The two biggest ledgers were already capped
 * by earlier rounds and fill up by about season six, after which the save
 * plateaus between 162 and 166 KB. history, retiredNames, releasedNames and
 * trophies do grow every season, at under 200 bytes between them. Club
 * Manager cannot reach a 5 MB origin quota on its own; what it can do is sit
 * on an origin whose quota other saves have spent, or in a browser that
 * refuses the write, and say nothing. Round 634 therefore makes the write
 * honest (saveCareer returns whether it wrote, retries once lean, and the
 * page shows a banner while it stays refused), holds a save to the engine's
 * own caps on the way in (trimCareer, for a save written by a build before
 * the caps), and keeps this file so the plateau cannot quietly become a
 * slope.
 *
 * Sections, all on the real engine:
 *   1) Fifteen seasons at three clubs. Every club ends under SIZE_BUDGET, the
 *      least squares slope of the save size over seasons 4 to 15 is under
 *      SLOPE_CAP bytes per season (the slope, never a max), and every ledger
 *      is inside SAVE_CAPS at every season's end.
 *   2) A save inflated the way a pre cap build could have left it (2,700
 *      extra head to head rows, 720 extra transfer lines, 40 old inbox rows,
 *      20 old headlines) shrinks on load to the caps, the trim is a fixed
 *      point, and a season played from the trimmed save under a reseeded
 *      stream is identical to one played from the oversized save.
 *   3) saveCareer reports false when the store throws twice, reports true
 *      and writes the lean shape when only the first write throws, and two
 *      writes of one career are the same bytes.
 *   4) The hook, rendered: src/test/clubManagerSaveSize.test.tsx under
 *      vitest. The pagehide write, the hidden tab write, the idempotent
 *      bytes, and saveFailed up under a throwing store and down after a
 *      write lands.
 *
 * Added by the Round 634 review, which found the first repair deleting real
 * players and a money pump on the loan desk:
 *   5) Two different men with one name survive. The projected world gives one
 *      club two generated men under one name (Athletic Club three years on:
 *      Nando Hedlund ST 23 and Nando Hedlund GK 18). A career takes that job
 *      at its third summer; both must survive a save, a load and a week, and
 *      with the keeper loaned out his loan record must survive the same trip.
 *      On the real market, a loan record for a different man sharing a card's
 *      name hides nothing and refuses nothing, while one for the man himself
 *      hides him and refuses his stale card.
 *   6) The repair on a save that really carries the duplicate, built through
 *      the engine exactly as the pre 634 market allowed: a man loaned out and
 *      bought back (squad and loan desk both hold him), and the post summer
 *      shape (two copies in the squad, the loan copy in the XI). Each loads
 *      as one of him with no dangling reference, and the first plays through
 *      the summer as one of him. Plus: every man who can go out on loan at two
 *      clubs three seasons into the world is hidden from the market while he
 *      is away, which proves the identity key matches the market's own rows.
 *   7) The loan desk pump. 25 loan out and recall cycles of Florian Wirtz in
 *      one Liverpool summer net at most one loan fee; the second trip is
 *      refused with the one-a-season reason, a loan approach is refused the
 *      same way, loanOutRefusal agrees with loanOutPlayer for every man, and
 *      after the summer he can go out again.
 *   8) Every market door agrees with its reason. Over eight states (open, shut,
 *      skint, full, in talks, a released man, a man on loan, a cold club) and
 *      every card and door, a press the engine refuses always has a reason and
 *      a press it takes never does, and talks for a released man or a man on
 *      loan are refused at the door with the real reason.
 *
 * Negative controls (house rule: prove the checks can fail), each one rewrites
 * a copy of the source in memory, refuses to run unless its anchor appears
 * exactly once, and must turn exactly its own section red:
 *   SAVE_SIZE_CONTROL=uncapped    the head to head ledger loses its slice(-300).
 *                                 Section 1 must go red on the SIZE BUDGET and
 *                                 the SLOPE, not only on the ledger caps.
 *   SAVE_SIZE_CONTROL=unbounded   trimCareer returns its input untouched.
 *                                 Section 2 must go red (the oversized save
 *                                 does not shrink); section 1 measures the
 *                                 engine's own caps and stays green.
 *   SAVE_SIZE_CONTROL=silent      saveCareer's final catch reports true, the
 *                                 pre 634 swallow. Section 3 must go red.
 *   SAVE_SIZE_CONTROL=noleave     the hook's pagehide listener is gone.
 *                                 Section 4 must go red on the pagehide test.
 *   SAVE_SIZE_CONTROL=namekey     sameManKey is the bare name again, the first
 *                                 634 repair. Section 5 must go red.
 *   SAVE_SIZE_CONTROL=norepair    ensureOneOfEach does nothing. Section 6.
 *   SAVE_SIZE_CONTROL=pump        loanOutPlayer forgets the one-a-season rule.
 *                                 Section 7.
 *   SAVE_SIZE_CONTROL=deaddoor    doorRefusal never gives a reason, the dead
 *                                 button. Section 8.
 *
 * Fences, from headroom measured over six streams (the default and SIM_SEED 1
 * to 5, three clubs each, 18 careers) on the healthy engine, against the
 * defect the review measured with the head to head cap removed:
 *   SLOPE_CAP 2,000 bytes a season. Healthy: 249 to 1,178 (Real Madrid 249 to
 *     973, Everton 913 to 1,178, Lincoln City 854 to 1,049). Uncapped, as the
 *     control measures it on the default stream: Real Madrid 3,052, Everton
 *     4,376, Lincoln City 4,408 (the review measured 4,477).
 *   SIZE_BUDGET 180,000 bytes at season 15. Healthy: 159,782 to 165,718.
 *     Uncapped: Real Madrid 190,088, Everton 200,065, Lincoln City 200,568
 *     (the review measured 198,436).
 * The first cut of this file set 5,000 and 240,000 by feel, and both passed
 * the uncapped engine, which is exactly the mistake the house rule names.
 *
 * Nothing here reads dist or the clock, so it is safe to run between builds.
 * The noleave control writes a hook copy under dist/ (vite refuses a module
 * outside the root) and removes it again, so do not run that control while a
 * build is emptying dist.
 *
 * Run: node scripts/simClubManagerSaveSize.mjs
 */
import './lib/seedRandom.mjs';
import { execSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/cmSaveSize.entry.mjs`;
const BUNDLE = `${TMP}/cmSaveSize.bundle.mjs`;

/* Measured ranges beside each, see the header. */
const SIZE_BUDGET = 180_000;   // healthy 159,782 to 165,718; head to head uncapped 190,088 to 200,568
const SLOPE_CAP = 2_000;       // healthy 249 to 1,178 bytes a season; uncapped 3,052 to 4,408
const CLUBS = ['Real Madrid', 'Everton', 'Lincoln City'];
const SEASONS = 15;
const SAVE_KEY = 'dukb-club-manager-save';

const CONTROL = process.env.SAVE_SIZE_CONTROL || '';
/* The section each control must turn red, and nothing else. */
const OWN = { uncapped: 1, unbounded: 2, silent: 3, noleave: 4, namekey: 5, norepair: 6, pump: 7, deaddoor: 8 };
if (CONTROL && !(CONTROL in OWN)) {
  console.error(`SAVE_SIZE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(OWN).join(', ')})`);
  process.exit(1);
}

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(1); };
/* Exactly once, or the control refuses to run: an anchor that matches nothing
   changes nothing, and one that matches twice may change the wrong thing. */
const swap = (src, from, to, where) => {
  const n = src.split(from).length - 1;
  if (n !== 1) {
    console.error(`control cannot run: ${where} appears ${n} times in the shape SAVE_SIZE_CONTROL=${CONTROL} rewrites, not once`);
    console.error(`  looked for: ${JSON.stringify(from)}`);
    process.exit(1);
  }
  return src.replace(from, () => to);
};

/* A worktree resolves imports by walking up to the main tree's node_modules,
   but a shell spawning a fixed path does not, so the binaries are found the
   same way the imports are. */
function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p) || fs.existsSync(p + '.cmd')) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  abort(`could not find ${rel} above ${ROOT}`);
}
const ESBUILD = findUp(path.join('node_modules', '.bin', 'esbuild'));
const VITEST = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));

/* ---------- the engine, with a control's rewrite where asked ---------- */
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
const TRIM_HEAD = 'export function trimCareer(state: CareerState): CareerState {\n  if (!state || typeof state !== \'object\') return state;\n';
const TRIM_NOOP = 'export function trimCareer(state: CareerState): CareerState {\n  return state;\n';
const SAVE_TAIL = '    localStorage.setItem(SAVE_KEY, JSON.stringify(leanCareer(full)));\n    return true;\n  } catch {\n    return false;\n  }\n}\n';
const SAVE_LIES = '    localStorage.setItem(SAVE_KEY, JSON.stringify(leanCareer(full)));\n    return true;\n  } catch {\n    return true;\n  }\n}\n';
const ENGINE_SWAPS = {
  unbounded: [TRIM_HEAD, TRIM_NOOP, 'trimCareer'],
  silent: [SAVE_TAIL, SAVE_LIES, 'the final catch of saveCareer'],
  uncapped: ['  state.h2h = h2hLog.slice(-300);\n', '  state.h2h = h2hLog;\n', 'the head to head slice'],
  namekey: ['  return `${p.name}|${p.position}|${p.age}`;\n', '  return p.name;\n', 'the body of sameManKey'],
  norepair: [
    'export function ensureOneOfEach(state: CareerState): void {\n  if (!Array.isArray(state.squad)) return;\n',
    'export function ensureOneOfEach(state: CareerState): void {\n  return;\n  if (!Array.isArray(state.squad)) return;\n',
    'the head of ensureOneOfEach',
  ],
  pump: [
    '  if (p.loanOutSeason === career.season) return null;\n  const pool = buyerPool(career);\n',
    '  const pool = buyerPool(career);\n',
    'the one-a-season line in loanOutPlayer',
  ],
  deaddoor: [
    'export function doorRefusal(career: CareerState, mp: MarketPlayer, door: MarketDoor): string | null {\n',
    'export function doorRefusal(career: CareerState, mp: MarketPlayer, door: MarketDoor): string | null {\n  return null;\n',
    'the head of doorRefusal',
  ],
};
if (CONTROL in ENGINE_SWAPS) {
  let engine = readLF(`${ROOT}/src/lib/clubManager.ts`);
  const [from, to, where] = ENGINE_SWAPS[CONTROL];
  engine = swap(engine, from, to, `clubManager.ts (${where})`);
  const copy = `${TMP}/cmSaveSize.control.engine.ts`;
  fs.writeFileSync(copy, engine);
  enginePath = copy;
  console.log(`NEGATIVE CONTROL ON: SAVE_SIZE_CONTROL=${CONTROL}, the engine is a rewritten copy`);
}

fs.writeFileSync(ENTRY, `
let slot = {};
globalThis.localStorage = {
  getItem: k => (k in slot ? slot[k] : null),
  setItem: (k, v) => { slot[k] = String(v); },
  removeItem: k => { delete slot[k]; },
  clear: () => { slot = {}; },
};
export const cm = await import('${enginePath}');
`);
execSync(
  `"${ESBUILD}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer,
  trimCareer, leanCareer, SAVE_CAPS, sortedTable,
  buildMarket, buyPlayer, payClause, loanIn, startNegotiation, doorRefusal, signingRefusal,
  loanOutPlayer, recallLoanedPlayer, loanOutRefusal, loanOutFee, acceptBid,
  releasePlayer, canLeaveSquad, sameManKey, releaseClauseOf, loanEligible,
} = cm;
for (const [name, fn] of Object.entries({
  startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer, trimCareer, leanCareer, sortedTable,
  buildMarket, buyPlayer, payClause, loanIn, startNegotiation, doorRefusal, signingRefusal,
  loanOutPlayer, recallLoanedPlayer, loanOutRefusal, loanOutFee, acceptBid, releasePlayer, canLeaveSquad, sameManKey,
  releaseClauseOf, loanEligible,
})) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}
if (!SAVE_CAPS || typeof SAVE_CAPS.h2h !== 'number') abort('SAVE_CAPS is not exported in the shape this harness expects');

const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
/* Which kind of check fired, per section, so a control can prove it was the
   numeric fence that caught it and not a neighbouring check. */
const tags = {};
let section = 1;
const fail = (m, tag = 'check') => {
  failures[section] += 1;
  (tags[section] ??= new Set()).add(tag);
  console.error('  FAIL: ' + m);
};
const bytes = s => JSON.stringify(s).length;

/** The seeded stream from scripts/lib/seedRandom.mjs, re-rootable, so two
    arms can be walked on one stream. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nudges = 0;
function playSeason(s) {
  for (let guard = 0; guard < 130; guard++) {
    /* The board is not what this file measures: a career that ends in a sack
       is a career whose size stops being measured, so the manager keeps his
       job by fiat and the count of times that took is printed. */
    if (s.boardConfidence < 35) { s = { ...s, boardConfidence: 55 }; nudges += 1; }
    const res = playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver') return s;
    if (s.sacked) return s;
  }
  throw new Error('a season never ended in 130 entries');
}

function capsOk(s, label) {
  const checks = [
    ['h2h', (s.h2h ?? []).length, SAVE_CAPS.h2h],
    ['transferLog', (s.transferLog ?? []).length, SAVE_CAPS.transferLog],
    ['resultLog', (s.resultLog ?? []).length, SAVE_CAPS.resultLog],
    ['inbox', (s.inbox ?? []).length, SAVE_CAPS.inbox],
    ['aiHeadlines', (s.aiHeadlines ?? []).length, SAVE_CAPS.aiHeadlines],
  ];
  let ok = true;
  for (const [k, n, cap] of checks) {
    if (n > cap) { fail(`${label}: ${k} holds ${n} entries, over its cap of ${cap}`, 'caps'); ok = false; }
  }
  return ok;
}

function slopeOf(points) {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = points.reduce((a, p) => a + p[1], 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of points) { num += (x - mx) * (y - my); den += (x - mx) * (x - mx); }
  return den ? num / den : 0;
}

/* ================================================================== */
console.log(`1) Fifteen seasons at three clubs: under ${SIZE_BUDGET} bytes, slope under ${SLOPE_CAP} bytes a season, every ledger inside its cap`);
/* ================================================================== */
section = 1;
let snapForSection2 = null;
let snapForSection3 = null;
for (const club of CLUBS) {
  let s = startCareer(club);
  const sizes = [bytes(s)];
  let reached = 0;
  for (let season = 1; season <= SEASONS; season++) {
    s = playSeason(s);
    if (s.sacked) { fail(`${club}: sacked in season ${season} despite the nudge, so the run stopped early`); break; }
    const fin = finishSeason(s).state;
    sizes.push(bytes(fin));
    capsOk(fin, `${club} season ${season}`);
    reached = season;
    if (club === 'Everton' && season === 2) snapForSection2 = JSON.parse(JSON.stringify(fin));
    /* Section 3 measures the lean retry where it cuts: by season fifteen the
       head to head holds its 300 and many opponents have well over six rows.
       On a season two save it is a no-op (at most five per opponent), which
       is correct and proves nothing about the retry. */
    if (club === 'Everton' && season === SEASONS) snapForSection3 = JSON.parse(JSON.stringify(fin));
    s = startNextSeason(fin);
  }
  const last = sizes[sizes.length - 1];
  const pts = sizes.map((b, i) => [i, b]).filter(([i]) => i >= 4);
  const slope = pts.length >= 3 ? slopeOf(pts) : NaN;
  console.log(`   ${club.padEnd(13)} seasons ${reached}, day one ${sizes[0]}, season 1 ${sizes[1] ?? '-'}, season ${reached} ${last}, slope after season 3 ${Number.isFinite(slope) ? slope.toFixed(0) : 'n/a'} bytes a season`);
  console.log(`   ${''.padEnd(13)} sizes: ${sizes.join(' ')}`);
  if (reached < SEASONS) fail(`${club}: only ${reached} of ${SEASONS} seasons were measured`, 'short');
  if (last > SIZE_BUDGET) fail(`${club}: the save is ${last} bytes after ${reached} seasons, over the ${SIZE_BUDGET} budget`, 'budget');
  if (!Number.isFinite(slope)) fail(`${club}: not enough seasons to fit a slope`, 'short');
  else if (slope > SLOPE_CAP) fail(`${club}: the save grows ${slope.toFixed(0)} bytes a season over seasons 4 to ${reached}, over the ${SLOPE_CAP} cap`, 'slope');
}
console.log(`   board nudges over the whole run: ${nudges}`);
if (!snapForSection2) abort('section 1 never reached Everton season 2, so section 2 has nothing to inflate');
if (!snapForSection3) abort(`section 1 never reached Everton season ${SEASONS}, so section 3 has no save to measure the lean retry on`);

/* ================================================================== */
console.log('2) An oversized pre 634 save shrinks on load, the trim is a fixed point, and the next season plays the same');
/* ================================================================== */
section = 2;
{
  const s2 = snapForSection2;
  const h2h = s2.h2h ?? [];
  const log = s2.transferLog ?? [];
  if (h2h.length < 20) fail(`the season 2 snapshot holds only ${h2h.length} head to head rows, so the inflation is not measuring the ledger`);
  if (log.length < 5) fail(`the season 2 snapshot holds only ${log.length} transfer lines, so the inflation is not measuring the feed`);
  const oldH2h = Array.from({ length: 2700 }, (_, i) => ({ ...h2h[i % Math.max(1, h2h.length)], season: 0 }));
  const oldLog = Array.from({ length: 720 }, (_, i) => ({ ...log[i % Math.max(1, log.length)], season: 0, week: i % 50 }));
  const oldInbox = Array.from({ length: 40 }, (_, i) => ({ id: `old-${i}`, playerName: 'Nobody', playerId: 'old', kind: 'praise', text: 'an old note', options: [], week: 0, resolved: 'done' }));
  const oldHeads = Array.from({ length: 20 }, (_, i) => `an old headline ${i}`);
  const big = {
    ...s2,
    h2h: [...oldH2h, ...h2h],
    transferLog: [...oldLog, ...log],
    inbox: [...(s2.inbox ?? []), ...oldInbox],
    aiHeadlines: [...s2.aiHeadlines, ...oldHeads],
  };
  const bigBytes = bytes(big);
  /* Written straight to the slot, the way a build without the trim would
     have left it, not through saveCareer. */
  localStorage.setItem(SAVE_KEY, JSON.stringify(big));
  const back = loadCareer();
  if (!back) fail('the oversized save did not load at all');
  else {
    const backBytes = bytes(back);
    console.log(`   season 2 save ${bytes(s2)} bytes, inflated to ${bigBytes}, loaded back as ${backBytes}`);
    console.log(`   ledgers after load: h2h ${(back.h2h ?? []).length}, transferLog ${(back.transferLog ?? []).length}, inbox ${(back.inbox ?? []).length}, aiHeadlines ${(back.aiHeadlines ?? []).length}`);
    if (!capsOk(back, 'the loaded save')) { /* counted inside */ }
    if (backBytes > bigBytes - 100_000) fail(`the load shrank the save by only ${bigBytes - backBytes} bytes; the inflation was over 200 KB`);
    const tailOk = JSON.stringify((back.h2h ?? []).slice(-h2h.length)) === JSON.stringify(h2h);
    if (!tailOk) fail('the trim did not keep the newest head to head rows');
    if (trimCareer(back) !== back) fail('trimCareer is not a fixed point on a save it has already trimmed');
    /* And it must not have thrown away what the engine wrote: a save that
       fits the caps must come back with the same ledgers it went in with. */
    localStorage.setItem(SAVE_KEY, JSON.stringify(s2));
    const same = loadCareer();
    if (!same || (same.h2h ?? []).length !== h2h.length || (same.transferLog ?? []).length !== log.length) fail('a save inside the caps lost ledger rows on load');

    /* The replay: one season from each arm on one reseeded stream. */
    const project = s => ({
      season: s.season, week: s.week, budget: s.budget, boardConfidence: s.boardConfidence,
      table: sortedTable(s.table),
      resultLog: s.resultLog ?? [],
      squad: s.squad.map(p => [p.id, p.rating, p.seasonGoals, p.seasonAssists, p.contractYears]),
      trophies: s.trophies, careerStats: s.careerStats,
      h2hTail: (s.h2h ?? []).slice(-60),
    });
    const arm = (start, seed) => {
      Math.random = seeded(seed);
      let s = JSON.parse(JSON.stringify(start));
      for (let guard = 0; guard < 130; guard++) {
        const res = playNextEntry(s, { skipHalftime: true });
        s = res.state;
        if (res.kind === 'seasonOver' || s.sacked) break;
      }
      return finishSeason(s).state;
    };
    const fromTrimmed = project(arm(back, 634));
    const fromBig = project(arm(big, 634));
    const identical = JSON.stringify(fromTrimmed) === JSON.stringify(fromBig);
    console.log(`   a season from the trimmed save and from the oversized one, same seed: ${identical ? 'identical' : 'DIFFERENT'} (table, results, squad, budget, board, trophies, career stats)`);
    if (!identical) {
      for (const k of Object.keys(fromTrimmed)) {
        if (JSON.stringify(fromTrimmed[k]) !== JSON.stringify(fromBig[k])) console.log(`     differs in ${k}`);
      }
      fail('the trimmed save does not play the same season as the oversized one');
    }
  }
}

/* ================================================================== */
console.log('3) saveCareer says whether it wrote: false when refused twice, lean and true when refused once, same bytes twice');
/* ================================================================== */
section = 3;
{
  /* The fifteen season save, where the lean shape actually cuts. */
  const s = snapForSection3;
  const fullBytes = bytes(trimCareer(s));
  const perOppOf = h2h => {
    const m = new Map();
    for (const h of h2h ?? []) m.set(h.opp, (m.get(h.opp) ?? 0) + 1);
    return Math.max(0, ...m.values());
  };
  console.log(`   the season 15 save: ${fullBytes} bytes, h2h ${(s.h2h ?? []).length} rows, at most ${perOppOf(s.h2h)} per opponent`);
  if (perOppOf(s.h2h) <= 6) fail('the season 15 save has no opponent met more than six times, so the lean retry cannot be measured on it');
  const working = globalThis.localStorage;
  const calls = [];
  globalThis.localStorage = {
    getItem: () => null,
    setItem: (k, v) => { calls.push(v.length); throw new Error('QuotaExceededError (stubbed)'); },
    removeItem: () => {},
  };
  const refused = saveCareer(s);
  console.log(`   store throws on every write: saveCareer returned ${refused} after ${calls.length} attempts (${calls.join(', ')} bytes)`);
  if (refused !== false) fail(`saveCareer reported ${refused} when the store refused every write`);
  if (calls.length !== 2) fail(`expected exactly two attempts (full, then lean), saw ${calls.length}`);
  if (calls.length === 2 && !(calls[1] < calls[0])) fail(`the retry was not smaller than the first attempt (${calls[1]} vs ${calls[0]})`);

  let stored = null;
  let n = 0;
  globalThis.localStorage = {
    getItem: () => stored,
    setItem: (k, v) => { n += 1; if (n === 1) throw new Error('QuotaExceededError (stubbed)'); stored = v; },
    removeItem: () => { stored = null; },
  };
  const retried = saveCareer(s);
  const lean = stored ? JSON.parse(stored) : null;
  const maxPerOpp = perOppOf(lean?.h2h);
  console.log(`   store throws once: saveCareer returned ${retried}, wrote ${stored?.length ?? 0} bytes (${fullBytes - (stored?.length ?? 0)} fewer), h2h ${lean?.h2h?.length ?? 0} rows, at most ${maxPerOpp} per opponent`);
  if (retried !== true) fail(`saveCareer reported ${retried} when the retry landed`);
  if (!stored) fail('nothing was written by the retry');
  if (maxPerOpp > 6) fail(`the retry did not write the lean shape: ${maxPerOpp} rows for one opponent`);
  if (stored && stored.length >= fullBytes) fail('the lean write was not smaller than the full one');
  if (stored && stored !== JSON.stringify(leanCareer(trimCareer(s)))) fail('the retry wrote something other than leanCareer(trimCareer(career))');

  globalThis.localStorage = working;
  const okA = saveCareer(s);
  const a = localStorage.getItem(SAVE_KEY);
  const okB = saveCareer(s);
  const b = localStorage.getItem(SAVE_KEY);
  console.log(`   working store: ${okA} then ${okB}, ${a?.length} bytes then ${b?.length}, identical ${a === b}, equal to the trimmed career ${a === JSON.stringify(trimCareer(s))}`);
  if (okA !== true || okB !== true) fail('a working store was reported as refused');
  if (a !== b) fail('two writes of one career were different bytes');
  if (a !== JSON.stringify(trimCareer(s))) fail('the full write is not trimCareer(career)');
}

/* ================================================================== */
console.log('4) The hook, rendered: the pagehide write, the hidden tab write, the same bytes, and saveFailed');
/* ================================================================== */
section = 4;
const TEST = 'src/test/clubManagerSaveSize.test.tsx';
const LISTEN_ON = "    window.addEventListener('pagehide', write);\n";
const LISTEN_OFF = "      window.removeEventListener('pagehide', write);\n";
let hookCopyDir = null;
const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
if (CONTROL === 'noleave') {
  let hook = readLF(path.join(ROOT, 'src/hooks/useClubManager.ts'));
  hook = swap(hook, LISTEN_ON, '', 'useClubManager.ts (the pagehide listener)');
  hook = swap(hook, LISTEN_OFF, '', 'useClubManager.ts (the pagehide removal)');
  hookCopyDir = path.join(ROOT, 'dist', '.cm-save-size-control');
  fs.mkdirSync(hookCopyDir, { recursive: true });
  const hookCopy = path.join(hookCopyDir, 'useClubManager.control.ts');
  fs.writeFileSync(hookCopy, hook);
  env.CM_HOOK = hookCopy.replaceAll('\\', '/');
  console.log('   NEGATIVE CONTROL ON: the test runs against a copy of the hook with no pagehide listener');
}
let run;
try {
  run = spawnSync(process.execPath, [VITEST, 'run', TEST], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} finally {
  if (hookCopyDir) fs.rmSync(hookCopyDir, { recursive: true, force: true });
}
const ESC = String.fromCharCode(27);
const raw = (run.stdout || '') + (run.stderr || '');
const out = raw.split(new RegExp(ESC + '\\[[0-9;]*m', 'g')).join('');
if (!out.includes('clubManagerSaveSize.test.tsx')) {
  abort('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-2000));
}
for (const line of out.split('\n')) {
  if (/^ {2}\S/.test(line) && !line.includes('stdout |')) { console.log('  ' + line.trimEnd()); continue; }
  if (/(Test Files|Tests) +\d/.test(line)) console.log('   ' + line.trim());
  if (/AssertionError/.test(line)) console.log('   ' + line.trim());
}
if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) {
  abort('the test file (or the hook it imports) did not load:\n' + out.slice(-2000));
}
const pagehideRed = /[x×].*pagehide writes the career held in memory/.test(out);
const hiddenGreen = /[✓v].*the tab going hidden writes it too/.test(out);
if (CONTROL === 'noleave') {
  console.log(`   control: the pagehide check went red ${pagehideRed}, the hidden tab check is still green ${hiddenGreen}`);
  if (!pagehideRed) fail('the control did not make the pagehide test fail, so that check is unproven');
  if (!hiddenGreen) fail('the control took the hidden tab check down with it, so the two are not measuring different listeners');
}
if (run.status !== 0) fail('the rendered tests failed (vitest exit ' + run.status + '); the output is above');

/* A season to its summer, for the sections below. */
function toSummer(s, move) {
  const played = playSeason(s);
  if (played.sacked) return null;
  return startNextSeason(finishSeason(played).state, move);
}

/* ================================================================== */
console.log('5) Two different men with one name both survive a save, a load and a week, and a loan record for one of them survives too');
/* ================================================================== */
section = 5;
const PAIR_CLUB = 'Athletic Club';
const PAIR_NAME = 'Nando Hedlund';
let rmSeason3 = null;
let pairState = null;
{
  /* The review's repro, as a player would reach it: three summers at Real
     Madrid, the third one taking the job at a club whose projected roster
     three years on carries two generated men under one name. */
  let s = startCareer('Real Madrid');
  for (let season = 1; season <= 3 && s; season++) {
    s = toSummer(s, season === 3 ? PAIR_CLUB : undefined);
    if (season === 2) rmSeason3 = s;
  }
  const pairOf = st => (st?.squad ?? []).filter(p => p.name === PAIR_NAME);
  const pair = pairOf(s);
  console.log(`   Real Madrid for three seasons, then ${s?.clubName} at season ${s?.season}: squad ${s?.squad.length}, ${PAIR_NAME} x${pair.length} (${pair.map(p => `${p.id} ${p.position} ${p.age} r${p.rating}`).join(' | ')})`);
  if (!s || s.clubName !== PAIR_CLUB) fail(`the third summer did not land at ${PAIR_CLUB}, so the pair was never reached`);
  else if (pair.length !== 2) fail(`${PAIR_CLUB}'s squad no longer carries two ${PAIR_NAME}s (found ${pair.length}); re-derive the pair from the projected world rather than deleting this check`);
  else {
    pairState = s;
    if (new Set(pair.map(p => p.id)).size !== 2) fail('the two men share one id');
    if (sameManKey(pair[0]) === sameManKey(pair[1])) fail('sameManKey cannot tell the two men apart');
    const size = s.squad.length;
    saveCareer(s);
    const back = loadCareer();
    const week = back ? playNextEntry(back, { skipHalftime: true }).state : null;
    const nBack = pairOf(back).length;
    const nWeek = pairOf(week).length;
    console.log(`   saved and loaded: squad ${back?.squad.length}, the pair x${nBack}; a week later: squad ${week?.squad.length}, the pair x${nWeek}`);
    if (!back) fail('the career carrying the pair did not load');
    else {
      if (nBack !== 2) fail(`the load left ${nBack} of the two men`);
      if (back.squad.length !== size) fail(`the load changed the squad from ${size} to ${back.squad.length}`);
      if (nWeek !== 2) fail(`a week after the load ${nWeek} of the two men are left`);
    }
    /* One of them out on loan: the keeper. */
    const gk = pair.find(p => p.position === 'GK') ?? pair[1];
    const other = pair.find(p => p !== gk);
    const out = loanOutPlayer(s, gk.id, 'Elsewhere', 1);
    if (!out) fail(`${PAIR_NAME} the ${gk.position} could not be loaned out: ${loanOutRefusal(s, gk.id)}`);
    else {
      saveCareer(out);
      const ob = loadCareer();
      const ow = ob ? playNextEntry(ob, { skipHalftime: true }).state : null;
      const recOf = st => (st?.loanedOut ?? []).filter(l => l.player.id === gk.id).length;
      const otherIn = st => (st?.squad ?? []).some(p => p.id === other.id);
      console.log(`   the ${gk.position} out on loan: his loan record after the load ${recOf(ob)}, after a week ${recOf(ow)}; the ${other.position} still in the squad ${otherIn(ob)} and ${otherIn(ow)}`);
      if (recOf(ob) !== 1) fail('the loan record did not survive the load');
      if (recOf(ow) !== 1) fail('the loan record did not survive a week');
      if (!otherIn(ob) || !otherIn(ow)) fail(`the ${other.position} who shares his name left the squad`);
    }
  }

  /* The identity on the real market: a card, a loan record that is a
     different man with the card's name, then one that is the man himself.
     signingRefusal rather than doorRefusal, so the deaddoor control (which
     guts doorRefusal) cannot reach this section. */
  const base = startCareer('Real Madrid');
  const card = buildMarket(base).find(m => m.price <= base.budget && m.rating < 85);
  const twin = { ...base.squad[0], id: 'twin-probe', name: card.name, position: card.position === 'GK' ? 'ST' : 'GK', age: card.age + 5 };
  const same = { ...twin, position: card.position, age: card.age };
  const withLoan = man => ({ ...base, loanedOut: [...(base.loanedOut ?? []), { player: man, club: 'Elsewhere', fee: 1, season: base.season }] });
  const listed = st => buildMarket(st).some(m => sameManKey(m) === sameManKey(card));
  const awayWhy = st => /out on loan/.test(signingRefusal(st, card, card.price) ?? '');
  const tw = withLoan(twin);
  const sm = withLoan(same);
  const twBought = !!buyPlayer(tw, card);
  const smBought = !!buyPlayer({ ...sm, budget: 1e6 }, card);
  console.log(`   ${card.name} (${card.position} ${card.age}): with a different man of that name on loan, listed ${listed(tw)}, refused as away ${awayWhy(tw)}, bought ${twBought}; with the man himself on loan, listed ${listed(sm)}, refused as away ${awayWhy(sm)}, bought ${smBought}`);
  if (!listed(tw)) fail('a different man sharing a loaned man\'s name was hidden from the market');
  if (awayWhy(tw)) fail('a different man sharing a loaned man\'s name was refused as if he were out on loan');
  if (!twBought) fail('a different man sharing a loaned man\'s name could not be bought');
  if (listed(sm)) fail('the loaned man himself is still on the market');
  if (!awayWhy(sm)) fail('the loaned man\'s stale card is not refused with the out on loan reason');
  if (smBought) fail('a stale card bought back a man out on loan');
}

/* ================================================================== */
console.log('6) The repair, on saves that really carry the duplicate the pre 634 market made');
/* ================================================================== */
section = 6;
{
  const base = startCareer('Real Madrid');
  const him = base.squad.find(p => !p.isYouth && p.rating < 80 && p.age < 27 && canLeaveSquad(base, p));
  const out = him ? loanOutPlayer(base, him.id, 'Sevilla', 1) : null;
  /* The pre 634 market: the same world with the loan record out of sight,
     which listed him at my own club. */
  const card = out ? buildMarket({ ...out, loanedOut: [] }).find(m => m.name === him.name) : null;
  if (!out || !card) fail(`could not rebuild the pre 634 round trip for ${him?.name} (loan out ${!!out}, card ${!!card})`);
  else {
    console.log(`   ${him.name} (${him.position} ${him.age}) out on loan; the pre 634 market listed him at ${card.club} for ${card.price} as ${card.position} ${card.age}`);
    if (sameManKey(card) !== sameManKey(him)) fail(`the market card (${sameManKey(card)}) and the squad row (${sameManKey(him)}) disagree, so the identity would miss the round trip`);
    const bought = buyPlayer({ ...out, loanedOut: [], budget: Math.max(out.budget, card.price + 1) }, card);
    if (!bought) fail('the pre 634 buy back could not be rebuilt');
    else {
      const count = st => ({
        squad: st.squad.filter(p => sameManKey(p) === sameManKey(him)).length,
        away: (st.loanedOut ?? []).filter(l => sameManKey(l.player) === sameManKey(him)).length,
      });
      /* A: in season, the squad and the loan desk both hold him. */
      const dupA = { ...bought, loanedOut: out.loanedOut };
      const a0 = count(dupA);
      localStorage.setItem(SAVE_KEY, JSON.stringify(dupA));
      const a = loadCareer();
      const a1 = a ? count(a) : null;
      const summer = a ? toSummer(a) : null;
      const a2 = summer ? summer.squad.filter(p => p.name === him.name).length : null;
      console.log(`   in season shape: squad ${a0.squad} and away ${a0.away} before the load, squad ${a1?.squad} and away ${a1?.away} after it, ${a2} of him in the squad after the summer`);
      if (a0.squad !== 1 || a0.away !== 1) fail('the in season duplicate was not rebuilt the way it happened');
      if (!a) fail('the in season duplicate did not load');
      else if (a1.squad !== 1 || a1.away !== 0) fail(`the load left ${a1.squad} in the squad and ${a1.away} away`);
      if (!summer) fail('the in season duplicate never reached the summer');
      else if (a2 !== 1) fail(`after the summer he is in the squad ${a2} times`);
      /* B: after the summer, as the pre 634 engine left it: both copies in
         the squad, the loan copy in the XI and the bought copy on penalties. */
      const loanCopy = { ...out.loanedOut.find(l => l.player.id === him.id).player, onLoan: undefined };
      const boughtCopy = bought.squad.find(p => p.name === him.name && p.id !== loanCopy.id);
      const dupB = {
        ...bought,
        loanedOut: [],
        squad: [...bought.squad, loanCopy],
        xiIds: bought.xiIds.map((id, i) => (i === 0 ? loanCopy.id : id)),
        setPieces: { ...(bought.setPieces ?? {}), penalties: boughtCopy.id },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(dupB));
      const b = loadCareer();
      const b1 = b ? count(b) : null;
      const kept = b ? b.squad.find(p => sameManKey(p) === sameManKey(him)) : null;
      const ids = new Set((b?.squad ?? []).map(p => p.id));
      const dangling = b ? b.xiIds.filter(id => id && !ids.has(id)) : [];
      const spDangling = b ? Object.values(b.setPieces ?? {}).filter(id => id && !ids.has(id)) : [];
      const bw = b ? playNextEntry(b, { skipHalftime: true }).state : null;
      console.log(`   post summer shape: ${count(dupB).squad} copies before the load, ${b1?.squad} after (kept ${kept?.id}, the XI copy is ${loanCopy.id}), dangling XI ids ${dangling.length}, dangling set piece ids ${spDangling.length}, ${bw ? count(bw).squad : '-'} a week later`);
      if (count(dupB).squad !== 2) fail('the post summer duplicate was not rebuilt with two copies');
      if (!b) fail('the post summer duplicate did not load');
      else {
        if (b1.squad !== 1) fail(`the load left ${b1.squad} copies of him`);
        if (kept && kept.id !== loanCopy.id) fail('the repair kept the copy that was not in the XI');
        if (dangling.length) fail(`the XI names ids nobody holds: ${dangling.join(', ')}`);
        if (spDangling.length) fail(`a set piece job names an id nobody holds: ${spDangling.join(', ')}`);
        if (bw && count(bw).squad !== 1) fail('a week after the load there are two of him again');
      }
    }
  }

  /* The identity against the market's own rows: every man who can go out on
     loan, one at a time, at two clubs three seasons into the world, must be
     off the market while he is away. If a squad row and its market row ever
     disagreed on position or age, the man would be listed here. */
  const where = [rmSeason3, pairState].filter(Boolean);
  let swept = 0;
  const leaks = [];
  for (const st of where) {
    for (const p of st.squad) {
      if (!canLeaveSquad(st, p)) continue;
      const o = loanOutPlayer(st, p.id, 'Elsewhere', 1);
      if (!o) continue;
      swept += 1;
      const leak = buildMarket(o).find(m => m.name === p.name && m.position === p.position && Math.abs(m.age - p.age) <= 1);
      if (leak) leaks.push(`${p.name} ${p.position} ${p.age} is listed at ${leak.club} as ${leak.position} ${leak.age}`);
    }
  }
  console.log(`   ${swept} men sent out on loan one at a time at ${where.map(s => `${s.clubName} season ${s.season}`).join(' and ')}: ${leaks.length} still listed while away`);
  if (where.length < 2) fail('section 5 did not hand over both careers, so the sweep covers less than it says');
  if (swept < 20) fail(`only ${swept} men could be sent out, so the sweep is not measuring the squad`);
  for (const l of leaks.slice(0, 6)) fail(`the market still lists a man out on loan: ${l}`);
}

/* ================================================================== */
console.log('7) The loan desk is not a money pump: one loan out a season');
/* ================================================================== */
section = 7;
{
  const s0 = startCareer('Liverpool');
  const star = s0.squad.find(p => p.name === 'Florian Wirtz')
    ?? [...s0.squad].filter(p => canLeaveSquad(s0, p) && p.position !== 'GK').sort((a, b) => b.rating - a.rating)[0];
  if (star.name !== 'Florian Wirtz') console.log(`   Florian Wirtz is not in the Liverpool squad any more, measuring ${star.name}`);
  const fee = loanOutFee(star);
  let s = s0;
  let cycles = 0;
  let refusedAt = -1;
  let refusal = null;
  for (let i = 0; i < 25; i++) {
    const me = s.squad.find(p => p.name === star.name);
    if (!me) { fail(`${star.name} left the squad during the probe`); break; }
    const out = loanOutPlayer(s, me.id);
    if (!out) { refusedAt = i; refusal = loanOutRefusal(s, me.id); break; }
    const back = recallLoanedPlayer(out, me.id);
    if (!back) { fail(`the recall of ${star.name} was refused on cycle ${i + 1}`); break; }
    s = back;
    cycles += 1;
  }
  const net = Math.round((s.budget - s0.budget) * 10) / 10;
  console.log(`   ${star.name} at Liverpool, budget ${s0.budget}m: ${cycles} of 25 loan out and recall cycles went through, net ${net >= 0 ? '+' : ''}${net}m (one loan fee is ${fee}m), refused on attempt ${refusedAt + 1}: ${JSON.stringify(refusal)}`);
  if (cycles > 1) fail(`${cycles} loan out and recall cycles went through in one window`, 'pump');
  if (net > fee + 0.05) fail(`the loan desk netted ${net}m in one window, more than one loan fee of ${fee}m`, 'pump');
  if (refusedAt !== 1) fail(`the second trip was not the one refused (refused at attempt ${refusedAt + 1})`);
  if (!/once this season/.test(refusal ?? '')) fail(`the refusal does not give the one-a-season reason: ${JSON.stringify(refusal)}`);
  /* A loan approach goes through the same door. */
  const me = s.squad.find(p => p.name === star.name);
  if (me) {
    const withBid = { ...s, incomingBids: [{ playerId: me.id, playerName: me.name, club: 'Sevilla', offer: fee, status: 'open', loan: true }] };
    const sent = acceptBid(withBid, me.id) !== null;
    console.log(`   a loan approach for him after the recall: ${sent ? 'SENT HIM OUT AGAIN' : 'refused'}`);
    if (sent) fail('a loan approach sent him out a second time in one season', 'pump');
  }
  /* The reason and the engine agree for every man, open window and shut. */
  let checked = 0;
  const disagree = [];
  for (const st of [s0, s, { ...s0, transferWindow: null }]) {
    for (const p of st.squad) {
      checked += 1;
      const sends = loanOutPlayer(st, p.id) !== null;
      const why = loanOutRefusal(st, p.id);
      if (sends === (why !== null)) disagree.push(`${p.name}: the engine ${sends ? 'sends him' : 'refuses'}, the reason is ${JSON.stringify(why)}`);
    }
  }
  console.log(`   loanOutRefusal against loanOutPlayer: ${checked} men over three states, ${disagree.length} disagreements`);
  for (const d of disagree.slice(0, 6)) fail(`the loan desk's reason and the engine disagree: ${d}`);
  /* A season, not a life sentence. */
  const next = toSummer(s);
  const again = next ? next.squad.find(p => p.name === star.name) : null;
  if (!next) fail('the probe career never reached the summer');
  else if (!again) fail(`${star.name} left over the summer, so the next season's loan could not be measured; pick another man`);
  else {
    const o = loanOutPlayer(next, again.id);
    console.log(`   after the summer, season ${next.season}: he can go out on loan again ${!!o}`);
    if (!o) fail(`after the summer ${star.name} still cannot go out on loan: ${loanOutRefusal(next, again.id)}`);
  }
}

/* ================================================================== */
console.log('8) Every market door agrees with its reason, and talks refuse a released man or a man on loan at the door');
/* ================================================================== */
section = 8;
{
  const fresh = () => JSON.parse(JSON.stringify(startCareer('Real Madrid')));
  const A = fresh();
  const mkA = buildMarket(A);
  const pickCards = [
    ...mkA.slice(0, 25),
    ...[...mkA].sort((x, y) => x.price - y.price).slice(0, 25),
    ...mkA.filter(m => loanEligible(A, m)).slice(0, 20),
    ...mkA.filter(m => releaseClauseOf(m, A.season) !== null).slice(0, 20),
  ];
  const cards = [...new Map(pickCards.map(m => [`${m.name}|${m.club}`, m])).values()];
  const pad = Array.from({ length: Math.max(0, 30 - A.squad.length) }, (_, i) => ({ ...A.squad[A.squad.length - 1], id: `pad-${i}`, name: `Padding Man ${i}` }));
  const talking = startNegotiation(fresh(), cards.find(m => m.price < A.budget / 4));
  /* A man I released, and his card as a stale screen would still hold it. */
  let released = null;
  let relCard = null;
  for (const p of A.squad) {
    const r = releasePlayer(fresh(), p.id);
    if (r) {
      released = r;
      relCard = { name: p.name, club: A.clubName, position: p.position, age: p.age, rating: p.rating, price: 1, value: p.value };
      break;
    }
  }
  /* A man out on loan, and his card from the pre 634 market. */
  const lent = A.squad.find(p => !p.isYouth && p.rating < 80 && canLeaveSquad(A, p));
  const away = lent ? loanOutPlayer(fresh(), lent.id, 'Sevilla', 1) : null;
  const awayCard = away ? buildMarket({ ...away, loanedOut: [] }).find(m => m.name === lent.name) : null;
  const coldName = cards[1].name;
  const states = [
    ['open window', A, []],
    ['window shut', { ...A, transferWindow: null }, []],
    ['skint', { ...A, budget: 3 }, []],
    ['squad full', { ...A, squad: [...A.squad, ...pad] }, []],
    ['in talks', talking, []],
    ['a released man', released, relCard ? [relCard] : []],
    ['a man on loan', away, awayCard ? [awayCard] : []],
    ['a cold club', { ...A, coldNames: [coldName] }, []],
  ];
  const DOORS = {
    buy: (st, m) => buyPlayer(st, m),
    clause: (st, m) => payClause(st, m),
    loan: (st, m) => loanIn(st, m),
    talk: (st, m) => startNegotiation(st, m),
  };
  let presses = 0;
  let refused = 0;
  const mismatch = [];
  for (const [label, st, extra] of states) {
    if (!st) { fail(`the "${label}" state could not be built`); continue; }
    for (const m of [...cards, ...extra]) {
      for (const [door, press] of Object.entries(DOORS)) {
        presses += 1;
        const took = press(st, m) !== null;
        const why = doorRefusal(st, m, door);
        if (!took) refused += 1;
        if (took === (why !== null)) mismatch.push(`${label}, ${door} on ${m.name}: the engine ${took ? 'took it' : 'refused it'}, the reason is ${JSON.stringify(why)}`);
      }
    }
  }
  console.log(`   ${presses} presses over ${states.length} states and ${cards.length} cards: ${refused} refused, ${mismatch.length} where the engine and the reason disagree`);
  if (refused < 200 || refused > presses - 50) fail(`the states refused ${refused} of ${presses} presses, so they are not exercising both sides`);
  for (const x of mismatch.slice(0, 6)) fail(x);
  /* The two the review named: talks open for a man I released or a man of
     mine on loan used to reach the terms table. */
  const relWhy = released && relCard ? doorRefusal(released, relCard, 'talk') : null;
  const awayWhy = away && awayCard ? doorRefusal(away, awayCard, 'talk') : null;
  const relOpened = released && relCard ? startNegotiation(released, relCard) !== null : null;
  const awayOpened = away && awayCard ? startNegotiation(away, awayCard) !== null : null;
  console.log(`   talks for ${relCard?.name}, released: opened ${relOpened}, reason ${JSON.stringify(relWhy)}`);
  console.log(`   talks for ${awayCard?.name}, out on loan: opened ${awayOpened}, reason ${JSON.stringify(awayWhy)}`);
  if (!relCard || !awayCard) fail('the released man or the man on loan could not be set up, so the door checks were not made');
  if (relOpened) fail('talks opened for a man I released');
  if (!/released/.test(relWhy ?? '')) fail('talks for a released man are not refused with the released reason');
  if (awayOpened) fail('talks opened for a man of mine out on loan');
  if (!/out on loan/.test(awayWhy ?? '')) fail('talks for a man on loan are not refused with the on loan reason');
}

/* ---------- the verdict ---------- */
const SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const total = SECTIONS.reduce((n, k) => n + failures[k], 0);
const redSections = SECTIONS.filter(k => failures[k] > 0);
if (CONTROL) {
  const own = OWN[CONTROL];
  /* The uncapped control has to be caught by the numbers, not by the ledger
     cap check alone, or the fences are decoration. */
  if (CONTROL === 'uncapped') {
    const fired = [...(tags[1] ?? [])];
    console.error(`   section 1 checks that fired under uncapped: ${fired.join(', ') || 'none'}`);
    if (!(tags[1]?.has('budget') && tags[1]?.has('slope'))) {
      console.error(`\nsimClubManagerSaveSize: SAVE_SIZE_CONTROL=uncapped was not caught by BOTH numeric fences (fired: ${fired.join(', ') || 'none'}), so the size budget or the slope cap is not set from headroom`);
      process.exit(1);
    }
  }
  if (redSections.length === 1 && redSections[0] === own) {
    console.error(`\nsimClubManagerSaveSize: CONTROL FIRED as it should, SAVE_SIZE_CONTROL=${CONTROL} turned section ${own} red (${failures[own]} failure${failures[own] === 1 ? '' : 's'}) and nothing else`);
    process.exit(1);
  }
  if (failures[own] === 0) {
    console.error(`\nsimClubManagerSaveSize: SAVE_SIZE_CONTROL=${CONTROL} changed the code and section ${own} stayed green, so that section is not proving anything`);
    process.exit(1);
  }
  console.error(`\nsimClubManagerSaveSize: SAVE_SIZE_CONTROL=${CONTROL} turned sections ${redSections.join(', ')} red, but it should have hit only section ${own}`);
  process.exit(1);
}
if (total) {
  console.error(`\nsimClubManagerSaveSize: ${total} failure${total === 1 ? '' : 's'} in section${redSections.length === 1 ? '' : 's'} ${redSections.join(', ')}`);
  process.exit(1);
}
console.log('\nsimClubManagerSaveSize: all sections green');

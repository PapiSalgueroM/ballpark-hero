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
 * Negative controls (house rule: prove the checks can fail), each one rewrites
 * a copy of the source in memory, refuses to run if its anchor is missing,
 * and must turn exactly its own section red:
 *   SAVE_SIZE_CONTROL=unbounded   trimCareer returns its input untouched.
 *                                 Section 2 must go red (the oversized save
 *                                 does not shrink); section 1 measures the
 *                                 engine's own caps and stays green.
 *   SAVE_SIZE_CONTROL=silent      saveCareer's final catch reports true, the
 *                                 pre 634 swallow. Section 3 must go red.
 *   SAVE_SIZE_CONTROL=noleave     the hook's pagehide listener is gone.
 *                                 Section 4 must go red on the pagehide test.
 *
 * Budgets, from the measured headroom above: SIZE_BUDGET 240,000 bytes is
 * about 1.45x the plateau, well clear of the 2 KB season to season noise;
 * SLOPE_CAP 5,000 bytes a season is about 2.5x the largest measured mean
 * growth after season three.
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

const SIZE_BUDGET = 240_000;
const SLOPE_CAP = 5_000;
const CLUBS = ['Real Madrid', 'Everton', 'Lincoln City'];
const SEASONS = 15;
const SAVE_KEY = 'dukb-club-manager-save';

const CONTROL = process.env.SAVE_SIZE_CONTROL || '';
const KNOWN = ['unbounded', 'silent', 'noleave'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`SAVE_SIZE_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(1); };
const swap = (src, from, to, where) => {
  if (!src.includes(from)) {
    console.error(`control cannot run: ${where} is not in the shape SAVE_SIZE_CONTROL=${CONTROL} rewrites`);
    console.error(`  looked for: ${JSON.stringify(from)}`);
    process.exit(1);
  }
  return src.replace(from, to);
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
if (CONTROL === 'unbounded' || CONTROL === 'silent') {
  let engine = readLF(`${ROOT}/src/lib/clubManager.ts`);
  if (CONTROL === 'unbounded') engine = swap(engine, TRIM_HEAD, TRIM_NOOP, 'clubManager.ts (trimCareer)');
  if (CONTROL === 'silent') engine = swap(engine, SAVE_TAIL, SAVE_LIES, 'clubManager.ts (the final catch of saveCareer)');
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
} = cm;
for (const [name, fn] of Object.entries({ startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer, trimCareer, leanCareer, sortedTable })) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}
if (!SAVE_CAPS || typeof SAVE_CAPS.h2h !== 'number') abort('SAVE_CAPS is not exported in the shape this harness expects');

const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
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
    if (n > cap) { fail(`${label}: ${k} holds ${n} entries, over its cap of ${cap}`); ok = false; }
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
  if (reached < SEASONS) fail(`${club}: only ${reached} of ${SEASONS} seasons were measured`);
  if (last > SIZE_BUDGET) fail(`${club}: the save is ${last} bytes after ${reached} seasons, over the ${SIZE_BUDGET} budget`);
  if (!Number.isFinite(slope)) fail(`${club}: not enough seasons to fit a slope`);
  else if (slope > SLOPE_CAP) fail(`${club}: the save grows ${slope.toFixed(0)} bytes a season over seasons 4 to ${reached}, over the ${SLOPE_CAP} cap`);
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

/* ---------- the verdict ---------- */
const total = failures[1] + failures[2] + failures[3] + failures[4];
const redSections = [1, 2, 3, 4].filter(k => failures[k] > 0);
if (CONTROL) {
  const own = { unbounded: 2, silent: 3, noleave: 4 }[CONTROL];
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

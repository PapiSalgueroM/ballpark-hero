/* Round 1540: the NBA Front Office's earned draft, on the real board (simNbaDraftBoard).
 *
 * It bundles the real NbaFrontOfficeBoard with esbuild (the way simNbaDraftCapital does), mounts it in jsdom with a
 * counted Lehmer Math.random and a fixed clock, and presses its buttons. Saves are built by construction
 * (initNbaLeague, records set, runNbaPlayoffs, the champion pushed: critic 1540 advice 18), never by playing seasons.
 *
 * SECTIONS
 *   1. THE OLD PATHS, recorded from BASE before one line of the board changed (brief 1540 decision 10 (c)). Three
 *      saves that must keep today's draft whatever this round binds: (1) desk off, from the recap; (2) desk on with a
 *      draft already open and no night on the desk; (4) a desk on recap save from before Round 431 (no postseason),
 *      reloaded. Each is played through the real board to the hub; the save (every engine id renamed in the order it
 *      first appears, since ids carry a process epoch) and the count of Math.random calls must equal
 *      scripts/data/nbaDraftBoardFixture.json, recorded with SIM_NBA_DRAFT_BOARD_RECORD=<base sha> from that commit's
 *      own src. Every (1) and (2) save is a closed season (round 20, this season's champion, a real postseason) on
 *      which a desk WOULD open a night (critic correction 6): the harness checks that before it plays, and exits 2
 *      otherwise, so a control that should turn (1) or (2) red can.
 *   6. FENCES. The shared screen and its hook import only their allowed list and name no sport in code (comments
 *      stripped); the board names no lift module (simGmDraftOrder's LIFT names, anywhere in its code: critic F1);
 *      every board anchor of simNbaDraftCapital's controls, READ from that file, is exactly once in the board's
 *      executable source, and so are simGmReload's restore line and simDraftNight's norivals anchor.
 *
 * RUNS. Seeds 1 to 6 by default, 1 to 30 with SIM_NBA_DRAFT_BOARD_FLEET=full. Green is the closing line
 * "simNbaDraftBoard: green." and exit 0. Exit 1 red (or a control that fired), 2 could not run, 3 a control that did
 * not fire.
 *
 * CONTROLS (SIM_NBA_DRAFT_BOARD_CONTROL; `all` runs each alone and is green only if every one fired in exactly its
 * own section). Each asserts its anchor is present exactly once first and edits an in memory copy only.
 *   extradraw    one extra Math.random call before the old openDraft's class draw: section 1, cases (1) and (4) red
 *   deskless     the earned night opens on a fresh desk when the save has none: section 1, case (1) red (exit 3
 *                before the board binds the night: there is nothing to break)
 *   blockedopen  a valid night planted on (2)'s desk: section 1, case (2) red (exit 3 before the bind)
 *   screensport  an NBA import in a copy of the screen: section 6 red
 *   boardlift    a lift import in a copy of the board: section 6 red
 */
import './lib/offlineTransport.cjs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const BOARD = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const SCREEN = 'src/components/front-office-shared/GmEarnedDraftScreen.tsx';
const HOOK = 'src/components/front-office-shared/useGmEarnedDraft.ts';
const FIXTURE = 'scripts/data/nbaDraftBoardFixture.json';
const CASES = ['deskOffRecap', 'deskOnOpen', 'preRecap'];
const CASE_WORDS = { deskOffRecap: '(1) desk off from the recap', deskOnOpen: '(2) desk on, a draft open, no night', preRecap: '(4) desk on, recap with no postseason, reloaded' };

if (process.argv.includes('--child')) {
  await child();
  process.exit(0);
}

/* ================================================================== */
/* The parent: bundle, play through the child, judge.                  */
/* ================================================================== */
const CONTROL = process.env.SIM_NBA_DRAFT_BOARD_CONTROL || '';
const FLEET = process.env.SIM_NBA_DRAFT_BOARD_FLEET || 'quick';
const RECORD = process.env.SIM_NBA_DRAFT_BOARD_RECORD || '';
const SEEDS = RECORD || FLEET === 'full' ? 30 : 6;
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const once = (text, anchor) => text.split(anchor).length - 1;
function cannotRun(msg) { console.error(`simNbaDraftBoard: could not run: ${msg}`); process.exit(2); }

const OLD_CLASS_DRAW = 'const cls = nbaDraftClass(Math.random, Math.max(24, capital + Math.min(10, rivalCapital)), leagueNames(lg));';
const DESK_GUARD = '    if (!desk) return false;\n    const opened = openNbaDraftNight(desk, lg, patch.postseason?.series ?? series, team);';
const CONTROLS = {
  extradraw: { expect: [1], cases: ['deskOffRecap', 'preRecap'] },
  deskless: { expect: [1], cases: ['deskOffRecap'] },
  blockedopen: { expect: [1], cases: ['deskOnOpen'] },
  screensport: { expect: [6] },
  boardlift: { expect: [6] },
};
if (!['quick', 'full'].includes(FLEET)) cannotRun(`SIM_NBA_DRAFT_BOARD_FLEET=${FLEET} is not quick or full`);
if (CONTROL && CONTROL !== 'all' && !CONTROLS[CONTROL]) cannotRun(`no control named ${CONTROL}`);
if (RECORD && CONTROL) cannotRun('a recording runs no control');

if (CONTROL === 'all') {
  const rows = [];
  for (const name of Object.keys(CONTROLS)) {
    const t0 = Date.now();
    const run = spawnSync(process.execPath, [SELF], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SIM_NBA_DRAFT_BOARD_CONTROL: name } });
    const last = `${run.stdout || ''}\n${run.stderr || ''}`.trim().split('\n').pop();
    const fired = run.status === 1 && /: FIRED,/.test(last);
    rows.push({ name, fired });
    console.log(`  ${name}: exit ${run.status}, ${Math.round((Date.now() - t0) / 1000)} s | ${last}`);
  }
  const bad = rows.filter(r => !r.fired);
  console.log(bad.length ? `simNbaDraftBoard controls: ${bad.length} of ${rows.length} did not fire as they must (${bad.map(r => r.name).join(', ')}).`
    : `simNbaDraftBoard controls: all ${rows.length} fired, each in exactly its own section.`);
  process.exit(bad.length ? 1 : 0);
}

const failures = new Map();
const opened = [];
function open(n, title) { opened.push(n); failures.set(n, []); console.log(`\n${n}. ${title}`); }
function fail(n, msg) { failures.get(n).push(msg); if (failures.get(n).length <= 12) console.log(`   FAIL: ${msg}`); }

/* The board as this run plays it: the tree's own, or BASE's own src for a recording, with a control's edit. */
fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
const scratch = [];
process.on('exit', () => { for (const d of scratch) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* left for the lead */ } } });
function baseSrc(sha) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) cannotRun(`${sha} is not a commit sha`);
  const dir = fs.mkdtempSync(path.join(ROOT, '.sim-control', 'nba-draft-board-base-'));
  scratch.push(dir);
  const r = spawnSync('sh', ['-c', `git archive --format=tar ${sha} src | tar -x -C "${dir.replaceAll('\\', '/')}"`], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(path.join(dir, 'src', BOARD.slice(4)))) cannotRun(`could not lay out ${sha}'s src: ${(r.stderr || '').trim()}`);
  return path.join(dir, 'src');
}
const SRC = RECORD ? baseSrc(RECORD) : path.join(ROOT, 'src');
let board = fs.readFileSync(path.join(SRC, BOARD.slice(4)), 'utf8').replaceAll('\r\n', '\n');
if (CONTROL === 'extradraw') {
  if (once(board, OLD_CLASS_DRAW) !== 1) cannotRun('control extradraw: the old class draw is not in the board exactly once');
  board = board.replace(OLD_CLASS_DRAW, `Math.random(); ${OLD_CLASS_DRAW}`);
  console.log('   NEGATIVE CONTROL extradraw: one extra Math.random call before the old draft\'s class draw; section 1 must go red on (1) and (4)');
}
if (CONTROL === 'deskless') {
  if (once(board, DESK_GUARD) !== 1) { console.log('simNbaDraftBoard control deskless: CANNOT FIRE, the board has no earned bind to break (its desk guard is not there once).'); process.exit(3); }
  board = board.replace(DESK_GUARD, '    const opened = openNbaDraftNight(desk ?? openNbaDesk(lg, team), lg, patch.postseason?.series ?? series, team);');
  console.log('   NEGATIVE CONTROL deskless: the earned night opens on a fresh desk when the save has none; section 1 must go red on (1)');
}
if (CONTROL === 'blockedopen') console.log('   NEGATIVE CONTROL blockedopen: a valid night is planted on (2)\'s desk; section 1 must go red on (2)');

async function bundle(srcRoot, boardText, tag) {
  const { build } = await import('esbuild');
  const owned = fs.mkdtempSync(path.join(ROOT, '.sim-control', `nba-draft-board-${tag}-`));
  scratch.push(owned);
  const inert = path.join(owned, 'inert.tsx');
  fs.writeFileSync(inert, 'export const useGameCompletion=()=>undefined; export const recordActivity=()=>undefined; export default()=>null;');
  fs.writeFileSync(path.join(owned, 'entry.ts'), [
    "export { default as Board } from '@/components/nba-front-office/NbaFrontOfficeBoard';",
    "export { default as Boundary } from '@/components/RouteErrorBoundary';",
    "export * from '@/lib/nbaFrontOffice';",
    "export { openNbaDesk, syncNbaPicks, nbaPicksOf } from '@/lib/nbaGmDesk';",
    "export { openNbaDraftNight, nbaDraftNightOf, NBA_DRAFT_BLOCK } from '@/lib/nbaEarnedDraft';",
    "export { withGmBlock } from '@/lib/gmDesk';",
    "export { leagueNames } from '@/lib/foNames';",
    "export { makeIdMinter } from '@/lib/entityIds';",
  ].join('\n'));
  const boardPath = path.resolve(srcRoot, BOARD.slice(4));
  const product = path.join(owned, 'product.mjs');
  const built = await build({
    entryPoints: [path.join(owned, 'entry.ts')], outfile: product, bundle: true, platform: 'node', format: 'esm', packages: 'external',
    jsx: 'automatic', logLevel: 'error', metafile: true,
    alias: { '@/hooks/useGameCompletion': inert, '@/lib/completions': inert, '@/components/game/ShareButtons': inert, '@': srcRoot },
    plugins: [{ name: 'board-copy', setup(b) {
      b.onLoad({ filter: /NbaFrontOfficeBoard\.tsx$/ }, args => (path.resolve(args.path) === boardPath ? { contents: boardText, loader: 'tsx', resolveDir: path.dirname(args.path) } : undefined));
    } }],
  });
  if (Object.keys(built.metafile.inputs).some(f => /integrations[\\/]supabase/.test(f))) cannotRun('the bundle reaches the Supabase client');
  return { owned, product };
}

/** Plays each job in a fresh child process on a bundle, so every play starts from the same id counter and the same
    id epoch (the board breaks ties by id, so a counter carried over from the play before would move a pick). */
function play(b, jobs) {
  const t0 = Date.now();
  const rows = [];
  for (const job of jobs) {
    const out = path.join(b.owned, `out-${job.kind}-${job.seed}-${rows.length}.json`);
    const r = spawnSync(process.execPath, [SELF, '--child'], {
      cwd: ROOT, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NODE_ENV: 'test', SIM_NBA_DRAFT_BOARD_PRODUCT: b.product, SIM_NBA_DRAFT_BOARD_JOB: JSON.stringify(job), SIM_NBA_DRAFT_BOARD_OUT: out },
    });
    const log = `${r.stdout || ''}\n${r.stderr || ''}`;
    if (r.error || r.signal || r.status !== 0 || !fs.existsSync(out)) cannotRun(`${job.kind} seed ${job.seed}: the board did not play (${r.error?.message ?? r.signal ?? `exit ${r.status}`}): ${log.trim().split('\n').slice(-8).join(' | ')}`);
    if (/SIM_OFFLINE_BLOCK|Maximum update depth|not wrapped in act/.test(log)) cannotRun(`${job.kind} seed ${job.seed}: the board's run logged a fault: ${log.trim().split('\n').slice(-4).join(' | ')}`);
    rows.push(JSON.parse(fs.readFileSync(out, 'utf8')));
  }
  console.log(`   ${rows.length} plays through the real board, each in its own process, in ${Math.round((Date.now() - t0) / 1000)} s`);
  return rows;
}

const redCases = new Set();
{
  const head = await bundle(SRC, board, RECORD ? 'record' : 'head');

  /* ---------------------------------------------------------------- */
  open(1, 'The old paths: three saves that keep today\'s draft, played to the hub, against the fixture recorded from BASE');
  const jobs = CASES.flatMap(c => Array.from({ length: SEEDS }, (_, i) => ({ kind: c, seed: i + 1, plant: CONTROL === 'blockedopen' && c === 'deskOnOpen' })));
  const rows = play(head, jobs);
  if (rows.length !== jobs.length) cannotRun(`${rows.length} rows for ${jobs.length} plays`);
  for (const r of rows) if (r.pre !== true) cannotRun(`${CASE_WORDS[r.kind]}, seed ${r.seed}: ${r.pre} (critic correction 6: the save must be one a night could open on)`);
  for (const r of rows) {
    if (r.error) fail(1, `${CASE_WORDS[r.kind]}, seed ${r.seed}: ${r.error}`);
    else if (r.phase !== 'hub' || r.seasonGain !== 1) fail(1, `${CASE_WORDS[r.kind]}, seed ${r.seed}: ended on ${r.phase}, season +${r.seasonGain}, not the hub of the next season`);
  }
  if (RECORD) {
    const cases = Object.fromEntries(CASES.map(c => [c, Object.fromEntries(rows.filter(r => r.kind === c).map(r => [r.seed, { hash: r.hash, calls: r.calls, picks: r.picks }]))]));
    if (failures.get(1).length) cannotRun(`${failures.get(1).length} plays did not reach the hub at ${RECORD}; nothing recorded`);
    fs.writeFileSync(path.join(ROOT, FIXTURE), `${JSON.stringify({ base: RECORD, seeds: SEEDS, note: 'Round 1540 decision 10 (c): the old paths played through the base board. Never record again on a builder\'s own say.', cases }, null, 1)}\n`);
    console.log(`   recorded ${rows.length} plays from ${RECORD} into ${FIXTURE}`);
    console.log('simNbaDraftBoard: recorded.');
    process.exit(0);
  }
  if (!fs.existsSync(path.join(ROOT, FIXTURE))) cannotRun(`${FIXTURE} is missing: record it from BASE first`);
  const fx = JSON.parse(read(FIXTURE));
  for (const r of rows) {
    const want = fx.cases?.[r.kind]?.[r.seed];
    if (!want) cannotRun(`${FIXTURE} has no row for ${r.kind} seed ${r.seed}`);
    if (r.hash !== want.hash || r.calls !== want.calls) {
      redCases.add(r.kind);
      fail(1, `${CASE_WORDS[r.kind]}, seed ${r.seed}: the save or the draws moved from ${fx.base}'s (Math.random calls ${r.calls} vs ${want.calls}${r.hash === want.hash ? ', save equal' : ', save differs'})`);
    }
  }
  for (const c of CASES) {
    const mine = rows.filter(r => r.kind === c);
    const calls = mine.map(r => r.calls);
    console.log(`   ${CASE_WORDS[c]}: ${mine.length} plays to the hub, ${mine.reduce((a, r) => a + r.picks, 0)} picks made on his board, ${Math.min(...calls)} to ${Math.max(...calls)} draws a play; ${mine.filter(r => !redCases.has(c) || (fx.cases[c][r.seed].hash === r.hash && fx.cases[c][r.seed].calls === r.calls)).length} equal to ${fx.base}'s`);
  }

  /* ---------------------------------------------------------------- */
  open(6, 'Fences: the screen and its hook name no sport, the board names no lift module, every harness anchor is there once');
  let screen = read(SCREEN);
  if (CONTROL === 'screensport') {
    screen = `import { nbaGamePickRules } from '@/lib/nbaGmDesk';\n${screen}`;
    console.log('   NEGATIVE CONTROL screensport: a copy of the screen imports the NBA desk; section 6 must go red');
  }
  let boardCode = board;
  if (CONTROL === 'boardlift') {
    boardCode = `import type { GmDraftNight } from '@/lib/gmDraftNight';\n${boardCode}`;
    console.log('   NEGATIVE CONTROL boardlift: a copy of the board imports a lift module; section 6 must go red');
  }
  const importsOf = code => [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g), ...code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
  const SHARED = [
    [SCREEN, screen, ['react', '@/lib/utils', '@/lib/gmEarnedDraft', '@/lib/draftNight', './DraftNightCard', './gmLazyPanel', './GmLotteryCard']],
    [HOOK, read(HOOK), ['react', '@/lib/gmEarnedDraft', '@/lib/draftNight']],
  ];
  for (const [rel, text, allowed] of SHARED) {
    const code = strip(text);
    const froms = importsOf(code);
    if (!froms.length) fail(6, `${rel} imports nothing this check can read`);
    for (const f of froms) if (!allowed.includes(f)) fail(6, `${rel} imports ${f}; it may import ${allowed.join(', ')} and nothing of a sport`);
    if (/nba|nfl|nhl|mlb/i.test(code)) fail(6, `${rel} names a sport in its code`);
    if (/Math\.random|localStorage|sessionStorage/.test(code)) fail(6, `${rel} draws a number or touches storage`);
    console.log(`   ${rel}: ${froms.length} imports, all allowed; no sport, no draw, no storage`);
  }
  for (const m of strip(screen).matchAll(/import\s+(type\s+)?\{[^}]*\}\s*from\s*['"](@\/lib\/gmEarnedDraft|@\/lib\/draftNight)['"]/g)) {
    if (!m[1]) fail(6, `${SCREEN} takes values from ${m[2]}; it may take types only`);
  }
  const LIFT = /\b(gmDraftOrder|gmDraftNight|gmLotteryNight|GmLotteryCard)\b/;
  if (LIFT.test(strip(boardCode))) fail(6, `${BOARD} names a lift module (${strip(boardCode).match(LIFT)[1]}): it reaches the lift only through nbaEarnedDraft and the shared screen`);
  /* simNbaDraftCapital's 21 controls, read from that file, so a new line that repeats an anchor is seen. */
  const cap = read('scripts/simNbaDraftCapital.mjs');
  const body = cap.slice(cap.indexOf('const controls = {') + 'const controls = {'.length, cap.indexOf('\n};', cap.indexOf('const controls = {')));
  const capControls = new Function(`return {${body}\n};`)();
  const executable = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const boardAnchors = Object.entries(capControls).filter(([, c]) => c[0] === 'board');
  if (Object.keys(capControls).length < 20 || boardAnchors.length < 10) fail(6, `read ${Object.keys(capControls).length} controls from simNbaDraftCapital, ${boardAnchors.length} on the board: the reader is broken`);
  for (const [name, [, anchor]] of boardAnchors) {
    const n = once(executable(boardCode), anchor);
    if (n !== 1) fail(6, `simNbaDraftCapital's control ${name} anchor is in the board's executable source ${n} times, not once`);
  }
  const OTHER = {
    'simGmReload restore': "      if (s.fired) setPhase('fired');\n      else if (s.phase !== 'recap') setPhase(s.phase);\n      else if (s.postseason) setPhase('recap');\n      else openDraft(s.league, s.myTeam, s);\n",
    'simDraftNight norivals': 'grade: gradeOf(pr) }, rivalPicks,',
  };
  for (const [name, anchor] of Object.entries(OTHER)) if (once(boardCode, anchor) !== 1) fail(6, `${name}'s anchor is in the board ${once(boardCode, anchor)} times, not once`);
  console.log(`   ${BOARD}: names no lift module; ${boardAnchors.length} of simNbaDraftCapital's ${Object.keys(capControls).length} anchors are board anchors, each once; simGmReload's and simDraftNight's anchors once`);
}

/* ================================================================== */
const red = opened.filter(n => failures.get(n).length > 0);
const total = opened.reduce((a, n) => a + failures.get(n).length, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const exact = red.length === want.expect.length && want.expect.every(n => red.includes(n));
  const casesOk = !want.cases || (want.cases.length === redCases.size && want.cases.every(c => redCases.has(c)));
  if (!red.length) { console.log(`simNbaDraftBoard control ${CONTROL}: DID NOT FIRE (every section green).`); process.exit(3); }
  if (!exact || !casesOk) { console.log(`simNbaDraftBoard control ${CONTROL}: MISFIRED, red ${red.join(', ')} (cases ${[...redCases].join(', ') || 'none'}), want ${want.expect.join(', ')}${want.cases ? ` on ${want.cases.join(', ')}` : ''}.`); process.exit(1); }
  console.log(`simNbaDraftBoard control ${CONTROL}: FIRED, section ${red.join(', ')} red with ${total} failure(s)${want.cases ? ` (cases ${[...redCases].join(', ')})` : ''}, the others green.`);
  process.exit(1);
}
console.log(`\n${opened.length} sections (${opened.join(', ')}), ${SEEDS} seeds a case, ${total} failure(s).`);
if (red.length) { console.log(`simNbaDraftBoard: red in section ${red.join(', ')}.`); process.exit(1); }
console.log('simNbaDraftBoard: green.');
process.exit(0);

/* ================================================================== */
/* The child: one play through the real board in jsdom.                */
/* ================================================================== */
async function child() {
  const job = JSON.parse(process.env.SIM_NBA_DRAFT_BOARD_JOB);
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/nba-front-office' });
  for (const name of ['window', 'document', 'localStorage', 'HTMLElement', 'Element', 'Node', 'Text', 'MutationObserver', 'SVGElement', 'getComputedStyle', 'MouseEvent', 'Event']) globalThis[name] = dom.window[name];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.scrollTo = () => undefined;
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
  globalThis.requestAnimationFrame = cb => setTimeout(() => cb(0), 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  /* A fixed clock, and a fixed draw for the id epoch the modules mint at load, so every play of every run is alike. */
  const FIXED = Date.UTC(2026, 9, 1, 12);
  const RealDate = Date;
  globalThis.Date = class FixedDate extends RealDate {
    constructor(...a) { super(...(a.length ? a : [FIXED])); }
    static now() { return FIXED; }
  };
  const lehmer = seed => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    let calls = 0;
    const draw = () => { calls += 1; s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    draw.calls = () => calls;
    return draw;
  };
  Math.random = lehmer(1540);
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const E = await import(pathToFileURL(process.env.SIM_NBA_DRAFT_BOARD_PRODUCT).href);
  const { act } = React;
  const KEY = 'nba-front-office-save-v1';
  const clone = v => JSON.parse(JSON.stringify(v));
  const probe = E.makeIdMinter('q')();
  const EPOCH = probe.slice(1, probe.lastIndexOf('-'));
  /* Every id renamed in the order it first appears (keys too), then hashed. */
  const hashOf = value => {
    const ids = new Map();
    const re = new RegExp(`[a-z]*${EPOCH}-\\d+`, 'g');
    const fix = s => s.replace(re, m => { if (!ids.has(m)) ids.set(m, `#${ids.size + 1}`); return ids.get(m); });
    const walk = v => (Array.isArray(v) ? v.map(walk)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [fix(k), walk(x)]))
        : typeof v === 'string' ? fix(v) : v);
    return createHash('sha256').update(JSON.stringify(walk(value))).digest('hex');
  };

  /* The season, by construction: thirty clubs on distinct records, a real postseason, the champion pushed. */
  const rng = lehmer(15400 + job.seed * 101);
  const lg = E.initNbaLeague(rng);
  const ids = Object.keys(lg.teams).sort();
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  order.forEach((id, i) => { lg.teams[id].wins = 26 + i; lg.teams[id].losses = 56 - i; });
  lg.round = E.NBA_ROUNDS;
  const { series, champion } = E.runNbaPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: champion });
  const me = ids[(job.seed * 7) % ids.length];
  const post = { series, champion, gradeLine: null };
  const base = { league: lg, myTeam: me, titles: 0, seasonsPlayed: 1 };
  let save;
  let pre = true;
  if (job.kind === 'deskOffRecap') {
    save = { ...base, phase: 'recap', draftClass: null, picksLeft: 0, postseason: post };
    if (!E.openNbaDraftNight(E.openNbaDesk(clone(lg), me), clone(lg), series, me)) pre = 'a desk on this save would open no night';
  } else {
    const desk = E.openNbaDesk(lg, me);
    E.syncNbaPicks(lg, E.nbaPicksOf(desk, lg));
    if (job.kind === 'deskOnOpen') {
      const cls = E.nbaDraftClass(rng, 24, E.leagueNames(lg));
      save = { ...base, phase: 'draft', draftClass: cls, picksLeft: E.nbaDraftCapital(lg.teams[me]) ?? 0, draftAiBatchesLeft: 2, postseason: post, gm: desk };
      const night = E.openNbaDraftNight(desk, clone(lg), series, me)?.night ?? null;
      const planted = night ? E.withGmBlock(desk, E.NBA_DRAFT_BLOCK, night) : null;
      if (!planted || JSON.stringify(E.nbaDraftNightOf(planted, lg)) !== JSON.stringify(night)) pre = 'a night planted on this save would not be current';
      else if (job.plant) save.gm = planted;
    } else {
      save = { ...base, phase: 'recap', draftClass: null, picksLeft: 0, gm: desk };
    }
  }
  const seasonBefore = lg.season;
  localStorage.clear();
  localStorage.setItem(KEY, JSON.stringify(save));

  const draw = lehmer(777000 + job.seed * 13 + CASES.indexOf(job.kind));
  Math.random = draw;
  const root = createRoot(document.getElementById('root'));
  const buttons = () => [...document.querySelectorAll('button')];
  const byText = text => buttons().find(b => b.textContent.trim() === text);
  const click = async node => { await act(async () => { node.click(); }); };
  const onDraft = () => [...document.querySelectorAll('p.font-display')].some(p => /^The \d{4} Draft$/.test(p.textContent.trim()));
  let picks = 0;
  let error = null;
  await act(async () => root.render(React.createElement(E.Boundary, { resetKey: '/nba-front-office' }, React.createElement(E.Board))));
  for (let step = 0; step < 24 && !error; step += 1) {
    if (/This page broke/.test(document.body.textContent)) { error = 'the board crashed (RouteErrorBoundary)'; break; }
    if (!onDraft()) {
      const go = byText('Go to the draft');
      if (go && JSON.parse(localStorage.getItem(KEY)).phase === 'recap') { await click(go); continue; }
      break;
    }
    const choice = document.querySelector('[data-nba-draft-choice]') || document.querySelector('div.grid > button.rounded-lg');
    if (choice) { picks += 1; await click(choice); continue; }
    const next = byText('Finish draft and offseason') || document.querySelector('[data-draft-continue]') || byText('Continue to the hub');
    if (next) { await click(next); continue; }
    error = `stuck on the draft screen: ${document.body.textContent.slice(0, 160)}`;
  }
  const end = JSON.parse(localStorage.getItem(KEY));
  if (!error && onDraft()) error = 'still on the draft screen after 24 presses';
  const row = {
    kind: job.kind, seed: job.seed, pre, error, picks, phase: end.phase, seasonGain: end.league.season - seasonBefore,
    calls: draw.calls(), hash: hashOf(end),
  };
  await act(async () => root.unmount());
  dom.window.close();
  fs.writeFileSync(process.env.SIM_NBA_DRAFT_BOARD_OUT, JSON.stringify(row));
}


/**
 * Round 1329 harness: Soccer Career stops naming real people in invented past
 * results. Player of the Month goes to whoever really had the month, with its
 * true year, and the phone's world, its quiz and the International panel stop
 * stating transfers, champions and top scorers for seasons that happened.
 *
 * What the depth hunt found (hunt-sc.md, sc MAJOR 4 and MAJOR 6, on 48cb9d4b):
 *   - The phone's SportsFeed in a 2012 career: "Wayne Rooney joins Jeonbuk
 *     Motors from Man United", "Tottenham win the Premier League", "Eden Hazard
 *     finished top scorer in the Premier League on 14". The International
 *     history said Argentina won the 2006 World Cup. The quiz on the same phone
 *     asked who were champions of Europe in 2012 and marked the invented answer
 *     right.
 *   - Player of the Month was a goals lottery: a 0 goal keeper won it twice in
 *     his debut season, and "April 1992" was printed in the 1992-93 season.
 *
 * THE RULE (src/lib/soccerWorldTruth.ts): his competitions are his story,
 * everyone else's results are the world's facts, and until sourced history
 * arrives a fact about a season that happened is printed nowhere.
 *
 * THE SECTIONS
 *   0  PINS. The harness judges with its own literals (season 2025, summer
 *      2026, real names to 2032, the floor of 10 games and 6.8), and
 *      soccerWorldTruth.ts must agree with them: its constants, and
 *      seasonHappened, summerHappened, playedFinals, tournamentWinnerShown and
 *      monthYear over 1980 to 2045. Planted: a 9 game season rated 9.5 and a
 *      34 game season rated 6.7 never win a month; one rated 8.6 does.
 *   1  MONTHS. A fleet (starts 1990 to 2025 every five years, all ten positions,
 *      five seeds a run) driven on this tree and on the base: no month is won in
 *      a season under the floor (fewer than 10 games or rated under 6.8), so a
 *      0 goal keeper rated 6.0 never wins one; the rating bands and the four
 *      position groups at equal rating (base readings beside them); every month
 *      line's year is monthYear's and every award's year is the row's. Planted:
 *      10,000 identities of a 0 goal keeper rated 6.0 through monthAwards win
 *      nothing.
 *   2  STREAM. 200 careers (starts 1990, 2000, 2010, 2020 and 2025, all ten
 *      positions) on this tree and the base in lockstep, each under the same
 *      seeded Math.random: the call count at the end of the month block, at the
 *      end of the world tick and at the end of every step, and the phone's seed
 *      after the tick, equal the base's, and so do the world's Europe, leagues,
 *      cups and tournament, until a season's input differs. The first fields to
 *      differ are always this round's (an award, a log line, the phone's map,
 *      moves, scorer or feed, a nominee's club on the night). Planted: the
 *      base's month block and this tree's legacyMonthDraws, lifted from their
 *      sources, make the same number of Math.random calls for every goal count
 *      from 0 to 45 over 200 seeds (the guarantee loops at 30 and 35 goals).
 *   3  FEED. Over the fleet, every season that happened: no feed line holds a
 *      name from any era pool (1990 to 2032), no champion, Europe, cup,
 *      transfer or top scorer line, the honest line once, and no tournament
 *      winner line at all, not even for finals he played (those are his story,
 *      told on his International card and in his season log, never as world
 *      news: the review's finding 6). Every later season shows its framing
 *      line on top of its batch, and every line matches the record. A real man
 *      in phone.clubs is only ever at a club his era pool gave him.
 *   4  QUIZ. In a season that happened no question is about the world; a move
 *      or top scorer question only past the last real names year; every answer
 *      is in the save; the share of seasons with three questions is not below
 *      the base's.
 *   5  LOG AND PANEL. The season log names a tournament's winner only for a
 *      summer still to come or finals he played (and keeps it there); the
 *      International card and the history tile follow the same rule, rendered
 *      with renderToStaticMarkup inside a MemoryRouter for four cases.
 *   6  INVERSE. scripts/lib/careerWorldTruth1329.mjs (the eighth inverse)
 *      applied in order to this tree's engine, phone, quiz and International
 *      panel gives the base's four files byte for byte (sha256 printed and
 *      asserted, and pinned in the module), every row applied once, and every
 *      hunk of the diff against the base sits inside the regions this round
 *      may edit.
 *
 * MEASURED (section 1's bands, this tree, 400 careers a run, on GitHub runners
 * r1329-fx-b and r1329-fx-c at seed offsets 0, 3, 5, 7 and 9):
 *   GREAT_BAND [1.0, 3.0], a season rated 8.0+ wins 2.60, 2.74, 2.83, 2.76
 *     and 2.65 months; the ceiling has 0.17 of room over the highest reading.
 *   FAIR_ANY_MAX 0.2, a season rated 7.0 to 7.5 wins any month 0.03, 0.03,
 *     0.03, 0.03 and 0.04 of the time.
 *   GROUP_BAND 0.3, the widest gap of a group's mean at 7.5 to 8.5 from the
 *     four together is 17, 15, 9, 8 and 10 percent.
 *   Section 4's champion questions: 1462 (offset 0) and 1435 (offset 3)
 *     asked, against a floor of 100 to judge their wording.
 * The rest of the readings: docs/audits/ROUND-1329-NOTES.md.
 *
 * NEGATIVE CONTROLS (WORLD_TRUTH_CONTROL), each on a COPY of a source file.
 * Text not in the file exactly once refuses to run (ABORT, exit 1); the last
 * line says FIRED (its section failed) or DID NOT FIRE, and both exit 1.
 *   goalsonly   the old goals lottery decides the months again: section 1.
 *   seasonyear  every month printed with the season's starting year: section 1.
 *   nolegacy    the old lottery's draws are no longer made: section 2.
 *   extradraw   one extra draw in the world tick: section 2.
 *   legacy30    the old lottery's 30 goal guarantee loop is no longer drawn: section 2 (planted).
 *   legacy35    the old lottery's 35 goal guarantee loop is no longer drawn: section 2 (planted).
 *   boundary    soccerWorldTruth.ts says 2025-26 has not happened (LAST_PLAYED_SEASON 2024): section 0.
 *   floor       the month award's 10 game floor is dropped: section 0 (planted).
 *   realmoves   real men are moved between clubs again: section 3.
 *   pastchampions  a season that happened prints its champions: section 3.
 *   summer      the feed names the winner of every summer that happened again: section 3.
 *   arcade      the quiz asks about the world of every season again: section 4.
 *   quizyear    the Europe question names its season by the start year again: section 4.
 *   log         the season log names the winner of every summer again: section 5.
 *   outside     one constant of the transfer market changes, outside the hunks: section 6.
 *   panel       the International panel names every winner again: section 5.
 *
 * Run: node scripts/simSoccerWorldTruth.mjs [seeds]   (default 5 seeds, 400 careers a tree)
 *      SEED_OFFSET=1 node scripts/simSoccerWorldTruth.mjs   another five seeds
 * Reads no network: the bundles are local, offlineTransport blocks sockets.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { inverseWorldTruth, worldTruthReceiptProblem, WORLD_TRUTH_SHA256, WORLD_TRUTH_FILES, WORLD_TRUTH_ADDITIONS } from './lib/careerWorldTruth1329.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
/* The base this round was merged onto at Release BD's join: release-bd-gate after Rounds 1331 and 1332 (b9df63b4),
   which is origin/main with Release BC live (082fc277) plus two rounds that leave the four files alone. The four
   files are byte for byte 082fc277's and c5fc5470's (origin/release-bc-gate, the tree the round was cut from), so
   the regenerated rows and every sha256 pin are unchanged; only the base named here moved. */
const BASE = 'b9df63b4e9ad8925c1f19536ec6a32d8a77358ea';
/* Release BF join: WORLD_TRUTH_BASE_FROM_HEAD (comma separated src paths, default none) lets the base bundle read
   those files from this tree instead of BASE, so a later round's engine input that this round never touched (the
   Soccer Career life chain's soccerCareerLife.ts and soccerCareerRoutineEvents.ts) is the same on both sides of the
   lockstep. None of this round's own files may be named (checked once ENGINE, PHONE, ARCADE and PANEL are set). */
const BASE_FROM_HEAD = new Set((process.env.WORLD_TRUTH_BASE_FROM_HEAD || '').split(',').map(f => f.trim()).filter(Boolean));
const CONTROL = process.env.WORLD_TRUTH_CONTROL || '';
const SEED_OFFSET = Number(process.env.SEED_OFFSET || 0);
const SEEDS = Math.max(1, Number(process.argv[2] || 5));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1329-world-truth-'));

let failures = 0;
let SECTION = '0';
const failedSections = new Set();
const perSection = new Map();
const fail = m => {
  failures += 1; failedSections.add(SECTION);
  const n = (perSection.get(SECTION) || 0) + 1;
  perSection.set(SECTION, n);
  if (n <= 12) console.error(`  FAIL (section ${SECTION}): ${m}`);
  else if (n === 13) console.error(`  FAIL (section ${SECTION}): ... further failures in this section counted, not printed`);
};
const r2 = v => Math.round(v * 100) / 100;
/* WORLD_TRUTH_ONLY=6 (or 1,3) runs only those sections, for a quick look; a gate runs them all. */
const ONLY = (process.env.WORLD_TRUTH_ONLY || '').split(',').filter(Boolean);
const runs = k => ONLY.length === 0 || ONLY.includes(k);
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const PHONE = 'src/lib/soccerPhone.ts';
const ARCADE = 'src/lib/soccerArcade.ts';
const PANEL = 'src/components/soccer-career/InternationalPanel.tsx';
const TRUTH = 'src/lib/soccerWorldTruth.ts';
for (const f of BASE_FROM_HEAD) {
  if ([ENGINE, PHONE, ARCADE, PANEL, TRUTH, 'src/lib/keyedRng.ts'].includes(f) || !f.startsWith('src/')) { console.error(`ABORT: WORLD_TRUTH_BASE_FROM_HEAD names ${f}, which the base must keep`); process.exit(1); }
}
if (BASE_FROM_HEAD.size) console.log(`base ${BASE.slice(0, 8)} reads ${BASE_FROM_HEAD.size} file(s) from this tree: ${[...BASE_FROM_HEAD].join(', ')}`);

/* ─── the controls ─────────────────────────────────────────────────────── */

/* Each: the file it edits, its edits (text that must be in the file exactly once), and the section it breaks. */
const OLD_LOTTERY = '((g: number) => { const out: string[] = []; for (const m of ["August", "September", "October", "November", "December", "January", "February", "March", "April", "May"]) { const mg = Math.max(0, Math.round(g / 10 + (Math.random() * 2 - 1))); const c = mg >= 4 ? 0.75 : mg >= 3 ? 0.5 : mg >= 2 ? 0.25 : mg >= 1 ? 0.1 : 0.02; if (Math.random() < c) out.push(m); } return out; })(season.goals)';
const CONTROLS = {
  goalsonly: { breaks: '1', note: 'the old goals lottery decides the months again',
    edits: { [ENGINE]: [['  for (const month of monthAwards(season, s.position, keyedRng(`${soccerDeckIdentity(s)}|${season.year}|potm`))) {', `  for (const month of ${OLD_LOTTERY}) {`]] } },
  seasonyear: { breaks: '1', note: 'every month is printed with the season\'s starting year again',
    edits: { [ENGINE]: [['  s.events.push(`🏆 Won Player of the Month (${month} ${monthYear(month, thisYear)})!`);', '  s.events.push(`🏆 Won Player of the Month (${month} ${thisYear})!`);']] } },
  nolegacy: { breaks: '2', note: 'the old lottery\'s Math.random calls are no longer made',
    edits: { [ENGINE]: [['  if (legacyMonthDraws(season.goals) < 0) s.events.push("");\n', '']] } },
  realmoves: { breaks: '3', note: 'real men are moved between clubs again',
    edits: { [PHONE]: [['    if (realNames) continue;\n    p.clubs[st.name] = to;', '    p.clubs[st.name] = to;']] } },
  pastchampions: { breaks: '3', note: 'a season that happened prints its champions again',
    edits: { [PHONE]: [['  if (!happened) {\n    if (ucl !== s.currentClub)', '  if (true) {\n    if (ucl !== s.currentClub)']] } },
  summer: { breaks: '3', note: 'the feed names the winner of every summer that happened again',
    edits: { [PHONE]: [['  if (intl && !summerHappened(year))', '  if (intl)']] } },
  quizyear: { breaks: '4', note: 'the quiz names the Europe question\'s season by its start year again',
    edits: { [ARCADE]: [['`Who were champions of Europe in ${seasonLabel(w.year)}?`', '`Who were champions of Europe in ${w.year}?`']] } },
  arcade: { breaks: '4', note: 'the quiz asks about the world of every season again',
    edits: { [ARCADE]: [['  if (w && !seasonHappened(w.year)) {', '  if (w) {'], ['    if (w.year > LAST_REAL_YEAR && w.moves.length >= 1) {', '    if (w.moves.length >= 1) {'], ['    if (w.year > LAST_REAL_YEAR && w.topScorer) {', '    if (w.topScorer) {']] } },
  outside: { breaks: '6', note: 'one constant of the transfer market changes, outside this round\'s hunks',
    edits: { [ENGINE]: [['export const LEAGUE_DRAW_CAP = 5;', 'export const LEAGUE_DRAW_CAP = 6;']] } },
  log: { breaks: '5', note: 'the season log names the winner of every summer again',
    edits: { [ENGINE]: [['  if (tournamentWinnerShown(year, eligible ? t.myResult : "")) {', '  if (true) {']] } },
  panel: { breaks: '5', note: 'the International panel names every winner again',
    edits: { [PANEL]: [['import { summerAtHomeLine, tournamentWinnerShown } from "@/lib/soccerWorldTruth";', 'import { summerAtHomeLine } from "@/lib/soccerWorldTruth";\nconst tournamentWinnerShown = (..._: unknown[]) => true;']] } },
  boundary: { breaks: '0', note: 'the module says the 2025-26 season has not happened',
    edits: { [TRUTH]: [['export const LAST_PLAYED_SEASON = 2025;', 'export const LAST_PLAYED_SEASON = 2024;']] } },
  floor: { breaks: '0', note: 'the month award\'s 10 game floor is dropped',
    edits: { [TRUTH]: [['  if (!(row.apps >= MONTH_AWARD_MIN_APPS) || !(row.rating >= MONTH_AWARD_MIN_RATING)) return [];', '  if (!(row.rating >= MONTH_AWARD_MIN_RATING)) return [];']] } },
  legacy30: { breaks: '2', note: 'the old lottery\'s 30 goal guarantee loop is no longer drawn',
    edits: { [ENGINE]: [['    if (goals >= 30) for (; won < 6; won += 1) total += rand(0, 9 - won);\n', '']] } },
  legacy35: { breaks: '2', note: 'the old lottery\'s 35 goal guarantee loop is no longer drawn',
    edits: { [ENGINE]: [['    if (goals >= 35) for (; won < 7; won += 1) total += rand(0, 9 - won);\n', '']] } },
  extradraw: { breaks: '2', note: 'the world tick makes one extra draw before Europe',
    edits: { [PHONE]: [['  const ucl = draw(notMine(topClubs, opts.playerUcl));', '  rng.next();\n  const ucl = draw(notMine(topClubs, opts.playerUcl));']] } },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`WORLD_TRUTH_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const controlSources = new Map();
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  for (const [file, edits] of Object.entries(c.edits)) {
    let src = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
    for (const [from, to] of edits) {
      const hits = src.split(from).length - 1;
      if (hits !== 1) { console.error(`ABORT: control cannot run: ${file} holds the ${CONTROL} control's text ${hits} times, it must be exactly once`); process.exit(1); }
      src = src.replace(from, () => to);
    }
    controlSources.set(file, src);
  }
  console.log(`NEGATIVE CONTROL ON: ${c.note} (section ${c.breaks} must fail)`);
}

/* ─── bundles ──────────────────────────────────────────────────────────── */

/* Two marks added to every copy, base and head alike, neither of which draws: the end of the month block (the
   line after it has not moved since the base) and the end of the world tick (the phone's state after it). */
const MARKS = [
  [ENGINE, '\n  // Player of the Year (domestic)\n', "\n  globalThis.__r1329Mark?.('month');\n  // Player of the Year (domestic)\n"],
  [PHONE, '\n  p.seed = rng.state;\n  pruneClubs(p);\n', "\n  p.seed = rng.state;\n  globalThis.__r1329Mark?.('tick', p.seed);\n  pruneClubs(p);\n"],
];
function mark(source, from, to, where) {
  const hits = source.split(from).length - 1;
  if (hits !== 1) { console.error(`ABORT: the harness mark ${JSON.stringify(from.slice(0, 40))} is in ${where} ${hits} times, it must be once`); process.exit(1); }
  return source.replace(from, () => to);
}

/** One CommonJS bundle of the engine, the phone, the quiz, the eras and the International panel's two
 *  renders, from the working tree or from a commit. A control replaces its file's source in this tree's bundle. */
async function bundle(tag, ref = null) {
  const R = ROOT.split(path.sep).join('/');
  const entry = `import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TournamentCard, InternationalHistoryTile } from '${R}/${PANEL}';
export * as engine from '${R}/${ENGINE}';
export * as phone from '${R}/${PHONE}';
export * as arcade from '${R}/${ARCADE}';
export * as eras from '${R}/src/lib/careerEras.ts';
${ref ? '' : `export * as truth from '${R}/src/lib/soccerWorldTruth.ts';\nexport * as keyed from '${R}/src/lib/keyedRng.ts';\n`}const noop = () => undefined;
/* react-router's MemoryRouter warns about useLayoutEffect on every server render; that warning is noise here. */
const inRouter = el => {
  const err = console.error;
  console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect')) err(...a); };
  try { return renderToStaticMarkup(React.createElement(MemoryRouter, null, el)); } finally { console.error = err; }
};
export const render = {
  card: t => inRouter(React.createElement(TournamentCard, { t, onDismiss: noop, onSpeech: noop })),
  tile: (history, nation, last) => inRouter(React.createElement(InternationalHistoryTile, { history, nation, last })),
};
`;
  const used = new Set();
  const plugin = { name: 'r1329-source', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      let source;
      if (!ref && controlSources.has(rel)) { source = controlSources.get(rel); used.add(rel); }
      else if (ref && !BASE_FROM_HEAD.has(rel)) source = execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      else source = fs.readFileSync(args.path, 'utf8');
      source = source.replace(/\r\n/g, '\n');
      for (const [file, from, to] of MARKS) if (rel === file) source = mark(source, from, to, `${tag} ${file}`);
      return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  const out = path.join(TMP, `${tag}.cjs`);
  await esbuild.build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'tsx', sourcefile: `${tag}-entry.tsx` },
    bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [plugin],
  });
  if (!ref) for (const file of controlSources.keys()) if (!used.has(file)) { console.error(`ABORT: the control copy of ${file} never loaded`); process.exit(1); }
  return require(out);
}

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear(),
};
const HEAD = await bundle('head');
const BASEB = await bundle('base', BASE);
/* The harness judges with its own copy of the boundary and the rule, written here as literals, never with the
   module's own functions alone: judging by HEAD.truth let a wrong constant or rule inside soccerWorldTruth.ts
   leave every section green (the review's finding 3; only the unit files caught it). Moving the boundary is a
   data round with its own sources, and that round moves these numbers too. Section 0 holds the module to them.
   Everything else (monthAwards, the feed's two lines) is the module's own, as the thing under test. */
const PIN = { season: 2025, summer: 2026, realNames: 2032, minApps: 10, minRating: 6.8 };
const FINALS_PINNED = new Set(['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Runner-up', 'Winner']);
const MONTHS_PINNED = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
const T = {
  ...HEAD.truth,
  LAST_REAL_YEAR: PIN.realNames,
  seasonHappened: y => y <= PIN.season,
  summerHappened: y => y <= PIN.summer,
  playedFinals: r => FINALS_PINNED.has(r),
  tournamentWinnerShown: (y, r) => y > PIN.summer || FINALS_PINNED.has(r),
  monthYear: (m, y) => (MONTHS_PINNED.indexOf(m) >= 5 ? y + 1 : y),
};

/* Every real name an era pool lists from 1990 to the last real names year, and the club each year gives him. */
const ERA = new Map();
for (let y = 1990; y <= T.LAST_REAL_YEAR; y += 1) {
  for (const st of HEAD.eras.getEraStars(y)) {
    if (!ERA.has(st.name)) ERA.set(st.name, new Map());
    ERA.get(st.name).set(y, st.club);
  }
}
const ERA_NAMES = [...ERA.keys()];

/* ─── 0. the module against the pins ───────────────────────────────────── */

SECTION = '0';
console.log('0) soccerWorldTruth.ts states the boundary and the rule this harness pins');
{
  const M = HEAD.truth;
  let off = 0;
  const no = m => { off += 1; fail(m); };
  for (const [k, v] of [['LAST_PLAYED_SEASON', PIN.season], ['LAST_PLAYED_SUMMER', PIN.summer], ['LAST_REAL_YEAR', PIN.realNames], ['MONTH_AWARD_MIN_APPS', PIN.minApps], ['MONTH_AWARD_MIN_RATING', PIN.minRating]]) {
    if (M[k] !== v) no(`soccerWorldTruth.ts says ${k} = ${M[k]}, this harness pins ${v} (moving it is a data round: move the pin with its sources)`);
  }
  const RESULTS = [...FINALS_PINNED, 'Did Not Qualify', 'Not Selected', '', null, undefined];
  for (let y = 1980; y <= 2045; y += 1) {
    if (M.seasonHappened(y) !== T.seasonHappened(y)) no(`seasonHappened(${y}) is ${M.seasonHappened(y)}`);
    if (M.summerHappened(y) !== T.summerHappened(y)) no(`summerHappened(${y}) is ${M.summerHappened(y)}`);
    for (const r of RESULTS) if (M.tournamentWinnerShown(y, r) !== T.tournamentWinnerShown(y, r)) no(`tournamentWinnerShown(${y}, ${JSON.stringify(r)}) is ${M.tournamentWinnerShown(y, r)}`);
    for (const m of MONTHS_PINNED) if (M.monthYear(m, y) !== T.monthYear(m, y)) no(`monthYear(${m}, ${y}) is ${M.monthYear(m, y)}`);
  }
  for (const r of RESULTS) if (M.playedFinals(r) !== T.playedFinals(r)) no(`playedFinals(${JSON.stringify(r)}) is ${M.playedFinals(r)}`);
  /* The floor, planted: a 9 game season rated 9.5 and a 34 game season rated 6.7 never win a month (dropping
     either half of the floor goes red here; the fleet alone seldom tests it), while a 34 game season rated 8.6
     does, so the case is not empty. */
  const plant = (row, pos) => {
    let won = 0;
    for (let i = 0; i < 2000; i += 1) won += M.monthAwards(row, pos, HEAD.keyed.keyedRng(`Pin ${i}|2000s|England|${pos}|${1990 + (i % 40)}|potm`)).length;
    return won;
  };
  const short = plant({ apps: 9, goals: 9, assists: 4, cleanSheets: 6, rating: 9.5, injuryWeeks: 0 }, 'ST');
  const flat = plant({ apps: 34, goals: 14, assists: 6, cleanSheets: 14, rating: 6.7, injuryWeeks: 0 }, 'ST');
  const great = plant({ apps: 34, goals: 25, assists: 8, cleanSheets: 14, rating: 8.6, injuryWeeks: 0 }, 'ST');
  console.log(`   pins: season ${PIN.season}, summer ${PIN.summer}, real names to ${PIN.realNames}, floor ${PIN.minApps} games and ${PIN.minRating}; ${off} disagreements over 1980 to 2045`);
  console.log(`   planted over 2,000 identities each: 9 games rated 9.5 won ${short} months, 34 games rated 6.7 won ${flat}, 34 games rated 8.6 won ${great}`);
  if (short) fail(`a 9 game season rated 9.5 won ${short} months under the floor`);
  if (flat) fail(`a 34 game season rated 6.7 won ${flat} months under the floor`);
  if (!(great > 0)) fail(`a 34 game season rated 8.6 won no month in 2,000 identities, so the floor cases hold nothing`);
}

/* ─── the fleet ────────────────────────────────────────────────────────── */

const seeded = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const copy = v => JSON.parse(JSON.stringify(v));
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const NATIONS = ['England', 'Brazil', 'France', 'Spain', 'Germany', 'Argentina', 'Italy', 'Netherlands', 'Nigeria', 'Japan'];
const STARTS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];
const groupOf = pos => (pos === 'GK' ? 'GK' : ['ST', 'CAM', 'LW', 'RW'].includes(pos) ? 'ATT' : ['CM', 'CDM'].includes(pos) ? 'MID' : 'DEF');
const FLEET = [];
for (let k = 0; k < SEEDS; k += 1) {
  for (let si = 0; si < STARTS.length; si += 1) {
    for (let p = 0; p < POSITIONS.length; p += 1) {
      const seed = (SEED_OFFSET * SEEDS + k) * 100 + si * 10 + p + 1;
      FLEET.push({ seed, start: STARTS[si], pos: POSITIONS[p], nation: NATIONS[(k + p + si) % NATIONS.length],
        ovr: 50 + ((seed * 7) % 26), pot: 72 + ((seed * 11) % 24) });
    }
  }
}

/** One move of the drive's policy, the same for every bundle. */
function step(M, s, seed) {
  const clubs = M.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = (s.pendingOffers || []).find(x => !x.isLoan) || (s.pendingOffers || [])[0]; return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, seed % 3);
    case 'random_events': {
      const ev = s.pendingEvents && s.pendingEvents[0];
      if (!ev) return { ...s, pendingEvents: [], phase: 'playing' };
      return M.applyEventChoice(s, (seed + ev.id + s.seasons.length) % Math.max(1, ev.choices.length), clubs);
    }
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { let t = M.dismissSocialMediaPhase(s, clubs); if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs); return t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return s.pendingWorldCup && s.pendingWorldCup.result === 'Winner' ? M.applyWorldCupSpeech(s, 'for_the_country', clubs) : M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (!sit || sit.type === 'no_interest') return M.stayAtClub(s);
      if (sit.type === 'contract_expiry') return seed % 2 ? M.signExtension(s) : (sit.offers && sit.offers[0] ? M.acceptOffer(s, sit.offers[0]) : M.stayAtClub(s));
      if (sit.type === 'one_offer') return seed % 2 === 0 ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      if (sit.type === 'bidding_war') return M.acceptOffer(s, sit.offerA);
      if (sit.type === 'dream_club') return M.acceptOffer(s, sit.offer);
      if (sit.type === 'request_result') return sit.offer ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      return M.stayAtClub(s);
    }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}

const MONTH_LINE = /^🏆 Won Player of the Month \((\w+) (\d{4})\)!$/u;
const WON_LINE = /^(?:🌍 .+ won the .+\.|🏆 .+ won the .+ without you\.)$/u;

/** Drives one career to its end on bundle B and keeps what every section reads, one record a season. The
 *  feed is emptied before every move, so after the season's move it holds that season's lines only. */
function drive(B, c) {
  const M = B.engine;
  const recs = [];
  const real = Math.random;
  Math.random = seeded(c.seed);
  try {
    let s = M.initCareer(`Truth ${c.seed}`, c.nation, c.pos, `${Math.floor(c.start / 10) * 10}s`, stats(c.ovr), c.ovr, c.start, M.FALLBACK_CLUBS, null, c.pot);
    let n = s.seasons.length;
    for (let guard = 0; guard < 400 && !s.retired; guard += 1) {
      if (s.phone && Array.isArray(s.phone.feed) && s.phone.feed.length) s = { ...s, phone: { ...s.phone, feed: [] } };
      const next = step(M, s, c.seed);
      if (!next) break;
      s = next;
      if (s.seasons.length <= n) continue;
      n = s.seasons.length;
      const row = s.seasons[n - 1];
      const mine = Math.random;
      Math.random = seeded(7);
      try { recs.push(recordOf(B, s, row, c)); } finally { Math.random = mine; }
    }
    /* the finished save's size, for a reading beside the base's (the feed is emptied the same way on both) */
    recs.size = JSON.stringify(s).length;
    /* his own Ballon d'Or finish in every season he played, read off the finished save (the night writes it) */
    recs.bdor = (s.seasons || []).filter(r => r.type === 'playing').map(r => [r.ballonDorRank ?? null, !!r.ballonDor]);
  } finally { Math.random = real; }
  return recs;
}

function recordOf(B, s, row, c) {
  const w = B.phone.phoneWorld(s);
  const t = s.lastTournament && s.lastTournament.year === row.year ? s.lastTournament : null;
  const hist = (s.intlHistory || []).filter(h => h.year === row.year).pop() || null;
  const save = JSON.stringify({ seasons: s.seasons, awards: s.awards, world: w });
  /* A right answer is in the save as written, or (a rating printed to one decimal) as the number the row holds. */
  const inSave = right => save.includes(JSON.stringify(right).slice(1, -1)) || (/^\d+\.\d$/.test(right) && save.includes(`"rating":${Number(right)},`));
  const quiz = B.arcade.arcadeQuestions(copy(s)).map(q => ({ q: q.q, right: q.options[q.answer], inSave: inSave(q.options[q.answer]) }));
  const clubs = {};
  for (const [name, club] of Object.entries(s.phone && s.phone.clubs ? s.phone.clubs : {})) if (ERA.has(name)) clubs[name] = club;
  return {
    seed: c.seed, start: c.start, pos: c.pos, group: groupOf(c.pos), nation: s.nationality, player: s.playerName, club: s.currentClub,
    year: row.year, type: row.type, apps: row.apps, goals: row.goals, assists: row.assists, cs: row.cleanSheets ?? 0, rating: row.rating,
    injuryWeeks: row.injuryWeeks ?? 0, tournament: row.tournament ?? null, tResult: row.tournamentResult ?? null,
    potm: (s.awards || []).filter(a => a.name === 'Player of the Month' && a.year === row.year).length,
    monthLines: (s.events || []).filter(e => e.startsWith('🏆 Won Player of the Month')),
    wonLines: (s.events || []).filter(e => WON_LINE.test(e)),
    feed: s.phone && Array.isArray(s.phone.feed) ? s.phone.feed.slice() : [],
    world: w ? copy(w) : null, clubs,
    t: t ? { year: t.year, name: t.name, champion: t.champion, myResult: t.myResult } : null,
    hist: hist ? { myResult: hist.myResult, champion: hist.champion } : null,
    rival: s.rival ? s.rival.name : null,
    quiz, quizReady: quiz.length === 3,
  };
}

const t0 = Date.now();
const needFleet = ['1', '3', '4', '5'].some(runs);
const headRecs = needFleet ? FLEET.map(c => drive(HEAD, c)) : [];
const t1 = Date.now();
const baseRecs = needFleet ? FLEET.map(c => drive(BASEB, c)) : [];
const flatHead = headRecs.flat(), flatBase = baseRecs.flat();
if (needFleet) {
  const kb = recs => { const v = recs.map(r => r.size).filter(Number.isFinite).sort((a, b) => a - b); return v.length ? `mean ${(v.reduce((a, b) => a + b, 0) / v.length / 1024).toFixed(1)} KB, median ${(v[v.length >> 1] / 1024).toFixed(1)} KB` : 'none'; };
  console.log(`finished saves: this tree ${kb(headRecs)}, the base ${kb(baseRecs)} (a reading, not a check)`);
  /* Re-seating a real nominee at his era club also moves his honours points on the night, so the order can move
     (the review's finding 11). His own finish, base against this tree: a reading, not a check, since the careers
     part ways at the first month award and a test of "no difference" would pass for want of data. */
  const bd = all => {
    let n = 0, won = 0, top3 = 0, nom = 0;
    for (const recs of all) for (const [rank, w] of recs.bdor || []) { n += 1; if (w) won += 1; if (rank && rank <= 3) top3 += 1; if (rank && rank <= 10) nom += 1; }
    return `${won} won, ${top3} top three, ${nom} in the top ten, of ${n} seasons played`;
  };
  console.log(`his own Ballon d'Or: this tree ${bd(headRecs)}; the base ${bd(baseRecs)} (a reading, not a check)`);
}
console.log(`fleet: ${FLEET.length} careers a tree (seed offset ${SEED_OFFSET}, ${SEEDS} seeds), ${flatHead.length} seasons on this tree in ${Math.round((t1 - t0) / 1000)} s, ${flatBase.length} on the base`);

/* ─── 1. months ────────────────────────────────────────────────────────── */

/* Design bands, set from the fleet (readings in the header's MEASURED block): a season rated 8.0 or more
   wins one to three months on average, one rated 7.0 to 7.5 wins any in well under one season in three, and
   at 7.5 to 8.5 each position group's mean is within 30 percent of the four groups together. */
const GREAT_BAND = [1.0, 3.0];
const FAIR_ANY_MAX = 0.2;
const GROUP_BAND = 0.3;
const GROUP_MIN_SEASONS = 40;
function monthAudit(recs) {
  const a = { seasons: 0, won: 0, floor: 0, zeroKeeper: 0, zeroKeeperSeasons: 0, badYear: 0, mismatch: 0, examples: [] };
  const bins = { great: [0, 0], fair: [0, 0], groups: {} };
  for (const r of recs) {
    if (r.type === 'youth') continue;
    a.seasons += 1; a.won += r.potm;
    const under = !(r.apps >= 10) || !(r.rating >= 6.8);
    if (under && r.potm > 0) { a.floor += 1; if (!a.floorEx) a.floorEx = (`${r.pos} ${r.year}: ${r.apps} games rated ${r.rating}, ${r.potm} won`); }
    if (r.group === 'GK' && r.goals === 0 && r.rating <= 6.0 && r.apps > 0) { a.zeroKeeperSeasons += 1; if (r.potm > 0) a.zeroKeeper += 1; }
    if (r.monthLines.length !== r.potm) a.mismatch += 1;
    for (const line of r.monthLines) {
      const m = line.match(MONTH_LINE);
      if (!m || Number(m[2]) !== T.monthYear(m[1], r.year)) { a.badYear += 1; if (!a.yearEx) a.yearEx = (`"${line}" in the ${r.year} season`); }
    }
    if (r.type !== 'playing' || !(r.apps > 0)) continue;
    if (r.rating >= 8.0) { bins.great[0] += 1; bins.great[1] += r.potm; }
    if (r.rating >= 7.0 && r.rating < 7.5) { bins.fair[0] += 1; bins.fair[1] += r.potm > 0 ? 1 : 0; }
    if (r.rating >= 7.5 && r.rating < 8.5) {
      const k = Math.min(9, Math.floor(Math.round((r.rating - 7.5) * 100) / 10));
      const g = (bins.groups[r.group] ||= Array.from({ length: 10 }, () => [0, 0])); g[k][0] += 1; g[k][1] += r.potm;
      const all = (bins.groups.ALL ||= Array.from({ length: 10 }, () => [0, 0])); all[k][0] += 1; all[k][1] += r.potm;
    }
  }
  a.great = bins.great[0] ? bins.great[1] / bins.great[0] : NaN;
  a.fairAny = bins.fair[0] ? bins.fair[1] / bins.fair[0] : NaN;
  /* At equal season rating: each group's mean in every 0.1 stratum of 7.5 to 8.5, weighted by the whole
     fleet's mix of strata, so a group whose seasons sit higher in the band is not credited for that. */
  const allS = bins.groups.ALL || Array.from({ length: 10 }, () => [0, 0]);
  const allN = allS.reduce((s, x) => s + x[0], 0);
  a.groupAll = allN ? allS.reduce((s, x) => s + x[1], 0) / allN : NaN;
  a.groups = Object.fromEntries(['GK', 'DEF', 'MID', 'ATT'].map(g => {
    const S = bins.groups[g];
    if (!S) return [g, { n: 0, mean: NaN }];
    let w = 0, m = 0;
    for (let k = 0; k < 10; k += 1) if (S[k][0] > 0) { w += allS[k][0]; m += allS[k][0] * (S[k][1] / S[k][0]); }
    return [g, { n: S.reduce((s, x) => s + x[0], 0), mean: w ? m / w : NaN }];
  }));
  a.counts = { great: bins.great[0], fair: bins.fair[0] };
  return a;
}
SECTION = '1';
console.log('1) Player of the Month reads the month\'s football, with the true year');
if (runs('1')) {
  const h = monthAudit(flatHead), b = monthAudit(flatBase);
  const g = x => ['GK', 'DEF', 'MID', 'ATT'].map(k => `${k} ${r2(x.groups[k].mean)} (${x.groups[k].n})`).join(', ');
  console.log(`   this tree: ${h.won} months over ${h.seasons} seasons; rated 8.0+ ${r2(h.great)} a season (${h.counts.great}), 7.0 to 7.5 any ${r2(h.fairAny)} (${h.counts.fair}); at 7.5 to 8.5 all ${r2(h.groupAll)}: ${g(h)}`);
  console.log(`   base:      ${b.won} months over ${b.seasons} seasons; rated 8.0+ ${r2(b.great)} a season (${b.counts.great}), 7.0 to 7.5 any ${r2(b.fairAny)} (${b.counts.fair}); at 7.5 to 8.5 all ${r2(b.groupAll)}: ${g(b)}`);
  console.log(`   under the floor and still won: ${h.floor} here, ${b.floor} on the base; 0 goal keepers rated 6.0 or less who won: ${h.zeroKeeper} of ${h.zeroKeeperSeasons} here, ${b.zeroKeeper} of ${b.zeroKeeperSeasons} on the base`);
  console.log(`   month lines with the wrong year: ${h.badYear} here, ${b.badYear} on the base; seasons whose lines and awards disagree: ${h.mismatch} here, ${b.mismatch} on the base`);
  if (h.floor) fail(`${h.floor} seasons under the floor (fewer than 10 games or rated under 6.8) won a month, for example ${h.floorEx}`);
  if (h.zeroKeeper) fail(`${h.zeroKeeper} seasons of a 0 goal keeper rated 6.0 or less won a month`);
  if (h.badYear) fail(`${h.badYear} month lines print a year that is not the month's own: ${h.yearEx}`);
  if (h.mismatch) fail(`${h.mismatch} seasons print a different number of month lines than awards`);
  if (!(h.great >= GREAT_BAND[0] && h.great <= GREAT_BAND[1])) fail(`a season rated 8.0 or more wins ${r2(h.great)} months on average, the band is ${GREAT_BAND.join(' to ')}`);
  if (!(h.fairAny < FAIR_ANY_MAX)) fail(`a season rated 7.0 to 7.5 wins a month ${r2(h.fairAny)} of the time, it must stay under ${FAIR_ANY_MAX}`);
  for (const k of ['GK', 'DEF', 'MID', 'ATT']) {
    const x = h.groups[k];
    if (x.n < GROUP_MIN_SEASONS) { fail(`only ${x.n} ${k} seasons rated 7.5 to 8.5, too few to compare (lengthen the fleet)`); continue; }
    if (!(Math.abs(x.mean / h.groupAll - 1) <= GROUP_BAND)) fail(`${k} wins ${r2(x.mean)} months a season at 7.5 to 8.5 (rating for rating) against ${r2(h.groupAll)} for all four groups, outside ${GROUP_BAND * 100} percent`);
  }
  /* Planted: 10,000 identities of a 0 goal keeper rated 6.0 with plenty of clean sheets. */
  let planted = 0;
  for (let i = 0; i < 10000; i += 1) {
    const id = `Keeper ${i}|${['1990s', '2000s', '2010s', '2020s'][i % 4]}|${NATIONS[i % NATIONS.length]}|GK`;
    planted += T.monthAwards({ apps: 34, goals: 0, assists: 0, cleanSheets: 14, rating: 6.0, injuryWeeks: 0 }, 'GK', HEAD.keyed.keyedRng(`${id}|${1990 + (i % 40)}|potm`)).length;
  }
  console.log(`   planted: a 0 goal keeper rated 6.0 over 10,000 identities won ${planted} months`);
  if (planted) fail(`the planted 0 goal keeper rated 6.0 won ${planted} months`);
}

/* ─── 2. the stream ────────────────────────────────────────────────────── */

/* What this round may change, and nothing else: Player of the Month awards and their lines, the season log's
   tournament winner lines, the phone's who plays where map, its moves, its top scorer and its feed, and on the
   Ballon d'Or night the clubs (so the points and order) of other nominees. */
const ROUND_LINE = l => typeof l === 'string' && (l.startsWith('🏆 Won Player of the Month') || WON_LINE.test(l) || l.startsWith('⚽ Solid season at '));
function normal(s) {
  const o = copy(s);
  o.awards = (o.awards || []).filter(a => a.name !== 'Player of the Month');
  o.events = (o.events || []).filter(l => !ROUND_LINE(l));
  delete o.story;
  if (o.phone) { delete o.phone.clubs; delete o.phone.feed; if (o.phone.world) { delete o.phone.world.moves; delete o.phone.world.topScorer; } }
  if (o.pendingBallonDor) o.pendingBallonDor = { year: o.pendingBallonDor.year, rank: o.pendingBallonDor.playerRank, points: o.pendingBallonDor.playerPoints };
  return o;
}
/** The archived season logs agree once this round's lines are out, as far as the shorter of the two runs. */
function storiesAgree(a, b) {
  const x = a.story || [], y = b.story || [];
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i += 1) {
    if (x[i].year !== y[i].year || x[i].club !== y[i].club) return false;
    const lx = x[i].lines.filter(l => !ROUND_LINE(l)), ly = y[i].lines.filter(l => !ROUND_LINE(l));
    const n = Math.min(lx.length, ly.length);
    if (JSON.stringify(lx.slice(0, n)) !== JSON.stringify(ly.slice(0, n))) return false;
  }
  return true;
}
const topDiff = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = [];
  for (const k of keys) {
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    if (k === 'phone' && a.phone && b.phone) { for (const p of new Set([...Object.keys(a.phone), ...Object.keys(b.phone)])) if (JSON.stringify(a.phone[p]) !== JSON.stringify(b.phone[p])) out.push(`phone.${p}`); }
    else out.push(k);
  }
  return out;
};
const ALLOWED_FIRST = new Set(['awards', 'events', 'phone.clubs', 'phone.world', 'phone.feed', 'pendingBallonDor']);

function lockstep(c) {
  const sides = [HEAD, BASEB].map(B => ({ M: B.engine, rand: seeded(c.seed), calls: 0, marks: [] }));
  const run = (side, fn) => {
    const real = Math.random;
    side.marks = [];
    Math.random = () => { side.calls += 1; return side.rand(); };
    globalThis.__r1329Mark = (kind, v) => { side.marks.push({ kind, calls: side.calls, v }); };
    try { return fn(); } finally { Math.random = real; globalThis.__r1329Mark = undefined; }
  };
  const [h, b] = sides;
  let sh = run(h, () => h.M.initCareer(`Stream ${c.seed}`, c.nation, c.pos, `${Math.floor(c.start / 10) * 10}s`, stats(c.ovr), c.ovr, c.start, h.M.FALLBACK_CLUBS, null, c.pot));
  let sb = run(b, () => b.M.initCareer(`Stream ${c.seed}`, c.nation, c.pos, `${Math.floor(c.start / 10) * 10}s`, stats(c.ovr), c.ovr, c.start, b.M.FALLBACK_CLUBS, null, c.pot));
  const out = { steps: 0, seasons: 0, months: 0, ticks: 0, worlds: 0, problems: [], first: null, firstStep: null, diverged: false };
  let rawEqual = true;
  for (let guard = 0; guard < 400; guard += 1) {
    if (sh.retired && sb.retired) break;
    const nh = run(h, () => step(h.M, sh, c.seed)), nb = run(b, () => step(b.M, sb, c.seed));
    if (!nh || !nb) break;
    out.steps += 1;
    const mh = h.marks, mb = b.marks;
    if (mh.map(m => m.kind).join() !== mb.map(m => m.kind).join()) out.problems.push(`step ${out.steps}: marks ${mh.map(m => m.kind)} against ${mb.map(m => m.kind)}`);
    else {
      for (let i = 0; i < mh.length; i += 1) {
        if (mh[i].calls !== mb[i].calls) out.problems.push(`step ${out.steps} (${nb.seasons.at(-1)?.year}): Math.random count at the end of the ${mh[i].kind === 'month' ? 'month block' : 'world tick'} ${mh[i].calls} against ${mb[i].calls}`);
        if (mh[i].kind === 'tick' && mh[i].v !== mb[i].v) out.problems.push(`step ${out.steps} (${nb.seasons.at(-1)?.year}): phone seed after the tick ${mh[i].v} against ${mb[i].v}`);
        if (mh[i].kind === 'month') out.months += 1; else out.ticks += 1;
      }
    }
    if (h.calls !== b.calls) out.problems.push(`step ${out.steps}: Math.random count at the end of the step ${h.calls} against ${b.calls}`);
    const wh = nh.phone?.world, wb = nb.phone?.world;
    if (wh && wb) {
      out.worlds += 1;
      for (const k of ['year', 'ucl', 'leagues', 'cups', 'intl']) if (JSON.stringify(wh[k]) !== JSON.stringify(wb[k])) out.problems.push(`step ${out.steps}: world.${k} differs from the base`);
    }
    if (nb.seasons.length > sb.seasons.length) out.seasons += 1;
    sh = nh; sb = nb;
    if (rawEqual && JSON.stringify(sh) !== JSON.stringify(sb)) {
      rawEqual = false;
      out.first = topDiff(sh, sb); out.firstStep = out.steps;
    }
    if (out.problems.length) break;
    if (!rawEqual) {
      const xh = normal(sh), xb = normal(sb);
      const same = JSON.stringify(xh) === JSON.stringify(xb);
      if (!same || !storiesAgree(sh, sb)) { out.diverged = true; out.ended = same ? 'story' : topDiff(xh, xb).join(' '); break; }
    }
  }
  return out;
}
SECTION = '2';
console.log('2) The month award and the world tick leave the season\'s draws where they were');
if (runs('2')) {
  const careers = [];
  for (const start of [1990, 2000, 2010, 2020, 2025]) for (let p = 0; p < POSITIONS.length; p += 1) for (let k = 0; k < 4; k += 1) {
    const seed = 50000 + SEED_OFFSET * 1000 + start * 0 + careers.length;
    careers.push({ seed, start, pos: POSITIONS[p], nation: NATIONS[(p + k) % NATIONS.length], ovr: 50 + ((seed * 7) % 26), pot: 72 + ((seed * 11) % 24) });
  }
  let steps = 0, seasons = 0, months = 0, ticks = 0, worlds = 0, problems = 0, diverged = 0, never = 0, badFirst = 0;
  const firsts = new Map(), ends = new Map();
  for (const c of careers) {
    const r = lockstep(c);
    steps += r.steps; seasons += r.seasons; months += r.months; ticks += r.ticks; worlds += r.worlds;
    if (r.problems.length) { problems += 1; fail(`career ${c.seed} (${c.pos}, ${c.start}): ${r.problems[0]}`); }
    if (r.diverged) { diverged += 1; ends.set(r.ended, (ends.get(r.ended) || 0) + 1); }
    if (!r.first) never += 1;
    else {
      const key = r.first.join(' ');
      firsts.set(key, (firsts.get(key) || 0) + 1);
      if (!r.first.some(f => ALLOWED_FIRST.has(f))) { badFirst += 1; fail(`career ${c.seed}: the first fields to differ from the base (step ${r.firstStep}) are ${key}, none of them this round's`); }
    }
  }
  console.log(`   ${careers.length} careers in lockstep with the base: ${steps} steps, ${seasons} seasons, ${months} month blocks and ${ticks} world ticks compared, ${worlds} world records; ${problems} careers with a count, seed or record off the base`);
  console.log(`   first fields to differ: ${[...firsts].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join('; ')}; never differed ${never}; compared until a season's input differed in ${diverged}, by ${[...ends].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join('; ')}`);
  if (months < careers.length * 2 || ticks < careers.length * 2) fail(`only ${months} month blocks and ${ticks} world ticks were compared`);
  plantedDraws();
}

/* Planted (the review's finding 2): the fleet seldom reaches 30 or 35 goals, so the lockstep had no reliable
   power over the old lottery's two guarantee loops (one deleted stayed green). The base's whole month block and
   this tree's legacyMonthDraws, each lifted from its own source with its own rand, run alone under the same
   seeded Math.random for every goal count from 0 to 45 and 200 seeds: the number of calls must be the same in
   every case, and at 30 and 35 goals the loops must really add calls, so the case has something to hold. */
function plantedDraws() {
  const lf = s => s.replace(/\r\n/g, '\n');
  /* each read sits straight inside lf(), so simHarnessAnchors sees it normalised (a read behind ?? it cannot follow) */
  const controlled = controlSources.get(ENGINE);
  const headSrc = controlled != null ? lf(controlled) : lf(fs.readFileSync(path.join(ROOT, ENGINE), 'utf8'));
  const baseSrc = lf(execFileSync('git', ['show', `${BASE}:${ENGINE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const cut = (src, from, to, where) => {
    const a = src.indexOf(from), b = a < 0 ? -1 : src.indexOf(to, a + from.length);
    if (a < 0 || b < 0 || src.indexOf(from, a + 1) >= 0) { fail(`planted draws: ${where} does not hold ${JSON.stringify(from.slice(0, 48))} once with its end after it`); return null; }
    return src.slice(a, b);
  };
  const RAND = 'const rand = (min: number, max: number) => ';
  const hRand = cut(headSrc, RAND, '\n', 'this tree\'s engine'), bRand = cut(baseSrc, RAND, '\n', 'the base engine');
  const hDraws = cut(headSrc, '  const legacyMonthDraws = (goals: number): number => {', '\n  };\n', 'this tree\'s engine');
  const bBlock = cut(baseSrc, '  // Awards: Player of the Month, simulate month-by-month based on goals\n', '  if (potmCount > 0) {', 'the base engine');
  if (!hRand || !bRand || !hDraws || !bBlock) return;
  const lift = code => new Function(`return ${esbuild.transformSync(code, { loader: 'ts' }).code}`)();
  const head = lift(`(() => { ${hRand}\n${hDraws}\n  };\n  return legacyMonthDraws; })()`);
  const base = lift(`(() => { ${bRand}\n  return (season: { goals: number; apps: number }) => {\n${bBlock}  }; })()`);
  const calls = (fn, arg, seed) => {
    const real = Math.random, r = seeded(seed);
    let n = 0;
    Math.random = () => { n += 1; return r(); };
    try { fn(arg); } finally { Math.random = real; }
    return n;
  };
  let cases = 0, off = 0, extra30 = 0, extra35 = 0, offEx = '';
  for (let goals = 0; goals <= 45; goals += 1) {
    for (let k = 0; k < 200; k += 1) {
      const seed = 91000 + SEED_OFFSET * 10000 + goals * 200 + k;
      const b = calls(base, { goals, apps: 30 }, seed), h = calls(head, goals, seed);
      cases += 1;
      if (b !== h) { off += 1; if (!offEx) offEx = `${goals} goals, seed ${seed}: base ${b} calls, this tree ${h}`; }
      if (goals === 30) extra30 += h - 20;
      if (goals === 35) extra35 += h - 20;
    }
  }
  console.log(`   planted: the old lottery's draws lifted from both engines, ${cases} cases (0 to 45 goals, 200 seeds each): ${off} with a different number of calls; calls past the twenty plain draws at 30 goals ${extra30}, at 35 goals ${extra35}`);
  if (off) fail(`${off} planted cases make a different number of Math.random calls than the base's month block, for example ${offEx}`);
  if (!(extra30 > 0) || !(extra35 > 0)) fail(`the guarantee loops added ${extra30} calls at 30 goals and ${extra35} at 35, so the planted case holds nothing`);
}

/* ─── 3. the feed ──────────────────────────────────────────────────────── */

const LINE = {
  move: /^🔄 DONE DEAL\. (.+) joins (.+) from (.+)\. Fee around (\d+)m\.$/u,
  rival: /^🔄 (.+) has left (.+) for (.+)\.$/u,
  europe: /^⭐ (.+) are champions of Europe\.$/u,
  title: /^🏆 (.+) win (?:the )?(.+)\.$/u,
  top: /^🥅 (.+) finished top scorer in (.+) on (\d+)\.$/u,
  summer: /^🌍 (.+) win the (.+)\.$/u,
};
/** A whole club name in a line, not a club whose name merely contains it (Inter in Inter Miami). */
const namesClub = (line, club) => new RegExp(`(^|[ .,])${club.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([ .,!]|$)`, 'u').test(line);
function feedAudit(recs) {
  const a = { seasons: 0, past: 0, future: 0, pastName: 0, pastClaim: 0, summer: 0, honest: 0, framing: 0, record: 0, unknown: 0,
    realMove: 0, realTop: 0, clubs: 0, own: 0, lines: 0, futureClaims: 0, generatedMoves: 0, ex: {} };
  const ex = (k, m) => { if (!a.ex[k]) a.ex[k] = m; };
  for (const r of recs) {
    const w = r.world;
    if (!w || w.year !== r.year) continue;
    a.seasons += 1;
    const happened = T.seasonHappened(r.year);
    if (happened) a.past += 1; else a.future += 1;
    a.lines += r.feed.length;
    const pastLine = T.feedPastSeasonLine(r.year), futureLine = T.feedFutureSeasonLine(r.year);
    if (happened && r.feed.filter(l => l === pastLine).length !== 1) { a.honest += 1; ex('honest', `the ${r.year} season has no honest line: ${JSON.stringify(r.feed).slice(0, 160)}`); }
    if (!happened && (r.feed.filter(l => l === futureLine).length !== 1 || r.feed[r.feed.length - 1] !== futureLine)) { a.framing += 1; ex('framing', `the ${r.year} season does not open with its framing line on screen: ${JSON.stringify(r.feed).slice(0, 160)}`); }
    for (const line of r.feed) {
      if (r.player && line.includes(r.player)) { a.own += 1; ex('own', `the feed names the player: "${line}"`); }
      if (r.club && namesClub(line, r.club)) { a.own += 1; ex('own', `the feed names his club: "${line}"`); }
      if (line === pastLine || line === futureLine) continue;
      const mv = line.match(LINE.move), rv = line.match(LINE.rival), eu = line.match(LINE.europe), ti = line.match(LINE.title), tp = line.match(LINE.top), su = line.match(LINE.summer);
      /* The rival's line names a generated man (Round 499's generator, simInventedNames), whose first name may be
         an era star's single name ("Xavi Kovac"): it is the one line every year keeps. */
      if (happened && !(rv && rv[1] === r.rival) && ERA_NAMES.some(n => line.includes(n))) { a.pastName += 1; ex('pastName', `${r.year}: a real name in "${line}"`); }
      if (happened && (mv || eu || ti || tp)) { a.pastClaim += 1; ex('pastClaim', `${r.year}: "${line}"`); }
      if (!happened && (eu || ti)) a.futureClaims += 1;
      /* The feed is world news: a summer that happened names no winner here, even finals he played. */
      if (su && T.summerHappened(r.year)) { a.summer += 1; ex('summer', `${r.year}: a summer that happened (he was ${r.hist && r.hist.myResult ? r.hist.myResult : 'not there'}), "${line}"`); }
      if (mv) {
        if (!w.moves.some(x => x.who === mv[1] && x.to === mv[2] && x.from === mv[3] && String(x.fee) === mv[4])) a.record += 1;
        if (ERA.has(mv[1])) { a.realMove += 1; ex('realMove', `${r.year}: a real man moved, "${line}"`); } else a.generatedMoves += 1;
      } else if (rv) { if (rv[1] !== r.rival) a.record += 1; }
      else if (eu) { if (w.ucl !== eu[1]) a.record += 1; }
      else if (tp) {
        if (!w.topScorer || w.topScorer.who !== tp[1] || String(w.topScorer.goals) !== tp[3]) a.record += 1;
        if (ERA.has(tp[1])) { a.realTop += 1; ex('realTop', `${r.year}: a real top scorer, "${line}"`); }
      } else if (ti) { if (w.leagues[ti[2].replace(/^the /, '')] !== ti[1]) a.record += 1; }
      else if (su) { if (!w.intl || w.intl.champion !== su[1] || w.intl.name !== su[2]) a.record += 1; }
      else { a.unknown += 1; ex('unknown', `${r.year}: a line of no known shape, "${line}"`); }
    }
    for (const mv of w.moves) if (ERA.has(mv.who)) a.realMove += 1;
    if (w.topScorer && ERA.has(w.topScorer.who)) a.realTop += 1;
    for (const [name, club] of Object.entries(r.clubs)) {
      const years = ERA.get(name);
      const given = years.get(r.year);
      const ok = given !== undefined ? club === given : [...years].some(([y, c]) => y <= r.year && c === club);
      if (!ok) { a.clubs += 1; ex('clubs', `${r.year}: ${name} sits at ${club}, his era pool says ${given ?? [...years.values()].join(' or ')}`); }
    }
  }
  return a;
}
SECTION = '3';
console.log('3) The phone\'s world says nothing it cannot stand behind');
if (runs('3')) {
  const h = feedAudit(flatHead), b = feedAudit(flatBase);
  const row = x => `real names in a past season ${x.pastName}, past champions, transfers or scorers ${x.pastClaim}, a winner of a summer that happened ${x.summer}, moves of real men ${x.realMove}, real top scorers ${x.realTop}, real men off their era club ${x.clubs}, lines off the record ${x.record}`;
  console.log(`   this tree: ${h.seasons} seasons (${h.past} happened, ${h.future} to come), ${h.lines} lines, ${h.futureClaims} champion lines in seasons to come, ${h.generatedMoves} moves of generated men`);
  console.log(`              ${row(h)}`);
  console.log(`   base:      ${b.seasons} seasons, ${b.lines} lines; ${row(b)}`);
  console.log(`   lines naming the player or his club: ${h.own} here (${h.ex.own ?? 'none'}), ${b.own} on the base (${b.ex.own ?? 'none'})`);
  for (const k of ['pastName', 'pastClaim', 'summer', 'realMove', 'realTop', 'clubs', 'record', 'unknown', 'honest', 'framing']) {
    if (h[k]) fail(`${h[k]} findings of kind ${k}, for example ${h.ex[k] ?? '(no line kept)'}`);
  }
  if (h.past < 200 || h.future < 200) fail(`the fleet reached ${h.past} seasons that happened and ${h.future} to come, too few to say anything`);
  if (h.futureClaims < h.future) fail(`only ${h.futureClaims} champion lines over ${h.future} seasons to come: the game's own future went quiet`);
}

/* ─── 4. the quiz ──────────────────────────────────────────────────────── */

const WORLD_Q = [/champions of Europe/, /^Who won /, / move to in /, / finish on in /];
const REAL_Q = [/ move to in /, / finish on in /];
const CHAMP_Q = [/champions of Europe/, /^Who won /];
function quizAudit(recs) {
  const a = { seasons: 0, ready: 0, world: 0, real: 0, missing: 0, worldAsked: 0, bareYear: 0, champAsked: 0, examples: [] };
  for (const r of recs) {
    if (r.type === 'youth') continue;
    a.seasons += 1;
    if (r.quizReady) a.ready += 1;
    for (const q of r.quiz) {
      const isWorld = WORLD_Q.some(re => re.test(q.q));
      if (isWorld) a.worldAsked += 1;
      /* a champion question names its season in full (2026-27), never the bare start year (the review's finding 7) */
      if (CHAMP_Q.some(re => re.test(q.q)) && r.world) { a.champAsked += 1; const y = r.world.year; if (!q.q.includes(`in ${y}-${String((y + 1) % 100).padStart(2, '0')}?`)) { a.bareYear += 1; if (a.examples.length < 4) a.examples.push(`${y}: "${q.q}" does not name the season in full`); } }
      if (isWorld && r.world && T.seasonHappened(r.world.year)) { a.world += 1; if (a.examples.length < 4) a.examples.push(`${r.world.year}: "${q.q}" (${q.right})`); }
      if (REAL_Q.some(re => re.test(q.q)) && r.world && r.world.year <= T.LAST_REAL_YEAR) { a.real += 1; if (a.examples.length < 4) a.examples.push(`${r.world.year}: "${q.q}"`); }
      if (!q.inSave) a.missing += 1;
    }
  }
  a.rate = a.seasons ? a.ready / a.seasons : NaN;
  return a;
}
SECTION = '4';
console.log('4) The phone\'s quiz asks about the world only where the world is the game\'s own');
if (runs('4')) {
  const h = quizAudit(flatHead), b = quizAudit(flatBase);
  console.log(`   this tree: three questions in ${h.ready} of ${h.seasons} seasons (${r2(h.rate)}); world questions about a season that happened ${h.world}, about a real man ${h.real}, answers not in the save ${h.missing}, world questions asked ${h.worldAsked}, champion questions without the full season ${h.bareYear} of ${h.champAsked}`);
  console.log(`   base:      three questions in ${b.ready} of ${b.seasons} seasons (${r2(b.rate)}); world questions about a season that happened ${b.world}, about a real man ${b.real}, answers not in the save ${b.missing}`);
  for (const e of h.examples) console.log(`     e.g. ${e}`);
  if (h.world) fail(`${h.world} quiz questions about the world in a season that happened`);
  if (h.real) fail(`${h.real} quiz questions about a real man's move or goals`);
  if (h.missing) fail(`${h.missing} quiz answers are not in the save`);
  if (h.bareYear) fail(`${h.bareYear} champion questions name a bare year, not the season in full`);
  if (h.champAsked < 100) fail(`only ${h.champAsked} champion questions were asked, too few to judge their wording`);
  if (!(h.rate >= b.rate)) fail(`the quiz is ready in ${r2(h.rate)} of seasons against ${r2(b.rate)} on the base`);
  /* Old saves: careers the base drove to its 2028 world, which still holds real men's moves and a real top
     scorer, read by this tree's quiz (through JSON, the way a save loads). */
  let olds = 0, realMovesHeld = 0, asked = 0, realAsked = 0, playedOn = 0, threw = 0, phoneFields = 0, movedLeft = 0, tickless = 0;
  for (let i = 0; i < 40; i += 1) {
    const c = { seed: 70000 + SEED_OFFSET * 100 + i, start: 2021, pos: POSITIONS[i % 10], nation: NATIONS[i % 10], ovr: 60 + (i % 12), pot: 85 };
    const real = Math.random;
    Math.random = seeded(c.seed);
    let s;
    try {
      const M = BASEB.engine;
      s = M.initCareer(`Old ${c.seed}`, c.nation, c.pos, '2020s', stats(c.ovr), c.ovr, c.start, M.FALLBACK_CLUBS, null, c.pot);
      for (let guard = 0; guard < 300 && !s.retired && !(s.phone?.world?.year >= 2028); guard += 1) { const n = step(M, s, c.seed); if (!n) break; s = n; }
    } finally { Math.random = real; }
    const w = s.phone?.world;
    if (!w || w.year !== 2028) continue;
    olds += 1;
    if (w.moves.some(m => ERA.has(m.who)) || (w.topScorer && ERA.has(w.topScorer.who))) realMovesHeld += 1;
    const old = HEAD.engine.repairCareer(JSON.parse(JSON.stringify(s)));
    for (const q of HEAD.arcade.arcadeQuestions(old)) { asked += 1; if (REAL_Q.some(re => re.test(q.q))) realAsked += 1; }
    /* and plays on here: a season from the old save throws nothing, re seats the real men it moved, and adds no
       field to the phone */
    const again = Math.random;
    Math.random = seeded(c.seed + 7);
    try {
      let t = old;
      const n0 = t.seasons.length, y0 = t.phone.world.year;
      /* Play on until the world has ticked, not just one season: a season that ends in a long injury returns
         before worldSeasonTick (its one caller in the engine), so its world stays at 2028 with the base's moves
         still in phone.clubs, and nothing reads them until the next tick re seats every real man. Judging after
         one season made this check a coin toss (the review's finding 1: red at seed offsets 5 to 9, every time
         from one career whose played-on season was an injury year). */
      for (let guard = 0; guard < 240 && !(t.phone.world?.year > y0) && !t.retired; guard += 1) { const nx = step(HEAD.engine, t, c.seed); if (!nx) break; t = nx; }
      if (t.seasons.length > n0 + 1 && t.phone.world?.year > y0) tickless += 1;
      if (t.phone.world?.year > y0) {
        playedOn += 1;
        if (Object.keys(t.phone).sort().join() !== Object.keys(s.phone).sort().join()) phoneFields += 1;
        const y = t.phone.world?.year;
        for (const [name, club] of Object.entries(t.phone.clubs)) if (ERA.has(name) && ERA.get(name).has(y) && ERA.get(name).get(y) !== club) movedLeft += 1;
      }
    } catch (e) { threw += 1; if (threw === 1) console.error(`   an old save threw here: ${e.message}`); }
    finally { Math.random = again; }
  }
  console.log(`   old saves: ${olds} base careers at their 2028 world (${realMovesHeld} holding a real man's move or tally) asked ${asked} questions here, ${realAsked} about a real man; ${playedOn} played on here until their world ticked (${tickless} of them through a season with no tick first), ${threw} threw, ${phoneFields} grew a phone field, ${movedLeft} real men left off their era club`);
  if (threw || phoneFields || movedLeft) fail(`old saves on this tree: ${threw} threw, ${phoneFields} grew a phone field, ${movedLeft} real men stayed at a club the sim sent them to`);
  if (playedOn < 20) fail(`only ${playedOn} old saves played on here until their world ticked`);
  if (olds < 20 || realMovesHeld < 10) fail(`only ${olds} old 2028 saves (${realMovesHeld} with real moves) were read`);
  if (realAsked) fail(`${realAsked} questions from an old 2028 world asked about a real man's move or goals`);
}

/* ─── 5. the season log and the International panel ───────────────────── */

function logAudit(recs) {
  const a = { summers: 0, shownMissing: 0, hiddenShown: 0, keptPlayed: 0, keptFuture: 0, hiddenPast: 0, examples: [] };
  for (const r of recs) {
    if (!r.t || !r.tournament) continue;
    a.summers += 1;
    const eligible = r.tResult !== null;
    const announced = r.t.champion !== r.nation || !eligible;
    const shown = announced && T.tournamentWinnerShown(r.year, eligible ? r.t.myResult : '');
    const present = r.wonLines.length > 0;
    if (shown && !present) { a.shownMissing += 1; if (a.examples.length < 3) a.examples.push(`${r.year} ${r.t.name}: no winner line where one belongs`); }
    if (!shown && present) { a.hiddenShown += 1; if (a.examples.length < 3) a.examples.push(`${r.year} ${r.t.name}, he was ${r.tResult ?? 'not in the setup'}: "${r.wonLines[0]}"`); }
    if (shown && present && T.summerHappened(r.year)) a.keptPlayed += 1;
    if (shown && present && !T.summerHappened(r.year)) a.keptFuture += 1;
    if (!shown && announced) a.hiddenPast += 1;
  }
  return a;
}
const tableRow = (nation, won, drawn, lost, gf, ga) => ({ nation, played: won + drawn + lost, won, drawn, lost, gf, ga, points: won * 3 + drawn });
function fixture(year, myResult, champion) {
  const called = myResult !== 'Did Not Qualify' && myResult !== 'Not Selected';
  return {
    year, name: 'World Cup', short: 'WC', kind: 'World Cup', confederation: null, nation: 'England', teams: 32,
    qualifying: { confederation: 'UEFA', table: [tableRow('England', 6, 1, 1, 17, 5), tableRow('Poland', 5, 1, 2, 12, 7)], myPosition: 1, through: 1, qualified: myResult !== 'Did Not Qualify', automatic: false },
    qualified: myResult !== 'Did Not Qualify',
    squad: myResult === 'Did Not Qualify' ? null : { called, role: called ? 'Starter' : null, reason: 'x', myRank: called ? 2 : 9, poolSize: 9, places: 3, myScore: 70, cutScore: 74 },
    groupTable: [], bracket: [{ round: 'F', slot: 0, home: champion, away: 'Zambia', homeGoals: 2, awayGoals: 1, winner: champion, mine: false }],
    champion, runnerUp: 'Zambia', myResult, matches: [], playerApps: called ? 4 : 0, playerGoals: 0, playerAssists: 0, playerAvgRating: called ? 6.8 : 0,
    goldenBoot: false, bestPlayer: false,
  };
}
const PANEL_CASES = [
  { name: 'a past summer he missed', t: fixture(2006, 'Did Not Qualify', 'Uruguay'), shown: false },
  { name: 'a past summer he played', t: fixture(2006, 'Quarter-final', 'Uruguay'), shown: true },
  { name: 'a summer to come he missed', t: fixture(2030, 'Not Selected', 'Uruguay'), shown: true },
  { name: 'an old save\'s history, a missed 2010 last', t: fixture(2010, 'Not Selected', 'Uruguay'), shown: false,
    history: [{ year: 2006, short: 'WC', nation: 'England', champion: 'Uruguay', myResult: 'Quarter-final', apps: 4, goals: 1 },
      { year: 2008, short: 'Euros', nation: 'England', champion: 'Uruguay', myResult: '', apps: 0, goals: 0 },
      { year: 2010, short: 'WC', nation: 'England', champion: 'Uruguay', myResult: 'Not Selected', apps: 0, goals: 0 }] },
];
function panelAudit(B) {
  const out = [];
  for (const c of PANEL_CASES) {
    const card = B.render.card(c.t);
    const history = c.history || [{ year: c.t.year, short: c.t.short, nation: c.t.nation, champion: c.t.champion, myResult: c.t.myResult, apps: c.t.playerApps, goals: 0 }];
    const tile = B.render.tile(history, c.t.nation, c.t);
    out.push({ name: c.name, want: c.shown,
      champions: /Champions:/.test(card) && card.includes(c.t.champion), bracket: card.includes('data-intl-tile="bracket"'),
      wonIt: /won it/.test(tile) && tile.includes(c.t.champion), cardLen: card.length });
  }
  return out;
}
SECTION = '5';
console.log('5) The season log and the International panel name a winner only where the rule allows');
if (runs('5')) {
  const h = logAudit(flatHead), b = logAudit(flatBase);
  console.log(`   this tree: ${h.summers} summers; winner lines missing where they belong ${h.shownMissing}, printed for a summer he missed ${h.hiddenShown}; kept for finals he played ${h.keptPlayed}, kept for a summer to come ${h.keptFuture}, held back ${h.hiddenPast}`);
  console.log(`   base:      ${b.summers} summers; printed for a summer he missed that happened ${b.hiddenShown}`);
  for (const e of h.examples) console.log(`     e.g. ${e}`);
  if (h.shownMissing) fail(`${h.shownMissing} summers lost a winner line the rule keeps`);
  if (h.hiddenShown) fail(`${h.hiddenShown} summers he missed, that really happened, still name their winner in the season log`);
  if (h.keptPlayed < 5 || h.keptFuture < 5) fail(`the fleet kept ${h.keptPlayed} played and ${h.keptFuture} future winner lines, too few to show the rule keeps them`);
  const hp = panelAudit(HEAD), bp = panelAudit(BASEB);
  for (let i = 0; i < hp.length; i += 1) {
    const x = hp[i], y = bp[i];
    console.log(`   ${x.name}: champions line ${x.champions}, bracket tile ${x.bracket}, last tile winner ${x.wonIt} (base ${y.champions}, ${y.bracket}, ${y.wonIt})`);
    for (const k of ['champions', 'bracket', 'wonIt']) if (x[k] !== x.want) fail(`${x.name}: ${k} is ${x[k]}, the rule says ${x.want}`);
  }
}

/* ─── 6. the inverse ───────────────────────────────────────────────────── */

/* The regions of each file this round may edit (the brief's decision 1), as anchors in this tree's text: a region
   runs from the line holding its start to the line before its end. Every diff hunk against the base must sit
   inside one. The panel's import line and its tile grid's class are the two lines past the brief's list
   (docs/audits/ROUND-1329-NOTES.md says why). */
const REGIONS = {
  [ENGINE]: [
    ['import { monthAwards, monthYear, tournamentWinnerShown } from "./soccerWorldTruth";', 'import { personalGoalMilestone } from "./soccerCareerMilestone";'],
    ['  /* The champion is announced whether you were there or not. Round 1329:', '  if (!eligible) return;'],
    ['  /* Awards: Player of the Month. Round 1329:', '  // Player of the Year (domestic)'],
  ],
  [PHONE]: [
    ['import { LAST_REAL_YEAR, seasonHappened, summerHappened, feedPastSeasonLine, feedFutureSeasonLine } from "./soccerWorldTruth";', '/* ─── storage caps ─── */'],
    ['/* LAST_REAL_YEAR (2032:', 'function leagueOfClub('],
    ['export function worldSeasonTick(', '/** The feed, newest first, ready to print. */'],
  ],
  [ARCADE]: [
    ['import { LAST_REAL_YEAR, seasonHappened, seasonLabel } from "./soccerWorldTruth";', 'export interface ArcadeQuestion {'],
    ['export function arcadeQuestions(', '/** Whether the app has anything to offer this season. */'],
  ],
  [PANEL]: [
    ['import { summerAtHomeLine, tournamentWinnerShown } from "@/lib/soccerWorldTruth";', 'import type {'],
    ['        {screen === "bracket" && tournamentWinnerShown(t.year, t.myResult) && (', '            <h3 className="text-sm font-black uppercase tracking-wide">The Bracket</h3>'],
    ['    /* Round 1329: the whole edition\'s bracket names who won it', '    { key: "matches", emoji: "⚽", label: "Your Games", sub: `${t.playerApps} apps` },'],
    ['  /* Round 1329: who won a summer that really happened is the world\'s fact, so', '\n  return (\n    <div\n      ref={cardRef}'],
    ['      <div className={`grid grid-cols-2 gap-1.5${tiles.length % 2 === 1 ? " [&>*:last-child]:col-span-2" : ""}`}>', '        {tiles.map(tile => ('],
    /* the row's pill is part of the row: a row with no result of his own shows none (the review's finding 16) */
    ['                {tournamentWinnerShown(h.year, h.myResult) ? (', '          ))}\n        </div>\n        <Button variant="outline" onClick={() => setOpen("none")}'],
    ['  /* Round 1329: the last edition\'s bracket and winner follow the card\'s rule. */', '    return (\n      <div ref={revealRef} className="space-y-2">\n        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">\n          {last.name} {last.year}'],
    ['        onClick={() => setOpen(lastShown ? "bracket" : "history")}', '        className="bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0"\n      >\n        <div className="text-base leading-none">🏆</div>'],
    ['        <div className="text-[9px] text-muted-foreground truncate">\n          {latest && tournamentWinnerShown', '      </button>\n    </div>\n  );\n}'],
  ],
};
const sha256 = s => createHash('sha256').update(s).digest('hex');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
SECTION = '6';
console.log('6) The eighth inverse gives the base\'s four files back, and every change sits in this round\'s hunks');
if (runs('6')) {
  const receipt = [];
  for (const file of WORLD_TRUTH_FILES) {
    /* a control's copy is LF already; the tree's file is normalised on read */
    const head = controlSources.get(file) ?? fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
    const base = execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\r\n').join('\n');
    let back = null;
    try { back = inverseWorldTruth(file, head, receipt); } catch (e) { fail(`${file}: the inverse does not apply (${e.message.split('\n')[0]})`); }
    const hs = sha256(head), bs = sha256(base), rs = back === null ? '(none)' : sha256(back);
    console.log(`   ${file}: head ${hs.slice(0, 16)} (pinned ${WORLD_TRUTH_SHA256[file].head.slice(0, 16)}), inverse ${rs.slice(0, 16)}, base ${bs.slice(0, 16)} (pinned ${WORLD_TRUTH_SHA256[file].base.slice(0, 16)})`);
    if (back !== null && rs !== bs) fail(`${file}: the eighth inverse gives sha256 ${rs}, the base is ${bs}`);
    if (bs !== WORLD_TRUTH_SHA256[file].base) fail(`${file}: the base pinned in the inverse is not ${BASE.slice(0, 8)}'s`);
    if (hs !== WORLD_TRUTH_SHA256[file].head) fail(`${file}: this tree is not the head the inverse was written for (regenerate the rows)`);
    /* every hunk inside a region */
    const dir = fs.mkdtempSync(path.join(TMP, 'hunks-'));
    fs.writeFileSync(path.join(dir, 'base'), base); fs.writeFileSync(path.join(dir, 'head'), head);
    const diff = spawnSync('git', ['diff', '--no-index', '-U0', '--no-color', path.join(dir, 'base'), path.join(dir, 'head')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout;
    const regions = REGIONS[file].map(([from, to]) => {
      const a = head.indexOf(from), b = a < 0 ? -1 : head.indexOf(to, a + from.length);
      if (a < 0 || b < 0 || head.indexOf(from, a + 1) >= 0) { fail(`${file}: the region anchor ${JSON.stringify(from.slice(0, 50))} is not in this tree exactly once with its end after it`); return null; }
      return [lineOf(head, a), lineOf(head, b) - 1];
    }).filter(Boolean);
    let hunks = 0;
    for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      hunks += 1;
      const c = Number(m[1]), d = m[2] === undefined ? 1 : Number(m[2]);
      const lo = d === 0 ? c : c, hi = d === 0 ? c + 1 : c + d - 1;
      if (!regions.some(([x, y]) => lo >= x && hi <= y + (d === 0 ? 1 : 0))) fail(`${file}: the change at head lines ${lo} to ${hi} is outside every region this round may edit`);
    }
    console.log(`     ${hunks} hunks against the base, in ${regions.length} regions`);
  }
  const problem = worldTruthReceiptProblem(receipt, WORLD_TRUTH_FILES);
  if (problem) fail(problem);
  console.log(`   rows applied: ${receipt.length} of ${WORLD_TRUTH_ADDITIONS.length}`);
}

/* ─── the verdict ──────────────────────────────────────────────────────── */

const ran = [...perSection.entries()].map(([k, v]) => `section ${k}: ${v}`).join(', ');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const fired = failedSections.has(c.breaks);
  console.log(`${fired ? 'FIRED' : 'DID NOT FIRE'}: WORLD_TRUTH_CONTROL=${CONTROL} ${fired ? `failed section ${c.breaks} (${perSection.get(c.breaks)} failures; ${ran})` : `left section ${c.breaks} green (${ran || 'no failures'})`}`);
  process.exit(1);
}
console.log(failures ? `simSoccerWorldTruth: ${failures} FAILURES (${ran})` : 'simSoccerWorldTruth: OK, every section green');
process.exit(failures ? 1 : 0);

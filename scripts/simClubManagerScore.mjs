/**
 * Round 633: the Club Manager season score reads the MANAGER, not the club.
 *
 * WHY THIS HARNESS EXISTS. Before this round the only assertion anywhere on
 * the season score was `simClubManager.mjs:214`, `if (!isNum(summary.seasonScore))`.
 * Per CLAUDE.md that is the worthless shape: it proves no crash and nothing
 * about outcomes. The rule it was guarding had three measured defects that it
 * could never have found.
 *
 *   1. It read the club. Twelve clubs, one season each, management held
 *      IDENTICAL (nobody touched anything), so every point of spread was club
 *      stature: scores 24 to 90, correlation with the club's preview XI
 *      rating 0.851. Bayern on grade F with 0 of 7 objectives scored 55 while
 *      Sevilla on grade C with 3 of 8 scored 46.
 *   2. The 130 scale did not fit the leagues. Max league points runs 54 (10
 *      club Croatia) to 138 (24 club Championship) against one flat cap.
 *   3. Relegation paid: Sunderland 43 in the Premier League, then 124 winning
 *      the Championship, against 78 for winning the Premier League.
 *
 * MEASURED BANDS, from 77 seeded seasons at 34 clubs across every league size,
 * scored under both rules. These are where the thresholds below come from:
 *
 *                             OLD     NEW
 *   median score               63      63
 *   correlation with grade   0.312   0.482
 *   correlation with club XI  0.776   0.314
 *   correlation with the board 0.132  0.577
 *   mean, grade A             65.8    82.1
 *   mean, grade B             67.2    69.4
 *   mean, grade C             58.4    48.8
 *   mean, grade D             28.8    34.5
 *
 * The old rule could not order A above B. Thresholds are set from that spread
 * with headroom, never from a number that felt right.
 *
 * NEGATIVE CONTROLS. Every section has one, each proved to fail the section it
 * targets. A control that changes nothing reports green for the wrong reason,
 * so each one asserts its anchor exists before it edits, and refuses to run
 * otherwise. The sections each control turns red were read off actual runs,
 * not off intent, and a control may fail more than the section it was written
 * for when the fault it plants is visible from more than one place.
 *
 *   CM_SCORE_CONTROL=rawpoints    form reads RAW league points instead of the
 *                                 share of points available. Section 1, league
 *                                 size neutrality, must go red.
 *   CM_SCORE_CONTROL=ratescore    form reads points per game PLAYED, the rate
 *                                 that reads 3.00 after one opening win.
 *                                 Section 2, the monotone law, must go red. It
 *                                 trips 6 too: a rate on a legacy save that
 *                                 has played fewer games than the estimate
 *                                 subtracts reads the full 48 for 4 points.
 *   CM_SCORE_CONTROL=oldrule      puts back min(130, pts + 10 a trophy).
 *                                 Sections 3 and 4, stature and following the
 *                                 board, must both go red. It trips 6 too,
 *                                 because the old rule has no handover at all.
 *   CM_SCORE_CONTROL=nohandover   stops the takeover subtracting the previous
 *                                 manager. Section 5 must go red, and 6 and 12
 *                                 go with it because a handover that is never
 *                                 read is missing from every path that reads
 *                                 one.
 *   CM_SCORE_CONTROL=nolegacygate lifts the season 1 gate on the legacy
 *                                 estimate, which is the flaw all three design
 *                                 judges found independently. Section 6.
 *   CM_SCORE_CONTROL=europriced   prices Europe into the ceiling by scaling
 *                                 the five terms so they sum to the cap, so a
 *                                 perfect season in one of the five leagues
 *                                 with no European route can no longer reach
 *                                 130. Section 7, which scores that season
 *                                 through the real module rather than reading
 *                                 a helper, must go red. It trips 4 too: a
 *                                 scaled total no longer matches the breakdown
 *                                 the season end screen prints beside it.
 *   CM_SCORE_CONTROL=liveobjectives grades the board card LIVE instead of at
 *                                 the final whistle, which is the bug the
 *                                 adversarial review found: selling or paying
 *                                 off an under 21 un-ticks the youth objective
 *                                 and takes 6 points off a live score.
 *                                 Section 2 must go red.
 *   CM_SCORE_CONTROL=legacyfreecup pays a pre Round 633 takeover save in full
 *                                 for the previous manager's cup run,
 *                                 European run and board card. Section 5.
 *   CM_SCORE_CONTROL=copydrift    moves a cup step without touching the help
 *                                 copy, which is how the screen starts lying
 *                                 to the player. Section 10 must go red.
 *   CM_SCORE_CONTROL=nocupsub     the stamped cup run is no longer subtracted.
 *                                 Section 5 must go red.
 *   CM_SCORE_CONTROL=noeurosub    the stamped European run is no longer
 *                                 subtracted. Section 5 must go red.
 *   CM_SCORE_CONTROL=noobjsub     the stamped board ticks are no longer
 *                                 subtracted. Section 5 must go red.
 *   CM_SCORE_CONTROL=uncapped     drops the 0..130 clamp on the total.
 *                                 Section 8 must go red. It trips 4 too: a
 *                                 season scored over 130 cannot match its
 *                                 capped breakdown.
 *   CM_SCORE_CONTROL=requiredhandover makes the save field mandatory, so a
 *                                 save from before the round would not load.
 *                                 Section 9 must go red.
 *   CM_SCORE_CONTROL=stalestamp   startMidSeason stamps the handover from the
 *                                 state it was GIVEN rather than the state it
 *                                 played forward, so it records a season that
 *                                 has not happened. Section 11 must go red.
 *   CM_SCORE_CONTROL=legacyconst  the legacy path ignores the fixture log and
 *                                 always falls back to the constant. Section
 *                                 12 must go red.
 *
 * Run: node scripts/simClubManagerScore.mjs
 */
/* Round 299: seeded stream. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const isNum = v => typeof v === 'number' && Number.isFinite(v);

const KNOWN = [
  'rawpoints', 'ratescore', 'oldrule', 'nohandover', 'nolegacygate', 'europriced', 'liveobjectives',
  'legacyfreecup', 'copydrift', 'nocupsub', 'noeurosub', 'noobjsub', 'uncapped', 'requiredhandover',
  'stalestamp', 'legacyconst',
];
const CONTROL = process.env.CM_SCORE_CONTROL || '';
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_SCORE_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

/* ---------- the engine, with the control applied IN MEMORY ---------- */
/* Never on disk: a crashed run must not be able to leave a rewritten engine
   where tsc or a build would read it. Same approach as simClubManagerDeals. */
const SCORE_SRC = path.join(ROOT, 'src', 'lib', 'clubManagerScore.ts');
const ENGINE_SRC = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
const CALENDAR_SRC = path.join(ROOT, 'src', 'lib', 'clubManagerCalendar.ts');
const scoreText = fs.readFileSync(SCORE_SRC, 'utf8');
const engineText = fs.readFileSync(ENGINE_SRC, 'utf8');
const calendarText = fs.readFileSync(CALENDAR_SRC, 'utf8');

/** Replace `old` with `neu` in `text`, or refuse to run. A control whose
 *  anchor has drifted is out of action, and a silent green is the one outcome
 *  worse than a red. Anchors are kept to ONE LINE for this reason. */
function swap(text, old, neu, where) {
  if (!text.includes(old)) {
    console.error(`control cannot run: the anchor for CM_SCORE_CONTROL=${CONTROL} is gone from ${where}`);
    console.error(`  looked for: ${old}`);
    process.exit(1);
  }
  return text.split(old).join(neu);
}

/** Source with its comments taken out, for every guard below that reads a
 *  file: prose about the code is the one place the string a guard looks for
 *  is guaranteed to appear. Block comments (JSX's included) and line
 *  comments go; a `//` inside a string such as a URL may go with them, which
 *  can only make a guard stricter, never let one pass on prose. */
const codeOf = text => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const TOTAL_LINE = '  const total = int(form + title + cup + euro + objectives, 0, LEDGER_CAP);';

let score = scoreText;
let engine = engineText;
let calendar = calendarText;
if (CONTROL === 'rawpoints') {
  /* The defect this round fixed: a raw count, so a 46 game league outscores an
     18 game one for the same quality of season. */
  score = swap(score, 'const form = int(W_FORM * Math.min(1, myPts / (3 * mine)), 0, W_FORM);',
    'const form = int(Math.min(W_FORM, myPts), 0, W_FORM);', 'clubManagerScore.ts');
} else if (CONTROL === 'ratescore') {
  /* Points per game PLAYED. Reads 3.00 after one opening win and can only
     fall, which is exactly what the day-max leaderboard pays for. */
  score = swap(score, 'const form = int(W_FORM * Math.min(1, myPts / (3 * mine)), 0, W_FORM);',
    'const form = int(W_FORM * Math.min(1, myPts / (3 * Math.max(1, Math.max(0, int(i.leaguePlayed, 0, 500)) - (h ? h.played : 0)))), 0, W_FORM);',
    'clubManagerScore.ts');
} else if (CONTROL === 'oldrule') {
  engine = swap(engine, '  return seasonLedgerScore(seasonLedgerInputOf(career));',
    `  const row0 = career.table.find(r => r.club === career.clubName);
  return Math.min(130, (row0 ? row0.pts : 0) + career.trophies.filter(t => t.season === career.season).length * 10);`,
    'clubManager.ts');
} else if (CONTROL === 'nohandover') {
  score = swap(score, '  if (!i.legacyStart) return null;',
    '  return null;  // control: the previous manager is never subtracted\n  // eslint-disable-next-line no-unreachable\n  if (!i.legacyStart) return null;',
    'clubManagerScore.ts');
  score = swap(score, '  if (i.handover) {', '  if (false && i.handover) {', 'clubManagerScore.ts');
} else if (CONTROL === 'nolegacygate') {
  /* The flaw all three judges found in the winning design, put back: without
     the season 1 gate, midSeasonStart (which the engine never clears) makes
     every later season subtract a manager who does not exist. */
  engine = swap(engine, '  const legacyStart = !stamped && career.season === 1 ? (career.midSeasonStart ?? null) : null;',
    '  const legacyStart = !stamped ? (career.midSeasonStart ?? null) : null;', 'clubManager.ts');
} else if (CONTROL === 'liveobjectives') {
  /* Puts back the version that graded the board card LIVE instead of at the
     final whistle. That is the bug the adversarial review found: selling,
     loaning out or paying off an under 21 un-ticks the youth objective and
     takes 6 points off a live score. Section 2 must go red. */
  score = swap(score, "  const objectives = !i.seasonDone ? 0",
    '  const objectives = false ? 0', 'clubManagerScore.ts');
} else if (CONTROL === 'legacyfreecup') {
  /* Puts back the version that paid a pre Round 633 takeover save in full for
     the previous manager's cup run, European run and board card. Section 5
     must go red. */
  score = swap(score, '  const est = !!(h && h.estimated);',
    '  const est = false;', 'clubManagerScore.ts');
} else if (CONTROL === 'copydrift') {
  /* Moves a cup step without touching the help copy, which is exactly how the
     screen ends up lying to the player. Section 10 must go red. A step rather
     than a weight, on purpose: moving W_FORM also moves the ceiling, which
     tripped section 7 as well, and a control should fail the section it was
     written for and nothing it was not. */
  score = swap(score, 'export const CUP_POINTS: readonly number[] = [0, 5, 11, 17, 24];',
    'export const CUP_POINTS: readonly number[] = [0, 6, 11, 17, 24];', 'clubManagerScore.ts');
} else if (CONTROL === 'europriced') {
  /* Europe priced into the ceiling: the five terms are scaled so that ALL of
     them together reach the cap, which puts the cap out of reach of a manager
     whose league has no European route. */
  score = swap(score, TOTAL_LINE,
    '  const total = int((form + title + cup + euro + objectives) * LEDGER_CAP / ledgerRawCeiling(), 0, LEDGER_CAP);',
    'clubManagerScore.ts');
} else if (CONTROL === 'nocupsub') {
  score = swap(score, '  const rawCup = Math.max(0, CUP_POINTS[rank04(i.cupRank)] - (h && !est ? CUP_POINTS[rank04(h.cupRank)] : 0));',
    '  const rawCup = Math.max(0, CUP_POINTS[rank04(i.cupRank)]);', 'clubManagerScore.ts');
} else if (CONTROL === 'noeurosub') {
  score = swap(score, '  const rawEuro = Math.max(0, EURO_POINTS[rank04(i.euroRank)] - (h && !est ? EURO_POINTS[rank04(h.euroRank)] : 0));',
    '  const rawEuro = Math.max(0, EURO_POINTS[rank04(i.euroRank)]);', 'clubManagerScore.ts');
} else if (CONTROL === 'noobjsub') {
  score = swap(score, '  const doneNow = Math.max(0, doneIds.length - (h && !est ? stampedStillDone(h.objectivesDone, doneIds) : 0));',
    '  const doneNow = doneIds.length;', 'clubManagerScore.ts');
} else if (CONTROL === 'uncapped') {
  score = swap(score, TOTAL_LINE, '  const total = form + title + cup + euro + objectives;', 'clubManagerScore.ts');
} else if (CONTROL === 'requiredhandover') {
  engine = swap(engine, '  handover?: SeasonHandover | null;', '  handover: SeasonHandover | null;', 'clubManager.ts');
} else if (CONTROL === 'stalestamp') {
  /* The handover stamped from the state startMidSeason was handed, before the
     run-in was played, so it records nothing the previous manager did. */
  calendar = swap(calendar, '    handover: handoverFrom(s),', '    handover: handoverFrom(career),', 'clubManagerCalendar.ts');
} else if (CONTROL === 'legacyconst') {
  score = swap(score, '  const rebuilt = legacyFromLog(i);', '  const rebuilt = null;', 'clubManagerScore.ts');
}
if (CONTROL) console.log(`CONTROL ${CONTROL} is on. The sections it targets are SUPPOSED to fail.\n`);

/* UNDER dist, INSIDE THE PROJECT ROOT, and not in the system temp dir. The
   rewritten copies still import '@/lib/...' like every other file in src, and
   that alias only resolves for a file inside the project, so a shadow in
   /tmp fails to bundle with twenty unresolved imports. dist is gitignored, so
   a crashed run cannot leave a rewritten engine where tsc would read it.
   Same reasoning as simActivityNotCompletion. Round 626's lesson too: the
   directory name is per run, because two concurrent harness runs were
   overwriting each other's bundle. */
const TMP = fs.mkdtempSync(path.join(ROOT, 'dist', 'cmscore-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');

const shadowScore = path.join(TMP, 'clubManagerScore.ts');
const shadowEngine = path.join(TMP, 'clubManager.ts');
const shadowCalendar = path.join(TMP, 'clubManagerCalendar.ts');
fs.writeFileSync(shadowScore, score);
fs.writeFileSync(shadowEngine, engine);
fs.writeFileSync(shadowCalendar, calendar);

/* THE ENTRY MUST POINT AT THE SHADOWS TOO, and the first draft of this file
   did not. It imported both modules by ABSOLUTE PATH while the aliases below
   only rewrite the '@/lib/...' specifier, so the engine's own internal import
   picked up the rewritten score module but the handles the sections call
   directly did not. Five of the six controls reported green, which is the
   exact failure this repo's rules call out: a control that changes nothing
   reports green for the wrong reason. Every route is pointed at the same
   file now, so there is one copy of each module in the bundle. */
const fwd = p => p.replaceAll('\\', '/');
const entryScore = fwd(CONTROL ? shadowScore : SCORE_SRC);
const entryEngine = fwd(CONTROL ? shadowEngine : ENGINE_SRC);
const entryCalendar = fwd(CONTROL ? shadowCalendar : CALENDAR_SRC);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const eng = await import('${entryEngine}');
const sc = await import('${entryScore}');
const cal = await import('${entryCalendar}');
export const engine = eng;
export const scoreMod = sc;
export const calendarMod = cal;
`);

const alias = CONTROL
  ? `--alias:@/lib/clubManagerScore=${fwd(shadowScore)} --alias:@/lib/clubManager=${fwd(shadowEngine)} --alias:@/lib/clubManagerCalendar=${fwd(shadowCalendar)}`
  : '';
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error ${alias}`,
  { stdio: 'inherit' },
);

/* Registered as a process hook, not a bare statement at the end: a section
   that throws or a control that exits early would otherwise leave the
   rewritten engine sitting in dist/ for the next run to trip over. */
process.on('exit', () => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
});

const mod = await import(pathToFileURL(BUNDLE).href);
const cm = mod.engine;
const S = mod.scoreMod;
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  clubDefFor, clubPreviewRating, currentSeasonScore, REAL_LEAGUES,
  releasePlayer, releaseBlock, acceptBid, playableClubs,
  setTransferStatus, loanOutPlayer, canLeaveSquad,
  seasonLedgerInputOf, cupProgressRank, uclProgressRank, objectiveStatuses,
} = cm;
const { startMidSeason } = mod.calendarMod;
for (const [name, fn] of Object.entries({
  startCareer, playNextEntry, finishSeason, startNextSeason, clubDefFor, clubPreviewRating, currentSeasonScore,
  releasePlayer, releaseBlock, acceptBid, playableClubs, setTransferStatus, loanOutPlayer, canLeaveSquad,
  seasonLedgerInputOf, cupProgressRank, uclProgressRank, objectiveStatuses, startMidSeason,
})) {
  if (typeof fn !== 'function') { console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`); process.exit(1); }
}

/* Every playable league size in the game, read from the engine rather than
   written down, so a new league joins this harness on its own. */
const LEAGUE_SIZES = [...new Set(REAL_LEAGUES.map(l => l.clubs.length))].sort((a, b) => a - b);

/* EVERY CLUB THIS HARNESS NAMES MUST BE REAL, and this is not pedantry. A name
   clubDefMap does not know does NOT throw: clubDefFor returns a flat fallback
   (tier 4, expectation 10) and leagueOf falls back to the PREMIER LEAGUE, so a
   typo silently becomes an invented Premier League club and quietly poisons
   the two correlation gates below. The first calibration run of this round's
   weights learned it that way, through a club called "Midtjylland". */
function assertRealClubs(names, where) {
  const known = new Set(REAL_LEAGUES.flatMap(l => playableClubs(l.id).map(c => c.name)));
  const missing = names.filter(n => !known.has(n));
  if (missing.length) {
    console.error(`${where} names ${missing.length} club(s) that are not in any playable league: ${missing.join(', ')}`);
    console.error('  An unknown name does not throw, it becomes a fallback Premier League club, so the sample would be quietly wrong.');
    process.exit(1);
  }
}

/** Play one season with nobody managing. Returns null if the manager is sacked. */
function playSeason(state) {
  let s = state;
  let guard = 0;
  for (;;) {
    guard += 1;
    if (guard > 160) return null;
    const res = playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver') return s;
    if (s.sacked) return null;
  }
}

/** A synthetic ledger input with every field present, so a section states only what it varies. */
function input(over) {
  return {
    inTable: true, leaguePts: 0, leaguePlayed: 38, leagueRounds: 38, wonLeague: false,
    cupRank: 0, euroRank: 0, objectivesDone: [], seasonDone: true, handover: null,
    legacyStart: null, calendarLength: 50, legacyLog: null,
    ...over,
  };
}
/** The first n ids off a board, for a synthetic card with n ticks. */
const ticks = n => ['league', 'cup', 'ucl', 'rival', 'goals', 'youth', 'points', 'netSpend', 'double'].slice(0, n);

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const p90 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : 0; };

/* ---------- 1. A season is worth the same in every league ---------- */
console.log('1) The same season scores the same in a 10 club league and a 24 club one');
{
  /* The cleanest possible statement of defect 2, on the pure module with
     synthetic inputs, so nothing about a particular club can muddy it: hold
     PERFORMANCE fixed (the same share of available points, the same title,
     the same cup run, the same board card) and vary only the league size. */
  const profiles = [
    { name: 'champion, 75 percent of the points, cup won, 5 objectives', share: 0.75, won: true, cup: 4, euro: 0, obj: 5 },
    { name: 'mid table, 45 percent, out of the cup early, 2 objectives', share: 0.45, won: false, cup: 1, euro: 0, obj: 2 },
    { name: 'bottom, 20 percent, nothing, no objectives', share: 0.20, won: false, cup: 0, euro: 0, obj: 0 },
  ];
  let checked = 0;
  for (const p of profiles) {
    const seen = [];
    for (const size of LEAGUE_SIZES) {
      const rounds = 2 * (size - 1);
      const total = seasonScoreFor(input({
        leaguePts: Math.round(3 * rounds * p.share),
        leaguePlayed: rounds,
        leagueRounds: rounds,
        wonLeague: p.won, cupRank: p.cup, euroRank: p.euro, objectivesDone: ticks(p.obj),
      }));
      seen.push({ size, total });
      checked += 1;
    }
    const vals = seen.map(x => x.total);
    const spread = Math.max(...vals) - Math.min(...vals);
    const shown = seen.map(x => `${x.size}:${x.total}`).join(' ');
    console.log(`   ${p.name}\n     ${shown}   spread ${spread}`);
    /* A point of rounding across seven league sizes is fine. Anything more is
       the league size leaking into the score. Measured healthy spread: 0 or 1. */
    if (spread > 1) {
      fail(`the same season scores ${Math.min(...vals)} to ${Math.max(...vals)} across league sizes ${LEAGUE_SIZES.join(', ')}, a spread of ${spread}. League size is leaking into the score.`);
    }
  }
  /* The old guard here compared a counter incremented unconditionally inside
     the loops against the product of their lengths, so it could not fail. What
     actually needs asserting is that the engine handed us a real spread of
     league sizes to vary. */
  if (LEAGUE_SIZES.length < 5) fail(`only ${LEAGUE_SIZES.length} distinct league sizes were found (${LEAGUE_SIZES.join(', ')}), so varying league size proves nothing`);
  if (checked !== LEAGUE_SIZES.length * profiles.length) fail(`scored ${checked} combinations against ${LEAGUE_SIZES.length * profiles.length} expected`);
}

function seasonScoreFor(inp) {
  return S.seasonLedgerScore(inp);
}

/* ---------- 2. The monotone law ---------- */
console.log('2) The score never falls, even when you sell, loan out or pay somebody off');
{
  /* global_leaderboard ranks on max(least(score, max_score)) per player per
     game per DAY and recordActivity pings after every match, so a score that
     can fall pays a player for their luckiest afternoon rather than for the
     season.

     THE FIRST VERSION OF THIS SECTION PLAYED EVERY CAREER HANDS OFF, and that
     is how it reported "0 of them lower" while three live buttons dropped the
     score by 6 each. objectiveStatuses recomputes the youth objective from the
     CURRENT squad, and four of the five board asks read the squad the same
     way, so removing a qualifying player un-ticked a box that had already been
     paid for.

     THE SECOND VERSION SAID IT EXERCISED ALL THREE BUTTONS AND DID NOT. It
     accepted whatever bid the stream happened to send and never loaned anyone
     out, and measured over its twelve careers that came to one sale and no
     loans, so it proved the whistle gate against payoffs alone. Each of the
     three is driven on purpose now, in every career, through the exact calls
     the three buttons make (useClubManager's setStatus then acceptBid,
     loanOut, and terminate), and each has its own floor below. */
  const CLUBS = ['Newcastle', 'Sevilla', 'Stuttgart', 'Celtic', 'Le Havre', 'Napoli',
    'Rijeka', 'Twente', 'Wolves', 'Al-Hilal', 'Galatasaray', 'Lecce'];
  assertRealClubs(CLUBS, "section 2's sample");
  let drops = 0, samples = 0, careers = 0, worst = null;
  let sales = 0, loans = 0, payoffs = 0, listed = 0;
  /* The man the youth objective counts, when there is one: an under 21 with
     appearances is the removal most likely to un-tick a box already paid
     for. Otherwise the cheapest outfielder the squad rules will let go. */
  const spare = (s, extra) => {
    const ok = p => !p.onLoan && p.position !== 'GK' && canLeaveSquad(s, p) && (!extra || extra(p));
    const kids = s.squad.filter(p => p.age <= 21 && (p.apps ?? 0) > 0 && ok(p));
    if (kids.length) return kids[0];
    const rest = s.squad.filter(ok).sort((a, b) => a.rating - b.rating);
    return rest[0] ?? null;
  };
  for (const club of CLUBS) {
    let s;
    try { s = startCareer(club); } catch { continue; }
    let prev = currentSeasonScore(s);
    let guard = 0;
    careers += 1;
    const onTheList = new Set();
    for (;;) {
      guard += 1;
      if (guard > 160) break;
      const res = playNextEntry(s, { skipHalftime: true });
      s = res.state;
      if (res.kind === 'seasonOver') break;

      const check = label => {
        const now = currentSeasonScore(s);
        samples += 1;
        if (now < prev) {
          drops += 1;
          if (!worst || prev - now > worst.by) worst = { club, week: s.week, from: prev, to: now, by: prev - now, label };
        }
        prev = now;
      };
      check('after a match');

      /* SELL. Listing is the only road to a sale since Round 141: two men go
         on the list when the summer market is open and two more when January
         opens, the engine sends bids for listed men at its own rate, and the
         first bid for a listed man is accepted the week it lands. */
      if (s.week === 1 || res.kind === 'window') {
        for (let k = 0; k < 2; k += 1) {
          const man = spare(s, p => !p.transferStatus && !onTheList.has(p.id));
          if (!man) break;
          const after = setTransferStatus(s, man.id, 'listed');
          if (after !== s) { s = after; onTheList.add(man.id); listed += 1; }
        }
      }
      for (const bid of [...(s.incomingBids ?? [])]) {
        if (bid.loan || !onTheList.has(bid.playerId)) continue;
        const after = acceptBid(s, bid.playerId);
        if (after) { s = after; sales += 1; onTheList.delete(bid.playerId); check('after accepting a bid'); }
      }
      /* LOAN OUT. The button calls loanOutPlayer straight, no bid needed, and
         only while a window is open: once in the summer window and once in
         January. */
      if (s.week === 2 || (res.kind === 'window')) {
        const man = spare(s, p => !onTheList.has(p.id));
        if (man) {
          const after = loanOutPlayer(s, man.id);
          if (after) { s = after; loans += 1; check('after loaning a man out'); }
        }
      }
      /* PAY OFF. The contracts desk release, open all season. */
      if (s.week % 7 === 0) {
        const man = spare(s, p => !releaseBlock(s, p) && !onTheList.has(p.id));
        if (man) {
          const after = releasePlayer(s, man.id);
          if (after) { s = after; payoffs += 1; check('after paying a man off'); }
        }
      }
      if (s.sacked) break;
    }
  }
  console.log(`   ${careers} careers, ${samples} readings, ${listed} men listed, ${sales} sold through acceptBid, ${loans} loaned out, ${payoffs} paid off, ${drops} readings lower than the one before`);
  if (samples < 450) fail(`only ${samples} readings were sampled, so this section proves nothing`);
  /* The floors are the whole point: without them this section passes by never
     doing the things that used to break it. Measured over eight seeds (the
     filename seed, then SIM_SEED 1 to 7), twelve careers each:
       sales    23  23  23  27  29  24  26  28   (23 to 29)
       loans    18  19  21  20  21  19  20  20   (18 to 21)
       payoffs  34  35  34  37  32  33  37  34   (32 to 37)
     Each floor sits at about half of the lowest reading, so a seed has to
     halve an action before it goes red, and a change that stops one of the
     three from happening at all cannot pass. */
  if (sales < 11) fail(`only ${sales} men were sold through acceptBid, so the whistle gate is not being tested against a sale (measured 23 to 29)`);
  if (loans < 9) fail(`only ${loans} men were loaned out, so the whistle gate is not being tested against a loan (measured 18 to 21)`);
  if (payoffs < 16) fail(`only ${payoffs} men were paid off, so the whistle gate is not being tested against a payoff (measured 32 to 37)`);
  if (drops > 0) {
    fail(`the score fell ${drops} times, worst ${worst.club} week ${worst.week} ${worst.label}: ${worst.from} to ${worst.to}. The day best is a MAX, so a score that can fall is farmable.`);
  }
}

/* ---------- 3 and 4. One pass, two questions ---------- */
/* Both sections read the SAME seeded careers, because the expensive part is
   playing them and because the two questions are two views of one dataset:
   does the score still read the club, and does it read the season. */
const SAMPLE = (() => {
  /* THE SAMPLE HAS TO BE THIS BIG, and it was not in the first draft. At
     twenty clubs and three seasons the healthy arm measured 0.016 to 0.375
     for stature across five seeds while the old rule measured 0.331 to 0.653:
     the two OVERLAP, so no threshold separates them and the oldrule control
     fires or does not depending on the stream. That is a coin toss dressed as
     a rule, the thing CLAUDE.md names explicitly. The calibration run that
     set the weights used 34 clubs and 4 seasons and separated cleanly, so
     this uses the same shape. Every league size is represented on purpose. */
  const CLUBS = [
    'Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Liverpool', 'Inter Milan',
    'Napoli', 'Aston Villa', 'Newcastle', 'Sevilla', 'Stuttgart', 'Ajax', 'Benfica', 'Celtic',
    'Le Havre', 'Hull City', 'Bologna', 'Galatasaray', 'Al-Hilal', 'Dinamo Zagreb',
    'Rangers', 'Feyenoord', 'Porto', 'Lazio', 'Wolves', 'Brentford', 'Augsburg', 'Nice',
    'Lecce', 'Getafe', 'Twente', 'Rijeka', 'Sturm Graz', 'FC Midtjylland',
  ];
  assertRealClubs(CLUBS, 'the sections 3 and 4 sample');
  const rows = [];
  for (const club of CLUBS) {
    let s0;
    try { s0 = startCareer(club); } catch { continue; }
    const xi = clubPreviewRating(club);
    for (let season = 1; season <= 4; season += 1) {
      const done = playSeason(s0);
      if (!done) break;
      const { state, summary } = finishSeason(done);
      const objs = summary.objectives ?? [];
      const parts = summary.seasonScoreParts;
      if (isNum(xi) && isNum(summary.seasonScore) && objs.length > 0) {
        rows.push({
          xi,
          score: summary.seasonScore,
          /* The rule this round replaced, scored on the very same season,
             so section 4 can measure against a baseline from its own run. */
          oldRule: Math.min(130, summary.points + summary.trophies.length * 10),
          parts: parts ?? null,
          grade: summary.verdictGrade,
          objFrac: objs.filter(o => o.hit).length / objs.length,
        });
      }
      try { s0 = startNextSeason(state); } catch { break; }
    }
  }
  return rows;
})();

console.log('3) Management held identical, the club varied: how much does stature still explain?');
{
  /* The headline measurement. Nobody touches anything at any of these clubs,
     so every point of spread is the club and not the manager. */
  if (SAMPLE.length < 55) fail(`only ${SAMPLE.length} seasons were scored, so the sample is too small to separate the arms and this section proves nothing`);
  else {
    const r = correlation(SAMPLE.map(x => x.xi), SAMPLE.map(x => x.score));
    console.log(`   ${SAMPLE.length} seasons, correlation between the club's preview XI rating and its season score: ${r.toFixed(3)}`);
    /* MEASURED, both arms, on this exact sample across eight seeds (the
       filename seed, then SIM_SEED 1 to 7), with section 2 driving its three
       squad actions ahead of it in the stream:
         new rule  0.251 0.264 0.271 0.101 0.091 0.321 0.121 0.224   (0.091 to 0.321)
         old rule  0.777 0.752 0.690 0.655 0.756 0.773 0.724 0.739   (0.655 to 0.777)
       The bands do not touch. The gate is 0.47, 0.149 above the healthy arm's
       highest reading and 0.185 below the control's lowest. Re-measured rather
       than inherited: an earlier draft used 0.58, which left the CONTROL only
       0.10 of room, and a threshold is only as good as the arm it is closest
       to. */
    if (r > 0.47) fail(`stature still explains the score: correlation ${r.toFixed(3)} against a ceiling of 0.47 (measured: new rule 0.091 to 0.321, old rule 0.655 to 0.777)`);
  }
}

console.log('4) The score follows what the board actually asked for');
{
  /* The strongest signal available, chosen because it is the strongest and
     not because it is the most descriptive. Correlation with the share of
     board objectives hit. The verdict grade correlates too but far more
     weakly, so it is printed below as information and not used as the gate.

     TWO GATES, because the review asked a fair question of the first one.
     The score carries a term that is literally six points a tick, so its
     correlation with the share of ticks is partly that term correlating with
     itself. Was that all of it? It is not, and the second gate is what says
     so: with the board term taken out, the other four terms (league form, the
     title, the cup run and the European run) still follow the board, because
     a board asks for the things those terms pay for.

     The second gate is measured against a BASELINE from the same run rather
     than against a fixed floor. The old rule, scored on the very same
     seasons, follows the board a little too (a club that hits its board card
     tends to bank points), and across eight seeds the two arms came within
     0.09 of each other at their closest, so a fixed floor between them would
     have been a coin toss. Paired on the same seasons they never came
     within 0.16.

     The score without its board term is rebuilt from the season summary's
     own breakdown, and only when that breakdown really is the score: the five
     terms, capped at 130, must come to the number the summary prints. The
     season end screen lists those terms beside that number, so a breakdown
     that disagrees with it is a defect in its own right and fails here. A
     score that carries no breakdown of its own (the old rule, under the
     oldrule control) has no board term to take out, so it is read whole. */
  const partsSum = p => p.form + p.title + p.cup + p.euro + p.objectives;
  const described = x => !!x.parts && Math.min(S.LEDGER_CAP, partsSum(x.parts)) === x.score;
  const withoutBoard = x => (described(x) ? x.parts.form + x.parts.title + x.parts.cup + x.parts.euro : x.score);
  if (SAMPLE.length < 55) fail('sample too small to ask whether the score follows the board');
  else {
    const loose = SAMPLE.filter(x => !described(x));
    if (loose.length) fail(`${loose.length} of ${SAMPLE.length} season summaries print a breakdown that does not add up to the score beside it (first: score ${loose[0].score}, terms ${loose[0].parts ? partsSum(loose[0].parts) : 'none'})`);
    const board = SAMPLE.map(x => x.objFrac);
    const rFull = correlation(board, SAMPLE.map(x => x.score));
    const rOut = correlation(board, SAMPLE.map(withoutBoard));
    const rOld = correlation(board, SAMPLE.map(x => x.oldRule));
    console.log(`   correlation between the share of board objectives hit and the season score: ${rFull.toFixed(3)} with the board term in, ${rOut.toFixed(3)} with it taken out; the old rule on the same seasons ${rOld.toFixed(3)}, so ${(rOut - rOld).toFixed(3)} better without the board term`);
    const mean = a => a.reduce((x, n) => x + n, 0) / a.length;
    const line = ['A', 'B', 'C', 'D', 'F']
      .map(g => ({ g, v: SAMPLE.filter(x => x.grade === g).map(x => x.score) }))
      .filter(x => x.v.length >= 3)
      .map(x => `${x.g} n=${x.v.length} mean ${mean(x.v).toFixed(1)}`);
    console.log('   by the board verdict grade: ' + line.join('   '));
    /* MEASURED across eight seeds (the filename seed, then SIM_SEED 1 to 7):
         full score            0.706 0.687 0.705 0.762 0.753 0.797 0.706 0.696   (0.687 to 0.797)
         board term taken out  0.502 0.491 0.514 0.594 0.602 0.661 0.529 0.503   (0.491 to 0.661)
         old rule, same seasons 0.174 0.214 0.351 0.292 0.209 0.400 0.171 0.205  (0.171 to 0.400)
         taken out minus old   0.328 0.277 0.163 0.302 0.393 0.261 0.358 0.298   (0.163 to 0.393)
       Gate one, the full score: floor 0.54, midway between the old rule's
       highest reading and the new rule's lowest, so 0.147 clear of the healthy
       arm and 0.14 clear of the control. The first version of this gate was
       0.45 and quoted the old rule at 0.095 to 0.253; seed 5 above puts the
       old rule at 0.400, which would have left that control 0.05 of room.
       Gate two, the paired margin: at least 0.08, half the lowest measured.
       Under the oldrule control the score IS the old rule, so the margin
       reads 0.000 to 0.005. */
    if (rFull < 0.54) fail(`the score barely follows the board: correlation ${rFull.toFixed(3)} against a floor of 0.54 (measured: new rule 0.687 to 0.797, old rule 0.171 to 0.400)`);
    if (rOut - rOld < 0.08) fail(`with its board term taken out the score follows the board only ${(rOut - rOld).toFixed(3)} better than the old rule does on the same seasons (${rOut.toFixed(3)} against ${rOld.toFixed(3)}), under a floor of 0.08 (measured 0.163 to 0.393), so the board term is carrying the correlation on its own`);
  }
}

/* ---------- 5. A takeover does not pay for the last manager's season ---------- */
console.log('5) Walking into a job part way through pays for your share and not his');
{
  /* Driven on the pure module, because the point is arithmetic and not
     scheduling: the same final table, scored with and without a stamped
     handover, must differ by the previous manager's share. */
  const rounds = 38;
  const full = input({
    leaguePts: 90, leaguePlayed: rounds, leagueRounds: rounds,
    wonLeague: true, cupRank: 4, euroRank: 2, objectivesDone: ticks(5),
  });
  const scratch = seasonScoreFor(full);
  /* He played 27 of the 38 and banked 70 of the 90, was already in the cup
     semi final, and had ticked four of the five boxes. You played eleven. */
  const inherited = seasonScoreFor({
    ...full,
    handover: { pts: 70, played: 27, cupRank: 3, euroRank: 2, objectivesDone: ticks(4), wonLeague: false },
  });
  console.log(`   identical final table: from week 0 scores ${scratch}, walking in with 11 games left scores ${inherited}`);
  if (!(inherited < scratch)) {
    fail(`a takeover scored ${inherited} against ${scratch} for the same table, so the previous manager's season is being paid to you`);
  }

  /* EACH STAMPED TERM, SEPARATELY. The inequality above stays true while any
     one of the three honours subtractions is broken, so it proved nothing
     about any of them on its own. Here the previous manager banked a cup
     run to the semi final, a European run to the first knockout round and
     three board ticks, and each term must read exactly what the new manager
     added and nothing he inherited. */
  const board = ['league', 'cup', 'ucl', 'rival', 'goals'];
  const whistle = input({
    leaguePts: 90, leaguePlayed: rounds, leagueRounds: rounds,
    wonLeague: false, cupRank: 4, euroRank: 4, objectivesDone: board,
  });
  const stamped = { pts: 50, played: 20, cupRank: 2, euroRank: 1, objectivesDone: ['cup', 'goals', 'youth'], wonLeague: false };
  const led = S.seasonLedger({ ...whistle, handover: stamped });
  const wantCup = S.CUP_POINTS[4] - S.CUP_POINTS[stamped.cupRank];
  const wantEuro = S.EURO_POINTS[4] - S.EURO_POINTS[stamped.euroRank];
  /* cup and goals are still ticked at the whistle and were his, youth was
     his but has come off the card, so the new manager is paid for league,
     ucl and rival and docked for nothing he does not hold. */
  const wantObj = (board.length - 2) * S.W_OBJ_EACH;
  console.log(`   he left it at cup semi final, Europe round one, ticks cup+goals+youth; you won both and the card reads league+cup+ucl+rival+goals: cup ${led.cup} (want ${wantCup}), Europe ${led.euro} (want ${wantEuro}), board ${led.objectives} (want ${wantObj})`);
  if (led.cup !== wantCup) fail(`the cup term read ${led.cup} against ${wantCup}: the stamped cup run is not being subtracted correctly`);
  if (led.euro !== wantEuro) fail(`the Europe term read ${led.euro} against ${wantEuro}: the stamped European run is not being subtracted correctly`);
  if (led.objectives !== wantObj) fail(`the board term read ${led.objectives} against ${wantObj}: the stamped ticks are not being subtracted by id (a tick that came off must not be docked, one still on must be)`);
  /* And the shape the first version stamped, a bare count, is still read as
     a count, so a save from a preview build does not lose its handover. */
  const counted = S.seasonLedger({ ...whistle, handover: { ...stamped, objectivesDone: 3 } });
  const wantCounted = (board.length - 3) * S.W_OBJ_EACH;
  if (counted.objectives !== wantCounted) fail(`a handover stamped with a count of 3 read a board term of ${counted.objectives} against ${wantCounted}`);

  /* The title a man had ALREADY won when you arrived pays nothing.
     BE HONEST ABOUT WHAT THIS PROVES. handover.wonLeague can only be true if a
     League Title trophy is already stamped when startMidSeason runs, and it
     never is in shipped code, so the guard it polices is unreachable today.
     It is kept as a property of the pure module (a save editor, or a future
     takeover that starts from a finished season, would reach it) and is tested
     here as such, not claimed as a live path. */
  const gifted = seasonScoreFor({
    ...full,
    handover: { pts: 80, played: 34, cupRank: 4, euroRank: 2, objectivesDone: ticks(5), wonLeague: true },
  });
  console.log(`   a league already won when you walked in: ${gifted} (module level property, not reachable in shipped play)`);
  if (gifted >= inherited) fail(`inheriting a won league scored ${gifted}, at or above ${inherited} for inheriting a leader, so the title is being gifted`);
  if (gifted < 0 || gifted > 130) fail(`out of range: ${gifted}`);

  /* THE LEGACY TAKEOVER, which IS reachable: a save written before this round
     carries midSeasonStart and no stamped handover, so the previous manager's
     cup run, European run and board ticks are unknown. Zeroing them paid the
     new manager for all three. They are scaled by the share of the season he
     actually managed instead, so a run-in takeover cannot bank a cup somebody
     else won four rounds of. No log here, so the constant carries the points;
     section 12 is where the log replay is measured. */
  const legacyRunIn = seasonScoreFor(input({
    leaguePts: 90, leaguePlayed: rounds, leagueRounds: rounds,
    cupRank: 4, euroRank: 4, objectivesDone: ticks(5), legacyStart: 'runIn',
  }));
  const legacyScratch = seasonScoreFor(input({
    leaguePts: 90, leaguePlayed: rounds, leagueRounds: rounds,
    cupRank: 4, euroRank: 4, objectivesDone: ticks(5),
  }));
  console.log(`   an old takeover save, same honours: from week 0 ${legacyScratch}, taking over for the run-in ${legacyRunIn}`);
  if (!(legacyRunIn < legacyScratch)) {
    fail(`a legacy run-in takeover scored ${legacyRunIn} against ${legacyScratch} from week 0 with the same cup, Europe and board card, so it is being paid for honours it cannot be shown to have won`);
  }
}

/* ---------- 6. The legacy estimate stays in its own season ---------- */
console.log('6) A takeover save does not subtract a phantom manager for the rest of the career');
{
  /* This is the flaw all three design judges found independently, and it is
     invisible at the ends: the season END reading is still right, so it would
     have shipped. midSeasonStart has exactly two writes in the repo and the
     engine never clears it, so without the season 1 gate every later season
     subtracts a manager who does not exist and the 48 point form term reads
     zero for roughly two thirds of the year. */
  let s;
  try { s = startCareer('Newcastle'); } catch { s = null; }
  if (!s) fail('could not start a career, so this section proves nothing');
  else {
    /* A save that carries the old marker and no stamped handover, which is
       exactly the shape of a takeover save written before this round. Its
       fixture log is empty against a table that says 14 played, so the
       replay refuses and the constant carries the estimate here. */
    /* THE COMPARISON HAS TO BE MARKER AGAINST NO MARKER at the SAME season.
       Comparing season 1 to season 4 cannot see this: with the gate lifted
       BOTH seasons subtract the phantom, so the two readings agree and the
       check passes while the bug is live. The first draft of this section did
       exactly that and the nolegacygate control reported green. */
    const withPoints = { ...s, table: bumpMyRow(s, 40, 14) };
    const marked = { ...withPoints, midSeasonStart: 'runIn', handover: undefined };
    const clean = { ...withPoints, midSeasonStart: undefined, handover: undefined };

    const markedS1 = currentSeasonScore({ ...marked, season: 1 });
    const cleanS1 = currentSeasonScore({ ...clean, season: 1 });
    console.log(`   season 1, 40 points from 14 games: takeover save ${markedS1}, ordinary save ${cleanS1}`);
    /* In its OWN season the estimate legitimately applies, so the takeover
       reading must be the lower of the two. If it is not, the handover is
       doing nothing at all. */
    if (!(markedS1 < cleanS1)) {
      fail(`a season 1 takeover save read ${markedS1} against ${cleanS1} for an ordinary save on the same table, so the previous manager is not being subtracted at all`);
    }

    const markedS4 = currentSeasonScore({ ...marked, season: 4 });
    const cleanS4 = currentSeasonScore({ ...clean, season: 4 });
    console.log(`   season 4, same table:            takeover save ${markedS4}, ordinary save ${cleanS4}`);
    /* By season 4 the takeover is ancient history. The marker outlives its
       season (it has exactly two writes in the repo and the engine never
       clears it), so the score must ignore it and the two readings must be
       IDENTICAL. */
    if (markedS4 !== cleanS4) {
      fail(`season 4 of a takeover career read ${markedS4} against ${cleanS4} for an ordinary save on the same table, so a manager who left three seasons ago is still being subtracted`);
    }
  }
}

function bumpMyRow(state, pts, played) {
  return state.table.map(r => (r.club === state.clubName
    ? { ...r, pts, w: Math.floor(pts / 3), d: pts % 3, l: Math.max(0, played - Math.floor(pts / 3) - (pts % 3)) }
    : r));
}

/* ---------- 7. A league with no European route can still reach the top ---------- */
console.log('7) The ceiling is reachable without a Champions League run');
{
  /* Five playable leagues have no European route at all, so if Europe were
     priced into the ceiling their managers could never reach the top of the
     scale however well they did. That is the same shape as the bug this round
     fixes, one level up.

     THE REAL PROFILE IS THE GATE, not the helper. ceilingWithoutEurope() is
     arithmetic on the weights, and a control that moved only that arithmetic
     turned this section red while the score itself was untouched, which is
     the wrong thing to have proved. A perfect Championship season with no
     Europe is scored through seasonLedger itself, and the helper is then held
     to agree with it. */
  const cap = S.LEDGER_CAP;
  const rounds = 46;
  const best = seasonScoreFor(input({
    leaguePts: 3 * rounds, leaguePlayed: rounds, leagueRounds: rounds,
    wonLeague: true, cupRank: 4, euroRank: 0, objectivesDone: ['league', 'cup', 'rival', 'points', 'youth'],
  }));
  const withoutEurope = S.ceilingWithoutEurope();
  console.log(`   a perfect Championship season with no Europe scores ${best}; the scale's cap is ${cap}; the helper says ${withoutEurope}`);
  if (best !== cap) fail(`a perfect season in a league with no European route scored ${best}, not ${cap}, so its managers are structurally underpaid by ${cap - best}`);
  if (withoutEurope !== best) fail(`ceilingWithoutEurope() says ${withoutEurope} while the real profile scores ${best}, so the helper the copy leans on no longer describes the score`);
}

/* ---------- 8. The range holds, including on nonsense ---------- */
console.log('8) 0 to 130 at both ends, and a malformed save cannot escape it');
{
  const cap = S.LEDGER_CAP;
  const cases = [
    ['nothing at all', input({ leaguePlayed: 0 })],
    ['not in the table', input({ inTable: false, leaguePts: 99, wonLeague: true, cupRank: 4, euroRank: 4, objectivesDone: ticks(9) })],
    ['everything won', input({ leaguePts: 114, wonLeague: true, cupRank: 4, euroRank: 4, objectivesDone: ticks(9) })],
    ['NaN points', input({ leaguePts: NaN, leaguePlayed: NaN, leagueRounds: NaN, cupRank: NaN, euroRank: NaN, objectivesDone: NaN, calendarLength: NaN })],
    ['negative everything', input({ leaguePts: -50, leaguePlayed: -9, leagueRounds: -3, cupRank: -2, euroRank: -7, objectivesDone: -4, calendarLength: -1 })],
    ['absurd ranks', input({ leaguePts: 1e9, leaguePlayed: 1e9, wonLeague: true, cupRank: 99, euroRank: 99, objectivesDone: new Array(1000).fill('league') })],
    ['garbage handover', input({ leaguePts: 60, leaguePlayed: 30, cupRank: 1, objectivesDone: ticks(2), handover: { pts: NaN, played: -5, cupRank: 99, euroRank: NaN, objectivesDone: -1, wonLeague: false } })],
    ['garbage stamped ids', input({ leaguePts: 60, leaguePlayed: 30, cupRank: 1, objectivesDone: ticks(2), handover: { pts: 10, played: 5, cupRank: 0, euroRank: 0, objectivesDone: [1, null, 'league', {}], wonLeague: false } })],
    ['garbage fixture log', input({ leaguePts: 60, leaguePlayed: 30, cupRank: 1, objectivesDone: ticks(2), legacyStart: 'runIn', legacyLog: [{ week: NaN, league: 'yes', res: 'W' }, null, { week: 3, league: true, res: 'X' }] })],
  ];
  let bad = 0;
  for (const [name, inp] of cases) {
    let v;
    try { v = seasonScoreFor(inp); } catch (e) { v = `threw ${e && e.message}`; }
    const ok = Number.isInteger(v) && v >= 0 && v <= cap;
    console.log(`   ${name.padEnd(22)} ${String(v).padStart(4)}${ok ? '' : '   OUT OF RANGE'}`);
    if (!ok) { bad += 1; fail(`${name} produced ${v}, which is not an integer in 0..${cap}`); }
  }
  if (cases.length - bad < 9) fail('not every range case ran, so this section proves nothing');
}

/* ---------- 9. The save shape is untouched ---------- */
console.log('9) SAVE_VERSION did not move and the new field is optional');
{
  /* Read off the engine text the bundle was built from, so the control that
     edits the shadow is seen here rather than only on disk. Without a control
     that text IS the file on disk. Comments out, so a doc comment quoting the
     optional field cannot stand in for the field. */
  const src = codeOf(engine);
  const m = src.match(/const SAVE_VERSION = (\d+)/);
  if (!m) fail('SAVE_VERSION is gone from clubManager.ts');
  else {
    console.log(`   SAVE_VERSION ${m[1]}`);
    if (m[1] !== '3') fail(`SAVE_VERSION moved to ${m[1]}. loadCareer returns null on a mismatch and there is no migration path, so every live career would be discarded.`);
  }
  if (!/handover\?: SeasonHandover \| null;/.test(src)) {
    fail('CareerState.handover is not optional, so a save written before this round would not load');
  }
  /* A career that never was a takeover carries no handover at all, and the
     score must be identical whether the field is absent or null. */
  let s;
  try { s = startCareer('Celtic'); } catch { s = null; }
  if (s) {
    /* ON A CAREER THAT HAS ACTUALLY PLAYED. A raw startCareer has no points,
       no games and no honours, so absent and null both read 0 and the check
       passes for ANY implementation, including one that ignores the field
       entirely. Putting points on the board is what makes the two readings
       capable of disagreeing. */
    const played = { ...s, table: bumpMyRow(s, 52, 20) };
    const absent = currentSeasonScore({ ...played, handover: undefined });
    const nulled = currentSeasonScore({ ...played, handover: null });
    console.log(`   52 points from 20 games: handover absent ${absent}, handover null ${nulled}`);
    if (absent === 0) fail('the save shape check ran on a career with nothing on the board, so it cannot discriminate any implementation');
    if (absent !== nulled) fail(`an absent handover scores ${absent} and a null one ${nulled}; an older save must read the same as a new one`);
  } else fail('could not start a career for the save shape check');
  /* And the call shapes three other harnesses string match must still exist. */
  const hook = codeOf(fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useClubManager.ts'), 'utf8'));
  const pings = [...hook.matchAll(/recordActivity\('\/club-manager', currentSeasonScore\(/g)].length;
  const ends = [...hook.matchAll(/recordCompletion\('\/club-manager', sm\.seasonScore\)/g)].length;
  console.log(`   useClubManager still has ${pings} match pings and ${ends} season end completions`);
  if (pings < 3) fail(`only ${pings} recordActivity pings left; simSessionMarks section 5 and simActivityNotCompletion's control both string match that literal`);
  if (ends < 3) fail(`only ${ends} recordCompletion(sm.seasonScore) calls left; simSessionMarks section 5 expects 3`);
}

/* ---------- 10. The help screen and the constants agree ---------- */
console.log('10) The How To Play numbers are the numbers the code uses');
{
  /* Nothing tied these together before, so the weights could be retuned and
     the screen would go on quoting the old ones at the player. The check reads
     the CODE's numbers from the module and the COPY's numbers from the JSX,
     rather than reading either twice. The cup and European steps are checked
     as the phrase each one sits in, so a moved step cannot pass on a number
     that happens to appear elsewhere in the paragraph. */
  const help = codeOf(fs.readFileSync(path.join(ROOT, 'src', 'components', 'club-manager', 'ClubManagerHelp.tsx'), 'utf8'));
  const para = (help.match(/Season score, out of [\s\S]*?<\/p>/) ?? [''])[0];
  if (!para) fail('the season score paragraph is gone from ClubManagerHelp.tsx, so the copy cannot be checked against the code');
  else {
    const must = [
      ['the scale', `\\b${S.LEDGER_CAP}\\b`],
      ['league form', `\\b${S.W_FORM}\\b`],
      ['the title', `\\b${S.W_TITLE}\\b`],
      ['a cup win', `\\b${S.CUP_POINTS[4]}\\b`],
      ['a European win', `\\b${S.EURO_POINTS[4]}\\b`],
      ['each objective', `\\b${S.W_OBJ_EACH}\\b`],
      ['the board cap', `\\b${S.W_OBJ_CAP}\\b`],
      ['the five terms before the cap', `\\b${S.ledgerRawCeiling()}\\b`],
      ['the cup quarter final step', `\\b${S.CUP_POINTS[1]} for the quarter finals\\b`],
      ['the cup semi final step', `\\b${S.CUP_POINTS[2]} for the semis\\b`],
      ['the cup final step', `\\b${S.CUP_POINTS[3]} for the final\\b`],
      ['the cup win step', `\\b${S.CUP_POINTS[4]} for lifting it\\b`],
      ['the European knockout step', `\\b${S.EURO_POINTS[1]} for reaching the knockouts\\b`],
      ['the European semi final step', `\\b${S.EURO_POINTS[2]} for the semis\\b`],
      ['the European final step', `\\b${S.EURO_POINTS[3]} for the final\\b`],
      ['the European win step', `\\b${S.EURO_POINTS[4]} for winning it\\b`],
    ];
    const missing = must.filter(([, re]) => !new RegExp(re).test(para));
    console.log(`   checked ${must.length} numbers against the copy, ${missing.length} missing`);
    for (const [what, re] of missing) {
      fail(`the help copy does not state ${what} (${re.replaceAll('\\b', '')}), so the screen and the code can disagree without anything going red`);
    }
  }
}

/* ---------- 11 and 12. Real takeovers, through startMidSeason itself ---------- */
/* startMidSeason is the only live writer of the handover the score subtracts,
   and the first version of this harness never called it. Both sections below
   read the same takeovers, because the expensive part is playing them. */
const TAKEOVERS = (() => {
  const CLUBS = [
    'Real Madrid', 'Liverpool', 'Napoli', 'Sevilla', 'Stuttgart', 'Ajax', 'Benfica', 'Celtic', 'Le Havre',
    'Hull City', 'Galatasaray', 'Al-Hilal', 'Dinamo Zagreb', 'Rangers', 'Wolves', 'Augsburg', 'Lecce', 'Rijeka',
  ];
  assertRealClubs(CLUBS, 'the sections 11 and 12 sample');
  const runs = [];
  for (const club of CLUBS) {
    for (const entry of ['autumn', 'newYear', 'runIn']) {
      let fresh;
      try { fresh = startCareer(club); } catch { continue; }
      const taken = startMidSeason(fresh, entry);
      const row = taken.table.find(r => r.club === taken.clubName);
      /* The harness's OWN reading of what the previous manager banked, off
         the table at the moment of handover, so the record the engine stamped
         and the replay the score rebuilds are both measured against it and
         neither against the other. */
      const truth = row ? { pts: row.pts, played: row.w + row.d + row.l } : null;
      runs.push({ club, entry, taken, truth });
    }
  }
  return runs;
})();

console.log('11) A takeover through startMidSeason stamps exactly what the table says he banked');
{
  let checked = 0;
  for (const r of TAKEOVERS) {
    const { taken: t, truth } = r;
    const label = `${r.club} ${r.entry}`;
    if (!truth) { fail(`${label}: my club is not in its own table`); continue; }
    const h = t.handover;
    if (!h) { fail(`${label}: no handover was stamped`); continue; }
    checked += 1;
    if (h.pts !== truth.pts || h.played !== truth.played) fail(`${label}: stamped ${h.pts} points from ${h.played} games, the table says ${truth.pts} from ${truth.played}`);
    if (h.cupRank !== cupProgressRank(t).rank) fail(`${label}: stamped cup rank ${h.cupRank}, the state says ${cupProgressRank(t).rank}`);
    if (h.euroRank !== uclProgressRank(t).rank) fail(`${label}: stamped Europe rank ${h.euroRank}, the state says ${uclProgressRank(t).rank}`);
    const doneIds = objectiveStatuses(t).filter(o => o.status === 'done').map(o => o.objective.id);
    if (!Array.isArray(h.objectivesDone) || JSON.stringify(h.objectivesDone) !== JSON.stringify(doneIds)) {
      fail(`${label}: stamped ticks ${JSON.stringify(h.objectivesDone)}, the card reads ${JSON.stringify(doneIds)}`);
    }
    if (h.wonLeague !== false) fail(`${label}: wonLeague stamped ${h.wonLeague} on a season still in play`);
    /* And the week the keys changed hands is the week the pure module will
       compute for a legacy save, or the replay in section 12 reads the wrong
       matches as his. */
    const want = S.legacyTakeoverWeek(t.calendar.length, r.entry);
    if (t.week !== want) fail(`${label}: the handover landed at week ${t.week} while legacyTakeoverWeek says ${want}; the two formulas have drifted apart`);
  }
  console.log(`   ${checked} takeovers at ${new Set(TAKEOVERS.map(r => r.club)).size} clubs, every stamp read against the table, the cup, Europe and the card`);
  if (checked < 40) fail(`only ${checked} takeovers were stamped and checked, so this section proves little`);
}

console.log('12) A takeover save from before the round replays his league record from the fixture log');
{
  /* A pre Round 633 takeover save is this exact state with the stamp
     removed: midSeasonStart set, no handover. The score has to recover the
     previous manager's points from what the save still carries, and the
     fixture log carries every match with the week it was played in. The
     constant it used to fall back on is measured here too, on the same
     sample, so the size of the repair is on the record.

     THE REFERENCE IS THE TABLE, not the engine's stamp. `truth` is the
     harness's own reading of the table at the moment of takeover, and the
     reference ledger is scored with those league numbers. The stamp's cup,
     Europe and board fields are borrowed only for the whole score line, which
     is printed and not asserted, so a broken stamp turns section 11 red and
     leaves this one measuring the replay alone. */
  let atTakeover = 0, atWhistle = 0, sacked = 0;
  const constFormTake = [], constTotalTake = [], replayTotalTake = [], constAboveZero = [];
  const leagueGapReplay = [], leagueGapConst = [], totalGapReplay = [], totalGapConst = [];
  const refInput = (inp, t, truth) => ({
    ...inp, handover: { ...t.handover, pts: truth.pts, played: truth.played }, legacyStart: null, legacyLog: null,
  });
  const leagueTerms = l => l.form + l.title;
  let truncated = 0, truncatedFellBack = 0, trimmedCup = 0, trimmedCupExact = 0;
  for (const r of TAKEOVERS) {
    const { taken: t, truth } = r;
    const label = `${r.club} ${r.entry}`;
    if (!truth || !t.handover) continue;
    const stripped = { ...t, handover: undefined };

    /* At the moment of takeover. */
    const inp = seasonLedgerInputOf(stripped);
    const h = S.handoverOf(inp);
    atTakeover += 1;
    if (!h || !h.fromLog) fail(`${label}: at the takeover the legacy path did not replay the log (${h ? 'fell back to the constant' : 'no handover at all'})`);
    else if (h.pts !== truth.pts || h.played !== truth.played) fail(`${label}: at the takeover the replay says ${h.pts} points from ${h.played} games, the table said ${truth.pts} from ${truth.played}`);
    const replayNow = S.seasonLedger(inp);
    if (replayNow.form !== 0) fail(`${label}: the new manager has picked no team yet and the form term already reads ${replayNow.form}`);
    const constNow = S.seasonLedger({ ...inp, legacyLog: null });
    constFormTake.push(constNow.form);
    constTotalTake.push(constNow.total);
    replayTotalTake.push(replayNow.total);
    if (constNow.form > 0) constAboveZero.push(label);

    /* THE 60 ENTRY CAP. resultLog keeps only the newest 60 entries, so on a
       long enough season the oldest go first, and the oldest are always the
       previous manager's. Dropping his first league match must send the
       score back to the constant rather than replay a record with a hole in
       it. And dropping a CUP or European entry must not: the league record
       is still whole, so the replay still holds. */
    const log = stripped.resultLog ?? [];
    const firstLeague = log.findIndex(e => e.competition === 'league');
    if (firstLeague >= 0) {
      truncated += 1;
      const cut = S.handoverOf(seasonLedgerInputOf({ ...stripped, resultLog: log.slice(firstLeague + 1) }));
      if (cut && cut.estimated && !cut.fromLog) truncatedFellBack += 1;
      else fail(`${label}: with his first league match dropped from the log the score still ${cut ? 'replayed it' : 'found no handover'}, so a capped log undercounts the previous manager`);
    }
    const firstOther = log.findIndex(e => e.competition && e.competition !== 'league');
    if (firstOther >= 0) {
      trimmedCup += 1;
      const kept = S.handoverOf(seasonLedgerInputOf({ ...stripped, resultLog: log.filter((_, k) => k !== firstOther) }));
      if (kept && kept.fromLog && kept.pts === truth.pts && kept.played === truth.played) trimmedCupExact += 1;
      else fail(`${label}: with a cup or European entry dropped the league record is still whole, and the score ${kept && kept.fromLog ? `replayed ${kept.pts} from ${kept.played}` : 'fell back to the constant'}`);
    }

    /* At the final whistle, the season played out under the new manager. */
    const done = playSeason(stripped);
    if (!done) { sacked += 1; continue; }
    const inpW = seasonLedgerInputOf(done);
    const hW = S.handoverOf(inpW);
    atWhistle += 1;
    if (!hW || !hW.fromLog) { fail(`${label}: at the whistle the legacy path did not replay the log`); continue; }
    if (hW.pts !== truth.pts || hW.played !== truth.played) fail(`${label}: at the whistle the replay says ${hW.pts} points from ${hW.played} games, the table at the takeover said ${truth.pts} from ${truth.played}`);
    const refLed = S.seasonLedger(refInput(inpW, t, truth));
    const replayLed = S.seasonLedger(inpW);
    const constLed = S.seasonLedger({ ...inpW, legacyLog: null });
    if (leagueTerms(replayLed) !== leagueTerms(refLed)) fail(`${label}: the replay's league terms (form ${replayLed.form}, title ${replayLed.title}) differ from the record's (form ${refLed.form}, title ${refLed.title})`);
    leagueGapReplay.push(Math.abs(leagueTerms(replayLed) - leagueTerms(refLed)));
    leagueGapConst.push(Math.abs(leagueTerms(constLed) - leagueTerms(refLed)));
    totalGapReplay.push(Math.abs(replayLed.total - refLed.total));
    totalGapConst.push(Math.abs(constLed.total - refLed.total));
  }
  const dist = a => `median ${median(a)}, p90 ${p90(a)}, max ${Math.max(0, ...a)}`;
  console.log(`   ${atTakeover} takeovers replayed at the handover, ${atWhistle} at the whistle (${sacked} sacked before it)`);
  console.log(`   at the takeover, no team picked yet: the constant read a form term above 0 in ${constAboveZero.length} of ${atTakeover} saves (${dist(constFormTake)} of ${S.W_FORM}) and a whole score of ${dist(constTotalTake)}; the replay reads form 0 in all of them and a whole score of ${dist(replayTotalTake)}`);
  console.log(`   at the whistle, league terms (form and title) against the record: replay ${dist(leagueGapReplay)}; constant ${dist(leagueGapConst)}`);
  console.log(`   at the whistle, whole score against the record: replay ${dist(totalGapReplay)}; constant ${dist(totalGapConst)} (the cup, Europe and board terms are paid at share on a legacy save by design, not subtracted, so the whole score keeps that gap)`);
  console.log(`   the 60 entry cap: ${truncatedFellBack} of ${truncated} logs missing his first league match fell back to the constant; ${trimmedCupExact} of ${trimmedCup} missing a cup or European entry still replayed exactly`);
  /* Exact equality is the right bar: the replay is a sum over a record, not
     a statistic, and it reproduced the table in all 54 takeovers at the
     handover and in every one that reached the whistle, on each of eight
     seeds (the filename seed, then SIM_SEED 1 to 7). The count floors are
     what stop a sample of three passing. Measured on those seeds: 54
     takeovers every time, 50 to 54 reaching the whistle, 54 logs to cut and
     54 carrying a cup or European entry before the handover. */
  if (atTakeover < 40) fail(`only ${atTakeover} takeovers were replayed, so this section proves little (measured 54)`);
  if (atWhistle < 30) fail(`only ${atWhistle} takeovers reached the whistle, so the whistle half of this section proves little (measured 50 to 54)`);
  if (truncated < 40) fail(`only ${truncated} logs could be cut, so the cap fallback is barely tested (measured 54)`);
  if (trimmedCup < 27) fail(`only ${trimmedCup} logs carried a cup or European entry before the handover, so the converse of the cap check is barely tested (measured 54)`);
}

function correlation(a, b) {
  const mean = x => x.reduce((s, n) => s + n, 0) / x.length;
  const ma = mean(a), mb = mean(b);
  const cov = mean(a.map((v, i) => (v - ma) * (b[i] - mb)));
  const sa = Math.sqrt(mean(a.map(v => (v - ma) ** 2)));
  const sb = Math.sqrt(mean(b.map(v => (v - mb) ** 2)));
  return sa === 0 || sb === 0 ? 0 : cov / (sa * sb);
}

if (failures) {
  console.error(`\n${failures} SEASON SCORE CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL SEASON SCORE CHECKS PASSED');

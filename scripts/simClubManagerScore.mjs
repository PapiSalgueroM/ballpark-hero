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
 * otherwise.
 *
 *   CM_SCORE_CONTROL=rawpoints    form reads RAW league points instead of the
 *                                 share of points available. Section 1, league
 *                                 size neutrality, must go red.
 *   CM_SCORE_CONTROL=ratescore    form reads points per game PLAYED, the rate
 *                                 that reads 3.00 after one opening win.
 *                                 Section 2, the monotone law, must go red.
 *   CM_SCORE_CONTROL=oldrule      puts back min(130, pts + 10 a trophy).
 *                                 Sections 3 and 4, stature and following the
 *                                 board, must both go red. (It trips 6 too,
 *                                 because the old rule has no handover at
 *                                 all, and that is fine: a control may fail
 *                                 more than the section it was written for.)
 *   CM_SCORE_CONTROL=nohandover   stops the takeover subtracting the previous
 *                                 manager. Section 5 must go red.
 *   CM_SCORE_CONTROL=nolegacygate lifts the season 1 gate on the legacy
 *                                 estimate, which is the flaw all three design
 *                                 judges found independently. Section 6.
 *   CM_SCORE_CONTROL=europriced   prices Europe into the ceiling, so the five
 *                                 leagues with no European route can never
 *                                 reach 130. Section 7.
 *   CM_SCORE_CONTROL=liveobjectives grades the board card LIVE instead of at
 *                                 the final whistle, which is the bug the
 *                                 adversarial review found: selling or paying
 *                                 off an under 21 un-ticks the youth objective
 *                                 and takes 6 points off a live score.
 *                                 Section 2 must go red.
 *   CM_SCORE_CONTROL=legacyfreecup pays a pre Round 633 takeover save in full
 *                                 for the previous manager's cup run,
 *                                 European run and board card. Section 5.
 *   CM_SCORE_CONTROL=copydrift    moves a weight without touching the help
 *                                 copy, which is how the screen starts lying
 *                                 to the player. Section 10 must go red.
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

const KNOWN = ['rawpoints', 'ratescore', 'oldrule', 'nohandover', 'nolegacygate', 'europriced', 'liveobjectives', 'legacyfreecup', 'copydrift'];
const CONTROL = process.env.CM_SCORE_CONTROL || '';
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_SCORE_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

/* ---------- the engine, with the control applied IN MEMORY ---------- */
/* Never on disk: a crashed run must not be able to leave a rewritten engine
   where tsc or a build would read it. Same approach as simClubManagerFreeAgents. */
const SCORE_SRC = path.join(ROOT, 'src', 'lib', 'clubManagerScore.ts');
const ENGINE_SRC = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
const scoreText = fs.readFileSync(SCORE_SRC, 'utf8');
const engineText = fs.readFileSync(ENGINE_SRC, 'utf8');

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

let score = scoreText;
let engine = engineText;
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
  engine = swap(engine, '    legacyStart: !stamped && career.season === 1 ? (career.midSeasonStart ?? null) : null,',
    '    legacyStart: !stamped ? (career.midSeasonStart ?? null) : null,', 'clubManager.ts');
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
  /* Moves a weight without touching the help copy, which is exactly how the
     screen ends up lying to the player. Section 10 must go red. */
  score = swap(score, 'export const W_FORM = 48;', 'export const W_FORM = 44;', 'clubManagerScore.ts');
} else if (CONTROL === 'europriced') {
  score = swap(score, '  return Math.min(LEDGER_CAP, W_FORM + W_TITLE + CUP_POINTS[4] + W_OBJ_CAP);',
    '  return Math.min(LEDGER_CAP, W_FORM + W_TITLE + CUP_POINTS[4] + W_OBJ_CAP) - 24;', 'clubManagerScore.ts');
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
fs.writeFileSync(shadowScore, score);
fs.writeFileSync(shadowEngine, engine);

/* THE ENTRY MUST POINT AT THE SHADOWS TOO, and the first draft of this file
   did not. It imported both modules by ABSOLUTE PATH while the aliases below
   only rewrite the '@/lib/...' specifier, so the engine's own internal import
   picked up the rewritten score module but the handles the sections call
   directly did not. Five of the six controls reported green, which is the
   exact failure this repo's rules call out: a control that changes nothing
   reports green for the wrong reason. Both routes are pointed at the same
   file now, so there is one copy of each module in the bundle. */
const entryScore = (CONTROL ? shadowScore : path.join(ROOT, 'src', 'lib', 'clubManagerScore.ts')).replaceAll('\\', '/');
const entryEngine = (CONTROL ? shadowEngine : path.join(ROOT, 'src', 'lib', 'clubManager.ts')).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const eng = await import('${entryEngine}');
const sc = await import('${entryScore}');
export const engine = eng;
export const scoreMod = sc;
`);

const alias = CONTROL
  ? `--alias:@/lib/clubManagerScore=${shadowScore.replaceAll('\\', '/')} --alias:@/lib/clubManager=${shadowEngine.replaceAll('\\', '/')}`
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
} = cm;

/* Every playable league size in the game, read from the engine rather than
   written down, so a new league joins this harness on its own. */
const LEAGUE_SIZES = [...new Set(REAL_LEAGUES.map(l => l.clubs.length))].sort((a, b) => a - b);

/* EVERY CLUB THIS HARNESS NAMES MUST BE REAL, and this is not pedantry. A name
   clubDefMap does not know does NOT throw: clubDefFor returns a flat fallback
   (tier 4, expectation 10) and leagueOf falls back to the PREMIER LEAGUE, so a
   typo silently becomes an invented Premier League club and quietly poisons
   the two correlation gates below. simClubManagerFreeAgents learned this the
   same way. */
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
      const total = seasonScoreFor({
        inTable: true,
        leaguePts: Math.round(3 * rounds * p.share),
        leaguePlayed: rounds,
        leagueRounds: rounds,
        wonLeague: p.won, cupRank: p.cup, euroRank: p.euro, objectivesDone: p.obj,
        seasonDone: true, handover: null, legacyStart: null,
      });
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

function seasonScoreFor(input) {
  return S.seasonLedgerScore(input);
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
     paid for. It exercises all three removal paths now: the contracts desk release,
     accepting a bid, and loaning a man out. A monotonicity check that
     never changes the squad is not a monotonicity check. */
  const CLUBS = ['Newcastle', 'Sevilla', 'Stuttgart', 'Celtic', 'Le Havre', 'Napoli',
    'Rijeka', 'Twente', 'Wolves', 'Al-Hilal', 'Galatasaray', 'Lecce'];
  assertRealClubs(CLUBS, "section 2's sample");
  let drops = 0, samples = 0, careers = 0, removals = 0, worst = null;
  for (const club of CLUBS) {
    let s;
    try { s = startCareer(club); } catch { continue; }
    let prev = currentSeasonScore(s);
    let guard = 0;
    careers += 1;
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

      /* Every few weeks, take somebody out of the squad through whichever
         route is open, and read the score again straight afterwards. These are
         the exact calls the three buttons make (useClubManager's terminate,
         acceptBid and loanOut). */
      if (s.week % 5 === 0) {
        const bid = (s.incomingBids ?? [])[0];
        if (bid) {
          const after = acceptBid(s, bid.playerId);
          if (after) { s = after; removals += 1; check('after accepting a bid'); }
        }
      }
      if (s.week % 7 === 0) {
        /* Prefer an under 21 with appearances: that is the player the youth
           objective counts, so it is the removal most likely to un-tick a box
           that has already been paid for. */
        /* main's Round 619 names these releaseBlock and releasePlayer, and
           releaseBlock returns null when the release is allowed. */
        const free = p => !releaseBlock(s, p);
        const kids = s.squad.filter(p => p.age <= 21 && (p.apps ?? 0) > 0 && free(p));
        const target = kids[0] ?? s.squad.filter(free)[0];
        if (target) {
          const after = releasePlayer(s, target.id);
          if (after) { s = after; removals += 1; check('after releasing a man'); }
        }
      }
      if (s.sacked) break;
    }
  }
  console.log(`   ${careers} careers, ${samples} readings, ${removals} players taken out of a squad mid season, ${drops} readings lower than the one before`);
  if (samples < 450) fail(`only ${samples} readings were sampled, so this section proves nothing`);
  /* The removals floor is the whole point: without it this section passes by
     never doing the thing that used to break it. Measured healthy: 60 to 120
     removals across the twelve careers. */
  if (removals < 25) fail(`only ${removals} players were removed from a squad, so this section is back to the hands-off version that missed the bug`);
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
      if (isNum(xi) && isNum(summary.seasonScore) && objs.length > 0) {
        rows.push({
          xi,
          score: summary.seasonScore,
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
    /* MEASURED, both arms, on this exact sample across three seeds, AFTER the
       whistle gate on the board term:
         new rule  0.030  0.231  0.260
         old rule  0.679  0.745  0.780
       The bands do not touch. The gate is 0.47, midway through the gap, so
       each arm has about 0.21 of headroom. Re-measured rather than inherited:
       an earlier draft used 0.58, which left the CONTROL only 0.10 of room,
       and a threshold is only as good as the arm it is closest to. */
    if (r > 0.47) fail(`stature still explains the score: correlation ${r.toFixed(3)} against a ceiling of 0.47 (measured: new rule 0.030 to 0.260, old rule 0.679 to 0.780)`);
  }
}

console.log('4) The score follows what the board actually asked for');
{
  /* The strongest signal available, chosen because it is the strongest and
     not because it is the most descriptive. Correlation with the share of
     board objectives hit: MEASURED old rule 0.132, new rule 0.550 over 77
     seasons. The verdict grade correlates too (0.312 to 0.481) but far more
     weakly, so it is printed below as information and not used as the gate. */
  if (SAMPLE.length < 55) fail('sample too small to ask whether the score follows the board');
  else {
    const r = correlation(SAMPLE.map(x => x.objFrac), SAMPLE.map(x => x.score));
    console.log(`   correlation between the share of board objectives hit and the season score: ${r.toFixed(3)}`);
    const mean = a => a.reduce((x, n) => x + n, 0) / a.length;
    const line = ['A', 'B', 'C', 'D', 'F']
      .map(g => ({ g, v: SAMPLE.filter(x => x.grade === g).map(x => x.score) }))
      .filter(x => x.v.length >= 3)
      .map(x => `${x.g} n=${x.v.length} mean ${mean(x.v).toFixed(1)}`);
    console.log('   by the board verdict grade: ' + line.join('   '));
    /* MEASURED, both arms, across three seeds, after the whistle gate:
         new rule  0.669  0.674  0.746
         old rule  0.095  0.216  0.253
       A far wider gap than the stature one, which is why this is the gate and
       the verdict grade is only printed: the strongest signal available, not
       the most descriptive one. Floor 0.45, midway, about 0.22 clear of the
       healthy arm and 0.20 clear of the control. An earlier draft used 0.28,
       which the old rule cleared at 0.253 on one seed: 0.027 of room is not a
       threshold, it is a coin toss waiting to happen. */
    if (r < 0.45) fail(`the score barely follows the board: correlation ${r.toFixed(3)} against a floor of 0.45 (measured: new rule 0.669 to 0.746, old rule 0.095 to 0.253)`);
  }
}

/* ---------- 5. A takeover does not pay for the last manager's season ---------- */
console.log('5) Walking into a job part way through pays for your share and not his');
{
  /* Driven on the pure module, because the point is arithmetic and not
     scheduling: the same final table, scored with and without a stamped
     handover, must differ by the previous manager's share. */
  const rounds = 38;
  const full = {
    inTable: true, leaguePts: 90, leaguePlayed: rounds, leagueRounds: rounds,
    wonLeague: true, cupRank: 4, euroRank: 2, objectivesDone: 5,
    seasonDone: true, handover: null, legacyStart: null,
  };
  const scratch = seasonScoreFor(full);
  /* He played 27 of the 38 and banked 70 of the 90, was already in the cup
     semi final, and had ticked four of the five boxes. You played eleven. */
  const inherited = seasonScoreFor({
    ...full,
    handover: { pts: 70, played: 27, cupRank: 3, euroRank: 2, objectivesDone: 4, wonLeague: false },
  });
  console.log(`   identical final table: from week 0 scores ${scratch}, walking in with 11 games left scores ${inherited}`);
  if (!(inherited < scratch)) {
    fail(`a takeover scored ${inherited} against ${scratch} for the same table, so the previous manager's season is being paid to you`);
  }
  /* The title a man had ALREADY won when you arrived pays nothing.
     BE HONEST ABOUT WHAT THIS PROVES. handover.wonLeague can only be true if a
     League Title trophy is already stamped when startMidSeason runs, and it
     never is in shipped code, so the guard it polices is unreachable today.
     It is kept as a property of the pure module (a save editor, or a future
     takeover that starts from a finished season, would reach it) and is tested
     here as such, not claimed as a live path. */
  const gifted = seasonScoreFor({
    ...full,
    handover: { pts: 80, played: 34, cupRank: 4, euroRank: 2, objectivesDone: 5, wonLeague: true },
  });
  console.log(`   a league already won when you walked in: ${gifted} (module level property, not reachable in shipped play)`);
  if (gifted >= inherited) fail(`inheriting a won league scored ${gifted}, at or above ${inherited} for inheriting a leader, so the title is being gifted`);
  if (gifted < 0 || gifted > 130) fail(`out of range: ${gifted}`);

  /* THE LEGACY TAKEOVER, which IS reachable: a save written before this round
     carries midSeasonStart and no stamped handover, so the previous manager's
     cup run, European run and board ticks are unknown. Zeroing them paid the
     new manager for all three. They are scaled by the share of the season he
     actually managed instead, so a run-in takeover cannot bank a cup somebody
     else won four rounds of. */
  const rounds38 = 38;
  const legacyRunIn = seasonScoreFor({
    inTable: true, leaguePts: 90, leaguePlayed: rounds38, leagueRounds: rounds38,
    wonLeague: false, cupRank: 4, euroRank: 4, objectivesDone: 5, seasonDone: true,
    handover: null, legacyStart: 'runIn',
  });
  const legacyScratch = seasonScoreFor({
    inTable: true, leaguePts: 90, leaguePlayed: rounds38, leagueRounds: rounds38,
    wonLeague: false, cupRank: 4, euroRank: 4, objectivesDone: 5, seasonDone: true,
    handover: null, legacyStart: null,
  });
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
       exactly the shape of a takeover save written before this round. */
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
     fixes, one level up. */
  const withoutEurope = S.ceilingWithoutEurope();
  const cap = S.LEDGER_CAP;
  console.log(`   ceiling with no European run: ${withoutEurope}, the scale's cap: ${cap}`);
  if (withoutEurope !== cap) {
    fail(`a league with no European route tops out at ${withoutEurope} against a cap of ${cap}, so its managers are structurally underpaid by ${cap - withoutEurope}`);
  }
  /* And it is genuinely reachable by a real profile, not just by arithmetic. */
  const rounds = 46;
  const best = seasonScoreFor({
    inTable: true, leaguePts: 3 * rounds, leaguePlayed: rounds, leagueRounds: rounds,
    wonLeague: true, cupRank: 4, euroRank: 0, objectivesDone: 5,
    seasonDone: true, handover: null, legacyStart: null,
  });
  console.log(`   a perfect Championship season with no Europe scores ${best}`);
  if (best !== cap) fail(`a perfect season in a league with no European route scored ${best}, not ${cap}`);
}

/* ---------- 8. The range holds, including on nonsense ---------- */
console.log('8) 0 to 130 at both ends, and a malformed save cannot escape it');
{
  const cap = S.LEDGER_CAP;
  const cases = [
    ['nothing at all', { inTable: true, leaguePts: 0, leaguePlayed: 0, leagueRounds: 38, wonLeague: false, cupRank: 0, euroRank: 0, objectivesDone: 0, seasonDone: true, handover: null, legacyStart: null }],
    ['not in the table', { inTable: false, leaguePts: 99, leaguePlayed: 38, leagueRounds: 38, wonLeague: true, cupRank: 4, euroRank: 4, objectivesDone: 9, seasonDone: true, handover: null, legacyStart: null }],
    ['everything won', { inTable: true, leaguePts: 114, leaguePlayed: 38, leagueRounds: 38, wonLeague: true, cupRank: 4, euroRank: 4, objectivesDone: 9, seasonDone: true, handover: null, legacyStart: null }],
    ['NaN points', { inTable: true, leaguePts: NaN, leaguePlayed: NaN, leagueRounds: NaN, wonLeague: false, cupRank: NaN, euroRank: NaN, objectivesDone: NaN, seasonDone: true, handover: null, legacyStart: null }],
    ['negative everything', { inTable: true, leaguePts: -50, leaguePlayed: -9, leagueRounds: -3, wonLeague: false, cupRank: -2, euroRank: -7, objectivesDone: -4, seasonDone: true, handover: null, legacyStart: null }],
    ['absurd ranks', { inTable: true, leaguePts: 1e9, leaguePlayed: 1e9, leagueRounds: 38, wonLeague: true, cupRank: 99, euroRank: 99, objectivesDone: 1e6, seasonDone: true, handover: null, legacyStart: null }],
    ['garbage handover', { inTable: true, leaguePts: 60, leaguePlayed: 30, leagueRounds: 38, wonLeague: false, cupRank: 1, euroRank: 0, objectivesDone: 2, seasonDone: true, handover: { pts: NaN, played: -5, cupRank: 99, euroRank: NaN, objectivesDone: -1, wonLeague: false }, legacyStart: null }],
  ];
  let bad = 0;
  for (const [name, input] of cases) {
    const v = seasonScoreFor(input);
    const ok = Number.isInteger(v) && v >= 0 && v <= cap;
    console.log(`   ${name.padEnd(22)} ${String(v).padStart(4)}${ok ? '' : '   OUT OF RANGE'}`);
    if (!ok) { bad += 1; fail(`${name} produced ${v}, which is not an integer in 0..${cap}`); }
  }
  if (cases.length - bad < 7) fail('not every range case ran, so this section proves nothing');
}

/* ---------- 9. The save shape is untouched ---------- */
console.log('9) SAVE_VERSION did not move and the new field is optional');
{
  const src = fs.readFileSync(ENGINE_SRC, 'utf8');
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
  const hook = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useClubManager.ts'), 'utf8');
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
     rather than reading either twice. */
  const help = fs.readFileSync(path.join(ROOT, 'src', 'components', 'club-manager', 'ClubManagerHelp.tsx'), 'utf8');
  const para = (help.match(/Season score, out of [\s\S]*?<\/p>/) ?? [''])[0];
  if (!para) fail('the season score paragraph is gone from ClubManagerHelp.tsx, so the copy cannot be checked against the code');
  else {
    const must = [
      ['the scale', String(S.LEDGER_CAP)],
      ['league form', String(S.W_FORM)],
      ['the title', String(S.W_TITLE)],
      ['a cup win', String(S.CUP_POINTS[4])],
      ['a European win', String(S.EURO_POINTS[4])],
      ['each objective', String(S.W_OBJ_EACH)],
      ['the board cap', String(S.W_OBJ_CAP)],
      ['the five terms before the cap', String(S.ledgerRawCeiling())],
    ];
    const missing = must.filter(([, n]) => !new RegExp(`\\b${n}\\b`).test(para));
    console.log(`   checked ${must.length} numbers against the copy, ${missing.length} missing`);
    for (const [what, n] of missing) {
      fail(`the help copy does not state ${what} (${n}), so the screen and the code can disagree without anything going red`);
    }
  }
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

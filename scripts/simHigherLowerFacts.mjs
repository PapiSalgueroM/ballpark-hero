/**
 * simHigherLowerFacts: Rounds 662 and 663. Every Higher or Lower game is held
 * to a record of what its source actually says, through one engine.
 *
 * WHY THIS EXISTS. Six games on this site ask the same question in different
 * clothes: two players, which one has more of a number. Every one keeps a hand
 * typed file, and on 2026-09-21 the hockey one had never been checked against
 * the site's own NHL table. 26 of its 43 skaters carried the wrong career
 * points, and because the game only compares two players, the damage is
 * ordering: 52 of the 903 possible matchups were inverted, about one question
 * in seventeen marking the correct answer wrong. The NBA file had the same
 * fault in a milder form, 33 of 2,278, every one an active player whose total
 * was a season stale.
 *
 * ONE ENGINE, THE SPORT INJECTED. The checks live in
 * scripts/lib/higherLowerFence.mjs and each sport below is a config, not a
 * copy. Round 426 is why: the same roster refill bug had to be fixed twice
 * because two sports were written as two copies of one idea.
 *
 * A RATCHET, NOT A CLEAN SHEET. Rounds 664 to 666 brought mlb, tennis and nfl
 * in; cfb is the one still without a record (cfb_qb_stats holds only half its
 * players). Section 0 names whatever is open on every run rather than skipping
 * it silently, because a fence that quietly covers a third of what it appears
 * to cover is worse than no fence. Give a game a record and it joins the run;
 * it must never leave.
 *
 * THE SOURCE CAN BE WRONG, AND THE FENCE IS HOW YOU FIND OUT. Bringing the NFL
 * in, the fence flagged Adrian Peterson (file 126, source 134) and Steve Smith
 * Sr. (file 83, source 95). Both were the source: nflfastr grouped by display
 * name adds a second Adrian Peterson (a Bears back, 2002 to 2009) and a second
 * Steve Smith (the Giants receiver) onto the famous one. The NFL record is
 * built per player id for that reason, and the file was right both times.
 *
 * NEGATIVE CONTROLS (HL_FACTS_CONTROL). Each edits an in memory copy of one
 * sport, refuses to run when its anchor is missing or matches twice, and must
 * redden exactly the sections named. Some redden two, which is the honest
 * answer rather than a loosened check: section 3 judges ordering against the
 * same record section 2 compares to, so a wrong value genuinely breaks both.
 *   stale       hockey: Gretzky nudged, and he is 936 clear so            2
 *               nothing reorders
 *   inversion   hockey: MacKinnon and Draisaitl swapped                   2, 3
 *   nolast      hockey: one player loses lastSeason                       4
 *   goalieok    hockey: a goalie is given a real season, so an            5
 *               unchecked figure reads as a checked one
 *   heldfix     hockey: Gordie Howe set to the table's truncated 349      3, 6
 *   nbastale    nba: Kevin Durant put back to his 2024-25 total           2, 3
 *   mlbstale    mlb: Bonds nudged 2, and he is 7 clear of Aaron           2
 *   nflstale    nfl: Tomlinson dropped from 162 to 100                    2, 3
 *   tennismerge tennis: Court counted under one name only, 13 not 24      2, 3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSport, readSource, rewrite, checkSport } from './lib/higherLowerFence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.HL_FACTS_CONTROL || '';
const EXPECT = { stale: [2], inversion: [2, 3], nolast: [4], goalieok: [5], heldfix: [3, 6], nbastale: [2, 3], mlbstale: [2], nflstale: [2, 3], tennismerge: [2, 3] };
if (CONTROL && !(CONTROL in EXPECT)) {
  console.log(`   FAIL unknown control ${CONTROL} (known: ${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}

const SPORTS = [
  {
    key: 'hockey', label: 'NHL Higher or Lower',
    file: 'src/data/hockeyHLPlayers.ts', exportName: 'hockeyHLPlayers',
    metric: 'careerPoints', asOf: 'lastSeason',
    record: 'scripts/data/nhlHigherLowerVerified2026-09.json',
    unverifiedMarker: 'unverified',
    /* nhl_player_stats holds no goalie, so a goalie total here cannot have been
       checked against it and must be flagged rather than quietly trusted. */
    cannotBeChecked: (p) => p.position === 'Goalie',
  },
  {
    key: 'nba', label: 'NBA Higher or Lower',
    file: 'src/data/nbaHLPlayers.ts', exportName: 'nbaHLPlayers',
    metric: 'careerPoints', asOf: 'lastSeason',
    record: 'scripts/data/nbaHigherLowerVerified2026-09.json',
    unverifiedMarker: 'unverified',
    cannotBeChecked: null,
  },
  /* STILL OPEN. cfb_qb_stats holds only 32 of the file's 65 quarterbacks; Flutie,
     Herbert, Eli Manning, Andrew Luck and 29 more are simply not in it, so a record
     built from it would hold half the game from the file and prove little. The 32 it
     does hold agree exactly (0 differing, 0 of 496 matchups inverted). Needs a second
     source before it can join. */
  { key: 'cfb', label: 'College Football Higher or Lower', file: 'src/data/cfbHLPlayers.ts', exportName: 'cfbHLPlayers', metric: 'careerPassYds', asOf: 'lastYear', record: null },
  {
    key: 'mlb', label: 'MLB Higher or Lower',
    file: 'src/data/mlbHLPlayers.ts', exportName: 'mlbHLPlayers',
    metric: 'careerHrs', asOf: 'lastSeason',
    record: 'scripts/data/mlbHigherLowerVerified2026-09.json',
    unverifiedMarker: 'unverified', cannotBeChecked: null,
  },
  {
    key: 'nfl', label: 'NFL Higher or Lower',
    file: 'src/data/nflHLPlayers.ts', exportName: 'nflHLPlayers',
    metric: 'careerTds', asOf: 'lastSeason',
    /* nflfastr begins in 1999, so anyone who debuted earlier is held from the
       file (see the record's heldFromFile reasons), the Howe and Wilt shape. */
    record: 'scripts/data/nflHigherLowerVerified2026-09.json',
    unverifiedMarker: 'unverified', cannotBeChecked: null,
  },
  {
    key: 'tennis', label: 'Tennis Higher or Lower',
    file: 'src/data/tennisHLPlayers.ts', exportName: 'tennisHLPlayers',
    metric: 'slams', asOf: 'lastYear',
    record: 'scripts/data/tennisHigherLowerVerified2026-09.json',
    unverifiedMarker: 'unverified', cannotBeChecked: null,
  },
];

let checks = 0, failures = 0;
const red = new Set();

/* ---------- section 0: what this fence does NOT yet cover ---------- */
console.log('0) the ratchet: which Higher or Lower games have a record behind them');
{
  const fenced = SPORTS.filter(s => s.record);
  const open = SPORTS.filter(s => !s.record);
  for (const s of fenced) {
    if (!fs.existsSync(path.join(ROOT, s.record))) {
      console.log(`   FAIL ${s.label} names a record at ${s.record} that does not exist`);
      failures++; red.add(0);
    }
  }
  for (const s of SPORTS) {
    if (!fs.existsSync(path.join(ROOT, s.file))) {
      console.log(`   FAIL ${s.label} names a data file at ${s.file} that does not exist`);
      failures++; red.add(0);
    }
  }
  checks++;
  console.log(`   ok   ${fenced.length} of ${SPORTS.length} fenced: ${fenced.map(s => s.key).join(', ')}`);
  console.log(`        STILL OPEN, each one able to carry the same fault: ${open.map(s => s.key).join(', ')}. A record for any of them joins it to this run.`);
}

/* ---------- each fenced sport ---------- */
for (const cfg of SPORTS.filter(s => s.record)) {
  let source = readSource(ROOT, cfg);
  try {
    if (cfg.key === 'hockey') {
      if (CONTROL === 'stale') source = rewrite(source, 'careerPoints: 2857', 'careerPoints: 2850', 'stale nudges Gretzky');
      else if (CONTROL === 'inversion') {
        source = rewrite(source, 'careerPoints: 1141', 'careerPoints: 1053', 'inversion drops MacKinnon');
        source = rewrite(source, "country: 'Germany', countryFlag: '\u{1F1E9}\u{1F1EA}', careerPoints: 1053", "country: 'Germany', countryFlag: '\u{1F1E9}\u{1F1EA}', careerPoints: 1141", 'inversion lifts Draisaitl');
      }
      else if (CONTROL === 'nolast') source = rewrite(source, ", lastSeason: '1979-80'", '', 'nolast strips one lastSeason');
      else if (CONTROL === 'goalieok') source = rewrite(source, "careerPoints: 46, teams: 'New York Rangers', lastSeason: 'unverified'", "careerPoints: 46, teams: 'New York Rangers', lastSeason: '2019-20'", 'goalieok dresses a goalie up as checked');
      else if (CONTROL === 'heldfix') source = rewrite(source, 'careerPoints: 1850', 'careerPoints: 349', 'heldfix uses the truncated table value');
    } else if (cfg.key === 'nba' && CONTROL === 'nbastale') {
      source = rewrite(source, 'careerPoints: 32564', 'careerPoints: 30571', 'nbastale puts Durant back a season');
    } else if (cfg.key === 'mlb' && CONTROL === 'mlbstale') {
      /* Bonds is 7 clear of Aaron, so a nudge of 2 reorders nothing: section 2 alone. */
      source = rewrite(source, 'careerHrs: 762', 'careerHrs: 760', 'mlbstale nudges Bonds');
    } else if (cfg.key === 'nfl' && CONTROL === 'nflstale') {
      /* Tomlinson dropped from the top to the middle of the list, so it reorders. */
      source = rewrite(source, 'careerTds: 162', 'careerTds: 100', 'nflstale drops Tomlinson into the pack');
    } else if (cfg.key === 'tennis' && CONTROL === 'tennismerge') {
      /* The exact fault the merges guard against: Court counted under one name
         only, 13 instead of 24, which drops her below Graf and Nadal. */
      source = rewrite(source, "name: 'Margaret Court', slams: 24", "name: 'Margaret Court', slams: 13", 'tennismerge unmerges Court');
    }
  } catch (e) {
    console.log(`   FAIL ${e.message}`);
    console.log('simHigherLowerFacts: stopped, the control proved nothing');
    process.exit(2);
  }

  const players = await loadSport(ROOT, cfg, source);
  if (!Array.isArray(players) || players.length < 20) {
    console.log(`   FAIL ${cfg.label}: the bundled module gave ${players ? players.length : 'no'} players, so nothing below measures anything`);
    failures++; red.add(1);
    continue;
  }
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, cfg.record), 'utf8'));
  const r = checkSport(cfg, players, record);
  for (const l of r.lines) console.log(l);
  checks += r.checks; failures += r.failures;
  for (const s of r.red) red.add(s);
}

if (CONTROL) {
  const want = EXPECT[CONTROL];
  const got = [...red].sort((a, b) => a - b);
  const same = got.length === want.length && want.every(w => red.has(w));
  console.log('');
  if (same) {
    console.log(`simHigherLowerFacts: control ${CONTROL} turned section(s) ${want.join(', ')} red and nothing else. The check works.`);
    process.exit(1);
  }
  console.log(`simHigherLowerFacts: control ${CONTROL} should have reddened exactly section(s) ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(2);
}

console.log('');
if (failures) {
  console.error(`simHigherLowerFacts: ${failures} failure(s) in section(s) ${[...red].sort((a, b) => a - b).join(', ')}`);
  process.exit(1);
}
console.log(`simHigherLowerFacts: green. ${checks} checks across ${SPORTS.filter(s => s.record).length} fenced game(s). Every total matches the source it came from, every matchup is ordered correctly, and every figure nobody could check says so.`);

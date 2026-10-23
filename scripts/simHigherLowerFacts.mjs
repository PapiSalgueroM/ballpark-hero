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
 *   playeduntil the NFL card prints "played until" again                  7
 *   henrystale  nfl: Henry back to his stale 2024 total of 111            2, 3
 *   apmerge     nfl rushing yards: the two Adrian Petersons added
 *               together again (16,204), which beats Frank Gore           2, 3
 *   durantteam  nba: Durant's card loses Houston, his 2025-26 team        8
 *   curryshort  nba: Curry back to the table's short 26,493, 3 under
 *               Tim Duncan, so that pair marks the right pick wrong     2, 3
 *   nbaonesource nba record: LeBron's 2025-26 total keeps one source     1
 *   flagless    nfl record: drops its own two source flag and Henry's
 *               rushing yards stand on nfl.com twice (the rule is the
 *               sport's config, so it still holds)                      1
 *   throughprop the NBA card hands the line player.position              7
 *   componentuntil the shared line itself prints "played until"         7
 *   examplestale a worked example quotes Brady's old 89,216 again        9
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSport, readSource, rewrite, checkSport } from './lib/higherLowerFence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.HL_FACTS_CONTROL || '';
const EXPECT = { stale: [2], inversion: [2, 3], nolast: [4], goalieok: [5], heldfix: [3, 6], nbastale: [2, 3], mlbstale: [2], nflstale: [2, 3], tennismerge: [2, 3], playeduntil: [7], henrystale: [2, 3], apmerge: [2, 3], durantteam: [8], curryshort: [2, 3], nbaonesource: [1], flagless: [1], throughprop: [7], componentuntil: [7], examplestale: [9] };
/* Exit 2, never 1: 1 is a control that fired, and a mistyped name must not read as one. */
if (CONTROL && !(CONTROL in EXPECT)) {
  console.log(`   FAIL unknown control ${CONTROL} (known: ${Object.keys(EXPECT).join(', ')})`);
  process.exit(2);
}
function stopControl(why) {
  console.log(`   FAIL ${why}`);
  console.log('simHigherLowerFacts: stopped, the control proved nothing');
  process.exit(2);
}

const NFL_RECORD = 'scripts/data/nflHigherLowerVerified2026-10.json';
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
    /* Round 1549: every man of the latest season names StatMuse and ESPN. */
    twoSources: 'latest',
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
    key: 'nfl', label: 'NFL Higher or Lower (touchdowns)',
    file: 'src/data/nflHLPlayers.ts', exportName: 'nflHLPlayers',
    metric: 'careerTds', asOf: 'lastSeason',
    /* Round 1549: the official totals through 2025 on two web sources per
       player, every category, in place of the nflfastr read of 2026-09. */
    record: NFL_RECORD, recordKey: 'tds',
    unverifiedMarker: 'unverified', cannotBeChecked: null, twoSources: 'all',
  },
  /* Round 1549: the other five NFL categories, each its own fenced game. They
     had no record at all, and two of them carried a value that was two men
     added together (Adrian Peterson's rushing yards, Steve Smith's catches). */
  ...[['passYds', 'passing yards'], ['passTds', 'passing touchdowns'], ['rushYds', 'rushing yards'], ['recYds', 'receiving yards'], ['recs', 'receptions']].map(([cat, what]) => ({
    key: `nfl-${cat}`, label: `NFL Higher or Lower (${what})`,
    file: 'src/data/nflHLCategories.ts', exportName: 'NFL_HL_CATEGORIES', category: cat,
    metric: 'value', asOf: 'lastSeason',
    record: NFL_RECORD, recordKey: cat,
    unverifiedMarker: 'unverified', cannotBeChecked: null, twoSources: 'all',
  })),
  {
    key: 'tennis', label: 'Tennis Higher or Lower',
    file: 'src/data/tennisHLPlayers.ts', exportName: 'tennisHLPlayers',
    metric: 'slams', asOf: 'lastYear',
    /* Round 1549: derived from Round 732's two source slam record rather than a
       read of the live table, which it supersedes (Sinner's Wimbledon 2026). */
    record: 'scripts/data/tennisHigherLowerVerified2026-10.json',
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
      source = rewrite(source, 'careerPoints: 32597', 'careerPoints: 30571', 'nbastale puts Durant back a season');
    } else if (cfg.key === 'nba' && CONTROL === 'curryshort') {
      /* The total the site's table gave until Round 1549's fix: 3 under Tim
         Duncan's 26,496, so Curry against Duncan marked the right pick wrong. */
      source = rewrite(source, 'careerPoints: 26528', 'careerPoints: 26493', 'curryshort puts Curry back to the short table total');
    } else if (cfg.key === 'mlb' && CONTROL === 'mlbstale') {
      /* Bonds is 7 clear of Aaron, so a nudge of 2 reorders nothing: section 2 alone. */
      source = rewrite(source, 'careerHrs: 762', 'careerHrs: 760', 'mlbstale nudges Bonds');
    } else if (cfg.key === 'nfl' && CONTROL === 'nflstale') {
      /* Tomlinson dropped from the top to the middle of the list, so it reorders. */
      source = rewrite(source, 'careerTds: 162', 'careerTds: 100', 'nflstale drops Tomlinson into the pack');
    } else if (cfg.key === 'nfl' && CONTROL === 'henrystale') {
      /* The stale 2024 total that shipped until Round 1549: 111 puts him
         under Alexander, Gates, Fitzgerald and Peterson again. */
      source = rewrite(source, "careerTds: 127, lastSeason: 2025", "careerTds: 111, lastSeason: 2025", 'henrystale puts Henry back to 111');
    } else if (cfg.key === 'nfl-rushYds' && CONTROL === 'apmerge') {
      /* The two Adrian Petersons added together again, which beat Frank Gore. */
      source = rewrite(source, "P('Adrian Peterson', 'RB', 'MIN, NO, ARI, DET, SEA', 14918,", "P('Adrian Peterson', 'RB', 'MIN, NO, ARI, DET, SEA', 16204,", 'apmerge merges the two Adrian Petersons');
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
  const full = JSON.parse(fs.readFileSync(path.join(ROOT, cfg.record), 'utf8'));
  /* Record controls edit the in memory record, each refusing to run when its
     target is not there to edit. */
  if (CONTROL === 'nbaonesource' && cfg.key === 'nba') {
    const e = full.players?.['LeBron James'];
    if (!e || !Array.isArray(e.src) || e.src.length !== 2) stopControl('nbaonesource: LeBron James carries no two source entry to cut');
    e.src = e.src.slice(0, 1);
  }
  if (CONTROL === 'flagless' && cfg.key.startsWith('nfl')) {
    /* The RUN review's m3b: the record drops its own flag and Henry's rushing
       yards stand on nfl.com twice. The rule is the sport's, so it still holds. */
    if (full.perPlayerSources !== true) stopControl('flagless: the NFL record carries no perPlayerSources flag to drop');
    delete full.perPlayerSources;
    if (cfg.key === 'nfl-rushYds') {
      const e = full.categories?.rushYds?.players?.['Derrick Henry'];
      if (!e || !Array.isArray(e.src)) stopControl('flagless: Derrick Henry has no rushing yards sources to collapse');
      e.src = ['https://www.nfl.com/players/derrick-henry/stats/career', 'https://www.nfl.com/players/derrick-henry/stats/logs/2025/'];
    }
  }
  /* A record that holds several categories hands each its own block, with the
     record's read date, source and source rule. */
  const record = cfg.recordKey
    ? { ...(full.categories?.[cfg.recordKey] ?? {}), read: full.read, source: full.source, perPlayerSources: full.perPlayerSources }
    : full;
  const r = checkSport(cfg, players, record);
  for (const l of r.lines) console.log(l);
  checks += r.checks; failures += r.failures;
  for (const s of r.red) red.add(s);
}

/* ---------- section 7: the card says what its total runs through ---------- */
/* Round 1549. "played until 2024" sat under Mahomes, Allen and Henry through a
   whole season, and "played until 2025-26" under every NBA man still playing.
   A total runs THROUGH a season; whether a man has stopped playing is another
   fact these files never held. Every Higher or Lower page that reveals a career
   total mounts the shared line (Round 662's hockey wording), and none may say
   "played until". Read from the code with comments stripped, so this comment
   cannot satisfy it. */
/* Each page hands the line the value its total really runs through (the RUN
   review's m4 passed player.position and stayed green), and the shared line
   itself is read too (its m6 made the component say "played until"). */
const PAGES = { HockeyHigherLower: 'player.lastSeason', NbaHigherLower: 'player.lastSeason', NflHigherLower: 'player.lastSeason', TennisHigherLower: 'TENNIS_HL_THROUGH', F1HigherLower: 'F1_HL_THROUGH' };
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
console.log('7) every Higher or Lower card says what its total runs through, and none says "played until"');
{
  let bad = 0;
  for (const [page, expr] of Object.entries(PAGES)) {
    const rel = `src/pages/${page}.tsx`;
    let code = fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
    if (CONTROL === 'playeduntil' && page === 'NflHigherLower') {
      try {
        code = rewrite(code, '{player.position}</span>', '{player.position} · played until {player.lastSeason}</span>', 'playeduntil puts the old card line back');
      } catch (e) {
        console.log(`   FAIL ${e.message}`);
        console.log('simHigherLowerFacts: stopped, the control proved nothing');
        process.exit(2);
      }
    }
    if (CONTROL === 'throughprop' && page === 'NbaHigherLower') {
      try {
        code = rewrite(code, '<HigherLowerThrough through={player.lastSeason} />', '<HigherLowerThrough through={player.position} />', 'throughprop hands the NBA line the position');
      } catch (e) { stopControl(e.message); }
    }
    code = strip(code);
    if (/played until/i.test(code)) { console.log(`   FAIL ${rel} still prints "played until"`); bad++; }
    if (!code.includes(`<HigherLowerThrough through={${expr}} />`)) { console.log(`   FAIL ${rel} does not hand the shared line ${expr}, the value its total runs through`); bad++; }
  }
  const compRel = 'src/components/game/HigherLowerThrough.tsx';
  let comp = fs.readFileSync(path.join(ROOT, compRel), 'utf8').replaceAll('\r\n', '\n');
  if (CONTROL === 'componentuntil') {
    try {
      comp = rewrite(comp, '`through ${through}`', '`played until ${through}`', 'componentuntil makes the shared line say played until');
    } catch (e) { stopControl(e.message); }
  }
  comp = strip(comp);
  if (/played until/i.test(comp)) { console.log(`   FAIL ${compRel} prints "played until"`); bad++; }
  if (!comp.includes('`through ${through}`') || !comp.includes("'season not confirmed'")) { console.log(`   FAIL ${compRel} no longer prints "through" plus the season, or "season not confirmed" for an unchecked row`); bad++; }
  checks++;
  if (bad) { failures += bad; red.add(7); }
  else console.log(`   ok   ${Object.keys(PAGES).length} pages hand the shared line the value their total runs through, the line prints "through" it, and nothing says "played until"`);
}

/* ---------- section 8: an NBA man still playing lists his current team ---------- */
/* Round 1549. Round 663 refreshed the NBA points and left the teams, so Kevin
   Durant's card had no Houston and James Harden's no Cleveland: the list was
   capped at five codes alphabetically, and the newest team fell off the end.
   Every man the points record says played in the latest season must be in the
   teams record, and his card must list every team he played for that season. */
console.log('8) NBA Higher or Lower: every man who played in the latest season lists the team or teams he played for in it');
{
  let bad = 0;
  const say = (m) => { console.log(`   FAIL ${m}`); bad++; };
  const teamsRec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nbaHigherLowerTeams2026-10.json'), 'utf8'));
  const nbaCfg = SPORTS.find(s => s.key === 'nba');
  let source = readSource(ROOT, nbaCfg);
  if (CONTROL === 'durantteam') {
    try {
      source = rewrite(source, "teams: 'BRK, GSW, HOU, OKC, PHO, SEA'", "teams: 'BRK, GSW, OKC, PHO, SEA'", 'durantteam drops Houston from Durant');
    } catch (e) {
      console.log(`   FAIL ${e.message}`);
      console.log('simHigherLowerFacts: stopped, the control proved nothing');
      process.exit(2);
    }
  }
  const players = await loadSport(ROOT, nbaCfg, source);
  const pointsRec = JSON.parse(fs.readFileSync(path.join(ROOT, nbaCfg.record), 'utf8'));
  const current = Object.entries(pointsRec.players).filter(([, v]) => v.lastSeason === teamsRec.season).map(([n]) => n);
  for (const n of current) if (!teamsRec.players[n]) say(`${n} played in ${teamsRec.season} and the teams record does not say for whom`);
  for (const [n, v] of Object.entries(teamsRec.players)) {
    const p = (players || []).find(x => x.name === n);
    if (!p) { say(`${n} is in the teams record and no longer ships`); continue; }
    if (p.lastSeason !== teamsRec.season) say(`${n} is recorded as playing in ${teamsRec.season} but his card runs through ${p.lastSeason}`);
    const listed = String(p.teams).split(', ');
    const missing = v.teams2025_26.filter(t => !listed.includes(t));
    if (missing.length) say(`${n} played for ${missing.join(' and ')} in ${teamsRec.season}, which his card does not list (${p.teams})`);
    if (!Array.isArray(v.src) || new Set(v.src.map(u => new URL(u).hostname)).size < 2) say(`${n}'s ${teamsRec.season} teams do not stand on two sources`);
  }
  checks++;
  if (bad) { failures += bad; red.add(8); }
  else console.log(`   ok   ${Object.keys(teamsRec.players).length} men played in ${teamsRec.season}, and every card lists the team or teams he played for in it`);
}

/* ---------- section 9: the worked examples quote the card's own numbers ---------- */
/* Round 1549's read review. The rules block a player reads before playing
   said "Brady (89,216) vs Brees (80,428)" and "Hamilton (105 wins)" while the
   cards showed 89,214, 80,358 and 106. Every "Name (number)" in a page's
   examples is matched to the one pool player whose name holds every word of it
   and must equal the number that player's card shows. On the NFL page the
   example's own "Category:" prefix picks the category by its chip label. A
   number with no name in brackets ("Frank Gore quietly sits at 16,000") is
   not read; a bracketed number whose name or category cannot be matched fails
   rather than passing unread. The files are read from disk, untouched by the
   data controls above, so this section judges only the words. */
console.log('9) every number a worked example quotes is the number the card shows');
{
  let bad = 0, quoted = 0;
  const say = (m) => { console.log(`   FAIL ${m}`); bad++; };
  const byKey = Object.fromEntries(SPORTS.map(s => [s.key, s]));
  const catSrc = fs.readFileSync(path.join(ROOT, 'src/data/nflHLCategories.ts'), 'utf8').replaceAll('\r\n', '\n');
  const labels = Object.fromEntries([...catSrc.matchAll(/key: '(\w+)',\s*\n\s*label: '([^']+)'/g)].map(m => [m[2], m[1]]));
  const pools = new Map();
  const pool = async (cfg) => {
    if (!pools.has(cfg.key)) pools.set(cfg.key, await loadSport(ROOT, cfg));
    return pools.get(cfg.key);
  };
  const nflCat = (key) => ({ key: `nflcat-${key}`, file: 'src/data/nflHLCategories.ts', exportName: 'NFL_HL_CATEGORIES', category: key, metric: 'value' });
  const PAGE_DATA = {
    HockeyHigherLower: () => byKey.hockey,
    NbaHigherLower: () => byKey.nba,
    TennisHigherLower: () => byKey.tennis,
    F1HigherLower: () => ({ key: 'f1', file: 'src/data/f1HLDrivers.ts', exportName: 'f1HLDrivers', metric: 'careerWins' }),
    NflHigherLower: (example) => {
      const label = (example.match(/^([^:]+):/) || [])[1];
      return labels[label] ? nflCat(labels[label]) : null;
    },
  };
  for (const page of Object.keys(PAGES)) {
    const rel = `src/pages/${page}.tsx`;
    let code = strip(fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n'));
    if (CONTROL === 'examplestale' && page === 'NflHigherLower') {
      try { code = rewrite(code, 'Brady (89,214)', 'Brady (89,216)', "examplestale quotes Brady's old passing yards"); } catch (e) { stopControl(e.message); }
    }
    const block = (code.match(/examples=\{\[([\s\S]*?)\]\}/) || [])[1];
    if (block === undefined) { say(`${rel} has no examples block to read`); continue; }
    for (const lit of block.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
      const example = lit[1] ?? lit[2];
      for (const m of example.matchAll(/([A-Z][\w.'-]*(?: [A-Z][\w.'-]*)*) \(([\d,]+)(?: [a-z]+)?\)/g)) {
        quoted++;
        const [, who, num] = m;
        const cfg = PAGE_DATA[page](example);
        if (!cfg) { say(`${rel}: "${example}" quotes ${who} but names no category the NFL game has`); continue; }
        const words = who.split(' ');
        const hits = ((await pool(cfg)) || []).filter(p => { const t = p.name.split(' '); return words.every(w => t.includes(w)); });
        if (hits.length !== 1) { say(`${rel}: "${who}" in "${example}" matches ${hits.length} player(s) in the pool, so the number cannot be checked`); continue; }
        const shown = hits[0][cfg.metric];
        if (Number(num.replaceAll(',', '')) !== shown) say(`${rel}: "${example}" quotes ${hits[0].name} at ${num}, the card shows ${shown.toLocaleString('en-US')}`);
      }
    }
  }
  if (!quoted) say('no worked example quotes a number at all, so this section measured nothing');
  checks++;
  if (bad) { failures += bad; red.add(9); }
  else console.log(`   ok   ${quoted} numbers quoted in the worked examples of ${Object.keys(PAGES).length} pages, each the number the card shows`);
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

/* The NBA Front Office season lines and awards fence. Round 824.

   WHAT THE ROUND SHIPPED. Every game the NBA engine decides (simRound in
   src/lib/nbaFrontOffice.ts) writes a box score read off the draw that decided
   it (nbaBoxScore in src/lib/nbaSeasonStats.ts), through a generator seeded
   from that draw, so it takes nothing from the league's own generator. The
   eight men nbaStrength counts are the eight who play; points split into whole
   numbers that add up to the club's points exactly (foSplit, shared in
   src/lib/foSeasonStats.ts). At close the season names an MVP, an All-League
   First Team, a rookie of the year, a defensive player and a sixth man by
   stated rules over those lines and the standings, writes them on the cards
   and keeps them in the league's history (nbaCloseSeasonStats). The close
   screen draws them in one shared box (FoSeasonStatsCard), labelled as the
   save's sim season.

   Every section runs the REAL engine, bundled with esbuild. Nothing reads dist
   or the clock.

     1) every game adds up (hard). 2400 box scores built directly on real
        clubs with injuries rolled in: each man's points, rebounds, assists,
        steals and blocks sum to his side's, the side the draw made the winner
        outscores the other by the box's margin, at least one, and the men on
        the floor are exactly the healthy eight nbaStrength counts, best five
        starting. Then ten franchises, three seasons each, the board's own
        loop: every club's lines sum to its points, its box score games equal
        its record's games and its box score wins equal its record's wins, so
        no line is detached from a result.
     2) the box takes nothing from the league's generator (hard). The same
        seed played twice, once keeping lines and once not (lines deleted, an
        old save's shape): standings, rosters, injuries, the champion, the tax
        and the free agent pool are identical after the season and after the
        summer, and the second season (both keeping lines by then) is identical
        lines included.
     3) the award rules pick who the lines say (hard, with fixtures). A hand
        built season where each rule has one right answer and a trap: a bigger
        line on a losing club against a smaller one on a winner (MVP), a star
        who played too few games, a rookie who played too few, a shot blocker
        on a club that allowed more than average, a starter with more points
        than the sixth man, a man who started exactly half his games, a tie
        on score broken by games, and a man traded mid season whose lines sum
        onto the club he played most for. Then over the simulated seasons the
        harness's own typed copy of the rules names the same man for every
        award, every season. Who is a first year man comes from the harness's
        own record of whom it drafted at each close, never from the line's
        rookie mark (a review found a mark counting every man ever drafted
        passed everything while changing the winner in 19 of 20 later
        seasons), and the mark itself must be exactly the men drafted at the
        previous close who played.
     4) the leaders tables are the harness's own recount: top three a game in
        points, rebounds and assists among men with four in five of an
        average club's games.
     5) the lines read like basketball and like this sim (bands from
        measurement, numbers in the header block below). League points a club
        a game; the tenth best qualified scorer (a quantile, not the leader,
        because a max is noise); the rank correlation of rating with points a
        game among qualified men, which is how the lines follow the ratings
        that decide games; the correlation of a club's point differential with
        its winning share; centers out-rebound forwards out-rebound guards and
        guards out-assist forwards out-assist centers, by margins.
     6) the close. Once per season: a second close returns the same awards and
        writes no card twice; the winners carry the award on their card; the
        history grows by one a season; the summer starts a clean sheet for the
        new season and keeps the history.
     7) an old save. A league stripped of every field this round added (lines,
        history, rookie marks, awards on cards) plays its season with no lines
        and no awards and nothing throws; its summer starts lines; its second
        season closes with awards. Then vitest on the real board: the NBA close
        screen test (src/components/nba-front-office/NbaSeasonStats.test.tsx)
        and the shared season close test on all four boards.
     8) the copy. The guide states each award rule exactly as the engine does,
        and the board's close screen and history say sim season in code, not
        in a comment. The page's Sixth Man worked example names a points a
        game figure within 1.5 of the median simulated winner's. Measured
        2026-10-01 over seed bases 0, 10 and 20 (30 seasons each), winners'
        points a game at the 10th percentile, median and 90th: 12.4 / 12.7 /
        13.5, 12.3 / 12.7 / 13.4, 12.3 / 12.9 / 13.4; the page says about
        13, so the band of 1.5 has room on every set. The first draft promised
        17 off the bench, which the engine cannot produce, since the GM does
        not pick starters and a bench man is rated under all five of them.

   Controls, through NBA_STATS_CONTROL. None touches src: the rewritten source
   is served to the bundler from memory, and each refuses to run if its anchor
   is not in the file. Under a control the harness exits 1 when exactly the
   expected sections went red (the control fired), 3 when they did not (the
   check is dead somewhere or bleeds), and 2 when the control could not be
   bundled or the harness threw. Each was run on 2026-10-01 and fired:
     nosplit        the split drops its remainder                    -> 1
     extradraw      recording a game takes a draw from the league    -> 2
     mvpnowin       the MVP score ignores the club's record          -> 3
     noqualify      nobody needs games to qualify                    -> 3 and 4
     sixthstarters  the sixth man race lets starters in              -> 3
     doubleclose    a second close names and writes its awards again -> 6
     oldnever       a league saved before the round never keeps lines -> 2 and 7
                    (section 2's no lines league is an old save's shape)
   Added by the review fix, same day, each run and fired:
     rookieany      every man ever drafted counts as a rookie         -> 3
     draftlate      a draft class debuts two seasons after its close  -> 3
     bench17        the page promises a 17 a game sixth man (copy,
                    rewritten in memory as section 8 reads it)        -> 8
   (A first draft carried "noreset", the summer keeping last season's lines;
   it turned every section but the copy red, since nothing after the first
   season had lines, so it proved nothing about any one check.)

   Run: node scripts/simNbaSeasonStats.mjs
   Measure on other seeds: NBA_STATS_SEED_BASE=10 node scripts/simNbaSeasonStats.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src', 'lib');
const CONTROL = process.env.NBA_STATS_CONTROL || '';
/* A harness that throws measured nothing. Under a control exit 1 means "the
   control fired", so a crash must never exit 1 there: it exits 2, and 1 when
   no control is set (red either way). */
const crashed = e => {
  console.error(`FAIL: the harness threw before it finished: ${String(e && e.stack ? e.stack : e).slice(0, 600)}`);
  process.exit(CONTROL ? 2 : 1);
};
process.on('uncaughtException', crashed);
process.on('unhandledRejection', crashed);
const SEED_BASE = Number(process.env.NBA_STATS_SEED_BASE || 0);
const EXPECT = {
  nosplit: [1],
  extradraw: [2],
  mvpnowin: [3],
  noqualify: [3, 4],
  sixthstarters: [3],
  doubleclose: [6],
  oldnever: [2, 7],
  /* added by the review fix: who counts as a first year man, and the page's sixth man claim */
  rookieany: [3],
  draftlate: [3],
  bench17: [8],
};
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`NBA_STATS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}
const SECTION_NAMES = {
  1: 'every game adds up',
  2: 'the box takes nothing from the league generator',
  3: 'the award rules pick who the lines say',
  4: 'the leaders tables are a recount',
  5: 'the lines read like basketball and like this sim',
  6: 'the close happens once and is kept',
  7: 'an old save',
  8: 'the copy says what the engine does',
};

/* ---- the rules, typed here on purpose, not read from the engine ---------- */
const SHARE = 0.8;      // four in five of an average club's games
const WIN_W = 20;       // the MVP score adds 20 times the club's winning share
const ROTATION = 8;     // the eight men nbaStrength counts
const STARTERS = 5;
/* Bands, section 5, from measurement. Measured 2026-10-01 over three seed
   sets of ten franchises, three seasons each (bases 0, 10 and 20, so 90
   closes):
     league points a club a game, per season: 113.0 to 113.5 in all three sets
       (the box is built about NBA_TEAM_POINTS, 113)
     tenth best qualified scorer, median over a set's seasons: 25.78, 25.91,
       25.68 (single seasons 24.2 to 26.8)
     Spearman of rating with points a game, lowest season of a set: 0.891,
       0.890, 0.892 (highest 0.967)
     Pearson of point differential with winning share, lowest season: 0.879,
       0.888, 0.839 (a first band of 0.85 went red on the third set, so the
       floor sits under the lowest season measured with room)
     rebounds a game, C over F over G: 9.16 / 6.46 / 3.52, 9.19 / 6.47 / 3.55,
       9.26 / 6.45 / 3.51 (gaps of about 2.7 and 2.9)
     assists a game, G over F over C: 4.76 / 2.45 / 1.34, 4.74 / 2.42 / 1.35,
       4.73 / 2.44 / 1.37 (gaps of about 2.3 and 1.07, so the assist band is
       0.6, not the 1.0 a first draft carried, which sat 0.07 under the gap)
   Every floor below sits well inside what was measured. */
const BAND = {
  clubPpg: [111.5, 115],
  tenthScorer: [23.5, 28],
  ovrPpgRank: 0.8,
  diffWin: 0.75,
  rebGap: 1.5,
  astGap: 0.6,
  /* section 8: the page's sixth man figure against the median winner */
  sixthPromise: 1.5,
};

const round1 = n => Math.round(n * 10) / 10;
let checks = 0;
const fails = [];
const bySection = new Map();
const ok = (section, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) { s.bad += 1; fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`); }
  bySection.set(section, s);
};
const clone = v => JSON.parse(JSON.stringify(v));
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const normaliseEol = t => t.split('\r\n').join('\n');
const req = createRequire(path.join(ROOT, 'package.json'));
const findUp = rel => {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
};
const rewrite = (label, src, swaps) => {
  for (const [now] of swaps) {
    if (!src.includes(now)) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} is not in ${label}, so it would change nothing. Refusing to run.`);
  }
  let out = src;
  for (const [now, was] of swaps) out = out.split(now).join(was);
  if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${label} changed nothing. Refusing to run.`);
  return out;
};

/* ---- the engine, bundled (under the control when one is set) -------------- */
const CONTROL_FILE_SWAPS = {
  nosplit: { 'foSeasonStats.ts': [['  for (let k = 0; left > 0; k = (k + 1) % n, left -= 1) out[order[k].i] += 1;', '  void order;']] },
  extradraw: { 'nbaFrontOffice.ts': [['      if (stats) nbaRecordBox(stats, nbaBoxScore(', '      if (stats && rng() >= 0) nbaRecordBox(stats, nbaBoxScore(']] },
  mvpnowin: { 'nbaSeasonStats.ts': [['export const NBA_MVP_WIN_WEIGHT = 20;', 'export const NBA_MVP_WIN_WEIGHT = 0;']] },
  noqualify: { 'nbaSeasonStats.ts': [['export const NBA_AWARD_GAMES_SHARE = 0.8;', 'export const NBA_AWARD_GAMES_SHARE = 0;']] },
  sixthstarters: { 'nbaSeasonStats.ts': [['qualified.filter(p => p.gs * 2 < p.g)', 'qualified.filter(p => p.g > 0)']] },
  doubleclose: { 'nbaSeasonStats.ts': [['  if (done) return done;', '  void done;']] },
  oldnever: { 'nbaFrontOffice.ts': [['  league.stats = foNewSeasonStats(league.season);', '  if (league.stats) league.stats = foNewSeasonStats(league.season);']] },
  rookieany: { 'nbaSeasonStats.ts': [['rookie: p.rookieSeason === season,', 'rookie: p.rookieSeason !== undefined,']] },
  draftlate: { 'nbaFrontOffice.ts': [['  return { cap: nbaNextCap(league.cap), season: league.season + 1 };', '  return { cap: nbaNextCap(league.cap), season: league.season + 2 };']] },
};
/* Copy controls rewrite what section 8 reads, in memory, never the file. */
const CONTROL_COPY_SWAPS = {
  bench17: { 'src/pages/NbaFrontOffice.tsx': [['he scores about 13 a game', 'he scores about 17 a game']] },
};
const NOTE = {
  nosplit: 'the split hands out the floors only, so the leftover points are lost',
  extradraw: 'recording a game takes one more draw from the league generator',
  mvpnowin: "the MVP score ignores the club's record",
  noqualify: 'nobody needs any games to qualify for a table or an award',
  sixthstarters: 'the sixth man race lets starters in',
  doubleclose: 'a second close of the same season names the awards again and writes them again',
  oldnever: 'a league saved before the round never starts keeping lines',
  rookieany: 'every man ever drafted in the league counts as a rookie, whatever season he debuted',
  draftlate: 'a draft class is marked as debuting two seasons after its close, not one',
  bench17: "the page's worked example promises a 17 a game sixth man (the claim the review found)",
}[CONTROL];
if (NOTE) console.log(`   control ${CONTROL}: ${NOTE}`);

const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nbastats-'));
let E = null;
try {
  const fileTexts = {};
  for (const [base, swaps] of Object.entries(CONTROL_FILE_SWAPS[CONTROL] ?? {})) {
    fileTexts[base] = rewrite(base, normaliseEol(fs.readFileSync(path.join(LIB, base), 'utf8')), swaps);
  }
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
  const plugin = {
    name: 'dukb-nbastats',
    setup(b) {
      b.onLoad({ filter: /(nbaFrontOffice|nbaSeasonStats|foSeasonStats)\.ts$/ }, args => {
        const own = fileTexts[path.basename(args.path)];
        return own === undefined ? undefined : { contents: own, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  fs.writeFileSync(entry, [
    `export * as nba from ${fwd(path.join(LIB, 'nbaFrontOffice.ts'))};`,
    `export * as st from ${fwd(path.join(LIB, 'nbaSeasonStats.ts'))};`,
    `export * as fo from ${fwd(path.join(LIB, 'foSeasonStats.ts'))};`,
  ].join('\n') + '\n');
  const out = path.join(BUNDLE_DIR, 'bundle.mjs');
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin], outfile: out, logLevel: 'error',
  });
  E = await import(pathToFileURL(out).href);
} catch (e) {
  console.error(`FAIL: the engine could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 260)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(CONTROL ? 2 : 1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
const { nba, st, fo } = E;
for (const fn of ['initNbaLeague', 'simRound', 'runNbaPlayoffs', 'nbaOffseason', 'nbaDraftClass', 'nbaProspectToPlayer', 'nbaDraftSigning', 'nbaStandings', 'nbaTipOff', 'nbaRelease', 'nbaAssessTax', 'nbaWinProb', 'nbaStrength']) {
  if (typeof nba[fn] !== 'function') { console.error(`FAIL: nbaFrontOffice.ts does not export ${fn}`); process.exit(1); }
}
for (const fn of ['nbaBoxScore', 'nbaRecordBox', 'nbaSeasonAwards', 'nbaCloseSeasonStats', 'nbaLeaders', 'nbaTeamLines', 'nbaRotation']) {
  if (typeof st[fn] !== 'function') { console.error(`FAIL: nbaSeasonStats.ts does not export ${fn}`); process.exit(1); }
}

/* ---- the board's loop, one season ------------------------------------------ */
const SEEDS = Array.from({ length: 10 }, (_, i) => SEED_BASE + i + 1);
const SEASONS = 3;
/* Tip off to the morning of the next tip off, as the board runs it. `after`
   sees the league at close, before the draft and the summer. Returns the ids
   of every man drafted at this close and the season they debut in, read off
   the harness's own loop (the close it ran plus one), never off the engine's
   own rookie mark, so section 3 can check that mark against it. */
function playSeason(lg, me, rng, after) {
  while (lg.teams[me].players.length > 15) {
    const worst = [...lg.teams[me].players].sort((a, b) => a.ovr - b.ovr)[0];
    if (!nba.nbaRelease(lg.teams[me], lg.freeAgents, worst.id)) break;
  }
  nba.nbaTipOff(lg, rng, me);
  for (let r = 1; r < nba.NBA_ROUNDS; r += 1) { nba.simRound(lg, me, rng); lg.round += 1; }
  nba.simRound(lg, me, rng);
  const po = nba.runNbaPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  nba.nbaAssessTax(lg);
  const closed = st.nbaCloseSeasonStats(lg);
  if (after) after(lg, closed);
  const debut = lg.season + 1;
  const drafted = [];
  let remaining = nba.nbaDraftClass(rng, 24, new Set());
  const signing = nba.nbaDraftSigning(lg);
  for (let k = 0; k < 2; k += 1) {
    const mine = nba.nbaProspectToPlayer(remaining[0], rng, signing);
    lg.teams[me].players.push(mine);
    drafted.push(mine.id);
    remaining = remaining.slice(1);
    const ai = remaining.slice(0, 5);
    const order = nba.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me);
    ai.forEach((p, i) => {
      const man = nba.nbaProspectToPlayer(p, rng, signing);
      lg.teams[order[i % order.length]].players.push(man);
      drafted.push(man.id);
    });
    remaining = remaining.filter(p => !ai.includes(p));
  }
  nba.nbaOffseason(lg, rng, me);
  return { debut, drafted };
}

/* Every season's close, kept for sections 1, 3, 4, 5 and 6. */
const closes = [];
const histories = [];
for (const seed of SEEDS) {
  const rng = lcg(seed * 7919 + 17);
  const lg = nba.initNbaLeague(rng);
  const me = Object.keys(lg.teams)[seed % 30];
  /* the men the harness drafted at each close, by the season they debut in */
  const draftedFor = new Map();
  for (let s = 0; s < SEASONS; s += 1) {
    const d = playSeason(lg, me, rng, (L, closed) => {
      const again = st.nbaCloseSeasonStats(L);
      const cards = [...Object.values(L.teams).flatMap(t => t.players), ...L.freeAgents];
      closes.push({
        seed, season: L.season, me, closed, again,
        league: clone(L),
        badges: cards.reduce((n, p) => n + (p.awards ?? []).filter(a => a.startsWith(`${L.season} `)).length, 0),
        /* drafted at the previous close, so first year men this season */
        rookies: draftedFor.get(L.season) ?? new Set(),
      });
    });
    draftedFor.set(d.debut, new Set(d.drafted));
    histories.push({ seed, after: s + 1, history: (lg.awards ?? []).map(a => a.season), statsSeason: lg.stats ? lg.stats.season : null, lines: lg.stats ? Object.keys(lg.stats.lines).length : -1, leagueSeason: lg.season });
  }
}

/* ---- 1. every game adds up ------------------------------------------------- */
console.log('1) Every game adds up: 2400 box scores, then every club\'s season');
{
  const COLS = ['pts', 'reb', 'ast', 'stl', 'blk'];
  let boxes = 0, bad = 0;
  const firstBad = [];
  for (const seed of SEEDS) {
    const rng = lcg(seed * 31 + 5);
    const lg = nba.initNbaLeague(rng);
    const abbrs = Object.keys(lg.teams);
    for (let i = 0; i < 240; i += 1) {
      /* roll injuries so the rotation has to skip men */
      for (const t of Object.values(lg.teams)) for (const p of t.players) p.out = rng() < 0.08 ? 1 + Math.floor(rng() * 3) : 0;
      const h = lg.teams[abbrs[Math.floor(rng() * 30)]];
      let a = lg.teams[abbrs[Math.floor(rng() * 30)]];
      if (a === h) a = lg.teams[abbrs[(abbrs.indexOf(h.abbr) + 1) % 30]];
      const p = nba.nbaWinProb(h, a);
      const draw = rng();
      const homeWon = draw < p;
      const box = st.nbaBoxScore(h, a, homeWon, draw, p, i, lg.season);
      boxes += 1;
      const problems = [];
      for (const [side, team] of [[box.home, h], [box.away, a]]) {
        for (const c of COLS) {
          const sum = side.men.reduce((s, m) => s + m[c], 0);
          if (sum !== side[c]) problems.push(`${team.abbr} ${c} men ${sum} vs side ${side[c]}`);
        }
        const healthy = [...team.players].filter(x => x.out === 0).sort((x, y) => y.ovr - x.ovr).slice(0, ROTATION).map(x => x.id);
        const onFloor = side.men.map(m => m.id);
        if (healthy.join(',') !== onFloor.join(',')) problems.push(`${team.abbr} floor is not the healthy eight`);
        const starters = side.men.filter(m => m.starter).map(m => m.id);
        if (starters.join(',') !== onFloor.slice(0, STARTERS).join(',')) problems.push(`${team.abbr} starters are not the best five`);
        if (side.men.some(m => COLS.some(c => !Number.isInteger(m[c]) || m[c] < 0))) problems.push('a man has a broken count');
      }
      const win = homeWon ? box.home : box.away, lose = homeWon ? box.away : box.home;
      if (!(win.pts > lose.pts)) problems.push(`the draw's winner scored ${win.pts} to ${lose.pts}`);
      if (win.pts - lose.pts !== box.margin || box.margin < 1) problems.push(`margin ${box.margin} vs ${win.pts - lose.pts}`);
      if (problems.length) { bad += 1; if (firstBad.length < 3) firstBad.push(problems.join('; ')); }
    }
  }
  ok(1, `every one of ${boxes} box scores adds up, follows its draw and plays the healthy eight`, bad === 0, `${bad} broken, e.g. ${firstBad.join(' | ')}`);
  let clubSeasons = 0;
  const seasonBad = [];
  for (const c of closes) {
    const stats = c.league.stats;
    for (const [abbr, t] of Object.entries(c.league.teams)) {
      clubSeasons += 1;
      const club = stats.teams[abbr];
      const lineSum = Object.values(stats.lines).filter(l => l.team === abbr).reduce((s, l) => s + l.tot.pts, 0);
      const maxG = Math.max(0, ...Object.values(stats.lines).filter(l => l.team === abbr).map(l => l.g));
      if (!club) { seasonBad.push(`seed ${c.seed} ${c.season} ${abbr}: no club totals`); continue; }
      if (lineSum !== club.pts) seasonBad.push(`seed ${c.seed} ${c.season} ${abbr}: lines ${lineSum} vs club ${club.pts}`);
      if (club.g !== t.wins + t.losses) seasonBad.push(`seed ${c.seed} ${c.season} ${abbr}: ${club.g} box games vs a ${t.wins}-${t.losses} record`);
      if (club.w !== t.wins) seasonBad.push(`seed ${c.seed} ${c.season} ${abbr}: ${club.w} box wins vs ${t.wins} in the standings`);
      if (maxG > club.g) seasonBad.push(`seed ${c.seed} ${c.season} ${abbr}: a man played ${maxG} of ${club.g}`);
    }
    const pts = Object.values(stats.teams).reduce((s, x) => s + x.pts, 0), opp = Object.values(stats.teams).reduce((s, x) => s + x.opp, 0);
    if (pts !== opp) seasonBad.push(`seed ${c.seed} ${c.season}: league points ${pts} vs allowed ${opp}`);
  }
  ok(1, `every club season (${clubSeasons}) sums its lines to its points and matches its record game for game and win for win`, seasonBad.length === 0, seasonBad.slice(0, 4).join(' | '));
  ok(1, 'the season loop closed thirty seasons', closes.length === SEEDS.length * SEASONS, String(closes.length));
  console.log(`   ${boxes} box scores, ${clubSeasons} club seasons over ${closes.length} closes`);
}

/* ---- 2. nothing taken from the league's generator --------------------------- */
console.log('2) The box takes nothing from the league generator: the same seed with and without lines');
{
  /* Ids come from one counter per page load, so the second league's men wear
     later numbers than the first's. Each id is renamed by its first
     appearance, which is the same place in two leagues that played the same. */
  const canon = json => {
    if (typeof json !== 'string') return String(json);
    const seen = new Map();
    /* ids sit in values, in cut ledgers and inside line keys ("BOS|<id>") */
    return json.replace(/n[0-9a-z]{4,}-\d+/g, m => { if (!seen.has(m)) seen.set(m, `#${seen.size}`); return seen.get(m); });
  };
  const strip = lg => {
    const c = clone(lg);
    delete c.stats; delete c.awards;
    for (const t of Object.values(c.teams)) for (const p of t.players) delete p.awards;
    for (const p of c.freeAgents) delete p.awards;
    return canon(JSON.stringify(c));
  };
  let pairs = 0;
  for (const seed of SEEDS.slice(0, 5)) {
    const rA = lcg(seed * 104729 + 3), rB = lcg(seed * 104729 + 3);
    const A = nba.initNbaLeague(rA), B = nba.initNbaLeague(rB);
    delete B.stats;
    const me = Object.keys(A.teams)[(seed * 7) % 30];
    let atClose = null;
    playSeason(A, me, rA, L => { atClose = strip(L); });
    let atCloseB = null;
    playSeason(B, me, rB, L => { atCloseB = strip(L); });
    ok(2, `seed ${seed}: the season closes identically with and without lines (standings, rosters, injuries, champion, tax, pool)`, atClose === atCloseB && atClose !== null, 'the two leagues differ at close');
    ok(2, `seed ${seed}: and identically after the summer`, strip(A) === strip(B), 'the two leagues differ after the summer');
    ok(2, `seed ${seed}: the league without lines kept none that season and picks them up in the summer`, B.stats && B.stats.season === B.season && !(B.awards ?? []).length, JSON.stringify({ stats: B.stats && B.stats.season, awards: (B.awards ?? []).length }));
    let s2A = null, s2B = null;
    playSeason(A, me, rA, L => { s2A = canon(JSON.stringify(L.stats)); });
    playSeason(B, me, rB, L => { s2B = canon(JSON.stringify(L.stats)); });
    ok(2, `seed ${seed}: the second season, both keeping lines, is identical lines included`, s2A === s2B && strip(A) === strip(B), 'second seasons differ');
    pairs += 1;
  }
  console.log(`   ${pairs} seeds played twice, two seasons each`);
}

/* ---- 3. the award rules ---------------------------------------------------- */
console.log('3) The award rules pick who the lines say: fixtures, then every simulated season against a typed copy of the rules');
/* `rookies` is who the harness drafted at the previous close. The typed rules
   read first year men from it, not from the line's own rookie mark, so a mark
   that flags the wrong men cannot agree with itself here. */
const typedAwards = (league, rookies) => {
  const stats = league.stats;
  const clubs = Object.values(stats.teams);
  const minGames = Math.max(1, Math.ceil(clubs.reduce((s, t) => s + t.g, 0) / clubs.length * SHARE));
  const byId = new Map();
  for (const l of Object.values(stats.lines)) {
    if (l.g <= 0) continue;
    const m = byId.get(l.id) ?? { id: l.id, name: l.name, lines: [] };
    m.lines.push(l);
    byId.set(l.id, m);
  }
  const men = [...byId.values()].map(m => {
    const ls = [...m.lines].sort((a, b) => b.g - a.g || a.team.localeCompare(b.team));
    const sum = k => ls.reduce((s, l) => s + (l.tot[k] ?? 0), 0);
    const g = ls.reduce((s, l) => s + l.g, 0), gs = ls.reduce((s, l) => s + l.gs, 0);
    const pg = k => round1(sum(k) / g);
    return { id: m.id, team: ls[0].team, g, gs, rookie: rookies.has(m.id), ppg: pg('pts'), rpg: pg('reb'), apg: pg('ast'), spg: pg('stl'), bpg: pg('blk') };
  }).filter(m => m.g >= minGames);
  const ws = abbr => { const t = league.teams[abbr]; const g = t.wins + t.losses; return g ? t.wins / g : 0; };
  const avgAllowed = clubs.length ? Object.values(stats.teams).reduce((s, c) => s + (c.g ? c.opp / c.g : 0), 0) / clubs.length : 0;
  const stingy = new Set(Object.entries(stats.teams).filter(([, c]) => c.g && c.opp / c.g < avgAllowed).map(([a]) => a));
  const best = (pool, score) => [...pool].sort((a, b) => round1(score(b) * 100) - round1(score(a) * 100) || b.g - a.g || a.id.localeCompare(b.id));
  const mvpScore = m => m.ppg + m.rpg + m.apg + WIN_W * ws(m.team);
  const mvpRank = best(men, mvpScore);
  return {
    minGames,
    mvp: mvpRank[0]?.id ?? null,
    allLeague: mvpRank.slice(0, 5).map(m => m.id),
    roy: best(men.filter(m => m.rookie), m => m.ppg + m.rpg + m.apg)[0]?.id ?? null,
    dpoy: best(men.filter(m => stingy.has(m.team)), m => m.spg + m.bpg + m.rpg / 2)[0]?.id ?? null,
    sixth: best(men.filter(m => m.gs * 2 < m.g), m => m.ppg)[0]?.id ?? null,
  };
};
{
  /* The fixture season: three clubs, 80 games each. */
  const line = (id, team, pos, g, gs, ppg, rpg, apg, spg, bpg, rookie) => ({
    id, name: id, team, pos, g, gs,
    tot: { pts: Math.round(ppg * g), reb: Math.round(rpg * g), ast: Math.round(apg * g), stl: Math.round(spg * g), blk: Math.round(bpg * g) },
    ...(rookie ? { rookie: true } : {}),
  });
  const L = [
    /* MVP: the bigger line on the losing club loses to the winner's (55 against 60) */
    line('good_star', 'AAA', 'F', 80, 80, 30, 8, 7, 1.5, 0.5),
    line('bad_star', 'BBB', 'G', 80, 80, 34, 8, 8, 1.5, 0.3),
    /* the best line of all, on 40 games of 80: under the 64 game bar */
    line('few_games', 'CCC', 'F', 40, 40, 45, 15, 10, 2, 1),
    line('a2', 'AAA', 'G', 78, 78, 25, 5, 5, 1, 0.5),
    line('c1', 'CCC', 'G', 80, 80, 27, 6, 6, 1, 0.2),
    line('b2', 'BBB', 'C', 76, 76, 22, 10, 2, 0.5, 1),
    line('a3', 'AAA', 'G', 70, 0, 12, 4, 3, 0.8, 0.1),
    /* rookies: the better one played 50 games */
    line('rook1', 'CCC', 'F', 70, 40, 18, 5, 3, 1, 0.5, true),
    line('rook2', 'BBB', 'G', 50, 50, 24, 6, 4, 1, 0.3, true),
    /* defense: the bigger shot blocker plays for a club that allowed more than average */
    line('big_bad', 'BBB', 'C', 80, 80, 10, 12, 1, 2, 3),
    line('big_good', 'AAA', 'C', 80, 80, 8, 11, 1, 1, 2),
    /* sixth man: off the bench 70 of 80; a man who started exactly half is out */
    line('sixth_real', 'CCC', 'F', 80, 10, 17, 4, 3, 0.7, 0.3),
    line('half', 'CCC', 'G', 80, 40, 20, 3, 2, 0.8, 0.1),
    /* a man traded mid season: 30 games for AAA, 45 for CCC, summed onto CCC */
    line('traded', 'AAA', 'F', 30, 0, 10, 3, 1, 0.5, 0.2),
    line('traded', 'CCC', 'F', 45, 45, 14, 5, 2, 0.6, 0.4),
  ];
  const stats = {
    season: 2030,
    lines: Object.fromEntries(L.map(l => [`${l.team}|${l.id}`, l])),
    teams: {
      AAA: { g: 80, w: 60, pts: 80 * 114, opp: 80 * 105 },
      BBB: { g: 80, w: 20, pts: 80 * 108, opp: 80 * 118 },
      CCC: { g: 80, w: 40, pts: 80 * 112, opp: 80 * 112 },
    },
  };
  const league = { season: 2030, stats, teams: { AAA: { wins: 60, losses: 20 }, BBB: { wins: 20, losses: 60 }, CCC: { wins: 40, losses: 40 } } };
  const A = st.nbaSeasonAwards(league);
  ok(3, 'the fixture needs 64 games (four in five of 80)', A && A.minGames === 64, A && String(A.minGames));
  ok(3, 'MVP: the smaller line on the 60 win club beats the bigger line on the 20 win club', A && A.mvp && A.mvp.id === 'good_star', A && A.mvp && A.mvp.id);
  ok(3, 'MVP: the best line of all on 40 games does not qualify', A && A.allLeague.every(m => m.id !== 'few_games'), A && A.allLeague.map(m => m.id).join(','));
  ok(3, 'All-League: the five best by the MVP score, any position, in order', A && A.allLeague.map(m => m.id).join(',') === 'good_star,bad_star,a2,c1,b2', A && A.allLeague.map(m => m.id).join(','));
  ok(3, 'Rookie of the Year: the qualified rookie, not the better one on 50 games', A && A.roy && A.roy.id === 'rook1', A && A.roy && A.roy.id);
  ok(3, 'Defensive Player: the stingy club\'s big, not the bigger numbers on a club that allowed more than average', A && A.dpoy && A.dpoy.id === 'big_good', A && A.dpoy && A.dpoy.id);
  ok(3, 'Sixth Man: the bench scorer, not a starter and not the man who started exactly half', A && A.sixth && A.sixth.id === 'sixth_real', A && A.sixth && A.sixth.id);
  const agg = fo.foSeasonPlayers(stats).find(p => p.id === 'traded');
  ok(3, 'a traded man\'s lines sum into one season on the club he played most for', agg && agg.g === 75 && agg.team === 'CCC' && agg.tot.pts === 300 + 630 && agg.teams.join(',') === 'CCC,AAA', JSON.stringify(agg));
  /* a tie on score goes to more games, and a season with no qualified rookie names none */
  const tie = {
    season: 2031,
    lines: {
      'AAA|tie_less': line('tie_less', 'AAA', 'G', 70, 70, 20, 5, 5, 1, 0),
      'AAA|tie_more': line('tie_more', 'AAA', 'G', 80, 80, 20, 5, 5, 1, 0),
    },
    teams: { AAA: { g: 80, w: 40, pts: 80 * 110, opp: 80 * 110 } },
  };
  const T = st.nbaSeasonAwards({ season: 2031, stats: tie, teams: { AAA: { wins: 40, losses: 40 } } });
  ok(3, 'a tie on score goes to the man with more games', T && T.mvp && T.mvp.id === 'tie_more', T && T.mvp && T.mvp.id);
  ok(3, 'no qualified rookie, no Rookie of the Year', T && T.roy === null, JSON.stringify(T && T.roy));
  ok(3, 'a season the league is not keeping lines for names nothing', st.nbaSeasonAwards({ season: 2032, stats, teams: league.teams }) === null);
  /* every simulated season against the typed rules */
  let agree = 0;
  const off = [];
  for (const c of closes) {
    const want = typedAwards(c.league, c.rookies);
    const got = c.closed;
    const gotIds = got ? { mvp: got.mvp?.id ?? null, allLeague: got.allLeague.map(m => m.id), roy: got.roy?.id ?? null, dpoy: got.dpoy?.id ?? null, sixth: got.sixth?.id ?? null } : null;
    const same = gotIds && want.mvp === gotIds.mvp && want.allLeague.join(',') === gotIds.allLeague.join(',') && want.roy === gotIds.roy && want.dpoy === gotIds.dpoy && want.sixth === gotIds.sixth && want.minGames === got.minGames;
    if (same) agree += 1; else if (off.length < 3) off.push(`seed ${c.seed} ${c.season}: engine ${JSON.stringify(gotIds)} typed ${JSON.stringify(want)}`);
  }
  ok(3, `every simulated season (${closes.length}) names the man the typed rules name, for all five awards`, agree === closes.length, off.join(' | '));
  const royNamed = closes.filter(c => c.closed && c.closed.roy).length;
  ok(3, 'a rookie of the year is named in a later season at least once (the race is not vacuous)', royNamed > 0, `${royNamed} of ${closes.length}`);
  ok(3, 'no rookie of the year in a league\'s first season, nobody in it was drafted by the league', closes.filter(c => c.season === 2026).every(c => c.closed && c.closed.roy === null));
  /* Who is a first year man. The engine marks a line rookie from the man's
     debut season; the harness knows who it drafted at each close. A line
     marked rookie must belong to a man drafted at the previous close, and every
     such man who played must be marked: a mark that counted everyone ever
     drafted, or a debut season one off, changes the winner most seasons from
     the third on and agrees with itself everywhere else. */
  const flagBad = [];
  let marked = 0, debutsPlayed = 0;
  const debutsBySeason = new Map();
  for (const c of closes) {
    for (const l of Object.values(c.league.stats.lines)) {
      const drafted = c.rookies.has(l.id);
      if (l.rookie) marked += 1;
      if (drafted && l.g > 0) { debutsPlayed += 1; debutsBySeason.set(`${c.seed}|${c.season}`, (debutsBySeason.get(`${c.seed}|${c.season}`) ?? 0) + 1); }
      if (l.rookie && !drafted) flagBad.push(`seed ${c.seed} ${c.season}: ${l.name} is marked rookie but was not drafted at the ${c.season - 1} close`);
      if (!l.rookie && drafted && l.g > 0) flagBad.push(`seed ${c.seed} ${c.season}: ${l.name}, drafted at the ${c.season - 1} close, played ${l.g} and is not marked rookie`);
    }
  }
  ok(3, 'the rookie mark is exactly the men drafted at the previous close who played', flagBad.length === 0, `${flagBad.length} wrong, e.g. ${flagBad.slice(0, 3).join(' | ')}`);
  const later = closes.filter(c => c.season > 2026);
  ok(3, 'and the check is not vacuous: first year men played in every season after a league\'s first', later.every(c => (debutsBySeason.get(`${c.seed}|${c.season}`) ?? 0) > 0), `${later.filter(c => (debutsBySeason.get(`${c.seed}|${c.season}`) ?? 0) > 0).length} of ${later.length}`);
  console.log(`   fixtures plus ${closes.length} simulated seasons; rookie of the year named in ${royNamed}; ${debutsPlayed} first year lines, ${marked} marked rookie`);
}

/* ---- 4. the leaders tables ------------------------------------------------- */
console.log('4) The leaders tables are a recount');
{
  let same = 0;
  const off = [];
  for (const c of closes) {
    const stats = c.league.stats;
    const clubs = Object.values(stats.teams);
    const minGames = Math.max(1, Math.ceil(clubs.reduce((s, t) => s + t.g, 0) / clubs.length * SHARE));
    const tally = new Map();
    for (const l of Object.values(stats.lines)) {
      const m = tally.get(l.id) ?? { id: l.id, g: 0, pts: 0, reb: 0, ast: 0 };
      m.g += l.g; m.pts += l.tot.pts; m.reb += l.tot.reb; m.ast += l.tot.ast;
      tally.set(l.id, m);
    }
    const q = [...tally.values()].filter(m => m.g >= minGames);
    const top = col => [...q].sort((a, b) => round1(b[col] / b.g) - round1(a[col] / a.g) || b.g - a.g || a.id.localeCompare(b.id)).slice(0, 3).map(m => `${m.id}:${round1(m[col] / m.g)}`).join(',');
    const L = st.nbaLeaders(c.league, 3);
    if (!L) { if (off.length < 2) off.push(`seed ${c.seed} ${c.season}: no leaders at all`); continue; }
    const got = col => L[col].map(r => `${r.id}:${r.value}`).join(',');
    const match = L.minGames === minGames && ['pts', 'reb', 'ast'].every(col => got(col) === top(col));
    if (match) same += 1; else if (off.length < 2) off.push(`seed ${c.seed} ${c.season}: ${L.minGames}/${minGames} ${got('pts')} vs ${top('pts')}`);
  }
  ok(4, `the leaders tables match a recount in every season (${closes.length})`, same === closes.length, off.join(' | '));
}

/* ---- 5. the lines read like basketball ------------------------------------- */
console.log('5) The lines read like basketball and like this sim');
const spearman = (xs, ys) => {
  const rank = v => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); idx.forEach(([, i], k) => { r[i] = k; }); return r; };
  return pearson(rank(xs), rank(ys));
};
function pearson(xs, ys) {
  const n = xs.length, mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < n; i += 1) { a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; c += (ys[i] - my) ** 2; }
  return a / Math.sqrt(b * c);
}
{
  const ppgs = [], tenth = [], rankCor = [], diffCor = [];
  const byPos = { G: { reb: [], ast: [] }, F: { reb: [], ast: [] }, C: { reb: [], ast: [] } };
  for (const c of closes) {
    const stats = c.league.stats;
    const clubs = Object.entries(stats.teams);
    ppgs.push(clubs.reduce((s, [, t]) => s + t.pts / t.g, 0) / clubs.length);
    const minGames = Math.max(1, Math.ceil(clubs.reduce((s, [, t]) => s + t.g, 0) / clubs.length * SHARE));
    const q = fo.foSeasonPlayers(stats).filter(p => p.g >= minGames);
    const sorted = q.map(p => p.tot.pts / p.g).sort((a, b) => b - a);
    tenth.push(sorted[9]);
    /* the rating he carried at close: the lines follow the ratings that decide games */
    const ovr = new Map([...Object.values(c.league.teams).flatMap(t => t.players), ...c.league.freeAgents].map(p => [p.id, p.ovr]));
    const rated = q.filter(p => ovr.has(p.id));
    rankCor.push(spearman(rated.map(p => ovr.get(p.id)), rated.map(p => p.tot.pts / p.g)));
    diffCor.push(pearson(clubs.map(([, t]) => (t.pts - t.opp) / t.g), clubs.map(([a]) => { const t = c.league.teams[a]; return t.wins / (t.wins + t.losses); })));
    for (const p of q) { if (byPos[p.pos]) { byPos[p.pos].reb.push(p.tot.reb / p.g); byPos[p.pos].ast.push(p.tot.ast / p.g); } }
  }
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const lo = a => Math.min(...a), hi = a => Math.max(...a);
  ok(5, `league points a club a game sit in ${BAND.clubPpg[0]} to ${BAND.clubPpg[1]} every season`, ppgs.every(x => x >= BAND.clubPpg[0] && x <= BAND.clubPpg[1]), `${lo(ppgs).toFixed(1)} to ${hi(ppgs).toFixed(1)}`);
  ok(5, `the tenth best qualified scorer averages ${BAND.tenthScorer[0]} to ${BAND.tenthScorer[1]} a game (median over seasons)`, median(tenth) >= BAND.tenthScorer[0] && median(tenth) <= BAND.tenthScorer[1], median(tenth).toFixed(1));
  ok(5, `rating and points a game rank together among qualified men: Spearman above ${BAND.ovrPpgRank} in every season`, rankCor.every(r => r > BAND.ovrPpgRank), `${lo(rankCor).toFixed(3)} to ${hi(rankCor).toFixed(3)}`);
  ok(5, `a club's point differential tracks its winning share: Pearson above ${BAND.diffWin} in every season`, diffCor.every(r => r > BAND.diffWin), `${lo(diffCor).toFixed(3)} to ${hi(diffCor).toFixed(3)}`);
  const R = k => mean(byPos[k].reb), A = k => mean(byPos[k].ast);
  ok(5, `centers out-rebound forwards out-rebound guards, by ${BAND.rebGap} a game or more each`, R('C') - R('F') >= BAND.rebGap && R('F') - R('G') >= BAND.rebGap, `C ${R('C').toFixed(2)} F ${R('F').toFixed(2)} G ${R('G').toFixed(2)}`);
  ok(5, `guards out-assist forwards out-assist centers, by ${BAND.astGap} a game or more each`, A('G') - A('F') >= BAND.astGap && A('F') - A('C') >= BAND.astGap, `G ${A('G').toFixed(2)} F ${A('F').toFixed(2)} C ${A('C').toFixed(2)}`);
  console.log(`   club ppg ${lo(ppgs).toFixed(1)} to ${hi(ppgs).toFixed(1)} (mean ${mean(ppgs).toFixed(2)}); tenth scorer median ${median(tenth).toFixed(2)} (${lo(tenth).toFixed(1)} to ${hi(tenth).toFixed(1)})`);
  console.log(`   rating vs ppg Spearman ${lo(rankCor).toFixed(3)} to ${hi(rankCor).toFixed(3)}; differential vs winning share ${lo(diffCor).toFixed(3)} to ${hi(diffCor).toFixed(3)}`);
  console.log(`   rebounds C ${R('C').toFixed(2)} F ${R('F').toFixed(2)} G ${R('G').toFixed(2)}; assists G ${A('G').toFixed(2)} F ${A('F').toFixed(2)} C ${A('C').toFixed(2)}`);
}

/* ---- 6. the close ---------------------------------------------------------- */
console.log('6) The close happens once and is kept');
{
  const awardCount = a => (a.mvp ? 1 : 0) + (a.roy ? 1 : 0) + (a.dpoy ? 1 : 0) + (a.sixth ? 1 : 0) + a.allLeague.length;
  let once = 0, cards = 0;
  for (const c of closes) {
    if (c.closed && c.again === c.closed) once += 1;
    if (c.closed && c.badges === awardCount(c.closed)) cards += 1;
  }
  ok(6, 'a second close of the same season returns the same awards and writes nothing new', once === closes.length, `${once} of ${closes.length}`);
  ok(6, 'every award is on exactly one card, written once', cards === closes.length, `${cards} of ${closes.length}`);
  const winnersCarry = closes.every(c => {
    const men = new Map([...Object.values(c.league.teams).flatMap(t => t.players), ...c.league.freeAgents].map(p => [p.id, p]));
    return !!c.closed && (!c.closed.mvp || (men.get(c.closed.mvp.id)?.awards ?? []).includes(`${c.season} MVP`));
  });
  ok(6, 'the MVP carries the MVP on his card', winnersCarry);
  const grew = histories.every(h => h.history.length === h.after && h.history.every((s, i) => s === 2026 + i));
  ok(6, 'the history grows by one a season, oldest first, and survives the summer', grew, JSON.stringify(histories.find(h => h.history.length !== h.after)));
  ok(6, 'the summer starts a clean sheet for the new season', histories.every(h => h.statsSeason === h.leagueSeason && h.lines === 0), JSON.stringify(histories.find(h => !(h.statsSeason === h.leagueSeason && h.lines === 0))));
  ok(6, 'and the season after it keeps lines again', closes.filter(c => c.season > 2026).every(c => c.closed !== null && Object.keys(c.league.stats.lines).length > 200));
}

/* ---- 7. an old save -------------------------------------------------------- */
console.log('7) A save from before the round: no lines this season, lines from the summer');
{
  const rng = lcg(824);
  const lg = clone(nba.initNbaLeague(rng));
  delete lg.stats; delete lg.awards;
  for (const t of Object.values(lg.teams)) for (const p of t.players) { delete p.rookieSeason; delete p.awards; }
  const me = Object.keys(lg.teams)[4];
  let threw = null;
  try {
    let first = 'not reached';
    playSeason(lg, me, rng, (L, closed) => { first = { closed, stats: L.stats === undefined, awards: L.awards === undefined, leaders: st.nbaLeaders(L), lines: st.nbaTeamLines(L, me).length }; });
    ok(7, 'the season it was saved in keeps no lines and names no awards', first.closed === null && first.stats && first.awards && first.leaders === null && first.lines === 0, JSON.stringify(first).slice(0, 200));
    ok(7, 'the summer starts its lines for the new season', lg.stats && lg.stats.season === lg.season && lg.season === 2027, JSON.stringify(lg.stats && lg.stats.season));
    let second = null;
    playSeason(lg, me, rng, (L, closed) => { second = closed; });
    ok(7, 'its second season closes with awards', second && second.mvp && second.allLeague.length === 5, JSON.stringify(second && second.mvp));
    ok(7, 'and its history holds that one season', (lg.awards ?? []).length === 1 && lg.awards[0].season === 2027, JSON.stringify((lg.awards ?? []).map(a => a.season)));
  } catch (e) { threw = e; }
  ok(7, 'nothing threw on the old shape', !threw, threw ? String(threw.message).slice(0, 160) : '');
  if (CONTROL) {
    console.log('   vitest skipped under this control: it reads src, which the control never touches');
  } else {
    const vitest = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
    ok(7, 'vitest can be found by walking up from the repo root', !!vitest);
    for (const [file, want] of [['src/components/nba-front-office/NbaSeasonStats.test.tsx', 4], ['src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx', 20]]) {
      if (!vitest) break;
      const r = spawnSync(process.execPath, [vitest, 'run', file], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
      const out = (r.stdout || '') + (r.stderr || '');
      const m = out.match(/Tests\s+(\d+) passed \((\d+)\)/);
      console.log(`   vitest ${path.basename(file)}: exit ${r.status}, ${m ? `${m[1]} passed of ${m[2]}` : 'no summary line'}`);
      ok(7, `${path.basename(file)} exits zero with all ${want} tests passed`, r.status === 0 && !!m && Number(m[1]) === want && Number(m[2]) === want, out.split('\n').filter(l => /×|FAIL|AssertionError|Unable to find/.test(l)).slice(0, 6).join(' | ') || (m ? m[0] : 'no summary'));
    }
  }
}

/* ---- 8. the copy ----------------------------------------------------------- */
console.log('8) The copy says what the engine does');
{
  const read = rel => {
    const text = fs.readFileSync(path.join(ROOT, ...rel.split('/')), 'utf8');
    const swaps = (CONTROL_COPY_SWAPS[CONTROL] ?? {})[rel];
    return swaps ? rewrite(rel, text, swaps) : text;
  };
  const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\}/g, '');
  const guide = read('src/data/gameContent/basketball.ts');
  const start = guide.indexOf("'/nba-front-office': {");
  const end = guide.indexOf("'/nba-my-career': {");
  const entry = start >= 0 && end > start ? guide.slice(start, end) : '';
  ok(8, 'the guide has its NBA Front Office entry', entry.length > 0);
  for (const [k, rule] of Object.entries(st.NBA_AWARD_RULE)) {
    ok(8, `the guide states the ${st.NBA_AWARD_LABEL[k]} rule as the engine does`, entry.includes(rule), rule);
  }
  ok(8, 'the guide says the lines are a sim season and how many games qualify', /not real NBA stat/i.test(entry) && entry.includes('four in five'), 'missing the sim season line or the qualifying bar');
  const board = stripComments(read('src/components/nba-front-office/NbaFrontOfficeBoard.tsx'));
  ok(8, "the board's close screen says sim season in code", board.includes("this save's games, not real NBA stats") && board.includes('note={SIM_NOTE}'));
  ok(8, "the board's award history says sim seasons in code", board.includes('Sim seasons, not real NBA history.'));
  const news = read('src/pages/WhatsNew.tsx');
  ok(8, "What's New has the round", /Round 824/.test(news) || /season in numbers/i.test(news), 'no entry');
  /* The page's worked example for the Sixth Man race promises a points line.
     The GM has no say over who starts (the best five healthy men do), so a
     bench man is by construction rated under the starters and plays fewer
     minutes: the number must be one the simulated winners actually reach.
     Measured 2026-10-01 over the thirty closes here: the median winner. The
     first draft promised 17, which no measured season came near. */
  const page = stripComments(read('src/pages/NbaFrontOffice.tsx'));
  const sixthLine = page.split('\n').find(l => l.includes('Sixth Man of the Year')) ?? '';
  const promised = Number((sixthLine.match(/(\d+(?:\.\d+)?) a game/) ?? [])[1]);
  const winners = closes.filter(c => c.closed && c.closed.sixth).map(c => c.closed.sixth.ppg).sort((a, b) => a - b);
  const q = f => winners.length ? winners[Math.min(winners.length - 1, Math.floor(f * winners.length))] : NaN;
  const med = q(0.5);
  ok(8, 'the page has a Sixth Man worked example that names a points a game figure', sixthLine.length > 0 && Number.isFinite(promised), sixthLine.trim().slice(0, 120) || 'no Sixth Man example on the page');
  ok(8, `the page's Sixth Man example promises what the sim's winners score: within ${BAND.sixthPromise} of the median winner's points a game`, Number.isFinite(promised) && Number.isFinite(med) && Math.abs(promised - med) <= BAND.sixthPromise, `page ${promised}, median winner ${med} (10th to 90th percentile ${q(0.1)} to ${q(0.9)} over ${winners.length} seasons)`);
  console.log(`   Sixth Man winners, points a game over ${winners.length} seasons: 10th percentile ${q(0.1)}, median ${med}, 90th ${q(0.9)}; the page promises ${promised}`);
}

/* ---- report ---------------------------------------------------------------- */
if (checks === 0) {
  console.error('FAIL: NOTHING WAS CHECKED');
  process.exit(1);
}
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} check${s.n === 1 ? '' : 's'}${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  const want = EXPECT[CONTROL];
  for (const f of fails.slice(0, 6)) console.log('   red: ' + f);
  if (red.join(',') === want.join(',')) {
    console.log(`control "${CONTROL}": section${want.length === 1 ? '' : 's'} ${want.join(' and ')} went red as expected (${fails.length} failures) and nothing else moved, the check works. Exiting non zero because the checks did fail.`);
    process.exit(1);
  }
  console.error(`control "${CONTROL}": expected section${want.length === 1 ? '' : 's'} ${want.join(' and ')} red, got ${red.length ? red.join(' and ') : 'nothing'}, so the check is dead somewhere or bleeds`);
  process.exit(3);
}
if (fails.length) {
  console.error(`simNbaSeasonStats: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simNbaSeasonStats: ${checks} checks passed over ${SEEDS.length} seeded franchises and ${SEASONS} seasons each. Every game adds up, the box takes nothing from the league, the awards follow their rules, and the season closes once.`);

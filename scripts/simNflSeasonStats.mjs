/* Round 1542: the NFL Front Office's season numbers (src/lib/nflSeasonStats.ts) and the lift of the story's drive
 * arithmetic (src/lib/gameLaws/nflDrives.ts) that the press reads them by.
 *
 *   node scripts/simNflSeasonStats.mjs
 *   LIFT_BASE=/path/to/a/worktree/of/the/base node scripts/simNflSeasonStats.mjs     (section 1, the lift's receipt)
 *   NFL_STATS_SECTIONS=1,2 SEEDSET=0 node scripts/simNflSeasonStats.mjs               (a part of it)
 *   NFL_STATS_CONTROL=<name> node scripts/simNflSeasonStats.mjs                        (a negative control)
 *
 * Exit 0 green; 1 red, or a control that fired at its named check; 2 could not run; 3 a control that did not fire
 * or turned a section red it is not aimed at. Every control asserts its anchor is in its file exactly once (the
 * bundle refuses otherwise) and rewrites the source in memory for the bundler only, never on disk.
 *
 * Nothing here reads the network or the clock: it bundles modules under src that import no client, and plays the
 * fleet of scripts/lib/gmGameDayFleet.mjs (seed sets 0 to 4, both kinds of league, 40 seasons each) the way the
 * board plays a week.
 *
 * SECTIONS
 *  1 LIFT. The drive arithmetic moved out of src/lib/gameLaws/nfl.ts with every body unchanged. Every told final of
 *    the fleet (the 272 regular season games and the 13 playoff games of every season) is told by the Game Day law
 *    from both sides on this tree and on LIFT_BASE (a worktree of the commit before the move, its path in the env
 *    var, never committed), and every GameStory, minutes included, must be the same JSON. Skipped, and said so in
 *    the closing line, when LIFT_BASE is not set: it is the receipt of the move, not a standing fence. On the first
 *    seed set run it also holds that A TILE WITH NO CREDITS IS THE TILE IT WAS: this tree's Game Day view of every
 *    told final, given no credits and its empty `scorers` taken out, is the base's view of it, deep equal.
 *  2 IDENTITIES, every game of the fleet (regular and playoff), the rosters as it was played: per side, credited
 *    touchdowns plus unclaimed are the story's 'td' events (the Game Day law tells the story: a harness may read it,
 *    a board may not); field goals and safeties are the story's; the drive counts are the cheapest list of the score
 *    by the harness's own copy of the rule; every credited man is a healthy starter of his club (the engine's own
 *    starterIds, never a lineman). Per club and season: thrown equals caught; run and caught plus unclaimed equal the
 *    club line's touchdowns; the told points sit between 6 and 8 a touchdown plus the kicks. Unclaimed is zero.
 *    Round 1566's fix pass: the card's kicks reader (nflClubKicks, the sentence "<club> kicked N field goals and scored
 *    M safeties") gives each club's touchdowns, field goals and safeties as the harness summed them from the games.
 *  3 DETERMINISM: each season played twice in the seeded Math.random, recording and not: the generator's state and
 *    draw count after Week 17 and after the postseason and close, the winners, injuries, computer moves, records,
 *    bracket and champion are the same, and the league is the same once the new keys are taken out (ids named by
 *    first appearance: the engine's minter counts on across two runs of one process). Weeks 1 and 9 recorded again
 *    on a copy through JSON give the board's block. Round 1566's closing check: all of that is one process, so it
 *    cannot see a value drawn once a page load; a deep season of every set is played the board's way in two fresh
 *    loads of the engine too (each its own module instance, its own id epoch and counters), and the two leagues are
 *    the same characters once each load's epoch is swapped for one token. The epoch is what is left between page
 *    loads, and its cost is printed (fixing its length changes every id minted on the site, the lead's call).
 *  4 THE RATING EFFECT, the strongest signal: for each club game the WR1 (the first healthy receiver on the chart)
 *    and his LIFT, his touchdown catches over what a credit blind to rating and slot gives him in the same games
 *    (one in k of the pool's receivers; 1 is no effect), in two bands of his rating. Asserted: the lift of the band
 *    HIGH_4 and up exceeds the lift of the band LOW_4 and under by MARGIN_4. Printed: the brief's share and his
 *    catches a game per band (a WR1 rated high sits on a club that scores more, so a per game gap is no proof), the
 *    pass share by QB1 rating and the sacks a club game by rush less block, five points a bucket. Asserted too (the
 *    review of 2026-10-22 found both rules could be inverted with every gate green): the least squares slope of the
 *    pass share on the QB1's rating above PASS_MARGIN_4, and of the sacks a club game on rush less block above
 *    SACK_MARGIN_4, each set on its own (controls passflip and sackswap). THE LOW BAND IS 73, NOT THE BRIEF'S 72:
 *    the fleet is the real 2026 rosters at their opening, and a WR1 of 72 or under is 4 club games in 16 seasons
 *    (CLE's, when its receivers are hurt); 73 is MIA's WR1, about 1,400 club games a set. Lead's to rule on.
 *  5 AWARDS AND THE CLOSE, NFL_STATS_FRANCHISES (10) deep franchises over four seasons the board's way, the draft
 *    (his picks the top graded, the computer batches, nflMarkRookies) and runOffseason in: the lib names the same
 *    three men as the harness's own copy of the rules with the harness's OWN record of whom it drafted; the rookie
 *    lines are exactly those men; a second close changes nothing; the history grows by one a season; cards carry
 *    each award once and survive the summer by id; Week 1 opens a clean block and keeps the history; first year men
 *    record lines in every later season; a tie fixture (the loser listed first) goes to games, then the id.
 *    Printed: seasons naming each rookie award, the MVP by position.
 *  6 OLD SAVE: three deep leagues stripped of the new keys at Week 5 (a save from before this round) play to their
 *    close recording nothing and throwing nothing; their next Week 1 opens lines and that season closes with awards.
 *  7 SIZE: over the fleet, the board's save (the league with its block and history, his club, the season's log of
 *    his games) against simNflFullRosters.mjs's budget, read by its anchor (stats.maxSave, 700K). The brief's 600K
 *    stop line is PRINTED with the same save without this round's keys beside it, never asserted: a deep league
 *    opens at about 620K of its own (every man carries his opening rating evidence), so the line was passed before
 *    this round. Printed too: the block's bytes (median, largest) and the lines a season both ways (the pool's, and
 *    men with a stat only: the brief's open question 1). Asserted: every line is a man who was in his club's pool.
 *  8 COPY AND PURITY: the lib, nflDrives.ts and foSeasonClose.ts hold no Math.random, Date or localStorage
 *    (comments taken out); every sentence the lib builds has no quotation mark and no verb of speech.
 *
 * CONTROLS
 *   liftdrift    MAX_FG 6 to 5 in this tree's nflDrives.ts                     -> section 1, red on every set
 *   dropone      a side's last touchdown is not credited                         -> section 2, red on every set
 *   nocatch      a pass credits the thrower only                                 -> section 2, red on every set
 *   injured      the pool keeps injured skill men                                -> section 2, red on every set
 *   swapsides    the press splits the final with the away score first           -> section 2, red on every set
 *   kickswap     nflClubKicks reads the safeties as the field goals and back     -> section 2, red on every set
 *   extradraw    a Math.random() in nflCreditGame                                -> section 3, red on every set
 *   unkeyed      the credit stream keyed to a counter at module scope            -> section 3, red on every set
 *   perload      a value drawn once a page load kept in the block                -> section 3, red on every set
 *   randomcredit every credit uniform over the eligible men, ratings ignored     -> section 4, red on every set
 *   passflip     a touchdown is a pass when the draw is ABOVE the QB1's chance   -> section 4, red on every set
 *   sackswap     nflSackChance called with the block first and the rush second  -> section 4, red on every set
 *   tiebreak     foRankAward with no games and id tie rule                       -> section 5
 *   rookieall    a line is a rookie's for every man ever drafted in the save     -> section 5
 *   closetwice   the once a season rule taken out of the shared close            -> section 5
 *   oldopen      the block opens at any week, not only Week 1                    -> section 6
 *   wholeroster  a line for every man on every roster                            -> section 7
 *   quote        a help sentence given a speaker and a quotation                 -> section 8
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE_ENTRY, FLEET, ROOT, bundle, enginePostseason, norm, playRegularSeason, readSrc, seasonId, seededGen, sha1 } from './lib/gmGameDayFleet.mjs';

const CONTROL = process.env.NFL_STATS_CONTROL || '';
const SEEDSETS = process.env.SEEDSET !== undefined && process.env.SEEDSET !== '' ? process.env.SEEDSET.split(',').map(Number) : FLEET.sets;
if (SEEDSETS.some(s => !FLEET.sets.includes(s))) { console.error(`SEEDSET must be among ${FLEET.sets.join(', ')}`); process.exit(2); }
const ALL_SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = process.env.NFL_STATS_SECTIONS ? process.env.NFL_STATS_SECTIONS.split(',').map(Number) : ALL_SECTIONS;
const LIFT_BASE = process.env.LIFT_BASE || '';
/* seasons a kind and a set (a quick look only: every gate runs the whole fleet) */
const PER_KIND = Number(process.env.NFL_STATS_SEASONS || FLEET.perKind);

const DRIVES = 'src/lib/gameLaws/nflDrives.ts';
const STATS = 'src/lib/nflSeasonStats.ts';
const FO_STATS = 'src/lib/foSeasonStats.ts';
const AWARDS = 'src/lib/nflSeasonAwards.ts';
const CLOSE = 'src/lib/foSeasonClose.ts';
const VIEW = 'src/lib/nflSeasonView.ts';

/* `labels`: pieces of check labels that must ALL be among the reds of the control's section. `everySet`: the
   control must turn the section's check red on every seed set run. `needs`: the sections it cannot fire without. */
const CONTROLS = {
  /* liftdrift moves the drive rule itself, so section 2's own copy of the rule goes red with it: that is the copy working */
  liftdrift: { section: 1, labels: ['tells the same story on this tree as on the base'], everySet: true, needs: [1], elsewhere: [2], patches: [{ file: DRIVES, from: 'export const MAX_FG = 6;', to: 'export const MAX_FG = 5;' }] },
  dropone: { section: 2, labels: ["credited and unclaimed touchdowns are the story's"], everySet: true, needs: [2], patches: [{ file: STATS, from: '    for (let i = 0; i < s.tds; i += 1) {', to: '    for (let i = 0; i < s.tds - 1; i += 1) {' }] },
  nocatch: { section: 2, labels: ['thrown equals caught'], everySet: true, needs: [2], patches: [{ file: STATS, from: "        if (cr.passer) { bump(men[cr.passer.id], 'ptd'); bump(men[cr.scorer.id], 'ctd'); }", to: "        if (cr.passer) { bump(men[cr.passer.id], 'ptd'); }" }] },
  injured: { section: 2, labels: ['healthy starter of his club'], everySet: true, needs: [2], patches: [{ file: STATS, from: 'skill: unitStarters(team, SKILL_POS, SKILL_SLOTS),', to: 'skill: unitStarters({ ...team, players: team.players.map(p => ({ ...p, out: 0 })) }, SKILL_POS, SKILL_SLOTS),' }] },
  swapsides: { section: 2, labels: ["credited and unclaimed touchdowns are the story's"], everySet: true, needs: [2], patches: [{ file: STATS, from: 'nflDrivePair(told.homeScore, told.awayScore, keyedRng(gmStoryKey(told)))', to: 'nflDrivePair(told.awayScore, told.homeScore, keyedRng(gmStoryKey(told)))' }] },
  kickswap: { section: 2, labels: ["the card's kicks reader gives the touchdowns, field goals and safeties the games told"], everySet: true, needs: [2], patches: [{ file: VIEW, from: 'return c ? { td: c[0], fg: c[1], sf: c[2] } : null;', to: 'return c ? { td: c[0], fg: c[2], sf: c[1] } : null;' }] },
  extradraw: { section: 3, labels: ['the same generator state and draw count after Week 17'], everySet: true, needs: [3], patches: [{ file: STATS, from: '  const rng = keyedRng(`${told.key}|credit`);', to: '  const rng = keyedRng(`${told.key}|credit`); Math.random();' }] },
  unkeyed: { section: 3, labels: ['the same week recorded twice gives the same block'], everySet: true, needs: [3], patches: [{ file: STATS, from: '  const rng = keyedRng(`${told.key}|credit`);', to: '  const rng = keyedRng(`${told.key}|credit|${(globalThis.__nflCreditCalls = (globalThis.__nflCreditCalls ?? 0) + 1)}`);' }] },
  /* Round 1566's closing check: a value drawn at module scope (once a page load, as the id epoch is) kept in the block.
     Every play inside one load agrees on it, so only section 3's check between two fresh loads can see it. */
  perload: { section: 3, labels: ['between two page loads'], everySet: true, needs: [3], patches: [
    { file: STATS, from: 'export function nflRecordWeek(lg: LeagueState, told: readonly NflToldGame[], my: string): number {', to: 'const DUKB_LOAD = Math.floor(Math.random() * 1e9);\nexport function nflRecordWeek(lg: LeagueState, told: readonly NflToldGame[], my: string): number {' },
    { file: STATS, from: '  if (!nflLiveStats(lg)) return 0;', to: '  if (!nflLiveStats(lg)) return 0;\n  (lg.stats as unknown as Record<string, number>).loaded = DUKB_LOAD;' },
  ] },
  randomcredit: { section: 4, labels: ["lift over a rating blind credit climbs with his rating"], everySet: true, needs: [4], patches: [{ file: STATS, from: '  const ws = men.map(m => Math.max(0, weight(m)));', to: '  const ws = men.map(m => (weight(m) > 0 ? 1 : 0));' }] },
  passflip: { section: 4, labels: ['the pass share climbs with the QB1'], everySet: true, needs: [4], patches: [{ file: STATS, from: 'const catcher = s.pool.qb && kind < nflPassChance(s.pool.qb.ovr) ?', to: 'const catcher = s.pool.qb && kind > nflPassChance(s.pool.qb.ovr) ?' }] },
  sackswap: { section: 4, labels: ['the sacks climb with the rush against the block'], everySet: true, needs: [4], patches: [{ file: STATS, from: 'const chance = nflSackChance(rush, mean(line.map(m => m.ovr), NFL_BLOCK_FLOOR));', to: 'const chance = nflSackChance(mean(line.map(m => m.ovr), NFL_BLOCK_FLOOR), rush);' }] },
  tiebreak: { section: 5, labels: ['a tie goes to more games, then the id'], needs: [5], patches: [{ file: FO_STATS, from: '.sort((a, b) => b.s - a.s || b.p.g - a.p.g || a.p.id.localeCompare(b.p.id))', to: '.sort((a, b) => b.s - a.s)' }] },
  rookieall: { section: 5, labels: ['the rookie lines are the first year men the harness drafted'], needs: [5], patches: [{ file: STATS, from: 'm.id, m.name, m.pos, m.rookieSeason === lg.season), true);', to: 'm.id, m.name, m.pos, m.rookieSeason !== undefined), true);' }] },
  closetwice: { section: 5, labels: ['a second close writes no card twice'], needs: [5], patches: [{ file: CLOSE, from: '  if (done) return done;', to: '' }] },
  oldopen: { section: 6, labels: ['recording nothing and throwing nothing'], needs: [6], patches: [{ file: STATS, from: '  if (lg.week === 1 && !nflLiveStats(lg)) lg.stats = nflNewStats(lg.season);', to: '  if (!nflLiveStats(lg)) lg.stats = nflNewStats(lg.season);' }] },
  wholeroster: { section: 7, labels: ["every line is a man who was in his club's pool"], needs: [7], patches: [{ file: STATS, from: '      for (const m of nflPoolMen(s.pool)) {', to: '      for (const m of lg.teams[s.team].players) {' }] },
  quote: { section: 8, labels: ['no quotation mark and no verb of speech'], needs: [8], patches: [{ file: STATS, from: '"Sacks come from the pass rush', to: '"The coach said: \\"Sacks come from the pass rush' }] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
if (CONTROL && CONTROLS[CONTROL].needs.some(s => !SECTIONS.includes(s))) { console.error(`control ${CONTROL} needs sections ${CONTROLS[CONTROL].needs.join(', ')}`); process.exit(2); }
if (CONTROL === 'liftdrift' && !LIFT_BASE) { console.error('control liftdrift needs LIFT_BASE'); process.exit(2); }
const PATCHES = CONTROL ? CONTROLS[CONTROL].patches : [];

/* ─── checks ─── */
let checks = 0;
const failsBy = new Map();
function check(section, label, ok, detail = '') {
  checks += 1;
  if (ok) { console.log(`  ok   ${label}`); return; }
  console.log(`  FAIL ${label}${detail ? `: ${detail}` : ''}`);
  const k = String(section);
  failsBy.set(k, [...(failsBy.get(k) ?? []), label]);
}
const tally = () => ({ n: 0, bad: 0, first: '' });
function count(t, ok, what) { t.n += 1; if (!ok) { t.bad += 1; if (!t.first) t.first = typeof what === 'function' ? what() : what; } }
function settle(section, label, t) { check(section, `${label} (${t.n} looked at)`, t.bad === 0 && t.n > 0, t.n === 0 ? 'nothing was looked at' : `${t.bad} broke it, the first: ${t.first}`); }

/* A bundle of another tree (section 1's base): the fleet's bundle reads this tree only. Packages resolve from this
   tree's node_modules, since a worktree made on a runner has none of its own. */
async function bundleAt(root, entry, tag) {
  const out = path.join(os.tmpdir(), `nfl-stats-${tag}-${process.pid}-${Date.now()}.mjs`);
  await build({
    stdin: { contents: entry.join('\n'), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: root, logLevel: 'error',
    alias: { '@': './src' }, jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')],
  });
  const M = await import(pathToFileURL(out).href);
  try { fs.unlinkSync(out); } catch { /* the temp file is only a copy */ }
  return M;
}

const STORY_ENTRY = [
  "export * as day from './src/lib/gmGameDay.ts';",
  "export { NFL_GAME_DAY } from './src/lib/gameLaws/nflGameDay.ts';",
  "export * as tile from './src/lib/gmGameDayView.ts';",
];
const HEAD_ENTRY = [
  ...ENGINE_ENTRY,
  ...STORY_ENTRY,
  "export * as bind from './src/lib/frontOfficeGameDay.ts';",
  "export * as stats from './src/lib/nflSeasonStats.ts';",
  "export * as awards from './src/lib/nflSeasonAwards.ts';",
  "export * as view from './src/lib/nflSeasonView.ts';",
  "export * as fo from './src/lib/foSeasonStats.ts';",
  "export { leagueNames } from './src/lib/foNames.ts';",
  "export { makeIdMinter } from './src/lib/entityIds.ts';",
];

const t0 = Date.now();
let M;
let fired;
let B = null;
/* Round 1566's closing check: two more bundles of the same tree for section 3, each a fresh page load (a module
   instance of its own: its own id epoch drawn at module scope, its own counters from one) */
const LOADS = [];
try {
  ({ M, fired } = await bundle(HEAD_ENTRY, PATCHES, 'head'));
  /* the awards and the close live in src/lib/nflSeasonAwards.ts (they ride in the career kit, not the page): the
     harness reads them beside the lines, as one lib */
  if (!M.awards || typeof M.awards.nflCloseSeasonStats !== 'function') throw new Error('src/lib/nflSeasonAwards.ts does not export nflCloseSeasonStats');
  M = { ...M, stats: { ...M.stats, ...M.awards } };
  if (SECTIONS.includes(3)) {
    for (const tag of ['load2', 'load3']) {
      const { M: L } = await bundle(HEAD_ENTRY, PATCHES, tag);
      LOADS.push({ ...L, stats: { ...L.stats, ...L.awards } });
    }
  }
  if (SECTIONS.includes(1) && LIFT_BASE) {
    if (!fs.existsSync(path.join(LIFT_BASE, DRIVES)) && !fs.existsSync(path.join(LIFT_BASE, 'src/lib/gameLaws/nfl.ts'))) throw new Error(`LIFT_BASE ${LIFT_BASE} holds no NFL story law`);
    B = await bundleAt(LIFT_BASE, STORY_ENTRY, 'base');
  }
} catch (e) {
  console.error(`could not bundle: ${e.message}`);
  process.exit(2);
}
if (CONTROL && fired.size !== PATCHES.length) { console.error(`control ${CONTROL}: ${fired.size} of ${PATCHES.length} patches applied`); process.exit(2); }
console.log(`bundled in ${Date.now() - t0} ms${CONTROL ? ` (control ${CONTROL})` : ''}`);

/* ─── The fleet, played the board's way: every told final of a season, regular season and playoffs ─── */
function toldSeason(set, kind, i) {
  const out = [];
  const season = playRegularSeason(M, set, kind, i, (done, _p, week, lg) => {
    const t = M.bind.nflTell(done, lg.teams, lg.season, M.bind.nflWhere(week));
    if (t.last) out.push(t.last);
  });
  enginePostseason(M, season, (g, round) => {
    const t = M.bind.nflTell(g, season.lg.teams, season.lg.season, round);
    if (t.last) out.push(t.last);
  });
  return { season, told: out };
}

/* ─── 1. LIFT: every told final tells the same story on this tree as on the base ─── */
let liftNote = '';
if (SECTIONS.includes(1)) {
  console.log('');
  console.log('1. LIFT');
  if (!B) {
    liftNote = 'section 1 skipped: LIFT_BASE is not set';
    console.log(`  ${liftNote}`);
  } else {
    for (const set of SEEDSETS) {
      const t = tally();
      let told = 0;
      let stories = 0;
      const tileSame = tally();
      const lines = [];
      for (const kind of FLEET.kinds) {
        for (let i = 0; i < PER_KIND; i += 1) {
          for (const g of toldSeason(set, kind, i).told) {
            told += 1;
            for (const view of ['home', 'away']) {
              const head = JSON.stringify(M.day.gameStory(M.NFL_GAME_DAY, g, view));
              const base = JSON.stringify(B.day.gameStory(B.NFL_GAME_DAY, g, view));
              if (head !== 'null') stories += 1;
              lines.push(head);
              count(t, head === base, () => `${g.key} from the ${view} side`);
              /* A TILE WITH NO CREDITS IS THE TILE IT WAS: this tree's view with no credits, its empty list taken out,
                 is the base's view of the same game, on the first seed set run */
              if (set === SEEDSETS[0]) {
                const club = view === 'home' ? g.home : g.away;
                const mine = M.tile.gameDayView(M.NFL_GAME_DAY, g, club, id => id);
                const { scorers, ...rest } = mine;
                count(tileSame, JSON.stringify(rest) === JSON.stringify(B.tile.gameDayView(B.NFL_GAME_DAY, g, club, id => id)) && Array.isArray(scorers) && scorers.length === 0 && !('creditsMissing' in mine), () => `${g.key} for ${club}`);
              }
            }
          }
        }
      }
      if (set === SEEDSETS[0]) settle(1, `set ${set}: with no credits the tile's view is the base's, its empty list taken out`, tileSame);
      const want = FLEET.kinds.length * PER_KIND * (272 + 13);
      check(1, `set ${set}: the fleet told ${told} finals, every game of every season (want ${want})`, told === want);
      check(1, `set ${set}: ${stories} of ${told * 2} tellings are a story, not the final alone`, stories > told * 2 * 0.99);
      settle(1, `set ${set}: every told final tells the same story on this tree as on the base`, t);
      console.log(`  set ${set}: receipt ${sha1(lines.join('\n'))}`);
    }
  }
}

/* ─── The board's season: Week 1 to the close, inside the seeded Math.random ─── */
/** Run fn with gen standing in for Math.random; fn is handed a reader of the draws so far. */
function seeded(gen, fn) {
  const real = Math.random;
  let calls = 0;
  Math.random = () => { calls += 1; return gen.next(); };
  try { return fn(() => calls); } finally { Math.random = real; }
}
/** The fleet's season opened as scripts/lib/gmGameDayFleet.mjs opens it: the same generator and the same GM club. */
function openFleetSeason(set, kind, i) {
  const E = M.engine;
  const gen = seededGen(`gm game day fleet|${seasonId(set, kind, i)}`);
  const user = M.FO_TEAMS[(set * 7 + i * 3 + (kind === 'deep' ? 11 : 0)) % M.FO_TEAMS.length].abbr;
  const lg = seeded(gen, () => {
    const league = E.initLeague(Math.random, kind === 'deep' ? { depth: M.FO_DEPTH, userTeam: user } : {});
    if (kind === 'deep' && E.deepOverLimit(league.teams[user]) > 0) E.cutDownToMax(league.teams[user], league.freeAgents);
    return league;
  });
  return { gen, user, lg };
}
/** A season the board's way from the week the league is at: playWeek to Week 17 (the injury pass, the computer clubs'
 *  moves, the games, nflTell, then the recorder), the one press postseason (his playoff games credited for the tile)
 *  and closeSeason's close. `record` false plays it with no recorder at all. Hooks: onWeek(lg, told, week) before the
 *  week is recorded, onRecorded(lg, told, week) after it, onPlayoff(lg, told) before a playoff game is recorded. */
function boardSeason(s, record, hooks = {}) {
  const E = M.engine, B = M.bind, S = M.stats;
  const { lg, user, gen } = s;
  return seeded(gen, draws => {
    const winners = [], hurt = [], moves = [];
    for (;;) {
      hurt.push(JSON.stringify(E.injuryPass(lg.teams, Math.random)));
      moves.push(JSON.stringify(E.aiWeeklyMoves(lg, user, Math.random)));
      const games = lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, Math.random));
      const told = games.map(g => B.nflTell(g, lg.teams, lg.season, B.nflWhere(lg.week))).flatMap(t => (t.last ? [t.last] : []));
      winners.push(...games.map(g => g.winner));
      if (hooks.onWeek) hooks.onWeek(lg, told, lg.week);
      if (record) S.nflRecordWeek(lg, told, user);
      if (hooks.onRecorded) hooks.onRecorded(lg, told, lg.week);
      if (lg.week >= E.REGULAR_WEEKS) break;
      lg.week += 1;
    }
    const week17 = `${gen.state} ${draws()}`;
    const { rounds, champion } = E.runPlayoffs(lg.teams, Math.random);
    for (const r of rounds) for (const g of r.games) {
      const t = B.nflTell(g, lg.teams, lg.season, r.name);
      if (!t.last) continue;
      if (hooks.onPlayoff) hooks.onPlayoff(lg, t.last);
      if (record && (g.home === user || g.away === user)) S.nflRecordGame(lg, t.last, user, false);
    }
    lg.champions.push({ season: lg.season, team: champion });
    const closed = record ? S.nflCloseSeasonStats(lg) : null;
    const records = Object.keys(lg.teams).sort().map(a => `${a} ${lg.teams[a].wins}-${lg.teams[a].losses}`).join(',');
    return { week17, after: `${gen.state} ${draws()}`, winners: winners.join(','), hurt: sha1(hurt.join('|')), moves: sha1(moves.join('|')), records, champion, rounds: sha1(JSON.stringify(rounds)), closed };
  });
}
/** The league with this round's keys taken out: the block, the history, a man's awards and first year. */
function stripped(lg) {
  const c = JSON.parse(JSON.stringify(lg));
  delete c.stats;
  delete c.awards;
  for (const list of M.stats.nflEveryMan(c)) for (const p of list) { delete p.awards; delete p.rookieSeason; }
  /* the engine's id minter counts on across the two runs of one process, so ids are named by first appearance */
  const ids = new Map();
  return JSON.stringify(c).replace(/"(p[0-9a-z]+-\d+)"/g, (_, id) => {
    if (!ids.has(id)) ids.set(id, `#${ids.size}`);
    return `"${ids.get(id)}"`;
  });
}
/** THE HARNESS'S OWN COPY of the drive rule (src/lib/gameLaws/nflDrives.ts): the cheapest list of sevens, threes, at
 *  most one safety, at most six field goals. Today every score has exactly one cheapest list. */
function cheapest(points) {
  let best = null;
  let ties = 0;
  for (let s = 0; s <= 1; s += 1) for (let f = 0; f <= 6; f += 1) for (let t = 0; t <= 12; t += 1) {
    const rest = points - 3 * f - 2 * s;
    if (rest < 6 * t || rest > 8 * t) continue;
    const cost = Math.abs(rest - 7 * t) + 4 * s;
    if (!best || cost < best.cost) { best = { t, f, s, cost }; ties = 0; } else if (cost === best.cost) ties += 1;
  }
  return best ? { ...best, ties } : null;
}

/* ─── 2. IDENTITIES, 3. DETERMINISM, 4. THE RATING EFFECT: one pass over the fleet ─── */
/* MEASURED 2026-10-22 on a runner (rc r1542-s2, head 39038a73), all five seed sets, the whole fleet, band 73: the gap
   0.503, 0.486, 0.568, 0.416, 0.535 (smallest 0.416); under randomcredit 0.121, 0.023, 0.080, -0.017, 0.094 (largest
   0.121). The margin sits half way, 0.15 from each. */
const MARGIN_4 = 0.27;
/* The two other rating rules the "?" states, each a least squares slope over every regular season club game of a set:
   the pass share of credited touchdowns a point of QB1 rating (the rule's own slope is NFL_PASS_SLOPE, 0.01, inside
   its clamp), and the sacks a club game a point of rush less block (NFL_SACK_TRIES times NFL_SACK_SLOPE, 0.08).
   MEASURED 2026-10-23 on a runner (rc r1542-fx-m1, head 009f22f96), all five seed sets, the whole fleet:
     pass slope 0.00989, 0.01016, 0.00979, 0.01005, 0.00995 (smallest 0.00979, standard error 0.00022 on each set,
       about 112,000 credited touchdowns a set); under passflip -0.00989 to -0.01016 (largest -0.00979);
     sack slope 0.0801, 0.0776, 0.0795, 0.0797, 0.0801 (smallest 0.0776, standard error 0.0019 to 0.0020, 43,520 club
       games a set); under sackswap -0.0794 to -0.0818 (largest -0.0790).
   Half way between the clean smallest and the controls' largest is about zero, which would let a rule cut to a
   sliver of itself pass. So each margin sits half way between the clean smallest and NO effect (0, what a rule
   blind to rating gives), which the controls lie well beyond: 0.005 is about 22 standard errors from 0.00979 and 23 from
   zero; 0.04 is 19 from 0.0776 and 20 from zero. */
const PASS_MARGIN_4 = 0.005;
const SACK_MARGIN_4 = 0.04;
const newFit = () => ({ n: 0, sx: 0, sy: 0, sxx: 0, sxy: 0, syy: 0 });
function addFit(f, x, y) { f.n += 1; f.sx += x; f.sy += y; f.sxx += x * x; f.sxy += x * y; f.syy += y * y; }
/* the slope and its standard error (the residual spread over the spread of x) */
function slopeOf(f) {
  const sxx = f.sxx - (f.sx * f.sx) / f.n, sxy = f.sxy - (f.sx * f.sy) / f.n, syy = f.syy - (f.sy * f.sy) / f.n;
  if (!(f.n > 2) || !(sxx > 0)) return { b: NaN, se: NaN };
  const b = sxy / sxx;
  return { b, se: Math.sqrt(Math.max(0, syy - b * sxy) / (f.n - 2) / sxx) };
}
const HIGH_4 = 85;
const LOW_4 = Number(process.env.NFL_STATS_LOW_BAND || 73);
const measured4 = [];
/* section 7: the saves and blocks the fleet writes, and whether every line is a man who was in his club's pool */
const sizes = { saves: [], bases: [], blocks: [], lines: [], statLines: [], pool: null };
if (SECTIONS.includes(7)) sizes.pool = tally();
/* Round 1566 (brief decision 2): the id epoch (src/lib/entityIds.ts) is drawn once a page load, 2 to 14 characters,
   and every minted id carries it, so a size measured with the run's own epoch moved between runs of one head. Section
   7 measures every save and block with the epoch pinned at its longest (14 characters), the most the ids can cost, so
   the same run measures the same characters every time. The probe minter has its own counter: it moves no id. */
const RUN_EPOCH = (() => { const id = M.makeIdMinter('q')(); return id.slice(1, id.lastIndexOf('-')); })();
const pinEpoch = text => text.replace(new RegExp(`(["|])([a-z]{1,2})${RUN_EPOCH}-(\\d+)`, 'g'), `$1$2${'z'.repeat(14)}-$3`);
let seasonPools = {};
let seasonKicks = {};
if (SECTIONS.some(s => s === 2 || s === 3 || s === 4 || s === 7)) {
  const E = M.engine, S = M.stats;
  for (const set of SEEDSETS) {
    const t2 = { td: tally(), kicks: tally(), cheap: tally(), pool: tally(), thrown: tally(), club: tally(), bounds: tally(), view: tally() };
    const t3 = { w17: tally(), after: tally(), results: tally(), league: tally(), twice: tally() };
    const r4 = { hi: { games: 0, pass: 0, wr1: 0, blind: 0 }, lo: { games: 0, pass: 0, wr1: 0, blind: 0 }, qb: {}, sack: {}, dist: {}, passFit: newFit(), sackFit: newFit() };
    let unclaimed = 0;
    let gamesSeen = 0;
    /* one game's credit beside its story, the rosters as it was played */
    const identity = (lg, g, regular, unclaimedBy) => {
      const c = S.nflCreditGame(g, lg.teams);
      gamesSeen += 1;
      if (!c) { count(t2.td, false, `${g.key}: the credit refused a told final`); return; }
      const st = M.day.gameStory(M.NFL_GAME_DAY, g, 'home');
      const n = (side, kind) => (st ? st.game.events.filter(e => e.side === side && e.kind === kind).length : -1);
      count(t2.td, c.home.credits.length + c.home.unclaimed === n('us', 'td') && c.away.credits.length + c.away.unclaimed === n('them', 'td'), () => `${g.key}: credited ${c.home.credits.length}+${c.home.unclaimed} and ${c.away.credits.length}+${c.away.unclaimed}, story ${n('us', 'td')} and ${n('them', 'td')}`);
      count(t2.kicks, c.home.fgs === n('us', 'fg') && c.away.fgs === n('them', 'fg') && c.home.safeties === n('us', 'safety') && c.away.safeties === n('them', 'safety'), () => g.key);
      const want = [cheapest(g.homeScore), cheapest(g.awayScore)];
      count(t2.cheap, [c.home, c.away].every((sd, k) => want[k] && want[k].ties === 0 && sd.tds === want[k].t && sd.fgs === want[k].f && sd.safeties === want[k].s), () => `${g.key} ${g.homeScore}-${g.awayScore}`);
      for (const [sd, other] of [[c.home, c.away], [c.away, c.home]]) {
        if (regular) { const set7 = (seasonPools[sd.team] ??= new Set()); for (const p of S.nflPoolMen(sd.pool)) set7.add(p.id); }
        const team = lg.teams[sd.team];
        const starters = E.starterIds(team);
        const fit = id => { const p = team.players.find(m => m.id === id); return !!p && p.out === 0 && p.pos !== 'OL' && starters.has(id); };
        const ids = [...sd.credits.flatMap(cr => [cr.scorer.id, ...(cr.passer ? [cr.passer.id] : [])]), ...Object.keys(sd.sacks)];
        count(t2.pool, ids.every(fit), () => `${g.key}: ${sd.team} credited ${ids.filter(id => !fit(id)).join(', ')}`);
        unclaimed += sd.unclaimed;
        if (!regular) continue;
        unclaimedBy[sd.team] = (unclaimedBy[sd.team] ?? 0) + sd.unclaimed;
        /* the club's regular season as the games told it, for the card's kicks reader (section 2, control kickswap) */
        const told = (seasonKicks[sd.team] ??= { td: 0, fg: 0, sf: 0 });
        told.td += sd.tds; told.fg += sd.fgs; told.sf += sd.safeties;
        /* section 4: the WR1 of the club at this game, the first healthy receiver on its chart */
        const wr1 = E.depthOrder(team, 'WR').find(p => p.out === 0);
        const passes = sd.credits.filter(cr => cr.passer);
        if (wr1) r4.dist[wr1.ovr] = (r4.dist[wr1.ovr] ?? 0) + 1;
        const band = wr1 && wr1.ovr >= HIGH_4 ? r4.hi : wr1 && wr1.ovr <= LOW_4 ? r4.lo : null;
        /* blind: the WR1 catches a credit blind to rating and slot would give him, one in k of the eligible receivers */
        const eligible = sd.pool.skill.filter(p => M.stats.nflCatchWeight(p) > 0).length;
        const inPool = wr1 && sd.pool.skill.some(p => p.id === wr1.id);
        if (band && inPool) { band.games += 1; band.pass += passes.length; band.blind += passes.length / eligible; band.wr1 += passes.filter(cr => cr.scorer.id === wr1.id).length; }
        if (sd.pool.qb) {
          const b = Math.floor(sd.pool.qb.ovr / 5) * 5; const q = (r4.qb[b] ??= { pass: 0, all: 0 }); q.pass += passes.length; q.all += sd.credits.length;
          /* the asserted pass rule: one point a credited touchdown, 1 a pass and 0 a run, against his QB1's rating */
          for (const cr of sd.credits) addFit(r4.passFit, sd.pool.qb.ovr, cr.passer ? 1 : 0);
        }
        const rushers = sd.pool.def.filter(p => p.pos === 'DL' || p.pos === 'LB');
        const line = E.unitStarters(lg.teams[other.team], ['OL'], E.OL_SLOTS);
        const avg = (xs, none) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : none);
        const edge = avg(rushers.map(p => p.ovr), 60) - avg(line.map(p => p.ovr), 64);
        const gap = Math.round(edge / 5) * 5;
        const k = (r4.sack[gap] ??= { games: 0, sacks: 0 }); k.games += 1; k.sacks += Object.values(sd.sacks).reduce((a, b) => a + b, 0);
        /* the asserted sack rule: the sacks this side landed in the game against its rush less the other side's block */
        addFit(r4.sackFit, edge, sd.sackTries);
      }
    };
    for (const kind of FLEET.kinds) {
      for (let i = 0; i < PER_KIND; i += 1) {
        const A = openFleetSeason(set, kind, i);
        const unclaimedBy = {};
        let pending = null;
        seasonPools = {};
        seasonKicks = {};
        const his = [];
        const a = boardSeason(A, true, {
          onWeek: (lg, told, week) => {
            if (SECTIONS.includes(2) || SECTIONS.includes(4) || SECTIONS.includes(7)) for (const g of told) identity(lg, g, true, unclaimedBy);
            his.push(...told.filter(g => g.home === A.user || g.away === A.user));
            /* section 3: the same week recorded on a copy through JSON must give the block the board's record gives */
            if (SECTIONS.includes(3) && (week === 1 || week === 9)) {
              const copy = JSON.parse(JSON.stringify(lg));
              S.nflRecordWeek(copy, told, A.user);
              pending = JSON.stringify(copy.stats);
            }
          },
          onRecorded: (lg, _t, week) => { if (pending !== null) { count(t3.twice, JSON.stringify(lg.stats) === pending, () => `${seasonId(set, kind, i)} week ${week}`); pending = null; } },
          onPlayoff: (lg, g) => { if (SECTIONS.includes(2)) identity(lg, g, false, {}); if (g.home === A.user || g.away === A.user) his.push(g); },
        });
        if (SECTIONS.includes(2)) {
          const st = M.stats.nflFoStats(A.lg.stats);
          for (const team of Object.keys(A.lg.teams)) {
            const ls = Object.values(st.lines).filter(l => l.team === team);
            const sum = col => ls.reduce((x, l) => x + (l.tot[col] ?? 0), 0);
            const [td, fg, sf] = st.club[team];
            count(t2.thrown, sum('ptd') === sum('ctd'), () => `${seasonId(set, kind, i)} ${team}: thrown ${sum('ptd')}, caught ${sum('ctd')}`);
            count(t2.club, sum('rtd') + sum('ctd') + (unclaimedBy[team] ?? 0) === td, () => `${seasonId(set, kind, i)} ${team}`);
            const pts = st.teams[team].pts;
            count(t2.bounds, 6 * td + 3 * fg + 2 * sf <= pts && pts <= 8 * td + 3 * fg + 2 * sf && st.teams[team].g === E.REGULAR_WEEKS, () => `${seasonId(set, kind, i)} ${team}`);
            /* the card's sentence reads nflClubKicks: its three counts must be the ones the games told, not the block's */
            const read = M.view.nflClubKicks(A.lg, team);
            const told = seasonKicks[team];
            count(t2.view, !!read && !!told && read.td === told.td && read.fg === told.fg && read.sf === told.sf, () => `${seasonId(set, kind, i)} ${team}: the card read ${JSON.stringify(read)}, the games told ${JSON.stringify(told)}`);
          }
        }
        if (SECTIONS.includes(7)) {
          /* the board's save: the league (block and history in it), his club and the season's log of his games */
          sizes.saves.push(pinEpoch(JSON.stringify({ league: A.lg, myTeam: A.user, phase: 'recap', gameLog: { v: 1, season: A.lg.season, team: A.user, games: his } })).length);
          sizes.blocks.push(pinEpoch(JSON.stringify(A.lg.stats)).length);
          const bare = JSON.parse(JSON.stringify(A.lg));
          delete bare.stats;
          delete bare.awards;
          for (const p of S.nflEveryMan(bare).flat()) { delete p.awards; delete p.rookieSeason; }
          sizes.bases.push(pinEpoch(JSON.stringify({ league: bare, myTeam: A.user, phase: 'recap', gameLog: { v: 1, season: A.lg.season, team: A.user, games: his } })).length);
          const ls = Object.values(M.stats.nflFoStats(A.lg.stats).lines);
          sizes.lines.push(ls.length);
          sizes.statLines.push(ls.filter(l => Object.values(l.tot).some(v => v > 0)).length);
          for (const l of ls) count(sizes.pool, !!seasonPools[l.team] && seasonPools[l.team].has(l.id), () => `${seasonId(set, kind, i)}: ${l.team} ${l.name} (${l.pos})`);
        }
        if (SECTIONS.includes(3)) {
          const Bs = openFleetSeason(set, kind, i);
          const b = boardSeason(Bs, false);
          const id = seasonId(set, kind, i);
          count(t3.w17, a.week17 === b.week17, () => `${id}: ${a.week17} against ${b.week17}`);
          count(t3.after, a.after === b.after, () => id);
          count(t3.results, a.winners === b.winners && a.hurt === b.hurt && a.moves === b.moves && a.records === b.records && a.champion === b.champion && a.rounds === b.rounds, () => id);
          count(t3.league, stripped(A.lg) === stripped(Bs.lg), () => id);
        }
      }
    }
    if (SECTIONS.includes(2)) {
      console.log('');
      console.log(`2. IDENTITIES, set ${set} (${gamesSeen} told games)`);
      settle(2, `set ${set}: credited and unclaimed touchdowns are the story's, side by side`, t2.td);
      settle(2, `set ${set}: field goals and safeties are the story's`, t2.kicks);
      settle(2, `set ${set}: each side's drive counts are the cheapest list of its score, by the harness's own copy of the rule`, t2.cheap);
      settle(2, `set ${set}: every credited man is a healthy starter of his club at the game, never a lineman`, t2.pool);
      settle(2, `set ${set}: per club and season, thrown equals caught`, t2.thrown);
      settle(2, `set ${set}: per club and season, run and caught touchdowns plus unclaimed are the club line's`, t2.club);
      settle(2, `set ${set}: per club and season, the told points sit between six and eight a touchdown plus the kicks, over 17 games`, t2.bounds);
      settle(2, `set ${set}: per club and season, the card's kicks reader gives the touchdowns, field goals and safeties the games told`, t2.view);
      check(2, `set ${set}: no touchdown went unclaimed on the fleet (${unclaimed})`, unclaimed === 0);
    }
    if (SECTIONS.includes(3)) {
      console.log('');
      console.log(`3. DETERMINISM, set ${set}`);
      settle(3, `set ${set}: the same generator state and draw count after Week 17, recording or not`, t3.w17);
      settle(3, `set ${set}: the same generator state and draw count after the postseason and the close`, t3.after);
      settle(3, `set ${set}: the same winners, injuries, computer moves, records, bracket and champion`, t3.results);
      settle(3, `set ${set}: the same league once the new keys are taken out`, t3.league);
      settle(3, `set ${set}: the same week recorded twice gives the same block, once through JSON`, t3.twice);
      /* Round 1566's closing check: the same deep season played the board's way in two fresh loads (LOADS), the
         helpers reading the load's engine for the length of the play */
      const inLoad = (L, fn) => { const keep = M; M = L; try { return fn(); } finally { M = keep; } };
      const TOKEN = '~'.repeat(14);
      const [x, y] = LOADS.map(L => inLoad(L, () => {
        const q = L.makeIdMinter('q')();
        const ep = q.slice(1, q.lastIndexOf('-'));
        const s = openFleetSeason(set, 'deep', 0);
        boardSeason(s, true);
        const raw = JSON.stringify(s.lg);
        return { ep, raw: raw.length, text: raw.split(`${ep}-`).join(`${TOKEN}-`), ids: raw.split(`${ep}-`).length - 1 };
      }));
      const tl = tally();
      count(tl, x.text === y.text, () => `${seasonId(set, 'deep', 0)}: ${x.text.length} and ${y.text.length} characters with the epoch swapped`);
      settle(3, `set ${set}: between two page loads (two fresh loads of the engine, each its own id epoch) a deep season played the board's way is the same league but for the epoch`, tl);
      console.log(`  set ${set}: two page loads, ids as minted: epochs of ${x.ep.length} and ${y.ep.length} characters, the league ${x.raw} and ${y.raw} characters; ${x.ids} ids in it, so each character of epoch (2 to 14 a load) moves it by ${x.ids}`);
    }
    if (SECTIONS.includes(4)) {
      const share = b => (b.pass ? b.wr1 / b.pass : 0);
      /* the lift: his catches over what a rating blind credit gives him in the same games; 1 is no rating effect */
      const lift = b => (b.blind ? b.wr1 / b.blind : 0);
      const gap = lift(r4.hi) - lift(r4.lo);
      measured4.push({ set, gap, hi: r4.hi, lo: r4.lo, qb: r4.qb, sack: r4.sack });
      console.log('');
      console.log(`4. THE RATING EFFECT, set ${set}: WR1 ${HIGH_4} and up ${r4.hi.games} club games, ${r4.hi.pass} touchdown passes, ${r4.hi.wr1} his (${share(r4.hi).toFixed(3)}); WR1 ${LOW_4} and under ${r4.lo.games} club games, ${r4.lo.pass} passes, ${r4.lo.wr1} his (${share(r4.lo).toFixed(3)})`);
      console.log(`  receiving touchdowns a game for the WR1 (printed, not asserted): ${HIGH_4} and up ${(r4.hi.wr1 / Math.max(1, r4.hi.games)).toFixed(3)}, ${LOW_4} and under ${(r4.lo.wr1 / Math.max(1, r4.lo.games)).toFixed(3)}`);
      console.log(`  the lift (his catches over a rating blind credit's): ${HIGH_4} and up ${lift(r4.hi).toFixed(3)}, ${LOW_4} and under ${lift(r4.lo).toFixed(3)}`);
      check(4, `set ${set}: the WR1's lift over a rating blind credit climbs with his rating (gap ${gap.toFixed(4)}, margin ${MARGIN_4})`, gap > MARGIN_4);
      check(4, `set ${set}: the low band holds 500 club games or more (${r4.lo.games})`, r4.lo.games >= 500);
      const ps = slopeOf(r4.passFit), ss = slopeOf(r4.sackFit);
      measured4[measured4.length - 1].passSlope = ps.b;
      measured4[measured4.length - 1].sackSlope = ss.b;
      console.log(`  pass share a point of QB1 rating ${ps.b.toFixed(5)} (se ${ps.se.toFixed(5)}, ${r4.passFit.n} credited touchdowns); sacks a club game a point of rush less block ${ss.b.toFixed(4)} (se ${ss.se.toFixed(4)}, ${r4.sackFit.n} club games)`);
      check(4, `set ${set}: the pass share climbs with the QB1's rating (slope ${ps.b.toFixed(5)}, margin ${PASS_MARGIN_4})`, ps.b > PASS_MARGIN_4);
      check(4, `set ${set}: the sacks climb with the rush against the block (slope ${ss.b.toFixed(4)}, margin ${SACK_MARGIN_4})`, ss.b > SACK_MARGIN_4);
      console.log(`  WR1 ratings over the club games (printed): ${Object.keys(r4.dist).map(Number).sort((x, y) => x - y).map(k => `${k}: ${r4.dist[k]}`).join(", ")}`);
    }
  }
  if (measured4.length) {
    const qb = {};
    const sk = {};
    for (const m of measured4) {
      for (const [b, v] of Object.entries(m.qb)) { const q = (qb[b] ??= { pass: 0, all: 0 }); q.pass += v.pass; q.all += v.all; }
      for (const [b, v] of Object.entries(m.sack)) { const q = (sk[b] ??= { games: 0, sacks: 0 }); q.games += v.games; q.sacks += v.sacks; }
    }
    console.log(`  pass share of credited touchdowns by QB1 rating (printed): ${Object.keys(qb).map(Number).sort((x, y) => x - y).map(b => `${b}: ${(qb[b].pass / Math.max(1, qb[b].all)).toFixed(3)} of ${qb[b].all}`).join(' | ')}`);
    console.log(`  sacks a club game by rush less block, to the nearest 5 (printed): ${Object.keys(sk).map(Number).sort((x, y) => x - y).map(b => `${b}: ${(sk[b].sacks / sk[b].games).toFixed(2)} over ${sk[b].games}`).join(' | ')}`);
    console.log(`  gaps by set: ${measured4.map(m => `${m.set} ${m.gap.toFixed(4)}`).join(', ')}`);
    console.log(`  pass slopes by set: ${measured4.map(m => `${m.set} ${m.passSlope.toFixed(5)}`).join(', ')}`);
    console.log(`  sack slopes by set: ${measured4.map(m => `${m.set} ${m.sackSlope.toFixed(4)}`).join(', ')}`);
  }
}

/* ─── 7. SIZE: the save budget is simNflFullRosters.mjs's, read by its anchor ─── */
const BUDGET_FILE = 'scripts/simNflFullRosters.mjs';
const BUDGET_ANCHOR = /stats\.maxSave <= (\d+) \* 1024/;
if (SECTIONS.includes(7)) {
  console.log('');
  console.log('7. SIZE');
  const m = readSrc(BUDGET_FILE).match(BUDGET_ANCHOR);
  check(7, `the save budget is read from ${BUDGET_FILE} by its anchor`, !!m);
  const budget = m ? Number(m[1]) * 1024 : 0;
  const sorted = xs => [...xs].sort((a, b) => a - b);
  const med = xs => sorted(xs)[Math.floor(xs.length / 2)];
  const k = n => `${(n / 1024).toFixed(1)}K`;
  const maxSave = Math.max(...sizes.saves);
  console.log(`  over ${sizes.saves.length} seasons, ids at the longest epoch: the save median ${k(med(sizes.saves))} (${med(sizes.saves)} characters), the biggest ${k(maxSave)} (${maxSave}), the block median ${k(med(sizes.blocks))} and largest ${k(Math.max(...sizes.blocks))}`);
  console.log(`  lines a season: the pool's ${Math.min(...sizes.lines)} to ${Math.max(...sizes.lines)} (median ${med(sizes.lines)}); men with a stat only ${Math.min(...sizes.statLines)} to ${Math.max(...sizes.statLines)} (median ${med(sizes.statLines)})`);
  check(7, `the biggest save with lines, ${k(maxSave)}, is inside the NFL save budget of ${k(budget)}`, sizes.saves.length > 0 && maxSave <= budget);
  /* THE BRIEF'S STOP LINE (600K) WAS PASSED BEFORE THIS ROUND: a deep league opens at about 620K of its own (every
     man carries his opening rating evidence since a later round of the roster), so it is printed with the save
     without this round's keys beside it, never asserted here; the lead rules on the budget. */
  const maxBase = Math.max(...sizes.bases);
  console.log(`  LEAD: the brief's stop line is 600K. The biggest save WITHOUT this round's keys is ${k(maxBase)} on its own; with the block and the history it is ${k(maxSave)}, ${k(maxSave - maxBase)} more`);
  settle(7, 'every line is a man who was in his club\'s pool in a game of the season, never the line, the bench or the practice squad', sizes.pool);
}

/* ─── 6. OLD SAVE: a league with no lines in the middle of its season ─── */
if (SECTIONS.includes(6)) {
  const E = M.engine, S = M.stats, B = M.bind;
  console.log('');
  console.log('6. OLD SAVE');
  const t6 = { quiet: tally(), opens: tally() };
  for (let f = 0; f < 3; f += 1) {
    const gen = seededGen(`nfl season stats old save|${f}`);
    const user = M.FO_TEAMS[(f * 9 + 4) % M.FO_TEAMS.length].abbr;
    const lg = seeded(gen, () => {
      const league = E.initLeague(Math.random, { depth: M.FO_DEPTH, userTeam: user });
      if (E.deepOverLimit(league.teams[user]) > 0) E.cutDownToMax(league.teams[user], league.freeAgents);
      for (let w = 1; w <= 4; w += 1) {
        E.injuryPass(league.teams, Math.random);
        E.aiWeeklyMoves(league, user, Math.random);
        const games = league.schedule[league.week - 1].map(g => E.simGame(g, league.teams, Math.random));
        S.nflRecordWeek(league, games.map(g => B.nflTell(g, league.teams, league.season, B.nflWhere(league.week)).last).filter(Boolean), user);
        league.week += 1;
      }
      return league;
    });
    /* a save from before this round, at Week 5 */
    delete lg.stats;
    delete lg.awards;
    const s = { lg, user, gen };
    const id = `old save ${f}`;
    let res = null;
    let threw = '';
    try { res = boardSeason(s, true); } catch (e) { threw = e.message; }
    count(t6.quiet, !threw && res && res.closed === null && lg.stats === undefined && lg.awards === undefined, () => `${id}: ${threw || `a block of ${lg.stats?.season}, ${(lg.awards ?? []).length} awards`}`);
    boardDraft(s);
    const next = boardSeason(s, true);
    count(t6.opens, !!next.closed && !!next.closed.mvp && lg.stats.season === lg.season && lg.awards.length === 1, () => id);
  }
  settle(6, 'a save from before season lines plays from Week 5 to its close recording nothing and throwing nothing', t6.quiet);
  settle(6, 'its next Week 1 opens the lines, and that season closes with awards', t6.opens);
}

/* ─── 5. AWARDS AND THE CLOSE: deep franchises over several seasons, the board's way, the draft and the summer in ─── */
const FRANCHISES = Number(process.env.NFL_STATS_FRANCHISES || 10);
const YEARS = 4;
/** THE HARNESS'S OWN COPY of the three award rules (src/lib/nflSeasonStats.ts header), over a block's lines, with
 *  `rookies` the ids of the first year men the harness itself drafted. Ties: more games, then the id. */
function ownAwards(stats, rookies) {
  const men = new Map();
  for (const l of Object.values(stats.lines)) {
    if (l.g <= 0) continue;
    const m = men.get(l.id) ?? { id: l.id, g: 0, tot: {}, clubs: [] };
    m.g += l.g;
    m.clubs.push([l.team, l.g]);
    for (const [k, v] of Object.entries(l.tot)) m.tot[k] = (m.tot[k] ?? 0) + v;
    men.set(l.id, m);
  }
  const all = [...men.values()].map(m => ({ ...m, team: [...m.clubs].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] }));
  const td = m => (m.tot.ptd ?? 0) + (m.tot.rtd ?? 0) + (m.tot.ctd ?? 0);
  const share = t => (stats.teams[t] && stats.teams[t].g ? stats.teams[t].w / stats.teams[t].g : 0);
  const best = (pool, score) => {
    let top = null;
    for (const m of pool) {
      const s = Math.round(score(m) * 1000) / 1000;
      if (!top || s > top.s || (s === top.s && (m.g > top.m.g || (m.g === top.m.g && m.id.localeCompare(top.m.id) < 0)))) top = { m, s };
    }
    return top ? top.m.id : null;
  };
  const kids = all.filter(m => rookies.has(m.id));
  return {
    mvp: best(all, m => td(m) + (m.tot.sk ?? 0) / 2 + 10 * share(m.team)),
    oroy: best(kids.filter(m => td(m) > 0), td),
    droy: best(kids.filter(m => (m.tot.sk ?? 0) > 0), m => m.tot.sk ?? 0),
  };
}
/** Every man's cards, by id, wherever he is. */
const cardsOf = lg => JSON.stringify(M.stats.nflEveryMan(lg).flat().filter(p => p.awards).map(p => [p.id, p.awards]).sort());
/** The draft the board's way at a close: his picks the top graded prospect each, a computer batch after each of
 *  them and the rest after his last (draftProspect), every man drafted stamped for next season (nflMarkRookies), then
 *  the summer (finishDraft: runOffseason). Returns the ids of the men drafted: the harness's own record, read off the
 *  rosters before and after each pick, never off the stamp. */
function boardDraft(s) {
  const E = M.engine, S = M.stats;
  const { lg, user, gen } = s;
  return seeded(gen, () => {
    const ids = new Set();
    const before = () => new Set(Object.values(lg.teams).flatMap(t => t.players.map(p => p.id)));
    const note = was => { for (const t of Object.values(lg.teams)) for (const p of t.players) if (!was.has(p.id)) ids.add(p.id); };
    const mine = lg.teams[user].picks.length;
    const batches = Math.max(3, mine);
    const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== user).reduce((a, t) => a + t.picks.length, 0);
    let cls = E.generateDraftClass(Math.random, Math.max(40, mine + Math.min(rivalCapital, batches * 6)), M.leagueNames(lg));
    let left = batches;
    for (let k = 0; k < mine; k += 1) {
      const pr = [...cls].sort((a, b) => b.grade - a.grade)[0];
      if (!pr || !E.consumeDraftPick(lg.teams[user])) break;
      const was = before();
      const pl = E.prospectToPlayer(pr, Math.random);
      if (pl) lg.teams[user].players.push(pl);
      S.nflMarkRookies(lg, [{ team: user, playerName: pr.name }], lg.season + 1);
      cls = cls.filter(p => p.id !== pr.id);
      const last = k === mine - 1;
      const n = last ? left : Math.min(1, left);
      for (let b = 0; b < n; b += 1) {
        const r = E.nflAiDraftPicks(lg, cls, user, Math.random);
        cls = r.remaining;
        S.nflMarkRookies(lg, r.picks, lg.season + 1);
      }
      left -= n;
      note(was);
    }
    E.runOffseason(lg, Math.random, user);
    if (E.deepOverLimit(lg.teams[user]) > 0) E.cutDownToMax(lg.teams[user], lg.freeAgents);
    return ids;
  });
}

if (SECTIONS.includes(5)) {
  const E = M.engine, S = M.stats;
  console.log('');
  console.log(`5. AWARDS AND THE CLOSE (${FRANCHISES} deep franchises, ${YEARS} seasons each)`);
  const t5 = { rule: tally(), rookies: tally(), later: tally(), twice: tally(), cards: tally(), history: tally(), opened: tally(), survive: tally() };
  const tell = { seasons: 0, oroy: 0, droy: 0, mvpPos: {}, rookieLines: [] };
  for (let f = 0; f < FRANCHISES; f += 1) {
    const gen = seededGen(`nfl season stats franchise|${f}`);
    const user = M.FO_TEAMS[(f * 5 + 2) % M.FO_TEAMS.length].abbr;
    const lg = seeded(gen, () => {
      const league = E.initLeague(Math.random, { depth: M.FO_DEPTH, userTeam: user });
      if (E.deepOverLimit(league.teams[user]) > 0) E.cutDownToMax(league.teams[user], league.freeAgents);
      return league;
    });
    const s = { lg, user, gen };
    let drafted = new Set();
    for (let y = 0; y < YEARS; y += 1) {
      const id = `franchise ${f} season ${lg.season}`;
      const historyBefore = (lg.awards ?? []).length;
      const res = boardSeason(s, true, { onRecorded: (l, _t, week) => { if (week === 1) count(t5.opened, l.stats && l.stats.season === l.season && Object.keys(l.stats.lines).length > 0 && (l.awards ?? []).length === historyBefore, () => id); } });
      const closed = res.closed;
      const fo = S.nflFoStats(lg.stats);
      const own = ownAwards(fo, drafted);
      count(t5.rule, !!closed && (closed.mvp?.id ?? null) === own.mvp && (closed.oroy?.id ?? null) === own.oroy && (closed.droy?.id ?? null) === own.droy, () => `${id}: the lib ${closed?.mvp?.id}/${closed?.oroy?.id}/${closed?.droy?.id}, the harness ${own.mvp}/${own.oroy}/${own.droy}`);
      const flagged = new Set(Object.values(fo.lines).filter(l => l.rookie).map(l => l.id));
      const playedKids = new Set(Object.values(fo.lines).filter(l => drafted.has(l.id)).map(l => l.id));
      count(t5.rookies, [...flagged].every(x => drafted.has(x)) && [...playedKids].every(x => flagged.has(x)) && closed.rookies === (y > 0), () => `${id}: ${flagged.size} flagged, ${playedKids.size} of the harness's draftees played`);
      if (y > 0) count(t5.later, playedKids.size > 0, () => id);
      tell.rookieLines.push(playedKids.size);
      const cards = cardsOf(lg);
      count(t5.twice, S.nflCloseSeasonStats(lg) === closed && cardsOf(lg) === cards && lg.awards.length === historyBefore + 1, () => id);
      count(t5.history, lg.awards.length === Math.min(y + 1, 40) && lg.awards[lg.awards.length - 1].season === lg.season, () => id);
      const winners = S.nflAwardList(closed).map(([k, m]) => [m.id, `${closed.season} ${S.NFL_AWARD_LABEL[k]}`]);
      const man = x => M.stats.nflEveryMan(lg).flat().find(p => p.id === x);
      count(t5.cards, winners.every(([x, label]) => !man(x) || (man(x).awards ?? []).filter(a => a === label).length === 1), () => id);
      tell.seasons += 1;
      if (closed.oroy) tell.oroy += 1;
      if (closed.droy) tell.droy += 1;
      if (closed.mvp) tell.mvpPos[closed.mvp.pos] = (tell.mvpPos[closed.mvp.pos] ?? 0) + 1;
      drafted = boardDraft(s);
      /* a winner's card and a draftee's first year survive the summer, the trades and the free agent pool, by id */
      count(t5.survive, winners.every(([x, label]) => !man(x) || (man(x).awards ?? []).includes(label)) && [...drafted].every(x => !man(x) || man(x).rookieSeason === lg.season), () => `${id} into ${lg.season}`);
    }
  }
  settle(5, "the lib names the same three men as the harness's own copy of the rules, its rookies the harness's own draftees", t5.rule);
  settle(5, 'the rookie lines are the first year men the harness drafted, every one that played, and no class in a first season', t5.rookies);
  settle(5, 'first year men recorded lines in every season after a franchise\'s first', t5.later);
  settle(5, 'a second close returns the same awards and a second close writes no card twice', t5.twice);
  settle(5, 'the history grows by one a season', t5.history);
  settle(5, "every winner's card carries his award once", t5.cards);
  settle(5, "Week 1 opens a clean block for the season and keeps the history", t5.opened);
  settle(5, "a winner's card and a draftee's first year survive the summer, by id", t5.survive);
  /* the tie fixture: the man who should LOSE each tie is listed first, so a sort with no tie rule names him */
  const fx = (ls, clubs) => {
    const st = S.nflNewStats(2030);
    for (const l of ls) (st.lines[l[0]] ??= {})[l[1]] = [l[1], 'QB', l[2], l[3].ptd ?? 0, l[3].rtd ?? 0, l[3].ctd ?? 0, l[3].sk ?? 0];
    for (const [t, w, g] of clubs) st.clubs[t] = [g, w, 0, 0, 0, 0, 0];
    return { season: 2030, stats: st, teams: {}, freeAgents: [] };
  };
  const byGames = S.nflSeasonAwards(fx([['AAA', 'm1', 16, { ptd: 12 }], ['AAA', 'm2', 17, { ptd: 12 }]], [['AAA', 9, 17]]));
  const byId = S.nflSeasonAwards(fx([['AAA', 'z9', 17, { ptd: 12 }], ['AAA', 'a1', 17, { ptd: 12 }]], [['AAA', 9, 17]]));
  check(5, `a tie goes to more games, then the id (${byGames?.mvp?.id}, ${byId?.mvp?.id})`, byGames?.mvp?.id === 'm2' && byId?.mvp?.id === 'a1');
  console.log(`  seasons ${tell.seasons}: an Offensive Rookie of the Year named in ${tell.oroy}, a Defensive in ${tell.droy}; the MVP by position ${JSON.stringify(tell.mvpPos)}; first year men with lines a season ${tell.rookieLines.join(',')}`);
}

/* ─── 8. COPY AND PURITY ─── */
/** Code with its comments taken out, so a guard reads the code and never the prose that explains it. */
const codeOf = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const SPEECH = /\b(said|says|saying|insisted|insists|claimed|claims|admitted|admits|replied|replies|shouted|whispered|declared|tells reporters|told reporters)\b/i;
const QUOTES = /["“”]/;
if (SECTIONS.includes(8)) {
  const S = M.stats;
  console.log('');
  console.log('8. COPY AND PURITY');
  for (const rel of [STATS, AWARDS, DRIVES, CLOSE]) {
    const code = codeOf(readSrc(rel));
    check(8, `${rel} holds no Math.random, no Date and no localStorage, comments taken out`, !/Math\.random|\bDate\b|localStorage/.test(code));
  }
  /* the anchors the guard reads exist in the files it guards, so it is not green for want of a target */
  check(8, 'the comment stripper keeps the code: the credit stream is still in the stripped lib', codeOf(readSrc(STATS)).includes('`${told.key}|credit`'));
  const words = [...S.nflStatsHelp(), ...Object.values(S.NFL_AWARD_LABEL), ...Object.values(S.NFL_AWARD_RULE)];
  const bad = words.filter(w => QUOTES.test(w) || SPEECH.test(w));
  check(8, `every sentence the lib builds has no quotation mark and no verb of speech (${words.length} read)`, bad.length === 0, bad[0] ?? '');
  check(8, "the page's rules say the numbers are this save's sim season", S.nflStatsHelp().some(w => w.includes("this save's sim season")));
  /* the card's words (the view lib rides with the card): its note is the NBA's with NFL in its place, read off the NBA
     board's source; every other line it builds for a fixture season has no quotation mark and no verb of speech */
  const V = M.view;
  const nba = readSrc('src/components/nba-front-office/NbaFrontOfficeBoard.tsx').match(/const SIM_NOTE = "([^"]+)";/);
  check(8, 'the card\'s sim note is the NBA card\'s with NFL in its place', !!nba && V.NFL_SIM_NOTE === nba[1].replace('NBA', 'NFL'), nba ? nba[1] : 'the NBA note was not found');
  const pick = { id: 'p1', name: 'A Man', team: 'AAA', pos: 'QB', g: 17, ptd: 31, rtd: 3, ctd: 0, sk: 0 };
  const fixture = { season: 2027, awards: [{ season: 2027, mvp: pick, oroy: null, droy: { ...pick, pos: 'DL', ptd: 0, rtd: 0, sk: 9 }, rookies: true }], champions: [{ season: 2027, team: 'AAA' }] };
  const cardWords = [
    V.NFL_SIM_NOTE, V.NFL_EMPTY_AWARDS, V.NFL_NO_CLASS, V.NFL_NO_ROOKIES, V.NFL_HISTORY_GAP, V.NFL_SAT_OUT, ...V.NFL_STAT_HEADS, ...V.NFL_LEADER_TABLES.map(t => t[0]),
    V.nflAwardDetail(pick), ...V.nflAwardBoxes(fixture.awards[0], 'AAA').flatMap(b => [b.label, b.rule, ...b.winners.map(w => w.detail)]),
    ...V.nflHistoryRows(fixture, 'AAA').rows.map(r => r.text),
    /* a season sat out between two lined ones has a row of its own */
    ...V.nflHistoryRows({ awards: [...fixture.awards, { ...fixture.awards[0], season: 2029 }], champions: [...fixture.champions, { season: 2028, team: 'BBB' }, { season: 2029, team: 'AAA' }] }, 'AAA').rows.map(r => r.text),
  ];
  const badCard = cardWords.filter(w => QUOTES.test(w) || SPEECH.test(w));
  check(8, `every line the card builds has no quotation mark and no verb of speech (${cardWords.length} read)`, badCard.length === 0, badCard[0] ?? '');
  check(8, `an award winner's line reads as the NBA's does: "${V.nflAwardDetail(pick)}"`, V.nflAwardDetail(pick) === '31 TD thrown, 3 run in');
  /* where the NBA puts the marker, the NFL does: the badge, the history and the feed line, read off the code */
  const badge = codeOf(readSrc('src/components/front-office-shared/FoAwardBadge.tsx'));
  const hist = codeOf(readSrc('src/components/front-office-shared/FoAwardHistory.tsx'));
  const board = codeOf(readSrc('src/components/front-office/FrontOfficeBoard.tsx'));
  check(8, 'the badge says Sim on every award and its title says they are this save\'s sim awards', badge.includes('`Sim ${a}`') && badge.includes("This save's sim awards, not real ${league} ones"));
  check(8, 'the history says its seasons are sim seasons', hist.includes('Sim seasons, not real ${league} history.'));
  check(8, "the feed line names the award in this save's season", board.includes("in this save's ${closedStats.season} season."));
  /* the tile's list: a marked heading of its own (a real man beside one game's scoring play), and the law's credit
     words for a pass and a run have no quotation mark and no verb of speech */
  const card = codeOf(readSrc('src/components/front-office-shared/GmGameDayCard.tsx'));
  check(8, "the tile's Touchdowns list has a heading that says it is this save's game", card.includes("Touchdowns in this save's game"));
  const credit = [M.NFL_GAME_DAY.creditWords('A Passer', 'A Catcher'), M.NFL_GAME_DAY.creditWords(null, 'A Back')];
  check(8, `the tile's credit words have no quotation mark and no verb of speech (${credit.join(' / ')})`, credit.every(w => !QUOTES.test(w) && !SPEECH.test(w)) && credit[0] === 'A Passer to A Catcher' && credit[1] === 'A Back runs it in');
}

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
const tail = `${liftNote ? `; ${liftNote}` : ''}`;
console.log('');
console.log(`ran in ${((Date.now() - t0) / 1000).toFixed(1)} s, seed sets ${SEEDSETS.join(', ')}, sections ${SECTIONS.join(', ')}`);
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const mine = failsBy.get(String(c.section)) ?? [];
  const named = c.labels.filter(l => mine.some(x => x.includes(l)));
  const setsRed = c.everySet ? SEEDSETS.filter(s => c.labels.every(l => mine.some(x => x.includes(l) && x.startsWith(`set ${s}:`)))) : SEEDSETS;
  const bled = [...failsBy.keys()].filter(k => k !== String(c.section) && !(c.elsewhere ?? []).includes(Number(k)));
  const ok = named.length === c.labels.length && setsRed.length === SEEDSETS.length && bled.length === 0;
  console.log(ok
    ? `control ${CONTROL}: FIRED at section ${c.section} (${named.length} of ${c.labels.length} named checks red${c.everySet ? ` on ${setsRed.length} of ${SEEDSETS.length} sets` : ""})`
    : `control ${CONTROL}: DID NOT FIRE as aimed (${named.length} of ${c.labels.length} named checks, red on ${setsRed.length} of ${SEEDSETS.length} sets, other sections red: ${bled.join(', ') || 'none'})`);
  console.log(`simNflSeasonStats: ${checks} checks, ${failed} failed (control ${CONTROL})${tail}`);
  process.exit(ok ? 1 : 3);
}
console.log(`simNflSeasonStats: ${checks} checks, ${failed} failed${tail}`);
process.exit(failed ? 1 : 0);

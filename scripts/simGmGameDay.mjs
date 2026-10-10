/* Round 1224 harness: Game Day and a bracket you play, the shared libraries
 * for the front offices, before any board mounts them.
 *
 * The libraries: src/lib/gmGameScore.ts (a score for a game an engine has
 * decided: the quick path), src/lib/gmGameDay.ts (the story of that final:
 * the told path, and the one save field), src/lib/gmBracket.ts (a postseason
 * as a saved state machine over src/lib/finalsBracket.ts), with the NFL's law
 * and data (src/lib/gameLaws/nflScore.ts, nfl.ts and nflGameDay.ts,
 * src/data/gmBrackets/nfl.ts).
 *
 * THE FLEET (scripts/lib/gmGameDayFleet.mjs): seed sets 0 to 4, each 40
 * seasons on each of the two leagues the engine makes (fifteen man, and full
 * rosters), played by the UNTOUCHED engine the way the board plays a week,
 * with the seeded generator installed AS Math.random. 80 seasons a set are
 * 21,760 season games and 1,040 playoff games.
 *
 * Sections (each number is a count over one seed set unless it says so):
 *  1 ONE LAW, TWO PATHS. For every game of the fleet, with the chance from the
 *    engine's own winProb: the quick path's final never names another winner
 *    and is never level, and the told path tells exactly that final. Printed,
 *    not asserted: the tries by decile of the chance. The swapped share (no
 *    try in 24 gave the engine's winner) sits under a band (see MEASURED).
 *  2 EVERY STORY ADDS UP, by a checker written here that calls neither the
 *    library's sums nor the law: finals, quarters, what each play is worth by
 *    the two sourced ledger (6, 7 or 8, 3, 2), whole minutes from 1 to 60 that
 *    no two lines share, and the deciding plays and the shape by the rule.
 *  3 THE TOLD SCORES ARE THE LAW'S SCORES: against a baseline drawn in the
 *    same run (the same law, free, at the same chance), four statistics sit
 *    inside two sided bands (see MEASURED).
 *  4 THE BRACKET IS THE ENGINE'S POSTSEASON. Played by the machine with the
 *    engine's own game function and one generator, all at once and a round a
 *    press with the save through JSON between presses, it gives the engine's
 *    thirteen games, champion, next 64 draws and records, for every season;
 *    the engine's own run is held to scripts/data/gmBracketFixture.json; the
 *    data's structure; and a doctored winner, a doctored pairing and a tie
 *    played out of turn are each named by bracketProblems.
 *  5 PURE. Telling every game of a season right after the engine plays it
 *    leaves the engine's stream, its draw count, its 272 winners and its 32
 *    records exactly where they were; the same key tells the same final and
 *    story twice and through JSON; and the round's new files hold no
 *    Math.random, no Date and no localStorage (comments stripped).
 *  6 NOBODY MOUNTS IT YET. No file under src imports the new modules but the
 *    modules themselves and their tests. The round that binds a board turns
 *    this into "the cards are lazy".
 *
 * Negative controls (GM_GAMEDAY_CONTROL=...). Each patches a string that must
 * be in its file exactly once (or the run refuses, exit 2), always exits 1
 * when its NAMED checks are among the reds, and exits 2 when they are not:
 *   winner      the winner test taken out of decidedScore            section 1
 *   twopaths    the told path keys its final differently             section 1
 *   tries       the law is asked twice, not 24 times                 section 1 (the swapped share)
 *   offbyone    a field goal told as four points                     section 2
 *   olddraw     the engine's base and margin score told instead      section 3 (losers on 15 or fewer: none)
 *   pairing     the Divisional ranks swapped in the NFL data         section 4
 *   validator   the replay check answers "no problems" at once       section 4
 *   enginedrift the engine's margin draw changed, in the engine      section 4 (the recorded fixture ALONE: the
 *               machine still agrees with the engine it is played beside, which must stay green)
 *   random      a Math.random() planted in gameStory                 section 5
 *   stream      a Math.random() planted in decidedScore              section 5
 *   unkeyed     the story's stream keyed to a counter, not the game  section 5 (twice, and through JSON)
 *   mounted     an import planted in memory in a route file          section 6
 *
 * MEASURED (2026-10-10, seed sets 0 to 4, 22,800 games a set, 114,000 in
 * all; the harness prints this table when it closes, and the runs are named
 * in docs/audits/ROUND-1224-NOTES.md):
 *   Section 3, told less free, the range over the five sets:
 *     points a team game     -0.105 to +0.069   (told 22.63 to 22.74)
 *     losers on 15 or fewer  -0.0071 to +0.0074 (told 0.423 to 0.434)
 *     shutouts               -0.0028 to +0.0013 (told 0.0129 to 0.0150)
 *     sides on 40 or more    -0.0010 to +0.0033 (told 0.0510 to 0.0538)
 *   The two samples are separate draws, so one set's difference has a
 *   standard error of about 0.066, 0.0046, 0.0011 and 0.0015. The bands
 *   (0.25, 0.02, 0.005, 0.006 either side) are about four of those and 1.8 to
 *   2.7 times the widest difference the five sets showed. Under control
 *   olddraw seed set 0 reads 27.54 against 22.64 points, 0.0000 against
 *   0.4297 losers on 15 or fewer, 0.0000 against 0.0148 shutouts and 0.0716
 *   against 0.0517 sides on 40 or more: all four far outside.
 *   Section 1, the swapped share: 0.00039 to 0.00066 a set (9 to 15 games in
 *   22,800), nearly all of them road upsets at a home chance of 0.8 or more.
 *   The band is under 0.002, three times the widest seen.
 *   Printed, never asserted: 2.0 tries a game in every decile of the chance
 *   (it is 2 by construction while the law's chance is the engine's); the
 *   shapes of the 114,000 stories (trade 0.299, wire 0.218, late 0.170, rout
 *   0.169, comeback 0.144); the AFC champion won 38, 46, 47, 43 and 47 of 80
 *   title games a set, 221 of 400 (a level one is 0.582 by the arithmetic).
 *   NOT printed beside them: the league's real figures. None was read on two
 *   sources in this round, so none is typed here.
 *
 * Nothing here reads the network or the clock.
 * Run: node scripts/simGmGameDay.mjs            (SEEDSET=2 for one seed set)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_ENTRY, FLEET, NEXT_DRAWS, ROOT, bundle, enginePostseason, gameText, playRegularSeason, readSrc, recordsOf, seasonId, seedsOf, sha1, withMathRandom } from './lib/gmGameDayFleet.mjs';

const CONTROL = process.env.GM_GAMEDAY_CONTROL || '';
const SEEDSETS = process.env.SEEDSET !== undefined && process.env.SEEDSET !== '' ? process.env.SEEDSET.split(',').map(Number) : FLEET.sets;
if (SEEDSETS.some(s => !FLEET.sets.includes(s))) { console.error(`SEEDSET must be among ${FLEET.sets.join(', ')}`); process.exit(2); }

const SCORE = 'src/lib/gmGameScore.ts';
const DAY = 'src/lib/gmGameDay.ts';
const BRACKET = 'src/lib/gmBracket.ts';
const NFL_DAY = 'src/lib/gameLaws/nflGameDay.ts';
const NFL_DATA = 'src/data/gmBrackets/nfl.ts';
const NEW_FILES = [SCORE, DAY, BRACKET, NFL_DAY, NFL_DATA];
const ROUTE_FILE = 'src/pages/FrontOffice.tsx';

/* `labels`: pieces of the check labels that must ALL be among the reds of the control's section for it to count
   as fired. `clean`: pieces that must be among no red at all (the control is aimed at one fence, not its neighbour). */
const CONTROLS = {
  winner: { section: 1, labels: ['never names another winner'], patches: [{ file: SCORE, from: 'if ((s[0] > s[1]) === d.homeWon) return', to: 'if (s[0] !== s[1]) return' }] },
  twopaths: { section: 1, labels: ["tells the quick path's final"], patches: [{ file: DAY, from: 'const told = quickGame(score, f);', to: 'const told = quickGame(score, { ...f, key: f.key + "|again" });' }] },
  tries: { section: 1, labels: ['the swapped share'], patches: [{ file: SCORE, from: 'export const SCORE_TRIES = 24;', to: 'export const SCORE_TRIES = 2;' }] },
  offbyone: { section: 2, labels: ['adds up by the independent checker'], patches: [{ file: DAY, from: 'events.push({ ...e, side });', to: 'events.push({ ...e, side, pts: e.kind === "fg" ? 4 : e.pts });' }] },
  olddraw: { section: 3, labels: ['losers15 told 0.0000'], patches: [{ file: SCORE, from: 'const s = law.score(d.pHome, keyedRng(`${key}|score|${t}`), d);', to: 'const r = keyedRng(`${key}|score|${t}`); const base = 16 + Math.floor(r() * 15); const margin = 1 + Math.floor(r() * 17); const s = d.homeWon ? [base + margin, base] : [base, base + margin];' }] },
  pairing: { section: 4, labels: ['playBracketAll gives', 'four presses of playBracketWeek'], patches: [
    { file: NFL_DATA, from: 'home: { seed: top }, away: { rankedWinnerOf: wc, rank: 2 }', to: 'home: { seed: top }, away: { rankedWinnerOf: wc, rank: 0 }' },
    { file: NFL_DATA, from: 'home: { rankedWinnerOf: wc, rank: 0 }, away: { rankedWinnerOf: wc, rank: 1 }', to: 'home: { rankedWinnerOf: wc, rank: 1 }, away: { rankedWinnerOf: wc, rank: 2 }' },
  ] },
  validator: { section: 4, labels: ['names a doctored winner', 'names a doctored pairing', 'names a tie played out of turn'], patches: [{ file: BRACKET, from: 'const seen = new Set<string>();', to: 'const seen = new Set<string>(); if (seen.size === 0) return problems;' }] },
  enginedrift: { section: 4, labels: ['is the recorded one'], clean: ['playBracketAll gives', 'four presses of playBracketWeek'], patches: [{ file: 'src/lib/frontOffice.ts', from: 'const margin = 1 + Math.floor(rng() * 17);', to: 'const margin = 1 + Math.floor(rng() * 16);' }] },
  random: { section: 5, labels: ['holds no Math.random', 'takes no draw from Math.random'], patches: [{ file: DAY, from: "const flip = viewAs === 'away';", to: "const flip = viewAs === 'away'; Math.random();" }] },
  stream: { section: 5, labels: ['holds no Math.random', 'takes no draw from Math.random', 'moves none of its 272 winners'], patches: [{ file: SCORE, from: 'let first: [number, number] | null = null;', to: 'let first: [number, number] | null = null; Math.random();' }] },
  unkeyed: { section: 5, labels: ['the same story twice', 'through JSON, tells the same story'], patches: [{ file: DAY, from: 'keyedRng(`${g.key}|story|${g.homeScore}-${g.awayScore}`)', to: 'keyedRng(`${g.key}|story|${(globalThis.__gmDayCalls = (globalThis.__gmDayCalls ?? 0) + 1)}`)' }] },
  mounted: { section: 6, labels: ['no file under src imports'], patches: [], plant: { file: ROUTE_FILE, text: "\nimport { gameStory } from '@/lib/gmGameDay';\n" } },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown GM_GAMEDAY_CONTROL ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }
const PATCHES = CONTROL ? CONTROLS[CONTROL].patches : [];

/* A source file as this run sees it: the control's patches applied, so the scans of sections 5 and 6 read what the bundle runs. */
function readPatched(rel) {
  let src = readSrc(rel);
  for (const p of PATCHES.filter(x => x.file === rel)) {
    if (src.split(p.from).length !== 2) { console.error(`control ${CONTROL}: its string is not exactly once in ${rel}, refusing to run: ${p.from.slice(0, 80)}`); process.exit(2); }
    src = src.replace(p.from, () => p.to);
  }
  const plant = CONTROL ? CONTROLS[CONTROL].plant : undefined;
  return plant && plant.file === rel ? src + plant.text : src;
}

/* ─── The bundle: the untouched engine, the libraries, the NFL's law and data, the ledger ─── */
const t0 = Date.now();
let M;
let fired;
try {
  ({ M, fired } = await bundle([
    ...ENGINE_ENTRY,
    "export * as score from './src/lib/gmGameScore.ts';",
    "export * as day from './src/lib/gmGameDay.ts';",
    "export * as bracket from './src/lib/gmBracket.ts';",
    "export * as nflDay from './src/lib/gameLaws/nflGameDay.ts';",
    "export * as nflData from './src/data/gmBrackets/nfl.ts';",
    "export { NFL_SCORE_LAW } from './src/lib/gameLaws/nflScore.ts';",
    "export { NFL_SCORING, NFL_CLOCK } from './src/data/usLeagueShape.ts';",
    "export { keyedRng } from './src/lib/keyedRng.ts';",
    "export { finalTie } from './src/lib/finalsBracket.ts';",
  ], PATCHES, CONTROL || 'base'));
} catch (e) {
  console.error(`simGmGameDay: the bundle refused${CONTROL ? ` (control ${CONTROL})` : ''}: ${e && e.message ? e.message.split('\n')[0] : e}`);
  process.exit(2);
}
if (fired.size !== PATCHES.length) { console.error(`control ${CONTROL}: ${fired.size} of ${PATCHES.length} patches reached their file, refusing to report`); process.exit(2); }
const { engine: E, score: S, day: D, bracket: B, nflDay, nflData, NFL_SCORE_LAW: LAW, NFL_SCORING, NFL_CLOCK } = M;
const GAME_DAY = nflDay.NFL_GAME_DAY;
const FORMAT = nflData.NFL_BRACKET;
console.log(`bundled in ${Date.now() - t0} ms; seed sets ${SEEDSETS.join(', ')}; ${FLEET.perKind} seasons a league kind a set${CONTROL ? `; CONTROL ${CONTROL}` : ''}`);

/* ─── Failure bookkeeping, by section ─── */
let checks = 0;
const failsBy = new Map();
function check(section, label, ok, detail = '') {
  checks += 1;
  if (ok) return;
  const key = String(section);
  failsBy.set(key, [...(failsBy.get(key) ?? []), label]);
  console.error(`  FAIL (section ${section}): ${label}${detail ? `: ${detail}` : ''}`);
}
/* A check over many games: how many broke it, and the first one that did. */
function tally() { return { n: 0, bad: 0, first: '' }; }
function count(t, ok, what) { t.n += 1; if (!ok) { t.bad += 1; if (!t.first) t.first = typeof what === 'function' ? what() : what; } }
function settle(section, label, t) { check(section, `${label} (${t.n} looked at)`, t.bad === 0 && t.n > 0, t.n === 0 ? 'nothing was looked at' : `${t.bad} broke it, the first: ${t.first}`); }

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Source text with comments taken out, strings and templates left as they are (a guard reads the code, not the prose about it). */
function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = '';
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += d ?? ''; i += 2; continue; }
      if (c === quote) quote = '';
      i += 1;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      out += ' ';
    } else if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i);
      i = end === -1 ? src.length : end;
    } else {
      if (c === '"' || c === "'" || c === '`') quote = c;
      out += c;
      i += 1;
    }
  }
  return out;
}

/* ─── Section 2's checker: a story against the rules, with its own arithmetic ─── */
const WORTH = { td: [NFL_SCORING.touchdown, NFL_SCORING.touchdown + NFL_SCORING.kickAfter, NFL_SCORING.touchdown + NFL_SCORING.twoPointTry], fg: [NFL_SCORING.fieldGoal], safety: [NFL_SCORING.safety] };
const HOUR = NFL_CLOCK.quarters * NFL_CLOCK.minutes;
function storyProblems(story, quick, view) {
  const out = [];
  const us = view === 'home' ? quick.homeScore : quick.awayScore;
  const them = view === 'home' ? quick.awayScore : quick.homeScore;
  const ev = story.game.events;
  if (story.game.us !== us || story.game.them !== them) out.push('the final is not the told final');
  if ((story.game.home === true) !== (view === 'home')) out.push('the view is the wrong side');
  let sumUs = 0;
  let sumThem = 0;
  const quarters = { us: [0, 0, 0, 0], them: [0, 0, 0, 0] };
  const minutes = new Set();
  let before = 0;
  for (const e of ev) {
    if (!WORTH[e.kind] || !WORTH[e.kind].includes(e.pts)) out.push(`a ${e.kind} worth ${e.pts}`);
    if (!Number.isInteger(e.min) || e.min < 1 || e.min > HOUR) out.push(`minute ${e.min}`);
    if (minutes.has(e.min)) out.push(`two lines on minute ${e.min}`);
    if (e.min < before) out.push('not minute ordered');
    before = e.min;
    minutes.add(e.min);
    if (e.side === 'us') sumUs += e.pts; else if (e.side === 'them') sumThem += e.pts; else out.push(`side ${e.side}`);
    const q = Math.floor((e.min - 1) / NFL_CLOCK.minutes);
    if (quarters[e.side] && q >= 0 && q < 4) quarters[e.side][q] += e.pts;
  }
  if (sumUs !== us || sumThem !== them) out.push(`the plays sum to ${sumUs}-${sumThem}, the final is ${us}-${them}`);
  if (!same(story.periods, quarters)) out.push(`the quarters read ${JSON.stringify(story.periods)}, the plays make ${JSON.stringify(quarters)}`);
  /* the deciding plays, by the rule: walk the lead of the side that won */
  const win = us > them ? 'us' : 'them';
  let lead = 0;
  let last = -1;
  let hole = 0;
  ev.forEach((e, i) => { lead += e.side === win ? e.pts : -e.pts; if (lead <= 0) last = i; if (-lead > hole) hole = -lead; });
  const goAhead = ev[last + 1];
  const want = [];
  for (let i = last; i >= 0; i -= 1) if (ev[i].side !== win) { want.push(ev[i]); break; }
  want.push(goAhead);
  for (let i = ev.length - 1; i > last + 1; i -= 1) if (ev[i].side === win) { want.push(ev[i]); break; }
  if (story.deciding.length !== want.length || story.deciding.some((e, i) => e !== want[i])) out.push('the deciding plays are not the rule\'s');
  if (story.deciding.some(e => !ev.includes(e))) out.push('a deciding play is not a play of the game');
  const margin = Math.abs(us - them);
  const shape = margin >= nflDay.NFL_ROUT ? 'rout' : hole >= nflDay.NFL_COMEBACK ? 'comeback' : goAhead && goAhead.min > HOUR - NFL_CLOCK.minutes ? 'late' : last === -1 ? 'wire' : 'trade';
  if (story.shape !== shape) out.push(`shape ${story.shape}, the rule says ${shape}`);
  return out;
}

/* ─── The bands of sections 1 and 3 (see MEASURED in the header) ─── */
const SWAPPED_MOST = 0.002;
const BANDS = { points: 0.25, losers15: 0.02, shutouts: 0.005, forty: 0.006 };

/* What one seed set measured, kept for the closing table. */
const measured = [];
const CLUBS = new Set(M.FO_TEAMS.map(t => t.abbr));
const isClub = id => CLUBS.has(id);
const fixturePath = path.join(ROOT, 'scripts', 'data', 'gmBracketFixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
check(4, 'the fixture was recorded from the engine as it is now (a changed engine records it again in the same commit)', fixture.engine === sha1(readSrc('src/lib/frontOffice.ts')), 'src/lib/frontOffice.ts is not the file the fixture was recorded from');
check(4, 'the fixture was recorded over the resolver as it is now', fixture.finalsBracket === sha1(readSrc('src/lib/finalsBracket.ts')), 'src/lib/finalsBracket.ts is not the file the fixture was recorded over');
check(4, 'the fixture is of this fleet', same(fixture.fleet, { ...FLEET, nextDraws: NEXT_DRAWS }));

/* One playoff game as the engine's one press postseason plays it: the engine's game at week 0, then the win and the loss taken back. */
const engineTie = (teams, after) => (home, away, tie) => {
  const g = E.simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, Math.random);
  teams[g.winner].wins -= 1;
  teams[g.winner === g.home ? g.away : g.home].losses -= 1;
  if (after) after(g, tie);
  return { homeScore: g.homeScore, awayScore: g.awayScore, winner: g.winner };
};
/* What the machine played, written the way enginePostseason writes the engine's. */
const machineRow = (save, teams, next) => ({
  seeds: save.seeds.join(','),
  games: B.bracketRounds(FORMAT, save).flatMap(r => r.games.map(g => gameText(r.name, g))),
  champion: B.bracketChampion(FORMAT, save),
  next: sha1(next.join(',')),
  records: sha1(recordsOf(teams)),
});
const decile = p => Math.min(9, Math.floor(p * 10));

for (const set of SEEDSETS) {
  const t1 = Date.now();
  const s1 = { winner: tally(), level: tally(), refused: tally(), paths: tally() };
  const s2 = { story: tally(), adds: tally() };
  const s4 = { all: tally(), weeks: tally(), sound: tally(), json: tally(), dWinner: tally(), dPairing: tally(), dTurn: tally() };
  const s5 = { state: tally(), calls: tally(), winners: tally(), records: tally(), twice: tally(), reload: tally(), bracket: tally() };
  const told = { games: 0, points: 0, losers15: 0, shutouts: 0, forty: 0, swapped: 0 };
  const free = { games: 0, points: 0, losers15: 0, shutouts: 0, forty: 0 };
  const tries = Array.from({ length: 10 }, () => ({ n: 0, tries: 0, swapped: 0 }));
  const shapes = {};
  let afcTitles = 0;
  const lines = [];
  /* One game told the way a board will tell it (the quick path in the press, the story for the card), and every
     per game check of sections 1, 2, 3 and 5. Called INSIDE the seeded Math.random, right after the engine's game. */
  const tell = (id, key, g, pHome, view) => {
    const f = { key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome } };
    const quick = S.quickGame(LAW, f);
    count(s1.refused, quick !== null, () => `${id} ${key}`);
    if (!quick) return;
    count(s1.level, quick.homeScore !== quick.awayScore, () => `${id} ${key}: ${quick.homeScore}-${quick.awayScore}`);
    count(s1.winner, S.toldWinner(quick) === g.winner, () => `${id} ${key}: told ${quick.homeScore}-${quick.awayScore}, the engine's winner is ${g.winner}`);
    const t = D.tellGame(LAW, GAME_DAY, f, view);
    count(s1.paths, t !== null && same(t.told, quick), () => `${id} ${key}: told ${t ? `${t.told.homeScore}-${t.told.awayScore}` : 'nothing'}, quick ${quick.homeScore}-${quick.awayScore}`);
    const story = t ? t.story : null;
    count(s5.twice, same(S.quickGame(LAW, f), quick) && same(D.gameStory(GAME_DAY, quick, view), story), () => `${id} ${key}`);
    const saved = D.readGmLastGame(JSON.parse(JSON.stringify(D.makeGmLastGame(quick, 'w'))), isClub);
    count(s5.reload, saved !== null && same(D.gameStory(GAME_DAY, saved, view), story), () => `${id} ${key}`);
    count(s2.story, story !== null, () => `${id} ${key}: no story for ${quick.homeScore}-${quick.awayScore}`);
    if (story) {
      const probs = storyProblems(story, quick, view);
      count(s2.adds, probs.length === 0, () => `${id} ${key} (${quick.homeScore}-${quick.awayScore}): ${probs[0]}`);
      shapes[story.shape] = (shapes[story.shape] ?? 0) + 1;
    }
    /* section 3: the told final, and the same law left free at the same chance on a stream of its own */
    const add = (o, home, away) => {
      const lo = Math.min(home, away);
      o.games += 1;
      o.points += home + away;
      if (lo <= 15) o.losers15 += 1;
      if (lo === 0) o.shutouts += 1;
      o.forty += (home >= 40 ? 1 : 0) + (away >= 40 ? 1 : 0);
    };
    add(told, quick.homeScore, quick.awayScore);
    const [fh, fa] = LAW.score(pHome, M.keyedRng(`free|${key}`));
    add(free, fh, fa);
    const how = S.decidedScore(LAW, f.decided, key);
    const cell = tries[decile(pHome)];
    cell.n += 1;
    cell.tries += how ? how.tries : 0;
    if (how && how.swapped) { cell.swapped += 1; told.swapped += 1; }
  };

  for (const kind of FLEET.kinds) {
    for (let i = 0; i < FLEET.perKind; i += 1) {
      const id = seasonId(set, kind, i);
      /* A: the season as the engine plays it, nothing told */
      const winnersA = [];
      const A = playRegularSeason(M, set, kind, i, g => { winnersA.push(g.winner); });
      const regular = { state: A.gen.state, calls: A.calls, records: recordsOf(A.lg.teams), teams: JSON.stringify(A.lg.teams) };
      const rowA = enginePostseason(M, A);
      lines.push(JSON.stringify({ id, user: A.user, ...rowA }));
      if (rowA.games[12].split('|')[5] === rowA.games[12].split('|')[1]) afcTitles += 1;
      const seeds = rowA.seeds.split(',');

      /* section 4: the machine on the same league and the same generator, all at once and a round a press */
      for (const mode of ['all', 'weeks']) {
        A.gen.state = regular.state;
        const teams = JSON.parse(regular.teams);
        const { value: row } = withMathRandom(A.gen, () => {
          let save = B.openBracket(FORMAT, A.lg.season, seeds);
          if (mode === 'all') save = B.playBracketAll(FORMAT, save, engineTie(teams));
          else {
            for (let press = 0; press < 4; press += 1) {
              const next = B.playBracketWeek(FORMAT, save, engineTie(teams));
              const back = JSON.parse(JSON.stringify(next));
              count(s4.json, same(back, next) && B.isGmBracketSave(back, isClub), id);
              count(s4.sound, B.bracketProblems(FORMAT, back, isClub).length === 0, () => `${id} after press ${press + 1}: ${B.bracketProblems(FORMAT, back, isClub)[0]}`);
              save = back;
            }
          }
          const next = Array.from({ length: NEXT_DRAWS }, () => Math.random());
          return { save, row: machineRow(save, teams, next) };
        });
        count(mode === 'all' ? s4.all : s4.weeks, same(row.row, rowA), () => `${id}: ${row.row.games.find((g, k) => g !== rowA.games[k]) ?? `champion ${row.row.champion} against ${rowA.champion}, or the draws or records after`}`);
        if (mode === 'all') {
          /* three doctored saves, each of which the replay must name */
          const flip = JSON.parse(JSON.stringify(row.save));
          const g0 = flip.played[0];
          g0.games[0].winner = g0.games[0].winner === g0.home ? g0.away : g0.home;
          count(s4.dWinner, B.bracketProblems(FORMAT, flip, isClub).length > 0, id);
          const swap = JSON.parse(JSON.stringify(row.save));
          [swap.played[0].away, swap.played[1].away] = [swap.played[1].away, swap.played[0].away];
          count(s4.dPairing, B.bracketProblems(FORMAT, swap, isClub).length > 0, id);
          const turn = JSON.parse(JSON.stringify(row.save));
          turn.played = turn.played.filter(p => p.id !== 'NFC-WC-3');
          count(s4.dTurn, B.bracketProblems(FORMAT, turn, isClub).length > 0, id);
        }
      }

      /* B: the same season with every game told the moment the engine has played it (sections 1, 2, 3 and 5) */
      const winnersB = [];
      const told17 = playRegularSeason(M, set, kind, i, (g, pHome, week, lg) => {
        winnersB.push(g.winner);
        tell(id, `${lg.season}|w${week}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`, g, pHome, winnersB.length % 2 ? 'home' : 'away');
      });
      count(s5.state, told17.gen.state === regular.state, id);
      count(s5.calls, told17.calls === regular.calls, () => `${id}: ${told17.calls} draws with the games told, ${regular.calls} without`);
      count(s5.winners, winnersB.length === 272 && winnersB.join() === winnersA.join(), id);
      count(s5.records, recordsOf(told17.lg.teams) === regular.records, id);
      /* and a postseason with every game told inside the press: the engine's row again, the generator where the engine leaves it */
      const teamsB = told17.lg.teams;
      const { value: rowB } = withMathRandom(told17.gen, () => {
        const save = B.playBracketAll(FORMAT, B.openBracket(FORMAT, told17.lg.season, seedsOf(E, teamsB)), engineTie(teamsB, (g, tie) => {
          tell(id, `${told17.lg.season}|${tie.round}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`, g, E.winProb(teamsB[g.home], teamsB[g.away]), 'home');
        }));
        return machineRow(save, teamsB, Array.from({ length: NEXT_DRAWS }, () => Math.random()));
      });
      count(s5.bracket, same(rowB, rowA), id);
    }
  }

  /* ─── This seed set's verdicts ─── */
  settle(1, `set ${set}: the law never refuses a game of the fleet`, s1.refused);
  settle(1, `set ${set}: a told final is never level`, s1.level);
  settle(1, `set ${set}: a told final never names another winner than the engine's`, s1.winner);
  settle(1, `set ${set}: the told path tells the quick path's final`, s1.paths);
  const swappedShare = told.games ? told.swapped / told.games : 1;
  check(1, `set ${set}: the swapped share ${swappedShare.toFixed(5)} is under ${SWAPPED_MOST}`, swappedShare < SWAPPED_MOST);
  settle(2, `set ${set}: every told final has a story`, s2.story);
  settle(2, `set ${set}: every story adds up by the independent checker`, s2.adds);
  const games = FLEET.kinds.length * FLEET.perKind * (272 + 13);
  check(3, `set ${set}: every game of the fleet was told and measured (${told.games} of ${games})`, told.games === games && free.games === games);
  const stat = o => ({ points: o.points / (2 * o.games), losers15: o.losers15 / o.games, shutouts: o.shutouts / o.games, forty: o.forty / (2 * o.games) });
  const T = stat(told);
  const F = stat(free);
  for (const k of Object.keys(BANDS)) check(3, `set ${set}: ${k} told ${T[k].toFixed(4)} against the free law's ${F[k].toFixed(4)}, inside ${BANDS[k]}`, Math.abs(T[k] - F[k]) < BANDS[k]);
  settle(4, `set ${set}: playBracketAll gives the engine's thirteen games, champion, next ${NEXT_DRAWS} draws and records`, s4.all);
  settle(4, `set ${set}: four presses of playBracketWeek, the save through JSON between them, give the same`, s4.weeks);
  settle(4, `set ${set}: a save survives JSON after every press`, s4.json);
  settle(4, `set ${set}: bracketProblems finds nothing in a bracket the machine played`, s4.sound);
  settle(4, `set ${set}: bracketProblems names a doctored winner`, s4.dWinner);
  settle(4, `set ${set}: bracketProblems names a doctored pairing`, s4.dPairing);
  settle(4, `set ${set}: bracketProblems names a tie played out of turn`, s4.dTurn);
  const rec = fixture.sets[set];
  check(4, `set ${set}: the engine's postseason over the set is the recorded one (scripts/data/gmBracketFixture.json)`, !!rec && rec.seasons === lines.length && rec.digest === sha1(lines.join('\n')),
    rec ? `digest ${sha1(lines.join('\n')).slice(0, 12)} against the recorded ${String(rec.digest).slice(0, 12)}; the first kept season that differs: ${(rec.kept.find(k => !lines.includes(JSON.stringify(k))) ?? { id: 'none of the kept ones' }).id}` : 'the fixture has no such set');
  check(4, `set ${set}: the fixture's kept seasons are played to the letter`, !!rec && rec.kept.length === 6 && rec.kept.every(k => lines.includes(JSON.stringify(k))));
  settle(5, `set ${set}: telling a season leaves the engine's generator where it was`, s5.state);
  settle(5, `set ${set}: telling a season takes no draw from Math.random`, s5.calls);
  settle(5, `set ${set}: telling a season moves none of its 272 winners`, s5.winners);
  settle(5, `set ${set}: telling a season moves none of its 32 records`, s5.records);
  settle(5, `set ${set}: a postseason told inside the press is the engine's postseason, draw for draw`, s5.bracket);
  settle(5, `set ${set}: the same key tells the same final and the same story twice`, s5.twice);
  settle(5, `set ${set}: the saved last game, through JSON, tells the same story`, s5.reload);
  const afcShare = afcTitles / lines.length;
  measured.push({ set, T, F, swappedShare, tries, shapes, afcShare, games: told.games });
  console.log(`set ${set}: ${lines.length} seasons, ${told.games} games told in ${Date.now() - t1} ms; points a team game ${T.points.toFixed(2)} (free ${F.points.toFixed(2)}); losers on 15 or fewer ${T.losers15.toFixed(4)} (free ${F.losers15.toFixed(4)}); shutouts ${T.shutouts.toFixed(4)} (free ${F.shutouts.toFixed(4)}); sides on 40 or more ${T.forty.toFixed(4)} (free ${F.forty.toFixed(4)}); swapped ${swappedShare.toFixed(5)}; the AFC champion won ${afcTitles} of ${lines.length} title games`);
}

/* ─── Section 4, the data's structure (once) ─── */
{
  const ties = FORMAT.ties;
  const weeks = [...new Set(ties.map(t => t.week))].sort((a, b) => a - b);
  check(4, 'the NFL bracket is thirteen ties over four weeks for fourteen seeds', ties.length === 13 && same(weeks, [1, 2, 3, 4]) && FORMAT.qualifiers === 14);
  check(4, 'one tie decides it and it is the last one', M.finalTie(ties)?.id === ties[12].id && ties.filter(t => t.week === 4).length === 1);
  const inWeek1 = new Set(ties.filter(t => t.week === 1).flatMap(t => [t.home, t.away]).map(s => s.seed));
  const byes = B.bracketByes(FORMAT);
  check(4, 'every seed plays in the first week or has the bye, and the byes are the two top seeds', same(byes, [1, 8]) && Array.from({ length: 14 }, (_, k) => k + 1).every(n => inWeek1.has(n) !== byes.includes(n)));
  const rounds = [...new Set(ties.map(t => t.round))];
  check(4, 'the rounds are the seven the engine names, in its order', same(rounds, ['AFC Wild Card', 'NFC Wild Card', 'AFC Divisional', 'NFC Divisional', 'AFC Championship', 'NFC Championship', 'Super Bowl']));
  check(4, 'every tie is one game', ties.every(t => (FORMAT.winsNeeded[t.week] ?? 1) === 1));
}

/* ─── Section 5, the source: no Math.random, no Date, no localStorage in the round's new files ─── */
{
  const FORBIDDEN = [['Math.random', /Math\s*\.\s*random/], ['Date', /\bDate\b/], ['localStorage', /localStorage/]];
  let seen = 0;
  for (const rel of NEW_FILES) {
    const raw = readPatched(rel);
    const code = stripComments(raw);
    /* the stripper really stripped: the header's own words are gone, the code is still there */
    check(5, `${rel}: comments are stripped before it is read`, raw.includes('Round 1224') && !code.includes('Round 1224') && code.includes('export '));
    for (const [name, re] of FORBIDDEN) { seen += 1; check(5, `${rel} holds no ${name}`, !re.test(code)); }
  }
  check(5, 'the source scan looked at every new file', seen === NEW_FILES.length * FORBIDDEN.length);
}

/* ─── Section 6: nobody mounts it yet ─── */
{
  const ts = (await import('typescript')).default;
  const TARGETS = new Set(NEW_FILES.map(f => f.replace(/\.tsx?$/, '')));
  const ALLOWED = new Set([...NEW_FILES, 'src/lib/gmGameScore.test.ts', 'src/lib/gmGameDay.test.ts', 'src/lib/gmBracket.test.ts']);
  /* an import's path from the repo root: the alias, or a path from the importing file; a package is nobody's */
  const target = (from, spec) => {
    const s = spec.replace(/\.tsx?$/, '');
    if (s.startsWith('@/')) return `src/${s.slice(2)}`;
    return s.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), s)) : '';
  };
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.tsx?$/.test(d.name) ? [`${dir}/${d.name}`] : []));
  const files = walk('src');
  if (!files.includes(ROUTE_FILE)) { console.error(`simGmGameDay: ${ROUTE_FILE} is gone, the mounted control has nowhere to plant: refusing to report`); process.exit(2); }
  const importers = [];
  let own = 0;
  for (const rel of files) {
    let text;
    try { text = readPatched(rel); } catch { continue; /* a file another harness wrote and took away while this one walked */ }
    const specs = ts.preProcessFile(text, true, true).importedFiles.map(f => f.fileName);
    if (!specs.some(spec => TARGETS.has(target(rel, spec)))) continue;
    if (ALLOWED.has(rel)) own += 1; else importers.push(rel);
  }
  check(6, `no file under src imports the new modules but the modules and their tests (${files.length} files read)`, importers.length === 0, importers.slice(0, 5).join(', '));
  /* the scan can see an import at all: the libraries import each other and the tests import them */
  check(6, `the scan sees the modules' own imports (${own} of the ${ALLOWED.size} allowed files import one)`, own >= 6);
}

/* ─── What was measured, for the header and the notes ─── */
if (measured.length > 0) {
  const span = f => { const xs = measured.map(f); return `${Math.min(...xs).toFixed(4)} to ${Math.max(...xs).toFixed(4)}`; };
  console.log('');
  console.log(`MEASURED over seed sets ${measured.map(m => m.set).join(', ')} (${measured.reduce((a, m) => a + m.games, 0)} games):`);
  for (const k of Object.keys(BANDS)) console.log(`  ${k}: told ${span(m => m.T[k])}, free ${span(m => m.F[k])}, told less free ${span(m => m.T[k] - m.F[k])} (band ${BANDS[k]} either side)`);
  console.log(`  swapped share ${span(m => m.swappedShare)} (band: under ${SWAPPED_MOST})`);
  const all = Array.from({ length: 10 }, (_, d) => measured.reduce((a, m) => ({ n: a.n + m.tries[d].n, tries: a.tries + m.tries[d].tries, swapped: a.swapped + m.tries[d].swapped }), { n: 0, tries: 0, swapped: 0 }));
  console.log(`  tries a game by decile of the home chance (games, mean tries, swapped): ${all.map((c, d) => `${d / 10}: ${c.n}, ${c.n ? (c.tries / c.n).toFixed(2) : 'none'}, ${c.swapped}`).join(' | ')}`);
  const shapeAll = {};
  for (const m of measured) for (const [k, v] of Object.entries(m.shapes)) shapeAll[k] = (shapeAll[k] ?? 0) + v;
  const stories = Object.values(shapeAll).reduce((a, b) => a + b, 0);
  console.log(`  shapes of ${stories} stories: ${Object.entries(shapeAll).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / stories).toFixed(3)}`).join(', ')}`);
  console.log(`  the AFC champion's share of title games ${span(m => m.afcShare)} a set (a level title game is ${(1 / (1 + 10 ** (-2 / 14))).toFixed(3)} by the engine's arithmetic; printed, never asserted)`);
}

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
console.log('');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const red = [...failsBy.keys()].sort();
  const mine = failsBy.get(String(c.section)) ?? [];
  const every = [...failsBy.values()].flat();
  const named = c.labels.filter(l => mine.some(x => x.includes(l)));
  const dirty = (c.clean ?? []).filter(l => every.some(x => x.includes(l)));
  const ok = mine.length > 0 && named.length === c.labels.length && dirty.length === 0;
  const which = `its named checks red: ${named.length} of ${c.labels.length} (${c.labels.map(l => `"${l}"`).join(', ')})${c.clean ? `; checks that had to stay green and did not: ${dirty.length ? dirty.join(', ') : 'none'}` : ''}`;
  console.log(ok
    ? `control ${CONTROL}: RED AT THE NAMED CHECK (section ${c.section}); ${which}; sections red: ${red.join(', ')}`
    : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (section ${c.section}); ${which}; sections red: ${red.join(', ') || 'none'}`);
  console.log(`simGmGameDay: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  process.exit(ok ? 1 : 2);
}
console.log(`simGmGameDay: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);

// reviewer mutation tool (runner only, never committed): node .rc/x/mut.mjs <name>
// Each mutation replaces a string that must be in its file exactly once, or refuses with exit 3.
import fs from 'node:fs';
const SCORE = 'src/lib/gmGameScore.ts';
const DAY = 'src/lib/gmGameDay.ts';
const BRACKET = 'src/lib/gmBracket.ts';
const NFL_DAY = 'src/lib/gameLaws/nflGameDay.ts';
const NFL_DATA = 'src/data/gmBrackets/nfl.ts';
const M = {
  // off by one: minute 15 falls in the second quarter
  periods: [{ file: NFL_DAY, from: 'Math.ceil(minute / QUARTER_MINUTES) - 1', to: 'Math.floor(minute / QUARTER_MINUTES)' }],
  // swapped: the viewed club is called the home side when it is away
  home: [{ file: DAY, from: 'home: !flip, us: mine', to: 'home: flip, us: mine' }],
  // dropped filter: play (2) is whatever score came before the go ahead, the winner's included
  filter: [{ file: DAY, from: 'for (let i = last; i >= 0; i -= 1) if (scores[i].side !== winner) { plays.push(scores[i]); break; }', to: 'for (let i = last; i >= 0; i -= 1) { plays.push(scores[i]); break; }' }],
  // stale key: every try draws the same stream
  trykey: [{ file: SCORE, from: 'keyedRng(`${key}|score|${t}`)', to: 'keyedRng(`${key}|score`)' }],
  // swapped fallback: after 24 misses the first try goes to the LOSER's side
  fallback: [{ file: SCORE, from: 'return { home: d.homeWon ? hi : lo, away: d.homeWon ? lo : hi, tries: SCORE_TRIES, swapped: true };', to: 'return { home: d.homeWon ? lo : hi, away: d.homeWon ? hi : lo, tries: SCORE_TRIES, swapped: true };' }],
  // dropped filter: a block of another season keeps its own (stale) seeds
  season: [{ file: BRACKET, from: 'const seeds = isRecord(value) && value.season === season && Array.isArray(value.seeds) ? value.seeds : null;', to: 'const seeds = isRecord(value) && Array.isArray(value.seeds) ? value.seeds : null;' }],
  // dropped check: a game won by the side on the lower score is not named
  lowscore: [{ file: BRACKET, from: 'else if (g.homeScore === g.awayScore || (g.homeScore > g.awayScore) !== (g.winner === p.home)) problems.push', to: 'else if (g.homeScore < 0) problems.push' }],
  // dropped check: a game after the tie was decided is not named
  afterdecided: [{ file: BRACKET, from: 'if (home >= need || away >= need) problems.push', to: 'if (home < 0) problems.push' }],
  // dropped check: a saved last game whose winner is the club on the lower score is read
  lastwinner: [{ file: DAY, from: 'if (o.winner !== (o.homeScore > o.awayScore ? o.home : o.away)) return null;', to: '' }],
  // swapped ranks: the worse seed hosts the conference championship
  cchost: [{ file: NFL_DATA, from: 'home: { rankedWinnerOf: div, rank: 0 }, away: { rankedWinnerOf: div, rank: 1 }', to: 'home: { rankedWinnerOf: div, rank: 1 }, away: { rankedWinnerOf: div, rank: 0 }' }],
  // dropped check: the same club seeded twice passes the guard
  dupseeds: [{ file: BRACKET, from: ' || new Set(value.seeds).size !== value.seeds.length) return false;', to: ') return false;' }],
  // off by one: a win from exactly the comeback number down is no longer a comeback
  shapeorder: [{ file: DAY, from: ": decided.deficit >= law.shape.comeback ? 'comeback'", to: ": decided.deficit > law.shape.comeback ? 'comeback'" }],
};
const name = process.argv[2];
if (name === '--check') {
  let bad = 0;
  for (const [k, ps] of Object.entries(M)) for (const p of ps) {
    const n = fs.readFileSync(p.file, 'utf8').split(p.from).length - 1;
    if (n !== 1) bad += 1;
    console.log(`${k}: ${n} in ${p.file}`);
  }
  process.exit(bad ? 3 : 0);
}
if (!M[name]) { console.error(`mut: unknown mutation ${name} (${Object.keys(M).join(', ')})`); process.exit(3); }
for (const p of M[name]) {
  const src = fs.readFileSync(p.file, 'utf8');
  if (src.split(p.from).length !== 2) { console.error(`mut ${name}: its string is not exactly once in ${p.file}, refusing`); process.exit(3); }
  const out = src.replace(p.from, () => p.to);
  if (out === src) { console.error(`mut ${name}: changed nothing, refusing`); process.exit(3); }
  fs.writeFileSync(p.file, out);
}
console.log(`mut ${name}: applied`);

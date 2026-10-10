/* Reviewer's mutations for Round 1211 (run on the runner only, never committed).
   node .rc/x/mut.mjs <name>: applies ONE named mutation to a source file,
   refusing (exit 9) unless every anchor is in the file exactly once. */
import { readFileSync, writeFileSync } from 'node:fs';

const MLB = 'src/data/usSeasonLedgerMlb.ts';
const NHL = 'src/data/usSeasonLedgerNhl.ts';
const M = {
  /* A: the wrong club in a throwback row, id consistent with the name. */
  A: [[MLB, "clubs: ['Washington Nationals', 'Los Angeles Dodgers'], ids: ['LAD']", "clubs: ['Washington Nationals', 'San Francisco Giants'], ids: ['SFG']"]],
  /* B: off by one in the last year a 2004 id is a real club. */
  B: [[MLB, "{ id: 'TBD', club: 'Tampa Bay Devil Rays', from: 2004, to: 2007,", "{ id: 'TBD', club: 'Tampa Bay Devil Rays', from: 2004, to: 2008,"]],
  /* C: the 84 game season starts a year early. */
  C: [[NHL, "{ year: 2025, games: 82, teams: 32,", "{ year: 2025, games: 84, teams: 32,"]],
  /* D: two rival pairs with their National League partners swapped. */
  D: [[MLB, "['BOS', 'ATL']", "['BOS', 'PHI']"], [MLB, "['TOR', 'PHI']", "['TOR', 'ATL']"]],
  /* E: the first round windows shifted by a year, still contiguous. */
  E: [[MLB, "{ from: 2012, to: 2019, round: 'Wild Card Game'", "{ from: 2012, to: 2018, round: 'Wild Card Game'"], [MLB, "{ from: 2020, to: 2020, round: 'Wild Card Series'", "{ from: 2019, to: 2020, round: 'Wild Card Series'"]],
  /* G: two clubs in each other's division in the six division years. */
  G: [[NHL, "teams: ['CBJ', 'CHI', 'DET', 'NSH', 'STL'] }", "teams: ['CBJ', 'CHI', 'COL', 'NSH', 'STL'] }"], [NHL, "teams: ['CGY', 'COL', 'EDM', 'MIN', 'VAN'] }", "teams: ['CGY', 'DET', 'EDM', 'MIN', 'VAN'] }"]],
  /* H: two clubs' 2019-20 games moved by one each way, the sum kept. */
  H: [[NHL, "OTT: 71,", "OTT: 70,"], [NHL, "WSH: 69,", "WSH: 70,"]],
  /* J: a stale scoring mean. */
  J: [[MLB, "{ now: 4.48, y2004: 4.81 }", "{ now: 4.48, y2004: 4.80 }"]],
  /* K: a group one more game short, its sentence changed to match. */
  K: [[MLB, "clubs: [{ games: 161, why: SHORT1, clubs: ['Cleveland Indians', 'Detroit Tigers'], ids: ['CLV', 'DET'] }]", "clubs: [{ games: 160, why: 'finished on 160 games', clubs: ['Cleveland Indians', 'Detroit Tigers'], ids: ['CLV', 'DET'] }]"]],
  /* N: the interleague home series off by one (both formula rows carry it). */
  N: [[MLB, "homeSeries: 7 },\n    homeGames: null,\n    src: ['usatoday-2025-schedule'", "homeSeries: 8 },\n    homeGames: null,\n    src: ['usatoday-2025-schedule'"]],
  /* O: the overtime rules: ten minutes and four skaters. */
  O: [[NHL, "minutes: 5, skatersFrom2015: 3,", "minutes: 10, skatersFrom2015: 4,"]],
  /* P: the 2020 short season on the full schedule length, clubs untouched. */
  P: [[MLB, "year: 2020, games: 60, teamGames: 1796,", "year: 2020, games: 162, teamGames: 1796,"]],
  /* Q: a club dropped from a short group and its league total moved to match (one club on 161). */
  Q: [[MLB, "year: 2021, games: 162, teamGames: 4858,", "year: 2021, games: 162, teamGames: 4859,"], [MLB, "clubs: ['Atlanta Braves', 'Colorado Rockies'], ids: ['ATL', 'COL']", "clubs: ['Atlanta Braves'], ids: ['ATL']"]],
  /* R: the NHL conference home split, four and four made five and three. */
  R: [[NHL, "twiceAtHome: 4, onceAtHome: 4", "twiceAtHome: 5, onceAtHome: 3"]],
  /* S: Phoenix kept its name a year longer. */
  S: [[NHL, "{ id: 'PHX', club: 'Phoenix Coyotes', from: 2006, to: 2013,", "{ id: 'PHX', club: 'Phoenix Coyotes', from: 2006, to: 2014,"]],
};

const name = process.argv[2];
/* DRY=1 (the reviewer's PC): count the anchors of every mutation and write nothing. */
if (process.env.DRY === '1') {
  for (const [k, edits] of Object.entries(M)) for (const [file, from] of edits) {
    const text = readFileSync(file, 'utf8').split('\r\n').join('\n');
    console.log(k, file.split('/').pop(), text.split(from).length - 1);
  }
  process.exit(0);
}
const edits = M[name];
if (!edits) { console.log(`MUT ABORT: no mutation named ${name}`); process.exit(9); }
for (const [file, from, to] of edits) {
  const text = readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`MUT ABORT ${name}: the anchor is in ${file} ${n} times, wanted exactly once: ${from}`); process.exit(9); }
  writeFileSync(file, text.replace(from, to));
}
console.log(`MUT ${name} APPLIED: ${edits.length} edit(s)`);

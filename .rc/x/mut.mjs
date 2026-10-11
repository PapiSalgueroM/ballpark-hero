// Reviewer's mutations of the three libraries (Rounds 1228, 1224, 1300). Runs on the runner's checkout only.
// usage: node .rc/x/mut.mjs <id>   exits 2 unless the old text is in the file exactly once.
import fs from 'node:fs';
const M = {
  // Round 1228, src/lib/uclLeaguePhase.ts
  U2: ['src/lib/uclLeaguePhase.ts', 'if (ag > hg) away[a].wins += 1;', 'if (ag >= hg) away[a].wins += 1;'],
  U3: ['src/lib/uclLeaguePhase.ts', 'met[h].push(a); met[a].push(h);', 'met[h].push(a);'],
  U4: ['src/lib/uclLeaguePhase.ts', '{ home: at(low[flipPairs ? 1 : 0]), away: at(high[0]) },', '{ home: at(high[0]), away: at(low[flipPairs ? 1 : 0]) },'],
  U5: ['src/lib/uclLeaguePhase.ts', 'Number(b === holder) - Number(a === holder)', '0'],
  U6: ['src/lib/uclLeaguePhase.ts', "position <= UCL_LEAGUE.playoffTo ? 'playoff'", "position < UCL_LEAGUE.playoffTo ? 'playoff'"],
  U8: ['src/lib/uclLeaguePhase.ts', 'away[a].goals += ag;', 'away[a].goals += hg;'],
  U9: ['src/lib/uclLeaguePhase.ts', 'opponentsGoalDifference: sum(i, o => o.gf - o.ga), opponentsGoalsFor: sum(i, o => o.gf),', 'opponentsGoalDifference: sum(i, o => o.gf - o.ga), opponentsGoalsFor: sum(i, o => o.ga),'],
  // Round 1228, src/lib/leagueSlate.ts
  S1: ['src/lib/leagueSlate.ts', 'if (h === v || met[h * n + v]) return null;', 'if (h === v) return null;'],
  // Round 1224
  B2: ['src/lib/gmBracket.ts', "if (home >= need || away >= need) problems.push(`${p.id} game ${i + 1} was played after the tie was decided`);", ''],
  B3: ['src/data/gmBrackets/nfl.ts', 'home: { seed: top }, away: { rankedWinnerOf: wc, rank: 2 } },', 'home: { seed: top }, away: { rankedWinnerOf: wc, rank: 1 } },'],
  B4: ['src/data/gmBrackets/nfl.ts', 'home: { seed: top + 2 }, away: { seed: top + 5 } },', 'home: { seed: top + 5 }, away: { seed: top + 2 } },'],
  B5: ['src/lib/gmBracket.ts', "if (value.season !== season) problems.push(`the block is of season ${value.season}, not ${season}`);", ''],
  B6: ['src/data/gmBrackets/nfl.ts', "home: { rankedWinnerOf: div, rank: 0 }, away: { rankedWinnerOf: div, rank: 1 } },", "home: { rankedWinnerOf: div, rank: 1 }, away: { rankedWinnerOf: div, rank: 0 } },"],
  G2: ['src/lib/gmGameDay.ts', 'if (sum(us) !== mine || sum(them) !== theirs) return null;', ''],
  G3: ['src/lib/gmGameDay.ts', "if (lead <= 0) last = i;", "if (lead < 0) last = i;"],
  Q1: ['src/lib/gmGameScore.ts', 'return { home: d.homeWon ? hi : lo, away: d.homeWon ? lo : hi, tries: SCORE_TRIES, swapped: true };', 'return { home: d.homeWon ? lo : hi, away: d.homeWon ? hi : lo, tries: SCORE_TRIES, swapped: true };'],
  Q2: ['src/lib/gameLaws/nflGameDay.ts', 'export const NFL_COMEBACK = 10;', 'export const NFL_COMEBACK = 11;'],
  // Round 1300
  P3: ['src/lib/season/usPlayoffs.ts', "return at.mine > at.theirs ? `You lead ${at.mine}-${at.theirs}` : `You trail ${at.mine}-${at.theirs}`;", "return at.mine > at.theirs ? `You trail ${at.mine}-${at.theirs}` : `You lead ${at.mine}-${at.theirs}`;"],
  P4: ['src/data/usPostseasonFormat.ts', 'lastRoundOnlyCross: true, modified: [2019],', 'lastRoundOnlyCross: true, modified: [],'],
  P5: ['src/data/usPostseasonFormat.ts', "sport: 'nfl', from: 2020, to: null, clubs: 14, byes: 1,", "sport: 'nfl', from: 2010, to: null, clubs: 14, byes: 1,"],
  P6: ['src/lib/season/usPlayoffs.ts', 'fixtures: () => Array.from({ length: G }, (_, i): [number, number][] => [i % 2 === 0 ? [0, 1] : [1, 0]]),', 'fixtures: () => Array.from({ length: G }, (): [number, number][] => [[0, 1]]),'],
  P7: ['src/lib/season/usPlayoffs.ts', 'if (!best || p.season.repairs < best.season.repairs) best = p;', 'if (!best) best = p;'],
  P8: ['src/data/usPostseasonFormat.ts', "before: { name: 'Play-In Tournament', places: [7, 10] }", "before: { name: 'Play-In Tournament', places: [7, 8] }"],
};
const id = process.argv[2];
if (id === '--dry') {
  for (const [k, [file, from]] of Object.entries(M)) console.log(k, file, fs.readFileSync(file, 'utf8').split(from).length - 1);
  process.exit(0);
}
if (id === '--ids') { console.log(Object.keys(M).join(' ')); process.exit(0); }
const m = M[id];
if (!m) { console.error(`mut: no mutation ${id}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mut ${id}: the old text is in ${file} ${n} times, refusing`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, () => to));
console.log(`mut ${id}: applied to ${file}`);

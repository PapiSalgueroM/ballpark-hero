/* Reviewer's mutations for Round 1226. usage: node mut.mjs <name>
   Each one changes one line of a source file in the checkout it is run in,
   and refuses (exit 2) when the line is not there exactly once. */
import { readFileSync, writeFileSync } from 'node:fs';

const MUTS = {
  /* 1: the award gates read the raw game count again (the short season rule dropped), both engines. */
  gates: [
    ['src/lib/nhlMyCareer.ts', 'const eqGames = eq(games);', 'const eqGames = games;'],
    ['src/lib/mlbMyCareer.ts', 'const eqGames = eq(games);', 'const eqGames = games;'],
  ],
  /* 2: a home run is no longer held to be a hit. */
  hrhit: [['src/lib/mlbMyCareer.ts', 'const hits = Math.max(hr, Math.round(ab * drawn));', 'const hits = Math.round(ab * drawn);']],
  /* 3: a pitcher's workload no longer gives way to a short season. */
  pitch: [['src/lib/mlbMyCareer.ts', "return pos === 'SP' || pos === 'RP' ? Math.min(slate, US_ENGINE_SEASON.mlb) : slate;", "return pos === 'SP' || pos === 'RP' ? US_ENGINE_SEASON.mlb : slate;"]],
  /* 4: off by one in the years of the Wild Card Game: the rounds after it are counted one round too deep. */
  partial: [['src/lib/usSeasonShape.ts', 'const rest = playoffGames(Math.max(0, stage - skip - known.length), draw, sport);', 'const rest = playoffGames(Math.max(0, stage - skip), draw, sport);']],
  /* 5: the years with no wild card round count their games on the old four round law. */
  fold: [['src/lib/usSeasonShape.ts', 'if (known.length === 0) return playoffGames(Math.max(0, stage - skip), draw, sport);', 'if (known.length === 0) return playoffGames(stage, draw, sport);']],
  /* 6: a saved line with no slate is read on the ledger's length for its year (old saves re-read). */
  oldsave: [['src/lib/usSeasonShape.ts', 'return line.slate ?? US_ENGINE_SEASON[sport];', 'return line.slate ?? seasonLength(sport, (line as { year?: number }).year ?? 0, (line as { team?: string }).team);']],
  /* 7: a goalie's starts follow the schedule up as well as down. */
  goalie: [['src/lib/nhlMyCareer.ts', "return pos === 'G' ? Math.min(slate, US_ENGINE_SEASON.nhl) : slate;", "return slate;"]],
  /* 8: the comeback gate reads last season's games raw (an old 48 or 60 game year reads as a lost one). */
  comeback: [
    ['src/lib/nhlMyCareer.ts', "const prevEq = prevSeason ? fullSeasonOf('nhl', prevSeason.games, nhlWorkSlate(c.pos, prevSeason.slate ?? US_ENGINE_SEASON.nhl)) : 0;", 'const prevEq = prevSeason ? prevSeason.games : 0;'],
    ['src/lib/mlbMyCareer.ts', "const prevEq = prevSeason ? fullSeasonOf('mlb', prevSeason.games, mlbWorkSlate(c.pos, prevSeason.slate ?? US_ENGINE_SEASON.mlb)) : 0;", 'const prevEq = prevSeason ? prevSeason.games : 0;'],
  ],
};

const name = process.argv[2];
const list = MUTS[name];
if (!list) { console.log(`MUTATION ABORTED: unknown name "${name}", expected one of ${Object.keys(MUTS).join(', ')}`); process.exit(2); }
for (const [file, from] of list) {
  const n = readFileSync(file, 'utf8').split(from).length - 1;
  if (n !== 1) { console.log(`MUTATION ${name} ABORTED: "${from}" is in ${file} ${n} times, not once`); process.exit(2); }
}
for (const [file, from, to] of list) {
  writeFileSync(file, readFileSync(file, 'utf8').replace(from, () => to));
  console.log(`MUTATION ${name} APPLIED in ${file}: "${from}" -> "${to}"`);
}

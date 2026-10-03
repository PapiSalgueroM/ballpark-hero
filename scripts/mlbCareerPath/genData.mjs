// Write src/data/baseballCareerPlayers.ts from the committed record alone.
import fs from 'node:fs';
const rec = JSON.parse(fs.readFileSync(new URL('../data/mlbCareerPathVerified2026-10.json', import.meta.url), 'utf8'));
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const arr = (a) => `[${a.map(q).join(', ')}]`;
let out = `export interface BaseballCareerPlayer {
  name: string;
  position: string;
  draftInfo: string;
  firstTeam: string;
  teams: string[];
  stats: string[];
  awards: string[];
  /** franchises, not club names: the Brooklyn and Los Angeles Dodgers count once (the record's teams.franchises) */
  franchiseCount: number;
}

export interface BaseballCareerPuzzle {
  id: string;
  player: BaseballCareerPlayer;
}

// Round 924: every line below comes from scripts/data/mlbCareerPathVerified2026-10.json, where each
// one is read from the league's own data service and from baseball-reference, and ships only where
// the two agree. scripts/simMlbCareerPathFacts.mjs holds this file to that record line for line, so
// edit the record first. A count with a plus is a floor for a player still active.
export const baseballCareerPuzzles: BaseballCareerPuzzle[] = [
`;
for (const p of rec.players) {
  out += `  {
    id: ${q(p.id)},
    player: {
      name: ${q(p.name)},
      position: ${q(p.position.text)},
      draftInfo: ${q(p.draftInfo.text)},
      firstTeam: ${q(p.firstTeam.text)},
      teams: ${arr(p.teams.text)},
      stats: ${arr(p.stats.map((s) => s.text))},
      awards: ${arr(p.awards.map((s) => s.text))},
      franchiseCount: ${p.teams.franchises},
    },
  },
`;
}
out += '];\n';
fs.writeFileSync(new URL('../../src/data/baseballCareerPlayers.ts', import.meta.url), out);
console.log('wrote', rec.players.length);

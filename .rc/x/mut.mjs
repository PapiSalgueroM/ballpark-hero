// Reviewer mutation tool for Round 1549. Applies ONE named mutation to the checkout it runs in.
// Every text mutation asserts its anchor appears exactly once, or exits 7 (a mutation that changed nothing proves nothing).
import fs from 'node:fs';
const which = process.argv[2];
const edit = (file, from, to) => {
  const t = fs.readFileSync(file, 'utf8');
  const n = t.split(from).length - 1;
  if (n !== 1) { console.log(`MUTATION ${which} ABORTED: anchor appears ${n} times in ${file}`); process.exit(7); }
  fs.writeFileSync(file, t.replace(from, to));
  console.log(`MUTATION ${which} applied to ${file}`);
};
const REC = 'scripts/data/nflHigherLowerVerified2026-10.json';
const henrySameHost = (dropFlag) => {
  const j = JSON.parse(fs.readFileSync(REC, 'utf8'));
  const h = j.categories?.rushYds?.players?.['Derrick Henry'];
  if (!h || !Array.isArray(h.src) || h.src.length !== 2) { console.log(`MUTATION ${which} ABORTED: no two source entry for Henry`); process.exit(7); }
  h.src = [h.src[0], 'https://www.nfl.com/players/derrick-henry/stats/'];
  if (dropFlag) { if (!j.perPlayerSources) { console.log(`MUTATION ${which} ABORTED: flag absent`); process.exit(7); } delete j.perPlayerSources; }
  fs.writeFileSync(REC, JSON.stringify(j, null, 1));
  console.log(`MUTATION ${which} applied: Henry's rushing yards now stand on nfl.com twice${dropFlag ? ', and the record no longer sets perPlayerSources' : ''}`);
};
switch (which) {
  case 'm1': edit('src/data/tennisHLPlayers.ts', "TENNIS_HL_THROUGH = 'the 2026 US Open'", "TENNIS_HL_THROUGH = 'the 2026 Wimbledon'"); break;
  case 'm2': edit('src/data/nflHLCategories.ts', "P('Aaron Rodgers', 'QB', 'GB, NYJ, PIT', 66274, 2025)", "P('Aaron Rodgers', 'QB', 'GB, NYJ, PIT', 66274, 2024)"); break;
  case 'm3': henrySameHost(false); break;
  case 'm3b': henrySameHost(true); break;
  case 'm4': edit('src/pages/NbaHigherLower.tsx', '<HigherLowerThrough through={player.lastSeason} />', '<HigherLowerThrough through={player.position} />'); break;
  case 'm5': edit('src/data/f1HLDrivers.ts', "{ name: 'Lewis Hamilton', careerWins: 106,", "{ name: 'Lewis Hamilton', careerWins: 105,"); break;
  case 'm6': edit('src/components/game/HigherLowerThrough.tsx', '`through ${through}`', '`played until ${through}`'); break;
  case 'm7': edit('src/data/nflHLPlayers.ts', "careerTds: 127, lastSeason: 2025", "careerTds: 127, lastSeason: 2024"); break;
  case 'm8': edit('src/data/nbaHLPlayers.ts', "teams: 'BRK, GSW, HOU, OKC, PHO, SEA', careerPoints: 32564, lastSeason: '2025-26'", "teams: 'BRK, GSW, HOU, OKC, PHO, SEA', careerPoints: 32564, lastSeason: '2024-25'"); break;
  default: console.log(`MUTATION ${which} unknown`); process.exit(7);
}

// Reviewer fleet for Round 1328 section D: the builder's own walk with six more careers in place of its three.
// Writes scripts/playCmHubLandingFleet.mjs on the runner only (never committed) and leaves the walk untouched.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('scripts/playCmHubLanding.mjs', 'utf8');
const start = src.indexOf('const CAREERS = [');
const end = src.indexOf('\n];\n', start);
if (start < 0 || end < 0) { console.log('FLEET ABORTED: no CAREERS block'); process.exit(3); }
const fleet = `const CAREERS = [
  { id: 'arsenal-take-s11', size: 's390', seed: 11, era: '2026-27', nation: 'England', league: 'Premier League', club: 'Arsenal', take: true },
  { id: 'celtic-skip-s12', size: 's1280', seed: 12, era: '2026-27', nation: 'Scotland', league: 'Scottish Premiership', club: 'Celtic', take: false },
  { id: 'celta-autumn-s13', size: 's320', seed: 13, era: '2026-27', nation: 'Spain', league: 'La Liga', club: 'Celta Vigo', take: false, entry: 'Autumn' },
  { id: 'everton2005-runin-s14', size: 's390', seed: 14, era: '2005-06', nation: 'England', league: 'Premier League', club: 'Everton', take: true, entry: 'The run-in' },
  { id: 'chelsea-newyear-s15', size: 's1280', seed: 15, era: '2026-27', nation: 'England', league: 'Premier League', club: 'Chelsea', take: false, entry: 'New year' },
  { id: 'liverpool-skip-s16', size: 's320', seed: 16, era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false },
];
`;
writeFileSync('scripts/playCmHubLandingFleet.mjs', src.slice(0, start) + fleet + src.slice(end + 4));
console.log('FLEET WRITTEN: 6 careers');

/* A mutation for a runner: a new career starts without fetching or waiting for its league's fixture list. */
import fs from 'node:fs';
const f = 'src/hooks/useClubManager.ts';
let s = fs.readFileSync(f, 'utf8');
const pairs = [
  ['if (clubName && eraId) ensureRealLeagueFixtures(startFixtureKey(clubName, eraId)).catch(() => undefined);', ''],
  ['if (realLeagueFixturesLoaded(fixtureKey)) { begin(); return; }', 'begin(); return;'],
];
for (const [from, to] of pairs) {
  if (s.split(from).length - 1 !== 1) { console.error('mutStart: anchor not there exactly once: ' + from.slice(0, 50)); process.exit(2); }
  s = s.replace(from, to);
}
fs.writeFileSync(f, s);
console.log('mutStart applied');

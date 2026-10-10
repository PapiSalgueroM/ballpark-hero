/* A mutation for a runner: the start no longer waits for a fixture list whose fetch is still out. */
import fs from 'node:fs';
const f = 'src/hooks/useClubManager.ts';
const s = fs.readFileSync(f, 'utf8');
const from = 'if (!fixtureKey || realLeagueFixturesLoaded(fixtureKey) || !fetching || fetching.key !== fixtureKey) { begin(); return; }';
if (s.split(from).length - 1 !== 1) { console.error('mutNoWait: anchor not there exactly once'); process.exit(2); }
fs.writeFileSync(f, s.replace(from, 'begin(); return;'));
console.log('mutNoWait applied');

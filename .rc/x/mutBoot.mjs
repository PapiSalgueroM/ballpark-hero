/* A mutation for a runner: the boot no longer waits for the saved key's fixture list. */
import fs from 'node:fs';
const f = 'src/hooks/useClubManager.ts';
const s = fs.readFileSync(f, 'utf8');
const from = 'Promise.all([ensureEraRosters(eraId), ensureRealLeagueFixtures(fixtureKey)])', to = 'Promise.all([ensureEraRosters(eraId)])';
if (s.split(from).length - 1 !== 1) { console.error('mutBoot: anchor not there exactly once'); process.exit(2); }
fs.writeFileSync(f, s.replace(from, to));
console.log('mutBoot applied');

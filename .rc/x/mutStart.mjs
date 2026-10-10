/* A mutation for a runner: tapping a club no longer asks for its league's fixture list. */
import fs from 'node:fs';
const f = 'src/hooks/useClubManager.ts';
const s = fs.readFileSync(f, 'utf8');
const from = 'fixtureFetch.current = key && !realLeagueFixturesLoaded(key) ? { key, done: ensureRealLeagueFixtures(key).catch(() => undefined) } : null;';
if (s.split(from).length - 1 !== 1) { console.error('mutStart: anchor not there exactly once'); process.exit(2); }
fs.writeFileSync(f, s.replace(from, 'fixtureFetch.current = null;'));
console.log('mutStart applied');

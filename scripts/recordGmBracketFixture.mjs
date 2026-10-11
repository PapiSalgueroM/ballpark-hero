/* Round 1224: records scripts/data/gmBracketFixture.json, what the NFL Front
 * Office engine's ONE PRESS postseason (`runPlayoffs`, src/lib/frontOffice.ts)
 * plays over the fleet of scripts/lib/gmGameDayFleet.mjs: for every season the
 * fourteen seeds, the thirteen games in the engine's order with their scores,
 * the champion, a hash of the generator's next 64 draws and a hash of the 32
 * records after it.
 *
 * WHY IT IS RECORDED. Round 1224 writes the same bracket a second time, as
 * data a GM can play a round at a time (src/lib/gmBracket.ts over
 * src/lib/finalsBracket.ts, src/data/gmBrackets/nfl.ts). Section 4 of
 * scripts/simGmGameDay.mjs holds that second writing to the engine live, and
 * to THIS file, so a later edit to either writing, or to finalsBracket.ts, is
 * seen by a fence that does not move with it. A change that is meant must
 * record this file again in the same commit and say why.
 *
 * It bundles only the engine and its rosters: none of the round's new files.
 * So it runs on the commit before the round as well as after it, and the two
 * files must be the same bytes (the round's notes name the runner results).
 *
 * The file holds a digest a seed set over all 80 of its seasons, and the
 * first three seasons of each league kind in full, to point at a mismatch.
 * It also holds, under `inputs`, the hash of every file the record was taken
 * from (what the engine bundle read, by esbuild's own account, and the
 * fleet), so that when a digest moves the harness can name the files that
 * changed: a roster refresh moves this record as surely as the engine does.
 *
 * Run: node scripts/recordGmBracketFixture.mjs
 *   GM_BRACKET_FIXTURE_OUT=<path>   write somewhere else (a runner's $RC_OUT, a scratch folder)
 *   GM_BRACKET_FIXTURE_COMMIT=<id>  the commit the engine was read at, written into the file
 * It reads no network and no clock, and prints its last line when the file is written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ENGINE_ENTRY, FLEET, FLEET_FILE, NEXT_DRAWS, ROOT, bundle, enginePostseason, playRegularSeason, readSrc, seasonId, sha1 } from './lib/gmGameDayFleet.mjs';

const OUT = process.env.GM_BRACKET_FIXTURE_OUT || path.join(ROOT, 'scripts', 'data', 'gmBracketFixture.json');
const KEPT_A_KIND = 3;
const git = cmd => { try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };

const { M, inputs } = await bundle(ENGINE_ENTRY, [], 'record');
const sets = {};
let seasons = 0;
for (const set of FLEET.sets) {
  const lines = [];
  const kept = [];
  for (const kind of FLEET.kinds) {
    for (let i = 0; i < FLEET.perKind; i += 1) {
      const season = playRegularSeason(M, set, kind, i);
      const post = enginePostseason(M, season);
      const row = { id: seasonId(set, kind, i), user: season.user, ...post };
      if (row.games.length !== 13) { console.error(`recordGmBracketFixture: ${row.id} played ${row.games.length} playoff games, not 13: refusing to record`); process.exit(1); }
      lines.push(JSON.stringify(row));
      if (i < KEPT_A_KIND) kept.push(row);
      seasons += 1;
    }
  }
  sets[set] = { seasons: lines.length, digest: sha1(lines.join('\n')), kept };
}

const fixture = {
  what: 'The NFL Front Office engine one press postseason (runPlayoffs) over the fleet of scripts/lib/gmGameDayFleet.mjs. Recorded by scripts/recordGmBracketFixture.mjs; read by scripts/simGmGameDay.mjs section 4.',
  commit: process.env.GM_BRACKET_FIXTURE_COMMIT || git('rev-parse HEAD'),
  /* every file whose bytes can move this record, each with the hash it had when the record was taken: what the engine
     bundle read by esbuild's own account (the engine, its rosters and everything they import) and the fleet that
     plays it. When the digests below move, scripts/simGmGameDay.mjs names the ones of these that changed. */
  inputs: Object.fromEntries([...new Set([...inputs, FLEET_FILE])].sort().map(rel => [rel, sha1(readSrc(rel))])),
  fleet: { ...FLEET, nextDraws: NEXT_DRAWS },
  sets,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(fixture, null, 1)}\n`);
console.log(`recordGmBracketFixture: ${seasons} seasons over ${FLEET.sets.length} seed sets, ${seasons * 13} playoff games, written to ${OUT}`);

/* Round 1013: writes src/data/soccerCareerClubPool.ts, Soccer Career's clubs
   generated from Club Manager's leagues (rules and the table of leagues in
   scripts/lib/careerClubPool.mjs). Round 1100: every current Club Manager
   league, the league ladders the finish band reads, and the first season the
   game offers each club it brought in.

   Run: node scripts/genCareerClubPool.mjs
   Nothing runs it for you. Rerun it after ANY change to the REAL_LEAGUES
   rows in src/lib/clubManager.ts, to CM_ROSTERS or CM_PARTIAL (a strength
   change can move a tier or a ladder place), to CLUB_COLORS, or to clubSince
   in scripts/data/soccerCareerFacts.json, and commit the file.
   scripts/simCareerClubPool.mjs section 1 fails while it is stale.

   It bundles the engine with the generated pool stubbed out, so it runs from
   nothing: no generated file, or a broken one.

   Memberships: every league read has a leagueWorld row in
   scripts/data/soccerCareerFacts.json, its 2026-27 lineup read from two hosts
   (ESPN's standings feed and BBC Sport's table for most; the row names both)
   and equal to Club Manager's REAL_LEAGUES club for club. The four leagues
   of Round 1013 were first verified 2026-10-05 (ESPN with premierleague.com,
   Sky Sports, laliga.com and the CBF). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleCareerSources, deriveCareerClubPool, poolInputs, renderPoolFile, sinceInput } from './lib/careerClubPool.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'soccerCareerClubPool.ts');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };

const tmpDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'genpool-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const mod = await bundleCareerSources({ root: ROOT, tmpDir, stubPool: true });
const { rows, table, ladder, poolSince } = deriveCareerClubPool({ ...poolInputs(mod), since: sinceInput(ROOT) });
fs.writeFileSync(OUT, renderPoolFile(rows, mod.CM_ROSTER_META, ladder, poolSince));
const byTier = [1, 2, 3, 4].map(t => `t${t} ${rows.filter(r => r.tier === t).length}`).join(', ');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${rows.length} clubs (${byTier}); ${table.filter(t => t.hand).length} already hand rows; ${Object.keys(ladder).length} league ladders; ${Object.keys(poolSince).length} clubs not offered in every era`);
/* the tier rule's work, league by league, for whoever reviews a regenerate */
if (process.argv.includes('--table')) {
  for (const [label, groups] of Object.entries(ladder)) console.log(`${label}: ${groups.map(g => (g.length === 1 ? g[0] : `{${g.join(', ')}}`)).join(' > ')}`);
  for (const t of table.filter(x => !x.hand && x.tier < 4)) console.log(`  above tier 4: ${t.name} (${t.league}) XI ${t.xi} tier ${t.tier}`);
}

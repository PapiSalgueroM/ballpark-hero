/* Round 1013: writes src/data/soccerCareerClubPool.ts, Soccer Career's clubs
   generated from Club Manager's Premier League, Championship, La Liga and
   Brasileirao (rules in scripts/lib/careerClubPool.mjs).

   Run: node scripts/genCareerClubPool.mjs
   Nothing runs it for you. Rerun it after ANY change to those four
   REAL_LEAGUES rows in src/lib/clubManager.ts, to CM_ROSTERS or CM_PARTIAL
   (a strength change can move a tier), or to CLUB_COLORS, and commit the
   file. scripts/simCareerClubPool.mjs section 1 fails while it is stale.

   It bundles the engine with the generated pool stubbed out, so it runs from
   nothing: no generated file, or a broken one.

   Memberships verified 2026-10-05, two source families each:
   Premier League 2026-27, ESPN's standings (espn.com/soccer/standings/_/league/eng.1)
     and premierleague.com (news 4673099, Coventry, Ipswich and Hull up;
     Wolves, Burnley and West Ham down).
   Championship 2026-27, ESPN (league/eng.2) and Sky Sports (skysports.com/championship-table).
   La Liga 2026-27, ESPN (league/esp.1) and laliga.com (laliga-easports/standing).
   Brasileirao Serie A 2026, ESPN (league/bra.1) and the CBF
     (cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026).
   All four match Club Manager's REAL_LEAGUES club for club. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleCareerSources, deriveCareerClubPool, poolInputs, renderPoolFile } from './lib/careerClubPool.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'soccerCareerClubPool.ts');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };

const tmpDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'genpool-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const mod = await bundleCareerSources({ root: ROOT, tmpDir, stubPool: true });
const { rows, table } = deriveCareerClubPool(poolInputs(mod));
fs.writeFileSync(OUT, renderPoolFile(rows, mod.CM_ROSTER_META));
const byTier = [1, 2, 3, 4].map(t => `t${t} ${rows.filter(r => r.tier === t).length}`).join(', ');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${rows.length} clubs (${byTier}); ${table.filter(t => t.hand).length} already hand rows`);

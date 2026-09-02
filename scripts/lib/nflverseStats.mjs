/* nflverse player stats, fetched from the documented release and cached.

   Round 416. The site's own nflfastr_player_stats table ends with the 2024
   season, so rating a 2026 roster from it would be two years stale. The
   nflverse-data release tagged "stats_player" publishes one CSV per season
   built by nflfastR's own calculate_stats(), and stats_player_regpost_2025
   was refreshed 2026-08-13. This module downloads a season into
   scripts/.cache/nflverse/ (gitignored), retries a flaky pull, and parses it
   with the same small CSV reader the roster loader uses.

   Nothing here decides a rating. The rules live in
   scripts/genFrontOfficeRoster.mjs.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, CACHE_DIR } from './nflverseRosters.mjs';

export const STATS_RELEASE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/stats_player';

/** One season of player stats. kind is 'reg' or 'regpost'. */
export async function fetchSeasonStats(season, { kind = 'regpost', log = () => {} } = {}) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const name = `stats_player_${kind}_${season}.csv`;
  const file = path.join(CACHE_DIR, name);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) {
    const url = `${STATS_RELEASE_URL}/${name}`;
    let last = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'douknowball-front-office (contact: douknowball1@gmail.com)' }, redirect: 'follow' });
        if (!res.ok) last = `HTTP ${res.status}`;
        else {
          const text = await res.text();
          if (text.length < 1000 || !text.startsWith('player_id,')) last = 'not a stats csv';
          else { fs.writeFileSync(file, text); log(`fetched ${name} (${text.length} bytes)`); break; }
        }
      } catch (err) { last = String(err).slice(0, 100); }
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      if (attempt === 3) throw new Error(`nflverse ${name} could not be fetched: ${last}`);
    }
  }
  const text = fs.readFileSync(file, 'utf8');
  return { rows: parseCsv(text), bytes: text.length, file };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STATS_LIB = HERE;

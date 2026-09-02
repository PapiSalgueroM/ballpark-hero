/* nflverse season rosters, fetched from the documented release and cached.

   Round 404. The nflverse-data GitHub release tagged "rosters" publishes one
   CSV per season from 1920 (roster_YYYY.csv), the same feed the site's
   nflfastr_rosters table came from for 2002 onward. This module downloads a
   season file into scripts/.cache/nflverse/ (gitignored), retries a flaky
   pull, parses the CSV with quotes honoured, and records the asset size so
   the generator can write what it read into the key's provenance.

   Nothing here decides a fact. The rules live in scripts/genNflGridData.mjs.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE_DIR = path.join(ROOT, 'scripts', '.cache', 'nflverse');
export const RELEASE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters';

export async function fetchSeasonRoster(season, { log = () => {} } = {}) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `roster_${season}.csv`);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) {
    const url = `${RELEASE_URL}/roster_${season}.csv`;
    let last = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'douknowball-nfl-grid-key (contact: douknowball1@gmail.com)' }, redirect: 'follow' });
        if (!res.ok) { last = `HTTP ${res.status}`; }
        else {
          const text = await res.text();
          if (text.length < 1000 || !text.startsWith('season,')) { last = 'not a roster csv'; }
          else { fs.writeFileSync(file, text); log(`fetched roster_${season}.csv (${text.length} bytes)`); break; }
        }
      } catch (err) { last = String(err).slice(0, 100); }
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      if (attempt === 3) throw new Error(`nflverse roster_${season}.csv could not be fetched: ${last}`);
    }
  }
  const text = fs.readFileSync(file, 'utf8');
  return { rows: parseCsv(text), bytes: text.length, file };
}

/** A small CSV parser: commas, double quotes, doubled quotes inside quotes, CRLF or LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] === 'NA' ? '' : (r[i] ?? '')])));
}

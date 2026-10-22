/* Review probe (Round 1524, read lens): what league does a club for sale carry on its tile, against the
   game's own ledgers, for purchases before LIST_SEASON. Read only: bundles the head's sources, no network. */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-sale-'));
const R = p => path.join(ROOT, p).split(path.sep).join('/');
const ENTRY = path.join(tmp, 'e.mjs');
const OUT = path.join(tmp, 'b.mjs');
fs.writeFileSync(ENTRY, [
  "globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };",
  `export * as engine from '${R('src/lib/soccerCareerEngine.ts')}';`,
  `export * as owner from '${R('src/lib/soccerCareerOwner.ts')}';`,
  `export * as league from '${R('src/lib/soccerCareerLeague.ts')}';`,
].join('\n'));
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { engine: E, owner: O, league: L } = await import(pathToFileURL(OUT).href);
await E.loadOwnerTail();
const CLUBS = E.FALLBACK_CLUBS;
const byName = new Map(CLUBS.map(c => [c.name, c]));
const YEARS = [];
for (let y = 1995; y <= 2027; y += 1) YEARS.push(y);
let tiles = 0, pre = 0, fallback = 0, contradicted = 0, keyNotName = 0;
const exContra = new Map(), exKey = new Map(), exFallbackOther = new Map();
for (const year of YEARS) {
  for (let k = 0; k < 120; k += 1) {
    const list = O.ownerClubsForSale({ clubs: CLUBS, year, netWorth: 1000, key: `probe|${k}` });
    for (const t of list) {
      tiles += 1;
      if (year >= 2026) continue;
      pre += 1;
      const club = byName.get(t.name) ?? { name: t.name, league: t.league };
      const keyY = L.leagueKeyInYear(club, year);
      const nameY = L.leagueInYear(club, year);
      if (keyY === null) {
        fallback += 1;
        if (L.ledgerLeague(t.league, year)) {
          contradicted += 1;
          const id = `${t.name}|${year}`;
          if (!exContra.has(id)) exContra.set(id, `${year}: ${t.name} shown as "${t.league} · Tier ${t.tier}", the game's ledger for ${t.league} ${year} does not hold it`);
        } else {
          const id = `${t.name}`;
          if (!exFallbackOther.has(id)) exFallbackOther.set(id, `${year}: ${t.name} shown as "${t.league}" (today's label; no ledger for that league)`);
        }
      } else if (nameY !== null && nameY !== t.league) {
        keyNotName += 1;
        const id = `${t.name}|${year}`;
        if (!exKey.has(id)) exKey.set(id, `${year}: ${t.name} shown as "${t.league}", the season's name is "${nameY}"`);
      }
    }
  }
}
console.log(`tiles ${tiles}; before 2026 ${pre}; fallback to today's label ${fallback}; of those contradicted by the game's own ledger ${contradicted}; key shown where the season had another name ${keyNotName}`);
console.log(`distinct contradicted club-years ${exContra.size}; distinct key-not-name club-years ${exKey.size}; distinct clubs on today's label outside the ledgers ${exFallbackOther.size}`);
console.log('CONTRADICTED (first 25):');
for (const s of [...exContra.values()].slice(0, 25)) console.log('  ' + s);
console.log('KEY NOT NAME (first 12):');
for (const s of [...exKey.values()].slice(0, 12)) console.log('  ' + s);
console.log('TODAY LABEL OUTSIDE LEDGERS (first 12):');
for (const s of [...exFallbackOther.values()].slice(0, 12)) console.log('  ' + s);
/* the first season after buying a contradicted club: what the table and the save say */
const first = [...exContra.keys()][0];
if (first) {
  const [name, y] = first.split('|');
  const year = Number(y);
  for (let k = 0; k < 120; k += 1) {
    const list = O.ownerClubsForSale({ clubs: CLUBS, year, netWorth: 1000, key: `probe|${k}` });
    const t = list.find(c => c.name === name);
    if (!t) continue;
    const os = O.ownerStart(t);
    const r = O.playOwnerSeason({ ...os, plan: 'squad' }, { clubs: CLUBS, year, key: `probe|${k}|s1` });
    const row = r.os.seasonResults[0];
    const w = L.dugoutTableWords(row);
    console.log(`FIRST SEASON of ${name} bought in ${year}: saved league "${os.league}", row league ${row.league ?? 'none'}, lineupUnknown ${row.lineupUnknown ?? false}, header "${w.header}", line "${row.result}"`);
    break;
  }
}
console.log('probe done');

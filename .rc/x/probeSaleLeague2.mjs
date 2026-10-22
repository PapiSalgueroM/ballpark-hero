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
for (let y = Number(process.env.Y0 || 1995); y <= Number(process.env.Y1 || 2027); y += 1) YEARS.push(y);
let tiles = 0, pre = 0, fallback = 0, contradicted = 0, keyNotName = 0;
const exContra = new Map(), exKey = new Map(), exFallbackOther = new Map(), perYear = new Map();
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
          perYear.set(year, (perYear.get(year) ?? 0) + 1);
          if (![...exContra.keys()].some(x => x.endsWith(`|${year}`)) || (exContra.size < 40 && ![...exContra.keys()].some(x => x.startsWith(`${t.name}|`)))) exContra.set(id, `${year}: ${t.name} shown as "${t.league} · Tier ${t.tier}", the game's ledger for ${t.league} ${year} does not hold it`);
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
console.log(`contradicted tiles per year: ${[...perYear].map(([y, n]) => `${y}:${n}`).join(' ')}`);
console.log('CONTRADICTED (first 45):');
for (const s of [...exContra.values()].slice(0, 45)) console.log('  ' + s);
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
/* when do real careers reach the door: the purchase year and net worth by start year (seeded, 3 careers each) */
if (process.env.ERAS) {
  const REAL = Math.random;
  const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const out = [];
  for (const start of [1990, 1995, 2000, 2005, 2010]) {
    for (let s = 1; s <= 3; s += 1) {
      Math.random = mulberry32(start * 10 + s);
      try {
        let c = E.initCareer(`Probe ${start}-${s}`, 'England', ['ST', 'CM', 'CB'][s - 1], 'x', flat(78), 78, start, CLUBS, null, 92);
        for (let g = 0; !c.retired && g < 40; g += 1) {
          if (c.phase === 'retirement_suggestion') c = E.acceptRetirementSuggestion(c);
          else c = c.phase === 'youth' ? E.advanceYouthYear(c, CLUBS) : E.advanceProSeason(c, CLUBS);
          if (c.transferSituation) c = { ...c, transferSituation: null };
        }
        const buyYear = (c.seasons[c.seasons.length - 1]?.year ?? 0) + 1;
        const list = O.ownerClubsOnSale({ ...c, netWorth: Math.max(c.netWorth, 300) }, CLUBS);
        const bad = list.filter(t => L.leagueKeyInYear(t, buyYear) === null && L.ledgerLeague(t.league, buyYear)).map(t => `${t.name} as ${t.league}`);
        out.push(`start ${start}: buys in ${buyYear}, net worth ${Math.round(c.netWorth)}M, ${list.length} for sale, contradicted ${bad.length}${bad.length ? ` (${bad.join(', ')})` : ''}`);
      } catch (e) { out.push(`start ${start}: ${e.message}`); } finally { Math.random = REAL; }
    }
  }
  for (const l of out) console.log('  ' + l);
}
console.log('probe done');

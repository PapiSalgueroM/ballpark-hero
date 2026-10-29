/* Round 1571: writes src/data/bingoClubAdditions.json from the verified record
   scripts/data/bingoClubAdditions-2026-10.json. Derived, never typed: the
   JSON is only ever written by this script (simBingoClubCounts section 6
   fails on a hand edit).

   Output: { rules: { aliases, reserves }, add: [{ n, nat, by, pos, clubs }],
   partial: [names] }, the additions sorted by name, two space JSON, LF.

   It refuses (exit 1, nothing written) an addition that would make a man
   count one club twice (critic correction 6): a club whose key equals a club
   he already has under any spelling or any part of a mid season "A / B" row
   (split both on the spaced slash the count uses and on the bare slash
   clubYears uses), and a club that is a reserve side.

   Run: node scripts/genBingoClubAdditions.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = 'scripts/data/bingoClubAdditions-2026-10.json';
export const DERIVED = 'src/data/bingoClubAdditions.json';

/* The same folding as clubKey in src/lib/whoAmI.ts for the refusal check
   (accents and case; the generator never needs the placeholder list). */
const fold = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function buildDerived(record) {
  const counting = record.counting ?? { aliases: [], reserves: [] };
  const aliases = Object.fromEntries((counting.aliases ?? []).map(a => [a.from, a.to]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  const reserves = (counting.reserves ?? []).map(r => r.key).sort();
  const as = k => aliases[k] ?? k;
  const refusals = [];
  const add = [];
  for (const e of record.additions) {
    const held = new Set();
    for (const t of e.tableClubs ?? []) {
      for (const part of [...fold(t).split(' / '), ...fold(t).split('/')]) {
        const k = part.trim();
        if (k) held.add(as(k));
      }
    }
    const clubs = [];
    for (const c of e.clubs) {
      const k = as(fold(c.club));
      if (held.has(k)) refusals.push(`${e.name}: ${c.club} is already one of his table clubs (${[...held].join(', ')})`);
      else if (reserves.includes(fold(c.club))) refusals.push(`${e.name}: ${c.club} is a reserve side`);
      else if (clubs.includes(c.club)) refusals.push(`${e.name}: ${c.club} is listed twice`);
      else clubs.push(c.club);
    }
    if (clubs.length) add.push({ n: e.name, nat: e.nationality, by: e.birthYear, pos: e.position, clubs });
  }
  add.sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
  const partial = record.partial.map(p => p.name).sort();
  return { text: JSON.stringify({ rules: { aliases, reserves }, add, partial }, null, 2) + '\n', refusals };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), 'utf8'));
  const { text, refusals } = buildDerived(record);
  if (refusals.length) {
    for (const r of refusals) console.error('REFUSED: ' + r);
    process.exit(1);
  }
  fs.writeFileSync(path.join(ROOT, DERIVED), text);
  const out = JSON.parse(text);
  console.log(`genBingoClubAdditions: wrote ${DERIVED} (${out.add.length} men, ${out.add.reduce((n, a) => n + a.clubs.length, 0)} clubs, ${Object.keys(out.rules.aliases).length} aliases, ${out.rules.reserves.length} reserve sides, ${out.partial.length} partial)`);
}

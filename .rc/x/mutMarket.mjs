/* Release AZ fix pass 4, a MEASUREMENT only (never committed): what the market would do if my own club were
 * read from my squad there too (closing check finding 2, worldMarket line 410). In a seeded career, worldMarket
 * lists no man at my own club (buildMarket drops every man of my squad anyway); an unseeded career is untouched.
 * Run inside a throwaway worktree: node mutMarket.mjs <worktree root>. Fails closed on each anchor. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? process.cwd();
const file = path.join(root, 'src/lib/clubManager.ts');
let src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const edits = [
  ['  if (!held) return fallback;\n',
   '  if (!held) return worldSeedOf(career) === undefined ? fallback : fallback.filter(p => p.club !== career.clubName);\n'],
  ['  for (const club of clubs) {\n    for (const p of worldRosterFor(current, club)) out.push(',
   '  for (const club of clubs) {\n    if (club === current.clubName) continue;\n    for (const p of worldRosterFor(current, club)) out.push('],
  ['  if (hit && hit.years === years && hit.year === year && hit.start === current.startYear && hit.era === current.eraId && hit.seed === seed) return hit.out;\n',
   '  if (hit && hit.years === years && hit.year === year && hit.start === current.startYear && hit.era === current.eraId && hit.seed === seed && hit.club === current.clubName) return hit.out;\n'],
  ['  WORLD_MARKET_MEMO.set(raw, { years, year, start: current.startYear, era: current.eraId, seed, out });\n',
   '  WORLD_MARKET_MEMO.set(raw, { years, year, start: current.startYear, era: current.eraId, seed, out, club: current.clubName });\n'],
  ['const WORLD_MARKET_MEMO = new WeakMap<object, { years: number; year: number; start: unknown; era: unknown; seed: number | undefined; out: MarketPlayer[] }>();',
   'const WORLD_MARKET_MEMO = new WeakMap<object, { years: number; year: number; start: unknown; era: unknown; seed: number | undefined; out: MarketPlayer[]; club?: string }>();'],
];
for (const [from, to] of edits) {
  const count = src.split(from).length - 1;
  if (count !== 1) { console.error(`mutMarket: anchor found ${count} times: ${from.slice(0, 70)}`); process.exit(2); }
  src = src.replace(from, to);
}
fs.writeFileSync(file, src);
console.log('mutMarket: my own club lists nobody in a seeded career market (5 edits applied)');

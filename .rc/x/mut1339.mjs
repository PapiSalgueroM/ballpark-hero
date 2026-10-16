// Reviewer mutation script for Round 1339 (run on a GitHub runner only, restored by the request line).
// node .rc/x/mut1339.mjs <m1|m2|m3|m4>   exits 9 unless the anchor stands exactly once.
import fs from 'node:fs';
const FILE = 'src/lib/clubManager.ts';
const M = {
  // m1, dropped filter: the unseeded no ledger branch returns the whole projected world again.
  m1: ['  if (!held) return fallback.filter(p => p.club !== career.clubName);\n',
       '  if (!held) return fallback;\n'],
  // m2, swapped arms: the old condition comes back the wrong way round (unseeded filtered, seeded not).
  m2: ['  if (!held) return fallback.filter(p => p.club !== career.clubName);\n',
       '  if (!held) return worldSeedOf(career) !== undefined ? fallback : fallback.filter(p => p.club !== career.clubName);\n'],
  // m3, the feed bypasses the market: generateHeadlines draws from the projected world minus my squad by name.
  m3: ['function generateHeadlines(state: CareerState): void {\n  const market = buildMarket(state);\n',
       'function generateHeadlines(state: CareerState): void {\n  const market = marketBase(yearsOn(state), state.eraId, worldSeedOf(state)).filter(p => !state.squad.some(q => q.name === p.name));\n'],
  // m4, the ledger path forgets my club: the seeded loop no longer skips the managed club.
  m4: ['    if (club === current.clubName) continue;\n',
       '    if (club === current.clubName && false) continue;\n'],
};
const which = process.argv[2];
if (!M[which]) { console.log(`mut1339: unknown mutation ${which}`); process.exit(9); }
const raw = fs.readFileSync(FILE, 'utf8');
const text = raw.split('\r\n').join('\n');
const [from, to] = M[which];
const count = text.split(from).length - 1;
if (count !== 1) { console.log(`mut1339 ${which}: anchor stands ${count} times in ${FILE}, want 1`); process.exit(9); }
fs.writeFileSync(FILE, text.replace(from, () => to));
console.log(`mut1339 ${which}: applied once to ${FILE}`);

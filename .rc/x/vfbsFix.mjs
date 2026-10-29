// Applies the sketched fix for BS-sc418-1 on the runner only: the chooser and the
// appointment both read the era filtered pool for the first manager season.
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/lib/soccerCareerCoachingStart.ts';
let src = readFileSync(path, 'utf8');
const edits = [
  ["import type { CareerState, ClubData } from './soccerCareerEngine';\n",
   "import type { CareerState, ClubData } from './soccerCareerEngine';\nimport { adjustClubsForYear } from './careerEras';\n"],
  ["function rank(text: string): number {",
   "function eraPool(state: CareerState, clubs: readonly ClubData[]): ClubData[] {\n  const year = (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1;\n  return adjustClubsForYear(clubs.filter(club => !!club && typeof club === 'object'), year);\n}\nfunction rank(text: string): number {"],
  ["  if (!firstEntry(state)) return [];\n",
   "  if (!firstEntry(state)) return [];\n  clubs = eraPool(state, clubs);\n"],
  ["  const current = clubs.filter(club => club && club.id === quote.clubId);",
   "  const current = eraPool(state, clubs).filter(club => club && club.id === quote.clubId);"],
];
for (const [from, to] of edits) {
  if (!src.includes(from)) { console.error('FIX ABORT: anchor missing: ' + from.slice(0, 60)); process.exit(2); }
  src = src.replace(from, to);
}
writeFileSync(path, src);
console.log('FIX APPLIED edits=' + edits.length);

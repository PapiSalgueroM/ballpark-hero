/* Round 1226, attribution: put the typed constants back into the two career
   engines (in this checkout only), so a recording taken before the round can
   be replayed. usage: node revert.mjs all | nhl | mlb | mlb-length | mlb-october | mlb-avg
   Every anchor must be there exactly once, or the script stops with exit 2. */
import { readFileSync, writeFileSync } from 'node:fs';
const what = process.argv[2] || 'all';
const CR = String.fromCharCode(13); const NL = String.fromCharCode(10);
function edit(f, pairs) {
  let s = readFileSync(f, 'utf8'); const crlf = s.includes(CR); s = s.split(CR).join('');
  for (const [a, b] of pairs) {
    if (s.split(a).length !== 2) { console.error('REVERT ABORTED: ' + f + ' does not hold once: ' + a.slice(0, 90)); process.exit(2); }
    s = s.replace(a, () => b);
  }
  writeFileSync(f, crlf ? s.split(NL).join(CR + NL) : s);
}
const NHL = [["const slate = seasonLength('nhl', c.year, c.team);", "const slate = US_ENGINE_SEASON.nhl;"]];
const MLB_LENGTH = [["const slate = seasonLength('mlb', c.year, c.team);", "const slate = US_ENGINE_SEASON.mlb;"]];
const MLB_OCTOBER = [
  ["import { seasonSwing, swingNote, playoffDepthOf, clutchSwing, clutchNote } from './careerVariance';", "import { seasonSwing, swingNote, playoffDepthOf, playoffGames, clutchSwing, clutchNote } from './careerVariance';"],
  ["result = stages[postseasonRung('mlb', c.year, stage)];", "result = ladder[stage];"],
  ["const poG = playoffRunGames('mlb', c.year, depth, rng);", "const poG = playoffGames(depth, rng, 'mlb');"],
];
const MLB_AVG = [
  ["const hits = Math.max(hr, Math.round(ab * drawn));", "const hits = Math.round(ab * drawn);"],
  ["(.${String(Math.round(shown * 1000)).padStart(3, '0')})", "(${drawn.toFixed(3)})"],
];
if (what === 'all' || what === 'nhl') edit('src/lib/nhlMyCareer.ts', NHL);
if (what === 'all' || what === 'mlb' || what === 'mlb-length') edit('src/lib/mlbMyCareer.ts', MLB_LENGTH);
if (what === 'all' || what === 'mlb' || what === 'mlb-october') edit('src/lib/mlbMyCareer.ts', MLB_OCTOBER);
if (what === 'all' || what === 'mlb' || what === 'mlb-avg') edit('src/lib/mlbMyCareer.ts', MLB_AVG);
console.log('reverted: ' + what);

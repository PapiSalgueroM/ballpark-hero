// Release AU, ATTRIBUTION ARMS for a runner's throwaway checkout only (the request line restores src after each).
// PR216 adds two fields to a Soccer Career save: a simplified opening cup tie on a new row from 2026
// (row.cupRun.opening) and the receipt of a chance (state.chanceWheel). A harness of the release line that compares
// whole saves with an engine from before PR216 sees both. Each mode takes ONE of the two additions out, at the one
// line PR216 itself uses as its switch, and nothing else, so a harness that turns green names its cause.
//   noopening  src/lib/soccerCareerEngine.ts: "includeOpening: true," becomes "includeOpening: false,"
//              (the same edit scripts/simCareerProgramme.mjs makes for its own compatibility arm)
//   nowheel    src/lib/careerChanceWheel.ts: the line that stores the receipt is removed (the draw and its result stay)
// usage: node .rc/x/mutAU.mjs noopening [nowheel]
import fs from 'node:fs';
const MODES = {
  noopening: ['src/lib/soccerCareerEngine.ts', 'includeOpening: true,', 'includeOpening: false,'],
  nowheel: ['src/lib/careerChanceWheel.ts', '  state.chanceWheel = { title, chance, roll, hit, miss, result, seen: false };\n', ''],
};
const asked = process.argv.slice(2);
if (!asked.length || asked.some(m => !MODES[m])) { console.error('usage: mutAU.mjs noopening|nowheel ...'); process.exit(2); }
for (const m of asked) {
  const [file, from, to] = MODES[m];
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  if (src.split(from).length !== 2) { console.error(`mutAU ${m}: ABORTED, the anchor must be in ${file} exactly once`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`mutAU ${m}: applied to ${file}`);
}

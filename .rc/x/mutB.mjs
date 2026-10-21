// Reviewer mutation for Round 1530 (simCareerHall 19 (a)). Runs on the runner only, from the repo root.
// Modes:
//   te       : football tight ends gain fewer yards a catch (9 + rng*3.5 becomes 8.3 + rng*3.5), a plausible
//              engine regression in the stat the TE base credit reads most (recYds, half its share).
//   newline  : basketball's newLinePts (the base term of every position) is summed at 0.92 of the points, a
//              stale scale factor that leaves pts, and so the marks, untouched.
// Each replace asserts its anchor and that the file changed; restore with git checkout -- src.
import fs from 'node:fs';

const swap = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(from)) { console.error(`mutB: anchor not found in ${file}: ${from}`); process.exit(9); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`mutB: no change in ${file}`); process.exit(9); }
  fs.writeFileSync(file, out);
  console.log(`mutB: ${file} mutated (${from} -> ${to})`);
};
const mode = process.argv[2];
if (mode === 'te') swap('src/lib/nflMyCareer.ts', 'Math.round((line.rec ?? 0) * (9 + rng() * 3.5))', 'Math.round((line.rec ?? 0) * (8.3 + rng() * 3.5))');
else if (mode === 'newline') swap('src/lib/nbaMyCareer.ts', 'if (isNbaNewLine(s)) newLine += s.ppg * s.games;', 'if (isNbaNewLine(s)) newLine += s.ppg * s.games * 0.92;');
else { console.error(`mutB: unknown mode ${mode}`); process.exit(9); }

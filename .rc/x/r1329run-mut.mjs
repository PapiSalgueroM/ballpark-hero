// Reviewer mutation applier (r1329-run). Applies ONE named mutation to the runner's checkout.
// The caller restores the tree with git checkout -- src scripts in the same request line.
import fs from 'node:fs';
const MUTS = {
  // M1 stale constant: the 2025-26 season counted as the game's future
  M1: ['src/lib/soccerWorldTruth.ts', 'export const LAST_PLAYED_SEASON = 2025;', 'export const LAST_PLAYED_SEASON = 2024;'],
  // M2 dropped filter: real men no longer re-seated at their era club each season (seeded once, as the base did)
  M2: ['src/lib/soccerPhone.ts', 'for (const st of stars) if (realNames || !p.clubs[st.name]) p.clubs[st.name] = st.club;', 'for (const st of stars) if (!p.clubs[st.name]) p.clubs[st.name] = st.club;'],
  // M3 off by one in the legacy draws: the 35 goal guarantee loop forgotten
  M3: ['src/lib/soccerCareerEngine.ts', '    if (goals >= 35) for (; won < 7; won += 1) total += rand(0, 9 - won);\n', ''],
  // M4 swapped gate: move and scorer questions gated on seasonHappened, not on LAST_REAL_YEAR
  M4: ['src/lib/soccerArcade.ts', '    if (w.year > LAST_REAL_YEAR && w.moves.length >= 1) {', '    if (!seasonHappened(w.year) && w.moves.length >= 1) {'],
  // M5 off by one season label: the feed treats season Y as Y-1 (2025-26 printed as the future)
  M5: ['src/lib/soccerPhone.ts', '  const happened = seasonHappened(year);', '  const happened = seasonHappened(year - 1);'],
  // M6 the quiz's world gate off by one (2025-26 asked about as the future)
  M6: ['src/lib/soccerArcade.ts', '  if (w && !seasonHappened(w.year)) {', '  if (w && !seasonHappened(w.year - 1)) {'],
  // M7 engine log: the summer label confused with the next year
  M7: ['src/lib/soccerCareerEngine.ts', '  if (tournamentWinnerShown(year, eligible ? t.myResult : "")) {', '  if (tournamentWinnerShown(year + 1, eligible ? t.myResult : "")) {'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`MUTATION ABORT: unknown ${name}`); process.exit(2); }
const [file, from, to] = m;
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.replace(/\r\n/g, '\n');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`MUTATION ABORT: ${name} text found ${hits} times in ${file}`); process.exit(2); }
src = src.replace(from, () => to);
fs.writeFileSync(file, crlf ? src.replace(/\n/g, '\r\n') : src);
console.log(`MUTATION ${name} APPLIED to ${file}`);

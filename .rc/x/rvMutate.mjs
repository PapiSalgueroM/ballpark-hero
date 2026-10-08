/* Reviewer's mutations for Round 1115 (never committed). Run with cwd = a scratch worktree: node rvMutate.mjs <name>.
   Each needle must be found exactly once, or the mutation refuses to run. */
import fs from 'node:fs';

const LIB = 'src/lib/soccerClubSquad.ts';
const GEN = 'src/lib/soccerClubSquadGen.ts';
const SHEET = 'src/lib/soccerClubSquadSheet.ts';
const M = {
  tie: [LIB, 'const ahead = rivals.filter(m => m.ovr >= me.ovr).length;', 'const ahead = rivals.filter(m => m.ovr > me.ovr).length;'],
  eleven: [LIB, 'const inElevenOnRating = rank <= ELEVEN_SHAPE[chart.group];', 'const inElevenOnRating = rank < ELEVEN_SHAPE[chart.group];'],
  keeps: [LIB, 'chart.men[ELEVEN_SHAPE[chart.group] - 1] ?? null,', 'chart.men[ELEVEN_SHAPE[chart.group]] ?? null,'],
  year: [LIB, '    year: (last?.year ?? 0) + 1,\n  };\n}', '    year: (last?.year ?? 0),\n  };\n}'],
  window: [LIB, 'if (at.year > CLUB_SQUAD_YEARS.last) {', 'if (at.year >= CLUB_SQUAD_YEARS.last) {'],
  since: [GEN, 'if (base) man.since = Math.max(man.since ?? y, kept ? kept.left : base.year + 1);', ''],
  under: [SHEET, 'if (row.ovr < centre - 5) {', 'if (row.ovr <= centre - 5) {'],
  frozen: [LIB, 'if (frozen) expected = Math.min(8, Math.round(expected * 0.25));', ''],
  carry: [GEN, 'const man: SquadMan | null = y < left ? { name: real.name, pos: real.pos, ovr: real.ovr, group: real.group } : null;', 'const man: SquadMan | null = { name: real.name, pos: real.pos, ovr: real.ovr, group: real.group };'],
  youth: [LIB, "if (first && first.type === 'youth' && c.currentClub === first.club) return null;", ''],
};
const name = process.argv[2];
if (name === '--dry') {
  for (const [k, [f, n]] of Object.entries(M)) console.log(k, fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split(n).length - 1);
  process.exit(0);
}
const m = M[name];
if (!m) { console.log(`unknown mutation ${name}`); process.exit(2); }
const [file, needle, swap] = m;
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const found = src.split(needle).length - 1;
if (found !== 1) { console.log(`mutation ${name} cannot run: needle found ${found} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, src.replace(needle, swap));
console.log(`mutation ${name} applied to ${file}: "${needle.slice(0, 70)}" -> "${swap.slice(0, 70)}"`);

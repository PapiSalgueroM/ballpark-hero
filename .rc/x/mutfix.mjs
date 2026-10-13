// Round 1320 fixer: one source mutation by name, refused unless each anchor is in its file exactly once.
// Run from the repo root on the runner; the request line restores the tree with git checkout afterwards.
import fs from 'node:fs';

const BOARD = 'src/components/college-dynasty/CollegeDynastyBoard.tsx';
const SEAT = 'src/lib/collegeSeat.ts';
const CFBBIND = 'src/lib/cfbSeatBind.ts';
const MUTS = {
  /* finding 11: the double tap guard never cleared */
  noclear: [
    [BOARD, "    marketActed.current = '';\n    setSt(state); setPhase('season');", "    setSt(state); setPhase('season');"],
    [BOARD, "    marketActed.current = '';\n    setPhase('pick');", "    setPhase('pick');"],
  ],
  /* finding 2: the load bound as advice 14 words it */
  boundB: [[SEAT, '    if (s.from <= prev || s.from > ctx.season + 1) return null;', '    if (s.from <= prev || s.from > ctx.season) return null;']],
  /* finding 1: the market filter, then the bid filter */
  mutF: [[SEAT, '  const offers = drawn.filter(o => !firers.has(o.teamId))', '  const offers = drawn.filter(o => true)']],
  mutG: [[SEAT, '  if (!bid || formerFirers(block.career).has(bid.teamId)) return null;', '  if (!bid) return null;']],
  /* finding 3: his place in the rankings 0 based */
  mutH: [[CFBBIND, '    place: cfbRankings(st).findIndex(t => t.id === st.myTeam) + 1,', '    place: cfbRankings(st).findIndex(t => t.id === st.myTeam),']],
};
const name = process.argv[2];
if (!MUTS[name]) { console.error(`unknown mutation ${name}`); process.exit(2); }
for (const [file, from, to] of MUTS[name]) {
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  if (src.split(from).length !== 2) { console.error(`MUT ${name} cannot run: ${file} does not hold its anchor exactly once`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
}
console.log(`MUT ${name} applied`);

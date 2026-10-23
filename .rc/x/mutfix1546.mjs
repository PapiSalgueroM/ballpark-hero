// Round 1546 fix proofs on the runner. Each mutation asserts every anchor is in
// the file exactly once before it edits, and exits 7 if not, so a mutation that
// changes nothing can never read as a green or a red.
import fs from 'node:fs';

const which = process.argv[2];
function edit(file, pairs) {
  let s = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.log(`MUTATION ${which} ABORTED: anchor found ${n} times in ${file}: ${a.slice(0, 60)}`); process.exit(7); }
    s = s.replace(a, b);
  }
  fs.writeFileSync(file, s);
  console.log(`MUTATION ${which} APPLIED to ${file}`);
}

if (which === 'armed') {
  // The board as the review found it: nothing disarms a waiting confirm when the hub is left.
  edit('src/components/fight-career/FightCareerBoard.tsx', [
    ['    setConfirmExit(null);\n    setOffer(o);', '    setOffer(o);'],
    ["    setConfirmExit(null);\n    setPhase(st.retired ? 'retired' : 'hub');", "    setPhase(st.retired ? 'retired' : 'hub');"],
    ['onOpen={v => { setConfirmExit(null); setView(v); }}', 'onOpen={setView}'],
  ]);
} else if (which === 'oldsentence') {
  // The one input behind both recordings: the guide sentence as it was before the round.
  edit('src/data/gameContent/moreSports.ts', [
    ['ends it, or retire yourself any time after 10 fights, then read the verdict', 'ends it, then read the verdict'],
  ]);
} else {
  console.log(`MUTATION ${which} ABORTED: unknown`);
  process.exit(7);
}

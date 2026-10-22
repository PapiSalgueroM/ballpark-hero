// Round 1347 fix: apply ONE named mutation to the checked out tree, asserting its line is present exactly once.
// The request line restores the tree after the gate it runs (git checkout -- src scripts). Exit 0 of the whole
// line means the mutation SURVIVED every gate; exit 1 means a gate caught it (read the log); this script exits 2
// and prints ABORTED when its line is missing.
import fs from 'node:fs';

const W = 'src/lib/worldCompetition.ts';
const MUTS = {
  // the run review's survivors: a tie shows leg one, or its aggregate and winner, a night early
  tieleg1: [W, '        if (k > first) view.leg1 = [t.leg1.homeGoals, t.leg1.awayGoals];', '        if (k >= first) view.leg1 = [t.leg1.homeGoals, t.leg1.awayGoals];'],
  tieagg: [W, '      if (k > end) {\n        view.agg', '      if (k >= end) {\n        view.agg'],
  // the eras' default round of 16 pairs each winner with the runner-up of its OWN group
  r16same: [W, '({ home: runnersUp[(i + 1) % winners.length], away: w })', '({ home: runnersUp[i], away: w })'],
  // the module forces a one match final again, in the evaluation or in the nights
  finalone: [W, 'const legsOf = (r: WorldKoRound): 1 | 2 => bind.tie(r).legs;', "const legsOf = (r: WorldKoRound): 1 | 2 => (r === 'F' ? 1 : bind.tie(r).legs);"],
  finalnights: [W, '    const legs = legsOf(round);', "    const legs = round === 'F' ? 1 : legsOf(round);"],
  // the module's groupFixtures copy drifts from the engine's: matchdays 2 and 3 swapped (still a double round robin)
  fxorder: [W, '    [[c, a], [b, d]],\n    [[a, d], [b, c]],', '    [[a, d], [b, c]],\n    [[c, a], [b, d]],'],
  // Release BJ triage: since Round 1502 did Round 1347's E2 there is ONE groupFixtures (this module's; clubManager.ts
  // imports it), so fxorder above moves both engines alike and nothing can tell (RETIRED in rc-BIf). Its successor
  // puts the engine's own copy back: the unit file's "one writing each" check must catch it.
  fxcopy: ['src/lib/clubManager.ts', '   schedule. */\n\n/* ---------- Round 1502: the world', '   schedule. */\nfunction groupFixtures(clubs: string[], md: number): [string, string][] { const [a, b, c, d] = clubs; return md % 2 ? [[a, b], [c, d]] : [[b, a], [d, c]]; }\n\n/* ---------- Round 1502: the world'],
};
if (process.argv[2] === '--dry') {
  for (const [k, [file, from]] of Object.entries(MUTS)) {
    const s = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
    console.log(`${k}: ${s.split(from).length - 1}`);
  }
  process.exit(0);
}
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mut1347fix: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mut1347fix: ${name}: its line is in ${file} ${n} times, it must be exactly once: ABORTED`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mut1347fix: ${name} applied to ${file}`);

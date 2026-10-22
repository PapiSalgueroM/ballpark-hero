// Round 1522 fix: the review's mutations, applied on the runner only (never on the PC's tree), to prove the new
// checks catch them. Usage: node fx-mut.mjs <id> from the repo root. Each anchor must match exactly once, or exit 2.
import fs from 'node:fs';

const M = {
  // A: the review's mutation, the first half recut drops the instructions (now a type error, and the units).
  A: [['src/lib/clubManager.ts',
    'const { lamMine, lamOpp, mine, oppS } = firstHalfLambdas(state, fx, xi, live.mentality, liveInstructions(live));',
    'const { lamMine, lamOpp, mine, oppS } = firstHalfLambdas(state, fx, xi, live.mentality);']],
  // A2: the same recut handed balanced explicitly (compiles).
  A2: [['src/lib/clubManager.ts',
    'const { lamMine, lamOpp, mine, oppS } = firstHalfLambdas(state, fx, xi, live.mentality, liveInstructions(live));',
    'const { lamMine, lamOpp, mine, oppS } = firstHalfLambdas(state, fx, xi, live.mentality, BALANCED);']],
  // A3: the board's redraw handed balanced (compiles).
  A3: [['src/lib/clubManager.ts',
    "const first = period === 'h1' ? firstHalfLambdas(state, fx, xi, live.mentality, liveInstructions(live)) : null;",
    "const first = period === 'h1' ? firstHalfLambdas(state, fx, xi, live.mentality, BALANCED) : null;"]],
  // B: off by one, a change bites in its own minute.
  B: [['src/lib/clubManagerTactics.ts',
    'if (s.minute < minute || (s.minute === 0 && minute <= 0)) out = s.instructions;',
    'if (s.minute <= minute || (s.minute === 0 && minute <= 0)) out = s.instructions;']],
  // C: the whole squad pays the press's legs.
  C: [['src/lib/clubManager.ts',
    '(played.has(p.id) ? { ...p, fitness: clamp(p.fitness - tacticsDay.stats.legs, 20, 100) } : p)',
    '({ ...p, fitness: clamp(p.fitness - tacticsDay.stats.legs + 0 * Number(played.size), 20, 100) })']],
  // D: a high line punished for MY direct tempo instead of THEIRS.
  D: [['src/lib/clubManagerTactics.ts',
    'if (t.tempo === 1) def += T.line.high.vsDirectDef;',
    'if (m.tempo === 1) def += T.line.high.vsDirectDef;']],
  // F: set pieces and own goals credited to the break and the wing again.
  F: [['src/lib/clubManagerTactics.ts',
    'const openPlay = (gs: GoalMark[]): number[] => gs.filter(g => !g.penalty && !g.freeKick && !g.og).map(g => g.minute);',
    'const openPlay = (gs: GoalMark[]): number[] => gs.map(g => g.minute);']],
};

const id = process.argv[2];
if (!M[id]) { console.log(`MUTATION ${id}: unknown`); process.exit(2); }
for (const [file, from, to] of M[id]) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`MUTATION ${id}: anchor found ${n} times in ${file}, not applied`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
}
console.log(`MUTATION ${id} APPLIED`);

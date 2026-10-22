// Review mutation applier for Round 1522 (run in a throwaway worktree on the runner, never on the PC's tree).
// Usage: node mut.mjs <id>   from the worktree root. Each edit must match exactly once, or exit 2.
import fs from 'node:fs';

const M = {
  // A: an in play change of instructions in the first half no longer reaches the redrawn goal rates.
  A: [['src/lib/clubManager.ts',
    'const { lamMine, lamOpp, mine, oppS } = firstHalfLambdas(state, fx, xi, live.mentality, liveInstructions(live));',
    'const { lamMine, lamOpp, mine, oppS } = firstHalfLambdas(state, fx, xi, live.mentality);']],
  // B: off by one, a change bites in its own minute.
  B: [['src/lib/clubManagerTactics.ts',
    'if (s.minute < minute || (s.minute === 0 && minute <= 0)) out = s.instructions;',
    'if (s.minute <= minute || (s.minute === 0 && minute <= 0)) out = s.instructions;']],
  // C: dropped filter, the whole squad (the bench and the stands) pays the press's legs.
  C: [['src/lib/clubManager.ts',
    '(played.has(p.id) ? { ...p, fitness: clamp(p.fitness - tacticsDay.stats.legs, 20, 100) } : p)',
    '({ ...p, fitness: clamp(p.fitness - tacticsDay.stats.legs + 0 * Number(played.size), 20, 100) })']],
  // D: swapped argument, a high line is punished for MY direct tempo instead of THEIRS.
  D: [['src/lib/clubManagerTactics.ts',
    'if (t.tempo === 1) def += T.line.high.vsDirectDef;',
    'if (m.tempo === 1) def += T.line.high.vsDirectDef;']],
  // E: dropped guard, every match (balanced too) kicks off with an instruction log.
  E: [['src/lib/clubManager.ts',
    '...(isBalanced(instructionsOf(state)) ? {} : { instrLog: [{ minute: 0, instructions: instructionsOf(state) }] }),',
    'instrLog: [{ minute: 0, instructions: instructionsOf(state) }],']],
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

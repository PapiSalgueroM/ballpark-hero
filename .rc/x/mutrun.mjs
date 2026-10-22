// Reviewer mutation applier (runner only). Each mutation asserts its anchor occurs exactly once, then rewrites.
// The caller restores with git checkout -- src scripts in the same request line.
import fs from 'node:fs';
const MUTS = {
  // The floater render site loses the money formatting (the PR181 page claim: a goal bonus reads $1,234).
  render: [['src/pages/StadiumTycoon.tsx', '{formatMoneyText(f.text)}', '{f.text}']],
  // Off by one at the Academy K boundary: exactly $10,000 would print as $10,000 instead of $10.0K.
  boundary: [['src/lib/wonderkidFactory.ts', 'if (n >= 1e4) return', 'if (n > 1e4) return']],
  // Stale memo dependency: the terrace bays never follow a Stands upgrade until a remount.
  // The harness's own copy of the memo text is changed the same way, so its text pin still holds
  // and only its behaviour checks can see the mutation.
  staledeps: [
    ['src/pages/StadiumTycoon.tsx', '}), [cap]);', '}), []);'],
    ['scripts/qa/tycoonGroundGrowth1094.mjs', '}), [cap]);', '}), []);'],
  ],
};
const name = process.argv[2];
const list = MUTS[name];
if (!list) { console.error('unknown mutation ' + name); process.exit(2); }
for (const [file, from, to] of list) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) { console.error(`MUTATION ${name} ABORT: ${file} has ${count} copies of the anchor`); process.exit(3); }
  fs.writeFileSync(file, text.replace(from, to));
  console.log(`MUTATION ${name} applied to ${file}`);
}

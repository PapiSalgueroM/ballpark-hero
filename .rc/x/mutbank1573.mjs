// Review of Round 1573 (lens: runner). Writes a mutated copy of src/lib/triviaQuestionBank.ts to /tmp/mut-<name>.ts,
// asserting the text it replaces is in the bank exactly once, so a mutation that changes nothing refuses to run.
// Used as: node .rc/x/mutbank1573.mjs <name> && TRIVIA_BANK_FILE=/tmp/mut-<name>.ts node scripts/simTriviaBank.mjs
import fs from 'node:fs';

const name = process.argv[2];
const MUT = {
  // a plausible wrong fix: keep the old eight draws, then take whatever the eighth draw gave, repeat or not
  accept: ['      if (q && !seenQuestions.has(q.question)) break;\n', '      if (q && (attempts >= 8 || !seenQuestions.has(q.question))) break;\n'],
  // an off by one in scope: the draw budget is shared by the whole ladder instead of reset per step
  shared: ['  for (let i = 1; i <= count; i++) {\n    let attempts = 0;\n', '  let attempts = 0;\n  for (let i = 1; i <= count; i++) {\n'],
  // a stale constant: the loop reads a literal 64 and the exported constant is no longer wired to it
  literal: ['    while (attempts < LADDER_ATTEMPTS) {\n', '    while (attempts < 64) {\n'],
  // a smaller cap than the round chose, without touching the exported line
  cap12: ['    while (attempts < LADDER_ATTEMPTS) {\n', '    while (attempts < Math.min(LADDER_ATTEMPTS, 12)) {\n'],
  cap16: ['    while (attempts < LADDER_ATTEMPTS) {\n', '    while (attempts < Math.min(LADDER_ATTEMPTS, 16)) {\n'],
};
if (!MUT[name]) { console.error(`mutbank1573: unknown mutation ${name}`); process.exit(2); }
const src = fs.readFileSync('src/lib/triviaQuestionBank.ts', 'utf8').replace(/\r\n/g, '\n');
const [from, to] = MUT[name];
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mutbank1573: ${name} expects its text once in the bank, found ${n}: refusing to run`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.error(`mutbank1573: ${name} changed nothing`); process.exit(2); }
fs.writeFileSync(`/tmp/mut-${name}.ts`, out);
console.log(`mutbank1573: ${name} written to /tmp/mut-${name}.ts (${JSON.stringify(from.trim())} -> ${JSON.stringify(to.trim())})`);

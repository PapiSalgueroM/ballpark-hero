// Fixer mutation (runner only, restored by git checkout in the same line): node mutShared.mjs <hookwaits|bindlegacy>
// The review's two surviving mutants of the shared pieces, applied once each (the anchor must be there exactly once).
import fs from 'node:fs';

const MUTANTS = {
  hookwaits: ['src/components/front-office-shared/useGmCareerKit.ts',
    "    waits: !kit && moment.phase === 'hub' && moment.lastPeriod,",
    "    waits: !kit && moment.phase === 'hub',"],
  bindlegacy: ['src/components/front-office-shared/careerBinding.ts',
    '  const seat = hostSeatOf(f.desk, kit.legacy);',
    '  const seat = hostSeatOf(f.desk, hostBoxLegacy(f.box));'],
};
const m = MUTANTS[process.argv[2]];
if (!m) { console.error(`MUT ABORT: unknown mutant ${process.argv[2]}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`MUT ABORT: ${process.argv[2]} anchor occurs ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log(`MUTATION APPLIED: ${process.argv[2]} in ${file}`);

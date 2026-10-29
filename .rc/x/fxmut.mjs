/* fix-1567 (never committed): two more mutations, each anchor asserted (missing anchor: exit 3, ABORTED). */
import fs from 'node:fs';

const SIM = 'scripts/simUsConnectionsFacts.mjs';
const edits = {
  /* section 8 takes any date on trust again (the pre-fix line) */
  lastopen: [SIM, 'if (c.asOf !== undefined && c.asOf <= LAST_FINISHED[s]) { dated += 1; continue; }', 'if (c.asOf !== undefined) { dated += 1; continue; }'],
  /* the gray pair two host rule fails without naming what it found (the pre-fix line) */
  grayfire: [SIM, "{ fire('gray-one-host', `${gp.name} | ${gp.label}`); fail(", '{ fail('],
};
const e = edits[process.argv[2]];
if (!e) { console.error(`fxmut: unknown ${process.argv[2]}`); process.exit(3); }
const [file, from, to] = e;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`fxmut ${process.argv[2]}: ABORTED, anchor found ${n} times`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`fxmut ${process.argv[2]}: ${file} changed`);

/* Reviewer mutation runner (runs lens, Round 1514). node .rc/x/mutrun.mjs <name>
 * Applies one plausible mutation to one source line (asserted to stand exactly once), runs the checks named for
 * it, puts the file back byte for byte, and prints each check's exit and last line.
 * Exit 0: the mutation SURVIVED every check (all green). Exit 1: caught by at least one. Exit 2: could not run. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const name = process.argv[2] || '';
const CM = 'src/lib/clubManager.ts', ONE = 'src/lib/worldOneOffs.ts', NIGHTS = 'src/lib/worldNights.ts';
const UNITS = 'node_modules/.bin/vitest run src/lib/worldOneOffs.test.ts src/lib/worldNights.test.ts src/lib/clubManagerWorldView.test.ts src/lib/clubManagerWorldCompsReload.test.ts --testTimeout=300000 --hookTimeout=120000';
const SIM01 = 'ONE_OFF_ONLY=0,1 ONE_OFF_SEEDS=1,2 ONE_OFF_SEASONS=2 ONE_OFF_COACH=nocoach node scripts/simOneOffCups.mjs';
const SIM5 = 'ONE_OFF_ONLY=5 ONE_OFF_SEEDS=1,2 ONE_OFF_SEASONS=3 ONE_OFF_COACH=nocoach node scripts/simOneOffCups.mjs';
const MUTS = {
  none: { edits: [], checks: [UNITS, SIM01] },
  /* evalOneOff plays the row without its dated edition (the 1510 reader left in one call site). */
  evalundated: { edits: [{ file: CM, from: '  const row = oneOffSliceRow(state, slice);\n  if (!row) return null;\n  const k = nights ?? oneOffNightsDone(state, key);', to: '  const row = oneOffRowAt(slice.row, 0);\n  if (!row) return null;\n  const k = nights ?? oneOffNightsDone(state, key);' }], checks: [UNITS, SIM01] },
  /* the mid season move's carry of the UEFA Super Cup dropped (the dsc carry kept). */
  nocarryusc: { edits: [{ file: CM, from: "  carryOneOff(career, joined, 'usc');\n", to: '' }], checks: [UNITS, SIM01, SIM5, 'PROBE_PART=move node .rc/x/probeEngine.mjs'] },
  /* the dated placer takes the later gap on a tie. */
  datedlater: { edits: [{ file: NIGHTS, from: '        if (off < best && free(g)) { best = off; gap = g; }', to: '        if (off <= best && free(g)) { best = off; gap = g; }' }], checks: [UNITS, SIM01] },
  /* the UEFA Super Cup opened with one winner unknown (|| written &&). */
  nowinnerand: { edits: [{ file: ONE, from: "    if (!t.uclWinner || !t.uelWinner) return { skip: 'noWinner' };", to: "    if (!t.uclWinner && !t.uelWinner) return { skip: 'noWinner' };" }], checks: [UNITS, SIM01, 'PROBE_PART=old node .rc/x/probeEngine.mjs'] },
  /* Italy's later seasons no longer read partial on the tile (the edition filter dropped). */
  partialedition: { edits: [{ file: ONE, from: '  return CM_ONE_OFF_PARTIAL.includes(id) || (edition !== undefined && !oneOffPlayedIn(id, edition));', to: '  return CM_ONE_OFF_PARTIAL.includes(id);' }], checks: [UNITS, SIM01] },
  /* the edition year off by one (season one read as 2027-28). */
  editionyear: { edits: [{ file: CM, from: "  return (typeof state.startYear === 'number' ? state.startYear : CM_BASE_YEAR) + Math.max(0, s - 1);", to: "  return (typeof state.startYear === 'number' ? state.startYear : CM_BASE_YEAR) + Math.max(0, s);" }], checks: [UNITS, SIM01] },
};
const m = MUTS[name];
if (!m) { console.log(`mutrun: unknown mutation ${name}`); process.exit(2); }
const originals = new Map();
let code = 2;
try {
  for (const e of m.edits) {
    const file = path.join(ROOT, e.file);
    if (!originals.has(file)) originals.set(file, fs.readFileSync(file));
    const text = fs.readFileSync(file, 'utf8');
    const n = text.split(e.from).length - 1;
    if (n !== 1) { console.log(`mutrun ${name}: the line stands ${n} times in ${e.file}, it must be once: ABORTED`); process.exit(2); }
    fs.writeFileSync(file, text.replace(e.from, e.to));
  }
  let caught = 0;
  for (const c of m.checks) {
    const r = spawnSync('bash', ['-c', c], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env } });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const lines = out.trim().split('\n');
    const tests = lines.filter(l => /Tests\s+\d|Test Files/.test(l)).slice(-2).join(' | ');
    const failLines = lines.filter(l => /FAIL|✗|×/.test(l)).slice(0, 4).map(l => l.slice(0, 220));
    console.log(`  check [${c.slice(0, 90)}] exit=${r.status} | ${tests || lines[lines.length - 1]?.slice(0, 240)}`);
    for (const f of failLines) console.log(`      ${f}`);
    if (r.status !== 0) caught += 1;
  }
  console.log(`mutrun ${name}: ${caught ? `CAUGHT by ${caught} of ${m.checks.length} checks` : `SURVIVED all ${m.checks.length} checks`}`);
  code = caught ? 1 : 0;
} finally {
  for (const [file, buf] of originals) fs.writeFileSync(file, buf);
  for (const [file, buf] of originals) if (!fs.readFileSync(file).equals(buf)) { console.log(`mutrun ${name}: ${file} NOT PUT BACK`); code = 2; }
}
process.exit(code);

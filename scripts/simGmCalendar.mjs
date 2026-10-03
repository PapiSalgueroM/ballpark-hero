/**
 * Round 946: the GM league year calendar, and the date helpers it shares
 * with Club Manager.
 *
 * Run: node scripts/simGmCalendar.mjs
 *
 * Sections:
 *   1) The lift moved nothing. Club Manager's date helpers moved to
 *      src/lib/calDate.ts; scripts/data/calDateFixture946.json was recorded
 *      from origin/main before the move (scripts/recordCalDateFixture946.mjs,
 *      procedure in scripts/lib/calDateProbe946.mjs) and every hash in it must
 *      replay identically on this tree.
 *
 * Negative controls (GM_CALENDAR_CONTROL=<name>), each must turn its section red:
 *   fixture   dayOfWeek in a scratch copy of calDate.ts is off by one day
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probeCalDate } from './lib/calDateProbe946.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.GM_CALENDAR_CONTROL || '';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmcalendar-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- the controls: a module swapped for a scratch copy with one rewrite ---- */
const CONTROLS = {
  fixture: {
    file: 'src/lib/calDate.ts',
    fixed: 'Math.floor(yy / 400) + t[m - 1] + d) % 7',
    broken: 'Math.floor(yy / 400) + t[m - 1] + d + 1) % 7',
    say: 'CONTROL fixture: dayOfWeek is off by one day, section 1 must go red',
  },
};
const swaps = new Map();
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown GM_CALENDAR_CONTROL=${CONTROL}`); process.exit(1); }
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8').replaceAll('\r\n', '\n');
  if (!src.includes(c.fixed)) {
    console.error(`control cannot run: ${c.file} does not contain the text GM_CALENDAR_CONTROL=${CONTROL} rewrites`);
    process.exit(1);
  }
  const scratch = path.join(tmpDir, path.basename(c.file));
  fs.writeFileSync(scratch, src.replace(c.fixed, c.broken));
  swaps.set(path.join(ROOT, c.file).replaceAll('\\', '/').toLowerCase(), scratch);
  console.log(c.say);
}
const swapPlugin = {
  name: 'control-swap',
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/(calDate|gmCalendar)$/ }, args => {
      const real = `${R}/src/lib/${args.path.slice(6)}.ts`.toLowerCase();
      return swaps.has(real) ? { path: swaps.get(real) } : undefined;
    });
  },
};

const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const cal = await import('${R}/src/lib/clubManagerCalendar.ts');
export const cm = await import('${R}/src/lib/clubManager.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', plugins: [swapPlugin],
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);

/* ---------- 1. The lift moved nothing ---------- */
console.log('1) Club Manager\'s date helpers and calendar replay the pre-lift fixture');
{
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/calDateFixture946.json'), 'utf8'));
  const now = probeCalDate({ cal: B.cal, cm: B.cm });
  let compared = 0;
  const cmp = (label, a, b) => {
    compared += 1;
    if (a.hash !== b.hash) fail(`${label}: hash ${b.hash} != recorded ${a.hash}; first lines now ${JSON.stringify(b.head).slice(0, 200)} recorded ${JSON.stringify(a.head).slice(0, 200)}`);
  };
  for (const k of ['days', 'addDays', 'daysBetween', 'kickoff']) cmp(k, fixture[k], now[k]);
  compared += 1;
  if (fixture.monthNames !== now.monthNames) fail('MONTH_NAMES changed');
  if (fixture.careers.length !== now.careers.length) fail('career count changed');
  fixture.careers.forEach((rec, i) => {
    const got = now.careers[i];
    for (const k of ['entryDates', 'seasonDays', 'monthGrid', 'taps']) cmp(`${rec.club} ${k}`, rec[k], got[k]);
    compared += 1;
    if (rec.fastForwards !== got.fastForwards) fail(`${rec.club} fast forwards changed`);
  });
  console.log(`   ${compared} sections compared against the record from ${fixture.recordedFrom}, ${fixture.days.lines} days, taps ${fixture.careers.map(c => c.taps.lines).join('/')}`);
}

console.log(failures ? `simGmCalendar: ${failures} failure(s)` : 'simGmCalendar: all checks passed');
process.exit(failures ? 1 : 0);

// Reviewer probe for Round 1537 (run lens). Copies scripts/sweepPhone.mjs to scripts/zzSweepMut.mjs with a
// CSS defect injected into each page after load (a runtime stand in for a src mutation), or with clip counters,
// then runs the copy and exits with its code. Usage: node .rc/x/mutSweep.mjs <mode>
//   noscroll    the planning bench box loses its scroll clip: names spill over Clear draft (a real defect)
//   hiddenrow   name 17 is drawn on top of name 15, rows 8 and 9, inside the scrolled out part of the box
//   visiblerow  name 3 is drawn on top of name 1, row 1, inside the visible part of the box
//   count       no defect: per route, how many controls reachable() drops or cuts
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? '';
const BOX = '[aria-label="Available players"] > div';
const CSS = {
  noscroll: '[aria-label="Available players"] { overflow: visible !important; }',
  hiddenrow: `${BOX} > button:nth-child(17) { transform: translateY(-60px) !important; }`,
  visiblerow: `${BOX} > button:nth-child(3) { transform: translateY(-60px) !important; }`,
  count: '',
};
if (!(mode in CSS)) { console.error('mutSweep: unknown mode ' + mode); process.exit(2); }

let src = fs.readFileSync('scripts/sweepPhone.mjs', 'utf8');
const swap = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`mutSweep ABORT: anchor found ${n} times: ${from.slice(0, 60)}`); process.exit(3); }
  src = src.replace(from, to);
};
const EVAL = 'metrics = await page.evaluate(({ countHidden, noClip }) => {';
swap(EVAL, `if (process.env.MUT_CSS) { await page.addStyleTag({ content: process.env.MUT_CSS }); await page.waitForTimeout(200); }\n    ${EVAL}`);
if (mode === 'count') {
  swap('      const boxes = [];', '      const boxes = []; const zzDrop = [], zzCut = [];');
  swap('if (reach) boxes.push({ label, ...reach });',
    'if (reach) boxes.push({ label, ...reach });\n        { const rr = reachable(el, r); if (!rr) zzDrop.push(label); else if (rr.w * rr.h < r.width * r.height - 1) zzCut.push(label); }');
  swap('return { overflow, culprit, small, tiny, hits, controls: boxes.length };',
    'return { overflow, culprit, small, tiny, hits, controls: boxes.length, zzDrop, zzCut };');
  swap('\n  checked += 1;',
    '\n  checked += 1;\n  if (metrics.zzDrop.length || metrics.zzCut.length) { zzRoutes += 1; zzD += metrics.zzDrop.length; zzC += metrics.zzCut.length; console.log(`  CLIP ${route}: ${metrics.controls} kept, ${metrics.zzDrop.length} dropped (${metrics.zzDrop.slice(0, 4).join(" | ")}), ${metrics.zzCut.length} cut (${metrics.zzCut.slice(0, 3).join(" | ")})`); }');
  swap('let smallTargets = 0,', 'let zzRoutes = 0, zzD = 0, zzC = 0;\nlet smallTargets = 0,');
  swap("console.log('');\nconsole.log(`   ${checked} routes swept",
    "console.log(`CLIP TOTAL: ${zzRoutes} routes have clipped controls, ${zzD} dropped, ${zzC} cut`);\nconsole.log('');\nconsole.log(`   ${checked} routes swept");
}
const COPY = `scripts/zzSweepMut-${mode}-${process.pid}.mjs`;
fs.writeFileSync(COPY, src);
const env = { ...process.env, MUT_CSS: CSS[mode] };
if (mode !== 'count' && !env.ROUTE) env.ROUTE = '/nba-connections';
console.log(`mutSweep ${mode}: css "${CSS[mode]}" route ${env.ROUTE ?? 'all'} control ${env.SWEEP_PHONE_CONTROL ?? 'none'}`);
const run = spawnSync(process.execPath, [COPY], { stdio: 'inherit', env });
fs.unlinkSync(COPY);
console.log(`mutSweep ${mode}: sweep copy exited ${run.status}`);
process.exit(run.status ?? 1);

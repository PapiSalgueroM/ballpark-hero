// Fixer probe for Round 1537, after the review's mutSweep.mjs: copies scripts/sweepPhone.mjs to a throwaway
// file with a CSS defect injected into each page after load (a runtime stand in for a src edit), runs the copy,
// deletes it, and exits with its code. Usage: node .rc/x/mutSweep2.mjs <mode>   (ROUTE defaults to /nba-connections)
//   noscroll    the planning bench box loses its scroll clip: names spill over Clear draft (must go red)
//   hiddenrow   name 17 is drawn on top of name 15, rows 8 and 9, in the scrolled out part of the box (must go red)
//   visiblerow  name 3 is drawn on top of name 1, row 1, in the visible part of the box (must go red)
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? '';
const BOX = '[aria-label="Available players"] > div';
const CSS = {
  noscroll: '[aria-label="Available players"] { overflow: visible !important; }',
  hiddenrow: `${BOX} > button:nth-child(17) { transform: translateY(-60px) !important; }`,
  visiblerow: `${BOX} > button:nth-child(3) { transform: translateY(-60px) !important; }`,
};
if (!(mode in CSS)) { console.error('mutSweep2: unknown mode ' + mode); process.exit(2); }

let src = fs.readFileSync('scripts/sweepPhone.mjs', 'utf8');
const EVAL = 'metrics = await page.evaluate(({ countHidden, noClip, plant }) => {';
const n = src.split(EVAL).length - 1;
if (n !== 1) { console.error(`mutSweep2 ABORT: anchor found ${n} times`); process.exit(3); }
src = src.replace(EVAL, `if (process.env.MUT_CSS) { await page.addStyleTag({ content: process.env.MUT_CSS }); await page.waitForTimeout(200); }\n    ${EVAL}`);
const COPY = `scripts/zzSweepMut2-${mode}-${process.pid}.mjs`;
fs.writeFileSync(COPY, src);
const env = { ...process.env, MUT_CSS: CSS[mode] };
if (!env.ROUTE) env.ROUTE = '/nba-connections';
console.log(`mutSweep2 ${mode}: css "${CSS[mode]}" route ${env.ROUTE} control ${env.SWEEP_PHONE_CONTROL ?? 'none'}`);
const run = spawnSync(process.execPath, [COPY], { stdio: 'inherit', env });
fs.unlinkSync(COPY);
console.log(`mutSweep2 ${mode}: sweep copy exited ${run.status}`);
process.exit(run.status ?? 1);

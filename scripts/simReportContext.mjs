/* Bug report context harness: every report carries the route and the day,
   and Footle's says which mode it was.

   Round 390. game_context on question_reports is the only context an
   investigation ever gets. Round 381 read the queue and found Footle sending
   `difficulty`, the unlimited mode selector, which reads "easy" for every
   daily session ever reported, including an insane one; most other pages
   send one field or none. The component now adds the route and the Eastern
   date to whatever a page sends, so a daily report can be re-run for the day
   it was filed, and Footle sends its mode, the tier that mode actually used,
   and the target.

   What it holds (source read as code, comments and strings stripped):
     1. ReportQuestion builds its context from window.location.pathname and
        getTodayET(), spreads the page's fields over them, and sends THAT
        object on both delivery paths (the relay function and the direct
        insert), with no path still sending the bare page object.
     2. Footle's element passes mode and tier and no longer passes difficulty.
     3. An inventory, printed and not failed: how many pages pass an empty
        context or none at all. Measured on 2026-09-01 so the next reader
        knows whether it moved.

   Negative controls (house rule: prove each check can fail):
     SIM_REPORT_CONTROL=nopath   deletes the path line from the component
                                 source in memory; section 1 must go red.
     SIM_REPORT_CONTROL=footle   restores Footle's old element in memory;
                                 section 2 must go red.
   Each asserts it changed something before running.

   Run: node scripts/simReportContext.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_REPORT_CONTROL || '';
let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const asCode = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '""');

section = 1;
console.log('1) ReportQuestion sends the route and the Eastern date with every report, on both delivery paths');
{
  let code = asCode(fs.readFileSync(path.join(ROOT, 'src/components/game/ReportQuestion.tsx'), 'utf8'));
  const pathLine = /path:\s*window\.location\.pathname/;
  if (CONTROL === 'nopath') {
    if (!pathLine.test(code)) abort('control cannot run: the path line it is meant to delete is not there');
    code = code.replace(pathLine, '');
  }
  if (!pathLine.test(code)) fail('the context has no path: window.location.pathname');
  if (!/date:\s*getTodayET\(\)/.test(code)) fail('the context has no date: getTodayET()');
  if (!/\.\.\.gameContext/.test(code)) fail('the page fields are not spread over the context');
  const sends = code.match(/game_context:\s*context\b/g) || [];
  if (sends.length < 2) fail(`the enriched context is sent on ${sends.length} delivery path(s), both the relay and the insert must send it`);
  if (/game_context:\s*gameContext\b/.test(code)) fail('a delivery path still sends the bare page object');
  console.log(`   path, date, spread, ${sends.length} delivery paths`);
}

section = 2;
console.log('2) Footle reports its mode and the tier that mode used');
{
  let code = asCode(fs.readFileSync(path.join(ROOT, 'src/pages/Footle.tsx'), 'utf8'));
  const el = code.match(/<ReportQuestion\b[\s\S]*?\/>/);
  if (!el) fail('Footle has no ReportQuestion element');
  else {
    let element = el[0];
    if (CONTROL === 'footle') {
      if (!/\bmode\b/.test(element)) abort('control cannot run: the element it is meant to regress carries no mode');
      element = '<ReportQuestion gameType="" gameContext={{ targetPlayer: targetPlayer?.name, difficulty }} />';
    }
    if (!/\bmode\b/.test(element)) fail('Footle\'s report context carries no mode');
    if (!/\btier\b/.test(element)) fail('Footle\'s report context carries no tier');
    /* The key, not the word: `tier: mode === 'daily' ? dailyTier : difficulty`
       reads the selector to compute the tier and is fine; `{ ..., difficulty }`
       or `difficulty:` sends it as its own field, which is the defect. */
    if (/[{,]\s*difficulty\s*[,}]/.test(element) || /\bdifficulty\s*:/.test(element)) fail('Footle\'s report context still sends the unlimited selector as difficulty');
    console.log('   mode and tier present, the unlimited selector gone');
  }
}

section = 3;
console.log('3) Inventory: what the other pages send (printed, not failed)');
{
  const dir = path.join(ROOT, 'src/pages');
  const files = fs.readdirSync(dir).filter(f => /\.tsx$/.test(f));
  let uses = 0, empty = 0, none = 0;
  const emptyPages = [];
  for (const f of files) {
    const code = asCode(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const m of code.matchAll(/<ReportQuestion\b[\s\S]*?\/>/g)) {
      uses += 1;
      const el = m[0];
      if (!/gameContext=/.test(el)) { none += 1; emptyPages.push(f); }
      else if (/gameContext=\{\s*\{\s*\}\s*\}/.test(el)) { empty += 1; emptyPages.push(f); }
    }
  }
  console.log(`   ${uses} report buttons across ${files.length} pages; ${none} pass no context, ${empty} pass an empty one${emptyPages.length ? `: ${emptyPages.join(', ')}` : ''}`);
  console.log('   every one of them now carries the route and the date through the component');
}

if (CONTROL) {
  const target = { nopath: 1, footle: 2 }[CONTROL];
  if (!target) abort(`unknown control "${CONTROL}"`);
  const fired = bySection[target];
  if (fired > 0) { console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead`);
}
if (failures > 0) { console.error(`\nsimReportContext: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimReportContext: all green');

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
     1. Both report forms call the shared context helper, which retains the
        route, Eastern date, UTC timestamp and bounded explicit game fields.
        Each sends that same object on the relay and direct insert paths.
     2. Footle's element passes mode and tier and no longer passes difficulty.
     3. An inventory, printed and not failed: how many pages pass an empty
        context or none at all. Measured on 2026-09-01 so the next reader
        knows whether it moved.
     4. The privacy page accurately discloses the category, text, page, date
        and limited game context already sent by the shared report flow.

   Negative controls (house rule: prove each check can fail):
     SIM_REPORT_CONTROL=nopath   deletes the path line from the helper
                                 source in memory; section 1 must go red.
     SIM_REPORT_CONTROL=footle   restores Footle's old element in memory;
                                 section 2 must go red.
     SIM_REPORT_CONTROL=privacy  removes the automatic context disclosure;
                                 section 4 must go red.
     SIM_REPORT_CONTROL=diagnostics  removes the diagnostics disclosure
                                 (Release BA, critic's correction 15) from
                                 both bullets in memory; section 4 must go red.
   Each asserts it changed something before running.

   Release BA: section 4 also reads every key the helper sends (the reserved
   keys and the diagnostics object, read from src/lib/reportContext.ts as
   code) and needs the Reported issues bullet to name each one. A key with no
   disclosure rule fails too, so a new diagnostics field cannot ship
   undisclosed.

   Run: node scripts/simReportContext.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_REPORT_CONTROL || '';
let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0, 4: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const asCode = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '""');

section = 1;
console.log('1) Both report forms use the bounded shared context on both delivery paths');
{
  const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
  let helper = asCode(read('src/lib/reportContext.ts'));
  const pathLine = /path:\s*window\.location\.pathname/;
  if (CONTROL === 'nopath') {
    if (!pathLine.test(helper)) abort('control cannot run: the shared path line it is meant to delete is not there');
    const changed = helper.replace(pathLine, '');
    if (changed === helper) abort('control cannot run: deleting the path line changed nothing');
    helper = changed;
  }
  if (!pathLine.test(helper)) fail('the shared context has no path: window.location.pathname');
  if (!/date:\s*getTodayET\(\)/.test(helper)) fail('the shared context has no date: getTodayET()');
  if (!/submittedAt:\s*new Date\(\)\.toISOString\(\)/.test(helper)) fail('the shared context has no UTC report timestamp');
  if (!/Object\.entries\(gameContext\)/.test(helper)) fail('the shared context does not read the explicit game fields');
  if (!/JSON\.stringify\(value\)\.length\s*<\s*CONTEXT_LIMIT/.test(helper) || !/const CONTEXT_LIMIT\s*=\s*1500/.test(helper)) fail('the context no longer fits the existing relay email budget');
  const surfaces = [
    ['src/components/game/ReportQuestion.tsx', /buildReportContext\(gameContext\)/],
    ['src/components/game/ReportSiteIssue.tsx', /buildReportContext\(\{\},\s*""\)/],
  ];
  for (const [file, call] of surfaces) {
    const source = read(file);
    const imports = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const code = asCode(source);
    if (!/import\s*\{\s*buildReportContext\s*\}\s*from ['"]@\/lib\/reportContext['"]/.test(imports) || !call.test(code)) fail(`${file} does not use the actual shared context helper`);
    const sends = code.match(/game_context:\s*context\b/g) || [];
    if (sends.length !== 2) fail(`${file} sends the enriched context on ${sends.length} paths, expected relay and direct fallback`);
    if (/game_context:\s*gameContext\b/.test(code)) fail(`${file} still sends bare page fields on a delivery path`);
    console.log(`   ${file}: shared context, ${sends.length} delivery paths`);
  }
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

section = 4;
console.log('4) The privacy page says what the report flow already sends');
{
  let source = fs.readFileSync(path.join(ROOT, 'src/pages/PrivacyPolicy.tsx'), 'utf8');
  const contextPhrase = 'the page, the date in Eastern Time, and limited in-game details';
  if (CONTROL === 'privacy') {
    if (!source.includes(contextPhrase)) abort('control cannot run: the context disclosure it is meant to remove is not there');
    const changed = source.replace(contextPhrase, 'the page');
    if (changed === source) abort('control cannot run: removing the context disclosure changed nothing');
    source = changed;
  }
  if (CONTROL === 'diagnostics') {
    const cuts = [
      /We record the report time in UTC\.[\s\S]*?These small diagnostics help us reproduce the issue\./,
      /The relay also receives the time in UTC and the other report details and limited browser diagnostics described in Section 1\./,
    ];
    for (const cut of cuts) {
      if (!cut.test(source)) abort('control cannot run: a diagnostics disclosure it is meant to remove is not there');
      const changed = source.replace(cut, '');
      if (changed === source) abort('control cannot run: removing a diagnostics disclosure changed nothing');
      source = changed;
    }
  }
  const reported = source.match(/<li><strong>Reported issues:<\/strong>[\s\S]*?<\/li>/)?.[0] ?? '';
  const formSubmit = source.match(/<li><strong>FormSubmit:<\/strong>[\s\S]*?<\/li>/)?.[0] ?? '';
  for (const [label, text] of [['Reported issues', reported], ['FormSubmit', formSubmit]]) {
    if (!text) { fail(`${label} disclosure is missing`); continue; }
    if (!/categor/i.test(text)) fail(`${label} does not disclose the selected report category`);
    if (!/text/i.test(text)) fail(`${label} does not disclose the text the visitor types`);
    if (!/page/i.test(text)) fail(`${label} does not disclose the page path`);
    if (!/date/i.test(text)) fail(`${label} does not disclose the Eastern date`);
    if (!/limited in-game details/i.test(text)) fail(`${label} does not disclose the limited game context`);
  }
  if (/Only the report text you typed and the page you were on are sent/i.test(formSubmit)) {
    fail('FormSubmit still claims only text and page are sent');
  }
  console.log('   category, typed text, page, Eastern date and limited game details disclosed on both lines');

  // Release BA: every key the helper sends must be named in the Reported issues bullet. The keys
  // are read from the helper's code (comments stripped, strings kept), so a new field needs a rule.
  const helperCode = fs.readFileSync(path.join(ROOT, 'src/lib/reportContext.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const reservedList = helperCode.match(/const RESERVED = new Set\(\[([^\]]*)\]\)/)?.[1] ?? '';
  const reservedKeys = [...reservedList.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const availableBlock = helperCode.match(/const available = \{([\s\S]*?)\n\s*\};/)?.[1] ?? '';
  const diagnosticKeys = [
    ...[...availableBlock.matchAll(/^\s*(\w+)\s*[,:]/gm)].map(m => m[1]),
    ...[...availableBlock.matchAll(/\{([^{}]*)\}/g)].flatMap(m => [...m[1].matchAll(/(\w+)\s*:/g)].map(k => k[1])),
  ];
  if (reservedKeys.length < 6) fail(`the helper's RESERVED keys could not be read (${reservedKeys.length})`);
  if (diagnosticKeys.length < 8) fail(`the helper's diagnostics keys could not be read (${diagnosticKeys.length})`);
  const DISCLOSE = {
    path: /the page/i, date: /date in Eastern Time/i, submittedAt: /time in UTC/i,
    source: /which Report button/i, contextTruncated: /shortened/i, diagnostics: /diagnostics/i,
    build: /build filename/i, viewport: /viewport size/i, width: /viewport size/i, height: /viewport size/i,
    pixelRatio: /pixel ratio/i, timezone: /timezone|time zone/i, browser: /user agent/i, language: /language/i,
  };
  for (const key of [...reservedKeys, ...diagnosticKeys]) {
    const rule = DISCLOSE[key];
    if (!rule) { fail(`the report sends "${key}" and this check has no disclosure rule for it`); continue; }
    if (!rule.test(reported)) fail(`Reported issues does not disclose "${key}" (${rule})`);
  }
  if (!/diagnostics/i.test(formSubmit)) fail('FormSubmit does not point at the browser diagnostics');
  console.log(`   keys checked against the Reported issues bullet: ${reservedKeys.length} context keys, ${diagnosticKeys.length} diagnostics keys (${diagnosticKeys.join(', ')})`);
}

if (CONTROL) {
  const target = { nopath: 1, footle: 2, privacy: 4, diagnostics: 4 }[CONTROL];
  if (!target) abort(`unknown control "${CONTROL}"`);
  const fired = bySection[target];
  if (fired > 0) { console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead`);
}
if (failures > 0) { console.error(`\nsimReportContext: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimReportContext: all green');

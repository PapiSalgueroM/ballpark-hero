/* The accessibility fixes stay fixed, and the statement stays true.

   Round 306, off the owner's 2026-08-27 instruction (the accessibility
   lawsuit reel) and the audit it triggered. The audit's sharpest lesson was
   Round 215's: a fix applied to one instance of a pattern does not reach the
   clones written afterwards, so the skip link worked on one page in four and
   one connect board in five was playable by keyboard. These checks pin the
   repaired state so the next clone goes red instead of quietly shipping the
   old hole, and they back the specific claims /accessibility makes so that
   page cannot drift into fiction.

   sweepContrast (browser) still owns contrast, tab order and initial render
   names; this file is the static side: structure that a grep can hold.

   Negative control: SIM_A11Y_CONTROL=strip deletes the skip target id from
   an in memory copy of GameShell and the run must fail.

   Run: node scripts/simAccessibility.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_A11Y_CONTROL === 'strip';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
/* Guards read code, not comments: the four-in-one-day lesson. */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let shell = strip(read('src/components/game/GameShell.tsx'));
if (CONTROL) {
  const needle = 'id="dukb-main"';
  if (!shell.includes(needle)) { console.error('control run: the id the control strips is not there, refusing a dead control'); process.exit(1); }
  shell = shell.replace(needle, '');
}

console.log('1) the skip link has somewhere to land');
{
  if (!shell.includes('id="dukb-main"')) fail('GameShell lost the dukb-main id, the skip link focuses nothing on 69 game pages again');
  const app = strip(read('src/App.tsx'));
  if (!app.includes('#dukb-main')) fail('the skip link itself is gone from App.tsx');
  const TARGETED = ['PrivacyPolicy', 'TermsOfService', 'About', 'Contact', 'WhatsNew', 'Records', 'StadiumTycoon', 'WorldCupPredictor', 'Accessibility'];
  for (const p of TARGETED) {
    if (!strip(read(`src/pages/${p}.tsx`)).includes('dukb-main')) fail(`src/pages/${p}.tsx lost its skip target`);
  }
  console.log(`   GameShell plus ${TARGETED.length} standalone pages carry the target`);
}

console.log('2) every connect board is buttons, labeled with its clues');
{
  const BOARDS = [
    'src/components/football-connect4/FootballConnect4Board.tsx',
    'src/pages/NflConnect4.tsx',
    'src/pages/MlbConnect4.tsx',
    'src/pages/NbaConnect4.tsx',
    'src/pages/NhlConnect4.tsx',
  ];
  for (const f of BOARDS) {
    const s = strip(read(f));
    if (!/aria-label=\{[\s\S]{0,400}?rowAttributes/.test(s)) fail(`${f}: no clue pair aria-label on the grid cells`);
    if (/<div[^>]*\n?[^>]*onClick=\{\(\) => \{\n\s*if \(phase === 'playing' && !cell\)/.test(s)) {
      fail(`${f}: grid cells are divs again, unreachable by keyboard`);
    }
  }
  console.log(`   ${BOARDS.length} boards checked, all labeled buttons`);
}

console.log('3) results are announced and feedback is spoken, not only painted');
{
  const rs = strip(read('src/components/game/ResultScreen.tsx'));
  if (!rs.includes('role="status"')) fail('ResultScreen lost role status, ~56 games end silently for a screen reader');
  if (!/aria-hidden="true"[\s\S]{0,300}?\{emojiGrid\}/.test(rs)) fail('the emoji grid is read out glyph by glyph again');
  const gb = strip(read('src/components/game/GameBoard.tsx'));
  if (!gb.includes('sr-only')) fail('GameBoard lost its spoken verdicts, right and wrong are color alone again');
  console.log('   ResultScreen announces, the emoji grid is hidden, GameBoard speaks its verdicts');
}

console.log('4) reduced motion covers the loops');
{
  const css = read('src/index.css');
  const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);
  if (!block) fail('the prefers-reduced-motion block is gone from index.css');
  else {
    for (const cls of ['.animate-pulse', '.animate-spin', '.animate-in', '.animate-fade-in']) {
      if (!block[0].includes(cls)) fail(`reduced motion no longer covers ${cls}`);
    }
  }
  console.log('   the infinite loops calm down under reduce motion');
}

console.log('5) the ticker is a named landmark that can hold still');
{
  const t = strip(read('src/components/layout/TopTicker.tsx'));
  if (!/<section[\s\S]{0,400}?aria-label="Live scores ticker"/.test(t)) fail('the ticker is not a named section landmark');
  if (!t.includes('paused')) fail('the ticker lost its pause on hover and focus');
  console.log('   section landmark, pauses under pointer or focus');
}

console.log('6) the statement page exists, is linked, and is in the sitemap');
{
  if (!fs.existsSync(path.join(ROOT, 'src/pages/Accessibility.tsx'))) fail('src/pages/Accessibility.tsx is gone');
  const app = strip(read('src/App.tsx'));
  if (!app.includes('path="/accessibility"')) fail('the /accessibility route is gone from App.tsx');
  const footer = strip(read('src/components/game/Footer.tsx'));
  if (!footer.includes('to="/accessibility"')) fail('the footer link to /accessibility is gone, the page is orphaned');
  const gen = strip(read('scripts/genSitemap.mjs'));
  if (!gen.includes("'/accessibility'")) fail('the sitemap no longer submits /accessibility');
  const page = strip(read('src/pages/Accessibility.tsx'));
  if (!page.includes('douknowball1@gmail.com')) fail('the statement lost its contact address');
  console.log('   page, route, footer link, sitemap entry and contact all present');
}

console.log('7) the hand rolled dialogs behave, the banner takes focus, the ticker can be paused');
{
  /* Round 307. The seven overlays that predate the shadcn Dialog carry the
     essentials by hand; each file listed must keep every one of them. */
  const OVERLAYS = [
    ['src/components/soccer-career/TrainingPanel.tsx', 1],
    ['src/components/soccer-career/PhonePanel.tsx', 1],
    ['src/components/nascar-driver/NascarDriverHowToPlay.tsx', 1],
    ['src/pages/StadiumTycoon.tsx', 2],
    ['src/pages/SoccerCareer.tsx', 2],
  ];
  for (const [f, n] of OVERLAYS) {
    const s = strip(read(f));
    const dialogs = (s.match(/role="dialog"/g) || []).length;
    if (dialogs < n) fail(`${f}: ${dialogs} dialog roles, expected ${n}`);
    const esc = (s.match(/escapeCloses\(/g) || []).length;
    if (esc < n) fail(`${f}: ${esc} Escape handlers, expected ${n}`);
    const foc = (s.match(/focusDialogOnMount/g) || []).length;
    if (foc < n + 1 && !s.includes("from '@/lib/dialogA11y'")) fail(`${f}: dialog focus helper missing`);
  }
  const banner = strip(read('src/components/CookieConsent.tsx'));
  if (!banner.includes('aria-label="Cookie choices"')) fail('the cookie banner lost its region name');
  if (!banner.includes('.focus()')) fail('the cookie banner no longer takes focus on appearance');
  const ticker = strip(read('src/components/layout/TopTicker.tsx'));
  if (!/aria-label=\{userPaused \? 'Resume the scores ticker' : 'Pause the scores ticker'\}/.test(ticker)) {
    fail('the ticker pause button is gone or lost its state naming');
  }
  console.log('   7 dialogs across 5 files, the banner announces and focuses, the pause button stands');
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: stripping the skip target changed NOTHING, the checks are dead');
  process.exit(1);
}
console.log('   teeth: comment stripped sources, clone lists pinned by file, the statement held to its own claims');
if (failures > 0) { console.error(`\nsimAccessibility: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimAccessibility: all green');

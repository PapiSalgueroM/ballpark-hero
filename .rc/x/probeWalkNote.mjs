/* Round 1557 fix: proves scripts/lib/intlCallNote.mjs counts what it says. A page watched before it navigates is
   shown the call's card twice (with a gap) and the curtain line once; the counts must read 2 and 1, and an
   unwatched page must read "not watched". Exit 0 when they do, 1 otherwise. Run from the repo root. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(root, 'scripts/lib/playwrightLoader.mjs')).href);
const { watchIntlCalls, intlCallsMet } = await import(pathToFileURL(path.join(root, 'scripts/lib/intlCallNote.mjs')).href);
const browser = await chromium.launch();
let bad = 0;
try {
  const page = await browser.newPage();
  await watchIntlCalls(page);
  await page.goto('data:text/html,<main id="m"></main>');
  const show = html => page.evaluate(h => { document.getElementById('m').innerHTML = h; }, html);
  await show('<div data-intl-call>call</div>'); await page.waitForTimeout(200);
  await show(''); await page.waitForTimeout(200);
  await show('<div data-intl-call>call again</div>'); await page.waitForTimeout(200);
  await show('<div data-season-reveal><p>The US national team wants you this summer. You decide next.</p></div>'); await page.waitForTimeout(300);
  const got = intlCallsMet(page);
  console.log(`watched page: ${got}`);
  if (got !== 'national team calls met 2, curtain lines 1') bad += 1;
  const other = await browser.newPage();
  const none = intlCallsMet(other);
  console.log(`unwatched page: ${none}`);
  if (none !== 'national team calls not watched') bad += 1;
} finally { await browser.close(); }
console.log(bad ? `probeWalkNote: RED, ${bad} wrong counts` : 'probeWalkNote: green, the walk helper counts the call and the curtain line');
process.exit(bad ? 1 : 0);

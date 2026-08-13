/**
 * Site wide play sweep: open every game, look at what a player would see,
 * and flag anything that is broken on its face.
 *
 * The Supabase calls cannot reach the network from this sandbox, so a game
 * that is waiting on data is expected and is NOT a finding. What IS a
 * finding: a thrown exception, a literally empty screen, and any rendered
 * "undefined" / "NaN" / "[object Object]" / "null" leaking into copy.
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';

/* Serve the production build first, in another shell:
     npm run build && npx serve -s dist -l 4173
   Then: node scripts/sweepGames.mjs
   Routes come straight from the registry so a new game is swept the day it
   ships, with no list to keep in step. */
const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const registry = fs.readFileSync(new URL('../src/data/gameRegistry.ts', import.meta.url), 'utf8');
const routes = [...new Set([...registry.matchAll(/path: '([^']+)'/g)].map(m => m[1]))].sort();

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--no-proxy-server'],
});
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });

const findings = [];
const note = (route, kind, detail) => { findings.push({ route, kind, detail }); console.log(`  ${kind}  ${route}  ${detail}`); };

// Copy smells: a word that should never reach a player.
const LEAKS = [
  [/\bundefined\b/, 'renders the word undefined'],
  [/\bNaN\b/, 'renders NaN'],
  [/\[object Object\]/, 'renders [object Object]'],
  [/\{\{|\}\}/, 'unsubstituted template braces'],
  // "you are" is correct, so only the third person -s forms are a smell.
  [/\byou (?:is|has|does|rips|stands|throws|makes|hits|rocks|scans|picks|lies|goes|gets|wins|scores|plays)\b/i, 'second person verb disagreement'],
  [/\bInfinity\b/, 'renders Infinity'],
  [/[–—]/, 'em or en dash'],
];

let done = 0;
for (const route of routes) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText().catch(() => '');
    const clean = body.replace(/\s+/g, ' ').trim();
    if (errs.length) note(route, 'THROWS ', errs[0]);
    if (clean.length < 60) note(route, 'BLANK  ', `only ${clean.length} chars of text`);
    // strip the shared chrome so a leak in the nav is not reported 119 times
    const main = clean.replace(/DOUKNOWBALL|Track stats|Back|Home|We use cookies[^.]*\./g, '');
    for (const [rx, why] of LEAKS) {
      const m = main.match(rx);
      if (m) { note(route, 'COPY   ', `${why}: "${main.slice(Math.max(0, m.index - 45), m.index + 55).trim()}"`); break; }
    }
  } catch (e) {
    note(route, 'FAILED ', String(e).split('\n')[0].slice(0, 120));
  }
  await page.close();
  done += 1;
  if (done % 25 === 0) console.log(`  ...${done}/${routes.length}`);
}

await browser.close();
console.log(`\nSwept ${routes.length} routes. ${findings.length} findings.`);
fs.writeFileSync('/tmp/sweep.json', JSON.stringify(findings, null, 1));
process.exit(findings.length === 0 ? 0 : 1);

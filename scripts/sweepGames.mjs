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
const { chromium, webkit } = pw;
import fs from 'node:fs';

/* Round 110: his ask, in his words: "i want everyone to have access for my web
   and that it looks the same regardless of device". This only ever ran ONE
   Chromium at ONE phone size, so Safari and tablets and desktops were never
   tested at all, and WebKit is exactly where layout tends to break. It now
   runs a matrix. ENGINES=chromium,webkit and SIZES=phone,tablet,desktop pick
   a subset; the default is everything. */
const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};
const ENGINES = { chromium, webkit };
const wantEngines = (process.env.ENGINES || 'chromium,webkit').split(',').map(s => s.trim()).filter(e => ENGINES[e]);
const wantSizes = (process.env.SIZES || 'phone,tablet,desktop').split(',').map(s => s.trim()).filter(v => VIEWPORTS[v]);

/* Serve the production build first, in another shell:
     npm run build && npx serve -s dist -l 4173
   Then: node scripts/sweepGames.mjs
   Routes come straight from the registry so a new game is swept the day it
   ships, with no list to keep in step. */
const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const registry = fs.readFileSync(new URL('../src/data/gameRegistry.ts', import.meta.url), 'utf8');
const routes = [...new Set([...registry.matchAll(/path: '([^']+)'/g)].map(m => m[1]))].sort();



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
for (const engineName of wantEngines) {
 for (const sizeName of wantSizes) {
  const label = `${engineName}/${sizeName}`;
  const browser = engineName === 'chromium'
    ? await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--no-proxy-server'] })
    : await webkit.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORTS[sizeName] });
  console.log(`\n== ${label} ==`);
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
    if (errs.length) note(`${label} ${route}`, 'THROWS ', errs[0]);
    if (clean.length < 60) note(`${label} ${route}`, 'BLANK  ', `only ${clean.length} chars of text`);
    // Round 110: a page wider than its own viewport is the classic phone bug,
    // and it is invisible unless you actually measure it.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0);
    if (overflow > 4) note(`${label} ${route}`, 'OVERFLOW', `${overflow}px wider than the screen`);
    // strip the shared chrome so a leak in the nav is not reported 119 times
    const main = clean.replace(/DOUKNOWBALL|Track stats|Back|Home|We use cookies[^.]*\./g, '');
    for (const [rx, why] of LEAKS) {
      const m = main.match(rx);
      if (m) { note(`${label} ${route}`, 'COPY   ', `${why}: "${main.slice(Math.max(0, m.index - 45), m.index + 55).trim()}"`); break; }
    }
  } catch (e) {
    note(`${label} ${route}`, 'FAILED ', String(e).split('\n')[0].slice(0, 120));
  }
  await page.close();
  done += 1;
  if (done % 40 === 0) console.log(`  ...${done} checks`);
  }
  await browser.close();
 }
}
console.log(`\nSwept ${routes.length} routes across ${wantEngines.length} engines and ${wantSizes.length} viewports (${done} checks). ${findings.length} findings.`);
fs.writeFileSync('/tmp/sweep.json', JSON.stringify(findings, null, 1));
process.exit(findings.length === 0 ? 0 : 1);

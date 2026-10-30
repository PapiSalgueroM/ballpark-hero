/* Round 1604 walk (runner only, sent as .rc/x/walk1604.mjs): Soccer Career's create screen in a real
   browser at 320, 390 and 1280.
   A  roll, read Academy Placement, Begin Career: the save and the hub name the club shown.
   B  roll, change nationality to Brazil, read the placement again, Begin: the save names the club shown.
   C  era left empty: the Starting Potential tile is there, its button off, "Pick an era to roll your
      potential." in the tile and under the faded Begin Career; then the name cleared too.
   PHASE=fixed|main labels the run. BASE is a served build, or DIST (a built folder) is served here on PORT.
   Every request off the served origin is aborted, the database host included. Math.random is seeded per
   path and viewport, so a run is repeatable. Exit 0 only when every check passed. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const PHASE = process.env.PHASE || 'fixed';
const OUT = path.join(process.env.RC_OUT || path.resolve('.tmp-walk'), `walk-${PHASE}`);
fs.mkdirSync(OUT, { recursive: true });
let BASE = process.env.BASE || 'http://localhost:4173';
let server = null;
if (process.env.DIST) {
  const port = Number(process.env.PORT || 4175);
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.DIST, String(port)], { stdio: 'ignore' });
  BASE = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 200)); }
}
const VIEWPORTS = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const report = { phase: PHASE, base: BASE, checks: 0, failed: 0, rows: [] };
const failedPaths = new Set();
const check = (row, cond, msg) => { report.checks++; if (!cond) { report.failed++; row.issues.push(msg); failedPaths.add(row.path); } return !!cond; };

async function open(browser, vp, seed) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'en-GB', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent-v2', value: JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() - 60000 }) }] }] } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await ctx.addInitScript(s => {
    let n = s; Math.random = () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Create Your Player', exact: true }).waitFor();
  return { ctx, page, errors };
}
let stepName = '';
const press = async loc => { await loc.waitFor(); await loc.evaluate(el => el.scrollIntoView({ block: 'center' })); await loc.click(); };
const choose = async (page, index, name) => {
  /* the sticky site header covers a control Playwright scrolls only just into view, so centre it first */
  stepName = `open combobox ${index}`; await press(page.getByRole('combobox').nth(index));
  stepName = `pick ${name} in combobox ${index}`; await page.getByRole('option', { name }).first().click();
};
const placement = page => page.getByText('Academy Placement', { exact: true }).locator('..').locator('div.font-bold.text-sm');
/* The flag is an image, or an emoji on its own line when the flag host is blocked (as here), so the club is
   the line that ends in " Youth". */
async function readPlacement(page) {
  stepName = 'read placement';
  const el = placement(page); await el.waitFor();
  const raw = (await el.innerText()).trim();
  const text = raw.split('\n').map(s => s.trim()).filter(s => s.endsWith(' Youth')).pop() ?? raw;
  return { text, raw, flag: await el.locator('img').first().getAttribute('alt', { timeout: 1000 }).catch(() => null) };
}
async function roll(page) {
  stepName = 'roll';
  await press(page.getByRole('button', { name: /Generate Starting Potential|Roll again/ }));
  await page.getByRole('button', { name: /Roll again/ }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => /Roll again/.test(b.textContent))?.disabled);
}
async function fill(page, { era = true } = {}) {
  await page.getByPlaceholder('Enter your player name...').fill('Academy Walker');
  await choose(page, 0, /^England(\s|$)/);
  await choose(page, 1, /Striker/);
  if (era) await choose(page, 2, /2020s/);
}
async function begin(page) {
  stepName = 'begin';
  await press(page.getByRole('button', { name: /Begin Career/ }));
  await page.waitForFunction(() => localStorage.getItem('soccerCareerSave') !== null);
  const s = JSON.parse(await page.evaluate(() => localStorage.getItem('soccerCareerSave')));
  return { currentClub: s.currentClub, academyClubName: s.academyClubName, country: s.currentClubCountry, nationality: s.nationality };
}

const browser = await pw.chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    for (const p of ['A', 'B', 'C']) {
      const row = { path: p, width: vp.width, issues: [], seen: {} };
      report.rows.push(row);
      const { ctx, page, errors } = await open(browser, vp, vp.width * 10 + p.charCodeAt(0));
      try {
        if (p === 'A' || p === 'B') {
          await fill(page); await roll(page);
          row.seen.first = await readPlacement(page);
          if (p === 'B') {
            await choose(page, 0, /^Brazil(\s|$)/);
            await page.waitForTimeout(600);
            row.seen.after = await readPlacement(page);
          }
          const shown = (p === 'B' ? row.seen.after : row.seen.first).text;
          row.seen.started = await begin(page);
          check(row, row.seen.started.currentClub === shown, `${p}@${vp.width}: shown ${shown}, started ${row.seen.started.currentClub}`);
          check(row, `${row.seen.started.academyClubName} Youth` === shown, `${p}@${vp.width}: academyClubName ${row.seen.started.academyClubName} is not the shown ${shown}`);
          await page.waitForTimeout(400);
          const body = await page.evaluate(() => document.body.innerText);
          check(row, body.includes(row.seen.started.currentClub), `${p}@${vp.width}: the hub does not name ${row.seen.started.currentClub}`);
          if (p === 'B') {
            check(row, row.seen.started.nationality === 'Brazil', `B@${vp.width}: the career is not Brazilian`);
            check(row, row.seen.started.country === 'Brazil', `B@${vp.width}: the started club is in ${row.seen.started.country}, not Brazil`);
            if (row.seen.after.flag !== null) check(row, row.seen.after.flag === row.seen.started.country, `B@${vp.width}: the placement's flag ${row.seen.after.flag} is not the started club's country ${row.seen.started.country}`);
          }
        } else {
          await fill(page, { era: false });
          const line = 'Pick an era to roll your potential.';
          check(row, await page.getByRole('heading', { name: 'Starting Potential', exact: true }).isVisible(), `C@${vp.width}: no Starting Potential tile before the era is picked`);
          const gen = page.getByRole('button', { name: /Generate Starting Potential/ });
          check(row, (await gen.count()) === 1 && await gen.isDisabled(), `C@${vp.width}: the roll button is missing or live`);
          row.seen.lines = await page.getByText(line, { exact: true }).count();
          check(row, row.seen.lines === 2, `C@${vp.width}: "${line}" shows ${row.seen.lines} times, 2 expected`);
          check(row, await page.getByRole('button', { name: /Begin Career/ }).isDisabled(), `C@${vp.width}: Begin Career is live`);
          await page.getByRole('heading', { name: 'Starting Potential', exact: true }).locator('xpath=ancestor::div[contains(@class,"max-w-xl")][1]')
            .screenshot({ path: path.join(OUT, `c-${vp.width}.png`) }).catch(e => { row.seen.shotError = String(e).split('\n')[0]; });
          await page.getByPlaceholder('Enter your player name...').fill('');
          const both = 'Add your name, then pick an era to roll your potential.';
          row.seen.bothLines = await page.getByText(both, { exact: true }).count();
          check(row, row.seen.bothLines === 2, `C@${vp.width}: "${both}" shows ${row.seen.bothLines} times, 2 expected`);
          const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          check(row, scroll <= 0, `C@${vp.width}: the page scrolls sideways by ${scroll}px`);
        }
      } catch (e) {
        const lines = String(e && e.message ? e.message : e).split('\n');
        const why = lines.filter(l => /intercepts|not visible|outside of the viewport|disabled|not stable|waiting for/.test(l)).slice(-3).map(l => l.trim()).join(' / ');
        check(row, false, `${p}@${vp.width}: threw at step "${stepName}": ${lines[0]} ${why}`);
        await page.screenshot({ path: path.join(OUT, `fail-${p}-${vp.width}.png`) }).catch(() => {});
      }
      check(row, errors.length === 0, `${p}@${vp.width}: page errors ${errors.join(' | ')}`);
      console.log(`${p}@${vp.width}: ${row.issues.length ? 'RED ' + row.issues.join('; ') : 'ok'} ${JSON.stringify(row.seen)}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  if (server) server.kill();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(`walk1604 ${PHASE}: ${report.checks} checks, ${report.failed} failed, red paths: ${[...failedPaths].sort().join(', ') || 'none'}`);
process.exit(report.failed ? 1 : 0);

/* Reviewer walk for Round 1604 (runner only, sent as .rc/x/walkRev1604.mjs). BASE is the served build.
   Widths 390x844 and 1280x900, reduced motion on and off. Every request off the served origin is aborted
   (the database host included). Math.random is seeded per path so a run repeats.
   S  empty form, then a partial form: the tile and the missing line (twice), screenshots.
   A  roll, Begin: started at the shown club; screenshots of the rolled screen and the hub.
   D  roll in the 2020s, switch era to the early 90s: placement re-read, started at the shown club.
   E  roll, Customize your build, overall up by 40, Lock in: started at the shown club with that overall.
   F  the roll slowed tenfold, nationality changed to Brazil WHILE rolling: started at the shown club, in Brazil.
   G  roll, switch to Goalkeeper, roll again, Begin: started at the shown club.
   H  roll, then Roll again (slowed) and Begin while it rolls: records what a double tap does (report only).
   I  England, roll, Brazil, back to England: started at the shown club, in England.
   Exit 0 only when every check passed (H is recorded, not checked). */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const OUT = path.join(process.env.RC_OUT || path.resolve('.tmp-walk'), 'rev');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:4173';
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const MOTIONS = ['reduce', 'no-preference'];
const PATHS = ['S', 'A', 'D', 'E', 'F', 'G', 'H', 'I'];
const report = { base: BASE, checks: 0, failed: 0, rows: [] };
const failedPaths = new Set();
const check = (row, cond, msg) => { report.checks++; if (!cond) { report.failed++; row.issues.push(msg); failedPaths.add(row.path); } return !!cond; };

async function open(browser, vp, motion, seed, slow) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'en-GB', serviceWorkers: 'block', reducedMotion: motion,
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent-v2', value: JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() - 60000 }) }] }] } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await ctx.addInitScript(([s, slowRoll]) => {
    let n = s; Math.random = () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (slowRoll) { const si = window.setInterval.bind(window); window.setInterval = (fn, ms, ...a) => si(fn, ms === 60 ? 600 : ms, ...a); }
  }, [seed, !!slow]);
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Create Your Player', exact: true }).waitFor();
  return { ctx, page, errors };
}
let stepName = '';
const press = async loc => { await loc.waitFor(); await loc.evaluate(el => el.scrollIntoView({ block: 'center' })); await loc.click(); };
const choose = async (page, index, name) => {
  stepName = `open combobox ${index}`; await press(page.getByRole('combobox').nth(index));
  stepName = `pick ${name} in combobox ${index}`;
  const option = page.getByRole('option', { name }).first();
  await option.waitFor();
  try { await option.click({ timeout: 4000 }); } catch { await option.focus(); await page.keyboard.press('Enter'); }
  await page.getByRole('option').first().waitFor({ state: 'detached' });
};
const placement = page => page.getByText('Academy Placement', { exact: true }).locator('..').locator('div.font-bold.text-sm');
async function readPlacement(page) {
  stepName = 'read placement';
  const el = placement(page); await el.waitFor();
  const raw = (await el.innerText()).trim();
  const text = raw.split('\n').map(s => s.trim()).filter(s => s.endsWith(' Youth')).pop() ?? raw;
  return { text, flag: await el.locator('img').first().getAttribute('alt', { timeout: 1000 }).catch(() => null) };
}
async function settle(page) {
  await page.getByRole('button', { name: /Roll again/ }).waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => /Roll again/.test(b.textContent))?.disabled, null, { timeout: 30000 });
}
async function roll(page) { stepName = 'roll'; await press(page.getByRole('button', { name: /Generate Starting Potential|Roll again/ })); await settle(page); }
async function fill(page, { name = true, nat = true, pos = true, era = true } = {}) {
  if (name) await page.getByPlaceholder('Enter your player name...').fill('Review Walker');
  if (nat) await choose(page, 0, /^England(\s|$)/);
  if (pos) await choose(page, 1, /Striker/);
  if (era) await choose(page, 2, /2020s/);
}
async function begin(page) {
  stepName = 'begin';
  await press(page.getByRole('button', { name: /Begin Career/ }));
  await page.waitForFunction(() => localStorage.getItem('soccerCareerSave') !== null);
  const s = JSON.parse(await page.evaluate(() => localStorage.getItem('soccerCareerSave')));
  return { currentClub: s.currentClub, academyClubName: s.academyClubName, country: s.currentClubCountry, nationality: s.nationality, overall: s.overall, era: s.era };
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
/* jpeg, the viewport plus the create form only: a full page of /soccer-career carries the whole guide and blew the 25 MB cap */
const SHOTS = process.env.SHOTS !== '0';
const shot = async (page, row, name) => {
  if (!SHOTS) return;
  const base = path.join(OUT, `${row.width}-${row.motion}-${name}`);
  await page.screenshot({ path: `${base}-vp.jpg`, type: 'jpeg', quality: 70 }).catch(e => { row.seen.shotError = String(e).split('\n')[0]; });
  const form = page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('xpath=ancestor::div[contains(@class,"max-w-xl")][1]');
  if (await form.count()) await form.screenshot({ path: `${base}-form.jpg`, type: 'jpeg', quality: 70 }).catch(e => { row.seen.formShotError = String(e).split('\n')[0]; });
};
const startedAtShown = (row, shown, started) => {
  check(row, started.currentClub === shown.text, `${row.path}@${row.width}/${row.motion}: shown ${shown.text}, started ${started.currentClub}`);
  check(row, `${started.academyClubName} Youth` === shown.text, `${row.path}@${row.width}/${row.motion}: academyClubName ${started.academyClubName} is not the shown ${shown.text}`);
};
const lineCount = (page, text) => page.getByText(text, { exact: true }).count();

async function runPath(page, row) {
  const p = row.path, tag = `${p}@${row.width}/${row.motion}`;
  if (p === 'S') {
    const all = 'Add your name, then pick a nationality, a position and an era to roll your potential.';
    row.seen.emptyLines = await lineCount(page, all);
    check(row, row.seen.emptyLines === 2, `${tag}: "${all}" shows ${row.seen.emptyLines} times, 2 expected`);
    const gen = page.getByRole('button', { name: /Generate Starting Potential/ });
    check(row, (await gen.count()) === 1 && await gen.isDisabled(), `${tag}: roll button missing or live on an empty form`);
    check(row, await page.getByRole('button', { name: /Begin Career/ }).isDisabled(), `${tag}: Begin Career live on an empty form`);
    row.seen.sidewaysEmpty = await sideways(page);
    check(row, row.seen.sidewaysEmpty <= 0, `${tag}: empty form scrolls sideways by ${row.seen.sidewaysEmpty}px`);
    await shot(page, row, 'S-empty');
    await fill(page, { pos: false, era: false });
    const part = 'Pick a position and an era to roll your potential.';
    row.seen.partLines = await lineCount(page, part);
    check(row, row.seen.partLines === 2, `${tag}: "${part}" shows ${row.seen.partLines} times, 2 expected`);
    await shot(page, row, 'S-partial');
    await choose(page, 1, /Striker/); await choose(page, 2, /2020s/);
    row.seen.fullLines = await lineCount(page, 'Generate your starting potential to begin');
    row.seen.anyMissing = await page.getByText(/to roll your potential\.$/).count();
    check(row, row.seen.anyMissing === 0, `${tag}: a missing line is still on screen with the form complete`);
    check(row, await page.getByRole('button', { name: /Generate Starting Potential/ }).isEnabled(), `${tag}: roll button off with the form complete`);
    await shot(page, row, 'S-complete');
    return;
  }
  if (p === 'H') {
    await fill(page); await roll(page);
    row.seen.before = await readPlacement(page);
    stepName = 'reroll then begin';
    await press(page.getByRole('button', { name: /Roll again/ }));
    row.seen.rollingVisible = await page.getByText('Rolling...', { exact: true }).isVisible();
    const b = page.getByRole('button', { name: /Begin Career/ });
    row.seen.beginEnabledWhileRolling = await b.isEnabled();
    if (row.seen.beginEnabledWhileRolling) {
      await b.click();
      await page.waitForFunction(() => localStorage.getItem('soccerCareerSave') !== null, null, { timeout: 15000 }).catch(() => {});
      const raw = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      if (raw) { const s = JSON.parse(raw); row.seen.started = { currentClub: s.currentClub, overall: s.overall }; }
      row.seen.startedAtShownBeforeReroll = row.seen.started?.currentClub === row.seen.before.text;
      await shot(page, row, 'H-after', false);
    }
    return;
  }
  await fill(page);
  if (p === 'F') {
    stepName = 'roll slowed';
    await press(page.getByRole('button', { name: /Generate Starting Potential/ }));
    row.seen.rollingAtChange = await page.getByText('Rolling...', { exact: true }).isVisible();
    await choose(page, 0, /^Brazil(\s|$)/);
    row.seen.stillRollingAfterChange = await page.getByText('Rolling...', { exact: true }).isVisible();
    check(row, row.seen.rollingAtChange && row.seen.stillRollingAfterChange, `${tag}: the nationality change did not land during the roll`);
    await settle(page);
  } else await roll(page);
  row.seen.first = await readPlacement(page);
  if (p === 'A') { await shot(page, row, 'A-rolled'); }
  if (p === 'D') { await choose(page, 2, /Early 90s/); await page.waitForTimeout(500); }
  if (p === 'G') { await choose(page, 1, /Goalkeeper/); await page.waitForTimeout(300); row.seen.placementAfterPos = await placement(page).count(); await roll(page); }
  if (p === 'I') { await choose(page, 0, /^Brazil(\s|$)/); await page.waitForTimeout(400); row.seen.mid = await readPlacement(page); await choose(page, 0, /^England(\s|$)/); await page.waitForTimeout(400); }
  if (p === 'E') {
    stepName = 'build editor';
    await press(page.getByRole('button', { name: /Customize your build/ }));
    const up5 = page.getByRole('button', { name: 'Starting overall up 5', exact: true });
    await up5.waitFor();
    for (let k = 0; k < 8 && await up5.isEnabled(); k++) await up5.click();
    row.seen.target = Number(await page.getByLabel('Starting overall', { exact: true }).inputValue());
    await press(page.getByRole('button', { name: /Lock in build/ }));
    await page.getByRole('button', { name: /Begin Career/ }).waitFor();
  }
  const shown = await readPlacement(page);
  row.seen.shown = shown;
  if (SHOTS && (p === 'D' || p === 'E' || p === 'F')) await page.getByText('Academy Placement', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][2]').screenshot({ path: path.join(OUT, `${row.width}-${row.motion}-${p}-tile.jpg`), type: 'jpeg', quality: 70 }).catch(() => {});
  row.seen.started = await begin(page);
  startedAtShown(row, shown, row.seen.started);
  if (p === 'F') check(row, row.seen.started.country === 'Brazil' && row.seen.started.nationality === 'Brazil', `${tag}: started in ${row.seen.started.country} as ${row.seen.started.nationality}, Brazil expected`);
  if (p === 'I') check(row, row.seen.started.country === 'England', `${tag}: started in ${row.seen.started.country}, England expected`);
  if (p === 'D') check(row, row.seen.started.era === '1990-94', `${tag}: started in era ${row.seen.started.era}`);
  if (p === 'E') check(row, row.seen.started.overall === row.seen.target, `${tag}: started overall ${row.seen.started.overall}, built ${row.seen.target}`);
  if (p === 'A') { await page.waitForTimeout(600); await shot(page, row, 'A-hub', false); }
}

const browser = await pw.chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) for (const motion of MOTIONS) for (const p of PATHS) {
    const row = { path: p, width: vp.width, motion, issues: [], seen: {} };
    report.rows.push(row);
    const { ctx, page, errors } = await open(browser, vp, motion, vp.width * 10 + p.charCodeAt(0) + (motion === 'reduce' ? 7 : 0), p === 'F' || p === 'H');
    try { await runPath(page, row); }
    catch (e) {
      const lines = String(e && e.message ? e.message : e).split('\n');
      check(row, false, `${p}@${vp.width}/${motion}: threw at step "${stepName}": ${lines[0]}`);
      await page.screenshot({ path: path.join(OUT, `fail-${p}-${vp.width}-${motion}.png`) }).catch(() => {});
    }
    check(row, errors.length === 0, `${p}@${vp.width}/${motion}: page errors ${errors.join(' | ')}`);
    console.log(`${p}@${vp.width}/${motion}: ${row.issues.length ? 'RED ' + row.issues.join('; ') : 'ok'} ${JSON.stringify(row.seen)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(`walkRev1604: ${report.checks} checks, ${report.failed} failed, red paths: ${[...failedPaths].sort().join(', ') || 'none'}`);
process.exit(report.failed ? 1 : 0);

/* Reviewer walk (Round 1213, lens RUN). Runs on the runner against the served build:
 *   node .rc/x/review-run-walk.mjs
 * A new 2026-27 career in three of the leagues this round holds a ledger for, the
 * way a player starts one, at 390x844 and 1280x900, reduced motion off and on.
 * The round promises that NOTHING a player sees changes, so the walk asserts the
 * absence: no "real fixture list" line on the calendar, no key on the save, and
 * none of the nine ledger keys in any file the page fetched.
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const KEYS = ['laliga', 'ligue2', 'eredivisie', 'primeira', 'seriea', 'bundesliga', 'superlig', 'bundesliga2', 'championship'].map(l => `${l}-2026-27-v1`);
const CASES = [
  { tag: 'm390-laliga', width: 390, height: 844, reduced: false, nation: /Spain/i, league: /La Liga/i, club: 'Real Madrid' },
  { tag: 'm390rm-championship', width: 390, height: 844, reduced: true, nation: /England/i, league: /Championship/i, club: 'Wrexham' },
  { tag: 'd1280-bundesliga', width: 1280, height: 900, reduced: false, nation: /Germany/i, league: /^[^A-Za-z0-9]*Bundesliga/i, club: 'Bayern Munich' },
  { tag: 'd1280rm-laliga', width: 1280, height: 900, reduced: true, nation: /Spain/i, league: /La Liga/i, club: 'Barcelona' },
];
const report = { base: BASE, cases: [], failures: [] };
const fail = m => { report.failures.push(m); console.error(`  FAIL: ${m}`); };

const browser = await chromium.launch({ args: ['--no-sandbox'] });
for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height }, reducedMotion: c.reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  const fetched = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
  page.on('response', async res => {
    const url = res.url();
    if (!url.startsWith(BASE) || !/\.(js|html)(\?|$)/.test(url)) return;
    try { const body = await res.text(); fetched.push({ url: url.slice(BASE.length), hit: KEYS.filter(k => body.includes(k)), real: body.includes('opponent order and home/away venues') }); } catch { /* a body that is gone */ }
  });
  const rec = { tag: c.tag, steps: [], shots: [] };
  const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const shot = async name => {
    const file = `${c.tag}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: false });
    rec.shots.push(file);
  };
  const tap = async (rx, label) => {
    const b = page.getByRole('button', { name: rx }).first();
    await b.waitFor({ timeout: 10000 }).catch(() => {});
    const ok = await b.click({ timeout: 5000 }).then(() => true).catch(() => false);
    rec.steps.push(`${ok ? 'pressed' : 'COULD NOT PRESS'} ${label}`);
    await page.waitForTimeout(500);
    return ok;
  };
  const tapText = async (rx, label) => {
    const b = page.locator('button:visible').filter({ hasText: rx }).first();
    await b.waitFor({ timeout: 10000 }).catch(() => {});
    const ok = await b.click({ timeout: 5000 }).then(() => true).catch(() => false);
    rec.steps.push(`${ok ? 'pressed' : 'COULD NOT PRESS'} ${label}`);
    await page.waitForTimeout(500);
    return ok;
  };
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
    await shot('01-picker');
    await tap(/2026-27/i, 'the 2026-27 season');
    await tap(c.nation, 'the country');
    await shot('02-leagues');
    await tap(c.league, 'the league');
    const club = page.locator('button').filter({ hasText: new RegExp(`^\\s*${c.club}`) }).first();
    await club.waitFor({ timeout: 10000 }).catch(() => {});
    rec.steps.push(await club.click({ timeout: 5000 }).then(() => `pressed ${c.club}`).catch(() => `COULD NOT PRESS ${c.club}`));
    await page.waitForTimeout(400);
    await shot('03-club');
    await tap(/take the job|confirm|start/i, 'the confirm bar');
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tap(/skip: just manage/i, 'skip the dugout form');
    await page.waitForTimeout(1500);
    const hub = await text();
    rec.inJob = /Season 1/i.test(hub);
    rec.hubHead = hub.slice(0, 160);
    if (!rec.inJob) fail(`${c.tag}: did not reach the job (${hub.slice(0, 120)})`);
    await shot('04-hub');
    const save = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'); } catch { return null; } });
    rec.saveClub = save && save.clubName;
    rec.saveHasKey = !!(save && Object.hasOwn(save, 'realLeagueFixtures'));
    if (save && save.clubName !== c.club) fail(`${c.tag}: the save is for ${save.clubName}, wanted ${c.club}`);
    if (!save) fail(`${c.tag}: no save after taking the job`);
    if (rec.saveHasKey) fail(`${c.tag}: the save carries realLeagueFixtures (${save.realLeagueFixtures})`);
    rec.calendarOpened = await tapText(/Calendar/i, 'the calendar tile');
    await page.waitForTimeout(900);
    const cal = await text();
    rec.calendarHead = cal.slice(0, 220);
    rec.calendarClaimsReal = /opponent order|real 2026\/27|real league opponent|home\/away venues/i.test(cal);
    if (rec.calendarClaimsReal) fail(`${c.tag}: the calendar claims a real fixture list`);
    if (!rec.calendarOpened) fail(`${c.tag}: the calendar tile could not be opened`);
    await shot('05-calendar');
    await page.evaluate(() => window.scrollTo(0, 0));
    rec.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (rec.overflowX > 1) fail(`${c.tag}: the page scrolls sideways by ${rec.overflowX}px on the calendar`);
    const help = page.getByRole('button', { name: /how to play/i }).first();
    rec.helpOpened = await help.click({ timeout: 4000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(800);
    const helpText = await text();
    rec.helpNamesRealFixtures = /real 2026\/27|real fixture|opponent order/i.test(helpText);
    await shot('06-help');
  } catch (e) {
    fail(`${c.tag}: the walk threw: ${String(e.message || e).slice(0, 200)}`);
  }
  rec.pageErrors = errs.slice(0, 5);
  if (errs.length) fail(`${c.tag}: ${errs.length} page error(s), the first: ${errs[0]}`);
  rec.filesFetched = fetched.length;
  rec.filesWithLedgerKey = fetched.filter(f => f.hit.length).map(f => `${f.url}: ${f.hit.join(',')}`);
  rec.filesWithCoverageSentence = fetched.filter(f => f.real).map(f => f.url);
  if (rec.filesWithLedgerKey.length) fail(`${c.tag}: a fetched file holds a ledger key: ${rec.filesWithLedgerKey[0]}`);
  report.cases.push(rec);
  console.log(`${c.tag}: in job ${rec.inJob}, save ${rec.saveClub}, key on save ${rec.saveHasKey}, calendar opened ${rec.calendarOpened}, calendar claims real ${rec.calendarClaimsReal}, help opened ${rec.helpOpened}, ${rec.filesFetched} files fetched, ${rec.filesWithLedgerKey.length} with a ledger key, page errors ${errs.length}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 2));
if (report.failures.length) { console.error(`r1213 walk: FAILED, ${report.failures.length} failure(s) over ${CASES.length} journeys`); process.exit(1); }
console.log(`r1213 walk: OK, ${CASES.length} journeys, no ledger reaches a page and nothing on screen claims a real list`);

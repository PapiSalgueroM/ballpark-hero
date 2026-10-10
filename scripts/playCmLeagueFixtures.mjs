/* Round 1225 walk: a new Club Manager career opens on its league's real 2026/27 fixture list, on the page.
 *
 * Three leagues of three sizes (EFL Championship 24, La Liga 20, Bundesliga 18), each at 390 by 844 and
 * 1280 by 800, through the picker a player uses, on a served build:
 *   - the page fetches that league's list (one small file) when the club is tapped, and no other league's;
 *   - the save holds the league's key, the hub's next match card shows the real first opponent and ground,
 *     the Calendar grid holds that fixture as a day, and the Calendar's line names the league, says what is real and what is simulated, and links the two
 *     sources the ledger ships;
 *   - Help names the league in its fixture paragraph and holds no link there;
 *   - after a reload the career is resumed on the same list (the boot waits for the file again).
 * One more journey delays the list by three seconds: the start waits for the fetch the club tap began and
 * still opens on the real list (without that wait the career would start on generated fixtures).
 * And what must NOT fetch a list: the page before a club is tapped, a career in a league with no list
 * (Celtic, with no line on its Calendar), Manager Hot Seat and Deadline Day.
 *
 *   BASE=http://localhost:4173 node scripts/playCmLeagueFixtures.mjs     (a build served by scripts/lib/hostLikeServer.mjs)
 * Screenshots and report.json go to $RC_OUT, or to cm-league-fixture-walk/ when that is not set. The live
 * database host is blocked. Named play*, so the suite runner does not pick it up: it needs a served build.
 * Green is the closing summary line and exit code 0.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadLedgers } from './lib/cmFixtureSources/gameBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, 'cm-league-fixture-walk'));
const SAVE = 'dukb-club-manager-save', NOW = 1791547200000;
const WALKS = [
  { leagueId: 'championship', nation: 'England', league: 'EFL Championship', club: 'Wrexham', file: 'Championship' },
  { leagueId: 'laliga', nation: 'Spain', league: 'La Liga', club: 'Barcelona', file: 'LaLiga' },
  { leagueId: 'bundesliga', nation: 'Germany', league: 'Bundesliga', club: 'Bayern Munich', file: 'Bundesliga' },
];
const PROFILES = [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 800, touch: false }];
const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
fs.mkdirSync(OUT, { recursive: true });

const ledgers = new Map((await loadLedgers()).map(l => [l.ledger.leagueId, l.ledger]));
const report = { base: BASE, journeys: [], quiet: [] };
const failures = [];
const browser = await chromium.launch();

async function open(profile, slowListMs = 0) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch });
  await context.route(/supabase\.co/, route => route.abort());
  /* A list that takes its time, for the journey that holds the start to its wait. */
  if (slowListMs) await context.route(/clubManager[A-Za-z0-9]+Fixtures2026/, async route => { await new Promise(resolve => setTimeout(resolve, slowListMs)); await route.continue(); });
  await context.addInitScript(({ now }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential');
  }, { now: NOW });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const lists = [], errors = [];
  page.on('request', request => { const m = /clubManager([A-Za-z0-9]+)Fixtures2026/.exec(request.url()); if (m) lists.push(m[1]); });
  page.on('pageerror', error => errors.push(String(error)));
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  return { context, page, lists, errors, activate };
}
async function pick(s, walk) {
  await s.activate(s.page.getByRole('button', { name: /2026-27/ }));
  await s.activate(s.page.getByRole('button', { name: new RegExp(`^${escapeRe(walk.nation)}`) }));
  await s.activate(s.page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: s.page.getByText(walk.league, { exact: true }) }).first());
  await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText(walk.club, { exact: true }) }));
  await s.activate(s.page.getByRole('button', { name: 'Take the job', exact: true }));
  await s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
  await s.page.locator('[data-cm-way="quick"]').waitFor();
  await s.page.evaluate(() => document.fonts.ready);
}
const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE);
const openCalendar = async s => { await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText('Calendar', { exact: true }) })); await s.page.locator('[data-testid="cm-calendar-grid"]').waitFor(); };

async function journey(walk, profile) {
  const id = `${walk.leagueId}-${profile.name}`, row = { id, checks: [] };
  const ok = (what, pass, detail = '') => { row.checks.push({ what, pass, detail }); if (!pass) failures.push(`${id}: ${what}${detail ? ` (${detail})` : ''}`); };
  const ledger = ledgers.get(walk.leagueId), key = ledger.key;
  const fixture = round => { const p = ledger.rounds[round].find(x => x.includes(walk.club)); return { opponent: p[0] === walk.club ? p[1] : p[0], home: p[0] === walk.club }; };
  const first = fixture(0);
  const s = await open(profile);
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    ok('the page fetched no fixture list before a club was tapped', s.lists.length === 0, s.lists.join(','));
    await pick(s, walk);
    const save = await readSave(s.page);
    ok('the save is the club that was picked', save?.clubName === walk.club, String(save?.clubName));
    ok('the save holds the key of its league\'s real list', save?.realLeagueFixtures === key, String(save?.realLeagueFixtures));
    ok('the page fetched that league\'s list and no other', JSON.stringify([...new Set(s.lists)]) === JSON.stringify([walk.file]), s.lists.join(','));
    /* The hub's next match card: "<club> vs <opponent>" over "Home" or "Away". The picker leaves the page scrolled, so go to the top first. */
    await s.page.evaluate(() => window.scrollTo(0, 0));
    const hub = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
    const venue = first.home ? 'Home' : 'Away';
    ok(`the next match card shows the real first fixture: ${walk.club} vs ${first.opponent}, ${venue}`, hub.includes(`${walk.club} vs ${first.opponent} ${venue}`), hub.slice(Math.max(0, hub.indexOf(walk.club + ' vs')), hub.indexOf(walk.club + ' vs') + 80));
    await s.page.screenshot({ path: path.join(OUT, `${id}-hub.png`) });
    await openCalendar(s);
    const line = s.page.locator(`[data-cm-fixture-coverage="${key}"]`);
    const text = (await line.count()) ? await line.innerText() : '';
    ok('the Calendar names the league and says what is real and what is simulated', text.startsWith(`Real 2026/27 ${walk.league} opponent order and home/away venues. Calendar dates and results are simulated. The order is the list as `), text.slice(0, 160));
    const links = (await line.count()) ? await line.locator('a').evaluateAll(as => as.map(a => a.href)) : [];
    ok('the Calendar links the two sources the ledger ships', JSON.stringify(links) === JSON.stringify(ledger.sources.map(x => x.url)), links.join(' '));
    const named = s.page.getByRole('button', { name: new RegExp(`: ${first.home ? 'vs' : 'at'} ${escapeRe(first.opponent)} · `) });
    ok('the Calendar grid holds the real first fixture as a day', (await named.count()) > 0);
    ok('the page is no wider than the screen', await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (await line.count()) await line.scrollIntoViewIfNeeded();
    await s.page.screenshot({ path: path.join(OUT, `${id}-calendar.png`) });
    row.calendarLine = text;
    /* Help. */
    await s.activate(s.page.getByRole('button', { name: 'How to play', exact: true }));
    const para = s.page.locator('[data-cm-help="real-fixtures"]');
    await para.waitFor();
    ok('Help names the league in its fixture paragraph', (await para.locator(`[data-cm-fixture-league="${walk.leagueId}"]`).count()) === 1);
    ok('Help holds no link in its fixture paragraph', (await para.locator('a').count()) === 0);
    await para.scrollIntoViewIfNeeded();
    await s.page.screenshot({ path: path.join(OUT, `${id}-help.png`) });
    row.help = await para.innerText();
    /* A reload: the boot reads the save's key and waits for the list again. */
    s.lists.length = 0;
    await s.page.reload({ waitUntil: 'networkidle' });
    await s.activate(s.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await s.page.locator('[data-cm-way="quick"]').waitFor();
    ok('after a reload the boot fetched the saved key\'s list and no other', JSON.stringify([...new Set(s.lists)]) === JSON.stringify([walk.file]), s.lists.join(','));
    await openCalendar(s);
    ok('after a reload the Calendar still carries the line', (await s.page.locator(`[data-cm-fixture-coverage="${key}"]`).count()) === 1);
    ok('the save still holds its key', (await readSave(s.page))?.realLeagueFixtures === key);
    ok('no page error', s.errors.length === 0, s.errors.slice(0, 2).join(' | '));
  } catch (error) {
    ok('the journey ran to its end', false, String(error && error.message).split('\n')[0]);
    await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {});
  } finally { await s.context.close(); }
  report.journeys.push(row);
}

/* The list arrives three seconds late, long after the dugout step is done: the start has to WAIT for the fetch the
   club tap began, on the loading screen, and then open on the real list. Without the wait this career has no key. */
async function slowList(walk, profile) {
  const id = `${walk.leagueId}-${profile.name}-slow-list`, row = { id, checks: [] };
  const ok = (what, pass, detail = '') => { row.checks.push({ what, pass, detail }); if (!pass) failures.push(`${id}: ${what}${detail ? ` (${detail})` : ''}`); };
  const key = ledgers.get(walk.leagueId).key;
  const s = await open(profile, 3000);
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    const t0 = Date.now();
    await pick(s, walk);
    row.msFromFirstTapToHub = Date.now() - t0;
    const save = await readSave(s.page);
    ok('with its list three seconds late the career still opens on it: the save holds the key', save?.realLeagueFixtures === key, String(save?.realLeagueFixtures));
    await openCalendar(s);
    ok('and the Calendar carries the line', (await s.page.locator(`[data-cm-fixture-coverage="${key}"]`).count()) === 1);
    ok('no page error', s.errors.length === 0, s.errors.slice(0, 2).join(' | '));
  } catch (error) {
    ok('the journey ran to its end', false, String(error && error.message).split('\n')[0]);
  } finally { await s.context.close(); }
  report.journeys.push(row);
}

/* What must fetch no list at all. */
async function quiet(name, run) {
  const s = await open(PROFILES[1]);
  const row = { name, lists: null, pass: false };
  try { row.extra = await run(s); row.lists = [...new Set(s.lists)]; row.pass = row.lists.length === 0 && row.extra !== false && s.errors.length === 0; row.errors = s.errors.slice(0, 2); }
  catch (error) { row.error = String(error && error.message).split('\n')[0]; }
  finally { await s.context.close(); }
  if (!row.pass) failures.push(`${name}: fetched ${JSON.stringify(row.lists)}${row.error ? `, stopped: ${row.error}` : ''}${row.extra === false ? ', its own check failed' : ''}`);
  report.quiet.push(row);
}

for (const walk of WALKS) for (const profile of PROFILES) await journey(walk, profile);
await slowList(WALKS[1], PROFILES[1]);
await quiet('a new career in a league with no list (Celtic)', async s => {
  await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pick(s, { nation: 'Scotland', league: 'Scottish Premiership', club: 'Celtic' });
  const save = await readSave(s.page);
  await openCalendar(s);
  await s.page.screenshot({ path: path.join(OUT, 'celtic-1280-calendar.png') });
  return save?.clubName === 'Celtic' && !('realLeagueFixtures' in save) && (await s.page.locator('[data-cm-fixture-coverage]').count()) === 0;
});
for (const route of ['/manager-hot-seat', '/deadline-day']) await quiet(`${route} opens`, async s => { await s.page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }); await s.page.waitForTimeout(1500); return (await s.page.locator('h1, h2').count()) > 0; });
await browser.close();

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
for (const line of failures) console.error(`FAIL ${line}`);
const checks = report.journeys.reduce((sum, j) => sum + j.checks.length, 0);
if (failures.length) { console.error(`playCmLeagueFixtures: ${failures.length} FAILURE(S) over ${report.journeys.length} journeys and ${report.quiet.length} quiet pages`); process.exit(1); }
console.log(`playCmLeagueFixtures: green. ${WALKS.length * PROFILES.length} journeys (${WALKS.map(w => w.league).join(', ')} at 390 and 1280) and one with its list three seconds late, ${checks} checks, and ${report.quiet.length} pages that fetch no fixture list.`);

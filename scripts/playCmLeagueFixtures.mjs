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
 * Round 1225 review, seven more journeys (each described where it is written):
 *   - a mid season takeover (Autumn in La Liga at 390, The run-in in the Championship at 1280): the dugout note,
 *     the key, the real matchdays the manager before you played, the Calendar line, the Help sentence;
 *   - the list refused at the club tap: one reload, then a notice on screen with both answers, never a silent
 *     generated season;
 *   - the list never answering, at both widths: a wait that says what it waits for and is ON SCREEN, the notice
 *     after eight seconds, Try again, Start on generated fixtures;
 *   - the list thirteen seconds late: the notice first, then the career on its real list;
 *   - a saved career whose list is refused at boot: the notice, the save untouched, the retry.
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

/* list: a number of milliseconds the list file is held back, 'refuse' (the request fails) or 'hang' (it never answers). */
async function open(profile, list = 0) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch });
  await context.route(/supabase\.co/, route => route.abort());
  /* A list that takes its time, for the journeys that hold the start to its wait; one that fails; one that never comes. */
  if (typeof list === 'number' && list) await context.route(/clubManager[A-Za-z0-9]+Fixtures2026/, async route => { await new Promise(resolve => setTimeout(resolve, list)); await route.continue().catch(() => {}); });
  if (list === 'refuse') await context.route(/clubManager[A-Za-z0-9]+Fixtures2026/, route => route.abort());
  if (list === 'hang') await context.route(/clubManager[A-Za-z0-9]+Fixtures2026/, () => {});
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
/* The picker in its steps: the club tap (which is what asks for the list), the club's own "Take the job", then the dugout step. */
async function pickClub(s, walk) {
  await s.activate(s.page.getByRole('button', { name: /2026-27/ }));
  await s.activate(s.page.getByRole('button', { name: new RegExp(`^${escapeRe(walk.nation)}`) }));
  await s.activate(s.page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: s.page.getByText(walk.league, { exact: true }) }).first());
  await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText(walk.club, { exact: true }) }));
}
const takeJob = s => s.activate(s.page.getByRole('button', { name: 'Take the job', exact: true }));
const skipManager = s => s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
const hubReady = async s => { await s.page.locator('[data-cm-way="quick"]').waitFor(); await s.page.evaluate(() => document.fonts.ready); };
async function pick(s, walk) { await pickClub(s, walk); await takeJob(s); await skipManager(s); await hubReady(s); }
/* Where an element sits against the screen: seen is true only when the whole of it is inside the viewport. */
const placeOf = (page, selector) => page.evaluate(sel => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), screen: innerHeight, seen: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight };
}, selector);
const WAIT = '[data-testid="cm-start-wait"]', NOTICE = '[data-testid="cm-era-load-failed"]';
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

/* One journey of the review's: its checks, its failures, a screenshot where it stopped. */
async function reviewJourney(id, profile, list, run) {
  const row = { id, checks: [] };
  const ok = (what, pass, detail = '') => { row.checks.push({ what, pass, detail }); if (!pass) failures.push(`${id}: ${what}${detail ? ` (${detail})` : ''}`); };
  const s = await open(profile, list);
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    await run(s, ok, row);
    ok('no page error', s.errors.length === 0, s.errors.slice(0, 2).join(' | '));
  } catch (error) {
    ok('the journey ran to its end', false, String(error && error.message).split('\n')[0]);
    await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {});
  } finally { await s.context.close(); }
  report.journeys.push(row);
}
const flat = text => String(text || '').replace(/\s+/g, ' ');

/* Round 1225 review: a mid season takeover in a league with a real list. The dugout step says the run-in is
   simulated and no longer says the game draws its own fixture list. The career that comes back holds the key,
   every league match the manager before you played is the ledger's fixture for that matchday at that ground
   (read off the save's own result log), the Calendar carries the line, and Help says the same thing. */
const takeover = (walk, profile, when) => reviewJourney(`${walk.leagueId}-${profile.name}-takeover`, profile, 0, async (s, ok, row) => {
  const ledger = ledgers.get(walk.leagueId), key = ledger.key;
  await pickClub(s, walk); await takeJob(s);
  await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText(when.label, { exact: true }) }));
  const noteAt = s.page.getByText(/simulated run-in, not the real one/);
  const note = flat(await noteAt.innerText());
  ok('the dugout step says every result up to here is the game\'s own', note.includes('It is a simulated run-in, not the real one: every result up to here is played out by the game'), note.slice(0, 240));
  ok('and it does not say the game draws its own fixture list', !/own fixture list/i.test(note), note.slice(0, 240));
  await noteAt.scrollIntoViewIfNeeded();
  await s.page.screenshot({ path: path.join(OUT, `${row.id}-dugout.png`) });
  await skipManager(s); await hubReady(s);
  const save = await readSave(s.page);
  ok('the save records the takeover', save?.midSeasonStart === when.id, String(save?.midSeasonStart));
  ok('the save holds the key of its league\'s real list', save?.realLeagueFixtures === key, String(save?.realLeagueFixtures));
  const played = (save?.resultLog || []).filter(e => e.competition === 'league');
  const wrong = played.filter((e, round) => { const p = ledger.rounds[round].find(x => x.includes(walk.club)); return !p || e.opp !== (p[0] === walk.club ? p[1] : p[0]) || e.home !== (p[0] === walk.club); });
  row.playedBefore = played.length;
  ok(`the ${played.length} league matches the manager before you played are the real matchdays in order, at the real grounds`, played.length > 0 && wrong.length === 0, wrong.slice(0, 2).map(e => `${e.opp} ${e.home ? 'H' : 'A'}`).join(', '));
  await openCalendar(s);
  const line = s.page.locator(`[data-cm-fixture-coverage="${key}"]`);
  ok('the Calendar carries the real list\'s line', (await line.count()) === 1);
  if (await line.count()) await line.scrollIntoViewIfNeeded();
  await s.page.screenshot({ path: path.join(OUT, `${row.id}-calendar.png`) });
  await s.activate(s.page.getByRole('button', { name: 'How to play', exact: true }));
  const para = s.page.locator('[data-cm-help="real-fixtures"]');
  await para.waitFor();
  const help = flat(await para.innerText());
  ok('Help says the weeks before a takeover were played in the real order', help.includes('Take a club over part way through that first season and the weeks before you were played in the real order too.'));
  ok('Help says a club you move to during a season keeps generated fixtures', help.includes('a club you move to during a season keep generated fixtures'));
});

/* Round 1225 review: the list file will not load. The first failed chunk in a tab meets the site's stale chunk
   rule: the page reloads once and the picker starts over (a tab older than the last deploy gets the new build
   that way). A second failure in the same tab reaches the start, which says the list did not load and asks, on
   screen, instead of starting a generated season without a word. Start on generated fixtures then does that. */
const refusedList = (walk, profile) => reviewJourney(`${walk.leagueId}-${profile.name}-refused-list`, profile, 'refuse', async (s, ok, row) => {
  let loads = 0;
  s.page.on('load', () => { loads += 1; });
  await pickClub(s, walk);
  await s.page.waitForTimeout(3000);
  ok('the first refused list reloads the page once (the stale chunk rule)', loads === 1, `page loads since the club tap: ${loads}`);
  await s.page.waitForLoadState('networkidle');
  ok('and the picker is back at its first step', (await s.page.getByRole('button', { name: /2026-27/ }).count()) > 0);
  await pickClub(s, walk); await takeJob(s); await skipManager(s);
  const notice = s.page.locator(NOTICE);
  await notice.waitFor();
  const text = flat(await notice.innerText());
  ok('the second refusal says the fixture list did not load', text.includes('The 2026-27 fixture list did not load.'), text.slice(0, 200));
  ok('and offers both answers', text.includes('Try again') && text.includes('Start on generated fixtures'), text.slice(0, 200));
  await s.page.waitForTimeout(1500);
  const place = await placeOf(s.page, NOTICE);
  ok('the notice is on screen', !!place && place.seen, JSON.stringify(place));
  ok('no career was started behind it', (await readSave(s.page)) === null);
  ok('the page reloaded only that once', loads === 1, `page loads: ${loads}`);
  await s.page.screenshot({ path: path.join(OUT, `${row.id}-notice.png`) });
  await s.activate(s.page.getByRole('button', { name: 'Start on generated fixtures', exact: true }));
  await hubReady(s);
  const save = await readSave(s.page);
  ok('Start on generated fixtures starts that club with no key', save?.clubName === walk.club && !('realLeagueFixtures' in save), `${save?.clubName} ${save?.realLeagueFixtures}`);
  await openCalendar(s);
  ok('and its Calendar claims no real list', (await s.page.locator('[data-cm-fixture-coverage]').count()) === 0);
});

/* Round 1225 review: the list never answers. The start waits on a screen that says what it is waiting for, where
   the player is looking; after eight seconds it says the list did not load and asks. Try again waits again (a
   fetch that is only slow is still out) and Start on generated fixtures starts the career with no key. */
const hungList = (walk, profile) => reviewJourney(`${walk.leagueId}-${profile.name}-hung-list`, profile, 'hang', async (s, ok, row) => {
  await pickClub(s, walk); await takeJob(s);
  const t0 = Date.now();
  await skipManager(s);
  const wait = s.page.locator(WAIT);
  await wait.waitFor();
  ok('the wait says what it is waiting for', flat(await wait.innerText()).includes('Loading the 2026-27 fixture list'), flat(await wait.innerText()));
  await s.page.waitForTimeout(1500);
  const waiting = await placeOf(s.page, WAIT);
  row.waitPlace = waiting;
  ok('the wait is on screen, where the player is looking', !!waiting && waiting.seen, JSON.stringify(waiting));
  await s.page.screenshot({ path: path.join(OUT, `${row.id}-waiting.png`) });
  const notice = s.page.locator(NOTICE);
  await notice.waitFor({ timeout: 15000 });
  row.msToNotice = Date.now() - t0;
  ok('the page does not give up on the list before eight seconds', row.msToNotice >= 7500, `${row.msToNotice} ms`);
  ok('it says the fixture list did not load', flat(await notice.innerText()).includes('The 2026-27 fixture list did not load.'));
  const place = await placeOf(s.page, NOTICE);
  row.noticePlace = place;
  ok('the notice is on screen', !!place && place.seen, JSON.stringify(place));
  ok('no career was started while it waited', (await readSave(s.page)) === null);
  await s.page.screenshot({ path: path.join(OUT, `${row.id}-notice.png`) });
  await s.activate(s.page.getByRole('button', { name: 'Try again', exact: true }));
  await wait.waitFor();
  ok('Try again goes back to waiting, with no reload, for a list that is only slow', (await notice.count()) === 0);
  await notice.waitFor({ timeout: 15000 });
  await s.activate(s.page.getByRole('button', { name: 'Start on generated fixtures', exact: true }));
  await hubReady(s);
  const save = await readSave(s.page);
  ok('Start on generated fixtures starts that club with no key', save?.clubName === walk.club && !('realLeagueFixtures' in save), `${save?.clubName} ${save?.realLeagueFixtures}`);
  await openCalendar(s);
  ok('and its Calendar claims no real list', (await s.page.locator('[data-cm-fixture-coverage]').count()) === 0);
});

/* Round 1225 review: the list turns up thirteen seconds late, after the notice is already on screen. The career
   then starts by itself, on the real list: the player asked for that club and the list is here. */
const lateList = (walk, profile) => reviewJourney(`${walk.leagueId}-${profile.name}-late-list`, profile, 13000, async (s, ok) => {
  const key = ledgers.get(walk.leagueId).key;
  await pickClub(s, walk); await takeJob(s); await skipManager(s);
  await s.page.locator(NOTICE).waitFor({ timeout: 15000 });
  ok('the notice came first, with no career behind it', (await readSave(s.page)) === null);
  await hubReady(s);
  ok('when the list arrives the career starts on it: the save holds the key', (await readSave(s.page))?.realLeagueFixtures === key);
  await openCalendar(s);
  ok('and the Calendar carries the line', (await s.page.locator(`[data-cm-fixture-coverage="${key}"]`).count()) === 1);
});

/* Round 1225 review: a saved career that holds a key, opened when its list will not load. The first failure
   reloads the page once (the stale chunk rule), then the boot says the list did not load and never opens the
   career on a generated season or offers a fresh start over it. The save is not touched. With the file back,
   Try again brings the career back on its real list. */
const bootRefused = (walk, profile) => reviewJourney(`${walk.leagueId}-${profile.name}-boot-refused`, profile, 0, async (s, ok, row) => {
  const key = ledgers.get(walk.leagueId).key, list = /clubManager[A-Za-z0-9]+Fixtures2026/;
  await pick(s, walk);
  const before = await s.page.evaluate(k => localStorage.getItem(k), SAVE);
  ok('the career to be reopened holds its key', JSON.parse(before || 'null')?.realLeagueFixtures === key);
  const refuse = route => route.abort();
  await s.context.route(list, refuse);
  await s.page.reload({ waitUntil: 'networkidle' });
  const notice = s.page.locator(NOTICE);
  await notice.waitFor({ timeout: 20000 });
  const text = flat(await notice.innerText());
  ok('the boot says the fixture list did not load', text.includes('The 2026-27 fixture list did not load.') && text.includes('Nothing has been lost.'), text.slice(0, 200));
  ok('and offers the retry and the way back to the managers', text.includes('Try again') && text.includes('Back to your managers'), text.slice(0, 200));
  ok('the career did not open', (await s.page.locator('[data-cm-way="quick"]').count()) === 0);
  ok('the save bytes are untouched', (await s.page.evaluate(k => localStorage.getItem(k), SAVE)) === before);
  await s.page.screenshot({ path: path.join(OUT, `${row.id}-notice.png`) });
  await s.context.unroute(list, refuse);
  await s.activate(s.page.getByRole('button', { name: 'Try again', exact: true }));
  await s.activate(s.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
  await hubReady(s);
  ok('with the file back, Try again brings the career back with its key', (await readSave(s.page))?.realLeagueFixtures === key);
  await openCalendar(s);
  ok('on its real list', (await s.page.locator(`[data-cm-fixture-coverage="${key}"]`).count()) === 1);
});

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
/* Round 1225 review: the takeover, and every way a list can fail to be there, each at one width. */
const REVIEW = [
  () => takeover(WALKS[1], PROFILES[0], { id: 'autumn', label: 'Autumn' }),
  () => takeover(WALKS[0], PROFILES[1], { id: 'runIn', label: 'The run-in' }),
  () => refusedList(WALKS[1], PROFILES[0]),
  () => hungList(WALKS[2], PROFILES[1]),
  () => hungList(WALKS[0], PROFILES[0]),
  () => lateList(WALKS[0], PROFILES[1]),
  () => bootRefused(WALKS[1], PROFILES[1]),
];
for (const run of REVIEW) await run();
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
console.log(`playCmLeagueFixtures: green. ${WALKS.length * PROFILES.length} journeys (${WALKS.map(w => w.league).join(', ')} at 390 and 1280), one with its list three seconds late and ${REVIEW.length} of the review's (two takeovers, a list refused, two that never answer, one thirteen seconds late, a saved career whose list is refused at boot), ${checks} checks, and ${report.quiet.length} pages that fetch no fixture list.`);

/* Reviewer's walk for Round 1225 (never committed). BASE = the head's served build, BASE_OLD = the base's.
   Blocks the live database host. Screenshots and report.json go to $RC_OUT. FAIL lines are findings to
   look at, NOTE lines are measurements. Exit 1 when any FAIL. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadLedgers } from '../../scripts/lib/cmFixtureSources/gameBundle.mjs';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OLD = (process.env.BASE_OLD || '').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || 'rwalk-out');
const SAVE = 'dukb-club-manager-save', NOW = 1791547200000;
fs.mkdirSync(OUT, { recursive: true });
const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const P390 = { name: '390', width: 390, height: 844, touch: true };
const P1280 = { name: '1280', width: 1280, height: 900, touch: false };
const ledgers = new Map((await loadLedgers()).map(l => [l.ledger.leagueId, l.ledger]));
const failures = [], notes = [], report = { journeys: [] };
const fail = (id, what, detail = '') => { failures.push(`${id}: ${what}${detail ? ` (${detail})` : ''}`); console.error(`FAIL ${id}: ${what}${detail ? ` (${detail})` : ''}`); };
const note = (id, what) => { notes.push(`${id}: ${what}`); console.log(`NOTE ${id}: ${what}`); };
const browser = await chromium.launch();

async function open(profile, motion, opts = {}) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, reducedMotion: motion });
  await context.route(/supabase\.co/, route => route.abort());
  if (opts.block) await context.route(opts.block, route => route.abort());
  if (opts.hang) await context.route(opts.hang, () => { /* never answered */ });
  if (opts.slowMs) await context.route(/clubManager[A-Za-z0-9]+Fixtures2026/, async route => { await new Promise(r => setTimeout(r, opts.slowMs)); await route.continue(); });
  await context.addInitScript(({ now, seed }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential');
    if (seed && !localStorage.getItem('__rv_seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); localStorage.setItem('__rv_seeded', '1'); }
  }, { now: NOW, seed: opts.seed || null });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const lists = [], errors = [], consoleErrors = [];
  page.on('request', request => { const m = /clubManager([A-Za-z0-9]+)Fixtures2026/.exec(request.url()); if (m) lists.push(m[1]); });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  return { context, page, lists, errors, consoleErrors, activate, profile };
}
async function pickTo(s, walk, upTo = 'hub') {
  await s.activate(s.page.getByRole('button', { name: /2026-27/ }));
  await s.activate(s.page.getByRole('button', { name: new RegExp(`^${escapeRe(walk.nation)}`) }));
  await s.activate(s.page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: s.page.getByText(walk.league, { exact: true }) }).first());
  await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText(walk.club, { exact: true }) }));
  await s.activate(s.page.getByRole('button', { name: 'Take the job', exact: true }));
  if (upTo === 'dugout') return;
  await s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
  await s.page.locator('[data-cm-way="quick"]').waitFor();
  await s.page.evaluate(() => document.fonts.ready);
}
const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE);
const openCalendar = async s => { await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText('Calendar', { exact: true }) })); await s.page.locator('[data-testid="cm-calendar-grid"]').waitFor(); };
const fixtureOf = (ledger, club, round) => { const p = ledger.rounds[round].find(x => x.includes(club)); return { opponent: p[0] === club ? p[1] : p[0], home: p[0] === club }; };
const bodyText = async page => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const hubCard = async (s, club) => { await s.page.evaluate(() => window.scrollTo(0, 0)); const t = await bodyText(s.page); const i = t.indexOf(`${club} vs`); return i < 0 ? '' : t.slice(i, i + 90); };
const ASOF = { seriea: 'the list as first published in June 2026', bundesliga2: 'the list as first published in July 2026', eredivisie: 'the list as it stood on 10 October 2026', primeira: 'the list as it stood on 10 October 2026', superlig: 'the list as it stood on 10 October 2026', ligue2: 'the list as it stood on 10 October 2026', laliga: 'the list as it stood on 10 October 2026', championship: 'the list as first published in June 2026', bundesliga: 'the list as first published in July 2026', premier: 'the list as first published in June 2026' };

/* ---- J1: a new career in a league the builder's walk did not play, then one match played ---- */
async function newCareer(walk, profile, motion) {
  const id = `new-${walk.leagueId}-${profile.name}-${motion === 'reduce' ? 'rm' : 'm'}`, row = { id };
  const ledger = ledgers.get(walk.leagueId);
  const s = await open(profile, motion);
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    if (s.lists.length) fail(id, 'a list was fetched before a club was tapped', s.lists.join(','));
    await pickTo(s, walk);
    row.scrollYAfterStart = await s.page.evaluate(() => Math.round(window.scrollY));
    await s.page.screenshot({ path: path.join(OUT, `${id}-asleft.png`) });
    await s.page.waitForTimeout(1500);
    note(id, `HEAD after the start and 1.5 s: ${await where(s.page)}`);
    const save = await readSave(s.page);
    if (save?.realLeagueFixtures !== ledger.key) fail(id, 'the save does not hold its league key', String(save?.realLeagueFixtures));
    if (JSON.stringify([...new Set(s.lists)]) !== JSON.stringify([walk.file])) fail(id, 'fetched lists are not exactly this league', s.lists.join(','));
    const f = [0, 1, 2].map(r => fixtureOf(ledger, walk.club, r));
    const card = await hubCard(s, walk.club);
    row.hubCard = card;
    if (!card.includes(`${walk.club} vs ${f[0].opponent} ${f[0].home ? 'Home' : 'Away'}`)) fail(id, `the hub card is not the real first fixture (${f[0].home ? 'home to' : 'away at'} ${f[0].opponent})`, card);
    await s.page.screenshot({ path: path.join(OUT, `${id}-hub.png`) });
    await openCalendar(s);
    const line = s.page.locator(`[data-cm-fixture-coverage="${ledger.key}"]`);
    const text = (await line.count()) ? (await line.innerText()).replace(/\s+/g, ' ') : '';
    row.calendarLine = text;
    const want = `Real 2026/27 ${walk.league} opponent order and home/away venues. Calendar dates and results are simulated. The order is ${ASOF[walk.leagueId]}.`;
    if (!text.startsWith(want)) fail(id, 'the Calendar line is not the sentence the receipt bears out', text.slice(0, 220));
    const links = (await line.count()) ? await line.locator('a').evaluateAll(as => as.map(a => ({ href: a.href, text: a.textContent, target: a.target, rel: a.rel }))) : [];
    row.links = links;
    if (JSON.stringify(links.map(l => l.href)) !== JSON.stringify(ledger.sources.map(x => x.url))) fail(id, 'the Calendar links are not the two sources the ledger ships', links.map(l => l.href).join(' '));
    for (const [r, fx] of f.entries()) {
      const named = s.page.getByRole('button', { name: new RegExp(`: ${fx.home ? 'vs' : 'at'} ${escapeRe(fx.opponent)} · `) });
      if (!(await named.count())) { if (r === 0) fail(id, 'the Calendar grid does not hold the real first fixture'); else note(id, `matchday ${r + 1} (${fx.home ? 'vs' : 'at'} ${fx.opponent}) is not on the month the Calendar opens on`); }
    }
    const over = await s.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 1) fail(id, 'the page is wider than the screen on the Calendar', `${over}px`);
    if (await line.count()) await line.scrollIntoViewIfNeeded();
    await s.page.screenshot({ path: path.join(OUT, `${id}-calendar.png`) });
    row.errors = s.errors.slice(0, 3);
    if (s.errors.length) fail(id, 'page error', s.errors[0]);
    report.journeys.push(row);
    return s;
  } catch (error) {
    fail(id, 'the journey stopped', String(error && error.message).split('\n')[0]);
    await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {});
    report.journeys.push(row);
    await s.context.close();
    return null;
  }
}
/** Where the viewport is and where the hub's Quick Sim button is, in viewport pixels. */
const where = page => page.evaluate(() => { const q = document.querySelector('[data-cm-way="quick"]'); const r = q ? q.getBoundingClientRect() : null; return `scrollY ${Math.round(scrollY)}, viewport ${innerHeight} high, page ${document.documentElement.scrollHeight} high, the Quick Sim button's top at ${r ? Math.round(r.top) : 'none'} (${r && r.top >= 0 && r.bottom <= innerHeight ? 'ON screen' : 'OFF screen'})`; });
const resume = async s => { await s.activate(s.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true })); await s.page.locator('[data-cm-way="quick"]').waitFor(); };
const gridLabels = page => page.locator('[data-testid="cm-calendar-grid"] button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label') || '').filter(l => /: (vs|at) /.test(l)));
const dump = page => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== 'cookie-consent' && k !== '__rv_seeded') o[k] = localStorage.getItem(k); } return o; });
/** One Quick Sim from the hub. Returns the save after it. */
async function playOne(s, id) {
  const before = await readSave(s.page);
  await s.activate(s.page.locator('[data-cm-way="quick"]'));
  await s.page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: SAVE, week: before.week + 1 });
  await s.page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor();
  await s.page.screenshot({ path: path.join(OUT, `${id}-fulltime.png`) });
  const after = await readSave(s.page);
  await s.activate(s.page.getByRole('button', { name: 'Continue', exact: true }).first());
  await s.page.locator('[data-cm-way="quick"]').waitFor();
  return after;
}
/* After J1: reload (the boot must fetch the list again), play the first match, read Help. */
async function carryOn(s, walk, id, { play = true, help = true } = {}) {
  const ledger = ledgers.get(walk.leagueId), f0 = fixtureOf(ledger, walk.club, 0), f1 = fixtureOf(ledger, walk.club, 1);
  try {
    s.lists.length = 0;
    await s.page.reload({ waitUntil: 'networkidle' });
    await resume(s);
    if (JSON.stringify([...new Set(s.lists)]) !== JSON.stringify([walk.file])) fail(id, 'after a reload the boot did not fetch exactly the saved key\'s list', s.lists.join(','));
    if (play) {
      const after = await playOne(s, id);
      const last = after.resultLog?.at(-1);
      if (!last || last.opp !== f0.opponent || last.home !== f0.home) fail(id, `the first match played is not the real first fixture (${f0.home ? 'home to' : 'away at'} ${f0.opponent})`, JSON.stringify(last).slice(0, 120));
      const pairs = Object.keys(after.pairResults?.[walk.leagueId] || {}).sort();
      const real = ledger.rounds[0].map(([h, a]) => `${h}|${a}`).sort();
      if (!after.pairResults?.[walk.leagueId]) note(id, 'this league keeps no pair ledger in the save (no head to head tiebreak), so the neutral results are not read here');
      else if (JSON.stringify(pairs) !== JSON.stringify(real)) fail(id, 'the league results after matchday one are not exactly the real matchday one pairs', `${pairs.length} pairs, first ${pairs[0]}`);
      else note(id, `the save's pair ledger after matchday one is exactly the ${real.length} real matchday one pairs`);
      const card = await hubCard(s, walk.club);
      if (!card.includes(`${walk.club} vs ${f1.opponent} ${f1.home ? 'Home' : 'Away'}`)) note(id, `after matchday one the hub card reads "${card.slice(0, 70)}" (real matchday two: ${f1.home ? 'home to' : 'away at'} ${f1.opponent})`);
      await s.page.screenshot({ path: path.join(OUT, `${id}-hub2.png`) });
      if (after.realLeagueFixtures !== ledger.key) fail(id, 'the key is gone after a match');
    }
    if (help) {
      const y0 = await s.page.evaluate(() => Math.round(window.scrollY));
      await s.activate(s.page.getByRole('button', { name: 'How to play', exact: true }));
      const para = s.page.locator('[data-cm-help="real-fixtures"]');
      await para.waitFor();
      await para.scrollIntoViewIfNeeded();
      await s.page.screenshot({ path: path.join(OUT, `${id}-help.png`) });
      const text = (await para.innerText()).replace(/\s+/g, ' ');
      report.journeys.push({ id: `${id}-help`, text });
      if (!text.includes(walk.league)) fail(id, 'Help does not name the league', text.slice(0, 160));
      if (await para.locator('a').count()) fail(id, 'Help holds a link in its fixture paragraph');
      const over = await s.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 1) fail(id, 'the page is wider than the screen on Help', `${over}px`);
      const back = s.page.getByRole('button', { name: /^(Back|Close|Got it|← Back)/ }).first();
      if (await back.count()) { await s.activate(back); await s.page.waitForTimeout(400); note(id, `scrollY before Help ${y0}, after closing Help ${await s.page.evaluate(() => Math.round(window.scrollY))}`); }
      else note(id, 'no Back or Close button was found on Help by name');
    }
    if (s.errors.length) fail(id, 'page error', s.errors[0]);
  } catch (error) {
    fail(id, 'the carry on stopped', String(error && error.message).split('\n')[0]);
    await s.page.screenshot({ path: path.join(OUT, `${id}-stopped2.png`) }).catch(() => {});
  }
}

/* ---- J2: a save made by the BASE build in a browser, opened by the head ---- */
async function oldSave(walk, profile, motion, wantKey) {
  const id = `old-${walk.leagueId}-${profile.name}-${motion === 'reduce' ? 'rm' : 'm'}`, row = { id };
  if (!OLD) { note(id, 'no BASE_OLD, not run'); return; }
  let carried = null, baseCard = '', baseLabels = [], baseLine = 0, baseSave = null;
  const b = await open(profile, motion);
  try {
    await b.page.goto(`${OLD}/club-manager`, { waitUntil: 'networkidle' });
    await pickTo(b, walk);
    row.baseScrollYAfterStart = await b.page.evaluate(() => Math.round(window.scrollY));
    await b.page.screenshot({ path: path.join(OUT, `${id}-base-asleft.png`) });
    await b.page.waitForTimeout(1500);
    note(id, `BASE after the start and 1.5 s: ${await where(b.page)}`);
    await playOne(b, `${id}-base`);
    baseCard = await hubCard(b, walk.club);
    await openCalendar(b);
    baseLabels = await gridLabels(b.page);
    baseLine = await b.page.locator('[data-cm-fixture-coverage]').count();
    baseSave = await readSave(b.page);
    carried = await dump(b.page);
    if (b.lists.length) fail(id, 'the BASE build fetched a list file', b.lists.join(','));
  } catch (error) { fail(id, 'the base half stopped', String(error && error.message).split('\n')[0]); }
  finally { await b.context.close(); }
  if (!carried) return;
  row.baseKey = baseSave?.realLeagueFixtures ?? null; row.baseCard = baseCard;
  if ((baseSave?.realLeagueFixtures ?? null) !== wantKey) fail(id, 'the base save does not hold the key expected of the base', String(baseSave?.realLeagueFixtures));
  const s = await open(profile, motion, { seed: carried });
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    const raw0 = await s.page.evaluate(k => localStorage.getItem(k), SAVE);
    if (raw0 !== carried[SAVE]) fail(id, 'the save bytes changed just by opening the page (before Resume)');
    await resume(s);
    const card = await hubCard(s, walk.club);
    row.headCard = card;
    if (card !== baseCard) fail(id, 'the old save shows another next match on the head', `base "${baseCard.slice(0, 60)}" head "${card.slice(0, 60)}"`);
    await s.page.screenshot({ path: path.join(OUT, `${id}-head-hub.png`) });
    await openCalendar(s);
    const labels = await gridLabels(s.page);
    if (JSON.stringify(labels) !== JSON.stringify(baseLabels)) fail(id, 'the old save shows other fixtures on the Calendar', `base ${baseLabels.slice(0, 3).join(' / ')} head ${labels.slice(0, 3).join(' / ')}`);
    const lineCount = await s.page.locator('[data-cm-fixture-coverage]').count();
    if (lineCount !== baseLine) fail(id, 'the Calendar line count differs from the base for this old save', `base ${baseLine} head ${lineCount}`);
    row.headLine = lineCount ? (await s.page.locator('[data-cm-fixture-coverage]').innerText()).replace(/\s+/g, ' ') : '';
    await s.page.screenshot({ path: path.join(OUT, `${id}-head-calendar.png`) });
    const want = wantKey ? [] : [];
    if (!wantKey && s.lists.length) fail(id, 'an old save with no key made the head fetch a list', s.lists.join(','));
    void want;
    const after = await readSave(s.page);
    if ((after?.realLeagueFixtures ?? null) !== wantKey) fail(id, 'the old save gained or lost a key on the head', String(after?.realLeagueFixtures));
    await s.page.reload({ waitUntil: 'networkidle' });
    await resume(s);
    const played = await playOne(s, `${id}-head`);
    row.headPlayed = played.resultLog?.at(-1)?.opp;
    if (!baseCard.includes(` vs ${played.resultLog?.at(-1)?.opp} `)) fail(id, 'the head played another opponent than the base save had next', `${played.resultLog?.at(-1)?.opp} against "${baseCard.slice(0, 60)}"`);
    if (s.errors.length) fail(id, 'page error', s.errors[0]);
  } catch (error) {
    fail(id, 'the head half stopped', String(error && error.message).split('\n')[0]);
    await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {});
  } finally { await s.context.close(); }
  report.journeys.push(row);
}
const LALIGA = { leagueId: 'laliga', nation: 'Spain', league: 'La Liga', club: 'Barcelona', file: 'LaLiga' };
const LIST_LALIGA = /clubManagerLaLigaFixtures2026/;

/* ---- J3a: the list cannot be fetched when a career starts ---- */
async function startBlocked(profile, motion) {
  const id = `start-blocked-${profile.name}`;
  const s = await open(profile, motion, { block: LIST_LALIGA });
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    let loads = 0;
    s.page.on('load', () => { loads += 1; });
    /* First try: tap the club with its list refused and see whether the page survives the tap. */
    await s.activate(s.page.getByRole('button', { name: /2026-27/ }));
    await s.activate(s.page.getByRole('button', { name: /^Spain/ }));
    await s.activate(s.page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: s.page.getByText('La Liga', { exact: true }) }).first());
    await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText('Barcelona', { exact: true }) }));
    await s.page.waitForTimeout(3000);
    const take = await s.page.getByRole('button', { name: 'Take the job', exact: true }).count();
    const stepOne = await s.page.getByRole('button', { name: /2026-27/ }).count();
    note(id, `three seconds after the club tap with its list refused: page loads since the tap ${loads}, "Take the job" on screen ${take}, the picker's first step on screen ${stepOne}, stale chunk flag ${await s.page.evaluate(() => sessionStorage.getItem('dukb-reloaded-stale-chunk'))}`);
    await s.page.screenshot({ path: path.join(OUT, `${id}-after-tap.png`) });
    if (loads > 0 || (!take && stepOne)) {
      fail(id, 'tapping a club whose list will not load RELOADED the page and sent the picker back to its first step', `loads ${loads}`);
      await pickTo(s, LALIGA, 'dugout');
      note(id, `second try in the same tab: page loads ${loads}`);
    } else await s.activate(s.page.getByRole('button', { name: 'Take the job', exact: true }));
    const t0 = Date.now();
    await s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
    await s.page.locator('[data-cm-way="quick"]').waitFor();
    note(id, `hub after ${Date.now() - t0} ms with the list refused`);
    const save = await readSave(s.page);
    if (save && 'realLeagueFixtures' in save) fail(id, 'a career whose list was refused holds a key', String(save.realLeagueFixtures));
    await openCalendar(s);
    if (await s.page.locator('[data-cm-fixture-coverage]').count()) fail(id, 'the Calendar claims a real list that never arrived');
    await s.page.screenshot({ path: path.join(OUT, `${id}-calendar.png`) });
    await s.page.reload({ waitUntil: 'networkidle' });
    await resume(s);
    await playOne(s, id);
    if (s.errors.length) fail(id, 'page error', s.errors[0]);
    note(id, `console errors: ${s.consoleErrors.length} (${(s.consoleErrors[0] || '').slice(0, 100)})`);
  } catch (error) { fail(id, 'stopped', String(error && error.message).split('\n')[0]); await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
/* ---- J3b: the list never answers: what a player sees for eight seconds ---- */
async function startHung(profile, motion) {
  const id = `start-hung-${profile.name}`;
  const s = await open(profile, motion, { hang: LIST_LALIGA });
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    await pickTo(s, LALIGA, 'dugout');
    const t0 = Date.now();
    await s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
    await s.page.waitForTimeout(2000);
    await s.page.screenshot({ path: path.join(OUT, `${id}-waiting.png`) });
    const waiting = await bodyText(s.page);
    const anim = await s.page.evaluate(() => { const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && /^Loading/.test(d.textContent || '')); if (!el) return 'no Loading element'; const r = el.getBoundingClientRect(); return `${getComputedStyle(el).animationName} ${getComputedStyle(el).animationDuration}, the Loading text's top at ${Math.round(r.top)} in a viewport ${innerHeight} high (${r.bottom > 0 && r.top < innerHeight ? 'ON screen' : 'OFF screen'})`; });
    note(id, `at 2 s the page reads "${waiting.slice(0, 140)}"; Loading element animation under ${motion}: ${anim}; scrollY ${await s.page.evaluate(() => Math.round(window.scrollY))}`);
    await s.page.locator('[data-cm-way="quick"]').waitFor({ timeout: 20000 });
    const ms = Date.now() - t0;
    note(id, `hub after ${ms} ms with the list never answering`);
    if (ms > 11000) fail(id, 'the start waited longer than about eight seconds', `${ms} ms`);
    const save = await readSave(s.page);
    if (save && 'realLeagueFixtures' in save) fail(id, 'a career whose list never arrived holds a key');
    await openCalendar(s);
    if (await s.page.locator('[data-cm-fixture-coverage]').count()) fail(id, 'the Calendar claims a real list that never arrived');
    if (s.errors.length) fail(id, 'page error', s.errors[0]);
  } catch (error) { fail(id, 'stopped', String(error && error.message).split('\n')[0]); await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
/* ---- J3c: a saved career holds a key and its list cannot be fetched at boot ---- */
async function bootBlocked(profile, motion, carried) {
  const id = `boot-blocked-${profile.name}`;
  const s = await open(profile, motion, { seed: carried, block: LIST_LALIGA });
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    const notice = s.page.locator('[data-testid="cm-era-load-failed"]');
    await notice.waitFor({ timeout: 15000 });
    note(id, `the notice reads "${(await notice.innerText()).replace(/\s+/g, ' ')}"`);
    await s.page.screenshot({ path: path.join(OUT, `${id}-notice.png`) });
    if ((await s.page.evaluate(k => localStorage.getItem(k), SAVE)) !== carried[SAVE]) fail(id, 'the save bytes changed while its list would not load');
    await s.activate(s.page.getByRole('button', { name: 'Back to your managers', exact: true }));
    await s.page.locator('[data-testid="cm-slot-1"]').waitFor();
    await s.page.screenshot({ path: path.join(OUT, `${id}-managers.png`) });
    await s.activate(s.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await s.page.waitForTimeout(2500);
    const hub = await s.page.locator('[data-cm-way="quick"]').count();
    const again = await notice.count();
    note(id, `after Resume with the list still refused: hub ${hub}, notice ${again}, page errors ${s.errors.length}, text "${(await bodyText(s.page)).slice(0, 120)}"`);
    await s.page.screenshot({ path: path.join(OUT, `${id}-after-resume.png`) });
    if (hub) fail(id, 'a save whose list is not here reached the hub');
    if (s.errors.length) fail(id, 'page error with the list refused', s.errors[0]);
    if ((await s.page.evaluate(k => localStorage.getItem(k), SAVE)) !== carried[SAVE]) fail(id, 'the save bytes changed after Resume with the list refused');
    await s.context.unroute(LIST_LALIGA);
    const retry = s.page.getByRole('button', { name: /try again|retry/i }).first();
    if (await retry.count()) {
      await s.activate(retry);
      await s.page.waitForLoadState('networkidle').catch(() => {});
      await s.page.waitForTimeout(1500);
      if (await s.page.locator('[data-testid="cm-slot-1"]').count() && !(await s.page.locator('[data-cm-way="quick"]').count())) await resume(s);
      await s.page.locator('[data-cm-way="quick"]').waitFor({ timeout: 15000 });
      await openCalendar(s);
      if (!(await s.page.locator('[data-cm-fixture-coverage="laliga-2026-27-v1"]').count())) fail(id, 'after the retry the career is not on its real list');
      if (((await readSave(s.page)) || {}).realLeagueFixtures !== 'laliga-2026-27-v1') fail(id, 'after the retry the save lost its key');
    } else note(id, 'no retry button was found after Resume');
  } catch (error) { fail(id, 'stopped', String(error && error.message).split('\n')[0]); await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
/* ---- J3d: a keyed save parked in slot 1, another manager made in slot 2, then back to slot 1 ---- */
async function slots(profile, motion, carried) {
  const id = `slots-${profile.name}`;
  const s = await open(profile, motion, { seed: carried });
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    await s.page.locator('[data-testid="cm-slot-2"]').waitFor();
    await s.page.screenshot({ path: path.join(OUT, `${id}-managers.png`) });
    await s.activate(s.page.locator('[data-testid="cm-slot-2"]').getByRole('button', { name: 'New manager', exact: true }));
    await pickTo(s, { nation: 'Scotland', league: 'Scottish Premiership', club: 'Celtic' });
    const celtic = await readSave(s.page);
    if (celtic?.clubName !== 'Celtic' || 'realLeagueFixtures' in celtic) fail(id, 'the slot 2 career is not a plain Celtic career', `${celtic?.clubName} ${celtic?.realLeagueFixtures}`);
    await s.page.reload({ waitUntil: 'networkidle' });
    await s.page.locator('[data-testid="cm-slot-1"]').waitFor();
    if (s.lists.length > 1) note(id, `lists fetched so far: ${s.lists.join(',')}`);
    s.lists.length = 0;
    await s.page.waitForTimeout(500);
    if (s.lists.length) fail(id, 'with the Celtic slot active the boot fetched a list', s.lists.join(','));
    await s.activate(s.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await s.page.locator('[data-cm-way="quick"]').waitFor();
    if (JSON.stringify([...new Set(s.lists)]) !== JSON.stringify(['LaLiga'])) fail(id, 'switching to the La Liga slot did not fetch exactly its list', s.lists.join(','));
    const back = await readSave(s.page);
    if (back?.clubName !== 'Barcelona' || back?.realLeagueFixtures !== 'laliga-2026-27-v1') fail(id, 'slot 1 did not come back as the keyed Barcelona career', `${back?.clubName} ${back?.realLeagueFixtures}`);
    await openCalendar(s);
    if (!(await s.page.locator('[data-cm-fixture-coverage="laliga-2026-27-v1"]').count())) fail(id, 'after the slot switch the Calendar has no line');
    await s.page.screenshot({ path: path.join(OUT, `${id}-back-calendar.png`) });
    if (s.errors.length) fail(id, 'page error', s.errors[0]);
    /* J4: the two dailies opened in the SAME visit, after a list was fetched, against a fresh visit. */
    for (const route of ['/manager-hot-seat', '/deadline-day']) {
      await s.page.evaluate(p => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, route);
      await s.page.waitForTimeout(3000);
      const here = (await s.page.locator('main').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      const f = await open(profile, motion, { seed: carried });
      await f.page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await f.page.waitForTimeout(1500);
      const fresh = (await f.page.locator('main').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (f.lists.length) fail(id, `${route} fetched a list on a fresh visit`, f.lists.join(','));
      await f.context.close();
      note(id, `${route} in the same visit after a list was fetched: ${here.length} chars, ${here === fresh ? 'the same text as a fresh visit' : 'NOT the same text as a fresh visit'}; "${here.slice(0, 110)}"`);
      if (here !== fresh) note(id, `${route} fresh: "${fresh.slice(0, 110)}"`);
      await s.page.screenshot({ path: path.join(OUT, `${id}-spa${route.replace(/\//g, '-')}.png`) });
      if (s.errors.length) fail(id, `page error on ${route} in the same visit`, s.errors[0]);
    }
  } catch (error) { fail(id, 'stopped', String(error && error.message).split('\n')[0]); await s.page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
/* ---- J5: the What's New entry ---- */
async function whatsNew(profile) {
  const id = `whatsnew-${profile.name}`;
  const s = await open(profile, 'no-preference');
  try {
    await s.page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' });
    const mark = s.page.locator('[data-cm-fixture-leagues]').first();
    await mark.waitFor();
    const entry = mark.locator('xpath=ancestor::li[1]');
    await entry.scrollIntoViewIfNeeded();
    await entry.screenshot({ path: path.join(OUT, `${id}-entry.png`) });
    report.journeys.push({ id, text: (await entry.innerText()).replace(/\s+/g, ' ') });
    const over = await s.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 1) fail(id, 'the page is wider than the screen', `${over}px`);
  } catch (error) { fail(id, 'stopped', String(error && error.message).split('\n')[0]); }
  finally { await s.context.close(); }
}

/* ---- the run ---- */
const W = {
  seriea: { leagueId: 'seriea', nation: 'Italy', league: 'Serie A', club: 'Juventus', file: 'SerieA' },
  eredivisie: { leagueId: 'eredivisie', nation: 'Netherlands', league: 'Eredivisie', club: 'Ajax', file: 'Eredivisie' },
  primeira: { leagueId: 'primeira', nation: 'Portugal', league: 'Primeira Liga', club: 'Benfica', file: 'Primeira' },
  superlig: { leagueId: 'superlig', nation: 'Turkey', league: 'Süper Lig', club: 'Fenerbahçe', file: 'SuperLig' },
  bundesliga2: { leagueId: 'bundesliga2', nation: 'Germany', league: '2. Bundesliga', club: 'Hertha BSC', file: 'Bundesliga2' },
  ligue2: { leagueId: 'ligue2', nation: 'France', league: 'Ligue 2', club: 'Saint-Étienne', file: 'Ligue2' },
};
const only = (process.env.RV_ONLY || '').split(',').filter(Boolean);
const on = name => !only.length || only.includes(name);
const plan = [
  [W.seriea, P390, 'no-preference', { play: true, help: true }], [W.seriea, P1280, 'reduce', { play: false, help: true }],
  [W.eredivisie, P390, 'reduce', { play: true, help: false }], [W.primeira, P1280, 'no-preference', { play: true, help: false }],
  [W.superlig, P390, 'no-preference', { play: true, help: true }], [W.bundesliga2, P1280, 'no-preference', { play: true, help: false }],
  [W.bundesliga2, P390, 'reduce', { play: false, help: false }], [W.ligue2, P390, 'no-preference', { play: true, help: false }],
];
if (on('new')) for (const [walk, profile, motion, more] of plan) {
  const s = await newCareer(walk, profile, motion);
  if (s) { await carryOn(s, walk, `new-${walk.leagueId}-${profile.name}-${motion === 'reduce' ? 'rm' : 'm'}`, more); await s.context.close(); }
}
let carried = null;
if (on('fail') || on('slots')) {
  const s = await newCareer(LALIGA, P390, 'reduce');
  if (s) { carried = await dump(s.page); await s.context.close(); }
}
if (on('old')) {
  await oldSave(LALIGA, P390, 'no-preference', null);
  await oldSave({ leagueId: 'premier', nation: 'England', league: 'Premier League', club: 'Arsenal', file: 'Premier' }, P1280, 'reduce', 'premier-2026-27-v1');
  await oldSave(W.seriea, P1280, 'no-preference', null);
  await oldSave(W.bundesliga2, P390, 'reduce', null);
}
if (on('fail')) {
  await startBlocked(P390, 'no-preference');
  await startHung(P1280, 'reduce');
  await startHung(P390, 'no-preference');
  if (carried) { await bootBlocked(P390, 'reduce', carried); await bootBlocked(P1280, 'no-preference', carried); }
}
if (on('slots') && carried) await slots(P1280, 'no-preference', carried);
if (on('news')) { await whatsNew(P390); await whatsNew(P1280); }
await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-report.json'), JSON.stringify({ ...report, failures, notes }, null, 2));
console.log(`rwalk: ${failures.length} FAIL, ${notes.length} NOTE, ${report.journeys.length} journey rows`);
process.exit(failures.length ? 1 : 0);


// Reviewer cm, Release AU: a player's walk of Club Manager on a served build, at 390 by 844 and 1280 by 900.
//   BASE=http://localhost:4173 node .rc/x/review-cm-walk.mjs            (screenshots and report.json go to $RC_OUT)
// A: a new career in four leagues (20 eager, 24, 20, 18): hub, Calendar, Help, the first match by Quick Sim, the second by Play Live.
// B: an own goal found by the engine on a seed, watched with motion and with reduced motion.
// It asserts little and records a lot: the reviewer LOOKS at the screenshots. The live database host is blocked.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const BASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'review-cm-walk-out'));
const ONLY = process.env.RCM_ONLY || '';
const SEED = Number(process.env.RCM_SEED || 86421);
const SAVE = 'dukb-club-manager-save', NOW = 1791547200000;
fs.mkdirSync(OUT, { recursive: true });
const { loadLedgers } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/cmFixtureSources/gameBundle.mjs')).href);
const { seedPages } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/pageSeed.mjs')).href);
const ledgers = new Map((await loadLedgers()).map(l => [l.ledger.leagueId, l.ledger]));
const PROFILES = [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 900, touch: false }];
const WALKS = [
  { leagueId: 'premier', nation: 'England', league: 'Premier League', club: 'Everton' },
  { leagueId: 'championship', nation: 'England', league: 'EFL Championship', club: null },
  { leagueId: 'seriea', nation: 'Italy', league: 'Serie A', club: null },
  { leagueId: 'eredivisie', nation: 'Netherlands', league: 'Eredivisie', club: null },
];
const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const report = { base: BASE, seed: SEED, journeys: [], own: [] };
const problems = [];
const browser = await chromium.launch();
const squash = s => String(s ?? '').replace(/\s+/g, ' ').trim();

async function open(profile, { reduced = false, raw = null, seed = SEED } = {}) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, route => route.abort());
  await seedPages(context, seed);
  await context.addInitScript(({ now, key, raw }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    try { localStorage.setItem('cookie-consent', 'essential'); if (raw && !localStorage.getItem(key)) localStorage.setItem(key, raw); } catch { /* blocked */ }
  }, { now: NOW, key: SAVE, raw });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [], lists = [];
  page.on('pageerror', e => errors.push(String(e && e.message ? e.message : e).slice(0, 200)));
  page.on('request', r => { const m = /clubManager([A-Za-z0-9]+)Fixtures2026/.exec(r.url()); if (m) lists.push(m[1]); });
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  return { context, page, errors, lists, activate, profile };
}
const shot = async (s, name, full = false) => { await s.page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 62, fullPage: full }).catch(() => {}); };
const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE).catch(() => null);
const bodyText = async page => squash(await page.locator('body').innerText().catch(() => ''));
const overflow = page => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, y: Math.round(scrollY) })).catch(() => null);
/** Elements whose own text is cut off by their box (a truncated label), inside a root. */
const cutOff = (page, rootSel) => page.evaluate(sel => {
  const root = document.querySelector(sel) || document.body, out = [];
  for (const el of root.querySelectorAll('p, span, button, h1, h2, h3, li, div')) {
    if (el.children.length || !el.textContent.trim()) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    if (el.scrollWidth > el.clientWidth + 1 && st.overflow !== 'visible' && el.clientWidth > 0) out.push(`${el.textContent.trim().slice(0, 40)} (${el.scrollWidth}>${el.clientWidth})`);
  }
  return out.slice(0, 12);
}, rootSel).catch(() => []);

async function pick(s, walk) {
  await s.activate(s.page.getByRole('button', { name: /2026-27/ }));
  await s.activate(s.page.getByRole('button', { name: new RegExp(`^${escapeRe(walk.nation)}`) }));
  await s.activate(s.page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: s.page.getByText(walk.league, { exact: true }) }).first());
  await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText(walk.club, { exact: true }) }).first());
  await s.activate(s.page.getByRole('button', { name: 'Take the job', exact: true }));
}
const hubReady = async s => { await s.page.locator('[data-cm-way="quick"]').first().waitFor(); await s.page.evaluate(() => document.fonts.ready); };

const ASOF = { premier: 'the list as first published in June 2026', championship: 'the list as first published in June 2026', seriea: 'the list as first published in June 2026', eredivisie: 'the list as it stood on 10 October 2026' };
async function journey(walk, profile) {
  const id = `${walk.leagueId}-${profile.name}`, row = { id, notes: [], texts: {} };
  const bad = (what, detail = '') => { row.notes.push(`BAD ${what}${detail ? `: ${detail}` : ''}`); problems.push(`${id}: ${what}${detail ? ` (${detail})` : ''}`); };
  const good = what => row.notes.push(`ok ${what}`);
  const check = (what, pass, detail = '') => (pass ? good(what) : bad(what, detail));
  const ledger = ledgers.get(walk.leagueId);
  const club = walk.club ?? ledger.clubs[Math.floor(ledger.clubs.length / 2)];
  row.club = club;
  const fixture = round => { const p = ledger.rounds[round].find(x => x.includes(club)); return p ? { opponent: p[0] === club ? p[1] : p[0], home: p[0] === club } : null; };
  const card = f => `${club} vs ${f.opponent} ${f.home ? 'Home' : 'Away'}`;
  const s = await open(profile);
  const step = async (name, fn) => { try { await fn(); } catch (e) { bad(`step ${name} threw`, String(e && e.message || e).split('\n')[0].slice(0, 180)); await shot(s, `${id}-FAILED-${name}`); row.texts[`failed-${name}`] = (await bodyText(s.page)).slice(0, 500); } };
  try {
    await step('pick', async () => {
      await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
      await pick(s, { ...walk, club });
      await s.page.getByRole('button', { name: 'Skip: just manage', exact: true }).waitFor();
      await shot(s, `${id}-dugout`, true);
      row.texts.dugout = (await bodyText(s.page)).slice(0, 1500);
      await s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
      await hubReady(s);
      await s.page.evaluate(() => window.scrollTo(0, 0));
      const save = await readSave(s.page);
      check('the save holds the key of its league', save?.realLeagueFixtures === ledger.key, String(save?.realLeagueFixtures));
      check('the page fetched only its own league list', new Set(s.lists).size <= 1, s.lists.join(','));
      const hub = await bodyText(s.page);
      check(`hub shows the real first fixture (${card(fixture(0))})`, hub.includes(card(fixture(0))), hub.slice(Math.max(0, hub.indexOf(`${club} vs`)), hub.indexOf(`${club} vs`) + 70));
      await shot(s, `${id}-hub`);
      const o = await overflow(s.page); check('hub no wider than the screen', o && o.doc <= o.win + 1, JSON.stringify(o));
    });
    await step('calendar', async () => {
      await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText('Calendar', { exact: true }) }).first());
      await s.page.locator('[data-testid="cm-calendar-grid"]').waitFor();
      const line = s.page.locator(`[data-cm-fixture-coverage="${ledger.key}"]`);
      const text = (await line.count()) ? squash(await line.innerText()) : '';
      row.texts.calendarLine = text;
      check('the Calendar line says what is real and what is simulated, with its as of words', text.includes(`Real 2026/27 ${walk.league} opponent order and home/away venues. Calendar dates and results are simulated. The order is ${ASOF[walk.leagueId]}.`), text.slice(0, 220));
      row.texts.calendarLinks = (await line.count()) ? await line.locator('a').evaluateAll(as => as.map(a => `${a.textContent.trim()} -> ${a.href}`)) : [];
      const f0 = fixture(0);
      check('the Calendar grid holds the real first fixture as a day', (await s.page.getByRole('button', { name: new RegExp(`: ${f0.home ? 'vs' : 'at'} ${escapeRe(f0.opponent)} · `) }).count()) > 0);
      await shot(s, `${id}-calendar-top`);
      if (await line.count()) await line.scrollIntoViewIfNeeded();
      await shot(s, `${id}-calendar-line`);
      row.cutCalendar = await cutOff(s.page, '[data-testid="cm-calendar-grid"]');
      const o = await overflow(s.page); check('calendar no wider than the screen', o && o.doc <= o.win + 1, JSON.stringify(o));
    });
    await step('help', async () => {
      await s.activate(s.page.getByRole('button', { name: 'How to play', exact: true }).first());
      const para = s.page.locator('[data-cm-help="real-fixtures"]');
      await para.waitFor();
      row.texts.help = squash(await para.innerText());
      const whole = squash(await para.locator('xpath=..').innerText());
      row.texts.helpChars = whole.length;
      check('Help does not mention VAR while the switch is off', !/\bVAR\b/.test(whole), (whole.match(/.{0,60}\bVAR\b.{0,60}/) || [''])[0]);
      await para.scrollIntoViewIfNeeded();
      await shot(s, `${id}-help`);
      const o = await overflow(s.page); check('help no wider than the screen', o && o.doc <= o.win + 1, JSON.stringify(o));
      await s.page.keyboard.press('Escape');
      await s.page.waitForTimeout(400);
      if (await para.isVisible().catch(() => false)) { const close = s.page.getByRole('button', { name: /close|got it|back/i }).first(); if (await close.count()) await s.activate(close); }
    });
    await step('quick', async () => {
      await s.page.evaluate(() => window.scrollTo(0, 0));
      const home = s.page.getByRole('tab', { name: /^Home$/i }).first();
      if (await home.count().catch(() => 0)) await home.click({ timeout: 3000 }).catch(() => {});
      const y0 = (await overflow(s.page))?.y;
      await s.activate(s.page.locator('button:visible[data-cm-way="quick"]').first());
      await s.page.getByRole('button', { name: /^Continue/ }).first().waitFor();
      await s.page.waitForTimeout(600);
      const text = await bodyText(s.page);
      row.texts.quickReport = text.slice(0, 900);
      check('Quick Sim report names the real first opponent', text.includes(fixture(0).opponent), text.slice(0, 200));
      check('Quick Sim report shows no review line', !/\bVAR\b/.test(text));
      await shot(s, `${id}-quick-report`, true);
      row.quickScroll = { before: y0, after: (await overflow(s.page))?.y };
      await s.activate(s.page.getByRole('button', { name: /^Continue/ }).first());
      await hubReady(s);
      await s.page.evaluate(() => window.scrollTo(0, 0));
      const hub = await bodyText(s.page);
      const next = fixture(1);
      row.texts.hubAfterQuick = hub.slice(Math.max(0, hub.indexOf(`${club} vs`)), hub.indexOf(`${club} vs`) + 80);
      check(`after matchday one the hub shows the real second fixture (${card(next)}) unless a cup tie comes first`, hub.includes(card(next)) || /Cup|Round of|Pokal|Coppa|Beker/i.test(row.texts.hubAfterQuick), row.texts.hubAfterQuick);
      await shot(s, `${id}-hub-after-quick`);
    });
    await step('live', async () => {
      /* The next entry on the calendar can be the transfer window: the button then plays that and stays on the club page. */
      for (let i = 0; i < 8 && !(await s.page.locator('[data-cm-live-stage]').count()); i++) {
        const tab = s.page.getByRole('tab', { name: /^Home$/i }).first();
        if (await tab.count().catch(() => 0)) await tab.click({ timeout: 3000 }).catch(() => {});
        const way = s.page.locator('button:visible[data-cm-way="live"]').first();
        if (await way.count().catch(() => 0)) { row.liveTaps = (row.liveTaps ?? 0) + 1; await s.activate(way).catch(() => {}); }
        await s.page.waitForTimeout(1000);
      }
      await s.page.locator('[data-cm-live-stage]').first().waitFor();
      await s.page.waitForTimeout(2500);
      await shot(s, `${id}-live-early`);
      const o = await overflow(s.page); check('live stage no wider than the screen', o && o.doc <= o.win + 1, JSON.stringify(o));
      const helpBtn = s.page.locator('button[aria-label="How watching a match works"]').first();
      if (await helpBtn.count()) {
        await s.activate(helpBtn);
        await s.page.getByText('Worked example:').first().waitFor({ timeout: 5000 }).catch(() => {});
        const helpText = squash(await s.page.locator('[data-cm-live-side]').first().innerText().catch(() => ''));
        row.texts.liveHelp = helpText.slice(0, 1600);
        check('live help says an own goal goes in off the man and he holds his head', helpText.includes('On the pitch the ball goes in off him and he holds his head.'), helpText.slice(0, 120));
        check('live help does not mention VAR while the switch is off', !/\bVAR\b/.test(helpText));
        await shot(s, `${id}-live-help`);
        const close = s.page.locator('button[aria-label="Close the help"]').first();
        if (await close.count()) await s.activate(close);
      } else bad('no live help button');
      let done = false;
      for (let i = 0; i < 40 && !done; i++) {
        const full = s.page.locator('button:visible').filter({ hasText: /^Full report$/ }).first();
        const second = s.page.locator('button:visible').filter({ hasText: /Second half/ }).first();
        const skip = s.page.locator('button:visible').filter({ hasText: /^\s*Skip\s*$/ }).first();
        if (await full.count()) { await shot(s, `${id}-live-fulltime`); row.texts.liveFullTime = (await bodyText(s.page)).slice(0, 700); await s.activate(full); done = true; }
        else if (await second.count()) { await shot(s, `${id}-live-halftime`, true); await s.activate(second); }
        else if (await skip.count()) await s.activate(skip);
        await s.page.waitForTimeout(1300);
      }
      check('the live match reached its full report', done);
      await s.page.getByRole('button', { name: /^Continue/ }).first().waitFor({ timeout: 15000 });
      const text = await bodyText(s.page);
      row.texts.liveReport = text.slice(0, 900);
      check('the live report shows no review line', !/\bVAR\b/.test(text));
      await shot(s, `${id}-live-report`, true);
      await s.activate(s.page.getByRole('button', { name: /^Continue/ }).first());
      await hubReady(s);
      const save = await readSave(s.page);
      check('the save still holds its key after two matches', save?.realLeagueFixtures === ledger.key, String(save?.realLeagueFixtures));
    });
    check('no page error', s.errors.length === 0, s.errors.slice(0, 2).join(' | '));
  } finally { report.journeys.push(row); await s.context.close(); }
  console.log(`[A] ${id} (${club}): ${row.notes.filter(n => n.startsWith('BAD')).length} bad of ${row.notes.length}`);
  for (const n of row.notes.filter(n => n.startsWith('BAD'))) console.log(`     ${n.slice(0, 300)}`);
}
/* ---- B: an own goal, found by the engine on a seed, watched with and without motion ---- */
async function findOwnGoalSaves(seed) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'rcm-own-'));
  const bundle = path.join(out, 'engine.mjs');
  const { build } = await import('esbuild');
  await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
  const memory = new Map();
  if (!globalThis.localStorage) globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  const cm = await import(pathToFileURL(bundle).href);
  const ambient = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const found = {};
  let matches = 0;
  try {
    for (let season = 0; season < 90 && !(found.me && found.opp); season++) {
      let career = cm.startCareer(['Everton', 'Sevilla', 'Roma', 'PSV', 'Wrexham'][season % 5]);
      for (let guard = 0; guard < 400 && !(found.me && found.opp); guard++) {
        const next = cm.playNextEntry(career);
        career = next.state;
        if (next.kind === 'seasonOver' || career.sacked) break;
        if (!career.live) continue;
        matches++;
        const live = career.live, feed = cm.liveFeed(live);
        for (const goal of feed) {
          if (goal.kind !== 'goal' || !goal.og || goal.plus || goal.minute < 6 || goal.minute > 38 || found[goal.side]) continue;
          if (feed.some(e => e !== goal && ((e.kind === 'goal' && Math.abs(e.minute + (e.plus ?? 0) - goal.minute) < 4) || (e.kind === 'var' && Math.abs(e.minute - goal.minute) < 2)))) continue;
          const copy = structuredClone(career);
          copy.live.minute = goal.minute - 2;
          found[goal.side] = { raw: JSON.stringify(cm.trimCareer(copy)), club: career.clubName, opponent: live.opponent, match: matches, minute: goal.minute, name: goal.text,
            before: feed.filter(e => e.kind === 'goal' && e.minute < goal.minute).map(e => e.side) };
        }
        career = cm.resumeMatch(career).state;
      }
    }
  } finally { Math.random = ambient; }
  return { found, matches };
}
async function watchOwn(side, save, profile, reduced) {
  const id = `own-${side}-${profile.name}-${reduced ? 'reduced' : 'motion'}`;
  const row = { id, club: save.club, opponent: save.opponent, minute: save.minute, man: save.name, notes: [] };
  const bad = (what, detail = '') => { row.notes.push(`BAD ${what}${detail ? `: ${detail}` : ''}`); problems.push(`${id}: ${what}${detail ? ` (${detail})` : ''}`); };
  const s = await open(profile, { reduced, raw: save.raw, seed: SEED + 5 });
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    const resume = s.page.getByRole('button', { name: /Resume Career/i }).first();
    if (await resume.count().catch(() => 0)) { await s.activate(resume); await s.page.waitForTimeout(800); }
    for (let i = 0; i < 6 && !(await s.page.locator('[data-cm-live-stage]').count()); i++) {
      const way = s.page.locator('button:visible[data-cm-way="live"]').first();
      const text = s.page.locator('button:visible').filter({ hasText: /Play Live|Resume match|Back to the match/i }).first();
      if (await way.count()) await s.activate(way); else if (await text.count()) await s.activate(text);
      await s.page.waitForTimeout(900);
    }
    if (!(await s.page.locator('[data-cm-live-stage]').count())) { bad('the live stage never opened from the save'); await shot(s, `${id}-FAILED-open`); row.text = (await bodyText(s.page)).slice(0, 400); return; }
    const run = s.page.locator('button[aria-label="Resume"]').first();
    if (await run.count().catch(() => 0)) await s.activate(run);
    const read = () => s.page.evaluate(() => {
      const p = document.querySelector('[data-cm-live-pitch]');
      const surface = document.querySelector('[data-pm-own-goal]');
      const card = document.querySelector('[data-cm-goal-card]');
      const score = document.querySelector('[data-cm-live-score]');
      const stage = document.querySelector('[data-cm-live-stage]');
      const anims = p ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && p.contains(a.effect.target)).length : 0;
      return { motion: p?.getAttribute('data-cm-motion') ?? null, phase: p?.getAttribute('data-cm-motion-phase') ?? null, own: surface ? surface.getAttribute('data-pm-own-goal') : null, rue: document.querySelectorAll('[data-pm-rue]').length,
        card: card ? card.textContent.replace(/\s+/g, ' ').trim() : null, score: score ? score.textContent.replace(/\s+/g, ' ').trim() : null, minute: stage?.getAttribute('data-cm-live-minute') ?? null, anims, y: Math.round(scrollY) };
    }).catch(() => null);
    const start = await read();
    row.start = start;
    let first = null, carded = null, frames = 0, phases = new Set(), scoreAtFirst = null, shotAt = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 100000) {
      const f = await read();
      if (!f) break;
      if (f.own !== null) {
        frames++; phases.add(f.phase);
        if (!first) { first = f; scoreAtFirst = f.score; await shot(s, `${id}-first`); }
        else if (!carded && f.phase === 'flight' && frames > 2 && !shotAt) { shotAt = Date.now(); await shot(s, `${id}-flight`); }
      }
      if (f.card && /O\.G/.test(f.card)) { if (!carded) carded = { at: Date.now(), f }; else if (Date.now() - carded.at >= 700) { row.cardFrame = f; await shot(s, `${id}-card`); break; } }
      if (first && f.own === null && !f.card && Date.now() - t0 > 3000 && frames > 0 && carded) break;
      await s.page.waitForTimeout(40);
    }
    row.first = first; row.frames = frames; row.phases = [...phases]; row.scoreAtFirst = scoreAtFirst; row.card = carded?.f.card ?? null; row.scoreAtCard = carded?.f.score ?? null;
    if (!first) { bad('the pitch never marked an own goal'); await shot(s, `${id}-FAILED-nomark`); row.text = (await bodyText(s.page)).slice(0, 400); }
    if (!carded) bad('no goal card with (O.G) was seen');
    if (first && first.own === '') bad('the pitch marked the own goal with no man (he was not on the grass)');
    if (reduced && first && first.anims > 0) bad('reduced motion: animations were running under the pitch at the first own goal frame', String(first.anims));
    if (reduced && first && first.phase !== 'net' && first.phase !== 'hold' && first.phase !== 'done') row.notes.push(`note reduced motion first phase is ${first.phase}`);
    if (row.cardFrame && row.cardFrame.rue !== 1) bad('with the card up, the number of men holding their heads is not one', String(row.cardFrame.rue));
    if (start && row.cardFrame && start.y !== row.cardFrame.y) bad('the page moved while the own goal played', `${start.y} to ${row.cardFrame.y}`);
    if (s.errors.length) bad('page error', s.errors.slice(0, 2).join(' | '));
  } catch (e) { bad('threw', String(e && e.message || e).split('\n')[0].slice(0, 200)); await shot(s, `${id}-FAILED`); }
  finally { report.own.push(row); await s.context.close(); console.log(`[B] ${id}: ${save.club} v ${save.opponent}, ${save.minute}' off ${save.name}; first phase ${row.first?.phase ?? 'none'}, man key "${row.first?.own ?? ''}", frames ${row.frames ?? 0}, phases ${JSON.stringify(row.phases ?? [])}, score at first ${row.scoreAtFirst} then ${row.scoreAtCard}, card "${row.card ?? ''}", rue ${row.cardFrame?.rue ?? '?'}, anims at first ${row.first?.anims ?? '?'}; ${row.notes.join('; ') || 'nothing bad'}`); }
}

try {
  if (!ONLY || ONLY === 'A') for (const walk of WALKS) for (const profile of PROFILES) await journey(walk, profile);
  if (!ONLY || ONLY === 'B') {
    const { found, matches } = await findOwnGoalSaves(SEED + 9);
    console.log(`[B] the engine search on seed ${SEED + 9} played ${matches} matches: for me ${found.me ? `${found.me.club} v ${found.me.opponent} ${found.me.minute}'` : 'NONE'}, against me ${found.opp ? `${found.opp.club} v ${found.opp.opponent} ${found.opp.minute}'` : 'NONE'}`);
    for (const side of ['me', 'opp']) {
      if (!found[side]) { problems.push(`own ${side}: no save found`); continue; }
      for (const profile of PROFILES) for (const reduced of [false, true]) await watchOwn(side, found[side], profile, reduced);
    }
  }
} finally {
  await browser.close();
  /* The runner drops everything when more than 25 MB comes back: keep under 18. */
  const files = fs.readdirSync(OUT).filter(n => n.endsWith('.jpg')).map(n => ({ n, size: fs.statSync(path.join(OUT, n)).size })).sort((a, b) => b.size - a.size);
  let total = files.reduce((t, x) => t + x.size, 0);
  report.shots = { count: files.length, bytes: total, dropped: [] };
  for (const x of files) { if (total <= 18e6) break; fs.rmSync(path.join(OUT, x.n)); total -= x.size; report.shots.dropped.push(x.n); }
  fs.writeFileSync(path.join(OUT, `review-cm-walk-report${ONLY}.json`), JSON.stringify(report, null, 1));
}
console.log(`review-cm-walk: ${report.journeys.length} career journeys, ${report.own.length} own goal watches, ${problems.length} thing(s) to look at`);
for (const p of problems) console.log(`  LOOK ${p.slice(0, 320)}`);
process.exit(0);

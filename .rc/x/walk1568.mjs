// Round 1568 reviewer walk (RUN lens). Never committed. Sent as .rc/x/walk1568.mjs.
// Plays the round's screens the way a player meets them, at 390x844 and 1280x900 (Stat Detective also 320x568),
// reduced motion on and off, and saves screenshots into RC_OUT. Blocks supabase.co on every page.
// BASE: a served dist (from #!serve). WALK_DIST: serve this dist itself on WALK_PORT instead (mutation lines).
// WALK_PARTS: comma list of cm, cookie, sd, news (default all).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk1568-out');
const TAG = process.env.WALK_TAG || 'head';
fs.mkdirSync(OUT, { recursive: true });
const PARTS = (process.env.WALK_PARTS || 'cm,cookie,sd,news').split(',');
let server = null;
let BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
if (process.env.WALK_DIST) {
  const port = Number(process.env.WALK_PORT || 4377);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.resolve(process.env.WALK_DIST), String(port)], { stdio: 'ignore' });
  BASE = `http://127.0.0.1:${port}`;
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { up = await fetch(BASE + '/').then(r => r.ok).catch(() => false); if (!up) await new Promise(r => setTimeout(r, 250)); }
  if (!up) { console.log('walk1568: ABORT, the dist server never came up'); process.exit(2); }
}
const findings = [];
const say = s => console.log(s);
const bad = s => { findings.push(s); console.log('FINDING ' + s); };
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;

async function newPage(browser, w, h, motion) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(BLOCK, r => r.abort());
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e && e.message ? e.message : e)));
  return { ctx, page };
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`) }).catch(e => say(`shot ${name} failed: ${e.message}`)); };

/* In the page: for each [name, css selector or null, aria label or null], its rect and what answers at its centre. */
function probe(list) {
  const describe = at => {
    if (!at) return 'nothing';
    const where = at.closest('[data-site-chrome]') ? 'SITE BAR ' : at.closest('[aria-label="Cookie choices"]') ? 'COOKIE BANNER ' : at.closest('[data-cm-live-stagebox]') ? 'stage ' : '';
    const lab = at.getAttribute('aria-label') || at.closest('button,a')?.getAttribute('aria-label') || '';
    return `${where}${at.tagName.toLowerCase()}${lab ? `[${lab}]` : ''} "${(at.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28)}"`;
  };
  const out = [];
  for (const [name, sel, label] of list) {
    let el = null;
    if (label) el = [...document.querySelectorAll('button, a')].find(b => b.getAttribute('aria-label') === label && b.getBoundingClientRect().width > 0) || null;
    else if (sel) el = [...document.querySelectorAll(sel)].find(b => b.getBoundingClientRect().width > 0) || null;
    if (!el) { out.push({ name, missing: true }); continue; }
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const at = (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) ? document.elementFromPoint(x, y) : null;
    out.push({ name, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), self: !!at && (at === el || el.contains(at)), at: describe(at) });
  }
  return out;
}
const report = (tag, rows, mustSelf = true) => {
  for (const r of rows) {
    if (r.missing) { say(`${tag} ${r.name}: missing`); continue; }
    say(`${tag} ${r.name}: rect ${r.rect.join(',')} centre answers ${r.self ? 'itself' : r.at}`);
    if (mustSelf && !r.self) bad(`${tag} ${r.name} is covered: its centre answers ${r.at}`);
  }
};

/* Club Manager, copied from scripts/playLiveMatchFit.mjs (land, pickJob, startLive). */
const tap = async (page, rx) => { const b = page.getByRole('button', { name: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
const tapText = async (page, rx) => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
async function clearRoom(page) {
  await answerConsent(page, { wait: 1200 });
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
async function pickJob(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom(page);
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(800);
}
async function startLive(page) {
  const resume = page.getByRole('button', { name: /Resume Career/i }).first();
  if (await resume.count().catch(() => 0)) { await resume.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); }
  if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i);
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}
const STAGE_CONTROLS = [
  ['Back', null, 'Back to the club page'], ['help', null, 'How watching a match works'], ['score', '[data-cm-live-score]', null],
  ['Pause', null, 'Pause'], ['Squad', null, 'Squad and stamina'],
];
const stageState = page => page.evaluate(() => {
  const box = document.querySelector('[data-cm-live-stagebox]');
  const bar = document.querySelector('[data-site-chrome]');
  const br = bar ? bar.getBoundingClientRect() : null;
  /* What answers in the bar's own strip, at the menu button's place and in the middle, with the stage up. */
  const menu = document.querySelector('[data-site-chrome] button');
  const mr = menu ? menu.getBoundingClientRect() : null;
  const atMenu = mr ? document.elementFromPoint(mr.left + mr.width / 2, mr.top + mr.height / 2) : null;
  return {
    stage: document.querySelectorAll('[data-cm-live-stagebox]').length, card: document.querySelectorAll('[data-cm-live-compact]').length,
    z: box ? getComputedStyle(box).zIndex : null, bar: br ? [br.top, br.bottom].map(Math.round) : null,
    menuCovered: atMenu ? !atMenu.closest('[data-site-chrome]') : null, overflow: document.body.style.overflow, y: Math.round(scrollY),
    text: (document.querySelector('[data-cm-live-compact]')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
  };
});

async function partCm(browser, w, h, motion) {
  const tag = `cm ${w}x${h} ${motion}`;
  const { ctx, page } = await newPage(browser, w, h, motion);
  try {
    await pickJob(page);
    if (!(await startLive(page))) { bad(`${tag}: never reached a live match`); await shot(page, `cm-${w}-${motion}-nolive`); return; }
    await page.waitForTimeout(1500);
    const s0 = await stageState(page);
    say(`${tag}: stage z ${s0.z}, bar ${JSON.stringify(s0.bar)}, menu button under the stage ${s0.menuCovered}, body overflow "${s0.overflow}"`);
    if (s0.z !== '55') bad(`${tag}: stage z-index is ${s0.z}, not 55`);
    if (s0.menuCovered === false) bad(`${tag}: the site menu button still answers over the stage`);
    await shot(page, `cm-${w}-${motion}-1-stage`);
    report(tag, await page.evaluate(probe, STAGE_CONTROLS));
    /* help panel */
    const help = page.getByRole('button', { name: 'How watching a match works' }).first();
    if (await help.click({ timeout: 3000 }).then(() => true).catch(() => false)) {
      await page.waitForTimeout(500);
      await shot(page, `cm-${w}-${motion}-2-help`);
      report(`${tag} help open`, await page.evaluate(probe, [['Close the help', null, 'Close the help']]));
      await page.getByRole('button', { name: 'Close the help' }).first().click({ timeout: 3000 }).catch(() => bad(`${tag}: Close the help click failed`));
      await page.waitForTimeout(300);
    } else bad(`${tag}: the help button click failed`);
    /* squad and stamina panel */
    const squad = page.getByRole('button', { name: 'Squad and stamina' }).first();
    if (await squad.click({ timeout: 3000 }).then(() => true).catch(() => false)) {
      await page.waitForTimeout(500);
      await shot(page, `cm-${w}-${motion}-3-squad`);
      report(`${tag} squad open`, await page.evaluate(probe, [['Close the panel', null, 'Close the panel'], ['Close', null, 'Close']]), false);
      const closer = page.locator('[data-cm-live-stagebox] button[aria-label="Close the panel"]:visible, [data-cm-live-stagebox] button[aria-label="Close"]:visible').first();
      await closer.click({ timeout: 3000 }).catch(() => bad(`${tag}: closing the squad panel failed`));
      await page.waitForTimeout(300);
    } else bad(`${tag}: the Squad and stamina click failed`);
    /* Back folds to the compact card, the page scrolls, and the card puts the stage back */
    const back = page.getByRole('button', { name: 'Back to the club page' }).first();
    const backed = await back.click({ timeout: 3000 }).then(() => true).catch(e => { bad(`${tag}: Back click failed: ${String(e.message).split('\n')[0]}`); return false; });
    await page.waitForTimeout(600);
    const s1 = await stageState(page);
    say(`${tag}: after Back stage ${s1.stage} card ${s1.card} overflow "${s1.overflow}" text "${s1.text}"`);
    if (backed && (s1.stage !== 0 || s1.card !== 1 || s1.overflow === 'hidden')) bad(`${tag}: after Back stage ${s1.stage}, card ${s1.card}, body overflow "${s1.overflow}"`);
    await shot(page, `cm-${w}-${motion}-4-folded`);
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
    const y1 = await page.evaluate(() => Math.round(scrollY));
    say(`${tag}: after a wheel of 400 the page is at scrollY ${y1}`);
    await shot(page, `cm-${w}-${motion}-5-scrolled`);
    const again = page.locator('[data-cm-live-compact] button').first();
    await again.click({ timeout: 3000 }).catch(() => bad(`${tag}: the compact card's button click failed`));
    await page.waitForTimeout(800);
    const s2 = await stageState(page);
    if (s2.stage !== 1) bad(`${tag}: the card did not put the stage back (stage ${s2.stage})`);
    await shot(page, `cm-${w}-${motion}-6-back-in`);
    if (page.errs.length) bad(`${tag}: page errors ${page.errs.slice(0, 3).join(' | ')}`);
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); await shot(page, `cm-${w}-${motion}-threw`); }
  finally { await ctx.close(); }
}

/* In the page: every visible button of the pending cookie banner, and whether its centre answers itself. */
const bannerProbe = () => {
  const b = document.querySelector('[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const buttons = [...b.querySelectorAll('button')].filter(x => x.getBoundingClientRect().width > 0).map(x => {
    const q = x.getBoundingClientRect();
    const at = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    return { name: (x.textContent || '').trim().slice(0, 24), rect: [q.left, q.top, q.right, q.bottom].map(Math.round), self: !!at && (at === x || x.contains(at)), at: at ? `${at.closest('[data-cm-live-stagebox]') ? 'STAGE ' : ''}${at.tagName.toLowerCase()} "${(at.textContent || '').trim().slice(0, 24)}"` : 'nothing' };
  });
  return { rect: [r.left, r.top, r.right, r.bottom].map(Math.round), z: getComputedStyle(b).zIndex, position: getComputedStyle(b).position, pending: document.body.dataset.consentPending || null, buttons };
};
async function partCookie(browser, w, h) {
  const tag = `cookie ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h, 'no-preference');
  try {
    await pickJob(page);
    if (!(await startLive(page))) { bad(`${tag}: never reached a live match`); return; }
    await page.waitForTimeout(800);
    await page.evaluate(() => { localStorage.removeItem('cookie-consent-v2'); localStorage.removeItem('cookie-consent'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, `cookie-${w}-0-reloaded`);
    if (!(await startLive(page))) { bad(`${tag}: with the banner pending the walk never got back into the match`); await shot(page, `cookie-${w}-nolive`); return; }
    await page.waitForTimeout(1200);
    const b = await page.evaluate(bannerProbe);
    const s = await stageState(page);
    if (!b) { bad(`${tag}: no pending cookie banner after clearing the stored answer`); return; }
    say(`${tag}: banner ${b.position} z ${b.z} rect ${b.rect.join(',')} pending ${b.pending}; stage z ${s.z} count ${s.stage}`);
    for (const x of b.buttons) { say(`${tag} banner button "${x.name}" rect ${x.rect.join(',')} answers ${x.self ? 'itself' : x.at}`); if (!x.self) bad(`${tag}: the pending banner's "${x.name}" is under the stage (answers ${x.at})`); }
    report(`${tag} stage under a pending banner`, await page.evaluate(probe, STAGE_CONTROLS), false);
    await shot(page, `cookie-${w}-1-stage-with-banner`);
    await answerConsent(page, { wait: 1500 });
    await page.waitForTimeout(500);
    report(`${tag} after answering`, await page.evaluate(probe, STAGE_CONTROLS));
    await shot(page, `cookie-${w}-2-answered`);
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); await shot(page, `cookie-${w}-threw`); }
  finally { await ctx.close(); }
}

/* Stat Detective's first screen. */
const SD_CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
const sdRow = (id, name, star) => ({ id, season: '1994-95', player_name: name, position: 'PG', team: 'BOS', minutes: 2200, pts: star ? 2000 : 800, trb: star ? 600 : 300, ast: star ? 500 : 200, stl: 50, blk: 10 });
const SD_NBA = [...Array.from({ length: 501 }, (_, i) => sdRow(i, `Fixture Star ${i}`, true)), ...Array.from({ length: 2201 }, (_, i) => sdRow(10000 + i, `Fixture Rotation ${i}`, false))];
const SD_SPANS = [...new Set(SD_NBA.map(r => r.player_name))].map(name => ({ player_name: name, first_season: '1994-95', last_season: '1994-95', cohort: 1970, rows_500: 1, teams: 'BOS' })).sort((a, b) => (a.player_name < b.player_name ? -1 : 1));
async function partSd(browser, w, h, motion) {
  const tag = `sd ${w}x${h} ${motion}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errs = [];
  /* Fictional case files, the shape scripts/playDraftDetectiveReports.mjs answers with; every other host is refused. */
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === new URL(BASE).origin) return route.continue();
    if (!url.hostname.endsWith('supabase.co')) return route.abort();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: SD_CORS, body: '' });
    const table = url.pathname.split('/').at(-1);
    if (!['bref_nba_player_seasons', 'bref_nba_career_spans'].includes(table)) return route.abort();
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 1000);
    const floor = Number(url.searchParams.get('minutes')?.split('.').at(-1) || 0);
    const rows = table === 'bref_nba_career_spans' ? SD_SPANS : SD_NBA.filter(r => r.minutes >= floor).sort((a, b) => b.id - a.id);
    return route.fulfill({ status: 200, headers: { ...SD_CORS, 'content-range': `${offset}-${Math.min(offset + limit, rows.length) - 1}/${rows.length}` }, body: JSON.stringify(rows.slice(offset, offset + limit)) });
  });
  try {
    await page.goto(BASE + '/stat-detective', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('button', { name: /Deep Cuts/ }).first().waitFor({ timeout: 30000 }).catch(() => say(`${tag}: Deep Cuts never showed`));
    await page.waitForTimeout(800);
    await clearRoom(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const h1 = [...document.querySelectorAll('h1')].find(x => /STAT DETECTIVE/.test(x.textContent || ''));
      const r = h1 ? h1.getBoundingClientRect() : null;
      const lh = h1 ? parseFloat(getComputedStyle(h1).lineHeight) : null;
      const btn = rx => { const b = [...document.querySelectorAll('button')].find(x => rx.test((x.textContent || '').trim())); if (!b) return null; const q = b.getBoundingClientRect(); const at = document.elementFromPoint(q.left + q.width / 2, Math.min(q.top + q.height / 2, innerHeight - 1)); return { rect: [q.left, q.top, q.right, q.bottom].map(Math.round), self: !!at && (at === b || b.contains(at)) }; };
      let glyphs = null, helpRect = null;
      if (h1) { const range = document.createRange(); range.selectNodeContents(h1); const t = range.getBoundingClientRect(); glyphs = [t.left, t.top, t.right, t.bottom].map(Math.round); }
      const hb = [...document.querySelectorAll('button')].find(b => /how to play/i.test(b.getAttribute('aria-label') || '') && b.getBoundingClientRect().top < 260);
      if (hb) { const q = hb.getBoundingClientRect(); const svg = hb.querySelector('svg'); const s = svg ? svg.getBoundingClientRect() : q; helpRect = { box: [q.left, q.top, q.right, q.bottom].map(Math.round), icon: [s.left, s.top, s.right, s.bottom].map(Math.round) }; }
      return { glyphs, helpRect, h1: r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null, lines: r && lh ? Math.round(r.height / lh) : null, font: h1 ? getComputedStyle(h1).fontSize : null,
        overflowX: document.documentElement.scrollWidth > innerWidth, stars: btn(/Stars/), deep: btn(/Deep Cuts/), y: Math.round(scrollY) };
    });
    say(`${tag}: title glyphs ${JSON.stringify(m.glyphs)}; help ? ${JSON.stringify(m.helpRect)}`);
    say(`${tag}: h1 ${JSON.stringify(m.h1)} font ${m.font} lines ${m.lines}; Stars ${JSON.stringify(m.stars)}; Deep Cuts ${JSON.stringify(m.deep)}; sideways overflow ${m.overflowX}`);
    if (!m.deep || !m.stars) bad(`${tag}: a difficulty button is missing`);
    else if (w === 390 && m.deep.rect[3] > h) bad(`${tag}: Deep Cuts ends at ${m.deep.rect[3]} of ${h}`);
    if (w === 390 && m.lines !== 1) bad(`${tag}: the title takes ${m.lines} lines`);
    if (m.overflowX) bad(`${tag}: the page scrolls sideways`);
    await shot(page, `sd-${w}-${motion}`);
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

async function partNews(browser) {
  const { ctx, page } = await newPage(browser, 390, 844, 'no-preference');
  try {
    await page.goto(BASE + '/whats-new', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('li').first().waitFor({ timeout: 15000 }).catch(() => {});
    await clearRoom(page);
    const first = await page.evaluate(() => (document.querySelector('main li') || document.querySelector('li'))?.textContent || '');
    say(`news: first entry "${first.slice(0, 120)}"`);
    if (!/^Club Manager's live match is back on top of the site menu/.test(first.trim())) bad('news: the round\'s line is not the newest entry');
    if (first.includes(String.fromCharCode(0x2013)) || first.includes(String.fromCharCode(0x2014))) bad('news: a dash in the line');
    await shot(page, 'news-390');
  } finally { await ctx.close(); }
}

/* Old saves: a Club Manager career with a match in flight and a fresh Soccer Career, both made by the BASE build
   (OLD_DIST, served here on 4390), loaded into the head build. */
async function pickCombo(p, triggerText, wanted) {
  await p.locator('[role="combobox"]', { hasText: triggerText }).first().click({ timeout: 5000 });
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  await p.evaluate(w => { const opts = [...document.querySelectorAll('[role="option"]')]; const hit = opts.find(o => o.textContent.includes(w)) || opts[0]; hit.scrollIntoView(); hit.click(); }, wanted);
  await p.waitForTimeout(400);
}
async function partOldSave(browser) {
  if (!process.env.OLD_DIST) { say('oldsave: no OLD_DIST, skipped'); return; }
  const oldServer = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.resolve(process.env.OLD_DIST), '4390'], { stdio: 'ignore' });
  const OLD = 'http://127.0.0.1:4390';
  for (let i = 0; i < 60; i++) { if (await fetch(OLD + '/').then(r => r.ok).catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const headBase = BASE;
  let store = null;
  try {
    BASE = OLD;
    const { ctx, page } = await newPage(browser, 390, 844, 'no-preference');
    await pickJob(page);
    const live = await startLive(page);
    await page.waitForTimeout(2500);
    await page.goto(OLD + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 }).catch(() => {});
    await clearRoom(page);
    await page.fill('input[placeholder*="player name"]', 'Reviewer Oldsave').catch(() => {});
    await pickCombo(page, 'Choose nationality', 'England').catch(() => {});
    await pickCombo(page, 'Choose position', 'Striker').catch(() => {});
    await pickCombo(page, 'Choose era', 'Current era').catch(() => {});
    await page.getByRole('button', { name: /Generate Starting Potential/ }).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(3400);
    await page.getByRole('button', { name: /Begin Career/ }).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
    say(`oldsave: base live ${live}; base storage keys ${Object.keys(store).length}; cm save ${store['dukb-club-manager-save'] ? store['dukb-club-manager-save'].length + ' chars' : 'MISSING'}; soccer save ${store['soccerCareerSave'] ? store['soccerCareerSave'].length + ' chars' : 'MISSING'}`);
    await ctx.close();
  } finally { BASE = headBase; oldServer.kill(); }
  if (!store || !store['dukb-club-manager-save']) { bad('oldsave: the base build made no Club Manager save'); return; }
  const { ctx, page } = await newPage(browser, 390, 844, 'no-preference');
  try {
    await page.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
    await page.evaluate(kv => { localStorage.clear(); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, store);
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await clearRoom(page);
    const live = await startLive(page);
    await page.waitForTimeout(1500);
    const s = await stageState(page);
    say(`oldsave head: live ${live} stage ${s.stage} z ${s.z}`);
    if (!live) bad('oldsave: the base save never reached its match on the head');
    else report('oldsave head stage', await page.evaluate(probe, STAGE_CONTROLS));
    await shot(page, 'oldsave-cm-390');
    if (store['soccerCareerSave']) {
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-career-action-bar]').first().waitFor({ timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await clearRoom(page);
      const bar = await page.locator('[data-career-action-bar]').count();
      const name = await page.getByText('Reviewer Oldsave').count();
      say(`oldsave head soccer: action bar ${bar}, name shown ${name}`);
      if (!bar) bad('oldsave: the base Soccer Career save does not open on the head');
      await shot(page, 'oldsave-soccer-390');
    }
    if (page.errs.length) bad(`oldsave: page errors ${page.errs.slice(0, 3).join(' | ')}`);
  } finally { await ctx.close(); }
}

/* The page toast's CSS as the shipped stylesheet applies it, read off a synthetic toast in each state the library
   uses (the exit is never sampled by playSoccerLanding, which reads a toast at its first frame and once settled). */
const PAGE_TOAST_CLASS = '[@media(max-width:600px)]:top-11 [@media(max-width:600px)]:data-[mounted=false]:[--y:translateY(0)] [@media(max-width:600px)]:data-[removed=true]:data-[front=true]:[--y:translateY(0)]';
async function partCss(browser, w, h) {
  const tag = `css ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h, 'no-preference');
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const got = await page.evaluate(cls => {
      const ol = document.createElement('ol');
      ol.setAttribute('data-sonner-toaster', ''); ol.setAttribute('data-y-position', 'top'); ol.setAttribute('data-x-position', 'center');
      document.body.appendChild(ol);
      const states = {
        entering: { 'data-mounted': 'false', 'data-front': 'true', 'data-removed': 'false', 'data-expanded': 'false', 'data-swipe-out': 'false' },
        resting: { 'data-mounted': 'true', 'data-front': 'true', 'data-removed': 'false', 'data-expanded': 'false', 'data-swipe-out': 'false' },
        leaving: { 'data-mounted': 'true', 'data-front': 'true', 'data-removed': 'true', 'data-expanded': 'false', 'data-swipe-out': 'false' },
        behind: { 'data-mounted': 'true', 'data-front': 'false', 'data-removed': 'false', 'data-expanded': 'false', 'data-swipe-out': 'false' },
      };
      const out = {};
      for (const [name, attrs] of Object.entries(states)) {
        const li = document.createElement('li');
        li.setAttribute('data-sonner-toast', ''); li.setAttribute('data-y-position', 'top'); li.setAttribute('data-x-position', 'center');
        for (const [k, v] of Object.entries(attrs)) li.setAttribute(k, v);
        li.className = cls;
        ol.appendChild(li);
        const cs = getComputedStyle(li);
        out[name] = { y: cs.getPropertyValue('--y').trim(), top: cs.top };
      }
      const after = getComputedStyle(ol.querySelector('li'), '::after');
      out.strip = { height: after.height, bottom: after.bottom };
      ol.remove();
      return out;
    }, PAGE_TOAST_CLASS);
    say(`${tag}: ${JSON.stringify(got)}`);
    const phone = w <= 600;
    const zero = v => /^translateY\(0(px)?\)$/.test(v.replace(/\s+/g, ''));
    if (phone) {
      if (got.resting.top !== '44px') bad(`${tag}: a resting phone toast's top is ${got.resting.top}, not 44px`);
      if (!zero(got.entering.y)) bad(`${tag}: a phone toast enters from ${got.entering.y}, not in place`);
      if (!zero(got.leaving.y)) bad(`${tag}: a phone toast leaves by ${got.leaving.y}, not in place`);
    } else {
      if (got.resting.top !== '0px') bad(`${tag}: a wide toast's top moved to ${got.resting.top}`);
      if (zero(got.entering.y)) bad(`${tag}: a wide toast lost its slide in`);
    }
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

/* Soccer Career's sheets with the site bar present: each opener with aria-haspopup="dialog" on a recorded save
   (scripts/data/careerLeagueWorldSaves1100.json, the player save playSoccerCareerDepth uses), opened, its top and
   its close control hit tested, closed with Escape; scroll, body lock and focus read around it. */
function soccerSave() {
  const saves = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'careerLeagueWorldSaves1100.json'), 'utf8')).saves;
  const s = structuredClone(saves.find(x => x.kind === 'player').state);
  Object.assign(s, { playerName: 'Sheet Walk Fixture', phase: 'playing', retired: false, isFinalSeason: false, pendingSummary: null, pendingBallonDor: null, pendingNews: [], pendingEvents: [], pendingAppealResult: null, pendingMoralDilemma: null, pendingRehab: null, transferSituation: null });
  return JSON.stringify(s);
}
async function partScSheets(browser, w, h) {
  const tag = `sheets ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h, 'no-preference');
  try {
    await page.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
    await page.evaluate(save => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', save); }, soccerSave());
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-career-action-bar]').first().waitFor({ timeout: 20000 }).catch(() => say(`${tag}: no action bar`));
    await page.waitForTimeout(1500);
    await clearRoom(page);
    const openers = await page.evaluate(() => [...document.querySelectorAll('button[aria-haspopup="dialog"]')].filter(b => b.getBoundingClientRect().width > 0 && !b.closest('[data-site-chrome]')).map((b, i) => { b.setAttribute('data-walk-opener', String(i)); return (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40); }));
    say(`${tag}: ${openers.length} sheet openers: ${JSON.stringify(openers)}`);
    for (let i = 0; i < Math.min(openers.length, 14); i++) {
      const name = openers[i];
      const sel = `[data-walk-opener="${i}"]`;
      await page.evaluate(s => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel);
      await page.waitForTimeout(300);
      const y0 = await page.evaluate(() => Math.round(scrollY));
      const opened = await page.locator(sel).click({ timeout: 3000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(700);
      const open = await page.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.closest('[aria-label="Cookie choices"]'); }).at(-1);
        if (!d) return null;
        const r = d.getBoundingClientRect();
        const topAt = document.elementFromPoint(r.left + r.width / 2, Math.max(r.top, 0) + 12);
        const closers = [...d.querySelectorAll('button')].filter(b => /close|back|done/i.test((b.getAttribute('aria-label') || b.textContent || '').trim()) && b.getBoundingClientRect().width > 0).map(b => { const q = b.getBoundingClientRect(); const at = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { name: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 20), rect: [q.left, q.top, q.right, q.bottom].map(Math.round), self: !!at && (at === b || b.contains(at)), at: at ? `${at.closest('[data-site-chrome]') ? 'SITE BAR ' : ''}${at.tagName.toLowerCase()}` : 'nothing' }; });
        return { rect: [r.left, r.top, r.right, r.bottom].map(Math.round), z: getComputedStyle(d).zIndex, topIsDialog: !!topAt && d.contains(topAt), topAt: topAt ? `${topAt.closest('[data-site-chrome]') ? 'SITE BAR ' : ''}${topAt.tagName.toLowerCase()}` : 'nothing', closers, lock: document.body.style.overflow || getComputedStyle(document.body).overflow, y: Math.round(scrollY) };
      });
      if (!opened || !open) { say(`${tag} "${name}": opened ${opened}, no dialog seen`); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); continue; }
      say(`${tag} "${name}": dialog ${open.rect.join(',')} z ${open.z}; its top answers ${open.topIsDialog ? 'itself' : open.topAt}; lock "${open.lock}"; scrollY ${y0} -> ${open.y}; closers ${JSON.stringify(open.closers)}`);
      if (!open.topIsDialog && open.rect[1] < 44) bad(`${tag} "${name}": the sheet's top answers ${open.topAt}`);
      for (const c of open.closers) if (!c.self) bad(`${tag} "${name}": its "${c.name}" answers ${c.at}`);
      await shot(page, `sheet-${w}-${i}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      const after = await page.evaluate(s => ({ still: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(x => x.getBoundingClientRect().width > 0 && !x.closest('[aria-label="Cookie choices"]')).length, lock: document.body.style.overflow, y: Math.round(scrollY), focus: document.activeElement === document.querySelector(s) }), sel);
      say(`${tag} "${name}": after Escape dialogs ${after.still}, lock "${after.lock}", scrollY ${after.y}, focus back on the opener ${after.focus}`);
      if (after.still) { bad(`${tag} "${name}": Escape left the sheet open`); await page.keyboard.press('Escape').catch(() => {}); }
      else {
        if (after.lock === 'hidden') bad(`${tag} "${name}": body still locked after Escape`);
        if (after.y !== open.y) bad(`${tag} "${name}": Escape moved the page ${open.y} -> ${after.y}`);
        if (!after.focus) say(`${tag} "${name}": NOTE focus did not return to the opener`);
      }
    }
    if (page.errs.length) bad(`${tag}: page errors ${page.errs.slice(0, 3).join(' | ')}`);
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

/* The library's exit ghost (styles.css: a removed, unswiped toast keeps a ::before at inset 0, scaleY(2), so a
   hover is not lost while it leaves): where does it reach on a phone, against the site bar's menu button? */
async function partGhost(browser, w, h) {
  const tag = `ghost ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h, 'no-preference');
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await clearRoom(page);
    const got = await page.evaluate(cls => {
      const menu = document.querySelector('[data-site-chrome] button');
      const mr = menu.getBoundingClientRect();
      const ol = document.createElement('ol');
      ol.setAttribute('data-sonner-toaster', ''); ol.setAttribute('data-y-position', 'top'); ol.setAttribute('data-x-position', 'center');
      ol.style.cssText = '--mobile-offset-top:16px;--mobile-offset-left:16px;--mobile-offset-right:16px;--offset-top:24px;--offset-left:24px;--offset-right:24px;--gap:14px;--width:356px;--front-toast-height:54px';
      document.body.appendChild(ol);
      const li = document.createElement('li');
      for (const [k, v] of Object.entries({ 'data-sonner-toast': '', 'data-y-position': 'top', 'data-x-position': 'center', 'data-mounted': 'true', 'data-front': 'true', 'data-removed': 'false', 'data-swiping': 'false', 'data-swipe-out': 'false', 'data-expanded': 'false', 'data-styled': 'true', 'data-visible': 'true' })) li.setAttribute(k, v);
      li.className = cls; li.style.height = '54px'; li.textContent = 'synthetic toast';
      ol.appendChild(li);
      const probeAt = (x, y) => { const at = document.elementFromPoint(x, y); return at === li || li.contains(at) ? 'TOAST' : at && at.closest('[data-site-chrome]') ? 'bar' : at ? at.tagName.toLowerCase() : 'nothing'; };
      const pts = [[mr.left + mr.width / 2, mr.top + mr.height / 2], [mr.left + mr.width / 2, mr.bottom - 4], [mr.left + mr.width / 2, mr.bottom - 10]];
      const resting = { rect: (r => [r.left, r.top, r.right, r.bottom].map(Math.round))(li.getBoundingClientRect()), at: pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}:${probeAt(x, y)}`) };
      li.setAttribute('data-removed', 'true');
      const ghostCss = getComputedStyle(li, '::before');
      const leaving = { ghost: { content: ghostCss.content, transform: ghostCss.transform, top: ghostCss.top, height: ghostCss.height }, at: pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}:${probeAt(x, y)}`) };
      ol.remove();
      return { menu: [mr.left, mr.top, mr.right, mr.bottom].map(Math.round), resting, leaving };
    }, PAGE_TOAST_CLASS);
    say(`${tag}: ${JSON.stringify(got)}`);
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

/* Keyboard from the stage: Shift+Tab back out of Back until the site bar's menu button has focus, then Enter. */
async function partKbd(browser, w, h) {
  const tag = `kbd ${w}x${h}`;
  const { ctx, page } = await newPage(browser, w, h, 'no-preference');
  try {
    await pickJob(page);
    if (!(await startLive(page))) { bad(`${tag}: never reached a live match`); return; }
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Back to the club page' }).first().focus();
    let steps = 0, where = '';
    for (; steps < 60; steps++) {
      await page.keyboard.press('Shift+Tab');
      where = await page.evaluate(() => { const a = document.activeElement; if (!a) return 'none'; if (a.closest('[data-site-chrome]')) return 'BAR ' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 30); if (a.closest('[data-cm-live-stagebox]')) return 'stage'; return 'page ' + a.tagName.toLowerCase(); });
      if (where.startsWith('BAR')) break;
    }
    say(`${tag}: after ${steps + 1} Shift+Tab presses focus is on ${where}`);
    if (!where.startsWith('BAR')) return;
    const vis = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return at === a || a.contains(at) ? 'visible' : `hidden under ${at && at.closest('[data-cm-live-stagebox]') ? 'the stage' : at ? at.tagName : 'nothing'}`; });
    say(`${tag}: the focused menu button is ${vis}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    const menu = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"]')].filter(x => !x.closest('[data-cm-live-stagebox]') && !x.hasAttribute('data-cm-live-stagebox') && x.getBoundingClientRect().width > 0).at(-1);
      if (!d) return null;
      const r = d.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { label: d.getAttribute('aria-label') || (d.textContent || '').trim().slice(0, 30), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), z: getComputedStyle(d).zIndex, seen: !!at && d.contains(at), focusInside: d.contains(document.activeElement) };
    });
    say(`${tag}: after Enter the menu dialog is ${JSON.stringify(menu)}`);
    await shot(page, `kbd-${w}-menu`);
    if (menu && !menu.seen) say(`${tag}: NOTE the site menu opened UNDER the stage (focus inside it ${menu.focusInside})`);
    await page.keyboard.press('Escape');
  } catch (e) { bad(`${tag}: walk threw ${String(e && e.message).split('\n')[0]}`); }
  finally { await ctx.close(); }
}

const browser = await chromium.launch();
try {
  if (PARTS.includes('kbd')) for (const [w, h] of [[390, 844], [1280, 900]]) await partKbd(browser, w, h);
  if (PARTS.includes('ghost')) for (const [w, h] of [[390, 844], [320, 640]]) await partGhost(browser, w, h);
  if (PARTS.includes('scsheets')) for (const [w, h] of [[390, 844], [1280, 900]]) await partScSheets(browser, w, h);
  if (PARTS.includes('css')) for (const [w, h] of [[390, 844], [320, 640], [601, 900], [1280, 900]]) await partCss(browser, w, h);
  if (PARTS.includes('oldsave')) await partOldSave(browser);
  if (PARTS.includes('cm')) for (const [w, h] of [[390, 844], [1280, 900]]) for (const motion of ['no-preference', 'reduce']) await partCm(browser, w, h, motion);
  if (PARTS.includes('cookie')) for (const [w, h] of [[390, 844], [1280, 900]]) await partCookie(browser, w, h);
  if (PARTS.includes('sd')) for (const [w, h] of [[320, 568], [390, 844], [1280, 900]]) for (const motion of ['no-preference', 'reduce']) await partSd(browser, w, h, motion);
  if (PARTS.includes('news')) await partNews(browser);
} finally { await browser.close(); if (server) server.kill(); }
console.log(findings.length ? `walk1568: RED, ${findings.length} findings` : `walk1568: green, parts ${PARTS.join(', ')} walked`);
process.exit(findings.length ? 1 : 0);

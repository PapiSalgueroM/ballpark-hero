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
async function partSd(browser, w, h, motion) {
  const tag = `sd ${w}x${h} ${motion}`;
  const { ctx, page } = await newPage(browser, w, h, motion);
  try {
    await page.goto(BASE + '/stat-detective', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('h1').first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await clearRoom(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const h1 = [...document.querySelectorAll('h1')].find(x => /STAT DETECTIVE/.test(x.textContent || ''));
      const r = h1 ? h1.getBoundingClientRect() : null;
      const lh = h1 ? parseFloat(getComputedStyle(h1).lineHeight) : null;
      const btn = rx => { const b = [...document.querySelectorAll('button')].find(x => rx.test((x.textContent || '').trim())); if (!b) return null; const q = b.getBoundingClientRect(); const at = document.elementFromPoint(q.left + q.width / 2, Math.min(q.top + q.height / 2, innerHeight - 1)); return { rect: [q.left, q.top, q.right, q.bottom].map(Math.round), self: !!at && (at === b || b.contains(at)) }; };
      return { h1: r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null, lines: r && lh ? Math.round(r.height / lh) : null, font: h1 ? getComputedStyle(h1).fontSize : null,
        overflowX: document.documentElement.scrollWidth > innerWidth, stars: btn(/^Stars/), deep: btn(/^Deep Cuts/), y: Math.round(scrollY) };
    });
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

const browser = await chromium.launch();
try {
  if (PARTS.includes('cm')) for (const [w, h] of [[390, 844], [1280, 900]]) for (const motion of ['no-preference', 'reduce']) await partCm(browser, w, h, motion);
  if (PARTS.includes('cookie')) for (const [w, h] of [[390, 844], [1280, 900]]) await partCookie(browser, w, h);
  if (PARTS.includes('sd')) for (const [w, h] of [[320, 568], [390, 844], [1280, 900]]) for (const motion of ['no-preference', 'reduce']) await partSd(browser, w, h, motion);
  if (PARTS.includes('news')) await partNews(browser);
} finally { await browser.close(); if (server) server.kill(); }
console.log(findings.length ? `walk1568: RED, ${findings.length} findings` : `walk1568: green, parts ${PARTS.join(', ')} walked`);
process.exit(findings.length ? 1 : 0);

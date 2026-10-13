// Round 1326 P4: the builder's own picture walk (never committed). Runs on a runner under #!serve #!playwright,
// against BASE (head) or SWEEP_BASE (a base build). Every stop is shot at 320x640, 390x844 and 1280x900.
// Prints what each picture proves. Database and ad hosts blocked.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.WALK_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/p4';
const TAG = process.env.WALK_TAG || 'head';
const KEY = 'dukb-club-manager-save';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [[320, 640], [390, 844], [1280, 900]];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
const log = m => console.log(m);
const wait = ms => page.waitForTimeout(ms);
const saved = () => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, KEY);
const heading = async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
async function tap(rx) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
}
async function tapText(rx) {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
}
async function clearRoom() {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await wait(250);
  }
}
// Shoot the current screen at three sizes, the element `sel` (if any) scrolled to the top third first.
async function shoot(name, what, sel) {
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await wait(350);
    if (sel) await page.locator(sel).first().evaluate(el => el.scrollIntoView({ block: 'start' })).catch(() => {});
    await wait(200);
    await page.screenshot({ path: path.join(OUT, `${TAG}-${name}-${w}.png`) }).catch(() => {});
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(250);
  log(`PICTURE ${TAG}-${name}-{320,390,1280}.png: ${what}`);
}
const textOf = async sel => ((await page.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
async function hubTile(rx) {
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).catch(() => {});
  await wait(300);
  const t = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await t.count().catch(() => 0) === 0) return false;
  await t.click({ timeout: 4000 }).catch(() => {});
  await wait(700);
  return true;
}
async function back() {
  await tapText(/^\s*(Back|Club home)\s*$/i);
  await wait(400);
}
async function quickWeek() {
  for (let step = 0; step < 8; step++) {
    const where = await heading();
    if (where === 'FULL TIME') { await tap(/continue|next|carry on|ok/i); await wait(350); return true; }
    if (where === 'HALF TIME' || where === 'MATCH LIVE') { await tap(/second half|skip|full report/i); await wait(350); continue; }
    if (await tapText(/Quick Sim/i)) { await wait(600); continue; }
    await clearRoom();
    if (await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).then(() => true).catch(() => false)) { await wait(300); continue; }
    return false;
  }
  return true;
}

try {
  // A. the club list in La Liga: Real Madrid's and Barcelona's board lines
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await wait(900);
  await clearRoom();
  await tap(/2026-27/i);
  await page.getByRole('button', { name: /Spain/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/Spain/i);
  await page.getByRole('button', { name: /La Liga/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/La Liga/i);
  const barca = page.locator('button').filter({ hasText: /Barcelona/ }).first();
  await barca.waitFor({ timeout: 8000 }).catch(() => {});
  log(`TEXT club list, Barcelona tile: ${((await barca.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160)}`);
  log(`TEXT club list, Real Madrid tile: ${((await page.locator('button').filter({ hasText: /Real Madrid/ }).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160)}`);
  await barca.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
  await shoot('club-list-laliga', 'the La Liga club list, the giants asked to Win La Liga (no "the")');
  await barca.click({ timeout: 5000 }).catch(() => {});
  await wait(600);
  await shoot('club-card-barcelona', 'Barcelona picked, its card with the board demand');
  await tap(/take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/skip: just manage/i);
  await wait(900);
  const s0 = await saved();
  log(`STATE in the job at ${s0?.clubName}, week ${s0?.week}`);

  // B. the Board panel and the Match Centre
  if (await hubTile(/Board/)) {
    log(`TEXT board panel: ${(await textOf('main')).match(/Win[^.]{0,60}/g)?.slice(0, 4).join(' | ') ?? 'no Win line'}`);
    await shoot('board-panel', 'the Board panel: the title objective reads Win La Liga, the double keeps its "the"');
    await back();
  } else log('MISS no Board tile');
  if (await tapText(/Match Centre/)) {
    await wait(700);
    const mc = await textOf('main');
    log(`TEXT match centre: ${(mc.match(/(#\d+ in [^.|]{0,40}|Plays in [^.|]{0,40})/g) || ['no league line']).slice(0, 3).join(' | ')}`);
    await shoot('match-centre', 'the Match Centre before the first match (opponent league line when it shows)');
    await back();
  } else log('MISS no Match Centre button');

  // C. one week, then the staff desk doctored to level 9 from robots.txt, proven before the next press
  await quickWeek();
  await page.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  const doctored = await page.evaluate(k => {
    const c = JSON.parse(localStorage.getItem(k) || 'null');
    if (!c || !c.staff) return { ok: false, why: c ? 'no staff block in the save' : 'no save' };
    let n = 0;
    for (const [post, man] of Object.entries(c.staff)) if (man && typeof man === 'object' && typeof man.level === 'number') { c.staff[post] = { ...man, level: 9, potential: 10 }; n += 1; }
    localStorage.setItem(k, JSON.stringify(c));
    return { ok: n > 0, n };
  }, KEY);
  log(`STATE staff doctored: ${JSON.stringify(doctored)}`);
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  const resume = page.getByRole('button', { name: /^Resume Career$/ }).first();
  await resume.waitFor({ timeout: 10000 }).catch(() => {});
  const landed = await saved();
  const levels = Object.values(landed?.staff || {}).filter(m => m && typeof m.level === 'number').map(m => m.level);
  log(`STATE before the first press after the edit: staff levels ${levels.join(',')}`);
  await resume.click({ timeout: 4000 }).catch(() => {});
  await wait(900);

  // D. quick sim until the first international break note and a staff approach headline have both landed
  let intlShot = false, staffShot = false, offerSeen = false;
  for (let wk = 0; wk < 46 && !(intlShot && staffShot); wk++) {
    if (!await quickWeek()) { log(`STUCK at week ${(await saved())?.week}`); break; }
    const s = await saved();
    if (!s) break;
    const note = (s.inbox || []).find(m => /^International break: the window runs/.test(m.text || ''));
    if (note && !intlShot) {
      intlShot = true;
      log(`TEXT inbox note, week ${s.week}: ${note.text.slice(0, 260)}`);
      if (await hubTile(/Inbox/)) { await shoot('inbox-intl', 'the inbox after the first international window: the note says this calendar keeps your fixtures going', '[data-inbox-card], main'); await back(); }
      if (await hubTile(/Calendar/)) {
        const cal = await textOf('main');
        log(`TEXT calendar: ${(cal.match(/(This calendar plays on[^.]*\.|your fixtures do not stop[^.]*\.)/g) || ['no window line on the first screen']).slice(0, 2).join(' | ')}`);
        await shoot('calendar-window', 'the calendar near the window: its window line names this calendar\'s rule');
        await back();
      }
    }
    const appr = (s.aiHeadlines || []).find(h => /have come in for|Match them or lose him/.test(h));
    if (appr && !staffShot) {
      staffShot = true;
      log(`TEXT staff approach, week ${s.week}: ${appr}`);
      await page.getByRole('tab', { name: /^Market$/i }).first().click({ timeout: 4000 }).catch(() => {});
      await wait(700);
      const feed = page.getByText(/have come in for|Match them or lose him/).first();
      await feed.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await shoot('feed-staff-approach', 'the news feed on the Market tab with the staff approach headline');
      await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).catch(() => {});
      await wait(300);
    }
    const offer = (s.inbox || []).find(m => /Win (the )?(La Liga|Serie A|Ligue 1)/.test(m.text || ''));
    if (offer && !offerSeen) { offerSeen = true; log(`TEXT a message naming a title, week ${s.week}: ${offer.text.slice(0, 200)}`); }
    const news = (s.aiHeadlines || []).filter(h => /top (the )?La Liga|attack in (the )?La Liga/.test(h));
    if (news.length) log(`TEXT news week ${s.week}: ${news[0]}`);
  }
  log(`SUMMARY intl ${intlShot}, staff ${staffShot}, week ${(await saved())?.week}`);

  // E. the Finances desk at the end of the walk
  if (await hubTile(/Finances/)) {
    await shoot('finances', 'the Finances desk late in the walk: cover and kitty rows', '[data-finance-projection]');
    log(`TEXT finances: ${(await textOf('[data-finance-projection]')).slice(0, 400)}`);
  }
} catch (e) {
  log(`THREW ${e.message.split('\n')[0]}`);
}
log(`PAGE ERRORS ${errs.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED/i.test(e)).slice(0, 3).join(' | ') || 'none'}`);
await browser.close();
log('p4walk: done');

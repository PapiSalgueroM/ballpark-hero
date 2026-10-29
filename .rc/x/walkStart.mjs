/* Round 1569 fix3 walk (never committed; sent as .rc/x/walkStart.mjs). The lead's ruling R1: after a screen swap
   that starts or restarts a career, the new screen's top is in view below the 44 px menu bar.
   supabase.co is aborted in every context. All four sports (one shared board), at 1318 x 647, 390 x 844 and
   1280 x 900, each once with the cookie banner still up (normal motion, so the reveal glides) and once with it
   answered (reduced motion). In each context, like a player, the button is scrolled into view first and then
   pressed, and the board's top (the board's wrapper, the main child that holds the create screen, the hub or
   Start over) is read 1.4 s later:
     draft     Enter the draft from the foot of the create screen        -> the hub
     restart   a confirmed Start over from the foot of the hub tiles     -> the create screen
     road      Play your road to the draft from the foot of the create screen -> the road's first screen
     join      Start your career at the end of the road                  -> the first hub after the draft
     newcareer a confirmed New career on a retired card with a Hall card -> the create screen
   The top passes when it sits at or below the menu bar's bottom (2 px slack) and at least min(160, its height)
   of the board shows above the cookie banner's top (or the window's foot). Also: a reload of a saved career
   must not move the page (the count rises on presses only), and the restart dialog names the Hall card on the
   retired card and not on a live career (R3). Served from the base build (2ee79c595) the swaps must fail. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = s => `/${s}-my-career`, KEY = s => `${s}-my-career-save-v1`;
let problems = 0, passes = 0, measured = 0;
const log = o => console.log(JSON.stringify(o));
const problem = m => { problems++; console.log(`PROBLEM ${m}`); };
const browser = await chromium.launch();

async function open(sport, view, banner) {
  const ctx = await browser.newContext({ viewport: { width: view[0], height: view[1] }, reducedMotion: banner ? 'no-preference' : 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(p => { try { localStorage.setItem(`rules-gate-seen:${p}`, '1'); } catch { /* */ } }, ROUTE(sport));
  const page = await ctx.newPage();
  await page.goto(BASE + ROUTE(sport)); await page.waitForTimeout(1500);
  if (!banner) {
    const reg = page.getByRole('region', { name: 'Cookie choices' });
    const btn = reg.getByRole('button', { name: /Reject|Decline|Necessary|Essential/i }).first();
    if (await btn.count()) await btn.click(); else if (await reg.getByRole('button').count()) await reg.getByRole('button').first().click();
    await page.waitForTimeout(300);
  }
  return { ctx, page };
}
const btnIn = (page, re) => page.locator('main').getByRole('button', { name: re }).first();
/* Scroll the control into view the way a player does (to the middle of the window), then press it. */
async function press(page, re) {
  const b = btnIn(page, re);
  if (!(await b.count())) return false;
  await b.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(250);
  await b.click(); return true;
}
async function confirmRestart(page) {
  const d = page.getByRole('alertdialog', { name: 'Start a new career?' });
  await d.waitFor({ state: 'visible', timeout: 4000 });
  const text = (await d.textContent()) || '';
  await d.getByRole('button', { name: 'Start new career' }).click();
  return text;
}
async function top(page) {
  const bb = await page.getByRole('region', { name: 'Cookie choices' }).boundingBox().catch(() => null);
  return page.evaluate(bannerTop => {
    const main = document.querySelector('main');
    const board = [...main.children].find(el => el.querySelector('[data-career-hub-buttons], [data-career-prospect-entry], [data-career-start-over]'));
    const bar = document.querySelector('[data-site-chrome]')?.getBoundingClientRect().bottom ?? 0;
    const vh = innerHeight, r = board ? board.getBoundingClientRect() : null;
    const readBottom = bannerTop !== null && bannerTop < vh ? bannerTop : vh;
    return { top: r ? Math.round(r.top) : null, height: r ? Math.round(r.height) : 0, bar: Math.round(bar), readBottom: Math.round(readBottom), scrollY: Math.round(scrollY) };
  }, bb ? bb.y : null);
}
async function measure(page, tag, swap) {
  await page.waitForTimeout(1400);
  const m = await top(page); measured++;
  await page.screenshot({ path: path.join(OUT, `S-${tag}-${swap}.png`) });
  const need = Math.min(160, m.height);
  const ok = m.top !== null && m.top >= m.bar - 2 && m.top + need <= m.readBottom;
  log({ tag, swap, ...m, ok });
  if (ok) passes++; else problem(`${tag} ${swap}: the new screen's top is at ${m.top} (bar ${m.bar}, readable to ${m.readBottom}, board ${m.height} high, scrollY ${m.scrollY})`);
}
async function clickIf(page, re) {
  const b = btnIn(page, re);
  if (await b.count() && await b.isVisible()) { await b.click(); await page.waitForTimeout(400); return true; }
  return false;
}
/* Drive the road to the draft to its last button, Start your career, and leave it unpressed. */
async function road(page, tag) {
  const route = page.locator('main button', { hasText: /Start at age/ }).first();
  if (!(await route.count())) { problem(`${tag}: no route on the road to the draft`); return false; }
  await route.click(); await page.waitForTimeout(500);
  for (let i = 0; i < 80; i++) {
    const start = btnIn(page, /^Start your career$/);
    if (await start.count() && await start.isVisible()) return true;
    const choice = page.locator('main [data-testid="pre-draft-choice"] button').first();
    if (await choice.count() && await choice.isVisible()) { await choice.click(); await page.waitForTimeout(400); continue; }
    if (await clickIf(page, /^Play (your first|the next) season$/)) continue;
    if (await clickIf(page, /^Draft day$/)) { await page.waitForTimeout(1500); continue; }
    if (await clickIf(page, /^Skip to the end$/)) continue;
    const sc = page.locator('main [data-testid="draft-showcase"] .grid button').first();
    if (await sc.count() && await sc.isVisible()) { await sc.click(); await page.waitForTimeout(500); continue; }
    await page.waitForTimeout(400);
  }
  problem(`${tag}: the road to the draft never offered Start your career`); return false;
}
/* A retired career with a Hall card: one real season played, copied to six, then retired on the save. */
async function seedRetired(page, sport) {
  const play = btnIn(page, /^Play the \d+ season$/);
  if (await play.count()) { await play.click(); await page.waitForTimeout(1500); }
  await page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem(k));
    const L = s.c.seasons[s.c.seasons.length - 1];
    if (L) { while (s.c.seasons.length < 6) s.c.seasons.push({ ...L }); s.c.seasons.forEach((x, i) => { x.year = L.year - (s.c.seasons.length - 1) + i; }); }
    s.c.retired = true; s.phase = 'retired';
    delete s.c.summer; delete s.c.pendingRivalryEvent; delete s.c.pendingRivalryChoice; delete s.contractTalk;
    localStorage.setItem(k, JSON.stringify(s));
  }, KEY(sport));
  await page.reload(); await page.waitForTimeout(2500);
}

for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) for (const v of [[1318, 647], [390, 844], [1280, 900]]) for (const banner of [true, false]) {
  const tag = `${sport}-${v[0]}x${v[1]}-${banner ? 'banner' : 'answered'}`;
  const { ctx, page } = await open(sport, v, banner);
  try {
    if (!(await press(page, /^Enter the draft$/))) { problem(`${tag}: no Enter the draft`); continue; }
    await measure(page, tag, 'draft');
    await page.locator('main [data-career-hub-buttons]').evaluate(el => el.scrollIntoView({ block: 'end', behavior: 'instant' }));
    await page.waitForTimeout(250);
    if (!(await press(page, /Start over/))) { problem(`${tag}: no Start over on the hub`); continue; }
    const live = await confirmRestart(page);
    if (/Hall of Fame card/.test(live)) problem(`${tag}: the restart dialog on a live career names a Hall card`);
    await measure(page, tag, 'restart');
    if (!(await press(page, /^Play your road to the draft$/))) { problem(`${tag}: no road to the draft`); continue; }
    await measure(page, tag, 'road');
    if (await road(page, tag)) { await press(page, /^Start your career$/); await measure(page, tag, 'join'); }
    await seedRetired(page, sport);
    const still = await page.evaluate(() => Math.round(scrollY));
    if (still !== 0) problem(`${tag}: a reload of a saved career moved the page to ${still}`);
    if (!(await press(page, /^New career$/))) { problem(`${tag}: no New career on the retired card`); continue; }
    const hall = await confirmRestart(page);
    if (!/Hall of Fame card/.test(hall)) problem(`${tag}: the restart dialog on a retired career does not name the Hall card ("${hall.slice(0, 160)}")`);
    await measure(page, tag, 'newcareer');
  } catch (e) { problem(`${tag}: walk error ${String(e && e.message || e).slice(0, 200)}`); }
  finally { await ctx.close(); }
}
await browser.close();
console.log(`walkStart ${problems ? 'FAIL' : 'DONE'}: ${problems} problems, ${passes} of ${measured} swaps put the new screen's top in view, base ${BASE}`);
process.exit(problems ? 1 : 0);

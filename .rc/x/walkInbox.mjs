/* Round 1569 fix2 walk (never committed; sent as .rc/x/walkInbox.mjs). supabase.co blocked in every context.
   The Inbox tap the closing check asked for, written so that a pass means the Inbox opened, not only that
   Start a new career? did not:
   - the Inbox hub tile's centre is put at TAP_Y (70: inside the old sticky pill's band 48 to 92, under no bar);
   - a hit test at the tap point must land inside the Inbox tile and not in Start over or the site bar;
   - after one real mouse click there, the Inbox panel must be open, recognised by what the board actually draws
     (the hub tiles gone, the Hub back button in main, the panel title reading Inbox), and the restart dialog shut;
   - the recogniser must read closed before the tap and closed again after Hub, so it cannot be stuck on true.
   All four sports (one shared board) at 1280 x 900, 1318 x 647 with the cookie banner up, and 390 x 844.
   WALK_CONTROL=bar puts the tile centre at y 34 (walkR3's own tap at 1280 landed at 34.25, under the 44 px menu
   bar); the walk must fail there. Served from the reviewed head 1387282d8 the tap opens the restart dialog, and the
   walk must fail too. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const CONTROL = process.env.WALK_CONTROL || '';
const TAP_Y = CONTROL === 'bar' ? 34 : 70;
const OUT = process.env.RC_OUT || path.resolve('.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = s => `/${s}-my-career`, KEY = s => `${s}-my-career-save-v1`;
/* One season under each sport's season cap (walkFix's seed): the no offer talk on the last season path. */
const LASTB = { nba: [20, 38], nfl: [18, 35], mlb: [20, 38], nhl: [21, 37] };
let problems = 0, passes = 0;
const log = o => console.log(JSON.stringify(o));
const problem = m => { problems++; console.log(`PROBLEM ${m}`); };
const browser = await chromium.launch();

async function open(sport, view, banner) {
  const ctx = await browser.newContext({ viewport: { width: view[0], height: view[1] }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(p => { try { localStorage.setItem(`rules-gate-seen:${p}`, '1'); } catch { /* */ } }, ROUTE(sport));
  const page = await ctx.newPage();
  await page.goto(BASE + ROUTE(sport)); await page.waitForTimeout(1500);
  if (!banner) {
    const reg = page.getByRole('region', { name: 'Cookie choices' });
    const btn = reg.getByRole('button', { name: /Reject|Decline|Necessary|Essential/i }).first();
    if (await btn.count()) await btn.click(); else if (await reg.getByRole('button').count()) await reg.getByRole('button').first().click();
  }
  return { ctx, page };
}
async function clickBtn(page, re) {
  const loc = page.locator('main').getByRole('button', { name: re }).first();
  if (await loc.count() && await loc.isVisible() && await loc.isEnabled()) { await loc.click(); await page.waitForTimeout(400); return true; }
  return false;
}
async function edit(page, sport, fn) {
  await page.evaluate(([k, f]) => { const s = JSON.parse(localStorage.getItem(k)); new Function('s', f)(s); delete s.c.summer; delete s.c.pendingRivalryEvent; delete s.c.pendingRivalryChoice; localStorage.setItem(k, JSON.stringify(s)); }, [KEY(sport), fn]);
  await page.reload(); await page.waitForTimeout(1300);
}
async function seedB(page, sport) {
  const [n, age] = LASTB[sport];
  await edit(page, sport, `const L = s.c.seasons[s.c.seasons.length - 1]; while (s.c.seasons.length < ${n}) s.c.seasons.push({ ...L }); s.c.seasons.length = ${n}; s.c.seasons.forEach((x, i) => { x.year = s.c.year - ${n} + i; x.age = ${age} - ${n} + 1 + i; }); s.c.age = ${age}; s.c.ovr = 70; s.c.contractYears = 1; delete s.contractTalk; s.phase = "season";`);
  await clickBtn(page, /One more year/);
  const play = page.locator('main').getByRole('button', { name: /^Play the \d+ season$/ }).first();
  if (await play.count()) await play.click();
  await page.waitForTimeout(1200);
}
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); }
/* What the board draws for an open Inbox: HubPanelHeader (a Hub back button beside the title span) in place
   of the hub tiles (src/components/hub/HubTiles.tsx, UsCareerBoard.tsx's drill-in screens). */
const panelState = page => page.evaluate(() => {
  const main = document.querySelector('main');
  const tiles = !!main.querySelector('[data-career-hub-buttons]');
  const back = [...main.querySelectorAll('button')].find(b => (b.textContent || '').replace(/\s+/g, ' ').trim() === 'Hub');
  const title = back ? (back.parentElement?.querySelector(':scope > span')?.textContent || '').trim() : '';
  const rows = main.querySelectorAll('[data-inbox-row]').length, empty = /No texts yet/.test(main.textContent || '');
  return { tiles, back: !!back, title, rows, empty, inboxOpen: !tiles && !!back && /Inbox/.test(title) && (rows > 0 || empty || !!main.querySelector('[data-inbox-settled]')) };
});
const tileBox = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('main [data-career-hub-buttons] button')].find(x => /Inbox/.test(x.textContent || ''));
  if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom };
});
const dialogOpen = page => page.getByRole('alertdialog', { name: 'Start a new career?' }).isVisible().catch(() => false);

for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) for (const v of [[1280, 900], [1318, 647], [390, 844]]) {
  const tag = `${sport}-${v[0]}x${v[1]}`;
  const { ctx, page } = await open(sport, v, v[0] === 1318);
  try {
    await page.locator('main button', { hasText: /^Enter the draft$/ }).click(); await page.waitForTimeout(900);
    await seedB(page, sport);
    const before = await panelState(page);
    if (!before.tiles || before.inboxOpen) problem(`${tag}: before the tap the hub tiles are not up or the Inbox reads open (${JSON.stringify(before)})`);
    let t = await tileBox(page);
    if (!t) { problem(`${tag}: no Inbox tile on the hub`); continue; }
    await page.evaluate(d => scrollTo(0, scrollY + d), t.y - TAP_Y); await page.waitForTimeout(300);
    t = await tileBox(page);
    if (Math.abs(t.y - TAP_Y) > 2) problem(`${tag}: could not put the tile centre at y ${TAP_Y} (it is at ${t.y})`);
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y); const b = el && el.closest('button');
      return { el: el ? el.tagName : null, inTile: !!b && /Inbox/.test(b.textContent || '') && !!b.closest('[data-career-hub-buttons]'),
        inPill: !!(el && el.closest('[data-career-start-over]')), inBar: !!(el && el.closest('header, nav')) && !(el && el.closest('main')) };
    }, [t.x, t.y]);
    await shot(page, `I-${tag}-before-tap`);
    if (!hit.inTile) problem(`${tag}: the point (${Math.round(t.x)}, ${Math.round(t.y)}) hits ${hit.el}${hit.inPill ? ' in Start over' : ''}${hit.inBar ? ' in the site bar' : ''}, not the Inbox tile`);
    await page.mouse.click(t.x, t.y); await page.waitForTimeout(600);
    const dialog = await dialogOpen(page);
    const after = await panelState(page);
    await shot(page, `I-${tag}-after-tap`);
    log({ tag, tap: { x: Math.round(t.x), y: Math.round(t.y * 100) / 100 }, hit, restartDialog: dialog, before: before.inboxOpen, after });
    if (dialog) { problem(`${tag}: the tap on the Inbox tile opened Start a new career?`); await page.keyboard.press('Escape'); await page.waitForTimeout(300); continue; }
    if (!after.inboxOpen) { problem(`${tag}: the tap did not open the Inbox (${JSON.stringify(after)})`); continue; }
    await page.locator('main').getByRole('button', { name: 'Hub', exact: true }).click(); await page.waitForTimeout(500);
    const back = await panelState(page);
    if (back.inboxOpen || !back.tiles) problem(`${tag}: after Hub the recogniser still reads the Inbox open (${JSON.stringify(back)})`);
    else { passes++; log({ tag, pass: 'tile hit, Inbox opened, no restart dialog, Hub back to the tiles' }); }
  } catch (e) { problem(`${tag}: walk error ${String(e && e.message || e).slice(0, 160)}`); }
  finally { await ctx.close(); }
}
await browser.close();
console.log(`walkInbox ${problems ? 'FAIL' : 'DONE'}: ${problems} problems, ${passes} of 12 taps opened the Inbox${CONTROL ? `, CONTROL ${CONTROL} (tap at y ${TAP_Y})` : ''}, base ${BASE}`);
process.exit(problems ? 1 : 0);

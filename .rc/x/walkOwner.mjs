/* Round 1524 walk (sent to a runner as .rc/x/walkOwner.mjs, never committed): retire rich, buy a club off the list,
   play four seasons making each of the four calls once, reload mid way and at the end. 390 by 844 (touch) and 1280
   by 900, on the served build, with Supabase and the ad hosts blocked. */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', `walk-${Date.now()}`);
fs.mkdirSync(OUT, { recursive: true });
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
let failures = 0, checks = 0;
const check = (ok, what) => { checks += 1; if (!ok) { failures += 1; console.error(`  FAIL: ${what}`); } else console.log(`  ok: ${what}`); };

/* the save: a seeded career played a few seasons, retired by hand, with the money to buy any club on the list */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walkowner-'));
fs.writeFileSync(path.join(tmp, 'entry.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as E from '${path.join(ROOT, 'src/lib/soccerCareerEngine.ts').replaceAll('\\', '/')}';
export * as S from '${path.join(ROOT, 'src/lib/soccerCareerSave.ts').replaceAll('\\', '/')}';
`);
await build({ entryPoints: [path.join(tmp, 'entry.mjs')], outfile: path.join(tmp, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { E, S } = await import(pathToFileURL(path.join(tmp, 'b.mjs')).href);
const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const REAL = Math.random;
Math.random = mulberry32(1524);
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
let c = E.initCareer('Walk Owner', 'England', 'ST', '2020s', flat(70), 70, 2020, E.FALLBACK_CLUBS, null, 90);
for (let i = 0; i < 14 && !c.retired; i += 1) {
  c = c.phase === 'youth' ? E.advanceYouthYear(c, E.FALLBACK_CLUBS) : c.phase === 'retirement_suggestion' ? E.acceptRetirementSuggestion(c) : E.advanceProSeason(c, E.FALLBACK_CLUBS);
  if (c.transferSituation) c = { ...c, transferSituation: null };
}
if (!c.retired) c = E.manualRetire(c);
Math.random = REAL;
c = { ...c, netWorth: 320 };
console.log(`save: ${c.playerName}, phase ${c.phase}, ${c.seasons.length} seasons, net worth ${c.netWorth}`);
if (c.phase !== 'retirement_ceremony') { console.error('the save is not at the ceremony'); process.exit(2); }
const RAW = S.serializeSoccerCareerSave(c);

const browser = await chromium.launch();
const errorsOf = new Map();
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  errorsOf.set(p, errs);
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(raw => { localStorage.clear(); localStorage.setItem('soccerCareerSave', raw); }, RAW);
  return { ctx, p };
}
async function settle(p) {
  await p.getByRole('button', { name: /^reject all$/i }).first().click({ timeout: 1500 }).catch(() => {});
  for (let i = 0; i < 3; i += 1) {
    if (await p.locator('[role="dialog"]:visible').count().catch(() => 0) === 0) break;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
}
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'));
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
const seasonButton = p => p.locator('button', { hasText: /Next Owner Season|Pick where the budget goes/ }).first();
const TITLES = { squad: 'Sign players', youth: 'Fund the academy', stadium: 'Grow the ground', debt: 'Pay down the debt' };

async function journey(w, h) {
  const tag = `${w}x${h}`;
  console.log(`${tag}`);
  let { ctx, p } = await open(w, h);
  await p.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await settle(p);
  const buy = p.getByRole('button', { name: /Buy a Football Club/ });
  await buy.waitFor({ timeout: 30000 });
  await buy.scrollIntoViewIfNeeded();
  await buy.click();
  const sale = p.locator('[data-testid="owner-club-sale"]');
  await sale.waitFor({ timeout: 20000 });
  const tiles = sale.locator('[data-testid="owner-club-for-sale"]');
  await p.waitForTimeout(700);
  const n = await tiles.count();
  check(n === 6, `${tag}: six clubs for sale at €320M (${n})`);
  check((await sale.innerText()).includes("game's own estimates"), `${tag}: the list says its prices are the game's estimates`);
  const boxes = await tiles.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.width]; }));
  check(boxes.every(([l, r]) => l >= 0 && r <= window_w(w)), `${tag}: every club tile inside the screen`);
  check(await sideways(p) <= 0, `${tag}: no sideways scroll on the list`);
  await shot(p, `${tag}-1-sale`);
  const pickName = (await tiles.nth(1).locator('div').first().innerText()).trim();
  await tiles.nth(1).click();
  const panel = p.locator('[data-testid="owner-panel"]');
  await panel.waitFor({ timeout: 20000 });
  let s = await saved(p);
  check(s?.ownerState?.club === pickName && s.phase === 'owner_season', `${tag}: bought the club picked (${pickName}), the save says ${s?.ownerState?.club}`);
  check(!(await seasonButton(p).isEnabled()), `${tag}: the season waits for the season's call`);
  await shot(p, `${tag}-2-panel`);
  const order = ['squad', 'youth', 'stadium', 'debt'];
  for (let k = 0; k < order.length; k += 1) {
    const plan = order[k];
    const tile = p.locator(`[data-plan="${plan}"]`);
    check(await tile.count() === 1, `${tag}: season ${k + 1} offers ${TITLES[plan]}`);
    /* to the middle of the screen, clear of the fixed action bar, so the click itself needs no scroll */
    await tile.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    const y0 = await p.evaluate(() => scrollY);
    await tile.click();
    await p.waitForTimeout(400);
    const y1 = await p.evaluate(() => scrollY);
    check(Math.abs(y1 - y0) <= 2, `${tag}: picking ${plan} does not move the page (${y0} to ${y1})`);
    check(await tile.getAttribute('aria-pressed') === 'true', `${tag}: ${plan} shows as picked`);
    s = await saved(p);
    check(s?.ownerState?.plan === plan, `${tag}: the call ${plan} is saved`);
    if (plan === 'stadium') {
      ({ ctx, p } = await reload(ctx, p, w, h));
      check(await p.locator(`[data-plan="${plan}"]`).getAttribute('aria-pressed') === 'true', `${tag}: after a reload the call ${plan} is still picked`);
    }
    const before = (await saved(p)).ownerState.seasonResults.length;
    await seasonButton(p).click();
    await p.waitForFunction(n0 => { try { return JSON.parse(localStorage.getItem('soccerCareerSave')).ownerState.seasonResults.length > n0; } catch { return false; } }, before, { timeout: 20000 });
    await p.waitForTimeout(3600); // the last of ten staggered rows starts at 2.36 s (revealDelay)
    s = await saved(p);
    const row = s.ownerState.seasonResults[s.ownerState.seasonResults.length - 1];
    const me = (row.table || []).find(r => r.you);
    check(!!me && me.pos === row.playerPos && row.plan === plan, `${tag}: season ${k + 1} (${plan}) is on the table: ${String(row.result).slice(0, 70)}`);
    const text = await panel.innerText();
    check(text.toLowerCase().includes('final table'), `${tag}: season ${k + 1} shows the final table`);
    /* the table's rows have ticked in: every "N pts" row fully shown, five of them where the league is named */
    const shown = await panel.evaluate(el => [...el.querySelectorAll('span')].filter(x => /^\d+ pts$/.test((x.textContent || '').trim()))
      .filter(x => { for (let n = x, k = 0; n && k < 4; n = n.parentElement, k += 1) if (Number(getComputedStyle(n).opacity) < 0.95) return false; return x.getBoundingClientRect().height > 0; }).length);
    if (row.sizeVerified && row.knownRivals > 0) check(shown >= 5, `${tag}: season ${k + 1}'s table rows are on screen (${shown})`);
    else console.log(`  (season ${k + 1}: a league of unknown size or no named rival, ${shown} rows with points)`);
    check(text.includes(row.result.split(' Income')[0].slice(0, 30)), `${tag}: the panel shows the saved result line`);
    check(await sideways(p) <= 0, `${tag}: no sideways scroll after season ${k + 1}`);
    await shot(p, `${tag}-3-season${k + 1}`);
  }
  const end = JSON.stringify((await saved(p)).ownerState);
  ({ ctx, p } = await reload(ctx, p, w, h));
  check(JSON.stringify((await saved(p)).ownerState) === end, `${tag}: a reload keeps the owner's save as it was`);
  check((await p.locator('[data-testid="owner-panel"]').innerText()).includes(`Season 4`), `${tag}: after the reload the panel is on season 4`);
  const errs = errorsOf.get(p) || [];
  check(errs.length === 0, `${tag}: no page errors (${errs.slice(0, 2).join(' | ')})`);
  await shot(p, `${tag}-4-reloaded`);
  await ctx.close();
}
function window_w(w) { return w + 1; }
async function reload(ctx, p, w, h) {
  await p.reload({ waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.locator('[data-testid="owner-panel"]').waitFor({ timeout: 30000 });
  await p.waitForTimeout(500);
  return { ctx, p };
}

for (const [w, h] of [[390, 844], [1280, 900]]) {
  try { await journey(w, h); } catch (e) { failures += 1; console.error(`  FAIL: ${w}x${h} journey stopped: ${String(e).slice(0, 300)}`); }
}
await browser.close();
console.log(failures ? `walkOwner: ${failures} of ${checks} checks failed` : `walkOwner: green, ${checks} checks`);
process.exit(failures ? 1 : 0);

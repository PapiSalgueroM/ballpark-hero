/**
 * Round 1501 browser walk: Club Manager's difficulty levels on the screens, at 320 by 640, 390 by 844 and 1280 by 900.
 *
 *   (a) The Dugout step's Career options card offers Normal, Hard and Legend with Normal pressed; pressing Legend
 *       and then the No sacking switch moves nothing (scrollY and the document height the same); every tile is at
 *       least 44 px tall and nothing in the card is under 12 px; the page is no wider than the screen. Skip starts
 *       the career: the save holds the level and No sacking, the hub wears the Legend pill beside the No sacking
 *       pill, nothing in the header overlaps, and the header's height is printed beside a Normal career's.
 *   (b) Options shows the level read only (no button in its card) and No sacking on; the Options tile says Legend.
 *   (c) The Managers screen's card names both.
 *   (d) A Normal career started the same way wears no level pill and its save carries no key.
 *
 * The database host is blocked; the page plays on a seeded stream (DIFF_SEED, scripts/lib/pageSeed.mjs).
 * Pictures of each step go to $RC_OUT when it is set; look at them.
 *
 * CONTROL (PLAY_DIFF_CONTROL=nopill) renames the level pill's marker in the SERVED chunk
 * (scripts/lib/servedCodeControl.mjs), never src, and exits 0 only when every pill check aimed at it went red.
 *
 *   #!serve then: node scripts/playCmDifficulty.mjs        WIDTHS=390 PLAY_DIFF_CONTROL=nopill node scripts/playCmDifficulty.mjs
 */
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';
import { pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const CONTROL = process.env.PLAY_DIFF_CONTROL || '';
if (CONTROL && CONTROL !== 'nopill') { console.error(`PLAY_DIFF_CONTROL=${CONTROL} is not a control this walk knows (nopill)`); process.exit(2); }
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.DIFF_SEED); } catch (e) { console.error(`DIFF_SEED: ${e.message}`); process.exit(2); }
const HEIGHTS = { 320: 640, 390: 844, 1280: 900 };
const WIDTHS = (process.env.WIDTHS || '320,390,1280').split(',').map(Number);
console.log(`playCmDifficulty: seed ${SEED} (replay with DIFF_SEED=${SEED}), widths ${WIDTHS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}`);
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};
const KEY = 'dukb-club-manager-save';
const errors = [];
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const pause = (page, ms) => page.waitForTimeout(ms);
const readSave = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { level: c.startOptions?.difficulty ?? null, noSack: c.startOptions?.noSack ?? null, budget: c.budget };
}, KEY).catch(() => null);
const sizes = (page, sel) => page.evaluate(s => {
  let font = Infinity, button = Infinity;
  for (const root of document.querySelectorAll(s)) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (hasText) font = Math.min(font, parseFloat(getComputedStyle(el).fontSize));
      if (el.tagName === 'BUTTON') button = Math.min(button, el.getBoundingClientRect().height);
    }
  }
  return { font, button };
}, sel);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
/** The header row holding the season pill: its height, and whether any two of its children overlap. */
const header = page => page.evaluate(() => {
  const pill = [...document.querySelectorAll('span')].find(e => /· Season \d/.test(e.textContent || ''));
  const row = pill?.parentElement;
  if (!row) return null;
  const boxes = [...row.children].map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5) overlaps += 1;
  }
  return { height: Math.round(row.getBoundingClientRect().height * 10) / 10, overlaps, right: Math.max(...boxes.map(b => b.right)) };
});

const browser = await chromium.launch();
async function newCtx(vp) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, SEED);
  if (CONTROL === 'nopill') await installServedCodeControl(ctx, [{ label: 'pill', find: /"data-cm-level-pill":/g, replace: '"data-cm-level-gone":' }], proof);
  return ctx;
}
/** A fresh start to the club picker: 2026-27, England, the Premier League, Brentford, to the Dugout step. */
async function toDugout(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await pause(page, 800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 700);
  await page.locator('text=England').first().click();
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 700);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(page, 400); }
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  return page;
}
const skip = async page => {
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
};

for (const W of WIDTHS) {
  const vp = { width: W, height: HEIGHTS[W] ?? 900 };
  console.log(`\n== ${vp.width} by ${vp.height}`);

  /* (d) first, so (a) has its header to compare with: a Normal career wears no level pill. */
  const ctxD = await newCtx(vp);
  const pd = await toDugout(ctxD);
  const tilesD = await pd.locator('[data-cm-level-tile]').evaluateAll(els => els.map(e => [e.textContent, e.getAttribute('aria-checked')]));
  say(JSON.stringify(tilesD) === JSON.stringify([['Normal', 'true'], ['Hard', 'false'], ['Legend', 'false']]), `${W}: the Dugout step offers Normal, Hard and Legend with Normal pressed (${JSON.stringify(tilesD)})`);
  await skip(pd);
  const sd = await readSave(pd);
  const normalHeader = await header(pd);
  say(!!sd && sd.level === null && (await pd.locator('[data-cm-level-pill]').count()) === 0, `${W}: a Normal career carries no key and wears no level pill`);
  await pd.close();
  await ctxD.close();

  /* (a) Legend and No sacking on the Dugout step, then Skip. */
  const ctxA = await newCtx(vp);
  const pa = await toDugout(ctxA);
  const legend = pa.locator('[data-cm-level-tile="legend"]');
  await legend.scrollIntoViewIfNeeded().catch(() => {});
  const before = await pa.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
  await legend.click({ timeout: 5000 }).catch(() => {});
  await pause(pa, 250);
  const mid = await pa.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
  await pa.locator('[data-cm-nosack-switch]').click({ timeout: 5000 }).catch(() => {});
  await pause(pa, 250);
  const after = await pa.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
  say((await legend.getAttribute('aria-checked').catch(() => null)) === 'true', `${W}: Legend is pressed`);
  say(before.join() === mid.join() && mid.join() === after.join(), `${W}: pressing Legend and the switch moves nothing (scrollY ${before[0]}, ${mid[0]}, ${after[0]}; height ${before[1]}, ${mid[1]}, ${after[1]})`);
  const s = await sizes(pa, '[data-cm-career-options]');
  say(s.button >= 44 && s.font >= 12, `${W}: the card's shortest button is ${s.button.toFixed(1)} px and its smallest text ${s.font} px`);
  say(await fits(pa), `${W}: the Dugout step is no wider than the screen`);
  await shot(pa, `diff-dugout-${W}.png`);
  await skip(pa);
  say(await pa.locator('button:has-text("Finances")').count() > 0, `${W}: the Legend career is running`);
  const sa = await readSave(pa);
  say(!!sa && sa.level === 'legend' && sa.noSack === 1, `${W}: the save holds Legend and No sacking (${sa && sa.level}, ${sa && sa.noSack})`);
  const pillText = ((await pa.locator('[data-cm-level-pill]').innerText().catch(() => '')) || '').trim();
  say(pillText === 'Legend', `${W}: the hub wears the Legend pill ("${pillText}")`, true);
  say((await pa.locator('[data-cm-nosack-pill]').count()) === 1, `${W}: and the No sacking pill beside it`);
  const hA = await header(pa);
  say(!!hA && hA.overlaps === 0 && hA.right <= W + 1, `${W}: nothing in the header overlaps or runs off the page (${hA && hA.overlaps} overlaps)`);
  console.log(`   ${W}: header ${hA && hA.height} px on Legend with No sacking, ${normalHeader && normalHeader.height} px on Normal`);
  await pa.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(pa, `diff-hub-${W}.png`);

  /* (b) Options: the level read only, No sacking on; the Options tile says Legend. */
  const tile = ((await pa.locator('button', { hasText: 'Currency, nation job, haggling' }).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  say(/Legend/.test(tile), `${W}: the Options tile reads "${tile.slice(0, 60)}"`);
  await pa.locator('button', { hasText: 'Currency, nation job, haggling' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(pa, 800);
  const card = pa.locator('[data-cm-level-option]');
  const cardText = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  say((await card.getAttribute('data-cm-level-option').catch(() => null)) === 'legend' && /Picked when this career began/.test(cardText) && (await card.locator('button').count()) === 0, `${W}: Options shows "${cardText.slice(0, 70)}" with nothing to press`);
  const ns = ((await pa.locator('[data-cm-nosack-option]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  say(/On for this career/.test(ns), `${W}: and No sacking on`);
  await shot(pa, `diff-options-${W}.png`);
  await pa.close();

  /* (c) the Managers screen's card. */
  const pc = await ctxA.newPage();
  pc.on('pageerror', e => errors.push(String(e)));
  await pc.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(pc, 1500);
  await pc.locator('[data-testid="cm-show-slots"]').click({ timeout: 6000 }).catch(() => {});
  await pc.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
  const slot = ((await pc.locator('[data-testid="cm-slot-1"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  say(/Legend/.test(slot) && /No sacking/.test(slot), `${W}: the Managers card reads "${slot.slice(0, 90)}"`);
  await shot(pc, `diff-slots-${W}.png`);
  await pc.close();
  await ctxA.close();
}
await browser.close();
say(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
process.exit(verdict('playCmDifficulty', proof, { minGuarded: WIDTHS.length }));

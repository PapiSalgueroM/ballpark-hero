/**
 * Round 1326 browser proof: the Club Manager Finances desk at the site's floor.
 *
 * simCmCopy section 5 proves the money card's numbers (the cover row is the
 * running costs the board pays, the kitty row is the result plus that cover).
 * This proves the screen a person reads, on the built page in Chromium: a
 * fresh Liverpool career played ten weeks by quick sim, then the hub's
 * Finances tile, at 320 by 640, 390 by 844 and 1280 by 900. At each size:
 *   - the press does not throw the page: scrollY before and after is printed
 *     and the desk's top is on screen once it has opened;
 *   - every piece of text on the four cards is 12 px or more (computed style
 *     of the element holding the text node, never textContent);
 *   - every button on the four cards is at least 44 px tall;
 *   - nothing is cut (an element's scrollWidth over its clientWidth), no card
 *     overlaps the next, and the page never scrolls sideways;
 *   - the cover and kitty rows are there, no "Season result" is left, and the
 *     kitty row is red only when it reads below zero;
 *   - under reduced motion (emulated for the whole walk) no animation runs on
 *     the desk once it has settled.
 * Pictures of the desk are saved per size into $RC_OUT (or a temp folder), to
 * be looked at, and the kitty row's place on the 390 phone is printed.
 *
 * Controls, by page style so no source changes (each asserts its target is on
 * the page before it applies, or the run refuses with exit 2):
 *   CM_FINANCE_CONTROL=small  the cover row at 11 px: the font check FIRES naming it
 *   CM_FINANCE_CONTROL=cut    the kitty label held to 40 px with nowrap: the cut check FIRES
 * Exit 0 green, 1 red or a control that FIRED, 2 could not run, 3 a control that did not fire.
 *
 * The database and the ad hosts are blocked for the whole walk (production is
 * off limits). Serve nothing first: this file starts scripts/lib/hostLikeServer.mjs
 * on dist itself, or uses BASE / SWEEP_BASE when a server is already up.
 *   npm run build && ENGINES=chromium node scripts/playCmFinanceDesk.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4183);
const SUPPLIED = process.env.SWEEP_BASE || process.env.BASE || '';
const BASE = SUPPLIED || `http://127.0.0.1:${PORT}`;
const KEY = 'dukb-club-manager-save';
const CONTROL = process.env.CM_FINANCE_CONTROL || '';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'playCmFinanceDesk-'));
const SIZES = [[320, 640], [390, 844], [1280, 900]];
const WEEKS = 10;
const CARDS = ['data-finance-projection', 'data-pricing-desk', 'data-sponsor-desk', 'data-finance-books'];

if (CONTROL && !['small', 'cut'].includes(CONTROL)) {
  console.log(`playCmFinanceDesk: unknown CM_FINANCE_CONTROL "${CONTROL}" (small or cut). NOTHING WAS CHECKED.`);
  process.exit(2);
}

const found = { font: [], tall: [], cut: [], other: [] };
let failures = 0;
const fail = (kind, m) => { failures += 1; found[kind].push(m); console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok    ' + m);
const refuse = m => { console.log(`playCmFinanceDesk: could not run: ${m}. NOTHING WAS CHECKED.`); process.exit(2); };

let server = null;
async function startServer() {
  if (SUPPLIED) {
    if (!await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) refuse(`nothing answered at ${BASE}`);
    return;
  }
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) refuse('dist/index.html is missing, run npm run build first');
  if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) refuse(`port ${PORT} already answers`);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) return;
    await new Promise(r => setTimeout(r, 200));
  }
  refuse(`the dist server never came up on port ${PORT}`);
}

await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await context.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message ? e.message : e)));

const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const heading = async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
const saved = async () => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, KEY);
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
    await page.waitForTimeout(250);
  }
}

/* ---------- 1. a fresh Liverpool career, ten weeks by quick sim ---------- */
async function playTen() {
  console.log(`1) A fresh Liverpool career, ${WEEKS} weeks by quick sim`);
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom();
  await tap(/2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/Premier League/i);
  const club = page.locator('button').filter({ hasText: /Liverpool/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(/take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/skip: just manage/i);
  await page.waitForTimeout(800);
  const start = await saved();
  if (!start || !/Liverpool/.test(start.clubName || '')) refuse(`no Liverpool save after taking the job (saw ${start ? start.clubName : 'none'})`);
  for (let step = 0; step < 140; step++) {
    const where = await heading();
    if (where === 'FULL TIME') { await tap(/continue|next|carry on|ok/i); await page.waitForTimeout(400); continue; }
    if (where === 'HALF TIME' || where === 'MATCH LIVE') { await tap(/second half|skip|full report/i); await page.waitForTimeout(400); continue; }
    if (((await saved())?.week ?? 0) >= WEEKS) break;
    if (await tapText(/Quick Sim/i)) { await page.waitForTimeout(700); continue; }
    await clearRoom();
    if (await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).then(() => true).catch(() => false)) { await page.waitForTimeout(400); continue; }
    break;
  }
  const s = await saved();
  if ((s?.week ?? 0) < WEEKS) fail('other', `the career reached week ${s?.week ?? 0}, not ${WEEKS}: ${(await text()).slice(0, 120)}`);
  else ok(`${s.clubName}, week ${s.week} on disk, kitty ${Math.round((s.budget ?? 0) * 10) / 10}m`);
}

/* ---------- 2. open the desk from the hub tile at one size ---------- */
async function openDesk(w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const resume = page.getByRole('button', { name: /^Resume Career$/ }).first();
  await resume.waitFor({ timeout: 6000 }).catch(() => {});
  if (await resume.count().catch(() => 0)) { await resume.click({ timeout: 4000 }).catch(() => {}); }
  await page.getByText(/Season 1/i).first().waitFor({ timeout: 10000 }).catch(() => {});
  await clearRoom();
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).catch(() => {});
  const tile = page.locator('button:visible').filter({ hasText: /Finances/ }).filter({ hasText: /projected/ }).first();
  if (await tile.count().catch(() => 0) === 0) { fail('other', `${w}x${h}: no Finances tile on the hub`); return false; }
  await tile.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => window.scrollY);
  await tile.click({ timeout: 4000 });
  await page.locator('[data-finance-projection]').first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => window.scrollY);
  const top = await page.locator('[data-finance-projection]').first().evaluate(el => el.getBoundingClientRect().top).catch(() => null);
  if (top === null) { fail('other', `${w}x${h}: the desk did not open from its tile`); return false; }
  const onScreen = top >= -0.5 && top <= h - 80;
  if (!onScreen) fail('other', `${w}x${h}: the desk's top sits at ${Math.round(top)}px, off the screen (scrollY ${Math.round(before)} to ${Math.round(after)})`);
  else ok(`${w}x${h}: the desk opened with its top at ${Math.round(top)}px (scrollY ${Math.round(before)} to ${Math.round(after)})`);
  return true;
}

/* ---------- 3. the controls, by page style ---------- */
async function applyControl() {
  const target = CONTROL === 'small' ? '[data-projection-total="cover"] td' : '[data-projection-total="kitty"] td:first-child';
  if (await page.locator(target).count().catch(() => 0) === 0) refuse(`control ${CONTROL}: its target ${target} is not on the page`);
  const css = CONTROL === 'small'
    ? `${target} { font-size: 11px !important; }`
    : `${target} { display: block !important; width: 40px !important; max-width: 40px !important; white-space: nowrap !important; overflow: hidden !important; }`;
  await page.addStyleTag({ content: css });
  await page.waitForTimeout(200);
}

/* ---------- 4. the measurements, on the rectangles ---------- */
async function measure(w, h) {
  const r = await page.evaluate(cards => {
    const out = { font: [], tall: [], cut: [], overlap: [], missing: [], texts: 0, buttons: 0 };
    const snip = el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const els = cards.map(a => document.querySelector(`[${a}]`));
    cards.forEach((a, i) => { if (!els[i]) out.missing.push(a); });
    els.forEach((card, i) => {
      if (!card) return;
      const seen = new Set();
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement;
        if (!walker.currentNode.textContent.trim() || seen.has(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        out.texts += 1;
        const px = parseFloat(cs.fontSize);
        if (px < 11.99) out.font.push(`${cards[i]}: "${snip(el)}" at ${px}px`);
      }
      for (const b of card.querySelectorAll('button')) {
        out.buttons += 1;
        const bh = b.getBoundingClientRect().height;
        if (bh < 43.5) out.tall.push(`${cards[i]}: button "${snip(b)}" ${bh.toFixed(1)}px tall`);
      }
      for (const el of [card, ...card.querySelectorAll('*')]) {
        if (getComputedStyle(el).display === 'inline' || el.clientWidth === 0) continue;
        if (el.scrollWidth > el.clientWidth + 1) out.cut.push(`${cards[i]}: "${snip(el)}" scrollWidth ${el.scrollWidth} over clientWidth ${el.clientWidth}`);
      }
    });
    for (let i = 1; i < els.length; i++) {
      if (!els[i - 1] || !els[i]) continue;
      const a = els[i - 1].getBoundingClientRect(), b = els[i].getBoundingClientRect();
      if (a.bottom > b.top + 0.5) out.overlap.push(`${cards[i - 1]} ends at ${a.bottom.toFixed(1)}, under ${cards[i]} starting at ${b.top.toFixed(1)}`);
    }
    out.side = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const row = name => {
      const tr = document.querySelector(`[data-projection-total="${name}"]`);
      if (!tr) return null;
      const box = tr.getBoundingClientRect();
      return { cells: [...tr.querySelectorAll('td')].map(td => ({ text: td.textContent.trim(), cls: td.className })), y: Math.round(box.top + window.scrollY), vy: Math.round(box.top) };
    };
    out.cover = row('cover');
    out.kitty = row('kitty');
    out.result = row('result');
    out.seasonResult = /Season result/.test(document.querySelector('[data-finance-projection]')?.textContent || '');
    const desk = document.querySelector('[data-finance-projection]')?.parentElement;
    out.anims = desk ? desk.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length : -1;
    return out;
  }, CARDS);
  const at = `${w}x${h}`;
  for (const m of r.missing) fail('other', `${at}: the card [${m}] is not on the desk`);
  for (const m of r.font) fail('font', `${at}: text under 12px, ${m}`);
  for (const m of r.tall) fail('tall', `${at}: ${m}`);
  for (const m of r.cut) fail('cut', `${at}: cut text, ${m}`);
  for (const m of r.overlap) fail('other', `${at}: cards overlap, ${m}`);
  if (r.side > 2) fail('other', `${at}: the page scrolls sideways by ${r.side}px`);
  if (r.seasonResult) fail('other', `${at}: the desk still prints "Season result"`);
  if (!r.cover) fail('other', `${at}: no "Board covers running costs" row`);
  if (!r.kitty) fail('other', `${at}: no "Kitty change" row`);
  else {
    for (const c of r.kitty.cells.slice(1)) {
      const neg = /^-/.test(c.text);
      const red = /text-red-400/.test(c.cls), green = /text-emerald-400/.test(c.cls);
      if (neg ? !red : !green) fail('other', `${at}: the kitty figure ${c.text} is coloured "${c.cls}"`);
    }
  }
  if (r.anims !== 0) fail('other', `${at}: ${r.anims} animation(s) running on the desk under reduced motion`);
  const k = r.kitty || r.result;
  console.log(`  ${at}: ${r.texts} text holders, ${r.buttons} buttons measured; ${r.kitty ? 'kitty' : 'result'} row at y ${k ? k.y : '?'} (on screen at ${k ? k.vy : '?'})` +
    (r.kitty ? `, reads ${r.kitty.cells.map(c => c.text).join(' | ')}; cover ${r.cover ? r.cover.cells.map(c => c.text).join(' | ') : '?'}` : ''));
  await page.screenshot({ path: path.join(OUT, `finance-view-${w}.png`) }).catch(() => {});
  await page.locator('[data-finance-projection]').first().locator('..').screenshot({ path: path.join(OUT, `finance-desk-${w}.png`) }).catch(() => {});
}

/* A picture of the "?" open at its money paragraph, to be read beside the new
   rows (the help is not edited this round; nothing is asserted on it). */
async function helpPicture() {
  if (!await tap(/^How to play$/i)) return;
  const para = page.getByText(/The club earns while you manage/).first();
  await para.waitFor({ timeout: 5000 }).catch(() => {});
  await para.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'finance-help-390.png') }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
}

try {
  await playTen();
  for (const [w, h] of SIZES) {
    console.log(`2) The desk at ${w} by ${h}`);
    if (!await openDesk(w, h)) continue;
    if (CONTROL) await applyControl();
    await measure(w, h);
    if (w === 390 && !CONTROL) await helpPicture();
  }
} catch (e) {
  fail('other', `the walk threw: ${e && e.message ? e.message.split('\n')[0] : e}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
const real = pageErrors.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED|NetworkError/i.test(e));
if (real.length) fail('other', `page errors on the walk: ${real[0]}`);
console.log(`  pictures in ${OUT}`);
console.log('');
if (CONTROL) {
  const fired = CONTROL === 'small'
    ? found.font.some(m => /Board covers running costs/.test(m))
    : found.cut.some(m => /Kitty change/.test(m));
  if (fired) {
    console.log(`playCmFinanceDesk: CONTROL ${CONTROL} FIRED (${failures} failures, as it must)`);
    process.exit(1);
  }
  console.log(`playCmFinanceDesk: CONTROL ${CONTROL} DID NOT FIRE (${failures} failures, none of them the one it plants)`);
  process.exit(3);
}
if (failures > 0) {
  console.log(`playCmFinanceDesk: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playCmFinanceDesk: green. The Finances desk reads at 12px, taps at 44px, cuts nothing and shows what the board covers and what the kitty keeps, at 320, 390 and 1280.');

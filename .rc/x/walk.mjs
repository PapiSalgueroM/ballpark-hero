// Reviewer walk for Round 1549: play the five Higher or Lower pages the way a player does, at 390x844 and 1280x900,
// reduced motion on and off, and record what every revealed card says. Supabase is blocked. Screenshots go to RC_OUT.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || './walk-out';
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['/nfl-higher-lower', '/nba-higher-lower', '/f1-higher-lower', '/tennis-higher-lower', '/hockey-higher-lower'];
const COMBOS = [
  { w: 390, h: 844, motion: 'reduce', full: true },
  { w: 1280, h: 900, motion: 'no-preference', full: true },
  { w: 390, h: 844, motion: 'no-preference', full: false },
  { w: 1280, h: 900, motion: 'reduce', full: false },
];
const problems = [];
const cards = [];
const say = (m) => { console.log(m); };
const problem = (m) => { problems.push(m); console.log('PROBLEM ' + m); };

async function clearOverlays(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 4; i++) {
    const open = page.locator('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    if ((await open.count().catch(() => 0)) === 0) break;
    const closer = open.first().getByRole('button', { name: /^(close|got it|start|play|ok|done|let's go)/i });
    if ((await closer.count().catch(() => 0)) > 0) await closer.first().click({ timeout: 1500 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
}

// What the two revealed cards say, and whether anything spills out of its card or off the page.
async function readReveal(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('div.grid.grid-cols-2 > button')].slice(0, 2);
    const docW = document.documentElement.scrollWidth, winW = window.innerWidth;
    return {
      hscroll: docW > winW + 1 ? `${docW} > ${winW}` : null,
      cards: btns.map((b) => {
        const r = b.getBoundingClientRect();
        const spans = [...b.querySelectorAll('span')];
        const thr = spans.find((s) => /^(through |season not confirmed)/.test(s.textContent.trim()) && s.children.length === 0);
        const tr = thr ? thr.getBoundingClientRect() : null;
        const spill = spans.filter((s) => { const q = s.getBoundingClientRect(); return q.width > 0 && (q.left < r.left - 1 || q.right > r.right + 1); }).map((s) => s.textContent.trim().slice(0, 40));
        const anim = thr ? getComputedStyle(thr.parentElement).animationName : null;
        return { text: b.innerText.replace(/\s+/g, ' ').trim(), through: thr ? thr.textContent.trim() : null, throughBox: tr ? [Math.round(tr.left - r.left), Math.round(tr.top - r.top), Math.round(tr.width), Math.round(tr.height)] : null, cardW: Math.round(r.width), cardH: Math.round(r.height), spill, overflowX: b.scrollWidth > b.clientWidth + 1, anim, fontPx: thr ? getComputedStyle(thr).fontSize : null };
      }),
    };
  });
}

async function walk(browser, route, c) {
  const tag = `${route.slice(1)}-${c.w}-${c.motion === 'reduce' ? 'rm' : 'mo'}`;
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.motion, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, (r) => r.abort());
  await page.route(/googlesyndication|googletagmanager|google-analytics|doubleclick/, (r) => r.abort());
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await clearOverlays(page);
  await page.screenshot({ path: path.join(OUT, `${tag}-0-start.png`) });
  const rounds = c.full ? 10 : 1;
  for (let r = 0; r < rounds; r++) {
    const btn = page.locator('div.grid.grid-cols-2 > button').first();
    if ((await btn.count()) === 0) { problem(`${tag}: no card to press in round ${r + 1}`); break; }
    await btn.click({ timeout: 4000 }).catch((e) => problem(`${tag}: click failed in round ${r + 1}: ${String(e).slice(0, 100)}`));
    await page.waitForTimeout(c.motion === 'reduce' ? 150 : 450);
    const rv = await readReveal(page);
    if (rv.hscroll) problem(`${tag}: horizontal page scroll ${rv.hscroll}`);
    for (const k of rv.cards) {
      cards.push({ tag, round: r + 1, ...k });
      if (!k.through) problem(`${tag} round ${r + 1}: a revealed card has no through line: ${k.text}`);
      if (/played until/i.test(k.text)) problem(`${tag}: "played until" on a card: ${k.text}`);
      if (k.spill.length || k.overflowX) problem(`${tag} round ${r + 1}: text spills out of its card: ${k.spill.join(' | ')}`);
      if (c.motion === 'reduce' && k.anim && k.anim !== 'none') problem(`${tag}: reveal animates (${k.anim}) under reduced motion`);
    }
    if (r === 0 || r === rounds - 1) await page.screenshot({ path: path.join(OUT, `${tag}-r${r + 1}-reveal.png`), fullPage: false });
    await page.waitForTimeout(2600);
  }
  if (c.full) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `${tag}-end.png`), fullPage: true });
  }
  if (errs.length) problem(`${tag}: page errors: ${errs.join(' / ')}`);
  await ctx.close();
}

const browser = await chromium.launch();
for (const route of ROUTES) for (const c of COMBOS) {
  try { await walk(browser, route, c); } catch (e) { problem(`${route} ${c.w} ${c.motion}: walk threw ${String(e).slice(0, 160)}`); }
}
// A daily save made part way through must resume after a reload (the save the base writes is the same bytes: hooks untouched).
for (const route of ['/f1-higher-lower', '/nfl-higher-lower']) {
  const tag = `${route.slice(1)}-resume`;
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, (r) => r.abort());
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200); await clearOverlays(page);
    for (let r = 0; r < 3; r++) { await page.locator('div.grid.grid-cols-2 > button').first().click({ timeout: 4000 }); await page.waitForTimeout(2700); }
    const before = await page.locator('text=/Round:/').first().innerText().catch(() => '');
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => /-hl-daily-/.test(k)).map((k) => k + '=' + localStorage.getItem(k).slice(0, 160)));
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); await clearOverlays(page);
    const after = await page.locator('text=/Round:/').first().innerText().catch(() => '');
    say(`${tag}: before reload "${before}", after "${after}", save ${keys.join(' ; ')}`);
    if (!/4\s*\/\s*10/.test(after)) problem(`${tag}: after reload the page shows "${after}", not round 4 of 10`);
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    await ctx.close();
  } catch (e) { problem(`${tag}: threw ${String(e).slice(0, 160)}`); }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'cards.json'), JSON.stringify({ problems, cards }, null, 1));
const withThrough = cards.filter((k) => k.through).length;
say(`walk: ${cards.length} revealed cards read, ${withThrough} with a through line, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);

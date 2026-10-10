/* Reviewer's walk of Round 1112 (never committed). BASE from the environment, the live database blocked,
   390x844 and 1280x900, reduced motion on and off, screenshots into RC_OUT.
   PART=fresh|cards|tile|pages (all when unset). */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pw = (await import(pathToFileURL(path.join(process.cwd(), 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(process.cwd(), '.tmp-fx', 'rv-shots');
mkdirSync(OUT, { recursive: true });
const PART = process.env.PART || 'all';
const SEASONS = Number(process.env.SEASONS || 7);
const ROUTE = '/nba-my-career';
const KEY = 'nba-my-career-save-v1';
const SAVES = JSON.parse(readFileSync(path.join(HERE, 'rv-saves.json'), 'utf8'));
const report = { fresh: [], cards: [], tile: [], pages: [], fails: [] };
let checks = 0; let failed = 0;
function say(ok, msg) { checks++; if (ok) console.log(`  ok   ${msg}`); else { failed++; report.fails.push(msg); console.log(`  FAIL ${msg}`); } }
const note = msg => console.log(`  note ${msg}`);
/* Viewport only (the page under the game is a long guide, a full page shot is 800 KB and unreadable). */
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }).catch(e => note(`screenshot ${name} failed: ${e}`)); };
/* The element itself, scrolled into view first, plus the viewport around it. */
const elShot = async (page, sel, name) => {
  const el = page.locator(sel).first();
  if (!(await el.count())) { note(`no ${sel} to shoot for ${name}`); return; }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(150);
  await el.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(e => note(`element shot ${name} failed: ${e}`));
};

const browser = await chromium.launch();
async function open(width, height, reduced, enter = true) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const seen = { errors: [], reached: 0 };
  page.on('pageerror', e => seen.errors.push(String(e)));
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) seen.reached++; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  if (enter) {
    await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
    await page.locator('button:has-text("Enter the draft")').click();
    await page.waitForTimeout(900);
  }
  return { ctx, page, seen, tag: `${width}${reduced ? 'r' : 'm'}`, label: `${width} wide${reduced ? ', reduced motion' : ', motion on'}`, reduced };
}
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const saveOf = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
/* Animations still running with a real duration: under reduced motion there should be none that move anything. */
const running = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => { const t = a.effect?.getComputedTiming?.() ?? {}; return { name: a.animationName ?? a.transitionProperty ?? a.constructor.name, ms: Number(t.duration) || 0, iter: String(t.iterations) }; }).filter(a => a.ms > 80));
/* Every element inside `sel` whose text is cut off by its own box. */
const cutOff = (page, sel) => page.evaluate(s => { const root = document.querySelector(s); if (!root) return ['(not found)']; const out = []; for (const el of root.querySelectorAll('*')) { if (el.children.length === 0 && (el.textContent ?? '').trim() && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push(`${(el.textContent ?? '').trim().slice(0, 60)} (${el.scrollWidth}>${el.clientWidth})`); } return out; }, sel);
const overflowing = (page, sel) => page.evaluate(s => { const root = document.querySelector(s); if (!root) return ['(not found)']; const box = root.getBoundingClientRect(); const out = []; for (const el of root.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > box.right + 1 || r.left < box.left - 1) && (el.textContent ?? '').trim()) out.push(`${(el.textContent ?? '').trim().slice(0, 50)} (${Math.round(r.left)}..${Math.round(r.right)} outside ${Math.round(box.left)}..${Math.round(box.right)})`); } return out.slice(0, 4); }, sel);

/* One move the way a player would make it. Returns what it did, and the rivalry card it met (text) if any. */
async function step(page, onRivalry) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) { if (onRivalry) await onRivalry(); return lastIn('[data-rivalry-event]'); }
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  if (await page.locator('[data-fa-window]').count()) return firstIn('[data-fa-window]');
  const hubBack = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hubBack.count()) { await hubBack.first().click(); return true; }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  return false;
}
async function toHub(page, what, onRivalry) {
  for (let i = 0; i < 45; i++) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count()) && !(await page.locator('[data-rivalry-event]').count())) return true;
    if (!(await step(page, onRivalry))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  say(false, `${what}: the walk got back to the hub (lost on "${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 140)}")`);
  return false;
}
async function inject(page, c) {
  const wrote = await page.evaluate(([key, cc]) => { const s = JSON.parse(localStorage.getItem(key) ?? 'null'); if (!s) return false; s.c = cc; s.phase = 'season'; localStorage.setItem(key, JSON.stringify(s)); return true; }, [KEY, c]);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1300);
  return wrote;
}
async function close(w, what) {
  const real = w.seen.errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${what}: no page errors (${real[0] ?? 'clean'})`);
  say(w.seen.reached === 0, `${what}: no request to the live database finished (${w.seen.reached})`);
  await w.ctx.close();
}
const LINE = /^(\d+\.\d) ppg, (\d+\.\d) rpg, (\d+\.\d) apg$/;
const HIS = /went (\d+\.\d) ppg, (\d+\.\d) rpg, (\d+\.\d) apg/;
const score = x => Number(x[1]) * 1.6 + Number(x[2]) * 1.4 + Number(x[3]) * 1.7;
export { browser, open, playButton, sideways, saveOf, running, cutOff, overflowing, step, toHub, inject, close, LINE, HIS, score, say, note, shot, elShot, report, SAVES, PART, SEASONS, OUT, BASE, KEY, ROUTE };
export const tally = () => ({ checks, failed });

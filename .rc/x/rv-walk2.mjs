/* rv-walk2.mjs (review scratch, never committed). The second half of the reviewer's walk of /nba-my-career: a
   star's season card, the longest card, the Career Log, the Trophy Case, the "?", a save built by the base's
   code, and two retirements. Blocks the live database. It judges nothing: I look at what it saves. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.tmp-fx/rv-shots';
mkdirSync(OUT, { recursive: true });
const ROUTE = '/nba-my-career';
const KEY = 'nba-my-career-save-v1';
const here = name => new URL(`./${name}`, import.meta.url);
const SAVES = JSON.parse(readFileSync(here('rv-retired.json'), 'utf8'));
const OLD = JSON.parse(readFileSync(here('rv-oldsaves.json'), 'utf8'));
const report = { configs: [] };
const browser = await chromium.launch();

const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
const reveal = page => page.locator('[data-season-reveal]');
async function step(page) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await reveal(page).count()) return lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) return lastIn('[data-rivalry-event]');
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  if (await page.locator('[data-fa-window]').count()) return firstIn('[data-fa-window]');
  const hubBack = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hubBack.count()) { await hubBack.first().click(); return true; }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  return false;
}
async function toHub(page) {
  for (let i = 0; i < 40; i++) {
    if (await playButton(page).count() && !(await reveal(page).count())) return true;
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  return false;
}
/* Play one season from wherever the board stands: answer what is in the way, press play, stop at the curtain. */
async function playSeason(page, settle) {
  for (let i = 0; i < 40; i++) {
    if (await reveal(page).count()) { await page.waitForTimeout(settle); return true; }
    if (await playButton(page).count()) { await playButton(page).first().click(); await page.waitForTimeout(700); continue; }
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  return false;
}
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const cutOff = (page, root) => page.evaluate(sel => {
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    if (el.children.length) continue;
    const t = (el.textContent ?? '').trim(); if (!t) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const cut = el.scrollWidth > el.clientWidth + 1;
    const off = r.right > window.innerWidth + 1 || r.left < -1;
    if (cut || off) out.push({ text: t.slice(0, 80), cut, off, need: el.scrollWidth, room: el.clientWidth });
  }
  return out.slice(0, 10);
}, root);
const tile = (page, name) => page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(name, 'i') }).first();
async function writeSave(page, save) {
  await page.evaluate(([key, s]) => localStorage.setItem(key, JSON.stringify(s)), [KEY, save]);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1300);
}
const lines = async loc => (await loc.innerText()).split('\n').map(s => s.trim()).filter(Boolean);

for (const [width, height, reduced] of [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]]) {
  const tag = `${width}${reduced ? 'r' : 'm'}`;
  const R = { tag, errors: [], console: [], reached: 0, notes: {} };
  report.configs.push(R);
  const jpg = name => path.join(OUT, `${name}-${tag}.jpg`);
  const view = async (page, name) => { try { await page.screenshot({ path: jpg(name), type: 'jpeg', quality: 74 }); } catch (e) { R.errors.push(`shot ${name}: ${String(e).slice(0, 120)}`); } };
  const top = async (page, name, tall = 1500) => { try { const h = await page.evaluate(() => document.documentElement.scrollHeight); await page.screenshot({ path: jpg(name), type: 'jpeg', quality: 74, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(tall, h) } }); } catch (e) { R.errors.push(`shot ${name}: ${String(e).slice(0, 120)}`); } };
  const part = async (loc, name) => { try { await loc.screenshot({ path: jpg(name), type: 'jpeg', quality: 76 }); } catch (e) { R.errors.push(`shot ${name}: ${String(e).slice(0, 120)}`); } };
  const settle = reduced ? 1500 : 7000;
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', e => R.errors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED|net::/i.test(m.text())) R.console.push(m.text().slice(0, 300)); });
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) R.reached++; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  const stage = async (name, fn) => { try { await fn(); } catch (e) { R.errors.push(`${name}: ${String(e).slice(0, 300)}`); await top(page, `99-${name}`); } };
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(400); }

  await stage('star', async () => {
    await writeSave(page, { c: SAVES.star.save, phase: 'season', teamQuality: SAVES.star.tq, coach: null });
    R.notes.starPlayed = await playSeason(page, settle);
    await part(reveal(page), '08-reveal-star');
    R.notes.revealStar = await lines(reveal(page));
    await toHub(page);
    await top(page, '08b-hub-star', 1300);
    R.notes.hubStarCut = await cutOff(page, 'main *'); R.notes.hubStarSideways = await sideways(page);
  });
  await stage('boosted', async () => {
    const boosted = JSON.parse(JSON.stringify(SAVES.star.save)); Object.assign(boosted, { ovr: 97, pot: 99, morale: 95, fanbase: 97, health: 100, role: 'starter' });
    await writeSave(page, { c: boosted, phase: 'season', teamQuality: 93, coach: null });
    R.notes.boostedPlayed = await playSeason(page, reduced ? 1500 : 9000);
    await part(reveal(page), '09-reveal-boosted');
    await view(page, '09b-reveal-boosted-view');
    R.notes.revealBoosted = await lines(reveal(page));
    R.notes.revealBoostedCut = await cutOff(page, '[data-season-reveal] *'); R.notes.revealBoostedSideways = await sideways(page);
    const box = await reveal(page).boundingBox(); R.notes.revealBox = box ? { left: Math.round(box.x), right: Math.round(box.x + box.width), height: Math.round(box.height) } : null;
    await toHub(page);
    await top(page, '10-hub-boosted', 1300);
    R.notes.hubBoosted = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 420);
    if (await tile(page, 'Career Log').count()) { await tile(page, 'Career Log').click(); await page.waitForTimeout(800); await top(page, '11-log', 1500); R.notes.log = (await lines(page.locator('main'))).slice(0, 40); R.notes.logCut = await cutOff(page, 'main *'); R.notes.logSideways = await sideways(page); await step(page); await page.waitForTimeout(500); }
    if (await tile(page, 'Trophy Case').count()) { await tile(page, 'Trophy Case').click(); await page.waitForTimeout(800); await top(page, '12-case', 1700); R.notes.badges = await page.locator('[data-career-badge]').evaluateAll(els => els.map(e => `${e.getAttribute('data-earned')}:${(e.textContent ?? '').slice(0, 60)}`)); R.notes.caseCut = await cutOff(page, '[data-career-badge] *'); R.notes.caseSideways = await sideways(page); await step(page); await page.waitForTimeout(500); }
  });
  await stage('help', async () => {
    const help = page.locator('button[aria-label="How to play"]').first();
    await help.click(); await page.waitForTimeout(900); await view(page, '13-help');
    for (const [name, text] of [['14-help-mvp', 'MVP only goes to'], ['15-help-example', 'An MVP case by the numbers']]) {
      const el = page.getByText(text, { exact: false }).first();
      if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(350); await view(page, name); }
    }
    R.notes.helpRules = (await lines(page.locator('[role="dialog"]').first())).filter(s => /MVP|65 games|All-Star|All-Rookie|Most Improved|lead the league|season card|badges|Hall of Fame|Example/.test(s)).slice(0, 18);
    R.notes.helpCut = await cutOff(page, '[role="dialog"] *'); R.notes.helpSideways = await sideways(page);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  });
  await stage('old', async () => {
    await writeSave(page, { c: OLD.mid.save, phase: 'season', teamQuality: OLD.mid.tq, coach: null });
    await toHub(page);
    await top(page, '16-old-hub', 1100);
    if (await tile(page, 'Career Log').count()) { await tile(page, 'Career Log').click(); await page.waitForTimeout(800); await top(page, '17-old-log', 1400); const txt = await page.locator('main').innerText(); R.notes.oldLinesAllPrinted = OLD.mid.lines.every(l => txt.includes(l)); R.notes.oldLinesWanted = OLD.mid.lines; await step(page); await page.waitForTimeout(500); }
    R.notes.oldPlayed = await playSeason(page, settle);
    await part(reveal(page), '18-old-reveal');
    R.notes.oldReveal = await lines(reveal(page));
    await toHub(page);
    if (await tile(page, 'Career Log').count()) { await tile(page, 'Career Log').click(); await page.waitForTimeout(800); await top(page, '19-old-log-after', 1400); const txt = await page.locator('main').innerText(); R.notes.oldLinesStillPrinted = OLD.mid.lines.every(l => txt.includes(l)); R.notes.oldLogAfter = txt.split('\n').map(s => s.trim()).filter(s => / ppg/.test(s)).slice(0, 12); await step(page); await page.waitForTimeout(500); }
    const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
    R.notes.oldSeasonsUntouched = OLD.mid.save.seasons.every((x, i) => JSON.stringify(after?.c?.seasons?.[i]) === JSON.stringify(x));
    R.notes.oldSeasonsNow = after?.c?.seasons?.length;
  });
  await stage('retired', async () => {
    await writeSave(page, { c: SAVES.retired.save, phase: 'retired', teamQuality: SAVES.retired.tq, coach: null });
    await page.waitForTimeout(reduced ? 3000 : 10000);
    await top(page, '20-retired', 1900);
    const body = await page.locator('main').innerText();
    R.notes.retired = { weighs: await page.locator('[data-hall-weighs]').first().innerText().catch(() => null), pointsLines: body.split('\n').map(s => s.trim()).filter(s => /points/.test(s)).slice(0, 6), expectReal: SAVES.retired.expect.realPts, expectPrinted: SAVES.retired.expect.printedTotal };
    const hw = page.locator('[data-hall-weighs]').first();
    if (await hw.count()) { await hw.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(500); await view(page, '21-retired-hall'); }
    R.notes.retiredCut = await cutOff(page, 'main *'); R.notes.retiredSideways = await sideways(page);
  });
  await stage('oldretired', async () => {
    await writeSave(page, { c: OLD.retired.save, phase: 'retired', teamQuality: OLD.retired.tq, coach: null });
    await page.waitForTimeout(reduced ? 3000 : 10000);
    await top(page, '22-old-retired', 1900);
    const body = await page.locator('main').innerText();
    R.notes.oldRetired = { weighs: await page.locator('[data-hall-weighs]').first().innerText().catch(() => null), verdictShown: body.includes(OLD.retired.legacy.verdict), bulletsShown: OLD.retired.legacy.bullets.every(b => body.includes(b)), scoreWanted: OLD.retired.legacy.score, bullets: OLD.retired.legacy.bullets };
  });
  await ctx.close();
  console.log(`${tag}: errors ${R.errors.length}, console errors ${R.console.length}, live database requests finished ${R.reached}`);
}
await browser.close();
writeFileSync(path.join(OUT, 'rv-walk2.json'), JSON.stringify(report, null, 1));
console.log(`rv-walk2: ${report.configs.length} configurations walked, ${report.configs.reduce((n, c) => n + c.errors.length, 0)} errors noted`);

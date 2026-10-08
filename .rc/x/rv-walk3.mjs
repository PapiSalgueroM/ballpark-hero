/* rv-walk3.mjs (review scratch, never committed). The third part of the reviewer's walk of /nba-my-career: the
   two retirement cards (a career on the new line, a career built by the base's code), the Career Log's season
   review for an old line and a new line, one season played on an old save, and the Trophy Case.
   Blocks the live database. It judges nothing: I look at what it saves. */
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
const named = (page, re) => page.locator('main button', { hasText: re });
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
  for (const re of [/^\s*Back to seasons\s*$/, /^\s*Back to career\s*$/, /^\s*Hub\s*$/]) {
    const b = named(page, re); if (await b.count()) { await b.first().click(); return true; }
  }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  const cont = named(page, /^\s*Continue\s*$/); if (await cont.count()) { await cont.first().click(); return true; }
  return false;
}
async function toHub(page) {
  for (let i = 0; i < 40; i++) {
    if (await playButton(page).count() && !(await reveal(page).count())) return true;
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  return false;
}
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
  const part = async (loc, name) => { try { await loc.screenshot({ path: jpg(name), type: 'jpeg', quality: 76, timeout: 8000 }); } catch (e) { R.errors.push(`shot ${name}: ${String(e).slice(0, 120)}`); } };
  const settle = reduced ? 1500 : 7000;
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(9000);
  page.on('pageerror', e => R.errors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED|net::/i.test(m.text())) R.console.push(m.text().slice(0, 300)); });
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) R.reached++; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  const stage = async (name, fn) => { try { await fn(); } catch (e) { R.errors.push(`${name}: ${String(e).slice(0, 300)}`); await view(page, `99-${name}`); } };
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(400); }

  /* A retirement: answer whatever card stands in front of it, then read the legacy bullets and the Hall card. */
  const retirement = async (key, save, tq, shot) => {
    await writeSave(page, { c: save, phase: 'retired', teamQuality: tq, coach: null });
    const opener = page.locator('[data-career-review-opener]');
    for (let i = 0; i < 14 && !(await opener.count()); i++) { if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(600); }
    await page.waitForTimeout(reduced ? 2500 : 11000);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await view(page, `${shot}-top`);
    const hw = page.locator('[data-hall-weighs]').first();
    const body = await page.locator('main').innerText();
    const N = { reachedRetirement: (await opener.count()) > 0, weighs: (await hw.count()) ? await hw.innerText() : null,
      pointsLines: body.split('\n').map(s => s.trim()).filter(s => /[0-9],[0-9]{3} points/.test(s)).slice(0, 6),
      hallLines: body.split('\n').map(s => s.trim()).filter(s => /Hall of Fame|ballot|inducted|voters|legacy/i.test(s)).slice(0, 10) };
    if (await hw.count()) { await hw.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(500); await view(page, `${shot}-hall`); }
    N.cut = await cutOff(page, 'main *'); N.sideways = await sideways(page);
    R.notes[key] = N;
    return body;
  };
  await stage('retired', async () => {
    await retirement('retired', SAVES.retired.save, SAVES.retired.tq, '20');
    Object.assign(R.notes.retired, { realPts: SAVES.retired.expect.realPts, printedTotalExpected: SAVES.retired.expect.printedTotal });
  });
  await stage('oldretired', async () => {
    const body = await retirement('oldRetired', OLD.retired.save, OLD.retired.tq, '22');
    Object.assign(R.notes.oldRetired, { verdictShown: body.includes(OLD.retired.legacy.verdict), bulletsShown: OLD.retired.legacy.bullets.map(b => body.includes(b)), verdictWanted: OLD.retired.legacy.verdict, hallWanted: OLD.retired.hall ?? null });
  });
  await stage('old', async () => {
    await writeSave(page, { c: OLD.mid.save, phase: 'season', teamQuality: OLD.mid.tq, coach: null });
    await toHub(page);
    const lastYear = OLD.mid.save.seasons[OLD.mid.save.seasons.length - 1].year;
    const openYear = async (year, shot, key) => {
      await tile(page, 'Career Log').click(); await page.waitForTimeout(700);
      await page.locator('main button', { hasText: new RegExp(`^\\s*${year}`) }).first().click(); await page.waitForTimeout(900);
      const rev = page.locator('[data-season-review]').first();
      await part(rev, shot); R.notes[key] = await lines(rev);
      R.notes[`${key}Cut`] = await cutOff(page, '[data-season-review] *');
      await toHub(page);
    };
    await openYear(lastYear, '17-old-review', 'oldReview');
    R.notes.oldPlayed = await playSeason(page, settle);
    await part(reveal(page), '18-old-reveal'); R.notes.oldReveal = await lines(reveal(page));
    await toHub(page);
    await view(page, '18b-old-hub-after');
    R.notes.hubAfter = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 520);
    await openYear(lastYear + 1, '19-new-review', 'newReview');
    await openYear(lastYear, '19b-old-review-after', 'oldReviewAfter');
    const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
    R.notes.oldSeasonsUntouched = OLD.mid.save.seasons.every((x, i) => JSON.stringify(after?.c?.seasons?.[i]) === JSON.stringify(x));
    R.notes.newSeason = after?.c?.seasons?.[OLD.mid.save.seasons.length] ?? null;
  });
  await stage('case', async () => {
    const boosted = JSON.parse(JSON.stringify(SAVES.star.save)); Object.assign(boosted, { ovr: 97, pot: 99, morale: 95, fanbase: 97, health: 100, role: 'starter' });
    await writeSave(page, { c: boosted, phase: 'season', teamQuality: 93, coach: null });
    R.notes.casePlayed = await playSeason(page, reduced ? 1200 : 5000);
    R.notes.caseReveal = await lines(reveal(page));
    await toHub(page);
    await tile(page, 'Trophy Case').click(); await page.waitForTimeout(900);
    await view(page, '12-case');
    const badges = page.locator('[data-career-badge]');
    R.notes.badgeCount = await badges.count();
    R.notes.badgesEarned = await badges.evaluateAll(els => els.filter(e => e.getAttribute('data-earned') === 'true').map(e => e.textContent.trim().slice(0, 60)));
    R.notes.badgeAllStar = await badges.evaluateAll(els => els.filter(e => /All-Star/.test(e.textContent)).map(e => `${e.getAttribute('data-career-badge')}|${e.getAttribute('data-earned')}|${e.textContent.trim().slice(0, 70)}`));
    const star = page.locator('[data-career-badge="all_star"]').first();
    if (await star.count()) { await star.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(400); await view(page, '12b-case-allstar'); }
    R.notes.caseCut = await cutOff(page, '[data-career-badge] *'); R.notes.caseSideways = await sideways(page);
  });
  await ctx.close();
  console.log(`${tag}: errors ${R.errors.length}, console errors ${R.console.length}, live database requests finished ${R.reached}`);
}
await browser.close();
writeFileSync(path.join(OUT, 'rv-walk3.json'), JSON.stringify(report, null, 1));
console.log(`rv-walk3: ${report.configs.length} configurations walked, ${report.configs.reduce((n, c) => n + c.errors.length, 0)} errors noted`);

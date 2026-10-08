/* rv-walk.mjs (review scratch, never committed). The reviewer's own walk of /nba-my-career on the runner.
   Reads BASE and RC_OUT from the environment, blocks the live database, walks at 390x844 and 1280x900 with
   reduced motion off and on, saves screenshots and one JSON of what it read. It judges nothing: I look. */
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
const ONLY = (process.env.RV_ONLY || '').split(',').filter(Boolean);
const report = { configs: [] };
const browser = await chromium.launch();

const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
async function step(page) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return lastIn('[data-season-reveal]');
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
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  return false;
}
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
/* Every element whose own text is wider than its box, or that pokes out of the viewport. */
const cutOff = page => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('main *, [role="dialog"] *')) {
    if (el.children.length) continue;
    const t = (el.textContent ?? '').trim(); if (!t) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const cut = el.scrollWidth > el.clientWidth + 1;
    const off = r.right > window.innerWidth + 1 || r.left < -1;
    if (cut || off) out.push({ text: t.slice(0, 90), cut, off, need: el.scrollWidth, room: el.clientWidth, right: Math.round(r.right) });
  }
  return out.slice(0, 12);
});
const tile = (page, name) => page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(name, 'i') }).first();
async function writeSave(page, save) {
  await page.evaluate(([key, s]) => localStorage.setItem(key, JSON.stringify(s)), [KEY, save]);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1300);
}

const CONFIGS = [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]];
for (const [width, height, reduced] of CONFIGS) {
  const tag = `${width}${reduced ? 'r' : 'm'}`;
  if (ONLY.length && !ONLY.includes(tag)) continue;
  const R = { tag, errors: [], console: [], reached: 0, notes: {} };
  report.configs.push(R);
  const shot = async (page, name, full = false) => { try { await page.screenshot({ path: path.join(OUT, `${name}-${tag}.jpg`), fullPage: full, type: "jpeg", quality: 72 }); } catch (e) { R.errors.push(`shot ${name}: ${String(e).slice(0, 120)}`); } };
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', e => R.errors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED|net::/i.test(m.text())) R.console.push(m.text().slice(0, 300)); });
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) R.reached++; });
  await page.route(/supabase\.co/, r => r.abort());
  try {
    /* 1. The first visit: the rules before play. */
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const consent = page.locator('button:has-text("Essential only")');
    if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(400); }
    await shot(page, '01-first-visit');
    const first = await page.locator('body').innerText();
    R.notes.gateBeforePlay = { has65: /65 games/.test(first), hasExample: /An MVP case by the numbers/.test(first), has23: /23 badges/.test(first), sideways: await sideways(page) };
    const ex = page.getByText('An MVP case by the numbers', { exact: false }).first();
    if (await ex.count()) { await ex.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300); await shot(page, '02-first-visit-example'); R.notes.gateCut = await cutOff(page); }
    await page.evaluate(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
    await shot(page, '03-create');
    await page.locator('input[placeholder*="name"]').first().fill('Walk Player');
    await page.locator('button:has-text("Enter the draft")').click();
    await page.waitForTimeout(900);
    R.notes.hubReached = await toHub(page);
    await shot(page, '04-hub-rookie');

    /* 2. A rookie season as the game deals it. */
    await playButton(page).first().click();
    await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
    await page.waitForTimeout(350);
    await shot(page, '05-reveal-early');
    R.notes.revealEarlyText = (await page.locator('[data-season-reveal]').innerText()).replace(/\s+/g, ' ').slice(0, 400);
    await page.waitForTimeout(5200);
    await shot(page, '06-reveal-rookie', true);
    R.notes.revealRookie = (await page.locator('[data-season-reveal]').innerText()).split('\n').map(s => s.trim()).filter(Boolean);
    R.notes.revealRookieCut = await cutOff(page); R.notes.revealSideways = await sideways(page);
    await toHub(page);
    await shot(page, '07-hub-after-one', true);
    R.notes.hubText = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 900);
    R.notes.hubCut = await cutOff(page); R.notes.hubSideways = await sideways(page);

    /* 3. A star in his prime (the engine's own save), then the same man pushed to the top for the longest card. */
    await writeSave(page, { c: SAVES.star.save, phase: 'season', teamQuality: SAVES.star.tq, coach: null });
    await toHub(page);
    await playButton(page).first().click();
    await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
    await page.waitForTimeout(reduced ? 1500 : 6500);
    await shot(page, '08-reveal-star', true);
    R.notes.revealStar = (await page.locator('[data-season-reveal]').innerText()).split('\n').map(s => s.trim()).filter(Boolean);
    await toHub(page);
    const boosted = JSON.parse(JSON.stringify(SAVES.star.save)); Object.assign(boosted, { ovr: 97, pot: 99, morale: 95, fanbase: 97, health: 100, role: 'starter' });
    await writeSave(page, { c: boosted, phase: 'season', teamQuality: 93, coach: null });
    await toHub(page);
    await playButton(page).first().click();
    await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
    await page.waitForTimeout(reduced ? 1500 : 8000);
    await shot(page, '09-reveal-boosted', true);
    R.notes.revealBoosted = (await page.locator('[data-season-reveal]').innerText()).split('\n').map(s => s.trim()).filter(Boolean);
    R.notes.revealBoostedCut = await cutOff(page); R.notes.revealBoostedSideways = await sideways(page);
    await toHub(page);
    await shot(page, '10-hub-boosted', true);
    R.notes.hubBoostedCut = await cutOff(page);
    if (await tile(page, 'Career Log').count()) { await tile(page, 'Career Log').click(); await page.waitForTimeout(700); await shot(page, '11-log-boosted', true); R.notes.logBoosted = (await page.locator('main').innerText()).split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60); R.notes.logCut = await cutOff(page); R.notes.logSideways = await sideways(page); await step(page); await page.waitForTimeout(400); }
    if (await tile(page, 'Trophy Case').count()) { await tile(page, 'Trophy Case').click(); await page.waitForTimeout(700); await shot(page, '12-case', true); R.notes.badges = await page.locator('[data-career-badge]').evaluateAll(els => els.map(e => (e.textContent ?? '').slice(0, 70))); R.notes.caseCut = await cutOff(page); await step(page); await page.waitForTimeout(400); }
    const help = page.locator('button[aria-label="How to play"]').first();
    if (await help.count()) {
      await help.click(); await page.waitForTimeout(800); await shot(page, '13-help');
      const ex2 = page.getByText('An MVP case by the numbers', { exact: false }).first();
      if (await ex2.count()) { await ex2.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300); await shot(page, '14-help-example'); }
      const rule = page.getByText('From the 2023-24 season on', { exact: false }).first();
      if (await rule.count()) { await rule.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300); await shot(page, '15-help-rules'); }
      R.notes.helpText = (await page.locator('[role="dialog"]').first().innerText().catch(() => '')).split('\n').map(s => s.trim()).filter(s => /MVP|65 games|All-Star|All-Rookie|Most Improved|lead the league|season card|badges/.test(s)).slice(0, 16);
      R.notes.helpCut = await cutOff(page); R.notes.helpSideways = await sideways(page);
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    }

    /* 4. A save built by the BASE's code, mid career: the rows as saved, then one more season. */
    await writeSave(page, { c: OLD.mid.save, phase: 'season', teamQuality: OLD.mid.tq, coach: null });
    await toHub(page);
    await shot(page, '16-old-hub', true);
    if (await tile(page, 'Career Log').count()) { await tile(page, 'Career Log').click(); await page.waitForTimeout(700); await shot(page, '17-old-log', true); const txt = await page.locator('main').innerText(); R.notes.oldLinesAllPrinted = OLD.mid.lines.every(l => txt.includes(l)); R.notes.oldLinesWanted = OLD.mid.lines; await step(page); await page.waitForTimeout(400); }
    await playButton(page).first().click();
    await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
    await page.waitForTimeout(reduced ? 1500 : 6000);
    await shot(page, '18-old-reveal', true);
    R.notes.oldReveal = (await page.locator('[data-season-reveal]').innerText()).split('\n').map(s => s.trim()).filter(Boolean);
    await toHub(page);
    if (await tile(page, 'Career Log').count()) { await tile(page, 'Career Log').click(); await page.waitForTimeout(700); await shot(page, '19-old-log-after', true); const txt = await page.locator('main').innerText(); R.notes.oldLinesStillPrinted = OLD.mid.lines.every(l => txt.includes(l)); R.notes.oldLogAfter = txt.split('\n').map(s => s.trim()).filter(s => / ppg/.test(s)).slice(0, 12); await step(page); await page.waitForTimeout(400); }
    const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
    R.notes.oldSeasonsUntouched = OLD.mid.save.seasons.every((x, i) => JSON.stringify(after?.c?.seasons?.[i]) === JSON.stringify(x));

    /* 5. Retirement: the branch's own career with a points standout, then a base career that retired before. */
    await writeSave(page, { c: SAVES.retired.save, phase: 'retired', teamQuality: SAVES.retired.tq, coach: null });
    await page.waitForTimeout(reduced ? 2500 : 9000);
    await shot(page, '20-retired', true);
    const body = await page.locator('main').innerText();
    R.notes.retired = {
      weighs: await page.locator('[data-hall-weighs]').first().innerText().catch(() => null),
      pointsLines: body.split('\n').map(s => s.trim()).filter(s => /points/.test(s)).slice(0, 6),
      expectReal: SAVES.retired.expect.realPts, expectPrinted: SAVES.retired.expect.printedTotal,
    };
    const hw = page.locator('[data-hall-weighs]').first();
    if (await hw.count()) { await hw.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(400); await shot(page, '21-retired-hall'); }
    R.notes.retiredCut = await cutOff(page); R.notes.retiredSideways = await sideways(page);
    await writeSave(page, { c: OLD.retired.save, phase: 'retired', teamQuality: OLD.retired.tq, coach: null });
    await page.waitForTimeout(reduced ? 2500 : 9000);
    await shot(page, '22-old-retired', true);
    const body2 = await page.locator('main').innerText();
    R.notes.oldRetired = { weighs: await page.locator('[data-hall-weighs]').first().innerText().catch(() => null), verdictWanted: OLD.retired.legacy.verdict, verdictShown: body2.includes(OLD.retired.legacy.verdict), bulletsShown: OLD.retired.legacy.bullets.every(b => body2.includes(b)), scoreWanted: OLD.retired.legacy.score };
  } catch (e) {
    R.errors.push(`walk stopped: ${String(e).slice(0, 400)}`);
    await shot(page, '99-stopped', true);
  }
  await ctx.close();
  console.log(`${tag}: errors ${R.errors.length}, console errors ${R.console.length}, live database requests finished ${R.reached}`);
}
await browser.close();
writeFileSync(path.join(OUT, 'rv-walk.json'), JSON.stringify(report, null, 1));
console.log(`rv-walk: ${report.configs.length} configurations walked, ${report.configs.reduce((n, c) => n + c.errors.length, 0)} errors noted`);

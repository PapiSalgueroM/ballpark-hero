/* Reviewer's walk for Round 1501 (sent to a runner as .rc/x/walk.mjs, never committed). Plays the levels the way a
   player meets them, at 390 by 844 and 1280 by 900, with reduced motion on and off:
   a Normal career (Skip) and a Hard career (a name typed, Take the job) at the same club, then for each the hub,
   the Match Centre's odds, one Quick Sim and its report, the transfer list's first prices, and the help's How hard
   block; then a Legend career with No sacking taken over at New year, its hub and its Options. Every tile press on
   the Dugout step is measured for a page jump. The database host is blocked. Pictures go to $RC_OUT. */
import path from 'node:path';
import fs from 'node:fs';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rv-out';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const CLUB = process.env.CLUB || 'Brentford';
let problems = 0;
const bad = m => { problems += 1; console.log('  PROBLEM: ' + m); };
const note = m => console.log('  ' + m);
const errors = [];
const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(OUT, name), fullPage: full }).catch(e => note(`shot ${name} failed: ${e.message}`)); };
const pause = (page, ms) => page.waitForTimeout(ms);
const text = async page => ((await page.locator('body').innerText().catch(() => '')) || '').replace(/[ \t]+/g, ' ');
const saveOf = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { club: c.clubName, level: c.startOptions?.difficulty ?? null, noSack: c.startOptions?.noSack ?? null, budget: c.budget, wageCap: c.wageCap, board: c.boardConfidence, week: c.week, bytes: raw.length };
}, KEY).catch(() => null);
const geom = page => page.evaluate(() => [Math.round(window.scrollY), document.documentElement.scrollHeight, document.documentElement.scrollWidth <= window.innerWidth + 1]);
async function tapText(page, rx) {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 5000 }).then(() => true).catch(() => false);
}

const browser = await chromium.launch();
async function newCtx(vp, rm) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: rm });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, 7);
  return ctx;
}
async function toDugout(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const freshBtn = page.locator('text=Start Fresh');
  if (await freshBtn.count()) { await freshBtn.click(); await pause(page, 800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 700);
  await page.locator('text=England').first().click();
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 700);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(page, 400); }
  await page.locator(`button:has-text("${CLUB}")`).first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  return page;
}

/** The hub's money and the match centre's odds, one quick sim and its report, and the market's first prices. */
async function tour(page, tag) {
  const out = {};
  await pause(page, 1200);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(page, `${tag}-hub.png`);
  const hub = await text(page);
  out.hubMoney = (hub.match(/[£€$][0-9.,]+m[^\n]{0,40}/g) || []).slice(0, 4);
  out.save = await saveOf(page);
  out.hubFits = (await geom(page))[2];
  if (await tapText(page, /Match Centre/i)) {
    await pause(page, 900);
    const t = await text(page);
    out.odds = (t.split('\n').filter(l => /odds|strength|rated|Win |Draw|Loss/i.test(l)).slice(0, 8)).map(l => l.trim().slice(0, 120));
    await shot(page, `${tag}-centre.png`);
    out.centreFits = (await geom(page))[2];
    if (await tapText(page, /Quick Sim/i)) {
      await pause(page, 3500);
      const r = await text(page);
      out.report = (r.split('\n').filter(l => /board|confidence|Full time|FULL TIME/i.test(l)).slice(0, 8)).map(l => l.trim().slice(0, 140));
      await shot(page, `${tag}-report.png`);
      out.after = await saveOf(page);
    } else out.report = ['no Quick Sim button'];
    for (let i = 0; i < 4; i += 1) { if (!(await tapText(page, /Club home|Continue|Back to the club|Done/i))) break; await pause(page, 700); }
  } else out.odds = ['no Match Centre button'];
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  if (await tapText(page, /Transfer window open|Market/i)) {
    await pause(page, 1200);
    const t = await text(page);
    out.prices = (t.split('\n').filter(l => /[£€$][0-9.]+m/.test(l)).slice(0, 10)).map(l => l.trim().slice(0, 110));
    await shot(page, `${tag}-market.png`);
    out.marketFits = (await geom(page))[2];
  } else out.prices = ['no market tile'];
  return out;
}

const COMBOS = [[{ width: 390, height: 844 }, 'reduce'], [{ width: 390, height: 844 }, 'no-preference'], [{ width: 1280, height: 900 }, 'reduce'], [{ width: 1280, height: 900 }, 'no-preference']];
for (const [vp, rm] of COMBOS) {
  const W = vp.width, rmTag = rm === 'reduce' ? 'rm' : 'anim';
  console.log(`\n== ${W} by ${vp.height}, reduced motion ${rm}`);
  /* Normal: every tile pressed in turn, the page measured, then Skip on Normal. */
  const ctxN = await newCtx(vp, rm);
  const pn = await toDugout(ctxN);
  await pn.locator('[data-cm-level-tile="normal"]').scrollIntoViewIfNeeded().catch(() => {});
  const g0 = await geom(pn);
  const blurbs = {};
  for (const lv of ['hard', 'legend', 'normal', 'hard', 'legend', 'normal']) {
    await pn.locator(`[data-cm-level-tile="${lv}"]`).click({ timeout: 5000 }).catch(() => bad(`${W} ${rm}: could not press ${lv}`));
    await pause(pn, 200);
    const g = await geom(pn);
    const bh = await pn.locator('[data-cm-level-blurb]').evaluate(e => Math.round(e.getBoundingClientRect().height)).catch(() => -1);
    blurbs[lv] = bh;
    if (g[0] !== g0[0] || g[1] !== g0[1]) bad(`${W} ${rm}: pressing ${lv} moved the page (scrollY ${g0[0]} to ${g[0]}, height ${g0[1]} to ${g[1]})`);
    if (lv === 'hard' && !blurbs.shotHard) { blurbs.shotHard = 1; await shot(pn, `dugout-hard-${W}-${rmTag}.png`); }
  }
  note(`${W} ${rm}: blurb heights ${JSON.stringify(blurbs)}; dugout fits ${g0[2]}`);
  await pn.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => bad('no Skip button'));
  const n = await tour(pn, `n-${W}-${rmTag}`);
  note(`${W} ${rm} NORMAL ${JSON.stringify(n)}`);
  await pn.close(); await ctxN.close();

  /* Hard: a name typed, Take the job. */
  const ctxH = await newCtx(vp, rm);
  const ph = await toDugout(ctxH);
  await ph.locator('[data-cm-level-tile="hard"]').click({ timeout: 5000 }).catch(() => bad('could not press Hard'));
  await ph.locator('#manager-name').fill('Rory Vance').catch(() => bad('no name field'));
  await ph.locator('button:has-text("Take the job")').last().click({ timeout: 8000 }).catch(() => bad('no Take the job on the Dugout step'));
  await pause(ph, 2000);
  const pill = ((await ph.locator('[data-cm-level-pill]').innerText().catch(() => '')) || '').trim();
  if (pill !== 'Hard') bad(`${W} ${rm}: the Hard career's pill reads "${pill}"`);
  const h = await tour(ph, `h-${W}-${rmTag}`);
  note(`${W} ${rm} HARD ${JSON.stringify(h)}`);
  if (!h.save || h.save.level !== 'hard') bad(`${W} ${rm}: Take the job did not carry Hard into the save (${JSON.stringify(h.save)})`);
  if (n.save && h.save && Math.abs(h.save.budget - Math.round(n.save.budget * 0.8 * 10) / 10) > 0.11) bad(`${W} ${rm}: Hard's day one budget ${h.save.budget} is not 0.8 of Normal's ${n.save.budget}`);
  for (const k of ['hubFits', 'centreFits', 'marketFits']) if (h[k] === false || n[k] === false) bad(`${W} ${rm}: a screen is wider than the page (${k})`);
  /* the help's How hard block */
  await ph.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  const help = ph.locator('button[aria-label="How to play"]').first();
  if (await help.count()) {
    await help.click({ timeout: 5000 }).catch(() => {});
    await pause(ph, 1500);
    const block = ph.locator('[data-cm-help="difficulty"]');
    if (await block.count()) { await block.scrollIntoViewIfNeeded().catch(() => {}); await pause(ph, 400); await shot(ph, `help-${W}-${rmTag}.png`); }
    else bad(`${W} ${rm}: the help has no How hard block`);
  } else bad(`${W} ${rm}: no How to play button on the hub`);
  await ph.close(); await ctxH.close();
}

/* Legend with No sacking, taken over at New year, at 390 and 1280: the hub, Options, and the page jump at 320. */
for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const W = vp.width;
  const ctx = await newCtx(vp, 'reduce');
  const p = await toDugout(ctx);
  await p.locator('button:has-text("New year")').first().click({ timeout: 5000 }).catch(() => bad(`${W}: no New year tile`));
  await pause(p, 300);
  await p.locator('[data-cm-level-tile="legend"]').scrollIntoViewIfNeeded().catch(() => {});
  const g0 = await geom(p);
  for (const lv of ['hard', 'legend']) {
    await p.locator(`[data-cm-level-tile="${lv}"]`).click({ timeout: 5000 }).catch(() => {});
    await pause(p, 200);
    const g = await geom(p);
    if (g[0] !== g0[0] || g[1] !== g0[1]) bad(`${W}: pressing ${lv} moved the page (scrollY ${g0[0]} to ${g[0]}, height ${g0[1]} to ${g[1]})`);
  }
  await p.locator('[data-cm-nosack-switch]').click({ timeout: 5000 }).catch(() => {});
  await shot(p, `dugout-legend-takeover-${W}.png`);
  if (!g0[2]) bad(`${W}: the Dugout step is wider than the page`);
  await p.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => bad('no Skip button'));
  await pause(p, 3000);
  const s = await saveOf(p);
  note(`${W} LEGEND TAKEOVER save ${JSON.stringify(s)}`);
  if (!s || s.level !== 'legend' || s.noSack !== 1 || !(s.week > 0)) bad(`${W}: the Legend takeover's save is ${JSON.stringify(s)}`);
  const pills = await p.locator('[data-cm-level-pill], [data-cm-nosack-pill]').allInnerTexts().catch(() => []);
  note(`${W} pills ${JSON.stringify(pills)}`);
  await p.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(p, `hub-legend-takeover-${W}.png`);
  if (!(await geom(p))[2]) bad(`${W}: the Legend hub is wider than the page`);
  if (await tapText(p, /Currency, nation job, haggling/)) {
    await pause(p, 900);
    await shot(p, `options-legend-${W}.png`);
    const t = await text(p);
    note(`${W} options: ${t.split('\n').filter(l => /Legend|How hard|No sacking|Picked/i.test(l)).slice(0, 6).map(l => l.trim().slice(0, 120)).join(' | ')}`);
  } else bad(`${W}: no Options tile`);
  await p.close(); await ctx.close();
}

await browser.close();
if (errors.length) bad(`page errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(problems ? `walk: ${problems} PROBLEMS` : 'walk: no problems found');
process.exit(problems ? 1 : 0);

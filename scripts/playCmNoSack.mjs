/**
 * Round 1342 browser walk: Club Manager's No sacking on the screens, at 320 by 640, 390 by 844 and 1280 by 900.
 *
 *   (a) The Dugout step shows the Career options card with No sacking off; pressing the switch turns it on
 *       and moves nothing (scrollY and the document height the same); the switch is at least 44 px tall and no
 *       new text is under 12 px. Skip starts a Normal career.
 *   (d) A Normal career wears no pill. Options asks once ("Turn on No sacking"), the second tap ("Yes, turn it
 *       on for good") switches it on, and the hub's pill appears, with nothing overlapping or wider than the page.
 *   (e) The save is planted from /robots.txt at board confidence 1 with No sacking on and a weak squad, and quick
 *       simmed to the first defeat on that last point: the match report carries the No sacking line, the career
 *       is still in the job (never the sacked screen), and the Board meter reads the No sacking words.
 *   (h) The meter strip is the same height with No sacking on and off, at board 5 and at board 15 (the hub holds
 *       the strip's slot by height, ClubManager.tsx, so new words that wrapped differently would make it jump).
 *
 * The database host is blocked; the page plays on a seeded stream (NOSACK_SEED, scripts/lib/pageSeed.mjs).
 * Pictures of each step go to $RC_OUT when it is set.
 *
 * CONTROLS (PLAY_NOSACK_CONTROL), each rewrites the SERVED chunk (scripts/lib/servedCodeControl.mjs), never src,
 * and exits 0 only when every check aimed at it went red:
 *   nopill  the pill's marker is renamed in the served code: (d)'s pill check must fail
 *   sack    the No sacking key never reads as on in the served code: (e) must fail (sacked screen, no line,
 *           no No sacking words); (a) and (d) are skipped under it and the key is planted straight into the save
 *
 *   #!serve then: node scripts/playCmNoSack.mjs           WIDTHS=390 PLAY_NOSACK_CONTROL=sack node scripts/playCmNoSack.mjs
 */
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';
import { pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const CONTROL = process.env.PLAY_NOSACK_CONTROL || '';
if (CONTROL && CONTROL !== 'nopill' && CONTROL !== 'sack') {
  console.error(`PLAY_NOSACK_CONTROL=${CONTROL} is not a control this walk knows (nopill, sack)`);
  process.exit(2);
}
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.NOSACK_SEED); } catch (e) { console.error(`NOSACK_SEED: ${e.message}`); process.exit(2); }
const HEIGHTS = { 320: 640, 390: 844, 1280: 900 };
const WIDTHS = (process.env.WIDTHS || '320,390,1280').split(',').map(Number);
console.log(`playCmNoSack: seed ${SEED} (replay with NOSACK_SEED=${SEED}), widths ${WIDTHS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}`);
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};
const KEY = 'dukb-club-manager-save';
const LINE = 'The board would have sacked you tonight';
const errors = [];

const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const pause = (page, ms) => page.waitForTimeout(ms);

/** Edit the save from a page where the app does not run (the Round 196 rule), then the game opens it fresh. */
async function plant(ctx, edit) {
  const h = await ctx.newPage();
  await h.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const ok = await h.evaluate(({ key, conf, noSack, ovr }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const c = JSON.parse(raw);
    c.boardConfidence = conf;
    if (!c.startOptions || typeof c.startOptions !== 'object') c.startOptions = { v: 1, currency: 'GBP', nationJobs: true, strictness: 3 };
    if (noSack) c.startOptions.noSack = noSack; else delete c.startOptions.noSack;
    if (ovr) for (const p of c.squad ?? []) p.ovr = ovr;
    localStorage.setItem(key, JSON.stringify(c));
    return true;
  }, { key: KEY, ...edit });
  await h.close();
  return ok;
}
async function openGame(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const resume = page.locator('button:has-text("Resume Career")');
  if (await resume.count()) { await resume.first().click({ timeout: 5000 }).catch(() => {}); await pause(page, 1200); }
  return page;
}
const readSave = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { conf: c.boardConfidence, sacked: c.sacked, noSack: c.startOptions?.noSack ?? null, played: c.careerStats?.played ?? null };
}, KEY).catch(() => null);
/** The smallest font size and the shortest button inside the elements a selector finds. */
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
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const browser = await chromium.launch();
for (const W of WIDTHS) {
  const vp = { width: W, height: HEIGHTS[W] ?? 900 };
  console.log(`\n== ${vp.width} by ${vp.height}`);
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, SEED);
  if (CONTROL === 'nopill') await installServedCodeControl(ctx, [{ label: 'pill', find: /"data-cm-nosack-pill":!0/g, replace: '"data-cm-nosack-gone":!0' }], proof);
  if (CONTROL === 'sack') await installServedCodeControl(ctx, [{ label: 'readNoSack', find: /typeof ([\w$]+)=="number"&&Number\.isInteger\(\1\)&&\1>0\?\1:null/g, replace: 'null' }], proof);

  /* (a) the Dugout step */
  let page = await ctx.newPage();
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
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(page, 400); }
  await page.locator('text=Take the job').click();
  const card = page.locator('[data-cm-career-options]');
  await card.waitFor({ timeout: 15000 }).catch(() => {});
  if (CONTROL !== 'sack') {
    say(await card.count() === 1, `${W}: the Dugout step shows the Career options card`);
    const sw = page.locator('[data-cm-nosack-switch]');
    say((await sw.getAttribute('aria-checked').catch(() => null)) === 'false', `${W}: No sacking starts off`);
    await sw.scrollIntoViewIfNeeded().catch(() => {});
    const before = await page.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
    await sw.click({ timeout: 5000 }).catch(() => {});
    await pause(page, 250);
    const after = await page.evaluate(() => [window.scrollY, document.documentElement.scrollHeight]);
    say((await sw.getAttribute('aria-checked').catch(() => null)) === 'true', `${W}: the switch turns it on`);
    say(before[0] === after[0] && before[1] === after[1], `${W}: pressing it moves nothing (scrollY ${before[0]} then ${after[0]}, height ${before[1]} then ${after[1]})`);
    const s = await sizes(page, '[data-cm-career-options]');
    say(s.button >= 44 && s.font >= 12, `${W}: the switch is ${s.button.toFixed(1)} px tall and the card's smallest text is ${s.font} px`);
    say(await fits(page), `${W}: the Dugout step is no wider than the screen`);
    await shot(page, `dugout-${W}.png`);
    await sw.click({ timeout: 5000 }).catch(() => {});
    await pause(page, 200);
  }
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2000);
  say(await page.locator('button:has-text("Finances")').count() > 0, `${W}: the career is running`);

  /* (d) a Normal career, then Options' two taps */
  if (CONTROL !== 'sack') {
    const s0 = await readSave(page);
    say(await page.locator('[data-cm-nosack-pill]').count() === 0 && s0 && s0.noSack === null, `${W}: a Normal career wears no pill and carries no key`);
    await page.locator('button', { hasText: 'Currency, nation job, haggling' }).first().click({ timeout: 5000 }).catch(() => {});
    await pause(page, 800);
    const ask = page.locator('[data-cm-nosack-turn-on]');
    say(await ask.count() === 1 && (await ask.getAttribute('data-cm-nosack-turn-on')) === 'ask', `${W}: Options offers to turn No sacking on`);
    await ask.click({ timeout: 5000 }).catch(() => {});
    await pause(page, 250);
    say((await ask.getAttribute('data-cm-nosack-turn-on').catch(() => null)) === 'confirm' && (await readSave(page))?.noSack === null, `${W}: the first tap only asks`);
    const so = await sizes(page, '[data-cm-nosack-option]');
    say(so.button >= 44 && so.font >= 12, `${W}: the Options button is ${so.button.toFixed(1)} px tall and its smallest text is ${so.font} px`);
    await shot(page, `options-ask-${W}.png`);
    await ask.click({ timeout: 5000 }).catch(() => {});
    await pause(page, 600);
    say((await page.locator('[data-cm-nosack-option]').getAttribute('data-cm-nosack-option').catch(() => null)) === 'on', `${W}: the second tap switches it on, for good`);
    const pill = page.locator('[data-cm-nosack-pill]');
    say(await pill.count() === 1, `${W}: the hub's pill appears once it is on`, CONTROL === 'nopill');
    if (await pill.count()) {
      const pb = await pill.boundingBox(), hb = await page.locator('h1').first().boundingBox();
      const ps = await sizes(page, '[data-cm-nosack-pill]');
      say(!overlap(pb, hb) && ps.font >= 12, `${W}: the pill sits clear of the club name (pill ${pb && pb.y.toFixed(0)} to ${pb && (pb.y + pb.height).toFixed(0)}, text ${ps.font} px)`);
    }
    say(await fits(page), `${W}: the hub with the pill is no wider than the screen`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, `hub-pill-${W}.png`);
  }
  await page.close();

  /* (e) the last point, to the first defeat on it */
  say(await plant(ctx, { conf: 1, noSack: 1, ovr: 40 }), `${W}: the save was planted on its last point with No sacking and a weak squad`);
  page = await openGame(ctx);
  const clickExact = async name => {
    const b = page.getByRole('button', { name, exact: true });
    if (!(await b.count())) return false;
    await b.first().click({ timeout: 4000 }).catch(() => {});
    return true;
  };
  const homeTab = async () => {
    const t = page.getByRole('tab', { name: 'Home', exact: true });
    if (await t.count()) await t.first().click({ timeout: 4000 }).catch(() => {});
  };
  let lineSeen = false, sackedScreen = false, steps = 0;
  for (; steps < 90 && !lineSeen && !sackedScreen; steps += 1) {
    if (await page.locator('[data-wilderness]').count()) { sackedScreen = true; break; }
    if (await page.getByText(LINE).count()) { lineSeen = true; break; }
    if (steps > 0 && steps % 30 === 0) {
      await page.close();
      await plant(ctx, { conf: 1, noSack: 1, ovr: 40 });
      page = await openGame(ctx);
      continue;
    }
    if (await clickExact('⚡ Quick Sim')) { await pause(page, 700); continue; }
    if (await clickExact('Open the Window')) { await pause(page, 600); await homeTab(); await pause(page, 400); continue; }
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await onward.count()) { await onward.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 500); continue; }
    await homeTab();
    await pause(page, 400);
  }
  if (lineSeen) await shot(page, `report-line-${W}.png`);
  console.log(`  ${steps} steps: ${lineSeen ? 'the No sacking line showed on a match report' : sackedScreen ? 'the sacked screen opened' : 'neither the line nor the sack'}`);
  say(lineSeen, `${W}: a defeat on the last point put the No sacking line on the match report`, CONTROL === 'sack');
  /* Back to the hub, the way a player goes. */
  for (let i = 0; i < 6 && lineSeen && !(await page.locator('[data-cm-meters]').count()); i += 1) {
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await onward.count()) await onward.first().click({ timeout: 4000 }).catch(() => {});
    await pause(page, 700);
    if (await page.locator('[data-wilderness]').count()) sackedScreen = true;
  }
  const after = await readSave(page);
  say(!sackedScreen && !(await page.locator('[data-wilderness]').count()) && !!after && !after.sacked && after.conf > 0,
    `${W}: still in the job (board ${after && after.conf}, saved sacked flag ${after && after.sacked})`, CONTROL === 'sack');
  const words = await page.locator('[data-cm-meter="board"]').innerText().catch(() => '');
  say(/No sacking/.test(words), `${W}: the Board meter reads "${words.replace(/\s+/g, ' ').trim()}"`, CONTROL === 'sack');
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(page, `hub-floor-${W}.png`);
  await page.close();

  /* (h) the meter strip's height, No sacking on and off */
  if (!CONTROL) {
    const heights = {};
    for (const conf of [5, 15]) {
      for (const on of [true, false]) {
        await plant(ctx, { conf, noSack: on ? 1 : null });
        page = await openGame(ctx);
        const box = await page.locator('[data-cm-meters]').boundingBox().catch(() => null);
        heights[`${conf}${on ? 'on' : 'off'}`] = box ? Math.round(box.height * 10) / 10 : null;
        if (conf === 5 && on) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, `meters-5-nosack-${W}.png`); }
        await page.close();
      }
    }
    say(heights['5on'] !== null && heights['5on'] === heights['5off'], `${W}: at board 5 the strip is ${heights['5on']} px with No sacking and ${heights['5off']} px without`);
    say(heights['15on'] !== null && heights['15on'] === heights['15off'], `${W}: at board 15 the strip is ${heights['15on']} px with No sacking and ${heights['15off']} px without`);
  }
  await ctx.close();
}
await browser.close();
say(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
process.exit(verdict('playCmNoSack', proof, { minGuarded: CONTROL === 'sack' ? 3 * WIDTHS.length : WIDTHS.length }));

/* Reviewer walk (Round 1342, runner lens): No sacking played the way a player gets to it, end to end.
 *   A  (every config) a real club, the Dugout switch ON, Skip: the hub wears the pill, the save carries the key,
 *      Options says it is on with no way off, the Managers card says No sacking.
 *   D  (390 and 1280) that same Dugout-made career planted on board 1 with a weak squad, quick simmed to the first
 *      defeat on it: the No sacking line, never the sacked screen, the meter's words, the number view.
 *   B  (390) a Normal career planted in season 2, Options' two taps: "On since season 2" and the pill.
 *   C  (390) a created club, a named manager, the New year takeover, the switch ON, Take the job: pill and key.
 * Configs: 320x640, 390x844 and 1280x900, reduced motion on and off at 390 and 1280. The database host is blocked.
 * Every check prints PASS or FAIL; exit 1 on any FAIL. Pictures to $RC_OUT. */
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const KEY = 'dukb-club-manager-save';
const LINE = 'The board would have sacked you tonight';
const ONLY = process.env.FLOWS || 'A,B,C,D';
let fails = 0;
const say = (ok, m) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${m}`); if (!ok) fails += 1; };
const pause = (page, ms) => page.waitForTimeout(ms);
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const readSave = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { conf: c.boardConfidence, sacked: c.sacked, noSack: c.startOptions?.noSack ?? null, season: c.season, club: c.clubName };
}, KEY).catch(() => null);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1).catch(() => false);
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const errors = [];

async function newCtx(browser, vp, reduce) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, 424242);
  return ctx;
}
async function openPicker(ctx) {
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
  return page;
}
async function plant(ctx, edit) {
  const h = await ctx.newPage();
  await h.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const ok = await h.evaluate(({ key, e }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const c = JSON.parse(raw);
    if (e.conf !== undefined) c.boardConfidence = e.conf;
    if (e.ovr) for (const p of c.squad ?? []) p.ovr = e.ovr;
    if (e.season) c.season = e.season;
    localStorage.setItem(key, JSON.stringify(c));
    return true;
  }, { key: KEY, e: edit });
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
const optionsCard = async page => {
  await page.locator('button', { hasText: 'Currency, nation job, haggling' }).first().click({ timeout: 5000 }).catch(() => {});
  await pause(page, 800);
  return page.locator('[data-cm-nosack-option]');
};
const headerRow = async page => {
  const b = await page.locator('h1').first().locator('xpath=..').boundingBox().catch(() => null);
  return b ? Math.round(b.height) : null;
};
const heights = {};

/* A: the Dugout switch ON, then Skip, the way a player does it. Returns the page and context for D. */
async function flowA(browser, W, H, reduce) {
  const tag = `${W}${reduce ? ' rm' : ''}`, sfx = `${W}${reduce ? '-rm' : ''}`;
  const ctx = await newCtx(browser, { width: W, height: H }, reduce);
  let page = await openPicker(ctx);
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  const card = page.locator('[data-cm-career-options]');
  await card.waitFor({ timeout: 15000 }).catch(() => {});
  say(await card.count() === 1, `${tag} A: the Dugout step shows the Career options card`);
  const sw = page.locator('[data-cm-nosack-switch]');
  await sw.scrollIntoViewIfNeeded().catch(() => {});
  await sw.click({ timeout: 5000 }).catch(() => {});
  await pause(page, 300);
  say((await sw.getAttribute('aria-checked').catch(() => null)) === 'true', `${tag} A: the switch reads on`);
  await shot(page, `A-dugout-on-${sfx}.png`);
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2500);
  const s = await readSave(page);
  say(!!s && s.noSack === 1, `${tag} A: the career the Dugout started carries the key (save noSack ${s && s.noSack}, club ${s && s.club})`);
  const pill = page.locator('[data-cm-nosack-pill]');
  say(await pill.count() === 1, `${tag} A: the hub wears the No sacking pill`);
  const pb = await pill.boundingBox().catch(() => null), hb = await page.locator('h1').first().boundingBox().catch(() => null);
  say(!!pb && !overlap(pb, hb), `${tag} A: the pill is clear of the club name`);
  say(await fits(page), `${tag} A: the hub is no wider than the screen`);
  heights[`on-${sfx}`] = await headerRow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, `A-hub-${sfx}.png`);
  const opt = await optionsCard(page);
  const txt = (await opt.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  say(/On for this whole career/.test(txt) && (await page.locator('[data-cm-nosack-turn-on]').count()) === 0, `${tag} A: Options reads "${txt.slice(0, 90)}" with no way off`);
  await opt.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `A-options-${sfx}.png`);
  await page.close();
  page = await openGame(ctx);
  await page.locator('[data-testid="cm-show-slots"]').click({ timeout: 6000 }).catch(() => {});
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
  const slot = ((await page.locator('[data-testid="cm-slot-1"]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  say(/No sacking/.test(slot), `${tag} A: the Managers card reads "${slot.slice(0, 110)}"`);
  await shot(page, `A-slots-${sfx}.png`);
  await page.close();
  return ctx;
}

/* D: the Dugout-made career on its last point, to the first defeat on it. */
async function flowD(ctx, W, sfx) {
  const tag = `${W} D`;
  say(await plant(ctx, { conf: 1, ovr: 40 }), `${tag}: planted the Dugout-made career on board 1 with a weak squad`);
  let page = await openGame(ctx);
  const clickExact = async name => {
    const b = page.getByRole('button', { name, exact: true });
    if (!(await b.count())) return false;
    await b.first().click({ timeout: 4000 }).catch(() => {});
    return true;
  };
  const homeTab = async () => { const t = page.getByRole('tab', { name: 'Home', exact: true }); if (await t.count()) await t.first().click({ timeout: 4000 }).catch(() => {}); };
  let line = false, sackedScreen = false, steps = 0;
  for (; steps < 90 && !line && !sackedScreen; steps += 1) {
    if (await page.locator('[data-wilderness]').count()) { sackedScreen = true; break; }
    if (await page.getByText(LINE).count()) { line = true; break; }
    if (steps > 0 && steps % 30 === 0) { await page.close(); await plant(ctx, { conf: 1, ovr: 40 }); page = await openGame(ctx); continue; }
    if (await clickExact('⚡ Quick Sim')) { await pause(page, 700); continue; }
    if (await clickExact('Open the Window')) { await pause(page, 600); await homeTab(); await pause(page, 400); continue; }
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await onward.count()) { await onward.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 500); continue; }
    await homeTab();
    await pause(page, 400);
  }
  say(line && !sackedScreen, `${tag}: after ${steps} steps the report carries the No sacking line and no sacked screen`);
  if (line) { await page.getByText(LINE).first().scrollIntoViewIfNeeded().catch(() => {}); await shot(page, `D-report-${sfx}.png`); }
  for (let i = 0; i < 6 && line && !(await page.locator('[data-cm-meters]').count()); i += 1) {
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await onward.count()) await onward.first().click({ timeout: 4000 }).catch(() => {});
    await pause(page, 700);
    if (await page.locator('[data-wilderness]').count()) sackedScreen = true;
  }
  const after = await readSave(page);
  say(!sackedScreen && !!after && !after.sacked && after.conf > 0, `${tag}: still in the job (board ${after && after.conf}, sacked ${after && after.sacked})`);
  const meter = page.locator('[data-cm-meter="board"]');
  const words = ((await meter.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  say(/No sacking/.test(words) && !/from the sack/.test(words), `${tag}: the Board meter reads "${words}"`);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(page, `D-hub-${sfx}.png`);
  await meter.click({ timeout: 4000 }).catch(() => {});
  await pause(page, 300);
  const nums = ((await meter.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  say(/\d/.test(nums), `${tag}: the number view reads "${nums}"`);
  await page.close();
}

/* B: a Normal career in season 2 switched on from Options. */
async function flowB(browser) {
  const tag = '390 B';
  const ctx = await newCtx(browser, { width: 390, height: 844 }, false);
  let page = await openPicker(ctx);
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(page, 2500);
  const s0 = await readSave(page);
  say(!!s0 && s0.noSack === null && (await page.locator('[data-cm-nosack-pill]').count()) === 0, `${tag}: Skip with the switch off is a Normal career, no key, no pill`);
  heights['off-390'] = await headerRow(page);
  await page.close();
  say(await plant(ctx, { season: 2 }), `${tag}: planted season 2`);
  page = await openGame(ctx);
  const opt = await optionsCard(page);
  const ask = page.locator('[data-cm-nosack-turn-on]');
  await ask.click({ timeout: 5000 }).catch(() => {});
  await pause(page, 300);
  await ask.click({ timeout: 5000 }).catch(() => {});
  await pause(page, 600);
  const txt = (await opt.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const s1 = await readSave(page);
  say(/On since season 2/.test(txt) && !!s1 && s1.noSack === 2, `${tag}: after two taps Options reads "${txt.slice(0, 70)}", save noSack ${s1 && s1.noSack}`);
  say((await page.locator('[data-cm-nosack-pill]').count()) === 1, `${tag}: the pill appears`);
  await opt.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, 'B-options-on-390.png');
  await page.close();
  await ctx.close();
}

/* C: a created club, a named manager, the New year takeover, the switch on, Take the job. */
async function flowC(browser) {
  const tag = '390 C';
  const ctx = await newCtx(browser, { width: 390, height: 844 }, true);
  const page = await openPicker(ctx);
  await page.locator('text=Create your own club').first().click({ timeout: 6000 }).catch(() => {});
  await pause(page, 800);
  await page.locator('input[placeholder="Real Brookfield"]').fill('Test Rovers').catch(() => {});
  await page.locator('button:has-text("Found the club")').click({ timeout: 6000 }).catch(() => {});
  await page.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  await page.locator('input[placeholder="e.g. Sam Calloway"]').fill('Test Boss').catch(() => {});
  await page.locator('button:has-text("New year")').first().click({ timeout: 5000 }).catch(() => {});
  const sw = page.locator('[data-cm-nosack-switch]');
  await sw.scrollIntoViewIfNeeded().catch(() => {});
  await sw.click({ timeout: 5000 }).catch(() => {});
  await pause(page, 300);
  await shot(page, 'C-dugout-390.png');
  await page.locator('[data-cm-career-options]').locator('xpath=following-sibling::div[1]').locator('button:has-text("Take the job")').click({ timeout: 8000 }).catch(() => {});
  await pause(page, 5000);
  const s = await readSave(page);
  say(!!s && s.club === 'Test Rovers' && s.noSack === 1, `${tag}: the created club takeover carries the key (club ${s && s.club}, noSack ${s && s.noSack})`);
  say((await page.locator('[data-cm-nosack-pill]').count()) === 1, `${tag}: the pill on the created club's hub`);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(page, 'C-hub-390.png');
  await ctx.close();
}

const browser = await chromium.launch();
const CONFIGS = [[320, 640, true], [390, 844, true], [390, 844, false], [1280, 900, true], [1280, 900, false]];
for (const [W, H, reduce] of CONFIGS) {
  console.log(`\n== ${W} by ${H}, reduced motion ${reduce ? 'on' : 'off'}`);
  if (!ONLY.includes('A')) continue;
  if (process.env.CFG && process.env.CFG !== `${W}${reduce ? 'rm' : ''}`) continue;
  const ctx = await flowA(browser, W, H, reduce).catch(e => { say(false, `${W} A threw: ${e.message}`); return null; });
  if (ctx && ONLY.includes('D') && !reduce && W !== 320) await flowD(ctx, W, `${W}`).catch(e => say(false, `${W} D threw: ${e.message}`));
  if (ctx) await ctx.close();
}
if (ONLY.includes('B')) await flowB(browser).catch(e => say(false, `B threw: ${e.message}`));
if (ONLY.includes('C')) await flowC(browser).catch(e => say(false, `C threw: ${e.message}`));
await browser.close();
console.log(`header row heights (px): ${JSON.stringify(heights)}`);
say(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
console.log(fails ? `walkNoSack: FAIL (${fails})` : 'walkNoSack: PASS');
process.exit(fails ? 1 : 0);

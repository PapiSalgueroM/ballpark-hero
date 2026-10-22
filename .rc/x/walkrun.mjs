/* Reviewer walk (r1531, run lens). Real routes on the served dist, supabase.co blocked.
   For 390x844 and 1280x900, each with reduced motion on and off:
   A. old saves from src/test/fixtures/tycoonSaves.json (midGame stadium, midAcademy academy) loaded unmodified;
   B. a draw at full time seeded from the old midGame save (minute 84, 1 to 1, rolls held high), then a Stands buy;
   C. /wonderkid-factory with the old academy save, and a sale floater;
   D. /free-kick steady practice: the first five kick labels, and the rules copy about distance. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.walk-out');
fs.mkdirSync(OUT, { recursive: true });
const corpus = JSON.parse(fs.readFileSync('src/test/fixtures/tycoonSaves.json', 'utf8'));
const OLD_STADIUM = corpus.entries.find(e => e.name === 'midGame' && e.key === 'stadium').raw;
const OLD_ACADEMY = corpus.entries.find(e => e.name === 'midAcademy' && e.key === 'academy').raw;
const SK = 'stadiumTycoonSaveV1', AK = 'wonderkidFactoryV1';
const facts = {};
const log = (...a) => console.log(...a);
const pounds = t => (t.match(/£/g) || []).length;
const dollars = t => (t.match(/\$[0-9][0-9,.]*[KMBTQ]?/g) || []);
const ungrouped = t => (t.match(/\$\d{4,}/g) || []);
async function settle(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const reject = page.getByRole('button', { name: 'Reject all' });
  if (await reject.count()) await reject.first().click({ noWaitAfter: true, timeout: 3000 }).catch(() => {});
  const old = page.getByRole('button', { name: 'Essential only' });
  if (await old.count()) facts.oldConsentLabelSeen = true;
}
async function closeRules(page) {
  const close = page.locator('[role="dialog"] button[aria-label^="Close"]');
  for (let i = 0; i < 3 && await close.count(); i++) { await close.first().click({ noWaitAfter: true, timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300); }
}
async function seeded(ctx, seeds, extra = '') {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.addInitScript(({ seeds, extra }) => {
    if (sessionStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(seeds)) localStorage.setItem(k, v);
    sessionStorage.setItem('__seeded', '1');
    if (extra === 'high') Math.random = () => 0.999;
  }, { seeds, extra });
  if (extra === 'high') await page.addInitScript(() => { Math.random = () => 0.999; });
  return { page, errors };
}
function overlaps(a, b) { return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height; }
const browser = await chromium.launch();
try {
  for (const [w, h] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
    const tag = `${w}-${motion === 'reduce' ? 'rm' : 'mo'}`, f = facts[tag] = {};
    const mk = async () => { const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion }); await c.route(/supabase\.co/, r => r.abort()); return c; };
    /* A. old saves, unmodified */
    let ctx = await mk();
    let { page, errors } = await seeded(ctx, { [SK]: OLD_STADIUM, [AK]: OLD_ACADEMY });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
    await settle(page); await closeRules(page); await page.waitForTimeout(1200);
    const st = JSON.parse(await page.evaluate(k => localStorage.getItem(k), SK) || '{}');
    f.oldStands = st.levels?.stands; f.oldBays = await page.locator('[data-tycoon-terraces] rect').count();
    f.oldBaysExpected = Math.min(203, Math.floor((120 + (st.levels?.stands || 0) * 40) / 40));
    let text = await page.evaluate(() => document.body.innerText);
    f.oldStadiumPounds = pounds(text); f.oldStadiumUngrouped = ungrouped(text); f.oldStadiumDollars = dollars(text).slice(0, 8);
    await page.screenshot({ path: path.join(OUT, `old-stadium-${tag}.png`) });
    await page.locator('[data-room="academy"]').first().click({ timeout: 10000 }).catch(e => { f.academyClickError = String(e).slice(0, 120); });
    await page.waitForTimeout(1200); await closeRules(page); await page.waitForTimeout(500);
    text = await page.evaluate(() => document.body.innerText);
    f.oldAcademyPounds = pounds(text); f.oldAcademyUngrouped = ungrouped(text); f.oldAcademyDollars = dollars(text).slice(0, 10);
    await page.screenshot({ path: path.join(OUT, `old-academy-${tag}.png`), fullPage: false });
    f.errorsA = errors.slice(0, 3);
    await ctx.close();
    /* B. draw at full time from the old save */
    const drawSave = JSON.parse(OLD_STADIUM);
    Object.assign(drawSave, { money: 5e9, minute: 84, matchSec: 0, goalsFor: 1, goalsAgainst: 1, savedAt: Date.now() });
    ctx = await mk();
    ({ page, errors } = await seeded(ctx, { [SK]: JSON.stringify(drawSave) }, 'high'));
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
    await settle(page); await closeRules(page);
    const pitch = page.locator('[data-tycoon-terraces]').locator('xpath=../..');
    let seen = false;
    for (let i = 0; i < 300 && !seen; i++) {
      seen = await page.evaluate(() => [...document.querySelectorAll('span')].some(s => s.textContent === 'FULL TIME DRAW'));
      if (!seen) await page.waitForTimeout(100);
    }
    f.drawSeen = seen;
    if (seen) {
      f.floaters = await page.evaluate(() => [...document.querySelectorAll('span.st-float')].map(s => { const r = s.getBoundingClientRect(); return { text: s.textContent, x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), opacity: getComputedStyle(s).opacity }; }));
      const d = f.floaters.find(x => x.text === 'FULL TIME DRAW');
      f.drawOverlaps = f.floaters.filter(x => x !== d && overlaps(x, d)).map(x => x.text);
      const pb = await pitch.boundingBox(); f.drawInsidePitch = !!pb && d.x >= pb.x && d.x + d.width <= pb.x + pb.width;
      await pitch.screenshot({ path: path.join(OUT, `draw-${tag}.png`) });
      await page.waitForTimeout(1500);
      f.drawAfter1500 = await page.evaluate(() => { const s = [...document.querySelectorAll('span.st-float')].find(x => x.textContent === 'FULL TIME DRAW'); return s ? getComputedStyle(s).opacity : 'gone'; });
      await pitch.screenshot({ path: path.join(OUT, `draw-late-${tag}.png`) });
    }
    f.baysBefore = await page.locator('[data-tycoon-terraces] rect').count();
    const standsTile = page.locator('button').filter({ hasText: 'Stands' }).filter({ hasText: /Lv \d+/ }).first();
    f.standsBefore = (await standsTile.innerText().catch(() => '')).match(/Lv (\d+)/)?.[1];
    await standsTile.click({ noWaitAfter: true, timeout: 5000 }).catch(e => { f.standsClickError = String(e).slice(0, 120); });
    await page.waitForTimeout(700);
    f.standsAfter = (await standsTile.innerText().catch(() => '')).match(/Lv (\d+)/)?.[1];
    f.baysAfter = await page.locator('[data-tycoon-terraces] rect').count();
    await pitch.screenshot({ path: path.join(OUT, `stand-after-${tag}.png`) });
    await page.screenshot({ path: path.join(OUT, `stadium-${tag}.png`) });
    f.errorsB = errors.slice(0, 3);
    await ctx.close();
    /* C. the standalone Academy route with the old academy save, then a sale */
    ctx = await mk();
    ({ page, errors } = await seeded(ctx, { [AK]: OLD_ACADEMY }));
    await page.goto(`${BASE}/wonderkid-factory`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); await settle(page); await closeRules(page); await page.waitForTimeout(500);
    text = await page.evaluate(() => document.body.innerText);
    f.wkPounds = pounds(text); f.wkUngrouped = ungrouped(text); f.wkDollars = dollars(text).slice(0, 10);
    await page.screenshot({ path: path.join(OUT, `wk-${tag}.png`) });
    const sell = page.getByRole('button', { name: /^sell/i });
    f.sellButtons = await sell.count();
    if (f.sellButtons) {
      await sell.first().click({ noWaitAfter: true, timeout: 5000 }).catch(e => { f.sellError = String(e).slice(0, 120); });
      await page.waitForTimeout(250);
      const confirm = page.getByRole('button', { name: /^(sell|confirm|yes)/i });
      if (await confirm.count() > f.sellButtons) await confirm.last().click({ noWaitAfter: true, timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      f.saleText = (await page.evaluate(() => document.body.innerText).catch(() => '')).split('\n').filter(l => /sold for/.test(l)).slice(0, 3);
      await page.screenshot({ path: path.join(OUT, `wk-sale-${tag}.png`) });
    }
    f.errorsC = errors.slice(0, 3);
    await ctx.close();
    /* D. Free Kick steady practice: kick labels one to five, and the distance copy */
    ctx = await mk();
    ({ page, errors } = await seeded(ctx, {}));
    await page.goto(`${BASE}/free-kick`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); await settle(page); await closeRules(page);
    text = await page.evaluate(() => document.body.innerText);
    f.fkCopy = text.split('\n').filter(l => /further out/i.test(l)).map(l => l.slice(0, 160));
    const steady = page.getByRole('button', { name: /steady/i });
    if (await steady.count()) await steady.first().click({ noWaitAfter: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const start2 = page.getByRole('button', { name: 'Start steady practice' });
    if (await start2.count()) await start2.first().click({ noWaitAfter: true, timeout: 5000 }).catch(() => {});
    f.fkLabels = [];
    for (let k = 0; k < 5; k++) {
      const label = await page.locator('svg[aria-label^="Free kick"]').first().getAttribute('aria-label', { timeout: 5000 }).catch(() => null);
      f.fkLabels.push(label);
      if (k === 2) await page.screenshot({ path: path.join(OUT, `fk-kick3-${tag}.png`) });
      const kick = page.getByRole('button', { name: 'Kick', exact: true });
      if (!(await kick.count())) break;
      await kick.first().click({ noWaitAfter: true, timeout: 5000 }).catch(() => {});
      const next = page.getByRole('button', { name: /Next kick|See the run/ });
      await next.first().waitFor({ timeout: 8000 }).catch(() => {});
      await next.first().click({ noWaitAfter: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    f.errorsD = errors.slice(0, 3);
    await ctx.close();
    log(tag, JSON.stringify(f));
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify(facts, null, 2));
log('WALK DONE');

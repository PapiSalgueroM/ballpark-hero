/* Review (run lens) walk of Round 1606, a remote check extra, never committed. Opens the Everton book save in three
   variants (plain: the shipped empty table; real: every rival chair marked real with a long name, Arsenal the
   sentinel; longmade: every rival a long made up name), at 390x844 and 1280x900, reduced motion on and off. Club
   page, Match Centre, hub and the help paragraph, screenshots into RC_OUT, measured boxes printed. Host blocked. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx';
const SAVE_KEY = 'dukb-club-manager-save';
const fixture = JSON.parse(fs.readFileSync('scripts/data/cmBookSaveEvertonFixture.json', 'utf8'));
const LONG = 'Maximiliano Van Der Westhuizen-Oyelaran';
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const variant = kind => {
  const s = JSON.parse(JSON.stringify(fixture));
  for (const club of Object.keys(s.managers ?? {})) {
    if (kind === 'real') s.managers[club] = club === 'Arsenal'
      ? { name: 'Testa Realmann', since: 1, real: 1, appointed: '2025-07' }
      : { name: LONG, since: s.managers[club].since, real: 1, appointed: '2024-06' };
    if (kind === 'longmade') s.managers[club] = { name: LONG, since: s.managers[club].since };
  }
  return JSON.stringify(s);
};
const fails = [];
const fail = m => { fails.push(m); console.log(`   FAIL ${m}`); };
const browser = await chromium.launch();
const box = async loc => (await loc.count()) ? await loc.first().boundingBox().catch(() => null) : null;
const overlap = (a, b) => a && b && a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

async function walk(kind, w, h, motion) {
  const tag = `${kind}-${w}-${motion}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const raw = variant(kind);
  await ctx.addInitScript(([r, k]) => { try { localStorage.setItem(k, r); } catch { /* blocked */ } }, [raw, SAVE_KEY]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(/supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/, r => r.abort());
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await answerConsent(page, { wait: 2000 }).catch(() => {});
  const slot = page.locator('[data-cm-slot-open="resume"]').first();
  if (await slot.count()) { await slot.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500); }
  const out = { tag };
  out.hubPlay = (await box(page.locator('[data-cm-way="live"]')))?.y ?? null;
  if (motion === 'reduce') await page.screenshot({ path: path.join(OUT, `${tag}-hub.png`) });
  /* Match Centre */
  const mc = page.getByRole('button', { name: /Match Centre/ }).first();
  if (await mc.count()) {
    await mc.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const line = page.locator('[data-cm-mc-dugout]').first();
    out.mcLine = (await line.textContent().catch(() => null))?.trim() ?? null;
    out.mcKind = await line.getAttribute('data-cm-mc-dugout').catch(() => null);
    out.mcClipped = await page.locator('[data-cm-mc-dugout] > span').first().evaluate(e => e.scrollWidth > e.clientWidth + 1).catch(() => null);
    const lb = await box(line);
    const opp = page.locator('[data-cm-mc-side="opp"]').first();
    const ob = await box(opp);
    out.mcLineBox = lb ? [Math.round(lb.x), Math.round(lb.y), Math.round(lb.width), Math.round(lb.height)] : null;
    out.mcOppBox = ob ? [Math.round(ob.x), Math.round(ob.y), Math.round(ob.width), Math.round(ob.height)] : null;
    /* Does the line sit inside its block, and does it overlap a sibling of the tie block? */
    if (lb && ob && (lb.x < ob.x - 1 || lb.x + lb.width > ob.x + ob.width + 1)) fail(`${tag}: the Match Centre manager line spills out of the opponent block`);
    const sibs = await opp.locator('xpath=./*').all().catch(() => []);
    for (const s of sibs) {
      const sb = await s.boundingBox().catch(() => null);
      const isLine = await s.evaluate(e => e.hasAttribute('data-cm-mc-dugout')).catch(() => false);
      if (!isLine && overlap(lb, sb)) fail(`${tag}: the Match Centre manager line overlaps a sibling (${(await s.textContent().catch(() => '')).slice(0, 40)})`);
    }
    out.mcPlay = (await box(page.locator('button:has-text("Play Live")')))?.y ?? null;
    await page.screenshot({ path: path.join(OUT, `${tag}-matchcentre.png`) });
    if (lb) await page.screenshot({ path: path.join(OUT, `${tag}-mc-tie.png`), clip: { x: 0, y: Math.max(0, lb.y - 120), width: w, height: 200 } });
    await page.getByRole('button', { name: /Club home/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else fail(`${tag}: no Match Centre button`);
  /* Club page: Arsenal */
  await page.getByRole('tab', { name: 'Table', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const row = page.locator('button:has-text("Arsenal")').first();
  if (await row.count()) {
    await row.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const line = page.locator('[data-cm-dugout]').first();
    out.clubLine = (await line.textContent().catch(() => null))?.trim() ?? null;
    out.clubKind = await line.getAttribute('data-cm-dugout').catch(() => null);
    out.clubClipped = await page.locator('[data-cm-dugout] > span').first().evaluate(e => e.scrollWidth > e.clientWidth + 1).catch(() => null);
    const lb = await box(line);
    out.clubLineBox = lb ? [Math.round(lb.x), Math.round(lb.y), Math.round(lb.width), Math.round(lb.height)] : null;
    out.docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({ path: path.join(OUT, `${tag}-club.png`) });
  } else fail(`${tag}: no Arsenal row`);
  out.errors = errors.length;
  if (errors.length) fail(`${tag}: ${errors.length} page error(s): ${errors[0]}`);
  await ctx.close();
  return out;
}

/* The help paragraph, at each width, once (plain save). */
async function help(w, h) {
  const tag = `help-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await ctx.addInitScript(([r, k]) => { try { localStorage.setItem(k, r); } catch { /* blocked */ } }, [JSON.stringify(fixture), SAVE_KEY]);
  const page = await ctx.newPage();
  await page.route(/supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/, r => r.abort());
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await answerConsent(page, { wait: 2000 }).catch(() => {});
  await page.getByRole('button', { name: 'How to play' }).first().click({ timeout: 5000 }).catch(e => fail(`${tag}: no help button (${String(e).slice(0, 80)})`));
  await page.waitForTimeout(1500);
  const para = page.locator('[data-cm-help="real-dugouts"]').first();
  const out = { tag, found: await para.count() };
  if (out.found) {
    await para.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    out.text = (await para.textContent())?.replace(/\s+/g, ' ').trim();
    const b = await para.boundingBox();
    out.box = b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] : null;
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    if (DASHES.some(d => out.text.includes(d))) fail(`${tag}: a dash in the help paragraph`);
    if (!/every one of them is made up/.test(out.text)) fail(`${tag}: the help does not say every chair is made up while the table is empty`);
  } else fail(`${tag}: the real dugouts paragraph is not in the help`);
  await ctx.close();
  return out;
}

const rows = [];
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    for (const kind of ['plain', 'real', 'longmade']) rows.push(await walk(kind, w, h, motion));
  }
  rows.push(await help(w, h));
}
for (const r of rows) console.log(JSON.stringify(r));
for (const r of rows.filter(x => x.tag && !x.tag.startsWith('help'))) {
  const [kind, w] = r.tag.split('-');
  const all = `${r.clubLine ?? ''} ${r.mcLine ?? ''}`;
  if (DASHES.some(d => all.includes(d))) fail(`${r.tag}: a dash in a dugout line`);
  if (r.clubClipped !== false) fail(`${r.tag}: the club page manager line is cut short (${r.clubClipped})`);
  if (r.mcClipped !== false) fail(`${r.tag}: the Match Centre manager line is cut short (${r.mcClipped})`);
  if (r.docWidth && r.docWidth > Number(w) + 1) fail(`${r.tag}: the club page scrolls sideways (${r.docWidth})`);
  if (kind === 'real') {
    if (r.clubKind !== 'real' || !/^Manager: Testa Realmann · since Jul 2025$/.test(r.clubLine ?? '')) fail(`${r.tag}: the real club line reads ${JSON.stringify(r.clubLine)} (${r.clubKind})`);
    if (r.mcKind !== 'real' || /MADE UP/.test(r.mcLine ?? '')) fail(`${r.tag}: the real Match Centre line reads ${JSON.stringify(r.mcLine)} (${r.mcKind})`);
  } else {
    if (r.clubKind !== 'made-up' || !/MADE UP$/.test(r.clubLine ?? '')) fail(`${r.tag}: the made up club line reads ${JSON.stringify(r.clubLine)} (${r.clubKind})`);
    if (r.mcKind !== 'made-up' || !/MADE UP$/.test(r.mcLine ?? '')) fail(`${r.tag}: the made up Match Centre line reads ${JSON.stringify(r.mcLine)} (${r.mcKind})`);
  }
}
await browser.close();
console.log(fails.length ? `walkRun1606: ${fails.length} failure(s)` : 'walkRun1606: all green');
process.exit(fails.length ? 1 : 0);

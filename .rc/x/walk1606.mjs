/* Round 1606 walk (a remote check extra, never committed): the club page and the Match Centre at 390 and 1280,
   this build against main's, opened on the Everton book save (season one, week 15). Screenshots into RC_OUT,
   the Play buttons' y on the hub and in the Match Centre measured on both builds. The host is blocked. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const ROOT = process.cwd();
const HEAD = process.env.BASE || 'http://localhost:4173';
const MAIN_DIR = process.env.MAIN_DIR || '';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const SAVE_KEY = 'dukb-club-manager-save';
const raw = fs.readFileSync(path.join(ROOT, 'scripts/data/cmBookSaveEvertonFixture.json'), 'utf8');
let server = null;
if (MAIN_DIR) {
  server = spawn('node', ['scripts/lib/hostLikeServer.mjs', MAIN_DIR, '4174'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2000));
}
const fails = [];
const fail = m => { fails.push(m); console.log(`   FAIL ${m}`); };
const browser = await chromium.launch();

async function open(url, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([r, k]) => { try { localStorage.setItem(k, r); } catch { /* storage blocked */ } }, [raw, SAVE_KEY]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(/supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/, r => r.abort());
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await answerConsent(page, { wait: 2000 }).catch(() => {});
  const slot = page.locator('[data-cm-slot-open="resume"]').first();
  if (await slot.count()) { await slot.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500); }
  return { ctx, page, errors };
}

const yOf = async (page, locator) => {
  const el = page.locator(locator).first();
  if (!(await el.count())) return null;
  const box = await el.boundingBox();
  return box ? Math.round(box.y) : null;
};

async function walk(url, tag, w, h) {
  const { ctx, page, errors } = await open(url, w, h);
  const out = { tag, w };
  out.hubPlay = await yOf(page, '[data-cm-way="live"]');
  await page.screenshot({ path: path.join(OUT, `${tag}-${w}-hub.png`) });
  const mc = page.getByRole('button', { name: /Match Centre/ }).first();
  if (await mc.count()) {
    await mc.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    out.mcPlay = await yOf(page, 'button:has-text("Play Live")');
    out.mcDugout = await page.locator('[data-cm-mc-dugout]').first().textContent().catch(() => null);
    out.mcDugoutKind = await page.locator('[data-cm-mc-dugout]').first().getAttribute('data-cm-mc-dugout').catch(() => null);
    out.mcClipped = await page.locator('[data-cm-mc-dugout] > span').first().evaluate(e => e.scrollWidth > e.clientWidth + 1).catch(() => null);
    const tie = page.locator('[data-cm-mc-side="opp"]').first();
    out.tieHeight = (await tie.boundingBox().catch(() => null))?.height ?? null;
    await page.screenshot({ path: path.join(OUT, `${tag}-${w}-matchcentre.png`) });
    await page.getByRole('button', { name: /Club home/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else out.mcPlay = 'no Match Centre button';
  await page.getByRole('tab', { name: 'Table', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const row = page.locator('button:has-text("Arsenal")').first();
  if (await row.count()) {
    await row.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    out.clubLine = await page.locator('[data-cm-dugout]').first().textContent().catch(() => null);
    out.clubKind = await page.locator('[data-cm-dugout]').first().getAttribute('data-cm-dugout').catch(() => null);
    out.clubClipped = await page.locator('[data-cm-dugout] > span').first().evaluate(e => e.scrollWidth > e.clientWidth + 1).catch(() => null);
    out.clubLineOld = await page.locator('text=/Dugout: /').first().textContent().catch(() => null);
    await page.screenshot({ path: path.join(OUT, `${tag}-${w}-club.png`) });
  } else out.clubLine = 'no Arsenal row';
  out.errors = errors.length;
  await ctx.close();
  return out;
}

const rows = [];
for (const [w, h] of [[390, 844], [1280, 900]]) {
  rows.push(await walk(HEAD, 'head', w, h));
  if (MAIN_DIR) rows.push(await walk('http://localhost:4174', 'main', w, h));
}
for (const r of rows) console.log(JSON.stringify(r));
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const hd = rows.find(r => r.tag === 'head' && r.w === w), mn = rows.find(r => r.tag === 'main' && r.w === w);
  if (!hd) continue;
  if (!hd.clubLine || !/^Manager: .+ · since S\d+MADE UP$/.test(hd.clubLine.trim())) fail(`${w}: the club page dugout line reads ${JSON.stringify(hd.clubLine)}`);
  if (hd.clubKind !== 'made-up') fail(`${w}: the club page dugout is ${hd.clubKind}, expected made-up with the table empty`);
  if (!hd.mcDugout || !/^Manager: .+MADE UP$/.test(hd.mcDugout.trim())) fail(`${w}: the Match Centre line reads ${JSON.stringify(hd.mcDugout)}`);
  if (hd.errors) fail(`${w}: ${hd.errors} page errors`);
  if (hd.mcClipped !== false) fail(`${w}: the Match Centre manager name is cut short (${hd.mcClipped})`);
  if (hd.clubClipped !== false) fail(`${w}: the club page manager line is cut short (${hd.clubClipped})`);
  if (mn && typeof hd.hubPlay === 'number' && typeof mn.hubPlay === 'number' && hd.hubPlay !== mn.hubPlay) fail(`${w}: the hub Play button moved from ${mn.hubPlay} to ${hd.hubPlay}`);
  if (mn && typeof hd.mcPlay === 'number' && typeof mn.mcPlay === 'number') {
    const fold = h;
    console.log(`   ${w}: Match Centre Play Live y ${mn.mcPlay} on main, ${hd.mcPlay} here (${hd.mcPlay - mn.mcPlay} px), fold ${fold}`);
    if (mn.mcPlay < fold && hd.mcPlay >= fold) fail(`${w}: the new line pushes Play Live under the fold (${mn.mcPlay} to ${hd.mcPlay})`);
  }
}
await browser.close();
if (server) server.kill();
console.log(fails.length ? `walk1606: ${fails.length} failure(s)` : 'walk1606: all green');
process.exit(fails.length ? 1 : 0);

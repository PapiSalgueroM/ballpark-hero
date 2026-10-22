// Reviewer walk for Round 1543 (runner only, #!serve #!playwright). An OLD save (a base player's counters and badges)
// opens on the head: what a player sees on the first tick, in the Badges drawer and after a trip.
//   node .rc/x/walk1543.mjs        WALK_CONTROL=nobadge (the lowered rungs already held: the badge line must NOT come)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { build } from 'esbuild';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.walk-out');
const CONTROL = process.env.WALK_CONTROL || '';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'stadiumTycoonSaveV1';
const LADDER = new Set(['win1', 'win10', 'win50', 'goals25', 'streak5', 'aw1', 'aw10', 'aw50', 'aw150', 'aw400', 'ag25', 'ag100', 'ag500', 'ag2000', 'as5', 'as10']);
const etmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1543-'));
await build({ entryPoints: [path.join(ROOT, 'src/lib/stadiumTycoon.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(etmp, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const T = await import(pathToFileURL(path.join(etmp, 'e.mjs')).href);
let failures = 0; const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const facts = {};
const browser = await chromium.launch();
const context = async (w, h, reduced) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  return ctx;
};
const dismissConsent = async page => { const reject = page.getByRole('button', { name: 'Reject all' }); if (await reject.count()) await reject.first().click({ noWaitAfter: true }).catch(() => {}); };
async function freshSave(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
  await p.waitForFunction(k => !!localStorage.getItem(k), KEY, { timeout: 20000 });
  const fresh = JSON.parse(await p.evaluate(k => localStorage.getItem(k), KEY));
  await p.close({ runBeforeUnload: true });
  return fresh;
}
/* A player of the base (thresholds 10, 25, 50, 100): 49 wins and 140 goals hold aw1 aw10 ag25 ag100 and the
   milestones win1 win10 goals25. On the head (8, 10, 35, 30, 75) the first tick owes aw50, ag500 and win50. */
/* Realistic: every NON ladder badge and milestone the planted state already hits is held too (a real base save
   with 80 matches and $2M lifetime would hold them), so the first tick owes exactly the three lowered rungs. */
const oldSave = fresh => {
  const s0 = { ...fresh, totalWins: 49, totalGoals: 140, totalMatches: 80, streak: 0, lifetime: 2e6, money: 50000 };
  const keepAch = T.ACHIEVEMENTS.filter(a => !LADDER.has(a.id) && a.hit(s0)).map(a => a.id);
  const keepMs = T.MILESTONES.filter(m => !LADDER.has(m.id) && m.hit(s0)).map(m => m.id);
  const held = CONTROL === 'nobadge' ? ['aw50', 'ag500'] : []; const heldMs = CONTROL === 'nobadge' ? ['win50'] : [];
  return { ...s0, ach: [...keepAch, 'aw1', 'aw10', 'ag25', 'ag100', ...held], claimed: [...keepMs, 'win1', 'win10', 'goals25', ...heldMs] };
};
async function plant(ctx, save, agoMs) {
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(({ k, v, ago }) => {
    if (sessionStorage.getItem('walk1543-planted')) return;
    sessionStorage.setItem('walk1543-planted', '1');
    const s = JSON.parse(v); s.savedAt = Date.now() - ago; localStorage.setItem(k, JSON.stringify(s));
    Math.random = () => 0.999;
  }, { k: KEY, v: JSON.stringify(save), ago: agoMs });
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
  return { page, errors };
}
const sizes = CONTROL ? [[390, 844]] : [[390, 844], [1280, 900]];
for (const [w, h] of sizes) for (const reduced of CONTROL ? [false] : [false, true]) {
  const tag = `${w}x${h}${reduced ? '-reduced' : ''}`; const f = facts[`first-${tag}`] = {};
  const ctx = await context(w, h, reduced);
  const { page, errors } = await plant(ctx, oldSave(await freshSave(ctx)), 5000);
  const y0 = await page.evaluate(() => window.scrollY);
  let line = '';
  for (let i = 0; i < 120 && !line; i += 1) { line = await page.evaluate(() => (document.body.innerText.match(/🏅 Badge earned: [^\n]*/) || [''])[0]); if (!line) await page.waitForTimeout(50); }
  f.badgeLine = line;
  f.floaters = await page.$$eval('.st-float', els => els.map(e => { const r = e.getBoundingClientRect(); const p = e.parentElement.getBoundingClientRect(); return { t: e.textContent, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), outRight: Math.round(r.right - p.right) }; }));
  f.overlaps = [];
  for (let i = 0; i < f.floaters.length; i += 1) for (let j = i + 1; j < f.floaters.length; j += 1) {
    const a = f.floaters[i]; const b = f.floaters[j];
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    if (ix * iy > 0.3 * Math.min(a.w * a.h, b.w * b.h)) f.overlaps.push(`"${a.t}" over "${b.t}" (${Math.round((100 * ix * iy) / Math.min(a.w * a.h, b.w * b.h))} percent)`);
  }
  await page.screenshot({ path: path.join(OUT, `${CONTROL ? `${CONTROL}-` : ''}first-${tag}.png`) });
  if (CONTROL === 'nobadge') { if (line) fail(`${tag} control: a badge line came for rungs already held: ${line}`); else fail(`${tag} control FIRED: no badge line, as it must not come`); await ctx.close(); continue; }
  if (!line) fail(`${tag}: no badge line on the first tick of an old save past aw50 and ag500`);
  await dismissConsent(page); await page.waitForTimeout(6500);
  const saved = JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEY));
  f.ach = saved.ach; f.claimed = saved.claimed; f.money = saved.money;
  for (const id of ['aw1', 'aw10', 'ag25', 'ag100', 'aw50', 'ag500']) if (!saved.ach.includes(id)) fail(`${tag}: the saved game lacks badge ${id}`);
  for (const id of ['win1', 'win10', 'goals25', 'win50']) if (!saved.claimed.includes(id)) fail(`${tag}: the saved game lacks milestone ${id}`);
  for (const id of ['aw150', 'ag2000']) if (saved.ach.includes(id)) fail(`${tag}: ${id} was granted at 49 wins and 140 goals`);
  if (new Set(saved.ach).size !== saved.ach.length || new Set(saved.claimed).size !== saved.claimed.length) fail(`${tag}: a duplicate id in the save`);
  f.scroll = `${y0} to ${await page.evaluate(() => window.scrollY)}`;
  await page.locator('[data-office-panel="ach"]').first().click({ noWaitAfter: true });
  await page.waitForTimeout(400);
  const list = page.locator('div.grid', { has: page.locator('text=125 career wins') }).first();
  await list.scrollIntoViewIfNeeded().catch(() => {});
  f.badges = await page.$$eval('.truncate', els => els.map(e => ({ t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1 })).filter(x => /goals|career wins|straight/.test(x.t)));
  for (const b of f.badges) if (b.cut) fail(`${tag}: badge label "${b.t}" is cut`);
  f.overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (f.overflow > 0) fail(`${tag}: the page scrolls sideways by ${f.overflow} px`);
  await page.screenshot({ path: path.join(OUT, `badges-${tag}.png`) });
  if (errors.length) fail(`${tag}: page errors ${errors.join(' | ')}`);
  await ctx.close();
}
if (!CONTROL) for (const [w, h] of [[390, 844], [1280, 900]]) {
  const tag = `${w}x${h}`; const f = facts[`trip-${tag}`] = {};
  const ctx = await context(w, h, false);
  const { page, errors } = await plant(ctx, oldSave(await freshSave(ctx)), 2 * 3600 * 1000);
  const dlg = page.getByText('While you were away').first();
  await dlg.waitFor({ timeout: 15000 }).catch(() => fail(`${tag}: no While you were away card after two hours`));
  await page.waitForTimeout(500);
  f.card = (await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(x => /While you were away/.test(x.textContent)); return d ? d.innerText : ''; })).replace(/\s+/g, ' ').slice(0, 700);
  f.milestoneLine = (f.card.match(/Milestones reached on the road: \+\S+/) || [''])[0];
  await page.screenshot({ path: path.join(OUT, `trip-${tag}.png`) });
  if (errors.length) fail(`${tag}: page errors ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, `${CONTROL ? `${CONTROL}-` : ''}walk1543.json`), JSON.stringify(facts, null, 2));
for (const [k, v] of Object.entries(facts)) console.log(`  ${k}: ${JSON.stringify(v).slice(0, 900)}`);
console.log(`walk1543${CONTROL ? ` (control ${CONTROL})` : ''}: ${failures ? `${failures} failure${failures === 1 ? '' : 's'}` : 'green'}`);
process.exit(failures ? 1 : 0);

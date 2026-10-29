// Skeptic probe for finding BS-sc421-2: the Season Centre and trophy cabinet loading layers with their chunk stalled.
// Never committed. Writes JSON and screenshots into RC_OUT.
import pw from '../../scripts/lib/playwrightLoader.mjs';
import fs from 'node:fs';
const { chromium } = pw;
const BASE = process.env.SWEEP_BASE || 'http://localhost:4173';
const TAG = process.env.TAG || 'pr';
const OUT = process.env.RC_OUT || '/tmp';
const ONLY = process.env.ONLY || 'CTK';
const log = [];
const note = (k, v) => { log.push({ k, v }); console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
const browser = await chromium.launch();

async function ctxFor(vp, stall) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 500 });
  await ctx.addInitScript(() => {
    let t = 7771;
    Math.random = () => { t = (t * 1103515245 + 12345) >>> 0; return t / 4294967296; };
    if (!sessionStorage.getItem('vf-init')) { try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('cookie-consent-v2', JSON.stringify({ v: 2, essential: true, analytics: false, ads: false })); } catch {} }
    sessionStorage.setItem('vf-init', '1');
  });
  await ctx.route(/supabase\.co/, r => r.abort());
  const held = [];
  held.release = async () => { held.open = true; for (const r of held.splice(0)) await r.continue().catch(() => {}); };
  if (stall) await ctx.route(stall, r => { if (held.open) return r.continue(); held.push(r); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  return { ctx, page, held, errors };
}
const save = page => page.evaluate(() => { const r = localStorage.getItem('soccerCareerSave'); if (!r) return null; const s = JSON.parse(r); return { phase: s.phase, age: s.age, seasons: (s.seasons || []).length }; });
async function combo(page, trigger, wanted) {
  await page.locator('[role="combobox"]', { hasText: trigger }).first().click();
  await page.waitForSelector('[role="option"]', { timeout: 8000 });
  await page.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; (o.find(x => x.textContent.includes(w)) || o[0]).click(); }, wanted);
  await page.waitForTimeout(300);
}
async function newCareer(page) {
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await page.fill('input[placeholder*="player name"]', 'Skeptic Probe');
  await combo(page, 'Choose nationality', 'England');
  await combo(page, 'Choose position', 'Striker');
  await combo(page, 'Choose era', 'Current era');
  await page.getByRole('button', { name: /Generate Starting Potential/ }).click();
  await page.waitForTimeout(2600);
  await page.getByRole('button', { name: /Begin Career/ }).click();
  await page.waitForTimeout(1500);
}
const ORDER = ['Sign contract', 'Review contract', 'Join Club', 'Next Year', 'Next Season', 'Continue', 'Sign Contract', 'Accept', 'Confirm', 'Proceed', 'Next', 'Done', 'Close'];
const NOPE = /Retire|New Career|Report a problem|Light mode|Sound: |Cookie|Sign up|^Back$|Full attributes|Reject all|Essential only|^Accept all$|^Save choices$|^⏸$|^🏋️|^📱|^📺|Pundit/;
async function toPlaying(page) {
  const trail = [];
  for (let i = 0; i < 40; i++) {
    const s = await save(page);
    if (s && s.phase === 'playing') return { ok: true, s, trail: trail.slice(-5) };
    const did = await page.evaluate(async ([order, nope]) => {
      const re = new RegExp(nope);
      const bs = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !re.test(b.textContent.trim()) && !b.closest('[data-site-chrome]') && !b.hasAttribute('data-week-by-week'));
      for (const a of order) { const b = bs.find(x => x.textContent.trim().startsWith(a)); if (b) { b.click(); await new Promise(r => setTimeout(r, 650)); return b.textContent.trim().slice(0, 24); } }
      return 'STUCK';
    }, [ORDER, NOPE.source]);
    trail.push(`${s?.phase}@${s?.age}:${did}`);
  }
  return { ok: false, s: await save(page), trail: trail.slice(-8) };
}
// Every visible control whose own centre a tap would land on (elementFromPoint is it or inside it).
const reachable = page => page.evaluate(() => [...document.querySelectorAll('button, a[href], [role=button], input, select, textarea, summary')].filter(b => {
  const r = b.getBoundingClientRect(); if (!r.width || !r.height) return false;
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
  const at = document.elementFromPoint(x, y); return at && (at === b || b.contains(at));
}).map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 40)));
// Where a control is and what sits on top of its centre.
const cover = (page, re) => page.evaluate(src => {
  const el = [...document.querySelectorAll('button, a[href]')].find(e => new RegExp(src).test((e.getAttribute('aria-label') || '') + ' ' + e.textContent.trim()) && e.getBoundingClientRect().width > 0);
  if (!el) return { found: false };
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const at = document.elementFromPoint(x, y);
  const top = at && !(at === el || el.contains(at)) ? (at.closest('[data-season-centre-loading],[data-trophy-loading],[data-training-loading]')?.getAttribute('class') || at.tagName) : null;
  return { found: true, label: el.textContent.trim().slice(0, 40), x: Math.round(x), y: Math.round(y), onTop: !top, coveredBy: top };
}, re.source);
const count = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);
const focusNow = page => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName} ${(a.getAttribute('aria-label') || a.textContent.trim()).slice(0, 36)}` : 'none'; });
const sum = {};
const tapAt = async (page, c) => { if (c.found) await page.mouse.click(c.x, c.y); await page.waitForTimeout(800); };

// C: the Season Centre chunk held, reached through Week by week from the playing phase.
async function scenarioCentre(vp) {
  const tag = `C ${TAG} ${vp.width}`;
  console.log(`\n${tag}`);
  const { ctx, page, held, errors } = await ctxFor(vp, /\/assets\/SoccerSeasonCentre-[^/]*\.js/);
  await newCareer(page);
  const p = await toPlaying(page);
  note(`${tag} reached playing`, p);
  if (!p.ok) { sum[tag] = 'no playing phase'; await ctx.close(); return; }
  const wk = await cover(page, /Week by week/);
  note(`${tag} week by week`, wk);
  await tapAt(page, wk);
  const shown = await page.waitForSelector('[data-season-centre-loading]', { timeout: 6000 }).then(() => true, () => false);
  const after = await save(page);
  note(`${tag} layer shown`, shown);
  note(`${tag} held chunk requests`, held.length);
  note(`${tag} save before / after the press`, { before: p.s, after });
  if (!shown) { sum[tag] = 'layer never shown'; await ctx.close(); return; }
  const inLayer = await count(page, '[data-season-centre-loading] button, [data-season-centre-loading] a, [data-season-centre-loading] [tabindex], [data-season-centre-loading] [role=dialog]');
  note(`${tag} controls or dialog inside the layer`, inLayer);
  const reach = await reachable(page);
  note(`${tag} controls a tap can reach`, reach);
  const cont = await cover(page, /Continue to Season Summary/);
  note(`${tag} Continue to Season Summary`, cont);
  await tapAt(page, cont);
  note(`${tag} after a real tap on Continue: save, layer`, { save: await save(page), layer: await count(page, '[data-season-centre-loading]') });
  await page.evaluate(() => window.scrollTo(0, 0));
  const menu = await cover(page, /Open site menu/);
  note(`${tag} site menu button`, menu);
  const dlgBefore = await count(page, '[role=dialog], [role=menu]');
  await tapAt(page, menu);
  note(`${tag} after a real tap on the site menu: dialogs or menus before, after, layer`, [dlgBefore, await count(page, '[role=dialog], [role=menu]'), await count(page, '[data-season-centre-loading]')]);
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const escUp = await count(page, '[data-season-centre-loading]');
  note(`${tag} layer still up after Escape`, escUp);
  await page.screenshot({ path: `${OUT}/vfC-${TAG}-${vp.width}.png` }).catch(() => {});
  await page.waitForTimeout(20000);
  const lateUp = await count(page, '[data-season-centre-loading]');
  note(`${tag} layer still up 20 s later, held`, [lateUp, held.length]);
  // Once any toast has gone: what sits on the site menu button now, and does a real tap open anything?
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const toasts = await count(page, '[data-sonner-toast], [role=status] li, ol li[data-sonner-toast]');
  const lateMenu = await page.evaluate(() => {
    const b = document.querySelector('[aria-label="Open site menu"]'); if (!b) return { found: false };
    const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const at = document.elementFromPoint(x, y);
    const own = at && (at === b || b.contains(at));
    const lay = at && at.closest('[data-season-centre-loading]');
    return { found: true, x: Math.round(x), y: Math.round(y), onTop: own, coveredByLayer: !!lay, top: own ? 'itself' : (lay ? 'season centre loading layer' : (at ? at.outerHTML.slice(0, 120) : 'none')) };
  });
  note(`${tag} LATE toasts up, site menu button`, [toasts, lateMenu]);
  const dlg0 = await count(page, '[role=dialog], [role=menu]');
  if (lateMenu.found) { await page.mouse.click(lateMenu.x, lateMenu.y); await page.waitForTimeout(800); }
  note(`${tag} LATE real tap on the site menu: dialogs or menus before, after; layer; reachable now`, [dlg0, await count(page, '[role=dialog], [role=menu]'), await count(page, '[data-season-centre-loading]'), await reachable(page)]);
  // Keyboard only: Tab moves focus under the layer (no trap). Does Enter on Continue get him out?
  const tabs = [];
  let onCont = false;
  for (let i = 0; i < 60 && !onCont; i++) { await page.keyboard.press('Tab'); const f = await focusNow(page); tabs.push(f); onCont = /Continue to Season Summary/.test(f); }
  note(`${tag} Tab presses to reach Continue`, { reached: onCont, presses: tabs.length, first: tabs.slice(0, 4) });
  if (onCont) { await page.keyboard.press('Enter'); await page.waitForTimeout(900); note(`${tag} after Enter on focused Continue: save, layer`, { save: await save(page), layer: await count(page, '[data-season-centre-loading]') }); }
  // Control: release the held chunk; the layer must give way to the Centre itself.
  await held.release();
  const gone = await page.waitForFunction(() => !document.querySelector('[data-season-centre-loading]'), null, { timeout: 15000 }).then(() => true, () => false);
  note(`${tag} CONTROL layer gone after release, dialogs now`, [gone, await count(page, '[role=dialog]')]);
  note(`${tag} page errors`, errors);
  sum[tag] = { advanced: after.seasons > p.s.seasons || after.phase !== p.s.phase, phaseUnder: after.phase, inLayer, reach: reach.length, contOnTop: cont.onTop, menuOnTop: menu.onTop, escUp, lateUp, releaseClears: gone };
  await ctx.close();
}

// K: control, nothing held. The layer is a transient: how long does it last on a healthy load?
async function scenarioHealthy(vp) {
  const tag = `K ${TAG} ${vp.width}`;
  console.log(`\n${tag}`);
  const { ctx, page, errors } = await ctxFor(vp, null);
  await newCareer(page);
  const p = await toPlaying(page);
  if (!p.ok) { sum[tag] = 'no playing phase'; await ctx.close(); return; }
  const wk = await cover(page, /Week by week/);
  await tapAt(page, wk);
  const gone = await page.waitForFunction(() => !document.querySelector('[data-season-centre-loading]'), null, { timeout: 15000 }).then(() => true, () => false);
  const dialogs = await count(page, '[role=dialog]');
  note(`${tag} healthy: layer gone, dialogs, save`, [gone, dialogs, await save(page)]);
  note(`${tag} page errors`, errors);
  sum[tag] = { layerGone: gone, dialogs };
  await ctx.close();
}

// T: the trophy cabinet chunk held, opened from a trophy tile.
async function scenarioTrophy(vp) {
  const tag = `T ${TAG} ${vp.width}`;
  console.log(`\n${tag}`);
  const { ctx, page, held, errors } = await ctxFor(vp, /\/assets\/TrophyCabinet-[^/]*\.js/);
  await newCareer(page);
  let tile = await cover(page, /Leagues: .*View winning seasons/);
  if (!tile.found) { note(`${tag} no tile at career start, going to playing`, (await toPlaying(page)).ok); tile = await cover(page, /Leagues: .*View winning seasons/); }
  const before = await save(page);
  note(`${tag} trophy tile, save`, [tile, before]);
  await tapAt(page, tile);
  const shown = await page.waitForSelector('[data-trophy-loading]', { timeout: 6000 }).then(() => true, () => false);
  note(`${tag} layer shown, held`, [shown, held.length]);
  if (!shown) { sum[tag] = 'layer never shown'; await ctx.close(); return; }
  const inLayer = await count(page, '[data-trophy-loading] button, [data-trophy-loading] a, [data-trophy-loading] [tabindex], [data-trophy-loading] [role=dialog]');
  const reach = await reachable(page);
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const escUp = await count(page, '[data-trophy-loading]');
  note(`${tag} controls inside, reachable, up after Escape`, [inLayer, reach, escUp]);
  await page.screenshot({ path: `${OUT}/vfT-${TAG}-${vp.width}.png` }).catch(() => {});
  await page.waitForTimeout(10000);
  const lateUp = await count(page, '[data-trophy-loading]');
  await held.release();
  const gone = await page.waitForFunction(() => !document.querySelector('[data-trophy-loading]'), null, { timeout: 15000 }).then(() => true, () => false);
  note(`${tag} up 10 s later; CONTROL gone after release`, [lateUp, gone]);
  note(`${tag} save unchanged`, JSON.stringify(await save(page)) === JSON.stringify(before));
  note(`${tag} page errors`, errors);
  sum[tag] = { inLayer, reach: reach.length, escUp, lateUp, releaseClears: gone };
  await ctx.close();
}

let crashed = false;
try {
  if (ONLY.includes('C')) { await scenarioCentre({ width: 390, height: 844 }); await scenarioCentre({ width: 320, height: 568 }); }
  if (ONLY.includes('K')) await scenarioHealthy({ width: 390, height: 844 });
  if (ONLY.includes('T')) await scenarioTrophy({ width: 390, height: 844 });
} catch (e) { crashed = true; console.log('ERROR ' + String(e.stack || e).slice(0, 600)); }
await browser.close();
fs.writeFileSync(`${OUT}/vfwalk-${TAG}.json`, JSON.stringify({ sum, log }, null, 1));
console.log('SUMMARY ' + JSON.stringify(sum));
console.log(`vfwalk ${TAG}: ${crashed ? 'probe crashed' : 'probe completed'}`);
process.exit(crashed ? 1 : 0);

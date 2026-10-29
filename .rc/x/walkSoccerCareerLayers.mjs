/* Release BS fix walk for BS-sc421-2, BS-sc421-3, BS-sc421-4 and BS-sc421-5 (never committed; built on the
   verifiers' vfwalk.mjs and punditbar.mjs). A built site, Supabase aborted, seeded Math.random, real careers.
   C  Season Centre chunk held, Week by week from playing: the layer has Back to career, Tab x3 stays on it,
      Escape closes it, the save is not changed by the close.                     (390, 320)
   T  trophy cabinet chunk held: Back to career closes it, then the backdrop closes it again.   (390)
   A  training chunk held: Tab x3 stays on Back to career, Escape closes it.        (390)
   P  a pundit season reached by retiring: no Next Season in the bar, the plain line under the panel heading,
      and Praise a Rising Star moves the season (control).                         (390, 320)
   E  cookie choices left unanswered: the bar's Next Season is on top at the page top.  (320, 390, 1280)
   ONLY picks scenarios (default CTAPE). Exit 0 green, 1 a check failed, 2 could not run. */
import pw from '../../scripts/lib/playwrightLoader.mjs';
import fs from 'node:fs';
const { chromium } = pw;
const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://localhost:4173';
const TAG = process.env.TAG || 'head';
const OUT = process.env.RC_OUT || '.tmp-fx';
const ONLY = process.env.ONLY || 'CTAPE';
let failures = 0;
const check = (ok, what, data) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${TAG} ${what} ${JSON.stringify(data ?? '')}`); if (!ok) failures += 1; };
const browser = await chromium.launch();

async function ctxFor(vp, stall, consent = true) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 500 });
  await ctx.addInitScript(ok => {
    let t = 7771;
    Math.random = () => { t = (t * 1103515245 + 12345) >>> 0; return t / 4294967296; };
    if (ok && !sessionStorage.getItem('fx-init')) { try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('cookie-consent-v2', JSON.stringify({ v: 2, essential: true, analytics: false, ads: false })); } catch {} }
    sessionStorage.setItem('fx-init', '1');
  }, consent);
  await ctx.route(/supabase\.co/, r => r.abort());
  const held = [];
  held.release = async () => { held.open = true; for (const r of held.splice(0)) await r.continue().catch(() => {}); };
  if (stall) await ctx.route(stall, r => { if (held.open) return r.continue(); held.push(r); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  return { ctx, page, held, errors };
}
const save = page => page.evaluate(() => { const r = localStorage.getItem('soccerCareerSave'); if (!r) return null; const s = JSON.parse(r); return { phase: s.phase, age: s.age, seasons: (s.seasons || []).length, pundit: s.punditState?.season ?? null }; });
async function combo(page, trigger, wanted) {
  await page.locator('[role="combobox"]', { hasText: trigger }).first().click();
  await page.waitForSelector('[role="option"]', { timeout: 8000 });
  await page.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; (o.find(x => x.textContent.includes(w)) || o[0]).click(); }, wanted);
  await page.waitForTimeout(300);
}
async function newCareer(page) {
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await page.fill('input[placeholder*="player name"]', 'Fix Walk');
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
const pressOne = page => page.evaluate(async ([order, nope]) => {
  const re = new RegExp(nope);
  const bs = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !re.test(b.textContent.trim()) && !b.closest('[data-site-chrome]') && !b.hasAttribute('data-week-by-week'));
  for (const a of order) { const b = bs.find(x => x.textContent.trim().startsWith(a)); if (b) { b.click(); await new Promise(r => setTimeout(r, 650)); return b.textContent.trim().slice(0, 24); } }
  return 'STUCK';
}, [ORDER, NOPE.source]);
async function toPlaying(page) {
  for (let i = 0; i < 40; i++) {
    const s = await save(page);
    if (s && s.phase === 'playing') return s;
    if (await pressOne(page) === 'STUCK') break;
  }
  return null;
}
const count = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);
const focusLabel = page => page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent.trim()).slice(0, 30) : 'none'; });
async function tabTrap(page) {
  const seen = [];
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); seen.push(await focusLabel(page)); }
  return seen;
}
const clickMatching = (page, src) => page.evaluate(s => {
  const re = new RegExp(s);
  const el = [...document.querySelectorAll('button, a[href]')].find(e => re.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent.trim()) && e.getBoundingClientRect().width > 0);
  if (el) el.click();
  return !!el;
}, src);
async function layerChecks(tag, page, sel, after) {
  const buttons = await page.locator(`${sel} button`).allTextContents();
  check(buttons.length === 1 && /Back to career/.test(buttons[0] ?? ''), `${tag} the layer has its Back to career button`, buttons);
  const tabs = await tabTrap(page);
  check(tabs.every(t => t === 'Back to career'), `${tag} Tab stays inside the layer`, tabs);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check(await count(page, sel) === 0, `${tag} Escape closes the layer`);
  check(JSON.stringify(await save(page)) === JSON.stringify(after), `${tag} closing leaves the save as it was`, after);
}
async function scenarioCentre(vp) {
  const tag = `C ${vp.width}`;
  const { ctx, page, held, errors } = await ctxFor(vp, /\/assets\/SoccerSeasonCentre-[^/]*\.js/);
  try {
    await newCareer(page);
    if (!(await toPlaying(page))) return check(false, `${tag} reached playing`);
    await page.locator('[data-week-by-week]').click();
    const shown = await page.waitForSelector('[data-season-centre-loading]', { timeout: 6000 }).then(() => true, () => false);
    check(shown, `${tag} layer shown with the chunk held`, { held: held.length });
    if (shown) await layerChecks(tag, page, '[data-season-centre-loading]', await save(page));
    check(errors.length === 0, `${tag} no page errors`, errors.slice(0, 2));
  } finally { await ctx.close(); }
}
async function scenarioTraining(vp) {
  const tag = `A ${vp.width}`;
  const { ctx, page, errors } = await ctxFor(vp, /\/assets\/TrainingPanel-[^/]*\.js/);
  try {
    await newCareer(page);
    if (!(await toPlaying(page))) return check(false, `${tag} reached playing`);
    await page.locator('[aria-label="Open the training ground"]').first().click();
    const shown = await page.waitForSelector('[data-training-loading]', { timeout: 6000 }).then(() => true, () => false);
    check(shown, `${tag} layer shown with the chunk held`);
    if (shown) await layerChecks(tag, page, '[data-training-loading]', await save(page));
    check(errors.length === 0, `${tag} no page errors`, errors.slice(0, 2));
  } finally { await ctx.close(); }
}
async function scenarioTrophy(vp) {
  const tag = `T ${vp.width}`;
  const { ctx, page, errors } = await ctxFor(vp, /\/assets\/TrophyCabinet-[^/]*\.js/);
  try {
    await newCareer(page);
    let before = await save(page);
    let opened = await clickMatching(page, 'View winning seasons');
    if (!opened) { await toPlaying(page); before = await save(page); opened = await clickMatching(page, 'View winning seasons'); }
    if (!opened) return check(false, `${tag} a trophy tile to open`);
    const shown = await page.waitForSelector('[data-trophy-loading]', { timeout: 6000 }).then(() => true, () => false);
    check(shown, `${tag} layer shown with the chunk held`);
    if (!shown) return;
    const back = page.locator('[data-trophy-loading] button', { hasText: 'Back to career' });
    check(await back.count() === 1, `${tag} Back to career is there`);
    if (await back.count()) { await back.click(); await page.waitForTimeout(400); }
    check(await count(page, '[data-trophy-loading]') === 0, `${tag} Back to career closes the layer`);
    await clickMatching(page, 'View winning seasons');
    await page.waitForSelector('[data-trophy-loading]', { timeout: 6000 }).catch(() => {});
    await page.mouse.click(3, Math.round(vp.height / 2));
    await page.waitForTimeout(400);
    check(await count(page, '[data-trophy-loading]') === 0, `${tag} a tap on the backdrop closes the layer`);
    check(JSON.stringify(await save(page)) === JSON.stringify(before), `${tag} the save is unchanged`);
    check(errors.length === 0, `${tag} no page errors`, errors.slice(0, 2));
  } finally { await ctx.close(); }
}

async function scenarioPundit(vp) {
  const tag = `P ${vp.width}`;
  const { ctx, page, errors } = await ctxFor(vp, null);
  try {
    await newCareer(page);
    if (!(await toPlaying(page))) return check(false, `${tag} reached playing`);
    await page.getByRole('button', { name: /^🚪 Retire$/ }).first().click({ timeout: 8000 });
    await page.getByRole('button', { name: /Confirm Retirement/ }).click({ timeout: 8000 });
    await page.waitForTimeout(900);
    for (let i = 0; i < 12; i++) {
      const s = await save(page);
      if (s.phase === 'pundit_season') break;
      const tv = page.getByRole('button', { name: /Become a TV Pundit/ });
      if (await tv.count()) { await tv.first().click(); await page.waitForTimeout(900); continue; }
      if (await pressOne(page) === 'STUCK') break;
    }
    const p0 = await save(page);
    if (p0.phase !== 'pundit_season') return check(false, `${tag} reached a pundit season`, p0);
    const bar = await page.locator('[data-career-action-bar] button').allTextContents();
    check(!bar.some(t => /Next Season/.test(t)), `${tag} no Next Season in the pundit bar`, bar);
    const line = await page.locator('[data-pundit-next]').textContent().catch(() => null);
    check(!!line && /move on to the next/.test(line), `${tag} the panel says a pick moves the season on`, line);
    await page.getByRole('button', { name: /Praise a Rising Star/ }).click();
    await page.waitForTimeout(700);
    const p1 = await save(page);
    check((p1.pundit ?? -1) > (p0.pundit ?? 0), `${tag} control: a pundit pick moves the season`, { before: p0.pundit, after: p1.pundit });
    check(errors.length === 0, `${tag} no page errors`, errors.slice(0, 2));
  } finally { await ctx.close(); }
}
async function scenarioBanner(vp) {
  const tag = `E ${vp.width}`;
  const { ctx, page, errors } = await ctxFor(vp, null, false);
  try {
    await newCareer(page);
    if (!(await toPlaying(page))) return check(false, `${tag} reached playing`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const banner = await count(page, '[aria-label="Cookie choices"]');
    const next = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[data-career-action-bar] button')].find(b => /^Next Season/.test(b.textContent.trim()));
      if (!el) return { found: false };
      const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { found: true, y: Math.round(r.top), onTop: !!at && (at === el || el.contains(at)), inView: r.top >= 0 && r.bottom <= innerHeight };
    });
    check(banner > 0, `${tag} the cookie choices are up (control)`, { banner });
    check(next.found && next.onTop && next.inView, `${tag} Next Season shows above the unanswered cookie choices`, next);
    check(errors.length === 0, `${tag} no page errors`, errors.slice(0, 2));
  } finally { await ctx.close(); }
}
const phone = { width: 390, height: 844 }, small = { width: 320, height: 568 }, wide = { width: 1280, height: 800 };
try {
  if (ONLY.includes('C')) { await scenarioCentre(phone); await scenarioCentre(small); }
  if (ONLY.includes('T')) await scenarioTrophy(phone);
  if (ONLY.includes('A')) await scenarioTraining(phone);
  if (ONLY.includes('P')) { await scenarioPundit(phone); await scenarioPundit(small); }
  if (ONLY.includes('E')) { await scenarioBanner(small); await scenarioBanner(phone); await scenarioBanner(wide); }
} catch (e) { console.log('ERROR ' + String(e.stack || e).slice(0, 600)); await browser.close(); console.log(`sclayers ${TAG}: could not run`); process.exit(2); }
await browser.close();
console.log(failures ? `sclayers ${TAG}: RED, ${failures} failure(s)` : `sclayers ${TAG}: green`);
process.exit(failures ? 1 : 0);

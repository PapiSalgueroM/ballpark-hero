// Review BS, PR 421: the Training loading layer, its siblings, and a dead Next Season. Reviewer probe, never committed.
import pw from '../../scripts/lib/playwrightLoader.mjs';
import fs from 'node:fs';
const { chromium } = pw;
const BASE = process.env.SWEEP_BASE || 'http://localhost:4173';
const TAG = process.env.TAG || 'pr';
const OUT = process.env.RC_OUT || '/tmp';
const ONLY = process.env.ONLY || '';
const results = [];
let fails = 0;
const note = (k, v) => { results.push({ k, v }); console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ': ' + JSON.stringify(detail) : ''}`); };
const browser = await chromium.launch();

async function ctxFor(vp, { consent = true, stall = [] } = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(([c]) => {
    let t = 20261028;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    if (c && !sessionStorage.getItem('rv-init')) { try { localStorage.setItem('cookie-consent', 'essential'); } catch {} }
    sessionStorage.setItem('rv-init', '1');
  }, [consent]);
  const held = [];
  await ctx.route(/supabase\.co/, r => r.abort());
  for (const re of stall) await ctx.route(re, r => { if (held.released) return r.continue(); held.push(r); /* never answered until released */ });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  return { ctx, page, held, errors };
}

async function pickCombo(page, triggerText, wanted) {
  await page.locator('[role="combobox"]', { hasText: triggerText }).first().click();
  await page.waitForSelector('[role="option"]', { timeout: 8000 });
  await page.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; const h = o.find(x => x.textContent.includes(w)) || o[0]; h.scrollIntoView(); h.click(); }, wanted);
  await page.waitForTimeout(300);
}
async function createCareer(page) {
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await page.fill('input[placeholder*="player name"]', 'Review Tester');
  await pickCombo(page, 'Choose nationality', 'England');
  await pickCombo(page, 'Choose position', 'Striker');
  await pickCombo(page, 'Choose era', 'Current era');
  await page.getByRole('button', { name: /Generate Starting Potential/ }).click();
  await page.waitForTimeout(2600);
  await page.getByRole('button', { name: /Begin Career/ }).click();
  await page.waitForTimeout(1500);
  return save(page);
}
const saveRaw = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const save = async page => { const r = await saveRaw(page); return r ? JSON.parse(r) : null; };

const STEP = ['🎙️ Become a TV Pundit', 'Sign contract', 'Review contract', 'Leave on free transfer', 'Join Club', 'Request transfer', '💪 Not Done Yet', '😭 Cry through', 'Next Year', 'Next Season', 'Continue', 'Sign Contract', 'Accept', 'Confirm', 'Proceed', 'Next', 'Done', 'Close'];
const SKIP = /Retire|New Career|Report a problem|Light mode|Sound: |Cookie|Sign up|^Back$|Full attributes|Reject all|Essential only|^Accept all$|^Accept$|^Save choices$|^⏸$|^🏋️|^📱|^📺/;
async function stepOnce(page) {
  return page.evaluate(async ([actions, skipSrc]) => {
    const skip = new RegExp(skipSrc);
    const usable = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !skip.test(b.textContent.trim()) && !b.closest('[data-site-chrome]') && !b.hasAttribute('data-week-by-week'));
    let pick = null;
    for (const a of actions) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
    if (!pick) return 'STUCK';
    const label = pick.textContent.trim().slice(0, 30);
    pick.click();
    await new Promise(r => setTimeout(r, 650));
    return label;
  }, [STEP, SKIP.source]);
}
async function stepUntil(page, want, max = 40) {
  const trail = [];
  for (let i = 0; i < max; i++) {
    const s = await save(page);
    if (s && want(s)) return { ok: true, trail, phase: s.phase, age: s.age };
    trail.push(`${s?.phase}@${s?.age}:${await stepOnce(page)}`);
  }
  const s = await save(page);
  return { ok: !!(s && want(s)), trail, phase: s?.phase, age: s?.age };
}
// Hit test: is the element's centre on top at its own point, and what covers it if not.
async function hit(page, selector, textRe) {
  return page.evaluate(([sel, src]) => {
    const all = [...document.querySelectorAll(sel)].filter(e => !src || new RegExp(src).test(e.textContent.trim()));
    const el = all.find(e => e.getBoundingClientRect().width > 0);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const at = document.elementFromPoint(x, y);
    const cover = at && !(el === at || el.contains(at)) ? (at.closest('[data-training-loading],[data-season-centre-loading],[data-trophy-loading],[data-site-chrome],[role=dialog],[data-career-action-bar]')?.outerHTML.slice(0, 90) || at.tagName) : null;
    return { found: true, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), inView: y >= 0 && y <= innerHeight && x >= 0 && x <= innerWidth, onTop: !cover, cover };
  }, [selector, textRe ? textRe.source : '']);
}
const activeDesc = page => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName} ${a.getAttribute('aria-label') || a.textContent.trim().slice(0, 30)}` : 'none'; });
const BAR = '[data-career-action-bar] button';
const NEXT = /^Next (Year|Season)/;
const TRAIN = '[data-career-utility="training"]';
const LOADING = '[data-training-loading]';
const count = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);
const tapCentre = async (page, sel, re) => { const h = await hit(page, sel, re); if (!h.found) return h; await page.mouse.click(h.x + h.w / 2, h.y + h.h / 2); return h; };

// A. Training chunk stalled: the layer, Escape, Back, the bar behind it, late arrival, reopen. One run per viewport.
async function scenarioTraining(vp) {
  const tag = `A ${TAG} ${vp.width}x${vp.height}`;
  console.log(`\n${tag}`);
  const { ctx, page, held, errors } = await ctxFor(vp, { stall: [/\/assets\/TrainingPanel-[^/]*\.js/] });
  const s0 = await createCareer(page);
  check(`${tag} career created`, !!s0 && s0.phase === 'youth', s0?.phase);
  await page.click(TRAIN);
  const shown = await page.waitForSelector(LOADING, { timeout: 6000 }).then(() => true, () => false);
  check(`${tag} stalled chunk shows the loading layer`, shown, { held: held.length });
  if (!shown) { await ctx.close(); return; }
  await page.waitForTimeout(200);
  note(`${tag} focus on open`, await activeDesc(page));
  await page.screenshot({ path: `${OUT}/A-${TAG}-${vp.width}-layer.png` }).catch(() => {});
  const back = await hit(page, `${LOADING} button`, /Back to career/);
  note(`${tag} Back button`, back);
  check(`${tag} Back is on top, in view, 44 px tall`, back.found && back.onTop && back.inView && back.h >= 44, back);
  const bar = await hit(page, BAR, NEXT);
  note(`${tag} Next button under the layer`, bar);
  const menu = await hit(page, '[data-site-chrome] button[aria-label="Open site menu"]');
  note(`${tag} site menu under the layer`, menu);
  // Tab order out of the aria-modal layer
  const tabs = [];
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); tabs.push(await activeDesc(page)); }
  note(`${tag} Tab x3 from the layer`, tabs);
  // Escape: needs focus inside the dialog; put it back on the dialog first, as on open.
  await page.focus(`${LOADING} [role=dialog]`);
  const before = await saveRaw(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(`${tag} Escape closes the layer`, (await count(page, LOADING)) === 0);
  note(`${tag} focus after Escape`, await activeDesc(page));
  check(`${tag} save unchanged by Escape`, before === await saveRaw(page));
  // Escape after a click on the backdrop (focus leaves the dialog)
  await page.click(TRAIN);
  await page.waitForSelector(LOADING, { timeout: 6000 });
  await page.mouse.click(4, vp.height - 4);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  note(`${tag} layer after backdrop click then Escape (count)`, await count(page, LOADING));
  if (await count(page, LOADING)) { await tapCentre(page, `${LOADING} button`, /Back to career/); await page.waitForTimeout(300); }
  // Back by a real tap, then the bar's Next must be on top and must advance
  await page.click(TRAIN);
  await page.waitForSelector(LOADING, { timeout: 6000 });
  await tapCentre(page, `${LOADING} button`, /Back to career/);
  await page.waitForTimeout(300);
  check(`${tag} Back closes the layer`, (await count(page, LOADING)) === 0);
  note(`${tag} focus after Back`, await activeDesc(page));
  const bar2 = await hit(page, BAR, NEXT);
  check(`${tag} Next is on top after Back`, bar2.found && bar2.onTop, bar2);
  const a1 = (await save(page)).age;
  await tapCentre(page, BAR, NEXT);
  await page.waitForTimeout(900);
  const s2 = await save(page);
  check(`${tag} Next advances after Back`, s2.age === a1 + 1 || s2.phase !== 'youth', { from: a1, to: s2.age, phase: s2.phase });
  // Late arrival: open, Back, then release the chunk. Nothing may open and the save must not move.
  await page.click(TRAIN);
  await page.waitForSelector(LOADING, { timeout: 6000 });
  await tapCentre(page, `${LOADING} button`, /Back to career/);
  const b3 = await saveRaw(page);
  held.released = true;
  for (const r of held.splice(0)) await r.continue().catch(() => {});
  await page.waitForTimeout(2500);
  check(`${tag} late arrival opens nothing`, (await count(page, '[role=dialog][aria-label="Training ground"]')) === 0 && (await count(page, LOADING)) === 0);
  check(`${tag} late arrival leaves the save alone`, b3 === await saveRaw(page));
  await page.click(TRAIN);
  const opened = await page.waitForSelector('[role=dialog][aria-label="Training ground"]', { timeout: 8000 }).then(() => true, () => false);
  check(`${tag} reopen after arrival opens the training ground`, opened);
  check(`${tag} no page errors`, errors.length === 0, errors);
  await page.screenshot({ path: `${OUT}/A-${TAG}-${vp.width}.png` }).catch(() => {});
  await ctx.close();
}

// B. Consent banner still unanswered on a short phone: Back must stay above the banner.
async function scenarioConsent(vp) {
  const tag = `B ${TAG} ${vp.width}x${vp.height}`;
  console.log(`\n${tag}`);
  const { ctx, page } = await ctxFor(vp, { stall: [/\/assets\/TrainingPanel-[^/]*\.js/] });
  await createCareer(page);
  await page.evaluate(() => localStorage.removeItem('cookie-consent'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  const pending = await page.waitForSelector('body[data-consent-pending]', { timeout: 8000 }).then(() => true, () => false);
  note(`${tag} consent pending after reload`, pending);
  await page.waitForSelector(TRAIN, { timeout: 15000 });
  await tapCentre(page, TRAIN);
  const shown = await page.waitForSelector(LOADING, { timeout: 6000 }).then(() => true, () => false);
  const back = await hit(page, `${LOADING} button`, /Back to career/);
  check(`${tag} Back on top with the banner up`, shown && back.found && back.onTop && back.inView, back);
  await page.screenshot({ path: `${OUT}/B-${TAG}-${vp.width}.png` }).catch(() => {});
  await ctx.close();
}

// C. The sibling: the Season Centre chunk stalled after Week by week (the same press as Next Season).
async function scenarioCentre(vp) {
  const tag = `C ${TAG} ${vp.width}x${vp.height}`;
  console.log(`\n${tag}`);
  const { ctx, page, held, errors } = await ctxFor(vp, { stall: [/\/assets\/SoccerSeasonCentre-[^/]*\.js/] });
  const names = new Set();
  page.on('request', r => { const u = r.url(); if (/Centre|Training|Moments/i.test(u)) names.add(u.split('/').pop()); });
  await createCareer(page);
  const r = await stepUntil(page, s => s.phase === 'playing', 40);
  note(`${tag} reached playing`, { ok: r.ok, age: r.age, trail: r.trail.slice(-6) });
  if (!r.ok) { await ctx.close(); return; }
  const wk = await hit(page, '[data-week-by-week]');
  note(`${tag} week by week button`, wk);
  await tapCentre(page, '[data-week-by-week]');
  const shown = await page.waitForSelector('[data-season-centre-loading]', { timeout: 6000 }).then(() => true, () => false);
  note(`${tag} chunks asked for`, [...names]);
  note(`${tag} held requests`, held.length);
  const s = await save(page);
  note(`${tag} Season Centre loading layer shown`, shown);
  note(`${tag} save phase under the layer`, `${s.phase} age ${s.age}`);
  if (!shown) { await ctx.close(); return; }
  const inLayer = await count(page, '[data-season-centre-loading] button, [data-season-centre-loading] a');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const after = await count(page, '[data-season-centre-loading]');
  const reachable = await page.evaluate(() => [...document.querySelectorAll('button, a[href]')].filter(b => { const r = b.getBoundingClientRect(); if (!r.width || !r.height) return false; const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return false; const at = document.elementFromPoint(x, y); return at && (at === b || b.contains(at)); }).map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 30)));
  note(`${tag} FINDING controls inside the layer`, inLayer);
  note(`${tag} FINDING layer still up after Escape`, after);
  note(`${tag} FINDING controls a tap can reach`, reachable);
  await page.screenshot({ path: `${OUT}/C-${TAG}-${vp.width}.png` }).catch(() => {});
  await page.waitForTimeout(20000);
  note(`${tag} FINDING layer still up 20 s later`, await count(page, '[data-season-centre-loading]'));
  note(`${tag} page errors`, errors);
  await ctx.close();
}

// D. A pundit season: the bar shows Next Season; does pressing it do anything?
async function scenarioPundit(vp) {
  const tag = `D ${TAG} ${vp.width}x${vp.height}`;
  console.log(`\n${tag}`);
  const { ctx, page, errors } = await ctxFor(vp);
  await createCareer(page);
  const r = await stepUntil(page, s => s.phase === 'playing', 40);
  note(`${tag} reached playing`, { ok: r.ok, age: r.age });
  if (!r.ok) { await ctx.close(); return; }
  await page.getByRole('button', { name: /🚪 Retire/ }).first().click();
  await page.getByRole('button', { name: /Confirm Retirement/ }).click();
  await page.waitForTimeout(800);
  const p = await stepUntil(page, s => s.phase === 'pundit_season', 12);
  note(`${tag} reached pundit_season`, { ok: p.ok, phase: p.phase, trail: p.trail });
  if (!p.ok) { await ctx.close(); return; }
  await page.waitForTimeout(500);
  const bar = await hit(page, BAR, /^Next Season/);
  note(`${tag} bar Next Season button`, bar);
  const before = await saveRaw(page);
  for (let i = 0; i < 3; i++) { await tapCentre(page, BAR, /^Next Season/); await page.waitForTimeout(700); }
  const after = await saveRaw(page);
  const b = JSON.parse(before), a = JSON.parse(after);
  note(`${tag} FINDING three presses of Next Season changed the save`, before !== after);
  note(`${tag} FINDING pundit season before and after`, { before: b.punditState?.season, after: a.punditState?.season, phase: a.phase });
  await page.screenshot({ path: `${OUT}/D-${TAG}-${vp.width}.png` }).catch(() => {});
  await page.getByRole('button', { name: /Praise a Rising Star/ }).click();
  await page.waitForTimeout(700);
  const c = await save(page);
  note(`${tag} pundit action advances the season`, { season: c.punditState?.season, phase: c.phase });
  fs.writeFileSync(`${OUT}/D-${TAG}-pundit-save.json`, before);
  note(`${tag} page errors`, errors);
  await ctx.close();
}

const VPS = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
try {
  if (!ONLY || ONLY.includes('A')) for (const vp of VPS) await scenarioTraining(vp);
  if (!ONLY || ONLY.includes('B')) await scenarioConsent({ width: 320, height: 568 });
  if (!ONLY || ONLY.includes('C')) await scenarioCentre({ width: 390, height: 844 });
  if (!ONLY || ONLY.includes('D')) await scenarioPundit({ width: 390, height: 844 });
} catch (e) { fails++; console.log('ERROR ' + String(e.stack || e).slice(0, 600)); }
await browser.close();
fs.writeFileSync(`${OUT}/walk421-${TAG}.json`, JSON.stringify(results, null, 1));
console.log(`walk421 ${TAG}: ${fails === 0 ? 'all checks passed' : fails + ' check(s) failed'}`);
process.exit(fails === 0 ? 0 : 1);

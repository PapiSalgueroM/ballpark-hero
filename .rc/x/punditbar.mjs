// Skeptic probe for BS-sc421-3: in a pundit season, does the bar's Next Season press do anything? Never committed.
import pw from '../../scripts/lib/playwrightLoader.mjs';
import fs from 'node:fs';
const { chromium } = pw;
const BASE = process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp';
const W = Number(process.env.VW || 390), H = Number(process.env.VH || 844);
const TAG = `${W}x${H}`;
const say = (k, v) => console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
const bail = msg => { console.log(`punditbar ${TAG}: ABORT ${msg}`); process.exit(2); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript(() => {
  let a = 424242;
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (!sessionStorage.getItem('sk-init')) { try { localStorage.setItem('cookie-consent', 'essential'); } catch {} }
  sessionStorage.setItem('sk-init', '1');
  window.__barClicks = 0;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-career-action-bar] button'); if (b && /^Next Season/.test(b.textContent.trim())) window.__barClicks++; }, true);
});
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
const raw = () => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const save = async () => { const r = await raw(); return r ? JSON.parse(r) : null; };

// 1. a new career through the creation screen
await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
await page.fill('input[placeholder*="player name"]', 'Skeptic Probe');
for (const [trigger, want] of [['Choose nationality', 'Spain'], ['Choose position', 'Midfielder'], ['Choose era', 'Current era']]) {
  await page.locator('[role="combobox"]', { hasText: trigger }).first().click();
  await page.waitForSelector('[role="option"]', { timeout: 8000 });
  await page.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; (o.find(x => x.textContent.includes(w)) || o[0]).click(); }, want);
  await page.waitForTimeout(300);
}
await page.getByRole('button', { name: /Generate Starting Potential/ }).click();
await page.waitForTimeout(2800);
await page.getByRole('button', { name: /Begin Career/ }).click();
await page.waitForTimeout(1500);
const s0 = await save();
if (!s0) bail('no save after Begin Career');
say('career created', { phase: s0.phase, age: s0.age });

// 2. play until one senior season is on the record; this is the CONTROL that a bar press advances where it is handled
const PREF = ['Next Year', 'Next Season', 'Continue', 'Sign contract', 'Sign Contract', 'Review contract', 'Join Club', 'Leave on free transfer', 'Accept', 'Confirm', 'Proceed', 'Done', 'Close', 'Next'];
const NOPE = /Retire|New Career|Report a problem|Light mode|Sound: |Cookie|Sign up|^Back$|Full attributes|Reject all|Essential only|Accept all|Save choices|^⏸$|^🏋️|^📱|^📺/;
async function pressOne() {
  return page.evaluate(async ([pref, nope]) => {
    const re = new RegExp(nope);
    const ok = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent && b.textContent.trim() && !re.test(b.textContent.trim()) && !b.closest('[data-site-chrome]') && !b.hasAttribute('data-week-by-week'));
    for (const p of pref) { const b = ok.find(x => x.textContent.trim().startsWith(p)); if (b) { const l = b.textContent.trim().slice(0, 28); b.click(); await new Promise(r => setTimeout(r, 700)); return l; } }
    return 'STUCK';
  }, [PREF, NOPE.source]);
}
let control = null;
for (let i = 0; i < 45; i++) {
  const s = await save();
  if (s.phase === 'playing' && control === null) {
    const before = await raw(); const nBefore = (s.seasons || []).length;
    try { await page.locator('[data-career-action-bar] button', { hasText: /^Next Season/ }).first().click({ timeout: 8000 }); }
    catch (e) { say('control press blocked, stepping on', String(e).slice(0, 120)); await pressOne(); continue; }
    await page.waitForTimeout(900);
    const a = await save();
    control = { savedChanged: before !== (await raw()), seasonsBefore: nBefore, seasonsAfter: (a.seasons || []).length, phaseAfter: a.phase };
    say('CONTROL playing: one bar Next Season press', control);
  }
  if (control && (s.seasons || []).length >= 1 && !['season_summary', 'newspaper'].includes(s.phase)) break;
  const l = await pressOne();
  if (l === 'STUCK') { say('stepper stuck at', { phase: s.phase, age: s.age }); break; }
}
if (!control) bail('never reached a playing phase to run the control');

// 3. retire from the header, then pick the pundit road
await page.getByRole('button', { name: /^🚪 Retire$/ }).first().click({ timeout: 8000 });
await page.getByRole('button', { name: /Confirm Retirement/ }).click({ timeout: 8000 });
await page.waitForTimeout(900);
for (let i = 0; i < 12; i++) {
  const s = await save();
  if (s.phase === 'pundit_season') break;
  const tv = page.getByRole('button', { name: /Become a TV Pundit/ });
  if (await tv.count()) { await tv.first().click(); await page.waitForTimeout(900); continue; }
  const l = await pressOne(); say('retire step', { phase: s.phase, pressed: l });
  if (l === 'STUCK') break;
}
const p0 = await save();
if (p0.phase !== 'pundit_season') bail(`did not reach pundit_season, phase ${p0.phase}`);
say('reached pundit season', { phase: p0.phase, isPundit: p0.isPundit, retired: p0.retired, punditState: p0.punditState });
await page.waitForTimeout(600);

// 4. the finding: what the bar shows, whether the press lands, and whether anything moves
const panelSeason = () => page.evaluate(() => { const m = document.body.innerText.match(/Season (\d+) · /); return m ? Number(m[1]) : null; });
const bar = page.locator('[data-career-action-bar] button', { hasText: /^Next Season/ });
const barInfo = await page.evaluate(() => {
  const el = [...document.querySelectorAll('[data-career-action-bar] button')].find(b => /^Next Season/.test(b.textContent.trim()));
  if (!el) return { found: false };
  const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { found: true, label: el.textContent.trim(), disabled: el.disabled, y: Math.round(r.top), h: Math.round(r.height), onTop: !!at && (at === el || el.contains(at)), cls: el.className.includes('bg-emerald-600') ? 'green primary' : el.className.slice(0, 40) };
});
say('FINDING bar Next Season in pundit_season', barInfo);
if (!barInfo.found) { console.log(`punditbar ${TAG}: NOT REPRODUCED, no Next Season in the pundit bar`); await browser.close(); process.exit(0); }
const beforeRaw = await raw(); const before = JSON.parse(beforeRaw); const panelBefore = await panelSeason();
await page.evaluate(() => { window.__barClicks = 0; });
for (let i = 0; i < 4; i++) { await bar.first().click({ timeout: 8000 }); await page.waitForTimeout(800); }
const clicks = await page.evaluate(() => window.__barClicks);
const afterRaw = await raw(); const after = JSON.parse(afterRaw); const panelAfter = await panelSeason();
const diffKeys = Object.keys({ ...before, ...after }).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
say('FINDING four real clicks on the bar Next Season', { clicksThatLanded: clicks, saveChanged: beforeRaw !== afterRaw, changedKeys: diffKeys, punditSeasonBefore: before.punditState?.season, punditSeasonAfter: after.punditState?.season, panelBefore, panelAfter, phaseAfter: after.phase });
await page.screenshot({ path: `${OUT}/sk-pundit-${TAG}.png` }).catch(() => {});
fs.writeFileSync(`${OUT}/sk-pundit-save-${TAG}.json`, beforeRaw);

// 5. CONTROL in the same state: a pundit panel action does move the season, so the probe can see a change
await page.getByRole('button', { name: /Praise a Rising Star/ }).click({ timeout: 8000 });
await page.waitForTimeout(900);
const c = await save(); const panelC = await panelSeason();
say('CONTROL pundit panel Praise a Rising Star', { punditSeason: c.punditState?.season, panel: panelC, phase: c.phase });
say('page errors', errors);
const dead = clicks === 4 && beforeRaw === afterRaw && panelBefore === panelAfter;
const controlsMoved = control.savedChanged && (c.punditState?.season ?? -1) > (before.punditState?.season ?? 0);
await browser.close();
console.log(`punditbar ${TAG}: ${dead && controlsMoved ? 'REPRODUCED, the bar Next Season is dead in pundit_season while both controls moved' : dead ? 'DEAD BUT A CONTROL DID NOT MOVE, inconclusive' : 'NOT REPRODUCED, the press changed the career'}`);
process.exit(0);

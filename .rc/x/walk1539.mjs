/* Round 1539 review walk (runner lens, never committed). Run from the repo root against a served build:
 *   BASE=http://localhost:4173 RC_OUT=<dir> node .rc/x/walk1539.mjs
 * Plays the round's feature the way a player meets it: a save planted from the head lib's own functions, left
 * hours ago, opened on /stadium-tycoon. Scenes:
 *   night   no perk club, first ten club division, matchday 0, back after 8h05m: 17 results, "the final matchday is
 *           waiting for you", then the header must read matchday 18 of 18
 *   seven   the same club back after 7h05m: 15 results, "with 3 matchdays to go"
 *   largest the builder's largest card (top perk, leftover friendly, 13h): 18 results
 * At 390x844 and 1280x900 (and 320x640 for largest), reduced motion on and off, banner pending and answered
 * ("Reject all" on another page first). The database host is aborted. Math.random is a seeded stream throughout
 * (a real player's game, deterministic), so toasts or offers that land over the card are seen, not hidden.
 * Checks per line: the card opens on top, its count and table line are true, its box and "Back to work" are whole on
 * screen and (banner pending) above the banner, the button's centre is the button, a tap closes it, nothing covers
 * the screen after, the page did not jump. Screenshots into RC_OUT. Exit 0 all hold, 1 any fails, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'walk1539-'));
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1539-lib-'));
await build({
  stdin: { contents: `export * as T from ${JSON.stringify(path.join(ROOT, 'src/lib/stadiumTycoon.ts').split(path.sep).join('/'))};`, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 't.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { T } = await import(pathToFileURL(path.join(tmp, 't.mjs')).href);
if (T.AWAY_MATCHDAY_SEC !== 1680) { console.log(`walk1539 ABORTED: the lib's clock is ${T.AWAY_MATCHDAY_SEC}`); process.exit(2); }

const division = T.DIVISIONS.findIndex((_, d) => T.leagueShape(d).clubs === 10);
const shape = T.leagueShape(division);
const par = Math.round(T.DIVISIONS[division].rivalStrength / T.SQUAD_POINTS);
function plain(extra = {}) {
  const f = T.newTycoon(0);
  /* a club that got to a ten club division has a career behind it: its early firsts are long settled */
  let s = { ...f, levels: { ...f.levels, squad: par + 2 }, league: T.newLeague(f.rep, division, 0), bestDivision: division, totalWins: 150, totalGoals: 420, totalMatches: 240, ...extra };
  T.settleFirsts(s, []);
  return s;
}
function largest() {
  const f = T.newTycoon(0);
  const reach = Math.ceil(20 / T.SQUAD_POINTS);
  const squad = Math.min(T.TRACKS.find(t => t.id === 'squad').maxLevel, par + 3 * reach);
  const awayTop = T.LEGACY_PERKS.find(p => p.id === 'away').costs.length;
  let s = { ...f, levels: { ...f.levels, squad }, league: T.newLeague(f.rep, division, 0), bestDivision: division, legacyPerks: { ...f.legacyPerks, away: awayTop } };
  s.league = { ...s.league, carryover: T.legacyOpponentName(s) };
  const hits = st => T.MILESTONES.filter(m => m.hit(st)).length;
  const under = field => { for (let k = 1; k < 100000; k += 1) if (hits({ ...s, [field]: k }) > hits({ ...s, [field]: k - 1 })) return k - 1; return 0; };
  s = { ...s, totalWins: under('totalWins'), totalGoals: under('totalGoals'), streak: 0, ach: [], claimed: [] };
  T.settleFirsts(s, []);
  return s;
}
const t0 = Date.UTC(2026, 9, 22);
const mk = (s, awayMs) => {
  const loaded = T.deserializeTycoon(T.serializeTycoon(s, t0), t0);
  const count = Math.floor(T.awaySecondsOf({ ...loaded, savedAt: t0 }, t0 + awayMs) / T.AWAY_MATCHDAY_SEC);
  return { save: T.serializeTycoon(s, t0), awayMs, results: T.awayMatchdaysPlayable(loaded, count) };
};
const SCENES = {
  night: { ...mk(plain(), (8 * 60 + 5) * 60e3), line: 'the final matchday is waiting for you', after: `matchday ${shape.matchdays} of ${shape.matchdays}` },
  seven: { ...mk(plain(), (7 * 60 + 5) * 60e3), line: `with ${shape.matchdays - 15} matchdays to go`, after: `matchday 16 of ${shape.matchdays}` },
  largest: { ...mk(largest(), 13 * 3600e3), line: 'the final matchday is waiting for you', after: null },
};
if (SCENES.night.results !== 17 || SCENES.seven.results !== 15 || SCENES.largest.results !== 18) {
  console.log(`walk1539 ABORTED: planted counts ${SCENES.night.results}, ${SCENES.seven.results}, ${SCENES.largest.results}`); process.exit(2);
}
console.log(`walk1539: division ${division} (${shape.clubs} clubs, ${shape.matchdays} matchdays), Squad par ${par}; planted night 17, seven 15, largest 18`);
if (process.env.PLANT_ONLY) process.exit(0);

function plantInPage({ key, save, awayMs, seed }) {
  try { const s = JSON.parse(save); s.savedAt = Date.now() - awayMs; localStorage.setItem(key, JSON.stringify(s)); } catch { /* the line fails */ }
  let a = seed | 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* in the page: the card, its button, the banner, what sits at the button's centre, and what covers the card */
function measure() {
  const W = innerWidth, H = innerHeight;
  const bx = el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
  const card = document.querySelector('[role="dialog"][aria-label="While you were away"]');
  const bannerEl = document.querySelector('[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]');
  const banner = bannerEl && bannerEl.getBoundingClientRect().height > 2 && getComputedStyle(bannerEl).display !== 'none' ? bx(bannerEl) : null;
  const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')].filter(d => d.getBoundingClientRect().height > 2 && !(bannerEl && bannerEl.contains(d))).map(d => d.getAttribute('aria-label') || '?');
  if (!card) return { open: false, banner, dialogs, y: Math.round(scrollY), h: document.documentElement.scrollHeight };
  const btn = [...card.querySelectorAll('button')].find(b => /Back to work/.test(b.textContent || ''));
  const r = btn ? btn.getBoundingClientRect() : null;
  const at = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  /* sample the card's own area: any point owned by something outside the card (a toast, an offer) covers it */
  const cr = card.getBoundingClientRect();
  const covers = new Set();
  for (let i = 1; i < 6; i += 1) for (let j = 1; j < 6; j += 1) {
    const x = cr.left + (cr.width * i) / 6, y = Math.max(0, cr.top) + ((Math.min(H, cr.bottom) - Math.max(0, cr.top)) * j) / 6;
    const el = document.elementFromPoint(x, y);
    if (el && !card.contains(el)) covers.add(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.textContent || '').trim().slice(0, 30)}"`);
  }
  const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
  return {
    open: true, banner, dialogs, card: bx(card), button: r ? bx(btn) : null, cx: r ? r.left + r.width / 2 : 0, cy: r ? r.top + r.height / 2 : 0,
    atButton: !!(at && btn && btn.contains(at)), atWhat: at ? `${at.tagName.toLowerCase()} "${(at.textContent || '').trim().slice(0, 24)}"` : 'nothing',
    chips: card.querySelectorAll('[data-away-results] [role="img"]').length, text, covers: [...covers],
    cardScrolls: card.scrollHeight > card.clientHeight + 1, W, H, y: Math.round(scrollY), h: document.documentElement.scrollHeight,
  };
}

const VIEWS = [[390, 844], [1280, 900]];
const lines = [];
for (const scene of Object.keys(SCENES)) for (const [w, h] of (scene === 'largest' ? [[320, 640], ...VIEWS] : VIEWS)) {
  for (const rm of ['reduce', 'no-preference']) for (const consent of ['pending', 'answered']) lines.push({ scene, w, h, rm, consent });
}
const fails = [];
const browser = await chromium.launch();
let n = 0;
for (const L of lines) {
  n += 1;
  const sc = SCENES[L.scene];
  const tag = `${L.scene}-${L.w}-${L.rm === 'reduce' ? 'rm' : 'motion'}-${L.consent}`;
  const bad = why => { fails.push(`${tag}: ${why}`); };
  const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h }, reducedMotion: L.rm });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 120)));
  try {
    if (L.consent === 'answered') {
      await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const reject = page.locator('[aria-label="Cookie choices"] button', { hasText: 'Reject all' });
      await reject.waitFor({ timeout: 10000 });
      await reject.click();
      await page.waitForTimeout(500);
    }
    await page.addInitScript(plantInPage, { key: T.TYCOON_SAVE_KEY, save: sc.save, awayMs: sc.awayMs, seed: 1539 + n });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[role="dialog"][aria-label="While you were away"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const m = await page.evaluate(measure);
    const shot = `walk-${tag}.png`;
    await page.screenshot({ path: path.join(OUT, shot) });
    if (!m.open) { bad(`no card opened (dialogs: ${m.dialogs.join(', ') || 'none'})`); console.log(`  FAIL ${tag}: no card`); await ctx.close(); continue; }
    if (L.consent === 'pending' && !m.banner) bad('the banner was not on screen while pending');
    if (L.consent === 'answered' && m.banner) bad(`the banner is still on screen after Reject all (${m.banner.top} to ${m.banner.bottom})`);
    if (m.dialogs[m.dialogs.length - 1] !== 'While you were away' && m.dialogs.length > 1) bad(`another dialog is open with the card: ${m.dialogs.join(', ')}`);
    if (m.chips !== sc.results) bad(`the card drew ${m.chips} results, the planted trip plays ${sc.results}`);
    if (!m.text.includes(sc.line)) bad(`the card does not say "${sc.line}": ${m.text.slice(-160)}`);
    if (!m.button) bad('no Back to work button');
    else {
      if (m.button.top < 0 || m.button.bottom > m.H || m.button.left < 0 || m.button.right > m.W) bad(`the button is partly off screen (${m.button.top} to ${m.button.bottom} of ${m.H})`);
      if (m.banner && m.button.bottom > m.banner.top) bad(`the button ends ${m.button.bottom - m.banner.top} px under the banner`);
      if (m.banner && m.card.bottom > m.banner.top + 1) bad(`the card runs ${m.card.bottom - m.banner.top} px under the banner`);
      if (m.card.top < -1) bad(`the card's top is ${-m.card.top} px above the screen`);
      if (!m.atButton) bad(`the button's centre is ${m.atWhat}`);
    }
    if (m.covers.length) bad(`something covers the card: ${m.covers.slice(0, 3).join('; ')}`);
    let after = null;
    if (m.button && m.atButton) {
      await page.mouse.click(m.cx, m.cy);
      await page.waitForTimeout(800);
      after = await page.evaluate(measure);
      if (after.open) bad('the card did not close on Back to work');
      if (after.y !== m.y || after.h !== m.h) bad(`the page jumped: scrollY ${m.y} to ${after.y}, height ${m.h} to ${after.h}`);
      if (after.dialogs.length) bad(`a dialog is open after the close: ${after.dialogs.join(', ')}`);
      await page.screenshot({ path: path.join(OUT, `walk-${tag}-closed.png`) });
      if (sc.after) {
        const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
        if (!body.includes(sc.after)) bad(`after the close the page does not say "${sc.after}" (${(body.match(/matchday \d+ of \d+/gi) || []).slice(0, 3).join(', ')})`);
      }
    }
    if (errors.length) bad(`page errors: ${errors.slice(0, 2).join(' | ')}`);
    const mine = fails.filter(f => f.startsWith(`${tag}:`));
    console.log(`  ${mine.length ? 'FAIL' : 'PASS'} ${tag}: card ${m.card.top} to ${m.card.bottom}${m.cardScrolls ? ' (scrolls)' : ''}, button ${m.button ? `${m.button.top} to ${m.button.bottom}` : 'none'}, banner ${m.banner ? `${m.banner.top} to ${m.banner.bottom}` : 'none'}, ${m.chips} results, y ${m.y} h ${m.h}${after ? ` -> y ${after.y} h ${after.h}` : ''}; "${m.text.slice(0, 70)} ... ${m.text.slice(-90)}"${mine.length ? `\n      ${mine.map(f => f.slice(tag.length + 2)).join('\n      ')}` : ''}`);
  } catch (e) {
    bad(`threw: ${String(e.message || e).split('\n')[0].slice(0, 140)}`);
    console.log(`  FAIL ${tag}: threw ${String(e.message || e).split('\n')[0].slice(0, 140)}`);
  }
  await ctx.close();
}

/* the rules modal and the guide on the page say the clock the lib plays */
for (const [w, h] of VIEWS) {
  const tag = `rules-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  try {
    await page.addInitScript(plantInPage, { key: T.TYCOON_SAVE_KEY, save: SCENES.night.save, awayMs: 0, seed: 7 });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: /How it works/ }).first().click();
    await page.waitForSelector('[role="dialog"][aria-label="How Stadium Tycoon works"]', { timeout: 8000 });
    await page.waitForTimeout(400);
    const rules = await page.evaluate(() => (document.querySelector('[role="dialog"][aria-label="How Stadium Tycoon works"]')?.innerText || '').replace(/\s+/g, ' '));
    const s = rules.match(/Matchdays keep playing while you are away[^.]*\./);
    console.log(`  ${tag}: rules say "${s ? s[0] : 'NOTHING'}"`);
    if (!rules.includes('one every 28 minutes')) fails.push(`${tag}: the rules do not say one every 28 minutes`);
    await page.screenshot({ path: path.join(OUT, `walk-${tag}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const g = body.match(/Matchdays keep playing while you are away, one for every[^.]*\./);
    console.log(`  ${tag}: the page's guide says "${g ? g[0] : 'not on this page'}"`);
    if (/every half hour/.test(body)) fails.push(`${tag}: the page still says every half hour`);
  } catch (e) { fails.push(`${tag}: threw ${String(e.message || e).split('\n')[0].slice(0, 140)}`); }
  await ctx.close();
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
if (fails.length) { console.log(`walk1539: RED, ${fails.length} problems on ${new Set(fails.map(f => f.split(':')[0])).size} lines of ${lines.length + VIEWS.length}`); process.exit(1); }
console.log(`walk1539: green, ${lines.length} card lines and ${VIEWS.length} rules lines`);

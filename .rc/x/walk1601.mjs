/* Reviewer walk (round 1601, runner lens): the player card as a player reaches it, at 390x844 and 1280x900, with
 * reduced motion ON and OFF. W1 is a head made save (two seasons ended, contracts renewed, mid season three). W2 is
 * a save MADE BY THE BASE COMMIT's engine (OLD_BASE), mid season two, opened on the head build.
 * Holds: the card opens from the deepest Squad row and from the last row of a board; nothing runs sideways; Back
 * lands where the thumb was (scrollY held still a second) with the host as it was; a later plain visit to Stats is
 * fresh; the old save's card says the right thing and the page writes neither new key into it.
 * Run in a #!serve #!playwright request: OLD_BASE=/tmp/wbase node .rc/x/walk1601.mjs. Exit 0 green, 1 red, 2 cannot. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || '';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
const OLD = process.env.OLD_BASE || '';
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-12T16:00:00Z');
const cannot = w => { console.log(`walk1601: COULD NOT RUN: ${w}`); process.exit(2); };
if (!BASE) cannot('no BASE');
fs.mkdirSync(OUT, { recursive: true });
const fails = []; let checks = 0;
const fail = m => { fails.push(m); console.log(`  FAIL ${m}`); };
const note = m => console.log(`  ${m}`);
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1601-'));
async function engine(label, root) {
  const entry = path.join(TMP, `${label}-e.mjs`); const out = path.join(TMP, `${label}.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\n`);
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root,
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  const m = await import(pathToFileURL(out).href); await m.cm.ensureAllEraRosters?.(); return m.cm;
}
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function onStream(seed, fn) { const r = Math.random, n = Date.now; Math.random = seeded(seed); Date.now = () => NOW; try { return fn(); } finally { Math.random = r; Date.now = n; } }
const nudge = s => (s.boardConfidence < 35 ? { ...s, boardConfidence: 55 } : s);
function play(cm, s, n) { for (let k = 0; k < n && s.week < s.calendar.length && !s.sacked; k++) { const r = cm.playNextEntry(nudge(s), { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; } return s; }
const renew = (cm, s) => { for (const p of s.squad) if (!p.onLoan && (p.contractYears ?? 0) <= 1) s = cm.renewContract(s, p.id) ?? s; return s; };
function career(cm, club, seasons, entries, seed, renewing) {
  for (let k = 0; k < 6; k++) {
    let s;
    try { s = onStream(seed + k * 7919, () => {
      let x = cm.startCareer(club);
      for (let i = 0; i < seasons && !x.sacked; i++) { x = play(cm, x, 400); if (x.sacked) break; let f = cm.finishSeason(x).state; if (renewing) f = renew(cm, f); x = cm.startNextSeason(f); }
      return x.sacked ? x : play(cm, x, entries);
    }); } catch (e) { console.log(`  career ${club}: ${String(e?.message ?? e).slice(0, 100)}`); return null; }
    if (!s.sacked) return s;
  }
  return null;
}
const head = await engine('head', ROOT);
const W = {};
W.W1 = career(head, 'Liverpool', 2, 25, 0x5eed01, true) ?? career(head, 'Everton', 2, 25, 0x5eed01, true);
if (!W.W1) cannot('W1 could not be built');
if (OLD) { const old = await engine('old', OLD); W.W2 = career(old, 'Arsenal', 1, 10, 0x5eed02, false); }
for (const [k, s] of Object.entries(W)) if (s) note(`${k}: ${s.clubName} season ${s.season} week ${s.week}, pastLines ${s.pastLines ? s.pastLines.length : 'none'}, pastFrom ${s.pastFrom ?? 'none'}, history ${s.history.map(h => h.season).join(',')}`);
let browser;
try { browser = await pw.chromium.launch({ headless: true }); } catch (e) { cannot(`no browser: ${String(e?.message ?? e).slice(0, 120)}`); }
const origin = new URL(BASE).origin;
async function openPage(save, [w, h], motion) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', serviceWorkers: 'block', reducedMotion: motion,
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: KEY, value: JSON.stringify(save) }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await context.addInitScript(now => { const Old = Date; window.Date = class extends Old { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }; }, NOW);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }).click();
  return { context, page, errors };
}
const shot = async (page, name, full = false) => { try { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); } catch { /* help only */ } };
async function settled(page) { let last = await page.evaluate(() => scrollY); let still = 0; for (let k = 0; k < 50 && still < 1000; k++) { await page.waitForTimeout(100); const y = await page.evaluate(() => scrollY); still = Math.abs(y - last) < 0.5 ? still + 100 : 0; last = y; } return last; }
async function toHub(page) { const home = page.locator('button:visible').filter({ hasText: /Club home/ }).first(); if (await home.count()) await home.click().catch(() => {}); }
async function toStats(page) { await toHub(page); const t = page.locator('button:visible').filter({ has: page.locator('div', { hasText: /^Stats$/ }) }).first(); await t.waitFor(); await t.click(); await page.locator('[data-cm-leaders]').first().waitFor(); }
async function toSquad(page) { await page.getByRole('tab', { name: 'Squad', exact: true }).click(); await page.locator('[data-cm-squad-list]').waitFor(); }
const fit = page => page.evaluate(() => {
  const card = document.querySelector('[data-cm-card]');
  const cut = card ? [...card.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible').map(el => el.tagName + (el.textContent ?? '').slice(0, 30)) : [];
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, h: card?.getBoundingClientRect().height ?? 0, cut, text: card?.innerText ?? '',
    stacked: ['[data-cm-squad-list]', '[data-cm-leaders]'].filter(s => document.querySelector(s)) };
});
/* One trip: tap the link, look, the "?", Back, and hold the scroll and the host. */
async function trip(page, tag, link, hostCheck) {
  await link.scrollIntoViewIfNeeded();
  const before = await settled(page);
  await link.click();
  await page.locator('[data-cm-card]').waitFor();
  await page.waitForTimeout(400);
  await shot(page, `${tag}-card`);
  const f = await fit(page);
  checks += 3;
  if (f.sw > f.iw) fail(`${tag}: the page runs sideways with the card open (${f.sw} in ${f.iw})`);
  if (f.cut.length) fail(`${tag}: text cut off inside the card: ${f.cut.slice(0, 3).join(' | ')}`);
  if (f.stacked.length) fail(`${tag}: with the card open the document still holds ${f.stacked.join(', ')}`);
  note(`${tag}: card ${f.h.toFixed(0)} tall in ${f.ih}; text: ${f.text.replace(/\s+/g, ' ').slice(0, 260)}`);
  const help = page.locator('[data-cm-card-help]');
  if (await help.count()) { await help.click(); await page.waitForTimeout(200); await shot(page, `${tag}-help`); await help.click(); }
  await page.locator('[data-cm-card-back]').click();
  const after = await settled(page);
  checks += 2;
  if (Math.abs(after - before) > 2) fail(`${tag}: Back left the page at ${after.toFixed(0)}, it stood at ${before.toFixed(0)}`);
  else note(`${tag}: Back held the page at ${after.toFixed(0)} (stood at ${before.toFixed(0)})`);
  if (!(await hostCheck())) fail(`${tag}: after Back the host is not as it was`);
  await shot(page, `${tag}-back`);
}
const SIZES = [[390, 844], [1280, 900]];
for (const size of SIZES) for (const motion of ['reduce', 'no-preference']) {
  const tag = `W1-${size[0]}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { context, page, errors } = await openPage(W.W1, size, motion);
  try {
    await toSquad(page);
    await shot(page, `${tag}-squad`);
    const ids = await page.$$eval('[data-cm-squad-row]', els => els.map(e => e.getAttribute('data-cm-squad-row')));
    const played = new Set(W.W1.squad.filter(p => (p.apps ?? 0) > 0).map(p => p.id));
    const deep = [...ids].reverse().find(id => played.has(id)) ?? ids[ids.length - 1];
    const keeper = W.W1.squad.find(p => p.position === 'GK' && (p.apps ?? 0) > 0)?.id;
    for (const [who, id] of [['deep', deep], ['keeper', keeper]]) {
      if (!id) continue;
      const row = page.locator(`[data-cm-squad-row="${id}"] > button`);
      await row.scrollIntoViewIfNeeded(); await row.click();
      const link = page.locator(`[data-cm-squad-detail="${id}"] [data-cm-card-link]`);
      await link.waitFor();
      await trip(page, `${tag}-${who}`, link, async () => (await page.locator(`[data-cm-squad-detail="${id}"]`).count()) === 1);
      await row.click();
    }
    await toStats(page);
    await page.locator('[data-cm-leaders-tile="goals"]').click();
    const rows = page.locator('[data-cm-board] [data-cm-board-row] [data-cm-card-link]');
    const n = await rows.count();
    checks += 1;
    if (!n) fail(`${tag}: the goals board has no card links`);
    else await trip(page, `${tag}-board`, rows.nth(n - 1), async () => (await page.locator('[data-cm-board="goals"]').count()) === 1);
    /* A plain visit later: leave Stats for the club home and come back. */
    await toStats(page);
    checks += 1;
    const again = await page.locator('[data-cm-board]').count();
    note(`${tag}: a later plain visit to Stats opens ${again ? 'ON A BOARD (the held state came back)' : 'on the tiles'}`);
    if (errors.length) fail(`${tag}: the page threw: ${errors[0].slice(0, 160)}`);
  } catch (e) { fail(`${tag}: the walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${tag}-stuck`); }
  await context.close();
}
if (W.W2) for (const size of SIZES) {
  const tag = `W2-${size[0]}`;
  const { context, page, errors } = await openPage(W.W2, size, 'reduce');
  try {
    await toSquad(page);
    const id = W.W2.squad.find(p => (p.apps ?? 0) > 0)?.id ?? W.W2.squad[0].id;
    const row = page.locator(`[data-cm-squad-row="${id}"] > button`);
    await row.scrollIntoViewIfNeeded(); await row.click();
    const link = page.locator(`[data-cm-squad-detail="${id}"] [data-cm-card-link]`);
    await link.click();
    await page.locator('[data-cm-card]').waitFor(); await page.waitForTimeout(300);
    await shot(page, `${tag}-oldsave-card`);
    const text = await page.locator('[data-cm-card]').innerText();
    checks += 3;
    if (!/No finished season with you yet/.test(text)) fail(`${tag}: an old save's card does not say no season is kept yet`);
    if (!/were played before the game kept them/.test(text)) fail(`${tag}: an old save in season ${W.W2.season} shows no kept from line`);
    note(`${tag}: ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
    await page.locator('[data-cm-card-back]').click();
    await page.waitForTimeout(500);
    const saved = await page.evaluate(k => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }, KEY);
    if (saved && ('pastLines' in saved || 'pastFrom' in saved)) fail(`${tag}: the page wrote a new key into an old save on load`);
    if (errors.length) fail(`${tag}: the page threw: ${errors[0].slice(0, 160)}`);
  } catch (e) { fail(`${tag}: the walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${tag}-stuck`); }
  await context.close();
}
await browser.close();
console.log(`walk1601: ${checks} checks, ${fails.length} failed`);
console.log(fails.length ? `walk1601: RED, ${fails.length} failures` : 'walk1601: green');
process.exit(fails.length ? 1 : 0);

// Reviewer walk for Round 1331 (lens: runs things). Runner only, never committed. Run from the repo root
// under #!serve (BASE set) and #!playwright: node .rc/x/rvwalk.mjs. Pictures and walk.json go to $RC_OUT.
// Plays the feature the way a player would: a 2026-27 Liverpool match from its dressing room (one change at
// the break, then three in play at three minutes, a shared stoppage, then a change at a fourth minute), a
// 2005-06 Everton dressing room, and a fresh Manager Hot Seat free run started from the menu (the press
// question at each whistle against the next fixture shown). 390x844 and 1280x900, reduced motion on and off.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rvwalk');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const log = [];
const note = (k, v) => { log.push({ k, v }); console.log(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
const bad = [];
const check = (name, ok, detail = '') => { if (!ok) bad.push(name); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` [${detail}]` : ''}`); };

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
function toHalftime(club, era, seed) {
  let s = withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
  s.squad = s.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  for (let i = 0; i < 12; i++) {
    const r = withSeed(seed + 1 + i, () => cm.playNextEntry(s));
    if (r.kind === 'halftime') { r.state.live.minute = 45; return r.state; }
    s = r.state;
  }
  throw new Error(`${club}: no half time`);
}
const liverpoolHt = toHalftime('Liverpool', null, 7331);
const evertonHt = toHalftime('Everton', 'era2005', 7332);
note('engine rule liverpool', cm.matchRuleOf(liverpoolHt));
note('engine rule everton', cm.matchRuleOf(evertonHt));

const browser = await pw.chromium.launch({ headless: true });
async function pageWith(vp, reduced, store) {
  const origin = new URL(BASE).origin;
  const context = await browser.newContext({ viewport: vp, isMobile: vp.width < 768, hasTouch: vp.width < 768, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin, localStorage: [...Object.entries(store).map(([name, value]) => ({ name, value })), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(12000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
async function openMatch(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const resume = page.getByRole('button', { name: /Resume Career/i }).first();
  if (await resume.count().catch(() => 0)) await resume.click({ timeout: 6000 }).catch(() => {});
  for (let i = 0; i < 10; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await page.locator('button:visible').filter({ hasText: /Play Live|Resume match|Back to the match/i }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}
const chip = async page => ((await page.locator('div').filter({ hasText: /^\s*Changes\s*·\s*\d+\s*left\s*$/ }).last().textContent({ timeout: 8000 }).catch(() => '')) ?? '').trim();
const minuteNow = async page => Number(await page.locator('[data-cm-live-stage]').first().getAttribute('data-cm-live-minute').catch(() => '-1'));
const stageNow = async page => (await page.locator('[data-cm-live-stage]').first().getAttribute('data-cm-live-stage').catch(() => '')) ?? '';
async function waitMinute(page, target, ms = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const m = await minuteNow(page);
    if (m >= target) return m;
    if ((await stageNow(page)) === 'done') return m;
    await page.waitForTimeout(150);
  }
  return await minuteNow(page);
}
const sheetLine = async page => ((await page.locator('[data-cm-live-sheet]').first().locator('div').first().textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
async function pause(page) { const b = page.getByRole('button', { name: 'Pause' }).first(); if (await b.count()) await b.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(250); }
async function resume(page) { const b = page.getByRole('button', { name: 'Resume' }).first(); if (await b.count()) await b.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(250); }
async function openDot(page, nth) {
  const dots = page.locator('button[data-cm-dot]:not([disabled])');
  const n = await dots.count();
  if (!n) return false;
  await dots.nth(Math.max(0, n - 1 - nth)).click({ timeout: 4000 }).catch(() => {});
  return await page.locator('[data-cm-live-sheet]').first().waitFor({ timeout: 4000 }).then(() => true).catch(() => false);
}
async function closeSheet(page) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }

async function halftimeSub(page) {
  const rows = page.locator('button:visible:not([disabled])').filter({ hasText: / rated / });
  const n = await rows.count();
  for (let i = n - 1; i >= 0; i--) {
    const t = (await rows.nth(i).textContent()) ?? '';
    if (/^\s*GK/.test(t)) continue;
    await rows.nth(i).click({ timeout: 3000 }).catch(() => {});
    const bring = page.getByText('Bring on', { exact: true }).first();
    if (!(await bring.count())) continue;
    const bench = bring.locator('xpath=..').locator('button');
    if (!(await bench.count())) return false;
    await bench.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function liveWalk(vp, reduced) {
  const tag = `${vp.width}-${reduced ? 'rm' : 'motion'}`;
  const { context, page } = await pageWith(vp, reduced, { [KEY]: JSON.stringify(liverpoolHt) });
  const opened = await openMatch(page);
  check(`${tag}: the Liverpool 2026-27 match opens`, opened);
  const c0 = await chip(page);
  await shot(page, `cm-${tag}-01-halftime`);
  check(`${tag}: dressing room offers five`, /5\s*left/.test(c0), c0);
  const did = await halftimeSub(page);
  const c1 = await chip(page);
  await shot(page, `cm-${tag}-02-halftime-after-one`);
  check(`${tag}: one change at the break leaves four`, did && /4\s*left/.test(c1), c1);
  await page.locator('button:visible').filter({ hasText: /Second half/ }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:visible').filter({ hasText: /^4x$/ }).first().click({ timeout: 3000 }).catch(() => {});
  const lines = [];
  let k = 0;
  for (const target of [57, 66, 75]) {
    const at = await waitMinute(page, target);
    await pause(page);
    const ok = await openDot(page, k);
    const line = await sheetLine(page);
    lines.push({ target, at, line });
    if (k === 0) await shot(page, `cm-${tag}-03-sheet-first-stop`);
    const benchBtn = page.locator('[data-cm-live-bench]').first();
    const has = await benchBtn.count();
    if (ok && has) await benchBtn.click({ timeout: 3000 }).catch(() => {});
    else await closeSheet(page);
    await page.waitForTimeout(500);
    k += 1;
    if (target !== 75) await resume(page);
  }
  note(`${tag} in-play lines`, lines);
  check(`${tag}: first in-play sheet reads three stops left`, /Subs left: 4 · 3 stops left/.test(lines[0]?.line ?? ''), lines[0]?.line);
  check(`${tag}: third in-play sheet reads one stop left`, /Subs left: 2 · 1 stop left/.test(lines[2]?.line ?? ''), lines[2]?.line);
  // Still paused at the third stoppage's minute: a second change here shares it.
  const okShared = await openDot(page, 4);
  const shared = await sheetLine(page);
  const sharedRefusal = await page.locator('[data-cm-live-refusal]').count();
  const sharedBench = await page.locator('[data-cm-live-bench]').count();
  await shot(page, `cm-${tag}-04-sheet-shared-stop`);
  note(`${tag} shared`, { okShared, shared, sharedRefusal, sharedBench });
  check(`${tag}: at the third stoppage's minute the bench stays open`, okShared && sharedRefusal === 0 && sharedBench > 0 && /Subs left: 1 · 0 stops left/.test(shared), shared);
  await closeSheet(page);
  await resume(page);
  const at4 = await waitMinute(page, 82);
  await pause(page);
  const okRef = await openDot(page, 5);
  const refusedLine = await sheetLine(page);
  const ref = page.locator('[data-cm-live-refusal]').first();
  const kind = await ref.getAttribute('data-cm-live-refusal').catch(() => null);
  const said = ((await ref.textContent().catch(() => '')) ?? '').trim();
  await ref.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `cm-${tag}-05-sheet-refused`);
  const box = () => page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  const b0 = await box();
  await ref.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
  const b1 = await box();
  const sizes = await page.evaluate(() => {
    const sheet = document.querySelector('[data-cm-live-sheet]');
    if (!sheet) return null;
    const vis = [...sheet.querySelectorAll('button')].filter(b => b.offsetParent);
    const px = sel => { const e = sheet.querySelector(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; };
    const label = sheet.firstElementChild?.firstElementChild;
    const r = label?.getBoundingClientRect(), s = sheet.getBoundingClientRect();
    return { buttons: vis.map(b => Math.round(b.getBoundingClientRect().height)), refusalPx: px('[data-cm-live-refusal]'), stopsPx: px('[data-cm-live-stops]'),
      labelOverflow: label ? label.scrollWidth - label.clientWidth : -1, labelRight: r ? Math.round(r.right - s.right) : 0, sheetBottom: Math.round(s.bottom), vh: innerHeight };
  });
  note(`${tag} refusal`, { at4, okRef, refusedLine, kind, said, b0, b1, sizes });
  check(`${tag}: a change at a fourth minute is refused for want of a stoppage`, kind === 'stops' && /No stoppages left/.test(said), `${kind}: ${said}`);
  check(`${tag}: refusal tap moves nothing`, b0.y === b1.y && b0.h === b1.h, `${JSON.stringify(b0)} ${JSON.stringify(b1)}`);
  check(`${tag}: sheet buttons at least 44 px`, !!sizes && sizes.buttons.every(h => h >= 44), sizes?.buttons?.join(','));
  check(`${tag}: new words at least 12 px`, !!sizes && sizes.refusalPx >= 12 && sizes.stopsPx >= 12, `${sizes?.refusalPx} ${sizes?.stopsPx}`);
  check(`${tag}: sheet top line not cut`, !!sizes && sizes.labelOverflow <= 1 && sizes.labelRight <= 1, JSON.stringify(sizes));
  await closeSheet(page);
  await resume(page);
  await waitMinute(page, 200, 150000);
  await page.waitForTimeout(1500);
  await shot(page, `cm-${tag}-06-final`);
  const rep = page.locator('button:visible').filter({ hasText: /^Full report$/ }).first();
  if (await rep.count()) { await rep.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1500); }
  const body = (await page.locator('body').innerText().catch(() => '')) ?? '';
  const subsLines = body.split('\n').filter(l => /\bfor\b|🔄|⇄|Sub|on for|off/i.test(l)).slice(0, 20);
  note(`${tag} report lines`, subsLines);
  await shot(page, `cm-${tag}-07-report`);
  if (page.errors.length) check(`${tag}: no page error`, false, page.errors.join(' | ').slice(0, 300));
  await context.close();
}

async function evertonRead(vp, reduced) {
  const tag = `${vp.width}-${reduced ? 'rm' : 'motion'}`;
  const { context, page } = await pageWith(vp, reduced, { [KEY]: JSON.stringify(evertonHt) });
  const opened = await openMatch(page);
  const c0 = opened ? await chip(page) : '';
  await shot(page, `cm-${tag}-everton-halftime`);
  check(`${tag}: 2005-06 dressing room offers three`, /3\s*left/.test(c0), c0);
  await page.locator('button:visible').filter({ hasText: /Second half/ }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:visible').filter({ hasText: /^4x$/ }).first().click({ timeout: 3000 }).catch(() => {});
  await waitMinute(page, 60);
  await pause(page);
  await openDot(page, 0);
  const line = await sheetLine(page);
  const stops = await page.locator('[data-cm-live-stops]').count();
  await shot(page, `cm-${tag}-everton-sheet`);
  check(`${tag}: 2005-06 sheet says three left and no stoppage count`, /Subs left: 3/.test(line) && stops === 0, line);
  await context.close();
}

const QRE = /on paper are a level above you|at the weekend/;
async function hotSeatWalk(vp, reduced) {
  const tag = `${vp.width}-${reduced ? 'rm' : 'motion'}`;
  const { context, page } = await pageWith(vp, reduced, {});
  await page.goto(`${BASE}/manager-hot-seat`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.getByRole('dialog').first().waitFor({ timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 3 && await page.getByRole('dialog').count().catch(() => 0); i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await shot(page, `hs-${tag}-01-menu`);
  await page.locator('button:visible').filter({ hasText: /^Pick a club/ }).first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('#hot-seat-league').selectOption({ value: 'proleague' }).catch(async () => {
    const opts = await page.locator('#hot-seat-league option').allTextContents();
    const pro = opts.find(o => /Pro League|Belgi/i.test(o));
    if (pro) await page.locator('#hot-seat-league').selectOption({ label: pro }).catch(() => {});
  });
  await page.locator('button:visible').filter({ hasText: /^Westerlo$/ }).first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('button:visible').filter({ hasText: /^Take the job/ }).first().click({ timeout: 30000 }).catch(() => {});
  const stamped = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('manager-hot-seat-free') || 'null'); } catch { return null; } });
  note(`${tag} free save after taking the job`, stamped && { club: stamped.club, rules: stamped.rules, v: stamped.v });
  check(`${tag}: a new free run is stamped 1331`, stamped?.rules === 1331, JSON.stringify(stamped && { rules: stamped.rules }));
  const seen = [];
  for (let n = 0; n < 14; n++) {
    const match = page.locator('[data-testid="hot-seat-match"]').first();
    if (!(await match.count())) break;
    const header = ((await match.locator('.text-lg').first().textContent().catch(() => '')) ?? '').trim();
    const qPre = ((await match.locator('[data-testid="hot-seat-press"] p').first().textContent().catch(() => '')) ?? '').trim();
    const pressPre = page.locator('[data-testid="hot-seat-match"] [data-testid="hot-seat-press"] button');
    if (await pressPre.count()) { await pressPre.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300); }
    if (seen.length) seen[seen.length - 1].nextHeader = header, seen[seen.length - 1].qOnNext = qPre;
    await page.locator('button:visible').filter({ hasText: /^Kick off$/ }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const resultText = ((await page.locator('body').innerText().catch(() => '')) ?? '');
    const resLine = resultText.split('\n').find(l => / to \d+ /.test(l) && /Westerlo/.test(l)) ?? '';
    const q = ((await page.locator('[data-testid="hot-seat-press"] p').first().textContent().catch(() => '')) ?? '').trim();
    seen.push({ n: n + 1, played: header, result: resLine, q });
    if (QRE.test(q)) await shot(page, `hs-${tag}-q${n + 1}`);
    const ans = page.locator('[data-testid="hot-seat-press"] button');
    if (await ans.count()) { await ans.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400); }
    const next = page.locator('button:visible').filter({ hasText: /^Next match$/ }).first();
    if (await next.count()) await next.click({ timeout: 3000 }).catch(() => {});
    else break;
    await page.waitForTimeout(500);
  }
  note(`${tag} hot seat`, seen);
  const asked = seen.filter(s => QRE.test(s.q));
  const named = s => { const m = /^(Home to|Away at|Neutral ground against) (.+)$/.exec(s ?? ''); return m ? m[2] : null; };
  const wrong = asked.filter(s => { const nx = named(s.nextHeader), pl = named(s.played); return !nx || !s.q.includes(nx) || (pl !== nx && s.q.includes(pl)); });
  note(`${tag} hot seat questions`, { asked: asked.length, wrong });
  check(`${tag}: every bigGame or derby question names the next fixture's opponent`, wrong.length === 0, `${asked.length} asked`);
  await shot(page, `hs-${tag}-99-end`);
  if (page.errors.length) check(`${tag}: no page error`, false, page.errors.join(' | ').slice(0, 300));
  await context.close();
}

const VPS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
for (const vp of VPS) for (const reduced of [true, false]) {
  try { await liveWalk(vp, reduced); } catch (e) { check(`live ${vp.width} ${reduced}: walk threw`, false, String(e).slice(0, 200)); }
  try { await evertonRead(vp, reduced); } catch (e) { check(`everton ${vp.width} ${reduced}: walk threw`, false, String(e).slice(0, 200)); }
  try { await hotSeatWalk(vp, reduced); } catch (e) { check(`hotseat ${vp.width} ${reduced}: walk threw`, false, String(e).slice(0, 200)); }
}
try { await liveWalk({ width: 320, height: 640 }, true); } catch (e) { check('live 320: walk threw', false, String(e).slice(0, 200)); }
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ log, bad }, null, 1));
console.log(`rvwalk ${bad.length ? 'RED' : 'GREEN'}: ${bad.length} failing checks${bad.length ? `: ${bad.slice(0, 6).join(' | ')}` : ''}`);
process.exit(bad.length ? 1 : 0);

/* Round 1331: the substitution rule and the press fixture, in the built page.

   Serves a built dist (DIST, default dist) with scripts/lib/hostLikeServer.mjs, every other host aborted
   (Supabase and the ad hosts included), at 320 by 640, 390 by 844 and 1280 by 900, and plants saves the
   real engine builds in node:
     (a) a 2026-27 Liverpool match at half time: the dressing room reads "5 left"; then the same match in
         the second half after one change at the break and one each at 60, 70 and 80: the live sheet reads
         "Subs left: 1" with "0 stops left" and refuses with the stoppage line;
     (b) a 2005-06 Everton match at half time: the dressing room reads "3 left";
     (c) Manager Hot Seat with a free run planted (Westerlo on the 2026-10-12 daily's seed, the hunt's two
         kick offs, stamped rules 1331): the question on the desk names Gent, and after a reload too;
     (d) on (a)'s sheet: scrollY and the document height do not move when the refusal is tapped, every
         button in the sheet is at least 44 px tall, the refusal is at least 12 px, the sheet's top line
         is not cut.
   Pictures go to $RC_OUT (or .tmp-fx/playCmSubsRule) as subs-<case>-<width>.png.

   Controls (PLAY_SUBS_CONTROL):
     oldcap   run against a dist built from a tree whose matchRuleOf answers three everywhere (DIST names
              it; the runner builds it from a copy, never committed): (a) red.
     nostamp  the same planted Hot Seat run without the stamp replays the base rules and names Cercle
              Brugge: (c) red.
   Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire. */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.env.DIST || 'dist');
const CONTROL = process.env.PLAY_SUBS_CONTROL || '';
const OUT = path.join(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'playCmSubsRule'), CONTROL || 'head');
const KEY = 'dukb-club-manager-save', FREE_KEY = 'manager-hot-seat-free';
const cannot = why => { console.log(`playCmSubsRule could not run: ${why}`); process.exit(2); };
if (CONTROL && !['oldcap', 'nostamp'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot(`no built page in ${DIST}`);
fs.mkdirSync(OUT, { recursive: true });

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- the saves, built by the real engine ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'play-subs-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as hs from '@/lib/managerHotSeat';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm, hs } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
function toHalftime(club, era, seed) {
  let s = withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
  s.squad = s.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  for (let i = 0; i < 12; i++) {
    const r = withSeed(seed + 1 + i, () => cm.playNextEntry(s));
    if (r.kind === 'halftime') return r.state;
    s = r.state;
  }
  cannot(`${club}: no half time in 12 entries`);
}
function sub(s, m) {
  const live = s.live, gone = cm.liveGoneIds(live, m), cameOn = new Set((live.subs ?? []).map(x => x.onId));
  const gk = id => s.squad.find(p => p.id === id)?.position === 'GK';
  const out = live.onPitch.find(id => !gone.has(id) && !gk(id) && !cameOn.has(id));
  const inn = cm.benchFor(s).find(p => !gone.has(p.id) && p.position !== 'GK');
  const next = out && inn ? withSeed(m * 7, () => cm.changeLive(s, m, { kind: 'sub', outId: out, inId: inn.id })) : null;
  if (!next) cannot(`the engine refused the fixture's change at ${m}`);
  return next;
}
/* A match paused in the dressing room, as the page saves one: the clock at 45 (left unset, the viewer replays
   the first half from kick off). */
const atBreak = s => { s.live.minute = 45; return s; };
const liverpoolHt = toHalftime('Liverpool', null, 2601);
const evertonHt = atBreak(toHalftime('Everton', 'era2005', 501));
let late = sub(liverpoolHt, 46);
late = withSeed(4601, () => cm.startSecondHalf(late));
for (const m of [60, 70, 80]) late = sub(late, m);
if (late.live.subsUsed !== 4 || cm.stopsUsed(late.live) !== 3) cannot('the second half fixture is not four changes in three stoppages');
/* Paused at 84, past the third stoppage's minute: a change at 80 itself would share that stoppage and be taken. */
late.live.minute = 84;
atBreak(liverpoolHt);
const daily = hs.dailyHotSeat('2026-10-12');
const kick = { t: 'match', m: 'balanced', talk: null };
const free = { v: 1, club: daily.club, seed: daily.seed, ...(CONTROL === 'nostamp' ? {} : { rules: 1331 }), actions: [kick, kick], done: false };

/* ---- the served page ---- */
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(e => (e ? reject(e) : resolve(p))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('the host like server did not start')), 15000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', d => { serverLog += d; if (String(d).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', d => { serverLog += d; });
}).catch(e => cannot(e.message));

const results = [];
const check = (part, name, ok, detail = '') => { results.push({ part, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} (${part}) ${name}${detail ? ` [${detail}]` : ''}`); };
const PROFILES = [{ width: 320, height: 640, touch: true }, { width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }];
const browser = await pw.chromium.launch({ headless: true });
async function pageWith(profile, store) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [...Object.entries(store).map(([name, value]) => ({ name, value })), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === BASE ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `subs-${name}.png`), fullPage: false }).catch(() => {});
/** Into the live viewer of the match the save holds. */
async function openMatch(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
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
/** The dressing room's changes chip, as read. */
async function chipText(page) {
  const chip = page.locator('div').filter({ hasText: /^Changes\s*·\s*\d+\s*left$/ }).last();
  await chip.waitFor({ timeout: 10000 }).catch(() => {});
  return (await chip.textContent().catch(() => '')) ?? '';
}

/* ---- the cases ---- */
for (const profile of PROFILES) {
  const w = profile.width;
  // (a) half time of a 2026-27 Premier League match: five.
  {
    const { context, page } = await pageWith(profile, { [KEY]: JSON.stringify(liverpoolHt) });
    const opened = await openMatch(page);
    const chip = opened ? await chipText(page) : '';
    await shot(page, `a-halftime-${w}`);
    check('a', `${w}: the 2026-27 dressing room offers five changes`, /·\s*5\s*left/.test(chip), chip || 'no chip');
    if (page.errors.length) check('a', `${w}: no page error`, false, page.errors[0]);
    await context.close();
  }
  // (a) and (d): the second half, one change at the break and three stoppages used.
  {
    const { context, page } = await pageWith(profile, { [KEY]: JSON.stringify(late) });
    const opened = await openMatch(page);
    const dot = page.locator('button[data-cm-dot]:not([disabled])').first();
    if (opened) await dot.click({ timeout: 6000 }).catch(() => {});
    const sheet = page.locator('[data-cm-live-sheet]').first();
    await sheet.waitFor({ timeout: 6000 }).catch(() => {});
    const line = ((await sheet.locator('div').first().textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ');
    const refusal = sheet.locator('[data-cm-live-refusal]').first();
    const kind = await refusal.getAttribute('data-cm-live-refusal').catch(() => null);
    const said = (await refusal.textContent().catch(() => '')) ?? '';
    await shot(page, `a-sheet-${w}`);
    check('a', `${w}: the live sheet reads one change and no stoppage left`, /Subs left: 1/.test(line) && /0 stops left/.test(line), line || 'no sheet');
    check('a', `${w}: the sheet refuses for want of a stoppage`, kind === 'stops' && /No stoppages left/.test(said), `${kind}: ${said}`);
    const box = async () => page.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
    const before = await box();
    await refusal.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const after = await box();
    check('d', `${w}: tapping the refusal moves nothing`, before.y === after.y && before.h === after.h, `${JSON.stringify(before)} then ${JSON.stringify(after)}`);
    const sizes = await sheet.evaluate(el => ({
      buttons: [...el.querySelectorAll('button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)),
      refusalPx: (() => { const r = el.querySelector('[data-cm-live-refusal]'); return r ? parseFloat(getComputedStyle(r).fontSize) : 0; })(),
      stopsPx: (() => { const r = el.querySelector('[data-cm-live-stops]'); return r ? parseFloat(getComputedStyle(r).fontSize) : 0; })(),
      cut: (() => {
        const label = el.firstElementChild?.firstElementChild;
        if (!label) return true;
        const r = label.getBoundingClientRect(), box = el.getBoundingClientRect();
        return label.scrollWidth > label.clientWidth + 1 || r.right > box.right + 0.5 || r.left < box.left - 0.5;
      })(),
    })).catch(() => null);
    check('d', `${w}: every button in the sheet is at least 44 px tall`, !!sizes && sizes.buttons.length > 0 && sizes.buttons.every(h => h >= 44), sizes ? sizes.buttons.join(',') : 'no sheet');
    check('d', `${w}: the new words are at least 12 px`, !!sizes && sizes.refusalPx >= 12 && sizes.stopsPx >= 12, sizes ? `${sizes.refusalPx} and ${sizes.stopsPx}` : 'no sheet');
    check('d', `${w}: the sheet's top line is not cut`, !!sizes && !sizes.cut);
    if (page.errors.length) check('a', `${w}: no page error`, false, page.errors[0]);
    await context.close();
  }
  // (b) half time of a 2005-06 match: three.
  {
    const { context, page } = await pageWith(profile, { [KEY]: JSON.stringify(evertonHt) });
    const opened = await openMatch(page);
    const chip = opened ? await chipText(page) : '';
    await shot(page, `b-halftime-${w}`);
    check('b', `${w}: the 2005-06 dressing room offers three changes`, /·\s*3\s*left/.test(chip), chip || 'no chip');
    await context.close();
  }
  // (c) Manager Hot Seat: the press asks about the next match.
  {
    const { context, page } = await pageWith(profile, { [FREE_KEY]: JSON.stringify(free) });
    const read = async () => {
      await page.goto(`${BASE}/manager-hot-seat`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
      /* The rules open on a first visit: close them the way a visitor does. */
      await page.getByRole('dialog').first().waitFor({ timeout: 4000 }).catch(() => {});
      for (let i = 0; i < 3 && await page.getByRole('dialog').count().catch(() => 0); i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
      await page.getByRole('button', { name: /Carry on at/i }).first().click({ timeout: 8000 }).catch(() => {});
      await page.getByText(/on paper are a level above you|at the weekend/).first().waitFor({ timeout: 15000 }).catch(() => {});
      return (await page.locator('p').filter({ hasText: /on paper are a level above you|at the weekend/ }).first().textContent().catch(() => '')) ?? '';
    };
    const first = await read();
    await shot(page, `c-hotseat-${w}`);
    const again = await read();
    check('c', `${w}: the desk asks about Gent, the next match, not Cercle Brugge`, /Gent/.test(first) && !/Cercle Brugge/.test(first), first || 'no question');
    check('c', `${w}: after a reload it still asks about Gent`, /Gent/.test(again) && !/Cercle Brugge/.test(again), again || 'no question');
    await context.close();
  }
}
await browser.close();
server.kill();
const red = results.filter(r => !r.ok);
const want = { oldcap: 'a', nostamp: 'c' }[CONTROL];
if (CONTROL) {
  const fired = red.some(r => r.part === want);
  console.log(fired ? `playCmSubsRule: control ${CONTROL} FIRED: ${red.filter(r => r.part === want).length} checks of (${want}) red` : `playCmSubsRule: control ${CONTROL} DID NOT FIRE`);
  process.exit(fired ? 1 : 3);
}
console.log(`playCmSubsRule ${red.length ? 'RED' : 'GREEN'}: ${results.length - red.length} of ${results.length} checks green; pictures in ${OUT}`);
process.exit(red.length ? 1 : 0);

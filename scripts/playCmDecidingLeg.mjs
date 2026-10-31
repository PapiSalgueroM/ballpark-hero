/* Round 1603: the report card of a deciding second leg, in the real page, at 390 and 1280 (player report b7b51855).

   The engine plays five seeded careers in turn (Real Madrid 2010-11, Barcelona 2015-16, Real Madrid and Bayern
   today, Barcelona 2005-06) and takes the first deciding second leg it meets, printing where each career stopped
   and which save it took (on the runners of 2026-10-30 Real Madrid 2010-11 went out at week 24, and Barcelona
   2015-16's round of 16 second leg at week 31 was taken). From there the fixture is fictional: the first leg's
   score is set in the save so each case is likely, and nothing here is a real result. Two saves
   go into the served page: one 4-0 up after the first leg, one 0-4 down. Each is played with Quick Sim on a seeded
   page until the card shows the case it is for, at most ATTEMPTS seeds each:
     through  a second leg lost or drawn on the night that still goes through: THROUGH, the night under it;
     out      a second leg won or drawn on the night that still goes out: OUT, the night under it.
   Checks on each card: the headline word and its tone, the night line's words, the scoreline, the page not
   scrolling sideways, the night line inside the card, no page error, and the motion: the card pulses
   (cmWinPulse) for THROUGH and shakes (cmLossShake) for OUT, and with reduced motion asked for (a third pass at
   390, review fix of 2026-10-30) it does neither. Screenshots go to RC_OUT (or .tmp-fx).
   Needs a built dist (DIST, default dist). Exit 0 green, 1 red, 2 could not run. */
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
import { answerConsent } from './lib/answerConsent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, process.env.DIST || 'dist');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'playCmDecidingLeg');
const ATTEMPTS = Number(process.env.ATTEMPTS || 14);
const KEY = 'dukb-club-manager-save';
const cannot = why => { console.log(`playCmDecidingLeg could not run: ${why}`); process.exit(2); };
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot(`no built page in ${DIST}`);
fs.mkdirSync(OUT, { recursive: true });

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- the saves, built by the real engine ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'play-deciding-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
let pre = null;
const trail = [];
for (const [club, era, seed] of [['Real Madrid', 'era2010', 16030], ['Barcelona', 'era2015', 16040], ['Real Madrid', 'now', 16050], ['Bayern Munich', 'now', 16060], ['Barcelona', 'era2005', 16070]]) {
  let s = withSeed(seed, () => cm.startCareer(club, era));
  let why = 'the guard';
  for (let i = 0; i < 160 && !pre; i++) {
    const e = s.calendar[s.week];
    if (e && e.type === 'uclKo' && e.uclLeg === 2 && s.uclKoRound === e.uclRound) { pre = s; why = 'found'; break; }
    const r = withSeed(seed + 1 + i, () => cm.playNextEntry(s, { skipHalftime: true }));
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked || s.uclKoRound === 'out') { why = `${r.kind}, week ${s.week}, Champions League ${s.uclKoRound ?? 'group'}, legs on the calendar ${s.calendar.filter(x => x.uclLeg === 2).length}`; break; }
  }
  trail.push(`${club} ${era}: ${why}`);
  if (pre) break;
}
console.log(`looking for a deciding second leg: ${trail.join('; ')}`);
if (!pre) cannot('no career met a deciding second leg');
const round = pre.calendar[pre.week].uclRound;
function plant(mine, theirs) {
  const s = structuredClone(pre);
  const tie = s.uclBracket.find(t => t.round === round && t.mine);
  if (!tie || !tie.leg1) cannot('no first leg on my tie in the bracket');
  tie.leg1 = tie.home === s.clubName ? { homeGoals: mine, awayGoals: theirs } : { homeGoals: theirs, awayGoals: mine };
  return s;
}
const CASES = [
  { kind: 'through', save: plant(4, 0), word: 'THROUGH', tone: 'text-correct', night: /^(Lost|Drew) \d+-\d+ on the night$/, cls: 'cm-win-pulse', anim: 'cmWinPulse' },
  { kind: 'out', save: plant(0, 4), word: 'OUT', tone: 'text-destructive', night: /^(Won|Drew) \d+-\d+ on the night$/, cls: 'cm-loss-shake', anim: 'cmLossShake' },
];
console.log(`the save: ${pre.clubName} ${pre.eraId}, week ${pre.week}, the ${round} second leg`);

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
const check = (name, ok, detail = '') => { results.push(!!ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` [${detail}]` : ''}`); };
const PROFILES = [{ width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }, { width: 390, height: 844, touch: true, reduced: true }];
const label = p => `${p.width}${p.reduced ? ' reduced motion' : ''}`;
const browser = await pw.chromium.launch({ headless: true });
async function attempt(profile, save, seed) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: 'block', reducedMotion: profile.reduced ? 'reduce' : 'no-preference',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: JSON.stringify(save) }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === BASE ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.addInitScript(s => {
    let a = s >>> 0;
    Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await answerConsent(page, { wait: 1200 });
  const quick = page.locator('[data-cm-way="quick"]').first();
  for (let i = 0; i < 12 && !(await quick.count().catch(() => 0)); i++) {
    const resume = page.getByRole('button', { name: /Resume Career|Continue career|Resume/i }).first();
    if (await resume.count().catch(() => 0)) await resume.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  if (!(await quick.count().catch(() => 0))) { await page.screenshot({ path: path.join(OUT, `no-quick-${profile.width}.png`) }).catch(() => {}); await context.close(); return { error: 'no Quick Sim button' }; }
  await quick.click();
  const h2 = page.locator('h2', { hasText: /^(THROUGH|OUT|VICTORY|DEFEAT|DRAW)/ }).first();
  await h2.waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const got = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => /^(THROUGH|OUT|VICTORY|DEFEAT|DRAW)/.test(x.textContent ?? ''));
    const night = document.querySelector('[data-cm-night-line]');
    const card = h?.parentElement;
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom }; };
    const moving = document.querySelector('.cm-win-pulse, .cm-loss-shake');
    const motion = moving ? { cls: moving.classList.contains('cm-win-pulse') ? 'cm-win-pulse' : 'cm-loss-shake', anim: getComputedStyle(moving).animationName } : null;
    return { head: h?.textContent ?? null, tone: h?.className ?? '', night: night?.textContent ?? null, card: r(card), nightBox: r(night), motion,
      score: card?.querySelector('.tabular-nums.font-display')?.textContent ?? null, wide: document.documentElement.scrollWidth > window.innerWidth };
  });
  return { ...got, errors, page, context };
}

for (const profile of PROFILES) {
  for (const c of CASES) {
    let found = null;
    let tried = 0;
    for (let seed = 1; seed <= ATTEMPTS && !found; seed++) {
      tried = seed;
      const a = await attempt(profile, c.save, 1603000 + seed * 97);
      if (a.error) { check(`${label(profile)} ${c.kind}: the page plays the leg`, false, a.error); break; }
      if (a.head && a.head.startsWith(c.word) && a.night && c.night.test(a.night)) {
        found = a;
        await a.page.screenshot({ path: path.join(OUT, `deciding-${c.kind}-${profile.width}${profile.reduced ? '-rm' : ''}.png`), fullPage: false }).catch(() => {});
      }
      if (!found) await a.context.close();
    }
    const L = label(profile);
    if (!found) { check(`${L} ${c.kind}: a card for the case within ${ATTEMPTS} seeds`, false); continue; }
    console.log(`   ${L} ${c.kind}: seed ${tried}, "${found.head}", "${found.night}", score ${found.score}, motion ${JSON.stringify(found.motion)}`);
    check(`${L} ${c.kind}: headline ${c.word} in its tone`, found.tone.includes(c.tone));
    check(`${L} ${c.kind}: the night line reads the night`, c.night.test(found.night), found.night);
    check(`${L} ${c.kind}: the scoreline is printed`, /\d+ - \d+/.test(found.score ?? ''), found.score ?? 'none');
    check(`${L} ${c.kind}: no sideways scroll`, !found.wide);
    const inCard = found.card && found.nightBox && found.nightBox.x >= found.card.x - 1 && found.nightBox.right <= found.card.right + 1 && found.nightBox.h > 0;
    check(`${L} ${c.kind}: the night line sits inside the card`, inCard, JSON.stringify(found.nightBox));
    check(`${L} ${c.kind}: no page error`, found.errors.length === 0, found.errors.slice(0, 2).join(' | '));
    /* The card carries the tie's motion class either way; reduced motion turns the animation itself off. */
    const still = found.motion?.cls === c.cls && found.motion.anim === 'none';
    const moves = found.motion?.cls === c.cls && found.motion.anim === c.anim;
    check(`${L} ${c.kind}: ${profile.reduced ? 'the card stays still' : `the card ${c.kind === 'through' ? 'pulses' : 'shakes'} (${c.anim})`}`, profile.reduced ? still : moves, JSON.stringify(found.motion));
    await found.context.close();
  }
}
await browser.close();
server.kill();
const red = results.filter(r => !r).length;
console.log(`playCmDecidingLeg ${red ? 'RED' : 'GREEN'}: ${results.length - red} of ${results.length} checks green`);
process.exit(red ? 1 : 0);

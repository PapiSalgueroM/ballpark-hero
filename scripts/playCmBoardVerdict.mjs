/* Round 1335: the board's verdict and the job market, in the built page.

   Serves a built dist (DIST, default dist) with scripts/lib/hostLikeServer.mjs, every other host aborted
   (Supabase and the ad hosts included), at 320 by 640, 390 by 844 and 1280 by 900, and plants saves the
   real engine builds in node:
     (a) a season review with two offers: a tap on one opens "Take the ... job?" inside the same panel, scrollY
         and the panel's top do not move, both buttons are at least 44 px tall, no new text is under 12 px and
         none of it is cut or outside the panel; Back shows the list and leaves the save as it was; Take the
         job starts the next season at that club (the save's club and season read back);
     (b) the same review is West Ham's promotion: the fate line reads "You went up." and the verdict names
         the Premier League;
     (c) a fresh career on day one and after a lost first match: the header's board meter reads Safe;
     (d) Everton's 2005-06 New year takeover: the Board panel lists no failed objective.
   Pictures go to $RC_OUT (or .tmp-fx/playCmBoardVerdict) as board-<case>-<width>.png, and are looked at.

   Controls (PLAY_BOARD_CONTROL), each run against a dist built from a patched copy of the tree (DIST names
   it; the runner builds it, nothing is committed):
     noconfirm  the offer card's onClick back to g.nextSeason(o.club): (a) red.
     nofate     the fate line taken out of the review: (b) red.
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
const CONTROL = process.env.PLAY_BOARD_CONTROL || '';
const OUT = path.join(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'playCmBoardVerdict'), CONTROL || 'head');
const KEY = 'dukb-club-manager-save';
const cannot = why => { console.log(`playCmBoardVerdict could not run: ${why}`); process.exit(2); };
if (CONTROL && !['noconfirm', 'nofate'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot(`no built page in ${DIST}`);
fs.mkdirSync(OUT, { recursive: true });

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- the saves, built by the real engine ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'play-board-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm, cal } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
const QUICK = { skipHalftime: true };
function seasonEnd(club, seed) {
  let s = withSeed(seed, () => cm.startCareer(club));
  for (let i = 0; i < 160; i++) {
    const r = withSeed(seed * 7919 + i + 1, () => cm.playNextEntry(s, QUICK));
    s = r.state;
    if (s.sacked) return null;
    if (r.kind === 'seasonOver') return withSeed(seed * 31 + 3, () => cm.finishSeason(s));
  }
  return null;
}
/* (a) and (b): the first seed on which West Ham go up. */
let promo = null;
for (let seed = 0; seed < 30 && !promo; seed++) { const f = seasonEnd('West Ham', 300 + seed); if (f?.summary.fate === 'up') promo = f; }
if (!promo) cannot('West Ham did not go up on any of 30 seeds');
const review = promo.state;
/* Two offers on the table: the engine's own when it dealt two, otherwise two clubs one tier up named the
   engine's way (the walk tests the screen, not the deal). */
if ((review.pendingSummary.offers ?? []).length < 2) {
  const mine = cm.clubDefFor('West Ham').tier;
  const pool = cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id)).filter(c => c.tier === Math.max(1, mine - 1) && c.name !== 'West Ham').slice(0, 2);
  review.pendingSummary.offers = pool.map(c => ({ club: c.name, blurb: `A club one tier up · ${cm.leagueOf(c.name).name} · the board wants: a strong season` }));
}
const offerClub = review.pendingSummary.offers[0].club;
/* (c): a fresh career, and the same career after a lost first match. */
const fresh = withSeed(500001, () => cm.startCareer('Brighton'));
let lost = null;
for (let seed = 1; seed < 80 && !lost; seed++) {
  let s = withSeed(500000 + seed, () => cm.startCareer('Brighton'));
  for (let i = 0; i < 12; i++) {
    const r = withSeed(seed * 101 + i, () => cm.playNextEntry(s, QUICK));
    s = r.state;
    if (r.kind === 'match') { if (!r.report.won && !r.report.drawn) lost = s; break; }
  }
}
if (!lost) cannot('no lost opener for Brighton in 80 seeds');
/* (d): Everton's 2005-06 New year takeover. */
const takeover = withSeed(9001, () => cal.startMidSeason(withSeed(9000, () => cm.startCareer('Everton', 'era2005')), 'newYear'));

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
async function pageWith(profile, save) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: JSON.stringify(save) }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === BASE ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `board-${name}.png`), fullPage: false }).catch(() => {});
async function open(page, ready) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 12; i++) {
    if (await page.locator(ready).count().catch(() => 0)) return true;
    const resume = page.getByRole('button', { name: /Resume Career|Continue career|Resume/i }).first();
    if (await resume.count().catch(() => 0)) await resume.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  return (await page.locator(ready).count().catch(() => 0)) > 0;
}
const saved = page => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } }, KEY);

const fired = { a: 0, b: 0 };
for (const profile of PROFILES) {
  const w = profile.width;
  /* (a) the confirm, then Back, then Take. */
  {
    const { context, page } = await pageWith(profile, review);
    const ok = await open(page, `[data-cm-offer="${offerClub}"]`);
    check('a', `${w}: the review shows the offers`, ok);
    if (ok) {
      const card = page.locator(`[data-cm-offer="${offerClub}"]`).first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      const before = await page.evaluate(() => ({ y: window.scrollY, top: document.querySelector('[data-cm-offers]')?.getBoundingClientRect().top ?? -1 }));
      const saveBefore = JSON.stringify(await saved(page));
      await card.click();
      await page.waitForTimeout(500);
      const confirm = page.locator('[data-cm-offer-confirm]');
      const asked = await confirm.count() > 0;
      if (!asked) fired.a += 1;
      check('a', `${w}: a tap opens the question in the same panel and moves nothing`, asked && (await saved(page))?.season === review.season);
      if (asked) {
        const m = await page.evaluate(() => {
          const panel = document.querySelector('[data-cm-offers]').getBoundingClientRect();
          const box = document.querySelector('[data-cm-offer-confirm]');
          const nodes = [...box.querySelectorAll('p, button')];
          const small = nodes.filter(n => parseFloat(getComputedStyle(n).fontSize) < 12).length;
          const out = nodes.filter(n => { const r = n.getBoundingClientRect(); return r.left < panel.left - 0.5 || r.right > panel.right + 0.5 || r.right > window.innerWidth || n.scrollWidth > n.clientWidth + 1; }).length;
          const buttons = [...box.querySelectorAll('button')].map(b => b.getBoundingClientRect().height);
          return { y: window.scrollY, top: panel.top, small, out, buttons, text: box.textContent };
        });
        check('a', `${w}: scrollY and the panel's top stay put`, Math.abs(m.y - before.y) <= 1 && Math.abs(m.top - before.top) <= 1, `y ${before.y} to ${m.y}, top ${before.top} to ${m.top}`);
        check('a', `${w}: both buttons at least 44 px tall`, m.buttons.length === 2 && m.buttons.every(h => h >= 44), m.buttons.join(', '));
        check('a', `${w}: no new text under 12 px, none cut or outside the panel`, m.small === 0 && m.out === 0, `${m.small} small, ${m.out} out`);
        check('a', `${w}: the question names the club`, m.text.includes(`Take the ${offerClub} job?`));
        await shot(page, `confirm-${w}`);
        await page.locator('[data-cm-offer-back]').click();
        await page.waitForTimeout(400);
        check('a', `${w}: Back shows the list and leaves the save as it was`, (await page.locator('[data-cm-offer]').count()) >= 2 && JSON.stringify(await saved(page)) === saveBefore);
        await page.locator(`[data-cm-offer="${offerClub}"]`).first().click();
        await page.waitForTimeout(400);
        await page.locator('[data-cm-offer-take]').click();
        await page.waitForTimeout(2500);
        const after = await saved(page);
        check('a', `${w}: Take the job starts season ${review.season + 1} at ${offerClub}`, after?.clubName === offerClub && after?.season === review.season + 1, `${after?.clubName} season ${after?.season}`);
      }
    }
    check('a', `${w}: no page error`, page.errors.length === 0, page.errors[0] ?? '');
    await context.close();
  }
  /* (b) the promotion review names it. */
  {
    const { context, page } = await pageWith(profile, review);
    await open(page, '[data-season-lines]');
    await page.waitForTimeout(3500);
    const fate = await page.locator('[data-cm-fate="up"]').textContent().catch(() => null);
    if (!fate) fired.b += 1;
    check('b', `${w}: the fate line reads You went up.`, (fate ?? '').includes('You went up.'), fate ?? 'none');
    const body = await page.locator('body').innerText().catch(() => '');
    check('b', `${w}: the verdict names the Premier League`, body.includes(review.pendingSummary.verdict) && review.pendingSummary.verdict.includes('the Premier League'), review.pendingSummary.verdict);
    await shot(page, `promotion-${w}`);
    await context.close();
  }
  /* (c) the board meter of a fresh career, then after a lost opener. */
  for (const [name, save] of [['fresh', fresh], ['lost', lost]]) {
    const { context, page } = await pageWith(profile, save);
    const ok = await open(page, '[data-cm-meter="board"]');
    const word = ok ? await page.locator('[data-cm-meter="board"]').first().innerText().catch(() => '') : '';
    check('c', `${w}: ${name === 'fresh' ? 'a fresh career' : `after a lost opener (${save.boardConfidence})`} reads Safe`, /Safe/.test(word), word.replace(/ +/g, ' ').slice(0, 60));
    await shot(page, `${name}-${w}`);
    await context.close();
  }
  /* (d) the takeover's Board panel. */
  {
    const { context, page } = await pageWith(profile, takeover);
    const ok = await open(page, '[data-cm-meter="board"]');
    /* The Board tile is the one whose line reads the club's patience. */
    if (ok) await page.locator('button:visible').filter({ hasText: /patience/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
    const body = await page.locator('body').innerText().catch(() => '');
    check('d', `${w}: the Board panel lists no failed objective`, ok && !/Failed/.test(body));
    await shot(page, `takeover-${w}`);
    await context.close();
  }
}
await browser.close();
server.kill();
const red = results.filter(r => !r.ok);
if (CONTROL) {
  const n = CONTROL === 'noconfirm' ? fired.a : fired.b;
  if (n > 0 && red.length) { console.log(`control ${CONTROL} FIRED: ${red.length} checks red, ${n} cases`); process.exit(1); }
  console.log(`control ${CONTROL} DID NOT FIRE`); process.exit(3);
}
console.log(`playCmBoardVerdict ${red.length ? 'RED' : 'GREEN'}: ${results.length - red.length} of ${results.length} checks green`);
process.exit(red.length ? 1 : 0);

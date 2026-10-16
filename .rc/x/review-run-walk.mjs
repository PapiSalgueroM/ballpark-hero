/* Review (runner lens) of Round 1343: play retiring and the record line the way a player would.
   Sent as .rc/x/review-run-walk.mjs; run from the repo root after a build (dist). Every host but the
   local server is aborted, supabase.co first. Screenshots go to $RC_OUT as rv-*.png. Prints NOTE lines
   for anything a player would see as wrong, and a closing summary line. Exit 0 unless it could not run. */
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'review-run-walk');
const KEY = 'dukb-club-manager-save';
const cannot = why => { console.log(`walk could not run: ${why}`); process.exit(2); };
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot('no dist');
fs.mkdirSync(OUT, { recursive: true });
const notes = [];
const note = (s) => { notes.push(s); console.log(`NOTE ${s}`); };
const info = (s) => console.log(`INFO ${s}`);

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-walk-'));
fs.writeFileSync(path.join(work, 'entry.ts'), "export * as cm from '@/lib/clubManager';\nexport * as rec from '@/lib/clubManagerRecords';\n");
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm, rec } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
const clone = v => JSON.parse(JSON.stringify(v));
function play(s, seed, n, { keepJob = true } = {}) {
  for (let season = 0; season < n; season++) {
    for (let i = 0; i < 140; i++) {
      if (keepJob && s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = withSeed(seed * 7919 + season * 997 + i + 1, () => cm.playNextEntry(s, { skipHalftime: true }));
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    if (season + 1 < n) s = withSeed(seed + season + 5, () => cm.startNextSeason(cm.finishSeason(s).state));
  }
  return s;
}
function stored(s) {
  memory.clear();
  if (!withSeed(1, () => cm.saveCareer(s))) cannot('saveCareer refused a fixture');
  return Object.fromEntries(memory);
}
const MANAGER = { name: 'Sam Reid', nationality: 'England', background: 'exPlayer', style: 'balanced' };
/* F1: a fresh career, no match played yet. */
const fresh = withSeed(11, () => cm.startCareer('Everton'));
/* F2: a real sacking: the board's patience set to the edge before each entry until the engine sacks. */
let sk = withSeed(12, () => cm.startCareer('Everton'));
sk = play(sk, 12, 1);
sk = withSeed(13, () => cm.startNextSeason(cm.finishSeason(sk).state));
for (let i = 0; i < 80 && !sk.sacked; i++) { sk = { ...sk, boardConfidence: Math.min(sk.boardConfidence, 0.5) }; sk = withSeed(400 + i, () => cm.playNextEntry(sk, { skipHalftime: true })).state; }
info(`F2 sacked=${!!sk.sacked} season ${sk.season} week ${sk.week} played ${sk.careerStats.played} history ${sk.history?.length}`);
/* F3: a named manager at a big club, three seasons, at the season end. */
let big = withSeed(14, () => cm.startCareer('Barcelona', 'era2015', undefined, MANAGER));
big = play(big, 14, 3);
big = withSeed(15, () => cm.finishSeason(big).state);
info(`F3 ${big.clubName} S${big.season} pending=${!!big.pendingSummary} trophies ${big.trophies.length} played ${big.careerStats.played} record ${JSON.stringify(rec.highestScoringOf(big))}`);
/* F4: an old save, leaned the way a parked slot is, mid season, so the panel shows the second line. */
let old = withSeed(16, () => cm.startCareer('Everton'));
old = play(old, 16, 4);
old = withSeed(17, () => cm.startNextSeason(cm.finishSeason(old).state));
for (let i = 0; i < 6; i++) old = withSeed(500 + i, () => cm.playNextEntry(old, { skipHalftime: true })).state;
delete old.careerStats.highestScoring;
old = cm.leanCareer(clone(old));
info(`F4 played ${old.careerStats.played} book ${old.h2h.length} derived ${JSON.stringify(rec.highestScoringOf(old))}`);
const SAVES = { fresh: stored(fresh), sacked: stored(sk), big: stored(big), old: stored(old) };

/* ---- the served page ---- */
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(e => (e ? reject(e) : resolve(p))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('server did not start')), 15000);
  server.stdout.on('data', d => { if (String(d).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
}).catch(e => cannot(e.message));
const browser = await pw.chromium.launch({ headless: true });
const PHONE = { width: 390, height: 844, touch: true }, DESK = { width: 1280, height: 900, touch: false };
async function pageWith(profile, store, reduced) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: 'block',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [...Object.entries(store).map(([name, value]) => ({ name, value })), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', route => (new URL(route.request().url()).origin === BASE ? route.continue() : route.abort()));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const tag = (p, r) => `${p.width}${r ? '-rm' : ''}`;
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `rv-${name}.png`), fullPage: full }).catch(() => {});
const diskCareer = async page => { try { return JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEY)); } catch { return null; } };
const text = async (page, sel) => ((await page.locator(sel).first().textContent({ timeout: 3000 }).catch(() => '')) ?? '').trim();
async function land(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 15000 }).catch(() => {});
  return (await page.locator('[data-testid="cm-slots"]').count()) > 0;
}
async function openSlot(page) { await page.locator('[data-cm-slot-open]').first().click(); await page.waitForTimeout(900); }
async function managerPanel(page) {
  await page.locator('button').filter({ has: page.locator('div', { hasText: /^Manager$/ }) }).first().click({ timeout: 8000 });
  await page.locator('[data-cm-career-lines]').first().waitFor({ timeout: 8000 }).catch(() => {});
}
async function confirmAndRetire(page, label) {
  const door = page.locator('[data-cm-retire-door]').first();
  await door.scrollIntoViewIfNeeded();
  await door.click();
  const lines = (await page.locator('[data-cm-retire-confirm] p').allTextContents()).join(' | ');
  info(`${label} confirm: ${lines}`);
  await page.waitForTimeout(700);
  await shot(page, `${label}-confirm`);
  await page.locator('[data-cm-retire-yes]').click();
  await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
  return lines;
}
async function farewellFacts(page, label) {
  const facts = {
    headline: await text(page, 'h2, [data-result-headline]'),
    moment: await text(page, '[data-cm-farewell-moment]'),
    body: ((await page.locator('[data-cm-farewell]').first().evaluate(el => el.closest('div[class*="rounded-2xl"]')?.innerText ?? el.innerText).catch(() => '')) ?? '').replace(/\s+/g, ' ').slice(0, 600),
  };
  info(`${label} farewell: ${JSON.stringify(facts)}`);
  return facts;
}

/* ---- S1: a fresh career retires before its first match, from the Manager panel, by keyboard on desk ---- */
async function s1(profile) {
  const L = `S1-fresh-${tag(profile)}`;
  const { context, page } = await pageWith(profile, SAVES.fresh, false);
  try {
    if (!(await land(page))) { note(`${L}: no managers screen`); return; }
    await openSlot(page);
    await managerPanel(page);
    await page.locator('[data-cm-retire-door]').first().scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `${L}-panel`);
    let lines;
    if (!profile.touch) {
      await page.locator('[data-cm-retire-door]').first().click();
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-cm-retire-yes') !== null ? 'yes' : document.activeElement?.textContent);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      const early = (await diskCareer(page))?.retired;
      info(`${L}: Tab moved focus to ${focused}; Enter before the arm retired=${!!early}`);
      if (early) note(`${L}: Enter on Yes before the 600 ms arm retired the career`);
      lines = (await page.locator('[data-cm-retire-confirm] p').allTextContents()).join(' | ');
      info(`${L} confirm: ${lines}`);
      await page.waitForTimeout(700);
      await page.keyboard.press('Enter');
      await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
      if (!(await page.locator('[data-cm-farewell]').count())) note(`${L}: Enter on an armed Yes did not retire`);
    } else lines = await confirmAndRetire(page, L);
    if (/in the league/.test(lines) && fresh.careerStats.played === 0) note(`${L}: the confirm names a league position before a single game: "${lines.split(' | ')[1] ?? lines}"`);
    const f = await farewellFacts(page, L);
    if (/after 0 league games/.test(f.moment)) note(`${L}: the farewell says "${f.moment}"`);
    await shot(page, `${L}-farewell`);
    await shot(page, `${L}-farewell-full`, true);
    if (page.errors.length) note(`${L}: page error ${page.errors[0]}`);
  } finally { await context.close(); }
}

/* ---- S2: a real sacking, retire from the sacked screen, then the managers screen and Delete's words ---- */
async function s2(profile) {
  const L = `S2-sacked-${tag(profile)}`;
  const { context, page } = await pageWith(profile, SAVES.sacked, false);
  try {
    if (!(await land(page))) { note(`${L}: no managers screen`); return; }
    await openSlot(page);
    await shot(page, `${L}-screen-full`, true);
    if (!(await page.locator('[data-cm-retire-door]').count())) { note(`${L}: no retire door on the sacked screen`); return; }
    await confirmAndRetire(page, L);
    const f = await farewellFacts(page, L);
    if (!/out of work/.test(f.moment)) note(`${L}: the moment line does not say out of work: ${f.moment}`);
    await shot(page, `${L}-farewell`);
    await page.locator('[data-testid="cm-show-slots-retired"]').click();
    await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
    const tile = (await text(page, '[data-testid="cm-slots"]')).replace(/\s+/g, ' ');
    info(`${L} slots: ${tile.slice(0, 300)}`);
    await shot(page, `${L}-slots`);
    const del = page.getByRole('button', { name: /^Delete$/ }).first();
    if (await del.count()) {
      await del.click();
      const words = (await text(page, '[data-testid="cm-slots"]')).replace(/\s+/g, ' ');
      if (!/The farewell goes with it\./.test(words)) note(`${L}: the Delete confirm does not say the farewell goes with it`);
      await shot(page, `${L}-delete-confirm`);
      await page.getByRole('button', { name: /keep|cancel/i }).first().click().catch(() => {});
    } else note(`${L}: no Delete button on the retired tile`);
    await openSlot(page);
    if (!(await page.locator('[data-cm-farewell]').count())) note(`${L}: See the farewell did not open the farewell`);
    if (page.errors.length) note(`${L}: page error ${page.errors[0]}`);
  } finally { await context.close(); }
}

/* ---- S3: a named manager with trophies retires at the season end; touch taps; tiles; reload; home ---- */
async function s3(profile, reduced) {
  const L = `S3-big-${tag(profile, reduced)}`;
  const { context, page } = await pageWith(profile, SAVES.big, reduced);
  try {
    if (!(await land(page))) { note(`${L}: no managers screen`); return; }
    await openSlot(page);
    await shot(page, `${L}-seasonend-full`, true);
    const door = page.locator('[data-cm-retire-door]').first();
    if (!(await door.count())) { note(`${L}: no door on the season end screen`); return; }
    await door.scrollIntoViewIfNeeded();
    if (profile.touch) {
      await door.tap();
      await page.locator('[data-cm-retire-yes]').tap();
      await page.waitForTimeout(80);
      if ((await diskCareer(page))?.retired) note(`${L}: a tap on Yes straight after the door retired before the arm`);
      await page.waitForTimeout(700);
      await shot(page, `${L}-confirm`);
      await page.locator('[data-cm-retire-yes]').tap();
    } else {
      await door.click();
      await page.waitForTimeout(700);
      await shot(page, `${L}-confirm`);
      await page.locator('[data-cm-retire-yes]').click();
    }
    await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(60);
    await shot(page, `${L}-farewell-60ms`);
    await page.waitForTimeout(1500);
    await shot(page, `${L}-farewell`);
    const f = await farewellFacts(page, L);
    if (!/Farewell, Sam Reid/.test(f.body + f.headline)) note(`${L}: the headline does not name the manager`);
    const r = (await diskCareer(page))?.retired;
    if (r?.when !== 'seasonEnd') note(`${L}: the disk holds ${JSON.stringify(r)}`);
    for (const key of ['clubs', 'cabinet', 'records']) {
      await page.locator(`[data-cm-farewell-tile="${key}"]`).click();
      await page.waitForTimeout(200);
      const body = (await text(page, `[data-cm-farewell-open="${key}"]`)).replace(/\s+/g, ' ');
      info(`${L} ${key}: ${body.slice(0, 400)}`);
      await shot(page, `${L}-tile-${key}`);
      if (key === 'records') {
        const want = rec.highestScoringOf(big);
        const line = await text(page, '[data-cm-highest-scoring]');
        if (!want || !line.includes(want.score) || !line.includes(want.opp)) note(`${L}: Records reads "${line}", node says ${JSON.stringify(want)}`);
      }
      await page.locator('[data-cm-farewell-back]').click();
    }
    if (!reduced && profile.touch) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 12000 }).catch(() => {});
      await shot(page, `${L}-reload-slots`);
      await openSlot(page);
      if (!(await page.locator('[data-cm-farewell]').count())) note(`${L}: See the farewell after a reload did not open it`);
      await page.getByRole('button', { name: /Start a new manager/i }).first().click();
      await page.waitForTimeout(900);
      await shot(page, `${L}-new-manager`);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const cont = ((await page.locator('body').innerText().catch(() => '')) ?? '').match(/.{0,80}Club Manager.{0,120}/s)?.[0]?.replace(/\s+/g, ' ');
      info(`${L} home continue: ${cont}`);
      await shot(page, `${L}-home`);
    }
    if (page.errors.length) note(`${L}: page error ${page.errors[0]}`);
  } finally { await context.close(); }
}

/* ---- S4: an old leaned save mid season: the record line and its second line on the panel ---- */
async function s4(profile) {
  const L = `S4-old-${tag(profile)}`;
  const { context, page } = await pageWith(profile, SAVES.old, false);
  try {
    if (!(await land(page))) { note(`${L}: no managers screen`); return; }
    await openSlot(page);
    const before = await page.evaluate(k => localStorage.getItem(k), KEY);
    await managerPanel(page);
    await page.waitForTimeout(600);
    const lines = (await text(page, '[data-cm-career-lines]')).replace(/\s+/g, ' ');
    info(`${L} lines: ${lines}`);
    const want = rec.highestScoringOf(old);
    const missed = await text(page, '[data-cm-highest-scoring-missed]');
    const expect = `Counted from ${old.careerStats.played - want.missed} of your ${old.careerStats.played} matches.`;
    if (!missed.startsWith(expect.replace(/(\d)(\d{3})\b/g, '$1,$2'))) note(`${L}: second line "${missed}", expected to start "${expect}"`);
    await page.locator('[data-cm-career-lines]').first().scrollIntoViewIfNeeded();
    await shot(page, `${L}-panel`);
    const after = await page.evaluate(k => localStorage.getItem(k), KEY);
    if (before !== after && JSON.parse(after ?? '{}')?.careerStats?.highestScoring) note(`${L}: opening the panel wrote a record to the disk`);
    if (page.errors.length) note(`${L}: page error ${page.errors[0]}`);
  } finally { await context.close(); }
}

try {
  for (const p of [PHONE, DESK]) { await s1(p); await s2(p); await s4(p); }
  await s4({ width: 320, height: 640, touch: true });
  await s3(PHONE, false);
  await s3(PHONE, true);
  await s3(DESK, false);
} catch (e) {
  note(`the walk threw: ${String(e?.stack ?? e).split('\n').slice(0, 3).join(' / ')}`);
} finally {
  await browser.close();
  server.kill();
}
console.log(`walk: done, ${notes.length} notes. Pictures in ${OUT}`);
process.exit(0);

/* Round 1343: retiring as a manager, and the highest scoring game, in the built page.

   Serves a built dist (DIST, default dist) with scripts/lib/hostLikeServer.mjs, every other host aborted
   (Supabase and the ad hosts included), and plants saves the real engine builds in node (seed 1343):
     A  season end: Everton 2026-27, three seasons played, at the season end. Resume Career opens the season end
        screen; a double click on the door does not retire; Yes after it arms opens the farewell, whose Records
        tile reads the highest scoring line node computed. A reload lands on the managers screen (every career's
        landing) with the tile saying retired and See the farewell, which opens it, and the disk holds `retired`.
        Start a new manager opens the picker with the retired career parked in slot 1.
     B  mid season: Liverpool, season 2, twelve entries in. The Manager panel shows the line; retiring there
        names the week and the position on the farewell.
     C  out of work: a sacked career retires from the sacked screen; the farewell says out of work, and after a
        reload See the farewell opens it again, never the sacked screen (the save stays sacked under `retired`).
     D  old save: a save without the field on a whole book shows the line with no second line, and opening the
        panel writes nothing new; the same save leaned shows the second line with the right numbers.
     E  the page, at 320 by 640, 390 by 844 and 1280 by 900 (and with reduced motion): scrollY and the door's
        top do not move when the confirm opens or after Keep managing; every new control is at least 44 px;
        no new text under 12 px; nothing new is cut or wider than the page.
     F  played out (review fix): the A career a step earlier, every match played and See Season Review not yet
        opened. The Manager panel draws no door and points at the review; after the review the season end door
        retires with that season in the history and the league title (when node's review gives one) in the cabinet.
   A to D and F run at 390 by 844 and 1280 by 900. Pictures go to $RC_OUT (or .tmp-fx/playCmRetire) as retire-*.png.

   Controls (PLAY_RETIRE_CONTROL):
     strip     an init script deletes `retired` from the save on every load: A's reload red.
     norecord  D's planted save has its stored record and its book emptied: D's line red.
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
const CONTROL = process.env.PLAY_RETIRE_CONTROL || '';
const OUT = path.join(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'playCmRetire'), CONTROL || 'head');
const KEY = 'dukb-club-manager-save';
const cannot = why => { console.log(`playCmRetire could not run: ${why}`); process.exit(2); };
if (CONTROL && !['strip', 'norecord'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) cannot(`no built page in ${DIST}`);
fs.mkdirSync(OUT, { recursive: true });

function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}

/* ---- the saves, built by the real engine ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'play-retire-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as rec from '@/lib/clubManagerRecords';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm, rec } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
function seasons(club, seed, n) {
  let s = withSeed(seed, () => cm.startCareer(club));
  for (let season = 0; season < n; season++) {
    for (let i = 0; i < 140; i++) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = withSeed(seed * 7919 + season * 997 + i + 1, () => cm.playNextEntry(s, { skipHalftime: true }));
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    if (season + 1 < n) s = withSeed(seed + season + 5, () => cm.startNextSeason(cm.finishSeason(s).state));
  }
  return s;
}
/** What saveCareer leaves in storage for this career, every key. */
function stored(s) {
  memory.clear();
  if (!withSeed(1, () => cm.saveCareer(s))) cannot('saveCareer refused a fixture');
  return Object.fromEntries(memory);
}
const spent = seasons('Everton', 1343, 3);
/* F: the same career a step earlier, every match played and the review not yet seen (taken before finishSeason). */
const playedOut = JSON.parse(JSON.stringify(spent));
const atEnd = withSeed(9, () => cm.finishSeason(spent).state);
if (!atEnd.pendingSummary || atEnd.sacked) cannot('the season end fixture is not at a season end');
if (playedOut.pendingSummary || playedOut.sacked || cm.nextFixture(playedOut).kind !== 'seasonOver') cannot('the played out fixture is not played out');
const titleWon = atEnd.trophies.some(t => t.name === 'League Title' && t.season === playedOut.season);
let mid = withSeed(10, () => cm.startNextSeason(cm.finishSeason(seasons('Liverpool', 1344, 1)).state));
for (let i = 0; i < 12; i++) mid = withSeed(200 + i, () => cm.playNextEntry(mid, { skipHalftime: true })).state;
if (mid.sacked || mid.pendingSummary) cannot('the mid season fixture is not mid season');
const sacked = { ...JSON.parse(JSON.stringify(mid)), sacked: true };
/* Four seasons, so the league's opponents have been met more than six times and leaning drops meetings. */
const oldWhole = seasons('Everton', 1345, 4);
delete oldWhole.careerStats.highestScoring;
const oldLean = cm.leanCareer(JSON.parse(JSON.stringify(oldWhole)));
if (oldLean.h2h.length >= oldLean.careerStats.played) cannot('leaning the old save dropped no meeting, so the leaned case proves nothing');
if (oldWhole.h2h.length !== oldWhole.careerStats.played) cannot('the book of the old save does not hold every match');
const expectA = rec.highestScoringOf(atEnd);
const expectB = rec.highestScoringOf(mid);
const expectWhole = rec.highestScoringOf(oldWhole);
const expectLean = rec.highestScoringOf(oldLean);
if (!expectA || !expectB) cannot('a fixture has no highest scoring game');
console.log(`fixtures: A ${atEnd.clubName} S${atEnd.season} ${atEnd.careerStats.played} played, record ${expectA.score} vs ${expectA.opp}; B ${mid.clubName} S${mid.season} week ${mid.week}; D ${oldWhole.careerStats.played} played, book ${oldWhole.h2h.length}, leaned ${oldLean.h2h.length}`);
/* The control empties the planted copies only, after the expected lines were worked out. */
const plant = s => (CONTROL === 'norecord' ? { ...JSON.parse(JSON.stringify(s)), h2h: [] } : s);
const SAVES = { A: stored(atEnd), B: stored(mid), C: stored(sacked), D: stored(plant(oldWhole)), Dlean: stored(plant(oldLean)), F: stored(playedOut) };

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
const browser = await pw.chromium.launch({ headless: true });
async function pageWith(profile, store, { reduced = false } = {}) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: 'block',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [...Object.entries(store).map(([name, value]) => ({ name, value })), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === BASE ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  if (CONTROL === 'strip') {
    await context.addInitScript(k => { try { const raw = localStorage.getItem(k); if (raw) { const c = JSON.parse(raw); if (c.retired) { delete c.retired; localStorage.setItem(k, JSON.stringify(c)); } } } catch { /* nothing */ } }, KEY);
  }
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e?.message ?? e)));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `retire-${name}.png`), fullPage: false }).catch(() => {});
const disk = page => page.evaluate(k => localStorage.getItem(k), KEY);
const diskRetired = async page => { const raw = await disk(page); try { return raw ? JSON.parse(raw).retired ?? null : null; } catch { return null; } };
async function land(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 15000 }).catch(() => {});
  return (await page.locator('[data-testid="cm-slots"]').count()) > 0;
}
async function openSlotButton(page) {
  const b = page.locator('[data-cm-slot-open]').first();
  await b.click({ timeout: 8000 });
  await page.waitForTimeout(600);
}
/** The door's box and scrollY, with the door already in view. */
async function where(page, sel) {
  return page.evaluate(s => { const el = document.querySelector(s); const r = el ? el.getBoundingClientRect() : null; return { y: window.scrollY, top: r ? Math.round(r.top) : null }; }, sel);
}
async function openManagerPanel(page) {
  const tile = page.locator('button').filter({ has: page.locator('div', { hasText: /^Manager$/ }) }).first();
  await tile.click({ timeout: 8000 });
  await page.locator('[data-manager-card], [data-cm-career-lines]').first().waitFor({ timeout: 8000 }).catch(() => {});
}
const lineText = g => `${g.score}`;
async function readRecordLine(page) {
  return (await page.locator('[data-cm-highest-scoring]').first().textContent({ timeout: 4000 }).catch(() => null)) ?? null;
}
const hasRecord = (text, g) => !!text && text.includes(lineText(g)) && text.includes(`vs ${g.opp}`) && text.includes(`Season ${g.season}`);

/* ---- A: season end ---- */
async function walkA(profile) {
  const P = `A ${profile.width}`;
  const { context, page } = await pageWith(profile, SAVES.A);
  try {
    if (!(await land(page))) { check(P, 'the page lands on the managers screen', false); return; }
    await openSlotButton(page);
    const door = page.locator('[data-cm-retire-door]').first();
    if (!(await door.count())) { check(P, 'the season end screen has the door', false); return; }
    await door.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await where(page, '[data-cm-retire-door]');
    await door.dblclick();
    await page.waitForTimeout(250);
    const after = await where(page, '[data-cm-retire-confirm]');
    check(P, 'a double click on the door opens the confirm and does not retire', (await page.locator('[data-cm-retire-confirm]').count()) === 1 && !(await diskRetired(page)) && (await page.locator('[data-cm-farewell]').count()) === 0);
    check(P, 'the confirm opens where the door was and the page does not move', before.y === after.y && before.top === after.top, `scrollY ${before.y} to ${after.y}, top ${before.top} to ${after.top}`);
    await shot(page, `A-confirm-${profile.width}`);
    await page.locator('[data-cm-retire-keep]').click();
    const kept = await where(page, '[data-cm-retire-door]');
    check(P, 'Keep managing puts the door back where it was', kept.y === before.y && kept.top === before.top, `scrollY ${kept.y}, top ${kept.top}`);
    await page.locator('[data-cm-retire-door]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-cm-retire-yes]').click();
    await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
    check(P, 'Yes after it arms opens the farewell, and the disk holds the retirement', (await page.locator('[data-cm-farewell]').count()) === 1 && (await diskRetired(page))?.when === 'seasonEnd');
    await shot(page, `A-farewell-${profile.width}`);
    await page.locator('[data-cm-farewell-tile="records"]').click();
    const line = await readRecordLine(page);
    check(P, 'Records reads the highest scoring game node worked out', hasRecord(line, expectA), `${line} | ${expectA.score} vs ${expectA.opp}, S${expectA.season}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 15000 }).catch(() => {});
    const tile = (await page.locator('[data-testid="cm-slots"]').textContent().catch(() => '')) ?? '';
    const open = (await page.locator('[data-cm-slot-open]').first().textContent().catch(() => '')) ?? '';
    check(P, 'a reload lands on the managers screen, the tile says retired and offers the farewell', tile.includes('retired') && open.includes('See the farewell') && !!(await diskRetired(page)), `${open}`);
    await shot(page, `A-slots-${profile.width}`);
    await openSlotButton(page);
    check(P, 'See the farewell opens it', (await page.locator('[data-cm-farewell]').count()) === 1);
    await page.getByRole('button', { name: /Start a new manager/i }).first().click();
    await page.waitForTimeout(800);
    const parked = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('dukb-cm-slot-1') || 'null')?.retired ?? null; } catch { return null; } });
    const index = await page.evaluate(() => localStorage.getItem('dukb-cm-slots'));
    check(P, 'Start a new manager opens the picker in slot 2, with slot 1 still retired', !!parked && (await page.locator('[data-cm-farewell]').count()) === 0 && /2/.test(String(index)), `index ${index}`);
    check(P, 'no page error', page.errors.length === 0, page.errors[0] ?? '');
  } finally { await context.close(); }
}

/* ---- B: mid season, from the Manager panel ---- */
async function walkB(profile) {
  const P = `B ${profile.width}`;
  const { context, page } = await pageWith(profile, SAVES.B);
  try {
    if (!(await land(page))) { check(P, 'the page lands on the managers screen', false); return; }
    await openSlotButton(page);
    await openManagerPanel(page);
    const line = await readRecordLine(page);
    check(P, 'the Manager panel shows the highest scoring game', hasRecord(line, expectB), `${line}`);
    const door = page.locator('[data-cm-retire-door]').first();
    await door.scrollIntoViewIfNeeded();
    await door.click();
    await page.waitForTimeout(800);
    await shot(page, `B-confirm-${profile.width}`);
    await page.locator('[data-cm-retire-yes]').click();
    await page.locator('[data-cm-farewell-moment]').waitFor({ timeout: 10000 }).catch(() => {});
    const moment = (await page.locator('[data-cm-farewell-moment]').textContent().catch(() => '')) ?? '';
    const r = await diskRetired(page);
    const week = Math.min(mid.week + 1, mid.calendar.length);
    check(P, 'the farewell names the week the managers screen printed and the position', r?.when === 'midSeason' && moment.includes(`week ${week} of Season ${mid.season}`) && /\d+(st|nd|rd|th) after/.test(moment), moment);
    await shot(page, `B-farewell-${profile.width}`);
    check(P, 'no page error', page.errors.length === 0, page.errors[0] ?? '');
  } finally { await context.close(); }
}

/* ---- C: out of work ---- */
async function walkC(profile) {
  const P = `C ${profile.width}`;
  const { context, page } = await pageWith(profile, SAVES.C);
  try {
    if (!(await land(page))) { check(P, 'the page lands on the managers screen', false); return; }
    await openSlotButton(page);
    const door = page.locator('[data-cm-retire-door]').first();
    await door.scrollIntoViewIfNeeded();
    await door.click();
    const title = (await page.locator('[data-cm-retire-confirm] p').first().textContent().catch(() => '')) ?? '';
    await page.waitForTimeout(800);
    await page.locator('[data-cm-retire-yes]').click();
    await page.locator('[data-cm-farewell-moment]').waitFor({ timeout: 10000 }).catch(() => {});
    const moment = (await page.locator('[data-cm-farewell-moment]').textContent().catch(() => '')) ?? '';
    check(P, 'the sacked screen retires a manager out of work', title.includes('phone') && moment.includes('out of work') && (await diskRetired(page))?.when === 'outOfWork', `${title} | ${moment}`);
    await shot(page, `C-farewell-${profile.width}`);
    /* Review fix: the save is still sacked under its retirement, so the reload must open the farewell, never the
       sacked screen with its job market. */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 15000 }).catch(() => {});
    const open = (await page.locator('[data-cm-slot-open]').first().textContent().catch(() => '')) ?? '';
    await openSlotButton(page);
    await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
    const again = (await page.locator('[data-cm-farewell-moment]').textContent().catch(() => '')) ?? '';
    check(P, 'a reload and See the farewell open the farewell again, not the sacked screen', open.includes('See the farewell') && again.includes('out of work') && (await page.locator('[data-cm-retire-door]').count()) === 0, `${open} | ${again}`);
    check(P, 'no page error', page.errors.length === 0, page.errors[0] ?? '');
  } finally { await context.close(); }
}

/* ---- D: old saves ---- */
async function walkD(profile) {
  for (const [name, save, expect] of [['whole', SAVES.D, expectWhole], ['leaned', SAVES.Dlean, expectLean]]) {
    const P = `D ${name} ${profile.width}`;
    const { context, page } = await pageWith(profile, save);
    try {
      if (!(await land(page))) { check(P, 'the page lands on the managers screen', false); continue; }
      await openSlotButton(page);
      await page.waitForTimeout(800);
      const before = await disk(page);
      await openManagerPanel(page);
      await page.waitForTimeout(800);
      const after = await disk(page);
      const line = await readRecordLine(page);
      const missed = (await page.locator('[data-cm-highest-scoring-missed]').first().textContent({ timeout: 1500 }).catch(() => null)) ?? null;
      check(P, 'the line is the one the book gives', !!expect && hasRecord(line, expect), `${line}`);
      if (name === 'whole') check(P, 'a whole book prints no second line', missed === null, `${missed}`);
      else {
        const played = oldLean.careerStats.played, kept = oldLean.h2h.length;
        const lost = played - kept === 1 ? 'the score of the other one' : `the scores of the other ${played - kept}`;
        check(P, 'a leaned book says how many it could not see', !!expect?.missed && missed === `Counted from ${kept} of your ${played} matches. Your save no longer keeps ${lost}.`, `${missed}`);
      }
      check(P, 'opening the panel writes nothing new', before === after && !JSON.parse(after ?? '{}')?.careerStats?.highestScoring);
      await shot(page, `D-${name}-${profile.width}`);
    } finally { await context.close(); }
  }
}

/* ---- F: a season played to its last match, the review not yet seen (review fix) ---- */
async function walkF(profile) {
  const P = `F ${profile.width}`;
  const { context, page } = await pageWith(profile, SAVES.F);
  try {
    if (!(await land(page))) { check(P, 'the page lands on the managers screen', false); return; }
    await openSlotButton(page);
    check(P, 'Resume Career lands on the hub card with See Season Review', (await page.getByRole('button', { name: /See Season Review/i }).count()) === 1);
    await openManagerPanel(page);
    const waits = (await page.locator('[data-cm-retire-waits]').first().textContent({ timeout: 6000 }).catch(() => '')) ?? '';
    check(P, 'the Manager panel draws no door and points at See Season Review', (await page.locator('[data-cm-retire-door]').count()) === 0 && waits.includes('See Season Review'), waits);
    await shot(page, `F-panel-${profile.width}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 15000 }).catch(() => {});
    await openSlotButton(page);
    await page.getByRole('button', { name: /See Season Review/i }).first().click();
    const door = page.locator('[data-cm-retire-door]').first();
    await door.waitFor({ timeout: 10000 }).catch(() => {});
    await door.scrollIntoViewIfNeeded().catch(() => {});
    await door.click();
    await page.waitForTimeout(800);
    await page.locator('[data-cm-retire-yes]').click();
    await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
    const saved = JSON.parse((await disk(page)) ?? '{}');
    const title = (saved.trophies ?? []).some(t => t.name === 'League Title' && t.season === playedOut.season);
    check(P, 'after the review the season end door retires with that season counted, title and all',
      saved.retired?.when === 'seasonEnd' && (saved.history ?? []).length === playedOut.history.length + 1 && title === titleWon,
      `${saved.retired?.when}, ${(saved.history ?? []).length} seasons kept of ${playedOut.history.length + 1}, title ${title} (node ${titleWon})`);
    check(P, 'no page error', page.errors.length === 0, page.errors[0] ?? '');
  } finally { await context.close(); }
}

/* ---- E: the page ---- */
const NEW = ['[data-cm-retire-door]', '[data-cm-retire-keep]', '[data-cm-retire-yes]', '[data-cm-farewell-tile]', '[data-cm-farewell-back]', '[data-testid="cm-show-slots-retired"]', '[data-cm-slot-open]'];
const TEXT = ['[data-cm-retire-confirm] p', '[data-cm-farewell] p', '[data-cm-farewell] button', '[data-cm-farewell-moment]', '[data-cm-highest-scoring]', '[data-cm-retired]'];
async function measure(page, label) {
  const bad = await page.evaluate(({ NEW, TEXT }) => {
    const out = [];
    for (const s of NEW) for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.height < 43.5 || r.width < 43.5)) out.push(`${s} is ${Math.round(r.width)} by ${Math.round(r.height)}`);
    }
    for (const s of TEXT) for (const el of document.querySelectorAll(s)) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 12) out.push(`${s} text is ${size} px`);
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push(`${s} is cut`);
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 1) out.push(`${s} runs past the page`);
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth})`);
    return out;
  }, { NEW, TEXT });
  return bad.map(b => `${label}: ${b}`);
}
async function walkE(profile, reduced) {
  const P = `E ${profile.width}${reduced ? ' reduced' : ''}`;
  const { context, page } = await pageWith(profile, SAVES.A, { reduced });
  try {
    if (!(await land(page))) { check(P, 'the page lands on the managers screen', false); return; }
    const bad = [...await measure(page, 'slots')];
    await openSlotButton(page);
    const door = page.locator('[data-cm-retire-door]').first();
    await door.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    bad.push(...await measure(page, 'door'));
    const before = await where(page, '[data-cm-retire-door]');
    await door.click();
    await page.waitForTimeout(800);
    const after = await where(page, '[data-cm-retire-confirm]');
    bad.push(...await measure(page, 'confirm'));
    check(P, 'the confirm opens in place', before.y === after.y && before.top === after.top, `scrollY ${before.y} to ${after.y}, top ${before.top} to ${after.top}`);
    await shot(page, `E-confirm-${profile.width}${reduced ? '-reduced' : ''}`);
    await page.locator('[data-cm-retire-yes]').click();
    await page.locator('[data-cm-farewell]').waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    bad.push(...await measure(page, 'farewell'));
    for (const key of ['clubs', 'cabinet', 'records']) {
      await page.locator(`[data-cm-farewell-tile="${key}"]`).click();
      bad.push(...await measure(page, `farewell ${key}`));
      await page.locator('[data-cm-farewell-back]').click();
    }
    await shot(page, `E-farewell-${profile.width}${reduced ? '-reduced' : ''}`);
    check(P, 'every new control is 44 px, no new text under 12 px, nothing cut or past the page', bad.length === 0, bad.slice(0, 4).join('; '));
  } finally { await context.close(); }
}

/* ---- main ---- */
try {
  for (const profile of [{ width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }]) {
    await walkA(profile);
    if (CONTROL === 'strip') continue;
    await walkB(profile);
    await walkC(profile);
    await walkD(profile);
    await walkF(profile);
  }
  if (!CONTROL) {
    for (const profile of [{ width: 320, height: 640, touch: true }, { width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }]) await walkE(profile, false);
    await walkE({ width: 390, height: 844, touch: true }, true);
  }
} finally {
  await browser.close();
  server.kill();
}
const red = results.filter(r => !r.ok);
if (CONTROL) {
  if (red.length) { console.log(`control ${CONTROL} FIRED: ${red.length} of ${results.length} checks red`); process.exit(1); }
  console.log(`control ${CONTROL} DID NOT FIRE: all ${results.length} checks stayed green`); process.exit(3);
}
if (!results.length) cannot('no check ran');
console.log(red.length ? `playCmRetire: ${red.length} of ${results.length} checks FAILED` : `playCmRetire: all ${results.length} checks passed. Pictures in ${OUT}`);
process.exit(red.length ? 1 : 0);

/* Reviewer (run lens), Round 1215: a probe of the page seed helper on the served build. Never committed.
   Reads BASE (the runner's #!serve), blocks supabase.co, writes screenshots and probe.json into RC_OUT.
   P1 the page's stream against the node stream of scripts/lib/seedRandom.mjs, on an empty document
   P2 how often the real page draws while nobody touches it, over far longer than the walk's 2.5 seconds
   P3 one seed at four screens (390 and 1280, motion on and off): the same match or not
   P4 a reload starts the stream again */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { hashName, pageDraws, pageSeedOf, seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const KEY = 'dukb-club-manager-save';
const SEED = pageSeedOf('playLiveMatchFit.mjs', process.env.PROBE_SEED);
const result = { seed: SEED, base: BASE };
let bad = 0;
const note = (ok, words) => { if (!ok) bad += 1; console.log(`${ok ? 'ok   ' : 'ODD  '} ${words}`); };

const tap = async (page, rx) => {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
const tapText = async (page, rx) => {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
async function openPage(context) {
  const page = await context.newPage();
  await page.route(/supabase\.co/, route => route.abort());
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e && e.message ? e.message : e)));
  return page;
}
async function land(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
async function pickJob(page) {
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(800);
}
async function startLive(page) {
  if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i);
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}
const saved = page => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, KEY);
const minuteOf = page => page.locator('[data-cm-live-stage]').first().getAttribute('data-cm-live-minute').then(Number).catch(() => NaN);
/* the walk's own matchDigest, copied as it stands at 36f333be */
function matchDigest(save) {
  const live = save && save.live;
  if (!live) return null;
  const who = new Map((Array.isArray(save.squad) ? save.squad : []).map((p, i) => [p && p.id, `#${i} ${p && p.name}`]));
  const named = v => (typeof v === 'string' && who.has(v) ? who.get(v) : v);
  const plain = v => {
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).map(k => [named(k), plain(v[k])]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
    return named(v);
  };
  const { minute: _clock, ...drawn } = live;
  const text = JSON.stringify(plain(drawn));
  return { digest: hashName(text).toString(16).padStart(8, '0'), chars: text.length };
}
/** Reads the draw count every `step` ms for `total` ms and returns the readings. */
async function watchDraws(page, total, step, withMinute = false) {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 <= total) {
    out.push(withMinute ? `${await pageDraws(page)}@${await minuteOf(page)}'` : await pageDraws(page));
    await page.waitForTimeout(step);
  }
  return out;
}

const browser = await chromium.launch();
try {
  /* P1: the page's stream against the node stream, bit for bit */
  {
    const context = await browser.newContext();
    await seedPages(context, SEED);
    const page = await context.newPage();
    await page.route('**/empty-for-the-probe', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>empty</title>' }));
    await page.goto(BASE + '/empty-for-the-probe');
    const inPage = await page.evaluate(() => ({ before: window.__pageSeed.draws, six: Array.from({ length: 6 }, () => Math.random()), after: window.__pageSeed.draws, seed: window.__pageSeed.seed }));
    const code = "await import('./scripts/lib/seedRandom.mjs'); console.log(JSON.stringify(Array.from({ length: 6 }, () => Math.random())));";
    const inNode = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, SIM_SEED: String(SEED) }, encoding: 'utf8' }));
    result.p1 = { inPage, inNode };
    note(inPage.before === 0 && inPage.after === 6 && inPage.seed === SEED, `P1 an empty document starts at 0 draws and counts 6 after 6 (${inPage.before}, ${inPage.after}), seed ${inPage.seed}`);
    note(JSON.stringify(inPage.six) === JSON.stringify(inNode), `P1 the page's first six numbers are the node harness stream's for seed ${SEED}: ${inPage.six.slice(0, 2).join(', ')} against ${inNode.slice(0, 2).join(', ')}`);
    await context.close();
  }
} catch (e) { note(false, `P1 stopped: ${e.message}`); }

/* P2 and P3: one seed at four screens. The first (the walk's phone) also sits idle for a long time at each stop. */
const SCREENS = [
  ['390-motion', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, true],
  ['390-reduced', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }, false],
  ['1280-motion', { viewport: { width: 1280, height: 900 } }, false],
  ['1280-reduced', { viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }, false],
];
result.screens = [];
for (const [name, options, longIdle] of SCREENS) {
  try {
    const context = await browser.newContext(options);
    await seedPages(context, SEED);
    const page = await openPage(context);
    await land(page);
    const row = { name, settled: await pageDraws(page) };
    if (longIdle) row.idleLanding = await watchDraws(page, 40000, 5000);
    await pickJob(page);
    row.inJob = await pageDraws(page);
    if (longIdle) row.idleClubPage = await watchDraws(page, 40000, 5000);
    if (!(await startLive(page))) throw new Error('the live viewer never opened');
    let save = null;
    for (let i = 0; i < 50; i++) { save = await saved(page).catch(() => null); if (save && save.live && (save.live.h1Play || save.live.h1My)) break; await page.waitForTimeout(100); }
    row.kickOff = await pageDraws(page);
    const d = matchDigest(save);
    row.digest = d ? d.digest : null;
    row.match = save ? `${save.clubName} v ${save.live && save.live.opponent}` : null;
    row.width = await page.evaluate(() => window.innerWidth);
    row.reduced = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    await page.screenshot({ path: path.join(OUT, `probe-${name}-kickoff.png`) }).catch(() => {});
    if (longIdle) {
      /* the match held: nobody touches it */
      row.paused = await tap(page, /^Pause$/i);
      row.idlePaused = await watchDraws(page, 20000, 5000, true);
      await tap(page, /^Resume$/i);
      /* the match running at the speed it opens at, then at 4x to the interval and beyond */
      row.running2x = await watchDraws(page, 24000, 3000, true);
      /* a plain stored save of a match in flight, taken mid half after the manager acted (Pause), for LIVE_FIT_SAVE */
      await tap(page, /^Pause$/i);
      await page.waitForTimeout(600);
      const mid = await page.evaluate(k => localStorage.getItem(k), KEY);
      if (mid) { fs.writeFileSync(path.join(OUT, 'plain-mid.json'), mid); row.plainMid = { bytes: Buffer.byteLength(mid), storedMinute: JSON.parse(mid).live && JSON.parse(mid).live.minute, clock: await minuteOf(page) }; }
      await tap(page, /^Resume$/i);
      await page.getByRole('button', { name: '4x', exact: true }).first().click({ timeout: 3000 }).catch(() => {});
      row.running4x = await watchDraws(page, 30000, 3000, true);
      row.stageAfter = await page.locator('[data-cm-live-stage]').first().getAttribute('data-cm-live-stage').catch(() => null);
      if (row.stageAfter === 'interval') {
        const atBreak = await page.evaluate(k => localStorage.getItem(k), KEY);
        if (atBreak) { fs.writeFileSync(path.join(OUT, 'plain-interval.json'), atBreak); row.plainInterval = { bytes: Buffer.byteLength(atBreak), storedMinute: JSON.parse(atBreak).live && JSON.parse(atBreak).live.minute, h2Drawn: !!(JSON.parse(atBreak).live && JSON.parse(atBreak).live.h2Drawn) }; }
      }
      await page.screenshot({ path: path.join(OUT, `probe-${name}-later.png`) }).catch(() => {});
      /* P4: a reload starts the stream again */
      const before = await pageDraws(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      row.reload = { before, after: await pageDraws(page), seed: await page.evaluate(() => window.__pageSeed && window.__pageSeed.seed) };
    }
    row.errors = page.errors.slice(0, 3);
    result.screens.push(row);
    console.log(`[screen ${name}] ${JSON.stringify(row)}`);
    await context.close();
  } catch (e) { note(false, `screen ${name} stopped: ${e.message}`); }
}
await browser.close().catch(() => {});

const rows = result.screens;
const first = rows[0];
if (first) {
  const flat = list => Array.isArray(list) && new Set(list.map(v => String(v).split('@')[0])).size === 1;
  note(flat(first.idleLanding), `P2 the landing page untouched for 40 seconds: draws ${JSON.stringify(first.idleLanding)}`);
  note(flat(first.idleClubPage), `P2 the club page (job taken) untouched for 40 seconds: draws ${JSON.stringify(first.idleClubPage)}`);
  note(flat(first.idlePaused), `P2 the match held for 20 seconds: draws ${JSON.stringify(first.idlePaused)}`);
  note(flat(first.running2x), `P2 the match running at 2x for 24 seconds: draws ${JSON.stringify(first.running2x)}`);
  note(flat(first.running4x), `P2 the match running at 4x for 30 seconds (stage after: ${first.stageAfter}): draws ${JSON.stringify(first.running4x)}`);
  note(first.reload && first.reload.after < first.reload.before && first.reload.seed === SEED, `P4 a reload starts the stream again: ${JSON.stringify(first.reload)}`);
}
note(rows.length === 4 && new Set(rows.map(r => r.digest)).size === 1 && new Set(rows.map(r => r.kickOff)).size === 1,
  `P3 one seed at four screens: digests ${rows.map(r => `${r.name} ${r.digest} (${r.kickOff} draws, ${r.match})`).join('; ')}`);
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(result, null, 1));
console.log(`probe done: ${bad} line${bad === 1 ? '' : 's'} marked ODD (a reading, not a verdict: the reviewer judges each)`);
process.exit(0);

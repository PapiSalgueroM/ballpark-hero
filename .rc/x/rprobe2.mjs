/* Reviewer (run lens), Round 1215: does ONE SEED open the same match on another day, in another time zone?
   A red found by a gate on one day is replayed by its seed on a later day, and the owner's PC is not in UTC.
   The page's clock is moved by an init script (Date.now and new Date() shifted), the way a later day would read.
   Reads BASE (#!serve), blocks supabase.co. Never committed. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { hashName, pageDraws, pageSeedOf, seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const KEY = 'dukb-club-manager-save';
const SEED = pageSeedOf('playLiveMatchFit.mjs', process.env.PROBE_SEED);
const DAY = 86400000;

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
  return hashName(text).toString(16).padStart(8, '0');
}

/* [label, days the page's clock is moved on, time zone or null, locale or null] */
const ARMS = [
  ['today, UTC', 0, 'UTC', null],
  ['5 days on', 5, 'UTC', null],
  ['40 days on', 40, 'UTC', null],
  ['400 days on', 400, 'UTC', null],
  ['today, New York', 0, 'America/New_York', null],
  ['today, Tokyo', 0, 'Asia/Tokyo', null],
  ['today, Spanish browser', 0, 'UTC', 'es-ES'],
];
const browser = await chromium.launch();
const rows = [];
for (const [label, days, zone, locale] of ARMS) {
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(zone ? { timezoneId: zone } : {}), ...(locale ? { locale } : {}) });
    await seedPages(context, SEED);
    if (days) {
      await context.addInitScript(offset => {
        const Real = Date;
        class Moved extends Real {
          constructor(...args) { if (args.length === 0) super(Real.now() + offset); else super(...args); }
          static now() { return Real.now() + offset; }
        }
        window.Date = Moved;
      }, days * DAY);
    }
    const page = await context.newPage();
    await page.route(/supabase\.co/, route => route.abort());
    await land(page);
    const settled = await pageDraws(page);
    const pageDay = await page.evaluate(() => new Date().toISOString().slice(0, 10) + ' ' + Intl.DateTimeFormat().resolvedOptions().timeZone);
    await pickJob(page);
    const inJob = await pageDraws(page);
    if (!(await startLive(page))) throw new Error('the live viewer never opened');
    let save = null;
    for (let i = 0; i < 50; i++) { save = await saved(page).catch(() => null); if (save && save.live && (save.live.h1Play || save.live.h1My)) break; await page.waitForTimeout(100); }
    const live = save && save.live;
    const goals = live ? [...(live.h1My || []).map(g => `${g.minute}' ${g.og && g.og.n ? g.og.n : g.name} for`), ...(live.h1Opp || []).map(g => `${g.minute}' ${g.name} against`)].join(', ') || 'none' : 'no match';
    const row = { label, pageDay, settled, inJob, kickOff: await pageDraws(page), digest: matchDigest(save), match: save ? `${save.clubName} v ${live && live.opponent}` : null, goals };
    rows.push(row);
    console.log(`[arm ${label}] ${JSON.stringify(row)}`);
    await context.close();
  } catch (e) { console.log(`[arm ${label}] STOPPED: ${e.message}`); rows.push({ label, stopped: e.message }); }
}
await browser.close().catch(() => {});
fs.writeFileSync(path.join(OUT, 'probe2.json'), JSON.stringify({ seed: SEED, rows }, null, 1));
const digests = new Set(rows.map(r => r.digest));
const football = new Set(rows.map(r => `${r.match} | ${r.goals}`));
console.log(`probe2 done: seed ${SEED}, ${rows.length} arms, ${digests.size} digest${digests.size === 1 ? '' : 's'}, ${football.size} different opening half${football.size === 1 ? '' : 's'} by its teams and goals`);
process.exit(0);

// Release AT review (area cm): what a player SEES. Screenshots into $RC_OUT, facts into walk-report.json.
// Run on a served build (#!serve, #!playwright): node .rc/x/walkCm.mjs
process.env.CM_VAR_FIXTURE_ONLY = '1';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk-out');
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/[/]$/, '');
const KEY = 'dukb-club-manager-save', NOW = 1791547200000;
fs.mkdirSync(OUT, { recursive: true });
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-walk-'));
const bundle = path.join(work, 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const { findCmVarFixture } = await import(pathToFileURL(path.join(ROOT, 'scripts/simCmVar.mjs')).href);
const report = { base: BASE, fixtures: {}, cases: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 2));
const RealDate = Date;
const fixedDate = fn => { globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }; try { return fn(); } finally { globalThis.Date = RealDate; } };
const fixtures = {};
for (const kind of ['confirmed', 'disallowed', 'awarded_scored']) {
  try {
    const cm = await import(`${pathToFileURL(bundle).href}?k=${kind}`);
    const f = fixedDate(() => findCmVarFixture(cm, kind));
    fixtures[kind] = f;
    report.fixtures[kind] = { seed: f.seed, minute: f.event.minute, side: f.event.side, who: f.event.text, review: f.event.review, opponent: f.paused.live.opponent };
  } catch (e) { report.fixtures[kind] = { error: String(e.message || e) }; }
}
save();

const browser = await pw.chromium.launch({ headless: true });
async function open(id, profile, reduced, pre, seed) {
  const row = { id, ...profile, reducedMotion: reduced, errors: [], shots: [], facts: {} };
  report.cases.push(row);
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
    colorScheme: 'dark', reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      ...(pre ? [{ name: KEY, value: JSON.stringify(pre) }] : []), { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] },
  });
  await context.route(/supabase[.]co/, r => r.abort());
  await context.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === BASE || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return r.continue();
    return r.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.addInitScript(({ now, seed, key }) => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    const seedRandom = s => { let a = s >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    if (seed == null) return;
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button'); if (!button) return;
      if (button.matches('[data-cm-way="live"], [data-cm-way="quick"]') && !JSON.parse(localStorage.getItem(key) || 'null')?.live) seedRandom(seed);
      if (button.textContent.trim() === 'Second half') seedRandom(5312);
    }, true);
  }, { now: NOW, seed: seed ?? null, key: KEY });
  page.on('pageerror', e => row.errors.push('pageerror: ' + String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_CONNECTION|Failed to load resource/.test(m.text())) row.errors.push('console: ' + m.text().slice(0, 300)); });
  const tap = async loc => { if (profile.touch) await loc.tap(); else await loc.click(); };
  const shot = async (name, opts = {}) => { const file = `${id}-${name}.png`; await page.screenshot({ path: path.join(OUT, file), ...opts }); row.shots.push(file); };
  const rect = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  const overflow = () => page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, scrollY: Math.round(window.scrollY) }));
  return { row, context, page, tap, shot, rect, overflow };
}
const fail = async (c, e) => { c.row.error = String(e.stack || e).slice(0, 900); try { await c.shot('FAILURE', { fullPage: true }); } catch { /* the page is gone */ } };
const resume = async c => {
  await c.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await c.tap(c.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
  await c.page.locator('[data-cm-way="live"]').waitFor();
  await c.page.evaluate(() => document.fonts.ready);
};

// A. A live match with a review.
async function liveCase(id, profile, reduced, kind) {
  const f = fixtures[kind];
  if (!f) { report.cases.push({ id, error: 'no fixture for ' + kind }); return; }
  const c = await open(id, profile, reduced, f.pre, f.seed);
  const { page, row, tap, shot, rect } = c;
  try {
    await resume(c);
    await tap(page.locator('[data-cm-way="live"]'));
    await page.locator('[data-cm-live-stagebox]').waitFor({ state: 'visible' });
    await tap(page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true }));
    const t0 = Date.now();
    await page.waitForFunction(rid => { const el = document.querySelector('[data-cm-var]'); return el?.dataset.cmVarId === rid && el.dataset.cmVar === 'checking'; }, f.event.review.id, { timeout: 90000 });
    row.facts.checkingText = await page.locator('[data-cm-var]').innerText();
    row.facts.card = await rect('[data-cm-var]');
    row.facts.stagebox = await rect('[data-cm-live-stagebox]');
    row.facts.pitch = await rect('[data-cm-live-stagebox] svg');
    row.facts.buttonsInsideCard = await page.locator('[data-cm-var] button').count();
    row.facts.scoreWhileChecking = await page.locator('[data-cm-live-stagebox] [data-cm-score-of]').allInnerTexts();
    row.facts.overflowChecking = await c.overflow();
    await shot('1-checking');
    await page.locator('[data-cm-var="decided"]').waitFor();
    row.facts.decidedText = await page.locator('[data-cm-var]').innerText();
    await shot('2-decided');
    await page.locator('[data-cm-var]').waitFor({ state: 'hidden' });
    row.facts.reviewOnScreenMs = Date.now() - t0;
    if (kind !== 'disallowed') {
      try { await page.locator('[data-cm-goal-card]').first().waitFor({ timeout: 8000 }); row.facts.goalCard = await page.locator('[data-cm-goal-card]').first().innerText(); }
      catch { row.facts.goalCard = 'NO GOAL CARD within 8 s of the review'; }
    } else await page.waitForTimeout(1200);
    await shot('3-after-review');
    row.facts.scoreAfter = await page.locator('[data-cm-live-stagebox] [data-cm-score-of]').allInnerTexts();
    await tap(page.getByRole('button', { name: 'How watching a match works', exact: true }));
    await page.getByRole('button', { name: 'Close the help', exact: true }).waitFor();
    await shot('4-match-help');
    row.facts.helpMentionsVar = /VAR/.test(await page.locator('[data-cm-live-stagebox]').innerText());
    await tap(page.getByRole('button', { name: 'Close the help', exact: true }));
    await tap(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
    await page.locator('[data-cm-live-stage="interval"]').waitFor({ state: 'attached' });
    await shot('5-interval');
    await tap(page.getByRole('button', { name: 'Second half', exact: true }));
    await page.locator('[data-cm-live-stage="second"]').waitFor({ state: 'attached' });
    await tap(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
    await tap(page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Full report', exact: true }));
    await page.locator('[data-cm-timeline]').waitFor();
    row.facts.varRows = await page.locator('[data-cm-tl="var"]').allInnerTexts();
    row.facts.goalRows = await page.locator('[data-cm-tl="goal"]').allInnerTexts();
    await shot('6-full-report', { fullPage: true });
  } catch (e) { await fail(c, e); }
  await c.context.close(); save();
}

// B. Quick Sim through a reviewed match.
async function quickCase(id, profile, kind) {
  const f = fixtures[kind];
  if (!f) { report.cases.push({ id, error: 'no fixture for ' + kind }); return; }
  const c = await open(id, profile, false, f.pre, f.seed);
  const { page, row, tap, shot } = c;
  try {
    await resume(c);
    await tap(page.locator('[data-cm-way="quick"]'));
    await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor();
    await page.locator('[data-cm-timeline]').waitFor();
    row.facts.varRows = await page.locator('[data-cm-tl="var"]').allInnerTexts();
    row.facts.goalRows = await page.locator('[data-cm-tl="goal"]').allInnerTexts();
    row.facts.overflow = await c.overflow();
    await shot('1-quick-report', { fullPage: true });
    const all = page.getByRole('button', { name: /Every event|All events|Full timeline/i });
    if (await all.count()) { await tap(all.first()); row.facts.varRowsAll = await page.locator('[data-cm-tl="var"]').allInnerTexts(); await shot('2-quick-report-all', { fullPage: true }); }
  } catch (e) { await fail(c, e); }
  await c.context.close(); save();
}

// C. A new Premier League career the way a player starts one: the calendar, the help, the first match week.
async function newCareerCase(id, profile) {
  const c = await open(id, profile, false, null, 4242);
  const { page, row, tap, shot } = c;
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    await tap(page.getByRole('button', { name: /2026-27/ }).first());
    await tap(page.getByRole('button', { name: /^England/ }).first());
    await tap(page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ hasText: 'Premier League' }).first());
    await tap(page.getByRole('button').filter({ has: page.getByText('Everton', { exact: true }) }).first());
    await tap(page.getByRole('button', { name: 'Take the job', exact: true }));
    await tap(page.getByRole('button', { name: 'Skip: just manage', exact: true }));
    await page.locator('[data-cm-way="quick"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
    row.facts.savedKey = saved?.realLeagueFixtures ?? null;
    row.facts.startYear = saved?.startYear; row.facts.season = saved?.season; row.facts.era = saved?.eraId;
    row.facts.overflowHub = await c.overflow();
    await shot('1-hub', { fullPage: true });
    await tap(page.getByRole('button').filter({ has: page.getByText('Calendar', { exact: true }) }).first());
    await page.locator('[data-testid="cm-calendar-grid"]').waitFor();
    const cov = page.locator('[data-cm-fixture-coverage]');
    row.facts.coverage = (await cov.count()) ? await cov.innerText() : 'NO COVERAGE LINE';
    row.facts.coverageRect = await c.rect('[data-cm-fixture-coverage]');
    row.facts.coverageLinks = (await cov.count()) ? await cov.locator('a').evaluateAll(a => a.map(x => x.href)) : [];
    row.facts.monthList = (await page.locator('[data-testid="cm-calendar-month-list"]').count()) ? (await page.locator('[data-testid="cm-calendar-month-list"]').innerText()).slice(0, 600) : null;
    row.facts.overflowCalendar = await c.overflow();
    await shot('2-calendar');
    await shot('2b-calendar-full', { fullPage: true });
    await tap(page.getByRole('button', { name: 'How to play', exact: true }).first());
    const help = page.getByRole('dialog', { name: 'How to Play Club Manager' });
    await help.waitFor();
    await shot('3-help-top');
    const text = await help.innerText();
    row.facts.helpFixtures = (text.match(/Real first-season fixtures[^\n]*/) || [''])[0].slice(0, 700);
    row.facts.helpVar = (text.match(/VAR in modern matches[^\n]*/) || [''])[0].slice(0, 700);
    await help.getByText('VAR in modern matches', { exact: false }).first().scrollIntoViewIfNeeded();
    await shot('4-help-var');
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'hidden' }).catch(() => {});
    const back = page.getByRole('button').filter({ has: page.getByText('Home', { exact: true }) });
    if (await back.count()) await tap(back.first()).catch(() => {});
    if (!(await page.locator('[data-cm-way="quick"]').isVisible().catch(() => false))) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await tap(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    }
    await page.locator('[data-cm-way="quick"]').waitFor();
    row.facts.matchCentre = (await page.locator('[data-cm-way="quick"]').locator('xpath=ancestor::*[4]').innerText().catch(() => '')).slice(0, 400);
    await tap(page.locator('[data-cm-way="quick"]'));
    await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor();
    row.facts.firstMatch = (await page.locator('main, body').first().innerText()).split('\n').filter(Boolean).slice(0, 40).join(' | ').slice(0, 900);
    row.facts.varRows = await page.locator('[data-cm-tl="var"]').allInnerTexts();
    await shot('5-first-match-report', { fullPage: true });
  } catch (e) { await fail(c, e); }
  await c.context.close(); save();
}

const PHONE = { width: 390, height: 844, touch: true }, DESK = { width: 1280, height: 900, touch: false };
await newCareerCase('new-390', PHONE);
await newCareerCase('new-1280', DESK);
await liveCase('live-390-motion-confirmed', PHONE, false, 'confirmed');
await liveCase('live-390-reduced-awarded', PHONE, true, 'awarded_scored');
await liveCase('live-1280-motion-disallowed', DESK, false, 'disallowed');
await liveCase('live-1280-reduced-awarded', DESK, true, 'awarded_scored');
await liveCase('live-390-reduced-disallowed', PHONE, true, 'disallowed');
await quickCase('quick-390-disallowed', PHONE, 'disallowed');
await quickCase('quick-1280-awarded', DESK, 'awarded_scored');
await browser.close();
save();
const bad = report.cases.filter(c => c.error);
console.log(JSON.stringify(report.cases.map(c => ({ id: c.id, error: c.error ? c.error.slice(0, 200) : null, shots: c.shots?.length, pageErrors: c.errors?.length }))));
console.log(`walkCm: ${report.cases.length} cases, ${bad.length} could not be driven to the end, ${report.cases.reduce((n, c) => n + (c.shots?.length ?? 0), 0)} screenshots`);
process.exit(0);

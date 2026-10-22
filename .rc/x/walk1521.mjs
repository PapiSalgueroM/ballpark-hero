/* Round 1521 walk (not committed): Club Manager's live match on the built site at 390 by 844 and 1280 by 900.
   For each size it takes a job, opens Play Live at 0.5x, and waits for three moments the round draws: a foul's
   whistle (the cue and the name over the spot), a ball high off the grass, and a chance in flight. At each it
   pauses, measures (the page never scrolls sideways or jumps, the foul's name sits inside the pitch) and leaves
   a screenshot in RC_OUT. The live database is refused on every page. Run after a build (rc #!build). */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk-out');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 4193;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const fail = m => { failures++; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) break; await new Promise(r => setTimeout(r, 200)); }

const tap = async (page, rx) => { const b = page.getByRole('button', { name: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
const tapText = async (page, rx) => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
async function clearRoom(page) {
  await page.getByRole('button', { name: /^(reject all|essential only)$/i }).first().click({ timeout: 1500 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0))) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
async function intoMatch(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom(page);
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
  await clearRoom(page);
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i);
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}
const measure = page => page.evaluate(() => {
  const pitch = document.querySelector('[data-cm-live-pitch]')?.getBoundingClientRect();
  const label = document.querySelector('[data-cm-foul-cue]')?.getBoundingClientRect();
  const cue = document.querySelector('[data-pm-cue]')?.getBoundingClientRect();
  const r = b => (b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null);
  return {
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, scrollY: window.scrollY,
    minute: document.querySelector('[data-cm-live-stage]')?.getAttribute('data-cm-live-minute'),
    pitch: r(pitch), label: r(label), cue: r(cue), labelText: document.querySelector('[data-cm-foul-cue]')?.textContent ?? null,
    lift: document.querySelector('[data-cm-ball-lift]')?.getAttribute('data-cm-ball-lift') ?? null,
    phase: document.querySelector('[data-cm-motion-phase]')?.getAttribute('data-cm-motion-phase') ?? null,
    looks: [...document.querySelectorAll('[data-cm-live-pitch] svg[data-pm-look]')].length,
    figures: [...document.querySelectorAll('[data-cm-live-pitch] .cm-pitch-player')].length,
  };
});
async function moment(page, name, width, wait, timeout) {
  const seen = await page.waitForFunction(wait, null, { timeout, polling: 'raf' }).then(() => true).catch(() => false);
  if (!seen) { fail(`${width}: no ${name} within ${timeout / 1000} s`); return null; }
  await tap(page, /^Pause$/);
  await page.waitForTimeout(150);
  const m = await measure(page);
  await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`) });
  console.log(`  [${width} ${name}] ${JSON.stringify(m)}`);
  if (m.scrollW > m.clientW + 2) fail(`${width} ${name}: the page scrolls sideways (${m.scrollW} over ${m.clientW})`);
  if (m.scrollY !== 0) fail(`${width} ${name}: the page moved (scrollY ${m.scrollY})`);
  await tap(page, /^Resume$/);
  return m;
}

const browser = await chromium.launch();
try {
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.route(/supabase\.co/, route => route.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(String(e?.message ?? e)));
    if (!(await intoMatch(page))) { fail(`${width}: the live match never opened`); await context.close(); continue; }
    await page.getByRole('button', { name: '0.5x', exact: true }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    const first = await measure(page);
    await page.screenshot({ path: path.join(OUT, `figures-${width}.png`) });
    console.log(`  [${width} figures] ${JSON.stringify(first)}`);
    if (first.looks < 18 || first.looks !== first.figures) fail(`${width}: ${first.looks} of ${first.figures} figures carry a look`); else ok(`${width}: all ${first.figures} figures carry their own look`);
    const foul = await moment(page, 'foul', width, () => !!document.querySelector('[data-pm-cue="foul"]') && !!document.querySelector('[data-cm-foul-cue]'), 90000);
    if (foul) {
      if (!/^Foul (by|,) /.test(foul.labelText ?? '')) fail(`${width}: the foul's label reads ${foul.labelText}`);
      const p = foul.pitch, l = foul.label;
      if (p && l && (l.x < p.x - 1 || l.y < p.y - 1 || l.x + l.w > p.x + p.w + 1 || l.y + l.h > p.y + p.h + 1)) fail(`${width}: the foul's label leaves the pitch`); else ok(`${width}: the foul's label "${foul.labelText}" is inside the pitch`);
    }
    await moment(page, 'air', width, () => Number(document.querySelector('[data-cm-ball-lift]')?.getAttribute('data-cm-ball-lift') ?? 0) > 2.5, 90000);
    await moment(page, 'shot', width, () => document.querySelector('[data-cm-motion-phase]')?.getAttribute('data-cm-motion-phase') === 'flight', 120000);
    if (errors.length) fail(`${width}: page errors ${errors.slice(0, 3).join(' | ')}`); else ok(`${width}: no page errors`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `walk1521: RED, ${failures} failures` : 'walk1521: green, both sizes walked, screenshots in RC_OUT');
process.exitCode = failures ? 1 : 0;

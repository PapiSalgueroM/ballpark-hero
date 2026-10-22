/* Review walk of Round 1521 (runner only, never committed). Club Manager's live match on the built site, the live
   database refused on every page, at 390x844, 1280x900 and a phone on its side (844x390), with reduced motion off
   and on. Off: a foul's whistle and name, a card on a foul when one comes, a ball high off the grass, a shot in
   flight, each paused, measured and screenshotted. On: a minute of play sampled every frame, and no ball may ever
   leave the grass. The help is opened and read. Screenshots go to RC_OUT. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walkrun-out');
fs.mkdirSync(OUT, { recursive: true });
let BASE = process.env.BASE;
let server = null;
if (!BASE) {
  BASE = 'http://127.0.0.1:4197';
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), '4197'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) break; await new Promise(r => setTimeout(r, 200)); }
}
let failures = 0;
const fail = m => { failures++; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const note = m => console.log('  note: ' + m);

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
  const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, scrollY: Math.round(window.scrollY),
    minute: document.querySelector('[data-cm-live-stage]')?.getAttribute('data-cm-live-minute'),
    pitch: box(document.querySelector('[data-cm-live-pitch]')), label: box(document.querySelector('[data-cm-foul-cue]')),
    cue: box(document.querySelector('[data-pm-cue]')), pill: box(document.querySelector('[data-cm-live-pill]')),
    labelText: document.querySelector('[data-cm-foul-cue]')?.textContent ?? null,
    card: document.querySelector('[data-pm-cue]')?.getAttribute('data-pm-cue-card') ?? null,
    lift: document.querySelector('[data-cm-ball-lift]')?.getAttribute('data-cm-ball-lift') ?? null,
    ball: box(document.querySelector('[data-cm-ball]')),
    phase: document.querySelector('[data-cm-motion-phase]')?.getAttribute('data-cm-motion-phase') ?? null,
    looks: document.querySelectorAll('[data-cm-live-pitch] svg[data-pm-look]').length,
    figures: document.querySelectorAll('[data-cm-live-pitch] .cm-pitch-player').length,
    feed: [...document.querySelectorAll('[data-cm-live-stage] li')].slice(-3).map(li => li.textContent.trim().slice(0, 60)),
  };
});
const overlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

let opened = 0;
async function moment(page, tag, name, wait, timeout, required = true) {
  const seen = await page.waitForFunction(wait, null, { timeout, polling: 'raf' }).then(() => true).catch(() => false);
  if (!seen) { (required ? fail : note)(`${tag}: no ${name} within ${timeout / 1000} s`); return null; }
  await tap(page, /^Pause$/);
  await page.waitForTimeout(200);
  const m = await measure(page);
  await page.screenshot({ path: path.join(OUT, `${name}-${tag}.png`) });
  console.log(`  [${tag} ${name}] ${JSON.stringify(m)}`);
  if (m.scrollW > m.clientW + 2) fail(`${tag} ${name}: the page scrolls sideways (${m.scrollW} over ${m.clientW})`);
  if (m.scrollY !== opened) fail(`${tag} ${name}: the page moved (scrollY ${m.scrollY}, ${opened} when the match opened)`);
  if (m.label) {
    const p = m.pitch, l = m.label;
    if (p && (l.x < p.x - 1 || l.y < p.y - 1 || l.x + l.w > p.x + p.w + 1 || l.y + l.h > p.y + p.h + 1)) fail(`${tag} ${name}: the foul's label leaves the pitch ${JSON.stringify(l)} of ${JSON.stringify(p)}`);
    if (overlap(m.label, m.pill)) fail(`${tag} ${name}: the foul's label is under the event pill`);
    if (overlap(m.label, m.cue)) note(`${tag} ${name}: the foul's label touches the whistle`);
    if (!/^Foul (by|,) /.test(m.labelText ?? '')) fail(`${tag} ${name}: the foul's label reads ${m.labelText}`);
  }
  await tap(page, /^Resume$/);
  return m;
}

/* Reduced motion: sample every animation frame for `ms` and say what was seen. */
const sample = (page, ms) => page.evaluate(ms => new Promise(done => {
  const seen = { frames: 0, lifted: 0, maxLift: 0, cues: 0, phases: {}, labels: 0 };
  const end = performance.now() + ms;
  const step = () => {
    seen.frames++;
    const lift = document.querySelector('[data-cm-ball-lift]')?.getAttribute('data-cm-ball-lift');
    if (lift) { seen.lifted++; seen.maxLift = Math.max(seen.maxLift, Number(lift)); }
    if (document.querySelector('[data-pm-cue]')) seen.cues++;
    if (document.querySelector('[data-cm-foul-cue]')) seen.labels++;
    const ph = document.querySelector('[data-cm-motion-phase]')?.getAttribute('data-cm-motion-phase') ?? 'none';
    seen.phases[ph] = (seen.phases[ph] ?? 0) + 1;
    if (performance.now() < end) requestAnimationFrame(step); else done(seen);
  };
  requestAnimationFrame(step);
}), ms);

const CONFIGS = [
  { tag: '390', viewport: { width: 390, height: 844 }, reduce: false, help: true, card: true },
  { tag: '1280', viewport: { width: 1280, height: 900 }, reduce: false },
  { tag: '844x390', viewport: { width: 844, height: 390 }, reduce: false },
  { tag: '390-reduced', viewport: { width: 390, height: 844 }, reduce: true },
  { tag: '1280-reduced', viewport: { width: 1280, height: 900 }, reduce: true },
];
const browser = await chromium.launch();
try {
  for (const c of CONFIGS) {
    console.log(`== ${c.tag}`);
    const context = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: 2, reducedMotion: c.reduce ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    await page.route(/supabase\.co/, route => route.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(String(e?.message ?? e)));
    if (!(await intoMatch(page))) { fail(`${c.tag}: the live match never opened`); await page.screenshot({ path: path.join(OUT, `noopen-${c.tag}.png`) }); await context.close(); continue; }
    await page.getByRole('button', { name: '0.5x', exact: true }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(700);
    const first = await measure(page);
    opened = first.scrollY;
    await page.screenshot({ path: path.join(OUT, `opened-${c.tag}.png`) });
    console.log(`  [${c.tag} opened] ${JSON.stringify(first)}`);
    if (first.scrollW > first.clientW + 2) fail(`${c.tag}: the page scrolls sideways when the match opens`);
    if (first.looks < 18 || first.looks !== first.figures) fail(`${c.tag}: ${first.looks} of ${first.figures} figures carry a look`); else ok(`${c.tag}: all ${first.figures} figures carry a look`);
    if (c.help) {
      const opened2 = await page.getByRole('button', { name: 'How watching a match works' }).first().click({ timeout: 4000 }).then(() => true).catch(() => false);
      if (opened2) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `help-${c.tag}.png`), fullPage: false });
        const text = await page.locator('body').innerText();
        if (!/not likenesses of the real players/.test(text)) fail(`${c.tag}: the help does not say the figures are not likenesses`); else ok(`${c.tag}: the help says the figures are not likenesses`);
        if (!/in the list beside the pitch|in the list/.test(text)) fail(`${c.tag}: the help does not say where an unseen foul goes`);
        await page.getByRole('button', { name: 'Close the help' }).first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
      } else fail(`${c.tag}: no help button`);
    }
    if (!c.reduce) {
      await moment(page, c.tag, 'foul', () => !!document.querySelector('[data-pm-cue="foul"]') && !!document.querySelector('[data-cm-foul-cue]'), 100000);
      await moment(page, c.tag, 'air', () => Number(document.querySelector('[data-cm-ball-lift]')?.getAttribute('data-cm-ball-lift') ?? 0) > 2.5, 90000);
      await moment(page, c.tag, 'shot', () => document.querySelector('[data-cm-motion-phase]')?.getAttribute('data-cm-motion-phase') === 'flight', 120000);
      if (c.card) await moment(page, c.tag, 'card', () => !!document.querySelector('[data-pm-cue-card]'), 150000, false);
    } else {
      const seen = await sample(page, 60000);
      console.log(`  [${c.tag} sampled] ${JSON.stringify(seen)}`);
      if (seen.lifted) fail(`${c.tag}: the ball left the grass on ${seen.lifted} of ${seen.frames} frames under reduced motion (max ${seen.maxLift})`); else ok(`${c.tag}: the ball stayed on the grass on all ${seen.frames} frames`);
      await moment(page, c.tag, 'foul', () => !!document.querySelector('[data-pm-cue="foul"]') && !!document.querySelector('[data-cm-foul-cue]'), 100000, false);
      const after = await sample(page, 30000);
      console.log(`  [${c.tag} sampled again] ${JSON.stringify(after)}`);
      if (after.lifted) fail(`${c.tag}: the ball left the grass on ${after.lifted} frames under reduced motion`);
    }
    if (errors.length) fail(`${c.tag}: page errors ${errors.slice(0, 3).join(' | ')}`); else ok(`${c.tag}: no page errors`);
    await context.close();
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
console.log(failures ? `walkrun: RED, ${failures} failures` : 'walkrun: green, every size walked, screenshots in RC_OUT');
process.exitCode = failures ? 1 : 0;

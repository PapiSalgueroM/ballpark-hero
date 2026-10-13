// Round 1326 reviewer old-save walk (RUN lens), never committed. A save made by the BASE build (OLD_BASE, a
// vite build of 36cc9ffe served beside the head) is carried to the HEAD build (BASE) and played on.
// Checks: the resumed save re-saves byte equal on both builds, the old inbox words stay as written, the desk
// opens with its new rows, four more weeks play with no page error. Database and ad hosts blocked.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const HEAD = process.env.BASE || 'http://localhost:4173';
const OLD = process.env.OLD_BASE || 'http://127.0.0.1:4194';
const OUT = process.env.RC_OUT || '/tmp/rold';
const KEY = 'dukb-club-manager-save';
fs.mkdirSync(OUT, { recursive: true });
const log = m => console.log(m);
let findings = 0;
const finding = m => { findings += 1; log('FINDING ' + m); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
const wait = ms => page.waitForTimeout(ms);
const raw = () => page.evaluate(k => localStorage.getItem(k), KEY);
const saved = async () => { try { return JSON.parse((await raw()) || 'null'); } catch { return null; } };
const heading = async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
const tap = async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
const tapText = async rx => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
const clearRoom = async () => {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await wait(250); }
};
const home = async () => { await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).catch(() => {}); await wait(350); };
async function simTo(week) {
  for (let step = 0; step < 200; step++) {
    const where = await heading();
    if (where === 'FULL TIME') { await tap(/continue|next|carry on|ok/i); await wait(350); continue; }
    if (where === 'HALF TIME' || where === 'MATCH LIVE') { await tap(/second half|skip|full report/i); await wait(350); continue; }
    if (((await saved())?.week ?? 0) >= week) return true;
    if (await tapText(/Quick Sim/i)) { await wait(600); continue; }
    await clearRoom();
    if (await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).then(() => true).catch(() => false)) { await wait(300); continue; }
    return false;
  }
  return false;
}
async function resumeOn(origin) {
  await page.goto(origin + '/club-manager', { waitUntil: 'domcontentloaded' });
  const r = page.getByRole('button', { name: /^Resume Career$/ }).first();
  await r.waitFor({ timeout: 10000 }).catch(() => {});
  await r.click({ timeout: 4000 }).catch(() => {});
  await wait(1200); await clearRoom(); await home();
}
async function put(origin, value) {
  await page.goto(origin + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, value]);
}

try {
  // 1. On the base build: Barcelona, 2026-27, to week 14 (past the first international windows).
  await page.goto(OLD + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await wait(900); await clearRoom();
  await tap(/2026-27/i);
  await page.getByRole('button', { name: /Spain/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/Spain/i);
  await page.getByRole('button', { name: /La Liga/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/La Liga/i);
  const club = page.locator('button').filter({ hasText: /Barcelona/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(/take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/skip: just manage/i);
  await wait(900);
  const reached = await simTo(14);
  const baseSave = await raw();
  const b = JSON.parse(baseSave || 'null');
  log(`BASE save: ${b?.clubName} week ${b?.week}, reached ${reached}, ${baseSave?.length} bytes, inbox ${b?.inbox?.length}, headlines ${b?.aiHeadlines?.length}`);
  const oldIntl = (b?.inbox || []).find(m => /do not stop for it/.test(m.text || ''));
  const oldBoard = JSON.stringify(b?.boardObjectives ?? b?.objectives ?? '').match(/Win the La Liga(?! and)/);
  log(`BASE words: intl note ${oldIntl ? 'present' : 'absent'}, board "Win the La Liga" ${oldBoard ? 'present' : 'absent'}`);
  if (!b) throw new Error('no base save');

  // 2. Resume it on the base and on the head: does each build re-save it the same way?
  await resumeOn(OLD);
  const baseResaved = await raw();
  await put(HEAD, baseSave);
  await resumeOn(HEAD);
  const headResaved = await raw();
  log(`RESAVE base ${baseResaved?.length} bytes, head ${headResaved?.length} bytes, equal ${baseResaved === headResaved}, head equals the original ${headResaved === baseSave}`);
  if (baseResaved !== headResaved) {
    const x = JSON.parse(baseResaved || '{}'), y = JSON.parse(headResaved || '{}');
    const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    log(`RESAVE differing top level keys: ${keys.join(', ')}`);
    for (const k of keys.slice(0, 4)) log(`  ${k}: base ${JSON.stringify(x[k]).slice(0, 160)} | head ${JSON.stringify(y[k]).slice(0, 160)}`);
    if (keys.some(k => !/saved|stamp|time|At$/i.test(k))) finding(`the head re-saves an old save differently from the base on resume (${keys.join(', ')})`);
  }
  const h = JSON.parse(headResaved || 'null');
  if (oldIntl && !(h?.inbox || []).some(m => m.text === oldIntl.text)) finding('the old break note was rewritten on load');
  await page.screenshot({ path: path.join(OUT, 'old-hub-390.png') }).catch(() => {});

  // 3. The desk with the old save, then four more weeks on the head.
  const tile = page.locator('button:visible').filter({ hasText: /Finances/ }).filter({ hasText: /projected/ }).first();
  if (await tile.count().catch(() => 0)) {
    await tile.click({ timeout: 4000 }).catch(() => {});
    await page.locator('[data-finance-projection]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await wait(800);
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-projection-total]')].map(r => `${r.getAttribute('data-projection-total')}: ${r.innerText.replace(/\s+/g, ' ')}`));
    log(`DESK on the old save: ${rows.join(' | ')}`);
    if (!rows.some(r => r.startsWith('kitty'))) finding('no kitty row on the old save');
    await page.screenshot({ path: path.join(OUT, 'old-desk-390.png') }).catch(() => {});
  } else finding('no Finances tile on the old save');
  await home();
  const on = await simTo((h?.week ?? 0) + 4);
  const after = await saved();
  log(`PLAYED ON: reached ${on}, week ${after?.week}`);
  if (!on) finding(`the old save did not play four more weeks on the head (week ${after?.week})`);
  const inbox = (after?.inbox || []).map(m => m.text || '').filter(t => /International break|do not stop|keeps your fixtures/.test(t));
  log(`INBOX intl lines after playing on: ${inbox.map(t => t.slice(0, 110)).join(' || ') || 'none'}`);
} catch (e) { finding(`threw ${String(e.message).split('\n')[0]}`); }
log(`PAGE ERRORS: ${errs.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED/i.test(e)).slice(0, 3).join(' | ') || 'none'}`);
await browser.close();
log(`rold: done, ${findings} finding(s)`);
process.exit(0);

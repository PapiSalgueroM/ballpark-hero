// REVIEW-run Round 1306: Manager Hot Seat played the way a player does, to its verdict, and handed over to Club
// Manager when the job is kept. No stored value of the Hot Seat may ever carry a league book; the career handed
// over holds none and starts a late one at its first match week in Club Manager.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const KEY = 'dukb-club-manager-save';
fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok    ' + m);
const browser = await chromium.launch();
for (const cfg of [{ w: 390, h: 844, motion: 'reduce', start: /Take today.s job/i }, { w: 1280, h: 900, motion: 'no-preference', start: /^\s*Random\s*$/i }]) {
  const tag = `${cfg.w}-${cfg.motion === 'reduce' ? 'rm' : 'motion'}`;
  console.log(`\n=== Hot Seat, ${cfg.w}x${cfg.h}, reduced motion ${cfg.motion === 'reduce' ? 'ON' : 'off'}, start by ${cfg.start} ===`);
  const context = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, isMobile: cfg.w < 600, hasTouch: cfg.w < 600, reducedMotion: cfg.motion });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e)));
  const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const press = async rx => { const b = page.locator('button:visible:not([disabled])').filter({ hasText: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 3000 }).then(() => true).catch(() => false); };
  const clearRoom = async () => {
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
    for (let i = 0; i < 3; i++) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
  };
  const booked = async () => page.evaluate(k => Object.keys(localStorage).filter(x => x !== k && (localStorage.getItem(x) ?? '').includes('"leagueBook"')), KEY);
  await page.goto(BASE + '/manager-hot-seat', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await clearRoom();
  if (!await press(cfg.start)) { fail(`${tag}: the start button was not found: ${(await text()).slice(0, 140)}`); await context.close(); continue; }
  await page.waitForTimeout(1200);
  let kicked = 0, answered = 0, carried = false, everBooked = [];
  for (let step = 0; step < 90; step++) {
    const b = await booked();
    if (b.length) everBooked = b;
    if (await page.locator('button:visible').filter({ hasText: /Carry on in Club Manager/ }).count().catch(() => 0)) { carried = true; break; }
    if (await press(/^\s*Take the job\s*$/)) { await page.waitForTimeout(900); continue; }
    if (await press(/See the Club Manager offer/)) { await page.waitForTimeout(700); continue; }
    if (await press(/^Next match$/)) { await page.waitForTimeout(600); continue; }
    if (await press(/^Kick off$/)) { kicked += 1; await page.waitForTimeout(1100); continue; }
    const option = page.locator('button.text-left:visible').first();
    if (await option.count().catch(() => 0)) { await option.click({ timeout: 3000 }).catch(() => {}); answered += 1; await page.waitForTimeout(500); continue; }
    if (/sacked|the board have|verdict|you kept the job|kept your job/i.test(await text()) && kicked >= 3) break;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(OUT, `hs-${tag}-verdict.png`) }).catch(() => {});
  const hotKeys = await page.evaluate(() => Object.keys(localStorage).filter(x => /hot|seat/i.test(x)).map(x => `${x} (${(localStorage.getItem(x) ?? '').length} bytes)`));
  console.log(`  note  ${tag}: ${kicked} matches kicked off, ${answered} press answers, stored: ${hotKeys.join(', ') || 'nothing'}; on screen: ${(await text()).slice(0, 200)}`);
  if (kicked < 1) fail(`${tag}: no Hot Seat match was played`);
  if (everBooked.length) fail(`${tag}: a stored value of the Hot Seat carries a league book: ${everBooked.join(', ')}`); else ok(`${tag}: ${kicked} matches played, no stored value ever carried a league book`);
  if (carried) {
    await page.locator('button:visible').filter({ hasText: /Carry on in Club Manager/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.locator('button:visible').filter({ hasText: /Carry on in Club Manager|Replace|Start/ }).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForURL(/club-manager/, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await clearRoom();
    const s0 = await page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, KEY);
    if (!s0) fail(`${tag}: no Club Manager save after the handover: ${(await text()).slice(0, 140)}`);
    else {
      if (s0.leagueBook !== undefined) fail(`${tag}: the career handed over already carries a league book`); else ok(`${tag}: handed over to Club Manager at ${s0.clubName}, week ${s0.week}, with no book`);
      await page.screenshot({ path: path.join(OUT, `hs-${tag}-handed-over.png`) }).catch(() => {});
      for (let step = 0; step < 30; step++) {
        const h1 = ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
        if (h1 === 'FULL TIME') { await page.getByRole('button', { name: /continue|next|carry on|ok/i }).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
        const now = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null')?.week ?? 0, KEY);
        if (now > s0.week) break;
        await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 1500 }).catch(() => {});
        if (!await press(/Quick Sim/i)) await clearRoom();
        await page.waitForTimeout(900);
      }
      const s1 = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);
      const b = s1?.leagueBook;
      let misfit = -1;
      if (b && b.c) { misfit = 0; for (const club of s1.leagueClubs.filter(c => c !== s1.clubName)) { const e = b.c[club]; const rows = e ? Object.values(e.m ?? {}).reduce((n, r) => n + r[0], 0) : 0; if (rows + (e?.og ?? 0) + (e?.u ?? 0) !== (s1.table.find(t => t.club === club)?.gf ?? 0)) misfit += 1; } }
      if (!s1 || s1.week <= s0.week) fail(`${tag}: the career handed over could not play a week: ${(await text()).slice(0, 140)}`);
      else if (misfit !== 0 || typeof b.r0 !== 'number') fail(`${tag}: after a week the handed over career's book is not a late book that fits (misfit ${misfit}, r0 ${b?.r0})`);
      else ok(`${tag}: after one week in Club Manager, week ${s1.week}, a late book from round index ${b.r0} (u0 ${b.u0}) that fits`);
      await page.screenshot({ path: path.join(OUT, `hs-${tag}-after-a-week.png`) }).catch(() => {});
    }
  } else console.log(`  note  ${tag}: the run did not end on a kept job (no "Carry on in Club Manager"), so the handover was not walked here`);
  if (errors.length) fail(`${tag}: ${errors.length} page error(s): ${[...new Set(errors)].join(' | ').slice(0, 300)}`); else ok(`${tag}: no page error`);
  await context.close();
}
await browser.close();
console.log(failures ? `\nhot seat walk: ${failures} FAILURE(S)` : '\nhot seat walk: green');
process.exit(failures ? 1 : 0);

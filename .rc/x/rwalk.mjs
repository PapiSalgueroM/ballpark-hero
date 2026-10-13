// Round 1326 reviewer walk (RUN lens), never committed. #!serve #!playwright; reads BASE, writes pictures to RC_OUT.
// Plays Club Manager the way a player would: Liverpool ten weeks, the Finances desk (does Kitty change match
// the kitty's real move?), the hub tile beside it, a doctored big signing (the red row), Barcelona's board
// line on the club list and the Board panel, the "?" at the finance paragraph. 390x844 and 1280x900,
// reduced motion on and off. Database and ad hosts blocked.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rwalk';
const KEY = 'dukb-club-manager-save';
fs.mkdirSync(OUT, { recursive: true });
const log = m => console.log(m);
let findings = 0;
const finding = m => { findings += 1; log('FINDING ' + m); };
const browser = await chromium.launch();

async function session(motion) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: motion });
  await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e)));
  const wait = ms => page.waitForTimeout(ms);
  const saved = () => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, KEY);
  const heading = async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
  const tap = async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
  const tapText = async rx => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
  const clearRoom = async () => {
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
    for (let i = 0; i < 3; i++) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await wait(250); }
  };
  const shot = async (name, w, h) => { await page.setViewportSize({ width: w, height: h }); await wait(400); await page.screenshot({ path: path.join(OUT, `${motion === 'reduce' ? 'rm' : 'mo'}-${name}-${w}.png`), fullPage: false }).catch(() => {}); };
  const home = async () => { await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 2000 }).catch(() => {}); await wait(350); };
  async function startClub(country, league, club) {
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await wait(900); await clearRoom();
    if (await page.getByRole('button', { name: /^Resume Career$/ }).count().catch(() => 0)) {
      await page.evaluate(k => localStorage.removeItem(k), KEY); await page.reload({ waitUntil: 'domcontentloaded' }); await wait(900); await clearRoom();
    }
    await tap(/2026-27/i);
    await page.getByRole('button', { name: country }).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tap(country);
    await page.getByRole('button', { name: league }).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tap(league);
    const tile = page.locator('button').filter({ hasText: club }).first();
    await tile.waitFor({ timeout: 8000 }).catch(() => {});
    return tile;
  }
  async function takeJob(tile) {
    await tile.click({ timeout: 5000 }).catch(() => {});
    await wait(500);
    await tap(/take the job|confirm|start/i);
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tap(/skip: just manage/i);
    await wait(900);
  }
  async function simTo(week) {
    for (let step = 0; step < 160; step++) {
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
  async function resume() {
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
    const r = page.getByRole('button', { name: /^Resume Career$/ }).first();
    await r.waitFor({ timeout: 10000 }).catch(() => {});
    await r.click({ timeout: 4000 }).catch(() => {});
    await wait(900); await clearRoom(); await home();
  }
  async function openDesk() {
    await home();
    const tile = page.locator('button:visible').filter({ hasText: /Finances/ }).filter({ hasText: /projected/ }).first();
    if (await tile.count().catch(() => 0) === 0) return null;
    const tileText = ((await tile.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    await tile.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await wait(300);
    const before = await page.evaluate(() => window.scrollY);
    await tile.click({ timeout: 4000 }).catch(() => {});
    await page.locator('[data-finance-projection]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await wait(900);
    const after = await page.evaluate(() => window.scrollY);
    const rows = await page.evaluate(() => {
      const out = {};
      for (const tr of document.querySelectorAll('[data-finance-projection] tr')) {
        const cells = [...tr.querySelectorAll('td')].map(td => ({ t: td.innerText.trim(), c: getComputedStyle(td).color, fs: getComputedStyle(td).fontSize }));
        if (cells.length === 3) out[cells[0].t] = cells;
      }
      const para = document.querySelector('[data-finance-projection] p')?.innerText ?? '';
      return { out, para };
    });
    return { tileText, before, after, rows };
  }
  return { page, ctx, errs, wait, saved, tap, tapText, clearRoom, shot, home, startClub, takeJob, simTo, resume, openDesk };
}

const num = s => { const m = /([+-]?)[^0-9]*([0-9.]+)\s*(bn|m|k)?/i.exec(s || ''); if (!m) return NaN; let v = Number(m[2]); const u = (m[3] || '').toLowerCase(); if (u === 'k') v /= 1000; if (u === 'bn') v *= 1000; return m[1] === '-' ? -v : v; };
const cell = (rows, label, i) => rows.out[label]?.[i]?.t ?? '';

for (const motion of ['reduce', 'no-preference']) {
  const S = await session(motion);
  const { page, wait } = S;
  try {
    log(`=== session reducedMotion=${motion}`);
    // 1. Liverpool, ten weeks, the desk; does Kitty change so far equal the kitty's real move?
    const liv = await S.startClub(/England/i, /Premier League/i, /Liverpool/);
    await S.takeJob(liv);
    const s0 = await S.saved();
    log(`STATE start ${s0?.clubName} week ${s0?.week} kitty ${s0?.budget}`);
    await S.simTo(10);
    const s1 = await S.saved();
    log(`STATE now week ${s1?.week} kitty ${s1?.budget} (moved ${Math.round(((s1?.budget ?? 0) - (s0?.budget ?? 0)) * 100) / 100})`);
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await S.resume();
      const d = await S.openDesk();
      if (!d) { finding(`${motion} ${w}: no Finances tile`); continue; }
      log(`TILE ${w}: ${d.tileText.slice(0, 120)}`);
      log(`SCROLL ${w}: before ${d.before} after ${d.after}`);
      for (const [k, v] of Object.entries(d.rows.out)) log(`ROW ${w} ${k} | ${v[1].t} | ${v[2].t} | colour ${v[2].c} | ${v[2].fs}`);
      const inc = num(cell(d.rows, 'Income', 1)), sp = num(cell(d.rows, 'Spend', 1));
      const cov = num(cell(d.rows, 'Board covers running costs', 1)), kit = num(cell(d.rows, 'Kitty change', 1));
      const moved = (s1?.budget ?? 0) - (s0?.budget ?? 0);
      log(`SUM ${w}: income ${inc} - spend ${sp} + cover ${cov} = ${Math.round((inc - sp + cov) * 10) / 10}; kitty row ${kit}; the save's kitty moved ${Math.round(moved * 10) / 10}`);
      if (Math.abs(kit - moved) > 0.15) finding(`${motion} ${w}: Kitty change so far reads ${kit} but the kitty moved ${Math.round(moved * 100) / 100} since the season began`);
      if (Math.abs((inc - sp + cov) - kit) > 0.15) finding(`${motion} ${w}: the kitty row ${kit} is not income less spend plus cover ${inc - sp + cov}`);
      const tileNeg = /-\D?[0-9.]+\w* projected/.test(d.tileText);
      if (tileNeg && kit >= 0) log(`NOTE ${w}: the hub tile reads "${d.tileText.slice(0, 80)}" while the desk's Kitty change reads ${cell(d.rows, 'Kitty change', 2)} (Round 1328's tile)`);
      await S.shot('desk-top', w, h);
      await page.locator('[data-finance-projection] p').first().evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await S.shot('desk-para', w, h);
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sideways > 0) finding(`${motion} ${w}: the page scrolls sideways by ${sideways}px on the desk`);
      const smallBtns = await page.evaluate(() => [...document.querySelectorAll('[data-finance-projection] button, [data-pricing-desk] button, [data-sponsor-desk] button, [data-finance-books] button')].filter(b => b.getBoundingClientRect().height < 44 && b.offsetParent).map(b => b.innerText.slice(0, 30)));
      if (smallBtns.length) finding(`${motion} ${w}: buttons under 44px: ${smallBtns.join(' | ')}`);
      if (motion !== 'reduce') {
        const anims = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
        log(`ANIMS ${w} running on the page with motion on: ${anims}`);
      } else {
        const anims = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target?.closest?.('[data-finance-projection],[data-pricing-desk],[data-sponsor-desk],[data-finance-books]')).length);
        if (anims) finding(`${motion} ${w}: ${anims} animations run on the desk under reduced motion`);
      }
    }
  } catch (e) { finding(`${motion}: threw ${String(e.message).split('\n')[0]}`); }
  log(`PAGE ERRORS ${motion}: ${S.errs.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED/i.test(e)).slice(0, 3).join(' | ') || 'none'}`);
  globalThis.__S = S;
  if (motion === 'reduce') globalThis.__RM = S; else await S.ctx.close();
}

// 2. On the reduced motion session: a doctored big signing (the kitty row turns red), then the "?" at the finance paragraph.
{
  const S = globalThis.__RM;
  const { page, wait } = S;
  try {
    await page.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
    const doc = await page.evaluate(k => {
      const c = JSON.parse(localStorage.getItem(k) || 'null');
      if (!c) return 'no save';
      c.seasonSignings = [...(c.seasonSignings || []), { dir: 'in', name: 'Reviewer Test Signing', fee: 400 }];
      localStorage.setItem(k, JSON.stringify(c));
      return `signings ${c.seasonSignings.length}`;
    }, KEY);
    log(`DOCTOR big signing: ${doc}`);
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await S.resume();
      const d = await S.openDesk();
      if (!d) { finding(`doctored ${w}: no desk`); continue; }
      for (const k of ['Spend', 'Board covers running costs', 'Kitty change']) log(`ROW doctored ${w} ${k} | ${cell(d.rows, k, 1)} | ${cell(d.rows, k, 2)} | colour ${d.rows.out[k]?.[2]?.c}`);
      const kit = num(cell(d.rows, 'Kitty change', 2));
      const col = d.rows.out['Kitty change']?.[2]?.c ?? '';
      log(`COLOUR doctored ${w}: kitty ${kit} colour ${col}`);
      await S.shot('desk-red', w, h);
    }
    // the "?" at the finance paragraph
    await S.home();
    const help = page.getByRole('button', { name: /how to play|help|rules|\?/i }).first();
    if (await help.count().catch(() => 0)) {
      await help.click({ timeout: 4000 }).catch(() => {});
      await wait(700);
      const para = page.getByText(/The club earns while you manage/).first();
      await para.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await S.shot('help-finance', 390, 844);
      await page.keyboard.press('Escape').catch(() => {});
    } else log('MISS no help button found');
  } catch (e) { finding(`part 2 threw ${String(e.message).split('\n')[0]}`); }
  await S.ctx.close();
}

// 3. Barcelona: the La Liga club list and the Board panel, motion on, 390 and 1280.
{
  const S = await session('no-preference');
  const { page, wait } = S;
  try {
    const barca = await S.startClub(/Spain/i, /La Liga/i, /Barcelona/);
    const t = ((await barca.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    log(`TEXT Barcelona tile: ${t.slice(0, 160)}`);
    if (/the La Liga/.test(t)) finding(`Barcelona's tile still says "the La Liga": ${t.slice(0, 120)}`);
    await barca.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await S.shot('clublist-laliga', 390, 844);
    await S.shot('clublist-laliga', 1280, 900);
    await S.takeJob(barca);
    await S.home();
    const board = page.locator('button:visible').filter({ hasText: /patience/i }).first();
    if (await board.count().catch(() => 0)) {
      await board.click({ timeout: 4000 }).catch(() => {});
      await wait(700);
      const body = ((await page.locator('main').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      log(`TEXT board panel: ${(body.match(/Win (the )?[A-Z][^.|]{0,60}/g) || []).slice(0, 5).join(' | ')}`);
      if (/Win the La Liga(?! and)/.test(body)) finding('the Board panel still says "Win the La Liga"');
      await page.getByText(/^Win /).first().evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await S.shot('board-panel', 390, 844);
      await S.shot('board-panel', 1280, 900);
    } else log('MISS no Board tile');
    // ten weeks so the news feed holds weekly league lines
    await S.simTo(9);
    const s = await S.saved();
    const lines = (s?.aiHeadlines || []).filter(h => /top .*on \d+ points|sharpest attack/.test(h));
    log(`TEXT news lines: ${lines.slice(0, 3).join(' | ') || 'none'}`);
    if (lines.some(h => /the La Liga/.test(h))) finding('a news line still says "the La Liga"');
    await page.getByRole('tab', { name: /^Market$/i }).first().click({ timeout: 4000 }).catch(() => {});
    await wait(700);
    await page.getByText(/Around the league/).first().evaluate(el => el.scrollIntoView({ block: 'start' })).catch(() => {});
    await S.shot('feed', 390, 844);
  } catch (e) { finding(`part 3 threw ${String(e.message).split('\n')[0]}`); }
  log(`PAGE ERRORS part 3: ${S.errs.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED/i.test(e)).slice(0, 3).join(' | ') || 'none'}`);
  await S.ctx.close();
}
await browser.close();
log(`rwalk: done, ${findings} finding(s)`);
process.exit(0);

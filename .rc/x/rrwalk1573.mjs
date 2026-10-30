// Review of Round 1573 (lens: runner): PLAY Sports Millionaire the way a player does, on the two label planted pool
// (simTriviaBank section 9's PLANTED, served the way kit1573/walk1573.mjs serves it). Never committed.
// The right answer is read from the page's own React state (the ladder hook), so the walk can climb all 15 rungs.
//   S1 head, dead day, 390x844, reduced motion ON: climb all 15, every rung's text fresh, reload restores the win
//   S2 head, dead day, 1280x900, reduced motion OFF: climb all 15
//   S3 head, dead day, 390x844, motion OFF: a wrong answer at rung 3 ends the run (game over card)
//   S4 head, good day, 1280x900, reduced ON: N Unlimited deals, each read from state: 15 long, 15 distinct texts
//   S5 old save: the base build plays the good day, walks away at rung 4, the record is carried to the head, which
//      restores it; the good day's ladder is JSON equal on base and head; the base shows the error card on the dead day
//   S6 What's New at 390 and 1280: the new line is there and readable
// Exit 0 green, 1 red, 2 could not run.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HEAD = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const BASE_DIST = process.env.PLAY_BASE_DIST || '';
const BASE_URL = 'http://localhost:4174';
const DEAD = process.env.PLAY_SHORT_DATE || '2026-11-04';
const GOOD = process.env.PLAY_GOOD_DATE || '2026-11-02';
const DEALS = Number(process.env.PLAY_DEALS || 150);
const OUT = process.env.RC_OUT || path.resolve('walk-out');
fs.mkdirSync(OUT, { recursive: true });
const issues = [];
const log = [];
const say = s => { log.push(s); console.log(s); };
const bad = s => { issues.push(s); console.log(`  ISSUE: ${s}`); };

const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const market = J('scripts/data/alphabetSprintPool.json').rows
  .filter(r => r.player_name && r.market_value_usd)
  .map(r => ({ player_name: r.player_name, nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) }))
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0))
  .map((r, i) => ({ ...r, position: i % 2 === 0 ? 'Central Midfield' : 'Centre-Back' }));

async function serve(route) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': 'content-range' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const table = url.pathname.split('/').pop();
  if (req.method() === 'GET' && url.pathname.includes('/rest/v1/')) {
    if (table === 'player_market_values_dedup') {
      const off = Number(url.searchParams.get('offset') || 0), lim = Number(url.searchParams.get('limit') || 1000);
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(market.slice(off, off + lim)) });
    }
    if (table === 'ballon_dor' || table === 'shirt_number_puzzles') return route.fulfill({ status: 500, headers: { ...cors, 'content-type': 'application/json' }, body: '{"message":"walkrun1573: fails on purpose"}' });
  }
  return route.abort();
}

async function open(browser, url, viewport, date, { seed = 1573, reduced = true, storage = null, route = '/sports-millionaire' } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith(url)) return r.continue(); if (/supabase\.co/.test(u)) return serve(r); return r.abort(); });
  await ctx.addInitScript(([s, st]) => {
    try {
      if (!sessionStorage.getItem('walkrun-seeded')) {
        sessionStorage.setItem('walkrun-seeded', '1');
        localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
        localStorage.setItem('rules-gate-seen:/sports-millionaire', '1');
        if (st) for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v);
      }
    } catch {}
    let a = s;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, [seed, storage]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0]));
  await page.clock.setFixedTime(new Date(`${date}T17:00:00Z`));
  await page.goto(`${url}${route}`, { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors };
}

/* the page's state as a player sees it, plus the ladder read from the page's own React hooks */
const READ = () => {
  const text = document.body.textContent || '';
  const header = [...document.querySelectorAll('span')].map(s => (s.textContent || '').trim()).find(t => /^Question \d+ of 15/.test(t)) || '';
  const qp = document.querySelector('p.text-lg.font-semibold.text-center');
  let ladder = null;
  for (const n of document.querySelectorAll('button, p, span')) {
    const key = Object.keys(n).find(k => k.startsWith('__reactFiber$'));
    if (!key) continue;
    for (let f = n[key]; f && !ladder; f = f.return) {
      let h = f.memoizedState;
      for (let g = 0; h && typeof h === 'object' && 'next' in h && g < 300; g++, h = h.next) {
        const v = h.memoizedState;
        if (Array.isArray(v) && v.length && v.every(q => q && typeof q === 'object' && 'correctIndex' in q && 'question' in q)) { ladder = v.map(q => ({ question: q.question, options: q.options, correctIndex: q.correctIndex, difficulty: q.difficulty })); break; }
      }
    }
    if (ladder) break;
  }
  return {
    state: text.includes("Couldn't load Sports Millionaire right now.") ? 'error' : /You won \$1,000,000!|Walked away with|Game over:/.test(text) ? 'done' : header ? 'playing' : 'boot',
    rung: header ? Number(/^Question (\d+)/.exec(header)[1]) : 0,
    question: qp ? (qp.textContent || '').trim() : '',
    headline: (text.match(/You won \$1,000,000!|Walked away with \$[\d,]+|Game over: \$[\d,]+/) || [''])[0],
    ladder,
    scrollY: Math.round(window.scrollY),
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};
const read = page => page.evaluate(READ);
async function until(page, pred, ms = 15000) {
  const t = Date.now();
  let s = await read(page);
  while (!pred(s) && Date.now() - t < ms) { await page.waitForTimeout(100); s = await read(page); }
  return s;
}
/* click option i of the four answer buttons, the way a tap lands (no scroll by the driver) */
const CLICK = i => {
  const grid = [...document.querySelectorAll('div.grid')].find(g => g.querySelectorAll(':scope > button').length === 4);
  if (!grid) return false;
  grid.querySelectorAll(':scope > button')[i].click();
  return true;
};

/* climb: answer right on every rung up to stopAt (then wrong, or walk away), checking what the player sees */
async function climb(page, tag, { stopAt = 16, how = 'wrong', shots = [] } = {}) {
  let s = await until(page, x => x.state !== 'boot', 30000);
  if (s.state !== 'playing' || s.rung !== 1) { bad(`${tag}: did not open on Question 1 of 15 (${s.state}, rung ${s.rung})`); return s; }
  const ladder = s.ladder;
  if (!ladder || ladder.length !== 15) { bad(`${tag}: the ladder in the page's state is ${ladder ? ladder.length : 'not found'} long`); return s; }
  if (new Set(ladder.map(q => q.question)).size !== 15) bad(`${tag}: the ladder repeats a text`);
  if (ladder.some((q, i) => q.difficulty !== i + 1)) bad(`${tag}: a rung is not at its own difficulty`);
  const y0 = s.scrollY;
  const seen = [];
  for (let r = 1; r <= 15; r++) {
    s = await until(page, x => x.state === 'playing' && x.rung === r && x.question === ladder[r - 1].question);
    if (s.state !== 'playing' || s.rung !== r) { bad(`${tag}: expected rung ${r}, page shows ${s.state} rung ${s.rung}`); return s; }
    if (s.question !== ladder[r - 1].question) bad(`${tag}: rung ${r} shows "${s.question}", state holds "${ladder[r - 1].question}"`);
    if (seen.includes(s.question)) bad(`${tag}: rung ${r} repeats an earlier text: ${s.question}`);
    seen.push(s.question);
    if (s.scrollY !== y0) bad(`${tag}: the page moved from scrollY ${y0} to ${s.scrollY} at rung ${r}`);
    if (s.sideways) bad(`${tag}: sideways scroll at rung ${r}`);
    if (shots.includes(r)) await page.screenshot({ path: path.join(OUT, `${tag}-q${r}.png`) });
    if (r === stopAt) {
      if (how === 'walk') await page.getByRole('button', { name: /Walk away with/ }).evaluate(b => b.click());
      else await page.evaluate(CLICK, (ladder[r - 1].correctIndex + 1) % 4);
      break;
    }
    await page.evaluate(CLICK, ladder[r - 1].correctIndex);
  }
  s = await until(page, x => x.state === 'done', 15000);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${tag}-done.png`) });
  say(`${tag}: ${s.state}, "${s.headline}", rungs seen ${seen.length}, distinct ${new Set(seen).size}`);
  return { ...s, ladder };
}

async function S1(browser) {
  const { ctx, page, errors } = await open(browser, HEAD, { width: 390, height: 844 }, DEAD, { reduced: true });
  const s = await climb(page, 'S1-head-dead-390-reduce', { shots: [1, 12, 15] });
  if (s.headline !== 'You won $1,000,000!') bad(`S1: the climb ended "${s.headline}", not the million`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const r = await until(page, x => x.state === 'done' || x.state === 'error', 30000);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'S1-head-dead-390-reload.png') });
  say(`S1 reload: ${r.state}, "${r.headline}"`);
  if (r.state !== 'done' || r.headline !== 'You won $1,000,000!') bad(`S1: the reload did not restore the finished daily (${r.state}, "${r.headline}")`);
  if (errors.length) bad(`S1 page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
  return s.ladder;
}
async function S2(browser, ladder1) {
  const { ctx, page, errors } = await open(browser, HEAD, { width: 1280, height: 900 }, DEAD, { reduced: false });
  const s = await climb(page, 'S2-head-dead-1280-motion', { shots: [12] });
  if (s.headline !== 'You won $1,000,000!') bad(`S2: the climb ended "${s.headline}"`);
  if (ladder1 && JSON.stringify(ladder1) !== JSON.stringify(s.ladder)) bad('S2: the dead day dealt a different ladder at 1280 than at 390');
  if (errors.length) bad(`S2 page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
async function S3(browser) {
  const { ctx, page, errors } = await open(browser, HEAD, { width: 390, height: 844 }, DEAD, { reduced: false });
  const s = await climb(page, 'S3-head-dead-390-wrong', { stopAt: 3, how: 'wrong' });
  if (!/^Game over: \$/.test(s.headline)) bad(`S3: a wrong answer at rung 3 ended "${s.headline}"`);
  if (errors.length) bad(`S3 page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
/* N Unlimited deals, each read from the page's state */
const DEAL = async () => {
  const tick = () => new Promise(res => setTimeout(res, 0));
  const text = () => document.body.textContent || '';
  const modes = [...document.querySelectorAll('div.bg-secondary.rounded-full.w-fit > button')];
  modes.find(b => /Daily/.test(b.textContent || '')).click();
  for (let i = 0; i < 200 && !text().includes("Today's ladder,"); i++) await tick();
  modes.find(b => /Unlimited/.test(b.textContent || '')).click();
  for (let i = 0; i < 400 && text().includes("Today's ladder,"); i++) await tick();
  await tick();
};
async function S4(browser) {
  const { ctx, page, errors } = await open(browser, HEAD, { width: 1280, height: 900 }, GOOD, { reduced: true, seed: 9157 });
  await until(page, x => x.state !== 'boot', 30000);
  const c = { deals: 0, error: 0, short: 0, repeats: 0, misrung: 0, sameAsLast: 0 };
  let last = '';
  for (let n = 0; n < DEALS; n++) {
    await page.evaluate(DEAL);
    const s = await until(page, x => x.state !== 'boot', 5000);
    c.deals += 1;
    if (s.state === 'error') { c.error += 1; if (c.error === 1) await page.screenshot({ path: path.join(OUT, 'S4-head-unlimited-error.png') }); continue; }
    const L = s.ladder || [];
    if (L.length !== 15) c.short += 1;
    if (new Set(L.map(q => q.question)).size !== L.length) c.repeats += 1;
    if (L.some((q, i) => q.difficulty !== i + 1)) c.misrung += 1;
    const sig = JSON.stringify(L.map(q => q.question));
    if (sig === last) c.sameAsLast += 1;
    last = sig;
    if (n === 0) await page.screenshot({ path: path.join(OUT, 'S4-head-unlimited-1280.png') });
  }
  say(`S4 head Unlimited at 1280 on ${GOOD}: ${JSON.stringify(c)}`);
  if (c.error || c.short || c.repeats || c.misrung) bad(`S4: ${JSON.stringify(c)}`);
  if (c.sameAsLast > 0) bad(`S4: ${c.sameAsLast} Unlimited deals repeated the previous ladder`);
  if (errors.length) bad(`S4 page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
/* the old save: a base build's finished daily, carried to the head */
async function S5(browser) {
  const vp = { width: 390, height: 844 };
  let b = await open(browser, BASE_URL, vp, GOOD, { reduced: true });
  const sb = await climb(b.page, 'S5-base-good-390-walk', { stopAt: 4, how: 'walk' });
  const store = await b.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => /millionaire/i.test(k)).map(k => [k, localStorage.getItem(k)])));
  say(`S5 base record keys: ${Object.keys(store).join(', ')}`);
  await b.ctx.close();
  if (!Object.keys(store).some(k => k.includes(GOOD))) bad(`S5: the base wrote no daily record for ${GOOD}`);
  const h = await open(browser, HEAD, vp, GOOD, { reduced: true, storage: store });
  const sh = await until(h.page, x => x.state === 'done' || x.state === 'error', 30000);
  await h.page.waitForTimeout(400);
  await h.page.screenshot({ path: path.join(OUT, 'S5-head-restores-base-record-390.png') });
  say(`S5 head with the base record: ${sh.state}, "${sh.headline}" (base ended "${sb.headline}")`);
  if (sh.state !== 'done' || sh.headline !== sb.headline) bad(`S5: the head did not restore the base's record (${sh.state}, "${sh.headline}" vs "${sb.headline}")`);
  if (JSON.stringify(sh.ladder) !== JSON.stringify(sb.ladder)) bad(`S5: the good day's ladder differs between base and head`);
  await h.ctx.close();
  b = await open(browser, BASE_URL, vp, DEAD, { reduced: true });
  const sd = await until(b.page, x => x.state !== 'boot', 30000);
  await b.page.screenshot({ path: path.join(OUT, 'S5-base-dead-390.png') });
  say(`S5 base on the dead day ${DEAD}: ${sd.state} (the control: the base must show the error card)`);
  if (sd.state !== 'error') bad(`S5 control: the base shows ${sd.state} on ${DEAD}, so the dead day is not dead on the base`);
  await b.ctx.close();
}
async function S6(browser) {
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const { ctx, page } = await open(browser, HEAD, vp, GOOD, { route: '/whats-new' });
    const li = page.locator('li', { hasText: 'Sports Millionaire: every climb has all 15 questions.' });
    await li.first().waitFor({ timeout: 20000 }).catch(() => {});
    const n = await li.count();
    if (n !== 1) bad(`S6 ${vp.width}: the What's New line appears ${n} times`);
    else {
      await li.first().evaluate(e => e.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `S6-whatsnew-${vp.width}.png`) });
      const t = await li.first().textContent();
      const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)].some(d => t.includes(d));
      say(`S6 ${vp.width}: line found, ${t.length} chars, dash ${dash}`);
      if (dash) bad(`S6: the line carries a dash`);
    }
    await ctx.close();
  }
}

const server = BASE_DIST ? spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', BASE_DIST, '4174'], { stdio: 'ignore' }) : null;
const up = async u => { for (let i = 0; i < 60; i++) { try { if ((await fetch(`${u}/sports-millionaire`)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 250)); } return false; };
if (!(await up(HEAD))) { console.log('walkrun1573: could not run: the head is not served'); process.exit(2); }
const haveBase = server && (await up(BASE_URL));
const browser = await chromium.launch();
let ladder1 = null;
for (const [name, fn] of [['S1', async () => { ladder1 = await S1(browser); }], ['S2', () => S2(browser, ladder1)], ['S3', () => S3(browser)], ['S4', () => S4(browser)], ['S5', () => (haveBase ? S5(browser) : bad('S5: no base build served'))], ['S6', () => S6(browser)]]) {
  try { await fn(); } catch (e) { bad(`${name} threw ${String(e.message || e).split('\n')[0]}`); }
}
await browser.close();
if (server) server.kill();
fs.writeFileSync(path.join(OUT, 'walkrun1573-log.txt'), [...log, '', 'ISSUES:', ...issues].join('\n') + '\n');
console.log(`walkrun1573: ${issues.length ? `RED, ${issues.length} issue(s)` : 'green'}`);
process.exit(issues.length ? 1 : 0);

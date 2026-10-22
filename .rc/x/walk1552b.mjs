// Reviewer walk for Round 1552: plays /sports-millionaire the way a player would, with the
// database answered from the repo's saved 2026 rows (no request leaves the runner: supabase.co
// is fulfilled locally from the fixture, every other host is aborted).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.resolve('walk-out');
fs.mkdirSync(OUT, { recursive: true });
const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const alpha = J('scripts/data/alphabetSprintPool.json').rows;
const auction = new Map(J('scripts/data/auctionMarketRows.json').map(r => [r.player_name, r.position]));
const stock = J('scripts/data/stockMarketPools.json');
const stockPos = new Map();
for (const s of Object.keys(stock.pools).sort()) for (const r of stock.pools[s]) if (r[1]) stockPos.set(r[0], r[1]);
const market = alpha.filter(r => r.player_name && r.market_value_usd)
  .map(r => ({ player_name: r.player_name, position: auction.get(r.player_name) ?? stockPos.get(r.player_name) ?? null, nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) }))
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const ballon = J('scripts/data/ballonDorVerified2026-09.json').rows
  .map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }))
  .sort((a, b) => b.year - a.year || a.rank - b.rank || (a.player_name < b.player_name ? -1 : 1));
const byName = new Map(market.map(r => [r.player_name, r]));
const NAMESAKES = new Set(J('src/data/marketNamesakes.json').names);
const NOT_A_CLUB = new Set(['Without Club', 'Retired', 'Career break', 'Unknown']);
const menWinner = new Map(ballon.filter(r => r.rank === 1 && r.award_type === 'Men').map(r => [r.year, r.player_name]));
const issues = [];
const log = [];

/* the oracle: which options are right, from the rows the page was served */
function judge(q, options) {
  let m; const flags = [];
  if (/play for|right now/i.test(q)) flags.push('present tense');
  if ((m = /^Which club was (.+) at in the (\d{4}) market values\?$/.exec(q)) || (m = /^Which club does (.+) play for\?$/.exec(q))) {
    const row = byName.get(m[1]);
    if (NAMESAKES.has(m[1])) flags.push('namesake subject');
    if (options.some(o => NOT_A_CLUB.has(o))) flags.push('non club offered');
    return { type: 'club', right: options.map((o, i) => (row && o === row.club ? i : -1)).filter(i => i >= 0), flags };
  }
  if ((m = /^What nationality is (.+)\?$/.exec(q))) {
    const row = byName.get(m[1]);
    if (NAMESAKES.has(m[1])) flags.push('namesake subject');
    return { type: 'nationality', right: options.map((o, i) => (row && o === row.nationality ? i : -1)).filter(i => i >= 0), flags };
  }
  if ((m = /^Which of these players plays (.+)\?$/.exec(q))) {
    if (options.some(o => NAMESAKES.has(o))) flags.push('namesake option');
    return { type: 'position', right: options.map((o, i) => (byName.get(o)?.position === m[1] ? i : -1)).filter(i => i >= 0), flags };
  }
  if (/^Who was worth the most in the \d{4} market values\?$/.test(q) || /^Who is worth more right now/.test(q)) {
    if (options.some(o => NAMESAKES.has(o))) flags.push('namesake option');
    const vals = options.map(o => byName.get(o)?.market_value_usd ?? -1);
    const top = Math.max(...vals);
    const right = vals.map((v, i) => (v === top ? i : -1)).filter(i => i >= 0);
    const second = [...vals].sort((a, b) => b - a)[1];
    if (right.length === 1 && top / second < 1.04) flags.push(`near tie ${top} vs ${second}`);
    return { type: 'worth', right, flags, vals };
  }
  if ((m = /^Who won the Ballon d'Or in (\d{4})\?$/.exec(q))) {
    const w = menWinner.get(Number(m[1]));
    return { type: 'ballon', right: options.map((o, i) => (o === w ? i : -1)).filter(i => i >= 0), flags };
  }
  return { type: 'unknown', right: [], flags: ['unknown template'] };
}

async function serve(route) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': 'content-range' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const table = url.pathname.split('/').pop();
  let rows = null;
  if (req.method() === 'GET' && url.pathname.includes('/rest/v1/')) {
    if (table === 'player_market_values_dedup') {
      const off = Number(url.searchParams.get('offset') || 0), lim = Number(url.searchParams.get('limit') || 1000);
      rows = market.slice(off, off + lim);
    } else if (table === 'ballon_dor') rows = ballon;
    else if (table === 'shirt_number_puzzles') rows = [];
  }
  if (rows) return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(rows) });
  return route.abort();
}

/* what is on screen now: the question, the four options, the layout numbers */
async function screen(page) {
  return page.evaluate(() => {
    const qEl = [...document.querySelectorAll('p')].find(p => p.className.includes('text-lg') && p.className.includes('font-semibold'));
    const btns = [...document.querySelectorAll('button')].filter(b => { const s = b.querySelector('span'); return s && /^[ABCD]$/.test(s.textContent.trim()) && b.querySelectorAll('span').length >= 2; });
    const opts = btns.map(b => b.querySelectorAll('span')[1].textContent.trim());
    const cut = btns.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim());
    const header = [...document.querySelectorAll('span')].map(s => s.textContent.trim()).find(t => /^Question \d+ of 15/.test(t)) || '';
    const hScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const qBox = qEl ? qEl.getBoundingClientRect() : null;
    const qOverflow = qEl ? qEl.scrollWidth > qEl.clientWidth + 1 : false;
    return { q: qEl ? qEl.textContent.trim() : '', opts, cut, header, hScroll, qOverflow, qBox: qBox && { x: Math.round(qBox.x), w: Math.round(qBox.width), h: Math.round(qBox.height) } };
  });
}

async function clickOption(page, i) {
  const letter = 'ABCD'[i];
  await page.locator('button', { has: page.locator(`span:text-is("${letter}")`) }).first().click();
}

async function play(tag, { width, height, motion, mode, fixedTime, swapAt, crowdAt, rulesSeen, shotAt = [] }) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, deviceScaleFactor: 1 });
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith(BASE)) return route.continue(); if (/supabase\.co/.test(u)) return serve(route); return route.abort(); });
  await ctx.addInitScript(([seen]) => {
    try {
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
      if (seen) localStorage.setItem('rules-gate-seen:/sports-millionaire', '1');
    } catch {}
  }, [rulesSeen]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  if (fixedTime) await page.clock.setFixedTime(new Date(fixedTime));
  await page.goto(`${BASE}/sports-millionaire`, { waitUntil: 'domcontentloaded' });
  if (!rulesSeen) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${tag}-rules.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  if (mode === 'unlimited') {
    await page.getByRole('button', { name: /Unlimited/ }).first().click();
  }
  try { await page.waitForFunction(() => [...document.querySelectorAll('span')].some(s => s.textContent.trim().startsWith('Question 1 of 15')), null, { timeout: 30000 }); }
  catch { await page.screenshot({ path: path.join(OUT, `${tag}-noboot.png`), fullPage: true }); issues.push(`${tag}: the ladder never showed Question 1 (${errors.join(' | ')})`); await browser.close(); return; }
  const dailyLine = await page.evaluate(() => (document.body.textContent.match(/Today's ladder, [^.]+\./) || [''])[0]);
  log.push(`${tag}: ${mode} ${dailyLine}`);
  for (let n = 1; n <= 15; n++) {
    await page.waitForFunction(k => [...document.querySelectorAll('span')].some(s => s.textContent.trim().startsWith(`Question ${k} of 15`)), n, { timeout: 15000 });
    await page.waitForTimeout(250);
    if (n === swapAt) {
      const before = await screen(page);
      await page.getByRole('button', { name: /Swap/ }).first().click();
      await page.waitForTimeout(400);
      const after = await screen(page);
      log.push(`${tag} Q${n} SWAP: "${before.q}" -> "${after.q}"`);
    }
    if (n === crowdAt) { await page.getByRole('button', { name: /Crowd/ }).first().click(); await page.waitForTimeout(700); }
    const s = await screen(page);
    const v = judge(s.q, s.opts);
    log.push(`${tag} Q${n} [${v.type}] ${s.q} :: ${s.opts.join(' / ')}${v.vals ? ' :: ' + v.vals.map(x => x / 1e6 + 'M').join(' / ') : ''}`);
    if (v.right.length !== 1) issues.push(`${tag} Q${n}: ${v.right.length} right options by the served rows: ${s.q} [${s.opts.join(' / ')}]`);
    for (const f of v.flags) issues.push(`${tag} Q${n}: ${f}: ${s.q} [${s.opts.join(' / ')}]`);
    if (s.hScroll) issues.push(`${tag} Q${n}: the page scrolls sideways`);
    if (s.cut.length) issues.push(`${tag} Q${n}: option text cut off: ${s.cut.join(' | ')}`);
    if (s.qOverflow) issues.push(`${tag} Q${n}: question text overflows its box`);
    if ([1, 8, 15].includes(n) || n === crowdAt || shotAt.includes(n)) await page.screenshot({ path: path.join(OUT, `${tag}-q${n}.png`) });
    const pick = v.right.length ? v.right[0] : 0;
    await clickOption(page, pick);
    if (n === 8) { await page.waitForTimeout(motion === 'reduce' ? 1200 : 1200); await page.screenshot({ path: path.join(OUT, `${tag}-q8-reveal.png`) }); }
    if (!v.right.length) break;
  }
  await page.waitForFunction(() => ![...document.querySelectorAll('span')].some(s => /^Question \d+ of 15/.test(s.textContent.trim())), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${tag}-done.png`) });
  await page.screenshot({ path: path.join(OUT, `${tag}-done-full.png`), fullPage: true });
  if (errors.length) issues.push(`${tag}: page errors: ${errors.slice(0, 3).join(' | ')}`);
  await browser.close();
}

/* dates where the head's daily asks about a namesake the list misses (gapcount1552.mjs, GAP_WALKPOOL=1) */
const RUNS = [
  ['ns-pablo-390', { width: 390, height: 844, motion: 'reduce', mode: 'daily', fixedTime: '2027-02-14T16:00:00Z', rulesSeen: true, shotAt: [9] }],
  ['ns-alisson-390', { width: 390, height: 844, motion: 'reduce', mode: 'daily', fixedTime: '2027-01-25T16:00:00Z', rulesSeen: true, shotAt: [8] }],
  ['ns-alissoncm-1280', { width: 1280, height: 900, motion: 'reduce', mode: 'daily', fixedTime: '2026-11-07T16:00:00Z', rulesSeen: true, shotAt: [10] }],
];
for (const [tag, opt] of RUNS) {
  try { await play(tag, opt); } catch (e) { issues.push(`${tag}: walk threw ${String(e.message || e).split('\n')[0]}`); }
}
fs.writeFileSync(path.join(OUT, 'walk-log.txt'), [...log, '', 'ISSUES:', ...issues].join('\n'));
console.log(log.join('\n'));
console.log('ISSUES:\n' + issues.join('\n'));
console.log(`walk1552: ${issues.length} issue(s)`);
process.exit(issues.length ? 1 : 0);

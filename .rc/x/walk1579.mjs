// Round 1579 walk: Sports Millionaire's Swap Question on the head build, at 390 by 844 and 1280 by 900. Sent as an
// rc extra file and never committed. The serving is lifted from kit1573/walk1573.mjs: the planted pool (the saved
// 2026 slice in fetchMarketPool's order, even rows Central Midfield, odd rows Centre-Back; altered rows, never
// shipped) answered for supabase.co, ballon_dor and shirt_number_puzzles a 500, every other host aborted, the clock
// fixed at 17:00 UTC of PLAY_DATE, Math.random seeded, cookie consent declined.
//   (r) the rules sheet opens on a first visit and carries the new Swap Question sentence;
//   (s) after "Let's Play!", Swap changes the question on screen, the Swap button is then disabled, scrollX and
//       scrollY do not move, and at 390 nothing scrolls sideways.
// Control PLAY_SWAP_CONTROL=noclick skips the click, so "the question changed" must go red.
// Exit 0 green, 1 red, 2 could not run, 3 the control did not fire.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const HEAD = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const DATE = process.env.PLAY_DATE || '2026-11-02';
const CONTROL = process.env.PLAY_SWAP_CONTROL || '';
const OUT = process.env.RC_OUT || path.resolve('walk-out');
fs.mkdirSync(OUT, { recursive: true });
const issues = [];
const say = s => console.log(s);
const couldNot = m => { console.log(`walk1579: could not run: ${m}`); process.exit(2); };
if (CONTROL && CONTROL !== 'noclick') couldNot(`PLAY_SWAP_CONTROL=${CONTROL} is not a control this walk knows`);
const SENTENCE = "It never deals a question that's already on your ladder";

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
    if (table === 'ballon_dor' || table === 'shirt_number_puzzles') {
      return route.fulfill({ status: 500, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'walk1579: this read fails on purpose' }) });
    }
  }
  return route.abort();
}

/* the rung label, the question on screen (the first p of the question column), the Swap button and the scroll */
const BOARD = () => {
  const label = [...document.querySelectorAll('span')].find(s => /^Question \d+ of \d+/.test((s.textContent || '').trim()));
  const p = label && label.parentElement && label.parentElement.parentElement ? label.parentElement.parentElement.querySelector('p') : null;
  const swap = [...document.querySelectorAll('button')].find(b => /^Swap$/.test((b.textContent || '').trim()));
  return {
    rung: label ? (label.textContent || '').trim() : null, question: p ? (p.textContent || '').trim() : null,
    swapDisabled: swap ? swap.disabled : null, scrollX: Math.round(window.scrollX), scrollY: Math.round(window.scrollY),
    sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
};

async function walk(browser, viewport) {
  const tag = `${viewport.width}`;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith(HEAD)) return route.continue(); if (/supabase\.co/.test(u)) return serve(route); return route.abort(); });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() })); } catch {}
    let a = 1579;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0]));
  await page.clock.setFixedTime(new Date(`${DATE}T17:00:00Z`));
  await page.goto(`${HEAD}/sports-millionaire`, { waitUntil: 'domcontentloaded' });
  /* (r) the rules sheet, a first visit */
  const dialog = page.getByRole('dialog');
  const opened = await dialog.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  if (!opened) { issues.push(`${tag}: the rules sheet did not open on a first visit`); }
  else {
    const text = (await dialog.textContent()) || '';
    await page.screenshot({ path: path.join(OUT, `rules-${tag}.png`) });
    say(`(r) ${tag}: rules sheet open, the Swap sentence ${text.includes(SENTENCE) ? 'present' : 'MISSING'}`);
    if (!text.includes(SENTENCE)) issues.push(`${tag}: the rules sheet does not carry "${SENTENCE}"`);
    await page.getByRole('button', { name: "Let's Play!" }).click();
    await dialog.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  }
  /* (s) the swap */
  await page.waitForFunction(() => [...document.querySelectorAll('span')].some(s => /^Question 1 of 15/.test((s.textContent || '').trim())), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);
  const before = await page.evaluate(BOARD);
  await page.screenshot({ path: path.join(OUT, `swap-before-${tag}.png`) });
  say(`(s) ${tag} before: ${JSON.stringify(before)}`);
  if (!before.question || before.swapDisabled !== false) couldNot(`${tag}: no live question 1 with an enabled Swap button on ${DATE}`);
  if (CONTROL !== 'noclick') await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /^Swap$/.test((b.textContent || '').trim())).click());
  await page.waitForTimeout(400);
  const after = await page.evaluate(BOARD);
  await page.screenshot({ path: path.join(OUT, `swap-after-${tag}.png`) });
  say(`(s) ${tag} after: ${JSON.stringify(after)}`);
  if (after.question === before.question) issues.push(`${tag}: the question changed: no, still "${before.question}"`);
  if (after.swapDisabled !== true) issues.push(`${tag}: the Swap button is not disabled after the swap`);
  if (after.rung !== before.rung) issues.push(`${tag}: the rung moved from ${before.rung} to ${after.rung}`);
  if (after.scrollX !== before.scrollX || after.scrollY !== before.scrollY) issues.push(`${tag}: the page moved (${before.scrollX},${before.scrollY} to ${after.scrollX},${after.scrollY})`);
  if (viewport.width === 390 && after.sideways) issues.push(`${tag}: the page scrolls sideways`);
  if (errors.length) issues.push(`${tag}: page errors ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) await walk(browser, viewport);
} finally {
  await browser.close();
}
for (const m of issues) console.log(`  RED: ${m}`);
if (CONTROL) {
  const fired = issues.some(m => m.includes('the question changed: no'));
  console.log(fired ? `walk1579: control ${CONTROL} fired (${issues.length} red line(s))` : `walk1579: control ${CONTROL} did NOT fire`);
  process.exit(fired ? 1 : 3);
}
console.log(issues.length ? `walk1579: ${issues.length} red line(s)` : 'walk1579: green');
process.exit(issues.length ? 1 : 0);

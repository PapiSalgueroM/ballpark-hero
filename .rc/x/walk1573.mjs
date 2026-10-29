// Round 1573 walk: Sports Millionaire on the two label planted pool, origin/main's build against the head's.
// Sent as an rc extra file and never committed (critic correction 5). The serving and the seeded storage are
// lifted from Round 1552's review walk (walk1552.mjs, kit1573). No request leaves the runner: supabase.co is
// answered here (the market rows with the offset and limit paging fetchMarketPool asks for; ballon_dor and
// shirt_number_puzzles with a 500, so the page's own fetchers hand back [] as in the reachable degraded state),
// and every other host is aborted.
//   (a) THE DEAD DAY: PLAY_SHORT_DATE is a planted daily the eight draw arm drops a step on (simTriviaBank
//       section 9). Base: the error card, both mode buttons disabled, Try again reloads into the card again.
//       Head: "Question 1 of 15" and the Unlimited button enabled.
//   (b) UNLIMITED DEALS: on PLAY_GOOD_DATE (a planted daily both builds deal whole) PLAY_DEALS deals, each Daily
//       then Unlimited. Error cards: base above 0 on both viewports (the control), head 0.
//   (c) at 390 the page never jumps on a deal (scrollY held) and nothing scrolls sideways.
// Exit 0 green, 1 red, 2 could not run, 3 the base build showed no failure (the control did not fire).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HEAD = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const BASE_DIST = process.env.PLAY_BASE_DIST || '';
const BASE_URL = 'http://localhost:4174';
const DEAD = process.env.PLAY_SHORT_DATE || '';
const GOOD = process.env.PLAY_GOOD_DATE || '';
const DEALS = Number(process.env.PLAY_DEALS || 320);
const OUT = process.env.RC_OUT || path.resolve('walk-out');
fs.mkdirSync(OUT, { recursive: true });
const lines = [];
const say = s => { lines.push(s); console.log(s); };
const issues = [];
const controlMissed = [];
const couldNot = m => { console.log(`walk1573: could not run: ${m}`); process.exit(2); };
if (!BASE_DIST || !fs.existsSync(path.join(BASE_DIST, 'index.html'))) couldNot(`no base build at PLAY_BASE_DIST=${BASE_DIST}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DEAD) || !/^\d{4}-\d{2}-\d{2}$/.test(GOOD)) couldNot('PLAY_SHORT_DATE and PLAY_GOOD_DATE must be dates');

/* the planted pool exactly as simTriviaBank section 9 builds it: the saved 2026 slice in fetchMarketPool's order
   (value down, then name), every position overwritten, even rows Central Midfield and odd rows Centre-Back.
   Altered rows, never shipped. */
const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const market = J('scripts/data/alphabetSprintPool.json').rows
  .filter(r => r.player_name && r.market_value_usd)
  .map(r => ({ player_name: r.player_name, nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) }))
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0))
  .map((r, i) => ({ player_name: r.player_name, position: i % 2 === 0 ? 'Central Midfield' : 'Centre-Back', nationality: r.nationality, club: r.club, market_value_usd: r.market_value_usd }));

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
      return route.fulfill({ status: 500, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'walk1573: this read fails on purpose' }) });
    }
  }
  return route.abort();
}

/* what the page shows: the error card, the first question, or still booting; read from textContent because the
   question header is uppercased by CSS */
const STATE = () => {
  const text = document.body.textContent || '';
  const modes = [...document.querySelectorAll('div.bg-secondary.rounded-full.w-fit > button')];
  const daily = modes.find(b => /Daily/.test(b.textContent || ''));
  const unl = modes.find(b => /Unlimited/.test(b.textContent || ''));
  const q1 = [...document.querySelectorAll('span')].some(s => /^Question 1 of 15$/.test((s.textContent || '').trim()));
  return {
    state: text.includes("Couldn't load Sports Millionaire right now.") ? 'error' : q1 ? 'playing' : 'boot',
    dailyMode: text.includes("Today's ladder,"),
    modes: modes.length, dailyDisabled: daily ? daily.disabled : null, unlDisabled: unl ? unl.disabled : null,
    scrollY: Math.round(window.scrollY),
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

async function open(browser, url, viewport, date, seed) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith(url)) return route.continue(); if (/supabase\.co/.test(u)) return serve(route); return route.abort(); });
  await ctx.addInitScript(s => {
    try {
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
      localStorage.setItem('rules-gate-seen:/sports-millionaire', '1');
    } catch {}
    let a = s;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0]));
  await page.clock.setFixedTime(new Date(`${date}T17:00:00Z`));
  await page.goto(`${url}/sports-millionaire`, { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors };
}

async function settled(page) {
  await page.waitForFunction(() => {
    const text = document.body.textContent || '';
    return text.includes("Couldn't load Sports Millionaire right now.") || [...document.querySelectorAll('span')].some(s => /^Question 1 of 15$/.test((s.textContent || '').trim()));
  }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);
  return page.evaluate(STATE);
}

async function walkDead(browser, build, url, viewport) {
  const tag = `${build}-a-${viewport.width}`;
  const { ctx, page, errors } = await open(browser, url, viewport, DEAD, 1573);
  const s = await settled(page);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  say(`(a) ${tag} on ${DEAD}: ${JSON.stringify(s)}`);
  if (build === 'base') {
    if (s.state !== 'error') controlMissed.push(`${tag}: the base shows ${s.state}, not the error card`);
    if (s.dailyDisabled !== true || s.unlDisabled !== true) controlMissed.push(`${tag}: the base's two mode buttons are not both disabled`);
    if (s.state === 'error') {
      await Promise.all([page.waitForEvent('load', { timeout: 15000 }).catch(() => {}), page.getByRole('button', { name: 'Try again' }).click()]);
      const r = await settled(page);
      say(`(a) ${tag} after Try again: ${r.state}${r.state === 'error' ? ', the same card (the reload dealt the same short ladder)' : ' (the fixed clock may not have survived the reload, so only the first card is asserted)'}`);
    }
  } else {
    if (s.state !== 'playing') issues.push(`${tag}: the head shows ${s.state} on ${DEAD}, not Question 1 of 15`);
    if (s.unlDisabled !== false) issues.push(`${tag}: the head's Unlimited button is not enabled`);
  }
  if (errors.length) say(`(a) ${tag}: page errors ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/* one deal: Daily, then Unlimited, then whatever the page settles on */
const DEAL = async () => {
  const tick = () => new Promise(res => setTimeout(res, 0));
  const text = () => document.body.textContent || '';
  const modes = [...document.querySelectorAll('div.bg-secondary.rounded-full.w-fit > button')];
  modes.find(b => /Daily/.test(b.textContent || '')).click();
  for (let i = 0; i < 200 && !text().includes("Today's ladder,"); i++) await tick();
  modes.find(b => /Unlimited/.test(b.textContent || '')).click();
  const q1 = () => [...document.querySelectorAll('span')].some(s => /^Question 1 of 15$/.test((s.textContent || '').trim()));
  for (let i = 0; i < 200 && (text().includes("Today's ladder,") || !(text().includes("Couldn't load Sports Millionaire right now.") || q1())); i++) await tick();
  await tick();
  return {
    state: text().includes("Couldn't load Sports Millionaire right now.") ? 'error' : q1() ? 'playing' : 'boot',
    unlimited: !text().includes("Today's ladder,"),
    scrollY: Math.round(window.scrollY),
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

async function walkDeals(browser, build, url, viewport) {
  const tag = `${build}-b-${viewport.width}`;
  const { ctx, page, errors } = await open(browser, url, viewport, GOOD, 4242 + viewport.width);
  const s0 = await settled(page);
  if (s0.state !== 'playing') { issues.push(`${tag}: ${GOOD} did not boot to Question 1 (${s0.state}), so it is not a date both builds deal whole`); await ctx.close(); return null; }
  const c = { deals: 0, errorCards: 0, notUnlimited: 0, stuck: 0, jumps: 0, sideways: 0 };
  let shotError = false;
  for (let n = 0; n < DEALS; n++) {
    const r = await page.evaluate(DEAL);
    c.deals += 1;
    if (!r.unlimited) c.notUnlimited += 1;
    if (r.state === 'error') c.errorCards += 1;
    if (r.state === 'boot') c.stuck += 1;
    if (r.scrollY !== s0.scrollY) c.jumps += 1;
    if (r.sideways) c.sideways += 1;
    if (r.state === 'error' && !shotError) { shotError = true; await page.screenshot({ path: path.join(OUT, `${tag}-error.png`) }); }
    if (n === 0 && r.state === 'playing') await page.screenshot({ path: path.join(OUT, `${tag}-question.png`) });
  }
  say(`(b) ${tag} on ${GOOD}: ${JSON.stringify(c)}${errors.length ? `; page errors ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
  return c;
}

/* the base build, served the way the host serves it, on its own port */
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', BASE_DIST, '4174'], { stdio: 'ignore' });
const up = async u => { for (let i = 0; i < 60; i++) { try { if ((await fetch(`${u}/sports-millionaire`)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 250)); } return false; };
if (!(await up(BASE_URL)) || !(await up(HEAD))) { server.kill(); couldNot(`a build is not being served (base ${BASE_URL}, head ${HEAD})`); }
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const BUILDS = [['base', BASE_URL], ['head', HEAD]];
const counts = {};
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) for (const [build, url] of BUILDS) await walkDead(browser, build, url, vp);
  for (const vp of VIEWPORTS) for (const [build, url] of BUILDS) counts[`${build}-${vp.width}`] = await walkDeals(browser, build, url, vp);
} catch (e) {
  issues.push(`the walk threw ${String(e.message || e).split('\n')[0]}`);
}
await browser.close();
server.kill();
for (const vp of VIEWPORTS) {
  const b = counts[`base-${vp.width}`], h = counts[`head-${vp.width}`];
  if (!b || !h) continue;
  if (b.errorCards === 0) controlMissed.push(`base-b-${vp.width}: no error card in ${b.deals} Unlimited deals`);
  if (h.errorCards > 0) issues.push(`head-b-${vp.width}: ${h.errorCards} error cards in ${h.deals} Unlimited deals`);
  if (h.stuck > 0 || h.notUnlimited > 0) issues.push(`head-b-${vp.width}: ${h.stuck} deals never settled, ${h.notUnlimited} never left the daily`);
  if (vp.width === 390 && (h.jumps > 0 || h.sideways > 0)) issues.push(`head-b-390: the page jumped on ${h.jumps} deals and scrolled sideways on ${h.sideways}`);
}
for (const k of ['base-390', 'head-390', 'base-1280', 'head-1280']) if (!counts[k]) issues.push(`${k}: the Unlimited deals did not run`);
fs.writeFileSync(path.join(OUT, 'walk1573-log.txt'), [...lines, '', 'ISSUES:', ...issues, '', 'CONTROL MISSED:', ...controlMissed].join('\n') + '\n');
if (issues.length) console.log('ISSUES:\n' + issues.join('\n'));
if (controlMissed.length) console.log('CONTROL MISSED:\n' + controlMissed.join('\n'));
const errs = Object.entries(counts).map(([k, v]) => `${k} ${v ? `${v.errorCards} of ${v.deals}` : 'not run'}`).join(', ');
const code = issues.length ? 1 : controlMissed.length ? 3 : 0;
console.log(`walk1573: ${code === 0 ? 'green' : code === 1 ? 'RED' : 'CONTROL DID NOT FIRE'}; (a) on ${DEAD}, (b) error cards ${errs}`);
process.exit(code);

// Reviewer walk (pools, Release AT): Dart Draft and Stat Detective, a full round each at 390x844 and 1280x900.
// Every database answer comes from a local fixture; supabase.co is never reached and no report is ever submitted.
// BASE = the served build, RC_OUT = where screenshots and evidence.json go.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- the Dart Draft fixture: the committed pull, shaped as simDartDraftPool shapes it ---------- */
const alpha = JSON.parse(read('scripts/data/alphabetSprintPool.json')).rows;
const auction = new Map(JSON.parse(read('scripts/data/auctionMarketRows.json')).map(r => [r.player_name, r]));
const stock = JSON.parse(read('scripts/data/stockMarketPools.json'));
const col = name => stock.columns.indexOf(name);
const stockByName = new Map();
for (const rows of Object.values(stock.pools)) for (const r of rows) {
  const prev = stockByName.get(r[col('player_name')]);
  if (!prev || r[col('year')] > prev[col('year')]) stockByName.set(r[col('player_name')], r);
}
const hash01 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) / 4294967296; };
const known = [];
for (const r of alpha) {
  const a = auction.get(r.player_name), s = stockByName.get(r.player_name);
  if (a) known.push({ position: a.position, age: a.age });
  else if (s) known.push({ position: s[col('position')], age: s[col('age')] + (2026 - s[col('year')]) });
}
const drawFrom = (list, u) => list[Math.min(list.length - 1, Math.floor(u * list.length))];
const knownPositions = known.map(k => k.position).sort();
const knownAges = known.map(k => k.age).sort((x, y) => x - y);
const MARKET = alpha.map((r, i) => {
  const a = auction.get(r.player_name), s = stockByName.get(r.player_name);
  let position, age, goals = 0, assists = 0;
  if (a) ({ position, age, goals, assists } = a);
  else if (s) { position = s[col('position')]; age = s[col('age')] + (2026 - s[col('year')]); }
  else { position = drawFrom(knownPositions, hash01('p:' + r.player_name)); age = drawFrom(knownAges, hash01('a:' + r.player_name)); }
  return { id: i + 1, year: 2026, player_name: r.player_name, position, age, nationality: r.nationality, club: r.club, market_value_usd: r.market_value_usd, goals, assists };
});
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const marketSorted = rows => [...rows].sort((x, y) => y.market_value_usd - x.market_value_usd || cmp(x.player_name, y.player_name) || x.id - y.id);

/* ---------- the Stat Detective fixture: fictional rows only ---------- */
const nbaRow = (id, name, star, team = 'BOS', season = '1994-95') => ({ id, season, player_name: name, position: 'PG', team, minutes: 2200, pts: star ? 2000 : 800, trb: star ? 600 : 300, ast: star ? 500 : 200, stl: 50, blk: 10 });
const NBA = [];
for (let i = 0; i < 520; i++) NBA.push(nbaRow(i + 1, `Fixture Star ${i}`, true));
for (let i = 0; i < 2300; i++) NBA.push(nbaRow(10000 + i, `Fixture Rotation ${i}`, false, i % 2 ? 'DEN' : 'BOS'));
NBA.push(nbaRow(500001, 'Fixture Guess One', false, 'BOS'), nbaRow(500002, 'Fixture Guess Two', false, 'DEN'), nbaRow(500003, 'Fixture Guess Three', false, 'DEN'));
// The case: two 500 minute seasons (1989-90 LAL, 1995-96 BOS) and a short last stint (2000-01 CHI, 80 minutes).
NBA.push(nbaRow(999998, 'Fixture Case Anchor', true, 'LAL', '1989-90'), nbaRow(999999, 'Fixture Case Anchor', true, 'BOS', '1995-96'));
NBA.push({ ...nbaRow(1000000, 'Fixture Case Anchor', false, 'CHI', '2000-01'), minutes: 80 });
NBA.push(nbaRow(999990, 'Fixture Second Case', true, 'DEN', '1997-98'));
for (const [i, w] of ['Able', 'Baker', 'Charlie', 'Dog', 'Easy'].entries()) NBA.push(nbaRow(500010 + i, 'Fixture Decoy ' + w, false, 'DEN', '1993-94'));
const SPANS = [];
const spanNames = new Map();
for (const r of NBA) if (!spanNames.has(r.player_name)) spanNames.set(r.player_name, r);
for (const [name, r] of spanNames) {
  if (name === 'Fixture Case Anchor') SPANS.push({ player_name: name, first_season: '1989-90', last_season: '2000-01', cohort: 1967, rows_500: 2, teams: 'LAL,BOS,CHI' });
  else if (name === 'Fixture Guess One') SPANS.push({ player_name: name, first_season: '1988-89', last_season: '1999-00', cohort: 1966, rows_500: 1, teams: 'BOS,NYK' });
  else if (name === 'Fixture Guess Three') { /* no row in the view on purpose: his span must read as not on file */ }
  else SPANS.push({ player_name: name, first_season: r.season, last_season: r.season, cohort: 1970, rows_500: 1, teams: r.team });
}
SPANS.sort((a, b) => cmp(a.player_name, b.player_name) || a.cohort - b.cohort);

/* ---------- the real map code in Node, to aim the darts and to check the tiles against the rule ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pools-walk-'));
const fwd = p => p.split(path.sep).join('/');
const STUB = path.join(tmp, 'client.ts');
fs.writeFileSync(STUB, `
const state: any = (globalThis as any).__DART__;
export const SUPABASE_URL = 'fixture'; export const SUPABASE_PUBLISHABLE_KEY = 'fixture';
export const supabase: any = { from: () => {
  let rows: any[] = state.rows; let offset = 0; let limit: number | null = null; const orders: [string, number][] = [];
  const q: any = {
    select: () => q,
    eq: (c: string, v: any) => { rows = rows.filter(r => r[c] === v); return q; },
    not: (c: string) => { rows = rows.filter(r => r[c] != null); return q; },
    in: (c: string, vs: any[]) => { rows = rows.filter(r => vs.includes(r[c])); return q; },
    order: (c: string, o?: { ascending?: boolean }) => { orders.push([c, o && o.ascending === false ? -1 : 1]); return q; },
    limit: (n: number) => { limit = n; return q; },
    range: (a: number, z: number) => { offset = a; limit = z - a + 1; return q; },
    then: (ok: any, bad: any) => {
      const sorted = [...rows].sort((x, y) => { for (const [c, d] of orders) { if (x[c] < y[c]) return -d; if (x[c] > y[c]) return d; } return 0; });
      return Promise.resolve({ data: sorted.slice(offset, limit == null ? undefined : offset + limit), error: null }).then(ok, bad);
    },
  };
  return q;
} };
`);
globalThis.__DART__ = { rows: MARKET };
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * as draft from '${fwd(path.join(ROOT, 'src/lib/dartDraft.ts'))}';\nexport * as map from '${fwd(path.join(ROOT, 'src/lib/dartMap.ts'))}';\nexport { playerRating, LEGENDS } from '${fwd(path.join(ROOT, 'src/lib/squadDeal.ts'))}';\nexport { GEO_COUNTRIES } from '${fwd(path.join(ROOT, 'src/data/worldMapGeo.ts'))}';\n`);
const bundle = path.join(tmp, 'bundle.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', absWorkingDir: ROOT,
  alias: { '@/integrations/supabase/client': STUB, '@': path.join(ROOT, 'src') } });
const lib = await import(pathToFileURL(bundle).href);
const { draft: D, map: M } = lib;
const POOL = (await D.fetchDartDraftPool()).current;
const rate = p => p.fixedOverall ?? lib.playerRating(p);
const byName = new Map(POOL.map(p => [p.name, p]));

const evidence = { base: BASE, poolSize: POOL.length, fixtureRows: MARKET.length, runs: [] };
const SEED = 500000000; // Math.random is held at 0.5 while a game starts
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
const inList = v => (v ? v.slice(v.indexOf('(') + 1, v.lastIndexOf(')')).split(',').map(x => x.split('"').join('')) : null);

function pointIn(country, box, zones) {
  const ok = (x, y) => { const h = M.resolveMapThrow(x, y, zones); return h.kind === 'country' && h.country.iso === country.iso; };
  if (country.cx > box.x && country.cx < box.x + box.w && country.cy > box.y && country.cy < box.y + box.h && ok(country.cx, country.cy)) return { x: country.cx, y: country.cy };
  for (let y = box.y + 2; y < box.y + box.h - 2; y += 1) for (let x = box.x + 2; x < box.x + box.w - 2; x += 1) if (ok(x, y)) return { x, y };
  return null;
}
const PLAN = [['country', 'fr'], ['zone', 'legend'], ['country', 'br'], ['zone', 'wonderkid'], ['country', 'ma'], ['zone', 'legend'], ['zone', 'wildcard'], ['zone', 'mystery'], ['zone', 'wonderkid'], ['country', 'ar'], ['zone', 'wildcard']];

async function newContext(browser, width, height, reduce) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const log = { requests: [], writes: [], completions: [], errors: [] };
  await context.addInitScript(() => {
    try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* storage off */ }
    let a = 20261010;
    const prng = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.__rand = null;
    Math.random = () => (window.__rand == null ? prng() : window.__rand);
    if (location.pathname !== '/dart-draft') return;
    let now = 0, next = 0; const callbacks = new Map();
    Object.defineProperty(performance, 'now', { value: () => now });
    window.requestAnimationFrame = callback => { callbacks.set(++next, callback); return next; };
    window.cancelAnimationFrame = id => callbacks.delete(id);
    window.__advance = delta => { now += delta; const run = [...callbacks.values()]; callbacks.clear(); run.forEach(callback => callback(now)); };
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(BASE).origin) return route.continue();
    if (url.hostname.endsWith('flagcdn.com')) return route.continue().catch(() => {});
    if (!url.hostname.endsWith('supabase.co')) return route.abort();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
    const table = url.pathname.split('/').at(-1);
    if (request.method() !== 'GET') { (table === 'game_completions' ? log.completions : log.writes).push({ method: request.method(), path: url.pathname }); return route.abort(); }
    const q = url.searchParams;
    const offset = Number(q.get('offset') || 0), limit = Number(q.get('limit') || 1000);
    let rows = null;
    if (table === 'player_market_values') {
      const nations = inList(q.get('nationality')), positions = inList(q.get('position'));
      rows = marketSorted(MARKET.filter(r => (!q.has('year') || q.get('year') === `eq.${r.year}`) && (!q.has('age') || r.age != null) && (!nations || nations.includes(r.nationality)) && (!positions || positions.includes(r.position))));
    } else if (table === 'bref_nba_player_seasons') {
      const floor = Number((q.get('minutes') || 'gte.0').split('.').at(-1));
      rows = NBA.filter(r => r.minutes >= floor).sort((x, y) => y.id - x.id);
    } else if (table === 'bref_nba_career_spans') rows = SPANS;
    log.requests.push({ table, offset, limit, nationality: q.get('nationality'), position: q.get('position'), order: q.get('order'), served: rows ? rows.slice(offset, offset + limit).length : null });
    if (!rows) return route.abort();
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(rows.slice(offset, offset + limit)) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => log.errors.push(String(error).slice(0, 300)));
  return { context, page, log };
}
const shot = (page, name, fullPage = false) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage });
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const tilesOf = page => page.evaluate(() => [...document.querySelectorAll('div.grid.max-w-xl > button')].map(b => ({
  name: b.querySelector('.font-bold.truncate')?.textContent ?? '', sub: b.querySelector('.text-xs.truncate')?.textContent ?? '',
  rating: Number(b.querySelector('.text-lg.font-black')?.textContent ?? 0), top: Math.round(b.getBoundingClientRect().top), h: Math.round(b.getBoundingClientRect().height) })));

async function dartRound(browser, width, height, reduce, topic, throws, shots) {
  const tag = `${width}`;
  const { context, page, log } = await newContext(browser, width, height, reduce);
  const run = { game: 'dart-draft', viewport: `${width}x${height}`, reducedMotion: reduce, topic, throws: [], notes: [] };
  evidence.runs.push(run);
  try {
    await page.goto(`${BASE}/dart-draft`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: new RegExp(topic) }).waitFor({ timeout: 30000 });
    if (shots.includes('intro')) await shot(page, `dart-${tag}-${topic === 'Current Stars' ? '' : 'alltime-'}0-intro`);
    await page.evaluate(() => { window.__rand = 0.5; });
    await page.getByRole('button', { name: new RegExp(topic) }).click();
    await page.getByRole('button', { name: /throw$/ }).first().waitFor({ timeout: 30000 });
    const used = new Set();
    const legendsPlus = topic === 'All-Time';
    for (let t = 0; t < throws; t++) {
      const slot = M.DART_SLOTS[t];
      const view = M.ROUND_VIEWS[Math.min(t, M.ROUND_VIEWS.length - 1)], box = M.viewBoxOf(view);
      const zones = M.rollZones(view, t, SEED);
      let [kind, what] = PLAN[t], target = null;
      if (kind === 'zone') { const z = zones.find(zz => zz.kind === what); if (z) target = { x: z.x, y: z.y }; else { kind = 'country'; what = 'fr'; run.notes.push(`throw ${t + 1}: no ${PLAN[t][1]} zone was placed, aimed at a country`); } }
      if (kind === 'country') { const c = lib.GEO_COUNTRIES.find(g => g.iso === what); target = (c && pointIn(c, box, zones)) || pointIn(lib.GEO_COUNTRIES.find(g => g.iso === 'fr'), box, zones) || pointIn(lib.GEO_COUNTRIES.find(g => g.iso === 'br'), box, zones); }
      const rec = { throw: t + 1, slot: slot.label, view, aim: `${kind} ${what}`, zonesOnMap: zones.map(z => z.kind) };
      run.throws.push(rec);
      if (!target) { rec.error = 'no point to aim at'; break; }
      await page.evaluate(() => { window.__rand = 0.5; });
      await page.getByRole('button', { name: /throw$/ }).first().click();
      await page.getByRole('button', { name: /LOCK LEFT-RIGHT/ }).waitFor({ timeout: 10000 });
      const speed = Math.min(0.0021, 0.0011 + t * 0.00009);
      await page.evaluate(d => window.__advance(d), ((target.x - box.x) / box.w) / speed);
      if (t === 0 && shots.includes('aim')) await shot(page, `dart-${tag}-0-aim`);
      await page.keyboard.press('Space');
      await page.getByRole('button', { name: /^THROW$/ }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(60);
      await page.evaluate(d => window.__advance(d), ((target.y - box.y) / box.h) / speed);
      await page.keyboard.press('Space');
      await page.evaluate(() => { window.__rand = null; });
      await page.waitForFunction(() => document.querySelectorAll('div.grid.max-w-xl > button').length > 0 || [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('trialist')), null, { timeout: 20000, polling: 100 });
      for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__advance(16)); await page.waitForTimeout(30); }
      rec.title = await page.locator('main h2').first().innerText().catch(() => '');
      rec.caption = await page.locator('main h2 + p').first().innerText().catch(() => '');
      const tiles = await tilesOf(page);
      rec.tiles = tiles.map(x => `${x.name} | ${x.sub} | ${x.rating}`);
      rec.distinct = new Set(tiles.map(x => x.name.toLowerCase())).size === tiles.length;
      rec.usedOffered = tiles.filter(x => used.has(x.name.toLowerCase())).map(x => x.name);
      rec.overflowPx = await overflow(page);
      rec.tilesBelowFold = tiles.filter(x => x.top + x.h > height).length;
      rec.scrollY = await page.evaluate(() => Math.round(scrollY));
      // The rule, checked against the pool the page was handed: the best three who fit the slot and are unused come first.
      const fits = p => slot.allowed.includes(p.position) && !used.has(p.name.toLowerCase());
      const zone = rec.title.includes('WILDCARD') ? 'wildcard' : rec.title.includes('WONDERKID') ? 'wonderkid' : rec.title.includes('LEGEND') ? 'legend' : rec.title.includes('MYSTERY') ? 'mystery' : null;
      if (zone === 'wildcard' || zone === 'wonderkid' || zone === 'legend') {
        const src = zone === 'legend' ? lib.LEGENDS : (legendsPlus ? [...lib.LEGENDS, ...POOL].sort((a, b) => b.marketValue - a.marketValue) : POOL).filter(p => zone !== 'wonderkid' || (p.age > 0 && p.age <= 21));
        const seen = new Set();
        const eligible = src.filter(p => { const k = p.name.toLowerCase(); if (!fits(p) || seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => lib.playerRating(b) - lib.playerRating(a));
        rec.eligible = eligible.length;
        rec.bestThreeExpected = eligible.slice(0, 3).map(p => p.name);
        rec.bestThreeFirst = rec.bestThreeExpected.join('|') === tiles.slice(0, 3).map(x => x.name).join('|');
        rec.oldFixed = eligible.slice(0, 8).map(p => p.name);
        rec.outsideOldFixed = tiles.filter(x => !rec.oldFixed.includes(x.name)).length;
        rec.allEligible = tiles.every(x => eligible.some(p => p.name === x.name));
        rec.lowestRatingShown = Math.min(...tiles.map(x => x.rating));
      }
      const wanted = shots.includes(`t${t + 1}`);
      if (wanted) await shot(page, `dart-${tag}-${topic === 'Current Stars' ? '' : 'alltime-'}t${t + 1}-${zone || 'country'}`);
      if (!tiles.length) { rec.ocean = true; await page.getByRole('button', { name: /trialist/ }).click(); continue; }
      const pickIndex = t % 3 === 2 ? Math.min(4, tiles.length - 1) : 0;
      rec.picked = tiles[pickIndex].name; used.add(tiles[pickIndex].name.toLowerCase());
      await page.locator('div.grid.max-w-xl > button').nth(pickIndex).click();
      if (t < 10) await page.getByRole('button', { name: /throw$/ }).first().waitFor({ timeout: 10000 }).catch(() => {});
    }
    if (throws === 11) {
      await page.getByText(/^Grade /).waitFor({ timeout: 15000 });
      run.result = await page.locator('main').innerText().then(x => x.split('\n').filter(Boolean).slice(0, 8).join(' / '));
      run.doneOverflowPx = await overflow(page);
      if (shots.includes('done')) await shot(page, `dart-${tag}-done`, true);
    }
    const market = log.requests.filter(r => r.table === 'player_market_values');
    run.poolReads = market.filter(r => !r.nationality).map(r => `${r.offset}+${r.limit} served ${r.served} order ${r.order}`);
    run.countryReads = market.filter(r => r.nationality).map(r => `${r.nationality.slice(0, 40)} ${r.position ? 'at position ' : ''}${r.offset}+${r.limit} served ${r.served}`);
  } catch (error) { run.error = String(error.stack || error).slice(0, 900); await shot(page, `dart-${tag}-error`).catch(() => {}); }
  run.pageErrors = log.errors; run.writes = log.writes;
  await context.close();
}
const SCOPE_START = 'Career span and Career franchises count every NBA season on file';
async function statRound(browser, width, height, reduce, lose) {
  const tag = `${width}`;
  const { context, page, log } = await newContext(browser, width, height, reduce);
  const run = { game: 'stat-detective', viewport: `${width}x${height}`, reducedMotion: reduce, steps: {}, notes: [] };
  evidence.runs.push(run);
  const box = async sel => page.locator(sel).first().evaluate(el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; }).catch(() => null);
  const clues = () => page.locator('[data-stat-clue]').evaluateAll(els => els.map(el => el.textContent));
  const guess = async name => {
    const input = page.getByRole('textbox', { name: 'Guess the mystery player' });
    await input.fill(name);
    await page.locator('ul li button', { hasText: name }).first().click();
    await page.waitForTimeout(120);
  };
  try {
    await page.goto(`${BASE}/stat-detective`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Stars/ }).waitFor({ timeout: 40000 });
    run.steps.pick = {
      scopeShown: await page.getByText(SCOPE_START).first().isVisible(),
      scopeText: await page.getByText(SCOPE_START).first().innerText(),
      starsButton: await box('main button:has-text("Stars")'), deepButton: await box('main button:has-text("Deep Cuts")'),
      rulesCard: await box('main .bg-card.rounded-2xl'), viewportHeight: height, overflowPx: await overflow(page),
      caseFiles: await page.locator('main button:has-text("case files")').allInnerTexts(),
    };
    // What the same screen measured before the scope line: hide that one paragraph and measure again.
    run.steps.pick.starsButtonWithoutScope = await page.evaluate(start => {
      const p = [...document.querySelectorAll('main .bg-card p')].find(el => (el.textContent || '').startsWith(start));
      if (!p) return null; p.style.display = 'none';
      const b = [...document.querySelectorAll('main button')].find(el => (el.textContent || '').startsWith('Stars')).getBoundingClientRect();
      p.style.display = ''; return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
    }, SCOPE_START);
    await shot(page, `stat-${tag}-1-pick`);
    await page.getByRole('button', { name: 'How to play' }).click();
    const dialog = page.getByRole('dialog', { name: 'Stat Detective rules' });
    await dialog.waitFor({ timeout: 5000 });
    run.steps.help = { scopeShown: await dialog.getByText(SCOPE_START).isVisible(), box: await box('[role="dialog"]'), text: (await dialog.innerText()).slice(0, 900) };
    if (width > 1000 || !lose) await shot(page, `stat-${tag}-2-help`);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    await page.evaluate(() => { window.__rand = 0; });
    await page.getByRole('button', { name: /^Stars/ }).click();
    await page.getByRole('textbox', { name: 'Guess the mystery player' }).waitFor({ timeout: 10000 });
    run.steps.caseStart = {
      input: await box('input[aria-label="Guess the mystery player"]'), cluesBox: await box('main .bg-card:has([data-stat-profile-scope])'),
      scopeInClues: await page.locator('[data-stat-profile-scope]').innerText().catch(() => null), scopeBox: await box('[data-stat-profile-scope]'),
      viewportHeight: height, scrollY: await page.evaluate(() => Math.round(scrollY)), nameVisible: await page.getByText('Fixture Case Anchor', { exact: true }).count(),
    };
    await shot(page, `stat-${tag}-3-case`);
    await page.getByRole('textbox', { name: 'Guess the mystery player' }).fill('Fixture Guess');
    await page.locator('ul li button').first().waitFor({ timeout: 5000 });
    run.steps.suggest = { options: await page.locator('ul li button').allInnerTexts(), titles: await page.locator('ul li button span[title]').evaluateAll(els => els.map(el => el.getAttribute('title'))) };
    await shot(page, `stat-${tag}-4-suggest`);
    const wrong = ['Fixture Guess One', 'Fixture Guess Two', 'Fixture Guess Three', 'Fixture Decoy Able', 'Fixture Decoy Baker', 'Fixture Decoy Charlie', 'Fixture Decoy Dog', 'Fixture Decoy Easy'];
    run.steps.misses = [];
    for (let i = 0; i < (lose ? 8 : 6); i++) {
      await guess(wrong[i]);
      run.steps.misses.push({ guess: wrong[i], clues: await clues(), chip: await page.locator(`[data-stat-guess="${wrong[i]}"]`).innerText().catch(() => '') });
      if (i === 0) await shot(page, `stat-${tag}-5-miss1`);
    }
    run.steps.afterMisses = { overflowPx: await overflow(page), scopeStillShown: await page.locator('[data-stat-profile-scope]').count(), pageHeight: await page.evaluate(() => document.documentElement.scrollHeight) };
    if (!lose) {
      await shot(page, `stat-${tag}-6-allclues`, true);
      // The report flow, up to the button and no further: nothing is submitted.
      await page.getByRole('button', { name: 'Report', exact: true }).click();
      await page.getByRole('button', { name: 'Other', exact: true }).click();
      await page.getByRole('textbox', { name: 'Describe what is wrong with this question' }).fill('Reviewer walk, never sent');
      run.steps.report = { dialogText: (await page.getByRole('dialog').innerText()).slice(0, 400), answerInDialog: (await page.getByRole('dialog').innerText()).includes('Fixture Case Anchor'), submitEnabled: await page.getByRole('button', { name: 'Submit Report', exact: true }).isEnabled(), box: await box('[role="dialog"]') };
      await shot(page, `stat-${tag}-7-report`);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5000 });
      await guess('Fixture Case Anchor');
    }
    await page.locator('[data-stat-result]').waitFor({ timeout: 5000 });
    run.steps.result = { kind: await page.locator('[data-stat-result]').getAttribute('data-stat-result'), text: (await page.locator('[data-stat-result]').innerText()).split('\n').filter(Boolean).slice(0, 5).join(' / '), overflowPx: await overflow(page) };
    await shot(page, `stat-${tag}-8-${lose ? 'lost' : 'won'}`);
    run.requests = { seasons: log.requests.filter(r => r.table === 'bref_nba_player_seasons').length, spans: log.requests.filter(r => r.table === 'bref_nba_career_spans').map(r => `${r.offset}+${r.limit} served ${r.served} order ${r.order}`), other: [...new Set(log.requests.filter(r => !['bref_nba_player_seasons', 'bref_nba_career_spans'].includes(r.table)).map(r => r.table))] };
  } catch (error) { run.error = String(error.stack || error).slice(0, 900); await shot(page, `stat-${tag}-error`, true).catch(() => {}); }
  run.pageErrors = log.errors; run.writes = log.writes;
  await context.close();
}

let browser, failed = 0;
try {
  if (process.env.WALK_DRY) { const z = [0,1,3,6,7,10].map(t => t + ':' + M.rollZones(M.ROUND_VIEWS[t], t, SEED).map(x => x.kind + '@' + Math.round(x.x) + ',' + Math.round(x.y)).join('+')); console.log('dry', POOL.length, SPANS.length, NBA.length, z.join(' | ')); for (const iso of ['fr','br','ma','ar']) { const c = lib.GEO_COUNTRIES.find(g => g.iso === iso); const t = iso === 'fr' ? 0 : iso === 'br' ? 2 : iso === 'ma' ? 4 : 9; console.log(iso, JSON.stringify(pointIn(c, M.viewBoxOf(M.ROUND_VIEWS[t]), M.rollZones(M.ROUND_VIEWS[t], t, SEED)))); } process.exit(0); }
  const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
  browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  await dartRound(browser, 390, 844, true, 'Current Stars', 11, ['intro', 'aim', 't1', 't2', 't4', 't7', 'done']);
  await dartRound(browser, 1280, 900, false, 'Current Stars', 11, ['t2', 't7', 't8', 'done']);
  await dartRound(browser, 1280, 900, false, 'All-Time', 2, ['t1', 't2']);
  if (process.env.WALK_ONLY !== 'dart') await statRound(browser, 390, 844, true, false);
  if (process.env.WALK_ONLY !== 'dart') await statRound(browser, 1280, 900, false, false);
  if (process.env.WALK_ONLY !== 'dart') await statRound(browser, 390, 844, false, true);
} finally {
  if (browser) await browser.close();
  fs.writeFileSync(path.join(OUT, 'walk-evidence.json'), JSON.stringify(evidence, null, 1));
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* the OS clears it */ }
}
for (const run of evidence.runs) {
  if (run.error) { failed += 1; console.log(`ERROR ${run.game} ${run.viewport}: ${run.error.split('\n')[0]}`); }
  if (run.pageErrors.length) { failed += 1; console.log(`PAGE ERRORS ${run.game} ${run.viewport}: ${run.pageErrors.join(' ; ')}`); }
  if (run.writes.length) { failed += 1; console.log(`WRITES ATTEMPTED ${run.game} ${run.viewport}: ${JSON.stringify(run.writes)}`); }
}
console.log(`pools walk: ${evidence.runs.length} runs, ${failed} with an error. Evidence and screenshots in ${OUT}`);
process.exit(failed ? 1 : 0);

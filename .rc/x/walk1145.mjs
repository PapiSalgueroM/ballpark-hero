/* Round 1145 browser walk (runner only, sent as .rc/x/walk1145.mjs): the two pages on a served build at phone
   width, with every database request answered from a fixture inside this script. Nothing reaches the network:
   any other request to the database host is aborted. Writes screenshots and a JSON of what it saw to $RC_OUT. */
import pw from '../../scripts/lib/playwrightLoader.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const seen = { stat: {}, dart: {}, errors: [] };
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

/* ---------- Stat Detective fixture: the same shape the vitest file uses ---------- */
const seasonOf = y => `${y - 1}-${String(y % 100).padStart(2, '0')}`;
const line = (kind, minutes) => kind === 'star' ? { minutes, pts: 2100, trb: 400, ast: 200, stl: 90, blk: 40 } : kind === 'solid' ? { minutes, pts: 1200, trb: 300, ast: 150, stl: 60, blk: 30 } : { minutes, pts: 90, trb: 40, ast: 20, stl: 5, blk: 3 };
let id = 1;
const row = (name, y, kind, minutes, team = 'CHI', position = 'PF') => ({ id: id++, season: seasonOf(y), player_name: name, position, team, ...line(kind, minutes) });
const seasons = [];
for (let i = 0; i < 900; i++) {
  const name = `Fixture Filler ${String(i).padStart(4, '0')}`;
  seasons.push(row(name, 1991, i < 620 ? 'star' : 'solid', 2500, 'BOS', 'SG'));
  for (const y of [1992, 1993, 1994]) seasons.push(row(name, y, 'solid', 2500, 'BOS', 'SG'));
}
const FADED = 'Fixture Pivot Elm';
for (let y = 1990; y <= 1996; y++) seasons.push(row(FADED, y, 'solid', 2400, 'WSB'));
for (let y = 1997; y <= 2001; y++) seasons.push(row(FADED, y, 'bench', 240, 'BOS'));
const spanMap = new Map();
for (const r of seasons) {
  const have = spanMap.get(r.player_name);
  if (!have) spanMap.set(r.player_name, { player_name: r.player_name, first_season: r.season, last_season: r.season });
  else { if (r.season < have.first_season) have.first_season = r.season; if (r.season > have.last_season) have.last_season = r.season; }
}
const spans = [...spanMap.values()].sort((a, b) => (a.player_name < b.player_name ? -1 : 1));
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const page1000 = (rows, u) => { const o = Number(u.searchParams.get('offset') || 0); const l = Number(u.searchParams.get('limit') || 1000); return rows.slice(o, o + l); };

/* ---------- Dart Draft fixture: the saved pull of the top 600 of 2026, all eight columns ---------- */
const market = JSON.parse(fs.readFileSync('scripts/data/auctionMarketRows.json', 'utf8')).sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : 1));
const inList = v => { const inner = v.slice(4, -1); return (inner.match(/"(?:[^"\\]|\\.)*"|[^,]+/g) || []).map(s => (s.startsWith('"') ? JSON.parse(s) : s)); };

const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
async function open(spansMode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const state = { spansMode, poolAsked: [], countryAsked: 0, spanAsked: 0 };
  page.on('pageerror', e => seen.errors.push(String(e)));
  await ctx.route(/supabase\.co/, async route => {
    const u = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.abort();
    if (u.pathname.endsWith('/rest/v1/bref_nba_player_seasons')) return json(route, page1000([...seasons].filter(r => r.minutes >= 500).sort((a, b) => b.id - a.id), u));
    if (u.pathname.endsWith('/rest/v1/bref_nba_career_spans')) {
      state.spanAsked += 1;
      if (state.spansMode === 'missing') return json(route, { code: 'PGRST205', message: 'Could not find the table public.bref_nba_career_spans in the schema cache' }, 404);
      return json(route, page1000(spans, u));
    }
    if (u.pathname.endsWith('/rest/v1/player_market_values')) {
      let rows = market;
      if (u.searchParams.has('age')) { state.poolAsked.push(`${u.searchParams.get('offset')}+${u.searchParams.get('limit')}`); return json(route, page1000(rows, u)); }
      state.countryAsked += 1;
      const nations = inList(u.searchParams.get('nationality'));
      rows = rows.filter(r => nations.includes(r.nationality));
      if (u.searchParams.has('position')) { const ps = inList(u.searchParams.get('position')); rows = rows.filter(r => ps.includes(r.position)); }
      return json(route, rows.slice(0, Number(u.searchParams.get('limit') || 1000)));
    }
    return route.abort();
  });
  return { ctx, page, state };
}

console.log('A) Stat Detective, spans readable');
{
  const { ctx, page, state } = await open('ok');
  await page.goto(`${BASE}/stat-detective`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Stars/ }).click({ timeout: 30000 });
  const box = page.getByRole('textbox', { name: 'Guess the mystery player' });
  await box.fill('Fixture Pivot');
  const option = page.getByRole('button', { name: /Fixture Pivot Elm/ });
  await option.waitFor({ timeout: 10000 });
  const optionText = (await option.innerText()).replace(/\s+/g, ' ').trim();
  seen.stat.option = optionText;
  if (optionText === 'Fixture Pivot Elm 1990-2001') ok(`the guess box prints "${optionText}" (his 500 minute seasons alone would read 1990-1996)`); else fail(`the guess box prints "${optionText}", wanted "Fixture Pivot Elm 1990-2001"`);
  await page.screenshot({ path: path.join(OUT, 'stat-guessbox-390.png') });
  await option.click();
  const clue = page.locator('[data-stat-clue="Career span"]');
  await clue.waitFor({ timeout: 10000 });
  seen.stat.clue = (await clue.innerText()).trim();
  if (/^Career span: 1991-1994$/.test(seen.stat.clue)) ok(`after one miss the clue reads "${seen.stat.clue}", the mystery's first and last season`); else fail(`the clue reads "${seen.stat.clue}"`);
  seen.stat.spanRequests = state.spanAsked;
  if (state.spanAsked < 2) fail(`the spans view was asked for ${state.spanAsked} times; it is read in pages`); else ok(`the spans view was read in ${state.spanAsked} requests beside the seasons`);
  await page.screenshot({ path: path.join(OUT, 'stat-clue-390.png') });
  await ctx.close();
}

console.log('B) Stat Detective, the view is not there yet');
{
  const { ctx, page, state } = await open('missing');
  await page.goto(`${BASE}/stat-detective`, { waitUntil: 'domcontentloaded' });
  await page.getByText("Couldn't open the case files right now.").waitFor({ timeout: 30000 });
  const stars = await page.getByRole('button', { name: /^Stars/ }).count();
  if (stars === 0) ok('with the spans view missing the page shows its retry state and no case files'); else fail('the page opened case files without the spans');
  await page.screenshot({ path: path.join(OUT, 'stat-retry-390.png') });
  state.spansMode = 'ok';
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: /^Stars/ }).waitFor({ timeout: 30000 });
  ok('Try again opens the case files once the view answers');
  seen.stat.retry = true;
  await ctx.close();
}

console.log('C) Dart Draft, a whole draft');
{
  const { ctx, page, state } = await open('ok');
  await page.goto(`${BASE}/dart-draft`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Current Stars/ }).click({ timeout: 30000 });
  await page.getByText('Pick the position you throw for').waitFor({ timeout: 30000 });
  seen.dart.poolAsked = [...state.poolAsked].sort();
  if (seen.dart.poolAsked.join(',') === '0+1000,1000+1000') ok('the pool was asked for as two pages: 0+1000 and 1000+1000'); else fail(`the pool was asked for as [${seen.dart.poolAsked.join(', ')}]`);
  const tiles = []; let shot = false; let water = 0;
  for (let t = 0; t < 11; t++) {
    await page.locator('button:has-text("throw")').first().click();
    await page.getByRole('button', { name: /LOCK LEFT-RIGHT/ }).click({ timeout: 10000 });
    await page.waitForTimeout(350 + ((t * 137) % 500));
    await page.getByRole('button', { name: /THROW/ }).click({ timeout: 10000 });
    const choice = page.locator('div.grid.gap-2 > button');
    const trialist = page.getByRole('button', { name: /Take the 40-rated trialist/ });
    await Promise.race([choice.first().waitFor({ timeout: 15000 }), trialist.waitFor({ timeout: 15000 })]);
    if (await trialist.count()) { water += 1; await trialist.click(); }
    else {
      const n = await choice.count(); tiles.push(n);
      if (!shot && n >= 6) { await page.screenshot({ path: path.join(OUT, 'dart-tiles-390.png'), fullPage: true }); shot = true; }
      await choice.first().click();
    }
    await page.waitForTimeout(150);
  }
  await page.getByRole('button', { name: /Throw again/ }).waitFor({ timeout: 20000 });
  seen.dart.tiles = tiles; seen.dart.water = water; seen.dart.countryRequests = state.countryAsked;
  if (tiles.some(n => n > 10)) fail(`a draft panel showed ${Math.max(...tiles)} tiles`);
  ok(`eleven throws: ${water} in the water, tile counts on the others ${tiles.join(', ') || 'none'}; ${state.countryAsked} country requests; the result screen came up`);
  await page.screenshot({ path: path.join(OUT, 'dart-done-390.png') });
  await ctx.close();
}
await browser.close();
if (seen.errors.length) fail(`page errors: ${seen.errors.slice(0, 3).join(' | ')}`);
fs.writeFileSync(path.join(OUT, 'walk1145.json'), JSON.stringify(seen, null, 2));
if (failures) { console.error(`walk1145: ${failures} FAILURE(S)`); process.exit(1); }
console.log('walk1145: green. Stat Detective prints true spans and fails closed without the view; Dart Draft reads two pages and plays a whole draft.');

/* Actual built Player Bingo, fictional REST rows and real birth-year tile placements. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
assert(process.env.SIM_OFFLINE_RECEIPT, 'An offline transport receipt is required');
assert.equal(statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0);

const root = process.cwd();
const build = path.join(root, 'dist');
const distFile = 'player-bingo/index.html';
const documentBody = readFileSync(path.join(build, distFile));
assert.match(documentBody.toString('utf8'), /<div id="dukb-snapshot">/);
assert(process.env.BASE, 'The external local build host is required');
const origin = new URL(process.env.BASE);
const base = origin.origin;
assert.equal(base, 'http://127.0.0.1:4174');
assert.equal(origin.href, base + '/');
const publicUrl = base + '/player-bingo';
const fixtureHost = 'flawuiqbvjobmkfkauhw.supabase.co';
assert(process.env.PLAYER_BINGO_BIRTH_YEAR_BROWSER_OUT, 'A new evidence directory is required');
const out = path.resolve(root, process.env.PLAYER_BINGO_BIRTH_YEAR_BROWSER_OUT);
assert(out.startsWith(root + path.sep), 'Evidence stays in this checkout');
mkdirSync(out);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function retain(file, value) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n');
  writeFileSync(path.join(out, file), body, { flag: 'wx' });
  return { file, bytes: body.length, sha256: sha(body) };
}

const labels = { older: 'Born 1997 to 1999', newer: 'Born 2000 to 2003' };
const ageLabels = ['Born 1996 or earlier', labels.older, labels.newer, 'Born 2004 or later'];
const playerCount = 500;
const targetCount = 240;
const firstAge25Index = 370;
const positions = ['Goalkeeper', 'Centre-Back', 'Right-Back', 'Left-Back', 'Central Midfield', 'Defensive Midfield',
  'Attacking Midfield', 'Left Midfield', 'Right Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward', 'Second Striker'];
const nations = ['Spain', 'France', 'Brazil', 'England', 'Germany', 'Portugal', 'Argentina', 'Italy'];
const clubs = ['Real Madrid', 'FC Barcelona', 'Manchester United', 'Manchester City', 'Liverpool FC',
  'Chelsea FC', 'Arsenal FC', 'Tottenham Hotspur', 'Paris Saint-Germain', 'Bayern Munich',
  'Borussia Dortmund', 'Juventus FC', 'AC Milan', 'Inter Milan', 'Atletico de Madrid'];
const stats = [[10, 10, 40, 10, 1], [25, 5, 50, 0, 0], [10, 0, 29, 2, 0], [0, 15, 45, 8, 0],
  [20, 10, 55, 10, 1], [5, 2, 30, 2, 0], [null, null, null, null, null]];
const market = Array.from({ length: playerCount }, (_, i) => {
  const [goals, assists, matches, yellow_cards, red_cards] = stats[i % stats.length];
  const primary = nations[Math.floor(i / positions.length) % nations.length];
  return { id: i + 1, player_name: 'FixtureBingo' + String(i).padStart(3, '0'),
    nationality: i < targetCount ? primary + ' / Fictional Secondary' : primary,
    position: positions[i % positions.length], club: clubs[Math.floor(i / 7) % clubs.length],
    market_value_usd: [25_000_000, 40_000_000, 75_000_000, 120_000_000][Math.floor(i / 104) % 4],
    age: i < firstAge25Index ? 26 : 25, year: 2026, goals, assists, matches, yellow_cards, red_cards };
});
const names = new Set(market.map(player => player.player_name));
const targets = new Set(market.slice(0, targetCount).map(player => player.player_name));
const journeys = [
  { id: 'jan1-correct', firstDate: '2000-01-01', secondDate: '2000-01-01', country: 'primary', band: 'newer', tap: 'newer', locks: true },
  { id: 'jan27-adjacent', firstDate: null, secondDate: '2000-01-27', country: 'primary', band: 'newer', tap: 'older', locks: false },
  { id: 'dec31-correct', firstDate: null, secondDate: '1999-12-31', country: 'primary', band: 'older', tap: 'older', locks: true },
  { id: 'wrong-country-fallback', firstDate: null, secondDate: '2000-01-27', country: 'secondary', band: 'older', tap: 'older', locks: true },
  { id: 'conflict-fallback', firstDate: '2000-01-27', secondDate: '1999-12-31', country: 'primary', band: 'older', tap: 'older', locks: true },
  { id: 'invalid-fallback', firstDate: null, secondDate: '2000-02-30', country: 'primary', band: 'older', tap: 'older', locks: true },
  { id: 'implausible-fallback', firstDate: null, secondDate: '2004-01-01', country: 'primary', band: 'older', tap: 'older', locks: true },
  { id: 'legacy-fallback', firstDate: null, secondDate: null, country: 'primary', band: 'older', tap: 'older', locks: true },
];
assert.equal(names.size, playerCount);
assert.equal(targets.size, targetCount);
assert(journeys.every(item => item.locks === (item.band === item.tap)));

const neutralSquad = i => ({
  id: i + 1, player_name: 'Fictional squad filler ' + i, world_cup_year: 2018, nationality: 'Fixture Nation', date_of_birth: null,
});
function squadFixture(journey) {
  function matchedPage(date, year, offset) {
    if (!date) return [];
    return market.slice(0, targetCount).map((player, i) => ({
      id: offset + i + 1,
      player_name: ' ' + player.player_name.toLowerCase() + ' ',
      world_cup_year: year,
      nationality: journey.country === 'secondary' ? 'Fictional Secondary' : player.nationality.split('/')[0].toLowerCase(),
      date_of_birth: date,
    }));
  }
  const first = matchedPage(journey.firstDate, 2022, 0);
  const second = matchedPage(journey.secondDate, 2018, 1000);
  return [
    ...first,
    ...Array.from({ length: 1000 - first.length }, (_, i) => neutralSquad(i + first.length)),
    ...second,
    neutralSquad(1000 + second.length),
  ];
}
const squads = new Map(journeys.map(journey => [journey.id, squadFixture(journey)]));

const marketColumns = {
  seed: 'player_name',
  latest: 'player_name,nationality,position,club,market_value_usd,age,year',
  history: 'player_name,nationality,position,club,year,age,market_value_usd,goals,assists,matches,yellow_cards,red_cards',
};
const oldSquadColumns = 'player_name,world_cup_year,nationality';
const fixedSquadColumns = oldSquadColumns + ',date_of_birth';
function projection(query) {
  const columns = (query.get('select') || '').split(',').map(column => column.trim());
  assert(columns.every(Boolean), 'Explicit known column projection');
  return columns;
}
function project(rows, columns) {
  return rows.map(row => Object.fromEntries(columns.map(column => {
    assert(Object.hasOwn(row, column), 'Actual fixture column: ' + column);
    return [column, row[column]];
  })));
}
function requestedRange(query, request) {
  const offset = Number(query.get('offset') || 0);
  const limit = Number(query.get('limit') || 1000);
  const header = request.headers().range;
  if (header) {
    const parsed = /^(?:items=)?(\d+)-(\d+)$/.exec(header);
    assert(parsed, 'Known fixture range header');
    const headerRange = [Number(parsed[1]), Number(parsed[2]) - Number(parsed[1]) + 1];
    if (query.has('offset') || query.has('limit')) assert.deepEqual(headerRange, [offset, limit]);
    else return headerRange;
  }
  assert(Number.isSafeInteger(offset) && offset >= 0 && Number.isSafeInteger(limit) && limit > 0 && limit <= 1000);
  return [offset, limit];
}
function marketRead(query, request) {
  const columns = projection(query);
  const kind = Object.keys(marketColumns).find(key => marketColumns[key] === columns.join(','));
  assert(kind, 'Exact existing market projection');
  const allowed = kind === 'seed' ? ['select', 'year', 'market_value_usd', 'age', 'order', 'limit']
    : kind === 'latest' ? ['select', 'player_name', 'year', 'market_value_usd', 'age', 'order', 'limit']
      : ['select', 'player_name', 'order', 'offset', 'limit'];
  assert([...query.keys()].every(key => allowed.includes(key)), 'Known market query fields');
  assert.equal(query.get('order'), { seed: 'market_value_usd.desc', latest: 'year.desc', history: 'id.asc' }[kind]);
  if (kind !== 'history') {
    assert.deepEqual([query.get('year'), query.get('market_value_usd'), query.get('age')], ['gte.2024', 'gt.0', 'not.is.null']);
  }
  let selected = [];
  if (kind !== 'seed') {
    const match = /^in\.\((.*)\)$/.exec(query.get('player_name') || '');
    assert(match, 'Actual loader uses a bounded name filter');
    selected = match[1].split(',').map(name => name.replace(/^"|"$/g, ''));
    assert.equal(new Set(selected).size, selected.length);
    assert(selected.length > 0 && selected.length <= (kind === 'latest' ? 40 : 80));
    assert(selected.every(name => names.has(name)));
  }
  const wanted = new Set(selected);
  const rows = kind === 'seed' ? [...market].sort((a, b) => b.market_value_usd - a.market_value_usd)
    : market.filter(player => wanted.has(player.player_name));
  const [offset, limit] = requestedRange(query, request);
  assert.deepEqual([offset, limit], [0, 1000], 'One page covers each fictional market chunk');
  return { kind, columns, selected, offset, limit, data: project(rows.slice(offset, offset + limit), columns) };
}
function squadRead(query, request, journey) {
  const columns = projection(query);
  assert([oldSquadColumns, fixedSquadColumns].includes(columns.join(',')), 'Only the exact original or DOB-extended squad projection');
  assert([...query.keys()].every(key => ['select', 'world_cup_year', 'order', 'offset', 'limit'].includes(key)));
  assert.deepEqual([query.get('world_cup_year'), query.get('order')], ['gte.2010', 'id.asc']);
  const [offset, limit] = requestedRange(query, request);
  assert([0, 1000].includes(offset) && limit === 1000);
  return { columns, offset, limit, data: project(squads.get(journey.id).slice(offset, offset + limit), columns) };
}

const builtDocument = retain('built-document.html', documentBody);
const fictionalFixture = retain('fictional-fixture.json', {
  schema: 'player-bingo-birth-year-native-fixture-v1',
  ages: { year: 2026, target: [0, targetCount - 1], stableOlder: [targetCount, firstAge25Index - 1],
    stableNewer: [firstAge25Index, playerCount - 1], targetAge: 26, olderAge: 26, newerAge: 25 },
  labels, ageLabels, market,
  cohorts: journeys.map(journey => ({ ...journey, squadRows: squads.get(journey.id) })),
});
const viewports = [[320, 780], [390, 844], [1280, 900]];
const report = {
  schema: 'player-bingo-birth-year-native-v1', status: 'running', route: publicUrl,
  builtDocument: { distFile: path.relative(root, path.join(build, distFile)).split(path.sep).join('/'), ...builtDocument },
  fictionalFixture, cases: [], totals: null,
};
const save = () => writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const mainDocument = request => request.resourceType() === 'document' && request.isNavigationRequest();
function requestReceipt(request, page) {
  return { url: request.url(), method: request.method(), resourceType: request.resourceType(),
    navigationRequest: request.isNavigationRequest(), mainFrame: request.frame() === page.mainFrame(),
    redirectedFrom: request.redirectedFrom()?.url() ?? null };
}
const directRequest = { url: publicUrl, method: 'GET', resourceType: 'document',
  navigationRequest: true, mainFrame: true, redirectedFrom: null };
const cap = playerCount - targetCount;
const currentSelector = 'div.font-bold.text-foreground.text-2xl.leading-tight';
const strikesSelector = '[aria-label$="strikes used"]';
const documentState = page => page.evaluate(() => ({
  nonce: window.__dukbBingoBirthDocument, url: location.href,
  viewport: [innerWidth, innerHeight], scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
}));

async function intercept(route, row, journey, page) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  if (mainDocument(request) && page && request.frame() === page.mainFrame()) {
    row.documentInterceptions.push(requestReceipt(request, page));
  }
  if (url.origin === base && ['GET', 'HEAD'].includes(method)) {
    row.forwardedLoopbackReads++;
    return route.continue();
  }
  const table = /^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/.exec(url.pathname)?.[1];
  if (url.origin === 'https://' + fixtureHost && table && ['GET', 'OPTIONS'].includes(method)) {
    const cors = {
      'access-control-allow-origin': base,
      'access-control-allow-headers': request.headers()['access-control-request-headers']
        || 'authorization,apikey,content-type,x-client-info,range,range-unit,prefer,accept-profile,x-supabase-api-version',
      'access-control-allow-methods': 'GET,OPTIONS',
    };
    if (method === 'OPTIONS') {
      row.preflights.push(table);
      return route.fulfill({ status: 204, headers: cors, body: '' });
    }
    let reply;
    if (table === 'player_market_values') {
      reply = marketRead(url.searchParams, request);
    } else if (table === 'world_cup_players') {
      reply = squadRead(url.searchParams, request, journey);
    } else {
      const columns = projection(url.searchParams);
      assert.deepEqual(columns, ['player_name', 'rank', 'award_type']);
      assert.deepEqual([...url.searchParams.keys()], ['select']);
      reply = { columns, data: [] };
    }
    const { data, ...read } = reply;
    const body = JSON.stringify(data);
    row.fixtureReads.push({ table, method, ...read, rows: data.length, bytes: Buffer.byteLength(body), sha256: sha(body) });
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body });
  }
  row.blocked.push({ origin: url.origin, path: url.pathname, method });
  return route.abort();
}
function verifyReads(row, journey) {
  const marketReads = row.fixtureReads.filter(item => item.table === 'player_market_values');
  const byKind = kind => marketReads.filter(item => item.kind === kind);
  const seed = byKind('seed'), latest = byKind('latest'), history = byKind('history');
  assert.deepEqual([seed.length, latest.length, history.length], [1, 13, 7]);
  assert.equal(seed[0].rows, playerCount);
  for (const chunks of [latest, history]) {
    assert.deepEqual(chunks.flatMap(item => item.selected).sort(), [...names].sort());
    assert(chunks.every(item => item.selected.length === item.rows));
  }
  const wc = row.fixtureReads.filter(item => item.table === 'world_cup_players');
  assert.deepEqual(wc.map(item => [item.offset, item.limit, item.rows]),
    [[0, 1000, 1000], [1000, 1000, squads.get(journey.id).length - 1000]]);
  assert.deepEqual(wc[0].columns, wc[1].columns);
  for (const read of wc) {
    const bytes = JSON.stringify(project(squads.get(journey.id).slice(read.offset, read.offset + read.limit), read.columns));
    assert.deepEqual([read.bytes, read.sha256], [Buffer.byteLength(bytes), sha(bytes)]);
  }
  assert.equal(row.fixtureReads.filter(item => item.table === 'ballon_dor').length, 1);
  assert.equal(row.fixtureReads.length, 24);
  assert(row.fixtureReads.every(item => item.method === 'GET'));
  assert(row.forwardedLoopbackReads > 0);
  assert.equal(row.blocked.filter(item => item.origin === base && ['GET', 'HEAD'].includes(item.method)).length, 0);
  assert.equal(row.blocked.filter(item => item.origin === 'https://' + fixtureHost &&
    ['GET', 'OPTIONS'].includes(item.method) && /^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/.test(item.path)).length, 0);
  return wc[0].columns.join(',');
}
async function waitForNext(page, name) {
  await page.waitForFunction(({ selector, before }) => {
    const after = document.querySelector(selector)?.textContent?.trim();
    return Boolean(after) && after !== before;
  }, { selector: currentSelector, before: name });
}
async function observe(browser, row, journey) {
  const { width, height, touch, id, seed } = row;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch,
    deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block' });
  const pending = new Set();
  let page;
  try {
    await context.addInitScript(({ url, seed }) => {
      if (window !== window.top || location.href !== url) return;
      Object.defineProperty(window, '__dukbBingoBirthDocument', { value: crypto.randomUUID() });
      let state = seed >>> 0;
      Math.random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
    }, { url: publicUrl, seed });
    await context.route('**/*', route => {
      const work = intercept(route, row, journey, page).catch(async error => {
        row.routeErrors.push(String(error.stack || error));
        await route.abort().catch(() => {});
      });
      pending.add(work);
      void work.finally(() => pending.delete(work));
      return work;
    });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.pageErrors.push(String(error.stack || error)));
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) row.frameEvents.push(frame.url()); });
    page.on('request', request => {
      if (mainDocument(request) && request.frame() === page.mainFrame()) row.documents.push(requestReceipt(request, page));
    });
    const activate = locator => touch ? locator.tap() : locator.click();
    const response = await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });
    assert(response);
    const request = response.request();
    const headers = response.headers();
    assert.deepEqual(requestReceipt(request, page), directRequest);
    assert.deepEqual([response.url(), response.status(), request.redirectedTo(), headers.location ?? null, headers['content-type']],
      [publicUrl, 200, null, null, 'text/html; charset=utf-8']);
    assert(documentBody.equals(await response.body()), 'Exact built Player Bingo route document');
    row.served = { url: response.url(), status: response.status(), request: requestReceipt(request, page),
      redirectedTo: request.redirectedTo()?.url() ?? null, location: headers.location ?? null,
      contentType: headers['content-type'], ...builtDocument };
    row.mount = await documentState(page);
    row.consent = await answerConsent(page, { press: activate });
    assert(['rejected', 'absent'].includes(row.consent));
    await activate(page.getByRole('button', { name: "Let's Play!", exact: true }));
    const grid = page.locator('div.grid-cols-5').filter({ has: page.locator('button[title]') });
    const tiles = grid.locator(':scope > button[title]');
    await tiles.first().waitFor({ state: 'visible', timeout: 30000 });
    assert.equal(await grid.count(), 1);
    assert.equal(await tiles.count(), 24);
    assert.equal(await grid.locator(':scope > *').count(), 25);
    assert.equal(await grid.locator(':scope > *').nth(12).getByText('FREE', { exact: true }).count(), 1);
    assert.equal(await grid.getByText('FREE', { exact: true }).count(), 1);
    const tileLabels = () => tiles.evaluateAll(buttons => buttons.map(button => ({
      title: button.title, label: button.querySelector(':scope > span:nth-of-type(2)')?.textContent?.trim(),
    })));
    const board = await tileLabels();
    assert.equal(new Set(board.map(item => item.title)).size, 24);
    assert(board.every(item => item.title && item.title === item.label));
    assert.deepEqual(board.map(item => item.title).filter(title => ageLabels.includes(title)).sort(), [labels.older, labels.newer].sort());
    row.board = board;
    const current = page.locator(currentSelector);
    const skip = page.getByRole('button', { name: 'Skip player', exact: true });
    const strikes = page.locator(strikesSelector);
    const name = async () => (await current.innerText()).trim();
    let revealed = await name();
    while (!targets.has(revealed)) {
      assert(names.has(revealed), 'Only fictional market players are drawn');
      assert(!row.skipped.includes(revealed), 'Each revealed card is unique');
      assert(row.skipped.length < cap, 'The actual complete deck must contain a target cohort player');
      row.skipped.push(revealed);
      await activate(skip);
      await waitForNext(page, revealed);
      revealed = await name();
    }
    const marketRow = market.find(player => player.player_name === revealed);
    const squadRows = squads.get(journey.id).filter(item => item.player_name.trim().toLowerCase() === revealed.toLowerCase());
    assert.equal(marketRow.age, 26);
    assert.equal(marketRow.year, 2026);
    assert.deepEqual(squadRows.map(item => item.date_of_birth), [journey.firstDate, journey.secondDate].filter(Boolean));
    const firstNationality = marketRow.nationality.split('/')[0].trim().toLowerCase();
    const expectedNationality = journey.country === 'secondary' ? 'fictional secondary' : firstNationality;
    assert(squadRows.every(item => item.nationality.trim().toLowerCase() === expectedNationality));
    row.target = { name: revealed, market: marketRow, squads: squadRows, expectedBand: labels[journey.band] };
    row.fixtureExpectedSupport = {
      [labels.older]: firstAge25Index - targetCount + (journey.band === 'older' ? targetCount : 0),
      [labels.newer]: playerCount - firstAge25Index + (journey.band === 'newer' ? targetCount : 0),
    };
    const label = labels[journey.tap];
    const tile = tiles.filter({ has: page.getByText(label, { exact: true }) });
    assert.equal(await tile.count(), 1);
    assert.equal(await tile.getAttribute('title'), label);
    assert(await tile.isVisible() && await tile.isEnabled());
    assert.equal(await grid.locator(':scope > button[title]:disabled').count(), 0);
    const before = await strikes.getAttribute('aria-label');
    assert.equal(before, '0 of 3 strikes used');
    row.before = { strikes: before, state: await documentState(page),
      screenshot: retain(id + '-before.png', await grid.screenshot({ animations: 'disabled' })) };
    await activate(tile);
    await waitForNext(page, revealed);
    const next = await name();
    assert(names.has(next) && !row.skipped.includes(next) && next !== revealed);
    const after = await strikes.getAttribute('aria-label');
    const locked = await tile.isDisabled();
    const nameInTile = await tile.getByText(revealed, { exact: true }).count();
    assert.deepEqual(await tileLabels(), board);
    assert.equal(await grid.locator(':scope > button[title]:disabled').count(), Number(locked));
    row.after = { strikes: after, state: await documentState(page),
      screenshot: retain(id + '-after.png', await grid.screenshot({ animations: 'disabled' })) };
    row.placement = { label, expectedLock: journey.locks, locked, nameInTile, next };
    while (pending.size) await Promise.all([...pending]);
    assert.deepEqual(row.documents, [directRequest]);
    assert.deepEqual(row.documentInterceptions, [directRequest]);
    assert.deepEqual(row.routeErrors, []);
    assert.deepEqual(row.pageErrors, []);
    const nonce = row.mount.nonce;
    assert.match(nonce, /^[0-9a-f-]{36}$/);
    for (const state of [row.mount, row.before.state, row.after.state]) {
      assert.deepEqual([state.nonce, state.url], [nonce, publicUrl]);
      assert(state.viewport.every(size => Number.isSafeInteger(size) && size > 0));
      assert(state.scrollWidth > 0);
    }
    assert.equal(page.url(), publicUrl);
    row.squadProjection = verifyReads(row, journey);
    assert.deepEqual([locked, nameInTile, after],
      [journey.locks, Number(journey.locks), journey.locks ? '0 of 3 strikes used' : '1 of 3 strikes used'],
      'PLAYER_BINGO_NATIVE_BIRTH_YEAR_BAND ' + id);
  } finally {
    while (pending.size) await Promise.all([...pending]);
    await context.close();
  }
}
let browser;
try {
  browser = await pw.chromium.launch({ headless: true });
  for (const [width, height] of viewports) {
    for (const [index, journey] of journeys.entries()) {
      const row = { id: width + '-' + journey.id, width, height, touch: width <= 390, journey: journey.id, seed: index + 1,
        status: 'running', documents: [], documentInterceptions: [], frameEvents: [], routeErrors: [], pageErrors: [],
        fixtureReads: [], preflights: [], blocked: [], forwardedLoopbackReads: 0, skipped: [] };
      report.cases.push(row);
      try {
        await observe(browser, row, journey);
        row.status = 'passed';
      } catch (error) {
        row.status = 'failed';
        row.error = String(error.stack || error);
      }
      save();
    }
  }
  assert.equal(report.cases.length, 24);
  assert.deepEqual(report.cases.filter(row => row.status !== 'passed').map(row => ({ id: row.id, error: row.error })), []);
  assert(report.cases.every(row => row.squadProjection === fixedSquadColumns), 'All actual squad reads project the typed DOB column');
  assert.equal(new Set(report.cases.map(row => row.mount.nonce)).size, 24);
  report.totals = {
    cases: report.cases.length, documents: report.cases.reduce((sum, row) => sum + row.documents.length, 0),
    fixtureGets: report.cases.reduce((sum, row) => sum + row.fixtureReads.length, 0),
    squadPages: report.cases.reduce((sum, row) => sum + row.fixtureReads.filter(item => item.table === 'world_cup_players').length, 0),
    locks: report.cases.filter(row => row.placement.locked).length,
    adjacentRejections: report.cases.filter(row => !row.placement.locked).length,
    pngs: report.cases.filter(row => row.before.screenshot && row.after.screenshot).length * 2,
  };
  assert.deepEqual(report.totals, { cases: 24, documents: 24, fixtureGets: 576, squadPages: 48, locks: 21, adjacentRejections: 3, pngs: 48 });
  assert.equal(statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  save();
  if (browser) await browser.close();
}
console.log((report.status === 'passed' ? 'PASS' : 'FAIL') + ' Player Bingo native birth-year board and placement');

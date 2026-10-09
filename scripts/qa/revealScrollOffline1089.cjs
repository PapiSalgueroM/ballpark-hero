/* CI-only finite response fixtures for the unchanged Reveal scroll harness. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'soccer-hub-grid-artifacts/reveal-fixture');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fileSha(file) { let digest; { const bytes = fs.readFileSync(file); digest = sha(bytes); } return digest; }
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const DART = 'player_name,position,age,nationality,club,market_value_usd,goals,assists';
const POOL = 'player_name,nationality,position,club,market_value_usd,age,year,person_key';
const HISTORY = 'n:player_name,c:club,a:age,y:year,k:person_key';
const ORDER = 'market_value_usd.desc,player_name.asc,id.asc';
const sourceFiles = ['src/data/players.ts', 'scripts/bakePlayers.mjs', 'src/lib/squadDeal.ts', 'src/lib/whoAmI.ts', 'src/lib/dartDraft.ts', 'src/lib/dartMap.ts', 'src/data/worldMapGeo.ts', 'src/components/FlagImg.tsx', 'src/lib/liveScores.ts', 'src/lib/completions.ts', 'src/integrations/supabase/client.ts', 'scripts/simRevealScroll.mjs', 'scripts/lib/offlineTransport.cjs', 'scripts/qa/revealScrollOffline1089.cjs', '.github/workflows/soccer-hub-grid.yml'];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, fileSha(path.join(ROOT, file))]));
const origin = () => new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = "([^"]+)";/)[1]).origin;
function keys(u, expected) { assert.deepEqual([...u.searchParams.keys()].sort(), [...expected].sort(), 'Exact query keys, including duplicate count'); }
function list(value) {
  assert(value?.startsWith('in.(') && value.endsWith(')'), 'Exact membership filter');
  const inner = value.slice(4, -1), parts = inner.match(/"(?:[^"\\]|\\.)*"|[^,]+/g) || [];
  assert.equal(parts.join(','), inner, 'Membership has no missing or extra separators');
  assert(parts.every(v => v.startsWith('"') ? /^"(?:[^"\\]|\\.)*"$/.test(v) : !/[()"]/.test(v)));
  const values = parts.map(v => v.startsWith('"') ? JSON.parse(v) : v);
  assert.equal(new Set(values).size, values.length); assert(values.length > 0 && values.length <= 80);
  return values;
}
function responseFor(u, method, body, rows, contracts) {
  assert.equal(u.origin, origin());
  if (u.pathname === '/rest/v1/game_completions') {
    assert.equal(method, 'POST'); keys(u, []);
    const row = JSON.parse(body); assert(row && !Array.isArray(row) && typeof row === 'object');
    assert.deepEqual(Object.keys(row).sort(), (Object.hasOwn(row, 'score') ? ['game', 'player_name', 'score'] : ['game', 'player_name']));
    assert(['soccer-career', 'club-manager', 'dart-draft', 'cfb-dynasty', 'clue-auction'].includes(row.game));
    assert(typeof row.player_name === 'string' && row.player_name.length > 0 && row.player_name.length <= 200);
    if (Object.hasOwn(row, 'score')) assert(Number.isFinite(row.score));
    return { rule: 'declared-local-write-rejection', status: 503, value: { code: 'CI_LOCAL_REJECTION', message: 'This verification does not save completions.' }, bodyShape: Object.keys(row).sort() };
  }
  assert.equal(method, 'GET'); assert.equal(body, null, 'GET has no body');
  if (u.pathname === '/rest/v1/live_scores') {
    keys(u, ['select', 'order', 'limit', 'start_at', 'start_at']);
    assert.equal(u.searchParams.get('select'), '*'); assert.equal(u.searchParams.get('order'), 'start_at.asc'); assert.equal(u.searchParams.get('limit'), '150');
    const bounds = u.searchParams.getAll('start_at');
    assert(/^gte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(bounds[0]) && /^lte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(bounds[1]));
    assert(bounds.every(v => Number.isFinite(Date.parse(v.slice(4))) && new Date(v.slice(4)).toISOString() === v.slice(4)));
    assert.equal(Date.parse(bounds[1].slice(4)) - Date.parse(bounds[0].slice(4)), contracts.liveWindowMs);
    return { rule: 'declared-empty-live-board', status: 200, value: [] };
  }
  assert.equal(u.pathname, '/rest/v1/player_market_values');
  const q = u.searchParams, select = q.get('select');
  let selected = rows, rule;
  if (select === DART && q.has('age')) {
    /* Round 1145: the pool is the top 2,000 in two pages of 1000 by the same order (it was one request of 900). */
    keys(u, ['select', 'year', 'age', 'order', 'offset', 'limit']); assert.equal(q.get('year'), 'eq.2026'); assert.equal(q.get('age'), 'not.is.null'); assert.equal(q.get('order'), 'market_value_usd.desc,player_name.asc'); assert(['0', '1000'].includes(q.get('offset'))); assert.equal(q.get('limit'), '1000');
    rule = 'baked-current-dart-pool';
  } else if (select === DART && q.has('nationality')) {
    keys(u, ['select', 'year', 'nationality', 'order', 'limit', ...(q.has('position') ? ['position'] : [])]);
    assert.equal(q.get('year'), 'eq.2026'); assert.equal(q.get('order'), 'market_value_usd.desc'); assert.equal(q.get('limit'), q.has('position') ? '12' : '120');
    const countries = list(q.get('nationality')); assert(contracts.countries.some(values => JSON.stringify(values) === JSON.stringify(countries)), 'Actual source country membership only'); selected = selected.filter(r => countries.includes(r.nationality));
    if (q.has('position')) { const positions = list(q.get('position')); assert(contracts.positions.some(values => JSON.stringify(values) === JSON.stringify(positions)), 'Actual source slot membership only'); selected = selected.filter(r => positions.includes(r.position)); }
    rule = 'baked-current-dart-country';
  } else if (select === POOL) {
    keys(u, ['select', 'year', 'age', 'market_value_usd', 'order', 'offset', 'limit']);
    assert(['eq.2026', 'eq.2025'].includes(q.get('year'))); assert.equal(q.get('age'), 'gt.0'); assert.equal(q.get('order'), ORDER); assert.equal(q.get('offset'), '0'); assert.equal(q.get('limit'), '1000');
    assert.equal(q.get('market_value_usd'), q.get('year') === 'eq.2026' ? 'gt.0' : 'gte.0');
    selected = selected.filter(r => r.year === Number(q.get('year').slice(3)) && r.age > 0 && r.market_value_usd > 0);
    rule = q.get('year') === 'eq.2026' ? 'baked-current-clue-pool' : 'declared-no-2025-rows';
  } else {
    assert.equal(select, HISTORY); keys(u, ['select', 'player_name', 'order', 'offset', 'limit']);
    assert.equal(q.get('order'), 'id.asc'); assert.equal(q.get('offset'), '0'); assert.equal(q.get('limit'), '1000');
    const names = list(q.get('player_name')); assert(names.every(name => rows.some(r => r.player_name === name)), 'History only names from this fixture');
    selected = selected.filter(r => names.includes(r.player_name)); rule = 'baked-current-club-only-history';
  }
  selected = [...selected].sort((a, b) => q.get('order') === 'id.asc' ? a.id - b.id : b.market_value_usd - a.market_value_usd || a.player_name.localeCompare(b.player_name, 'en') || a.id - b.id).slice(Number(q.get('offset') || 0), Number(q.get('offset') || 0) + Number(q.get('limit')));
  const columns = select.split(',');
  return { rule, status: 200, value: selected.map(row => Object.fromEntries(columns.map(column => { const [alias, field = alias] = column.split(':'); return [alias, row[field]]; }))) };
}

function checkContracts(rows, contracts) {
  const member = values => `in.(${values.map(value => /[,()]/.test(value) ? JSON.stringify(value) : value).join(',')})`;
  const url = (table, query) => { const u = new URL(`/rest/v1/${table}`, origin()); for (const [key, value] of query) u.searchParams.append(key, value); return u; };
  const dart = url('player_market_values', Object.entries({ select: DART, year: 'eq.2026', age: 'not.is.null', order: 'market_value_usd.desc,player_name.asc', offset: '0', limit: '1000' }));
  const dartSecond = new URL(dart); dartSecond.searchParams.set('offset', '1000');
  assert.deepEqual(responseFor(dartSecond, 'GET', null, rows, contracts).value, [], 'The second pool page is past the end of this fixture');
  const current = url('player_market_values', Object.entries({ select: POOL, year: 'eq.2026', age: 'gt.0', market_value_usd: 'gt.0', order: ORDER, offset: '0', limit: '1000' }));
  const carried = new URL(current); carried.searchParams.set('year', 'eq.2025'); carried.searchParams.set('market_value_usd', 'gte.0');
  const countryNames = contracts.countries.find(values => values.includes(rows[0].nationality)), slotPositions = contracts.positions.find(values => values.includes(rows[0].position)); assert(countryNames && slotPositions);
  const country = url('player_market_values', Object.entries({ select: DART, year: 'eq.2026', nationality: member(countryNames), order: 'market_value_usd.desc', limit: '120' }));
  const slot = new URL(country); slot.searchParams.set('position', member(slotPositions)); slot.searchParams.set('limit', '12');
  const history = url('player_market_values', Object.entries({ select: HISTORY, player_name: member([rows[0].player_name]), order: 'id.asc', offset: '0', limit: '1000' }));
  const live = url('live_scores', [['select', '*'], ['order', 'start_at.asc'], ['limit', '150'], ['start_at', 'gte.2026-10-07T00:00:00.000Z'], ['start_at', 'lte.2026-10-08T08:00:00.000Z']]);
  const completion = url('game_completions', []), body = JSON.stringify({ game: 'soccer-career', player_name: 'CI Fixture' });
  const records = [], healthy = responseFor(dart, 'GET', null, rows, contracts);
  for (const [name, target, method, payload] of [['dart', dart, 'GET', null], ['current', current, 'GET', null], ['carried', carried, 'GET', null], ['country', country, 'GET', null], ['slot', slot, 'GET', null], ['history', history, 'GET', null], ['live', live, 'GET', null], ['completion', completion, 'POST', body]]) {
    const actual = responseFor(target, method, payload, rows, contracts); records.push({ name, request: target.href, method, actual });
    if (name === 'dart' || name === 'current') assert.equal(actual.value.length, 557);
    if (name === 'country' || name === 'slot') assert(actual.value.length > 0 && actual.value.every(row => countryNames.includes(row.nationality)));
    if (name === 'slot') assert(actual.value.every(row => slotPositions.includes(row.position)));
    if (name === 'carried' || name === 'live') assert.deepEqual(actual.value, []);
    if (name === 'history') assert.deepEqual(actual.value, [{ n: rows[0].player_name, c: rows[0].club, a: rows[0].age, y: 2026, k: null }]);
    if (name === 'completion') assert.equal(actual.status, 503);
  }
  const badQuery = (target, key, value) => { const u = new URL(target); u.searchParams.set(key, value); return u; };
  const badOrigin = new URL(dart); badOrigin.hostname = 'invalid.example';
  const probes = [['origin', badOrigin, 'GET', null], ['method', dart, 'DELETE', null], ['GET body', dart, 'GET', '{}'], ['projection', badQuery(dart, 'select', '*'), 'GET', null], ['year', badQuery(dart, 'year', 'eq.2024'), 'GET', null], ['sort', badQuery(dart, 'order', 'id.asc'), 'GET', null], ['limit', badQuery(dart, 'limit', '901'), 'GET', null], ['range', badQuery(current, 'offset', '1'), 'GET', null], ['market filter', badQuery(current, 'market_value_usd', 'gte.0'), 'GET', null], ['country', badQuery(country, 'nationality', 'in.(Not a source country)'), 'GET', null], ['position', badQuery(slot, 'position', 'in.(Not a source position)'), 'GET', null], ['history name', badQuery(history, 'player_name', 'in.(Not a source player)'), 'GET', null], ['membership', badQuery(history, 'player_name', `in.(${rows[0].player_name},)`), 'GET', null], ['live bounds', badQuery(live, 'start_at', 'gte.2026-10-07T00:00:00.000Z'), 'GET', null], ['POST shape', completion, 'POST', JSON.stringify({ game: 'soccer-career', player_name: 'CI Fixture', unknown: true })]];
  for (const [name, target, method, payload] of probes) {
    let failure; try { responseFor(target, method, payload, rows, contracts); } catch (error) { failure = { name: error.name, message: error.message }; }
    records.push({ name, request: target.href, method, failure, independentBaseline: responseFor(dart, 'GET', null, rows, contracts) });
    save(path.join(OUT, 'contract-checks.json'), records);
    assert.equal(failure?.name, 'AssertionError', `The ${name} request must be refused`); assert.deepEqual(records.at(-1).independentBaseline, healthy);
  }
  save(path.join(OUT, 'contract-checks.json'), records);
}

async function prepare() {
  assert(process.env.CI, 'Preparation runs only in remote CI'); fs.mkdirSync(path.join(OUT, 'cache'), { recursive: true });
  const before = sourceHashes();
  for (const file of sourceFiles) { const dest = path.join(OUT, 'source', file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(ROOT, file), dest); }
  const { build } = require('esbuild');
  const built = await build({ absWorkingDir: ROOT, stdin: { contents: "export { players } from './src/data/players'; export { POSITION_NORMALIZE, LEGENDS } from './src/lib/squadDeal'; export { FLAG_CODES } from './src/components/FlagImg'; export { flagFor } from './src/lib/dealPlayers'; export { flagEmojiToIso } from './src/lib/flagUtils'; export { DART_SLOTS, dbNamesFor } from './src/lib/dartMap'; export { GEO_COUNTRIES } from './src/data/worldMapGeo'; export { LOOKBACK_MS, LOOKAHEAD_MS } from './src/lib/liveScores';", resolveDir: ROOT }, bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
  const file = path.join(OUT, 'source-pool.mjs'); fs.writeFileSync(file, built.outputFiles[0].contents); save(path.join(OUT, 'source-pool-metafile.json'), built.metafile);
  const inputs = Object.keys(built.metafile.inputs).filter(input => input !== '<stdin>');
  const inputHashes = () => Object.fromEntries(inputs.map(input => [input, fileSha(path.join(ROOT, input))]));
  const inputBefore = inputHashes();
  for (const input of inputs) { assert(!path.relative(ROOT, path.resolve(ROOT, input)).startsWith('..')); const dest = path.join(OUT, 'bundle-inputs', input); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(ROOT, input), dest); }
  const originalFetch = globalThis.fetch; globalThis.fetch = async () => { throw new Error('Pool import attempted transport'); };
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => { throw new Error('Pool import attempted storage write'); }, removeItem: () => { throw new Error('Pool import attempted storage removal'); } } });
  let E; try { E = await import(pathToFileURL(file).href); } finally { if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage; }
  assert.equal(E.players.length, 557); assert.equal(new Set(E.players.map(p => p.name)).size, 557);
  const rows = E.players.map((p, index) => {
    const position = Object.entries(E.POSITION_NORMALIZE).find(([label, normalized]) => normalized === p.position && label.length > 3)?.[0];
    assert(position && E.POSITION_NORMALIZE[position] === p.position);
    assert(Number.isInteger(p.age) && p.age > 0 && Number.isInteger(p.marketValue) && p.marketValue >= 1);
    return { id: index + 1, player_name: p.name, position, age: p.age, nationality: p.nationality, club: p.club, market_value_usd: p.marketValue * 1000000, goals: p.goals, assists: p.assists, year: 2026, person_key: null };
  });
  save(path.join(OUT, 'rows.json'), rows);
  const contracts = { countries: E.GEO_COUNTRIES.map(E.dbNamesFor), positions: E.DART_SLOTS.map(slot => Object.keys(E.POSITION_NORMALIZE).filter(label => slot.allowed.includes(E.POSITION_NORMALIZE[label]))), liveWindowMs: E.LOOKBACK_MS + E.LOOKAHEAD_MS };
  save(path.join(OUT, 'contracts.json'), contracts);
  checkContracts(rows, contracts);
  const assets = JSON.parse(fs.readFileSync(path.join(ROOT, 'soccer-hub-grid-artifacts/asset-cache/manifest.json')));
  for (const row of assets) { const body = fs.readFileSync(path.join(ROOT, 'soccer-hub-grid-artifacts/asset-cache', row.file)); assert.equal(sha(body), row.sha256); fs.writeFileSync(path.join(OUT, 'cache', row.file), body); }
  const countries = new Set(['un']);
  for (const p of [...E.players, ...E.LEGENDS]) { const code = E.flagEmojiToIso(E.flagFor(p.nationality)); if (code) countries.add(code); const mapped = E.FLAG_CODES[p.nationality]; if (mapped) countries.add(mapped); }
  for (const country of E.GEO_COUNTRIES) { const mapped = E.FLAG_CODES[E.dbNamesFor(country)[0]]; if (mapped) countries.add(mapped); }
  for (const code of [...countries].sort()) for (const width of [40, 80]) {
    if (code === 'gb-eng') continue; // Both actual flag components render this code inline.
    const url = `https://flagcdn.com/w${width}/${code}.png`; if (assets.some(row => row.url === url)) continue;
    assert(/^(?:[a-z]{2}|gb-(?:sct|wls|nir))$/.test(code));
    const response = await originalFetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); assert.equal(response.status, 200, url);
    const body = Buffer.from(await response.arrayBuffer()), hash = sha(body); fs.writeFileSync(path.join(OUT, 'cache', hash), body);
    assets.push({ url, file: hash, sha256: hash, bytes: body.length, contentType: response.headers.get('content-type') });
  }
  save(path.join(OUT, 'assets.json'), assets);
  assert.deepEqual(sourceHashes(), before);
  assert.deepEqual(inputHashes(), inputBefore);
  save(path.join(OUT, 'preparation.json'), { sourceBefore: before, sourceAfter: sourceHashes(), inputBefore, inputAfter: inputHashes(), bundleSha256: fileSha(file), rowsSha256: fileSha(path.join(OUT, 'rows.json')), contractsSha256: fileSha(path.join(OUT, 'contracts.json')), assetsSha256: fileSha(path.join(OUT, 'assets.json')), count: rows.length, countries: [...countries].sort(), scope: 'Existing 557 baked 2026 display records, reconstructed rounded USD millions and canonical normalized role labels. IDs are fixture sort ties, not database IDs. Only current clubs, no invented historical rows. No live-data or full-pool authority.' });
  console.log(`Prepared ${rows.length} existing baked player records and ${assets.length} actual cached assets.`);
}

function install() {
  assert(process.env.CI && process.env.SIM_NETWORK === 'offline');
  const dir = path.resolve(process.env.REVEAL_FIXTURE_REPORT); fs.mkdirSync(path.join(dir, 'responses'), { recursive: true });
  const prep = JSON.parse(fs.readFileSync(path.join(OUT, 'preparation.json'))); assert.deepEqual(sourceHashes(), prep.sourceAfter);
  const rowsFile = path.join(OUT, 'rows.json'); assert.equal(fileSha(rowsFile), prep.rowsSha256); assert.equal(fileSha(path.join(OUT, 'source-pool.mjs')), prep.bundleSha256);
  const rows = JSON.parse(fs.readFileSync(rowsFile)); assert.equal(rows.length, 557);
  const contractsFile = path.join(OUT, 'contracts.json'); assert.equal(fileSha(contractsFile), prep.contractsSha256);
  const contracts = JSON.parse(fs.readFileSync(contractsFile));
  for (const [input, hash] of Object.entries(prep.inputAfter)) assert.equal(fileSha(path.join(ROOT, input)), hash);
  const assetsFile = path.join(OUT, 'assets.json'); assert.equal(fileSha(assetsFile), prep.assetsSha256);
  const assets = new Map(JSON.parse(fs.readFileSync(assetsFile)).map(row => { const body = fs.readFileSync(path.join(OUT, 'cache', row.file)); assert.equal(sha(body), row.sha256); assert.equal(body.length, row.bytes); return [row.url, { ...row, body }]; }));
  const report = { status: 'running', sourceBefore: sourceHashes(), preparation: prep, requests: [], surfaces: [], closingObservations: [], errors: [], sockets: [], realForwardedWrites: 0 };
  const persist = () => save(path.join(dir, 'report.json'), report);
  const fail = error => { report.errors.push({ name: error.name, message: error.message, stack: error.stack }); persist(); };
  const pending = new Set();
  const pw = require('playwright-core');
  pw.chromium._playwright._instrumentation.addListener({ async runAfterCreateBrowserContext(context) {
    await context.addInitScript(() => {
      window.__revealFixtureSurfaces = [];
      const inspect = () => {
        if (!['/dart-draft', '/clue-auction'].includes(location.pathname)) return;
        const main = document.querySelector('#dukb-main') || document.querySelector('main'); if (!main) return;
        const text = main.innerText || '';
        const target = location.pathname === '/clue-auction' ? main.querySelector('input[aria-label="Name the secret player"]') : [...main.querySelectorAll('h2')].find(el => el.textContent === 'Pick the position you throw for');
        const rect = target?.getBoundingClientRect(), visible = rect && rect.width > 0 && rect.height > 0 && getComputedStyle(target).visibility === 'visible';
        const dart = !!visible && location.pathname === '/dart-draft' && /Throw\s+\d+\/11/.test(text);
        const bankTextPresent = text.toLowerCase().includes('bank, and your score if you solve it now');
        const clue = !!visible && location.pathname === '/clue-auction' && bankTextPresent;
        const observation = { route: location.pathname, dart, clue, bankTextPresent, targetVisible: !!visible, target: target?.outerHTML || null, rect: rect?.toJSON() || null, text, html: main.outerHTML };
        window.__revealFixtureLastObservation = observation;
        if ((dart || clue) && !window.__revealFixtureSurfaces.some(row => row.route === location.pathname)) window.__revealFixtureSurfaces.push(observation);
      };
      window.__inspectRevealFixture = inspect;
      document.addEventListener('DOMContentLoaded', () => { inspect(); new MutationObserver(inspect).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); });
    });
    await context.route('**/*', route => {
      const task = (async () => {
        const request = route.request(), u = new URL(request.url());
        if (u.origin === 'http://127.0.0.1:4173') return route.continue();
        const identity = { method: request.method(), origin: u.origin, pathname: u.pathname, queryKeys: [...u.searchParams.keys()].sort() };
        try {
          const cached = assets.get(u.href); let answer, body;
          if (cached) { assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null); answer = { rule: 'actual-cached-asset', status: 200, contentType: cached.contentType }; body = cached.body; }
          else { answer = responseFor(u, request.method(), request.postData(), rows, contracts); body = Buffer.from(JSON.stringify(answer.value)); }
          const hash = sha(body); fs.writeFileSync(path.join(dir, 'responses', hash), body);
          await route.fulfill({ status: answer.status, contentType: answer.contentType || 'application/json', headers: { 'access-control-allow-origin': '*', date: new Date().toUTCString() }, body });
          report.requests.push({ ...identity, rule: answer.rule, status: answer.status, bodyShape: answer.bodyShape, responseSha256: hash, bytes: body.length }); persist();
        } catch (error) { fail(error); report.requests.push({ ...identity, rejectedUnknown: true }); persist(); await route.abort('blockedbyclient'); }
      })().catch(fail);
      pending.add(task); task.finally(() => pending.delete(task)); return task;
    });
    await context.routeWebSocket('**/*', route => { report.sockets.push(new URL(route.url()).origin); fail(new Error('Unexpected socket')); return route.close(); });
    const close = context.close.bind(context);
    context.close = async (...args) => {
      try {
        for (const page of context.pages()) {
          const observed = await page.evaluate(() => { window.__inspectRevealFixture?.(); return { surfaces: window.__revealFixtureSurfaces || [], closing: window.__revealFixtureLastObservation || null }; });
          report.surfaces.push(...observed.surfaces);
          if (observed.closing) report.closingObservations.push(observed.closing);
        }
        await Promise.all([...pending]); persist();
      }
      catch (error) { fail(error); }
      return close(...args);
    };
  } });
  process.on('exit', () => {
    try {
      report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore);
      assert.equal(fileSha(rowsFile), prep.rowsSha256); assert.equal(fileSha(assetsFile), prep.assetsSha256); assert.equal(fileSha(contractsFile), prep.contractsSha256);
      report.inputAfter = Object.fromEntries(Object.keys(prep.inputAfter).map(input => [input, fileSha(path.join(ROOT, input))])); assert.deepEqual(report.inputAfter, prep.inputAfter);
      for (const row of assets.values()) assert.equal(fileSha(path.join(OUT, 'cache', row.file)), row.sha256);
      assert.equal(pending.size, 0); assert.equal(report.errors.length, 0); assert.equal(report.sockets.length, 0);
      assert(report.surfaces.some(row => row.dart), 'Actual Dart squad is reached, not the empty-pool intro');
      assert(report.surfaces.some(row => row.clue), 'Actual Clue playing input and bank are reached, not the retry screen');
      report.status = 'passed';
    } catch (error) { fail(error); report.status = 'failed'; process.exitCode = 1; }
    persist();
  });
  persist();
}
if (require.main === module) prepare().catch(error => { console.error(error); process.exitCode = 1; });
else if (path.basename(process.argv[1] || '') === 'simRevealScroll.mjs') install();

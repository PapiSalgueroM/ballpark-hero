/* Completed production App, held17-read archive, fictional recovery, no live persistence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';
import { validateContext, verifyRun, faults, sha } from './verifyWorldXiApp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requiredPath = key => { assert(process.env[key] && path.isAbsolute(process.env[key]), key + ' must be explicit and absolute'); return path.resolve(process.env[key]); };
const inputRoot = requiredPath('WORLD_XI_INPUT_ROOT');
const output = requiredPath('WORLD_XI_APP_OUT');
const distRoot = path.resolve(process.env.WORLD_XI_DIST || path.join(root, 'dist'));
const modulePath = requiredPath('WORLD_XI_PLAYWRIGHT_MODULE');
assert(!fs.existsSync(output), 'Output is a fresh owned directory, no prior evidence');
fs.mkdirSync(output, { recursive: true });
const base = new URL('https://dukb.test');
const sourcePins = {
  'src/App.tsx': '79da1b8cf2de7870ea216703d0a1a56fceb69673',
  'src/pages/WorldXi.tsx': '0ab9c83d47ae454e5043c441cdb4cfbac1160877',
  'src/lib/worldXi.ts': '4a7c33fbfb7e60a0d78846a52b3b886233378969',
  'src/lib/worldXiNationPools.ts': 'd764ecf78097e6b1673a3cf12f72bafa42e99e9a',
  'src/lib/completions.ts': '61daf9b6c528f884551cd1d42f71357681c8728a',
  'src/lib/squadShape.ts': 'b116f1dfb7cde01be9904c98e263c514bfc114aa',
  'src/lib/positionFit.ts': '868a0f0f92fedfde8f09d8fe31a4495f4965272e',
  'src/data/wc2026Results.ts': '66895c18e8cc9f2f03be03fb50c1ed1f537399a9',
  'src/integrations/supabase/client.ts': 'd055e064f5c1c0c90230ca562966ee04dfdcd3ce',
  'scripts/lib/answerConsent.mjs': 'c6d16997e4c06e8b35dcfd0bab5efcad3069d899',
  'scripts/lib/offlineTransport.cjs': '0fda542a2649fe5da937c6976fd0f5b6073e74b6',
};
const git = body => createHash('sha1').update('blob ' + body.length + '\0').update(body).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
const readJSON = file => JSON.parse(fs.readFileSync(file));
function tree(directory) {
  const files = [];
  function walk(current, relative = '') {
    for (const name of fs.readdirSync(current).sort()) {
      const filename = path.join(current, name), rel = relative ? relative + '/' + name : name, stat = fs.lstatSync(filename);
      assert(!stat.isSymbolicLink(), 'No input/dist symlink: ' + rel);
      if (stat.isDirectory()) walk(filename, rel);
      else { assert(stat.isFile(), 'Only regular input/dist files'); const body = fs.readFileSync(filename); files.push({ path: rel, bytes: body.length, sha256: sha(body) }); }
    }
  }
  walk(directory); return files;
}
function inputFile(name) {
  assert(typeof name === 'string' && name && !path.isAbsolute(name) && !name.split(/[\\/]/).some(part => part === '..' || part === '.'), 'Owned carrier member');
  const filename = fs.realpathSync(path.join(inputRoot, name)), physical = fs.realpathSync(inputRoot);
  assert(filename.startsWith(physical + path.sep), 'Carrier member remains in input root'); return filename;
}
const heldSources = new Map(Object.entries(sourcePins).map(([file, expected]) => {
  const body = fs.readFileSync(path.join(root, file)); assert.equal(git(body), expected, 'Exact current source: ' + file); return [file, body];
}));
const sourceBefore = [...heldSources].map(([file, body]) => ({ path: file, bytes: body.length, sha256: sha(body), git: git(body) }));
const inputBefore = tree(inputRoot), distBefore = tree(distRoot);
assert.equal(inputBefore.length, 61, 'Exact selected original input member set');
json('source-before.json', sourceBefore); json('input-before.json', inputBefore); json('dist-before.json', distBefore);
const manifestBody = fs.readFileSync(inputFile('manifest.json'));
assert.equal(sha(manifestBody), '93075e1a52b07446145b459987ba51f636adb9078265442d8e3049447ba14ebf', 'Original held17-response manifest');
const archive = JSON.parse(manifestBody);
assert.equal(archive.responses.length, 17);
assert.equal(archive.origin, 'https://flawuiqbvjobmkfkauhw.supabase.co');
for (const source of archive.sourceHolds) {
  const body = heldSources.get(source.path); assert(body, 'Actual original capture source is held');
  assert.equal(body.length, source.bytes); assert.equal(sha(body), source.sha256); assert.equal(git(body), source.gitBlob);
}
const marketSelect = 'player_name,nationality,position,club,market_value_usd,year,age';
const historySelect = 'player_name,secondary_positions,primary_position';
const key = (pathname, params) => JSON.stringify([pathname, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
const schedule = [];
for (const year of [2026, 2025]) for (let offset = 0; offset < 8000; offset += 1000) schedule.push({ pathname: '/rest/v1/player_market_values', params: { select: marketSelect, year: 'eq.' + year, market_value_usd: 'gt.0', order: 'id.asc', offset: String(offset), limit: '1000' } });
schedule.push({ pathname: '/rest/v1/player_verified_positions', params: { select: historySelect, limit: '1000' } });
for (const spec of schedule) spec.key = key(spec.pathname, spec.params);
const archived = new Map();
let allRaw = [];
for (const spec of schedule) {
  const record = archive.responses.find(row => key(row.browserQuery.pathname, row.browserQuery.params) === spec.key);
  assert(record && !archived.has(spec.key), 'Unique original query binding');
  const body = fs.readFileSync(inputFile(record.bodyFile)), rawBody = fs.readFileSync(inputFile(record.rawFile));
  assert.equal(sha(body), record.bodySha256); assert.equal(sha(rawBody), record.rawSha256);
  const rows = JSON.parse(body), raw = JSON.parse(rawBody);
  assert(Array.isArray(rows) && rows.length === record.count && raw.length === rows.length);
  if (record.kind === 'market') {
    const idsBody = fs.readFileSync(inputFile(record.idsFile)), ids = JSON.parse(idsBody);
    assert.equal(sha(idsBody), record.idsSha256);
    assert.deepEqual(raw.map(({ id, ...row }) => row), rows, 'Only source ID is removed');
    assert.deepEqual(raw.map(row => row.id), ids);
    assert(ids.every((id, i) => Number.isSafeInteger(id) && id > 0 && (!i || id > ids[i - 1])));
    for (const row of rows) assert.deepEqual(Object.keys(row).sort(), marketSelect.split(',').sort());
    allRaw.push(...rows);
  } else assert.deepEqual(raw, rows, 'History rows unchanged');
  archived.set(spec.key, { ...spec, body, rows, status: 200, count: rows.length, bytes: body.length, sha256: sha(body) });
}
for (const expected of [
  { player_name: 'Gustavo Gómez', nationality: 'Paraguay', position: 'Centre-Back', club: 'Sociedade Esportiva Palmeiras', market_value_usd: 5000000, year: 2025, age: 31 },
  { player_name: 'Ramón Sosa', nationality: 'Paraguay', position: 'Second Striker', club: 'Nottingham Forest', market_value_usd: 13000000, year: 2025, age: 25 },
]) assert.deepEqual(allRaw.filter(row => row.player_name === expected.player_name), [expected], 'Exact historical canonical record, not current live assertion');
json('archive-binding.json', { manifestSha256: sha(manifestBody), sourceHolds: archive.sourceHolds, responses: [...archived.values()].map(({ body, rows, ...rest }) => rest), realDataChanges: false });

/* Same938 fictional rows as factory941f1566, no real names or real roster claim. */
function fictionalRows() {
  const rows = [], positions = ['GK', 'GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'CF'];
  for (let countryIndex = 1; countryIndex <= 12; countryIndex++) {
    const country = 'Fixture Country ' + String(countryIndex).padStart(2, '0');
    for (let cohort = 0; cohort < 6; cohort++) for (const [index, position] of positions.entries()) rows.push({ player_name: 'Fixture ' + country + ' ' + position + ' ' + cohort + '-' + index, nationality: country, position, club: 'Fixture ' + country + ' Club ' + cohort + '-' + index, market_value_usd: 20_000 - cohort * 100 - index, year: 2026, age: 25 });
  }
  rows.push({ player_name: 'Fixture Shared Name', nationality: 'AAA Fixture Keeper', position: 'GK', club: 'Fixture Keeper Club', market_value_usd: 1000, year: 2026, age: 25 });
  rows.push({ player_name: 'Fixture Shared Name', nationality: 'AAB Fixture Striker', position: 'ST', club: 'Fixture Striker Club', market_value_usd: 1000, year: 2026, age: 25 });
  assert.equal(rows.length, 938); return rows;
}
const synthetic = new Map(schedule.map(spec => {
  const rows = spec.params.year === 'eq.2026' && spec.params.offset === '0' ? fictionalRows() : [], body = Buffer.from(JSON.stringify(rows));
  return [spec.key, { ...spec, rows, body, status: 200, count: rows.length, bytes: body.length, sha256: sha(body) }];
}));
json('fictional-rows.json', fictionalRows());
const faultKey = schedule[0].key, faultBody = Buffer.from(JSON.stringify({ code: 'WX_FIXTURE_REQUIRED_PAGE', message: 'Declared fictional required-page outage' }));
const fault = { status: 500, bytes: faultBody.length, sha256: sha(faultBody), count: null };
json('declared-boot-fault.json', { key: faultKey, ...fault, body: faultBody.toString('utf8'), scope: 'One transport fixture failure, source unchanged' });

/* Separate source oracle only. The browser serves the unchanged production App. */
const oracleEntry = path.join(output, 'oracle.mjs');
const clientProtocol = [
  "export const supabase = { from(table) {",
  " const params = {}; const chain = {",
  "  select(value) { params.select=value.replace(/, /g, ','); return chain; },",
  "  eq(column,value) { params[column]='eq.'+value; return chain; },",
  "  gt(column,value) { params[column]='gt.'+value; return chain; },",
  "  order(column,options) { if(column!=='id'||options.ascending!==true) throw Error('Reference ordered-ID contract'); params.order='id.asc';return chain; },",
  "  range(from,to) { if(to!==from+999) throw Error('Reference range');params.offset=String(from);params.limit='1000';return chain; },",
  "  limit(value) { params.limit=String(value);return chain; },",
  "  then(ok,bad) { const state=globalThis.__WXI_REFERENCE; const key=JSON.stringify(['/rest/v1/'+table,Object.entries(params).sort(([a],[b])=>a.localeCompare(b))]); const record=state.records.get(key); if(!record||state.seen.has(key)) return Promise.reject(Error('Reference17-query contract')).then(ok,bad); state.seen.add(key);state.reads.push(key);return Promise.resolve({data:structuredClone(record.rows),error:null}).then(ok,bad); }",
  " };return chain; } };",
].join('\n');
const oracleBuild = await build({
  stdin: { contents: "export {fetchWorldXiPool,drawCountries,shuffle,fitsSlot,displayCountry} from '@/lib/worldXi';export {selectWorldXiNationPool} from '@/lib/worldXiNationPools';export {FORMATIONS} from '@/lib/squadShape';export {shortName} from '@/lib/dealPlayers';", resolveDir: root, sourcefile: 'world-xi-actual-source-oracle.mjs' },
  bundle: true, platform: 'node', format: 'esm', outfile: oracleEntry, write: false, metafile: true, alias: { '@': path.join(root, 'src') }, logLevel: 'silent',
  plugins: [{ name: 'oracle-only-held-client', setup(plugin) {
    plugin.onResolve({ filter: /integrations[\\/]supabase[\\/]client(?:\.ts)?$/ }, args => ({ path: args.path, namespace: 'world-xi-reference-client' }));
    plugin.onLoad({ filter: /.*/, namespace: 'world-xi-reference-client' }, () => ({ contents: clientProtocol, loader: 'js' }));
  } }],
});
assert.equal(oracleBuild.outputFiles.length, 1);
const graph = oracleBuild.metafile, graphPaths = Object.keys(graph.inputs);
for (const needed of ['src/lib/worldXi.ts', 'src/lib/worldXiNationPools.ts', 'src/lib/squadShape.ts', 'src/lib/positionFit.ts', 'src/data/wc2026Results.ts']) assert(graphPaths.some(file => file.replaceAll('\\', '/').endsWith(needed)), 'Actual oracle source: ' + needed);
for (const file of graphPaths) {
  if (file.startsWith('world-xi-reference-client:') || file === 'world-xi-actual-source-oracle.mjs') continue;
  const full = path.resolve(root, file), rel = path.relative(root, full).replaceAll('\\', '/');
  assert(!rel.startsWith('../') && (rel.startsWith('src/') || rel.startsWith('node_modules/')), 'Finite source/dependency oracle graph');
}
const oracleBody = Buffer.from(oracleBuild.outputFiles[0].contents);
fs.writeFileSync(oracleEntry, oracleBody); json('oracle-metafile.json', graph);
fs.writeFileSync(path.join(output, 'oracle-client-protocol.source.txt'), clientProtocol);
const oracle = await import(pathToFileURL(oracleEntry).href);
const formation = oracle.FORMATIONS.find(value => value.name === '4-3-3');
assert(formation && formation.slots.length === 11);
const playerIdentity = p => JSON.stringify([p.name, p.club, p.position, p.country, p.value, p.age ?? null, p.positionsPlayed ?? null]);
async function model(records, mode, lab) {
  globalThis.__WXI_REFERENCE = { records, seen: new Set(), reads: [] };
  const data = await oracle.fetchWorldXiPool(), reads = [...globalThis.__WXI_REFERENCE.reads];
  delete globalThis.__WXI_REFERENCE;
  assert(data && data.players.length >= 800 && data.countries.length >= 12, 'Actual source loader admits held reference data');
  assert.equal(reads.length, 17);
  const pools = Object.fromEntries(['expanded', 'classic', '2026'].map(name => {
    const pool = oracle.selectWorldXiNationPool(data, name);
    return [name, { players: pool.players, countries: pool.countries, byCountry: [...pool.byCountry] }];
  }));
  const selected = oracle.selectWorldXiNationPool(data, mode);
  assert(selected.countries.length >= 11, 'Selected mode has at least11 available countries before its real draw');
  const eligible = Object.fromEntries(formation.slots.map(slot => [slot.label, data.players.filter(p => oracle.fitsSlot(p, slot)).map(playerIdentity)]));
  let labDraw = null;
  if (lab) {
    const oldRandom = Math.random;
    try { Math.random = () => .999999; const countries = oracle.drawCountries(formation, selected), order = oracle.shuffle(formation.slots.map((_, i) => i)); assert(countries); labDraw = order.map(i => countries[i]); }
    finally { Math.random = oldRandom; }
    assert.equal(data.players.length, 938); assert.deepEqual(['expanded', 'classic', '2026'].map(name => pools[name].countries.length), [14, 12, 0]);
  }
  return { mode, pools, eligible, labDraw, slots: formation.slots, shortNames: Object.fromEntries(data.players.map(p => [p.name, oracle.shortName(p.name)])), schedule: [...records.values()].map(({ body, rows, pathname, params, ...row }) => row), faultKey, fault, referenceReads: reads };
}
const reference = { schema: 1, scope: 'Actual source loader/fit/mode oracle with local client protocol, never the App client', contexts: {
  mini: await model(synthetic, 'expanded', true), phone: await model(archived, 'classic', false), desktop: await model(archived, '2026', false),
}, sourceBefore, inputBefore, oracle: { sha256: sha(oracleBody), bytes: oracleBody.length } };
json('reference.json', reference);
const fontManifest = fs.readFileSync(inputFile('font-cache/manifest.json'));
assert.equal(sha(fontManifest), '3171c3241bbb489c22f51489f8b2cd94c880f071dfe9760a5c9aabdf48363d82');
const fonts = new Map(JSON.parse(fontManifest).map(record => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(record.url).origin));
  assert(/^[a-f0-9]{64}$/.test(record.file));
  const body = fs.readFileSync(inputFile('font-cache/' + record.file));
  assert.equal(sha(body), record.sha256);
  return [record.url, { body, contentType: record.contentType }];
}));
assert.equal(fonts.size, 9);
const contentType = filename => ({
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.xml': 'application/xml; charset=utf-8',
})[path.extname(filename).toLowerCase()] || 'application/octet-stream';
const distBodies = new Map(distBefore.map(record => [record.path, { ...record, body: fs.readFileSync(path.join(distRoot, record.path)), contentType: contentType(record.path) }]));
assert(distBodies.has('index.html') && distBodies.has('world-xi/index.html'), 'Actual route snapshot and root document are present');
function localResponse(url) {
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  assert(!relative.split('/').includes('..') && !relative.includes('\\') && !relative.includes('\0'));
  /* Same existing-file, directory-index, root-fallback host semantics. */
  const file = distBodies.has(relative) ? relative : distBodies.has(relative.replace(/\/$/, '') + '/index.html') ? relative.replace(/\/$/, '') + '/index.html' : 'index.html';
  if (url.pathname !== '/' && url.pathname !== '/world-xi' && url.pathname !== '/world-xi/' && !distBodies.has(relative)) return null;
  return { ...distBodies.get(file), file };
}
const playwrightPackage = readJSON(path.join(path.dirname(modulePath), 'package.json'));
assert.equal(playwrightPackage.name, 'playwright'); assert.equal(playwrightPackage.version, '1.64.1');
const { chromium } = await import(pathToFileURL(modulePath).href);
const isLiveScore = url => {
  const entries = [...url.searchParams], bounds = url.searchParams.getAll('start_at');
  return url.origin === archive.origin && url.pathname === '/rest/v1/live_scores' && entries.length === 5 && url.searchParams.get('select') === '*' && url.searchParams.get('order') === 'start_at.asc' && url.searchParams.get('limit') === '150'
    && bounds.length === 2 && bounds.some(value => value.startsWith('gte.') && Number.isFinite(Date.parse(value.slice(4)))) && bounds.some(value => value.startsWith('lte.') && Number.isFinite(Date.parse(value.slice(4))));
};
const isFlag = url => url.origin === 'https://flagcdn.com' && /^\/w(?:20|40|80|160|320|640|1280)\/[a-z]{2}(?:-[a-z0-9]+)?\.png$/.test(url.pathname) && !url.search;
const cors = { 'access-control-allow-origin': base.origin };
const allowedHeaders = new Set(['apikey', 'authorization', 'x-client-info', 'content-type', 'accept-profile', 'content-profile', 'prefer', 'range', 'range-unit']);
function preflight(request, method) {
  const headers = (request.headers()['access-control-request-headers'] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  assert.equal(request.headers()['access-control-request-method'], method);
  assert(headers.every(name => allowedHeaders.has(name)), 'Only actual SDK request header names, never values');
  return { ...cors, 'access-control-allow-methods': method, 'access-control-allow-headers': headers.join(',') };
}
const configs = [
  { id: 'mini', mode: 'expanded', lab: true, width: 320, height: 664, dpr: 2, mobile: true, reducedMotion: 'reduce' },
  { id: 'phone', mode: 'classic', lab: false, width: 392, height: 731, dpr: 2.75, mobile: true, reducedMotion: 'no-preference' },
  { id: 'desktop', mode: '2026', lab: false, width: 1440, height: 900, dpr: 1, mobile: false, reducedMotion: 'no-preference' },
];
const run = { schema: 1, complete: false, scope: 'Actual completed App; held archive and explicitly fictional lab; no live gate', contexts: [], controls: [], primary: null };
let browser = null;

let firstError = null;
try {
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  json('tool-identity.json', { package: playwrightPackage.name, version: playwrightPackage.version, modulePath, browserExecutable: chromium.executablePath(), browserVersion: browser.version(), origin: base.origin, serving: 'all held Buffer fulfill; no continue/fetch/server network' });
  for (const config of configs) {
    const { id, lab, mode, ...size } = config, ref = reference.contexts[id], records = lab ? synthetic : archived;
    const row = { id, lab, mode, size, complete: false, actualApp: true, serviceWorkers: 'block', authRequests: 0,
      boot: { batches: [[]], fault: null, retry: null, setupMs: null }, setupModes: [], draw: null, help: {}, selections: [], wrongPosition: { reached: false, status: 'UNREACHED' }, recovery: null, final: null,
      transport: { unexpected: [], writes: [], pageErrors: [], consoleErrors: [], failed: [], routeErrors: [], responseErrors: [] }, expectedAborts: [], expectedConsoleErrors: [], expectedFailed: [], preflights: [], supplied: [], assets: [], completionAttempts: [], widths: [], targets: [], shots: [], actions: [], stores: {}, runtime: { numRuntimeErrors: null, numUnhandledErrors: null, numUnhandledRejections: null }, primary: null };
    run.contexts.push(row);
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, isMobile: size.mobile, hasTouch: size.mobile, reducedMotion: size.reducedMotion, locale: 'en-US', timezoneId: 'Europe/Belgrade', serviceWorkers: 'block' });
    const routeTasks = new Set(), responseTasks = new Set(), expectedBodies = new WeakMap(), declaredAborts = new Set(), faultUrls = new Set();
    let attempt = 0, permitRetry = false, page = null, contextFirstError = null;
    row.errorTimeline = [];
    const seen = [new Set(), new Set()], started = performance.now();
    const elapsed = () => performance.now() - started;
    const safeFailure = error => ({ name: error.name, message: error.message, stack: error.stack });
    const noteError = (error, channel) => { const value = { ...safeFailure(error), channel, observedMs: elapsed() }; row.errorTimeline.push(value); contextFirstError ??= error; return value; };
    await context.addInitScript(({ lab }) => {
      const native = { random: Math.random, date: Date, now: Date.now, perf: performance.now, interval: setInterval, timeout: setTimeout, raf: requestAnimationFrame };
      window.__WXI_EVENTS = [];
      window.__WXI_INITIAL_STORES = { local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])), session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])) };
      const normal = value => String(value ?? '').replace(/\s+/g, ' ').trim();
      for (const type of ['click', 'input', 'keydown', 'touchstart', 'touchmove', 'touchend']) window.addEventListener(type, event => {
        const element = event.target instanceof Element ? event.target : null, button = element?.closest('button');
        window.__WXI_EVENTS.push({ type, trusted: event.isTrusted, time: performance.now(), tag: element?.tagName ?? null, name: normal(button?.getAttribute('aria-label') || button?.textContent || element?.getAttribute('aria-label') || ''), key: event instanceof KeyboardEvent ? event.key : null, x: event instanceof MouseEvent ? event.clientX : null, y: event instanceof MouseEvent ? event.clientY : null });
      }, true);
      if (lab) Math.random = () => .999999;
      window.__WXI_NATIVE = () => ({ random: Math.random === native.random, labConstant: lab && Math.random !== native.random && Math.random() === .999999, date: Date === native.date && Date.now === native.now, performance: performance.now === native.perf, timers: setInterval === native.interval && setTimeout === native.timeout, raf: requestAnimationFrame === native.raf });
    }, { lab });
    async function routeRequest(route) {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      const bind = (body, status, type) => { const index = row.supplied.length; row.supplied.push({ index, url: request.url(), method: request.method(), status, bytes: body.length, sha256: sha(body) }); expectedBodies.set(request, { body, status, type, index }); };
      const fulfill = async (body, status, type, headers = {}) => { bind(body, status, type); await route.fulfill({ body, status, contentType: type, headers }); };
      const entries = [...url.searchParams], unique = new Set(entries.map(([name]) => name)).size === entries.length;
      const queryKey = unique ? key(url.pathname, Object.fromEntries(entries)) : null;
      if (url.origin === base.origin && method === 'GET') {
        const asset = localResponse(url);
        if (!asset) { row.transport.unexpected.push({ method, url: url.href, reason: 'undeclared local path' }); return route.abort(); }
        return fulfill(asset.body, 200, asset.contentType);
      }
      if (url.origin === archive.origin && records.has(queryKey)) {
        if (method === 'OPTIONS') { const headers = preflight(request, 'GET'); row.preflights.push({ key: queryKey, method: 'GET', attempt, headerNames: headers['access-control-allow-headers'] }); return route.fulfill({ status: 204, headers }); }
        if (method !== 'GET') { row.transport.writes.push({ method, path: url.pathname }); return route.abort(); }
        if (attempt > (lab ? 1 : 0) || seen[attempt].has(queryKey)) { row.transport.unexpected.push({ method, url: url.href, reason: 'duplicate/unauthorized loader attempt' }); return route.abort(); }
        if (attempt === 1) {
          const trustedRetry = permitRetry && await page.evaluate(() => window.__WXI_EVENTS.some(event => event.type === 'click' && event.trusted && event.name === 'Try again'));
          if (!trustedRetry) { row.transport.unexpected.push({ method, url: url.href, reason: 'second batch before real trusted Retry' }); return route.abort(); }
        }
        seen[attempt].add(queryKey);
        const record = records.get(queryKey), injected = lab && attempt === 0 && queryKey === faultKey;
        const supplied = injected ? { ...fault, body: faultBody } : record;
        const query = { key: queryKey, method, attempt, status: supplied.status, sha256: supplied.sha256, bytes: supplied.bytes, count: supplied.count, startMs: elapsed(), endMs: null };
        if (injected) faultUrls.add(url.href);
        await fulfill(supplied.body, supplied.status, 'application/json; charset=utf-8', cors);
        query.endMs = elapsed(); row.boot.batches[attempt].push(query); return;
      }
      if (url.origin === archive.origin && url.pathname === '/rest/v1/game_completions') {
        if (method === 'OPTIONS' && lab) { const headers = preflight(request, 'POST'); row.preflights.push({ path: url.pathname, method: 'POST', headerNames: headers['access-control-allow-headers'] }); return route.fulfill({ status: 204, headers }); }
        if (!lab || method !== 'POST' || url.search || row.completionAttempts.length) { row.transport.writes.push({ method, path: url.pathname, reason: 'undeclared/repeated completion' }); return route.abort(); }
        const body = request.postDataJSON(), handle = await page.evaluate(() => localStorage.getItem('dukb-guest-handle'));
        assert.deepEqual(body, { game: 'world-xi', score: 11, player_name: handle }, 'Exact local-only completion payload');
        const payload = Buffer.from('[]');
        row.completionAttempts.push({ method, urlPath: url.pathname, status: 201, virtual: true, body, requestBytes: Buffer.byteLength(request.postData()), responseSha256: sha(payload), atMs: elapsed() });
        return fulfill(payload, 201, 'application/json; charset=utf-8', cors);
      }
      if (method === 'GET' && fonts.has(url.href)) { const font = fonts.get(url.href); return fulfill(font.body, 200, font.contentType); }
      if ((method === 'GET' && (isLiveScore(url) || isFlag(url))) || (method === 'OPTIONS' && isLiveScore(url) && request.headers()['access-control-request-method'] === 'GET')) {
        declaredAborts.add(url.href); row.expectedAborts.push({ method, url: url.href, reason: isFlag(url) ? 'flags explicitly offline' : 'live scores explicitly offline' }); return route.abort();
      }
      if (url.origin === archive.origin && /^\/auth\/|^\/rest\/v1\/(?:profiles|global_rank|daily_badges)/.test(url.pathname)) row.authRequests++;
      const details = { method, url: url.href, reason: 'outside source-derived guest App fixture boundary' };
      if (!['GET', 'OPTIONS', 'HEAD'].includes(method)) row.transport.writes.push(details);
      else row.transport.unexpected.push(details);
      return route.abort();
    }
    await context.route('**/*', route => {
      const task = routeRequest(route).catch(async error => {
        row.transport.routeErrors.push(noteError(error, 'route'));
        try { await route.abort(); } catch { /* Primary route error remains retained. */ }
      }).finally(() => routeTasks.delete(task));
      routeTasks.add(task); return task;
    });
    try {
      page = await context.newPage();
      page.on('pageerror', error => row.transport.pageErrors.push(noteError(error, 'page')));
      page.on('console', message => {
        if (message.type() !== 'error') return;
        const value = { text: message.text(), url: message.location().url || '' };
        if ((declaredAborts.has(value.url) && /^Failed to load resource:/.test(value.text)) || (faultUrls.has(value.url) && /^Failed to load resource: the server responded with a status of 500\b/.test(value.text))) row.expectedConsoleErrors.push(value);
        else row.transport.consoleErrors.push(value);
      });
      page.on('requestfailed', request => {
        const value = { url: request.url(), method: request.method(), reason: request.failure()?.errorText ?? null };
        if (declaredAborts.has(value.url)) row.expectedFailed.push(value); else row.transport.failed.push(value);
      });
      page.on('response', response => {
        if (response.request().method() === 'OPTIONS') return;
        const task = (async () => {
          const expected = expectedBodies.get(response.request());
          if (!expected) { row.transport.responseErrors.push({ url: response.url(), reason: 'response without owned held Buffer' }); return; }
          const body = await response.body();
          const value = { index: expected.index, url: response.url(), status: response.status(), bytes: body.length, sha256: sha(body), contentType: response.headers()['content-type'] ?? null };
          row.assets.push(value);
          if (response.status() !== expected.status || body.length !== expected.body.length || sha(body) !== sha(expected.body)) row.transport.responseErrors.push({ ...value, expectedStatus: expected.status, expectedBytes: expected.body.length, expectedSha256: sha(expected.body) });
        })().catch(error => row.transport.responseErrors.push(noteError(error, 'response'))).finally(() => responseTasks.delete(task));
        responseTasks.add(task);
      });
      const events = () => page.evaluate(() => window.__WXI_EVENTS ?? []);
      const store = () => page.evaluate(() => ({ local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])), session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])) }));
      const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const width = async stage => row.widths.push({ stage, ...await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollY })) });
      const shot = async stage => {
        const file = id + '-' + stage + '.png', beforeY = await page.evaluate(() => scrollY);
        const body = await page.screenshot({ path: path.join(output, file), animations: 'allow' });
        const afterY = await page.evaluate(() => scrollY); assert.equal(afterY, beforeY, 'Screenshot does not move actual page');
        row.shots.push({ stage, file, bytes: body.length, sha256: sha(body), beforeY, afterY });
      };

      /* Native target revelation. A sampled path must belong to the target's scroll owner. */
      const measure = locator => locator.evaluate(element => {
        const box = element.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2, top = document.elementFromPoint(x, y);
        return { x, y, width: box.width, height: box.height, hit: !!top && (top === element || element.contains(top)), viewport: { width: innerWidth, height: innerHeight }, scrollY };
      });
      async function reveal(locator, name, isNew = false) {
        assert.equal(await locator.count(), 1, name + ': exactly one actual target');
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        for (let step = 0; step <= 12; step++) {
          const box = await measure(locator);
          if (box.hit && box.x >= 0 && box.x < size.width && box.y >= 8 && box.y < size.height - 8) {
            await frames(); const settled = await measure(locator);
            if (Math.abs(settled.y - box.y) < .5 && settled.hit) { row.targets.push({ name, isNew, ...settled }); return settled; }
          }
          assert(step < 12, name + ': finite native revelation limit');
          const plan = await locator.evaluate(element => {
            const scrollOwner = node => {
              for (let current = node instanceof Element ? node : null; current && current !== document.documentElement; current = current.parentElement) {
                const style = getComputedStyle(current);
                if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1) return current;
              }
              return document.scrollingElement;
            };
            const identity = node => {
              if (node === document.scrollingElement) return 'document';
              const steps = []; for (let current = node; current && current !== document.documentElement; current = current.parentElement) steps.push(current.tagName + ':' + [...current.parentElement.children].indexOf(current));
              return steps.reverse().join('/');
            };
            const owner = scrollOwner(element.parentElement), box = element.getBoundingClientRect(), ownerBox = owner === document.scrollingElement ? { top: 0, bottom: innerHeight } : owner.getBoundingClientRect();
            const low = Math.max(48, ownerBox.top + 16), high = Math.min(innerHeight - 48, ownerBox.bottom - 16), mid = (low + high) / 2;
            const distance = Math.min(240, high - low, Math.max(40, Math.abs(box.y + box.height / 2 - mid))), direction = box.y + box.height / 2 > mid ? 1 : -1;
            const startY = mid + direction * distance / 2, endY = mid - direction * distance / 2;
            const probes = [];
            for (const x of [...new Set([Math.round(innerWidth * .12), Math.round(innerWidth * .5), Math.round(innerWidth * .88), 12, innerWidth - 12])]) {
              const points = Array.from({ length: 9 }, (_, i) => {
                const y = startY + (endY - startY) * i / 8, hit = document.elementFromPoint(x, y), actual = scrollOwner(hit);
                let blocked = false;
                for (let current = hit; current && current !== owner && current !== document.documentElement; current = current.parentElement) if (/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(current.tagName) || getComputedStyle(current).touchAction === 'none') blocked = true;
                return { x, y, tag: hit?.tagName ?? null, owner: identity(actual), sameOwner: actual === owner, blocked };
              });
              probes.push({ x, points, safe: points.every(point => point.sameOwner && !point.blocked) });
            }
            return { targetOwner: identity(owner), ownerScroll: owner.scrollTop, documentY: scrollY, direction, distance, startY, endY, probes, chosen: probes.find(probe => probe.safe) ?? null };
          });
          row.actions.push({ type: 'native-reveal-plan', name, step, ...plan });
          assert(plan.distance >= 40 && plan.distance <= 240 && plan.chosen, name + ': no safe source-consistent native scroll path');
          const x = plan.chosen.x;
          if (size.mobile) {
            const cdp = await context.newCDPSession(page);
            try {
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: plan.startY }] });
              for (let move = 1; move <= 8; move++) { await new Promise(resolve => setTimeout(resolve, 40)); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: plan.startY + (plan.endY - plan.startY) * move / 8 }] }); }
              await new Promise(resolve => setTimeout(resolve, 200));
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            } finally { await cdp.detach(); }
          } else { await page.mouse.move(x, (plan.startY + plan.endY) / 2); await page.mouse.wheel(0, plan.direction * plan.distance); }
          await frames(); await frames();
        }
        throw Error(name + ': native target not revealed');
      }
      async function click(locator, name, isNew = false) {
        const point = await reveal(locator, name, isNew), beforeEvents = (await events()).length;
        const beforeY = await page.evaluate(() => scrollY);
        if (size.mobile) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
        await frames();
        const emitted = (await events()).slice(beforeEvents), afterY = await page.evaluate(() => scrollY);
        const action = { type: 'click', name, beforeY, afterY, trusted: emitted.some(event => event.type === 'click' && event.trusted), events: emitted };
        row.actions.push(action); assert(action.trusted, name + ': actual trusted click'); return action;
      }
      async function type(locator, text, name) {
        await click(locator, name + ' focus');
        const index = (await events()).length, beforeY = await page.evaluate(() => scrollY);
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(text);
        await frames();
        const emitted = (await events()).slice(index), action = { type: 'type', name, beforeY, afterY: await page.evaluate(() => scrollY), trusted: emitted.some(event => event.type === 'input' && event.trusted), events: emitted };
        row.actions.push(action); assert(action.trusted, name + ': actual trusted input'); return action;
      }
      const game = page.locator('main#dukb-main');
      const input = game.getByRole('textbox', { name: 'Name a player for this slot', exact: true });
      const draw = game.getByRole('button', { name: 'Draw my 11 nations', exact: true });
      const settledTurn = async () => {
        await page.waitForFunction(() => { const node = document.querySelector('main input[aria-label="Name a player for this slot"]'); return !!node && !node.disabled && [...document.querySelectorAll('main p')].some(p => /^Name a player from .+ who can play .+\. Accepts .+\.$/.test(p.textContent.trim())); }, null, { timeout: 10000 });
        await frames();
      };
      async function snapshot() {
        const raw = await game.evaluate((main, slots) => {
          const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
          const parents = [...main.querySelectorAll('div')].filter(element => {
            const placed = [...element.children].filter(child => child instanceof HTMLElement && child.style.left && child.style.top);
            return placed.length === slots.length && slots.every(slot => placed.some(child => child.style.left === slot.x + '%' && child.style.top === slot.y + '%'));
          });
          if (parents.length !== 1) throw Error('WX_APP_PITCH: expected one real11slot formation');
          const pitch = [...parents[0].children].filter(child => child instanceof HTMLElement && child.style.left && child.style.top).map(child => {
            const circle = child.firstElementChild, filled = circle.classList.contains('bg-primary'), active = circle.classList.contains('animate-pulse');
            return { x: child.style.left, y: child.style.top, filled, active, name: norm(child.lastElementChild.textContent), country: filled || active ? circle.querySelector('img')?.getAttribute('alt') || norm(circle.textContent) : null, text: norm(circle.textContent) };
          });
          const p = [...main.querySelectorAll('p')], instruction = p.map(node => norm(node.textContent)).find(value => /^Name a player from .+ who can play .+\. Accepts .+\.$/.test(value));
          const label = [...main.querySelectorAll('div')].map(node => norm(node.textContent)).filter(value => /^Slot \d+ of 11 · [A-Z]+$/.test(value));
          const count = p.map(node => norm(node.textContent)).find(value => /^\d+ unused player name(?:s)? fit(?:s)? this slot\.$/.test(value));
          const paid = [...main.querySelectorAll('button')].map(node => norm(node.textContent)).find(value => /^Respin nation \(\d+ left\)$/.test(value));
          const timer = [...main.querySelectorAll('span')].map(node => norm(node.textContent)).filter(value => /^\d+s$/.test(value));
          const field = main.querySelector('input[aria-label="Name a player for this slot"]');
          const won = [...main.querySelectorAll('h2')].some(node => norm(node.textContent) === 'World XI complete!');
          return { pitch, instruction: instruction ?? null, label: label.length === 1 ? label[0] : null, unusedCount: count ? Number(count.match(/^\d+/)[0]) : null, paid: paid ? Number(paid.match(/\d+/)[0]) : null, timer: timer.length === 1 ? Number(timer[0].slice(0, -1)) : null, phase: won ? 'won' : field ? 'playing' : 'other', filled: pitch.filter(p => p.filled).length, slotNumber: label.length === 1 ? Number(label[0].match(/^Slot (\d+)/)[1]) : null, focus: { tag: document.activeElement?.tagName ?? null, label: document.activeElement?.getAttribute('aria-label') ?? null, input: document.activeElement === field }, query: field?.value ?? null, now: performance.now(), scrollY };
        }, formation.slots);
        if (raw.instruction) {
          const match = /^Name a player from (.+) who can play ([A-Z]+)\. Accepts (.+)\.$/.exec(raw.instruction);
          assert(match, 'Actual settled instruction');
          const nations = ref.pools[mode].countries.filter(country => oracle.displayCountry(country) === match[1]);
          assert.equal(nations.length, 1, 'One exact mode country for displayed instruction');
          raw.country = nations[0]; raw.slot = match[2];
        } else { raw.country = null; raw.slot = null; }
        return raw;
      }
      async function help(beforePlay) {
        const trigger = page.getByRole('button', { name: 'How to play', exact: true });
        await click(trigger, beforePlay ? 'open real preplay guide' : 'reopen real guide');
        const dialog = page.getByRole('dialog', { name: 'How to play', exact: true }); await dialog.waitFor({ state: 'visible' });
        const text = (await dialog.textContent()).replace(/\s+/g, ' ').trim();
        if (beforePlay) { row.help.before = true; row.help.text = text; } else row.help.reopened = true;
        await click(dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'close real guide');
        await dialog.waitFor({ state: 'hidden' }); row.help.closed = true;
        row.help.returnedFocus = await trigger.evaluate(element => document.activeElement === element);
      }

      await page.goto(new URL('/world-xi', base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      row.stores.initial = await page.evaluate(() => window.__WXI_INITIAL_STORES);
      row.consent = await answerConsent(page, { wait: 5000, press: button => click(button, 'Reject all through actual consent') });
      assert.equal(row.consent, 'rejected'); assert.equal(await storedConsent(page), 'rejected');
      if (lab) {
        const error = game.getByText("Couldn't load the player database right now.", { exact: true }), retry = game.getByRole('button', { name: 'Try again', exact: true });
        await error.waitFor({ state: 'visible', timeout: 30000 }); await Promise.all([...routeTasks]);
        row.boot.fault = { errorText: await error.textContent(), retryVisible: await retry.isVisible(), drawAbsent: await draw.count() === 0, completions: row.completionAttempts.length, atMs: elapsed(), stores: await store() };
        assert.equal(row.boot.batches[0].length, 17, 'Retained first explicit failed17-read attempt');
        await reveal(retry, 'actual retry readiness');
        permitRetry = true; attempt = 1; row.boot.batches.push([]);
        const action = await click(retry, 'real Try again');
        row.boot.retry = { trusted: action.trusted, beforeBatch: 1, action };
      }
      await draw.waitFor({ state: 'visible', timeout: 30000 });
      row.boot.setupMs = elapsed();
      await page.evaluate(() => document.fonts.ready);
      await Promise.all([...routeTasks]); await Promise.all([...responseTasks]);
      row.native = await page.evaluate(() => window.__WXI_NATIVE());
      row.document = await page.evaluate(() => ({ characterSet: document.characterSet, pathname: location.pathname, userAgent: navigator.userAgent, snapshotPresent: !!document.querySelector('#dukb-snapshot') }));
      for (const [name, label] of [['expanded', 'Expanded'], ['classic', 'Classic'], ['2026', '2026 Nations']]) {
        const button = game.getByRole('button', { name: label, exact: true });
        await click(button, 'inspect ' + label + ' mode', true);
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        const sentence = (await game.getByText(/^\d+ nations are in the draw\. Each of your 11 slots gets a different one\.$/).textContent()).replace(/\s+/g, ' ').trim();
        row.setupModes.push({ mode: name, count: Number(sentence.match(/^\d+/)[0]), text: sentence, pressed: true });
      }
      await click(game.getByRole('button', { name: ({ expanded: 'Expanded', classic: 'Classic', '2026': '2026 Nations' })[mode], exact: true }), 'choose assigned mode', true);
      await help(true);
      await click(game.getByRole('button', { name: '4-3-3', exact: true }), 'choose4-3-3');
      await click(game.getByRole('button', { name: lab ? /^90 seconds\b/ : /^No timer\b/ }), 'choose actual timer');
      if (lab) await click(game.getByRole('button', { name: 'None', exact: true }), 'choose no paid respins');
      row.stores.setup = await store();
      await width('setup'); await shot('setup');
      const drawClick = await click(draw, 'draw assigned actual nations');
      await settledTurn();
      const first = await snapshot();
      await width('draw');
      const poolText = (await game.getByText(/^(?:Expanded|Classic|2026 Nations) pool$/).first().textContent()).trim();
      const observedMode = { 'Expanded pool': 'expanded', 'Classic pool': 'classic', '2026 Nations pool': '2026' }[poolText];
      row.draw = { mode: observedMode, poolText, beforeY: drawClick.beforeY, afterY: drawClick.afterY, first, action: drawClick };
      const used = new Set(), limit = lab ? 11 : 2;
      async function select(player, before, actionName) {
        const inputAction = await type(input, player.name, actionName + ' name');
        const label = [player.position, player.name, player.club].join(' ').replace(/\s+/g, ' ').trim();
        const suggestion = game.getByRole('button', { name: label, exact: true });
        await suggestion.waitFor({ state: 'visible', timeout: 5000 });
        const clickAction = await click(suggestion, actionName);
        if (before.filled === 10) await game.getByRole('heading', { name: 'World XI complete!', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
        else await settledTurn();
        const after = await snapshot(), point = before.pitch.find(value => value.active);
        assert(point, 'Actual active pitch slot before pick');
        return { player, country: before.country, slot: before.slot, point: { x: point.x, y: point.y }, before, after, input: inputAction, click: clickAction };
      }
      for (let index = 0; index < limit; index++) {
        await settledTurn(); let before = await snapshot();
        if (lab && index === 9) {
          assert.equal(before.filled, 9); assert.equal(before.slot, 'ST'); assert.equal(before.unusedCount, 0);
          await page.waitForFunction(() => [...document.querySelectorAll('main span')].some(span => { const text = span.textContent.trim(); return /^\d+s$/.test(text) && Number(text.slice(0, -1)) <= 87 && Number(text.slice(0, -1)) > 0; }), null, { timeout: 10000 });
          before = await snapshot();
          const free = game.getByRole('button', { name: 'Replace empty nation (free)', exact: true });
          const paid = game.getByRole('button', { name: 'Respin nation (0 left)', exact: true });
          row.recovery = { before, freeVisible: await free.isVisible(), paidDisabled: await paid.isDisabled(), click: null, after: null };
          const action = await click(free, 'free exhausted-slot replacement', true);
          /* Capture native focus before any input focus/reveal operation. */
          row.recovery.click = action; row.recovery.after = await snapshot();
          await width('recovered'); await shot('recovered');
          before = row.recovery.after;
        }
        const pool = ref.pools[mode].byCountry.find(([country]) => country === before.country)?.[1] ?? [];
        const slot = formation.slots.find(value => value.label === before.slot);
        assert(slot, 'Actual active slot belongs to selected formation');
        if (!row.wrongPosition.reached) {
          const wrong = pool.find(player => !used.has(player.name) && !oracle.fitsSlot(player, slot));
          if (wrong) {
            await type(input, wrong.name, 'wrong-position actual trial');
            const label = [wrong.position, wrong.name, wrong.club].join(' ').replace(/\s+/g, ' ').trim();
            const actual = game.getByRole('button', { name: label, exact: true });
            await click(actual, 'reject actual wrong-position suggestion');
            const after = await snapshot(), feedback = await game.getByText(new RegExp('^' + wrong.name.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') + ' plays ')).textContent();
            row.wrongPosition = { reached: true, player: wrong, slot: slot.label, before, after, feedback };
            before = after;
          }
        }
        const candidate = pool.find(player => !used.has(player.name) && oracle.fitsSlot(player, slot));
        assert(candidate, 'Actual held pool supplies a legal unused candidate');
        if (lab && index === 10) row.stores.preCompletion = await store();
        const pick = await select(candidate, before, 'native legal pick ' + (index + 1));
        row.selections.push(pick); used.add(candidate.name);
        if (lab && index === 8) { await width('exhausted'); await shot('exhausted'); }
      }
      row.final = await snapshot(); row.pathname = new URL(page.url()).pathname;
      if (lab) {
        row.resultRows = await game.evaluate(main => {
          const candidates = [...main.querySelectorAll('div')].filter(node => node.children.length === 11 && [...node.children].every(child => child.querySelector('span.block.font-semibold') && child.querySelector('span.block.text-xs')));
          if (candidates.length !== 1) throw Error('WX_APP_RESULTS: one actual11row result list');
          return [...candidates[0].children].map(node => ({ name: node.querySelector('span.block.font-semibold').textContent.trim(), club: node.querySelector('span.block.text-xs').textContent.trim(), country: node.children[1].querySelector('img')?.getAttribute('alt') || node.children[1].textContent.trim(), text: node.textContent }));
        });
        await page.waitForFunction(() => !!localStorage.getItem('dukb-local-completions'), null, { timeout: 5000 });
        await width('complete'); await shot('complete');
      } else {
        row.resultRows = [];
        await width('two-picks'); await shot('two-picks');
      }
      await help(false);
      row.stores.final = await store();
      row.nativeFinal = await page.evaluate(() => window.__WXI_NATIVE());
      row.fullEvents = await events();
      row.resources = await page.evaluate(() => performance.getEntriesByType('resource').map(value => ({ name: value.name, initiatorType: value.initiatorType, startTime: value.startTime, duration: value.duration, transferSize: value.transferSize, encodedBodySize: value.encodedBodySize, decodedBodySize: value.decodedBodySize })));
      row.navigation = await page.evaluate(() => performance.getEntriesByType('navigation').map(value => value.toJSON()));
      await Promise.all([...routeTasks]); await Promise.all([...responseTasks]);
      row.complete = true;
      validateContext(row, ref, output);
    } catch (error) {
      const awaited = noteError(error, 'awaited');
      row.primary = safeFailure(contextFirstError); row.complete = false;
      if (contextFirstError !== error) row.laterAwaitedFailure = awaited;
      if (!firstError) firstError = contextFirstError;
      run.primary ??= { context: id, ...row.primary };
      if (page) {
        try { fs.writeFileSync(path.join(output, id + '-failure.html'), await page.content()); } catch (capture) { row.failureCaptureError = safeFailure(capture); }
        try { await page.screenshot({ path: path.join(output, id + '-failure.png'), animations: 'allow' }); } catch (capture) { row.failureImageError = safeFailure(capture); }
        try { row.failureEvents = await page.evaluate(() => window.__WXI_EVENTS); } catch { /* Original primary remains. */ }
      }
    } finally {
      await Promise.allSettled([...routeTasks]); await Promise.allSettled([...responseTasks]);
      try { await context.close(); } catch (error) { row.cleanupError = noteError(error, 'context-close'); }
      if (contextFirstError) { row.primary ??= safeFailure(contextFirstError); row.complete = false; if (!firstError) firstError = contextFirstError; run.primary ??= { context: id, ...row.primary }; }
      json(id + '.json', row); json('run.json', run);
    }
  }
  if (firstError) throw firstError;
  const healthy = run.contexts.find(value => value.id === 'mini');
  for (const [name, owner, mutate] of faults) {
    const before = Buffer.from(JSON.stringify(healthy, null, 2) + '\n'), changed = structuredClone(healthy);
    mutate(changed);
    const changedBody = Buffer.from(JSON.stringify(changed, null, 2) + '\n');
    assert(!before.equals(changedBody), name + ': detached copy really changed');
    const beforeFile = 'control-' + name + '.before.json', changedFile = 'control-' + name + '.changed.json', restoredFile = 'control-' + name + '.restored.json';
    fs.writeFileSync(path.join(output, beforeFile), before); fs.writeFileSync(path.join(output, changedFile), changedBody);
    let primary = null;
    assert.throws(() => validateContext(readJSON(path.join(output, changedFile)), reference.contexts.mini, output), error => { primary = error.message; return error.name === 'AssertionError' && error.message.startsWith(owner + ':'); }, name + ': exact owned primary');
    fs.writeFileSync(path.join(output, restoredFile), before);
    validateContext(readJSON(path.join(output, restoredFile)), reference.contexts.mini, output);
    run.controls.push({ name, owner, kind: 'detached-observation', beforeFile, changedFile, restoredFile, beforeSha256: sha(before), changedSha256: sha(changedBody), restoredSha256: sha(before), changed: true, owned: true, restoredHealthy: true, primary });
    json('run.json', run);
  }
  run.complete = true; json('run.json', run);
  json('driver-verifier-summary.json', verifyRun(output));
} catch (error) {
  run.primary ??= { name: error.name, message: error.message, stack: error.stack };
  run.complete = false; json('run.json', run); console.error(error); process.exitCode = 1;
} finally {
  const cleanupErrors = [];
  if (browser) { try { await browser.close(); } catch (error) { cleanupErrors.push({ name: error.name, message: error.message, stack: error.stack }); } }
  try {
  const afterSources = [...heldSources].map(([file, before]) => {
    const after = fs.readFileSync(path.join(root, file)); assert(after.equals(before), 'Actual source held: ' + file);
    return { path: file, bytes: after.length, sha256: sha(after), git: git(after) };
  });
  const inputAfter = tree(inputRoot), distAfter = tree(distRoot);
  json('source-after.json', afterSources); json('input-after.json', inputAfter); json('dist-after.json', distAfter);
  assert.deepEqual(afterSources, sourceBefore); assert.deepEqual(inputAfter, inputBefore); assert.deepEqual(distAfter, distBefore);
  assert.equal(sha(fs.readFileSync(oracleEntry)), sha(oracleBody), 'Compiled source oracle body held');
  json('driver-holds.json', { status: 'held', source: true, input: true, dist: true, oracleBody: true, scope: 'Outer caller additionally holds complete source/deps/tools/browser/fonts/dist membership' });
  } catch (error) { cleanupErrors.push({ name: error.name, message: error.message, stack: error.stack }); }
  if (cleanupErrors.length) { run.cleanupErrors = cleanupErrors; run.primary ??= cleanupErrors[0]; run.complete = false; json('run.json', run); for (const error of cleanupErrors) console.error(error); process.exitCode = 1; }
}

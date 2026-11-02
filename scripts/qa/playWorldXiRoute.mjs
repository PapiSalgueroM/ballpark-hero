/* Actual built route, finite archived reads, native draws and two legal picks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const archiveRoot = path.resolve(process.env.WORLD_XI_ROUTE_OUT || path.join(root, 'world-xi-route-artifacts'));
const output = fs.mkdtempSync(path.join(archiveRoot, 'browser-'));
const base = new URL(process.env.BASE || 'http://127.0.0.1:4173');
assert.equal(base.origin, 'http://127.0.0.1:4173', 'Only the owned loopback build is played');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['src/pages/WorldXi.tsx', 'src/lib/worldXi.ts', 'src/lib/squadShape.ts', 'src/lib/positionFit.ts', 'src/lib/dealPlayers.ts', 'src/integrations/supabase/client.ts'];
const held = new Map(sourceFiles.map(file => [file, fs.readFileSync(path.join(root, file))]));
const checkedPath = name => {
  assert.equal(typeof name, 'string');
  assert(!path.isAbsolute(name));
  const resolved = path.resolve(archiveRoot, name);
  assert(resolved.startsWith(archiveRoot + path.sep), 'Archive path stays inside its owned folder');
  return resolved;
};
const manifestBytes = fs.readFileSync(path.join(archiveRoot, 'manifest.json'));
const archive = JSON.parse(manifestBytes);
assert.equal(archive.schemaVersion, 1);
assert.equal(archive.origin, 'https://flawuiqbvjobmkfkauhw.supabase.co');
assert.equal(archive.responses.length, 17);
const marketSelect = 'player_name,nationality,position,club,market_value_usd,year,age';
const historySelect = 'player_name,secondary_positions,primary_position';
const key = (pathname, params) => JSON.stringify([pathname, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
const expected = new Map();
for (const year of [2026, 2025]) for (let offset = 0; offset < 8000; offset += 1000) {
  const params = { select: marketSelect, year: 'eq.' + year, market_value_usd: 'gt.0', order: 'id.asc', offset: String(offset), limit: '1000' };
  expected.set(key('/rest/v1/player_market_values', params), { year, offset, params });
}
expected.set(key('/rest/v1/player_verified_positions', { select: historySelect, limit: '1000' }), { params: { select: historySelect, limit: '1000' } });
function matchSources(sources) {
  const paths = ['src/integrations/supabase/client.ts', 'src/lib/worldXi.ts'], seen = new Set();
  assert.equal(sources.length, paths.length, 'Two actual capture sources');
  for (const source of sources) {
    assert(paths.includes(source.path) && !seen.has(source.path), 'Unique actual capture source');
    seen.add(source.path);
    const bytes = held.get(source.path);
    assert.equal(source.bytes, bytes.length, 'Capture source byte count');
    assert.equal(source.sha256, sha(bytes), 'Capture source hash');
    assert.equal(source.gitBlob, createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), 'Capture source Git identity');
  }
}
function matchRows(record, spec, raw, data, ids) {
  assert.equal(record.kind, spec.year ? 'market' : 'history', 'Archive schedule kind');
  assert.equal(record.year, spec.year, 'Archive schedule year');
  assert.equal(record.offset, spec.offset, 'Archive schedule offset');
  assert.equal(record.limit, 1000, 'Archive schedule limit');
  assert.deepEqual(record.captureQuery, { pathname: record.browserQuery.pathname, params: { ...spec.params, select: spec.year ? 'id,' + marketSelect : historySelect } }, 'Exact capture projection and range');
  assert(Array.isArray(raw) && raw.length === record.count, 'Original response has the actual row count');
  if (spec.year) {
    assert.deepEqual(raw.map(({ id, ...row }) => row), data, 'Only source id is removed from browser rows');
    assert.deepEqual(raw.map(row => row.id), ids, 'Source ID vector matches raw response');
    assert(ids.every((id, index) => Number.isSafeInteger(id) && id > 0 && (index === 0 || id > ids[index - 1])), 'Ordered positive source IDs');
  } else assert.deepEqual(raw, data, 'History rows are unchanged');
}
matchSources(archive.sourceHolds);
const responses = new Map();
for (const record of archive.responses) {
  const responseKey = key(record.browserQuery.pathname, record.browserQuery.params);
  assert(expected.has(responseKey) && !responses.has(responseKey), 'Exactly the existing seventeen read shapes are archived');
  const body = fs.readFileSync(checkedPath(record.bodyFile));
  const raw = fs.readFileSync(checkedPath(record.rawFile));
  assert.equal(sha(body), record.bodySha256, 'Derived browser body is held');
  assert.equal(sha(raw), record.rawSha256, 'Original public response is held');
  const data = JSON.parse(body), rawData = JSON.parse(raw);
  let ids;
  assert(Array.isArray(data) && data.length === record.count, 'Archived row count agrees');
  if (record.kind === 'market') {
    const idBytes = fs.readFileSync(checkedPath(record.idsFile));
    assert.equal(sha(idBytes), record.idsSha256, 'Ordered source IDs are held');
    ids = JSON.parse(idBytes);
    assert.equal(ids.length, data.length);
    for (const row of data) assert.deepEqual(Object.keys(row).sort(), marketSelect.split(',').sort(), 'Only the actual seven fields enter the browser');
  } else {
    assert.equal(record.kind, 'history');
    for (const row of data) assert.deepEqual(Object.keys(row).sort(), historySelect.split(',').sort());
  }
  matchRows(record, expected.get(responseKey), rawData, data, ids);
  responses.set(responseKey, { ...record, data, body, ids, rawData });
}
assert.equal(responses.size, expected.size);
const allIds = new Set();
for (const year of [2026, 2025]) {
  let last = 0;
  for (const record of [...responses.values()].filter(record => record.year === year).sort((a, b) => a.offset - b.offset)) {
    for (const id of record.ids) { assert(id > last && !allIds.has(id), 'Source IDs remain ordered and unique across pages'); last = id; allIds.add(id); }
  }
}
const archiveControls = [], first = [...responses.values()].find(record => record.kind === 'market' && record.offset === 0);
assert(first.data.length > 0);
const spec = expected.get(key(first.browserQuery.pathname, first.browserQuery.params));
for (const [name, marker, change] of [
  ['derived-row', 'Only source id is removed', value => { value.data[0].club = 'Deliberately invalid copied club'; }],
  ['source-id', 'Source ID vector matches raw response', value => { value.ids[0] = -1; }],
  ['schedule', 'Archive schedule offset', value => { value.record.offset += 1000; }],
]) {
  const value = structuredClone({ record: { kind: first.kind, year: first.year, offset: first.offset, limit: first.limit, count: first.count, browserQuery: first.browserQuery, captureQuery: first.captureQuery }, data: first.data, ids: first.ids }), before = JSON.stringify(value);
  change(value); assert.notEqual(JSON.stringify(value), before, 'Archive control must change');
  assert.throws(() => matchRows(value.record, spec, first.rawData, value.data, value.ids), error => error.name === 'AssertionError' && error.message.includes(marker));
  matchRows(first, spec, first.rawData, first.data, first.ids);
  archiveControls.push({ name, ownedAssertion: marker, rejected: true, restored: true, changedSha256: sha(Buffer.from(JSON.stringify(value))) });
}
const wrongSource = structuredClone(archive.sourceHolds); wrongSource[0].sha256 = 'changed';
assert.throws(() => matchSources(wrongSource), error => error.name === 'AssertionError' && error.message.includes('Capture source hash'));
matchSources(archive.sourceHolds); archiveControls.push({ name: 'source-hold', ownedAssertion: 'Capture source hash', rejected: true, restored: true });
fs.writeFileSync(path.join(output, 'archive-binding-controls.json'), JSON.stringify(archiveControls, null, 2));
const market = [...responses.entries()].filter(([name]) => expected.get(name).year).sort(([a], [b]) => {
  const aa = expected.get(a), bb = expected.get(b); return bb.year - aa.year || aa.offset - bb.offset;
}).flatMap(([, record]) => record.data);
const history = [...responses.values()].find(record => record.kind === 'history').data;
const reportedRecords = [
  { player_name: 'Gustavo Gómez', nationality: 'Paraguay', position: 'Centre-Back', club: 'Sociedade Esportiva Palmeiras', market_value_usd: 5000000, year: 2025, age: 31 },
  { player_name: 'Ramón Sosa', nationality: 'Paraguay', position: 'Second Striker', club: 'Nottingham Forest', market_value_usd: 13000000, year: 2025, age: 25 },
];
function matchReportedRecord(rows, expected) {
  assert.deepEqual(rows.filter(row => row.player_name === expected.player_name), [expected], 'Exact archived reported record: ' + expected.player_name);
}
const reportedControls = [];
for (const record of reportedRecords) {
  matchReportedRecord(market, record);
  const changed = { ...record, club: 'Deliberately invalid copied club' };
  assert.notDeepEqual(changed, record, 'Reported record control must change');
  assert.throws(() => matchReportedRecord([changed], record), error => error.name === 'AssertionError' && error.message.includes('Exact archived reported record: ' + record.player_name));
  matchReportedRecord(market, record);
  reportedControls.push({ name: record.player_name, rejected: true, restored: true });
}
fs.writeFileSync(path.join(output, 'reported-record-witnesses.json'), JSON.stringify({ records: reportedRecords, controls: reportedControls }, null, 2));
console.log('World XI captured reported names: 2 exact seven-field records and 2 effective copied-record controls/restores.');

const helperFile = path.join(output, 'position-helpers.mjs');
const helper = await build({ stdin: { contents: `export { FORMATIONS, normalizePosition } from ${JSON.stringify(path.join(root, 'src/lib/squadShape.ts'))}; export { ALL_POSITIONS, fitsAllowed, slotAllowedPositions } from ${JSON.stringify(path.join(root, 'src/lib/positionFit.ts'))};`, resolveDir: root, sourcefile: 'world-xi-position-helpers.mjs' }, bundle: true, platform: 'node', format: 'esm', outfile: helperFile, write: false, metafile: true, alias: { '@': path.join(root, 'src') }, logLevel: 'silent' });
assert.equal(helper.outputFiles.length, 1);
assert.equal(path.resolve(helper.outputFiles[0].path), helperFile);
for (const file of ['src/lib/squadShape.ts', 'src/lib/positionFit.ts']) assert(Object.keys(helper.metafile.inputs).some(name => name.replaceAll('\\', '/').endsWith(file)), 'Actual pure helper input: ' + file);
fs.writeFileSync(helperFile, helper.outputFiles[0].contents);
fs.writeFileSync(path.join(output, 'position-inputs.json'), JSON.stringify(helper.metafile, null, 2));
const rules = await import(pathToFileURL(helperFile).href);
const formation = rules.FORMATIONS.find(value => value.name === '5-3-2');
assert(formation);
const played = new Map();
for (const row of history) {
  const positions = (row.secondary_positions ?? []).filter(pos => rules.ALL_POSITIONS.includes(pos));
  if (positions.length) played.set(row.player_name.trim(), { primary: rules.normalizePosition((row.primary_position ?? '').trim()), positions });
}
const names = new Map();
for (const row of market) {
  const name = (row.player_name ?? '').trim(), country = (row.nationality ?? '').split('/')[0].trim();
  const position = rules.normalizePosition((row.position ?? '').trim()), value = Number(row.market_value_usd) || 0, year = Number(row.year) || 0, club = (row.club ?? '').trim();
  if (!name || !country || !position || value <= 0) continue;
  const prior = names.get(name), sameClub = prior && year === prior.year ? prior.clubs.get(club) : null;
  if (!prior || year > prior.year || year === prior.year && (!sameClub || value > sameClub.value)) {
    const history = played.get(name);
    const positions = history?.primary === position ? history.positions.filter(pos => (position === 'GK') === (pos === 'GK')) : [];
    const player = { name, country, position, value, year, club, positions };
    if (prior && year === prior.year) prior.clubs.set(club, player);
    else names.set(name, { year, clubs: new Map([[club, player]]) });
  }
}
const players = [...names.values()].flatMap(row => [...row.clubs.values()]).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name) || a.club.localeCompare(b.club));
assert(players.length >= 800);
const canFit = (player, slot) => rules.fitsAllowed(player.position, rules.slotAllowedPositions(slot.label, slot.allowed), player.positions);
const shortName = name => name.trim().split(/\s+/).at(-1);
const fontRoot = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(archiveRoot, 'font-cache'));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(fontRoot, 'manifest.json'))).map(record => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(record.url).origin));
  assert(/^[a-f0-9]{64}$/.test(record.file));
  const body = fs.readFileSync(path.join(fontRoot, record.file));
  assert.equal(sha(body), record.sha256, 'Held real font bytes');
  return [record.url, { body, contentType: record.contentType }];
}));

function validate(row) {
  assert.equal(row.consent, 'rejected', 'Real consent was rejected');
  assert.equal(row.queries.length, 17, 'Exactly seventeen roster reads');
  const seen = new Set();
  for (const query of row.queries) {
    assert(responses.has(query.key) && !seen.has(query.key), 'Unique actual roster query');
    seen.add(query.key);
    const record = responses.get(query.key);
    assert.equal(query.sha256, record.bodySha256, 'Actual browser body hash');
    assert.equal(query.count, record.count, 'Actual browser body count');
  }
  assert.equal(row.help.before, true, 'Help before native play');
  assert.equal(row.help.reopened, true, 'Help can reopen');
  for (const text of ['The steps', 'The rules', 'A worked example', '2026 and 2025 records']) assert(row.help.text.includes(text), 'Actual loaded guide: ' + text);
  assert.equal(row.selections.length, 2, 'Two valid native selections');
  for (const [index, pick] of row.selections.entries()) {
    assert.equal(pick.beforeFilled, index, 'Prior Filled count');
    assert.equal(pick.afterFilled, index + 1, 'One Filled advance');
    assert.equal(pick.beforeSlot, index + 1, 'Prior native slot');
    assert.equal(pick.afterSlot, index + 2, 'Next native slot');
    assert.equal(pick.pitchText, shortName(pick.name), 'Selected name at the actual pitch slot');
    assert.equal(pick.filledCircle, true, 'Actual pitch slot is filled');
    assert(players.some(player => player.name === pick.name && player.club === pick.club && player.country === pick.country && canFit(player, formation.slots.find(slot => slot.label === pick.slot))), 'Actual archived legal move');
  }
  assert.equal(new Set(row.selections.map(pick => pick.name)).size, 2, 'Picks stay distinct');
  for (const measure of row.widths) assert(measure.scrollWidth <= measure.clientWidth, 'No horizontal page overflow');
  assert(row.widths.length >= 5, 'All main states measured');
  for (const target of row.targets) {
    assert(target.width >= 30 && target.height >= 30, 'Content control target floor');
    assert.equal(target.hit, true, 'Content control is reachable');
  }
  assert(row.targets.length >= 9, 'Native controls measured');
  assert.deepEqual(row.unexpected, [], 'No unexpected external transport');
  assert.deepEqual(row.writes, [], 'No attempted production writes');
  assert.deepEqual(row.pageErrors, [], 'No page runtime error');
  assert.deepEqual(row.consoleErrors, [], 'No unexpected console error');
  assert.deepEqual(row.failed, [], 'No unexpected failed request');
  assert(row.native.random && row.native.date && row.native.performance, 'Native random and clock remain');
  assert(Number.isFinite(row.boot.setupMs) && row.boot.setupMs >= row.boot.lastResponseMs && row.boot.lastResponseMs >= 0, 'Finite offline boot measurement');
  assert.equal(row.screenshots.length, 5, 'Original state images retained');
  const stages = ['setup', 'help', 'selection-1', 'selection-2', 'help-reopened'];
  for (const [index, shot] of row.screenshots.entries()) {
    assert.equal(shot.name, `${row.size.id}-${stages[index]}.png`, 'Owned screenshot path');
    const bytes = fs.readFileSync(path.join(output, shot.name));
    assert.equal(sha(bytes), shot.sha256, 'Original screenshot hash');
    assert.equal(bytes.readUInt32BE(16), row.size.width * row.size.dpr, 'Original screenshot width');
    assert.equal(bytes.readUInt32BE(20), row.size.height * row.size.dpr, 'Original screenshot height');
  }
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
let pending = null;
const expectedAborted = url => /^https:\/\/flagcdn\.com\/w(?:20|40|80|160|320|640|1280)\/[a-z]{2}(?:-[a-z0-9]+)?\.png$/.test(url) || (() => {
  const value = new URL(url);
  const entries = [...value.searchParams.entries()];
  const starts = value.searchParams.getAll('start_at');
  return value.origin === archive.origin && value.pathname === '/rest/v1/live_scores' && entries.length === 5
    && value.searchParams.get('select') === '*' && value.searchParams.get('order') === 'start_at.asc'
    && value.searchParams.get('limit') === '150' && starts.length === 2
    && starts.some(value => value.startsWith('gte.') && Number.isFinite(Date.parse(value.slice(4))))
    && starts.some(value => value.startsWith('lte.') && Number.isFinite(Date.parse(value.slice(4))));
})();
try {
  for (const size of [{ id: 'mini', width: 320, height: 664, dpr: 2, mobile: true }, { id: 'phone', width: 392, height: 731, dpr: 2, mobile: true }, { id: 'desktop', width: 1440, height: 900, dpr: 1, mobile: false }]) {
    const row = { size, queries: [], preflights: [], expectedAborts: [], expectedConsoleErrors: [], expectedFailed: [], unexpected: [], writes: [], pageErrors: [], consoleErrors: [], failed: [], widths: [], targets: [], actions: [], screenshots: [], selections: [], help: {}, boot: { lastResponseMs: 0 } };
    pending = row;
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, isMobile: size.mobile, hasTouch: size.mobile, locale: 'en-US', timezoneId: 'Europe/Belgrade' });
    const started = performance.now();
    const seen = new Set();
    const aborts = new Set();
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (!['GET', 'OPTIONS'].includes(method)) { row.writes.push({ url: url.href, method }); return route.abort(); }
      if (url.origin === base.origin && method === 'GET') return route.continue();
      const entries = [...url.searchParams.entries()];
      const noDuplicates = new Set(entries.map(([name]) => name)).size === entries.length;
      const queryKey = noDuplicates ? key(url.pathname, Object.fromEntries(entries)) : '';
      if (url.origin === archive.origin && responses.has(queryKey)) {
        if (method === 'OPTIONS') {
          const requested = request.headers()['access-control-request-method'];
          const headers = (request.headers()['access-control-request-headers'] || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
          const allowed = ['apikey', 'authorization', 'x-client-info', 'content-type', 'accept-profile', 'prefer', 'range', 'range-unit'];
          if (requested !== 'GET' || headers.some(name => !allowed.includes(name))) { row.unexpected.push({ url: url.href, method, reason: 'unexpected read preflight' }); return route.abort(); }
          row.preflights.push({ key: queryKey, method: requested, headerNames: headers });
          return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': base.origin, 'access-control-allow-methods': 'GET', 'access-control-allow-headers': headers.join(',') } });
        }
        if (seen.has(queryKey)) { row.unexpected.push({ url: url.href, method, reason: 'duplicate roster query' }); return route.abort(); }
        seen.add(queryKey);
        const record = responses.get(queryKey);
        const suppliedMs = performance.now() - started;
        await route.fulfill({ status: 200, body: record.body, contentType: 'application/json', headers: { 'access-control-allow-origin': base.origin } });
        row.queries.push({ key: queryKey, count: record.count, sha256: sha(record.body), suppliedMs, acknowledgedMs: performance.now() - started });
        row.boot.lastResponseMs = Math.max(row.boot.lastResponseMs, suppliedMs);
        return;
      }
      if (method === 'GET' && fonts.has(url.href)) { const font = fonts.get(url.href); return route.fulfill({ status: 200, body: font.body, contentType: font.contentType }); }
      if (method === 'OPTIONS' && url.origin === archive.origin && expectedAborted(url.href) && request.headers()['access-control-request-method'] === 'GET') {
        aborts.add(url.href); row.expectedAborts.push({ url: url.href, method, reason: 'declared live-score read preflight remains offline' }); return route.abort();
      }
      if (method === 'GET' && expectedAborted(url.href)) { aborts.add(url.href); row.expectedAborts.push({ url: url.href, method }); return route.abort(); }
      row.unexpected.push({ url: url.href, method, reason: 'not an archived read, held font or declared offline asset' });
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const error = { text: message.text(), url: message.location().url || '' };
      if (aborts.has(error.url) && /Failed to load resource/.test(error.text)) row.expectedConsoleErrors.push(error);
      else row.consoleErrors.push(error);
    });
    page.on('requestfailed', request => {
      const failed = { url: request.url(), method: request.method(), reason: request.failure()?.errorText ?? null };
      if (aborts.has(failed.url)) row.expectedFailed.push(failed); else row.failed.push(failed);
    });
    const width = async tag => row.widths.push({ tag, ...await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollY: window.scrollY })) });
    const target = async (locator, name) => {
      assert.equal(await locator.count(), 1, name + ': one actual control');
      await locator.scrollIntoViewIfNeeded();
      const value = await locator.evaluate(element => {
        const box = element.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { x: box.x, y: box.y, width: box.width, height: box.height, hit: !!top && (element === top || element.contains(top)) };
      });
      row.targets.push({ name, ...value });
      assert(value.hit, name + ': actual control is not covered');
      return await page.evaluate(() => window.scrollY);
    };
    const click = async (locator, name) => {
      const before = await target(locator, name);
      await locator.click({ timeout: 5000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      row.actions.push({ name, before, after: await page.evaluate(() => window.scrollY) });
    };
    const shot = async stage => {
      const name = `${size.id}-${stage}.png`, bytes = await page.screenshot({ path: path.join(output, name) });
      row.screenshots.push({ name, sha256: sha(bytes) });
    };
    const draw = page.getByRole('button', { name: 'Draw my 11 nations', exact: true });
    const setup = draw.waitFor({ state: 'visible', timeout: 30000 }).then(() => { row.boot.setupMs = performance.now() - started; });
    await page.goto(new URL('/world-xi', base).href, { waitUntil: 'domcontentloaded' });
    const consent = answerConsent(page, { wait: 5000 });
    await Promise.all([setup, consent]);
    row.consent = await storedConsent(page);
    await page.evaluate(() => document.fonts.ready);
    row.native = await page.evaluate(() => ({ random: /\[native code\]/.test(Math.random.toString()), date: /\[native code\]/.test(Date.now.toString()), performance: /\[native code\]/.test(performance.now.toString()) }));
    row.userAgent = await page.evaluate(() => navigator.userAgent);
    row.nations = Number((await page.getByText(/^\d+ nations are in the draw\./).innerText()).match(/^\d+/)[0]);
    await width('setup'); await shot('setup');
    const helpButton = page.getByRole('button', { name: 'How to play', exact: true });
    await click(helpButton, 'open real route help');
    let dialog = page.getByRole('dialog', { name: 'How to play', exact: true });
    await dialog.waitFor();
    row.help.before = await dialog.isVisible();
    row.help.text = (await dialog.innerText()).replace(/\s+/g, ' ');
    row.help.sections = [];
    for (const name of ['The steps', 'The rules', 'A worked example']) {
      const heading = dialog.getByRole('heading', { name, exact: true });
      await heading.scrollIntoViewIfNeeded();
      row.help.sections.push({ name, visible: await heading.isVisible() });
    }
    await width('help'); await shot('help');
    await click(dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'read guide and close help');
    await dialog.waitFor({ state: 'hidden' });
    await click(page.getByRole('button', { name: formation.name, exact: true }), 'choose actual formation');
    await click(page.getByRole('button', { name: /^No timer\b/ }), 'choose untimed play');
    await click(draw, 'draw native nations');
    const game = page.locator('main#dukb-main');
    const input = game.getByRole('textbox', { name: 'Name a player for this slot', exact: true });
    const instruction = game.getByText(/^Name a player from .+ who can play [A-Z]+\. Accepts .+\.$/);
    const slotNumber = async () => Number((await game.getByText(/^Slot \d+ of 11 · /).innerText()).replace(/\s+/g, ' ').trim().match(/^Slot (\d+)/)[1]);
    const filled = async () => Number((await game.getByText(/^Filled \d+\/11$/).innerText()).match(/\d+/)[0]);
    const pitch = game.locator('div[style*="aspect-ratio"]');
    for (let index = 0; index < 2; index += 1) {
      await input.waitFor({ state: 'visible' });
      await page.waitForFunction(() => { const input = document.querySelector('input[aria-label="Name a player for this slot"]'); return !!input && !input.disabled; });
      const text = (await instruction.innerText()).replace(/\s+/g, ' ');
      const parts = /^Name a player from (.+) who can play ([A-Z]+)\. Accepts (.+)\.$/.exec(text);
      assert(parts, 'Actual settled country and slot instruction');
      const country = [...new Set(players.map(player => player.country))].find(value => (value === 'Korea, South' ? 'South Korea' : value) === parts[1]);
      const slot = formation.slots.find(value => value.label === parts[2]);
      assert(country && slot, 'Native draw belongs to the archived pool and selected formation');
      const candidate = players.find(player => player.country === country && canFit(player, slot) && !row.selections.some(pick => pick.name === player.name));
      assert(candidate, 'Actual archived player covers the native slot');
      assert.equal(await pitch.count(), 1, 'One actual route pitch');
      const point = await pitch.evaluate(element => {
        const active = [...element.children].find(child => child.firstElementChild?.classList.contains('animate-pulse'));
        return active ? { x: active.style.left, y: active.style.top } : null;
      });
      assert(point, 'Actual active pitch slot is observed');
      const pick = { country, slot: slot.label, name: candidate.name, club: candidate.club, primary: candidate.position, beforeFilled: await filled(), beforeSlot: await slotNumber(), ...point };
      const before = await target(input, 'native player input ' + (index + 1));
      await input.fill(candidate.name);
      row.actions.push({ name: 'type actual archived name ' + (index + 1), before, after: await page.evaluate(() => window.scrollY) });
      const name = `${candidate.position} ${candidate.name} ${candidate.club}`.replace(/\s+/g, ' ').trim();
      const suggestion = game.getByRole('button', { name, exact: true });
      await suggestion.waitFor({ state: 'visible' });
      await click(suggestion, 'select actual country player ' + (index + 1));
      await page.waitForFunction(count => [...document.querySelectorAll('span')].some(element => element.textContent?.replace(/\s+/g, ' ').trim() === `Filled ${count}/11`), index + 1);
      await page.waitForFunction(() => { const input = document.querySelector('input[aria-label="Name a player for this slot"]'); return !!input && !input.disabled; });
      pick.afterFilled = await filled(); pick.afterSlot = await slotNumber();
      Object.assign(pick, await pitch.evaluate((element, point) => {
        const chosen = [...element.children].find(child => child.style.left === point.x && child.style.top === point.y);
        return { pitchText: chosen?.lastElementChild?.textContent?.trim() ?? null, filledCircle: chosen?.firstElementChild?.classList.contains('bg-primary') ?? false };
      }, point));
      row.selections.push(pick);
      const chosen = pitch.locator(`:scope > div[style*="left: ${point.x};"][style*="top: ${point.y};"]`);
      assert.equal(await chosen.count(), 1, 'Observed placement remains a native pitch slot');
      await chosen.scrollIntoViewIfNeeded();
      await width('selection-' + (index + 1)); await shot('selection-' + (index + 1));
    }
    await click(helpButton, 'reopen actual route help');
    dialog = page.getByRole('dialog', { name: 'How to play', exact: true });
    await dialog.waitFor();
    row.help.reopened = await dialog.isVisible();
    await dialog.getByRole('heading', { name: 'A worked example', exact: true }).scrollIntoViewIfNeeded();
    await width('help-reopened'); await shot('help-reopened');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    row.pathname = new URL(page.url()).pathname;
    row.finalFilled = await filled();
    await context.close();
    validate(row);
    const faults = [
      ['missing-query', 'Exactly seventeen roster reads', value => value.queries.pop()],
      ['duplicate-query', 'Unique actual roster query', value => { value.queries[1] = structuredClone(value.queries[0]); }],
      ['body', 'Actual browser body hash', value => { value.queries[0].sha256 = 'changed'; }],
      ['filled', 'One Filled advance', value => { value.selections[0].afterFilled = 0; }],
      ['slot', 'Next native slot', value => { value.selections[0].afterSlot = 1; }],
      ['placement', 'Selected name at the actual pitch slot', value => { value.selections[0].pitchText = 'changed'; }],
      ['legal', 'Actual archived legal move', value => { value.selections[0].country = 'changed'; }],
      ['help', 'Help before native play', value => { value.help.before = false; }],
      ['reopen', 'Help can reopen', value => { value.help.reopened = false; }],
      ['guide', 'Actual loaded guide', value => { value.help.text = ''; }],
      ['width', 'No horizontal page overflow', value => { value.widths[0].scrollWidth = value.widths[0].clientWidth + 1; }],
      ['target', 'Content control target floor', value => { value.targets[0].height = 29; }],
      ['covered', 'Content control is reachable', value => { value.targets[0].hit = false; }],
      ['transport', 'No unexpected external transport', value => { value.unexpected.push({ url: 'https://example.invalid/' }); }],
      ['write', 'No attempted production writes', value => { value.writes.push({ method: 'POST' }); }],
      ['runtime', 'No page runtime error', value => { value.pageErrors.push('synthetic observed error'); }],
      ['native', 'Native random and clock remain', value => { value.native.random = false; }],
      ['boot', 'Finite offline boot measurement', value => { value.boot.setupMs = null; }],
      ['image', 'Original screenshot hash', value => { value.screenshots[0].sha256 = 'changed'; }],
    ];
    row.controls = [];
    for (const [name, message, change] of faults) {
      const broken = structuredClone(row), before = JSON.stringify(broken);
      change(broken);
      assert.notEqual(JSON.stringify(broken), before, name + ': copied observation must change');
      assert.throws(() => validate(broken), error => error.name === 'AssertionError' && error.message.includes(message), name + ': its owned outcome must reject');
      validate(row);
      row.controls.push({ name, ownedAssertion: message, rejected: true, restored: true });
    }
    fs.writeFileSync(path.join(output, size.id + '.json'), JSON.stringify(row, null, 2));
    results.push(row); pending = null;
    console.log(`World XI ${size.id}: 17 archived reads, 2 valid native picks, 5 original images, ${row.controls.length} effective controls/restores; offline boot ${row.boot.setupMs.toFixed(1)}ms, last response supplied ${row.boot.lastResponseMs.toFixed(1)}ms.`);
  }
  assert.equal(results.length, 3);
  console.log('playWorldXiRoute: 3 actual route contexts, 6 valid native picks, 51 archived roster reads, 15 original images, 57 effective copied-observation controls/restores and 4 archive-binding controls/restores. No live or production-latency claim.');
} catch (error) {
  if (pending) fs.writeFileSync(path.join(output, pending.size.id + '-partial.json'), JSON.stringify(pending, null, 2));
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
  throw error;
} finally {
  await browser.close();
  for (const [file, bytes] of held) assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(bytes), 'Actual route source is held: ' + file);
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ scope: 'Actual built route with immutable archived responses; natural draws and first two valid picks. Unrelated live scores and flags are deliberately offline. No production/network latency or reported-name selection claim.', archiveManifestSha256: sha(manifestBytes), archiveBindingControls: archiveControls, contexts: results.length, picks: results.reduce((sum, row) => sum + row.selections.length, 0), controls: results.reduce((sum, row) => sum + row.controls.length, 0), sourceHolds: [...held].map(([file, bytes]) => ({ file, sha256: sha(bytes) })) }, null, 2));
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGIN = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const MARKET_FIELDS = ['player_name', 'nationality', 'position', 'club', 'market_value_usd', 'year', 'age'];
const HISTORY_FIELDS = ['player_name', 'secondary_positions', 'primary_position'];
const PAGE = 1000;
const PINS = {
  'src/integrations/supabase/client.ts': 'd055e064f5c1c0c90230ca562966ee04dfdcd3ce',
  'src/lib/worldXi.ts': '4a7c33fbfb7e60a0d78846a52b3b886233378969',
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const safeId = value => Number.isSafeInteger(value) && value > 0;
const nullableText = value => value === null || typeof value === 'string';
const schedule = [2026, 2025].flatMap(year => Array.from({ length: 8 }, (_, page) => ({
  kind: 'market', year, offset: page * PAGE, limit: PAGE,
  browserQuery: { pathname: '/rest/v1/player_market_values', params: { select: MARKET_FIELDS.join(','), year: 'eq.' + year, market_value_usd: 'gt.0', order: 'id.asc', offset: String(page * PAGE), limit: String(PAGE) } },
  captureQuery: { pathname: '/rest/v1/player_market_values', params: { select: ['id', ...MARKET_FIELDS].join(','), year: 'eq.' + year, market_value_usd: 'gt.0', order: 'id.asc', offset: String(page * PAGE), limit: String(PAGE) } },
})));
schedule.push({ kind: 'history', limit: PAGE,
  browserQuery: { pathname: '/rest/v1/player_verified_positions', params: { select: HISTORY_FIELDS.join(','), limit: String(PAGE) } },
  captureQuery: { pathname: '/rest/v1/player_verified_positions', params: { select: HISTORY_FIELDS.join(','), limit: String(PAGE) } },
});

function publicLiterals(bytes) {
  const file = ts.createSourceFile('client.ts', bytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length, 0, 'Held public client must parse');
  const found = new Map();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.modifiers ?? []).some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
      || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'].includes(declaration.name.text)) continue;
      assert(!found.has(declaration.name.text), 'Public literal export must be unique');
      assert(declaration.initializer && ts.isStringLiteral(declaration.initializer), 'Public client exports must be plain string literals');
      found.set(declaration.name.text, declaration.initializer.text);
    }
  }
  assert.equal(found.size, 2, 'Both held public literals are required');
  assert(found.get('SUPABASE_URL') === ORIGIN, 'Only the held public origin is allowed');
  const key = found.get('SUPABASE_PUBLISHABLE_KEY');
  let payload;
  try { const parts = key.split('.'); assert.equal(parts.length, 3); payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); }
  catch { throw new Error('The held literal must be the public anonymous key'); }
  assert(payload?.role === 'anon' && payload?.ref === 'flawuiqbvjobmkfkauhw' && payload?.iss === 'supabase', 'Only the held anonymous public role is allowed');
  return { key };
}

function rangeOf(value) {
  assert.equal(typeof value, 'string', 'Content-Range must be present');
  const full = /^(\d+)-(\d+)\/(\*|\d+)$/.exec(value);
  const empty = /^\*\/(\*|\d+)$/.exec(value);
  assert(full || empty, 'Content-Range must have the known PostgREST shape');
  const totalText = full ? full[3] : empty[1];
  const total = totalText === '*' ? null : Number(totalText);
  assert(total === null || Number.isSafeInteger(total) && total >= 0, 'Content-Range total must be safe');
  return { start: full ? Number(full[1]) : null, end: full ? Number(full[2]) : null, total };
}

function validate(rows, complete = true) {
  if (complete) assert.equal(rows.length, 17, 'Exactly seventeen fixed responses are required');
  else assert(rows.length > 0 && rows.length <= 17, 'Received prefix must stay inside the fixed schedule');
  const globalIds = new Set(), last = new Map(), closed = new Map();
  const totals = { '2026': 0, '2025': 0, history: 0 };
  for (const [index, response] of rows.entries()) {
    const spec = schedule[index];
    assert(response.status === 200 || response.status === 206, 'HTTP response must succeed');
    assert(Array.isArray(response.rows), 'Response data must be an array');
    assert(response.rows.length <= PAGE, 'Response exceeds its fixed limit');
    assert.equal(response.count, response.rows.length, 'Recorded body count mismatch');
    if (spec.kind === 'history' || spec.offset === 7000) assert(response.rows.length < PAGE, 'Full supported tail cannot prove completeness');
    const range = rangeOf(response.contentRangeHeader), offset = spec.offset ?? 0;
    if (response.rows.length === 0) assert(range.start === null && range.end === null, 'Empty response must declare an empty range');
    else assert(range.start === offset && range.end === offset + response.rows.length - 1, 'HTTP range does not match response length');
    assert(range.total === null || (response.rows.length === 0 ? range.total <= offset : range.total >= offset + response.rows.length), 'Content-Range total mismatch');
    if (spec.kind === 'market') {
      assert(!closed.get(spec.year) || response.rows.length === 0, 'Rows appeared after completed snapshot');
      if (response.rows.length < PAGE) closed.set(spec.year, true);
      for (const row of response.rows) {
        assert(sameKeys(row, ['id', ...MARKET_FIELDS]), 'Market projection shape mismatch');
        assert(safeId(row.id), 'Market row ID must be a positive safe integer');
        assert(row.id > (last.get(spec.year) ?? 0), 'Market IDs must be strictly increasing');
        assert(!globalIds.has(row.id), 'Market ID must be globally unique');
        assert(row.year === spec.year && typeof row.market_value_usd === 'number' && Number.isFinite(row.market_value_usd) && row.market_value_usd > 0, 'Market year or positive-value filter mismatch');
        assert(['player_name', 'nationality', 'position', 'club'].every(key => nullableText(row[key])) && (row.age === null || typeof row.age === 'number' && Number.isFinite(row.age)), 'Market nullable field shape mismatch');
        globalIds.add(row.id); last.set(spec.year, row.id);
      }
      totals[String(spec.year)] += response.rows.length;
    } else {
      for (const row of response.rows) assert(sameKeys(row, HISTORY_FIELDS) && nullableText(row.player_name) && nullableText(row.primary_position)
        && (row.secondary_positions === null || Array.isArray(row.secondary_positions) && row.secondary_positions.every(value => typeof value === 'string')), 'History projection shape mismatch');
      totals.history = response.rows.length;
    }
  }
  for (const year of [2026, 2025]) {
    if (rows.filter((_, index) => schedule[index].year === year).length !== 8) continue;
    assert(totals[String(year)] > 0 && totals[String(year)] < 8000, 'Market snapshot count is outside its proven bound');
    const declared = rows.filter((_, index) => schedule[index].year === year).map(row => rangeOf(row.contentRangeHeader).total).filter(value => value !== null);
    assert(declared.every(value => value === totals[String(year)]), 'Declared snapshot total differs from captured rows');
  }
  if (rows.length === 17) {
    const historyTotal = rangeOf(rows[16].contentRangeHeader).total;
    assert(historyTotal === null || historyTotal === totals.history, 'Declared history count differs from captured rows');
  }
  return totals;
}

function copyControls(out, captured) {
  const folder = path.join(out, 'capture-controls'); fs.mkdirSync(folder);
  const copy = value => JSON.parse(JSON.stringify(value));
  const controls = [
    ['status', 'HTTP response must succeed', rows => { rows[0].status = 500; }],
    ['null', 'Response data must be an array', rows => { rows[0].rows = null; }],
    ['error-object', 'Response data must be an array', rows => { rows[0].rows = { message: 'Deliberately copied response error' }; }],
    ['full-tail', 'Full supported tail cannot prove completeness', rows => {
      rows[7].rows = Array.from({ length: PAGE }, (_, i) => copy(captured[0].rows[i % captured[0].rows.length]));
      rows[7].count = PAGE; rows[7].contentRangeHeader = '7000-7999/*';
    }],
    ['duplicate-id', 'Market IDs must be strictly increasing', rows => { rows[0].rows[1].id = rows[0].rows[0].id; }],
    ['id-order', 'Market IDs must be strictly increasing', rows => { [rows[0].rows[0], rows[0].rows[1]] = [rows[0].rows[1], rows[0].rows[0]]; }],
    ['body-count', 'Recorded body count mismatch', rows => { rows[0].count += 1; }],
    ['range-count', 'HTTP range does not match response length', rows => { rows[0].contentRangeHeader = '0-1000/*'; }],
    ['page-gap', 'Rows appeared after completed snapshot', rows => {
      rows[0].rows = [copy(captured[0].rows[0])]; rows[0].count = 1; rows[0].contentRangeHeader = '0-0/*';
      rows[1].rows = [copy(captured[0].rows[1])]; rows[1].count = 1; rows[1].contentRangeHeader = '1000-1000/*';
    }],
  ];
  assert(captured[0].rows.length >= 2, 'Captured first page must support copied-response guard evidence');
  const originalHash = sha(Buffer.from(JSON.stringify(captured))), results = [];
  for (const [name, marker, mutate] of controls) {
    const changed = copy(captured); mutate(changed);
    const changedHash = sha(Buffer.from(JSON.stringify(changed))); assert.notEqual(changedHash, originalHash, 'Copied response control must change evidence');
    const replacements = changed.flatMap((response, index) => JSON.stringify(response) === JSON.stringify(captured[index]) ? [] : [{ index, response }]);
    const file = 'capture-controls/' + name + '.json'; fs.writeFileSync(path.join(out, file), JSON.stringify({ deliberatelyInvalidCopy: true, replacements }, null, 2) + '\n', { flag: 'wx' });
    const reread = JSON.parse(fs.readFileSync(path.join(out, file), 'utf8')), actual = captured.slice();
    for (const replacement of reread.replacements) actual[replacement.index] = replacement.response;
    assert.equal(sha(Buffer.from(JSON.stringify(actual))), changedHash);
    assert.throws(() => validate(actual), error => error.code === 'ERR_ASSERTION' && error.message.includes(marker), name + ': expected owned guard assertion');
    assert.equal(sha(Buffer.from(JSON.stringify(captured))), originalHash, 'Actual captured responses stay held');
    validate(captured);
    results.push({ name, file, sha256: sha(fs.readFileSync(path.join(out, file))), changedResponseSha256: changedHash, expectedAssertion: marker });
  }
  return results;
}

async function main() {
  assert.equal(process.env.CI, '1', 'Remote CI only');
  assert(process.env.WORLD_XI_ROUTE_OUT, 'Owned artifact output is required');
  const out = path.resolve(process.env.WORLD_XI_ROUTE_OUT);
  assert(out === path.join(ROOT, 'world-xi-route-artifacts'), 'Capture stays in the owned route artifact folder');
  fs.mkdirSync(out, { recursive: true });
  assert(!fs.existsSync(path.join(out, 'manifest.json')) && !fs.existsSync(path.join(out, 'responses')) && !fs.existsSync(path.join(out, 'capture-controls')), 'Capture output must be new; no request retry or overwrite');
  fs.mkdirSync(path.join(out, 'responses'));
  const held = new Map(Object.keys(PINS).map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
  for (const [file, bytes] of held) assert.equal(gitBlob(bytes), PINS[file], 'Held capture source pin mismatch: ' + file);
  const sourceHolds = [...held].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha(bytes), gitBlob: gitBlob(bytes) }));
  const captured = [], responses = [];
  fs.writeFileSync(path.join(out, 'source-holds.before.json'), JSON.stringify(sourceHolds, null, 2) + '\n', { flag: 'wx' });
  let attempted = 0, stage = 'public literals';
  try {
    const { key } = publicLiterals(held.get('src/integrations/supabase/client.ts'));
    for (const [index, spec] of schedule.entries()) {
      stage = spec.kind === 'market' ? spec.kind + '-' + spec.year + '-' + spec.offset : 'history';
      const url = new URL(spec.captureQuery.pathname, ORIGIN);
      for (const [name, value] of Object.entries(spec.captureQuery.params)) url.searchParams.set(name, value);
      assert(url.origin === ORIGIN && ['/rest/v1/player_market_values', '/rest/v1/player_verified_positions'].includes(url.pathname), 'Only fixed public read paths are allowed');
      attempted += 1;
      const response = await fetch(url, { method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store',
        headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      assert(!bytes.includes(Buffer.from(key)), 'Response must not echo request authentication');
      const stem = 'responses/' + String(index).padStart(2, '0') + '-' + stage;
      const rawFile = stem + '.raw.json'; fs.writeFileSync(path.join(out, rawFile), bytes, { flag: 'wx' });
      const contentRangeHeader = response.headers.get('content-range');
      fs.writeFileSync(path.join(out, stem + '.http.json'), JSON.stringify({ status: response.status, contentRange: contentRangeHeader, contentType: response.headers.get('content-type') }, null, 2) + '\n', { flag: 'wx' });
      assert(response.status === 200 || response.status === 206, 'HTTP response must succeed');
      const rows = JSON.parse(bytes.toString('utf8'));
      assert(Array.isArray(rows), 'Response data must be an array');
      captured.push({ status: response.status, rows, count: rows.length, contentRangeHeader });
      validate(captured, false);
      const body = spec.kind === 'market' ? rows.map(({ id, ...fields }) => fields) : rows;
      const bodyFile = stem + '.body.json', bodyBytes = Buffer.from(JSON.stringify(body) + '\n'); fs.writeFileSync(path.join(out, bodyFile), bodyBytes, { flag: 'wx' });
      const item = { kind: spec.kind, ...(spec.year ? { year: spec.year, offset: spec.offset } : {}), limit: PAGE,
        browserQuery: spec.browserQuery, captureQuery: spec.captureQuery, bodyFile, bodySha256: sha(bodyBytes), count: rows.length,
        rawFile, rawSha256: sha(bytes), status: response.status, contentRange: rangeOf(contentRangeHeader) };
      if (spec.kind === 'market') { item.idsFile = stem + '.ids.json'; const idsBytes = Buffer.from(JSON.stringify(rows.map(row => row.id)) + '\n'); fs.writeFileSync(path.join(out, item.idsFile), idsBytes, { flag: 'wx' }); item.idsSha256 = sha(idsBytes); }
      responses.push(item);
      fs.writeFileSync(path.join(out, 'capture-progress.json'), JSON.stringify({ attemptedRequests: attempted, completedResponses: responses.length, responses }, null, 2) + '\n');
    }
    const observed = validate(captured), controls = copyControls(out, captured);
    assert.equal(attempted, 17); assert.equal(responses.length, 17);
    const totals = { observed, historical: { '2026': 5865, '2025': 6414 }, differences: { '2026': observed['2026'] - 5865, '2025': observed['2025'] - 6414 }, matchesHistorical: observed['2026'] === 5865 && observed['2025'] === 6414 };
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ schemaVersion: 1, origin: ORIGIN, responses, totals, sourceHolds, captureControls: controls,
      scope: 'Exactly seventeen anonymous public GETs, no retries or writes. Raw archive QA only, not a new player-facing data import.' }, null, 2) + '\n', { flag: 'wx' });
    console.log('World XI roster capture: 17 public GETs, ' + observed['2026'] + ' current rows, ' + observed['2025'] + ' prior rows, ' + observed.history + ' history rows, ' + controls.length + ' effective copied-response guards.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'capture-failure.json'), JSON.stringify({ stage, attemptedRequests: attempted, completedResponses: responses.length,
      assertion: error?.code === 'ERR_ASSERTION' ? error.message : 'Fixed read capture stopped. No retry was attempted.' }, null, 2) + '\n', { flag: 'wx' });
    throw new Error('World XI fixed read capture failed. Inspect the owned artifact receipts.');
  } finally {
    const after = [...held].map(([file]) => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { path: file, bytes: bytes.length, sha256: sha(bytes), gitBlob: gitBlob(bytes) }; });
    fs.writeFileSync(path.join(out, 'source-holds.after.json'), JSON.stringify(after, null, 2) + '\n', { flag: 'wx' });
    assert.deepEqual(after, sourceHolds, 'Capture source bytes must stay held');
  }
}

main().catch(() => { console.error('World XI fixed capture stopped. No retry or production write was attempted.'); process.exitCode = 1; });

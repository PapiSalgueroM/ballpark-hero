import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
assert(process.env.WORLD_XI_QUALITY_OUT, 'Owned artifact folder required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outRoot = path.resolve(process.env.WORLD_XI_QUALITY_OUT), archive = path.join(outRoot, 'original-capture');
const out = fs.mkdtempSync(path.join(outRoot, 'archive-witness-'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['src/lib/worldXi.ts', 'src/lib/worldXiNationPools.ts', 'src/integrations/supabase/client.ts', 'src/lib/squadShape.ts', 'src/lib/positionFit.ts', 'package.json', 'package-lock.json'];
const held = new Map(sourcePaths.map(file => [file, fs.readFileSync(path.join(root, file))]));
const manifestBytes = fs.readFileSync(path.join(archive, 'manifest.json'));
assert.equal(sha(manifestBytes), '93075e1a52b07446145b459987ba51f636adb9078265442d8e3049447ba14ebf', 'Exact original capture manifest');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.responses.length, 17);
assert.equal(manifest.origin, 'https://flawuiqbvjobmkfkauhw.supabase.co');
const select = 'player_name,nationality,position,club,market_value_usd,year,age';
const historySelect = 'player_name,secondary_positions,primary_position';
const key = (pathname, params) => JSON.stringify([pathname, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
const expected = new Set();
for (const year of [2026, 2025]) for (let offset = 0; offset < 8000; offset += 1000) expected.add(key('/rest/v1/player_market_values', { select, year: 'eq.' + year, market_value_usd: 'gt.0', order: 'id.asc', offset: String(offset), limit: '1000' }));
expected.add(key('/rest/v1/player_verified_positions', { select: historySelect, limit: '1000' }));
const responses = new Map(), archiveHolds = new Map(), rawRows = [];
function readArchive(file, expectedSha) {
  assert(file.startsWith('responses/') && !file.includes('..') && !path.isAbsolute(file));
  const bytes = fs.readFileSync(path.join(archive, file)); assert.equal(sha(bytes), expectedSha, 'Original response bytes: ' + file);
  archiveHolds.set(file, expectedSha); return JSON.parse(bytes);
}
for (const record of manifest.responses) {
  const queryKey = key(record.browserQuery.pathname, record.browserQuery.params);
  assert(expected.has(queryKey) && !responses.has(queryKey), 'Unique existing archived query');
  const data = readArchive(record.bodyFile, record.bodySha256), raw = readArchive(record.rawFile, record.rawSha256);
  assert(Array.isArray(data) && data.length === record.count && Array.isArray(raw) && raw.length === record.count);
  if (record.kind === 'market') {
    const ids = readArchive(record.idsFile, record.idsSha256);
    assert.deepEqual(raw.map(({ id, ...row }) => row), data, 'Only id is removed from actual public rows');
    assert.deepEqual(raw.map(row => row.id), ids, 'Actual source IDs held');
    rawRows.push(...data);
  } else { assert.equal(record.kind, 'history'); assert.deepEqual(raw, data, 'History DTO unchanged'); }
  responses.set(queryKey, { data, before: sha(Buffer.from(JSON.stringify(data))), record });
}
assert.equal(responses.size, 17);
function curacaoWitness(rows) {
  const found = rows.filter(row => row.nationality === 'Curacao');
  assert.deepEqual({ total: found.length, current: found.filter(row => row.year === 2026).length, previous: found.filter(row => row.year === 2025).length }, { total: 8, current: 3, previous: 5 }, 'WX_ARCHIVE_LITERAL_CURACAO_8_ROWS_3_AND_5');
  assert.equal(rows.filter(row => row.nationality === 'Curaçao').length, 0, 'Stored spelling is literal, not rewritten');
  return found;
}
const curacaoRows = curacaoWitness(rawRows);
const copiedRows = rawRows.map(row => ({ ...row }));
copiedRows[copiedRows.findIndex(row => row.nationality === 'Curacao')].nationality = 'Fixture changed copied country';
const copyFile = path.join(out, 'literal-spelling-control.json');
fs.writeFileSync(copyFile, JSON.stringify(copiedRows));
assert.notEqual(sha(fs.readFileSync(copyFile)), sha(Buffer.from(JSON.stringify(rawRows))), 'Copied witness must change');
assert.throws(() => curacaoWitness(JSON.parse(fs.readFileSync(copyFile))), error => error.name === 'AssertionError' && error.message.includes('WX_ARCHIVE_LITERAL_CURACAO_8_ROWS_3_AND_5'));
curacaoWitness(rawRows);

const calls = new Set(), transportErrors = [];
globalThis.__wxRecoveryArchiveClient = {
  from(table) {
    assert(['player_market_values', 'player_verified_positions'].includes(table), 'Only the original read tables');
    const params = {};
    const request = {
      select(columns) { assert.equal(params.select, undefined); assert.equal(columns, (table === 'player_market_values' ? select : historySelect).replaceAll(',', ', '), 'Exact source projection before SDK cleanup'); params.select = columns.replaceAll(', ', ','); return request; },
      eq(column, value) { assert.equal(table, 'player_market_values'); assert.equal(column, 'year'); assert([2026, 2025].includes(value)); params.year = 'eq.' + value; return request; },
      gt(column, value) { assert.equal(column, 'market_value_usd'); assert.equal(value, 0); params.market_value_usd = 'gt.0'; return request; },
      order(column, options) { assert.equal(column, 'id'); assert.equal(options.ascending, true); params.order = 'id.asc'; return request; },
      range(from, to) { assert.equal(to, from + 999); assert(Number.isInteger(from) && from >= 0 && from <= 7000 && from % 1000 === 0); params.offset = String(from); params.limit = '1000'; return request; },
      limit(value) { assert.equal(table, 'player_verified_positions'); assert.equal(value, 1000); params.limit = '1000'; return request; },
      then(ok, bad) {
        try {
          const queryKey = key('/rest/v1/' + table, params), response = responses.get(queryKey);
          assert(response && !calls.has(queryKey), 'Every actual loader read matches one original response');
          calls.add(queryKey); return Promise.resolve({ data: response.data, error: null }).then(ok, bad);
        } catch (error) { transportErrors.push({ name: error.name, message: error.message }); return Promise.reject(error).then(ok, bad); }
      },
    };
    return request;
  },
};
const bundleFile = path.join(out, 'actual-loader-and-nation-helper.mjs');
const clientPath = path.join(root, 'src/integrations/supabase/client').replaceAll('\\', '/');
try {
  const bundle = await build({ absWorkingDir: root, stdin: { contents: `export { fetchWorldXiPool } from ${JSON.stringify(path.join(root, 'src/lib/worldXi.ts'))}; export { selectWorldXiNationPool } from ${JSON.stringify(path.join(root, 'src/lib/worldXiNationPools.ts'))};`, resolveDir: root, sourcefile: 'archive-read-entry.mjs' },
    outfile: bundleFile, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true, alias: { '@': path.join(root, 'src') }, logLevel: 'silent',
    plugins: [{ name: 'exact-public-read-archive', setup(builder) {
      builder.onResolve({ filter: /supabase\/client(?:\.ts)?$/ }, args => {
        const name = args.path.replaceAll('\\', '/');
        if (name === '@/integrations/supabase/client' || name === clientPath || name === clientPath + '.ts') return { path: 'exact-public-read-archive', namespace: 'wx-archive' };
        return null;
      });
      builder.onLoad({ filter: /^exact-public-read-archive$/, namespace: 'wx-archive' }, () => ({ loader: 'js', contents: "export const supabase = globalThis.__wxRecoveryArchiveClient; export const SUPABASE_URL = 'https://flawuiqbvjobmkfkauhw.supabase.co'; export const SUPABASE_PUBLISHABLE_KEY = 'archive-only-not-a-credential';" }));
    } }],
  });
  assert.equal(bundle.outputFiles.length, 1); assert.equal(path.resolve(bundle.outputFiles[0].path), bundleFile);
  for (const file of ['src/lib/worldXi.ts', 'src/lib/worldXiNationPools.ts']) assert(Object.keys(bundle.metafile.inputs).some(input => input.replaceAll('\\', '/').endsWith(file)), 'Actual source input: ' + file);
  assert(Object.keys(bundle.metafile.inputs).some(input => input.startsWith('wx-archive:')), 'Exact archived query transport is bound');
  assert(!Object.keys(bundle.metafile.inputs).some(input => input.replaceAll('\\', '/').endsWith('src/integrations/supabase/client.ts')), 'Actual SDK session client is not loaded');
  fs.writeFileSync(bundleFile, bundle.outputFiles[0].contents); fs.writeFileSync(path.join(out, 'metafile.json'), JSON.stringify(bundle.metafile, null, 2));
  const actual = await import(pathToFileURL(bundleFile).href), data = await actual.fetchWorldXiPool();
  assert.deepEqual(transportErrors, [], 'Archive transport setup must be valid');
  assert.equal(calls.size, 17, 'Actual loader consumed exactly the original seventeen reads');
  assert(data, 'Actual loader admitted the original capture');
  const loadedBefore = JSON.stringify({ players: data.players, countries: data.countries, byCountry: [...data.byCountry] });
  const modes = {};
  for (const mode of ['classic', 'expanded', '2026']) {
    const selected = actual.selectWorldXiNationPool(data, mode);
    assert.equal(selected.players, data.players, 'Real helper preserves loaded player references');
    modes[mode] = { countries: selected.countries.length, includesStoredCuracao: selected.countries.includes('Curacao'), includesCanonicalCuracao: selected.countries.includes('Curaçao') };
  }
  assert.equal(JSON.stringify({ players: data.players, countries: data.countries, byCountry: [...data.byCountry] }), loadedBefore, 'Actual loaded DTO remains unchanged');
  for (const response of responses.values()) assert.equal(sha(Buffer.from(JSON.stringify(response.data))), response.before, 'All original seven-field/history DTOs remain unchanged');
  const summary = { scope: 'Original artifact only, actual loader and helper, no HTTP or real roster rows added to source. Canonical omission is an observation, not a setup failure.',
    originalRun: 41424730828, artifact: 13132710070, manifestSha256: sha(manifestBytes), publicRequests: 0, actualLoaderReads: calls.size,
    literalRows: { total: curacaoRows.length, current: 3, previous: 5 }, loadedCuracaoPlayers: data.byCountry.get('Curacao')?.length ?? 0, modes,
    canonicalOmissionObserved: !modes['2026'].includesCanonicalCuracao, copiedLiteralControl: { changed: true, ownedAssertion: 'WX_ARCHIVE_LITERAL_CURACAO_8_ROWS_3_AND_5', rejected: true, restored: true },
    sourceHolds: [...held].map(([file, bytes]) => ({ file, sha256: sha(bytes) })) };
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(out, 'actual-curacao-archive-rows.json'), JSON.stringify(curacaoRows, null, 2));
  console.log('WORLD_XI_ARCHIVE_WITNESS: ' + JSON.stringify(summary));
} finally {
  delete globalThis.__wxRecoveryArchiveClient;
  for (const [file, bytes] of held) assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(bytes), 'Actual source held: ' + file);
  for (const [file, expectedSha] of archiveHolds) assert.equal(sha(fs.readFileSync(path.join(archive, file))), expectedSha, 'Original archive held: ' + file);
  console.log('World XI original archive witness: ' + out);
}

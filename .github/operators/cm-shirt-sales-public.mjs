/* Private CM shirt sales remote publication candidate. Requires source review before adoption.
   Reads public static bytes only. It never executes fetched application code. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const env = process.env, out = path.resolve(env.READBACK_OUT), root = process.cwd();
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
const roles = ['clubEngine', 'clubGuide', 'entry', 'finance', 'updates'], fixed = ['/', '/club-manager', '/whats-new'];
const mode = env.OPERATOR_MODE, origin = 'https://douknowball.com', bootPath = '/prerender-boot.js';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const assetPath = value => assert.match(value || '', /^\/assets\/[A-Za-z0-9_.-]+\.js$/);
const stem = value => path.basename(value).replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
const verifyAsset = (body, wanted) => assert.equal(hash(body), wanted, 'CM_SHIRT_PUBLIC_ASSET_DRIFT: actual role bytes differ');
function verifyEntryURL(value) {
  const url = value instanceof URL ? value : new URL(value, origin);
  assert.equal(url.href, origin + url.pathname, 'CM_SHIRT_PUBLIC_ENTRY_URL: own origin without credentials, query or fragment');
  return url.pathname;
}
const parsePins = (text, wantedHash) => {
  assert.match(wantedHash || '', /^[a-f0-9]{64}$/); assert.equal(hash(text || ''), wantedHash);
  const pins = JSON.parse(text); assert.deepEqual(Object.keys(pins).sort(), roles);
  for (const pin of Object.values(pins)) { assert.deepEqual(Object.keys(pin).sort(), ['path', 'sha256']); assetPath(pin.path); assert.match(pin.sha256, /^[a-f0-9]{64}$/); }
  for (const a of Object.values(pins)) for (const b of Object.values(pins)) if (a.path === b.path) assert.equal(a.sha256, b.sha256);
  return pins;
};
function bindings() {
  assert(['strict', 'intake', 'readback'].includes(mode));
  for (const key of ['SOURCE_SHA', 'QUALIFIED_BUILD_SHA']) assert.match(env[key] || '', /^[a-f0-9]{40}$/);
  for (const key of ['QUALIFIED_RUN_ID', 'QUALIFIED_ARTIFACT_ID']) assert.match(env[key] || '', /^[1-9][0-9]+$/);
  assert.match(env.QUALIFIED_ZIP_SHA256 || '', /^[a-f0-9]{64}$/);
  assert.match(env.EXPECTED_DEPLOYMENT || '', /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.notEqual(env.EXPECTED_DEPLOYMENT, '00000000-0000-0000-0000-000000000000');
  const ci = parsePins(env.CI_ASSET_PINS_JSON, env.CI_ASSET_PINS_SHA256);
  if (mode !== 'strict') {
    for (const key of ['PRIOR_OPERATOR_SHA']) assert.match(env[key] || '', /^[a-f0-9]{40}$/);
    for (const key of ['PRIOR_RUN_ID', 'PRIOR_ARTIFACT_ID']) assert.match(env[key] || '', /^[1-9][0-9]+$/);
    assert.match(env.PRIOR_ZIP_SHA256 || '', /^[a-f0-9]{64}$/);
  }
  if (mode === 'intake') assetPath(env.OBSERVED_ENTRY);
  const pins = mode === 'readback' ? parsePins(env.OBSERVED_ASSET_PINS_JSON, env.OBSERVED_ASSET_PINS_SHA256) : ci;
  return { ci, pins };
}
const bound = bindings();
if (process.argv.includes('--validate-bindings')) { write('bindings.json', { mode, source: env.SOURCE_SHA, qualified: env.QUALIFIED_BUILD_SHA, ...bound }); process.exit(0); }
if (process.argv.includes('--prepare')) {
  const { init, parse } = await import('es-module-lexer'); await init;
  const dist = path.resolve(out, 'qualified-dist');
  const body = file => fs.readFileSync(path.join(dist, file.slice(1)));
  for (const row of Object.values(bound.ci)) assert.equal(hash(body(row.path)), row.sha256, 'CI role pin must equal qualified artifact bytes');
  const imports = file => parse(body(file).toString())[0].filter(item => item.n).map(item => new URL(item.n, origin + file)).filter(url => url.origin === origin && !url.username && !url.password && !url.hash && !url.search && /^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(url.pathname)).map(url => url.pathname);
  const pathsTo = target => {
    const queue = [[bound.ci.entry.path]], seen = new Set();
    while (queue.length) {
      const chain = queue.shift(), node = chain.at(-1); if (node === target) return chain;
      if (seen.has(node)) continue; seen.add(node);
      for (const next of imports(node)) if (!seen.has(next)) queue.push([...chain, next]);
    }
    throw new Error('Qualified import graph cannot reach role ' + target);
  };
  const chains = Object.fromEntries(roles.map(role => [role, pathsTo(bound.ci[role].path)]));
  const neededStems = [...new Set(Object.values(chains).flat().map(stem))]; assert(neededStems.length <= 16, 'At most16 needed qualified role path assets');
  const source = fs.readFileSync('.github/workflows/legal-ai-privacy-public-readback.yml', 'utf8');
  const pin = '37d187d3bc4659ebfdda5d010fb157972c4c8e797b4bab2b3fc27d20ddfe15cb';
  assert.equal(hash(source), pin); assert.throws(() => assert.equal(hash(source + '\n'), pin));
  const begin = '          cat > "$READBACK_OUT/read-only.cjs" <<\'JS\'\n', end = '\n          JS\n';
  assert.equal(source.split(begin).length, 2); const tail = source.split(begin)[1], stop = tail.indexOf(end); assert(stop > 0);
  let guard = tail.slice(0, stop).replace(/^          /gm, '');
  assert(guard.trimEnd().endsWith('module.exports = { ORIGIN, checkedURL };'));
  const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
  const all = [...new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map(row => (row[1] || '/').replace(/\/$/, '') || '/'))].filter(route => route !== '/');
  assert(all.length >= 24); const sample = Array.from({ length: 24 }, (_, i) => all[Math.floor(i * all.length / 24)]);
  assert.equal(new Set(sample).size, 24);
  const from = guard.indexOf('const paths = new Set('), to = guard.indexOf('function checkedURL(');
  assert(from >= 0 && to > from && guard.slice(from, to).includes("addPublic('public')"));
  const exact = [...new Set([...Object.values(bound.ci), ...Object.values(bound.pins)].map(row => row.path).concat(mode === 'intake' ? [env.OBSERVED_ENTRY] : []))];
  guard = guard.slice(0, from) + 'const paths = new Set(' + JSON.stringify([...new Set([...fixed, bootPath, ...sample])]) + ');\nconst allowedAssets = new Set(' + JSON.stringify(exact) + ');\nconst intakeStems = new Set(' + JSON.stringify(mode === 'intake' ? neededStems : []) + ');\n' + guard.slice(to);
  const assetLines = guard.split('\n').filter(line => line.trim().startsWith('const asset = ')); assert.equal(assetLines.length, 1);
  guard = guard.replace(assetLines[0], "  const asset = allowedAssets.has(url.pathname) || (url.pathname.startsWith('/assets/') && intakeStems.has(require('node:path').basename(url.pathname).replace(/-[A-Za-z0-9_-]{8}\\.js$/, '')));");
  const requestLine = '      const response = await native(input, { ...options, maxRedirects: 0, maxRetries: 0 });';
  assert.equal(guard.split(requestLine).length, 2);
  guard = guard.replace(requestLine, "      const fresh = checkedURL(typeof input === 'string' || input instanceof URL ? input : input.url(), method);\n      fresh.searchParams.set('cm_shirt_public_audit', process.env.GITHUB_RUN_ID + '.' + process.env.GITHUB_RUN_ATTEMPT);\n      const response = await native(fresh.href, { ...options, maxRedirects: 0, maxRetries: 0 });\n      const headers = { ...response.headers() }; delete headers['set-cookie'];\n      record('public-response-headers.jsonl', { method, path: fresh.pathname, status: response.status(), headers });\n      if (!fresh.pathname.startsWith('/assets/') || headers['x-deployment-id']) deployment(headers['x-deployment-id']);");
  guard = "const assert = require('node:assert/strict');\nconst env = process.env;\nconst uuid = " + JSON.stringify(uuid) + ";\n" + deployment.toString() + '\n' + guard;
  write('read-only.cjs', guard);
  write('preparation.json', { source: env.SOURCE_SHA, qualified: env.QUALIFIED_BUILD_SHA, mode, chains, sample, fixed, neededStems, guardSourceSha256: pin, guardSha256: hash(guard), deploymentFunctionSha256: hash(deployment.toString()), ciPins: bound.ci, pins: bound.pins });
  process.exit(0);
}
const prepared = JSON.parse(fs.readFileSync(path.join(out, 'preparation.json')));
assert.equal(hash(fs.readFileSync(path.join(out, 'read-only.cjs'))), prepared.guardSha256);
assert.equal(prepared.source, env.SOURCE_SHA); assert.equal(prepared.mode, mode); assert.equal(prepared.deploymentFunctionSha256, hash(deployment.toString()));
const require = createRequire(import.meta.url), { ORIGIN, checkedURL } = require(path.join(out, 'read-only.cjs'));
const { request } = require('playwright-core'), { JSDOM } = require('jsdom');
const report = { complete: false, diagnosticOnly: mode === 'intake', mode, source: env.SOURCE_SHA, qualified: env.QUALIFIED_BUILD_SHA,
  operator: env.GITHUB_SHA, run: env.GITHUB_RUN_ID, deployment: env.EXPECTED_DEPLOYMENT, pages: [], assets: [], requestCount: 0,
  qualificationScope: mode === 'strict' ? 'Published source plus exact qualified asset bytes' : 'Published source plus observed role asset pins; whole CI binary equality is not asserted' };
const persist = () => write('readback.json', report);
function deployment(header) {
  assert.equal(typeof header, 'string'); const match = header.match(new RegExp('^(' + uuid + ')$|^psr2\\.(' + uuid + ')\\.[0-9]{10}\\.[A-Za-z0-9_-]{43}$', 'i'));
  assert(match, 'CM_SHIRT_PUBLIC_HEADER: expected deployment format'); const id = (match[1] || match[2]).toLowerCase();
  assert.equal(id, env.EXPECTED_DEPLOYMENT, 'CM_SHIRT_PUBLIC_HEADER: expected deployment UUID'); return id;
}
const text = html => { const dom = new JSDOM(html); dom.window.document.querySelectorAll('script,style,template').forEach(node => node.remove()); const value = dom.window.document.body.textContent.replace(/\s+/g, ' ').trim(); dom.window.close(); return value; };
const rawClaims = {
  '/club-manager': ['Simulated shirt sales are separate from the sponsor.', 'Only net paid enters the kitty: 10,000 at a time', 'no backpay for older saves.'],
  '/whats-new': ['Club Manager: shirt sales pay the kitty.', 'Net pays in 10,000 batches', 'an older save starts tracking from its next club week with no backpay.'],
};
const roleClaims = {
  clubEngine: ['openingPence', 'grossPence', 'costPence', 'paidPence', 'cashPence', 'shirtSales', 'Shirt sales (net paid)'],
  clubGuide: rawClaims['/club-manager'],
  finance: ['data-shirt-sales', 'data-shirt-totals', 'data-shirt-amount', 'Opening or loading never pays.'],
  updates: rawClaims['/whats-new'],
};
function visibleClaims(route, html) { const body = text(html); for (const line of rawClaims[route]) assert(body.includes(line), 'CM_SHIRT_PUBLIC_READABLE: ' + route + ': ' + line); }
function compiledClaims(role, body) { for (const line of roleClaims[role]) assert(body.includes(line), 'CM_SHIRT_PUBLIC_ROLE: ' + role + ': ' + line); }
function verifyBoot(body, wanted) { assert.equal(hash(body), wanted, 'CM_SHIRT_PUBLIC_BOOT: exact source bootstrap bytes'); }
const prior = mode === 'strict' ? null : JSON.parse(fs.readFileSync(path.join(out, 'prior', 'readback.json')));
if (prior) {
  assert.equal(fs.readFileSync(path.join(out, 'prior', 'final-holds.exit'), 'utf8').trim(), '0');
  assert.equal(fs.readFileSync(path.join(out, 'prior', 'readback.exit'), 'utf8').trim(), mode === 'intake' ? '1' : '0');
  assert.equal(prior.operator, env.PRIOR_OPERATOR_SHA); assert.equal(String(prior.run), env.PRIOR_RUN_ID); assert.equal(prior.source, env.SOURCE_SHA); assert.equal(prior.qualified, env.QUALIFIED_BUILD_SHA); assert.equal(prior.deployment, env.EXPECTED_DEPLOYMENT);
  if (mode === 'intake') { assert.equal(prior.mode, 'strict'); assert.equal(prior.complete, false); assert.equal(prior.error?.name, 'AssertionError'); assert(['CM_SHIRT_PUBLIC_ENTRY_DRIFT', 'CM_SHIRT_PUBLIC_ASSET_DRIFT'].includes(prior.drift?.marker)); assert(prior.error.message.includes(prior.drift.marker)); assert.equal(typeof prior.drift.expected, 'string'); assert.equal(typeof prior.drift.observed, 'string'); assert.notEqual(prior.drift.expected, prior.drift.observed); assert.equal(env.OBSERVED_ENTRY, prior.observedEntry); }
  else { assert.equal(prior.mode, 'intake'); assert.equal(prior.complete, true); assert.equal(prior.diagnosticOnly, true); assert.deepEqual(prior.observedPins, bound.pins); }
}
const signed = 'psr2.' + env.EXPECTED_DEPLOYMENT + '.1793200847.' + 'A'.repeat(43);
deployment(env.EXPECTED_DEPLOYMENT); deployment(signed);
for (const value of [signed.replace('psr2.', 'other.'), signed.slice(0, -1), signed.replace(env.EXPECTED_DEPLOYMENT, '00000000-0000-0000-0000-000000000000')]) assert.throws(() => deployment(value));
const refused = [[ORIGIN + '/', 'POST'], ['https://example.com/', 'GET'], ['https://a:b@douknowball.com/', 'GET'], [ORIGIN + '/functions/v1/account-privacy', 'GET'], [ORIGIN + '/__cm_shirt_unlisted', 'GET'], [ORIGIN + '/assets/unlisted.js', 'GET']];
for (const [url, method] of refused) assert.throws(() => checkedURL(url, method));
report.controls = { headerFormats: 2, changedHeadersRejected: 3, forbiddenTargetsRejected: 6 };
const entryBaseline = new URL(ORIGIN + bound.ci.entry.path);
verifyEntryURL(entryBaseline);
report.controls.changedEntryURLsRejected = [];
for (const [name, mutate] of [
  ['foreign-origin', url => { url.hostname = 'example.com'; }],
  ['credentials', url => { url.username = 'fixture'; url.password = 'fixture'; }],
  ['query', url => { url.search = 'cm_shirt_reader_control=1'; }],
  ['fragment', url => { url.hash = 'cm-shirt-reader-control'; }],
]) {
  const changed = new URL(entryBaseline.href); mutate(changed); assert.notEqual(changed.href, entryBaseline.href);
  let caught; try { verifyEntryURL(changed); } catch (error) { caught = error; }
  assert.equal(caught?.name, 'AssertionError'); assert(caught.message.includes('CM_SHIRT_PUBLIC_ENTRY_URL'));
  report.controls.changedEntryURLsRejected.push({ name, beforeSha256: hash(entryBaseline.href), afterSha256: hash(changed.href),
    before: entryBaseline.href, after: changed.href, errorType: caught.name, error: caught.message });
}
assert.equal(report.controls.changedEntryURLsRejected.length, 4);
let api;
try {
  persist(); api = await request.newContext({ extraHTTPHeaders: { 'User-Agent': 'DoUKnowBall CM shirt sales publication reader' } });
  async function read(route, method, filename) {
    checkedURL(ORIGIN + route, method.toUpperCase()); report.requestCount++; assert(report.requestCount <= (mode === 'intake' ? 23 : 12), 'Bounded fixed public request count');
    const response = await api[method](ORIGIN + route + '?cm_shirt_readback=' + env.GITHUB_RUN_ID + '.' + env.GITHUB_RUN_ATTEMPT, { timeout: 30000, maxRedirects: 0, maxRetries: 0 });
    const headers = response.headers(); delete headers['set-cookie']; write(filename + '.headers.json', headers);
    const body = method === 'get' ? await response.body() : Buffer.alloc(0); if (method === 'get') write(filename, body);
    assert.equal(response.status(), 200, 'CM_SHIRT_PUBLIC_STATUS: ' + route); if (fixed.includes(route) || headers['x-deployment-id']) deployment(headers['x-deployment-id']);
    return { body, headers };
  }
  const pages = new Map();
  for (const route of fixed) {
    const name = 'raw-' + (route === '/' ? 'home.html' : route.slice(1).replaceAll('/', '_'));
    const get = await read(route, 'get', name), head = await read(route, 'head', name + '.head');
    assert.equal(deployment(get.headers['x-deployment-id']), deployment(head.headers['x-deployment-id']));
    pages.set(route, get.body); report.pages.push({ route, sha256: hash(get.body), status: 200 }); persist();
  }
  const foundEntries = [];
  for (const route of fixed) {
    const dom = new JSDOM(pages.get(route).toString()), doc = dom.window.document;
    assert.deepEqual([...doc.querySelectorAll('link[rel="canonical"]')].map(node => node.href), [ORIGIN + route]);
    assert.equal(doc.querySelectorAll('meta[name="description"]').length, 1);
    const entries = [...doc.querySelectorAll('script[type="module"][src]')].map(node => new URL(node.getAttribute('src'), ORIGIN)).filter(url => /^\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(url.pathname));
    for (const entry of entries) verifyEntryURL(entry);
    if (route === '/') { assert.equal(entries.length, 1); foundEntries.push(entries[0].pathname); }
    else {
      const boots = [...doc.querySelectorAll('script[src]')].filter(node => node.getAttribute('src') === bootPath && node.hasAttribute('defer'));
      assert.equal(boots.length, 1, 'Exact source-owned deferred snapshot bootstrap');
      assert(entries.length <= 1, 'At most one direct snapshot module');
      (report.snapshotEntryModes ||= {})[route] = entries.length ? 'direct-module-and-deferred-bootstrap' : 'deferred-home-bootstrap';
      if (entries.length) foundEntries.push(entries[0].pathname);
    }
    dom.window.close();
  }
  for (const entry of foundEntries) assert.equal(entry, foundEntries[0]);
  const boot = await read(bootPath, 'get', 'prerender-boot.js');
  const sourceBootHash = hash(fs.readFileSync(path.join(root, 'public', bootPath.slice(1))));
  verifyBoot(boot.body, sourceBootHash);
  const changedBoot = Buffer.concat([boot.body, Buffer.from('CM_SHIRT_CHANGED_BOOT')]);
  assert.notEqual(hash(changedBoot), hash(boot.body));
  assert.throws(() => verifyBoot(changedBoot, sourceBootHash), error => error.name === 'AssertionError' && error.message.includes('CM_SHIRT_PUBLIC_BOOT'));
  report.controls.changedBootstrapRejected = { marker: 'CM_SHIRT_PUBLIC_BOOT', beforeSha256: hash(boot.body), afterSha256: hash(changedBoot) };
  report.bootstrap = { path: bootPath, sha256: hash(boot.body) };
  report.observedEntry = foundEntries[0]; persist();
  const wantedEntry = mode === 'intake' ? env.OBSERVED_ENTRY : bound.pins.entry.path;
  if (report.observedEntry !== wantedEntry) { report.drift = { marker: 'CM_SHIRT_PUBLIC_ENTRY_DRIFT', expected: wantedEntry, observed: report.observedEntry }; persist(); }
  assert.equal(report.observedEntry, wantedEntry, 'CM_SHIRT_PUBLIC_ENTRY_DRIFT: actual entry differs');
  report.controls.changedReadableClaimsRejected = [];
  for (const [route, claims] of Object.entries(rawClaims)) {
    const original = pages.get(route).toString(); visibleClaims(route, original);
    for (const [i, line] of claims.entries()) {
      const missing = 'CM_SHIRT_REMOVED_READABLE_' + i;
      assert.equal(original.split(line).length, 2); assert(!original.includes(missing));
      const inert = '<!--' + line + '--><script type="application/json">' + line + '</script><template>' + line + '</template>';
      const changed = original.replace(line, missing) + inert; assert.notEqual(hash(changed), hash(original));
      let caught; try { visibleClaims(route, changed); } catch (error) { caught = error; }
      assert.equal(caught?.name, 'AssertionError'); assert(caught.message.includes('CM_SHIRT_PUBLIC_READABLE: ' + route + ': ' + line));
      assert.equal(changed.slice(0, -inert.length).replace(missing, line), original);
      report.controls.changedReadableClaimsRejected.push({ route, line, marker: 'CM_SHIRT_PUBLIC_READABLE', beforeSha256: hash(original), afterSha256: hash(changed), error: caught.message, wholeInverseExact: true });
    }
  }
  assert.equal(report.controls.changedReadableClaimsRejected.length, 6);
  const assetBodies = new Map();
  async function asset(route) { if (!assetBodies.has(route)) { assetPath(route); assert(assetBodies.size < (mode === 'intake' ? 16 : 5)); const got = await read(route, 'get', path.basename(route)); assetBodies.set(route, got.body); report.assets.push({ path: route, sha256: hash(got.body) }); persist(); } return assetBodies.get(route); }
  let pins = bound.pins;
  if (mode === 'intake') {
    const { init, parse } = await import('es-module-lexer'); await init; pins = {};
    for (const role of roles) {
      let current = report.observedEntry; await asset(current);
      for (const next of prepared.chains[role].slice(1)) {
        const candidates = [...new Set(parse((await asset(current)).toString())[0].filter(item => item.n).map(item => new URL(item.n, ORIGIN + current)).filter(url => url.origin === ORIGIN && !url.username && !url.password && !url.hash && !url.search && /^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(url.pathname) && stem(url.pathname) === stem(next)).map(url => url.pathname))];
        assert.equal(candidates.length, 1, 'One observed import for qualified role step ' + next); current = candidates[0]; await asset(current);
      }
      pins[role] = { path: current, sha256: hash(await asset(current)) };
    }
    report.observedPins = pins; report.observedPinsJson = JSON.stringify(pins); report.observedPinsSha256 = hash(report.observedPinsJson);
  } else {
    for (const row of Object.values(pins)) {
      const got = await asset(row.path), observed = hash(got);
      if (observed !== row.sha256) { report.drift = { marker: 'CM_SHIRT_PUBLIC_ASSET_DRIFT', path: row.path, expected: row.sha256, observed }; persist(); }
      verifyAsset(got, row.sha256);
    }
  }
  const entryBody = await asset(pins.entry.path), changedAsset = Buffer.concat([entryBody, Buffer.from('changed')]);
  verifyAsset(entryBody, hash(entryBody)); assert.notEqual(hash(changedAsset), hash(entryBody));
  assert.throws(() => verifyAsset(changedAsset, hash(entryBody)), error => error.name === 'AssertionError' && error.message.includes('CM_SHIRT_PUBLIC_ASSET_DRIFT'));
  report.controls.changedAssetRejected = { marker: 'CM_SHIRT_PUBLIC_ASSET_DRIFT', target: pins.entry.path, beforeSha256: hash(entryBody), afterSha256: hash(changedAsset) };
  report.controls.changedCompiledClaimsRejected = [];
  for (const [role, claims] of Object.entries(roleClaims)) {
    const original = (await asset(pins[role].path)).toString(); compiledClaims(role, original);
    for (const [i, line] of claims.entries()) {
      const missing = 'CM_SHIRT_REMOVED_COMPILED_' + i; assert(!original.includes(missing));
      const changed = original.split(line).join(missing); assert.notEqual(hash(changed), hash(original));
      let caught; try { compiledClaims(role, changed); } catch (error) { caught = error; }
      assert.equal(caught?.name, 'AssertionError'); assert(caught.message.includes('CM_SHIRT_PUBLIC_ROLE: ' + role + ': ' + line));
      assert.equal(changed.split(missing).join(line), original);
      report.controls.changedCompiledClaimsRejected.push({ role, line, marker: 'CM_SHIRT_PUBLIC_ROLE', beforeSha256: hash(original), afterSha256: hash(changed), error: caught.message, wholeInverseExact: true });
    }
  }
  assert.equal(report.controls.changedCompiledClaimsRejected.length, 17);
  report.roleComparisons = {};
  for (const role of roles) {
    const qualified = fs.readFileSync(path.join(out, 'qualified-dist', bound.ci[role].path.slice(1))), observed = await asset(pins[role].path);
    const rawDiff = spawnSync('diff', ['--unified=3', '--label', 'qualified:' + bound.ci[role].path, '--label', 'public:' + pins[role].path, '--',
      path.join(out, 'qualified-dist', bound.ci[role].path.slice(1)), path.join(out, path.basename(pins[role].path))], { maxBuffer: 16 * 1024 * 1024 });
    assert.ifError(rawDiff.error); assert([0, 1].includes(rawDiff.status)); assert.equal(rawDiff.status, qualified.equals(observed) ? 0 : 1);
    const diffFile = 'raw-diff-' + role + '.patch'; write(diffFile, rawDiff.stdout); write('raw-diff-' + role + '.stderr', rawDiff.stderr);
    report.roleComparisons[role] = { qualified: bound.ci[role], observed: pins[role], rawBytesEqual: qualified.equals(observed), qualifiedBytes: qualified.length, observedBytes: observed.length,
      diffFile, diffExit: rawDiff.status, diffSha256: hash(rawDiff.stdout) };
  }
  report.complete = true; persist(); console.log('CM_SHIRT_PUBLIC_RESULT ' + JSON.stringify({ mode, complete: true, diagnosticOnly: report.diagnosticOnly, requests: report.requestCount, assets: report.assets.length }));
} catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
finally { if (api) await api.dispose(); persist(); }
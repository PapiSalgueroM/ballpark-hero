/* Private SEO1444 remote publication candidate. Requires source review before adoption.
   Reads public static bytes only. It never executes fetched application code. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const env = process.env, out = path.resolve(env.READBACK_OUT), root = process.cwd();
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
const roles = ['Index', 'entry', 'footballGuide'], fixed = ['/', '/football-grid', '/llms.txt', '/robots.txt', '/sitemap.xml'];
const mode = env.OPERATOR_MODE, origin = 'https://douknowball.com', bootPath = '/prerender-boot.js';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const assetPath = value => assert.match(value || '', /^\/assets\/[A-Za-z0-9_.-]+\.js$/);
const stem = value => path.basename(value).replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
const verifyAsset = (body, wanted) => assert.equal(hash(body), wanted, 'SEO_PUBLIC_ASSET_DRIFT: actual role bytes differ');
function verifyEntryURL(value) {
  const url = value instanceof URL ? value : new URL(value, origin);
  assert.equal(url.href, origin + url.pathname, 'SEO_PUBLIC_ENTRY_URL: own origin without credentials, query or fragment');
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
  const neededStems = [...new Set(Object.values(chains).flat().map(stem))]; assert(neededStems.length <= 12, 'At most12 needed qualified role path assets');
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
  guard = guard.replace(requestLine, "      const fresh = checkedURL(typeof input === 'string' || input instanceof URL ? input : input.url(), method);\n      fresh.searchParams.set('seo_public_audit', process.env.GITHUB_RUN_ID + '.' + process.env.GITHUB_RUN_ATTEMPT);\n      const response = await native(fresh.href, { ...options, maxRedirects: 0, maxRetries: 0 });\n      const headers = { ...response.headers() }; delete headers['set-cookie'];\n      record('public-response-headers.jsonl', { method, path: fresh.pathname, status: response.status(), headers });\n      if (!fresh.pathname.startsWith('/assets/') || headers['x-deployment-id']) deployment(headers['x-deployment-id']);");
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
  assert(match, 'SEO_PUBLIC_HEADER: expected deployment format'); const id = (match[1] || match[2]).toLowerCase();
  assert.equal(id, env.EXPECTED_DEPLOYMENT, 'SEO_PUBLIC_HEADER: expected deployment UUID'); return id;
}
const text = html => { const dom = new JSDOM(html); dom.window.document.querySelectorAll('script,style,template').forEach(node => node.remove()); const value = dom.window.document.body.textContent.replace(/\s+/g, ' ').trim(); dom.window.close(); return value; };
const guideClaims = [
  'Use the player list to check the spelling and pick a name the game offers. Rarity depends on actual picks for that cell on the same puzzle, so the percentage can change from one puzzle to another. Fill a difficult crossing with a name you know before chasing a smaller percentage.',
  'For a hypothetical scoring example, suppose the nine displayed percentages are 10, 15, 20, 20, 25, 25, 30, 30 and 41. They total 216, so 216 divided by 9 gives a Rarity Score of 24. Your own percentages depend on actual picks for that puzzle.',
  'Scan all nine crossings before spending a guess. Save a player who fits several cells for the hardest crossing, then fill easier cells with other names.',
  'A player who has played for several franchises can give you more options. Check both criteria and keep a short list, because a name already filled on your board cannot be used again.',
  'After a miss, check both criteria and use the player list before trying again. In standard mode, 15 guesses must cover 9 correct entries, leaving room for 6 misses.',
  'Aim to fill the board before chasing a smaller rarity score. A familiar correct answer uses one guess; an uncertain pick can spend one of your six allowed misses.',
];
function visibleGuide(html) { const body = text(html); for (const line of guideClaims) assert(body.includes(line), 'SEO_PUBLIC_GUIDE: readable guide statement ' + line); }
const prior = mode === 'strict' ? null : JSON.parse(fs.readFileSync(path.join(out, 'prior', 'readback.json')));
if (prior) {
  assert.equal(fs.readFileSync(path.join(out, 'prior', 'final-holds.exit'), 'utf8').trim(), '0');
  assert.equal(fs.readFileSync(path.join(out, 'prior', 'readback.exit'), 'utf8').trim(), mode === 'intake' ? '1' : '0');
  assert.equal(prior.operator, env.PRIOR_OPERATOR_SHA); assert.equal(String(prior.run), env.PRIOR_RUN_ID); assert.equal(prior.source, env.SOURCE_SHA); assert.equal(prior.qualified, env.QUALIFIED_BUILD_SHA); assert.equal(prior.deployment, env.EXPECTED_DEPLOYMENT);
  if (mode === 'intake') { assert.equal(prior.mode, 'strict'); assert.equal(prior.complete, false); assert.equal(prior.error?.name, 'AssertionError'); assert(['SEO_PUBLIC_ENTRY_DRIFT', 'SEO_PUBLIC_ASSET_DRIFT'].includes(prior.drift?.marker)); assert(prior.error.message.includes(prior.drift.marker)); assert.equal(typeof prior.drift.expected, 'string'); assert.equal(typeof prior.drift.observed, 'string'); assert.notEqual(prior.drift.expected, prior.drift.observed); assert.equal(env.OBSERVED_ENTRY, prior.observedEntry); }
  else { assert.equal(prior.mode, 'intake'); assert.equal(prior.complete, true); assert.equal(prior.diagnosticOnly, true); assert.deepEqual(prior.observedPins, bound.pins); }
}
const signed = 'psr2.' + env.EXPECTED_DEPLOYMENT + '.1793200847.' + 'A'.repeat(43);
deployment(env.EXPECTED_DEPLOYMENT); deployment(signed);
for (const value of [signed.replace('psr2.', 'other.'), signed.slice(0, -1), signed.replace(env.EXPECTED_DEPLOYMENT, '00000000-0000-0000-0000-000000000000')]) assert.throws(() => deployment(value));
const refused = [[ORIGIN + '/', 'POST'], ['https://example.com/', 'GET'], ['https://a:b@douknowball.com/', 'GET'], [ORIGIN + '/functions/v1/account-privacy', 'GET'], [ORIGIN + '/__seo_unlisted', 'GET'], [ORIGIN + '/assets/unlisted.js', 'GET']];
for (const [url, method] of refused) assert.throws(() => checkedURL(url, method));
report.controls = { headerFormats: 2, changedHeadersRejected: 3, forbiddenTargetsRejected: 6 };
const entryBaseline = new URL(ORIGIN + bound.ci.entry.path);
verifyEntryURL(entryBaseline);
report.controls.changedEntryURLsRejected = [];
for (const [name, mutate] of [
  ['foreign-origin', url => { url.hostname = 'example.com'; }],
  ['credentials', url => { url.username = 'fixture'; url.password = 'fixture'; }],
  ['query', url => { url.search = 'seo_reader_control=1'; }],
  ['fragment', url => { url.hash = 'seo-reader-control'; }],
]) {
  const changed = new URL(entryBaseline.href); mutate(changed); assert.notEqual(changed.href, entryBaseline.href);
  let caught; try { verifyEntryURL(changed); } catch (error) { caught = error; }
  assert.equal(caught?.name, 'AssertionError'); assert(caught.message.includes('SEO_PUBLIC_ENTRY_URL'));
  report.controls.changedEntryURLsRejected.push({ name, beforeSha256: hash(entryBaseline.href), afterSha256: hash(changed.href),
    before: entryBaseline.href, after: changed.href, errorType: caught.name, error: caught.message });
}
assert.equal(report.controls.changedEntryURLsRejected.length, 4);
let api;
try {
  persist(); api = await request.newContext({ extraHTTPHeaders: { 'User-Agent': 'DoUKnowBall SEO publication reader' } });
  async function read(route, method, filename) {
    checkedURL(ORIGIN + route, method.toUpperCase()); report.requestCount++; assert(report.requestCount <= (mode === 'intake' ? 23 : 14), 'Bounded fixed public request count');
    const response = await api[method](ORIGIN + route + '?seo_readback=' + env.GITHUB_RUN_ID + '.' + env.GITHUB_RUN_ATTEMPT, { timeout: 30000, maxRedirects: 0, maxRetries: 0 });
    const headers = response.headers(); delete headers['set-cookie']; write(filename + '.headers.json', headers);
    const body = method === 'get' ? await response.body() : Buffer.alloc(0); if (method === 'get') write(filename, body);
    assert.equal(response.status(), 200, 'SEO_PUBLIC_STATUS: ' + route); if (fixed.includes(route) || headers['x-deployment-id']) deployment(headers['x-deployment-id']);
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
  for (const route of ['/', '/football-grid']) {
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
      report.guideEntryMode = entries.length ? 'direct-module-and-deferred-bootstrap' : 'deferred-home-bootstrap';
      if (entries.length) foundEntries.push(entries[0].pathname);
    }
    dom.window.close();
  }
  if (foundEntries.length === 2) assert.equal(foundEntries[0], foundEntries[1]);
  const boot = await read(bootPath, 'get', 'prerender-boot.js');
  assert.equal(hash(boot.body), hash(fs.readFileSync(path.join(root, 'public', bootPath.slice(1)))), 'SEO_PUBLIC_BOOT: exact source bootstrap bytes');
  report.bootstrap = { path: bootPath, sha256: hash(boot.body) };
  report.observedEntry = foundEntries[0]; persist();
  const wantedEntry = mode === 'intake' ? env.OBSERVED_ENTRY : bound.pins.entry.path;
  if (report.observedEntry !== wantedEntry) { report.drift = { marker: 'SEO_PUBLIC_ENTRY_DRIFT', expected: wantedEntry, observed: report.observedEntry }; persist(); }
  assert.equal(report.observedEntry, wantedEntry, 'SEO_PUBLIC_ENTRY_DRIFT: actual entry differs');
  for (const route of ['/llms.txt', '/robots.txt', '/sitemap.xml']) assert.equal(hash(pages.get(route)), hash(fs.readFileSync(path.join(root, 'public', route.slice(1)))), 'SEO_PUBLIC_STATIC: exact source bytes ' + route);
  visibleGuide(pages.get('/football-grid').toString());
  const originalGuide = pages.get('/football-grid').toString(), missing = 'SEO_READER_REMOVED_VISIBLE_SENTENCE';
  assert.equal(originalGuide.split(guideClaims[0]).length, 2); assert(!originalGuide.includes(missing));
  const inert = '<!--' + guideClaims[0] + '--><script type="application/json">' + guideClaims[0] + '</script><template>' + guideClaims[0] + '</template>';
  const changedGuide = originalGuide.replace(guideClaims[0], missing) + inert;
  assert.notEqual(hash(changedGuide), hash(originalGuide));
  assert.throws(() => visibleGuide(changedGuide), error => error.name === 'AssertionError' && error.message.includes('SEO_PUBLIC_GUIDE'));
  assert.equal(changedGuide.slice(0, -inert.length).replace(missing, guideClaims[0]), originalGuide);
  report.controls.changedReadableGuideRejected = { marker: 'SEO_PUBLIC_GUIDE', beforeSha256: hash(originalGuide), afterSha256: hash(changedGuide), wholeInverseExact: true };
  const assetBodies = new Map();
  async function asset(route) { if (!assetBodies.has(route)) { assetPath(route); assert(assetBodies.size < 12); const got = await read(route, 'get', path.basename(route)); assetBodies.set(route, got.body); report.assets.push({ path: route, sha256: hash(got.body) }); persist(); } return assetBodies.get(route); }
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
      if (observed !== row.sha256) { report.drift = { marker: 'SEO_PUBLIC_ASSET_DRIFT', path: row.path, expected: row.sha256, observed }; persist(); }
      verifyAsset(got, row.sha256);
    }
  }
  const entryBody = await asset(pins.entry.path), changedAsset = Buffer.concat([entryBody, Buffer.from('changed')]);
  verifyAsset(entryBody, hash(entryBody)); assert.notEqual(hash(changedAsset), hash(entryBody));
  assert.throws(() => verifyAsset(changedAsset, hash(entryBody)), error => error.name === 'AssertionError' && error.message.includes('SEO_PUBLIC_ASSET_DRIFT'));
  report.controls.changedAssetRejected = { marker: 'SEO_PUBLIC_ASSET_DRIFT', target: pins.entry.path, beforeSha256: hash(entryBody), afterSha256: hash(changedAsset) };
  const index = (await asset(pins.Index.path)).toString(), guide = (await asset(pins.footballGuide.path)).toString();
  assert(index.includes('Sports trivia, daily puzzles and career sims.') && index.includes('free games, no account needed.'), 'SEO_PUBLIC_INDEX: compiled runtime descriptor');
  for (const line of guideClaims) assert(guide.includes(line), 'SEO_PUBLIC_ROLE: actual football guide role');
  report.complete = true; persist(); console.log('SEO_PUBLIC_RESULT ' + JSON.stringify({ mode, complete: true, diagnosticOnly: report.diagnosticOnly, requests: report.requestCount, assets: report.assets.length }));
} catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
finally { if (api) await api.dispose(); persist(); }
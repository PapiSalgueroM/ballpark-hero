import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

const CONTRACT = {"status":"BOUND","product":"ae407c95f9fc88cb8552b484d07615f6f14ece0b","productTree":"2e6b643fbe21715e8043c621a3192d439b1af6a2","productParent":"4687af51ef7c0e1ab374468adcef718cc25e8e17","productFiles":5461,"files":[{"file":"src/test/cmFreeAgentContinuity.test.ts","sha256":"63444df9baacfbf418dca0e479ab2e6a3bf0d8064b255e2b3ec2c296b1d5f133","gitBlob":"9dc0568ee56338b5c932c9fed0c4df20d1879ba1","cases":[{"ancestorTitles":["Club Manager free-agent continuity"],"title":"recovers a naturally expired player in the arrival season without a cheaper contract","originalEngine":"CM_FA_EXPIRY_RECOVERY"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"restores a later free-agent signing with the same identity and durable development","originalEngine":"CM_FA_CANONICAL_IDENTITY"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"uses renewal wage and fee floors when an expired player returns","originalEngine":"CM_FA_RENEWAL_WAGE"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps a promoted academy identity after expiry and reload","originalEngine":"CM_FA_ACADEMY_CANONICAL_RETENTION"},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps manual release embargoes and ordinary signing limits","originalEngine":null},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"keeps summer retirement terminal instead of listing the player as free","originalEngine":null},{"ancestorTitles":["Club Manager free-agent continuity"],"title":"loads legacy thin free agents without guessing an ambiguous world identity","originalEngine":null}]},{"file":"src/test/cmMarketMaxPrice.test.tsx","sha256":"c8536dcc1f0654f4ef5b0f29ccd1546b423f35a905cc51dedea16fff8701a7fa","gitBlob":"8bcbd466ec9fcbac7375fca053f51ef5872369d9","cases":[{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"keeps existing price presets and the default Buy results unchanged","originalTransfer":null},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"includes the exact asking-price boundary and excludes the next higher ask","originalTransfer":"CM_MAX_ASK_BOUNDARY_CONTROL_MISSING"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"filters public asking prices without using stored market values","originalTransfer":"CM_MAX_ASK_PUBLIC_CONTROL_MISSING"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"applies the asking-price ceiling before the fifty-result limit","originalTransfer":"CM_MAX_ASK_SLICE_CONTROL_MISSING"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"clears the custom ceiling and keeps preset shortcuts usable","originalTransfer":"CM_MAX_ASK_CLEAR_CONTROL_MISSING"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"rejects malformed ceilings without silently parsing a partial number","originalTransfer":"CM_MAX_ASK_INVALID_CONTROL_MISSING"},{"ancestorTitles":["Club Manager exact maximum asking price"],"title":"uses each selected currency symbol without converting the asking-price amount","originalTransfer":"CM_MAX_ASK_CURRENCY_CONTROL_MISSING"}]},{"file":"src/test/cmFreeAgentDiscovery.test.tsx","sha256":"0bdd5465a9e5ccb91322416f622b611c3fe2552bb543d3257d66ceb74d938b7f","gitBlob":"2e85487d83d47dcc69f20956525018583c46674d","cases":[{"originalTransfer":null,"title":"keeps the contracts desk quotes and signing callback intact","ancestorTitles":["Club Manager free-agent discovery on Transfers"]},{"originalTransfer":"CM_FA_TRANSFER_OPEN_DISCOVERY_MISSING","title":"shows the existing free-agent pool and signing terms in the open transfer window","ancestorTitles":["Club Manager free-agent discovery on Transfers"]},{"originalTransfer":"CM_FA_TRANSFER_CLOSED_DISCOVERY_MISSING","title":"shows the same free-agent signing action with the transfer window closed","ancestorTitles":["Club Manager free-agent discovery on Transfers"]},{"originalTransfer":"CM_FA_TRANSFER_REFUSAL_DISCOVERY_MISSING","title":"keeps engine refusals disabled and a refused callback leaves the pool unchanged","ancestorTitles":["Club Manager free-agent discovery on Transfers"]},{"originalTransfer":"CM_FA_TRANSFER_EMPTY_DISCOVERY_MISSING","title":"shows an empty pool without inventing signable rows","ancestorTitles":["Club Manager free-agent discovery on Transfers"]},{"originalTransfer":"CM_FA_TRANSFER_HOOK_DISCOVERY_MISSING","title":"uses the existing signing hook once and retains its actual saved deal after reload","ancestorTitles":["Club Manager free-agent discovery on Transfers"]}]},{"file":"src/test/cmFreeAgentLegacyIdentity.test.ts","sha256":"334a78d061b0d20c1beee2cfea3e4e09a2603b2ac5aac41eebb2bf405c9d302d","gitBlob":"ad3658dafa3c3ec8ff79f1849f94c8793a01cea8","cases":[{"ancestorTitles":["Club Manager legacy free-agent identity"],"title":"keeps a verified youth pad fictional when a thin legacy pool row omits generated","legacyFiction":"CM_FA_LEGACY_FICTION_IDENTITY"}]}],"originals":{"engine":{"file":"src/lib/clubManager.ts","gitBlob":"4ce178814d8fb9de0564b32488d57c0fc75d91d6","sha256":"57a8d0bb97cbf3ebc880ea4b2f5e1ade0a3df63cdd51e4a57fb9bd69ace8a671","bytes":1241789},"transfer":{"file":"src/components/club-manager/TransferScreen.tsx","gitBlob":"b310a2b8371130272106bdb3e2f9f1377807d355","sha256":"7c2da951f8e58faffbdc04fd3326104f500e8cd655c71e51da2fb4bdb6c76769","bytes":77950},"legacyFiction":{"file":"src/lib/clubManager.ts","gitBlob":"082cd64e7aae6cced4ca4755e32c76b7a8acc107","sha256":"1c46a27f387211cb0e60ed75bc4e833658a359d27e9ca46f1721ad968f1632b4","bytes":1244592,"fromFixed":{"fixedSHA256":"4ff8741a8aa3efcb459a673f1c6cc2edaef0f30ab14030660e040ceca252168b","before":"generated: restored ? madeUp(restored) : fa.generated","after":"generated: fa.generated"}}},"expectedOriginalTransferUiFailures":5,"capsGitBlob":"084cce2062686259437cd2a334093a561c819c36","newUiPinState":"V2_ROOT_SOURCE_REVIEW_GO","originalPinState":"RETAINED_BASELINE_SOURCE_BODY_HASHES_ROOT_API_RECHECK_REQUIRED","productSourcePins":[{"path":"src/lib/clubManager.ts","bytes":1244622,"sha256":"4ff8741a8aa3efcb459a673f1c6cc2edaef0f30ab14030660e040ceca252168b","gitBlob":"58adb7c6549bec8fe2d546dcaa8e98c5b383331e"},{"path":"scripts/simFreeAgents.mjs","bytes":123823,"sha256":"46ddcccd3db09dd0c5b7bce9be8fc07d07340b0ef3e80d2220a94444d17b6f48","gitBlob":"51ed9a341fc2eaf08daee0ce1bb88f50c8f9018b"},{"path":"src/components/club-manager/ContractsCard.tsx","bytes":23636,"sha256":"d436132a1f015a79ff7572271d46b12bfedbe571e0f60662da98e21a10c310c2","gitBlob":"8bf2813801b5a63fe9da37dc362be6c8fa408472","mode":"100644"},{"path":"src/components/club-manager/FreeAgentPool.tsx","bytes":3957,"sha256":"9a432f33ddb18912d372be649e9a330cd5ddce2ce4593ef40e4da08e90504138","gitBlob":"a85232cafe27b0a4bafc9914be2a8c74a7ee96e9","mode":"100644"},{"path":"src/components/club-manager/TransferScreen.tsx","bytes":80257,"sha256":"c483b07a91051360be0b85a87a65b01642e0ea94dc04ee6d5032360e67d112d7","gitBlob":"1157975509a11dc6ce7d75d1d02221787716ad1b","mode":"100644"},{"path":"src/pages/ClubManager.tsx","bytes":104552,"sha256":"2987127955c2f3914fb2891c2e8a6302f13caa093ab31d59c0cb472da5754c41","gitBlob":"1ec2e88ec6e0e45b268f53cfbfab1981c84979b8","mode":"100644"}]}; // ROOT_CONTRACT_JSON
const CAPS_PRELOAD = "'use strict';\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst assert = require('node:assert/strict');\nconst { createHash } = require('node:crypto');\nconst hash = value => createHash('sha256').update(value).digest('hex');\nif (path.basename(process.argv[1] || '') === 'sweepWeight.mjs') {\n  const cache = process.env.FREE_KICK_FONT_CACHE;\n  const manifestBytes = fs.readFileSync(path.join(cache, 'manifest.json'));\n  assert.match(process.env.FONT_CACHE_MANIFEST_SHA256 || '', /^[a-f0-9]{64}$/);\n  assert.equal(hash(manifestBytes), process.env.FONT_CACHE_MANIFEST_SHA256, 'Prepared font manifest stays exact');\n  const sheet = [...fs.readFileSync('index.html', 'utf8').matchAll(/<link\\s+href=\"(https:\\/\\/fonts\\.googleapis\\.com\\/[^\\\"]+)\"\\s+rel=\"stylesheet\"/g)].map(m => new URL(m[1]).href);\n  assert.equal(sheet.length, 1, 'Use the actual single template stylesheet');\n  const entries = JSON.parse(manifestBytes);\n  assert(Array.isArray(entries) && entries.length > 1);\n  const fonts = new Map();\n  for (const entry of entries) {\n    assert(!fonts.has(entry.url), 'No duplicate font cache URL');\n    const url = new URL(entry.url);\n    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin));\n    assert.equal(url.href, entry.url);\n    assert.equal(entry.file, hash(entry.url));\n    assert.match(entry.sha256, /^[a-f0-9]{64}$/);\n    assert.equal(typeof entry.contentType, 'string');\n    const body = fs.readFileSync(path.join(cache, entry.file));\n    assert.equal(hash(body), entry.sha256, 'Prepared font body stays exact');\n    fonts.set(entry.url, { ...entry, body });\n  }\n  assert(fonts.has(sheet[0]), 'Current template stylesheet is cached');\n  const css = fonts.get(sheet[0]);\n  assert.match(css.contentType, /^text\\/css(?:;|$)/);\n  const declared = [...new Set([...css.body.toString('utf8').matchAll(/url\\(\\s*['\"]?(https:\\/\\/[^)'\"\\s]+)/g)].map(m => m[1]))];\n  assert(declared.length > 0);\n  assert.deepEqual([...fonts.keys()].sort(), [sheet[0], ...declared].sort(), 'Only actual stylesheet dependencies are fulfilled');\n  for (const url of declared) assert.equal(new URL(url).origin, 'https://fonts.gstatic.com');\n  const pw = require(path.join(process.cwd(),'node_modules/playwright-core'));\n  let contextId = 0;\n  const originalLaunch = pw.chromium.launch.bind(pw.chromium);\n  pw.chromium.launch = async options => {\n    const browser = await originalLaunch(options);\n    const originalContext = browser.newContext.bind(browser);\n    browser.newContext = async options => {\n      const context = await originalContext(options);\n      const id = ++contextId;\n      fs.appendFileSync(process.env.SWEEP_CONTEXT_RECEIPT, JSON.stringify({ contextId: id }) + \"\\n\");\n      await context.route(url => url.origin === \"https://flagcdn.com\", async route => {\n        const request = route.request(), url = new URL(request.url());\n        const validPath = /^\\/(?:w[1-9][0-9]{0,2}\\/|h[1-9][0-9]{0,2}\\/|[1-9][0-9]{0,2}x[1-9][0-9]{0,2}\\/)?[a-z]{2}(?:-[a-z0-9]{1,8})?\\.(?:png|webp|svg)$/.test(url.pathname);\n        if (url.origin !== \"https://flagcdn.com\" || url.username || url.password || url.search || url.hash || !validPath || request.method() !== \"GET\" || request.resourceType() !== \"image\") return route.fallback();\n        await route.abort(\"blockedbyclient\");\n        fs.appendFileSync(process.env.SWEEP_FLAG_RECEIPT, JSON.stringify({ contextId: id, method: request.method(), resourceType: request.resourceType(), url: url.href, action: \"LOCAL_ABORT\" }) + \"\\n\");\n      });\n      await context.route(/^https:\\/\\/(?:fonts\\.googleapis\\.com|fonts\\.gstatic\\.com)\\//, async route => {\n        const request = route.request(), entry = fonts.get(request.url());\n        if (request.method() !== 'GET' || !entry || !['stylesheet', 'font'].includes(request.resourceType())) return route.fallback();\n        await route.fulfill({ status: 200, contentType: entry.contentType, body: entry.body });\n        fs.appendFileSync(process.env.FONT_CACHE_USE_RECEIPT, JSON.stringify({ contextId: id, url: entry.url, sha256: entry.sha256, manifestSha256: hash(manifestBytes), resourceType: request.resourceType() }) + '\\n');\n      });\n      return context;\n    };\n    return browser;\n  };\n}\n"; // EXACT_EXISTING_CAPS_PRELOAD
const MENU = {"source":"988dc9d6b880d6c8a15fb4a00e09e6bf7a18eeab","cases":25,"files":[{"file":"src/test/SiteMenu.test.tsx","gitBlob":"4523ed1fa241b765d6cbe4f71f5eb14a14db89ad","cases":[{"ancestorTitles":["global top-left SiteMenu with the actual Sheet and router"],"title":"opens a named dialog with the real site links and all six lightweight sports hubs"},{"ancestorTitles":["global top-left SiteMenu with the actual Sheet and router"],"title":"lets real Radix Escape dismiss and return focus to the opening trigger"},{"ancestorTitles":["global top-left SiteMenu with the actual Sheet and router"],"title":"selects a real internal link, changes router location and closes"},{"ancestorTitles":["global top-left SiteMenu with the actual Sheet and router"],"title":"marks only the normalized current route and closes when that current link is selected"},{"ancestorTitles":["global top-left SiteMenu with the actual Sheet and router"],"title":"dismisses from the actual Sheet overlay and returns focus"},{"ancestorTitles":["global top-left SiteMenu with the actual Sheet and router"],"title":"closes on external search/hash and history key changes while the normalized path stays the same"}],"bytes":7414,"sha256":"7ad9fc3c8f668198975778e91c4dddafd056aaf93d3a39fbfc3b9296cb3661cd"},{"file":"src/test/SiteMenu.escape-loading.test.tsx","gitBlob":"89e9627296cf1854ced6c540852577fa49ff9805","cases":[{"ancestorTitles":[],"title":"dismisses a pending real menu import with Escape from the trigger, without a late dialog"}],"bytes":3841,"sha256":"1dfd8609855050e913a6a0471ae4a90dfe4c2b8390d8f502cbb0e1768c1613a8"},{"file":"src/test/SiteMenu.escape-failure.test.tsx","gitBlob":"b140aa236900793ff7c12aed88070a9b82e7c87e","cases":[{"ancestorTitles":[],"title":"dismisses an honest menu load failure with Escape from the trigger and each fallback control, without an automatic retry"}],"bytes":3150,"sha256":"eefd09f4ec92c6105cea3eae2cfc1fe4c09a271d97c54afc92a0086bd7c13202"},{"file":"src/test/SiteMenu.lazy-loading.test.tsx","gitBlob":"ed251b20e28a40fe041f00515c70cbb554968814","cases":[{"ancestorTitles":[],"title":"cancels a pending real panel import without a late dialog, then reopens the actual healthy panel"}],"bytes":3486,"sha256":"dc00fd495c0f1b5fb5481ac0f5a0e13c57989ba926317205f227a8f23232bc4e"},{"file":"src/test/SiteMenu.load-failure.test.tsx","gitBlob":"623c8ebb1839a4f3e21d9520daf5effaee83610a","cases":[{"ancestorTitles":[],"title":"shows truthful load failure with Search and Cancel, returns focus and never opens a dialog"}],"bytes":2450,"sha256":"6fe114520604c4642805d22922c6587c8a765995c7d6418a6724f940a8746dde"},{"file":"src/test/SiteMenu.finder.test.tsx","gitBlob":"dca14996069a9a82edf63f08b8abbf691385f362","cases":[{"ancestorTitles":["Menu game finder"],"title":"opens without editable autofocus and keeps original navigation"},{"ancestorTitles":["Menu game finder"],"title":"ranks actual catalog games and updates results as query changes"},{"ancestorTitles":["Menu game finder"],"title":"shows honest no results and clears without navigating"},{"ancestorTitles":["Menu game finder"],"title":"passes the full query to the existing search page"},{"ancestorTitles":["Menu game finder"],"title":"navigates to a game and closes including the current game"},{"ancestorTitles":["Menu game finder"],"title":"dismisses from the finder and returns visible trigger focus"},{"ancestorTitles":["Menu game finder"],"title":"clears the finder after close and a real route-key change"},{"ancestorTitles":["Menu game finder"],"title":"keeps draft searches out of the location and saved storage"}],"bytes":15821,"sha256":"91b0365a2b637c20947b9c996a5d24551c6c95105988a3fa9e261ee9714bee8b"},{"file":"src/test/SiteMenu.page-chrome.test.tsx","gitBlob":"be4c51b559af62da3544d2a28f7cfc35eb220d6e","cases":[{"ancestorTitles":["routed game chrome keeps one real header"],"title":"keeps one header for the active HofOrBust page"},{"ancestorTitles":["routed game chrome keeps one real header"],"title":"keeps one header for the active ScorePredictor page"},{"ancestorTitles":["routed game chrome keeps one real header"],"title":"keeps one header for the active GuessTheYear page"},{"ancestorTitles":["routed game chrome keeps one real header"],"title":"keeps one header for the active GuessTheNation page"},{"ancestorTitles":["routed game chrome keeps one real header"],"title":"preserves the Nation loading header and page help"},{"ancestorTitles":["routed game chrome keeps one real header"],"title":"preserves the Nation error header and page help"},{"ancestorTitles":["routed game chrome keeps one real header"],"title":"preserves the Nation mode header and page help"}],"bytes":8186,"sha256":"66ac4d135b2cb6dcb5740d990ef5d91be92d72c478544680a31e7ccbdb4e93d1"}]};
const REPORTER_PINS = [
  ['node_modules/vitest/dist/reporters.js', '374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
  ['node_modules/vitest/dist/chunks/index.VByaPkjc.js', '59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
  ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js', '4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
  ['node_modules/@vitest/runner/dist/chunk-hooks.js', '5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a'],
];
const root = process.cwd(), checkout = process.env.CM_FIXED_CHECKOUT, out = process.env.CM_FIXED_OUT;
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const key = row => JSON.stringify([row.file, row.ancestorTitles, row.title]);
const relative = file => path.relative(root, file).split(path.sep).join('/');
const git = args => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 1 << 28 });
const declared = () => CONTRACT.files.flatMap(file => file.cases.map(row => ({ ...row, file: file.file })));

assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ''), 'CM_FIXED_REMOTE_ONLY');
assert(out && checkout && path.isAbsolute(out) && path.isAbsolute(checkout), 'CM_FIXED_ABSOLUTE_CUSTODY');
assert(root !== checkout && !root.startsWith(checkout + path.sep) && root.startsWith(out + path.sep), 'CM_FIXED_TEMP_COPY_ONLY');
assert.equal(CONTRACT.status, 'BOUND', 'CM_FIXED_CONTRACT_UNBOUND');
assert.equal(CONTRACT.product, process.env.EXPECTED_PRODUCT, 'CM_FIXED_PRODUCT_BINDING');
assert.equal(CONTRACT.productTree, process.env.EXPECTED_PRODUCT_TREE, 'CM_FIXED_PRODUCT_BINDING');
assert.equal(CONTRACT.productParent, process.env.EXPECTED_PRODUCT_PARENT, 'CM_FIXED_PRODUCT_BINDING');
assert.equal(CONTRACT.productFiles, Number(process.env.EXPECTED_PRODUCT_FILES), 'CM_FIXED_PRODUCT_BINDING');
assert.equal(CONTRACT.files.length, 4, 'CM_FIXED_FOUR_SCOPED_FILES');
assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA, 'CM_FIXED_PROOF_SOURCE');
assert.equal(git(['rev-list', '--parents', '-n1', 'HEAD']).toString().trim(), process.env.GITHUB_SHA + ' ' + CONTRACT.product, 'CM_FIXED_PROOF_PARENT');
for (const file of CONTRACT.files) {
  const body = fs.readFileSync(file.file);
  assert.equal(sha(body), file.sha256, 'CM_FIXED_TEST_PIN'); assert.equal(blob(body), file.gitBlob, 'CM_FIXED_TEST_PIN');
  assert(file.cases.length > 0 && file.cases.every(row => Array.isArray(row.ancestorTitles) && row.title), 'CM_FIXED_CASE_CONTRACT');
}
for (const file of CONTRACT.productSourcePins) { const body = fs.readFileSync(file.path); assert.equal(body.length, file.bytes, 'CM_FIXED_PRODUCT_BODY_PIN'); assert.equal(sha(body), file.sha256, 'CM_FIXED_PRODUCT_BODY_PIN'); assert.equal(blob(body), file.gitBlob, 'CM_FIXED_PRODUCT_BODY_PIN'); }
assert.equal(CONTRACT.files.slice(0, 2).flatMap(file => file.cases).length, 14, 'CM_FIXED_FOURTEEN_LEAF_CASES');
assert.equal(new Set(declared().map(key)).size, declared().length, 'CM_FIXED_UNIQUE_IDENTITIES');
assert(declared().every(row => !row.healthy), 'CM_FIXED_HEALTHY_MEANS_ALL_PASS');
const tracked = git(['ls-files', '-z']).toString().split('\0').filter(Boolean);
const initial = new Map(tracked.map(file => [file, sha(fs.readFileSync(file))]));
const held = () => { for (const [file, expected] of initial) assert.equal(sha(fs.readFileSync(file)), expected, 'CM_FIXED_MATCHED_SOURCE_HELD:' + file); };

function inspect(actual, cases, failureField) {
  const failed = cases.filter(row => row[failureField]).length, report = actual.report, rows = [];
  assert.equal(actual.process.status, failed ? 1 : 0, 'CM_FIXED_RAW_EXIT');
  assert.equal(actual.process.signal, null, 'CM_FIXED_RAW_EXIT'); assert.equal(actual.process.error, null, 'CM_FIXED_RAW_EXIT');
  assert.equal(actual.runtime.arrayReceived, true, 'CM_FIXED_RUNTIME_ERRORS'); assert.equal(actual.runtime.count, 0, 'CM_FIXED_RUNTIME_ERRORS');
  assert.deepEqual(actual.runtime.errors, [], 'CM_FIXED_RUNTIME_ERRORS'); assert.deepEqual(actual.runtime.fileErrors, [], 'CM_FIXED_RUNTIME_ERRORS');
  assert.equal(report.success, failed === 0, 'CM_FIXED_COUNTERS');
  assert.deepEqual(report.testResults.map(file => relative(file.name)).sort(), [...new Set(cases.map(row => row.file))].sort(), 'CM_FIXED_FILES');
  for (const file of report.testResults) {
    const name = relative(file.name), red = cases.some(row => row.file === name && row[failureField]);
    assert.equal(file.message, '', 'CM_FIXED_FILE_METHOD_FAILURE'); assert.equal(file.status, red ? 'failed' : 'passed', 'CM_FIXED_FILE_STATUS');
    for (const row of file.assertionResults) rows.push({ ...row, file: name });
  }
  assert.equal(new Set(rows.map(key)).size, rows.length, 'CM_FIXED_IDENTITIES');
  assert.deepEqual(rows.map(key).sort(), cases.map(key).sort(), 'CM_FIXED_IDENTITIES');
  for (const expected of cases) {
    const row = rows.find(value => key(value) === key(expected)), marker = expected[failureField];
    assert.equal(row.fullName, [...row.ancestorTitles, row.title].join(' '), 'CM_FIXED_IDENTITIES');
    assert.equal(row.status, marker ? 'failed' : 'passed', 'CM_FIXED_EXPECTED_STATUS');
    if (marker) {
      assert.equal(row.failureMessages.length, 1, 'CM_FIXED_ASSERTION_ERROR');
      assert.match(row.failureMessages[0], /^AssertionError(?:\s|\[|:)/, 'CM_FIXED_ASSERTION_ERROR');
      assert(row.failureMessages[0].includes(marker), 'CM_FIXED_FAILURE_MARKER');
    } else assert.deepEqual(row.failureMessages, [], 'CM_FIXED_EXPECTED_STATUS');
  }
  for (const [field, expected] of Object.entries({ numTotalTests: cases.length, numFailedTests: failed, numPassedTests: cases.length - failed, numPendingTests: 0, numTodoTests: 0, numPendingTestSuites: 0 })) assert.equal(report[field], expected, 'CM_FIXED_COUNTERS');
  assert.equal(report.numTotalTestSuites, report.numPassedTestSuites + report.numFailedTestSuites, 'CM_FIXED_COUNTERS');
  assert.equal(report.numFailedTestSuites > 0, failed > 0, 'CM_FIXED_COUNTERS');
  return { files: report.testResults.length, total: cases.length, passed: cases.length - failed, failed, skipped: 0, runtimeErrors: 0 };
}

function prepareReporter() {
  assert.equal(JSON.parse(fs.readFileSync('package.json')).scripts.test, 'vitest run', 'CM_FIXED_DEFAULT_TEST_SCRIPT');
  assert.equal(JSON.parse(fs.readFileSync('node_modules/vitest/package.json')).version, '3.2.7', 'CM_FIXED_REPORTER_VERSION');
  const dir = path.join(out, 'reporter-source'); fs.mkdirSync(dir);
  for (const [file, expected] of REPORTER_PINS) { const body = fs.readFileSync(file); assert.equal(sha(body), expected, 'CM_FIXED_REPORTER_PIN'); fs.writeFileSync(path.join(dir, path.basename(file)), body, { flag: 'wx' }); }
  const resolved = fs.realpathSync(createRequire(path.join(root, 'package.json')).resolve('vitest/reporters'));
  assert.equal(resolved, fs.realpathSync('node_modules/vitest/dist/reporters.js'), 'CM_FIXED_CANONICAL_REPORTER');
  const body = [
    'import { JsonReporter } from ' + JSON.stringify(pathToFileURL(resolved).href) + ';',
    "import fs from 'node:fs'; import assert from 'node:assert/strict';",
    'export default class extends JsonReporter { async onFinished(files, errors, coverage) {',
    "assert(Array.isArray(files) && Array.isArray(errors), 'CM_BASELINE_ACTUAL_ERROR_ARRAY');",
    'const clean = error => ({name:error?.name??null,message:error?.message??String(error),stack:error?.stack??null});',
    'const fileErrors=files.flatMap(file=>(file.result?.errors??[]).map(error=>({file:file.filepath,...clean(error)})));',
    "fs.writeFileSync(process.env.CM_BASELINE_RUNTIME_JSON, JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(clean),fileErrors},null,2)+'\\n',{flag:'wx'});",
    'await super.onFinished(files, errors, coverage); } }',
  ].join('\n') + '\n';
  const file = path.join(out, 'runtime-json-reporter.mjs'); fs.writeFileSync(file, body, { flag: 'wx' });
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 10000 });
  json(path.join(out, 'reporter-syntax.json'), { status: syntax.status, signal: syntax.signal, error: syntax.error ? String(syntax.error) : null, stdout: syntax.stdout, stderr: syntax.stderr });
  assert.equal(syntax.status, 0, 'CM_FIXED_REPORTER_SYNTAX'); assert.equal(syntax.signal, null, 'CM_FIXED_REPORTER_SYNTAX');
  json(path.join(out, 'reporter-binding.json'), { resolved, physicalCanonicalEquality: true, sha256: sha(body), sourcePins: REPORTER_PINS });
  return { file, body };
}

function units(id, files, failureField, reporter, caseRows = declared()) {
  const dir = path.join(out, id); fs.mkdirSync(dir); const selected = caseRows.filter(row => files.includes(row.file));
  const args = ['test', '--', ...files, '--no-cache', '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=' + reporter.file, '--outputFile.json=' + path.join(dir, 'vitest.json')];
  const env = { ...process.env, CM_BASELINE_RUNTIME_JSON: path.join(dir, 'runtime-errors.json'), CM_MARKET_BASELINE_FIXTURES_OUT: path.join(out, 'fixtures') };
  delete env.CM_MARKET_BROWSER_FIXTURES_OUT;
  if (id === 'original-transfer-restored') env.CM_MARKET_BROWSER_FIXTURES_OUT = path.join(out, 'browser-fixtures');
  const unset = ['TYCOON_AWAY_CONTROL','COMPLETION_HOOK','OWNED_TIMEOUTS_HOOK','CONQUEST_NBA_HOOK','CONQUEST_NBA_BOARD','POLL_FIXTURES','US_BOARD_CONTROL_ALIAS','US_BOARD_CONTROL_FILE','DAILY_RECORD_CONTROL','TYCOON_ROOMS_PAGE','TYCOON_LOADS_STADIUM_HOOK','TYCOON_LOADS_ACADEMY_HOOK','TYCOON_LOADS_STADIUM_LIB','TYCOON_LOADS_ACADEMY_LIB','TYCOON_PITCH_COMPONENT','TYCOON_PACKS_REWARDS','TYCOON_PACKS_PANEL','NO_DOUBLE_SWAP'];
  for (const name of unset) delete env[name];
  json(path.join(dir, 'command.json'), { executable: 'npm', args, defaultConfig: 'vitest.config.ts', aliasOverrides: false, unset });
  const stdout = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(dir, 'stderr.log'), 'wx'); let child;
  try { child = spawnSync('npm', args, { cwd: root, env, timeout: 600000, stdio: ['ignore', stdout, stderr] }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const processRecord = { executable: 'npm', args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  json(path.join(dir, 'process.json'), processRecord); fs.writeFileSync(path.join(dir, 'raw.exit'), String(child.status) + '\n', { flag: 'wx' });
  assert.equal(sha(fs.readFileSync(reporter.file)), sha(reporter.body), 'CM_FIXED_REPORTER_HELD');
  const actual = { process: processRecord, report: JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))), runtime: JSON.parse(fs.readFileSync(path.join(dir, 'runtime-errors.json'))) };
  const counts = inspect(actual, selected, failureField); json(path.join(dir, 'CLASSIFICATION.json'), { id, source: process.env.GITHUB_SHA, failureField, ...counts, exactIdentities: selected.map(key).sort() });
  assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'CM_FIXED_OFFLINE_TRANSPORT');
  return { actual, cases: selected, counts };
}

function sourceControl(id, original, files, failureField, reporter) {
  held(); const dir = path.join(out, id + '-source'); fs.mkdirSync(dir);
  const fixed = fs.readFileSync(original.file); let changed;
  if (original.fromFixed) {
    assert.equal(sha(fixed), original.fromFixed.fixedSHA256, 'CM_FIXED_LITERAL_CONTROL_FIXED_PIN');
    const body = fixed.toString(), { before, after } = original.fromFixed, at = body.indexOf(before);
    assert.equal(body.split(before).length, 2, 'CM_FIXED_ONE_ACTIVE_INITIALIZER');
    const next = body.slice(0, at) + after + body.slice(at + before.length);
    assert.equal(next.slice(at, at + after.length), after); assert.equal(next.slice(0, at) + before + next.slice(at + after.length), body, 'CM_FIXED_LITERAL_CONTROL_INVERSE');
    changed = Buffer.from(next);
  } else changed = git(['cat-file', 'blob', original.gitBlob]);
  assert.equal(sha(changed), original.sha256, 'CM_FIXED_ORIGINAL_BODY_PIN'); assert.equal(blob(changed), original.gitBlob, 'CM_FIXED_ORIGINAL_BODY_PIN'); assert.equal(changed.length, original.bytes, 'CM_FIXED_ORIGINAL_BODY_PIN');
  assert.notEqual(sha(fixed), sha(changed), 'CM_FIXED_EFFECTIVE_SOURCE_CONTROL');
  fs.writeFileSync(path.join(dir, 'fixed.before'), fixed, { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'original.changed'), changed, { flag: 'wx' });
  let negative;
  try { fs.writeFileSync(original.file, changed); assert.deepEqual(fs.readFileSync(original.file), changed); negative = units(id, files, failureField, reporter); }
  finally { fs.writeFileSync(original.file, fixed); fs.writeFileSync(path.join(dir, 'fixed.restored'), fs.readFileSync(original.file), { flag: 'wx' }); }
  assert.deepEqual(fs.readFileSync(original.file), fixed, 'CM_FIXED_SAME_SOURCE_RESTORED'); held();
  const restored = units(id + '-restored', CONTRACT.files.map(file => file.file), 'healthy', reporter); held();
  json(path.join(dir, 'CONTROL.json'), { id, scope: 'ACTUAL_PHYSICAL_SOURCE_IN_MATCHED_TEMP_COPY_ONLY', file: original.file, construction: original.fromFixed ?? 'PINNED_ORIGINAL_GIT_BLOB', changedBytes: true, beforeSHA256: sha(fixed), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(original.file)), sameCanonicalFileRestored: true, negative: negative.counts, restored: restored.counts, featurePassCredit: false });
  return negative;
}

function classifierControls(foundation) {
  const file = path.join(out, 'classifier-working.json'), healthy = Buffer.from(JSON.stringify(foundation.actual, null, 2) + '\n'), controls = [];
  fs.writeFileSync(file, healthy, { flag: 'wx' }); const rows = v => v.report.testResults.flatMap(result => result.assertionResults);
  for (const [id, marker, mutate] of [
    ['raw', 'CM_FIXED_RAW_EXIT', v => { v.process.status = 0; }],
    ['identity', 'CM_FIXED_IDENTITIES', v => { v.report.testResults[0].assertionResults.pop(); }],
    ['runtime', 'CM_FIXED_RUNTIME_ERRORS', v => { v.runtime.count = 1; v.runtime.errors.push({ name: 'Error', message: 'copied callback error' }); }],
    ['preservation', 'CM_FIXED_EXPECTED_STATUS', v => { rows(v).find(row => row.status === 'passed').status = 'failed'; }],
    ['marker', 'CM_FIXED_FAILURE_MARKER', v => { rows(v).find(row => row.status === 'failed').failureMessages = ['AssertionError: CM_UNDECLARED_COPY_CONTROL']; }],
    ['method', 'CM_FIXED_ASSERTION_ERROR', v => { rows(v).find(row => row.status === 'failed').failureMessages = ['TypeError: copied method failure']; }],
  ]) {
    const value = structuredClone(foundation.actual); mutate(value); const changed = Buffer.from(JSON.stringify(value, null, 2) + '\n'); assert.notDeepEqual(changed, healthy);
    const changedFile = 'classifier-' + id + '.changed.json'; fs.writeFileSync(path.join(out, changedFile), changed, { flag: 'wx' }); fs.writeFileSync(file, changed); let refusal;
    try { inspect(JSON.parse(fs.readFileSync(file)), foundation.cases, 'originalEngine'); } catch (error) { refusal = error; } finally { fs.writeFileSync(file, healthy); }
    assert(refusal instanceof assert.AssertionError && refusal.message.includes(marker), 'CM_FIXED_CLASSIFIER_CONTROL:' + id); assert.deepEqual(fs.readFileSync(file), healthy); inspect(JSON.parse(fs.readFileSync(file)), foundation.cases, 'originalEngine');
    controls.push({ id, marker, changedFile, beforeSHA256: sha(healthy), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(file)), sameCopyRestored: true, actualRefusal: { name: refusal.name, message: refusal.message }, featurePassCredit: false });
  }
  json(path.join(out, 'CLASSIFIER-CONTROLS.json'), controls);
}

if (process.argv[2] === 'units') {
  fs.mkdirSync(path.join(out, 'fixtures')); json(path.join(out, 'BOUND-CONTRACT.json'), CONTRACT);
  const all = CONTRACT.files.map(file => file.file), leaves = all.slice(0, 2), ui = [all[1], all[2]], reporter = prepareReporter();
  const healthy = units('fixed-green', all, 'healthy', reporter); held();
  const engine = sourceControl('original-engine', CONTRACT.originals.engine, leaves, 'originalEngine', reporter);
  assert.equal(engine.counts.failed, 4, 'CM_FIXED_EXACT_FOUR_CORE_REDS'); classifierControls(engine);
  const legacy = sourceControl('legacy-fiction', CONTRACT.originals.legacyFiction, [all[3]], 'legacyFiction', reporter);
  assert.equal(legacy.counts.failed, 1, 'CM_FIXED_EXACT_LEGACY_FICTION_RED');
  const transfer = sourceControl('original-transfer', CONTRACT.originals.transfer, ui, 'originalTransfer', reporter);
  assert.equal(transfer.counts.failed, 6 + CONTRACT.expectedOriginalTransferUiFailures, 'CM_FIXED_EXACT_PRICE_AND_UI_REDS');
  const fixtureNames = ['EXPECTED.json', 'natural-expiry-before.career.json', 'natural-expiry-closed.career.json', 'price-open.career.json'];
  assert.deepEqual(fs.readdirSync(path.join(out, 'browser-fixtures')).sort(), fixtureNames, 'CM_FIXED_ACTUAL_BROWSER_FIXTURE_MEMBERS');
  json(path.join(out, 'BROWSER-FIXTURE-BODIES.json'), fixtureNames.map(file => { const body = fs.readFileSync(path.join(out, 'browser-fixtures', file)); return { file, bytes: body.length, sha256: sha(body), gitBlob: blob(body) }; }));
  for (const file of MENU.files) { const body = fs.readFileSync(file.file); assert.equal(body.length, file.bytes, 'CM_MENU_TEST_PIN'); assert.equal(sha(body), file.sha256, 'CM_MENU_TEST_PIN'); assert.equal(blob(body), file.gitBlob, 'CM_MENU_TEST_PIN'); }
  const menuCases = MENU.files.flatMap(file => file.cases.map(row => ({ ...row, file: file.file })));
  assert.equal(menuCases.length, MENU.cases, 'CM_MENU_EXACT_TWENTY_FIVE'); assert.equal(MENU.cases, 25, 'CM_MENU_EXACT_TWENTY_FIVE');
  const menuGreen = units('menu-green', MENU.files.map(file => file.file), 'healthy', reporter, menuCases); held();
  const menuWorking = path.join(out, 'menu-classifier-working.json'), menuFoundation = Buffer.from(JSON.stringify(menuGreen.actual, null, 2) + '\n'), menuControls = [];
  fs.writeFileSync(menuWorking, menuFoundation, { flag: 'wx' });
  for (const [id, marker, mutate] of [
    ['raw', 'CM_FIXED_RAW_EXIT', value => { value.process.status = 1; }],
    ['identity', 'CM_FIXED_IDENTITIES', value => { value.report.testResults[0].assertionResults.pop(); }],
    ['runtime', 'CM_FIXED_RUNTIME_ERRORS', value => { value.runtime.count = 1; value.runtime.errors.push({ name: 'Error', message: 'copied Menu callback error' }); }],
  ]) {
    const value = structuredClone(menuGreen.actual); mutate(value); const changed = Buffer.from(JSON.stringify(value, null, 2) + '\n'); assert.notDeepEqual(changed, menuFoundation);
    const changedFile = 'menu-classifier-' + id + '.changed.json'; fs.writeFileSync(path.join(out, changedFile), changed, { flag: 'wx' }); fs.writeFileSync(menuWorking, changed); let refusal;
    try { inspect(JSON.parse(fs.readFileSync(menuWorking)), menuCases, 'healthy'); } catch (error) { refusal = error; } finally { fs.writeFileSync(menuWorking, menuFoundation); }
    assert(refusal instanceof assert.AssertionError && refusal.message.includes(marker), 'CM_MENU_CLASSIFIER_CONTROL:' + id); assert.deepEqual(fs.readFileSync(menuWorking), menuFoundation); inspect(JSON.parse(fs.readFileSync(menuWorking)), menuCases, 'healthy');
    menuControls.push({ id, marker, changedFile, beforeSHA256: sha(menuFoundation), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(menuWorking)), sameCopyRestored: true, actualRefusal: { name: refusal.name, message: refusal.message }, featurePassCredit: false });
  }
  json(path.join(out, 'MENU-CLASSIFIER-CONTROLS.json'), menuControls);
  json(path.join(out, 'MENU-UNIT-ADMISSION.json'), { status: 'FRESH_DISTINCT_MENU25_SCOPED_DEFAULT_CONFIG_GREEN', source: process.env.GITHUB_SHA, product: CONTRACT.product, dependencySource: MENU.source, counts: menuGreen.counts, exactIdentities: menuCases.map(key).sort(), copiedControls: menuControls.length, fullDefaultSuite: 'UNRUN_SCOPED_DEFAULT_CONFIG_ONLY', menuBrowser: 'UNRUN_REQUIRES_FINAL_INTEGRATION', sourceHeld: true, productReady: false });
  console.log('CM_MENU_SCOPED_UNITS: green, exact25 with zero runtime errors and three copied classifier refusals restored.');
  json(path.join(out, 'SCOPED-UNIT-ADMISSION.json'), { status: 'FIXED_AND_EXACT_SOURCE_CONTROLS_WITH_RESTORATION_GREEN', source: process.env.GITHUB_SHA, product: CONTRACT.product, fixed: healthy.counts, originalEngine: engine.counts, legacyFiction: legacy.counts, originalTransfer: transfer.counts, originalBodies: CONTRACT.originals, newRegressionUnderOriginalEngine: 'UNRUN_SEPARATE_EXACT_V1_INITIALIZER_CONTROL_ONLY', fullDefaultSuite: 'UNRUN_SCOPED_DEFAULT_CONFIG_ONLY', sourceHeld: true, productReady: false });
  console.log('CM_FIXED_SCOPED_UNITS: green, exact scoped identities and three physical source controls restored.');
} else if (process.argv[2] === 'admit-deps') {
  const split = body => body.toString().split('\0').filter(Boolean).sort(), before = split(fs.readFileSync(path.join(out, 'deps.members.initial'))), after = split(fs.readFileSync(path.join(out, 'deps.members.final')));
  assert(before.every(file => !/^node_modules\/\.vite\/vitest\//.test(file)), 'CM_FIXED_CLEAN_INITIAL_DEPENDENCY_CACHE');
  const added = after.filter(file => !before.includes(file)); assert(added.length <= 1, 'CM_FIXED_ONLY_DEFAULT_VITEST_RESULT_CACHE');
  assert.deepEqual(after.filter(file => !added.includes(file)), before, 'CM_FIXED_DEPENDENCY_MEMBERS_HELD');
  const cache = [];
  for (const file of added) {
    const projectId = createHash('sha1').update('').digest('hex');
    assert.equal(file, 'node_modules/.vite/vitest/' + projectId + '/results.json', 'CM_FIXED_ONLY_DEFAULT_VITEST_RESULT_CACHE');
    const body = fs.readFileSync(path.join(checkout, file)), data = JSON.parse(body); assert.deepEqual(Object.keys(data).sort(), ['results', 'version']); assert.equal(data.version, '3.2.7'); assert.equal(data.results.length, 1);
    const entry = data.results[0]; assert.equal(entry.length, 2); assert.equal(entry[0], ':src/test/clubManagerSave.test.tsx'); assert.deepEqual(Object.keys(entry[1]).sort(), ['duration', 'failed']); assert.equal(entry[1].failed, false); assert(Number.isFinite(entry[1].duration) && entry[1].duration >= 0);
    fs.writeFileSync(path.join(out, 'default-vitest-results-cache.json'), body, { flag: 'wx' }); cache.push({ file, bytes: body.length, sha256: sha(body), kind: 'GENERATED_DEFAULT_VITEST_RESULT_CACHE_NOT_PACKAGE_CODE' });
  }
  json(path.join(out, 'DEPENDENCY-CACHE-ADMISSION.json'), { allOriginalDependencyFilesAndMembershipHeldExceptRecordedNewResultCache: true, originalHashesRequireSeparateShellHold: true, cache });
} else if (process.argv[2] === 'prepare-caps') {
  assert.equal(sha(CAPS_PRELOAD), '877ba355cc1311f1c3a51df4ff1ca736cee660818ee19109d3f8da3866459140', 'CM_FIXED_EXISTING_CAPS_PRELOAD');
  fs.writeFileSync(path.join(out, 'caps-preload.cjs'), CAPS_PRELOAD, { flag: 'wx' });
  assert.equal(blob(fs.readFileSync('scripts/sweepWeight.mjs')), CONTRACT.capsGitBlob, 'CM_FIXED_UNCHANGED_CAPS_SOURCE');
} else if (process.argv[2] === 'admit-caps') {
  assert.equal(sha(fs.readFileSync(path.join(out, 'caps-preload.cjs'))), '877ba355cc1311f1c3a51df4ff1ca736cee660818ee19109d3f8da3866459140', 'CM_FIXED_CAPS_PRELOAD_HELD');
  const read = file => fs.readFileSync(path.join(out, 'caps', file), 'utf8'), rows = file => read(file).trim().split('\n').filter(Boolean).map(s => JSON.parse(s));
  assert.equal(read('raw.exit').trim(), '0', 'CM_FIXED_CAPS_RAW'); assert.equal((read('combined.log').match(/gz over[^\n]+budget/g) || []).length, 15, 'CM_FIXED_FIFTEEN_CAPS'); assert.match(read('combined.log'), /sweepWeight: green/, 'CM_FIXED_CAPS_GREEN');
  const contexts = rows('contexts.jsonl'), fonts = rows('fonts.jsonl'), flags = rows('flags.jsonl'), ids = Array.from({ length: 15 }, (_, i) => i + 1), manifest = new Map(JSON.parse(fs.readFileSync(process.env.FREE_KICK_FONT_CACHE + '/manifest.json')).map(row => [row.url, row]));
  assert.deepEqual(contexts.map(row => row.contextId), ids, 'CM_FIXED_CAPS_CONTEXTS');
  for (const id of ids) { assert.equal(fonts.filter(row => row.contextId === id && row.resourceType === 'stylesheet').length, 1); assert(fonts.some(row => row.contextId === id && row.resourceType === 'font')); }
  for (const row of fonts) { assert(ids.includes(row.contextId)); assert.equal(row.sha256, manifest.get(row.url)?.sha256); assert.equal(row.manifestSha256, process.env.FONT_CACHE_MANIFEST_SHA256); }
  for (const row of flags) { const url = new URL(row.url); assert(ids.includes(row.contextId)); assert.equal(row.method, 'GET'); assert.equal(row.resourceType, 'image'); assert.equal(row.action, 'LOCAL_ABORT'); assert.equal(url.origin, 'https://flagcdn.com'); assert(!url.username && !url.password && !url.search && !url.hash); assert.match(url.pathname, /^\/(?:w[1-9][0-9]{0,2}\/|h[1-9][0-9]{0,2}\/|[1-9][0-9]{0,2}x[1-9][0-9]{0,2}\/)?[a-z]{2}(?:-[a-z0-9]{1,8})?\.(?:png|webp|svg)$/); }
  held(); json(path.join(out, 'CAPS-ADMISSION.json'), { status: 'UNCHANGED_FIFTEEN_FATAL_CAPS_PASSED', source: process.env.GITHUB_SHA, product: CONTRACT.product, capRows: 15, contexts: 15, localFlagDenials: flags.length, fontsFromExactPreparedManifest: true, gameplayBrowser: 'UNRUN_CAP_BROWSER_ONLY', capsGitBlob: CONTRACT.capsGitBlob });
} else throw new Error('CM_FIXED_UNKNOWN_MODE');

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const BASE = 'e32dd9facafcf43f4a4ddbafeae1a8baa6732aff';
const SELF = 'scripts/qa/proveCareerReleaseGuides.mjs';
const WF = '.github/workflows/career-release-guides.yml';
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args);
const read = file => fs.readFileSync(file);
const us = "During a playing season, open Deal with it under the heat meter when you're holding dirty money. Choose Come clean, Give it away, Keep it quiet or Wash it after reading the cost and any catch risk.";
const changes = [
  { file: 'clubManagement.ts', route: '/club-manager', part: 'rules', indent: 10,
    anchor: 'Every league plays its real length: 38 rounds in the Premier League, 46 in the Championship, 34 in the Bundesliga, with the domestic cup from a round of 16 to the final and a full Champions League on top for qualified clubs.',
    item: "Open the Cups panel to follow the whole Champions League, even when your club is not in it: table or groups, matchdays, knockouts and final. Tap a club to read its run. These are your game's simulated results." },
  { file: 'soccer2.ts', route: '/soccer-career', part: 'howToPlay', indent: 10,
    anchor: 'Advance season by season through simulated stats, newspaper headlines, random events, and decisions.',
    item: 'Most summers open with one card about your position or your career, before the rest of the news between seasons. Training can trade one skill for another next season, with gains stopping at your ceiling.' },
  { file: 'basketball.ts', route: '/nba-my-career', part: 'howToPlay', indent: 14,
    anchor: 'Spend the money in 7 aisles: home, rides, investments, body, flex, family, and a shady aisle that only appears once you have something to hide.', item: us },
  { file: 'football.ts', route: '/nfl-my-career', part: 'howToPlay', indent: 14,
    anchor: 'Spend the money in 7 aisles: home, rides, investments, body, flex, family, and a shady aisle that only appears once you have something to hide.', item: us },
  { file: 'baseball.ts', route: '/mlb-my-career', part: 'howToPlay', indent: 14,
    anchor: 'Build your look, then spend the money in 7 aisles including a shady one that only appears once you have something to hide.', item: us },
  { file: 'hockey.ts', route: '/nhl-my-career', part: 'howToPlay', indent: 10,
    anchor: 'Build your look, then spend the money in 7 aisles including a shady one that only appears once you have something to hide.', item: us },
].map(change => ({ ...change, file: 'src/data/gameContent/' + change.file }));
const generated = ['src/data/searchKeywords.json', 'scripts/data/guideHeadingsFrozen.json', 'public/sitemap.xml', 'scripts/data/lastmod.json', 'public/whats-new/index.html', ...changes.map(change => 'public' + change.route + '/index.html')];
const contexts = [
  ['1503', '13c8f3afa6007c0e45e107d146e0325e3cb517a0', 'src/lib/clubManagerWorldView.ts', 'f3ac3f8a08d57358556ee3cc42e462331f0d79fe'],
  ['1503', '13c8f3afa6007c0e45e107d146e0325e3cb517a0', 'src/components/club-manager/WorldCompScreen.tsx', '1962a57a0a5451c0eaf90cb85d99c84658e1ebba'],
  ['1504', 'd468997ad2978a22722f31468f5813c0e9321e35', 'src/lib/soccerDeckGate.ts', '39d0b682ba64eb0d4c76db69a980709766551405'],
  ['1504', 'd468997ad2978a22722f31468f5813c0e9321e35', 'src/lib/soccerDeck.ts', 'f6c6a4f8033d2d241f81c11e2f77a7e05169428a'],
  ['1504', 'd468997ad2978a22722f31468f5813c0e9321e35', 'src/pages/SoccerCareer.tsx', '76333d0b3d1571fa77e134585d67211c6c2dd2d6'],
  ['1504', 'd468997ad2978a22722f31468f5813c0e9321e35', 'src/data/soccerDeck/starter.ts', 'ff324082b503dc3a72cae460c51dce6199c2157a'],
  ['1500', '76716d06b4f3ef8738d4b7e080e8fc9b620a026e', 'src/components/us-career/UsCareerBoard.tsx', '7a920adf9d7e27f461c5f6ad1663d56361e88748'],
  ['1500', '76716d06b4f3ef8738d4b7e080e8fc9b620a026e', 'src/components/us-career/DirtyMoneyDesk.tsx', 'b9908a0fd1b06fdcfb1be72fe84d73a7f223b57e'],
  ['1500', '76716d06b4f3ef8738d4b7e080e8fc9b620a026e', 'src/lib/careerDirtyMoney.ts', 'bce8b6c549aba30caf30b72d86c3d19ecb6ef963'],
  ['1500', '76716d06b4f3ef8738d4b7e080e8fc9b620a026e', 'src/lib/careerDirtyMoneyDesk.ts', 'ac49d74bd6fda5c92928be831a9dd79ba4378562'],
];
const rootOut = process.env.CAREER_RELEASE_GUIDES_OUT;
assert(rootOut && path.isAbsolute(rootOut), 'Absolute retained workflow output');
const out = path.join(rootOut, 'proof');
assert(!fs.existsSync(out), 'Fresh proof directory');
fs.mkdirSync(out);
const save = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const report = { status: 'running', base: BASE, scope: 'Guide-only handback for BJ after the accepted features join, not a feature runtime or combined-join cap proof', items: [], contexts: [], controls: [], runs: [] };
let held;
const tracked = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const inventory = label => {
  const names = tracked();
  assert.deepEqual(names, held.names, label + ': whole tracked membership');
  for (const [file, hash] of held.hashes) assert.equal(sha(read(file)), hash, label + ': ' + file);
  save(label + '.source.json', { tracked: names.length, held: held.hashes.length, generatedExcluded: generated, wholeHeld: true });
};
function run(label, args) {
  inventory(label + '-before');
  const receipt = path.join(out, label + '.transport');
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, args, { env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  save(label + '.stdout.log', result.stdout || ''); save(label + '.stderr.log', result.stderr || '');
  const processResult = { label, args, startedAt, endedAt: new Date().toISOString(), exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null };
  save(label + '.process.json', processResult); report.runs.push(processResult);
  inventory(label + '-after');
  assert(!result.error && !result.signal, label + ': completed child'); assert.equal(result.status, 0, label + ': successful child');
  assert(!fs.existsSync(receipt) || read(receipt).length === 0, label + ': no ordinary transport');
}
try {
  assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
  const require = createRequire(import.meta.url);
  assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs')); assert(require.cache[require.resolve('../lib/offlineTransport.cjs')]);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Clean committed source');
  for (const file of [SELF, WF, ...changes.map(change => change.file)]) assert.deepEqual(read(file), git(['show', 'HEAD:' + file]), file + ': canonical HEAD bytes');
  assert.equal(git(['rev-parse', BASE + ':src/data/gameContent/clubManagement.ts']).toString().trim(), '324b539a45f0c3c3526260474521535948c8cc15', 'Whole qualified317 guide');
  const names = tracked(); held = { names, hashes: names.filter(file => !generated.includes(file)).map(file => [file, sha(read(file))]) };
  save('source-before.json', { names, hashes: held.hashes });
  for (const change of changes) {
    const original = git(['show', BASE + ':' + change.file]).toString();
    const anchor = '\n' + ' '.repeat(change.indent) + JSON.stringify(change.anchor) + ',\n';
    const span = ' '.repeat(change.indent) + JSON.stringify(change.item) + ',\n';
    assert.equal(original.split(anchor).length - 1, 1, change.file + ': unique actual anchor');
    const expected = original.replace(anchor, anchor + span), actual = read(change.file).toString();
    const check = body => assert.equal(body, expected, change.file + ': exact one inserted item and all other bytes held');
    check(actual); assert.equal(actual.split(span).length - 1, 1); assert.equal(actual.replace(span, ''), original);
    const changed = actual.replace(span, ''); assert.notEqual(sha(changed), sha(actual)); assert.throws(() => check(changed), assert.AssertionError); assert.equal(changed.replace(anchor, anchor + span), actual);
    save(path.basename(change.file) + '.original.ts', original); save(path.basename(change.file) + '.candidate.ts', actual);
    report.items.push({ ...change, originalSha256: sha(original), candidateSha256: sha(actual), wholeInverse: true });
    report.controls.push({ kind: 'missing-source-item', route: change.route, changedSha256: sha(changed), rejected: true, wholeUndo: true });
  }
  for (const [round, head, file, blob] of contexts) {
    assert.equal(git(['rev-parse', head + ':' + file]).toString().trim(), blob, file + ': accepted-head context blob');
    const body = git(['show', head + ':' + file]), retained = 'context-' + round + '-' + path.basename(file);
    save(retained, body); report.contexts.push({ round, head, file, blob, sha256: sha(body), retained, executed: false });
  }
  const fixtureFile = 'scripts/data/guideHeadingsFrozen.json', before = JSON.parse(read(fixtureFile));
  save('fixture-before.json', read(fixtureFile));
  for (const change of changes) run('refresh-' + change.route.slice(1), ['scripts/simGuideHeadings.mjs', '--refresh', change.route]);
  const after = JSON.parse(read(fixtureFile)), expected = structuredClone(before);
  for (const change of changes) {
    const items = expected.routes[change.route][change.part], indices = items.flatMap((item, index) => item === change.anchor ? [index] : []);
    assert.equal(indices.length, 1, change.route + ': existing fixture anchor'); assert(!items.includes(change.item)); items.splice(indices[0] + 1, 0, change.item);
  }
  const checkFixture = value => assert.deepEqual(value, expected, 'Exactly six inserted fixture items, all other route records and metadata held');
  checkFixture(after); save('fixture-after.json', read(fixtureFile));
  for (const change of changes) {
    const changed = structuredClone(after), items = changed.routes[change.route][change.part], index = items.indexOf(change.item);
    assert(index >= 0); items.splice(index, 1); const changedSha256 = sha(JSON.stringify(changed)); assert.notEqual(changedSha256, sha(JSON.stringify(after))); assert.throws(() => checkFixture(changed), assert.AssertionError);
    save('fixture-control-' + change.route.slice(1) + '.json', changed);
    items.splice(index, 0, change.item); assert.deepEqual(changed, after);
    report.controls.push({ kind: 'missing-fixture-item', route: change.route, changedSha256, rejected: true, wholeUndo: true });
  }
  run('keywords-first', ['scripts/genSearchKeywords.mjs']); save('searchKeywords.first.json', read('src/data/searchKeywords.json'));
  run('keywords-second', ['scripts/genSearchKeywords.mjs']); save('searchKeywords.second.json', read('src/data/searchKeywords.json'));
  assert.deepEqual(read(path.join(out, 'searchKeywords.first.json')), read(path.join(out, 'searchKeywords.second.json')), 'Whole deterministic search index');
  run('guide-headings', ['scripts/simGuideHeadings.mjs']); run('site-search', ['scripts/simSiteSearch.mjs']);
  inventory('final');
  report.fixture = { beforeSha256: sha(JSON.stringify(before)), afterSha256: sha(JSON.stringify(after)), changedRoutes: changes.map(change => change.route), otherRoutesHeld: Object.keys(before.routes).length - changes.length, rootMetadataHeld: true };
  report.keywords = { sha256: sha(read('src/data/searchKeywords.json')), wholeOutputsEqual: true };
  report.status = 'passed'; console.log('PASS six guide items, twelve effective source/fixture rejection controls, whole fixture preservation and deterministic search index.');
} catch (error) {
  report.status = 'failed'; report.error = error.stack; throw error;
} finally {
  save('report.json', report);
}

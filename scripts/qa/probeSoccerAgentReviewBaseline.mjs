// Remote-only four-advance causal contrast. No application source is written.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { serialize } from 'node:v8';
import { build } from 'esbuild';

const CONFIG = {"schemaVersion":1,"baselineRun":41597116619,"baselineArtifact":13212464099,"currentRef":"3dcb4b897b58a4731b2b2ab10b622213b0f071e7","preShieldRef":"cc9a55a2f35b6215d5e6e664cc401d10d7f76291","originalRef":"d69a448ce830f8312af1eea252a3ae84b13bde9c","inputFixtureGit":"81425f731297f0ff72fc4e163dfe1a4cb86814ab","case":{"id":"nan","age":19,"lastYear":2028,"seed":101,"kind":"absent","action":"next","now":1791676800000},"baselinePins":[{"path":"dependency.sha256","bytes":2921411,"sha256":"0bb6d0967ebc301dbc5bc370d7c866fe844e22b80849e3e1761709ad51685c63"},{"path":"evidence/owner-agent-review.stderr","bytes":87378,"sha256":"2c8863a64c22e90185db164ad9f2f137fc87c0464475194f8b76970f0a7bd55b"},{"path":"evidence/owners/agent-review/outcomes.json","bytes":113604,"sha256":"b829052d359853d5dcad6a1f372cd80aa0be5cd2e3c7791ff9986f7250bf9ef4"},{"path":"head-tree.txt","bytes":82,"sha256":"55a4054a6d46e65440d54eafbcbe612fcd65cb6c8f2a02940966249a76a55977"},{"path":"source.sha256","bytes":582823,"sha256":"88761da0d35fa75dc8dbfeb38e692bced9d1f288413b2e7bcc8d5ef7d6fc4484"}],"kitEdits":[{"label":"declare bounded diagnostic binding without changing old public action APIs","before":"export async function bundleAgentReview({ original = false, patches = [], browser = false } = {}) {","after":"export async function bundleAgentReview({ original = false, patches = [], browser = false, sourceBinding } = {}) {\n  assert(sourceBinding && !browser && patches.length === 0, 'Four-call diagnostic requires an explicit Node source binding and no feature fault');"},{"label":"remove unused host composition import from the sibling only","before":"import { loadCommunityShieldOracleSource } from '../lib/communityShieldOracleCompat.mjs';\n","after":""},{"label":"retain actual build graph without changing compiler options","before":"stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true,","after":"stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, metafile: true,"},{"label":"intercept every actual repository input, including default-loaded mjs","before":"builder.onLoad({ filter: /\\.(ts|tsx|json)$/ }, args => {","after":"builder.onLoad({ filter: /.*/, namespace: 'file' }, args => {"},{"label":"only locked third-party dependencies keep the default loader","before":"          if (!relative.startsWith('src/')) return;\n          const shieldSource = loadCommunityShieldOracleSource({ original, base: BASE, relative, readOriginal: () => execFileSync('git', ['show', BASE + ':' + relative], { maxBuffer: 30 * 1024 * 1024 }), readCurrent: () => { let currentBytes; { const sourceBytes = fs.readFileSync(args.path); currentBytes = Buffer.from(sourceBytes); } return currentBytes; } });","after":"          if (!sourceBinding.shouldLoad(relative, args.path)) return;\n          const shieldSource = sourceBinding.load(relative, original);"},{"label":"preserve the previous exact src-only normalization boundary","before":"          if (!original && !browser) contents = inverseDeckFair(relative, inverseWorldTruth(relative, inverseSoccerDeck(relative, contents, soccerDeck), worldTruth), deckFair);","after":"          if (!original && !browser && relative.startsWith('src/') && /\\.(ts|tsx|json)$/.test(relative)) contents = inverseDeckFair(relative, inverseWorldTruth(relative, inverseSoccerDeck(relative, contents, soccerDeck), worldTruth), deckFair);"},{"label":"record final transformed input and preserve each original parser","before":"          loaded.push({ file: relative, rawSha256: sha(raw), compiledSha256: sha(contents), original, shieldCompatibility: shieldSource.receipt });\n          return { contents, loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts' };","after":"          sourceBinding.compiled(relative, contents, original);\n          loaded.push({ file: relative, rawSha256: sha(raw), compiledSha256: sha(contents), original, shieldCompatibility: shieldSource.receipt });\n          return { contents, loader: sourceBinding.loader(relative) };"},{"label":"retain actual graph and executable before assertions or import","before":"    });\n    assert.equal(faults.length, patches.length, 'Every fault reaches its compiled product source');","after":"    });\n    sourceBinding.retainBuilt(result.metafile, file, loaded);\n    assert.equal(faults.length, patches.length, 'Every fault reaches its compiled product source');"}],"kitBeforeGit":"d6ca063fb64f3b556ed9c484af22574d5974fb63","kitBeforeSha":"439700e40e9823b5b2cfe153fc419f22c3f5bbda9b3184ac5431fb0bbb9d1395","coreHelperGit":"1ed3b4103bc3805ccd08f72eeb181558fa892d23","coreHelperSha":"6c992bc254d3716b2b7bdea17b194c0340b4957a4f44ca4bc7ea7ee7412e806b","ownerGit":"ea0d37f67261f55de5fa6a1edd53c442e2a99cfd","ownerSha":"57c2bca59fe97cff65e4b96066174831b100f5c832d95a5cda56246345f470c2","scope":"Exactly four actual advances and two no-draw reads; no source/current overlays, no fallback, all raw outputs before comparison. Stop if repository default-loaded historical mjs/code creates an actual197 confound."};
const ROOT = process.cwd(), OUT = path.resolve(process.env.SC_AGENT_BASELINE_OUT || ''), EVIDENCE = path.resolve(process.env.SC_AGENT_BASELINE_EVIDENCE || '');
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.SC_AGENT_BASELINE_OUT && process.env.SC_AGENT_BASELINE_EVIDENCE, 'Explicit output and already-acquired baseline paths required');
assert(OUT.startsWith(path.join(ROOT, 'tmp') + path.sep), 'Fresh output belongs to workspace/tmp');
assert.equal(fs.existsSync(OUT), false); fs.mkdirSync(OUT, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const gitPin = raw => createHash('sha1').update(Buffer.from('blob ' + raw.length + '\0')).update(raw).digest('hex');
const pin = raw => ({ bytes: raw.length, sha256: sha(raw), gitBlob: gitPin(raw) });
const write = (name, value) => { const file = path.join(OUT, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const writeBytes = (name, raw) => { const file = path.join(OUT, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, raw); return { file: name, ...pin(raw) }; };
const gitRead = (ref, relative) => execFileSync('git', ['show', ref + ':' + relative], { cwd: ROOT, maxBuffer: 40 * 1024 * 1024 });
const copy = value => JSON.parse(JSON.stringify(value));
const same = (left, right) => { try { assert.deepEqual(left, right); return { equal: true, assertion: null }; } catch (error) { if (error.name !== 'AssertionError') throw error; return { equal: false, assertion: { name: error.name, message: error.message, stack: error.stack } }; } };
const normalized = raw => raw.toString('utf8').replaceAll('\r\n', '\n');
const previouslyHandled = relative => relative.startsWith('src/') && /\.(ts|tsx|json)$/.test(relative);
const safeRelative = relative => { assert(relative && !path.isAbsolute(relative) && !relative.split('/').includes('..'), 'Actual repository input has a closed relative path'); return relative; };
function compilerVirtual(input, metadata) {
  if (input !== '<define:import.meta.env>') return null;
  assert.deepEqual(metadata, { bytes: 0, imports: [] }, 'Exact generated import.meta.env definition metadata');
  return { input, definition: '{"PROD":true,"DEV":false}', metadata };
}
const nativeRandom = Math.random, nativeNow = Date.now;
const held = new Map(), baselineBytes = new Map();
const phases = [], builds = [], advances = [], reads = [], failures = [], secondary = [];
let kitCopy = null, kitCopyBytes = null, primary = null, summary = null, stage = 'baseline-custody';
function hold(relative) {
  const file = path.join(ROOT, relative), raw = fs.readFileSync(file);
  if (!held.has(relative)) held.set(relative, Buffer.from(raw));
  else assert.deepEqual(raw, held.get(relative));
  return raw;
}
function holds() {
  const rows = [];
  for (const [relative, expected] of held) {
    { const actual = fs.readFileSync(path.join(ROOT, relative)); assert.deepEqual(actual, expected, 'Actual diagnostic input held: ' + relative); }
    rows.push({ relative, ...pin(expected) });
  }
  for (const [relative, expected] of baselineBytes) {
    const actual = fs.readFileSync(path.join(EVIDENCE, relative)); assert.deepEqual(actual, expected, 'Original artifact input held: ' + relative);
  }
  return rows;
}
function parseHashes(text) {
  const result = new Map();
  for (const line of text.trimEnd().split('\n')) { const match = /^([a-f0-9]{64})  (.+)$/.exec(line); assert(match, 'Exact retained sha256sum row'); assert(!result.has(match[2])); result.set(match[2], match[1]); }
  return result;
}
function sourceDiff(left, right, prefix = '$', result = []) {
  if (Object.is(left, right)) return result;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') { result.push({ path: prefix, expected: left, actual: right }); return result; }
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) result.push({ path: prefix + '.' + key, expectedPresent: Object.hasOwn(left, key), actualPresent: Object.hasOwn(right, key), expected: left[key], actual: right[key] });
    else sourceDiff(left[key], right[key], prefix + '.' + key, result);
  }
  return result;
}
try {
  assert.equal(process.version, 'v24.22.1', 'Same Node version as the retained primary failure');
  for (const spec of CONFIG.baselinePins) {
    const raw = fs.readFileSync(path.join(EVIDENCE, spec.path)); assert.equal(raw.length, spec.bytes); assert.equal(sha(raw), spec.sha256);
    baselineBytes.set(spec.path, Buffer.from(raw));
  }
  const baseline = JSON.parse(baselineBytes.get('evidence/owners/agent-review/outcomes.json').toString('utf8'));
  assert.equal(baseline.head, CONFIG.currentRef); assert.equal(baseline.tree, '499807432461712c8cd73572fe013a62d9a726a7'); assert.equal(baseline.neutral.length, 96); assert.equal(baseline.groups.length, 0); assert.equal(baseline.controls.length, 0);
  const baselinePrimary = baselineBytes.get('evidence/owner-agent-review.stderr').toString('utf8');
  assert(baselinePrimary.includes('scripts/simSoccerAgentReview.mjs:37:791')); assert(baselinePrimary.includes("+     currentLeague: 'Ligue 1'")); assert(baselinePrimary.includes("-     currentLeague: 'Ligue 2'"));
  const sourceHashes = parseHashes(baselineBytes.get('source.sha256').toString('utf8')), dependencyHashes = parseHashes(baselineBytes.get('dependency.sha256').toString('utf8'));
  assert.equal(sourceHashes.size, 5675); assert.equal(dependencyHashes.size, 24466);
  for (const [relative, expected] of dependencyHashes) assert.equal(sha(fs.readFileSync(path.join(ROOT, relative))), expected, 'Exact retained dependency bytes: ' + relative);
  write('baseline-admission.json', { source: baseline.head, neutral: 96, groups: 0, controls: 0, baselinePins: CONFIG.baselinePins, dependencyFilesMatched: dependencyHashes.size, failedPairRetained: false });
  const enginePath = 'src/lib/soccerCareerEngine.ts', fixturePath = 'scripts/data/careerLeagueWorldSaves1100.json', kitPath = 'scripts/qa/soccerAgentReviewKit.mjs', helperPath = 'scripts/lib/communityShieldOracleCompat.mjs', ownerPath = 'scripts/simSoccerAgentReview.mjs';
  const preEngine = gitRead(CONFIG.preShieldRef, enginePath); assert.equal(gitPin(preEngine), '722b2285628775dff77f8de0138cf44d7b104b49');
  const oldEngine = gitRead(CONFIG.originalRef, enginePath); assert.equal(gitPin(oldEngine), '6e0986aa54a2775752b4737078ffbaaf2ae3dc45');
  const ownerRaw = hold(ownerPath); assert.equal(sha(ownerRaw), CONFIG.ownerSha); assert.equal(gitPin(ownerRaw), CONFIG.ownerGit);
  const fixtureRaw = hold(fixturePath); assert.equal(sha(fixtureRaw), sourceHashes.get(fixturePath)); assert.equal(gitPin(fixtureRaw), CONFIG.inputFixtureGit);
  assert.deepEqual(fixtureRaw, gitRead(CONFIG.currentRef, fixturePath)); assert.deepEqual(fixtureRaw, gitRead(CONFIG.preShieldRef, fixturePath));
  const helperRaw = hold(helperPath); assert.equal(sha(helperRaw), CONFIG.coreHelperSha); assert.equal(gitPin(helperRaw), CONFIG.coreHelperGit); assert.equal(sha(helperRaw), sourceHashes.get(helperPath));
  const H = await import(pathToFileURL(path.join(ROOT, helperPath)).href);
  const kitRaw = hold(kitPath); assert.equal(sha(kitRaw), CONFIG.kitBeforeSha); assert.equal(gitPin(kitRaw), CONFIG.kitBeforeGit); assert.equal(sha(kitRaw), sourceHashes.get(kitPath));
  const legacyHosts = ['scripts/lib/careerAwardGenerations1318.mjs', 'scripts/lib/careerDeckFair1327.mjs', 'scripts/lib/careerWorldTruth1329.mjs', 'scripts/lib/careerSoccerDeck1334.mjs'];
  // The exact Kit imports are copied, including every existing normalizer. Probe their actual static host graph.
  const hostEntry = legacyHosts.map((file, index) => 'export * as host' + index + ' from ' + JSON.stringify('./' + file) + ';').join('\n');
  stage = 'host-tool-closure';
  const host = await build({ stdin: { contents: hostEntry, resolveDir: ROOT, loader: 'js' }, bundle: true, platform: 'node', format: 'esm', write: false, metafile: true, logLevel: 'error' });
  writeBytes('host-tools/executable-not-executed.mjs.txt', Buffer.from(host.outputFiles[0].contents)); write('host-tools/metafile.json', host.metafile);
  const hostRows = [];
  for (const input of Object.keys(host.metafile.inputs)) {
    if (input === '<stdin>') continue;
    const absolute = path.resolve(ROOT, input), relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
    assert(!relative.startsWith('../') && !path.isAbsolute(relative), 'Host dependency stays in the locked workspace');
    if (relative.startsWith('node_modules/')) { assert.equal(sha(fs.readFileSync(absolute)), dependencyHashes.get(relative), 'Locked host third-party input'); continue; }
    safeRelative(relative);
    const raw = hold(relative), current = gitRead(CONFIG.currentRef, relative), before = gitRead(CONFIG.preShieldRef, relative);
    writeBytes('host-tools/source/' + relative + '.txt', raw);
    assert.deepEqual(raw, current); assert.deepEqual(raw, before, 'No changed historical host normalizer may confound the contrast: ' + relative); assert.equal(sha(raw), sourceHashes.get(relative));
    hostRows.push({ relative, currentRef: CONFIG.currentRef, preShieldRef: CONFIG.preShieldRef, ...pin(raw) });
  }
  assert.equal(hostRows.length, 8, 'Exact existing transitive normalizer closure');
  write('host-tools/closure.json', { entry: hostEntry, executed: false, repositoryInputs: hostRows });
  stage = 'physical-sibling-kit';
  let kitText = kitRaw.toString('utf8'); assert.deepEqual(Buffer.from(kitText), kitRaw);
  const kitSteps = [];
  for (const edit of CONFIG.kitEdits) {
    assert.equal(kitText.split(edit.before).length - 1, 1, 'Unique actual copied Kit span: ' + edit.label);
    const offset = kitText.indexOf(edit.before); kitText = kitText.slice(0, offset) + edit.after + kitText.slice(offset + edit.before.length); kitSteps.push({ ...edit, offset });
  }
  let inverse = kitText;
  for (let index = kitSteps.length - 1; index >= 0; index--) { const step = kitSteps[index]; assert.equal(inverse.slice(step.offset, step.offset + step.after.length), step.after); inverse = inverse.slice(0, step.offset) + step.before + inverse.slice(step.offset + step.after.length); }
  assert.deepEqual(Buffer.from(inverse), kitRaw, 'Whole raw copied Kit inverse');
  kitCopyBytes = Buffer.from(kitText); kitCopy = path.join(ROOT, 'scripts/qa/__control_agent_baseline_' + process.pid + '.mjs');
  assert.equal(fs.existsSync(kitCopy), false); fs.writeFileSync(kitCopy, kitCopyBytes, { flag: 'wx' }); assert.deepEqual(fs.readFileSync(kitCopy), kitCopyBytes);
  writeBytes('kit/current-original.mjs.txt', kitRaw); writeBytes('kit/physical-diagnostic.mjs.txt', kitCopyBytes); write('kit/source-edits.json', { original: pin(kitRaw), changed: pin(kitCopyBytes), steps: kitSteps, wholeRawInverse: true });
  const K = await import(pathToFileURL(kitCopy).href);
  assert.equal(K.BASE, CONFIG.originalRef); assert.equal(K.NOW, CONFIG.case.now);
  for (const name of ['bundleAgentReview', 'capturedPlayers', 'copy', 'seeded', 'action']) assert.equal(typeof K[name], 'function', 'Actual copied Kit API: ' + name);
  const players = K.capturedPlayers(), captured = players.find(row => row.id === CONFIG.case.id); assert(captured);
  assert.equal(players[4].id, 'nan'); assert.equal(captured.state.playerName, 'World nan'); assert.equal(captured.state.age, 19); assert.equal(captured.state.currentClub, 'Nantes'); assert.equal(captured.state.seasons.at(-1).year, 2028); assert.equal(Object.hasOwn(captured.state, 'agentReview'), false);
  const baseInput = K.copy(captured.state), inputBytes = JSON.stringify(baseInput), inputs = Array.from({ length: 4 }, () => K.copy(baseInput));
  for (const input of inputs) { assert.equal(JSON.stringify(input), inputBytes); assert.deepEqual(input, baseInput); }
  write('input.json', { fixture: { path: fixturePath, ...pin(fixtureRaw) }, case: CONFIG.case, input: baseInput, fourInputDTOs: inputs, preCallJSONStringSha256: sha(inputBytes), allFourPreCallDTOsByteAndWholeEqual: true });
  write('source-before.json', holds());
  function sourceBinding(mode) {
    const dir = path.join(OUT, mode.id), records = new Map(), loaded = [], rejections = [];
    fs.mkdirSync(dir); const save = () => write(mode.id + '/source-records.json', { mode, records: [...records.values()].map(({ raw, contents, ...row }) => row), rejections });
    const loader = relative => {
      const ext = path.extname(relative); if (ext === '.ts') return 'ts'; if (ext === '.tsx') return 'tsx'; if (ext === '.json') return 'json'; if (['.js', '.mjs', '.cjs'].includes(ext)) return 'js'; if (ext === '.jsx') return 'jsx'; if (['.css', '.svg', '.png', '.jpg', '.webp'].includes(ext)) return 'empty'; throw Error('Unsupported repository input extension: ' + relative);
    };
    return {
      loader,
      shouldLoad(relative, absolute) {
        assert(path.isAbsolute(absolute)); assert(!relative.startsWith('../') && !path.isAbsolute(relative), 'No unbound code outside workspace');
        if (relative.startsWith('node_modules/')) { assert.equal(sha(fs.readFileSync(absolute)), dependencyHashes.get(relative), 'Exact locked third-party input: ' + relative); return false; }
        safeRelative(relative); loader(relative); return true;
      },
      load(relative, original) {
        assert.equal(original, mode.original);
        let sourceRef = mode.ref;
        if (mode.shield && mode.original && relative === 'src/lib/soccerCareerExtraCups.ts') sourceRef = CONFIG.currentRef;
        let raw;
        try {
          raw = gitRead(sourceRef, relative);
          const retained = writeBytes(mode.id + '/source/' + relative + '.raw.txt', raw);
          const parser = loader(relative);
          let value;
          if (mode.shield) value = H.loadCommunityShieldOracleSource({ original, base: CONFIG.originalRef, relative, readOriginal: () => Buffer.from(raw), readCurrent: () => Buffer.from(raw) });
          else value = { raw, contents: parser === 'empty' ? '' : raw.toString('utf8'), receipt: null };
          if (parser !== 'empty') assert.deepEqual(Buffer.from(raw.toString('utf8'), 'utf8'), raw, 'Actual historical source is complete UTF-8');
          if (parser === 'empty') value.contents = '';
          assert.equal(records.has(relative), false, 'One actual repository load per closed path');
          records.set(relative, { relative, sourceRef, original, mode: mode.id, parser, retainedRaw: retained, raw: Buffer.from(raw), contents: value.contents, rawSha256: sha(raw), preNormalizerSha256: sha(value.contents), shieldReceipt: value.receipt });
          save(); return value;
        } catch (error) { rejections.push({ relative, sourceRef, name: error.name, message: error.message, stack: error.stack }); save(); throw error; }
      },
      compiled(relative, contents, original) {
        const row = records.get(relative); assert(row); assert.equal(original, mode.original); row.compiledSourceSha256 = sha(contents); row.compiledBytes = Buffer.byteLength(contents); row.contents = contents;
        row.retainedCompiled = writeBytes(mode.id + '/source/' + relative + '.compiled.txt', Buffer.from(contents)); loaded.push(relative); save();
      },
      retainBuilt(metafile, executable, kitLoaded) {
        // Preserve all actual compiler evidence before aggregate closure or comparison assertions.
        writeBytes(mode.id + '/engine.cjs', fs.readFileSync(executable)); write(mode.id + '/metafile.json', metafile); write(mode.id + '/kit-loaded.json', kitLoaded); save();
        const metadataRepo = [], compilerVirtualInputs = [];
        for (const input of Object.keys(metafile.inputs)) {
          if (input === '<stdin>') continue;
          const virtual = compilerVirtual(input, metafile.inputs[input]);
          if (virtual) {
            const malformed = copy(metafile.inputs[input]); malformed.bytes = 1;
            assert.notDeepEqual(malformed, metafile.inputs[input], 'Virtual metadata control actually changes bytes');
            let observed = null;
            try { compilerVirtual(input, malformed); } catch (error) { observed = { name: error.name, message: error.message }; }
            assert(observed && observed.name === 'AssertionError', 'The same virtual admission rejects altered metadata');
            compilerVirtualInputs.push({ ...virtual, negativeControl: { malformed, observed } });
            write(mode.id + '/compiler-virtual.json', compilerVirtualInputs);
            continue;
          }
          const absolute = path.resolve(ROOT, input), relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
          assert(!relative.startsWith('../') && !path.isAbsolute(relative), 'No default code loader outside locked workspace');
          if (relative.startsWith('node_modules/')) { assert.equal(sha(fs.readFileSync(absolute)), dependencyHashes.get(relative)); continue; }
          safeRelative(relative); assert(records.has(relative), 'Every repository compiler input used a strict historical Git reader: ' + relative); metadataRepo.push(relative);
        }
        assert.deepEqual(metadataRepo.sort(), [...records.keys()].sort()); assert.equal(loaded.length, records.size);
        for (const row of records.values()) {
          assert(row.compiledSourceSha256);
          if (!previouslyHandled(row.relative)) {
            assert(sourceHashes.has(row.relative), 'Default-loaded repository input existed in actual197');
            assert.equal(row.rawSha256, sourceHashes.get(row.relative), 'Historical default-loaded repository code would confound actual197: ' + row.relative);
            if (row.parser !== 'empty') assert.equal(row.compiledSourceSha256, sha(normalized(row.raw)), 'Default-loaded code has no new source transformation');
          }
          if (!mode.original) assert.equal(row.sourceRef, mode.ref);
          else if (!mode.shield || row.relative !== 'src/lib/soccerCareerExtraCups.ts') assert.equal(row.sourceRef, CONFIG.originalRef);
        }
        if (mode.shield) {
          const expected = mode.original ? baseline.loaded.original : baseline.loaded.current, actual = kitLoaded.filter(row => previouslyHandled(row.file));
          const project = rows => rows.map(row => ({ file: row.file, rawSha256: row.rawSha256, compiledSha256: row.compiledSha256, original: row.original })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
          assert.deepEqual(project(actual), project(expected), 'Reproduction exactly matches actual197 source input bytes and existing transformations');
          assert.equal(actual.length, mode.original ? 117 : 151);
        } else {
          assert.equal(records.has('src/lib/soccerCareerExtraCups.ts'), false, 'No Shield helper enters either pre-Shield/raw original graph');
          assert.equal(records.get(enginePath).rawSha256, mode.original ? sha(oldEngine) : sha(preEngine));
        }
        const result = { mode, repositoryInputs: records.size, thirdPartyInputs: Object.keys(metafile.inputs).length - metadataRepo.length - compilerVirtualInputs.length - 1, compilerVirtualInputs, actual197SourceAndTransformationClosure: mode.shield, nonSrcHistoricalRawMatchesActual197: true, executable: pin(fs.readFileSync(executable)), metadataFile: mode.id + '/metafile.json' };
        write(mode.id + '/closure.json', result); builds.push(result);
      }
    };
  }
  const modePairs = [
    { id: 'reproduction', current: { id: 'reproduce-current', original: false, ref: CONFIG.currentRef, shield: true }, original: { id: 'reproduce-original', original: true, ref: CONFIG.originalRef, shield: true } },
    { id: 'pre-shield', current: { id: 'pre-shield-current', original: false, ref: CONFIG.preShieldRef, shield: false }, original: { id: 'raw-original', original: true, ref: CONFIG.originalRef, shield: false } }
  ];
  let inputIndex = 0;
  const pairResults = [];
  for (const pair of modePairs) {
    stage = pair.id + '-graph-closure';
    const currentBundle = await K.bundleAgentReview({ original: false, sourceBinding: sourceBinding(pair.current) });
    const originalBundle = await K.bundleAgentReview({ original: true, sourceBinding: sourceBinding(pair.original) });
    stage = pair.id + '-read';
    const probeInput = K.copy(baseInput), read = K.seeded(CONFIG.case.seed, () => K.action(currentBundle.value, 'read', probeInput));
    reads.push({ pair: pair.id, ...read, inputAfter: probeInput }); write(pair.id + '/read.json', reads.at(-1));
    const results = {};
    for (const [role, bundle, mode] of [['original', originalBundle, pair.original], ['current', currentBundle, pair.current]]) {
      stage = mode.id + '-advance';
      const working = inputs[inputIndex++], before = K.copy(working), result = K.seeded(CONFIG.case.seed, () => K.action(bundle.value, 'next', working));
      const full = { mode: mode.id, input: before, workingInputAfter: working, result };
      write(mode.id + '/advance.json', full); const binary = writeBytes(mode.id + '/complete-return.v8', serialize(result));
      advances.push({ mode: mode.id, inputSha256: sha(JSON.stringify(before)), drawCount: result.draws.length, rawFile: mode.id + '/advance.json', completeReturn: binary });
      write('advance-progress.json', { actualCalls: advances.length, advances }); results[role] = result;
    }
    pairResults.push({ pair: pair.id, current: results.current, original: results.original, read, readInputAfter: probeInput });
  }
  // Four complete results and two read observations are retained before these functional assertions.
  stage = 'retained-whole-comparisons';
  assert.equal(advances.length, 4); assert.equal(inputIndex, 4); assert.equal(JSON.stringify(baseInput), inputBytes);
  const comparisons = [];
  for (const pair of pairResults) {
    const comparison = same(pair.current, pair.original), tape = same(pair.current.draws, pair.original.draws);
    assert.deepEqual(pair.read.draws, [], 'Original read path uses no global draws'); assert.equal(JSON.stringify(pair.readInputAfter), inputBytes, 'Original raw read input remains held');
    const differences = sourceDiff(pair.original, pair.current);
    const record = { id: pair.pair, wholeValueAndDraws: comparison, drawTape: tape, differences, currentLeague: pair.current.value.currentLeague, originalLeague: pair.original.value.currentLeague };
    write(pair.pair + '/comparison.json', record); comparisons.push(record);
  }
  const reproduction = comparisons[0];
  assert.equal(reproduction.wholeValueAndDraws.equal, false, 'The retained first whole-state failure must actually reproduce');
  assert.equal(reproduction.currentLeague, 'Ligue 1'); assert.equal(reproduction.originalLeague, 'Ligue 2');
  summary = { schemaVersion: 1, diagnosticCompleted: true, qualification: false, actualAdvanceCalls: 4, actualReadCalls: 2, case: CONFIG.case, builds, comparisons, classification: 'Descriptive whole-pair outcomes only; Root owns causal/inherited classification and adoption', sourcePolicy: 'Entire current pre-Shield graph at exact cc9; raw d69 original; no current fallback or field stripping', resultsLayoutBrowser: 'UNRUN', oldFeatureControls: 'UNRUN', remainingOwners: 'UNRUN', runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN' };
  write('summary.json', summary); console.log('AGENT_BASELINE_DIAGNOSTIC: four actual advances, two whole comparisons, no product or inherited adoption credit');
} catch (error) {
  primary = error; failures.push({ stage, name: error.name, message: error.message, stack: error.stack }); write('failure.json', { stage, actualAdvanceCalls: advances.length, actualReadCalls: reads.length, builds, failures });
} finally {
  try { write('source-after.json', holds()); } catch (error) { secondary.push({ stage: 'holds', name: error.name, message: error.message, stack: error.stack }); }
  try {
    if (kitCopy) { assert.equal(path.dirname(kitCopy), path.join(ROOT, 'scripts/qa')); assert(path.basename(kitCopy).startsWith('__control_agent_baseline_')); assert.deepEqual(fs.readFileSync(kitCopy), kitCopyBytes); fs.unlinkSync(kitCopy); }
  } catch (error) { secondary.push({ stage: 'copy-cleanup', name: error.name, message: error.message, stack: error.stack }); }
  try { assert.equal(Math.random, nativeRandom); assert.equal(Date.now, nativeNow); } catch (error) { secondary.push({ stage: 'native-global-restoration', name: error.name, message: error.message, stack: error.stack }); }
  write('receipt.json', { schemaVersion: 1, diagnosticCompleted: summary?.diagnosticCompleted === true && !primary && secondary.length === 0, primary: primary ? { stage, name: primary.name, message: primary.message, stack: primary.stack } : null, secondary, actualAdvanceCalls: advances.length, actualReadCalls: reads.length, removedKitCopy: !kitCopy || !fs.existsSync(kitCopy), runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN' });
}
if (primary) throw primary;
assert.deepEqual(secondary, []);

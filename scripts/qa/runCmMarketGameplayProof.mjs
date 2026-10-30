/* Immutable-product browser gameplay proof. Temporary controls are never
   product commits, and a predicted card cue is never a persisted outcome. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_GAMEPLAY_PROOF_OUT || '');
const SELF = fileURLToPath(import.meta.url);
const PRODUCT = '50394b38cbce7ef47041116059f9c9802ce3fe1a';
const TREE = 'ee2dcfea808a27c4313aadafc750578de99ef9f0';
const BRANCH = 'refs/heads/codex/soccer-live-cm-gameplay-20261030';
const DRIVER = 'scripts/qa/proveCmMarketGameplay.mjs';
const DRIVER_BLOB = '3007df90e5a77c99327097d00399cdf4a6ad60f7';
const CONTROLLER = 'scripts/qa/runCmMarketGameplayProof.mjs';
const WORKFLOW = '.github/workflows/cm-market-gameplay-proof.yml';
const FIXTURE_DIR = 'scripts/qa/cm-gameplay-fixtures-v1/';
const INPUTS = {
  'EXPECTED.json': '8d07d2fe6530bfba5d8555e428a860592b54b32da645c7c7e5ff0c2b8b7edf8f',
  'natural-expiry-before.career.json': 'c8ad5bc85e41fe68cd18820e6e8dd218d7d75db44ee350207e6c4d680305f533',
  'natural-expiry-closed.career.json': '09efdf7882ced8be900df9bd07abebbcd64026ec10c3c910df212cbaea65e7f3',
  'price-open.career.json': '6ccad4970d75cb61e51bba4685a58db34f701a00e0c8376f790d5651a61a38a8',
};
const SOURCE_PINS = {
  "index.html": "f6d81a169d0c98f3b86551665c5cc83c7919dc48",
  "scripts/lib/answerConsent.mjs": "c6d16997e4c06e8b35dcfd0bab5efcad3069d899",
  "scripts/lib/hostLikeServer.mjs": "21059d5e8114669df61106c125d5272d357b6236",
  "scripts/lib/pageSeed.mjs": "981886d1bfe271740c27e57cd01989bceecb4fb1",
  "scripts/lib/playwrightLoader.mjs": "4f7739e217e0a47ee82e6bfc8be1c04bed17454a",
  "scripts/qa/freeKickLab1070.mjs": "1cf030d9182fd4fd68fca39f32e757c69bf9e58a",
  "src/components/club-manager/ContractsCard.tsx": "8bf2813801b5a63fe9da37dc362be6c8fa408472",
  "src/components/club-manager/FreeAgentPool.tsx": "a85232cafe27b0a4bafc9914be2a8c74a7ee96e9",
  "src/components/club-manager/TransferScreen.tsx": "1157975509a11dc6ce7d75d1d02221787716ad1b",
  "src/hooks/useClubManager.ts": "7297073ea60b93501df48ea9b7dfc74edd2217de",
  "src/index.css": "775df500bd7c9730e5b04aedd3d6b2a1564d49b4",
  "src/lib/clubManager.ts": "962aab2c18611c40c1fc998c77c384ab02b2d7b6",
  "src/lib/clubManagerWorldRoster.ts": "8fc15c82723512dd36482747bf9d06f8c731fa01",
  "src/pages/ClubManager.tsx": "1ec2e88ec6e0e45b268f53cfbfab1981c84979b8"
};
const CONTROLS = [
  {
    "id": "contracts-no-commit",
    "path": "src/pages/ClubManager.tsx",
    "before": "<ContractsCard career={c} onRelease={g.terminate} onSignFreeAgent={g.signFree} onRenew={g.renew}",
    "after": "<ContractsCard career={c} onRelease={g.terminate} onSignFreeAgent={() => {}} onRenew={g.renew}",
    "fixedGitBlob": "1ec2e88ec6e0e45b268f53cfbfab1981c84979b8",
    "fixedSHA256": "2987127955c2f3914fb2891c2e8a6302f13caa093ab31d59c0cb472da5754c41",
    "mutantBytes": 104550,
    "mutantSHA256": "45157fa670ff26791e8142b8290af2917c7051603436b80095329cdd81ed6721",
    "mutantGitBlob": "ec31785046ddd30d65f2f6ba1b830c56c3e493c8",
    "ownedCase": "contracts-phone-natural-return",
    "ownedMarker": "CM_BROWSER_SIGN_NOT_PERSISTED"
  },
  {
    "id": "price-ignore-custom-ceiling",
    "path": "src/components/club-manager/TransferScreen.tsx",
    "before": ".filter(m => m.price <= maxAsk)",
    "after": ".filter(() => true)",
    "fixedGitBlob": "1157975509a11dc6ce7d75d1d02221787716ad1b",
    "fixedSHA256": "c483b07a91051360be0b85a87a65b01642e0ea94dc04ee6d5032360e67d112d7",
    "mutantBytes": 80245,
    "mutantSHA256": "804eacf2cfdfdbb7b1ebb312993d20f8354cefbcf8dec748fcb4bc344b8bde72",
    "mutantGitBlob": "4297f533b6f6ddeef84f6d0f3f761d331f179877",
    "ownedCase": "price-phone-asking-boundary",
    "ownedMarker": "CM_BROWSER_PRICE_CEILING_IGNORED"
  }
];
const CASE_IDS = ['market-desktop-natural-return', 'market-phone-natural-return', 'contracts-phone-natural-return',
  'price-desktop-asking-boundary', 'price-phone-asking-boundary'];
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');
const read = name => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
assert(process.env.CI === 'true' && OUT !== ROOT && path.isAbsolute(OUT), 'Remote proof output required');
assert.equal(sha(fs.readFileSync(SELF)), process.env.CM_GAMEPLAY_CONTROLLER_SHA256, 'Actual frozen controller');
function inventory(dir) {
  const rows = [];
  function walk(at) { for (const e of fs.readdirSync(at, { withFileTypes: true })) {
    const full = path.join(at, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile()) { const bytes = fs.readFileSync(full); rows.push({ path: path.relative(dir, full).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) }); }
  } }
  walk(dir); return rows.sort((a, b) => a.path.localeCompare(b.path));
}
function state() {
  return { head: git('rev-parse', 'HEAD'), refs: git('for-each-ref', '--format=%(refname) %(objectname)'),
    index: sha(fs.readFileSync(git('rev-parse', '--git-path', 'index'))),
    files: git('ls-files', '-z').split('\0').filter(Boolean).sort().map(name => ({ path: name, sha256: sha(fs.readFileSync(path.join(ROOT, name))) })) };
}
function held(control = null) {
  const expected = read('source.initial.json');
  if (control) expected.files.find(f => f.path === control.path).sha256 = control.mutantSHA256;
  assert.deepEqual(state(), expected, 'Exact tracked source, HEAD, refs and default index held');
  assert.equal(blob(fs.readFileSync(path.join(ROOT, DRIVER))), DRIVER_BLOB, 'Actual frozen browser helper');
  const pins = { ...SOURCE_PINS }; if (control) pins[control.path] = control.mutantGitBlob;
  for (const [name, expectedBlob] of Object.entries(pins)) assert.equal(blob(fs.readFileSync(path.join(ROOT, name))), expectedBlob, 'Source pin ' + name);
  for (const [name, expectedHash] of Object.entries(INPUTS)) assert.equal(sha(fs.readFileSync(path.join(ROOT, FIXTURE_DIR, name))), expectedHash, 'Original V5 input ' + name);
}
function run(id, command, args, extra = {}, timeout = 900000) {
  const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
  const out = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), err = fs.openSync(path.join(dir, 'stderr.log'), 'wx');
  let child; try { child = spawnSync(command, args, { cwd: ROOT, env: { ...process.env, ...extra }, timeout, stdio: ['ignore', out, err] }); }
  finally { fs.closeSync(out); fs.closeSync(err); }
  const result = { command, args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  write(id + '/process.json', result); fs.writeFileSync(path.join(dir, 'raw.exit'), String(child.status) + '\n');
  assert(!result.error && !result.signal && Number.isInteger(result.status), 'Actual child completed ' + id); return result.status;
}
function success(id, command, args, extra, timeout) { assert.equal(run(id, command, args, extra, timeout), 0, 'Actual zero child ' + id); }
function offline() { return { NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'),
  SIM_OFFLINE_RECEIPT: path.join(OUT, 'node-egress.log'), SIM_NETWORK: 'offline' }; }
function archive(id, folder) {
  success('archive-' + id, 'tar', ['-cf', path.join(OUT, id + '.tar'), '-C', folder, '.']);
}
async function compile(label, control) {
  held(control); assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts.build, 'vite build', 'Actual ordinary build definition');
  const { build } = await import('vite');
  const receipt = { schema: 1, product: PRODUCT, tree: TREE, variant: control?.id || 'base', sourcePins: {}, chunks: [] };
  for (const name of Object.keys(SOURCE_PINS)) {
    const bytes = fs.readFileSync(path.join(ROOT, name)); receipt.sourcePins[name] = { gitBlob: blob(bytes), sha256: sha(bytes) };
  }
  const observer = { name: 'cm-proof-module-receipt', enforce: 'post', generateBundle(_options, bundle) {
    for (const item of Object.values(bundle)) if (item.type === 'chunk') {
      const modules = Object.entries(item.modules).map(([id, data]) => {
        const clean = id.split('?')[0]; const rel = clean.startsWith(ROOT + path.sep) ? path.relative(ROOT, clean).split(path.sep).join('/') : clean;
        return { id: rel, renderedLength: data.renderedLength };
      });
      receipt.chunks.push({ file: item.fileName, isEntry: item.isEntry, facade: item.facadeModuleId,
        modules: modules.map(m => m.id), moduleLengths: Object.fromEntries(modules.map(m => [m.id, m.renderedLength])),
        imports: item.imports, dynamicImports: item.dynamicImports, renderedCodeSHA256: sha(item.code) });
    }
  } };
  await build({ root: ROOT, configFile: path.join(ROOT, 'vite.config.ts'), plugins: [observer] });
  receipt.distFiles = inventory(path.join(ROOT, 'dist'));
  const files = new Map(receipt.distFiles.map(row => [row.path, row]));
  for (const chunk of receipt.chunks) { assert(files.has(chunk.file)); chunk.sha256 = files.get(chunk.file).sha256; }
  const index = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  receipt.bootstrapModules = [...index.matchAll(/<script\b[^>]*>/g)].map(m => m[0])
    .filter(tag => /\btype="module"/.test(tag)).map(tag => /\bsrc="([^"]+)"/.exec(tag)?.[1]?.replace(/^\/+/, '')).filter(Boolean);
  assert.equal(receipt.bootstrapModules.length, 1, 'One actual bootstrap in actual generated index');
  assert(receipt.bootstrapModules.every(name => receipt.chunks.some(c => c.file === name && c.isEntry)));
  write('compiled-' + label + '.json', receipt); held(control);
}
function rebuild(label, control) {
  success('build-' + label, process.execPath, [SELF, 'compile', label, control?.id || ''], offline());
  return read('compiled-' + label + '.json');
}
function browser(id, label, control = null, only = '') {
  held(control); const tools = read('browser-tools.json'), compiled = read('compiled-' + label + '.json');
  assert.deepEqual(inventory(path.join(ROOT, 'dist')), compiled.distFiles, 'Exactly associated current dist');
  const exit = run(id, process.execPath, [DRIVER], { ...offline(), PLAYWRIGHT_BROWSERS_PATH: tools.browsers,
    FREE_KICK_FONT_CACHE: tools.fonts, FONT_CACHE_MANIFEST_SHA256: tools.manifestSHA256, CM_COMPILED_GROUPS: path.join(OUT, 'compiled-' + label + '.json'),
    CM_GAMEPLAY_OUT: path.join(OUT, id, 'evidence'), CM_GAMEPLAY_CONTROL: control?.id || '', CM_GAMEPLAY_CASE: only, CM_GAMEPLAY_SEED: '64185' });
  const result = JSON.parse(fs.readFileSync(path.join(OUT, id, 'evidence/REPORT.json'), 'utf8'));
  assert.equal(result.rawExit, exit); assert.deepEqual(result.setupErrors, []);
  assert(result.contexts.every(c => c.pageErrors.length === 0 && c.localFailures.length === 0 && c.assetFailures.length === 0));
  assert.deepEqual(result.cases.map(c => c.id), only ? [only] : CASE_IDS);
  if (control) {
    assert.equal(exit, 1); assert.equal(result.cases[0].status, 'FAIL');
    assert.equal(result.cases[0].failure.marker, control.ownedMarker); assert.equal(result.cases[0].failure.name, 'AssertionError');
  } else {
    assert.equal(exit, 0); assert(result.cases.every(c => c.status === 'PASS'));
  }
  assert.equal(result.compiledReceiptSHA256, sha(fs.readFileSync(path.join(OUT, 'compiled-' + label + '.json'))));
  assert.deepEqual(inventory(path.join(ROOT, 'dist')), compiled.distFiles, 'Served dist held');
  held(control); return result;
}
const phase = process.argv[2];
if (phase === 'prepare') {
  assert(!fs.existsSync(OUT), 'Fresh proof evidence folder'); fs.mkdirSync(OUT, { recursive: true });
  assert.equal(git('rev-parse', PRODUCT + '^{tree}'), TREE);
  assert.equal(git('rev-parse', 'HEAD'), process.env.GITHUB_SHA); assert.equal(process.env.GITHUB_REF, BRANCH);
  assert.deepEqual(git('show', '-s', '--format=%P', 'HEAD').split(' '), [PRODUCT], 'Proof sole immutable product parent');
  const paths = [DRIVER, CONTROLLER, WORKFLOW, ...Object.keys(INPUTS).map(name => FIXTURE_DIR + name)].sort();
  assert.deepEqual(git('diff', '--name-status', PRODUCT, 'HEAD').split('\n').filter(Boolean).sort(), paths.map(name => 'A\t' + name));
  assert.equal(git('ls-tree', '-r', '--name-only', PRODUCT).split('\n').length, 5502);
  assert.equal(git('ls-files', '-z').split('\0').filter(Boolean).length, 5509);
  write('identity.json', { product: PRODUCT, tree: TREE, productFiles: 5502, proof: process.env.GITHUB_SHA, proofFiles: 5509, ref: BRANCH, additions: paths });
  write('source.initial.json', state()); held();
  git('archive', '--format=tar', '-o', path.join(OUT, 'app-source.tar'), PRODUCT);
  git('archive', '--format=tar', '-o', path.join(OUT, 'proof-source.tar'), 'HEAD');
  fs.writeFileSync(path.join(OUT, 'node-egress.log'), '');
} else if (phase === 'deps') {
  success('npm-ci', 'npm', ['ci'], {}, 900000); held();
} else if (phase === 'types') {
  success('types', path.join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json'], offline()); held();
} else if (phase === 'compile') {
  const label = process.argv[3], mode = process.argv[4] || '', control = mode ? CONTROLS.find(c => c.id === mode) : null;
  assert(['base', 'contracts-no-commit', 'contracts-restored', 'price-ignore-custom-ceiling', 'price-restored'].includes(label));
  assert(!mode || control, 'Known exact source control'); await compile(label, control);
} else if (phase === 'build') {
  success('ordinary-build', 'npm', ['run', 'build'], offline()); held();
  const ordinary = inventory(path.join(ROOT, 'dist')); write('ordinary-dist.json', ordinary);
  const observed = rebuild('base', null);
  assert.deepEqual(observed.distFiles, ordinary, 'Inert compiler observer emits byte-identical ordinary dist');
  archive('dist-default', path.join(ROOT, 'dist'));
} else if (phase === 'browser-tools') {
  held();
  const tools = path.join(process.env.RUNNER_TEMP, 'cm-gameplay-browser-tools'), browsers = path.join(tools, 'browsers');
  const fonts = path.join(OUT, 'font-cache'); assert(!fs.existsSync(tools));
  success('browser-install', 'npm', ['install', '--prefix', tools, '--no-save', '--package-lock=false', 'playwright@1.64.0']);
  for (const pkg of ['playwright', 'playwright-core']) {
    assert(!fs.existsSync(path.join(ROOT, 'node_modules', pkg)), 'No browser package collision');
    fs.symlinkSync(path.join(tools, 'node_modules', pkg), path.join(ROOT, 'node_modules', pkg), 'dir');
  }
  success('browser-versions', process.execPath, ['-e', 'const a=require("node:assert/strict");a.equal(require("playwright/package.json").version,"1.64.0");a.equal(require("playwright-core/package.json").version,"1.64.0");console.log(JSON.stringify({node:process.version,playwright:require("playwright/package.json").version}))']);
  success('chromium-install', process.execPath, [path.join(tools, 'node_modules/playwright/cli.js'), 'install', '--with-deps', 'chromium'],
    { PLAYWRIGHT_BROWSERS_PATH: browsers }, 1200000);
  success('font-prefetch', process.execPath, ['scripts/qa/freeKickLab1070.mjs', '--prefetch-fonts-only'], { FREE_KICK_FONT_CACHE: fonts, NODE_OPTIONS: '' });
  write('browser-tools.json', { tools, browsers, fonts, version: '1.64.0', manifestSHA256: sha(fs.readFileSync(path.join(fonts, 'manifest.json'))) }); held();
} else if (phase === 'browser') {
  const baseline = browser('normal-five', 'base');
  const controlReceipts = [];
  for (const control of CONTROLS) {
    held(); const file = path.join(ROOT, control.path), fixed = fs.readFileSync(file), text = fixed.toString('utf8');
    assert.equal(blob(fixed), control.fixedGitBlob); assert.equal(sha(fixed), control.fixedSHA256);
    assert.equal(text.split(control.before).length - 1, 1, 'Exactly one active literal control anchor');
    const changed = Buffer.from(text.replace(control.before, () => control.after));
    assert.notEqual(sha(changed), sha(fixed)); assert.equal(sha(changed), control.mutantSHA256);
    assert.equal(blob(changed), control.mutantGitBlob);
    const sourceDir = path.join(OUT, 'control-source-' + control.id); fs.mkdirSync(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'original.tsx'), fixed); fs.writeFileSync(path.join(sourceDir, 'changed.tsx'), changed);
    write('control-source-' + control.id + '/mutation.json', control);
    let measured, restored;
    try {
      fs.writeFileSync(file, changed); held(control);
      const compiled = rebuild(control.id, control), initial = read('compiled-base.json');
      const oldChunk = initial.chunks.find(c => c.modules.includes(control.path));
      const newChunk = compiled.chunks.find(c => c.modules.includes(control.path));
      assert(oldChunk && newChunk && oldChunk.sha256 !== newChunk.sha256, 'Actual controlled module chunk changed');
      archive('dist-' + control.id, path.join(ROOT, 'dist'));
      measured = browser('control-' + control.id, control.id, control, control.ownedCase);
    } finally {
      fs.writeFileSync(file, fixed); held();
      const label = control.id === 'contracts-no-commit' ? 'contracts-restored' : 'price-restored';
      const rebuilt = rebuild(label, null);
      assert.deepEqual(rebuilt.distFiles, read('compiled-base.json').distFiles, 'Exact same-copy healthy dist restored');
      restored = browser('restore-' + control.id, label, null, control.ownedCase);
    }
    const ordinary = baseline.cases.find(c => c.id === control.ownedCase);
    assert.deepEqual(restored.cases[0].outcome, ordinary.outcome, 'Same restored user outcome');
    controlReceipts.push({ id: control.id, case: control.ownedCase, marker: control.ownedMarker,
      controlExit: measured.rawExit, restoredExit: restored.rawExit, sourceRestored: true, distRestored: true });
  }
  held(); assert.equal(fs.statSync(path.join(OUT, 'node-egress.log')).size, 0, 'No attempted Node production egress');
  write('BROWSER-ADMISSION.json', { product: PRODUCT, tree: TREE, normalCases: baseline.cases.map(c => ({ id: c.id, status: c.status, outcome: c.outcome })),
    normalRawExit: baseline.rawExit, controls: controlReceipts, originalV5FixtureInputsHeld: true, sourceAndCompiledBootstrapGroupsHeld: true,
    optimisticCueCredit: false, phoneMeasurements: baseline.uiMeasurements, touchFindingsForVisualReview: baseline.touchFindings,
    fullSuite: 'UNRUN', fullSEO: 'UNRUN', sizeCapPrerequisite: 'Separate final-target cap admission required; no waiver or prior-head credit' });
} else if (phase === 'retain') {
  const errors = []; try { held(); } catch (error) { errors.push(String(error)); }
  if (fs.existsSync(path.join(OUT, 'font-cache'))) archive('font-cache', path.join(OUT, 'font-cache'));
  write('FINAL-HOLDS.json', { sourceErrors: errors, sourceHeld: errors.length === 0, indexAndRefsHeld: errors.length === 0,
    fullSuite: 'UNRUN', fullSEO: 'UNRUN', caps: 'NO_WAIVER_SEPARATE_PREREQUISITE' });
  write('ARTIFACT-BODIES.json', inventory(OUT)); assert.equal(errors.length, 0, 'Final exact source restoration');
} else throw new Error('Unknown proof phase ' + phase);
console.log('CM_GAMEPLAY_PROOF_PHASE_COMPLETE ' + phase);

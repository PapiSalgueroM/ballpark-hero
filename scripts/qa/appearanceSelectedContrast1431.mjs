/* Round1431: current appearance regressions and exact selected-ink source ownership.
   Rendered contrast and rebuilt controls are separate after-build browser evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function appearanceContrastPlan() {
  return {
    base: '62d7c8b3338809a1aec3d0aaa6b5c373ac9f581a',
    file: 'src/components/soccer-career/AppearanceBuilder.tsx',
    originalSha256: '94a22773c5075085f47e032f4cb7b9e3d5baf733a70a18cf63265c2523625e05',
    fixedSha256: 'abbf03e4ffe7c36f6d6600a925a61f2916e07a45d80913fe7be17a42426b5102',
    hunks: [
      { name: 'chip-old', original: '      active\n        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"',
        fixed: '      active\n        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 [.light_&]:text-foreground"' },
      { name: 'category-old', original: '              tab === t.key\n                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"',
        fixed: '              tab === t.key\n                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 [.light_&]:text-foreground"' },
      { name: 'gear-old', original: '                  appearance.boots === b.id\n                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"',
        fixed: '                  appearance.boots === b.id\n                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 [.light_&]:text-foreground"' },
      { name: 'celebration-old', original: '                  appearance.celebration === c.id\n                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"',
        fixed: '                  appearance.celebration === c.id\n                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 [.light_&]:text-foreground"' },
    ],
  };
}

export function appearanceContrastSources(original) {
  const hash = value => createHash('sha256').update(value).digest('hex'), plan = appearanceContrastPlan();
  const once = (body, before, after) => {
    assert.notEqual(before, after);
    assert.equal(body.split(before).length, 2, 'One exact executable selected-ink anchor');
    const changed = body.replace(before, after); assert.notEqual(changed, body); return changed;
  };
  const refuse = (body, before, after) => {
    const altered = before.replace(/\S/, '#'); assert.notEqual(altered, before);
    for (const candidate of [body.replace(before, ''), body.replace(before, altered), body + '\n' + before]) {
      assert.throws(() => once(candidate, before, after), /One exact executable selected-ink anchor/);
    }
  };
  assert.equal(hash(original), plan.originalSha256, 'Whole claimed PR341 Builder');
  let fixed = original;
  for (const hunk of plan.hunks) { refuse(fixed, hunk.original, hunk.fixed); fixed = once(fixed, hunk.original, hunk.fixed); }
  assert.equal(hash(fixed), plan.fixedSha256);
  let inverse = fixed;
  for (const hunk of [...plan.hunks].reverse()) { refuse(inverse, hunk.fixed, hunk.original); inverse = once(inverse, hunk.fixed, hunk.original); }
  assert.equal(inverse, original, 'Whole four-ink inverse restores the claimed Builder');
  const sources = { normal: fixed }, controls = [];
  for (const hunk of plan.hunks) {
    refuse(fixed, hunk.fixed, hunk.original);
    const changed = once(fixed, hunk.fixed, hunk.original), restored = once(changed, hunk.original, hunk.fixed);
    assert.equal(restored, fixed, 'Single-ink inverse restores the complete fixed Builder');
    sources[hunk.name] = changed;
    controls.push({ name: hunk.name, mutations: [{ before: hunk.fixed, after: hunk.original }], changedSha256: hash(changed),
      recoveredSha256: hash(restored), refusals: ['missing', 'altered', 'duplicate'], renderedProof: 'owed in separately rebuilt browser arm' });
  }
  sources['whole-original'] = original; sources.restored = inverse;
  for (const hunk of plan.hunks) sources.restored = once(sources.restored, hunk.original, hunk.fixed);
  assert.equal(sources.restored, fixed);
  return { plan, fixed, inverse, sources, controls };
}

function main() {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
  assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
  assert.equal(process.env.SIM_NETWORK, 'offline');
  const outerTransport = process.env.SIM_OFFLINE_RECEIPT;
  assert(outerTransport && fs.existsSync(outerTransport) && fs.statSync(outerTransport).size === 0, 'Caller creates the empty outer transport before invocation');
  const mode = process.env.APPEARANCE_CONTRAST_MODE;
  assert(['baseline', 'fixed'].includes(mode));
  const evidenceRoot = process.env.APPEARANCE_CONTRAST_OUT;
  assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'));
  const out = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
  const ORIGINAL_ADMISSION = {"scope":"full-original-rendered-contrast-native-pixels","originalSourceSha256":"94a22773c5075085f47e032f4cb7b9e3d5baf733a70a18cf63265c2523625e05","head":"93a3fd6db0847f0450ad8daa163118d5d9bcbbac","commonSha256":"9d7f5ddc7a086e34cb0157c32000087cd8102d4b9ec4090023858253af5de986","featureSha256":"56c1bd63b70ebac12dc6ec5ddc0cd66713d7d3f9c88762f89054ca7ae5a6c7da","pixelSha256":"751bbfc06110446590fb802a8e21aabd95231083de42b437e739775f6c30a800","fullAdmissionSha256":"327add0e3ae23b8330accec74ee0e0ea5256aafb7cc495185af3762be107ca6b"};
  const hash = value => createHash('sha256').update(value).digest('hex');
  const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
  const source = Object.fromEntries(tracked.toString('utf8').split('\0').filter(Boolean)
    .map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
  const plan = appearanceContrastPlan(), original = git(['show', plan.base + ':' + plan.file]).toString('utf8');
  const designed = appearanceContrastSources(original), actual = fs.readFileSync(path.join(ROOT, plan.file), 'utf8');
  const tests = 'src/test/appearanceCategoryScroll.test.tsx';
  const held = [plan.file, tests, 'src/components/soccer-career/PlayerAvatar.tsx', 'src/lib/soccerCareerAppearance.ts',
    'src/lib/careerAppearanceCopy.ts', 'src/lib/soccerBoots.ts', 'src/test/appearanceSportCopy.test.tsx',
    'src/test/soccerAppearanceOptions.test.tsx', 'src/test/fixtures/soccerAppearanceLegacy1425.json',
    'scripts/simSoccerAppearanceOptions.mjs', 'scripts/simAppearanceCategoryScroll.mjs',
    'scripts/qa/playAppearanceCategoryScroll.mjs', 'src/index.css', 'src/lib/theme.ts',
    'src/components/layout/ThemeToggle.tsx', 'package.json', 'package-lock.json', 'vite.config.ts', 'vitest.config.ts',
    'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs'];
  const boundSource = held.map(file => {
    const old = git(['show', plan.base + ':' + file]), current = fs.readFileSync(path.join(ROOT, file));
    if (file !== plan.file || mode === 'baseline') assert(current.equals(old), 'Whole claimed source held: ' + file);
    return { file, originalSha256: hash(old), actualSha256: hash(current) };
  });
  assert.equal(source[tests], 'a9b67ee0f2fdc3f8cc494482a57fab92b69df22c219722e7198cac19925e047d');
  assert.equal(actual, mode === 'baseline' ? original : designed.fixed, 'Only the declared four ink expressions can differ');
  if (mode === 'fixed') {
    assert(ORIGINAL_ADMISSION, 'Fixed qualification refused until complete measured original admission');
    assert.equal(ORIGINAL_ADMISSION.scope, 'full-original-rendered-contrast-native-pixels');
    assert.equal(ORIGINAL_ADMISSION.originalSourceSha256, plan.originalSha256);
    assert(/^[0-9a-f]{40}$/.test(ORIGINAL_ADMISSION.head));
    for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'fullAdmissionSha256']) {
      assert(/^[0-9a-f]{64}$/.test(ORIGINAL_ADMISSION[key]), 'Actual admitted original ' + key);
    }
  }
  const summary = { version: 1, mode, status: 'failed', productQualified: false, renderedContrastProofPassed: false,
    scope: 'Actual unchanged current appearance scroll regressions and exact ink source ownership only. Rendered contrast is separate browser evidence.',
    base: plan.base, originalAdmission: ORIGINAL_ADMISSION, actualProductSha256: hash(actual), boundSource,
    wholeInverse: { originalSha256: hash(original), fixedSha256: hash(actual), recoveredSha256: hash(original), hunks: mode === 'baseline' ? [] : plan.hunks },
    reviewedPlan: { ...plan, recoveredSha256: hash(designed.inverse), refusals: ['missing', 'altered', 'duplicate'], scope: 'SOURCE-DESIGN-ONLY' },
    controls: mode === 'baseline' ? [] : designed.controls, modules: [], currentScroll: null, sourceHeld: false };
  fs.writeFileSync(path.join(out, 'original-AppearanceBuilder.tsx'), original);
  if (mode === 'fixed') {
    fs.writeFileSync(path.join(out, 'fixed-AppearanceBuilder.tsx'), actual);
    fs.writeFileSync(path.join(out, 'inverse-AppearanceBuilder.tsx'), designed.inverse);
    for (const [arm, body] of Object.entries(designed.sources)) {
      const file = arm + '-AppearanceBuilder.tsx'; fs.writeFileSync(path.join(out, file), body);
      summary.modules.push({ arm, file, sha256: hash(body) });
    }
  }
  const save = () => fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  try {
    const dir = path.join(out, 'current-scroll'); fs.mkdirSync(dir);
    const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(dir, 'transport.transport') }; delete env.NO_DOUBLE_SWAP;
    fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const rawFile = path.join(dir, 'vitest.json'), started = Date.now();
    const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', tests,
      '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + rawFile],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
    fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
    fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify({ status: child.status, signal: child.signal,
      error: child.error ? String(child.error) : null, elapsedMs: Date.now() - started, timeoutMs: 240000,
      noDoubleSwapPresent: Object.hasOwn(env, 'NO_DOUBLE_SWAP') }, null, 2) + '\n');
    assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0);
    assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')));
    const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
    assert.equal(raw.success, true); assert.equal(raw.testResults.length, 1); assert.equal(raw.numTotalTests, 15);
    assert.equal(raw.numPassedTests, 15); assert.equal(raw.numFailedTests, 0); assert.equal(raw.numPendingTests, 0); assert.equal(raw.numTodoTests, 0);
    assert.equal(raw.numRuntimeErrorTestSuites || 0, 0);
    if (raw.numUnhandledErrors !== undefined) assert.equal(raw.numUnhandledErrors, 0);
    if (raw.unhandledErrors !== undefined) assert.deepEqual(raw.unhandledErrors, []);
    const names = ['starts a changed category at its first choices without changing the look',
      'keeps the same category and scroll when its current category is clicked',
      'keeps the current options scroll when an option changes its saved field'];
    const declared = ['soccer', 'nfl', 'nba', 'mlb', 'nhl'].flatMap(sport => names.map(name => sport + ' appearance category scroll ' + name));
    const rows = raw.testResults.flatMap(file => file.assertionResults);
    assert.deepEqual(rows.map(row => row.fullName).sort(), [...declared].sort());
    for (const row of rows) { assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []); }
    const transport = path.join(dir, 'transport.transport'); assert(fs.existsSync(transport) && fs.statSync(transport).size === 0);
    summary.currentScroll = { passed: 15, failed: 0, pending: 0, rawSha256: hash(fs.readFileSync(rawFile)),
      testSha256: source[tests], currentSource: true, physicalScrollClaim: false };
    summary.status = 'passed';
  } finally {
    assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])));
    for (const [file, digest] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), digest, file);
    assert.equal(fs.statSync(outerTransport).size, 0);
    summary.sourceHeld = true; save();
  }
  console.log('Current appearance scroll:15 actual unchanged cases passed. Ink inverse/source controls are declarations; measured contrast remains separate.');
  console.log(JSON.stringify({ kind: 'APPEARANCE_CONTRAST_RESULT', mode, evidenceRoot,
    summarySha256: hash(fs.readFileSync(path.join(out, 'summary.json'))), sourceHeld: true, productQualified: false,
    renderedContrastProofPassed: false }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

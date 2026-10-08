/** Round 1083: actual mounted sale decisions, atomic save refusal and retained
 * source-copy controls. Remote CI only. Original tests and fixtures stay held. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/* Release AM: this harness refused to start outside remote CI, so every local
   run of the suite was red by construction. Nothing here reaches the network
   (it mounts the tycoon page in jsdom from local source), so it runs wherever the
   suite runs. The Vitest child was always handed CI=1 and still is.
   The generated config also sets a 60 second test timeout: the cancel, help,
   escape and close case measured 5.3, 6.0 and 6.3 seconds on the owner's PC
   while a gate ran, against Vitest's default of 5, so the harness was a coin
   toss there. Every control must still fail with an AssertionError, so a
   longer clock cannot turn a failing control green. */
process.env.CI ||= '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.TYCOON_SALE_REVIEW_ARTIFACTS || path.join(root, 'tycoon-sale-review-artifacts', 'outcomes'));
const TEST = 'src/test/tycoonSaleReview.test.tsx';
const PAGE = 'src/pages/StadiumTycoon.tsx';
const HOOK = 'src/hooks/useStadiumTycoon.ts';
const CARD = 'src/components/tycoon/TycoonSaleReview.tsx';
const ENGINE = 'src/lib/stadiumTycoon.ts';
const BASELINE = 'independent purchase preserves original engine accounting';
const COUNT = 12;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const unix = value => value.replaceAll('\\', '/');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const save = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const sourceFiles = ['src', 'scripts'].flatMap(dir => files(path.join(root, dir))).concat(
  ['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'tsconfig.app.json', 'tsconfig.json', 'index.html'].map(file => path.join(root, file)));
const holds = () => {
  const hashes = {};
  for (const file of sourceFiles.sort()) {
    const bytes = fs.readFileSync(file);
    hashes[unix(path.relative(root, file))] = sha(bytes);
  }
  return hashes;
};
fs.mkdirSync(out, { recursive: true });
const before = holds();
assert.equal(sha(read('scripts/fixtures/tycoon1080Baseline/stadiumTycoon.ts')), '7d5ac60884efa739aee35d0f211dbb33f072af83b11f226502eda4f2f582e58a', 'frozen original purchase baseline changed');
save(path.join(out, 'source-before.json'), before);
process.on('exit', () => save(path.join(out, 'source-after.json'), holds()));

const controls = [
  ['page', PAGE, '<TycoonSaleReview state={s} onSell={g.doPrestige} />', '<button aria-label="Review selling up" onClick={g.doPrestige}>Sell</button>', 'actual page opens review without selling or writing progress'],
  ['award', CARD, 'const award = pointsForSale(state);', 'const award = pointsForSale(state) + 1;', 'review terms follow promoted ground perks reputation and current state'],
  ['cash', CARD, 'const startingCash = startingMoneyOf(state);', 'const startingCash = startingMoneyOf(state) + 1;', 'review terms follow promoted ground perks reputation and current state'],
  ['reputation', CARD, 'const nextRep = repMult({ ...state, rep: state.rep + 1 });', 'const nextRep = repMult(state);', 'review terms follow promoted ground perks reputation and current state'],
  ['example', CARD, 'const currentPoints = legacyPointsOf(state);', 'const currentPoints = legacyPointsOf(state) + 1;', 'review terms follow promoted ground perks reputation and current state'],
  ['resetCopy', CARD, "This ground's earnings reset to 0.", "This ground's earnings are kept.", 'review terms follow promoted ground perks reputation and current state'],
  ['keepCopy', CARD, 'Your Academy players, first team, gems and gear stay as they are.', 'Your Academy players are reset.', 'review terms follow promoted ground perks reputation and current state'],
  ['cancel', CARD, "help ? setHelp(false) : changeOpen(false)", 'help ? setHelp(false) : sell()', 'cancel help escape and close preserve equal-clock page simulation'],
  ['close', CARD, 'setOpen(next);', 'if (!next) onSell();\n    setOpen(next);', 'cancel help escape and close preserve equal-clock page simulation'],
  ['promotion', CARD, 'const award = pointsForSale(state);', 'const award = useMemo(() => pointsForSale(state), []);', 'actual promotion and perk purchase refresh the open review'],
  ['save', HOOK, 'try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, now)); } catch { return false; }', 'try { void now; } catch { return false; }', 'final page confirmation matches complete current engine result and save'],
  ['latest', HOOK, 'const next = prestige(stateRef.current, now);', 'const next = prestige(state, now);', 'same-task latest ref sale and pagehide survive exact reload'],
  ['ref', HOOK, 'stateRef.current = next;\n    setState(next);\n    return true;', 'setState(next);\n    return true;', 'same-task latest ref sale and pagehide survive exact reload'],
  ['failedState', HOOK, 'catch { return false; }\n    stateRef.current = next;', 'catch { stateRef.current = next; setState(next); return false; }\n    stateRef.current = next;', 'refused sale preserves latest ref state and old durable bytes'],
  ['failedSuccess', HOOK, 'catch { return false; }\n    stateRef.current = next;', 'catch { return true; }\n    stateRef.current = next;', 'refused sale preserves latest ref state and old durable bytes'],
  ['alert', CARD, 'else { setSaveFailed(true); selling.current = false; }', 'else { setSaveFailed(false); selling.current = false; }', 'refused sale preserves latest ref state and old durable bytes'],
  ['retry', CARD, 'else { setSaveFailed(true); selling.current = false; }', 'else { setSaveFailed(true); }', 'retry after running ticks sells latest terms and clears failure'],
  ['reopen', CARD, 'setHelp(false); setSaveFailed(false);', 'setHelp(false);', 'failed sale can be cancelled and reopened without a transaction'],
  ['disabled', CARD, 'disabled={!canPrestige(state)}', 'disabled={false}', 'ineligible review and hook cannot sell or write'],
  ['ineligible', HOOK, 'if (next === stateRef.current) return false;', 'if (next === stateRef.current) return true;', 'ineligible review and hook cannot sell or write'],
  ['duplicate', CARD, 'if (selling.current || !canPrestige(state)) return;', 'if (!canPrestige(state)) return;', 'successful confirmation guards a second same-task activation'],
  ['protected', CARD, 'if (onSell()) setOpen(false);', "if (onSell()) { localStorage.removeItem('wonderkidFactoryV1'); setOpen(false); }", 'final page confirmation matches complete current engine result and save'],
];

function run(name, aliases = {}, intended = null) {
  const dir = path.join(out, name);
  fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'vitest-report.json');
  const configPath = path.join(dir, 'vitest.config.mjs');
  const interesting = [TEST, PAGE, HOOK, CARD, ENGINE, 'scripts/fixtures/tycoon1080Baseline/stadiumTycoon.ts'].map(file => unix(path.join(root, file))).concat(Object.values(aliases));
  const config = `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(); const dir = ${JSON.stringify(unix(dir))}; const wanted = ${JSON.stringify(interesting)};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({ root: ${JSON.stringify(unix(root))}, plugins: [react(), {
  name: 'retain-sale-transform', enforce: 'post', transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\\\', '/'); if (!wanted.includes(file)) return null;
    const input = fs.readFileSync(file); const output = 'transforms/' + hash(file).slice(0, 16) + '.js';
    fs.mkdirSync(path.join(dir, 'transforms'), { recursive: true }); fs.writeFileSync(path.join(dir, output), code);
    seen.set(file, { file, inputSha256: hash(input), transformedSha256: hash(code), output });
    fs.writeFileSync(path.join(dir, 'transforms.json'), JSON.stringify([...seen.values()], null, 2)); return null;
  }
}], test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(unix(path.join(root, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}], testTimeout: 60000 },
resolve: { alias: ${JSON.stringify({ ...aliases, '@': unix(path.join(root, 'src')) })} } });
`;
  save(configPath, config);
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', configPath, '--reporter=json', `--outputFile.json=${reportPath}`, '--reporter=default'];
  if (intended) args.push('-t', `(${escape(BASELINE)}|${escape(intended)})$`);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, status: child.status, signal: child.signal, error: child.error?.message ?? null });
  assert(!child.error && child.signal === null, `${name}: subprocess setup failure`);
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(output), `${name}: runtime/setup failure`);
  assert(fs.existsSync(reportPath), `${name}: missing actual Vitest report`);
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const tests = raw.testResults.flatMap(file => file.assertionResults);
  const records = (child.stdout || '').split(/\r?\n/).filter(line => line.includes('SALE_RECORD|')).map(line => JSON.parse(line.slice(line.indexOf('SALE_RECORD|') + 12)));
  save(path.join(dir, 'records.json'), records);
  assert.equal(tests.length, COUNT, `${name}: test inventory changed`);
  const baseline = records.find(record => record.id === BASELINE);
  assert(baseline, `${name}: complete independent baseline was not retained`);
  assert.deepEqual(baseline.actual, baseline.expected, `${name}: actual purchase baseline changed`);
  assert.equal(tests.find(test => test.title === BASELINE)?.status, 'passed', `${name}: baseline test failed`);
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json'), 'utf8'));
  for (const [alias, file] of Object.entries(aliases)) {
    const bytes = fs.readFileSync(file);
    const inputSha256 = sha(bytes);
    assert(transforms.some(row => row.file === file && row.inputSha256 === inputSha256), `${name}: copied source not actually transformed`);
    const original = unix(path.join(root, 'src', alias.slice(2))) + path.extname(file);
    assert(!transforms.some(row => row.file === original), `${name}: original replaced module still loaded`);
  }
  let failure = null;
  if (!intended) {
    assert.equal(child.status, 0, 'healthy mounted suite failed');
    assert(tests.every(test => test.status === 'passed'), 'healthy case did not pass');
    for (const row of records) assert.deepEqual(row.actual, row.expected, `healthy retained mismatch: ${row.id}`);
  } else {
    assert.equal(child.status, 1, `${name}: expected assertion did not fail normally`);
    assert.equal(tests.filter(test => test.status === 'failed').length, 1, `${name}: unexpected failing case`);
    assert.equal(tests.filter(test => test.status === 'passed').length, 1, `${name}: unexpected baseline inventory`);
    failure = tests.find(test => test.title === intended);
    assert.equal(failure?.status, 'failed', `${name}: mapped case did not fail`);
    assert(/AssertionError/.test(failure.failureMessages.join('\n')), `${name}: mapped failure is not an AssertionError`);
    assert(records.some(row => { try { assert.deepEqual(row.actual, row.expected); return false; } catch { return true; } }), `${name}: no retained actual consequence changed`);
  }
  const hashes = {};
  for (const file of files(dir)) {
    const bytes = fs.readFileSync(file);
    hashes[unix(path.relative(dir, file))] = sha(bytes);
  }
  return { name, intended, status: intended ? 'assertion-failed' : 'passed', passed: tests.filter(test => test.status === 'passed').length, failed: tests.filter(test => test.status === 'failed').length,
    records: records.length, baseline, failure, hashes };
}

const summary = { status: 'running', normal: null, controls: [], sourceBefore: before, sourceAfter: null };
try {
  summary.normal = run('normal');
  const mode = process.env.TYCOON_SALE_REVIEW_CONTROL || 'all';
  const selected = mode === 'all' ? controls : controls.filter(row => row[0] === mode);
  assert(selected.length, `unknown control ${mode}`);
  for (const [name, file, from, to, intended] of selected) {
    const source = read(file);
    assert.equal(source.split(from).length - 1, 1, `${name}: executable mutation anchor not unique`);
    const changed = source.replace(from, to), copy = path.join(out, 'copies', name + path.extname(file));
    assert.notEqual(changed, source, `${name}: mutation did not fire`);
    save(copy, changed);
    const mutation = { name, file, from, to, intended, baseline: BASELINE, originalSha256: before[file], normalizedSha256: sha(source), copiedSha256: sha(changed), copy: unix(path.relative(out, copy)) };
    save(path.join(out, 'copies', name + '.json'), mutation);
    const result = run(name, { [`@/${file.slice(4).replace(/\.tsx?$/, '')}`]: unix(copy) }, intended);
    assert.deepEqual(result.baseline, summary.normal.baseline, `${name}: complete independent baseline differs from normal`);
    summary.controls.push({ ...result, mutation });
  }
  summary.status = 'passed';
} finally {
  summary.sourceAfter = holds();
  save(path.join(out, 'source-after.json'), summary.sourceAfter);
  save(path.join(out, 'summary.json'), summary);
  assert.deepEqual(summary.sourceAfter, before, 'verification changed original source or fixtures');
}
console.log(`Sale review outcomes: ${summary.normal.passed}/${COUNT} mounted cases passed.`);
console.log(`Retained complete observations: ${summary.normal.records} healthy comparisons.`);
console.log(`Copied controls: ${summary.controls.length}/${controls.length} mapped AssertionErrors with identical healthy purchase baseline.`);
console.log(`Original source and fixture holds: ${Object.keys(before).length}; retained reports, copies, actual transform inputs and hashes.`);
console.log(`Tycoon sale review: passed. Evidence at ${out}`);

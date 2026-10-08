/* Actual phone components, complete state records and effective copied-source controls. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

assert(process.env.CI, 'Run this verification in remote CI only');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.SOCCER_PHONE_CURRENCY_ARTIFACTS || path.join(root, 'soccer-phone-currency-artifacts/outcomes'));
const TEST = 'src/test/soccerPhoneCurrency.test.tsx';
const PHONE = 'src/components/soccer-career/PhonePanel.tsx', MONEY = 'src/components/soccer-career/MoneyScreens.tsx';
const BASELINE = 'unchanged money engine retains complete euro outcomes';
const USD = 'USD phone navigation converts only displayed money', EUR = 'EUR phone navigation converts only displayed money';
const BOUNDARY = 'zero debt and billion balances preserve canonical signs units and input';
const ACTIONS = 'money action callbacks keep exact euro amounts and percentages';
const SHOP = 'shop callbacks and eligibility use the original euro price';
const QUIZ = 'actual phone quiz prize displays selected currency without changing its callback';
const COUNT = 13;
const sha = value => createHash('sha256').update(value).digest('hex');
const unix = value => value.replaceAll('\\', '/');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const save = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const sourceFiles = ['src', 'scripts'].flatMap(dir => files(path.join(root, dir))).concat(['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'tsconfig.app.json', 'tsconfig.json', 'index.html'].map(file => path.join(root, file)));
function holds() {
  const result = {};
  for (const file of sourceFiles.sort()) { const bytes = fs.readFileSync(file); result[unix(path.relative(root, file))] = sha(bytes); }
  return result;
}
fs.mkdirSync(out, { recursive: true }); const before = holds();
save(path.join(out, 'source-before.json'), before);
const controls = [
  ['home-wealth', PHONE, 'formatNetWorth(career.netWorth + moneyWealth(career))', 'formatNetWorth(career.netWorth)', USD, 'USD home display'],
  ['debt-sign', PHONE, 'formatNetWorth(career.netWorth + moneyWealth(career))', 'formatNetWorth(Math.abs(career.netWorth + moneyWealth(career)))', BOUNDARY, 'boundary header'],
  ['note', PHONE, 'const conversionNote = rateNote();', 'const conversionNote = null;', USD, 'USD home display'],
  ['euro-note', PHONE, 'const conversionNote = rateNote();', 'const conversionNote = rateNote() ?? "Converted from euros at incorrect rates";', EUR, 'EUR home display'],
  ['draw', PHONE, 'const conversionNote = rateNote();', 'Math.random(); const conversionNote = rateNote();', USD, 'USD home state held'],
  ['write', PHONE, 'const conversionNote = rateNote();', 'localStorage.setItem("soccerCareerSave", "changed"); const conversionNote = rateNote();', USD, 'USD home state held'],
  ['input', PHONE, 'const conversionNote = rateNote();', 'career.age += 1; const conversionNote = rateNote();', USD, 'USD home state held'],
  ['bank-total', MONEY, 'formatNetWorth(bank.total)', 'String(bank.total)', USD, 'USD bank fields'],
  ['bank-cash', MONEY, 'formatNetWorth(bank.cash)', 'String(bank.cash)', USD, 'USD bank fields'],
  ['bank-vault', MONEY, 'formatNetWorth(bank.vault)', 'String(bank.vault)', USD, 'USD bank fields'],
  ['bank-invested', MONEY, 'formatNetWorth(bank.invested)', 'String(bank.invested)', USD, 'USD bank fields'],
  ['wage-rate', MONEY, 'career.weeklyWage * currency.perEur', 'career.weeklyWage', USD, 'USD bank fields'],
  ['wage-symbol', MONEY, '${currency.symbol}${Math.round', '${"€"}${Math.round', USD, 'USD bank fields'],
  ['wage-precision', MONEY, 'Math.round(career.weeklyWage * currency.perEur)', 'Math.round(Math.round(career.weeklyWage / 1000) * 1000 * currency.perEur)', USD, 'USD bank fields'],
  ['statement', MONEY, 'formatNetWorth(e.a)', 'String(e.a)', USD, 'USD bank fields'],
  ['won', MONEY, 'formatNetWorth(bank.won)', 'String(bank.won)', USD, 'USD bank fields'],
  ['lost', MONEY, 'formatNetWorth(bank.lost)', 'String(bank.lost)', USD, 'USD bank fields'],
  ['market-funds', MONEY, 'You have {formatNetWorth(spendable(career))} to put in', 'You have {String(spendable(career))} to put in', USD, 'USD market fields'],
  ['market-holding', MONEY, 'you hold {formatNetWorth(held)}', 'you hold {String(held)}', USD, 'USD market fields'],
  ['market-index', MONEY, 'Math.round(m.price[a.id])', 'formatNetWorth(m.price[a.id])', USD, 'USD market fields'],
  ['asset-funds', MONEY, '<Row label="You have to spend" value={formatNetWorth(free)}', '<Row label="You have to spend" value={String(free)}', USD, 'USD asset fields'],
  ['asset-holding', MONEY, '<Row label="You are holding" value={formatNetWorth(held)}', '<Row label="You are holding" value={String(held)}', USD, 'USD asset fields'],
  ['asset-profit', MONEY, '${formatNetWorth(pnl)}', '${String(pnl)}', USD, 'USD asset fields'],
  ['asset-index', MONEY, 'Math.round(m.price[def.id])', 'formatNetWorth(m.price[def.id])', USD, 'USD asset fields'],
  ['shop-budget', MONEY, '<span>{formatNetWorth(spendable(career))} to spend</span>', '<span>{String(spendable(career))} to spend</span>', USD, 'USD shop budget'],
  ['shop-description', MONEY, 'localizeMoney(item.description)', 'item.description', USD, 'USD shop values'],
  ['shop-effect', MONEY, '⚡ {localizeMoney(item.effect)}', '⚡ {item.effect}', USD, 'USD narrative money values'],
  ['shop-upkeep', MONEY, 'formatNetWorth(item.monthlyCost)', 'String(item.monthlyCost)', USD, 'USD shop values'],
  ['shop-price', MONEY, 'item.cost > 0 ? formatNetWorth(item.cost) : "Hire"', 'item.cost > 0 ? String(item.cost) : "Hire"', USD, 'USD shop values'],
  ['cards-record', MONEY, 'formatNetWorth(m.cNet)', 'String(m.cNet)', USD, 'USD card values'],
  ['cards-stake', MONEY, 'formatNetWorth(cap)', 'String(cap)', USD, 'USD card values'],
  ['cards-limit', MONEY, 'formatNetWorth(CARD_SHUT)', 'String(CARD_SHUT)', USD, 'USD card values'],
  ['quiz-prize', MONEY, 'formatNetWorth(ARCADE_PRIZE)', 'String(ARCADE_PRIZE)', QUIZ, 'quiz prize currency'],
  ['deposit-value', MONEY, 'onMoney({ t: "deposit", amount: free * 0.25 })', 'onMoney({ t: "deposit", amount: free * 0.25 * currency.perEur })', ACTIONS, 'money callbacks stay in euros'],
  ['trade-value', MONEY, 'onMoney({ t: "buy", id: def.id, amount: free * 0.1 })', 'onMoney({ t: "buy", id: def.id, amount: free * 0.2 })', ACTIONS, 'money callbacks stay in euros'],
  ['shop-action', MONEY, 'onClick={() => onBuy(item.id)}', 'onClick={() => onBuy("changed-item")}', SHOP, 'shop callbacks keep the item id'],
  ['shop-eligibility', MONEY, 'career.netWorth >= item.minNetWorth', 'career.netWorth >= item.minNetWorth * 2', SHOP, 'shop eligibility stays in euros'],
];
const observedFiles = [TEST, PHONE, MONEY, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerMoney.ts', 'src/lib/careerMoney.ts', 'src/lib/soccerCurrency.ts', 'src/lib/soccerArcade.ts', 'src/lib/dialogA11y.ts'];
for (const file of observedFiles) { const dest = path.join(out, 'originals', file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest); }

function run(name, replacement = null, intended = null, assertion = null) {
  const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'vitest-report.json'), configPath = path.join(dir, 'vitest.config.mjs');
  const aliases = replacement ? { [`@/${replacement.file.slice(4).replace(/\.tsx?$/, '')}`]: replacement.copy } : {};
  const interesting = observedFiles.map(file => unix(path.join(root, file))).concat(replacement ? [replacement.copy] : []);
  save(configPath, `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(), dir = ${JSON.stringify(unix(dir))}, wanted = ${JSON.stringify(interesting)};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({ root: ${JSON.stringify(unix(root))}, plugins: [react(), {
  name: 'retain-phone-currency-transform', enforce: 'post', transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\\\', '/'); if (!wanted.includes(file)) return null;
    const input = fs.readFileSync(file), output = 'transforms/' + hash(file).slice(0, 16) + '.js';
    fs.mkdirSync(path.join(dir, 'transforms'), { recursive: true }); fs.writeFileSync(path.join(dir, output), code);
    seen.set(file, { file, inputSha256: hash(input), transformedSha256: hash(code), output });
    fs.writeFileSync(path.join(dir, 'transforms.json'), JSON.stringify([...seen.values()], null, 2)); return null;
  }
}], test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(unix(path.join(root, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}], maxWorkers: 1, fileParallelism: false },
resolve: { alias: { ...JSON.parse(process.env.NO_DOUBLE_SWAP || '{}'), '@': ${JSON.stringify(unix(path.join(root, 'src')))} } } });
`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', configPath, '--reporter=json', `--outputFile.json=${reportPath}`, '--reporter=default'];
  if (intended) args.push('-t', `^(${escape(BASELINE)}|${escape(intended)})$`);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, timeout: 240000,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', NO_DOUBLE_SWAP: JSON.stringify(aliases) } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, aliases, status: child.status, signal: child.signal, error: child.error?.message ?? null });
  assert(!child.error && child.signal === null, `${name}: subprocess setup failure`);
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require/.test(output), `${name}: runtime/setup failure`);
  assert(fs.existsSync(reportPath), `${name}: missing actual Vitest report`);
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8')), tests = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.numUnhandledErrors ?? 0, 0); assert.equal(raw.numRuntimeErrorTestSuites ?? 0, 0);
  assert.equal(raw.unhandledErrors?.length ?? 0, 0); assert(raw.testResults.every(file => !file.testExecError));
  const marker = 'SOCCER_PHONE_CURRENCY_RECORD|';
  const records = (child.stdout || '').split(/\r?\n/).filter(line => line.includes(marker)).map(line => JSON.parse(line.slice(line.indexOf(marker) + marker.length)));
  save(path.join(dir, 'records.json'), records);
  assert.equal(tests.length, COUNT, `${name}: test inventory changed`);
  const baseline = records.find(record => record.id === BASELINE);
  assert(baseline, `${name}: complete engine baseline missing`); assert.deepEqual(baseline.actual, baseline.expected);
  assert.equal(tests.find(test => test.title === BASELINE)?.status, 'passed');
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json'), 'utf8'));
  for (const row of transforms) {
    const inputBytes = fs.readFileSync(row.file); assert.equal(sha(inputBytes), row.inputSha256);
    const outputBytes = fs.readFileSync(path.join(dir, row.output)); assert.equal(sha(outputBytes), row.transformedSha256);
  }
  for (const file of ['src/lib/soccerCareerEngine.ts', 'src/lib/careerMoney.ts', 'src/lib/soccerCurrency.ts']) {
    assert(transforms.some(row => row.file === unix(path.join(root, file)) && row.inputSha256 === before[file]), `${name}: actual held engine dependency not transformed: ${file}`);
  }
  if (replacement) {
    let digest; { const bytes = fs.readFileSync(replacement.copy); digest = sha(bytes); }
    assert(transforms.some(row => row.file === replacement.copy && row.inputSha256 === digest), `${name}: copy was not executed`);
    assert(!transforms.some(row => row.file === unix(path.join(root, replacement.file))), `${name}: original replaced module was also transformed`);
  }
  let failure = null, mismatch = null;
  if (!intended) {
    assert.equal(child.status, 0, 'healthy mounted suite failed'); assert(tests.every(test => test.status === 'passed'));
    for (const record of records) assert.deepEqual(record.actual, record.expected, `healthy retained mismatch: ${record.id}`);
  } else {
    assert.equal(child.status, 1, `${name}: expected normal assertion exit`);
    assert.equal(tests.filter(test => test.status === 'failed').length, 1); assert.equal(tests.filter(test => test.status === 'passed').length, 1);
    assert.equal(tests.filter(test => test.status === 'skipped').length, COUNT - 2, `${name}: unselected inventory was not skipped`);
    failure = tests.find(test => test.fullName === intended);
    assert.equal(failure?.status, 'failed');
    const message = failure.failureMessages.join('\n');
    assert(message.includes('AssertionError') && message.includes(assertion), `${name}: incorrect assertion failure`);
    mismatch = records.find(record => record.id === assertion && JSON.stringify(record.actual) !== JSON.stringify(record.expected));
    assert(mismatch, `${name}: actual mapped mismatch missing`);
  }
  const hashes = {};
  for (const file of files(dir)) { const bytes = fs.readFileSync(file); hashes[unix(path.relative(dir, file))] = sha(bytes); }
  return { name, intended, assertion, status: intended ? 'assertion-failed' : 'passed', total: tests.length,
    passed: tests.filter(test => test.status === 'passed').length, failed: tests.filter(test => test.status === 'failed').length, skipped: tests.filter(test => test.status === 'skipped').length,
    recordCount: records.length, baseline, failure, mismatch, hashes };
}

const summary = { status: 'running', normal: null, controls: [], sourceBefore: before, sourceAfter: null,
  limits: ['Actual components in jsdom; no physical layout acceptance.', 'Financial boundary fields explicitly staged on an engine-created career.', 'Read-only navigation and exact callback payloads; not a full page-level financial transaction or save-failure proof.'] };
try {
  summary.normal = run('normal');
  for (const [name, file, from, to, intended, assertion] of controls) {
    const source = read(file); assert.equal(source.split(from).length - 1, 1, `${name}: executable anchor not unique`);
    const changed = source.replace(from, to), copy = path.join(out, 'copies', name + path.extname(file));
    assert.notEqual(changed, source); assert.equal(changed.split(to).length - 1, 1, `${name}: reverse anchor not unique`);
    assert.equal(changed.replace(to, from), source); save(copy, changed);
    const mutation = { name, file, from, to, intended, assertion, baseline: BASELINE, originalSha256: before[file], normalizedSha256: sha(source), copiedSha256: sha(changed), copy: unix(path.relative(out, copy)), reverseExact: true };
    save(path.join(out, 'copies', name + '.json'), mutation);
    const result = run(name, { file, copy: unix(copy) }, intended, assertion);
    assert.deepEqual(result.baseline, summary.normal.baseline, `${name}: independent baseline changed`);
    summary.controls.push({ ...result, mutation });
  }
  summary.status = 'passed';
} catch (error) { summary.status = 'failed'; summary.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
finally {
  summary.sourceAfter = holds();
  try { assert.deepEqual(summary.sourceAfter, before, 'Verification changed source or fixtures'); }
  catch (error) { summary.status = 'failed'; summary.sourceHoldError = error.message; throw error; }
  finally { save(path.join(out, 'source-after.json'), summary.sourceAfter); save(path.join(out, 'summary.json'), summary); }
}
console.log(`Phone currency: ${summary.normal.passed}/${COUNT} mounted component and independent engine cases passed.`);
console.log(`Complete retained comparisons: ${summary.normal.recordCount}, including every input, storage, RNG and clock observation.`);
console.log(`Copied controls: ${summary.controls.length}/${controls.length} actual mapped AssertionErrors with identical healthy engine baseline.`);
console.log(`Exact source and fixture holds: ${Object.keys(before).length}; raw reports, copies, config and transformed executable hashes retained.`);
console.log(`Phone currency evidence: ${out}`);

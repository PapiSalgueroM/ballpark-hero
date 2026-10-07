/** Round 1080: actual engine/hook/card outcomes, frozen Standard replay and
 * retained effective source copies. Run only after the build has completed.
 * TYCOON_TICKET_POLICY_CONTROL=all proves every mapped fault with an unchanged
 * independent purchase baseline. Measurements describe finite seeded scenarios;
 * they are not a claim that all possible upgrade strategies are balanced. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.TYCOON_TICKET_POLICY_ARTIFACTS || path.join(root, 'tycoon-ticket-policy-artifacts', 'outcomes'));
fs.mkdirSync(out, { recursive: true });
const test = 'src/test/tycoonTicketPolicy.test.tsx';
const engine = 'src/lib/stadiumTycoon.ts';
const hook = 'src/hooks/useStadiumTycoon.ts';
const card = 'src/components/tycoon/TicketPolicyCard.tsx';
const baseline = 'independent upgrade purchase keeps original cost and money accounting';
const COUNT = 20;
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const held = [engine, hook, card, 'src/pages/StadiumTycoon.tsx', test, 'src/test/tycoonPitch.test.tsx',
  'src/lib/leagueCore.ts', 'src/lib/tycoonRewards.ts', 'src/hooks/useOwnedTimeouts.ts',
  'src/lib/wonderkidFactory.ts', 'src/components/tycoon/TycoonPitch.tsx',
  'src/test/fixtures/tycoonSaves.json', 'scripts/fixtures/tycoon1080Baseline/stadiumTycoon.ts',
  'scripts/fixtures/tycoon1080Baseline/useStadiumTycoon.ts', 'scripts/simTycoonTicketPolicy.mjs'];
const sourceHashes = () => Object.fromEntries(held.map(file => [file, hash(read(file))]));
const before = sourceHashes();
assert.equal(before['scripts/fixtures/tycoon1080Baseline/stadiumTycoon.ts'], '7d5ac60884efa739aee35d0f211dbb33f072af83b11f226502eda4f2f582e58a', 'frozen original engine changed');
assert.equal(before['scripts/fixtures/tycoon1080Baseline/useStadiumTycoon.ts'], 'e94e4f5c903d9b76ce220d95205371b4804fbae50b8b8edbfecc405f3e32148f', 'frozen original hook changed');
const write = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
write('source-before.json', before);
process.on('exit', () => write('source-after.json', sourceHashes()));

const controls = [
  ['legacy', engine, 'levels: { ...base.levels, ...(p.levels ?? {}) },\n    };', 'levels: { ...base.levels, ...(p.levels ?? {}) },\n    };\n    s.money += 1;', 'existing save corpus keeps the exact original normalized shape'],
  ['standard', engine, "if (ticketPolicyOf(s) === 'standard') return 0.05 + tk * 0.011 + sn * 0.009 + sh * 0.016;", "if (ticketPolicyOf(s) === 'standard') return 0.06 + tk * 0.011 + sn * 0.009 + sh * 0.016;", 'Standard keeps exact original trajectories events and random draws'],
  ['demand', engine, "gate: 1.25, demand: 0.75, growth: 0.75", "gate: 1.25, demand: 1, growth: 0.75", 'actual tick earnings and crowd follow the offered gate and finite demand'],
  ['gate', engine, "gate: 1.25, demand: 0.75, growth: 0.75", "gate: 1, demand: 0.75, growth: 0.75", 'actual tick earnings and crowd follow the offered gate and finite demand'],
  ['concessions', engine, 'return (0.05 + tk * 0.011) * ticketTerms(s).gate + sn * 0.009 + sh * 0.016;', 'return (0.05 + tk * 0.011 + sn * 0.009 + sh * 0.016) * ticketTerms(s).gate;', 'parking and payroll never receive the gate multiplier and concessions use actual crowd'],
  ['payroll', engine, 'return (fans * perFan + parking + staffBaseIncome(s))', 'return (fans * perFan + (parking + staffBaseIncome(s)) * ticketTerms(s).gate)', 'parking and payroll never receive the gate multiplier and concessions use actual crowd'],
  ['growth', engine, 'return base * winPull * pressure * rootsMult(s) * ticketTerms(s).growth;', 'return base * winPull * pressure * rootsMult(s);', 'supporter growth changes once and preserves capacity pressure and legacy roots'],
  ['money', engine, "if (policy === ticketPolicyOf(s)) return s;\n  const next = { ...s };", "if (policy === ticketPolicyOf(s)) return s;\n  const next = { ...s, money: s.money + 1 };", 'switches conserve existing money clocks bonuses and all unrelated state'],
  ['tap', engine, '(incomePerSec(s) * 0.7 + mg * 2)', '(incomePerSec(s) * 0.7 * ticketTerms(s).gate + mg * 2)', 'switches conserve existing money clocks bonuses and all unrelated state'],
  ['rng', engine, 'const earned = incomePerSec(st) * dt;', "if (ticketPolicyOf(st) === 'premium') roll();\n  const earned = incomePerSec(st) * dt;", 'all offers keep the same actual scorelines league results and match draw counts'],
  ['offline', engine, 'incomePerSec({ ...s, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null })', 'incomePerSec({ ...s, ticketPolicy: undefined, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null })', 'offline uses the saved offer once with unchanged caps and no live boosts or fan growth'],
  ['migration', engine, "if (p.ticketPolicy !== 'community' && p.ticketPolicy !== 'premium') delete s.ticketPolicy;", 'void p.ticketPolicy;', 'policy migration accepts only supported values and remains readable by the old loader'],
  ['restore', engine, "if (p.ticketPolicy !== 'community' && p.ticketPolicy !== 'premium') delete s.ticketPolicy;", 'delete s.ticketPolicy;', 'policy migration accepts only supported values and remains readable by the old loader'],
  ['prestige', engine, 'leagueTitles: s.leagueTitles ?? 0,', 'leagueTitles: s.leagueTitles ?? 0,\n    ticketPolicy: s.ticketPolicy,', 'a new ground resets the offer without changing the original prestige award'],
  ['display', card, "['gate', 'Gate / sec', current.gatePerSec, dollars(current.gatePerSec)]", "['gate', 'Gate / sec', current.totalPerSec, dollars(current.totalPerSec)]", 'mounted choices drive actual hook rates and every displayed accounting line'],
  ['label', card, '15% less gate money per fan. Supporters grow 50% faster.', '5% less gate money per fan. Supporters grow 50% faster.', 'rules describe the actual finite example and selected tradeoffs before play'],
  ['selection', hook, 'const next = setTicketPolicy(stateRef.current, policy);', "const next = setTicketPolicy(stateRef.current, 'standard');", 'mounted choices drive actual hook rates and every displayed accounting line'],
  ['session', hook, 'if (next !== before) markSessionPlay();', 'void before;', 'a changed offer marks one unscored session while viewing and repeated choices stay quiet'],
  ['save', hook, 'commit(next);\n    saveTicketState(next);', 'commit(next);\n    void next;', 'selection saves immediately and restores the same offer without resetting progress'],
  ['failure', hook, 'setTicketSaveFailed(true);', 'setTicketSaveFailed(false);', 'refused save retains old bytes and explicit retry writes the latest live state'],
  ['retry', hook, 'const retryTicketSave = useCallback(() => saveTicketState(stateRef.current), [saveTicketState]);', 'const retryTicketSave = useCallback(() => saveTicketState(state), [saveTicketState]);', 'refused save retains old bytes and explicit retry writes the latest live state'],
  ['recover', hook, 'setTicketSaveFailed(false);\n      return true;', 'void next;\n      return true;', 'autosave recovers failure and hide settlement pays the chosen saved rate only once'],
  ['hide', hook, 'const saveNow = () => {\n      saveTicketState(stateRef.current);', 'const saveNow = () => {\n      void stateRef.current;', 'hide banks the latest offer and earned money before the next autosave'],
];
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function run(name, aliases = {}, intended) {
  const report = path.join(out, `${name}-report.json`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', test, '--reporter=json', `--outputFile.json=${report}`, '--reporter=default'];
  if (intended) args.push('-t', `(${escape(baseline)}|${escape(intended)})$`);
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', NO_DOUBLE_SWAP: JSON.stringify(aliases) } });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  write(`${name}-vitest.log`, output);
  assert(!result.error, `${name}: runner error ${result.error}`);
  assert(fs.existsSync(report), `${name}: missing report`);
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(output), `${name}: setup/runtime failure`);
  const raw = JSON.parse(fs.readFileSync(report, 'utf8'));
  const rows = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, COUNT, `${name}: test inventory changed`);
  if (!intended) {
    assert.equal(result.status, 0, `${name}: test process failed`);
    assert(rows.every(row => row.status === 'passed'), `${name}: normal outcome did not pass`);
    const measurement = output.match(/TICKET_MEASUREMENTS\|(\[[^\r\n]+\])/);
    assert(measurement, 'actual policy measurements were not printed');
    write('measurements.json', JSON.parse(measurement[1]));
    for (const row of rows) console.log(`PASS ${row.title}`);
  } else {
    assert.notEqual(result.status, 0, `${name}: copied fault passed`);
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', `${name}: independent purchase baseline failed`);
    const failure = rows.find(row => row.title === intended);
    assert.equal(failure?.status, 'failed', `${name}: intended outcome did not fail`);
    const messages = (failure.failureMessages || []).join('\n').replace(/\u001b\[[0-9;]*m/g, '');
    assert(/AssertionError|Error: expect\(/.test(messages), `${name}: intended failure was not an assertion`);
    assert.equal(rows.filter(row => row.status === 'failed').length, 1, `${name}: unexpected failure`);
    assert.equal(rows.filter(row => row.status === 'passed').length, 1, `${name}: unchanged baseline missing`);
    console.log(`CONTROL ${name}: intended assertion failed; independent purchase baseline passed`);
  }
  return { name, passed: rows.filter(row => row.status === 'passed').length, failed: rows.filter(row => row.status === 'failed').length, skipped: rows.filter(row => row.status !== 'passed' && row.status !== 'failed').length, intended };
}

const summary = { normal: run('normal'), controls: [] };
const mode = process.env.TYCOON_TICKET_POLICY_CONTROL || '';
const selected = mode === 'all' ? controls : mode ? controls.filter(row => row[0] === mode) : [];
assert(!mode || selected.length > 0, `unknown control ${mode}`);
for (const [name, file, from, to, intended] of selected) {
  const source = read(file);
  assert.equal(source.split(from).length - 1, 1, `${name}: mutation anchor is not unique`);
  const changed = source.replace(from, to);
  assert.notEqual(hash(changed), hash(source), `${name}: mutation did not change source`);
  const copy = path.join(out, `${name}-source${path.extname(file)}`);
  fs.writeFileSync(copy, changed);
  write(`${name}-mutation.json`, { name, file, from, to, intended, baseline, originalSha256: hash(source), copiedSha256: hash(changed), copy: path.basename(copy) });
  const alias = `@/${file.slice(4).replace(/\.tsx?$/, '')}`;
  summary.controls.push(run(name, { [alias]: copy.replaceAll('\\', '/') }, intended));
}
const after = sourceHashes();
write('source-after.json', after);
assert.deepEqual(after, before, 'verification changed held source');
write('summary.json', summary);
console.log(`Ticket policy: ${summary.normal.passed}/${COUNT} normal outcomes; ${summary.controls.length}/${selected.length} effective copied faults, each with independent purchase baseline. Raw reports, logs, copied sources and hashes retained at ${out}`);

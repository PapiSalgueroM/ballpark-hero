/* Actual saved NBA Board forecasts and real roster transactions, offline only. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const files = [board, 'src/lib/nbaFrontOffice.ts', 'src/lib/nbaLuxuryTax.ts', 'src/lib/frontOfficeCuts.ts', 'src/lib/nbaRotation.ts', 'src/lib/foHub.ts', 'src/data/nbaOpeningRatings.ts', 'src/data/conquestDataNba.ts', 'src/components/front-office-shared/FoCapPanel.tsx', 'scripts/simNbaTipOffForecast.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const source = held.find(([file]) => file === board)[1].source;
const executable = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const titles = [
  'holds restored actual roster contract bytes and unrelated storage while viewing finances',
  'shows Denver current and no-other-moves tip-off payroll and tax separately',
  'shows a real under-tax club minimum-fill cost without inventing a tax bill',
  'updates the forecast after an actual accepted salary-reducing trade',
  'includes actual waiver dead money and matches the actual subsequent tip-off fill',
  'updates minimum-fill count and cost after an actual affordable free-agent signing',
  'removes the addition forecast at fourteen players and after the first round',
  'uses actual repeater history for the no-other-moves tip-off tax estimate',
  'holds the real legacy untaxed season without inventing a future calibrated bill',
  'qualifies the forecast and identifies current payroll and tax as current estimates',
  'holds all thirty original budgets contract ages and terms schedule and random draws',
];
const controls = {
  payroll: ['  const tipPayroll = nbaTipOffPayroll(my, league.cap);', '  const tipPayroll = nbaCapUsed(my);', [1, 2, 3, 4, 5, 7, 8]],
  tax: ['nbaTaxBill(tipPayroll, league.cap, view.repeater, league.taxScale)', 'view.bill', [1, 3, 4, 7]],
  repeater: ['nbaTaxBill(tipPayroll, league.cap, view.repeater, league.taxScale)', 'nbaTaxBill(tipPayroll, league.cap, false, league.taxScale)', [7]],
  floor: ['{tipShort > 0 && (', '{true && (', [6]],
  legacy: ['  const tipTax = view.pending ? null : nbaTaxBill(tipPayroll, league.cap, view.repeater, league.taxScale);', '  const tipTax = nbaTaxBill(tipPayroll, league.cap, view.repeater, league.taxScale);', [8]],
  cost: ['${Math.round((tipPayroll - view.payroll) * 10) / 10}M at tip-off.', '${0}M at tip-off.', [1, 2, 3, 4, 5, 7, 8]],
  qualifier: ['No other moves: {tipShort}', 'At tip-off: {tipShort}', [9]],
  stage: ["view.pending ? 'Tax inactive' : 'Current tax est.'", "view.pending ? 'Tax inactive' : 'Tax'", [9]],
};
const mode = process.env.NBA_TIPOFF_FORECAST_CONTROL || '';
assert.ok(!mode || mode === 'original' || Object.hasOwn(controls, mode), 'Known forecast control');
for (const [anchor] of Object.values(controls)) {
  assert.equal(executable(source).split(anchor).length - 1, 1, 'One actual executable Board control binding');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const originalBytes = Buffer.from(crlfBytes);
  assert.equal(executable(holdSource(crlfBytes).source).split(anchor).length - 1, 1, 'Same unique binding in a CRLF checkout');
  assert.deepEqual(crlfBytes, originalBytes, 'Synthetic raw source retained');
}

const receiptFolder = await mkdtemp(path.join(os.tmpdir(), 'dukb-nba938-forecast-'));
const controlParent = path.resolve(root, '.sim-control');
await mkdir(controlParent, { recursive: true });
const folder = await mkdtemp(path.join(controlParent, 'nba-tipoff938-'));
try {
  let copy = source, expected = [];
  if (mode === 'original') {
    const old = spawnSync('git', ['show', `8ffcf5cc:${board}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(old.status, 0, 'Physical pre938 Board is available');
    assert.ok(!old.error && !old.signal, 'Original Board extraction finishes');
    copy = old.stdout.replaceAll('\r\n', '\n');
    assert.notEqual(copy, source);
    assert.doesNotMatch(executable(copy), /data-nba-tipoff-forecast/);
    expected = [1, 2, 3, 4, 5, 7, 8, 9];
    await writeFile(path.join(receiptFolder, 'original-board.tsx'), old.stdout);
  } else if (mode) {
    const [anchor, replacement, failed] = controls[mode];
    copy = source.replace(anchor, replacement); expected = failed;
    assert.notEqual(copy, source, 'Actual executable expression changes');
    assert.equal(copy.split(anchor).length - 1, 0, 'Original control binding is removed');
  }
  const relative = "from './NbaRotationPanel'";
  assert.equal(copy.split(relative).length - 1, 1);
  await writeFile(path.join(folder, 'Board.tsx'), copy.replace(relative, "from '@/components/nba-front-office/NbaRotationPanel'"));
  await writeFile(path.join(folder, 'completion.ts'), 'export function useGameCompletion() {}\nexport function recordActivity() {}\n');
  await writeFile(path.join(folder, 'Share.tsx'), 'export default function Share() { return null; }\n');
  await writeFile(path.join(folder, 'entry.ts'), "export { default as Board } from './Board';\nexport * from '@/lib/nbaFrontOffice';\nexport { NBA_OPENING_RATINGS } from '@/data/nbaOpeningRatings';\n");
  await build({ entryPoints: [path.join(folder, 'entry.ts')], outfile: path.join(folder, 'product.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent', alias: { '@/hooks/useGameCompletion': path.join(folder, 'completion.ts'), '@/lib/completions': path.join(folder, 'completion.ts'), '@/components/game/ShareButtons': path.join(folder, 'Share.tsx'), '@': path.join(root, 'src') } });
  const runner = String.raw`
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'localStorage', 'Event', 'MouseEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react'), { createRoot } = await import('react-dom/client'), E = await import('./product.mjs');
const { act } = React, clone = value => JSON.parse(JSON.stringify(value));
const KEY = 'nba-front-office-save-v1', SENTINEL = 'forecast938-unrelated';
function random(seed) { let draws = 0; const rng = () => { draws++; seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; rng.draws = () => draws; return rng; }
const fresh = () => E.initNbaLeague(random(4457), E.NBA_OPENING_RATINGS);
let mounted;
async function unmount() { if (mounted) { await act(async () => mounted.unmount()); mounted = null; } }
async function mount(league, team) {
  await unmount(); localStorage.clear();
  const raw = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw); localStorage.setItem(SENTINEL, 'exact unrelated payload');
  mounted = createRoot(document.getElementById('root'));
  await act(async () => mounted.render(React.createElement(E.Board)));
  const roster = [...document.querySelectorAll('button')].find(button => [...button.querySelectorAll('div')].some(label => label.textContent.trim() === 'Roster'));
  assert.ok(roster, 'Actual Board roster control exists');
  await act(async () => roster.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return raw;
}
const forecast = () => { const node = document.querySelector('[data-nba-tipoff-forecast]'); assert.ok(node, 'Actual no-other-moves forecast renders'); return node.textContent.replace(/\s+/g, ' ').trim(); };
const chip = () => document.querySelector('[data-tax-chip]').textContent.replace(/\s+/g, ' ').trim();
function projection(league, team) {
  const copy = clone(league); const before = E.nbaCapUsed(copy.teams[team]); const result = E.nbaTipOff(copy, random(981), team); const added = result.filled[team] ?? [];
  return { added: added.length, min: E.nbaMinContract(league.cap), cost: Math.round((E.nbaCapUsed(copy.teams[team]) - before) * 10) / 10, payroll: E.nbaCapUsed(copy.teams[team]), tax: E.nbaTaxView(copy.teams[team], copy), actual: copy };
}
function matchForecast(expected) {
  const text = forecast();
  assert.ok(text.includes(expected.added + ' minimum contract'), 'Actual missing count is shown');
  assert.ok(text.includes('at $' + expected.min + 'M'), 'Actual season minimum price is shown');
  assert.ok(text.includes('$' + expected.cost + 'M at tip-off.'), 'Actual additional payroll cost is shown');
  assert.ok(text.includes('Tip-off payroll $' + expected.payroll + 'M.'), 'Quoted payroll equals actual automatic fill');
  if (expected.tax.pending) assert.ok(text.includes('No tax this season; starts next season.'), 'Actual old untaxed season is retained');
  else assert.ok(text.includes('Tax estimate $' + expected.tax.bill + 'M.'), 'Quoted tax equals actual filled-roster tax view');
}
const cases = [
  async () => { const lg = fresh(), raw = await mount(lg, 'DEN'); assert.equal(localStorage.getItem(KEY), raw); assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload'); const saved = JSON.parse(localStorage.getItem(KEY)); assert.deepEqual(saved.league, lg); assert.equal(E.nbaCapUsed(saved.league.teams.DEN), 266.6); },
  async () => { const lg = fresh(), expected = projection(lg, 'DEN'); assert.equal(expected.cost, 8); assert.equal(expected.payroll, 274.6); assert.equal(expected.tax.bill, 189.6); await mount(lg, 'DEN'); matchForecast(expected); assert.ok(chip().includes('$140.3M')); },
  async () => { const lg = fresh(), expected = projection(lg, 'BKN'); assert.equal(expected.payroll, 104.2); assert.equal(expected.tax.bill, 0); await mount(lg, 'BKN'); matchForecast(expected); assert.ok(chip().includes('none')); },
  async () => { const lg = fresh(), team = lg.teams.DEN; let chosen; outer: for (const [abbr, other] of Object.entries(lg.teams)) { if (abbr === 'DEN') continue; for (const mine of team.players) for (const theirs of other.players) { if (mine.salary - theirs.salary < 5) continue; if (E.nbaTrade(clone(team), clone(other), mine.id, theirs.id, false, lg.cap, lg.taxScale) === 'accepted') { chosen = { abbr, mine, theirs }; break outer; } } } assert.ok(chosen); const original = E.nbaCapUsed(team); assert.equal(E.nbaTrade(team, lg.teams[chosen.abbr], chosen.mine.id, chosen.theirs.id, false, lg.cap, lg.taxScale), 'accepted'); assert.ok(E.nbaCapUsed(team) < original); const expected = projection(lg, 'DEN'); await mount(lg, 'DEN'); matchForecast(expected); },
  async () => { const lg = fresh(), team = lg.teams.DEN, outgoing = team.players.slice().sort((a, b) => b.salary - a.salary)[0]; assert.equal(E.nbaRelease(team, lg.freeAgents, outgoing.id), true); assert.ok(team.deadCap.some(entry => entry.amount > 0)); const expected = projection(lg, 'DEN'); assert.equal(expected.added, 5); assert.equal(expected.cost, 10); await mount(lg, 'DEN'); matchForecast(expected); assert.ok(document.body.textContent.includes('dead money')); },
  async () => { const lg = fresh(), before = E.nbaCapUsed(lg.teams.BKN), player = lg.freeAgents.slice().sort((a, b) => b.salary - a.salary).find(p => p.salary <= E.nbaCapRoom(lg.teams.BKN, lg.cap)); assert.ok(player); assert.equal(E.nbaSign(lg.teams.BKN, lg.freeAgents, player.id, lg.cap), true); assert.equal(E.nbaCapUsed(lg.teams.BKN), Math.round((before + player.salary) * 10) / 10); const expected = projection(lg, 'BKN'); assert.equal(expected.added, 3); assert.equal(expected.cost, 6); await mount(lg, 'BKN'); matchForecast(expected); },
  async () => { const lg = fresh(); E.nbaTipOff(lg, random(982), 'DEN'); assert.equal(lg.teams.DEN.players.length, 14); await mount(lg, 'DEN'); assert.ok(document.querySelector('[data-nba-tipoff-forecast]') === null, 'No minimum-addition forecast once fourteen contracts exist'); const played = fresh(); played.round = 2; await mount(played, 'DEN'); assert.equal(played.teams.DEN.players.length, 10); assert.ok(document.querySelector('[data-nba-tipoff-forecast]') === null, 'No first-tip-off forecast after round one'); },
  async () => { const lg = fresh(); lg.teams.DEN.taxHistory = [2023, 2024, 2025].map(season => ({ season, payroll: 270, line: 220, bill: 1, repeater: false })); const expected = projection(lg, 'DEN'); assert.equal(expected.tax.repeater, true); assert.ok(expected.tax.bill > 189.6); await mount(lg, 'DEN'); matchForecast(expected); },
  async () => { const lg = fresh(); delete lg.taxScale; const raw = await mount(lg, 'DEN'); const expected = projection(lg, 'DEN'); assert.equal(expected.tax.pending, true); matchForecast(expected); assert.ok(chip().includes('Tax inactive this season')); assert.ok(document.body.textContent.includes('No luxury tax this season.')); assert.doesNotMatch(forecast(), /Tax estimate \$/); assert.equal(localStorage.getItem(KEY), raw); assert.deepEqual(E.nbaAssessTax(expected.actual), []); },
  async () => { await mount(fresh(), 'DEN'); assert.ok(forecast().startsWith('No other moves:')); assert.ok(chip().startsWith('Current tax est.')); assert.ok(document.body.textContent.includes('Payroll $266.6M of $164.961M (current)')); },
  async () => { const a = random(4457), b = random(4457), old = E.initNbaLeague(a), now = E.initNbaLeague(b, E.NBA_OPENING_RATINGS); assert.equal(a.draws(), b.draws()); assert.deepEqual(old.schedule, now.schedule); assert.equal(old.taxScale, now.taxScale); for (const key of Object.keys(now.teams)) { assert.equal(E.nbaCapUsed(old.teams[key]), E.nbaCapUsed(now.teams[key])); assert.deepEqual(old.teams[key].players.map(p => [p.name, p.age, p.years]), now.teams[key].players.map(p => [p.name, p.age, p.years])); } },
];
const titles = JSON.parse(process.env.NBA_TIPOFF_FORECAST_TITLES), rows = [];
for (const [index, run] of cases.entries()) {
  try { await run(); rows.push({ title: titles[index], status: 'passed' }); }
  catch (error) { rows.push({ title: titles[index], status: 'failed', error: { name: error.name, message: error.message, stack: error.stack } }); }
  finally { await unmount(); }
}
dom.window.close();
fs.writeFileSync(process.env.NBA_TIPOFF_FORECAST_REPORT, JSON.stringify({ rows, total: rows.length, passed: rows.filter(row => row.status === 'passed').length, failed: rows.filter(row => row.status === 'failed').length }, null, 2));
for (const row of rows) console.log(row.status + ': ' + row.title);
process.exitCode = rows.some(row => row.status === 'failed') ? 1 : 0;
`;
  await writeFile(path.join(folder, 'runner.mjs'), runner);
  const reportFile = path.join(receiptFolder, 'report.json'), transport = path.join(receiptFolder, 'transport.txt');
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(folder, 'runner.mjs')], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, NODE_ENV: 'test', SIM_OFFLINE_RECEIPT: transport, NBA_TIPOFF_FORECAST_TITLES: JSON.stringify(titles), NBA_TIPOFF_FORECAST_REPORT: reportFile } });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  await writeFile(path.join(receiptFolder, 'run.log'), output);
  assert.ok(!run.error && !run.signal, 'Bounded actual Board proof finishes');
  assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|Transform failed|not wrapped in act|Maximum update depth/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  await writeFile(path.join(receiptFolder, 'attempt.json'), JSON.stringify({ mode: mode || 'normal', status: run.status, total: report.total, expected, failed: report.rows.filter(row => row.status === 'failed').map(row => row.title) }, null, 2));
  assert.equal(report.total, titles.length);
  assert.deepEqual(report.rows.map(row => row.title), titles);
  assert.ok(report.rows.every(row => row.status === 'passed' || row.status === 'failed'), 'No skipped or pending outcomes');
  assert.deepEqual(report.rows.flatMap((row, index) => row.status === 'failed' ? [index] : []), expected, 'Only exact intended outcome assertions reject the control');
  assert.equal(report.failed, expected.length); assert.equal(report.passed, titles.length - expected.length); assert.equal(run.status, expected.length ? 1 : 0);
  assert.equal(report.rows[0].status, 'passed', 'Actual restored save and unrelated payload baseline holds');
  assert.equal(report.rows[10].status, 'passed', 'Original budget contract schedule and RNG baseline holds');
  for (const row of report.rows.filter(row => row.status === 'failed')) assert.equal(row.error.name, 'AssertionError', 'Control rejects through a meaningful outcome assertion');
  try { assert.equal((await readFile(transport, 'utf8')).trim(), '', 'No outside transport was attempted'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path.join(receiptFolder, 'verified-summary.json'), JSON.stringify({ mode: mode || 'normal', total: titles.length, passed: report.passed, failed: report.failed, intendedFailureIndices: expected, sourceHashes: Object.fromEntries(held.map(([file, { bytes }]) => [file, createHash('sha256').update(bytes).digest('hex')])), originalCommit: mode === 'original' ? '8ffcf5cc' : null, limits: 'Actual Board and engine in jsdom with DOM dispatch, actual current simulated contract datasets, only completion/activity/share presentation mocked. Not native keyboard, mobile geometry, historical contracts or live data proof.' }, null, 2));
  console.log(`NBA tip-off forecast ${mode || 'normal'}: ${report.passed}/${titles.length} passed, ${report.failed} exact intended rejections, all outcomes executed.`);
  console.log('NBA tip-off forecast: actual trade, cut/dead money, sign, minimum fill, repeater and legacy untaxed season outcomes measured through the actual Board.');
  console.log(`NBA tip-off forecast receipt: ${receiptFolder}`);
} finally {
  const target = path.resolve(folder);
  assert.equal(path.dirname(target), controlParent, 'Resolved cleanup target is directly inside the owned control directory');
  assert.ok(path.basename(target).startsWith('nba-tipoff938-'), 'Resolved cleanup target has the known owned prefix');
  await rm(target, { recursive: true, force: true });
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'All production and proof raw bytes remain held');
  }
}
console.log('NBA tip-off forecast: CRLF-safe executable controls, raw-byte holds, bounded owned-copy cleanup and zero outside transport verified.');

/* Remote-only capture of the unchanged MatchScreen walk and its two real shootout reports. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Run this qualification only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.CM_ALIGNMENT_ARTIFACTS || path.join(ROOT, 'cm-shootout-alignment-artifacts'));
const phase = process.env.CM_ALIGNMENT_PHASE || 'fixed';
assert(['baseline', 'fixed', 'inverse', 'b20'].includes(phase));
const folder = path.join(OUT, phase);
fs.mkdirSync(folder, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const sources = ['src/lib/clubManager.ts', 'src/components/club-manager/ShootoutKicks.tsx', 'src/components/club-manager/MatchReportCard.tsx', 'scripts/simMatchScreen.mjs', 'scripts/lib/seedRandom.mjs'];
const held = () => Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const sourceBefore = held();
const harness = fs.readFileSync(path.join(ROOT, 'scripts/simMatchScreen.mjs'), 'utf8');
assert.equal(blob(Buffer.from(harness)), '01273f2e622f1f5d0374cea2aa2f28ab1c58c9f8', 'Every original MatchScreen assertion remains pinned');
assert.equal(blob(fs.readFileSync(path.join(ROOT, sources[0]))), '4ce178814d8fb9de0564b32488d57c0fc75d91d6'); // Release BS fix BS-cm410-1 moved the default shootout list (display stream only); was cf17db1c
assert.equal(blob(fs.readFileSync(path.join(ROOT, sources[1]))),
  ['baseline', 'inverse'].includes(phase) ? '879b41c278e920f6faf689b236e96731cbae923c' : '700826475faf82d278cd0a6d4e6ea4861e105d67');
function filenameSeed(value) {
  let out = 0x811c9dc5;
  for (const char of value) out = Math.imul(out ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return out;
}
const inherited = Number(process.env.SIM_SEED);
const seed = (Number.isFinite(inherited) ? inherited : filenameSeed('simMatchScreen.mjs')) >>> 0;
const env = { ...process.env, SIM_SEED: String(seed), MATCH_SCREEN_CONTROL: '',
  NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require=' + JSON.stringify(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'))).trim() };
const receipt = { phase, seed, sourceBefore, runs: [], runtime: 'UNRUN until this helper executes in CI' };
function run(file, kind) {
  const artifacts = path.join(folder, kind);
  const child = spawnSync(process.execPath, [file], { cwd: ROOT,
    env: { ...env, MATCH_SCREEN_ARTIFACTS: artifacts }, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = (child.stdout || '') + '\n' + (child.stderr || '');
  fs.writeFileSync(path.join(folder, kind + '.log'), output);
  const reportFile = path.join(artifacts, 'normal-report.json');
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
  receipt.runs.push({ kind, exit: child.status, signal: child.signal, error: child.error?.message, report });
  assert(!child.error && !child.signal, 'The complete MatchScreen process must actually finish');
  assert(report, 'MatchScreen writes its real closing report');
  assert.deepEqual(report.runtimeErrors, []);
  const red = ['baseline', 'inverse'].includes(phase);
  assert.equal(child.status, red ? 1 : 0);
  assert.deepEqual(report.failedSections, red ? [4] : []);
  assert.equal(report.failureCount, red ? 2 : 0);
  if (red) {
    for (const fixture of ['Everton v Derby County', 'Ajax v Utrecht']) {
      assert(output.includes('FAIL [4]: ' + fixture + ': 1 block(s) on the card are left aligned'));
    }
  } else assert(output.includes('simMatchScreen: PASS.'));
  return report;
}
let copied = harness;
const mutations = [];
function inject(from, to, purpose) {
  assert.equal(copied.split(from).length - 1, 1, 'Capture anchor exists exactly once: ' + purpose);
  const next = copied.replace(from, to);
  assert.notEqual(next, copied);
  copied = next; mutations.push({ purpose, from, to });
}
inject('    const res = playNextEntry(state, { skipHalftime: true });',
  '    const alignmentBefore = JSON.stringify(state);\n    const res = playNextEntry(state, { skipHalftime: true });', 'retain actual pre-match state');
inject("    if (res.kind === 'match' && res.report) played.push({ report: res.report, clubName: club, live: state.live ?? null });",
  ["    if (res.kind === 'match' && res.report) {",
   "      const opponent = res.report.home === club ? res.report.away : res.report.home;",
   "      const target = res.report.decidedBy === 'pens' && ((club === 'Everton' && opponent === 'Derby County') || (club === 'Ajax' && opponent === 'Utrecht'));",
   "      played.push({ report: res.report, clubName: club, live: state.live ?? null,",
   "        ...(target ? { before: JSON.parse(alignmentBefore), state: JSON.parse(JSON.stringify(state)) } : {}) });",
   "    }"].join('\n'), 'retain only the two observed fixture saves');
const renderAnchor = ["const screens = played.map(p => ({", "  ...p,",
  "  html: render(MatchReportCard, { report: p.report, clubName: p.clubName, onContinue: () => {} }),", "}));"].join('\n');
inject(renderAnchor, renderAnchor + '\n' + [
  'const alignmentRows = screens.filter(p => p.before).map(p => ({',
  "  id: p.clubName.toLowerCase(), props: { report: p.report, clubName: p.clubName }, before: p.before, state: p.state, html: p.html,",
  "}));",
  "assert.equal(alignmentRows.length, 2, 'Both originally failing real fixtures were reached');",
  "fs.writeFileSync(process.env.CM_ALIGNMENT_CAPTURE, JSON.stringify({ seed: process.env.SIM_SEED, rows: alignmentRows }, null, 2));",
].join('\n'), 'retain actual SSR markup without changing a check');
let executedEngine = path.join(ROOT, sources[0]);
if (phase === 'b20') {
  executedEngine = path.resolve(process.env.CM_ALIGNMENT_BASELINE_ENGINE || '');
  const bytes = fs.readFileSync(executedEngine);
  assert.equal(blob(bytes), 'a505743537b383bc7885bb81f5a72c11e154b566', 'Immutable b20 engine arm');
  inject("let enginePath = " + String.fromCharCode(96) + '$' + "{ROOT_URL}/src/lib/clubManager.ts" + String.fromCharCode(96) + ";",
    'let enginePath = ' + JSON.stringify(executedEngine.replaceAll('\\', '/')) + ';', 'run immutable b20 engine with the same current dependencies');
}
const copy = path.join(ROOT, 'scripts', '.cm-shootout-alignment-' + process.pid + '-' + phase + '.mjs');
receipt.captureSourceHash = hash(Buffer.from(copied));
receipt.executedEngine = { path: executedEngine, sha256: hash(fs.readFileSync(executedEngine)), blob: blob(fs.readFileSync(executedEngine)) };
receipt.captureMutations = mutations;
try {
  if (phase !== 'b20') run(path.join(ROOT, 'scripts/simMatchScreen.mjs'), 'unchanged');
  fs.writeFileSync(copy, copied);
  fs.writeFileSync(path.join(folder, 'capture-source.mjs.txt'), copied);
  env.CM_ALIGNMENT_CAPTURE = path.join(folder, 'fixtures.json');
  run(copy, 'captured');
  const fixtures = JSON.parse(fs.readFileSync(env.CM_ALIGNMENT_CAPTURE, 'utf8'));
  for (const row of fixtures.rows) {
    fs.writeFileSync(path.join(folder, row.id + '.html'), row.html);
    assert(!row.before.shootoutOrder?.length, 'Captured actual fixture uses the default order');
    if (phase !== 'b20') assert(row.props.report.shootout?.kicks.length, 'The actual failing report carries recorded kicks');
  }
  const baselineFile = path.join(OUT, 'baseline/fixtures.json');
  if (phase !== 'baseline') {
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    assert.deepEqual(fixtures.rows.map(row => row.id), baseline.rows.map(row => row.id));
    for (const row of fixtures.rows) {
      const before = baseline.rows.find(item => item.id === row.id);
      if (phase === 'b20') {
        assert.equal(row.props.report.shootout, undefined, 'Old no-order reports omit kick details');
        for (const key of ['home', 'away', 'homeGoals', 'awayGoals', 'won', 'drawn', 'decidedBy', 'shootoutWon']) {
          assert.deepEqual(row.props.report[key], before.props.report[key], 'Same actual fixture result: ' + key);
        }
      } else {
        assert.deepEqual(row.props, before.props, 'Every report field and displayed club is identical');
        const restored = row.html.replace('bg-card border border-border rounded-xl p-3 text-center', 'bg-card border border-border rounded-xl p-3 text-left')
          .replaceAll('flex min-w-0 items-center justify-center gap-1 sm:flex-1', 'flex min-w-0 items-center gap-1 sm:flex-1');
        assert.equal(restored, before.html, 'Only the two requested class choices change actual rendered markup');
      }
    }
  }
  receipt.runtime = 'PASS';
} finally {
  if (fs.existsSync(copy)) fs.unlinkSync(copy);
  receipt.sourceAfter = held();
  receipt.sourceHeld = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter);
  fs.writeFileSync(path.join(folder, 'receipt.json'), JSON.stringify(receipt, null, 2));
  assert(receipt.sourceHeld, 'Diagnostic capture never changes product or original harness source');
}
console.log('CM shootout alignment ' + phase + ': full unchanged checks plus exact real-fixture capture passed; source held.');

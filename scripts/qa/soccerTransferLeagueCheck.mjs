import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const root = process.cwd(), out = path.join(root, 'league-artifacts', 'arms');
const files = ['src/lib/soccerCareerTransferBrief.ts', 'src/components/soccer-career/AgentBrief.tsx', 'src/lib/soccerCareerEngine.ts'];
const names = [
  "saves the native preferred league once then requests signs and reloads complete real engine states",
  "intersects the league before all three priorities and both real appearance boundaries",
  "previews an unsaved league from the complete eligible pool without widening tiers or saving a draft",
  "preserves a held league for old setters while explicit Any and normal search clear only their agreed scope",
  "constrains the actual answered destination for all nine priority and minimum combinations",
  "keeps the exact input and old offer when a valid league has no final match even after a broken promise",
  "preserves unreadable empty whitespace nonstring unknown and stale league briefs without edits requests or draws",
  "keeps an unavailable saved league readable visible and selected until the player changes it",
  "reads a matching saved receipt but refuses an otherwise identical off-league or case-changed receipt",
  "seals a league response across codec reload and repeat requests edits and clears with no new draw",
  "keeps default Any and explicit null byte-identical in complete states signed frames and random tapes",
  "keeps unsaved league drafts Back help and Escape read-only and returns focus without moving the page"
];
const originalFailures = [0,1,2,3,4,5,7,8,9].map(i => names[i]);
const held = new Map(files.map(file => [file, fs.readFileSync(file)]));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
fs.mkdirSync(out, { recursive: true });
const source = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const fixedSource = source();
const arms = [];
function run(name, expected) {
  const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const dest = path.join(dir, 'source', file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest);
  }
  const before = source();
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerTransferLeaguePreference.test.tsx',
    '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'report.json')],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, SC_TRANSFER_LEAGUE_RAW: path.join(dir, 'raw') } });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout ?? '');
  fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr ?? '');
  assert.equal(child.error, undefined, name + ' spawned');
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json')));
  const results = report.testResults.flatMap(row => row.assertionResults);
  assert.equal(results.length, 12, name + ' complete census');
  const failed = results.filter(row => row.status === 'failed');
  assert(results.every(row => row.status === 'passed' || row.status === 'failed'), name + ' no skipped or pending cases');
  for (const row of failed) assert(row.failureMessages.some(message => message.includes('AssertionError')), name + ' business failure, not setup');
  if (expected === 'pass') {
    assert.equal(child.status, 0, name + ' exit'); assert.equal(report.numFailedTests, 0, name + ' all outcomes passed');
  } else if (expected === 'original') {
    assert.equal(child.status, 1, name + ' exit'); assert.deepEqual(failed.map(row => row.title), originalFailures);
  } else {
    assert.equal(child.status, 1, name + ' changed-code fault exit');
    assert(failed.some(row => row.title === names[expected] && row.failureMessages.some(message => message.includes('SC_TRANSFER_LEAGUE_' + ({ 1: 'ORDER', 5: 'EMPTY', 8: 'RECEIPT' }[expected])))), name + ' exact owned assertion reached');
    assert(failed.every(row => originalFailures.includes(row.title)), name + ' only league behavior changed');
  }
  assert.deepEqual(source(), before, name + ' test does not mutate source');
  const rawFiles = fs.readdirSync(path.join(dir, 'raw')).sort();
  assert.equal(rawFiles.length, 12, name + ' complete full-frame RAW bodies');
  const raw = Object.fromEntries(rawFiles.map(file => [file, hash(fs.readFileSync(path.join(dir, 'raw', file)))]));
  const bytes = rawFiles.reduce((n,file) => n + fs.statSync(path.join(dir, 'raw', file)).size, 0);
  const row = { name, exit: child.status, passed: results.length - failed.length, failed: failed.map(row => row.title), source: before, raw, bytes };
  arms.push(row); fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(row,null,2)+'\n');
  console.log(name + ': ' + row.passed + ' passed, ' + failed.length + ' owned failures, ' + bytes + ' full-frame bytes');
  return row;
}
function restore() { for (const [file, body] of held) fs.writeFileSync(file,body); }
function replace(file, from, to) {
  const src = fs.readFileSync(file,'utf8'); assert.equal(src.split(from).length, 2, 'one executable fault anchor');
  const next = src.replace(from,to); assert.notEqual(next,src,'fault changed actual source');
  fs.writeFileSync(file,next); return { file, from, to, before: hash(src), after: hash(next) };
}
try {
  const fixed = run('fixed','pass');
  for (const file of files) fs.writeFileSync(file,execFileSync('git',['show','1acb33005073be70ba5aae0285ece5537f390f9a:' + file]));
  run('original','original'); restore();
  const controls = [
    { name: 'omit-league-filter', file: files[0],
      from: 'if (preferredLeague) clubs = clubs.filter(club => club.league === preferredLeague);',
      to: 'if (false && preferredLeague) clubs = clubs.filter(club => club.league === preferredLeague);', test: 1, raw: 'priority-minimum-intersections.json' },
    { name: 'omit-empty-refusal', file: files[2],
      from: 'if ((brief.minimumApps || brief.preferredLeague) && candidates.length === 0) return prev;',
      to: 'if (brief.minimumApps && candidates.length === 0) return prev;', test: 5, raw: 'empty-refusal.json' },
    { name: 'omit-receipt-league', file: files[0],
      from: '|| (value.preferredLeague && offer.club.league !== value.preferredLeague)',
      to: '|| false', test: 8, raw: 'receipt-league-validation.json' },
  ];
  const changes = [];
  for (const control of controls) {
    const edit = replace(control.file,control.from,control.to);
    const result = run(control.name,control.test);
    assert.notEqual(result.raw[control.raw],fixed.raw[control.raw],control.name + ' changed full behavior receipt');
    changes.push({ ...control, ...edit }); restore();
  }
  const restored = run('restored','pass');
  assert.deepEqual(restored.raw,fixed.raw,'every restored full RAW byte matches fixed');
  for (const arm of arms) assert.equal(arm.raw['default-any-full-frames.json'],fixed.raw['default-any-full-frames.json'],arm.name + ' exact legacy Any states, signed frames and tapes');
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({ complete: true, passed: true, fixedSource, arms, changes },null,2)+'\n');
} finally {
  restore(); assert.deepEqual(source(),fixedSource,'all product source bytes restored');
}

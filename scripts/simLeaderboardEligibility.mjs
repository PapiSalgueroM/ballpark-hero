/* Round 861: actual leaderboard copy and recorder accounting, without live writes.
   LEADERBOARD_ELIGIBILITY_CONTROL=all-games restores universal claims in a copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LEADERBOARD_ELIGIBILITY_CONTROL || '';
assert.ok(['', 'all-games'].includes(control), 'Known leaderboard eligibility control');
const files = ['src/pages/Leaderboard.tsx', 'src/lib/completions.ts', 'src/lib/streaks.ts'];
const holdSource = bytes => ({ bytes, text: bytes.toString('utf8').replace(/\r\n/g, '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/leaderboard-eligibility-'));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    let source = held[0][1].text;
    const anchors = [
      ['? `Earn a positive ranked score to appear here as ${ownShownName}.`', '? `Finish any game and you\'ll appear here as ${ownShownName}.`'],
      [': `Earn a positive ranked score in this window to appear here as ${ownShownName}.`', ': `Play something and you\'ll appear here as ${ownShownName}.`'],
      ['description="Compare ranked scores across sports. Top 100 today, 7 days, 30 days and all-time, plus your world rank. Guests can appear without an account."', 'description="One global leaderboard for every game on DoUKnowBall. Top 100 for today, the last 7 days, the last 30 days and all-time, plus your own world rank. No account needed."'],
      ['Scored games share one board. Each pays up to 100 pts a day: only your best run counts.', 'One board, every game. Each game pays up to 100 pts a day: your best run counts, spamming doesn\'t.'],
      ['standing. You do not need an account to appear: earn a positive ranked score and it\n            counts under whatever handle you are playing as. Games without a ranked score still\n            count toward your plays and streaks, but add no leaderboard points.', 'standing. You do not need an account to appear: finish a game and you are on it under\n            whatever handle you are playing as.'],
      ['>How ranked games earn points</h3>', '>Every game is worth the same day</h3>'],
      ['Each scored game pays up to 100 points a day', 'Each game pays up to 100 points a day'],
    ];
    for (const [anchor, replacement] of anchors) {
      assert.equal(source.split(anchor).length - 1, 1, 'Each control replaces a real rendered claim exactly once');
      const changed = source.replace(anchor, replacement);
      assert.notEqual(changed, source, 'The copied page actually changes');
      source = changed;
    }
    const copy = path.join(folder, 'Leaderboard.tsx');
    await writeFile(copy, source);
    owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/Leaderboard': copy });
  }
  const reportFile = path.join(folder, 'report.json');
  owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/leaderboardEligibility.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner faults are not product evidence');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 8);
  if (control) {
    const intended = [
      'rendered guidance matches an actual unscored finish and qualifies ranked participation',
      'actual metadata describes scored games and retains guest access and its canonical',
      'an empty Today rank asks for a positive score while keeping genuine empty results',
      'an empty All-Time rank asks for a positive score while keeping genuine empty results',
    ];
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, intended.length);
    assert.equal(report.numPassedTests, 8 - intended.length);
    for (const title of intended) {
      const row = rows.find(candidate => candidate.title === title);
      assert.equal(row?.status, 'failed', title);
      assert.match(row.failureMessages.join('\n'), /positive ranked score|ranked scores/);
    }
    for (const row of rows.filter(row => !intended.includes(row.title))) assert.equal(row.status, 'passed', row.title);
    console.log('simLeaderboardEligibility all-games: seven real metadata and visible claim replacements applied to a disposable page.');
    console.log('simLeaderboardEligibility all-games: four intended eligibility and metadata assertions reject the restored universal promise.');
    console.log('simLeaderboardEligibility all-games: unscored, zero and positive real-recorder accounting baselines remain green.');
    console.log('simLeaderboardEligibility all-games: failed-board reporting and same-window retry remain green, none skipped.');
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 8);
    assert.equal(report.numFailedTests, 0);
    console.log('simLeaderboardEligibility: eight actual page and recorder outcomes pass, no pending cases.');
    console.log('simLeaderboardEligibility: unscored and zero finishes count one play with zero points, positive score and guest handle are preserved.');
    console.log('simLeaderboardEligibility: real metadata, permanent guidance and Today/All-Time empty ranks explain positive-score eligibility.');
    console.log('simLeaderboardEligibility: existing failed-board and retry behavior stays separate from genuine empty results.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual page and recorder bytes held');
  }
}
console.log('simLeaderboardEligibility: actual source held, owned copies cleaned, Supabase calls stubbed and no browser launched.');

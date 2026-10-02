/* Round 885: actual Footle search choices and isolated executable controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/components/game/PlayerSearch.tsx';
const test = 'src/test/playerSearchKeyboard.test.tsx';
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all([component, test, 'src/lib/smartSearch.ts', 'src/hooks/useGame.ts', 'src/pages/Footle.tsx'].map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const source = held[0][1].source;
const titles = {
  visible: 'visible Enter submits the highlighted Player once and restores search focus',
  arrows: 'visible arrow keys preserve bounded selection and exact player identity',
  pointer: 'pointer choice submits its exact Player once',
  hidden: 'Escape followed by Enter cannot consume a hidden guess',
  down: 'ArrowDown deliberately reopens canceled suggestions before selection',
  up: 'ArrowUp deliberately reopens canceled suggestions before selection',
  exclusion: 'already guessed names are excluded without changing ranking',
  matching: 'matching remains ranked with a ten-result limit',
  reset: 'changing the query resets selection to a real current option',
  aria: 'combobox announces only visible results and its selected option',
};
const mutations = {
  hidden: ["e.key === 'Enter' && isOpen && filtered[highlightIndex]", "e.key === 'Enter' && filtered[highlightIndex]", 1, [titles.hidden]],
  reopen: ['      if (!isOpen) {\n        setIsOpen(true);\n        return;\n      }', '      if (!isOpen) return;', 2, [titles.down, titles.up]],
  active: ['`${listId}-option-${highlightIndex}`', '`${listId}-option-0`', 1, [titles.aria]],
  selected: ['aria-selected={idx === highlightIndex}', 'aria-selected={false}', 1, [titles.aria]],
  callback: ['    onSelect(player);', '    onSelect(player);\n    onSelect(player);', 1, [titles.visible, titles.arrows, titles.pointer, titles.down, titles.up, titles.exclusion, titles.matching, titles.reset]],
};
const control = process.env.PLAYER_SEARCH_KEYBOARD_CONTROL || '';
assert.ok(!control || Object.hasOwn(mutations, control), 'Known Footle search control');
const stripComments = text => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
for (const [anchor, , count] of Object.values(mutations)) {
  assert.equal(source.split(anchor).length - 1, count, 'Control binds to the exact source');
  assert.equal(stripComments(source).split(anchor).length - 1, count, 'Control binds to executable source, not prose');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const crlfHeld = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, count, 'CRLF copy has the same executable bindings');
  assert.deepEqual(crlfBytes, crlfHeld);
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/player-search885-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const [anchor, replacement] = mutations[control];
    const changed = source.replaceAll(anchor, replacement);
    assert.notEqual(changed, source, 'Control changes the actual component');
    const copy = path.join(folder, 'PlayerSearch.tsx');
    await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/game/PlayerSearch': copy });
  }
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused suite finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numTotalTests, 12);
  assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 12);
  if (control) {
    const expected = mutations[control][3];
    const failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1);
    assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    assert.equal(report.numPassedTests, 12 - expected.length);
    assert.equal(report.numFailedTests, expected.length);
    for (const row of rows) {
      assert.equal(row.status, expected.includes(row.title) ? 'failed' : 'passed');
      if (row.status === 'failed') assert.match(row.failureMessages.join('\n'), /AssertionError:|expect\(element\)/);
    }
    console.log(`Footle search ${control}: ${expected.length} intended failures, ${12 - expected.length} independent outcomes held, no skips or diagnostic faults.`);
    console.log(`PLAYER_SEARCH_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => row.title), messages: failed.map(row => row.failureMessages) })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 12);
    console.log('Footle search:12/12 actual-component cases pass, no skips or diagnostic faults.');
    console.log('Footle search: Escape cannot submit a hidden guess; either arrow deliberately reopens existing choices.');
    console.log('Footle search: visible pointer/keyboard commit the exact Player once, preserving matching, ranking, exclusions, limit, query reset and search focus.');
    console.log('Footle search: combobox visibility, current option identity and selected state match the actual list.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original component/test/search/Footle hook/page bytes held');
  }
}
console.log('Footle search: CRLF bindings proved, original bytes held and owned copies cleaned. Native and full-game acceptance are separate.');

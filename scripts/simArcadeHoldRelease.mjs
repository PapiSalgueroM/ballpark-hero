/* Round 859: real arcade boards own a primary held pointer through release.
   ARCADE_HOLD_CONTROL removes one executable protection in disposable copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.ARCADE_HOLD_CONTROL || '';
assert.ok(['', 'capture', 'cancel', 'primary', 'owner', 'unmount', 'label', 'ring'].includes(control));
const components = [
  ['@/components/free-kick/FreeKickBoard', 'src/components/free-kick/FreeKickBoard.tsx'],
  ['@/components/buzzer-beater/BuzzerBeaterBoard', 'src/components/buzzer-beater/BuzzerBeaterBoard.tsx'],
];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all([...components.map(([, file]) => file), 'src/lib/freeKick.ts', 'src/lib/buzzerBeater.ts', 'src/hooks/useArcadeFlight.ts'].map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/arcade-hold-'));
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const aliases = {};
    for (let i = 0; i < components.length; i++) {
      const source = held[i][1].source;
      const mutations = {
        capture: ['event.currentTarget.setPointerCapture(event.pointerId);', 'void event.currentTarget;'],
        primary: ['event.button !== 0 || event.isPrimary === false || heldPointerRef.current || chargingRef.current', 'heldPointerRef.current || chargingRef.current'],
        owner: ['const finishPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {\n    if (heldPointerRef.current?.id !== event.pointerId) return;', 'const finishPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {\n    void event.pointerId;'],
        cancel: ['const cancelPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {\n    if (heldPointerRef.current?.id !== event.pointerId) return;\n    clearPointerHold();\n    chargingRef.current = false;\n    setCharging(false);', 'const cancelPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {\n    if (heldPointerRef.current?.id !== event.pointerId) return;\n    clearPointerHold();'],
        unmount: ['useEffect(() => () => {\n    chargingRef.current = false;\n    clearPointerHold();', 'useEffect(() => () => {\n    chargingRef.current = false;'],
        label: [`{charging ? 'Release to ${i === 0 ? 'strike' : 'shoot'}' : 'Hold to ${i === 0 ? 'strike' : 'shoot'}'}`, `{'Hold to ${i === 0 ? 'strike' : 'shoot'}'}`],
        ring: ["charging && 'ring-2 ring-primary ring-offset-2 ring-offset-background'", 'false'],
      };
      const [anchor, replacement] = mutations[control];
      assert.equal(source.split(anchor).length - 1, 1, 'Mutation targets one real protection in each board');
      const changed = source.replace(anchor, replacement);
      assert.notEqual(changed, source);
      const copy = path.join(folder, path.basename(components[i][1]));
      await writeFile(copy, changed); owned.push(copy);
      aliases[components[i][0]] = copy;
    }
    // The Free Kick board keeps its scoped CSS beside the real component.
    const css = path.join(folder, 'FreeKickPractice.module.css');
    await writeFile(css, await readFile(path.join(root, 'src/components/free-kick/FreeKickPractice.module.css'))); owned.push(css);
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const receipt = path.join(folder, 'report.json'); owned.push(receipt);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/arcadeHoldRelease.test.tsx', '--reporter=json', '--outputFile.json=' + receipt, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal);
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(receipt, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 30); assert.equal(report.numPendingTests, 0);
  if (control) {
    const targets = {
      capture: /^(?:settles one real shot|cancels a .* fresh hold|keeps the .* its own pointer|releases its owned pointer)/,
      cancel: /^(?:cancels |shows release feedback)/,
      primary: /^(?:ignores |shows release feedback)/,
      owner: /^keeps the .* its own pointer/,
      unmount: /^releases its owned pointer/,
      label: /^shows release feedback/,
      ring: /^shows release feedback/,
    };
    const intended = rows.filter(row => targets[control].test(row.title));
    const counts = { capture: 14, cancel: 10, primary: 10, owner: 4, unmount: 2, label: 2, ring: 2 };
    assert.equal(intended.length, counts[control]);
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, intended.length);
    for (const row of rows) {
      const expected = intended.includes(row) ? 'failed' : 'passed';
      assert.equal(row.status, expected, row.fullName);
      if (expected === 'failed') assert.match(row.failureMessages.join('\n'), /(?:expect\(element\)\.toHave(?:Attribute|TextContent|Class)|AssertionError: expected)/);
    }
    console.log(`simArcadeHoldRelease ${control}: two real executable protections changed in disposable boards.`);
    console.log(`simArcadeHoldRelease ${control}: ${intended.length} intended outcome assertions fail, no skips.`);
    console.log(`simArcadeHoldRelease ${control}: ${30 - intended.length} independent outcomes stay green.`);
    console.log(`simArcadeHoldRelease ${control}: both keyboard and primary mouse pointer baselines pass.`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 30);
    console.log('simArcadeHoldRelease: 30 actual board outcomes pass, none skipped.');
    console.log('simArcadeHoldRelease: both hold buttons and playing surfaces settle once after outside release.');
    console.log('simArcadeHoldRelease: cancellation and lost capture stop power without creating a shot.');
    console.log('simArcadeHoldRelease: secondary, right and foreign pointers cannot own or release the hold.');
    console.log('simArcadeHoldRelease: unmount releases owned capture; keyboard and primary mouse pointer paths hold.');
    console.log('simArcadeHoldRelease: Hold and Release feedback follows the actual pointer/key charging state.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Real board, flight and scoring bytes held');
  }
}
console.log('simArcadeHoldRelease: owned copies cleaned, original sources held, no backend or vendor calls.');

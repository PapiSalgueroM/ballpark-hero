/* Round1433: strict actual Chromium DEBUG lifecycle and retained platform diagnostics. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const hash = body => createHash('sha256').update(body).digest('hex');
export const NATIVE_DIAGNOSTICS = Object.freeze([
  Object.freeze({ id: 'dbus-connect', perProcess: 2, signature: 'ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")' }),
  Object.freeze({ id: 'dbus-name-owner', perProcess: 2, signature: 'ERROR:dbus/object_proxy.cc:572] Failed to call method: org.freedesktop.DBus.NameHasOwner: object_path= /org/freedesktop/DBus: unknown error type: ' }),
  Object.freeze({ id: 'vaapi-no-device', perProcess: 1, signature: 'WARNING:media/gpu/vaapi/vaapi_wrapper.cc:1655] drmGetDevices2() has not found any devices' }),
  Object.freeze({ id: 'gpu-sandbox-threads', perProcess: 1, signature: 'WARNING:sandbox/policy/linux/sandbox_linux.cc:405] InitializeSandbox() called with multiple threads in process gpu-process.' }),
]);
const STAGES = ['<gracefully close start>', '<process did exit: exitCode=0, signal=null>', 'starting temporary directories cleanup', 'finished temporary directories cleanup', '<gracefully close end>'];

export function validateNativeLog(report, stderrText) {
  assert.equal(typeof stderrText, 'string'); assert(stderrText.length > 0, 'Actual native DEBUG stderr must exist');
  assert.equal(report.status, 'passed'); assert.equal(report.productQualified, false); assert.equal(report.nativeMethod.engine, 'chromium'); assert.equal(report.nativeMethod.packageVersion, '1.64.0');
  assert(Array.isArray(report.cases) && report.cases.length > 0);
  const root = fs.realpathSync(report.nativeMethod.binaryRoot), installed = report.nativeMethod.installedChromium;
  assert(path.isAbsolute(root)); assert.equal(installed.length, 2); assert.deepEqual(installed.map(entry => entry.name).sort(), ['chromium', 'chromium-headless-shell']);
  const executable = (file, name) => {
    const entry = installed.find(value => value.name === name); assert(entry && /^\d+$/.test(entry.revision) && typeof entry.browserVersion === 'string');
    assert(path.isAbsolute(file)); const real = fs.realpathSync(file); assert(real.startsWith(root + path.sep), 'Actual executable remains inside isolated held browser root');
    assert.equal(path.relative(root, real).split(path.sep)[0], name.replaceAll('-', '_') + '-' + entry.revision, 'Actual directory comes from the installed manifest revision');
    const body = fs.readFileSync(real); assert(fs.statSync(real).isFile());
    return { file, realPath: real, bytes: body.length, sha256: hash(body), manifestName: name, revision: entry.revision, browserVersion: entry.browserVersion };
  };
  const publicExecutable = executable(report.nativeMethod.publicExecutablePath, 'chromium');
  const lines = stderrText.split(/\r?\n/), commands = [], launches = [], processLines = [], diagnostics = [], rawSha256 = hash(Buffer.from(stderrText));
  const framing = /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z pw:browser (.+)$/;
  for (const [index, line] of lines.entries()) {
    if (line === '') continue;
    const prefix = line.match(framing); assert(prefix, 'Unknown stderr/debug output is fatal at line ' + (index + 1)); const message = prefix[1];
    let match;
    if ((match = message.match(/^<launching> (\S+) (.+)$/))) { commands.push({ lineNumber: index + 1, executable: match[1], arguments: match[2], rawLine: line }); continue; }
    if ((match = message.match(/^<launched> pid=(\d+)$/))) { launches.push({ lineNumber: index + 1, pid: Number(match[1]), rawLine: line }); continue; }
    if ((match = message.match(/^\[pid=(\d+)\]\[err\] \[[0-9]{4}\/[0-9]{6}\.[0-9]{6}:(.+)$/))) {
      const known = NATIVE_DIAGNOSTICS.filter(value => value.signature === match[2]); assert.equal(known.length, 1, 'Every actual native diagnostic has one exact retained platform signature');
      diagnostics.push({ pid: Number(match[1]), lineNumber: index + 1, classification: known[0].id, signature: match[2], rawLine: line, rawLineBytes: Buffer.byteLength(line), rawLineSha256: hash(Buffer.from(line)) }); continue;
    }
    match = message.match(/^\[pid=(\d+)\] (.+)$/); assert(match && STAGES.includes(match[2]), 'Unknown native lifecycle/output is fatal at line ' + (index + 1));
    processLines.push({ pid: Number(match[1]), stage: match[2], lineNumber: index + 1, rawLine: line });
  }
  assert.equal(commands.length, report.cases.length); assert.equal(launches.length, report.cases.length); assert.equal(new Set(launches.map(value => value.pid)).size, launches.length, 'One distinct native PID per actual context');
  const processes = [], profiles = new Set();
  for (const [index, launched] of launches.entries()) {
    const row = report.cases[index], command = commands[index]; assert.equal(row.nativeLaunchOrdinal, index + 1); assert.equal(row.status, 'passed');
    assert(row.lifecycle.launched && row.lifecycle.contextCreated && row.lifecycle.pageCreated && row.lifecycle.cdpDetached && row.lifecycle.contextClosed && row.lifecycle.browserClosed);
    assert.equal(row.lifecycle.browserConnectedAfterClose, false); assert.equal(row.publicExecutablePath, report.nativeMethod.publicExecutablePath); assert.equal(row.browserVersion, publicExecutable.browserVersion);
    assert(command.lineNumber < launched.lineNumber); if (index) assert(launched.lineNumber > launches[index - 1].lineNumber);
    assert(command.arguments.split(' ').includes('--headless'), 'Actual native command is headless'); assert(command.arguments.split(' ').includes('--remote-debugging-pipe'));
    const launchedExecutable = executable(command.executable, 'chromium-headless-shell'); assert.equal(launchedExecutable.browserVersion, row.browserVersion);
    const profileArg = command.arguments.split(' ').filter(value => value.startsWith('--user-data-dir=')); assert.equal(profileArg.length, 1); const profile = profileArg[0].slice('--user-data-dir='.length);
    assert(path.isAbsolute(profile) && path.dirname(profile) === os.tmpdir() && path.basename(profile).startsWith('playwright_chromiumdev_profile-'));
    assert(!profiles.has(profile)); profiles.add(profile); assert(!fs.existsSync(profile), 'Native temporary profile was removed after actual clean process closure');
    const lifetime = processLines.filter(value => value.pid === launched.pid); assert.deepEqual(lifetime.map(value => value.stage), STAGES, 'Exact actual clean lifecycle stages in order'); assert(lifetime[0].lineNumber > launched.lineNumber);
    if (index + 1 < commands.length) assert(lifetime.at(-1).lineNumber < commands[index + 1].lineNumber, 'Native process lifetime ends before the next actual launch');
    const classified = diagnostics.filter(value => value.pid === launched.pid);
    for (const value of classified) assert(value.lineNumber > launched.lineNumber && value.lineNumber < lifetime[0].lineNumber, 'Classified platform diagnostic is inside its actual process lifetime');
    for (const known of NATIVE_DIAGNOSTICS) assert.equal(classified.filter(value => value.classification === known.id).length, known.perProcess, 'Exact retained platform diagnostic census for actual PID ' + launched.pid);
    assert.equal(classified.length, 6);
    processes.push({ case: row.id, ordinal: index + 1, pid: launched.pid, command, launched, launchedExecutable, publicExecutable, profile, profileAbsentAfterClose: true, exitCode: 0, signal: null, lifetime, diagnostics: classified });
  }
  assert(processLines.every(value => launches.some(launch => launch.pid === value.pid)), 'No lifecycle from an unknown native process');
  assert(diagnostics.every(value => launches.some(launch => launch.pid === value.pid)), 'No diagnostic from an unknown native process');
  assert.equal(processLines.length, launches.length * STAGES.length); assert.equal(diagnostics.length, launches.length * 6);
  return { status: 'passed', scope: 'Actual sequential native Chromium process lifetimes and four exact retained platform startup signatures. Not warning-free and not app or spoken assistive-technology qualification.',
    rawBytes: Buffer.byteLength(stderrText), rawSha256, contexts: report.cases.length, processes, classifiedDiagnostics: diagnostics, diagnosticSignatures: NATIVE_DIAGNOSTICS, nativeWarningFree: false, unclassifiedDiagnostics: [], unknownOutput: [] };
}

export function assertNativeLogRefusals(report, stderrText) {
  const actual = validateNativeLog(report, stderrText), first = actual.processes[0], diagnostic = first.diagnostics[0];
  const once = (before, after) => { assert.equal(stderrText.split(before).length, 2, 'One exact actual raw-log refusal anchor'); const changed = stderrText.replace(before, after); assert.notEqual(changed, stderrText, 'Native-log refusal changes actual bytes'); return changed; };
  const cleanup = first.lifetime.find(value => value.stage === 'finished temporary directories cleanup'); assert(cleanup);
  const unknownPid = Math.max(...actual.processes.map(value => value.pid)) + 1;
  const cases = [
    { id: 'unknown-stderr-line', body: stderrText + 'ROUND1433_UNKNOWN_NATIVE_OUTPUT\n' },
    { id: 'altered-platform-signature', body: once(diagnostic.rawLine, diagnostic.rawLine + ' altered') },
    { id: 'duplicate-native-launch', body: stderrText + first.launched.rawLine + '\n' },
    { id: 'missing-native-cleanup-stage', body: once(cleanup.rawLine, '') },
    { id: 'changed-native-pid', body: once(diagnostic.rawLine, diagnostic.rawLine.replace('[pid=' + first.pid + '][err]', '[pid=' + unknownPid + '][err]')) },
  ];
  const refusals = [];
  for (const control of cases) {
    assert.notEqual(control.body, stderrText); let thrown;
    try { validateNativeLog(report, control.body); } catch (error) { thrown = error; }
    assert(thrown instanceof assert.AssertionError, 'Actual changed native-log control must be rejected by a validator assertion: ' + control.id);
    refusals.push({ id: control.id, changedBytes: Buffer.byteLength(control.body), changedSha256: hash(Buffer.from(control.body)), rejected: true, error: String(thrown.message) });
  }
  assert.equal(refusals.length, 5);
  return { status: 'passed', actualRawValidated: true, rawSha256: actual.rawSha256, refusals };
}

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = fs.realpathSync(process.cwd());
const out = process.env.CM_SON_OUT;
assert(process.env.CI === 'true' && process.env.SIM_NETWORK === 'offline');
assert(out && path.isAbsolute(out) && fs.realpathSync(out) !== root && !fs.realpathSync(out).startsWith(root + path.sep));
const put = (name, text) => fs.writeFileSync(path.join(out, name), text, {flag: 'wx'});
const file = 'src/test/clubManagerRetiredSon.test.ts';
const receipt = path.join(out, 'red-child.transport');
put('red-child.transport', '');
const args = ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--testNamePattern=CM_SON_ROLLOVER_APPLICATION', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + path.join(out, 'red.json')];
put('red.command.json', JSON.stringify({command: process.execPath, args, cwd: root, timeoutMS: 120000}, null, 2) + '\n');
const child = cp.spawnSync(process.execPath, args, {cwd: root, env: {...process.env, SIM_OFFLINE_RECEIPT: receipt}, timeout: 120000, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
put('red.stdout', child.stdout || ''); put('red.stderr', child.stderr || ''); put('red.raw.exit', String(child.status) + '\n');
if (child.error) put('red.spawn-error.json', JSON.stringify({name:child.error.name,message:child.error.message,code:child.error.code}, null, 2) + '\n');
function classify(json, raw, stdout, stderr, transport) {
  assert.equal(raw, 1, 'RED_RAW_ONE');
  assert.equal(transport, '', 'RED_CHILD_NO_NODE_TRANSPORT');
  assert.equal(json.success, false, 'RED_JSON_FAILURE');
  assert.equal(json.testResults.length, 1, 'RED_ONE_FILE');
  assert(json.testResults[0].name.replaceAll('\\', '/').endsWith('/' + file), 'RED_OWN_FILE');
  const rows = json.testResults[0].assertionResults;
  const ran = rows.filter(row => row.status === 'passed' || row.status === 'failed');
  assert.equal(ran.length, 1, 'RED_ONE_SELECTED_EXECUTION');
  assert.equal(ran[0].status, 'failed', 'RED_SELECTED_FAILED');
  assert(ran[0].fullName.endsWith('CM_SON_ROLLOVER_APPLICATION'), 'RED_OWN_TITLE');
  assert.equal(json.numFailedTests, 1, 'RED_EXACT_FAILURE_COUNT');
  assert.equal(json.numPassedTests, 0, 'RED_NO_UNRELATED_PASS_CREDIT');
  const failures = ran[0].failureMessages.join('\n');
  assert(failures.includes('CM_SON_MISSING_RETIREMENT_APPLICATION'), 'RED_OWN_ASSERTION');
  assert(!/Test timed out|TypeError:|ReferenceError:|SyntaxError:|Cannot find module|Failed to resolve|worker exited/i.test(failures), 'RED_NOT_INFRA');
  assert(!/Unhandled Rejection|Uncaught Exception|Unhandled Errors|ERR_WORKER|worker exited unexpectedly/i.test(stdout + '\n' + stderr), 'RED_NO_CALLBACK_FAILURE_TEXT');
  if (Array.isArray(json.unhandledErrors)) assert.equal(json.unhandledErrors.length, 0, 'RED_NO_REPORTED_UNHANDLED_ERRORS');
  return {actualSelected: ran.map(row => ({title:row.fullName,status:row.status,duration:row.duration,failureMessages:row.failureMessages})), unselectedRows:rows.filter(row=>row.status!=='passed'&&row.status!=='failed').map(row=>({title:row.fullName,status:row.status})), runtimeCounterFields:Object.fromEntries(Object.entries(json).filter(([key])=>/runtime|unhandled/i.test(key))), absentRuntimeCounters:'UNKNOWN_NOT_ZERO'};
}
assert(!child.error, 'RED_CHILD_COMPLETED');
const json = JSON.parse(fs.readFileSync(path.join(out,'red.json'),'utf8'));
const stdout = child.stdout || '', stderr = child.stderr || '', transport = fs.readFileSync(receipt,'utf8');
const result = classify(json, child.status, stdout, stderr, transport);
const controls = [];
for (const control of [
  {id:'raw-zero', change: value => value.raw = 0},
  {id:'wrong-title', change: value => value.json.testResults[0].assertionResults.find(row=>row.status==='failed').fullName = 'UNOWNED_ASSERTION'},
  {id:'missing-owned-marker', change: value => value.json.testResults[0].assertionResults.find(row=>row.status==='failed').failureMessages = ['UNOWNED_FAILURE']},
  {id:'callback-error', change: value => value.stderr += '\nUnhandled Rejection\n'},
  {id:'transport', change: value => value.transport = 'BLOCKED_REQUEST\n'},
]) {
  const value = {json:JSON.parse(JSON.stringify(json)),raw:child.status,stdout,stderr,transport};
  const before = JSON.stringify(value);
  control.change(value);
  assert.notEqual(JSON.stringify(value), before, 'CONTROL_CHANGED:' + control.id);
  let refused = false;
  try { classify(value.json,value.raw,value.stdout,value.stderr,value.transport); } catch { refused = true; }
  assert(refused, 'CONTROL_REFUSED:' + control.id);
  for (const key of Object.keys(value)) delete value[key];
  Object.assign(value, JSON.parse(before));
  assert.equal(JSON.stringify(value), before, 'CONTROL_SAME_COPY_RESTORED:' + control.id);
  const restored = classify(value.json,value.raw,value.stdout,value.stderr,value.transport);
  assert.equal(restored.actualSelected.length,1);
  controls.push({id:control.id,changed:true,refused:true,sameCopyRestored:true});
}
put('red-admission.json', JSON.stringify({status:'OWNED_ORIGINAL_RETIREMENT_MISSING_APPLICATION_RED',source:process.env.GITHUB_SHA,main:process.env.EXPECTED_MAIN,actual:result,effectiveCopiedReportControls:controls,featureQualified:false},null,2)+'\n');
console.log('CM_SON_ORIGINAL_RED: one actual generated-retirement case failed at missing application; five effective copied-report refusals and same-copy restores. No feature qualification.');

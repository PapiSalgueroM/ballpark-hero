import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const out = process.env.QA_OUT;
assert(out && path.isAbsolute(out), 'QA_OUT must be outside the checkout');
assert(!path.resolve(out).startsWith(process.cwd() + path.sep), 'Evidence outside checkout');
const spec = JSON.parse(fs.readFileSync('scripts/qa/scReadingControls.json', 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const blob = value => crypto.createHash('sha1').update('blob ' + value.length + '\0').update(value).digest('hex');
const read = file => fs.readFileSync(file);
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const strip = text => text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
const fixed = new Map([spec.panel, spec.board].map(file => [file, read(file)]));
for (const [file, pin] of Object.entries({...spec.pins, [spec.test]:spec.testBlob})) assert.equal(blob(read(file)), pin, file);
const old = read(path.join(out, 'original-TrainingPanel.tsx'));
assert.equal(blob(old), spec.originalPanel);
fs.mkdirSync(path.join(out, 'source-copies'), {recursive:true});
for (const [file, content] of fixed) fs.writeFileSync(path.join(out, 'source-copies', path.basename(file)), content);
const restore = () => {
  for (const [file, content] of fixed) fs.writeFileSync(file, content);
  for (const [file, content] of fixed) assert.deepEqual(read(file), content, 'Exact restore ' + file);
};
const receipt = [];
function run(name, mode, selected) {
  const dir = path.join(out, name);
  fs.mkdirSync(path.join(dir, 'raw'), {recursive:true});
  const log = path.join(dir, 'units.log'), report = path.join(dir, 'report.json'), offline = path.join(dir, 'offline.log');
  fs.writeFileSync(offline, '');
  const fd = fs.openSync(log, 'w');
  const args = ['run', spec.test, '--reporter=json', '--outputFile=' + report];
  if (selected !== undefined) args.push('-t', '^' + spec.cases[selected].fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
  let result;
  try {
    result = spawnSync('node_modules/.bin/vitest', args, {stdio:['ignore',fd,fd], env:{...process.env, SC_PASSING_DECISION_RAW:path.join(dir, 'raw'), SIM_OFFLINE_RECEIPT:offline}});
  } finally { fs.closeSync(fd); }
  write(path.join(dir, 'native.json'), {status:result.status, signal:result.signal, error:result.error?.message ?? null, args});
  assert(!result.error && result.signal === null, name + ' native child');
  assert.equal(result.status, mode === 'pass' ? 0 : 1, name + ' native exit');
  const r = json(report), files = r.testResults ?? [], rows = files.flatMap(file => file.assertionResults ?? []);
  assert.equal(files.length, 1, name + ' one file');
  assert.equal(path.relative(process.cwd(), files[0].name).replaceAll('\\','/'), spec.test);
  assert.equal(rows.length, 6, name + ' exact census');
  assert.equal(new Set(rows.map(row => row.fullName)).size, 6);
  const counters = {};
  for (const key of ['numRuntimeErrorTestSuites','numUnhandledErrors']) {
    counters[key] = key in r ? r[key] : 'UNKNOWN'; if (key in r) assert.equal(r[key], 0, name + ' ' + key);
  }
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed Suites|Failed to collect/.test(strip(fs.readFileSync(log,'utf8'))), name + ' no setup/runtime banner');
  const raws = {}, classified = [];
  for (let i=0;i<spec.cases.length;i++) {
    const want = spec.cases[i], found = rows.filter(row => row.fullName === want.fullName); assert.equal(found.length,1);
    const row = found[0], message = strip((row.failureMessages ?? []).join('\n'));
    const unselected = selected !== undefined && selected !== i;
    const expected = mode === 'original' ? want.baseline : mode === 'fault' && selected === i ? 'failed' : 'passed';
    const rawFile = path.join(dir, 'raw', want.rawFile);
    if (unselected) {
      assert(['skipped','pending'].includes(row.status), name + ' unselected status');
      assert.equal(message,''); assert(!fs.existsSync(rawFile), name + ' no unselected RAW');
      classified.push({fullName:want.fullName,status:row.status,credit:false}); continue;
    }
    assert.equal(row.status, expected, name + ' ' + want.fullName);
    if (expected === 'failed') {
      assert(message.includes('AssertionError'), name + ' assertion outcome');
      assert(message.includes(want.marker), name + ' ' + want.marker);
    } else assert.equal(message,'',name + ' passing row');
    const value = json(rawFile); assert.equal(value.case, want.rawFile.slice(0,-5));
    assert(value.observations && typeof value.observations === 'object');
    raws[want.rawFile] = value;
    classified.push({fullName:want.fullName,status:row.status,credit:true,raw:want.rawFile,sha256:sha(read(rawFile))});
  }
  assert.equal(fs.readdirSync(path.join(dir,'raw')).length, selected === undefined ? 6 : 1);
  assert.equal(fs.statSync(offline).size,0,name + ' offline closure');
  write(path.join(dir,'admission.json'),{mode,native:result.status,counters,rows:classified,scope:selected===undefined?'Six focused cases only':'One selected case, five unselected and no credit'});
  receipt.push({name,mode,selected:selected ?? null,native:result.status});
  return {dir,raws};
}
function equalRaw(a,b,files=spec.cases.map(value=>value.rawFile)) {
  for(const file of files) assert.deepEqual(read(path.join(a.dir,'raw',file)),read(path.join(b.dir,'raw',file)),'Whole RAW restore ' + file);
}
function verifyCause(id, before, after) {
  const a=before.observations,b=after.observations;
  if(id==='scoring') {
    assert.deepEqual(a.calls,[['passing',60]]); assert.deepEqual(b.calls,[['passing',100]]);
    assert.equal(a.current.statBoostNextSeason.passing,1); assert.equal(b.current.statBoostNextSeason.passing,2);
    assert.equal(a.score,'60'); assert.equal(b.score,'100'); assert.deepEqual(a.draws,b.draws);
  } else if(id==='first-answer') {
    assert.equal(a.score,'80'); assert.equal(b.score,'100'); assert.equal(a.blockedSecond,true); assert.equal(b.blockedSecond,false);
    assert.equal(a.feedback.includes('Another option was safer.'),true); assert.equal(b.feedback.includes('Good read.'),true);
    assert.equal(b.helperPreserved,true); assert.deepEqual(a.draws,b.draws);
  } else if(id==='deadline') {
    assert.equal(a.score,'80'); assert.equal(b.score,'0');
    for(const key of ['firstScore','afterTime']) {assert.equal(a[key],'0');assert.equal(b[key],'0');}
    assert.deepEqual(a.allOptionLabels,b.allOptionLabels); assert.equal(b.helperPreserved,true); assert.equal(b.blockedSecond,true);
    assert.deepEqual(a.draws,b.draws); assert.equal(a.after,b.after);
  } else if(id==='replay') {
    assert.deepEqual(a.calls,[['passing',60]]); assert.deepEqual(b.calls,[['passing',60],['passing',100]]);
    assert.equal(a.replayed,true); assert.equal(b.replayed,true); assert.equal(a.score,'100'); assert.equal(b.score,'100');
    assert.equal(a.after,b.after); assert.deepEqual(a.draws,b.draws);
  } else if(id==='global-rng') {
    assert.deepEqual(a.draws,[]); assert.deepEqual(b.draws,[.5,.5,.5,.5,.5]);
    const ac=structuredClone(before),bc=structuredClone(after);ac.observations.draws=[];bc.observations.draws=[];assert.deepEqual(ac,bc,'Only global RNG tape changes');
  } else assert.fail('Unknown fault ' + id);
  return {before:{score:a.score,calls:a.calls,draws:a.draws,blockedSecond:a.blockedSecond,passing:a.current.statBoostNextSeason?.passing},
    after:{score:b.score,calls:b.calls,draws:b.draws,blockedSecond:b.blockedSecond,passing:b.current.statBoostNextSeason?.passing}};
}
let healthy;
try {
  healthy = run('fixed','pass');
  for(const [file,want] of Object.entries(spec.heldRawSHA256)) assert.equal(sha(read(path.join(healthy.dir,'raw',file))),want,'Original held RAW ' + file);
  fs.writeFileSync(spec.panel,old); fs.unlinkSync(spec.board);
  try {
    const original=run('whole-original','original');
    equalRaw(healthy,original,Object.keys(spec.heldRawSHA256));
  } finally {restore();}
  const restored=run('whole-restored','pass'); equalRaw(healthy,restored);
  for(const fault of spec.faults) {
    const content=fixed.get(fault.path); assert(content,'Fault only owned source');
    let changed=content.toString('utf8');
    for(const edit of fault.edits) {
      assert(edit.before.length > 0 && edit.before !== edit.after);
      assert.equal(changed.split(edit.before).length-1,1,'Unique actual fault ' + fault.id);
      changed=changed.replace(edit.before,edit.after);
    }
    assert.notEqual(sha(Buffer.from(changed)),sha(content),'Effective source change');
    const faultDir=path.join(out,'fault-'+fault.id); fs.mkdirSync(faultDir,{recursive:true});
    fs.writeFileSync(path.join(faultDir,path.basename(fault.path)),changed);
    write(path.join(faultDir,'source-change.json'),{path:fault.path,beforeSHA256:sha(content),afterSHA256:sha(Buffer.from(changed)),edits:fault.edits});
    fs.writeFileSync(fault.path,changed);
    let actual;
    try {
      actual=run('fault-'+fault.id,'fault',fault.selected);
      const file=spec.cases[fault.selected].rawFile;
      const causal=verifyCause(fault.id,healthy.raws[file],actual.raws[file]);
      write(path.join(actual.dir,'causal.json'),{cause:fault.cause,selected:spec.cases[fault.selected].fullName,raw:file,...causal});
    } finally {restore();}
    const recovered=run('restored-'+fault.id,'pass',fault.selected);
    equalRaw(healthy,recovered,[spec.cases[fault.selected].rawFile]);
  }
  write(path.join(out,'qualification.json'),{status:'passed',cases:6,wholeOriginal:{ownedFailures:4,heldPasses:2},wholeRestored:6,physicalFaults:spec.faults.length,selectedRestores:spec.faults.length,receipt,scope:spec.scope});
  console.log('SC reading: fixed6, whole original4RED2held, restored6, five effective faults and five exact selected RAW restorations.');
} finally {
  restore();
  for(const [file,pin] of Object.entries({...spec.pins,[spec.test]:spec.testBlob})) assert.equal(blob(read(file)),pin,'Final source ' + file);
}

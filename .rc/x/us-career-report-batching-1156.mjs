/* Remote-only actual timer block and existing US career route receipts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
assert.equal(process.env.GITHUB_ACTIONS, 'true');
const root = process.cwd(), evidence = process.env.E;
assert(evidence && path.isAbsolute(evidence));
const out = path.join(root, 'us-career-save-recovery-artifacts'), worker = 'scripts/qa/usCareerSaveRecovery1084.mjs';
const hash = b => createHash('sha256').update(b).digest('hex'), clone = v => JSON.parse(JSON.stringify(v)), read = f => JSON.parse(fs.readFileSync(f));
const save = (name, v) => { fs.mkdirSync(path.dirname(path.join(evidence, name)), { recursive: true }); fs.writeFileSync(path.join(evidence, name), JSON.stringify(v, null, 2)); };
const unique = (s, a) => assert.equal(s.split(a).length - 1, 1, 'Exact owned anchor occurs once');
function body(file) {
  assert(fs.lstatSync(file).isFile(), 'Actual retained body is regular');
  const bytes = fs.readFileSync(file), sha256 = hash(bytes), retained = 'bodies/' + sha256;
  fs.mkdirSync(path.join(evidence, 'bodies'), { recursive: true }); fs.writeFileSync(path.join(evidence, retained), bytes);
  return { file: path.relative(root, file), bytes: bytes.length, sha256, retained };
}
function timerProof() {
  const source = fs.readFileSync(worker, 'utf8').replace(/\r\n/g, '\n'), parent = fs.readFileSync(path.join(evidence, 'parent-usCareerSaveRecovery1084.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const end = '\nfunction oracleEnvironment(', start = 'let saveTimer = null;\n', oldStart = "const save = () => writeJSON('report.json', report);\n";
  unique(source, start); unique(source, end); unique(parent, oldStart); unique(parent, end);
  const block = source.slice(source.indexOf(start), source.indexOf(end)), parentBlock = parent.slice(parent.indexOf(oldStart), parent.indexOf(end));
  const anchors = ['row.localRequests.push(receipt); saveSoon();', 'receipt.status = response.status(); receipt.responseUrl = response.url(); receipt.headers = response.headers(); saveSoon();', 'const body = await response.body(); receipt.bodyBytes = body.length; receipt.bodySha256 = digest(body); saveSoon();', '} finally { receipt.ended = new Date().toISOString(); receipt.endPhase = row.routePhase; saveSoon(); }'];
  let inverse = source.replace(block, parentBlock);
  for (const a of anchors) { unique(source, a); inverse = inverse.replace(a, a.replace('saveSoon()', 'save()')); }
  assert.equal(inverse, parent, 'Only actual timer block and four routine receipt calls differ');
  const timerDir = path.join(evidence, 'timer'); fs.mkdirSync(timerDir, { recursive: true });
  fs.writeFileSync(path.join(timerDir, 'candidate-block.js'), block); fs.writeFileSync(path.join(timerDir, 'parent-block.js'), parentBlock);
  const report = { complete: false, candidateWorkerSha256: hash(Buffer.from(source)), parentWorkerSha256: hash(Buffer.from(parent)), candidateBlockSha256: hash(Buffer.from(block)), parentBlockSha256: hash(Buffer.from(parentBlock)), fourUniqueReceiptAnchors: anchors, exactSourceInverse: true, cases: [], controls: [], limits: ['Owned deterministic timers execute the actual extracted block only. This measures report-write semantics, not wall-clock performance or browser network timing.'] };
  const persist = () => save('timer/report.json', report);
  function environment(code, parentMode) {
    let now = 0, nextId = 0; const timers = new Map(), events = [], writes = [], value = { version: 0, complete: false, cases: [], transportErrors: [], sourceAfter: null };
    const setTimeout = (callback, delay) => { assert.equal(typeof callback, 'function'); const id = ++nextId; timers.set(id, { at: now + delay, callback }); events.push({ kind: 'set', id, now, delay }); return id; };
    const clearTimeout = id => { events.push({ kind: 'clear', id, now, existed: timers.has(id) }); timers.delete(id); };
    const context = vm.createContext({ report: value, setTimeout, clearTimeout, writeJSON: (file, data) => { assert.equal(file, 'report.json'); writes.push({ now, value: clone(data) }); } });
    vm.runInContext(code + '\nglobalThis.probe = { save, queue: ' + (parentMode ? 'save' : 'saveSoon') + ' };', context, { timeout: 1000 });
    const advance = target => {
      assert(target >= now); let count = 0;
      while (true) {
        const due = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]; if (!due) break;
        assert(++count <= 20, 'Finite owned timer callbacks'); now = due[1].at; timers.delete(due[0]); events.push({ kind: 'fire', id: due[0], now }); due[1].callback();
      }
      now = target;
    };
    return { value, events, writes, timers, probe: context.probe, advance, state: () => ({ now, report: clone(value), writes: clone(writes), pending: [...timers].map(([id, t]) => ({ id, at: t.at })), events: clone(events) }) };
  }
  function candidate(code, row) {
    const e = environment(code, false), capture = label => { const s = e.state(); row.states.push({ label, ...s }); persist(); return s; }, check = (stage, yes) => { row.stage = stage; persist(); assert(yes, stage); };
    capture('boot'); check('initial-synchronous-write', e.writes.length === 1 && e.writes[0].value.version === 0);
    for (let version = 1; version <= 4; version++) { e.value.version = version; e.value.cases.push({ receiptVersion: version }); e.probe.queue(); }
    capture('four-receipt-updates'); check('one-owned-timer', e.timers.size === 1);
    e.advance(249); capture('before-deadline'); check('deferred-until-250', e.writes.length === 1);
    e.advance(250); capture('at-deadline'); check('one-coalesced-write', e.writes.length === 2); check('latest-full-report', JSON.stringify(e.writes.at(-1).value) === JSON.stringify(e.value));
    e.value.version = 5; e.probe.queue(); e.advance(500); capture('later-batch'); check('later-batch-reschedules', e.writes.length === 3 && e.writes.at(-1).value.version === 5 && e.timers.size === 0);
    e.value.version = 6; e.probe.queue(); e.value.transportErrors.push({ kind: 'owned-route', message: 'Captured route error' }); e.probe.save();
    const errorFlush = capture('synchronous-error-flush'); e.advance(1000); capture('after-error-flush-deadline');
    check('pending-canceled', errorFlush.pending.length === 0); check('synchronous-error-full-report', e.writes.length === 4 && JSON.stringify(e.writes.at(-1).value) === JSON.stringify(e.value));
    e.value.version = 7; e.probe.queue(); e.value.complete = true; e.value.sourceAfter = { held: 'exact closing hash' }; e.probe.save();
    const finalFlush = capture('synchronous-final-flush'); e.advance(1500); capture('after-final-flush-deadline');
    check('final-cancel-and-full-report', finalFlush.pending.length === 0 && e.timers.size === 0 && e.writes.length === 5 && JSON.stringify(e.writes.at(-1).value) === JSON.stringify(e.value));
    row.complete = true; row.stage = 'completed'; persist();
  }
  try {
    const healthy = { name: 'candidate-owned-timers', states: [], complete: false }; report.cases.push(healthy); persist(); candidate(block, healthy);
    const baseline = { name: 'actual-parent-four-writes', states: [], complete: false }; report.cases.push(baseline);
    const p = environment(parentBlock, true); baseline.states.push({ label: 'boot', ...p.state() }); assert.equal(p.writes.length, 1);
    for (let version = 1; version <= 4; version++) { p.value.version = version; p.value.cases.push({ receiptVersion: version }); p.probe.queue(); baseline.states.push({ label: 'receipt-' + version, ...p.state() }); persist(); }
    assert.equal(p.timers.size, 0); assert.equal(p.writes.length, 5); assert.deepEqual(p.writes.slice(1).map(w => w.value.version), [1, 2, 3, 4]); baseline.complete = true; persist();
    const mutations = [
      { name: 'duplicate-timers', old: 'if (saveTimer === null) saveTimer = setTimeout(save, 250);', next: 'saveTimer = setTimeout(save, 250);', stage: 'one-owned-timer' },
      { name: 'stale-report', old: 'if (saveTimer === null) saveTimer = setTimeout(save, 250);', next: "if (saveTimer === null) { const captured = JSON.parse(JSON.stringify(report)); saveTimer = setTimeout(() => { saveTimer = null; writeJSON('report.json', captured); }, 250); }", stage: 'latest-full-report' },
      { name: 'missing-sync-write', old: "  writeJSON('report.json', report);", next: '  void report;', stage: 'initial-synchronous-write' },
      { name: 'uncanceled-timer', old: 'clearTimeout(saveTimer); saveTimer = null;', next: 'saveTimer = null;', stage: 'pending-canceled' },
    ];
    for (const m of mutations) {
      unique(block, m.old); const changed = block.replace(m.old, m.next); assert.notEqual(changed, block); fs.writeFileSync(path.join(timerDir, m.name + '.js'), changed);
      const row = { name: m.name, expectedStage: m.stage, sourceSha256: hash(Buffer.from(changed)), effectChanged: false, states: [], complete: false }; report.controls.push(row); persist();
      let caught; try { candidate(changed, row); } catch (error) { caught = error; row.failure = { name: error.name, message: error.message, stack: error.stack }; persist(); }
      assert.equal(caught?.name, 'AssertionError'); assert.equal(row.stage, m.stage); assert(caught.message.startsWith(m.stage));
      const state = label => row.states.find(s => s.label === label);
      row.effectChanged = m.name === 'duplicate-timers' ? state('four-receipt-updates').pending.length === 4 : m.name === 'stale-report' ? state('at-deadline').writes.at(-1).value.version === 1 : m.name === 'missing-sync-write' ? state('boot').writes.length === 0 : state('synchronous-error-flush').pending.length === 1 && state('after-error-flush-deadline').writes.length === 5;
      assert(row.effectChanged, 'Copied timer fault changed its intended measured outcome'); row.acceptedExpectedFailure = true; persist();
    }
    report.complete = true; persist(); console.log('Actual candidate timer block: four updates become one latest full report at250ms; error/final saves cancel and flush. Actual parent writes four immediately. All4 copied faults changed their mapped outcomes.');
  } catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; persist(); throw error; }
}
function localFile(pathname) {
  assert(!pathname.includes('\\') && !pathname.includes('\0'));
  const dist = path.join(root, 'dist'), file = path.resolve(dist, '.' + pathname); assert(file === dist || file.startsWith(dist + path.sep));
  const regular = f => fs.existsSync(f) && fs.lstatSync(f).isFile(), found = [file, path.join(file, 'index.html'), path.join(dist, 'index.html')].find(regular); assert(found); return found;
}
function retain() {
  if (!fs.existsSync(out)) return; fs.cpSync(out, path.join(evidence, 'proof'), { recursive: true });
  const reportFile = path.join(out, 'native/report.json'); if (!fs.existsSync(reportFile)) return;
  const report = read(reportFile), served = [], maps = new Map();
  for (const row of [...report.cases, ...report.deletions]) for (const r of row.localRequests) {
    if (!r.bodySha256) continue; const file = localFile(decodeURIComponent(new URL(r.url).pathname)), held = body(file);
    if (r.method === 'HEAD') { assert.equal(r.bodyBytes, 0); assert.equal(r.bodySha256, hash(Buffer.alloc(0))); } else { assert.equal(r.bodySha256, held.sha256); assert.equal(r.bodyBytes, held.bytes); }
    served.push({ rowId: row.id, requestId: r.id, method: r.method, url: r.url, status: r.status, responseBodyBytes: r.bodyBytes, responseBodySha256: r.bodySha256, ...held });
    if (file.endsWith('.js') && fs.existsSync(file + '.map')) maps.set(file, body(file + '.map'));
  }
  save('served-bodies.json', served); save('candidate-maps.json', [...maps.values()]);
  const metaFile = path.join(out, 'native/independent-engine-metafile.json');
  if (fs.existsSync(metaFile)) {
    const source = fs.readFileSync(worker, 'utf8'), tick = String.fromCharCode(96), begin = 'stdin: { contents: ' + tick, end = tick + ', resolveDir: ROOT }';
    unique(source, begin); unique(source, end); const configured = source.slice(source.indexOf(begin) + begin.length, source.indexOf(end));
    save('engine-inputs.json', Object.entries(read(metaFile).inputs).map(([file, metadata]) => { if (file === '<stdin>') return { file, virtual: true, configured, metadata }; assert(!file.startsWith('<'), 'Unknown oracle virtual input fails closed'); return { ...body(path.resolve(root, file)), metadata }; }));
  }
  save('payload-scope.json', { retained: 'All native raw outputs, full timer reports/copied blocks, font cache, actual delivered app bytes and companion maps, oracle inputs and selected Git source archives. Complete source/build/dependency/cache file and link manifests are held separately.', omitted: 'Only redundant unserved dist payload copies and Chromium cache binaries, whose complete paths/bytes/links remain held.', delivered: served.length });
}
function nativeReceipt() {
  retain(); const r = read(path.join(out, 'native/report.json')), slugs = ['nba', 'nfl', 'mlb', 'nhl'];
  assert.equal(r.complete, true); assert(!r.error && !r.captureError); assert.equal(r.cases.length, 12); assert.equal(r.deletions.length, 4); assert.equal(r.controls.length, 9);
  assert.deepEqual(r.cases.map(c => c.id), [320, 390, 1280].flatMap(w => slugs.map(s => w + '-' + s + '-latest-write')));
  assert.deepEqual(r.deletions.map(c => c.id), ['320-nba-delete-and-replace', '390-nfl-delete-and-replace', '1280-mlb-delete-and-replace', '320-nhl-delete-and-replace']);
  assert.equal(r.forwardedWrites, 0); assert.deepEqual(r.transportErrors, []); assert.deepEqual(r.sourceAfter, r.sourceBefore); assert.deepEqual(r.buildAfter, r.buildBefore); assert.equal(r.assetManifestAfter, r.assetManifestSha256); assert.deepEqual(r.assetPayloadAfter, r.assetPayloadBefore);
  for (const c of [...r.cases, ...r.deletions]) {
    assert.equal(c.complete, true); for (const key of ['errors', 'consoleErrors', 'assetErrors', 'sockets', 'unexpectedRequests']) assert.deepEqual(c[key], []);
    assert(c.stages.length > 0 && c.localRequests.length > 0 && c.network.every(q => q.method === 'GET'));
    assert(c.fonts.length === 8 && c.fonts.every(f => ['Inter', 'Space Grotesk'].includes(f.family) && f.faces.length && f.faces.every(face => face.status === 'loaded')));
    assert(c.stages.some(s => s.events.some(e => e.trusted && e.type === (c.profile.touch ? 'pointerup' : 'keydown'))));
    for (const q of c.localRequests) { assert(['GET', 'HEAD'].includes(q.method)); assert(q.fulfilled && q.ended && !q.error && !q.abortError); assert.equal(q.connection, 'close'); assert.equal(q.maxRedirects, 0); assert.equal(q.maxRetries, 0); assert(q.status >= 200 && q.status < 300); }
    for (const file of c.screenshots) assert(fs.existsSync(path.join(out, 'native', file)));
    assert(c.postReloadProof?.expected && c.postReloadProof.after, 'Each real reload continues actual restored gameplay');
  }
  assert.deepEqual(r.controls.map(c => c.id + '/' + c.fault), [320, 390, 1280].flatMap(w => ['warning', 'font', 'offscreen-retry'].map(f => w + '-nba-latest-write/' + f)));
  const mapped = { warning: 'Recovery explains the unsaved operation honestly', font: 'Recovery text is at least 12px', 'offscreen-retry': 'Retry is visible and owns its hit target' };
  for (const c of r.controls) { assert.notDeepEqual(c.faulted, c.before); assert.deepEqual(c.restored, c.before); assert.equal(c.error.name, 'AssertionError'); assert(c.error.message.startsWith(mapped[c.fault])); }
  assert.equal(hash(fs.readFileSync(path.join(out, 'native/independent-engine.mjs'))), r.baseline.sha256); assert.deepEqual(r.baseline.importBefore, r.baseline.importAfter);
  const bindings = [], maps = read(path.join(evidence, 'candidate-maps.json'));
  const expected = ['src/main.tsx', 'src/App.tsx', ...['Nba', 'Nfl', 'Mlb', 'Nhl'].map(n => 'src/pages/' + n + 'MyCareer.tsx'), 'src/components/us-career/UsCareerBoard.tsx', 'src/components/us-career/UsCareerSaveNotice.tsx', 'src/lib/usCareerProspect.ts', ...slugs.map(s => 'src/lib/' + s + 'CareerSport.ts'), 'src/integrations/supabase/client.ts'];
  for (const file of expected) {
    const sha256 = hash(fs.readFileSync(file)), matches = [];
    for (const held of maps) {
      const map = read(path.join(evidence, held.retained));
      for (let index = 0; index < map.sources.length; index++) if (path.resolve(root, path.dirname(held.file), map.sourceRoot || '', map.sources[index]) === path.join(root, file)) {
        assert.equal(typeof map.sourcesContent[index], 'string'); assert.equal(hash(Buffer.from(map.sourcesContent[index])), sha256); matches.push({ map: held.file, mapSha256: held.sha256, retained: held.retained, index, source: map.sources[index] });
      }
    }
    assert(matches.length > 0, 'Actual delivered companion maps bind ' + file); bindings.push({ file, sha256, matches });
  }
  save('core-source-bindings.json', bindings);
  const t = read(path.join(evidence, 'timer/report.json')); assert.equal(t.complete, true); assert(!t.error); assert.equal(t.cases.length, 2); assert(t.cases.every(c => c.complete)); assert.equal(t.controls.length, 4); assert(t.controls.every(c => c.effectChanged && c.acceptedExpectedFailure));
  console.log('All12 actual latest-write journeys,4 deletion/replacement cases,9 restored DOM faults and4 copied timer controls accepted. Actual served/core/oracle bytes retained.');
}
if (process.argv[2] === 'timers') timerProof();
else if (process.argv[2] === 'retain') { retain(); console.log('Complete useful native raw outputs and available delivered/oracle bytes refreshed.'); }
else { assert.equal(process.argv[2], 'receipt'); nativeReceipt(); }


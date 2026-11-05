/* QA-only post-build controls. The permanent guide and search harnesses stay unchanged. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.CRQ_GUIDE_CONTROL_OUT || 'early-club-artifacts/guide-controls');
assert(!fs.existsSync(OUT), 'CRQ_GUIDE_FRESH_OUTPUT');
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'CRQ_GUIDE_POSTBUILD_REQUIRED');
fs.mkdirSync(OUT, { recursive: true });
const GUIDE = 'src/data/gameContent/soccer2.ts', INDEX = 'src/data/searchKeywords.json';
const FROZEN = 'scripts/data/guideHeadingsFrozen.json';
const HOW = 'Reveal an early club opens the earliest club box still hidden on this board for 1 box. Give Hint opens up to 4 random boxes.';
const RULE = 'Reveal an early club opens 1 hidden club box, starting from the top of the board. Give Hint opens up to 4 random hidden boxes.';
const STALE = '78c07779d2678802f7cdd3a4ab6e8d41af221650';
const FRESH = '546290b8d37bd95a2cdde3cf34186424d45a3aa9';
const sha = value => createHash('sha256').update(value).digest('hex');
const blob = value => createHash('sha1').update('blob ' + value.length + '\0').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const receipt = file => ({ file, bytes: read(file).length, sha256: sha(read(file)) });
function inventory(folder) {
  return fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(item => item.isDirectory() ? inventory(folder + '/' + item.name) : item.isFile() ? [receipt(folder + '/' + item.name)] : []);
}
const snapshot = () => [...inventory('src'), ...['scripts/simGuideHeadings.mjs', 'scripts/simSiteSearch.mjs', FROZEN, 'package.json', 'package-lock.json'].map(receipt)];
const originalGuide = read(GUIDE), originalIndex = read(INDEX), sourceBefore = snapshot(), distBefore = inventory('dist');
assert.equal(blob(read('scripts/simGuideHeadings.mjs')), 'fa23f7e6ace62d8e71e3585ab6afbe4dbef0f674', 'CRQ_GUIDE_PERMANENT_HARNESS_HELD');
assert.equal(blob(read('scripts/simSiteSearch.mjs')), '6be8e1603e84e1a8799099e1558c415bc87a42a7', 'CRQ_SEARCH_PERMANENT_HARNESS_HELD');
assert.equal(blob(originalGuide), 'fed9d9b2f3ffabe4e5de9d47ef217f0dad4f6ea7', 'CRQ_GUIDE_APPROVED_COPY');
assert.equal(blob(originalIndex), FRESH, 'CRQ_SEARCH_ADMITTED_FRESH_INDEX');
const fixture = JSON.parse(read(FROZEN));
assert.equal(fixture.routes['/career'].howToPlay.filter(line => line === HOW).length, 1, 'CRQ_GUIDE_REFRESHED_HOW_REQUIRED');
assert.equal(fixture.routes['/career'].rules.filter(line => line === RULE).length, 1, 'CRQ_GUIDE_REFRESHED_RULE_REQUIRED');
const staleIndex = execFileSync('git', ['cat-file', 'blob', STALE], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 });
assert.equal(blob(staleIndex), STALE, 'CRQ_SEARCH_EXACT_STALE_BYTES');
assert.notEqual(sha(staleIndex), sha(originalIndex), 'CRQ_SEARCH_CONTROL_CHANGES_BYTES');
const report = { status: 'running', scope: 'Existing normal-mode harnesses on actual post-build sources, with one physical source fault at a time. No permanent harness or frozen-fixture edits.',
  sourceBefore, distBefore, fixtureSHA256: sha(read(FROZEN)), probes: [], faults: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
function run(name, script) {
  const child = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GUIDE_HEADINGS_CONTROL: '', SIM_SEARCH_CONTROL: '' } });
  fs.writeFileSync(path.join(OUT, name + '.stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(OUT, name + '.stderr.log'), child.stderr || '');
  const probe = { name, script, status: child.status, signal: child.signal, error: child.error?.message,
    stdoutSHA256: sha(child.stdout || ''), stderrSHA256: sha(child.stderr || '') };
  report.probes.push(probe); save();
  return { ...probe, stdout: child.stdout || '', stderr: child.stderr || '' };
}
function green(name, script) {
  const probe = run(name, script), text = probe.stdout + probe.stderr;
  assert.equal(probe.status, 0, name + ': actual successful child exit');
  assert(!/^\s*FAIL:/m.test(text), name + ': no hidden findings');
  assert(text.includes(script.endsWith('simGuideHeadings.mjs') ? 'simGuideHeadings: green.' : 'simSiteSearch: green.'), name + ': actual closing verdict');
}
function sections(stdout) {
  const result = {}; let section;
  for (const line of stdout.split(/\r?\n/)) {
    const heading = /^([1-4])\)/.exec(line); if (heading) section = heading[1];
    const verdict = /^   (RED|ok ) /.exec(line); if (verdict) result[section] = verdict[1].trim();
  }
  return result;
}
try {
  green('guide-fixed', 'scripts/simGuideHeadings.mjs');
  green('search-fixed', 'scripts/simSiteSearch.mjs');
  const from = JSON.stringify(HOW), to = JSON.stringify(HOW + ' Unreviewed instruction.');
  const source = originalGuide.toString('utf8');
  assert.equal(source.split(from).length, 2, 'CRQ_GUIDE_ONE_LIVE_ANCHOR');
  const changed = Buffer.from(source.replace(from, to));
  assert.notEqual(sha(changed), sha(originalGuide), 'CRQ_GUIDE_CONTROL_CHANGED');
  report.faults.push({ name: 'unapproved-live-howToPlay-copy', file: GUIDE, beforeSHA256: sha(originalGuide), afterSHA256: sha(changed), occurrences: 1, from, to });
  fs.writeFileSync(path.join(OUT, 'unapproved-soccer2.ts'), changed);
  fs.writeFileSync(path.join(ROOT, GUIDE), changed);
  try {
    const probe = run('guide-unapproved-copy', 'scripts/simGuideHeadings.mjs');
    const failures = (probe.stdout + probe.stderr).split(/\r?\n/).filter(line => /^\s*FAIL:/.test(line));
    assert.equal(probe.status, 1, 'CRQ_GUIDE_UNAPPROVED_COPY_EXIT');
    assert.equal(failures.length, 2, 'CRQ_GUIDE_EXACT_TWO_FINDINGS');
    assert(failures.every(line => /^\s*FAIL: \/career: the howToPlay sentence /.test(line)), 'CRQ_GUIDE_ONLY_APPROVED_SCOPE');
    assert.equal(failures.filter(line => line.includes('appears 0 times after the conversion, it must appear once')).length, 1);
    assert.equal(failures.filter(line => line.includes('is not in the frozen original, so it was invented or edited')).length, 1);
    assert.deepEqual(sections(probe.stdout), { 1: 'RED', 2: 'ok', 3: 'ok', 4: 'ok' }, 'CRQ_GUIDE_ACTUAL_ALL_FOUR_SECTIONS');
    assert(probe.stderr.includes('simGuideHeadings: RED, 2 failures in section 1'));
    report.probes.at(-1).actualFailures = failures;
  } finally { fs.writeFileSync(path.join(ROOT, GUIDE), originalGuide); }
  assert.equal(sha(read(GUIDE)), sha(originalGuide), 'CRQ_GUIDE_RESTORED_EXACTLY');
  report.faults.push({ name: 'stale-index', file: INDEX, beforeBlob: FRESH, afterBlob: STALE, beforeSHA256: sha(originalIndex), afterSHA256: sha(staleIndex) });
  fs.writeFileSync(path.join(OUT, 'stale-searchKeywords.json'), staleIndex);
  fs.writeFileSync(path.join(ROOT, INDEX), staleIndex);
  try {
    const probe = run('search-stale-index', 'scripts/simSiteSearch.mjs');
    const failures = (probe.stdout + probe.stderr).split(/\r?\n/).filter(line => /^\s*FAIL:/.test(line));
    assert.equal(probe.status, 1, 'CRQ_SEARCH_STALE_EXIT');
    assert.equal(failures.length, 1, 'CRQ_SEARCH_EXACT_ONE_FRESHNESS_FINDING');
    const old = JSON.parse(staleIndex), fresh = JSON.parse(originalIndex);
    assert.equal(failures[0].trim(), 'FAIL: the guides have changed since the keyword index was built (index ' + old.source + ', guides now ' + fresh.source + '). Rerun: node scripts/genSearchKeywords.mjs');
    assert(probe.stderr.includes('simSiteSearch: 1 failure'));
    report.probes.at(-1).actualFailures = failures;
  } finally { fs.writeFileSync(path.join(ROOT, INDEX), originalIndex); }
  assert.equal(sha(read(INDEX)), sha(originalIndex), 'CRQ_SEARCH_RESTORED_EXACTLY');
  green('guide-restored', 'scripts/simGuideHeadings.mjs');
  green('search-restored', 'scripts/simSiteSearch.mjs');
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
finally {
  fs.writeFileSync(path.join(ROOT, GUIDE), originalGuide); fs.writeFileSync(path.join(ROOT, INDEX), originalIndex);
  report.sourceAfter = snapshot(); report.distAfter = inventory('dist');
  report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.distHeld = JSON.stringify(report.distBefore) === JSON.stringify(report.distAfter);
  if (!report.sourceHeld || !report.distHeld) { report.status = 'failed'; report.holdError = 'Source or dist changed after restoration'; process.exitCode = 1; }
  save();
}
console.log('CRQ guide/search controls: ' + report.status + ', source held ' + report.sourceHeld + ', dist held ' + report.distHeld);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd(), ROUTE = '/soccer-career';
const ALLOWED = ['public/soccer-career/index.html', 'public/sitemap.xml', 'scripts/data/lastmod.json'];
const sha = body => createHash('sha256').update(body).digest('hex');
const clone = value => structuredClone(value);
const json = value => JSON.stringify(value);
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function readObject(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sourcePath(file) {
  assert.equal(path.isAbsolute(file), false); assert.equal(file.split('/').includes('..'), false);
  const absolute = path.resolve(ROOT, file); assert.ok(absolute.startsWith(ROOT + path.sep)); return absolute;
}
function observe(files) {
  return {
    files: files.map(file => { const body = fs.readFileSync(sourcePath(file)); return { path: file, bytes: body.length, sha256: sha(body) }; }),
    sitemap: fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8'),
    ledger: readObject(path.join(ROOT, 'scripts/data/lastmod.json')),
  };
}
function urls(xml) {
  const rows = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => {
    const loc = match[1].match(/<loc>([^<]+)<\/loc>/); assert.ok(loc, 'SC_BUILD_SITEMAP');
    const url = new URL(loc[1]); assert.equal(url.origin, 'https://douknowball.com', 'SC_BUILD_SITEMAP');
    return { path: url.pathname, body: match[0] };
  });
  assert.ok(rows.length > 0, 'SC_BUILD_SITEMAP'); assert.equal(new Set(rows.map(row => row.path)).size, rows.length, 'SC_BUILD_SITEMAP');
  return rows;
}
function validate(before, after) {
  assert.deepEqual(after.files.map(row => row.path), before.files.map(row => row.path), 'SC_BUILD_IMMUTABLE');
  for (let i = 0; i < before.files.length; i++) if (!ALLOWED.includes(before.files[i].path)) {
    assert.deepEqual(after.files[i], before.files[i], 'SC_BUILD_IMMUTABLE');
  }
  const oldUrls = urls(before.sitemap), newUrls = urls(after.sitemap);
  assert.deepEqual(newUrls.map(row => row.path), oldUrls.map(row => row.path), 'SC_BUILD_SITEMAP');
  assert.equal(oldUrls.filter(row => row.path === ROUTE).length, 1, 'SC_BUILD_SITEMAP');
  for (let i = 0; i < oldUrls.length; i++) {
    const stripDate = value => value.replace(/<lastmod>[^<]*<\/lastmod>/g, '<lastmod></lastmod>');
    if (oldUrls[i].path === ROUTE) assert.equal(stripDate(newUrls[i].body), stripDate(oldUrls[i].body), 'SC_BUILD_SITEMAP');
    else assert.equal(newUrls[i].body, oldUrls[i].body, 'SC_BUILD_SITEMAP');
  }
  assert.deepEqual(Object.keys(after.ledger).sort(), Object.keys(before.ledger).sort(), 'SC_BUILD_LEDGER');
  assert.ok(Object.hasOwn(before.ledger, ROUTE) && Object.hasOwn(after.ledger, ROUTE), 'SC_BUILD_LEDGER');
  for (const key of Object.keys(before.ledger)) if (key !== ROUTE) assert.deepEqual(after.ledger[key], before.ledger[key], 'SC_BUILD_LEDGER');
}
async function main() {
  const mode = process.argv[2]; assert.ok(['prepare', 'check'].includes(mode));
  assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
  assert.ok(process.env.SC_SHIELD_BUILD_QA && process.env.SC_SHIELD_BUILD_SOURCE_LIST);
  const out = path.resolve(process.env.SC_SHIELD_BUILD_QA);
  assert.ok(out.startsWith(path.join(ROOT, 'tmp') + path.sep));
  const files = fs.readFileSync(process.env.SC_SHIELD_BUILD_SOURCE_LIST).toString('utf8').split('\0').filter(Boolean);
  assert.ok(files.length > 1000); assert.equal(new Set(files).size, files.length);
  for (const file of ALLOWED) assert.ok(files.includes(file), 'Each allowed file must already be tracked: ' + file);
  if (mode === 'prepare') {
    assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0); fs.mkdirSync(out, { recursive: true });
    const before = observe(files); write(path.join(out, 'before.json'), before);
    for (const file of ALLOWED) {
      const saved = path.join(out, 'before', file); fs.mkdirSync(path.dirname(saved), { recursive: true });
      fs.writeFileSync(saved, fs.readFileSync(sourcePath(file)), { flag: 'wx' });
    }
    write(path.join(out, 'manifest.json'), { schemaVersion: 1, route: ROUTE, allowedMutablePaths: ALLOWED,
      baselineFiles: files.length, newGeneratedPathsAllowed: [], prerenderOnly: ROUTE,
      scope: 'Shield-only initial-page output closure; future joined source changes require a fresh source/route review.' });
    console.log('SC_SHIELD_BUILD_PREPARED: ' + files.length + ' tracked inputs, three existing mutable output paths.');
    return;
  }
  const beforeBytes = fs.readFileSync(path.join(out, 'before.json')), before = JSON.parse(beforeBytes);
  const manifestBytes = fs.readFileSync(path.join(out, 'manifest.json')), manifest = JSON.parse(manifestBytes);
  assert.deepEqual(manifest.allowedMutablePaths, ALLOWED); assert.equal(manifest.prerenderOnly, ROUTE);
  assert.equal(manifest.baselineFiles, files.length);
  let primary = null, completed = false;
  const secondary = [], controls = [];
  try {
    const after = observe(files);
    write(path.join(out, 'after.json'), after);
    const afterBodies = [];
    for (const file of ALLOWED) {
      const body = fs.readFileSync(sourcePath(file)), saved = path.join(out, 'after', file);
      const observed = after.files.find(row => row.path === file);
      assert.ok(observed); assert.equal(body.length, observed.bytes); assert.equal(sha(body), observed.sha256);
      fs.mkdirSync(path.dirname(saved), { recursive: true }); fs.writeFileSync(saved, body, { flag: 'wx' });
      afterBodies.push({ path: file, bytes: body.length, sha256: sha(body) });
    }
    write(path.join(out, 'after-manifest.json'), afterBodies);
    validate(before, after);
    const outside = after.files.findIndex(row => !ALLOWED.includes(row.path)); assert.ok(outside >= 0);
    const ledgerKey = Object.keys(after.ledger).find(key => key !== ROUTE && key !== '__version'); assert.ok(ledgerKey);
    for (const control of [
      { id: 'escaped-file', marker: 'SC_BUILD_IMMUTABLE', change: value => { value.files[outside].sha256 = '0'.repeat(64); value.files[outside].bytes += 1; } },
      { id: 'submitted-route', marker: 'SC_BUILD_SITEMAP', change: value => { value.sitemap = value.sitemap.replace('https://douknowball.com/soccer-career</loc>', 'https://douknowball.com/sc-unowned-control</loc>'); } },
      { id: 'unrelated-ledger', marker: 'SC_BUILD_LEDGER', change: value => { value.ledger[ledgerKey] = { ...value.ledger[ledgerKey], date: value.ledger[ledgerKey].date === '1970-01-01' ? '1970-01-02' : '1970-01-01' }; } },
    ]) {
      const changed = clone(after); control.change(changed);
      const originalSha256 = sha(Buffer.from(json(after))), changedSha256 = sha(Buffer.from(json(changed)));
      assert.notEqual(changedSha256, originalSha256, 'Copied observation control must change data');
      write(path.join(out, 'control-' + control.id + '.changed.json'), changed);
      let refusal = null;
      try { validate(before, changed); } catch (error) { refusal = error; }
      assert.ok(refusal instanceof assert.AssertionError && refusal.message.startsWith(control.marker), 'Named generated-data control: ' + control.id);
      const restored = clone(after); validate(before, restored);
      assert.equal(sha(Buffer.from(json(restored))), originalSha256);
      const receipt = { id: control.id, marker: control.marker, originalSha256, changedSha256,
        restoredSha256: sha(Buffer.from(json(restored))), refusal: { name: refusal.name, message: refusal.message }, restored: true };
      write(path.join(out, 'control-' + control.id + '.json'), receipt); controls.push(receipt);
    }
    const changedPaths = after.files.filter((row, i) => row.sha256 !== before.files[i].sha256 || row.bytes !== before.files[i].bytes).map(row => row.path);
    write(path.join(out, 'summary.json'), { schemaVersion: 1, status: 'passed', route: ROUTE,
      baselineFiles: files.length, changedPaths, afterBodies, healthyPasses: 1, ownedObservationControls: 3, restoredPasses: 3, controls,
      sourceAndRouteScope: manifest.scope, limits: 'Existing full readers own target canonical/boot/fingerprint checks. No new sitemap algorithm, route, calendar, player data or readiness-rate claim.' });
    completed = true;
  } catch (error) { primary = error; }
  finally {
    try { assert.deepEqual(fs.readFileSync(path.join(out, 'before.json')), beforeBytes); assert.deepEqual(fs.readFileSync(path.join(out, 'manifest.json')), manifestBytes); }
    catch (error) { secondary.push({ name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { completed: completed && !primary && secondary.length === 0,
      controlsCompleted: controls.length, primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); }
    catch (error) { secondary.push({ name: error.name, message: error.message }); }
  }
  if (primary) throw primary;
  assert.equal(secondary.length, 0, 'Build evidence inputs changed');
  console.log('SC_SHIELD_BUILD: actual three-path fence, unchanged outside sitemap and ledger, three changed-observation controls with exact restores.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
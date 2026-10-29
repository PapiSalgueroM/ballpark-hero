/* Remote-only selected-tree and one-route snapshot/ledger delta evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.SEO_INTRO_ARTIFACTS || path.join(ROOT, 'soccer-intro-artifacts'));
const folder = path.join(OUT, 'delta'); fs.mkdirSync(folder, { recursive: true });
const phase = process.argv[2]; assert(['before', 'after'].includes(phase));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function inventory() {
  const values = {};
  function walk(relative) {
    for (const item of fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
      const child = relative + '/' + item.name;
      assert(!item.isSymbolicLink(), 'Do not follow source/public symlinks');
      if (item.isDirectory()) walk(child);
      else if (item.isFile()) values[child] = hash(fs.readFileSync(path.join(ROOT, child)));
    }
  }
  for (const base of ['src', 'public', 'scripts']) walk(base);
  return Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
}
function take() {
  return { files: inventory(), ledger: JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/lastmod.json'), 'utf8')),
    sitemap: fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8') };
}
const file = path.join(folder, 'before.json');
if (phase === 'before') {
  assert(!fs.existsSync(file), 'Fresh delta baseline, never replace earlier evidence');
  fs.writeFileSync(file, JSON.stringify(take(), null, 2));
  fs.copyFileSync(path.join(ROOT, 'public/soccer-career/index.html'), path.join(folder, 'before-soccer-career.html'));
  console.log('Soccer intro delta baseline: all src/public/scripts file hashes and raw ledger/sitemap retained.');
} else {
  const before = JSON.parse(fs.readFileSync(file, 'utf8')), after = take();
  const allowed = ['public/soccer-career/index.html', 'public/sitemap.xml', 'scripts/data/lastmod.json'];
  function footprint(first, second) {
    assert.deepEqual(Object.keys(first), Object.keys(second), 'No file is added or removed');
    const changed = Object.keys(first).filter(file => first[file] !== second[file]);
    assert(changed.every(file => allowed.includes(file)), 'Only the selected snapshot, sitemap and ledger may change');
    return changed;
  }
  function ledgerDelta(first, second) {
    assert.deepEqual(Object.keys(first), Object.keys(second), 'Every ledger key is held');
    const changed = Object.keys(first).filter(key => JSON.stringify(first[key]) !== JSON.stringify(second[key]));
    assert.deepEqual(changed, ['/soccer-career'], 'Only Soccer Career ledger entry changes');
    return changed;
  }
  function parts(xml) {
    const loc = '<loc>https://douknowball.com/soccer-career</loc>';
    assert.equal(xml.split(loc).length - 1, 1, 'One exact existing sitemap location');
    const at = xml.indexOf(loc), start = xml.lastIndexOf('<url>', at), end = xml.indexOf('</url>', at) + '</url>'.length;
    const bodyAt = xml.indexOf('<urlset '); assert(start >= bodyAt && end > at);
    return { header: xml.slice(0, bodyAt), row: xml.slice(start, end), otherRows: xml.slice(bodyAt, start) + xml.slice(end) };
  }
  const changed = footprint(before.files, after.files); assert(changed.includes('public/soccer-career/index.html'));
  ledgerDelta(before.ledger, after.ledger);
  assert.notEqual(before.ledger['/soccer-career'].hash, after.ledger['/soccer-career'].hash, 'New readable links change the target fingerprint');
  function otherRowsHeld(first, second) {
    assert.equal(parts(first).otherRows, parts(second).otherRows, 'Every other sitemap URL row is byte-held');
  }
  function headerHeld(first, second) {
    const oldHeader = parts(first).header, newHeader = parts(second).header, dateComment = / on \d{4}-\d{2}-\d{2} \(Round 148\)/g;
    assert.equal((oldHeader.match(dateComment) || []).length, 1); assert.equal((newHeader.match(dateComment) || []).length, 1);
    assert.equal(oldHeader.replace(dateComment, ' on RECORDED-DATE (Round 148)'), newHeader.replace(dateComment, ' on RECORDED-DATE (Round 148)'),
      'The disclosed generator comment date is the only allowed sitemap-header difference');
  }
  const oldXml = parts(before.sitemap), newXml = parts(after.sitemap);
  otherRowsHeld(before.sitemap, after.sitemap); headerHeld(before.sitemap, after.sitemap);
  const otherStart = newXml.otherRows.indexOf('<url>'), otherEnd = newXml.otherRows.indexOf('</url>', otherStart) + '</url>'.length;
  assert(otherStart >= 0 && otherEnd > otherStart, 'One real non-target URL row exists');
  const otherRow = newXml.otherRows.slice(otherStart, otherEnd);
  assert.equal(after.sitemap.split(otherRow).length - 1, 1, 'Copied other-row fault has one real anchor');
  const locStart = otherRow.indexOf('<loc>') + '<loc>'.length, locEnd = otherRow.indexOf('</loc>');
  assert(locStart >= '<loc>'.length && locEnd > locStart);
  const changedRow = otherRow.slice(0, locEnd) + '?qa-copied-control=1' + otherRow.slice(locEnd);
  const badRowsXml = after.sitemap.replace(otherRow, changedRow);
  assert.notEqual(badRowsXml, after.sitemap); assert.throws(() => otherRowsHeld(before.sitemap, badRowsXml), /Every other sitemap URL row/);
  const rowsRestored = badRowsXml.replace(changedRow, otherRow); assert.equal(rowsRestored, after.sitemap);
  otherRowsHeld(before.sitemap, rowsRestored);
  const headerAnchor = 'Generated by scripts/genSitemap.mjs';
  assert.equal(newXml.header.split(headerAnchor).length - 1, 1, 'Copied header fault has one real non-date anchor');
  const changedHeader = newXml.header.replace(headerAnchor, 'Copied-control generator text');
  const badHeaderXml = changedHeader + after.sitemap.slice(newXml.header.length);
  assert.notEqual(badHeaderXml, after.sitemap); assert.throws(() => headerHeld(before.sitemap, badHeaderXml), /sitemap-header difference/);
  const headerRestored = newXml.header + badHeaderXml.slice(changedHeader.length); assert.equal(headerRestored, after.sitemap);
  headerHeld(before.sitemap, headerRestored);
  const xmlControls = {
    otherUrlRow: { beforeHash: hash(Buffer.from(after.sitemap)), changedHash: hash(Buffer.from(badRowsXml)), restoredHash: hash(Buffer.from(rowsRestored)), anchor: otherRow, changed: changedRow },
    nonDateHeader: { beforeHash: hash(Buffer.from(after.sitemap)), changedHash: hash(Buffer.from(badHeaderXml)), restoredHash: hash(Buffer.from(headerRestored)), anchor: headerAnchor, changed: changedHeader },
  };
  fs.writeFileSync(path.join(folder, 'other-url-row-control.xml'), badRowsXml);
  fs.writeFileSync(path.join(folder, 'non-date-header-control.xml'), badHeaderXml);
  fs.writeFileSync(path.join(folder, 'xml-controls.json'), JSON.stringify(xmlControls, null, 2));
  const badLedger = structuredClone(after.ledger), otherKey = Object.keys(after.ledger).find(key => key.startsWith('/') && key !== '/soccer-career');
  badLedger[otherKey] = { ...badLedger[otherKey], hash: 'copied-control-hash' };
  assert.notDeepEqual(badLedger, after.ledger); assert.throws(() => ledgerDelta(before.ledger, badLedger), /Only Soccer Career ledger entry/);
  const badFiles = { ...after.files }, otherFile = Object.keys(after.files).find(file => file.startsWith('public/') && !allowed.includes(file));
  badFiles[otherFile] = 'copied-control-hash'; assert.notDeepEqual(badFiles, after.files);
  assert.throws(() => footprint(before.files, badFiles), /Only the selected snapshot/);
  const result = { changed, heldFiles: Object.keys(after.files).length - changed.length, oldLedger: before.ledger['/soccer-career'],
    newLedger: after.ledger['/soccer-career'], oldSitemapHeader: oldXml.header, newSitemapHeader: newXml.header,
    oldTargetRow: oldXml.row, newTargetRow: newXml.row, controls: { ledgerKey: otherKey, publicFile: otherFile, ...xmlControls }, allOtherSrcPublicScriptsHeld: true };
  fs.writeFileSync(path.join(folder, 'after.json'), JSON.stringify(after, null, 2));
  fs.writeFileSync(path.join(folder, 'result.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(folder, 'ledger-control-copy.json'), JSON.stringify(badLedger, null, 2));
  fs.copyFileSync(path.join(ROOT, 'public/soccer-career/index.html'), path.join(folder, 'after-soccer-career.html'));
  console.log('Soccer intro delta: one snapshot, one ledger entry, one sitemap URL row; all other src/public/scripts held, 4 effective copied-metadata controls.');
}

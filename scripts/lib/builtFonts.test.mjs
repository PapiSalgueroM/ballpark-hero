import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readBuiltFonts, assertLoadedFonts, fontWeightIncludes } from './builtFonts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-font-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
  const change = (file, before, after) => {
    const previous = fs.readFileSync(path.join(root, file), 'utf8');
    assert(previous.includes(before), 'Negative control finds its target');
    const next = previous.replace(before, after); assert.notEqual(next, previous, 'Negative control changes actual bytes');
    write(file, next);
  };
  const css = prefix => ['Inter', 'Space Grotesk'].map((family, i) =>
    `@font-face { font-family: '${family}'; font-style: normal; font-weight: 400 700; font-display: swap; src: url(${prefix}font-${i}.woff2) format('woff2'); unicode-range: U+0000-00FF; }`).join('\n');
  write('dist/index.html', '<link crossorigin href="/assets/main.css" rel="stylesheet">');
  write('dist/assets/main.css', css('/assets/'));
  write('src/assets/fonts/fonts.css', css('./'));
  for (const i of [0, 1]) for (const directory of ['dist/assets', 'src/assets/fonts']) write(`${directory}/font-${i}.woff2`, `wOF2fixture-${i}`);
  return { root, write, change };
}

test('linked bundled fonts match the source bytes and keep stable receipts', t => {
  const { root } = fixture(t), actual = readBuiltFonts(root);
  assert.equal(actual.faces.length, 2); assert.equal(Object.keys(actual.files).length, 7);
  assert.deepEqual(readBuiltFonts(root), actual);
});
for (const [label, file, before, after, error] of [
  ['external stylesheet', 'dist/index.html', '/assets/main.css', 'https://fonts.googleapis.com/css2?family=Inter', /plain local paths|self-hosted/],
  ['external binary', 'dist/assets/main.css', '/assets/font-0.woff2', 'https://fonts.gstatic.com/font-0.woff2', /self-hosted/],
  ['protocol-relative binary', 'dist/assets/main.css', '/assets/font-0.woff2', '//fonts.gstatic.com/font-0.woff2', /self-hosted/],
  ['escaped binary', 'dist/assets/main.css', '/assets/font-0.woff2', '../../outside.woff2', /inside/],
  ['undeclared stylesheet import', 'dist/assets/main.css', '@font-face', '@import "extra.css"; @font-face', /uncaptured imports/],
  ['changed font bytes', 'dist/assets/font-0.woff2', 'fixture-0', 'different', /exactly match source/],
  ['invalid font bytes', 'dist/assets/font-0.woff2', 'wOF2', 'HTML', /WOFF2/],
  ['font weight drift', 'dist/assets/main.css', '400 700', '400 600', /exactly match source/],
  ['unicode subset drift', 'dist/assets/main.css', 'U+0000-00FF', 'U+0000-007F', /exactly match source/],
  ['comment-only stylesheet', 'dist/index.html', '<link crossorigin href="/assets/main.css" rel="stylesheet">', '<!-- <link href="/assets/main.css" rel="stylesheet"> -->', /links its stylesheet/],
]) test(`rejects ${label}`, t => {
  const f = fixture(t); readBuiltFonts(f.root);
  f.change(file, before, after); assert.throws(() => readBuiltFonts(f.root), error);
});
test('rejects a missing font payload', t => {
  const f = fixture(t); readBuiltFonts(f.root);
  fs.unlinkSync(path.join(f.root, 'dist/assets/font-0.woff2'));
  assert.throws(() => readBuiltFonts(f.root), /ENOENT/);
});
test('requires the expected family and weight coverage even if source and build agree', t => {
  const f = fixture(t);
  for (const file of ['src/assets/fonts/fonts.css', 'dist/assets/main.css']) f.change(file, 'Space Grotesk', 'Wrong Family');
  assert.throws(() => readBuiltFonts(f.root), /covers Space Grotesk/);
});
test('accepts static and variable weights, rejects malformed and non-covering descriptors', () => {
  for (const weight of [400, 500, 600, 700]) assert(fontWeightIncludes('400 700', weight));
  assert(fontWeightIncludes('500', 500));
  for (const value of ['400', '400 600', '700 400', '400 500 700', 'NaN', '', '0 1001', 'normal']) assert(!fontWeightIncludes(value, 700));
});
const loaded = () => ['Inter', 'Space Grotesk'].flatMap(family => [400, 500, 600, 700].map(weight =>
  ({ family, weight, faces: [{ family: `"${family}"`, weight: '400 700', status: 'loaded' }] })));
test('accepts all eight browser variable-font loads without synthetic weight credit', () => {
  const rows = loaded(); assertLoadedFonts(rows);
  rows[3].faces[0].weight = '400'; assert.throws(() => assertLoadedFonts(rows), /covers weight 700/);
});
test('rejects empty, failed, wrong-family and duplicate browser loads', () => {
  for (const mutate of [
    rows => { rows[0].faces = []; },
    rows => { rows[0].faces[0].status = 'error'; },
    rows => { rows[0].faces[0].family = 'Arial'; },
    rows => { rows[1] = rows[0]; },
    rows => { rows.pop(); },
  ]) { const rows = loaded(); assertLoadedFonts(rows); mutate(rows); assert.throws(() => assertLoadedFonts(rows)); }
});
test('actual production CSS preserves every bundled font face and payload', () => {
  const result = readBuiltFonts(ROOT);
  assert.equal(result.faces.length, 10);
  assert.equal(Object.keys(result.files).filter(file => file.startsWith('dist/') && file.endsWith('.woff2')).length, 10);
});

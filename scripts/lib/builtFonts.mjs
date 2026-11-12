import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const families = ['Inter', 'Space Grotesk'];
const weights = [400, 500, 600, 700];
const unquote = value => value.trim().replace(/^(['"])(.*)\1$/, '$2');
const cleanCss = value => value.replace(/\/\*[\s\S]*?\*\//g, '');

export function fontWeightIncludes(descriptor, weight) {
  const parts = String(descriptor).trim().split(/\s+/).map(Number);
  return parts.length >= 1 && parts.length <= 2 && parts.every(n => Number.isFinite(n) && n >= 1 && n <= 1000)
    && parts[0] <= parts.at(-1) && weight >= parts[0] && weight <= parts.at(-1);
}

export function assertLoadedFonts(rows) {
  assert.equal(rows.length, families.length * weights.length, 'Eight requested font family/weight pairs');
  for (const family of families) for (const weight of weights) {
    const matches = rows.filter(row => row.family === family && row.weight === weight);
    assert.equal(matches.length, 1, `One actual font load for ${family} ${weight}`);
    assert(matches[0].faces.length > 0 && matches[0].faces.every(face => face.status === 'loaded'
      && unquote(face.family) === family && fontWeightIncludes(face.weight, weight)), `Loaded ${family} face covers weight ${weight}`);
  }
}

// Read the linked built CSS, not a font-host assumption or an unused source file.
// Local fonts remain served by the owned loopback server, never by a fake font response.
export function readBuiltFonts(root) {
  const files = {};
  const read = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    files[relative] = { sha256: sha(bytes), bytes: bytes.length };
    return bytes;
  };
  const resolve = (base, reference, directory) => {
    assert(!/[?#\\]/.test(reference), 'Font assets have plain local paths');
    const url = new URL(reference, `https://built-fonts.invalid/${base}`);
    assert.equal(url.origin, 'https://built-fonts.invalid', 'Font assets are self-hosted');
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
    const absolute = path.resolve(root, relative), boundary = path.resolve(root, directory);
    assert(absolute.startsWith(boundary + path.sep), 'Font asset stays inside its build or source directory');
    assert(fs.realpathSync(absolute).startsWith(fs.realpathSync(boundary) + path.sep), 'Font asset real path stays inside its directory');
    return relative;
  };
  const faces = (css, stylesheet, directory) => {
    const code = cleanCss(css);
    assert(!/@import\b/i.test(code), 'Font CSS has no uncaptured imports');
    return [...code.matchAll(/@font-face\s*\{([^}]+)\}/gi)].map(([, body]) => {
      const property = name => {
        const matches = [...body.matchAll(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'gi'))];
        assert.equal(matches.length, 1, `Font face has one ${name}`); return matches[0][1].trim();
      };
      const urls = [...property('src').matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi)];
      assert.equal(urls.length, 1, 'Each font face has one local binary');
      // Root-relative Vite URLs are relative to dist, not the repository.
      assert(!urls[0][2].startsWith('//'), 'Font assets are self-hosted');
      const reference = urls[0][2].startsWith('/') ? `/${directory}/${urls[0][2].slice(1)}` : urls[0][2];
      const file = resolve(stylesheet, reference, directory), bytes = read(file);
      assert(file.endsWith('.woff2') && bytes.subarray(0, 4).toString() === 'wOF2', 'Actual local WOFF2 font bytes');
      return { family: unquote(property('font-family')), weight: property('font-weight'), style: property('font-style'),
        display: property('font-display'), unicode: property('unicode-range').replace(/\s/g, '').toLowerCase(), sha256: sha(bytes) };
    });
  };
  const html = read('dist/index.html').toString('utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const sheets = [...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(['"])(.*?)\2/g)].map(([, key, , value]) => [key.toLowerCase(), value]));
    if (attributes.rel !== 'stylesheet') return [];
    assert(attributes.href, 'Built stylesheet has an href');
    assert(!attributes.href.startsWith('//'), 'Font assets are self-hosted');
    const reference = attributes.href.startsWith('/') ? `/dist/${attributes.href.slice(1)}` : attributes.href;
    return [resolve('dist/index.html', reference, 'dist')];
  });
  assert(sheets.length > 0, 'Actual built HTML links its stylesheet');
  const built = sheets.flatMap(file => faces(read(file).toString('utf8'), file, 'dist'));
  const sourceFile = 'src/assets/fonts/fonts.css';
  const source = faces(read(sourceFile).toString('utf8'), sourceFile, 'src/assets/fonts');
  assert(source.length > 0, 'Source declares local fonts');
  const ordered = rows => rows.map(row => JSON.stringify(row)).sort();
  assert.deepEqual(ordered(built), ordered(source), 'Built font declarations and binaries exactly match source');
  for (const family of families) for (const weight of weights) {
    assert(built.some(face => face.family === family && fontWeightIncludes(face.weight, weight)), `Built font covers ${family} ${weight}`);
  }
  return { version: 1, faces: built, files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) };
}

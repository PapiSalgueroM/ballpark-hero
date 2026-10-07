import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Appeal verification asset preparation runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, 'manager-appeal-isolation-artifacts/font-cache');
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
fs.mkdirSync(CACHE, { recursive: true });
const manifest = [];
async function download(url) {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(url).origin));
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
  assert(response.ok, 'Presentation dependency response succeeds');
  const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
  fs.writeFileSync(path.join(CACHE, file), body);
  manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: digest(body) });
  return body.toString('utf8');
}
const css = await download(sheets[0]);
const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
assert(urls.length > 0, 'Actual stylesheet declares font files');
for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
const engine = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/components/FlagImg.tsx'), 'utf8');
const nations = engine.match(/export const NATIONS:[\s\S]*?\]\.map\(n =>/);
assert(nations, 'Actual manager country list exists');
const codes = new Map([...flags.matchAll(/"([^"\n]+)":\s*"([a-z-]+)"/g)].map(row => [row[1], row[2]]));
const required = [...new Set([...nations[0].matchAll(/name:\s*'([^']+)'/g)].map(row => { const code = codes.get(row[1]); assert(code, `Actual flag code for ${row[1]}`); return code; }))];
assert(required.length > 0, 'Actual manager countries contribute flag dependencies');
for (const code of required) if (code !== 'gb-eng') await download(`https://flagcdn.com/w40/${code}.png`);
fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Prepared ${manifest.length} actual font and flag dependencies for guarded tactics verification.`);

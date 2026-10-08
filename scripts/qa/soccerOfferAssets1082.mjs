import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

assert(process.env.CI, 'Offer presentation asset preparation runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, 'soccer-offer-review-artifacts/font-cache');
const digest = value => createHash('sha256').update(value).digest('hex');
fs.mkdirSync(CACHE, { recursive: true });
const built = await build({ absWorkingDir: ROOT, stdin: { contents: `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('./src/lib/soccerCareerEngine');
console.log(JSON.stringify([...new Set(engine.FALLBACK_CLUBS.map(club => club.country))].sort()));
`, resolveDir: ROOT }, bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent', metafile: true });
const worker = path.join(CACHE, 'countries-worker.mjs');
fs.writeFileSync(worker, built.outputFiles[0].contents);
fs.writeFileSync(path.join(CACHE, 'countries-metafile.json'), JSON.stringify(built.metafile, null, 2));
const run = spawnSync(process.execPath, [worker], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: `--require=${path.join(ROOT, 'scripts/lib/offlineTransport.cjs')}` } });
fs.writeFileSync(path.join(CACHE, 'countries.stderr.log'), run.stderr || '');
assert.equal(run.status, 0, 'Actual bundled career clubs are read with transport blocked');
assert.equal(run.stderr, '', 'Country extraction makes no transport request');
const countries = JSON.parse(run.stdout.trim());
assert(countries.length > 0 && countries.every(country => typeof country === 'string'));
fs.writeFileSync(path.join(CACHE, 'countries.json'), JSON.stringify({ countries, bundleSha256: digest(built.outputFiles[0].contents) }, null, 2));
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
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
const flagSource = fs.readFileSync(path.join(ROOT, 'src/components/FlagImg.tsx'), 'utf8');
const declaration = flagSource.match(/export const FLAG_CODES:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
assert(declaration, 'Read the actual flag-code declaration');
const codes = new Map([...declaration[1].matchAll(/"([^"\n]+)":\s*"([a-z-]+)"/g)].map(row => [row[1], row[2]]));
const required = [...new Set(countries.map(country => { const code = codes.get(country); assert(code, `Actual flag code for ${country}`); return code; }))];
for (const code of required) if (code !== 'gb-eng') await download(`https://flagcdn.com/w40/${code}.png`);
fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Prepared ${manifest.length} actual font and flag dependencies for ${countries.length} career-club countries.`);

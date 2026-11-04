import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createReadingFixtures, READING_SOURCE_PINS } from './scReadingJourney.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export async function inventory(directory) {
  const rows = [];
  async function walk(relative = '') {
    for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert(entry.isFile()); const bytes = await fs.readFile(path.join(directory, file));
        rows.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await walk(); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}

async function main() {
  const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0, name); return process.argv[i + 1]; };
  const root = process.cwd(), out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist')), core = arg('--core');
  assert(/^[a-f0-9]{40}$/.test(core));
  assert(!out.toLowerCase().startsWith(root.toLowerCase() + path.sep.toLowerCase()), 'Fixture output stays outside the workspace');
  await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
  for (const [file, pin] of Object.entries(READING_SOURCE_PINS)) {
    assert.equal(execFileSync('git', ['rev-parse', core + ':' + file], { encoding: 'utf8' }).trim(), pin, file);
    assert.equal(execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim(), pin, file);
  }
  assert.equal(execFileSync('git', ['hash-object', 'scripts/qa/nativeScrollReady.mjs'], { encoding: 'utf8' }).trim(),
    '671f460aa088d42b44c435a03594cf26695d6e09');
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  const source = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  const sourceBefore = await source(), distBefore = await inventory(dist); assert(distBefore.length > 100);
  const { build } = await import('esbuild'), bundle = 'reading-engine.mjs';
  const entry = `const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};export const engine=await import(${JSON.stringify(path.join(root, 'src/lib/soccerCareerEngine.ts'))});export const codec=await import(${JSON.stringify(path.join(root, 'src/lib/soccerCareerSave.ts'))});`;
  await build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'reading-fixture-entry.mjs', loader: 'js' },
    bundle: true, platform: 'node', format: 'esm', target: 'node24', alias: { '@': path.join(root, 'src') },
    outfile: path.join(out, bundle) });
  const api = await import(pathToFileURL(path.join(out, bundle)).href), fixtures = createReadingFixtures(api), declared = {};
  for (const [name, fixture] of Object.entries(fixtures)) {
    const file = name + '.json'; await fs.writeFile(path.join(out, file), fixture.raw, { flag: 'wx' });
    declared[name] = { file, sha256: sha(fixture.raw), key: fixture.expected.key, expected: fixture.expected };
  }
  const sourceAfter = await source(); assert.deepEqual(sourceAfter, sourceBefore); assert.deepEqual(await inventory(dist), distBefore);
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify({ schema: 1, core, sourcePins: READING_SOURCE_PINS,
    sourceBefore, sourceAfter, distBefore, distDigest: sha(JSON.stringify(distBefore)), bundle,
    bundleSHA: sha(await fs.readFile(path.join(out, bundle))), fixtures: declared,
    scope: 'Two real-constructor fictional CM/GK youth saves with complete literal reward frames checked against the current public model. No browser RNG/clock/storage API override or natural-career claim.' }, null, 2) + '\n', { flag: 'wx' });
  console.log('scReadingFixtures: CM/GK codec-stable fixtures, existing reward references and complete source/output holds passed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();

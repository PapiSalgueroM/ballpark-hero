import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert(process.env.GP_FIELD_APP_PREP, 'Explicit fresh prepared evidence directory');
const out = path.resolve(process.env.GP_FIELD_APP_PREP);
const relative = path.relative(path.join(root, 'tmp'), out);
assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Prep stays in owned workspace/tmp');
assert(!fs.existsSync(out), 'Prep never reuses old evidence');
fs.mkdirSync(out);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const files = ['src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json',
  'scripts/qa/prepareGrandPrixFieldApp.mjs'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
assert.equal(git(held.get(files[0])), 'f85074736a50221d7cd74c9195cc68078cc68e0c', 'Unchanged actual engine');
const rows = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes), git: git(bytes) }));
const put = (name, value) => fs.writeFileSync(path.join(out, name),
  Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
put('source-before.json', rows());
let primary = null;
try {
  const compiled = await build({ entryPoints: [path.join(root, files[0])], absWorkingDir: root, bundle: true,
    platform: 'node', format: 'esm', target: 'node24', write: false, metafile: true, outfile: path.join(out, 'engine.mjs') });
  put('metafile.json', compiled.metafile);
  const inputs = Object.keys(compiled.metafile.inputs).map(file => path.relative(root, path.resolve(root, file)).split(path.sep).join('/')).sort();
  assert.deepEqual(inputs, ['src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts']);
  assert.equal(compiled.outputFiles.length, 1);
  const moduleBytes = Buffer.from(compiled.outputFiles[0].contents);
  put('engine.mjs', moduleBytes);
  const engine = await import(pathToFileURL(path.join(out, 'engine.mjs')).href);
  const state = engine.createCareer(42), input = JSON.stringify(state);
  put('initial-career.json', input);
  const admitted = engine.validateSavedCareer(state);
  assert.equal(JSON.stringify(state), input, 'Reader holds actual createCareer input');
  assert.equal(admitted.ok, true); assert.deepEqual(admitted.state, state);
  assert.equal(state.phase, 'preRace'); assert.equal(state.round, 0); assert.equal(state.race, null);
  assert(state.marketOffers.length >= 2, 'Existing actual market has choices');
  const envelope = Buffer.from(JSON.stringify({ schemaVersion: 1, career: state, completedSeasons: [] }));
  put('initial-save.json', envelope);
  put('manifest.json', { schema: 1, status: 'prepared', scope: 'Actual createCareer(42) fictional saved team. No manual career edits, played year, legacy or browser claim.',
    seed: 42, source: rows(), oracle: { file: 'engine.mjs', bytes: moduleBytes.length, sha256: sha(moduleBytes) },
    save: { file: 'initial-save.json', bytes: envelope.length, sha256: sha(envelope) },
    initialStateSHA256: sha(input), observed: { revision: state.revision, phase: state.phase, round: state.round,
      offers: state.marketOffers.length, driverIds: state.drivers.filter(driver => driver.contract?.teamId === state.teamId).map(driver => driver.id) } });
} catch (error) {
  primary = { name: error.name, message: error.message, stack: error.stack };
  put('primary.json', primary);
} finally {
  for (const [file, bytes] of held) assert(fs.readFileSync(path.join(root, file)).equals(bytes), 'Actual source held: ' + file);
  put('source-after.json', rows());
}
if (primary) throw new Error(primary.message);
console.log('Grand Prix field App prep: actual seed42 saved team and engine oracle retained.');

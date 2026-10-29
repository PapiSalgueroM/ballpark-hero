import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'b20ec6664df9d4c58d63ea0596791d33b2a3b8fc';
const PINS = {
  'src/lib/soccerCareerEngine.ts': '1ecd36c893395485a93d91cb1905ff78c83c7741',
  'src/lib/soccerCareerProgramme.ts': '0cfa74e1b12ee264db8b9e9cdb97c70167a62eb2',
};
const digest = body => createHash('sha256').update(body).digest('hex');
const gitBlob = body => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + body.length + '\0'), body])).digest('hex');
const out = path.resolve(process.env.SC_LOYALTY_ARTIFACTS || path.join(ROOT, '.sim-artifacts', 'soccer-loyalty-' + process.pid + '-' + Date.now()));
fs.mkdirSync(out, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
const canonical = file => path.resolve(ROOT, file);
const original = new Map();
for (const [file, pin] of Object.entries(PINS)) {
  const body = execFileSync('git', ['show', BASE + ':' + file], { cwd: ROOT, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(gitBlob(body), pin, 'Exact immutable baseline body: ' + file);
  original.set(canonical(file), body.toString('utf8'));
}
const overrides = new Map();
for (const [key, file] of [
  ['SC_LOYALTY_ENGINE_CANDIDATE', 'src/lib/soccerCareerEngine.ts'],
  ['SC_LOYALTY_MODULE_CANDIDATE', 'src/lib/soccerCareerLoyalty.ts'],
]) {
  if (!process.env[key]) continue;
  assert(path.isAbsolute(process.env[key]), key + ' must be an absolute copied-source path');
  overrides.set(canonical(file), fs.readFileSync(process.env[key], 'utf8'));
}
const held = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerProgramme.ts', 'src/lib/soccerCareerLoyalty.ts',
  'src/lib/soccerOfferReview.ts', 'src/components/soccer-career/SoccerOfferReview.tsx',
  'src/components/soccer-career/SoccerCareerProgramme.tsx', 'src/pages/SoccerCareer.tsx', 'scripts/simSoccerCareerLoyalty.mjs'];
const sourceHashes = () => Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(canonical(file)))]));
const before = sourceHashes();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-loyalty-'));
const descriptors = new Map(['localStorage', 'fetch', 'Date'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const realRandom = Math.random, RealDate = Date;
const requests = [];
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
  getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key), clear: () => storage.clear(),
} });
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async (...args) => {
  requests.push(String(args[0])); throw new Error('This qualification is offline');
} });
Object.defineProperty(globalThis, 'Date', { configurable: true, writable: true, value: class extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super(1792886400000); }
  static now() { return 1792886400000; }
} });
const report = { base: BASE, sourceBefore: before, cases: [], requests, complete: false,
  scope: 'Three admitted age-19 CM career checkpoints, four streams and five actual season paths. Default ledger absent.',
  limits: ['Official save bytes and all enumerable state data are compared. Function locations and arities are retained, not cross-bundle function identities or closure behavior.'] };
function data(value, place = '$', callbacks = []) {
  if (value === undefined) return ['undefined'];
  if (typeof value === 'function') { callbacks.push({ place, arity: value.length }); return ['function', value.length]; }
  if (value === null || typeof value !== 'object') return [typeof value, value];
  if (Array.isArray(value)) return ['array', Array.from(value, (entry, index) => data(entry, place + '[' + index + ']', callbacks))];
  return ['object', Object.keys(value).sort().map(key => [key, data(value[key], place + '.' + key, callbacks)])];
}
function stream(seed) {
  let word = seed >>> 0, draws = 0;
  return { next() { draws++; word = (Math.imul(word, 1664525) + 1013904223) >>> 0; return word / 4294967296; }, count() { return draws; } };
}
async function bundle(name, replacements) {
  const target = path.join(temp, name + '.mjs');
  await build({ absWorkingDir: ROOT, stdin: { contents: "export * as E from '@/lib/soccerCareerEngine'; export * as S from '@/lib/soccerCareerSave';", resolveDir: ROOT },
    bundle: true, platform: 'node', format: 'esm', target: 'es2022', outfile: target,
    alias: { '@': canonical('src') }, define: { 'import.meta.env': '{}' }, logLevel: 'silent',
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'owned-source-overlay', setup(api) {
      api.onLoad({ filter: /soccerCareer(?:Engine|Programme|Loyalty)\.ts$/ }, args => {
        const body = replacements.get(path.resolve(args.path));
        return body === undefined ? undefined : { contents: body, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  const boot = stream(271828); Math.random = () => boot.next();
  try {
    const module = await import(pathToFileURL(target).href);
    return { module, sha256: digest(fs.readFileSync(target)), bootDraws: boot.count(), bootNext: boot.next() };
  } finally { Math.random = realRandom; }
}
try {
  const base = await bundle('original', original), current = await bundle('candidate', overrides);
  report.bundles = { original: base.sha256, candidate: current.sha256 };
  report.boot = { original: { draws: base.bootDraws, next: base.bootNext }, candidate: { draws: current.bootDraws, next: current.bootNext } };
  assert.deepEqual(report.boot.candidate, report.boot.original, 'Import initialization draws and continuation');
  report.overrides = Object.fromEntries([...overrides].map(([file, body]) => [file, digest(body)]));
  const packet = JSON.parse(fs.readFileSync(canonical('scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const captures = ['ere', 'cha', 'sco'].map(id => {
    const row = packet.saves.find(entry => entry.id === id);
    assert(row?.state?.seasons?.length, 'Complete admitted checkpoint: ' + id); return row;
  });
  const modes = ['playing', 'banned', 'prison', 'legacy-rehab', 'legacy-conviction'];
  for (const capture of captures) for (const seed of [782601, 782602, 782603, 782604]) for (const mode of modes) {
    const input = structuredClone(capture.state);
    delete input.loyaltyContracts;
    input.internationalCareer = false;
    if (mode === 'banned') input.matchFixBanned = 2;
    if (mode === 'prison') input.prisonSeasons = 1;
    if (mode.startsWith('legacy')) input.age = input.seasons[input.seasons.length - 1].age + 1;
    if (mode === 'legacy-rehab') { input.phase = 'rehab_choice'; input.pendingRehab = { name: 'Recorded qualification injury', weeks: 16, year: input.seasons[input.seasons.length - 1].year + 1, specialistCost: null }; }
    if (mode === 'legacy-conviction') { input.phase = 'newspaper'; input.pendingSummary = null; input.prisonSeasons = 1; }
    const observe = module => {
      storage.clear();
      const rng = stream(seed); Math.random = () => rng.next();
      const start = structuredClone(input);
      const state = mode === 'legacy-rehab' ? module.E.applyRehabChoice(start, 1)
        : mode === 'legacy-conviction' ? module.E.dismissNewspaper(start)
          : module.E.advanceProSeason(start, module.E.FALLBACK_CLUBS);
      const draws = rng.count(), nextDraw = rng.next(), callbacks = [];
      return { stateData: data(state, '$', callbacks), callbacks, save: module.S.serializeSoccerCareerSave(state), draws, nextDraw };
    };
    const old = observe(base.module), actual = observe(current.module);
    const id = capture.id + '-' + seed + '-' + mode;
    write(id + '.json', { id, original: old, candidate: actual });
    assert.deepEqual(actual.stateData, old.stateData, id + ': complete enumerable state data');
    assert.deepEqual(actual.callbacks, old.callbacks, id + ': callback locations and arities');
    assert.equal(actual.save, old.save, id + ': exact official saved bytes');
    assert.equal(actual.draws, old.draws, id + ': exact global draw count');
    assert.equal(actual.nextDraw, old.nextDraw, id + ': exact next global draw');
    report.cases.push({ id, mode, draws: actual.draws, callbackCount: actual.callbacks.length,
      completeDataEqual: true, savedBytesEqual: true, drawsEqual: true, nextDrawEqual: true });
  }
  assert.equal(report.cases.length, 60, 'All declared actual comparisons completed');
  assert.deepEqual(requests, [], 'No transport request earns an offline pass');
  report.complete = true;
  console.log('simSoccerCareerLoyalty: 60 actual original/candidate default career comparisons passed.');
  console.log('Official saved bytes and every enumerable data field held in all 60 cases.');
  console.log('Global draw counts and next draws held in all 60 cases.');
  console.log('Actual paths: ' + modes.map(mode => mode + '=12').join(', ') + '.');
  console.log('Callbacks retained by location/arity; no cross-bundle closure-equivalence claim. Evidence: ' + out);
} catch (error) {
  report.failure = { name: error.name, message: error.message, stack: error.stack }; throw error;
} finally {
  Math.random = realRandom;
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
  report.sourceAfter = sourceHashes();
  report.sourceHeld = JSON.stringify(report.sourceAfter) === JSON.stringify(before);
  write('report.json', report);
  assert.deepEqual(report.sourceAfter, before, 'Every canonical source body held');
  const resolved = path.resolve(temp);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()), 'Owned temporary parent');
  assert(path.basename(resolved).startsWith('sc-loyalty-'), 'Owned temporary leaf');
  fs.rmSync(resolved, { recursive: true, force: true });
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BASE = '09df145abfb241679022b41903d2f19bc254ebf9';
export const sha = value => createHash('sha256').update(value).digest('hex');
export const lf = value => value.replaceAll('\r\n', '\n');
export const clone = value => structuredClone(value);
export const BASE_TREE = execFileSync('git', ['rev-parse', `${BASE}^{tree}`], { cwd: ROOT, encoding: 'utf8' }).trim();
export const HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
export const TREE = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim();
export const HELD = [
  'src/lib/clubManager.ts', 'src/lib/clubManagerCalendar.ts', 'src/lib/clubManagerEras.ts',
  'src/lib/clubManagerWorldRoster.ts', 'src/lib/clubManagerWorldRoster.test.ts',
  'src/lib/clubManagerTrajectory.ts', 'src/lib/clubManagerTrajectory.test.ts',
  'src/components/club-manager/ClubDetailScreen.tsx', 'src/data/clubManagerRosters.ts',
  'src/data/clubManagerWorldRosters.ts', 'scripts/simManagerWorldContinuity.mjs',
  'scripts/qa/managerWorldContinuityKit.mjs', '.github/workflows/manager-world-continuity.yml',
  'scripts/simClubManagerEraUcl.mjs', 'scripts/simEras.mjs',
  'scripts/qa/managerEraWorldOracles.mjs', 'scripts/simManagerEraWorldOracles.mjs',
  'scripts/qa/managerWorldSizeDiagnostic.mjs', '.github/workflows/manager-world-size-diagnostic.yml',
  'scripts/qa/managerRosterCacheControl.mjs',
  'scripts/qa/managerWorldRosterDigest.cjs', 'scripts/simClubManagerSlots.mjs',
  'package.json', 'package-lock.json', 'tsconfig.app.json',
];
export function sourceHashes() {
  const result = {};
  for (const relative of HELD) {
    const bytes = fs.readFileSync(path.join(ROOT, relative));
    result[relative] = sha(bytes);
  }
  return result;
}
export function writeEvidence(directory, name, value) {
  fs.mkdirSync(directory, { recursive: true });
  const bytes = Buffer.from(JSON.stringify(value));
  const target = path.join(directory, `${name}.json.gz`);
  fs.writeFileSync(target, gzipSync(bytes, { level: 6 }));
  return { file: path.basename(target), bytes: bytes.length, sha256: sha(bytes), archiveSha256: sha(fs.readFileSync(target)) };
}
export function uniquePatch(source, from, to, file, receipts) {
  const count = source.split(from).length - 1;
  if (count !== 1 || from === to) throw new Error(`Control anchor ${file}: expected one effective source match, saw ${count}`);
  const result = source.replace(from, to);
  if (result === source) throw new Error(`Control did not change ${file}`);
  receipts.push({ file, from, to, count, beforeSha256: sha(source), afterSha256: sha(result), effective: true });
  return result;
}
class HeldDate extends Date {
  constructor(...args) { super(...(args.length ? args : [1791633600000])); }
  static now() { return 1791633600000; }
}
export function tape(seed, action, forced) {
  let state = seed >>> 0; const draws = [];
  const original = Math.random;
  Math.random = () => {
    state += 0x6d2b79f5; let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    const draw = forced === undefined ? ((value ^ value >>> 14) >>> 0) / 4294967296 : forced;
    draws.push(draw); return draw;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}
export async function loadEngine({ original = false, patch, label = 'current' } = {}) {
  const loaded = []; const receipts = [];
  const sourcePlugin = {
    name: 'held-manager-source',
    setup(builder) {
      builder.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const relative = path.relative(ROOT, args.path).replaceAll('\\', '/');
        if (!relative.startsWith('src/')) return null;
        const input = original
          ? lf(execFileSync('git', ['show', `${BASE}:${relative}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }))
          : fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
        const output = patch ? patch(relative, input, receipts) : input;
        loaded.push({ file: relative, sourceSha256: sha(input), compiledSha256: sha(output) });
        return { contents: output, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = `export * as cm from './src/lib/clubManager';
    export * as calendar from './src/lib/clubManagerCalendar';
    export * as eras from './src/lib/clubManagerEras';
    ${original ? '' : "export * as ledger from './src/lib/clubManagerWorldRoster';"}`;
  const bundle = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'manager-world-continuity-entry.ts', loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node24', plugins: [sourcePlugin], logLevel: 'silent' });
  const code = bundle.outputFiles[0].text;
  const scopes = [];
  async function fresh(scopeLabel = label) {
    const module = { exports: {} }; const scopeStore = new Map(); let heldClock = 1791633600000;
    class ScopeDate extends HeldDate {
      constructor(...args) { super(...(args.length ? args : [heldClock])); }
      static now() { return heldClock; }
    }
    const clock = { now: () => heldClock, setNow: value => { assert.ok(Number.isSafeInteger(value)); heldClock = value; } };
    const storage = { getItem: key => scopeStore.get(key) ?? null, setItem: (key, value) => scopeStore.set(key, String(value)),
      removeItem: key => scopeStore.delete(key), clear: () => scopeStore.clear() };
    const context = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
      console, process, Buffer, Math, Date: ScopeDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
      setTimeout, clearTimeout, setInterval, clearInterval, localStorage: storage, fetch: globalThis.fetch });
    vm.runInContext(code, context, { filename: `manager-world-${scopeLabel}.cjs` });
    await module.exports.eras.ensureAllEraRosters();
    const scope = { label: scopeLabel, bundleSha256: sha(code) }; scopes.push(scope);
    return { ...module.exports, loaded, receipts, store: scopeStore, clock, bundleSha256: scope.bundleSha256, fresh, scopes };
  }
  return fresh(label);
}

export function dependencies(mode, output = path.join(ROOT, 'manager-world-continuity-artifacts')) {
  assert.ok(['before', 'after', 'final'].includes(mode), 'Known dependency inventory stage');
  fs.mkdirSync(output, { recursive: true });
  const packageHashes = {};
  for (const relative of ['package.json', 'package-lock.json']) {
    const bytes = fs.readFileSync(path.join(ROOT, relative)); packageHashes[relative] = sha(bytes);
  }
  const firstFile = path.join(output, 'dependencies-before.json');
  if (mode === 'before') {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')); const packages = [];
    for (const [directory, expected] of Object.entries(lock.packages)) {
      const file = path.join(ROOT, directory, 'package.json');
      if (!directory.startsWith('node_modules/') || !fs.existsSync(file) || !expected.version) continue;
      const actual = JSON.parse(fs.readFileSync(file, 'utf8')); assert.equal(actual.version, expected.version, directory);
      packages.push({ directory, name: actual.name, version: actual.version });
    }
    assert.ok(packages.length > 0); fs.writeFileSync(firstFile, JSON.stringify({ packageHashes, packages }, null, 2));
  } else {
    const before = JSON.parse(fs.readFileSync(firstFile, 'utf8')); assert.deepEqual(packageHashes, before.packageHashes);
    const packages = before.packages.map(expected => {
      const actual = JSON.parse(fs.readFileSync(path.join(ROOT, expected.directory, 'package.json'), 'utf8'));
      assert.equal(actual.name, expected.name, expected.directory); assert.equal(actual.version, expected.version, expected.directory);
      return { directory: expected.directory, name: actual.name, version: actual.version };
    });
    const playwright = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/playwright/package.json'), 'utf8'));
    assert.equal(playwright.version, '1.64.0');
    fs.writeFileSync(path.join(output, `dependencies-${mode}.json`), JSON.stringify({ packageHashes, packages, playwright: playwright.version }, null, 2));
  }
  console.log(`PASS actual locked installed package versions and package bytes ${mode}`);
}
if (process.argv[2] === 'dependencies') dependencies(process.argv[3], process.argv[4]);

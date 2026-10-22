/* Actual retired careers, advanced through the same APIs as the page. Remote only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.SC_TAIL_OUT);
const INPUT = path.resolve(process.env.SC_TAIL_INPUT);
const PHASE = process.env.SC_TAIL_PHASE;
const CONTROL = process.env.SC_TAIL_CONTROL === 'original';
assert(['baseline', 'fixed'].includes(PHASE), 'explicit tail proof phase');
assert(!process.env.SC_TAIL_CONTROL || CONTROL, 'known tail control');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/qa/soccerCareerSaveTailInputs.json'), 'utf8'));
assert.equal(manifest.inputs.length, 12);
fs.mkdirSync(OUT, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-save-tails-'));
const savePath = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const heldSource = fs.readFileSync(savePath, 'utf8');
const oldSource = execFileSync('git', ['show', '2083b37564e348e52f0e0306dcde91b9cea1de04:src/lib/soccerCareerSave.ts'], { cwd: ROOT, encoding: 'utf8' });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.writeFileSync(path.join(OUT, 'save-current.ts'), heldSource);
fs.writeFileSync(path.join(OUT, 'save-original.ts'), oldSource);
if (PHASE === 'baseline') assert.equal(heldSource, oldSource, 'unchanged codec baseline');
if (CONTROL) assert.notEqual(heldSource, oldSource, 'original control changes real codec source');
const realRandom = Math.random;
const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b, label) => assert.equal(JSON.stringify(a), JSON.stringify(b), label);
const seeded = (seed, run) => {
  let state = seed | 0;
  const values = [];
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    values.push(value);
    return value;
  };
  try { return { value: run(), values }; } finally { Math.random = realRandom; }
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try {
  const bundle = path.join(temp, 'entry.mjs');
  await build({ absWorkingDir: ROOT,
    stdin: { contents: `export * as E from './src/lib/soccerCareerEngine'; export * as S from './src/lib/soccerCareerSave'; export * as H from './src/data/continueSaves';`, resolveDir: ROOT },
    outfile: bundle, bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: CONTROL ? [{ name: 'original-save-codec', setup(builder) {
      builder.onLoad({ filter: /soccerCareerSave\.ts$/ }, args => {
        assert.equal(args.path, savePath);
        return { contents: oldSource, loader: 'ts', resolveDir: path.dirname(savePath) };
      });
    } }] : [],
  });
  fs.copyFileSync(bundle, path.join(OUT, 'compiled-entry.mjs'));
  const { E, S, H } = await import(pathToFileURL(bundle).href);
  let originalCodec;
  if (PHASE === 'fixed' && !CONTROL) {
    const originalBundle = path.join(temp, 'original-codec.mjs');
    await build({ stdin: { contents: oldSource, resolveDir: path.dirname(savePath), loader: 'ts' },
      outfile: originalBundle, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
    fs.copyFileSync(originalBundle, path.join(OUT, 'compiled-original-codec.mjs'));
    originalCodec = await import(pathToFileURL(originalBundle).href);
  }
  await E.loadManagerMarket();
  assert(E.managerMarketReady(), 'same loaded job market as actual manager choice');
  /* Round 1524: the owner tail is a lazy chunk the page awaits before the boardroom */
  await E.loadOwnerTail();
  const home = H.CONTINUE_SAVES.find(row => row.path === '/soccer-career');
  assert(home);
  const tails = ['manager', 'pundit', 'owner'];
  const checkpoints = new Set([0, 1, 5, 10, 20, 25, 40, 50, 75, 100]);
  const rows = [], failures = [], cases = [], inputs = [];
  let parity = 0, draws = 0, fittingBytesHeld = 0;
  fs.mkdirSync(path.join(OUT, 'inputs'), { recursive: true });
  for (const input of manifest.inputs) {
    const bytes = fs.readFileSync(path.join(INPUT, input.name));
    assert.equal(bytes.length, input.bytes, input.name + ': retained input length');
    assert.equal(digest(bytes), input.sha256, input.name + ': retained input hash');
    fs.writeFileSync(path.join(OUT, 'inputs', input.name), bytes);
    const original = JSON.parse(bytes.toString('utf8'));
    assert(original.retired && original.phase === 'retirement_ceremony');
    assert(S.isSoccerCareerSave(original));
    assert(original.netWorth >= 200, input.name + ': actual page owner-choice gate');
    const seed = Number(input.name.split('-')[0]);
    inputs.push({ ...input, phase: original.phase, seasons: original.seasons.length });
    for (const tail of tails) {
      const id = input.name.replace('-retirement_ceremony-original.json', '') + '-' + tail;
      const startRaw = JSON.stringify(original);
      let career = seeded(seed + 20000, () => E.choosePostRetirement(clone(original), tail, E.FALLBACK_CLUBS)).value;
      assert.equal(JSON.stringify(original), startRaw, id + ': original input held');
      const stateKey = tail + 'State';
      const advance = current => {
        if (tail === 'manager') {
          if (current.managerState.unemployed && current.managerState.offers?.length) current = E.acceptManagerOffer(current, 0);
          return E.advanceManagerSeason(current, E.FALLBACK_CLUBS);
        }
        if (tail === 'pundit') return E.advancePunditSeason(current, 'bold_prediction');
        return E.advanceOwnerSeason(current);
      };
      let firstFailure = null;
      for (let year = 0; year <= 100; year += 1) {
        assert.equal(career.phase, tail + '_season');
        assert.equal(career[stateKey].season, year, id + ': actual season advanced');
        const raw = JSON.stringify(career);
        let stored, restored;
        Math.random = () => { throw new Error('tail codec or metadata consumed randomness'); };
        try {
          stored = S.serializeSoccerCareerSave(career);
          restored = S.parseSoccerCareerSave(stored);
          same(restored, career, id + ': complete JSON restored');
          assert.equal(H.describeSave(home, stored), H.describeSave(home, raw), id + ': Continue metadata');
          assert.equal(S.serializeSoccerCareerSave(restored), stored, id + ': stable encoding');
          if (originalCodec) {
            const oldStored = originalCodec.serializeSoccerCareerSave(career);
            if (oldStored.length <= 60000) {
              assert.equal(stored, oldStored, id + ': every fitting original encoding held');
              fittingBytesHeld += 1;
            }
          }
        } finally { Math.random = realRandom; }
        assert.equal(JSON.stringify(career), raw, id + ': codec input held');
        assert(S.isSoccerCareerSave(restored), id + ': restored tail valid');
        const failed = stored.length > 60000;
        const first = failed && firstFailure === null;
        if (first) firstFailure = year;
        if (failed) failures.push({ id, year, original: raw.length, stored: stored.length });
        rows.push({ id, year, original: raw.length, stored: stored.length });
        if (checkpoints.has(year) || first) {
          fs.writeFileSync(path.join(OUT, `${id}-${year}-original.json`), raw);
          fs.writeFileSync(path.join(OUT, `${id}-${year}-stored.json`), stored);
          const a = seeded(seed + year * 37 + 30000, () => advance(clone(career)));
          const b = seeded(seed + year * 37 + 30000, () => advance(clone(restored)));
          same(b.value, a.value, id + ': next real tail step');
          assert.deepEqual(b.values, a.values, id + ': every following RNG value');
          fs.writeFileSync(path.join(OUT, `${id}-${year}-next.json`), JSON.stringify({ before: raw, restored: JSON.stringify(restored), next: JSON.stringify(a.value), restoredNext: JSON.stringify(b.value), draws: a.values }));
          parity += 1; draws += a.values.length;
        }
        if (year < 100) career = seeded(seed + year * 71 + 40000, () => advance(clone(career))).value;
      }
      cases.push({ id, tail, seasons: 100, firstFailure });
    }
    assert.equal(digest(fs.readFileSync(path.join(INPUT, input.name))), input.sha256, input.name + ': input bytes remain held');
  }
  const report = { phase: PHASE, control: CONTROL ? 'original' : null, limit: 60000, inputRun: manifest.run, inputSource: manifest.source, inputs, cases, states: rows.length, parity, draws, fittingBytesHeld, failures, rows };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  assert.equal(rows.length, 12 * 3 * 101);
  assert(parity >= 12 * 3 * 10);
  assert.equal(fs.readFileSync(savePath, 'utf8'), heldSource, 'current source unchanged');
  console.log(`Actual tails: ${cases.length} careers, 100 seasons each, ${rows.length} complete-state restores.`);
  console.log(`Following real steps: ${parity} whole states, ${draws} exactly matched RNG values.`);
  if (originalCodec) console.log(`Original fitting encodings: ${fittingBytesHeld} byte-identical saves.`);
  console.log(`Unchanged 60000-character cap: ${failures.length} oversized states; first failures ${JSON.stringify(cases.filter(row => row.firstFailure !== null))}.`);
  if (PHASE === 'baseline' || CONTROL) {
    assert(failures.length > 0, 'unchanged codec exposes actual tail size failures');
    assert(cases.some(row => row.tail === 'manager' && row.firstFailure !== null));
    assert(cases.some(row => row.tail === 'pundit' && row.firstFailure !== null));
    assert(cases.some(row => row.tail === 'owner' && row.firstFailure !== null));
    console.log('Expected size RED only; restoration, metadata, real-step and RNG checks passed.');
  } else {
    assert(fittingBytesHeld > 0, 'fitting original saved bytes were independently compared');
    assert.equal(failures.length, 0, 'all measured legal tails fit the existing cap');
    console.log('Soccer Career extended saves: PASS.');
  }
} finally {
  Math.random = realRandom;
  fs.rmSync(temp, { recursive: true, force: true });
}

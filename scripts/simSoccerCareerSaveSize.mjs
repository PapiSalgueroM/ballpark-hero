/* Genuine long careers, their stored size and exact restore. Run remotely. */
import './lib/seedRandom.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { careerStep } from './lib/careerStep.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 60000;
const CONTROL = process.env.SC_SAVE_CONTROL || '';
const EXPECT_RED = process.env.SC_SAVE_EXPECT_RED === '1';
assert(['', 'plain'].includes(CONTROL), 'unknown SC_SAVE_CONTROL');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-save-size-'));
const bundle = path.join(temp, 'entry.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try {
  await build({
    absWorkingDir: ROOT,
    stdin: { contents: `export * as E from './src/lib/soccerCareerEngine'; export * as S from './src/lib/soccerCareerSave'; export * as H from './src/data/continueSaves'; export * as A from './src/lib/soccerCareerAttributes';`, resolveDir: ROOT },
    outfile: bundle, bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  });
  const { E, S, H, A } = await import(pathToFileURL(bundle).href);
  const hasCodec = typeof S.serializeSoccerCareerSave === 'function' && typeof S.parseSoccerCareerSave === 'function';
  const plain = CONTROL === 'plain' || !hasCodec;
  const serialize = plain ? JSON.stringify : S.serializeSoccerCareerSave;
  const parse = plain ? JSON.parse : S.parseSoccerCareerSave;
  const home = H.CONTINUE_SAVES.find(row => row.path === '/soccer-career');
  assert(home, 'actual Soccer Career continue metadata exists');
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
  const realRandom = Math.random;
  const seeded = (seed, run) => {
    let state = seed | 0, draws = 0;
    Math.random = () => {
      draws += 1; state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { return { value: run(), draws }; } finally { Math.random = realRandom; }
  };
  const known = new Set(['youth', 'contract_offer', 'playing', 'newspaper', 'season_summary', 'random_events', 'moral_dilemma', 'social_media_action', 'red_card_appeal_result', 'international_debut', 'world_cup', 'rivalry_event', 'ballon_dor', 'transfer_window', 'rehab_choice']);
  const next = career => {
    if (career.phase === 'retirement_suggestion') return E.declineRetirementSuggestion(career, E.FALLBACK_CLUBS);
    if (career.phase === 'retirement_ceremony' || career.phase === 'post_retirement') return E.choosePostRetirement(career, 'retire', E.FALLBACK_CLUBS);
    if (career.phase === 'retired') return career;
    if (career.phase === 'contract_offer') {
      assert(career.pendingOffers.length, 'actual contract phase has an offer');
      const offer = [...career.pendingOffers].sort((a, b) => a.club.tier - b.club.tier)[0];
      return E.acceptOffer(career, offer);
    }
    assert(known.has(career.phase), `unhandled genuine career phase ${career.phase}`);
    return careerStep(E, career, E.FALLBACK_CLUBS);
  };
  const fixtures = [];
  const positions = ['ST', 'GK', 'CB', 'CM'];
  for (let index = 0; index < 12; index += 1) {
    const position = positions[index % positions.length], seed = 131 + index * 97;
    const generated = seeded(seed, () => {
      const overall = 62, keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
      const offsets = A.POSITION_OFFSETS[position];
      const stats = Object.fromEntries(keys.map((key, i) => [key, Math.max(25, Math.min(99, overall + offsets[i]))]));
      let career = E.initCareer('Save Size Sim', index % 2 ? 'England' : 'Spain', position, '2020s', stats, overall, 2020, E.FALLBACK_CLUBS, null, 94);
      const largest = new Map();
      for (let step = 0; step < 900; step += 1) {
        const raw = JSON.stringify(career), held = largest.get(career.phase);
        if (!held || raw.length > held.length) largest.set(career.phase, raw);
        if (career.retired) break;
        career = next(career);
      }
      assert(career.retired, `seed ${seed} completed through actual career APIs`);
      assert(career.seasons.some(row => row.type === 'playing'), 'actual professional seasons were played');
      largest.set('retired', JSON.stringify(E.choosePostRetirement(clone(career), 'retire', E.FALLBACK_CLUBS)));
      for (const tail of ['manager', 'pundit', 'owner']) largest.set(`${tail}_season`, JSON.stringify(E.choosePostRetirement(clone(career), tail, E.FALLBACK_CLUBS)));
      return [...largest].map(([phase, raw]) => ({ id: `${seed}-${position}-${phase}`, seed, position, phase, raw }));
    });
    fixtures.push(...generated.value);
  }

  const failures = [], rows = [];
  let genuineLarge = 0, packed = 0, parity = 0, originalMax = 0, storedMax = 0;
  for (const fixture of fixtures) {
    const value = JSON.parse(fixture.raw), before = JSON.stringify(value);
    let stored, restored, label;
    Math.random = () => { throw new Error('save codec or metadata consumed randomness'); };
    try {
      stored = serialize(value); restored = parse(stored); label = H.describeSave(home, stored);
    } finally { Math.random = realRandom; }
    assert.equal(JSON.stringify(value), before, `${fixture.id}: serializer leaves input untouched`);
    same(restored, value, `${fixture.id}: complete JSON state restored without pruning`);
    assert(S.isSoccerCareerSave(restored), `${fixture.id}: restored state passes existing validation`);
    assert.equal(label, H.describeSave(home, fixture.raw), `${fixture.id}: continue metadata unchanged`);
    assert.equal(serialize(restored), stored, `${fixture.id}: stored encoding stable after restore`);
    if (fixture.raw.length > LIMIT) genuineLarge += 1;
    if (stored !== fixture.raw) packed += 1;
    originalMax = Math.max(originalMax, fixture.raw.length); storedMax = Math.max(storedMax, stored.length);
    if (stored.length > LIMIT) failures.push({ id: fixture.id, kind: 'size', actual: stored.length, limit: LIMIT });
    if (!value.retired || value.phase === 'retirement_ceremony') {
      const a = seeded(fixture.seed + 9000, () => next(clone(value)));
      const b = seeded(fixture.seed + 9000, () => next(clone(restored)));
      same(b.value, a.value, `${fixture.id}: actual following engine step matches`);
      assert.equal(b.draws, a.draws, `${fixture.id}: following engine draw count matches`);
      parity += 1;
    }
    const breakdown = Object.entries(value).map(([field, entry]) => ({ field, chars: JSON.stringify(entry)?.length ?? 0 })).sort((a, b) => b.chars - a.chars).slice(0, 8);
    rows.push({ id: fixture.id, phase: fixture.phase, seasons: value.seasons.length, story: value.story?.length ?? 0, original: fixture.raw.length, stored: stored.length, breakdown });
    if (process.env.SC_SAVE_OUT) {
      const folder = path.resolve(process.env.SC_SAVE_OUT); fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, `${fixture.id}-original.json`), fixture.raw);
      fs.writeFileSync(path.join(folder, `${fixture.id}-stored.json`), stored);
    }
  }
  assert(genuineLarge > 0, 'fleet contains genuinely played saves above the original limit');
  assert(parity > 0, 'actual following steps were compared');
  if (CONTROL === 'plain') {
    assert(hasCodec, 'plain negative control requires the new codec to exist');
    assert(packed === 0, 'plain control actually bypassed every packed encoding');
    assert(failures.length > 0, 'plain control exposes real over-budget outcomes');
    assert(fixtures.some(row => S.serializeSoccerCareerSave(JSON.parse(row.raw)) !== row.raw), 'plain control changed the actual serialization');
  }
  const report = { control: CONTROL || null, codecPresent: hasCodec, careers: 12, fixtures: fixtures.length, genuineLarge, packed, parity, originalMax, storedMax, limit: LIMIT, failures, rows };
  console.log('SOCCER_SAVE_SIZE ' + JSON.stringify(report));
  if (process.env.SC_SAVE_OUT) fs.writeFileSync(path.join(path.resolve(process.env.SC_SAVE_OUT), 'report.json'), JSON.stringify(report, null, 2));
  if (EXPECT_RED) {
    assert(plain, 'expected red is only valid for baseline or plain control');
    assert(failures.length > 0 && failures.every(row => row.kind === 'size'), 'expected red contains only demonstrated size failures');
    console.log('simSoccerCareerSaveSize: expected RED, only the unchanged 60000-character cap failed.');
  } else {
    assert(hasCodec, 'fixed run requires both actual codec exports');
    assert.equal(failures.length, 0, 'every genuine stored career is at or below 60000 characters');
    assert(packed > 0, 'fixed run actually stored compact histories');
    console.log('simSoccerCareerSaveSize: PASS.');
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

export const ROOT = process.cwd();
export const BASE = '09df145abfb241679022b41903d2f19bc254ebf9';
export const NOW = 1791658800000;
export const OUT = path.resolve('soccer-farewell-artifacts');
export const KEY = 'soccerCareerSave';
export const copy = value => JSON.parse(JSON.stringify(value));
export const sha = value => createHash('sha256').update(value).digest('hex');
export const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }).trim();
export function seeded(seed, action) {
  const oldRandom = Math.random, oldNow = Date.now, draws = [];
  let state = seed >>> 0;
  Math.random = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    const draw = ((value ^ value >>> 14) >>> 0) / 4294967296;
    draws.push(draw);
    return draw;
  };
  Date.now = () => NOW;
  try { return { value: action(), draws }; }
  finally { Math.random = oldRandom; Date.now = oldNow; }
}
export function sourceReceipt(files) {
  const result = [];
  for (const file of files) {
    const bytes = fs.readFileSync(file);
    result.push({ file, sha256: sha(bytes) });
  }
  return result;
}
export function evidence(name, value) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
  return name;
}
export async function bundleFarewell({ original = false, patches = [], browser = false } = {}) {
  const loaded = [], faults = [], temp = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-farewell-'));
  const file = path.join(temp, 'oracle.cjs');
  const entry = "export * as engine from './src/lib/soccerCareerEngine';" + (original ? '' : "export * as farewell from './src/lib/soccerCareerFarewell';export * as moments from './src/components/soccer-career/careerMoments';export * as reveal from './src/lib/soccerAwardReveal';");
  try {
    const result = await build({
      stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true,
      format: browser ? 'iife' : 'cjs', globalName: browser ? 'FarewellOracle' : undefined,
      platform: browser ? 'browser' : 'node', outfile: browser ? undefined : file, write: !browser,
      alias: { '@': path.join(ROOT, 'src') }, jsx: 'automatic', logLevel: 'error',
      define: { 'import.meta.env': '{"PROD":true,"DEV":false}' },
      loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' },
      plugins: [{ name: 'whole-held-source', setup(builder) {
        builder.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
          const relative = path.relative(ROOT, args.path).replaceAll('\\', '/');
          if (!relative.startsWith('src/')) return;
          const raw = original ? execFileSync('git', ['show', BASE + ':' + relative], { maxBuffer: 30 * 1024 * 1024 }) : fs.readFileSync(args.path);
          let contents = raw.toString('utf8').replaceAll('\r\n', '\n');
          for (const patch of patches.filter(value => value.file === relative)) {
            assert.equal(contents.split(patch.from).length, 2, 'Unique actual copied anchor: ' + patch.id);
            const before = sha(contents);
            contents = contents.replace(patch.from, patch.to);
            assert.notEqual(sha(contents), before, 'Copied fault must change actual source');
            faults.push({ id: patch.id, file: relative, before, after: sha(contents), targetCount: 1 });
          }
          loaded.push({ file: relative, rawSha256: sha(raw), compiledSha256: sha(contents), original });
          return { contents, loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts' };
        });
      } }],
    });
    assert.equal(faults.length, patches.length, 'Every fault reaches its compiled product source');
    return { value: browser ? result.outputFiles[0].text : createRequire(path.join(ROOT, 'package.json'))(file), loaded, faults };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
export function capturedPlayers() {
  return JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8')).saves.filter(row => row.kind === 'player');
}
export function heldVeteran(bundle, id = 'ere', extra = {}) {
  const captured = capturedPlayers().find(row => row.id === id);
  assert(captured, 'Existing complete captured player save');
  const state = bundle.engine.repairCareer(copy(captured.state));
  Object.assign(state, { phase: 'playing', age: 31, retired: false, pendingSummary: null, pendingBallonDor: null,
    pendingTournament: null, pendingWorldCup: null, pendingRivalryEvent: null, pendingRehab: null,
    pendingNews: [], pendingEvents: [], transferSituation: null, pendingOffers: [], pendingLoanOffers: null,
    seasonMoments: null, matchFixBanned: 0, prisonSeasons: 0, corruptionHeat: 0, dirtyMoney: 0, loan: null, contractYearsLeft: 3,
    overall: 82, peakOverall: 90, morale: 80, socialMediaActionUsedThisSeason: true, ...extra });
  for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes']) state[key] = state.overall;
  state.seasons = state.seasons.map((row, index) => index === state.seasons.length - 1 ? { ...row, age: state.age } : row);
  return state;
}
export function diffs(expected, actual, at = '$') {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return [];
  if (!expected || !actual || typeof expected !== 'object' || typeof actual !== 'object') return [{ path: at, expected, actual }];
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].flatMap(key => diffs(expected[key], actual[key], at + '.' + key));
}

export function action(bundle, id, input, argument) {
  const { engine: E, farewell: F, reveal: R, moments: M } = bundle;
  if (id === 'load') { const next = E.repairCareer(copy(input)); M?.settleLoadedMoments(next); return next; }
  if (id === 'read') return { plan: F.readSoccerFarewell(input), eligibility: F.farewellEligibility(input), complete: F.farewellSeasonComplete(input) };
  if (id === 'announce') return E.announceFarewellSeason(input, E.FALLBACK_CLUBS);
  if (id === 'next') return E.advanceProSeason(input, E.FALLBACK_CLUBS);
  if (id === 'suggestion') return E.declineRetirementSuggestion(input, E.FALLBACK_CLUBS);
  if (id === 'reveal') return R.revealBallonDorResult(input);
  if (id === 'speech') return E.giveBdorSpeech(input, argument);
  if (id === 'world-speech') return E.giveWorldCupSpeech(input, argument);
  if (id === 'summary') return E.dismissSummary(input, E.FALLBACK_CLUBS);
  if (id === 'newspaper') return E.dismissNewspaper(input);
  if (id === 'ballon_dor') return E.dismissBallonDor(input, E.FALLBACK_CLUBS);
  if (id === 'international_debut') return E.dismissDebut(input, E.FALLBACK_CLUBS);
  if (id === 'world_cup') return E.dismissWorldCup(input, E.FALLBACK_CLUBS);
  if (id === 'rivalry_event') return E.dismissRivalryEvent(input, E.FALLBACK_CLUBS);
  if (id === 'rehab_choice') return E.applyRehabChoice(input, argument ?? 1);
  if (id === 'retire') return E.manualRetire(input);
  if (id === 'post-retirement') return E.choosePostRetirement(input, argument ?? 'retire', E.FALLBACK_CLUBS);
  throw new Error('Unsupported actual farewell action ' + id);
}
export function drainFarewell(bundle, input, seed = 501) {
  const trace = [];
  let state = copy(input);
  for (let step = 0; step < 10 && !state.retired; step++) {
    const phase = state.phase;
    assert(['season_summary', 'newspaper', 'ballon_dor', 'international_debut', 'world_cup', 'rivalry_event', 'rehab_choice'].includes(phase), 'Farewell stops before another gameplay window: ' + phase);
    const before = copy(state);
    const next = seeded(seed + step, () => action(bundle, phase === 'season_summary' ? 'summary' : phase, copy(state)));
    trace.push({ phase, before, after: next.value, draws: next.draws });
    state = next.value;
  }
  assert(state.retired, 'Actual farewell sequence reaches retirement');
  return { value: state, trace };
}

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
export const OUT = path.resolve('soccer-international-return-artifacts');
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
export async function bundleInternationalReturn({ original = false, patches = [], browser = false } = {}) {
  const loaded = [], faults = [], temp = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-international-return-'));
  const file = path.join(temp, 'oracle.cjs');
  const entry = "export * as engine from './src/lib/soccerCareerEngine';export * as international from './src/lib/soccerInternational';export * as selection from './src/lib/soccerInternationalSquads';" + (original ? '' : "export * as comeback from './src/lib/soccerInternationalReturn';export * as moments from './src/components/soccer-career/careerMoments';");
  try {
    const result = await build({
      stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true,
      format: browser ? 'iife' : 'cjs', globalName: browser ? 'InternationalReturnOracle' : undefined,
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

export function action(bundle, id, input) {
  const E = bundle.engine;
  if (id === 'load') { const value = E.repairCareer(copy(input)); bundle.moments?.settleLoadedMoments(value); return value; }
  if (id === 'read') return { receipt: bundle.comeback.readInternationalReturn(input), eligibility: bundle.comeback.internationalReturnEligibility(input) };
  if (id === 'return') return bundle.comeback.makeInternationallyAvailable(input);
  if (id === 'next') return E.advanceProSeason(input, E.FALLBACK_CLUBS);
  if (id === 'retire-international') return E.retireFromInternational(input);
  if (id === 'newspaper') return E.dismissNewspaper(input);
  if (id === 'summary') return E.dismissSummary(input, E.FALLBACK_CLUBS);
  throw new Error('Unsupported actual international return action ' + id);
}
export function cappedPlayer(bundle, extra = {}, id = 'ere') {
  const value = heldVeteran(bundle, id, { age: 35, overall: 95, potential: 99, nationality: 'Ghana', position: 'ST', retirementSuggested: true, ...extra });
  value.internationalCareer = false;
  value.intStats = { ...value.intStats, caps: 40, goals: 12, assists: 7, isRetired: true, isCaptain: false };
  value.seasons = value.seasons.map((row, index) => index === value.seasons.length - 1 ? { ...row, age: value.age, club: value.currentClub, type: 'playing', apps: 32, goals: 22, assists: 8, rating: value.overall < 75 ? 5 : 8.5 } : row);
  return value;
}
export function findPlayedSeason(bundle, input, predicate) {
  for (let seed = 1; seed <= 80; seed++) {
    const result = seeded(seed, () => action(bundle, 'next', copy(input)));
    if (result.value.seasons.length === input.seasons.length + 1 && ['newspaper', 'season_summary'].includes(result.value.phase) && predicate(result.value)) return { seed, ...result };
  }
  throw new Error('Actual bounded international branch was not found');
}
export function finishReturnYear(bundle, input) {
  let value=copy(input);const count=value.seasons.length,trace=[];
  for(let step=0;step<24&&value.phase!=='playing';step++){
    const phase=value.phase,before=copy(value),result=seeded(600+step,()=>{
      const E=bundle.engine,clubs=E.FALLBACK_CLUBS;
      if(phase==='newspaper')return E.dismissNewspaper(copy(value));
      if(phase==='season_summary')return E.dismissSummary(copy(value),clubs);
      if(phase==='ballon_dor')return E.dismissBallonDor(copy(value),clubs);
      if(phase==='world_cup')return E.dismissWorldCup(copy(value),clubs);
      if(phase==='international_debut')return E.dismissDebut(copy(value),clubs);
      if(phase==='rivalry_event')return E.dismissRivalryEvent(copy(value),clubs);
      if(phase==='social_media_action')return E.dismissSocialMediaPhase(copy(value),clubs);
      if(phase==='random_events')return E.applyEventChoice(copy(value),0,clubs);
      if(phase==='moral_dilemma')return E.dismissMoralDilemma(E.applyMoralDilemmaChoice(copy(value),1),clubs);
      if(phase==='red_card_appeal_result')return E.dismissAppealResult(copy(value),clubs);
      if(phase==='transfer_window'||phase==='club_move')return E.stayAtClub(copy(value));
      if(phase==='contract_offer'){assert(value.pendingOffers.length>0);return E.acceptOffer(copy(value),value.pendingOffers[0]);}
      throw new Error('Unsupported real recorded-year continuation '+phase);
    });
    trace.push({phase,before,...result});value=result.value;assert.equal(value.seasons.length,count,'Actual pending handlers never play a second season');
  }
  assert.equal(value.phase,'playing','Actual recorded-year handlers reach the continuing career');return{value,trace};
}

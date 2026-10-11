/* Reviewer sc-engine, Release AW: shared pieces of the probe. Never committed. Runs on a GitHub runner only. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

export const HEAD_ROOT = process.cwd();
export const BASE_ROOT = process.env.SC_BASE || '/tmp/base';
const req = createRequire(path.join(HEAD_ROOT, 'package.json'));

/** Bundle the Soccer Career engine of the tree at `root`, with optional exact once patches and extra libs. */
export async function bundle(root, { patches = [], extra = [] } = {}) {
  const esbuild = req('esbuild');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-probe-'));
  const outfile = path.join(dir, 'e.cjs');
  const applied = new Set();
  const plugin = { name: 'sc-patch', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(root, args.path).split(path.sep).join('/');
      const mine = patches.filter(p => p.file === rel);
      if (!mine.length) return undefined;
      let contents = fs.readFileSync(args.path, 'utf8').split('\r\n').join('\n');
      for (const p of mine) {
        if (contents.split(p.from).length !== 2) throw new Error(`anchor ${p.id} is not in ${rel} exactly once`);
        contents = contents.replace(p.from, () => p.to);
        applied.add(p.id);
      }
      return { contents, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts' };
    });
  } };
  const lib = f => path.join(root, 'src/lib', f).split(path.sep).join('/');
  const lines = [`export * as soccer from '${lib('soccerCareerEngine.ts')}';`,
    ...extra.map(([name, file]) => `export * as ${name} from '${lib(file)}';`)];
  await esbuild.build({ stdin: { contents: lines.join('\n'), resolveDir: root, sourcefile: 'sc-entry.ts' }, bundle: true,
    format: 'cjs', platform: 'node', jsx: 'automatic', outfile, logLevel: 'error', plugins: [plugin],
    alias: { '@': path.join(root, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' } });
  for (const p of patches) if (!applied.has(p.id)) throw new Error(`patch ${p.id} was never applied`);
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  return req(outfile);
}
export const HEAD_LIBS = [['farewell', 'soccerCareerFarewell.ts'], ['brief', 'soccerCareerTransferBrief.ts'],
  ['agent', 'soccerAgentReview.ts'], ['intl', 'soccerInternationalReturn.ts'], ['contracts', 'soccerCareerContracts.ts'],
  ['programme', 'soccerCareerProgramme.ts']];

export function seeded(seed, skip = 0) {
  let n = (seed + Math.imul(skip, 0x6d2b79f5)) | 0, count = skip;
  const fn = () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    count++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.count = () => count;
  return fn;
}
export function withRng(rng, fn) {
  const r = Math.random, d = Date.now;
  Math.random = rng; Date.now = () => 1791586800000;
  try { return fn(); } finally { Math.random = r; Date.now = d; }
}
export function start(E, seed) {
  const position = ['CM', 'ST', 'GK', 'CB'][seed % 4], overall = 65 + seed % 20;
  const stats = Object.fromEntries(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].map(k => [k, overall]));
  return E.initCareer(`Probe ${seed}`, ['England', 'France', 'Netherlands'][seed % 3], position, '2020s', stats, overall, 2020, E.FALLBACK_CLUBS, null, 93);
}
/** What the page of the base did on Request transfer, and what the head's page does. */
export const requestBase = (E, s, clubs) => {
  const r = E.requestTransfer(s, clubs); const n = { ...s, transferSituation: r };
  if (r.type === 'request_result' && !r.offer) { n.phase = 'playing'; n.transferSituation = null; }
  return n;
};
export const requestHead = (E, s, clubs) => E.requestTransferDecision(s, clubs);

/** One press of a natural career. The choice depends on the seed and the step only, so every arm presses alike. */
export function step(E, state, seed, k, arm = {}) {
  const clubs = E.FALLBACK_CLUBS, c = (seed * 7 + k * 13) % 6;
  switch (state.phase) {
    case 'youth': return E.advanceYouthYear(state, clubs);
    case 'contract_offer': return E.acceptOffer(state, state.pendingOffers[seed % state.pendingOffers.length]);
    case 'playing': return E.advanceProSeason(state, clubs);
    case 'rehab_choice': return E.applyRehabChoice(state, seed % 3);
    case 'newspaper': return E.dismissNewspaper(state);
    case 'season_summary': return E.dismissSummary(state, clubs);
    case 'random_events': return E.applyEventChoice(state, state.pendingEvents[0]?.id === 16 ? 1 : 0, clubs);
    case 'moral_dilemma': return state.pendingMoralDilemma ? E.applyMoralDilemmaChoice(state, seed % 2) : E.dismissMoralDilemma(state, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(state, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(state, clubs);
    case 'international_debut': return E.dismissDebut(state, clubs);
    case 'world_cup': return E.dismissWorldCup(state, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(state, clubs);
    case 'ballon_dor': return E.dismissBallonDor(state, clubs);
    case 'retirement_suggestion': return c === 5 ? E.acceptRetirementSuggestion(state) : E.declineRetirementSuggestion(state, clubs);
    case 'transfer_window': {
      const sit = state.transferSituation;
      if (sit?.type === 'contract_expiry') return sit.offers?.length && c % 2 === 0 ? E.acceptOffer(state, sit.offers[0]) : E.signExtension(state);
      if (arm.request && ['no_interest', 'one_offer', 'dream_club'].includes(sit?.type) && c >= 4) return arm.request(E, state, clubs);
      if (sit?.offers?.length && c % 2 === 0) return sit.offers[0].isLoan ? E.acceptLoan(state, sit.offers[0]) : E.acceptOffer(state, sit.offers[0]);
      if (state.pendingLoanOffers?.length && c === 3 && state.pendingLoanOffers[0].isLoan) return E.acceptLoan(state, state.pendingLoanOffers[0]);
      if (sit?.offer && c % 2 === 0) return E.acceptOffer(state, sit.offer);
      if (sit?.offerA && c % 2 === 0) return E.acceptOffer(state, sit.offerA);
      return E.stayAtClub(state);
    }
    default: throw new Error(`unhandled phase ${state.phase}`);
  }
}
const short = v => { const s = JSON.stringify(v); return s === undefined ? 'undefined' : s.length > 70 ? s.slice(0, 70) + '...' : s; };
export function leafDiff(a, b, p = '', out = []) {
  if (out.length > 10 || a === b) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) leafDiff(a[key], b[key], p ? `${p}.${key}` : key, out);
    return out;
  }
  out.push(`${p}: ${short(a)} -> ${short(b)}`);
  return out;
}
export const shape = paths => paths.map(p => p.split(':')[0].replace(/\d+/g, 'N')).sort().join(' | ');

// Reviewer sc-screens, Release AW part one. Builds saves through the engine's own functions, once with the head's
// source and once with the base's (git show <commit>:path), by playing natural careers with a seeded generator.
// usage: node fixtures.mjs <outFile> [baseCommit] [maxSeed]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || '.tmp-fx/review-fixtures.json');
const BASE = process.argv[3] || '5ed04ae7';
const MAX_SEED = Number(process.argv[4] || 60);
const NOW = 1791658800000;
const copy = v => JSON.parse(JSON.stringify(v));

async function bundle(commit) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-sc-'));
  const file = path.join(temp, 'bundle.cjs');
  const head = !commit;
  const entry = "export * as engine from './src/lib/soccerCareerEngine';export * as wheel from './src/lib/careerChanceWheel';export * as contracts from './src/lib/soccerCareerContracts';export * as life from './src/lib/soccerCareerLife';"
    + (head ? "export * as farewell from './src/lib/soccerCareerFarewell';export * as agent from './src/lib/soccerAgentReview';export * as ret from './src/lib/soccerInternationalReturn';export * as brief from './src/lib/soccerCareerTransferBrief';" : '');
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'cjs', platform: 'node', outfile: file,
    alias: { '@': path.join(ROOT, 'src') }, jsx: 'automatic', logLevel: 'error',
    define: { 'import.meta.env': '{"PROD":true,"DEV":false}' },
    loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'from-commit', setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/') || !commit) return;
        const contents = execFileSync('git', ['show', commit + ':' + rel], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
        return { contents, loader: rel.endsWith('.json') ? 'json' : rel.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    } }],
  });
  return createRequire(path.join(ROOT, 'package.json'))(file);
}

function rng(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function seeded(seed, fn) {
  const or = Math.random, on = Date.now;
  Math.random = rng(seed); Date.now = () => NOW;
  try { return fn(); } finally { Math.random = or; Date.now = on; }
}

function step(B, state, seed) {
  const E = B.engine, clubs = E.FALLBACK_CLUBS;
  switch (state.phase) {
    case 'youth': return E.advanceYouthYear(state, clubs);
    case 'contract_offer': return E.acceptOffer(state, state.pendingOffers[seed % state.pendingOffers.length]);
    case 'playing': return E.advanceProSeason(state, clubs);
    case 'rehab_choice': return E.applyRehabChoice(state, 1);
    case 'newspaper': return E.dismissNewspaper(state);
    case 'season_summary': return E.dismissSummary(state, clubs);
    case 'random_events': return E.applyEventChoice(state, 0, clubs);
    case 'moral_dilemma': return state.pendingMoralDilemma ? E.applyMoralDilemmaChoice(state, 1) : E.dismissMoralDilemma(state, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(state, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(state, clubs);
    case 'international_debut': return E.dismissDebut(state, clubs);
    case 'world_cup': return E.dismissWorldCup(state, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(state, clubs);
    case 'ballon_dor': return E.dismissBallonDor(state, clubs);
    case 'transfer_window': {
      const sit = state.transferSituation;
      if (sit?.type === 'contract_expiry') return E.signExtension(state);
      return E.stayAtClub(state);
    }
    case 'retirement_suggestion': return E.declineRetirementSuggestion(state, clubs);
    default: return null;
  }
}

const offersOf = sit => !sit ? [] : sit.type === 'one_offer' || sit.type === 'dream_club' ? [sit.offer]
  : sit.type === 'bidding_war' ? [sit.offerA, sit.offerB] : sit.type === 'contract_expiry' ? sit.offers
  : sit.type === 'request_result' && sit.offer ? [sit.offer] : [];

function facts(B, s) {
  const last = s.seasons[s.seasons.length - 1];
  const out = {
    phase: s.phase, age: s.age, overall: s.overall, weeklyWage: s.weeklyWage, club: s.currentClub, tier: s.currentClubTier,
    nationality: s.nationality, agentId: s.agentId ?? null, contractYearsLeft: s.contractYearsLeft, seasons: s.seasons.length,
    lastRow: last ? { type: last.type, year: last.year, age: last.age, rating: last.rating, apps: last.apps, club: last.club } : null,
    intl: { career: s.internationalCareer, caps: s.intStats?.caps, retired: s.intStats?.isRetired },
    situation: s.transferSituation?.type ?? null,
    offers: offersOf(s.transferSituation).map(o => ({ club: o.club.name, tier: o.club.tier, wage: o.wage, years: o.contractYears, fee: o.transferFee, signedWage: Math.round(o.wage * B.life.agentWageMult(s.agentId)) })),
    events: (s.pendingEvents ?? []).map(e => ({ id: e.id, title: e.title, choices: e.choices.map(c => ({ label: c.label, consequence: c.consequence })) })),
    wheel: s.chanceWheel ?? null,
    extension: B.contracts.soccerExtensionQuote ? B.contracts.soccerExtensionQuote(s) : null,
    renewal: B.contracts.soccerExtensionQuote ? B.contracts.soccerExtensionQuote(s, 'renewal') : null,
    wageDemand: B.contracts.soccerWageDemand ? B.contracts.soccerWageDemand(s) : null,
    hasParts: ['transferBrief', 'farewellSeason', 'internationalReturn', 'agentReview', 'pressRoom'].filter(k => Object.hasOwn(s, k)),
  };
  if (B.farewell) out.eligible = {
    farewell: B.farewell.farewellEligibility(s), agent: B.agent.agentReviewEligibility(s), ret: B.ret.internationalReturnEligibility(s),
  };
  return out;
}

const KINDS = {
  vet: s => s.phase === 'playing' && !s.retired && s.age >= 31 && s.age <= 33 && s.seasons.at(-1)?.type === 'playing'
    && s.internationalCareer === true && s.intStats?.caps >= 1 && !s.intStats.isRetired && !!s.agentId && s.agentId !== 'self' && !s.loan,
  twOffer: s => s.phase === 'transfer_window' && s.age >= 31 && ['one_offer', 'bidding_war', 'dream_club', 'contract_expiry'].includes(s.transferSituation?.type) && offersOf(s.transferSituation).length > 0,
  twCut: s => s.phase === 'transfer_window' && s.age >= 31 && s.overall < 80 && ['one_offer', 'bidding_war', 'dream_club', 'contract_expiry'].includes(s.transferSituation?.type) && offersOf(s.transferSituation).length > 0,
  twNone: s => s.phase === 'transfer_window' && s.age >= 30 && s.transferSituation?.type === 'no_interest' && !s.loan,
  talk: s => s.phase === 'random_events' && s.age >= 30 && s.pendingEvents?.[0]?.id === 16,
  young: s => s.phase === 'playing' && !s.retired && s.age === 24 && s.seasons.at(-1)?.type === 'playing' && !!s.agentId,
};

function play(B, seed, found, engineName) {
  return seeded(seed * 7919 + 13, () => {
    const E = B.engine;
    const weak = seed % 3 === 0;
    const position = ['CM', 'ST', 'CB', 'RW'][seed % 4], overall = weak ? 62 + seed % 6 : 76 + seed % 8;
    const stats = Object.fromEntries(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].map(k => [k, overall]));
    let state = E.initCareer('Review Player ' + seed, ['England', 'France', 'Netherlands', 'Brazil'][seed % 4], position, '2020s', stats, overall, 2020, E.FALLBACK_CLUBS, null, weak ? 76 : 93);
    for (let guard = 0; guard < 1500 && !state.retired; guard++) {
      if (state.chanceWheel && B.wheel.validChanceWheel?.(state.chanceWheel) && !state.chanceWheel.seen) state = B.wheel.acknowledgeChanceWheel(state);
      for (const [kind, test] of Object.entries(KINDS)) {
        if (!found[kind] && test(state)) found[kind] = { id: (engineName === 'base' ? 'old-' : '') + kind, engine: engineName, seed, constructed: false, state: copy(state), facts: facts(B, state) };
      }
      const next = step(B, state, seed);
      if (!next) break;
      state = next;
    }
    return state;
  });
}

function construct(B, found, engineName) {
  // A contract talk at 30 or more did not come up in the seeds: put the engine's own event 16 on a natural veteran,
  // the way scripts/simSoccerVeteranTalks.mjs line 151 does. Marked constructed.
  // talkVet is always constructed from the natural veteran (an elite 31 year old), so both ends of the rule are seen.
  if (!found.vet) return;
  const s = copy(found.vet.state);
  const all = B.engine.getAllEvents ? B.engine.getAllEvents(s) : [];
  const ev = all.find(e => e.id === 16);
  if (!ev) return;
  s.phase = 'random_events'; s.pendingEvents = [copy(ev)];
  const made = { engine: engineName, seed: found.vet.seed, constructed: true, state: s, facts: facts(B, s) };
  found.talkVet = { ...made, id: (engineName === 'base' ? 'old-' : '') + 'talkVet' };
  if (!found.talk) found.talk = { ...made, id: (engineName === 'base' ? 'old-' : '') + 'talk' };
}

const result = { base: BASE, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), fixtures: [], scan: {} };
for (const [engineName, commit] of [['head', null], ['base', BASE]]) {
  const B = await bundle(commit);
  const found = {};
  let seedsUsed = 0;
  for (let seed = 1; seed <= MAX_SEED && Object.keys(found).length < Object.keys(KINDS).length; seed++) { play(B, seed, found, engineName); seedsUsed = seed; }
  construct(B, found, engineName);
  result.scan[engineName] = { seedsUsed, found: Object.fromEntries(Object.entries(found).map(([k, v]) => [k, { seed: v.seed, constructed: v.constructed, age: v.facts.age, situation: v.facts.situation }])) };
  for (const v of Object.values(found)) result.fixtures.push(v);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result));
console.log(JSON.stringify(result.scan, null, 1));
for (const f of result.fixtures) console.log(f.id, 'seed', f.seed, 'age', f.facts.age, 'ovr', f.facts.overall, 'wage', f.facts.weeklyWage, 'agent', f.facts.agentId, 'sit', f.facts.situation, 'offers', JSON.stringify(f.facts.offers), 'elig', JSON.stringify(f.facts.eligible ?? null), 'parts', f.facts.hasParts.join(','));
console.log('fixtures written', result.fixtures.length);

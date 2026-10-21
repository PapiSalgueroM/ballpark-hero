// Reviewer probe for Round 1519: saves made by the BASE engine at every step of every career
// (and every after career tail) are loaded through the branch's repairCareer, and through the
// base's; any byte difference is printed. Also counts engine states whose retired flag and phase
// disagree. Run from the repo root: node .rc/x/rvsaves1519.mjs [careers per fleet]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = process.cwd();
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const N = Number(process.argv[2] || 30);
const BASE_REF = process.env.RV_BASE || 'bc79b526';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-saves-'));
async function bundle(name, src) {
  const entry = path.join(TMP, name + '-entry.mjs');
  const out = path.join(TMP, name + '.mjs');
  fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${ENGINE}';
export { farewellEligibility } from '${path.join(ROOT, 'src/lib/soccerCareerFarewell.ts')}';
`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'eng', setup(b) { b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]soccerCareerEngine\.ts$/ }, () => ({ contents: src, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') })); } }] });
  return import(pathToFileURL(out).href);
}
const CUR = await bundle('cur', fs.readFileSync(ENGINE, 'utf8'));
const BASE = await bundle('base', execFileSync('git', ['show', BASE_REF + ':src/lib/soccerCareerEngine.ts'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
const E = BASE; const clubs = E.FALLBACK_CLUBS;
function seed(n) { let x = n | 0; Math.random = () => { x |= 0; x = (x + 0x6d2b79f5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
Date.now = () => 1790000000000;
const POST = ['retirement_ceremony', 'post_retirement', 'retired', 'manager_season', 'pundit_season', 'owner_season'];
const copy = v => JSON.parse(JSON.stringify(v));
const st = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
let states = 0, differ = 0, inconsistent = 0, summaries = 0, summaryDiffer = 0;
const phases = {}; const diffPhases = {};
function compare(s, where) {
  states += 1; phases[s.phase] = (phases[s.phase] || 0) + 1;
  if (typeof s.retired === 'boolean' && s.retired !== POST.includes(s.phase)) { inconsistent += 1; if (inconsistent <= 5) console.log(`  INCONSISTENT engine state at ${where}: retired ${s.retired} phase ${s.phase} age ${s.age}`); }
  seed(77); const a = JSON.stringify(BASE.repairCareer(copy(s)));
  seed(77); const b = JSON.stringify(CUR.repairCareer(copy(s)));
  if (a !== b) { differ += 1; diffPhases[s.phase] = (diffPhases[s.phase] || 0) + 1; if (differ <= 5) console.log(`  DIFF at ${where}: phase ${s.phase} retired ${s.retired}`); }
  if (s.phase === 'season_summary') {
    summaries += 1;
    seed(78); const c = JSON.stringify(BASE.dismissSummary(copy(s), clubs));
    seed(78); const d = JSON.stringify(CUR.dismissSummary(copy(s), clubs));
    if (c !== d) { summaryDiffer += 1; if (summaryDiffer <= 5) console.log(`  SUMMARY DIFF at ${where}`); }
  }
}
function step(s, policy, pick) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[pick(o.length)]) : { ...s, phase: 'playing' }; }
    case 'playing':
      if (policy === 'shady' && (s.corruptionHeat ?? 0) < 95 && s.netWorth > 0.5) { const n = E.purchaseSpendingItem(s, 'shady_ref_dinner'); if (n !== s) return n; }
      if (policy === 'farewell' && s.age >= 31 && E.farewellEligibility(s).eligible) return E.announceFarewellSeason(s, clubs);
      if (policy === 'manual' && s.age === 27) return E.manualRetire(s);
      return E.advanceProSeason(s, clubs);
    case 'retirement_suggestion': return (policy === 'first' || (policy === 'random' && pick(2) === 0)) ? E.acceptRetirementSuggestion(s) : E.declineRetirementSuggestion(s, clubs);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': { const ev = s.pendingEvents && s.pendingEvents[0]; return ev ? E.applyEventChoice(s, pick(ev.choices.length), clubs) : { ...s, pendingEvents: [], phase: 'playing' }; }
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, policy === 'shady' ? 0 : pick(s.pendingMoralDilemma.choices.length)) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, pick(2));
    case 'transfer_window': return E.stayAtClub(s);
    default: throw new Error('unhandled phase ' + s.phase);
  }
}
const POLICIES = ['first', 'last', 'random', 'shady', 'farewell', 'manual'];
const TAILS = ['retire', 'manager', 'pundit', 'owner'];
let careers = 0, errors = 0, tailsRun = 0;
for (const [p, policy] of POLICIES.entries()) for (let c = 0; c < N; c++) {
  const sd = 55190000 + p * 100003 + c * 7919; seed(sd);
  const ovr = 40 + (c % 30);
  let s = E.initCareer('Probe Player ' + c, ['England', 'Brazil', 'Japan'][c % 3], ['ST', 'CM', 'CB', 'GK'][c % 4], '2020s', st(ovr), ovr, 2025, clubs, null);
  let cs = sd ^ 0x5f3759df;
  const pick = n => { if (n <= 1 || policy === 'first') return 0; if (policy === 'last') return n - 1; cs = (Math.imul(cs, 1103515245) + 12345) | 0; return ((cs >>> 8) % n + n) % n; };
  careers += 1;
  try {
    for (let g = 0; g < 1500 && !(s.retired || POST.includes(s.phase)); g++) { compare(s, `${policy} ${c} age ${s.age}`); s = step(s, policy, pick); }
    compare(s, `${policy} ${c} end`);
    for (const tail of TAILS) {
      seed(sd + 1); let t = E.choosePostRetirement(copy(s), tail, clubs); compare(t, `${policy} ${c} ${tail}`); tailsRun += 1;
      for (let k = 0; k < 4; k++) {
        seed(sd + 2 + k);
        if (tail === 'manager') t = E.advanceManagerSeason(t, clubs);
        else if (tail === 'pundit') t = E.advancePunditSeason(t, 'praise_player');
        else if (tail === 'owner') t = E.advanceOwnerSeason(t);
        compare(t, `${policy} ${c} ${tail} season ${k}`);
      }
      if (tail === 'manager') compare(E.endManagerCareer(t), `${policy} ${c} manager end`);
      if (tail === 'pundit') compare(E.endPunditCareer(t), `${policy} ${c} pundit end`);
      if (tail === 'owner') compare(E.endOwnerCareer(t), `${policy} ${c} owner end`);
    }
  } catch (e) { errors += 1; if (errors <= 5) console.log(`  ERROR ${policy} ${c}: ${String(e && e.message || e).slice(0, 140)}`); }
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log('phases seen', JSON.stringify(phases));
console.log('differing phases', JSON.stringify(diffPhases));
console.log(`careers ${careers}, tails ${tailsRun}, states ${states}, repair differ ${differ}, inconsistent engine states ${inconsistent}, summaries ${summaries} (Continue differs ${summaryDiffer}), errors ${errors}`);
const ok = differ === 0 && summaryDiffer === 0 && errors === 0 && states > 1000;
console.log(ok ? 'RVSAVES PASS: every base save loads byte equal on the branch' : 'RVSAVES FAIL');
process.exit(ok ? 0 : 1);

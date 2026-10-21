/* Round 1519: no Soccer Career ends before the age rules without the player, and a save whose
 * retired flag and phase disagree goes back to what the rest of the save says.
 *
 * THE REPORT (forwarded by the owner, 2026-10-21): "Bug: i retired at 26 no injury no choice".
 * No save, build or steps came with it.
 *
 * EVERY WAY IN, read in source at the round's base (bc79b526) before anything changed:
 *   R1 the age rules, advanceProSeason: an overall under 50 at 33 or older, or 45. Ceremony.
 *   R2 manualRetire: the page's Retire dialog (Confirm Retirement) and a finished farewell season.
 *   R3 acceptRetirementSuggestion: the suggestion card's Retire button. The card needs 30 or older.
 *   R4 the farewell season: announced by the player, from 30, ends through R2 after its summary.
 *   R5 dismissSummary: a retired flag sends the career to the retired screen, no ceremony, no choice.
 *   R6 the tails (manager, pundit, owner, retire and enjoy life): all after a retirement.
 *   R7 the save: isSoccerCareerSave checks the flag and the phase one at a time and repairCareer
 *      never put a disagreeing pair together, so R5 could end a career at any age on a reload.
 *   The shady roads do not end a career: a match fixing ban is 1 to 3 seasons, the failed drug test
 *   1, the trial a year and prison 1. Retiring from international football ends no club career.
 *
 * WHAT THIS HOLDS, driving the real engine with seeded Math.random:
 *   A. Six fleets (first answer, last answer, a random answer, shady: dirty items to the trial and
 *      the first dilemma answer, decline every suggestion, a farewell from 31): no career ends in a
 *      step the player did not take before the age rules, every ending lands on the ceremony with
 *      its choices, and every career is alive at 26.
 *   B. The edges at 25 and 26: a confirmed retirement at 26 is the positive control (ceremony,
 *      legacy, choices); an overall of 30 at 26 plays on; the rules fire at 33 under 50 and at 45;
 *      a ban, the drug test ban, prison and the trial at 26 all play on; a farewell is refused at 26.
 *   C. The pair: a stray flag with a playing phase plays on, a real retirement whose phase was lost
 *      goes back to its ceremony, a lost flag on a real retirement comes back, a retired phase with
 *      nothing behind it goes back to playing, and every consistent save is left byte for byte.
 *
 * NEGATIVE CONTROLS (each asserts its target is in the source before it edits):
 *   SC_ENDINGS_CONTROL=early        the age 45 rule moved to 26: A and B go red.
 *   SC_ENDINGS_CONTROL=noreconcile  repairCareer stops reconciling the pair: C goes red.
 *   SC_ENDINGS_CONTROL=summary      dismissSummary's old hop to the retired screen: C goes red.
 *
 * Run: node scripts/simSoccerCareerEndings.mjs [careers per fleet, default 40]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const PER_FLEET = Number(process.argv[2] || 40);
const CONTROL = process.env.SC_ENDINGS_CONTROL || '';
/* The fleets' seed base; SC_ENDINGS_SEED moves every fleet to other careers, to measure the floors. */
const SEED_BASE = Number(process.env.SC_ENDINGS_SEED || 15190000);
const CONTROLS = {
  early: ['if ((s.overall < 50 && s.age >= 33) || s.age >= 45) {', 'if ((s.overall < 50 && s.age >= 33) || s.age >= 26) {'],
  noreconcile: ['  reconcileRetirement(s);\n  if (!s.primeType)', '  if (!s.primeType)'],
  summary: ['  if (s.retired && reconcileRetirement(s)) return s;', '  if (s.retired) { s.phase = "retired"; return s; }'],
};

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const check = (ok, m) => { if (!ok) fail(m); return ok; };

let source = fs.readFileSync(ENGINE, 'utf8').split('\r\n').join('\n');
if (CONTROL) {
  const pair = CONTROLS[CONTROL];
  if (!pair) { console.error(`ABORT: SC_ENDINGS_CONTROL=${CONTROL} is not a control (${Object.keys(CONTROLS).join(', ')})`); process.exit(1); }
  if (source.split(pair[0]).length !== 2) { console.error(`ABORT: control ${CONTROL} target is not in the engine exactly once, so it would change nothing`); process.exit(1); }
  source = source.replace(pair[0], () => pair[1]);
  console.log(`CONTROL ${CONTROL}: the engine is mutated, this run must go red`);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-endings-'));
const slash = p => p.split(path.sep).join('/');
async function bundle(name, engineSource) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${slash(ENGINE)}';
export { readSoccerFarewell, farewellEligibility } from '${slash(path.join(ROOT, 'src/lib/soccerCareerFarewell.ts'))}';
`);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'engine-source', setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]soccerCareerEngine\.ts$/ }, () => ({ contents: engineSource, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') }));
    } }],
  });
  return import(pathToFileURL(out).href);
}
/* The base: the engine where this branch left main (git merge-base), so section D can hold every
   fleet career byte for byte to it. SC_ENDINGS_BASE names another commit. */
const BASE_REF = process.env.SC_ENDINGS_BASE
  || execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim();
const baseSource = execFileSync('git', ['show', `${BASE_REF}:src/lib/soccerCareerEngine.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).split('\r\n').join('\n');
const CUR = await bundle('current', source);
const BASE = await bundle('base', baseSource);
fs.rmSync(TMP, { recursive: true, force: true });
let E = CUR;
const clubs = E.FALLBACK_CLUBS;

function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Date.now = () => 1790000000000;
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const POST = ['retirement_ceremony', 'post_retirement', 'retired', 'manager_season', 'pundit_season', 'owner_season'];
const over = s => s.retired || POST.includes(s.phase);
const copy = v => JSON.parse(JSON.stringify(v));

/* A career with an invented generated name; the start overall runs 40 to 69 so low and high careers both play. */
function newCareer(seed, c) {
  seedRandom(seed);
  const ovr = 40 + (c % 30);
  return E.initCareer(`Ending Test ${c}`, NATIONS[c % 8], POSITIONS[c % 8], '2020s', stats(ovr), ovr, 2025, clubs, null);
}

/* One press of the page. `pick(n)` answers a card with n buttons the fleet's way. Returns [action, next]. */
function step(s, policy, pick) {
  switch (s.phase) {
    case 'youth': return ['advanceYouthYear', E.advanceYouthYear(s, clubs)];
    case 'contract_offer': {
      const offers = s.pendingOffers || [];
      if (!offers.length) return ['noOffer', { ...s, phase: 'playing' }];
      return ['acceptOffer', E.acceptOffer(s, offers[pick(offers.length)])];
    }
    case 'playing': {
      if (policy === 'shady' && (s.corruptionHeat ?? 0) < 95 && s.netWorth > 0.5) {
        const n = E.purchaseSpendingItem(s, 'shady_ref_dinner');
        if (n !== s) return ['buyRefDinner', n];
      }
      if (policy === 'farewell' && s.age >= 31 && E.farewellEligibility(s).eligible) return ['announceFarewell', E.announceFarewellSeason(s, clubs)];
      return ['advanceProSeason', E.advanceProSeason(s, clubs)];
    }
    case 'retirement_suggestion': {
      if (policy === 'farewell' && E.farewellEligibility(s).eligible) return ['announceFarewell', E.announceFarewellSeason(s, clubs)];
      const accept = policy === 'first' || (policy === 'random' && pick(2) === 0);
      return accept ? ['acceptRetirementSuggestion', E.acceptRetirementSuggestion(s)] : ['declineRetirementSuggestion', E.declineRetirementSuggestion(s, clubs)];
    }
    case 'newspaper': return ['dismissNewspaper', E.dismissNewspaper(s)];
    case 'season_summary': return ['dismissSummary', E.dismissSummary(s, clubs)];
    case 'random_events': {
      const ev = s.pendingEvents && s.pendingEvents[0];
      if (!ev) return ['noEvent', { ...s, pendingEvents: [], phase: 'playing' }];
      return ['applyEventChoice', E.applyEventChoice(s, pick(ev.choices.length), clubs)];
    }
    case 'moral_dilemma':
      if (s.pendingMoralDilemma) return ['applyMoralDilemmaChoice', E.applyMoralDilemmaChoice(s, policy === 'shady' ? 0 : pick(s.pendingMoralDilemma.choices.length))];
      return ['dismissMoralDilemma', E.dismissMoralDilemma(s, clubs)];
    case 'social_media_action': return ['dismissSocialMediaPhase', E.dismissSocialMediaPhase(s, clubs)];
    case 'red_card_appeal_result': return ['dismissAppealResult', E.dismissAppealResult(s, clubs)];
    case 'international_debut': return ['dismissDebut', E.dismissDebut(s, clubs)];
    case 'world_cup': return ['dismissWorldCup', E.dismissWorldCup(s, clubs)];
    case 'rivalry_event': return ['dismissRivalryEvent', E.dismissRivalryEvent(s, clubs)];
    case 'ballon_dor': return ['dismissBallonDor', E.dismissBallonDor(s, clubs)];
    case 'rehab_choice': return ['applyRehabChoice', E.applyRehabChoice(s, pick(2))];
    case 'transfer_window': return ['stayAtClub', E.stayAtClub(s)];
    default: throw new Error(`unhandled phase ${s.phase} at ${s.age}`);
  }
}

/* Which rule let a career end in this step, or null when nothing the player did or the age rules
   explain it. */
function endingRoute(prev, action, n) {
  if (action === 'acceptRetirementSuggestion') return prev.phase === 'retirement_suggestion' && prev.age >= 30 ? 'suggestion' : null;
  if (E.readSoccerFarewell(prev)) return 'farewell';
  if (action === 'advanceProSeason' && (n.age >= 45 || (n.overall < 50 && n.age >= 33))) return 'forced';
  return null;
}

const POLICIES = ['first', 'last', 'random', 'shady', 'decline', 'farewell'];
/* Every fleet career on the engine in E. `note` is fail for the real run and a no-op for the base. */
function fleets(note) {
const tally = { careers: 0, alive26: 0, alive27: 0, ended: {}, early: 0, noChoice: 0, bans: 0, pedBans: 0, prison: 0, trials: 0, lowAt26: 0, stuck: 0 };
const finals = [];
for (const [p, policy] of POLICIES.entries()) {
  for (let c = 0; c < PER_FLEET; c++) {
    const seed = SEED_BASE + p * 100003 + c * 7919;
    let s = newCareer(seed, c);
    let choiceSeed = seed ^ 0x5f3759df;
    const pick = n => {
      if (n <= 1) return 0;
      if (policy === 'first') return 0;
      if (policy === 'last') return n - 1;
      choiceSeed = (Math.imul(choiceSeed, 1103515245) + 12345) | 0;
      return ((choiceSeed >>> 8) % n + n) % n;
    };
    tally.careers += 1;
    let guard = 0, seen26 = false, seen27 = false;
    try {
      while (!over(s) && guard++ < 1500) {
        const prev = s;
        const [action, n] = step(s, policy, pick);
        s = n;
        if (!seen26 && s.age === 26 && !over(s)) { seen26 = true; tally.alive26 += 1; if (s.overall < 60) tally.lowAt26 += 1; }
        if (!seen27 && s.age === 27 && !over(s)) { seen27 = true; tally.alive27 += 1; }
        const row = s.seasons[s.seasons.length - 1];
        if (row !== prev.seasons[prev.seasons.length - 1] && row) {
          if (row.club === 'BANNED') tally.bans += 1;
          if (row.club === 'BANNED (PED)') tally.pedBans += 1;
          if (row.club === 'PRISON') tally.prison += 1;
          if (row.club === 'CONVICTED') tally.trials += 1;
        }
        if (!over(s)) continue;
        const route = endingRoute(prev, action, s);
        tally.ended[route ?? 'early'] = (tally.ended[route ?? 'early'] ?? 0) + 1;
        if (!route) { tally.early += 1; note(`${policy} career ${c}: ended at ${s.age} (overall ${s.overall}) on ${action} from ${prev.phase}, phase ${s.phase}`); }
        if (!(s.phase === 'retirement_ceremony' && s.retired && s.legacy)) { tally.noChoice += 1; note(`${policy} career ${c}: ended at ${s.age} on ${action} into ${s.phase} (retired ${s.retired}, legacy ${!!s.legacy}), not the ceremony and its choices`); }
      }
      if (!over(s)) { tally.stuck += 1; note(`${policy} career ${c}: never finished (on ${s.phase} at ${s.age})`); }
    } catch (e) { tally.stuck += 1; note(`${policy} career ${c}: ${String(e && e.message || e).slice(0, 140)}`); }
    finals.push(JSON.stringify(s));
  }
}
return { tally, finals };
}
console.log(`A) six fleets of ${PER_FLEET} careers: nothing ends a career before the age rules without the player`);
const { tally, finals } = fleets(fail);
console.log(`  careers ${tally.careers}, alive at 26 ${tally.alive26} (overall under 60 there ${tally.lowAt26}), alive at 27 ${tally.alive27}`);
console.log(`  endings ${JSON.stringify(tally.ended)}, early ${tally.early}, not on the ceremony ${tally.noChoice}, stuck ${tally.stuck}`);
console.log(`  shady years lived: bans ${tally.bans}, drug test bans ${tally.pedBans}, trials ${tally.trials}, prison ${tally.prison}`);
check(tally.alive26 === tally.careers, `every career is alive at 26 (${tally.alive26} of ${tally.careers})`);
check(tally.early === 0, `no career ends early (${tally.early})`);
check(tally.noChoice === 0, `every ending lands on the ceremony with its choices (${tally.noChoice} did not)`);

/* Drive one career the 'last' way until it stands on Next Season at `age`. */
function careerAt(age, c = 3) {
  let s = newCareer(15199000 + c * 7919, c);
  const pick = n => n - 1;
  for (let guard = 0; guard < 1500 && !(s.phase === 'playing' && s.age === age); guard++) {
    if (over(s)) throw new Error(`fixture career ${c} ended at ${s.age} before ${age}`);
    s = step(s, 'last', pick)[1];
  }
  if (!(s.phase === 'playing' && s.age === age)) throw new Error(`fixture career ${c} never stood on Next Season at ${age}`);
  return s;
}
const withStats = (s, o) => ({ ...s, ...stats(o), overall: o });
/* Play on, the 'last' way, until the next Next Season; returns the career there (or where it ended). */
function playOn(s, seed) {
  seedRandom(seed);
  const pick = n => n - 1;
  for (let guard = 0; guard < 400; guard++) {
    s = step(s, 'last', pick)[1];
    if (over(s) || s.phase === 'playing' || s.phase === 'retirement_suggestion') break;
  }
  return s;
}
const isCeremony = s => s.phase === 'retirement_ceremony' && s.retired === true && !!s.legacy && Number.isFinite(s.legacy.score);

/* B and C build their fixtures from the engine; a mutated engine can break that, and a broken
   fixture is a failed check, never a crash that hides the summary line. */
try {
console.log('B) the edges at 25 and 26');
const at25 = careerAt(25), at26 = careerAt(26);
console.log(`  fixtures: 25 overall ${at25.overall} at ${at25.currentClub}, 26 overall ${at26.overall} at ${at26.currentClub}`);
{
  const r = E.manualRetire(copy(at26));
  check(isCeremony(r) && r.age === 26, `B1 a confirmed retirement at 26 lands on the ceremony with its legacy (phase ${r.phase}, retired ${r.retired})`);
  check(r.events.some(l => l.includes('Announced retirement')), 'B1 the confirmed retirement says so in the season log');
}
{
  seedRandom(1);
  const n = playOn(withStats(copy(at25), 30), 1519001);
  check(!over(n) && n.age === 26, `B2 an overall of 30 at 25 plays on into 26 (age ${n.age}, phase ${n.phase}, retired ${n.retired})`);
}
{
  const fixture = { ...withStats(copy(at26), 40), age: 32 };
  seedRandom(1519002);
  const n = E.advanceProSeason(fixture, clubs);
  check(isCeremony(n) && n.age === 33 && endingRoute(fixture, 'advanceProSeason', n) === 'forced', `B3 the age rule fires at 33 under 50 (age ${n.age}, overall ${n.overall}, phase ${n.phase})`);
  check(n.events.some(l => l.includes('Forced retirement')), 'B3 the forced retirement says why in the season log');
  const old = { ...copy(at26), age: 44 };
  seedRandom(1519003);
  const m = E.advanceProSeason(old, clubs);
  check(isCeremony(m) && m.age === 45, `B4 the age rule fires at 45 (age ${m.age}, phase ${m.phase})`);
  const young = { ...withStats(copy(at26), 40), age: 25 };
  seedRandom(1519004);
  const y = E.advanceProSeason(young, clubs);
  check(!over(y) && y.age === 26, `B4 an overall of 40 at 26 does not trip the age rule (phase ${y.phase})`);
}
{
  const shady = [
    ['a match fixing ban', s => ({ ...s, matchFixBanned: 2 }), 'BANNED'],
    ['prison', s => ({ ...s, prisonSeasons: 1 }), 'PRISON'],
  ];
  for (const [label, edit, club] of shady) {
    seedRandom(1519005);
    const n = E.advanceProSeason(edit(copy(at25)), clubs);
    const row = n.seasons[n.seasons.length - 1];
    check(!over(n) && n.age === 26 && row.club === club, `B5 ${label} at 26 is a year out, not an ending (row ${row.club}, phase ${n.phase}, retired ${n.retired})`);
    const later = playOn(playOn(n, 1519006), 1519007);
    check(!over(later), `B5 the career plays on after ${label} at 26 (age ${later.age}, phase ${later.phase})`);
  }
  let ped = null, trial = null;
  for (let k = 0; k < 200 && !(ped && trial); k++) {
    seedRandom(1519100 + k);
    const p = E.advanceProSeason({ ...copy(at25), pedActive: true, pedSeasonsRemaining: 2 }, clubs);
    if (!ped && p.seasons[p.seasons.length - 1].club === 'BANNED (PED)') ped = p;
    seedRandom(1519400 + k);
    const t = E.advanceProSeason({ ...copy(at25), corruptionHeat: 100 }, clubs);
    if (!trial && t.seasons[t.seasons.length - 1].club === 'CONVICTED') trial = t;
  }
  for (const [label, n] of [['the failed drug test', ped], ['the trial', trial]]) {
    if (!check(!!n, `B5 ${label} happened at 26 in 200 seeds`)) continue;
    check(!over(n) && n.age === 26, `B5 ${label} at 26 is not an ending (phase ${n.phase}, retired ${n.retired})`);
    let later = n;
    for (let k = 0; k < 3; k++) later = playOn(later, 1519500 + k);
    check(!over(later), `B5 the career plays on after ${label} at 26 (age ${later.age}, phase ${later.phase})`);
  }
  check(!E.farewellEligibility(copy(at26)).eligible, 'B6 a farewell year cannot be announced at 26');
}

console.log('C) a retired flag and a phase that disagree go back to what the rest of the save says');
seedRandom(1519600);
let summary26 = E.advanceProSeason(copy(at25), clubs);
if (summary26.phase === 'newspaper') summary26 = E.dismissNewspaper(summary26);
if (!(summary26.phase === 'season_summary' && summary26.pendingSummary && summary26.age === 26)) throw new Error(`the summary fixture is on ${summary26.phase} at ${summary26.age}`);
const real = E.manualRetire(copy(at26));
seedRandom(1519002);
const forced33 = E.advanceProSeason({ ...withStats(copy(at26), 40), age: 32 }, clubs);
const chose = E.choosePostRetirement(copy(real), 'retire', clubs);
const pundit = E.choosePostRetirement(copy(real), 'pundit', clubs);
const pairs = [
  { label: 'a stray flag on the season summary at 26', save: { ...copy(summary26), retired: true },
    want: r => !r.retired && r.phase === 'season_summary' && JSON.stringify(r.pendingSummary) === JSON.stringify(summary26.pendingSummary) },
  { label: 'a stray flag on Next Season at 26', save: { ...copy(at26), retired: true }, want: r => !r.retired && r.phase === 'playing' },
  { label: 'a real retirement at 26 whose phase was lost', save: { ...copy(real), phase: 'season_summary', pendingSummary: real.seasons[real.seasons.length - 1] },
    want: r => isCeremony(r) && r.legacy.score === real.legacy.score },
  { label: 'a forced retirement whose phase and legacy were lost', save: { ...copy(forced33), phase: 'playing', legacy: null },
    want: r => isCeremony(r) && r.legacy.score === forced33.legacy.score },
  { label: 'a real retirement whose flag was lost', save: { ...copy(real), retired: false }, want: r => isCeremony(r) },
  { label: 'a ceremony that lost its legacy', save: { ...copy(real), legacy: null }, want: r => isCeremony(r) && r.legacy.score === real.legacy.score },
  { label: 'a chosen after career whose phase was lost', save: { ...copy(chose), phase: 'playing' }, want: r => r.retired && r.phase === 'retired' },
  { label: 'a retired screen with nothing behind it', save: { ...copy(at26), phase: 'retired' }, want: r => !r.retired && r.phase === 'playing' },
  { label: 'a ceremony with nothing behind it', save: { ...copy(at26), phase: 'retirement_ceremony' }, want: r => !r.retired && r.phase === 'playing' },
];
for (const { label, save, want } of pairs) {
  seedRandom(1519700);
  const r = E.repairCareer(copy(save));
  check(want(r), `C ${label}: repaired to retired ${r.retired}, phase ${r.phase}, legacy ${r.legacy ? r.legacy.score : 'none'}`);
  seedRandom(1519700);
  const b = BASE.repairCareer(copy(save));
  console.log(`  ${label}: base kept retired ${b.retired} on ${b.phase}; now retired ${r.retired} on ${r.phase}`);
}
{
  /* The in memory road: the summary's Continue on a save that was never reloaded. */
  const stray = { ...copy(summary26), retired: true };
  seedRandom(1519701);
  const n = E.dismissSummary(copy(stray), clubs);
  seedRandom(1519701);
  const b = BASE.dismissSummary(copy(stray), clubs);
  console.log(`  Continue on a stray flag at 26: base went to ${b.phase} (retired ${b.retired}), now ${n.phase} (retired ${n.retired})`);
  check(!over(n), `C Continue on a stray flag at 26 plays on (phase ${n.phase}, retired ${n.retired})`);
  const lost = { ...copy(real), phase: 'season_summary', pendingSummary: real.seasons[real.seasons.length - 1] };
  const m = E.dismissSummary(copy(lost), clubs);
  check(isCeremony(m), `C Continue on a real retirement whose phase was lost opens its ceremony, not the retired screen (phase ${m.phase})`);
}
{
  /* Consistent saves: repairCareer leaves them exactly as the base does, byte for byte. */
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const committed = (data.saves || []).map(row => row && typeof row === 'object' && 'phase' in row ? row : row && (row.save || row.career || row.state)).filter(Boolean);
  const consistent = [at25, at26, summary26, real, forced33, chose, pundit, ...committed];
  const inconsistent = committed.filter(s => s.retired !== POST.includes(s.phase)).length;
  let moved = 0;
  for (const save of consistent) {
    seedRandom(1519702);
    const now = JSON.stringify(E.repairCareer(copy(save)));
    seedRandom(1519702);
    if (now !== JSON.stringify(BASE.repairCareer(copy(save)))) moved += 1;
  }
  console.log(`  consistent saves ${consistent.length} (committed fixtures ${committed.length}, of which inconsistent ${inconsistent}), moved by the repair ${moved}`);
  check(committed.length >= 5, `the committed fixture saves were read (${committed.length})`);
  check(moved === 0, `no consistent save moves (${moved} did)`);
}

} catch (e) { fail(`B and C could not run: ${String(e && e.message || e).slice(0, 160)}`); }

console.log("D) every fleet career is byte for byte the base engine's");
E = BASE;
const base = fleets(() => {});
E = CUR;
let differ = 0;
for (let i = 0; i < finals.length; i++) if (finals[i] !== base.finals[i]) differ += 1;
console.log(`  base ${BASE_REF.slice(0, 8)}: ${base.finals.length} careers, ${differ} differ from this tree`);
check(base.finals.length === finals.length && differ === 0, `the fleets match the base byte for byte (${differ} differ)`);

console.log(failures ? `\nFAIL: ${failures} check(s) failed` : '\nPASS: no career ends before the age rules without the player, and the pair is reconciled');
process.exit(failures ? 1 : 0);

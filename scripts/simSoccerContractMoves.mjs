/** Exact contract outcomes and completed club moves. Controls must fail:
 * SIM_SOCCER_CONTRACT_CONTROL=age|elite|move|repeat disables veteran terms, the
 * actual window move, or the once-only notification guard, respectively.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';
import { SOCCER_CONTRACT_1177_BASELINE_PATCHES } from './lib/soccerContractBaseline1177.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_SOCCER_CONTRACT_CONTROL || '';
const controls = {
  age: { file: 'src/lib/soccerCareerContracts.ts', from: 'if (career.age < 30)', to: 'if (career.age < 130)' },
  elite: { file: 'src/lib/soccerCareerContracts.ts', from: 'career.overall >= 90 && form !== undefined && form >= 8 && (last?.apps ?? 0) >= 20',
    to: 'career.overall >= 85 && form !== undefined && form >= 7.5' },
  move: SOCCER_CONTRACT_1177_BASELINE_PATCHES[2],
  repeat: { file: 'src/lib/soccerCareerEngine.ts', from: '  const s = { ...prev }; s.pendingOffers = []; s.transferSituation = null; s.pendingLoanOffers = null; s.phase = "playing";',
    to: '  if (prev.transferSituation?.type === "club_move") return { ...prev, agentFeesPaid: prev.agentFeesPaid + 1 };\n  const s = { ...prev }; s.pendingOffers = []; s.transferSituation = null; s.pendingLoanOffers = null; s.phase = "playing";' },
};
if (CONTROL && !controls[CONTROL]) throw new Error(`unknown SIM_SOCCER_CONTRACT_CONTROL ${CONTROL}`);
const B = await bundleAwardsNight(ROOT, { patches: CONTROL ? [controls[CONTROL]] : [], extra: { contracts: 'src/lib/soccerCareerContracts.ts' } });
const old = await bundleAwardsNight(ROOT, { patches: SOCCER_CONTRACT_1177_BASELINE_PATCHES });
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(save => save.id === 'ere').state;
const copy = value => structuredClone(value);
const current = B.soccer;
const parent = current.FALLBACK_CLUBS.find(club => club.name === 'Real Madrid');
const destination = current.FALLBACK_CLUBS.find(club => club.name === 'Twente');
assert.ok(parent && destination, 'fixture clubs come from the real existing pool');
function subject(age, overall = 76, rating = 6.4) {
  const state = copy(captured);
  Object.assign(state, { age, overall, weeklyWage: 100000, contractYearsLeft: 4, currentClub: parent.name,
    currentClubCountry: parent.country, currentClubTier: parent.tier, currentClubColor: parent.color,
    currentLeague: parent.league, phase: 'transfer_window', rival: null, loan: null });
  Object.assign(state.seasons.at(-1), { club: parent.name, clubTier: parent.tier, clubCountry: parent.country,
    apps: 32, leagueApps: 30, rating });
  return state;
}
function seeded(action, state, seed) {
  const random = Math.random;
  try { Math.random = mulberry32(seed); return action(copy(state)); } finally { Math.random = random; }
}

assert.equal(JSON.stringify(seeded(current.repairCareer, captured, 1177)), JSON.stringify(seeded(old.soccer.repairCareer, captured, 1177)), 'loading the entire old save stays byte-identical to the old engine');
for (const age of [19, 25, 29]) for (const seed of [1, 7, 1177]) {
  const state = subject(age);
  assert.equal(JSON.stringify(seeded(current.signExtension, state, seed)), JSON.stringify(seeded(old.soccer.signExtension, state, seed)), 'young extension keeps every field and the same RNG draw');
  state.contractYearsLeft = 0;
  assert.equal(JSON.stringify(seeded(current.stayAtClub, state, seed)), JSON.stringify(seeded(old.soccer.stayAtClub, state, seed)), 'young renewal keeps every field and the same RNG draw');
}
for (const [age, overall, rating, wage, years] of [[32, 76, 6.4, 90000, 2], [38, 76, 6.4, 80000, 1], [38, 90, 8.2, 105000, 1], [38, 85, 7.5, 100000, 1], [32, 82, 7.2, 100000, 2]]) {
  const state = subject(age, overall, rating);
  const bytes = JSON.stringify(state);
  const quote = B.contracts.soccerExtensionQuote(state);
  assert.equal(quote.weeklyWage, wage, 'age and current level/form decide the exact quoted wage');
  assert.equal(quote.contractYears, years, 'veterans receive the stated shorter term');
  for (const [kind, action] of [['extension', current.signExtension], ['renewal', s => current.stayAtClub({ ...s, contractYearsLeft: 0 })]]) {
    const after = seeded(action, state, 1177);
    const oldAction = kind === 'extension' ? old.soccer.signExtension : s => old.soccer.stayAtClub({ ...s, contractYearsLeft: 0 });
    const expected = seeded(oldAction, state, 1177);
    expected.weeklyWage = wage;
    expected.contractYearsLeft = years;
    expected.events[expected.events.length - 1] = kind === 'extension'
      ? `📝 Signed ${years}-year extension with ${state.currentClub} (${current.formatWage(wage)})`
      : `📝 Renewed contract with ${state.currentClub} for ${years} ${years === 1 ? 'year' : 'years'}`;
    assert.equal(JSON.stringify(after), JSON.stringify(expected), 'every veteran save field matches the old action except its explicitly changed deal terms and contract log');
    assert.equal(after.weeklyWage, wage);
    assert.equal(after.contractYearsLeft, years);
    assert.equal(JSON.stringify(after.seasons), JSON.stringify(state.seasons), 'a new deal leaves every completed season alone');
  }
  assert.equal(JSON.stringify(state), bytes, 'quotes and signing leave the full input save untouched');
}
console.log('ok   full old-save loading and younger deals unchanged; exact older extension and renewal quotes');
const cameo = subject(38, 90, 8.2);
Object.assign(cameo.seasons.at(-1), { apps: 2 });
assert.equal(B.contracts.soccerExtensionQuote(cameo).weeklyWage, 100000, 'an excellent cameo cannot earn a veteran raise');

for (const age of [21, 26]) {
  const state = subject(age, 66, 5.9);
  Object.assign(state.seasons.at(-1), { apps: 2, leagueApps: 2 });
  state.phase = 'red_card_appeal_result';
  state.pendingAppealResult = null;
  state.pendingEvents = [];
  state.badSeasonStreak = 0;
  const moved = seeded(s => current.dismissAppealResult(s, current.FALLBACK_CLUBS), state, 1178 + age);
  const baseline = seeded(s => old.soccer.dismissAppealResult(s, old.soccer.FALLBACK_CLUBS), state, 1178 + age);
  assert.equal(baseline.transferSituation.type, 'frozen_out', 'the guarded old behavior still lists rather than moves');
  assert.equal(moved.transferSituation.type, 'club_move', 'the actual window completes the club decision without an accept action');
  const move = moved.transferSituation;
  assert.equal(move.toClub, moved.currentClub);
  assert.notEqual(move.toClub, move.fromClub);
  assert.equal(move.mode, age <= 23 ? 'loan' : 'sale');
  const offer = baseline.transferSituation.offers[0];
  const expected = offer.isLoan ? current.acceptLoan(copy(baseline), offer) : current.acceptOffer(copy(baseline), offer);
  expected.phase = 'transfer_window';
  expected.transferSituation = move;
  assert.equal(JSON.stringify(moved), JSON.stringify(expected), 'every saved field equals the existing accept path plus only the completed move notification');
  const loaded = seeded(current.repairCareer, moved, 1178);
  const oldLoaded = seeded(old.soccer.repairCareer, moved, 1178);
  assert.equal(JSON.stringify(loaded), JSON.stringify(oldLoaded), 'repair preserves the entire already completed move like the old engine');
  assert.equal(current.completeClubVerdictMove(loaded), loaded, 'reload cannot execute a completed move again');
  const played = current.stayAtClub(loaded);
  assert.equal(played.transferSituation, null, 'Continue clears a completed move without repeating it');
  assert.equal(played.phase, 'playing');
  assert.equal(played.agentFeesPaid, moved.agentFeesPaid, 'Continue never repeats an agent fee');
  assert.deepEqual(played.events, moved.events, 'Continue never repeats a signing event');
  assert.equal(played.weeklyWage, moved.weeklyWage);
  if (age <= 23) {
    assert.equal(played.loan.parentClub, parent.name);
    assert.equal(played.weeklyWage, state.weeklyWage);
    assert.equal(played.contractYearsLeft, state.contractYearsLeft);
    const returned = seeded(s => current.advanceProSeason(s, current.FALLBACK_CLUBS), played, 1180);
    assert.equal(returned.seasons.at(-1).club, move.toClub);
    assert.equal(returned.seasons.at(-1).onLoanFrom, parent.name);
    assert.equal(returned.currentClub, parent.name);
    assert.equal(returned.loan, null);
  }
}
console.log('ok   actual club sales and loans complete once, preserve accepted-contract fields and return the loan parent');
console.log(`simSoccerContractMoves: all full-save contract and club-move checks passed${CONTROL ? ` (unexpected control ${CONTROL})` : ''}`);

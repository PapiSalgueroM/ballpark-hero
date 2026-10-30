import type { CareerState, SeasonRecord, ClubData, ContractOffer } from './soccerCareerEngine';

export type ProgrammeId = 'tactics' | 'position' | 'set_pieces' | 'promise' | 'negotiation' | 'bonuses' | 'adaptation' | 'fitness' | 'captain' | 'loan';
export interface SoccerProgrammeReceipt {
  year: number;
  club: string;
  choices: Partial<Record<ProgrammeId, string>>;
  status: 'completed' | 'interrupted';
  outcomes: Partial<Record<ProgrammeId, string>>;
  bonusEuros: number;
  penaltyGoals: number;
  freeKickGoals: number;
  secondaryPosition: string | null;
  promise: 'met' | 'broken' | 'excused' | null;
}
export interface SoccerProgrammeState {
  version: 1;
  plan?: { year: number; club: string; choices: Partial<Record<ProgrammeId, string>>; bonusEuros?: number };
  receipts: SoccerProgrammeReceipt[];
  secondaryTraining?: { club: string; from: string; target: string; year: number; seasons: number };
  secondaryPosition?: { club: string; primary: string; position: string };
  negotiated?: { year: number; club: string; mode: string; accepted: boolean }[];
  loanBuy?: { year: number; club: string; parent: string; ready: boolean };
}
export interface ProgrammeEffects {
  appsMult: number; injuryDelta: number; goalMult: number; assistMult: number;
  cleanSheetMult: number; redCardMult: number; yellowCardMult: number;
}
export interface ProgrammeChoice {
  id: string; label: string; effect: string; tradeoff: string; eligible: boolean; reason?: string;
}
export interface ProgrammeView {
  id: ProgrammeId; title: string; description: string; context: string;
  choices: ProgrammeChoice[]; choice: string | null; outcome: string | null; canCancel: boolean;
}

const GROUPS = [['CB', 'LB', 'RB'], ['CDM', 'CM', 'CAM', 'LM', 'RM'], ['ST', 'CF', 'LW', 'RW']];
const IDS: ProgrammeId[] = ['tactics', 'position', 'set_pieces', 'promise', 'negotiation', 'bonuses', 'adaptation', 'fitness', 'captain', 'loan'];
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
function validChoices(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const known: Partial<Record<ProgrammeId, string[]>> = { tactics: ['finisher', 'creator', 'cover'], set_pieces: ['penalties', 'free_kicks'], promise: ['rotation', 'starter'], bonuses: ['appearances', 'goals', 'assists'], adaptation: ['settle', 'integrate'], fitness: ['managed', 'full'], captain: ['calm', 'rally'], loan: ['buy'] };
  return Object.entries(value).every(([id, choice]) => typeof choice === 'string' && IDS.includes(id as ProgrammeId) && (id === 'position' ? GROUPS.some(group => group.includes(choice)) : known[id as ProgrammeId]?.includes(choice)));
}

export function nextProgrammeYear(career: CareerState): number | null {
  const year = career.seasons[career.seasons.length - 1]?.year;
  return count(year) && year < Number.MAX_SAFE_INTEGER ? year + 1 : null;
}
function stateOf(career: CareerState): SoccerProgrammeState | null {
  const state = career.programme;
  if (state?.version !== 1 || !Array.isArray(state.receipts)) return null;
  if (!state.receipts.every(row => row && count(row.year) && text(row.club) && validChoices(row.choices) && row.outcomes && typeof row.outcomes === 'object' && !Array.isArray(row.outcomes) && Object.entries(row.outcomes).every(([id, value]) => IDS.includes(id as ProgrammeId) && typeof value === 'string') && ['completed', 'interrupted'].includes(row.status) && count(row.bonusEuros) && count(row.penaltyGoals) && count(row.freeKickGoals) && (row.secondaryPosition === null || text(row.secondaryPosition)) && (row.promise === null || ['met', 'broken', 'excused'].includes(row.promise)))) return null;
  if (state.negotiated !== undefined && (!Array.isArray(state.negotiated) || !state.negotiated.every(row => row && count(row.year) && text(row.club) && ['wage', 'shorter'].includes(row.mode) && typeof row.accepted === 'boolean'))) return null;
  if (state.plan && (!count(state.plan.year) || !text(state.plan.club) || !validChoices(state.plan.choices))) return null;
  if (state.secondaryTraining && (!text(state.secondaryTraining.club) || !text(state.secondaryTraining.from) || !text(state.secondaryTraining.target) || !count(state.secondaryTraining.year) || !count(state.secondaryTraining.seasons))) return null;
  if (state.secondaryPosition && (!text(state.secondaryPosition.club) || !text(state.secondaryPosition.primary) || !text(state.secondaryPosition.position))) return null;
  if (state.loanBuy && (!count(state.loanBuy.year) || !text(state.loanBuy.club) || !text(state.loanBuy.parent) || typeof state.loanBuy.ready !== 'boolean')) return null;
  return state;
}
function planOf(career: CareerState) {
  const plan = stateOf(career)?.plan;
  return plan && plan.year === nextProgrammeYear(career) && plan.club === career.currentClub && plan.choices && typeof plan.choices === 'object' ? plan : null;
}
function detach(career: CareerState, state: SoccerProgrammeState): SoccerProgrammeState {
  const copy: SoccerProgrammeState = {
    ...state,
    receipts: state.receipts.map(row => ({ ...row, choices: { ...row.choices }, outcomes: { ...row.outcomes } })),
    ...(state.plan ? { plan: { ...state.plan, choices: { ...state.plan.choices } } } : {}),
    ...(state.secondaryTraining ? { secondaryTraining: { ...state.secondaryTraining } } : {}),
    ...(state.secondaryPosition ? { secondaryPosition: { ...state.secondaryPosition } } : {}),
    ...(state.negotiated ? { negotiated: state.negotiated.map(row => ({ ...row })) } : {}),
    ...(state.loanBuy ? { loanBuy: { ...state.loanBuy } } : {}),
  };
  career.programme = copy;
  return copy;
}
function latestSenior(career: CareerState) {
  return [...career.seasons].reverse().find(row => row.type === 'playing');
}
function compatible(primary: string, target: string): boolean {
  return target !== primary && GROUPS.some(group => group.includes(primary) && group.includes(target));
}
function actualOffer(career: CareerState): { offer: ContractOffer; replace: (state: CareerState, offer: ContractOffer) => void } | null {
  const situation = career.transferSituation;
  if (situation && ['one_offer', 'dream_club', 'request_result'].includes(situation.type) && 'offer' in situation && situation.offer) {
    return { offer: situation.offer, replace: (state, offer) => { state.transferSituation = { ...situation, offer }; } };
  }
  if (situation?.type === 'bidding_war') return { offer: situation.offerA, replace: (state, offer) => { state.transferSituation = { ...situation, offerA: offer }; } };
  if ((situation?.type === 'contract_expiry' || situation?.type === 'frozen_out') && situation.offers.length) {
    return { offer: situation.offers[0], replace: (state, offer) => { state.transferSituation = { ...situation, offers: [offer, ...situation.offers.slice(1)] }; } };
  }
  if (career.phase === 'contract_offer' && career.pendingOffers.length) return { offer: career.pendingOffers[0], replace: (state, offer) => { state.pendingOffers = [offer, ...career.pendingOffers.slice(1)]; } };
  return null;
}
function validOffer(offer: ContractOffer): boolean {
  return text(offer.club?.name) && finite(offer.wage) && offer.wage > 0 && count(offer.contractYears) && offer.contractYears >= 1 && !offer.isLoan;
}
function allowed(career: CareerState, id: ProgrammeId, choice: string): string | null {
  const year = nextProgrammeYear(career);
  if (career.programme !== undefined && !stateOf(career)) return 'The saved programme is invalid. No new choice was applied.';
  if (career.retired || !text(career.currentClub) || year === null) return 'A saved active club season is needed.';
  if (!IDS.includes(id)) return 'That programme is unavailable.';
  if (id === 'negotiation') {
    if (!['transfer_window', 'contract_offer'].includes(career.phase)) return 'Open the contract window first.';
    const found = actualOffer(career);
    if (!found || !validOffer(found.offer)) return 'A permanent contract offer is needed.';
    if (stateOf(career)?.negotiated?.some(row => row.year === year && row.club === found.offer.club.name)) return 'This club has already received your counteroffer this year.';
    if (choice === 'shorter' && found.offer.contractYears < 2) return 'This offer already lasts one year.';
    return ['wage', 'shorter'].includes(choice) ? null : 'Choose a listed contract proposal.';
  }
  if (career.phase !== 'playing') return 'Plan this before the next club season.';
  const choices: Partial<Record<ProgrammeId, string[]>> = {
    tactics: ['finisher', 'creator', 'cover'], set_pieces: ['penalties', 'free_kicks'], promise: ['rotation', 'starter'],
    bonuses: ['appearances', 'goals', 'assists'], adaptation: ['settle', 'integrate'], fitness: ['managed', 'full'], captain: ['calm', 'rally'], loan: ['buy'],
  };
  if (id === 'position') return compatible(career.position, choice) ? null : 'Choose another position in your current position group.';
  if (!choices[id]?.includes(choice)) return 'Choose a listed programme.';
  if (career.position === 'GK' && (id === 'set_pieces' || (id === 'tactics' && choice !== 'cover') || (id === 'bonuses' && choice !== 'appearances'))) return 'This duty is for an outfield player.';
  if (id === 'bonuses' && (!finite(career.weeklyWage) || career.weeklyWage <= 0)) return 'A paid club contract is needed.';
  if (id === 'adaptation' && (!latestSenior(career) || latestSenior(career)?.club === career.currentClub)) return 'This is for your first season after changing clubs.';
  if (id === 'fitness' && !career.seriousInjuries?.some(row => count(row.year) && row.year === year - 1)) return 'A serious injury in the last saved year is needed.';
  if (id === 'captain' && (!career.isClubCaptain || career.captainClub !== career.currentClub)) return 'You need the current club armband.';
  if (id === 'loan' && (!career.loan || !text(career.loan.parentClub) || career.loan.parentClub === career.currentClub)) return 'You need an active loan at another club.';
  return null;
}

/** Reading a plan never creates one and never draws from the season engine. */
export function programmeEffects(career: CareerState): ProgrammeEffects {
  const effects: ProgrammeEffects = { appsMult: 1, injuryDelta: 0, goalMult: 1, assistMult: 1, cleanSheetMult: 1, redCardMult: 1, yellowCardMult: 1 };
  if (career.retired) return effects;
  const state = stateOf(career);
  const secondary = state?.secondaryPosition;
  if (secondary?.club === career.currentClub && secondary.primary === career.position && compatible(career.position, secondary.position)) effects.appsMult *= 1.03;
  const plan = planOf(career);
  if (!plan) return effects;
  const pick = plan.choices;
  if (pick.tactics === 'finisher' && career.position !== 'GK') { effects.goalMult *= 1.12; effects.assistMult *= 0.90; }
  if (pick.tactics === 'creator' && career.position !== 'GK') { effects.assistMult *= 1.12; effects.goalMult *= 0.90; }
  if (pick.tactics === 'cover') { effects.cleanSheetMult *= 1.08; effects.goalMult *= 0.90; }
  if (pick.position && compatible(career.position, pick.position)) { effects.appsMult *= 0.97; effects.goalMult *= 0.97; }
  if (career.position !== 'GK' && ['penalties', 'free_kicks'].includes(pick.set_pieces ?? '')) effects.goalMult *= 1.04;
  if (pick.promise === 'rotation') effects.appsMult *= 1.04;
  if (pick.promise === 'starter') effects.appsMult *= 1.08;
  if (pick.adaptation === 'settle' && latestSenior(career) && latestSenior(career)?.club !== career.currentClub) effects.appsMult *= 0.95;
  if (pick.adaptation === 'integrate' && latestSenior(career) && latestSenior(career)?.club !== career.currentClub) { effects.appsMult *= 1.04; effects.injuryDelta += 0.01; }
  const recentInjury = career.seriousInjuries?.some(row => row.year === plan.year - 1);
  if (pick.fitness === 'managed' && recentInjury) { effects.appsMult *= 0.90; effects.injuryDelta -= 0.03; }
  if (pick.fitness === 'full' && recentInjury) { effects.appsMult *= 1.04; effects.injuryDelta += 0.03; }
  if (career.isClubCaptain && career.captainClub === career.currentClub) {
    if (pick.captain === 'calm') { effects.yellowCardMult *= 0.80; effects.redCardMult *= 0.80; effects.appsMult *= 0.98; }
    if (pick.captain === 'rally') { effects.appsMult *= 1.04; effects.yellowCardMult *= 1.10; }
  }
  effects.appsMult = clamp(effects.appsMult, 0.80, 1.15);
  effects.goalMult = clamp(effects.goalMult, 0.80, 1.18);
  effects.assistMult = clamp(effects.assistMult, 0.80, 1.18);
  return effects;
}

export function chooseProgramme(prev: CareerState, id: ProgrammeId, choice: string): CareerState {
  if (allowed(prev, id, choice)) return prev;
  const year = nextProgrammeYear(prev)!;
  const current = stateOf(prev);
  const programme: SoccerProgrammeState = current ? { ...current, receipts: [...current.receipts] } : { version: 1, receipts: [] };
  const state = { ...prev, programme };
  if (id === 'negotiation') {
    const found = actualOffer(prev)!;
    const rating = latestSenior(prev)?.rating;
    const accepted = choice === 'shorter' || (finite(rating) && rating >= 7.5 && rating <= 10) || (finite(prev.overall) && prev.overall >= 85 && prev.overall <= 99);
    if (accepted) {
      const offer = { ...found.offer, wage: Math.round(found.offer.wage * (choice === 'wage' ? 1.10 : 0.95)), contractYears: found.offer.contractYears - (choice === 'shorter' ? 1 : 0) };
      found.replace(state, offer);
    }
    programme.negotiated = [...(current?.negotiated ?? []), { year, club: found.offer.club.name, mode: choice, accepted }];
    return state;
  }
  const old = planOf(prev);
  if (old?.choices[id] === choice) return prev;
  programme.plan = { year, club: prev.currentClub, choices: { ...old?.choices, [id]: choice }, ...(old?.bonusEuros !== undefined ? { bonusEuros: old.bonusEuros } : {}) };
  if (id === 'bonuses') programme.plan.bonusEuros = Math.round(prev.weeklyWage * 4);
  if (id === 'loan') programme.loanBuy = { year, club: prev.currentClub, parent: prev.loan!.parentClub, ready: false };
  return state;
}
export function cancelProgramme(prev: CareerState, id: ProgrammeId): CareerState {
  const old = planOf(prev);
  if (prev.phase !== 'playing' || !old || !old.choices[id]) return prev;
  const choices = { ...old.choices };
  delete choices[id];
  const programme = { ...stateOf(prev)!, plan: { ...old, choices } };
  if (id === 'bonuses') delete programme.plan.bonusEuros;
  if (id === 'loan') delete programme.loanBuy;
  return { ...prev, programme };
}

/** Called once before the next actual season; absent legacy state stays absent. */
export function prepareSoccerProgramme(career: CareerState): void {
  const existing = stateOf(career);
  if (!existing) return;
  const state = detach(career, existing);
  if (state.plan && !planOf(career)) delete state.plan;
  const year = nextProgrammeYear(career);
  if (state.secondaryTraining && (state.secondaryTraining.club !== career.currentClub || state.secondaryTraining.from !== career.position || state.secondaryTraining.year !== (year ?? 0) - 1)) delete state.secondaryTraining;
  if (state.secondaryPosition && (state.secondaryPosition.club !== career.currentClub || state.secondaryPosition.primary !== career.position)) delete state.secondaryPosition;
  if (state.loanBuy && (state.loanBuy.year !== year || state.loanBuy.club !== career.currentClub || state.loanBuy.parent !== career.loan?.parentClub)) delete state.loanBuy;
}

/** A zero-appearance year belongs to the held club plan, even when its row records a ban or prison. */
export function interruptSoccerProgramme(career: CareerState, season: SeasonRecord): void {
  const existing = stateOf(career);
  const plan = existing?.plan;
  if (!existing || !plan || career.retired || plan.club !== career.currentClub || plan.year !== season.year || season.type !== 'playing' || season.apps !== 0 || season.goals !== 0 || season.assists !== 0 || season.cleanSheets !== 0) return;
  if (season.club !== plan.club && !['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(season.club)) return;
  if (season.programme || existing.receipts.some(row => row.year === season.year && row.club === plan.club)) return;
  const state = detach(career, existing);
  const receipt: SoccerProgrammeReceipt = { year: season.year, club: plan.club, choices: { ...plan.choices }, status: 'interrupted', outcomes: {}, bonusEuros: 0, penaltyGoals: 0, freeKickGoals: 0, secondaryPosition: null, promise: null };
  for (const id of IDS) if (plan.choices[id]) receipt.outcomes[id] = 'The year was interrupted; no progress or bonus was earned.';
  if (plan.choices.promise) receipt.promise = 'excused';
  season.programme = receipt;
  state.receipts = [...state.receipts, receipt];
  delete state.plan;
  delete state.secondaryTraining;
  delete state.loanBuy;
}
/** The receipt describes the already recorded row; it does not create stats. */
export function settleSoccerProgramme(career: CareerState, season: SeasonRecord): void {
  const existing = stateOf(career);
  const plan = existing?.plan;
  if (!existing || !plan || career.retired || plan.year !== season.year || plan.club !== season.club || season.club !== career.currentClub || season.type !== 'playing') return;
  if (existing.receipts.some(row => row.year === season.year && row.club === season.club)) return;
  if (!count(season.apps) || !count(season.goals) || !count(season.assists)) return;
  const state = detach(career, existing);
  const played = season.apps > 0 && !season.injurySevere;
  const receipt: SoccerProgrammeReceipt = { year: season.year, club: season.club, choices: { ...plan.choices }, status: played ? 'completed' : 'interrupted', outcomes: {}, bonusEuros: 0, penaltyGoals: 0, freeKickGoals: 0, secondaryPosition: null, promise: null };
  const pick = plan.choices;
  for (const id of IDS) if (pick[id]) receipt.outcomes[id] = played ? `${season.apps} recorded club appearances.` : 'The year was interrupted; no progress or bonus was earned.';
  if (played && pick.position && compatible(career.position, pick.position)) {
    const old = state.secondaryTraining;
    const seasons = old && old.club === season.club && old.from === career.position && old.target === pick.position && old.year === season.year - 1 && count(old.seasons) ? old.seasons + 1 : 1;
    state.secondaryTraining = { club: season.club, from: career.position, target: pick.position, year: season.year, seasons };
    if (seasons >= 2) {
      state.secondaryPosition = { club: season.club, primary: career.position, position: pick.position };
      receipt.secondaryPosition = pick.position;
      receipt.outcomes.position = `${pick.position} learned after two played training seasons. Future selection gets 3% more planned appearances at this club.`;
    } else receipt.outcomes.position = `${pick.position} training: 1 of 2 played seasons completed.`;
  } else if (pick.position || !played) delete state.secondaryTraining;
  if (played && pick.set_pieces === 'penalties') receipt.penaltyGoals = Math.floor(season.goals * 0.20);
  if (played && pick.set_pieces === 'free_kicks') receipt.freeKickGoals = Math.floor(season.goals * 0.15);
  if (pick.set_pieces) receipt.outcomes.set_pieces = `${receipt.penaltyGoals} penalty goals and ${receipt.freeKickGoals} free kick goals, included in your ${season.goals} recorded goals. This is the simulation's season duty allocation.`;
  if (pick.promise === 'rotation' || pick.promise === 'starter') {
    const target = pick.promise === 'starter' ? 26 : 18;
    const excuse = !played || !!season.injury || (count(season.suspensionMatches) && season.suspensionMatches > 0) || !count(season.leagueApps);
    receipt.promise = count(season.leagueApps) && season.leagueApps >= target ? 'met' : excuse ? 'excused' : 'broken';
    receipt.outcomes.promise = receipt.promise === 'met' ? `The ${target}-appearance promise was met: ${season.leagueApps} league appearances.` : receipt.promise === 'broken' ? `The ${target}-appearance promise was missed: ${season.leagueApps} league appearances. You can request a move in the transfer window.` : 'Availability or missing league data prevented a fair promise verdict.';
    if (finite(career.morale)) career.morale = clamp(career.morale + (receipt.promise === 'met' ? 3 : receipt.promise === 'broken' ? -5 : 0), 0, 100);
  }
  const bonusMet = season.apps > 0 && (pick.bonuses === 'appearances' ? count(season.leagueApps) && season.leagueApps >= 24 : pick.bonuses === 'goals' ? season.goals >= 15 : pick.bonuses === 'assists' ? season.assists >= 10 : false);
  if (bonusMet && count(plan.bonusEuros) && finite(career.netWorth) && finite(career.totalEarnings)) {
    receipt.bonusEuros = plan.bonusEuros;
    career.netWorth += receipt.bonusEuros / 1_000_000;
    career.totalEarnings += receipt.bonusEuros / 1_000_000;
  }
  if (pick.bonuses) receipt.outcomes.bonuses = receipt.bonusEuros > 0 ? `Your recorded target earned EUR ${receipt.bonusEuros.toLocaleString('en-US')}. Paid once.` : 'The recorded target was not met; no bonus was paid.';
  if (played && pick.adaptation === 'settle' && finite(career.morale)) { career.morale = clamp(career.morale + 5, 0, 100); receipt.outcomes.adaptation = 'The settling programme finished. Morale rose by 5.'; }
  if (state.loanBuy && pick.loan === 'buy' && played && state.loanBuy.year === season.year && state.loanBuy.club === season.club && state.loanBuy.parent === career.loan?.parentClub) state.loanBuy.ready = true;
  else if (pick.loan) delete state.loanBuy;
  season.programme = receipt;
  state.receipts = [...state.receipts, receipt];
  delete state.plan;
}

/** The player's current contract wage is retained; no player-funded transfer fee. */
export function completeProgrammeLoanBuy(career: CareerState, club: ClubData): boolean {
  const existing = stateOf(career);
  const buy = existing?.loanBuy;
  const last = career.seasons[career.seasons.length - 1];
  if (!existing || !buy?.ready || !career.loan || buy.parent !== career.loan.parentClub || buy.club !== career.currentClub || club.name !== career.currentClub || last?.year !== buy.year || last.club !== buy.club || last.type !== 'playing' || !count(last.apps) || last.apps === 0 || last.injurySevere) return false;
  if (!text(club.country) || !text(club.league) || !text(club.color) || !count(club.tier) || club.tier < 1 || !finite(career.weeklyWage) || career.weeklyWage <= 0) return false;
  const state = detach(career, existing);
  career.loan = null;
  career.currentClubCountry = club.country;
  career.currentClubTier = club.tier;
  career.currentLeague = club.league;
  career.currentClubColor = club.color;
  career.contractYearsLeft = 2;
  delete state.loanBuy;
  const receipt = [...state.receipts].reverse().find(row => row.year === buy.year && row.club === buy.club);
  if (receipt) receipt.outcomes.loan = `The loan became a permanent two-year contract at ${club.name}, keeping EUR ${career.weeklyWage.toLocaleString('en-US')} a week.`;
  if (last.programme) last.programme.outcomes.loan = receipt?.outcomes.loan ?? 'The permanent contract was completed.';
  return true;
}
export function programmePromiseBroken(career: CareerState): boolean {
  const row = stateOf(career)?.receipts.slice(-1)[0];
  return !!row && row.club === career.currentClub && row.year === nextProgrammeYear(career)! - 1 && row.promise === 'broken';
}

const DEFINITIONS: { id: ProgrammeId; title: string; description: string; choices: [string, string, string, string][] }[] = [
  { id: 'tactics', title: 'Tactical role', description: 'Give your next season a football role with a real scoring tradeoff.', choices: [['finisher', 'Finisher', '12% more expected goals.', '10% fewer expected assists.'], ['creator', 'Creator', '12% more expected assists.', '10% fewer expected goals.'], ['cover', 'Defensive cover', '8% more expected clean sheets for a position that records them.', '10% fewer expected goals.']] },
  { id: 'position', title: 'Second position', description: 'Train a compatible second position over two consecutive played seasons at this club.', choices: [] },
  { id: 'set_pieces', title: 'Set piece duty', description: 'Own a season duty. Recorded duty goals are part of your existing total.', choices: [['penalties', 'Penalty duty', '4% more expected goals. 20% of actual goals are allocated to penalties, rounded down.', 'The duty does not add goals after simulation.'], ['free_kicks', 'Free kick duty', '4% more expected goals. 15% of actual goals are allocated to free kicks, rounded down.', 'The duty does not add goals after simulation.']] },
  { id: 'promise', title: 'Manager promise', description: 'Agree a league appearance target and hold the next recorded season to it.', choices: [['rotation', 'Regular rotation', '18 league appearances promised; 4% more planned appearances.', 'A fit shortfall costs 5 morale. Availability can excuse it.'], ['starter', 'Starting role', '26 league appearances promised; 8% more planned appearances.', 'A fit shortfall costs 5 morale. Availability can excuse it.']] },
  { id: 'negotiation', title: 'Contract counteroffer', description: 'Negotiate the first permanent offer shown in your contract window, once per club each year.', choices: [['wage', 'Ask for more pay', 'If accepted, the offered weekly wage rises 10%, with the same contract length.', 'The simulation accepts only with a last senior rating of at least 7.5 or overall of at least 85. A rejected ask uses your chance. Current pay changes only on signing.'], ['shorter', 'Shorter commitment', 'The offered contract loses one year.', 'The offered wage falls 5%. This pay-cut proposal is accepted; one-year offers cannot be shortened.']] },
  { id: 'bonuses', title: 'Performance bonus', description: 'Agree a bonus worth four current weekly wages, paid once on recorded results. An injury does not erase a target already earned.', choices: [['appearances', 'Appearance clause', 'Earn the quoted bonus with 24 recorded league appearances.', 'No target, no bonus.'], ['goals', 'Goal clause', 'Earn the quoted bonus with 15 recorded goals.', 'No target, no bonus.'], ['assists', 'Assist clause', 'Earn the quoted bonus with 10 recorded assists.', 'No target, no bonus.']] },
  { id: 'adaptation', title: 'New club adaptation', description: 'Choose how to handle your first season after a club change.', choices: [['settle', 'Settle in first', '5 morale after a played year.', '5% fewer planned appearances.'], ['integrate', 'Push for a place', '4% more planned appearances.', 'Injury chance rises by 1 percentage point.']] },
  { id: 'fitness', title: 'Return to fitness', description: 'Choose your next-season workload after a recorded serious injury.', choices: [['managed', 'Managed return', 'Injury chance falls by 3 percentage points.', '10% fewer planned appearances.'], ['full', 'Full workload', '4% more planned appearances.', 'Injury chance rises by 3 percentage points.']] },
  { id: 'captain', title: 'Captain duties', description: 'Turn the current club armband into a leadership approach.', choices: [['calm', 'Keep the team calm', '20% lower expected yellow and red card rates.', '2% fewer planned appearances.'], ['rally', 'Lead from the front', '4% more planned appearances.', '10% more expected yellow cards.']] },
  { id: 'loan', title: 'Loan option to stay', description: 'Arrange a permanent deal at your loan club after a played season.', choices: [['buy', 'Make the move permanent', 'A two-year deal at the same weekly wage replaces the normal loan return.', 'The parent-club return is cancelled. An interrupted year cannot complete the deal.']] },
];
export function programmeOptions(career: CareerState): ProgrammeView[] {
  const plan = planOf(career);
  const latest = stateOf(career)?.receipts.slice(-1)[0];
  const year = nextProgrammeYear(career);
  return DEFINITIONS.map(definition => {
    const choices = definition.id === 'position' ? (GROUPS.find(group => group.includes(career.position)) ?? []).filter(position => position !== career.position).map(position => [position, `Train ${position}`, 'After two consecutive played training seasons, future planned appearances rise 3% at this club.', 'During training, planned appearances and expected goals fall 3%. Primary position stays unchanged.'] as [string, string, string, string]) : definition.choices;
    const offeredClub = definition.id === 'negotiation' ? actualOffer(career)?.offer.club?.name : null;
    const negotiated = definition.id === 'negotiation' ? stateOf(career)?.negotiated?.slice().reverse().find(row => row.year === year && row.club === offeredClub) : null;
    const outcome = latest?.outcomes[definition.id];
    const negotiationOutcome = negotiated ? `${negotiated.year} offer at ${negotiated.club}: ${negotiated.accepted ? 'Counteroffer accepted. The displayed offer contains the new terms.' : 'Wage counteroffer rejected by the simulation rule. The original offer is unchanged.'}` : null;
    const context = `${year ?? 'Unknown year'} at ${offeredClub || career.currentClub || 'unknown club'}. Simulation choices; final injuries, bans and selection still apply.${definition.id === 'position' && !choices.length ? ' No compatible second position is available for this position.' : ''}`;
    return { id: definition.id, title: definition.title, description: definition.description, context, choices: choices.map(([id, label, effect, tradeoff]) => { const reason = allowed(career, definition.id, id); return { id, label, effect, tradeoff, eligible: !reason, ...(reason ? { reason } : {}) }; }), choice: plan?.choices[definition.id] ?? (negotiated?.mode ?? null), outcome: negotiationOutcome ?? (outcome && latest ? `${latest.year} at ${latest.club}: ${outcome}` : null), canCancel: career.phase === 'playing' && !!plan?.choices[definition.id] };
  });
}

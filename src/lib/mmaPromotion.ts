import { clamp, clampi, hashLabel, rngFrom } from '@/lib/careerEngine';

export type MmaDivision = 'light' | 'middle' | 'heavy';
export type MmaStyle = 'Striker' | 'Grappler' | 'Balanced';
export const DIVISIONS: { id: MmaDivision; label: string }[] = [
  { id: 'light', label: 'Light' }, { id: 'middle', label: 'Middle' }, { id: 'heavy', label: 'Heavy' },
];
export const MMA_VENUES = [
  { id: 'club', name: 'Club Hall', capacity: 1200, rent: 6000, needs: 0 },
  { id: 'arena', name: 'City Arena', capacity: 4500, rent: 24000, needs: 30 },
  { id: 'grand', name: 'Grand Arena', capacity: 10000, rent: 45000, needs: 60 },
];
export const MMA_PRICES = [25, 50, 80];
export const MMA_REST_COST = 2000;
export interface MmaFighter {
  id: string; name: string; division: MmaDivision; style: MmaStyle;
  striking: number; grappling: number; cardio: number; fanbase: number;
  wins: number; losses: number; rankingPoints: number; recoveryUntil: number;
  contract: number; purse: number; signingBonus: number;
}
export interface MmaBooking { aId: string; bId: string; title: boolean }
export interface MmaPlan { venueId: string; ticketPrice: number; bookings: MmaBooking[] }
export type MmaAction = { kind: 'sign'; fighterId: string } | { kind: 'rest' }
  | { kind: 'event'; plan: MmaPlan } | { kind: 'close' };
export interface MmaRound {
  round: number; strikesA: number; strikesB: number; takedownsA: number; takedownsB: number;
  controlA: number; controlB: number; submissionAttemptsA: number; submissionAttemptsB: number;
  pointsA: number; pointsB: number;
}
export interface MmaBoutResult extends MmaBooking {
  winnerId: string; loserId: string; division: MmaDivision; scheduledRounds: number;
  method: 'KO/TKO' | 'Submission' | 'Decision'; round: number; quality: number; rounds: MmaRound[];
}
export interface MmaEventResult {
  event: number; month: number; venueId: string; venueName: string; attendance: number; ticketPrice: number;
  gate: number; purses: number; rent: number; profit: number; repDelta: number;
  cashBefore: number; cashAfter: number; reputationBefore: number; reputationAfter: number;
  bouts: MmaBoutResult[];
}
export interface MmaPromotion {
  version: 1; name: string; seed: number; tick: number; month: number; event: number;
  cash: number; reputation: number; fighters: MmaFighter[];
  champions: Record<MmaDivision, string | null>; history: MmaEventResult[]; closed: boolean; actions: MmaAction[];
}

const FIRST = ['Dario', 'Emil', 'Tomas', 'Nico', 'Rafi', 'Ivo', 'Bruno', 'Luca', 'Ciro', 'Omar', 'Leon', 'Hugo',
  'Enzo', 'Arlo', 'Mateo', 'Zane', 'Remy', 'Felix', 'Milo', 'Jonas', 'Nolan', 'Soren', 'Ezra', 'Kian'];
const LAST = ['Vale', 'Mercer', 'Rowan', 'Voss', 'Calder', 'Solis', 'Arden', 'Vega', 'Marlow', 'Costa', 'Rook', 'Linden',
  'Navarro', 'Keene', 'Mora', 'Hale', 'Carver', 'Silva', 'Brenner', 'Duran', 'Fenn', 'Alder', 'Reed', 'Varela'];

function makeFighters(seed: number): MmaFighter[] {
  const rng = rngFrom(seed);
  return Array.from({ length: 24 }, (_, i) => {
    const style: MmaStyle = ['Striker', 'Grappler', 'Balanced'][i % 3] as MmaStyle;
    const striking = clampi(48 + rng() * 34 + (style === 'Striker' ? 12 : style === 'Grappler' ? -8 : 0), 30, 95);
    const grappling = clampi(48 + rng() * 34 + (style === 'Grappler' ? 12 : style === 'Striker' ? -8 : 0), 30, 95);
    const cardio = Math.round(55 + rng() * 35);
    const fanbase = Math.round(160 + rng() * 440);
    const wins = Math.floor(rng() * 8);
    const losses = Math.floor(rng() * 4);
    const purse = Math.round((800 + (striking + grappling + cardio) * 9 + fanbase * 2) / 100) * 100;
    return {
      id: `mma-${i + 1}`, name: `${FIRST[i]} ${LAST[(i + seed % 24) % 24]}`,
      division: DIVISIONS[Math.floor(i / 8)].id, style, striking, grappling, cardio, fanbase,
      wins, losses, rankingPoints: striking + grappling + cardio + wins * 8 - losses * 4,
      recoveryUntil: 1, contract: i % 8 < 4 ? 3 : 0, purse, signingBonus: purse * 2,
    };
  });
}

export function newMmaPromotion(name: string, seedLabel?: string): MmaPromotion {
  const cleanName = name.trim().slice(0, 40) || 'My Promotion';
  const seed = hashLabel(seedLabel ?? `mma|${cleanName}`);
  return {
    version: 1, name: cleanName, seed, tick: 0, month: 1, event: 1, cash: 120000, reputation: 10,
    fighters: makeFighters(seed), champions: { light: null, middle: null, heavy: null }, history: [], closed: false, actions: [],
  };
}

export function ratingOfMma(f: MmaFighter): number {
  return Math.round(f.striking * 0.4 + f.grappling * 0.4 + f.cardio * 0.2);
}

export function mmaRankings(state: MmaPromotion, division: MmaDivision): MmaFighter[] {
  return state.fighters.filter(f => f.division === division && f.contract > 0)
    .sort((a, b) => b.rankingPoints - a.rankingPoints || a.id.localeCompare(b.id));
}

export function legalMmaBout(state: MmaPromotion, bout: MmaBooking): string | null {
  if (state.closed) return 'This promotion has finished.';
  if (!bout || typeof bout.title !== 'boolean') return 'Choose a valid bout.';
  const a = state.fighters.find(f => f.id === bout.aId);
  const b = state.fighters.find(f => f.id === bout.bId);
  if (!a || !b || a.id === b.id) return 'Choose two different fighters.';
  if (a.division !== b.division) return 'Both fighters must be in the same division.';
  if (a.contract < 1 || b.contract < 1) return 'Both fighters need a contract.';
  if (a.recoveryUntil > state.month || b.recoveryUntil > state.month) return 'A fighter is still recovering.';
  if (bout.title) {
    const eligible = mmaRankings(state, a.division).slice(0, 4).map(f => f.id);
    if (!eligible.includes(a.id) || !eligible.includes(b.id)) return 'Title fights need two fighters from the top four.';
    const champion = state.champions[a.division];
    if (champion && champion !== a.id && champion !== b.id) return 'The champion must defend an occupied belt.';
  }
  return null;
}

export function isMmaPlan(value: unknown): value is MmaPlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as MmaPlan;
  return MMA_VENUES.some(v => v.id === p.venueId) && MMA_PRICES.includes(p.ticketPrice)
    && Array.isArray(p.bookings) && p.bookings.length <= 3 && p.bookings.every(b => b && typeof b === 'object'
      && typeof b.aId === 'string' && typeof b.bId === 'string' && typeof b.title === 'boolean');
}

export function projectMmaEvent(state: MmaPromotion, plan: MmaPlan) {
  if (!isMmaPlan(plan)) return null;
  const venue = MMA_VENUES.find(v => v.id === plan.venueId)!;
  const participants = plan.bookings.flatMap(b => [state.fighters.find(f => f.id === b.aId), state.fighters.find(f => f.id === b.bId)]);
  if (participants.some(f => !f)) return null;
  const purses = plan.bookings.reduce((sum, b, i) => sum + Math.round(
    (participants[i * 2]!.purse + participants[i * 2 + 1]!.purse) * (b.title ? 1.5 : 1)), 0);
  const demand = 300 + state.reputation * 45 + participants.reduce((sum, f) => sum + f!.fanbase * 0.7, 0)
    + plan.bookings.filter(b => b.title).length * 200;
  const attendance = plan.bookings.length ? clampi(demand * Math.pow(25 / plan.ticketPrice, 1.3), 0, venue.capacity) : 0;
  const gate = attendance * plan.ticketPrice;
  return { venue, attendance, gate, purses, rent: venue.rent, guarantees: purses + venue.rent, profit: gate - purses - venue.rent };
}

export function validateMmaPlan(state: MmaPromotion, plan: MmaPlan): string | null {
  if (state.closed) return 'This promotion has finished.';
  if (state.actions.length >= 499) return 'This promotion is ready to finish. End it to see your legacy.';
  if (!isMmaPlan(plan)) return 'Choose a valid venue, ticket price and card.';
  if (plan.bookings.length < 1) return 'Book at least one bout.';
  const used = new Set<string>();
  const titleDivisions = new Set<MmaDivision>();
  for (const bout of plan.bookings) {
    const reason = legalMmaBout(state, bout);
    if (reason) return reason;
    if (used.has(bout.aId) || used.has(bout.bId)) return 'A fighter can only appear once on a card.';
    used.add(bout.aId); used.add(bout.bId);
    const division = state.fighters.find(f => f.id === bout.aId)!.division;
    if (bout.title && titleDivisions.has(division)) return 'Book only one title fight per division.';
    if (bout.title) titleDivisions.add(division);
  }
  const projection = projectMmaEvent(state, plan)!;
  if (state.reputation < projection.venue.needs) return `This venue needs ${projection.venue.needs} reputation.`;
  if (projection.guarantees > state.cash) return 'You need enough cash to cover the rent and guaranteed purses.';
  return null;
}

function simulateBout(a: MmaFighter, b: MmaFighter, booking: MmaBooking, rng: () => number): MmaBoutResult {
  const scheduledRounds = booking.title ? 5 : 3;
  const rounds: MmaRound[] = [];
  let winnerId = ''; let method: MmaBoutResult['method'] = 'Decision';
  let damageA = 0; let damageB = 0;
  for (let round = 1; round <= scheduledRounds; round += 1) {
    const row: MmaRound = { round, strikesA: 0, strikesB: 0, takedownsA: 0, takedownsB: 0,
      controlA: 0, controlB: 0, submissionAttemptsA: 0, submissionAttemptsB: 0, pointsA: 0, pointsB: 0 };
    for (let exchange = 0; exchange < 10; exchange += 1) {
      const attackerA = rng() < 0.5;
      const attacker = attackerA ? a : b; const defender = attackerA ? b : a;
      const fatigue = (round - 1) * (100 - attacker.cardio) * 0.17;
      const defenderFatigue = (round - 1) * (100 - defender.cardio) * 0.17;
      const grapple = rng() < clamp(0.45 + (attacker.grappling - attacker.striking) / 90, 0.12, 0.85);
      if (grapple) {
        const takedown = rng() < clamp(0.48 + (attacker.grappling - defender.grappling - fatigue + defenderFatigue) / 130, 0.08, 0.9);
        if (takedown) {
          if (attackerA) { row.takedownsA += 1; row.controlA += 20; row.submissionAttemptsA += 1; }
          else { row.takedownsB += 1; row.controlB += 20; row.submissionAttemptsB += 1; }
          if (rng() < clamp(0.055 + (attacker.grappling - defender.grappling) / 500 + defenderFatigue / 700, 0.01, 0.2)) {
            winnerId = attacker.id; method = 'Submission';
          }
        }
      } else {
        const landed = rng() < clamp(0.55 + (attacker.striking - defender.striking - fatigue + defenderFatigue) / 150, 0.12, 0.9);
        if (landed) {
          const strikes = 2 + Math.floor(rng() * 4);
          if (attackerA) { row.strikesA += strikes; damageB += strikes; }
          else { row.strikesB += strikes; damageA += strikes; }
          const damage = attackerA ? damageB : damageA;
          if (rng() < clamp(0.025 + damage / 700 + (attacker.striking - defender.striking) / 650, 0.005, 0.19)) {
            winnerId = attacker.id; method = 'KO/TKO';
          }
        }
      }
      if (winnerId) break;
    }
    const edge = row.strikesA - row.strikesB + (row.takedownsA - row.takedownsB) * 2 + (row.controlA - row.controlB) / 20;
    const aRound = edge === 0 ? rng() < 0.5 : edge > 0;
    row.pointsA = aRound ? 10 : 9; row.pointsB = aRound ? 9 : 10;
    rounds.push(row);
    if (winnerId) break;
  }
  if (!winnerId) winnerId = rounds.reduce((n, r) => n + r.pointsA - r.pointsB, 0) > 0 ? a.id : b.id;
  const action = rounds.reduce((n, r) => n + r.strikesA + r.strikesB + (r.takedownsA + r.takedownsB) * 3, 0) / rounds.length;
  const quality = clampi(76 - Math.abs(ratingOfMma(a) - ratingOfMma(b)) * 1.4 + action * 0.8 + (booking.title ? 4 : 0), 0, 100);
  return { ...booking, winnerId, loserId: winnerId === a.id ? b.id : a.id, division: a.division,
    scheduledRounds, method, round: rounds.length, quality, rounds };
}

export function signMmaFighter(state: MmaPromotion, id: string): MmaPromotion | null {
  const fighter = state.fighters.find(f => f.id === id);
  if (state.closed || state.actions.length >= 499 || !fighter || fighter.contract > 1 || state.cash < fighter.signingBonus) return null;
  return { ...state, cash: state.cash - fighter.signingBonus, actions: [...state.actions, { kind: 'sign', fighterId: id }],
    fighters: state.fighters.map(f => f.id === id ? { ...f, contract: 3 } : f) };
}

export function runMmaEvent(state: MmaPromotion, plan: MmaPlan): { state: MmaPromotion; result: MmaEventResult } | null {
  if (validateMmaPlan(state, plan)) return null;
  const savedPlan: MmaPlan = { venueId: plan.venueId, ticketPrice: plan.ticketPrice,
    bookings: plan.bookings.map(b => ({ aId: b.aId, bId: b.bId, title: b.title })) };
  const projection = projectMmaEvent(state, plan)!;
  const rng = rngFrom(state.seed + state.tick * 7919);
  const bouts = savedPlan.bookings.map(b => simulateBout(state.fighters.find(f => f.id === b.aId)!, state.fighters.find(f => f.id === b.bId)!, b, rng));
  const fighters = state.fighters.map(f => {
    const bout = bouts.find(b => b.aId === f.id || b.bId === f.id);
    if (!bout) return { ...f };
    const won = bout.winnerId === f.id;
    return { ...f, wins: f.wins + (won ? 1 : 0), losses: f.losses + (won ? 0 : 1),
      rankingPoints: Math.max(0, f.rankingPoints + (won ? 24 : -12)), contract: f.contract - 1,
      recoveryUntil: state.month + (won || bout.method === 'Decision' ? 2 : 3) };
  });
  const champions = { ...state.champions };
  bouts.forEach(b => { if (b.title) champions[b.division] = b.winnerId; });
  DIVISIONS.forEach(d => {
    if (champions[d.id] && !fighters.some(f => f.id === champions[d.id] && f.contract > 0)) champions[d.id] = null;
  });
  const averageQuality = bouts.reduce((n, b) => n + b.quality, 0) / bouts.length;
  const reputation = clampi(state.reputation + Math.round((averageQuality - 55) / 6) + (projection.profit >= 0 ? 1 : -2), 0, 100);
  const result: MmaEventResult = {
    event: state.event, month: state.month, venueId: projection.venue.id, venueName: projection.venue.name,
    attendance: projection.attendance, ticketPrice: plan.ticketPrice, gate: projection.gate, purses: projection.purses,
    rent: projection.rent, profit: projection.profit, repDelta: reputation - state.reputation,
    cashBefore: state.cash, cashAfter: state.cash + projection.profit, reputationBefore: state.reputation, reputationAfter: reputation, bouts,
  };
  return { state: { ...state, fighters, champions, reputation, cash: result.cashAfter, month: state.month + 1,
    event: state.event + 1, tick: state.tick + 1, history: [...state.history, result], closed: state.event === 12,
    actions: [...state.actions, { kind: 'event', plan: savedPlan }] }, result };
}

export function advanceMmaMonth(state: MmaPromotion): MmaPromotion {
  if (state.closed || state.actions.length >= 499 || state.cash < MMA_REST_COST) return state;
  return { ...state, month: state.month + 1, cash: state.cash - MMA_REST_COST, actions: [...state.actions, { kind: 'rest' }] };
}

export function closeMmaPromotion(state: MmaPromotion): MmaPromotion | null {
  if (state.closed || state.actions.length >= 500 || (state.history.length === 0 && state.cash >= 6000)) return null;
  return { ...state, closed: true, actions: [...state.actions, { kind: 'close' }] };
}

export function mmaPromotionScore(state: MmaPromotion): number {
  const profitable = state.history.filter(r => r.profit > 0).length;
  const belts = DIVISIONS.filter(d => state.champions[d.id] && state.fighters.some(f => f.id === state.champions[d.id] && f.contract > 0)).length;
  return clampi(state.reputation * 0.5 + profitable / 12 * 30 + belts / 3 * 20, 0, 100);
}

function integer(value: unknown, lo: number, hi: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= lo && value <= hi;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function same(value: unknown, expected: unknown): boolean {
  if (value === expected) return true;
  if (!value || !expected || typeof value !== 'object' || typeof expected !== 'object'
    || Array.isArray(value) !== Array.isArray(expected)) return false;
  const keys = Object.keys(expected);
  return Object.keys(value).length === keys.length && keys.every(k => same(value[k], expected[k]));
}

export function loadMmaPromotion(value: unknown): MmaPromotion | null {
  if (!object(value) || value.version !== 1 || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 40
    || !integer(value.seed, 0, 4294967295) || !Array.isArray(value.actions) || value.actions.length > 500) return null;
  let state = { ...newMmaPromotion(value.name), seed: value.seed, fighters: makeFighters(value.seed) };
  for (const action of value.actions) {
    if (!object(action)) return null;
    let next: MmaPromotion | null;
    switch (action.kind) {
      case 'sign':
        if (typeof action.fighterId !== 'string') return null;
        next = signMmaFighter(state, action.fighterId);
        break;
      case 'rest':
        next = advanceMmaMonth(state);
        break;
      case 'event':
        if (!isMmaPlan(action.plan)) return null;
        next = runMmaEvent(state, action.plan)?.state ?? null;
        break;
      case 'close':
        next = closeMmaPromotion(state);
        break;
      default:
        return null;
    }
    if (!next || next === state) return null;
    state = next;
  }
  return same(value, state) ? state : null;
}

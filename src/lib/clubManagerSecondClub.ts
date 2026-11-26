import type { CareerState } from './clubManager';
import { keyedRng } from './keyedRng';
import { roundRobinRounds, standingsOf, type StandingRow } from './season/core';

export const SECOND_CLUB_PRICE = 90;
export const SECOND_CLUB_RESERVE = 12;
export const SECOND_CLUB_SQUAD_COST = 4;
export const SECOND_CLUB_FACILITIES = 12;
export const CIRCUIT_FINANCES = { operatingIncome: 5, runningCosts: 4, placeBonus: 0.5 };
export const SENIOR_CIRCUIT = ['Foundry Vale', 'Glassbank', 'Wrenford Town', 'Bramble Quay', 'Moorhaven Works', 'Harbour Fold', 'Cinderhill', 'Beacon Fen'];
export const CIRCUIT_DATES = 2 * (SENIOR_CIRCUIT.length - 1);
export type SeniorPlan = 'squad' | 'reserve';
interface SeasonOrder { season: number; plan: SeniorPlan; spend: number }
interface SeniorResult extends SeasonOrder {
  table: StandingRow[];
  opening: number;
  income: number;
  runningCosts: number;
  closing: number;
}
export interface SeniorClub {
  parent: string;
  bought: number;
  price: number;
  seed: string;
  balance: number;
  order?: SeasonOrder;
  appointment?: { season: number; leagueDates: number; circuitDates: number };
  history: SeniorResult[];
}

const amount = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const validOrder = (o: SeasonOrder | undefined): boolean => !!o && Number.isInteger(o.season) &&
  (o.plan === 'squad' || o.plan === 'reserve') && amount(o.spend);

export function seniorClubOf(c: CareerState): SeniorClub | null {
  const club = c.seniorClub;
  if (!club || typeof club.parent !== 'string' || !club.parent || !Number.isInteger(club.bought) ||
    !amount(club.price) || !amount(club.balance) || typeof club.seed !== 'string' ||
    (club.appointment !== undefined && (!club.appointment || !Number.isInteger(club.appointment.season) ||
      !Number.isInteger(club.appointment.leagueDates) || club.appointment.leagueDates < 0 ||
      !Number.isInteger(club.appointment.circuitDates) || club.appointment.circuitDates < 0 || club.appointment.circuitDates > CIRCUIT_DATES)) ||
    (club.order !== undefined && !validOrder(club.order)) || !Array.isArray(club.history) ||
    !club.history.every(r => validOrder(r) && [r.opening, r.income, r.runningCosts, r.closing].every(amount) &&
      Array.isArray(r.table) && r.table.length === SENIOR_CIRCUIT.length &&
      r.table.every(t => t && Number.isInteger(t.slot) && t.slot >= 0 && t.slot < SENIOR_CIRCUIT.length &&
        [t.w, t.d, t.l, t.pts, t.gf, t.ga].every(amount)) && new Set(r.table.map(t => t.slot)).size === SENIOR_CIRCUIT.length)) return null;
  return club;
}

export function seniorPreseason(c: CareerState): boolean {
  return !c.live && !c.pendingSummary && !c.retired && !c.sacked && !c.wilderness && c.week === 0;
}

export function buySeniorClub(c: CareerState, parent: string, season: number): CareerState | null {
  if (c.clubName !== parent || c.season !== season || c.seniorClub !== undefined || !seniorPreseason(c) ||
    (c.academy?.facilities ?? 0) < SECOND_CLUB_FACILITIES || !amount(c.budget) || c.budget < SECOND_CLUB_PRICE) return null;
  return { ...c, budget: Math.round((c.budget - SECOND_CLUB_PRICE) * 100) / 100,
    seniorClub: { parent, bought: season, price: SECOND_CLUB_PRICE, balance: SECOND_CLUB_RESERVE,
      seed: [parent, c.eraId ?? 'now', c.worldSeed ?? 'legacy', season].join('|'), history: [] } };
}

export function chooseSeniorPlan(c: CareerState, parent: string, season: number, plan: SeniorPlan): CareerState | null {
  const club = seniorClubOf(c);
  const spend = plan === 'squad' ? SECOND_CLUB_SQUAD_COST : 0;
  if (!club || c.clubName !== parent || club.parent !== parent || c.season !== season || !seniorPreseason(c) ||
    (plan !== 'reserve' && plan !== 'squad') || club.order?.season === season ||
    club.history.some(r => r.season === season) || club.balance < spend) return null;
  return { ...c, seniorClub: { ...club, balance: club.balance - spend, order: { season, plan, spend } } };
}

export function seniorClubSpend(c: CareerState): number {
  const club = seniorClubOf(c);
  return club?.parent === c.clubName && club.bought === c.season ? club.price : 0;
}

export function seniorMatchdays(c: CareerState): number {
  const total = c.calendar.filter(f => f.type === 'league').length;
  const played = c.calendar.slice(0, c.week).filter(f => f.type === 'league').length;
  const anchor = c.seniorClub?.appointment;
  const start = anchor?.season === c.season ? anchor : { leagueDates: 0, circuitDates: 0 };
  const remaining = total - start.leagueDates;
  return remaining > 0 ? start.circuitDates + Math.floor((CIRCUIT_DATES - start.circuitDates) *
    Math.max(0, played - start.leagueDates) / remaining) : start.circuitDates;
}

export function carrySeniorClub(from: CareerState, joined: CareerState): void {
  const club = seniorClubOf(from);
  if (!club) {
    if (from.seniorClub !== undefined) joined.seniorClub = from.seniorClub;
    return;
  }
  joined.seniorClub = { ...club, appointment: { season: joined.season, circuitDates: seniorMatchdays(from),
    leagueDates: joined.calendar.slice(0, joined.week).filter(f => f.type === 'league').length } };
}

export function seniorStandings(club: SeniorClub, season: number, dates: number): StandingRow[] {
  const calendar = roundRobinRounds(SENIOR_CIRCUIT.length);
  const rng = keyedRng(club.seed + '|' + season);
  const funded = club.order?.season === season && club.order.plan === 'squad';
  function goals(team: number, opponent: number, home: boolean) {
    const chance = (home ? 0.34 : 0.29) + (funded && team === 0 ? 0.10 : 0) - (funded && opponent === 0 ? 0.04 : 0);
    let score = 0;
    for (let attempt = 0; attempt < 4; attempt++) if (rng() < chance) score++;
    return score;
  }
  const rounds = calendar.slice(0, dates).map(round => round.map(([h, a]): [number, number, number, number] =>
    [h, a, goals(h, a, true), goals(a, h, false)]));
  return standingsOf(rounds, SENIOR_CIRCUIT.length, { win: 3, draw: 1, loss: 0 }, dates);
}

/** Close the second club's own accounts on the engine's copy of the completed season. */
export function closeSeniorSeason(c: CareerState): void {
  const club = seniorClubOf(c);
  if (!club || club.bought > c.season || club.history.some(r => r.season === c.season)) return;
  const table = seniorStandings(club, c.season, CIRCUIT_DATES);
  const place = table.findIndex(t => t.slot === 0) + 1;
  const order = club.order?.season === c.season ? club.order : { season: c.season, plan: 'reserve' as const, spend: 0 };
  const { operatingIncome, runningCosts, placeBonus } = CIRCUIT_FINANCES;
  const income = operatingIncome + (SENIOR_CIRCUIT.length - place) * placeBonus;
  const closing = club.balance + income - runningCosts;
  const result = { ...order, opening: club.balance + order.spend, income, runningCosts, closing, table };
  c.seniorClub = { ...club, balance: closing, history: [...club.history, result] };
}

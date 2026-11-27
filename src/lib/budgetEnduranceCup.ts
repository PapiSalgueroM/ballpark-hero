import { squadRating } from '@/lib/dartDraft';
import { keyedRng } from '@/lib/keyedRng';
import { goalLambda, poissonDraw } from '@/lib/season/law';
import { FORMATIONS, playerRating, type Formation } from '@/lib/squadShape';
import type { Player } from '@/types/game';

export const CUP_KEY = 'dukb-budget-endurance-cup-v1';
export const cupFixtures = [
  { label: 'Stop the counter', fatigue: 16, detail: 'A lost duel gives the opposition a late goal.' },
  { label: 'Win the second ball', fatigue: 18, detail: 'The side that wins the loose ball scores.' },
  { label: 'Finish the late chance', fatigue: 20, detail: 'Win the duel to add a goal for your XI.' },
];

type Entry = { name: string; position: Player['position']; fee: number; rating: number };
export interface BudgetCup {
  version: 1; era: string; formation: string; budget: number;
  xi: Entry[]; money: Entry[]; strength: number; moneyStrength: number;
  entryResult?: { score: number; legs: [number, number][] | null };
  previousRun?: { legs: [number, number][]; cash: number };
  offers: Entry[]; bench: string[]; played: (string | null)[];
}

export function cupSlots(formation: Formation) {
  return [/^CB$/, /^(CM|CDM)$/, /^ST$/].map(role => formation.slots.findIndex(s => role.test(s.label)));
}

const entry = (p: Player): Entry => ({ name: p.name, position: p.position, fee: p.marketValue, rating: playerRating(p) });

export function startBudgetCup(formation: Formation, era: string, budget: number, xi: Player[], money: (Player | null)[], pool: Player[], entryResult?: BudgetCup['entryResult']): BudgetCup | null {
  if (xi.length !== 11 || money.length !== 11 || money.some(p => !p)) return null;
  const signed = new Set(xi.map(p => p.name));
  const left = budget - xi.reduce((total, p) => total + p.marketValue, 0);
  const offers = new Map<string, Entry>();
  for (const index of cupSlots(formation)) {
    const eligible = pool.filter(p => !signed.has(p.name) && p.marketValue <= left && formation.slots[index].allowed.includes(p.position));
    const byFee = [...eligible].sort((a, b) => a.marketValue - b.marketValue);
    const byRating = [...eligible].sort((a, b) => playerRating(b) - playerRating(a) || a.marketValue - b.marketValue);
    const mid = Math.floor(byFee.length / 2);
    for (const p of [...byFee.slice(0, 3), ...byFee.slice(mid, mid + 2), ...byRating.slice(0, 3)]) offers.set(p.name, entry(p));
  }
  return {
    version: 1, era, formation: formation.name, budget, entryResult, xi: xi.map(entry), money: (money as Player[]).map(entry),
    strength: squadRating(xi), moneyStrength: squadRating(money), offers: [...offers.values()], bench: [], played: []
  };
}

export function cupCash(cup: BudgetCup) {
  return cup.budget - cup.xi.reduce((sum, p) => sum + p.fee, 0)
    - cup.offers.filter(p => cup.bench.includes(p.name)).reduce((sum, p) => sum + p.fee, 0);
}

export function signCover(cup: BudgetCup, name: string) {
  if (cup.played.length) return cup;
  if (cup.bench.includes(name)) return { ...cup, bench: cup.bench.filter(n => n !== name) };
  const offer = cup.offers.find(p => p.name === name);
  return offer && cup.bench.length < 2 && offer.fee <= cupCash(cup) ? { ...cup, bench: [...cup.bench, name] } : cup;
}

export function cupWeek(cup: BudgetCup, week: number, reserve: string | null) {
  const formation = FORMATIONS.find(f => f.name === cup.formation)!;
  const slots = cupSlots(formation), slot = formation.slots[slots[week]];
  const tired = cup.xi[slots[week]], opponent = cup.money[slots[2 - week]];
  const cover = reserve === null ? tired : cup.offers.find(p => p.name === reserve);
  if (!cover || (reserve !== null && (!cup.bench.includes(reserve) || cup.played.slice(0, week).includes(reserve) || !slot.allowed.includes(cover.position)))) return null;
  const rating = cover.rating - (reserve === null ? cupFixtures[week].fatigue : 0);
  const chance = Math.min(90, Math.max(10, 50 + 2 * (rating - opponent.rating)));
  const key = ['budget-cup-v1', cup.era, cup.formation, ...cup.xi.map(p => p.name), week].join('|');
  const edge = cup.strength - cup.moneyStrength;
  let goals = poissonDraw(goalLambda(edge, 0), keyedRng(key + '|us'));
  let against = poissonDraw(goalLambda(-edge, 0), keyedRng(key + '|them'));
  const won = keyedRng(key + '|duel')() * 100 < chance;
  if (week > 0 && won) goals++;
  if (week < 2 && !won) against++;
  return { slot, tired, cover, opponent, rating, chance, won, goals, against };
}

export function playCupWeek(cup: BudgetCup, reserve: string | null) {
  return cup.played.length < 3 && cupWeek(cup, cup.played.length, reserve)
    ? { ...cup, played: [...cup.played, reserve] } : cup;
}

export function replayBudgetCup(cup: BudgetCup) {
  if (cup.played.length !== 3) return cup;
  const legs = cup.played.map((name, week): [number, number] => {
    const result = cupWeek(cup, week, name)!;
    return [result.goals, result.against];
  });
  return { ...cup, previousRun: { legs, cash: cupCash(cup) }, bench: [], played: [] };
}

function validLegs(value: unknown, maxGoals: number): boolean {
  return Array.isArray(value) && value.length === 3 && value.every(leg =>
    Array.isArray(leg) && leg.length === 2 && leg.every(goals => Number.isInteger(goals) && goals >= 0 && goals <= maxGoals));
}

export function readBudgetCup(raw: string | null): BudgetCup | null {
  try {
    const cup = JSON.parse(raw ?? 'null') as BudgetCup | null;
    if (!cup || cup.version !== 1 || typeof cup.era !== 'string') return null;
    const result = cup.entryResult;
    if (result !== undefined && (!result || !Number.isSafeInteger(result.score) || result.score < 0
      || (result.legs !== null && !validLegs(result.legs, 5)))) return null;
    const previous = cup.previousRun;
    if (previous !== undefined && (!previous || !validLegs(previous.legs, 8)
      || !Number.isFinite(previous.cash) || previous.cash < 0 || previous.cash > cup.budget)) return null;
    const formation = FORMATIONS.find(f => f.name === cup.formation);
    const valid = (p: Entry) => p && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 150
      && Number.isFinite(p.fee) && p.fee >= 0 && Number.isInteger(p.rating) && p.rating >= 0 && p.rating <= 100;
    if (!formation || ![cup.strength, cup.moneyStrength].every(n => Number.isInteger(n) && n >= 0 && n <= 104)
      || !Number.isFinite(cup.budget) || cup.budget < 0 || ![cup.xi, cup.money].every(side => Array.isArray(side) && side.length === 11
        && side.every((p, i) => valid(p) && formation.slots[i].allowed.includes(p.position)) && new Set(side.map(p => p.name)).size === 11)) return null;
    const slots = cupSlots(formation), starters = new Set(cup.xi.map(p => p.name));
    if (!Array.isArray(cup.offers) || cup.offers.length > 24 || !cup.offers.every(p => valid(p) && !starters.has(p.name)
      && slots.some(i => formation.slots[i].allowed.includes(p.position))) || new Set(cup.offers.map(p => p.name)).size !== cup.offers.length
      || !Array.isArray(cup.bench) || cup.bench.length > 2 || new Set(cup.bench).size !== cup.bench.length
      || !cup.bench.every(n => cup.offers.some(p => p.name === n)) || cupCash(cup) < 0
      || !Array.isArray(cup.played) || cup.played.length > 3 || !cup.played.every((name, i) => cupWeek(cup, i, name))) return null;
    return cup;
  } catch { return null; }
}

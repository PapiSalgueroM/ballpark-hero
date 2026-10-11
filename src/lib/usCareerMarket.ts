import type { UsCareerCore } from './usCareerSport';
import type { UsSport } from './usCareerToCoach';
import { isFarewellSeason } from './careerRetirement';
import { extensionLeverage, pushExtension, type ExtensionTalk, type ExtPushArgs } from './usCareerExtension';
import { faLeverage, faTotalValue, pushFaOffer, type FaWindow, type FaOffer, type FaPushArgs } from './usCareerFreeAgency';

export interface MarketContext { sport: UsSport; year: number; team: string; contractYears: number; salary: number }
export type MarketResult = 'raised' | 'held' | 'withdrawn';
export interface MarketWheel {
  probabilities: Record<MarketResult, number>;
  result: MarketResult;
  draws: number[];
  label: string;
  offerIndex: number | null;
  seen: boolean;
}
interface MarketBase { context: MarketContext; reply: string | null; wheel?: MarketWheel }
export type UsCareerMarketTalk = MarketBase & (
  { kind: 'extension'; talk: ExtensionTalk; declined: boolean }
  | { kind: 'freeagency'; window: FaWindow }
);
export type MarketPriority = 'annual' | 'total' | 'years' | 'roster';
export interface MarketComparison { index: number; offer: FaOffer; value: number }
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const money = (n: unknown): n is number => finite(n) && n >= 0;
const years = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 1 && (n as number) <= 5;
const text = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const results: MarketResult[] = ['raised', 'held', 'withdrawn'];

export function marketContext(c: UsCareerCore, sport: UsSport): MarketContext {
  return { sport, year: c.year, team: c.team, contractYears: c.contractYears, salary: c.salary };
}
function contextMatches(v: unknown, c: UsCareerCore, sport: UsSport): v is MarketContext {
  if (!object(v) || c.retired) return false;
  return v.sport === sport && Number.isSafeInteger(v.year) && v.year === c.year && text(v.team) && v.team === c.team
    && Number.isSafeInteger(v.contractYears) && v.contractYears === c.contractYears && money(v.salary) && v.salary === c.salary;
}
function validExtension(v: unknown, team: string): v is ExtensionTalk {
  if (!object(v) || v.team !== team || !text(v.label) || !money(v.market) || typeof v.pushed !== 'boolean'
    || typeof v.pulled !== 'boolean' || !text(v.note) || (v.pulled && !v.pushed)) return false;
  if (v.offer === null) return true;
  const o = v.offer;
  return !v.pulled && object(o) && years(o.years) && money(o.salary)
    && ['eager', 'fair', 'reluctant'].includes(o.mood as string) && text(o.line);
}
function validWindow(v: unknown, team: string, farewell: boolean): v is FaWindow {
  if (!object(v) || !text(v.note) || !Array.isArray(v.offers) || v.offers.length < 1 || v.offers.length > 4) return false;
  const seen = new Set<string>();
  let incumbent = 0;
  for (const o of v.offers) {
    if (!object(o) || !text(o.team) || seen.has(o.team) || !text(o.label) || !money(o.salary) || !years(o.years)
      || (farewell && o.years !== 1) || !finite(o.quality) || o.quality < 0 || o.quality > 100
      || !['contender', 'playoff', 'rebuild'].includes(o.tier as string) || !text(o.pitch)
      || typeof o.incumbent !== 'boolean' || typeof o.pushed !== 'boolean' || typeof o.gone !== 'boolean'
      || (o.gone && !o.pushed)) return false;
    seen.add(o.team);
    if (o.incumbent) { incumbent++; if (o.team !== team || o.gone) return false; }
    else if (o.team === team) return false;
  }
  return incumbent === 1 && v.offers[0].incumbent === true && v.offers.some(o => !o.gone);
}
function validWheel(v: unknown): v is MarketWheel {
  if (!object(v) || !text(v.label) || !(v.offerIndex === null || (Number.isSafeInteger(v.offerIndex) && (v.offerIndex as number) >= 0 && (v.offerIndex as number) <= 3)) || !object(v.probabilities) || !results.includes(v.result as MarketResult) || typeof v.seen !== 'boolean'
    || !Array.isArray(v.draws) || v.draws.length < 1 || v.draws.length > 3 || !v.draws.every(n => finite(n) && n >= 0 && n < 1)) return false;
  const p = v.probabilities;
  return results.every(k => finite(p[k]) && p[k] >= 0 && p[k] <= 1)
    && Math.abs((p.raised as number) + (p.held as number) + (p.withdrawn as number) - 1) < 1e-9
    && (p[v.result as MarketResult] as number) > 0;
}
/** Reads only a complete talk for this exact unplayed contract year. */
export function restoreMarketTalk(value: unknown, c: UsCareerCore, sport: UsSport): UsCareerMarketTalk | null {
  if (!object(value) || !contextMatches(value.context, c, sport)
    || !(value.reply === null || typeof value.reply === 'string') || (value.wheel !== undefined && !validWheel(value.wheel))) return null;
  if (value.kind === 'extension') {
    if (c.contractYears !== 1 || isFarewellSeason(c.retirement, c.year) || typeof value.declined !== 'boolean'
      || !validExtension(value.talk, c.team) || (value.wheel && !value.talk.pushed)) return null;
    if (value.wheel) {
      const wheel = value.wheel as MarketWheel;
      if (wheel.offerIndex !== null || wheel.label !== value.talk.label
        || (wheel.result === 'withdrawn') !== value.talk.pulled || (wheel.result !== 'withdrawn' && !value.talk.offer)) return null;
    }
  } else if (value.kind === 'freeagency') {
    if (c.contractYears > 0 || !validWindow(value.window, c.team, isFarewellSeason(c.retirement, c.year))) return null;
    if (value.wheel) {
      const wheel = value.wheel as MarketWheel;
      const target = wheel.offerIndex !== null ? value.window.offers[wheel.offerIndex] : null;
      if (!target?.pushed || target.label !== wheel.label || target.gone !== (wheel.result === 'withdrawn')) return null;
    }
  } else return null;
  return value as unknown as UsCareerMarketTalk;
}
export function openMarketExtension(c: UsCareerCore, sport: UsSport, talk: ExtensionTalk): UsCareerMarketTalk {
  return { kind: 'extension', context: marketContext(c, sport), talk, reply: null, declined: false };
}
export function openMarketFreeAgency(c: UsCareerCore, sport: UsSport, window: FaWindow): UsCareerMarketTalk {
  return { kind: 'freeagency', context: marketContext(c, sport), window, reply: null };
}
export function extensionMarketProbabilities(a: ExtPushArgs): Record<MarketResult, number> {
  const lev = extensionLeverage(a);
  const raised = lev >= 0.55 ? 1 : lev >= 0.35 ? 0.55 : 0;
  const withdrawn = lev < 0.35 ? 0.3 : 0;
  return { raised, held: 1 - raised - withdrawn, withdrawn };
}
export function freeAgencyMarketProbabilities(w: FaWindow, index: number, a: FaPushArgs): Record<MarketResult, number> {
  const target = w.offers[index];
  const raised = faLeverage(a);
  const mayWalk = !!target && !target.incumbent && w.offers.filter(o => !o.gone).length > 1;
  const withdrawn = mayWalk ? (1 - raised) * 0.5 : 0;
  return { raised, held: 1 - raised - withdrawn, withdrawn };
}
/** Captures the existing engine draws. The presentation never makes another draw. */
export function pushMarketExtension(saved: UsCareerMarketTalk, a: ExtPushArgs): UsCareerMarketTalk {
  if (saved.kind !== 'extension' || saved.declined || saved.talk.pushed || !saved.talk.offer || (saved.wheel && !saved.wheel.seen)) return saved;
  const draws: number[] = [];
  const talk = pushExtension(saved.talk, { ...a, rng: () => { const n = a.rng(); draws.push(n); return n; } });
  const lev = extensionLeverage(a);
  const result: MarketResult = talk.pulled ? 'withdrawn' : lev >= 0.55 || (lev >= 0.35 && draws[0] < 0.55) ? 'raised' : 'held';
  return { ...saved, talk, reply: talk.note, wheel: { probabilities: extensionMarketProbabilities(a), result, draws, label: talk.label, offerIndex: null, seen: false } };
}
export function pushMarketFreeAgency(saved: UsCareerMarketTalk, index: number, a: FaPushArgs): UsCareerMarketTalk {
  if (saved.kind !== 'freeagency' || (saved.wheel && !saved.wheel.seen)) return saved;
  const target = saved.window.offers[index];
  if (!target || target.pushed || target.gone) return saved;
  const draws: number[] = [];
  const resolved = pushFaOffer(saved.window, index, { ...a, rng: () => { const n = a.rng(); draws.push(n); return n; } });
  const result: MarketResult = draws[0] < faLeverage(a) ? 'raised' : resolved.window.offers[index].gone ? 'withdrawn' : 'held';
  return { ...saved, window: resolved.window, reply: resolved.line, wheel: { probabilities: freeAgencyMarketProbabilities(saved.window, index, a), result, draws, label: target.label, offerIndex: index, seen: false } };
}
export function acknowledgeMarketWheel(saved: UsCareerMarketTalk): UsCareerMarketTalk {
  return saved.wheel && !saved.wheel.seen ? { ...saved, wheel: { ...saved.wheel, seen: true } } : saved;
}
export function declineMarketExtension(saved: UsCareerMarketTalk): UsCareerMarketTalk {
  return saved.kind === 'extension' && !saved.declined ? { ...saved, declined: true } : saved;
}
export function marketWheelPosition(wheel: MarketWheel): number {
  let start = 0;
  for (const k of results) {
    if (k === wheel.result) return start + wheel.probabilities[k] / 2;
    start += wheel.probabilities[k];
  }
  return 0;
}
/** A sorted view with the original signing index. Never reorders the actual window. */
export function marketOfferComparison(window: FaWindow, priority: MarketPriority): MarketComparison[] {
  return window.offers.map((offer, index) => ({ index, offer, value: priority === 'annual' ? offer.salary
    : priority === 'total' ? faTotalValue(offer) : priority === 'years' ? offer.years : offer.quality }))
    .filter(row => !row.offer.gone).sort((a, b) => b.value - a.value || a.index - b.index);
}

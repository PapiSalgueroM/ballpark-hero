/**
 * Round 720: Contract Chaos, the rules. Spec section 144.
 *
 * You are the agent for a generated footballer whose deal is up. His club
 * wants him back and one to three other clubs want him away. You compare
 * the offers (money, years, promised role, the manager's job security,
 * home or abroad, signing and trophy bonuses, a release clause and how
 * ambitious the club is), push one of them for more if you dare, sign one,
 * and then watch five seasons play out. The score is how the career went.
 *
 * Nothing here is a second offer engine. The window itself (who calls, how
 * much each kind of club pays, how long, the incumbent, the one push and its
 * fail closed rules) is src/lib/usCareerFreeAgency.ts, the engine all four
 * US careers already use: contenders pay less, rebuilds overpay, and a failed
 * push can make an outside club walk but never the last live offer. This file
 * adds only what a football contract carries on top of that and the five
 * season playout. Every club comes from Stadium Tycoon's generated name bank
 * (simStadiumTycoon proves none of them is a real club) and every player from
 * intlNames (simStartingXi proves none of them is a real player).
 *
 * Deterministic from a seed: the daily is one seed per Eastern date, so
 * everyone gets the same player, the same offers, the same push results and
 * the same five seasons for the same choice.
 */
import {
  buildFaWindow, pushFaOffer, faTotalValue,
  type FaOffer, type FaTier, type FaWindow,
} from '@/lib/usCareerFreeAgency';
import { intlName } from '@/lib/intlNames';
import { allOpponentNames } from '@/lib/stadiumTycoon';
import { mulberry32, hash32 } from '@/lib/leagueCore';
import { dailyPrngSeed } from '@/lib/dateUtils';

export const SAVE_KEY = 'dukb-contract-chaos-v1';
/** Seasons every career is judged over, whatever contract you signed. */
export const HORIZON = 5;

export type Role = 'starter' | 'rotation' | 'squad';
export type Seat = 'safe' | 'shaky' | 'hot';
export type CitySize = 'big' | 'mid' | 'small';

export interface CcPlayer {
  name: string;
  nation: string;
  age: number;
  position: string;
  ovr: number;
  pot: number;
}

export interface CcOffer {
  /** The shared engine's offer: club, salary (millions a year), years,
      squad strength, tier, incumbent, pushed, gone. */
  fa: FaOffer;
  /** Playing in your own country or moving abroad. */
  home: boolean;
  city: CitySize;
  /** The role the manager promises. It holds while he keeps his job. */
  role: Role;
  /** How safe the manager who signs you is. */
  seat: Seat;
  /** One off, paid on signing, millions. */
  signingBonus: number;
  /** Paid for every trophy you win there, millions. */
  trophyBonus: number;
  /** Millions. A bigger club can pay it and take you if you outgrow the place. */
  releaseClause: number | null;
  pitch: string;
}

export interface CcDeal {
  seed: number;
  player: CcPlayer;
  offers: CcOffer[];
  note: string;
  /** The player's market salary, millions a year. The money score is read against it. */
  market: number;
}

export interface CcSeason {
  n: number;
  age: number;
  club: string;
  quality: number;
  role: Role;
  /** Share of the season's minutes, 0 to 1. */
  minutes: number;
  ovrStart: number;
  ovr: number;
  titles: number;
  cups: number;
  earned: number;
  lines: string[];
}

export interface CcParts {
  growth: number;
  minutes: number;
  trophies: number;
  money: number;
}

export interface CcOutcome {
  seasons: CcSeason[];
  finalOvr: number;
  titles: number;
  cups: number;
  earned: number;
  avgMinutes: number;
  parts: CcParts;
  score: number;
  verdict: string;
}

/* ------------------------------------------------------------------ */
/* Seeds                                                                */
/* ------------------------------------------------------------------ */

/** Today's deal seed. Salted, so it never shares a stream with another daily. */
export function dailySeed(dateET: string): number {
  return dailyPrngSeed(`contract-chaos:${dateET}`) | 0;
}

/** A free play seed. Callers pass their own random draw so nothing here reads a clock. */
export function freeSeed(draw: number): number {
  return hash32(Math.floor(draw * 2147483647), 0x720c4a05) | 0;
}

function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (n: number) => Math.round(n * 10) / 10;
const pick = <T,>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/* ------------------------------------------------------------------ */
/* The deal                                                             */
/* ------------------------------------------------------------------ */

const NATIONS = ['England', 'Spain', 'Argentina', 'France', 'Germany', 'Brazil', 'Netherlands', 'Portugal', 'Italy', 'Nigeria', 'Japan', 'USA'] as const;
const POSITIONS = ['Goalkeeper', 'Centre back', 'Full back', 'Midfielder', 'Winger', 'Striker'] as const;

/** Market salary in millions a year for a rating. Generated economy, not a real wage table. */
export function marketFor(ovr: number): number {
  return round1(0.25 * Math.pow(1.14, ovr - 60));
}

/** The honest role for a rating at a club of this strength, with no promise behind it. */
export function roleFor(ovr: number, quality: number): Role {
  const gap = ovr - quality;
  if (gap >= -2) return 'starter';
  if (gap >= -9) return 'rotation';
  return 'squad';
}

const PITCHES: Record<FaTier, string[]> = {
  contender: [
    'They chase the league every year and think you are the missing piece.',
    'A title dressing room. The wage is lower because the medals are the pay.',
    'Big club, big stage, and the bench is crowded.',
  ],
  playoff: [
    'A good side one push from the top places.',
    'Solid club, honest money, a real role if you earn it.',
    'They want goals in the big games and think you bring them.',
  ],
  rebuild: [
    'They are rebuilding the whole club around you.',
    'Bad team, big wage, your name on the shirt sales.',
    'Year one of a project. The armband could be yours by winter.',
  ],
};

const INCUMBENT_PITCHES = [
  'The fans sing your name already. The board wants the next chapter.',
  'Same dressing room, same streets, no settling in.',
  'They say they believe in you. The number says how much.',
];

/** Build the day's (or the free play's) whole deal. Pure given the seed. */
export function buildDeal(seed: number): CcDeal {
  const rng = mulberry32(hash32(seed, 1));
  const age = 18 + Math.floor(rng() * 14);
  const ovr = clamp(74 + Math.floor(rng() * 13) - (age <= 20 ? 2 : 0), 72, 86);
  const headroom = age <= 21 ? 6 + Math.floor(rng() * 13)
    : age <= 24 ? 2 + Math.floor(rng() * 8)
      : age <= 28 ? Math.floor(rng() * 4) : 0;
  const pot = Math.min(94, ovr + headroom);
  const nation = pick(NATIONS, rng);
  const position = pick(POSITIONS, rng);
  const name = intlName(nation, Math.floor(rng() * 100_000));
  const player: CcPlayer = { name, nation, age, position, ovr, pot };

  /* Six generated clubs; the first is the one he plays for now. */
  const bank = allOpponentNames();
  const pool: { id: string; label: string }[] = [];
  const used = new Set<string>();
  while (pool.length < 6) {
    const n = bank[Math.floor(rng() * bank.length)];
    if (used.has(n)) continue;
    used.add(n);
    pool.push({ id: n, label: n });
  }
  const market = marketFor(ovr);
  const cliffAge = position === 'Goalkeeper' ? 33 : 31;
  const incumbentQuality = clamp(Math.round(ovr + (rng() - 0.5) * 12), 64, 94);
  const window = buildFaWindow({
    sport: 'soccer',
    currentTeam: pool[0].id,
    pool,
    market,
    discount: 0.92,
    minSalary: 0.1,
    ovr,
    age,
    accolades: ovr >= 83 ? 2 : ovr >= 79 ? 1 : 0,
    cliffAge,
    incumbentQuality,
    rng,
  });
  const offers = window.offers.map((fa, i) => decorate(fa, player, market, seed, i));
  return { seed, player, offers, note: window.note, market };
}

function decorate(fa: FaOffer, p: CcPlayer, market: number, seed: number, i: number): CcOffer {
  const rng = mulberry32(hash32(seed, 2, strHash(fa.team)));
  const tier = fa.tier;
  const honest = roleFor(p.ovr, fa.quality);
  /* A rebuild promises the shirt; everyone else promises what they see, and
     a manager selling a move rounds up one step half the time. */
  let role: Role = honest;
  if (tier === 'rebuild' && !fa.incumbent) role = 'starter';
  else if (!fa.incumbent && honest !== 'starter' && rng() < 0.5) role = honest === 'squad' ? 'rotation' : 'starter';
  const seatRoll = rng() + (fa.incumbent ? 0.2 : 0);
  const seatOdds: Record<FaTier, [number, number]> = { contender: [0.4, 0.1], playoff: [0.6, 0.2], rebuild: [0.75, 0.4] };
  const [safeBelow, hotBelow] = seatOdds[tier];
  const seat: Seat = seatRoll < hotBelow ? 'hot' : seatRoll < safeBelow ? 'shaky' : 'safe';
  const home = fa.incumbent ? true : rng() < 0.5;
  const cityRoll = rng() + (tier === 'contender' ? 0.3 : tier === 'rebuild' ? -0.2 : 0);
  const city: CitySize = cityRoll > 0.75 ? 'big' : cityRoll > 0.35 ? 'mid' : 'small';
  const bonusShare: Record<FaTier, [number, number]> = { contender: [0, 0.2], playoff: [0.15, 0.4], rebuild: [0.4, 0.8] };
  const [lo, hi] = fa.incumbent ? [0.1, 0.3] : bonusShare[tier];
  const signingBonus = round1(fa.salary * (lo + rng() * (hi - lo)));
  const trophyBonus = round1(fa.salary * (tier === 'contender' ? 0.12 : tier === 'playoff' ? 0.2 : 0.3));
  const clauseOdds = fa.incumbent ? 0.3 : tier === 'rebuild' ? 0.7 : tier === 'playoff' ? 0.5 : 0.25;
  const releaseClause = rng() < clauseOdds ? round1(market * fa.years * (1.5 + rng())) : null;
  const pitch = pick(fa.incumbent ? INCUMBENT_PITCHES : PITCHES[tier], rng);
  return { fa: { ...fa, pitch }, home, city, role, seat, signingBonus, trophyBonus, releaseClause, pitch };
}

/* ------------------------------------------------------------------ */
/* Negotiation, straight through the shared engine                      */
/* ------------------------------------------------------------------ */

export function pushOffer(deal: CcDeal, index: number): { deal: CcDeal; line: string } {
  const window: FaWindow = { offers: deal.offers.map(o => o.fa), note: deal.note };
  const p = deal.player;
  const res = pushFaOffer(window, index, {
    ovr: p.ovr,
    age: p.age,
    accolades: p.ovr >= 83 ? 2 : p.ovr >= 79 ? 1 : 0,
    cliffAge: p.position === 'Goalkeeper' ? 33 : 31,
    rng: mulberry32(hash32(deal.seed, 3, index)),
  });
  const offers = deal.offers.map((o, i) => ({ ...o, fa: res.window.offers[i] }));
  return { deal: { ...deal, offers }, line: res.line.replace(/(\d+(?:\.\d+)?)M/g, '€$1M') };
}

export const totalValue = (o: CcOffer) => round1(faTotalValue(o.fa) + o.signingBonus);

/* ------------------------------------------------------------------ */
/* Five seasons                                                          */
/* ------------------------------------------------------------------ */

const SACK_ODDS: Record<Seat, number> = { safe: 0.08, shaky: 0.25, hot: 0.5 };
const ROLE_MINUTES: Record<Role, number> = { starter: 0.86, rotation: 0.55, squad: 0.22 };
const ROLE_RANK: Record<Role, number> = { squad: 0, rotation: 1, starter: 2 };
const CITY_EXTRA: Record<CitySize, number> = { big: 0.12, mid: 0.05, small: 0 };
export const ROLE_WORD: Record<Role, string> = { starter: 'Starter', rotation: 'Rotation', squad: 'Squad player' };
export const SEAT_WORD: Record<Seat, string> = { safe: 'Safe', shaky: 'Shaky', hot: 'Hot seat' };
export const CITY_WORD: Record<CitySize, string> = { big: 'Big city', mid: 'Mid size city', small: 'Small town' };
export const AMBITION_WORD: Record<FaTier, string> = { contender: 'Title chasers', playoff: 'Top half push', rebuild: 'Rebuild project' };

/** One offer played out over HORIZON seasons. Keyed on the club, not the terms,
 *  so a push changes the money and never the football. */
export function simulateCareer(deal: CcDeal, index: number): CcOutcome {
  const o = deal.offers[index];
  const p = deal.player;
  const rng = mulberry32(hash32(deal.seed, 4, strHash(o.fa.team)));
  let ovr = p.ovr;
  let age = p.age;
  let club = o.fa.label;
  let quality = o.fa.quality;
  let promised: Role | null = o.role;
  let seat: Seat = o.seat;
  let salary = o.fa.salary;
  let yearsLeft = o.fa.years;
  let clause = o.releaseClause;
  let trophyBonus = o.trophyBonus;
  let city: CitySize = o.city;
  let firstSeasonAbroad = !o.home;
  let bonus = o.signingBonus;
  const seasons: CcSeason[] = [];

  for (let n = 1; n <= HORIZON; n += 1) {
    const lines: string[] = [];
    if (n > 1 && promised && rng() < SACK_ODDS[seat]) {
      promised = null;
      seat = 'shaky';
      lines.push('The manager who signed you got sacked. The new one picks his own team.');
    }
    const honest = roleFor(ovr, quality);
    const role: Role = promised && ROLE_RANK[promised] > ROLE_RANK[honest] ? promised : honest;

    const injuryOdds = 0.1 + Math.max(0, age - 28) * 0.03;
    let lost = 0;
    if (rng() < injuryOdds) {
      lost = 0.2 + rng() * 0.4;
      lines.push(`Injured for about ${Math.round(lost * 38)} games.`);
    }
    let minutes = ROLE_MINUTES[role] + (rng() - 0.5) * 0.12;
    if (firstSeasonAbroad) {
      minutes *= 0.85;
      lines.push('New country, new language. Settling in cost you a few games.');
    }
    minutes = clamp(minutes * (1 - lost), 0, 1);

    const ovrStart = ovr;
    if (age <= 23) {
      const rate = 0.1 + 0.3 * minutes + (quality > ovr ? 0.05 : 0);
      ovr += Math.round((p.pot - ovr) * rate + (rng() - 0.5));
    } else if (age <= 28) {
      ovr += Math.round((minutes - 0.4) * 2.5 + (rng() - 0.5) * 2);
    } else {
      ovr -= 1 + Math.floor(rng() * 2) + (age >= 32 ? 1 : 0) - (minutes > 0.7 ? 1 : 0);
    }
    /* Growth never passes potential (Rounds 96 and 116). */
    ovr = clamp(ovr, 40, p.pot);

    const strength = quality + (ovr - quality) * minutes * 0.25 + (rng() - 0.5) * 8;
    const counts = minutes >= 0.2;
    const titles = strength > 91 && counts ? 1 : 0;
    const cups = strength + (rng() - 0.5) * 14 > 90 && counts ? 1 : 0;
    if (titles) lines.push(`🏆 League champions at ${club}.`);
    if (cups) lines.push(`🥇 Cup winners at ${club}.`);

    const earned = round1(salary * (1 + CITY_EXTRA[city]) + bonus + trophyBonus * (titles + cups));
    bonus = 0;
    seasons.push({ n, age, club, quality, role, minutes, ovrStart, ovr, titles, cups, earned, lines });

    yearsLeft -= 1;
    age += 1;
    firstSeasonAbroad = false;
    if (n === HORIZON) break;

    if (clause !== null && yearsLeft > 0 && ovr >= quality + 3 && rng() < 0.7) {
      const from = club;
      club = pick(allOpponentNames().filter(x => x !== from), rng);
      quality = clamp(ovr + 4, 86, 94);
      salary = round1(marketFor(ovr) * 1.1);
      yearsLeft = 4;
      promised = 'starter';
      seat = 'safe';
      clause = null;
      trophyBonus = round1(salary * 0.12);
      city = 'big';
      lines.push(`💥 ${club} paid the €${o.releaseClause}M release clause. You outgrew ${from}.`);
    } else if (yearsLeft <= 0) {
      const from = club;
      const next = clamp(Math.round(ovr + (rng() - 0.5) * 8), 64, 94);
      club = next === quality ? from : pick(allOpponentNames().filter(x => x !== from), rng);
      quality = next;
      salary = round1(marketFor(ovr) * (age >= 30 ? 0.85 : 1));
      yearsLeft = age >= 30 ? 2 : 3;
      promised = null;
      seat = pick(['safe', 'shaky', 'hot'] as const, rng);
      clause = null;
      trophyBonus = round1(salary * 0.15);
      city = pick(['big', 'mid', 'small'] as const, rng);
      lines.push(club === from
        ? `Deal ran out. Signed again at ${club} on €${salary}M a year.`
        : `Deal ran out. Moved on to ${club} on €${salary}M a year.`);
    }
  }
  return score(deal, seasons);
}

/** The score, 0 to 100, from four parts that each have a hard cap. */
function score(deal: CcDeal, seasons: CcSeason[]): CcOutcome {
  const p = deal.player;
  const finalOvr = seasons[seasons.length - 1].ovr;
  const titles = seasons.reduce((a, s) => a + s.titles, 0);
  const cups = seasons.reduce((a, s) => a + s.cups, 0);
  const earned = round1(seasons.reduce((a, s) => a + s.earned, 0));
  const avgMinutes = seasons.reduce((a, s) => a + s.minutes, 0) / seasons.length;
  /* Growth is read against what his age says should happen: a kid is judged
     on how much of his potential he reached, a 31 year old on how well he
     held off the decline every veteran gets. */
  let expectedDecline = 0;
  for (let a = p.age; a < p.age + HORIZON; a += 1) if (a >= 29) expectedDecline += 1.5;
  const lo = p.ovr - 6 - expectedDecline;
  const growth = Math.round(30 * clamp((finalOvr - lo) / Math.max(4, p.pot - lo), 0, 1));
  const minutes = Math.round(25 * clamp(avgMinutes / 0.85, 0, 1));
  const trophies = Math.min(25, titles * 9 + cups * 5);
  const money = Math.round(20 * clamp(earned / (deal.market * HORIZON * 1.25), 0, 1));
  const parts = { growth, minutes, trophies, money };
  const total = growth + minutes + trophies + money;
  return { seasons, finalOvr, titles, cups, earned, avgMinutes, parts, score: total, verdict: verdictFor(total) };
}

export function verdictFor(total: number): string {
  if (total >= 85) return 'Super agent';
  if (total >= 70) return 'Great call';
  if (total >= 55) return 'Solid move';
  if (total >= 40) return 'Could have been worse';
  return 'Chaos won';
}

/** Every offer played out, for the road not taken on the result screen. */
export function allOutcomes(deal: CcDeal): CcOutcome[] {
  return deal.offers.map((_, i) => simulateCareer(deal, i));
}

export const fmtM = (m: number) => `€${m.toFixed(1)}M`;

export function shareText(deal: CcDeal, pickIndex: number, out: CcOutcome, daily: string | null): string {
  const o = deal.offers[pickIndex];
  const head = daily ? `Contract Chaos, ${daily}` : 'Contract Chaos';
  const trophies = out.titles + out.cups;
  return `${head}: ${out.score}/100, ${out.verdict} 📝\nSigned ${deal.player.name} at ${o.fa.label}. ${trophies} ${trophies === 1 ? 'trophy' : 'trophies'}, ${fmtM(out.earned)} earned, rated ${out.finalOvr} after five seasons.\ndouknowball.com/contract-chaos`;
}

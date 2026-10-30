/* ─── Round 835: the brand deals, one ladder for every career ────────────────

   Soccer Career's following has paid since the early rounds: cross a line of
   followers and a deal signs, and every deal pays a fixed sum every season on
   top of what your fame and your following already bring in. Near the top a
   game cover offer arrives, once a career, take it or turn it down. The four
   American careers have a "Brand work" button and nothing behind it. The
   rules moved here, out of the soccer engine, so every career climbs the same
   ladder in its own words; soccerCareerBrand.ts binds it for the flagship.

   THE LADDER. Five neutral rungs, in order: a local deal, a kit deal (the
   boot, the shoe, the glove, whatever the sport wears), a global ambassador
   role, your own apparel line, and a game cover. No rung is named after a
   real company and none may be: a sport names its rungs in its own words and
   prints no brand. A sport may keep a rung under the id its old saves were
   written with (saveIds), which is how soccer saves holding a pre Round 49
   tier id keep working with no migration; the rung itself stays neutral.

   WHAT A SPORT HANDS IN (BrandSport). The rungs it uses with their follower
   lines and what each pays, where its followers, standing, cash, rating and
   the stored tier live on its save, the cover offer's terms, and the words.

   THE RULES
     1. The rung you hold is the highest whose line your following has met.
        Lines must rise strictly up the ladder and pay must never fall, so a
        rung can never be stepped over and left unreachable, and climbing
        never costs money (brandLadderProblems names any sport that breaks
        this).
     2. A rung pays exactly its income each season, the number its card
        prints, and nothing when no rung is held or the stored id is unknown.
     3. A season's brand money is: the sport's own legacy term and a bonus pot
        it keeps, plus a fame term off standing, plus a per follower term,
        plus the rung. It is floored at zero, never a negative wage.
     4. The cover offer comes once: when the following and the rating are
        both at its lines and it has neither been taken nor is already
        waiting. Taking it pays its cash and followers and records the award;
        turning it down earns standing.

   Nothing here draws a random number. scripts/simCareerSocialBrands.mjs
   holds the rules against a synthetic sport, and holds soccer byte for byte
   against its output from before this file existed.
*/

import type { Meter, Toggle } from "./careerSocial";

export type BrandRung = "local_deal" | "kit_deal" | "global_ambassador" | "own_line" | "game_cover";

/** The ladder, bottom to top. */
export const BRAND_RUNGS: readonly BrandRung[] = ["local_deal", "kit_deal", "global_ambassador", "own_line", "game_cover"];

export interface BrandTierDef {
  id: BrandRung;
  name: string;
  emoji: string;
  /** Raw followers needed to hold this rung. */
  minFollowers: number;
  /** What the rung pays every season, millions of the sport's currency. */
  income: number;
}

export interface CoverOfferDef {
  /** Raw followers needed before the offer comes. */
  minFollowers: number;
  /** The rating needed before the offer comes. */
  minRating: number;
  /** Cash for taking it, millions. */
  pay: number;
  /** Followers for taking it, stored units. */
  followers: number;
  /** Standing for turning it down. */
  declineStanding: number;
  award: { name: string; emoji: string };
}

export interface BrandWords {
  /** Logged when a new rung signs. */
  signed: (t: BrandTierDef) => string;
  /** Logged when the cover offer is taken, and when it is turned down. */
  coverTaken: string;
  coverDeclined: string;
  /** How the sport prints an amount of money, in millions: "€3M". */
  money: (millions: number) => string;
}

export interface BrandSport<S> {
  tiers: BrandTierDef[];
  /** A rung kept under an older stored id. Absent means the rung id itself. */
  saveIds?: Partial<Record<BrandRung, string>>;
  /** Raw followers per stored unit. */
  followerUnit: number;
  followers: Meter<S>;
  standing: Meter<S>;
  cash: Meter<S>;
  rating: (s: S) => number;
  /** The stored id of the rung held, or null. */
  tier: { get: (s: S) => string | null; set: (s: S, stored: string) => void };
  cover: CoverOfferDef & {
    taken: Toggle<S>;
    waiting: Toggle<S>;
    /** Records the award on the save. */
    record: (s: S, award: { name: string; emoji: string }) => void;
  };
  /** Fame pays even without a deal: the first line of standing met pays its
   *  sum, best line first. */
  fame: [standing: number, pays: number][];
  /** What every stored follower unit pays a season. */
  perFollower: number;
  log: (s: S, line: string) => void;
  words: BrandWords;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

/** The stored id a rung is kept under on this sport's saves. */
export function brandSaveId<S>(rung: BrandRung, sport: BrandSport<S>): string {
  return sport.saveIds?.[rung] ?? rung;
}

/** The rung a stored id means, or null for nothing or an id this sport never wrote. */
export function brandRungOf<S>(stored: string | null | undefined, sport: BrandSport<S>): BrandRung | null {
  if (!stored) return null;
  for (const t of sport.tiers) if (brandSaveId(t.id, sport) === stored) return t.id;
  return null;
}

/** The highest rung a following of `rawFollowers` has met, or null. */
export function brandRungFor(rawFollowers: number, tiers: BrandTierDef[]): BrandRung | null {
  let best: BrandRung | null = null;
  for (const t of tiers) {
    if (rawFollowers >= t.minFollowers) best = t.id;
  }
  return best;
}

/** What a rung pays a season: its income, nothing else. */
export function brandRungPay(rung: BrandRung | null, tiers: BrandTierDef[]): number {
  if (!rung) return 0;
  const t = tiers.find(x => x.id === rung);
  return t?.income || 0;
}

/** The card line for a rung: what it is and what it pays. */
export function brandRungCard(t: BrandTierDef, words: BrandWords): string {
  return `${t.emoji} ${t.name}: ${words.money(t.income)}/year`;
}

/** After the following moves: sign the rung it has reached, if it is not the
 *  one already held. Returns the rung signed, or null. */
export function updateBrandRung<S>(s: S, sport: BrandSport<S>): BrandTierDef | null {
  const rung = brandRungFor(sport.followers.get(s) * sport.followerUnit, sport.tiers);
  if (!rung) return null;
  const stored = brandSaveId(rung, sport);
  if (stored === sport.tier.get(s)) return null;
  const t = sport.tiers.find(x => x.id === rung)!;
  sport.tier.set(s, stored);
  sport.log(s, sport.words.signed(t));
  return t;
}

/** What a sport's own season money reads off its save. */
export interface BrandIncomeFacts {
  standing: number;
  /** Stored units. */
  followers: number;
  /** The stored tier id. */
  tier: string | null | undefined;
  /** The pot the sport keeps for income its events built or lost. */
  bonus: number;
  /** The sport's own legacy term, 0 when it has none. */
  legacy: number;
}

/** A season's brand money in millions, two decimals, never below zero. */
export function brandSeasonIncome<S>(f: BrandIncomeFacts, sport: BrandSport<S>): number {
  let income = f.bonus;
  for (const [line, pays] of sport.fame) {
    if (f.standing >= line) { income += pays; break; }
  }
  income += f.followers * sport.perFollower;
  if (f.legacy !== 0) income += f.legacy;
  income += brandRungPay(brandRungOf(f.tier, sport), sport.tiers);
  return r2(Math.max(0, income));
}

/** True when the cover offer should be put in front of the player now. */
export function coverOfferDue<S>(s: S, sport: BrandSport<S>): boolean {
  const c = sport.cover;
  return sport.followers.get(s) * sport.followerUnit >= c.minFollowers && sport.rating(s) >= c.minRating && !c.taken.get(s) && !c.waiting.get(s);
}

/** Stage the cover offer if it is due. True when it was staged. */
export function stageCoverOffer<S>(s: S, sport: BrandSport<S>): boolean {
  if (!coverOfferDue(s, sport)) return false;
  sport.cover.waiting.set(s, true);
  return true;
}

/** The player's answer to the cover offer, applied in place. */
export function decideCoverOffer<S>(s: S, accept: boolean, sport: BrandSport<S>): void {
  const c = sport.cover;
  c.waiting.set(s, false);
  if (accept) {
    c.taken.set(s, true);
    sport.cash.set(s, r2(sport.cash.get(s) + c.pay));
    sport.followers.set(s, r2(sport.followers.get(s) + c.followers));
    sport.log(s, sport.words.coverTaken);
    c.record(s, c.award);
  } else {
    sport.standing.set(s, clamp100(sport.standing.get(s) + c.declineStanding));
    sport.log(s, sport.words.coverDeclined);
  }
}

/** Every rule a sport's ladder breaks, in words. Empty means sound. */
export function brandLadderProblems<S>(sport: BrandSport<S>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let prev: BrandTierDef | null = null;
  for (const t of sport.tiers) {
    if (!BRAND_RUNGS.includes(t.id)) out.push(`${t.id} is not a rung of the shared ladder`);
    if (seen.has(t.id)) out.push(`${t.id} is listed twice`);
    seen.add(t.id);
    if (prev) {
      if (BRAND_RUNGS.indexOf(t.id) <= BRAND_RUNGS.indexOf(prev.id)) out.push(`${t.id} sits below ${prev.id} on the shared ladder`);
      if (!(t.minFollowers > prev.minFollowers)) out.push(`${t.id} needs ${t.minFollowers} followers, not above ${prev.id}'s ${prev.minFollowers}, so it can be stepped over`);
      if (t.income < prev.income) out.push(`${t.id} pays ${t.income}, less than ${prev.id}'s ${prev.income}`);
    }
    if (!(t.income >= 0)) out.push(`${t.id} pays ${t.income}`);
    prev = t;
  }
  const stored = sport.tiers.map(t => brandSaveId(t.id, sport));
  if (new Set(stored).size !== stored.length) out.push("two rungs are stored under the same id");
  for (let i = 1; i < sport.fame.length; i += 1) {
    if (!(sport.fame[i][0] < sport.fame[i - 1][0])) out.push("fame lines must be listed best first");
  }
  return out;
}

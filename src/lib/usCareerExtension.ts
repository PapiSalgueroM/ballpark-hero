/* Round 207: the extension talk, in all four US career games.

   Round 179 gave these games a real free agency window: when your deal ran
   out you got competing offers with honest economics and one negotiation
   each. What it did not give them is the decision that comes BEFORE that,
   and it is the one real players spend their careers arguing about. In the
   final year of a contract a club can put an extension on the table. Take
   it and you are set, at a number that is usually a little under what the
   open market would pay, because certainty has a price. Run the year down
   and you reach free agency with every team bidding, which pays better on
   average and can go badly wrong: a bad season, a bad injury, or simply
   turning a year older past your position's cliff, and the market that was
   going to bid stops bidding.

   That is the whole feature. It is a fork with a real cost on both sides,
   which is what the game was missing: before this, the final year of a deal
   was indistinguishable from any other year.

   Rules that make it a decision rather than a free upgrade:

   - They only offer if they want you. A 34 year old running back at 74 is
     let go, and the screen says so plainly rather than pretending.
   - The offer sits BELOW market on average, and the screen shows both
     numbers, so the player is choosing with the same information the club
     has rather than guessing.
   - You get one push, the same single-shot negotiation the trade talks and
     free agency use. With leverage they find money. Without it they can
     take the offer off the table entirely, and then the summer market is
     where you are going, ready or not.
   - Fail-closed, the house rule: the worst outcome is always "no extension,
     go to free agency", never a career with no path forward. Free agency is
     guaranteed by the board when a contract hits zero, so a pulled offer
     costs you certainty, never the game.

   One engine, four sports, the same shape as usCareerFreeAgency.ts: each
   sport wrapper feeds its own market number, accolade count and cliff age,
   so the four games cannot drift apart. */

import type { UsSport } from './usCareerToCoach';

export type ExtMood = 'eager' | 'fair' | 'reluctant';

export interface ExtensionOffer {
  /** Years added on top of the season being played. */
  years: number;
  /** Millions per year. Already era-scaled: it derives from market. */
  salary: number;
  mood: ExtMood;
  /** What the club says about the number. */
  line: string;
}

export interface ExtensionTalk {
  /** Team id in the sport's own scheme. */
  team: string;
  label: string;
  /** The offer on the table. Null once they have walked away from talks. */
  offer: ExtensionOffer | null;
  /** What the open market would pay today, shown next to the offer. */
  market: number;
  /** One negotiation, spent or not. */
  pushed: boolean;
  /** True when a push took the offer off the table for good. */
  pulled: boolean;
  /** The header line: where this talk stands. */
  note: string;
}

export interface ExtBuildArgs {
  sport: UsSport;
  team: string;
  label: string;
  /** The sport's computed market salary for this career, era-scaled. */
  market: number;
  /** Salary floor, in millions, so a thin sport never offers zero. */
  minSalary: number;
  ovr: number;
  age: number;
  /** All-Pro / All-NBA / All-Star count. Real leverage. */
  accolades: number;
  /** The position's decline age. */
  cliffAge: number;
  rng: () => number;
}

export interface ExtPushArgs {
  ovr: number;
  age: number;
  accolades: number;
  cliffAge: number;
  rng: () => number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/**
 * How badly they want to keep you, 0 to 1.
 *
 * Rating carries most of it, because it is what actually plays. Accolades
 * add a little, because a club pays for a name as well as a player. Age
 * past the position's cliff takes it away fast, which is the whole reason
 * running a contract down is a gamble rather than a strategy.
 */
export function extensionLeverage(a: { ovr: number; age: number; accolades: number; cliffAge: number }): number {
  const skill = clamp((a.ovr - 72) / 22, 0, 1);
  const fame = clamp(a.accolades / 6, 0, 0.25);
  const yearsPast = Math.max(0, a.age - a.cliffAge);
  const decline = clamp(yearsPast * 0.18, 0, 0.85);
  return clamp(skill * 0.85 + fame - decline, 0, 1);
}

const MOOD_MONEY: Record<ExtMood, [number, number]> = {
  /* Even an eager club prices certainty in: a shade under market, not over.
     The market is where the money is, and that is the point of the fork. */
  eager: [0.93, 1.02],
  fair: [0.84, 0.94],
  reluctant: [0.70, 0.83],
};

const MOOD_LINES: Record<ExtMood, string[]> = {
  eager: [
    'They want this done before anybody else gets a look at you.',
    'The offer came the day the season ended. They are not pretending.',
    'They called it a priority, out loud, on the record.',
  ],
  fair: [
    'A real offer, and a fair one, and they know what the market pays.',
    'They would like you to stay. They would also like a discount.',
    'Honest money for an honest player, is how they put it.',
  ],
  reluctant: [
    'The number says what they think of you more clearly than the words did.',
    'They are offering because it is cheaper than replacing you.',
    'It is an offer. It is not a compliment.',
  ],
};

/**
 * The offer, or nothing.
 *
 * Returns null when the club has decided to let the contract run out, which
 * is a real answer and is shown as one. That happens when leverage is low:
 * an aging player past his cliff, or a squad man who was never going to be
 * paid to stay.
 */
export function buildExtension(a: ExtBuildArgs): ExtensionTalk {
  const lev = extensionLeverage(a);
  const base: ExtensionTalk = {
    team: a.team,
    label: a.label,
    offer: null,
    market: round1(a.market),
    pushed: false,
    pulled: false,
    note: '',
  };
  /* Below this they simply do not offer. The screen says so; it does not
     invent a token deal nobody would sign. */
  if (lev < 0.18) {
    return {
      ...base,
      note: `${a.label} are letting your deal run out. Play the season and the market decides.`,
    };
  }
  const mood: ExtMood = lev >= 0.7 ? 'eager' : lev >= 0.4 ? 'fair' : 'reluctant';
  const [lo, hi] = MOOD_MONEY[mood];
  const salary = Math.max(a.minSalary, round1(a.market * (lo + a.rng() * (hi - lo))));
  /* Length follows age against the cliff, the same way free agency does it:
     nobody hands five years to a player two seasons from the drop. */
  const room = a.cliffAge - a.age;
  const years = clamp(
    room >= 6 ? 4 + Math.floor(a.rng() * 2)
      : room >= 3 ? 3 + Math.floor(a.rng() * 2)
        : room >= 0 ? 2 + Math.floor(a.rng() * 2)
          : 1 + Math.floor(a.rng() * 2),
    1, 5,
  );
  return {
    ...base,
    offer: { years, salary, mood, line: pick(MOOD_LINES[mood], a.rng) },
    note: `${a.label} have put an extension on the table. The market would pay about $${round1(a.market)}M.`,
  };
}

/**
 * The one push.
 *
 * With leverage they find money. Without it they can walk, and that is the
 * teeth: the safe option is only safe until you push it. A club never
 * improves twice, and a pulled offer never comes back.
 */
export function pushExtension(t: ExtensionTalk, a: ExtPushArgs): ExtensionTalk {
  if (t.pushed || !t.offer) return t;
  const lev = extensionLeverage(a);
  const roll = a.rng();
  /* High leverage: they move, and by how much depends on how badly they
     want it. Middle: they hold, which costs nothing but the push. Low: a
     real chance the whole thing comes off the table. */
  if (lev >= 0.55 || (lev >= 0.35 && roll < 0.55)) {
    const bump = 1 + (0.06 + a.rng() * 0.09);
    const salary = round1(t.offer.salary * bump);
    const years = t.offer.years + (lev >= 0.75 && a.rng() < 0.4 ? 1 : 0);
    return {
      ...t,
      pushed: true,
      offer: { ...t.offer, salary, years: Math.min(5, years), line: 'They found the money. They usually do, for players like you.' },
      note: `${t.label} improved the offer to $${salary}M a year.`,
    };
  }
  if (lev < 0.35 && roll < 0.3) {
    return {
      ...t,
      pushed: true,
      pulled: true,
      offer: null,
      note: `${t.label} pulled the offer. You are playing this season for the open market now.`,
    };
  }
  return {
    ...t,
    pushed: true,
    note: `${t.label} did not move. The offer stands as it was.`,
  };
}

/** Whether a career should even be asked. Final year of a deal, still playing. */
export function extensionDue(c: { contractYears: number; retired?: boolean }): boolean {
  return !c.retired && c.contractYears === 1;
}

/** The one line the hub shows while an extension is waiting to be answered. */
export function extensionHeadline(t: ExtensionTalk): string {
  if (!t.offer) return t.pulled ? 'The offer is gone. Free agency it is.' : 'No extension coming. Play it out.';
  return `${t.offer.years} more year${t.offer.years === 1 ? '' : 's'} at $${t.offer.salary}M`;
}

/* Round 179: free agency stops being a coin flip.

   Before this round, every US career game resolved an expired contract with
   two buttons: re-sign at a discount, or "test free agency" and get teleported
   to a RANDOM team at a flat market number. No choice of destination, no idea
   what you were walking into, no negotiation. Soccer's games have had real
   competing offers for months, and the owner's standing note says the other
   sports are way behind, so this is the first parity system pulled across:
   the market and the talks.

   How it works now, in every sport:

   - When your deal is up you get a WINDOW: your current team's re-sign offer
     plus one to three outside offers from real named franchises in your era's
     league, each with its own salary, length, roster quality and pitch.
   - The economics are honest. Contenders offer LESS money (they have the
     leverage and the cap is tight), rebuilds overpay (nobody pays like a
     desperate team buying a face), playoff teams sit near market. Roster
     quality is shown, and it is the exact number the season sim runs on, so
     picking the 91 contender genuinely raises your ring odds and picking the
     68 rebuild genuinely pays for it in January.
   - You can push any offer for more, once. Push a star's case and they find
     money. Push a fading vet's case and the offer can disappear. Fail-closed
     rules: your own team never rescinds (they hold firm instead), and the
     last live offer on the table never rescinds either, so a career can
     never be stranded with no deal to sign. That mirrors the validator rule
     everywhere else on the site: the failure mode is "no progress", never
     "impossible state".

   One engine, four sports, same as usCoachCareer.ts (Round 126). The sport
   libs each own a thin wrapper that feeds this their own pool, market number,
   discount and age cliff, so the four games cannot drift apart. */

import type { UsSport } from './usCareerToCoach';

export type FaTier = 'contender' | 'playoff' | 'rebuild';

export interface FaOffer {
  /** Team id in the sport's own scheme (abbr for NFL, id elsewhere). */
  team: string;
  /** Era-aware display name, resolved by the sport wrapper at build time. */
  label: string;
  /** Millions per year. Already era-scaled because it derives from market. */
  salary: number;
  years: number;
  /** Roster quality 62-95. Becomes the board's teamQuality on signing. */
  quality: number;
  tier: FaTier;
  pitch: string;
  /** True for your current team's re-sign offer. Never rescinds. */
  incumbent: boolean;
  /** One negotiation per offer, spent or not. */
  pushed: boolean;
  /** True after a failed push made them walk. Card stays visible, dimmed. */
  gone: boolean;
}

export interface FaWindow {
  /** Incumbent first, then outside offers sorted by salary, best first. */
  offers: FaOffer[];
  /** One-line market read for the screen header. */
  note: string;
}

export interface FaBuildArgs {
  sport: UsSport;
  currentTeam: string;
  /** The whole era-aware league, current team included; filtered here. */
  pool: { id: string; label: string }[];
  /** The sport's computed market salary for this career, era-scaled. */
  market: number;
  /** Incumbent re-sign multiplier, each sport keeps its historic number. */
  discount: number;
  /** Salary floor for a bottom offer, in millions. */
  minSalary: number;
  ovr: number;
  age: number;
  /** All-Pro / All-NBA / All-Star count. Raises negotiating leverage. */
  accolades: number;
  /** The position's decline age. Drives contract length. */
  cliffAge: number;
  /** Current teamQuality, carried by the re-sign offer. */
  incumbentQuality: number;
  rng: () => number;
}

/* Quality bands sit inside every sport's clamp (NFL 62-94, others 64-95). */
const TIER_QUALITY: Record<FaTier, [number, number]> = {
  contender: [86, 94],
  playoff: [74, 85],
  rebuild: [64, 73],
};

/* Money as a share of market. Contenders discount, rebuilds overpay. */
const TIER_MONEY: Record<FaTier, [number, number]> = {
  contender: [0.80, 0.92],
  playoff: [0.95, 1.07],
  rebuild: [1.08, 1.25],
};

const PITCHES: Record<FaTier, string[]> = {
  contender: [
    'One piece short, and they think it is you.',
    'The window is open right now. They said exactly that.',
    'Ring chasing, openly. The discount is the price of June.',
  ],
  playoff: [
    'Good team, one leap from great.',
    'A bigger role and a real shot, their words.',
    'Solid roster, honest money, no promises they cannot keep.',
  ],
  rebuild: [
    'They want a face for the whole project.',
    'Bad team, big check, your show.',
    'Year one of a rebuild, and the keys are yours.',
  ],
};

const INCUMBENT_PITCHES = [
  'The city already sings your name.',
  'They drafted the story. They want the ending too.',
  'Same locker, familiar streets, a banner they say is coming.',
];

const round1 = (n: number) => Math.round(n * 10) / 10;
const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

function within(range: [number, number], rng: () => number): number {
  return range[0] + rng() * (range[1] - range[0]);
}

/** Contract length from where the player sits against the position cliff. */
function baseYears(age: number, cliffAge: number, rng: () => number): number {
  const dist = cliffAge - age;
  if (dist >= 5) return 4 + (rng() < 0.35 ? 1 : 0);
  if (dist >= 2) return 3;
  if (dist >= 0) return 2;
  return 1;
}

function outsideOffer(
  tier: FaTier, team: { id: string; label: string }, a: FaBuildArgs,
): FaOffer {
  let years = baseYears(a.age, a.cliffAge, a.rng);
  /* Rebuilds buy years of a face; contenders sign for the window only. */
  if (tier === 'rebuild') years = Math.min(5, years + 1);
  if (tier === 'contender') years = Math.max(1, years - 1);
  return {
    team: team.id,
    label: team.label,
    salary: round1(Math.max(a.minSalary, a.market * within(TIER_MONEY[tier], a.rng))),
    years,
    quality: Math.round(within(TIER_QUALITY[tier], a.rng)),
    tier,
    pitch: pick(PITCHES[tier], a.rng),
    incumbent: false,
    pushed: false,
    gone: false,
  };
}

function tierOfQuality(q: number): FaTier {
  return q >= TIER_QUALITY.contender[0] ? 'contender'
    : q >= TIER_QUALITY.playoff[0] ? 'playoff' : 'rebuild';
}

/** Build the whole window. Deterministic given rng, pure otherwise. */
export function buildFaWindow(a: FaBuildArgs): FaWindow {
  const others = a.pool.filter(t => t.id !== a.currentTeam);
  /* Shuffle a copy so repeat windows in one save do not repeat suitors. */
  const bag = [...others];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(a.rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  const tiers: FaTier[] = [];
  if (a.ovr >= 84) {
    /* Stars get the full market: a contender call, a rebuild overpay, and
       one more from anywhere. */
    tiers.push('contender', 'rebuild', (['contender', 'playoff', 'rebuild'] as FaTier[])[Math.floor(a.rng() * 3)]);
  } else if (a.ovr >= 76) {
    tiers.push(a.rng() < 0.35 ? 'contender' : 'playoff', a.rng() < 0.5 ? 'playoff' : 'rebuild');
  } else if (a.ovr >= 70) {
    /* Contenders do not call mid players. */
    tiers.push(a.rng() < 0.5 ? 'playoff' : 'rebuild');
    if (a.rng() < 0.5) tiers.push('rebuild');
  } else {
    /* The prove-it deal: one year, below market, a rebuild taking a flyer. */
    const team = bag[0];
    const proveIt: FaOffer = {
      team: team.id, label: team.label,
      salary: round1(Math.max(a.minSalary, a.market * 0.7)),
      years: 1,
      quality: Math.round(within(TIER_QUALITY.rebuild, a.rng)),
      tier: 'rebuild',
      pitch: 'One year to remind the league who you are.',
      incumbent: false, pushed: false, gone: false,
    };
    const incumbentLow = incumbentOffer(a);
    return {
      offers: [incumbentLow, proveIt],
      note: 'The phone is quieter than it used to be.',
    };
  }

  const outside = tiers.map((tier, i) => outsideOffer(tier, bag[i], a));
  outside.sort((x, y) => y.salary - x.salary);
  const offers = [incumbentOffer(a), ...outside];
  const note = a.ovr >= 84
    ? 'Everyone wants in. Make them pay for the privilege.'
    : 'Real interest, real numbers. Choose the next chapter.';
  return { offers, note };
}

function incumbentOffer(a: FaBuildArgs): FaOffer {
  return {
    team: a.currentTeam,
    label: a.pool.find(t => t.id === a.currentTeam)?.label ?? a.currentTeam,
    salary: round1(Math.max(a.minSalary, a.market * a.discount)),
    years: baseYears(a.age, a.cliffAge, a.rng),
    quality: a.incumbentQuality,
    tier: tierOfQuality(a.incumbentQuality),
    pitch: pick(INCUMBENT_PITCHES, a.rng),
    incumbent: true,
    pushed: false,
    gone: false,
  };
}

export interface FaPushArgs {
  ovr: number;
  age: number;
  accolades: number;
  cliffAge: number;
  rng: () => number;
}

export interface FaPushResult {
  window: FaWindow;
  /** The one line the feed prints about how the talk went. */
  line: string;
}

/** How much of the room the player owns when he asks for more. */
export function faLeverage(p: { ovr: number; age: number; accolades: number; cliffAge: number }): number {
  const raw = 0.25 + (p.ovr - 78) * 0.03 + p.accolades * 0.04
    - Math.max(0, p.age - (p.cliffAge - 2)) * 0.06;
  return Math.max(0.15, Math.min(0.85, raw));
}

/** Push one offer for more. Returns a NEW window; the old one is untouched. */
export function pushFaOffer(w: FaWindow, index: number, p: FaPushArgs): FaPushResult {
  const target = w.offers[index];
  if (!target || target.pushed || target.gone) {
    return { window: w, line: 'That conversation is over.' };
  }
  const offers = w.offers.map(o => ({ ...o }));
  const o = offers[index];
  o.pushed = true;

  const lev = faLeverage(p);
  const roll = p.rng();
  if (roll < lev) {
    const bump = 1.08 + p.rng() * 0.10;
    o.salary = round1(o.salary * bump);
    let line = `${o.label} came up. ${o.salary}M a year now.`;
    if (o.years < 5 && p.rng() < 0.35) {
      o.years += 1;
      line = `${o.label} came up on money AND length. ${o.salary}M x${o.years}.`;
    }
    return { window: { ...w, offers }, line };
  }

  /* Failed push. Half the time they hold, half the time they walk, except
     that the incumbent never walks and the last live offer never walks.
     Fail closed: the worst outcome of a negotiation is the same deal, not
     a career with nowhere to sign. */
  const liveCount = offers.filter(x => !x.gone).length;
  const mayWalk = !o.incumbent && liveCount > 1;
  if (mayWalk && p.rng() < 0.5) {
    o.gone = true;
    return { window: { ...w, offers }, line: `${o.label} pulled the offer. Their money went elsewhere.` };
  }
  return {
    window: { ...w, offers },
    line: o.incumbent
      ? `${o.label} did not blink. The number is the number.`
      : `${o.label} held firm. Take it or leave it.`,
  };
}

/* The shared fields every sport's career state actually has. Structural
   typing keeps this honest: if a sport renames one, tsc fails here. */
export interface FaSignable {
  team: string;
  salary: number;
  contractYears: number;
  fanbase: number;
  morale: number;
}

/** Sign an offer onto a career state. Returns the feed line. */
export function applyFaSigning<T extends FaSignable>(c: T, offer: FaOffer): string {
  const stayed = offer.incumbent;
  c.team = offer.team;
  c.salary = offer.salary;
  c.contractYears = offer.years;
  c.morale = Math.min(100, c.morale + 6);
  if (stayed) {
    c.fanbase = Math.min(100, c.fanbase + 10);
    return `✍️ Re-signed with ${offer.label}: ${offer.salary}M x${offer.years}. The city exhales.`;
  }
  c.fanbase = 40;
  return `✍️ Signed with ${offer.label}: ${offer.salary}M x${offer.years}. New city, new pressure.`;
}

/** Total value line for the cards. */
export function faTotalValue(o: FaOffer): number {
  return round1(o.salary * o.years);
}

export const FA_TIER_WORD: Record<FaTier, string> = {
  contender: '🏆 Contender',
  playoff: '🎯 Playoff push',
  rebuild: '🧱 Rebuild',
};

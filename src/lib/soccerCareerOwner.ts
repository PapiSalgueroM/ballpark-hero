/* ─── Round 1524: the club owner's tail ───
   A career that ends with €200M in the account can buy a club. Until this
   round that was three coin flips: a random tier 3 or 4 club with no say in
   it, "Won the league!" on a 10 to 15 percent coin, and otherwise an invented
   "Finished <random position>". Now:

   - he picks from a short list of clubs for sale, two from every price band
     he can afford. The prices and the debts are the game's own tier bands and
     the screen says so: never a real valuation of a real club;
   - every season is played on the manager tail's own league table
     (managerLeagueField for the field, playDugoutTable for the points), so
     the finish, a title, a promotion and a relegation are read off the table
     and nothing else;
   - before every season he makes one call: where the budget goes. Each of the
     four has a real effect, on the table strength or on the money, and a
     cost, so no one of them is the right answer every time
     (scripts/simSoccerOwnerTail.mjs measures all of it over a fleet).

   Nothing here touches Math.random: the table is drawn from a stream keyed to
   the save and the season, so the same save plays the same season in any tab
   and the only thing a different choice changes is the choice's own effect.
   Elite clubs (tier 1) are never for sale; a club gets there by promotion. */
import type { CareerState, ClubData, OwnerPlan, OwnerSeasonRow, OwnerState } from "./soccerCareerEngine";
import { adjustClubsForYear } from "./careerEras";
import { divisionMove, finishZone, keyedStream, leagueKeyInYear, managerLeagueField, ordinal, playDugoutTable } from "./soccerCareerLeague";

/** The game's own money bands by tier, in €M. A price and a debt are the
 *  game's estimate for a club of that tier, never a figure about the real
 *  club. `revenue` is what a season of ownership pays at that tier. */
export const OWNER_TIERS: Readonly<Record<number, { price: number; debt: number; revenue: number }>> = {
  1: { price: 0, debt: 0, revenue: 12 },
  2: { price: 250, debt: 24, revenue: 6 },
  3: { price: 100, debt: 12, revenue: 3 },
  4: { price: 50, debt: 8, revenue: 2 },
};
/** The tiers a club can be bought at, cheapest first. */
export const OWNER_SALE_TIERS = [4, 3, 2] as const;
/** Clubs offered in each price band he can afford. */
export const OWNER_PER_BAND = 2;

/* The four calls and what each one does, in the units the table and the
   money are kept in (league points of edge, and €M scaled by the tier's
   revenue). Tuned over the fleet in scripts/simSoccerOwnerTail.mjs, whose
   header carries the measured numbers. */
export const OWNER_EFFECTS = {
  /** squad: points of edge the signings add this season */
  squadEdge: 5,
  /** squad: the share of the signings' edge still there a season later */
  squadKeep: 0.5,
  /** squad: wages this season, as a share of the tier's revenue */
  squadWages: 0.5,
  /** youth: points of edge per academy level, from the season after */
  academyEdge: 1.5,
  /** youth: sales per academy level a season, share of revenue */
  academySales: 0.2,
  /** stadium: income per stadium level a season, share of revenue */
  stadiumYield: 0.6,
  /** stadium: income lost to the building work this season, share of revenue */
  stadiumWorks: 0.3,
  /** debt: interest a season, as a share of the debt */
  interest: 0.15,
  /** debt: points of edge lost per tier revenue of debt (a club in debt sells) */
  debtDrag: 0.4,
  /** the budget a season, in tier revenues (what a debt payment pays off) */
  budget: 2,
  /** the most levels the academy or the ground can reach */
  maxLevel: 5,
} as const;

export const OWNER_PLANS: readonly OwnerPlan[] = ["squad", "youth", "stadium", "debt"];

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const tenth = (v: number) => Math.round(v * 10) / 10;
const tierOf = (os: Pick<OwnerState, "clubTier">) => Math.min(4, Math.max(1, Math.round(num(os.clubTier, 4))));

/** What a season of ownership pays at the club's tier, in €M. */
export function ownerRevenue(os: Pick<OwnerState, "clubTier">): number {
  return OWNER_TIERS[tierOf(os)].revenue;
}
/** The budget he places this season, in €M. */
export function ownerBudget(os: Pick<OwnerState, "clubTier">): number {
  return tenth(ownerRevenue(os) * OWNER_EFFECTS.budget);
}
/** The club's levels as a save holds them; an older save has none of them. */
export function ownerLevels(os: OwnerState): { squad: number; academy: number; stadium: number; debt: number } {
  return {
    squad: Math.max(0, num(os.squad)),
    academy: Math.min(OWNER_EFFECTS.maxLevel, Math.max(0, Math.floor(num(os.academy)))),
    stadium: Math.min(OWNER_EFFECTS.maxLevel, Math.max(0, Math.floor(num(os.stadium)))),
    debt: Math.max(0, num(os.debt)),
  };
}

/** Whether a call can be made this season: the debt only while there is
 *  some, the academy and the ground only below their top level. */
export function ownerPlanOpen(os: OwnerState, plan: OwnerPlan): boolean {
  const lv = ownerLevels(os);
  if (plan === "debt") return lv.debt > 0;
  if (plan === "youth") return lv.academy < OWNER_EFFECTS.maxLevel;
  if (plan === "stadium") return lv.stadium < OWNER_EFFECTS.maxLevel;
  return plan === "squad";
}

/** The call's name and its one line, with this club's own numbers in it. */
export function ownerPlanWords(os: OwnerState, plan: OwnerPlan): { title: string; line: string } {
  const u = ownerRevenue(os);
  const lv = ownerLevels(os);
  const e = OWNER_EFFECTS;
  if (plan === "squad") {
    return { title: "Sign players", line: `Stronger this season and a bit next, but the wages cost €${tenth(u * e.squadWages)}M.` };
  }
  if (plan === "youth") {
    return { title: "Fund the academy", line: `Nothing this season, then a stronger side and €${tenth(u * e.academySales)}M of sales every season after.` };
  }
  if (plan === "stadium") {
    return { title: "Grow the ground", line: `The building work costs €${tenth(u * e.stadiumWorks)}M now, then €${tenth(u * e.stadiumYield)}M more every season.` };
  }
  const pay = tenth(Math.min(lv.debt, ownerBudget(os)));
  return { title: "Pay down the debt", line: `€${pay}M off the €${tenth(lv.debt)}M owed: less interest, and less pressure to sell your best players.` };
}

/** The club's edge on the table this season, in league points, before or
 *  after the call (`os` as it stands when the season is played). */
export function ownerEdge(os: OwnerState): number {
  const lv = ownerLevels(os);
  return lv.squad + OWNER_EFFECTS.academyEdge * lv.academy - OWNER_EFFECTS.debtDrag * (lv.debt / ownerRevenue(os));
}

export interface OwnerClubForSale {
  name: string;
  tier: number;
  league: string;
  country: string;
  /** The game's estimate for a club of this tier, €M. */
  price: number;
  /** The debt that comes with it, the game's estimate too, €M. */
  debt: number;
}

/** The clubs for sale: two from every band he can afford, cheapest band
 *  first, drawn from a stream keyed to his save so the list is the same on
 *  every visit. Two clubs of one band come from different leagues when the
 *  band has more than one league. */
export function ownerClubsForSale(input: { clubs: readonly ClubData[]; year: number; netWorth: number; key: string }): OwnerClubForSale[] {
  const world = adjustClubsForYear([...input.clubs], input.year);
  const out: OwnerClubForSale[] = [];
  for (const tier of OWNER_SALE_TIERS) {
    const band = OWNER_TIERS[tier];
    if (!(num(input.netWorth) >= band.price)) continue;
    const seen = new Set<string>();
    const pool = world.filter(c => c.tier === tier && c.league && !seen.has(c.name) && seen.add(c.name))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const rng = keyedStream(`${input.key}|forsale|${tier}`);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked: ClubData[] = [];
    for (const c of pool) {
      if (picked.length >= OWNER_PER_BAND) break;
      if (picked.some(p => p.league === c.league)) continue;
      picked.push(c);
    }
    for (const c of pool) {
      if (picked.length >= OWNER_PER_BAND) break;
      if (!picked.includes(c)) picked.push(c);
    }
    for (const c of picked) {
      out.push({ name: c.name, tier, league: leagueKeyInYear(c, input.year) ?? c.league, country: c.country, price: band.price, debt: band.debt });
    }
  }
  return out;
}

/** The save's own key for the owner tail: the identity the summer deck keys on (soccerDeckIdentity in the
 *  engine), then "owner". Here rather than in the engine so the page reaches the list and the call without a new
 *  engine export (the history harnesses bundle the page beside an older engine). */
export function ownerSaveKey(s: Pick<CareerState, "playerName" | "era" | "nationality" | "position">): string {
  return `${s.playerName}|${s.era}|${s.nationality}|${s.position}|owner`;
}

/** The clubs he can buy at the end of this career, the same list on every visit. */
export function ownerClubsOnSale(state: CareerState, clubs: readonly ClubData[]): OwnerClubForSale[] {
  const firstYear = (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1;
  return ownerClubsForSale({ clubs, year: firstYear, netWorth: state.netWorth, key: ownerSaveKey(state) });
}

/** He buys the club he picked off the list for sale, for its band's price, with its band's debt. A caller that
 *  names no club gets the list's first; a name that is not for sale buys nothing (null). */
export function ownerBuy(prev: CareerState, clubs: readonly ClubData[], ownerClub?: string): CareerState | null {
  const forSale = ownerClubsOnSale(prev, clubs);
  const club = ownerClub === undefined
    ? forSale[0] ?? { name: "Unknown FC", tier: 4, league: "", country: "", price: OWNER_TIERS[4].price, debt: 0 }
    : forSale.find(c => c.name === ownerClub);
  if (!club) return null;
  return {
    ...prev,
    netWorth: prev.netWorth - club.price,
    ownerState: ownerStart(club),
    events: [...prev.events, `🏟️ Bought ${club.name} for €${club.price}M, the game's price for a Tier ${club.tier} club${club.debt > 0 ? `, with €${club.debt}M of debt` : ""}.`],
    phase: "owner_season",
  };
}

/** One season of ownership for the career: the season (playOwnerSeason) keyed to his save, its pay into his
 *  account and its line in his log. Null when he owns no club. The engine adds the season of money. */
export function ownerSeason(prev: CareerState, clubs: readonly ClubData[]): CareerState | null {
  const own = prev.ownerState;
  if (!own) return null;
  const season = own.season + 1;
  const year = (prev.seasons[prev.seasons.length - 1]?.year ?? 2024) + season;
  const { os, result, income } = playOwnerSeason(own, { clubs, year, key: `${ownerSaveKey(prev)}|${own.club}|${season}` });
  return { ...prev, netWorth: prev.netWorth + income, ownerState: os, events: [...prev.events, `🏟️ Owner Season ${os.season} at ${os.club}: ${result}`] };
}

/** Where the coming season's budget goes; a call that is not open this season changes nothing. */
export function chooseOwnerPlan(prev: CareerState, plan: OwnerPlan): CareerState {
  if (prev.phase !== "owner_season" || !prev.ownerState || !ownerPlanOpen(prev.ownerState, plan)) return prev;
  return { ...prev, ownerState: { ...prev.ownerState, plan } };
}

/** A new owner's state for the club he bought. */
export function ownerStart(club: OwnerClubForSale): OwnerState {
  return {
    club: club.name,
    clubTier: club.tier,
    ...(club.league ? { league: club.league } : {}),
    season: 0,
    budget: ownerBudget({ clubTier: club.tier }),
    trophies: 0,
    promotions: 0,
    seasonResults: [],
    price: club.price,
    debt: club.debt,
    squad: 0,
    academy: 0,
    stadium: 0,
  };
}

export interface OwnerSeasonOutcome {
  /** The owner's state after the season. */
  os: OwnerState;
  /** The season's line for the log. */
  result: string;
  /** What the season paid him, €M (it can be negative). */
  income: number;
}

/**
 * One season of ownership. The call in `os.plan` is placed first (an engine
 * call with no plan places nothing), then the season is played on the
 * dugout's table with the club's edge, and the finish, the title, a
 * promotion and a relegation are read off that table, exactly as the
 * manager's are. `year` is the season's calendar year, `key` the save's own
 * key for this season (nothing here draws from Math.random).
 */
export function playOwnerSeason(prev: OwnerState, input: { clubs: readonly ClubData[]; year: number; key: string }): OwnerSeasonOutcome {
  const e = OWNER_EFFECTS;
  const os: OwnerState = { ...prev, season: num(prev.season) + 1 };
  const plan = OWNER_PLANS.includes(prev.plan as OwnerPlan) && ownerPlanOpen(prev, prev.plan as OwnerPlan) ? prev.plan as OwnerPlan : undefined;
  delete os.plan;
  const lv = ownerLevels(prev);
  const u = ownerRevenue(prev);
  const budget = ownerBudget(prev);

  /* the call, placed before a ball is kicked */
  let squad = tenth(lv.squad * e.squadKeep);
  let debt = lv.debt;
  if (plan === "squad") squad = tenth(squad + e.squadEdge);
  if (plan === "debt") debt = tenth(Math.max(0, debt - budget));
  const playing: OwnerState = { ...os, squad, debt, academy: lv.academy, stadium: lv.stadium };
  const edge = ownerEdge(playing);

  /* the league, exactly as the manager tail finds it (Rounds 1029 and 1037) */
  const savedLeague = typeof prev.league === "string" && prev.league.trim() ? prev.league : undefined;
  const prevRow = prev.seasonResults[prev.seasonResults.length - 1];
  const sameClub = !!prevRow && prevRow.year === os.season - 1 && prevRow.club === os.club;
  const movedFrom = sameClub && typeof prevRow.league === "string" && prevRow.league !== savedLeague ? prevRow.league : undefined;
  const placed = movedFrom !== undefined || (sameClub && typeof prevRow.league === "string" && prevRow.league === savedLeague && prevRow.lineupUnknown !== true);
  const rng = keyedStream(`${input.key}|table`);
  const lf = managerLeagueField({ clubs: input.clubs, club: os.club, league: savedLeague, year: input.year, from: movedFrom, placed }, rng);
  if (lf.league) playing.league = lf.league;
  const field: (string | null)[] = [...lf.named, ...Array<null>(Math.max(0, lf.size - 1 - lf.named.length)).fill(null)];
  const { table, me, record } = playDugoutTable(field, os.club, edge, rng);
  const leagueSize = table.length;
  const tier = tierOf(prev);
  const champion = me.pos === 1;
  const promoted = tier > 1 && me.pos <= 2;
  const relegated = me.pos >= leagueSize - 2 && tier < 4;
  const move = divisionMove(lf.league, me.pos, leagueSize, input.year);
  const sizeUnknown = lf.league !== null && !lf.sizeVerified;
  const ofSize = lf.sizeVerified ? ` of ${leagueSize}` : "";
  const dest = (to: string) => (lf.lineupUnknown ? "" : ` to the ${to}`);

  let result = champion
    ? (sizeUnknown ? "CHAMPIONS, top of the table. 🏆" : `CHAMPIONS. ${me.pts} points, ${lf.sizeVerified ? `${ordinal(me.pos)}${ofSize}` : "top of the table"}. 🏆`)
    : (sizeUnknown ? `Finished ${finishZone(me.pos, leagueSize)}.` : `Finished ${ordinal(me.pos)}${ofSize} on ${me.pts} points.`);
  let newTier = tier;
  if (promoted) newTier = tier - 1;
  else if (relegated) newTier = tier + 1;
  if (promoted) result += move && move.up ? ` Promoted${dest(move.to)}!` : ` Up to Tier ${newTier}!`;
  else if (relegated) result += move && !move.up ? ` Relegated${dest(move.to)}.` : ` Down to Tier ${newTier}.`;
  else if (move) result += move.up ? ` Promoted${dest(move.to)}!` : ` Relegated${dest(move.to)}.`;

  /* the money: the tier's revenue, the ground, the academy's sales, less the
     interest, and this season's cost of the call */
  const income = tenth(u * (1 + e.stadiumYield * lv.stadium + e.academySales * lv.academy)
    - e.interest * debt
    - (plan === "squad" ? u * e.squadWages : 0)
    - (plan === "stadium" ? u * e.stadiumWorks : 0));
  result += ` Income €${income}M.`;

  playing.academy = plan === "youth" ? Math.min(e.maxLevel, lv.academy + 1) : lv.academy;
  playing.stadium = plan === "stadium" ? Math.min(e.maxLevel, lv.stadium + 1) : lv.stadium;
  playing.clubTier = newTier;
  if (champion) playing.trophies = num(prev.trophies) + 1;
  if (promoted) playing.promotions = num(prev.promotions) + 1;
  if (move) playing.league = move.to;
  playing.budget = ownerBudget(playing);

  const row: OwnerSeasonRow = {
    year: os.season, club: me.club, tier: newTier, result, trophy: champion,
    table: table.slice(0, 5).some(r => r.you) ? table.slice(0, 5) : [...table.slice(0, 4), me],
    playerPos: me.pos, playerPts: me.pts, leagueSize, record,
    ...(lf.league ? { league: lf.league } : {}),
    ...(lf.sizeVerified ? { sizeVerified: true } : {}),
    knownRivals: lf.named.length,
    ...(lf.lineupUnknown ? { lineupUnknown: true } : {}),
    ...(lf.leagueName && lf.leagueName !== lf.league ? { leagueName: lf.leagueName } : {}),
    ...(plan ? { plan } : {}),
    edge: tenth(edge),
    income,
  };
  playing.seasonResults = [...prev.seasonResults, row];
  return { os: playing, result, income };
}

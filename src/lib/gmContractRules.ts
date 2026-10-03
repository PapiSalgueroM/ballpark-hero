/**
 * Round 908: each league's own contract rules, with their sources.
 *
 * The re-sign desk (src/lib/gmContracts.ts) is one engine for four sports.
 * What makes the NFL desk feel like the NFL and the NBA desk like the NBA is
 * this file: the mechanisms each league really has for keeping its own
 * players, written down as data, each with the two places it was read and the
 * day it was read. It is the src/lib/leagueCaps.ts shape applied to rules.
 *
 * WHAT IS REAL AND WHAT IS NOT. The MECHANISMS below are the leagues' own:
 * who is eligible, how many seasons, what the club may do and what it gets
 * back. THE MONEY IS NOT. Every salary in the four front offices is the
 * game's own invented figure, priced off a rating by each engine's own
 * formula, and no real contract, cap hit or arbitration award is in here or
 * anywhere near it. Where a real rule is defined in dollars (the NHL offer
 * sheet ladder) it is recorded as read and then turned into a share of that
 * season's cap, and the conversion is the game's own assumption, said so at
 * the place it is made. The desk prints contractRulesNote() beside every ask.
 *
 * WHAT THE GAME CANNOT KNOW. No engine records a real player's service time,
 * his seasons with his club or the round he was drafted in. The desk never
 * guesses those. A rule that needs one of them applies only where the SAVE
 * knows it: a man the GM drafted in this save, counted from that draft. A man
 * who was already on the roster when the desk opened is treated as a veteran
 * with full rights and no club control, and the desk says "the game does not
 * know his service time" instead of printing a number for it.
 *
 * Every source below was read on CONTRACT_RULES_AS_OF. Where only one source
 * could be read (the second refused the read that day) the rule carries
 * singleSource: true and says which half rests on one publisher.
 *
 * Updating: reread both sources for a rule, change the data and its "says"
 * lines together, and move the date. scripts/simGmContracts.mjs section 5
 * fails on a rule with fewer than two sources that is not marked.
 */

/** The day every source in this file was read. */
export const CONTRACT_RULES_AS_OF = '2026-10-02';
/** Human readable, for the line the desk prints. */
export const CONTRACT_RULES_AS_OF_LABEL = 'October 2026';

export type GmSportKey = 'nfl' | 'nba' | 'mlb' | 'nhl';

export interface RuleSource {
  url: string;
  /** What that page says, in this file's own words, short. */
  says: string;
}

export interface ContractRule {
  id: string;
  sport: GmSportKey;
  /** The mechanism's own name, as the league calls it. */
  name: string;
  /** One or two plain sentences for the desk's "?" panel. */
  plain: string;
  /** How this game applies it, including what it simplifies. */
  inGame: string;
  sources: RuleSource[];
  /** True when part of the rule rests on one publisher. See the note beside it. */
  singleSource?: boolean;
}

/* ------------------------------------------------------------------ */
/* NFL                                                                */
/* ------------------------------------------------------------------ */

/** Drafted rookies sign four year deals. Both sources. */
export const NFL_ROOKIE_DEAL_YEARS = 4;
/** The option buys exactly one more season. */
export const NFL_OPTION_YEARS = 1;
/** Only a first round pick's deal carries the option. */
export const NFL_OPTION_ROUND = 1;
/** The league prices the option in four tiers: basic, playing time, one Pro Bowl, more than one. */
export const NFL_OPTION_TIERS = 4;

/* ------------------------------------------------------------------ */
/* NBA                                                                */
/* ------------------------------------------------------------------ */

export type BirdTier = 'none' | 'non' | 'early' | 'full';

/** Seasons with the club, without changing teams as a free agent, that earn each tier. */
export const NBA_BIRD_SEASONS = { non: 1, early: 2, full: 3 } as const;
/** Non-Bird: up to this multiple of his previous salary. Two publishers, see the rule. */
export const NBA_NON_BIRD_RAISE = 1.2;
/** Early Bird: up to this multiple of his previous salary, or the next line, whichever is greater. */
export const NBA_EARLY_BIRD_RAISE = 1.75;
/** Early Bird: or this multiple of the league average salary. */
export const NBA_EARLY_BIRD_AVERAGE = 1.05;
/** Early Bird deals run two to four seasons, full Bird up to five. */
export const NBA_EARLY_BIRD_MAX_YEARS = 4;
export const NBA_EARLY_BIRD_MIN_YEARS = 2;
export const NBA_BIRD_MAX_YEARS = 5;

/** The most a first year salary may be, as a share of the cap, by seasons in the league. */
export const NBA_MAX_SHARE: { maxService: number; share: number }[] = [
  { maxService: 6, share: 0.25 },
  { maxService: 9, share: 0.3 },
  { maxService: Number.POSITIVE_INFINITY, share: 0.35 },
];

/* ------------------------------------------------------------------ */
/* MLB                                                                */
/* ------------------------------------------------------------------ */

/** Seasons of service before a player may go to arbitration. */
export const MLB_ARBITRATION_AFTER = 3;
/** Seasons of service before a player may be a free agent. */
export const MLB_FREE_AGENCY_AFTER = 6;
/** So there are this many arbitration seasons in between. */
export const MLB_ARBITRATION_SEASONS = MLB_FREE_AGENCY_AFTER - MLB_ARBITRATION_AFTER;
/** The qualifying offer is one season at the mean of this many top salaries. */
export const MLB_QUALIFYING_OFFER_TOP = 125;
export const MLB_QUALIFYING_OFFER_YEARS = 1;

/* ------------------------------------------------------------------ */
/* NHL                                                                */
/* ------------------------------------------------------------------ */

/** A restricted free agent is under this age with fewer than this many seasons. */
export const NHL_RFA_UNDER_AGE = 27;
export const NHL_RFA_UNDER_SEASONS = 7;
/** Days the club has to match an offer sheet. */
export const NHL_MATCH_DAYS = 7;
/** Entry level deal length by the age he signs at. Three sources, see the rule. */
export const NHL_ENTRY_LEVEL_YEARS: { maxAge: number; years: number }[] = [
  { maxAge: 21, years: 3 },
  { maxAge: 23, years: 2 },
  { maxAge: 24, years: 1 },
];

/** The cap the published ladder below was set against, $M (2025-26). */
export const NHL_OFFER_SHEET_LADDER_CAP = 95.5;

export interface OfferSheetTier {
  /** The tier covers an average annual value up to and including this, $M. */
  upTo: number;
  /** Draft picks owed, by round, e.g. [1, 3] is a first and a third. */
  picks: number[];
}

/** The 2025-26 ladder, as published: seven tiers from nothing to four firsts. */
export const NHL_OFFER_SHEET_LADDER: OfferSheetTier[] = [
  { upTo: 1.544424, picks: [] },
  { upTo: 2.340037, picks: [3] },
  { upTo: 4.680076, picks: [2] },
  { upTo: 7.020113, picks: [1, 3] },
  { upTo: 9.360153, picks: [1, 2, 3] },
  { upTo: 11.700192, picks: [1, 1, 2, 3] },
  { upTo: Number.POSITIVE_INFINITY, picks: [1, 1, 1, 1] },
];

/* ------------------------------------------------------------------ */
/* The rules, with what was read and where                             */
/* ------------------------------------------------------------------ */

export const CONTRACT_RULES: ContractRule[] = [
  {
    id: 'nfl-franchise-tag',
    sport: 'nfl',
    name: 'Franchise tag',
    plain: 'Each club may tag one of its own free agents a year and keep him for one season at a set, fully guaranteed tender.',
    inGame: 'Already in the NFL front office since Round 723, with its own sources in src/lib/frontOffice.ts. A tagged man never reaches the desk.',
    sources: [
      { url: 'https://www.profootballhof.com/news/2020-franchise-and-transition-players-named', says: 'Each club may designate one franchise player among its veteran free agents.' },
      { url: 'https://www.buffalobills.com/news/a-closer-look-what-is-the-franchise-tag-12632897', says: 'One year, at the mean of the five largest prior year salaries at his position or 120 percent of his own prior year salary, whichever is greater.' },
    ],
  },
  {
    id: 'nfl-fifth-year-option',
    sport: 'nfl',
    name: 'Fifth year option',
    plain: "Every drafted rookie signs for four years. A first round pick's deal also carries a club option for a fifth, decided after his third season, fully guaranteed once it is picked up, and priced in four tiers by how much he has played and how many Pro Bowls he has made.",
    inGame: 'Offered only on a man this GM drafted in the first round, once, and it adds exactly one guaranteed season. Deals here carry one salary for their whole length, so the desk asks when the rookie deal runs out, which is the season the option year would start. The four tiers are read off his rating, because the game has no Pro Bowl vote.',
    sources: [
      { url: 'https://www.espn.com/nfl/story/_/id/39900614/fifth-year-option-tracker-nfl-players-2021-first-round-draft-class', says: 'First round picks only; four year rookie deals; fully guaranteed once exercised; four tiers: basic, playing time, one Pro Bowl, multiple Pro Bowls.' },
      { url: 'https://www.si.com/nfl/draft/how-rookie-contracts-work-nfl-salary-length', says: 'All drafted rookies get four year contracts; first round picks have a fifth year team option, priced after the third season on performance, playing time and accolades.' },
    ],
  },
  {
    id: 'nba-bird-rights',
    sport: 'nba',
    name: 'Bird rights',
    plain: 'A club may go over the salary cap to re-sign its own player. After three seasons with the club he has full Bird rights: up to five years at anything up to his maximum salary. After two he has Early Bird rights: up to 175 percent of his last salary or 105 percent of the league average, whichever is greater, for two to four years. After one he has Non-Bird rights: up to 120 percent of his last salary. Changing teams as a free agent restarts the count.',
    inGame: 'The count runs from the season the desk first saw him on this roster. A man who was already here when the desk opened, or who came in a trade, gets full rights, because the game does not know how long he had been with his club. A man signed from the pool starts at zero. The rights only matter when the club has no cap room for his ask, and the tax and the aprons still bill the payroll exactly as they did before.',
    sources: [
      { url: 'https://www.hoopsrumors.com/2026/03/hoops-rumors-glossary-bird-rights-8.html', says: 'Three seasons with the same team; re-sign for up to five years at any price up to his maximum, whatever the cap room; the clock resets when he changes teams as a free agent or is waived.' },
      { url: 'https://www.cbssports.com/nba/news/nba-salary-cap-explained-glossary-for-the-terms-you-need-to-know-ahead-of-basketball-free-agency/', says: 'Non-Bird after one season, up to 120 percent of previous salary; Early Bird after two, up to 175 percent or 105 percent of the average salary; full Bird after three, anything up to the maximum.' },
      { url: 'https://www.hoopsrumors.com/2025/03/hoops-rumors-glossary-early-bird-rights-8.html', says: 'Early Bird after two seasons: 175 percent of previous salary or 105 percent of the league average, whichever is greater, two to four years.' },
      { url: 'https://www.hoopsrumors.com/2022/04/hoops-rumors-glossary-non-bird-rights-6.html', says: 'Non-Bird covers a man with a season or less with his club: a starting salary up to 120 percent of his previous one, up to four years.' },
    ],
  },
  {
    id: 'nba-max-salary',
    sport: 'nba',
    name: 'Maximum salary',
    plain: 'No first year salary may be more than a set share of the cap: 25 percent for a player with six seasons or fewer in the league, 30 percent with seven to nine, 35 percent with ten or more.',
    inGame: "No ask at the desk goes over the share for his tier. The game does not know a real player's seasons in the league, so a man it did not draft is read at the top tier, which can only ever let him ask for more, never less, than the league would. A man this GM drafted is counted from his draft.",
    sources: [
      { url: 'https://www.hoopsrumors.com/2024/05/hoops-rumors-glossary-maximum-salary-4.html', says: 'Six seasons or fewer: up to 25 percent of the cap; seven to nine: 30 percent; ten or more: 35 percent.' },
      { url: 'https://www.cbssports.com/nba/news/nba-salary-cap-explained-glossary-for-the-terms-you-need-to-know-ahead-of-basketball-free-agency/', says: '25 percent for most players with four to six years, 30 percent with seven to nine, 35 percent with ten or more.' },
    ],
  },
  {
    id: 'mlb-club-control',
    sport: 'mlb',
    name: 'Pre arbitration, arbitration and free agency',
    plain: "For his first three seasons of service the club sets a player's salary. From three seasons to six he is eligible for salary arbitration each winter, usually three times. After six seasons of service he is a free agent.",
    inGame: "Applies to a man this GM drafted, counted from his draft, because that is the only service time the save knows. While he is under control the desk offers a one year tender at the game's own figure and he cannot walk unless the club lets him go. Everybody else is treated as a free agent when his deal runs out. There is no Super Two class and no hearing: the tender is a formula.",
    sources: [
      { url: 'https://www.mlb.com/glossary/transactions/salary-arbitration', says: 'Eligible at three years of service, each offseason until six years; before that the player has no say in his salary.' },
      { url: 'https://www.cbssports.com/mlb/news/everything-you-need-to-know-from-mlbs-salary-arbitration-filing-deadline/', says: 'More than three and less than six years of service are arbitration eligible; six or more are free agents; Super Two players go four times instead of three.' },
    ],
  },
  {
    id: 'mlb-qualifying-offer',
    sport: 'mlb',
    name: 'Qualifying offer',
    plain: 'A club may offer its own free agent one season at the average of the 125 highest salaries in the game. He must have spent the whole season with the club and never have had the offer before. If he turns it down and signs elsewhere, his old club gets a draft pick.',
    inGame: "The figure is the mean of the 125 highest salaries in this save, so it is the game's own money. He takes it when it meets his ask, and turns it down otherwise, in which case he leaves and the club is owed one extra pick in the next draft. One offer per man, ever, kept in the desk's ledger.",
    sources: [
      { url: 'https://www.cbssports.com/mlb/news/mlb-qualifying-offer-predictions-contract-kyle-schwarber-bo-bichette-kyle-tucker/', says: 'A one year deal at the average of the top 125 salaries; only for a player who spent the whole season with the team and never received it before; draft pick compensation when he rejects it and signs elsewhere.' },
      { url: 'https://www.espn.com/mlb/story/_/id/46874206/sources-cubs-kyle-tucker-13-get-22m-qualifying-offer', says: 'A one year deal; a player who accepts cannot be given the offer again; draft picks change hands when a tagged free agent signs elsewhere.' },
      { url: 'https://www.justbaseball.com/mlb/which-free-agents-cant-receive-qualifying-offer/', says: 'A free agent cannot get the offer if he has had one before or if he was traded during the season just played.' },
    ],
  },
  {
    id: 'nhl-entry-level',
    sport: 'nhl',
    name: 'Entry level contract',
    plain: "A player's first NHL deal is an entry level contract, with its length set by his age when he signs (three years from 18 to 21, two at 22 or 23, one at 24) and its salary and bonuses capped.",
    inGame: 'A man this GM drafted plays out whatever first deal the engine gave him at the draft, and the desk does not reprice it. When it runs out he comes to the desk as a restricted free agent (the next rule). Nothing in the game is priced off the age ladder.',
    sources: [
      { url: 'https://www.nhl.com/flyers/news/transaction-analysis-explaining-bonk-s-entry-level-deal-345659582', says: 'Signed at 18, the entry level deal is three years; the agreement sets length by signing age and caps base salary and bonuses.' },
      { url: 'https://www.dkpittsburghsports.com/2020/10/10/nhl-waivers-contracts-faq-tlh', says: 'Entry level deals run three years for players aged 18 to 21, two for 22 and 23, one for 24.' },
      { url: 'https://fansided.com/nhl/what-does-entry-level-contract-mean-in-the-nhl-rules-explained-for-draft-picks', says: 'Three years when he signs between 18 and 21, two at 22 or 23, one at 24; from 25 no entry level deal is needed.' },
    ],
  },
  {
    id: 'nhl-restricted-free-agency',
    sport: 'nhl',
    name: 'Restricted free agency, the qualifying offer and offer sheets',
    plain: "When a young player's deal runs out (under 27, fewer than seven seasons) he is a restricted free agent. His club keeps his rights by making a qualifying offer. Another club may then sign him to an offer sheet. His club has seven days to match it, or lets him go and takes draft picks set by a ladder: the richer the sheet, the more picks, from nothing up to four first rounders. The picks must be the signing club's own.",
    inGame: "Applies to a man this GM drafted, by his age. The qualifying offer is one season at his last salary, which is the game's own figure. Whether a rival tables a sheet is fixed by the player and the season, not by a draw, so reopening the desk cannot change it. The ladder is the published 2025-26 one turned into shares of that season's cap. This game's draft has two rounds, so third round picks on the ladder are not paid.",
    sources: [
      { url: 'https://pittsburghhockeynow.com/nhl-releases-new-rfa-offer-sheet-compensation-levels/', says: "The seven tier 2025-26 ladder in dollars; a qualifying offer keeps the club's rights; seven days to match; the signing club must hold its own picks." },
      { url: 'https://www.dailyfaceoff.com/news/nhl-new-offer-sheet-compensation-thresholds-revealed-salary-cap-rfa-free-agent-matthew-knies', says: 'The same seven tiers, 1.54M to 11.7M and over, set as the cap rose to 95.5M.' },
      { url: 'https://soundofhockey.com/2025/03/20/explaining-how-offer-sheets-work-in-the-nhl/', says: "An offer sheet goes to a restricted free agent under 27 with fewer than seven seasons who has had a qualifying offer; seven days to match; compensation must be the club's own picks." },
    ],
  },
];

export function contractRulesFor(sport: GmSportKey): ContractRule[] {
  return CONTRACT_RULES.filter(r => r.sport === sport);
}

/** The one line the desk prints beside every ask, so nobody reads a salary here as a real one. */
export function contractRulesNote(): string {
  return `The rules are each league's own, read in ${CONTRACT_RULES_AS_OF_LABEL}. The money is this game's own figure, not anybody's real contract.`;
}

/** The NBA maximum, as a share of the cap, for a man with this many seasons in the league. */
export function nbaMaxShare(service: number): number {
  for (const tier of NBA_MAX_SHARE) if (service <= tier.maxService) return tier.share;
  return NBA_MAX_SHARE[NBA_MAX_SHARE.length - 1].share;
}

/**
 * The picks an offer sheet costs at this average annual value under this cap.
 * THE GAME'S OWN CONVERSION: the published ladder is in 2025-26 dollars, so
 * each rung is taken as a share of that season's 95.5M cap and applied to the
 * cap in the save. The league moves its rungs with the average salary; the
 * save has no such figure and its cap is what its salaries are priced against.
 */
export function offerSheetPicks(aav: number, cap: number): number[] {
  const scaled = aav * (NHL_OFFER_SHEET_LADDER_CAP / Math.max(1, cap));
  for (const tier of NHL_OFFER_SHEET_LADDER) if (scaled <= tier.upTo) return [...tier.picks];
  return [...NHL_OFFER_SHEET_LADDER[NHL_OFFER_SHEET_LADDER.length - 1].picks];
}

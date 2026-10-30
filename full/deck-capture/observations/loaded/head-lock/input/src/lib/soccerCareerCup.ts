/* Round 1041: the domestic cup, named by country and played as a run.

   Before this round a cup was one Math.random coin by tier, stored as the
   domesticCup flag. A win printed "Won the Domestic Cup" and a loss printed
   nothing, and the coin ran in countries and seasons where no cup was played.
   This module says, for each football association and season, whether a cup
   was played and what it was called, and draws the run a season's cup went
   through, from its own generator, so the main Math.random stream does not
   move by one call:

   - NAMED: a cup was played, its name and the shape of its final are known;
   - NONE: no cup was played (or none was finished and nobody won it), so the
     season has no cup, no run, and the coin's win is taken back;
   - UNKNOWN: not researched, or the entry depended on the club that season,
     so the cup keeps today's words ("the domestic cup") and is never named.

   Pure: no state, no clock, no Math.random. It imports careerEras and the
   continental cup's goal draw only, never Club Manager. */
import { adjustClubsForYear } from "./careerEras";
import { poissonGoals } from "./soccerCareerContinental";
import { keyedRng } from "./keyedRng";
import type { ClubData, UCLKnockoutMatch } from "./soccerCareerEngine";

/** How a final that is level at the end was settled, where two sources
 *  record it: a replay (a one match final), penalties, or away goals (a two
 *  legged final). A window with no decider never draws a level final. The
 *  words are the Champions League knockout's own (UCLKnockoutMatch.decidedBy),
 *  plus 'replay', which that competition never had. */
export type CupDecider = "replay" | Extract<UCLKnockoutMatch["decidedBy"], "penalties" | "awayGoals">;

interface CupWindow {
  from: number;
  to?: number;
  kind: "NAMED" | "NONE" | "UNKNOWN";
  name?: string;
  /** One match or two legs, where two sources say which. No legs, no score. */
  legs?: 1 | 2;
  decider?: CupDecider;
  /** Why a window is NONE or UNKNOWN, kept beside the data it explains. */
  why?: string;
}

/* ─── The table ───
   Keyed by association and by the season's START year (the game prints
   season Y as Y/Y+1), the same shape and rule as LEAGUE_SIZES in
   soccerCareerLeague.ts. Seasons after the latest window keep the latest
   window: the game's future is its own, and the cup it plays is the one in
   force today.

   CALENDAR YEAR LEAGUES (Brazil, the USA, Canada, Japan, South Korea, and
   Argentina since its switch): season Y plays the cup edition of calendar
   year Y, the rule soccerCareerDerby.ts already uses for the Brasileirao.

   Every window was read on 2026-10-06 from two sources that are not
   Wikipedia, and nineteen corrections from independent checkers who
   refetched them were applied before anything here shipped. The sources,
   the read date and each correction are in scripts/data/
   domesticCupSources.json, and scripts/simCareerDomesticCup.mjs pins this
   table's digest against that file, so neither moves alone.

   What the table deliberately does not claim:
   - the rounds before the final. The run labels them back from the final
     (the early rounds, the quarter-final, the semi-final) and never counts
     or names an early round, because the number of rounds changed by season
     and was not researched; ties before the final are shown as one match;
   - a final score where the legs are not two sourced (South Korea and
     Belgium), and a level final anywhere but a window whose decider is
     penalties;
   - a club's entry where it depended on the club: Brazil (entry by state
     championship places, and the Libertadores clubs were excused 2001 to
     2012), the USA in the years only some MLS clubs entered (1996 to 1999,
     2002, 2007 to 2011, and from 2024), Mexico while clubs in continental
     play sat the Copa MX out, Japan's 2020 edition (only the top two J1 clubs
     entered) and Canada's 2020 final (only the top Canadian MLS club). */
export const DOMESTIC_CUPS: Readonly<Record<string, readonly CupWindow[]>> = {
  England: [
    { from: 1990, to: 1997, kind: "NAMED", name: "FA Cup", legs: 1, decider: "replay" },
    { from: 1998, kind: "NAMED", name: "FA Cup", legs: 1, decider: "penalties" },
  ],
  Scotland: [{ from: 1990, kind: "NAMED", name: "Scottish Cup", legs: 1, decider: "penalties" }],
  Spain: [{ from: 1990, kind: "NAMED", name: "Copa del Rey", legs: 1, decider: "penalties" }],
  Italy: [
    { from: 1990, to: 2006, kind: "NAMED", name: "Coppa Italia", legs: 2, decider: "awayGoals" },
    { from: 2007, kind: "NAMED", name: "Coppa Italia", legs: 1, decider: "penalties" },
  ],
  Germany: [{ from: 1990, kind: "NAMED", name: "DFB-Pokal", legs: 1, decider: "penalties" }],
  France: [
    { from: 1990, to: 1990, kind: "NAMED", name: "Coupe de France", legs: 1, decider: "penalties" },
    { from: 1991, to: 1991, kind: "NONE", why: "stopped after the Furiani disaster in May 1992, no final and no winner" },
    { from: 1992, kind: "NAMED", name: "Coupe de France", legs: 1, decider: "penalties" },
  ],
  Netherlands: [
    { from: 1990, to: 2008, kind: "NAMED", name: "KNVB Cup", legs: 1, decider: "penalties" },
    { from: 2009, to: 2009, kind: "NAMED", name: "KNVB Cup", legs: 2 },
    { from: 2010, to: 2018, kind: "NAMED", name: "KNVB Cup", legs: 1, decider: "penalties" },
    { from: 2019, to: 2019, kind: "NONE", why: "the final was postponed and then cancelled, no winner was named" },
    { from: 2020, kind: "NAMED", name: "KNVB Cup", legs: 1, decider: "penalties" },
  ],
  Portugal: [
    { from: 1990, to: 1999, kind: "NAMED", name: "Taça de Portugal", legs: 1, decider: "replay" },
    { from: 2000, to: 2013, kind: "NAMED", name: "Taça de Portugal", legs: 1, why: "no final was level after extra time, and the season the replay gave way to penalties is not two sourced" },
    { from: 2014, kind: "NAMED", name: "Taça de Portugal", legs: 1, decider: "penalties" },
  ],
  Turkey: [
    { from: 1990, to: 1990, kind: "NAMED", name: "Federation Cup", legs: 1 },
    { from: 1991, to: 1991, kind: "NAMED", name: "Federation Cup", legs: 2 },
    { from: 1992, to: 1998, kind: "NAMED", name: "Turkish Cup", legs: 2 },
    { from: 1999, kind: "NAMED", name: "Turkish Cup", legs: 1, decider: "penalties" },
  ],
  Greece: [
    { from: 1990, to: 1991, kind: "NAMED", name: "Greek Cup", legs: 2 },
    { from: 1992, kind: "NAMED", name: "Greek Cup", legs: 1, decider: "penalties" },
  ],
  Belgium: [{ from: 1990, kind: "NAMED", name: "Belgian Cup", why: "one match finals in every season rest on one source, so no final score" }],
  Japan: [
    { from: 1990, to: 2019, kind: "NAMED", name: "Emperor's Cup", legs: 1, decider: "penalties" },
    { from: 2020, to: 2020, kind: "UNKNOWN", why: "the COVID edition: only the top two J1 clubs entered" },
    { from: 2021, to: 2025, kind: "NAMED", name: "Emperor's Cup", legs: 1, decider: "penalties" },
    { from: 2026, kind: "UNKNOWN", why: "the J.League moves to an autumn to spring season in 2026 and the 106th edition was not researched" },
  ],
  "South Korea": [
    { from: 1990, to: 1995, kind: "NONE", why: "the KFA founded the cup in 1996" },
    { from: 1996, to: 2023, kind: "NAMED", name: "Korean FA Cup", why: "the final's legs by season rest on one source, and a checker found that source contradicted, so no final score" },
    { from: 2024, kind: "UNKNOWN", why: "the rename to Korea Cup rests on one source" },
  ],
  Brazil: [
    { from: 1990, to: 2025, kind: "UNKNOWN", why: "entry went by state championship places, not division, and the Libertadores clubs were excused 2001 to 2012" },
    { from: 2026, kind: "NAMED", name: "Copa do Brasil", legs: 1, why: "all 20 Serie A clubs enter; whether extra time comes before penalties in the one match final is disputed" },
  ],
  USA: [
    { from: 1990, to: 1995, kind: "UNKNOWN", why: "no MLS before 1996" },
    { from: 1996, to: 1999, kind: "UNKNOWN", why: "only some MLS clubs entered" },
    { from: 2000, to: 2001, kind: "NAMED", name: "U.S. Open Cup", legs: 1 },
    { from: 2002, to: 2002, kind: "UNKNOWN", why: "only some MLS clubs entered" },
    { from: 2003, to: 2006, kind: "NAMED", name: "U.S. Open Cup", legs: 1 },
    { from: 2007, to: 2011, kind: "UNKNOWN", why: "the top six MLS clubs entered and the rest qualified" },
    { from: 2012, to: 2019, kind: "NAMED", name: "U.S. Open Cup", legs: 1 },
    { from: 2020, to: 2021, kind: "NONE", why: "cancelled both years (COVID-19)" },
    { from: 2022, to: 2023, kind: "NAMED", name: "U.S. Open Cup", legs: 1 },
    { from: 2024, kind: "UNKNOWN", why: "from 2024 only some MLS clubs enter" },
  ],
  Canada: [
    { from: 1990, to: 2007, kind: "NONE", why: "the Canadian Championship began in 2008, and Canadian clubs cannot enter the U.S. Open Cup" },
    { from: 2008, to: 2010, kind: "UNKNOWN", why: "a round robin of three clubs, no final" },
    { from: 2011, to: 2019, kind: "NAMED", name: "Canadian Championship", legs: 2, decider: "awayGoals" },
    { from: 2020, to: 2020, kind: "UNKNOWN", why: "one final between the top Canadian MLS club and the CPL winner" },
    { from: 2021, to: 2021, kind: "NAMED", name: "Canadian Championship", legs: 1 },
    { from: 2022, to: 2023, kind: "NAMED", name: "Canadian Championship", why: "the one match finals of 2022 and 2023 rest on one source, so no final score" },
    { from: 2024, to: 2024, kind: "NAMED", name: "Canadian Championship", legs: 1, decider: "penalties" },
    { from: 2025, kind: "NAMED", name: "Canadian Championship", legs: 1, why: "a one match final; penalties are two sourced for 2024 only" },
  ],
  Mexico: [
    { from: 1990, to: 1996, kind: "UNKNOWN", why: "the Copa Mexico seasons of the early 1990s rest on one source" },
    { from: 1997, to: 2011, kind: "NONE", why: "no cup from 1997-98 until the Apertura 2012" },
    { from: 2012, to: 2019, kind: "UNKNOWN", why: "two editions a season, and clubs in continental play sat it out" },
    { from: 2020, kind: "NONE", why: "no cup since 2019-20; a return was announced in August 2026 with nothing confirmed" },
  ],
  Argentina: [
    { from: 1990, to: 1992, kind: "NONE", why: "no Copa Argentina between 1970 and 2011-12" },
    { from: 1993, to: 1993, kind: "UNKNOWN", why: "the AFA's Copa Centenario, a knockout cup for the first division clubs, ran from June 1993 to January 1994; whether it counts as that season's domestic cup was not researched" },
    { from: 1994, to: 2010, kind: "NONE", why: "no Copa Argentina between 1970 and 2011-12" },
    { from: 2011, kind: "UNKNOWN", why: "13 editions over 15 seasons across the switch to calendar years and the COVID break, so which season played which edition is not two sourced" },
  ],
  "New Zealand": [
    { from: 1990, to: 2025, kind: "UNKNOWN", why: "the New Zealand A-League clubs played the Australia Cup in some years, entry not researched by year" },
    { from: 2026, kind: "NONE", why: "Auckland FC and Wellington Phoenix enter no Australia Cup from 2026 and no other domestic cup" },
  ],
  "Saudi Arabia": [{ from: 1990, kind: "UNKNOWN", why: "every fact read rests on one source" }],
};

/* ─── Clubs that play another association's cup ───
   Welsh clubs in the English league system enter the FA Cup like any English
   club of their division, and AS Monaco enters the Coupe de France like any
   French club (both two sourced in the ledger). Keyed by the club's country,
   then the leagues that carry it across; a Welsh club outside the English
   leagues would play its own country's cup, which this table does not hold. */
const CROSS_BORDER: Readonly<Record<string, { leagues: readonly string[]; association: string }>> = {
  Wales: { leagues: ["Premier League", "Championship", "League One", "League Two"], association: "England" },
  Monaco: { leagues: ["Ligue 1", "Ligue 2"], association: "France" },
};

/** The association whose cup a club plays: its country, or the one across
 *  the border whose league it plays in. */
export function cupAssociation(country: string, league: string): string {
  const x = CROSS_BORDER[country];
  return x && x.leagues.includes(league) ? x.association : country;
}

export type CupStatus =
  | { kind: "NAMED"; association: string; name: string; legs?: 1 | 2; decider?: CupDecider }
  | { kind: "NONE"; association: string }
  | { kind: "UNKNOWN"; association: string };

/** Whether that association played a cup in the season starting in `year`,
 *  and what it was. A season before an association's first window, or an
 *  association the table does not hold, is UNKNOWN: today's behaviour. */
export function cupFor(association: string, year: number): CupStatus {
  const windows = DOMESTIC_CUPS[association];
  if (!windows || windows.length === 0 || year < windows[0].from) return { kind: "UNKNOWN", association };
  let w = windows[windows.length - 1];
  for (const x of windows) {
    if (year >= x.from && (x.to === undefined || year <= x.to)) { w = x; break; }
  }
  if (w.kind === "NAMED" && w.name) {
    return { kind: "NAMED", association, name: w.name, ...(w.legs ? { legs: w.legs } : {}), ...(w.decider ? { decider: w.decider } : {}) };
  }
  return w.kind === "NONE" ? { kind: "NONE", association } : { kind: "UNKNOWN", association };
}

/* ─── The phone's world, by association ───
   worldSeasonTick crowns a cup winner per era league, but a cup belongs to a
   whole association: a Championship side that wins the FA Cup is the winner
   of the cup the Premier League's clubs play too. This maps each world league
   to the association whose cup it stands for. */
export const WORLD_LEAGUE_ASSOCIATION: Readonly<Record<string, string>> = {
  "Premier League": "England",
  "La Liga": "Spain",
  "Bundesliga": "Germany",
  "Serie A": "Italy",
  "Ligue 1": "France",
  "Primeira Liga": "Portugal",
  "Eredivisie": "Netherlands",
  "Scottish Premiership": "Scotland",
  "Brasileirao": "Brazil",
  "Saudi Pro League": "Saudi Arabia",
  "MLS": "USA",
  "K League 1": "South Korea",
};

/** The world league whose cup winner is that association's, if any. */
export function worldLeagueOf(association: string): string | null {
  for (const [lg, a] of Object.entries(WORLD_LEAGUE_ASSOCIATION)) if (a === association) return lg;
  return null;
}

/* ─── The cup's odds ───
   One number, read by the engine's coin (generateSeasonStats) and by the
   run below, so the run comes from the trophy's own odds. Unchanged from the
   coin it replaces: 0.35 for the era's elite, 0.20 tier 1, 0.15 tier 2,
   0.05 below, plus the season's performance boost, capped at 0.60. */
export function seasonPerformanceBoost(overall: number, rating: number): number {
  return (overall >= 85 && rating >= 7.5) ? 0.15
    : (overall >= 80 && rating >= 7.0) ? 0.10
    : (overall >= 75 && rating >= 6.8) ? 0.05 : 0;
}
export function cupChanceFor(input: { elite: boolean; tier: number; performanceBoost: number }): number {
  const base = input.elite ? 0.35 : input.tier === 1 ? 0.20 : input.tier === 2 ? 0.15 : 0.05;
  return Math.min(0.60, base + input.performanceBoost);
}

/* ─── The run, as a season row keeps it ───
   SeasonRecord.cupRun, added only to a playing season whose association
   played a cup and whose pool can name the opponents, so a ban, prison,
   injury or pre-round row has no key and renders exactly as before. `cup` is
   present only for a NAMED window. Round 1045's Season Centre reads the same
   shape through readCupRun. */
export type CupStage = "early" | "QF" | "SF" | "F";
export interface CupTie {
  stage: CupStage;
  /** The opponent, on every stage but the early rounds, which are never named. */
  opp?: string;
  won: boolean;
  /** A quarter-final or semi-final, shown as one match: the score. */
  for?: number;
  against?: number;
  /** A quarter-final only: drawn at his ground or away. No line prints it,
   *  because how each cup's quarter-finals were played (one match at a
   *  club's ground, or two legs) by season was not researched; a reader that
   *  wants to print it needs that research first. A semi-final carries no
   *  ground at all: the FA Cup's are played at a neutral ground (Wembley
   *  since 2008), and other cups played theirs over two legs. */
  home?: boolean;
}
export interface CupFinal {
  /** The score, or the aggregate of a two legged final, from his side. */
  for: number;
  against: number;
  legs: 1 | 2;
  /** How a level final was settled, in the Champions League knockout's
   *  words and fields (UCLKnockoutMatch.decidedBy, pensFor, pensAgainst):
   *  only penalties, and only where the window's decider is penalties. */
  decidedBy?: Extract<UCLKnockoutMatch["decidedBy"], "penalties">;
  pensFor?: number;
  pensAgainst?: number;
  /** He scored in the final. Never set in a season he scored no goals. */
  scored?: boolean;
}
export interface CupRun {
  cup?: string;
  stages: CupTie[];
  /** A simplified opening match saved for new modern runs, never backfilled. */
  opening?: { opp: string; country: string; league: string; won: boolean; for: number; against: number; home: boolean };
  /** Present when he reached the final and the window says how many legs. */
  final?: CupFinal;
}

/** The ties named back from the final, the quarter-final first. */
const NAMED_STAGES: readonly CupStage[] = ["QF", "SF", "F"];
/** Goals a side is expected to score in a cup tie, the winner's side and the
 *  loser's, before the result is set: realistic knockout scores (1-0, 2-1,
 *  3-1) without a model of either club. */
const TIE_LAMBDA_HI = 1.45;
const TIE_LAMBDA_LO = 1.0;
/** The share of level finals, in a window decided on penalties, that extra
 *  time settles: 0.6 leaves about 10.6 percent of those finals to penalties
 *  (0.265 level at these rates, times 0.4). */
const EXTRA_TIME_SETTLES = 0.6;

/** The clubs a season's cup can draw him against: the same association that
 *  year (the era filter the transfer market uses), never his own club, each
 *  name once. */
export function cupOpponentPool(association: string, year: number, club: string, clubs: readonly ClubData[]): ClubData[] {
  const seen = new Set<string>([club]);
  const out: ClubData[] = [];
  for (const c of adjustClubsForYear(clubs as ClubData[], year)) {
    if (seen.has(c.name) || cupAssociation(c.country, c.league) !== association) continue;
    seen.add(c.name);
    out.push(c);
  }
  return out;
}

export interface CupRunInput {
  status: CupStatus;
  club: string;
  year: number;
  /** The season's cup, as the engine's coin decided it. */
  won: boolean;
  /** cupChanceFor for this season, the coin's own odds. */
  chance: number;
  clubs: readonly ClubData[];
  /** The phone's cup winner for this association that season, if any. */
  worldWinner?: string | null;
  goals: number;
  apps: number;
  /** Anything that pins this season down; it seeds the run's generator. */
  seedKey: string;
  /** The actual engine opts new runs in; legacy callers keep their exact output. */
  includeOpening?: boolean;
}

function drawOpeningCupTie(input: CupRunInput, stages: readonly CupTie[], pool: readonly ClubData[]): CupRun['opening'] {
  if (!input.includeOpening || input.year < 2026 || input.status.kind !== 'NAMED' || stages[0]?.stage !== 'early') return undefined;
  const used = new Set(stages.flatMap(tie => tie.opp ? [tie.opp] : []));
  const candidates = pool.filter(club => !used.has(club.name) && club.name !== input.worldWinner);
  if (!candidates.length) return undefined;
  const rng = keyedRng(`${input.seedKey}|cup-opening`);
  const opponent = candidates[Math.floor(rng() * candidates.length)];
  const a = Math.min(29, poissonGoals(TIE_LAMBDA_HI, rng)), b = Math.min(29, poissonGoals(TIE_LAMBDA_LO, rng));
  let hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi === lo) hi += 1;
  const won = stages[0].won;
  return { opp: opponent.name, country: opponent.country, league: opponent.league, won, for: won ? hi : lo, against: won ? lo : hi, home: rng() < 0.5 };
}

/** The season's cup run, or null when there is none to tell: a NONE season,
 *  an UNKNOWN association whose pool cannot name a different club at every
 *  stage, or a NAMED one with no other club at all. Drawn only from
 *  keyedRng(seedKey + '|cup'). Each tie is won with p = chance^(1/k) over the
 *  k stages played, so a won run is exactly the coin's win, and a lost one
 *  exits at stage i with weight p^i (1 - p): a lost final is possible and
 *  properly rare. A lost final is lost to the world's winner where that club
 *  is in his pool that year, and no club he beat is ever that winner. */
export function drawCupRun(input: CupRunInput): CupRun | null {
  const { status } = input;
  if (status.kind === "NONE") return null;
  const all = cupOpponentPool(status.association, input.year, input.club, input.clubs);
  /* The world's winner is his final's opponent only where it is in the pool
     (the lead's rule): the phone draws it from five year era lists, which
     carry clubs before they played (Atlanta United in 2015, Houston Dynamo
     in 2005), while the pool keeps only the clubs of that year. */
  const winner = input.worldWinner && all.some(c => c.name === input.worldWinner) ? input.worldWinner : null;
  const pool = all.filter(c => c.name !== winner);
  const named = Math.min(NAMED_STAGES.length, pool.length);
  if (status.kind === "UNKNOWN" ? named < NAMED_STAGES.length : named < 1) return null;
  const stages: CupStage[] = ["early", ...NAMED_STAGES.slice(NAMED_STAGES.length - named)];
  const k = stages.length;
  const rng = keyedRng(`${input.seedKey}|cup`);
  const p = Math.pow(Math.min(0.999, Math.max(0.001, input.chance)), 1 / k);
  /* exit is the index of the tie he lost; k means he won every one */
  let exit = k;
  if (!input.won) {
    let u = rng() * (1 - Math.pow(p, k));
    exit = k - 1;
    for (let i = 0; i < k; i++) {
      const w = Math.pow(p, i) * (1 - p);
      if (u < w) { exit = i; break; }
      u -= w;
    }
  }
  /* Opponents from the final back, the stronger tiers weighted to the later
     stages; a lost final goes to the world's winner when there is one. */
  const opps: Record<number, string> = {};
  const left = pool.slice();
  for (let i = k - 1; i >= 1; i--) {
    if (i > exit) continue;
    if (stages[i] === "F" && exit === i && winner) { opps[i] = winner; continue; }
    const power = stages[i] === "F" ? 2 : stages[i] === "SF" ? 1.5 : 1;
    const weights = left.map(c => Math.pow(1 / Math.max(1, c.tier), power));
    let u = rng() * weights.reduce((a, b) => a + b, 0);
    let j = 0;
    while (j < left.length - 1 && u >= weights[j]) { u -= weights[j]; j++; }
    opps[i] = left[j].name;
    left.splice(j, 1);
  }
  /* A level draw is settled in the winner's favour, except in a final whose
     window records penalties, where extra time still settles most of them:
     two goal draws at these rates are level about 26 percent of the time,
     and the real finals went to penalties about one time in ten (FA Cup 3 of
     28 from 1999, Coupe de France 4 of 35, Emperor's Cup 3 of 36). */
  const score = (won: boolean, legs: number, level: boolean): [number, number] => {
    let a = 0, b = 0;
    for (let l = 0; l < legs; l++) { a += poissonGoals(TIE_LAMBDA_HI, rng); b += poissonGoals(TIE_LAMBDA_LO, rng); }
    let hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi === lo && (!level || rng() < EXTRA_TIME_SETTLES)) hi += 1;
    return won ? [hi, lo] : [lo, hi];
  };
  const out: CupTie[] = [];
  let final: CupFinal | undefined;
  for (let i = 0; i < k && i <= exit; i++) {
    const won = i < exit;
    const stage = stages[i];
    if (stage === "early") { out.push({ stage, won }); continue; }
    if (stage !== "F") {
      const [f, a] = score(won, 1, false);
      /* the ground is drawn for every tie, so the draws after it never move,
         and kept on a quarter-final only (see CupTie.home) */
      const home = rng() < 0.5;
      out.push({ stage, opp: opps[i], won, for: f, against: a, ...(stage === "QF" ? { home } : {}) });
      continue;
    }
    out.push({ stage, opp: opps[i], won });
    if (status.kind !== "NAMED" || !status.legs) continue;
    const legs = status.legs;
    const [f, a] = score(won, legs, status.decider === "penalties");
    final = { for: f, against: a, legs };
    if (f === a) {
      const w = 3 + Math.floor(rng() * 3);
      const l = Math.max(0, w - 1 - (rng() < 0.4 ? 1 : 0));
      final.decidedBy = "penalties";
      final.pensFor = won ? w : l;
      final.pensAgainst = won ? l : w;
    }
    if (input.goals > 0 && f > 0) {
      const perGame = Math.min(0.8, input.goals / Math.max(1, input.apps));
      if (rng() < 1 - Math.pow(1 - perGame, legs)) final.scored = true;
    }
  }
  const opening = drawOpeningCupTie(input, out, all);
  return { ...(status.kind === "NAMED" ? { cup: status.name } : {}), stages: out, ...(final ? { final } : {}), ...(opening ? { opening } : {}) };
}

/* ─── Reading a saved run ───
   Saves are the player's own storage, so a hand edited or half written row
   is possible. Every reader goes through this: a run whose stages are out of
   order, carry a bad score, lose more than one tie, or disagree with the
   row's own cup flag reads as no run at all, and the row renders exactly as
   a row from before this round. */
const ORDER: readonly CupStage[] = ["early", "QF", "SF", "F"];
const goalsOk = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 30;
const nameOk = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 60;

export function readCupRun(row: unknown): CupRun | null {
  if (!row || typeof row !== "object") return null;
  const r = row as { cupRun?: unknown; domesticCup?: unknown; year?: unknown; club?: unknown };
  const raw = r.cupRun as { cup?: unknown; stages?: unknown; final?: unknown; opening?: unknown } | undefined;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.stages)) return null;
  const list = raw.stages as unknown[];
  if (list.length < 1 || list.length > ORDER.length) return null;
  const stages: CupTie[] = [];
  let last = -1;
  for (let i = 0; i < list.length; i++) {
    const t = list[i] as Partial<CupTie> | null;
    if (!t || typeof t !== "object" || typeof t.won !== "boolean") return null;
    const at = ORDER.indexOf(t.stage as CupStage);
    if (at <= last || (i === 0) !== (at === 0)) return null;
    last = at;
    if (!t.won && i !== list.length - 1) return null;
    const tie: CupTie = { stage: t.stage as CupStage, won: t.won };
    if (at > 0) { if (!nameOk(t.opp)) return null; tie.opp = t.opp; }
    if (t.stage === "QF" || t.stage === "SF") {
      if (!goalsOk(t.for) || !goalsOk(t.against) || t.for === t.against || (t.for > t.against) !== t.won) return null;
      Object.assign(tie, { for: t.for, against: t.against });
      /* the ground on a quarter-final only; a semi-final's is never kept */
      if (t.stage === "QF") { if (typeof t.home !== "boolean") return null; tie.home = t.home; }
    }
    stages.push(tie);
  }
  const end = stages[stages.length - 1];
  const won = end.stage === "F" && end.won;
  if (won !== (r.domesticCup === true)) return null;
  const run: CupRun = { stages };
  if (raw.cup !== undefined) { if (!nameOk(raw.cup)) return null; run.cup = raw.cup; }
  if (raw.opening !== undefined) {
    const opening = raw.opening as Partial<NonNullable<CupRun['opening']>> | null;
    if (!opening || typeof opening !== 'object' || !Number.isSafeInteger(r.year) || (r.year as number) < 2026 || !nameOk(opening.opp)
      || opening.opp === r.club || stages.some(tie => tie.opp === opening.opp) || typeof opening.country !== 'string' || typeof opening.league !== 'string'
      || typeof opening.won !== 'boolean' || opening.won !== stages[0].won || typeof opening.home !== 'boolean'
      || !goalsOk(opening.for) || !goalsOk(opening.against) || opening.for === opening.against || (opening.for > opening.against) !== opening.won) return null;
    const status = cupFor(cupAssociation(opening.country, opening.league), r.year as number);
    if (status.kind !== 'NAMED' || status.name !== run.cup) return null;
    run.opening = { opp: opening.opp, country: opening.country, league: opening.league, won: opening.won, for: opening.for, against: opening.against, home: opening.home };
  }
  if (raw.final !== undefined) {
    const f = raw.final as Partial<CupFinal> | null;
    if (!f || typeof f !== "object" || end.stage !== "F" || !goalsOk(f.for) || !goalsOk(f.against) || (f.legs !== 1 && f.legs !== 2)) return null;
    const final: CupFinal = { for: f.for, against: f.against, legs: f.legs };
    if (f.decidedBy !== undefined || f.pensFor !== undefined || f.pensAgainst !== undefined) {
      const { pensFor: pf, pensAgainst: pa } = f;
      if (f.decidedBy !== "penalties" || f.for !== f.against || !goalsOk(pf) || !goalsOk(pa) || pf === pa || (pf > pa) !== won) return null;
      Object.assign(final, { decidedBy: "penalties", pensFor: pf, pensAgainst: pa });
    } else if (f.for === f.against || (f.for > f.against) !== won) return null;
    if (f.scored === true) { if (f.for < 1) return null; final.scored = true; }
    run.final = final;
  }
  return run;
}

/* ─── The words ───
   Casual, and only what the run holds: a named cup only from a NAMED window,
   a score only where one was drawn, penalties only where the window records
   them. Every cup in the table takes "the". */
export function cupTitle(name?: string): string {
  return name ?? "Domestic Cup";
}
function cupPhrase(run: CupRun): string {
  return run.cup ?? "the domestic cup";
}
function cupLead(run: CupRun): string {
  return run.cup ?? "Domestic cup";
}
const STAGE_WORD: Record<CupStage, string> = { early: "the early rounds", QF: "quarter-final", SF: "semi-final", F: "final" };

function finalScore(final: CupFinal): string {
  const base = `${final.for}-${final.against}`;
  if (final.decidedBy === "penalties") return `${base}, ${final.pensFor}-${final.pensAgainst} on penalties`;
  return final.legs === 2 ? `${base} on aggregate` : base;
}

/** One line for a run that ended before the trophy. */
export function cupExitLine(run: CupRun): string | null {
  const end = run.stages[run.stages.length - 1];
  if (!end || end.won) return null;
  if (end.stage === "early") return `${cupLead(run)}: out in the early rounds.`;
  if (end.stage === "F") {
    return `${cupLead(run)}: lost the final to ${end.opp}${run.final ? `, ${finalScore(run.final)}` : ""}.`;
  }
  /* the tie's score stays on the row; one line carries no "shown as one
     match" note, so it prints none */
  return `${cupLead(run)}: knocked out by ${end.opp} in the ${STAGE_WORD[end.stage]}.`;
}

/** The lines of a won run, the early rounds first and the final last. */
export function cupWinLines(run: CupRun): string[] {
  const end = run.stages[run.stages.length - 1];
  if (!end || end.stage !== "F" || !end.won) return [];
  return run.stages.map(t => {
    if (t.stage === "early") return "Through the early rounds";
    if (t.stage === "F") {
      const score = run.final ? ` ${finalScore(run.final)}` : "";
      return `Final: beat ${t.opp}${score}${run.final?.scored ? ", and you scored" : ""}`;
    }
    /* no ground: a semi-final may have been at a neutral one, and how each
       cup played its quarter-finals was not researched (CupTie.home) */
    return `${t.stage === "QF" ? "Quarter-final" : "Semi-final"}: beat ${t.opp} ${t.for}-${t.against}`;
  });
}

/** The run's heading when it was won: "FA Cup winners". */
export function cupWinHeading(run: CupRun): string {
  return `🏆 ${cupLead(run)} winners`;
}

/** The note the card carries under a run with ties before the final. */
export const CUP_TIES_NOTE = "Rounds before the final are shown as one match each.";

/** The trophy chip on the summary: the cup's name, or "Cup" on a row with
 *  no named run, exactly as before this round. */
export function cupChipLabel(row: unknown): string {
  return readCupRun(row)?.cup ?? "Cup";
}

/** The cabinet tile: the cup's name only when every cup won carries a run
 *  naming the same competition, otherwise "Cups" (an old cup with no name
 *  counts, so "FA Cup x4" can never include an unnamed one). */
export function cupCabinetLabel(rows: readonly unknown[]): string {
  const won = rows.filter(r => !!r && typeof r === "object" && (r as { domesticCup?: unknown }).domesticCup === true);
  if (won.length === 0) return "Cups";
  const names = new Set(won.map(r => readCupRun(r)?.cup ?? ""));
  const [only] = [...names];
  return names.size === 1 && only ? only : "Cups";
}

/** The phrase a newspaper or a log line uses: "the FA Cup". */
export function cupInSentence(run: CupRun): string {
  return run.cup ? `the ${run.cup}` : cupPhrase(run);
}

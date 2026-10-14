/* ─── Round 1329: what Soccer Career may say about the real world ───

   THE PRINCIPLE. His competitions are his story; everyone else's results are
   the world's facts. A competition he played in (his league season, his cup
   run, his Champions League, a tournament where he was in the squad at the
   finals) is the career's own fiction and prints the way every career game
   has to. Everything else the game reports around him is a claim about the
   real world: another club's title, another man's transfer or goal tally, a
   tournament he watched from home. The phone says so itself ("World football.
   Nothing about you in here."). Those claims print only when they are true,
   and until the sourced history arrives (soccerWorldHistory.ts, a later round)
   "true" means: nothing at all, in a season that really happened. The game
   still draws every one of those results, because the Ballon d'Or night, the
   cup run and the Season Centre read them; it just never prints one as fact.

   THE BOUNDARY between football that happened and the game's own future is
   the pair of constants below. They are real world facts, read on 2026-10-13,
   and they are never computed from a clock: the engine is seeded and the saved
   pages are photographs. Moving either one is a data round with its own
   sources, never a quiet edit.

   LAST_PLAYED_SEASON = 2025. Season Y is the one that starts in Y (2025 is
   2025/26, seasonSpan in soccerCareerLeague.ts). Autumn to spring leagues: the
   fifteen European leagues finished 2025/26 by May 2026, two source families
   each (src/data/clubManagerFinalTables2025_26.ts, read 2026-09-15: UEFA and
   the leagues' own data, then ESPN and other press), and the Saudi Pro League
   finished on 21 May 2026 (spl.com.sa, "2025-26 SPL Awards winners", news
   1069886; ESPN, 2025-26 Saudi Pro League standings, ksa.1). Calendar year
   leagues, which the game plays on its August to May calendar (Club Manager
   says so at clubManager.ts 3291), count their season Y as the year Y, and
   2025 is over in all three the eras list: MLS Cup 2025 was played on 6
   December 2025 (mlssoccer.com, "Inter Miami CF Win 2025 MLS Cup presented by
   Audi"; ESPN, gameId 762182), the Brasileirao 2025 was settled on 3 December
   2025 (cbf.com.br, "Flamengo e campeao do Brasileirao Betano 2025"; ESPN
   Brasil, artigo 16041438), and K League 1 2025 on 18 October 2025 (The Korea
   Herald, article 10596261; the-afc.com, "East Asia Wrap: Jeonbuk lift K
   League title"). 2026/27 and the 2026 calendar seasons are still being played.

   LAST_PLAYED_SUMMER = 2026. The summer tournament the game labels 2026 is the
   2026 World Cup, which ended on 19 July 2026 (src/data/wc2026Results.ts, two
   sources compared 2026-09-01: ESPN's scoreboard feed for all 104 matches, and
   The Athletic and FOX Sports for the awards).

   Import free on purpose: the engine, the phone, the quiz and the
   International panel all read it, so it can never close an import cycle. */

export const LAST_PLAYED_SEASON = 2025;
export const LAST_PLAYED_SUMMER = 2026;

/* Past this the era pools run out of people who could plausibly still be
   playing, so the world generates its own names, exactly like the Ballon d'Or
   already does past 2032. Nobody real gets a fictional future. (Moved here
   from soccerPhone.ts so the quiz reads the same year.) */
export const LAST_REAL_YEAR = 2032;

/** The season starting in `year` has really been played. */
export function seasonHappened(year: number): boolean {
  return year <= LAST_PLAYED_SEASON;
}

/** The summer tournament the game labels `year` has really been played. */
export function summerHappened(year: number): boolean {
  return year <= LAST_PLAYED_SUMMER;
}

/** His own result says he was at the finals. "Did Not Qualify", "Not
    Selected" and the blank a player with no international career gets are
    all summers he watched from home. */
const FINALS_RESULTS = new Set(["Group Stage", "Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Runner-up", "Winner"]);
export function playedFinals(myResult: string | null | undefined): boolean {
  return typeof myResult === "string" && FINALS_RESULTS.has(myResult);
}

/** Who won a tournament may be printed: a summer still to come in the real
    world (the game's own future), or finals he played (his own story). */
export function tournamentWinnerShown(year: number, myResult: string | null | undefined): boolean {
  return !summerHappened(year) || playedFinals(myResult);
}

/** His own line for a summer he watched from home, where the winner is not named. */
export function summerAtHomeLine(myResult: string | null | undefined): string {
  if (myResult === "Did Not Qualify") return "Did not qualify";
  if (myResult === "Not Selected") return "Left out";
  return "Watched from home";
}

/** "2027-28" for the season starting in 2027, the shape seasonSpan prints. */
export function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

/** The phone feed's one line for a season that really happened. */
export function feedPastSeasonLine(year: number): string {
  return `📰 ${seasonLabel(year)} really happened, so this feed won't make up what went on around you.`;
}

/** The phone feed's one line above a season of the game's own future. */
export function feedFutureSeasonLine(year: number): string {
  return `🔮 Your world's ${seasonLabel(year)}, as it played out:`;
}

export const MONTHS = ["August", "September", "October", "November", "December", "January", "February", "March", "April", "May"] as const;

/** The calendar year a month of the season starting in `seasonYear` falls in:
    August to December are that year, January to May the next. */
export function monthYear(month: string, seasonYear: number): number {
  const i = (MONTHS as readonly string[]).indexOf(month);
  return i >= 5 ? seasonYear + 1 : seasonYear;
}

/* ─── Player of the Month ───
   The award used to be a goals lottery: a month with no goal still won 2
   percent of the time, so a keeper who never scored won it about once every
   three seasons, and a 30 goal season was handed six. Now a month is won on
   the month's football. Each of the ten months gets its share of his games
   (none in the months an injury took, about one month per four weeks out) and
   a form score around the season's rating, nudged by what that position does:
   a forward's goals and assists, a midfielder's assists and goals, a
   defender's clean sheets and goals, a keeper's clean sheets, each against
   what is ordinary for the position per game. A month is won with a chance
   that rises with that form. Every number here is a design number, measured
   on a fleet of careers (scripts/simSoccerWorldTruth.mjs section 1), never a
   claim about the real award. */
export type MonthGroup = "GK" | "DEF" | "MID" | "ATT";
export interface MonthRow {
  apps: number; goals: number; assists: number; cleanSheets?: number; rating: number; injuryWeeks?: number | null;
}
/** Under either floor no month is won, whatever the clean sheets or goals. */
export const MONTH_AWARD_MIN_APPS = 10;
export const MONTH_AWARD_MIN_RATING = 6.8;
/** The most months one season can win. */
export const MONTH_AWARD_MAX = 4;
const MONTH_FORM_SPREAD = 1.2;
const MONTH_FORM_LINE = 7.8;
const MONTH_FORM_SLOPE = 0.5;
const MONTH_CHANCE_CAP = 0.6;
/** Ordinary involvement per game for each position group (the fleet's medians) and how far a season above or
    below it moves the month's form, never more than a quarter of a rating point either way. */
const MONTH_FOOTBALL: Record<MonthGroup, { per: (r: MonthRow) => number; usual: number; weight: number }> = {
  ATT: { per: r => (r.goals + 0.5 * r.assists) / r.apps, usual: 0.4, weight: 0.8 },
  MID: { per: r => (r.assists + 0.8 * r.goals) / r.apps, usual: 0.22, weight: 1.2 },
  DEF: { per: r => ((r.cleanSheets ?? 0) + r.goals) / r.apps, usual: 0.37, weight: 1.5 },
  GK: { per: r => (r.cleanSheets ?? 0) / r.apps, usual: 0.32, weight: 2 },
};
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The position groups of soccerInternational.ts positionGroup, held here so this file stays import free
    (src/test/soccerWorldTruth.test.ts holds the two equal for all ten positions). */
export function monthGroupOf(position: string): MonthGroup {
  if (position === "GK") return "GK";
  if (["ST", "CAM", "LW", "RW"].includes(position)) return "ATT";
  if (["CM", "CDM"].includes(position)) return "MID";
  return "DEF";
}

/** The months of one season he won, in calendar order. Pure: the same row,
    position and stream always give the same months. */
export function monthAwards(row: MonthRow, position: string, rng: () => number): string[] {
  const group = monthGroupOf(position);
  if (!(row.apps >= MONTH_AWARD_MIN_APPS) || !(row.rating >= MONTH_AWARD_MIN_RATING)) return [];
  const lost = clampN(Math.round((row.injuryWeeks ?? 0) / 4), 0, 9);
  const order = MONTHS.map((_, i) => i);
  for (let k = 0; k < lost; k += 1) {
    const j = k + Math.floor(rng() * (order.length - k));
    [order[k], order[j]] = [order[j], order[k]];
  }
  const injured = new Set(order.slice(0, lost));
  const presence = Math.min(1, row.apps / (MONTHS.length - lost) / 3);
  const f = MONTH_FOOTBALL[group];
  const football = clampN((f.per(row) - f.usual) * f.weight, -0.25, 0.25);
  const won: { i: number; form: number }[] = [];
  for (let i = 0; i < MONTHS.length; i += 1) {
    const form = row.rating + football + (rng() - 0.5) * MONTH_FORM_SPREAD;
    const roll = rng();
    if (injured.has(i)) continue;
    if (roll < clampN((form - MONTH_FORM_LINE) * MONTH_FORM_SLOPE, 0, MONTH_CHANCE_CAP) * presence) won.push({ i, form });
  }
  return won.sort((a, b) => b.form - a.form).slice(0, MONTH_AWARD_MAX).sort((a, b) => a.i - b.i).map(w => MONTHS[w.i]);
}

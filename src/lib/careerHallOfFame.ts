/* ────────────────────────────────────────────────────────────────────────────
   careerHallOfFame.ts, the wait, the ballot, the jersey and the speech (Round 915)

   One engine, many sports. The four American careers ended on one boolean,
   legacyOf(c).hof. This module is what happens after it: the waiting period,
   the ballot years, a first ballot or a wait or falling off, the jersey going
   up at the club he played most seasons for, and the induction speech.

   WHO GETS IN IS NOT DECIDED HERE. Inducted is exactly legacyOf(c).hof, the
   sport's own verdict, so the Round 123 calibration does not move. The ballot
   only decides how long it took. A score at the top of the Hall band gets in
   on the first ballot every time (where the sport's verdict text already says
   "first ballot" it must be true), and the chance rises from a floor at the
   Hall line to that point. Careers outside the Hall either never make the
   ballot, sit on it and fall off (only where the real Hall has a fall off
   rule), or wait without the call.

   THE CONTRACT. A sport's data file (nflCareerHall.ts and its siblings) gives:
     rules       the real Hall's rules, each marked verified or believed, with
                 the sources in docs/audits/US-HALL-RULES-2026-10.md. A believed
                 value is never printed.
     lines       the sport's own legacy lines: where hof starts, where the
                 verdict promises a first ballot, where it promises a jersey.
     retirement  the sport's retirement talk rule (careerRetirement.ts).
     adapters    legacy (the sport's legacyOf), key, last season year, seasons.

   Every draw is on keyedRng, keyed to the career, so the same career always
   gets the same ballot and nothing here shifts a season's seeded stream.

   THE JERSEY (Round 1039 closed the gap Round 915 left open). The life decks
   have a number retirement card (flags b_jersey, nb_jersey and b_number);
   answers 1 and 2 now also write c.numberRetiredBy, the club and the year,
   through recordNumberRetired below, and a recorded retirement wins over
   jerseyFor (the recordedJersey adapter). The "wait until you are done"
   answer records nothing, so jerseyFor decides at the end as before. A save
   from before this round whose card retired the number (flag 1 or 2) kept no
   club, so its card prints no jersey line (jerseyUnknown) rather than let
   jerseyFor name a club the deck never named.

   THE RECORD IS DERIVED, ON PURPOSE (Round 1039). The HallRecord is never
   saved: it is computed from the season lines and the sport's legacyOf on a
   keyed stream, so the same career shows the same ballot every visit and a
   retired save from before the bind gets its record on its next visit.

   AND IT NO LONGER MOVES UNDER A RETIRED PLAYER (Round 1051). The legacy
   score reads a table per CALIBRATION, and the calibration a career retired
   on is stamped on its save (hallCal, written once by the save that retires
   it; no stamp on a retired save means calibration 1). So a change to how
   the voters weigh a career is a new table and a bump of HALL_CALIBRATION:
   careers already retired keep the legacy and the ballot they were told,
   and only careers that retire afterwards are read on the new one. Never
   edit a calibration that has shipped: add the next one beside it (Round
   1301 added calibration 3 that way). The version 1 recording
   (src/test/fixtures/careerHallV1.json), the calibration 2 and 3 recordings
   (scripts/data/careerHallV2.json and careerHallV3.json, the four tables
   whole) and section 15 of scripts/simCareerHall.mjs hold that promise.

   ERA TRUTH (Round 1039). HallRules.verifiedFromClass is the first class
   the audit anchors the printed rules on with two sources. The card prints a
   class year and the rule lines only for a first class at or after it; an
   earlier career's ballots read "First ballot", "Second ballot" with no year,
   because an older regime's wait is not keyed in (no two sources yet). */

import { keyedRng } from "./keyedRng";
import { formatNumber } from "./formatNumber";
import { peakRating } from "./careerRetirement";
import type { RetirementRule, RetirementSnapshot } from "./careerRetirement";

export type HallSportId = "nfl" | "nba" | "mlb" | "nhl";
export type Provenance = "verified" | "believed";

export interface HallRules {
  sport: HallSportId;
  hallName: string;
  /** Which year's rules the model follows. */
  ruleYear: string;
  /** The first class the audit anchors these rules on with two sources
   *  (docs/audits/US-HALL-RULES-2026-10.md). A first class before it prints
   *  no class year and no rule line. */
  verifiedFromClass: number;
  /** Seasons away from the game before he can be considered. */
  waitSeasons: number;
  /** Years from the last season's label to the first class he can join. */
  firstClassOffset: number;
  /** Vote share needed, percent. */
  threshold: number;
  /** Ballots before he is dropped, or null when no limit is claimed. */
  ballotYears: number | null;
  /** Share under which he is dropped, percent, or null when no such rule is claimed. */
  stayFloor: number | null;
  /** True when the real Hall publishes each candidate's vote share. */
  publishesShares: boolean;
  /** firstClass is the offset above, held to real players' first eligible classes in the audit. */
  provenance: Record<"wait" | "firstClass" | "threshold" | "ballotYears" | "stayFloor" | "publishesShares", Provenance>;
}

/** The sport's own legacy lines, read off its legacyOf. */
export interface HallLines {
  /** legacyOf says hof at or above this. Documentation only: hof itself is read, never recomputed. */
  hofLine: number;
  /** At or above this the verdict promises a first ballot, so it is certain. */
  firstBallotScore: number;
  /** At or above this the verdict promises the jersey, or null. */
  jerseyScore: number | null;
}

export interface HallSeason {
  team: string;
  games: number;
}

export interface HallSport<C> {
  rules: HallRules;
  lines: HallLines;
  retirement: RetirementRule;
  legacy: (c: C) => { score: number; hof: boolean };
  /** Round 1051: the card's line on what the voters weighed, or null for a
   *  career read on calibration 1 (its card is the card it always had). */
  weighs?: (c: C) => string | null;
  /** A stable key for this career, for keyedRng. */
  key: (c: C) => string;
  lastSeasonYear: (c: C) => number;
  seasons: (c: C) => HallSeason[];
  /** The club's name for a season line's club id; without it the card prints the id. */
  teamName?: (team: string, c: C) => string;
  /** Round 1039: a number a club already retired on a deck card, which wins
   *  over jerseyFor, or null when nothing was recorded. */
  recordedJersey?: (c: C) => HallJersey | null;
  /** Round 1039: true when a deck card retired the number on a save from
   *  before this round, which recorded no club. The card then prints no
   *  jersey line rather than let jerseyFor name a club the deck never did. */
  jerseyUnknown?: (c: C) => boolean;
}

export type HallOutcome = "inducted" | "fellOff" | "waiting" | "notOnBallot";

export interface HallBallot {
  classYear: number;
  /** Vote share, percent, one decimal. Shown only where the Hall publishes it. */
  share: number;
  elected: boolean;
}

export interface HallJersey {
  /** The club id as the season lines store it (an abbreviation in the US careers). */
  team: string;
  seasons: number;
  /** The club's name for the card, from the sport's own label function. */
  teamName?: string;
}

export interface HallRecord {
  sport: HallSportId;
  hallName: string;
  outcome: HallOutcome;
  firstClass: number;
  ballots: HallBallot[];
  inductedClass: number | null;
  firstBallot: boolean;
  jersey: HallJersey | null;
  score: number;
  /** Round 1051: what the voters weighed, one line. Only on a career retired on calibration 2 or later. */
  weighs?: string;
}

/** Game rules, not real world numbers. */
export const HALL_GAME_RULES = {
  /** First ballot chance at the Hall line; it rises to 1 at firstBallotScore. */
  firstBallotFloor: 0.3,
  /** Later ballots: chance of the call each year, at the line and at the top. */
  laterCallFloor: 0.3,
  laterCallTop: 0.8,
  /** Most ballots shown where the real Hall claims no limit. */
  openEndedBallots: 10,
  /** Under this share of the Hall line he never makes the ballot. */
  nominationShare: 0.5,
  /** Jersey goes up for a Hall of Famer with this many seasons at the club... */
  jerseySeasonsInducted: 5,
  /** ...or for a club icon just short of the Hall: this many seasons there... */
  jerseySeasonsAlone: 12,
  /** ...and a score at this share of the Hall line. Without it nearly every
   *  long career went up, since a US career mostly stays at one club
   *  (simCareerHall measured 199 of 200 NHL careers with 12 seasons at one). */
  jerseyNearMiss: 0.85,
} as const;

/* ─── The legacy score (Round 1051) ──────────────────────────────────────
   The four sports each hard coded one idea: awards times weights, plus
   seasons times a weight, plus a production term picked by position, rounded.
   That idea lives here once, as legacyRead; each sport keeps a table per
   calibration beside its own legacyOf (no sport's data sits in this file).

   A CALIBRATION is one such table. A career is judged on the calibration it
   retired on: the board stamps it (hallCal, one optional save key) at the
   moment a career retires, and a retired save with no stamp is calibration 1,
   the Round 123 formulas to the last bit. So a later calibration never
   re-tells a retired player's legacy or his ballot.

   CALIBRATION 3 (Round 1301). Round 1226 made the NHL play the season the
   league really plays (84 games from 2026-27), so a skater's career totals
   run about 84 over 82 of what the calibration 2 marks were measured on, and
   about one career in eight cleared a standout mark where the design says
   one in ten. The NHL's marks were measured again on that engine as a new
   table beside the old one (NHL_LEGACY_V3 in nhlMyCareer.ts). The calibration
   is one number for the whole Hall, so football, basketball and baseball
   read 3 as well: their calibration 3 IS their calibration 2 table, the same
   object, and no mark of theirs moved. A career stamped 2 reads 2 for good. */

export type HallCalibration = 1 | 2 | 3;
/** The calibration a career retiring today is judged on. */
export const HALL_CALIBRATION: HallCalibration = 3;

/** One production term: the career total of `stat`, divided by `per`. */
export interface LegacyTerm { stat: string; per: number }
/** One standout family: nothing at or under `from`, `top` (LEGACY_GAME_RULES.standoutTop
 *  unless the family names its own) at `to`. `label` is the plural noun the card prints ("assists"). */
export interface LegacyStandout { stat: string; from: number; to: number; label: string; top?: number }
export interface LegacyPosition { terms: LegacyTerm[]; standout?: LegacyStandout[] }
export interface LegacyWeights {
  /** Points per award, keyed by the name of the count on the career ("rings", "mvps"). */
  awards: Record<string, number>;
  /** Points per season played. */
  season: number;
  /** By position; "*" is every position with no entry of its own. */
  positions: Record<string, LegacyPosition>;
}
export interface LegacyFacts { pos: string; seasons: number; awards: Record<string, number>; totals: Record<string, number> }
export interface LegacyRead { score: number; standout: { stat: string; label: string; total: number; credit: number } | null }

/** Game rules, not real world numbers. standoutSaid: the least a standout must be worth, in whole legacy
 *  points, before the ballot card says so (a tenth of a full push; under it the card stays quiet, because a
 *  push of a point or two is not something the voters "counted"). */
export const LEGACY_GAME_RULES = { standoutTop: 300, standoutCap: 1.3, standoutSaid: 30 } as const;

/** The legacy score off a table. Awards and seasons are whole numbers, the
 *  terms are added in the table's order from zero, and one Math.round closes
 *  it, so a table that restates a sport's old formula gives the same double. */
export function legacyRead(w: LegacyWeights, f: LegacyFacts): LegacyRead {
  let awards = 0;
  for (const key of Object.keys(w.awards)) awards += (f.awards[key] ?? 0) * w.awards[key];
  const p = w.positions[f.pos] ?? w.positions["*"];
  const production = p.terms.reduce((s, t) => s + (f.totals[t.stat] ?? 0) / t.per, 0);
  // The standout: only the single largest credit counts, ties to the earlier family.
  let standout: LegacyRead["standout"] = null;
  for (const s of p.standout ?? []) {
    const total = f.totals[s.stat] ?? 0;
    const share = Math.min(LEGACY_GAME_RULES.standoutCap, Math.max(0, (total - s.from) / (s.to - s.from)));
    const credit = (s.top ?? LEGACY_GAME_RULES.standoutTop) * share;
    if (credit > 0 && (!standout || credit > standout.credit)) standout = { stat: s.stat, label: s.label, total, credit };
  }
  return { score: Math.round(awards + f.seasons * w.season + production + (standout ? standout.credit : 0)), standout };
}

/** The words a sport gives the voters: the card's sentence, and the nouns of
 *  the "?" rule and its worked example. Data, in the sport's own Hall file. */
export interface HallVoterWords {
  /** The ballot card's first sentence: the hardware. Names no trophy the engines count differently by position. */
  weighs: string;
  /** The noun the card uses for each stat a table term reads ("pts" is "points"). The card's second sentence
   *  is said from the position's own terms, so it cannot promise a stat the voters never see. */
  reads: Record<string, string>;
  /** A position whose table terms are not what a player would call his numbers gets its own second sentence. */
  readsBy?: Record<string, string>;
  hardware: string;
  /** The stats a position can stand out in, as the rule says them. */
  families: string;
  /** The worked example: the table cells it is about, and its nouns. */
  example: { positions: string[]; stat: string; one: string; who: string; family: string };
}

/** The ballot card's line. The hardware sentence, then what the table reads for this position, named from
 *  the table itself; and the standout, only when it was worth saying (standoutSaid points or more). Kept
 *  short: with a standout it has to fit four lines of small text on a phone. */
export function hallWeighLine(words: HallVoterWords, weights: LegacyWeights, pos: string, standout: LegacyRead["standout"]): string {
  // Round 1103: a noun two terms share is said once (the NBA table reads points twice: every point, and again
  // the points of seasons on the newer stat line, which are still "points" to a player).
  const nouns = (weights.positions[pos] ?? weights.positions["*"]).terms.map(t => words.reads[t.stat] ?? t.stat);
  const terms = nouns.filter((n, i) => nouns.indexOf(n) === i);
  const own = words.readsBy?.[pos];
  const said = standout && Math.round(standout.credit) >= LEGACY_GAME_RULES.standoutSaid ? standout : null;
  if (said) {
    const numbers = !own && terms.length ? " and your numbers" : "";
    return `${words.weighs} Then your seasons${numbers}, and your ${formatNumber(said.total)} ${said.label} sat near the top of this game's books.`;
  }
  if (own) return `${words.weighs} ${own}`;
  const list = terms.length > 1 ? `, ${terms.slice(0, -1).join(", ")} and ${terms[terms.length - 1]}` : terms.length ? ` and ${terms[0]}` : "";
  return `${words.weighs} Then your seasons${list}.`;
}

/** The two lines the "?" adds: the rule in one sentence, and a worked example.
 *  Every number is written in from the rules, so the copy cannot drift. `top`
 *  is the example family's own, where the table gives it one. */
export function hallVoterRules(n: { hardware: string; families: string; one: string; who: string; family: string; top?: number }): string[] {
  const top = n.top ?? LEGACY_GAME_RULES.standoutTop;
  const cap = Math.round(LEGACY_GAME_RULES.standoutTop * LEGACY_GAME_RULES.standoutCap);
  return [
    `Hall of Fame voters weigh the hardware first (${n.hardware}), then your seasons and your numbers, and a career total near the top of this game's books in a stat your position really piles up (${n.families}) earns a push of its own, up to ${cap} legacy points.`,
    `Example: take a ${n.one} with ordinary numbers and one with the same hardware and more ${n.family} than 99 of 100 ${n.who} this game has seen. The second scores at least ${top} legacy points more, which can be the whole gap between a long wait and the Hall. A career you already retired keeps the ballot it was told.`,
  ];
}

/** The same two lines off a sport's words and its table (the example family's own top). */
export function hallVoterRulesFor(words: HallVoterWords, weights: LegacyWeights): string[] {
  const { positions, stat, one, who, family } = words.example;
  const tops = positions.map(p => weights.positions[p]?.standout?.find(s => s.stat === stat)?.top ?? LEGACY_GAME_RULES.standoutTop);
  return hallVoterRules({ hardware: words.hardware, families: words.families, one, who, family, top: Math.min(...tops) });
}

/** A stamp off a save, checked: exactly the whole numbers 1 to HALL_CALIBRATION, or undefined. */
export function sanitizeHallCal(raw: unknown): HallCalibration | undefined {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= HALL_CALIBRATION ? (raw as HallCalibration) : undefined;
}

/** The calibration a career is read on. A valid stamp wins. With none, a
 *  retired career is calibration 1 (it retired before Round 1051 and keeps
 *  what it was told) and a career still being played is read on the one it
 *  will retire on. */
export function hallCalibrationOf(c: { retired?: boolean; hallCal?: unknown }): HallCalibration {
  const stamped = sanitizeHallCal(c.hallCal);
  if (stamped) return stamped;
  return c.retired ? 1 : HALL_CALIBRATION;
}

/** Stamps a career at the moment it retires. Only today's calibration is ever
 *  written, and never over a stamp. Mutates c. */
export function stampHallCalibration(c: { retired?: boolean; hallCal?: HallCalibration }): void {
  if (c.retired && c.hallCal === undefined) c.hallCal = HALL_CALIBRATION;
}

/** How far up the Hall band a score sits: 0 at the line, 1 at the first ballot score. */
function bandFraction(score: number, lines: HallLines): number {
  const span = lines.firstBallotScore - lines.hofLine;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (score - lines.hofLine) / span));
}

/** The chance a Hall of Famer goes in on his first ballot. Never falls as the
 *  score rises, and is 1 from the score where the verdict promises it. */
export function firstBallotChance(score: number, lines: HallLines): number {
  if (score >= lines.firstBallotScore) return 1;
  const f = HALL_GAME_RULES.firstBallotFloor;
  return f + (1 - f) * bandFraction(score, lines);
}

/** The chance of the call on each ballot after the first. */
export function laterCallChance(score: number, lines: HallLines): number {
  const { laterCallFloor: lo, laterCallTop: hi } = HALL_GAME_RULES;
  return lo + (hi - lo) * bandFraction(score, lines);
}

/** The club he played the most seasons for (seasons with games only). Ties go
 *  to more games there, then to the club he reached first. */
export function mostSeasonsTeam(seasons: HallSeason[]): HallJersey | null {
  const tally = new Map<string, { seasons: number; games: number; first: number }>();
  seasons.forEach((s, i) => {
    if (!s.team || !(s.games > 0)) return;
    const t = tally.get(s.team) ?? { seasons: 0, games: 0, first: i };
    t.seasons += 1;
    t.games += s.games;
    tally.set(s.team, t);
  });
  let best: { team: string; seasons: number; games: number; first: number } | null = null;
  for (const [team, t] of tally) {
    if (!best || t.seasons > best.seasons || (t.seasons === best.seasons && (t.games > best.games || (t.games === best.games && t.first < best.first)))) {
      best = { team, ...t };
    }
  }
  return best ? { team: best.team, seasons: best.seasons } : null;
}

/** Whether that club retires his number: a Hall of Famer with enough seasons
 *  there, a club icon with a long stay and a score just short of the Hall,
 *  and always where the verdict promised it. */
export function jerseyFor(seasons: HallSeason[], inducted: boolean, score: number, lines: HallLines): HallJersey | null {
  const club = mostSeasonsTeam(seasons);
  if (!club) return null;
  const promised = lines.jerseyScore !== null && score >= lines.jerseyScore;
  if (promised) return club;
  if (inducted && club.seasons >= HALL_GAME_RULES.jerseySeasonsInducted) return club;
  const icon = club.seasons >= HALL_GAME_RULES.jerseySeasonsAlone && score >= lines.hofLine * HALL_GAME_RULES.jerseyNearMiss;
  return icon ? club : null;
}

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** The ballot years. `hof` is the sport's own verdict and is only read. */
export function runHallBallot(rules: HallRules, lines: HallLines, cand: { key: string; hof: boolean; score: number; lastSeasonYear: number }): Omit<HallRecord, "jersey"> {
  const rng = keyedRng(`hall:${rules.sport}:${cand.key}`);
  const firstClass = cand.lastSeasonYear + rules.firstClassOffset;
  const base = { sport: rules.sport, hallName: rules.hallName, firstClass, score: cand.score };
  const maxBallots = rules.ballotYears ?? HALL_GAME_RULES.openEndedBallots;
  const t = rules.threshold;
  const ballots: HallBallot[] = [];

  if (cand.hof) {
    let tries = 1;
    if (rng() >= firstBallotChance(cand.score, lines)) {
      const q = laterCallChance(cand.score, lines);
      tries = 2;
      while (tries < maxBallots && rng() >= q) tries += 1;
    }
    const frac = bandFraction(cand.score, lines);
    const start = t * (0.45 + 0.35 * frac + 0.1 * rng());
    const lastMiss = t - 1 - 4 * rng();
    for (let i = 0; i < tries - 1; i += 1) {
      const step = tries > 2 ? i / (tries - 2) : 1;
      ballots.push({ classYear: firstClass + i, share: oneDecimal(start + (lastMiss - start) * step), elected: false });
    }
    const final = Math.min(99.7, t + (100 - t) * (0.1 + 0.25 * frac + 0.6 * rng()));
    ballots.push({ classYear: firstClass + tries - 1, share: oneDecimal(final), elected: true });
    return { ...base, outcome: "inducted", ballots, inductedClass: firstClass + tries - 1, firstBallot: tries === 1 };
  }

  if (cand.score < lines.hofLine * HALL_GAME_RULES.nominationShare) {
    return { ...base, outcome: "notOnBallot", ballots, inductedClass: null, firstBallot: false };
  }
  // The opening share climbs steeply with the score. A career just over the
  // nomination line opens in low single figures, so where the Hall drops a
  // candidate under a floor, the bottom of the ballot really does drop off.
  const reach = Math.min(1, Math.max(0, cand.score / lines.hofLine));
  let share = (t - 10) * reach ** 4 * (0.3 + 0.7 * rng());
  for (let i = 0; i < maxBallots; i += 1) {
    if (i > 0) share = Math.min(t - 1, Math.max(0, share + 8 * rng() - 3));
    // The floor is read off the share the card prints, so 4.96 (shown 5.0) stays on.
    const shown = oneDecimal(share);
    ballots.push({ classYear: firstClass + i, share: shown, elected: false });
    if (rules.stayFloor !== null && shown < rules.stayFloor) {
      return { ...base, outcome: "fellOff", ballots, inductedClass: null, firstBallot: false };
    }
  }
  const outcome: HallOutcome = rules.ballotYears !== null ? "fellOff" : "waiting";
  return { ...base, outcome, ballots, inductedClass: null, firstBallot: false };
}

/** The whole Hall record for a finished career. */
export function hallRecordFor<C>(sport: HallSport<C>, c: C): HallRecord {
  const legacy = sport.legacy(c);
  const ballot = runHallBallot(sport.rules, sport.lines, {
    key: sport.key(c), hof: legacy.hof, score: legacy.score, lastSeasonYear: sport.lastSeasonYear(c),
  });
  // A deck card retired the number on a save that kept no club: name none.
  const jersey = sport.jerseyUnknown?.(c) ? null : sport.recordedJersey?.(c) ?? jerseyFor(sport.seasons(c), ballot.outcome === "inducted", legacy.score, sport.lines);
  const record: HallRecord = { ...ballot, jersey: jersey && sport.teamName ? { ...jersey, teamName: sport.teamName(jersey.team, c) } : jersey };
  // The key is added only when there is a line, so a calibration 1 record has exactly the keys it always had.
  const weighs = sport.weighs?.(c);
  return typeof weighs === "string" ? { ...record, weighs } : record;
}

/** A club retiring the number on a deck card, as the save keeps it. */
export interface NumberRetiredBy {
  team: string;
  year: number;
}

/** Writes the club retiring the number now: the career's club, and the
 *  season just played. Mutates c (the deck's own working copy). */
export function recordNumberRetired(c: { team: string; year: number; seasons: { year: number }[]; numberRetiredBy?: NumberRetiredBy }): void {
  c.numberRetiredBy = { team: c.team, year: c.seasons.length ? c.seasons[c.seasons.length - 1].year : c.year };
}

/** The recorded club off a save, checked: a non empty club and a four digit
 *  year, or undefined (the block is dropped alone). */
export function sanitizeNumberRetired(raw: unknown): NumberRetiredBy | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.team !== "string" || !r.team.trim()) return undefined;
  if (typeof r.year !== "number" || !Number.isInteger(r.year) || r.year < 1000 || r.year > 9999) return undefined;
  return { team: r.team, year: r.year };
}

/** The shape all four American careers share, so one binding serves them all. */
export interface UsCareerShape {
  name: string;
  pos: string;
  draftPick: number;
  year: number;
  age: number;
  ovr: number;
  /** The era the career started in, for club names. */
  eraId?: string;
  seasons: { year: number; team: string; games: number; ovr: number }[];
  /** Round 1039: a club that retired the number on a deck card. */
  numberRetiredBy?: NumberRetiredBy;
  /** The life deck's flags, read only for the deck jersey card's own flag. */
  lifeFlags?: Record<string, number>;
  /** Round 1051: read by hallCalibrationOf. */
  retired?: boolean;
  hallCal?: HallCalibration;
}

export interface UsHallSport<C extends UsCareerShape> extends HallSport<C> {
  /** The career as the retirement talk reads it, after a season and its progress. */
  snapshot: (c: C) => RetirementSnapshot;
}

/** Binds a US career to the Hall and the retirement talk. The sport supplies
 *  its data, its legacyOf and its hard stop; everything else is shared. */
export function usCareerHall<C extends UsCareerShape>(def: {
  rules: HallRules;
  lines: HallLines;
  retirement: RetirementRule;
  legacy: (c: C) => { score: number; hof: boolean; standout?: LegacyRead["standout"] };
  /** Round 1051: the sport's words on what the voters weigh and its legacy tables. The card's line is said from both. */
  words: HallVoterWords;
  weights: Record<HallCalibration, LegacyWeights>;
  shouldRetire: (c: C) => boolean;
  /** The sport's own club label, (abbreviation, era) to name. */
  teamLabel: (team: string, eraId?: string) => string;
  /** The life B flag the deck's jersey card sets (1 or 2 retired the number,
   *  3 waits), or undefined for a sport with no such card. */
  deckJerseyFlag?: string;
}): UsHallSport<C> {
  const lastSeasonYear = (c: C) => (c.seasons.length ? c.seasons[c.seasons.length - 1].year : c.year);
  return {
    rules: def.rules,
    lines: def.lines,
    retirement: def.retirement,
    legacy: c => { const l = def.legacy(c); return { score: l.score, hof: l.hof }; },
    weighs: c => {
      const cal = hallCalibrationOf(c);
      return cal === 1 ? null : hallWeighLine(def.words, def.weights[cal], c.pos, def.legacy(c).standout ?? null);
    },
    key: c => `${c.name}|${c.pos}|${c.draftPick}|${c.seasons[0]?.year ?? c.year}`,
    lastSeasonYear,
    seasons: c => c.seasons,
    teamName: (team, c) => def.teamLabel(team, c.eraId),
    // A number a club retired on a deck card wins, counted over his season lines there.
    recordedJersey: c => (c.numberRetiredBy
      ? { team: c.numberRetiredBy.team, seasons: c.seasons.filter(s => s.team === c.numberRetiredBy?.team).length }
      : null),
    // A save from before Round 1039 whose deck card retired the number kept
    // no club, so the card names none rather than contradict the deck.
    jerseyUnknown: c => {
      if (!def.deckJerseyFlag || c.numberRetiredBy) return false;
      const f = c.lifeFlags?.[def.deckJerseyFlag];
      return f === 1 || f === 2;
    },
    snapshot: c => ({ year: lastSeasonYear(c), age: c.age, rating: c.ovr, peak: peakRating(c.seasons, c.ovr), forced: def.shouldRetire(c) }),
  };
}

/* ─── The induction speech's save block ──────────────────────────────────
   The speech itself (its options, its button words and giveHallSpeech) is in
   careerHallSpeech.ts since Round 1039, loaded only with the card, so the
   board's eager path does not carry careerAwardsNight. The block and its
   sanitizer stay here, because the board restores the save. */

export type HallMeterId = "crowd" | "room";

/** What the save keeps of the night. Every field optional. */
export interface HallSpeechBlock {
  speechId?: HallSpeechId;
  crowd?: number;
  room?: number;
  line?: string;
}

export type HallSpeechId = "fans" | "room" | "story" | "short";

const SPEECH_IDS: HallSpeechId[] = ["fans", "room", "story", "short"];
const isMeter = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;

/** A speech block from a save, checked. Anything malformed resets this block alone. */
export function sanitizeHallSpeech(raw: unknown): HallSpeechBlock {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  if (r.speechId !== undefined && !SPEECH_IDS.includes(r.speechId as HallSpeechId)) return {};
  if (r.crowd !== undefined && !isMeter(r.crowd)) return {};
  if (r.room !== undefined && !isMeter(r.room)) return {};
  if (r.line !== undefined && typeof r.line !== "string") return {};
  const out: HallSpeechBlock = {};
  if (r.speechId !== undefined) out.speechId = r.speechId as HallSpeechId;
  if (r.crowd !== undefined) out.crowd = r.crowd as number;
  if (r.room !== undefined) out.room = r.room as number;
  if (r.line !== undefined) out.line = r.line as string;
  return out;
}

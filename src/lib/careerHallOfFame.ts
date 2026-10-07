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
   retired save from before the bind gets its record on its next visit. The
   price: a later change to any sport's legacyOf re-tells every retired
   player's ballot (a first ballot can become ballot three). A round that
   touches a legacyOf reruns scripts/simCareerHall.mjs and accepts that, or
   freezes the first record into the save as one more optional field.

   ERA TRUTH (Round 1039). HallRules.verifiedFromClass is the first class
   the audit anchors the printed rules on with two sources. The card prints a
   class year and the rule lines only for a first class at or after it; an
   earlier career's ballots read "First ballot", "Second ballot" with no year,
   because an older regime's wait is not keyed in (no two sources yet). */

import { keyedRng } from "./keyedRng";
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
  return { ...ballot, jersey: jersey && sport.teamName ? { ...jersey, teamName: sport.teamName(jersey.team, c) } : jersey };
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
  legacy: (c: C) => { score: number; hof: boolean };
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

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
   gets the same ballot and nothing here shifts a season's seeded stream. */

import { keyedRng } from "./keyedRng";
import { peakRating } from "./careerRetirement";
import type { RetirementRule, RetirementSnapshot } from "./careerRetirement";
import { applySpeech, describeSteps } from "./careerAwardsNight";
import type { AwardsMeter, SpeechOption } from "./careerAwardsNight";

export type HallSportId = "nfl" | "nba" | "mlb" | "nhl";
export type Provenance = "verified" | "believed";

export interface HallRules {
  sport: HallSportId;
  hallName: string;
  /** Which year's rules the model follows. */
  ruleYear: string;
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
  provenance: Record<"wait" | "threshold" | "ballotYears" | "stayFloor" | "publishesShares", Provenance>;
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
}

export type HallOutcome = "inducted" | "fellOff" | "waiting" | "notOnBallot";

export interface HallBallot {
  classYear: number;
  /** Vote share, percent, one decimal. Shown only where the Hall publishes it. */
  share: number;
  elected: boolean;
}

export interface HallJersey {
  team: string;
  seasons: number;
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
  /** ...or for anyone with this many. */
  jerseySeasonsAlone: 12,
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
 *  there, anyone with a long stay, and always where the verdict promised it. */
export function jerseyFor(seasons: HallSeason[], inducted: boolean, score: number, lines: HallLines): HallJersey | null {
  const club = mostSeasonsTeam(seasons);
  if (!club) return null;
  const promised = lines.jerseyScore !== null && score >= lines.jerseyScore;
  if (promised) return club;
  if (inducted && club.seasons >= HALL_GAME_RULES.jerseySeasonsInducted) return club;
  return club.seasons >= HALL_GAME_RULES.jerseySeasonsAlone ? club : null;
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
  const reach = Math.min(1, Math.max(0, cand.score / lines.hofLine));
  let share = (t - 10) * reach * reach * (0.6 + 0.4 * rng());
  for (let i = 0; i < maxBallots; i += 1) {
    if (i > 0) share = Math.min(t - 1, Math.max(0, share + 8 * rng() - 3));
    ballots.push({ classYear: firstClass + i, share: oneDecimal(share), elected: false });
    if (rules.stayFloor !== null && share < rules.stayFloor) {
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
  return { ...ballot, jersey: jerseyFor(sport.seasons(c), ballot.outcome === "inducted", legacy.score, sport.lines) };
}

/** The shape all four American careers share, so one binding serves them all. */
export interface UsCareerShape {
  name: string;
  pos: string;
  draftPick: number;
  year: number;
  age: number;
  ovr: number;
  seasons: { year: number; team: string; games: number; ovr: number }[];
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
    snapshot: c => ({ year: lastSeasonYear(c), age: c.age, rating: c.ovr, peak: peakRating(c.seasons, c.ovr), forced: def.shouldRetire(c) }),
  };
}

/* ─── The induction speech ────────────────────────────────────────────────
   The speaker is the player's own generated character. The options are
   SpeechOption lists from careerAwardsNight, so a button's words are built
   from the same steps applySpeech applies. Every line is narration in the
   second person and thanks roles, never a real person by name. The two
   meters live on the speech block itself: how the crowd and the old room
   took it. Nothing in the career score reads them. */

export type HallMeterId = "crowd" | "room";

/** What the save keeps of the night. Every field optional. */
export interface HallSpeechBlock {
  speechId?: HallSpeechId;
  crowd?: number;
  room?: number;
  line?: string;
}

export type HallSpeechId = "fans" | "room" | "story" | "short";

const clampMeter = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const HALL_SPEECH_METERS: Record<HallMeterId, AwardsMeter<HallSpeechBlock>> = {
  crowd: { label: "Crowd", add: (s, d) => { s.crowd = clampMeter((s.crowd ?? 50) + d); }, read: s => s.crowd ?? 50 },
  room: { label: "Old room", add: (s, d) => { s.room = clampMeter((s.room ?? 50) + d); }, read: s => s.room ?? 50 },
};

export const HALL_SPEECHES: SpeechOption<HallSpeechBlock, HallMeterId, HallSpeechId>[] = [
  {
    id: "fans", emoji: "🙌", label: "Thank the fans", tone: "gold",
    effect: [{ meter: "crowd", delta: 12 }],
    line: () => "You gave the longest stretch to the people in the seats, the ones who drove in for every home game. The crowd stood for it.",
  },
  {
    id: "room", emoji: "🤝", label: "Thank the locker room", tone: "bold",
    effect: [{ meter: "room", delta: 12 }],
    line: () => "You went role by role: the trainers, the equipment staff, the backups who pushed you every practice, your first head coach. The old room was on its feet.",
  },
  {
    id: "story", emoji: "📖", label: "Tell the whole story, bad years too", tone: "bold",
    effect: [],
    risk: { chance: 0.5, hit: [{ meter: "crowd", delta: 16 }, { meter: "room", delta: 6 }], miss: [{ meter: "crowd", delta: -6 }, { meter: "room", delta: -4 }] },
    line: (_s, outcome) => outcome === "hit"
      ? "You told all of it, the slumps and the injuries included, and the room went quiet in the right way."
      : "You told all of it and ran twenty minutes long. Half the room was checking the time.",
  },
  {
    id: "short", emoji: "⏱️", label: "Keep it short", tone: "quiet",
    effect: [{ meter: "crowd", delta: 4 }, { meter: "room", delta: 4 }],
    line: () => "Four minutes, a thank you to your family and the people who taught you the game, and off the stage.",
  },
];

/** What a speech button promises, built from its own steps. */
export function speechPromise(option: SpeechOption<HallSpeechBlock, HallMeterId, HallSpeechId>): string {
  const sure = option.effect.length ? describeSteps(HALL_SPEECH_METERS, option.effect) : "";
  if (!option.risk) return sure;
  const pct = Math.round(option.risk.chance * 100);
  const risk = `${pct} percent: ${describeSteps(HALL_SPEECH_METERS, option.risk.hit)}. Otherwise: ${describeSteps(HALL_SPEECH_METERS, option.risk.miss)}`;
  return sure ? `${sure}. ${risk}` : risk;
}

/** Gives the speech once. The coin, where there is one, is keyedRng on the
 *  career's key, so a reload cannot reroll it. A second call changes nothing. */
export function giveHallSpeech(block: HallSpeechBlock | undefined, record: HallRecord, careerKey: string, id: HallSpeechId): HallSpeechBlock {
  const b: HallSpeechBlock = { ...(block ?? {}) };
  if (record.outcome !== "inducted" || b.speechId) return b;
  const line = applySpeech(
    { meters: HALL_SPEECH_METERS, say: (s, l) => { s.line = l; } },
    HALL_SPEECHES, b, id, keyedRng(`hall-speech:${record.sport}:${careerKey}`),
  );
  if (line !== null) b.speechId = id;
  return b;
}

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

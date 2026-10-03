/**
 * Round 973: the academy year gets a report card and one choice.
 *
 * A Soccer Career opens at 16 in an academy, and that year used to be one
 * press of Next Year: the stats grew, a row of random numbers was written and
 * the contract offers arrived with nothing to say what the year had been. Two
 * things change, and both are kept apart from the engine's dice on purpose.
 *
 * 1. THE FOCUS. Before the year you may pick one family (the six bars on the
 *    page, seven for a keeper) to work on. It adds ACADEMY_FOCUS_BONUS points to
 *    that family on top of the year's natural growth, 1 point when you are
 *    within ACADEMY_FOCUS_NEAR of your ceiling and nothing at or past it, the
 *    same wall growStat already puts on natural growth (Rounds 96 and 116:
 *    growth never ignores headroom). It is added AFTER the seven natural growth
 *    draws and draws nothing itself, so every other stat comes out exactly as
 *    it would have, and a career that never picks a focus writes no new field
 *    at all: its save is byte for byte the save it always was, which is what
 *    keeps the awards night fixture (scripts/simCareerAwardsNight.mjs) green.
 *
 * 2. THE REPORT. Built from the save before the year and the save after it,
 *    so "what grew" is read off the real growth rather than told. The youth
 *    cup run and the coach's verdict are picked by a hash of the save, never
 *    by Math.random, so building the report cannot move a single draw of the
 *    career and the same year always reads the same way. The verdict is
 *    narrated about a role (your academy coach), never a quote from a real
 *    person.
 */
import { attrTreeFor } from "./soccerCareerAttributes";
import { allocOverall, type AllocKey } from "./careerEras";

export type AcademyFocus = AllocKey;

/** What a focus adds to its family when you are well short of your ceiling. */
export const ACADEMY_FOCUS_BONUS = 2;
/** Within this many points of your ceiling the focus adds 1 instead. */
export const ACADEMY_FOCUS_NEAR = 3;

/** The two optional save fields this round adds. Neither is written unless a
    focus is picked, so a career without one is unchanged. */
export interface AcademyFields {
  academyFocus?: AcademyFocus;
  /** What the focus really added to its family, written by the year itself. */
  academyFocusAdded?: number;
}

type StatBlock = Record<AcademyFocus, number>;
type AcademySave = StatBlock & AcademyFields & { position: string; overall: number };

export interface AcademyFocusOption { key: AcademyFocus; label: string }

/** The families this position can focus on, in the order the page shows its bars. */
export function academyFocusOptions(position: string): AcademyFocusOption[] {
  return attrTreeFor(position).map(f => ({ key: f.key, label: f.label }));
}

/** The save's focus, or null. A value that is not one of this position's
    families (a corrupt or hand edited save) reads as no focus, so it can
    never touch a stat it does not name. */
export function academyFocusOf(s: { academyFocus?: unknown; position: string }): AcademyFocus | null {
  const f = s.academyFocus;
  if (typeof f !== "string") return null;
  return academyFocusOptions(s.position).some(o => o.key === f) ? (f as AcademyFocus) : null;
}

/** The ladder: 2 well short of the ceiling, 1 within 3 of it, 0 at or past it. */
export function academyFocusBonus(overall: number, potential: number): number {
  if (!(overall < potential)) return 0;
  if (overall >= potential - ACADEMY_FOCUS_NEAR) return 1;
  return ACADEMY_FOCUS_BONUS;
}

/** Picks or clears the focus. Clearing removes both fields, so a career that
    picked and then changed its mind is the same save as one that never did. */
export function withAcademyFocus<T extends object>(s: T, focus: AcademyFocus | null): T & AcademyFields {
  const next = { ...s } as T & AcademyFields;
  delete next.academyFocus;
  delete next.academyFocusAdded;
  if (focus) next.academyFocus = focus;
  return next;
}

/**
 * Called by advanceYouthYear after the natural growth and the overall it
 * gives. Adds the focus to its family (capped at 99, like every stat) and
 * records what it really added. Returns that amount, 0 with no focus, and
 * writes nothing at all when there is no focus. Draws nothing.
 */
export function applyAcademyFocus(s: AcademySave, potential: number): number {
  const focus = academyFocusOf(s);
  if (!focus) return 0;
  const before = s[focus];
  s[focus] = Math.min(99, before + academyFocusBonus(s.overall, potential));
  s.academyFocusAdded = s[focus] - before;
  return s.academyFocusAdded;
}

/* The report card */

export interface AcademyReportLine {
  key: AcademyFocus; label: string; before: number; after: number; delta: number; focus: boolean;
}

export interface AcademyReport {
  /** The academy season just played, and the age it ended at. */
  year: number; age: number; club: string;
  lines: AcademyReportLine[];
  overallBefore: number; overallAfter: number;
  /** The focus and what it really added, or null when none was picked. */
  focus: { key: AcademyFocus; label: string; added: number; maxed: boolean } | null;
  /** The youth season row the engine wrote. */
  apps: number; goals: number; assists: number; cleanSheets: number; keeper: boolean;
  cupStage: number; cupLine: string;
  verdict: string;
}

/** The youth cup ladder, worst to best. A generic youth cup, never a real competition. */
export const ACADEMY_CUP_STAGES = [
  "The under 18s went out in the group stage of the youth cup.",
  "The under 18s went out in the last 16 of the youth cup.",
  "The under 18s reached the quarter-finals of the youth cup.",
  "The under 18s reached the semi-finals of the youth cup.",
  "The under 18s reached the youth cup final and lost it.",
  "The under 18s won the youth cup.",
];

/** FNV-1a over a string. The report's only source of variety, so it draws
    nothing from Math.random and the same save always reads the same. */
export function academyHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type ReportSave = StatBlock & AcademyFields & {
  position: string; overall: number; playerName: string; age: number; currentClub: string;
  seasons: { year: number; apps: number; goals: number; assists: number; cleanSheets: number; type?: string }[];
};

/* The verdict's cut points, in normal growth per skill over the year. On real
   careers the year gives 3.7 a skill on average (2.8 at the 10th percentile,
   4.7 at the 90th), the same for every position. */
const VERDICT_BIG = 4.5;
const VERDICT_SOLID = 3.25;
const VERDICT_QUIET = 2.5;

/* The coach's verdict, narrated about a role. Two readings per tier so two
   careers do not read identically, picked by the hash. Exported for
   simCareerAcademy, which reads each tier's share off real careers. */
export const VERDICTS: Record<"big" | "solid" | "quiet" | "flatCeiling" | "flat", [string, string]> = {
  big: [
    "Your academy coach calls it the biggest jump anyone in the group made this year, and the first team staff have started turning up to watch.",
    "Your academy coach rates it a huge year. Your name has started coming up in first team meetings.",
  ],
  solid: [
    "Your academy coach is happy with it: steady work, real progress, and the scouts have noticed.",
    "Your academy coach calls it a good, honest year. You are right where the staff hoped you would be.",
  ],
  quiet: [
    "Your academy coach says it was a quiet year. The talent is there, the next step is on you.",
    "Your academy coach thinks you coasted a little. Not a disaster, but the others are catching up.",
  ],
  flatCeiling: [
    "Your academy coach says you already look close to your ceiling, so the next jump has to come from first team minutes.",
    "Your academy coach says there was not much left to squeeze out of the academy. First team football is the next test.",
  ],
  flat: [
    "Your academy coach calls it a flat year. It happens at 16, and a first team changes everything.",
    "Your academy coach says the numbers barely moved this year. Nobody is panicking, but the next one matters.",
  ],
};

/**
 * The report for the academy year between `before` and `after`, or null when
 * `after` is not exactly one academy season on from `before` (so a stale pair
 * can never print a wrong card). `potential` is the ceiling the year was
 * played against (effectivePotential of the save before it). Pure: reads its
 * arguments, draws nothing, writes nothing.
 */
export function buildAcademyReport(before: ReportSave, after: ReportSave, potential: number): AcademyReport | null {
  const row = after.seasons[after.seasons.length - 1];
  if (!row || row.type !== "youth" || after.seasons.length !== before.seasons.length + 1) return null;
  const focusKey = academyFocusOf(before);
  const lines = academyFocusOptions(after.position).map(o => ({
    key: o.key, label: o.label, before: before[o.key], after: after[o.key],
    delta: after[o.key] - before[o.key], focus: o.key === focusKey,
  }));
  const focusLine = focusKey ? lines.find(l => l.key === focusKey) : undefined;
  const focus = focusLine
    ? {
        key: focusLine.key, label: focusLine.label,
        added: Math.max(0, Math.round(Number(after.academyFocusAdded) || 0)), maxed: focusLine.after >= 99,
      }
    : null;
  /* The cup is decided by who you were going into the year, so picking a
     focus never changes how the under 18s got on. */
  const h = academyHash(`${before.playerName}|${row.year}|${before.currentClub}|${before.position}`);
  const lift = before.overall >= 70 ? 2 : before.overall >= 62 ? 1 : 0;
  const cupStage = Math.min(ACADEMY_CUP_STAGES.length - 1, (h % 4) + lift);
  /* The overall the skills were really worth going in. A new career's saved
     overall is the creation screen's average of all seven stats, while the
     game's overall (allocOverall, the exact mirror of the engine's
     calcOverall) weighs six for an outfielder and seven by weight for a
     keeper, so the saved number can sit a point (five for a keeper) under the
     skills. Reading the start off the skills keeps the year's gain to what
     the year did; the end is the overall the year itself saved. */
  const overallBefore = allocOverall(before, before.position);
  /* The coach's verdict reads the year's normal growth per skill, so a keeper's
     seven weigh the same as an outfielder's six and a focus never changes it
     (the focus has its own line). The cut points come from real careers made
     the way the creation screen makes them, measured in simCareerAcademy
     section 7: about one year in six reads big, most read solid, one in five
     quiet and a few flat. */
  const natural = lines.reduce((sum, l) => sum + l.delta, 0) - (focus ? focus.added : 0);
  const perSkill = natural / lines.length;
  const tier = perSkill >= VERDICT_BIG ? "big" : perSkill >= VERDICT_SOLID ? "solid" : perSkill >= VERDICT_QUIET ? "quiet"
    : after.overall >= potential - ACADEMY_FOCUS_NEAR ? "flatCeiling" : "flat";
  return {
    year: row.year, age: after.age, club: after.currentClub, lines,
    overallBefore, overallAfter: after.overall, focus,
    apps: row.apps, goals: row.goals, assists: row.assists, cleanSheets: row.cleanSheets,
    keeper: after.position === "GK",
    cupStage, cupLine: ACADEMY_CUP_STAGES[cupStage],
    verdict: VERDICTS[tier][(h >>> 8) & 1],
  };
}

/** The line the focus picker prints, and the one the report prints, built
    from the same constants the year applies so the words cannot drift. The
    game never shows the ceiling as a number (careerEras potentialTier), so
    the rule says "close" rather than a distance the player cannot measure;
    the report's result line then says which rung the year landed on. */
export const ACADEMY_FOCUS_RULE =
  `+${ACADEMY_FOCUS_BONUS} to that skill on top of the year's normal growth. If the year takes you close to your ceiling it adds +1, and nothing once you reach it.`;

export function academyFocusResultLine(focus: { label: string; added: number; maxed: boolean }): string {
  const head = `Your ${focus.label} focus added +${focus.added} on top of the normal growth`;
  if (focus.added >= ACADEMY_FOCUS_BONUS) return `${head}.`;
  if (focus.added > 0) return focus.maxed ? `${head}, which took it to 99.` : `${head}: the year took you close to your ceiling.`;
  return focus.maxed
    ? `Your ${focus.label} is already 99, so the focus had nothing to add.`
    : `Your ${focus.label} focus added nothing: you are on your ceiling now.`;
}

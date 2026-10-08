import { attrTreeFor } from "@/lib/soccerCareerAttributes";
import type { CareerState } from "@/lib/soccerCareerEngine";
import type { CareerMomentSpec, MomentTick } from "@/components/career-moments/moments";
import { debutMomentKey, runTag } from "./careerMoments";

/* Round 1107: the pure pieces Soccer Career's milestone scenes are built
   from. No React, no page state, no storage: every function here turns two
   saves (the one before a season step and the one after) or one save into
   plain data the career moment kit can draw. The page mounts them in the
   round's Part B; nothing calls them yet.

   Nothing is estimated. A growth note is the difference between two saves'
   own numbers, read off the fields the page already prints (an attribute
   family is printed rounded, so it is compared rounded). A fall never gets a
   scene of its own (losses stay quiet): it shows in the tick tiles only.
   Every line narrates what happened; none is put in anybody's mouth.

   Soccer's own file: the page imports it, a shared file never does. */

export interface SeasonGrowthNote {
  /** The season row the step just wrote (the last of next.seasons). */
  year: number;
  club: string;
  /** The two saves' own overalls. */
  overall: { from: number; to: number };
  /** Each attribute family whose printed (rounded) value changed, in the page's order. */
  attrs: { key: string; label: string; from: number; to: number }[];
  /** He did not wear the club's armband before the step and does after it. */
  clubCaptain: boolean;
  /** The same for his country's. */
  intlCaptain: boolean;
}

/** A rise this big is a scene. Anything smaller is only a tile. */
export const OVERALL_JUMP = 3;

const family = (c: CareerState, key: string): number =>
  Math.round(Number((c as unknown as Record<string, unknown>)[key]));

/** What one season step changed about him, or null when the step wrote no season. */
export function seasonGrowthNote(prev: CareerState, next: CareerState): SeasonGrowthNote | null {
  const before = prev.seasons ?? [];
  const after = next.seasons ?? [];
  if (after.length <= before.length) return null;
  const row = after[after.length - 1];
  const attrs: SeasonGrowthNote["attrs"] = [];
  for (const fam of attrTreeFor(next.position)) {
    const from = family(prev, fam.key);
    const to = family(next, fam.key);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) continue;
    attrs.push({ key: fam.key, label: fam.label, from, to });
  }
  return {
    year: row.year,
    club: row.club,
    overall: { from: prev.overall, to: next.overall },
    attrs,
    clubCaptain: !(prev.isClubCaptain ?? false) && (next.isClubCaptain ?? false),
    intlCaptain: !(prev.intStats?.isCaptain ?? false) && (next.intStats?.isCaptain ?? false),
  };
}

/** One small tile per changed family: what it is now and what it was. */
export function growthTicks(note: SeasonGrowthNote): MomentTick[] {
  return note.attrs.map(a => ({ label: a.label, to: String(a.to), from: String(a.from) }));
}

type MilestoneSpec = CareerMomentSpec & { kind: "milestone" };

/** The overall jump scene, or null when the rise is under OVERALL_JUMP (a fall included). */
export function overallSpec(note: SeasonGrowthNote, next: CareerState): MilestoneSpec | null {
  const { from, to } = note.overall;
  if (!(to - from >= OVERALL_JUMP)) return null;
  return {
    kind: "milestone",
    tone: "good",
    key: `ovr|${runTag(next)}|${note.year}|${from}|${to}`,
    title: `Up to ${to} overall`,
    lines: [`You started the season on ${from}`],
    count: { text: String(to), from: String(from), label: "overall" },
    colour: next.currentClubColor,
  };
}

/** One scene per armband he took in this step: his club's, his country's, both or neither. */
export function armbandSpecs(note: SeasonGrowthNote, next: CareerState): MilestoneSpec[] {
  const out: MilestoneSpec[] = [];
  if (note.clubCaptain) {
    out.push({
      kind: "milestone",
      tone: "gold",
      key: `armband|club|${runTag(next)}|${note.year}`,
      title: "©️ Club captain",
      lines: [`The ${next.currentClub} armband is yours`],
      colour: next.currentClubColor,
    });
  }
  if (note.intlCaptain) {
    out.push({
      kind: "milestone",
      tone: "gold",
      key: `armband|intl|${runTag(next)}|${note.year}`,
      title: `©️ Captain of ${next.nationality}`,
      lines: ["You lead your country out from now on"],
    });
  }
  return out;
}

/** The first cap, as a scene: the debut card's own strings. */
export function debutSpec(career: CareerState): MilestoneSpec {
  return {
    kind: "milestone",
    tone: "gold",
    key: debutMomentKey(career),
    title: "INTERNATIONAL DEBUT",
    lines: [
      `${career.playerName} has been called up to the ${career.nationality} national team!`,
      `${career.nationality} · Age ${career.age} · OVR ${career.overall}`,
      "🎉 Your international journey begins.",
    ],
  };
}

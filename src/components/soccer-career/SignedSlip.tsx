import { formatWage } from "@/lib/soccerCareerEngine";
import type { CareerState } from "@/lib/soccerCareerEngine";
import { localizeMoney } from "@/lib/soccerCurrency";
import { SigningMoment } from "@/components/career-moments/CareerMomentCard";
import type { CareerMomentSpec } from "@/components/career-moments/moments";
import PlayerAvatar from "./PlayerAvatar";
import { signingMomentKey } from "./careerMoments";

/* Round 530: the slip that lands under the toast once a deal is done.
   Pure presentation: the club, the length and the wage are whatever the
   engine wrote onto the career (the wage after the agent's cut, never the
   offer's number), so the slip can never say something the save does not.
   It sits inside the reveal area so the page never moves, and it goes with
   the next action, because the page keeps it only for the career object it
   was written for.

   Round 1107: the slip is the signing scene now, drawn by the career moment
   kit (src/components/career-moments). His avatar turns up in the new club's
   colour (one flat colour: PlayerAvatar draws a plain shirt, no stripe, no
   badge, no sponsor), the terms land one by one and the wage arrives last.
   The two fact strings are the ones the slip always printed, character for
   character. It plays once per signing: come back from another screen and
   it sits still. Nothing here writes the save or draws a random number. */

export type SignedNote = {
  kind: "transfer" | "loan" | "extension";
  club: string;
  years: number;
  wage: number;
  /** Loan only: the club the contract and the wage stay with. */
  from?: string;
  /** Transfer only: the fee in millions, as the offer carried it. Absent, the scene has no fee line. */
  fee?: number;
  /** The weekly wage before this deal. Absent, the wage simply arrives. */
  prevWage?: number;
  /** The career object this slip was written for; any newer one dismisses it. */
  forCareer: CareerState;
};

/** The scene a deal becomes. Pure: every string is the engine's own formatting of the note. */
export function signingSpec(note: SignedNote): CareerMomentSpec & { kind: "signing" } {
  const title =
    note.kind === "transfer" ? `✍️ Signed with ${note.club}`
    : note.kind === "loan" ? `🛫 Loan agreed: ${note.club}`
    : `📝 Extended at ${note.club}`;
  const terms =
    note.kind === "loan"
      ? `One season. Your contract and ${formatWage(note.wage)} stay with ${note.from}`
      : `${note.years} year${note.years === 1 ? "" : "s"} at ${formatWage(note.wage)}`;
  const lines = [terms];
  if (note.kind === "transfer" && typeof note.fee === "number" && Number.isFinite(note.fee)) {
    /* The offer card's own words for the same two cases. */
    if (note.fee > 0) lines.push(`${localizeMoney(`€${note.fee.toFixed(1)}M`)} fee`);
    else if (note.fee === 0) lines.push("Free transfer");
  }
  /* A loan's wage does not change, and its line already says so. */
  const wage = formatWage(note.wage);
  const before = typeof note.prevWage === "number" && Number.isFinite(note.prevWage) && note.prevWage > 0 ? formatWage(note.prevWage) : null;
  const count = note.kind === "loan" ? undefined : { text: wage, label: "your wage", ...(before && before !== wage ? { from: before } : {}) };
  return {
    kind: "signing",
    tone: "good",
    key: signingMomentKey(note),
    title,
    lines,
    count,
    colour: note.forCareer?.currentClubColor,
  };
}

export function SignedSlip({ note }: { note: SignedNote }) {
  const c = note.forCareer;
  const avatar = c?.appearance ? <PlayerAvatar appearance={c.appearance} clubColor={c.currentClubColor} size={56} /> : undefined;
  return (
    <div data-signed-slip className="mb-3">
      <SigningMoment spec={signingSpec(note)} bind="sc-signing" art={avatar} />
    </div>
  );
}

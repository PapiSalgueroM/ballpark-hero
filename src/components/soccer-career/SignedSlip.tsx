import { formatWage } from "@/lib/soccerCareerEngine";
import type { CareerState } from "@/lib/soccerCareerEngine";

/* Round 530: the slip that lands under the toast once a deal is done.
   Pure presentation: the club, the length and the wage are whatever the
   engine wrote onto the career (the wage after the agent's cut, never the
   offer's number), so the slip can never say something the save does not.
   It slams in (CelebrationStyles is mounted by the game screen) inside the
   reveal area so the page never moves, and it goes with the next action,
   because the page keeps it only for the career object it was written for. */

export type SignedNote = {
  kind: "transfer" | "loan" | "extension";
  club: string;
  years: number;
  wage: number;
  /** Loan only: the club the contract and the wage stay with. */
  from?: string;
  /** The career object this slip was written for; any newer one dismisses it. */
  forCareer: CareerState;
};

export function SignedSlip({ note }: { note: SignedNote }) {
  const title =
    note.kind === "transfer" ? `✍️ Signed with ${note.club}`
    : note.kind === "loan" ? `🛫 Loan agreed: ${note.club}`
    : `📝 Extended at ${note.club}`;
  const terms =
    note.kind === "loan"
      ? `One season. Your contract and ${formatWage(note.wage)} stay with ${note.from}`
      : `${note.years} year${note.years === 1 ? "" : "s"} at ${formatWage(note.wage)}`;
  return (
    <div
      data-signed-slip
      className="cm-slam mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center"
      style={{ animationDelay: "0.15s" }}
    >
      <div className="text-sm font-black">{title}</div>
      <div className="text-xs text-muted-foreground">{terms}</div>
    </div>
  );
}

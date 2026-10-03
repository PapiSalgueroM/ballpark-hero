import { Button } from "@/components/ui/button";
import {
  HALL_SPEECHES, HALL_SPEECH_METERS, speechPromise,
  type HallRecord, type HallRules, type HallSpeechBlock, type HallSpeechId,
} from "@/lib/careerHallOfFame";

/* ─── Round 915: the Hall of Fame card, shared ───
   The wait, the ballot years, the jersey and the speech for any of the four
   US careers, drawn from a HallRecord and the sport's HallRules. A real rule
   is printed only where the rules mark it verified (two sources in
   docs/audits/US-HALL-RULES-2026-10.md), and a vote share only where the real
   Hall publishes one. Each speech button shows what it does, built from the
   same steps the speech applies. Not wired into a board yet: the boards are
   being merged into one in another round, and that round mounts this. */

/** The headline for how it went. */
export function hallHeadline(rec: HallRecord): string {
  const n = rec.ballots.length;
  if (rec.outcome === "inducted") {
    return rec.firstBallot
      ? `First ballot. Class of ${rec.inductedClass}.`
      : `Class of ${rec.inductedClass}, on ballot number ${n}.`;
  }
  if (rec.outcome === "fellOff") return `Off the ballot after ${n} ${n === 1 ? "year" : "years"}.`;
  if (rec.outcome === "waiting") return `${n} ${n === 1 ? "ballot" : "ballots"} and still waiting on the call.`;
  return "Never made the ballot.";
}

/** The real rules this Hall runs on, only the verified ones. */
export function hallRuleLines(rules: HallRules): string[] {
  const out: string[] = [];
  const p = rules.provenance;
  if (p.wait === "verified") out.push(`Eligible after ${rules.waitSeasons} seasons away from the game.`);
  if (p.threshold === "verified") out.push(`Needs ${rules.threshold} percent of the vote.`);
  if (p.ballotYears === "verified" && rules.ballotYears !== null) out.push(`${rules.ballotYears} years on the ballot at most.`);
  if (p.stayFloor === "verified" && rules.stayFloor !== null) out.push(`Under ${rules.stayFloor} percent and you drop off.`);
  return out;
}

/** One ballot year as the card prints it. */
export function ballotLine(rules: HallRules, b: HallRecord["ballots"][number]): string {
  const result = b.elected ? "elected" : "not enough votes";
  const shares = rules.publishesShares && rules.provenance.publishesShares === "verified";
  return shares ? `${b.classYear}: ${b.share} percent, ${result}` : `${b.classYear}: ${result}`;
}

export function HallOfFameCard({ record, rules, speech, onSpeech, onDismiss }: {
  record: HallRecord;
  rules: HallRules;
  speech?: HallSpeechBlock;
  onSpeech: (id: HallSpeechId) => void;
  onDismiss: () => void;
}) {
  const inducted = record.outcome === "inducted";
  const asking = inducted && !speech?.speechId;
  return (
    <div className={`rounded-xl border-2 ${inducted ? "border-amber-400/60 from-amber-500/20" : "border-border from-transparent"} bg-gradient-to-b to-transparent p-5 space-y-3 animate-in fade-in zoom-in-95 duration-700`}>
      <div className="text-center space-y-1">
        <div className={`text-5xl ${inducted ? "animate-trophy-glow" : ""}`}>{inducted ? "🏛️" : "🗳️"}</div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{record.hallName}</p>
        <h3 className="text-lg font-black tracking-tight">{hallHeadline(record)}</h3>
        <p className="text-xs text-muted-foreground">Eligible from the Class of {record.firstClass}.</p>
      </div>
      {record.ballots.length > 0 && (
        <ul className="rounded-lg border border-border bg-muted/20 p-2 space-y-0.5 text-xs">
          {record.ballots.map(b => (
            <li key={b.classYear} className={b.elected ? "font-bold text-amber-300" : "text-muted-foreground"}>{ballotLine(rules, b)}</li>
          ))}
        </ul>
      )}
      {record.jersey && (
        <p className="text-center text-xs font-bold">👕 {record.jersey.team} retired your number after {record.jersey.seasons} seasons there.</p>
      )}
      {hallRuleLines(rules).length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">{hallRuleLines(rules).join(" ")}</p>
      )}
      {inducted && speech?.speechId && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 space-y-1 text-center animate-fade-in">
          {speech.line && <p className="text-xs">{speech.line}</p>}
          <p className="text-[11px] font-bold text-amber-300">
            {(Object.keys(HALL_SPEECH_METERS) as (keyof typeof HALL_SPEECH_METERS)[])
              .map(m => `${HALL_SPEECH_METERS[m].label} ${HALL_SPEECH_METERS[m].read(speech)}`).join(", ")}
          </p>
        </div>
      )}
      {asking ? (
        <div className="space-y-1.5">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-amber-300">Your induction speech</p>
          {HALL_SPEECHES.map(o => (
            <Button
              key={o.id}
              onClick={() => onSpeech(o.id)}
              className="w-full h-auto py-2 justify-start text-left whitespace-normal flex-col items-start gap-0.5 bg-muted hover:bg-muted/80 text-white"
            >
              <span className="text-xs font-bold">{`${o.emoji} ${o.label}`}</span>
              <span className="text-[11px] font-normal opacity-80">{speechPromise(o)}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold text-black bg-emerald-600 hover:bg-emerald-500">
          Continue →
        </Button>
      )}
    </div>
  );
}

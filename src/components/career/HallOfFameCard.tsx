import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { HallRecord, HallRules, HallSpeechBlock, HallSpeechId } from "@/lib/careerHallOfFame";
import { HALL_SPEECHES, HALL_SPEECH_METERS, speechPromise } from "@/lib/careerHallSpeech";
import { CelebrationStyles, revealAfter, revealDelay } from "@/components/club-manager/Celebration";

/* ─── Round 915: the Hall of Fame card, shared; Round 1039 mounts it ───
   The wait, the ballot years, the jersey and the speech for any of the four
   US careers, drawn from a HallRecord and the sport's HallRules. A real rule
   is printed only where the rules mark it verified (two sources in
   docs/audits/US-HALL-RULES-2026-10.md), and a vote share only where the real
   Hall publishes one. Each speech button shows what it does, built from the
   same steps the speech applies.

   Round 1039: the retirement screen of the one US board mounts it lazily.
   - Era truth: a class year and the rule lines print only for a first class
     at or after the rules' verifiedFromClass. An earlier career's ballots
     read "First ballot", "Second ballot" with no year.
   - The wait plays: the ballot years tick in one at a time, the last one
     lands with a slam, then the headline. onLanded fires when it has, so the
     board can hold its Hall pill and confetti until then. Reduced motion
     lands everything on its final frame at once.
   - Continue folds the card to its headline. */

/** Ballot paces, seconds: the first ballot shows at START, one more every STEP. */
const START = 0.6;
const STEP = 0.5;
/** cm-slam runs 0.4 s (CelebrationStyles). */
const SLAM = 0.4;

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
  "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth"];
const ordinal = (i: number) => ORDINALS[i] ?? `Ballot ${i + 1}`;

/** Whether this record's class years are anchored on the rules the audit
 *  two-sources (and only then the rule lines too). */
export function hallYearsShown(rules: HallRules, rec: HallRecord): boolean {
  return rules.provenance.firstClass === "verified" && rec.firstClass >= rules.verifiedFromClass;
}

/** The headline for how it went. */
export function hallHeadline(rec: HallRecord, rules?: HallRules): string {
  const n = rec.ballots.length;
  const years = !rules || hallYearsShown(rules, rec);
  if (rec.outcome === "inducted") {
    if (!years) return rec.firstBallot ? "First ballot. You're in." : `In on ballot number ${n}.`;
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

/** One ballot year as the card prints it: the class year where the era is
 *  anchored, its place on the ballot otherwise. */
export function ballotLine(rules: HallRules, b: HallRecord["ballots"][number], i = 0, years = true): string {
  const result = b.elected ? "elected" : "not enough votes";
  const shares = rules.publishesShares && rules.provenance.publishesShares === "verified";
  const when = years ? String(b.classYear) : `${ordinal(i)} ballot`;
  return shares ? `${when}: ${b.share} percent, ${result}` : `${when}: ${result}`;
}

/** When the card's last piece of the ballot has landed, seconds after mount. */
export function hallLandsAfter(rec: HallRecord): number {
  return revealAfter(rec.ballots.length, START, STEP) + SLAM;
}

export function HallOfFameCard({ record, rules, speech, onSpeech, onDismiss, folded = false, onLanded }: {
  record: HallRecord;
  rules: HallRules;
  speech?: HallSpeechBlock;
  onSpeech: (id: HallSpeechId) => void;
  onDismiss: () => void;
  /** Continue was pressed: the card is its headline line. */
  folded?: boolean;
  /** Called once the last ballot and the headline have landed. */
  onLanded?: () => void;
}) {
  const inducted = record.outcome === "inducted";
  const asking = inducted && !speech?.speechId;
  const years = hallYearsShown(rules, record);
  const n = record.ballots.length;
  const headAt = revealAfter(n, START, STEP);
  const after = `${Math.round((headAt + SLAM) * 1000) / 1000}s`;
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  const runKey = `${record.sport}:${record.firstClass}:${record.outcome}:${n}`;
  useEffect(() => {
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => landedRef.current?.(), reduce ? 0 : hallLandsAfter(record) * 1000);
    return () => window.clearTimeout(t);
    // The run is keyed, so a speech given later never replays the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  if (folded) {
    return (
      <div className={`rounded-xl border px-4 py-2 text-center text-xs font-bold ${inducted ? "border-gold/50 text-gold" : "border-border text-muted-foreground"}`}>
        {inducted ? "🏛️" : "🗳️"} {record.hallName}: {hallHeadline(record, rules)}
      </div>
    );
  }
  return (
    <div className={`relative rounded-xl border-2 ${inducted ? "border-gold/60 from-amber-500/15" : "border-border from-transparent"} bg-card bg-gradient-to-b to-transparent p-5 space-y-3`}>
      <CelebrationStyles />
      <div className="text-center space-y-1">
        <div className={`text-5xl ${inducted ? "animate-trophy-glow" : ""}`}>{inducted ? "🏛️" : "🗳️"}</div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{record.hallName}</p>
        {years && <p className="text-xs text-muted-foreground">Eligible from the Class of {record.firstClass}.</p>}
      </div>
      {n > 0 && (
        <ul className="rounded-lg border border-border bg-muted/20 p-2 space-y-0.5 text-xs">
          {record.ballots.map((b, i) => (
            <li
              key={b.classYear}
              className={b.elected ? "cm-slam font-bold text-gold" : "cm-tick-in text-muted-foreground"}
              style={{ animationDelay: revealDelay(i, START, STEP) }}
            >
              {ballotLine(rules, b, i, years)}
            </li>
          ))}
        </ul>
      )}
      <h3 className="cm-slam text-center text-lg font-black tracking-tight text-foreground" style={{ animationDelay: `${headAt}s` }}>{hallHeadline(record, rules)}</h3>
      <div className="cm-rise space-y-2" style={{ animationDelay: after }}>
        {record.jersey && (
          <p className="text-center text-xs font-bold text-foreground">👕 {record.jersey.teamName ?? record.jersey.team} retired your number after {record.jersey.seasons} {record.jersey.seasons === 1 ? "season" : "seasons"} there.</p>
        )}
        {years && hallRuleLines(rules).length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground">{hallRuleLines(rules).join(" ")}</p>
        )}
        {inducted && speech?.speechId && (
          <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 space-y-1 text-center">
            {speech.line && <p className="text-xs text-foreground">{speech.line}</p>}
            <p className="text-[11px] font-bold text-gold">
              {(Object.keys(HALL_SPEECH_METERS) as (keyof typeof HALL_SPEECH_METERS)[])
                .map(m => `${HALL_SPEECH_METERS[m].label} ${HALL_SPEECH_METERS[m].read(speech)}`).join(", ")}
            </p>
          </div>
        )}
        {/* Round 1051: what the voters weighed, for a career retired on calibration 2. */}
        {record.weighs && <p data-hall-weighs className="text-center text-xs text-muted-foreground">{record.weighs}</p>}
      </div>
      {asking ? (
        <div className="cm-rise-gated space-y-1.5" style={{ animationDelay: after }}>
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-gold">Your induction speech</p>
          {HALL_SPEECHES.map(o => (
            <Button
              key={o.id}
              onClick={() => onSpeech(o.id)}
              className="w-full h-auto py-2 justify-start text-left whitespace-normal flex-col items-start gap-0.5 border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <span className="text-xs font-bold">{`${o.emoji} ${o.label}`}</span>
              <span className="text-[11px] font-normal opacity-80">{speechPromise(o)}</span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="cm-rise-gated" style={{ animationDelay: after }}>
          <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold text-black bg-emerald-600 hover:bg-emerald-500">
            Continue →
          </Button>
        </div>
      )}
    </div>
  );
}

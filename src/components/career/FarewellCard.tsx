import { Button } from "@/components/ui/button";
import { RETIREMENT_CHOICES, type RetirementChoiceId, type RetirementTalk } from "@/lib/careerRetirement";

/* ─── Round 915: the retirement talk and the farewell season, shared ───
   One card for all four US careers. It is drawn from careerRetirement.ts and
   nothing else: the reason comes off the talk, and each button carries the
   words RETIREMENT_CHOICES writes for it, which the vitest file holds to what
   answerRetirement really does. Round 1039 mounts it on the one US board
   (src/components/us-career/UsCareerBoard.tsx), lazily, and fixed the light
   mode contrast of its buttons with theme tokens. */

/** Why the talk came, in the player's terms. */
export function talkReason(talk: RetirementTalk, age: number): string {
  if (talk.reason === "drop") {
    return `You're ${talk.drop} points off your best (${talk.peak}), and you're ${age}. People are starting to ask how long you keep going.`;
  }
  return `Your rating is down to ${talk.rating} at ${age}. People are starting to ask how long you keep going.`;
}

export function FarewellCard({ talk, age, onChoose }: {
  talk: RetirementTalk;
  age: number;
  onChoose: (id: RetirementChoiceId) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent p-5 space-y-3 animate-in fade-in duration-500">
      <div className="text-center space-y-1">
        <div className="text-4xl">🕰️</div>
        <h3 className="text-lg font-black tracking-tight">Is it time?</h3>
        <p className="text-xs text-muted-foreground">{talkReason(talk, age)}</p>
      </div>
      <div className="space-y-1.5">
        {RETIREMENT_CHOICES.map(choice => (
          <Button
            key={choice.id}
            onClick={() => onChoose(choice.id)}
            className={`w-full h-auto py-2 justify-start text-left whitespace-normal flex-col items-start gap-0.5 ${choice.id === "oneMore" ? "border border-transparent bg-emerald-600 hover:bg-emerald-500 text-black" : "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            <span className="text-xs font-bold">{`${choice.emoji} ${choice.label}`}</span>
            <span className="text-[11px] font-normal opacity-80">{choice.detail}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/** The banner a farewell season carries, so the last year reads as one. */
export function FarewellSeasonBanner({ year }: { year: number }) {
  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-center animate-fade-in">
      <p className="text-xs font-bold text-gold">🎤 Farewell season, {year}</p>
      <p className="text-[11px] text-muted-foreground">Everyone knows this is the last one. Every road crowd gets one more look.</p>
    </div>
  );
}

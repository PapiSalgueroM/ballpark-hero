/* ─── Round 796: the rivalry choice card, drawn once ─────────────────────────

   RivalryEventCard (Round 521) shows a beat that happened to you, with one
   Continue button. This is the other half: the rival puts a decision in
   front of you, two or three options with what each one promises (and the
   gamble, said out loud, when there is one), and after the tap the same card
   shows what actually happened before you carry on. Same gold and bg-card
   language and the same head to head block as the beat card, so the two
   read as one feature. Sport neutral: the card is plain data off
   careerRivalryChoices.ts, the tap and the outcome come in as props.

   The outcome lives on the board, not here, because the board has already
   written the answer to the save by the time this card shows it: a reload
   on the outcome lands on the hub with the choice made, never asks twice. */
import { CelebrationStyles } from '@/components/club-manager/Celebration';
import type { RivalryChoiceCard as Card } from '@/lib/careerRivalryChoices';
import type { RivalryHeadToHead } from '@/components/us-career/RivalryEventCard';

export function RivalryChoiceCard({
  card, onChoose, outcome, onContinue, headToHead,
}: {
  card: Card;
  onChoose: (choiceIdx: number) => void;
  /** Set once the board has applied a choice: which one, and the line it wrote. */
  outcome?: { choiceIdx: number; line: string } | null;
  onContinue: () => void;
  headToHead?: RivalryHeadToHead;
}) {
  const picked = outcome ? card.choices[outcome.choiceIdx] : null;
  return (
    <div className="space-y-3" key={card.id} data-rivalry-choice={card.id}>
      <CelebrationStyles />
      <div className="cm-rise rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🪞 Rivalry: your call</p>
        <p className="cm-slam mt-1 text-3xl leading-none" style={{ animationDelay: '0.2s' }}>{card.emoji}</p>
        <p className="cm-slam mt-1.5 font-display text-lg font-black text-foreground" style={{ animationDelay: '0.3s' }}>{card.title}</p>
        <p className="cm-rise mt-2 text-sm leading-snug text-muted-foreground" style={{ animationDelay: '0.55s' }}>{card.description}</p>
        {headToHead && (
          <div className="cm-rise mt-3 flex items-center justify-between rounded-xl bg-secondary/60 p-3" style={{ animationDelay: '0.75s' }}>
            <div className="flex-1 text-center">
              <div className="text-xs font-bold text-foreground">{headToHead.myName}</div>
              <div className="text-xl font-black text-gold">{headToHead.myRating}</div>
            </div>
            <div className="text-sm font-black text-muted-foreground">VS</div>
            <div className="flex-1 text-center">
              <div className="text-xs font-bold text-foreground">{headToHead.rivalName}</div>
              <div className="text-xl font-black text-muted-foreground">{headToHead.rivalRating}</div>
            </div>
          </div>
        )}
      </div>
      {outcome && picked ? (
        <>
          <div className="cm-rise rounded-2xl border border-border bg-card p-4" data-rivalry-outcome>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">You chose: {picked.emoji} {picked.label}</p>
            <p className="mt-2 text-sm text-foreground">{outcome.line}</p>
          </div>
          <button
            onClick={onContinue}
            className="cm-rise mx-auto flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Continue
          </button>
        </>
      ) : (
        <div className="space-y-1.5">
          {card.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => onChoose(i)}
              data-rivalry-option={i}
              className="cm-rise w-full rounded-xl border border-border bg-secondary px-3 py-2 text-left hover:border-primary/50"
              style={{ animationDelay: `${0.9 + i * 0.1}s` }}
            >
              <span className="block text-sm font-bold text-foreground">{c.emoji} {c.label}</span>
              <span className="block text-[11px] text-muted-foreground">{c.consequence}</span>
              {c.risk && <span className="block text-[11px] text-amber-600 dark:text-amber-400">{c.risk}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

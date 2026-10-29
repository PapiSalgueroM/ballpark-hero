import { Button } from '@/components/ui/button';

/* ─── Round 1544: the call up beat ───
   The US national team calls after a season rated at the bar, in a summer with
   an Olympics or a World Cup. Props only: the board hands in the words the
   sport's face wrote (src/lib/nbaCareerIntl.ts summerNotes), so this file
   imports no sport and loads in its own chunk (React.lazy on the board).
   Nobody speaks: the screen narrates, and the sender is the national team,
   never a named person. Text is 12 px or more (critic correction 8). */

export interface IntlCallUpCardProps {
  /** "the 2004 Olympics in Athens" */
  editionLabel: string;
  /** his age that summer */
  age: number;
  /** the chance he comes home hurt, whole percent */
  knockPct: number;
  /** what going costs when he comes home hurt, in words */
  hurtCost: string;
  /** a line about the field when the game draws it, else null */
  fieldNote: string | null;
  /** a line when the game plays the edition in another format, else null */
  playedAsNote: string | null;
  onAnswer: (choice: 'go' | 'rest') => void;
}

export default function IntlCallUpCard({ editionLabel, age, knockPct, hurtCost, fieldNote, playedAsNote, onAnswer }: IntlCallUpCardProps) {
  return (
    <div data-intl-call className="rounded-xl border-2 border-sky-500/40 bg-gradient-to-b from-sky-500/10 to-transparent p-5 space-y-3 animate-in fade-in duration-500">
      <div className="text-center space-y-1">
        <div className="text-4xl" aria-hidden>🌍</div>
        <h3 className="text-lg font-black tracking-tight">The national team is calling</h3>
        <p className="text-sm text-muted-foreground">
          The US national team wants you for {editionLabel}. You're {age} that summer.
        </p>
        {fieldNote && <p className="text-xs text-muted-foreground">{fieldNote}</p>}
        {playedAsNote && <p className="text-xs text-muted-foreground">{playedAsNote}</p>}
      </div>
      <div className="space-y-2">
        <Button
          data-intl-answer="go"
          onClick={() => onAnswer('go')}
          className="w-full min-h-[44px] h-auto py-2 justify-start text-left whitespace-normal flex-col items-start gap-0.5 border border-transparent bg-sky-600 hover:bg-sky-500 text-white"
        >
          <span className="text-sm font-bold">✈️ Go and play</span>
          <span className="text-xs font-normal opacity-90">Groups, then a knockout. A medal goes in your Trophy Case. The chance you come home hurt: {knockPct} percent ({hurtCost}).</span>
        </Button>
        <Button
          data-intl-answer="rest"
          onClick={() => onAnswer('rest')}
          className="w-full min-h-[44px] h-auto py-2 justify-start text-left whitespace-normal flex-col items-start gap-0.5 border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          <span className="text-sm font-bold">🛋️ Rest this summer</span>
          <span className="text-xs font-normal opacity-90">No games, no risk, nothing on the shelf.</span>
        </Button>
      </div>
    </div>
  );
}

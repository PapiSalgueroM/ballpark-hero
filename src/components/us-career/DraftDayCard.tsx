/* Round 530: draft day, one card, four career games.

   Until now the biggest first moment of a career ("With pick 4, the Titans
   select Ryder Blaze") was the top line of a grey feed. This is the same
   three strings the boards already push into that feed at create time,
   given the treatment DraftNightCard (Round 515) gives the front offices:
   the pick line slams in, the two lines under it tick in one after the
   other, and a first rounder gets confetti.

   Pure presentation. The pick, the team and the name are the engine's own
   draft result; the two lines are the strings the board wrote. Nothing here
   decides anything, and the feed keeps its copy of all three, so the News
   box reads exactly as it did before.

   Reduced motion lands on the final frame, never display:none: every row
   here starts at opacity 0 and animates in, so cancelling the animation
   without landing it would hide the pick from the people who asked for less
   motion. CelebrationStyles carries that rule for the cm- classes and
   ConfettiBurst carries its own (decoration, so it simply does not run). */

import { ConfettiBurst, CelebrationStyles } from '@/components/club-manager/Celebration';
import { revealDelay } from '@/lib/usCareerReveal';
import { cn } from '@/lib/utils';

export interface DraftDayFacts {
  pick: number;
  teamLabel: string;
  playerName: string;
  /** The lines the board wrote under the pick, in order. Shown verbatim. */
  lines: string[];
  /** The last pick of round one in this sport, so the confetti rule is data. */
  firstRoundEnd: number;
}

export default function DraftDayCard({ pick, teamLabel, playerName, lines, firstRoundEnd }: DraftDayFacts) {
  const firstRound = pick <= firstRoundEnd;
  return (
    <div
      data-draft-day
      className={cn(
        'relative overflow-hidden rounded-2xl border p-3 text-center',
        firstRound ? 'border-gold/60 bg-card cm-win-pulse' : 'border-border bg-card',
      )}
    >
      <CelebrationStyles />
      {firstRound && <ConfettiBurst seed={pick + playerName.length} count={26} />}
      <div className="relative">
        <p className="cm-rise text-[10px] font-bold uppercase tracking-widest text-muted-foreground" style={{ animationDelay: '0.05s' }}>
          Draft day
        </p>
        <p className="cm-slam mt-1 font-display text-base font-black text-foreground" style={{ animationDelay: '0.25s' }}>
          With pick <span className={firstRound ? 'text-gold' : 'text-primary'}>{pick}</span>, the {teamLabel} select {playerName}
        </p>
        {lines.length > 0 && (
          <div className="mt-2 space-y-1 text-left">
            {lines.map((l, i) => (
              <p
                key={`${pick}-${i}`}
                className="cm-tick-in rounded-lg bg-background px-2.5 py-1.5 text-xs leading-snug text-muted-foreground"
                style={{ animationDelay: `${revealDelay(i)}s` }}
              >
                {l}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

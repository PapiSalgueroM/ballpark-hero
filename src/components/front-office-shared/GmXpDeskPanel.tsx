/**
 * Round 1223: the GM level screen on a desk, the screen behind the GM level
 * box. It is GmXpPanel (Round 942) fed from the desk: the XP block, the trees
 * this desk routes to its engine, and the handler that spends a point. A tree
 * that is not routed sells nothing, and the host refuses the spend as well,
 * whatever this screen allows.
 *
 * The line at the top says what THIS desk pays XP for (facts.career.earns),
 * and the "?" under it holds the rules, without saying that line a second
 * time.
 *
 * OWED BY THE BIND (Round M1), AND A CONDITION OF MOUNTING THIS PANEL: the
 * wrapped GmXpPanel (Round 942, not a file of this round, which is new files
 * only) still prints its own fixed sentence, which names six sources of XP.
 * A desk that feeds four therefore shows the honest line above and, right
 * under it, a sentence that promises two sources that pay nothing. The brief
 * gives GmXpPanel an optional `earns` prop in M1: pass it, and keep one copy
 * of the sentence on the screen. On a phone the same panel is seven tree
 * cards in one column with the live trees last and 25 px buttons; M1 owns
 * that layout too. Nothing may mount GM_CAREER_PANELS before both are done.
 * Not mounted by this round.
 */
import { useState } from 'react';
import type { GmPanelProps } from '@/lib/gmDesk';
import { hostXpHelp, hostXpOf, type GmCareerFacts } from '@/lib/gmDeskHost';
import { GmXpPanel } from './GmXpPanel';

export default function GmXpDeskPanel({ desk, facts }: GmPanelProps<GmCareerFacts>) {
  const { live, deskOn, earns, spend } = facts.career;
  const [help, setHelp] = useState(false);

  return (
    <div className="space-y-2" data-gm-xp-desk>
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[11px] leading-snug text-foreground" data-gm-xp-earns>
            {deskOn ? earns : 'XP starts once your GM desk is open.'}
          </p>
          <button
            type="button"
            onClick={() => setHelp(h => !h)}
            aria-expanded={help}
            aria-label="How GM XP works"
            className="min-h-[44px] min-w-[44px] rounded-full border border-border text-xs text-muted-foreground hover:text-foreground"
          >
            ?
          </button>
        </div>
        {help && (
          <div className="mt-2 space-y-1 rounded-lg border border-border bg-secondary/30 p-2 text-[10px] text-muted-foreground" data-gm-xp-help>
            {/* The earn line is already on the screen above while the desk is on: the help adds it only when it is not. */}
            {(deskOn ? hostXpHelp() : [earns, ...hostXpHelp()]).map(line => <p key={line}>{line}</p>)}
          </div>
        )}
      </div>
      <GmXpPanel block={hostXpOf(desk)} live={live} onSpendPoint={spend} />
    </div>
  );
}

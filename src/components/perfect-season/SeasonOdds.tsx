import type { BestRecord, PerfectSeasonSportKey } from '@/lib/perfectSeason';
import { perfectOddsLine } from '@/lib/perfectSeasonOdds';

/* Round 820: the honest lines every Perfect Season page prints, one copy for
   all four sports (Round 784 wrote them into the NBA page alone). */

/** The mode screen's reminder of the record to beat. Draws nothing until a
    run has finished in this browser. */
export function BestSoFar({ best }: { best: BestRecord | null }) {
  if (!best) return null;
  return (
    <p className="text-xs text-muted-foreground mt-3" data-best-record>
      Your best so far: <span className="font-semibold text-foreground">{best.wins}-{best.losses}</span> at {best.overall} OVR.
    </p>
  );
}

/** Under the final record: the odds of an unbeaten season for the team the
    sim just played (pass the RAW overall, the line rounds it to one decimal
    itself), then the best record, or the news that this run set it. Round 954:
    that news slams in (cm-slam, from the celebration kit SeasonVerdict mounts);
    inline-block because a transform does nothing on a plain inline span. */
export function SeasonOddsLines({ sport, overall, perfect, best, newBest }: {
  sport: PerfectSeasonSportKey;
  overall: number;
  perfect: boolean;
  best: BestRecord | null;
  newBest: boolean;
}) {
  return (
    <>
      {!perfect && (
        <p className="text-xs text-muted-foreground mb-2" data-perfect-odds>{perfectOddsLine(sport, overall)}</p>
      )}
      {best && (
        <p className="text-xs mb-3" data-best-record>
          {newBest
            ? <span className="cm-slam inline-block text-correct font-semibold" data-new-best>New personal best.</span>
            : <span className="text-muted-foreground">Your best: <span className="font-semibold text-foreground">{best.wins}-{best.losses}</span> at {best.overall} OVR.</span>}
        </p>
      )}
    </>
  );
}

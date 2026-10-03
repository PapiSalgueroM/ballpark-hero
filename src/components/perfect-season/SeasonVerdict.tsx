import type { ReactNode } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { ResultMoment, type ResultOutcome } from '@/components/game/ResultMoment';
import { CelebrationStyles, ConfettiBurst } from '@/components/club-manager/Celebration';
import type { BestRecord, PerfectSeasonSportKey } from '@/lib/perfectSeason';
import { SeasonOddsLines } from '@/components/perfect-season/SeasonOdds';

/* Round 954: the end of a Perfect Season run, one card for all four sports.
   It used to be copied into each page as a static emoji, a headline and a
   paragraph, so a perfect season and a 4-13 year arrived the same way. Now it
   lands on the shared result moment: the record the sim produced as the score,
   the win state only for an unbeaten season, confetti only then, and the new
   best line slams in only when this run set it.

   Everything a page says stays the page's: the headline, its thresholds, the
   emoji and the share name all come in as props, so there is no if on the
   sport in here. Nothing is computed beyond picking one of three states from
   the page's own threshold; the record is wins and losses exactly as given.

   It plays once because it only mounts when the page flips to its done phase.
   A reload starts at the mode screen and a finished daily reopens on its own
   locked recap, so neither replays it. */

export interface SeasonVerdictProps {
  /** The page's route; the moment takes the sport's ink and mark from it. */
  gamePath: string;
  sport: PerfectSeasonSportKey;
  wins: number;
  losses: number;
  perfect: boolean;
  /** The page's own middle tier: at or above it a miss reads as close, below it as a loss. */
  closeAt: number;
  /** The page's emoji for this record. */
  badge: ReactNode;
  /** The page's headline for this record. */
  headline: ReactNode;
  /** The overall as the page prints it (rounded). */
  overallLabel: ReactNode;
  /** The raw overall the sim played, for the odds line. */
  overall: number;
  spins: number;
  /** Today's date when this was the daily, printed in the meta line. */
  dailyDate?: string;
  best: BestRecord | null;
  newBest: boolean;
  /** The share card's game name, e.g. "17-0 Perfect Season (Daily)". */
  shareName: string;
  emojiGrid: string;
  /** The daily's countdown; a daily run shows it and the way back to the modes. */
  countdown?: string | null;
  onBackToModes?: () => void;
  onRestart?: () => void;
}

/** One of the moment's three states, from the page's own threshold. Win is an unbeaten season only. */
export function verdictOutcome(perfect: boolean, wins: number, closeAt: number): ResultOutcome {
  if (perfect) return 'win';
  return wins >= closeAt ? 'close' : 'loss';
}

export function SeasonVerdict(props: SeasonVerdictProps) {
  const { gamePath, sport, wins, losses, perfect, closeAt, badge, headline, overallLabel, overall, spins, dailyDate, best, newBest, shareName, emojiGrid, countdown, onBackToModes, onRestart } = props;
  const daily = dailyDate !== undefined;
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center" data-season-verdict>
      <CelebrationStyles />
      <ResultMoment
        outcome={verdictOutcome(perfect, wins, closeAt)}
        gamePath={gamePath}
        score={`${wins}-${losses}`}
        scoreLabel="final record"
        headline={headline}
        badge={badge}
        className="mb-3"
      >
        {perfect && <ConfettiBurst seed={wins} />}
      </ResultMoment>
      <p className="text-sm text-muted-foreground mb-3">
        {daily && `Daily · ${dailyDate} · `}
        Team overall {overallLabel} · drafted in {spins} spin{spins === 1 ? '' : 's'}
      </p>
      <SeasonOddsLines sport={sport} overall={overall} perfect={perfect} best={best} newBest={newBest} />
      {perfect && (
        <p className="text-sm text-correct font-semibold mb-2 inline-flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Share this. Nobody will believe you.
        </p>
      )}
      <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
      <ShareButtons score={`${wins}-${losses}`} gameName={shareName} gamePath={gamePath} emojiGrid={emojiGrid} />
      {daily ? (
        <>
          {countdown && (
            <p className="text-xs text-muted-foreground mt-4">
              Next daily puzzle in <span className="font-mono font-semibold text-foreground">{countdown}</span>
            </p>
          )}
          <button
            onClick={onBackToModes}
            className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70"
          >
            Play Classic or Hard
          </button>
        </>
      ) : (
        <button
          onClick={onRestart}
          className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="w-4 h-4" /> Run it back
        </button>
      )}
    </div>
  );
}

export default SeasonVerdict;

import type { ReactNode } from 'react';
import { ResultMoment, type ResultOutcome } from '@/components/game/ResultMoment';
import { RestoredResult, useFreshFinish } from '@/components/game/RestoredResult';
import { ConfettiBurst, confettiSeedOf } from '@/components/club-manager/Celebration';

/**
 * Round 953: the five clue guessers (CBB program, F1 driver, F1 constructor,
 * tennis player, NASCAR driver) and the three chains (tennis, NASCAR, combat)
 * end on the shared result moment instead of a game over block of their own,
 * so a finished F1 guess looks like the same site as a finished grid.
 *
 * Written once for all eight. Each board keeps its own card around it: the
 * answer line, the share row, Play Again, and for a chain the final score,
 * the nickname save and the leaderboard. Nothing here scores, records or
 * saves anything; the moment shows the number the board already shows.
 *
 * The moment plays once, when the game finishes in front of the player. A
 * finish that comes back from storage, or is reopened from the mode menu, is
 * shown on its settled frame by Round 951's RestoredResult, with no confetti.
 */

/**
 * True only when this mount watched THIS game being played and then saw it
 * finish. It is keyed because these boards go back to their mode menu with
 * the page still mounted: a player who finishes an unlimited run, returns to
 * the menu and opens today's daily that was already done is looking at an old
 * result, and a flag that only remembered "saw some play" would replay it.
 * gameKey is null while there is no game (the mode menu, a load), and the
 * menu forgets the game: a finish watched live and then reopened from the
 * menu, same key and all, is an old result and stays settled. It is Round
 * 951's useFreshFinish with a key, so the dailies and these boards share one
 * rule.
 */
export function useLiveFinish(gameKey: string | null, finished: boolean): boolean {
  return useFreshFinish(gameKey !== null, finished, gameKey);
}

/**
 * A chain has no finish line: every run ends on a break (a wrong link, a
 * repeat, or giving up), and the board's reason for that break sits right
 * under the state line. So a chain is never called a win, which would put
 * "Nailed it" over "Incorrect guess!": a run that added at least one link is
 * close whatever badge it earned (the badge still heads the card), and a run
 * that never got past the starting name is a loss. NBA Chain, the chain that
 * was already on the shared moment, says "Good try" the same way.
 */
export function chainOutcome(chainLength: number): ResultOutcome {
  return chainLength > 0 ? 'close' : 'loss';
}

function FinishFrame({ live, win, gamePath, children }: { live: boolean; win: boolean; gamePath: string; children: ReactNode }) {
  return (
    <RestoredResult restored={!live}>
      <div data-guess-finish={live ? 'live' : 'restored'} className="relative">
        {live && win && <ConfettiBurst seed={confettiSeedOf(gamePath)} count={28} />}
        {children}
      </div>
    </RestoredResult>
  );
}

/** A clue guesser's finish: the points the board scored, the trophy or the frown it always showed. */
export function ClueFinishMoment({ won, gamePath, score, live }: { won: boolean; gamePath: string; score: number; live: boolean }) {
  return (
    <FinishFrame live={live} win={won} gamePath={gamePath}>
      <ResultMoment outcome={won ? 'win' : 'loss'} gamePath={gamePath} score={score} scoreLabel="points" badge={won ? '🏆' : '😤'} />
    </FinishFrame>
  );
}

export interface ChainFinishBadge {
  emoji: string;
  name: string;
}

/** A chain's finish: how long the chain got, the badge it earned, and the reason the board gave for the end. */
export function ChainFinishMoment({ chainLength, badge, reason, gamePath, live, className }: {
  chainLength: number;
  badge?: ChainFinishBadge;
  reason?: string;
  gamePath: string;
  live: boolean;
  className?: string;
}) {
  const outcome = chainOutcome(chainLength);
  return (
    <FinishFrame live={live} win={outcome === 'win'} gamePath={gamePath}>
      <ResultMoment
        className={className}
        outcome={outcome}
        gamePath={gamePath}
        score={chainLength}
        scoreLabel="chain length"
        badge={badge?.emoji}
        headline={badge ? badge.name : 'Game Over!'}
      >
        {reason && <p data-chain-end-reason className="mt-2 text-sm text-muted-foreground">{reason}</p>}
      </ResultMoment>
    </FinishFrame>
  );
}

import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultMoment } from '@/components/game/ResultMoment';
import ShareButtons from '@/components/game/ShareButtons';

/**
 * Round 952: the four US Connect 4 boards (NBA, MLB, NFL, NHL) end on the
 * shared result moment.
 *
 * Soccer Connect 4 has ended on ResultScreen for a while. The four US copies
 * ended on a small "Red Wins!" banner over the board plus a share row and a
 * New Game button under it. This is their one finish, written once and
 * mounted by all four pages, so a fix here is a fix in every sport.
 *
 * Two pieces, both blank while the game is still being played:
 *
 * Connect4FinishStatus sits where the turn row was, over the board, at the
 * turn row's height (min-h-8 and mb-4, the same as the row it replaces), so
 * the board does not move when the last piece lands.
 *
 * Connect4Finish sits under the board, in the spot the answer box had a
 * moment ago, so it lands where the player is already looking on a phone
 * (the board is wider than the screen and the answer box is below it). It
 * mounts the shared ResultMoment: a win for the colour that connected, the
 * close state for a draw. The pill shows that colour's disc rather than a
 * number, because a Connect 4 game has no score. The share line and the New
 * Game button are the ones the pages had, unchanged.
 *
 * Nothing here is saved and nothing reads a clock: the phase lives in the
 * hook's state only, so a reload starts a fresh board and the moment can only
 * play when a game actually ends.
 */
export type Connect4FinishPhase = 'playing' | 'won' | 'draw';
export type Connect4FinishTeam = 'red' | 'blue';

interface FinishProps {
  phase: Connect4FinishPhase;
  /** The colour that connected four; only read when phase is 'won'. */
  winner?: Connect4FinishTeam | null;
}

const teamName = (winner?: Connect4FinishTeam | null) => (winner === 'red' ? 'Red' : 'Blue');
const discTone = (team: Connect4FinishTeam) => (team === 'red' ? 'bg-red-500' : 'bg-blue-500');

/** The share line the four pages sent before this round, kept word for word. */
export function connect4ShareScore(phase: Connect4FinishPhase, winner?: Connect4FinishTeam | null): string {
  return phase === 'draw' ? 'Draw' : `${teamName(winner)} wins`;
}

function Disc({ team, className }: { team: Connect4FinishTeam; className?: string }) {
  return <span data-connect4-disc={team} className={cn('inline-block rounded-full align-middle shadow-inner', discTone(team), className)} />;
}

/** The row over the board once the game is over, at the height of the turn row it replaces. */
export function Connect4FinishStatus({ phase, winner }: FinishProps) {
  if (phase === 'playing') return null;
  const won = phase === 'won';
  return (
    <div data-connect4-status={won ? 'win' : 'draw'} className="flex items-center justify-center gap-3 mb-4 min-h-8">
      {won ? (
        <>
          <Disc team={winner === 'red' ? 'red' : 'blue'} className="h-5 w-5" />
          <span className="font-bold text-foreground text-lg">{teamName(winner)} connected four</span>
        </>
      ) : (
        <span className="font-bold text-foreground text-lg">Board full, no four in a row</span>
      )}
    </div>
  );
}

interface Connect4FinishProps extends FinishProps {
  gameName: string;
  gamePath: string;
  onNewGame: () => void;
}

/** The end of a game: the shared result moment, the share row and New Game. */
export function Connect4Finish({ phase, winner, gameName, gamePath, onNewGame }: Connect4FinishProps) {
  if (phase === 'playing') return null;
  const won = phase === 'won';
  const team: Connect4FinishTeam = winner === 'red' ? 'red' : 'blue';
  return (
    /* role status, the way ResultScreen has it since Round 306: the answer
       box a screen reader was in unmounts on the last drop, so the result
       has to announce itself rather than appear in silence. */
    <div role="status" data-connect4-finish={won ? 'win' : 'draw'} className="mx-auto mt-6 max-w-lg">
      <ResultMoment
        outcome={won ? 'win' : 'close'}
        gamePath={gamePath}
        badge={
          won ? (
            <Disc team={team} className="h-11 w-11" />
          ) : (
            <span className="inline-flex items-center">
              <Disc team="red" className="h-9 w-9" />
              <Disc team="blue" className="-ml-3 h-9 w-9" />
            </span>
          )
        }
        headline={won ? `${teamName(winner)} wins!` : "It's a draw!"}
      >
        <p className="mt-1 text-sm text-muted-foreground">
          {won ? `${teamName(winner)} got four in a row first.` : 'The board filled up and nobody got four in a row.'}
        </p>
        <div className="mt-4 flex flex-col items-center">
          <ShareButtons score={connect4ShareScore(phase, winner)} gameName={gameName} gamePath={gamePath} />
          <button
            onClick={onNewGame}
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            New Game
          </button>
        </div>
      </ResultMoment>
    </div>
  );
}

export default Connect4Finish;

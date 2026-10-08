/* Round 1047: the board a Soccer Career moment is played on.

   It is the training ground's own board (DrillBoard for a finish, a tackle
   or a save, ThroughBallBoard for a pass) in its one round `match` mode,
   loaded only when a player presses "Take it yourself". The Season Centre
   preloads it first (preloadMomentBoard), so the attempt is only marked used
   once the board can actually open. */
import { Suspense, lazy, useMemo } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import type { PositionDrillKind } from '@/lib/careerDrills';

const DrillBoard = lazy(() => import('./DrillBoard'));
const ThroughBallBoard = lazy(() => import('./ThroughBallBoard'));

/** Load the code of the board a moment needs. */
export function preloadMomentBoard(board: PositionDrillKind): Promise<unknown> {
  return board === 'throughball' ? import('./ThroughBallBoard') : import('./DrillBoard');
}

const nothing = () => {};

export default function SoccerMomentBoard({ career, board, seed, round, rng, onInput }: {
  career: CareerState;
  board: PositionDrillKind;
  seed: number;
  round: number;
  /** A fresh generator for the round's one resolve. */
  rng: () => () => number;
  /** Called once with the input the round was played with. */
  onInput: (input: number[]) => void;
}) {
  /* one match for the life of the board: the round is dealt once */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drill = useMemo(() => (board === 'throughball' ? null : { kind: board, seed, round, rng, onResult: (r: { input: number[] }) => onInput(r.input) }), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const through = useMemo(() => (board === 'throughball' ? { seed, round, onResult: (r: { input: number[] }) => onInput(r.input) } : null), []);
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground" data-moment-loading>Getting the pitch ready...</div>}>
      <div className="mx-auto w-full max-w-md" data-soccer-moment-board={board}>
        {through && <ThroughBallBoard career={career} canBank={false} onBank={nothing} onBack={nothing} match={through} />}
        {drill && <DrillBoard career={career} canBank={false} onBank={nothing} onBack={nothing} match={drill} />}
      </div>
    </Suspense>
  );
}

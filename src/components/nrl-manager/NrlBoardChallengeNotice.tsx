import type { NrlBoardChallengeStatus } from '@/lib/nrlBoardTarget';
import { nrlFinalsEliminated, type NrlManagerState } from '@/lib/nrlManager';

export default function NrlBoardChallengeNotice({ season, status }: {
  season: NrlManagerState; status: NrlBoardChallengeStatus;
}) {
  if (!status) return null;
  const canWin = season.phase === 'finals' && !nrlFinalsEliminated(season).has(season.clubId);
  let message: string;
  switch (status) {
    case 'warning':
      message = season.phase === 'regular'
        ? 'You missed last season’s target here. Meet this year’s target or win the premiership to keep your job.'
        : `You missed this season’s target. Another miss here next year would mean moving.${canWin ? ' Win the premiership to clear the warning.' : ''}`;
      break;
    case 'review':
      message = canWin
        ? 'You missed a second consecutive target. Win the premiership to keep your job.'
        : 'You missed a second consecutive target. Choose a new club when finals end.';
      break;
    case 'must-move':
      message = 'The board ended your appointment after two missed targets. Choose a club for next season.';
      break;
    case 'cleared':
      message = 'Your premiership cleared the board warning.';
      break;
  }
  const title = status === 'cleared' ? 'Board challenge' : status === 'must-move' ? 'Board decision' : 'Board warning';
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm" role="status" data-nrl-board-challenge={status}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  );
}

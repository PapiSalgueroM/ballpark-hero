import { useLocation } from 'react-router-dom';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ClosingTimeBoard } from '@/components/nba-my-career/NbaClosingTime';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { recordCompletion } from '@/lib/completions';

const title = 'Closing Time: Basketball Clock Management Game';
const description = 'Coach both ends of three fourth quarters in this free basketball game. Read the coverage, manage the shot clock and use a timeout to set up a winning shot.';

export default function ClosingTime() {
  const { state } = useLocation();
  return <>
    <PageSeo title={title} description={description} path="/closing-time" />
    <GameShell width="narrow" title="Closing Time" subtitle="Coach three fourth quarters. Score the basket, get the stop and decide when to spend your timeout." help="none" showReportQuestion>
      <ClosingTimeBoard resume={state?.resumeClosingTime === true} onFinish={score => recordCompletion('/closing-time', score)} />
      <GameSeoContent pageHasOwnH1 title={title} description={description} />
      <GameNav />
    </GameShell>
  </>;
}

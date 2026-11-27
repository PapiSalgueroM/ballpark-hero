import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { TwoMinuteDriveBoard } from '@/components/nfl-my-career/TwoMinuteDrive';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { recordCompletion } from '@/lib/completions';
import { useLocation } from 'react-router-dom';

const title = 'Two-Minute Drive: NFL Play Calling Game';
const description = 'Call the final possession in a free NFL football game. Read the coverage, manage your timeouts and decide when to kick or keep driving for a touchdown.';

export default function TwoMinuteDrive() {
  const { state } = useLocation();
  return <>
    <PageSeo title={title} description={description} path="/two-minute-drive" />
    <GameShell width="narrow" title="Two-Minute Drive" subtitle="One possession. Read the defense and find a way to score before time runs out." help="none" showReportQuestion>
      <TwoMinuteDriveBoard resume={state?.resumeTwoMinute === true} onFinish={verdict => recordCompletion('/two-minute-drive', { win: 100, tie: 50, loss: 0 }[verdict])} />
      <GameSeoContent pageHasOwnH1 title={title} description={description} />
      <GameNav />
    </GameShell>
  </>;
}

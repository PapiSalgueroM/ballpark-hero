import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { TransferPathBoard } from '@/components/transfer-path/TransferPathBoard';

export default function TransferPath() {
  return (
    <>
      <PageSeo
        title="Transfer Path - Connect Players via Clubs | DoUKnowBall"
        description="Connect two soccer players by naming teammates who played at the same clubs. Like Six Degrees of Kevin Bacon for football transfers."
        path="/transfer-path"
      />
      <TransferPathBoard />
      <GameSeoContent
        title="Transfer Path: Connect Soccer Players Through Shared Clubs"
        description="Link two soccer players by walking through the clubs they share with other players. Like Six Degrees of Kevin Bacon, but for football transfers."
      />
    </>
  );
}

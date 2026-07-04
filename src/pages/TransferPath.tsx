import PageSeo from '@/components/seo/PageSeo';
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
    </>
  );
}

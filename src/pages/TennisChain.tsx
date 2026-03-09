import { TennisChainBoard } from '@/components/tennis-chain/TennisChainBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function TennisChain() {
  return (
    <>
      <PageSeo
        title="Tennis Chain — Grand Slam Defeat Chain Game"
        description="Build the longest chain of tennis players! Name someone who beat the current player at a Grand Slam. Covers ATP and WTA from 1970 to 2025."
        path="/tennis-chain"
      />
      <TennisChainBoard />
    </>
  );
}

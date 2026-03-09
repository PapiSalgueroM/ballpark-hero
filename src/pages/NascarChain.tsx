import PageSeo from '@/components/seo/PageSeo';
import { NascarChainBoard } from '@/components/nascar-chain/NascarChainBoard';

export default function NascarChain() {
  return (
    <>
      <PageSeo
        title="NASCAR Chain — Build a Chain of Cup Champions"
        description="Name drivers who beat each other to the NASCAR Cup Series championship. Build the longest chain and compete on the daily leaderboard!"
        path="/nascar-chain"
      />
      <NascarChainBoard />
    </>
  );
}

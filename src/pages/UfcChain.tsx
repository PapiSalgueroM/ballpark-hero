import { CombatChainBoard } from '@/components/ufc-chain/CombatChainBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function UfcChain() {
  return (
    <>
      <PageSeo 
        title="Combat Chain - MMA Fighter Chain Game"
        description="Build the longest chain of MMA fighters! Name a fighter who defeated the current fighter to extend your chain. How long can you go?"
        path="/ufc-chain"
      />
      <CombatChainBoard />
    </>
  );
}
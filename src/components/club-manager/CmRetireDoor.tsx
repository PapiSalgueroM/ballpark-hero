import { useMemo } from 'react';
import RetireDoor from '@/components/club-manager/RetireDoor';
import { canRetire, retireCareer, retireDoorCopy } from '@/lib/clubManagerRetire';
import type { CareerState } from '@/lib/clubManager';

/* Round 1343: Club Manager's retire door, its words and its rule. It loads lazily wherever it is drawn, and it hands
   the hook the retire rule, so neither the page nor the hook carries the retire module on the first load. */
export default function CmRetireDoor({ c, retire, onOpen }: {
  c: CareerState;
  retire: (make: (c: CareerState) => CareerState | null) => boolean;
  onOpen?: () => void;
}) {
  const copy = useMemo(() => (canRetire(c) ? retireDoorCopy(c) : null), [c]);
  if (!copy) return null;
  return <RetireDoor {...copy} onRetire={() => retire(retireCareer)} onOpen={onOpen} />;
}

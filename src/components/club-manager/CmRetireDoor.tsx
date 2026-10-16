import { useMemo } from 'react';
import RetireDoor from '@/components/club-manager/RetireDoor';
import { canRetire, retireCareer, retireDoorCopy, seasonPlayedOut } from '@/lib/clubManagerRetire';
import type { CareerState } from '@/lib/clubManager';

/* Round 1343: Club Manager's retire door, its words and its rule. It loads lazily wherever it is drawn, and it hands
   the hook the retire rule, so neither the page nor the hook carries the retire module on the first load. When every
   match of the season is played and the review is still to come, the door waits for the review (it writes the title
   and the season), and says so. */
export default function CmRetireDoor({ c, retire, onOpen }: {
  c: CareerState;
  retire: (make: (c: CareerState) => CareerState | null) => boolean;
  onOpen?: () => void;
}) {
  const copy = useMemo(() => (canRetire(c) ? retireDoorCopy(c) : null), [c]);
  const waits = useMemo(() => !copy && !c.retired && !c.live && seasonPlayedOut(c), [copy, c]);
  if (waits) {
    return (
      <p data-cm-retire-waits className="text-xs text-muted-foreground">
        👋 Every match of this season is played. Open See Season Review first, and you can retire from there with the season counted.
      </p>
    );
  }
  if (!copy) return null;
  return <RetireDoor {...copy} onRetire={() => retire(retireCareer)} onOpen={onOpen} />;
}

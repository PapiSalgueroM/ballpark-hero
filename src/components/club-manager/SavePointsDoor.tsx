/**
 * Round 1513 review (read lens, major 1): the way to the save points from the
 * screens the hub tile is not on, the sacked screen first of all (the moment a
 * player most wants to go back), the season's end and the retired screen.
 * One button that opens the same screen the hub tile opens, in place. The
 * screen and lz-string still load only when it is opened.
 */
import { lazy, Suspense, useState } from 'react';
import type { CareerState } from '@/lib/clubManager';

const SavePointsScreen = lazy(() => import('@/components/club-manager/SavePointsScreen'));

export function SavePointsDoor({ career, pointsSlot }: { career: CareerState; pointsSlot: () => number | null }) {
  const [open, setOpen] = useState(false);
  const slot = open ? pointsSlot() : null;
  return (
    <div className="text-left" data-cm-points-door>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        data-testid="cm-points-door"
        className="w-full min-h-11 rounded-lg text-xs font-bold bg-secondary text-foreground hover:opacity-90 transition-opacity"
      >
        💾 {open ? 'Hide save points' : 'Save points'}
      </button>
      {open && (
        <div className="mt-2">
          {slot === null
            ? <p className="text-sm text-muted-foreground">Reload the page to use your save points.</p>
            : <Suspense fallback={<div className="min-h-[8rem]" />}><SavePointsScreen career={career} slot={slot} /></Suspense>}
        </div>
      )}
    </div>
  );
}

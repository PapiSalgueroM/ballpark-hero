import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { pressRoomView } from '@/lib/soccerCareerPress';

const PressRoom = lazy(() => import('./PressRoom'));

export default function PressRoomTile({ career, onCareer }: {
  career: CareerState;
  onCareer: (fn: (prev: CareerState) => CareerState) => void;
}) {
  const view = useMemo(() => pressRoomView(career), [career]);
  const [open, setOpen] = useState(false);
  const tile = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    tile.current?.focus({ preventScroll: true });
  }, []);
  if (!view.eligible && view.history.length === 0) return null;
  return <>
    <button ref={tile} type="button" data-press-room-open onClick={() => setOpen(true)}
      className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-secondary">
      <span className="min-w-0">
        <span className="block text-sm font-bold">🎙️ Press room</span>
        <span className="block text-xs text-muted-foreground">{view.eligible ? 'Answer for your season' : 'Your answers and promises'}</span>
      </span>
      <span className="shrink-0 text-xs font-bold">{view.credibility}/100</span>
    </button>
    {open && <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-label="Opening the press room" className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
        <p className="text-sm">Opening the press room...</p>
        <button type="button" onClick={close} className="mt-3 min-h-[44px] w-full rounded-xl border border-border px-4 text-sm">← Back to your career</button>
      </div>
    </div>}>
      <PressRoom career={career} onCareer={onCareer} onClose={close} />
    </Suspense>}
  </>;
}

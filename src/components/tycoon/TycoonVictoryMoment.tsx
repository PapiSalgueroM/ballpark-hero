import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

const VictoryArt = lazy(() => import('@/components/game/VictoryMoment'));

/** Result copy stays visible while its optional trophy illustration loads. */
export default function TycoonVictoryMoment({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <Suspense fallback={
    <div className="relative flex items-center justify-center gap-2 overflow-hidden">
      <span aria-hidden="true" className={compact ? 'h-10 w-10 shrink-0' : 'h-16 w-16 shrink-0'} />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  }><VictoryArt compact={compact}>{children}</VictoryArt></Suspense>;
}

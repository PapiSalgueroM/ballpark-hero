/**
 * Round 1115: the Squad tile on the career page.
 *
 * One small tile with one live number: where his rating puts him among the
 * men in his position at the club. Pressing it opens the Squad sheet, which
 * arrives as its own chunk so the career page does not pay for it until it
 * is asked for.
 *
 * The whole contract: <SquadTile career={career} />. It renders nothing when
 * there is no squad to show (the academy years, a retired player), it is one
 * button, and it brings its own sheet. It is DISPLAY ONLY: it reads the save
 * and never writes it.
 *
 * Every hook sits above the one early return (the React 310 rule).
 */
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { squadView, GROUP_LABEL } from '@/lib/soccerClubSquad';
import type { SquadSource } from '@/lib/soccerClubSquad';
import { ordinal } from '@/lib/soccerCareerLeague';
import { escapeCloses, focusDialogOnMount } from '@/lib/dialogA11y';

const loadSheet = () => import('./SquadSheet');
const FirstSheet = lazy(loadSheet);

const TILE_SOURCE: Record<SquadSource, string> = {
  real: 'Real squad',
  invented: 'Your teammates',
  roles: 'By role',
};

/* A chunk cannot catch its own load failing, so the boundary lives here. */
class SheetBoundary extends Component<
  { onRetry: () => void; onClose: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm"
        data-squad-sheet="failed"
        onKeyDown={escapeCloses(this.props.onClose)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Squad"
          tabIndex={-1}
          ref={focusDialogOnMount}
          className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-card p-4 outline-none"
        >
          <p className="text-sm text-foreground">The squad could not open. Your career is safe.</p>
          <button
            type="button"
            onClick={this.props.onRetry}
            className="min-h-[44px] rounded-xl border border-border bg-secondary px-4 text-sm font-semibold text-foreground"
          >
            ↻ Retry
          </button>
          <button
            type="button"
            onClick={this.props.onClose}
            className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground"
          >
            ← Back to your career
          </button>
        </div>
      </div>
    );
  }
}

/* Shown while the sheet's chunk is on its way: it only tells the tile so. */
function Loading({ onChange }: { onChange: (busy: boolean) => void }) {
  useEffect(() => {
    onChange(true);
    return () => onChange(false);
  }, [onChange]);
  return null;
}

export function SquadTile({ career }: { career: CareerState }) {
  const view = useMemo(() => squadView(career), [career]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  /* A retry needs a new lazy component: React keeps a failed one failed. */
  const [Again, setAgain] = useState<typeof FirstSheet | null>(null);
  const tile = useRef<HTMLButtonElement | null>(null);
  const Sheet = Again ?? FirstSheet;

  if (!view) return null;

  const close = () => {
    setOpen(false);
    tile.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <button
        ref={tile}
        type="button"
        data-squad-tile
        aria-haspopup="dialog"
        aria-busy={busy || undefined}
        onClick={() => setOpen(true)}
        className="relative flex min-h-[64px] w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 pb-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">👥 Squad</span>
          <span className="block text-xs leading-snug text-muted-foreground">{TILE_SOURCE[view.source]}</span>
          <span className="block text-xs leading-snug text-muted-foreground" data-squad-plan-label>
            The plan: {view.trust.label}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {/* The rank is where RATING puts him. The label on the left is the
              plan, and the two can disagree, so the number says which it is. */}
          <span className="block text-xs text-muted-foreground" data-squad-rank-basis>On our ratings</span>
          <span className="block text-xl font-bold leading-tight tabular-nums text-foreground" data-squad-rank={view.rank}>
            {ordinal(view.rank)}
          </span>
          <span className="block text-xs text-muted-foreground">
            of {view.groupSize} {GROUP_LABEL[view.group]}
          </span>
        </span>
        <span className="absolute inset-x-0 bottom-0 h-1 bg-muted" aria-hidden="true">
          <span
            className="block h-full bg-primary"
            style={{ width: `${view.trust.pct}%` }}
            data-squad-trust={view.trust.pct}
          />
        </span>
      </button>
      {open && (
        <SheetBoundary
          key={attempt}
          onRetry={() => { setAgain(() => lazy(loadSheet)); setAttempt(n => n + 1); }}
          onClose={close}
        >
          <Suspense fallback={<Loading onChange={setBusy} />}>
            <Sheet career={career} view={view} onClose={close} />
          </Suspense>
        </SheetBoundary>
      )}
    </>
  );
}

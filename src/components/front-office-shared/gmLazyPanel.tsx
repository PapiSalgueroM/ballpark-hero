/**
 * Round 1223: a desk panel that loads on demand, without touching the mount.
 *
 * GmDeskMount renders a panel as a component type, and GmPanelDef.Panel is
 * typed by its call alone, so the mount does not need to learn anything: this
 * helper hands it an ordinary component that wraps React.lazy in a Suspense.
 * A board that never opens the box never downloads the screen behind it.
 *
 * THE ONE RULE: call it at module level, never inside a render. The component
 * it returns must be the same function on every render, or the mount sees a
 * new component type each time and remounts the open panel on every save,
 * losing whatever it held (GmDeskMount.tsx says the same of every panel).
 * GmCareerDesk.test.tsx proves the rule both ways.
 *
 * The fallback is a box of a fixed minimum height with role="status", so the
 * page does not jump when the chunk lands. A chunk that fails to load is
 * handled site wide already (the vite:preloadError listener reloads once, and
 * the save is in localStorage).
 *
 * lazyPart is generic over the props, so the other front office lifts (a
 * draft night card, a game day card) can share it; lazyGmPanel is the same
 * thing typed for a desk panel.
 */
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import type { GmFacts, GmPanelProps } from '@/lib/gmDesk';

/** The box shown while a panel's chunk is on its way. */
export function GmPanelLoading({ minHeight = 220 }: { minHeight?: number }) {
  return (
    <div
      role="status"
      data-gm-panel-loading
      style={{ minHeight }}
      className="rounded-2xl border border-border bg-card p-3 text-[11px] text-muted-foreground"
    >
      One moment
    </div>
  );
}

/** Module level only. See the header. */
export function lazyPart<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  minHeight?: number,
): (props: P) => ReactNode {
  /* Typed loosely on the inside only: a generic props type does not flow
     through React's own managed attributes, and the outside signature is
     what a caller checks against. */
  const Inner = lazy(load) as unknown as ComponentType<Record<string, unknown>>;
  function LazyPart(props: P) {
    return (
      <Suspense fallback={<GmPanelLoading minHeight={minHeight} />}>
        <Inner {...(props as Record<string, unknown>)} />
      </Suspense>
    );
  }
  return LazyPart;
}

/** A desk panel that loads on demand. Module level only. See the header. */
export function lazyGmPanel<F extends GmFacts>(
  load: () => Promise<{ default: ComponentType<GmPanelProps<F>> }>,
  minHeight?: number,
): (props: GmPanelProps<F>) => ReactNode {
  return lazyPart<GmPanelProps<F>>(load, minHeight);
}

/**
 * Round 1561: where a career screen stands while the career kit is on its way (a save loaded on the recap or the
 * fired screen, a career box opened), on every Front Office board: the holding box every lazy screen shows, at the
 * height of a screen, and a retry if the fetch failed. Round 1550 wrote it inline on the NFL board
 * (CareerKitHolding); moved here word for word so the NHL board draws the same box.
 */
import { GmPanelLoading } from '@/components/front-office-shared/gmLazyPanel';

export function GmCareerKitHolding({ failed, onRetry, minHeight = 320 }: { failed: boolean; onRetry: () => void; minHeight?: number }) {
  if (!failed) return <GmPanelLoading minHeight={minHeight} />;
  return (
    <div role="status" data-career-kit-failed style={{ minHeight }} className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
      <p>That screen didn't load. Check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-primary px-6 text-sm font-bold text-primary hover:bg-primary/10">
        Try again
      </button>
    </div>
  );
}

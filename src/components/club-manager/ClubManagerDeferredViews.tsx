import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EraLoadFailed({ label, noun = 'squads', onRetry, onBack, backLabel = 'Pick another season' }: { label: string; noun?: string; onRetry: () => void; onBack?: () => void; backLabel?: string }) {
  return (
    <div role="alert" data-testid="cm-era-load-failed" className="max-w-md mx-auto my-12 rounded-xl border border-border bg-card p-5 text-center">
      <div className="text-sm font-bold text-foreground">The {label} {noun} did not load.</div>
      <div className="mt-1 text-xs text-muted-foreground">Check your connection, then try again. Nothing has been lost.</div>
      <button
        onClick={onRetry}
        className="mt-4 px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
      {/* Round 832 review: the picker's waiting steps hide their own back
          buttons, so a season that will not load offers the way back here. */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-4 ml-2 px-5 py-2.5 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}

export function WorldEditorTile({ movedCount, onOpen }: { movedCount: number; onOpen: () => void }) {
  return (
            <button
              onClick={onOpen}
              data-testid="cm-world-editor-tile"
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-all hover:border-primary',
                movedCount ? 'bg-primary/10 border-primary' : 'bg-card border-dashed border-primary/50',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">🌍</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground">World editor{movedCount ? `: ${movedCount} clubs moved` : ''}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {movedCount ? 'Your world is edited. Tap to change it or put it back.' : 'Optional. Move any club to any league first: Celtic in the Premier League, your own super league.'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              </div>
            </button>
  );
}

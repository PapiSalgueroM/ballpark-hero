import type { ReactNode } from 'react';
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

export function ClubHeading({ crest, clubName, seasonLabel, season, difficulty, noSack, midSeason }: {
  crest: ReactNode; clubName: string; seasonLabel: string; season: number;
  difficulty: { id: string; label: string } | null; noSack: boolean; midSeason: boolean;
}) {
  return (
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap px-12">
          {/* Round 154: a club you founded wears its crest where every other
              club wears its color dot. */}
          {crest}
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">{clubName}</h1>
          {/* Round 132: the save now knows what year it is, so it says so, next
              to the season count it has always shown. */}
          <span className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
            {seasonLabel} · Season {season}
          </span>
          {/* Round 1501: a career off Medium wears its level (Round 1512: whichever it is on now). No pill on Medium. */}
          {difficulty !== null && (
            <span data-cm-level-pill={difficulty.id} className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
              {difficulty.label}
            </span>
          )}
          {/* Round 1342: a No sacking career wears it for its whole life. No pill otherwise. */}
          {noSack && (
            <span data-cm-nosack-pill className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
              🛡️ No sacking
            </span>
          )}
          {/* Round 549: a career that began part way through says so for as long
              as that season runs. The games before the takeover were simulated,
              and a badge that only lives on the picker would let somebody forget
              that by the time they are reading the table. Round 1328: it used to
              call those games the run-in, but a run-in is the end of a season,
              and "The run-in" is itself one of the three takeover points; the words
              now hold for the Autumn, the New year and the run-in takeovers and
              for a Hot Seat carry on alike. */}
          {midSeason && (
            <span className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 text-center leading-snug">
              🗓️ Took over mid season · the games before you arrived were simulated
            </span>
          )}
        </div>
  );
}

export function ClubStatus({ positionLabel, stadium, budgetLabel, noMatches, formDots, trophyCount }: {
  positionLabel: string; stadium: { name: ReactNode; capacity: number | null } | null;
  budgetLabel: ReactNode; noMatches: boolean; formDots: ReactNode; trophyCount: number;
}) {
  return <>
          {/* Round 99: found by playing it. Before a ball is kicked every
              club is on zero points, so the "position" was just wherever the
              shuffled table happened to put you: a brand new Manchester City
              save opened on "#15 in league", which reads as broken. */}
          <span>{positionLabel}</span>
          {stadium !== null && (
            <span className="inline-flex items-center gap-1">
              🏟 {stadium.name}{stadium.capacity !== null ? ` (${stadium.capacity}k)` : ''}
            </span>
          )}
          <span className="text-gold font-semibold">{budgetLabel}</span>
          <span className="inline-flex items-center gap-1">
            {noMatches && <span>No matches yet</span>}
            {formDots}
          </span>
          {trophyCount > 0 && <span>🏆×{trophyCount}</span>}
  </>;
}

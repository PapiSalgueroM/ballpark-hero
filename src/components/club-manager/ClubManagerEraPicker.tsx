import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CM_ERA_CARDS, DEFAULT_ERA_ID, REAL_WITH_PADDING } from '@/lib/clubManagerEraCards';
import { cn } from '@/lib/utils';

export function ClubManagerPickerHeading({ step, children }: { step: string; children?: ReactNode }) {
  return (
    <>
      <header className="text-center mb-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          {children ?? 'Choose the season you want to manage in.'}
        </p>
      </header>

      {/* Step breadcrumb */}
      <div className="flex items-center justify-center gap-1.5 mb-5 text-[10px] font-bold flex-wrap">
        {(['era', 'nation', 'league', 'team', 'manager'] as const).map((s, i) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
            <span className={cn(
              'px-2.5 py-1 rounded-full border',
              step === s ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground',
            )}>
              {i + 1}. {s === 'era' ? 'When' : s === 'nation' ? 'Nation' : s === 'league' ? 'League' : s === 'team' ? 'Team' : 'Dugout'}
            </span>
          </span>
        ))}
      </div>
    </>
  );
}

export function ClubManagerEraPicker({ onPick, pendingEra = null, onBackToManagers }: {
  onPick: (id: string) => void;
  pendingEra?: string | null;
  onBackToManagers?: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {CM_ERA_CARDS.map(e => (
          <button
            key={e.id}
            type="button"
            aria-disabled={pendingEra !== null || undefined}
            onClick={() => { if (pendingEra === null) onPick(e.id); }}
            className="rounded-xl border bg-card border-border hover:border-primary px-4 py-3 text-left transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl leading-none">{e.emoji}</span>
              <div className="min-w-0">
                <div className="text-base font-bold font-display text-foreground">{e.label}</div>
                <div className="text-[10px] text-muted-foreground">{e.id === DEFAULT_ERA_ID ? 'Current clubs; K League squads are generated.' : e.blurb}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </div>
            <div className="mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border text-[hsl(var(--wc-green-ink))] border-emerald-500/50 bg-emerald-500/10">
              {e.id === DEFAULT_ERA_ID ? 'REAL CLUBS · SQUAD COVERAGE VARIES' : <>REAL DATA · {REAL_WITH_PADDING}</>}
            </div>
            {pendingEra === e.id && <p role="status" className="mt-1 text-xs text-muted-foreground">Loading clubs...</p>}
          </button>
        ))}
      </div>
      {/* The honest note about what is NOT here, which matters more than
          what is. Round 139 removed the future starts on the owner's call
          (nobody knows the future). Round 146 delivered the first real
          past season from real historical records. */}
      <p className="text-[9px] text-muted-foreground text-center mt-2.5 leading-snug max-w-lg mx-auto">
        No future eras, ever: nobody knows the future and we will not pretend to. The 2020-21, 2015-16, 2010-11 and
        2005-06 seasons are built from real market data records, real squads with their real ages and values from those
        years, not recreations. 2005-06 is as far back as the records honestly reach, so there is no 2000 era and
        there will not be an invented one. No made up name ever appears on a teamsheet unmarked.
      </p>
      {/* Round 520: the competition's real format, season by season, one tap
          from the era you are about to pick. */}
      <p className="text-[10px] text-center mt-1">
        <Link to="/champions-league-format-history" className="inline-flex items-center min-h-[32px] px-2 text-primary hover:underline">How the real Champions League format changed, and what each era here plays</Link>
      </p>
      {/* Round 928: a way back to the other managers from a new one's picker. */}
      {onBackToManagers && (
        <p className="text-[11px] text-center mt-1">
          <button onClick={onBackToManagers} className="inline-flex items-center min-h-[32px] px-2 text-muted-foreground hover:text-primary hover:underline">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to your managers
          </button>
        </p>
      )}
    </div>
  );
}

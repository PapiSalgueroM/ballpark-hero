import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, Clock, Shuffle } from 'lucide-react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useDeadlineDay } from '@/hooks/useDeadlineDay';
import { hotSeatLeagues, hotSeatPool } from '@/lib/managerHotSeat';
import { DEADLINE_HOURS, clockLabel } from '@/lib/deadlineDay';
import { reloadToRetryChunk } from '@/lib/freshBuild';

const Strip = lazy(() => import('./DeadlineDayViews').then(m => ({ default: m.Strip })));
const Desk = lazy(() => import('./DeadlineDayViews').then(m => ({ default: m.Desk })));
const Deal = lazy(() => import('./DeadlineDayViews').then(m => ({ default: m.Deal })));
const Sales = lazy(() => import('./DeadlineDayViews').then(m => ({ default: m.Sales })));
const Result = lazy(() => import('./DeadlineDayViews').then(m => ({ default: m.Result })));

function ViewWait({ onBack, failed = false }: { onBack: () => void; failed?: boolean }) {
  return <div className="space-y-3 rounded-lg border border-border bg-card p-4">
    <p role="status" className="text-sm">{failed ? "The desk didn't load." : 'Opening the desk...'}</p>
    {failed && <button type="button" onClick={() => reloadToRetryChunk()} className="min-h-[44px] w-full rounded-md border border-border px-3 py-2 text-sm font-semibold">Retry</button>}
    <button type="button" onClick={onBack} className="min-h-[44px] w-full rounded-md border border-border px-3 py-2 text-sm font-semibold">Back to the menu</button>
  </div>;
}

class ViewBoundary extends Component<{ onBack: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ViewWait onBack={this.props.onBack} failed /> : this.props.children; }
}

type View = { kind: 'desk' } | { kind: 'deal'; i: number } | { kind: 'sales' };

export default function DeadlineDayBoard() {
  const hook = useDeadlineDay();
  const { phase, run, daily, dailyDone, dailySaved, freeSaved, notice } = hook;
  const [view, setView] = useState<View>({ kind: 'desk' });
  const [league, setLeague] = useState('premier');
  const viewKey = view.kind === 'deal' ? `deal${view.i}` : view.kind;
  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${viewKey}:${run?.actions.length ?? 0}:${notice ?? ''}`);
  const leagues = hotSeatLeagues();
  const clubsInLeague = hotSeatPool().filter(c => c.leagueId === league);
  const toDesk = () => { hook.clearNotice(); setView({ kind: 'desk' }); };
  const go = (fn: () => void) => { setView({ kind: 'desk' }); fn(); };

  return (
    <div className="space-y-3">
      {phase === 'menu' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4" data-no-prerender>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CalendarDays className="h-4 w-4" />Today's deadline day</div>
            <div className="mt-1 text-lg font-bold">{daily.club}</div>
            <div className="text-xs text-muted-foreground">{daily.leagueName}. Same club, same needs and same budget for everyone today.</div>
            {dailyDone ? (
              <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm" data-testid="deadline-daily-done">
                <div className="font-semibold">Grade {dailyDone.letter}, {dailyDone.score} / 100</div>
                <div className="text-muted-foreground">{dailyDone.filled} of {dailyDone.needs} needs filled. Back tomorrow for a new club.</div>
              </div>
            ) : (
              <button type="button" onClick={() => go(hook.startDaily)} className="mt-3 min-h-[44px] w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
                {dailySaved ? 'Back on the phones' : 'Open today\'s window'}
              </button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Free play</div>
            <div className="mt-1 text-lg font-bold">Any club, any time</div>
            <div className="text-xs text-muted-foreground">Pick a club or let us pick one. A new set of needs every time.</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => hook.setPhase('pick')} className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Pick a club</button>
              <button type="button" onClick={() => go(hook.randomFree)} className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm font-semibold"><Shuffle className="mr-1 inline h-4 w-4" />Random</button>
            </div>
            {freeSaved && (
              <button type="button" onClick={() => go(hook.resumeFree)} className="mt-2 min-h-[44px] w-full rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">
                Carry on at {freeSaved.setup.club}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'pick' && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <button type="button" onClick={() => hook.setPhase('menu')} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back</button>
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor="deadline-league">League</label>
          <select id="deadline-league" value={league} onChange={e => setLeague(e.target.value)} className="min-h-[44px] w-full rounded-md border border-border bg-background px-3 text-sm">
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {clubsInLeague.map(c => (
              <button key={c.club} type="button" onClick={() => go(() => hook.startFree(c.club))} className="min-h-[44px] rounded-md border border-border px-2 py-2 text-left text-sm font-medium hover:border-primary">
                {c.club}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground" role="status">
          Getting the phones ready...
        </div>
      )}

      <div ref={revealRef} className="space-y-3">
        <ViewBoundary key={phase} onBack={hook.backToMenu}>
          <Suspense fallback={<ViewWait onBack={hook.backToMenu} />}>
        {run && phase === 'play' && (
          <>
            <div className="flex items-center justify-between">
              <button type="button" onClick={hook.backToMenu} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Menu</button>
              <span className="flex items-center gap-1 text-sm font-semibold"><Clock className="h-4 w-4" />{run.state.clubName}, shuts at {clockLabel(DEADLINE_HOURS)}</span>
            </div>
            <Strip run={run} />
            {notice && (
              <div role="status" className="flex items-start justify-between gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm" data-testid="deadline-notice">
                <span>{notice}</span>
                <button type="button" onClick={hook.clearNotice} className="shrink-0 font-bold text-muted-foreground" aria-label="Dismiss">x</button>
              </div>
            )}
            {view.kind === 'desk' && <Desk run={run} hook={hook} onOpen={i => { hook.clearNotice(); setView({ kind: 'deal', i }); }} onSales={() => { hook.clearNotice(); setView({ kind: 'sales' }); }} />}
            {view.kind === 'deal' && <Deal run={run} i={view.i} hook={hook} onBack={toDesk} />}
            {view.kind === 'sales' && <Sales run={run} hook={hook} onBack={toDesk} />}
          </>
        )}

        {run && phase === 'done' && run.grade && <Result run={run} hook={{ ...hook, randomFree: () => go(hook.randomFree), backToMenu: () => go(hook.backToMenu) }} />}
          </Suspense>
        </ViewBoundary>
      </div>
    </div>
  );
}

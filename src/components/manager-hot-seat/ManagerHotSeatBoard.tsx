import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Shuffle, CalendarDays, RotateCcw } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { getTodayET } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { MENTALITIES, TALK_TONES, preMatchRead, type Mentality, type TalkTone } from '@/lib/clubManager';
import type { Meter } from '@/lib/clubManagerMeters';
import {
  HOT_SEAT_BOARD_START,
  HOT_SEAT_LEASH,
  VERDICT_WORDS,
  answerHotSeatPress,
  crisisLine,
  dailyHotSeat,
  hotSeatLeagues,
  hotSeatMeters,
  hotSeatPool,
  ordinal,
  pendingPress,
  playHotSeatMatch,
  replayHotSeat,
  shareText,
  startHotSeat,
  upcoming,
  type HotSeatAction,
  type HotSeatRun,
  type HotSeatSetup,
  type VerdictKind,
} from '@/lib/managerHotSeat';

const SLUG = 'manager-hot-seat';
const FREE_KEY = 'manager-hot-seat-free';

type Phase = 'menu' | 'pick' | 'loading' | 'brief' | 'match' | 'after' | 'done';

interface DailySummary { club: string; kind: VerdictKind; points: number; target: number; dots: string }

function isAction(a: unknown): a is HotSeatAction {
  if (!a || typeof a !== 'object') return false;
  const x = a as Record<string, unknown>;
  if (x.t === 'press') return Number.isInteger(x.i) && (x.i as number) >= 0 && (x.i as number) < 10;
  if (x.t === 'match') {
    return ['defensive', 'balanced', 'attacking'].includes(x.m as string)
      && (x.talk === null || ['calm', 'rally', 'demand', 'blast'].includes(x.talk as string));
  }
  return false;
}

function readActions(v: unknown): HotSeatAction[] | null {
  return Array.isArray(v) && v.length <= 60 && v.every(isAction) ? (v as HotSeatAction[]) : null;
}

function dotsOf(run: HotSeatRun): string {
  return run.log.filter(m => m.counts).map(m => (m.res === 'W' ? '🟩' : m.res === 'D' ? '🟨' : '🟥')).join('');
}

const TONE_BAR: Record<string, string> = {
  good: 'bg-emerald-500',
  mid: 'bg-amber-500',
  bad: 'bg-red-500',
};

function MeterRow({ label, meter }: { label: string; meter: Meter }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1 text-[11px]">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{meter.shown}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={meter.shown}>
        <div className={cn('h-full rounded-full', TONE_BAR[meter.tone])} style={{ width: `${Math.max(2, meter.value)}%` }} />
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{meter.band}</div>
    </div>
  );
}

function Meters({ run }: { run: HotSeatRun }) {
  const m = hotSeatMeters(run.state);
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-card p-3" data-testid="hot-seat-meters">
      <MeterRow label="Board" meter={m.board} />
      <MeterRow label="Fans" meter={m.fans} />
      <MeterRow label="Dressing room" meter={m.morale} />
    </div>
  );
}

function Progress({ run }: { run: HotSeatRun }) {
  const left = run.leash - run.leaguePlayed;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span><span className="font-bold tabular-nums">{run.points}</span> of <span className="font-bold tabular-nums">{run.target}</span> points</span>
      <span className="text-muted-foreground">{left} league game{left === 1 ? '' : 's'} left</span>
    </div>
  );
}

export default function ManagerHotSeatBoard() {
  const today = useRef(getTodayET()).current;
  const daily = useMemo(() => dailyHotSeat(today), [today]);
  const [phase, setPhase] = useState<Phase>('menu');
  const [run, setRun] = useState<HotSeatRun | null>(null);
  const [dailyDone, setDailyDone] = useState<DailySummary | null>(null);
  const [dailySaved, setDailySaved] = useState<HotSeatAction[] | null>(null);
  const [freeSaved, setFreeSaved] = useState<{ setup: HotSeatSetup; actions: HotSeatAction[] } | null>(null);
  const [league, setLeague] = useState<string>('premier');
  const [mentality, setMentality] = useState<Mentality>('balanced');
  const [talk, setTalk] = useState<TalkTone | null>(null);
  const [lastLine, setLastLine] = useState<string | null>(null);

  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${run?.log.length ?? 0}:${run?.actions.length ?? 0}`);
  /* A play with no score for now: the points economy is being rebuilt, so this
     records that you played and puts nothing on the leaderboard. */
  useGameCompletion(SLUG, !!run?.verdict, undefined);

  /* What is waiting in storage, read after mount so nothing from the clock or
     the store lands in the first render. */
  useEffect(() => {
    const rec = readDailyRecord(SLUG, today, f => {
      const actions = readActions(f.actions);
      if (!actions || f.club !== daily.club) return null;
      const done = f.done === true && typeof f.kind === 'string' && f.kind in VERDICT_WORDS
        ? { club: daily.club, kind: f.kind as VerdictKind, points: Number(f.points) || 0, target: Number(f.target) || 0, dots: typeof f.dots === 'string' ? f.dots : '' }
        : null;
      return { actions, done };
    });
    if (rec?.done) setDailyDone(rec.done);
    else if (rec && rec.actions.length) setDailySaved(rec.actions);
    try {
      const raw = localStorage.getItem(FREE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, unknown>;
        const actions = readActions(p.actions);
        const club = typeof p.club === 'string' ? p.club : '';
        const seed = Number(p.seed);
        if (p.v === 1 && actions && p.done !== true && hotSeatPool().some(c => c.club === club) && Number.isFinite(seed)) {
          setFreeSaved({ setup: { club, seed: seed >>> 0 }, actions });
        }
      }
    } catch {
      /* a blocked or mangled store just means no free play to continue */
    }
  }, [today, daily.club]);

  const persist = useCallback((r: HotSeatRun) => {
    if (r.setup.daily) {
      writeDailyRecord(SLUG, r.setup.daily, {
        club: r.setup.club,
        actions: r.actions,
        done: !!r.verdict,
        ...(r.verdict ? { kind: r.verdict.kind, points: r.points, target: r.target, dots: dotsOf(r) } : {}),
      });
      if (r.verdict) setDailyDone({ club: r.setup.club, kind: r.verdict.kind, points: r.points, target: r.target, dots: dotsOf(r) });
    } else {
      try {
        localStorage.setItem(FREE_KEY, JSON.stringify({ v: 1, club: r.setup.club, seed: r.setup.seed, actions: r.actions, done: !!r.verdict }));
      } catch {
        /* storage full or blocked: the run still plays, it just will not survive a refresh */
      }
    }
  }, []);

  /* The takeover costs about twenty engine calls, so the loading card paints first. */
  const open = useCallback((setup: HotSeatSetup, actions: HotSeatAction[] = []) => {
    setPhase('loading');
    setLastLine(null);
    window.setTimeout(() => {
      const r = actions.length ? replayHotSeat(setup, actions) : startHotSeat(setup);
      if (r.verdict) markRestoredFinish(SLUG);
      setRun(r);
      setMentality('balanced');
      setTalk(null);
      setPhase(r.verdict ? 'done' : actions.length ? 'match' : 'brief');
    }, 30);
  }, []);

  const startDaily = () => open({ club: daily.club, seed: daily.seed, daily: daily.daily }, dailySaved ?? []);
  const startFree = (club: string) => {
    const seed = Math.floor(Math.random() * 4294967296) >>> 0;
    setFreeSaved(null);
    open({ club, seed });
  };
  const randomFree = () => {
    const pool = hotSeatPool();
    startFree(pool[Math.floor(Math.random() * pool.length)].club);
  };

  const takeJob = () => {
    if (!run) return;
    persist(run);
    setPhase('match');
  };

  const play = () => {
    if (!run || run.verdict) return;
    const next = playHotSeatMatch(run, mentality, talk);
    setRun(next);
    persist(next);
    setTalk(null);
    setLastLine(null);
    setPhase(next.verdict ? 'done' : 'after');
  };

  const answer = (i: number) => {
    if (!run) return;
    const next = answerHotSeatPress(run, i);
    setRun(next);
    persist(next);
    setLastLine(next.state.press?.lastLine ?? null);
  };

  const backToMenu = () => {
    setRun(null);
    setPhase('menu');
  };

  const leagues = useMemo(() => hotSeatLeagues(), []);
  const clubsInLeague = useMemo(() => hotSeatPool().filter(c => c.leagueId === league), [league]);
  const fx = run && !run.verdict ? upcoming(run) : null;
  const q = run ? pendingPress(run) : null;
  const last = run?.log[run.log.length - 1] ?? null;

  return (
    <div className="space-y-3">
      {phase === 'menu' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4" data-no-prerender>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CalendarDays className="h-4 w-4" />Today's hot seat</div>
            <div className="mt-1 text-lg font-bold">{daily.club}</div>
            <div className="text-xs text-muted-foreground">{daily.leagueName}. Same club, same week and same target for everyone today.</div>
            {dailyDone ? (
              <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm" data-testid="hot-seat-daily-done">
                <div className="font-semibold">{VERDICT_WORDS[dailyDone.kind].title}</div>
                <div className="text-muted-foreground">{dailyDone.points} of {dailyDone.target} points {dailyDone.dots}. Back tomorrow for a new club.</div>
              </div>
            ) : (
              <button type="button" onClick={startDaily} className="mt-3 min-h-[44px] w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
                {dailySaved ? 'Back to the dugout' : 'Take today\'s job'}
              </button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Free play</div>
            <div className="mt-1 text-lg font-bold">Any club, any time</div>
            <div className="text-xs text-muted-foreground">Pick a club or let us pick one. A new season every time.</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPhase('pick')} className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Pick a club</button>
              <button type="button" onClick={randomFree} className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm font-semibold"><Shuffle className="mr-1 inline h-4 w-4" />Random</button>
            </div>
            {freeSaved && (
              <button type="button" onClick={() => open(freeSaved.setup, freeSaved.actions)} className="mt-2 min-h-[44px] w-full rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">
                Carry on at {freeSaved.setup.club}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'pick' && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <button type="button" onClick={() => setPhase('menu')} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back</button>
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor="hot-seat-league">League</label>
          <select id="hot-seat-league" value={league} onChange={e => setLeague(e.target.value)} className="min-h-[44px] w-full rounded-md border border-border bg-background px-3 text-sm">
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {clubsInLeague.map(c => (
              <button key={c.club} type="button" onClick={() => startFree(c.club)} className="min-h-[44px] rounded-md border border-border px-2 py-2 text-left text-sm font-medium hover:border-primary">
                {c.club}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground" role="status">
          Playing the season up to the day the job opens...
        </div>
      )}

      <div ref={revealRef} className="space-y-3">
        {run && phase === 'brief' && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="hot-seat-brief">
            <button type="button" onClick={backToMenu} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Back</button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">The job</div>
              <div className="text-xl font-bold">{run.state.clubName}</div>
              <p className="mt-1 text-sm text-muted-foreground">{crisisLine(run.takeover)} The last manager is gone and the board want an answer.</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-3 text-sm">
              <div className="font-semibold">The board's target</div>
              <div><span className="text-2xl font-bold tabular-nums">{run.target}</span> points from the next {run.leash} league games.</div>
              <div className="mt-1 text-xs text-muted-foreground">The board start on {HOT_SEAT_BOARD_START} out of 100. If that hits zero first, you are gone on the spot.</div>
            </div>
            <Meters run={run} />
            <button type="button" onClick={takeJob} className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Take the job</button>
          </div>
        )}

        {run && (phase === 'match' || phase === 'after') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button type="button" onClick={backToMenu} className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Menu</button>
              <span className="text-sm font-semibold">{run.state.clubName}</span>
            </div>
            <Progress run={run} />
            <Meters run={run} />

            {phase === 'after' && last && (
              <div className="rounded-lg border border-border bg-card p-4" data-testid="hot-seat-result">
                <div className="text-xs text-muted-foreground">{last.compLabel}{last.counts ? '' : ', does not count toward the target'}</div>
                <div className="mt-1 text-lg font-bold">
                  {run.state.clubName} {last.myGoals} to {last.oppGoals} {last.opponent}
                  <span className={cn('ml-2 rounded px-1.5 py-0.5 text-xs', last.res === 'W' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : last.res === 'D' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-red-500/20 text-red-600 dark:text-red-400')}>
                    {last.res === 'W' ? 'Won' : last.res === 'D' ? 'Drew' : 'Lost'}{last.pens ? ' on penalties' : ''}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Board {last.boardDelta >= 0 ? 'up' : 'down'} {Math.abs(Math.round(last.boardDelta * 10) / 10)}.</div>

                {q ? (
                  <div className="mt-3 rounded-md bg-muted p-3" data-testid="hot-seat-press">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary">The press room</div>
                    <p className="mt-1 text-sm">{q.text}</p>
                    <div className="mt-2 grid gap-2">
                      {q.options.map((o, i) => (
                        <button key={i} type="button" onClick={() => answer(i)} className="min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-left text-sm">{o.label}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {lastLine && <p className="mt-2 text-sm italic text-muted-foreground">The papers: {lastLine}</p>}
                    <button type="button" onClick={() => setPhase('match')} className="mt-3 min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">Next match</button>
                  </>
                )}
              </div>
            )}

            {phase === 'match' && fx && (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="hot-seat-match">
                <div>
                  <div className="text-xs text-muted-foreground">{fx.compLabel}{fx.counts ? '' : ', does not count toward the target'}</div>
                  <div className="text-lg font-bold">{fx.home === true ? 'Home to' : fx.home === false ? 'Away at' : 'Neutral ground against'} {fx.opponent}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{preMatchRead(run.state) ?? ''}</p>
                </div>
                {q && (
                  <div className="rounded-md bg-muted p-3" data-testid="hot-seat-press">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary">The press room</div>
                    <p className="mt-1 text-sm">{q.text}</p>
                    <div className="mt-2 grid gap-2">
                      {q.options.map((o, i) => (
                        <button key={i} type="button" onClick={() => answer(i)} className="min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-left text-sm">{o.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Shape</div>
                  <div className="grid grid-cols-3 gap-2">
                    {MENTALITIES.map(m => (
                      <button key={m.id} type="button" aria-pressed={mentality === m.id} onClick={() => setMentality(m.id)}
                        className={cn('min-h-[44px] rounded-md border px-2 py-2 text-sm font-semibold', mentality === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                        <span aria-hidden="true">{m.emoji}</span> {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Team talk</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <button type="button" aria-pressed={talk === null} onClick={() => setTalk(null)}
                      className={cn('min-h-[44px] rounded-md border px-2 py-2 text-sm', talk === null ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>Say nothing</button>
                    {TALK_TONES.map(t => (
                      <button key={t.id} type="button" aria-pressed={talk === t.id} onClick={() => setTalk(t.id)} title={t.blurb}
                        className={cn('min-h-[44px] rounded-md border px-2 py-2 text-sm', talk === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                        <span aria-hidden="true">{t.emoji}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={play} disabled={!!q} className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
                  {q ? 'Answer the press first' : 'Kick off'}
                </button>
              </div>
            )}
          </div>
        )}

        {run && phase === 'done' && run.verdict && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-testid="hot-seat-verdict">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">{run.state.clubName}</div>
            <div className="text-2xl font-bold">{VERDICT_WORDS[run.verdict.kind].title}</div>
            <p className="text-sm text-muted-foreground">{VERDICT_WORDS[run.verdict.kind].line}</p>
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <div><span className="font-bold tabular-nums">{run.points}</span> of <span className="font-bold tabular-nums">{run.target}</span> points from {run.leaguePlayed} league game{run.leaguePlayed === 1 ? '' : 's'} {dotsOf(run)}</div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {run.log.map((m, i) => (
                  <li key={i}>{m.res} {m.myGoals} to {m.oppGoals} {m.home === true ? 'v' : m.home === false ? 'at' : 'v'} {m.opponent}{m.counts ? '' : ` (${m.compLabel})`}</li>
                ))}
              </ul>
            </div>
            <Meters run={run} />
            <ShareButtons gameName="Manager Hot Seat" gamePath="/manager-hot-seat"
              score={`${run.points} of ${run.target} points`}
              customText={shareText(run)} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={randomFree} className="min-h-[48px] rounded-md border border-border px-3 py-2 text-sm font-semibold"><RotateCcw className="mr-1 inline h-4 w-4" />New club</button>
              <button type="button" onClick={backToMenu} className="min-h-[48px] rounded-md border border-border px-3 py-2 text-sm font-semibold">Menu</button>
            </div>
          </div>
        )}
      </div>

      {run && phase === 'brief' && (
        <p className="text-center text-[11px] text-muted-foreground">Took over after league week {run.takeover.week}, {ordinal(run.takeover.position)} of {run.takeover.clubs}. Leash: {HOT_SEAT_LEASH} league games.</p>
      )}
    </div>
  );
}

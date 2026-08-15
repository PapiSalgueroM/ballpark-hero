/* Round 126: one coaching career screen, four games.

   The soccer version of this lives inside SoccerCareer.tsx as a 130 line
   ManagerPanel wedged into a 3135 line file, which is fine when one game
   needs it and is not fine when four do. This is the same arc in the four
   US sports' own language, built once.

   House rules it follows:
     FIFA TILE RULE. The hub is four small boxes. Each opens its own screen
     with a back button. Nothing stacks.
     NO SCROLL RULE. The thing you do next is in the action card at the top,
     including the offers themselves when you are out of work, and the card
     pulls itself into view through useRevealScroll after every click.
     PHONES. Every button is full width, every team name truncates, every
     chip row wraps. Round 117 had to go and fix fourteen games that got
     this wrong and this is not going to be the fifteenth.
*/

import { useState } from 'react';
import { Briefcase, ClipboardList, Flame, RotateCcw, TrendingUp } from 'lucide-react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import {
  acceptCoachOffer, playCoachSeason, sitOutCoachSeason,
  coachOutlook, coachHotSeat, coachTotals, coachVerdict, formatCoachRecord,
} from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';
import { coachTierLabel, titleWord } from '@/lib/usCareerToCoach';
import { cn } from '@/lib/utils';

type Panel = 'none' | 'job' | 'market' | 'standing' | 'log';

interface Props {
  state: CoachCareerState;
  playerName: string;
  /** Persist and re render. Notes are the headlines from the last action. */
  onChange: (next: CoachCareerState, notes: string[]) => void;
  /** Put the boots back on the mantelpiece and go look at the legacy screen. */
  onBack: () => void;
  feed: string[];
}

const TONE = {
  good: 'text-emerald-400',
  warm: 'text-gold',
  hot: 'text-destructive',
} as const;

export default function CoachCareerPanel({ state, playerName, onChange, onBack, feed }: Props) {
  const [panel, setPanel] = useState<Panel>('none');
  const out = coachOutlook(state);
  const seat = coachHotSeat(state);
  const totals = coachTotals(state);
  const last = state.results[state.results.length - 1];

  /* How to describe being out of work. profile.seasonsOut ticks up the moment
     you are let go, which is right for the maths and wrong for the sentence:
     a man fired in April has not missed a season yet. So the copy counts the
     seasons actually spent on the couch and the day you got fired says so. */
  const justLetGo = !state.job && !!last && last.departure !== null;
  const outLabel = state.job ? ''
    : justLetGo ? 'Just let go'
    : totals.yearsOut === 0 ? 'Looking for a job'
    : `${totals.yearsOut} season${totals.yearsOut === 1 ? '' : 's'} without one`;

  const revealRef = useRevealScroll<HTMLDivElement>(
    `${state.results.length}:${state.unemployed}:${state.offers.length}:${panel}`,
  );

  const coachSeason = () => {
    const r = playCoachSeason(state);
    onChange(r.state, r.notes);
  };
  const sitOut = () => {
    const r = sitOutCoachSeason(state);
    onChange(r.state, r.notes);
  };
  const take = (i: number) => {
    const o = state.offers[i];
    onChange(acceptCoachOffer(state, i), [`You took the ${o.team} job as their ${o.role}.`]);
  };

  /* ------------------------------ drill in screens ------------------------------ */
  if (panel !== 'none') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setPanel('none')} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground">
            &lsaquo; Back
          </button>
          <p className="min-w-0 truncate text-sm font-black text-foreground">
            {panel === 'job' ? (state.job ? '🪑 The Job' : '📪 Out Of Work')
              : panel === 'market' ? '🗞️ The Market'
              : panel === 'standing' ? '📈 Where You Stand'
              : '📜 Coaching Log'}
          </p>
        </div>

        {panel === 'job' && (
          <div className="space-y-3">
            {state.job ? (
              <>
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-lg font-black text-foreground">{state.job.team}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{state.job.role} · T{state.job.tier} {coachTierLabel(state.job.tier)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {state.job.seasonsHere === 0 ? 'You have not coached a game here yet.' : `${state.job.seasonsHere} season${state.job.seasonsHere === 1 ? '' : 's'} in this chair.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What they asked for</p>
                  <p className="mt-1 text-xs text-foreground">{state.job.brief}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What you inherited</p>
                  <p className="mt-1 text-xs text-muted-foreground">{state.job.roster}</p>
                </div>
                <div className={cn('rounded-2xl border p-3', seat.tone === 'hot' ? 'border-destructive/40 bg-destructive/5' : seat.tone === 'warm' ? 'border-gold/40 bg-gold/5' : 'border-border bg-card')}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground"><Flame className="mr-1 inline h-3 w-3" />Hot seat</span>
                    <span className={cn('font-black', TONE[seat.tone])}>{seat.label}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{seat.line}</p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-center">
                <p className="text-3xl">📪</p>
                <p className="mt-1 text-sm font-black text-foreground">{outLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {totals.yearsOut === 0 ? 'Nothing has started yet. Find a chair before the league forgets you were in one.'
                    : `${totals.yearsOut} season${totals.yearsOut === 1 ? '' : 's'} on the couch. Every one of them costs you.`}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">{out.blurb}</p>
              </div>
            )}
          </div>
        )}

        {panel === 'market' && (
          <div className="space-y-2">
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {state.openings} job{state.openings === 1 ? '' : 's'} opened around the league this cycle.
                {' '}{state.reachable} {state.reachable === 1 ? 'was' : 'were'} at a level that would even look at you.
              </p>
            </div>
            {state.offers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">{state.offerNote || 'Nothing on the table right now.'}</p>
              </div>
            ) : (
              state.offers.map((o, i) => (
                <div key={`${o.team}-${i}`} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-black text-foreground">{o.team}</p>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] font-bold text-muted-foreground">T{o.tier} {coachTierLabel(o.tier)}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-primary">{o.role}</p>
                  <p className="mt-1 text-[11px] text-foreground">{o.brief}</p>
                  <p className="mt-1 text-[11px] text-gold">{o.reason}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{o.roster}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="shrink-0 text-[10px] text-muted-foreground">How badly they want you</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${o.keenness}%` }} />
                    </span>
                    <span className="shrink-0 text-[10px] font-black text-foreground">{o.keenness}</span>
                  </div>
                  {state.unemployed && (
                    <button onClick={() => { setPanel('none'); take(i); }} className="mt-2 w-full rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
                      Take the {o.team} job
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {panel === 'standing' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-4xl font-black text-primary">{out.standing}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">standing in the sport</p>
              <div className="mx-auto mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-secondary">
                <div className={cn('h-full rounded-full', out.standing > 60 ? 'bg-emerald-500' : out.standing > 35 ? 'bg-gold' : 'bg-destructive')} style={{ width: `${out.standing}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Best job you can get</span>
                <span className="shrink-0 font-black text-foreground">{out.ceilingLabel}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{out.blurb}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {([
                ['Titles', totals.rings],
                ['Series won', totals.roundsWon],
                ['Playoff years', totals.berths],
                ['Seasons', totals.seasons],
                ['Losing years', state.profile.losingSeasons],
                ['Years out', totals.yearsOut],
              ] as [string, number][]).map(([label, v]) => (
                <div key={label} className="rounded-xl border border-border bg-card px-1 py-2">
                  <p className="text-lg font-black text-foreground">{v}</p>
                  <p className="text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What still counts from playing</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                You retired with a reputation of {state.profile.playingRep}. That fades about eight percent a year,
                and after {state.profile.seasonsSinceRetired} season{state.profile.seasonsSinceRetired === 1 ? '' : 's'} it is
                {' '}worth roughly {Math.round(state.profile.playingRep * Math.pow(0.92, state.profile.seasonsSinceRetired))}.
                {' '}What you do in the chair is what carries you from here.
              </p>
            </div>
          </div>
        )}

        {panel === 'log' && (
          <div className="space-y-2">
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="text-sm font-black text-foreground">
                {totals.wins}-{totals.losses}{totals.otl ? `-${totals.otl}` : ''} as a coach
              </p>
              <p className="text-[11px] text-muted-foreground">
                {totals.seasons} season{totals.seasons === 1 ? '' : 's'} · {totals.rings} title{totals.rings === 1 ? '' : 's'} · {(totals.winPct * 100).toFixed(1)} percent
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              {state.results.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Nothing on the books yet. Go coach a season.</p>
              ) : (
                <div className="max-h-96 space-y-0.5 overflow-y-auto">
                  {[...state.results].reverse().map((r, i) => (
                    <div key={i} className="rounded px-2 py-1.5 text-[11px] odd:bg-background">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-muted-foreground">{r.year} · {r.team}</span>
                        <span className={cn('shrink-0 font-bold', r.champion ? 'text-gold' : 'text-foreground')}>
                          {r.team === 'Out of work' ? '' : formatCoachRecord(r)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{r.line}{r.departure ? ' Let go.' : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------ the hub ------------------------------ */
  const jobLabel = state.job ? state.job.team : 'Out of work';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">🧢 Coach {playerName}</span>
        <span className="max-w-full truncate rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{jobLabel}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{state.year}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Standing <b className="text-primary">{out.standing}</b></span>
      </div>

      <div ref={revealRef} className="rounded-2xl border border-gold/40 bg-card p-4">
        {state.unemployed ? (
          <div className="space-y-2">
            <div className="text-center">
              <p className="text-2xl">📪</p>
              <p className="text-sm font-black text-foreground">{outLabel}</p>
              <p className="mt-1 text-[11px] italic text-muted-foreground">{state.offerNote}</p>
            </div>
            {state.offers.map((o, i) => (
              <button
                key={`${o.team}-${i}`}
                onClick={() => take(i)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-left transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-black text-foreground">{o.team}</span>
                  <span className="shrink-0 text-[9px] text-muted-foreground">T{o.tier} {coachTierLabel(o.tier)}</span>
                </div>
                <span className="block text-[10px] font-semibold text-primary">{o.role}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{o.brief}</span>
                <span className="mt-0.5 block text-[10px] text-gold">{o.reason}</span>
              </button>
            ))}
            <button
              onClick={sitOut}
              className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/60"
            >
              Sit out the {state.year} season
            </button>
            {state.offers.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground">
                It gets harder every year you wait. That is the point.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            {last && last.team === state.job?.team && (
              <p className="mb-1 text-xs text-muted-foreground">Last season: {last.line}</p>
            )}
            <p className={cn('mb-2 text-[11px]', TONE[seat.tone])}>{seat.label} · {seat.line}</p>
            <button
              onClick={coachSeason}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              <ClipboardList className="h-4 w-4" /> Coach the {state.year} season
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {totals.wins}-{totals.losses}{totals.otl ? `-${totals.otl}` : ''} lifetime · {totals.rings} title{totals.rings === 1 ? '' : 's'} · chasing {titleWord(state.sport)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setPanel('job')} className="rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50">
          <span className="text-xl">{state.job ? '🪑' : '📪'}</span>
          <span className="mt-0.5 block text-sm font-black text-foreground">{state.job ? 'The Job' : 'Out Of Work'}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{state.job ? `${state.job.role} · ${seat.label}` : 'Nobody has hired you'}</span>
        </button>
        <button onClick={() => setPanel('market')} className="relative rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50">
          <span className="text-xl">🗞️</span>
          <span className="mt-0.5 block text-sm font-black text-foreground">The Market</span>
          <span className="block truncate text-[10px] text-muted-foreground">{state.openings} jobs open · {state.offers.length} for you</span>
          {state.offers.length > 0 && <span className="absolute right-2 top-2 rounded-full bg-primary px-1.5 text-[9px] font-black text-primary-foreground">{state.offers.length}</span>}
        </button>
        <button onClick={() => setPanel('standing')} className="rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50">
          <span className="text-xl"><TrendingUp className="inline h-5 w-5 text-primary" /></span>
          <span className="mt-0.5 block text-sm font-black text-foreground">Where You Stand</span>
          <span className="block truncate text-[10px] text-muted-foreground">{out.standing} · can reach {out.ceilingLabel}</span>
        </button>
        <button onClick={() => setPanel('log')} className="rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50">
          <span className="text-xl">📜</span>
          <span className="mt-0.5 block text-sm font-black text-foreground">Coaching Log</span>
          <span className="block truncate text-[10px] text-muted-foreground">{totals.seasons} season{totals.seasons === 1 ? '' : 's'} · {totals.wins}-{totals.losses}{totals.otl ? `-${totals.otl}` : ''}</span>
        </button>
      </div>

      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest</p>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            {feed.slice(0, 4).map((n, i) => <p key={i} className="rounded-lg bg-background px-2 py-1.5">{n}</p>)}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-3 text-center">
        {/* The verdict is a judgement on a career, so it waits until there is
            one. On the very first board it used to read "Never got a job",
            which is a strange thing to tell somebody who retired ten seconds
            ago and has not been given a chance to try yet. */}
        <p className="text-[11px] text-muted-foreground">{totals.seasons > 0 ? coachVerdict(state) : out.blurb}</p>
        <button onClick={onBack} className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-xs font-semibold text-foreground hover:border-primary/60">
          <Briefcase className="h-3.5 w-3.5" /> Back to the playing career
        </button>
      </div>
    </div>
  );
}

/**
 * The card the retirement screen shows. Two states: you have not started a
 * coaching career yet, or you have one waiting. Deliberately small, because
 * the retirement screen is already the biggest thing in the game.
 */
export function CoachStartCard({
  existing, onStart, onResume, sport,
}: {
  existing: CoachCareerState | null;
  onStart: () => void;
  onResume: () => void;
  sport: CoachCareerState['sport'];
}) {
  if (existing) {
    const t = coachTotals(existing);
    return (
      <div className="rounded-2xl border border-primary/40 bg-card p-4 text-center">
        <p className="text-2xl">🧢</p>
        <p className="mt-1 text-sm font-black text-foreground">Your coaching career</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {existing.job ? `${existing.job.role} at ${existing.job.team}.` : 'Out of work right now.'}
          {' '}{t.seasons} season{t.seasons === 1 ? '' : 's'}, {t.wins}-{t.losses}{t.otl ? `-${t.otl}` : ''}, {t.rings} title{t.rings === 1 ? '' : 's'}.
        </p>
        <button onClick={onResume} className="mt-3 w-full rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          Back to the sideline
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-4 text-center">
      <p className="text-2xl">🧢</p>
      <p className="mt-1 text-sm font-black text-foreground">You stopped playing. You did not stop working.</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Go after a job on a sideline. What you did in a jersey gets you in the room, and after that
        it is all on what you do in the chair. Winning {titleWord(sport)} as a coach is a different
        thing entirely.
      </p>
      <button onClick={onStart} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
        <RotateCcw className="h-4 w-4" /> Go after a coaching job
      </button>
    </div>
  );
}

import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NrlCareerAction, NrlCareerState } from '@/lib/nrlCareer';
import { NRL_ROLES, type NrlTactic } from '@/lib/nrlManager';
import {
  nrlOriginComplete, nrlOriginEligibility, nrlOriginFixtures, nrlOriginResult, nrlOriginStarterOptions, NRL_ORIGIN_SIDES, NRL_ORIGIN_TEAM_NAMES,
  type NrlOriginHistory, type NrlOriginSeries,
} from '@/lib/nrlOrigin';

type Dispatch = (action: NrlCareerAction) => boolean;
const selectClass = 'min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const originDate = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const tacticLabels: Record<NrlTactic, string> = { balanced: 'Balanced', attack: 'Attack', defense: 'Defence' };

function OriginSchedule({ year, series }: { year: number; series?: Pick<NrlOriginSeries | NrlOriginHistory, 'matches'> }) {
  return (
    <ol aria-label={`${year} State of Origin games`} className="divide-y divide-border border-y border-border">
      {nrlOriginFixtures(year).map(({ game, date, venue, home, away, neutral }) => {
        const match = series?.matches[game - 1];
        return (
          <li key={game} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 py-2.5 text-sm sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
            <span className="font-semibold">Game {game}</span>
            <span className="min-w-0 text-muted-foreground">{date && venue
              ? <>{originDate.format(new Date(`${date}T12:00:00Z`))} · {venue}</>
              : neutral ? 'Neutral game' : `${home.toUpperCase()} home game`}</span>
            <span className="col-start-2 font-semibold tabular-nums sm:col-start-auto">
              {match ? `${home.toUpperCase()} ${match.homeScore}–${match.awayScore} ${away.toUpperCase()}` : `${home.toUpperCase()} vs ${away.toUpperCase()}`}
              {match?.goldenPoint && <span className="ml-2 whitespace-nowrap text-xs font-normal text-muted-foreground">Golden Point</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OriginMatchday({ series, disabled, onAction }: { series: NrlOriginSeries; disabled: boolean; onAction: Dispatch }) {
  const { year, side, matches, selection } = series;
  const matchAction = { year, side, game: matches.length + 1 };
  const pool = series.pools[side];
  const starters = new Set(Object.values(selection.starters));
  const reserves = pool.filter(player => !starters.has(player.id));
  return (
    <details className="rounded-md border border-border bg-background px-3">
      <summary className="min-h-11 cursor-pointer py-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Select your matchday 19</summary>
      <fieldset disabled={disabled} className="grid min-w-0 gap-3 pb-3 sm:grid-cols-2">
        <legend className="sr-only">Origin starters and reserves</legend>
        {NRL_ROLES.map(role => (
          <label key={role} className="min-w-0 space-y-1 text-sm">
            <span className="font-semibold">{role}</span>
            <select className={selectClass} value={selection.starters[role]} onChange={event => onAction({
              type: 'selectOriginStarter', ...matchAction, role, playerId: event.target.value,
            })}>
              {nrlOriginStarterOptions(series, role).map(player => <option key={player.id} value={player.id}>{player.name} ({player.rating})</option>)}
            </select>
          </label>
        ))}
        {selection.bench.map((playerId, slot) => (
          <label key={slot} className="min-w-0 space-y-1 text-sm">
            <span className="font-semibold">Reserve {slot + 1}</span>
            <select className={selectClass} value={playerId} onChange={event => onAction({
              type: 'selectOriginReserve', ...matchAction, slot, playerId: event.target.value,
            })}>
              {reserves.map(player => <option key={player.id} value={player.id}>{player.name}, {player.role} ({player.rating})</option>)}
            </select>
          </label>
        ))}
      </fieldset>
    </details>
  );
}

function ActiveOrigin({ series, disabled, onAction }: { series: NrlOriginSeries; disabled: boolean; onAction: Dispatch }) {
  const { side, year, matches, nomination } = series;
  const { wins, winner } = nrlOriginResult(series);
  const complete = nrlOriginComplete(series);
  const status = useRef<HTMLParagraphElement>(null);
  const matchAction = { year, side, game: matches.length + 1 };
  const nominee = nomination && series.pools[side].find(player => player.id === nomination.playerId);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold">Coaching {NRL_ORIGIN_TEAM_NAMES[side]}</p>
        <p className="text-sm font-semibold tabular-nums" aria-label={`Series score: NSW ${wins.nsw}, Queensland ${wins.qld}`}>NSW {wins.nsw}–{wins.qld} QLD</p>
      </div>
      {nominee && <p className="text-sm">Club nomination: {nominee.name} · {nominee.role}</p>}
      <OriginSchedule year={year} series={series} />
      <p ref={status} tabIndex={-1} role="status" className="text-sm font-semibold">
        {complete && winner ? `${NRL_ORIGIN_TEAM_NAMES[winner]} win the ${year} series.`
          : winner ? `${NRL_ORIGIN_TEAM_NAMES[winner]} have clinched the series. Game 3 is still to play.`
          : matches.length ? `Game ${matches.length} complete. Game ${matches.length + 1} is next.` : 'Game 1 is ready.'}
      </p>
      {!complete && <>
        <OriginMatchday series={series} disabled={disabled} onAction={onAction} />
        <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0 space-y-1 text-sm font-semibold">
            <span>Origin tactic</span>
            <select className={selectClass} value={series.tactic} disabled={disabled} onChange={event => onAction({
              type: 'setOriginTactic', ...matchAction, tactic: event.target.value as NrlTactic,
            })}>
              {Object.entries(tacticLabels).map(([tactic, label]) => <option key={tactic} value={tactic}>{label}</option>)}
            </select>
          </label>
          <Button type="button" size="lg" disabled={disabled} onClick={() => {
            const played = onAction({ type: 'playOriginMatch', ...matchAction });
            if (played && matchAction.game === nrlOriginFixtures(year).length) status.current?.focus();
          }}>Simulate Origin Game {matchAction.game}</Button>
        </div>
      </>}
    </div>
  );
}

function StartOrigin({ career, disabled, onAction }: { career: NrlCareerState; disabled: boolean; onAction: Dispatch }) {
  const { origin, season } = career;
  const [unavailable, setUnavailable] = useState(false);
  const [nominationId, setNominationId] = useState('');
  const eligible = NRL_ORIGIN_SIDES.map(side => ({
    side, players: season.squad.filter(player => nrlOriginEligibility(player.id) === side).sort((a, b) => a.name.localeCompare(b.name)),
  }));
  const nomineeSide = nrlOriginEligibility(nominationId);
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{season.year === 2026 ? 'Official 2026 schedule' : `Simulated ${season.year} schedule`}</h3>
      <OriginSchedule year={season.year} />
      <p className="text-sm text-muted-foreground">
        Named players use verified 2026 selections, and generated players have simulated eligibility.
        {origin && ' Starting this series replaces the previous series in this save.'}
      </p>
      {eligible.some(group => group.players.length) && <>
        <label className="block min-w-0 space-y-1 text-sm font-semibold">
          <span>Nominate a club player</span>
          <select className={selectClass} value={nominationId} disabled={disabled} aria-describedby="nrl-origin-nomination-hint"
            onChange={event => { setNominationId(event.target.value); setUnavailable(false); }}>
            <option value="">No nomination</option>
            {eligible.filter(group => group.players.length).map(({ side, players }) => (
              <optgroup key={side} label={NRL_ORIGIN_TEAM_NAMES[side]}>
                {players.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <p id="nrl-origin-nomination-hint" className="text-sm text-muted-foreground">
          Nominate an eligible club player for their state’s squad, then select them in the matchday 19.
          {nomineeSide && ` Coach ${NRL_ORIGIN_TEAM_NAMES[nomineeSide]} to use this nomination.`}
        </p>
      </>}
      <div className="grid gap-2 sm:grid-cols-2">
        {NRL_ORIGIN_SIDES.map(side => <Button key={side} type="button" size="lg" variant="outline"
          disabled={disabled || Boolean(nomineeSide && nomineeSide !== side)}
          onClick={() => setUnavailable(!onAction({ type: 'startOrigin', year: season.year, side, nominationId: nominationId || undefined }))}>
          Coach {NRL_ORIGIN_TEAM_NAMES[side]}
        </Button>)}
      </div>
      {unavailable && !disabled && <p className="text-sm" role="status">{nominationId
        ? 'The series could not start with that nomination. Choose another player or try No nomination.'
        : 'The series could not start. Both states need enough eligible players to fill every position and six reserve spots.'}</p>}
    </div>
  );
}

export default function NrlOriginOffice({ career, disabled, onAction }: {
  career: NrlCareerState; disabled: boolean; onAction: Dispatch;
}) {
  const { origin, originHistory, season, retired } = career;
  const [open, setOpen] = useState(Boolean(origin));
  if (retired && !origin) return null;
  const canStart = !retired && (!origin || (nrlOriginComplete(origin) && origin.year < season.year));
  return (
    <section aria-label="State of Origin" className="rounded-xl border border-border bg-card">
      <h2>
        <button type="button" className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left font-display text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
          aria-expanded={open} aria-controls="nrl-origin-office" onClick={() => setOpen(!open)}>
          State of Origin <ChevronDown aria-hidden="true" className={open ? 'size-4 rotate-180' : 'size-4'} />
        </button>
      </h2>
      <div id="nrl-origin-office" hidden={!open}>
        {open && <div className="space-y-3 border-t border-border px-3 py-3 sm:px-4">
          <p className="text-sm text-muted-foreground">
            Play three simulated games alongside your club career. Each side starts with full fitness and uses player ratings from the day you enter.
          </p>
          {origin && <>
            <h3 className="font-semibold">{origin.year === 2026 ? 'Official 2026 schedule' : `Simulated ${origin.year} schedule`}</h3>
            <ActiveOrigin key={origin.year} series={origin} disabled={disabled} onAction={onAction} />
          </>}
          {canStart && <StartOrigin key={season.year} career={career} disabled={disabled} onAction={onAction} />}
          {originHistory && (
            <details className="rounded-md border border-border bg-background px-3">
              <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">Past Origin series</summary>
              <div className="space-y-2 pb-3">
                {originHistory.slice().reverse().map(archive => (
                  <details key={archive.year} className="border-t border-border" data-nrl-origin-history={archive.year}>
                    <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold">{archive.year} · {NRL_ORIGIN_TEAM_NAMES[archive.winner]} won</summary>
                    <p className="mb-2 text-sm text-muted-foreground">You coached {NRL_ORIGIN_TEAM_NAMES[archive.side]}.</p>
                    <OriginSchedule year={archive.year} series={archive} />
                  </details>
                ))}
              </div>
            </details>
          )}
        </div>}
      </div>
    </section>
  );
}

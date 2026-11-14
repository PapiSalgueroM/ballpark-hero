import { useState } from 'react';
import { readNflGameRatings, readNflSettledWeek, type LeagueState } from '@/lib/frontOffice';
import { cn } from '@/lib/utils';

export function NflWeekResults({ league, team, compact = false }: { league: LeagueState; team: string; compact?: boolean }) {
  const weeks = league.schedule.flatMap((_, index) => {
    const games = readNflSettledWeek(league, index + 1);
    return games.length ? [{ week: index + 1, games }] : [];
  }).reverse();
  const latest = weeks[0];
  const [selection, setSelection] = useState<{ season: number; latest: number; week: number } | null>(null);
  if (!latest) return null;
  const choice = selection?.season === league.season && selection.latest === latest.week
    ? weeks.find(row => row.week === selection.week) ?? latest
    : latest;
  const { week, games } = choice;
  const mine = games.find(game => game.home === team || game.away === team);
  const changes = mine ? readNflGameRatings(mine, team) : null;
  const personnel = mine?.personnel?.team === team ? mine.personnel.result : null;
  const title = `Week ${week} ${compact ? 'regular-season result' : 'league scores'}`;

  return (
    <section aria-label={title} className="space-y-1 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">{title}</h3>
        {weeks.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Played week
            <select
              className="min-h-[44px] rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              value={week}
              onChange={event => setSelection({ season: league.season, latest: latest.week, week: Number(event.target.value) })}
            >
              {weeks.map(row => <option key={row.week} value={row.week}>Week {row.week}</option>)}
            </select>
          </label>
        )}
      </div>
      {compact && mine && (
        <p className="text-xs text-muted-foreground">{mine.home} {mine.homeScore} · {mine.awayScore} {mine.away}</p>
      )}
      {mine && (
        <div className="rounded-lg border border-border/60 px-2 py-1.5 text-xs" data-nfl-week-ratings>
          <h4 className="font-semibold">{team} rating changes</h4>
          {changes?.length ? (
            <ul className="mt-1 flex max-h-24 flex-wrap gap-x-3 gap-y-1 overflow-y-auto text-muted-foreground">
              {changes.map(([name, delta], index) => (
                <li key={index}>{name} <span className="font-semibold text-foreground">{delta > 0 ? '+1' : '-1'} OVR</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{changes ? 'No rating changes this week.' : 'Rating changes are unavailable for this week.'}</p>
          )}
        </div>
      )}
      {personnel && <p className="text-xs text-muted-foreground" data-two-te-result>
        {personnel === 'used' ? 'Your club played with two tight ends.' : 'Your club used the usual lineup because the two-tight-end group was short at kickoff.'}
      </p>}
      {!compact && <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
        {games.map(game => (
          <div key={game.home} className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]', game === mine ? 'border-gold/60 bg-gold/5' : 'border-border/60 bg-background')}>
            <span className={cn('truncate', game.winner === game.home ? 'font-bold text-foreground' : 'text-muted-foreground')}>{game.home} {game.homeScore}</span>
            <span className="px-1 text-muted-foreground/60">·</span>
            <span className={cn('truncate', game.winner === game.away ? 'font-bold text-foreground' : 'text-muted-foreground')}>{game.awayScore} {game.away}</span>
          </div>
        ))}
      </div>}
    </section>
  );
}

/**
 * Round 1542: the NFL Front Office's season in numbers, the bound season card.
 * The shared card (src/components/front-office-shared/FoSeasonStatsCard.tsx,
 * not edited) with the NFL's columns, leaders, awards and words, all decided
 * in src/lib/nflSeasonView.ts. The board reaches it through one lazy part
 * made at module level, so none of it is in the board's chunk:
 *   'close' on the recap: the season just closed, its awards named;
 *   'live' in Standings: the season so far (the awards tab says when they are
 *     named), then the save's award history.
 * A season with no lines (a save from before them, or the summer before Week 1)
 * says so in one line. Every number is this save's sim season.
 */
import { FoSeasonStatsCard } from '@/components/front-office-shared/FoSeasonStatsCard';
import { FoAwardHistory } from '@/components/front-office-shared/FoAwardHistory';
import type { LeagueState } from '@/lib/frontOffice';
import { nflLiveStats } from '@/lib/nflSeasonStats';
import {
  NFL_EMPTY_AWARDS, NFL_HISTORY_GAP, NFL_LEADER_TABLES, NFL_SIM_NOTE, NFL_STAT_HEADS,
  nflAwardBoxes, nflClosedAwards, nflClubKicks, nflHistoryRows, nflLeaders, nflTeamLines,
} from '@/lib/nflSeasonView';

export interface NflSeasonCardProps {
  league: LeagueState;
  myTeam: string;
  label: (abbr: string) => string;
  mode: 'close' | 'live';
}

export default function NflSeasonStats({ league, myTeam, label, mode }: NflSeasonCardProps) {
  const stats = nflLiveStats(league);
  const leaders = nflLeaders(league);
  const closed = nflClosedAwards(league);
  const kicks = nflClubKicks(league, myTeam);
  const pending = mode === 'live' && league.week === 1 && league.champions.every(c => c.season !== league.season)
    ? `Lines for the ${league.season} season start at Week 1.`
    : `This save started before season lines were kept, so the ${league.season} season has none. Lines and awards start with next season's Week 1.`;
  const history = mode === 'live' ? nflHistoryRows(league, myTeam) : null;
  return (
    <div className="space-y-3" data-nfl-season={mode}>
      {stats && leaders ? (
        <FoSeasonStatsCard
          season={league.season}
          note={NFL_SIM_NOTE}
          qualifyLine={`Season totals, regular season only. PTD thrown, RTD run in, CTD caught, SK sacks. Field goals and safeties count for the club, since kickers and punters are not on these rosters: ${label(myTeam)} kicked ${kicks?.fg ?? 0} field goal${kicks?.fg === 1 ? '' : 's'} and scored ${kicks?.sf ?? 0} safet${kicks?.sf === 1 ? 'y' : 'ies'}.`}
          awards={closed ? nflAwardBoxes(closed, myTeam) : []}
          emptyAwards={NFL_EMPTY_AWARDS}
          leaders={NFL_LEADER_TABLES.map(([text, col]) => ({
            label: text,
            rows: leaders[col as 'ptd' | 'rtd' | 'sk'].map(r => ({ id: r.id, name: r.name, team: r.team, value: r.value, mine: r.team === myTeam })),
          }))}
          teamName={label(myTeam)}
          columns={[...NFL_STAT_HEADS]}
          teamLines={nflTeamLines(league, myTeam).map(l => ({ id: l.id, name: l.name, g: l.g, values: l.values, tag: l.rookie ? '(rookie)' : undefined }))}
        />
      ) : (
        <p data-season-stats-pending className="rounded-2xl border border-border bg-card p-3 text-center text-xs text-muted-foreground">{pending}</p>
      )}
      {history && <FoAwardHistory rows={history.rows} ours={history.ours} league="NFL" gap={history.rows.length > 0 ? NFL_HISTORY_GAP : undefined} />}
    </div>
  );
}

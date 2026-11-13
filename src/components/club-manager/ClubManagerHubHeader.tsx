import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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

export function LeagueSeasonNotice({ league, leagueGames }: { league: 'k' | 'csl' | 'j1'; leagueGames: number }) {
  if (league === 'k') return <p data-cm-kleague-model className="text-xs text-muted-foreground mb-4">K League 1 plays 22 simulated league games on the shared August to May calendar. The real 2026 league used 33 games, then 5 split games. The split, Korea Cup, AFC competitions and promotion/relegation are not played here.</p>;
  if (league === 'csl') return <p data-cm-csl-model className="text-xs text-muted-foreground mb-4">Chinese Super League plays 30 games on Club Manager's simulated calendar. The 2026 start includes real opening point deductions. The CFA Cup, Super Cup, AFC competitions and promotion and relegation are outside this league model.</p>;
  return <p data-cm-j1-model className="text-xs text-muted-foreground mb-4">J1 plays {leagueGames} league games with generated opening squads and simulated dates and results. The Emperor's Cup, J.League Cup, AFC competitions and J2 promotion and relegation are outside this league model.</p>;
}

const FORM_TONE: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500', D: 'bg-yellow-500', L: 'bg-red-500',
};

export function ClubStatus({ positionLabel, stadium, budgetLabel, form, trophyCount }: {
  positionLabel: string; stadium: { name: ReactNode; capacity: number | null } | null;
  budgetLabel: ReactNode; form: readonly ('W' | 'D' | 'L')[]; trophyCount: number;
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
            {form.length === 0 && <span>No matches yet</span>}
            {form.map((f, i) => <span key={i} className={cn('w-2 h-2 rounded-full', FORM_TONE[f])} />)}
          </span>
          {trophyCount > 0 && <span>🏆×{trophyCount}</span>}
  </>;
}

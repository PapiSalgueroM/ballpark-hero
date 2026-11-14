import { INTERCONTINENTAL_CUP_SCHEDULE, intercontinentalCupDate, type IntercontinentalCupMatch } from '@/lib/clubIntercontinentalCup';
import { shortDate } from '@/lib/calDate';

export function IntercontinentalCupCard({ matches }: { matches: readonly IntercontinentalCupMatch[] }) {
  const champion = matches.length === INTERCONTINENTAL_CUP_SCHEDULE.length ? matches.at(-1)?.winner : undefined;
  return (
    <section data-cm-intercontinental-cup className="space-y-3 rounded-xl border border-border bg-card p-3 text-left">
      <div>
        <h3 className="text-sm font-bold">2025 Intercontinental Cup</h3>
        <p className="text-xs text-muted-foreground">Historical field. Results simulate as your calendar advances.</p>
      </div>
      <ol className="space-y-1 text-xs">
        {INTERCONTINENTAL_CUP_SCHEDULE.map((fixture, i) => {
          const match = matches[i];
          const home = typeof fixture.home === 'string' ? fixture.home : matches[fixture.home]?.winner;
          const away = typeof fixture.away === 'string' ? fixture.away : matches[fixture.away]?.winner;
          return (
            <li key={fixture.stage} className="rounded-md bg-secondary/40 px-2 py-1.5">
              <span className="block font-semibold">{fixture.stage}</span>
              <span className="block text-muted-foreground">{shortDate(intercontinentalCupDate(fixture))} · {fixture.venue}</span>
              {match ? (
                <>
                  <span>{match.home} {match.homeGoals}-{match.awayGoals} {match.away}</span>
                  {match.decidedBy === 'penalties' && <span className="block text-muted-foreground">{match.winner} won on penalties.</span>}
                  {match.decidedBy === 'extra time' && <span className="block text-muted-foreground">After extra time.</span>}
                </>
              ) : <span>{home ?? 'To be decided'} vs {away ?? 'to be decided'}</span>}
            </li>
          );
        })}
      </ol>
      {champion && <p className="text-xs font-semibold">Winner: {champion}</p>}
    </section>
  );
}

/**
 * Round 1311: one season's league honours, read from the save's own awards (the league book's top scorer,
 * most assists and most clean sheets, and the team of the season in four lines). Used by Past winners on
 * the Stats screen and by the season review. Names and numbers only: a man of mine is marked, a man the
 * game made up is tagged, and the team is printed as lines of names, never as places on a pitch (the book
 * knows a man is a defender, not that he played left back).
 */
import { cn } from '@/lib/utils';
import type { AwardMan, SeasonAwards, TeamMan } from '@/lib/clubManagerLeagueBoards';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';

const isMine = (flags: number) => (flags & 2) !== 0;
const madeUp = (flags: number) => (flags & 1) !== 0;

function Name({ name, flags }: { name: string; flags: number }) {
  return (
    <>
      <span className={cn('font-bold', isMine(flags) ? 'text-primary' : 'text-foreground')} data-mine={isMine(flags) ? '' : undefined}>{name}</span>
      {madeUp(flags) && <MadeUpTag className="ml-1" />}
    </>
  );
}

/** One winner: name, club and his number. */
export function WinnerLine({ label, icon, m }: { label: string; icon: string; m: AwardMan }) {
  return (
    <p data-cm-past-winner className="text-xs text-foreground">
      <span className="mr-1">{icon}</span>{label}: <Name name={m[0]} flags={m[3]} /> <span className="text-muted-foreground">({m[1]}, {m[2]})</span>
    </p>
  );
}

const LINES: { label: string; pick: (xi: TeamMan[]) => TeamMan[] }[] = [
  { label: 'Keeper', pick: xi => xi.slice(0, 1) },
  { label: 'Defenders', pick: xi => xi.slice(1, 5) },
  { label: 'Midfielders', pick: xi => xi.slice(5, 9) },
  { label: 'Forwards', pick: xi => xi.slice(9, 11) },
];

/** The team of the season, four lines of names. */
export function TeamLines({ xi }: { xi: TeamMan[] }) {
  return (
    <div data-cm-team className="space-y-1">
      {LINES.map(line => (
        <div key={line.label} data-cm-team-line={line.label} className="text-xs">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{line.label}</div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {line.pick(xi).map(m => (
              <span key={`${m[0]}|${m[1]}|${m[2]}`} data-cm-team-man>
                <Name name={m[0]} flags={m[3]} /> <span className="text-[10px] text-muted-foreground">{m[1]}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** One season's honours: the three winners, and the team while the record still keeps it. `recent` says
 *  the record is one of the newest five: a team missing there is a season whose lines could not be filled,
 *  one missing further back was let go. */
export function SeasonHonoursCard({ awards, recent }: { awards: SeasonAwards; recent: boolean }) {
  return (
    <div data-cm-honours className="space-y-1">
      {awards.boot && <WinnerLine label="Top scorer" icon="⚽" m={awards.boot} />}
      {awards.ast && <WinnerLine label="Most assists" icon="🅰️" m={awards.ast} />}
      {awards.glove && <WinnerLine label="Most clean sheets" icon="🧤" m={awards.glove} />}
      {awards.xi
        ? <div className="pt-1"><div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Team of the season</div><TeamLines xi={awards.xi} /></div>
        : <p data-cm-team-gone className="text-[10px] text-muted-foreground">{recent
          ? 'No team of the season that year: too few men in one of its lines had a season on record.'
          : 'The team of the season is kept for the last five seasons.'}</p>}
    </div>
  );
}

export default SeasonHonoursCard;

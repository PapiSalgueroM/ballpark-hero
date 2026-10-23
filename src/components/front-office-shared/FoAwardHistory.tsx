/**
 * Round 1542: a front office save's award history, shared. The shape the NBA
 * board has drawn in Standings since Round 824, lifted so the NFL draws it
 * from here now and the NBA, MLB and NHL boards can switch to it (owed: the
 * NBA's board is not edited in the round that wrote this). Newest first, one
 * line a season, in a box of its own height with its own scroll, so the page
 * never grows with the save. The board hands in the lines already worded.
 * Every line is a sim season of this save, and the box says so.
 */
export interface FoAwardHistoryProps {
  rows: { season: number; text: string }[];
  /** Awards his club has won in the history. */
  ours: number;
  /** The league's name, as in "not real NFL history". */
  league: string;
  /** A line under the history for the seasons it cannot show. */
  gap?: string;
}

export function FoAwardHistory({ rows, ours, league, gap }: FoAwardHistoryProps) {
  return (
    <div data-award-history className="rounded-2xl border border-border bg-card p-3">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Award history, this save</p>
      <p className="mb-1 text-center text-xs text-muted-foreground">
        {rows.length === 0
          ? `No awards named yet. Sim seasons, not real ${league} history.`
          : `${ours > 0 ? `Your club has won ${ours} award${ours === 1 ? '' : 's'} here.` : 'Your club has not won an award here yet.'} Sim seasons, not real ${league} history.`}
      </p>
      {rows.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {rows.map(r => (
            <p key={r.season} data-award-history-row className="text-xs text-muted-foreground">
              <b className="text-foreground">{r.season}</b> · {r.text}
            </p>
          ))}
        </div>
      )}
      {gap && <p className="mt-1 text-center text-xs text-muted-foreground">{gap}</p>}
    </div>
  );
}

export default FoAwardHistory;

/**
 * Round 943: the books for a GM seat, shared by every front office board.
 *
 * Everything this prints comes out of src/lib/gmBooks.ts (projectGmBooks,
 * ticketReactionGm), so what the screen promises is what the module books:
 * the ticket buttons say what the crowd and ownership will do: the crowd is
 * what setGmTicketTier moves, and ownership's point of trust is closeGmSeason's,
 * once, on the price the season finishes on. The operations budget is printed
 * apart from the payroll on purpose, because it never buys a player.
 *
 * Not mounted by this round: the boards belong to the rounds running beside
 * it, and the round that binds the books to a sport mounts this panel there.
 */
import { GM_TICKET_TIERS, projectGmBooks, ticketReactionGm, type GmBooks, type GmBooksContext, type GmProjectionLine, type GmTicketTier } from '@/lib/gmBooks';
import { cn } from '@/lib/utils';

interface GmBooksPanelProps {
  books: GmBooks;
  ctx: GmBooksContext;
  /** Change the ticket price; the board applies setGmTicketTier and saves. */
  onTicketTier?: (tier: GmTicketTier) => void;
}

const fmt = (m: number): string => `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;

function Lines({ title, lines }: { title: string; lines: GmProjectionLine[] }) {
  return (
    <div className="rounded-lg border border-border/60 p-2">
      <p className="mb-1 text-[11px] font-semibold">{title}</p>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-normal" />
            <th className="text-right font-normal">So far</th>
            <th className="text-right font-normal">Season</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.id} title={l.note}>
              <td className="pr-1">{l.label}{l.ops && <span className="text-muted-foreground"> (ops)</span>}</td>
              <td className="text-right tabular-nums">{fmt(l.actual)}</td>
              <td className="text-right tabular-nums">{fmt(l.projected)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GmBooksPanel({ books, ctx, onTicketTier }: GmBooksPanelProps) {
  const p = projectGmBooks(books, ctx);
  const last = books.lastSeason;
  return (
    <section data-gm-books className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[10px] text-muted-foreground">This season</p>
          <p className={cn('text-sm font-bold tabular-nums', p.resultProjected < 0 ? 'text-destructive' : 'text-primary')}>{fmt(p.resultProjected)}</p>
          <p className="text-[10px] text-muted-foreground">{fmt(p.resultActual)} so far, {p.periodsLeft} {ctx.sport.period}{p.periodsLeft === 1 ? '' : 's'} left</p>
        </div>
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[10px] text-muted-foreground">Operations budget</p>
          <p className="text-sm font-bold tabular-nums">{fmt(p.opsFree)} free</p>
          <p className="text-[10px] text-muted-foreground">of {fmt(p.opsBudget)} for staff, scouts and buildings. Never players.</p>
        </div>
      </div>
      <Lines title="Money in" lines={p.income} />
      <Lines title="Money out" lines={p.spend} />
      <p className="text-[10px] text-muted-foreground">{p.caveat}</p>
      {last && (
        <p className="text-[10px] text-muted-foreground">
          Last season: {fmt(last.income / 1000)} in, {fmt(last.spend / 1000)} out, {fmt(last.result / 1000)} on the year.
        </p>
      )}
      {onTicketTier && (
        <div className="rounded-lg border border-border/60 p-2">
          <p className="mb-1 text-[11px] font-semibold">Ticket prices</p>
          <div className="grid grid-cols-3 gap-1">
            {GM_TICKET_TIERS.map((t, i) => {
              const tier = i as GmTicketTier;
              const r = ticketReactionGm(tier);
              const on = books.ticketTier === tier;
              return (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTicketTier(tier)}
                  className={cn('rounded-md border p-1 text-left text-[10px] leading-tight', on ? 'border-primary bg-primary/10' : 'border-border/60')}
                >
                  <span className="block font-semibold">{t.emoji} {t.label}</span>
                  <span className="block text-muted-foreground">{r.crowd}</span>
                  <span className="block text-muted-foreground">{r.owner}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default GmBooksPanel;

import { cn } from '@/lib/utils';
import { picksHeldBy, pickKind, pickKey, ledgerYears } from '@/lib/gmPicks';
import type { GmPick, GmPickLedger, GmPickRules } from '@/lib/gmPicks';
import type { TradeWindow } from '@/lib/gmDeadline';

/**
 * Round 909: a club's draft capital, shared by all four front offices.
 *
 * Pure presentation over gmPicks.ts. Every pick on it is a row of the ledger
 * the engine hands in; nothing here decides anything. It is a tile, not a
 * page: one small block per draft year, a few chips in each.
 *
 * What it shows that the old number[] could not: picks in later drafts, picks
 * that came from another club (and whose they were), picks this club has
 * traded away, and, when the board passes the window, where the deadline is.
 * Where the league's rule set leaves something out (rules.partial), it says so
 * under the grid rather than letting the grid look complete.
 *
 * Not mounted by this round: the GM desk seam (Round 907) mounts it.
 */

const KIND_TAG: Record<string, string> = { comp: 'comp', cb: 'CB' };

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export interface GmPicksCardProps {
  ledger: GmPickLedger;
  club: string;
  season: number;
  rules: GmPickRules;
  /** A club id to the name the board shows. Defaults to the id. */
  clubName?: (id: string) => string;
  /** The trade window as the board sees it now, with its word for a period ('week', 'round'). */
  window?: TradeWindow & { periodWord: string };
}

export function GmPicksCard({ ledger, club, season, rules, clubName, window: win }: GmPicksCardProps) {
  const name = clubName ?? ((id: string) => id);
  const years = ledgerYears(season, rules);
  const held = picksHeldBy(ledger, club).filter(p => years.includes(p.year));
  const gone = ledger.picks.filter(p => p.orig === club && p.holder !== club && years.includes(p.year));
  const total = held.length;
  const firsts = held.filter(p => p.round === 1).length;

  const chip = (p: GmPick, away = false) => {
    const kind = pickKind(p);
    const from = p.orig !== club ? (p.origUnknown ? 'from a trade' : `via ${name(p.orig)}`) : null;
    return (
      <li
        key={pickKey(p) + (away ? ':away' : '')}
        data-gm-pick={pickKey(p)}
        className={cn(
          'rounded-md border px-1.5 py-0.5 text-[11px] leading-tight',
          away ? 'border-dashed border-border text-muted-foreground line-through'
            : p.round === 1 ? 'border-gold/50 bg-gold/10 text-foreground'
              : 'border-border bg-secondary/40 text-foreground',
        )}
      >
        {ordinal(p.round)}
        {KIND_TAG[kind] ? <span className="ml-1 text-[9px] uppercase text-muted-foreground">{KIND_TAG[kind]}</span> : null}
        {away ? <span className="ml-1 text-[9px]">to {name(p.holder)}</span> : null}
        {!away && from ? <span className="ml-1 text-[9px] text-muted-foreground">{from}</span> : null}
      </li>
    );
  };

  return (
    <div data-gm-picks className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Draft capital</p>
        <p className="text-[11px] text-muted-foreground">
          {total} pick{total === 1 ? '' : 's'}, {firsts} first{firsts === 1 ? '' : 's'}
        </p>
      </div>

      {win ? (
        <p data-gm-window className={cn('mt-1 text-xs font-semibold', win.open ? 'text-foreground' : 'text-destructive')}>
          {win.open
            ? win.periodsLeft === 0
              ? `Deadline day. This is the last ${win.periodWord} you can deal before it shuts.`
              : `Trade deadline after ${win.periodWord} ${win.deadlineAfter}. ${win.periodsLeft} ${win.periodWord}${win.periodsLeft === 1 ? '' : 's'} to go.`
            : win.reason}
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {years.map(y => {
          const mine = held.filter(p => p.year === y);
          const away = gone.filter(p => p.year === y);
          return (
            <div key={y} className="rounded-xl border border-border bg-background/40 p-2">
              <p className="text-[11px] font-bold text-foreground">{y}{y === season ? ' (this year)' : ''}</p>
              {mine.length === 0 && away.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No picks</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-1">
                  {mine.map(p => chip(p))}
                  {away.map(p => chip(p, true))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {rules.partial.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
          {rules.partial.map(line => <li key={line}>{line}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

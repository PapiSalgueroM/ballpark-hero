/**
 * Round 647: the season ledger on a recap, the same two chips and one line
 * on the four front offices and the two dynasties.
 *
 * "This season" is the number the season recorded. The second chip is the
 * ledger sum, and it only says Career when the ledger holds every season the
 * career has played. A save from before the ledger has seasons with no row
 * (they recorded under the old rule, and nothing is reconstructed), so on
 * one of those the sum is labelled with the season it starts from rather
 * than sitting beside "Seasons 5" claiming to be the whole career.
 *
 * The line under them says what the season was scored against, because a
 * 13-4 season can score par when the roster was projected to go 13-4.
 */
import { ledgerTotal, type SeasonRow } from '@/lib/seasonLedger';

const CHIP = 'rounded-full border border-border bg-background px-3 py-1.5';

export function SeasonLedgerChips({ row, ledger, seasonsPlayed }: { row: SeasonRow | null; ledger: SeasonRow[]; seasonsPlayed: number }) {
  if (!row) return null;
  const partial = ledger.length < seasonsPlayed;
  return (
    <>
      <span className={CHIP}>This season <b className="text-gold">{row.score}</b> pts</span>
      <span className={CHIP}>{partial ? `Since ${ledger[0]?.season ?? row.season}` : 'Career'} <b className="text-primary">{ledgerTotal(ledger)}</b> pts</span>
    </>
  );
}

export function SeasonProjectionNote({ row }: { row: SeasonRow | null }) {
  if (!row) return null;
  const projected = Math.round(row.expShare * row.games);
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Projected {projected} wins before your moves. You won {row.wins}, and beating the projection is what scores.
    </p>
  );
}

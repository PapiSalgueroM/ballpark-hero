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
 * The line under them states the whole projection the season was scored
 * against, in wins and in the round (the first version gave only the wins,
 * so a season that beat the projected wins could score nothing and the line
 * read as if it should have): the season the roster was projected to have,
 * the bar a season has to get past to score at all, and the season it had.
 */
import { BAR_SHARE, ledgerTotal, type SeasonRow } from '@/lib/seasonLedger';
import { roundPhrase, type SeasonShape } from '@/lib/seasonFormats';

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

type RoundWords = Pick<SeasonShape<unknown>, 'rounds' | 'roundNames' | 'noField'>;

export function SeasonProjectionNote({ row, shape }: { row: SeasonRow | null; shape: RoundWords }) {
  if (!row) return null;
  const wins = (share: number) => Math.round(share * row.games);
  const rarely = Math.round((1 - BAR_SHARE) * 100);
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Projected: {wins(row.expShare)} wins, {roundPhrase(shape, row.expStage)}.
      {' '}Points start past a season this roster tops only {rarely} times in 100: {wins(row.barShare)} wins, {roundPhrase(shape, row.barStage)}.
      {' '}Yours: {row.wins} wins, {roundPhrase(shape, row.stage)}.
    </p>
  );
}

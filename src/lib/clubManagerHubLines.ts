import type { CareerState, CareerStats } from '@/lib/clubManager';
import type { FinanceProjection } from '@/lib/clubManagerFinances';
import { deskOf } from '@/lib/clubManagerDecisions';
import { formatNumber } from '@/lib/formatNumber';

/* ─── Club Manager hub tile lines (Round 1328) ───
   The words on the hub's tiles, worked out in one pure place so a tile can
   never say something its own screen contradicts. Each function reads only
   what the save already holds; nothing here draws, saves or rolls a number.

   The tile that started it: the Inbox tile read "1 new" over "No messages yet"
   on a New year takeover, because the count included the open desk card and
   the line only read messages. Same class: the League tile printed a rank at
   week 0 under a header that said the season had not started, and the Manager
   tile counted wins and losses but forgot draws. */

/** What the inbox and the desk hold, as the tile's count and its line. */
export function inboxTile(c: Pick<CareerState, 'inbox' | 'decisions'>): { count: number; value: string; sub: string } {
  const inbox = c.inbox ?? [];
  const desk = deskOf(c);
  const openMessages = inbox.filter(m => !m.resolved);
  const openDesk = desk.filter(d => !d.resolved);
  /* Round 979's count, unchanged: open messages plus open desk cards. */
  const count = openMessages.length + openDesk.length;
  const value = count > 0 ? `${formatNumber(count)} new` : 'All quiet';
  const line = (sub: string) => ({ count, value, sub });
  /* The line names the first thing waiting. A desk card's sender is a role by
     its kind ("A role, never a real person"), so this switches on kind and
     never on a card id. */
  const appeal = openDesk.find(d => d.kind === 'appeal');
  if (appeal) return line('Red card appeal');
  if (openDesk[0]) return line(openDesk[0].from);
  const sender = (m: { from?: string; playerName: string }) => m.from ?? m.playerName;
  if (openMessages[0]) return line(sender(openMessages[0]));
  if (inbox[0]) return line(sender(inbox[0]));
  /* The desk is newest first, like the inbox (settleDecisionDesk puts fresh cards in front). */
  const newestCard = desk[0];
  if (newestCard) return line(newestCard.kind === 'appeal' ? 'Red card appeal' : newestCard.from);
  /* The inbox panel's own empty rule: nothing in the inbox AND nothing on the desk. */
  return line('No messages yet');
}

/** "5W 2D 6L", the way the Manager panel prints the record. An old save
 *  without a field reads it as 0, never "undefinedD". */
export function recordLine(s: Partial<Pick<CareerStats, 'wins' | 'draws' | 'losses'>> | null | undefined): string {
  return `${formatNumber(s?.wins ?? 0)}W ${formatNumber(s?.draws ?? 0)}D ${formatNumber(s?.losses ?? 0)}L`;
}

/** The League tile's value: the header's words before a ball is kicked
 *  (every club is on zero points, so a rank would be the shuffle's), the
 *  league position after. */
export function leagueTileValue(week: number, position: number | null | undefined): string {
  if (week === 0) return 'Not started';
  return `#${position || '-'}`;
}

/**
 * What the season does to the transfer kitty, actual and projected, by Round
 * 1326's rule: the season's result plus the running costs the board covers,
 * which are exactly the spend lines whose own `kitty` flag is false. The flag
 * says whether a line moves the kitty, so an income line with the flag false
 * is money the kitty never sees and comes back out of the result the same
 * way (every income line moves the kitty today). Read off the flags, never
 * off line ids, so a new line on either side lands right by itself.
 * Worked example: income 64.8, spend 72.4, so a result of -7.6; the board
 * covers 71.3 of running costs; the kitty changes by +63.7.
 */
export function kittyChange(p: Pick<FinanceProjection, 'resultActual' | 'resultProjected' | 'income' | 'spend'>): { actual: number; projected: number } {
  let coverActual = 0;
  let coverProjected = 0;
  for (const line of p.spend) {
    if (line.kitty) continue;
    coverActual += line.actual;
    coverProjected += line.projected;
  }
  for (const line of p.income) {
    if (line.kitty) continue;
    coverActual -= line.actual;
    coverProjected -= line.projected;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return { actual: round2(p.resultActual + coverActual), projected: round2(p.resultProjected + coverProjected) };
}

/* Round 1308: the NFL front office's bracket card, bound.

   The shared card (src/components/front-office-shared/GmBracketCard.tsx)
   with the NFL's three things: the words of its "?"
   (src/data/gmBrackets/nflHelp.ts, as Round 1224 wrote them), its seed
   numbers and its week names. Nothing mounts it yet: Round 1309 reaches this
   file from the board through a lazy part made at module level, so the card,
   the help sheet and the ledger's round names are one chunk the week box
   asks for and a press never waits on.

   THE SEEDS ARE THE SPORT'S TO NUMBER. The bracket's seed list is the AFC's
   seven and then the NFC's (src/data/gmBrackets/nfl.ts), so the list's place
   plus one would print the NFC's top seed as 8; each conference counts from
   1. THE WEEK NAMES come from the sourced ledger
   (src/data/usPostseasonFormat.ts), and src/test/gmBracketLedger.test.ts
   holds the bracket to as many weeks as the ledger has names. */
import { GmBracketCard } from '@/components/front-office-shared/GmBracketCard';
import { NFL_BRACKET_HELP } from '@/data/gmBrackets/nflHelp';
import { usPostseasonRounds } from '@/data/usPostseasonFormat';
import type { GmBracketMount } from '@/lib/gmPostseason';

const NFL_WEEKS = usPostseasonRounds('nfl').map(r => r.name);

/** A bracket week's name from the ledger: "Wild Card", "Divisional", "Conference Championship", "Super Bowl". */
export const nflWeekLabel = (week: number): string => NFL_WEEKS[week - 1] ?? String(week);

/** A club's seed in its own conference (1 to 7), or null for a club outside the fourteen. */
export function nflSeedOf(seeds: readonly string[], club: string): number | null {
  const i = seeds.indexOf(club);
  if (i < 0 || i >= 14) return null;
  return i < 7 ? i + 1 : i - 6;
}

export default function NflBracket(props: GmBracketMount) {
  return <GmBracketCard {...props} help={NFL_BRACKET_HELP} seedOf={club => nflSeedOf(props.save.seeds, club)} weekLabel={nflWeekLabel} />;
}

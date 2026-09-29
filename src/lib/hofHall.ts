import type { HofPlayer } from '@/data/hofPlayers';

/**
 * The line the Hall of Fame or Bust reveal prints about the real Hall of Fame.
 *
 * Round 661 fix. The reveal used to print "Official verdict: Hall of Fame"
 * for every card the game calls a Hall of Famer, which told players that
 * Brady, LeBron, Crosby, Peterson and Jagr are in a hall none of them is in.
 * The verdict is the game's own call and the board now labels it that way;
 * this line is the fact beside it, read from the card's sourced hall field:
 *   in a hall        'In the Naismith Hall of Fame, class of 2009.'
 *   not in it yet    'Not in the Pro Football Hall of Fame yet.'
 *   not in, a bust   'Not in the Pro Football Hall of Fame.'
 *   no hall fits     soccer has no single hall, so the call is all ours
 *
 * scripts/simTriviaFacts.mjs section 6 renders this for every card and fails
 * if an inducted card loses its year or a card that is not in reads as if he
 * were.
 */
export function hallStatusLine(p: Pick<HofPlayer, 'hall' | 'verdict'>): string {
  const h = p.hall;
  if (!h) return "Soccer has no single Hall of Fame, so this one's all our call.";
  if (h.year !== null) return `In the ${h.name}, class of ${h.year}.`;
  return p.verdict === 'bust' ? `Not in the ${h.name}.` : `Not in the ${h.name} yet.`;
}

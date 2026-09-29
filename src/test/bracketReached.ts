/**
 * The round a team reached in a postseason, worked out from the games alone.
 *
 * Round 674 fix, the adversarial review of the fence debt round (its M3).
 * The six season boards' engine rows compared the recorded row's round with
 * stageOf from src/lib/seasonLedger.ts, the very function the board builds
 * the row with (through seasonResultOf), over the same round names. So the
 * row was checked against the ledger's own reading of the bracket: a
 * stageOf that paid every playoff team one round more than it reached moved
 * both sides of every row and left all six green.
 *
 * This reads nothing the ledger reads: no stageOf, no round names, no
 * roundOf. Only who played whom, in the order the engine played them, and
 * who won. The final is the one game whose winner never plays again, and it
 * is round `rounds`; every other game is one round before the next game its
 * winner plays. A game that feeds the bracket without being in it (a
 * play-in) comes out at round 0 or below, which is no round. A team's round
 * is the latest round it played in, and the champion's is one past the last.
 *
 * It refuses a bracket it cannot read that way (more than one game whose
 * winner never plays again, a final that is not the last game, or a final
 * the named champion did not win), so a change to an engine's postseason
 * shows up as a loud failure rather than as a round read wrongly.
 */
export interface BracketGame {
  home: string;
  away: string;
  winner: string;
}

/** The round of every game, by the winners' path, in the order given. */
export function roundsByWinnersPath(games: readonly BracketGame[], rounds: number): number[] {
  const out = new Array<number>(games.length);
  let finals = 0;
  for (let i = games.length - 1; i >= 0; i -= 1) {
    const w = games[i].winner;
    let j = i + 1;
    while (j < games.length && games[j].home !== w && games[j].away !== w) j += 1;
    if (j < games.length) out[i] = out[j] - 1;
    else { out[i] = rounds; finals += 1; }
  }
  if (games.length && finals !== 1) throw new Error(`the bracket has ${finals} games whose winner never plays again, so its final cannot be told apart`);
  return out;
}

/** The round `team` reached: 0 for no bracket game, rounds + 1 for the title. */
export function reachedInBracket(games: readonly BracketGame[], team: string, rounds: number, champion: string): number {
  if (!games.length) throw new Error('the engine kept no bracket games for the season');
  const byGame = roundsByWinnersPath(games, rounds);
  const final = games[games.length - 1];
  if (byGame[games.length - 1] !== rounds) throw new Error('the last game in the bracket is not its final');
  if (final.winner !== champion) throw new Error(`the final was won by ${final.winner}, but the engine crowned ${champion}`);
  if (team === champion) return rounds + 1;
  let reached = 0;
  games.forEach((g, i) => { if ((g.home === team || g.away === team) && byGame[i] > reached) reached = byGame[i]; });
  return Math.min(reached, rounds);
}

/**
 * Round 1567: one test, shared by the Baseball, NBA, NFL and NHL Connections
 * hooks, for "this solved group is that board group".
 *
 * A daily save holds each solved group by its label AND its five names. A round
 * that relabels a group in place (Round 1567 dated the club groups, so "Played
 * for the Steelers" became "Played for the Steelers (as of 2025)") leaves a save
 * written before it holding the old label. Matching by label alone then left the
 * relabelled group out of the solved list, and a lost board revealed it a second
 * time: five rows, the same five names twice. A saved group is the board's group
 * when the label agrees or the five names agree. A board whose members changed
 * still differs in names, so the dealt day check keeps flagging those.
 */
interface GroupLike {
  theme: string;
  players: readonly string[];
}

function nameKey(players: readonly string[]): string {
  return [...players].sort().join('|');
}

export function isSameConnectionsGroup(solved: GroupLike, board: GroupLike): boolean {
  if (solved.theme === board.theme) return true;
  return solved.players.length === board.players.length && nameKey(solved.players) === nameKey(board.players);
}

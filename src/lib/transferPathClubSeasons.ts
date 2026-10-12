import type { CareerPlayer } from '@/types/career';
import type { TransferPathPuzzle, TransferPathRuleHint } from '@/data/transferPathPuzzles';
import { VERIFIED_TRANSFER_PATH_CLUB_SEASONS } from '@/data/transferPathClubSeasons';
import { transferPathIdentityKey } from '@/lib/transferPathIdentity';
import { buildSeasonIndex, clubSeasonsOf, linkedFrom, type ClubSeasonKeys } from '@/lib/transferPathGraph';
import { isEuropeanClub, playersUnderRule, TRANSFER_PATH_RULES, type TransferPathRule } from '@/lib/transferPathModes';

/** Supplement existing identities with verified membership, without making up stat rows. */
export function transferPathSpells(players: CareerPlayer[], rule: TransferPathRule = 'classic') {
  return players.map(p => {
    const identity = transferPathIdentityKey(p.name, p.nationality);
    const extra = VERIFIED_TRANSFER_PATH_CLUB_SEASONS.filter(s =>
      transferPathIdentityKey(s.name, s.nationality) === identity
      && (rule !== 'europe' || isEuropeanClub(s.club))
      && !p.career.some(old => old.club === s.club && old.season === s.season),
    );
    return extra.length ? { name: p.name, career: [...p.career, ...extra.map(({ club, season }) => ({ club, season }))] } : p;
  });
}

export function verifiedClubSeasonsOf(players: CareerPlayer[], rule: TransferPathRule = 'classic') {
  return clubSeasonsOf(transferPathSpells(players, rule));
}

/** One BFS per start, shared by its puzzles. All links use the game's actual season rule. */
function pathsFrom(keys: Map<string, ClubSeasonKeys>) {
  const index = buildSeasonIndex(keys);
  const cache = new Map<string, Map<string, { via: string; club: string; steps: number }>>();
  return (from: string, to: string): TransferPathRuleHint | null => {
    if (!keys.has(from) || !keys.has(to) || from === to) return null;
    let prev = cache.get(from);
    if (!prev) {
      prev = new Map([[from, { via: '', club: '', steps: 0 }]]);
      const queue = [from];
      for (let i = 0; i < queue.length; i += 1) {
        const cur = queue[i];
        for (const next of linkedFrom(index, keys.get(cur)!)) {
          if (prev.has(next.name)) continue;
          prev.set(next.name, { via: cur, club: next.club, steps: prev.get(cur)!.steps + 1 });
          queue.push(next.name);
        }
      }
      cache.set(from, prev);
    }
    const lastStep = prev.get(to);
    if (!lastStep) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev.get(path[0])!.via);
    const steps = lastStep.steps;
    const first = prev.get(path[1])!.club;
    const last = lastStep.club;
    const hint = steps === 1 ? `Direct link. They were at ${first} together.`
      : steps === 2 ? `One middle man does it. He was at ${first} with ${from} and${first === last ? ', in another season,' : ''} at ${last} with ${to}.`
      : `${steps === 3 ? 'Two' : steps === 4 ? 'Three' : steps === 5 ? 'Four' : steps - 1} middle men at least. The first was at ${first} with ${from}; the last was at ${last} with ${to}.`;
    return { minSteps: steps, hint, oneOptimalPath: path };
  };
}

/** Keep puzzle identity/order and unchanged hints; update only paths changed by membership evidence. */
export function refreshTransferPathPuzzles(puzzles: TransferPathPuzzle[], players: CareerPlayer[]): TransferPathPuzzle[] {
  if (transferPathSpells(players).every((p, i) => p === players[i])) return puzzles;
  const searches = TRANSFER_PATH_RULES.map(rule => {
    const pool = playersUnderRule(players, rule);
    return { rule, before: pathsFrom(clubSeasonsOf(pool)), after: pathsFrom(verifiedClubSeasonsOf(pool, rule)) };
  });
  return puzzles.map(puzzle => {
    let out = puzzle;
    for (const { rule, before, after } of searches) {
      const oldPath = before(puzzle.playerA, puzzle.playerB);
      const newPath = after(puzzle.playerA, puzzle.playerB);
      if (!newPath || oldPath?.minSteps === newPath.minSteps) continue;
      out = rule === 'classic' ? { ...out, ...newPath } : { ...out, [rule]: newPath };
    }
    return out;
  });
}

/* Round 1035: the one place Club Manager's modern squads are joined.
 *
 * src/data/clubManagerRosters.ts is baked from the value table
 * (scripts/bakeClubManagerRosters.mjs); src/data/clubManagerALeague2026.ts is
 * generated offline from the A-League Men ledgers
 * (scripts/genClubManagerALeague.mjs). Both engine files that read the modern
 * world (src/lib/clubManager.ts and src/lib/clubManagerEras.ts) import the
 * joined maps from here, so a club is never in one and missing from the other.
 *
 * The A-League ledgers are the newer read: a man the generator proved is the
 * same person as a baked row elsewhere (CM_ALEAGUE_SUPERSEDES) is dropped
 * from that baked club, so nobody is in two squads at once. */
import { CM_ROSTERS as CM_ROSTERS_BAKED, CM_PARTIAL as CM_PARTIAL_BAKED } from '@/data/clubManagerRosters';
import type { BakedPlayer } from '@/data/clubManagerRosters';
import { CM_ALEAGUE_ROSTERS, CM_ALEAGUE_PARTIAL, CM_ALEAGUE_SUPERSEDES } from '@/data/clubManagerALeague2026';

function joinWorld(): Record<string, BakedPlayer[]> {
  const out: Record<string, BakedPlayer[]> = { ...CM_ROSTERS_BAKED };
  for (const [name, club] of Object.entries(CM_ALEAGUE_SUPERSEDES)) {
    const list = out[club];
    if (list) out[club] = list.filter(p => p.n !== name);
  }
  return { ...out, ...CM_ALEAGUE_ROSTERS };
}

export const CM_WORLD_ROSTERS: Record<string, BakedPlayer[]> = joinWorld();
export const CM_WORLD_PARTIAL: string[] = [...CM_PARTIAL_BAKED, ...CM_ALEAGUE_PARTIAL];

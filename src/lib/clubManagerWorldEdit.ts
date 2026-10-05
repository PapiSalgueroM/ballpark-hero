/**
 * Round 964: the world editor. Move any club to any league before kickoff.
 *
 * The engine already plays a save's league memberships as data (Round 310:
 * CareerState.leagueOverrides, registered through registerLeagueOverrides),
 * and every lookup that matters reads them: leagueOf, playableClubs, the
 * club def map that ranks a club inside its league (so the board's demand is
 * its stature against its NEW league), the world tables, the domestic cup's
 * country pool and the Champions League draw. Promotion and relegation have
 * written those memberships since Round 310; this module lets the player
 * write them too.
 *
 * Every move is a swap. A league keeps its exact size, so its calendar, its
 * relegation places and its European places stay the ones the rules table
 * gives it, and no league can be edited into a size the calendar does not
 * know. An edit holds only the leagues that differ from today's real world,
 * so no edits at all is null, and a null edit starts the same career this
 * game has always started.
 *
 * Pure apart from withWorldEdit, which registers an edit for one synchronous
 * call and puts back whatever the tab had (the Round 719 pattern), so the
 * picker can preview an edited world without leaking it into a save.
 */
import {
  REAL_LEAGUES,
  registerLeagueOverrides,
  engineRegistrations,
  restoreEngineRegistrations,
} from '@/lib/clubManager';

/** League id to its clubs, for the leagues that differ from the real world. */
export type WorldEdit = Record<string, string[]>;

/** One club that plays somewhere other than its real league. */
export interface WorldMove {
  club: string;
  /** League id the club really plays in today. */
  from: string;
  /** League id the edit puts it in. */
  to: string;
}

/* Built on first use, never at module scope: REAL_LEAGUES comes through an
   import, and reading an imported value while modules are still evaluating
   is how this repo once shipped a page crashing import cycle. */
let HOME: Map<string, string> | null = null;
function homeMap(): Map<string, string> {
  if (HOME) return HOME;
  const m = new Map<string, string>();
  for (const l of REAL_LEAGUES) for (const c of l.clubs) if (!m.has(c)) m.set(c, l.id);
  HOME = m;
  return m;
}

/** The league a club really plays in today, or null for a name in no league. */
export function realLeagueIdOf(club: string): string | null {
  return homeMap().get(club) ?? null;
}

/** A league's clubs under an edit: its edited lineup, or its real one. */
export function editedClubsOf(edit: WorldEdit | null, leagueId: string): string[] {
  return edit?.[leagueId] ?? REAL_LEAGUES.find(l => l.id === leagueId)?.clubs ?? [];
}

/** The league a club plays in under an edit, or null for a name in no league. */
export function editedLeagueIdOf(edit: WorldEdit | null, club: string): string | null {
  if (edit) for (const [id, clubs] of Object.entries(edit)) if (clubs.includes(club)) return id;
  const home = realLeagueIdOf(club);
  return home && !edit?.[home] ? home : null;
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every(c => s.has(c));
}

/**
 * Swap two clubs between their leagues. Each takes the other's place, so both
 * leagues keep their size. A league whose members end up the real ones again
 * drops out of the edit, so swapping a pair back is a full undo. Returns the
 * edit unchanged (the same object) for a swap that cannot happen: an unknown
 * club, or two clubs already in the same league.
 */
export function swapClubs(edit: WorldEdit | null, a: string, b: string): WorldEdit | null {
  const la = editedLeagueIdOf(edit, a);
  const lb = editedLeagueIdOf(edit, b);
  if (!la || !lb || la === lb) return edit;
  const listA = editedClubsOf(edit, la).map(c => (c === a ? b : c));
  const listB = editedClubsOf(edit, lb).map(c => (c === b ? a : c));
  const next: WorldEdit = { ...(edit ?? {}), [la]: listA, [lb]: listB };
  for (const id of [la, lb]) {
    const real = REAL_LEAGUES.find(l => l.id === id)?.clubs ?? [];
    if (sameMembers(next[id], real)) delete next[id];
  }
  return Object.keys(next).length ? next : null;
}

/** Every club the edit moves, in world league order, then by name. */
export function worldEditMoves(edit: WorldEdit | null): WorldMove[] {
  if (!edit) return [];
  const out: WorldMove[] = [];
  for (const l of REAL_LEAGUES) {
    const clubs = edit[l.id];
    if (!clubs) continue;
    for (const c of [...clubs].sort()) {
      const from = realLeagueIdOf(c);
      if (from && from !== l.id) out.push({ club: c, from, to: l.id });
    }
  }
  return out;
}

/** A league's display name. */
export function worldLeagueName(id: string): string {
  return REAL_LEAGUES.find(l => l.id === id)?.name ?? id;
}

/**
 * A clean copy of an edit, or null when it is not one this editor could
 * have made: an unknown league, a lineup of the wrong size, a club named
 * twice, or a world whose clubs are not exactly today's clubs. An edit that
 * changes nothing is null too.
 */
export function validWorldEdit(raw: unknown): WorldEdit | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: WorldEdit = {};
  for (const [id, clubs] of Object.entries(raw as Record<string, unknown>)) {
    const real = REAL_LEAGUES.find(l => l.id === id);
    if (!real || !Array.isArray(clubs) || clubs.length !== real.clubs.length) return null;
    if (!clubs.every(c => typeof c === 'string')) return null;
    if (!sameMembers(clubs as string[], real.clubs)) out[id] = [...(clubs as string[])];
  }
  const seen = new Set<string>();
  for (const l of REAL_LEAGUES) {
    for (const c of out[l.id] ?? l.clubs) {
      if (seen.has(c) || !realLeagueIdOf(c)) return null;
      seen.add(c);
    }
  }
  if (seen.size !== homeMap().size) return null;
  return Object.keys(out).length ? out : null;
}

/**
 * Run fn with the edit registered as the world's memberships, then put back
 * whatever was registered before, whatever fn does. Synchronous only.
 */
export function withWorldEdit<T>(edit: WorldEdit | null, fn: () => T): T {
  const saved = engineRegistrations();
  registerLeagueOverrides(edit);
  try {
    return fn();
  } finally {
    restoreEngineRegistrations(saved);
  }
}

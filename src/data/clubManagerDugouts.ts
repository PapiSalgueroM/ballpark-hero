/**
 * Round 1606: Club Manager's real dugouts. EMPTY on purpose until Round 1607 fills it.
 *
 * One row per chair: the man in charge for the club's first league match of the season an era describes, plus
 * the month he was appointed to that stint ('YYYY-MM', dropped where two sources disagree on the month). Keys are
 * the era ids of src/lib/clubManagerEras.ts ('now', 'era2020', 'era2015', 'era2010', 'era2005') and the club
 * names exactly as the game's league tables spell them.
 *
 * Every row needs two independent sources, neither a wiki. The URLs live in scripts/data/cmDugouts.receipt.json
 * and never in this file, which ships in the bundle. A chair in a covered league that could not be two sourced
 * goes on CM_DUGOUTS_PARTIAL for its era (the CM_PARTIAL shape) and keeps a made up name that says so.
 *
 * A row carries a name and a month and nothing else: no rating, style, value or record on a real person. How the
 * game may use a name is the rule in src/lib/realDugouts.ts (a display slot only, never a sentence).
 */
import type { RealDugoutPartial, RealDugoutRow, RealDugoutTable } from '@/lib/realDugouts';

/** The row type, named for this game: `{ name: string; appointed?: string }`. */
export type CMDugoutRow = RealDugoutRow;

/** Era id, then club, then the opening day chair. */
export const CM_DUGOUTS: RealDugoutTable = {};

/** Era id, then the covered clubs whose chair could not be two sourced. */
export const CM_DUGOUTS_PARTIAL: RealDugoutPartial = {};

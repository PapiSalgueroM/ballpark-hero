import type { Position } from '@/types/game';

/**
 * ONE POSITION RULE, SHARED (Round 442).
 *
 * This is World XI's eligibility rule, lifted out of `worldXi.ts` so more than
 * one game can hold it. Nothing about the rule changed in the move: worldXi
 * still exports `eligiblePositions`, `fitsSlot`, `allowedLabel` and
 * `wrongPositionMessage`, they just call through to here now.
 *
 * WHY IT MOVED. The owner put Marc-André ter Stegen, a goalkeeper, in a centre
 * midfield slot in Build Your XI and the game took him. Build Your XI was the
 * only lineup game on the site with no position rule of its own: it posted the
 * slot's role to the `validate-player` edge function and asked a language model
 * to refuse a keeper at CM in prose (Round 315). A prompt is a request, not a
 * gate, and it lost. The NBA lineup builder had already solved the same problem
 * the other way in `useNbaLineup.isPositionEligibleForSlot`: check the row's own
 * position against the slot, deterministically, before any AI call. Soccer was
 * the odd one out, so it now shares the rule the soccer games already had.
 *
 * THE RULE, in the order the checks run:
 *   1. THE GOALKEEPER BOUNDARY. A keeper is never an outfielder and an
 *      outfielder is never a keeper. This is absolute and it is checked first,
 *      so no widening added later (a family alternate, a verified history row,
 *      a new slot shape) can ever reach around it.
 *   2. THE FAMILY. A stored position is only a player's PRIMARY role, and real
 *      footballers cover a family: wingers count on both flanks, full backs and
 *      wing backs cover each other on the same side, CM/CDM/CAM cover each
 *      other, ST and CF are interchangeable. See ALT_POSITIONS.
 *   3. VERIFIED HISTORY (Round 345), where the caller has it. A position the
 *      player's own curated rows carry grants exactly that slot, with no family
 *      expansion, so history can never reopen the LWB-to-RW hole Round 319 shut.
 */

export const ALL_POSITIONS: Position[] = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST',
];

/* Multi-position eligibility. Owner hit this: Raphinha plays LW at Barca but
   RW for Brazil and was rejected for a RW slot. Note GK has no entry and never
   gets one: a keeper's family is himself. */
export const ALT_POSITIONS: Partial<Record<Position, Position[]>> = {
  LW: ['RW', 'LM'], RW: ['LW', 'RM'],
  LM: ['RM', 'LW'], RM: ['LM', 'RW'],
  LB: ['LWB', 'RB'], RB: ['RWB', 'LB'],
  LWB: ['LB', 'RWB'], RWB: ['RB', 'LWB'],
  CM: ['CDM', 'CAM'],
  CDM: ['CM'], CAM: ['CM'],
  ST: ['CF'], CF: ['ST'],
};

/** Every position this player can take a slot for: primary plus family alternates. */
export function eligiblePositions(pos: Position): Position[] {
  return [pos, ...(ALT_POSITIONS[pos] ?? [])];
}

/* Round 319, off the owner's review: "a LWB filling a RW slot". The shared
   formation data gives every wide slot the same set, because a 4-4-2 wide MID
   slot and a 3-5-2 wing-back slot genuinely take wing-backs. A front line
   winger slot does not: RW and LW narrow to wingers and wide mids only, which
   also cuts the family chain that let LWB reach RW through RWB. squadDeal's own
   games keep their looser sets on purpose. */
export function slotAllowedPositions(label: string, allowed: Position[]): Position[] {
  if (label === 'RW') return ['RW', 'RM'];
  if (label === 'LW') return ['LW', 'LM'];
  return allowed;
}

/**
 * The whole rule in one predicate. `played` is optional verified history.
 *
 * The goalkeeper boundary sits at the top on purpose: it is a fact about the
 * sport rather than a tuning choice, and putting it above both widening paths
 * is what makes ter Stegen at CM unreachable no matter what else is added.
 */
export function fitsAllowed(primary: Position, allowed: Position[], played?: Position[]): boolean {
  const slotIsGoal = allowed.includes('GK');
  if (slotIsGoal !== (primary === 'GK')) return false;
  if (eligiblePositions(primary).some(pos => allowed.includes(pos))) return true;
  return (played ?? []).some(pos => allowed.includes(pos));
}

/**
 * "CDM / CM / CAM" style summary of what a slot accepts. Computed from the
 * EFFECTIVE accepted set (any position whose family reaches one of the slot's
 * allowed positions), so the copy matches what fitsAllowed actually lets
 * through, e.g. a RW slot lists LW because wingers count on both flanks.
 */
export function allowedLabelFor(allowed: Position[]): string {
  return ALL_POSITIONS.filter(pos => fitsAllowed(pos, allowed)).join(' / ');
}

/* ---------------- Build Your XI ---------------- */

/**
 * What each Build Your XI slot accepts, as a plain role-to-positions map.
 *
 * These are squadDeal's own formation sets (DC, DR, DL, MD, WR, WL, FW), read
 * off `src/lib/squadDeal.ts`, with World XI's narrower front line wings applied
 * through slotAllowedPositions. Build Your XI stores a slot as a bare role
 * rather than a FormationSlot, so the sets live here instead of being derived
 * from a pitch layout the game does not have.
 */
export const SLOT_ALLOWED_BY_ROLE: Record<Position, Position[]> = {
  GK: ['GK'],
  CB: ['CB'],
  RB: ['RB', 'RWB', 'CB'],
  LB: ['LB', 'LWB', 'CB'],
  RWB: ['RW', 'RM', 'RWB'],
  LWB: ['LW', 'LM', 'LWB'],
  CDM: ['CDM', 'CM'],
  CM: ['CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'CM'],
  RM: ['RW', 'RM', 'RWB'],
  LM: ['LW', 'LM', 'LWB'],
  RW: ['RW', 'RM'],
  LW: ['LW', 'LM'],
  ST: ['ST', 'CF'],
  CF: ['ST', 'CF'],
};

export interface LineupPickCheck {
  ok: boolean;
  /** Player-facing refusal line. Present only when ok is false. */
  reason?: string;
}

/**
 * The gate Build Your XI runs before it accepts a pick, on the position stored
 * on the row the player actually chose from the dropdown.
 *
 * `rawPosition` is the untouched `player_market_values.position` value, e.g.
 * "Goalkeeper" or "Attacking Midfield"; `normalize` is squadDeal's
 * `normalizePosition`, passed in so this module stays free of database code and
 * a harness can bundle it on its own.
 *
 * A row with no position, or a spelling the map does not know, is not refused
 * here. It is handed on to the `validate-player` check, which still has to
 * return a verdict before anything is accepted (Round 315 put the same position
 * rule in that prompt, and Round 315's fail-closed behaviour is untouched).
 * That path is theoretical today: all 141,916 rows in player_market_values
 * carry a position and all 13 distinct values map (measured 2026-09-04).
 */
export function checkLineupPick(
  playerName: string,
  slotRole: Position,
  slotLabel: string,
  rawPosition: string | null | undefined,
  normalize: (raw: string) => Position | null,
  /* ROUND 493: the verified history, which this function has been throwing away.
     fitsAllowed has taken it since Round 345 and its docstring calls it
     "optional verified history", World XI passes it at worldXi.ts:131, and this
     caller never did. So the same module answered two different ways depending
     on which game asked, and Build Your XI was the strict one for no reason.
     Measured 2026-09-06 over the 134 curated players and all 15 slot roles: 94
     of the 945 player-and-slot pairs turn from REFUSED into allowed, and every
     one of them is real football that the game was rejecting. Amad Diallo is a
     right winger who has played right wing-back; Alex Baena is a left winger who
     has played CAM; Anthony Gordon is a left winger who has played striker.
     (The first attempt at that measurement said 165 and was wrong: the curated
     primary_position is stored the way the market table spells it, "Central
     Midfield", while fitsAllowed takes the short code, so every "before" answer
     was false for the wrong reason. Normalising the primary first, as this
     function already does, gives 94.)
     The goalkeeper boundary is NOT at risk and does not need repeating here:
     fitsAllowed puts it above both widening paths on purpose, so a keeper still
     cannot reach an outfield slot however long his history is. Measured on the
     same run: 0 pairs where that could happen. */
  played?: Position[],
): LineupPickCheck {
  const allowed = SLOT_ALLOWED_BY_ROLE[slotRole];
  if (!allowed) return { ok: true };
  const primary = rawPosition ? normalize(rawPosition.trim()) : null;
  if (!primary) return { ok: true };
  if (fitsAllowed(primary, allowed, played)) return { ok: true };
  return {
    ok: false,
    reason: primary === 'GK'
      ? `${playerName} is a goalkeeper. The ${slotLabel} slot needs ${allowedLabelFor(allowed)}.`
      : allowed.includes('GK')
      ? `${playerName} plays ${primary}, not in goal. Pick a keeper for this slot.`
      : `${playerName} plays ${primary}. The ${slotLabel} slot needs ${allowedLabelFor(allowed)}. Try someone else.`,
  };
}

import type { NbaGmPlayer, NbaGmTeam } from './nbaFrontOffice';

/** Fixed minutes in this simulation: five starters and three bench players. */
export const NBA_ROTATION_MINUTES = [36, 34, 33, 32, 30, 28, 26, 21];

type RotationTeam = Pick<NbaGmTeam, 'players' | 'rotation'>;

function preferenceShape(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= NBA_ROTATION_MINUTES.length
    && value.every(id => typeof id === 'string') && new Set(value).size === value.length;
}

function byRating(players: NbaGmPlayer[]): NbaGmPlayer[] {
  return [...players].sort((a, b) => b.ovr - a.ovr);
}

/** Owned preferred slots include injured players so their places survive recovery. */
export function nbaRotationPreferences(t: RotationTeam): NbaGmPlayer[] {
  const count = Math.min(NBA_ROTATION_MINUTES.length, t.players.length);
  const ids = preferenceShape(t.rotation) ? t.rotation : [];
  const slots = Array.from({ length: count }, (_, i) => t.players.find(p => p.id === ids[i]));
  const reserved = new Set(slots.filter((p): p is NbaGmPlayer => !!p).map(p => p.id));
  const automatic = [...byRating(t.players.filter(p => p.out === 0)), ...byRating(t.players.filter(p => p.out !== 0))];
  const spare = automatic.filter(p => !reserved.has(p.id));
  return slots.map(p => p ?? spare.shift()).filter((p): p is NbaGmPlayer => !!p);
}

/** Healthy cover fills a missing slot without taking another preferred player's place. */
export function nbaRotationSlots(t: RotationTeam): (NbaGmPlayer | undefined)[] {
  const healthy = byRating(t.players.filter(p => p.out === 0));
  if (!preferenceShape(t.rotation)) return healthy.slice(0, NBA_ROTATION_MINUTES.length);
  const preferred = nbaRotationPreferences(t);
  const reserved = new Set(preferred.filter(p => p.out === 0).map(p => p.id));
  const spare = healthy.filter(p => !reserved.has(p.id));
  return Array.from({ length: NBA_ROTATION_MINUTES.length }, (_, i) => {
    const p = preferred[i];
    return p?.out === 0 ? p : spare.shift();
  });
}

export function nbaRotation(t: RotationTeam): NbaGmPlayer[] {
  return nbaRotationSlots(t).filter((p): p is NbaGmPlayer => !!p);
}

/** Choosing an existing preferred player swaps the two slots. Invalid and unchanged choices do nothing. */
export function nbaSetRotationSlot(t: RotationTeam, index: number, playerId: string): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= NBA_ROTATION_MINUTES.length
    || typeof playerId !== 'string' || !t.players.some(p => p.id === playerId && p.out === 0)) return false;
  const slots = nbaRotationPreferences(t).map(p => p.id);
  if (index >= slots.length || slots[index] === playerId) return false;
  const other = slots.indexOf(playerId);
  if (other >= 0) slots[other] = slots[index];
  slots[index] = playerId;
  t.rotation = slots;
  return true;
}

export function nbaAutoRotation(t: RotationTeam): boolean {
  if (!Object.prototype.hasOwnProperty.call(t, 'rotation')) return false;
  delete t.rotation;
  return true;
}

/** Reconcile departed IDs after an accepted roster move, keeping injured preferences. */
export function nbaReconcileRotation(t: RotationTeam): boolean {
  if (!Object.prototype.hasOwnProperty.call(t, 'rotation')) return false;
  if (!preferenceShape(t.rotation) || t.players.length === 0) return nbaAutoRotation(t);
  const next = nbaRotationPreferences(t).map(p => p.id);
  if (next.length === t.rotation.length && next.every((id, i) => id === t.rotation![i])) return false;
  t.rotation = next;
  return true;
}

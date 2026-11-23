interface CareerPlayerIdentity {
  name: string;
  id?: string;
  nationality?: string;
  position?: string;
}

const ALISSON_ROW_IDS = new Map([
  ['alisson', 'a0000001-0000-0000-0000-000000000040'],
  ['alisson becker', 'a0000001-0000-0000-0000-000000000066'],
]);

const ALISSON_IDENTITY = 'verified:alisson-becker';

/** Resolve the live IDs and bundled fallback records that represent this verified keeper. */
export function careerPlayerIdentityKey(player: CareerPlayerIdentity): string | undefined {
  const rowId = ALISSON_ROW_IDS.get(player.name.trim().toLowerCase());
  if (!rowId) return undefined;

  const nationality = player.nationality?.trim().toLowerCase();
  const position = player.position?.trim().toLowerCase();
  const isBrazilian = nationality === 'brazil';
  const isKeeper = position === 'gk' || position === 'goalkeeper';
  if ((nationality && !isBrazilian) || (position && !isKeeper)) return undefined;
  if (player.id ? player.id !== rowId : !isBrazilian || !isKeeper) return undefined;
  return ALISSON_IDENTITY;
}

/** Match two entries in a verified alias group. */
export function sameCareerPlayerIdentity(a: CareerPlayerIdentity, b: CareerPlayerIdentity): boolean {
  const key = careerPlayerIdentityKey(a);
  return key !== undefined && key === careerPlayerIdentityKey(b);
}

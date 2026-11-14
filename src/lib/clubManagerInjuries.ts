import { MONTH_NAMES, parseIsoDate } from '@/lib/calDate';

export interface MajorInjury {
  kind: 'acl' | 'achilles';
  returnDate: string;
}

export function readMajorInjury(value: MajorInjury | undefined) {
  if (!value || (value.kind !== 'acl' && value.kind !== 'achilles')) return null;
  try {
    return parseIsoDate(value.returnDate);
  } catch {
    return null;
  }
}

export function majorInjuryLabel(value: MajorInjury | undefined): string | null {
  const date = readMajorInjury(value);
  if (!date || !value) return null;
  const kind = value.kind === 'acl' ? 'ACL tear' : 'Achilles rupture';
  return `${kind}, expected back ${date.d} ${MONTH_NAMES[date.m - 1].slice(0, 3)} ${date.y}`;
}

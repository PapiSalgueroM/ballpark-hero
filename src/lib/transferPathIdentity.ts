import { foldSpecialLatin } from '@/lib/nameFold';

const NATIONALITY_ALIASES: Record<string, string> = {
  'bosnia & herzegovina': 'bosnia-herzegovina',
  'bosnia and herzegovina': 'bosnia-herzegovina',
  'ivory coast': "cote d'ivoire",
  'korea, south': 'south korea',
  'turkey': 'turkiye',
  'united states of america': 'united states',
  'usa': 'united states',
};

/** Stable folding for evidence identities. It does not discard punctuation. */
export function normalizeTransferPathIdentityPart(value: string): string {
  return foldSpecialLatin(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ');
}

export function normalizeTransferPathNationality(value: string): string {
  const normalized = normalizeTransferPathIdentityPart(value);
  return NATIONALITY_ALIASES[normalized] ?? normalized;
}

/** Name plus nationality is the minimum identity used by Active Players Only. */
export function transferPathIdentityKey(name: string, nationality: string): string {
  return `${normalizeTransferPathIdentityPart(name)}|${normalizeTransferPathNationality(nationality)}`;
}

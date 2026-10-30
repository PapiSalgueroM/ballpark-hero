/**
 * Latin special-letter folding that Unicode NFD decomposition MISSES.
 * NFD strips combining accents (é -> e) but letters like Ø, ł, đ, æ are
 * standalone code points with no decomposition, so "Ødegaard" never matched
 * a plain "Odegaard" search (owner bug report, 2026-08-05). Run this BEFORE
 * or AFTER NFD stripping; it is idempotent and lowercase-only.
 */
const SPECIALS: Record<string, string> = {
  'ø': 'o', 'Ø': 'o',
  'đ': 'd', 'Đ': 'd', 'ð': 'd', 'Ð': 'd',
  'ł': 'l', 'Ł': 'l',
  'æ': 'ae', 'Æ': 'ae',
  'œ': 'oe', 'Œ': 'oe',
  'ß': 'ss',
  'þ': 'th', 'Þ': 'th',
  'ħ': 'h', 'Ħ': 'h',
  'ı': 'i', 'İ': 'i',
  'ŋ': 'n', 'Ŋ': 'n',
};

const SPECIALS_RE = new RegExp(`[${Object.keys(SPECIALS).join('')}]`, 'g');

export function foldSpecialLatin(s: string): string {
  return (s || '').replace(SPECIALS_RE, (ch) => SPECIALS[ch] ?? ch);
}

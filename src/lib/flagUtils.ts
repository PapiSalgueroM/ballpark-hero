// Flag-emoji utilities for the site-wide "real flag images" fix.
//
// Windows ships no color font for flag emojis: a regional-indicator pair like
// U+1F1EB U+1F1F7 (France) renders as the bare letters "FR", and the
// England/Scotland/Wales tag sequences collapse to a plain black flag. Every
// user-facing flag therefore renders through flagcdn.com images (see
// src/components/FlagImg.tsx). These helpers convert the emoji forms the data
// layer stores into the lowercase ISO codes flagcdn expects, WITHOUT touching
// the stored data itself - share strings and DB rows keep their emojis.

const RI_A = 0x1f1e6; // regional indicator symbol letter A
const TAG_A = 0xe0061; // tag latin small letter a
const TAG_CANCEL = 0xe007f;
const BLACK_FLAG = 0x1f3f4;

/**
 * GB subdivision tag sequences -> flagcdn codes. These are the only tag-
 * sequence flags in Unicode's RGI set (England, Scotland, Wales).
 */
const TAG_SEQUENCES: Record<string, string> = {
  gbeng: 'gb-eng',
  gbsct: 'gb-sct',
  gbwls: 'gb-wls',
};

/**
 * Matches every flag emoji inside a string: any regional-indicator pair
 * (\u{1F1E6}-\u{1F1FF} twice, so France/EU/UN and friends) or a black-flag
 * tag sequence (England/Scotland/Wales). A lone black flag U+1F3F4 is NOT
 * matched - it renders fine on every platform.
 */
export const FLAG_EMOJI_RE = /(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:\u{1F3F4}[\u{E0061}-\u{E007A}]+\u{E007F})/gu;

/**
 * Converts a single flag emoji to the lowercase iso code flagcdn.com serves:
 * France pair -> "fr", EU pair -> "eu", England tag sequence -> "gb-eng".
 * Returns null for anything that is not a flag emoji (globes, white/rainbow
 * flags, country names, plain text).
 */
export function flagEmojiToIso(emoji: string): string | null {
  const cps: number[] = [];
  for (const ch of (emoji ?? '').trim()) cps.push(ch.codePointAt(0) ?? 0);

  if (cps.length === 2 && cps.every(cp => cp >= RI_A && cp <= RI_A + 25)) {
    return cps.map(cp => String.fromCharCode(97 + (cp - RI_A))).join('');
  }
  if (cps.length >= 3 && cps[0] === BLACK_FLAG && cps[cps.length - 1] === TAG_CANCEL) {
    const letters = cps.slice(1, -1);
    if (letters.every(cp => cp >= TAG_A && cp <= TAG_A + 25)) {
      const key = letters.map(cp => String.fromCharCode(97 + (cp - TAG_A))).join('');
      return TAG_SEQUENCES[key] ?? null;
    }
  }
  return null;
}

export type FlagSegment = { flag: string } | { text: string };

/**
 * Splits a string into flag-emoji and plain-text segments so a renderer can
 * swap each embedded flag for an <img> while leaving the rest untouched:
 * "\u{1F1E6}\u{1F1F7} Prime Messi" -> [{flag}, {text: " Prime Messi"}].
 * Strings without flags come back as a single text segment.
 */
export function splitFlagSegments(text: string): FlagSegment[] {
  const s = text ?? '';
  const out: FlagSegment[] = [];
  let last = 0;
  for (const m of s.matchAll(FLAG_EMOJI_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: s.slice(last, idx) });
    out.push({ flag: m[0] });
    last = idx + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/**
 * Smart multi-word search utility used across all game search components.
 *
 * Features:
 *  - Multi-word query: every word must appear somewhere in the name
 *  - "Starts-with" boost: names where a word starts with a query word rank first
 *  - Fuzzy fallback: Levenshtein distance for typo tolerance (words ≥ 4 chars)
 *  - Highlight helper: wraps matched portions for rendering
 */

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j - 1], dp[j]) + 1;
      prev = tmp;
    }
  }
  return dp[n];
}

/** Max edit distance allowed for a query word of given length. */
function maxDist(wordLen: number): number {
  if (wordLen <= 3) return 0; // short words: exact only
  if (wordLen <= 5) return 1;
  return 2;
}

/**
 * Check whether a single query word fuzzy-matches any word in the name.
 * Returns 'exact' if substring match, 'fuzzy' if within edit distance, null otherwise.
 */
function matchWord(lower: string, nameWords: string[], qw: string): 'exact' | 'fuzzy' | null {
  if (lower.includes(qw)) return 'exact';
  const dist = maxDist(qw.length);
  if (dist > 0 && nameWords.some(nw => levenshtein(nw, qw) <= dist)) return 'fuzzy';
  return null;
}

/**
 * Capitalise the first letter of every word (simple title case).
 * "lebron james" → "Lebron James"
 */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Check if every query word appears in the name (exact substring or fuzzy). */
export function smartMatch(name: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const lower = name.toLowerCase();
  const nameWords = lower.split(/\s+/);
  return words.every(w => matchWord(lower, nameWords, w) !== null);
}

/**
 * Score for sorting. Lower = better.
 *  0, starts-with exact match
 *  1, exact substring (no starts-with)
 *  2, fuzzy match only
 */
export function smartScore(name: string, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = name.toLowerCase();
  const nameWords = lower.split(/\s+/);

  let hasFuzzyOnly = false;
  for (const qw of words) {
    const m = matchWord(lower, nameWords, qw);
    if (m === 'fuzzy') hasFuzzyOnly = true;
  }
  if (hasFuzzyOnly) return 2;

  const hasStartsWith = words.some(qw => nameWords.some(nw => nw.startsWith(qw)));
  return hasStartsWith ? 0 : 1;
}

/**
 * Highlight matched portions in a name.
 * Returns an array of { text, highlight } segments.
 */
export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

export function highlightMatches(name: string, query: string): HighlightSegment[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [{ text: name, highlight: false }];

  // Find all match ranges
  const ranges: { start: number; end: number }[] = [];
  const lower = name.toLowerCase();

  for (const w of words) {
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(w, idx);
      if (found === -1) break;
      ranges.push({ start: found, end: found + w.length });
      idx = found + 1;
    }
  }

  if (ranges.length === 0) return [{ text: name, highlight: false }];

  // Merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) {
      last.end = Math.max(last.end, ranges[i].end);
    } else {
      merged.push(ranges[i]);
    }
  }

  // Build segments
  const segments: HighlightSegment[] = [];
  let pos = 0;
  for (const r of merged) {
    if (r.start > pos) segments.push({ text: name.slice(pos, r.start), highlight: false });
    segments.push({ text: name.slice(r.start, r.end), highlight: true });
    pos = r.end;
  }
  if (pos < name.length) segments.push({ text: name.slice(pos), highlight: false });

  return segments;
}

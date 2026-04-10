/**
 * Smart multi-word search utility used across all game search components.
 *
 * Features:
 *  - Multi-word query: every word must appear somewhere in the name
 *  - "Starts-with" boost: names where a word starts with a query word rank first
 *  - Highlight helper: wraps matched portions for rendering
 */

/** Check if every query word appears in the name (case-insensitive). */
export function smartMatch(name: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const lower = name.toLowerCase();
  return words.every(w => lower.includes(w));
}

/**
 * Score for sorting. Lower = better.
 * Names where any word *starts with* a query word get score 0, others 1.
 */
export function smartScore(name: string, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const nameWords = name.toLowerCase().split(/\s+/);
  const hasStartsWith = words.some(qw =>
    nameWords.some(nw => nw.startsWith(qw))
  );
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

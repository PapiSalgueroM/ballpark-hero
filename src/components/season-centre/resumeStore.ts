/* Round 1046: the write side of the resume record (the read side, which a
   career page carries in its first download, is src/lib/season/resume.ts).
   It loads with the Season Centre, knows no sport, and never throws: a
   browser that refuses storage simply keeps no place. */
import { resumeStorageKey, type SeasonResume } from '@/lib/season/resume';

export function writeResume(game: string, r: SeasonResume): void {
  const { key, year, md, speed, stable } = r;
  try { localStorage.setItem(resumeStorageKey(game), JSON.stringify({ key, year, md, speed, stable })); } catch { /* no place kept */ }
}

export function clearResume(game: string): void {
  try { localStorage.removeItem(resumeStorageKey(game)); } catch { /* nothing to clear */ }
}

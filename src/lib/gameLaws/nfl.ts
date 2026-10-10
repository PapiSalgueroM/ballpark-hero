/* Round 1221: the STORY half of the NFL's law (./types.ts says why there are
   two halves; ./nflScore.ts is the score). Everything that tells an NFL game
   after its score is known: the scoring drives that make a final, the minute
   each line of the feed falls on, the clock label, and the lines that are
   about a club. Moved here from src/lib/season/nfl.ts (Round 1147) with every
   body unchanged; that file imports it back and still exports the names it
   exported before, and scripts/simUsSeasonCentre.mjs holds the move to the
   byte (its digest mode and scripts/data/usSeasonLawDigest.json).

   Real and two sourced (src/data/usLeagueShape.ts): what a scoring play is
   worth (the 6, 7, 8, 3 and 2 here are the ledger's NFL_SCORING) and the
   clock of four quarters of 15 minutes, which the ledger marks thin.
   src/test/gameLawNfl.test.ts holds this file's numbers to the ledger's.
   THIS SIM'S OWN: which drive list tells a score, the most field goals a
   side is given, how far apart the minutes sit, and every sentence.

   It imports ../keyedShuffle and types, nothing else: not the season core,
   not the ledger, not an engine. So it can sit in any chunk. No React, no
   Math.random. */
import { shuffled } from '../keyedShuffle';
import type { SeasonEvent } from '../season/core';
import type { Rng, StoryLaw } from './types';

/** The most field goals one side is given in a game. */
export const MAX_FG = 6;
/** The length of a game in minutes: the ledger's four quarters of 15. */
export const NFL_GAME_MINUTES = 60;

/** The scoring drives of one side: touchdowns worth 6, 7 or 8, field goals, safeties. */
export interface NflDrives { tds: number[]; fgs: number; safeties: number }

/** How far a list is from plain football: every touchdown that is not a
 *  seven costs one, a safety four. */
function driveOptions(points: number, minTd: number, exactFg: number | null): { t: number; f: number; s: number; cost: number }[] {
  const out: { t: number; f: number; s: number; cost: number }[] = [];
  if (!Number.isInteger(points) || points < 0 || minTd < 0) return out;
  for (let s = 0; s <= 1; s += 1) {
    for (let f = exactFg ?? 0; f <= (exactFg ?? MAX_FG); f += 1) {
      const rest = points - 3 * f - 2 * s;
      if (rest < 0) break;
      for (let t = minTd; 6 * t <= rest; t += 1) {
        if (rest > 8 * t) continue;
        out.push({ t, f, s, cost: Math.abs(rest - 7 * t) + 4 * s });
      }
    }
  }
  return out;
}

/** The least a drive list for that score strays from sevens and threes; null: no list makes it. */
export function nflDriveCost(points: number, minTd: number, exactFg: number | null): number | null {
  const opts = driveOptions(points, minTd, exactFg);
  return opts.length ? Math.min(...opts.map(o => o.cost)) : null;
}

/** The scoring drives of one side that make `points`, with at least `minTd`
 *  touchdowns (his) and, for a kicker's own side, exactly `exactFg` field
 *  goals. Sevens and threes first; a 6 (the kick after is missed), an 8 (a
 *  two point try) and at most one safety only when the sum needs it. Every
 *  whole number has a list except 1 and 4; null when there is none. */
export function nflDrives(points: number, minTd: number, exactFg: number | null, rng: Rng): NflDrives | null {
  const opts = driveOptions(points, minTd, exactFg);
  const u = rng();
  if (opts.length === 0) return null;
  const least = Math.min(...opts.map(o => o.cost));
  const best = opts.filter(o => o.cost === least);
  const pick = best[Math.floor(u * best.length)];
  const off = points - 3 * pick.f - 2 * pick.s - 7 * pick.t;
  const tds = shuffled(Array.from({ length: pick.t }, (_, i) => (i < Math.abs(off) ? 7 + Math.sign(off) : 7)), rng);
  return { tds, fgs: pick.f, safeties: pick.s };
}

/** A side's scoring drives sit at least this many minutes apart where the hour has room. */
const DRIVE_GAP = 3;
const MINUTE_TRIES = 40;

/** The minutes of one game's lines, one call a line, in the order they are
 *  asked for. No two lines of one game share a minute. Where the hour has
 *  room, no two lines sit in back to back minutes either and a side's scoring
 *  drives (a call that names the side) are at least DRIVE_GAP minutes apart (a
 *  drive takes time); a game with more lines than that leaves room for falls
 *  back to any free minute. Make one picker a game. */
export function nflMinutePicker(rng: Rng): (side?: 'us' | 'them') => number {
  const used = new Set<number>();
  const drives: Record<'us' | 'them', number[]> = { us: [], them: [] };
  return (side?: 'us' | 'them') => {
    let m = 1 + Math.floor(rng() * NFL_GAME_MINUTES);
    for (let t = 0; t < MINUTE_TRIES; t += 1) {
      const crowded = used.has(m - 1) || used.has(m) || used.has(m + 1) || (side !== undefined && drives[side].some(x => Math.abs(x - m) < DRIVE_GAP));
      if (!crowded) break;
      m = 1 + Math.floor(rng() * NFL_GAME_MINUTES);
    }
    for (let i = 0; i < NFL_GAME_MINUTES && used.has(m); i += 1) m = (m % NFL_GAME_MINUTES) + 1;
    used.add(m);
    if (side !== undefined) drives[side].push(m);
    return m;
  };
}

/** The quarter and the minutes left in it: minute 0 is Q1 15:00, minute 16 is Q2 14:00, minute 60 is Q4 0:00. */
export function nflClockLabel(minute: number): string {
  const m = Math.max(0, Math.min(NFL_GAME_MINUTES, Math.floor(minute)));
  return m === 0 ? 'Q1 15:00' : `Q${Math.ceil(m / 15)} ${(15 - (m % 15)) % 15}:00`;
}

/** What a touchdown line says after itself: nothing for a seven. A six is the
 *  kick after missed, unless `sixIsATry` (the career's own kicker, whose line
 *  holds no extra points, is never told a kick of his missed). */
export function nflTryWords(pts: number | undefined, sixIsATry = false): string {
  const six = sixIsATry ? ' The two point try is no good.' : ' The kick after is no good.';
  return pts === 6 ? six : pts === 8 ? ' The two point try is good.' : '';
}

/** One line of a feed for a scoring drive told about the club: a touchdown
 *  (which reads as seven unless it says otherwise), a field goal, a safety.
 *  Any other kind is not a club's line and gives ''. */
export function nflClubLine(e: SeasonEvent, club: string, sixIsATry = false): string {
  switch (e.kind) {
    case 'td': return `🏈 Touchdown, ${club}.${nflTryWords(e.pts, sixIsATry)}`;
    case 'fg': return `🥅 Field goal, ${club}.`;
    case 'safety': return `Safety, ${club}.`;
    default: return '';
  }
}

/** The law's story as a game outside the Season Center tells it: both sides'
 *  drive lists (the home club first), then a minute a drive from one picker,
 *  in the order the Season Center lays a game out. */
export const NFL_STORY_LAW: StoryLaw = {
  id: 'nfl',
  events: (home, away, rng) => {
    const us = nflDrives(home, 0, null, rng);
    const them = nflDrives(away, 0, null, rng);
    if (!us || !them) return null;
    const minute = nflMinutePicker(rng);
    const ev: SeasonEvent[] = [];
    for (const [side, d] of [['us', us], ['them', them]] as const) {
      d.tds.forEach(pts => ev.push({ min: minute(side), kind: 'td', side, pts }));
      for (let i = 0; i < d.fgs; i += 1) ev.push({ min: minute(side), kind: 'fg', side, pts: 3 });
      for (let i = 0; i < d.safeties; i += 1) ev.push({ min: minute(side), kind: 'safety', side, pts: 2 });
    }
    return ev.sort((a, b) => a.min - b.min);
  },
  /* "Q2 14:00" is eight characters: a feed's time column needs the wider class, as a whole literal */
  clock: { length: NFL_GAME_MINUTES, label: nflClockLabel, start: 'Kickoff.', end: 'Final', endShort: 'FINAL', labelClass: 'w-14' },
  line: (e, club) => nflClubLine(e, club),
};

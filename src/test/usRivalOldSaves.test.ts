/**
 * Round 1227: saves from before the NFL rival moved onto the player's own stat line still load and play.
 *
 * src/test/fixtures/usRivalOldSaves.json holds five NFL My Career saves BUILT BY THE CODE BEFORE THE ROUND (the
 * commit is stamped in the file; scripts/simUsRivalSense.mjs --record-old-saves writes it, driving careers the
 * way the board does). Each is put through the sport's binding the way the board does it:
 *
 *   a save sitting on the roster card the release before dealt   the tap pays what that card printed
 *   ("Morale +5" for making the first team, "Morale -5" for      (the two `own` cards of rosterBeat, kept for
 *   dropping off it a year after)                                 exactly this and never dealt again)
 *   a save sitting on beat 221 with its old words                 the tap pays Fanbase +4 and softens the feud,
 *                                                                 and logs the card's own emoji and title
 *   a corner's and a kicker's career in mid flight, the rival's   the old line stays until his next season,
 *   last line in the old shape and a lopsided tally               then is his position's own shape; the tally
 *                                                                 is kept and one year is added to one side
 *
 * No save field was added and nothing is migrated: the file is never rewritten by a later round.
 */
import { describe, expect, it } from 'vitest';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import type { CareerState } from '@/lib/nflMyCareer';
import { keyedStream } from './helpers/usCareerDrive';
import fixture from './fixtures/usRivalOldSaves.json';

const saves = fixture.saves as unknown as Record<'nflMade' | 'nflDropped' | 'nfl221' | 'nflCB' | 'nflK', CareerState>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const cap = (v: number): number => Math.max(0, Math.min(100, v));

/** Answer the pending rivalry card the way the board does (the binding falls back to Math.random). */
function tap(save: CareerState): { state: CareerState; lines: string[] } {
  const keep = Math.random;
  Math.random = keyedStream('usRivalOldSaves|tap');
  try { return NFL_CAREER_SPORT.dismissRivalryEvent(clone(save)); } finally { Math.random = keep; }
}

/** The shape nflStatLine prints at a position (the parts, in order). */
const NEW_SHAPE: Record<string, RegExp> = {
  CB: /^\d+ INT, \d+ pass(?:es)? defended, \d+ tackles?$/,
  K: /^\d+ of \d+ FG, long of \d+$/,
};

describe('Round 1227: a save from before the round', () => {
  it('is stamped with the commit whose code built it', () => {
    expect(fixture.recordedFrom).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.keys(fixture.saves).sort()).toEqual(['nfl221', 'nflCB', 'nflDropped', 'nflK', 'nflMade']);
  });

  it('sitting on "Morale +5" (you made the first team) is paid Morale +5', () => {
    const save = saves.nflMade;
    expect(save.pendingRivalryEvent).toMatchObject({ id: 206, consequence: 'Morale +5' });
    expect(save.rival?.lastYear).toBeUndefined();
    const out = tap(save);
    expect(out.state.morale).toBe(cap(save.morale + 5));
    expect(out.state.fanbase).toBe(save.fanbase);
    expect(out.lines.some(l => l.includes('You were named first team All-Pro.'))).toBe(true);
    expect(out.state.pendingRivalryEvent).toBeFalsy();
  });

  it('sitting on "Morale -5" (off the first team a year after) is paid Morale -5', () => {
    const save = saves.nflDropped;
    expect(save.pendingRivalryEvent).toMatchObject({ id: 206, consequence: 'Morale -5' });
    const out = tap(save);
    expect(out.state.morale).toBe(cap(save.morale - 5));
    expect(out.lines.some(l => l.includes('You were left off the All-Pro first team.'))).toBe(true);
  });

  it('sitting on beat 221 with its old words pays what that card printed and logs that card', () => {
    const save = saves.nfl221;
    const card = save.pendingRivalryEvent!;
    expect(card.id).toBe(221);
    expect(card.consequence).toBe('Fanbase +4, the feud softens');
    const out = tap(save);
    expect(out.state.fanbase).toBe(cap(save.fanbase + 4));
    expect(out.state.rivalryIntensity).toBe(cap((save.rivalryIntensity ?? 0) - 10));
    expect(out.state.morale).toBe(save.morale);
    expect(out.lines).toEqual([`${card.emoji} ${card.title}`]);
  });

  it.each(['nflCB', 'nflK'] as const)('%s: the old shape line stays until his next season, then is his position\'s own', key => {
    const save = saves[key];
    const before = save.rival!;
    expect(before.retired).toBe(false);
    expect(before.lastLine).not.toMatch(NEW_SHAPE[save.pos]);
    expect(before.hisYears - before.myYears).toBeGreaterThanOrEqual(3);

    const c = clone(save);
    const rng = keyedStream(`usRivalOldSaves|season|${key}`);
    const keep = Math.random; Math.random = rng;
    try { NFL_CAREER_SPORT.campBattle(c, 80, rng); NFL_CAREER_SPORT.simSeason(c, 80, rng); } finally { Math.random = keep; }
    const season = c.seasons[c.seasons.length - 1];
    const after = c.rival!;
    expect(c.seasons.length).toBe(save.seasons.length + 1);
    expect(after.lastLine).toMatch(NEW_SHAPE[save.pos]);
    expect(after.lastYear).toBe(season.year);
    expect(typeof after.lastAllStar).toBe('boolean');
    expect(after.myYears + after.hisYears).toBe(before.myYears + before.hisYears + 1);
    expect(after.myYears).toBeGreaterThanOrEqual(before.myYears);
    expect(after.hisYears).toBeGreaterThanOrEqual(before.hisYears);
  });
});

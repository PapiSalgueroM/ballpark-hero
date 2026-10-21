/**
 * Round 1313: saves from before the MLB and NHL rivals moved onto the player's own stat line still load and play.
 *
 * src/test/fixtures/usRivalOldSavesB.json holds ten MLB and NHL My Career saves BUILT BY THE CODE BEFORE THE ROUND
 * (the commit is stamped in the file; scripts/simUsRivalSense.mjs --record-old-saves-b writes it, driving careers
 * the way the board does). Each is put through the sport's binding the way the board does it:
 *
 *   a save sitting on the All-Star card the release before dealt   the tap pays what that card printed (the two
 *   ("Morale +5", "Morale -5"), a sport                           `own` cards of rosterBeat, never dealt again)
 *   an MLB starter, reliever and center fielder and an NHL goalie  the old shape line stays until his next season,
 *   in mid career, the rival's last line in the old shape and a   then is his position's own shape; the tally is
 *   lopsided tally                                                kept and one year is added to one side
 *   a save a sport whose rival has retired                        his old line stays on the save for good (a
 *                                                                 known leftover: the fix is on the card, owed)
 *
 * No save field was added and nothing is migrated: the file is never rewritten by a later round.
 */
import { describe, expect, it } from 'vitest';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { keyedStream } from './helpers/usCareerDrive';
import fixture from './fixtures/usRivalOldSavesB.json';

type Save = { pos: string; morale: number; fanbase: number; seasons: { year: number }[]; pendingRivalryEvent?: { id: number; consequence: string } | null; rival?: { lastLine: string; myYears: number; hisYears: number; retired: boolean; lastYear?: number; lastAllStar?: boolean } };
const saves = fixture.saves as unknown as Record<string, Save>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const cap = (v: number): number => Math.max(0, Math.min(100, v));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SPORT: Record<'mlb' | 'nhl', any> = { mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT };

/** Answer the pending rivalry card the way the board does (the binding falls back to Math.random). */
function tap(sport: 'mlb' | 'nhl', save: Save): { state: Save; lines: string[] } {
  const keep = Math.random;
  Math.random = keyedStream(`usRivalOldSavesB|tap|${sport}`);
  try { return SPORT[sport].dismissRivalryEvent(clone(save)); } finally { Math.random = keep; }
}
/** One season played through the binding, the way the board plays it. */
function playOn(sport: 'mlb' | 'nhl', save: Save, key: string): Save {
  const c = clone(save);
  const rng = keyedStream(`usRivalOldSavesB|season|${key}`);
  const keep = Math.random; Math.random = rng;
  try { SPORT[sport].campBattle(c, 80, rng); SPORT[sport].simSeason(c, 80, rng); } finally { Math.random = keep; }
  return c;
}

/** The shape the player's printer prints at a position (the parts, in order). */
const NEW_SHAPE: Record<string, RegExp> = {
  SP: /^\d+-\d+, \d+\.\d\d ERA, [\d,]+ K$/,
  RP: /^\d+ saves?, \d+ holds?, \d+\.\d\d ERA, [\d,]+ K$/,
  CF: /^\.\d{3}, \d+ HR, \d+ RBI$/,
  G: /^\d+ W, \.\d{3} SV%$/,
  C: /^\d+ G, \d+ A, \d+ P$/,
};

describe('Round 1313: an MLB or NHL save from before the round', () => {
  it('is stamped with the commit whose code built it', () => {
    expect(fixture.recordedFrom).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.keys(fixture.saves).sort()).toEqual(['mlbCF', 'mlbDropped', 'mlbMade', 'mlbRP', 'mlbRetired', 'mlbSP', 'nhlDropped', 'nhlG', 'nhlMade', 'nhlRetired']);
  });

  it.each([['mlb', 'mlbMade', 5], ['mlb', 'mlbDropped', -5], ['nhl', 'nhlMade', 5], ['nhl', 'nhlDropped', -5]] as const)('%s %s: the card the release before dealt pays what it printed', (sport, key, move) => {
    const save = saves[key];
    expect(save.pendingRivalryEvent).toMatchObject({ id: sport === 'mlb' ? 206 : 306, consequence: move > 0 ? 'Morale +5' : 'Morale -5' });
    expect(save.rival?.lastYear).toBeUndefined();
    const out = tap(sport, save);
    expect(out.state.morale).toBe(cap(save.morale + move));
    expect(out.state.fanbase).toBe(save.fanbase);
    expect(out.lines.some(l => l.includes(move > 0 ? 'You made the All-Star roster.' : 'You were left off the All-Star roster.'))).toBe(true);
    expect(out.state.pendingRivalryEvent).toBeFalsy();
  });

  it.each([['mlb', 'mlbSP'], ['mlb', 'mlbRP'], ['mlb', 'mlbCF'], ['nhl', 'nhlG']] as const)('%s %s: the old shape line stays until his next season, then is his position\'s own', (sport, key) => {
    const save = saves[key];
    const before = save.rival!;
    expect(before.retired).toBe(false);
    expect(before.lastLine).not.toMatch(NEW_SHAPE[save.pos]);
    expect(Math.abs(before.hisYears - before.myYears)).toBeGreaterThanOrEqual(3);
    const c = playOn(sport, save, key);
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

  it.each([['mlb', 'mlbRetired'], ['nhl', 'nhlRetired']] as const)('%s %s: a rival who retired before keeps his old line and his tally for good', (sport, key) => {
    const save = saves[key];
    const before = save.rival!;
    expect(before.retired).toBe(true);
    expect(before.lastLine).not.toMatch(NEW_SHAPE[save.pos] ?? /^$/);
    const c = playOn(sport, save, key);
    expect(c.rival!.lastLine).toBe(before.lastLine);
    expect(c.rival!.myYears).toBe(before.myYears);
    expect(c.rival!.hisYears).toBe(before.hisYears);
  });
});

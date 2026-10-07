/**
 * Round 1042: a past season's nationalities arrive with that season.
 *
 * The four past worlds' nationality maps left the engine chunk for a file each
 * (src/data/nationalities/eraNNNN.ts), fetched in the same promise as that
 * season's squads by ensureEraRosters. That makes one new way to be wrong: a
 * past world read before its map is here. nationalityOf answers null there, on
 * purpose (no flag, never the modern namesake's flag), and the gate registers
 * the map BEFORE it hands out the squads, so a call up bar can never be built
 * from squads with no countries and then kept (nationBars caches per world).
 *
 * This loads the engine in a fresh module instance (vi.resetModules), so no
 * era is loaded when it starts, exactly like a page load:
 *
 *   1. before any gate, a man only the 2005 world holds has no country and the
 *      2005 world has no call up bars;
 *   2. after ensureEraRosters('era2005') he has his country, the 2005 world has
 *      its bars (the empty answer was not cached), and a man only the 2010
 *      world holds still has none, because 2010 has not been asked for;
 *   3. a world with no file cannot be loaded or registered, and today's world
 *      keeps answering through all of it.
 *
 * The names are picked at run time from src/data/nationalities/allWorlds.ts (a
 * name in one world and in no other), never typed, so a rebake cannot leave
 * this test asking after a man who moved.
 *
 * Negative control, run 2026-10-07: with the registerNationalityWorld call cut
 * from ensureEraRosters (in a scratch copy of the file, restored byte for byte
 * afterwards) test 2 failed, the 2005 man still without a country after his
 * season had loaded. Tests 1 and 3 stayed green.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* Nothing here may reach the database. */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '',
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
/** A name one past world holds and no other world does, with its country. Read from a module
 *  instance of its own, so looking the names up registers nothing in the instance under test. */
async function loneNames(): Promise<Record<string, { name: string; nationality: string }>> {
  vi.resetModules();
  const { NATIONALITY_BY_WORLD } = await import('@/data/nationalities/allWorlds');
  const out: Record<string, { name: string; nationality: string }> = {};
  for (const world of ['era2005', 'era2010']) {
    const others = Object.keys(NATIONALITY_BY_WORLD).filter(w => w !== world);
    const name = Object.keys(NATIONALITY_BY_WORLD[world]).sort().find(n => others.every(w => !(n in NATIONALITY_BY_WORLD[w])));
    if (!name) throw new Error(`no name is in ${world} alone`);
    out[world] = { name, nationality: NATIONALITY_BY_WORLD[world][name] };
  }
  return out;
}

let lone: Record<string, { name: string; nationality: string }>;
let cm: any;
let eras: any;
let intl: any;
let nat: any;

beforeEach(async () => {
  lone = await loneNames();
  vi.resetModules();
  cm = await import('@/lib/clubManager');
  eras = await import('@/lib/clubManagerEras');
  intl = await import('@/lib/clubManagerInternationals');
  nat = await import('@/data/playerNationalities');
});

describe('Club Manager: a past season brings its own nationalities', () => {
  it('before its season is asked for, a past world answers nobody', () => {
    expect(cm.eraRostersLoaded('era2005')).toBe(false);
    expect(nat.nationalityOf('era2005', lone.era2005.name)).toBe(null);
    expect(intl.nationBars('era2005').size).toBe(0);
    /* today's world is here from the first line */
    expect(nat.nationalityOf(undefined, 'Erling Haaland')).toBe('Norway');
    expect(nat.nationalityOf('now', 'Erling Haaland')).toBe('Norway');
  });

  it('once the 2005 season has loaded its men have their countries, and 2010 still has none', async () => {
    expect(intl.nationBars('era2005').size).toBe(0);
    await cm.ensureEraRosters('era2005');
    expect(cm.eraRostersLoaded('era2005')).toBe(true);
    expect(nat.nationalityOf('era2005', lone.era2005.name)).toBe(lone.era2005.nationality);
    /* the empty answer from before the gate was not kept */
    const bars = intl.nationBars('era2005');
    expect(bars.size).toBeGreaterThan(0);
    expect(bars.has(lone.era2005.nationality)).toBe(true);
    /* 2010 has not been asked for: no country, and never the 2005 or the modern one */
    expect(cm.eraRostersLoaded('era2010')).toBe(false);
    expect(nat.nationalityOf('era2010', lone.era2010.name)).toBe(null);
    /* a sealed world answers only for its own men */
    expect(nat.nationalityOf('era2005', 'Erling Haaland')).toBe(null);
    console.log(`  2005: ${lone.era2005.name} is ${lone.era2005.nationality}, ${bars.size} call up bars; 2010: ${lone.era2010.name} waits`);
  }, 60000);

  it('a world with no file cannot be loaded or sealed, and an unknown id reads today', async () => {
    await expect(nat.loadNationalityWorld('era1990')).rejects.toThrow(/era1990/);
    expect(() => nat.registerNationalityWorld('now', {})).toThrow();
    expect(() => nat.registerNationalityWorld('era1990', {})).toThrow();
    expect(nat.nationalityOf('era1990', 'Erling Haaland')).toBe('Norway');
    /* every era the engine can open has a file to load, and nothing else does */
    expect(Object.keys(nat.NATIONALITY_WORLD_LOADERS).sort()).toEqual([...eras.historicEraIds()].sort());
  });
});

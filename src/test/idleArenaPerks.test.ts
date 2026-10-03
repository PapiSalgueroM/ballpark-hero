/**
 * Round 957: the Idle Arena trophy room, the pure rules. The balance (which
 * perk pays for which player) is scripts/simIdleArena.mjs section 6; this file
 * pins the bookkeeping: what a level costs, what it gives, and that a save
 * from before the round is untouched.
 */
import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, GENERATORS, HEAD_START_SQUAD, LONG_NIGHT_CAP_MS, NIGHT_SHIFT_RATE, OFFLINE_CAP_MS, OFFLINE_RATE,
  PERKS, PERK_MAX, SCOUTED_GENS, SCOUTING_GROWTH, TROPHY_BONUS, TROPHY_FLOOR, GROWTH,
  applyOffline, awayCapMs, awayRate, buyGen, buyPerk, genCost, globalMult, growthOf, lift, loadSave, newState,
  perkCost, perkEffect, perkLevel, serialize, tapValue, totalRate, trophiesSpent, type ArenaState,
} from '@/lib/idleArena';

const withTrophies = (n: number): ArenaState => ({ ...newState(0), trophies: n });

describe('idle arena trophy room', () => {
  it('a level costs its price in trophies and the +5% each goes with them', () => {
    let s = withTrophies(20);
    const before = globalMult(s);
    for (const p of PERKS) {
      s = withTrophies(20);
      for (let level = 1; level <= PERK_MAX; level++) {
        const price = perkCost(s, p.id);
        expect(price).toBe(p.cost[level - 1]);
        const next = buyPerk(s, p.id);
        expect(next.trophies).toBe(s.trophies - (price ?? 0));
        expect(perkLevel(next, p.id)).toBe(level);
        expect(trophiesSpent(next)).toBe(p.cost.slice(0, level).reduce((a, b) => a + b, 0));
        expect(globalMult(next)).toBeCloseTo(before - trophiesSpent(next) * TROPHY_BONUS, 10);
        s = next;
      }
      expect(perkCost(s, p.id)).toBeNull();
      expect(buyPerk(s, p.id)).toBe(s);
    }
  });

  it('refuses a level the cabinet cannot cover, and hands the same state back', () => {
    const s = withTrophies(2);
    for (const p of PERKS) expect(buyPerk(s, p.id)).toBe(s);
  });

  it('every level reaches the rule it names, one step at a time', () => {
    for (let level = 0; level <= PERK_MAX; level++) {
      const s = { ...newState(0), perks: { longNight: level, nightShift: level, headStart: level, scouting: level } };
      expect(awayCapMs(s)).toBe(LONG_NIGHT_CAP_MS[level]);
      expect(awayRate(s)).toBe(NIGHT_SHIFT_RATE[level]);
      expect(awayRate(s)).toBeLessThan(1);
      for (const g of GENERATORS) expect(growthOf(s, g.id)).toBe(SCOUTED_GENS.includes(g.id) ? SCOUTING_GROWTH[level] : GROWTH);
      const lifted = lift({ ...s, earned: TROPHY_FLOOR }, 5);
      for (const g of GENERATORS) expect(lifted.owned[g.id]).toBe(HEAD_START_SQUAD[level][g.id] ?? 0);
      if (level > 0) {
        expect(LONG_NIGHT_CAP_MS[level]).toBeGreaterThan(LONG_NIGHT_CAP_MS[level - 1]);
        expect(NIGHT_SHIFT_RATE[level]).toBeGreaterThan(NIGHT_SHIFT_RATE[level - 1]);
        expect(SCOUTING_GROWTH[level]).toBeLessThan(SCOUTING_GROWTH[level - 1]);
      }
    }
  });

  it('away time pays the perk cap and rate', () => {
    const s: ArenaState = { ...newState(0), perks: { longNight: 1, nightShift: 2 } };
    s.owned.striker = 10;
    const day = applyOffline(s, 24 * 3600 * 1000);
    expect(day.seconds).toBe(LONG_NIGHT_CAP_MS[1] / 1000);
    expect(day.earned).toBeCloseTo(totalRate(s) * (LONG_NIGHT_CAP_MS[1] / 1000) * NIGHT_SHIFT_RATE[2], 6);
  });

  it('scouting changes what a scouted signing costs, and buyGen charges that price', () => {
    const s: ArenaState = { ...newState(0), points: 1e12, perks: { scouting: 2 } };
    s.owned.champion = 10;
    const champ = GENERATORS.find(g => g.id === 'champion')!;
    const price = genCost(champ, 10, growthOf(s, 'champion'));
    expect(price).toBeLessThan(genCost(champ, 10));
    expect(buyGen(s, 'champion').points).toBe(s.points - price);
  });

  it('the card words carry the numbers the engine applies', () => {
    for (let level = 1; level <= PERK_MAX; level++) {
      expect(perkEffect('longNight', level)).toContain(`${LONG_NIGHT_CAP_MS[level] / 3600000} hours`);
      expect(perkEffect('nightShift', level)).toContain(`${Math.round(NIGHT_SHIFT_RATE[level] * 100)}% speed`);
      expect(perkEffect('scouting', level)).toContain(`${Math.round((SCOUTING_GROWTH[level] - 1) * 100)}% more`);
      for (const n of Object.values(HEAD_START_SQUAD[level])) expect(perkEffect('headStart', level)).toContain(`${n} `);
    }
    expect(perkEffect('longNight', 1)).toContain(`not ${OFFLINE_CAP_MS / 3600000}`);
    expect(perkEffect('nightShift', 1)).toContain(`not ${Math.round(OFFLINE_RATE * 100)}%`);
  });

  it('a save from before the round loads with no perks and the same rate and tap value', () => {
    const old = { ...newState(0), trophies: 12, ach: ACHIEVEMENTS.slice(0, 4).map(a => a.id), upgrades: ['sweetspot', 'crowd'] } as Partial<ArenaState>;
    old.owned = { ...newState(0).owned, striker: 7, guard: 3 };
    delete old.perks;
    const loaded = loadSave(JSON.stringify(old), 0)!;
    expect(loaded.perks).toEqual({});
    expect(totalRate(loaded)).toBe(totalRate({ ...(old as ArenaState), perks: {} }));
    expect(tapValue(loaded)).toBe(tapValue({ ...(old as ArenaState), perks: {} }));
    expect(loadSave(serialize(loaded), 0)).toEqual(loaded);
  });

  it('a corrupt perks block resets that block alone', () => {
    const raw = JSON.stringify({ ...newState(0), trophies: 9, points: 500, perks: { longNight: 99, nightShift: -2, headStart: 'lots', scouting: 1.7, hax: 3 } });
    const s = loadSave(raw, 0)!;
    expect(s.perks).toEqual({ longNight: PERK_MAX, scouting: 1 });
    expect(s.trophies).toBe(9);
    expect(s.points).toBe(500);
    for (const bad of ['"x"', '[1,2]', 'null', '7']) {
      const t = loadSave(`{"v":1,"trophies":4,"perks":${bad}}`, 0)!;
      expect(t.perks).toEqual({});
      expect(t.trophies).toBe(4);
    }
  });
});

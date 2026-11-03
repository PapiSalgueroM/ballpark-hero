import { afterEach, describe, expect, it, vi } from 'vitest';
import { WC2026_GROUPS } from '@/data/wc2026Results';
import { FORMATIONS } from '@/lib/squadShape';
import { countryQualifies, drawCountries, fitsSlot, respinSlotCountry, suggestCountryPlayers } from '@/lib/worldXi';
import type { WorldXiData, WxPlayer } from '@/lib/worldXi';
import type { Position } from '@/types/game';
import { selectWorldXiNationPool } from '@/lib/worldXiNationPools';

// Every player and club in this file is fictional.
function rows(country: string): WxPlayer[] {
  const positions: Position[] = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF', 'LWB', 'RWB'];
  return positions.map((position, index) => ({
    name: `Fictional ${country} Player ${index}`, country, position,
    club: 'Fictional Lantern Club', value: 1000 - index, age: 25,
  }));
}
function pool(entries: [string, WxPlayer[]][], countries?: string[]): WorldXiData {
  return { players: entries.flatMap(([, list]) => list), byCountry: new Map(entries), countries: countries ?? entries.map(([key]) => key) };
}
function fullPool(keys: string[]): WorldXiData {
  return pool(keys.map(key => [key, rows(key)]));
}
function randomTape(seed: number) {
  let state = seed;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
afterEach(() => vi.restoreAllMocks());

describe('World XI nation pools', () => {
  it('keeps Classic identity and the original draw RNG tape without drawing during selection', () => {
    const keys = Array.from({ length: 12 }, (_, i) => `Fictional Nation ${i}`);
    const data = fullPool(keys);
    data.countries.reverse();
    data.byCountry.set('USA', rows('USA'));
    const random = vi.spyOn(Math, 'random').mockImplementation(randomTape(71));
    const original = drawCountries(FORMATIONS[0], data);
    expect(original).not.toBeNull();
    const tape = random.mock.results.map(result => result.value);
    random.mockClear().mockImplementation(randomTape(71));
    const classic = selectWorldXiNationPool(data, 'classic');
    expect(classic).toBe(data);
    expect(classic.countries).toBe(data.countries);
    expect(classic.byCountry).toBe(data.byCountry);
    expect(classic.players).toBe(data.players);
    expect(random).not.toHaveBeenCalled();
    expect(drawCountries(FORMATIONS[0], classic)).toEqual(original);
    expect(random.mock.results.map(result => result.value)).toEqual(tape);
  });

  it('adds a one-keeper nation in Expanded and excludes empty buckets', () => {
    const entries: [string, WxPlayer[]][] = Array.from({ length: 12 }, (_, i) => {
      const key = `Fictional Outfield ${i}`;
      return [key, rows(key).filter(player => player.position !== 'GK')];
    });
    const keeper = rows('Fictional Keeper Isles')[0];
    const data = pool([...entries, ['Fictional Keeper Isles', [keeper]], ['Fictional Empty', []]], entries.map(([key]) => key));
    expect(countryQualifies([keeper])).toBe(false);
    expect(drawCountries(FORMATIONS[0], data)).toBeNull();
    const expanded = selectWorldXiNationPool(data, 'expanded');
    expect(expanded.countries).toHaveLength(13);
    expect(expanded.countries).toContain('Fictional Keeper Isles');
    expect(expanded.countries).not.toContain('Fictional Empty');
    const draw = drawCountries(FORMATIONS[0], expanded);
    expect(draw).not.toBeNull();
    expect(draw![0]).toBe('Fictional Keeper Isles');
  });

  it('derives the 2026 field from existing groups and returns the 48 canonical available keys', () => {
    const field = WC2026_GROUPS.flatMap(group => group.teams);
    expect(new Set(field).size).toBe(48);
    const data = fullPool([...field, 'North Korea', 'Congo', 'Fictional Atlantis']);
    const selected = selectWorldXiNationPool(data, '2026');
    const expected = [
      'Mexico', 'South Africa', 'Korea, South', 'Czech Republic', 'Switzerland', 'Canada', 'Bosnia-Herzegovina', 'Qatar',
      'Brazil', 'Morocco', 'Scotland', 'Haiti', 'United States', 'Australia', 'Paraguay', 'Türkiye',
      'Germany', "Cote d'Ivoire", 'Ecuador', 'Curaçao', 'Netherlands', 'Japan', 'Sweden', 'Tunisia',
      'Belgium', 'Egypt', 'Iran', 'New Zealand', 'Spain', 'Cape Verde', 'Uruguay', 'Saudi Arabia',
      'France', 'Norway', 'Senegal', 'Iraq', 'Argentina', 'Austria', 'Algeria', 'Jordan',
      'Colombia', 'Portugal', 'DR Congo', 'Uzbekistan', 'England', 'Croatia', 'Ghana', 'Panama',
    ];
    expect([...selected.countries].sort()).toEqual([...expected].sort());
    expect(selected.players).toBe(data.players);
  });

  it('merges only the five known aliases and keeps North Korea and Congo separate', () => {
    const keys = ['USA', 'United States', 'Turkey', 'Türkiye', 'Ivory Coast', "Cote d'Ivoire",
      'South Korea', 'Korea, South', 'Bosnia & Herzegovina', 'Bosnia-Herzegovina', 'North Korea', 'Congo', 'DR Congo'];
    const data = fullPool(keys);
    data.byCountry.set('France', []);
    const random = vi.spyOn(Math, 'random');
    const expanded = selectWorldXiNationPool(data, 'expanded');
    expect([...expanded.countries].sort()).toEqual([
      'United States', 'Türkiye', "Cote d'Ivoire", 'Korea, South', 'Bosnia-Herzegovina', 'North Korea', 'Congo', 'DR Congo',
    ].sort());
    expect(expanded.byCountry.get('North Korea')![0]).toBe(data.byCountry.get('North Korea')![0]);
    expect(expanded.byCountry.get('Congo')![0]).toBe(data.byCountry.get('Congo')![0]);
    expect([...selectWorldXiNationPool(data, '2026').countries].sort()).toEqual([
      'United States', 'Türkiye', "Cote d'Ivoire", 'Korea, South', 'Bosnia-Herzegovina', 'DR Congo',
    ].sort());
    expect(random).not.toHaveBeenCalled();
  });

  it('clones new-mode buckets without changing source rows and preserves namesakes and value ranking', () => {
    const low: WxPlayer = { name: 'Fictional Rowan', country: 'United States', position: 'CB', club: 'Fictional Elm Club', value: 20 };
    const middle: WxPlayer = { name: 'Fictional Rowan', country: 'USA', position: 'ST', club: 'Fictional Oak Club', value: 40, positionsPlayed: ['RW'] };
    const high: WxPlayer = { name: 'Fictional River', country: 'United States', position: 'GK', club: 'Fictional Ash Club', value: 60 };
    const data = pool([['USA', [middle]], ['United States', [high, low]], ['Japan', rows('Japan')]]);
    const before = JSON.stringify({ ...data, byCountry: [...data.byCountry] });
    for (const player of data.players) { if (player.positionsPlayed) Object.freeze(player.positionsPlayed); Object.freeze(player); }
    for (const list of data.byCountry.values()) Object.freeze(list);
    Object.freeze(data.players); Object.freeze(data.countries);
    for (const mode of ['expanded', '2026'] as const) {
      const selected = selectWorldXiNationPool(data, mode);
      expect(selected).not.toBe(data);
      expect(selected.byCountry).not.toBe(data.byCountry);
      expect(selected.countries).not.toBe(data.countries);
      expect(selected.players).toBe(data.players);
      expect(selected.byCountry.get('Japan')).not.toBe(data.byCountry.get('Japan'));
      const suggestions = suggestCountryPlayers(selected, 'United States', 'Fictional R');
      expect(suggestions).toEqual([high, middle, low]);
      suggestions.forEach((player, i) => expect(player).toBe([high, middle, low][i]));
      expect(suggestions.filter(player => player.name === 'Fictional Rowan').map(player => player.club)).toEqual(['Fictional Oak Club', 'Fictional Elm Club']);
      expect(JSON.stringify({ ...data, byCountry: [...data.byCountry] })).toBe(before);
    }
  });

  it('draws and respins distinct fitting nations across all nine actual formations in both new modes', () => {
    const data = fullPool(['Argentina', 'Belgium', 'Brazil', 'Colombia', 'Croatia', 'England', 'France', 'Germany',
      'Japan', 'Mexico', 'Morocco', 'Netherlands', 'Portugal', 'Spain', 'Uruguay', 'Canada']);
    vi.spyOn(Math, 'random').mockImplementation(randomTape(83));
    for (const mode of ['expanded', '2026'] as const) {
      const selected = selectWorldXiNationPool(data, mode);
      for (const formation of FORMATIONS) {
        const draw = drawCountries(formation, selected);
        expect(draw, formation.name).not.toBeNull();
        expect(draw).toHaveLength(11);
        expect(new Set(draw!).size).toBe(11);
        formation.slots.forEach((slot, index) => {
          expect(selected.byCountry.get(draw![index])!.some(player => fitsSlot(player, slot))).toBe(true);
          const before = [...draw!];
          const replacement = respinSlotCountry(formation, selected, index, draw!);
          expect(replacement).not.toBe(draw![index]);
          expect(selected.byCountry.get(replacement)!.some(player => fitsSlot(player, slot))).toBe(true);
          expect(new Set(draw!.map((country, i) => i === index ? replacement : country)).size).toBe(11);
          expect(draw).toEqual(before);
        });
      }
    }
  });

  it('retains exact secondary-position coverage without turning wing-backs or keepers into front-line wings', () => {
    const entries: [string, WxPlayer[]][] = Array.from({ length: 12 }, (_, i) => {
      const key = `Fictional Narrow ${i}`;
      const list = rows(key).filter(player => !['RW', 'LW', 'RM', 'LM'].includes(player.position));
      if (i < 2) list.push({ name: `Fictional History ${i}`, country: key, position: 'ST', club: 'Fictional Ink Club', value: 5, positionsPlayed: [i === 0 ? 'RW' : 'LW'] });
      return [key, list];
    });
    const selected = selectWorldXiNationPool(pool(entries), 'expanded');
    const formation = FORMATIONS[0];
    const draw = drawCountries(formation, selected);
    expect(draw).not.toBeNull();
    expect(draw![8]).toBe('Fictional Narrow 0');
    expect(draw![10]).toBe('Fictional Narrow 1');
    const list = selected.byCountry.get('Fictional Narrow 0')!;
    expect(list.find(player => player.name === 'Fictional History 0')).toBe(entries[0][1][entries[0][1].length - 1]);
    expect(fitsSlot(list.find(player => player.position === 'RWB')!, formation.slots[8])).toBe(false);
    expect(fitsSlot(list.find(player => player.position === 'GK')!, formation.slots[8])).toBe(false);
    expect(respinSlotCountry(formation, selected, 8, draw!)).toBe('Fictional Narrow 0');
  });

  it('refuses empty, under-eleven and uncovered pools without inventing a respin alternative', () => {
    const keys = Array.from({ length: 12 }, (_, i) => `Fictional Boundary ${i}`);
    const noKeeper = pool(keys.map(key => [key, rows(key).filter(player => player.position !== 'GK')]));
    for (const data of [fullPool([]), fullPool(keys.slice(0, 10)), noKeeper]) {
      const selected = selectWorldXiNationPool(data, 'expanded');
      for (const formation of FORMATIONS) expect(drawCountries(formation, selected)).toBeNull();
    }
    const exact = selectWorldXiNationPool(fullPool(keys.slice(0, 11)), 'expanded');
    const draw = drawCountries(FORMATIONS[0], exact)!;
    expect(draw).toHaveLength(11);
    const before = [...draw];
    expect(respinSlotCountry(FORMATIONS[0], exact, 0, draw)).toBe(draw[0]);
    expect(draw).toEqual(before);
  });
});


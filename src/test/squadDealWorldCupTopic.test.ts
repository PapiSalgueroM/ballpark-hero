import { describe, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { WC2026_GROUPS } from '@/data/wc2026Results';
import { GEO_COUNTRIES } from '@/data/worldMapGeo';
import { isWcNation } from '@/lib/dartMap';
import { filterByTopic, FORMATIONS, LEGENDS, topicCanFill, WC2026_NATIONS } from '@/lib/squadDeal';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const aliases = [
  'United States', 'Cabo Verde', 'Congo DR', 'Democratic Republic of Congo', 'IR Iran',
  'Korea, South', 'Korea Republic', "Cote d'Ivoire", "Côte d'Ivoire", 'Côte d’Ivoire',
  'Türkiye', 'Czechia', 'Curacao', 'Bosnia-Herzegovina', 'Bosnia and Herzegovina',
];
const formerQualifyingCandidates = [
  'Italy', 'Cameroon', 'Nigeria', 'Poland', 'Denmark', 'Wales',
  'Serbia', 'Ukraine', 'Greece', 'Costa Rica', 'Bolivia',
];

describe('the shared World Cup 2026 player topic', () => {
  it('accepts every tournament nation and its recognized spellings', () => {
    const officialTeams = WC2026_GROUPS.flatMap(group => group.teams);
    expect(new Set(officialTeams).size).toBe(48);
    expect(WC2026_NATIONS).toEqual(new Set([...officialTeams, ...aliases]));
  });

  it('keeps the countries that missed the tournament out of both eras', () => {
    expect(formerQualifyingCandidates.filter(name => WC2026_NATIONS.has(name))).toEqual([]);

    const legends = filterByTopic(LEGENDS, 'wc2026');
    expect(legends.find(p => p.name === 'Iker Casillas')).toBeDefined();
    expect(legends.filter(p => ['Gianluigi Buffon', 'Dino Zoff', 'Peter Schmeichel'].includes(p.name))).toEqual([]);

    const current = filterByTopic(players, 'wc2026');
    expect(current.find(p => p.name === 'Gianluigi Donnarumma')).toBeUndefined();
  });

  it('offers the eligible formations for each era and preserves the unrelated pools', () => {
    const wide = FORMATIONS.find(item => item.name === '4-3-3')!;
    const diamond = FORMATIONS.find(item => item.name === '4-1-2-1-2')!;
    expect(topicCanFill(LEGENDS, 'wc2026', wide.slots)).toBe(false);
    expect(topicCanFill(LEGENDS, 'wc2026', diamond.slots)).toBe(true);
    expect(topicCanFill(players, 'wc2026', wide.slots)).toBe(true);
    expect(filterByTopic(LEGENDS, 'all')).toBe(LEGENDS);
    expect(filterByTopic(LEGENDS, 'seriea').find(p => p.name === 'Gianluigi Buffon')).toBeDefined();
    expect(filterByTopic(players, 'premier').find(p => p.name === 'Gianluigi Donnarumma')).toBeDefined();
  });

  it('agrees with the Dart Draft map across its alias boundaries', () => {
    const country = (iso: string) => GEO_COUNTRIES.find(item => item.iso === iso)!;
    for (const iso of ['us', 'cz', 'tr', 'ba', 'kr', 'ci', 'cd']) {
      expect(isWcNation(country(iso)), iso).toBe(true);
    }
    for (const iso of ['it', 'dk', 'pl', 'ng', 'cm', 'ua', 'rs', 'gr', 'cr', 'bo']) {
      expect(isWcNation(country(iso)), iso).toBe(false);
    }
  });
});

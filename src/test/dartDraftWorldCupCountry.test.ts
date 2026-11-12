import { beforeEach, expect, it, vi } from 'vitest';
import { GEO_COUNTRIES } from '@/data/worldMapGeo';

const fixture = vi.hoisted(() => ({
  countryRows: [] as unknown[],
  positionRows: [] as unknown[],
  reads: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      let positionQuery = false;
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: (column: string) => {
          if (column === 'position') positionQuery = true;
          return chain;
        },
        order: () => chain,
        range: async () => {
          fixture.reads.push(positionQuery ? 'position' : 'country');
          return { data: positionQuery ? fixture.positionRows : fixture.countryRows, error: null };
        },
      };
      return chain;
    },
  },
}));

const gb = GEO_COUNTRIES.find(country => country.iso === 'gb')!;
const england = {
  player_name: 'Trent Alexander-Arnold', position: 'Right-Back', nationality: 'England',
  club: 'Real Madrid', age: 27, market_value_usd: 70_000_000, goals: 0, assists: 4,
};
const northernIreland = {
  player_name: 'Conor Bradley', position: 'Right-Back', nationality: 'Northern Ireland',
  club: 'Liverpool FC', age: 22, market_value_usd: 32_000_000, goals: 0, assists: 1,
};

beforeEach(() => {
  vi.resetModules();
  fixture.countryRows = [];
  fixture.positionRows = [];
  fixture.reads = [];
});

async function setup() {
  const { countryChoices, DART_SLOTS } = await import('@/lib/dartMap');
  const slot = DART_SLOTS.find(candidate => candidate.label === 'RB')!;
  return { countryChoices, slot };
}

it('limits a shared map region to qualified nations in World Cup mode and keeps the Current cache', async () => {
  fixture.countryRows = [england, northernIreland];
  const { countryChoices, slot } = await setup();

  const worldCup = await countryChoices(gb, slot, new Set(), { wc2026: true });
  const current = await countryChoices(gb, slot, new Set());

  expect(worldCup.map(choice => choice.player.name)).toEqual([england.player_name]);
  expect(current.map(choice => choice.player.name)).toEqual([england.player_name, northernIreland.player_name]);
  expect(fixture.reads).toEqual(['country']);
});

it('runs the targeted search when the regular response contains only ineligible right-backs', async () => {
  fixture.countryRows = [northernIreland];
  fixture.positionRows = [england, northernIreland];
  const { countryChoices, slot } = await setup();

  const result = await countryChoices(gb, slot, new Set(), { wc2026: true });

  expect(result.map(choice => choice.player.name)).toEqual([england.player_name]);
  expect(fixture.reads).toEqual(['country', 'position']);
});

it('offers the existing academy option when both responses contain only nonqualifiers', async () => {
  fixture.countryRows = [northernIreland];
  fixture.positionRows = [northernIreland];
  const { countryChoices, slot } = await setup();

  const result = await countryChoices(gb, slot, new Set(), { wc2026: true });

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    player: { nationality: 'England', position: 'RB', fixedOverall: 40 },
    outOfPosition: false,
  });
  expect(fixture.reads).toEqual(['country', 'position']);
});

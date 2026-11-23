import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSquad, NHL_SLOTS, type TeamEraIndexEntry } from '@/lib/perfectSeasonNhl';
import { squadFillsAny } from '@/lib/perfectSeason';

const H = vi.hoisted(() => ({
  skaters: [] as Record<string, unknown>[],
  draft: [] as Record<string, unknown>[],
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    supabase: createClient('https://fixture.invalid', 'fixture', { global: {
      fetch: async (request) => {
        const url = new URL(String(request));
        let data: Record<string, unknown>[];
        if (url.pathname.endsWith('/nhl_player_stats')) {
          const position = url.searchParams.get('position');
          if (position !== 'eq.D' && position !== 'in.(C,LW,RW,F,W)') throw new Error('Unexpected position query');
          data = H.skaters.filter(row => (row.position === 'D') === (position === 'eq.D'));
        } else if (url.pathname.endsWith('/nhl_draft')) {
          data = H.draft;
        } else {
          throw new Error('Unexpected archive query');
        }
        return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
      },
    } }),
  };
});

const ANAHEIM: TeamEraIndexEntry = {
  abbr: 'ANA', teamName: 'Anaheim Ducks', draftMatch: 'Ducks',
  eraStart: 1990, eraEnd: 1999, eraLabel: '1990s',
};

// Ranked Anaheim responses captured before the fix. The three short start seasons
// are kept as they arrived so the real reader has to reject them.
const skaters = [
  ["Teemu Selänne",1451,684,773,1457,95,"RW","1992-93","2013-14"],
  ["Doug Weight",1238,278,755,1033,-58,"C","1991-92","2010-11"],
  ["Saku Koivu",1124,255,577,832,10,"C","1995-96","2013-14"],
  ["Todd Bertuzzi",1159,314,456,770,-44,"LW","1995-96","2013-14"],
  ["Brendan Morrison",934,200,401,601,86,"C","1997-98","2011-12"],
  ["Radek Dvořák",1260,227,363,590,-10,"RW","1995-96","2013-14"],
  ["Todd Marchant",1195,186,312,498,-20,"C","1993-94","2010-11"],
  ["Jason Blake",871,213,273,486,-23,"LW","1998-99","2011-12"],
  ["Rob Niedermayer",1153,186,283,469,-123,"C","1993-94","2010-11"],
  ["Travis Green",970,193,262,455,-55,"C","1992-93","2006-07"],
  ["Brad May",1041,127,161,288,-21,"LW","1991-92","2009-10"],
  ["Ken Klee",934,55,140,195,30,"RW","1994-95","2008-09"],
  ["Josh Green",341,36,40,76,-16,"LW","1998-99","2011-12"],
  ["Mark Mowers",278,18,44,62,0,"RW","1998-99","2007-08"],
  ["Giovanni Fiore",21,1,0,0,0,"LW","1","2017-18"],
  ["Jacob Perreault",19,1,0,0,0,"RW","1","2021-22"],
  ["Mathieu Schneider",1289,223,520,743,66,"D","1987-88","2009-10"],
  ["Scott Niedermayer",1263,172,568,740,167,"D","1991-92","2009-10"],
  ["Chris Pronger",1167,157,541,698,183,"D","1993-94","2011-12"],
  ["Sheldon Souray",758,109,191,300,-22,"D","1997-98","2012-13"],
  ["Bret Hedican",1039,55,239,294,-23,"D","1991-92","2008-09"],
  ["Eric Brewer",1009,77,194,271,-99,"D","1998-99","2014-15"],
  ["Paul Mara",734,64,189,253,-110,"D","1998-99","2010-11"],
  ["Sean O'Donnell",1224,31,198,229,87,"D","1994-95","2011-12"],
  ["Aaron Ward",839,44,107,151,-41,"D","1993-94","2009-10"],
  ["Andy Sutton",676,38,112,150,-20,"D","1998-99","2011-12"],
  ["Ian Moran",489,21,50,71,-43,"D","1995-96","2006-07"],
  ["Jesse Blacker",23,1,0,0,0,"D","1","2014-15"],
] as const;

// The draft query returned 116 rows, including these 14 goalie rows. The others
// have position suffixes the goalkeeping reader discards.
const goalies = [
  ["Joel Gagnon (G)",4,82,1993,"Mighty Ducks of Anaheim","Canada"],
  ["Joel Gagnon (G)",4,82,1993,"Mighty Ducks of Anaheim","Canada"],
  ["Mikhail Shtalenkov (G)",6,108,1993,"Mighty Ducks of Anaheim","Russia"],
  ["Mikhail Shtalenkov (G)",6,108,1993,"Mighty Ducks of Anaheim","Russia"],
  ["Luc Vaillancourt (G)",6,125,1997,"Mighty Ducks of Anaheim","Canada"],
  ["Luc Vaillancourt (G)",6,125,1997,"Mighty Ducks of Anaheim","Canada"],
  ["Blaine Russell (G)",8,149,1996,"Mighty Ducks of Anaheim (from St. Louis) 6","Canada"],
  ["Blaine Russell (G)",8,149,1996,"Mighty Ducks of Anaheim (from St. Louis) 6","Canada"],
  ["Igor Karpenko (G)",9,185,1995,"Mighty Ducks of Anaheim","UKR"],
  ["Igor Karpenko (G)",9,185,1995,"Mighty Ducks of Anaheim","UKR"],
  ["Tom Askey (G)",9,186,1993,"Mighty Ducks of Anaheim","United States"],
  ["Tom Askey (G)",9,186,1993,"Mighty Ducks of Anaheim","United States"],
  ["Andreas Andersson (G)",12,245,1998,"Mighty Ducks of Anaheim (compensatory) 5","Sweden"],
  ["Andreas Andersson (G)",12,245,1998,"Mighty Ducks of Anaheim (compensatory) 5","Sweden"],
] as const;

const validOrder = [
  "Teemu Selänne",
  "Doug Weight",
  "Chris Pronger",
  "Scott Niedermayer",
  "Mathieu Schneider",
  "Saku Koivu",
  "Todd Bertuzzi",
  "Brendan Morrison",
  "Joel Gagnon",
  "Jason Blake",
  "Sheldon Souray",
  "Mikhail Shtalenkov",
  "Paul Mara",
  "Luc Vaillancourt",
  "Radek Dvořák",
  "Travis Green",
  "Blaine Russell",
  "Bret Hedican",
  "Igor Karpenko",
  "Tom Askey",
  "Todd Marchant",
  "Eric Brewer",
  "Rob Niedermayer",
  "Andy Sutton",
  "Sean O'Donnell",
  "Aaron Ward",
  "Ian Moran",
  "Brad May",
  "Josh Green",
  "Mark Mowers",
  "Ken Klee",
];

const skater = ([player_name, games, goals, assists, points, plus_minus, position, year_from, year_to]: readonly [string, number, number, number, number, number, string, string, string]) =>
  ({ player_name, games, goals, assists, points, plus_minus, position, year_from, year_to });

beforeEach(() => {
  H.skaters = skaters.map(skater);
  H.draft = goalies.map(([player, round, pick, year, nationality, team]) => ({ player, round, pick, year, nationality, team }));
});

describe('Perfect Season NHL draft career spans', () => {
  it('keeps the Anaheim 1990s offers in their original order after removing three malformed skaters', async () => {
    const squad = await fetchSquad(ANAHEIM);
    expect(squad?.teamName).toBe('Anaheim Ducks (1990s)');
    expect(squad?.players.map(p => p.name)).toEqual(validOrder);
    const lineup = NHL_SLOTS.map(slot => slot.key);
    expect(squadFillsAny(squad!, lineup, new Set())).toBe(true);
    expect(squadFillsAny(squad!, lineup, new Set(validOrder))).toBe(false);
  });

  it('accepts real-shaped spans but rejects a backwards career inside a modern decade', async () => {
    H.skaters = [
      ...Array.from({ length: 8 }, (_, i) => skater([`Fixture modern ${i}`, 15, 1, 1, 2, 0, 'C', '2021-22', '2021-22'])),
      skater(['Fixture plain years', 20, 3, 2, 5, 0, 'LW', '2020', '2024']),
      skater(['Fixture long career', 700, 100, 100, 200, 0, 'D', '1997-98', '2022-23']),
      skater(['Fixture backwards', 30, 5, 5, 10, 0, 'D', '2028-29', '2021-22']),
      skater(['Fixture short start', 30, 5, 5, 10, 0, 'RW', '2', '2022-23']),
    ];
    H.draft = [];
    const squad = await fetchSquad({ ...ANAHEIM, eraStart: 2020, eraEnd: 2029, eraLabel: '2020s' });
    expect(squad?.players.map(p => p.name)).toEqual([
      'Fixture long career', 'Fixture plain years', ...Array.from({ length: 8 }, (_, i) => `Fixture modern ${i}`),
    ]);
  });
});

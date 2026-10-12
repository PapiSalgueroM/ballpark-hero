
// Review probe (facts-fences, Release BA). Appended on the runner to the first 243 lines of
// src/test/playerBingoHonours.test.ts (its supabase mock, fillers and load helper), never committed.
// The rows MODEL what supabase/migrations/20260905_round_450_transfer_windows_2026_summer.sql line 174
// did to the live table: Ferran Torres's year 2026 row was rewritten to Paris Saint-Germain (a move of
// 15 August 2026), while his earlier rows stay at his old clubs. Values are the 2026 snapshot's
// (scripts/data/auctionMarketRows.json line 100). Nothing here is a claim about real statistics.
const ftBase: Row = {
  id: 990001, player_name: 'Ferran Torres', person_key: null, nationality: 'Spain', position: 'Centre-Forward',
  club: 'Paris Saint-Germain', age: 25, year: 2026, market_value_usd: 54_000_000,
  goals: null, assists: null, matches: null, yellow_cards: null, red_cards: null,
};
const ftHistory: Row[] = [
  ftBase,
  { ...ftBase, id: 990002, club: 'FC Barcelona', age: 24, year: 2025 },
  { ...ftBase, id: 990003, club: 'FC Barcelona', age: 23, year: 2024 },
  { ...ftBase, id: 990004, club: 'FC Barcelona', age: 22, year: 2023 },
  { ...ftBase, id: 990005, club: 'FC Barcelona', age: 21, year: 2022 },
  { ...ftBase, id: 990006, club: 'Manchester City', age: 20, year: 2021 },
];

describe('REVIEW PROBE: a summer 2026 PSG arrival and the 2026 title pair', () => {
  it('reports whether the Champions League winner tile accepts the arrival', async () => {
    fixture.latest = [ftBase, ...fillers];
    fixture.history = [...ftHistory, ...fillers];
    const data = (await fetchBingoData())!;
    const player = data.pool.find(row => row.name === 'Ferran Torres')!;
    expect(player.club).toBe('Paris Saint-Germain');
    const accepted = ucl(data).test(player, data);
    const withoutTheMove = { ...data, clubYears: new Map(data.clubYears).set('Ferran Torres',
      (data.clubYears.get('Ferran Torres') ?? []).filter(row => row.year !== 2026)) };
    const acceptedWithoutTheMove = ucl(withoutTheMove).test(player, withoutTheMove);
    console.log(`PROBE ferran clubYears=${JSON.stringify(data.clubYears.get('Ferran Torres'))}`);
    console.log(`PROBE ferran uclAccepted=${accepted} withoutThe2026Row=${acceptedWithoutTheMove}`);
    expect(acceptedWithoutTheMove).toBe(false);
  });
});

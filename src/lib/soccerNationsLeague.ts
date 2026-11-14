// The 2026/27 draw is cross-checked against the published competition tables.
// https://www.uefa.com/uefanationsleague/news/02a2-1fe8e0405d9d-cc8f1ee7068b-1000--draw-for-the-league-phase-of-the-2026-27-uefa-nations-league/
// https://www.skysports.com/football/competitions/uefa-nations-league/table
// Country labels match the existing Soccer Career nationality keys.
export const NATIONS_LEAGUE_2026_GROUPS = {
  A1: ['France', 'Italy', 'Belgium', 'Turkey'],
  A2: ['Germany', 'Netherlands', 'Serbia', 'Greece'],
  A3: ['Spain', 'Croatia', 'England', 'Czech Republic'],
  A4: ['Portugal', 'Denmark', 'Norway', 'Wales'],
  B1: ['Scotland', 'Switzerland', 'Slovenia', 'North Macedonia'],
  B2: ['Hungary', 'Ukraine', 'Georgia', 'Northern Ireland'],
  B3: ['Israel', 'Austria', 'Ireland', 'Kosovo'],
  B4: ['Poland', 'Bosnia & Herzegovina', 'Romania', 'Sweden'],
  C1: ['Albania', 'Finland', 'Belarus', 'San Marino'],
  C2: ['Montenegro', 'Armenia', 'Cyprus', 'Latvia'],
  C3: ['Kazakhstan', 'Slovakia', 'Faroe Islands', 'Moldova'],
  C4: ['Iceland', 'Bulgaria', 'Estonia', 'Luxembourg'],
  D1: ['Gibraltar', 'Malta', 'Andorra'],
  D2: ['Lithuania', 'Azerbaijan', 'Liechtenstein'],
} as const;

type Group = keyof typeof NATIONS_LEAGUE_2026_GROUPS;
type League = 'A' | 'B' | 'C' | 'D';
type RankedLeagues = Record<League, readonly string[]>;
type PlayOff = { home: string; away: string; winner: string };

/** Complete pairing set for the simulation. The group draw gives the venues; the simulated season assigns dates. */
export function nationsLeague2026Fixtures() {
  const fixtures: { group: Group; home: string; away: string }[] = [];
  for (const group of Object.keys(NATIONS_LEAGUE_2026_GROUPS) as Group[]) {
    const nations: readonly string[] = NATIONS_LEAGUE_2026_GROUPS[group];
    for (const home of nations) {
      for (const away of nations) {
        if (home !== away) fixtures.push({ group, home, away });
      }
    }
  }
  return fixtures;
}

/** Article 19 of the September 2026 regulations governs the move from four to three leagues.
 *  https://documents.uefa.com/r/Regulations-of-the-UEFA-Nations-League-2026/27/Article-19-Individual-league-interim-overall-and-final-overall-rankings-Online
 *  https://www.figc.it/en/figc/news/nations-league-2026-27-set-for-changes-the-two-best-third-placed-teams-remain-in-league-a-with-only-the-two-worst-fourth-placed-sides-relegated-automatically-nd7l449n
 */
export function nationsLeague2026NextLeagues({ A, B, C, D }: RankedLeagues, ab: readonly PlayOff[], bc: readonly PlayOff[]) {
  const resolve = (higher: readonly string[], lower: readonly string[], ties: readonly PlayOff[]) => {
    if (ties.length !== higher.length || higher.length !== lower.length) return null;
    const seen = new Set<string>();
    for (const { home, away, winner } of ties) {
      const pairingFits = higher.includes(home) && lower.includes(away) || higher.includes(away) && lower.includes(home);
      if (!pairingFits || seen.has(home) || seen.has(away) || (winner !== home && winner !== away)) return null;
      seen.add(home);
      seen.add(away);
    }
    return {
      winners: ties.map(tie => tie.winner),
      losers: ties.map(tie => tie.winner === tie.home ? tie.away : tie.home),
    };
  };
  const rankings = { A, B, C, D };
  for (const league of ['A', 'B', 'C', 'D'] as const) {
    const teams: readonly string[] = Object.entries(NATIONS_LEAGUE_2026_GROUPS)
      .filter(([group]) => group.startsWith(league)).flatMap(([, group]) => [...group]);
    const ranking = rankings[league];
    if (ranking.length !== teams.length || new Set(ranking).size !== teams.length
      || ranking.some(nation => !teams.includes(nation))) return null;
  }
  const abResult = resolve(A.slice(10, 14), B.slice(4, 8), ab);
  const bcResult = resolve(B.slice(12), C.slice(4, 8), bc);
  if (!abResult || !bcResult) return null;
  return {
    A: [...A.slice(0, 10), ...B.slice(0, 4), ...abResult.winners],
    B: [...A.slice(14), ...abResult.losers, ...B.slice(8, 12), ...C.slice(0, 4), ...bcResult.winners],
    C: [...bcResult.losers, ...C.slice(8), ...D],
  };
}

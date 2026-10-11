/** Opponent display names only. These memberships do not add clubs to the career pool,
 *  verify a table, or describe the replay's fixture order or results.
 *  Sources for the 2025/26 member set:
 *  https://www.proleague.be/jupiler-pro-league-20252026-kalender
 *  https://football-data.co.uk/mmz4281/2526/B1.csv
 *  Retained source SHA256: 9a78027416cf2489d5c8f6d52fe27b911146e9aa50dd6fd589885eaf29805e85
 *  and 7ba1d75b2f23ab6bf36952fa61b62e80905e2d38fa059ad389106772aebaf481. */
export const BELGIAN_2025_MEMBERS: readonly { name: string; aliases: readonly string[] }[] = [
  { name: 'Anderlecht', aliases: ['RSC Anderlecht'] },
  { name: 'Antwerp', aliases: ['Royal Antwerp FC'] },
  { name: 'Cercle Brugge', aliases: [] },
  { name: 'Charleroi', aliases: ['Sporting Charleroi'] },
  { name: 'Club Brugge', aliases: [] },
  { name: 'Dender', aliases: ['FCV Dender EH'] },
  { name: 'Genk', aliases: ['KRC Genk'] },
  { name: 'Gent', aliases: ['KAA Gent'] },
  { name: 'La Louviere', aliases: ['RAAL La Louvière', 'RAAL La Louviere'] },
  { name: 'Mechelen', aliases: ['KV Mechelen'] },
  { name: 'OH Leuven', aliases: ['Oud-Heverlee Leuven'] },
  { name: 'Sint-Truiden', aliases: ['STVV', 'St Truiden'] },
  { name: 'Standard Liege', aliases: ['Standard de Liège', 'Standard'] },
  { name: 'Union Saint-Gilloise', aliases: ['Royale Union Saint-Gilloise', 'St. Gilloise'] },
  { name: 'Westerlo', aliases: ['KVC Westerlo'] },
  { name: 'Zulte Waregem', aliases: ['SV Zulte Waregem', 'Waregem'] },
];

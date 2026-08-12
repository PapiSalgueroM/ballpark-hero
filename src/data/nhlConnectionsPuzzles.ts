export interface NhlConnectionGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export interface NhlConnectionsPuzzle {
  id: string;
  groups: NhlConnectionGroup[];
}

/**
 * NHL Connections puzzles (task #26, Connections port to NHL).
 *
 * EVERY fact verified against nhl_player_stats (Supabase) on 2026-07-22 -
 * teams codes, points, goals, assists, games all from that one table (the
 * same source hockeyGrid validated as clean). Goalies are absent from the
 * table, so no goalie groups. Tiles use the table's diacritic name forms
 * (Pastrňák, Chára, Selänne, Anže Kopitar, Marián Hossa, Lidström).
 *
 * AUTHORING RULE: within a puzzle no player may satisfy another group's
 * criterion. NHL-specific traps found while authoring, preserved for future
 * puzzles:
 *   - Jaromír Jágr (9 franchises) and Corey Perry (8) conflict with almost
 *     any franchise group, neither is used anywhere.
 *   - Penguins/Oilers legends break every stat group (Crosby/Lemieux have
 *     600+ goals and 1,000+ assists; every 1,500-game player also has
 *     1,000+ points), so nhlconn-001 is all-franchise and the only stat
 *     groups used are "1,000+ points" beside low-scoring franchise groups.
 *   - Kessel (PIT+TOR+VEG+BOS), Duncan Keith (CHI+EDM), Kurri (EDM+LAK),
 *     Hakeem-style multi-team guys placed only where their extra teams
 *     have no group.
 *   - Doug Gilmour (1,414 points, 7 teams) forced Cole Caufield into the
 *     Canadiens group.
 * Margins on stat groups: nearest non-member is Brent Burns at 944 points
 * (in the same puzzle's Sharks group, 56 under the 1,000 bar, he retired
 * after 2025? NO: verify Burns before refreshing nhl_player_stats; if his
 * career total crosses 1,000 the nhlconn-004 partition breaks.)
 */
export const nhlConnectionsPuzzles: NhlConnectionsPuzzle[] = [
  {
    id: 'nhlconn-001',
    groups: [
      { theme: 'Played for the Penguins', players: ['Sidney Crosby', 'Mario Lemieux', 'Evgeni Malkin', 'Kris Letang', 'Jake Guentzel'], difficulty: 'yellow' },
      { theme: 'Played for the Maple Leafs', players: ['Mats Sundin', 'Auston Matthews', 'Mitch Marner', 'John Tavares', 'Doug Gilmour'], difficulty: 'green' },
      { theme: 'Played for the Avalanche', players: ['Joe Sakic', 'Peter Forsberg', 'Nathan MacKinnon', 'Cale Makar', 'Gabriel Landeskog'], difficulty: 'blue' },
      { theme: 'Played for the Red Wings', players: ['Nicklas Lidström', 'Pavel Datsyuk', 'Henrik Zetterberg', 'Sergei Fedorov', 'Dylan Larkin'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nhlconn-002',
    groups: [
      { theme: 'Played for the Blackhawks', players: ['Patrick Kane', 'Jonathan Toews', 'Marián Hossa', 'Patrick Sharp', 'Duncan Keith'], difficulty: 'yellow' },
      { theme: 'Played for the Kings', players: ['Anže Kopitar', 'Drew Doughty', 'Dustin Brown', 'Luc Robitaille', 'Marcel Dionne'], difficulty: 'green' },
      { theme: 'Played for the Lightning', players: ['Steven Stamkos', 'Nikita Kucherov', 'Victor Hedman', 'Brayden Point', 'Martin St. Louis'], difficulty: 'blue' },
      { theme: 'Played for the Ducks', players: ['Teemu Selänne', 'Ryan Getzlaf', 'Paul Kariya', 'Cam Fowler', 'Rickard Rakell'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nhlconn-003',
    groups: [
      { theme: 'Played for the Bruins', players: ['Patrice Bergeron', 'Brad Marchand', 'David Pastrňák', 'Zdeno Chára', 'Ray Bourque'], difficulty: 'yellow' },
      { theme: 'Played for the Oilers', players: ['Connor McDavid', 'Leon Draisaitl', 'Ryan Nugent-Hopkins', 'Zach Hyman', 'Evander Kane'], difficulty: 'green' },
      { theme: 'Played for the Golden Knights', players: ['Mark Stone', 'Jack Eichel', 'William Karlsson', 'Alex Pietrangelo', 'Jonathan Marchessault'], difficulty: 'blue' },
      { theme: 'Played for the Hurricanes', players: ['Sebastian Aho', 'Andrei Svechnikov', 'Jaccob Slavin', 'Jordan Staal', 'Brent Burns'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nhlconn-004',
    groups: [
      { theme: 'Played for the Canadiens', players: ['P.K. Subban', 'Shea Weber', 'Brendan Gallagher', 'Nick Suzuki', 'Cole Caufield'], difficulty: 'yellow' },
      { theme: 'Played for the Panthers', players: ['Matthew Tkachuk', 'Aleksander Barkov', 'Sam Reinhart', 'Carter Verhaeghe', 'Aaron Ekblad'], difficulty: 'green' },
      { theme: 'Played for the Sharks', players: ['Brent Burns', 'Erik Karlsson', 'Evander Kane', 'Logan Couture', 'Tomáš Hertl'], difficulty: 'blue' },
      { theme: '1,000+ career points', players: ['Connor McDavid', 'Leon Draisaitl', 'Nikita Kucherov', 'Nathan MacKinnon', 'Steven Stamkos'], difficulty: 'purple' },
    ],
  },
];

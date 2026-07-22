export interface NbaConnectionGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export interface NbaConnectionsPuzzle {
  id: string;
  groups: NbaConnectionGroup[];
}

/**
 * NBA Connections puzzles (task #26 — Connections port to NBA).
 *
 * EVERY fact below was verified against Supabase on 2026-07-21:
 *   - points / assists / rebounds / threes / teams: nba_player_stats
 *   - countries + draft slots: nba_players_extended_v2
 *   - #1-overall confirmations (incl. Yao 2002): nba_draft_picks
 *
 * AUTHORING RULE (the thing that makes a Connections puzzle valid): within
 * a puzzle, NO player may satisfy another group's criterion — the partition
 * must be unique. Traps found and dodged during authoring, kept here so
 * future puzzles repeat the checks:
 *   - Rondo/Doug Christie/Vlade all played LAL -> out of Celtics/Kings groups
 *   - Baron Davis played NYK -> out of the Warriors group
 *   - Kevin Durant is a #2 overall pick -> can't share a puzzle with the
 *     "#2 overall" group; same for Hakeem/Ibaka/Siakam vs any Raptors group
 *   - Manute Bol's country is "USA" in the DB -> not usable for Born in
 *     Africa; Siakam (Cameroon, verified) replaces him
 *   - LeBron/Kareem/Shaq are all #1 picks -> excluded from the 28k-points
 *     group in the puzzle that has "Drafted #1 overall" (that's the fun)
 * Cross-PUZZLE reuse (Curry in 002 and 003) is fine — the baseball file
 * established that precedent; only within-puzzle uniqueness matters.
 */
export const nbaConnectionsPuzzles: NbaConnectionsPuzzle[] = [
  {
    id: 'nbaconn-001',
    groups: [
      { theme: '28,000+ career points', players: ['Karl Malone', 'Kobe Bryant', 'Michael Jordan', 'Dirk Nowitzki', 'Carmelo Anthony'], difficulty: 'yellow' },
      { theme: 'Played for the Miami Heat', players: ['Dwyane Wade', 'Alonzo Mourning', 'Chris Bosh', 'Udonis Haslem', 'Tim Hardaway'], difficulty: 'green' },
      { theme: '10,000+ career assists', players: ['John Stockton', 'Jason Kidd', 'Steve Nash', 'Mark Jackson', 'Chris Paul'], difficulty: 'blue' },
      { theme: 'Drafted #1 overall', players: ['Allen Iverson', 'Yao Ming', 'Dwight Howard', 'John Wall', 'Zion Williamson'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nbaconn-002',
    groups: [
      { theme: 'Played for the Chicago Bulls', players: ['Derrick Rose', 'Joakim Noah', 'Jimmy Butler', 'Luol Deng', 'Scottie Pippen'], difficulty: 'yellow' },
      { theme: '2,000+ career three-pointers', players: ['Stephen Curry', 'Ray Allen', 'Reggie Miller', 'James Harden', 'Klay Thompson'], difficulty: 'green' },
      { theme: 'Born in France', players: ['Tony Parker', 'Rudy Gobert', 'Nicolas Batum', 'Boris Diaw', 'Evan Fournier'], difficulty: 'blue' },
      { theme: '14,000+ career rebounds', players: ['Kareem Abdul-Jabbar', 'Elvin Hayes', 'Moses Malone', 'Tim Duncan', 'Kevin Garnett'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nbaconn-003',
    groups: [
      { theme: 'Played for the Golden State Warriors', players: ['Stephen Curry', 'Draymond Green', 'Chris Mullin', 'Andre Iguodala', 'Monta Ellis'], difficulty: 'yellow' },
      { theme: 'Played for the New York Knicks', players: ['Patrick Ewing', 'Allan Houston', "Amar'e Stoudemire", 'Julius Randle', 'Derek Harper'], difficulty: 'green' },
      { theme: 'Born in Canada', players: ['Jamal Murray', 'Shai Gilgeous-Alexander', 'Tristan Thompson', 'Dillon Brooks', 'Bennedict Mathurin'], difficulty: 'blue' },
      { theme: 'Drafted #2 overall', players: ['Ja Morant', 'Brandon Ingram', 'Victor Oladipo', 'Jalen Green', 'Marvin Bagley III'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nbaconn-004',
    groups: [
      { theme: 'Played for the Boston Celtics', players: ['Larry Bird', 'Kevin McHale', 'Paul Pierce', 'Jayson Tatum', 'Jaylen Brown'], difficulty: 'yellow' },
      { theme: 'Played for the Los Angeles Lakers', players: ['James Worthy', 'Pau Gasol', 'Anthony Davis', 'Byron Scott', 'Lamar Odom'], difficulty: 'green' },
      { theme: 'Born in Africa', players: ['Joel Embiid', 'Hakeem Olajuwon', 'Dikembe Mutombo', 'Serge Ibaka', 'Pascal Siakam'], difficulty: 'blue' },
      { theme: 'Played for the Sacramento Kings', players: ['Chris Webber', 'Peja Stojaković', 'Mike Bibby', 'DeMarcus Cousins', 'Jason Williams'], difficulty: 'purple' },
    ],
  },
];

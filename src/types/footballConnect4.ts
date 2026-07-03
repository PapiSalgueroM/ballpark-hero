export type Team = 'blue' | 'red';

export interface CellState {
  team: Team;
  playerName: string;
}

export type BoardCell = CellState | null;

// 6 rows x 7 columns — row 0 is top, row 5 is bottom
export type Board = BoardCell[][];

export interface FootballConnect4Board {
  id: string;
  name: string;
  columnAttributes: string[]; // length 7
  rowAttributes: string[];    // length 6
}

export type GamePhase = 'playing' | 'won';

export const ROWS = 6;
export const COLS = 7;

export const FOOTBALL_CONNECT4_BOARDS: FootballConnect4Board[] = [
  {
    id: 'classic-1',
    name: 'Legends & Clubs',
    columnAttributes: [
      'Played for Barcelona',
      'Played for Real Madrid',
      'Played for Man United',
      'Played for Bayern Munich',
      'Played for PSG',
      'Played for Juventus',
      'Played for Liverpool',
    ],
    rowAttributes: [
      'World Cup Winner',
      'Champions League Winner',
      'Has/Had a 90+ Rated FIFA Card',
      'Played with Lionel Messi (same club)',
      'South American Nationality',
      'Scored 30+ Goals in a Single Season (all comps)',
    ],
  },
  {
    id: 'classic-2',
    name: 'Nations & Achievements',
    columnAttributes: [
      'French',
      'Brazilian',
      'Argentine',
      'Spanish',
      'Portuguese',
      'German',
      'Dutch',
    ],
    rowAttributes: [
      'Played for Chelsea',
      'Played for AC Milan',
      'Played for Arsenal',
      'Played for Inter Milan',
      'Played for Man City',
      'Played for Atletico Madrid',
    ],
  },
  {
    id: 'classic-3',
    name: 'Premier League & Records',
    columnAttributes: [
      'Played for Chelsea',
      'Played for Arsenal',
      'Played for Man City',
      'Played for Tottenham',
      'Played for Man United',
      'Played for Liverpool',
      'Played for Newcastle',
    ],
    rowAttributes: [
      'World Cup Winner',
      'English Nationality',
      'Played with Cristiano Ronaldo (same club)',
      'Played in Serie A',
      'Scored 100+ Premier League Goals',
      'Market Value Has Exceeded €100M',
    ],
  },
  {
    id: 'classic-4',
    name: 'Serie A Legends',
    columnAttributes: [
      'Played for AC Milan',
      'Played for Inter Milan',
      'Played for Roma',
      'Played for Napoli',
      'Played for Juventus',
      'Played for Lazio',
      'Played for Fiorentina',
    ],
    rowAttributes: [
      'Brazilian',
      'Argentine',
      'French',
      'Champions League Winner',
      'World Cup Winner',
      'Has/Had a 90+ Rated FIFA Card',
    ],
  },
  {
    id: 'classic-5',
    name: 'Messi & Ronaldo Connections',
    columnAttributes: [
      'Played with Lionel Messi (same club)',
      'Played with Cristiano Ronaldo (same club)',
      'Played for Barcelona',
      'Played for Real Madrid',
      'Played for PSG',
      'Played for Juventus',
      'Played for Man United',
    ],
    rowAttributes: [
      'World Cup Winner',
      'African Nationality',
      'Has/Had a 90+ Rated FIFA Card',
      'Scored 30+ Goals in a Single Season (all comps)',
      'French',
      'South American Nationality',
    ],
  },
  {
    id: 'classic-6',
    name: 'La Liga vs Premier League',
    columnAttributes: [
      'Played for Barcelona',
      'Played for Real Madrid',
      'Played for Atletico Madrid',
      'Played for Sevilla',
      'Played for Valencia',
      'Played for Villarreal',
      'Played for Real Sociedad',
    ],
    rowAttributes: [
      'Played in the Premier League',
      'French',
      'World Cup Winner',
      'Scored 30+ Goals in a Single Season (all comps)',
      'South American Nationality',
      'Won the Europa League',
    ],
  },
  {
    id: 'classic-7',
    name: 'Defenders & Goalkeepers',
    columnAttributes: [
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played for Juventus',
      'Played for Bayern Munich',
      'Played for Chelsea',
      'Played for AC Milan',
      'Played for Man United',
    ],
    rowAttributes: [
      'Goalkeeper',
      'Centre-Back',
      'Full-Back/Wing-Back',
      'World Cup Winner',
      'Won 3+ Champions League Titles',
      'Italian Nationality',
    ],
  },
  {
    id: 'classic-8',
    name: 'Modern Superstars',
    columnAttributes: [
      'Played for Liverpool',
      'Played for Man City',
      'Played for PSG',
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played for Chelsea',
      'Played for Tottenham',
    ],
    rowAttributes: [
      'Active Player (as of 2025-26)',
      'Market Value Has Exceeded €100M',
      'Has/Had a 90+ Rated FIFA Card',
      'Won the Premier League',
      'Scored in a Champions League Final',
      'Cost €50M+ Transfer Fee',
    ],
  },
  {
    id: 'classic-9',
    name: 'South American Stars',
    columnAttributes: [
      'Brazilian',
      'Argentine',
      'Uruguayan',
      'Colombian',
      'Chilean',
      'Paraguayan',
      'Ecuadorian',
    ],
    rowAttributes: [
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played in the Premier League',
      'Played in Serie A',
      'Copa América Winner',
      'Scored 20+ Goals in a European League Season',
    ],
  },
  {
    id: 'classic-10',
    name: 'Bundesliga & Beyond',
    columnAttributes: [
      'Played for Bayern Munich',
      'Played for Dortmund',
      'Played for RB Leipzig',
      'Played for Leverkusen',
      'Played for Schalke',
      'Played for Wolfsburg',
      'Played for Stuttgart',
    ],
    rowAttributes: [
      'Polish Nationality',
      'Played in the Premier League',
      'Played in La Liga',
      'World Cup Winner',
      'Scored 20+ Bundesliga Goals in a Season',
      'Market Value Has Exceeded €100M',
    ],
  },
  {
    id: 'classic-11',
    name: 'FIFA Ratings & Stats',
    columnAttributes: [
      'Has/Had a 90+ Rated FIFA Card',
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played for Man City',
      'Played for Bayern Munich',
      'Played for Chelsea',
      'Played for PSG',
    ],
    rowAttributes: [
      'Scored 30+ Goals in a Single Season (all comps)',
      'Won the Ballon d\'Or',
      'Market Value Has Exceeded €100M',
      'Played with Lionel Messi (same club)',
      'Played with Cristiano Ronaldo (same club)',
      'African Nationality',
    ],
  },
  {
    id: 'classic-12',
    name: 'Transfer Kings',
    columnAttributes: [
      'Cost €50M+ Transfer Fee',
      'Played for PSG',
      'Played for Barcelona',
      'Played for Real Madrid',
      'Played for Chelsea',
      'Played for Man United',
      'Played for Man City',
    ],
    rowAttributes: [
      'Brazilian',
      'French',
      'Market Value Has Exceeded €100M',
      'Champions League Winner',
      'Has/Had a 90+ Rated FIFA Card',
      'Played with Neymar (same club)',
    ],
  },
  {
    id: 'classic-13',
    name: 'World Cup Heroes',
    columnAttributes: [
      'World Cup Winner',
      'Played in a World Cup Final',
      'Scored in a World Cup',
      'French',
      'Brazilian',
      'German',
      'Argentine',
    ],
    rowAttributes: [
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played for Juventus',
      'Played in the Premier League',
      'Has/Had a 90+ Rated FIFA Card',
      'Scored 200+ Career Goals',
    ],
  },
  {
    id: 'classic-14',
    name: 'Golden Generation',
    columnAttributes: [
      'Played for Man United',
      'Played for Liverpool',
      'Played for Arsenal',
      'Played for Chelsea',
      'Played for Tottenham',
      'Played for Man City',
      'Played for Newcastle',
    ],
    rowAttributes: [
      'Played with Lionel Messi (same club)',
      'Played with Cristiano Ronaldo (same club)',
      'French',
      'Scored 30+ Goals in a Single Season (all comps)',
      'Market Value Has Exceeded €100M',
      'Won the Champions League',
    ],
  },
  {
    id: 'classic-15',
    name: 'All-Time Greats',
    columnAttributes: [
      'Won the Ballon d\'Or',
      'Has/Had a 90+ Rated FIFA Card',
      'Scored 300+ Career Goals',
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played for AC Milan',
      'Played for Bayern Munich',
    ],
    rowAttributes: [
      'World Cup Winner',
      'Brazilian',
      'Played in the Premier League',
      'Played with Lionel Messi (same club)',
      'Played with Cristiano Ronaldo (same club)',
      'European Championship Winner',
    ],
  },
  {
    // New board (2026-07-03): adds clue types not used by any prior board,
    // each verified against player_market_values / ballon_dor on
    // flawuiqbvjobmkfkauhw before shipping. Pool sizes (distinct players):
    //   Won a Domestic League in 3+ Countries -> 44+ (partial club-to-country
    //     map covering the "Big 5" leagues + Portugal/Netherlands only; the
    //     true pool is larger since MLS/Turkish/Saudi/South American clubs
    //     were not mapped for this check)
    //   Won the Ballon d'Or -> 51 (already used elsewhere, reused here to
    //     pair with the new column types, not counted as "new")
    //   Goalkeeper -> 2,321 (position column, already used as a row label in
    //     classic-7; used here as a column so it can pair with new rows)
    // Both new-type strings are already defined in the football-connect4
    // -validate edge function's system prompt (attribute-definitions list),
    // so the AI verifier already knows how to judge them; this board is the
    // first to actually use them.
    id: 'classic-16',
    name: 'Well Traveled',
    columnAttributes: [
      'Won a Domestic League in 3+ Countries',
      'Played for PSG',
      'Played for Inter Milan',
      'Played for Chelsea',
      'Played for Atletico Madrid',
      'Goalkeeper',
      'Won the Ballon d\'Or',
    ],
    rowAttributes: [
      'World Cup Winner',
      'Portuguese',
      'Won the Champions League',
      'Market Value Has Exceeded €100M',
      'African Nationality',
      'Played in the Premier League',
    ],
  },
];

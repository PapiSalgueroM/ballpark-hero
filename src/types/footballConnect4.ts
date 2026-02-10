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
      'Ballon d\'Or Winner/Nominee',
      'African Nationality',
      'South American Nationality',
      'Scored 20+ League Goals in a Season',
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
      'Played in La Liga',
      'Played in Serie A',
      'Scored 100+ Premier League Goals',
      'African Nationality',
    ],
  },
  {
    id: 'classic-4',
    name: 'Transfer Carousel',
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
      'Played in the Premier League',
    ],
  },
  {
    id: 'classic-5',
    name: 'Global Icons',
    columnAttributes: [
      'Played for Real Madrid',
      'Played for Barcelona',
      'Played for Chelsea',
      'Played for Man City',
      'Played for PSG',
      'Played for Bayern Munich',
      'Played for Dortmund',
    ],
    rowAttributes: [
      'Played in MLS',
      'Won a Domestic League in 3+ Countries',
      'Captained Their National Team',
      'Scored 50+ International Goals',
      'Won the Golden Boot (League Top Scorer)',
      'Played in a World Cup Final',
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
      'Scored 30+ Goals in a Single Season',
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
    name: 'Modern Era',
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
      'African Nationality',
      'South Korean or Japanese',
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
      'Peruvian',
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
      'African Nationality',
    ],
  },
];

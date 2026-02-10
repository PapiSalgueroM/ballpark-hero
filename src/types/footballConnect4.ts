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
];

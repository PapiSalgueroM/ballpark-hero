export interface GameDef {
  path: string;
  label: string;
  emoji: string;
  description: string;
  daily?: boolean;
  isNew?: boolean;
}

export interface GameCategory {
  title: string;
  emoji: string;
  games: GameDef[];
}

export const CATEGORIES: GameCategory[] = [
  {
    title: 'Pro Football',
    emoji: '🏈',
    games: [
      { path: '/football-grid', label: 'Pro Football Grid', emoji: '🏈', description: '3×3 grid puzzle with rarity scores', daily: true },
      { path: '/football-timeline', label: 'Timeline', emoji: '📅', description: 'Order players by draft year', daily: true },
      { path: '/football-draft', label: 'Draft Guesser', emoji: '🎰', description: 'Guess the draft round', daily: true },
      { path: '/nfl-career', label: 'NFL Career Path', emoji: '🏈', description: 'Guess the NFL player from clues', daily: true },
      { path: '/guess-nfl-team', label: 'Guess The Team', emoji: '🏈', description: 'Identify the NFL franchise', daily: true, isNew: true },
      { path: '/conquest', label: 'NFL Conquest', emoji: '🗺️', description: '32 teams, 50 states. One champion.', daily: true },
    ],
  },
  {
    title: 'College Football',
    emoji: '🏈',
    games: [
      { path: '/college-grid', label: 'College Grid', emoji: '🎓', description: 'College football 3×3 grid puzzle', daily: true },
      { path: '/guess-the-college', label: 'Guess The College', emoji: '🏫', description: 'Guess the D1 school from clues', daily: true },
    ],
  },
  {
    title: 'Pro Basketball',
    emoji: '🏀',
    games: [
      { path: '/nba-starting-5', label: 'NBA Starting 5', emoji: '🏀', description: 'Build a lineup with stat challenges' },
      { path: '/nba-connect-4', label: 'NBA Connect 4', emoji: '🏀', description: 'NBA trivia meets Connect 4' },
      { path: '/nba-chain', label: 'NBA Chain', emoji: '🔗', description: 'Build a chain of connected players' },
    ],
  },
  {
    title: 'College Basketball',
    emoji: '🏀',
    games: [
      { path: '/guess-cbb-team', label: 'Guess The CBB Program', emoji: '🏀', description: 'Guess the college basketball program', daily: true, isNew: true },
    ],
  },
  {
    title: 'Baseball',
    emoji: '⚾',
    games: [
      { path: '/baseball-career', label: 'Career Path', emoji: '⚾', description: 'Guess the baseball player', daily: true },
      { path: '/baseball-connections', label: 'Connections', emoji: '⚾', description: 'Group baseball players', daily: true },
    ],
  },
  {
    title: 'Hockey',
    emoji: '🏒',
    games: [
      { path: '/hockey-career', label: 'Career Path', emoji: '🏒', description: 'Guess the hockey player', daily: true },
      { path: '/hockey-higher-lower', label: 'Higher / Lower', emoji: '🏒', description: 'Compare career points', daily: true },
    ],
  },
  {
    title: 'Soccer',
    emoji: '⚽',
    games: [
      { path: '/footle', label: 'Footle', emoji: '🎯', description: 'Guess the soccer player from stats' },
      { path: '/career', label: 'Career Quiz', emoji: '📜', description: 'Guess from career history' },
      { path: '/higher-lower', label: 'Higher or Lower', emoji: '📊', description: 'Compare all-time career stats' },
      { path: '/connections', label: 'Connections', emoji: '🔗', description: 'Find groups of 4 connected players' },
      { path: '/build-your-xi', label: 'Build Your XI', emoji: '⚽', description: 'Create a lineup, get AI rated' },
      
      { path: '/football-connect-4', label: 'Connect 4', emoji: '🔴', description: 'Soccer trivia meets Connect 4' },
      { path: '/world-cup', label: 'World Cup', emoji: '🏆', description: 'Guess the World Cup legend', daily: true },
      { path: '/guess-soccer-club', label: 'Guess The Club', emoji: '🏟️', description: 'Identify the mystery football club', daily: true, isNew: true },
      { path: '/soccer-grid', label: 'Soccer Grid', emoji: '⚽', description: '3×3 grid puzzle with rarity scores', daily: true, isNew: true },
      { path: '/world-cup-bracket', label: '2026 Bracket', emoji: '🌍', description: 'Predict every World Cup 2026 match', isNew: true },
      { path: '/soccer-career', label: 'Soccer Career', emoji: '⚽', description: 'Build your career from youth academy to legend. BitLife meets football.', isNew: true },
      { path: '/shirt-number', label: 'Shirt Number', emoji: '👕', description: 'Guess the kit number a player wears', daily: true, isNew: true },
    ],
  },
  {
    title: 'Formula 1',
    emoji: '🏎️',
    games: [
      { path: '/f1-driver', label: 'Guess The F1 Driver', emoji: '🏎️', description: 'Guess the mystery F1 driver from clues', daily: true, isNew: true },
      { path: '/f1-constructor', label: 'Guess The Constructor', emoji: '🏗️', description: 'Guess the mystery F1 team from clues', daily: true, isNew: true },
    ],
  },
  {
    title: 'Tennis',
    emoji: '🎾',
    games: [
      { path: '/guess-tennis-player', label: 'Guess The Player', emoji: '🎾', description: 'Guess the mystery tennis player from clues', daily: true, isNew: true },
      { path: '/tennis-chain', label: 'Tennis Chain', emoji: '🔗', description: 'Build a chain of Grand Slam defeats', isNew: true },
    ],
  },
  {
    title: 'Golf',
    emoji: '🏌️',
    games: [],
  },
  {
    title: 'NASCAR',
    emoji: '🏁',
    games: [
      { path: '/guess-nascar-driver', label: 'Guess The Driver', emoji: '🏁', description: 'Guess the mystery NASCAR driver from clues', daily: true, isNew: true },
      { path: '/nascar-chain', label: 'NASCAR Chain', emoji: '🔗', description: 'Build a chain of Cup champions', isNew: true },
    ],
  },
  {
    title: 'Combat Sports',
    emoji: '🥊',
    games: [
      { path: '/ufc', label: 'UFC Guesser', emoji: '🥊', description: 'Guess the UFC fighter' },
      { path: '/ufc-chain', label: 'Combat Chain', emoji: '🔗', description: 'Build a chain of fighters who beat each other', isNew: true },
    ],
  },
  {
    title: 'World & Olympic Games',
    emoji: '🌍',
    games: [
      { path: '/teammates', label: 'Teammates or Not?', emoji: '🤝', description: 'Were they ever teammates?', isNew: true },
      { path: '/olympics', label: 'The Medal Games', emoji: '🏅', description: 'Guess the mystery athlete from clues', daily: true, isNew: true },
      { path: '/guess-the-year', label: 'Guess The Year', emoji: '📅', description: 'What year did these happen?', daily: true, isNew: true },
      { path: '/guess-the-nation', label: 'Guess The Nation', emoji: '🌍', description: 'Identify the mystery sporting nation', daily: true, isNew: true },
    ],
  },
];

export const VISIBLE_CATEGORIES = CATEGORIES.filter(c => c.games.length > 0);
export const ALL_GAMES = CATEGORIES.flatMap(c => c.games);
export const TOTAL_GAMES = ALL_GAMES.length;

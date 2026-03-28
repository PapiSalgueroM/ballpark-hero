import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface GameLink {
  path: string;
  label: string;
  description: string;
  daily?: boolean;
}

const CATEGORIES: { title: string; games: GameLink[] }[] = [
  {
    title: 'Pro Football',
    games: [
      { path: '/football-grid', label: '🏈 Pro Football Grid', description: '3×3 grid puzzle with rarity scores', daily: true },
      { path: '/football-timeline', label: '📅 Timeline', description: 'Order players by draft year', daily: true },
      { path: '/football-draft', label: '🎰 Draft Guesser', description: 'Guess the draft round', daily: true },
      { path: '/nfl-career', label: '🏈 NFL Career Path', description: 'Guess the NFL player from clues', daily: true },
      { path: '/guess-nfl-team', label: '🏈 Guess The Team', description: 'Identify the NFL franchise', daily: true },
      { path: '/conquest', label: '🗺️ NFL Conquest', description: '32 teams, 50 states. One champion.', daily: true },
    ],
  },
  {
    title: 'College Football',
    games: [
      { path: '/college-grid', label: '🎓 College Grid', description: 'College football 3×3 grid puzzle', daily: true },
      { path: '/guess-the-college', label: '🏫 Guess The College', description: 'Guess the D1 school from clues', daily: true },
    ],
  },
  {
    title: 'Pro Basketball',
    games: [
      { path: '/nba-starting-5', label: '🏀 NBA Starting 5', description: 'Build a lineup with stat challenges' },
      { path: '/nba-connect-4', label: '🏀 NBA Connect 4', description: 'NBA trivia meets Connect 4' },
      { path: '/nba-chain', label: '🔗 NBA Chain', description: 'Build a chain of connected players' },
    ],
  },
  {
    title: 'College Basketball',
    games: [
      { path: '/guess-cbb-team', label: '🏀 Guess The CBB Program', description: 'Guess the college basketball program', daily: true },
    ],
  },
  {
    title: 'Baseball',
    games: [
      { path: '/baseball-career', label: '⚾ Career Path', description: 'Guess the baseball player', daily: true },
      { path: '/baseball-connections', label: '⚾ Connections', description: 'Group baseball players', daily: true },
    ],
  },
  {
    title: 'Hockey',
    games: [
      { path: '/hockey-career', label: '🏒 Career Path', description: 'Guess the hockey player', daily: true },
      { path: '/hockey-higher-lower', label: '🏒 Higher/Lower', description: 'Compare career points', daily: true },
    ],
  },
  {
    title: 'Soccer',
    games: [
      { path: '/footle', label: '🎯 Footle', description: 'Guess the soccer player from stats' },
      { path: '/career', label: '📜 Career Quiz', description: 'Guess from career history' },
      { path: '/higher-lower', label: '📊 Higher or Lower', description: 'Compare all-time career stats' },
      { path: '/connections', label: '🔗 Connections', description: 'Find groups of 4 connected players' },
      { path: '/build-your-xi', label: '⚽ Build Your XI', description: 'Create a lineup, get AI rated' },
      { path: '/guess-the-face', label: '🖼️ Guess the Face', description: 'Unblur the soccer player' },
      { path: '/football-connect-4', label: '🔴 Connect 4', description: 'Soccer trivia meets Connect 4' },
      { path: '/world-cup', label: '🏆 World Cup', description: 'Guess the World Cup legend', daily: true },
      { path: '/guess-soccer-club', label: '🏟️ Guess The Club', description: 'Identify the mystery football club', daily: true },
      { path: '/soccer-grid', label: '⚽ Soccer Grid', description: '3×3 grid puzzle with rarity scores', daily: true },
      { path: '/world-cup-predictor', label: '🌍 2026 Predictor', description: 'Predict every World Cup 2026 match' },
    ],
  },
  {
    title: 'Formula 1',
    games: [
      { path: '/f1-driver', label: '🏎️ Guess The F1 Driver', description: 'Guess the mystery F1 driver from clues', daily: true },
      { path: '/f1-constructor', label: '🏗️ Guess The Constructor', description: 'Guess the mystery F1 team from clues', daily: true },
    ],
  },
  {
    title: 'Tennis',
    games: [
      { path: '/guess-tennis-player', label: '🎾 Guess The Player', description: 'Guess the mystery tennis player from clues', daily: true },
      { path: '/tennis-chain', label: '🔗 Tennis Chain', description: 'Build a chain of Grand Slam defeats' },
    ],
  },
  {
    title: 'NASCAR',
    games: [
      { path: '/guess-nascar-driver', label: '🏁 Guess The Driver', description: 'Guess the mystery NASCAR driver from clues', daily: true },
      { path: '/nascar-chain', label: '🔗 NASCAR Chain', description: 'Build a chain of Cup champions' },
    ],
  },
  {
    title: 'Combat Sports',
    games: [
      { path: '/ufc', label: '🥊 UFC Guesser', description: 'Guess the UFC fighter' },
      { path: '/ufc-chain', label: '🔗 Combat Chain', description: 'Build a chain of fighters who beat each other' },
    ],
  },
  {
    title: 'World & Olympic Games',
    games: [
      { path: '/teammates', label: '🤝 Teammates or Not?', description: 'Were they ever teammates?' },
      { path: '/olympics', label: '🏅 The Medal Games', description: 'Guess the mystery athlete from clues', daily: true },
      { path: '/guess-the-year', label: '📅 Guess The Year', description: 'What year did these happen?', daily: true },
      { path: '/guess-the-nation', label: '🌍 Guess The Nation', description: 'Identify the mystery sporting nation', daily: true },
    ],
  },
];

export function GameNav() {
  const location = useLocation();

  // Filter out categories where the only game is the current page
  const visibleCategories = CATEGORIES
    .map(cat => ({
      ...cat,
      games: cat.games.filter(g => g.path !== location.pathname),
    }))
    .filter(cat => cat.games.length > 0);

  return (
    <div className="mt-12 mb-6">
      <div className="border-t border-border/50 pt-8 space-y-8">
        {visibleCategories.map(cat => (
          <div key={cat.title}>
            <h3 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {cat.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
              {cat.games.map(g => (
                <Link
                  key={g.path}
                  to={g.path}
                  className="flex flex-col items-center justify-center gap-1 px-6 py-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-all hover:scale-105 text-center"
                >
                  <span className="text-xl font-bold text-primary font-display">{g.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{g.description}</span>
                  {g.daily && (
                    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary mt-1">
                      Daily
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

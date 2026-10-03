import type { Difficulty, Player } from '@/types/game';

// Fictional fixtures never enter the shipped pool.
export const practicePlayers: Player[] = (['easy', 'hard', 'insane'] as Difficulty[]).flatMap((difficulty, tier) =>
  Array.from({ length: 10 }, (_, index) => ({
    name: `Fixture ${difficulty} ${String.fromCharCode(65 + index)}`,
    club: `Fixture Club ${tier}${index}`, nationality: index % 2 ? 'Senegal' : 'Norway',
    league: 'Premier League' as const, goals: index, assists: index === 0 ? null : 0,
    position: 'CM' as const, kitNumber: null, age: 22 + index, marketValue: 15 + index,
    difficulty,
  })),
);

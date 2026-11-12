import type { NbaArchetype, NbaCareerPos } from './nbaMyCareer';
import type { UsCareerCreate } from './usCareerSport';

export const NBA_CAREER_SAVE_KEY = 'nba-my-career-save-v1';
export const NBA_CAREER_ERAS: { id: 'now' | 'y2004'; label: string; blurb: string }[] = [
  { id: 'now', label: '2026', blurb: 'The league as it is today. Full money, all 30 franchises.' },
  {
    id: 'y2004', label: '2003-04 throwback',
    blurb: 'The 29 team league of 2003-04: the SuperSonics in Seattle, the Nets in New Jersey, the Hornets in New Orleans, no Charlotte yet. Contracts pay 2003 money.',
  },
];

export const NBA_ARCHETYPES: Record<NbaCareerPos, NbaArchetype[]> = {
  PG: [
    { id: 'pointgod', label: 'Point God', desc: 'The offense runs through you', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 0.85, playmaking: 1.55, rebounding: 0.55 },
    { id: 'scoringpg', label: 'Scoring Lead', desc: 'A point guard who hunts buckets', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.3, playmaking: 1.05, rebounding: 0.55 },
    { id: 'pest', label: 'The Pest', desc: 'Picks pockets, gets under skin', ovrBoost: 2, potBoost: 4, durability: 1.0, scoring: 0.95, playmaking: 1.15, rebounding: 0.6 },
  ],
  SG: [
    { id: 'bucket', label: 'Bucket Getter', desc: 'Shot creation from anywhere', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.35, playmaking: 0.8, rebounding: 0.6 },
    { id: 'sniper', label: 'Movement Sniper', desc: 'Never stops running off screens', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.15, playmaking: 0.65, rebounding: 0.6 },
    { id: 'twoway', label: 'Two-Way Menace', desc: 'Guards the best perimeter player alive', ovrBoost: 2, potBoost: 4, durability: 1.0, scoring: 1.0, playmaking: 0.85, rebounding: 0.75 },
  ],
  SF: [
    { id: 'alpha', label: 'Alpha Wing', desc: 'Face of the franchise scorer', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.25, playmaking: 0.95, rebounding: 0.9 },
    { id: 'threed', label: '3-and-D Wing', desc: 'Corner threes and lockdowns', ovrBoost: 1, potBoost: 4, durability: 1.0, scoring: 0.85, playmaking: 0.7, rebounding: 0.9 },
    { id: 'pointforward', label: 'Point Forward', desc: 'Jumbo playmaker', ovrBoost: 2, potBoost: 5, durability: 0.9, scoring: 1.0, playmaking: 1.3, rebounding: 1.0 },
  ],
  PF: [
    { id: 'stretch4', label: 'Stretch Four', desc: 'Spaces the floor, switches everything', ovrBoost: 2, potBoost: 4, durability: 0.95, scoring: 1.05, playmaking: 0.7, rebounding: 1.15 },
    { id: 'bruiser', label: 'Bruiser', desc: 'Offensive boards and bad intentions', ovrBoost: 3, potBoost: 3, durability: 0.85, scoring: 0.95, playmaking: 0.6, rebounding: 1.4 },
    { id: 'swiss', label: 'Swiss Army Four', desc: 'Does a bit of everything, nightly', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.0, playmaking: 1.0, rebounding: 1.15 },
  ],
  C: [
    { id: 'paintbeast', label: 'Paint Beast', desc: 'Dunks, boards, blocks', ovrBoost: 3, potBoost: 3, durability: 0.85, scoring: 1.0, playmaking: 0.5, rebounding: 1.5 },
    { id: 'stretch', label: 'Stretch Five', desc: 'A center who lives at the arc', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.05, playmaking: 0.7, rebounding: 1.15 },
    { id: 'anchor', label: 'Defensive Anchor', desc: 'DPOY ceiling, capped usage', ovrBoost: 2, potBoost: 4, durability: 0.95, scoring: 0.75, playmaking: 0.6, rebounding: 1.4 },
  ],
};

export const NBA_CAREER_CREATE: UsCareerCreate = {
  defaultName: 'Trey Buckets',
  defaultPos: 'PG',
  positions: ['PG', 'SG', 'SF', 'PF', 'C'],
  positionGridClass: 'grid grid-cols-5 gap-1 rounded-2xl bg-secondary p-1',
  positionButtonClass: 'rounded-xl px-1 py-1.5 text-sm font-bold transition-all',
  eras: NBA_CAREER_ERAS,
  eraEmoji: '🏀',
  clubColor: '#F97316',
  archetypes: NBA_ARCHETYPES,
};

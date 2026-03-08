import { GridPuzzle } from '@/types/footballGrid';

export const footballGridPuzzles: GridPuzzle[] = [
  {
    id: 'grid-001',
    rows: [
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Cowboys', type: 'team' },
      { label: 'Played for Packers', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: '3+ Pro Bowls', type: 'probowl' },
      { label: 'Won Super Bowl', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-002',
    rows: [
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for Steelers', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Alabama', type: 'college' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-003',
    rows: [
      { label: 'Played for Eagles', type: 'team' },
      { label: 'Played for Broncos', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: '5+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-004',
    rows: [
      { label: 'Played for Rams', type: 'team' },
      { label: 'Played for Giants', type: 'team' },
      { label: 'Played for Bears', type: 'team' },
    ],
    cols: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Ohio State', type: 'college' },
      { label: 'Undrafted', type: 'draft' },
    ],
  },
  {
    id: 'grid-005',
    rows: [
      { label: 'Played for Seahawks', type: 'team' },
      { label: 'Played for Buccaneers', type: 'team' },
      { label: 'Played for Saints', type: 'team' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'NFL MVP', type: 'award' },
      { label: '2+ Super Bowl Wins', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-006',
    rows: [
      { label: 'Played for Vikings', type: 'team' },
      { label: 'Played for Dolphins', type: 'team' },
      { label: 'Played for Chargers', type: 'team' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'LSU', type: 'college' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-007',
    rows: [
      { label: 'Played for Raiders', type: 'team' },
      { label: 'Played for Colts', type: 'team' },
      { label: 'Played for Falcons', type: 'team' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Player of the Year', type: 'award' },
      { label: 'Michigan', type: 'college' },
    ],
  },
  {
    id: 'grid-008',
    rows: [
      { label: 'Played for Jets', type: 'team' },
      { label: 'Played for Panthers', type: 'team' },
      { label: 'Played for Cardinals', type: 'team' },
    ],
    cols: [
      { label: 'Safety', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: 'Clemson', type: 'college' },
    ],
  },
  {
    id: 'grid-009',
    rows: [
      { label: 'Played for Texans', type: 'team' },
      { label: 'Played for Bengals', type: 'team' },
      { label: 'Played for Lions', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Offensive Rookie of the Year', type: 'award' },
      { label: 'Top 5 Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-010',
    rows: [
      { label: 'Played for Packers', type: 'team' },
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Cowboys', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: 'Florida', type: 'college' },
    ],
  },
  {
    id: 'grid-011',
    rows: [
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Steelers', type: 'team' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'USC', type: 'college' },
      { label: '1st Overall Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-012',
    rows: [
      { label: 'Played for Bills', type: 'team' },
      { label: 'Played for Titans', type: 'team' },
      { label: 'Played for Jaguars', type: 'team' },
    ],
    cols: [
      { label: 'Defensive Tackle', type: 'position' },
      { label: '3+ Pro Bowls', type: 'probowl' },
      { label: 'Undrafted', type: 'draft' },
    ],
  },
  {
    id: 'grid-013',
    rows: [
      { label: 'Played for Broncos', type: 'team' },
      { label: 'Played for Colts', type: 'team' },
      { label: 'Played for Saints', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Super Bowl MVP', type: 'award' },
      { label: '10+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-014',
    rows: [
      { label: 'Played for Ravens', type: 'team' },
      { label: 'Played for Giants', type: 'team' },
      { label: 'Played for Eagles', type: 'team' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: 'Notre Dame', type: 'college' },
    ],
  },
  {
    id: 'grid-015',
    rows: [
      { label: 'Played for Commanders', type: 'team' },
      { label: 'Played for Bears', type: 'team' },
      { label: 'Played for Seahawks', type: 'team' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'Stanford', type: 'college' },
      { label: 'NFL Defensive Rookie of the Year', type: 'award' },
    ],
  },
];

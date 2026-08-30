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
  // ── 2026-08-05 expansion (owner task 84): 15 new puzzles, every cell
  // verified with at least one real qualifying player before authoring. ──
  {
    id: 'grid-016',
    rows: [
      { label: 'Played for Cowboys', type: 'team' },
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Packers', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: '5+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-017',
    rows: [
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for Broncos', type: 'team' },
      { label: 'Played for Raiders', type: 'team' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: '5+ Pro Bowls', type: 'probowl' },
      { label: 'Won NFL MVP', type: 'award' },
    ],
  },
  {
    id: 'grid-018',
    rows: [
      { label: 'Played for Steelers', type: 'team' },
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Colts', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Won Super Bowl MVP', type: 'award' },
      { label: 'Drafted 1st overall', type: 'draft' },
    ],
  },
  {
    id: 'grid-019',
    rows: [
      { label: 'Played for Dolphins', type: 'team' },
      { label: 'Played for Bills', type: 'team' },
      { label: 'Played for Jets', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Hall of Famer', type: 'award' },
      { label: 'Played in the 2000s', type: 'misc' },
    ],
  },
  {
    id: 'grid-020',
    rows: [
      { label: 'Played for Vikings', type: 'team' },
      { label: 'Played for Lions', type: 'team' },
      { label: 'Played for Bears', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Hall of Famer', type: 'award' },
      { label: 'Had a 1,000-yard rushing season', type: 'misc' },
    ],
  },
  {
    id: 'grid-021',
    rows: [
      { label: 'Played for Eagles', type: 'team' },
      { label: 'Played for Giants', type: 'team' },
      { label: 'Played for Commanders', type: 'team' },
    ],
    cols: [
      { label: 'Had a 15+ sack season', type: 'misc' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Won Super Bowl MVP', type: 'award' },
    ],
  },
  {
    id: 'grid-022',
    rows: [
      { label: 'Played for Seahawks', type: 'team' },
      { label: 'Played for Rams', type: 'team' },
      { label: 'Played for Cardinals', type: 'team' },
    ],
    cols: [
      { label: 'Defensive Back', type: 'position' },
      { label: '8+ Pro Bowls', type: 'probowl' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'grid-023',
    rows: [
      { label: 'Played for Bengals', type: 'team' },
      { label: 'Played for Browns', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Had a 1,000-yard rushing season', type: 'misc' },
      { label: 'Had a 1,000-yard receiving season', type: 'misc' },
    ],
  },
  {
    id: 'grid-024',
    rows: [
      { label: 'Played for Texans', type: 'team' },
      { label: 'Played for Jaguars', type: 'team' },
      { label: 'Played for Titans', type: 'team' },
    ],
    cols: [
      { label: 'Edge rusher', type: 'position' },
      { label: 'Drafted 1st overall', type: 'draft' },
      { label: 'Had a 1,500-yard rushing season', type: 'misc' },
    ],
  },
  {
    id: 'grid-025',
    rows: [
      { label: 'Played for Falcons', type: 'team' },
      { label: 'Played for Panthers', type: 'team' },
      { label: 'Played for Saints', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: '5+ Pro Bowls', type: 'probowl' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'grid-026',
    rows: [
      { label: 'Played for Buccaneers', type: 'team' },
      { label: 'Played for Chargers', type: 'team' },
      { label: 'Played for Raiders', type: 'team' },
    ],
    cols: [
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: 'Hall of Famer', type: 'award' },
      { label: 'Linebacker', type: 'position' },
    ],
  },
  {
    id: 'grid-027',
    rows: [
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for Eagles', type: 'team' },
      { label: 'Played for 49ers', type: 'team' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Won Super Bowl MVP', type: 'award' },
      { label: 'Kicker', type: 'position' },
    ],
  },
  {
    id: 'grid-028',
    rows: [
      { label: 'Played in the 1990s', type: 'misc' },
      { label: 'Played in the 2020s', type: 'misc' },
      { label: 'Won NFL MVP', type: 'award' },
    ],
    cols: [
      { label: 'Played for Packers', type: 'team' },
      { label: 'Played for Colts', type: 'team' },
      { label: 'Played for Rams', type: 'team' },
    ],
  },
  {
    id: 'grid-029',
    rows: [
      { label: 'Played for Steelers', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
      { label: 'Played for Bengals', type: 'team' },
    ],
    cols: [
      { label: 'Safety', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: '3+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-030',
    rows: [
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Jets', type: 'team' },
      { label: 'Played for Dolphins', type: 'team' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Played for two of the three AFC East teams in this grid', type: 'misc' },
    ],
  },
  /* Round 350: the pool went from 30 to 72, which is the point. Every grid
     draws its daily board by walking its pool once before repeating, so the
     pool length IS the repeat interval, and at 30 the NFL grid handed a daily
     player the same nine questions every month. These 42 were authored by
     eight parallel researchers and then put to a separate adversarial checker
     told to refute rather than approve: 64 were written, 22 were rejected
     with a named error (a misdated season, a tenure off by a year, a player
     credited to a team he never appeared for), and the survivors are these.
     Every crossing was evidenced with at least two real players before it was
     allowed in; that evidence is kept in scripts/data/nflGridPool350.json
     rather than here, because the game only needs the questions. */
  {
    id: 'grid-031',
    rows: [
      { label: 'Played for Bills', type: 'team' },
      { label: 'Played for Dolphins', type: 'team' },
      { label: 'Played for Jets', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Undrafted', type: 'draft' },
    ],
  },
  {
    id: 'grid-032',
    rows: [
      { label: 'Played for Bills', type: 'team' },
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Jets', type: 'team' },
    ],
    cols: [
      { label: 'NFL MVP', type: 'award' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-033',
    rows: [
      { label: 'Played for Browns', type: 'team' },
      { label: 'Played for Bengals', type: 'team' },
      { label: 'Played for Steelers', type: 'team' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
      { label: 'Had a 1,000-yard rushing season', type: 'misc' },
    ],
  },
  {
    id: 'grid-034',
    rows: [
      { label: 'Played for Browns', type: 'team' },
      { label: 'Played for Bengals', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
    ],
    cols: [
      { label: 'Won Super Bowl', type: 'superbowl' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Threw for 4,000 yards in a season', type: 'misc' },
    ],
  },
  {
    id: 'grid-035',
    rows: [
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Dolphins', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
    ],
    cols: [
      { label: '2+ Super Bowl Wins', type: 'superbowl' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
      { label: 'Safety', type: 'position' },
    ],
  },
  {
    id: 'grid-036',
    rows: [
      { label: 'Played for Jets', type: 'team' },
      { label: 'Played for Dolphins', type: 'team' },
      { label: 'Played for Bengals', type: 'team' },
    ],
    cols: [
      { label: 'Hall of Famer', type: 'award' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Had a 1,000-yard receiving season', type: 'misc' },
    ],
  },
  {
    id: 'grid-037',
    rows: [
      { label: 'Played for Colts', type: 'team' },
      { label: 'Played for Texans', type: 'team' },
      { label: 'Played for Titans', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: '3+ Pro Bowls', type: 'probowl' },
      { label: 'Won Super Bowl', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-038',
    rows: [
      { label: 'Played for Broncos', type: 'team' },
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for Raiders', type: 'team' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: '5+ Pro Bowls', type: 'probowl' },
      { label: '2+ Super Bowl Wins', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-039',
    rows: [
      { label: 'Played for Chargers', type: 'team' },
      { label: 'Played for Jaguars', type: 'team' },
      { label: 'Played for Broncos', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: '5+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-040',
    rows: [
      { label: 'Played for Broncos', type: 'team' },
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for Chargers', type: 'team' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-041',
    rows: [
      { label: 'Played for Raiders', type: 'team' },
      { label: 'Played for Chargers', type: 'team' },
      { label: 'Played for Titans', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Kicker', type: 'position' },
      { label: '3+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-042',
    rows: [
      { label: 'Played for Cowboys', type: 'team' },
      { label: 'Played for Giants', type: 'team' },
      { label: 'Played for Eagles', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Defensive End', type: 'position' },
      { label: '8+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-043',
    rows: [
      { label: 'Played for Giants', type: 'team' },
      { label: 'Played for Lions', type: 'team' },
      { label: 'Played for Vikings', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Had a 1,000-yard receiving season', type: 'misc' },
    ],
  },
  {
    id: 'grid-044',
    rows: [
      { label: 'Played for Falcons', type: 'team' },
      { label: 'Played for Saints', type: 'team' },
      { label: 'Played for Buccaneers', type: 'team' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
      { label: 'Had a 1,000-yard rushing season', type: 'misc' },
    ],
  },
  {
    id: 'grid-045',
    rows: [
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Seahawks', type: 'team' },
      { label: 'Played for Cardinals', type: 'team' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Hall of Famer', type: 'award' },
    ],
  },
  {
    id: 'grid-046',
    rows: [
      { label: 'Played for Panthers', type: 'team' },
      { label: 'Played for Rams', type: 'team' },
      { label: 'Played for Saints', type: 'team' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Won Super Bowl', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-047',
    rows: [
      { label: 'Played for Rams', type: 'team' },
      { label: 'Played for Seahawks', type: 'team' },
      { label: 'Played for 49ers', type: 'team' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: '5+ Pro Bowls', type: 'probowl' },
      { label: 'Threw for 4,000 yards in a season', type: 'misc' },
    ],
  },
  {
    id: 'grid-048',
    rows: [
      { label: 'Played for Saints', type: 'team' },
      { label: 'Played for Panthers', type: 'team' },
      { label: 'Played for Buccaneers', type: 'team' },
    ],
    cols: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Hall of Famer', type: 'award' },
      { label: '1st Overall Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-049',
    rows: [
      { label: 'Played for Cardinals', type: 'team' },
      { label: 'Played for Falcons', type: 'team' },
      { label: 'Played for 49ers', type: 'team' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'NFL MVP', type: 'award' },
      { label: 'Offensive Rookie of the Year', type: 'award' },
    ],
  },
  {
    id: 'grid-050',
    rows: [
      { label: 'Played for Cardinals', type: 'team' },
      { label: 'Played for Rams', type: 'team' },
      { label: 'Played for Falcons', type: 'team' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Had a 15+ sack season', type: 'misc' },
    ],
  },
  {
    id: 'grid-051',
    rows: [
      { label: 'Ohio State', type: 'college' },
      { label: 'Michigan', type: 'college' },
      { label: 'Penn State', type: 'college' },
    ],
    cols: [
      { label: 'Played for Steelers', type: 'team' },
      { label: 'Played for Cowboys', type: 'team' },
      { label: 'Played for Browns', type: 'team' },
    ],
  },
  {
    id: 'grid-052',
    rows: [
      { label: 'Miami', type: 'college' },
      { label: 'Florida State', type: 'college' },
      { label: 'Clemson', type: 'college' },
    ],
    cols: [
      { label: 'Played for Buccaneers', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
      { label: 'Played for Jaguars', type: 'team' },
    ],
  },
  {
    id: 'grid-053',
    rows: [
      { label: 'Texas', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
      { label: 'Tennessee', type: 'college' },
    ],
    cols: [
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Safety', type: 'position' },
    ],
  },
  {
    id: 'grid-054',
    rows: [
      { label: 'Miami', type: 'college' },
      { label: 'USC', type: 'college' },
      { label: 'Notre Dame', type: 'college' },
    ],
    cols: [
      { label: 'Played for Chargers', type: 'team' },
      { label: 'Defensive Tackle', type: 'position' },
      { label: 'Linebacker', type: 'position' },
    ],
  },
  {
    id: 'grid-055',
    rows: [
      { label: 'NFL MVP', type: 'award' },
      { label: 'Super Bowl MVP', type: 'award' },
      { label: 'Defensive Player of the Year', type: 'award' },
    ],
    cols: [
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Packers', type: 'team' },
      { label: 'Played for Raiders', type: 'team' },
    ],
  },
  {
    id: 'grid-056',
    rows: [
      { label: 'Played for Steelers', type: 'team' },
      { label: 'Played for Ravens', type: 'team' },
      { label: 'Played for Giants', type: 'team' },
    ],
    cols: [
      { label: 'Defensive Player of the Year', type: 'award' },
      { label: 'Super Bowl MVP', type: 'award' },
      { label: 'Had a 1,000-yard receiving season', type: 'misc' },
    ],
  },
  {
    id: 'grid-057',
    rows: [
      { label: 'Played for Colts', type: 'team' },
      { label: 'Played for Titans', type: 'team' },
      { label: 'Played for Chargers', type: 'team' },
    ],
    cols: [
      { label: 'NFL MVP', type: 'award' },
      { label: 'Had a 1,000-yard rushing season', type: 'misc' },
      { label: 'Threw for 4,000 yards in a season', type: 'misc' },
    ],
  },
  {
    id: 'grid-058',
    rows: [
      { label: 'Had a 15+ sack season', type: 'misc' },
      { label: 'Defensive Player of the Year', type: 'award' },
      { label: 'Hall of Famer', type: 'award' },
    ],
    cols: [
      { label: 'Played for Bears', type: 'team' },
      { label: 'Played for Vikings', type: 'team' },
      { label: 'Played for Steelers', type: 'team' },
    ],
  },
  {
    id: 'grid-059',
    rows: [
      { label: 'Had a 1,000-yard rushing season', type: 'misc' },
      { label: 'Had a 1,000-yard receiving season', type: 'misc' },
      { label: 'Offensive Rookie of the Year', type: 'award' },
    ],
    cols: [
      { label: 'Played for Saints', type: 'team' },
      { label: 'Played for Falcons', type: 'team' },
      { label: 'Played for Cardinals', type: 'team' },
    ],
  },
  {
    id: 'grid-060',
    rows: [
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
    cols: [
      { label: 'Played for Patriots', type: 'team' },
      { label: 'Played for Broncos', type: 'team' },
      { label: 'Played for Steelers', type: 'team' },
    ],
  },
  {
    id: 'grid-061',
    rows: [
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Defensive End', type: 'position' },
      { label: 'Won Super Bowl', type: 'superbowl' },
    ],
  },
  {
    id: 'grid-062',
    rows: [
      { label: 'Played for Cowboys', type: 'team' },
      { label: 'Played for Raiders', type: 'team' },
      { label: 'Played for Commanders', type: 'team' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-063',
    rows: [
      { label: 'Played for Bengals', type: 'team' },
      { label: 'Played for Colts', type: 'team' },
      { label: 'Played for Buccaneers', type: 'team' },
    ],
    cols: [
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-064',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Running Back', type: 'position' },
    ],
    cols: [
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-065',
    rows: [
      { label: 'Played for Chiefs', type: 'team' },
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Vikings', type: 'team' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-066',
    rows: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Cornerback', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'grid-067',
    rows: [
      { label: 'Played for Packers', type: 'team' },
      { label: 'Played for Seahawks', type: 'team' },
      { label: 'Played for Eagles', type: 'team' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Undrafted', type: 'draft' },
      { label: 'Round 6 or Later Pick', type: 'draft' },
    ],
  },
  {
    id: 'grid-068',
    rows: [
      { label: 'Tight End', type: 'position' },
      { label: 'Safety', type: 'position' },
      { label: 'Cornerback', type: 'position' },
    ],
    cols: [
      { label: 'Played for Ravens', type: 'team' },
      { label: 'Played for Broncos', type: 'team' },
      { label: '8+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-069',
    rows: [
      { label: 'Played for Chargers', type: 'team' },
      { label: 'Played for Patriots', type: 'team' },
      { label: '3+ Pro Bowls', type: 'probowl' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Kicker', type: 'position' },
      { label: 'Defensive Tackle', type: 'position' },
    ],
  },
  {
    id: 'grid-070',
    rows: [
      { label: 'Punter', type: 'position' },
      { label: 'Kicker', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
    cols: [
      { label: 'Played for Giants', type: 'team' },
      { label: 'Played for Seahawks', type: 'team' },
      { label: '3+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-071',
    rows: [
      { label: 'Safety', type: 'position' },
      { label: 'Cornerback', type: 'position' },
      { label: 'Fullback', type: 'position' },
    ],
    cols: [
      { label: 'Played for 49ers', type: 'team' },
      { label: 'Played for Bills', type: 'team' },
      { label: '3+ Pro Bowls', type: 'probowl' },
    ],
  },
  {
    id: 'grid-072',
    rows: [
      { label: 'Tight End', type: 'position' },
      { label: 'Edge rusher', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
    cols: [
      { label: 'Played for Falcons', type: 'team' },
      { label: 'Played for Chiefs', type: 'team' },
      { label: '8+ Pro Bowls', type: 'probowl' },
    ],
  },
];

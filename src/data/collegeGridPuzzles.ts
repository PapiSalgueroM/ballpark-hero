import { GridPuzzle } from '@/types/footballGrid';

export const collegeGridPuzzles: GridPuzzle[] = [
  {
    id: 'cgrid-001',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'LSU', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-002',
    rows: [
      { label: 'Clemson', type: 'college' },
      { label: 'Georgia', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'National Champion', type: 'award' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-003',
    rows: [
      { label: 'Oklahoma', type: 'college' },
      { label: 'Michigan', type: 'college' },
      { label: 'Texas', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Heisman Winner', type: 'award' },
    ],
  },
  {
    id: 'cgrid-004',
    rows: [
      { label: 'Notre Dame', type: 'college' },
      { label: 'Florida', type: 'college' },
      { label: 'Penn State', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Went Undrafted', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-005',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'ACC Conference', type: 'misc' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    // Round 60 fix: this puzzle used to pair Oregon with National Champion.
    // Oregon has never won a national title (they lost the 2011 and 2015 title
    // games), so that cell was unfillable and this daily was impossible to
    // complete, once every fifteen days. Florida State has three titles and a
    // deep first round defensive end line, so every cell now has real answers.
    id: 'cgrid-006',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Clemson', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Defensive End', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-007',
    rows: [
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Florida State', type: 'college' },
      { label: 'Georgia', type: 'college' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-008',
    rows: [
      { label: 'Stanford', type: 'college' },
      { label: 'Wisconsin', type: 'college' },
      { label: 'Auburn', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-009',
    rows: [
      { label: 'Ohio State', type: 'college' },
      { label: 'Alabama', type: 'college' },
      { label: 'Michigan', type: 'college' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-010',
    rows: [
      { label: 'Texas A&M', type: 'college' },
      { label: 'LSU', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Went Undrafted', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-011',
    rows: [
      { label: 'USC', type: 'college' },
      { label: 'Texas', type: 'college' },
      { label: 'Florida', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-012',
    rows: [
      { label: 'Georgia', type: 'college' },
      { label: 'Clemson', type: 'college' },
      { label: 'Penn State', type: 'college' },
    ],
    cols: [
      { label: 'Safety', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-013',
    rows: [
      { label: 'Big 12 Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'SEC Conference', type: 'misc' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Top 5 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-014',
    rows: [
      { label: 'Notre Dame', type: 'college' },
      { label: 'Michigan', type: 'college' },
      { label: 'Alabama', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Tackle', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-015',
    rows: [
      { label: 'Oregon', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'LSU', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Heisman Winner', type: 'award' },
    ],
  },
  {
    id: 'cgrid-016',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Georgia', type: 'college' },
      { label: 'Texas', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-017',
    rows: [
      { label: 'Ohio State', type: 'college' },
      { label: 'Michigan', type: 'college' },
      { label: 'Penn State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-018',
    rows: [
      { label: 'USC', type: 'college' },
      { label: 'UCLA', type: 'college' },
      { label: 'Oregon', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-019',
    rows: [
      { label: 'Nebraska', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
      { label: 'Colorado', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-020',
    rows: [
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Florida State', type: 'college' },
      { label: 'Florida', type: 'college' },
    ],
    cols: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Pro Football Hall of Famer', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-021',
    rows: [
      { label: 'Notre Dame', type: 'college' },
      { label: 'Syracuse', type: 'college' },
      { label: 'Pittsburgh', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Pro Football Hall of Famer', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-022',
    rows: [
      { label: 'Wisconsin', type: 'college' },
      { label: 'Iowa', type: 'college' },
      { label: 'Michigan State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-023',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Clemson', type: 'college' },
      { label: 'LSU', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'National Champion', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-024',
    rows: [
      { label: 'Auburn', type: 'college' },
      { label: 'Tennessee', type: 'college' },
      { label: 'Arkansas', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-025',
    rows: [
      { label: 'Ohio State', type: 'college' },
      { label: 'Alabama', type: 'college' },
      { label: 'Georgia', type: 'college' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'Jim Thorpe Award', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-026',
    rows: [
      { label: 'Texas A&M', type: 'college' },
      { label: 'Ole Miss', type: 'college' },
      { label: 'Mississippi State', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-027',
    rows: [
      { label: 'Washington', type: 'college' },
      { label: 'Oregon', type: 'college' },
      { label: 'Stanford', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-028',
    rows: [
      { label: 'Louisville', type: 'college' },
      { label: 'Cincinnati', type: 'college' },
      { label: 'Houston', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-029',
    rows: [
      { label: 'Virginia Tech', type: 'college' },
      { label: 'West Virginia', type: 'college' },
      { label: 'Pittsburgh', type: 'college' },
    ],
    cols: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-030',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'Pro Football Hall of Famer', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-031',
    rows: [
      { label: 'Georgia', type: 'college' },
      { label: 'Florida', type: 'college' },
      { label: 'South Carolina', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-032',
    rows: [
      { label: 'Texas', type: 'college' },
      { label: 'Texas A&M', type: 'college' },
      { label: 'TCU', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-033',
    rows: [
      { label: 'Michigan', type: 'college' },
      { label: 'Notre Dame', type: 'college' },
      { label: 'Michigan State', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'Played Two Sports', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-034',
    rows: [
      { label: 'Baylor', type: 'college' },
      { label: 'Oklahoma State', type: 'college' },
      { label: 'Colorado', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-035',
    rows: [
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Clemson', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'National Champion', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-036',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Pac-12 Conference', type: 'misc' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-037',
    rows: [
      { label: 'ACC Conference', type: 'misc' },
      { label: 'Big 12 Conference', type: 'misc' },
      { label: 'SEC Conference', type: 'misc' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Top 5 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-038',
    rows: [
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'Notre Dame', type: 'college' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Pro Football Hall of Famer', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-039',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Ohio State', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'National Champion', type: 'award' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-040',
    rows: [
      { label: 'Big 12 Conference', type: 'misc' },
      { label: 'Michigan', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Tackle', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-041',
    rows: [
      { label: 'ACC Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Texas', type: 'college' },
    ],
    cols: [
      { label: 'Safety', type: 'position' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-042',
    rows: [
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'Penn State', type: 'college' },
      { label: 'Miami (FL)', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Butkus Award', type: 'award' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-043',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'ACC Conference', type: 'misc' },
      { label: 'Big 12 Conference', type: 'misc' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-044',
    rows: [
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Notre Dame', type: 'college' },
    ],
    cols: [
      { label: 'Defensive End', type: 'position' },
      { label: 'National Champion', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-045',
    rows: [
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Florida', type: 'college' },
      { label: 'Oregon', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Transferred Schools', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-046',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Miami (FL)', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Won a Super Bowl', type: 'misc' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-047',
    rows: [
      { label: 'Big 12 Conference', type: 'misc' },
      { label: 'Alabama', type: 'college' },
      { label: 'Washington', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-048',
    rows: [
      { label: 'ACC Conference', type: 'misc' },
      { label: 'Ohio State', type: 'college' },
      { label: 'Nebraska', type: 'college' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Outland Trophy', type: 'award' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-049',
    rows: [
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Auburn', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'National Champion', type: 'award' },
      { label: 'Conference Player of the Year', type: 'award' },
    ],
  },
  {
    id: 'cgrid-050',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'Notre Dame', type: 'college' },
    ],
    cols: [
      { label: 'Safety', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'All-American', type: 'award' },
    ],
  },
  {
    id: 'cgrid-051',
    rows: [
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Georgia', type: 'college' },
      { label: 'BYU', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'NFL MVP', type: 'misc' },
      { label: 'Played 10+ NFL Seasons', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-052',
    rows: [
      { label: 'ACC Conference', type: 'misc' },
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Michigan', type: 'college' },
    ],
    cols: [
      { label: 'Cornerback', type: 'position' },
      { label: 'Top 5 Pick', type: 'draft' },
      { label: 'Pro Bowler', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-053',
    rows: [
      { label: 'Big 12 Conference', type: 'misc' },
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'Penn State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Doak Walker Award', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-054',
    rows: [
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'Boise State', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'All-American', type: 'award' },
      { label: 'Went Undrafted', type: 'draft' },
    ],
  },
  {
    id: 'cgrid-055',
    rows: [
      { label: 'Pac-12 Conference', type: 'misc' },
      { label: 'ACC Conference', type: 'misc' },
      { label: 'Alabama', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-056',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
    cols: [
      { label: 'Alabama', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
  },
  {
    id: 'cgrid-057',
    rows: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Cornerback', type: 'position' },
      { label: 'Safety', type: 'position' },
    ],
    cols: [
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'LSU', type: 'college' },
    ],
  },
  {
    id: 'cgrid-058',
    rows: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Defensive Tackle', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
    cols: [
      { label: 'Alabama', type: 'college' },
      { label: 'Nebraska', type: 'college' },
      { label: 'Pittsburgh', type: 'college' },
    ],
  },
  {
    id: 'cgrid-059',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
    cols: [
      { label: 'Heisman Winner', type: 'award' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Pro Football Hall of Famer', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-060',
    rows: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Cornerback', type: 'position' },
    ],
    cols: [
      { label: 'Auburn', type: 'college' },
      { label: 'Tennessee', type: 'college' },
      { label: 'Virginia Tech', type: 'college' },
    ],
  },
  {
    id: 'cgrid-061',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Linebacker', type: 'position' },
    ],
    cols: [
      { label: 'Georgia', type: 'college' },
      { label: 'Penn State', type: 'college' },
      { label: 'Michigan', type: 'college' },
    ],
  },
  {
    id: 'cgrid-062',
    rows: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Safety', type: 'position' },
    ],
    cols: [
      { label: 'Notre Dame', type: 'college' },
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
    ],
  },
  {
    id: 'cgrid-063',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Cornerback', type: 'position' },
    ],
    cols: [
      { label: 'Transferred Schools', type: 'misc' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-064',
    rows: [
      { label: 'Running Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive Tackle', type: 'position' },
    ],
    cols: [
      { label: 'Wisconsin', type: 'college' },
      { label: 'Iowa', type: 'college' },
      { label: 'Nebraska', type: 'college' },
    ],
  },
  {
    id: 'cgrid-065',
    rows: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Safety', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
    cols: [
      { label: 'Clemson', type: 'college' },
      { label: 'Georgia', type: 'college' },
      { label: 'Tennessee', type: 'college' },
    ],
  },
  {
    id: 'cgrid-066',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Defensive End', type: 'position' },
    ],
    cols: [
      { label: 'Went Undrafted', type: 'draft' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'Played 10+ NFL Seasons', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-067',
    rows: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
    cols: [
      { label: 'Texas', type: 'college' },
      { label: 'Florida State', type: 'college' },
      { label: 'Arizona State', type: 'college' },
    ],
  },
  {
    id: 'cgrid-068',
    rows: [
      { label: 'Cornerback', type: 'position' },
      { label: 'Safety', type: 'position' },
      { label: 'Linebacker', type: 'position' },
    ],
    cols: [
      { label: 'Pro Football Hall of Famer', type: 'misc' },
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-069',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
    cols: [
      { label: 'LSU', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
      { label: 'Wisconsin', type: 'college' },
    ],
  },
  {
    id: 'cgrid-070',
    rows: [
      { label: 'Running Back', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Safety', type: 'position' },
    ],
    cols: [
      { label: 'All-American', type: 'award' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'Won a Super Bowl', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-071',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive Tackle', type: 'position' },
    ],
    cols: [
      { label: '1st Overall Pick', type: 'draft' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'National Champion', type: 'award' },
    ],
  },
  {
    id: 'cgrid-072',
    rows: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Cornerback', type: 'position' },
    ],
    cols: [
      { label: 'Florida', type: 'college' },
      { label: 'Auburn', type: 'college' },
      { label: 'Ole Miss', type: 'college' },
    ],
  },
  {
    id: 'cgrid-073',
    rows: [
      { label: 'Defensive End', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
    cols: [
      { label: 'Big Ten Conference', type: 'misc' },
      { label: 'SEC Conference', type: 'misc' },
      { label: 'Pac-12 Conference', type: 'misc' },
    ],
  },
  {
    id: 'cgrid-074',
    rows: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
    cols: [
      { label: 'Nebraska', type: 'college' },
      { label: 'Michigan State', type: 'college' },
      { label: 'Purdue', type: 'college' },
    ],
  },
  {
    id: 'cgrid-075',
    rows: [
      { label: 'Tight End', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive End', type: 'position' },
    ],
    cols: [
      { label: 'All-American', type: 'award' },
      { label: 'Pro Bowler', type: 'misc' },
      { label: 'Played 10+ NFL Seasons', type: 'misc' },
    ],
  },
];

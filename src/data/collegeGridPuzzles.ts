/* College Grid boards. GENERATED, do not edit by hand.

   Command: node scripts/genCollegeGridBoards.mjs (seed cg611)
   Check:   node scripts/genCollegeGridBoards.mjs --check

   75 boards dealt from scripts/data/collegeGridPlayers.json and judged by
   judgeCollegeCell in src/lib/collegeGrid.ts. Every cell holds at least
   3 two-source yes answers, one of them a first round pick or a player of
   5 or more NFL seasons, and the nine cells can be filled by nine
   different players. The rules are in the generator's header. */
import type { GridPuzzle } from '@/types/footballGrid';

export const collegeGridPuzzles: GridPuzzle[] = [
  {
    id: 'cg611-001',
    rows: [
      { label: 'Pittsburgh', type: 'college' },
      { label: 'Florida State', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-002',
    rows: [
      { label: 'Michigan', type: 'college' },
      { label: 'Notre Dame', type: 'college' },
      { label: 'Alabama', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Back', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-003',
    rows: [
      { label: 'Penn State', type: 'college' },
      { label: 'Oregon', type: 'college' },
      { label: 'Purdue', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-004',
    rows: [
      { label: 'Clemson', type: 'college' },
      { label: 'Baylor', type: 'college' },
      { label: 'Louisville', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-005',
    rows: [
      { label: 'Cincinnati', type: 'college' },
      { label: 'Michigan State', type: 'college' },
      { label: 'Georgia', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-006',
    rows: [
      { label: 'Nebraska', type: 'college' },
      { label: 'Arkansas', type: 'college' },
      { label: 'Ohio State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-007',
    rows: [
      { label: 'Stanford', type: 'college' },
      { label: 'TCU', type: 'college' },
      { label: 'Syracuse', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-008',
    rows: [
      { label: 'Wisconsin', type: 'college' },
      { label: 'UCLA', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Linebacker', type: 'position' },
    ],
  },
  {
    id: 'cg611-009',
    rows: [
      { label: 'Florida', type: 'college' },
      { label: 'Tennessee', type: 'college' },
      { label: 'Texas A&M', type: 'college' },
    ],
    cols: [
      { label: 'Top 5 Pick', type: 'draft' },
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-010',
    rows: [
      { label: 'Virginia Tech', type: 'college' },
      { label: 'LSU', type: 'college' },
      { label: 'Colorado', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-011',
    rows: [
      { label: 'West Virginia', type: 'college' },
      { label: 'Texas', type: 'college' },
      { label: 'Ole Miss', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-012',
    rows: [
      { label: 'Iowa', type: 'college' },
      { label: 'Washington', type: 'college' },
      { label: 'Mississippi State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-013',
    rows: [
      { label: 'Boise State', type: 'college' },
      { label: 'Arizona State', type: 'college' },
      { label: 'Auburn', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-014',
    rows: [
      { label: 'Miami (FL)', type: 'college' },
      { label: 'South Carolina', type: 'college' },
      { label: 'Oklahoma State', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-015',
    rows: [
      { label: 'Houston', type: 'college' },
      { label: 'Virginia Tech', type: 'college' },
      { label: 'LSU', type: 'college' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Running Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-016',
    rows: [
      { label: 'Arizona State', type: 'college' },
      { label: 'BYU', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-017',
    rows: [
      { label: 'Tennessee', type: 'college' },
      { label: 'Texas A&M', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
    ],
    cols: [
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Top 5 Pick', type: 'draft' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'cg611-018',
    rows: [
      { label: 'Nebraska', type: 'college' },
      { label: 'Syracuse', type: 'college' },
      { label: 'Iowa', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Back', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-019',
    rows: [
      { label: 'Florida', type: 'college' },
      { label: 'Washington', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-020',
    rows: [
      { label: 'Notre Dame', type: 'college' },
      { label: 'Michigan', type: 'college' },
      { label: 'Alabama', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
    ],
  },
  {
    id: 'cg611-021',
    rows: [
      { label: 'Louisville', type: 'college' },
      { label: 'Baylor', type: 'college' },
      { label: 'Penn State', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-022',
    rows: [
      { label: 'Clemson', type: 'college' },
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Georgia', type: 'college' },
    ],
    cols: [
      { label: 'Top 5 Pick', type: 'draft' },
      { label: 'Tight End', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-023',
    rows: [
      { label: 'Stanford', type: 'college' },
      { label: 'Mississippi State', type: 'college' },
      { label: 'Ohio State', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-024',
    rows: [
      { label: 'Boise State', type: 'college' },
      { label: 'West Virginia', type: 'college' },
      { label: 'Oregon', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-025',
    rows: [
      { label: 'Michigan State', type: 'college' },
      { label: 'Arkansas', type: 'college' },
      { label: 'Wisconsin', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'cg611-026',
    rows: [
      { label: 'Stanford', type: 'college' },
      { label: 'South Carolina', type: 'college' },
      { label: 'Texas', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-027',
    rows: [
      { label: 'Oklahoma State', type: 'college' },
      { label: 'Auburn', type: 'college' },
      { label: 'Florida', type: 'college' },
    ],
    cols: [
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-028',
    rows: [
      { label: 'BYU', type: 'college' },
      { label: 'Purdue', type: 'college' },
      { label: 'UCLA', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-029',
    rows: [
      { label: 'Ole Miss', type: 'college' },
      { label: 'Pittsburgh', type: 'college' },
      { label: 'Houston', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-030',
    rows: [
      { label: 'Colorado', type: 'college' },
      { label: 'Miami (FL)', type: 'college' },
      { label: 'Oklahoma State', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-031',
    rows: [
      { label: 'Arizona State', type: 'college' },
      { label: 'TCU', type: 'college' },
      { label: 'Georgia', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Linebacker', type: 'position' },
    ],
  },
  {
    id: 'cg611-032',
    rows: [
      { label: 'LSU', type: 'college' },
      { label: 'USC', type: 'college' },
      { label: 'Cincinnati', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-033',
    rows: [
      { label: 'Tennessee', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'Texas', type: 'college' },
    ],
    cols: [
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Tight End', type: 'position' },
      { label: 'Top 5 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-034',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Clemson', type: 'college' },
      { label: 'Oregon', type: 'college' },
    ],
    cols: [
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Top 5 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-035',
    rows: [
      { label: 'Virginia Tech', type: 'college' },
      { label: 'Texas A&M', type: 'college' },
      { label: 'Colorado', type: 'college' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-036',
    rows: [
      { label: 'Washington', type: 'college' },
      { label: 'Cincinnati', type: 'college' },
      { label: 'Wisconsin', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-037',
    rows: [
      { label: 'Pittsburgh', type: 'college' },
      { label: 'Baylor', type: 'college' },
      { label: 'Nebraska', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-038',
    rows: [
      { label: 'Michigan', type: 'college' },
      { label: 'Auburn', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
    ],
    cols: [
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-039',
    rows: [
      { label: 'Iowa', type: 'college' },
      { label: 'Houston', type: 'college' },
      { label: 'West Virginia', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-040',
    rows: [
      { label: 'Louisville', type: 'college' },
      { label: 'Ole Miss', type: 'college' },
      { label: 'Syracuse', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Running Back', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-041',
    rows: [
      { label: 'Notre Dame', type: 'college' },
      { label: 'Purdue', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Back', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-042',
    rows: [
      { label: 'Penn State', type: 'college' },
      { label: 'UCLA', type: 'college' },
      { label: 'Mississippi State', type: 'college' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Running Back', type: 'position' },
      { label: 'Linebacker', type: 'position' },
    ],
  },
  {
    id: 'cg611-043',
    rows: [
      { label: 'Miami (FL)', type: 'college' },
      { label: 'South Carolina', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-044',
    rows: [
      { label: 'BYU', type: 'college' },
      { label: 'Michigan State', type: 'college' },
      { label: 'Arkansas', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-045',
    rows: [
      { label: 'Boise State', type: 'college' },
      { label: 'TCU', type: 'college' },
      { label: 'Baylor', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-046',
    rows: [
      { label: 'Penn State', type: 'college' },
      { label: 'South Carolina', type: 'college' },
      { label: 'Clemson', type: 'college' },
    ],
    cols: [
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Tight End', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-047',
    rows: [
      { label: 'Houston', type: 'college' },
      { label: 'Texas', type: 'college' },
      { label: 'Syracuse', type: 'college' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Running Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-048',
    rows: [
      { label: 'Ole Miss', type: 'college' },
      { label: 'Purdue', type: 'college' },
      { label: 'Arizona State', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-049',
    rows: [
      { label: 'LSU', type: 'college' },
      { label: 'Florida', type: 'college' },
      { label: 'Notre Dame', type: 'college' },
    ],
    cols: [
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-050',
    rows: [
      { label: 'Washington', type: 'college' },
      { label: 'Arkansas', type: 'college' },
      { label: 'Oklahoma', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-051',
    rows: [
      { label: 'Alabama', type: 'college' },
      { label: 'Michigan', type: 'college' },
      { label: 'Ohio State', type: 'college' },
    ],
    cols: [
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-052',
    rows: [
      { label: 'USC', type: 'college' },
      { label: 'Boise State', type: 'college' },
      { label: 'UCLA', type: 'college' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Running Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-053',
    rows: [
      { label: 'Oregon', type: 'college' },
      { label: 'Stanford', type: 'college' },
      { label: 'Tennessee', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'cg611-054',
    rows: [
      { label: 'Texas A&M', type: 'college' },
      { label: 'Pittsburgh', type: 'college' },
      { label: 'Louisville', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-055',
    rows: [
      { label: 'West Virginia', type: 'college' },
      { label: 'Michigan State', type: 'college' },
      { label: 'TCU', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-056',
    rows: [
      { label: 'Georgia', type: 'college' },
      { label: 'Virginia Tech', type: 'college' },
      { label: 'Oklahoma State', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Back', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-057',
    rows: [
      { label: 'Nebraska', type: 'college' },
      { label: 'Auburn', type: 'college' },
      { label: 'BYU', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-058',
    rows: [
      { label: 'Colorado', type: 'college' },
      { label: 'Iowa', type: 'college' },
      { label: 'Wisconsin', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-059',
    rows: [
      { label: 'Cincinnati', type: 'college' },
      { label: 'Penn State', type: 'college' },
      { label: 'Florida State', type: 'college' },
    ],
    cols: [
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-060',
    rows: [
      { label: 'Auburn', type: 'college' },
      { label: 'Notre Dame', type: 'college' },
      { label: 'Mississippi State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Linebacker', type: 'position' },
    ],
  },
  {
    id: 'cg611-061',
    rows: [
      { label: 'Michigan', type: 'college' },
      { label: 'Georgia', type: 'college' },
      { label: 'Wisconsin', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-062',
    rows: [
      { label: 'Texas', type: 'college' },
      { label: 'Florida', type: 'college' },
      { label: 'Miami (FL)', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Top 5 Pick', type: 'draft' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-063',
    rows: [
      { label: 'Oklahoma', type: 'college' },
      { label: 'Arkansas', type: 'college' },
      { label: 'Stanford', type: 'college' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Quarterback', type: 'position' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-064',
    rows: [
      { label: 'Virginia Tech', type: 'college' },
      { label: 'Syracuse', type: 'college' },
      { label: 'Arizona State', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-065',
    rows: [
      { label: 'LSU', type: 'college' },
      { label: 'Ohio State', type: 'college' },
      { label: 'USC', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Heisman Winner', type: 'award' },
      { label: 'Top 10 Pick', type: 'draft' },
    ],
  },
  {
    id: 'cg611-066',
    rows: [
      { label: 'Iowa', type: 'college' },
      { label: 'Houston', type: 'college' },
      { label: 'Ole Miss', type: 'college' },
    ],
    cols: [
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-067',
    rows: [
      { label: 'TCU', type: 'college' },
      { label: 'Alabama', type: 'college' },
      { label: 'West Virginia', type: 'college' },
    ],
    cols: [
      { label: 'Wide Receiver', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-068',
    rows: [
      { label: 'Texas A&M', type: 'college' },
      { label: 'Tennessee', type: 'college' },
      { label: 'Oregon', type: 'college' },
    ],
    cols: [
      { label: 'Top 5 Pick', type: 'draft' },
      { label: 'Top 10 Pick', type: 'draft' },
      { label: 'Quarterback', type: 'position' },
    ],
  },
  {
    id: 'cg611-069',
    rows: [
      { label: 'Nebraska', type: 'college' },
      { label: 'South Carolina', type: 'college' },
      { label: 'Boise State', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Linebacker', type: 'position' },
      { label: 'Running Back', type: 'position' },
    ],
  },
  {
    id: 'cg611-070',
    rows: [
      { label: 'Michigan State', type: 'college' },
      { label: 'Pittsburgh', type: 'college' },
      { label: 'Oklahoma State', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'cg611-071',
    rows: [
      { label: 'Washington', type: 'college' },
      { label: 'Purdue', type: 'college' },
      { label: 'UCLA', type: 'college' },
    ],
    cols: [
      { label: 'Quarterback', type: 'position' },
      { label: 'First Round Pick', type: 'draft' },
      { label: 'Tight End', type: 'position' },
    ],
  },
  {
    id: 'cg611-072',
    rows: [
      { label: 'Louisville', type: 'college' },
      { label: 'Colorado', type: 'college' },
      { label: 'Baylor', type: 'college' },
    ],
    cols: [
      { label: 'Running Back', type: 'position' },
      { label: 'Defensive Back', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'cg611-073',
    rows: [
      { label: 'Mississippi State', type: 'college' },
      { label: 'BYU', type: 'college' },
      { label: 'Clemson', type: 'college' },
    ],
    cols: [
      { label: 'Linebacker', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Defensive Lineman', type: 'position' },
    ],
  },
  {
    id: 'cg611-074',
    rows: [
      { label: 'Cincinnati', type: 'college' },
      { label: 'Michigan State', type: 'college' },
      { label: 'Alabama', type: 'college' },
    ],
    cols: [
      { label: 'Defensive Lineman', type: 'position' },
      { label: 'Tight End', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
  {
    id: 'cg611-075',
    rows: [
      { label: 'Ohio State', type: 'college' },
      { label: 'Cincinnati', type: 'college' },
      { label: 'Miami (FL)', type: 'college' },
    ],
    cols: [
      { label: 'Tight End', type: 'position' },
      { label: 'Offensive Lineman', type: 'position' },
      { label: 'Wide Receiver', type: 'position' },
    ],
  },
];

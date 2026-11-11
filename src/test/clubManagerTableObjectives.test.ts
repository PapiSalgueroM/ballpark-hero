import { expect, it } from 'vitest';
import { buildBoardObjectives, objectiveStatuses, playableClubs, startCareer, type BoardObjective } from '@/lib/clubManager';

const promotionTargets = [
  ['championship', 6, 'Finish 6th or higher'],
  ['bundesliga2', 3, 'Finish 3rd or higher'],
  ['serieb', 8, 'Finish 8th or higher'],
  ['ligue2', 5, 'Finish 5th or higher'],
  ['segunda', 6, 'Finish 6th or higher'],
] as const;

it.each(promotionTargets)('describes the actual %s table target', (league, target, label) => {
  const clubs = playableClubs(league);
  const objectives = clubs
    .flatMap(club => buildBoardObjectives(club.name, false, clubs.length))
    .filter(objective => objective.id === 'league' && objective.target === target);

  expect(objectives.length).toBeGreaterThan(0);
  expect(new Set(objectives.map(objective => objective.label))).toEqual(new Set([label]));
});

it.each([
  ['Make the promotion playoffs', 6, 'Finish 6th or higher'],
  ['Reach the promotion playoff', 3, 'Finish 3rd or higher'],
] as const)('describes a saved %s objective without rewriting the save', (oldLabel, target, label) => {
  const base = startCareer(playableClubs('championship')[0].name);
  const objective: BoardObjective = { id: 'league', target, label: oldLabel };

  for (const [position, status] of [[target, 'done'], [target + 1, 'failed']] as const) {
    const above = new Set(base.table.filter(row => row.club !== base.clubName).slice(0, position - 1).map(row => row.club));
    const saved = {
      ...base,
      week: base.calendar.length,
      boardObjectives: [objective],
      table: base.table.map(row => ({ ...row, pts: row.club === base.clubName ? 40 : above.has(row.club) ? 50 : 20 })),
    };
    const before = JSON.stringify(saved);
    expect(objectiveStatuses(saved)).toEqual([{ objective: { ...objective, label }, status }]);
    expect(JSON.stringify(saved)).toBe(before);
  }
});

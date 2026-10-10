import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';

export type SeasonFamilyContext = Pick<CareerState, 'family' | 'events' | 'story' | 'seasons' | 'pregnancyAnnounced'>;

const birthLine = (line: string) => line.startsWith('👶 Your child is born.')
  || line === '👶 Welcomed a child, announced with a baby-boot photo'
  || line === '👶 Became a parent, far from the cameras';

/* Birth timing comes from the saved season log, never from child count.
   A missing old story still supports a family salute, but no invented age. */
export function seasonFamilySummary(
  season: Pick<SeasonRecord, 'year' | 'goals'>,
  context?: Partial<SeasonFamilyContext>,
): string {
  const goals = season.goals === 1 ? 'One goal this season.' : `${season.goals} goals this season.`;
  const latest = context?.seasons?.[context.seasons.length - 1];
  const currentLines = latest?.year === season.year ? context?.events ?? [] : [];
  const seasonLines = [
    ...(context?.story ?? []).filter(row => row.year === season.year).flatMap(row => row.lines),
    ...currentLines,
  ];
  const birthYears = (context?.story ?? [])
    .filter(row => row.year <= season.year && row.lines.some(birthLine))
    .map(row => row.year);
  if (currentLines.some(birthLine)) birthYears.push(season.year);
  const birthYear = birthYears.length > 0 ? Math.max(...birthYears) : null;

  if (birthYear === season.year) {
    return `${goals} A new baby joined your family this season. The cradle celebration is for that new arrival.`;
  }
  if (seasonLines.some(line => line.startsWith("👣 Your child's first steps!"))) {
    return `${goals} Your child took their first steps this season. The cradle celebration is your nod to that family milestone.`;
  }
  if (seasonLines.some(line => line.startsWith('⚽ Your child wants to follow in your footsteps'))) {
    return `${goals} Your child wants to follow your football path. The cradle celebration has a different meaning now.`;
  }
  if (seasonLines.some(line => line.startsWith('🏆 Your child watches you win a trophy'))) {
    return `${goals} Your child watched you win a trophy this season. A family salute belongs in this year's highlights.`;
  }
  if (latest?.year === season.year && context?.pregnancyAnnounced) {
    return `${goals} With a baby on the way, your cradle celebration looks ahead to the next family chapter.`;
  }

  const familyLines = [
    'The cradle celebration is still your salute to family.',
    'Your signature cradle celebration keeps family part of the moment.',
    'Another season, another reason to make that cradle celebration a family salute.',
    'The cradle celebration carries your family dedication into this season.',
    'Your family dedication is still there when you bring out the cradle celebration.',
    'This season keeps the cradle celebration as your personal nod to family.',
  ];
  const variant = season.year % familyLines.length;
  if (birthYear !== null) {
    const elapsed = season.year - birthYear;
    return `${goals} ${elapsed === 1 ? 'One season' : `${elapsed} seasons`} since you welcomed a child. ${familyLines[variant]}`;
  }
  if ((context?.family?.children ?? 0) > 0) {
    return `${goals} ${familyLines[variant]}`;
  }

  const signatureLines = [
    'The cradle is your signature goal celebration.',
    'You keep the cradle celebration as your own goal routine.',
    'Your chosen cradle celebration stays part of this season.',
  ];
  return `${goals} ${signatureLines[season.year % signatureLines.length]}`;
}

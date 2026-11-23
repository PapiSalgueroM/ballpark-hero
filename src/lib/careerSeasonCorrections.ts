import { CAREER_LADDER_VERIFIED_SEASONS, type SeasonTotals } from '@/data/careerLadderVerifiedSeasons';
import type { CareerStint } from '@/lib/careerLadder';

// Alisson's 64 competitive appearances for Roma split into 15 and 49.
// His first season includes the Champions League qualifier against Porto.
// The Liverpool totals include his Community Shield and Club World Cup games.
const ALISSON_APPEARANCE_CORRECTIONS = new Map([
  ['a0000001-0000-0000-0000-000000000040', [
    { club: 'Roma', season: '2016-2017', before: 40, after: 15 },
    { club: 'Roma', season: '2017-2018', before: 48, after: 49 },
    { club: 'Liverpool', season: '2018-2019', before: 47, after: 51 },
    { club: 'Liverpool', season: '2020-2021', before: 44, after: 42 },
    { club: 'Liverpool', season: '2021-2022', before: 55, after: 54 },
    { club: 'Liverpool', season: '2022-2023', before: 44, after: 47 },
    { club: 'Liverpool', season: '2023-2024', before: 42, after: 32 },
    { club: 'Liverpool', season: '2024-2025', before: 22, after: 35 },
  ]],
  ['a0000001-0000-0000-0000-000000000066', [
    { club: 'Roma', season: '2016-2017', before: 37, after: 15 },
    { club: 'Liverpool', season: '2019-2020', before: 29, after: 37 },
    { club: 'Liverpool', season: '2020-2021', before: 44, after: 42 },
    { club: 'Liverpool', season: '2021-2022', before: 46, after: 54 },
    { club: 'Liverpool', season: '2022-2023', before: 37, after: 47 },
    { club: 'Liverpool', season: '2023-2024', before: 41, after: 32 },
    { club: 'Liverpool', season: '2024-2025', before: 28, after: 35 },
  ]],
]);

function hasSeasonTotals(stint: CareerStint, totals: SeasonTotals): boolean {
  return stint.goals === totals.goals && stint.assists === totals.assists && stint.appearances === totals.appearances;
}

/** Reconcile dated stints before each reader formats the career rows. */
export function reconcileCareerSeasons(playerId: string, source: CareerStint[]): CareerStint[] {
  const appearanceCorrections = ALISSON_APPEARANCE_CORRECTIONS.get(playerId);
  if (appearanceCorrections) {
    source = source.map(stint => {
      const fix = appearanceCorrections.find(row =>
        row.club === stint.club && row.season === stint.season && row.before === stint.appearances);
      return fix ? { ...stint, appearances: fix.after } : stint;
    });
  }

  const correction = CAREER_LADDER_VERIFIED_SEASONS[playerId];
  if (!correction) return source;

  const { added, addedPartialTotals, firstClubInPreviousSeason, previousClub, previousTotals } = correction;
  const previous = source.find(stint => stint.season === '2024-2025' && stint.club === previousClub);
  const seasons = source.map(stint => {
    if (stint === previous && previousTotals && hasSeasonTotals(stint, previousTotals.before)) {
      return { ...stint, ...previousTotals.after };
    }
    if (stint.season === added.season && stint.club === added.club && hasSeasonTotals(stint, addedPartialTotals)) {
      const { goals, assists, appearances } = added;
      return { ...stint, goals, assists, appearances };
    }
    return stint;
  });

  if (previous && firstClubInPreviousSeason) {
    const { aliases, ...firstStint } = firstClubInPreviousSeason;
    const hasFirst = source.some(stint => stint.season === previous.season
      && (stint.club === firstStint.club || aliases.includes(stint.club)));
    if (!hasFirst) {
      seasons.splice(source.indexOf(previous), 0, { ...firstStint, season: previous.season, sortOrder: previous.sortOrder - 0.5 });
    }
  }
  if (previous && !source.some(stint => stint.season === added.season || stint.sortOrder > previous.sortOrder)) {
    seasons.push({ ...added, sortOrder: previous.sortOrder + 1 });
  }
  return seasons;
}

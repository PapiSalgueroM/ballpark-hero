import { CAREER_LADDER_VERIFIED_SEASONS, type SeasonTotals } from '@/data/careerLadderVerifiedSeasons';
import type { CareerStint } from '@/lib/careerLadder';

// Alisson's 64 competitive appearances for Roma split into 15 and 49.
// His first season includes the Champions League qualifier against Porto.
const ROMA_APPEARANCE_CORRECTIONS = new Map([
  ['a0000001-0000-0000-0000-000000000040', [
    { season: '2016-2017', before: 40, after: 15 },
    { season: '2017-2018', before: 48, after: 49 },
  ]],
  ['a0000001-0000-0000-0000-000000000066', [
    { season: '2016-2017', before: 37, after: 15 },
  ]],
]);

function hasSeasonTotals(stint: CareerStint, totals: SeasonTotals): boolean {
  return stint.goals === totals.goals && stint.assists === totals.assists && stint.appearances === totals.appearances;
}

/** Reconcile dated stints before each reader formats the career rows. */
export function reconcileCareerSeasons(playerId: string, source: CareerStint[]): CareerStint[] {
  const roma = ROMA_APPEARANCE_CORRECTIONS.get(playerId);
  if (roma) {
    source = source.map(stint => {
      const fix = stint.club === 'Roma' && roma.find(row => row.season === stint.season && row.before === stint.appearances);
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

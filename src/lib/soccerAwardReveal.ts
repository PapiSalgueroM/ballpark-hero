import type { CareerState, SeasonRecord } from './soccerCareerEngine';

/** The ballot is already settled. Only its presentation waits for the list. */
export function ballonDorAwaitingReveal(career: Pick<CareerState, 'pendingBallonDor' | 'phase' | 'seasons' | 'pendingSummary'>): number | null {
  const night = career.pendingBallonDor;
  const queued = ['newspaper', 'season_summary', 'ballon_dor', 'world_cup', 'international_debut', 'rivalry_event'].includes(career.phase);
  const latest = career.seasons[career.seasons.length - 1];
  const current = night && (latest?.year === night.year || career.pendingSummary?.year === night.year);
  return queued && current && night && !night.revealed && !night.speech ? night.year : null;
}

export function ballonDorSeasonForDisplay(career: Pick<CareerState, 'pendingBallonDor' | 'phase' | 'seasons' | 'pendingSummary'>, row: SeasonRecord): SeasonRecord {
  return ballonDorAwaitingReveal(career) === row.year ? { ...row, ballonDor: false, ballonDorRank: null } : row;
}

/** Read-only views must not write this projection back into the career. */
export function careerBeforeBallonDorReveal(career: CareerState): CareerState {
  const year = ballonDorAwaitingReveal(career);
  if (year === null) return career;
  const awardLine = (line: string) => /ballon d'or|golden ball/i.test(line);
  return {
    ...career,
    seasons: career.seasons.map(row => ballonDorSeasonForDisplay(career, row)),
    pendingSummary: career.pendingSummary ? ballonDorSeasonForDisplay(career, career.pendingSummary) : null,
    awards: career.awards.filter(a => a.year !== year || a.name !== "Ballon d'Or"),
    events: career.events.filter(line => !awardLine(line)),
    pendingNews: career.pendingNews.map(article => awardLine(article.headline) || awardLine(article.body) ? {
      ...article, type: 'positive',
      headline: `All Eyes On The Ballon d'Or List`,
      body: `${career.playerName}'s season is complete. The ranked list is still to come, and the result has not been announced.`,
    } : article),
    story: career.story?.map(chapter => chapter.year === year ? { ...chapter, lines: chapter.lines.filter(line => !awardLine(line)) } : chapter),
  };
}

/** Mark the existing result as seen, without changing any award or drawing again. */
export function revealBallonDorResult(career: CareerState): CareerState {
  if (career.phase !== 'ballon_dor' || !career.pendingBallonDor || career.pendingBallonDor.revealed) return career;
  return { ...career, pendingBallonDor: { ...career.pendingBallonDor, revealed: true } };
}

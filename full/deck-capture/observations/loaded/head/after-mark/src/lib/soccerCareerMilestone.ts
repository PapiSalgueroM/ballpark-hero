import type { CareerState, NewsArticle, SeasonRecord } from './soccerCareerEngine';

const GOAL_MARKS = [100, 200, 300, 500];
const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];

/** A personal senior-club tally crossing, never a real club's scoring record. */
export function personalGoalMilestone(seasons: SeasonRecord[], row: SeasonRecord): { threshold: number; previous: number; total: number } | null {
  if (!seasons.includes(row) || row.type !== 'playing' || !(row.apps > 0) || YEAR_OUT.includes(row.club)
    || !Number.isInteger(row.year)) return null;
  const played = seasons.filter(season => season.type === 'playing' && season.apps > 0
    && !YEAR_OUT.includes(season.club) && season.year <= row.year);
  if (played.filter(season => season.year === row.year).length !== 1
    || played.some(season => !Number.isInteger(season.goals) || season.goals < 0)) return null;
  const previous = played.filter(season => season.year < row.year).reduce((sum, season) => sum + season.goals, 0);
  const total = previous + row.goals;
  const crossed = GOAL_MARKS.filter(mark => previous < mark && total >= mark);
  return crossed.length ? { threshold: crossed[crossed.length - 1], previous, total } : null;
}

/** After the old news draws, use its paper and space without displacing a key story. */
export function personalGoalMilestoneNews(articles: NewsArticle[], career: CareerState, row: SeasonRecord, fallbackPaper: string): NewsArticle[] {
  const milestone = personalGoalMilestone(career.seasons, row);
  if (!milestone) return articles;
  const performance = new Set([
    `${career.playerName} Silences Critics With Stunning Performance`,
    `Is ${career.playerName} The Best ${career.position} In The World Right Now?`,
    `${career.playerName}'s Recorded Career Goal Tally Reaches ${career.seasons.reduce((sum, season) => sum + season.goals, 0)}`,
    `${career.playerName}'s Saved Career Goal Total Reaches ${career.seasons.reduce((sum, season) => sum + season.goals, 0)}`,
  ]);
  const at = articles.findIndex(article => article.type === 'positive' && performance.has(article.headline));
  if (at < 0 && articles.length >= 2) return articles;
  const article: NewsArticle = {
    newspaper: articles[at >= 0 ? at : 0]?.newspaper ?? fallbackPaper,
    type: 'milestone', headline: `${career.playerName} Reaches ${milestone.threshold} Senior Club Goals`,
    body: `${row.year}/${String((row.year + 1) % 100).padStart(2, '0')}: ${career.playerName} scored ${row.goals} club goals, taking their saved senior club tally from ${milestone.previous} to ${milestone.total}.`,
  };
  return at >= 0 ? articles.map((held, index) => index === at ? article : held) : [...articles, article];
}

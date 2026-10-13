/**
 * What a player is allowed to say when they report something. One list, both
 * buttons.
 *
 * Round 446. His 2026-08-28 review asked for "way more to the report an issue
 * like incorrect answer or blah blah blah and or other and what can make the
 * user game experience better". Round 316 built that for the sitewide button
 * and left the per question one on an older, shorter list, so the two drifted:
 * the sitewide button said "Wrong info" and the per question one said
 * "Outdated info" for the same idea, the per question one had no way to send a
 * suggestion at all, and what a player could say depended on which button they
 * happened to find.
 *
 * The drift is the point of putting it here. Two lists of chips maintained
 * beside each other is the same shape as two copies of one engine, and it went
 * wrong the same way.
 */

/** Offered by every report button on the site. */
export const REPORT_KINDS_SHARED = [
  'Wrong answer',
  'Wrong info',
  'Bug',
  'Idea',
] as const;

/**
 * Only a specific question can be a duplicate of another one, so this chip
 * belongs to the per question button and nowhere else.
 */
export const REPORT_KIND_DUPLICATE = 'Duplicate question';

/** Always last, so the list reads as "one of these, or tell us yourself". */
export const REPORT_KIND_OTHER = 'Other';

export const REPORT_KINDS_SITEWIDE: string[] = [...REPORT_KINDS_SHARED, REPORT_KIND_OTHER];
export const REPORT_KINDS_QUESTION: string[] = [...REPORT_KINDS_SHARED, REPORT_KIND_DUPLICATE, REPORT_KIND_OTHER];

/**
 * Release BA. The guide's default report button (GameSeoContent) reached these
 * pages for the first time, and none of them asks the player a question: they
 * are careers, managers, front offices, tycoons, idle games, drafts, packs,
 * skill games and a bracket. So the duplicate chip has nothing to point at and
 * they get the sitewide list. Quizzes and guess games that get the default keep
 * the per question list. gameReportPlacement.test.tsx checks every entry is a
 * real game route.
 */
export const REPORT_ROUTES_WITHOUT_QUESTIONS: ReadonlySet<string> = new Set([
  '/soccer-career', '/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career',
  '/front-office', '/nba-front-office', '/mlb-front-office', '/nhl-front-office',
  '/cfb-dynasty', '/cbb-dynasty', '/rebuild', '/aussie-rules-manager', '/manager-hot-seat', '/deadline-day',
  '/stadium-tycoon', '/wonderkid-factory', '/fight-career', '/fight-gym', '/fight-promoter',
  '/conquest', '/conquest-nba', '/conquest-mlb', '/conquest-nhl', '/soccer-conquest',
  '/hall-of-champions', '/idle-arena',
  '/budget-builder', '/dart-draft', '/fantasy-draft', '/mystery-box', '/sign-the-player', '/perfect-season-nba',
  '/buzzer-beater', '/cage-clash', '/free-kick', '/world-cup-bracket',
]);

export const DERBY_WIN_POP = 2;
export const DERBY_WIN_MORALE = 2;
export const DERBY_LOSS_POP = -2;
export const DERBY_LOSS_MORALE = -2;
export const DERBY_HERO_POP = 2;

/* The derby rules for the page's "?" help. The /soccer-career guide itself is
   held by the other lane, so the page hands these to GameHelp as extra rules,
   and GameHelp skips any the guide already carries word for word: once the
   same sentences land in the guide, they show once. The numbers are read from
   the constants above so the help cannot drift from the swing. */
export const DERBY_HELP_RULES: readonly string[] = [
  'Derbies: if your club has a real rival in the same league, you meet them twice a season in the league. We only count a rivalry two separate sources back, in leagues and years where we checked how often the clubs meet, so some clubs have none yet.',
  `You play the derbies you are picked for, roughly in line with your league appearances. Each one you win adds ${DERBY_WIN_POP} popularity and ${DERBY_WIN_MORALE} morale, each one you lose takes ${-DERBY_LOSS_POP} off both, a draw changes nothing, the swing is capped every season and your rating is never touched.`,
  `Score the goal that puts you ahead for good in a derby win and the season counts as a Derby Hero season, worth ${DERBY_HERO_POP} more popularity. Example: at Arsenal you beat Tottenham 2-1 at home with the winner and draw 1-1 away, so that is +${DERBY_WIN_POP + DERBY_HERO_POP} popularity, +${DERBY_WIN_MORALE} morale and a Derby Hero.`,
];

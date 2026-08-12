import type { GameContentMap } from './types';
import { SOCCER_CONTENT_1 } from './soccer1';
import { SOCCER_CONTENT_2 } from './soccer2';
import { FOOTBALL_CONTENT } from './football';
import { COLLEGE_CONTENT } from './college';
import { BASKETBALL_CONTENT } from './basketball';
import { BASEBALL_CONTENT } from './baseball';
import { HOCKEY_CONTENT } from './hockey';
import { MORE_SPORTS_CONTENT } from './moreSports';
import { WORLD_CONTENT } from './world';

export type { GameContent, GameFaq, GameContentMap } from './types';

/** Every game's on-page guide, keyed by route path. */
export const GAME_CONTENT: GameContentMap = {
  ...SOCCER_CONTENT_1,
  ...SOCCER_CONTENT_2,
  ...FOOTBALL_CONTENT,
  ...COLLEGE_CONTENT,
  ...BASKETBALL_CONTENT,
  ...BASEBALL_CONTENT,
  ...HOCKEY_CONTENT,
  ...MORE_SPORTS_CONTENT,
  ...WORLD_CONTENT,
};

export const getGameContent = (path: string) => GAME_CONTENT[path];

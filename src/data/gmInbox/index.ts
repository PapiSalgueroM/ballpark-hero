/* Round 940: every seat's inbox pack, by seat. */
import type { GmInboxPack } from '@/lib/gmInbox';
import { NFL_GM_INBOX } from './nfl';
import { NBA_GM_INBOX } from './nba';
import { MLB_GM_INBOX } from './mlb';
import { NHL_GM_INBOX } from './nhl';
import { COLLEGE_GM_INBOX } from './college';
import { GYM_GM_INBOX } from './gym';
import { AFL_GM_INBOX } from './afl';

export const GM_INBOX_PACKS: Record<string, GmInboxPack> = {
  nfl: NFL_GM_INBOX,
  nba: NBA_GM_INBOX,
  mlb: MLB_GM_INBOX,
  nhl: NHL_GM_INBOX,
  college: COLLEGE_GM_INBOX,
  gym: GYM_GM_INBOX,
  afl: AFL_GM_INBOX,
};

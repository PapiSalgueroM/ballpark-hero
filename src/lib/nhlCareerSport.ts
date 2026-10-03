import { nhlPreDraftDescriptor } from '@/lib/nhlCareerPreDraft';
/**
 * Round 900: the NHL's binding for the one US career board.
 *
 * Everything here was in NhlMyCareerBoard.tsx before the four boards became
 * one: the engine calls, and the words and numbers that are hockey's own.
 * The board (src/components/us-career/UsCareerBoard.tsx) imports no sport, and
 * this file is the only place the NHL route reaches the NHL engine from.
 */
import {
  NHL_ARCHETYPES, NHL_ERAS, startNhlCareer, simNhlSeason, nhlProgress, drawNhlEvent,
  NHL_SPEND_ITEMS, buyNhlItem, getNhlSpendItem, repairNetWorth,
  nhlShouldRetire, nhlLegacyOf, nhlCareerTotals, nhlRollTeamQuality, nhlTeamLabelOf,
  buildNhlFaWindow, nhlFaPushArgs, buildNhlExtension, nhlExtPushArgs,
  nhlAssignRole, nhlCampBattle,
  type NhlCareerPos, type NhlCareerState, type NhlSeasonLine,
} from '@/lib/nhlMyCareer';
import { countOf, nhlMajorAward, nhlStatLine } from '@/lib/usCareerStatLine';
import { nhlHeatLabel } from '@/lib/nhlCareerCorruption';
import { NHL_MONEY, nhlMoneyAct, nhlMoneyWealth } from '@/lib/nhlCareerMoney';
import { nhlEarnedBadges, nhlFanComments, nhlFollowers, nhlHeadlinesFor } from '@/lib/nhlCareerLoop';
import { NHL_BADGES } from '@/lib/careerBadges';
import { nhlUnreadInboxCount, answerNhlInboxMessage, nhlDraftNightInbox, NHL_CALENDAR } from '@/lib/nhlCareerInbox';
import { dismissNhlRivalryEvent, resolveNhlRivalryChoice } from '@/lib/nhlCareerRivalryEvents';
import type { UsCareerSport } from '@/lib/usCareerSport';

/* The key this career saves under. It stays a named constant so the home
   page's Continue fence (simHomeFront section 7) can find where every save
   key in src is declared; the value is the one the old board used. */
const SAVE_KEY = 'nhl-my-career-save-v1';

export const NHL_CAREER_SPORT: UsCareerSport<NhlCareerState, NhlSeasonLine> = {
  slug: 'nhl',
  label: 'NHL',
  saveKey: SAVE_KEY,
  gameSlug: 'nhl-my-career',
  gameName: 'NHL My Career',
  practiceLabel: 'Practice rink',
  loadTraining: pos => import('@/lib/nhlCareerTraining').then(m => m.nhlTraining(pos as NhlCareerPos)),
  /* The NHL has 32 clubs, so round one is 32. */
  firstRoundEnd: 32,
  create: {
    defaultName: 'Gordie Blaze',
    defaultPos: 'C',
    positions: ['C', 'LW', 'RW', 'D', 'G'],
    positionGridClass: 'grid grid-cols-5 gap-1 rounded-2xl bg-secondary p-1',
    positionButtonClass: 'rounded-xl px-1 py-1.5 text-sm font-bold transition-all',
    eras: NHL_ERAS,
    eraEmoji: '🏒',
    clubColor: '#0EA5E9',
    archetypes: NHL_ARCHETYPES,
  },

  preDraft: nhlPreDraftDescriptor,
  prospectRatings: (arch, rng) => {
    const a = arch as NhlCareerState['archetype'];
    const rating = 66 + Math.floor(rng() * 8) + a.ovrBoost;
    return { rating, pot: Math.min(99, rating + 11 + Math.floor(rng() * 13) + a.potBoost) };
  },
  startCareer: (name, pos, arch, rng, appearance, eraId, entry) =>
    startNhlCareer(name, pos as NhlCareerPos, arch as NhlCareerState['archetype'], rng, appearance, eraId as 'now' | 'y2006', entry),
  rollTeamQuality: nhlRollTeamQuality,
  assignRole: nhlAssignRole,
  campBattle: nhlCampBattle,
  simSeason: simNhlSeason,
  progress: nhlProgress,
  drawEvent: drawNhlEvent,
  shouldRetire: nhlShouldRetire,
  legacyOf: nhlLegacyOf,
  teamLabelOf: nhlTeamLabelOf,
  statLine: (s, pos) => nhlStatLine(s, pos as NhlCareerPos),
  suspendedLine: c => ({
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
    awards: [], teamResult: 'SUSPENDED', salary: 0,
  }),
  suspendedNote: '🚫 Season served on the suspended list. No hockey, no money, no going back.',

  buildExtension: buildNhlExtension,
  extPushArgs: nhlExtPushArgs,
  buildFaWindow: buildNhlFaWindow,
  faPushArgs: nhlFaPushArgs,
  faSportNoun: 'team',
  seasonWord: 'season',

  money: NHL_MONEY,
  moneyAct: nhlMoneyAct,
  moneyWealth: nhlMoneyWealth,
  shopItems: NHL_SPEND_ITEMS,
  buyItem: buyNhlItem,
  repairNetWorth: c => repairNetWorth(c, id => getNhlSpendItem(id)?.cost ?? 0),
  heatLabel: nhlHeatLabel,
  heatTitle: 'League office',

  headlinesFor: nhlHeadlinesFor,
  followers: nhlFollowers,
  fanComments: nhlFanComments,
  badges: NHL_BADGES,
  earnedBadges: nhlEarnedBadges,

  /* Drawn from the inbox's own keyed stream, so no rng is handed in. */
  draftNightInbox: c => nhlDraftNightInbox(c),
  unreadInboxCount: nhlUnreadInboxCount,
  answerInbox: answerNhlInboxMessage,
  calendar: NHL_CALENDAR,
  dismissRivalryEvent: c => dismissNhlRivalryEvent(c),
  resolveRivalryChoice: resolveNhlRivalryChoice,

  /* Hockey counts Cups, not rings. */
  ringsOf: c => c.cups,
  ringWord: 'Cup',
  ringsLabel: 'Cups',
  honours: c => [{ label: 'Major awards', n: c.harts }, { label: 'All-Star nods', n: c.allStars }, { label: 'Conn Smythes', n: c.connSmythes }],
  roleBadge: c => (c.role === 'backup' ? (c.pos === 'G' ? '🪑 Backup goalie' : '🪑 Fourth line') : (c.pos === 'G' ? '⭐ Number one' : '⭐ Top of the lineup')),
  careerSoFar: c => {
    const totals = nhlCareerTotals(c);
    return `${countOf(c.cups, 'Cup', 'Cups')} · ${countOf(c.harts, nhlMajorAward(c.pos).one, nhlMajorAward(c.pos).many)} · ${c.allStars} All-Star · ${c.pos === 'G' ? `${totals.wins} career wins` : `${totals.points.toLocaleString()} career points`}`;
  },
  hallLine: hof => (hof ? '🏛️ Hockey Hall of Fame' : 'No plaque in Toronto'),
  shareText: (c, legacy) =>
    `NHL My Career 🏒 ${c.name}: ${c.seasons.length} seasons, ${countOf(c.cups, 'Cup', 'Cups')}, ${countOf(c.harts, nhlMajorAward(c.pos).one, nhlMajorAward(c.pos).many)}. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/nhl-my-career`,
  retirementAvatar: false,
};

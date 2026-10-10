import { nflPreDraftDescriptor } from '@/lib/nflCareerPreDraft';
/**
 * Round 900: the NFL's binding for the one US career board.
 *
 * Everything here was in NflMyCareerBoard.tsx before the four boards became
 * one: the engine calls, and the words and numbers that are football's own.
 * The board (src/components/us-career/UsCareerBoard.tsx) imports no sport, and
 * this file is the only place the NFL route reaches the NFL engine from.
 */
import {
  NFL_ERAS, ARCHETYPES, startCareer, simSeason, progress, drawEvent, nflEventDeck,
  shouldRetire, legacyOf, careerTotals, rollTeamQuality, teamLabelOf,
  NFL_SPEND_ITEMS, buyNflItem, getNflSpendItem,
  buildNflFaWindow, nflFaPushArgs, buildNflExtension, nflExtPushArgs,
  nflAssignRole, nflCampBattle,
  type CareerPos, type CareerState, type SeasonLine,
} from '@/lib/nflMyCareer';
import { countOf, nflCareerSoFar, nflMajorAward, nflStatLine } from '@/lib/usCareerStatLine';
import { otherAwardsRow } from '@/lib/careerHub';
import { nflHeatLabel } from '@/lib/nflCareerCorruption';
import { NFL_MONEY, nflMoneyAct, nflMoneyWealth } from '@/lib/nflCareerMoney';
import { nflEarnedBadges, nflFanComments, nflFollowers, nflHeadlinesFor } from '@/lib/nflCareerLoop';
import { NFL_BADGES } from '@/lib/careerBadges';
import { nflUnreadInboxCount, answerNflInboxMessage, nflDraftNightInbox, NFL_CALENDAR } from '@/lib/nflCareerInbox';
import { dismissNflRivalryEvent, resolveNflRivalryChoice } from '@/lib/nflCareerRivalryEvents';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { repairBankOnLoad, withBankFloor } from '@/lib/usCareerBank';
import { NFL_CAREER_HALL } from '@/lib/nflCareerHall';
import { nflSeasonReview } from '@/lib/usCareerSeasonReview';
import { usSeasonHeldLine } from '@/data/usSeasonLengths';

/* The key this career saves under. It stays a named constant so the home
   page's Continue fence (simHomeFront section 7) can find where every save
   key in src is declared; the value is the one the old board used. */
const SAVE_KEY = 'nfl-my-career-save-v1';
/** Round 1149: the awards the Trophy Case tile already counts in a row of their own (the honours below), as
 *  the engine writes them. The league MVP and Defensive Player of the Year share one counter. */
const NFL_TILE_NAMED = ['MVP', 'All-Pro'];

/* Round 1104: built through withBankFloor, the one bank rule the four US
   careers share (src/lib/usCareerBank.ts). */
export const NFL_CAREER_SPORT: UsCareerSport<CareerState, SeasonLine> = withBankFloor({
  slug: 'nfl',
  label: 'NFL',
  saveKey: SAVE_KEY,
  gameSlug: 'nfl-my-career',
  gameName: 'NFL My Career',
  practiceLabel: 'Practice field',
  loadTraining: pos => import('@/lib/nflCareerTraining').then(m => m.nflTraining(pos as CareerPos)),
  /* The NFL has 32 clubs, so round one is 32. */
  firstRoundEnd: 32,
  create: {
    defaultName: 'Ryder Blaze',
    defaultPos: 'QB',
    /* Round 56: eight positions, each with its own stat line and money curve. */
    positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'],
    positionGridClass: 'grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1',
    positionButtonClass: 'rounded-xl px-2 py-1.5 text-sm font-bold transition-all',
    eras: NFL_ERAS,
    eraEmoji: '🏈',
    clubColor: '#10B981',
    archetypes: ARCHETYPES,
  },

  preDraft: nflPreDraftDescriptor,
  prospectRatings: (arch, rng) => {
    const a = arch as CareerState['archetype'];
    const rating = 66 + Math.floor(rng() * 8) + a.ovrBoost;
    return { rating, pot: Math.min(99, rating + 10 + Math.floor(rng() * 14) + a.potBoost) };
  },
  startCareer: (name, pos, arch, rng, appearance, eraId, entry) =>
    startCareer(name, pos as CareerPos, arch as CareerState['archetype'], rng, appearance, eraId as 'now' | 'y2005', entry),
  rollTeamQuality,
  assignRole: nflAssignRole,
  campBattle: nflCampBattle,
  simSeason,
  progress,
  drawEvent,
  eventDeck: nflEventDeck,
  /* Round 1038: up to three cards an offseason, each resting after it fires. */
  summer: { cards: 3, cooldowns: true, fallbackCooldown: 1 },
  shouldRetire,
  legacyOf,
  teamLabelOf,
  statLine: (s, pos) => nflStatLine(s, pos as CareerPos),
  reviewStats: (s, pos) => nflSeasonReview(s, pos as CareerPos),
  suspendedLine: c => ({
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
    awards: [], teamResult: 'SUSPENDED', salary: 0,
  }),
  suspendedNote: '🚫 Season served on the suspended list. No football, no money, no going back.',

  buildExtension: buildNflExtension,
  extPushArgs: nflExtPushArgs,
  buildFaWindow: buildNflFaWindow,
  faPushArgs: nflFaPushArgs,
  faSportNoun: 'franchise',
  seasonWord: 'season',

  money: NFL_MONEY,
  moneyAct: nflMoneyAct,
  moneyWealth: nflMoneyWealth,
  shopItems: NFL_SPEND_ITEMS,
  buyItem: buyNflItem,
  repairNetWorth: c => repairBankOnLoad(c, id => getNflSpendItem(id)?.cost ?? 0, NFL_MONEY),
  heatLabel: nflHeatLabel,
  heatTitle: 'League security',

  headlinesFor: nflHeadlinesFor,
  followers: nflFollowers,
  fanComments: nflFanComments,
  badges: NFL_BADGES,
  earnedBadges: nflEarnedBadges,

  /* Round 796: draft night's text lands before a down is played, drawn from
     the inbox's own keyed stream (so no rng is handed in). */
  draftNightInbox: c => nflDraftNightInbox(c),
  unreadInboxCount: nflUnreadInboxCount,
  answerInbox: answerNflInboxMessage,
  calendar: NFL_CALENDAR,
  dismissRivalryEvent: c => dismissNflRivalryEvent(c),
  resolveRivalryChoice: resolveNflRivalryChoice,

  ringsOf: c => c.rings,
  ringWord: 'ring',
  ringsLabel: 'rings',
  honours: c => [{ label: nflMajorAward(c.pos).many, n: c.mvps }, { label: 'All-Pros', n: c.allPros }, otherAwardsRow(c.seasons, NFL_TILE_NAMED)],
  /* Round 182: the depth chart, on the shirt. */
  roleBadge: c => (c.role === 'backup' ? '🪑 Backup' : '⭐ Starter'),
  careerSoFar: c =>
    `${countOf(c.rings, 'ring', 'rings')} · ${countOf(c.mvps, nflMajorAward(c.pos).one, nflMajorAward(c.pos).many)} · ${countOf(c.allPros, 'All-Pro', 'All-Pros')} · ${nflCareerSoFar(careerTotals(c), c.pos)}`,
  hallLine: hof => (hof ? '🏛️ Hall of Fame' : 'No bust in Canton'),
  shareText: (c, legacy) =>
    `NFL My Career 🏈 ${c.name}: ${c.seasons.length} seasons, ${countOf(c.rings, 'ring', 'rings')}, ${countOf(c.mvps, nflMajorAward(c.pos).one, nflMajorAward(c.pos).many)}. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/nfl-my-career`,
  retirementAvatar: true,
  /* Round 1039: the retirement talk, the farewell season and the Hall. */
  hall: NFL_CAREER_HALL,
  /* Round 1147: the Season Center, bound the way the NBA is. Its numbers load
     when he first watches a season; the held line is tiny and eager, so the
     hub can say a year has no game by game view before he presses. */
  loadSeasonCentre: () => import('@/lib/season/nfl').then(m => m.NFL_SEASON),
  seasonCentreHeld: year => usSeasonHeldLine('nfl', year),
});

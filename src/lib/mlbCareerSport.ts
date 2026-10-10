import { mlbPreDraftDescriptor } from '@/lib/mlbCareerPreDraft';
/**
 * Round 900: MLB's binding for the one US career board.
 *
 * Everything here was in MlbMyCareerBoard.tsx before the four boards became
 * one: the engine calls, and the words and numbers that are baseball's own.
 * The board (src/components/us-career/UsCareerBoard.tsx) imports no sport, and
 * this file is the only place the MLB route reaches the MLB engine from.
 */
import {
  MLB_ARCHETYPES, MLB_ERAS, startMlbCareer, simMlbSeason, mlbProgress, drawMlbEvent,
  mlbEventDeck,
  MLB_SPEND_ITEMS, buyMlbItem, getMlbSpendItem,
  mlbShouldRetire, mlbLegacyOf, mlbCareerTotals, mlbRollTeamQuality, mlbTeamLabelOf,
  buildMlbFaWindow, mlbFaPushArgs, buildMlbExtension, mlbExtPushArgs,
  mlbAssignRole, mlbCampBattle,
  type MlbCareerPos, type MlbCareerState, type MlbSeasonLine,
} from '@/lib/mlbMyCareer';
import { countOf, mlbCareerSoFar, mlbMajorAward, mlbStatLine } from '@/lib/usCareerStatLine';
import { otherAwardsRow } from '@/lib/careerHub';
import { mlbHeatLabel } from '@/lib/mlbCareerCorruption';
import { MLB_MONEY, mlbMoneyAct, mlbMoneyWealth } from '@/lib/mlbCareerMoney';
import { mlbEarnedBadges, mlbFanComments, mlbFollowers, mlbHeadlinesFor } from '@/lib/mlbCareerLoop';
import { MLB_BADGES } from '@/lib/careerBadges';
import { mlbUnreadInboxCount, answerMlbInboxMessage, mlbDraftNightInbox, MLB_CALENDAR } from '@/lib/mlbCareerInbox';
import { dismissMlbRivalryEvent, resolveMlbRivalryChoice } from '@/lib/mlbCareerRivalryEvents';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { slateField } from '@/lib/usSeasonShape';
import { repairBankOnLoad, withBankFloor } from '@/lib/usCareerBank';
import { MLB_CAREER_HALL } from '@/lib/mlbCareerHall';
import { mlbSeasonReview } from '@/lib/usCareerSeasonReview';

/* The key this career saves under. It stays a named constant so the home
   page's Continue fence (simHomeFront section 7) can find where every save
   key in src is declared; the value is the one the old board used. */
const SAVE_KEY = 'mlb-my-career-save-v1';
/** Round 1149: the awards the Trophy Case tile already counts in a row of their own (the honours below), as
 *  the engine writes them. A hitter's MVP and a pitcher's Cy Young share one counter. */
const MLB_TILE_NAMED = ['MVP', 'Cy Young', 'All-Star'];

/* Round 1104: built through withBankFloor, the one bank rule the four US
   careers share (src/lib/usCareerBank.ts). */
export const MLB_CAREER_SPORT: UsCareerSport<MlbCareerState, MlbSeasonLine> = withBankFloor({
  slug: 'mlb',
  label: 'MLB',
  saveKey: SAVE_KEY,
  gameSlug: 'mlb-my-career',
  gameName: 'MLB My Career',
  practiceLabel: 'Training diamond',
  loadTraining: pos => import('@/lib/mlbCareerTraining').then(m => m.mlbTraining(pos as MlbCareerPos)),
  firstRoundEnd: 30,
  create: {
    defaultName: 'Ace Diamond',
    defaultPos: 'CF',
    positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'],
    positionGridClass: 'grid grid-cols-6 gap-1 rounded-2xl bg-secondary p-1',
    positionButtonClass: 'rounded-xl px-1 py-1.5 text-xs font-bold transition-all',
    eras: MLB_ERAS,
    eraEmoji: '⚾',
    clubColor: '#DC2626',
    archetypes: MLB_ARCHETYPES,
  },

  preDraft: mlbPreDraftDescriptor,
  prospectRatings: (arch, rng) => {
    const a = arch as MlbCareerState['archetype'];
    const rating = 64 + Math.floor(rng() * 8) + a.ovrBoost;
    return { rating, pot: Math.min(99, rating + 12 + Math.floor(rng() * 14) + a.potBoost) };
  },
  startCareer: (name, pos, arch, rng, appearance, eraId, entry) =>
    startMlbCareer(name, pos as MlbCareerPos, arch as MlbCareerState['archetype'], rng, appearance, eraId as 'now' | 'y2004', entry),
  rollTeamQuality: mlbRollTeamQuality,
  assignRole: mlbAssignRole,
  campBattle: mlbCampBattle,
  simSeason: simMlbSeason,
  progress: mlbProgress,
  drawEvent: drawMlbEvent,
  eventDeck: mlbEventDeck,
  /* Round 1038: up to three cards an offseason, each resting after it fires. */
  summer: { cards: 3, cooldowns: true, fallbackCooldown: 1 },
  shouldRetire: mlbShouldRetire,
  legacyOf: mlbLegacyOf,
  teamLabelOf: mlbTeamLabelOf,
  statLine: (s, pos) => mlbStatLine(s, pos as MlbCareerPos),
  reviewStats: (s, pos) => mlbSeasonReview(s, pos as MlbCareerPos),
  suspendedLine: c => ({
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
    awards: [], teamResult: 'SUSPENDED', salary: 0,
    /* Round 1226: a season sat out still says how long it was (60 in 2020). */
    ...slateField('mlb', c.year, c.team),
  }),
  suspendedNote: '🚫 Season served on the suspended list. No baseball, no money, no going back.',

  buildExtension: buildMlbExtension,
  extPushArgs: mlbExtPushArgs,
  buildFaWindow: buildMlbFaWindow,
  faPushArgs: mlbFaPushArgs,
  faSportNoun: 'club',
  seasonWord: 'season',

  money: MLB_MONEY,
  moneyAct: mlbMoneyAct,
  moneyWealth: mlbMoneyWealth,
  shopItems: MLB_SPEND_ITEMS,
  buyItem: buyMlbItem,
  repairNetWorth: c => repairBankOnLoad(c, id => getMlbSpendItem(id)?.cost ?? 0, MLB_MONEY),
  heatLabel: mlbHeatLabel,
  heatTitle: "Commissioner's office",

  headlinesFor: mlbHeadlinesFor,
  followers: mlbFollowers,
  fanComments: mlbFanComments,
  badges: MLB_BADGES,
  earnedBadges: mlbEarnedBadges,

  /* Drawn from the inbox's own keyed stream, so no rng is handed in. */
  draftNightInbox: c => mlbDraftNightInbox(c),
  unreadInboxCount: mlbUnreadInboxCount,
  answerInbox: answerMlbInboxMessage,
  calendar: MLB_CALENDAR,
  dismissRivalryEvent: c => dismissMlbRivalryEvent(c),
  resolveRivalryChoice: resolveMlbRivalryChoice,

  ringsOf: c => c.rings,
  ringWord: 'ring',
  ringsLabel: 'rings',
  honours: c => [{ label: 'MVP or Cy Young awards', n: c.mvpCys }, { label: 'All-Star nods', n: c.allStars }, otherAwardsRow(c.seasons, MLB_TILE_NAMED)],
  /* A reliever is a bullpen arm whatever the depth chart says; a starter is in
     the rotation or a spot starter; everyone else plays every day or sits. */
  roleBadge: c => (c.pos === 'RP' ? '⭐ Bullpen arm'
    : c.role === 'backup' ? (c.pos === 'SP' ? '🪑 Spot starter' : '🪑 Bench bat')
    : (c.pos === 'SP' ? '⭐ In the rotation' : '⭐ Everyday')),
  careerSoFar: c =>
    `${countOf(c.rings, 'ring', 'rings')} · ${countOf(c.mvpCys, mlbMajorAward(c.pos).one, mlbMajorAward(c.pos).many)} · ${c.allStars} All-Star · ${mlbCareerSoFar(mlbCareerTotals(c), c.pos)}`,
  hallLine: hof => (hof ? '🏛️ Cooperstown' : 'No plaque in Cooperstown'),
  shareText: (c, legacy) =>
    `MLB My Career ⚾ ${c.name}: ${c.seasons.length} seasons, ${countOf(c.rings, 'ring', 'rings')}, ${countOf(c.mvpCys, mlbMajorAward(c.pos).one, mlbMajorAward(c.pos).many)}. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/mlb-my-career`,
  retirementAvatar: false,
  /* Round 1039: the retirement talk, the farewell season and the Hall. */
  hall: MLB_CAREER_HALL,
});

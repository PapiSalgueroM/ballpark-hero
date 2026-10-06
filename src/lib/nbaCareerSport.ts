import { nbaPreDraftDescriptor } from '@/lib/nbaCareerPreDraft';
/**
 * Round 900: the NBA's binding for the one US career board.
 *
 * Everything here was in NbaMyCareerBoard.tsx before the four boards became
 * one: the engine calls, and the words and numbers that are basketball's own.
 * The board (src/components/us-career/UsCareerBoard.tsx) imports no sport, and
 * this file is the only place the NBA route reaches the NBA engine from.
 */
import {
  NBA_ERAS, NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, drawNbaEvent,
  nbaEventDeck,
  NBA_SPEND_ITEMS, buyNbaItem, getNbaSpendItem, repairNetWorth,
  nbaShouldRetire, nbaLegacyOf, nbaCareerTotals, nbaRollTeamQuality, nbaTeamLabelOf,
  buildNbaFaWindow, nbaFaPushArgs, buildNbaExtension, nbaExtPushArgs,
  nbaAssignRole, nbaCampBattle,
  type NbaCareerPos, type NbaCareerState, type NbaSeasonLine,
} from '@/lib/nbaMyCareer';
import { countOf, nbaStatLine } from '@/lib/usCareerStatLine';
import { nbaHeatLabel } from '@/lib/nbaCareerCorruption';
import { NBA_MONEY, nbaMoneyAct, nbaMoneyWealth } from '@/lib/nbaCareerMoney';
import { nbaEarnedBadges, nbaFanComments, nbaFollowers, nbaHeadlinesFor } from '@/lib/nbaCareerLoop';
import { NBA_BADGES } from '@/lib/careerBadges';
import { nbaUnreadInboxCount, answerNbaInboxMessage, nbaDraftNightInbox, NBA_CALENDAR } from '@/lib/nbaCareerInbox';
import { dismissNbaRivalryEvent, resolveNbaRivalryChoice } from '@/lib/nbaCareerRivalryEvents';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { nbaSeasonReview } from '@/lib/usCareerSeasonReview';

/* The key this career saves under. It stays a named constant so the home
   page's Continue fence (simHomeFront section 7) can find where every save
   key in src is declared; the value is the one the old board used. */
const SAVE_KEY = 'nba-my-career-save-v1';

export const NBA_CAREER_SPORT: UsCareerSport<NbaCareerState, NbaSeasonLine> = {
  slug: 'nba',
  label: 'NBA',
  saveKey: SAVE_KEY,
  gameSlug: 'nba-my-career',
  gameName: 'NBA My Career',
  practiceLabel: 'Practice gym',
  loadTraining: pos => import('@/lib/nbaCareerTraining').then(m => m.nbaTraining(pos as NbaCareerPos)),
  /* The NBA drafts 30 in round one. */
  firstRoundEnd: 30,
  create: {
    defaultName: 'Trey Buckets',
    defaultPos: 'PG',
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    positionGridClass: 'grid grid-cols-5 gap-1 rounded-2xl bg-secondary p-1',
    positionButtonClass: 'rounded-xl px-1 py-1.5 text-sm font-bold transition-all',
    eras: NBA_ERAS,
    eraEmoji: '🏀',
    clubColor: '#F97316',
    archetypes: NBA_ARCHETYPES,
  },

  preDraft: nbaPreDraftDescriptor,
  prospectRatings: (arch, rng) => {
    const a = arch as NbaCareerState['archetype'];
    const rating = 68 + Math.floor(rng() * 8) + a.ovrBoost;
    return { rating, pot: Math.min(99, rating + 10 + Math.floor(rng() * 13) + a.potBoost) };
  },
  startCareer: (name, pos, arch, rng, appearance, eraId, entry) =>
    startNbaCareer(name, pos as NbaCareerPos, arch as NbaCareerState['archetype'], rng, appearance, eraId as 'now' | 'y2004', entry),
  rollTeamQuality: nbaRollTeamQuality,
  /* Round 182: the rotation is set the night you arrive. */
  assignRole: nbaAssignRole,
  campBattle: nbaCampBattle,
  simSeason: simNbaSeason,
  progress: nbaProgress,
  drawEvent: drawNbaEvent,
  eventDeck: nbaEventDeck,
  /* Round 1038: up to three cards an offseason, each resting after it fires. */
  summer: { cards: 3, cooldowns: true, fallbackCooldown: 1 },
  shouldRetire: nbaShouldRetire,
  legacyOf: nbaLegacyOf,
  teamLabelOf: nbaTeamLabelOf,
  statLine: s => nbaStatLine(s),
  reviewStats: s => nbaSeasonReview(s),
  suspendedLine: c => ({
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
    ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0,
  }),
  suspendedNote: '🚫 Season served on the suspended list. No basketball, no money, no going back.',

  buildExtension: buildNbaExtension,
  extPushArgs: nbaExtPushArgs,
  buildFaWindow: buildNbaFaWindow,
  faPushArgs: nbaFaPushArgs,
  faSportNoun: 'franchise',
  seasonWord: 'season',

  money: NBA_MONEY,
  moneyAct: nbaMoneyAct,
  moneyWealth: nbaMoneyWealth,
  shopItems: NBA_SPEND_ITEMS,
  buyItem: buyNbaItem,
  repairNetWorth: c => repairNetWorth(c, id => getNbaSpendItem(id)?.cost ?? 0),
  heatLabel: nbaHeatLabel,
  heatTitle: 'League integrity',

  headlinesFor: nbaHeadlinesFor,
  followers: nbaFollowers,
  fanComments: nbaFanComments,
  badges: NBA_BADGES,
  earnedBadges: nbaEarnedBadges,

  /* Round 822: draft night's texts (the draft, and the summer league that
     follows it) land before a game is played, drawn from the inbox's own
     keyed stream (so no rng is handed in). */
  draftNightInbox: c => nbaDraftNightInbox(c),
  unreadInboxCount: nbaUnreadInboxCount,
  answerInbox: answerNbaInboxMessage,
  calendar: NBA_CALENDAR,
  dismissRivalryEvent: c => dismissNbaRivalryEvent(c),
  resolveRivalryChoice: resolveNbaRivalryChoice,

  ringsOf: c => c.rings,
  ringWord: 'ring',
  ringsLabel: 'rings',
  honours: c => [{ label: 'MVPs', n: c.mvps }, { label: 'All-NBA nods', n: c.allNbas }],
  roleBadge: c => (c.role === 'backup' ? '🪑 Second unit' : '⭐ Starting five'),
  careerSoFar: c =>
    `${countOf(c.rings, 'ring', 'rings')} · ${countOf(c.mvps, 'MVP', 'MVPs')} · ${c.allNbas} All-NBA · ${nbaCareerTotals(c).pts.toLocaleString()} career points`,
  hallLine: hof => (hof ? '🏛️ Hall of Fame' : 'No jacket in Springfield'),
  shareText: (c, legacy) =>
    `NBA My Career 🏀 ${c.name}: ${c.seasons.length} seasons, ${countOf(c.rings, 'ring', 'rings')}, ${countOf(c.mvps, 'MVP', 'MVPs')}. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/nba-my-career`,
  retirementAvatar: false,
};

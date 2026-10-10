/**
 * Round 900: what a sport hands the one US career board.
 *
 * NflMyCareerBoard, NbaMyCareerBoard, MlbMyCareerBoard and NhlMyCareerBoard
 * were four copies of one 1,090 line file, 83 percent identical. The board is
 * now src/components/us-career/UsCareerBoard.tsx, and everything the four
 * copies really differed in is a field here. A new screen is wired once, in
 * the board; a new sport is one binding (nflCareerSport.ts and its three
 * siblings), never an `if (sport.slug === ...)` inside the board.
 *
 * This file and the board import no sport, and a route reaches only its own
 * binding (scripts/simUsCareerWeight.mjs fences those direct imports). The
 * coach career still loads the NFL engine and the other sports' conquest data
 * on all four routes through usCareerToCoach.ts, as it did before Round 900.
 *
 * The save is untouched by any of this: the four keys, the shape
 * { c, phase, teamQuality, coach } and the restore rule are exactly what
 * they were, and scripts/simUsBoardParity.mjs replays a fixture recorded from
 * the four old boards to hold that.
 */
import type { CareerDraftEntry, PreDraftDescriptor, PreDraftState } from '@/lib/careerPreDraft';
import type { PlayerAppearance } from '@/lib/soccerCareerAppearance';
import type { CareerRival } from '@/lib/careerRival';
import type { InboxBeat, InboxMessage } from '@/lib/careerInbox';
import type { RivalryEvent } from '@/lib/careerRivalryEvents';
import type { RivalryChoiceCard } from '@/lib/careerRivalryChoices';
import type { MoneyAction, MoneyOutcome, MoneySport } from '@/lib/careerMoney';
import type { BadgeDef } from '@/lib/careerBadges';
import type { FaPushArgs, FaWindow } from '@/lib/usCareerFreeAgency';
import type { ExtPushArgs, ExtensionTalk } from '@/lib/usCareerExtension';
import type { UsSport } from '@/lib/usCareerToCoach';
import type { TrainingBank, TrainingSport } from '@/lib/careerTraining';
import type { CareerReviewStats } from '@/lib/usCareerSeasonReview';
import type { RetirementBlock } from '@/lib/careerRetirement';
import type { HallCalibration, HallSpeechBlock, LegacyRead, NumberRetiredBy, UsHallSport } from '@/lib/careerHallOfFame';
import type { UsSeasonBind } from '@/lib/season/us';

export interface UsCareerPracticeResult extends TrainingBank {
  year: number;
  drill: string;
  score: number;
  before: number;
}

/** The part of a season line every sport writes. Each sport adds its own stats. */
export interface UsCareerSeason {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  awards: string[];
  teamResult: string;
  salary: number;
}

/** The part of a career every sport keeps, which is all the board reads by name. */
export interface UsCareerCore {
  name: string;
  pos: string;
  team: string;
  year: number;
  age: number;
  ovr: number;
  morale: number;
  pot: number;
  /** Optional on old saves. The year is also the once-per-season bank guard. */
  practice?: UsCareerPracticeResult;
  fanbase: number;
  health: number;
  salary: number;
  contractYears: number;
  seasons: UsCareerSeason[];
  retired: boolean;
  draftPick: number;
  prospect?: PreDraftState;
  earnings: number;
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  suspendedSeasons?: number;
  purchased?: string[];
  appearance?: PlayerAppearance | null;
  yearlyCosts?: number;
  rival?: CareerRival;
  eraId?: string;
  role?: 'starter' | 'backup';
  headlines?: string[];
  phoneInbox?: InboxMessage[];
  karma?: number;
  pendingRivalryEvent?: RivalryEvent | null;
  pendingRivalryChoice?: RivalryChoiceCard | null;
  /** Round 1038: the offseason being dealt (src/lib/usCareerSummer.ts), so a
   *  reload opens on the card it left. Optional: old saves have none. */
  summer?: UsCareerSummer;
  /** Round 1038: the season each card (or story) last fired, the flagship's
   *  format ('story:' plus the story, or the card id). Optional. */
  eventLastFired?: Record<string, number>;
  /** Round 1038: drawn once when a career starts, so two careers with the
   *  same name, position, pick and first year are dealt different summers. */
  summerSalt?: string;
  /** Round 1039: the retirement talk's answers (src/lib/careerRetirement.ts).
   *  Optional: an old save reads as never asked. */
  retirement?: RetirementBlock;
  /** Round 1039: the induction speech, given once. Optional. */
  hallSpeech?: HallSpeechBlock;
  /** Round 1039: the club that retired the number on a deck card. Optional. */
  numberRetiredBy?: NumberRetiredBy;
  /** Round 1051: the legacy calibration this career retired on, stamped once
   *  at retirement (src/lib/careerHallOfFame.ts). Optional: a retired save
   *  with none retired before the round and is read on calibration 1. */
  hallCal?: HallCalibration;
}

/** Round 1038: one offseason's cards, as ids, and how many are answered. */
export interface UsCareerSummer {
  year: number;
  ids: string[];
  at: number;
  /** How many dealt cards were skipped because the career moved past them.
   *  Every skip sits before `at`, so the board counts 'card N of M' over the
   *  cards you actually get. Optional: a summer with no skip has none. */
  gone?: number;
}

/** Round 1038: how a sport deals its offseason. cards 1 with cooldowns off
 *  is the one-card offseason every US career had before this round, draw for
 *  draw (the parity replay mounts each binding that way). */
export interface UsSummerKnob {
  /** Most cards one offseason deals. */
  cards: number;
  /** Whether a card sits out its cooldown after it fires. */
  cooldowns: boolean;
  /** Seasons an untagged card (the base and corruption cards) rests. */
  fallbackCooldown: number;
}

export interface UsCareerArchetype { id: string; label: string; desc: string }
export interface UsCareerEra { id: string; label: string; blurb: string }
export interface UsCareerLegacy { score: number; verdict: string; hof: boolean; bullets: string[]; standout?: LegacyRead['standout'] }

/** One crossroads card. `apply` writes the choice onto the career and returns the feed line. */
export interface UsCareerEvent<C> {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: C, rng: () => number) => string }[];
  /** Round 1038: the tags the life decks carry (Rounds 917 to 920), read by
   *  the summer's cooldown ledger, and the press room's mark. All optional. */
  category?: string;
  cooldown?: number;
  story?: string;
  press?: 'big' | 'small';
  /** Round 1038: set on the corruption deck's cards; the summer deals them as card 1 only. */
  corruption?: boolean;
}

/** One thing in the shop. The seven aisles are the same in every sport. */
export interface UsShopItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
  cost: number;
  yearly?: number;
  desc: string;
  oneTime: boolean;
  minNetWorth?: number;
  minFanbase?: number;
  requiresDirty?: boolean;
  effect?: string;
}

/** What the create screen draws. */
export interface UsCareerCreate {
  /** The name a player who types nothing is given. */
  defaultName: string;
  defaultPos: string;
  /** Every position, in the order the buttons are drawn. */
  positions: string[];
  /** The grid the position buttons sit in, and each button's own classes:
   *  five positions fit a row that eight or eleven do not. */
  positionGridClass: string;
  positionButtonClass: string;
  eras: UsCareerEra[];
  /** The mark on the present day era button. The throwback is always the same. */
  eraEmoji: string;
  /** The colour behind the face on the create screen and on the hub. */
  clubColor: string;
  archetypes: Record<string, UsCareerArchetype[]>;
}

/**
 * One sport's binding. C is the sport's own career state and L its season
 * line; the board holds them as the core shapes above and hands them back to
 * these functions untouched.
 *
 * Every function that takes an rng is given Math.random by the board, in the
 * order the old boards drew: the fixture is seeded, and one draw added, dropped
 * or moved turns the replay red.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UsCareerSport<C extends UsCareerCore = any, L extends UsCareerSeason = any> {
  /** 'nfl', which is also the id the coach career runs on. */
  slug: UsSport;
  /** 'NFL', as the two confirmations print it. */
  label: 'NFL' | 'NBA' | 'MLB' | 'NHL';
  /** The localStorage key, verbatim: `{slug}-my-career-save-v1`. */
  saveKey: string;
  /** 'nfl-my-career': the completion slug, and the route with a slash in front. */
  gameSlug: string;
  /** 'NFL My Career', for the share button. */
  gameName: string;
  /** How long round one of this sport's draft is. */
  firstRoundEnd: number;
  create: UsCareerCreate;
  practiceLabel: string;
  loadTraining(pos: string): Promise<TrainingSport>;

  preDraft(eraId: string): PreDraftDescriptor;
  prospectRatings(arch: UsCareerArchetype, rng: () => number): { rating: number; pot: number };

  /* The engine. */
  startCareer(name: string, pos: string, arch: UsCareerArchetype, rng: () => number, appearance: PlayerAppearance, eraId: string, entry?: CareerDraftEntry): C;
  rollTeamQuality(prev: number | null, rng: () => number): number;
  assignRole(c: C, teamQuality: number, rng: () => number): string;
  campBattle(c: C, teamQuality: number, rng: () => number): string | null;
  simSeason(c: C, teamQuality: number, rng: () => number): { line: L; notes: string[] };
  progress(c: C, rng: () => number): string[];
  drawEvent(c: C, rng: () => number): UsCareerEvent<C>;
  /** Round 1038: every card drawEvent could have picked, built with the same
   *  draws, so a dealt card can be found again by id. */
  eventDeck(c: C, rng: () => number): UsCareerEvent<C>[];
  /** Round 1038: how this sport deals its offseason. */
  summer: UsSummerKnob;
  shouldRetire(c: C): boolean;
  legacyOf(c: C): UsCareerLegacy;
  teamLabelOf(abbr: string, eraId?: string): string;
  statLine(s: L, pos: string): string;
  reviewStats(s: L, pos: string): CareerReviewStats;
  /** The season line a banned year writes. Its keys and their order are on
   *  the save, so each sport builds its own. */
  suspendedLine(c: C): L;
  /** The feed line a banned year opens with. */
  suspendedNote: string;

  /* Contracts. */
  buildExtension(c: C, rng: () => number): ExtensionTalk;
  extPushArgs(c: C, rng: () => number): ExtPushArgs;
  buildFaWindow(c: C, incumbentQuality: number, rng: () => number): FaWindow;
  faPushArgs(c: C, rng: () => number): FaPushArgs;
  /** "franchise", "club" or "team": what the market calls who is bidding. */
  faSportNoun: string;
  /** What the extension card calls a year of play. */
  seasonWord: string;

  /* Money and the shop. */
  money: MoneySport<C>;
  moneyAct(c: C, action: MoneyAction): MoneyOutcome;
  moneyWealth(c: C): number;
  shopItems: UsShopItem[];
  buyItem(c: C, itemId: string): { state: C; log: string } | null;
  /** Round 422's repair on load: rebuild a balance the old upkeep bug drove
   *  below zero. Each sport has its own (its own take home rate and its own
   *  price list). A healthy save comes back untouched. */
  repairNetWorth(c: C): C;
  heatLabel(h: number): { label: string; tone: string; blurb: string };
  /** Who is watching, above the heat meter. */
  heatTitle: string;

  /* The paper, the gram, the badges. */
  headlinesFor(c: C, line: L): string[];
  followers(c: C): number;
  fanComments(c: C): string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  badges: BadgeDef<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  earnedBadges(c: C): BadgeDef<any>[];

  /* The inbox and the rival. */
  draftNightInbox(c: C): unknown;
  unreadInboxCount(c: C): number;
  answerInbox(c: C, msgId: string, choiceIdx: number): string | null;
  calendar: InboxBeat[];
  dismissRivalryEvent(c: C): { state: C; lines: string[] };
  resolveRivalryChoice(c: C, choiceIdx: number, rng: () => number): { state: C; line: string } | null;

  /* The words and numbers the four boards really differed in. */
  /** Championships won: rings in three sports, Cups in the NHL. */
  ringsOf(c: C): number;
  /** "ring" or "Cup", for the trophy case, the rival card and the hub. */
  ringWord: string;
  /** The label under that count on the My Player screen: "rings" or "Cups". */
  ringsLabel: string;
  /** The honours the Trophy Case box counts. */
  honours(c: C): { label: string; n: number }[];
  /** The depth chart badge on the hub: "⭐ Starter", "🪑 Second unit". */
  roleBadge(c: C): string;
  /** Everything after "Career so far: " under the Play button. */
  careerSoFar(c: C): string;
  /** The second pill on the retirement card, for a Hall of Famer and for everyone else. */
  hallLine(hof: boolean): string;
  /** The share button's text on the retirement card. */
  shareText(c: C, legacy: UsCareerLegacy): string;
  /** Whether the retirement card draws the player's face. Only the NFL board
   *  ever did, so only the NFL binding says yes (Round 900 moved the boards
   *  and changed nothing a player sees). */
  retirementAvatar: boolean;
  /** Round 1039: the retirement talk, the farewell season and the Hall of
   *  Fame (src/lib/careerHallOfFame.ts). Optional, so the parity replay can
   *  mount a binding without it and play the old board draw for draw. */
  hall?: UsHallSport<C>;
  /** Round 1048: the Season Center's numbers for this sport (src/lib/season/us.ts), loaded when he first
   *  watches a season. Optional: a binding without it shows no button, which is MLB and the NHL today. */
  loadSeasonCentre?: () => Promise<UsSeasonBind>;
  /** Round 1048: why the coming season has no game by game view (its real length is not the one this
   *  career plays), or null. Tiny and eager, from src/data/usSeasonLengths.ts. Absent: never held.
   *  Round 1212: handed who is asking as well (his position and his club of that season), for a position
   *  or a club the view cannot show yet. A binding that takes fewer arguments ignores the rest. */
  seasonCentreHeld?: (year: number, eraId?: string, who?: { pos: string; team: string }) => string | null;
}

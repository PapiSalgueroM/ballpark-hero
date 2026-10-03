/**
 * Round 916: the loop that joins the life layer to the fight.
 *
 * fightCareerLife.ts is the block, the effects and the deck. The inbox and
 * the rival each import it. This file sits above all three and is the only
 * one the board calls to move a career forward: start one, run a camp, take a
 * fight. Each wrapper calls the function fightCareer.ts always had and then
 * does the life's part, so the bout engine is shared with Fight Gym and Fight
 * Promoter exactly as it was.
 */

import {
  newFightCareer, runCamp, takeFight,
  type FightCareerState, type CampPlan, type Tactic, type BoutResult, type Offer,
  type WeightId, type FightStyle,
} from '@/lib/fightCareer';
import {
  newLife, cloneForLife, dressOffers, dealLifeCards, settleCampCarry, lifeFightMods, lifeTakeHome,
  managerDef, pendingLifeCard, pushLifeFeed, ensureLife, GRUDGE_LABEL,
  type FightLife, type TrainerId, type ManagerId, type LifeCardDef,
} from '@/lib/fightCareerLife';
import { round2, buyUpgrade, MAX_UPGRADE_LEVEL, upgradeLevel, UPGRADES, type UpgradeId } from '@/lib/fightCareerMoney';
import { fightInboxTick, answerFightInbox } from '@/lib/fightCareerInbox';
import { fightRivalryTick, rivalFightNight, settleGrudge, FIGHT_RIVALRY_CHOICES } from '@/lib/fightCareerRivalry';
import { earnedBadges, type BadgeDef } from '@/lib/careerBadges';
import type { RivalryEvent } from '@/lib/careerRivalryEvents';
import type { RivalryChoiceCard } from '@/lib/careerRivalryChoices';

type Live = FightCareerState & { life: FightLife };

const meter = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

/** How far morale settles back toward 50 after a fight. */
export const MORALE_DRIFT = 2;

/** A new career with its corner picked. */
export function lifeNewCareer(
  name: string, weight: WeightId, style: FightStyle,
  trainer: TrainerId = 'allround', manager: ManagerId = 'family', seedLabel?: string,
): Live {
  const base = newFightCareer(name, weight, style, seedLabel);
  const st = cloneForLife({ ...base, life: newLife(base, trainer, manager) });
  dressOffers(st);
  return st;
}

/** The camp, then the specialty of the trainer and the shop's coaches on top. */
export function lifeRunCamp(st: FightCareerState, plan: CampPlan): Live {
  const live = cloneForLife(st);
  const after = cloneForLife(runCamp(live, plan));
  settleCampCarry(live, after, plan);
  return after;
}

/** What the crowd makes of a night. */
export function fansAfter(life: FightLife, won: boolean, drew: boolean, stoppage: boolean, wonTitle: boolean): number {
  const swing = won ? 2 + (stoppage ? 2 : 0) + (wonTitle ? 8 : 0) : drew ? 0 : -1;
  return meter(life.fanbase + swing + managerDef(life.manager.kind).fansPerFight);
}

/**
 * The fight, and then everything that follows it: the purse reaches the bank
 * less the corner's share, the crowd reacts, the one-fight flags clear, the
 * rival has his own night, and the next gap's texts, rival card and deck are
 * put on the save. Nothing in the second half touches the bout's stream.
 */
export function lifeTakeFight(st: FightCareerState, offerId: string, tactics: Tactic[]): {
  state: Live; result: BoutResult; offer: Offer; takeHome: number;
} | null {
  const before = cloneForLife(st);
  const res = takeFight(before, offerId, tactics, lifeFightMods(before));
  if (!res) return null;
  const next = cloneForLife(res.state);
  const life = next.life;
  const { offer, result } = res;
  const won = result.winner === 'player';
  const drew = result.winner === 'draw';
  const stoppage = result.method === 'KO' || result.method === 'TKO';

  const takeHome = lifeTakeHome(next, offer.purse);
  life.bank = round2(life.bank + takeHome);
  life.fanbase = fansAfter(life, won, drew, stoppage, won && offer.title && !before.champion);
  life.sharp = 0;
  /* Morale settles back toward 50 after every fight, so a mood is something
     kept up, not something banked once and owned for a career. */
  life.morale = life.morale > 50 ? Math.max(50, life.morale - MORALE_DRIFT) : Math.min(50, life.morale + MORALE_DRIFT);
  if (life.promoterFights > 0) life.promoterFights -= 1;
  if (!won && !drew) life.lastBeatenBy = { ...offer.opponent, wins: offer.opponent.wins + 1 };
  if (offer.label === GRUDGE_LABEL) {
    settleGrudge(life, won, drew);
    life.rivalryIntensity = meter(life.rivalryIntensity + 10);
  }
  const rivalLine = rivalFightNight(next, life);
  if (rivalLine) pushLifeFeed(life, rivalLine);

  if (next.retired) {
    life.pending = [];
    life.pendingRivalryChoice = null;
    life.pendingRivalryEvent = null;
    return { state: next, result, offer, takeHome };
  }
  dressOffers(next);
  const beats = [
    next.fightNo === 1 ? 'debut' : '',
    won && offer.title ? 'title' : '',
    won ? 'win' : drew ? '' : 'loss',
    'gym',
  ].filter(Boolean);
  fightInboxTick(next, life, beats);
  fightRivalryTick(next);
  dealLifeCards(next);
  return { state: next, result, offer, takeHome };
}

/* ─────────────────────────── what is waiting ─────────────────────────── */

export type LifeStep =
  | { kind: 'beat'; event: RivalryEvent }
  | { kind: 'choice'; card: RivalryChoiceCard }
  | { kind: 'card'; card: LifeCardDef };

/** The next thing the gap has to show, in a fixed order, read off the save:
 *  the rival's beat, the rival's choice, then the deck. Null when it is clear. */
export function nextLifeStep(st: FightCareerState): LifeStep | null {
  const life = st.life;
  if (!life || st.retired) return null;
  if (life.pendingRivalryEvent) return { kind: 'beat', event: life.pendingRivalryEvent };
  if (life.pendingRivalryChoice) return { kind: 'choice', card: life.pendingRivalryChoice };
  const card = pendingLifeCard(st);
  return card ? { kind: 'card', card } : null;
}

/**
 * A save as the board opens it: ensureLife, then the two waiting slots the
 * deck module cannot check because they belong to the rival module. A rival
 * choice whose id this build does not know (a damaged save, or a later round
 * renaming one) and a beat with no rival behind it can never be answered, and
 * the hub shows the waiting step and nothing else, so either would stop the
 * career. Both are cleared here; everything else is ensureLife's.
 */
export function lifeLoadState(st: FightCareerState): Live {
  const live = ensureLife(st);
  const life = live.life;
  if (life.pendingRivalryChoice && !FIGHT_RIVALRY_CHOICES.some(d => d.id === life.pendingRivalryChoice?.id)) {
    life.pendingRivalryChoice = null;
  }
  if (life.pendingRivalryEvent && !life.rival) life.pendingRivalryEvent = null;
  return live;
}

/* ─────────────────────────── the shop and the phone ─────────────────────────── */

export function lifeBuyUpgrade(st: FightCareerState, id: UpgradeId): Live | null {
  const next = cloneForLife(st);
  const line = buyUpgrade(next.life, id);
  if (!line) return null;
  pushLifeFeed(next.life, line);
  return next;
}

export function lifeAnswerInbox(st: FightCareerState, msgId: string, choiceIdx: number): Live | null {
  const next = cloneForLife(st);
  const line = answerFightInbox(next, next.life, msgId, choiceIdx);
  if (!line) return null;
  next.life.decisions += 1;
  pushLifeFeed(next.life, line);
  return next;
}

/* ─────────────────────────── badges, on careerBadges ─────────────────────────── */

/** What the badge table reads. Built from the save, nothing stored twice. */
export interface FightBadgeFacts {
  fights: number;
  wins: number;
  losses: number;
  kos: number;
  champion: boolean;
  titleWins: number;
  defences: number;
  damage: number;
  retired: boolean;
  bank: number;
  fans: number;
  classMoves: number;
  /** World titles won after your first change of class. */
  titlesAfterMove: number;
  rivalWins: number;
  maxedUpgrades: number;
  decisions: number;
}

export function fightBadgeFacts(st: FightCareerState): FightBadgeFacts {
  const live = cloneForLife(st);
  const f = live.fighter;
  return {
    fights: live.fightNo,
    wins: f.wins, losses: f.losses, kos: f.kos,
    champion: live.champion,
    titleWins: live.history.filter(h => h.title && h.result === 'W').length,
    defences: live.titleDefences,
    damage: f.damage,
    retired: live.retired,
    bank: live.life.bank,
    fans: live.life.fanbase,
    classMoves: live.life.classMoves,
    /* A history line's `no` is the fight's own number, 1 first; firstMoveAt is
       how many fights were done when the move was made. */
    titlesAfterMove: live.life.firstMoveAt === undefined ? 0
      : live.history.filter(h => h.title && h.result === 'W' && h.no > (live.life.firstMoveAt ?? 0)).length,
    rivalWins: live.life.rival?.h2hWins ?? 0,
    maxedUpgrades: UPGRADES.filter(u => upgradeLevel(live.life, u.id) >= MAX_UPGRADE_LEVEL).length,
    decisions: live.life.decisions,
  };
}

export const FIGHT_BADGES: BadgeDef<FightBadgeFacts>[] = [
  { id: 'fb-first-win', emoji: '🥇', label: 'Off the mark', blurb: 'Won a professional fight.', test: f => f.wins >= 1 },
  { id: 'fb-ten-wins', emoji: '🔟', label: 'Ten up', blurb: 'Ten professional wins.', test: f => f.wins >= 10 },
  { id: 'fb-ten-kos', emoji: '💥', label: 'Heavy hands', blurb: 'Ten wins inside the distance.', test: f => f.kos >= 10 },
  { id: 'fb-unbeaten', emoji: '🧼', label: 'Still perfect', blurb: 'Ten fights in and nobody has beaten you.', test: f => f.fights >= 10 && f.losses === 0 },
  { id: 'fb-champion', emoji: '🏆', label: 'World champion', blurb: 'Won a world title.', test: f => f.titleWins >= 1 },
  { id: 'fb-defender', emoji: '🛡️', label: 'A proper reign', blurb: 'Three successful title defences.', test: f => f.defences >= 3 },
  { id: 'fb-two-weights', emoji: '⚖️', label: 'Moved and won', blurb: 'Changed weight class, then won a world title.', test: f => f.titlesAfterMove >= 1 },
  { id: 'fb-rival', emoji: '😤', label: 'Settled it', blurb: 'Beat your rival in the ring.', test: f => f.rivalWins >= 1 },
  { id: 'fb-crowd', emoji: '📣', label: 'A following', blurb: 'Sixty fans on the meter.', test: f => f.fans >= 60 },
  { id: 'fb-banker', emoji: '🏦', label: 'Kept some of it', blurb: 'A million in the bank at once.', test: f => f.bank >= 1 },
  { id: 'fb-full-corner', emoji: '🧰', label: 'A full corner', blurb: 'Took one camp upgrade to its top level.', test: f => f.maxedUpgrades >= 1 },
  { id: 'fb-long-road', emoji: '🛣️', label: 'The long road', blurb: 'Thirty professional fights.', test: f => f.fights >= 30 },
  { id: 'fb-got-out', emoji: '🚶', label: 'Got out clean', blurb: 'Retired after ten or more fights with damage under 40.', test: f => f.retired && f.fights >= 10 && f.damage < 40 },
  { id: 'fb-busy-life', emoji: '🗂️', label: 'A busy life', blurb: 'Answered fifty cards and texts.', test: f => f.decisions >= 50 },
];

export const fightBadgesEarned = (st: FightCareerState): BadgeDef<FightBadgeFacts>[] =>
  earnedBadges(FIGHT_BADGES, fightBadgeFacts(st));

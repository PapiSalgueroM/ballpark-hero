/**
 * Round 987: the NHL Front Office takes the GM desk. The first bind.
 *
 * The four shared GM modules (the seam of Round 907, the re-sign desk of
 * 908, the pick ledger, packages and deadline of 909, the staff of 910) were
 * built for every front office and bound to none. This file is the NHL half
 * of the bind: what the board hands the desk and what the desk hands the
 * engine back. The screens are components/nhl-front-office/NhlGmDesk.tsx.
 * Nothing in here draws from Math.random: every roll is a hash, so a board
 * that binds this moves none of its own seeded streams by a single draw.
 *
 * THE PROMISE TO AN OLD SAVE. A save written before this round has no `gm`
 * field, and while it has none the board plays exactly as it always did:
 * the same calls, the same draws, the same coin flip at the summer. The
 * desk is switched on by the GM, the first time he opens one of its boxes
 * (openNhlDesk). From then on four blocks ride on the save:
 *   contracts  the re-sign ledger (gmContracts): his expiring men go to the
 *              desk, never to the engine's coin flip
 *   picks      the pick ledger (gmPicks) over this game's two round draft
 *   staff      the staff block (gmStaff) and the purse it is paid from
 *   retained   the salary a club keeps paying on a man it traded away
 * Each block is validated alone and a corrupt one resets alone (gmBlock).
 *
 * scripts/simNhlGmDesk.mjs holds every promise in here to the engine.
 */
import { type GmDesk, type GmTileFace, freshGmDesk, gmBlock, withGmBlock } from './gmDesk';
import {
  type GmContractLedger, type GmDecision, autoDecide, expiringMen, isValidLedger, noteArrival, openLedger,
  runDeskOffseason, undecided,
} from './gmContracts';
import { nhlContractHost } from './gmContractsHostNhl';
import {
  type GmPickLedger, type GmPickRules, NHL_PICK_RULES, findPick, migrateLegacyPicks, movePicks, pickKey,
  picksHeldBy, rollLedger, validateLedger,
} from './gmPicks';
import {
  NHL_DEADLINE, type DeadlineStance, deadlineStances, stanceValue, tradeWindow, type TradeWindow,
} from './gmDeadline';
import {
  NHL_TRADE_RULES, type PackageContext, type PackageVerdict, type PickValueCurve, type TradeAsset, type TradePackage,
  evaluatePackage, pickValueAt, proposePackage, splitRetained,
} from './gmTradePackage';
import {
  type GmStaffBlock, type GmStaffCtx, gmDefaultStaff, gmHashFloat, gmInjuryWeeks, gmIsValidStaff, gmRolloverStaff,
  gmScoutNoise, gmStaffEffect, gmStaffLevel, gmStatureAnchor, gmSummerWalk, gmTickStaff,
} from './gmStaff';
import { tradeRefusal } from './frontOfficeCuts';
import { NHL_ENTRY_LEVEL_YEARS } from './gmContractRules';
import { NHL_STAFF_PACK, type NhlStaffPost } from '@/data/gmStaff/packs';
import {
  EASTERN, NHL_FO_ROUNDS, NHL_ROSTER_MAX, NHL_ROSTER_MIN, type NhlGmPlayer, type NhlLeague, type NhlProspect,
  type NhlRoundOptions, nhlCapUsed, nhlStrength, nhlTradeValue, repairNhlContributors,
} from './nhlFrontOffice';

/* ------------------------------------------------------------------ */
/* The blocks                                                          */
/* ------------------------------------------------------------------ */

export const NHL_DESK_KEYS = { contracts: 'contracts', picks: 'picks', staff: 'staff', retained: 'retained' } as const;

/**
 * The pick rules this game drafts under: the league's own (gmPicks, read
 * twice on 2026-10-02) with the rounds cut to the two this game's draft
 * night deals. A function, not a constant, so nothing imported is read at
 * module scope.
 */
export function nhlGamePickRules(): GmPickRules {
  return {
    ...NHL_PICK_RULES,
    rounds: 2,
    partial: [
      ...NHL_PICK_RULES.partial,
      'The real draft runs seven rounds. This game drafts two, so the ledger carries two.',
      'The lottery is in the rules, but draft night here is the game\'s own short draft: you pick first in each batch, then the other clubs go in reverse standings.',
    ],
  };
}

/** The staff block and the purse its fees and pay offs come out of. */
export interface NhlStaffState {
  block: GmStaffBlock<NhlStaffPost>;
  /** In the pack's purse unit (the game's own millions). Ownership refills it every summer. */
  purse: number;
}

/** A club still paying part of a salary it traded away: `kept` a season, while his deal runs. */
export interface NhlRetainedRow {
  club: string;
  playerId: string;
  name: string;
  share: number;
  kept: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isNhlStaffState(v: unknown): v is NhlStaffState {
  return isObj(v) && gmIsValidStaff(NHL_STAFF_PACK.rules, v.block) && isNum(v.purse) && v.purse >= 0;
}

export function isNhlRetained(v: unknown): v is NhlRetainedRow[] {
  return Array.isArray(v) && v.every(r => isObj(r) && typeof r.club === 'string' && typeof r.playerId === 'string'
    && typeof r.name === 'string' && isNum(r.share) && r.share > 0 && r.share <= 0.5 && isNum(r.kept) && r.kept >= 0);
}

/** What the desk reads from the board to set up its staff. */
export function nhlStaffCtx(league: NhlLeague, team: string): GmStaffCtx<NhlStaffPost> {
  const ids = Object.keys(league.teams).sort();
  const ranked = [...ids].sort((a, b) => nhlStrength(league.teams[b]) - nhlStrength(league.teams[a]) || a.localeCompare(b));
  const rank = Math.max(0, ranked.indexOf(team));
  const stature = ids.length > 1 ? 1 - rank / (ids.length - 1) : 0.5;
  return {
    owner: team, world: 'nhl', season: league.season, week: league.round, money: 1,
    anchor: post => gmStatureAnchor(team, post, stature, NHL_STAFF_PACK.rules.maxLevel),
    inHouse: 2,
    rivals: () => ids.filter(id => id !== team),
  };
}

const freshPicks = (league: NhlLeague): GmPickLedger =>
  /* Every marker on every club's old list is kept: the draft for this season
     is the year the old list was for, and the two later years start whole. */
  migrateLegacyPicks(league.teams, league.season, nhlGamePickRules(), 2).ledger;

const freshStaff = (league: NhlLeague, team: string): NhlStaffState => ({
  block: gmDefaultStaff(NHL_STAFF_PACK.rules, nhlStaffCtx(league, team)),
  purse: NHL_STAFF_PACK.money.seasonPurse,
});

/** The desk the first time the GM opens it. Reads the league, never changes it. */
export function openNhlDesk(league: NhlLeague, team: string): GmDesk {
  let desk = freshGmDesk();
  desk = withGmBlock(desk, NHL_DESK_KEYS.contracts, openLedger(league, team));
  desk = withGmBlock(desk, NHL_DESK_KEYS.picks, freshPicks(league));
  desk = withGmBlock(desk, NHL_DESK_KEYS.staff, freshStaff(league, team));
  desk = withGmBlock(desk, NHL_DESK_KEYS.retained, [] as NhlRetainedRow[]);
  return desk;
}

export function nhlContractsOf(desk: GmDesk, league: NhlLeague, team: string): GmContractLedger {
  return gmBlock(desk, NHL_DESK_KEYS.contracts, v => isValidLedger(v) && v.team === team, () => openLedger(league, team));
}

export function nhlPicksOf(desk: GmDesk, league: NhlLeague): GmPickLedger {
  const ids = Object.keys(league.teams);
  return gmBlock(desk, NHL_DESK_KEYS.picks, v => validateLedger(v, ids, nhlGamePickRules()) !== null, () => freshPicks(league));
}

export function nhlStaffOf(desk: GmDesk, league: NhlLeague, team: string): NhlStaffState {
  return gmBlock(desk, NHL_DESK_KEYS.staff, isNhlStaffState, () => freshStaff(league, team));
}

export function nhlRetainedOf(desk: GmDesk): NhlRetainedRow[] {
  return gmBlock(desk, NHL_DESK_KEYS.retained, isNhlRetained, () => [] as NhlRetainedRow[]);
}

/** A deep copy that survives JSON, the only shape a save block may have. */
export const deskCopy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* ------------------------------------------------------------------ */
/* The staff's effects                                                 */
/* ------------------------------------------------------------------ */

/**
 * How much of the special teams edge reaches the game. The engine has no
 * power play and no penalty kill of its own (one strength number decides a
 * game), so the assistant's rating points count toward that one number at a
 * fifth of their weight. The fifth is this game's own figure, not a claim
 * about how much of hockey special teams decide, and the screen says so.
 */
export const NHL_SPECIAL_TEAMS_WEIGHT = 0.2;

/** The engine's own weights (nhlStrength): top six forwards half, top four D three tenths, the goalie a fifth. */
const ATTACK_WEIGHT = 0.5;
const DEFENSE_WEIGHT = 0.3;
const GOALIE_WEIGHT = 0.2;

/**
 * Strength points the staff adds to the club. Each coach's edge is in rating
 * points on his part of the team, so it reaches the strength the way a
 * rating point there does. Zero for a desk of level 1 men or empty chairs.
 */
export function nhlStaffEdge(block: GmStaffBlock<NhlStaffPost> | null | undefined): number {
  const e = (key: string) => gmStaffEffect(NHL_STAFF_PACK, block, key);
  return e('offEdge') * ATTACK_WEIGHT + e('defEdge') * DEFENSE_WEIGHT + e('goalieEdge') * GOALIE_WEIGHT
    + e('specialTeamsEdge') * NHL_SPECIAL_TEAMS_WEIGHT;
}

/** The medical post's ladder, off the pack, so the number on the tile is the number applied. */
function medicalEffect() {
  return NHL_STAFF_PACK.posts.find(p => p.id === 'medical')!.effects.find(e => e.key === 'injuryWeeks')!;
}

/** Rounds out after the trainer has had him. Hashed off the man and the round, never drawn. */
export function nhlInjuryRounds(block: GmStaffBlock<NhlStaffPost>, team: string, season: number, round: number, playerId: string, rounds: number): number {
  const roll = gmHashFloat(`nhl-injury|${team}|${season}|${round}|${playerId}`);
  return gmInjuryWeeks(rounds, medicalEffect(), gmStaffLevel(block, 'medical'), roll);
}

/** What the desk hands a round: the club's edge and the trainer, for the user's club only. */
export function nhlDeskRoundOptions(desk: GmDesk, league: NhlLeague, team: string): NhlRoundOptions {
  const staff = nhlStaffOf(desk, league, team).block;
  return {
    edges: { [team]: nhlStaffEdge(staff) },
    injuryRounds: (abbr, p, rounds) => abbr === team ? nhlInjuryRounds(staff, team, league.season, league.round, p.id, rounds) : rounds,
  };
}

/** The same edge for the playoffs. */
export function nhlDeskEdges(desk: GmDesk, league: NhlLeague, team: string): Record<string, number> {
  return { [team]: nhlStaffEdge(nhlStaffOf(desk, league, team).block) };
}

/**
 * The user's scouting director's read of a prospect: the true rating plus a
 * miss whose spread his level sets (gmScoutNoise), clamped the way the
 * engine clamps its own grade. The draw is a hash of the prospect, so the
 * read is fixed for the night. The CPU clubs keep the engine's own grade.
 */
export function nhlScoutRead(p: Pick<NhlProspect, 'id' | 'trueOvr'>, team: string, season: number, level: number): number {
  const u = gmHashFloat(`nhl-scout|${team}|${season}|${p.id}`);
  return Math.max(65, Math.min(93, p.trueOvr + gmScoutNoise(u, level)));
}

/* ------------------------------------------------------------------ */
/* Picks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Every club's engine list rebuilt from the ledger: one marker per pick it
 * holds in this season's draft, lowest round first. The engine's draft night
 * reads only that list (nhlDraftCapital), so a pick that changed hands in
 * the ledger is a pick on the other club's draft night. Not called during
 * the draft: the engine spends markers there and the summer drops that year.
 */
export function syncNhlPicks(league: NhlLeague, ledger: GmPickLedger): void {
  for (const [abbr, t] of Object.entries(league.teams)) {
    t.picks = picksHeldBy(ledger, abbr, league.season).filter(p => p.round <= 2).map(p => p.round);
  }
}

/**
 * The old trade paths (the trade finder's sweetener, a phone call's pick)
 * move the last marker on the list. With the desk on, the same pick moves in
 * the ledger: the club's own in that round if it still has it.
 */
export function nhlMirrorPickMove(ledger: GmPickLedger, from: string, to: string, round: number, season: number): GmPickLedger {
  const held = picksHeldBy(ledger, from, season).filter(p => p.round === round);
  const p = held.find(x => x.orig === from) ?? held[0];
  return p ? movePicks(ledger, [pickKey(p)], to) : ledger;
}

/* ------------------------------------------------------------------ */
/* The deadline, and who is buying                                    */
/* ------------------------------------------------------------------ */

/**
 * Rounds already played this season. `league.round` is the round about to
 * be played. The one place the deadline's clock is read, so the hub, the
 * old trade paths and the packages can never count it two ways.
 */
export function nhlPeriodsPlayed(league: NhlLeague): number {
  return Math.max(0, league.round - 1);
}

/** The window as the hub sees it. */
export function nhlTradeWindow(league: NhlLeague): TradeWindow {
  return tradeWindow(NHL_DEADLINE, NHL_FO_ROUNDS, nhlPeriodsPlayed(league), false);
}

/** Why a trade is refused today, or null. Every trade path on the board asks this first once the desk is on. */
export function nhlDeadlineRefusal(league: NhlLeague): string | null {
  return nhlTradeWindow(league).reason;
}

/** Buyers and sellers by the standings: eight playoff places a conference, points share as the record. */
export function nhlStances(league: NhlLeague): Record<string, DeadlineStance> {
  const rows = Object.values(league.teams).map(t => {
    const games = t.wins + t.losses + t.otLosses;
    return {
      id: t.abbr, wins: t.wins, losses: t.losses + t.otLosses,
      ...(games > 0 ? { pct: (t.wins * 2 + t.otLosses) / (games * 2) } : {}),
      group: EASTERN.includes(t.abbr) ? 'East' : 'West',
    };
  });
  return deadlineStances(rows, 8).stance;
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

/**
 * What a pick is worth in the engine's trade value units. The engine has
 * always priced a pick thrown into a deal at 12 (nhlTrade's sweetener, and
 * the trade talks' pickValue), and that pick is the last on the list, a
 * second rounder. So a second next June is 12, a first is 30, and each
 * draft further off is worth 85 percent of the one before. The game's own
 * figures, not a claim about how real clubs price picks.
 */
export const NHL_PICK_CURVE: PickValueCurve = { first: 30, perRound: 0.4, perYear: 0.85 };
/** The engine's own ask margin on a deal (nhlTrade, the trade talks). */
export const NHL_PACKAGE_PREMIUM = 1.07;
/** What the board says about a man waived this season, so the refusal reads like the rest of the board. */
export const NHL_CUT_SAID = 'You waived him this season.';

const playerIn = (league: NhlLeague, id: string): NhlGmPlayer | undefined => {
  for (const t of Object.values(league.teams)) { const p = t.players.find(x => x.id === id); if (p) return p; }
  return undefined;
};

/** The engine's money and roster rules for a whole package, side by side. Null means it works. */
export function nhlPackageCapCheck(league: NhlLeague, pkg: TradePackage): string | null {
  for (const [club, out, inc] of [[pkg.from, pkg.give, pkg.get], [pkg.to, pkg.get, pkg.give]] as const) {
    const t = league.teams[club];
    if (!t) return 'That club is not in this league.';
    const outMen = out.flatMap(a => (a.kind === 'player' ? [a] : []));
    const inMen = inc.flatMap(a => (a.kind === 'player' ? [a] : []));
    const after = t.players.length - outMen.length + inMen.length;
    if (after < NHL_ROSTER_MIN) return `That would leave ${club} with ${after} players. A club needs at least ${NHL_ROSTER_MIN}.`;
    if (after > NHL_ROSTER_MAX) return `${club} has no room for that many players: the limit is ${NHL_ROSTER_MAX}.`;
    let outMoved = 0, inMoved = 0;
    for (const a of outMen) { const p = playerIn(league, a.id); if (p) outMoved += splitRetained(p.salary, a.retain).moved; }
    for (const a of inMen) {
      const p = playerIn(league, a.id);
      if (!p) continue;
      inMoved += splitRetained(p.salary, a.retain).moved;
      const refused = tradeRefusal(t, a.id, NHL_CUT_SAID);
      if (refused) return refused;
    }
    const payrollAfter = nhlCapUsed(t) - outMoved + inMoved;
    /* The engine's own matching rule (Round 82), for a pile instead of one man. */
    if (payrollAfter > league.cap + 1e-9 && inMoved > outMoved * 1.5 + 5) {
      return `That puts ${club} over the cap: $${Math.round(payrollAfter * 10) / 10}M against $${league.cap}M.`;
    }
  }
  return null;
}

/** Everything gmTradePackage needs to judge a deal the user's club puts to `partner`. */
export function nhlPackageContext(league: NhlLeague, desk: GmDesk, team: string, partner: string): PackageContext {
  const ledger = nhlPicksOf(desk, league);
  const stance = nhlStances(league)[partner] ?? 'holding';
  const retained = nhlRetainedOf(desk);
  return {
    ledger, pickRules: nhlGamePickRules(), tradeRules: NHL_TRADE_RULES, season: league.season,
    clock: { rules: NHL_DEADLINE, periods: NHL_FO_ROUNDS, periodsPlayed: nhlPeriodsPlayed(league), seasonClosed: false },
    valueOf: (a: TradeAsset) => {
      if (a.kind === 'player') { const p = playerIn(league, a.id); return p ? stanceValue(stance, nhlTradeValue(p), p.age) : 0; }
      if (a.kind === 'pick') {
        const p = findPick(ledger, a.key);
        return p ? stanceValue(stance, pickValueAt(NHL_PICK_CURVE, p.round, p.year - league.season)) : 0;
      }
      return 0;
    },
    capCheck: pkg => nhlPackageCapCheck(league, pkg),
    premium: NHL_PACKAGE_PREMIUM,
    retainedDeals: club => retained.filter(r => r.club === club).length,
    timesRetained: id => retained.filter(r => r.playerId === id).length,
  };
}

export interface NhlPackageResult {
  verdict: PackageVerdict;
  desk: GmDesk;
  /** The players who came to the user's club. */
  arrived: NhlGmPlayer[];
}

/**
 * Judge a package and, on a yes, make it: players move on the two clubs in
 * the league handed in (the board hands a copy), picks move in the ledger
 * and the engine lists are rebuilt from it, and every salary a club keeps
 * paying goes on its cap as a line that runs as long as his deal does.
 */
export function nhlProposePackage(league: NhlLeague, desk: GmDesk, team: string, pkg: TradePackage): NhlPackageResult {
  const ctx = nhlPackageContext(league, desk, team, pkg.to);
  const from = league.teams[pkg.from], to = league.teams[pkg.to];
  if (!from || !to) return { verdict: evaluatePackage(pkg, ctx), desk, arrived: [] };
  const out = proposePackage(pkg, from, to, ctx);
  if (out.verdict.verdict !== 'accepted') return { verdict: out.verdict, desk, arrived: [] };
  const rows = [...nhlRetainedOf(desk)];
  for (const r of out.retained) {
    const p = playerIn(league, r.playerId);
    const payer = league.teams[r.club];
    if (!p || !payer) continue;
    const { kept, moved } = splitRetained(p.salary, r.share);
    p.salary = moved;
    payer.deadCap = [...(payer.deadCap ?? []), { playerId: p.id, name: p.name, amount: kept, seasonsLeft: Math.max(1, p.years) }];
    rows.push({ club: r.club, playerId: p.id, name: p.name, share: r.share, kept });
  }
  syncNhlPicks(league, out.ledger);
  repairNhlContributors(from); repairNhlContributors(to);
  const mine = league.teams[team];
  const arrivedIds = (pkg.from === team ? pkg.get : pkg.give).flatMap(a => (a.kind === 'player' ? [a.id] : []));
  const arrived = mine.players.filter(p => arrivedIds.includes(p.id));
  let next = withGmBlock(desk, NHL_DESK_KEYS.picks, out.ledger);
  next = withGmBlock(next, NHL_DESK_KEYS.retained, rows);
  next = nhlNoteArrivals(next, league, team, arrived.map(p => p.id), 'trade');
  return { verdict: out.verdict, desk: next, arrived };
}

/** Seasons on the entry level deal a man signs at this age (the rules ladder of gmContractRules). */
export function nhlEntryLevelYears(age: number): number {
  return (NHL_ENTRY_LEVEL_YEARS.find(r => age <= r.maxAge) ?? NHL_ENTRY_LEVEL_YEARS[NHL_ENTRY_LEVEL_YEARS.length - 1]).years;
}

/**
 * A draftee with the desk on signs his entry level deal: the ladder's
 * seasons, plus the one the summer right after draft night takes off before
 * he has played a game (the engine's offseason runs after the draft and
 * takes a season off every deal). So an 18 year old plays three seasons
 * before he comes up on the re-sign desk, as the rules say. With the desk
 * off the engine's own figure stands, so an old save plays as it did.
 */
export function nhlSignDraftee(p: NhlGmPlayer): void {
  p.years = nhlEntryLevelYears(p.age) + 1;
}

/** Tell the re-sign ledger how men arrived: a trade or a signing in season, or the draft with its round. */
export function nhlNoteArrivals(desk: GmDesk, league: NhlLeague, team: string, ids: string[], how: 'trade' | 'signing' | 'draft', round?: number): GmDesk {
  if (!ids.length) return desk;
  const ledger = deskCopy(nhlContractsOf(desk, league, team));
  for (const id of ids) noteArrival(ledger, id, league.season, how, round, how !== 'draft');
  return withGmBlock(desk, NHL_DESK_KEYS.contracts, ledger);
}

/* ------------------------------------------------------------------ */
/* The round and the summer                                            */
/* ------------------------------------------------------------------ */

const postLabel = (post: string): string => (NHL_STAFF_PACK.posts.find(p => p.id === post)?.label ?? post).toLowerCase();

/** One tick of the staff desk, after a round: an approach runs down, or a rival comes in. A club acting, never a person speaking. */
export function nhlDeskAfterRound(desk: GmDesk, league: NhlLeague, team: string): { desk: GmDesk; line: string | null } {
  const staff = deskCopy(nhlStaffOf(desk, league, team));
  const ev = gmTickStaff(NHL_STAFF_PACK.rules, staff.block, nhlStaffCtx(league, team));
  const next = withGmBlock(desk, NHL_DESK_KEYS.staff, staff);
  if (!ev) return { desk: next, line: null };
  return {
    desk: next,
    line: ev.kind === 'approach'
      ? `📞 ${ev.club} have come in for ${ev.person.name}, your ${postLabel(ev.post)}. Match it or let him go on the staff desk.`
      : `👋 ${ev.person.name} has left your ${postLabel(ev.post)} job for ${ev.club}.`,
  };
}

export interface NhlDeskSummer {
  ok: boolean;
  desk: GmDesk;
  /** The engine's own offseason lines (retirements), untouched. */
  notes: string[];
  /** What the desk did, for the feed. */
  lines: string[];
  /** Men the GM left open, settled by the staff's rule and written down as 'auto'. */
  autoSettled: GmDecision[];
  /** Every decision applied this summer. */
  applied: GmDecision[];
  /** Each pick an offer sheet paid this summer: the club that tabled it and the pick it handed over (null: it held none in that round). */
  sheetPicks: { id: string; club: string; round: number; key: string | null }[];
}

/**
 * The summer with the desk on, in place of nhlOffseason. Every one of the
 * user's expiring men already has a decision when the engine runs: the GM's,
 * or for a man he left open, the staff's written rule (autoDecide), never a
 * draw. Then the engine's own offseason runs for the whole league, exactly
 * as before, with the user's club (so the CPU clubs are trimmed to the limit
 * the way Round 969 does it). After it: the draft just held leaves the pick
 * ledger and every engine list is rebuilt from it, the picks an offer sheet
 * owes come off the club that tabled it, every retained salary goes back to
 * its full figure for the season ahead, and the staff roll over.
 * Mutates the league handed in, like the engine's own offseason.
 */
export function nhlDeskOffseason(league: NhlLeague, desk: GmDesk, team: string, rng: () => number): NhlDeskSummer {
  const closed = league.season;
  const ids = Object.keys(league.teams);
  const picksBefore = nhlPicksOf(desk, league);
  const staffBefore = nhlStaffOf(desk, league, team);
  const retainedBefore = nhlRetainedOf(desk);
  const ledger = deskCopy(nhlContractsOf(desk, league, team));
  const autoSettled = autoDecide(nhlContractHost, league, ledger);
  const run = runDeskOffseason(nhlContractHost, league, ledger, rng);
  if (run.ok === false) return { ok: false, desk, notes: [], lines: [`Still waiting on: ${run.undecided.map(u => u.name).join(', ')}.`], autoSettled: [], applied: [], sheetPicks: [] };

  let picks = rollLedger(picksBefore, ids, closed, nhlGamePickRules());
  const sheetLines: string[] = [];
  const sheetPicks: NhlDeskSummer['sheetPicks'] = [];
  /* An offer sheet the GM cashed in: the club that tabled it (the one
     runDeskOffseason sent him to) hands over its own pick in each round, the
     soonest it holds. A club that has traded its own away hands over another
     it holds in that round. A pick is only ever moved, never made, so the
     league's count stays whole; if the club holds none in that round, the
     feed says so rather than inventing one. */
  for (const sheet of run.sheets ?? []) {
    for (const round of sheet.picks) {
      const held = picksHeldBy(picks, sheet.club).filter(p => p.round === round && p.year >= league.season)
        .sort((a, b) => a.year - b.year);
      const pay = held.find(p => p.orig === sheet.club) ?? held[0];
      sheetPicks.push({ id: sheet.id, club: sheet.club, round, key: pay ? pickKey(pay) : null });
      if (pay) picks = movePicks(picks, [pickKey(pay)], team);
      else sheetLines.push(`📋 ${sheet.club} had no round ${round} pick left to hand over for the offer sheet.`);
    }
  }
  syncNhlPicks(league, picks);

  const retained = retainedBefore.filter(r => {
    const entry = league.teams[r.club]?.deadCap?.find(d => d.playerId === r.playerId);
    if (!entry) return false;
    entry.amount = r.kept;
    return true;
  });

  const walk = gmSummerWalk(NHL_STAFF_PACK.rules, staffBefore.block);
  const staff: NhlStaffState = {
    block: gmRolloverStaff(NHL_STAFF_PACK.rules, staffBefore.block, nhlStaffCtx(league, team)),
    purse: NHL_STAFF_PACK.money.seasonPurse,
  };

  const lines: string[] = [];
  const stayed = run.applied.filter(d => ['keep', 'option', 'tender', 'qualify-accepted', 'match'].includes(d.kind)).length;
  if (run.applied.length) lines.push(`📋 The re-sign desk: ${stayed} kept, ${run.applied.length - stayed} gone.`);
  if (autoSettled.length) lines.push(`📋 You left ${autoSettled.length} deal${autoSettled.length === 1 ? '' : 's'} open, so your staff settled ${autoSettled.length === 1 ? 'it' : 'them'} by its own rule.`);
  if (walk) lines.push(`👋 ${walk.person.name} took the ${postLabel(walk.post)} job at ${walk.club}. Nobody matched it.`);
  lines.push(...sheetLines);

  let next = withGmBlock(desk, NHL_DESK_KEYS.contracts, ledger);
  next = withGmBlock(next, NHL_DESK_KEYS.picks, picks);
  next = withGmBlock(next, NHL_DESK_KEYS.staff, staff);
  next = withGmBlock(next, NHL_DESK_KEYS.retained, retained);
  return { ok: true, desk: next, notes: run.engine, lines, autoSettled, applied: run.applied, sheetPicks };
}

/* ------------------------------------------------------------------ */
/* What each box on the hub says                                       */
/* ------------------------------------------------------------------ */

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** The staff box. It pulses when a rival is in for one of yours or a chair is empty. */
export function nhlStaffTile(desk: GmDesk, league: NhlLeague, team: string): GmTileFace {
  const s = nhlStaffOf(desk, league, team);
  const posts = NHL_STAFF_PACK.posts;
  const filled = posts.filter(p => s.block[p.id]).length;
  const poach = s.block.poach;
  const edge = Math.round(nhlStaffEdge(s.block) * 100) / 100;
  return {
    icon: '📋',
    value: `${filled} of ${posts.length} jobs filled`,
    sub: poach ? `${poach.club} want your ${postLabel(poach.postId)}` : edge > 0 ? `+${edge} team strength from the bench` : 'No edge from the bench yet',
    accent: !!poach || filled < posts.length,
  };
}

/** The re-sign box. It pulses once the deadline has passed and somebody is still waiting on you. */
export function nhlContractsTile(desk: GmDesk, league: NhlLeague, team: string, seasonOver: boolean): GmTileFace {
  const ledger = nhlContractsOf(desk, league, team);
  const up = expiringMen(nhlContractHost, league, team);
  const waiting = undecided(nhlContractHost, league, ledger).length;
  return {
    icon: '✍️',
    value: up.length ? `${plural(up.length, 'deal')} end this summer` : 'Nobody expiring',
    sub: waiting ? `${waiting} still waiting on you` : up.length ? 'Every call is made' : 'Nobody is out of contract this summer',
    accent: waiting > 0 && (seasonOver || !nhlTradeWindow(league).open),
  };
}

/** The picks box. */
export function nhlPicksTile(desk: GmDesk, league: NhlLeague, team: string): GmTileFace {
  const ledger = nhlPicksOf(desk, league);
  const mine = picksHeldBy(ledger, team);
  const now = mine.filter(p => p.year === league.season).length;
  const years = new Set(mine.map(p => p.year)).size;
  return {
    icon: '🎟️',
    value: `${plural(now, 'pick')} in ${league.season}`,
    sub: `${plural(mine.length, 'pick')} over ${plural(Math.max(years, 1), 'draft')}`,
    accent: false,
  };
}

/**
 * The deal box: packages, and how long until the deadline shuts them. On a
 * save without the desk yet (`on` false) the deadline does not apply, the
 * phone and the trade finder still deal, so the box says what opening it
 * brings instead of a deadline that is not running.
 */
export function nhlDealsTile(league: NhlLeague, on = true): GmTileFace {
  const w = nhlTradeWindow(league);
  if (!on) {
    return { icon: '🔁', value: 'Packages and a deadline', sub: `Open it to start the desk: deals shut once round ${w.deadlineAfter + 1} is played`, accent: false };
  }
  return {
    icon: '🔁',
    value: !w.open ? 'Deadline passed' : w.periodsLeft === 0 ? 'Last round to deal' : `${plural(w.periodsLeft, 'round')} to the deadline`,
    sub: w.open ? 'Players, picks and retained salary' : 'Deals open again after the season',
    accent: w.open && w.periodsLeft <= 1,
  };
}

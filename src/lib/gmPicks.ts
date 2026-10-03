/* ─── Round 909: the pick ledger ───
   Draft capital for the four Front Office sims. Until this round a club's
   picks were a bare number[] of round markers for this year only, reset to
   the same list every summer, so a rebuild could not bank a future first
   and a pick traded in March was back by July. This module is the ledger
   that replaces it: every pick has a year, a round, the club it first
   belonged to and the club holding it now.

   ONE ENGINE, MANY SPORTS. Nothing below asks which sport it is. Every
   league difference (how many rounds, whether a pick can be traded at all,
   the lottery table, the consecutive firsts rule, compensatory picks) is a
   field on GmPickRules, and the four rule sets at the bottom are data.

   EVERY LEAGUE RULE BELOW WAS READ TWICE ON 2026-10-02, the league's own
   page and one independent publisher, with both addresses beside the
   value. Where a second read was made later (by the round's review) the
   comment says so, where only one address is on record the value says so,
   and where
   none could, the rule is left out and the gap is named (the MLB lottery,
   how far ahead NFL and NHL picks trade). A number nobody confirmed is not
   in this file.

   The engines are not edited by this round. They adopt the ledger through
   the GM desk seam: migrateLegacyPicks reads a save's old number[] and
   keeps every marker in it. */

export type GmSportId = 'nfl' | 'nba' | 'nhl' | 'mlb';

/** std: an ordinary pick. comp: awarded for free agents lost. cb: a
    competitive balance pick. */
export type GmPickKind = 'std' | 'comp' | 'cb';

export interface GmPick {
  /** The draft it belongs to. A league's `season` drafts in that same year. */
  year: number;
  round: number;
  /** The club it first belonged to: its place in the order follows that club's record. */
  orig: string;
  /** The club holding it now. */
  holder: string;
  /** Absent means 'std'. */
  kind?: GmPickKind;
  /** Tells apart two awarded picks of one kind, year, round and club. */
  seq?: number;
  /** A migrated marker whose first owner the old save never wrote down. */
  origUnknown?: true;
}

export interface GmPickLedger {
  v: 1;
  picks: GmPick[];
}

export interface GmLotteryRules {
  /** How many clubs that missed the playoffs take part. */
  clubs: number;
  /** Chance of winning the FIRST draw, in percent, worst club first. Sums to 100. */
  odds: number[];
  /** How many picks are drawn. */
  draws: number;
  /** The most places a winner can climb, or null where there is no limit. */
  maxClimb: number | null;
  /** Which draft's table this is. */
  table: string;
}

export interface GmCompRules {
  /** Compensatory picks awarded league wide in one draft, at most. */
  leagueMax: number;
  /** And to one club, at most. */
  perClubMax: number;
  /** They sit at the end of these rounds. */
  firstRound: number;
  lastRound: number;
}

export interface GmPickRules {
  sport: GmSportId;
  rounds: number;
  /** Which kinds of pick can change hands. An empty list means none can. */
  tradableKinds: GmPickKind[];
  /** Kinds that may be traded only by the club they were awarded to, so once. */
  singleTradeKinds: GmPickKind[];
  /** How many drafts the ledger carries, this year's included. A GAME setting
      unless ledgerYearsIsLeagueRule says the league itself sets the number. */
  ledgerYears: number;
  ledgerYearsIsLeagueRule: boolean;
  /** A club may never be left without a first round pick in two future
      drafts running. Any first it holds counts, its own or one it acquired. */
  noTwoFirstlessYearsRunning: boolean;
  lottery: GmLotteryRules | null;
  comp: GmCompRules | null;
  /** What this rule set leaves out, in words the board can show. */
  partial: string[];
}

export function pickKind(p: Pick<GmPick, 'kind'>): GmPickKind {
  return p.kind ?? 'std';
}

/** One string per pick, stable across saves: the handle every other function takes. */
export function pickKey(p: Pick<GmPick, 'year' | 'round' | 'orig' | 'kind' | 'seq'>): string {
  const kind = pickKind(p);
  const base = `${p.year}:${p.round}:${p.orig}`;
  if (kind === 'std' && !p.seq) return base;
  return `${base}:${kind}:${p.seq ?? 0}`;
}

export function findPick(ledger: GmPickLedger, key: string): GmPick | undefined {
  return ledger.picks.find(p => pickKey(p) === key);
}

/** A club's picks, soonest draft first, then by round. */
export function picksHeldBy(ledger: GmPickLedger, holder: string, year?: number): GmPick[] {
  return ledger.picks
    .filter(p => p.holder === holder && (year === undefined || p.year === year))
    .sort((a, b) => a.year - b.year || a.round - b.round || a.orig.localeCompare(b.orig) || (a.seq ?? 0) - (b.seq ?? 0));
}

/** The years a ledger covers at `season`: this year's draft and the ones after it. */
export function ledgerYears(season: number, rules: GmPickRules): number[] {
  const out: number[] = [];
  for (let i = 0; i < rules.ledgerYears; i++) out.push(season + i);
  return out;
}

/** A fresh league: every club holds its own pick in every round of every year carried. */
export function newLedger(teamIds: string[], season: number, rules: GmPickRules): GmPickLedger {
  const picks: GmPick[] = [];
  for (const year of ledgerYears(season, rules)) {
    for (let round = 1; round <= rules.rounds; round++) {
      for (const id of teamIds) picks.push({ year, round, orig: id, holder: id });
    }
  }
  return { v: 1, picks };
}

// ---------------------------------------------------------------------------
// Migration: an old save's number[] becomes ledger picks, every marker kept
// ---------------------------------------------------------------------------

export interface LegacyPickTeam { picks?: unknown }

export interface MigrationResult {
  ledger: GmPickLedger;
  /** Valid round markers found in the old save. Every one is a pick in the ledger. */
  markers: number;
  /** Entries that were not a round number of this league, left behind and counted. */
  ignored: number;
  /** Picks whose first owner the old save could not tell us. */
  unknownOrig: number;
}

function legacyMarkers(raw: unknown, rules: GmPickRules): { rounds: number[]; ignored: number } {
  if (!Array.isArray(raw)) return { rounds: [], ignored: 0 };
  const rounds: number[] = [];
  let ignored = 0;
  for (const n of raw) {
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= rules.rounds) rounds.push(n);
    else ignored++;
  }
  return { rounds, ignored };
}

/* The old list was one marker per round held THIS year: [1, 2, 3] untouched,
   [1, 2] after giving the third away, [1, 2, 3, 3] after taking one in. It
   never said whose pick the extra was. So: a club's first marker in a round
   is its own pick; an extra marker is matched to a club that is missing that
   round, and when more than one club is missing it the match is a guess and
   the pick is flagged origUnknown. An extra nobody is missing keeps its
   holder as its origin, flagged the same way. Nothing is dropped and nothing
   is invented: a pick no club holds in the old save is not recreated.

   The old engines dealt only a few rounds (three in the NFL sim, two in the
   others). Rounds past those, and every round of every later year, start
   with their own clubs. Pass `dealtRounds`, the number the engine dealt:
   since Round 904 the NFL sim spends a marker for each pick made on draft
   night, so a save written mid draft can hold no marker at all for a round
   that was dealt and used, and only the engine knows it was dealt. Without
   it the deepest marker in the save stands in, which is exact for any save
   written outside the draft. */
export function migrateLegacyPicks(
  teams: Record<string, LegacyPickTeam>, season: number, rules: GmPickRules, dealtRounds?: number,
): MigrationResult {
  const ids = Object.keys(teams).sort();
  const held: Record<string, number[]> = {};
  let ignored = 0;
  let deepest = 0;
  for (const id of ids) {
    const m = legacyMarkers(teams[id]?.picks, rules);
    held[id] = m.rounds;
    ignored += m.ignored;
    for (const r of m.rounds) if (r > deepest) deepest = r;
  }
  if (dealtRounds !== undefined) deepest = Math.min(rules.rounds, Math.max(deepest, dealtRounds));
  const picks: GmPick[] = [];
  let markers = 0;
  let unknownOrig = 0;
  for (let round = 1; round <= deepest; round++) {
    const count = (id: string) => held[id].filter(r => r === round).length;
    const donors = ids.filter(id => count(id) === 0);
    const extras: string[] = [];
    for (const id of ids) {
      const c = count(id);
      if (c >= 1) { picks.push({ year: season, round, orig: id, holder: id }); markers++; }
      for (let k = 1; k < c; k++) extras.push(id);
    }
    const certain = donors.length === 1 && extras.length === 1;
    let spare = 0;
    for (const holder of extras) {
      const donor = donors.shift();
      markers++;
      if (donor) {
        const p: GmPick = { year: season, round, orig: donor, holder };
        if (!certain) { p.origUnknown = true; unknownOrig++; }
        picks.push(p);
      } else {
        spare++;
        picks.push({ year: season, round, orig: holder, holder, seq: spare, origUnknown: true });
        unknownOrig++;
      }
    }
  }
  for (let round = deepest + 1; round <= rules.rounds; round++) {
    for (const id of ids) picks.push({ year: season, round, orig: id, holder: id });
  }
  for (const year of ledgerYears(season, rules).slice(1)) {
    for (let round = 1; round <= rules.rounds; round++) {
      for (const id of ids) picks.push({ year, round, orig: id, holder: id });
    }
  }
  return { ledger: { v: 1, picks }, markers, ignored, unknownOrig };
}

const KINDS: GmPickKind[] = ['std', 'comp', 'cb'];

/** A saved ledger read back. Anything wrong with the block and it returns
    null, so the caller rebuilds this block alone and the rest of the save is
    untouched. A ledger from before a season roll is not wrong, only old:
    picks for drafts already held are dropped by rollLedger, not here. */
export function validateLedger(raw: unknown, teamIds: string[]): GmPickLedger | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { v?: unknown; picks?: unknown };
  if (r.v !== 1 || !Array.isArray(r.picks)) return null;
  const known = new Set(teamIds);
  const seen = new Set<string>();
  const picks: GmPick[] = [];
  for (const x of r.picks as unknown[]) {
    if (!x || typeof x !== 'object') return null;
    const p = x as Record<string, unknown>;
    if (typeof p.year !== 'number' || !Number.isInteger(p.year)) return null;
    if (typeof p.round !== 'number' || !Number.isInteger(p.round) || p.round < 1) return null;
    if (typeof p.orig !== 'string' || !known.has(p.orig)) return null;
    if (typeof p.holder !== 'string' || !known.has(p.holder)) return null;
    if (p.kind !== undefined && !KINDS.includes(p.kind as GmPickKind)) return null;
    if (p.seq !== undefined && (typeof p.seq !== 'number' || !Number.isInteger(p.seq) || p.seq < 0)) return null;
    const pick: GmPick = { year: p.year, round: p.round, orig: p.orig, holder: p.holder };
    if (p.kind !== undefined && p.kind !== 'std') pick.kind = p.kind as GmPickKind;
    if (p.seq) pick.seq = p.seq as number;
    if (p.origUnknown === true) pick.origUnknown = true;
    const key = pickKey(pick);
    if (seen.has(key)) return null;
    seen.add(key);
    picks.push(pick);
  }
  return { v: 1, picks };
}

/** How many ordinary picks each draft year holds. A league that conserves
    its picks reads clubs x rounds in every year, whoever holds them. */
export function ledgerCensus(ledger: GmPickLedger): Record<number, number> {
  const out: Record<number, number> = {};
  for (const p of ledger.picks) if (pickKind(p) === 'std') out[p.year] = (out[p.year] ?? 0) + 1;
  return out;
}

/** Every way a ledger built by newLedger and moved only by trades and rolls
    could be wrong. Empty means every club's pick in every round of every
    year carried exists exactly once. */
export function ledgerProblems(ledger: GmPickLedger, teamIds: string[], season: number, rules: GmPickRules): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const p of ledger.picks) {
    const k = pickKey(p);
    if (keys.has(k)) problems.push(`duplicate ${k}`);
    keys.add(k);
    if (!teamIds.includes(p.holder)) problems.push(`${k} is held by nobody in the league`);
  }
  for (const year of ledgerYears(season, rules)) {
    for (let round = 1; round <= rules.rounds; round++) {
      for (const id of teamIds) {
        if (!keys.has(pickKey({ year, round, orig: id }))) problems.push(`missing ${year}:${round}:${id}`);
      }
    }
  }
  for (const p of ledger.picks) {
    if (p.year < season) problems.push(`${pickKey(p)} belongs to a draft already held`);
    if (p.year >= season + rules.ledgerYears) problems.push(`${pickKey(p)} is past the years carried`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Moving picks, and the rules that stop a move
// ---------------------------------------------------------------------------

/** Hand picks to a new holder. Returns a new ledger; the one passed in is untouched. */
export function movePicks(ledger: GmPickLedger, keys: string[], to: string): GmPickLedger {
  const want = new Set(keys);
  return { v: 1, picks: ledger.picks.map(p => (want.has(pickKey(p)) ? { ...p, holder: to } : p)) };
}

const KIND_WORDS: Record<GmPickKind, string> = {
  std: 'ordinary', comp: 'compensatory', cb: 'competitive balance',
};

/** Why this one pick cannot leave its holder, or null when it can. */
export function pickRefusal(ledger: GmPickLedger, rules: GmPickRules, season: number, from: string, key: string): string | null {
  const p = findPick(ledger, key);
  if (!p || p.holder !== from) return 'That pick is not theirs to trade.';
  if (p.year < season) return 'That draft has already been held.';
  const kind = pickKind(p);
  if (!rules.tradableKinds.includes(kind)) {
    if (rules.tradableKinds.length === 0) return 'Draft picks cannot be traded in this league.';
    const allowed = rules.tradableKinds.map(k => KIND_WORDS[k]).join(' and ');
    return `Only ${allowed} picks can be traded in this league.`;
  }
  if (rules.singleTradeKinds.includes(kind) && p.holder !== p.orig) {
    return 'That pick has been traded once already and cannot move again.';
  }
  return null;
}

function firstsHeld(ledger: GmPickLedger, holder: string, year: number): number {
  return ledger.picks.filter(p => p.holder === holder && p.year === year && p.round === 1).length;
}

/** Why club `a` cannot send `aKeys` to club `b` for `bKeys`, or null. Checks
    each pick, then (where the league has the rule) that neither club ends
    up without a first in two drafts running because of this deal. A club
    already short before the deal is not refused for a deal that leaves its
    firsts alone. */
export function pickSwapRefusal(
  ledger: GmPickLedger, rules: GmPickRules, season: number,
  a: string, aKeys: string[], b: string, bKeys: string[],
): string | null {
  for (const k of aKeys) { const r = pickRefusal(ledger, rules, season, a, k); if (r) return r; }
  for (const k of bKeys) { const r = pickRefusal(ledger, rules, season, b, k); if (r) return r; }
  if (!rules.noTwoFirstlessYearsRunning) return null;
  const after = movePicks(movePicks(ledger, aKeys, b), bKeys, a);
  const years = ledgerYears(season, rules);
  for (const [club, out] of [[a, aKeys], [b, bKeys]] as [string, string[]][]) {
    const firstYearsOut = new Set(
      out.map(k => findPick(ledger, k)!).filter(p => p.round === 1).map(p => p.year),
    );
    if (firstYearsOut.size === 0) continue;
    for (let i = 0; i + 1 < years.length; i++) {
      const y = years[i];
      if (!firstYearsOut.has(y) && !firstYearsOut.has(y + 1)) continue;
      if (firstsHeld(after, club, y) === 0 && firstsHeld(after, club, y + 1) === 0) {
        return `That would leave ${club} without a first round pick in ${y} and ${y + 1}, two drafts running.`;
      }
    }
  }
  return null;
}

/** Season close, after the draft: the draft just held leaves the ledger and
    a new far year arrives with every club holding its own. */
export function rollLedger(ledger: GmPickLedger, teamIds: string[], closedSeason: number, rules: GmPickRules): GmPickLedger {
  const picks = ledger.picks.filter(p => p.year > closedSeason);
  const far = closedSeason + rules.ledgerYears;
  const have = new Set(picks.map(pickKey));
  for (let round = 1; round <= rules.rounds; round++) {
    for (const id of teamIds) {
      const p: GmPick = { year: far, round, orig: id, holder: id };
      if (!have.has(pickKey(p))) picks.push(p);
    }
  }
  return { v: 1, picks };
}

/** Award a pick that is not part of the ordinary grid (compensatory, competitive balance). */
export function awardPick(ledger: GmPickLedger, year: number, round: number, club: string, kind: GmPickKind): GmPickLedger {
  let seq = 1;
  while (findPick(ledger, pickKey({ year, round, orig: club, kind, seq }))) seq++;
  return { v: 1, picks: [...ledger.picks, { year, round, orig: club, holder: club, kind, seq }] };
}

// ---------------------------------------------------------------------------
// The order: reverse standings, then the sport's lottery
// ---------------------------------------------------------------------------

export interface StandingRow {
  id: string;
  wins: number;
  losses: number;
  /** The engine's own winning share when wins and losses do not tell it all (overtime points, ties). */
  pct?: number;
  /** Points or runs or goals, for and against, as one difference. */
  diff?: number;
}

function share(r: StandingRow): number {
  if (typeof r.pct === 'number') return r.pct;
  const g = r.wins + r.losses;
  return g > 0 ? r.wins / g : 0.5;
}

/** Worst club first. Level records are split by scoring difference and then
    by id, so the same standings always give the same order. That tiebreak is
    the game's; the leagues use draws and schedule strength. */
export function reverseStandings(rows: StandingRow[]): string[] {
  return [...rows]
    .sort((a, b) => share(a) - share(b) || (a.diff ?? 0) - (b.diff ?? 0) || a.id.localeCompare(b.id))
    .map(r => r.id);
}

export interface LotteryWin { draw: number; club: string; seed: number; slot: number }
export interface LotteryResult { order: string[]; wins: LotteryWin[] }

/* The draw. `pool` is the clubs that missed the playoffs, worst first. Each
   draw picks one club that has not won yet, weighted by the table; the odds
   of the clubs left grow in proportion, which is what a redraw on a repeat
   winner amounts to. The winner of draw d takes slot d, unless the league
   caps the climb, in which case it stops that many places above its seed and
   the clubs it passed keep their order. A club already sitting at or above
   its slot does not move.

   A league in the game whose playoff field is not the real one hands in a
   pool of a different size. A shorter pool uses the top of the table scaled
   back to 100; a longer one leaves the extra clubs with no chance. That
   scaling is the game's adaptation and is not a league rule. */
export function runLottery(pool: string[], rules: GmLotteryRules, rng: () => number): LotteryResult {
  const order = [...pool];
  const wins: LotteryWin[] = [];
  const weight = pool.map((_, i) => (i < rules.odds.length ? rules.odds[i] : 0));
  const won = new Set<string>();
  for (let draw = 1; draw <= rules.draws; draw++) {
    let total = 0;
    for (let i = 0; i < pool.length; i++) if (!won.has(pool[i])) total += weight[i];
    if (total <= 0) break;
    let roll = rng() * total;
    let seed = -1;
    for (let i = 0; i < pool.length; i++) {
      if (won.has(pool[i]) || weight[i] <= 0) continue;
      seed = i;
      roll -= weight[i];
      if (roll < 0) break;
    }
    if (seed < 0) break;
    const club = pool[seed];
    won.add(club);
    let slot = draw;
    if (rules.maxClimb !== null && seed + 1 - slot > rules.maxClimb) slot = seed + 1 - rules.maxClimb;
    const at = order.indexOf(club);
    if (at > slot - 1) {
      order.splice(at, 1);
      order.splice(slot - 1, 0, club);
    }
    wins.push({ draw, club, seed: seed + 1, slot: order.indexOf(club) + 1 });
  }
  return { order, wins };
}

export interface DraftOrder {
  /** Round one, by the club each slot first belonged to. */
  firstRound: string[];
  /** Every later round: no draw, reverse standings then the playoff clubs. */
  laterRounds: string[];
  lottery: LotteryResult | null;
}

/** `missed`: the clubs out of the playoffs, worst first (reverseStandings).
    `playoff`: the playoff clubs in the order they pick, which the caller
    decides (first out first is the NFL's shape). Every later round is
    missed then playoff for every sport: the game's simplification where a
    league orders a later round by record over all clubs (the NBA), named
    in that rule set's partial. */
export function draftOrder(missed: string[], playoff: string[], rules: GmPickRules, rng: () => number): DraftOrder {
  const lottery = rules.lottery ? runLottery(missed, rules.lottery, rng) : null;
  return {
    firstRound: [...(lottery ? lottery.order : missed), ...playoff],
    laterRounds: [...missed, ...playoff],
    lottery,
  };
}

export interface DraftSlot { round: number; slot: number; pick: GmPick }

/** One round of one draft as the clubs will actually pick it: the order of
    first owners mapped to whoever holds each pick now, with awarded picks
    at the end of the round. A pick the ledger does not hold is skipped. */
export function roundSlots(ledger: GmPickLedger, year: number, round: number, order: string[]): DraftSlot[] {
  const inRound = ledger.picks.filter(p => p.year === year && p.round === round);
  const out: DraftSlot[] = [];
  for (const orig of order) {
    for (const p of inRound) {
      if (p.orig === orig && pickKind(p) === 'std') out.push({ round, slot: out.length + 1, pick: p });
    }
  }
  const awarded = inRound
    .filter(p => pickKind(p) !== 'std')
    .sort((a, b) => order.indexOf(a.orig) - order.indexOf(b.orig) || (a.seq ?? 0) - (b.seq ?? 0));
  for (const p of awarded) out.push({ round, slot: out.length + 1, pick: p });
  return out;
}

// ---------------------------------------------------------------------------
// Compensatory picks
// ---------------------------------------------------------------------------

export interface FreeAgentLedger {
  club: string;
  /** The engine's own value of each qualifying free agent the club lost. */
  lost: number[];
  /** And of each it signed. */
  gained: number[];
}

export interface CompAward { club: string; round: number; value: number }

/* What the league publishes is the shape: a club is owed picks for its NET
   loss of qualifying free agents, one signing cancels one loss, no club gets
   more than perClubMax, the league hands out no more than leagueMax, and
   they sit at the end of a band of rounds. What it does not publish in full
   is how a player is valued. So the valuation is the engine's (the numbers
   in lost and gained, and roundFor), and only the shape lives here. A
   signing cancels the best loss it is at least as big as, and failing that
   the smallest loss left. */
export function compensatoryAwards(
  moves: FreeAgentLedger[], rules: GmPickRules, roundFor: (value: number) => number,
): CompAward[] {
  const comp = rules.comp;
  if (!comp) return [];
  const all: CompAward[] = [];
  for (const m of moves) {
    const lost = [...m.lost].sort((a, b) => b - a);
    for (const g of [...m.gained].sort((a, b) => b - a)) {
      if (lost.length === 0) break;
      const i = lost.findIndex(v => v <= g);
      lost.splice(i >= 0 ? i : lost.length - 1, 1);
    }
    for (const value of lost.slice(0, comp.perClubMax)) {
      const round = Math.min(comp.lastRound, Math.max(comp.firstRound, Math.round(roundFor(value))));
      all.push({ club: m.club, round, value });
    }
  }
  return all
    .sort((a, b) => b.value - a.value || a.club.localeCompare(b.club))
    .slice(0, comp.leagueMax)
    .sort((a, b) => a.round - b.round || b.value - a.value || a.club.localeCompare(b.club));
}

// ---------------------------------------------------------------------------
// The four rule sets. Data, read twice on 2026-10-02 unless a line says otherwise.
// ---------------------------------------------------------------------------

/* NFL. Seven rounds, one pick a club a round; no lottery, worst record first.
     https://operations.nfl.com/calendar-events/nfl-draft/nfl-draft-rules
     https://www.si.com/nfl/draft/nfl-compensatory-draft-picks-explained
   Compensatory picks: as many as 32 a draft, no club more than four, at the
   end of rounds three to seven, for the net loss of compensatory free agents
   (both pages above).
   Compensatory picks can be traded like any other since the 2017 draft
   (the owners' resolution of 2016). Read by the round's review on 2026-10-02:
     https://www.nfl.com/news/compensatory-picks-to-be-tradable-beginning-in-2017-0ap3000000592818
     https://overthecap.com/front-office-scheme-bolstered-ability-trade-compensatory-picks
   NOT CONFIRMED TWICE, so not claimed: how many drafts ahead a pick can be
   traded. The ledger carries three drafts as a game setting. */
export const NFL_PICK_RULES: GmPickRules = {
  sport: 'nfl',
  rounds: 7,
  tradableKinds: ['std', 'comp'],
  singleTradeKinds: [],
  ledgerYears: 3,
  ledgerYearsIsLeagueRule: false,
  noTwoFirstlessYearsRunning: false,
  lottery: null,
  comp: { leagueMax: 32, perClubMax: 4, firstRound: 3, lastRound: 7 },
  partial: [
    'How a lost free agent is valued is this game\'s own sum; the league does not publish its formula in full.',
  ],
};

/* NBA. Two rounds. ONE SOURCE READ for the count (the review confirmed it
   by search, two rounds since 1989, without a second address):
     https://www.si.com/nba/nba-draft-full-history-how-many-rounds
   The lottery: the 14 clubs that missed the playoffs, the first four picks
   drawn, 1,000 combinations shared out 140, 140, 140, 125, 105, 90, 75, 60,
   45, 30, 20, 15, 10, 5, so the worst club picks no lower than fifth.
     https://www.nba.com/news/nba-draft-lottery-explainer (the 2026 draw; it
       prints that year's values with level records averaged, 11.5 and 11.5
       for the fourth and fifth seeds, which is this table's 12.5 and 10.5)
     https://www.si.com/nba/how-does-the-nba-draft-lottery-work-explained-odds
   This is the table the 2026 draft used, and the last draft to use it: on
   28 May 2026 the Board of Governors approved a new lottery from the 2027
   draft (more clubs, flatter odds). The first page above says so, and the
   league's release does too (read by the round's review on 2026-10-02):
     https://pr.nba.com/nba-board-of-governors-approves-new-draft-lottery-system-to-address-tanking/
   Its table has not been read twice, so the game keeps the old one for
   every draft and partial tells the player. Model the new one only once its
   table is read twice.
   NOT MODELLED: the league orders picks 15 to 30 and the whole second
   round by regular season record over all 30 clubs (both reviews of this
   round; not read twice here). The caller hands draftOrder its playoff
   clubs in the order they pick, so round one can follow record, but in the
   later rounds every club that missed the playoffs picks ahead of every
   playoff club, and partial says so.
   A club may not be left without a first round pick in two future drafts
   running (an acquired first counts), and picks trade seven drafts ahead.
     https://basketball.realgm.com/analysis/249279/CBA-Encyclopedia-Stepien-Rule
     https://www.hoopsrumors.com/2024/05/hoops-rumors-glossary-ted-stepien-rule-5.html
     https://cbaguide.com/transactions/trades/traderules/ */
export const NBA_PICK_RULES: GmPickRules = {
  sport: 'nba',
  rounds: 2,
  tradableKinds: ['std'],
  singleTradeKinds: [],
  ledgerYears: 7,
  ledgerYearsIsLeagueRule: true,
  noTwoFirstlessYearsRunning: true,
  lottery: {
    clubs: 14,
    odds: [14.0, 14.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5],
    draws: 4,
    maxClimb: null,
    table: 'the 2026 draft',
  },
  comp: null,
  partial: [
    'The lottery table is the one the 2026 draft used. The league switched to a new lottery from the 2027 draft, and this game does not model it yet.',
    'In the second round, every club that missed the playoffs picks ahead of every playoff club here.',
  ],
};

/* NHL. Seven rounds.
     https://www.eliteprospects.com/page/how-does-the-nhl-draft-work
     https://www.flohockey.tv/articles/11212645-how-many-rounds-are-in-the-nhl-draft
   The lottery: the 16 clubs that missed the playoffs, two draws (the first
   pick, then the second), and no club climbs more than ten places, so only
   the bottom eleven can pick first.
     https://www.nhl.com/news/2026-nhl-draft-lottery-set-for-may-5
     https://sports.yahoo.com/articles/does-nhl-draft-lottery-explaining-111217430.html
   NOT MODELLED: a club may win the lottery no more than twice in five years
   (the second page above; the league page read today does not state it).
   NOT CONFIRMED TWICE: how many drafts ahead a pick can be traded. Three is
   the game's setting. */
export const NHL_PICK_RULES: GmPickRules = {
  sport: 'nhl',
  rounds: 7,
  tradableKinds: ['std'],
  singleTradeKinds: [],
  ledgerYears: 3,
  ledgerYearsIsLeagueRule: false,
  noTwoFirstlessYearsRunning: false,
  lottery: {
    clubs: 16,
    odds: [18.5, 13.5, 11.5, 9.5, 8.5, 7.5, 6.5, 6.0, 5.0, 3.5, 3.0, 2.5, 2.0, 1.5, 0.5, 0.5],
    draws: 2,
    maxClimb: 10,
    table: 'the 2026 draft',
  },
  comp: null,
  partial: ['The limit of two lottery wins in five years is not modelled.'],
};

/* MLB. Draft picks cannot be traded. The one exception is a Competitive
   Balance pick, which can be, once, by the club it was awarded to, and not
   for cash alone.
     https://www.mlb.com/glossary/transactions/competitive-balance-draft-picks
     https://www.mlbtraderumors.com/2024/07/rob-manfred-hints-at-changes-to-rules-on-trading-draft-picks.html
   That is why tradableKinds is ['cb'] and nothing else: an MLB package is
   players and prospects, and the reason is this data, never a check on the
   sport's name. No Competitive Balance picks are dealt out by this round
   (who gets one turns on club revenue and market size, which the game does
   not carry), so until an engine awards one there is no pick to move.
   Twenty rounds, and a draft lottery since the 2023 draft (the 18 clubs out
   of the playoffs, the first six picks drawn). Read by the round's review
   on 2026-10-02 at
     https://www.baseballamerica.com/stories/guide-to-the-new-cba-draft-lottery-expanded-playoffs-and-more/
   and confirmed a second time by its search (a CBS Sports report of the
   first MLB lottery, in 2023, and mlb.com's 2026 draft coverage of rounds
   5 to 20), whose addresses it did not record. Both facts stand; only the
   second address is owed.
   NOT MODELLED: the lottery itself. Its table of odds has not been read
   twice, so the order here is reverse standings and partial says so.
   Since no ordinary pick can move, the ledger carries this year's draft
   alone. */
export const MLB_PICK_RULES: GmPickRules = {
  sport: 'mlb',
  rounds: 20,
  tradableKinds: ['cb'],
  singleTradeKinds: ['cb'],
  ledgerYears: 1,
  ledgerYearsIsLeagueRule: false,
  noTwoFirstlessYearsRunning: false,
  lottery: null,
  comp: null,
  partial: [
    'The league runs a draft lottery; it is not modelled, so the order is reverse standings.',
    'No Competitive Balance picks are awarded yet, so there is no pick to trade.',
  ],
};

export const GM_PICK_RULES: Record<GmSportId, GmPickRules> = {
  nfl: NFL_PICK_RULES, nba: NBA_PICK_RULES, nhl: NHL_PICK_RULES, mlb: MLB_PICK_RULES,
};

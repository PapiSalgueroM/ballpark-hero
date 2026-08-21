/* Round 190: trade talks, one engine, four GM games.

   His Club Manager note said it in five words: "true negotiations not just
   3 buttons that say haggle." Club Manager got its structured deals in
   Round 161; the GM games kept a coin-flip: propose, and the other GM
   either shakes or hangs up, with one silent +Pick button as the only
   nuance. That is exactly the three-button haggle he banned.

   Now a proposal opens TALKS. The other general manager reads the value
   gap and answers like a person with a phone bill: a fair swap gets a
   handshake on the spot; a close one gets a concrete counter, "add a
   pick and we are done"; a stretch gets the honest letdown, "he is off
   the table at that price, but we would move THIS man instead", naming
   the best player they genuinely would trade into your offer; and an
   insult gets the dial tone. You can take whatever is on the table, or
   STAND FIRM exactly once, the same one-shot the free agency push
   established in Round 179: read your leverage right and they blink
   (the ask drops to nearly even), read it wrong and the price goes UP,
   which can turn their pick-counter into a lesser return or kill the
   talks outright. Standing firm is a real gamble, not a free reroll.

   Leverage is measured, not vibes: the odds move on whether their roster
   actually needs your man (how many bodies they already have at his
   position within two rating points) and on whether you are selling
   youth. The numbers live in STAND_FIRM_* constants with the reasoning
   attached, and the harness pins the whole ladder: every counter kind
   against its exact gap arithmetic, the one-shot rule, the blink and
   sour premiums, and the execution path that honors an agreed 1.02 deal
   which the old 1.08 threshold would have rejected.

   Shared-engine pattern per usCoachCareer (126), usCareerFreeAgency
   (179), foOwnerMandate (180), usCareerPress (184) and usCareerReveal
   (186): sport specifics arrive as data (the sport's pick value, its
   tradeValue function, the partner's roster), and the four boards render
   one shared card. Talks are TRANSIENT, never persisted: a reload lands
   on the trade tab and the phone call simply never happened, the
   market-window precedent. */

export interface TalksPlayer {
  id: string;
  name: string;
  pos: string;
  ovr: number;
  age: number;
  salary: number;
}

export interface TalksPackage {
  /** Who comes back. Starts as the man you asked for; a lesser-return
      counter swaps in the best player they would actually move. */
  theirPlayerId: string;
  theirPlayerName: string;
  /** True when the live package includes one of your picks. */
  addPick: boolean;
  /** The premium the deal executes at, for the harness's audit trail. */
  premium: number;
}

export type TalksPhase = 'agreed' | 'counter' | 'dead';

export interface TalksState {
  phase: TalksPhase;
  premium: number;
  /** One stand-firm per phone call, spent or not. */
  stoodFirm: boolean;
  counterKind: 'straight' | 'add-pick' | 'lesser-return' | 'hang-up';
  counterLine: string;
  /** The live package Accept executes. Null exactly when phase is dead. */
  pkg: TalksPackage | null;
  log: string[];
}

export interface TalksArgs {
  mine: TalksPlayer;
  want: TalksPlayer;
  /** The partner's full roster, so a lesser-return counter can name a
      real man. The engine never invents players. */
  theirRoster: TalksPlayer[];
  myPickCount: number;
  /** The sport's pick sweetener value (12 to 14 across the four libs). */
  pickValue: number;
  value: (p: TalksPlayer) => number;
  /** How many of THEIR players cover your man's position within two
      rating points. Thin cover is your leverage. */
  theirCoverAtMyPos: number;
  /** The sport's opening ask margin, matching its old instant-verdict
      threshold exactly (NFL 1.08, the other three 1.07), so any deal the
      old engine would have accepted still shakes on the spot. */
  openPremium: number;
}
/* They blink: almost even. The 2 percent left is the fee for making them. */
export const FIRM_PREMIUM = 1.02;
/* They do not blink: the price of pushing. */
export const SOUR_PREMIUM = 1.15;

/* Stand-firm odds: base 35 percent, plus 12 when their cover at your
   man's position is one body or none (they need him more than they let
   on), plus 8 when you are selling age-26-or-under (youth premium cuts
   both ways at the table). Clamped 20 to 60 so neither side ever holds
   all the cards. */
export const STAND_FIRM_BASE = 0.35;
export const STAND_FIRM_THIN_COVER = 0.12;
export const STAND_FIRM_YOUTH = 0.08;
export const STAND_FIRM_MIN = 0.2;
export const STAND_FIRM_MAX = 0.6;

export function standFirmOdds(a: TalksArgs): number {
  let o = STAND_FIRM_BASE;
  if (a.theirCoverAtMyPos <= 1) o += STAND_FIRM_THIN_COVER;
  if (a.mine.age <= 26) o += STAND_FIRM_YOUTH;
  return Math.min(STAND_FIRM_MAX, Math.max(STAND_FIRM_MIN, o));
}

/** Resolve what the other GM says at a given premium. Pure. */
function resolveAt(a: TalksArgs, premium: number, stoodFirm: boolean, log: string[]): TalksState {
  const gap = a.value(a.want) * premium - a.value(a.mine);
  if (gap <= 0) {
    return {
      phase: 'agreed', premium, stoodFirm, counterKind: 'straight',
      counterLine: `Straight swap. ${a.want.name} for ${a.mine.name}, and they shake on it.`,
      pkg: { theirPlayerId: a.want.id, theirPlayerName: a.want.name, addPick: false, premium },
      log,
    };
  }
  if (a.myPickCount > 0 && a.pickValue >= gap) {
    return {
      phase: 'counter', premium, stoodFirm, counterKind: 'add-pick',
      counterLine: `Close. Add a pick on top of ${a.mine.name} and ${a.want.name} is yours.`,
      pkg: { theirPlayerId: a.want.id, theirPlayerName: a.want.name, addPick: true, premium },
      log,
    };
  }
  /* The best man they would genuinely move for your offer, if any. */
  const lesser = a.theirRoster
    .filter(p => p.id !== a.want.id && a.value(p) * premium <= a.value(a.mine))
    .sort((x, y) => a.value(y) - a.value(x))[0];
  if (lesser) {
    return {
      phase: 'counter', premium, stoodFirm, counterKind: 'lesser-return',
      counterLine: `${a.want.name} is off the table at that price. They would move ${lesser.name} (${lesser.pos}, ${lesser.ovr}) for ${a.mine.name} instead.`,
      pkg: { theirPlayerId: lesser.id, theirPlayerName: lesser.name, addPick: false, premium },
      log,
    };
  }
  return {
    phase: 'dead', premium, stoodFirm, counterKind: 'hang-up',
    counterLine: `They hear the offer out, and they hang up. Nothing on their roster moves for that.`,
    pkg: null,
    log,
  };
}

/** Open the phone call at the sport's standard ask. */
export function openTalks(a: TalksArgs): TalksState {
  const s = resolveAt(a, a.openPremium, false, []);
  return { ...s, log: [s.counterLine] };
}

/** The one-shot push. A spent call, a dead line or a done deal all
    return unchanged: there is nothing left to push against. */
export function standFirm(state: TalksState, a: TalksArgs, rng: () => number): TalksState {
  if (state.stoodFirm || state.phase !== 'counter') return state;
  const odds = standFirmOdds(a);
  const blink = rng() < odds;
  const next = resolveAt(a, blink ? FIRM_PREMIUM : SOUR_PREMIUM, true, state.log);
  const line = blink
    ? `You stand firm. A long silence, and they blink.`
    : `You stand firm. They do not. The price just went up.`;
  return { ...next, log: [...state.log, line, next.counterLine] };
}

/**
 * Stadium Tycoon (Round 146): the idle game. The owner sent two reference
 * screenshots of an idle sports tycoon on 2026-08-17 and asked for ours,
 * "Suprise me on how ur going to do it but add so many things to it", with
 * animation called out twice. Everything here is original: our mechanics,
 * our names, our numbers, no other product's art or currency.
 *
 * The shape of the game: you run a small football club's matchday business.
 * Fans arrive if there is room and a reason; every fan pays at the gate and
 * spends at whatever you have built; the toy match on screen creates goal
 * moments that pay a bonus scaled by the crowd; winning runs grow the
 * fanbase. Spend income on nine upgrade tracks, prestige into Reputation
 * stars when the club outgrows itself, and the loop restarts faster.
 *
 * Everything below is PURE: the hook owns time and storage, this file owns
 * math. The sim harness (scripts/simStadiumTycoon.mjs) plays hours of the
 * game headless and asserts the curve: no softlock, no runaway, prestige
 * lands in a sane window, offline pay is capped.
 */

export interface TycoonTrack {
  id: string;
  name: string;
  emoji: string;
  /** What the track does, one line, shown under the name. */
  blurb: string;
  /** First level cost. */
  baseCost: number;
  /** Cost multiplier per level. */
  growth: number;
  /** Hard cap so the UI can show mastery; high enough to never feel near. */
  maxLevel: number;
}

/* The nine tracks. Costs and effects are tuned together with the harness:
 * the measured first prestige on a greedy strategy lands around 20 to 30
 * minutes of active play, and no state exists where nothing is affordable
 * within a minute of income. */
export const TRACKS: TycoonTrack[] = [
  { id: 'stands', name: 'Stands', emoji: '\u{1F3DF}\u{FE0F}', blurb: 'Seats. Every level adds room for 40 more fans', baseCost: 30, growth: 1.15, maxLevel: 200 },
  { id: 'tickets', name: 'Ticket Office', emoji: '\u{1F39F}\u{FE0F}', blurb: 'Faster turnstiles, better prices per fan', baseCost: 25, growth: 1.14, maxLevel: 200 },
  { id: 'snacks', name: 'Snack Bar', emoji: '\u{1F32D}', blurb: 'Every fan buys a little more each second', baseCost: 60, growth: 1.14, maxLevel: 200 },
  { id: 'shop', name: 'Club Shop', emoji: '\u{1F455}', blurb: 'Scarves and shirts, higher spend per fan', baseCost: 220, growth: 1.16, maxLevel: 200 },
  { id: 'parking', name: 'Parking', emoji: '\u{1F697}', blurb: 'Flat matchday money that never has a bad day', baseCost: 120, growth: 1.15, maxLevel: 200 },
  { id: 'lights', name: 'Floodlights', emoji: '\u{1F4A1}', blurb: 'Night games. New fans find the club faster', baseCost: 400, growth: 1.165, maxLevel: 150 },
  { id: 'squad', name: 'Squad', emoji: '⚽', blurb: 'Better players, more goals, longer win runs', baseCost: 150, growth: 1.16, maxLevel: 200 },
  { id: 'academy', name: 'Academy', emoji: '\u{1F331}', blurb: 'Kids and community. The fanbase grows on its own', baseCost: 900, growth: 1.175, maxLevel: 150 },
  { id: 'megaphone', name: 'Megaphone', emoji: '\u{1F4E3}', blurb: 'Your taps on the stadium hype the crowd for more', baseCost: 45, growth: 1.17, maxLevel: 120 },
];

export type TrackId = typeof TRACKS[number]['id'];

export interface TycoonState {
  v: number;
  money: number;
  lifetime: number;
  /** Reputation stars from prestiges: each is a permanent 50% income boost. */
  rep: number;
  levels: Record<string, number>;
  /** Fans who consider themselves fans; attendance is capped by seats. */
  fanbase: number;
  /** Current match minute 0-90, advanced by the hook. */
  minute: number;
  /** Goals in the current match, us and them. */
  goalsFor: number;
  goalsAgainst: number;
  /** Consecutive wins; feeds the streak multiplier. */
  streak: number;
  /** Opponent index, drives opponent strength scaling. */
  matchNo: number;
  /** Wall-clock ms of the last save, for offline earnings. */
  savedAt: number;
  /** Lifetime counters for the header and the harness. */
  totalGoals: number;
  totalWins: number;
  totalTaps: number;
}

export const TYCOON_SAVE_KEY = 'stadiumTycoonSaveV1';
const SAVE_VERSION = 1;

export function newTycoon(now: number): TycoonState {
  return {
    v: SAVE_VERSION,
    money: 40,
    lifetime: 0,
    rep: 0,
    levels: Object.fromEntries(TRACKS.map(t => [t.id, 0])),
    fanbase: 90,
    minute: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    streak: 0,
    matchNo: 0,
    savedAt: now,
    totalGoals: 0,
    totalWins: 0,
    totalTaps: 0,
  };
}

export function trackById(id: string): TycoonTrack {
  return TRACKS.find(t => t.id === id) ?? TRACKS[0];
}

export function levelOf(s: TycoonState, id: string): number {
  return s.levels[id] ?? 0;
}

/** Cost of the NEXT level of a track. */
export function costOf(s: TycoonState, id: string): number {
  const t = trackById(id);
  return Math.round(t.baseCost * Math.pow(t.growth, levelOf(s, id)));
}

/** Seats in the ground. The starting ground is a fence and two benches. */
export function capacity(s: TycoonState): number {
  return 120 + levelOf(s, 'stands') * 40;
}

/** Who actually turns up: the smaller of room and appetite. */
export function attendance(s: TycoonState): number {
  return Math.min(capacity(s), Math.floor(s.fanbase));
}

/** Reputation multiplier: each star is +50%, permanent. */
export function repMult(s: TycoonState): number {
  return 1 + s.rep * 0.5;
}

/** Win streak multiplier, capped so a long run is a treat, not the economy. */
export function streakMult(s: TycoonState): number {
  return 1 + Math.min(s.streak, 10) * 0.06;
}

/** Money per second per fan from each spending track, at a level. */
function perFanRate(s: TycoonState): number {
  const tk = levelOf(s, 'tickets');
  const sn = levelOf(s, 'snacks');
  const sh = levelOf(s, 'shop');
  // Gate money is the backbone; snacks and shop stack on top of it.
  return 0.05 + tk * 0.011 + sn * 0.009 + sh * 0.016;
}

/** The number on the header: money per second, all sources. */
export function incomePerSec(s: TycoonState): number {
  const fans = attendance(s);
  const perFan = perFanRate(s);
  const parking = levelOf(s, 'parking') * 0.9;
  return (fans * perFan + parking) * repMult(s) * streakMult(s);
}

/** One tap on the stadium. Megaphone makes taps matter deep into a run. */
export function tapValue(s: TycoonState): number {
  const mg = levelOf(s, 'megaphone');
  // Taps track income so clicking stays relevant deep into a run, but they
  // are seasoning, not the meal: the first tuning paid two full seconds of
  // income per tap and the harness measured a bored thumb TRIPLING the
  // economy, with first prestige landing at minute three. Now a tap pays
  // about 0.7s of income plus the megaphone's flat power.
  return Math.max(1, Math.round((incomePerSec(s) * 0.7 + mg * 2) * repMult(s)));
}

/** How fast the fanbase grows per second, before capacity pressure. */
export function fanGrowthPerSec(s: TycoonState): number {
  const lights = levelOf(s, 'lights');
  const academy = levelOf(s, 'academy');
  const base = 0.05 + lights * 0.05 + academy * 0.11;
  // A winning team is the best marketing department.
  const winPull = 1 + Math.min(s.streak, 10) * 0.08;
  // Growth slows as the fanbase outruns the seats: nobody follows a club
  // they can never get into. Never zero, so progress never fully stalls.
  const room = capacity(s) * 3;
  const pressure = s.fanbase >= room ? 0.15 : 1;
  return base * winPull * pressure;
}

/** Chance our toy team scores in one match minute. */
export function goalChancePerMin(s: TycoonState): number {
  const sq = levelOf(s, 'squad');
  return Math.min(0.16, 0.028 + sq * 0.0016);
}

/** Chance the opponent scores in one minute; opponents scale forever. */
export function oppChancePerMin(s: TycoonState): number {
  const sq = levelOf(s, 'squad');
  const opp = 0.024 + s.matchNo * 0.0011;
  // Your squad defends too: half its levels push the opponent back down.
  return Math.max(0.008, Math.min(0.14, opp - sq * 0.0008));
}

/** Bonus paid the moment we score: the crowd goes up as one. */
export function goalBonus(s: TycoonState): number {
  return Math.round(attendance(s) * 0.6 * repMult(s) * streakMult(s));
}

/** Bonus for winning a match, on top of the streak continuing. */
export function winBonus(s: TycoonState): number {
  return Math.round(attendance(s) * 2.2 * repMult(s));
}

/** Can this track be bought right now? */
export function canBuy(s: TycoonState, id: string): boolean {
  return levelOf(s, id) < trackById(id).maxLevel && s.money >= costOf(s, id);
}

/** Buy one level. Returns a NEW state, or the same state if not affordable. */
export function buy(s: TycoonState, id: string): TycoonState {
  if (!canBuy(s, id)) return s;
  const cost = costOf(s, id);
  return {
    ...s,
    money: s.money - cost,
    levels: { ...s.levels, [id]: levelOf(s, id) + 1 },
  };
}

/** One tap: money in, counter up. */
export function tap(s: TycoonState): TycoonState {
  const v = tapValue(s);
  return { ...s, money: s.money + v, lifetime: s.lifetime + v, totalTaps: s.totalTaps + 1 };
}

export interface TickEvent {
  kind: 'goal' | 'conceded' | 'win' | 'loss' | 'draw';
  amount?: number;
}

/**
 * Advance the sim by dt seconds. `roll` is the caller's randomness (the hook
 * passes Math.random, the harness passes a seeded stream). Match minutes run
 * at 1.4 real seconds each, so a full match is about two minutes of play.
 */
export function tick(s: TycoonState, dt: number, roll: () => number): { state: TycoonState; events: TickEvent[] } {
  const events: TickEvent[] = [];
  let st = { ...s, levels: { ...s.levels } };

  // Passive income and organic fan growth.
  const earned = incomePerSec(st) * dt;
  st.money += earned;
  st.lifetime += earned;
  st.fanbase += fanGrowthPerSec(st) * dt;

  // The match advances minute by minute.
  const MIN_LEN = 1.4;
  let minutes = Math.floor((st.minute * MIN_LEN + dt) / MIN_LEN) - st.minute;
  // A huge dt (returning from background) fast-forwards at most one match.
  minutes = Math.max(0, Math.min(minutes, 120));
  for (let i = 0; i < minutes; i++) {
    st.minute += 1;
    if (st.minute <= 90) {
      if (roll() < goalChancePerMin(st)) {
        st.goalsFor += 1;
        st.totalGoals += 1;
        const b = goalBonus(st);
        st.money += b;
        st.lifetime += b;
        events.push({ kind: 'goal', amount: b });
      }
      if (roll() < oppChancePerMin(st)) {
        st.goalsAgainst += 1;
        events.push({ kind: 'conceded' });
      }
    }
    if (st.minute >= 90) {
      // Full time: settle, pay, reset.
      if (st.goalsFor > st.goalsAgainst) {
        const b = winBonus(st);
        st.money += b;
        st.lifetime += b;
        st.streak += 1;
        st.totalWins += 1;
        st.fanbase += 6 + st.streak * 2;
        events.push({ kind: 'win', amount: b });
      } else if (st.goalsFor < st.goalsAgainst) {
        st.streak = 0;
        events.push({ kind: 'loss' });
      } else {
        // A draw keeps the streak alive but does not extend it.
        events.push({ kind: 'draw' });
      }
      st.matchNo += 1;
      st.minute = 0;
      st.goalsFor = 0;
      st.goalsAgainst = 0;
    }
  }
  return { state: st, events };
}

/* ---------------- prestige ---------------- */

/** Lifetime earnings needed for the NEXT star, growing per star owned.
 *  Tuned with the harness: the greedy floor strategy reaches the first star
 *  around minute 20, pure idling in under an hour. */
export function prestigeThreshold(s: TycoonState): number {
  return 4000000 * Math.pow(7, s.rep);
}

export function canPrestige(s: TycoonState): boolean {
  return s.lifetime >= prestigeThreshold(s);
}

/**
 * Sell up, move to a bigger ground, keep the reputation. Everything resets
 * except rep (and the lifetime counters that feed the manager card), and
 * every future second earns 50% more per star, forever.
 */
export function prestige(s: TycoonState, now: number): TycoonState {
  if (!canPrestige(s)) return s;
  const fresh = newTycoon(now);
  return {
    ...fresh,
    rep: s.rep + 1,
    totalGoals: s.totalGoals,
    totalWins: s.totalWins,
    totalTaps: s.totalTaps,
  };
}

/* ---------------- offline earnings ---------------- */

/** Away pay: half rate, capped at eight hours. Returns whole pounds. */
export function offlineEarnings(s: TycoonState, now: number): number {
  const elapsed = Math.max(0, (now - s.savedAt) / 1000);
  const capped = Math.min(elapsed, 8 * 3600);
  if (capped < 30) return 0; // a tab refresh is not a trip away
  return Math.round(incomePerSec(s) * capped * 0.5);
}

/* ---------------- save plumbing ---------------- */

export function serializeTycoon(s: TycoonState, now: number): string {
  return JSON.stringify({ ...s, savedAt: now });
}

export function deserializeTycoon(raw: string | null, now: number): TycoonState | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || p.v !== SAVE_VERSION) return null;
    const base = newTycoon(now);
    const s: TycoonState = {
      ...base,
      ...p,
      levels: { ...base.levels, ...(p.levels ?? {}) },
    };
    // Never trust stored numbers to be finite.
    for (const k of ['money', 'lifetime', 'fanbase'] as const) {
      if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = base[k];
    }
    if (!Number.isFinite(s.rep) || s.rep < 0 || s.rep > 50) s.rep = 0;
    return s;
  } catch {
    return null;
  }
}

/** Compact money formatting for the header and the tiles. */
export function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

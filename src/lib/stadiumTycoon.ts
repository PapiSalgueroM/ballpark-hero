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

import { roundRobinCalendar, tableOrder, mulberry32, hash32 } from '@/lib/leagueCore';

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
 * the measured first prestige on a greedy strategy lands around a quarter
 * of an hour of active play (12.7 to 13.3 minutes, measured in Round 583), and no state exists where nothing is affordable
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

/* ================================================================== */
/* Round 162: the massive version. His words: "a full game like a     */
/* Massive idle game... a ton better." Four new systems, every one    */
/* additive, every one pure, every one measured by the harness:       */
/* DIVISIONS to climb (the long arc), STAFF to hire (income that      */
/* scales into the billions), ACHIEVEMENTS (each one a permanent      */
/* income bonus, forever, across grounds), and the GOLDEN WHISTLE     */
/* (a catch-it-quick bonus that drifts across the pitch).             */
/* ================================================================== */

/* ---------- divisions: the ladder this ground is climbing ---------- */

export interface TycoonDivision {
  name: string;
  emoji: string;
  /** Wins at THIS ground to sit in this division. */
  winsNeeded: number;
  /** Everything earns this much more here: bigger stage, bigger money. */
  incomeMult: number;
  /** Opponents up here are better, permanently. */
  oppBoost: number;
}

/* Invented league names, checked by the harness against every real club
 * and league in the Club Manager world. Climbing is per GROUND: sell up
 * and the new club starts at the bottom with the rep multiplier for company. */
export const DIVISIONS: TycoonDivision[] = [
  { name: 'Muddy Meadows League', emoji: '🌧️', winsNeeded: 0, incomeMult: 1, oppBoost: 0 },
  { name: 'Gravel Lane League', emoji: '🧱', winsNeeded: 6, incomeMult: 1.15, oppBoost: 0.006 },
  { name: 'Tin Cup Division', emoji: '🥫', winsNeeded: 14, incomeMult: 1.32, oppBoost: 0.012 },
  { name: 'Ironworks League', emoji: '⚙️', winsNeeded: 25, incomeMult: 1.55, oppBoost: 0.019 },
  { name: 'Granite Division', emoji: '🪨', winsNeeded: 40, incomeMult: 1.85, oppBoost: 0.027 },
  { name: 'Silverline League', emoji: '🥈', winsNeeded: 60, incomeMult: 2.25, oppBoost: 0.036 },
  { name: 'Floodlit League', emoji: '💡', winsNeeded: 85, incomeMult: 2.8, oppBoost: 0.046 },
  { name: 'Velvet Division', emoji: '🎩', winsNeeded: 115, incomeMult: 3.5, oppBoost: 0.057 },
  { name: 'Crown Circuit', emoji: '👑', winsNeeded: 150, incomeMult: 4.4, oppBoost: 0.069 },
  { name: 'The Summit', emoji: '🏔️', winsNeeded: 200, incomeMult: 5.5, oppBoost: 0.082 },
];

/** Index into DIVISIONS for the current ground. Round 582: the league decides.
 *  A save without one (only ever mid-load) falls back to the old win count. */
export function divisionIndex(s: TycoonState): number {
  if (s.league) return Math.min(DIVISIONS.length - 1, Math.max(0, s.league.division | 0));
  return legacyDivisionIndex(s.groundWins ?? 0);
}

/** Round 162 to 581: the division a ground's home win count put it in. Since
 *  Round 582 promotion is by winning the league, and this survives only to seed
 *  the league of a save written before the league existed, so nobody drops. */
export function legacyDivisionIndex(groundWins: number): number {
  let idx = 0;
  for (let i = 0; i < DIVISIONS.length; i++) {
    if (groundWins >= DIVISIONS[i].winsNeeded) idx = i;
  }
  return idx;
}

export function divisionOf(s: TycoonState): TycoonDivision {
  return DIVISIONS[divisionIndex(s)];
}

/* ---------- staff: the payroll that earns while you sleep ---------- */

export interface TycoonStaff {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  baseCost: number;
  growth: number;
  /** Dollars per second per level, before the global multipliers. */
  rate: number;
  maxLevel: number;
}

/* Classic idle-building economics: each tier costs about 5x the last and
 * pays about 4.5x, so every tier is worth reaching and none is ever the
 * only answer. Rates and costs tuned with the harness: every tier pays
 * itself back inside a few minutes at the stage it unlocks. */
export const STAFF: TycoonStaff[] = [
  { id: 'steward', name: 'Turnstile Steward', emoji: '🧍', blurb: 'Keeps the queue moving and the coins counted', baseCost: 100, growth: 1.13, rate: 0.6, maxLevel: 300 },
  { id: 'pieChef', name: 'Pie Chef', emoji: '👨‍🍳', blurb: 'The half time pie that people cross town for', baseCost: 650, growth: 1.13, rate: 3.5, maxLevel: 300 },
  { id: 'kitman', name: 'Kit Man', emoji: '🧺', blurb: 'Shirts washed, boots ready, fines for lost socks', baseCost: 3500, growth: 1.13, rate: 16, maxLevel: 300 },
  { id: 'groundsman', name: 'Groundskeeper', emoji: '🌱', blurb: 'A pitch so good visiting teams ask for a photo', baseCost: 18000, growth: 1.135, rate: 70, maxLevel: 300 },
  { id: 'photographer', name: 'Club Photographer', emoji: '📷', blurb: 'Every goal framed and sold by the exit', baseCost: 95000, growth: 1.135, rate: 300, maxLevel: 300 },
  { id: 'megastore', name: 'Megastore Manager', emoji: '🏬', blurb: 'Third kits, fourth kits, a candle that smells of grass', baseCost: 520000, growth: 1.14, rate: 1300, maxLevel: 300 },
  { id: 'commercial', name: 'Commercial Director', emoji: '💼', blurb: 'Shakes hands, signs deals, never watches the match', baseCost: 2800000, growth: 1.14, rate: 5800, maxLevel: 300 },
  { id: 'legend', name: 'Club Legend Ambassador', emoji: '🐐', blurb: 'Retired, beloved, worth a stand full of season ticket renewals', baseCost: 15000000, growth: 1.145, rate: 26000, maxLevel: 300 },
];

export function staffById(id: string): TycoonStaff {
  return STAFF.find(t => t.id === id) ?? STAFF[0];
}

export function staffLevelOf(s: TycoonState, id: string): number {
  return (s.staffLevels ?? {})[id] ?? 0;
}

export function staffCostOf(s: TycoonState, id: string): number {
  const t = staffById(id);
  return Math.round(t.baseCost * Math.pow(t.growth, staffLevelOf(s, id)));
}

export function canHire(s: TycoonState, id: string): boolean {
  return staffLevelOf(s, id) < staffById(id).maxLevel && s.money >= staffCostOf(s, id);
}

export function hire(s: TycoonState, id: string): TycoonState {
  if (!canHire(s, id)) return s;
  const cost = staffCostOf(s, id);
  return {
    ...s,
    money: s.money - cost,
    staffLevels: { ...(s.staffLevels ?? {}), [id]: staffLevelOf(s, id) + 1 },
  };
}

export function totalStaffLevels(s: TycoonState): number {
  return STAFF.reduce((sum, t) => sum + staffLevelOf(s, t.id), 0);
}

/** Staff income before the global multipliers. Round 196: the Veteran
 *  Payroll legacy perk raises every rate here, at the source, so the
 *  payroll line and the income line can never disagree about it. */
export function staffBaseIncome(s: TycoonState): number {
  return STAFF.reduce((sum, t) => sum + staffLevelOf(s, t.id) * t.rate, 0) * payrollMult(s);
}

/* ---------- the golden whistle: catch it before it drifts away ---------- */

export type GoldenKind = 'frenzy' | 'tapRush' | 'windfall' | 'fanWave' | 'freeLevel';

/** Round 583: what the two timed whistles multiply, read by the engine and by
 *  the words that name them, so the blurb cannot drift from the payout. */
export const FRENZY_MULT = 7;
export const TAP_RUSH_MULT = 25;
export const GOLDEN_INFO: Record<GoldenKind, { label: string; blurb: string; duration: number }> = {
  frenzy: { label: 'DERBY DAY', blurb: `income pays x${FRENZY_MULT}`, duration: 77 },
  tapRush: { label: 'CROWD SURGE', blurb: `taps pay x${TAP_RUSH_MULT}`, duration: 30 },
  windfall: { label: 'TV WINDFALL', blurb: 'fifteen minutes of income, instantly', duration: 0 },
  fanWave: { label: 'WONDERGOAL GOES VIRAL', blurb: 'the fanbase jumps', duration: 0 },
  freeLevel: { label: 'SPONSOR GIFT', blurb: 'a free upgrade level', duration: 0 },
};

/** What a fresh whistle carries. Weighted toward the fun ones. */
export function rollGoldenKind(roll: () => number): GoldenKind {
  const r = roll();
  if (r < 0.34) return 'frenzy';
  if (r < 0.54) return 'tapRush';
  if (r < 0.79) return 'windfall';
  if (r < 0.91) return 'fanWave';
  return 'freeLevel';
}

export function goldenActive(s: TycoonState): boolean {
  return (s.goldenLeftSec ?? 0) > 0 && !!s.goldenKind;
}

/**
 * Catch a whistle. Timed kinds light their clock; instant kinds pay on the
 * spot. No-op while one is already lit, so effects never stack.
 * The windfall pays fifteen minutes of the CURRENT rate (no golden active
 * by construction here), capped so a doctored state cannot print money.
 */
/** Round 583: the whistle's numbers, exported so the help reads them rather
 *  than typing them. A TV WINDFALL pays this many seconds of income. */
export const WINDFALL_SEC = 900;
/** A whistle drifts away after this many seconds uncaught. */
export const GOLDEN_CATCH_SEC = 12;
/** One drifts in on average every this many seconds of play. */
export const GOLDEN_MEAN_GAP_SEC = 150;

export function catchGolden(s: TycoonState, kind: GoldenKind): { state: TycoonState; amount?: number } {
  if (goldenActive(s)) return { state: s };
  const st: TycoonState = { ...s, goldenCaught: (s.goldenCaught ?? 0) + 1 };
  if (kind === 'frenzy' || kind === 'tapRush') {
    st.goldenKind = kind;
    // Round 196: Gold Polish stretches the timed kinds, never the instant ones.
    st.goldenLeftSec = GOLDEN_INFO[kind].duration * charmMult(s);
    return { state: st };
  }
  if (kind === 'windfall') {
    const pay = Math.round(Math.min(incomePerSec(s) * WINDFALL_SEC, 1e15));
    st.money += pay;
    st.lifetime += pay;
    return { state: st, amount: pay };
  }
  if (kind === 'fanWave') {
    const bump = Math.max(50, Math.round(s.fanbase * 0.12));
    st.fanbase = s.fanbase + bump;
    return { state: st, amount: bump };
  }
  // freeLevel: the cheapest still-buyable track levels up, on the house.
  const open = TRACKS.filter(t => levelOf(s, t.id) < t.maxLevel);
  if (!open.length) return { state: st };
  const cheapest = open.sort((a, b) => costOf(s, a.id) - costOf(s, b.id))[0];
  st.levels = { ...st.levels, [cheapest.id]: levelOf(s, cheapest.id) + 1 };
  return { state: st };
}

/* ---------- achievements: every first is worth 2% forever ---------- */

export interface TycoonAchievement {
  id: string;
  label: string;
  emoji: string;
  hit: (s: TycoonState) => boolean;
}

/** Each earned achievement is a permanent +2% income, across every ground,
 *  forever. Forty seven of them: the long game's long game. */
export const ACH_BONUS = 0.02;

export const ACHIEVEMENTS: TycoonAchievement[] = [
  // The fanbase.
  { id: 'af500', label: '500 fans', emoji: '👥', hit: s => s.fanbase >= 500 },
  { id: 'af2k', label: '2,000 fans', emoji: '👥', hit: s => s.fanbase >= 2000 },
  { id: 'af10k', label: '10,000 fans', emoji: '👥', hit: s => s.fanbase >= 10000 },
  { id: 'af50k', label: '50,000 fans', emoji: '🌆', hit: s => s.fanbase >= 50000 },
  { id: 'af250k', label: 'A quarter million fans', emoji: '🌇', hit: s => s.fanbase >= 250000 },
  { id: 'af1m', label: 'A million fans', emoji: '🌍', hit: s => s.fanbase >= 1000000 },
  // The ground.
  { id: 'ac500', label: '500 seats', emoji: '🏟️', hit: s => capacity(s) >= 500 },
  { id: 'ac2000', label: '2,000 seats', emoji: '🏟️', hit: s => capacity(s) >= 2000 },
  { id: 'ac8000', label: '8,000 seats', emoji: '🏟️', hit: s => capacity(s) >= 8000 },
  // Wins, career.
  { id: 'aw1', label: 'First career win', emoji: '🏁', hit: s => s.totalWins >= 1 },
  { id: 'aw10', label: '10 career wins', emoji: '🏁', hit: s => s.totalWins >= 10 },
  { id: 'aw50', label: '50 career wins', emoji: '🏁', hit: s => s.totalWins >= 50 },
  { id: 'aw150', label: '150 career wins', emoji: '🏆', hit: s => s.totalWins >= 150 },
  { id: 'aw400', label: '400 career wins', emoji: '🏆', hit: s => s.totalWins >= 400 },
  // Goals.
  { id: 'ag25', label: '25 goals', emoji: '⚽', hit: s => s.totalGoals >= 25 },
  { id: 'ag100', label: '100 goals', emoji: '⚽', hit: s => s.totalGoals >= 100 },
  { id: 'ag500', label: '500 goals', emoji: '⚽', hit: s => s.totalGoals >= 500 },
  { id: 'ag2000', label: '2,000 goals', emoji: '🥅', hit: s => s.totalGoals >= 2000 },
  // Streaks.
  { id: 'as5', label: 'Five straight wins', emoji: '🔥', hit: s => s.streak >= 5 },
  { id: 'as10', label: 'Ten straight wins', emoji: '🔥', hit: s => s.streak >= 10 },
  // Taps.
  { id: 'at100', label: '100 taps', emoji: '👆', hit: s => s.totalTaps >= 100 },
  { id: 'at1k', label: '1,000 taps', emoji: '👆', hit: s => s.totalTaps >= 1000 },
  { id: 'at10k', label: '10,000 taps', emoji: '🖐️', hit: s => s.totalTaps >= 10000 },
  // Money, lifetime this ground.
  { id: 'am10k', label: '$10K lifetime', emoji: '💵', hit: s => s.lifetime >= 1e4 },
  { id: 'am1m', label: '$1M lifetime', emoji: '💰', hit: s => s.lifetime >= 1e6 },
  { id: 'am100m', label: '$100M lifetime', emoji: '💰', hit: s => s.lifetime >= 1e8 },
  { id: 'am10b', label: '$10B lifetime', emoji: '🤑', hit: s => s.lifetime >= 1e10 },
  { id: 'am1t', label: '$1T lifetime', emoji: '🏦', hit: s => s.lifetime >= 1e12 },
  // Matches.
  { id: 'amt25', label: '25 matches played', emoji: '📅', hit: s => (s.totalMatches ?? 0) >= 25 },
  { id: 'amt100', label: '100 matches played', emoji: '📅', hit: s => (s.totalMatches ?? 0) >= 100 },
  { id: 'amt400', label: '400 matches played', emoji: '📅', hit: s => (s.totalMatches ?? 0) >= 400 },
  // Staff.
  { id: 'ast10', label: '10 staff hired', emoji: '🧑‍🤝‍🧑', hit: s => totalStaffLevels(s) >= 10 },
  { id: 'ast50', label: '50 staff hired', emoji: '🧑‍🤝‍🧑', hit: s => totalStaffLevels(s) >= 50 },
  { id: 'ast150', label: '150 staff hired', emoji: '🏢', hit: s => totalStaffLevels(s) >= 150 },
  { id: 'astall', label: 'Every role filled at least once', emoji: '📋', hit: s => STAFF.every(t => staffLevelOf(s, t.id) >= 1) },
  // Divisions (career best, survives selling up).
  { id: 'ad2', label: 'Reach the Tin Cup Division', emoji: '🥫', hit: s => (s.bestDivision ?? 0) >= 2 },
  { id: 'ad4', label: 'Reach the Granite Division', emoji: '🪨', hit: s => (s.bestDivision ?? 0) >= 4 },
  { id: 'ad6', label: 'Reach the Floodlit League', emoji: '💡', hit: s => (s.bestDivision ?? 0) >= 6 },
  { id: 'ad8', label: 'Reach the Crown Circuit', emoji: '👑', hit: s => (s.bestDivision ?? 0) >= 8 },
  { id: 'ad9', label: 'Reach The Summit', emoji: '🏔️', hit: s => (s.bestDivision ?? 0) >= 9 },
  // Reputation.
  { id: 'ar1', label: 'First reputation star', emoji: '⭐', hit: s => s.rep >= 1 },
  { id: 'ar3', label: 'Three reputation stars', emoji: '⭐', hit: s => s.rep >= 3 },
  { id: 'ar6', label: 'Six reputation stars', emoji: '🌟', hit: s => s.rep >= 6 },
  // Hype and gold.
  { id: 'ab3', label: 'Three hype boosts pressed', emoji: '📣', hit: s => (s.boostsUsed ?? 0) >= 3 },
  { id: 'ab20', label: 'Twenty hype boosts pressed', emoji: '📣', hit: s => (s.boostsUsed ?? 0) >= 20 },
  { id: 'agw5', label: 'Five golden whistles caught', emoji: '🪙', hit: s => (s.goldenCaught ?? 0) >= 5 },
  { id: 'agw25', label: 'Twenty five golden whistles caught', emoji: '🪙', hit: s => (s.goldenCaught ?? 0) >= 25 },
];

export function achMult(s: TycoonState): number {
  return 1 + (s.ach ?? []).length * ACH_BONUS;
}

/* ================================================================== */
/* Round 196: the legacy boardroom. His standing ask on the idle game */
/* is "keep going", and the genre's deepest missing layer here was a  */
/* prestige SHOP: selling up pays legacy points scaled by how high    */
/* this ground climbed (1 point, plus 1 per division), and the points */
/* buy permanent perks that survive every future sale. The tension is */
/* the point: sell the moment the bar fills, or push divisions first  */
/* for a fatter legacy. Every perk is a bounded multiplier or a small */
/* quality-of-life rule, measured by the harness, never a printing    */
/* press. Everything stays pure: the page renders, this file owns it. */
/* ================================================================== */

export interface TycoonLegacyPerk {
  id: string;
  name: string;
  emoji: string;
  /** What the perk does, one line, exact numbers, shown on the card. */
  blurb: string;
  /** Cost in legacy points of level i+1 is costs[i]; length is the cap. */
  costs: number[];
}

/* Maxing the whole board costs exactly 100 points, about ten sales from
 * The Summit or a long career of honest mid-table flips. */
export const LEGACY_PERKS: TycoonLegacyPerk[] = [
  { id: 'sway', name: 'Boardroom Sway', emoji: '\u{1F3DB}\u{FE0F}', blurb: 'Matchday income pays 10% more per level, forever', costs: [3, 5, 8, 12, 17] },
  { id: 'rolling', name: 'Rolling Investment', emoji: '\u{1F4BC}', blurb: 'Every next ground opens with seed money in the till', costs: [1, 2, 4] },
  { id: 'roots', name: 'Deep Roots', emoji: '\u{1F331}', blurb: 'The fanbase grows 15% faster per level, every ground', costs: [1, 3, 6] },
  { id: 'payroll', name: 'Veteran Payroll', emoji: '\u{1F9D1}\u{200D}\u{1F4BC}', blurb: 'Every staff member earns 20% more per level', costs: [2, 4, 8] },
  { id: 'shield', name: 'Steady Dressing Room', emoji: '\u{1F9E4}', blurb: 'A loss keeps half the win streak instead of ending it', costs: [3] },
  { id: 'away', name: 'Away Day Deal', emoji: '\u{1F68C}', blurb: 'Away pay rises to 65 then 80 percent, trips cap at 10 then 12 hours', costs: [2, 4] },
  { id: 'voltage', name: 'Stadium Voltage', emoji: '\u{26A1}', blurb: 'Matchday Hype charges a full minute faster per level', costs: [2, 4] },
  { id: 'charm', name: 'Gold Polish', emoji: '\u{1FA99}', blurb: 'Timed golden whistles run 25% longer per level', costs: [3, 6] },
];

/** Seed money the Rolling Investment adds to a fresh ground, by level. */
const ROLLING_SEED = [0, 500, 2500, 12000];

export function perkById(id: string): TycoonLegacyPerk | null {
  return LEGACY_PERKS.find(p => p.id === id) ?? null;
}

export function perkLevelOf(s: TycoonState, id: string): number {
  return (s.legacyPerks ?? {})[id] ?? 0;
}

export function legacyPointsOf(s: TycoonState): number {
  return s.legacyPoints ?? 0;
}

export function totalPerkLevels(s: TycoonState): number {
  return LEGACY_PERKS.reduce((sum, p) => sum + perkLevelOf(s, p.id), 0);
}

/** Cost in points of the NEXT level, or null at the cap. */
export function perkCostOf(s: TycoonState, id: string): number | null {
  const p = perkById(id);
  if (!p) return null;
  const lvl = perkLevelOf(s, id);
  return lvl >= p.costs.length ? null : p.costs[lvl];
}

export function canBuyPerk(s: TycoonState, id: string): boolean {
  const cost = perkCostOf(s, id);
  return cost !== null && legacyPointsOf(s) >= cost;
}

/** Spend points on one perk level. Same state back if not affordable. */
export function buyPerk(s: TycoonState, id: string): TycoonState {
  if (!canBuyPerk(s, id)) return s;
  const cost = perkCostOf(s, id) as number;
  return {
    ...s,
    legacyPoints: legacyPointsOf(s) - cost,
    legacyPerks: { ...(s.legacyPerks ?? {}), [id]: perkLevelOf(s, id) + 1 },
  };
}

/** What selling up RIGHT NOW pays in legacy points: one for the sale,
 *  one per division this ground climbed. Sell early for the star, or
 *  push the ladder first for the legacy. */
export function pointsForSale(s: TycoonState): number {
  return 1 + divisionIndex(s);
}

/** Boardroom Sway: a flat forever-multiplier on the income line. */
export function swayMult(s: TycoonState): number {
  return 1 + perkLevelOf(s, 'sway') * 0.10;
}

/** Deep Roots: the fanbase compounds faster. */
export function rootsMult(s: TycoonState): number {
  return 1 + perkLevelOf(s, 'roots') * 0.15;
}

/** Veteran Payroll: every staff rate up. */
export function payrollMult(s: TycoonState): number {
  return 1 + perkLevelOf(s, 'payroll') * 0.20;
}

/** Gold Polish: timed whistles burn longer. */
export function charmMult(s: TycoonState): number {
  return 1 + perkLevelOf(s, 'charm') * 0.25;
}

/** Stadium Voltage: seconds of play a full hype charge needs. */
export function boostChargeSecOf(s: TycoonState): number {
  return BOOST_CHARGE_SEC - perkLevelOf(s, 'voltage') * 60;
}

/** Away Day Deal: the away pay rate and its cap in hours. */
export function offlineRateOf(s: TycoonState): number {
  return [0.5, 0.65, 0.8][perkLevelOf(s, 'away')] ?? 0.5;
}

export function offlineCapHoursOf(s: TycoonState): number {
  return [8, 10, 12][perkLevelOf(s, 'away')] ?? 8;
}

/** Rolling Investment: the till a fresh ground opens with. */
export function startingMoneyOf(s: TycoonState): number {
  return 40 + (ROLLING_SEED[perkLevelOf(s, 'rolling')] ?? 0);
}

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
  /** Round 424: play seconds banked toward the next whole match minute. Without
   *  this the sub-minute remainder was discarded on every tick and the clock
   *  never moved at all. Optional so existing saves load and simply start
   *  banking from zero. */
  matchSec?: number;
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
  /** Round 150, Matchday Hype: seconds of charge banked toward the boost
   *  (full at BOOST_CHARGE_SEC), and seconds left on an active boost. Both
   *  advance only inside tick, so the lib stays pure and offline time never
   *  charges or spends hype. */
  boostChargeSec: number;
  boostLeftSec: number;
  /** Round 152: milestone ids already paid this CAREER. Survives prestige,
   *  because the counters they read survive prestige too. */
  claimed: string[];
  /** Round 162: wins at THIS ground, the division ladder's fuel. Resets
   *  when you sell up: a new club starts at the bottom again. */
  groundWins?: number;
  /** Round 162: the best division index ever reached, career-wide. */
  bestDivision?: number;
  /** Round 162: staff levels by id. Payroll survives nothing: selling up
   *  means a new club and a new staff room. */
  staffLevels?: Record<string, number>;
  /** Round 162: achievement ids earned, career-wide, each +2% forever. */
  ach?: string[];
  /** Round 162: the golden whistle's live effect, if one is lit. */
  goldenKind?: GoldenKind | null;
  goldenLeftSec?: number;
  /** Round 162: career counters for the achievement wall. */
  goldenCaught?: number;
  boostsUsed?: number;
  totalMatches?: number;
  /** Round 196: unspent legacy points. Earned at every sale, spent in the
   *  boardroom, forever like the badges. */
  legacyPoints?: number;
  /** Round 196: perk levels by id. Permanent, across every ground. */
  legacyPerks?: Record<string, number>;
  /** Round 196: migration latch. Saves from before the boardroom get one
   *  point per already-earned star exactly once (the minimum any of those
   *  sales could have paid); this flag stops the grant repeating. */
  legacySeeded?: boolean;
  /** Round 582: this ground's league: the division, the season, the table and
   *  the rivals. Optional so every older save loads; the loader seeds one from
   *  the old win count the first time. */
  league?: TycoonLeague;
  /** Round 582: league titles won, career-wide. Survives selling up. */
  leagueTitles?: number;
  /** Round 582: the club name picked from the generated banks, career-wide.
   *  Absent means "Your club". Never free text. */
  clubName?: string;
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
    boostChargeSec: 0,
    boostLeftSec: 0,
    claimed: [],
    groundWins: 0,
    bestDivision: 0,
    staffLevels: {},
    ach: [],
    goldenKind: null,
    goldenLeftSec: 0,
    goldenCaught: 0,
    boostsUsed: 0,
    totalMatches: 0,
    /* Round 196: a brand-new career needs no migration grant. */
    legacyPoints: 0,
    legacyPerks: {},
    legacySeeded: true,
    /* Round 582: a fresh club always meets the same Muddy Meadows. */
    league: newLeague(0, 0, 0),
    leagueTitles: 0,
  };
}

/* Round 152: milestones. One-time payouts for the club's firsts, so growth
 * has punctuation: the moment the thousandth fan squeezes in or the tenth
 * win lands, the game says so and pays for it. Each fires exactly once per
 * CAREER, surviving prestige on purpose: the win and goal counters carry
 * across grounds, so a per-ground reset would re-pay "first win" the
 * instant you sold up, at the rep multiplier, for free. Payouts are sized
 * as a nudge, roughly a minute of income at the stage they unlock, never an
 * economy of their own. The harness pins the exactly-once rule. */
export interface TycoonMilestone {
  id: string;
  label: string;
  /** Payout in dollars BEFORE the reputation multiplier. */
  pay: number;
  /** Does this state qualify? Pure check against the current state. */
  hit: (s: TycoonState) => boolean;
}

export const MILESTONES: TycoonMilestone[] = [
  { id: 'fans500', label: '500 fans follow the club', pay: 400, hit: s => s.fanbase >= 500 },
  { id: 'fans2k', label: '2,000 fans follow the club', pay: 2500, hit: s => s.fanbase >= 2000 },
  { id: 'fans10k', label: '10,000 fans follow the club', pay: 20000, hit: s => s.fanbase >= 10000 },
  { id: 'full', label: 'First full house', pay: 600, hit: s => capacity(s) > 120 && attendance(s) >= capacity(s) },
  { id: 'win1', label: 'First win', pay: 250, hit: s => s.totalWins >= 1 },
  { id: 'win10', label: '10 wins', pay: 3000, hit: s => s.totalWins >= 10 },
  { id: 'win50', label: '50 wins', pay: 30000, hit: s => s.totalWins >= 50 },
  { id: 'goals25', label: '25 goals scored', pay: 4000, hit: s => s.totalGoals >= 25 },
  { id: 'streak5', label: 'Five wins in a row', pay: 6000, hit: s => s.streak >= 5 },
  { id: 'allTracks', label: 'Every upgrade owned at least once', pay: 8000, hit: s => TRACKS.every(t => (s.levels[t.id] ?? 0) >= 1) },
];

/* Round 153: the opposition gets a name. "THEM" was doing the job, but a
 * scoreboard that says Ironbridge Rovers is a world and a scoreline is just
 * math. Names are generated from two banks, deterministic per match number
 * and reputation (a new ground meets a fresh fixture list), and the banks
 * are invented places and suffixes on purpose: simStadiumTycoon asserts no
 * generated combination collides with any real club name in the Club
 * Manager world, so this game can never accidentally put a real badge on a
 * toy opponent. */
const OPP_PLACES = [
  'Ironbridge', 'Harborview', 'Redmoor', 'Saltcliff', 'Windmere', 'Ashvale',
  'Stonegate', 'Brightwater', 'Fernhill', 'Oldmarket', 'Kestrel Park', 'Duskfield',
  'Northquay', 'Silverbeck', 'Crowhurst', 'Emberton', 'Foxglove', 'Greyharbor',
  'Hollowbrook', 'Larkspur', 'Mistral', 'Pinecrest', 'Quarryside', 'Thornbury',
];
const OPP_SUFFIXES = [
  'Rovers', 'Athletic', 'Wanderers', 'Town', 'County', 'Albion',
  'Harriers', 'Corinthians', 'Swifts', 'Rangers', 'Olympic', 'Victoria',
];

/** Round 146 to 581: the opponent a match drew before the league, stable for
 *  that match. Since Round 582 it names only the match an older save was in the
 *  middle of when it first loaded, which finishes outside the table. */
export function legacyOpponentName(s: TycoonState): string {
  const k = (s.matchNo ?? 0) + (s.rep ?? 0) * 137;
  const h = ((k * 2654435761) >>> 0);
  const place = OPP_PLACES[h % OPP_PLACES.length];
  const suffix = OPP_SUFFIXES[Math.floor(h / OPP_PLACES.length) % OPP_SUFFIXES.length];
  return `${place} ${suffix}`;
}

/** Every combination the generator can produce, for the collision harness. */
export function allOpponentNames(): string[] {
  const out: string[] = [];
  for (const p of OPP_PLACES) for (const sfx of OPP_SUFFIXES) out.push(`${p} ${sfx}`);
  return out;
}

/* ================================================================== */
/* Round 582: the league. The owner's list for the tycoon merge:      */
/* "divisions and a scoreboard against named generated opponents,    */
/* promotion by winning your league". Until now a ground climbed on   */
/* its home win count and every match drew a fresh name; now each     */
/* division is a small league of rivals with a table, and only the    */
/* champion goes up (docs/design/round-580-tycoon-merge.md, section   */
/* 8). No relegation, on purpose: income multipliers stay monotone    */
/* per ground and a school-age audience gets no loss loop.            */
/* ================================================================== */

export interface LeagueClub {
  name: string;
  /** Strength against the division's baseline, per minute. Zero for you. */
  offset: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface TycoonLeague {
  division: number;
  /** Seasons started at this ground, counted from 0. Seeds the rivals. */
  season: number;
  /** The next matchday to be played, from 0. */
  matchday: number;
  /** The seed this set of rivals was drawn from. */
  seed: number;
  /** Round 582 review: the career match count when this division's league was
   *  drawn. Its rivals play at that strength for as long as you chase the title,
   *  so a club that could compete on arrival can always win it eventually. */
  baseMatchNo?: number;
  /** Index 0 is you. */
  clubs: LeagueClub[];
  /** An older save's match in progress when it first loaded: played to full
   *  time against this name, outside the table, before matchday 1. */
  carryover?: string;
}

export const YOUR_CLUB = 'Your club';
/** The longest rival name the league draws. Measured, not counted: the contract
 *  said 19 characters fit the table's club column at 390 wide, and
 *  scripts/playLeagueTableFit.mjs rendered all 249 and found 10 of the 18 and
 *  19 character names clipping ("Redmoor Corinthians", the Wanderers), because
 *  width is letters, not length. At 17 all 168 names fit. */
export const LEAGUE_NAME_MAX = 17;
/** Rivals are spread this far either side of the division's baseline. */
const OFFSET_SPREAD = 0.006;
/**
 * Divisions below this play one leg, every other club once; the rest play home
 * and away. A six club double round robin is ten matchdays, 21 watched minutes,
 * and before the league a greedy player's first promotion already came at a
 * median of 14.7 minutes against a first Sell up at 13.4
 * (scripts/data/tycoonLeagueBaseline.json), so a full double season at the
 * bottom would push the first promotion far past the first sale. The contract's
 * fallback (section 5): the first three divisions play the first leg only.
 */
export const SINGLE_LEG_BELOW = 3;

/** How big a division's league is and how long its season runs. */
export function leagueShape(division: number): { clubs: number; matchdays: number; perMatchday: number } {
  const clubs = division <= 2 ? 6 : division <= 5 ? 8 : 10;
  const legs = division < SINGLE_LEG_BELOW ? 1 : 2;
  return { clubs, matchdays: (clubs - 1) * legs, perMatchday: clubs / 2 };
}

/** The generated names short enough for the table. */
export function leagueNameBank(): string[] {
  return allOpponentNames().filter(n => n.length <= LEAGUE_NAME_MAX);
}

function blankClub(name: string, offset: number): LeagueClub {
  return { name, offset, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

/** Offsets evenly spaced from -SPREAD to +SPREAD, mean zero, in a seeded order. */
function spreadOffsets(count: number, rnd: () => number): number[] {
  const out = Array.from({ length: count }, (_, i) => (count <= 1 ? 0 : -OFFSET_SPREAD + (2 * OFFSET_SPREAD * i) / (count - 1)));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A fresh league for this ground at this division: rivals drawn without
 *  replacement from the name bank, seeded by (rep, division, season), so the same
 *  ground always meets the same rivals. No Math.random, no clock. */
export function newLeague(rep: number, division: number, season: number, clubName?: string, baseMatchNo = 0): TycoonLeague {
  const { clubs } = leagueShape(division);
  const seed = hash32(rep | 0, division | 0, season | 0, 582);
  const rnd = mulberry32(seed);
  const you = clubName ?? YOUR_CLUB;
  const bank = leagueNameBank().filter(n => n !== you);
  for (let i = 0; i < clubs - 1; i += 1) {
    const j = i + Math.floor(rnd() * (bank.length - i));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  const offsets = spreadOffsets(clubs - 1, mulberry32(hash32(seed, season | 0)));
  return {
    division,
    season,
    matchday: 0,
    seed,
    baseMatchNo: Math.max(0, Math.floor(baseMatchNo)),
    clubs: [blankClub(you, 0), ...bank.slice(0, clubs - 1).map((n, i) => blankClub(n, offsets[i]))],
  };
}

/** A failed season: the same rivals come back with their strengths reshuffled. */
function nextSeason(lg: TycoonLeague): TycoonLeague {
  const season = lg.season + 1;
  const offsets = spreadOffsets(lg.clubs.length - 1, mulberry32(hash32(lg.seed, season)));
  return {
    division: lg.division,
    season,
    matchday: 0,
    seed: lg.seed,
    baseMatchNo: lg.baseMatchNo,
    clubs: lg.clubs.map((c, i) => blankClub(c.name, i === 0 ? 0 : offsets[i - 1])),
  };
}

/** This matchday's fixtures, as pairs of club indexes. */
export function matchdayFixtures(lg: TycoonLeague): [number, number][] {
  const { perMatchday } = leagueShape(lg.division);
  const calendar = roundRobinCalendar(lg.clubs.length);
  return calendar.slice(lg.matchday * perMatchday, (lg.matchday + 1) * perMatchday);
}

/** The index of the club you meet on this matchday. */
export function yourOpponentIndex(lg: TycoonLeague): number {
  const f = matchdayFixtures(lg).find(([h, a]) => h === 0 || a === 0);
  return f ? (f[0] === 0 ? f[1] : f[0]) : 1;
}

/** The table, in order: points, goal difference, goals for, then a dead heat
 *  goes to your club (Round 582 review: sorting it by name meant "Your club"
 *  lost every one), then name. */
export function leagueStandings(lg: TycoonLeague): LeagueClub[] {
  const you = lg.clubs[0];
  return [...lg.clubs].sort((a, b) => tableOrder(a, b) || (a === you ? -1 : b === you ? 1 : 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Your place in the table, from 1. */
export function leaguePosition(lg: TycoonLeague): number {
  return leagueStandings(lg).indexOf(lg.clubs[0]) + 1;
}

/** The name of the opponent in the match being played. */
export function opponentName(s: TycoonState): string {
  const lg = s.league;
  if (!lg) return legacyOpponentName(s);
  if (lg.carryover) return lg.carryover;
  return lg.clubs[yourOpponentIndex(lg)]?.name ?? legacyOpponentName(s);
}

/** The current opponent's strength against the baseline, per minute. */
export function currentOpponentOffset(s: TycoonState): number {
  const lg = s.league;
  if (!lg || lg.carryover) return 0;
  return lg.clubs[yourOpponentIndex(lg)]?.offset ?? 0;
}

/** Three generated names to pick from, none already in this league. */
export function clubNameOptions(s: TycoonState): string[] {
  const taken = new Set((s.league?.clubs ?? []).map(c => c.name));
  const bank = leagueNameBank().filter(n => !taken.has(n));
  const rnd = mulberry32(hash32(s.rep | 0, s.league?.seed ?? 0, 91));
  const out: string[] = [];
  while (out.length < 3 && bank.length) out.push(bank.splice(Math.floor(rnd() * bank.length), 1)[0]);
  return out;
}

/** Take a generated name, or keep "Your club" (which is remembered, so the
 *  picker does not come back). Anything else is refused. */
export function setClubName(s: TycoonState, name: string): TycoonState {
  if (!s.league || (name !== YOUR_CLUB && !clubNameOptions(s).includes(name))) return s;
  return { ...s, clubName: name, league: { ...s.league, clubs: s.league.clubs.map((c, i) => (i === 0 ? { ...c, name } : c)) } };
}

function recordResult(c: LeagueClub, gf: number, ga: number): void {
  c.gf += gf;
  c.ga += ga;
  if (gf > ga) { c.w += 1; c.pts += 3; } else if (gf === ga) { c.d += 1; c.pts += 1; } else { c.l += 1; }
}

/**
 * The match count opponents are strengthened by. Until Round 582 it was the
 * career count, so every match was harder than the last forever, and under a
 * title-only league that turned into a wall: the review measured a club with a
 * squad of 3 never leaving the bottom league in 91 of 200 three hour runs, where
 * the old win count had promoted all 200, because a whole season has to be won
 * against rivals who kept getting stronger while it failed. A division's rivals
 * now play at the strength they had when its league was drawn, and every
 * division up is drawn later and is tougher, so the climb still steepens.
 */
export function leagueMatchNo(s: TycoonState): number {
  const base = s.league?.baseMatchNo;
  return Number.isFinite(base) ? Math.min(s.matchNo, base as number) : s.matchNo;
}

/** A rival's chance of scoring in one minute: today's baseline plus its offset. */
function rivalChancePerMin(st: TycoonState, c: LeagueClub): number {
  return Math.max(0.008, Math.min(0.14, 0.024 + leagueMatchNo(st) * 0.0011 + divisionOf(st).oppBoost + c.offset));
}

/**
 * Your full time, in the league: your result goes in the table, every other
 * fixture of the matchday plays out through the same per-minute model from a
 * stream seeded by (rivals, season, matchday), so a reload replays nothing, and
 * the last matchday ends the season. Returns the new league and pushes events.
 */
function playMatchday(st: TycoonState, gf: number, ga: number, events: TickEvent[]): TycoonLeague {
  const lg = st.league as TycoonLeague;
  const clubs = lg.clubs.map(c => ({ ...c }));
  const rnd = mulberry32(hash32(lg.seed, lg.season, lg.matchday, 7));
  for (const [h, a] of matchdayFixtures(lg)) {
    if (h === 0 || a === 0) {
      const opp = h === 0 ? a : h;
      recordResult(clubs[0], gf, ga);
      recordResult(clubs[opp], ga, gf);
      continue;
    }
    const ph = rivalChancePerMin(st, clubs[h]);
    const pa = rivalChancePerMin(st, clubs[a]);
    let hg = 0;
    let ag = 0;
    for (let m = 0; m < 90; m += 1) {
      if (rnd() < ph) hg += 1;
      if (rnd() < pa) ag += 1;
    }
    recordResult(clubs[h], hg, ag);
    recordResult(clubs[a], ag, hg);
  }
  const played: TycoonLeague = { ...lg, clubs, matchday: lg.matchday + 1 };
  if (played.matchday < leagueShape(lg.division).matchdays) return played;

  const position = leaguePosition(played);
  const d = DIVISIONS[played.division];
  if (position !== 1) {
    events.push({ kind: 'seasonEnd', label: `Season over: ${ordinal(position)} of ${clubs.length} in the ${d.name}`, position, table: clubs });
    return nextSeason(played);
  }
  st.leagueTitles = (st.leagueTitles ?? 0) + 1;
  if (played.division >= DIVISIONS.length - 1) {
    const pay = Math.round(attendance(st) * 8 * d.incomeMult * repMult(st));
    st.money += pay;
    st.lifetime += pay;
    events.push({ kind: 'title', amount: pay, label: `${d.emoji} CHAMPIONS OF ${d.name.toUpperCase()}`, position, table: clubs });
    return nextSeason(played);
  }
  events.push({ kind: 'title', label: `🏆 Champions of the ${d.name}`, position, table: clubs });
  const up = played.division + 1;
  const nd = DIVISIONS[up];
  const next = newLeague(st.rep, up, played.season + 1, clubs[0].name === YOUR_CLUB ? undefined : clubs[0].name, st.matchNo);
  const pay = Math.round(attendance(st) * 8 * nd.incomeMult * repMult(st));
  st.money += pay;
  st.lifetime += pay;
  st.bestDivision = Math.max(st.bestDivision ?? 0, up);
  events.push({ kind: 'promoted', amount: pay, label: `${nd.emoji} PROMOTED: ${nd.name}` });
  return next;
}

/** 1st, 2nd, 3rd, 11th. */
export function ordinal(n: number): string {
  const v = n % 100;
  const sfx = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${sfx}`;
}

/* Round 150: Matchday Hype. The crowd builds it over eight minutes of play,
 * one button spends it, and for sixty seconds income pays double, and the
 * taps that scale off it rise with it. Goal and win bonuses never read it.
 * The numbers sit where the harness measured them fair: a dedicated player
 * gets about one boost per upgrade wall, never a boost economy. */
export const BOOST_CHARGE_SEC = 8 * 60;
export const BOOST_DURATION_SEC = 60;
/** Round 583: what Hype multiplies income by. The screen reads this too. */
export const HYPE_MULT = 2;

export function boostReady(s: TycoonState): boolean {
  /* Round 196: Stadium Voltage shortens the charge a full hype needs. */
  return (s.boostChargeSec ?? 0) >= boostChargeSecOf(s) && (s.boostLeftSec ?? 0) <= 0;
}

export function boostActive(s: TycoonState): boolean {
  return (s.boostLeftSec ?? 0) > 0;
}

/** Spend a full charge. No-op unless genuinely ready, so no stacking. */
export function activateBoost(s: TycoonState): TycoonState {
  if (!boostReady(s)) return s;
  return {
    ...s,
    boostChargeSec: 0,
    boostLeftSec: BOOST_DURATION_SEC,
    // Round 162: counted for the achievement wall.
    boostsUsed: (s.boostsUsed ?? 0) + 1,
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
  // Round 150: an active Matchday Hype doubles this line. Taps ride it through
  // tapValue (the Megaphone's flat part is not doubled), and goal and win
  // bonuses never read it (Round 583 corrected the copy that said they did).
  const hype = boostActive(s) ? HYPE_MULT : 1;
  /* Round 162: the payroll earns alongside the crowd, the division you have
     climbed to pays its stage multiplier, every achievement is +2 percent
     forever, and a lit DERBY DAY golden whistle multiplies the lot by 7.
     Order matters not at all (it is one product), but the frenzy sits last
     in the line so the code reads the way the screen explains it. */
  const golden = goldenActive(s) && s.goldenKind === 'frenzy' ? FRENZY_MULT : 1;
  /* Round 196: Boardroom Sway rides the same product as everything else. */
  return (fans * perFan + parking + staffBaseIncome(s))
    * repMult(s) * streakMult(s) * divisionOf(s).incomeMult * achMult(s) * swayMult(s) * hype * golden;
}

/** One tap on the stadium. Megaphone makes taps matter deep into a run. */
export function tapValue(s: TycoonState): number {
  const mg = levelOf(s, 'megaphone');
  // Taps track income so clicking stays relevant deep into a run, but they
  // are seasoning, not the meal: the first tuning paid two full seconds of
  // income per tap and the harness measured a bored thumb TRIPLING the
  // economy, with first prestige landing at minute three. Now a tap pays
  // about 0.7s of income plus the megaphone's flat power.
  // Round 162: a CROWD SURGE golden whistle makes taps the whole show for
  // thirty seconds, on the tap only, never on the passive line.
  // Round 583: reputation counts twice in a tap on purpose, once inside
  // incomePerSec and once below. It has since Round 146, and taking one out
  // would shrink every tap a starred club makes, so it stays.
  const rush = goldenActive(s) && s.goldenKind === 'tapRush' ? TAP_RUSH_MULT : 1;
  return Math.max(1, Math.round((incomePerSec(s) * 0.7 + mg * 2) * repMult(s) * rush));
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
  /* Round 196: Deep Roots compounds the growth, never the pressure rule. */
  return base * winPull * pressure * rootsMult(s);
}

/** Chance our toy team scores in one match minute. */
export function goalChancePerMin(s: TycoonState): number {
  const sq = levelOf(s, 'squad');
  return Math.min(0.16, 0.028 + sq * 0.0016);
}

/** Chance the opponent scores in one minute; opponents scale forever. */
export function oppChancePerMin(s: TycoonState): number {
  const sq = levelOf(s, 'squad');
  // Round 162: the division you climbed into shoots back. Promotion is a
  // real thing, not a bigger number with the same Sunday opposition.
  // Round 582: plus the strength of the league rival you are playing today.
  const opp = 0.024 + leagueMatchNo(s) * 0.0011 + divisionOf(s).oppBoost + currentOpponentOffset(s);
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
  /* Round 582: 'title' when you win the league (with an amount only at The
     Summit, where the title pays and nobody goes up), 'seasonEnd' when you do not. */
  kind: 'goal' | 'conceded' | 'win' | 'loss' | 'draw' | 'milestone' | 'promoted' | 'ach' | 'title' | 'seasonEnd';
  amount?: number;
  /** For milestone, promotion and achievement events: the on-screen label. */
  label?: string;
  /** Round 582, on title and seasonEnd: your final place and the final table,
   *  in the order it was stored, so a harness can sort it for itself. */
  position?: number;
  /** Round 583, on goal and conceded: the match minute it went in, 1 to 90. */
  minute?: number;
  table?: LeagueClub[];
}

/**
 * Round 584: one minute of the match. This is the body tick() has run since
 * Round 424, lifted out unchanged so the minutes a club plays while you are away
 * are the same minutes on the same rolls. With `pay: false` (an away minute)
 * the goals, the result, the streak, the fans a win brings and the table all
 * happen, and no money moves: no goal bonus and no win bonus.
 */
export function playMinute(st: TycoonState, roll: () => number, events: TickEvent[], opts: { pay: boolean }): void {
  st.minute += 1;
  if (st.minute <= 90) {
    if (roll() < goalChancePerMin(st)) {
      st.goalsFor += 1;
      st.totalGoals += 1;
      if (opts.pay) {
        const b = goalBonus(st);
        st.money += b;
        st.lifetime += b;
        events.push({ kind: 'goal', amount: b, minute: st.minute });
      } else {
        events.push({ kind: 'goal', minute: st.minute });
      }
    }
    if (roll() < oppChancePerMin(st)) {
      st.goalsAgainst += 1;
      events.push({ kind: 'conceded', minute: st.minute });
    }
  }
  if (st.minute >= 90) {
    // Full time: settle, pay, reset.
    if (st.goalsFor > st.goalsAgainst) {
      const b = opts.pay ? winBonus(st) : 0;
      st.money += b;
      st.lifetime += b;
      st.streak += 1;
      st.totalWins += 1;
      st.groundWins = (st.groundWins ?? 0) + 1;
      st.fanbase += 6 + st.streak * 2;
      events.push(opts.pay ? { kind: 'win', amount: b } : { kind: 'win' });
    } else if (st.goalsFor < st.goalsAgainst) {
      /* Round 196: a Steady Dressing Room keeps half the run alive.
         Halved DOWN, so a streak of 1 still dies and the perk can never
         hold a streak forever on its own. */
      st.streak = perkLevelOf(st, 'shield') > 0 ? Math.floor(st.streak / 2) : 0;
      events.push({ kind: 'loss' });
    } else {
      // A draw keeps the streak alive but does not extend it.
      events.push({ kind: 'draw' });
    }
    /* Round 582: the result goes in the league, where the champion goes up
       (playMatchday). Until this round promotion came from the home win
       count. An older save's match in progress when it first loaded finishes
       outside the table, and matchday 1 is the next match. */
    if (st.league) {
      if (st.league.carryover) {
        const { carryover: _finished, ...rest } = st.league;
        st.league = rest;
      } else {
        st.league = playMatchday(st, st.goalsFor, st.goalsAgainst, events);
      }
    }
    st.matchNo += 1;
    st.totalMatches = (st.totalMatches ?? 0) + 1;
    st.minute = 0;
    st.goalsFor = 0;
    st.goalsAgainst = 0;
  }
}

/** Round 584: a matchday plays for every half hour you are away. */
export const AWAY_MATCHDAY_SEC = 1800;

/** Round 584: a result as the away card prints it, and whether it was the
 *  leftover friendly an older save finishes outside the table. */
export type AwayResult = 'W' | 'D' | 'L';
export interface AwayMatch { result: AwayResult; friendly: boolean }

/** How many of `count` away matchdays this club may play: the match in progress
 *  finishes first (a friendly left over from an older save counts, and plays
 *  outside the table), and the final matchday of a season is never played away,
 *  so a title, a promotion and a Summit prize always happen with you watching. */
export function awayMatchdaysPlayable(s: TycoonState, count: number): number {
  const n = Math.max(0, Math.floor(count));
  const lg = s.league;
  if (!lg) return n;
  const beforeFinal = Math.max(0, leagueShape(lg.division).matchdays - 1 - lg.matchday);
  return Math.min(n, (lg.carryover ? 1 : 0) + beforeFinal);
}

/** Round 584: play the club's away matchdays, minute by minute through
 *  playMinute on the roll stream given, with no goal or win bonuses. Each
 *  matchday ends at its own full time, never at a change in a counter (a
 *  doctored totalMatches of 2^53 does not change when one is added, and the
 *  review found away play then spilling into the final matchday). After each
 *  one the milestones and badges it reached settle as they would have live. */
export function playAwayMatchdays(s: TycoonState, count: number, roll: () => number): { state: TycoonState; results: AwayMatch[]; events: TickEvent[] } {
  const st: TycoonState = { ...s, levels: { ...s.levels } };
  const events: TickEvent[] = [];
  const results: AwayMatch[] = [];
  const n = awayMatchdaysPlayable(s, count);
  for (let i = 0; i < n; i += 1) {
    const friendly = Boolean(st.league?.carryover);
    let result: TickEvent['kind'] | null = null;
    for (let guard = 0; guard <= 90 && result === null; guard += 1) {
      const k = events.length;
      playMinute(st, roll, events, { pay: false });
      for (let j = k; j < events.length; j += 1) {
        if (events[j].kind === 'win' || events[j].kind === 'draw' || events[j].kind === 'loss') result = events[j].kind;
      }
    }
    settleFirsts(st, events);
    results.push({ result: result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D', friendly });
  }
  return { state: st, results, events };
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

  // Round 150: hype charges while you play and burns while it is lit. Both
  // clocks only move here, so background tabs and offline stretches never
  // charge or waste a boost (dt is already clamped by the caller and the
  // fast-forward guard below).
  if ((st.boostLeftSec ?? 0) > 0) {
    st.boostLeftSec = Math.max(0, (st.boostLeftSec ?? 0) - dt);
  } else {
    // Round 196: the cap follows the Voltage perk, so the bar reads full
    // exactly when the button lights.
    st.boostChargeSec = Math.min(boostChargeSecOf(st), (st.boostChargeSec ?? 0) + dt);
  }
  // Round 162: the golden whistle's clock burns the same way: play-time only.
  if ((st.goldenLeftSec ?? 0) > 0) {
    st.goldenLeftSec = Math.max(0, (st.goldenLeftSec ?? 0) - dt);
    if (st.goldenLeftSec <= 0) st.goldenKind = null;
  }

  /* The match advances minute by minute.
     ROUND 424: THE CLOCK NEVER MOVED. This read
       minutes = Math.floor((st.minute * MIN_LEN + dt) / MIN_LEN) - st.minute;
     and st.minute is an integer, so that whole expression is just
     Math.floor(dt / MIN_LEN), with the remainder recomputed from st.minute on
     every call and therefore THROWN AWAY. The hook ticks as soon as its
     accumulator passes 0.2s (useStadiumTycoon.ts:94), so dt is about a fifth of
     a second, Math.floor(0.2 / 1.4) is 0, and the answer was 0 forever.
     Measured on a real save over 180 minutes of continuous play: minute 0,
     match 0, goals 0, wins 0, streak 0. Not one goal had ever been scored by
     anybody, on any save, since the tick rate last changed. The scoreboard read
     "YOU 0 - 0 0'" for the life of the game and the footer read "match #1".
     The seconds are banked now instead, so a fifth of a second is a fifth of a
     minute's progress rather than nothing at all. */
  const MIN_LEN = 1.4;
  st.matchSec = (st.matchSec ?? 0) + dt;
  let minutes = Math.floor(st.matchSec / MIN_LEN);
  st.matchSec -= minutes * MIN_LEN;
  // A huge dt (returning from background) fast-forwards at most one match.
  if (minutes > 120) { minutes = 120; st.matchSec = 0; }
  minutes = Math.max(0, minutes);
  for (let i = 0; i < minutes; i++) playMinute(st, roll, events, { pay: true });
  settleFirsts(st, events);
  return { state: st, events };
}

/** Round 584: the milestones and badges a state has reached, settled exactly as
 *  tick() always settled them at the end of every tick, lifted so away play can
 *  settle them after each away matchday. Without that, a five win run played
 *  away and lost before you came back was never rewarded. */
export function settleFirsts(st: TycoonState, events: TickEvent[]): void {
  // Round 152: milestones settle last, so a goal or win inside this very
  // tick can be the thing that crosses the line. Exactly once per ground.
  const claimed = st.claimed ?? [];
  let newlyClaimed: string[] | null = null;
  for (const m of MILESTONES) {
    if (claimed.includes(m.id) || (newlyClaimed && newlyClaimed.includes(m.id))) continue;
    if (!m.hit(st)) continue;
    const pay = Math.round(m.pay * repMult(st));
    st.money += pay;
    st.lifetime += pay;
    if (!newlyClaimed) newlyClaimed = [...claimed];
    newlyClaimed.push(m.id);
    events.push({ kind: 'milestone', amount: pay, label: m.label });
  }
  if (newlyClaimed) st.claimed = newlyClaimed;

  /* Round 162: achievements settle after everything else, exactly once per
     career, each one a permanent +2 percent. No cash changes hands: the
     multiplier IS the payout, forever. */
  const achHave = st.ach ?? [];
  let newAch: string[] | null = null;
  for (const a of ACHIEVEMENTS) {
    if (achHave.includes(a.id) || (newAch && newAch.includes(a.id))) continue;
    if (!a.hit(st)) continue;
    if (!newAch) newAch = [...achHave];
    newAch.push(a.id);
    events.push({ kind: 'ach', label: `${a.emoji} ${a.label}` });
  }
  if (newAch) st.ach = newAch;
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
    // Round 152: firsts stay first. See the MILESTONES comment for why.
    claimed: [...(s.claimed ?? [])],
    /* Round 162: what survives selling up, and what does not. Achievements
       and the career counters they read are FOREVER, that is their point.
       The division ladder and the payroll are THIS CLUB's: the new ground
       starts at the bottom of the Muddy Meadows League with an empty staff
       room, and the climb back up is the game. */
    ach: [...(s.ach ?? [])],
    bestDivision: s.bestDivision ?? 0,
    goldenCaught: s.goldenCaught ?? 0,
    boostsUsed: s.boostsUsed ?? 0,
    totalMatches: s.totalMatches ?? 0,
    /* Round 196: the sale pays its legacy, read off the ground BEFORE the
       reset, and the boardroom is forever like the badges. The Rolling
       Investment perk seeds the new till. */
    legacyPoints: legacyPointsOf(s) + pointsForSale(s),
    legacyPerks: { ...(s.legacyPerks ?? {}) },
    legacySeeded: true,
    money: startingMoneyOf(s),
    /* Round 582: the new ground starts at the bottom of a new league, so
       Round 196's "climb before you sell" still pays. Titles and the name are
       the career's. */
    league: newLeague(s.rep + 1, 0, 0, s.clubName === YOUR_CLUB ? undefined : s.clubName, 0),
    leagueTitles: s.leagueTitles ?? 0,
    ...(s.clubName ? { clubName: s.clubName } : {}),
  };
}

/* ---------------- offline earnings ---------------- */

/** Round 584: the seconds of a trip away that count, under the away cap. A tab
 *  refresh (under thirty seconds) is not a trip away. The away pay and the away
 *  matchdays both read this, so they can never disagree about how long you were
 *  gone. */
export function awaySecondsOf(s: TycoonState, now: number): number {
  const elapsed = Math.max(0, (now - s.savedAt) / 1000);
  const capped = Math.min(elapsed, offlineCapHoursOf(s) * 3600);
  return capped < 30 ? 0 : capped;
}

/** Away pay: half rate, capped at eight hours, both raised by the Away
 *  Day Deal legacy perk (65%/10h, then 80%/12h). Returns whole pounds.
 *  Round 150: computed at the UNboosted rate on purpose. Saving mid-hype
 *  and leaving must not turn sixty seconds of double pay into eight hours
 *  of it. */
export function offlineEarnings(s: TycoonState, now: number): number {
  const capped = awaySecondsOf(s, now);
  if (capped === 0) return 0;
  // Round 162: same rule for the golden whistle as for hype: saving mid
  // frenzy must not turn 77 seconds of x7 into eight hours of it.
  return Math.round(incomePerSec({ ...s, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null }) * capped * offlineRateOf(s));
}

/* ---------------- save plumbing ---------------- */

export function serializeTycoon(s: TycoonState, now: number): string {
  return JSON.stringify({ ...s, savedAt: now });
}

/** Seconds of play per match minute. tick() spells the same 1.4 as MIN_LEN;
 *  the loader needs it to know what a banked remainder can legally hold. */
const MATCH_MINUTE_SEC = 1.4;

/** Round 582: a stored league, kept only if every part of it is a league this
 *  engine could have produced. Null means rebuild it. */
function cleanLeague(raw: unknown, clubName: string | undefined, bestDivision: number, matchNo: number): TycoonLeague | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<TycoonLeague>;
  const division = r.division;
  if (!Number.isInteger(division) || (division as number) < 0 || (division as number) > DIVISIONS.length - 1) return null;
  /* Round 582 review: a doctored save claimed The Summit on a career whose best
     was the bottom league, and loaded there. */
  if ((division as number) > bestDivision) return null;
  const shape = leagueShape(division as number);
  if (!Number.isInteger(r.matchday) || (r.matchday as number) < 0 || (r.matchday as number) >= shape.matchdays) return null;
  if (!Number.isInteger(r.season) || (r.season as number) < 0) return null;
  if (!Number.isFinite(r.seed)) return null;
  if (!Array.isArray(r.clubs) || r.clubs.length !== shape.clubs) return null;
  const bank = new Set(leagueNameBank());
  const names = new Set<string>();
  const clubs: LeagueClub[] = [];
  for (let i = 0; i < r.clubs.length; i += 1) {
    const c = r.clubs[i] as Partial<LeagueClub>;
    if (!c || typeof c.name !== 'string' || names.has(c.name)) return null;
    if (i === 0 ? c.name !== (clubName ?? YOUR_CLUB) : !bank.has(c.name)) return null;
    const offset = i === 0 ? 0 : c.offset;
    if (!Number.isFinite(offset) || Math.abs(offset as number) > OFFSET_SPREAD + 1e-9) return null;
    const whole = [c.w, c.d, c.l, c.gf, c.ga];
    if (!whole.every(v => Number.isInteger(v) && (v as number) >= 0)) return null;
    /* Points are derived, never trusted: three a win, one a draw. */
    if ((c.w as number) + (c.d as number) + (c.l as number) !== r.matchday) return null;
    names.add(c.name);
    clubs.push({ name: c.name, offset: offset as number, w: c.w as number, d: c.d as number, l: c.l as number, gf: c.gf as number, ga: c.ga as number, pts: 3 * (c.w as number) + (c.d as number) });
  }
  /* Every decisive result is one win and one loss, and every goal is someone's
     goal against: a table where everyone else lost every match is not a table. */
  const sum = (k: 'w' | 'l' | 'gf' | 'ga') => clubs.reduce((acc, c) => acc + c[k], 0);
  if (sum('w') !== sum('l') || sum('gf') !== sum('ga')) return null;
  const base = Number.isInteger(r.baseMatchNo) && (r.baseMatchNo as number) >= 0 && (r.baseMatchNo as number) <= matchNo ? (r.baseMatchNo as number) : matchNo;
  const out: TycoonLeague = { division: division as number, season: r.season as number, matchday: r.matchday as number, seed: (r.seed as number) >>> 0, baseMatchNo: base, clubs };
  if (typeof r.carryover === 'string' && allOpponentNames().includes(r.carryover)) out.carryover = r.carryover;
  return out;
}

/** A whole number inside [lo, hi], or lo for anything that is not a number. */
function wholeIn(v: unknown, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v as number))) : lo;
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
    /* Round 581: the upgrade levels come back as the tracks define them. Before
       this the stored object was merged in raw, so a save carrying
       levels.squad = "abc" loaded as a string: levelOf read NaN, every goal
       chance compared against NaN and no goal was ever scored again, and an
       unknown id rode along into every later save. Only known tracks, whole
       levels, inside each track's cap. */
    const cleanLevels: Record<string, number> = {};
    for (const t of TRACKS) {
      const lvl = s.levels[t.id];
      cleanLevels[t.id] = Number.isFinite(lvl) && lvl > 0 ? Math.min(Math.floor(lvl), t.maxLevel) : 0;
    }
    s.levels = cleanLevels;
    /* Round 581: the match and the counters. A whole minute from 0 to 89, the
       banked seconds inside one match minute, goals a match can hold, and
       counters that are whole and never negative. matchSec stays absent on a
       save that never had it, so an older save loads byte for byte.
       89, not 90: tick() settles full time in the same tick that reaches
       minute 90, so no honest save holds 90, and a loaded 90 would be settled a
       minute late and lose that minute off the match clock. */
    s.minute = wholeIn(s.minute, 0, 89);
    s.goalsFor = wholeIn(s.goalsFor, 0, 90);
    s.goalsAgainst = wholeIn(s.goalsAgainst, 0, 90);
    if (s.matchSec !== undefined && !(Number.isFinite(s.matchSec) && (s.matchSec as number) >= 0 && (s.matchSec as number) < MATCH_MINUTE_SEC)) s.matchSec = 0;
    for (const k of ['streak', 'matchNo', 'totalGoals', 'totalWins', 'totalTaps'] as const) {
      s[k] = wholeIn(s[k], 0, Number.MAX_SAFE_INTEGER);
    }
    /* A save stamped in the future, or not stamped with a number at all, would
       make the away settle pay NaN or refuse to pay for real time away. */
    if (!Number.isFinite(s.savedAt) || s.savedAt > now) s.savedAt = now;
    if (!Number.isFinite(s.rep) || s.rep < 0 || s.rep > 50) s.rep = 0;
    // Round 150: hype clocks come back sane whatever the save says.
    if (!Number.isFinite(s.boostChargeSec) || s.boostChargeSec < 0) s.boostChargeSec = 0;
    s.boostChargeSec = Math.min(s.boostChargeSec, BOOST_CHARGE_SEC);
    if (!Number.isFinite(s.boostLeftSec) || s.boostLeftSec < 0) s.boostLeftSec = 0;
    s.boostLeftSec = Math.min(s.boostLeftSec, BOOST_DURATION_SEC);
    // Round 152: only real milestone ids survive a load.
    if (!Array.isArray(s.claimed)) s.claimed = [];
    s.claimed = s.claimed.filter(id => MILESTONES.some(m => m.id === id));
    /* Round 162: the new books come back sane whatever the save says. Only
       real achievement ids, only real staff ids at finite levels, clocks
       clamped, counters non-negative. A doctored save gets a working game,
       never a printing press. */
    if (!Array.isArray(s.ach)) s.ach = [];
    s.ach = s.ach.filter(id => ACHIEVEMENTS.some(a => a.id === id));
    const cleanStaff: Record<string, number> = {};
    for (const t of STAFF) {
      const lvl = (s.staffLevels ?? {})[t.id];
      cleanStaff[t.id] = Number.isFinite(lvl) && (lvl as number) > 0 ? Math.min(Math.floor(lvl as number), t.maxLevel) : 0;
    }
    s.staffLevels = cleanStaff;
    for (const k of ['groundWins', 'bestDivision', 'goldenCaught', 'boostsUsed', 'totalMatches'] as const) {
      if (!Number.isFinite(s[k]) || (s[k] as number) < 0) s[k] = 0;
    }
    s.bestDivision = Math.min(s.bestDivision ?? 0, DIVISIONS.length - 1);
    if (!Number.isFinite(s.goldenLeftSec) || (s.goldenLeftSec ?? 0) < 0) s.goldenLeftSec = 0;
    /* Round 196: the honest ceiling is a frenzy at full Gold Polish. */
    s.goldenLeftSec = Math.min(s.goldenLeftSec ?? 0, Math.ceil(GOLDEN_INFO.frenzy.duration * 1.5));
    if (s.goldenKind !== 'frenzy' && s.goldenKind !== 'tapRush') {
      s.goldenKind = null;
      s.goldenLeftSec = 0;
    }
    /* Round 196: the boardroom comes back sane whatever the save says.
       Only real perk ids at integer levels within each cap, points finite
       and bounded. A doctored save gets a working game, never a printing
       press: every perk is capped, so a fat point balance buys at most
       the same 100-point board everyone else can finish. */
    const cleanPerks: Record<string, number> = {};
    for (const perk of LEGACY_PERKS) {
      const lvl = (s.legacyPerks ?? {})[perk.id];
      cleanPerks[perk.id] = Number.isFinite(lvl) && (lvl as number) > 0 ? Math.min(Math.floor(lvl as number), perk.costs.length) : 0;
    }
    s.legacyPerks = cleanPerks;
    if (!Number.isFinite(s.legacyPoints) || (s.legacyPoints ?? 0) < 0) s.legacyPoints = 0;
    s.legacyPoints = Math.min(Math.floor(s.legacyPoints ?? 0), 5000);
    /* Round 196: saves from before the boardroom get one point per star
       already on the shelf, exactly once. One is the minimum ANY sale can
       pay, so the grant never invents a climb that might not have happened.
       The check reads the RAW save (p), because the base template already
       carries legacySeeded: true and the spread would mask an old save. */
    if ((p as { legacySeeded?: unknown }).legacySeeded !== true) {
      s.legacyPoints = Math.min((s.legacyPoints ?? 0) + s.rep, 5000);
      s.legacySeeded = true;
    }
    /* Round 582: the league. The name first, because the league's first row
       carries it: only a name the generator can produce survives, never text. */
    if (s.clubName !== undefined && !(typeof s.clubName === 'string' && (s.clubName === YOUR_CLUB || leagueNameBank().includes(s.clubName)))) delete s.clubName;
    const youName = s.clubName === YOUR_CLUB ? undefined : s.clubName;
    s.leagueTitles = wholeIn(s.leagueTitles, 0, Number.MAX_SAFE_INTEGER);
    /* Latches read the RAW save, the legacySeeded lesson again: the base
       template carries a fresh bottom league, and the spread would put every
       older save back in the Muddy Meadows. A save written before the league
       gets one seeded at the division its home win count had reached, so nobody
       drops a division, and the match it was in the middle of finishes against
       the opponent it was already playing, outside the table. */
    const rawLeague = (p as { league?: unknown }).league;
    if (rawLeague === undefined) {
      const division = legacyDivisionIndex(s.groundWins ?? 0);
      const seeded = newLeague(s.rep, division, 0, youName, s.matchNo);
      if (s.minute > 0 || s.goalsFor > 0 || s.goalsAgainst > 0) seeded.carryover = legacyOpponentName(s);
      s.league = seeded;
      /* An honest older save already holds a best division at least this high;
         raising it here keeps the cap below from ever dropping the club later. */
      s.bestDivision = Math.max(s.bestDivision ?? 0, division);
    } else {
      /* A league that does not hold together is rebuilt, never trusted, never
         above the best division this career has reached, and never below the
         division it claimed. The first draft rebuilt it from the old win count,
         which the review showed trailing the league by up to four divisions (a
         division 8 club holds about 87 home wins, which the old ladder calls
         division 6): one bad field, or any later change to the league's shape or
         name bank, would have dropped the club. */
      const best = s.bestDivision ?? 0;
      const claimed = (rawLeague as { division?: unknown }).division;
      s.league = cleanLeague(rawLeague, youName, best, s.matchNo) ??
        newLeague(s.rep, Number.isInteger(claimed) ? Math.min(Math.max(0, claimed as number), best) : Math.min(legacyDivisionIndex(s.groundWins ?? 0), best), 0, youName, s.matchNo);
    }
    return s;
  } catch {
    return null;
  }
}

/** Compact money formatting for the header and the tiles.
 *  Round 162: the numbers go further now, so the ladder does too. */
export function fmtMoney(n: number): string {
  if (n >= 1e15) return `$${(n / 1e15).toFixed(2)}Q`;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

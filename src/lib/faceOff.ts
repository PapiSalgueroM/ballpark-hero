/**
 * Round 289: Face Off, a ten round duel against a rival on a shot clock.
 *
 * The owner asked for "a face off type of game". This is the head to head
 * version of the site's oldest format: two athletes, one stat, who has more.
 * The difference is the other chair. A rival answers every question too, at
 * its own speed and with its own hit rate, and the scoreboard is the point.
 * Right answers score, fast right answers score more, and after ten rounds
 * somebody has won.
 *
 * NOTHING HERE IS NEW DATA. Every pair is drawn from the pools the Higher or
 * Lower games already ship (soccer, NBA, MLB, NFL, NHL, college football,
 * F1, tennis, golf, AFL), so a number on a Face Off card is a number that is
 * already on the site with the same provenance. This file adds no athlete
 * and no stat of its own.
 *
 * Every rule lives here and nothing here touches the DOM or the clock, so
 * scripts/simFaceOff.mjs can play thousands of duels in node and measure
 * that the rival is the difficulty it says it is.
 */
import { higherLowerPlayers } from '@/data/higherLowerPlayers';
import { nbaHLPlayers } from '@/data/nbaHLPlayers';
import { mlbHLPlayers } from '@/data/mlbHLPlayers';
import { NFL_HL_CATEGORIES } from '@/data/nflHLCategories';
import { hockeyHLPlayers } from '@/data/hockeyHLPlayers';
import { cfbHLPlayers } from '@/data/cfbHLPlayers';
import { f1HLDrivers } from '@/data/f1HLDrivers';
import { tennisHLPlayers } from '@/data/tennisHLPlayers';
import { golfLegends } from '@/data/golfLegends';
import { aflGoalKickers } from '@/data/aflGoalKickers';
import { dailyPrngSeed } from '@/lib/dateUtils';

export const SAVE_KEY = 'dukb-face-off-v1';
export const ROUNDS = 10;
/** seconds on the shot clock, every round */
export const SHOT_CLOCK = 10;
/** a right answer is worth this much, plus PER_SECOND for every whole second left */
export const BASE_POINTS = 100;
export const PER_SECOND = 10;
/** sudden death rounds after a tie, at most */
export const MAX_EXTRA = 3;
/** a pair is only asked when the bigger number is at least this many times the smaller,
 *  and at most MAX_RATIO times, so there are no ties and no gimmes */
export const MIN_RATIO = 1.04;
export const MAX_RATIO = 4;

export type Difficulty = 'rookie' | 'pro' | 'legend';

export interface RivalDef {
  key: Difficulty;
  label: string;
  emoji: string;
  blurb: string;
  /** hit rate on the easiest pair (a wide gap) and the hardest (a close one) */
  hitWide: number;
  hitClose: number;
  /** answer time in seconds, uniform between these */
  fastest: number;
  slowest: number;
}

export const RIVALS: RivalDef[] = [
  { key: 'rookie', label: 'The Rookie', emoji: '🧢', blurb: 'Knows the big names, guesses the rest, and takes a while about it.', hitWide: 0.85, hitClose: 0.45, fastest: 3, slowest: 8 },
  { key: 'pro', label: 'The Pro', emoji: '🎙️', blurb: 'Reads the box scores. Quick on the obvious ones, human on the close ones.', hitWide: 0.95, hitClose: 0.6, fastest: 2, slowest: 6 },
  { key: 'legend', label: 'The Legend', emoji: '🐐', blurb: 'Has the numbers by heart. You will need to be right and fast.', hitWide: 0.99, hitClose: 0.75, fastest: 1.5, slowest: 4.5 },
];

/** the daily duel is always against this one, so scores compare */
export const DAILY_DIFFICULTY: Difficulty = 'pro';

export interface Athlete {
  name: string;
  /** the second line on the card: nationality, teams, years */
  sub: string;
  value: number;
}

export interface Category {
  key: string;
  sport: string;
  emoji: string;
  question: string;
  unit: string;
  pool: Athlete[];
}

/* Built inside a function, never at module scope: the data files are large
   and an import cycle evaluated at load time is how a page once crashed. */
export function buildCategories(): Category[] {
  const cats: Category[] = [];
  const soccer = (key: string, question: string, unit: string, pick: (p: (typeof higherLowerPlayers)[number]) => number) =>
    cats.push({ key, sport: 'soccer', emoji: '⚽', question, unit, pool: higherLowerPlayers.map(p => ({ name: p.name, sub: p.nationality, value: pick(p) })) });
  soccer('soccer-goals', 'Who scored more career goals?', 'goals', p => p.stats.goals);
  soccer('soccer-apps', 'Who made more career appearances?', 'apps', p => p.stats.appearances);
  soccer('soccer-caps', 'Who won more international caps?', 'caps', p => p.stats.internationalCaps);
  cats.push({ key: 'nba-points', sport: 'basketball', emoji: '🏀', question: 'Who scored more career NBA points?', unit: 'pts', pool: nbaHLPlayers.map(p => ({ name: p.name, sub: `${p.position}, ${p.teams}`, value: p.careerPoints })) });
  cats.push({ key: 'mlb-hr', sport: 'baseball', emoji: '⚾', question: 'Who hit more career home runs?', unit: 'HR', pool: mlbHLPlayers.map(p => ({ name: p.name, sub: `${p.firstSeason} to ${p.lastSeason}`, value: p.careerHrs })) });
  for (const c of NFL_HL_CATEGORIES) {
    cats.push({ key: `nfl-${c.key}`, sport: 'football', emoji: '🏈', question: c.question, unit: c.unit, pool: c.players.map(p => ({ name: p.name, sub: `${p.position}, ${p.teams}`, value: p.value })) });
  }
  cats.push({ key: 'nhl-points', sport: 'hockey', emoji: '🏒', question: 'Who has more career NHL points?', unit: 'pts', pool: hockeyHLPlayers.map(p => ({ name: p.name, sub: `${p.position}, ${p.country}`, value: p.careerPoints })) });
  cats.push({ key: 'cfb-passyds', sport: 'college', emoji: '🏈', question: 'Who threw for more college passing yards?', unit: 'yds', pool: cfbHLPlayers.map(p => ({ name: p.name, sub: p.schools, value: p.careerPassYds })) });
  cats.push({ key: 'f1-wins', sport: 'f1', emoji: '🏎️', question: 'Who has more Formula 1 race wins?', unit: 'wins', pool: f1HLDrivers.map(p => ({ name: p.name, sub: p.constructors, value: p.careerWins })) });
  cats.push({ key: 'tennis-slams', sport: 'tennis', emoji: '🎾', question: 'Who won more Grand Slam singles titles?', unit: 'slams', pool: tennisHLPlayers.map(p => ({ name: p.name, sub: p.tour === 'W' ? "women's singles" : "men's singles", value: p.slams })) });
  cats.push({ key: 'golf-majors', sport: 'golf', emoji: '⛳', question: 'Who won more golf majors?', unit: 'majors', pool: golfLegends.map(p => ({ name: p.name, sub: p.nationality, value: p.majors })) });
  cats.push({ key: 'afl-goals', sport: 'afl', emoji: '🏉', question: 'Who kicked more VFL/AFL goals?', unit: 'goals', pool: aflGoalKickers.map(p => ({ name: p.name, sub: p.clubs, value: p.goals })) });
  return cats;
}

/* ── a small deterministic generator ───────────────────────────────────── */
export type Rng = () => number;

/** mulberry32, not the Lehmer step the older games use. dateUtils.ts explains
 *  the trap: a Lehmer stream's first output is nearly a straight line in its
 *  seed, so seeds 1000 to 1500 all open with the same first pick. Measured
 *  here before switching: five hundred consecutive seeds put their first
 *  draw in the same one of ten bins, every time. mulberry32 mixes the seed
 *  through two multiplies before the first output and has no such line. */
export function makeRng(seed: number): Rng {
  let a = (Math.floor(seed) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedForDate(dateStr: string): number {
  return dailyPrngSeed(`face-off:${dateStr}`);
}

const pickIndex = (rng: Rng, n: number) => Math.min(n - 1, Math.floor(rng() * n));

/** Two athletes whose numbers are apart but not miles apart. Tries a bounded
 *  number of draws and then widens, so a small pool can never spin forever;
 *  a pool with no legal pair at all returns null and the caller skips it. */
export function pickPair(cat: Category, rng: Rng, avoid: Set<string> = new Set()): [Athlete, Athlete] | null {
  const pool = cat.pool.filter(a => Number.isFinite(a.value) && a.value > 0 && a.name);
  if (pool.length < 2) return null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const i = pickIndex(rng, pool.length);
    let j = pickIndex(rng, pool.length - 1);
    if (j >= i) j += 1;
    const a = pool[i], b = pool[j];
    if (a.name === b.name) continue;
    if (avoid.has(a.name) || avoid.has(b.name)) continue;
    const hi = Math.max(a.value, b.value), lo = Math.min(a.value, b.value);
    if (lo <= 0 || hi / lo < MIN_RATIO || hi / lo > MAX_RATIO) continue;
    return [a, b];
  }
  return null;
}

export interface Round {
  category: string;
  sport: string;
  emoji: string;
  question: string;
  unit: string;
  a: Athlete;
  b: Athlete;
  /** which card has the bigger number */
  higher: 'a' | 'b';
  /** the rival's answer, decided when the round is dealt */
  rival: { correct: boolean; seconds: number };
}

/** how alike the two numbers are: 0 is a gimme, 1 is a coin flip */
export function closeness(a: number, b: number): number {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi <= 0) return 1;
  return lo / hi;
}

/** the rival's chance on this pair: between its wide and close hit rates,
 *  linear in how close the numbers are */
export function rivalHitRate(r: RivalDef, a: number, b: number): number {
  const c = closeness(a, b);
  /* a ratio of MAX_RATIO is the widest pair asked; map that to 0 and a ratio of 1 to 1 */
  const t = Math.min(1, Math.max(0, (c - 1 / MAX_RATIO) / (1 - 1 / MAX_RATIO)));
  return r.hitWide + (r.hitClose - r.hitWide) * t;
}

export function rivalFor(d: Difficulty): RivalDef {
  return RIVALS.find(r => r.key === d) ?? RIVALS[1];
}

/** Deal a match: `count` rounds, one sport never twice in a row, no athlete
 *  twice in a match. The rival's answers are dealt with the rounds so a daily
 *  duel is the same duel for everybody, rival included. */
export function dealRounds(cats: Category[], rng: Rng, difficulty: Difficulty, count: number = ROUNDS): Round[] {
  const rival = rivalFor(difficulty);
  const rounds: Round[] = [];
  const used = new Set<string>();
  const sports = [...new Set(cats.map(c => c.sport))];
  let lastSport = '';
  let guard = 0;
  while (rounds.length < count && guard++ < count * 40) {
    /* pick a sport first so soccer's three categories do not crowd the deck */
    const sport = sports[pickIndex(rng, sports.length)];
    if (sport === lastSport && sports.length > 1) continue;
    const ofSport = cats.filter(c => c.sport === sport);
    const cat = ofSport[pickIndex(rng, ofSport.length)];
    const pair = pickPair(cat, rng, used);
    if (!pair) continue;
    const [a, b] = pair;
    const hit = rivalHitRate(rival, a.value, b.value);
    const correct = rng() < hit;
    const seconds = Math.round((rival.fastest + rng() * (rival.slowest - rival.fastest)) * 10) / 10;
    rounds.push({ category: cat.key, sport, emoji: cat.emoji, question: cat.question, unit: cat.unit, a, b, higher: a.value > b.value ? 'a' : 'b', rival: { correct, seconds } });
    used.add(a.name); used.add(b.name);
    lastSport = sport;
  }
  return rounds;
}

/** points for an answer: nothing for wrong or late, BASE plus PER_SECOND per whole second left for right */
export function pointsFor(correct: boolean, secondsUsed: number): number {
  if (!correct) return 0;
  const left = Math.max(0, SHOT_CLOCK - secondsUsed);
  return BASE_POINTS + PER_SECOND * Math.floor(left);
}

export interface RoundResult {
  pick: 'a' | 'b' | null;
  youCorrect: boolean;
  you: number;
  /** null only in a two player duel, when the second player ran out of time */
  rivalPick: 'a' | 'b' | null;
  rivalCorrect: boolean;
  rival: number;
  secondsUsed: number;
  /** the second chair's time, for the reveal line; the rival's dealt time or the second player's clock */
  rivalSeconds: number;
}

/** what a round paid, once you have picked (or the clock ran out: pick null) */
export function resolveRound(r: Round, pick: 'a' | 'b' | null, secondsUsed: number): RoundResult {
  const youCorrect = pick !== null && pick === r.higher;
  const rivalPick: 'a' | 'b' = r.rival.correct ? r.higher : r.higher === 'a' ? 'b' : 'a';
  return {
    pick,
    youCorrect,
    you: pointsFor(youCorrect, Math.max(0, secondsUsed)),
    rivalPick,
    rivalCorrect: r.rival.correct,
    rival: pointsFor(r.rival.correct, r.rival.seconds),
    secondsUsed,
    rivalSeconds: r.rival.seconds,
  };
}

/** Two people, one phone: the same shape, with the second chair's answer
 *  coming from a person and not from the deal. Both clocks are the player's
 *  own; the dealt rival is ignored. */
export function resolveVersus(r: Round, pick1: 'a' | 'b' | null, secs1: number, pick2: 'a' | 'b' | null, secs2: number): RoundResult {
  const c1 = pick1 !== null && pick1 === r.higher;
  const c2 = pick2 !== null && pick2 === r.higher;
  return {
    pick: pick1,
    youCorrect: c1,
    you: pointsFor(c1, Math.max(0, secs1)),
    rivalPick: pick2,
    rivalCorrect: c2,
    rival: pointsFor(c2, Math.max(0, secs2)),
    secondsUsed: secs1,
    rivalSeconds: secs2,
  };
}

export interface Totals { you: number; rival: number; youRounds: number; rivalRounds: number }

export function totals(results: RoundResult[]): Totals {
  const t: Totals = { you: 0, rival: 0, youRounds: 0, rivalRounds: 0 };
  for (const r of results) {
    t.you += r.you; t.rival += r.rival;
    if (r.you > r.rival) t.youRounds += 1;
    else if (r.rival > r.you) t.rivalRounds += 1;
  }
  return t;
}

export type Outcome = 'win' | 'loss' | 'draw';

export function outcome(t: Totals): Outcome {
  return t.you > t.rival ? 'win' : t.rival > t.you ? 'loss' : 'draw';
}

/** after the regulation rounds, tied on points means one more round, up to MAX_EXTRA */
export function needsExtra(results: RoundResult[], dealt: number): boolean {
  if (results.length < ROUNDS) return false;
  if (results.length < dealt) return false;
  if (results.length >= ROUNDS + MAX_EXTRA) return false;
  const t = totals(results);
  return t.you === t.rival;
}

/* ── the save: a record, not a game in progress ─────────────────────────── */
export interface FaceOffSave {
  v: 1;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  /** best score in one match, any mode */
  best: number;
  /** consecutive wins, any mode */
  streak: number;
  bestStreak: number;
  /** the daily duel already played today, so it cannot be replayed for a better score */
  daily: { date: string; you: number; rival: number; outcome: Outcome } | null;
  byRival: Record<Difficulty, { played: number; won: number }>;
}

export function newSave(): FaceOffSave {
  return { v: 1, played: 0, won: 0, lost: 0, drawn: 0, best: 0, streak: 0, bestStreak: 0, daily: null, byRival: { rookie: { played: 0, won: 0 }, pro: { played: 0, won: 0 }, legend: { played: 0, won: 0 } } };
}

const nonneg = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);

/** a save that does not parse is a fresh record; every field is coerced */
export function loadSave(raw: string | null): FaceOffSave {
  const fresh = newSave();
  if (!raw) return fresh;
  try {
    const p = JSON.parse(raw) as Partial<FaceOffSave>;
    if (!p || typeof p !== 'object') return fresh;
    const out: FaceOffSave = {
      ...fresh,
      played: nonneg(p.played), won: nonneg(p.won), lost: nonneg(p.lost), drawn: nonneg(p.drawn),
      best: nonneg(p.best), streak: nonneg(p.streak), bestStreak: nonneg(p.bestStreak),
    };
    const d = p.daily;
    if (d && typeof d === 'object' && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && (d.outcome === 'win' || d.outcome === 'loss' || d.outcome === 'draw')) {
      out.daily = { date: d.date, you: nonneg(d.you), rival: nonneg(d.rival), outcome: d.outcome };
    }
    for (const k of ['rookie', 'pro', 'legend'] as Difficulty[]) {
      const b = (p.byRival as Record<string, { played?: unknown; won?: unknown }> | undefined)?.[k];
      if (b && typeof b === 'object') out.byRival[k] = { played: nonneg(b.played), won: nonneg(b.won) };
    }
    return out;
  } catch {
    return fresh;
  }
}

export function serialize(s: FaceOffSave): string {
  return JSON.stringify(s);
}

/** book a finished match */
export function recordMatch(s: FaceOffSave, t: Totals, difficulty: Difficulty, daily: string | null): FaceOffSave {
  const o = outcome(t);
  const streak = o === 'win' ? s.streak + 1 : 0;
  const by = { ...s.byRival, [difficulty]: { played: s.byRival[difficulty].played + 1, won: s.byRival[difficulty].won + (o === 'win' ? 1 : 0) } };
  return {
    ...s,
    played: s.played + 1,
    won: s.won + (o === 'win' ? 1 : 0),
    lost: s.lost + (o === 'loss' ? 1 : 0),
    drawn: s.drawn + (o === 'draw' ? 1 : 0),
    best: Math.max(s.best, t.you),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    daily: daily ? { date: daily, you: t.you, rival: t.rival, outcome: o } : s.daily,
    byRival: by,
  };
}

/** the share line, no real names in it, only the score */
export function shareText(t: Totals, difficulty: Difficulty, daily: string | null): string {
  const r = rivalFor(difficulty);
  const o = outcome(t);
  const head = daily ? `Face Off daily ${daily}` : 'Face Off';
  const verdict = o === 'win' ? 'beat' : o === 'loss' ? 'lost to' : 'drew with';
  return `${head}: ${verdict} ${r.label} ${t.you} to ${t.rival} (${t.youRounds} rounds to ${t.rivalRounds}) ${r.emoji}\ndouknowball.com/face-off`;
}

export function fmtValue(n: number): string {
  return n.toLocaleString('en-US');
}

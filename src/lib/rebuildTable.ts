import { Player } from '@/types/game';
import type { RebuildClub } from '@/lib/fetchRebuild';
import {
  hashSeed, RIVAL_PERSONAS, simulateSharedSeason,
  type RebuildPreset, type SharedSeasonResult, type SharedSeasonTeam,
} from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import type { RunState } from '@/lib/rebuildLoop';
import { KEEP_ALL, THINKING, playToWhistle } from '@/lib/rebuildPolicy';

/**
 * Rebuild Challenge: the table. Round 461, the owner's multiplayer line:
 * "same screen pass and play, online, or vs CPU, up to 3 or 4 players, and
 * the finished squads sim a season together with records and trophies shown."
 *
 * One RunState per seat, exactly as Round 456 promised. A table is plain
 * data and a set of pure functions: seats are configured, humans pick clubs
 * in seat order, CPU seats draw theirs, then the windows run seat by seat
 * (a CPU seat plays the thinking policy from src/lib/rebuildPolicy.ts to the
 * whistle in one call) and when every window is shut the finished XIs play
 * one simulated season. The hook (src/hooks/useRebuild.ts) owns the network
 * and the timers and calls these; scripts/simRebuildSeats.mjs drives the
 * same functions with no page.
 *
 * A one seat table is the single player game: the seat's run seed is the
 * club name's hash and its market is the club's own, so nothing about a solo
 * run changed. Online play is not here yet; it would need a room and a way
 * to ship one seat's RunState to another phone, which is a later round.
 */

export type SeatKind = 'human' | 'cpu';
export const MAX_SEATS = 4;
/** How many teams the shared season fills up to, seats first then neutral clubs. */
export const SEASON_SIZE = 6;

export interface Seat {
  index: number;
  kind: SeatKind;
  name: string;
  emoji: string;
  club: RebuildClub | null;
  /** The seat's run, null until its window opens. */
  run: RunState | null;
}

/** A seat as the page sees it: everything but the run, so no screen can
 *  reach another seat's board by accident. The hook hands the board these. */
export type SeatView = Omit<Seat, 'run'>;

export type TablePhase = 'clubs' | 'handover' | 'window' | 'season';

export interface TableState {
  /** XORed into every seat's run seed. Zero on the page, so a club plays the
   *  same run it always has; the harness varies it to see many runs. */
  salt: number;
  seats: Seat[];
  /** During 'clubs' the human seat picking now; afterwards the seat whose window is next, open, or just shut. */
  turn: number;
  phase: TablePhase;
  season: SharedSeasonResult | null;
}

export interface TableData {
  /** Every seat's inherited squad, by club name. */
  squads: Map<string, Player[]>;
  /** Each seat's market as the single player game builds it (everyone outside that club), by club name. */
  markets: Map<string, Player[]>;
  preset: RebuildPreset;
}

const HUMAN_EMOJI = ['\u{1F535}', '\u{1F534}', '\u{1F7E2}', '\u{1F7E1}'];

export function seatKindsOf(t: TableState): SeatKind[] {
  return t.seats.map(s => s.kind);
}

export function createTable(kinds: SeatKind[], salt = 0): TableState {
  const list = kinds.slice(0, MAX_SEATS);
  if (list.length === 0) list.push('human');
  let cpu = 0;
  let human = 0;
  const seats: Seat[] = list.map((kind, index) => {
    if (kind === 'cpu') {
      const persona = RIVAL_PERSONAS[cpu % RIVAL_PERSONAS.length];
      cpu += 1;
      return { index, kind, name: persona.name, emoji: persona.emoji, club: null, run: null };
    }
    human += 1;
    return { index, kind, name: `Player ${human}`, emoji: HUMAN_EMOJI[(human - 1) % HUMAN_EMOJI.length], club: null, run: null };
  });
  const firstHuman = seats.findIndex(s => s.kind === 'human');
  return { salt, seats, turn: Math.max(0, firstHuman), phase: 'clubs', season: null };
}

/** Change who is at the table. Only before anyone has picked a club: the
 *  seats are a promise made before the draw. */
export function configureSeats(t: TableState, kinds: SeatKind[]): TableState {
  if (t.phase !== 'clubs' || t.seats.some(s => s.club)) return t;
  return createTable(kinds, t.salt);
}

/** The seed a seat's run plays under: the club's own hash, as the single
 *  player game has always used, mixed with the table's salt. */
export function seatSeed(club: RebuildClub, salt: number): number {
  return (hashSeed(club.club) ^ salt) >>> 0;
}

function drawCpuClubs(seats: Seat[], clubs: RebuildClub[], salt: number): Seat[] {
  const out = seats.map(s => ({ ...s }));
  const anchor = out.find(s => s.club)?.club ?? null;
  for (const seat of out) {
    if (seat.kind !== 'cpu' || seat.club) continue;
    const taken = new Set(out.map(s => s.club?.club).filter(Boolean));
    const open = clubs.filter(c => !taken.has(c.club));
    const sameTier = anchor ? open.filter(c => c.tier === anchor.tier) : open;
    const pool = sameTier.length > 0 ? sameTier : open;
    if (pool.length === 0) continue;
    const seed = (hashSeed([...taken].sort().join('|') + `#${seat.index}`) ^ salt) >>> 0;
    seat.club = pool[seed % pool.length];
  }
  return out;
}

/** Once every human seat has a club, the CPU seats draw theirs (same tier as
 *  the first pick, never a club already taken) and the first window is next.
 *  Refused while a human still has to pick. A table with no human at all
 *  (the harness plays those) starts here. */
export function drawClubs(t: TableState, clubs: RebuildClub[]): TableState {
  if (t.phase !== 'clubs') return t;
  if (t.seats.some(s => s.kind === 'human' && !s.club)) return t;
  return { ...t, seats: drawCpuClubs(t.seats, clubs, t.salt), turn: 0, phase: 'handover' };
}

/** The human seat in the chair picks a club nobody else at the table holds.
 *  The next human is up, or, when every human has one, the CPU seats draw. */
export function pickClub(t: TableState, club: RebuildClub, clubs: RebuildClub[]): TableState {
  if (t.phase !== 'clubs') return t;
  const seat = t.seats[t.turn];
  if (!seat || seat.kind !== 'human' || seat.club) return t;
  if (t.seats.some(s => s.club?.club === club.club)) return t;
  const seats = t.seats.map(s => (s.index === seat.index ? { ...s, club } : s));
  const nextHuman = seats.findIndex(s => s.kind === 'human' && !s.club);
  if (nextHuman >= 0) return { ...t, seats, turn: nextHuman };
  return drawClubs({ ...t, seats }, clubs);
}

/** The seat whose window is next, open, or just shut. */
export function activeSeat(t: TableState): Seat | null {
  return t.seats[t.turn] ?? null;
}

/** Every seat without its run: what the page is allowed to hold. */
export function seatViewsOf(t: TableState): SeatView[] {
  return t.seats.map(s => ({ index: s.index, kind: s.kind, name: s.name, emoji: s.emoji, club: s.club }));
}

/** The run on the board right now: only while a window is open, never during a hand over. */
export function activeRun(t: TableState): RunState | null {
  return t.phase === 'window' ? (t.seats[t.turn]?.run ?? null) : null;
}

/** A CPU seat's whole window in one call: the thinking policy to the
 *  whistle. A refused move would mean the policy and the rules disagree
 *  about what is legal, which the harness proves they do not; the seat still
 *  has to finish, so the plain policy takes the run home if it ever happens. */
export function playCpuWindow(run: RunState): RunState {
  const first = playToWhistle(run, THINKING);
  if (!first.refused) return first.state;
  return playToWhistle(first.state, KEEP_ALL).state;
}

/**
 * Opens the window of the seat in the chair. Its market is the single player
 * market for its club with every other seat's squad cut out, and every man an
 * earlier seat holds at the whistle, signed, or lost to a rival cut out by
 * name, so no two seats can end the window holding the same man and a man who
 * left for a rival's club does not turn up on the next seat's list. Its
 * persona rivals never rebuild a club somebody at the table holds. A CPU seat
 * plays its window here and now.
 */
export function openWindow(t: TableState, data: TableData, clubs: RebuildClub[]): TableState {
  if (t.phase !== 'handover') return t;
  const seat = t.seats[t.turn];
  if (!seat || !seat.club || seat.run) return t;
  const squad = data.squads.get(seat.club.club);
  const base = data.markets.get(seat.club.club);
  if (!squad || !base) return t;
  const others = t.seats.filter(s => s.index !== seat.index);
  const taken = new Set<string>();
  const otherClubs = new Set<string>();
  for (const o of others) {
    if (o.club) otherClubs.add(o.club.club);
    for (const p of data.squads.get(o.club?.club ?? '') ?? []) taken.add(p.name);
    for (const p of o.run?.signed ?? []) taken.add(p.name);
    for (const n of Object.keys(o.run?.lost ?? {})) taken.add(n);
    /* The reckoning's forced sales swap in the cheapest market fit, who is
       never in `signed`; without this line two seats in debt end the window
       holding the same cheap man (7 of 240 tables, measured by the harness). */
    for (const p of o.run?.reckoning?.xi ?? []) if (p) taken.add(p.name);
  }
  const market = others.length === 0 ? base : base.filter(p => !otherClubs.has(p.club) && !taken.has(p.name));
  const rivalPool = others.length === 0 ? clubs : clubs.filter(c => !otherClubs.has(c.club));
  let run = loop.createRun({
    club: seat.club, clubs: rivalPool, squad, market, preset: data.preset, seed: seatSeed(seat.club, t.salt),
  });
  if (seat.kind === 'cpu') run = playCpuWindow(run);
  const seats = t.seats.map(s => (s.index === seat.index ? { ...s, run } : s));
  return { ...t, seats, phase: 'window' };
}

/** Every action on the open window goes through here: the engine's answer replaces the seat's run. */
export function updateRun(t: TableState, fn: (r: RunState) => RunState): TableState {
  if (t.phase !== 'window') return t;
  const seat = t.seats[t.turn];
  if (!seat?.run) return t;
  const next = fn(seat.run);
  if (next === seat.run) return t;
  const seats = t.seats.map(s => (s.index === seat.index ? { ...s, run: next } : s));
  return { ...t, seats };
}

/** The seats' finished XIs as season teams, post reckoning, manager lift included. */
export function seasonTeamsOf(seats: Seat[]): SharedSeasonTeam[] {
  const teams: SharedSeasonTeam[] = [];
  for (const s of seats) {
    if (!s.run || !s.run.reckoning || !s.club) continue;
    teams.push({
      seat: s.index,
      name: s.name,
      emoji: s.emoji,
      clubName: s.club.club,
      rating: loop.ratingOf(s.run),
      startRating: s.run.startRating,
      xi: s.run.reckoning.xi.filter((p): p is Player => p !== null),
    });
  }
  return teams;
}

/** Neutral clubs to make the league up to SEASON_SIZE: the first seat's tier
 *  where it has enough, nobody at the table, rotated by the table's seed. */
export function fillerClubsFor(seats: Seat[], clubs: RebuildClub[], seed: number): RebuildClub[] {
  const used = new Set(seats.map(s => s.club?.club));
  const need = Math.max(0, SEASON_SIZE - seats.length);
  if (need === 0) return [];
  const tier = seats[0]?.club?.tier;
  const open = clubs.filter(c => !used.has(c.club));
  const sameTier = tier ? open.filter(c => c.tier === tier) : open;
  const pool = sameTier.length >= need ? sameTier : open;
  if (pool.length === 0) return [];
  const off = seed % pool.length;
  return [...pool.slice(off), ...pool.slice(0, off)].slice(0, need);
}

/** One seed for the whole table's season: every seat's run seed folded together. */
export function tableSeed(t: TableState): number {
  return t.seats.reduce((a, s) => (a ^ (s.run?.seed ?? 0)) >>> 0, (0x5ea7 ^ t.salt) >>> 0);
}

/** Shut the open window. The next seat is handed the phone, or, when this
 *  was the last one, the finished XIs play the season together. */
export function closeWindow(t: TableState, clubs: RebuildClub[]): TableState {
  if (t.phase !== 'window') return t;
  const seat = t.seats[t.turn];
  if (!seat?.run || seat.run.phase !== 'done') return t;
  const turn = t.turn + 1;
  if (turn < t.seats.length) return { ...t, turn, phase: 'handover' };
  const seed = tableSeed(t);
  const season = simulateSharedSeason(seasonTeamsOf(t.seats), fillerClubsFor(t.seats, clubs, seed), seed);
  return { ...t, turn, phase: 'season', season };
}

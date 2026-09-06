import type { RebuildClub } from '@/lib/fetchRebuild';
import type { RebuildPreset } from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import type { RunState } from '@/lib/rebuildLoop';
import * as table from '@/lib/rebuildTable';
import type { SeatKind, TableData, TablePhase, TableState } from '@/lib/rebuildTable';

/**
 * Rebuild Challenge: the run, kept across a refresh. Round 477.
 *
 * Nothing about a Rebuild run was ever saved. The whole thing lived in React
 * state in src/hooks/useRebuild.ts, so a refresh, a back swipe or a phone
 * that dropped the tab threw away a solo window, and at a table it threw away
 * a pass and play session three other people were sitting around. Round 461
 * shipped the table; this makes it survive.
 *
 * WHAT IS SAVED, AND WHY IT IS NOT THE RUN. A RunState carries functions
 * (every board demand is a `check`), the club's whole squad and the whole
 * market, so it does not survive JSON and it would be a big thing to write on
 * every tap. It does not have to be written at all: every function in
 * src/lib/rebuildLoop.ts is pure and seeded, so a run is exactly its setup
 * plus the moves the player made in order. The save is the seats, their clubs
 * by name, the preset, the salt, whose turn it is, and one list of moves per
 * seat. Restoring is createTable, the club picks, then openWindow and the
 * moves replayed seat by seat, which is the same order the table plays them
 * in, so every seat's market is cut by the seats before it exactly as it was
 * the first time.
 *
 * FAIL CLOSED, TWICE. parseRebuildSave checks every field before anything is
 * replayed: version, salt, preset, phase, turn, seat count, seat kind, club
 * name, and every move's kind and payload. Then the replay is the second
 * gate: a move the engine refuses returns the state it was given, and a
 * refusal ends the restore. Last, each seat carries a fingerprint of its run
 * as it was saved (runFingerprint below) and the replayed run has to match
 * it, so a save written against last week's market, or a hand edited one,
 * opens a fresh run instead of a half restored one. There is no path that
 * returns a partly rebuilt table.
 *
 * WRITTEN AS IT GOES, not at the end. The hook writes after every move that
 * changed the run, so an interruption costs a spin and not a session. Round
 * 468's drills wrote the record only on the last round and that is the exact
 * defect this avoids.
 *
 * VERSIONS. REBUILD_SAVE_VERSION is the shape on disk. MIGRATIONS maps an
 * older version to the next one up; version 1 is the first shape Rebuild has
 * ever had, so the table is empty today and any version but 1 opens fresh.
 * When the shape changes, bump the constant and add the 1 to 2 step there.
 *
 * Rebuild is not a daily game (it has no entry in the registry's daily list
 * and no daily record), so there is no answer to hand back early: the save
 * restores the player's own run and nothing else.
 *
 * scripts/simRebuildSave.mjs drives all of this with no page.
 */

export const REBUILD_SAVE_VERSION = 1;
export const REBUILD_SAVE_KEY = 'rebuild-table';

/** A hostile save cannot make the page chew through a million replays. A full
 *  window is a couple of dozen moves; the harness plays thousands and prints
 *  what the longest one actually needed. */
export const MAX_MOVES_PER_SEAT = 400;

/** One tap on the board, as the save writes it. Every one maps to a pure
 *  function in src/lib/rebuildLoop.ts. */
export type RebuildMove =
  | { k: 'finance'; i: number }
  | { k: 'toManager' }
  | { k: 'manager'; id: string }
  | { k: 'formation'; name: string }
  | { k: 'spin' }
  | { k: 'keep' }
  | { k: 'sell' }
  | { k: 'offer'; name: string }
  | { k: 'promote'; name: string }
  | { k: 'forty' }
  | { k: 'redeal' }
  | { k: 'raise' }
  | { k: 'reply' }
  | { k: 'walk' }
  | { k: 'clearWar' }
  | { k: 'whistle' };

/** The table plus the moves that built it: what the hook holds and what the
 *  save is written from. Always one move list per seat. */
export interface RebuildSession {
  table: TableState;
  moves: RebuildMove[][];
}

export interface SavedSeat {
  kind: SeatKind;
  /** The club by name; the club list is fetched again on restore. */
  club: string | null;
  moves: RebuildMove[];
  /** runFingerprint of this seat's run, or null for a seat never opened. */
  fp: string | null;
}

export interface RebuildSave {
  v: number;
  salt: number;
  preset: RebuildPreset;
  phase: TablePhase;
  turn: number;
  seats: SavedSeat[];
}

const PRESETS: RebuildPreset[] = ['none', 'europe5', 'u25', 'u21', 'bargain'];
const PHASES: TablePhase[] = ['clubs', 'handover', 'window', 'season'];

/** Replays one move. The engine hands back the state it was given when the
 *  move is not legal, which is how the restore knows the save is stale. */
export function applyMove(r: RunState, m: RebuildMove): RunState {
  switch (m.k) {
    case 'finance': return loop.pickFinance(r, m.i);
    case 'toManager': return loop.toManager(r);
    case 'manager': return loop.hireManager(r, m.id);
    case 'formation': return loop.setFormation(r, m.name);
    case 'spin': return loop.spinNext(r);
    case 'keep': return loop.keep(r);
    case 'sell': return loop.sell(r);
    case 'offer': return loop.takeOffer(r, m.name);
    case 'promote': return loop.promote(r, m.name);
    case 'forty': return loop.takeForty(r);
    case 'redeal': return loop.redeal(r);
    case 'raise': return loop.raise(r);
    case 'reply': return loop.rivalReply(r);
    case 'walk': return loop.walk(r);
    case 'clearWar': return loop.clearWar(r);
    case 'whistle': return loop.blowWhistle(r);
  }
}

/**
 * Everything about a run that a player would notice had changed, in one
 * string. The replay has to land on this exactly or the save is refused, so
 * a market that moved under the save, or a save somebody edited, opens a
 * fresh run rather than a run that quietly is not the one they left.
 */
export function runFingerprint(r: RunState): string {
  const names = (list: { name: string }[]) => list.map(p => p.name).join(',');
  const decided = Object.keys(r.decided)
    .map(Number)
    .sort((a, b) => a - b)
    .map(i => `${i}:${r.decided[i]?.name ?? '40'}`)
    .join(',');
  return [
    r.phase,
    r.formation.name,
    r.startRating,
    r.target,
    r.settledCount,
    r.spun ?? '-',
    r.manager?.id ?? '-',
    r.financeIndex ?? '-',
    r.actions,
    r.extraFunds,
    r.overpaid,
    r.discounts,
    names(r.sold),
    names(r.signed),
    Object.keys(r.lost).sort().join(','),
    decided,
    r.war ? `${r.war.player.name}/${r.war.price}/${r.war.leader}/${r.war.outcome}` : '-',
    r.deal ? `${names(r.deal.offers)}#${names(r.deal.bench)}` : '-',
    r.reckoning ? `${r.reckoning.funds}/${r.reckoning.ratingPen}/${r.reckoning.notes.length}` : '-',
  ].join('|');
}

/** Is this table a finish the site would record: the solo run home, or every
 *  seat's window shut and the shared season played. The hook asks before it
 *  applies a restore, because a finish read back from storage is not a new
 *  finish (src/lib/restoredFinish.ts). */
export function isFinishedTable(t: TableState): boolean {
  if (t.seats.length === 1) return t.seats[0].run?.phase === 'done';
  return t.phase === 'season';
}

/* ---------------- writing ---------------- */

/** The session as it goes on disk, or null when there is nothing worth
 *  keeping (nobody has picked a club yet). */
export function toSave(session: RebuildSession, preset: RebuildPreset): RebuildSave | null {
  const t = session.table;
  if (!t.seats.some(s => s.club)) return null;
  return {
    v: REBUILD_SAVE_VERSION,
    salt: t.salt,
    preset,
    phase: t.phase,
    turn: t.turn,
    seats: t.seats.map((s, i) => ({
      kind: s.kind,
      club: s.club?.club ?? null,
      moves: session.moves[i] ?? [],
      fp: s.run ? runFingerprint(s.run) : null,
    })),
  };
}

export function writeRebuildSave(save: RebuildSave): void {
  try {
    localStorage.setItem(REBUILD_SAVE_KEY, JSON.stringify(save));
  } catch {
    /* storage full or blocked: the run still plays, it just will not survive a refresh */
  }
}

export function clearRebuildSave(): void {
  try {
    localStorage.removeItem(REBUILD_SAVE_KEY);
  } catch {
    /* nothing to do */
  }
}

/* ---------------- reading, fail closed ---------------- */

function isMove(m: unknown): m is RebuildMove {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
  const o = m as Record<string, unknown>;
  const str = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 80;
  switch (o.k) {
    case 'finance': return Number.isInteger(o.i) && (o.i as number) >= 0 && (o.i as number) < 64;
    case 'manager': return str(o.id);
    case 'formation': return str(o.name);
    case 'offer': return str(o.name);
    case 'promote': return str(o.name);
    case 'toManager':
    case 'spin':
    case 'keep':
    case 'sell':
    case 'forty':
    case 'redeal':
    case 'raise':
    case 'reply':
    case 'walk':
    case 'clearWar':
    case 'whistle':
      return true;
    default: return false;
  }
}

function isSeat(s: unknown): s is SavedSeat {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  const o = s as Record<string, unknown>;
  if (o.kind !== 'human' && o.kind !== 'cpu') return false;
  if (o.club !== null && !(typeof o.club === 'string' && o.club.length > 0 && o.club.length <= 120)) return false;
  if (o.fp !== null && !(typeof o.fp === 'string' && o.fp.length > 0 && o.fp.length <= 4000)) return false;
  if (!Array.isArray(o.moves) || o.moves.length > MAX_MOVES_PER_SEAT) return false;
  return o.moves.every(isMove);
}

type Migration = (o: Record<string, unknown>) => Record<string, unknown> | null;

/**
 * One step per old version, keyed by the version it reads. Version 1 is the
 * first shape Rebuild has ever had, so there is nothing to step up from yet
 * and any other version opens fresh. A shape change adds its step here and
 * bumps REBUILD_SAVE_VERSION; nothing else has to move.
 */
const MIGRATIONS: Record<number, Migration> = {};

function migrate(o: Record<string, unknown>): Record<string, unknown> | null {
  let cur = o;
  for (let steps = 0; steps <= Object.keys(MIGRATIONS).length; steps += 1) {
    const v = cur.v;
    if (typeof v !== 'number' || !Number.isInteger(v)) return null;
    if (v === REBUILD_SAVE_VERSION) return cur;
    const step = MIGRATIONS[v];
    if (!step) return null;
    const next = step(cur);
    if (!next) return null;
    cur = next;
  }
  return null;
}

/** Parse and check one stored payload. Returns null on anything unexpected. */
export function parseRebuildSave(raw: string | null): RebuildSave | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const migrated = migrate(parsed as Record<string, unknown>);
  if (!migrated) return null;
  const o = migrated;
  if (!Number.isInteger(o.salt) || (o.salt as number) < 0 || (o.salt as number) > 0xffffffff) return null;
  if (typeof o.preset !== 'string' || !PRESETS.includes(o.preset as RebuildPreset)) return null;
  if (typeof o.phase !== 'string' || !PHASES.includes(o.phase as TablePhase)) return null;
  if (!Array.isArray(o.seats) || o.seats.length < 1 || o.seats.length > table.MAX_SEATS) return null;
  if (!o.seats.every(isSeat)) return null;
  const seats = o.seats as SavedSeat[];
  if (!Number.isInteger(o.turn)) return null;
  const turn = o.turn as number;
  if (turn < 0 || turn > seats.length) return null;
  /* Only a finished table sits past the last seat. */
  if (turn === seats.length && o.phase !== 'season') return null;
  if (o.phase === 'season' && turn !== seats.length) return null;
  /* Two seats never hold the same club. */
  const held = seats.map(s => s.club).filter((c): c is string => c !== null);
  if (new Set(held).size !== held.length) return null;
  return { v: REBUILD_SAVE_VERSION, salt: o.salt as number, preset: o.preset as RebuildPreset, phase: o.phase as TablePhase, turn, seats };
}

export function readRebuildSave(): RebuildSave | null {
  try {
    return parseRebuildSave(localStorage.getItem(REBUILD_SAVE_KEY));
  } catch {
    return null;
  }
}

/* ---------------- restoring ---------------- */

/** The club names a save needs fetched, in seat order, empty string for a
 *  seat that has not picked. Joined with a pipe this is the hook's data key. */
export function savedClubNames(save: RebuildSave): string[] {
  return save.seats.map(s => s.club ?? '');
}

/**
 * Rebuilds the table the save describes, or returns null. Never returns a
 * partly rebuilt one: every refusal, every club it cannot find and every
 * fingerprint that does not match ends the restore, and the caller opens a
 * fresh run.
 */
export function restoreTable(save: RebuildSave, clubs: RebuildClub[], data: TableData): RebuildSession | null {
  const byName = new Map(clubs.map(c => [c.club, c]));
  const kinds = save.seats.map(s => s.kind);
  let t = table.createTable(kinds, save.salt);
  if (t.seats.length !== save.seats.length) return null;

  if (save.seats.some(s => s.kind === 'human')) {
    for (const s of save.seats) {
      if (s.kind !== 'human') continue;
      if (!s.club) break;
      const club = byName.get(s.club);
      if (!club) return null;
      const next = table.pickClub(t, club, clubs);
      if (next === t) return null;
      t = next;
    }
  } else {
    if (save.seats.some(s => !s.club)) return null;
    const next = table.drawClubs(t, clubs);
    if (next === t) return null;
    t = next;
  }

  /* Every seat, the CPU seats' own draw included, has to land on the club the
     save recorded. A club list that has moved since fails here. */
  for (let i = 0; i < save.seats.length; i += 1) {
    if ((t.seats[i].club?.club ?? null) !== save.seats[i].club) return null;
  }

  const moves = save.seats.map(s => s.moves.slice());

  if (save.phase === 'clubs') {
    if (t.phase !== 'clubs' || t.turn !== save.turn) return null;
    if (save.seats.some(s => s.moves.length > 0 || s.fp !== null)) return null;
    return { table: t, moves };
  }

  for (let i = 0; i < save.seats.length; i += 1) {
    if (i > save.turn) break;
    if (i === save.turn && save.phase === 'handover') break;
    const opened = table.openWindow(t, data, clubs);
    if (opened === t) return null;
    t = opened;
    for (const m of save.seats[i].moves) {
      const next = table.updateRun(t, r => applyMove(r, m));
      if (next === t) return null;
      t = next;
    }
    const run = t.seats[i].run;
    if (!run) return null;
    if (typeof save.seats[i].fp !== 'string' || runFingerprint(run) !== save.seats[i].fp) return null;
    if (i < save.turn) {
      const closed = table.closeWindow(t, clubs);
      if (closed === t) return null;
      t = closed;
    }
  }

  /* A seat past the one in the chair must not have played anything. */
  for (let i = save.turn + 1; i < save.seats.length; i += 1) {
    if (save.seats[i].moves.length > 0 || save.seats[i].fp !== null) return null;
  }
  if (save.phase === 'handover' && save.seats[save.turn].moves.length > 0) return null;
  /* A seat the save says had a window open has to have one back, and a seat
     it says never opened must not have one. Without this a save with its turn
     nudged down by one restores a table that has quietly lost a whole seat's
     finished run. */
  for (let i = 0; i < save.seats.length; i += 1) {
    if ((t.seats[i].run !== null) !== (save.seats[i].fp !== null)) return null;
  }
  if (t.phase !== save.phase || t.turn !== save.turn) return null;
  return { table: t, moves };
}

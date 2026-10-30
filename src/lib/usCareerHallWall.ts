/**
 * Round 1570: the Hall wall. Every player retired in the NBA, NFL, MLB and NHL My Careers keeps a plaque after
 * the save is cleared, so a restart no longer takes his Hall of Fame card with it.
 *
 * The Hall record is still derived, never saved (careerHallOfFame.ts says why). A plaque is a copy of what the
 * card showed at the moment he retired, plus a short career line, kept under its own key beside each sport's save
 * (`{slug}-my-career-hall-v1`), so the save itself never changes. The shape mirrors Fight Career's past fighters
 * (fightCareer.ts archiveCareer): keyed, newest first, capped, each entry checked alone on the way back in.
 *
 * Pure: it imports no sport (any US career route can load it), draws no random number and reads no storage. The
 * board does the one read and the one write, and loads this file only when there is a wall to read or a retired
 * career to put up (a runner measured it at 2.02K on every route when it loaded with the board, over the lead's
 * 2K; usCareerHallWallKey.ts holds the two small pieces the board needs on its first frame).
 *
 * THE CAP. A wall holds 12. The new plaque always goes up; past 12, the oldest of the 12 already up that missed
 * the Hall comes down, and only when all 12 already up are Hall of Famers does the oldest Hall of Famer come down.
 *
 * ONE CLAMP FOR BOTH PATHS. A fresh plaque and one read back go through the same cleanEntry, so the round trip
 * is lossless and two copies of one plaque compare equal by their JSON. The key is never cut: a career whose key
 * is longer than HALL_WALL_KEY_MAX gets no plaque at all (and the restart prompt then says the card goes, which
 * is true), because a cut key would no longer match the career and the plaque would be added again on every load.
 * Every string clamp sits well above the longest real string (the harness and the unit file check that), and the
 * byte bound is derived from an entry with every clamp hit and every list full: HALL_WALL_ENTRY_MAX_BYTES, 2,251
 * characters of JSON written in plain letters (measured 2026-10-29), so a full wall of 12 is at most 27,043, about
 * two of the retired saves it sits beside (7,042 to 12,834 each in the parity fixture). A character JSON has to
 * escape takes more room than one, and only an edited save holds one.
 */
import { hallRecordFor, type HallRecord, type HallSportId, type UsHallSport } from '@/lib/careerHallOfFame';
import type { UsCareerCore } from '@/lib/usCareerSport';
import { hallWallKey, wallKeyOf } from '@/lib/usCareerHallWallKey';

export const HALL_WALL_CAP = 12;
/** The longest key a plaque may carry. A longer one gets no plaque (never a cut key). */
export const HALL_WALL_KEY_MAX = 200;
/** Every string the plaque keeps, and its clamp. */
export const HALL_WALL_CLAMPS = { name: 40, pos: 6, eraId: 16, team: 8, verdict: 160, hallName: 80, teamName: 60, weighs: 320, label: 48 } as const;
export const HALL_WALL_LISTS = { teams: 8, honours: 6, ballots: 10 } as const;
/** The JSON size of one plaque with every clamp hit and every list full (the unit file and the harness build it). */
export const HALL_WALL_ENTRY_MAX_BYTES = 2251;

export interface HallWallEntry {
  key: string;
  name: string;
  pos: string;
  eraId?: string;
  seasons: number;
  from: number;
  to: number;
  /** The clubs in the order he first played for them, at most 8. */
  teams: string[];
  /** How many more clubs past those 8. */
  moreTeams?: number;
  rings: number;
  honours: { label: string; n: number }[];
  legacy: number;
  verdict: string;
  hof: boolean;
  hall: HallRecord;
}

export interface HallWall { entries: HallWallEntry[]; writable: boolean }

/** What the wall reads off a binding: its Hall, its legacy and its trophy counts. */
export interface HallWallSport<C extends UsCareerCore> {
  hall?: UsHallSport<C>;
  legacyOf(c: C): { score: number; verdict: string; hof: boolean };
  ringsOf(c: C): number;
  honours(c: C): { label: string; n: number }[];
}

/* The storage key and the career key live in usCareerHallWallKey.ts, the only part of the wall the board loads
   on its first frame (the rest loads when there is a wall to read or a retired career to put up). */
export { hallWallKey, wallKeyOf };

const SPORTS: readonly HallSportId[] = ['nfl', 'nba', 'mlb', 'nhl'];
const OUTCOMES = ['inducted', 'fellOff', 'waiting', 'notOnBallot'] as const;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const whole = (v: unknown, lo: number, hi: number): v is number => num(v) && Number.isInteger(v) && v >= lo && v <= hi;
const year = (v: unknown): v is number => whole(v, 1000, 9999);
/** A legacy score: legacyRead rounds it to a whole number. */
const score = (v: unknown): v is number => whole(v, -99999, 99999);
const cut = (v: unknown, n: number): string | null => (typeof v === 'string' ? v.slice(0, n) : null);
const C = HALL_WALL_CLAMPS, L = HALL_WALL_LISTS;

/** A Hall record as the card reads it, or null. Keys in the order hallRecordFor writes them. */
export function sanitizeHallRecord(raw: unknown, sport: HallSportId): HallRecord | null {
  if (!isObj(raw) || raw.sport !== sport) return null;
  const hallName = cut(raw.hallName, C.hallName);
  const outcome = OUTCOMES.find(o => o === raw.outcome);
  if (hallName === null || !outcome || !year(raw.firstClass) || !score(raw.score) || !Array.isArray(raw.ballots)) return null;
  if (!(raw.inductedClass === null || year(raw.inductedClass)) || typeof raw.firstBallot !== 'boolean') return null;
  const ballots: HallRecord['ballots'] = [];
  for (const b of raw.ballots.slice(0, L.ballots)) {
    if (!isObj(b) || !year(b.classYear) || !num(b.share) || b.share < 0 || b.share > 100 || typeof b.elected !== 'boolean') return null;
    // A share is one decimal (the ballot's oneDecimal), so this gives back the same number and bounds its digits.
    ballots.push({ classYear: b.classYear, share: Math.round(b.share * 10) / 10, elected: b.elected });
  }
  let jersey: HallRecord['jersey'] = null;
  if (raw.jersey !== null) {
    const j = raw.jersey;
    const team = isObj(j) ? cut(j.team, C.team) : null;
    if (!isObj(j) || team === null || !whole(j.seasons, 0, 99)) return null;
    jersey = { team, seasons: j.seasons };
    if (j.teamName !== undefined) {
      const teamName = cut(j.teamName, C.teamName);
      if (teamName === null) return null;
      jersey.teamName = teamName;
    }
  }
  const rec: HallRecord = {
    sport, hallName, firstClass: raw.firstClass, score: raw.score, outcome, ballots,
    inductedClass: raw.inductedClass as number | null, firstBallot: raw.firstBallot, jersey,
  };
  if (raw.weighs !== undefined) {
    const weighs = cut(raw.weighs, C.weighs);
    if (weighs === null) return null;
    rec.weighs = weighs;
  }
  return rec;
}

/** One plaque, checked and clamped, or null. The one function both a fresh plaque and a stored one go through. */
function cleanEntry(raw: unknown, sport: HallSportId): HallWallEntry | null {
  if (!isObj(raw) || typeof raw.key !== 'string' || !raw.key || raw.key.length > HALL_WALL_KEY_MAX) return null;
  const name = cut(raw.name, C.name), pos = cut(raw.pos, C.pos), verdict = cut(raw.verdict, C.verdict);
  if (name === null || pos === null || verdict === null || typeof raw.hof !== 'boolean') return null;
  if (!whole(raw.seasons, 0, 99) || !year(raw.from) || !year(raw.to) || !whole(raw.rings, 0, 999) || !score(raw.legacy)) return null;
  if (!Array.isArray(raw.teams) || !Array.isArray(raw.honours)) return null;
  const teams: string[] = [];
  for (const t of raw.teams.slice(0, L.teams)) { const s = cut(t, C.team); if (s === null) return null; teams.push(s); }
  const honours: HallWallEntry['honours'] = [];
  for (const h of raw.honours.slice(0, L.honours)) {
    const label = isObj(h) ? cut(h.label, C.label) : null;
    if (!isObj(h) || label === null || !whole(h.n, 0, 9999)) return null;
    honours.push({ label, n: h.n });
  }
  const hall = sanitizeHallRecord(raw.hall, sport);
  if (!hall) return null;
  const e: HallWallEntry = { key: raw.key, name, pos, seasons: raw.seasons, from: raw.from, to: raw.to, teams, rings: raw.rings, honours, legacy: raw.legacy, verdict, hof: raw.hof, hall };
  if (raw.eraId !== undefined) { const eraId = cut(raw.eraId, C.eraId); if (eraId === null) return null; e.eraId = eraId; }
  if (raw.moreTeams !== undefined) { if (!whole(raw.moreTeams, 1, 999)) return null; e.moreTeams = raw.moreTeams; }
  return e;
}

/** The plaque for a retired career, built from the career as it stands (after the save stamped its calibration).
 *  Null for a career still being played, with no Hall bound, or with a key too long to keep whole. Reads c, never
 *  writes it. */
export function hallWallEntry<C extends UsCareerCore>(sport: HallWallSport<C>, c: C): HallWallEntry | null {
  const hall = sport.hall;
  if (!hall || !c.retired) return null;
  const legacy = sport.legacyOf(c);
  const seen: string[] = [];
  for (const s of c.seasons) if (!seen.includes(s.team)) seen.push(s.team);
  const last = c.seasons.length ? c.seasons[c.seasons.length - 1].year : c.year;
  return cleanEntry({
    key: wallKeyOf(c, hall), name: c.name, pos: c.pos, eraId: c.eraId, seasons: c.seasons.length,
    from: c.seasons[0]?.year ?? c.year, to: last, teams: seen.slice(0, L.teams),
    moreTeams: seen.length > L.teams ? seen.length - L.teams : undefined, rings: sport.ringsOf(c),
    honours: sport.honours(c).filter(h => h.n > 0), legacy: legacy.score, verdict: legacy.verdict, hof: legacy.hof,
    hall: hallRecordFor(hall, c),
  }, hall.rules.sport);
}

/** Puts a plaque up, keyed by career. The same plaque already up gives back THE SAME list (so the board can skip
 *  the write); the same career with a changed record is replaced where it hangs, nothing comes down. A new
 *  plaque goes up first, and past the cap the oldest one that missed the Hall comes down (the oldest Hall of
 *  Famer only when every plaque already up is one). */
export function addToWall(list: HallWallEntry[], entry: HallWallEntry): HallWallEntry[] {
  const at = list.findIndex(e => e.key === entry.key);
  if (at >= 0) {
    if (JSON.stringify(list[at]) === JSON.stringify(entry)) return list;
    return list.map((e, i) => (i === at ? entry : e));
  }
  const next = [entry, ...list];
  while (next.length > HALL_WALL_CAP) {
    let drop = next.length - 1;
    for (let i = next.length - 1; i >= 1; i -= 1) if (next[i].hall.outcome !== 'inducted') { drop = i; break; }
    next.splice(drop, 1);
  }
  return next;
}

/** Whatever storage handed back, as a wall. Junk is an empty wall that the next plaque replaces; a wall of a
 *  version this build does not know is left alone (not shown, never written over); inside a v1 wall a bad plaque,
 *  a plaque of another sport or a second copy of a key is dropped alone. */
export function sanitizeHallWall(raw: unknown, sport: HallSportId): HallWall {
  if (!isObj(raw) || !SPORTS.includes(sport)) return { entries: [], writable: true };
  if (raw.v !== 1) return { entries: [], writable: typeof raw.v !== 'number' };
  const entries: HallWallEntry[] = [];
  for (const r of Array.isArray(raw.entries) ? raw.entries : []) {
    const e = cleanEntry(r, sport);
    if (e && !entries.some(x => x.key === e.key)) entries.push(e);
    if (entries.length >= HALL_WALL_CAP) break;
  }
  return { entries, writable: true };
}

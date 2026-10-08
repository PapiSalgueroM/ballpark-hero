/* Round 1047: the one thing a Season Centre moment writes to a career save.

   A career that never presses "Take it yourself" never has this key, so its
   save is byte for byte what it was before moments existed. A career that
   does gets one small ledger for the season it is watching: which moment,
   that the attempt was used, how it went and the input that made it, so the
   season a player shaped is rebuilt the same on every reload and device.

   It imports nothing, so the season engine, the page and every sport's
   career board can share it. Every reader goes through readSeasonMoments,
   which fails closed: a ledger that is not exactly this shape is refused
   whole (the season then shows as it was played), never half read. */

export interface SeasonMomentsSave {
  v: 1;
  /** The season key of the row it belongs to; any other key is an older season. */
  key: string;
  /** [matchday, moment, result, ...the packed input]; result -1 used (the
   *  board opened), 0 missed, 1 to 3 stars. */
  m: number[][];
  /** This season's stars are already in next season's growth. */
  banked?: 1;
  /** What that bank put into next season's growth, with the year of the season
   *  it was banked in: [year, points]. The daily drill of the same season reads
   *  it, so the pair stops at his ceiling whichever of the two banks first. */
  paid?: [number, number];
  /** The career's running count, from the seasons before this one. */
  tally?: { seasons: number; moments: number; stars: number };
}

/** Entries a season's ledger may hold, and the numbers one entry may hold. */
export const LEDGER_MAX = 12;
export const ENTRY_MIN = 3;
export const ENTRY_MAX = 8;
const KEY_MAX = 200;
const MD_MAX = 400;
const YEAR_MAX = 9999;
const PAID_MAX = 2;
const TALLY_MAX = { seasons: 200, moments: 2400, stars: 7200 };

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** The ledger as saved, or null when it is anything but a well formed one. Never throws. */
export function readSeasonMoments(raw: unknown): SeasonMomentsSave | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    if (r.v !== 1) return null;
    if (typeof r.key !== 'string' || r.key.length === 0 || r.key.length > KEY_MAX) return null;
    if (!Array.isArray(r.m) || r.m.length > LEDGER_MAX) return null;
    const m: number[][] = [];
    for (const e of r.m) {
      if (!Array.isArray(e) || e.length < ENTRY_MIN || e.length > ENTRY_MAX) return null;
      if (!e.every(x => typeof x === 'number' && Number.isFinite(x))) return null;
      if (!isInt(e[0], 1, MD_MAX) || !isInt(e[1], 0, LEDGER_MAX - 1) || !isInt(e[2], -1, 3)) return null;
      /* a duplicate keeps the first: an attempt is used once */
      if (m.some(x => x[0] === e[0] && x[1] === e[1])) continue;
      m.push(e.slice());
    }
    const out: SeasonMomentsSave = { v: 1, key: r.key, m };
    if (r.banked !== undefined) { if (r.banked !== 1) return null; out.banked = 1; }
    if (r.paid !== undefined) {
      const p = r.paid;
      if (out.banked !== 1 || !Array.isArray(p) || p.length !== 2 || !isInt(p[0], 0, YEAR_MAX) || !isInt(p[1], 1, PAID_MAX)) return null;
      out.paid = [p[0], p[1]];
    }
    if (r.tally !== undefined) {
      const t = r.tally as Record<string, unknown> | null;
      if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
      if (!isInt(t.seasons, 0, TALLY_MAX.seasons) || !isInt(t.moments, 0, TALLY_MAX.moments) || !isInt(t.stars, 0, TALLY_MAX.stars)) return null;
      out.tally = { seasons: t.seasons, moments: t.moments, stars: t.stars };
    }
    return out;
  } catch {
    return null;
  }
}

/** The entries of the season `key`, or none when the ledger belongs to another season. */
export function ledgerOf(save: SeasonMomentsSave | null | undefined, key: string): number[][] {
  const s = readSeasonMoments(save);
  return s && s.key === key ? s.m : [];
}

/** What a ledger adds to the career's running count when its season is over. */
function folded(s: SeasonMomentsSave): NonNullable<SeasonMomentsSave['tally']> {
  const t = s.tally ?? { seasons: 0, moments: 0, stars: 0 };
  const stars = s.m.reduce((n, e) => n + (e[2] > 0 ? e[2] : 0), 0);
  return {
    seasons: Math.min(TALLY_MAX.seasons, t.seasons + (s.m.length > 0 ? 1 : 0)),
    moments: Math.min(TALLY_MAX.moments, t.moments + s.m.length),
    stars: Math.min(TALLY_MAX.stars, t.stars + stars),
  };
}

/** The career's count of moments, this season's included. */
export function momentsTally(save: SeasonMomentsSave | null | undefined): { seasons: number; moments: number; stars: number } {
  const s = readSeasonMoments(save);
  return s ? folded(s) : { seasons: 0, moments: 0, stars: 0 };
}

const packed = (input: readonly number[]) => input.slice(0, ENTRY_MAX - ENTRY_MIN).map(v => (Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0));

/** Write one moment's entry and return the new ledger (the old one is never
 *  changed). A ledger for another season is folded into the tally and a fresh
 *  one starts; its unbanked stars never bank late. An entry already there is
 *  only ever completed (used, then its result): a settled one is kept, so an
 *  attempt cannot be taken twice. */
export function ledgerPut(save: SeasonMomentsSave | null | undefined, key: string, md: number, moment: number, result: number, input: readonly number[]): SeasonMomentsSave {
  const prev = readSeasonMoments(save);
  const entry = [md, moment, result, ...packed(input)];
  if (!prev || prev.key !== key) {
    const out: SeasonMomentsSave = { v: 1, key, m: [entry] };
    if (prev) out.tally = folded(prev);
    return out;
  }
  const at = prev.m.findIndex(e => e[0] === md && e[1] === moment);
  if (at >= 0) {
    if (prev.m[at][2] !== -1 || result < 0) return prev;
    return { ...prev, m: prev.m.map((e, i) => (i === at ? entry : e)) };
  }
  if (prev.m.length >= LEDGER_MAX) return prev;
  return { ...prev, m: [...prev.m, entry] };
}

/** The same ledger marked as banked (once a season). `paid` is what the bank
 *  added to next season's growth, in the season that started in `year`. */
export function ledgerBanked(save: SeasonMomentsSave, year = 0, paid = 0): SeasonMomentsSave {
  const out: SeasonMomentsSave = { ...save, banked: 1 };
  if (isInt(year, 0, YEAR_MAX) && isInt(paid, 1, PAID_MAX)) out.paid = [year, paid];
  else delete out.paid;
  return out;
}

/** What this season's moments already put into next season's growth: the
 *  points banked in the season that started in `year`, and nothing for any
 *  other season (that growth has landed) or for a ledger the reader refuses. */
export function momentsPaid(save: unknown, year: number): number {
  const s = readSeasonMoments(save);
  return s && s.banked === 1 && s.paid && s.paid[0] === year ? s.paid[1] : 0;
}

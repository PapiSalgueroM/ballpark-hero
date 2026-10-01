/**
 * Round 824: season stat lines, leaders and awards for the front office sims,
 * shared.
 *
 * The NBA board is the first to keep player lines (src/lib/nbaSeasonStats.ts
 * is its box score and its award rules). What does not depend on the sport
 * lives here, so the NFL, MLB and NHL boards can keep lines the same way when
 * their turn comes: a line's shape, the per game read, the games a man must
 * play to qualify, a traded man's lines summed into one season, the leaders
 * table, the award pick with its tie break, and the two helpers a box score
 * needs to stay honest, an exact integer split and a generator seeded from
 * the draw that decided the game. Pure, no imports, so the harness bundles it
 * as it is.
 *
 * Every line in a save is that save's simulated season. Rosters may carry
 * real names, so nothing built on these lines may present them as real
 * statistics or put words in anybody's mouth.
 */

/** One man's season for one club, as totals. A man traded mid season has a line per club. */
export interface FoStatLine {
  id: string;
  name: string;
  team: string;
  pos: string;
  /** Games he got on the floor, and the ones he started. */
  g: number;
  gs: number;
  /** Season totals by column, e.g. { pts, reb, ast }. */
  tot: Record<string, number>;
  /** Drafted in this league and in his first season. */
  rookie?: boolean;
}

/** A club's games and its points for and against. */
export interface FoTeamTotals { g: number; pts: number; opp: number }

/** A season's lines, keyed `${team}|${id}`, and its club totals. */
export interface FoSeasonStats {
  season: number;
  lines: Record<string, FoStatLine>;
  teams: Record<string, FoTeamTotals>;
}

export function foNewSeasonStats(season: number): FoSeasonStats {
  return { season, lines: {}, teams: {} };
}

/** Totals over games, to one decimal. Zero for a man with no games. */
export function foPerGame(line: Pick<FoStatLine, 'g' | 'tot'>, col: string): number {
  return line.g > 0 ? Math.round(((line.tot[col] ?? 0) / line.g) * 10) / 10 : 0;
}

/**
 * Split `total` into whole numbers in proportion to `weights`, summing to
 * exactly `total`: floor every share, then hand the units left over to the
 * largest remainders, the earlier index first on a tie. Deterministic, so the
 * randomness lives in the weights the caller passes.
 */
export function foSplit(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const t = Math.max(0, Math.round(total));
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (sum <= 0) {
    const even = weights.map(() => Math.floor(t / n));
    const spare = t - Math.floor(t / n) * n;
    for (let i = 0; i < spare; i += 1) even[i] += 1;
    return even;
  }
  const raw = weights.map(w => (Math.max(0, w) / sum) * t);
  const out = raw.map(Math.floor);
  let left = t - out.reduce((s, x) => s + x, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % n, left -= 1) out[order[k].i] += 1;
  return out;
}

/**
 * A generator seeded from the draw that decided a game (a number in [0, 1))
 * and a salt that tells the games of one period apart. The box score reads
 * its numbers from here, so it never takes a draw from the league's own
 * generator: the results, the injuries and everything after them come out
 * exactly as they did before lines were kept.
 */
export function foBoxRng(draw: number, salt: number): () => number {
  let s = (Math.floor(draw * 4294967296) ^ Math.imul(salt | 0, 2654435761)) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** One man's season with every club he played for summed, on the club he played most games for. */
export interface FoSeasonPlayer extends FoStatLine {
  /** Every club he played for, most games first. */
  teams: string[];
}

export function foSeasonPlayers(stats: FoSeasonStats): FoSeasonPlayer[] {
  const byId = new Map<string, FoStatLine[]>();
  for (const l of Object.values(stats.lines)) {
    if (l.g <= 0) continue;
    const list = byId.get(l.id) ?? [];
    list.push(l);
    byId.set(l.id, list);
  }
  const out: FoSeasonPlayer[] = [];
  for (const list of byId.values()) {
    const sorted = [...list].sort((a, b) => b.g - a.g || a.team.localeCompare(b.team));
    const tot: Record<string, number> = {};
    for (const l of sorted) for (const [k, v] of Object.entries(l.tot)) tot[k] = (tot[k] ?? 0) + v;
    out.push({
      ...sorted[0],
      g: sorted.reduce((s, l) => s + l.g, 0),
      gs: sorted.reduce((s, l) => s + l.gs, 0),
      tot,
      rookie: sorted.some(l => l.rookie),
      teams: sorted.map(l => l.team),
    });
  }
  return out;
}

/**
 * The games a man must play to qualify for a leaders table or an award:
 * `share` of an average club's games, rounded up. The NBA board passes four
 * in five.
 */
export function foMinGames(stats: FoSeasonStats, share: number): number {
  const clubs = Object.values(stats.teams);
  if (!clubs.length) return 1;
  const avg = clubs.reduce((s, t) => s + t.g, 0) / clubs.length;
  return Math.max(1, Math.ceil(avg * share));
}

/** The best `n` qualified men by one column per game, ties to more games then id. */
export function foLeaders(players: FoSeasonPlayer[], col: string, n: number, minGames: number): FoSeasonPlayer[] {
  return players
    .filter(p => p.g >= minGames)
    .sort((a, b) => foPerGame(b, col) - foPerGame(a, col) || b.g - a.g || a.id.localeCompare(b.id))
    .slice(0, n);
}

/**
 * The man with the highest score among `pool`, or null when the pool is
 * empty. Ties go to more games, then to the id, so the same season always
 * names the same man. The score is the award's stated rule.
 */
export function foPickAward<T extends FoStatLine>(pool: T[], score: (p: T) => number): T | null {
  return foRankAward(pool, score)[0] ?? null;
}

/** The pool ordered by the award's rule, best first, with the same tie break. */
export function foRankAward<T extends FoStatLine>(pool: T[], score: (p: T) => number): T[] {
  return pool
    .map(p => ({ p, s: Math.round(score(p) * 1000) / 1000 }))
    .sort((a, b) => b.s - a.s || b.p.g - a.p.g || a.p.id.localeCompare(b.p.id))
    .map(x => x.p);
}

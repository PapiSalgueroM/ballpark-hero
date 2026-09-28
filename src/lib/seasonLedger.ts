/**
 * Round 647: one season ledger for the four front offices (NFL, NBA, MLB,
 * NHL) and the two dynasties (CFB, CBB).
 *
 * WHAT WAS WRONG. All six boards recorded through the same line:
 *
 *   useGameCompletion(slug, wonTitleNow, titles * 100 + seasonsPlayed * 5)
 *
 * Three defects, found by the 2026-09-19 points audit and all in that line.
 *
 *  1. Only a title season recorded anything. The completion fired on
 *     wonTitleNow, so a 14-3 season that lost the conference final, or a
 *     Cinderella run to the Final Four, was worth exactly nothing, while
 *     a first round exit after a title season had already been paid for.
 *  2. Every title re-scored the whole history. The number was cumulative,
 *     so the second title recorded 200 plus 5 a season, the third 300 plus,
 *     and each ring paid for every ring before it again.
 *  3. The team picked decided the number. Titles were the only input, and
 *     the roster the pick hands you decides most of those.
 *
 * THE FIRST FIX DID NOT FIX THE THIRD. It scored the season's record and
 * its postseason and nothing else, and called that "the team is never
 * scored". It was scored anyway, through the results: measured hands off
 * (nobody touching anything), the correlation between a team's opening
 * roster strength and its season score was 0.77 in CFB, 0.90 in CBB and
 * 0.70 in the NFL. Duke averaged 84 and Butler 6 for doing exactly nothing.
 * Its fence could not see it, because it only proved that two teams with
 * IDENTICAL results scored the same, which the old titles rule passed too.
 *
 * WHAT THIS IS. Every closed season is scored against its own projection.
 * When the season's decisions open (at the pick, then after each offseason
 * in a front office and when the recruiting trail opens in a dynasty) the
 * board projects the season from the roster strengths the engine itself
 * simulates with, through the engine's own win curve and the sport's own
 * postseason shape (projectSeason, below). The season then scores
 *
 *   PAR + (what happened) - (what the projection expected)
 *
 * where both sides are counted in the same two terms:
 *
 *   form      0..W_FORM     regular season wins over regular season games
 *   ladder    0..W_TITLE    the ROUND REACHED in the postseason: in the
 *                           field, each round further, the final, the title
 *
 * so a team that does what its roster was expected to do scores PAR
 * whichever team it is, and the pick stops deciding the number. What still
 * moves it is everything after the projection: the signings, the trades,
 * the cuts, the recruiting class, and how the season fell. A better managed
 * season on the same roster outscores a worse one, because the projection
 * does not move with what you do after it.
 *
 * Measured in scripts/simSeasonLedger.mjs over hands off careers in all six
 * engines, the correlation between opening roster strength and season score
 * falls from 0.70 to 0.90 to near zero; the bound it holds, and the managed
 * against neglected margin it requires, are set from its own measured runs.
 *
 * THE LADDER COUNTS THE ROUND REACHED, NOT GAMES WON. The first version
 * counted wins, so a bye seed that went out in its first game (the CFB
 * quarterfinal, the NFL divisional round, the MLB division series) was paid
 * less than a lower seed that won a game and went out in the same round.
 * stageOf reads the round each game or series belongs to from the sport's
 * own round names, and a bye seed that loses in round two is at round two.
 *
 * THE FORM TERM IS THE REGULAR SEASON ONLY. CFB counts the conference title
 * game in its win and loss columns, so the first version paid an 11-1 team
 * that lost that game less than an 11-1 team that never reached it.
 * cfbSeasonResult reads the twelve game regular season.
 *
 * THE CEILING IS 100 (seasonCeiling, which Round 646 sets each of the six
 * game_score_caps rows to). A season that beats its projection by PAR or
 * more reaches it: an underdog's title does, a favourite's perfect season
 * does not always, because a favourite was expected to win.
 *
 * OLDER SAVES. A save written before this round has no ledger. It opens
 * with an empty one and earns no retroactive points: titles and
 * seasonsPlayed stay as they were for the recap, the next season the player
 * closes is the first row, and the recap labels the ledger sum as counted
 * since that season rather than as the career. A save with no projection
 * is projected from the league as it loads, the way the owner's mandate is.
 *
 * Pure: no clock, no Math.random (the projection draws from its own seeded
 * generator), no storage, no imports.
 */

/** A team as the projection reads it: the strength the engine simulates with. */
export interface ProjectionTeam {
  id: string;
  /** The conference or league the sport seeds and schedules by. */
  group: string;
  /** The division inside it, for a sport whose bracket reads divisions. */
  division?: string;
  strength: number;
}

/** A sport's season, as the projection plays it. Each engine exports its own. */
export interface SeasonFormat {
  /** The engine's win curve: p = 1 / (1 + 10^(-gap / winScale)). */
  winScale: number;
  /** Regular season games a team plays, on average. */
  games: number;
  /** The spread (standard deviation) of that count between teams: 0 for a
      fixed schedule, and the engine's own for one that draws its games. */
  gamesSpread: number;
  /** Of those, how many are against the team's own group. */
  groupGames: number;
  /** 'group': each group seeds its own bracket and the group winners meet
      in the final. 'league': one national field. */
  bracket: 'group' | 'league';
  /** Teams in the field: per group, or in the whole league. A field short
      of a power of two gives its top seeds byes into round two. */
  field: number;
  /** After round one, the best seed left meets the worst (NFL, CBB), rather
      than the bracket sheet deciding the pairs. */
  reseed: boolean;
  /** A league field that takes each group's best record first. */
  autoBids: boolean;
  /** How a group bracket reads divisions. 'none': seeded on record alone.
      'winners': each division's best record is in and seeded first (NFL,
      MLB). 'sheet': each division's top three plus the group's two best
      left, drawn inside the divisions, winner against a wild card and two
      against three (NHL). */
  divisions: 'none' | 'winners' | 'sheet';
  /** Wins needed to take each round, round one first, the final last. */
  winsToAdvance: readonly number[];
}

/** What the projection expected of one team's season. */
export interface SeasonExpectation {
  /** The season it was made for. A save's projection for another season is stale. */
  season: number;
  /** Expected share of regular season games won, 0..1. */
  share: number;
  /** Expected ladder points, 0..W_TITLE. */
  ladder: number;
}

/** What one season produced, as the score reads it. */
export interface SeasonResult {
  /** The season's year, the key a ledger refuses a second row for. */
  season: number;
  /** The team run that season. Carried for the recap, never scored. */
  team: string;
  /** Regular season wins and games. Postseason games are not in either. */
  wins: number;
  games: number;
  /** Rounds in the sport's bracket, the final included. */
  rounds: number;
  /** The round reached: 0 not in the field, 1..rounds the round the season
      ended in (a bye seed starts in round two), rounds + 1 won it all. */
  stage: number;
}

export interface SeasonRow extends SeasonResult {
  /** The projection this row was scored against. */
  expShare: number;
  expLadder: number;
  score: number;
}

/** Regular season form: your wins as a share of your games. */
export const W_FORM = 50;
/** The ladder: in the field, the final, the title. The rounds between the
    field and the final are spread evenly between the first two. */
export const LADDER_FIELD = 10;
export const LADDER_FINAL = 26;
export const W_TITLE = 50;
/** A season that did exactly what its projection expected. */
export const PAR = 50;
/** The most one season can record. */
export const SEASON_CEILING = 100;
/** Seasons the projection plays. Measured: at 300 a team's expected ladder
    moves by under a point between generator seeds. */
export const PROJECTION_RUNS = 300;
/** Past this many games a season's win total is drawn in one step. */
const LONG_SEASON = 40;

const int = (n: unknown, lo: number, hi: number): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
};
const num = (n: unknown, lo: number, hi: number): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
};

/** Ladder points for the round reached. */
export function ladderPoints(stage: number, rounds: number): number {
  const R = Math.max(1, int(rounds, 1, 20));
  const s = int(stage, 0, R + 1);
  if (s <= 0) return 0;
  if (s > R) return W_TITLE;
  if (R === 1) return LADDER_FINAL;
  return LADDER_FIELD + (LADDER_FINAL - LADDER_FIELD) * (s - 1) / (R - 1);
}

/** What the season delivered, in the projection's units: form plus ladder. */
export function seasonValue(r: Pick<SeasonResult, 'wins' | 'games' | 'rounds' | 'stage'>): number {
  const games = Math.max(1, int(r.games, 1, 500));
  const wins = Math.min(games, int(r.wins, 0, 500));
  return W_FORM * (wins / games) + ladderPoints(r.stage, r.rounds);
}

/**
 * The season's score, 0..SEASON_CEILING: PAR plus how far the season beat
 * its projection. Reads the record, the round reached and the projection,
 * and nothing else: not r.team, not r.season.
 */
export function scoreSeason(r: SeasonResult, exp: Pick<SeasonExpectation, 'share' | 'ladder'>): number {
  const actual = seasonValue(r);
  const expected = W_FORM * num(exp.share, 0, 1) + num(exp.ladder, 0, W_TITLE);
  return int(PAR + actual - expected, 0, SEASON_CEILING);
}

/** The number Round 646's cap fence reads for all six games. */
export function seasonCeiling(): number {
  return SEASON_CEILING;
}

/**
 * The round a postseason ended in, from the games or series the sport
 * played. roundOf names the round each one belongs to (0 for a game that
 * is not in the bracket, a play-in). The round reached is the latest round
 * the team appears in, so a bye seed that loses its first game is at round
 * two, level with the lower seed that won round one and lost there too.
 */
export function stageOf(
  games: readonly { name: string; home: string; away: string; winner: string }[],
  team: string, roundOf: (name: string) => number, rounds: number, champion: string,
): number {
  if (champion === team) return rounds + 1;
  let stage = 0;
  for (const g of games) {
    if (g.home !== team && g.away !== team) continue;
    const r = roundOf(g.name);
    if (r > stage) stage = r;
  }
  return Math.min(stage, rounds);
}

/**
 * A closed season as the ledger reads it: the regular season record the
 * engine hands over, and the round reached, read off the postseason the
 * engine played with the sport's own round names.
 */
export function seasonResultOf(
  season: number, team: string, record: { wins: number; games: number },
  post: { games: readonly { name: string; home: string; away: string; winner: string }[]; champion: string },
  shape: { rounds: number; roundOf: (name: string) => number },
): SeasonResult {
  return {
    season, team, wins: record.wins, games: record.games, rounds: shape.rounds,
    stage: stageOf(post.games, team, shape.roundOf, shape.rounds, post.champion),
  };
}

/* The standard bracket sheet: seed indexes in draw order, so neighbours
   meet in round one (0 plays size - 1, and so on) and the top seeds sit in
   opposite halves. */
function bracketOrder(size: number): number[] {
  let order = [0];
  while (order.length < size) {
    const m = order.length * 2;
    order = order.flatMap(s => [s, m - 1 - s]);
  }
  return order;
}

/* A small seeded generator (mulberry32), so a projection is the same
   number every time it is made from the same league. */
function seeded(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Project a season from the league's strengths: PROJECTION_RUNS seasons
 * played on the engine's own win curve, the sport's schedule split and its
 * bracket, and every team's expected form and ladder read off them. The
 * same league and season give the same projection every time.
 */
export function projectSeason(teams: readonly ProjectionTeam[], f: SeasonFormat, season: number): Map<string, SeasonExpectation> {
  const n = teams.length;
  const out = new Map<string, SeasonExpectation>();
  if (n < 2) {
    for (const t of teams) out.set(t.id, { season, share: 0.5, ladder: 0 });
    return out;
  }
  const rng = seeded(int(season, 0, 9999) * 7919 + n);
  const s = teams.map(t => (Number.isFinite(t.strength) ? t.strength : 0));
  const scale = f.winScale > 0 ? f.winScale : 10;
  const p = (i: number, j: number) => 1 / (1 + Math.pow(10, -(s[i] - s[j]) / scale));
  const P: number[][] = s.map((_, i) => s.map((__, j) => p(i, j)));
  const groupNames = [...new Set(teams.map(t => t.group))];
  const groups = groupNames.map(g => teams.map((t, i) => (t.group === g ? i : -1)).filter(i => i >= 0));
  const groupOf = teams.map(t => groupNames.indexOf(t.group));
  const everyone = teams.map((_, i) => i);
  const R = Math.max(1, f.winsToAdvance.length);
  const games = Math.max(1, Math.round(f.games));
  const groupGames = Math.max(0, Math.min(games, Math.round(f.groupGames)));
  /* The engines draw each opponent at random from a pool (the league, or
     the conference and then the rest), so a game is won with the pool's
     mean win probability. Each team's two means, computed once. */
  const meanP = (i: number, pool: number[]): number => {
    const others = pool.filter(j => j !== i);
    const use = others.length ? others : everyone.filter(j => j !== i);
    return use.reduce((a, j) => a + P[i][j], 0) / use.length;
  };
  const pIn = teams.map((_, i) => meanP(i, groups[groupOf[i]]));
  const pOut = teams.map((_, i) => meanP(i, groupGames > 0 ? everyone.filter(j => groupOf[j] !== groupOf[i]) : everyone));

  const spread = Math.max(0, Number.isFinite(f.gamesSpread) ? f.gamesSpread : 0);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

  const shareSum = new Array(n).fill(0);
  const ladderSum = new Array(n).fill(0);
  const wins = new Array(n).fill(0);
  const played = new Array(n).fill(games);
  const stage = new Array(n).fill(0);
  const byRecord = (a: number, b: number) => wins[b] - wins[a] || s[b] - s[a] || a - b;
  const series = (a: number, b: number, need: number): number => {
    let wa = 0, wb = 0;
    const pa = P[a][b];
    while (wa < need && wb < need) { if (rng() < pa) wa += 1; else wb += 1; }
    return wa === need ? a : b;
  };
  const divisionsOf = (g: number[]): number[][] => {
    const names = [...new Set(g.map(i => teams[i].division ?? ''))];
    return names.map(d => g.filter(i => (teams[i].division ?? '') === d));
  };
  /* The round one sheet for one bracket, seeds best first: -1 is an empty
     line, so the seed drawn against it has a bye. */
  const sheetFor = (g: number[], size: number): { seeds: number[]; sheet: number[] } => {
    if (f.divisions === 'sheet') {
      const divs = divisionsOf(g).map(d => [...d].sort(byRecord));
      const top3 = new Set(divs.flatMap(d => d.slice(0, 3)));
      const wilds = g.filter(i => !top3.has(i)).sort(byRecord).slice(0, 2);
      const winners = divs.map(d => d[0]).sort(byRecord);
      const wcFor = new Map(winners.map((w, k) => [w, wilds[winners.length - 1 - k] ?? -1]));
      const sheet = divs.flatMap(d => [d[0], wcFor.get(d[0]) ?? -1, d[1] ?? -1, d[2] ?? -1]);
      const seeds = sheet.filter(i => i >= 0).sort(byRecord);
      return { seeds, sheet };
    }
    let seeds: number[];
    if (f.divisions === 'winners') {
      const winners = divisionsOf(g).map(d => [...d].sort(byRecord)[0]).sort(byRecord);
      seeds = [...winners, ...g.filter(i => !winners.includes(i)).sort(byRecord)].slice(0, Math.min(size, g.length));
    } else {
      seeds = [...g].sort(byRecord).slice(0, Math.min(size, g.length));
    }
    let pow = 1;
    while (pow < seeds.length) pow *= 2;
    return { seeds, sheet: bracketOrder(pow).map(k => (k < seeds.length ? seeds[k] : -1)) };
  };
  /* One bracket, played from its round one sheet; returns the team left
     standing. A seed drawn against an empty line has a bye and starts in
     round two. After round one a reseeding sport pairs the best seed left
     with the worst; the others keep the sheet. */
  const playBracket = (g: number[], size: number): number => {
    const { seeds, sheet } = sheetFor(g, size);
    const seedRank = new Map(seeds.map((t, i) => [t, i]));
    let slots = sheet;
    for (const t of seeds) stage[t] = 1;
    for (let round = 1; slots.length > 1; round += 1) {
      const next: number[] = [];
      for (let i = 0; i < slots.length; i += 2) {
        const a = slots[i], b = slots[i + 1];
        const w = b < 0 ? a : a < 0 ? b : series(a, b, f.winsToAdvance[round - 1] ?? 1);
        if (w >= 0) stage[w] = round + 1;
        next.push(w);
      }
      if (f.reseed) {
        const alive = next.filter(t => t >= 0).sort((x, y) => seedRank.get(x)! - seedRank.get(y)!);
        slots = [];
        for (let i = 0; i < alive.length / 2; i += 1) slots.push(alive[i], alive[alive.length - 1 - i]);
        if (alive.length === 1) slots = alive;
      } else {
        slots = next;
      }
    }
    return slots[0];
  };

  for (let run = 0; run < PROJECTION_RUNS; run += 1) {
    for (let i = 0; i < n; i += 1) {
      let w = 0;
      let gp = games;
      if (games > LONG_SEASON) {
        /* A long season's games and wins, each drawn at once from the normal
           curve with the same mean and spread as game by game (Box and
           Muller). Standings rank raw wins, so a team that drew more games
           ranks higher on them, which is why the count is drawn too. */
        gp = Math.max(1, Math.round(games + spread * normal()));
        const inG = Math.round(gp * groupGames / games);
        const mu = inG * pIn[i] + (gp - inG) * pOut[i];
        const v = inG * pIn[i] * (1 - pIn[i]) + (gp - inG) * pOut[i] * (1 - pOut[i]);
        w = Math.max(0, Math.min(gp, Math.round(mu + Math.sqrt(v) * normal())));
      } else {
        for (let g = 0; g < games; g += 1) if (rng() < (g < groupGames ? pIn[i] : pOut[i])) w += 1;
      }
      wins[i] = w;
      played[i] = gp;
      stage[i] = 0;
    }
    if (f.bracket === 'group') {
      const champs = groups.map(g => playBracket(g, f.field));
      if (champs.length >= 2) {
        const w = series(champs[0], champs[1], f.winsToAdvance[R - 1] ?? 1);
        stage[w] = R + 1;
      } else if (champs.length === 1) {
        stage[champs[0]] = R + 1;
      }
    } else {
      const field: number[] = [];
      if (f.autoBids) for (const g of groups) field.push([...g].sort(byRecord)[0]);
      for (const i of [...everyone].sort(byRecord)) {
        if (field.length >= Math.min(f.field, n)) break;
        if (!field.includes(i)) field.push(i);
      }
      const champ = playBracket(field, field.length);
      stage[champ] = R + 1;
    }
    for (let i = 0; i < n; i += 1) {
      shareSum[i] += wins[i] / played[i];
      ladderSum[i] += ladderPoints(stage[i], R);
    }
  }
  teams.forEach((t, i) => out.set(t.id, {
    season,
    share: shareSum[i] / PROJECTION_RUNS,
    ladder: ladderSum[i] / PROJECTION_RUNS,
  }));
  return out;
}

/** One team's projection, or a flat one if the team is not in the league. */
export function projectionFor(teams: readonly ProjectionTeam[], f: SeasonFormat, season: number, team: string): SeasonExpectation {
  return projectSeason(teams, f, season).get(team) ?? { season, share: 0.5, ladder: 0 };
}

/** A save's projection, cleaned; null when it is missing, malformed or for another season. */
export function expectationOf(raw: unknown, season: number): SeasonExpectation | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Number.isFinite(o.season) || !Number.isFinite(o.share) || !Number.isFinite(o.ladder)) return null;
  if (int(o.season, 0, 9999) !== season) return null;
  return { season, share: num(o.share, 0, 1), ladder: num(o.ladder, 0, W_TITLE) };
}

/**
 * A save's ledger, cleaned. Anything that is not an array of rows with a
 * season and a score comes back EMPTY, which is what a save from before
 * this round gets: no rows, no retroactive points. A stored score is kept
 * as stored (clamped to the ceiling), not recomputed, because the ledger is
 * a record of what was recorded and a weight change must not re-date it.
 */
export function ledgerOf(raw: unknown): SeasonRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: SeasonRow[] = [];
  for (const e of raw.slice(0, 500)) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (!Number.isFinite(o.season) || !Number.isFinite(o.score)) continue;
    const rounds = int(o.rounds, 1, 20);
    rows.push({
      season: int(o.season, 0, 9999),
      team: typeof o.team === 'string' ? o.team : '',
      wins: int(o.wins, 0, 500),
      games: int(o.games, 0, 500),
      rounds,
      stage: int(o.stage, 0, rounds + 1),
      expShare: num(o.expShare, 0, 1),
      expLadder: num(o.expLadder, 0, W_TITLE),
      score: int(o.score, 0, SEASON_CEILING),
    });
  }
  return rows;
}

/**
 * Close a season into the ledger against its projection. Returns the new
 * ledger and the row it added, or the SAME ledger and null when a row for
 * that season is already there: a replayed final week, a double click, a
 * stale recap restored and played again. That refusal is what "replaying a
 * title adds nothing" rests on when a board's own closed season guard is
 * not in the way.
 */
export function appendSeason(ledger: SeasonRow[], r: SeasonResult, exp: Pick<SeasonExpectation, 'share' | 'ladder'>): { ledger: SeasonRow[]; row: SeasonRow | null } {
  if (ledger.some(x => x.season === r.season)) return { ledger, row: null };
  const row: SeasonRow = { ...r, expShare: num(exp.share, 0, 1), expLadder: num(exp.ladder, 0, W_TITLE), score: scoreSeason(r, exp) };
  return { ledger: [...ledger, row], row };
}

/** The recorded total of every row in the ledger. */
export function ledgerTotal(ledger: SeasonRow[]): number {
  return ledger.reduce((n, r) => n + int(r.score, 0, SEASON_CEILING), 0);
}

/** The row for a given season, for the recap after a reload. */
export function ledgerRow(ledger: SeasonRow[], season: number): SeasonRow | null {
  return ledger.find(r => r.season === season) ?? null;
}

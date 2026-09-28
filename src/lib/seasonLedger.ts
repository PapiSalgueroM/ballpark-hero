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
 * THE SECOND VERSION PAID A SEASON NOBODY TOUCHED HALF THE CEILING. It
 * scored PAR (50) plus the season's value minus the projection's, so a
 * season that did exactly what its roster does paid 50 of 100, against
 * Round 645's rule that zero skill pays at most 5 percent of a perfect run.
 * The pick still moved what the economy paid through the spread (a
 * favourite's seasons swing further on the ladder, so its best of ten idle
 * seasons paid more) and the ceiling (a favourite's perfect season often
 * paid under the cap). And the projection was made after the offseason, so a
 * GM could cut his best men before the whistle, let it see the thin roster,
 * and sign them back.
 *
 * WHAT THIS IS. Every closed season is scored against its own projection,
 * and only for what beats it. A season's value is counted in two terms:
 *
 *   form      0..W_FORM     regular season wins over regular season games
 *   ladder    0..W_TITLE    the ROUND REACHED in the postseason: in the
 *                           field, each round further, the final, the title
 *
 * The projection plays the season PROJECTION_RUNS times from the roster
 * strengths the engine itself simulates with, through the engine's own win
 * curve and the sport's own postseason shape (projectionRuns, below). Its
 * bar is the season BAR_SHARE (95 percent) of those reach or fall short of.
 * A season at or under the bar scores 0. Past it, the season scores the
 * share of the headroom above the bar it won, where the headroom is the
 * projection's own seasons past the bar: beating half of them pays half the
 * ceiling, beating all of them pays all of it (a season level with some
 * counts them half).
 *
 * That is the headroom normalised in the one unit every pick shares: the
 * projection's own seasons. A season left alone lands anywhere in its
 * projection with the same odds whoever the pick is, so it scores more than
 * 0 about one year in twenty and 2.5 on average whatever the roster, and
 * its best of ten is the same for Duke and for Butler. A favourite's
 * ceiling and an underdog's pay the same for the same share of headroom
 * won. Measured in points instead (the value past the bar over the value
 * left above it), a favourite's small headroom made its lucky seasons pay
 * more; that version is the "value" negative control.
 *
 * WHEN IT IS PROJECTED. The first season at the pick. Every season after it
 * at the close of the one before (projectNext), from the league as that
 * regular season finished it, carried through the offseason a GM who
 * touches nothing gets: seasonFormats.ts plays it on copies of the league
 * (in a front office the draft cannot be skipped, so the untouched GM takes
 * the first name on the board at every pick; a dynasty coach signs nobody),
 * every man the GM cut that season counted as his. Nothing done after the
 * close moves it, so the draft past the board's first names, the signings,
 * the trades and the recruiting class are what beat it, and cutting a man
 * and signing him back gains nothing. All six boards project at that same
 * moment.
 *
 * THE LIMIT IT CANNOT HELP. The value is capped at a perfect season (every
 * regular season game and the title). A college program strong enough to
 * go perfect in more than one of its projected seasons in ten can never
 * beat its own bar by much: its perfect season ties the projection's and
 * scores the share of the headroom that leaves, and at one in ten or more
 * it scores 0. Paying it the ceiling anyway would pay those programs for
 * seasons they have left alone, which is the defect this round removes.
 * scripts/simSeasonLedger.mjs prints how many picks that is.
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
 * game_score_caps rows to): a season past every season its projection
 * played.
 *
 * OLDER SAVES. A save written before this round has no ledger. It opens
 * with an empty one and earns no retroactive points: titles and
 * seasonsPlayed stay as they were for the recap, the next season the player
 * closes is the first row, and the recap labels the ledger sum as counted
 * since that season rather than as the career. A save with no projection
 * is projected as it loads, the way the owner's mandate is: mid season from
 * the league as it stands, and after a close through projectNext.
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
  /** The round the projection's middle season ends in (its median stage). */
  stage: number;
  /** How many seasons the projection played. */
  runs: number;
  /** How many of them fell short of the bar. */
  below: number;
  /** The season values of the rest, ascending: the bar (the value BAR_SHARE
      of the projection's seasons reach or fall short of, with every season
      level with it) and every one above it. A season scores by the share of
      the projection's seasons it beat, from the bar up. */
  top: number[];
  /** The bar season itself, its win share and its round, for the recap. */
  barShare: number;
  barStage: number;
}

/** One projected season for one team. */
export interface ProjectionRun {
  share: number;
  stage: number;
  /** seasonValue of that run. */
  value: number;
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
  /** The projection this row was scored against: its expected win share and
      middle round, and its bar (the value, the win share and the round). */
  expShare: number;
  expStage: number;
  expBar: number;
  barShare: number;
  barStage: number;
  score: number;
}

/** Regular season form: your wins as a share of your games. */
export const W_FORM = 50;
/** The ladder: in the field, the final, the title. The rounds between the
    field and the final are spread evenly between the first two. */
export const LADDER_FIELD = 10;
export const LADDER_FINAL = 26;
export const W_TITLE = 50;
/** The bar: this share of the projection's seasons reach it or fall short,
    so a season left alone scores one year in about seventeen. Set from the
    idle seasons scripts/simSeasonLedger.mjs plays through the real engines. */
export const BAR_SHARE = 0.95;
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

/* Season values are compared at four decimals on both sides, so a season
   equal to a projected one is equal whatever the float noise. */
const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;

/** What the season delivered, in the projection's units: form plus ladder. */
export function seasonValue(r: Pick<SeasonResult, 'wins' | 'games' | 'rounds' | 'stage'>): number {
  const games = Math.max(1, int(r.games, 1, 500));
  const wins = Math.min(games, int(r.wins, 0, 500));
  return round4(W_FORM * (wins / games) + ladderPoints(r.stage, r.rounds));
}

/**
 * The season's score, 0..SEASON_CEILING: the share of the headroom above
 * the bar that the season won, where the headroom is the projection's own
 * seasons past the bar. A season at or under the bar scores 0; one better
 * than every projected season scores the ceiling; one in between scores the
 * share of those best seasons it beat (a tie counts half). Reads the record,
 * the round reached and the projection, and nothing else: not r.team, not
 * r.season.
 */
export function scoreSeason(r: SeasonResult, exp: Pick<SeasonExpectation, 'top' | 'below' | 'runs'>): number {
  return scoreValue(seasonValue(r), exp);
}

/** scoreSeason's arithmetic on a season value, so a harness can score the
    projection's own seasons against it. */
export function scoreValue(value: number, exp: Pick<SeasonExpectation, 'top' | 'below' | 'runs'>): number {
  const top = Array.isArray(exp.top) ? exp.top : [];
  const runs = int(exp.runs, 1, 100000);
  const below = int(exp.below, 0, runs);
  if (!top.length || below + top.length !== runs) return 0;
  const v = round4(value);
  if (v < top[0]) return 0;
  let under = 0;
  let level = 0;
  for (const x of top) { if (x < v) under += 1; else if (x === v) level += 1; }
  /* The share of the projection's seasons this one beat, a tie counting
     half, measured from the bar up: 0 at the bar, the ceiling past them all. */
  const beat = (below + under + level / 2) / runs;
  return int(SEASON_CEILING * (beat - BAR_SHARE) / (1 - BAR_SHARE), 0, SEASON_CEILING);
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
export function projectionRuns(teams: readonly ProjectionTeam[], f: SeasonFormat, season: number, count = PROJECTION_RUNS, salt = 0): Map<string, ProjectionRun[]> {
  const n = teams.length;
  if (n < 2) return new Map(teams.map(t => [t.id, [{ share: 0.5, stage: 0, value: W_FORM * 0.5 }]]));
  const rng = seeded(int(season, 0, 9999) * 7919 + n + int(salt, 0, 1000) * 104729);
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

  const runsOf: ProjectionRun[][] = teams.map(() => []);
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

  const total = int(count, 1, 100000);
  for (let run = 0; run < total; run += 1) {
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
      const share = wins[i] / played[i];
      runsOf[i].push({ share, stage: stage[i], value: round4(W_FORM * share + ladderPoints(stage[i], R)) });
    }
  }
  return new Map(teams.map((t, i) => [t.id, runsOf[i]]));
}

/**
 * What a projection's runs say about one team: the average season (wins
 * and the round most often reached) and the bar, the season value the
 * roster reaches or beats BAR_SHARE of the time left alone.
 */
export function expectationFromRuns(runs: readonly ProjectionRun[], season: number): SeasonExpectation {
  if (!runs.length) return { season, share: 0.5, stage: 0, runs: 1, below: 0, top: [SEASON_CEILING], barShare: 1, barStage: 0 };
  const byValue = [...runs].sort((a, b) => a.value - b.value || a.stage - b.stage || a.share - b.share);
  /* The bar is the run BAR_SHARE of the runs reach or fall short of (the
     epsilon keeps 0.95 * 300 at 285 whichever way the float rounds). Every
     run level with it is kept too, so a tie is counted wherever it falls. */
  const at = Math.max(0, Math.min(byValue.length - 1, Math.ceil(BAR_SHARE * byValue.length - 1e-9) - 1));
  let first = at;
  while (first > 0 && byValue[first - 1].value === byValue[at].value) first -= 1;
  const stages = runs.map(r => r.stage).sort((a, b) => a - b);
  return {
    season,
    share: runs.reduce((a, r) => a + r.share, 0) / runs.length,
    stage: stages[Math.floor((stages.length - 1) / 2)],
    runs: runs.length,
    below: first,
    top: byValue.slice(first).map(r => r.value),
    barShare: byValue[at].share,
    barStage: byValue[at].stage,
  };
}

export function projectSeason(teams: readonly ProjectionTeam[], f: SeasonFormat, season: number): Map<string, SeasonExpectation> {
  const out = new Map<string, SeasonExpectation>();
  for (const [id, runs] of projectionRuns(teams, f, season)) out.set(id, expectationFromRuns(runs, season));
  return out;
}

/** What projectNext needs of a sport: its league as the projection reads it,
    its season, and the offseason an untouched GM gets. seasonFormats.ts has
    one for each of the six. */
export interface OffseasonShape<L> {
  readonly format: SeasonFormat;
  teams: (league: L) => ProjectionTeam[];
  untouched: (league: L, team: string, rng: () => number) => void;
}

/** Offseasons the projection of a next season plays, each on its own copy. */
export const OFFSEASON_SAMPLES = 12;

/**
 * Round 647 fix: the next season's projection, made at the close from the
 * league as the regular season finished it. Each of OFFSEASON_SAMPLES
 * copies plays the offseason a GM who touches nothing gets (the draft's
 * first names where the draft cannot be skipped, the retirements, the
 * development, the walk outs, the refill), and plays the season after it;
 * the runs are pooled. So what that offseason hands every GM for free is in
 * the bar, and everything a GM does past it (a better pick, a signing, a
 * trade, a recruiting class) is not. The league passed in is never touched.
 * Seeded by the season, so the same close gives the same projection.
 */
export function projectNext<L>(shape: OffseasonShape<L>, league: L, team: string, season: number): SeasonExpectation {
  const per = Math.max(1, Math.round(PROJECTION_RUNS / OFFSEASON_SAMPLES));
  const runs: ProjectionRun[] = [];
  for (let k = 0; k < OFFSEASON_SAMPLES; k += 1) {
    const copy = JSON.parse(JSON.stringify(league)) as L;
    shape.untouched(copy, team, seeded(int(season, 0, 9999) * 7919 + k * 104729 + 7));
    runs.push(...(projectionRuns(shape.teams(copy), shape.format, season, per, k + 1).get(team) ?? []));
  }
  return expectationFromRuns(runs, season);
}

/** One team's projection, or a flat one if the team is not in the league. */
export function projectionFor(teams: readonly ProjectionTeam[], f: SeasonFormat, season: number, team: string): SeasonExpectation {
  return projectSeason(teams, f, season).get(team) ?? expectationFromRuns([], season);
}

/**
 * A save's projection, cleaned; null when it is missing, malformed, for
 * another season, or in the shape this round's first version saved (a
 * share and a ladder, no bar), so a board projects it again as it loads.
 */
export function expectationOf(raw: unknown, season: number): SeasonExpectation | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Number.isFinite(o.season) || !Number.isFinite(o.share) || !Number.isFinite(o.runs)) return null;
  if (int(o.season, 0, 9999) !== season) return null;
  const runs = int(o.runs, 1, 100000);
  const top = Array.isArray(o.top) ? o.top : [];
  if (!Number.isFinite(o.below) || int(o.below, 0, runs) + top.length !== runs) return null;
  if (!top.length || !top.every((v, i) => Number.isFinite(v) && (i === 0 || v >= top[i - 1]))) return null;
  return {
    season, share: num(o.share, 0, 1), stage: int(o.stage, 0, 21), runs, below: int(o.below, 0, runs), top: top.map(v => round4(v as number)),
    barShare: num(o.barShare, 0, 1), barStage: int(o.barStage, 0, 21),
  };
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
      expStage: int(o.expStage, 0, rounds + 1),
      expBar: num(o.expBar, 0, SEASON_CEILING),
      barShare: num(o.barShare, 0, 1),
      barStage: int(o.barStage, 0, rounds + 1),
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
export function appendSeason(ledger: SeasonRow[], r: SeasonResult, exp: SeasonExpectation): { ledger: SeasonRow[]; row: SeasonRow | null } {
  if (ledger.some(x => x.season === r.season)) return { ledger, row: null };
  const row: SeasonRow = {
    ...r,
    expShare: num(exp.share, 0, 1), expStage: int(exp.stage, 0, r.rounds + 1),
    expBar: num(exp.top?.[0], 0, SEASON_CEILING), barShare: num(exp.barShare, 0, 1), barStage: int(exp.barStage, 0, r.rounds + 1),
    score: scoreSeason(r, exp),
  };
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

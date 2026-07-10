/**
 * Perfect Season expansion pack (NFL 17-0 + NBA 82-0 only, 2026-07-10).
 *
 * Additive sibling to perfectSeason.ts — the MLB and NHL variants never
 * import this file, so nothing here can shift their behavior. It bundles the
 * three owner-requested upgrades that share tuning:
 *
 * 1. simulateSeasonFair — a rebalanced record curve. The old shared sigmoid
 *    (plus NFL_OVERALL_ADJUST) sent an 84-overall NFL draft to 5-12
 *    ("kinda harsh" — the owner). The new curve maps overall -> expected
 *    wins through the anchor tables below, then plays the season game by
 *    game at p = expected/games. Binomial noise over 17 games is ~±2 wins
 *    and over 82 games ~±5 wins, exactly the randomness band requested.
 * 2. buildPlayoffRun — a simulated postseason bracket for qualifying
 *    records (NFL 12+ of 17, NBA 55+ of 82), with named opponents, a
 *    champion banner, and a Finals/Super Bowl MVP from the drafted stars.
 * 3. buildAnalysis — deterministic post-sim commentary (best pick, weakest
 *    link, identity, a talking-head take, standings framing). No AI calls:
 *    every line derives from drafted ratings + the final record.
 */

import { rng, SimResult, seasonFraming, dailySportSeed } from '@/lib/perfectSeason';

export type ExpansionSport = 'nfl' | 'nba';

const SEASON_GAMES: Record<ExpansionSport, number> = { nfl: 17, nba: 82 };

// ---------------------------------------------------------------------------
// 1. Fairer records: overall -> expected wins
// ---------------------------------------------------------------------------
//
// Anchor points straight from the owner's brief (midpoints of the requested
// ranges), extended below 70 and above 90 so the curve stays sane at the
// extremes. Between anchors the value is linearly interpolated.
//   NFL: 70 -> 4-6 wins, 80 -> 9-11, 85 -> 12-14, 90+ -> 15-17
//   NBA: 70 -> 25-35 wins, 80 -> 45-52, 85 -> 55-62, 90+ -> 65-74
// The top end keeps climbing past the stated 90 anchor so a genuine
// god-tier draft still has a real shot at perfection: at 99 overall the
// per-game p works out to ~0.98 (NFL) / ~0.976 (NBA), which goes unbeaten
// a jackpot-sized (not routine) percent of the time.
const WIN_CURVES: Record<ExpansionSport, [number, number][]> = {
  nfl: [
    [50, 1.5], [60, 3], [70, 5], [75, 7.5], [80, 10], [85, 13],
    [90, 15.5], [95, 16.2], [99, 16.7],
  ],
  nba: [
    [50, 12], [60, 20], [70, 30], [75, 39], [80, 48.5], [85, 58.5],
    [90, 69.5], [95, 75.5], [99, 80],
  ],
};

/** Piecewise-linear expected win total for a drafted overall. */
export function expectedWins(sport: ExpansionSport, overall: number): number {
  const curve = WIN_CURVES[sport];
  if (overall <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i - 1];
    const [x2, y2] = curve[i];
    if (overall <= x2) return y1 + ((overall - x1) / (x2 - x1)) * (y2 - y1);
  }
  return curve[curve.length - 1][1];
}

/**
 * Season sim on the rebalanced curve. Same shape and flavor as the core
 * simulateSeason (deterministic seed, per-game booleans, light momentum so
 * the grid streaks) but the per-game win chance comes from the anchor
 * tables instead of the shared sigmoid. `overall` is the RAW drafted
 * overall — no NFL_OVERALL_ADJUST style offsets.
 */
export function simulateSeasonFair(
  sport: ExpansionSport,
  overall: number,
  games: number,
  seed: number,
): SimResult {
  const rand = rng(seed);
  const target = expectedWins(sport, overall);
  const p = Math.min(0.985, Math.max(0.03, target / games));
  const results: boolean[] = [];
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const momentum = i > 0 ? (results[i - 1] ? 0.004 : -0.006) : 0;
    const win = rand() < Math.min(0.988, p + momentum);
    results.push(win);
    if (win) wins++;
  }
  return {
    wins,
    losses: games - wins,
    games: results,
    perfect: wins === games,
    overall: Math.round(overall),
  };
}

// ---------------------------------------------------------------------------
// 2. Postseason run
// ---------------------------------------------------------------------------

/** Wins needed (of 17 / 82) to reach the simulated postseason. */
export const PLAYOFF_THRESHOLD: Record<ExpansionSport, number> = { nfl: 12, nba: 55 };

export interface PlayoffRound {
  name: string;       // 'Wild Card', 'NBA Finals', ...
  opponent: string;   // plain franchise name
  won: boolean;
  score: string;      // NFL: game score '27-17' (user first); NBA: series '4-2'
}

export interface PlayoffRun {
  rounds: PlayoffRound[];      // stops at the eliminating loss
  champion: boolean;
  mvp: string | null;          // drafted star, champions only
  finalName: string;           // 'Super Bowl' | 'NBA Finals'
  bannerTitle: string;         // 'SUPER BOWL CHAMPIONS' | 'NBA CHAMPIONS'
  mvpTitle: string;            // 'Super Bowl MVP' | 'Finals MVP'
  exitRound: string | null;    // round name where eliminated, null if champion
}

const NFL_FRANCHISES = [
  'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
  'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
  'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
  'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
  'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
  'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
  'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
  'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders',
];

const NBA_FRANCHISES = [
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets',
  'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
  'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat',
  'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
  'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
  'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors',
  'Utah Jazz', 'Washington Wizards',
];

interface RoundDef { name: string; oppMin: number; oppMax: number; }

// Opponent quality escalates by round; ranges tuned (verified by 3k-run
// sims) so a team that scrapes in at the threshold wins the title only a
// few percent of the time, a strong ~90-overall run takes it roughly 1 in
// 3 (NFL) to 2 in 3 (NBA), and a 95+ juggernaut usually rings. NBA rounds
// are best-of-7, which naturally amplifies the favorite on top of the
// higher opponent floors.
const PLAYOFF_ROUNDS: Record<ExpansionSport, RoundDef[]> = {
  nfl: [
    { name: 'Wild Card', oppMin: 79, oppMax: 85 },
    { name: 'Divisional Round', oppMin: 82, oppMax: 88 },
    { name: 'Conference Championship', oppMin: 85, oppMax: 90 },
    { name: 'Super Bowl', oppMin: 87, oppMax: 92 },
  ],
  nba: [
    { name: 'First Round', oppMin: 78, oppMax: 84 },
    { name: 'Conference Semifinals', oppMin: 81, oppMax: 87 },
    { name: 'Conference Finals', oppMin: 84, oppMax: 89 },
    { name: 'NBA Finals', oppMin: 86, oppMax: 91 },
  ],
};

/**
 * Date-stable postseason seed for daily mode: the locked recap replays the
 * exact bracket the live run showed by reusing this seed with the stored
 * overall + wins. XOR keeps it decorrelated from the wheel/sim stream that
 * dailySportSeed already feeds.
 */
export function playoffSeedForDaily(sport: ExpansionSport, dateStr: string): number {
  return (dailySportSeed(sport, dateStr) ^ 0x9e3779b9) >>> 0;
}

/**
 * Simulates the playoff bracket, or returns null when the record misses the
 * threshold. Deterministic for a given (sport, overall, seasonWins, seed):
 * the rng stream never depends on `roster`, which is only consulted at the
 * very end for the MVP pick — so a recap that passes an empty roster still
 * reproduces the identical rounds and champion flag.
 */
export function buildPlayoffRun(
  sport: ExpansionSport,
  overall: number,
  seasonWins: number,
  seed: number,
  roster: { name: string; rating: number }[],
): PlayoffRun | null {
  if (seasonWins < PLAYOFF_THRESHOLD[sport]) return null;
  const rand = rng(seed);

  // A hot regular season carries into January/June: up to +3 effective
  // overall for wins banked past the qualifying line.
  const heatPerWin = sport === 'nfl' ? 0.5 : 0.11;
  const heat = Math.min(3, (seasonWins - PLAYOFF_THRESHOLD[sport]) * heatPerWin);
  const eff = overall + heat;

  const pool = sport === 'nfl' ? NFL_FRANCHISES : NBA_FRANCHISES;
  const opponents: string[] = [];
  while (opponents.length < 4) {
    const name = pool[Math.floor(rand() * pool.length)];
    if (!opponents.includes(name)) opponents.push(name);
  }

  const rounds: PlayoffRound[] = [];
  let alive = true;
  PLAYOFF_ROUNDS[sport].forEach((def, i) => {
    if (!alive) return;
    const oppOvr = def.oppMin + rand() * (def.oppMax - def.oppMin);
    const pGame = 1 / (1 + Math.exp((oppOvr - eff) / 5));
    if (sport === 'nfl') {
      const won = rand() < pGame;
      const winPts = 23 + Math.floor(rand() * 15);
      const losePts = Math.max(3, winPts - (3 + Math.floor(rand() * 18)));
      rounds.push({
        name: def.name,
        opponent: opponents[i],
        won,
        score: won ? `${winPts}-${losePts}` : `${losePts}-${winPts}`,
      });
      alive = won;
    } else {
      let userGames = 0;
      let oppGames = 0;
      while (userGames < 4 && oppGames < 4) {
        if (rand() < pGame) userGames++;
        else oppGames++;
      }
      const won = userGames === 4;
      rounds.push({
        name: def.name,
        opponent: opponents[i],
        won,
        score: `${userGames}-${oppGames}`,
      });
      alive = won;
    }
  });

  const champion = alive;
  let mvp: string | null = null;
  if (champion && roster.length > 0) {
    // MVP leans star-shaped: usually the best-rated draftee, sometimes the
    // second or third banana steals the podium.
    const stars = [...roster].sort((a, b) => b.rating - a.rating).slice(0, 3);
    const r = rand();
    const idx = r < 0.6 ? 0 : r < 0.85 ? 1 : 2;
    mvp = stars[Math.min(idx, stars.length - 1)].name;
  }

  return {
    rounds,
    champion,
    mvp,
    finalName: sport === 'nfl' ? 'Super Bowl' : 'NBA Finals',
    bannerTitle: sport === 'nfl' ? 'SUPER BOWL CHAMPIONS' : 'NBA CHAMPIONS',
    mvpTitle: sport === 'nfl' ? 'Super Bowl MVP' : 'Finals MVP',
    exitRound: champion ? null : rounds[rounds.length - 1].name,
  };
}

// ---------------------------------------------------------------------------
// 3. Post-sim analysis (deterministic, no AI)
// ---------------------------------------------------------------------------

export interface DraftedPickInfo {
  slotKey: string;
  slotLabel: string;
  name: string;
  rating: number;
}

/**
 * 3-5 commentary lines derived purely from the drafted ratings, the final
 * record, and the playoff outcome. Same inputs always produce the same
 * lines (the hot-take pick hashes overall/wins/best rating), so daily
 * recaps stay stable across reloads.
 */
export function buildAnalysis(
  sport: ExpansionSport,
  drafted: DraftedPickInfo[],
  overall: number,
  wins: number,
  losses: number,
  playoff: PlayoffRun | null,
): string[] {
  if (drafted.length === 0) return [];
  const lines: string[] = [];
  const sorted = [...drafted].sort((a, b) => b.rating - a.rating);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const avg = drafted.reduce((s, p) => s + p.rating, 0) / drafted.length;
  const bestDelta = Math.max(0, Math.round(best.rating - avg));
  const worstDelta = Math.max(0, Math.round(avg - worst.rating));

  lines.push(
    `Best pick: ${best.name} (${best.rating} OVR) — ${bestDelta} point${bestDelta === 1 ? '' : 's'} above your roster average. The wheel owed you one.`
  );
  lines.push(
    worstDelta >= 8
      ? `Weakest link: ${worst.name} (${worst.rating} OVR) at ${worst.slotLabel} — ${worstDelta} points under the room. Every opponent circled that matchup.`
      : `Weakest link: ${worst.name} (${worst.rating} OVR) at ${worst.slotLabel} — and honestly, even the weak spot held up.`
  );

  const groupAvg = (keys: string[]): number | null => {
    const group = drafted.filter(p => keys.includes(p.slotKey));
    if (group.length === 0) return null;
    return group.reduce((s, p) => s + p.rating, 0) / group.length;
  };
  if (sport === 'nfl') {
    const air = groupAvg(['QB', 'WR', 'WR2', 'TE']);
    const ground = groupAvg(['RB', 'FLEX']);
    if (air != null && ground != null) {
      lines.push(
        air - ground >= 2.5
          ? 'Identity: air raid. This offense lives through the pass and dares you to keep up.'
          : ground - air >= 2.5
          ? 'Identity: ground and pound. Run first, run second, apologize never.'
          : 'Identity: balanced attack. No tendency for a defense to key on.'
      );
    }
  } else {
    const back = groupAvg(['PG', 'SG']);
    const front = groupAvg(['SF', 'PF', 'C']);
    if (back != null && front != null) {
      lines.push(
        back - front >= 2.5
          ? 'Identity: backcourt-led. The guards run the show and the pace never drops.'
          : front - back >= 2.5
          ? 'Identity: frontcourt muscle. Points in the paint, glass cleaned on both ends.'
          : 'Identity: positionless balance. Five threats, nowhere to hide a defender.'
      );
    }
  }

  const champTakes = [
    `"${best.name} just wrapped the greatest single season ever assembled, and it is not close."`,
    `"Ring secured. ${wins} wins and a parade — start pouring the statue now."`,
    `"I picked against this team in every round, and I have never been happier to be wrong."`,
  ];
  const contenderTakes = [
    `"${wins} wins and no banner. ${best.name} deserves better — someone had to say it."`,
    `"Regular-season royalty, postseason footnote. That is the whole tweet."`,
    `"${best.name} dragged this roster further than it had any right to go."`,
  ];
  const strugglerTakes = [
    `"I blame the ${worst.slotLabel.toLowerCase()} spot. ${worst.name} competed, but the tape does not lie."`,
    `"${best.name} deserved a better supporting cast. The trade-demand clock starts now."`,
    `"You cannot lose ${losses} games with that talent. Unless, apparently, you can."`,
  ];
  const pool = playoff?.champion
    ? champTakes
    : wins >= PLAYOFF_THRESHOLD[sport]
    ? contenderTakes
    : strugglerTakes;
  const take = pool[(Math.round(overall) * 7 + wins * 13 + best.rating) % pool.length];
  lines.push(`Hot take: ${take}`);

  lines.push(seasonFraming(sport, wins, SEASON_GAMES[sport]));
  return lines;
}

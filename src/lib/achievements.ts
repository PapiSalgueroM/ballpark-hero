import { CATEGORIES } from '@/data/gameRegistry';
import { supabase } from '@/integrations/supabase/client';
import { getStreakState, type StreakState } from '@/lib/streaks';
import { getCurrentPlayerName } from '@/lib/completions';

/* Round 527: the achievement case, spec item 16.

   DERIVED AND READ ONLY, and that is the whole design. Nothing in this file
   writes anything: no table, no column, no localStorage key, no hook into the
   recorder. An achievement is a pure test over facts the site ALREADY records,
   evaluated every time the case is opened, so it can never go stale, never
   needs a save field, and can never double count. Rounds 299, 300 and 301
   spent three rounds pulling three scoring pipelines into the one recorder in
   src/lib/completions.ts and then fixing fifteen wrong numbers that came out
   of it. A second writer beside that recorder is how all of it reopens, so
   there is not one. scripts/simAchievements.mjs section 0 reads this file and
   fails if a write verb ever appears in it.

   THE SHAPE IS src/lib/careerBadges.ts, on purpose: a generic definition plus
   a pure predicate over a facts object, with the table doing the talking. What
   is different here is that the case is sitewide rather than per career, so a
   locked one shows how close it is, and a couple of them stay hidden until
   they land.

   EARNED AND PROGRESS CANNOT DISAGREE. Every definition is built by gauge()
   from ONE measure, so "7 out of 10" and "not yet earned" are the same
   sentence read twice. A definition that computed the two separately could
   say 10 out of 10 and still show locked, and nobody would find it for weeks.

   RARITY IS AN EDITORIAL TIER, NOT A MEASURED POPULATION. This site cannot
   compute what share of players hold an achievement: a guest is a browser
   handle and the handle regenerates, so the handle count is not a people
   count. So nothing here prints "0.4% of players", because that number would
   be made up. What the tiers ARE grounded in is this site's own play, read
   off its own tables on 2026-09-11 and written down here so the next person
   can re-measure rather than guess:

     6,970 handles in game_completions over the 73 days since 2026-07-01.
     Finishes per handle: half stop at 7, the top tenth pass 104, the top
       hundredth pass 786, the busiest has 6,440.
     Different games per handle: the top tenth pass 5, the top hundredth pass
       17, the widest has 53.
     Days played per handle: the top hundredth pass 12, the deepest has 43 of
       the 73 available.
     Points, from user_scores' 455 signed in players: half stop at 3,000, the
       top tenth pass 19,965, the top hundredth pass 65,942, the highest is
       100,651.

   So common sits around the median, uncommon around the top tenth, rare above
   the top hundredth, and legendary at or past the best anybody has managed.
   Every threshold below is one of those, and none of them is a number that
   felt about right.

   WHY THERE IS NO "SCORE OF N" ACHIEVEMENT. Measured the same day: of the 123
   games with a saved best score, 19 top out at 20 or less while 2 pass 5,000,
   the highest being 32,000. A score means a different thing in every game, so
   one cross game number would be meaningless in both directions. The case
   counts how many games you have a score saved in instead, which means the
   same thing everywhere. */

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** How close the facts are to an achievement. Whole numbers, same units. */
export interface AchievementProgress {
  have: number;
  need: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  rarity: AchievementRarity;
  /** Hidden ones are not shown, named or described until they are earned. */
  hidden: boolean;
  /** Pure. Same facts in, same answer out, and the facts go in untouched. */
  earned: (f: AchievementFacts) => boolean;
  /** Pure. What to show under a locked tile. */
  progress: (f: AchievementFacts) => AchievementProgress;
}

/* ─── the facts ──────────────────────────────────────────────────────────
   Only what the site already stores, and only what a definition below
   actually reads. Every field here is either a number the Profile page
   already trusts or a count off the player's own completion rows. A fact
   nobody reads is dead weight, and simAchievements proves there are none by
   knocking each field out and watching the earned set move. */

export interface AchievementFacts {
  /** Finished games, lifetime. The local tally and the row count, whichever knows more. */
  totalPlays: number;
  /** Points, lifetime. The signed in total and the local one, whichever knows more. */
  totalPoints: number;
  /** Best run of consecutive days with any game finished. */
  longestStreak: number;
  /** Best run of consecutive days on ONE game. */
  bestGameStreak: number;
  /** Distinct days with at least one finish. A floor, see the row cap below. */
  daysPlayed: number;
  /** Most different games finished inside one day. */
  mostGamesInOneDay: number;
  /** Most different sports finished inside one day. */
  mostSportsInOneDay: number;
  /** Finishes per game slug. */
  playsByGame: Record<string, number>;
  /** Finishes per sport, by registry category title. */
  playsBySport: Record<string, number>;
  /** Saved best score per game slug. */
  bestScoreByGame: Record<string, number>;
  /** How many sports the site actually has. A property of the site, not of the player. */
  totalSports: number;
}

/* ─── pure readers over the facts ──────────────────────────────────────── */

const tally = (r: Record<string, number>): number => Object.keys(r).length;

const highest = (r: Record<string, number>): number => {
  let top = 0;
  for (const v of Object.values(r)) if (v > top) top = v;
  return top;
};

const atLeast = (r: Record<string, number>, n: number): number =>
  Object.values(r).filter(v => v >= n).length;

/* ─── the builder every definition goes through ────────────────────────────
   One measure, two answers, so they cannot drift apart. The need > 0 test is
   load bearing: a need computed from the facts (every sport, say) is 0 when
   the facts are empty, and without this an empty player would wake up holding
   the hardest thing in the case. */
function gauge(
  base: Omit<AchievementDef, 'earned' | 'progress'>,
  measure: (f: AchievementFacts) => AchievementProgress,
): AchievementDef {
  return {
    ...base,
    progress: f => measure(f),
    earned: f => {
      const { have, need } = measure(f);
      return need > 0 && have >= need;
    },
  };
}

/** A definition that is "get this number to that number". */
function rung(
  base: Omit<AchievementDef, 'earned' | 'progress'>,
  count: (f: AchievementFacts) => number,
  need: number,
): AchievementDef {
  return gauge(base, f => ({ have: count(f), need }));
}

/* ─── the case ─────────────────────────────────────────────────────────────
   Order is the order the tiles are considered in, easiest first. Copy is
   written the way somebody would say it out loud, and no line claims a
   number about any real person or any share of players. */

export const ACHIEVEMENTS: AchievementDef[] = [
  /* first step. The one thing a brand new player can hold after one game. */
  rung({ id: 'first-finish', title: 'Off the mark', description: 'Finish your first game.', emoji: '🎬', rarity: 'common', hidden: false },
    f => f.totalPlays, 1),

  /* common: around where half of everybody gets to */
  rung({ id: 'three-games', title: 'Three to your name', description: 'Finish three different games.', emoji: '🗂️', rarity: 'common', hidden: false },
    f => tally(f.playsByGame), 3),
  rung({ id: 'two-sports', title: 'Second sport', description: 'Finish a game in two different sports.', emoji: '🧭', rarity: 'common', hidden: false },
    f => tally(f.playsBySport), 2),
  rung({ id: 'favourite-five', title: 'Found a favourite', description: 'Play the same game five times.', emoji: '🔁', rarity: 'common', hidden: false },
    f => highest(f.playsByGame), 5),
  rung({ id: 'triple-header', title: 'Triple header', description: 'Three different games in one day.', emoji: '🎪', rarity: 'common', hidden: false },
    f => f.mostGamesInOneDay, 3),
  rung({ id: 'plays-25', title: 'Twenty five finishes', description: 'Finish 25 games.', emoji: '🎮', rarity: 'common', hidden: false },
    f => f.totalPlays, 25),

  /* uncommon: roughly the top tenth */
  rung({ id: 'streak-5', title: 'Five days running', description: 'Play something five days in a row.', emoji: '🔥', rarity: 'uncommon', hidden: false },
    f => f.longestStreak, 5),
  rung({ id: 'plays-100', title: 'A hundred finishes', description: 'Finish 100 games.', emoji: '💯', rarity: 'uncommon', hidden: false },
    f => f.totalPlays, 100),
  rung({ id: 'games-10', title: 'Ten different games', description: 'Finish ten different games.', emoji: '🧩', rarity: 'uncommon', hidden: false },
    f => tally(f.playsByGame), 10),
  rung({ id: 'days-10', title: 'Ten days in the books', description: 'Play on ten different days.', emoji: '📅', rarity: 'uncommon', hidden: false },
    f => f.daysPlayed, 10),
  rung({ id: 'points-5000', title: 'Five thousand up', description: 'Bank 5,000 points.', emoji: '⭐', rarity: 'uncommon', hidden: false },
    f => f.totalPoints, 5000),
  rung({ id: 'sport-25', title: 'Deep in one sport', description: '25 finishes inside a single sport.', emoji: '🧱', rarity: 'uncommon', hidden: false },
    f => highest(f.playsBySport), 25),
  rung({ id: 'scored-10', title: 'Ten on the board', description: 'Have a saved score in ten different games.', emoji: '📊', rarity: 'uncommon', hidden: false },
    f => tally(f.bestScoreByGame), 10),

  /* rare: past the top hundredth */
  rung({ id: 'streak-21', title: 'Three weeks unbroken', description: 'Play something 21 days in a row.', emoji: '🌋', rarity: 'rare', hidden: false },
    f => f.longestStreak, 21),
  rung({ id: 'game-streak-10', title: 'Same game, ten days', description: 'Ten days in a row on one game.', emoji: '🔂', rarity: 'rare', hidden: false },
    f => f.bestGameStreak, 10),
  rung({ id: 'plays-500', title: 'Five hundred finishes', description: 'Finish 500 games.', emoji: '💠', rarity: 'rare', hidden: false },
    f => f.totalPlays, 500),
  rung({ id: 'games-25', title: 'Twenty five different games', description: 'Finish 25 different games.', emoji: '🎯', rarity: 'rare', hidden: false },
    f => tally(f.playsByGame), 25),
  rung({ id: 'one-game-100', title: 'A hundred of one', description: 'Play a single game 100 times.', emoji: '🏟️', rarity: 'rare', hidden: false },
    f => highest(f.playsByGame), 100),
  rung({ id: 'days-30', title: 'Thirty days played', description: 'Play on 30 different days.', emoji: '🗓️', rarity: 'rare', hidden: false },
    f => f.daysPlayed, 30),
  rung({ id: 'points-25000', title: 'Twenty five thousand', description: 'Bank 25,000 points.', emoji: '🌠', rarity: 'rare', hidden: false },
    f => f.totalPoints, 25000),
  /* need comes from the registry, so adding a sport to the site moves the bar
     instead of leaving a number behind that quietly became wrong */
  gauge({ id: 'every-sport', title: 'One from every sport', description: 'Finish a game in every sport on the site.', emoji: '🌍', rarity: 'rare', hidden: false },
    f => ({ have: tally(f.playsBySport), need: f.totalSports })),

  /* legendary: at or past the best anybody has managed so far */
  rung({ id: 'plays-1000', title: 'A thousand games', description: 'Finish 1,000 games.', emoji: '💎', rarity: 'legendary', hidden: false },
    f => f.totalPlays, 1000),
  rung({ id: 'games-50', title: 'Fifty different games', description: 'Finish 50 different games.', emoji: '🗃️', rarity: 'legendary', hidden: false },
    f => tally(f.playsByGame), 50),
  rung({ id: 'streak-60', title: 'Two months, every day', description: 'Play something 60 days in a row.', emoji: '👑', rarity: 'legendary', hidden: false },
    f => f.longestStreak, 60),
  rung({ id: 'days-100', title: 'A hundred days played', description: 'Play on 100 different days.', emoji: '🏛️', rarity: 'legendary', hidden: false },
    f => f.daysPlayed, 100),
  rung({ id: 'points-100000', title: 'Six figures', description: 'Bank 100,000 points.', emoji: '🌟', rarity: 'legendary', hidden: false },
    f => f.totalPoints, 100000),
  gauge({ id: 'every-sport-deep', title: 'Round the world', description: 'Three finishes in every sport on the site.', emoji: '🌐', rarity: 'legendary', hidden: false },
    f => ({ have: atLeast(f.playsBySport, 3), need: f.totalSports })),

  /* hidden. Nothing names these until they land: not the tile, not the
     description, not the locked list. The case says how many are still out
     there and no more than that. Both are monotone on purpose, like every
     other one here: playing more can never take one back off you. */
  rung({ id: 'hidden-marathon', title: 'Marathon', description: 'Ten different games in a single day.', emoji: '🌪️', rarity: 'rare', hidden: true },
    f => f.mostGamesInOneDay, 10),
  rung({ id: 'hidden-four-sports', title: 'Grand tour', description: 'Four different sports in a single day.', emoji: '🗺️', rarity: 'rare', hidden: true },
    f => f.mostSportsInOneDay, 4),
];

/* ─── the pure API ─────────────────────────────────────────────────────── */

/** Everything the facts earn, in table order. */
export function earnedAchievements(f: AchievementFacts): AchievementDef[] {
  return ACHIEVEMENTS.filter(d => d.earned(f));
}

/** One definition's progress, clamped for display so a bar never runs past its end. */
export function achievementProgress(def: AchievementDef, f: AchievementFacts): AchievementProgress {
  const { have, need } = def.progress(f);
  return { have: Math.min(have, Math.max(need, 0)), need };
}

export interface AchievementEntry {
  def: AchievementDef;
  earned: boolean;
  have: number;
  need: number;
  /** 0 to 1, for the bar under a locked tile. */
  ratio: number;
}

/** Earned first, then the locked ones nearest to landing. A hidden one that is
 *  not earned is not in this list at all, which is the only way to be sure the
 *  display cannot leak it. */
export function visibleAchievements(f: AchievementFacts): AchievementEntry[] {
  const entries: AchievementEntry[] = [];
  for (const def of ACHIEVEMENTS) {
    const earned = def.earned(f);
    if (def.hidden && !earned) continue;
    const { have, need } = achievementProgress(def, f);
    entries.push({ def, earned, have, need, ratio: need > 0 ? Math.min(1, have / need) : 0 });
  }
  const rank: Record<AchievementRarity, number> = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
  return entries.sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    if (a.earned) return rank[a.def.rarity] - rank[b.def.rarity];
    return b.ratio - a.ratio;
  });
}

/** How many hidden ones are still out there. A count, never a name. */
export function hiddenRemaining(f: AchievementFacts): number {
  return ACHIEVEMENTS.filter(d => d.hidden && !d.earned(f)).length;
}

/* ─── building the facts ────────────────────────────────────────────────── */

/** A row of the player's own history, the same shape src/lib/badges.ts reads. */
export interface CompletionRow {
  game: string;
  completed_on: string;
}

/** A game slug's sport, by registry category title, or null if the slug is one
 *  of the legacy ones no longer in the catalog. Not evaluated at module scope:
 *  an imported value read while modules are still loading is how the import
 *  cycle got in last time. */
function sportForSlug(slug: string): string | null {
  for (const cat of CATEGORIES) {
    if (cat.games.some(g => g.path.replace(/^\//, '') === slug)) return cat.title;
  }
  return null;
}

/** How many sports the site has right now. */
function siteSportCount(): number {
  return CATEGORIES.filter(c => c.games.length > 0).length;
}

/** A facts object for a player with no history, so the case renders all locked
 *  while the read is in flight instead of flashing an empty card. */
export function emptyAchievementFacts(): AchievementFacts {
  return {
    totalPlays: 0, totalPoints: 0, longestStreak: 0, bestGameStreak: 0,
    daysPlayed: 0, mostGamesInOneDay: 0, mostSportsInOneDay: 0,
    playsByGame: {}, playsBySport: {}, bestScoreByGame: {},
    totalSports: siteSportCount(),
  };
}

/**
 * Pure: rows plus streak state plus saved scores in, facts out. No clock, no
 * network, no storage, and the inputs come back out untouched.
 *
 * The row derived counts (days played, per game, per sport, most in a day) are
 * FLOORS, because the read behind them is capped at the most recent 1,000
 * completions. They can undercount a player with more history than that and
 * they can never overcount, so a threshold met is a threshold genuinely met.
 * The lifetime totals do not have that problem: the local tally counts every
 * finish this browser ever saw, so totalPlays and totalPoints take whichever
 * source knows more.
 */
export function buildAchievementFacts(
  rows: CompletionRow[],
  streaks: StreakState,
  bestScoreByGame: Record<string, number> = {},
  serverPoints = 0,
): AchievementFacts {
  const playsByGame: Record<string, number> = {};
  const playsBySport: Record<string, number> = {};
  const gamesPerDay = new Map<string, Set<string>>();
  const sportsPerDay = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row || typeof row.game !== 'string' || !row.game) continue;
    playsByGame[row.game] = (playsByGame[row.game] ?? 0) + 1;
    const sport = sportForSlug(row.game);
    if (sport) playsBySport[sport] = (playsBySport[sport] ?? 0) + 1;
    const day = row.completed_on;
    if (typeof day !== 'string' || !day) continue;
    const games = gamesPerDay.get(day) ?? new Set<string>();
    games.add(row.game);
    gamesPerDay.set(day, games);
    if (sport) {
      const sports = sportsPerDay.get(day) ?? new Set<string>();
      sports.add(sport);
      sportsPerDay.set(day, sports);
    }
  }

  const widest = (m: Map<string, Set<string>>): number => {
    let top = 0;
    for (const set of m.values()) if (set.size > top) top = set.size;
    return top;
  };

  let bestGameStreak = 0;
  for (const entry of Object.values(streaks.perGame ?? {})) {
    const longest = entry?.longest ?? 0;
    if (longest > bestGameStreak) bestGameStreak = longest;
  }

  return {
    totalPlays: Math.max(rows.length, streaks.totalPlays ?? 0),
    totalPoints: Math.max(serverPoints, streaks.totalPoints ?? 0),
    longestStreak: streaks.global?.longest ?? 0,
    bestGameStreak,
    daysPlayed: gamesPerDay.size,
    mostGamesInOneDay: widest(gamesPerDay),
    mostSportsInOneDay: widest(sportsPerDay),
    playsByGame,
    playsBySport,
    bestScoreByGame: { ...bestScoreByGame },
    totalSports: siteSportCount(),
  };
}

/**
 * The player's own completion rows, matched by the handle this browser writes
 * under, exactly as src/lib/badges.ts does it. A SELECT and nothing else.
 * Never throws: any failure comes back empty and the case renders locked
 * rather than breaking the Profile page.
 *
 * Capped at the 1,000 most recent rows. badges.ts caps at 500 for a 250 game
 * badge; the deepest thing in this case counts 100 finishes of one game, so
 * the cap is doubled here to keep that honest for a player with a long tail of
 * other games in front of it.
 */
async function fetchOwnCompletions(playerName: string): Promise<CompletionRow[]> {
  try {
    // Dynamic .from() access: game_completions predates the generated types,
    // same pattern as src/lib/completions.ts and src/lib/badges.ts.
    const { data, error } = await (supabase.from as any)('game_completions')
      .select('game, completed_on')
      .eq('player_name', playerName)
      .order('completed_on', { ascending: false })
      .limit(1000);
    if (error || !data) return [];
    return data as CompletionRow[];
  } catch {
    return [];
  }
}

/**
 * The facts for whoever is on this browser right now. Reads the local streak
 * state and the player's own completion rows, and takes the saved best scores
 * and the signed in points total from the caller, which has already loaded
 * both. Nothing here writes.
 */
export async function loadAchievementFacts(
  profile?: { display_name?: string | null; username?: string | null } | null,
  bestScoreByGame: Record<string, number> = {},
  serverPoints = 0,
): Promise<AchievementFacts> {
  try {
    const rows = await fetchOwnCompletions(getCurrentPlayerName(profile));
    return buildAchievementFacts(rows, getStreakState(), bestScoreByGame, serverPoints);
  } catch {
    return emptyAchievementFacts();
  }
}

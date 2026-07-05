import { supabase } from '@/integrations/supabase/client';

export interface ListPuzzleDef {
  id: string;
  title: string;
  blurb: string;
  sport: string;
  emoji: string;
  /** Returns the raw answer strings (may contain dupes or nulls; engine cleans them). */
  fetch: () => Promise<string[]>;
  /** Minimum answers for the puzzle to be considered healthy. */
  minAnswers: number;
}

export interface ListAnswer {
  display: string;
  found: boolean;
}

/** Normalize for matching: lowercase, strip accents and punctuation, collapse spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds the alias -> answer-index map. Every answer accepts its full name.
 * Shorter aliases (last word, last two words) only count when they are
 * unique across the whole answer set, so "Williams" alone will not resolve
 * if both Venus and Serena are on the list.
 */
export function buildAliasMap(answers: string[]): Map<string, number> {
  const aliasCounts = new Map<string, number[]>();
  const push = (alias: string, idx: number) => {
    if (alias.length < 3) return;
    const arr = aliasCounts.get(alias) ?? [];
    if (!arr.includes(idx)) arr.push(idx);
    aliasCounts.set(alias, arr);
  };

  answers.forEach((raw, idx) => {
    const full = normalize(raw);
    push(full, idx);
    const words = full.split(' ');
    if (words.length > 1) {
      push(words[words.length - 1], idx); // "packers", "hamilton"
      if (words.length > 2) push(words.slice(-2).join(' '), idx); // "trail blazers"
      push(words.slice(1).join(' '), idx); // drop leading city/first name
    }
  });

  const map = new Map<string, number>();
  for (const [alias, idxs] of aliasCounts) {
    if (idxs.length === 1) map.set(alias, idxs[0]);
    // Ambiguous aliases are dropped: the full name still works because the
    // full normalized name of each answer is unique per cleanAnswers().
  }
  // Full names always win, even if a full name collides with someone's alias.
  answers.forEach((raw, idx) => map.set(normalize(raw), idx));
  return map;
}

/** Dedupe + drop blanks, keeping first-seen display casing. */
export function cleanAnswers(raw: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const display = (r ?? '').trim();
    if (!display) continue;
    const key = normalize(display);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}

async function col(table: string, column: string, filter?: (q: any) => any): Promise<string[]> {
  let q: any = supabase.from(table as any).select(column);
  if (filter) q = filter(q);
  const { data, error } = await q.limit(5000);
  if (error || !data) throw new Error(`${table} unavailable`);
  return (data as any[]).map(r => r[column] as string);
}

/** A static list so the page still works if the database is unreachable. */
export const OFFLINE_PUZZLE: ListPuzzleDef = {
  id: 'offline-sb-winners',
  title: 'Super Bowl Winning Franchises',
  blurb: 'Name every NFL franchise that has won a Super Bowl.',
  sport: 'NFL',
  emoji: '🏈',
  minAnswers: 10,
  fetch: async () => [
    'Green Bay Packers', 'New York Jets', 'Kansas City Chiefs', 'Baltimore Colts',
    'Dallas Cowboys', 'Miami Dolphins', 'Pittsburgh Steelers', 'Oakland Raiders',
    'San Francisco 49ers', 'Washington Redskins', 'Chicago Bears', 'New York Giants',
    'Buffalo Bills', 'Denver Broncos', 'St. Louis Rams', 'Baltimore Ravens',
    'New England Patriots', 'Tampa Bay Buccaneers', 'Indianapolis Colts',
    'New Orleans Saints', 'Seattle Seahawks', 'Philadelphia Eagles', 'Los Angeles Rams',
  ],
};

export const LIST_PUZZLES: ListPuzzleDef[] = [
  {
    id: 'sb-winners',
    title: 'Super Bowl Winning Franchises',
    blurb: 'Every NFL franchise that has lifted the Lombardi Trophy.',
    sport: 'NFL', emoji: '🏈', minAnswers: 10,
    fetch: () => col('super_bowls', 'winner'),
  },
  {
    id: 'sb-mvps',
    title: 'Super Bowl MVPs',
    blurb: 'Every player named Super Bowl MVP.',
    sport: 'NFL', emoji: '🏈', minAnswers: 20,
    fetch: () => col('super_bowls', 'mvp'),
  },
  {
    id: 'nba-champs',
    title: 'NBA Champion Franchises',
    blurb: 'Every franchise that has won the NBA Finals.',
    sport: 'NBA', emoji: '🏀', minAnswers: 10,
    fetch: () => col('nba_finals', 'winner'),
  },
  {
    id: 'nba-fmvps',
    title: 'NBA Finals MVPs',
    blurb: 'Every player to win Finals MVP.',
    sport: 'NBA', emoji: '🏀', minAnswers: 20,
    fetch: () => col('nba_finals', 'finals_mvp'),
  },
  {
    id: 'ws-winners',
    title: 'World Series Champion Franchises',
    blurb: 'Every MLB franchise that has won the World Series.',
    sport: 'MLB', emoji: '⚾', minAnswers: 15,
    fetch: () => col('world_series_v2', 'winner'),
  },
  {
    id: 'cup-winners',
    title: 'Stanley Cup Champion Franchises',
    blurb: 'Every NHL franchise that has raised the Cup.',
    sport: 'NHL', emoji: '🏒', minAnswers: 12,
    fetch: () => col('stanley_cup_finals_v2', 'winner'),
  },
  {
    id: 'f1-champs',
    title: 'F1 World Champions',
    blurb: 'Every driver to win the Formula 1 World Championship.',
    sport: 'F1', emoji: '🏎️', minAnswers: 15,
    fetch: () => col('f1_driver_standings', 'driver_name', q => q.eq('position', 1)),
  },
  {
    id: 'epl-champs',
    title: 'English Champions',
    blurb: 'Every club that has won the English top flight.',
    sport: 'Soccer', emoji: '⚽', minAnswers: 8,
    fetch: () => col('soccer_league_champions', 'champion', q => q.ilike('league', '%premier%')),
  },
  {
    id: 'ucl-topscorers',
    title: 'Champions League Season Top Scorers',
    blurb: 'Every player to finish a season as the Champions League top scorer.',
    sport: 'Soccer', emoji: '⚽', minAnswers: 10,
    fetch: () => col('ucl_top_scorers_by_season', 'player'),
  },
  {
    id: 'wimbledon-champs',
    title: 'Wimbledon Singles Champions',
    blurb: 'Every singles champion at Wimbledon in our records.',
    sport: 'Tennis', emoji: '🎾', minAnswers: 15,
    fetch: () => col('tennis_grand_slam_winners', 'champion', q => q.ilike('tournament', '%wimbledon%')),
  },
  {
    id: 'masters-champs',
    title: 'Masters Champions',
    blurb: 'Every golfer to win the green jacket.',
    sport: 'Golf', emoji: '⛳', minAnswers: 15,
    fetch: () => col('golf_majors', 'player_name', q => q.ilike('tournament', '%masters%')),
  },
  {
    id: 'nascar-champs',
    title: 'NASCAR Cup Series Champions',
    blurb: 'Every driver to win the Cup Series title.',
    sport: 'NASCAR', emoji: '🏁', minAnswers: 15,
    fetch: () => col('nascar_champions', 'driver_name'),
  },
  {
    id: 'cfb-champs',
    title: 'College Football National Champions',
    blurb: 'Every school with a national title in our records.',
    sport: 'CFB', emoji: '🏈', minAnswers: 10,
    fetch: () => col('cfb_national_champions', 'champion'),
  },
  {
    id: 'cbb-champs',
    title: 'March Madness Champions',
    blurb: "Every school to win the men's NCAA basketball tournament.",
    sport: 'CBB', emoji: '🏀', minAnswers: 15,
    fetch: () => col('ncaa_basketball_champions', 'champion'),
  },
  {
    id: 'wnba-champs',
    title: 'WNBA Champion Franchises',
    blurb: 'Every franchise to win the WNBA Finals.',
    sport: 'WNBA', emoji: '🏀', minAnswers: 8,
    fetch: () => col('wnba_finals', 'winner'),
  },
];

export async function loadPuzzleAnswers(def: ListPuzzleDef): Promise<string[] | null> {
  try {
    const answers = cleanAnswers(await def.fetch());
    return answers.length >= def.minAnswers ? answers : null;
  } catch {
    return null;
  }
}

/**
 * Wave 15: partial-credit tiers so a solid-but-incomplete list still reads as
 * a win. Gold requires the full list, Silver 80%+, Bronze 60%+, anything below
 * that stays a non-tiered, encouraging result (no tier name invented for it).
 */
export type ListQuizTier = 'gold' | 'silver' | 'bronze' | null;

export const LIST_QUIZ_TIER_THRESHOLDS: Record<'gold' | 'silver' | 'bronze', number> = {
  gold: 100,
  silver: 80,
  bronze: 60,
};

export function listQuizTier(pct: number): ListQuizTier {
  if (pct >= LIST_QUIZ_TIER_THRESHOLDS.gold) return 'gold';
  if (pct >= LIST_QUIZ_TIER_THRESHOLDS.silver) return 'silver';
  if (pct >= LIST_QUIZ_TIER_THRESHOLDS.bronze) return 'bronze';
  return null;
}

export const LIST_QUIZ_TIER_LABEL: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const LIST_QUIZ_TIER_EMOJI: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};

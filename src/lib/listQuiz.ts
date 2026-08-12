import { foldSpecialLatin } from '@/lib/nameFold';
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
  return foldSpecialLatin(s.toLowerCase())
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

/**
 * Drops values that plainly are not a person's name.
 *
 * Several source tables have their columns shifted one across, so a "name"
 * column ends up holding a rank ("1st"), a goal count ("48"), a scoreline
 * ("2-0") or a position ("Goalkeeper"). Those are unguessable AND they inflate
 * the target count, so a puzzle becomes unwinnable. Audit 2026-07-15 found this
 * across ~30 columns; run select * from public.audit_name_columns() to re-check.
 *
 * Deliberately conservative: it only removes things that cannot be a name, so a
 * genuine one-word name is kept.
 */
function onlyNames(p: Promise<string[]>): Promise<string[]> {
  return p.then(rows =>
    rows.filter(v => {
      const s = (v ?? '').trim();
      if (s.length < 3) return false;                  // "F", "SF", "1Q"
      if (/^[0-9]+$/.test(s)) return false;            // "48", "57"
      if (/^[0-9]+(st|nd|rd|th)$/i.test(s)) return false; // "1st"
      if (/^[0-9]+\s*[–—-]\s*[0-9]+/.test(s)) return false; // "4-0" scorelines, any dash style
      if (/^[0-9]{4}(–[0-9]{2,4})?$/.test(s)) return false; // "1959", "1970-71"
      if (/^(goalkeeper|forward|midfielder|defender|striker|winger|guard|center|centre)$/i.test(s)) return false;
      return true;
    }),
  );
}

/**
 * Strips the win-count suffix some source rows carry: "Lionel Messi (2)" ->
 * "Lionel Messi", "Real Madrid (34) †" -> "Real Madrid".
 *
 * cleanAnswers dedupes on the normalized string, so without this a repeat
 * winner shows up as TWO separate answers ("Mohamed Salah" and "Mohamed Salah
 * (2)") and the second is unguessable, nobody types the bracket.
 */
function stripWinCount(s: string): string {
  return (s ?? '').replace(/\s*\(\d+\)\s*†?\s*$/, '').trim();
}

/**
 * One award out of soccer_awards, by winner_name.
 *
 * ONLY use this for awards whose winner_name was verified to actually hold a
 * person's name (audit 2026-07-15). The table's columns are shifted differently
 * per award and several are unusable:
 *   - 'African Footballer of the Year' / 'South American Footballer of the Year':
 *     winner_name holds the literal string "1st" (a rank) and nationality holds
 *     the player. 70 rows each, 1 distinct "winner". DO NOT USE.
 *   - 'World Soccer Player of the Year': 116 distinct winners across 66 years,
 *     which is impossible for a one-per-year award. Unverified. DO NOT USE.
 * Verified good (winner_name is the player; later columns are shifted but we
 * don't read them): European Golden Shoe, MLS MVP, Premier League Player of the
 * Season.
 */
async function awardWinners(awardName: string): Promise<string[]> {
  const raw = await col('soccer_awards', 'winner_name', (q: any) => q.eq('award_name', awardName));
  // onlyNames is belt-and-braces: the three awards used today are 0% bad, but
  // the shift in this table varies BY AWARD, so anything added later that turns
  // out to be shifted degrades to "fewer answers" instead of shipping "1st" as
  // a guessable name.
  return onlyNames(Promise.resolve(raw.map(stripWinCount)));
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
  // Added 2026-07-15. Each source was verified against the live DB and spot-
  // checked against real results before being added, see awardWinners() for
  // the awards that were REJECTED as corrupt rather than added.
  {
    id: 'heisman-winners',
    title: 'Heisman Trophy Winners',
    blurb: 'Every player to win college football’s biggest individual award.',
    sport: 'CFB', emoji: '🏈', minAnswers: 20,
    // cfb_heisman_winners: 91 rows, 91 distinct years, 1935-2025, exactly one
    // winner per year. 90 distinct names, Archie Griffin won twice. Verified:
    // 2024 Travis Hunter, 2023 Jayden Daniels, 1995 Eddie George, 1975 Griffin.
    fetch: () => col('cfb_heisman_winners', 'winner'),
  },
  {
    id: 'golden-shoe-winners',
    title: 'European Golden Shoe Winners',
    blurb: 'Every player to finish a season as Europe’s top league scorer.',
    sport: 'Soccer', emoji: '👟', minAnswers: 15,
    // 44 distinct across 58 years. Verified: 2025 Mbappé, 2024 Kane, 2023 Haaland.
    fetch: () => awardWinners('European Golden Shoe'),
  },
  {
    id: 'pl-player-of-season',
    title: 'Premier League Players of the Season',
    blurb: 'Every winner of the Premier League’s end-of-season award.',
    sport: 'Soccer', emoji: '🏴', minAnswers: 12,
    // 32 distinct across 32 seasons. Verified: 2023 Foden (23-24), 2024 Salah (24-25).
    fetch: () => awardWinners('Premier League Player of the Season'),
  },
  {
    id: 'mls-mvps',
    title: 'MLS MVPs',
    blurb: 'Every Most Valuable Player in MLS history.',
    sport: 'Soccer', emoji: '🇺🇸', minAnswers: 12,
    // 30 distinct across 30 seasons. Verified: 2025 & 2024 Messi, 2023 Acosta.
    fetch: () => awardWinners('MLS MVP'),
  },
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
    title: 'Champions League Top Scorers',
    blurb: 'Every player near the top of the Champions League all-time scoring charts.',
    sport: 'Soccer', emoji: '⚽', minAnswers: 10,
    /**
     * LIVE BUG FIX 2026-07-15, this puzzle was serving numbers as answers.
     *
     * ucl_top_scorers_by_season has THREE different row shapes merged into it,
     * with the columns shifted differently in each (144 rows total):
     *   - 98 rows: player = the real name (correct), club = goals, goals = apps
     *   - 24 rows: season = the real name, player = GOALS  ("48", "57", "30")
     *   - 22 rows: a titles-by-nation table entirely ("Yugoslavia", club =
     *     "1955-56 , 1963-64 , ...")
     * So the old col(..., 'player') returned 98 names and 46 numbers, 31.9%
     * of this puzzle's answers were things like "48" and "57", which no player
     * could ever guess and which appeared in the target count.
     *
     * Keeping only the 98 rows where 'player' actually holds a name. The other
     * 46 rows' names live in 'season', but recovering them means trusting a
     * second shift on a table this scrambled, so they're dropped rather than
     * guessed at. See task #45 for the underlying re-scrape.
     */
    fetch: () => onlyNames(col('ucl_top_scorers_by_season', 'player')),
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
    // onlyNames: golf_majors stores '-' for years the major wasn't played
    // (1943-45 WWII, and The Open 2020 for COVID), 25 rows across the four
    // tournaments. That's correct source data, but as a puzzle answer it means
    // "name the golfer: , ". Filtered out, not treated as corruption.
    fetch: () => onlyNames(col('golf_majors', 'player_name', q => q.ilike('tournament', '%masters%'))),
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
  {
    id: 'usopen-tennis-champs',
    title: 'US Open Singles Champions',
    blurb: 'Every singles champion at the US Open in our records.',
    sport: 'Tennis', emoji: '🎾', minAnswers: 15,
    fetch: () => col('tennis_grand_slam_winners', 'champion', q => q.ilike('tournament', '%us open%')),
  },
  {
    id: 'ausopen-tennis-champs',
    title: 'Australian Open Singles Champions',
    blurb: 'Every singles champion at the Australian Open in our records.',
    sport: 'Tennis', emoji: '🎾', minAnswers: 15,
    fetch: () => col('tennis_grand_slam_winners', 'champion', q => q.ilike('tournament', '%australian%')),
  },
  {
    id: 'frenchopen-tennis-champs',
    title: 'French Open Singles Champions',
    blurb: 'Every singles champion at Roland Garros in our records.',
    sport: 'Tennis', emoji: '🎾', minAnswers: 15,
    fetch: () => col('tennis_grand_slam_winners', 'champion', q => q.ilike('tournament', '%french%')),
  },
  {
    id: 'pga-champs',
    title: 'PGA Championship Winners',
    blurb: 'Every golfer to win the PGA Championship in our records.',
    sport: 'Golf', emoji: '⛳', minAnswers: 10,
    fetch: () => onlyNames(col('golf_majors', 'player_name', q => q.ilike('tournament', '%pga%'))),
  },
  {
    id: 'theopen-champs',
    title: 'The Open Championship Winners',
    blurb: 'Every golfer to win The Open (British Open) in our records.',
    sport: 'Golf', emoji: '⛳', minAnswers: 15,
    fetch: () => onlyNames(col('golf_majors', 'player_name', q => q.ilike('tournament', '%open championship%'))),
  },
  {
    id: 'usopen-golf-champs',
    title: 'U.S. Open (Golf) Winners',
    blurb: 'Every golfer to win the U.S. Open in our records.',
    sport: 'Golf', emoji: '⛳', minAnswers: 10,
    fetch: () => onlyNames(col('golf_majors', 'player_name', q => q.ilike('tournament', '%u.s. open%'))),
  },
  {
    id: 'ballon-dor-winners',
    title: "Ballon d'Or Winners (Men's)",
    blurb: "Every men's Ballon d'Or winner in our records.",
    sport: 'Soccer', emoji: '🏆', minAnswers: 15,
    fetch: () => col('ballon_dor', 'player_name', q => q.eq('rank', 1).eq('award_type', 'Men')),
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

import { supabase } from '@/integrations/supabase/client';
import { flagFor, fmtCompactUsd } from '@/lib/dealPlayers';
import { clubKey, normalizeName, positionGroup, primaryNationality } from '@/lib/whoAmI';
import type { PositionGroup } from '@/lib/whoAmI';

/**
 * Player Bingo (12-criteria board filled by real footballers)
 *
 * Data sources (public read via RLS):
 *   player_market_values  pool of notable players + per-player career club sets
 *   world_cup_players     squad lists; 2010+ rows are loaded and name-matched
 *   ballon_dor            winners; matched by normalized name
 *
 * Satisfiability, verified in SQL on flawuiqbvjobmkfkauhw (2026-07-02) against
 * this exact pool definition (top 500 rows by value, year >= 2024, deduped by
 * player keeping the most recent row):
 *   From England 63, France 50, Spain 45, Brazil 43, Netherlands 31 ... Sweden 8
 *   Played for: Chelsea 34, Man City 28, PSG 25, Real Madrid 22, Inter Milan 14
 *     (all 15 curated clubs land between 14 and 34)
 *   Goalkeeper 22, Defender ~160, Midfielder ~127, Forward ~190
 *   Valued $100M+ 18, Valued $50M+ 115, Valued under $30M ~175 (pool floor $24M)
 *   Aged 29 or older 30, Aged 21 or younger 112
 *   Played at a World Cup 115 (exact-name lower bound; accent folding adds more)
 *   Won the Ballon d'Or 2 only, so that tile stays dormant: generateBoard only
 *     uses criteria whose support is >= MIN_TILE_SUPPORT, which keeps every
 *     board tile satisfiable by at least 8 pool players by construction.
 *
 * Winnability guarantee: on top of the 8+ support rule, buildDeck seeds at
 * least GUARANTEED_PER_TILE (3) satisfiers of every board tile into the first
 * GUARANTEE_WINDOW (40) reveals, so a winnable path always exists even with
 * heavy skipping. Wrong-tap checks reuse the exact same predicates that
 * computed the support lists, so correctness is by construction.
 */

export interface BingoPlayer {
  name: string;
  nationality: string; // raw value, can hold duals like "France / Algeria"
  position: string; // Transfermarkt style, e.g. "Centre-Forward"
  club: string; // club on the player's most recent row
  value: number; // market value in USD from the most recent row
  age: number; // age on the most recent row
  year: number; // year of the row we kept
}

export interface BingoData {
  pool: BingoPlayer[]; // sorted by value desc
  clubHistory: Map<string, Set<string>>; // player name -> normalized club keys, all years
  worldCupAll: Set<string>; // normalized names of 2010+ World Cup squad players
  worldCup2022: Set<string>; // normalized names of 2022 World Cup squad players
  ballonDor: Set<string>; // normalized names of men's Ballon d'Or winners
}

export type CriterionKind = 'nationality' | 'club' | 'position' | 'value' | 'age' | 'honour';

export interface BingoCriterion {
  id: string;
  kind: CriterionKind;
  label: string;
  icon: string; // flag or text glyph only
  /** Criteria sharing a group never appear on the same board (near-duplicates). */
  group?: string;
  test: (p: BingoPlayer, data: BingoData) => boolean;
  support: string[]; // names of pool players that satisfy the criterion
}

export const BOARD_SIZE = 12; // 3 columns x 4 rows
export const START_LIVES = 3;
/** A criterion may only appear on a board if at least this many pool players satisfy it. */
export const MIN_TILE_SUPPORT = 8;
/** Every tile gets at least GUARANTEED_PER_TILE satisfiers inside the first GUARANTEE_WINDOW reveals. */
export const GUARANTEE_WINDOW = 40;
export const GUARANTEED_PER_TILE = 3;
export const POOL_SIZE = 500;

const POOL_ROW_FETCH = 1000; // top rows by value from recent years, deduped down to POOL_SIZE
const POOL_MIN_YEAR = 2024;
const HISTORY_CHUNK = 80; // names per .in() filter, keeps request URLs comfortably small
const HISTORY_PAGE = 1000; // PostgREST row cap per request
const HISTORY_MAX_PAGES = 6;
const WC_MIN_YEAR = 2010; // a 2024+ pool player cannot have played a pre-2010 World Cup
const WC_PAGE = 1000;
const WC_MAX_PAGES = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PoolRow {
  player_name: string | null;
  nationality: string | null;
  position: string | null;
  club: string | null;
  market_value_usd: number | null;
  age: number | null;
  year: number | null;
}

/**
 * Career club sets for every pool player, from ALL years in the table.
 * Local copy of the whoAmI pattern (that helper is module-private there):
 * names are chunked into .in() filters and each chunk is paged in blocks of
 * 1000 rows to respect the PostgREST row cap.
 */
async function fetchClubHistory(names: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += HISTORY_CHUNK) {
    chunks.push(names.slice(i, i + HISTORY_CHUNK));
  }
  await Promise.all(
    chunks.map(async chunk => {
      let from = 0;
      for (let page = 0; page < HISTORY_MAX_PAGES; page++) {
        const { data, error } = await supabase
          .from('player_market_values')
          .select('player_name, club')
          .in('player_name', chunk)
          .order('id', { ascending: true })
          .range(from, from + HISTORY_PAGE - 1);
        if (error) throw error;
        for (const r of data ?? []) {
          const name = (r.player_name ?? '').trim();
          const key = clubKey(r.club ?? '');
          if (!name || !key) continue;
          let set = map.get(name);
          if (!set) {
            set = new Set<string>();
            map.set(name, set);
          }
          set.add(key);
        }
        if (!data || data.length < HISTORY_PAGE) break;
        from += HISTORY_PAGE;
      }
    }),
  );
  return map;
}

/** Top rows by market value from recent years, deduped by player keeping the newest row. */
async function fetchPool(): Promise<BingoPlayer[] | null> {
  const { data: rows, error } = await supabase
    .from('player_market_values')
    .select('player_name, nationality, position, club, market_value_usd, age, year')
    .gte('year', POOL_MIN_YEAR)
    .gt('market_value_usd', 0)
    .not('age', 'is', null)
    .order('market_value_usd', { ascending: false })
    .limit(POOL_ROW_FETCH);
  if (error || !rows) return null;

  const byName = new Map<string, BingoPlayer>();
  for (const r of rows as PoolRow[]) {
    const name = (r.player_name ?? '').trim();
    const value = Number(r.market_value_usd) || 0;
    const age = Number(r.age) || 0;
    const year = Number(r.year) || 0;
    if (!name || value <= 0 || age <= 0) continue;
    const candidate: BingoPlayer = {
      name,
      nationality: (r.nationality ?? '').trim(),
      position: (r.position ?? '').trim(),
      club: (r.club ?? '').trim(),
      value,
      age,
      year,
    };
    const prev = byName.get(name);
    if (!prev || year > prev.year || (year === prev.year && value > prev.value)) {
      byName.set(name, candidate);
    }
  }

  const pool = [...byName.values()].sort((a, b) => b.value - a.value).slice(0, POOL_SIZE);
  return pool.length >= 100 ? pool : null;
}

/** Normalized name sets from World Cup squads (2010 and later), paged. */
async function fetchWorldCupSets(): Promise<{ all: Set<string>; y2022: Set<string> }> {
  const all = new Set<string>();
  const y2022 = new Set<string>();
  let from = 0;
  for (let page = 0; page < WC_MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('world_cup_players')
      .select('player_name, world_cup_year')
      .gte('world_cup_year', WC_MIN_YEAR)
      .order('id', { ascending: true })
      .range(from, from + WC_PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const key = normalizeName(r.player_name ?? '');
      if (!key) continue;
      all.add(key);
      if (Number(r.world_cup_year) === 2022) y2022.add(key);
    }
    if (!data || data.length < WC_PAGE) break;
    from += WC_PAGE;
  }
  return { all, y2022 };
}

/** Normalized names of men's Ballon d'Or winners (rank 1 rows, or unranked winner rows). */
async function fetchBallonDorWinners(): Promise<Set<string>> {
  const { data, error } = await supabase.from('ballon_dor').select('player_name, rank, award_type');
  if (error) throw error;
  const winners = new Set<string>();
  for (const r of data ?? []) {
    if ((r.award_type ?? 'Men') !== 'Men') continue;
    if (r.rank != null && Number(r.rank) !== 1) continue;
    const key = normalizeName(r.player_name ?? '');
    if (key) winners.add(key);
  }
  return winners;
}

/**
 * Boot fetch for the whole game. Returns null on any failure so the page can
 * show an error state with retry.
 */
export async function fetchBingoData(): Promise<BingoData | null> {
  try {
    const [pool, wc, ballonDor] = await Promise.all([
      fetchPool(),
      fetchWorldCupSets(),
      fetchBallonDorWinners(),
    ]);
    if (!pool) return null;

    const clubHistory = await fetchClubHistory(pool.map(p => p.name));
    // Every player at least carries their current club, even if a history page fell short.
    for (const p of pool) {
      const key = clubKey(p.club);
      if (!key) continue;
      let set = clubHistory.get(p.name);
      if (!set) {
        set = new Set<string>();
        clubHistory.set(p.name, set);
      }
      set.add(key);
    }

    return { pool, clubHistory, worldCupAll: wc.all, worldCup2022: wc.y2022, ballonDor };
  } catch {
    return null;
  }
}

/* ------------------------------ criteria ------------------------------ */

/** Curated big clubs with their exact normalized club keys as stored in the table. */
const CLUB_TILES: { label: string; keys: string[] }[] = [
  { label: 'Real Madrid', keys: ['real madrid'] },
  { label: 'Barcelona', keys: ['fc barcelona'] },
  { label: 'Manchester United', keys: ['manchester united'] },
  { label: 'Manchester City', keys: ['manchester city'] },
  { label: 'Liverpool', keys: ['liverpool fc'] },
  { label: 'Chelsea', keys: ['chelsea fc'] },
  { label: 'Arsenal', keys: ['arsenal fc'] },
  { label: 'Tottenham', keys: ['tottenham hotspur'] },
  { label: 'PSG', keys: ['paris saint-germain'] },
  { label: 'Bayern Munich', keys: ['bayern munich', 'fc bayern munich'] },
  { label: 'Borussia Dortmund', keys: ['borussia dortmund'] },
  { label: 'Juventus', keys: ['juventus fc', 'juventus'] },
  { label: 'AC Milan', keys: ['ac milan'] },
  { label: 'Inter Milan', keys: ['inter milan'] },
  { label: 'Atletico Madrid', keys: ['atletico de madrid'] },
];

const POSITION_TILES: { group: PositionGroup; label: string; icon: string }[] = [
  { group: 'GK', label: 'Goalkeeper', icon: '🧤' },
  { group: 'DEF', label: 'Defender', icon: '🛡️' },
  { group: 'MID', label: 'Midfielder', icon: '⚙️' },
  { group: 'FWD', label: 'Forward', icon: '⚽' },
];

type RawCriterion = Omit<BingoCriterion, 'support'>;

function withSupport(data: BingoData, raw: RawCriterion): BingoCriterion {
  const support: string[] = [];
  for (const p of data.pool) {
    if (raw.test(p, data)) support.push(p.name);
  }
  return { ...raw, support };
}

/**
 * Builds every criterion instance with its computed support list. Instances
 * below MIN_TILE_SUPPORT are still returned (so callers can inspect them) but
 * generateBoard never places them on a board.
 */
export function buildCriteria(data: BingoData): BingoCriterion[] {
  const out: BingoCriterion[] = [];

  // Nationalities, data driven from the pool itself.
  const natCount = new Map<string, { label: string; count: number }>();
  for (const p of data.pool) {
    const key = primaryNationality(p.nationality);
    if (!key) continue;
    const label = (p.nationality || '').split(/[/,]/)[0].trim();
    const cur = natCount.get(key);
    if (cur) cur.count += 1;
    else natCount.set(key, { label, count: 1 });
  }
  for (const [key, info] of natCount) {
    if (info.count < MIN_TILE_SUPPORT) continue;
    out.push(
      withSupport(data, {
        id: 'nat-' + key.replace(/\s+/g, '-'),
        kind: 'nationality',
        label: 'From ' + info.label,
        icon: flagFor(info.label),
        test: p => primaryNationality(p.nationality) === key,
      }),
    );
  }

  // Career clubs (any season in the player's history counts).
  for (const c of CLUB_TILES) {
    out.push(
      withSupport(data, {
        id: 'club-' + c.keys[0].replace(/\s+/g, '-'),
        kind: 'club',
        label: 'Played for ' + c.label,
        icon: '👕',
        test: (p, d) => {
          const hist = d.clubHistory.get(p.name);
          if (!hist) return false;
          return c.keys.some(k => hist.has(k));
        },
      }),
    );
  }

  // Positions.
  for (const t of POSITION_TILES) {
    out.push(
      withSupport(data, {
        id: 'pos-' + t.group.toLowerCase(),
        kind: 'position',
        label: t.label,
        icon: t.icon,
        test: p => positionGroup(p.position) === t.group,
      }),
    );
  }

  // Market value bands (the pool floor is around $24M, so "under $30M" is well stocked).
  out.push(
    withSupport(data, {
      id: 'value-100m',
      kind: 'value',
      group: 'value-up',
      label: 'Valued ' + fmtCompactUsd(100_000_000) + '+',
      icon: '💰',
      test: p => p.value >= 100_000_000,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'value-50m',
      kind: 'value',
      group: 'value-up',
      label: 'Valued ' + fmtCompactUsd(50_000_000) + '+',
      icon: '💰',
      test: p => p.value >= 50_000_000,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'value-under-30m',
      kind: 'value',
      label: 'Valued under ' + fmtCompactUsd(30_000_000),
      icon: '🪙',
      test: p => p.value > 0 && p.value < 30_000_000,
    }),
  );

  // Age bands.
  out.push(
    withSupport(data, {
      id: 'age-29-plus',
      kind: 'age',
      label: 'Aged 29 or older',
      icon: '🎂',
      test: p => p.age >= 29,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'age-21-under',
      kind: 'age',
      label: 'Aged 21 or younger',
      icon: '🌱',
      test: p => p.age > 0 && p.age <= 21,
    }),
  );

  // Honours.
  out.push(
    withSupport(data, {
      id: 'wc-any',
      kind: 'honour',
      group: 'wc',
      label: 'Played at a World Cup',
      icon: '🌍',
      test: (p, d) => d.worldCupAll.has(normalizeName(p.name)),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'wc-2022',
      kind: 'honour',
      group: 'wc',
      label: 'Played at the 2022 World Cup',
      icon: '🌍',
      test: (p, d) => d.worldCup2022.has(normalizeName(p.name)),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'ballon-dor',
      kind: 'honour',
      label: "Won the Ballon d'Or",
      icon: '🏆',
      test: (p, d) => d.ballonDor.has(normalizeName(p.name)),
    }),
  );

  return out;
}

/** How many tiles of each kind a board aims for (sums to BOARD_SIZE). */
const BOARD_QUOTAS: { kind: CriterionKind; count: number }[] = [
  { kind: 'nationality', count: 4 },
  { kind: 'club', count: 3 },
  { kind: 'position', count: 2 },
  { kind: 'value', count: 1 },
  { kind: 'age', count: 1 },
  { kind: 'honour', count: 1 },
];

/**
 * Picks BOARD_SIZE tiles. Only criteria with support >= MIN_TILE_SUPPORT are
 * eligible, which is the first half of the winnability guarantee. Criteria
 * sharing a `group` (near-duplicates like the two World Cup tiles) never
 * appear together. If a quota bucket runs short, any other eligible criterion
 * backfills the board.
 */
export function generateBoard(criteria: BingoCriterion[]): BingoCriterion[] {
  const eligible = criteria.filter(c => c.support.length >= MIN_TILE_SUPPORT);
  const byKind = new Map<CriterionKind, BingoCriterion[]>();
  for (const c of eligible) {
    const list = byKind.get(c.kind);
    if (list) list.push(c);
    else byKind.set(c.kind, [c]);
  }

  const board: BingoCriterion[] = [];
  const usedGroups = new Set<string>();
  const usedIds = new Set<string>();
  const take = (c: BingoCriterion) => {
    board.push(c);
    usedIds.add(c.id);
    if (c.group) usedGroups.add(c.group);
  };

  for (const q of BOARD_QUOTAS) {
    let taken = 0;
    for (const c of shuffle(byKind.get(q.kind) ?? [])) {
      if (taken >= q.count) break;
      if (usedIds.has(c.id)) continue;
      if (c.group && usedGroups.has(c.group)) continue;
      take(c);
      taken++;
    }
  }

  if (board.length < BOARD_SIZE) {
    for (const c of shuffle(eligible)) {
      if (board.length >= BOARD_SIZE) break;
      if (usedIds.has(c.id)) continue;
      if (c.group && usedGroups.has(c.group)) continue;
      take(c);
    }
  }

  return shuffle(board.slice(0, BOARD_SIZE));
}

/**
 * Orders the reveal deck so a winnable path exists: at least
 * GUARANTEED_PER_TILE satisfiers of EVERY board tile are placed (shuffled)
 * inside the first GUARANTEE_WINDOW reveals. Scarcest tiles reserve their
 * players first; one player can count toward several tiles. The rest of the
 * pool follows in random order so skipping never runs dry early.
 */
export function buildDeck(pool: BingoPlayer[], board: BingoCriterion[]): BingoPlayer[] {
  const byName = new Map(pool.map(p => [p.name, p]));
  const guaranteed = new Set<string>();
  const tiles = [...board].sort((a, b) => a.support.length - b.support.length);

  for (const t of tiles) {
    const target = Math.min(GUARANTEED_PER_TILE, t.support.length);
    let have = 0;
    for (const n of t.support) {
      if (guaranteed.has(n)) have++;
    }
    for (const n of shuffle(t.support)) {
      if (have >= target) break;
      if (guaranteed.has(n)) continue;
      guaranteed.add(n);
      have++;
    }
  }

  const head: BingoPlayer[] = [];
  for (const n of guaranteed) {
    const p = byName.get(n);
    if (p) head.push(p);
  }
  const rest = shuffle(pool.filter(p => !guaranteed.has(p.name)));
  const windowSize = Math.min(Math.max(GUARANTEE_WINDOW, head.length), pool.length);
  let restIdx = 0;
  while (head.length < windowSize && restIdx < rest.length) {
    head.push(rest[restIdx]);
    restIdx++;
  }
  return [...shuffle(head), ...rest.slice(restIdx)];
}

/** 4 rows x 3 cols of green/white squares, in board display order. */
export function buildShareGrid(board: BingoCriterion[], locked: Record<string, string>): string {
  const rows: string[] = [];
  for (let r = 0; r < board.length; r += 3) {
    rows.push(
      board
        .slice(r, r + 3)
        .map(c => (locked[c.id] ? '🟩' : '⬜'))
        .join(''),
    );
  }
  return rows.join('\n');
}

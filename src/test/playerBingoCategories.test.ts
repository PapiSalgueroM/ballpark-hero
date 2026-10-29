import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BOARD_SIZE, FREE_INDEX, GUARANTEE_WINDOW, GRID, MIN_TILE_SUPPORT,
  buildCriteria, buildDeck, generateBoard, layoutGrid, winningLines,
  type BingoCriterion, type BingoData, type BingoPlayer, type SeasonStat,
} from '@/lib/playerBingo';

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key', supabase: {},
}));

const addedIds = [
  'pos-full-back', 'pos-winger', 'value-30m-under-50m', 'value-50m-under-100m',
  'born-2000-to-2003', 'born-1997-to-1999', 'season-goals-assists-10', 'season-contributions-30',
  'season-matches-50', 'season-goals-10-under-30-matches',
  'season-matches-40-no-red', 'season-yellows-10-red',
];
const oldIds = [
  'club-real-madrid', 'club-fc-barcelona', 'club-manchester-united', 'club-manchester-city',
  'club-liverpool-fc', 'club-chelsea-fc', 'club-arsenal-fc', 'club-tottenham-hotspur',
  'club-paris-saint-germain', 'club-bayern-munich', 'club-borussia-dortmund',
  'club-juventus-fc', 'club-ac-milan', 'club-inter-milan', 'club-atletico-de-madrid',
  'pos-gk', 'pos-def', 'pos-mid', 'pos-fwd',
  'exactpos-centre-back', 'exactpos-right-back', 'exactpos-left-back',
  'exactpos-central-midfield', 'exactpos-defensive-midfield', 'exactpos-attacking-midfield',
  'exactpos-left-midfield', 'exactpos-right-midfield', 'exactpos-right-winger',
  'exactpos-left-winger', 'exactpos-centre-forward', 'exactpos-second-striker',
  'value-100m', 'value-50m', 'value-under-30m', 'age-29-plus', 'age-21-under',
  'wc-any', 'wc-2022', 'ballon-dor', 'wc-winner', 'ucl-winner', 'ig-10m', 'messi-teammate',
  'season-goals-25', 'season-goals-20', 'season-assists-15', 'season-assists-10',
  'season-red-card', 'season-yellows-10', 'season-matches-40',
  'one-club-man', 'journeyman-4-clubs',
];
const emptyData = (): BingoData => ({
  pool: [], clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(),
  worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
});
const player = (patch: Partial<BingoPlayer> = {}): BingoPlayer => ({
  name: 'Fixture Player', nationality: 'Spain', position: 'Central Midfield',
  club: 'Real Madrid', value: 40_000_000, age: 24, year: 2026, ...patch,
});
const season = (patch: Partial<SeasonStat> = {}): SeasonStat => ({
  goals: null, assists: null, matches: null, yellowCards: null, redCards: null, ...patch,
});
function criterion(id: string): BingoCriterion {
  const found = buildCriteria(emptyData()).find(c => c.id === id);
  expect(found, 'new category ' + id + ' is available').toBeDefined();
  return found!;
}
function accepts(id: string, rows: SeasonStat[], patch: Partial<BingoPlayer> = {}): boolean {
  const p = player(patch);
  const data = emptyData();
  data.pool = [p];
  data.seasonStats.set(p.name, rows);
  return criterion(id).test(p, data);
}
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/* These people and season rows are fictional. The fixture exercises the existing
   metadata contract without importing or asserting any new sports facts. */
function richData(): BingoData {
  const data = emptyData();
  const random = seeded(20261026);
  const nations = ['Spain', 'France', 'Brazil', 'England', 'Germany', 'Portugal', 'Argentina', 'Italy'];
  const positions = [
    'Goalkeeper', 'Centre-Back', 'Right-Back', 'Left-Back', 'Central Midfield', 'Defensive Midfield',
    'Attacking Midfield', 'Left Midfield', 'Right Midfield', 'Left Winger', 'Right Winger',
    'Centre-Forward', 'Second Striker',
  ];
  const clubs = ['real madrid', 'fc barcelona', 'manchester united', 'manchester city', 'liverpool fc',
    'chelsea fc', 'arsenal fc', 'tottenham hotspur', 'paris saint-germain', 'bayern munich',
    'borussia dortmund', 'juventus fc', 'ac milan', 'inter milan', 'atletico de madrid'];
  const choose = <T,>(values: T[]): T => values[Math.floor(random() * values.length)];
  const statLines = [
    season({ goals: 10, assists: 10, matches: 40, yellowCards: 10, redCards: 1 }),
    season({ goals: 25, assists: 5, matches: 50, yellowCards: 0, redCards: 0 }),
    season({ goals: 10, assists: 0, matches: 29, yellowCards: 2, redCards: 0 }),
    season({ goals: 0, assists: 15, matches: 45, yellowCards: 8, redCards: 0 }),
    season({ goals: 20, assists: 10, matches: 55, yellowCards: 10, redCards: 1 }),
    season({ goals: 5, assists: 2, matches: 30, yellowCards: 2, redCards: 0 }),
    season(),
  ];
  for (let i = 0; i < 500; i++) {
    const p = player({
      name: 'Fixture ' + String(i).padStart(3, '0'), nationality: choose(nations),
      position: choose(positions), value: choose([25_000_000, 40_000_000, 75_000_000, 120_000_000]),
      age: 18 + Math.floor(random() * 18),
    });
    data.pool.push(p);
    const count = 1 + Math.floor(random() * 6);
    const offset = Math.floor(random() * clubs.length);
    data.clubHistory.set(p.name, new Set(Array.from({ length: count }, (_, j) => clubs[(offset + j) % clubs.length])));
    data.seasonStats.set(p.name, [choose(statLines)]);
  }
  return data;
}

/* One revealed player can fill one square. Matching distinct names proves an
   actual playable line, rather than counting the same player five times. */
function reachableLine(board: BingoCriterion[], deck: BingoPlayer[], data: BingoData): boolean {
  const cells = layoutGrid(board);
  return winningLines().some(line => {
    const assigned = new Map<string, BingoCriterion>();
    const tiles = line.filter(i => i !== FREE_INDEX).map(i => cells[i]!);
    const fit = (tile: BingoCriterion, seen: Set<string>): boolean => {
      for (const p of deck) {
        if (seen.has(p.name) || !tile.test(p, data)) continue;
        seen.add(p.name);
        const previous = assigned.get(p.name);
        if (!previous || fit(previous, seen)) {
          assigned.set(p.name, tile);
          return true;
        }
      }
      return false;
    };
    return tiles.every(tile => fit(tile, new Set()));
  });
}

afterEach(() => vi.restoreAllMocks());

describe('Player Bingo categories', () => {
  it('preserves all 52 original fixed IDs and the board and support rules', () => {
    const retained = buildCriteria(emptyData()).filter(c => !addedIds.includes(c.id));
    expect(oldIds).toHaveLength(52);
    expect(retained.map(c => c.id).sort()).toEqual([...oldIds].sort());
    expect([GRID, BOARD_SIZE, FREE_INDEX, MIN_TILE_SUPPORT, GUARANTEE_WINDOW]).toEqual([5, 24, 12, 8, 60]);
  });

  it('adds exactly 12 distinct fixed categories without replacing an old ID', () => {
    const criteria = buildCriteria(emptyData());
    expect(addedIds.filter(id => !criteria.some(c => c.id === id)), 'all twelve new category IDs must exist').toEqual([]);
    expect(criteria).toHaveLength(64);
    expect(new Set(criteria.map(c => c.id)).size).toBe(criteria.length);
  });

  it('accepts both sides of full-back and winger while refusing other positions', () => {
    for (const [id, yes, no] of [
      ['pos-full-back', ['Left-Back', 'Right-Back'], ['Centre-Back', 'Defensive Midfield', 'Left Midfield', '']],
      ['pos-winger', ['Left Winger', 'Right Winger'], ['Centre-Forward', 'Left Midfield', 'Attacking Midfield', '']],
    ] as const) {
      const c = criterion(id);
      for (const position of yes) expect(c.test(player({ position }), emptyData()), id + ': ' + position).toBe(true);
      for (const position of no) expect(c.test(player({ position }), emptyData()), id + ': ' + position).toBe(false);
    }
  });

  it('keeps middle value bands disjoint at every boundary and rejects unknown values', () => {
    for (const [id, low, high] of [
      ['value-30m-under-50m', 30_000_000, 50_000_000],
      ['value-50m-under-100m', 50_000_000, 100_000_000],
    ] as const) {
      const c = criterion(id);
      for (const value of [low, high - 1]) expect(c.test(player({ value }), emptyData())).toBe(true);
      for (const value of [0, low - 1, high, NaN]) expect(c.test(player({ value }), emptyData())).toBe(false);
    }
  });

  it('fills the two middle age bands without borrowing younger or older players', () => {
    /* Release BS fix: bands on birth year (row year minus age minus 1), so on 2026 rows the edges
       are ages 22 and 25, 26 and 28, and a 2025 row of the same age is a year older */
    for (const [id, low, high] of [['born-2000-to-2003', 22, 25], ['born-1997-to-1999', 26, 28]] as const) {
      const c = criterion(id);
      for (const age of [low, high]) expect(c.test(player({ age }), emptyData())).toBe(true);
      for (const age of [0, low - 1, high + 1, NaN]) expect(c.test(player({ age }), emptyData())).toBe(false);
    }
    expect(criterion('born-2000-to-2003').test(player({ age: 25, year: 2025 }), emptyData())).toBe(false);
    expect(criterion('born-1997-to-1999').test(player({ age: 25, year: 2025 }), emptyData())).toBe(true);
  });

  it('requires attacking combinations in one season and does not invent missing contributions', () => {
    const double = 'season-goals-assists-10';
    const combined = 'season-contributions-30';
    expect(accepts(double, [season({ goals: 10, assists: 10 })])).toBe(true);
    expect(accepts(double, [season({ goals: 10, assists: 9 })])).toBe(false);
    expect(accepts(double, [season({ goals: 10 }), season({ assists: 10 })])).toBe(false);
    expect(accepts(double, [season(), season({ goals: 9, assists: 10 })])).toBe(false);
    expect(accepts(combined, [season({ goals: 20, assists: 10 })])).toBe(true);
    expect(accepts(combined, [season({ goals: 0, assists: 30 })])).toBe(true);
    expect(accepts(combined, [season({ goals: 20, assists: 9 })])).toBe(false);
    expect(accepts(combined, [season({ goals: 20 }), season({ assists: 10 })])).toBe(false);
    expect(accepts(combined, [season(), season({ goals: 29, assists: null })])).toBe(false);
  });

  it('checks appearance and scoring efficiency boundaries on a single known season', () => {
    expect(accepts('season-matches-50', [season({ matches: 50 })])).toBe(true);
    expect(accepts('season-matches-50', [season({ matches: 49 }), season({ matches: null })])).toBe(false);
    const id = 'season-goals-10-under-30-matches';
    expect(accepts(id, [season({ goals: 10, matches: 29 })])).toBe(true);
    for (const row of [season({ goals: 9, matches: 29 }), season({ goals: 10, matches: 30 }),
      season({ goals: 10, matches: 0 }), season({ goals: 10 }), season({ matches: 29 })]) {
      expect(accepts(id, [row])).toBe(false);
    }
    expect(accepts(id, [season({ goals: 10 }), season({ matches: 29 })])).toBe(false);
  });

  it('requires known discipline and matches in the same season instead of treating null as zero', () => {
    const clean = 'season-matches-40-no-red';
    expect(accepts(clean, [season({ matches: 40, redCards: 0 })])).toBe(true);
    for (const row of [season({ matches: 39, redCards: 0 }), season({ matches: 40, redCards: 1 }),
      season({ matches: 40 }), season({ redCards: 0 })]) expect(accepts(clean, [row])).toBe(false);
    expect(accepts(clean, [season({ matches: 40 }), season({ redCards: 0 })])).toBe(false);
    const cards = 'season-yellows-10-red';
    expect(accepts(cards, [season({ yellowCards: 10, redCards: 1 })])).toBe(true);
    for (const row of [season({ yellowCards: 9, redCards: 1 }), season({ yellowCards: 10, redCards: 0 }),
      season({ yellowCards: 10 }), season({ redCards: 1 })]) expect(accepts(cards, [row])).toBe(false);
    expect(accepts(cards, [season({ yellowCards: 10 }), season({ redCards: 1 })])).toBe(false);
  });

  it('groups related attacking appearance discipline and high-value alternatives', () => {
    for (const ids of [
      ['season-goals-assists-10', 'season-contributions-30'],
      ['season-matches-40', 'season-matches-50', 'season-matches-40-no-red'],
      ['season-red-card', 'season-yellows-10', 'season-yellows-10-red'],
      ['season-goals-20', 'season-goals-25', 'season-goals-10-under-30-matches'],
      ['value-50m', 'value-100m', 'value-50m-under-100m'],
    ]) {
      const groups = ids.map(id => criterion(id).group);
      expect(groups[0]).toBeTruthy();
      expect(new Set(groups).size).toBe(1);
    }
  });

  it('deals supported varied boards with a distinct-player winning line in the first 60 reveals', () => {
    const data = richData();
    const criteria = buildCriteria(data);
    for (const id of addedIds) {
      const c = criteria.find(row => row.id === id);
      expect(c, 'new category ' + id + ' is available').toBeDefined();
      expect(c!.support.length, id + ' has meaningful fixture support').toBeGreaterThanOrEqual(MIN_TILE_SUPPORT);
      expect(c!.support).toEqual(data.pool.filter(p => c!.test(p, data)).map(p => p.name));
    }
    const seen = new Set<string>();
    for (let seed = 1; seed <= 128; seed++) {
      vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
      const board = generateBoard(criteria);
      expect(board, 'seed ' + seed).toHaveLength(BOARD_SIZE);
      expect(new Set(board.map(c => c.id)).size).toBe(BOARD_SIZE);
      const groups = board.flatMap(c => c.group ? [c.group] : []);
      expect(new Set(groups).size).toBe(groups.length);
      for (const c of board) {
        expect(c.support.length).toBeGreaterThanOrEqual(MIN_TILE_SUPPORT);
        seen.add(c.id);
      }
      const deck = buildDeck(data.pool, board);
      expect(deck).toHaveLength(data.pool.length);
      expect(new Set(deck.map(p => p.name)).size).toBe(data.pool.length);
      expect(reachableLine(board, deck.slice(0, GUARANTEE_WINDOW), data), 'unique-player line at seed ' + seed).toBe(true);
      vi.restoreAllMocks();
    }
    expect(addedIds.filter(id => !seen.has(id)), 'every added category can reach a real generated board').toEqual([]);
    const thin = criteria.find(c => c.id === 'pos-full-back')!;
    const filtered = criteria.filter(c => c.kind !== 'position').concat({ ...thin, support: thin.support.slice(0, MIN_TILE_SUPPORT - 1) });
    vi.spyOn(Math, 'random').mockImplementation(seeded(8));
    expect(generateBoard(filtered).some(c => c.id === thin.id)).toBe(false);
    const impossible = criteria.slice(0, BOARD_SIZE).map(c => ({ ...c, test: () => false }));
    expect(reachableLine(impossible, data.pool, data), 'the line proof must reject an impossible board').toBe(false);
    const oneName = data.pool[0].name;
    const reused = criteria.slice(0, BOARD_SIZE).map(c => ({ ...c, test: (p: BingoPlayer) => p.name === oneName }));
    expect(reachableLine(reused, data.pool, data), 'the line proof must reject one player reused across a line').toBe(false);
  });
});

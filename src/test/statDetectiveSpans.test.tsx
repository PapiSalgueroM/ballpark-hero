/* Round 1145: a career span is the first and last season a man has ANY row for.
   The page reads only 500+ minute seasons, so the span comes from the view
   bref_nba_career_spans and never from those rows. Everything here runs the
   real fetchStatDetectiveData and the real page over a fake database client
   holding a small table: no network, no production. */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
interface FakeTable { rows: Row[]; failPage?: number; pageCap?: number }
const db: Record<string, FakeTable> = {};
const asked: string[] = [];

/* Just enough of the query builder for the two reads this page makes:
   from(t).select(cols).gte(col, n).order(col, { ascending }).range(a, b). */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const source = db[table];
      let rows = source ? [...source.rows] : [];
      const q = {
        select: () => q,
        gte: (col: string, min: number) => { rows = rows.filter(r => r[col] != null && Number(r[col]) >= min); return q; },
        order: (col: string, opts: { ascending: boolean }) => {
          rows.sort((a, b) => (a[col]! < b[col]! ? -1 : a[col]! > b[col]! ? 1 : 0) * (opts.ascending ? 1 : -1));
          return q;
        },
        range: (from: number, to: number) => {
          asked.push(`${table}:${from}`);
          if (!source) return Promise.resolve({ data: null, error: { message: 'relation does not exist' } });
          if (source.failPage === from / 1000) return Promise.resolve({ data: null, error: { message: 'fixture failure' } });
          const page = rows.slice(from, to + 1);
          return Promise.resolve({ data: source.pageCap ? page.slice(0, source.pageCap) : page, error: null });
        },
      };
      return q;
    },
  },
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

import StatDetective from '@/pages/StatDetective';
import {
  SPAN_NOT_ON_FILE, buildShareGrid, careerSpan, evaluateGuess, fetchStatDetectiveData, hintsFor, normalizeName,
  type MysterySeason,
} from '@/lib/statDetective';

const SEASONS = 'bref_nba_player_seasons';
const SPANS = 'bref_nba_career_spans';
let nextId = 1;
const seasonOf = (endYear: number) => `${endYear - 1}-${String(endYear % 100).padStart(2, '0')}`;
/* Season totals over `minutes`. star reads 94 and solid reads 72 on the game's own rating at 2,500 minutes. */
const line = (kind: 'star' | 'solid' | 'bench', minutes: number) =>
  kind === 'star' ? { minutes, pts: 2100, trb: 400, ast: 200, stl: 90, blk: 40 }
    : kind === 'solid' ? { minutes, pts: 1200, trb: 300, ast: 150, stl: 60, blk: 30 }
      : { minutes, pts: 90, trb: 40, ast: 20, stl: 5, blk: 3 };
const row = (name: string, endYear: number, kind: 'star' | 'solid' | 'bench', minutes: number, team = 'CHI', position = 'PF'): Row =>
  ({ id: nextId++, season: seasonOf(endYear), player_name: name, position, team, ...line(kind, minutes) });

/* The view's SQL, in JS: min and max of the season text per player_name. */
const spansOf = (rows: Row[]): Row[] => {
  const by = new Map<string, Row>();
  for (const r of rows) {
    const name = String(r.player_name);
    const season = String(r.season);
    const have = by.get(name);
    if (!have) by.set(name, { player_name: name, first_season: season, last_season: season, rows: 1 });
    else {
      if (season < String(have.first_season)) have.first_season = season;
      if (season > String(have.last_season)) have.last_season = season;
      have.rows = Number(have.rows) + 1;
    }
  }
  return [...by.values()];
};

/* The reported shape: 500+ minute seasons 1990 to 1996, then five seasons on the end of the bench to 2001. */
const FADED = 'Fixture Pivot Elm';
/* The mirror: two bench seasons first (1984, 1985), 500+ minutes from 1986 to 1990. */
const LATE = 'Fixture Wing Rowan';
/* A man the view will be made to lack. */
const UNFILED = 'Fixture Guard Sable';

function buildTable(): Row[] {
  nextId = 1;
  const rows: Row[] = [];
  // The load's own floors: 500 star seasons, 2,000 deep cuts, 800 names.
  for (let i = 0; i < 900; i++) {
    const name = `Fixture Filler ${String(i).padStart(4, '0')}`;
    rows.push(row(name, 1991, i < 620 ? 'star' : 'solid', 2500, 'BOS', 'SG'));
    for (const y of [1992, 1993, 1994]) rows.push(row(name, y, 'solid', 2500, 'BOS', 'SG'));
  }
  for (let y = 1990; y <= 1996; y++) rows.push(row(FADED, y, y === 1992 ? 'star' : 'solid', 2400, 'WSB'));
  for (let y = 1997; y <= 2001; y++) rows.push(row(FADED, y, 'bench', 240, 'BOS'));
  for (const y of [1984, 1985]) rows.push(row(LATE, y, 'bench', 310, 'DEN', 'SF'));
  for (let y = 1986; y <= 1990; y++) rows.push(row(LATE, y, 'solid', 2300, 'DEN', 'SF'));
  for (let y = 2003; y <= 2006; y++) rows.push(row(UNFILED, y, 'solid', 2200, 'MIA', 'PG'));
  for (const y of [2007, 2008]) rows.push(row(UNFILED, y, 'bench', 200, 'MIA', 'PG'));
  return rows;
}

beforeEach(() => {
  const rows = buildTable();
  db[SEASONS] = { rows };
  db[SPANS] = { rows: spansOf(rows) };
  asked.length = 0;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const mystery2000s: MysterySeason = {
  key: 'fixture|2000s', player: 'Fixture Filler 0001', season: '2003-04', endYear: 2004, decade: 2000, position: 'PF',
  team: 'BOS', teamName: 'Boston Celtics', franchise: 'celtics', minutes: 2500, pts: 1200, trb: 300, ast: 150, stl: 60, blk: 30, rating: 72,
};

describe('Stat Detective career spans come from every season, not the 500 minute ones', () => {
  it('reads the true first and last season for a man whose career ran past his 500 minute seasons', async () => {
    const data = await fetchStatDetectiveData();
    expect(data).not.toBeNull();
    const faded = data!.byName.get(normalizeName(FADED))!;
    // The fixture really has the reported shape: his 500+ minute seasons alone would read 1990-1996.
    const qualifying = db[SEASONS].rows.filter(r => r.player_name === FADED && Number(r.minutes) >= 500).map(r => String(r.season)).sort();
    expect([qualifying[0], qualifying[qualifying.length - 1]]).toEqual(['1989-90', '1995-96']);
    expect([faded.firstYear, faded.lastYear]).toEqual([1990, 2001]);
    expect(careerSpan(faded)).toBe('1990-2001');
    const late = data!.byName.get(normalizeName(LATE))!;
    expect(careerSpan(late)).toBe('1984-1990');
    // The clue the mystery gives after one miss is the same true span.
    const asMystery = data!.pools.stars.find(m => m.player === FADED)!;
    expect(hintsFor(asMystery, 1, faded)).toEqual([{ label: 'Career span', value: '1990-2001' }]);
    // Both reads were made, the spans in pages beside the seasons.
    expect(asked.filter(a => a.startsWith(`${SPANS}:`)).length).toBeGreaterThanOrEqual(2);
    expect(asked.filter(a => a.startsWith(`${SEASONS}:`)).length).toBeGreaterThanOrEqual(20);
  });

  it('judges the era of a guess on the true span', async () => {
    const data = await fetchStatDetectiveData();
    const faded = data!.byName.get(normalizeName(FADED))!;
    // He played until 2001, so against a 2000s mystery he is in the era. His 500 minute span ended in 1996, which would have said earlier.
    expect(evaluateGuess(faded, mystery2000s).era).toBe('match');
    const late = data!.byName.get(normalizeName(LATE))!;
    // He started in 1984, so against a 1970s mystery he is later; and against the 1980s he matches.
    expect(evaluateGuess(late, { ...mystery2000s, decade: 1970 }).era).toBe('later');
    expect(evaluateGuess(late, { ...mystery2000s, decade: 1980 }).era).toBe('match');
    expect(evaluateGuess(late, mystery2000s).era).toBe('earlier');
  });

  it('fails the whole load when the spans cannot be read, and never falls back to the 500 minute span', async () => {
    const rows = db[SPANS].rows;
    db[SPANS] = { rows, failPage: 0 };
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows, failPage: 3 };
    expect(await fetchStatDetectiveData()).toBeNull();
    delete db[SPANS]; // the view does not exist yet
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows: [] }; // readable but empty
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows, pageCap: 400 }; // every page cut short: most names never arrive
    expect(await fetchStatDetectiveData()).toBeNull();
    // More names than the page budget asks for: the last page comes back full, so the read is not known to be whole.
    const many = Array.from({ length: 8200 }, (_, i) => ({ player_name: `Fixture Crowd ${String(i).padStart(5, '0')}`, first_season: '1990-91', last_season: '1991-92', rows: 2 }));
    db[SPANS] = { rows: [...rows, ...many] };
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows }; // and it loads again once the view answers
    expect(await fetchStatDetectiveData()).not.toBeNull();
  });

  it('gives a name the view lacks no span at all and says so, rather than guessing one', async () => {
    db[SPANS] = { rows: db[SPANS].rows.filter(r => r.player_name !== UNFILED) };
    const data = await fetchStatDetectiveData();
    expect(data).not.toBeNull();
    const unfiled = data!.byName.get(normalizeName(UNFILED))!;
    expect([unfiled.firstYear, unfiled.lastYear]).toEqual([null, null]);
    expect(careerSpan(unfiled)).toBe('');
    const feedback = evaluateGuess(unfiled, mystery2000s);
    expect(feedback.era).toBe('unknown');
    expect(buildShareGrid([feedback])).toBe('⬜⬜⬜');
    const asMystery = data!.pools.deep.find(m => m.player === UNFILED)!;
    expect(hintsFor(asMystery, 1, unfiled)).toEqual([{ label: 'Career span', value: SPAN_NOT_ON_FILE }]);
    // Everyone else kept a real span.
    expect(data!.profiles.filter(p => p.firstYear === null).map(p => p.name)).toEqual([UNFILED]);
  });
});

/* FNV-1a over the pools as JSON: small, stable, and enough to say "byte identical". */
const digest = (text: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
};

describe('Stat Detective mysteries do not move with the span', () => {
  /* Recorded by running this same table through the lib as it stood on
     origin/release-ap-int (834e764a), before the spans read existed. The pools
     decide every mystery, so the same bytes mean the same cases for everyone. */
  const POOLS_BEFORE = { stars: 621, deep: 2995, digest: 'a0cafc74' };

  it('builds byte identical mystery pools, and they do not depend on what the view says', async () => {
    const data = await fetchStatDetectiveData();
    const json = JSON.stringify(data!.pools);
    if (process.env.STAT_SPANS_PRINT) console.log(`POOLS ${data!.pools.stars.length} ${data!.pools.deep.length} ${digest(json)}`);
    expect({ stars: data!.pools.stars.length, deep: data!.pools.deep.length, digest: digest(json) }).toEqual(POOLS_BEFORE);
    // Shift every span in the view by ten years: profiles move, the pools must not.
    db[SPANS] = { rows: db[SPANS].rows.map(r => ({ ...r, first_season: '1979-80' })) };
    const shifted = await fetchStatDetectiveData();
    expect(shifted!.byName.get(normalizeName(FADED))!.firstYear).toBe(1980);
    expect(JSON.stringify(shifted!.pools)).toBe(json);
  });
});

describe('the Stat Detective page over the same table', () => {
  it('opens its retry state when the spans cannot be read, and recovers when they can', async () => {
    const rows = db[SPANS].rows;
    db[SPANS] = { rows, failPage: 1 };
    const view = render(<StatDetective />);
    expect(await view.findByText("Couldn't open the case files right now.")).toBeTruthy();
    expect(view.queryByRole('button', { name: /^Stars/ })).toBeNull();
    db[SPANS] = { rows };
    fireEvent.click(view.getByRole('button', { name: 'Try again' }));
    expect(await view.findByRole('button', { name: /^Stars/ })).toBeTruthy();
  });

  it('prints the true years beside a name in the guess box', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = render(<StatDetective />);
    fireEvent.click(await view.findByRole('button', { name: /^Stars/ }));
    const box = view.getByRole('textbox', { name: 'Guess the mystery player' });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'Fixture Pivot' } });
    expect(view.getByRole('button', { name: `${FADED} 1990-2001` })).toBeTruthy();
    expect(view.queryByRole('button', { name: `${FADED} 1990-1996` })).toBeNull();
    fireEvent.change(box, { target: { value: 'Fixture Wing' } });
    expect(view.getByRole('button', { name: `${LATE} 1984-1990` })).toBeTruthy();
  });
});

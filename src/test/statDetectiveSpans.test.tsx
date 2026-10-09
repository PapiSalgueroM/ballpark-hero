/* Round 1145: a career span is the first and last season a man has ANY row for.
   The page reads only 500+ minute seasons, so the span comes from the view
   bref_nba_career_spans and never from those rows. A span belongs to a man,
   not to a name: two men can share one, and a namesake who never reached 500
   minutes must not stretch a famous career. Everything here runs the real
   fetchStatDetectiveData and the real page over a fake database client
   holding a small table: no network, no production. */
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
interface FakeTable { rows: Row[]; failPage?: number; failOnce?: Set<number>; pageCap?: number }
const db: Record<string, FakeTable> = {};
const asked: string[] = [];

/* Just enough of the query builder for the two reads this page makes:
   from(t).select(cols).gte(col, n).order(col, { ascending })[.order(...)].range(a, b).
   Orders apply in the order they were asked for and a null sorts last, as the
   API does it. */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const source = db[table];
      let rows = source ? [...source.rows] : [];
      const orders: [string, number][] = [];
      const q = {
        select: () => q,
        gte: (col: string, min: number) => { rows = rows.filter(r => r[col] != null && Number(r[col]) >= min); return q; },
        order: (col: string, opts: { ascending: boolean }) => { orders.push([col, opts.ascending ? 1 : -1]); return q; },
        range: (from: number, to: number) => {
          asked.push(`${table}:${from}`);
          if (!source) return Promise.resolve({ data: null, error: { message: 'relation does not exist' } });
          if (source.failPage === from / 1000) return Promise.resolve({ data: null, error: { message: 'fixture failure' } });
          if (source.failOnce?.delete(from / 1000)) return Promise.resolve({ data: null, error: { message: 'fixture hiccup' } });
          rows.sort((a, b) => {
            for (const [col, dir] of orders) {
              const x = a[col] as string | number | null | undefined, y = b[col] as string | number | null | undefined;
              if (x === y) continue;
              if (x == null) return 1;
              if (y == null) return -1;
              return (x < y ? -1 : 1) * dir;
            }
            return 0;
          });
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
  COHORT_GAP, MIN_MINUTES, SPAN_NOT_ON_FILE, buildShareGrid, careerSpan, careersFromSpanRows, evaluateGuess,
  fetchStatDetectiveData, hintsFor, normalizeName,
  type MysterySeason, type SpanRow,
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
/* cohort is the season's start year minus the listed age, so a man keeps one
   cohort for life. Everybody here is one man of cohort 1968 unless a test says
   otherwise; null is a row the source has no age for. */
const row = (name: string, endYear: number, kind: 'star' | 'solid' | 'bench', minutes: number, team = 'CHI', position = 'PF', cohort: number | null = 1968): Row =>
  ({ id: nextId++, season: seasonOf(endYear), player_name: name, position, team, age: cohort === null ? null : endYear - 1 - cohort, ...line(kind, minutes) });

/* The view's SQL, in JS. One row per player_name and cohort over the rows that
   have a name and a season shaped like '1989-90': min and max of the season
   text, a count, how many reach 500 minutes, and the distinct team codes.
   The first describe block below holds this copy to the same expected rows
   the migration's real SQL is held to by scripts/qa/rehearseCareerSpansView.mjs. */
const spansOf = (rows: Row[]): Row[] => {
  const by = new Map<string, { out: Row; teams: Set<string> }>();
  for (const r of rows) {
    if (r.player_name == null || typeof r.season !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(r.season)) continue;
    const name = String(r.player_name);
    const season = r.season;
    const cohort = r.age == null ? null : Number(season.slice(0, 4)) - Number(r.age);
    const key = `${name}|${cohort}`;
    let have = by.get(key);
    if (!have) {
      have = { out: { player_name: name, first_season: season, last_season: season, rows: 0, cohort, rows_500: 0, teams: null }, teams: new Set() };
      by.set(key, have);
    }
    if (season < String(have.out.first_season)) have.out.first_season = season;
    if (season > String(have.out.last_season)) have.out.last_season = season;
    have.out.rows = Number(have.out.rows) + 1;
    if (r.minutes != null && Number(r.minutes) >= 500) have.out.rows_500 = Number(have.out.rows_500) + 1;
    if (r.team != null) have.teams.add(String(r.team));
  }
  return [...by.values()].map(({ out, teams }) => ({ ...out, teams: teams.size ? [...teams].sort().join(',') : null }));
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

/* Rows of the view for names nobody plays as, to make it deeper than the pages the page asks for at once. */
const extraSpans = (prefix: string): Row[] => Array.from({ length: 8200 }, (_, i) => ({
  player_name: `${prefix} ${String(i).padStart(5, '0')}`, first_season: '1990-91', last_season: '1991-92', rows: 2, cohort: 1968, rows_500: 2, teams: 'BOS',
}));

/* Two men, one name. The famous one (cohort 1969) has 500+ minute seasons from 1992 to 2001 and is a Stars mystery;
   the other (cohort 1954) played 38 minutes in 1978 and never reached the floor. Read by name alone the rows run
   1977-78 to 2000-01. This is the shape the review of this round found among real names. */
const NAMESAKE = 'Fixture Forward Larch';
/* Two men, one name, and both reached the floor: one generous profile, as it always was. */
const SHARED = 'Fixture Guard Alder';
function namesakeRows(): Row[] {
  const rows: Row[] = [row(NAMESAKE, 1978, 'bench', 38, 'BUF', 'SF', 1954)];
  for (let y = 1992; y <= 2001; y++) rows.push(row(NAMESAKE, y, y === 1993 ? 'star' : 'solid', 2600, y <= 1996 ? 'CHH' : 'NYK', 'PF', 1969));
  for (let y = 1978; y <= 1987; y++) rows.push(row(SHARED, y, 'solid', 1900, 'KCK', 'SG', 1955));
  for (let y = 1982; y <= 1999; y++) rows.push(row(SHARED, y, 'solid', 1800, 'PHO', 'SF', 1959));
  return rows;
}
/* The main table is left exactly as it was recorded (the pools digest below depends on it); the namesakes join it
   only in the tests that ask for them. */
function useNamesakeTable() {
  const rows = buildTable();
  rows.push(...namesakeRows());
  db[SEASONS] = { rows };
  db[SPANS] = { rows: spansOf(rows) };
}

interface ViewCases { rows: Row[]; expected: SpanRow[]; careers: Record<string, { first: number; last: number; franchises: string[] }> }
const CASES = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/test/fixtures/careerSpansViewCases.json'), 'utf8')) as ViewCases;
const MIGRATION = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20261009_round_1145_bref_nba_career_spans.sql'), 'utf8').replace(/\r\n/g, '\n');
const byNameThenCohort = (a: Row, b: Row) => {
  const x = String(a.player_name), y = String(b.player_name);
  if (x !== y) return x < y ? -1 : 1;
  return Number(a.cohort ?? Infinity) - Number(b.cohort ?? Infinity);
};

describe('the spans view and what the page makes of its rows', () => {
  it("holds this file's copy of the view to the rows the migration's SQL is held to", () => {
    expect(spansOf(CASES.rows).sort(byNameThenCohort)).toEqual([...(CASES.expected as unknown as Row[])].sort(byNameThenCohort));
  });

  it('makes one career per name, out of the men who reached the floor and nobody else', () => {
    const careers = careersFromSpanRows(CASES.expected);
    const got = Object.fromEntries([...careers].map(([key, c]) => [key, { first: c.first, last: c.last, franchises: [...c.franchises].sort() }]));
    const want = Object.fromEntries(Object.entries(CASES.careers).map(([name, c]) => [normalizeName(name), c]));
    expect(got).toEqual(want);
  });

  it('cuts two men apart only past the cohort gap', () => {
    const man = (cohort: number, first: string, last: string, rows_500: number): SpanRow =>
      ({ player_name: 'Fixture Gap', first_season: first, last_season: last, cohort, rows_500, teams: 'BOS' });
    // At the gap they are one man, so the bench years count.
    expect(careersFromSpanRows([man(1970, '1992-93', '1995-96', 3), man(1970 + COHORT_GAP, '1996-97', '1998-99', 0)]).get('fixture gap'))
      .toMatchObject({ first: 1993, last: 1999 });
    // One year past it they are two, and the one under the floor is not him.
    expect(careersFromSpanRows([man(1970, '1992-93', '1995-96', 3), man(1970 + COHORT_GAP + 1, '1996-97', '1998-99', 0)]).get('fixture gap'))
      .toMatchObject({ first: 1993, last: 1996 });
  });

  it('counts the floor in the view at the number the page uses, and keeps the first draft columns first', () => {
    const sql = MIGRATION.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    expect([...sql.matchAll(/minutes\s*>=\s*(\d+)/g)].map(m => Number(m[1]))).toEqual([MIN_MINUTES]);
    expect(sql).toMatch(/select player_name,\s+min\(season\) as first_season,\s+max\(season\) as last_season,\s+count\(\*\)::int as rows,\s+cohort,/);
    expect(sql).toMatch(/group by player_name, cohort;/);
  });
});

describe('a career span belongs to a man, not to a name', () => {
  it('does not let a namesake who never reached 500 minutes stretch a famous career', async () => {
    useNamesakeTable();
    const data = await fetchStatDetectiveData();
    expect(data).not.toBeNull();
    const larch = data!.byName.get(normalizeName(NAMESAKE))!;
    // The fixture really has the shape: read by name alone his rows run 1977-78 to 2000-01.
    const all = db[SEASONS].rows.filter(r => r.player_name === NAMESAKE).map(r => String(r.season)).sort();
    expect([all[0], all[all.length - 1]]).toEqual(['1977-78', '2000-01']);
    expect(careerSpan(larch)).toBe('1992-2001');
    // He is a Stars mystery, and the first clue he gives is his own career.
    const asMystery = data!.pools.stars.find(m => m.player === NAMESAKE)!;
    expect(hintsFor(asMystery, 1, larch)).toEqual([{ label: 'Career span', value: '1992-2001' }]);
    // The other man's team is not his either.
    expect([...larch.franchises].sort()).toEqual(['hornets', 'knicks']);
    // Against a 1970s mystery he is later. Read by name he would have matched the era.
    expect(evaluateGuess(larch, { ...mystery2000s, decade: 1970 }).era).toBe('later');
  });

  it('keeps two men who both reached the floor as the one generous profile they always were', async () => {
    useNamesakeTable();
    const data = await fetchStatDetectiveData();
    const alder = data!.byName.get(normalizeName(SHARED))!;
    expect(careerSpan(alder)).toBe('1978-1999');
    expect([...alder.franchises].sort()).toEqual(['kings', 'suns']);
  });
});

describe('Stat Detective career spans come from every season, not the 500 minute ones', () => {
  it('counts every team he has a row for as a franchise he played for', async () => {
    const data = await fetchStatDetectiveData();
    const faded = data!.byName.get(normalizeName(FADED))!;
    // Washington for his 500 minute seasons, Boston for the bench years after. The 500 minute rows alone say one.
    const qualifying = new Set(db[SEASONS].rows.filter(r => r.player_name === FADED && Number(r.minutes) >= 500).map(r => String(r.team)));
    expect([...qualifying]).toEqual(['WSB']);
    expect([...faded.franchises].sort()).toEqual(['celtics', 'wizards']);
    const asMystery = data!.pools.stars.find(m => m.player === FADED)!;
    expect(hintsFor(asMystery, 3, faded)[2]).toEqual({ label: 'Career franchises', value: '2' });
    // A guess of his is told it shares a franchise with a Celtics mystery, which is true: he played there.
    expect(evaluateGuess(faded, mystery2000s).sharedFranchise).toBe(true);
  });

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
    delete db[SPANS]; // the view does not exist yet
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows: [] }; // readable but empty
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows, pageCap: 400 }; // a server that cuts pages short: the read stops early and most names never arrive
    expect(await fetchStatDetectiveData()).toBeNull();
    // A later page that keeps failing. The extra names sort after every real one, so each profile already has its
    // span by then and only the failed page can fail this: half a read is not a read.
    db[SPANS] = { rows: [...rows, ...extraSpans('Fixture Zed')], failPage: 7 };
    expect(await fetchStatDetectiveData()).toBeNull();
    db[SPANS] = { rows }; // and it loads again once the view answers
    expect(await fetchStatDetectiveData()).not.toBeNull();
  }, 30000);

  it('reads a view deeper than the pages it asks for at once to the end, and asks again for a page that failed once', async () => {
    // 8,200 extra names that sort BEFORE every real one push the real names onto the ninth and tenth pages, past the
    // six asked for together. Two pages hiccup once on the way.
    db[SPANS] = { rows: [...extraSpans('Fixture Aaa'), ...db[SPANS].rows], failOnce: new Set([2, 8]) };
    const data = await fetchStatDetectiveData();
    expect(data).not.toBeNull();
    expect(careerSpan(data!.byName.get(normalizeName(FADED))!)).toBe('1990-2001');
    expect(data!.profiles.filter(p => p.firstYear === null)).toEqual([]);
    expect(asked).toContain(`${SPANS}:9000`);
  }, 30000);

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
    // Only his 500 minute seasons are known, so a franchise count would be passed off as his career: not on file either.
    expect(hintsFor(asMystery, 3, unfiled)[2]).toEqual({ label: 'Career franchises', value: SPAN_NOT_ON_FILE });
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
    db[SPANS] = { rows, failPage: 0 };
    const view = render(<StatDetective />);
    // The reader asks twice more for a failed page (0.4 s, then 0.8 s) before it gives up, so the wait is longer than the default second.
    expect(await view.findByText("Couldn't open the case files right now.", {}, { timeout: 8000 })).toBeTruthy();
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

  it('prints the famous man his own years beside a name he shares', async () => {
    useNamesakeTable();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = render(<StatDetective />);
    fireEvent.click(await view.findByRole('button', { name: /^Stars/ }));
    const box = view.getByRole('textbox', { name: 'Guess the mystery player' });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'Fixture Forward' } });
    expect(view.getByRole('button', { name: `${NAMESAKE} 1992-2001` })).toBeTruthy();
    expect(view.queryByRole('button', { name: `${NAMESAKE} 1978-2001` })).toBeNull();
  });
});

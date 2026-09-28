/**
 * The mocks every daily reload driver shares. Import this module FIRST in
 * a driver file (before the page or hook under test) so the registrations
 * below are in place when the page's own imports resolve.
 *
 * What stays real, on purpose: the page or hook, useGameCompletion, the
 * restoredFinish handshake, dateUtils, streaks, the localStorage in jsdom,
 * and every record helper (the pool loaders are wrapped with importOriginal
 * so only the network call is replaced). What is mocked: the auth context
 * (signed out), the Supabase client (a chainable stub answering from
 * fixtures a driver registers), recordCompletion (a vi.fn the test counts),
 * badges and toasts (network and UI noise), the pool loaders, the edge
 * functions a driver registers, and Combat Chain's daily starter.
 *
 * The silent control lives here too: with DAILY_RELOAD_CONTROL=silent the
 * markRestoredFinish wrapper swallows the mark, so a route whose restore
 * depends on it records the completion again on every remount, which
 * assertion 4 must then see. So do Round 645 part three's three code
 * controls, each of which takes one piece of the lock out of the real code
 * path and counts every time it did (controlHits, per row):
 *   nolock    readDailyRecord refuses every read for one slug
 *             (DAILY_RELOAD_NOLOCK_SLUG, default football-timeline): that
 *             game's lock is gone and nothing else is touched
 *   nosave    writeArcadeProgress writes nothing: the arcade engine's mid
 *             run save is gone, the finished run is still filed
 *   restream  countedLehmer ignores the draws a part played run filed, so
 *             a resume restarts the spray stream from the top
 */
import { vi } from 'vitest';

type TableFixture = unknown[] | ((calls: string[]) => unknown[]);

const shared = vi.hoisted(() => {
  const tables = new Map<string, unknown>();
  const rpcs = new Map<string, unknown>();
  const pools = new Map<string, unknown>();
  const functions = new Map<string, unknown>();
  const silenced = { count: 0 };
  /* Round 645 part three: how often a code control changed the path, per
     row (the row the test is on when it happened). */
  const hits = new Map<string, number>();
  const row = { slug: '' };
  const hit = () => { hits.set(row.slug, (hits.get(row.slug) ?? 0) + 1); };

  const IGNORED = new Set(['toJSON', '$$typeof', 'constructor', 'asymmetricMatch', 'nodeType', 'length', 'name']);

  function resolve(root: string, table: string | null, calls: string[]) {
    if (root === 'from') {
      const fx = tables.get(table ?? '');
      const rows = typeof fx === 'function' ? (fx as (c: string[]) => unknown[])(calls) : Array.isArray(fx) ? fx : [];
      const mutating = calls.some(c => c === 'insert' || c === 'upsert' || c === 'update' || c === 'delete');
      const single = calls.some(c => c === 'single' || c === 'maybeSingle');
      const data = mutating && !calls.includes('select') ? null : single ? (rows[0] ?? null) : rows;
      return { data, error: null, count: rows.length, status: 200 };
    }
    if (root === 'rpc') return { data: rpcs.has(table ?? '') ? rpcs.get(table ?? '') : null, error: null };
    if (root === 'auth') return { data: { session: null, user: null }, error: null };
    return { data: null, error: null };
  }

  /* A chainable, thenable stub: any method returns the chain, awaiting it
     resolves to a PostgREST shaped result. The target is an arrow function
     (no prototype property) so the proxy invariants hold for a callable. */
  function build(root: string, table: string | null, calls: string[]): unknown {
    const target = () => undefined;
    return new Proxy(target, {
      get(_t, prop) {
        if (typeof prop === 'symbol' || IGNORED.has(prop)) return undefined;
        if (prop === 'then') {
          const settled = resolve(root, table, calls);
          return (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) => Promise.resolve(settled).then(onOk, onErr);
        }
        if (prop === 'from') return (t: unknown) => build('from', String(t), []);
        if (prop === 'rpc') return (name: unknown) => build('rpc', String(name), []);
        if (prop === 'auth') return build('auth', null, []);
        if (prop === 'channel') return (name: unknown) => build('channel', String(name), []);
        /* Round 645 part three: an edge function answers only when a driver
           registered it (setFunctionFixture); any other call throws exactly
           as the stub always did, so no other row changes. */
        if (prop === 'functions') {
          return {
            invoke: (name: unknown, opts?: { body?: unknown }) => {
              const fx = functions.get(String(name));
              if (fx === undefined) throw new TypeError(`supabase.functions.invoke('${String(name)}') has no fixture`);
              const data = typeof fx === 'function' ? (fx as (body: unknown) => unknown)(opts?.body) : fx;
              return Promise.resolve({ data, error: null });
            },
          };
        }
        return () => build(root, table, [...calls, String(prop)]);
      },
      apply() { return build(root, table, calls); },
    });
  }

  const auth = {
    user: null,
    session: null,
    profile: null,
    loading: false,
    signUp: async () => ({ error: null, session: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => undefined,
    refreshProfile: async () => undefined,
    updateProfile: async () => ({ error: null }),
  };

  return { recordCompletion: vi.fn(), tables, rpcs, pools, functions, silenced, hits, row, hit, auth, supabase: build('root', null, []) };
});

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: shared.supabase,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => shared.auth,
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/lib/completions', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/completions')>();
  return { ...real, recordCompletion: shared.recordCompletion, getCurrentPlayerName: () => 'Tester' };
});

vi.mock('@/lib/badges', () => ({
  BADGE_DEFS: [],
  getBadgeState: () => Promise.resolve([]),
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));

vi.mock('sonner', () => {
  const quiet = () => undefined;
  const toast = Object.assign(quiet, { success: quiet, error: quiet, info: quiet, warning: quiet, message: quiet, dismiss: quiet });
  return { toast, Toaster: () => null };
});

vi.mock('@/lib/restoredFinish', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/restoredFinish')>();
  return {
    ...real,
    markRestoredFinish: (slug: string) => {
      if (process.env.DAILY_RELOAD_CONTROL === 'silent') { shared.silenced.count += 1; return; }
      real.markRestoredFinish(slug);
    },
  };
});

vi.mock('@/lib/nbaStatLine', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/nbaStatLine')>();
  return {
    ...real,
    fetchNbaStatLinePool: () => Promise.resolve((shared.pools.has('nbaStatLine') ? shared.pools.get('nbaStatLine') : null) as never),
  };
});

vi.mock('@/lib/squadDeal', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/squadDeal')>();
  return {
    ...real,
    fetchSquadPool: (...args: unknown[]) => {
      const fx = shared.pools.get('squad');
      return Promise.resolve((typeof fx === 'function' ? fx(...args) : fx ?? []) as never);
    },
  };
});

vi.mock('@/lib/sportsMillionaire', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/sportsMillionaire')>();
  return {
    ...real,
    loadMillionairePool: (mode: 'daily' | 'unlimited') => {
      const fx = shared.pools.get('millionaire');
      return Promise.resolve((typeof fx === 'function' ? fx(mode, real) : fx ?? { pool: null, ladder: [] }) as never);
    },
  };
});

/* Round 645 part three: the two pool readers behind Pack Battle and Rarity
   Round, wrapped the same way. With no fixture registered the real loader
   runs (and answers from the Supabase stub), so no other row changes. */
vi.mock('@/lib/packBattle', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/packBattle')>();
  return {
    ...real,
    fetchPackPool: () => {
      const fx = shared.pools.get('pack');
      return fx ? Promise.resolve(fx as never) : real.fetchPackPool();
    },
  };
});

vi.mock('@/lib/rarityRound', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/rarityRound')>();
  return {
    ...real,
    CATEGORIES: real.CATEGORIES.map(c => ({
      ...c,
      fetchPool: () => {
        const fx = shared.pools.get('rarity');
        return fx ? Promise.resolve(fx as never) : c.fetchPool();
      },
    })),
  };
});

/* Combat Chain's daily starter, pinned while a 'ufcStarter' fixture is
   registered. The real pick is a hash of the day, and nine of its sixty
   possible starters have no recorded winner in the bundled results, so on
   those days no link can be added and a row that has to play one link would
   be red for the calendar rather than for the code. With no fixture the real
   pick runs. */
vi.mock('@/data/ufcChainData', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/ufcChainData')>();
  return {
    ...real,
    getDailyStartingFighter: (...args: Parameters<typeof real.getDailyStartingFighter>) => {
      const fx = shared.pools.get('ufcStarter');
      return (fx ?? real.getDailyStartingFighter(...args)) as ReturnType<typeof real.getDailyStartingFighter>;
    },
  };
});

/* Round 645 part three, two of the code controls on the arcade engine's
   record. restream: the spray stream restarts from the top on a resume
   instead of carrying on from the draws the part played run filed, the shape
   of the regression (every remaining shot sprayed with numbers the player
   has already seen), which assertion 6's final comparison must catch on
   every arcade row. nosave: the per shot save is gone, so a run walked away
   from is dealt again from the first shot, which assertion 6 must catch the
   moment the part played run leaves no record. */
vi.mock('@/lib/arcadeRecord', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/arcadeRecord')>();
  return {
    ...real,
    countedLehmer: (seed: number, skip = 0) => {
      if (process.env.DAILY_RELOAD_CONTROL === 'restream' && skip > 0) {
        shared.hit();
        return real.countedLehmer(seed, 0);
      }
      return real.countedLehmer(seed, skip);
    },
    writeArcadeProgress: (...args: Parameters<typeof real.writeArcadeProgress>) => {
      if (process.env.DAILY_RELOAD_CONTROL === 'nosave') { shared.hit(); return; }
      real.writeArcadeProgress(...args);
    },
  };
});

/* Round 645 part three, the landing control: scripts/simDailyReload.mjs
   writes a copy of the Free Kick board with its per kick save moved from
   the strike to where the ball lands (the shape the career drills had since
   Round 468) and points DAILY_RELOAD_FREEKICK_BOARD at it. Assertion 7 must
   go red on free-kick alone. Off in every ordinary run. */
vi.mock('@/components/free-kick/FreeKickBoard', async (importOriginal) => {
  const copy = process.env.DAILY_RELOAD_FREEKICK_BOARD;
  if (!copy) return importOriginal();
  console.log(`DAILY_RELOAD_BOARD_SWAP free-kick ${copy}`);
  return import(/* @vite-ignore */ copy);
});

/* Round 645 part three, the nolock code control: one game's lock taken out
   by refusing every read of its record, which every game on the Round 428
   helper (and the arcade and chain records built on it) goes through. The
   writes stay, so the finish is still filed; only the lock is gone. */
vi.mock('@/lib/dailyRecord', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/dailyRecord')>();
  return {
    ...real,
    readDailyRecord: (...args: Parameters<typeof real.readDailyRecord>) => {
      const target = process.env.DAILY_RELOAD_NOLOCK_SLUG || 'football-timeline';
      if (process.env.DAILY_RELOAD_CONTROL === 'nolock' && args[0] === target) { shared.hit(); return null; }
      return real.readDailyRecord(...args);
    },
  };
});

/* The shared search box, replaced only while an 'autocomplete' fixture is
   registered: a plain input plus one "pick <name>" button per fixture
   entity, so a driver can hand a page the entity a real search would have
   resolved without the debounce, the network and the dropdown. Every other
   row renders the real component. */
vi.mock('@/components/game/PlayerAutocomplete', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/game/PlayerAutocomplete')>();
  const { createElement } = await import('react');
  type Props = Parameters<typeof real.PlayerAutocomplete>[0];
  function Stub(props: Props) {
    const entities = shared.pools.get('autocomplete') as Array<{ key: string; name: string }> | undefined;
    if (!entities) return createElement(real.PlayerAutocomplete, props);
    return createElement(
      'div',
      { 'data-testid': 'autocomplete-stub' },
      createElement('input', {
        'aria-label': 'Search for a player',
        value: props.value,
        placeholder: props.placeholder ?? '',
        onChange: (e: { target: { value: string } }) => props.onChange(e.target.value),
      }),
      ...entities.map(e => createElement('button', { key: e.key, type: 'button', onClick: () => props.onSelect(e as never) }, `pick ${e.name}`)),
    );
  }
  return { ...real, PlayerAutocomplete: Stub, default: Stub };
});

/* jsdom has no layout: scrollIntoView is missing outright (a call throws)
   and scrollTo logs "not implemented" on every reveal. Neither is under
   test. */
if (typeof window !== 'undefined') {
  window.scrollTo = () => undefined;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined;
}

/** The recorder the test counts: exactly one call per row, ever. */
export const recordCompletion = shared.recordCompletion;

/** Rows a `supabase.from(table)` chain resolves to, or a function of the
 *  chained method names (['select', 'eq', 'order']) returning them. */
export function setTableFixture(table: string, rows: TableFixture): void {
  shared.tables.set(table, rows);
}

/** What `supabase.rpc(name)` resolves to as data. */
export function setRpcFixture(name: string, value: unknown): void {
  shared.rpcs.set(name, value);
}

/** The wrapped loaders. 'nbaStatLine': the StatLineSeason[] pool (or
 *  null for the error state). 'squad': the Player[] fetchSquadPool resolves,
 *  or a function of its arguments. 'millionaire': the {pool, ladder}
 *  loadMillionairePool resolves, or a function (mode, realLib) => that.
 *  'pack': the PackCard[] fetchPackPool resolves. 'rarity': the PoolEntry[]
 *  every Rarity Round category's fetchPool resolves. 'autocomplete': the
 *  PlayerEntity[] the stubbed search box offers as pick buttons.
 *  'ufcStarter': the UfcFighter Combat Chain's daily deals. */
export function setPoolFixture(name: 'nbaStatLine' | 'squad' | 'millionaire' | 'pack' | 'rarity' | 'autocomplete' | 'ufcStarter', value: unknown): void {
  shared.pools.set(name, value);
}

/** What `supabase.functions.invoke(name, {body})` resolves to as data, or a
 *  function of the body returning it. Unregistered names throw. */
export function setFunctionFixture(name: string, value: unknown): void {
  shared.functions.set(name, value);
}

/** How many marks the silent control swallowed so far. */
export function silencedMarks(): number {
  return shared.silenced.count;
}

/** How many times a code control (nolock, nosave, restream) changed the
 *  path while the test was on this row. */
export function controlHits(slug: string): number {
  return shared.hits.get(slug) ?? 0;
}

/** Called by the test at the start of every row. */
export function resetMocks(slug = ''): void {
  shared.tables.clear();
  shared.rpcs.clear();
  shared.pools.clear();
  shared.functions.clear();
  shared.recordCompletion.mockClear();
  shared.row.slug = slug;
}

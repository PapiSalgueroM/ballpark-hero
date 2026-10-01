/**
 * Round 745: a trailing slash never changes what a page shows.
 *
 * Codex's Round 741 live audit (2026-09-30) opened /soccer-career/ and
 * /club-manager/ in fresh browser contexts: the saved page the host served
 * carried the guide, then React mounted and the 11,086 and 15,345 character
 * articles and every FAQ question disappeared, because GameSeoContent looked
 * the raw location.pathname up in the registry and the guide loader and found
 * nothing for the slash spelling. The same raw read sat in GameHelp, GameShell,
 * RulesGate, GameNav, TopTicker and Header.
 *
 * These tests mount the REAL components at both spellings and require the
 * same result. Negative control: in src/components/seo/GameSeoContent.tsx put
 * `const path = useLocation().pathname;` back (with its import) and the guide
 * test fails on the slash form; in GameNav put `location.pathname` back and
 * the nav test fails.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { normalizeRoutePath } from '@/lib/routePath';

const H = vi.hoisted(() => ({ loads: [] as string[] }));

vi.mock('@/data/gameContent/loader', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/gameContent/loader')>();
  return {
    ...real,
    loadGameContent: (path: string) => {
      H.loads.push(path);
      return real.loadGameContent(path);
    },
  };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain(table);
    },
    apply() { return chain(table); },
  });
  const supabase = {
    from: (table: string) => chain(table),
    rpc: () => chain('rpc'),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});

import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNav } from '@/components/game/GameNav';
import { GameHelp } from '@/components/game/GameHelp';

const mount = (path: string, el: JSX.Element) =>
  render(<HelmetProvider><MemoryRouter initialEntries={[path]}>{el}</MemoryRouter></HelmetProvider>);

afterEach(() => cleanup());

describe('normalizeRoutePath', () => {
  it('strips a trailing slash, collapses doubled ones, keeps the home page', () => {
    expect(normalizeRoutePath('/soccer-career/')).toBe('/soccer-career');
    expect(normalizeRoutePath('/soccer-career//')).toBe('/soccer-career');
    expect(normalizeRoutePath('//club-manager/')).toBe('/club-manager');
    expect(normalizeRoutePath('/club-manager')).toBe('/club-manager');
    expect(normalizeRoutePath('/')).toBe('/');
    expect(normalizeRoutePath('')).toBe('/');
  });
});

describe('a trailing slash keeps the page whole (Round 745)', () => {
  it('the guide block loads the same guide at /soccer-career/ as at /soccer-career', async () => {
    const bare = mount('/soccer-career', <GameSeoContent title="Soccer Career" description="d" />);
    await waitFor(() => expect(bare.container.textContent!.length).toBeGreaterThan(5000), { timeout: 15000 });
    const bareText = bare.container.textContent!;
    cleanup();
    const slash = mount('/soccer-career/', <GameSeoContent title="Soccer Career" description="d" />);
    await waitFor(() => expect(slash.container.textContent!.length).toBeGreaterThan(5000), { timeout: 15000 });
    expect(slash.container.textContent).toBe(bareText);
    expect(H.loads.filter(p => p.endsWith('/'))).toEqual([]);
  });

  it('the help button asks the loader for the bare route at /club-manager/', async () => {
    H.loads.length = 0;
    mount('/club-manager/', <GameHelp />);
    await waitFor(() => expect(H.loads.length).toBeGreaterThan(0));
    expect(H.loads).toContain('/club-manager');
    expect(H.loads.filter(p => p.endsWith('/'))).toEqual([]);
  });

  it('the game nav offers the same links at /soccer-career/ as at /soccer-career', () => {
    const hrefs = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('a')).map(a => a.getAttribute('href')).sort();
    const bare = mount('/soccer-career', <GameNav />);
    const bareLinks = hrefs(bare.container);
    cleanup();
    const slash = mount('/soccer-career/', <GameNav />);
    expect(bareLinks.length).toBeGreaterThan(0);
    expect(hrefs(slash.container)).toEqual(bareLinks);
  });
});

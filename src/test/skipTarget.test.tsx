/**
 * Skip to main content lands somewhere on every page.
 *
 * Round 848, from the other lane's audit (QA847-04). App.tsx draws one
 * "Skip to main content" link at the top of every page, pointing at
 * #dukb-main, and each page owns that target: GameShell gives its <main> the
 * id, and pages drawn without the shell carry it themselves. Nineteen did not
 * (seventeen games, reset-password and the 404), so on /free-kick Enter on the
 * link moved nothing.
 *
 * This file mounts the REAL page of every address in public/sitemap.xml, plus
 * /reset-password and an unknown address, resolving each one through the route
 * table in App.tsx exactly as the app does (component, string props, the *
 * fallback), and requires exactly one element whose id the skip link names:
 * none means the link goes nowhere, two means it may land on the wrong one.
 * It also requires the link itself, once, in App.tsx.
 *
 * scripts/simDailySaveHardening.mjs runs this file and carries the negative
 * control R848_CONTROL=skip, which removes the target from a copy of the Free
 * Kick page: that row, and only that row, must go red.
 */
import './dailyReload/mocks';
import { act, cleanup, render } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ComponentType } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resetMocks } from './dailyReload/mocks';

const ROOT = process.cwd();
const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const sitemap = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');

/* The skip link and the id it points at, read off App.tsx. */
const links = [...app.matchAll(/<a href="#([\w-]+)" className="dukb-skip-link">/g)];
const TARGET = links[0]?.[1] ?? '';

/* Component name to page module: lazy routes and the two eager imports. */
const modules = new Map<string, string>();
for (const m of app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/pages\/([\w/]+)"\)\)/g)) modules.set(m[1], m[2]);
for (const m of app.matchAll(/^import (\w+) from "\.\/pages\/([\w/]+)";/gm)) modules.set(m[1], m[2]);

type Route = { path: string; component: string; props: Record<string, string> };
const routes: Route[] = [...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)((?:\s+\w+="[^"]*")*)\s*\/>\}/g)].map((m) => ({
  path: m[1],
  component: m[2],
  props: Object.fromEntries([...m[3].matchAll(/(\w+)="([^"]*)"/g)].map((p) => [p[1], p[2]])),
}));
const fallback = routes.find((r) => r.path === '*');

const addresses = [
  ...[...sitemap.matchAll(/<loc>https:\/\/douknowball\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/'),
  '/reset-password',
  '/no-such-page-r848',
];
const ONLY = process.env.ONLY || '';

async function settle() {
  for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

const counts: Record<string, number> = {};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.01234);
  localStorage.clear();
  resetMocks();
});

describe('skip to main content', () => {
  it('App.tsx draws the link once', () => {
    expect(links).toHaveLength(1);
    expect(TARGET).toBe('dukb-main');
  });

  for (const address of addresses.filter((a) => !ONLY || a === ONLY)) {
    it(address, async () => {
      const route = routes.find((r) => r.path === address) ?? fallback;
      expect(route, 'a route answers the address').toBeDefined();
      expect(route!.component, 'the address is a page, not a redirect').not.toBe('Navigate');
      const file = modules.get(route!.component);
      expect(file, `${route!.component} resolves to a page module`).toBeDefined();
      const Page = (await import(/* @vite-ignore */ `@/pages/${file}`)).default as ComponentType<Record<string, string>>;
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const view = render(
        <HelmetProvider>
          <QueryClientProvider client={client}>
            <TooltipProvider>
              <MemoryRouter initialEntries={[address]}>{createElement(Page, route!.props)}</MemoryRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </HelmetProvider>,
      );
      await settle();
      const found = view.container.querySelectorAll(`[id="${TARGET}"]`).length;
      counts[address] = found;
      /* The shared Supabase stub hands back no auth subscription, so a page
         that unsubscribes on unmount (reset-password) throws here. The count
         above is already taken; the teardown is the stub's, not the page's. */
      try { view.unmount(); } catch { /* stub teardown */ }
      cleanup();
      expect(found, `${address} has exactly one #${TARGET}`).toBe(1);
    }, 30000);
  }

  afterAll(() => {
    console.log(`R848_SKIP ${JSON.stringify(counts)}`);
  });
});

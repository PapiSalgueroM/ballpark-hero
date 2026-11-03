import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ComponentType, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createCareer, applyAction, type GrandPrixCareer, type GrandPrixAction } from '@/lib/grandPrixBoss';

const pageFile = path.resolve(process.env.GP_BOSS_PAGE_FILE || 'src/pages/GrandPrixBoss.tsx');
const present = fs.existsSync(pageFile);
const start = vi.fn((_seed: number) => true);
const dispatch = vi.fn((_action: GrandPrixAction) => true);
const reload = vi.fn();
let current: { career: GrandPrixCareer | null; status: string; message: string; moved: boolean; start: typeof start; dispatch: typeof dispatch; reload: typeof reload };
let Page: ComponentType | null = null;
if (present) {
  vi.doMock('@/hooks/useGrandPrixBoss', () => ({ useGrandPrixBoss: () => current }));
  vi.doMock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
  vi.doMock('@/components/seo/PageSeo', () => ({ default: () => null }));
  vi.doMock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
  Page = (await import(pathToFileURL(pageFile).href)).default;
}
const check = present ? it : it.skip;
function show() {
  expect(Page).toBeTypeOf('function');
  const Drawing = Page;
  if (!Drawing) throw new Error('Actual page module is unavailable');
  return render(<MemoryRouter initialEntries={['/grand-prix-boss']}><Drawing /></MemoryRouter>);
}
function ready() {
  current.career = createCareer(42);
  current.status = 'ready';
  return current.career;
}
beforeEach(() => {
  cleanup(); localStorage.clear();
  localStorage.setItem('rules-gate-seen:/grand-prix-boss', '1');
  start.mockClear(); dispatch.mockClear(); reload.mockClear();
  current = { career: null, status: 'empty', message: '', moved: false, start, dispatch, reload };
});

describe('Grand Prix Boss management page', () => {
  it('GP_PAGE_AVAILABLE: the actual playable page module exists', () => {
    expect(present, 'GP_PAGE_MODULE_MISSING: no racing management page is implemented').toBe(true);
  });
  check('GP_PAGE_START: shows a fictional-world start without silently creating a career', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Grand Prix Boss', level: 1 })).toBeVisible();
    expect(screen.getByText(/fictional teams, drivers and tracks/i)).toBeVisible();
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start your team' }));
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0]).toEqual(expect.any(Number));
  });
  check('GP_PAGE_HUB: offers the six management screens and the next race', () => {
    ready(); show();
    for (const name of ['Next race', 'Drivers', 'Car', 'Finances', 'Standings', 'History']) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Next race' }));
    expect(screen.getByRole('button', { name: 'Run qualifying' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Run qualifying' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'qualify', expectedRevision: 0 });
  });
  check('GP_PAGE_UPGRADE: sends the displayed revision and preserves the quoted engine price', () => {
    const career = ready(); show();
    fireEvent.click(screen.getByRole('button', { name: 'Car' }));
    expect(screen.getByTestId('gp-power-cost').textContent).toContain(career.upgradeCosts.power!.toLocaleString('en-US'));
    fireEvent.click(screen.getByRole('button', { name: 'Improve power' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'upgrade', area: 'power', expectedRevision: career.revision });
    expect(career.revision).toBe(0);
  });
  check('GP_PAGE_ORDERS: sends one native strategy order for each contracted driver', () => {
    const career = ready();
    const qualified = applyAction(career, { type: 'qualify', expectedRevision: career.revision });
    expect(qualified.ok).toBe(true);
    if (!qualified.ok) throw new Error('Actual qualifying fixture refused');
    current.career = qualified.state;
    show(); fireEvent.click(screen.getByRole('button', { name: 'Next race' }));
    const drivers = qualified.state.drivers.filter(driver => driver.contract?.teamId === career.teamId);
    for (const driver of drivers) {
      expect(screen.getByLabelText(`Tyres for ${driver.name}`)).toBeVisible();
      fireEvent.change(screen.getByLabelText(`Tyres for ${driver.name}`), { target: { value: 'hard' } });
      fireEvent.change(screen.getByLabelText(`Pace for ${driver.name}`), { target: { value: 'conserve' } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Start race' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'startRace', expectedRevision: qualified.state.revision,
      setups: drivers.map(driver => ({ driverId: driver.id, compound: 'hard', pace: 'conserve' })) });
  });
  check('GP_PAGE_STANDINGS: shows separate driver and team championships from held totals', () => {
    const career = ready(); show();
    fireEvent.click(screen.getByRole('button', { name: 'Standings' }));
    expect(screen.getByRole('heading', { name: 'Driver standings' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Team standings' })).toBeVisible();
    expect(screen.getByText(career.teams[0].name)).toBeVisible();
  });
  check('GP_PAGE_BACK: returns focus to the management tile after closing a screen', async () => {
    ready(); show();
    const opener = screen.getByRole('button', { name: 'Finances' });
    opener.focus(); fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Back to team' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Finances' })));
  });
  check('GP_PAGE_MOVED_EMPTY: offers reload when another tab starts the previously empty team', () => {
    current.moved = true;
    show();
    expect(screen.queryByRole('button', { name: 'Start your team' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reload saved team' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });
  check('GP_PAGE_PROTECTED_SAVE: preserves unsupported-save controls and offers reload', () => {
    current.status = 'unsupported';
    current.message = 'This save was made by a newer version.';
    show();
    expect(screen.getByText('This save was made by a newer version.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Start your team' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reload saved team' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });
});

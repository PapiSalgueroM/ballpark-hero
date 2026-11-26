import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AlphabetSprint from '@/pages/AlphabetSprint';
import { safeLocalStorage } from '@/lib/safeStorage';
import {
  currentPilotPrompt, pilotScore, pilotStorageKey, readPilotRun, updatePilotRun,
  type PilotMode, type PilotSport,
} from '@/lib/sportChallengePilot';

const external = vi.hoisted(() => ({ pool: vi.fn(), share: vi.fn() }));
vi.mock('@/lib/alphabetSprint', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/alphabetSprint')>(),
  fetchSprintPool: external.pool,
}));
vi.mock('@/lib/share', () => ({ shareResult: external.share }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => '', recordCompletion: vi.fn() }));

const START = Date.parse('2026-06-14T16:00:00.000Z');
const PREVIEW = '/alphabet-sprint?preview=finals';
const dailyKey = pilotStorageKey('soccer', 'daily');
const practiceKey = pilotStorageKey('nba', 'practice');
const previousLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
let now = START;

beforeEach(() => {
  now = START;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  external.pool.mockResolvedValue([]);
  external.share.mockClear();
});

afterEach(() => {
  cleanup();
  if (previousLocks) Object.defineProperty(navigator, 'locks', previousLocks);
  else Reflect.deleteProperty(navigator, 'locks');
  safeLocalStorage.removeItem(dailyKey);
  safeLocalStorage.removeItem(practiceKey);
  vi.restoreAllMocks();
  external.pool.mockClear();
});

function show(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AlphabetSprint /></MemoryRouter>);
}

function activeClue() {
  return within(screen.getByRole('region', { name: 'Current round' })).getByRole('heading');
}

function receipt(sport: PilotSport = 'soccer', mode: PilotMode = 'daily') {
  return readPilotRun(safeLocalStorage.getItem(pilotStorageKey(sport, mode)), sport, mode, now)!;
}

function submit(team: string) {
  const input = screen.getByRole('textbox', { name: 'Team name' }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: team } });
  fireEvent.submit(input.form!);
}

describe('Alphabet Sprint Finals preview', () => {
  it('opens from the standard game even if its player pool cannot load and restores selector focus', async () => {
    show('/alphabet-sprint');

    expect(await screen.findByRole('heading', { name: /^alphabet sprint$/i })).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Try the Finals Sprint preview' }));

    expect(await screen.findByRole('heading', { name: 'Finals Sprint preview' })).toBeVisible();
    expect(external.pool).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/correct 15-point answer/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'How to play Finals Sprint' }));
    const guide = await screen.findByRole('dialog', { name: 'Finals Sprint rules' });
    expect(guide).toHaveTextContent('Defer sends one clue to the end');
    fireEvent.click(within(guide).getByRole('button', { name: /let’s play|let's play/i }));

    fireEvent.click(screen.getByRole('button', { name: 'NBA' }));
    expect(screen.getByRole('button', { name: 'NBA' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'NBA' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }));
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
    expect(activeClue()).toHaveTextContent(/NBA Finals/);
    expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveFocus();
    expect(screen.getByRole('timer')).toHaveTextContent('60s');
  });

  it('restores a daily answer and defer after remount, then shares only the completed score', async () => {
    const mounted = show(PREVIEW);
    fireEvent.click(await screen.findByRole('button', { name: 'Start daily preview' }));

    const first = currentPilotPrompt(receipt())!;
    submit(first.finalists[0]);
    expect(receipt().answers).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('earns');
    fireEvent.click(screen.getByRole('button', { name: 'Defer clue' }));
    const next = currentPilotPrompt(receipt())!;
    expect(screen.getByRole('button', { name: 'Defer used' })).toBeDisabled();

    mounted.unmount();
    now = START + 12000;
    show(PREVIEW);
    expect(await screen.findByRole('heading', { name: next.text })).toBeVisible();
    expect(screen.getByRole('timer')).toHaveTextContent('48s');
    expect(screen.getByRole('button', { name: 'Defer used' })).toBeDisabled();

    now = START + 60001;
    fireEvent(window, new Event('focus'));
    const result = await screen.findByRole('region', { name: 'Round results' });
    expect(within(result).getByRole('heading')).toHaveTextContent(first.points + ' points');
    expect(within(result).getByRole('heading')).toHaveFocus();
    expect(JSON.parse(localStorage.getItem(dailyKey)!).completed).toBe(true);
    expect(screen.queryByRole('button', { name: 'Start daily preview' })).toBeNull();
    fireEvent.click(within(result).getByText('Show recap and sources'));
    expect(within(result).getAllByRole('link', { name: /^Source for/ })).toHaveLength(6);
    expect(within(result).getByText(new RegExp(first.finalists[0] + ' ·'))).toBeVisible();

    fireEvent.click(within(result).getByRole('button', { name: 'Share score' }));
    expect(external.share).toHaveBeenCalledExactlyOnceWith(
      'Soccer Finals Sprint · Daily preview\n' + pilotScore(receipt()) + ' points',
      'Finals Sprint preview',
    );

    const completedDay = receipt().day;
    now = START + 86400000;
    fireEvent(window, new Event('focus'));
    fireEvent.click(await screen.findByRole('button', { name: 'Start daily preview' }));
    expect(receipt().day).not.toBe(completedDay);
    expect(receipt().answers).toHaveLength(0);
  });

  it('checks a queued typed answer against the latest locked clue before crediting it', async () => {
    const queue: Array<() => void> = [];
    const request = vi.fn((_key: string, callback: () => void) => new Promise<void>(resolve => {
      queue.push(() => { callback(); resolve(); });
    }));
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    show(PREVIEW);
    fireEvent.click(await screen.findByRole('button', { name: 'Start daily preview' }));
    expect(request).toHaveBeenLastCalledWith(dailyKey, expect.any(Function));
    act(() => queue.shift()!());

    const visible = receipt();
    const oldClue = currentPilotPrompt(visible)!;
    submit(oldClue.finalists[0]);
    const fromAnotherTab = updatePilotRun(visible, { type: 'defer' }, now).run;
    localStorage.setItem(dailyKey, JSON.stringify(fromAnotherTab));

    act(() => queue.shift()!());
    expect(activeClue()).toHaveTextContent(currentPilotPrompt(fromAnotherTab)!.text);
    expect(screen.getByRole('status')).toHaveTextContent('The clue changed');
    expect(receipt()).toEqual(fromAnotherTab);
    expect(pilotScore(receipt())).toBe(0);
  });

  it('retains the daily clue and typed answer when storage is full, then credits the successful retry once', async () => {
    const write = Storage.prototype.setItem;
    let denied = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (denied && key === dailyKey) throw new DOMException('Storage full', 'QuotaExceededError');
      write.call(this, key, value);
    });
    show(PREVIEW);
    const start = await screen.findByRole('button', { name: 'Start daily preview' });
    fireEvent.click(start);
    expect(screen.getByRole('alert')).toHaveTextContent('could not start');
    expect(localStorage.getItem(dailyKey)).toBeNull();
    denied = false;
    fireEvent.click(start);
    const first = currentPilotPrompt(receipt())!;
    denied = true;
    submit(first.finalists[0]);
    expect(screen.getByRole('alert')).toHaveTextContent('could not save this move');
    expect(activeClue()).toHaveTextContent(first.text);
    expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveValue(first.finalists[0]);
    expect(receipt().answers).toHaveLength(0);
    denied = false;
    submit(first.finalists[0]);
    expect(receipt().answers).toHaveLength(1);
    denied = true;
    now += 61000;
    fireEvent(window, new Event('focus'));
    expect(await screen.findByRole('region', { name: 'Round results' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem(dailyKey)!).completed).toBe(false);
    denied = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving result' }));
    expect(JSON.parse(localStorage.getItem(dailyKey)!).completed).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(pilotScore(receipt())).toBe(first.points);
  });

  it('keeps the practice round playable and replayable when the browser refuses storage writes', async () => {
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === practiceKey) throw new DOMException('Storage full', 'QuotaExceededError');
      write.call(this, key, value);
    });
    show(PREVIEW + '&sport=nba&mode=practice');
    fireEvent.click(await screen.findByRole('button', { name: 'Start practice' }));
    expect(localStorage.getItem(practiceKey)).toBeNull();
    submit(currentPilotPrompt(receipt('nba', 'practice'))!.finalists[0]);
    expect(receipt('nba', 'practice').answers).toHaveLength(1);

    now = START + 60001;
    fireEvent(window, new Event('focus'));
    fireEvent.click(await screen.findByRole('button', { name: 'Play again' }));
    expect(receipt('nba', 'practice').answers).toHaveLength(0);
    expect(activeClue()).toBeVisible();
    expect(screen.getByRole('timer')).toHaveTextContent('60s');
  });
});

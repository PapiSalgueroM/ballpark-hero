import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import AttackMap from './AttackMap';
import SoccerAttackBoard from './SoccerAttackBoard';
import SoccerConquest from '@/pages/SoccerConquest';
import { makeSoccerAttackSetup } from '@/data/soccerAttack';
import { SOCCER_IMPERIALISM } from '@/data/soccerConquest';
import { advanceAttack, createAttack, type AttackSetup, type AttackState } from '@/lib/conquestAttack';
import { ATTACK_SAVE_KEY } from '@/lib/conquestAttackSave';
import { saveDailyRun } from '@/lib/conquestDaily';
import { getTodayET } from '@/lib/dateUtils';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/completions')>(),
  recordCompletion: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: async () => undefined }),
}));

function installLocks() {
  let tail: Promise<unknown> = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_key: string, work: () => unknown) => {
        const result = tail.then(work);
        tail = result.catch(() => undefined);
        return result;
      },
    },
  });
}

async function tap(button: HTMLElement) {
  await act(async () => { fireEvent.click(button); });
}

function save(state: ReturnType<typeof createAttack>) {
  localStorage.setItem(ATTACK_SAVE_KEY, JSON.stringify(state));
}

function compactSetup(): AttackSetup {
  return {
    dataVersion: 'map-test-v1', seed: 3, bounds: { width: 30, height: 10 },
    teams: ['A', 'B'].map((id, i) => ({
      id, name: ['Amber Vale', 'Birch Town'][i], color: ['#ff8800', '#228844'][i], overall: 70,
      homeRegion: ['west', 'east'][i],
      players: [{ id: `${id}1`, name: `Fictional ${id}`, rating: 75, originTeam: id }],
    })),
    regions: ['west', 'middle', 'east'].map((id, i) => ({
      id, name: id, rings: [[[i * 10, 0], [i * 10 + 10, 0], [i * 10 + 10, 10], [i * 10, 10]]],
      anchor: [i * 10 + 5, 5], initialOwner: i === 0 ? 'A' : i === 2 ? 'B' : null,
    })),
  };
}

let actualFixtures: { frontier: AttackState; defenderWin: AttackState } | null = null;
function attackFixtures() {
  if (actualFixtures) return actualFixtures;
  let state = createAttack(makeSoccerAttackSetup(9));
  let frontier: AttackState | null = null;
  let defenderWin: AttackState | null = null;
  for (let step = 0; state.phase !== 'finished' && step < 188 && (!frontier || !defenderWin); step += 1) {
    state = advanceAttack(state);
    const home = state.teams.find(team => team.id === state.selectedTeam)?.homeRegion;
    if (state.phase === 'target' && state.originRegion !== home) frontier = state;
    if (state.phase === 'recap' && state.lastResult?.loser === state.selectedTeam) defenderWin = state;
  }
  if (!frontier || !defenderWin) throw new Error('Seed 9 did not produce the required map fixtures.');
  actualFixtures = { frontier, defenderWin };
  return actualFixtures;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  installLocks();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('reduced-motion'), media: query, onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('Soccer Attack durable board', () => {
  it('reloads the exact next control at every committed phase', () => {
    const controls = ['Spin team wheel', 'Spin direction wheel', 'Play attack', 'Continue'];
    let state = createAttack(makeSoccerAttackSetup(9));
    for (const control of controls) {
      save(state);
      const view = render(<SoccerAttackBoard />);
      expect(within(view.container).getByRole('button', { name: control })).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!)).toEqual(state);
      view.unmount();
      state = advanceAttack(state);
    }
  });

  it('keeps the prior screen on a failed write and retries the same seeded state', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('blocked'); });
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(array => {
      (array as Uint32Array)[0] = 123456;
      return array;
    });
    render(<SoccerAttackBoard />);

    await tap(screen.getByRole('button', { name: 'Start Attack' }));
    expect(screen.getByRole('heading', { name: 'How Attack works' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/not saved/i);
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBeNull();

    await tap(screen.getByRole('button', { name: 'Retry save' }));
    expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!).setup.seed).toBe(123456);
    expect(screen.getByRole('button', { name: 'Spin team wheel' })).toBeInTheDocument();
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('restores newer progress from another tab instead of overwriting it', async () => {
    const first = within(render(<SoccerAttackBoard />).container);
    const stale = within(render(<SoccerAttackBoard />).container);
    await tap(first.getByRole('button', { name: 'Start Attack' }));
    await tap(first.getByRole('button', { name: 'Spin team wheel' }));
    const newer = JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!);

    await tap(stale.getByRole('button', { name: 'Start Attack' }));

    expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!)).toEqual(newer);
    expect(stale.getByRole('status')).toHaveTextContent(/another tab/i);
    expect(stale.getByRole('button', { name: 'Spin direction wheel' })).toBeInTheDocument();
  });

  it('plays a complete real map through the UI without ranked completion', async () => {
    save(createAttack(makeSoccerAttackSetup(9)));
    render(<SoccerAttackBoard />);
    for (let step = 0; step < 220; step += 1) {
      const stored = JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!);
      if (stored.phase === 'finished') break;
      const label = stored.phase === 'team' ? 'Spin team wheel'
        : stored.phase === 'direction' ? 'Spin direction wheel'
          : stored.phase === 'target' ? 'Play attack' : 'Continue';
      await tap(screen.getByRole('button', { name: label }));
    }
    const finished = JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!);
    expect(finished.phase).toBe('finished');
    expect(screen.getByText(/rules England/i)).toBeInTheDocument();
    expect(recordCompletion).not.toHaveBeenCalled();
    cleanup();
    render(<SoccerAttackBoard />);
    expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!)).toEqual(finished);
    expect(recordCompletion).not.toHaveBeenCalled();
  }, 30_000);

  it('draws from the committed frontier after movement and after the attacker is eliminated', () => {
    const fixtures = attackFixtures();
    for (const state of [fixtures.defenderWin, fixtures.frontier]) {
      localStorage.clear();
      save(state);
      const view = render(<SoccerAttackBoard />);
      const origin = state.setup.regions.find(region => region.id === state.originRegion)!.anchor;
      expect(view.container.querySelector('[data-attack-origin]')).toHaveAttribute('data-attack-origin', `${origin[0]},${origin[1]}`);
      view.unmount();
    }
    save(fixtures.frontier);
    render(<SoccerAttackBoard />);
    expect(screen.getByText(/ray begins at the owned frontier/i)).toBeInTheDocument();
  }, 20_000);

  it('requires confirmation before replacing an unfinished valid run', async () => {
    const state = createAttack(makeSoccerAttackSetup(9));
    save(state);
    const raw = localStorage.getItem(ATTACK_SAVE_KEY);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SoccerAttackBoard />);
    await tap(screen.getByRole('button', { name: 'Start new Attack' }));
    expect(confirm).toHaveBeenCalledWith('Replace this unfinished Attack run with a new one?');
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBe(raw);
  });

  it('offers explicit recovery for a damaged save without changing its bytes', () => {
    localStorage.setItem(ATTACK_SAVE_KEY, '{broken');
    render(<SoccerAttackBoard />);
    expect(screen.getByRole('alert')).toHaveTextContent(/damaged or unsupported/i);
    expect(screen.getByRole('button', { name: 'Replace damaged save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play without saving' })).toBeInTheDocument();
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBe('{broken');
  });

  it('blocks active moves when another tab replaces the save with damaged bytes', async () => {
    save(createAttack(makeSoccerAttackSetup(9)));
    render(<SoccerAttackBoard />);
    localStorage.setItem(ATTACK_SAVE_KEY, '{broken');
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: ATTACK_SAVE_KEY, newValue: '{broken' }));
    });

    await tap(screen.getByRole('button', { name: 'Spin team wheel' }));
    await tap(screen.getByRole('button', { name: 'Spin team wheel' }));

    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBe('{broken');
    expect(screen.getByRole('button', { name: 'Spin team wheel' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/changed to damaged data/i);
    expect(screen.getByRole('button', { name: 'Replace damaged save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue without saving' })).toBeInTheDocument();
  });

  it('replaces damaged bytes only through the active recovery control', async () => {
    const state = createAttack(makeSoccerAttackSetup(9));
    save(state);
    render(<SoccerAttackBoard />);
    localStorage.setItem(ATTACK_SAVE_KEY, '{broken');
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: ATTACK_SAVE_KEY, newValue: '{broken' }));
    });

    await tap(screen.getByRole('button', { name: 'Replace damaged save' }));

    expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!)).toEqual(state);
    expect(screen.getByRole('button', { name: 'Spin team wheel' })).toBeEnabled();
  });
});

describe('Attack map inspection and navigation', () => {
  it('keeps dense default labels apart and keeps pan controls outside the map drawing', () => {
    const state = createAttack(makeSoccerAttackSetup(9));
    const view = render(<AttackMap state={state} inspectedRegion={null} onInspect={() => undefined} />);
    const labels = [...view.container.querySelectorAll('svg g text')].map(node => ({
      name: node.textContent,
      x: Number(node.getAttribute('x')),
      y: Number(node.getAttribute('y')),
    }));
    const brentford = labels.find(label => label.name === 'BRE')!;
    const brighton = labels.find(label => label.name === 'BRI')!;
    expect(Math.abs(brentford.x - brighton.x) >= 76 || Math.abs(brentford.y - brighton.y) >= 44).toBe(true);
    expect(screen.getByRole('button', { name: 'Pan up' }).closest('.absolute')).toBeNull();
  });

  it('inspects a small region from the map or club list and supports keyboard zoom and pan', () => {
    const state = createAttack(compactSetup());
    save(state);
    const savedBefore = localStorage.getItem(ATTACK_SAVE_KEY);
    const inspect = vi.fn();
    const view = render(<AttackMap state={state} inspectedRegion="west" onInspect={inspect} />);
    const map = screen.getByRole('application', { name: 'Soccer Attack map' });
    expect([...view.container.querySelectorAll('svg g text')].map(node => node.textContent)).toContain('AV');
    expect([...view.container.querySelectorAll('svg g text')].map(node => node.textContent)).not.toContain('Amber Vale');
    const before = map.getAttribute('data-view-box');
    fireEvent.keyDown(map, { key: '+' });
    expect(map.getAttribute('data-view-box')).not.toBe(before);
    const zoomed = map.getAttribute('data-view-box');
    fireEvent.keyDown(map, { key: 'ArrowRight' });
    expect(map.getAttribute('data-view-box')).not.toBe(zoomed);
    fireEvent.keyDown(screen.getByRole('button', { name: /middle, neutral region/i }), { key: 'Enter' });
    expect(inspect).toHaveBeenCalledWith('middle');
    const beforeClubFocus = map.getAttribute('data-view-box');
    fireEvent.change(screen.getByRole('combobox', { name: 'Inspect a club' }), { target: { value: 'east' } });
    expect(inspect).toHaveBeenLastCalledWith('east');
    expect(map.getAttribute('data-view-box')).not.toBe(beforeClubFocus);
    expect([...view.container.querySelectorAll('svg g text')].map(node => node.textContent)).toContain('Birch Town');
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBe(savedBefore);
  });

  it('leaves a stationary region tap uncaptured and captures only after a drag starts', () => {
    const state = createAttack(compactSetup());
    const inspect = vi.fn();
    render(<AttackMap state={state} inspectedRegion="west" onInspect={inspect} />);
    const map = screen.getByRole('application', { name: 'Soccer Attack map' });
    const middle = screen.getByRole('button', { name: /middle, neutral region/i });
    const capture = vi.fn();
    Object.defineProperty(map, 'setPointerCapture', { configurable: true, value: capture });
    vi.spyOn(map, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 300, bottom: 100, width: 300, height: 100, toJSON: () => ({}),
    });
    const pointer = (target: Element, type: string, pointerId: number, clientX: number, clientY: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: pointerId }, buttons: { value: type === 'pointerup' ? 0 : 1 }, clientX: { value: clientX }, clientY: { value: clientY },
      });
      fireEvent(target, event);
    };

    pointer(middle, 'pointerdown', 4, 100, 50);
    expect(capture).not.toHaveBeenCalled();
    pointer(middle, 'pointerup', 4, 100, 50);
    fireEvent.click(middle);
    expect(inspect).toHaveBeenCalledWith('middle');

    fireEvent.keyDown(map, { key: '+' });
    const beforeDrag = map.getAttribute('data-view-box');
    pointer(middle, 'pointerdown', 5, 100, 50);
    pointer(map, 'pointermove', 5, 125, 50);
    expect(capture).toHaveBeenCalledWith(5);
    expect(map.getAttribute('data-view-box')).not.toBe(beforeDrag);
  });

  it('ignores a no-button hover after an uncaptured press is released outside the map', () => {
    const state = createAttack(compactSetup());
    render(<AttackMap state={state} inspectedRegion="west" onInspect={() => undefined} />);
    const map = screen.getByRole('application', { name: 'Soccer Attack map' });
    const middle = screen.getByRole('button', { name: /middle, neutral region/i });
    const capture = vi.fn();
    Object.defineProperty(map, 'setPointerCapture', { configurable: true, value: capture });
    vi.spyOn(map, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 300, bottom: 100, width: 300, height: 100, toJSON: () => ({}),
    });
    const pointer = (target: Element, type: string, buttons: number, clientX: number, clientY: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: 7 }, buttons: { value: buttons }, clientX: { value: clientX }, clientY: { value: clientY },
      });
      fireEvent(target, event);
    };

    fireEvent.keyDown(map, { key: '+' });
    const before = map.getAttribute('data-view-box');
    pointer(middle, 'pointerdown', 1, 100, 50);
    pointer(map, 'pointermove', 0, 210, 50);

    expect(capture).not.toHaveBeenCalled();
    expect(map.getAttribute('data-view-box')).toBe(before);
  });
});

describe('Soccer Conquest mode entry', () => {
  it('resumes an unfinished Daily Season first and keeps Attack selectable', async () => {
    saveDailyRun('soccer', { team: SOCCER_IMPERIALISM.teams[0].id, picks: [], done: false, result: null }, getTodayET());
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/soccer-conquest']}>
          <SoccerConquest />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByRole('button', { name: 'Daily Season' })).toHaveAttribute('aria-pressed', 'true');
    await tap(screen.getByRole('button', { name: 'Attack' }));
    expect(screen.getByRole('button', { name: 'Attack' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/spin a club and a legal direction across the generated English map/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Attack' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /rules|how to play/i })).toHaveLength(1);
  });
});

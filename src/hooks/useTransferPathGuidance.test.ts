import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Round 536. The graph behind the 2026-09-11 report, in miniature.
   -------------------------------------------------------------------------
   Alpha reaches Target in two through Quick. Wall links Alpha and nobody else,
   so a chain that plays him has walled its own head in. Wander leads away: from
   there the SHORTEST route on the raw graph runs back through Alpha, and Alpha
   is already played, so any search that forgets the chain hands the player a
   name the board would refuse as a duplicate. The honest answer from Wander is
   the long way round, Far, Mid, Link.

     Club A  Alpha, Quick          Club E  Quick, Target, Link
     Club B  Alpha, Wander         Club F  Wander, Far
     Club C  Alpha, Wall           Club G  Far, Mid
     Club D  Wall                  Club H  Mid, Link                          */
const season = (club: string, s: string) => ({ season: s, club, goals: 0, assists: 0, appearances: 1, marketValue: 1 });
const player = (name: string, career: ReturnType<typeof season>[]) => ({ name, nationality: 'Testland', position: 'CM', career });

vi.mock('@/data/careerPlayers', () => ({
  careerPlayers: [
    player('Alpha', [season('Club A', '2020-2021'), season('Club B', '2019-2020'), season('Club C', '2018-2019')]),
    player('Quick', [season('Club A', '2020-2021'), season('Club E', '2022-2023')]),
    player('Target', [season('Club E', '2022-2023')]),
    player('Wall', [season('Club C', '2018-2019'), season('Club D', '2021-2022')]),
    player('Wander', [season('Club B', '2019-2020'), season('Club F', '2017-2018')]),
    player('Far', [season('Club F', '2017-2018'), season('Club G', '2016-2017')]),
    player('Mid', [season('Club G', '2016-2017'), season('Club H', '2015-2016')]),
    player('Link', [season('Club H', '2015-2016'), season('Club E', '2022-2023')]),
  ],
}));

const STORED_HINT = 'One middle man does it. He was at Club A with Alpha and at Club E with Target.';

vi.mock('@/data/transferPathPuzzles', () => ({
  default: [
    { id: 'guide-1', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: STORED_HINT },
    { id: 'guide-2', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: STORED_HINT },
  ],
}));

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(async () => []) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: vi.fn(async () => []) }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const hookPath = process.env.TRANSFER_PATH_HOOK;
const { useTransferPath } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useTransferPath');

const underControl = Boolean(hookPath);
const say = (marker: string, value: unknown) => {
  console.log(`${underControl ? 'CONTROL_OBSERVED' : 'TRANSFER_PATH_GUIDANCE'}_${marker} ${JSON.stringify(value)}`);
};

beforeEach(() => {
  localStorage.clear();
});

async function startedUnlimited() {
  const rendered = renderHook(() => useTransferPath());
  await waitFor(() => expect(rendered.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  act(() => rendered.result.current.switchToUnlimited());
  expect(rendered.result.current.chain).toEqual(['Alpha']);
  return rendered;
}

describe('useTransferPath guidance follows the chain', () => {
  it('opens on the stored hint and keeps it until the chain moves', async () => {
    const rendered = await startedUnlimited();
    expect(rendered.result.current.hint).toBe(STORED_HINT);
    expect(rendered.result.current.stranded).toBe(false);
    say('OPENING_HINT', rendered.result.current.hint);
  });

  it('speaks from the head, and never through a name already played', async () => {
    const rendered = await startedUnlimited();
    let move: ReturnType<typeof rendered.result.current.addPlayer>;
    act(() => { move = rendered.result.current.addPlayer('Wander'); });
    expect(move!).toEqual({ ok: true, club: 'Club B' });
    expect(rendered.result.current.chain).toEqual(['Alpha', 'Wander']);

    const hint = rendered.result.current.hint;
    say('WANDERED_HINT', hint);
    say('WANDERED_CHAIN', rendered.result.current.chain);

    // It must have moved off the stored line, which points at Quick, a man
    // Wander cannot follow.
    expect(hint).not.toBe(STORED_HINT);
    expect(hint).not.toContain('Quick');
    // The route out of Wander is Far, Mid, Link, Target: three more men, and the
    // first link runs through Club F. A search that forgot the chain would come
    // back with two more men through Club B, which is Alpha, already played.
    expect(hint).toContain('From Wander it takes 3 more men at least');
    expect(hint).toContain('Club F');
    expect(hint).not.toContain('Club B');
    expect(rendered.result.current.stranded).toBe(false);
  });

  it('says so when the head has no route left, instead of hinting at nothing', async () => {
    const rendered = await startedUnlimited();
    let move: ReturnType<typeof rendered.result.current.addPlayer>;
    act(() => { move = rendered.result.current.addPlayer('Wall'); });
    expect(move!).toEqual({ ok: true, club: 'Club C' });
    expect(rendered.result.current.chain).toEqual(['Alpha', 'Wall']);

    say('STRANDED_FLAG', rendered.result.current.stranded);
    say('STRANDED_HINT', rendered.result.current.hint);

    expect(rendered.result.current.stranded).toBe(true);
    expect(rendered.result.current.hint).toContain('No route left from Wall to Target');
    expect(rendered.result.current.hint).not.toBe(STORED_HINT);
  });

  it('still wins on the spot when the added name is a teammate of the target', async () => {
    // The stranded reasoning leans on this: the chain can never swallow the
    // target's last neighbour, because reaching one ends the game.
    const rendered = await startedUnlimited();
    act(() => { rendered.result.current.addPlayer('Quick'); });
    expect(rendered.result.current.chain).toEqual(['Alpha', 'Quick', 'Target']);
    expect(rendered.result.current.status).toBe('won');
    say('AUTO_WIN_CHAIN', rendered.result.current.chain);
  });
});

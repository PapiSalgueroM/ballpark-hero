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

/* Round 1010a review: the Active only rule on the same graph. Every man is in
   the verified active records except Wall, so under Active Wall is no node at
   all and the board refuses him. More help must count on that rule graph. */
vi.mock('@/data/transferPathVerifiedActive', async () => {
  const { transferPathIdentityKey } = await vi.importActual<typeof import('@/lib/transferPathIdentity')>('@/lib/transferPathIdentity');
  const keys = ['Alpha', 'Quick', 'Target', 'Wander', 'Far', 'Mid', 'Link'].map(n => transferPathIdentityKey(n, 'Testland'));
  return { VERIFIED_ACTIVE_IDENTITY_KEYS: keys, VERIFIED_ACTIVE_IDENTITIES: new Set(keys) };
});

vi.mock('@/data/transferPathPuzzles', () => ({
  default: [
    { id: 'guide-1', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: STORED_HINT, active: { minSteps: 2, hint: STORED_HINT } },
    { id: 'guide-2', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: STORED_HINT, active: { minSteps: 2, hint: STORED_HINT } },
  ],
}));

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(async () => []) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: vi.fn(async () => []) }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const hookPath = process.env.TRANSFER_PATH_HOOK;
const { useTransferPath } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useTransferPath');

/* The graph module is swapped the same way for the harness's overflow control. */
const graphPath = process.env.TRANSFER_PATH_GRAPH;
const { moreHelpLines } = graphPath
  ? await import(/* @vite-ignore */ graphPath)
  : await import('@/lib/transferPathGraph');

const underControl = Boolean(hookPath || graphPath);
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

  /* Round 1010a, the More help tier. It counts doors and never names a man,
     so every line is checked for every pool name on word boundaries, the two
     ends excepted. */
  const POOL = ['Alpha', 'Quick', 'Target', 'Wall', 'Wander', 'Far', 'Mid', 'Link'];
  const namesIn = (line: string, head: string) => POOL
    .filter(n => n !== head && n !== 'Target')
    .filter(n => new RegExp(`(?<![\\p{L}\\p{N}])${n}(?![\\p{L}\\p{N}])`, 'u').test(line));

  it('more help names nobody but the head and the target, and counts the doors from the start', async () => {
    const rendered = await startedUnlimited();
    const help = rendered.result.current.moreHelp;
    say('MORE_HELP_START', help?.lines ?? null);
    expect(help).not.toBeNull();
    // Alpha meets Quick at Club A, Wander at Club B, Wall at Club C; only
    // Quick is one step from Target. Into Target: Quick and Link, both Club E.
    expect(help!.doors).toEqual({
      total: 3,
      onRoute: 1,
      byClub: [
        { club: 'Club A', players: 1, onRoute: 1 },
        { club: 'Club B', players: 1, onRoute: 0 },
        { club: 'Club C', players: 1, onRoute: 0 },
      ],
      intoTotal: 2,
      into: [{ club: 'Club E', players: 2 }],
    });
    expect(help!.lines).toHaveLength(2);
    /* The message is what the harness's leak control looks for, so the
       control proves this check fired and not the exact strings below. */
    help!.lines.forEach(line => expect(namesIn(line, 'Alpha'), 'more help leaked a pool name').toEqual([]));
    expect(help!.lines[0]).toBe('🔎 From Alpha, 3 pool players shared a season with him: Club A 1, Club B 1, Club C 1. Just 1 of them is on a shortest route.');
    expect(help!.lines[1]).toBe('🎯 Into Target: 2 pool players, all through Club E.');
  });

  it('more help skips the played names once the chain moves, and is gone on a stranded head', async () => {
    const rendered = await startedUnlimited();
    act(() => { rendered.result.current.addPlayer('Wander'); });
    const help = rendered.result.current.moreHelp;
    say('MORE_HELP_WANDERED', help?.lines ?? null);
    // From Wander the only door left is Far at Club F; Alpha is played, so
    // Club B is no door at all, and the route out is the long one.
    expect(help).not.toBeNull();
    expect(help!.doors.total).toBe(1);
    expect(help!.doors.onRoute).toBe(1);
    expect(help!.doors.byClub).toEqual([{ club: 'Club F', players: 1, onRoute: 1 }]);
    help!.lines.forEach(line => expect(namesIn(line, 'Wander'), 'more help leaked a pool name').toEqual([]));
    expect(help!.lines[0]).toBe('🔎 From Wander, 1 pool player shared a season with him: Club F 1. He is on a shortest route.');

    const walled = await startedUnlimited();
    act(() => { walled.result.current.addPlayer('Wall'); });
    say('MORE_HELP_STRANDED', walled.result.current.moreHelp);
    expect(walled.result.current.stranded).toBe(true);
    expect(walled.result.current.moreHelp).toBeNull();
  });

  /* Round 1010a review: the hook must hand doorsFrom the RULE graph. On the
     everyday graph Active would still count Wall, a man the rule refuses,
     which is a hint into a refusal (the Round 294 lesson). */
  it('more help counts on the rule graph: under Active only a man the rule refuses is no door', async () => {
    const rendered = await startedUnlimited();
    act(() => rendered.result.current.setRule('active'));
    expect(rendered.result.current.activeRule).toBe('active');
    expect(rendered.result.current.chain).toEqual(['Alpha']);
    const help = rendered.result.current.moreHelp;
    say('MORE_HELP_RULE', help?.lines ?? null);
    // Quick at Club A and Wander at Club B. The everyday graph says 3, Club C too.
    expect(help).not.toBeNull();
    expect(help!.doors.total).toBe(2);
    expect(help!.doors.byClub).toEqual([
      { club: 'Club A', players: 1, onRoute: 1 },
      { club: 'Club B', players: 1, onRoute: 0 },
    ]);
    expect(help!.lines[0]).toBe('🔎 From Alpha, 2 pool players shared a season with him: Club A 1, Club B 1. Just 1 of them is on a shortest route.');
    // and the man left out is one the board refuses under this rule
    let move: ReturnType<typeof rendered.result.current.addPlayer>;
    act(() => { move = rendered.result.current.addPlayer('Wall'); });
    expect(move!.ok).toBe(false);
  });

  /* Round 1010a review: past four clubs a line says how many it left out.
     Pure strings, no hook: 4 clubs show all, 5 leave 1 club, 6 leave 2 clubs. */
  it('more help says how many clubs it left out, one or many', () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ club: `Club ${i + 1}`, players: 10 - i, onRoute: 0 }));
    const plain = (n: number) => rows(n).map(({ club, players }) => ({ club, players }));
    const four = moreHelpLines({ total: 9, onRoute: 2, byClub: rows(4), intoTotal: 9, into: plain(4) }, 'Alpha', 'Target');
    expect(four[0]).toBe('🔎 From Alpha, 9 pool players shared a season with him: Club 1 10, Club 2 9, Club 3 8, Club 4 7. 2 of them are on a shortest route.');
    expect(four[1]).toBe('🎯 Into Target: 9 pool players, through Club 1 10, Club 2 9, Club 3 8, Club 4 7.');
    const more = moreHelpLines({ total: 9, onRoute: 2, byClub: rows(5), intoTotal: 9, into: plain(6) }, 'Alpha', 'Target');
    say('MORE_HELP_OVERFLOW', more);
    expect(more[0]).toBe('🔎 From Alpha, 9 pool players shared a season with him: Club 1 10, Club 2 9, Club 3 8, Club 4 7, and 1 more club. 2 of them are on a shortest route.');
    expect(more[1]).toBe('🎯 Into Target: 9 pool players, through Club 1 10, Club 2 9, Club 3 8, Club 4 7, and 2 more clubs.');
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

import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FantasyDraft from '@/pages/FantasyDraft';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { settleSeason, type SdSeason } from '@/lib/searchDiscard';
import { recordCompletion } from '@/lib/completions';

const remote = vi.hoisted(() => ({
  players: [] as DraftPlayer[],
  criteria: null as string | null,
  user: null as { id: string } | null,
  toast: vi.fn(),
  insertVote: vi.fn<(row: { voted_team: 'user' | 'ai'; user_id: string }) => Promise<{ error: { code: string } | null }>>(),
  countVotes: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn(async (name: string) => {
      if (name === 'fantasy-draft-daily') return { data: { criteria: remote.criteria }, error: null };
      if (name === 'simulate-season') return { data: { teamAStory: 'Fixture story A.', teamBStory: 'Fixture story B.' }, error: null };
      if (name === 'analyze-squads') return { data: null, error: null };
      throw new Error('Unexpected fixture function: ' + name);
    }) },
    from: vi.fn((table: string) => {
      if (table === 'fantasy_draft_votes') {
        return { insert: remote.insertVote, select: () => ({ eq: remote.countVotes }) };
      }
      if (table !== 'fantasy_draft_players') throw new Error('Unexpected fixture table: ' + table);
      return { select: () => ({ order: async () => ({ data: remote.players, error: null }) }) };
    }),
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: remote.user, profile: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: remote.toast }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/searchDiscard', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/searchDiscard')>();
  return { ...actual, settleSeason: vi.fn(actual.settleSeason) };
});

// Fictional test fixtures only. The real player pool and sports data are unchanged.
function fixture(): DraftPlayer[] {
  return ([['GK', 4, 10], ['DEF', 8, 20], ['MID', 6, 120], ['FWD', 28, 200]] as const)
    .flatMap(([position, count, value]) => Array.from({ length: count }, (_, i) => ({
      id: `fixture-${position}-${i}`, name: `Fixture ${position} ${String(i).padStart(2, '0')}`,
      position, nationality: 'Fixture Country', dominant_foot: 'Right',
      market_value_millions: value, age: 24,
    })));
}
function roster(view: RenderResult, side: 'Your XI' | 'AI XI'): DraftPlayer[] {
  const column = view.getByText(side, { exact: true }).parentElement!.parentElement!;
  return [...column.querySelectorAll('[data-draft-slot]')].flatMap(slot => {
    const name = slot.querySelector('[title]')?.getAttribute('title');
    if (!name) return [];
    const player = remote.players.find(p => p.name === name);
    expect(player, 'FD_FORMATION_SETUP_RENDERED_PLAYER').toBeDefined();
    return [player!];
  });
}
function shape(team: readonly ({ position: string } | null)[]) {
  return Object.fromEntries(['GK', 'DEF', 'MID', 'FWD'].map(position =>
    [position, team.filter(p => p?.position === position).length]));
}
async function openDraft() {
  const view = render(<FantasyDraft />);
  await act(async () => {});
  fireEvent.click(view.getByRole('button', { name: 'Start Draft' }));
  await act(async () => {});
  expect(view.getByRole('heading', { name: 'Player Pool' })).toBeVisible();
  return view;
}
async function userTurn(view: RenderResult) {
  for (let i = 0; i < 3 && !view.queryByText('Your Pick', { exact: true }); i += 1) {
    await act(async () => { vi.advanceTimersByTime(2000); });
  }
  expect(view.getByText('Your Pick', { exact: true })).toBeVisible();
}
function available(view: RenderResult, position: string) {
  const taken = new Set([...roster(view, 'Your XI'), ...roster(view, 'AI XI')].map(p => p.id));
  const player = remote.players.find(p => p.position === position && !taken.has(p.id));
  expect(player, 'FD_FORMATION_SETUP_UNDRAFTED_POSITION').toBeDefined();
  return player!;
}
function searchPlayer(view: RenderResult, player: DraftPlayer) {
  fireEvent.change(view.getByRole('textbox', { name: 'Search players' }), { target: { value: player.name } });
  const heading = view.getByRole('heading', { name: 'Player Pool' });
  const pool = heading.parentElement!.parentElement!;
  return within(pool).getByText(player.name, { selector: 'p', exact: true }).closest('button')!;
}
async function pickPosition(view: RenderResult, position: string) {
  await userTurn(view);
  const button = searchPlayer(view, available(view, position));
  expect(button).toBeEnabled();
  fireEvent.click(button);
}
async function finishAiTurn(view: RenderResult) {
  for (let i = 0; i < 3 && !view.queryByText('Draft Complete!', { exact: true }); i += 1) {
    await act(async () => { vi.advanceTimersByTime(2000); });
  }
  expect(view.getByText('Draft Complete!', { exact: true })).toBeVisible();
}

async function openVote() {
  remote.user = { id: 'fixture-voter' };
  const view = await openDraft();
  for (const position of ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD']) {
    await pickPosition(view, position);
  }
  await finishAiTurn(view);
  await act(async () => { fireEvent.click(view.getByRole('button', { name: "Tell the season's story" })); });
  expect(view.getByRole('heading', { name: 'Who Won the Season?' })).toBeVisible();
  return view;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  remote.players = fixture();
  remote.criteria = null;
  remote.user = null;
  remote.insertVote.mockReset().mockResolvedValue({ error: null });
  remote.countVotes.mockReset().mockImplementation(async (_, team) => ({ count: team === 'user' ? 2 : 7, error: null }));
});

describe('Fantasy Draft daily vote', { timeout: 20_000 }, () => {
  it('waits for acceptance, then allows a retry after a refused vote', async () => {
    let refuse!: (response: { error: { code: string } }) => void;
    remote.insertVote.mockReturnValueOnce(new Promise(resolve => { refuse = resolve; }));
    const view = await openVote();
    fireEvent.click(view.getByRole('button', { name: 'Your Team' }));
    expect(view.queryByRole('heading', { name: /Winner Declared/ })).not.toBeInTheDocument();
    const ai = view.getByRole('button', { name: 'AI Team' });
    expect(ai).toBeDisabled();
    fireEvent.click(ai);
    expect(remote.insertVote).toHaveBeenCalledExactlyOnceWith({ voted_team: 'user', user_id: 'fixture-voter' });
    expect(remote.countVotes).not.toHaveBeenCalled();

    await act(async () => { refuse({ error: { code: '08006' } }); });
    expect(ai).toBeEnabled();
    expect(remote.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vote could not be saved' }));
    expect(remote.countVotes).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(ai); });
    expect(remote.insertVote).toHaveBeenNthCalledWith(2, { voted_team: 'ai', user_id: 'fixture-voter' });
    expect(view.getByRole('heading', { name: /Winner Declared/ })).toBeVisible();
    expect(view.getByText('AI Team wins!')).toBeVisible();
    expect(remote.countVotes.mock.calls).toEqual([['voted_team', 'user'], ['voted_team', 'ai']]);
    expect(view.getByText('2', { selector: 'strong' })).toBeVisible();
    expect(view.getByText('7', { selector: 'strong' })).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('shows the existing daily vote restriction without claiming the new vote won', async () => {
    remote.insertVote.mockResolvedValueOnce({ error: { code: '23505' } });
    const view = await openVote();
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Your Team' })); });
    expect(view.queryByRole('heading', { name: /Winner Declared/ })).not.toBeInTheDocument();
    expect(view.getByText('You already voted today.')).toBeVisible();
    expect(view.queryByRole('button', { name: 'Your Team' })).not.toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'AI Team' })).not.toBeInTheDocument();
    expect(remote.countVotes).not.toHaveBeenCalled();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps an accepted vote when the vote tally is unavailable', async () => {
    remote.countVotes.mockResolvedValueOnce({ count: null, error: { code: '08006' } });
    const view = await openVote();
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Your Team' })); });
    expect(view.getByText('Your Team wins!')).toBeVisible();
    expect(view.queryByText('0', { selector: 'strong' })).not.toBeInTheDocument();
    expect(view.queryByText('7', { selector: 'strong' })).not.toBeInTheDocument();
    expect(remote.toast).not.toHaveBeenCalled();
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Fantasy Draft forms both starting XIs before settlement', () => {
  it('settles a balanced human draft against an AI with the same complete formation', async () => {
    const view = await openDraft();
    for (const position of ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD']) {
      await pickPosition(view, position);
    }
    await finishAiTurn(view);
    expect(settleSeason).toHaveBeenCalledTimes(1);
    const [you, ai] = vi.mocked(settleSeason).mock.calls[0];
    expect(shape(you), 'FD_FORMATION_HUMAN_SETTLE_INPUT').toEqual({ GK: 1, DEF: 4, MID: 3, FWD: 3 });
    expect(shape(ai), 'FD_FORMATION_AI_SETTLE_INPUT').toEqual({ GK: 1, DEF: 4, MID: 3, FWD: 3 });
    expect(you).toHaveLength(11);
    expect(ai).toHaveLength(11);
    expect(new Set([...you, ...ai].map(p => p!.name)).size).toBe(22);
    for (const label of ['Your formation', 'AI formation']) {
      expect(view.getByRole('status', { name: label })).toHaveTextContent('GK 1/1');
      expect(view.getByRole('status', { name: label })).toHaveTextContent('DEF 4/4');
      expect(view.getByRole('status', { name: label })).toHaveTextContent('MID 3/3');
      expect(view.getByRole('status', { name: label })).toHaveTextContent('FWD 3/3');
    }
    // The real season result stays authoritative, including an AI win or an upset.
    const result = vi.mocked(settleSeason).mock.results[0].value as SdSeason;
    const verdict = result.winner === 0 ? 'Your draft wins the season!'
      : result.winner === -1 ? 'Dead level after 38 games' : 'The AI drafted better';
    expect(view.getByText(verdict, { exact: true })).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordCompletion).mock.calls[0][3]).toBe(result.winner === 0 ? 1 : 0);
  });

  it('rejects a fourth human forward while other formation slots remain open', async () => {
    const view = await openDraft();
    await pickPosition(view, 'FWD');
    await pickPosition(view, 'FWD');
    await pickPosition(view, 'FWD');
    await userTurn(view);
    const before = roster(view, 'Your XI').map(p => p.id);
    expect(before).toHaveLength(3);
    const button = searchPlayer(view, available(view, 'FWD'));
    expect(button, 'FD_FORMATION_FOURTH_FORWARD_BLOCKED').toBeDisabled();
    fireEvent.click(button);
    expect(roster(view, 'Your XI').map(p => p.id)).toEqual(before);
    expect(view.getByRole('status', { name: 'Your formation' })).toHaveTextContent('FWD 3/3');
    expect(settleSeason).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('relaxes exhausted daily criteria only inside the remaining formation slots', async () => {
    remote.criteria = 'Under 25s: Every player must be 25 or younger';
    remote.players = remote.players.map(p => p.position === 'DEF' ? { ...p, age: 30 } : p);
    const view = await openDraft();
    for (const position of ['FWD', 'FWD', 'FWD', 'MID', 'MID', 'MID', 'GK']) {
      await pickPosition(view, position);
    }
    await userTurn(view);
    expect(shape(roster(view, 'Your XI'))).toEqual({ GK: 1, DEF: 0, MID: 3, FWD: 3 });
    expect(settleSeason).not.toHaveBeenCalled();
    const defender = available(view, 'DEF');
    expect(searchPlayer(view, defender), 'FD_FORMATION_NEEDED_POSITION_CRITERIA_RELAXED').toBeEnabled();
    expect(view.getByRole('status', { name: 'Daily rule' })).toHaveTextContent(/relaxed/i);
    const before = roster(view, 'Your XI').map(p => p.id);
    const extraForward = searchPlayer(view, available(view, 'FWD'));
    expect(extraForward, 'FD_FORMATION_RELAXATION_CANNOT_ADD_FOURTH_FORWARD').toBeDisabled();
    fireEvent.click(extraForward);
    expect(roster(view, 'Your XI').map(p => p.id)).toEqual(before);
    for (let i = 0; i < 4; i += 1) await pickPosition(view, 'DEF');
    await finishAiTurn(view);
    expect(settleSeason).toHaveBeenCalledTimes(1);
    const [you, ai] = vi.mocked(settleSeason).mock.calls[0];
    expect(shape(you)).toEqual({ GK: 1, DEF: 4, MID: 3, FWD: 3 });
    expect(shape(ai)).toEqual({ GK: 1, DEF: 4, MID: 3, FWD: 3 });
    expect(roster(view, 'Your XI').filter(p => p.position === 'DEF').every(p => p.age === 30)).toBe(true);
  });

});

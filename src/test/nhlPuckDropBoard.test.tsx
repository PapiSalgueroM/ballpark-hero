/**
 * Round 830 review: the draft can carry a full roster club past the 23 man
 * limit, and the season waits until the GM waives down.
 *
 * Renders the real NHL board on a seeded full roster league whose club the
 * draft has taken to 25, and checks the whole path a player walks: the Roster
 * box says 2 over the limit, Play is greyed with the sentence, the Waive
 * button (the shared cut, dead money and all) takes him back to 23, and then
 * Play goes. A league saved before the full rosters keeps its old rules: 17
 * men and Play is live, as it always was.
 *
 * scripts/simNhlFullRosters.mjs section 9 fences the engine half with its
 * controls (nodrop, droplegacy); this file is the board half.
 */
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { initNhlFullLeague, initNhlLeague, nhlProspectToPlayer, type NhlGmPlayer, type NhlLeague } from '@/lib/nhlFrontOffice';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const KEY = 'nhl-front-office-save-v1';
/* The real board on a 732 man league, clicked through several panels: well over vitest's 5 second
   default when the suite runs files in parallel on a loaded machine (measured 5.4 and 6.1s). */
const BOARD_TIMEOUT = 30000;
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const saved = (league: NhlLeague) => ({ league, myTeam: 'BOS', phase: 'hub', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, mandate: null, trust: 60, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null });
const read = () => JSON.parse(localStorage.getItem(KEY)!) as ReturnType<typeof saved>;
/* Two draftees the way the board's draft hands them over, invented names from the game's own bank. */
function draftTwo(league: NhlLeague): NhlGmPlayer[] {
  const rng = lehmer(3);
  const men = [
    nhlProspectToPlayer({ id: 'p1', name: 'Wilhelm Grahn', pos: 'W', age: 19, grade: 74, trueOvr: 70 }, rng),
    nhlProspectToPlayer({ id: 'p2', name: 'Valter Sjodin', pos: 'D', age: 18, grade: 73, trueOvr: 69 }, rng),
  ];
  league.teams.BOS.players.push(...men);
  return men;
}

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(lehmer(11)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NHL Front Office: the cut down before puck drop', () => {
  it('a full roster club at 25 waits on two waivers, then plays', async () => {
    const league = initNhlFullLeague(lehmer(5));
    expect(league.teams.BOS.players.length).toBe(23);
    const [w, d] = draftTwo(league);
    localStorage.setItem(KEY, JSON.stringify(saved(league)));
    const view = render(<Board />);

    /* the hub's Roster box says so before anything is opened */
    expect(await view.findByText('2 over the 23 man limit. Waive before puck drop.')).toBeTruthy();

    /* Play is greyed with the sentence */
    fireEvent.click(view.getByRole('button', { name: /^🏟️\s*Play/ }));
    const play = view.getByRole('button', { name: /Play Round 1/ });
    expect(play).toBeDisabled();
    expect(view.container.querySelector('[data-puckdrop-block]')).toHaveTextContent('25 on the roster. Waive down to 23 before puck drop.');
    fireEvent.click(play);
    expect(read().league.round).toBe(1);

    /* the Roster box carries the same sentence, and the shared Waive button does the work */
    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    fireEvent.click(view.getByRole('button', { name: /^👔\s*Roster/ }));
    expect(view.container.querySelector('[data-puckdrop-block]')).toHaveTextContent('25 on the roster.');
    for (const man of [w, d]) {
      const row = view.container.querySelector<HTMLElement>(`[data-roster-row="${man.id}"]`)!;
      fireEvent.click(within(row).getByRole('button', { name: /^Waive, \$/ }));
      fireEvent.click(within(row).getByRole('button', { name: 'Waive him' }));
    }
    expect(read().league.teams.BOS.players.length).toBe(23);
    expect(view.container.querySelector('[data-puckdrop-block]')).toBeNull();

    /* and the puck drops */
    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    fireEvent.click(view.getByRole('button', { name: /^🏟️\s*Play/ }));
    const live = view.getByRole('button', { name: /Play Round 1/ });
    expect(live).not.toBeDisabled();
    fireEvent.click(live);
    expect(read().league.round).toBe(2);
  }, BOARD_TIMEOUT);

  it('a league saved before the full rosters keeps its old rules: 17 men and Play is live', async () => {
    const league = initNhlLeague(lehmer(5));
    delete league.rosterDepth;
    draftTwo(league); draftTwo(league);
    expect(league.teams.BOS.players.length).toBe(17);
    localStorage.setItem(KEY, JSON.stringify(saved(league)));
    const view = render(<Board />);
    fireEvent.click(await view.findByRole('button', { name: /^🏟️\s*Play/ }));
    expect(view.container.querySelector('[data-puckdrop-block]')).toBeNull();
    const play = view.getByRole('button', { name: /Play Round 1/ });
    expect(play).not.toBeDisabled();
    fireEvent.click(play);
    expect(read().league.round).toBe(2);
  }, BOARD_TIMEOUT);
});

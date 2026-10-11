import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentBrief from '@/components/soccer-career/AgentBrief';
import { FALLBACK_CLUBS, initCareer, requestTransferDecision, transferBriefPreview, type CareerState } from '@/lib/soccerCareerEngine';
import { readTransferBrief, setTransferBrief, type TransferBriefPriority } from '@/lib/soccerCareerTransferBrief';

const KEY = 'soccerCareerSave';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(): CareerState {
  const c = initCareer('Brief Tester', 'England', 'ST', '2020-24', { pace: 72, shooting: 72, passing: 72, dribbling: 72, defending: 72, physical: 72, reflexes: 72 }, 72, 2024, FALLBACK_CLUBS);
  const club = FALLBACK_CLUBS.find(v => v.name === 'Liverpool')!;
  Object.assign(c, { age: 25, phase: 'transfer_window', retired: false, currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentLeague: club.league, currentClubColor: club.color, contractYearsLeft: 3, transferSituation: { type: 'no_interest' } });
  c.seasons[0] = { ...c.seasons[0], type: 'playing', club: club.name, year: 2028, leagueApps: 15, apps: 20, goals: 8, rating: 7.1 };
  return c;
}
function mount(initial: CareerState) {
  const patches = vi.fn();
  function Host() {
    const [career, setCareer] = useState(initial);
    useEffect(() => { localStorage.setItem(KEY, JSON.stringify(career)); }, [career]);
    return <AgentBrief career={career} clubs={FALLBACK_CLUBS} onCareer={fn => { patches(fn); setCareer(fn); }} />;
  }
  const view = render(<Host />);
  return { ...view, patches };
}
async function open() {
  const trigger = screen.getByRole('button', { name: 'Brief your agent' });
  trigger.focus(); fireEvent.click(trigger);
  await screen.findByRole('dialog', { name: 'Your transfer brief' });
  return trigger;
}
function chooseHelp() { fireEvent.click(screen.getByRole('button', { name: 'Choose a priority' })); }
function priority(id: TransferBriefPriority) { return document.querySelector(`[data-transfer-priority="${id}"]`) as HTMLButtonElement; }

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => localStorage.clear());
describe('Transfer brief UI', () => {
  it('shows rules and a worked example before the first priority, without changing career or drawing', async () => {
    const c = fixture(), raw = JSON.stringify(c), random = vi.spyOn(Math, 'random');
    const view = mount(c); await open();
    expect(document.querySelector('[data-transfer-brief-help]')).toHaveTextContent('The response chance stays 50%');
    expect(document.querySelector('[data-transfer-brief-help]')).toHaveTextContent('Example: two eligible clubs project 8 to 16 and 20 to 30');
    expect(document.querySelector('[data-transfer-brief-help]')).toHaveTextContent('Club-arranged sales and loans');
    expect(priority('minutes')).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(raw); expect(view.patches).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });
  it('uses actual eligible preview counts and bands, and preview remains read only', async () => {
    const c = fixture(), expected = transferBriefPreview(c, FALLBACK_CLUBS), raw = JSON.stringify(c), random = vi.spyOn(Math, 'random');
    const view = mount(c); await open(); chooseHelp();
    for (const option of expected.options) {
      expect(priority(option.id)).toHaveTextContent(`${option.matchingCount} matching club`);
      if (option.projection) expect(priority(option.id)).toHaveTextContent(`about ${option.projection.min} to ${option.projection.max} league games`);
    }
    expect(screen.getByRole('button', { name: 'Save brief' })).toBeDisabled();
    fireEvent.click(priority('minutes')); fireEvent.click(priority('home'));
    expect(localStorage.getItem(KEY)).toBe(raw); expect(view.patches).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });
  for (const id of ['minutes', 'level', 'home'] as const) it(`saves a bound ${id} brief only when Save brief is clicked`, async () => {
    const c = fixture(), expected = setTransferBrief(copy(c), id), random = vi.spyOn(Math, 'random');
    const view = mount(c); await open(); chooseHelp(); fireEvent.click(priority(id));
    expect(priority(id)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Save brief' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(expected); expect(view.patches).toHaveBeenCalledTimes(1); expect(random).not.toHaveBeenCalled();
    expect(readTransferBrief(expected)?.priority).toBe(id);
  });
  it('discards an unsaved change on Back and restores focus to the opener', async () => {
    const c = setTransferBrief(fixture(), 'minutes'), raw = JSON.stringify(c), view = mount(c), random = vi.spyOn(Math, 'random');
    const trigger = await open(); chooseHelp(); fireEvent.click(priority('home')); fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(view.patches).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });
  it('discards an unsaved change on Escape and restores focus', async () => {
    const c = fixture(), raw = JSON.stringify(c), view = mount(c);
    const trigger = await open(); chooseHelp(); fireEvent.click(priority('level'));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(localStorage.getItem(KEY)).toBe(raw); expect(view.patches).not.toHaveBeenCalled();
  });
  it('reopens the rules from the question button without saving a draft choice', async () => {
    const c = fixture(), raw = JSON.stringify(c), view = mount(c), random = vi.spyOn(Math, 'random');
    await open(); chooseHelp(); fireEvent.click(priority('minutes')); fireEvent.click(screen.getByRole('button', { name: 'Transfer brief help' }));
    expect(document.querySelector('[data-transfer-brief-help]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to brief' }));
    expect(priority('minutes')).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(KEY)).toBe(raw); expect(view.patches).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });
  it('can return to the exact normal search state without requesting a transfer', async () => {
    const c = setTransferBrief(fixture(), 'home'), expected = copy(c); delete expected.transferBrief;
    const view = mount(c), random = vi.spyOn(Math, 'random'); await open(); chooseHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Use normal search' }));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(expected); expect(view.patches).toHaveBeenCalledTimes(1); expect(random).not.toHaveBeenCalled();
  });
  it('remembers the dismissed guide separately from the career', async () => {
    const c = fixture(), raw = JSON.stringify(c); mount(c); await open(); chooseHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Back' })); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await open(); expect(document.querySelector('[data-transfer-brief-help]')).toBeNull();
    expect(priority('home')).toBeInTheDocument(); expect(localStorage.getItem(KEY)).toBe(raw);
  });
  it('still shows the guide and permits saving when guide storage is blocked', async () => {
    const c = fixture(); mount(c);
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) { if (key === 'soccer-transfer-brief-help-v1') throw new Error('blocked'); return get.call(this, key); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === 'soccer-transfer-brief-help-v1') throw new Error('blocked'); set.call(this, key, value); });
    await open(); chooseHelp(); fireEvent.click(priority('minutes')); fireEvent.click(screen.getByRole('button', { name: 'Save brief' }));
    expect(readTransferBrief(JSON.parse(localStorage.getItem(KEY)!))?.priority).toBe('minutes');
  });
  for (const kind of ['club_move', 'frozen_out', 'contract_expiry', 'bidding_war', 'loan', 'playing', 'retired', 'result'] as const) it(`does not offer a brief in ${kind}`, () => {
    let c = fixture();
    if (kind === 'club_move') c.transferSituation = { type: 'club_move', mode: 'sale', fromClub: 'Liverpool', toClub: 'Arsenal', contractYears: 3, wage: 50000, transferFee: 10, reasons: ['Fixture decision'] };
    if (kind === 'frozen_out') c.transferSituation = { type: 'frozen_out', mode: 'released', offers: [], reasons: ['Fixture decision'] };
    if (kind === 'contract_expiry') c.transferSituation = { type: 'contract_expiry', offers: [] };
    if (kind === 'bidding_war') { const offer = { club: FALLBACK_CLUBS[0], wage: 50000, contractYears: 3, transferFee: 10 }; c.transferSituation = { type: 'bidding_war', offerA: offer, offerB: offer }; }
    if (kind === 'loan') c.loan = { parentClub: 'Arsenal', parentCountry: 'England', parentTier: 1, parentLeague: 'Premier League', parentColor: '#ef0000' };
    if (kind === 'playing') c.phase = 'playing';
    if (kind === 'retired') c.retired = true;
    if (kind === 'result') { c = setTransferBrief(c, 'minutes'); const old = Math.random; Math.random = () => 0.1; try { c = requestTransferDecision(c, FALLBACK_CLUBS); } finally { Math.random = old; } }
    const raw = JSON.stringify(c), random = vi.spyOn(Math, 'random'), view = mount(c);
    expect(screen.queryByRole('button', { name: 'Brief your agent' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(raw); expect(view.patches).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });
});

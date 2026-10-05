import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import CareerDecisionOutcome from '@/components/us-career/CareerDecisionOutcome';
import { buildCareerDecisionOutcome } from '@/lib/usCareerDecisionOutcome';
import { recordActivity, recordCompletion } from '@/lib/completions';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { rivalryChoiceCard } from '@/lib/careerRivalryChoices';
import { NBA_RIVALRY_CHOICES } from '@/lib/nbaCareerRivalryEvents';
import { NFL_RIVALRY_CHOICES } from '@/lib/nflCareerRivalryEvents';
import { MLB_RIVALRY_CHOICES } from '@/lib/mlbCareerRivalryEvents';
import { NHL_RIVALRY_CHOICES } from '@/lib/nhlCareerRivalryEvents';
import { copyCareer, decisionSave, decisionSports, makeDecisionCareer, realDecisionEvent } from '@/test/fixtures/careerDecisionOutcome1009';
import type { UsCareerCore } from '@/lib/usCareerSport';

const slugs = ['nba', 'nfl', 'mlb', 'nhl'];
const read = (slug: string) => JSON.parse(localStorage.getItem(decisionSports[slug].saveKey)!);
const rows = () => [...document.querySelectorAll('[data-decision-change]')].map(el => ({
  key: el.getAttribute('data-decision-change'), label: el.querySelector('dt')?.textContent,
  before: el.querySelector('[data-change-before]')?.textContent, after: el.querySelector('[data-change-after]')?.textContent,
  delta: el.querySelector('[data-change-delta]')?.textContent ?? null,
}));
function click(name: string | RegExp) {
  const button = screen.queryByRole('button', { name });
  expect(button, `Action ${name} exists`).not.toBeNull(); fireEvent.click(button!);
}
function option(index: number) {
  const node = document.querySelector<HTMLButtonElement>(`[data-career-decision-option="${index}"]`);
  expect(node, `Existing event option ${index} is shown`).not.toBeNull(); return node!;
}
function dismissSeason() {
  const curtain = document.querySelector<HTMLElement>('[data-season-reveal]');
  expect(curtain, 'The real season resolved before its ordinary event').not.toBeNull();
  fireEvent.click(within(curtain!).getByRole('button', { name: 'Continue' }));
  expect(document.querySelector('[data-career-decision-event]')).not.toBeNull();
}
function mountEvent(slug: string, id = 'training', edit?: (c: UsCareerCore) => void) {
  const original = decisionSports[slug], event = realDecisionEvent(slug, id), initial = makeDecisionCareer(slug);
  edit?.(initial);
  const apply = event.options.map(o => vi.fn(o.apply));
  const chosenEvent = { ...event, options: event.options.map((o, index) => ({ ...o, apply: apply[index] })) };
  const sport = { ...original, drawEvent: vi.fn(() => ({ ...chosenEvent })), rollTeamQuality: vi.fn(original.rollTeamQuality) };
  localStorage.setItem(sport.saveKey, decisionSave(initial));
  localStorage.setItem('decision-unrelated-save', 'held bytes');
  const view = render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
  click(/^Play the \d+ season$/); dismissSeason();
  const before = read(slug);
  expect(before.phase).toBe('event'); expect(before.c.seasons).toHaveLength(1);
  const expected = (index: number) => {
    const c = copyCareer(before.c), rng = vi.fn(() => .5);
    event.options[index].apply(c, rng);
    const teamQuality = original.rollTeamQuality(before.teamQuality, rng);
    return { save: { c, phase: 'season', teamQuality, coach: null }, draws: rng.mock.calls.length };
  };
  return { ...view, sport, event, before, apply, expected };
}
function show(before: UsCareerCore, after: UsCareerCore, title = 'Fixture decision', choice = 'Fixture choice') {
  const next = vi.fn(), teamLabel = (id: string) => `Fixture club ${id}`;
  const outcome = buildCareerDecisionOutcome({ title, choice, before, after, teamLabel });
  return { ...render(<CareerDecisionOutcome outcome={outcome} onContinue={next} />), outcome, next };
}
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(.5);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('ordinary career decision outcomes', () => {
  it('shows each real sport choice as the actual capped change and saves it once', () => {
    for (const slug of slugs) {
      const mounted = mountEvent(slug), expected = mounted.expected(1);
      expect(mounted.before.c.health).toBe(98);
      const writes = vi.spyOn(Storage.prototype, 'setItem'); vi.mocked(Math.random).mockClear();
      fireEvent.click(option(1));
      expect(rows()).toEqual([{ key: 'health', label: 'Health', before: '98', after: '100', delta: '+2' }]);
      expect(document.querySelector('[data-decision-title]')?.textContent).toBe(mounted.event.title);
      expect(document.querySelector('[data-decision-choice]')?.textContent).toBe(`You chose: ${mounted.event.options[1].label}`);
      expect(document.querySelector('[data-career-decision-outcome]')?.textContent).not.toContain('Health +10');
      expect(document.activeElement).toBe(document.querySelector('[data-decision-title]'));
      expect(read(slug)).toEqual(expected.save);
      expect(writes.mock.calls.filter(([key]) => key === mounted.sport.saveKey)).toHaveLength(1);
      expect(mounted.apply[1]).toHaveBeenCalledTimes(1);
      expect(mounted.sport.rollTeamQuality).toHaveBeenCalledTimes(1);
      expect(Math.random).toHaveBeenCalledTimes(expected.draws);
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(localStorage.getItem('decision-unrelated-save')).toBe('held bytes');
      mounted.unmount(); writes.mockRestore();
    }
  });
  it('reports negative effects and real endorsement earnings without calling them cash', () => {
    let mounted = mountEvent('nfl', 'media'), expected = mounted.expected(0);
    fireEvent.click(option(0));
    expect(rows()).toEqual([
      { key: 'morale', label: 'Morale', before: String(mounted.before.c.morale), after: String(mounted.before.c.morale - 3), delta: '-3' },
      { key: 'fanbase', label: 'Fanbase', before: String(mounted.before.c.fanbase), after: String(Math.min(100, mounted.before.c.fanbase + 10)), delta: `+${Math.min(100, mounted.before.c.fanbase + 10) - mounted.before.c.fanbase}` },
    ]);
    expect(read('nfl')).toEqual(expected.save); mounted.unmount();
    for (const [slug, amount] of [['nba', 5], ['nfl', 3], ['mlb', 3], ['nhl', 2]] as const) {
      mounted = mountEvent(slug); expected = mounted.expected(2);
      const cash = mounted.before.c.netWorth;
      fireEvent.click(option(2));
      expect(rows().find(row => row.key === 'earnings')).toEqual({ key: 'earnings', label: 'Career earnings', before: `$${mounted.before.c.earnings}M`, after: `$${mounted.before.c.earnings + amount}M`, delta: `+$${amount}M` });
      expect(rows().some(row => row.key === 'netWorth')).toBe(false);
      expect(read(slug).c.netWorth).toBe(cash); expect(read(slug)).toEqual(expected.save);
      mounted.unmount();
    }
  });
  it('consumes same-frame choices once and accepts the next ordinary event', () => {
    const mounted = mountEvent('nba'), expected = mounted.expected(2);
    const first = option(2), second = option(1), writes = vi.spyOn(Storage.prototype, 'setItem');
    vi.mocked(Math.random).mockClear();
    act(() => { first.click(); first.click(); second.click(); });
    expect(mounted.apply.map(spy => spy.mock.calls.length)).toEqual([0, 0, 1]);
    expect(mounted.sport.rollTeamQuality).toHaveBeenCalledTimes(1);
    expect(Math.random).toHaveBeenCalledTimes(expected.draws);
    expect(writes.mock.calls.filter(([key]) => key === mounted.sport.saveKey)).toHaveLength(1);
    expect(read('nba')).toEqual(expected.save);
    click('Continue'); click(/^Play the \d+ season$/); dismissSeason();
    const nextBefore = read('nba'), nextCareer = copyCareer(nextBefore.c), tape = [.1, .9];
    const referenceRng = vi.fn(() => tape.shift() ?? .5);
    mounted.event.options[0].apply(nextCareer, referenceRng);
    const nextQuality = decisionSports.nba.rollTeamQuality(nextBefore.teamQuality, referenceRng);
    expect(referenceRng).toHaveBeenCalledTimes(2);
    expect(nextCareer.ovr).toBe(nextBefore.c.ovr + 1);
    const reversed = copyCareer(nextBefore.c), reversedTape = [.1, .9], reversedRng = () => reversedTape.shift() ?? .5;
    const reversedQuality = decisionSports.nba.rollTeamQuality(nextBefore.teamQuality, reversedRng);
    mounted.event.options[0].apply(reversed, reversedRng);
    expect({ c: reversed, teamQuality: reversedQuality }, 'The nonconstant draws distinguish apply-before-roll from reversed order').not.toEqual({ c: nextCareer, teamQuality: nextQuality });
    vi.mocked(Math.random).mockClear().mockReturnValueOnce(.1).mockReturnValueOnce(.9);
    fireEvent.click(option(0));
    expect(mounted.apply.map(spy => spy.mock.calls.length)).toEqual([1, 0, 1]);
    expect(Math.random).toHaveBeenCalledTimes(2);
    expect(read('nba'), 'A fresh real option consumes its draw before the team-quality draw').toEqual({ c: nextCareer, phase: 'season', teamQuality: nextQuality, coach: null });
    expect(read('nba').c.seasons).toHaveLength(2);
  });
  it('continues with no extra draws writes season or completion and restores Play focus', () => {
    for (const slug of slugs) {
      const mounted = mountEvent(slug); fireEvent.click(option(1));
      const bytes = localStorage.getItem(mounted.sport.saveKey), seasons = read(slug).c.seasons.length;
      const writes = vi.spyOn(Storage.prototype, 'setItem'), removes = vi.spyOn(Storage.prototype, 'removeItem');
      vi.mocked(Math.random).mockClear(); vi.mocked(recordActivity).mockClear();
      const next = screen.getByRole('button', { name: 'Continue' });
      act(() => { next.click(); next.click(); });
      expect(document.querySelector('[data-career-decision-outcome]')).toBeNull();
      const play = screen.queryByRole('button', { name: /^Play the \d+ season$/ });
      expect(play).not.toBeNull(); expect(document.activeElement).toBe(play);
      expect(localStorage.getItem(mounted.sport.saveKey)).toBe(bytes); expect(read(slug).c.seasons).toHaveLength(seasons);
      expect(Math.random).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(removes).not.toHaveBeenCalled();
      expect(recordActivity).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
      mounted.unmount(); writes.mockRestore(); removes.mockRestore();
    }
  });
  it('reloads the applied career without replaying its transient receipt or choice', () => {
    for (const slug of slugs) {
      const mounted = mountEvent(slug), expected = mounted.expected(2); fireEvent.click(option(2));
      expect(read(slug)).toEqual(expected.save);
      const bytes = localStorage.getItem(mounted.sport.saveKey); mounted.unmount();
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      const view = render(<MemoryRouter><UsCareerBoard sport={mounted.sport} /></MemoryRouter>);
      expect(screen.queryByRole('button', { name: /^Play the \d+ season$/ })).not.toBeNull();
      expect(document.querySelector('[data-career-decision-outcome]')).toBeNull();
      expect(document.querySelector('[data-career-decision-event]')).toBeNull();
      expect(read(slug)).toEqual(expected.save); expect(localStorage.getItem(mounted.sport.saveKey)).toBe(bytes);
      expect(mounted.apply[2]).toHaveBeenCalledTimes(1); expect(writes).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
      view.unmount(); writes.mockRestore();
    }
  });
  it('keeps team contract salary cash and earnings changes in their own units', () => {
    const before = makeDecisionCareer('nba'), after = copyCareer(before);
    before.team = 'OLD'; after.team = 'NEW';
    Object.assign(after, { earnings: 15.25, netWorth: 19.125, salary: 6.5, contractYears: 2, yearlyCosts: .3 });
    before.yearlyCosts = .1;
    const { outcome } = show(before, after);
    expect(outcome.changes).toEqual([
      { key: 'team', label: 'Team', before: 'Fixture club OLD', after: 'Fixture club NEW', delta: null },
      { key: 'earnings', label: 'Career earnings', before: '$10M', after: '$15.25M', delta: '+$5.25M' },
      { key: 'netWorth', label: 'Cash', before: '$20M', after: '$19.125M', delta: '-$0.875M' },
      { key: 'salary', label: 'Annual salary', before: '$4M', after: '$6.5M', delta: '+$2.5M' },
      { key: 'contractYears', label: 'Contract years', before: '4', after: '2', delta: '-2' },
      { key: 'yearlyCosts', label: 'Annual upkeep', before: '$0.1M', after: '$0.3M', delta: '+$0.2M' },
    ]);
    expect(rows()).toEqual(outcome.changes.slice(0, 4));
    click('Show all 6 changes'); expect(rows()).toEqual(outcome.changes);
  });
  it('uses Not recorded for missing legacy sides and preserves known zero changes', () => {
    const before = makeDecisionCareer('nfl'), after = copyCareer(before);
    delete before.netWorth; after.netWorth = 0;
    before.heat = 0; after.heat = 4;
    before.dirtyMoney = 2; delete after.dirtyMoney;
    before.karma = Number.NaN; after.karma = Number.POSITIVE_INFINITY;
    const bytes = JSON.stringify({ before, after });
    const { outcome } = show(before, after);
    expect(outcome.changes).toEqual([
      { key: 'netWorth', label: 'Cash', before: 'Not recorded', after: '$0M', delta: null },
      { key: 'dirtyMoney', label: 'Unexplained money', before: '$2M', after: 'Not recorded', delta: null },
      { key: 'heat', label: 'Heat', before: '0', after: '4', delta: '+4' },
    ]);
    expect(rows()).toEqual(outcome.changes); expect(JSON.stringify({ before, after })).toBe(bytes);
    expect(document.querySelector('[data-career-decision-outcome]')?.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });
  it('shows an honest unchanged outcome when a real capped option changes nothing', () => {
    const mounted = mountEvent('nhl', 'training', c => { c.health = 100; });
    expect(mounted.before.c.health).toBe(100); fireEvent.click(option(1));
    expect(rows()).toEqual([]);
    expect(document.querySelector('[data-decision-unchanged]')?.textContent).toBe('No rating, money, team or status changes to show.');
    expect(document.querySelector('[data-career-decision-outcome]')?.textContent).not.toContain('+10');
    expect(read('nhl').c.health).toBe(100); expect(mounted.apply[1]).toHaveBeenCalledTimes(1);
  });
  it('expands every applied change without hiding Continue or changing its payload', () => {
    const before = makeDecisionCareer('mlb'), after = copyCareer(before);
    Object.assign(after, { ovr: 83, health: 100, morale: 66, fanbase: 64, pot: 91, earnings: 12, salary: 5, contractYears: 3 });
    const { outcome, next } = show(before, after, 'Fixture multi-field choice', 'Fixture answer');
    expect(rows()).toHaveLength(4); expect(next).not.toHaveBeenCalled();
    const toggle = screen.getByRole('button', { name: 'Show all 8 changes' }); toggle.focus(); fireEvent.click(toggle);
    expect(rows()).toEqual(outcome.changes); expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(toggle);
    click('Show fewer changes'); expect(rows()).toEqual(outcome.changes.slice(0, 4));
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeNull(); expect(next).not.toHaveBeenCalled();
    click('Continue'); expect(next).toHaveBeenCalledTimes(1);
  });
  it('preserves real ordinary engine choices and the existing rivalry receipt independently', () => {
    const defs = { nba: NBA_RIVALRY_CHOICES[0], nfl: NFL_RIVALRY_CHOICES[0], mlb: MLB_RIVALRY_CHOICES[0], nhl: NHL_RIVALRY_CHOICES[0] };
    for (const slug of slugs) {
      const c = makeDecisionCareer(slug), event = realDecisionEvent(slug);
      event.options[1].apply(c, () => .5); expect(c.health).toBe(100);
      const earnings = c.earnings; event.options[2].apply(c, () => .5);
      expect(c.earnings - earnings).toBe(slug === 'nba' ? 5 : slug === 'nhl' ? 2 : 3);
      const sport = decisionSports[slug], pos = sport.create.defaultPos;
      const rivalCareer = sport.startCareer(`Fixture existing ${slug}`, pos, sport.create.archetypes[pos][0], () => .5, defaultAppearance(), 'now');
      rivalCareer.fanbase = 50; rivalCareer.karma = 50;
      const def = defs[slug as keyof typeof defs];
      const card = rivalryChoiceCard(def as never, rivalCareer as never, rivalCareer.rival as never);
      rivalCareer.pendingRivalryChoice = card; rivalCareer.rivalryChoicesSeen = [card.id];
      const calm = def.choices.findIndex(o => !o.risk && (o.promise?.effect.fanbase ?? 0) > 0), promise = def.choices[calm].promise!.effect;
      expect(calm).toBeGreaterThanOrEqual(0);
      localStorage.setItem(sport.saveKey, decisionSave(rivalCareer));
      const view = render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
      expect(document.querySelector('[data-rivalry-choice]')).not.toBeNull();
      const button = document.querySelector(`[data-rivalry-option="${calm}"]`); expect(button).not.toBeNull(); fireEvent.click(button!);
      expect(read(slug).c.fanbase).toBe(50 + (promise.fanbase ?? 0)); expect(read(slug).c.karma).toBe(50 + (promise.karma ?? 0));
      expect(document.querySelector('[data-rivalry-outcome]')).not.toBeNull(); expect(document.querySelector('[data-career-decision-outcome]')).toBeNull();
      const applied = localStorage.getItem(sport.saveKey); click('Continue');
      expect(screen.queryByRole('button', { name: /^Play the \d+ season$/ })).not.toBeNull();
      expect(localStorage.getItem(sport.saveKey)).toBe(applied); expect(recordCompletion).not.toHaveBeenCalled(); view.unmount();
    }
  });
});

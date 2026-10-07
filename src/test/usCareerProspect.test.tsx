import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { createUsCareerProspect, loadUsCareerProspect, type UsCareerProspect } from '@/lib/usCareerProspect';
import { preDraftChoose, preDraftChoicePool, preDraftEffectText, preDraftEffectiveEffect, preDraftPlaySeason, preDraftRunDraft, preDraftShowcase, preDraftStart, type PreDraftState } from '@/lib/careerPreDraft';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { keyedRng } from '@/lib/keyedRng';
import { newSummerSalt, summerOn } from '@/lib/usCareerSummer';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Prospect fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

interface SportCase { label: string; Board: ComponentType; sport: UsCareerSport; unsigned: { salary: number; fanbase: number; netWorth: number } }
const SPORTS: SportCase[] = [
  { label: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT, unsigned: { salary: 1.2, fanbase: 35, netWorth: 0.1 } },
  { label: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT, unsigned: { salary: 2.5, fanbase: 35, netWorth: 0.3 } },
  { label: 'MLB', Board: MlbMyCareerBoard, sport: MLB_CAREER_SPORT, unsigned: { salary: 0.8, fanbase: 30, netWorth: 0.4 } },
  { label: 'NHL', Board: NhlMyCareerBoard, sport: NHL_CAREER_SPORT, unsigned: { salary: 0.9, fanbase: 32, netWorth: 0.5 } },
];
type View = ReturnType<typeof render>;
type Save = { c: UsCareerCore | null; phase: string; teamQuality: number | null; coach: null; prospect?: UsCareerProspect };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const mount = (row: SportCase) => render(<StrictMode><row.Board /></StrictMode>);
const saved = (row: SportCase): Save => JSON.parse(localStorage.getItem(row.sport.saveKey)!);
const journey = (view: View) => view.container.querySelector<HTMLElement>('[data-prospect-journey]')!;
const buttons = (view: View) => within(journey(view));
const doubleClick = (button: HTMLElement) => act(() => { fireEvent.click(button); fireEvent.click(button); });
const prospectSave = (p: UsCareerProspect): Save => ({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: p });
function seed(row: SportCase, value: Save) {
  localStorage.setItem(row.sport.saveKey, JSON.stringify(value));
  localStorage.setItem('unrelated-prospect-fixture', 'keep this save');
}
function prospect(row: SportCase, seedId = 'acceptance'): UsCareerProspect {
  const sport = row.sport, pos = sport.create.defaultPos;
  return createUsCareerProspect(sport, { name: 'Simulated Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: defaultAppearance(), seed: `${sport.slug}:${seedId}` });
}
function start(row: SportCase, p = prospect(row)): UsCareerProspect {
  const desc = row.sport.preDraft(p.eraId);
  return { ...p, state: preDraftStart(desc, { ...p, routeId: desc.routes[0].id }) };
}
function toShowcase(row: SportCase, p = start(row)): UsCareerProspect {
  const desc = row.sport.preDraft(p.eraId);
  let state = p.state!;
  for (let n = 0; n < 8 && state.phase !== 'showcase'; n++) {
    state = state.phase === 'season' ? preDraftPlaySeason(desc, state) : preDraftChoose(desc, state, 0);
  }
  expect(state.phase).toBe('showcase');
  return { ...p, state };
}
function reload(row: SportCase, view: View, phase: string): View {
  const bytes = localStorage.getItem(row.sport.saveKey);
  view.unmount();
  const again = mount(row);
  expect(journey(again)).toHaveAttribute('data-prospect-phase', phase);
  expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
  expect(localStorage.getItem('unrelated-prospect-fixture')).toBe('keep this save');
  return again;
}
function stepButton(row: SportCase, view: View, p: UsCareerProspect): HTMLElement {
  if (!p.state) return buttons(view).getByRole('button', { name: new RegExp(row.sport.preDraft(p.eraId).routes[0].label) });
  if (p.state.phase === 'season') return buttons(view).getByRole('button', { name: /Play (your first|the next) season/ });
  if (p.state.phase === 'choice') return within(buttons(view).getByTestId('pre-draft-choice')).getAllByRole('button')[0];
  if (p.state.phase === 'showcase') return buttons(view).getByRole('button', { name: /^Play it safe/ });
  if (p.state.phase === 'draft') return buttons(view).getByRole('button', { name: 'Draft day' });
  return buttons(view).getByRole('button', { name: 'Start your career' });
}
function nextState(row: SportCase, p: UsCareerProspect): PreDraftState {
  const desc = row.sport.preDraft(p.eraId), s = p.state;
  if (!s) return preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  if (s.phase === 'season') return preDraftPlaySeason(desc, s);
  if (s.phase === 'choice') return preDraftChoose(desc, s, 0);
  if (s.phase === 'showcase') return preDraftShowcase(desc, s, 'steady');
  return preDraftRunDraft(desc, s);
}
function expectedCareer(row: SportCase, p: UsCareerProspect): Save {
  const sport = row.sport, state = p.state!, out = state.draft!, rng = keyedRng(`${p.seed}|career`);
  const arch = sport.create.archetypes[p.pos].find(a => a.id === p.archetypeId)!;
  const c = sport.startCareer(p.name, p.pos, arch, rng, p.appearance, p.eraId, { ...out, pot: state.pot, health: out.devSeasons.length ? 100 : state.health, prospect: state });
  const teamQuality = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, teamQuality, rng);
  /* Round 1038: the summer's salt is the career stream's next draw. */
  if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(rng);
  if (c.draftPick > 0 && !out.devSeasons.length) sport.draftNightInbox(c);
  return { c, phase: 'season', teamQuality, coach: null };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.4);
  vi.spyOn(Date, 'now').mockReturnValue(1790985600000);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('US career prospect on the actual boards', () => {
  it.each(SPORTS)('$label quiet legacy restore preserves the existing career unchanged', row => {
    const sport = row.sport, pos = sport.create.defaultPos;
    const c = sport.startCareer('Legacy Player', pos, sport.create.archetypes[pos][0], () => 0.4, defaultAppearance(), 'now');
    sport.assignRole(c, 75, () => 0.4);
    seed(row, { c, phase: 'season', teamQuality: 75, coach: null });
    const bytes = localStorage.getItem(sport.saveKey), view = mount(row);
    expect(view.getByRole('button', { name: /^Play the \d+ season$/ })).toBeEnabled();
    expect(journey(view)).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    view.unmount();
    const again = mount(row);
    expect(again.getByRole('button', { name: /^Play the \d+ season$/ })).toBeEnabled();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  });

  it.each(SPORTS)('$label plays every saved prospect stage into the earned career and first season', row => {
    let view = mount(row);
    fireEvent.change(view.getByRole('textbox', { name: 'Your player name' }), { target: { value: 'Simulated Prospect' } });
    fireEvent.click(view.getByRole('button', { name: 'Play your road to the draft' }));
    localStorage.setItem('unrelated-prospect-fixture', 'keep this save');
    expect(localStorage.getItem(row.sport.saveKey)).not.toBeNull();
    let p = saved(row).prospect!;
    expect(p.name).toBe('Simulated Prospect');
    view = reload(row, view, 'routes');
    const seen = new Set(['routes']);
    for (let n = 0; n < 12 && p.state?.phase !== 'done'; n++) {
      const expected = nextState(row, p);
      fireEvent.click(stepButton(row, view, p));
      p = { ...p, state: expected };
      expect(saved(row)).toEqual(prospectSave(p));
      seen.add(expected.phase);
      view = reload(row, view, expected.phase);
    }
    expect([...seen].sort()).toEqual(['choice', 'done', 'draft', 'routes', 'season', 'showcase']);
    const out = p.state!.draft!, expected = expectedCareer(row, p);
    expect(buttons(view).getByTestId('draft-result')).toHaveTextContent(row.sport.preDraft(p.eraId).teamLabel(out.team));
    fireEvent.click(stepButton(row, view, p));
    expect(saved(row)).toEqual(expected);
    expect(saved(row).c).toMatchObject({ ovr: out.ratingAfter, age: out.ageAfter, team: out.team, pot: p.pot, draftPick: out.pick ?? 0, year: out.draftYear + out.devSeasons.length, prospect: p.state });
    expect(journey(view)).toBeNull();
    fireEvent.click(view.getByRole('button', { name: /^Play the \d+ season$/ }));
    const after = saved(row).c!;
    expect(after.seasons).toHaveLength(1);
    expect(after.seasons[0]).toMatchObject({ ovr: out.ratingAfter, team: out.team, year: out.draftYear + out.devSeasons.length });
    expect(after.prospect).toEqual(p.state);
    expect(after.year).toBe(out.draftYear + out.devSeasons.length + 1);
    const bytes = localStorage.getItem(row.sport.saveKey);
    view.unmount(); mount(row);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    expect(localStorage.getItem('unrelated-prospect-fixture')).toBe('keep this save');
  });

  it.each(SPORTS)('$label choices apply the displayed consequences and reject invalid options', row => {
    let p = start(row), desc = row.sport.preDraft(p.eraId);
    let state = preDraftPlaySeason(desc, p.state!);
    for (let n = 0; n < 40 && !preDraftChoicePool(desc).find(c => c.id === state.pendingChoice)?.options.some(o => preDraftEffectiveEffect(state, o.effect).stock); n++) {
      p = start(row, prospect(row, `choice-${n}`));
      desc = row.sport.preDraft(p.eraId);
      state = preDraftPlaySeason(desc, p.state!);
    }
    expect(state.phase).toBe('choice');
    const card = preDraftChoicePool(desc).find(c => c.id === state.pendingChoice)!;
    const outcomes: PreDraftState[] = [];
    for (const index of [-1, 0.5, card.options.length]) expect(preDraftChoose(desc, state, index)).toBe(state);
    for (let index = 0; index < card.options.length; index++) {
      seed(row, prospectSave({ ...p, state }));
      const view = mount(row), choice = within(buttons(view).getByTestId('pre-draft-choice'));
      const effect = preDraftEffectiveEffect(state, card.options[index].effect);
      expect(choice.getAllByTestId('pre-draft-effect')[index]).toHaveTextContent(preDraftEffectText(effect));
      fireEvent.click(choice.getAllByRole('button')[index]);
      const after = saved(row).prospect!.state!;
      expect(after.stock).toBe(state.stock + (effect.stock ?? 0));
      expect(after.rating).toBe(state.rating + (effect.rating ?? 0));
      expect(after.health).toBe(state.health + (effect.health ?? 0));
      expect(after.pendingChoice).toBeNull();
      expect(after.choicesSeen).toEqual([...state.choicesSeen, card.id]);
      expect(after.lines).toEqual(state.lines);
      outcomes.push(after); view.unmount();
    }
    expect(outcomes[0]).not.toEqual(outcomes[1]);
    expect(card.options.some(o => preDraftEffectiveEffect(state, o.effect).stock)).toBe(true);
  });

  it.each(SPORTS)('$label accepts each same-frame journey action only once', row => {
    const view = mount(row), writes = vi.spyOn(Storage.prototype, 'setItem');
    const ownWrites = () => writes.mock.calls.filter(([key]) => key === row.sport.saveKey).length;
    doubleClick(view.getByRole('button', { name: 'Play your road to the draft' }));
    expect(ownWrites()).toBe(1);
    for (let n = 0; n < 13 && saved(row).phase === 'prospect'; n++) {
      const p = saved(row).prospect!, count = ownWrites();
      const expected = p.state?.phase === 'done' ? expectedCareer(row, p) : prospectSave({ ...p, state: nextState(row, p) });
      doubleClick(stepButton(row, view, p));
      expect(ownWrites()).toBe(count + 1);
      expect(saved(row)).toEqual(expected);
    }
    expect(saved(row).phase).toBe('season');
    expect(saved(row).c!.seasons).toHaveLength(0);
  });

  it.each(SPORTS)('$label an actual undrafted outcome becomes a camp signing without top-pick rewards', row => {
    // A controlled low-rated fictional prospect exercises the real draft boundary.
    let p: UsCareerProspect | undefined;
    for (let n = 0; n < 40 && !p; n++) {
      const candidate = prospect(row, `undrafted-${n}`);
      const ready = toShowcase(row, start(row, { ...candidate, rating: 40, pot: 65 }));
      const desc = row.sport.preDraft(ready.eraId), state = preDraftRunDraft(desc, preDraftShowcase(desc, ready.state!, 'skip'));
      if (state.draft!.pick === null) p = { ...ready, state };
    }
    expect(p, 'the real draft must generate an undrafted fixture').toBeTruthy();
    expect(loadUsCareerProspect(row.sport, p)).toEqual(p);
    seed(row, prospectSave(p!));
    const view = mount(row);
    expect(buttons(view).getByTestId('draft-result')).toHaveTextContent('Undrafted');
    fireEvent.click(buttons(view).getByRole('button', { name: 'Start your career' }));
    const c = saved(row).c!;
    expect(c).toMatchObject({ ...row.unsigned, draftPick: 0, ovr: p!.state!.draft!.ratingAfter, team: p!.state!.draft!.team, prospect: p!.state });
    expect(c.phoneInbox?.some(message => /endorsement/i.test(JSON.stringify(message))) ?? false).toBe(false);
    expect(view.container).toHaveTextContent('undrafted signing');
    expect(row.sport.legacyOf(c).bullets.join(' ')).toContain('undrafted signing');
    expect(row.sport.legacyOf(c).bullets.join(' ')).not.toContain('drafted pick 0');
  });

  it.each(SPORTS)('$label historical completed outcomes survive reload and remain the career archive', row => {
    const ready = toShowcase(row), desc = row.sport.preDraft(ready.eraId);
    const current = { ...ready, state: preDraftRunDraft(desc, preDraftShowcase(desc, ready.state!, 'steady')) };
    const historical = clone(current), state = historical.state!, out = state.draft!;
    // Plausible committed values from an earlier balance, independent of today's replay.
    state.lines[0].stats = [{ label: 'Scouting grade', value: 'B+' }];
    out.ratingAfter = out.ratingAfter === state.pot ? out.ratingAfter - 1 : out.ratingAfter + 1;
    if (out.slotValue !== null) out.slotValue += 100;
    if (out.devSeasons.length) out.devSeasons[0].stats = [{ label: 'Scouting grade', value: 'A-' }];
    expect(historical).not.toEqual(current);
    expect(loadUsCareerProspect(row.sport, historical)).toEqual(historical);
    state.choicesSeen[0] = 'retired_scout_decision';
    expect(loadUsCareerProspect(row.sport, historical)).toEqual(historical);
    seed(row, prospectSave(historical));
    let view = mount(row);
    view = reload(row, view, 'done');
    expect(journey(view)).toHaveTextContent('B+ Scouting grade');
    const expected = expectedCareer(row, historical);
    fireEvent.click(buttons(view).getByRole('button', { name: 'Start your career' }));
    expect(saved(row)).toEqual(expected);
    expect(saved(row).c!.prospect).toEqual(state);
    let bytes = localStorage.getItem(row.sport.saveKey);
    view.unmount(); view = mount(row);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    fireEvent.click(view.getByRole('button', { name: /My Player/ }));
    expect(view.container.querySelector('[data-prospect-record]')).toHaveTextContent('B+ Scouting grade');
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    view.unmount(); view = mount(row);
    fireEvent.click(view.getByRole('button', { name: /^Play the \d+ season$/ }));
    expect(saved(row).c!.prospect).toEqual(state);
    expect(saved(row).c!.seasons[0].ovr).toBe(out.ratingAfter);
    bytes = localStorage.getItem(row.sport.saveKey);
    view.unmount(); mount(row);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    expect(localStorage.getItem('unrelated-prospect-fixture')).toBe('keep this save');
  });

  it.each(SPORTS)('$label rejects corrupt nested journey saves without changing storage', row => {
    const ready = toShowcase(row), desc = row.sport.preDraft(ready.eraId);
    const done = { ...ready, state: preDraftRunDraft(desc, preDraftShowcase(desc, ready.state!, 'steady')) };
    const broken = [
      (p: UsCareerProspect) => { p.state!.lines[0].stats[0].value = null as unknown as string; },
      (p: UsCareerProspect) => { p.state!.showcase!.grade = 'Z' as never; },
      (p: UsCareerProspect) => { p.state!.draft!.team = 'not-a-team'; },
      (p: UsCareerProspect) => { p.state!.routeId = 'missing-route'; },
      (p: UsCareerProspect) => { p.state!.draft!.draftYear += 1; },
      (p: UsCareerProspect) => { p.state!.draft!.ageAtDraft += 1; },
      (p: UsCareerProspect) => { p.state!.draft!.ageAfter += 1; },
      (p: UsCareerProspect) => { p.state!.draft!.ratingAfter = p.pot + 1; },
      (p: UsCareerProspect) => { p.state!.draft!.ratingAfter = 70.5; },
      (p: UsCareerProspect) => { p.state!.draft!.slotValue = -1; },
      (p: UsCareerProspect) => { Object.assign(p.state!.draft!, { pick: 1, round: 2, pickInRound: 1 }); },
      (p: UsCareerProspect) => { Object.assign(p.state!.draft!, { pick: 1, round: 1, pickInRound: 2 }); },
      (p: UsCareerProspect) => { Object.assign(p.state!.draft!, { pick: desc.teamIds().length * desc.rounds + 1, round: desc.rounds + 1, pickInRound: 1 }); },
      (p: UsCareerProspect) => {
        const out = p.state!.draft!;
        if (out.devSeasons.length) out.devSeasons[0].age += 1;
        else { out.devSeasons.push(clone(p.state!.lines[0])); out.ageAfter += 1; }
      },
    ];
    for (const corrupt of broken) {
      const bad = clone(done); corrupt(bad); seed(row, prospectSave(bad));
      const bytes = localStorage.getItem(row.sport.saveKey), view = mount(row);
      expect(view.getByRole('status')).toHaveTextContent('This prospect save is incomplete');
      expect(journey(view)).toBeNull();
      expect(view.getByRole('button', { name: 'Play your road to the draft' })).toBeEnabled();
      expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
      expect(localStorage.getItem('unrelated-prospect-fixture')).toBe('keep this save');
      view.unmount();
    }
  });

  it.each(SPORTS)('$label back before route selection preserves the player and clears only the unfinished save', row => {
    const p = prospect(row);
    seed(row, prospectSave(p));
    let view = mount(row);
    fireEvent.click(buttons(view).getByRole('button', { name: 'Back to player' }));
    expect(view.getByRole('textbox', { name: 'Your player name' })).toHaveValue(p.name);
    expect(localStorage.getItem(row.sport.saveKey)).toBeNull();
    expect(localStorage.getItem('unrelated-prospect-fixture')).toBe('keep this save');
    view.unmount(); view = mount(row);
    expect(journey(view)).toBeNull();
    expect(view.getByRole('button', { name: 'Enter the draft' })).toBeEnabled();
  });

  it.each(SPORTS)('$label rules reopen and showcase approaches pay their displayed stock moves', row => {
    const p = prospect(row);
    seed(row, prospectSave(p));
    let view = mount(row);
    expect(journey(view)).toHaveTextContent('For example:');
    expect(journey(view)).toHaveTextContent('The button shows the exact change before you choose');
    fireEvent.click(buttons(view).getByRole('button', { name: 'Got it' }));
    expect(view.container.querySelector('#prospect-help')).toBeNull();
    fireEvent.click(buttons(view).getByRole('button', { name: 'Road to the draft help' }));
    expect(view.container.querySelector('#prospect-help')).toHaveTextContent('All prospects and results are fictional');
    view.unmount();
    let ready = toShowcase(row, start(row, p));
    for (let n = 0; n < 40 && (ready.state!.stock < 10 || ready.state!.stock >= 90); n++) {
      ready = toShowcase(row, start(row, prospect(row, `showcase-${n}`)));
    }
    expect(ready.state!.stock).toBeGreaterThanOrEqual(10);
    expect(ready.state!.stock).toBeLessThan(90);
    const results: PreDraftState[] = [];
    for (const [label, id] of [['Go all out', 'allout'], ['Play it safe', 'steady'], ['Skip it', 'skip']] as const) {
      seed(row, prospectSave(ready)); view = mount(row);
      const option = buttons(view).getByRole('button', { name: new RegExp(`^${label}`) });
      const promise = within(option).getByTestId('approach-promise').textContent!;
      fireEvent.click(option);
      const result = saved(row).prospect!.state!, sc = result.showcase!;
      const move = `${sc.stockDelta >= 0 ? '+' : ''}${sc.stockDelta}`;
      expect(promise).toContain(sc.grade ? `${sc.grade} ${move}` : `Draft stock ${move}`);
      expect(result.stock).toBe(ready.state!.stock + sc.stockDelta);
      expect(sc.approach).toBe(id);
      expect(buttons(view).getByTestId('showcase-result')).toHaveTextContent(`Draft stock ${move}, now ${result.stock}`);
      results.push(result); view.unmount();
    }
    expect(results[0].showcase!.grade).toBe(results[1].showcase!.grade);
    expect(results[0].showcase!.stockDelta).not.toBe(results[1].showcase!.stockDelta);
    expect(results[2].showcase!.grade).toBeNull();
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SoccerConquest from '@/pages/SoccerConquest';
import Board, { type ConquestReportProgress } from '@/components/conquest/ImperialismBoardShared';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ReportQuestion from '@/components/game/ReportQuestion';
import ReportSiteIssue from '@/components/game/ReportSiteIssue';
import { buildReportContext } from '@/lib/reportContext';
import { SOCCER_CONQUEST_GAME, SOCCER_CONQUEST_MAP, SOCCER_IMPERIALISM } from '@/data/soccerConquest';

const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));
const observedRng = vi.hoisted(() => ({ draws: [] as number[] }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: delivery.invoke },
    from: (table: string) => { expect(table).toBe('question_reports'); return { insert: delivery.insert }; },
  },
}));
vi.mock('@/lib/conquestDaily', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/conquestDaily')>();
  return {
    ...actual,
    dailyConquestRng: (...args: Parameters<typeof actual.dailyConquestRng>) => {
      const rng = actual.dailyConquestRng(...args);
      return () => { const value = rng(); observedRng.draws.push(value); return value; };
    },
  };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({
  default: () => null, stripBrand: (title: string) => title, useSeoMetaTitle: () => 'Soccer Conquest',
}));
vi.mock('react-helmet-async', () => ({ Helmet: () => null }));
vi.mock('@/hooks/useRoutePath', () => ({ useRoutePath: () => '/soccer-conquest' }));
vi.mock('@/data/gameContent/loader', () => ({ peekGameContent: () => null, loadGameContent: async () => null }));
vi.mock('@/components/conquest/ConquestRegionMap', () => ({ default: () => null }));
vi.mock('@/components/conquest/ConquestTimeline', () => ({ default: () => null }));
vi.mock('@/components/conquest/ConquestStandingsStrip', () => ({ default: () => null }));
vi.mock('@/components/conquest/ConquestWheel', async importOriginal => ({
  ...await importOriginal<typeof import('@/components/conquest/ConquestWheel')>(), default: () => null,
}));
vi.mock('@/components/conquest/ImperialismHowToPlay', () => ({ ImperialismHowToPlay: () => null }));
vi.mock('@/components/club-manager/Celebration', () => ({ CelebrationStyles: () => null, ConfettiBurst: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

type View = ReturnType<typeof render>;
type Payload = { game_type: string; game_context: Record<string, unknown>; description: string };
const keys = ['phase', 'mode', 'puzzleDate', 'roundsCompleted', 'featuredAvailable', 'callSelected', 'sceneActive', 'playState', 'continueState'];
const sharedKeys = new Set(['path', 'date', 'submittedAt', 'source', 'diagnostics', 'contextTruncated']);
const boardProps = { sport: SOCCER_IMPERIALISM, map: SOCCER_CONQUEST_MAP, game: SOCCER_CONQUEST_GAME };
const sentinels = ['FICTIONAL_PRIVATE_ACCOUNT_483', 'FICTIONAL_PRIVATE_PLAYER_527', 'FICTIONAL_PRIVATE_ID_918'];
const day = '2026-10-31';
let evidence: Array<{ label: string; value: unknown }> = [];
const record = (label: string, value: unknown) => evidence.push({ label, value: value === undefined ? null : JSON.parse(JSON.stringify(value)) });
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => (
  Array.from({ length: storage.length }, (_, index): [string, string | null] => {
    const key = storage.key(index)!; return [key, storage.getItem(key)];
  }).sort(([left], [right]) => left.localeCompare(right))
)));
const seedStores = () => {
  localStorage.setItem('fixture-private-account', JSON.stringify({ account: sentinels[0], player: sentinels[1] }));
  sessionStorage.setItem('fixture-private-id', sentinels[2]);
};
const root = (page: Parameters<typeof render>[0]) => <MemoryRouter>{page}</MemoryRouter>;
const required = <T extends Element,>(value: T | null, label: string): T => {
  expect(value, 'CQ_REPORT_FOUNDATION ' + label).not.toBeNull(); return value!;
};
const click = (value: Element) => fireEvent.click(value);
const start = (view: View) => {
  const first = SOCCER_IMPERIALISM.teams[0];
  const label = first.city ? first.city + ' ' + first.name : first.name;
  click(required(view.getByText(label, { exact: true }).closest('button'), 'real club button'));
};
const call = (view: View) => click(required(view.container.querySelector<HTMLButtonElement>('[data-conquest-pick]'), 'real featured call'));
const play = (view: View) => click(required(view.container.querySelector<HTMLButtonElement>('[data-conquest-play]'), 'real Play'));
const skip = (view: View) => click(view.getByRole('button', { name: 'Skip to the results' }));
const continueOn = (view: View) => click(required(view.container.querySelector<HTMLButtonElement>('[data-conquest-continue]'), 'real Continue'));
const gameFields = (context: Record<string, unknown>) => Object.fromEntries(Object.entries(context).filter(([key]) => !sharedKeys.has(key)));
const domControls = (view: View) => {
  const button = view.container.querySelector<HTMLButtonElement>('[data-conquest-play]');
  return { playPresent: !!button, playDisabled: button?.disabled ?? null, continuePresent: !!view.container.querySelector('[data-conquest-continue]'), scenePresent: !!view.container.querySelector('[data-scene-player]') };
};
async function send(view: View, footer = false): Promise<Payload> {
  expect(view.getAllByRole('button', { name: 'Report a problem' })).toHaveLength(1);
  click(view.getByRole('button', { name: 'Report a problem' }));
  fireEvent.change(view.getByRole('textbox'), { target: { value: 'The next action needs checking.' } });
  await act(async () => { click(view.getByRole('button', { name: footer ? 'Send report' : 'Submit Report' })); });
  const payload = delivery.invoke.mock.calls.slice(-1)[0]?.[1]?.body as Payload | undefined;
  record('actual submitted payload', payload);
  expect(payload, 'CQ_REPORT_FOUNDATION actual report delivery').toBeDefined();
  fireEvent.keyDown(view.getByRole('dialog'), { key: 'Escape' });
  await act(async () => { vi.advanceTimersByTime(50); });
  expect(view.queryByRole('dialog')).toBeNull();
  return payload!;
}
async function assertStage(view: View, expected: ConquestReportProgress) {
  const dom = domControls(view), payload = await send(view);
  record('actual stage and controls', { expected, dom, payload });
  const fields = gameFields(payload.game_context);
  const { playState: _play, continueState: _continue, ...progress } = expected;
  expect(fields, 'CQ_REPORT_CURRENT actual mounted scalar progress').toMatchObject(progress);
  expect(fields.playState, 'CQ_REPORT_CONTROL_SEMANTICS actual Play state').toBe(expected.playState);
  expect(fields.continueState, 'CQ_REPORT_CONTROL_SEMANTICS actual Continue state').toBe(expected.continueState);
  expect(dom.playPresent).toBe(expected.playState !== 'not-rendered');
  if (dom.playPresent) expect(dom.playDisabled).toBe(expected.playState === 'prediction-required');
  expect(dom.continuePresent).toBe(expected.continueState === 'ready');
  expect(Object.keys(fields).sort(), 'CQ_REPORT_PRIVACY exact scalar allowlist').toEqual([...keys].sort());
  return payload;
}

beforeEach(() => {
  evidence = []; localStorage.clear(); sessionStorage.clear(); observedRng.draws.length = 0;
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));
  window.history.replaceState({}, '', '/soccer-conquest');
  delivery.invoke.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  delivery.insert.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  try {
    const directory = process.env.CQ_REPORT_EVIDENCE;
    if (directory) {
      fs.mkdirSync(directory, { recursive: true });
      const name = expect.getState().currentTestName ?? 'unknown-test';
      fs.writeFileSync(path.join(directory, name.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.json'), JSON.stringify({ name, evidence, scope: 'Guide-origin reporting contract, unit clock, actual engine and scene hook. Original first-match blocker remains UNREPRODUCED.' }, null, 2));
    }
  } finally { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); }
});

describe('Conquest guide report progress', () => {
  it('CQ_REPORT_CURRENT_AND_CONTROLS uses actual mounted progress and control states', async () => {
    let view = render(root(<SoccerConquest />));
    const initial: ConquestReportProgress = { phase: 'pick', mode: 'daily', puzzleDate: day, roundsCompleted: 0, featuredAvailable: false, callSelected: false, sceneActive: false, playState: 'not-rendered', continueState: 'not-rendered' };
    await assertStage(view, initial);
    click(view.getByRole('button', { name: 'Free Play' }));
    await assertStage(view, { ...initial, mode: 'free', puzzleDate: null });
    click(view.getByRole('button', { name: 'Daily Challenge' }));
    start(view);
    const preview: ConquestReportProgress = { ...initial, phase: 'preview', featuredAvailable: true, playState: 'prediction-required' };
    await assertStage(view, preview);
    call(view);
    await assertStage(view, { ...preview, callSelected: true, playState: 'ready' });
    play(view);
    const recap: ConquestReportProgress = { ...preview, phase: 'recap', roundsCompleted: 1, sceneActive: true, playState: 'not-rendered', continueState: 'scene-playing' };
    await assertStage(view, recap);
    skip(view);
    await assertStage(view, { ...recap, sceneActive: false, continueState: 'ready' });
    const saved = stores();
    view.unmount();
    view = render(root(<SoccerConquest />));
    expect(stores(), 'CQ_REPORT_FOUNDATION reload retains exact actual daily record').toBe(saved);
    await assertStage(view, { ...recap, sceneActive: false, continueState: 'ready' });
    continueOn(view);
    await assertStage(view, { ...preview, roundsCompleted: 1 });
    vi.setSystemTime(new Date('2026-11-01T06:00:00.000Z'));
    const afterMidnight = await assertStage(view, { ...preview, roundsCompleted: 1 });
    expect(afterMidnight.game_context).toMatchObject({ puzzleDate: day, date: '2026-11-01', source: 'game-report-button', path: '/soccer-conquest' });
  });

  it('CQ_REPORT_PRIVACY_AND_GAME_HOLDS preserves paired game and report boundaries', async () => {
    const run = (observed: boolean) => {
      cleanup(); localStorage.clear(); sessionStorage.clear(); seedStores(); observedRng.draws.length = 0;
      const checkpoints: Array<{ label: string; stores: string; draws: number[] }> = [];
      let latest: ConquestReportProgress | null = null;
      const checkpoint = (label: string) => checkpoints.push({ label, stores: stores(), draws: [...observedRng.draws] });
      checkpoint('before publication');
      const Witness = () => {
        const [progress, setProgress] = useState<ConquestReportProgress | null>(null);
        latest = progress;
        return <Board {...boardProps} onReportProgressChange={observed ? setProgress : undefined} />;
      };
      const view = render(root(<Witness />));
      checkpoint('mounted publication');
      start(view); checkpoint('start and publication');
      call(view); checkpoint('call and publication');
      play(view); checkpoint('first actual Play and publication');
      skip(view); checkpoint('settled publication');
      continueOn(view); checkpoint('Continue and publication');
      call(view); play(view); checkpoint('second actual Play and publication');
      record(observed ? 'callback present full intervals' : 'callback absent full intervals', { checkpoints, latest });
      return { view, checkpoints, latest: () => latest };
    };
    const absent = run(false);
    const present = run(true);
    expect(present.checkpoints[0], 'CQ_REPORT_FOUNDATION identical pre-publication inputs').toEqual(absent.checkpoints[0]);
    expect(present.checkpoints.map(row => row.draws), 'CQ_REPORT_RNG_PUBLICATION real draw vectors across publication and actions').toEqual(absent.checkpoints.map(row => row.draws));
    expect(present.checkpoints.map(row => row.stores), 'CQ_REPORT_STORE_PUBLICATION complete stores across publication and actions').toEqual(absent.checkpoints.map(row => row.stores));
    const current = present.latest();
    expect(current, 'CQ_REPORT_FOUNDATION actual observed Board snapshot').not.toBeNull();
    const before = stores(), draws = [...observedRng.draws];
    const built = buildReportContext(current!);
    record('actual built context', built);
    expect(stores(), 'CQ_REPORT_STORE_SUBMISSION pure context build').toBe(before);
    expect(observedRng.draws, 'CQ_REPORT_RNG_SUBMISSION pure context build').toEqual(draws);
    const question = render(<ReportQuestion gameType="soccer-conquest" gameContext={current!} />);
    const reads = vi.spyOn(Storage.prototype, 'getItem');
    reads.mockClear();
    const payload = await send(question);
    expect(reads.mock.calls, 'CQ_REPORT_PRIVACY report operation reads no storage').toEqual([]);
    reads.mockRestore();
    expect(stores(), 'CQ_REPORT_STORE_SUBMISSION actual report delivery').toBe(before);
    expect(observedRng.draws, 'CQ_REPORT_RNG_SUBMISSION actual report delivery').toEqual(draws);
    const fields = gameFields(payload.game_context);
    record('actual report privacy fields', fields);
    expect(Object.keys(fields).sort(), 'CQ_REPORT_PRIVACY exact scalar allowlist').toEqual([...keys].sort());
    expect(Object.values(fields).every(value => value === null || ['string', 'boolean', 'number'].includes(typeof value)), 'CQ_REPORT_PRIVACY primitive fields only').toBe(true);
    for (const sentinel of sentinels) expect(JSON.stringify(payload), 'CQ_REPORT_PRIVACY no private fixture payload').not.toContain(sentinel);
    expect(JSON.stringify(payload.game_context).length).toBeLessThan(1500);
    expect(payload.game_context).toMatchObject({ path: '/soccer-conquest', source: 'game-report-button', date: day });
    delivery.invoke.mockResolvedValueOnce({ data: null, error: { message: 'Fixture relay unavailable' } });
    const fallback = await send(question);
    expect(delivery.insert).toHaveBeenLastCalledWith(fallback);
    expect(stores(), 'CQ_REPORT_STORE_SUBMISSION fallback delivery').toBe(before);
    expect(observedRng.draws, 'CQ_REPORT_RNG_SUBMISSION fallback delivery').toEqual(draws);
    question.unmount();
    const footer = render(<ReportSiteIssue />);
    const site = await send(footer, true);
    expect(site.game_type).toBe('site');
    expect(site.game_context.source).toBe('footer-report-button');
    expect(gameFields(site.game_context), 'CQ_REPORT_PRIVACY footer is not enriched').toEqual({});
    expect(stores(), 'CQ_REPORT_STORE_SUBMISSION footer delivery').toBe(before);
    expect(observedRng.draws, 'CQ_REPORT_RNG_SUBMISSION footer delivery').toEqual(draws);
  });

  it('CQ_REPORT_MOUNT_CLEANUP clears a removed Board and replaced subscriber', async () => {
    const Host = ({ show }: { show: boolean }) => {
      const [progress, setProgress] = useState<ConquestReportProgress | null>(null);
      return root(<>{show && <Board {...boardProps} onReportProgressChange={setProgress} />}<GameSeoContent title="Soccer Conquest" description="Fixture guide" pageHasOwnH1 reportGameContext={progress ?? {}} /></>);
    };
    const view = render(<Host show />);
    start(view);
    const active = await send(view);
    expect(active.game_context.phase, 'CQ_REPORT_FOUNDATION actual mounted preview').toBe('preview');
    view.rerender(<Host show={false} />);
    const removed = await send(view);
    record('Board removed with guide retained', removed);
    expect(gameFields(removed.game_context), 'CQ_REPORT_CLEANUP removed Board clears guide snapshot').toEqual({});
    view.rerender(<Host show />);
    const remounted = await send(view);
    expect(remounted.game_context.phase, 'CQ_REPORT_CLEANUP remount observes actual restored preview').toBe('preview');
    cleanup(); localStorage.clear(); sessionStorage.clear();
    const fresh = render(root(<SoccerConquest />));
    expect((await send(fresh)).game_context.phase, 'CQ_REPORT_CLEANUP new page has no stale progress').toBe('pick');
    cleanup();
    const first = vi.fn(), second = vi.fn();
    const subscriber = render(root(<Board {...boardProps} onReportProgressChange={first} />));
    expect(first.mock.calls.slice(-1)[0]?.[0]).toMatchObject({ phase: 'pick' });
    subscriber.rerender(root(<Board {...boardProps} onReportProgressChange={second} />));
    record('replaced callback observations', { first: first.mock.calls, second: second.mock.calls });
    expect(first.mock.calls.slice(-1)[0]?.[0], 'CQ_REPORT_CLEANUP old subscriber clears').toBeNull();
    expect(second.mock.calls.slice(-1)[0]?.[0], 'CQ_REPORT_CLEANUP new subscriber gets current progress').toMatchObject({ phase: 'pick' });
    subscriber.unmount();
    expect(second.mock.calls.slice(-1)[0]?.[0], 'CQ_REPORT_CLEANUP final subscriber clears').toBeNull();
  });
});

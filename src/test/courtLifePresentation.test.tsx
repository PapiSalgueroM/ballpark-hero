import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CourtLifeBoard from '@/components/court-life/CourtLifeBoard';
import { CourtLifeCanvas } from '@/components/court-life/CourtLifeCanvas';
import { COURT_BALL_RADIUS, COURT_LENGTH, COURT_RIM_HEIGHT, COURT_RIM_RADIUS, COURT_THREE_POINT_DISTANCE, COURT_WIDTH, courtBasket, courtPassTarget, courtShotMeter, createCourtMatch, neutralCourtInput, simulateCourtMatch, stepCourtMatch, type CourtMatch } from '@/lib/courtLife';
import { COURT_CAREER_SAVE_KEY, applyCareerAction, careerMatchConfig, chooseLifeDecision, completeCareerMatch, courtCareerPlayer, courtSeasonScoreBreakdown, courtSeasonStats, courtStandings, createCourtLifeCareer, currentLifeDecision, decodeCourtLifeSave, encodeCourtLifeSave, previewCareerAction, startCareerMatch, updateCareerMatch, type CourtCareer, type CourtCareerEffect } from '@/lib/courtLifeCareer';
import { COURT_ATTRIBUTE_KEYS, createCourtLifeWorld } from '@/data/courtLifeWorld';
import { COURT_COLORS, drawCourtLife } from '@/lib/courtLifeRender';

vi.mock('@/lib/courtLife', async original => {
  const actual = await original<typeof import('@/lib/courtLife')>();
  return { ...actual, stepCourtMatch: vi.fn(actual.stepCourtMatch) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

type Drawing = { method: string; args: number[]; fill: string; stroke: string; dash: number[] };
function recordingContext() {
  const calls: Drawing[] = [], stack: Array<{ fill: string; stroke: string; dash: number[] }> = [];
  const state = { fill: '', stroke: '', dash: [] as number[] };
  const methods = ['clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'ellipse', 'arc', 'rect', 'clip', 'translate', 'scale', 'setTransform'];
  const context: Record<string, unknown> = Object.fromEntries(methods.map(method => [method, (...args: number[]) => calls.push({ method, args, ...state, dash: [...state.dash] })]));
  Object.defineProperties(context, {
    fillStyle: { get: () => state.fill, set: (value: string) => { state.fill = value; } },
    strokeStyle: { get: () => state.stroke, set: (value: string) => { state.stroke = value; } },
  });
  context.setLineDash = (dash: number[]) => { state.dash = [...dash]; };
  context.save = () => stack.push({ ...state, dash: [...state.dash] });
  context.restore = () => { const saved = stack.pop(); if (saved) Object.assign(state, saved); };
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

let realStep: typeof stepCourtMatch, now: number, nextFrame: number;
let frames: Map<number, FrameRequestCallback>, drawing: ReturnType<typeof recordingContext>;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
beforeEach(async () => {
  realStep = (await vi.importActual<typeof import('@/lib/courtLife')>('@/lib/courtLife')).stepCourtMatch;
  vi.clearAllMocks(); vi.mocked(stepCourtMatch).mockImplementation(realStep); localStorage.clear();
  now = 100; nextFrame = 0; frames = new Map(); drawing = recordingContext();
  vi.spyOn(document, 'hasFocus').mockReturnValue(true); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('crypto', { randomUUID: () => 'presentation-created', getRandomValues: (array: Uint32Array) => { array[0] = 1075; return array; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => drawing.context);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 680, bottom: 400, width: 680, height: 400, toJSON: () => ({}) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(elapsed: number) {
  act(() => { now += elapsed; const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); });
}
function saved() {
  const decoded = decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!);
  expect(decoded.status, 'The visible action produces a valid actual career save').toBe('valid');
  if (decoded.status !== 'valid') throw new Error('Expected a valid test career');
  return decoded.career;
}
function makeCareer(seed = 1075) {
  return createCourtLifeCareer({ id: 'presentation-career', seed, name: 'Remy Vale', crewId: 'copper-owls', archetypeId: 'shooter' });
}
function prepared(career: CourtCareer) {
  career = applyCareerAction(applyCareerAction(career, { kind: 'recovery' }), { kind: 'team' });
  return chooseLifeDecision(career, currentLifeDecision(career).options.find(option => !option.reason)!.id);
}
let ownBallCache: CourtCareer | undefined, closeCache: CourtCareer | undefined, seasonCache: CourtCareer | undefined, finishedCache: CourtCareer | undefined;
function ownsBallCareer() {
  if (!ownBallCache) for (let seed = 1; seed < 100; seed++) {
    const career = startCareerMatch(prepared(makeCareer(seed)));
    let match = career.activeMatch!.match;
    while (match.phase === 'inbound') match = realStep(match);
    if (match.ball.ownerId === career.playerId) { ownBallCache = updateCareerMatch(career, match, true); break; }
  }
  expect(ownBallCache, 'A real legal inbound gives the human possession').toBeDefined();
  return clone(ownBallCache!);
}
function closeFinisherCareer() {
  if (!closeCache) for (let seed = 1; seed <= 8 && !closeCache; seed++) {
    const career = startCareerMatch(prepared(createCourtLifeCareer({ id: 'close-finisher', seed, name: 'Ari Rowan', crewId: 'copper-owls', archetypeId: 'finisher' })));
    let match = createCourtMatch({ ...careerMatchConfig(career), controlledPlayerId: null });
    for (let tick = 0; tick < 2200; tick++) {
      match = realStep(match);
      const player = match.players.find(row => row.id === career.playerId)!, basket = courtBasket(player.side);
      if (match.phase === 'playing' && match.ball.ownerId === player.id && Math.hypot(player.x - basket.x, player.y - basket.y) < 3) {
        match.controlledPlayerId = career.playerId;
        closeCache = updateCareerMatch(career, match, true); break;
      }
    }
  }
  expect(closeCache, 'An actual six-AI possession brings the finisher inside three units').toBeDefined();
  return clone(closeCache!);
}
function completedSeason() {
  if (!seasonCache) {
    let career = makeCareer();
    for (let round = 0; round < 6; round++) {
      career = startCareerMatch(prepared(career));
      const match = simulateCourtMatch(careerMatchConfig(career));
      career = completeCareerMatch(career, match);
      expect(career.round, 'Each complete engine match is accepted once').toBe(round + 1);
    }
    seasonCache = career;
  }
  return clone(seasonCache);
}
function finishedCareer() {
  if (!finishedCache) {
    const career = startCareerMatch(prepared(makeCareer()));
    const match = simulateCourtMatch(careerMatchConfig(career));
    match.controlledPlayerId = career.playerId;
    finishedCache = updateCareerMatch(career, match, true);
  }
  return clone(finishedCache);
}
function mount(career?: CourtCareer) {
  if (career) localStorage.setItem(COURT_CAREER_SAVE_KEY, encodeCourtLifeSave(career));
  return render(<CourtLifeBoard helpOpen={false} onHelp={vi.fn()} />);
}
function createThroughForm() {
  fireEvent.change(screen.getByRole('textbox', { name: "Your player's name" }), { target: { value: 'Mika Rowan' } });
  fireEvent.click(screen.getByRole('checkbox', { name: "I've read the controls and house rules." }));
  fireEvent.click(screen.getByRole('button', { name: 'Start your career' }));
}
function visibleEffect(element: HTMLElement, effect: CourtCareerEffect) {
  for (const key of ['condition', 'credits', 'trust', ...COURT_ATTRIBUTE_KEYS] as const) {
    const amount = key in effect.attrs ? effect.attrs[key as keyof typeof effect.attrs] : effect[key as 'condition' | 'credits' | 'trust'];
    if (amount) expect(element, `The ${key} delta is visible before committing the choice`).toHaveTextContent(`${amount > 0 ? '+' : ''}${amount} ${key}`);
  }
}
function resources(career: CourtCareer, container: HTMLElement) {
  for (const key of ['condition', 'credits', 'trust'] as const) expect(container.querySelector(`[data-court-resource="${key}"]`)).toHaveTextContent(`${career.resources[key]}${key === 'credits' ? '' : '/100'}`);
}

// Independent world-to-canvas calculation, not a call through the renderer under test.
function project(x: number, y: number, z = 0, width = 680, height = 400) {
  const scale = Math.min((width - 28) / COURT_LENGTH, (height - 54) / (COURT_WIDTH * .72));
  return { x: (width - COURT_LENGTH * scale) / 2 + (COURT_LENGTH - y) * scale,
    y: (height - COURT_WIDTH * scale * .72) / 2 + 9 + x * scale * .72 - z * scale * .75, scale };
}
function circle(calls: Drawing[], expected: number[], filter: (call: Drawing) => boolean) {
  const found = calls.filter(filter).some(call => expected.every((value, index) => Math.abs(call.args[index] - value) < 1e-7));
  expect(found, `An actual canvas path uses engine geometry ${expected.join(', ')}`).toBe(true);
}

describe('Court Life actual presentation', () => {
  it('requires a name and read rules then creates the selected real player and crew', () => {
    const help = vi.fn(); render(<CourtLifeBoard helpOpen={false} onHelp={help} />);
    const start = screen.getByRole('button', { name: 'Start your career' });
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: "Your player's name" }), { target: { value: 'Mika Rowan' } });
    expect(start, 'A name alone cannot bypass the rules gate').toBeDisabled();
    expect(screen.getByText(/For example: pass to an open teammate/)).toBeVisible();
    expect(screen.getByText(/Two 75-second halves/)).toHaveTextContent('12-second shot clock');
    const world = createCourtLifeWorld(), crew = world.crews[2], style = world.archetypes[4];
    fireEvent.click(screen.getByRole('button', { name: crew.name })); fireEvent.click(screen.getByRole('button', { name: style.name }));
    expect(screen.getByRole('button', { name: crew.name })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: "I've read the controls and house rules." })); expect(start).toBeEnabled();
    fireEvent.click(start);
    const career = saved(); expect(career.crewId).toBe(crew.id); expect(career.archetypeId).toBe(style.id);
    expect(courtCareerPlayer(career)).toMatchObject({ name: 'Mika Rowan', attrs: style.attrs });
    expect(screen.getByRole('heading', { name: 'Mika Rowan' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Court Life rules' })); expect(help).toHaveBeenCalledTimes(1);
  });

  it('shows exact preparation and life tradeoffs before allowing entry to the actual match', () => {
    const initial = makeCareer(), view = mount(initial);
    expect(screen.getByRole('button', { name: /Go to the court/ })).toBeDisabled(); resources(initial, view.container);
    fireEvent.click(screen.getByRole('button', { name: /^Your day/ }));
    const recovery = screen.getByRole('button', { name: /^Recovery/ }); visibleEffect(recovery, previewCareerAction(initial, { kind: 'recovery' }).effect);
    fireEvent.click(recovery);
    const recovered = applyCareerAction(initial, { kind: 'recovery' }); expect(saved()).toEqual(recovered); resources(recovered, view.container);
    const training = screen.getByRole('button', { name: /^Train shooting/ }); visibleEffect(training, previewCareerAction(recovered, { kind: 'training', attribute: 'shooting' }).effect);
    fireEvent.click(training);
    const trained = applyCareerAction(recovered, { kind: 'training', attribute: 'shooting' }); expect(saved()).toEqual(trained); resources(trained, view.container);
    expect(screen.getByRole('button', { name: /^Train shooting/ })).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('0 time blocks left');
    fireEvent.click(screen.getByRole('button', { name: 'Back to your day' })); expect(screen.getByRole('button', { name: /Go to the court/ }), 'Both blocks alone do not replace a life choice').toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Life off court/ }));
    const option = currentLifeDecision(trained).options.find(row => !row.reason)!;
    const choice = screen.getByRole('button', { name: new RegExp(`^${option.label}`) }); visibleEffect(choice, option.effect); fireEvent.click(choice);
    const decided = chooseLifeDecision(trained, option.id); expect(saved()).toEqual(decided); resources(decided, view.container);
    expect(screen.getByRole('status')).toHaveTextContent(`You chose: ${option.label}`);
    fireEvent.click(screen.getByRole('button', { name: 'Back to your day' })); expect(screen.getByRole('button', { name: /Go to the court/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Go to the court/ }));
    const active = saved(); expect(active).toEqual(startCareerMatch(decided));
    expect(view.container.querySelector('[data-court-match]')).toHaveAttribute('data-court-paused', 'true');
    expect(screen.getByRole('button', { name: 'Start play' })).toBeVisible();
    expect(JSON.parse(view.container.querySelector('canvas')!.dataset.courtFrame!).tick).toBe(active.activeMatch!.match.tick);
  });

  it('renders the actual completed season table stats score and archived choices after restore', () => {
    const career = completedSeason(), view = mount(career), raw = localStorage.getItem(COURT_CAREER_SAVE_KEY);
    const stats = courtSeasonStats(career), score = courtSeasonScoreBreakdown(career);
    expect(career.results).toHaveLength(12); expect(career.chapters[0].weeks).toHaveLength(6);
    expect(screen.queryByRole('heading', { name: `${score.total}/100 season score` }), 'The season home shows its actual final score').not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Season recap' }));
    const table = screen.getByRole('table', { name: 'Season 1 standings' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent))).toEqual(courtStandings(career.world, career.fixtures, career.results).map(row => [career.world.crews.find(crew => crew.id === row.crewId)!.name, row.played, row.wins, row.draws, row.losses, row.scored - row.conceded].map(String)));
    for (const key of ['points', 'assists', 'rebounds', 'steals', 'blocks', 'turnovers'] as const) expect(screen.getByText(key).parentElement!.querySelector('strong')!.textContent).toBe(String(stats[key]));
    expect(screen.queryByRole('heading', { name: `Season score: ${score.total}/100` }), 'The recap shows the actual total score').not.toBeNull();
    for (const [label, value, cap] of [['Results', score.wins, 50], ['Scoring', score.scoring, 20], ['Teamwork', score.teamwork, 20], ['Ball security', score.security, 10]] as const) expect(screen.getByText(label).parentElement!.querySelector('dd')!.textContent).toBe(`${value.toFixed(1)}/${cap}`);
    fireEvent.click(screen.getByRole('button', { name: 'Back to your day' })); fireEvent.click(screen.getByRole('button', { name: 'Career chapters (1)' }));
    for (const week of career.chapters[0].weeks) {
      const heading = screen.queryByText(`Game ${week.round + 1}: ${week.decision.label}`);
      expect(heading, 'Every played round retains its actual contextual choice').not.toBeNull();
      const card = heading!.parentElement!; visibleEffect(card, week.decision.effect);
      expect(card).toHaveTextContent(week.preparation.map(record => record.label).join(' + ')); expect(card).toHaveTextContent(`Played as ${week.beforeMatch.role.toLowerCase()}`);
    }
    expect(localStorage.getItem(COURT_CAREER_SAVE_KEY), 'Reading recaps does not rewrite the saved career').toBe(raw);
    resources(career, view.container);
  }, 30000);

  it('keeps corrupt raw bytes until the player confirms replacement in the actual dialog', () => {
    const raw = '{my old career copy'; localStorage.setItem(COURT_CAREER_SAVE_KEY, raw); mount();
    expect(screen.getByText('Your saved copy is still here.')).toBeVisible(); createThroughForm();
    expect(localStorage.getItem(COURT_CAREER_SAVE_KEY)).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: 'Replace local save' }));
    expect(localStorage.getItem(COURT_CAREER_SAVE_KEY), 'Opening confirmation cannot replace the protected bytes').toBe(raw);
    let dialog = screen.getByRole('dialog', { name: 'Replace the saved copy?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep old save' })); expect(localStorage.getItem(COURT_CAREER_SAVE_KEY)).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: 'Replace local save' })); dialog = screen.getByRole('dialog', { name: 'Replace the saved copy?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace local save' }));
    expect(courtCareerPlayer(saved()).name).toBe('Mika Rowan'); expect(screen.queryByText('Your saved copy is still here.')).toBeNull();
  });

  it('shows the engine pass target and real charged release window through the mounted court', () => {
    const career = ownsBallCareer(), initial = career.activeMatch!.match, view = mount(career);
    const target = initial.players.find(row => row.id === courtPassTarget(initial, career.playerId))!;
    expect(target).toBeDefined(); expect(screen.queryByText(`Pass target: ${target.name}, marked by the dashed ring.`), 'The text names the actual engine receiver').not.toBeNull();
    const targetSpot = project(target.x, target.y);
    circle(drawing.calls, [targetSpot.x, targetSpot.y + 1, targetSpot.scale * .62, targetSpot.scale * .32], call => call.method === 'ellipse' && call.dash.join(',') === '3,3');
    fireEvent.click(screen.getByRole('button', { name: 'Resume play' })); frame(0);
    const canvas = view.container.querySelector('canvas')!; canvas.focus(); fireEvent.keyDown(canvas, { key: 'j' }); frame(100);
    const actual = vi.mocked(stepCourtMatch).mock.results.at(-1)!.value as CourtMatch;
    const player = actual.players.find(row => row.id === career.playerId)!; expect(player.chargeTicks).toBeGreaterThan(0);
    const expected = courtShotMeter(actual, player.id), meter = screen.getByRole('meter', { name: 'Shot release meter' });
    expect(Number(meter.getAttribute('aria-valuenow')), 'The visible meter follows the actual held shot').toBe(expected.charge);
    expect(meter).toHaveAttribute('aria-valuetext', 'Release inside the gold window');
    const [window, indicator] = [...meter.querySelectorAll('span')];
    expect(Number.parseFloat(window.style.left)).toBeCloseTo(Math.max(0, expected.ideal - expected.window) * 100, 8);
    expect(Number.parseFloat(window.style.width)).toBeCloseTo(expected.window * 200, 8);
    expect(indicator.style.left).toBe(`calc(${Math.min(1, expected.charge) * 100}% - 2px)`);
    expect(screen.getByText('Release Shoot in the gold window. Space and distance still matter.')).toHaveClass('text-xs');
    const frameData = JSON.parse(canvas.dataset.courtFrame!); expect(frameData.tick).toBe(actual.tick);
    expect(frameData.ball.x).toBeCloseTo(project(actual.ball.x, actual.ball.y, actual.ball.z).x, 8);
  });

  it('shows all six earned box score rows and returns actual match consequences to the hub', () => {
    const career = finishedCareer(), match = career.activeMatch!.match, view = mount(career);
    expect(view.container.querySelector('[data-court-score="home"]')!.textContent).toBe(String(match.score.home));
    expect(view.container.querySelector('[data-court-score="away"]')!.textContent).toBe(String(match.score.away));
    fireEvent.click(screen.getByRole('button', { name: 'View match stats' }));
    const dialog = screen.getByRole('dialog', { name: 'Every possession counted' });
    for (const side of ['home', 'away'] as const) {
      const table = within(dialog).getByRole('table', { name: `${match.teams[side].name} · ${match.score[side]}` });
      expect(within(table).getAllByRole('row').slice(1).map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent))).toEqual(match.players.filter(player => player.side === side).map(player => [player.name, String(player.stats.points), `${player.stats.made}/${player.stats.attempts}`, ...(['assists', 'rebounds', 'steals', 'blocks', 'turnovers'] as const).map(key => String(player.stats[key]))]));
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Finish game and return to your day' }));
    const expected = completeCareerMatch(career, match); expect(saved()).toEqual(expected); expect(expected.round).toBe(1); resources(expected, view.container);
    const week = expected.weeks[0];
    const deltas = (['credits', 'condition', 'trust'] as const).map(key => { const value = week.afterMatch[key] - week.beforeMatch.resources[key]; return `${value >= 0 ? '+' : ''}${value} ${key}`; }).join(' · ');
    expect(screen.getByRole('status')).toHaveTextContent(`Last game: ${deltas}.`);
  }, 30000);

  it('shows the finishing release window for an actual close range finisher possession', () => {
    const career = closeFinisherCareer(), match = career.activeMatch!.match, player = match.players.find(row => row.id === career.playerId)!;
    const basket = courtBasket(player.side);
    expect(Math.hypot(player.x - basket.x, player.y - basket.y)).toBeLessThan(3);
    expect(player.attrs.finishing).toBeGreaterThan(player.attrs.shooting);
    mount(career);
    const meter = screen.getByRole('meter', { name: 'Shot release meter' }), window = meter.querySelector('span')!;
    expect(Number.parseFloat(window.style.width), 'An inside finisher sees the timing window that the shot actually uses').toBeCloseTo((1.3 + player.attrs.finishing * .025) / 30 * 200, 8);
    expect(Number.parseFloat(window.style.width)).not.toBeCloseTo((1.3 + player.attrs.shooting * .025) / 30 * 200, 4);
    expect(meter).toHaveAttribute('aria-valuetext', 'Hold Shoot to charge');
  }, 30000);

  it('draws actual player ball rim and three point coordinates and redraws the latest engine frame', () => {
    let match = ownsBallCareer().activeMatch!.match;
    match = realStep(match, { ...neutralCourtInput(), shoot: 'press' });
    for (let tick = 0; tick < 12; tick++) match = realStep(match);
    match = realStep(match, { ...neutralCourtInput(), shoot: 'release' });
    expect(match.ball.mode).toBe('shot'); expect(match.ball.z).toBeGreaterThan(0);
    const snapshot = clone(match), matchRef = { current: match as CourtMatch | null }, drawRef = { current: null as (() => void) | null };
    const view = render(<CourtLifeCanvas matchRef={matchRef} drawRef={drawRef} />), canvas = view.container.querySelector('canvas')!;
    const frameData = JSON.parse(canvas.dataset.courtFrame!);
    for (const player of match.players) {
      const point = project(player.x, player.y, player.z), marker = frameData.players.find((row: { id: string }) => row.id === player.id);
      expect(marker.x).toBeCloseTo(point.x, 8); expect(marker.y).toBeCloseTo(point.y, 8);
      expect(drawing.calls.some(call => call.method === 'translate' && call.args[0] === Math.round(point.x) && call.args[1] === Math.round(point.y)), 'The real pixel player is placed at the engine position').toBe(true);
    }
    const ball = project(match.ball.x, match.ball.y, match.ball.z);
    circle(drawing.calls, [ball.x, ball.y, Math.max(2.4, COURT_BALL_RADIUS * ball.scale)], call => call.method === 'arc' && call.fill === COURT_COLORS.ball);
    expect(frameData.ball.y).toBeCloseTo(ball.y, 8); expect(frameData.ball.shadow.y).toBeGreaterThan(frameData.ball.y);
    for (const side of ['home', 'away'] as const) {
      const basket = courtBasket(side), rim = project(basket.x, basket.y, COURT_RIM_HEIGHT), floor = project(basket.x, basket.y);
      circle(drawing.calls, [rim.x, rim.y, COURT_RIM_RADIUS * rim.scale, COURT_RIM_RADIUS * rim.scale * .72], call => call.method === 'ellipse' && call.stroke === '#f1a065');
      circle(drawing.calls, [floor.x, floor.y, COURT_THREE_POINT_DISTANCE * floor.scale, COURT_THREE_POINT_DISTANCE * floor.scale * .72], call => call.method === 'ellipse' && call.stroke === COURT_COLORS.line);
    }
    expect(match).toEqual(snapshot);
    matchRef.current = realStep(match); drawing.calls.length = 0; act(() => drawRef.current!());
    expect(Number(canvas.dataset.courtTick), 'The next canvas draw uses the current match ref').toBe(matchRef.current.tick);
    const nextBall = project(matchRef.current.ball.x, matchRef.current.ball.y, matchRef.current.ball.z);
    circle(drawing.calls, [nextBall.x, nextBall.y], call => call.method === 'arc' && call.fill === COURT_COLORS.ball);
    view.unmount(); expect(drawRef.current).toBeNull();
  });

  it('removes stride animation under reduced motion while preserving the same court geometry and state', () => {
    let match = ownsBallCareer().activeMatch!.match;
    for (let tick = 0; tick < 8; tick++) match = realStep(match, { ...neutralCourtInput(), moveX: 1 });
    expect(match.players.some(player => Math.hypot(player.vx, player.vy) > .15 && Math.abs(Math.sin(player.stride * 5)) > .01)).toBe(true);
    const snapshot = clone(match), full = recordingContext(), calm = recordingContext();
    const fullFrame = drawCourtLife(full.context, match, 680, 400, false), calmFrame = drawCourtLife(calm.context, match, 680, 400, true);
    expect(calmFrame).toEqual(fullFrame); expect(match).toEqual(snapshot);
    const legs = (calls: Drawing[]) => calls.filter(call => call.method === 'fillRect' && call.fill === '#142b35').map(call => call.args[3]);
    expect(legs(calm.calls), 'Reduced motion still draws all twelve grounded legs').toEqual(Array(12).fill(4));
    expect(legs(full.calls).some(height => Math.abs(height - 4) > .01), 'The control arm actually contains stride animation').toBe(true);
  });

  it('retains the independent seeded engine baseline without presentation code', () => {
    const world = createCourtLifeWorld(), initial = createCourtMatch({ id: 'presentation-baseline', seed: 41, home: world.crews[0], away: world.crews[1] });
    let first = initial, second = initial;
    for (let tick = 0; tick < 900; tick++) { first = realStep(first); second = realStep(second); }
    expect(first).toEqual(second); expect(initial.tick).toBe(0); expect(first.tick).toBe(900);
    expect(first.events.some(event => event.kind === 'shot')).toBe(true); expect(first.events.some(event => event.kind === 'pass')).toBe(true);
  });
});

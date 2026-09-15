import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MemoryRouter } from 'react-router-dom';
import ConquestBoard from '@/components/conquest/ConquestBoard';
import ConquestBoardNba from '@/components/conquest/ConquestBoardNba';
import ConquestActionScene from '@/components/conquest/ConquestActionScene';
import type { ActionPlay } from '@/components/conquest/conquestActionFrames';

/* Browser fixture: real components, real hooks, a deterministic clock. The
 * harness observes each real hook's return value without changing its work. */
const root = createRoot(document.getElementById('root')!);
let clock = 0;
let reduced = false;
let hidden = false;
let sequence = 0;
let randomCalls = 0;
const frames = new Map<number, FrameRequestCallback>();
const timers = new Map<number, { at: number; every: number; run: () => void }>();
const mediaListeners = new Set<() => void>();
const RealDate = Date;
Object.defineProperty(window, 'Date', { value: class extends RealDate {
  constructor(value?: string | number | Date) { super(value === undefined ? 1789488000000 + clock : value as string); }
  static now() { return 1789488000000 + clock; }
} });
Object.defineProperty(performance, 'now', { value: () => clock });
Object.defineProperty(document, 'hidden', { get: () => hidden });
window.requestAnimationFrame = run => { frames.set(++sequence, run); return sequence; };
window.cancelAnimationFrame = id => { frames.delete(id); };
window.setTimeout = ((run: () => void, ms = 0) => { timers.set(++sequence, { at: clock + ms, every: 0, run }); return sequence; }) as typeof window.setTimeout;
window.setInterval = ((run: () => void, ms = 0) => { timers.set(++sequence, { at: clock + ms, every: ms, run }); return sequence; }) as typeof window.setInterval;
window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
window.matchMedia = ((media: string) => ({
  get matches() { return reduced && media.includes('reduced-motion'); }, media, onchange: null,
  addEventListener: (_: string, run: () => void) => { mediaListeners.add(run); },
  removeEventListener: (_: string, run: () => void) => { mediaListeners.delete(run); },
  addListener() {}, removeListener() {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

function advance(ms: number, draw = true) {
  const end = clock + ms;
  while (clock < end) {
    clock = Math.min(end, clock + 16);
    flushSync(() => {
      for (const [id, timer] of [...timers]) if (timer.at <= clock) {
        if (timer.every) timer.at += timer.every; else timers.delete(id);
        timer.run();
      }
      if (draw && !hidden) { const due = [...frames.values()]; frames.clear(); due.forEach(run => run(clock)); }
    });
  }
}
function preferences(nextReduced: boolean, nextHidden = false) {
  reduced = nextReduced; hidden = nextHidden;
  flushSync(() => {
    mediaListeners.forEach(run => run());
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
function reset(seed: number, reduce: boolean) {
  flushSync(() => root.render(null));
  clock = 0; frames.clear(); timers.clear(); mediaListeners.clear(); reduced = reduce; hidden = false; randomCalls = 0;
  localStorage.clear();
  (window as any).conquestTestGame = undefined;
  Math.random = () => {
    randomCalls += 1;
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let sceneProps: { sport: 'nfl' | 'nba'; plays: ActionPlay[]; active: boolean; attacker: string; defender: string };
function renderScene() { flushSync(() => root.render(<ConquestActionScene {...sceneProps} />)); }
function scene(sport: 'nfl' | 'nba', play: ActionPlay, reduce = false, active = true) {
  reset(42, reduce);
  sceneProps = { sport, plays: [play], active, attacker: 'Attack', defender: 'Defense' };
  renderScene();
}
function updateScene(play: ActionPlay, active = true) {
  sceneProps = { ...sceneProps, plays: [...sceneProps.plays, play], active };
  renderScene();
}
function mount(sport: 'nfl' | 'nba', seed = 0, reduce = false) {
  reset(seed, reduce);
  flushSync(() => root.render(<MemoryRouter>{sport === 'nfl' ? <ConquestBoard /> : <ConquestBoardNba />}</MemoryRouter>));
}
function game() { return (window as any).conquestTestGame; }
function state() {
  const panel = document.querySelector('[data-conquest-action-scene]');
  const live = game();
  return {
    time: clock, randomCalls, scheduledFrames: frames.size, records: { ...localStorage },
    action: panel?.getAttribute('data-conquest-action'), progress: Number(panel?.getAttribute('data-conquest-progress')),
    points: Number(panel?.getAttribute('data-conquest-points')), playNumber: Number(panel?.getAttribute('data-conquest-play')),
    pose: [...document.querySelectorAll('[data-conquest-actor], [data-conquest-ball]')].map(el => el.outerHTML).join(''),
    ball: document.querySelector('[data-conquest-ball]')?.getAttribute('transform'),
    text: panel?.textContent,
    game: live ? { phase: live.phase, territories: live.territories, rosters: live.rosters, eliminated: live.eliminated, turn: live.turn, gameLog: live.gameLog,
      battleResult: live.battleResult, visiblePlays: live.visiblePlays, playByPlayActive: live.playByPlayActive,
      simulatingRemainder: live.simulatingRemainder, boxScore: live.boxScore, canSkipBattle: live.canSkipBattle } : null,
  };
}
function apply() { flushSync(() => game().skipSteal()); }
(window as any).conquestRig = { mount, scene, updateScene, advance, preferences, state, apply };

/* Release AM reviewer (us-careers), never committed. The question the round's own test leaves open: play two real
   seasons and retire through the real board, once with every write accepted and once with writes refused and then
   recovered through Retry save, on the same random stream. The save, the completion record and the draw count must
   be identical, and a reload of the recovered save must record nothing and write nothing. */
import type { ComponentType } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { newSummerSalt, summerOn } from '@/lib/usCareerSummer';
import type { UsCareerSport } from '@/lib/usCareerSport';

const spies = vi.hoisted(() => ({ error: vi.fn(), completion: vi.fn(), activity: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: spies.completion, recordActivity: spies.activity, getCurrentPlayerName: () => 'Reviewer' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: spies.error } }));

interface Row { label: string; Board: ComponentType; sport: UsCareerSport }
const SPORTS: Row[] = [
  { label: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT },
  { label: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT },
  { label: 'MLB', Board: MlbMyCareerBoard, sport: MLB_CAREER_SPORT },
  { label: 'NHL', Board: NhlMyCareerBoard, sport: NHL_CAREER_SPORT },
];
const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
type Attempt = { method: string; value: string | null; refused: boolean };
let attempts: Attempt[] = [], refusing = false, refusedKey = '', rngState = 1, rngDraws = 0;
const stepRng = (state: number) => (Math.imul(1664525, state) + 1013904223) >>> 0;
function rngFrom(seed: number) { let state = seed; return () => { state = stepRng(state); return state / 4294967296; }; }

/* Six seasons from the engine itself, so the hub offers Hang them up now after the two the board plays. */
function fixture(row: Row): string {
  const { sport } = row, pos = sport.create.defaultPos;
  for (let seed = 4242; seed < 4542; seed += 1) {
    const random = rngFrom(seed);
    const c = sport.startCareer('Clean Recovered', pos, sport.create.archetypes[pos][0], random, defaultAppearance(), 'now');
    let tq = sport.rollTeamQuality(null, random);
    sport.assignRole(c, tq, random);
    if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(random);
    for (let y = 0; y < 6; y += 1) { sport.campBattle(c, tq, random); sport.simSeason(c, tq, random); sport.progress(c, random); tq = sport.rollTeamQuality(tq, random); }
    if (sport.shouldRetire(c) || (c.suspendedSeasons ?? 0) > 0) continue;
    c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; c.contractYears = 6;
    return JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null });
  }
  throw new Error(`${row.label}: no fixture career in 300 seeds`);
}
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
const click = (el: Element) => act(() => { fireEvent.click(el); });
const byText = (root: ParentNode, re: RegExp) => [...root.querySelectorAll('button')].find(b => re.test(b.textContent || '')) ?? null;

/* One click on whatever card is up. */
async function step(container: HTMLElement): Promise<string> {
  const q = (sel: string) => container.querySelector<HTMLElement>(sel);
  const reveal = q('[data-season-reveal]');
  if (reveal) { click(byText(reveal, /Continue/)!); return 'reveal'; }
  const rivalEvent = q('[data-rivalry-event]');
  if (rivalEvent) { click(byText(rivalEvent, /Continue/)!); return 'rivalry-event'; }
  const rivalChoice = q('[data-rivalry-choice]');
  if (rivalChoice) {
    if (q('[data-rivalry-outcome]')) { click(byText(rivalChoice, /Continue/)!); return 'rivalry-outcome'; }
    click(q('[data-rivalry-option]')!); return 'rivalry-option';
  }
  const receipt = q('[data-decision-continue]');
  if (receipt) { click(receipt); return 'decision-continue'; }
  const option = q('[data-career-decision-option]');
  if (option) { click(option); return 'decision-option'; }
  const oneMore = byText(container, /One more year/);
  if (oneMore) { click(oneMore); return 'talk-one-more'; }
  if (byText(container, /^\s*Play the \d+ season\s*$/)) return 'hub';
  if (/retires/.test(container.textContent || '')) return 'retired';
  await flush();
  return 'wait';
}
async function playSeason(container: HTMLElement): Promise<string[]> {
  click(byText(container, /^\s*Play the \d+ season\s*$/)!);
  const trail: string[] = [];
  for (let i = 0; i < 60; i += 1) {
    const did = await step(container);
    trail.push(did);
    if (did === 'hub' || did === 'retired') return trail;
  }
  throw new Error('stuck: ' + trail.join(',') + ' | ' + (container.textContent || '').slice(0, 300));
}
async function retire(container: HTMLElement) {
  click(byText(container, /Hang them up now/)!);
  click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retire this player' }));
  await flush();
}
const retrySave = (container: HTMLElement) => click(byText(container, /^Retry save$/)!);

vi.setConfig({ testTimeout: 120000 });
beforeAll(async () => {
  await import('@/components/career/FarewellCard');
  await import('@/components/career/HallOfFameCard');
}, 120000);
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(1790985600000);
  vi.spyOn(Math, 'random').mockImplementation(() => { rngState = stepRng(rngState); rngDraws += 1; return rngState / 4294967296; });
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    const refused = refusing && key === refusedKey;
    if (key === refusedKey) attempts.push({ method: 'setItem', value: String(value), refused });
    if (refused) throw new DOMException('Controlled quota refusal', 'QuotaExceededError');
    nativeSet.call(this, key, value);
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
    const refused = refusing && key === refusedKey;
    if (key === refusedKey) attempts.push({ method: 'removeItem', value: null, refused });
    if (refused) throw new DOMException('Controlled removal refusal', 'SecurityError');
    nativeRemove.call(this, key);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

type Plan = 'clean' | 'refuseAll' | 'refuseSeasonOneThenRetirement' | 'refuseSeasonOneNoRetry';
interface Outcome { bytes: string | null; diskBeforeRecovery: string | null; completions: unknown[][]; drawsAtRetirement: number; trails: string[][]; toastErrors: number; noticeAfter: boolean; accepted: number; refused: number }

/* Two seasons and a retirement through the real board, under one plan of refusals. */
async function career(row: Row, start: string, plan: Plan): Promise<Outcome> {
  cleanup(); localStorage.clear();
  spies.completion.mockClear(); spies.error.mockClear();
  nativeSet.call(localStorage, row.sport.saveKey, start);
  attempts = []; refusing = false; refusedKey = row.sport.saveKey; rngState = 20261008; rngDraws = 0;
  const view = render(<MemoryRouter><row.Board /></MemoryRouter>);
  const { container } = view;
  await flush();
  const trails: string[][] = [];
  if (plan !== 'clean') refusing = true;
  trails.push(await playSeason(container));
  if (plan === 'refuseSeasonOneThenRetirement') { refusing = false; retrySave(container); }
  if (plan === 'refuseSeasonOneNoRetry') refusing = false; // the next ordinary save must carry the season on its own
  trails.push(await playSeason(container));
  if (trails[1][trails[1].length - 1] !== 'hub') throw new Error(`${row.label} ${plan}: second season did not return to the hub: ${trails[1].join(',')}`);
  if (plan === 'refuseSeasonOneThenRetirement') refusing = true;
  const drawsAtRetirement = rngDraws; // read before the retirement screen mounts, so only engine and hub draws count
  await retire(container);
  const diskBeforeRecovery = localStorage.getItem(row.sport.saveKey);
  if (refusing) { refusing = false; retrySave(container); }
  await flush();
  const out: Outcome = {
    bytes: localStorage.getItem(row.sport.saveKey), diskBeforeRecovery, completions: JSON.parse(JSON.stringify(spies.completion.mock.calls)), drawsAtRetirement, trails,
    toastErrors: spies.error.mock.calls.length, noticeAfter: !!container.querySelector('[data-us-career-save-error]'),
    accepted: attempts.filter(a => !a.refused).length, refused: attempts.filter(a => a.refused).length,
  };
  /* a reload of the finished save: nothing recorded, nothing written, still retired */
  const before = attempts.length;
  view.unmount();
  const again = render(<MemoryRouter><row.Board /></MemoryRouter>);
  await flush(); await flush();
  expect(/retires/.test(again.container.textContent || ''), `${row.label} ${plan}: reload opens on the retirement screen`).toBe(true);
  expect(spies.completion.mock.calls.length, `${row.label} ${plan}: reload records no second completion`).toBe(out.completions.length);
  expect(attempts.length, `${row.label} ${plan}: reload writes nothing`).toBe(before);
  expect(localStorage.getItem(row.sport.saveKey), `${row.label} ${plan}: reload leaves the bytes alone`).toBe(out.bytes);
  again.unmount();
  return out;
}

describe.each(SPORTS)('$label: a recovered career against a clean one', row => {
  it('two seasons and a retirement end on the same bytes, one completion and the same draws', async () => {
    const start = fixture(row);
    /* warm-up: the first run of the file loads the lazy chunks; a cold run against a warm one says whether the
       NFL difference of the first attempt was the cold start or the refusal. */
    const cold = await career(row, start, 'clean');
    const clean = await career(row, start, 'clean');
    console.log('REVIEW_WARM|' + JSON.stringify({ sport: row.label, coldEqualsWarm: cold.bytes === clean.bytes, coldDraws: cold.drawsAtRetirement, warmDraws: clean.drawsAtRetirement, coldTrail0: cold.trails[0].length, warmTrail0: clean.trails[0].length }));
    const parsed = JSON.parse(clean.bytes!);
    expect(parsed.phase).toBe('retired');
    expect(parsed.c.retired).toBe(true);
    expect(parsed.c.seasons.length, `${row.label}: clean run holds the six fixture seasons plus two`).toBe(8);
    expect(clean.completions.length, `${row.label}: clean run records one completion`).toBe(1);
    expect(clean.refused).toBe(0);
    expect(clean.toastErrors).toBe(0);
    console.log('REVIEW_RECORD|' + JSON.stringify({ sport: row.label, plan: 'clean', len: clean.bytes!.length, completions: clean.completions, draws: clean.drawsAtRetirement, trails: clean.trails, accepted: clean.accepted }));
    for (const plan of ['refuseAll', 'refuseSeasonOneThenRetirement', 'refuseSeasonOneNoRetry'] as Plan[]) {
      const got = await career(row, start, plan);
      console.log('REVIEW_RECORD|' + JSON.stringify({ sport: row.label, plan, same: got.bytes === clean.bytes, len: got.bytes?.length, completions: got.completions, draws: got.drawsAtRetirement, trails: got.trails, accepted: got.accepted, refused: got.refused, toastErrors: got.toastErrors, diskWasStale: got.diskBeforeRecovery !== clean.bytes }));
      expect(got.trails, `${row.label} ${plan}: the same screens in the same order`).toEqual(clean.trails);
      expect(got.drawsAtRetirement, `${row.label} ${plan}: the same number of random draws`).toBe(clean.drawsAtRetirement);
      expect(got.bytes, `${row.label} ${plan}: the recovered save is byte for byte the clean one`).toBe(clean.bytes);
      expect(got.completions, `${row.label} ${plan}: one completion, the same one`).toEqual(clean.completions);
      expect(got.noticeAfter, `${row.label} ${plan}: no notice once recovered`).toBe(false);
      if (plan !== 'refuseSeasonOneNoRetry') expect(got.refused, `${row.label} ${plan}: writes really were refused`).toBeGreaterThan(0);
      if (plan === 'refuseAll') expect(got.diskBeforeRecovery, `${row.label} ${plan}: the disk still held the start save before Retry`).toBe(start);
    }
  });
});

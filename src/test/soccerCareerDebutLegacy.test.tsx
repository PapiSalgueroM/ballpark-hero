/**
 * Round 985: the international debut and the legacy card are staged.
 *
 * Two of Soccer Career's biggest moments used to land as plain text. Now the
 * debut card's flag and heading slam, its call-up line and its nation, age
 * and OVR row rise and its last line ticks in; the legacy card's tier emoji
 * and tier slam, the score and the name rise, the breakdown rows and the four
 * stat tiles tick in, with gold confetti for GOAT and LEGEND only; and the
 * rivalry card's verdict line rises.
 *
 * What this file holds, over engine-made careers with fixture numbers:
 *  1. each card marks its beats with the kit's classes, the delays strictly
 *     increase top to bottom, the tiles follow the rows, and no button and no
 *     ancestor of a button carries an animated class;
 *  2. every number in the markup is one the fixture carries, the score is its
 *     final value from the first render (no roll), and each tile prints its
 *     own field;
 *  3. the confetti rule: GOAT and LEGEND get it, GREAT does not, and a card
 *     drawn still never does;
 *  4. the moment plays once: a second mount is still, a moment the restored
 *     save already held is still (a reload or a new tab), and a different run
 *     reaching the same moment still gets its own;
 *  5. through the REAL page: a save left sitting on the debut card is loaded
 *     still, and the control (the same card with nothing settled) slams, so
 *     the page's settle is what does the stopping;
 *  6. the debut card no longer promises a morale boost the engine never
 *     applies on that path.
 *  7. (fix round) through the REAL page, the state flipping in this visit
 *     plays the moment: Continue off a season summary onto the debut, and
 *     Retire and Enjoy Life off the ceremony onto the legacy card; a re-render
 *     of the page keeps it playing, and a reload after it draws it still;
 *  8. a moment waits to be seen: until the card is in view its beats hold on
 *     their first frame, the confetti waits and nothing is settled;
 *  9. the confetti is the card's last child (as the first it takes the
 *     space-y gap and pushes the header down), every slam sits on a content
 *     wide child inside a row that clips across, and a restart with the same
 *     name, nation, position, academy and start year still gets its own debut.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  const supabase = {
    from: () => chain(),
    rpc: () => chain(),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, LegacyTier } from '@/lib/soccerCareerEngine';
import SoccerCareer, { InternationalDebutCard, LegacyCard, RivalrySummaryCard } from '@/pages/SoccerCareer';
import { resetCareerMomentsForTest, settleLoadedMoments } from '@/components/soccer-career/careerMoments';
import { CelebrationStyles } from '@/components/club-manager/Celebration';

const SAVE_KEY = 'soccerCareerSave';
const ANIMATED = ['cm-slam', 'cm-rise', 'cm-tick-in', 'cm-rise-gated'];

/* An engine-made career, then the fields a card reads set to fixture values
   with digits no other field prints, so a stray number cannot hide. */
function baseCareer(name: string): CareerState {
  const o = 71;
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  return E.initCareer(name, 'Brazil', 'ST', '2020s', st, o, 2020, E.FALLBACK_CLUBS, null);
}

function debutCareer(name = 'Test Debut'): CareerState {
  const c = baseCareer(name);
  return { ...c, phase: 'international_debut', age: 19, overall: 74, intStats: { ...c.intStats, debutYear: 2021, debutAge: 19 } };
}

const BREAKDOWN = [
  { label: 'Goals', points: 23 },
  { label: 'Trophies', points: 31 },
  { label: 'Awards', points: 0 },
  { label: 'International', points: 9 },
  { label: 'Longevity', points: 5 },
];
const SCORE = 68;

function retiredCareer(tier: LegacyTier, name = 'Test Legacy'): CareerState {
  const c = baseCareer(name);
  return {
    ...c,
    phase: 'retired',
    retired: true,
    isPundit: false,
    managerState: null,
    ownerState: null,
    legacy: { tier, score: SCORE, breakdown: BREAKDOWN },
    intStats: { ...c.intStats, caps: 97 },
    rival: { name: 'Test Rival' } as E.RivalPlayer,
    rivalrySummary: {
      playerWins: 6, rivalWins: 2, overallWinner: 'player', legacyBonus: 4,
      categories: [{ label: 'Career Goals', playerVal: '412', rivalVal: '388', winner: 'player' }],
    },
  };
}

/* The totals the legacy card is handed, every field its own number. */
function fixtureTotals(c: CareerState): ReturnType<typeof E.getCareerTotals> {
  return {
    ...E.getCareerTotals(c.seasons),
    goals: 412, ballonDors: 3, leagueTitles: 5, domesticCups: 4, championsLeagues: 2, worldCups: 1, continentalCups: 1,
  };
}
const TROPHIES = 5 + 4 + 2 + 1 + 1;

const wrap = (el: JSX.Element) => <HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>;
const beats = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-beat]'));
const delayOf = (el: HTMLElement) => parseFloat(el.style.animationDelay);
const animatedIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('*')).filter(el => ANIMATED.some(c => el.classList.contains(c)));
/* Text node by text node: the card's textContent runs "+5" into "412Goals". */
function numbersIn(root: HTMLElement): string[] {
  const out: string[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) out.push(...((n.textContent ?? '').match(/\d+/g) ?? []));
  return out;
}

function expectIncreasing(els: HTMLElement[]) {
  const d = els.map(delayOf);
  expect(d.every(Number.isFinite)).toBe(true);
  for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1]);
}

/* No button is animated, and none sits inside an animated wrapper either:
   a button that is invisible through its delay can still be pressed. */
function expectButtonsStill(root: HTMLElement) {
  for (const b of Array.from(root.querySelectorAll('button'))) {
    let el: HTMLElement | null = b;
    while (el && el !== root) {
      expect(ANIMATED.some(c => el!.classList.contains(c))).toBe(false);
      el = el.parentElement;
    }
  }
}

/* An IntersectionObserver the test drives: nothing is in view until show()
   says so. jsdom has none, and without one the cards start at once. */
type Watch = { cb: IntersectionObserverCallback; els: Element[] };
let watches: Watch[] = [];
class DrivenObserver {
  private w: Watch;
  constructor(cb: IntersectionObserverCallback) { this.w = { cb, els: [] }; watches.push(this.w); }
  observe(el: Element) { this.w.els.push(el); }
  unobserve() { /* not used */ }
  disconnect() { this.w.els = []; }
  takeRecords() { return []; }
}
function show() {
  act(() => {
    for (const w of watches) {
      if (!w.els.length) continue;
      w.cb(w.els.map(target => ({ isIntersecting: true, target }) as unknown as IntersectionObserverEntry), {} as IntersectionObserver);
    }
  });
}

beforeEach(() => {
  resetCareerMomentsForTest();
  localStorage.clear();
  watches = [];
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });


describe('Round 985: the international debut is a moment', () => {
  it('slams the flag and heading, raises the row, ticks the last line in, on increasing delays', () => {
    const c = debutCareer();
    const { container } = render(wrap(<InternationalDebutCard career={c} onDismiss={() => undefined} />));
    const b = beats(container);
    expect(b.map(e => e.dataset.beat)).toEqual(['flag', 'heading', 'callup', 'row', 'journey']);
    expect(b[0].classList.contains('cm-slam')).toBe(true);
    expect(b[1].classList.contains('cm-slam')).toBe(true);
    expect(b[1].textContent).toBe('INTERNATIONAL DEBUT');
    expect(b[2].classList.contains('cm-rise')).toBe(true);
    expect(b[3].classList.contains('cm-rise')).toBe(true);
    expect(b[4].classList.contains('cm-tick-in')).toBe(true);
    expectIncreasing(b);
    expectButtonsStill(container);
  });

  it('prints only the save\'s own numbers, final from the first frame, and no morale promise', () => {
    const c = debutCareer();
    const { container } = render(wrap(<InternationalDebutCard career={c} onDismiss={() => undefined} />));
    const row = beats(container).find(e => e.dataset.beat === 'row')!;
    expect(row.textContent).toContain('Brazil');
    expect(row.textContent).toContain(`Age ${c.age}`);
    expect(row.textContent).toContain(`OVR ${c.overall}`);
    const allowed = new Set([String(c.age), String(c.overall)]);
    const printed = numbersIn(container);
    expect(printed.length).toBeGreaterThan(0);
    expect(printed.filter(n => !allowed.has(n))).toEqual([]);
    expect(container.textContent?.toLowerCase()).not.toContain('morale');
  });

  it('plays once: a second mount is still', () => {
    const c = debutCareer();
    const first = render(wrap(<InternationalDebutCard career={c} onDismiss={() => undefined} />));
    expect(animatedIn(first.container).length).toBe(5);
    first.unmount();
    const second = render(wrap(<InternationalDebutCard career={c} onDismiss={() => undefined} />));
    expect(animatedIn(second.container).length).toBe(0);
    expect(beats(second.container).every(e => e.style.animationDelay === '')).toBe(true);
    expect(second.container.textContent).toContain('INTERNATIONAL DEBUT');
  });

  it('a save restored already on the card is still, and another run still gets its own', () => {
    const c = debutCareer();
    settleLoadedMoments(c);
    const loaded = render(wrap(<InternationalDebutCard career={c} onDismiss={() => undefined} />));
    expect(animatedIn(loaded.container).length).toBe(0);
    loaded.unmount();
    const other = debutCareer('Other Debut');
    const next = render(wrap(<InternationalDebutCard career={other} onDismiss={() => undefined} />));
    expect(animatedIn(next.container).length).toBe(5);
  });

  it('a restart with the same name, nation, position, academy and start year still gets its own debut', () => {
    /* The era fixes the start year and the academy is drawn from a small home
       pool, so two runs in one visit can share all of that. What they cannot
       share is the football they played on the way to the call-up. */
    const base = debutCareer('Same Name');
    const played = (goals: number): CareerState => ({
      ...base,
      seasons: [...base.seasons, { ...base.seasons[0], year: base.seasons[0].year + 1, age: base.seasons[0].age + 1, apps: 30, goals }],
    });
    const first = played(12);
    const again = played(5);
    expect([first.playerName, first.nationality, first.position, first.seasons[0].year, first.seasons[0].club])
      .toEqual([again.playerName, again.nationality, again.position, again.seasons[0].year, again.seasons[0].club]);
    const a = render(wrap(<InternationalDebutCard career={first} onDismiss={() => undefined} />));
    expect(animatedIn(a.container).length).toBe(5);
    a.unmount();
    const b = render(wrap(<InternationalDebutCard career={again} onDismiss={() => undefined} />));
    expect(animatedIn(b.container).length).toBe(5);
    b.unmount();
    /* And the same run is still the same run: its second mount is still. */
    const c = render(wrap(<InternationalDebutCard career={first} onDismiss={() => undefined} />));
    expect(animatedIn(c.container).length).toBe(0);
  });
});

describe('Round 985: the legacy card is a moment', () => {
  const draw = (c: CareerState) =>
    render(wrap(<LegacyCard career={c} totals={fixtureTotals(c)} onShare={() => undefined} />));

  it('slams the tier, raises the score and name, ticks the rows then the tiles in, on increasing delays', () => {
    const { container } = draw(retiredCareer('GREAT'));
    const b = beats(container);
    const rows = BREAKDOWN.filter(r => r.points > 0);
    expect(b.map(e => e.dataset.beat)).toEqual([
      'tier-emoji', 'tier', 'score', 'name', ...rows.map(() => 'row'), 'tile', 'tile', 'tile', 'tile',
    ]);
    expect(b[0].classList.contains('cm-slam')).toBe(true);
    expect(b[1].classList.contains('cm-slam')).toBe(true);
    expect(b[1].textContent).toBe('GREAT');
    expect(b[2].classList.contains('cm-rise')).toBe(true);
    expect(b[3].classList.contains('cm-rise')).toBe(true);
    for (const e of b.slice(4)) expect(e.classList.contains('cm-tick-in')).toBe(true);
    expectIncreasing(b);
    expectButtonsStill(container);
  });

  it('prints its final score from the first render, each row and tile its own number, nothing else', () => {
    const c = retiredCareer('GREAT');
    const { container } = draw(c);
    const b = beats(container);
    expect(b.find(e => e.dataset.beat === 'score')!.textContent).toBe(`${SCORE}/100`);
    const rows = b.filter(e => e.dataset.beat === 'row');
    expect(rows.map(e => e.textContent)).toEqual(BREAKDOWN.filter(r => r.points > 0).map(r => `${r.label}+${r.points}`));
    const tiles = b.filter(e => e.dataset.beat === 'tile');
    expect(tiles.map(e => e.textContent)).toEqual(['412Goals', `${TROPHIES}Trophies`, "3Ballon d'Or", '97Caps']);
    const allowed = new Set([SCORE, 100, ...BREAKDOWN.map(r => r.points), 412, TROPHIES, 3, 97].map(String));
    expect(numbersIn(container).filter(n => !allowed.has(n))).toEqual([]);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('gold confetti for GOAT and LEGEND only, and never on a card drawn still', () => {
    for (const tier of ['GOAT', 'LEGEND', 'GREAT', 'SOLID PRO', 'JOURNEYMAN'] as LegacyTier[]) {
      resetCareerMomentsForTest();
      const c = retiredCareer(tier, `Test ${tier}`);
      const first = draw(c);
      const pieces = first.container.querySelectorAll('.animate-confetti-fall').length;
      expect(pieces).toBe(tier === 'GOAT' || tier === 'LEGEND' ? 60 : 0);
      first.unmount();
      const again = draw(c);
      expect(again.container.querySelectorAll('.animate-confetti-fall').length).toBe(0);
      expect(animatedIn(again.container).length).toBe(0);
      again.unmount();
    }
  });

  it('a save restored already retired is still, confetti included', () => {
    const c = retiredCareer('GOAT');
    settleLoadedMoments(c);
    const { container } = draw(c);
    expect(animatedIn(container).length).toBe(0);
    expect(container.querySelectorAll('.animate-confetti-fall').length).toBe(0);
    expect(container.textContent).toContain(`${SCORE}/100`);
  });
});

describe('Round 985: the rivalry verdict rises', () => {
  it('rises the verdict on the first mount only, and not on a restored save', () => {
    const c = retiredCareer('GREAT');
    const first = render(wrap(<RivalrySummaryCard summary={c.rivalrySummary!} career={c} />));
    const verdict = beats(first.container);
    expect(verdict.map(e => e.dataset.beat)).toEqual(['verdict']);
    expect(verdict[0].textContent).toBe('RIVALRY WON!');
    expect(verdict[0].classList.contains('cm-rise')).toBe(true);
    expect(Number.isFinite(delayOf(verdict[0]))).toBe(true);
    first.unmount();
    const second = render(wrap(<RivalrySummaryCard summary={c.rivalrySummary!} career={c} />));
    expect(animatedIn(second.container).length).toBe(0);
    second.unmount();
    resetCareerMomentsForTest();
    settleLoadedMoments(c);
    const loaded = render(wrap(<RivalrySummaryCard summary={c.rivalrySummary!} career={c} />));
    expect(animatedIn(loaded.container).length).toBe(0);
  });
});

describe('Round 985: a moment waits until its card is seen', () => {
  const held = (root: HTMLElement) => beats(root).filter(e => e.style.animationPlayState === 'paused').length;

  it('the legacy card holds its beats and its confetti below the fold, settles nothing, and plays once in view', () => {
    vi.stubGlobal('IntersectionObserver', DrivenObserver);
    const c = retiredCareer('GOAT');
    const draw = () => render(wrap(<LegacyCard career={c} totals={fixtureTotals(c)} onShare={() => undefined} />));
    const below = draw();
    const n = beats(below.container).length;
    expect(n).toBeGreaterThan(10);
    expect(animatedIn(below.container).length).toBe(n);
    expect(held(below.container)).toBe(n);
    expect(below.container.querySelectorAll('.animate-confetti-fall').length).toBe(0);
    below.unmount();

    /* Never seen, so never settled: the card mounted again still has its moment. */
    const seen = draw();
    expect(animatedIn(seen.container).length).toBe(n);
    expect(held(seen.container)).toBe(n);
    show();
    expect(held(seen.container)).toBe(0);
    expect(animatedIn(seen.container).length).toBe(n);
    expectIncreasing(beats(seen.container));
    expect(seen.container.querySelectorAll('.animate-confetti-fall').length).toBe(60);
    seen.unmount();

    /* Seen, so settled: the next mount is still. */
    const after = draw();
    expect(animatedIn(after.container).length).toBe(0);
    expect(after.container.querySelectorAll('.animate-confetti-fall').length).toBe(0);
  });

  it('the rivalry verdict waits the same way', () => {
    vi.stubGlobal('IntersectionObserver', DrivenObserver);
    const c = retiredCareer('GREAT');
    const draw = () => render(wrap(<RivalrySummaryCard summary={c.rivalrySummary!} career={c} />));
    const below = draw();
    expect(held(below.container)).toBe(1);
    below.unmount();
    const seen = draw();
    expect(held(seen.container)).toBe(1);
    show();
    expect(held(seen.container)).toBe(0);
    expect(animatedIn(seen.container).length).toBe(1);
    seen.unmount();
    expect(animatedIn(draw().container).length).toBe(0);
  });
});

describe('Round 985: through the real page, a reload never replays the moment', () => {
  const tick = (ms = 5) => act(async () => { await new Promise(r => setTimeout(r, ms)); });

  it('a save left sitting on the debut card loads still, and the control slams', async () => {
    const c = debutCareer('Page Debut');
    localStorage.setItem(SAVE_KEY, JSON.stringify(c));
    const page = render(wrap(<SoccerCareer />));
    for (let i = 0; i < 6; i++) await tick();
    const heading = Array.from(page.container.querySelectorAll('h3')).find(h => h.textContent === 'INTERNATIONAL DEBUT');
    expect(heading).toBeTruthy();
    const card = heading!.parentElement!;
    expect(animatedIn(card).length).toBe(0);
    page.unmount();

    /* The control: nothing settled (a moment that flipped in this visit). The
       same career's card slams, so the page's settle did the stopping above. */
    resetCareerMomentsForTest();
    const fresh = render(wrap(<InternationalDebutCard career={c} onDismiss={() => undefined} />));
    expect(animatedIn(fresh.container).length).toBe(5);
  });
});

/* The other half of the rule: when the state flips in this visit, the page
   plays the moment, keeps playing it through a re-render, and a reload after
   it is still. Each starts from a save one button short of the moment. */
describe('Round 985: through the real page, the moment plays when the state flips', () => {
  const tick = (ms = 5) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
  const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };
  const press = async (root: HTMLElement, text: string) => {
    const b = Array.from(root.querySelectorAll('button')).find(x => (x.textContent ?? '').includes(text));
    expect(b, `a "${text}" button`).toBeTruthy();
    await act(async () => { fireEvent.click(b!); });
    await settle();
  };
  const beat = (root: HTMLElement, name: string) => root.querySelector<HTMLElement>(`[data-beat="${name}"]`);

  async function flipAndCheck(save: CareerState, button: string, name: string, cls: string) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    const page = render(wrap(<SoccerCareer />));
    await settle();
    expect(beat(page.container, name)).toBeNull();
    await press(page.container, button);
    expect(beat(page.container, name), `the ${name} beat after "${button}"`).toBeTruthy();
    expect(beat(page.container, name)!.classList.contains(cls)).toBe(true);
    /* A re-render of the page must not cut the moment short. */
    page.rerender(wrap(<SoccerCareer />));
    await settle();
    expect(beat(page.container, name)!.classList.contains(cls)).toBe(true);
    page.unmount();
    /* A reload after the flip finds the moment in the save: still. */
    const again = render(wrap(<SoccerCareer />));
    await settle();
    const still = beat(again.container, name);
    expect(still, `the ${name} beat after a reload`).toBeTruthy();
    expect(animatedIn(still!.closest<HTMLElement>('.rounded-xl')!).length).toBe(0);
    again.unmount();
  }

  it('Continue off the season summary onto the call-up plays the debut card', async () => {
    const c = baseCareer('Flip Debut');
    const last = c.seasons[c.seasons.length - 1];
    const save: CareerState = {
      ...c, phase: 'season_summary', pendingSummary: last, pendingBallonDor: null,
      intStats: { ...c.intStats, debutYear: last.year, debutAge: c.age },
    };
    await flipAndCheck(save, 'Continue', 'heading', 'cm-slam');
  });

  it('Retire and Enjoy Life off the ceremony plays the legacy card, even from a save reloaded on the ceremony', async () => {
    const atCeremony = E.manualRetire({ ...baseCareer('Flip Legacy'), phase: 'playing' } as CareerState);
    expect(atCeremony.phase).toBe('retirement_ceremony');
    expect(atCeremony.legacy).toBeTruthy();
    await flipAndCheck(atCeremony, 'Retire and Enjoy Life', 'tier-emoji', 'cm-slam');
  });
});

/* The page must not jump. jsdom lays nothing out, so this holds the cause
   instead of the box: every class the cards use animates only opacity and
   transform (neither moves a neighbour), its resting rule sets nothing that
   takes space, and the confetti is an absolute layer inside a relative card. */
describe('Round 985: nothing the moments use can move the page', () => {
  function block(css: string, head: string): string {
    const at = css.indexOf(head);
    expect(at).toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
    }
    throw new Error(`unclosed ${head}`);
  }
  const props = (body: string) => new Set((body.match(/[a-z-]+(?=\s*:)/g) ?? []));

  it('cm-slam, cm-rise and cm-tick-in move only opacity and transform', () => {
    const { container } = render(<CelebrationStyles />);
    const css = container.querySelector('style')!.textContent ?? '';
    for (const [cls, frames] of [['cm-slam', 'cmSlam'], ['cm-rise', 'cmRise'], ['cm-tick-in', 'cmTickIn']]) {
      const kf = props(block(css, `@keyframes ${frames} `));
      expect(kf.size).toBeGreaterThan(0);
      for (const p of kf) expect(['opacity', 'transform']).toContain(p);
      const rest = props(block(css, `.${cls} {`));
      for (const p of rest) expect(['opacity', 'animation']).toContain(p);
    }
  });

  it('the confetti is an absolute layer inside the legacy card, which is relative', () => {
    const c = retiredCareer('LEGEND');
    const { container } = render(wrap(<LegacyCard career={c} totals={fixtureTotals(c)} onShare={() => undefined} />));
    const card = container.firstElementChild as HTMLElement;
    expect(card.classList.contains('relative')).toBe(true);
    const layer = container.querySelector('.animate-confetti-fall')!.parentElement!;
    expect(layer.classList.contains('absolute')).toBe(true);
    expect(layer.classList.contains('pointer-events-none')).toBe(true);
    expect(layer.parentElement).toBe(card);
    /* The card is space-y: a layer ahead of the header would hand the header
       the gap and push it down the moment the confetti appears. Last, the gap
       lands on the absolute layer, which takes no space. */
    expect(card.lastElementChild).toBe(layer);
  });

  it('every slam is a content wide child inside a row that clips across', () => {
    /* cm-slam starts at 1.6 times the size. On a full width block that reaches
       past a phone's edge and widens the page for a moment. */
    const d = debutCareer();
    const l = retiredCareer('LEGEND');
    for (const el of [
      <InternationalDebutCard key="d" career={d} onDismiss={() => undefined} />,
      <LegacyCard key="l" career={l} totals={fixtureTotals(l)} onShare={() => undefined} />,
    ]) {
      const { container, unmount } = render(wrap(el));
      const slams = Array.from(container.querySelectorAll<HTMLElement>('.cm-slam'));
      expect(slams.length).toBe(2);
      for (const s of slams) {
        expect(s.classList.contains('inline-block') || s.classList.contains('inline-flex')).toBe(true);
        expect(s.parentElement!.classList.contains('overflow-x-clip')).toBe(true);
      }
      unmount();
    }
  });
});

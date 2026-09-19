/**
 * Round 644: a finished game records the number its result screen shows.
 *
 * The points audit of 2026-09-19 found screens showing one number while the
 * recorder wrote another. Soccer Career showed a legacy score out of 100 and
 * recorded a trophy formula out of 1000 that a 99 starting overall could run to
 * the cap. Footle's score panel was handed 1000 down 125 a guess, on rows from
 * 0 to 1000, while the record held 700 down 100. Fantasy Draft showed season
 * points and recorded a share of 114 nobody saw, and its share claimed a win on
 * every result. Quiz Board showed and shared a negative bank while recording 0.
 * Player Bingo showed points and recorded nothing, and Rarity mode recorded a
 * perfect run as 0.
 *
 * Every page here is the REAL page with the REAL recording path
 * (useGameCompletion or ResultScreen's recordCompletionOnMount). Only the
 * recorder itself, the network, and the parts that need a network or a human
 * (player search boxes, the draft pool list, the share buttons, the score
 * distribution panel) are stubbed, and each stub renders exactly the props the
 * page hands it, so what it shows is what the page passed.
 *
 * scripts/simScoreShown.mjs runs this file and carries the negative controls:
 * each points one SCORE_SHOWN_*_PAGE variable at a copy of that page (or, for
 * the Quiz Board, of its board component) with the old line put back.
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const H = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  functions: {} as Record<string, unknown>,
  clipboard: '' as string,
}));

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
  const chain = (table: string): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: H.tables[table] ?? [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain(table);
    },
    apply() { return chain(table); },
  });
  const supabase = {
    from: (table: string) => chain(table),
    rpc: () => chain('rpc'),
    functions: { invoke: (name: string) => Promise.resolve({ data: H.functions[name] ?? null, error: null }) },
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

/* The share row, the score panel and the search boxes, each drawn as the
   props the page passed and nothing else. */
vi.mock('@/components/game/ShareButtons', () => ({
  default: ({ score, gameName, customText }: { score: string; gameName: string; customText?: string }) => (
    <div data-testid="share" data-game={gameName} data-score={score} data-custom={customText ?? ''} />
  ),
}));
vi.mock('@/components/game/PostGameStats', () => ({
  default: ({ gameSlug, userScore, buckets }: { gameSlug: string; userScore: number; buckets?: unknown }) => (
    <div data-testid="post-game-stats" data-slug={gameSlug} data-user-score={String(userScore)} data-buckets={buckets ? JSON.stringify(buckets) : ''} />
  ),
}));
vi.mock('@/components/game/PlayerSearch', () => ({
  PlayerSearch: ({ players, onSelect }: { players: { name: string }[]; onSelect: (p: unknown) => void }) => (
    <input
      data-testid="footle-guess"
      onChange={e => { const p = players.find(x => x.name === e.target.value); if (p) onSelect(p); }}
    />
  ),
}));
vi.mock('@/components/game/PlayerAutocomplete', () => {
  const Stub = ({ value, onChange, onSelect }: { value?: string; onChange?: (v: string) => void; onSelect: (e: unknown) => void }) => (
    <input
      data-testid="autocomplete"
      value={value ?? ''}
      onChange={e => {
        const v = e.target.value;
        onChange?.(v);
        onSelect({ key: v.toLowerCase(), name: v, rawName: v, meta: {} });
      }}
    />
  );
  return { default: Stub, PlayerAutocomplete: Stub, PlayerAutocompleteSearchIcon: () => null };
});
vi.mock('@/components/fantasy-draft/PlayerPool', () => ({
  PlayerPool: ({ players, draftedIds, onSelect, disabled }: {
    players: { id: string; name: string }[]; draftedIds: Set<string>; onSelect: (p: unknown) => void; disabled: boolean;
  }) => (
    <div>
      {players.filter(p => !draftedIds.has(p.id)).map(p => (
        <button key={p.id} data-testid="fd-pick" disabled={disabled} onClick={() => onSelect(p)}>{p.name}</button>
      ))}
    </div>
  ),
}));
vi.mock('@/lib/fetchFootlePlayerPool', () => ({ fetchFootlePlayerPool: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchQuizBoard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchQuizBoardClues: () => Promise.resolve([200, 400, 600, 800, 1000].map(v => ({
    clueId: `c${v}`, category: 'Test Cat', clue: `Clue worth ${v}`, answer: `Answer ${v}`, eventYear: 2000, value: v,
  }))),
}));
/* Player Bingo: 24 tiles that every revealed player fits, so the board is
   won by tapping, and the scoring, the result screen and the recording are
   the page's own. */
vi.mock('@/lib/playerBingo', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/playerBingo')>();
  const tiles = Array.from({ length: 24 }, (_, i) => ({
    id: `t${i}`, kind: 'nation', label: `Tile ${i}`, icon: 'T', test: () => true, support: [],
  }));
  const deck = Array.from({ length: 40 }, (_, i) => ({
    name: `Bingo Player ${i}`, nationality: 'Nowhere', position: 'Centre-Forward', club: 'Nobody FC', value: 1, age: 25, year: 2025,
  }));
  return {
    ...real,
    fetchBingoData: () => Promise.resolve({
      pool: deck, clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(),
      worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
    }),
    buildCriteria: () => tiles,
    generateBoard: () => tiles,
    buildDeck: () => deck,
  };
});
/* Rarity Round: five categories with a ten player pool each, ranked 1 (most
   famous) to 10 (rarest). */
vi.mock('@/lib/rarityRound', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/rarityRound')>();
  const { normalizeName } = await import('@/lib/playerSearch');
  const cats = Array.from({ length: 5 }, (_, c) => ({
    id: `cat${c}`,
    prompt: `Category ${c}`,
    hint: 'test',
    fetchPool: () => Promise.resolve(Array.from({ length: 10 }, (_, r) => {
      const name = `Pool ${c} Rank ${r + 1}`;
      return { key: normalizeName(name), name, prominence: 100 - r, rank: r + 1 };
    })),
    sourceConfig: {},
  }));
  return { ...real, pickDailyCategories: () => cats, pickRandomCategories: () => cats };
});

import { recordCompletion } from '@/lib/completions';
import { getTodayET, getDailyTier, dailyIndex } from '@/lib/dateUtils';
import { players as footlePlayers } from '@/data/players';
import { nflCareerPlayers } from '@/data/nflCareerPlayers';
import { footleScore } from '@/hooks/useGame';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';

/* The negative controls swap in a copy of one page. Off in every ordinary run. */
const pick = async (envPath: string | undefined, load: () => Promise<Record<string, any>>) => // eslint-disable-line @typescript-eslint/no-explicit-any
  envPath ? import(/* @vite-ignore */ envPath) : load();
const { default: SoccerCareer } = await pick(process.env.SCORE_SHOWN_SOCCER_PAGE, () => import('@/pages/SoccerCareer'));
const { default: Footle } = await pick(process.env.SCORE_SHOWN_FOOTLE_PAGE, () => import('@/pages/Footle'));
const { default: PlayerBingo } = await pick(process.env.SCORE_SHOWN_BINGO_PAGE, () => import('@/pages/PlayerBingo'));
const { default: RarityRound } = await pick(process.env.SCORE_SHOWN_RARITY_PAGE, () => import('@/pages/RarityRound'));
const { default: FantasyDraft } = await pick(process.env.SCORE_SHOWN_FANTASY_PAGE, () => import('@/pages/FantasyDraft'));
const { QuizBoard } = await pick(process.env.SCORE_SHOWN_QUIZ_BOARD, () => import('@/components/quiz-board/QuizBoard'));
const { default: NFLCareer } = await pick(process.env.SCORE_SHOWN_NFL_PAGE, () => import('@/pages/NFLCareer'));

/* eslint-disable @typescript-eslint/no-explicit-any */
const recorded = (path: string) =>
  vi.mocked(recordCompletion).mock.calls.filter(c => c[0] === path).map(c => c[1] as number | undefined);
const tick = (ms = 30) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const mount = (el: JSX.Element) => render(<HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>);
const buttonWith = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll('button')).find(b => (b.textContent ?? '').includes(text)) as HTMLButtonElement | undefined;
const buttonExactly = (root: HTMLElement, texts: string[]) =>
  Array.from(root.querySelectorAll('button')).find(b => texts.includes((b.textContent ?? '').trim())) as HTMLButtonElement | undefined;
const shareEl = (root: HTMLElement, game: string) =>
  root.querySelector(`[data-testid="share"][data-game="${game}"]`);
const share = (root: HTMLElement, game: string) => shareEl(root, game)?.getAttribute('data-score') ?? null;
const firstNumber = (s: string | null | undefined) => {
  const m = (s ?? '').match(/-?\d+/);
  return m ? Number(m[0]) : NaN;
};
const statValue = (root: HTMLElement, label: string) => {
  const el = Array.from(root.querySelectorAll('span')).find(s => (s.textContent ?? '').trim() === label);
  return el?.nextElementSibling?.textContent ?? null;
};
const headline = (root: HTMLElement) => root.querySelector('[role="status"] h2')?.textContent ?? null;
async function waitFor(check: () => boolean, what: string, ms = 8000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await tick(20);
  }
}

beforeEach(() => {
  localStorage.clear();
  H.tables = {};
  H.functions = {};
  H.clipboard = '';
  vi.mocked(recordCompletion).mockClear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  if (!('IntersectionObserver' in window)) {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  }
  if (!('ResizeObserver' in window)) {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  }
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (t: string) => { H.clipboard = t; return Promise.resolve(); } },
  });
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
/* Let any timer a page left behind (a toast, a shake, a line flash) fire while
   the environment still exists, so this file can never leave an error behind
   the way a timer firing after teardown does. */
afterAll(async () => { await new Promise(r => setTimeout(r, 2500)); });

/* The harness's strayerror control: an error thrown outside any test, the kind
   vitest reports as unhandled while every case still passes. Off in every
   ordinary run. */
if (process.env.SCORE_SHOWN_STRAY_ERROR === '1') {
  it('unhandled: the stray error control', () => {
    setTimeout(() => { throw new Error('the strayerror control, thrown outside any test'); }, 0);
  });
}

/* ---------------- Soccer Career ---------------- */

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One seeded career, played to the retirement ceremony. */
function playToCeremony(seed: number, start: number): CareerState {
  const realRandom = Math.random;
  Math.random = seeded(seed);
  try {
    const clubs = E.FALLBACK_CLUBS;
    const st = (o: number) => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    let s = E.initCareer('Test Striker', 'Brazil', 'ST', '2020s', st(start), start, 2020, clubs, null, Math.max(start, 80));
    for (let guard = 0; s.phase !== 'retirement_ceremony' && guard < 500; guard++) {
      switch (s.phase) {
        case 'youth': s = E.advanceYouthYear(s, clubs); break;
        case 'contract_offer': { const o = s.pendingOffers || []; s = o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; break; }
        case 'playing': s = E.advanceProSeason(s, clubs); break;
        case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
        case 'newspaper': s = E.dismissNewspaper(s); break;
        case 'season_summary': s = E.dismissSummary(s, clubs); break;
        case 'random_events': s = (s.pendingEvents && s.pendingEvents[0]) ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
        case 'moral_dilemma': s = E.dismissMoralDilemma(s, clubs); break;
        case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
        case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
        case 'international_debut': s = E.dismissDebut(s, clubs); break;
        case 'world_cup': s = s.pendingWorldCup?.result === 'Winner' ? E.applyWorldCupSpeech(s, 'for_the_country', clubs) : E.dismissWorldCup(s, clubs); break;
        case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
        case 'ballon_dor': s = s.pendingBallonDor?.playerRank === 1 ? E.applyBdorSpeech(s, 'tears', clubs) : E.dismissBallonDor(s, clubs); break;
        case 'transfer_window': {
          const sit: any = s.transferSituation;
          const offer = sit && (sit.offer ?? sit.offerA ?? (sit.offers || [])[0]);
          s = offer ? E.acceptOffer(s, offer) : E.stayAtClub(s);
          break;
        }
        case 'retirement_suggestion': s = E.acceptRetirementSuggestion(s); break;
        default: throw new Error(`the test driver has no move for phase ${s.phase}`);
      }
    }
    if (s.phase !== 'retirement_ceremony' || !s.legacy) throw new Error(`career never reached the ceremony (phase ${s.phase})`);
    return s;
  } finally {
    Math.random = realRandom;
  }
}

/** Mount the page on a saved ceremony, take one road out of it, and read back what it records and shows. */
async function finishThroughPage(career: CareerState, road: (root: HTMLElement) => Promise<void>) {
  vi.mocked(recordCompletion).mockClear();
  localStorage.setItem('soccerCareerSave', JSON.stringify(career));
  const v = mount(<SoccerCareer />);
  await tick(100);
  await road(v.container);
  await waitFor(() => recorded('/soccer-career').length > 0 && share(v.container, 'Soccer Career') !== null, 'the soccer-career record and legacy card');
  const shownText = share(v.container, 'Soccer Career');
  const shown = Number((shownText ?? '').match(/(\d+)\/100/)?.[1]);
  const rec = recorded('/soccer-career');
  v.unmount();
  return { rec, shown, shownText };
}
const click = async (root: HTMLElement, text: string) => {
  const b = buttonWith(root, text);
  if (!b) throw new Error(`no "${text}" button`);
  await act(async () => { fireEvent.click(b); });
  await tick(40);
};
/* What the TV studio tile said just before the last show, and what the legacy
   card then paid for it. */
const studio: { tile: string | null; label: string | null; paid: number } = { tile: null, label: null, paid: NaN };
const roads = {
  retire: async (root: HTMLElement) => { await click(root, 'Retire and Enjoy Life'); },
  manager: async (root: HTMLElement) => {
    await click(root, 'Become a Manager');
    await waitFor(() => !!buttonExactly(root, ['Retire', 'Walk Away']), 'the manager season');
    await act(async () => { fireEvent.click(buttonExactly(root, ['Retire', 'Walk Away'])!); });
  },
  pundit: async (root: HTMLElement) => {
    await click(root, 'Become a TV Pundit');
    for (let i = 0; i < 12; i++) await click(root, 'Make a Bold Prediction');
    const tile = root.querySelector('[data-testid="pundit-legacy-tile"]');
    studio.tile = tile?.firstElementChild?.textContent ?? null;
    studio.label = tile?.lastElementChild?.textContent ?? null;
    await click(root, 'Retire from Punditry');
    /* The line the legacy card pays for the studio, or 0 when it pays none. */
    const line = Array.from(root.querySelectorAll('span')).find(s => (s.textContent ?? '').trim() === 'Punditry');
    studio.paid = line ? firstNumber(line.nextElementSibling?.textContent) : 0;
  },
  owner: async (root: HTMLElement) => {
    await click(root, 'Buy a Football Club');
    for (let i = 0; i < 4; i++) await click(root, 'Next Owner Season');
    await click(root, 'Sell Club');
  },
};

describe('soccer-career', () => {
  it('soccer-career: records the legacy score the retirement screen shows, and a 99 start records less than the same record climbed from 55', async () => {
    const at99 = playToCeremony(644, 99);
    const at55: CareerState = { ...at99, startingOverall: 55 };
    at55.legacy = E.calculateLegacy(at55);

    const a = await finishThroughPage(at99, roads.retire);
    const b = await finishThroughPage(at55, roads.retire);
    const t = E.getCareerTotals(at99.seasons);
    console.log(`SHOWN soccer-career start 99: recorded ${JSON.stringify(a.rec)} shown "${a.shownText}" (peak ${at99.peakOverall}, ${t.ballonDors} Ballon d'Or, ${t.championsLeagues} UCL, ${t.worldCups} WC, ${t.leagueTitles} leagues)`);
    console.log(`SHOWN soccer-career same record from 55: recorded ${JSON.stringify(b.rec)} shown "${b.shownText}"`);

    expect(a.rec).toEqual([a.shown]);
    expect(b.rec).toEqual([b.shown]);
    expect(a.rec[0]).toBeLessThan(b.rec[0] as number);
  }, 60000);

  for (const road of ['manager', 'pundit', 'owner'] as const) {
    it(`soccer-career: ending ${road === 'owner' ? 'an' : 'a'} ${road} career records the legacy score the final screen shows`, async () => {
      const career = playToCeremony(645, 70);
      if (road === 'owner') career.netWorth = 500;
      const realRandom = Math.random;
      Math.random = seeded(700);
      let r: Awaited<ReturnType<typeof finishThroughPage>>;
      try { r = await finishThroughPage(career, roads[road]); } finally { Math.random = realRandom; }
      console.log(`SHOWN soccer-career after the ${road} road: recorded ${JSON.stringify(r.rec)} shown "${r.shownText}" (ceremony legacy ${career.legacy!.score})${road === 'pundit' ? `; studio tile "${studio.tile}" (${studio.label}), legacy card Punditry ${studio.paid}` : ''}`);
      expect(r.rec).toEqual([r.shown]);
      if (road === 'pundit') {
        /* The studio tile promises what the record pays: the same number. */
        expect(firstNumber(studio.tile)).toBe(studio.paid);
        expect(studio.paid).toBeLessThanOrEqual(E.POST_RETIREMENT_BONUS_CAP);
      }
    }, 60000);
  }

  it('soccer-career: a career retired in its first youth year gets nothing from the studio, and the tile says so', async () => {
    const st = (o: number) => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    const kid = E.manualRetire(E.initCareer('Test Kid', 'England', 'ST', '2020s', st(55), 55, 2020, E.FALLBACK_CLUBS, null, 80));
    const realRandom = Math.random;
    Math.random = seeded(646);
    try {
      const r = await finishThroughPage(kid, roads.pundit);
      console.log(`SHOWN soccer-career youth retirement then the studio: recorded ${JSON.stringify(r.rec)} shown "${r.shownText}"; studio tile "${studio.tile}" (${studio.label}), legacy card Punditry ${studio.paid}`);
      expect(r.rec).toEqual([r.shown]);
      expect(r.rec).toEqual([0]);
      expect(firstNumber(studio.tile)).toBe(0);
      expect(studio.paid).toBe(0);
      expect(studio.label).toContain('no senior career');
    } finally {
      Math.random = realRandom;
    }
  }, 60000);
});

/* ---------------- Footle ---------------- */

function footleTarget() {
  const today = getTodayET();
  const tier = getDailyTier(today);
  const pure = footlePlayers.filter(p => p.difficulty === tier);
  const pool = pure.length > 0 ? pure : footlePlayers;
  return pool[dailyIndex(today, pool.length)];
}

describe('footle', () => {
  for (const guessCount of [1, 3]) {
    it(`footle: a daily won in ${guessCount} records the score its stats panel places you with, on rows of the recorded scale`, async () => {
      const target = footleTarget();
      const wrong = footlePlayers.filter(p => p.name !== target.name).slice(0, guessCount - 1);
      const v = mount(<Footle />);
      await waitFor(() => !!v.container.querySelector('[data-testid="footle-guess"]'), 'the Footle search box');
      for (const p of [...wrong, target]) {
        const input = v.container.querySelector('[data-testid="footle-guess"]') as HTMLInputElement;
        await act(async () => { fireEvent.change(input, { target: { value: p.name } }); });
        await tick();
      }
      await waitFor(() => recorded('/footle').length > 0 && !!v.container.querySelector('[data-testid="post-game-stats"]'), 'the Footle record and stats panel');
      const panel = v.container.querySelector('[data-testid="post-game-stats"]')!;
      const shown = Number(panel.getAttribute('data-user-score'));
      const bucketsJson = panel.getAttribute('data-buckets');
      const buckets: { min: number; max: number; label: string }[] = bucketsJson ? JSON.parse(bucketsJson) : [];
      const top = Math.max(...buckets.map(b => b.max));
      const holding = buckets.filter(b => shown >= b.min && shown <= b.max).map(b => b.label);
      console.log(`SHOWN footle won in ${guessCount}: recorded ${JSON.stringify(recorded('/footle'))} stats panel ${shown}, rows ${buckets.map(b => b.label).join(' ') || 'the default 0 to 1000'}, landing in ${holding.join(',') || 'none'}`);
      expect(recorded('/footle')).toEqual([shown]);
      /* The rows run on the recorded scale: the top one ends at the best score
         the game can record, and the score lands in exactly one of them. */
      expect(buckets.length).toBeGreaterThan(0);
      expect(top).toBe(footleScore(true, 1));
      expect(holding.length).toBe(1);
    }, 30000);
  }
});

/* ---------------- Player Bingo ---------------- */

async function tapTile(root: HTMLElement, i: number) {
  const b = root.querySelector(`button[title="Tile ${i}"]`) as HTMLButtonElement | null;
  if (!b) throw new Error(`no Tile ${i}`);
  await act(async () => { fireEvent.click(b); });
}

describe('player-bingo', () => {
  it('player-bingo: a banked first line records the points the result screen shows', async () => {
    const v = mount(<PlayerBingo />);
    await waitFor(() => !!v.container.querySelector('button[title="Tile 10"]'), 'the bingo board');
    /* Row three runs through the free centre: tiles 10, 11, 12, 13. */
    for (const i of [10, 11, 12, 13]) await tapTile(v.container, i);
    const bank = buttonWith(v.container, 'Bank the win');
    if (!bank) throw new Error('no bank button after the first line');
    await act(async () => { fireEvent.click(bank); });
    await tick(60);
    const shownText = share(v.container, 'Player Bingo');
    const shown = Number((shownText ?? '').match(/(\d+) pts/)?.[1]);
    console.log(`SHOWN player-bingo first line: recorded ${JSON.stringify(recorded('/player-bingo'))} shown "${shownText}"`);
    expect(recorded('/player-bingo')).toEqual([shown]);
    expect(shown).toBeGreaterThan(0);
  }, 30000);

  it('player-bingo: a blackout records the full board, 1700', async () => {
    const v = mount(<PlayerBingo />);
    await waitFor(() => !!v.container.querySelector('button[title="Tile 10"]'), 'the bingo board');
    for (const i of [10, 11, 12, 13]) await tapTile(v.container, i);
    const keep = buttonWith(v.container, 'Keep playing this board');
    if (!keep) throw new Error('no keep playing button after the first line');
    await act(async () => { fireEvent.click(keep); });
    for (let i = 0; i < 24; i++) {
      if ([10, 11, 12, 13].includes(i)) continue;
      await tapTile(v.container, i);
    }
    await tick(60);
    const shownText = share(v.container, 'Player Bingo');
    const shown = Number((shownText ?? '').match(/(\d+) pts/)?.[1]);
    console.log(`SHOWN player-bingo blackout: recorded ${JSON.stringify(recorded('/player-bingo'))} shown "${shownText}"`);
    expect(recorded('/player-bingo')).toEqual([shown]);
    expect(shown).toBe(1700);
  }, 30000);
});

/* ---------------- Rarity Round ---------------- */

async function playRarityRun(root: HTMLElement, ranks: number[]) {
  for (let round = 0; round < ranks.length; round++) {
    await waitFor(() => !!root.querySelector('[data-testid="autocomplete"]'), `round ${round + 1}`);
    const input = root.querySelector('[data-testid="autocomplete"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { value: `Pool ${round} Rank ${ranks[round]}` } }); });
    const lock = buttonWith(root, 'Lock in answer');
    if (!lock) throw new Error('no lock in button');
    await act(async () => { fireEvent.click(lock); });
    const next = buttonWith(root, round + 1 >= ranks.length ? 'See final score' : 'Next round');
    if (!next) throw new Error('no next button');
    await act(async () => { fireEvent.click(next); });
    await tick();
  }
}
/* Every place the Rarity result screen states the score: the headline, the
   Obscurity stat and the share. Each must be the recorded number. */
function rarityShown(root: HTMLElement) {
  return {
    headline: headline(root),
    stat: statValue(root, 'Obscurity'),
    share: share(root, 'Rarity Round - Rarity Round'),
  };
}

describe('rarity-round', () => {
  it('rarity-round: a perfect Rarity run records 500, and the headline, the stat and the share all say it', async () => {
    const v = mount(<RarityRound />);
    await playRarityRun(v.container, [10, 10, 10, 10, 10]);
    await tick(60);
    const s = rarityShown(v.container);
    const rec = recorded('/rarity-round');
    console.log(`SHOWN rarity-round Rarity perfect run: recorded ${JSON.stringify(rec)} headline "${s.headline}" Obscurity "${s.stat}" share "${s.share}" fame points "${statValue(v.container, 'Fame points')}"`);
    expect(rec).toEqual([500]);
    expect(firstNumber(s.headline?.replace(/^\D+/, ''))).toBe(500);
    expect(firstNumber(s.stat)).toBe(500);
    expect(firstNumber(s.share)).toBe(500);
  }, 30000);

  it('rarity-round: a mixed Rarity run records what every line shows, and Crowd Says records a play with no score and says so', async () => {
    const v = mount(<RarityRound />);
    await playRarityRun(v.container, [10, 7, 1, 10, 4]);
    await tick(60);
    const s = rarityShown(v.container);
    const rec = recorded('/rarity-round');
    console.log(`SHOWN rarity-round Rarity mixed run: recorded ${JSON.stringify(rec)} headline "${s.headline}" Obscurity "${s.stat}" share "${s.share}" fame points "${statValue(v.container, 'Fame points')}"`);
    expect(rec.length).toBe(1);
    expect(rec[0]).toBeGreaterThan(0);
    expect(firstNumber(s.headline?.replace(/^\D+/, ''))).toBe(rec[0]);
    expect(firstNumber(s.stat)).toBe(rec[0]);
    expect(firstNumber(s.share)).toBe(rec[0]);

    vi.mocked(recordCompletion).mockClear();
    const crowd = buttonWith(v.container, 'Crowd Says');
    if (!crowd) throw new Error('no Crowd Says toggle');
    await act(async () => { fireEvent.click(crowd); });
    await playRarityRun(v.container, [1, 1, 2, 1, 1]);
    await tick(60);
    const crowdRec = vi.mocked(recordCompletion).mock.calls.filter(c => c[0] === '/rarity-round');
    const note = (v.container.textContent ?? '').includes('counts as a play, not for leaderboard points');
    console.log(`SHOWN rarity-round Crowd Says run: ${crowdRec.length} record(s), score ${JSON.stringify(crowdRec.map(c => c[1] ?? null))}, shown "${statValue(v.container, 'Crowd Says')}", note on screen ${note}`);
    expect(crowdRec.length).toBe(1);
    expect(crowdRec[0][1]).toBeUndefined();
    expect(note).toBe(true);
  }, 30000);
});

/* ---------------- Fantasy Draft ---------------- */

describe('fantasy-draft', () => {
  it('fantasy-draft: the verdict card and the share carry the season score the draft records, and the share tells the result as it was', async () => {
    const positions = ['GK', 'GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'ST', 'CM', 'CB', 'ST', 'LW', 'RW', 'CM', 'CB', 'GK', 'ST', 'CAM', 'CDM'];
    H.tables.fantasy_draft_players = positions.map((pos, i) => ({
      id: `fd${i}`, name: `Draft Player ${i}`, position: pos, nationality: 'Nowhere',
      market_value_millions: 10 + ((i * 37) % 90), dominant_foot: 'Right', age: 22 + (i % 12),
    }));
    H.functions['simulate-season'] = { teamAStory: 'Your side ground it out.', teamBStory: 'The AI side ran hot and cold.' };
    /* The AI waits two seconds a pick. Same order of events, shorter waits. */
    const realTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
      realTimeout(fn as any, Math.min(ms ?? 0, 5), ...args)) as any);
    const v = mount(<FantasyDraft />);
    await tick(50);
    await click(v.container, 'Start Draft');
    await waitFor(() => v.container.querySelectorAll('[data-testid="fd-pick"]').length > 0, 'the draft pool');
    for (let guard = 0; guard < 400 && !(v.container.textContent ?? '').includes('Season score'); guard++) {
      const p = Array.from(v.container.querySelectorAll('[data-testid="fd-pick"]')).find(b => !(b as HTMLButtonElement).disabled) as HTMLButtonElement | undefined;
      if (p) await act(async () => { fireEvent.click(p); });
      await tick(15);
    }
    const text = v.container.textContent ?? '';
    const shown = Number(text.match(/Season score: (\d+)\/100/)?.[1]);
    const points = Number(text.match(/You (\d+) pts/)?.[1]);
    const verdictLine = text.includes('Your draft wins the season') ? 'win' : text.includes('Dead level') ? 'draw' : 'loss';
    await click(v.container, "Tell the season's story");
    await waitFor(() => !!shareEl(v.container, 'Fantasy Draft'), 'the Fantasy Draft share');
    const el = shareEl(v.container, 'Fantasy Draft')!;
    const custom = el.getAttribute('data-custom') ?? '';
    const scoreLine = el.getAttribute('data-score') ?? '';
    const told = custom.includes('I outdrafted the AI') ? 'win' : custom.includes('drew level') ? 'draw' : custom.includes('The AI outdrafted me') ? 'loss' : 'none';
    const rec = recorded('/fantasy-draft');
    console.log(`SHOWN fantasy-draft: recorded ${JSON.stringify(rec)} verdict "Season score: ${shown}/100" from ${points} season points (${verdictLine}); share "${scoreLine}", text "${custom}"`);
    expect(rec).toEqual([shown]);
    expect(shown).toBe(Math.min(100, Math.round((points / 114) * 100)));
    expect(scoreLine).toContain(`Season score ${shown}/100`);
    expect(custom).toContain(`Season score ${shown}/100`);
    expect(told).toBe(verdictLine);
  }, 60000);
});

/* ---------------- Quiz Board ---------------- */

async function answerTile(root: HTMLElement, value: number, answer: string) {
  const tile = Array.from(root.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === `$${value}`);
  if (!tile) throw new Error(`no $${value} tile`);
  await act(async () => { fireEvent.click(tile); });
  const input = root.querySelector('input[aria-label="Your answer"]') as HTMLInputElement;
  await act(async () => { fireEvent.change(input, { target: { value: answer } }); });
  await act(async () => { fireEvent.submit(input.closest('form')!); });
}
const boardReady = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('button')).some(b => (b.textContent ?? '').trim() === '$200');
const bankedOnCard = (root: HTMLElement) => {
  const label = Array.from(root.querySelectorAll('p')).find(p => (p.textContent ?? '').trim() === 'Board cleared');
  return label?.nextElementSibling?.textContent ?? null;
};
async function sharedBank(root: HTMLElement) {
  await click(root, 'Share score');
  const m = H.clipboard.match(/\n\$(-?\d+)\n/);
  return m ? Number(m[1]) : NaN;
}

describe('quiz-board', () => {
  it('quiz-board: a board cleared below zero shows, shares and records the same bank, $0', async () => {
    const v = mount(<QuizBoard />);
    await waitFor(() => boardReady(v.container), 'the quiz board');
    for (const val of [200, 400, 600, 800, 1000]) await answerTile(v.container, val, 'nobody at all');
    await tick(60);
    const shown = bankedOnCard(v.container);
    const shared = await sharedBank(v.container);
    console.log(`SHOWN quiz-board all wrong: recorded ${JSON.stringify(recorded('/jeopardy'))} final card "${shown}" shared $${shared}`);
    expect(recorded('/jeopardy')).toEqual([firstNumber(shown)]);
    expect(shared).toBe(firstNumber(shown));
    expect(firstNumber(shown)).toBe(0);
  }, 30000);

  it('quiz-board: a winning board shows, shares and records the same bank', async () => {
    const v = mount(<QuizBoard />);
    await waitFor(() => boardReady(v.container), 'the quiz board');
    await answerTile(v.container, 200, 'nobody at all');
    for (const val of [400, 600, 800, 1000]) await answerTile(v.container, val, `Answer ${val}`);
    await tick(60);
    const shown = bankedOnCard(v.container);
    const shared = await sharedBank(v.container);
    console.log(`SHOWN quiz-board four right: recorded ${JSON.stringify(recorded('/jeopardy'))} final card "${shown}" shared $${shared}`);
    expect(recorded('/jeopardy')).toEqual([firstNumber(shown)]);
    expect(shared).toBe(firstNumber(shown));
    expect(firstNumber(shown)).toBe(2600);
  }, 30000);
});

/* ---------------- NFL Career Path ---------------- */

describe('nfl-career', () => {
  it('nfl-career: a daily win shares the points it records', async () => {
    const target = nflCareerPlayers[parseInt(getTodayET().replace(/-/g, ''), 10) % nflCareerPlayers.length];
    const v = mount(<NFLCareer />);
    await waitFor(() => !!v.container.querySelector('[data-testid="autocomplete"]'), 'the NFL guess box');
    const input = v.container.querySelector('[data-testid="autocomplete"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { value: target.name } }); });
    await tick(60);
    const shownText = share(v.container, 'NFL Career Path');
    console.log(`SHOWN nfl-career win at clue 1: recorded ${JSON.stringify(recorded('/nfl-career'))} share "${shownText}"`);
    expect(recorded('/nfl-career')).toEqual([firstNumber(shownText)]);
  }, 30000);

  /* A loss shares "0 pts" and still records the clue score. Round 645 owns
     that record (a loss records 0), so this line reports it and asserts
     nothing. */
  it('nfl-career: a daily loss, reported for Round 645', async () => {
    const target = nflCareerPlayers[parseInt(getTodayET().replace(/-/g, ''), 10) % nflCareerPlayers.length];
    const others = nflCareerPlayers.filter(p => p.name !== target.name).slice(0, 6);
    const v = mount(<NFLCareer />);
    for (const p of others) {
      await waitFor(() => !!v.container.querySelector('[data-testid="autocomplete"]') || share(v.container, 'NFL Career Path') !== null, 'the NFL guess box');
      const input = v.container.querySelector('[data-testid="autocomplete"]') as HTMLInputElement | null;
      if (!input) break;
      await act(async () => { fireEvent.change(input, { target: { value: p.name } }); });
      await tick();
    }
    await tick(60);
    console.log(`INFO nfl-career loss (Round 645 owns this record): recorded ${JSON.stringify(recorded('/nfl-career'))} share "${share(v.container, 'NFL Career Path')}"`);
  }, 30000);
});

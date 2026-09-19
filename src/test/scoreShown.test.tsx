/**
 * Round 644: a finished game records the number its result screen shows.
 *
 * The points audit of 2026-09-19 found screens showing one number while the
 * recorder wrote another. Soccer Career showed a legacy score out of 100 and
 * recorded a trophy formula out of 1000 that a 99 starting overall could run to
 * the cap. Footle's score panel was handed 1000 down 125 a guess while the
 * record held 700 down 100. Fantasy Draft showed season points and recorded a
 * share of 114 nobody saw. Quiz Board showed and shared a negative bank while
 * recording 0. Player Bingo showed points and recorded nothing, and Rarity mode
 * recorded a perfect run as 0.
 *
 * Every page here is the REAL page with the REAL recording path
 * (useGameCompletion or ResultScreen's recordCompletionOnMount). Only the
 * recorder itself, the network, and the parts that need a network or a human
 * (player search boxes, the draft pool list, the share buttons, the score
 * distribution panel) are stubbed, and each stub renders exactly the props the
 * page hands it, so what it shows is what the page passed.
 *
 * scripts/simScoreShown.mjs runs this file and carries the negative controls:
 * it points SCORE_SHOWN_SOCCER_PAGE, SCORE_SHOWN_FOOTLE_PAGE or
 * SCORE_SHOWN_BINGO_PAGE at a copy of that page with the old line put back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const H = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
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

/* The share row, the score panel and the search boxes, each drawn as the
   props the page passed and nothing else. */
vi.mock('@/components/game/ShareButtons', () => ({
  default: ({ score, gameName }: { score: string; gameName: string }) => (
    <div data-testid="share" data-game={gameName} data-score={score} />
  ),
}));
vi.mock('@/components/game/PostGameStats', () => ({
  default: ({ gameSlug, userScore }: { gameSlug: string; userScore: number }) => (
    <div data-testid="post-game-stats" data-slug={gameSlug} data-user-score={String(userScore)} />
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
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import PlayerBingoReal from '@/pages/PlayerBingo';
import RarityRound from '@/pages/RarityRound';
import FantasyDraft from '@/pages/FantasyDraft';
import QuizBoardPage from '@/pages/QuizBoard';
import NFLCareer from '@/pages/NFLCareer';

/* The negative controls swap in a copy of one page. Off in every ordinary run. */
const soccerPath = process.env.SCORE_SHOWN_SOCCER_PAGE;
const footlePath = process.env.SCORE_SHOWN_FOOTLE_PAGE;
const bingoPath = process.env.SCORE_SHOWN_BINGO_PAGE;
const { default: SoccerCareer } = soccerPath ? await import(/* @vite-ignore */ soccerPath) : await import('@/pages/SoccerCareer');
const { default: Footle } = footlePath ? await import(/* @vite-ignore */ footlePath) : await import('@/pages/Footle');
const PlayerBingo = bingoPath ? (await import(/* @vite-ignore */ bingoPath)).default : PlayerBingoReal;

/* eslint-disable @typescript-eslint/no-explicit-any */
const recorded = (path: string) =>
  vi.mocked(recordCompletion).mock.calls.filter(c => c[0] === path).map(c => c[1] as number | undefined);
const tick = (ms = 30) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const mount = (el: JSX.Element) => render(<HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>);
const buttonWith = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll('button')).find(b => (b.textContent ?? '').includes(text)) as HTMLButtonElement | undefined;
const share = (root: HTMLElement, game: string) =>
  root.querySelector(`[data-testid="share"][data-game="${game}"]`)?.getAttribute('data-score') ?? null;
const firstNumber = (s: string | null | undefined) => {
  const m = (s ?? '').match(/-?\d+/);
  return m ? Number(m[0]) : NaN;
};
const statValue = (root: HTMLElement, label: string) => {
  const el = Array.from(root.querySelectorAll('span')).find(s => (s.textContent ?? '').trim() === label);
  return el?.nextElementSibling?.textContent ?? null;
};
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
  vi.mocked(recordCompletion).mockClear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  if (!('IntersectionObserver' in window)) {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  }
  if (!('ResizeObserver' in window)) {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  }
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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

/** One seeded career from a 99 start, played to the retirement ceremony. */
function playTo99Ceremony(seed: number): CareerState {
  const realRandom = Math.random;
  Math.random = seeded(seed);
  try {
    const clubs = E.FALLBACK_CLUBS;
    const st = (o: number) => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    let s = E.initCareer('Test Striker', 'Brazil', 'ST', '2020s', st(99), 99, 2020, clubs, null, 99);
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

/** Mount the page on a saved ceremony, retire, and read back what it records and shows. */
async function retireThroughPage(career: CareerState) {
  vi.mocked(recordCompletion).mockClear();
  localStorage.setItem('soccerCareerSave', JSON.stringify(career));
  const v = mount(<SoccerCareer />);
  await tick(100);
  const retire = buttonWith(v.container, 'Retire and Enjoy Life');
  if (!retire) throw new Error('no Retire and Enjoy Life button on the ceremony');
  await act(async () => { fireEvent.click(retire); });
  await waitFor(() => recorded('/soccer-career').length > 0 && share(v.container, 'Soccer Career') !== null, 'the soccer-career record and legacy card');
  const shownText = share(v.container, 'Soccer Career');
  const shown = Number((shownText ?? '').match(/(\d+)\/100/)?.[1]);
  const rec = recorded('/soccer-career');
  v.unmount();
  return { rec, shown, shownText };
}

describe('soccer-career', () => {
  it('soccer-career: records the legacy score the retirement screen shows, and a 99 start records less than the same record climbed from 55', async () => {
    const at99 = playTo99Ceremony(644);
    const at55: CareerState = { ...at99, startingOverall: 55 };
    at55.legacy = E.calculateLegacy(at55);

    const a = await retireThroughPage(at99);
    const b = await retireThroughPage(at55);
    const t = E.getCareerTotals(at99.seasons);
    console.log(`SHOWN soccer-career start 99: recorded ${JSON.stringify(a.rec)} shown "${a.shownText}" (peak ${at99.peakOverall}, ${t.ballonDors} Ballon d'Or, ${t.championsLeagues} UCL, ${t.worldCups} WC, ${t.leagueTitles} leagues)`);
    console.log(`SHOWN soccer-career same record from 55: recorded ${JSON.stringify(b.rec)} shown "${b.shownText}"`);

    expect(a.rec).toEqual([a.shown]);
    expect(b.rec).toEqual([b.shown]);
    expect(a.rec[0]).toBeLessThan(b.rec[0] as number);
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
    it(`footle: a daily won in ${guessCount} records the score its stats panel places you with`, async () => {
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
      const shown = Number(v.container.querySelector('[data-testid="post-game-stats"]')?.getAttribute('data-user-score'));
      console.log(`SHOWN footle won in ${guessCount}: recorded ${JSON.stringify(recorded('/footle'))} stats panel ${shown}`);
      expect(recorded('/footle')).toEqual([shown]);
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

describe('rarity-round', () => {
  it('rarity-round: Rarity mode records its obscurity total, shown on the result screen, and a perfect run records 500', async () => {
    const v = mount(<RarityRound />);
    await playRarityRun(v.container, [10, 10, 10, 10, 10]);
    await tick(60);
    const perfect = statValue(v.container, 'Obscurity');
    const perfectRec = recorded('/rarity-round');
    console.log(`SHOWN rarity-round Rarity perfect run: recorded ${JSON.stringify(perfectRec)} Obscurity "${perfect}" points total "${statValue(v.container, 'Rarity Round')}"`);
    expect(perfectRec).toEqual([firstNumber(perfect)]);
    expect(perfectRec[0]).toBe(500);
  }, 30000);

  it('rarity-round: a mixed Rarity run records what it shows, and Crowd Says records its total', async () => {
    const v = mount(<RarityRound />);
    await playRarityRun(v.container, [10, 7, 1, 10, 4]);
    await tick(60);
    const mixed = statValue(v.container, 'Obscurity');
    const mixedRec = recorded('/rarity-round');
    console.log(`SHOWN rarity-round Rarity mixed run: recorded ${JSON.stringify(mixedRec)} Obscurity "${mixed}" points total "${statValue(v.container, 'Rarity Round')}"`);
    expect(mixedRec).toEqual([firstNumber(mixed)]);
    expect(mixedRec[0]).toBeGreaterThan(0);

    vi.mocked(recordCompletion).mockClear();
    const crowd = buttonWith(v.container, 'Crowd Says');
    if (!crowd) throw new Error('no Crowd Says toggle');
    await act(async () => { fireEvent.click(crowd); });
    await playRarityRun(v.container, [1, 1, 2, 1, 1]);
    await tick(60);
    const crowdShown = statValue(v.container, 'Crowd Says');
    console.log(`SHOWN rarity-round Crowd Says run: recorded ${JSON.stringify(recorded('/rarity-round'))} shown "${crowdShown}"`);
    expect(recorded('/rarity-round')).toEqual([firstNumber(crowdShown)]);
  }, 30000);
});

/* ---------------- Fantasy Draft ---------------- */

describe('fantasy-draft', () => {
  it('fantasy-draft: the verdict card shows the season score the draft records', async () => {
    const positions = ['GK', 'GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'ST', 'CM', 'CB', 'ST', 'LW', 'RW', 'CM', 'CB', 'GK', 'ST', 'CAM', 'CDM'];
    H.tables.fantasy_draft_players = positions.map((pos, i) => ({
      id: `fd${i}`, name: `Draft Player ${i}`, position: pos, nationality: 'Nowhere',
      market_value_millions: 10 + ((i * 37) % 90), dominant_foot: 'Right', age: 22 + (i % 12),
    }));
    /* The AI waits two seconds a pick. Same order of events, shorter waits. */
    const realTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
      realTimeout(fn as any, Math.min(ms ?? 0, 5), ...args)) as any);
    const v = mount(<FantasyDraft />);
    await tick(50);
    const start = buttonWith(v.container, 'Start Draft');
    if (!start) throw new Error('no Start Draft button');
    await act(async () => { fireEvent.click(start); });
    await waitFor(() => v.container.querySelectorAll('[data-testid="fd-pick"]').length > 0, 'the draft pool');
    for (let guard = 0; guard < 400 && !(v.container.textContent ?? '').includes('Season score'); guard++) {
      const pick = Array.from(v.container.querySelectorAll('[data-testid="fd-pick"]')).find(b => !(b as HTMLButtonElement).disabled) as HTMLButtonElement | undefined;
      if (pick) await act(async () => { fireEvent.click(pick); });
      await tick(15);
    }
    const text = v.container.textContent ?? '';
    const shown = Number(text.match(/Season score: (\d+)\/100/)?.[1]);
    const points = Number(text.match(/You (\d+) pts/)?.[1]);
    console.log(`SHOWN fantasy-draft: recorded ${JSON.stringify(recorded('/fantasy-draft'))} verdict "Season score: ${shown}/100" from ${points} season points`);
    expect(recorded('/fantasy-draft')).toEqual([shown]);
    expect(shown).toBe(Math.min(100, Math.round((points / 114) * 100)));
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

describe('quiz-board', () => {
  it('quiz-board: a board cleared below zero shows and records the same bank, $0', async () => {
    const v = mount(<QuizBoardPage />);
    await waitFor(() => boardReady(v.container), 'the quiz board');
    for (const val of [200, 400, 600, 800, 1000]) await answerTile(v.container, val, 'nobody at all');
    await tick(60);
    const shown = bankedOnCard(v.container);
    console.log(`SHOWN quiz-board all wrong: recorded ${JSON.stringify(recorded('/jeopardy'))} final card "${shown}"`);
    expect(recorded('/jeopardy')).toEqual([firstNumber(shown)]);
    expect(firstNumber(shown)).toBe(0);
  }, 30000);

  it('quiz-board: a winning board shows and records the same bank', async () => {
    const v = mount(<QuizBoardPage />);
    await waitFor(() => boardReady(v.container), 'the quiz board');
    await answerTile(v.container, 200, 'nobody at all');
    for (const val of [400, 600, 800, 1000]) await answerTile(v.container, val, `Answer ${val}`);
    await tick(60);
    const shown = bankedOnCard(v.container);
    console.log(`SHOWN quiz-board four right: recorded ${JSON.stringify(recorded('/jeopardy'))} final card "${shown}"`);
    expect(recorded('/jeopardy')).toEqual([firstNumber(shown)]);
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

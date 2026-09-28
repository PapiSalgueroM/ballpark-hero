/**
 * The edges of the daily lock that the Round 645 part three review found
 * behind a green fence, one section each, run by scripts/simDailyLockEdges.mjs.
 *
 * Round 645 part three fix. src/test/dailyReload.test.tsx proves the lock on
 * the path a player walks straight through: finish, refresh, replay. The
 * review walked the side doors and found every one of these open:
 *
 *   [giveup-shut]    NASCAR and Tennis Chain left Give Up live while a guess
 *                    was out being verified (the board)
 *   [giveup-refused] and the hook took it (so a recorded 0 later read 100)
 *   [late-verdict]   a verdict landing after its chain was gone still wrote
 *                    onto whatever chain was there
 *   [canonical]      the used check read the picked name, not the name the
 *                    validator settled on, so a chain could hold one name
 *                    twice and file a record its own reader refuses
 *   [leaderboard]    a restored finished chain daily offered the nickname
 *                    form a second time (all three chains)
 *   [pack-toggle]    Pack Battle's reveal timer outlived a mode toggle and
 *                    busted (or moved on) the freshly dealt daily
 *   [pack-writer]    and the page could file a finished pack its reader
 *                    refused, reopening the day
 *   [pack-mark]      a finished daily reopened over a result card left a
 *                    restore mark that swallowed the next real finish
 *   [rarity-mark]    the same shape on Rarity Round
 *   [arcade-bound]   an arcade progress record's score was trusted, so a
 *                    hand edited total resumed and was recorded
 *   [rarity-derive]  Rarity Round's saved rank and pool size were trusted
 *   [gauntlet-board] the NBA, NFL and MLB Gauntlet board kept no pick of a
 *                    daily draft part made (the soccer page has a row in
 *                    the reload fence; this board has none)
 *   [drill-fouls]    the tackle drill's foul count was never filed
 *   [market-roll]    a Player Stock Market daily refreshed mid reveal
 *
 * Found by the fix pass on the same shape (the Daily toggle landing a new
 * daily finish on a page already on a result card, which to a recorder whose
 * done flag is the phase alone is no transition):
 *
 *   [pack-new-finish]        a daily's last call left in its reveal for
 *                            Unlimited, played out, then Daily: the daily's
 *                            finish was never recorded
 *   [rarity-new-finish]      the fifth daily answer locked in and left the
 *                            same way (the restore's boot did not reach the
 *                            screen, so the pages met result to result)
 *   [millionaire-new-finish] a decided answer left in its suspense, the same
 *                            way (it bites once Round 645 part one drops the
 *                            mode from the page's done flag)
 *
 * Everything runs through the same mocks as the reload fence (./dailyReload
 * /mocks): the real pages and hooks, the real recorder hook and restore
 * handshake, jsdom's real localStorage. Each section has a negative control
 * in the wrapper: a copy of one module with the fix taken out, swapped in
 * through DAILY_LOCK_SWAP (vitest.config.ts), which must turn that section
 * red and leave every other section green.
 */
import './dailyReload/mocks';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { recordCompletion, recordUnranked, resetMocks, setFunctionFixture, setPoolFixture } from './dailyReload/mocks';
import { button, click, findButton, mountPage, resultCard, typeInto, type MountedPage } from './dailyReload/harness';
import { freezeArcadeGlobals, withFullMotion } from './dailyReload/arcadeGlobals';
import nascarDriver from './dailyReload/nascar-chain.driver';
import tennisDriver from './dailyReload/tennis-chain.driver';
import ufcDriver from './dailyReload/ufc-chain.driver';
import freeKickDriver from './dailyReload/free-kick.driver';
import marketDriver from './dailyReload/player-stock-market.driver';
import millionaireDriver, { POOL as MILLIONAIRE_POOL } from './dailyReload/sports-millionaire.driver';
import { buildFreshLadder } from '@/lib/sportsMillionaire';
import { getTodayET } from '@/lib/dateUtils';
import { writeDailyRecord } from '@/lib/dailyRecord';
import { readArcadeProgress, readArcadeRun } from '@/lib/arcadeRecord';
import { buildRun as buildKicks, daySeed as kickSeed, maxRunScore as maxKickScore, ROUNDS_PER_RUN as KICKS } from '@/lib/freeKick';
import { buildDailyPack, buildUnlimitedPack, readPackDaily, writePackDaily, type PackCard } from '@/lib/packBattle';
import { normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import { CATEGORIES, pickDailyCategories, type PoolEntry } from '@/lib/rarityRound';
import { DRILL_META, buildTackleRun, drillSeed, makeTackle, tackleDeadline, ROUNDS_PER_RUN as DRILL_ROUNDS } from '@/lib/careerDrills';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { useNascarChain } from '@/hooks/useNascarChain';
import { useTennisChain } from '@/hooks/useTennisChain';
import NascarChain from '@/pages/NascarChain';
import TennisChain from '@/pages/TennisChain';
import PackBattle from '@/pages/PackBattle';
import RarityRound from '@/pages/RarityRound';
import NbaGauntletDraft from '@/pages/NbaGauntletDraft';
import DrillBoard from '@/components/soccer-career/DrillBoard';

const today = getTodayET();

/* Every finish the recorder hook handed on, ranked or (after Round 645 part
   one lands) unranked. */
const finishes = () => recordCompletion.mock.calls.length + recordUnranked.mock.calls.length;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}

function entity(name: string): PlayerEntity {
  return { key: normalizeName(name), name, rawName: name, meta: {}, matchRank: 0, prominence: 1 } as PlayerEntity;
}

beforeEach(() => {
  resetMocks('edges');
  localStorage.clear();
});

/* ------------------------------------------------------------ the chains */

interface ChainHookApi {
  gameState: { gameStatus: string; score: number; chain: unknown[]; mode: string } | null;
  startGame: (mode: 'daily' | 'unlimited') => void;
  makeGuess: (name: string) => Promise<void>;
  giveUp: () => void;
  resetGame: () => void;
}

interface NetworkChain {
  slug: string;
  path: string;
  page: () => ReactElement;
  fn: string;
  currentField: string;
  useHook: () => ChainHookApi;
}

const NETWORK_CHAINS: NetworkChain[] = [
  { slug: 'nascar-chain', path: '/nascar-chain', page: () => <NascarChain />, fn: 'nascar-chain-validate', currentField: 'currentDriver', useHook: useNascarChain as unknown as () => ChainHookApi },
  { slug: 'tennis-chain', path: '/tennis-chain', page: () => <TennisChain />, fn: 'tennis-chain-validate', currentField: 'currentPlayer', useHook: useTennisChain as unknown as () => ChainHookApi },
];

const RIVAL = 'Fixture Rival';

/* A validator that holds its verdict until the gate opens. */
function heldValidator(chain: NetworkChain) {
  const gate = deferred();
  setFunctionFixture(chain.fn, (body: Record<string, string>) =>
    gate.promise.then(() => ({ valid: true, fullName: RIVAL, connection: `Beat ${body[chain.currentField]} in the fixture final` })));
  return gate;
}

function liveScore(m: MountedPage): string {
  return Array.from(m.container.querySelectorAll('div')).map(d => (d.textContent ?? '').trim()).find(t => /^Score: \d+$/.test(t)) ?? '';
}

describe('daily lock edges', () => {
  describe('[giveup-shut] chain Give Up is shut while a guess is out being verified', () => {
    for (const chain of NETWORK_CHAINS) {
      it(`${chain.slug}: the button is disabled for the verdict, and live again once it lands`, async () => {
        setPoolFixture('autocomplete', [entity(RIVAL)]);
        const gate = heldValidator(chain);
        const m = mountPage(chain.page(), chain.path);
        try {
          await click(await waitFor(() => button(m.container, /Daily Challenge/)));
          await click(await waitFor(() => button(m.container, new RegExp(`^pick ${RIVAL}$`))));
          await waitFor(() => { if (!/Verifying/.test(m.container.textContent ?? '')) throw new Error('the guess is not out being verified'); });
          const giveUp = button(m.container, /^Give Up$/);
          expect(giveUp.disabled, 'Give Up is shut while the verdict is out').toBe(true);
          await click(giveUp);
          await act(async () => { gate.resolve(); await gate.promise; });
          await waitFor(() => { if (liveScore(m) !== 'Score: 100') throw new Error(`the link has not landed (${liveScore(m)})`); });
          expect(button(m.container, /^Give Up$/).disabled, 'Give Up is live again once the verdict lands').toBe(false);
          expect(finishes(), 'nothing is recorded while the chain plays on').toBe(0);
        } finally {
          m.unmount();
        }
      });
    }
  });

  describe('[giveup-refused] the chain hook refuses Give Up while a verdict is out', () => {
    for (const chain of NETWORK_CHAINS) {
      it(`${chain.slug}: giveUp during the verdict changes nothing, and the verdict lands`, async () => {
        const gate = heldValidator(chain);
        const { result, unmount } = renderHook(() => chain.useHook());
        try {
          act(() => result.current.startGame('daily'));
          let pending: Promise<void> = Promise.resolve();
          act(() => { pending = result.current.makeGuess(RIVAL); });
          act(() => result.current.giveUp());
          expect(result.current.gameState?.gameStatus, 'a Give Up while the verdict is out is refused').toBe('playing');
          await act(async () => { gate.resolve(); await pending; });
          expect(result.current.gameState?.score, 'the verdict lands on the chain it was asked about').toBe(100);
          expect(finishes(), 'nothing recorded while the chain plays on').toBe(0);
          act(() => result.current.giveUp());
          expect(result.current.gameState?.gameStatus).toBe('ended');
          expect(recordCompletion.mock.calls.map(c => [c[0], c[1]]), 'the finish recorded is the score on the card').toEqual([[`/${chain.slug}`, 100]]);
        } finally {
          unmount();
        }
      });
    }
  });

  describe('[late-verdict] a verdict never lands on a chain that is gone', () => {
    for (const chain of NETWORK_CHAINS) {
      it(`${chain.slug}: a verdict for a chain replaced mid verify is dropped`, async () => {
        const gate = heldValidator(chain);
        const { result, unmount } = renderHook(() => chain.useHook());
        try {
          act(() => result.current.startGame('daily'));
          let pending: Promise<void> = Promise.resolve();
          act(() => { pending = result.current.makeGuess(RIVAL); });
          act(() => result.current.resetGame());
          act(() => result.current.startGame('unlimited'));
          const fresh = result.current.gameState!.chain;
          await act(async () => { gate.resolve(); await pending; });
          expect(result.current.gameState?.mode).toBe('unlimited');
          expect(result.current.gameState?.chain, 'the new chain is untouched by the old verdict').toBe(fresh);
          expect(result.current.gameState?.score).toBe(0);
        } finally {
          unmount();
        }
      });
    }
  });

  describe('[canonical] a chain never holds one name twice, by the name the validator settled on', () => {
    for (const chain of NETWORK_CHAINS) {
      it(`${chain.slug}: an alias the validator folds onto a name already in the chain ends it, and the day stays locked`, async () => {
        const ALIAS = 'Fixture Alias';
        const mountDaily = async () => {
          setPoolFixture('autocomplete', [entity(ALIAS)]);
          /* The validator settles the alias on whoever is current: the starter. */
          setFunctionFixture(chain.fn, (body: Record<string, string>) => ({ valid: true, fullName: body[chain.currentField], connection: 'Folded' }));
          const m = mountPage(chain.page(), chain.path);
          await click(await waitFor(() => button(m.container, /Daily Challenge/)));
          return m;
        };
        let m = await mountDaily();
        let card = '';
        try {
          await click(await waitFor(() => button(m.container, new RegExp(`^pick ${ALIAS}$`))));
          await waitFor(() => { if (!/Game Over!/.test(m.container.textContent ?? '')) throw new Error('the chain did not end on the repeated name'); });
          expect(m.container.textContent ?? '', 'the chain says the name was already used').toMatch(/You already used .+ in this chain!/);
          card = (m.container.textContent ?? '').match(/You already used .+? in this chain!/)?.[0] ?? '';
          expect(recordCompletion.mock.calls.map(c => [c[0], c[1]])).toEqual([[`/${chain.slug}`, 0]]);
        } finally {
          m.unmount();
        }
        m = await mountDaily();
        try {
          await waitFor(() => { if (!/Game Over!/.test(m.container.textContent ?? '')) throw new Error('the finished daily did not come back finished (the record was refused)'); });
          expect(m.container.textContent ?? '').toContain(card);
          expect(recordCompletion.mock.calls.length, 'the restore records nothing').toBe(1);
        } finally {
          m.unmount();
        }
      });
    }
  });

  describe('[leaderboard] a finished chain daily whose row is saved is not offered the form again', () => {
    for (const driver of [nascarDriver, tennisDriver, ufcDriver]) {
      it(`${driver.slug}: save a nickname, reload, and the card says it is on the board`, async () => {
        let api = await driver.mount();
        try {
          await driver.enterDaily(api);
          await driver.finish(api);
          const input = api.container.querySelector('input[aria-label="Your nickname"]');
          expect(input, 'a fresh finish offers the form').not.toBeNull();
          await typeInto(input!, 'Tester');
          await click(button(api.container, /^Save$/));
          await waitFor(() => { if (api.container.querySelector('input[aria-label="Your nickname"]')) throw new Error('the save has not gone through'); });
        } finally {
          driver.unmount(api);
        }
        api = await driver.mount();
        try {
          await driver.enterDaily(api);
          expect(driver.status(api)).toBe('finished');
          expect(api.container.querySelector('input[aria-label="Your nickname"]'), 'no second row for the same daily').toBeNull();
          expect(api.container.textContent ?? '').toMatch(/already on the leaderboard/);
        } finally {
          driver.unmount(api);
        }
      });
    }
  });

  /* ------------------------------------------------------- Pack Battle */

  /* Distinct values, the reload fence's pool shape. */
  const PACK_POOL: PackCard[] = Array.from({ length: 24 }, (_, i) => ({
    name: `Fixture Player ${String(i + 1).padStart(2, '0')}`,
    club: `Fixture Club ${(i % 6) + 1}`,
    nationality: 'England',
    value: 1_000_000 + i * 750_000,
  }));

  const packCard = (m: MountedPage): number | null => {
    const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Card \d+ of \d+$/.test((s.textContent ?? '').trim()));
    return span ? Number((span.textContent ?? '').trim().match(/^Card (\d+) of/)![1]) : null;
  };
  const packLine = (m: MountedPage): string => {
    const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Card \d+ of \d+$/.test((s.textContent ?? '').trim()));
    return (span?.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };

  async function mountPack(): Promise<MountedPage> {
    setPoolFixture('pack', PACK_POOL);
    const m = mountPage(<PackBattle />, '/pack-battle');
    await waitFor(() => { if (packCard(m) === null && !resultCard(m.container)) throw new Error('pack battle has not dealt'); });
    return m;
  }

  /* An Unlimited pack dealt with Math.random pinned, so its values are known. */
  async function dealUnlimited(m: MountedPage, label: RegExp): Promise<PackCard[]> {
    const pin = vi.spyOn(Math, 'random').mockReturnValue(0.42);
    try {
      const pack = buildUnlimitedPack(PACK_POOL);
      await click(button(m.container, label));
      return pack;
    } finally {
      pin.mockRestore();
    }
  }

  /* One call on the face down card of `pack`, left on its reveal. */
  async function press(m: MountedPage, pack: PackCard[], correctly: boolean): Promise<void> {
    const n = packCard(m);
    if (n === null) throw new Error('no face down card');
    const higherIsRight = pack[n - 1].value >= pack[n - 2].value;
    await click(button(m.container, (correctly ? higherIsRight : !higherIsRight) ? /^Higher$/ : /^Lower$/));
  }

  /* Calls, each settled past its reveal under fake timers. */
  async function calls(m: MountedPage, pack: PackCard[], moves: boolean[]): Promise<void> {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      for (const right of moves) {
        await press(m, pack, right);
        await act(async () => { vi.advanceTimersByTime(1500); });
      }
    } finally {
      vi.useRealTimers();
    }
  }

  describe('[pack-toggle] Pack Battle: a mode toggle during the reveal cancels the reveal', () => {
    for (const right of [false, true]) {
      it(`a ${right ? 'right' : 'wrong'} Unlimited call, then Daily inside the reveal: the daily is dealt fresh and plays once`, async () => {
        const daily = buildDailyPack(PACK_POOL, today);
        let m = await mountPack();
        const freshDaily = packLine(m);
        try {
          const unl = await dealUnlimited(m, /^∞ Unlimited$/);
          vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
          try {
            await press(m, unl, right);
            await click(button(m.container, /^📅 Daily$/));
            await act(async () => { vi.advanceTimersByTime(3000); });
          } finally {
            vi.useRealTimers();
          }
          expect(resultCard(m.container), 'the old reveal did not finish the daily').toBeNull();
          expect(packLine(m), 'the daily is on its first call with nothing banked from the Unlimited pack').toBe(freshDaily);
          expect(localStorage.getItem(`pack-battle-daily-${today}`), 'nothing is filed for the daily').toBeNull();
          expect(finishes(), 'nothing is recorded').toBe(0);
          await calls(m, daily, [true, false]);
          expect(resultCard(m.container), 'the daily plays to its end').not.toBeNull();
          expect(recordCompletion.mock.calls.map(c => c[0]), 'the daily records exactly once').toEqual(['/pack-battle']);
          expect(readPackDaily(today, daily), 'the finished daily is one its reader accepts').toEqual({ calls: [true, false], done: true });
        } finally {
          m.unmount();
        }
        m = await mountPack();
        try {
          expect(resultCard(m.container), 'the day stays locked').not.toBeNull();
          expect(finishes()).toBe(1);
        } finally {
          m.unmount();
        }
      });
    }
  });

  describe('[pack-writer] Pack Battle: nothing is filed that its reader would refuse', () => {
    it('a finished pack with no calls, or with calls still to make, is not filed; a real one is', () => {
      const pack = buildDailyPack(PACK_POOL, today);
      const key = `pack-battle-daily-${today}`;
      expect(writePackDaily(today, pack, [], true)).toBe(false);
      expect(localStorage.getItem(key)).toBeNull();
      expect(writePackDaily(today, pack, [true], true)).toBe(false);
      expect(localStorage.getItem(key)).toBeNull();
      expect(writePackDaily(today, pack, [true, false], true)).toBe(true);
      expect(readPackDaily(today, pack)).toEqual({ calls: [true, false], done: true });
      expect(writePackDaily(today, pack, [true, true, true, true], true)).toBe(true);
      expect(readPackDaily(today, pack)).toEqual({ calls: [true, true, true, true], done: true });
    });
  });

  describe('[pack-mark] Pack Battle: a finished daily reopened over a result card leaves no mark behind', () => {
    it('daily, Unlimited, Daily over its result, Unlimited again: every real finish is handed on', async () => {
      const daily = buildDailyPack(PACK_POOL, today);
      const m = await mountPack();
      try {
        await calls(m, daily, [true, false]);
        expect(finishes()).toBe(1);
        let unl = await dealUnlimited(m, /^∞ Unlimited$/);
        await calls(m, unl, [false]);
        expect(finishes()).toBe(2);
        await click(button(m.container, /^📅 Daily$/));
        expect(resultCard(m.container), 'the finished daily reopens').not.toBeNull();
        unl = await dealUnlimited(m, /^∞ Unlimited$/);
        await calls(m, unl, [false]);
        expect(finishes(), 'the last Unlimited finish is handed on, not swallowed by a stale mark').toBe(3);
      } finally {
        m.unmount();
      }
    });
  });

  describe('[pack-new-finish] Pack Battle: a daily finish landed over a result card is still recorded', () => {
    it('the daily miss left in its reveal, Unlimited played out, then Daily: the daily finish is handed on once', async () => {
      const daily = buildDailyPack(PACK_POOL, today);
      let m = await mountPack();
      try {
        await calls(m, daily, [true]);
        /* The miss's reveal timer is armed on the fake clock and dropped with
           it, never run, so this section does not lean on [pack-toggle]'s fix
           (the toggle cancelling that timer) and its control stays its own. */
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        let unl: PackCard[] = [];
        try {
          await press(m, daily, false);
          unl = await dealUnlimited(m, /^∞ Unlimited$/);
        } finally {
          vi.useRealTimers();
        }
        expect(readPackDaily(today, daily), 'the miss is filed and its card never shown').toEqual({ calls: [true, false], done: false });
        await calls(m, unl, [false]);
        expect(finishes(), 'the Unlimited finish').toBe(1);
        await click(button(m.container, /^📅 Daily$/));
        await waitFor(() => { if (!resultCard(m.container)) throw new Error('the daily result has not landed'); });
        expect(finishes(), 'the daily finish is handed on, over the Unlimited result card').toBe(2);
        const last = recordCompletion.mock.calls[recordCompletion.mock.calls.length - 1];
        expect([last?.[0], last?.[1]], 'the last finish handed on is the daily, with its banked card').toEqual(['/pack-battle', daily[1].value]);
        expect(readPackDaily(today, daily), 'the finished daily is one its reader accepts').toEqual({ calls: [true, false], done: true });
      } finally {
        m.unmount();
      }
      m = await mountPack();
      try {
        expect(resultCard(m.container), 'the day stays locked').not.toBeNull();
        expect(finishes(), 'and records nothing more').toBe(2);
      } finally {
        m.unmount();
      }
    });
  });

  /* ------------------------------------------------------- Rarity Round */

  const RARITY_NAMES = ['Fixture Alpha', 'Fixture Bravo', 'Fixture Charlie', 'Fixture Delta', 'Fixture Echo'];
  const RARITY_POOL: PoolEntry[] = RARITY_NAMES.map((name, i) => ({ key: normalizeName(name), name, prominence: 100 - i * 10, rank: i + 1 }));

  const rarityLine = (m: MountedPage): string => {
    const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Round \d+ of \d+$/.test((s.textContent ?? '').trim()));
    return (span?.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };

  async function mountRarity(): Promise<MountedPage> {
    setPoolFixture('rarity', RARITY_POOL);
    setPoolFixture('autocomplete', RARITY_POOL.map(p => entity(p.name)));
    const m = mountPage(<RarityRound />, '/rarity-round');
    await settleRarity(m);
    return m;
  }

  async function settleRarity(m: MountedPage): Promise<void> {
    await waitFor(() => {
      if (resultCard(m.container) || findButton(m.container, /^pick /)) return;
      throw new Error('rarity round has not settled');
    });
  }

  async function answerRarity(m: MountedPage, name: string, count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) {
      if (resultCard(m.container)) return;
      await click(await waitFor(() => button(m.container, new RegExp(`^pick ${name}$`))));
      await click(button(m.container, /^Lock in answer$/));
      await click(await waitFor(() => button(m.container, /^Next round$|^See final score$/)));
    }
  }

  describe('[rarity-mark] Rarity Round: a finished daily reopened over a result screen leaves no mark behind', () => {
    it('daily, Unlimited, Daily over its result, Unlimited again: every real finish is handed on', async () => {
      const m = await mountRarity();
      try {
        await answerRarity(m, 'Fixture Bravo', 5);
        expect(finishes()).toBe(1);
        await click(button(m.container, /^∞ Unlimited$/));
        await settleRarity(m);
        await answerRarity(m, 'Fixture Bravo', 5);
        expect(finishes()).toBe(2);
        await click(button(m.container, /^📅 Daily$/));
        await settleRarity(m);
        expect(resultCard(m.container), 'the finished daily reopens').not.toBeNull();
        await click(button(m.container, /^∞ Unlimited$/));
        await settleRarity(m);
        await answerRarity(m, 'Fixture Bravo', 5);
        expect(finishes(), 'the last Unlimited finish is handed on, not swallowed by a stale mark').toBe(3);
      } finally {
        m.unmount();
      }
    });
  });

  describe('[rarity-new-finish] Rarity Round: a daily finish landed over a result screen is still recorded', () => {
    it('the fifth daily answer locked in and left for Unlimited, played out, then Daily: the daily finish is handed on once', async () => {
      let m = await mountRarity();
      try {
        await answerRarity(m, 'Fixture Bravo', 4);
        await click(await waitFor(() => button(m.container, /^pick Fixture Bravo$/)));
        await click(button(m.container, /^Lock in answer$/));
        await waitFor(() => button(m.container, /^See final score$/));
        await click(button(m.container, /^∞ Unlimited$/));
        await settleRarity(m);
        await answerRarity(m, 'Fixture Bravo', 5);
        expect(resultCard(m.container), 'the Unlimited result screen is up').not.toBeNull();
        expect(finishes(), 'the Unlimited finish').toBe(1);
        await click(button(m.container, /^📅 Daily$/));
        await waitFor(() => expect(finishes(), 'the daily finish is handed on, over the Unlimited result screen').toBe(2));
        await settleRarity(m);
        expect(resultCard(m.container), 'the daily result is on screen').not.toBeNull();
      } finally {
        m.unmount();
      }
      m = await mountRarity();
      try {
        expect(resultCard(m.container), 'the day stays locked').not.toBeNull();
        expect(finishes(), 'and records nothing more').toBe(2);
      } finally {
        m.unmount();
      }
    });
  });

  describe('[rarity-derive] Rarity Round: a saved answer is scored from its pool, never from the record', () => {
    it('a record naming an answer its pool does not hold is refused', async () => {
      const cats = pickDailyCategories(CATEGORIES, today);
      writeDailyRecord('rarity-round', today, { rounds: [{ categoryId: cats[0].id, answerName: 'Nobody Real', rank: 5, poolSize: 5 }], done: false });
      const m = await mountRarity();
      try {
        expect(rarityLine(m), 'the day deals fresh').toMatch(/^Round 1 of 5/);
      } finally {
        m.unmount();
      }
    });

    it('a record claiming a famous answer was the rarest resumes at that answer\'s real rank', async () => {
      let m = await mountRarity();
      let honest = '';
      try {
        await answerRarity(m, 'Fixture Alpha', 1);
        honest = rarityLine(m);
      } finally {
        m.unmount();
      }
      localStorage.clear();
      const cats = pickDailyCategories(CATEGORIES, today);
      writeDailyRecord('rarity-round', today, { rounds: [{ categoryId: cats[0].id, answerName: 'Fixture Alpha', rank: 5, poolSize: 5 }], done: false });
      m = await mountRarity();
      try {
        expect(rarityLine(m), 'the resumed score is the one the pool pays for that answer').toBe(honest);
      } finally {
        m.unmount();
      }
    });
  });

  /* ----------------------------------------------------- the arcade bound */

  describe('[arcade-bound] an arcade record scoring past its shots\' ceiling is refused', () => {
    const kicks = () => buildKicks(kickSeed(today));
    const ceiling = (n: number) => maxKickScore(kicks().slice(0, n));

    it('the readers take a record at the ceiling and refuse one a point past it', () => {
      writeDailyRecord('free-kick', today, { score: ceiling(3), goals: 1, rounds: 3, draws: 6 });
      expect(readArcadeProgress('free-kick', today, 'goals', KICKS, ceiling)?.score).toBe(ceiling(3));
      writeDailyRecord('free-kick', today, { score: ceiling(3) + 1, goals: 1, rounds: 3, draws: 6 });
      expect(readArcadeProgress('free-kick', today, 'goals', KICKS, ceiling)).toBeNull();
      writeDailyRecord('free-kick', today, { score: ceiling(KICKS), goals: 2 });
      expect(readArcadeRun('free-kick', today, 'goals', KICKS, ceiling(KICKS))?.score).toBe(ceiling(KICKS));
      writeDailyRecord('free-kick', today, { score: ceiling(KICKS) + 1, goals: 2 });
      expect(readArcadeRun('free-kick', today, 'goals', KICKS, ceiling(KICKS))).toBeNull();
    });

    it('the Free Kick board deals fresh over a hand edited total', async () => {
      writeDailyRecord('free-kick', today, { score: ceiling(3) + 500, goals: 3, rounds: 3, draws: 6 });
      const api = await freeKickDriver.mount();
      try {
        await freeKickDriver.enterDaily(api);
        expect(freeKickDriver.progress!(api)).toBe('Kick 1/10\nScored 0\nPoints 0');
      } finally {
        freeKickDriver.unmount(api);
      }
    });
  });

  /* ------------------------------------------------ the Gauntlet board */

  describe('[gauntlet-board] the shared Gauntlet board keeps a daily draft part made', () => {
    const pickLine = (m: MountedPage) => Array.from(m.container.querySelectorAll('p')).find(p => /^Pick \d+ of \d+/.test((p.textContent ?? '').trim())) ?? null;
    const choices = (m: MountedPage): HTMLButtonElement[] => {
      const line = pickLine(m);
      const grid = line?.nextElementSibling;
      return grid ? Array.from(grid.querySelectorAll('button')) : [];
    };
    const draftState = (m: MountedPage): string => {
      const line = pickLine(m);
      if (!line) throw new Error('no live draft');
      const so = Array.from(m.container.querySelectorAll('p')).find(p => /so far/.test(p.textContent ?? ''));
      const chips = so?.parentElement ? Array.from(so.parentElement.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).join(' | ') : '';
      return [(line.textContent ?? '').trim(), (so?.textContent ?? '').trim(), chips].join('\n');
    };
    async function mountNba(): Promise<MountedPage> {
      const m = mountPage(<NbaGauntletDraft />, '/nba-gauntlet-draft');
      await click(await waitFor(() => button(m.container, /^Daily gauntlet/)));
      return m;
    }

    it('NBA: two picks kept, a reload comes back on pick three with both in the five, and the run records once', async () => {
      let m = await mountNba();
      let mid = '';
      try {
        for (let i = 0; i < 2; i += 1) await click(choices(m)[0]);
        mid = draftState(m);
        expect(mid).toMatch(/^Pick 3 of/);
      } finally {
        m.unmount();
      }
      m = await mountNba();
      try {
        expect(draftState(m), 'the draft comes back where it was left').toBe(mid);
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
        try {
          for (let i = 0; i < 12 && choices(m).length > 0; i += 1) await click(choices(m)[0]);
          for (let tick = 0; tick < 8 && !resultCard(m.container); tick += 1) await act(async () => { vi.advanceTimersByTime(1000); });
        } finally {
          vi.useRealTimers();
        }
        expect(resultCard(m.container), 'the cup reached its result').not.toBeNull();
        expect(recordCompletion.mock.calls.map(c => c[0])).toEqual(['/nba-gauntlet-draft']);
      } finally {
        m.unmount();
      }
    });
  });

  /* --------------------------------------------------- the tackle drill */

  describe('[drill-fouls] the tackle drill keeps its fouls across a refresh', () => {
    it('a foul refreshed mid flight is still on the session card at the end', async () => {
      const career = { position: 'CB', overall: 70, potential: 85, potentialEarned: 0 } as unknown as CareerState;
      const setup = buildTackleRun(drillSeed('tackle', today))[0];
      /* A moment and a keyboard reachable marker that fouls, found by the
         game's own rule rather than assumed. */
      let foul: { t: number; right: number; down: number } | null = null;
      for (let t = 0.05; t < tackleDeadline(setup) - 0.05 && !foul; t += 0.01) {
        for (let right = -12; right <= 12 && !foul; right += 1) {
          let x = 0.5;
          for (let k = 0; k < Math.abs(right); k += 1) x = right > 0 ? Math.min(1, x + 0.04) : Math.max(0, x - 0.04);
          for (let down = -12; down <= 12 && !foul; down += 1) {
            let y = 0.5;
            for (let k = 0; k < Math.abs(down); k += 1) y = down > 0 ? Math.min(1, y + 0.04) : Math.max(0, y - 0.04);
            if (makeTackle({ x, y, press: t }, setup).foul) foul = { t, right, down };
          }
        }
      }
      if (!foul) throw new Error('no reachable foul on today\'s first tackle, the check has nothing to take');

      const restoreGlobals = freezeArcadeGlobals();
      const realNow = performance.now;
      let clock = 1000;
      performance.now = () => clock;
      const mount = async () => {
        const m = mountPage(<DrillBoard career={career} canBank onBank={() => undefined} onBack={() => undefined} />, '/soccer-career');
        await click(await waitFor(() => button(m.container, /^Today's ten$|^Finish today's ten$|^Today's result$/)));
        return m;
      };
      const key = (k: string) => act(async () => { fireEvent.keyDown(window, { key: k }); });
      try {
        let m = await mount();
        try {
          await click(await waitFor(() => button(m.container, /^Start$/)));
          for (let k = 0; k < Math.abs(foul.right); k += 1) await key(foul.right > 0 ? 'ArrowRight' : 'ArrowLeft');
          for (let k = 0; k < Math.abs(foul.down); k += 1) await key(foul.down > 0 ? 'ArrowDown' : 'ArrowUp');
          clock = 1000 + foul.t * 1000;
          await withFullMotion(() => key(' '));
          if (findButton(m.container, /^Next$/)) throw new Error('the tackle landed before the refresh');
        } finally {
          m.unmount();
        }
        clock = 1000;
        m = await mount();
        try {
          for (let i = 1; i < DRILL_ROUNDS; i += 1) {
            await click(await waitFor(() => button(m.container, /^Start$|^Next one$/)));
            await click(await waitFor(() => button(m.container, /^Go in at the marker$/)));
            await click(await waitFor(() => button(m.container, /^Next$|^See the session$/)));
          }
          const line = Array.from(m.container.querySelectorAll('p')).map(p => (p.textContent ?? '').trim()).find(t => /points/.test(t) && /Session score/.test(t)) ?? '';
          expect(line, 'the session card counts the foul taken before the refresh').toMatch(/, 1 foul\./);
        } finally {
          m.unmount();
        }
      } finally {
        performance.now = realNow;
        restoreGlobals();
      }
      expect(DRILL_META.tackle.slug).toBe('career-drill-tackle');
    });
  });

  /* ------------------------------------------ Player Stock Market's reveal */

  describe('[market-roll] Player Stock Market: all eleven bought and refreshed mid reveal', () => {
    it('comes back rolling the same eleven from the first season, and records once', async () => {
      const seasonText = (m: MountedPage) => {
        const p = Array.from(m.container.querySelectorAll('p')).find(x => /^Season \d+ of \d+$/.test((x.textContent ?? '').trim()));
        return (p?.parentElement?.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
      };
      const stepButton = (m: MountedPage) => findButton(m.container, /^On to \d{4}$|^Turn the cards over$/);
      let api = await marketDriver.mount();
      let first = '';
      try {
        await marketDriver.enterDaily(api);
        const cards = () => Array.from(api.container.querySelectorAll('button')).filter(b => /age (\d+|\?)/.test(b.textContent ?? '') && !b.disabled);
        for (let buy = 0; buy < 11 && cards().length > 0; buy += 1) {
          await click(cards()[0]);
          await waitFor(() => { if (cards().length === 0 && !stepButton(api)) throw new Error('waiting for the next slot or the first season'); });
        }
        await waitFor(() => { if (!stepButton(api)) throw new Error('the years have not rolled'); });
        first = seasonText(api);
        expect(first).toMatch(/Season 1 of/);
        await click(stepButton(api)!);
      } finally {
        marketDriver.unmount(api);
      }
      api = await marketDriver.mount();
      try {
        await marketDriver.enterDaily(api);
        await waitFor(() => { if (!stepButton(api)) throw new Error('the bought eleven did not roll again'); });
        expect(seasonText(api), 'the same eleven roll from the first season').toBe(first);
        await marketDriver.finish(api);
        expect(resultCard(api.container)).not.toBeNull();
        expect(recordCompletion.mock.calls.map(c => c[0])).toEqual(['/player-stock-market']);
      } finally {
        marketDriver.unmount(api);
      }
    });
  });

  /* ---------------------------------------------- Sports Millionaire */

  /* The header toggle, never the result card's Play Unlimited. */
  const millionaireToggle = (m: MountedPage, to: 'daily' | 'unlimited') => button(m.container, to === 'daily' ? /^📅 Daily$/ : /^∞ Unlimited$/);
  const walkAway = (m: MountedPage) => click(button(m.container, /^Walk away with /));

  /* On this branch the page's recorder flag is `phase === 'done' && playMode
     === 'daily'`, so Unlimited records nothing and the Daily toggle is a
     transition whatever the phase does. Round 645 part one moves the mode out
     of that flag (into its ranked argument), and from then on a decided daily
     answer landed straight on the Unlimited result card is no transition and
     is never recorded. So the section asserts both: the outcome (the daily is
     handed on once and the day stays locked), which holds on either tree with
     the fix, and the cause (the board leaves the result card before the daily
     result lands), which is what the control takes out and what the outcome
     rests on once part one lands. */
  describe('[millionaire-new-finish] Sports Millionaire: a daily finish landed over a result card is left for, then recorded once', () => {
    it('a wrong daily answer left in its suspense, Unlimited walked away from, then Daily: the board leaves the card, and the daily records once', async () => {
      const q = buildFreshLadder(MILLIONAIRE_POOL, 'daily')[0];
      const wrong = (q.correctIndex + 1) % q.options.length;
      const wanted = String.fromCharCode(65 + wrong) + q.options[wrong];
      let m = await millionaireDriver.mount();
      let after = 0;
      try {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        try {
          const option = Array.from(m.container.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === wanted);
          if (!option) throw new Error(`no option button reads ${wanted}`);
          await click(option);
          await click(millionaireToggle(m, 'unlimited'));
          await act(async () => { vi.advanceTimersByTime(5000); });
        } finally {
          vi.useRealTimers();
        }
        expect(resultCard(m.container), 'the daily suspense did not land on the Unlimited ladder').toBeNull();
        await walkAway(m);
        expect(resultCard(m.container), 'the Unlimited result card is up').not.toBeNull();
        const before = finishes();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        try {
          await click(millionaireToggle(m, 'daily'));
          expect(resultCard(m.container), 'the board leaves the Unlimited result card before the daily result lands').toBeNull();
          await act(async () => { vi.advanceTimersByTime(50); });
        } finally {
          vi.useRealTimers();
        }
        await waitFor(() => { if (!resultCard(m.container)) throw new Error('the daily result has not landed'); });
        after = finishes();
        expect(after - before, 'the daily finish is handed on once').toBe(1);
        expect(recordCompletion.mock.calls.map(c => c[0]), 'and it is the one ranked finish').toEqual(['/sports-millionaire']);
      } finally {
        millionaireDriver.unmount(m);
      }
      m = await millionaireDriver.mount();
      try {
        expect(resultCard(m.container), 'the day stays locked').not.toBeNull();
        expect(finishes(), 'and records nothing more').toBe(after);
      } finally {
        millionaireDriver.unmount(m);
      }
    });
  });
});

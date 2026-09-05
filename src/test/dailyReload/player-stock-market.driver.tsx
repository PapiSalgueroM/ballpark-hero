/**
 * /player-stock-market, Round 458.
 *
 * The page restores a finished daily in a useState initializer (the whole
 * result is stored: score, holdings, the season by season values), so a
 * refresh lands on the result screen with nothing fetched and
 * useGameCompletion sees no transition. A fresh mount lands on the mode
 * menu; Daily market deals the day's XI from the tracked pool fixture.
 *
 * The fixtures are synthetic rows shaped like the two views the page reads
 * (player_market_tracked for the opening season, player_market_values_dedup
 * for the years after), invented names that ship nowhere. The opening
 * season is whatever today's seed picks, computed through the real
 * dailyCampaignSeed and startYearFor, because the engine keeps only rows of
 * that season. finish() buys the first affordable card in every slot, then
 * steps through the seasons to the reveal.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { setTableFixture } from './mocks';
import { getTodayET } from '@/lib/dateUtils';
import { dailyCampaignSeed, startYearFor } from '@/lib/playerStockMarket';
import PlayerStockMarket from '@/pages/PlayerStockMarket';

const RAW = ['Goalkeeper', 'Centre-Back', 'Left-Back', 'Right-Back', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward'];

function fixtures(startYear: number) {
  const finalYear = startYear + 3;
  let s = 12345;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pool: Record<string, unknown>[] = [];
  const histories: Record<string, unknown>[] = [];
  RAW.forEach((pos, p) => {
    for (let n = 0; n < 24; n += 1) {
      const name = `Fixture ${pos} ${p * 100 + n}`;
      const price = 2_000_000 + Math.floor(rng() * 50) * 1_000_000;
      let v = price;
      const series: [number, number][] = [];
      for (let y = startYear; y <= finalYear; y += 1) {
        if (y > startYear) v = Math.max(500_000, Math.round(v * (0.7 + rng() * 0.7)));
        series.push([y, v]);
      }
      pool.push({
        player_name: name, position: pos, age: 18 + Math.floor(rng() * 14),
        matches: p === 3 ? null : 10 + Math.floor(rng() * 40), goals: Math.floor(rng() * 15), assists: Math.floor(rng() * 10),
        yellow_cards: Math.floor(rng() * 8), red_cards: rng() < 0.1 ? 1 : 0,
        market_value_usd: price, year: startYear, final_year: finalYear, final_value_usd: series[series.length - 1][1],
      });
      series.forEach(([y, val], k) => {
        /* every fifth player has no row in the second season, the "no row" path */
        if (k === 1 && n % 5 === 0) return;
        histories.push({ player_name: name, year: y, market_value_usd: val, club: 'Fixture FC', nationality: 'Fixtureland' });
      });
    }
  });
  return { pool, histories };
}

const CARD = /age (\d+|\?)/;

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}
function cards(m: MountedPage): HTMLButtonElement[] {
  return Array.from(m.container.querySelectorAll('button')).filter(b => CARD.test(b.textContent ?? '') && !b.disabled);
}
function stepButton(m: MountedPage): HTMLButtonElement | null {
  return findButton(m.container, /^On to \d{4}$|^Turn the cards over$/);
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (cards(m).length > 0 || stepButton(m)) return 'playing';
  throw new Error('player-stock-market shows neither cards, a season step nor a result card (mode menu, boot or error state)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  if (resultCard(m)) return;
  await click(button(m.container, /^Daily market|^Today's market is closed/));
  await waitFor(() => {
    if (!resultCard(m) && cards(m).length === 0) throw new Error('the daily market has not dealt');
  });
}

async function finish(m: MountedPage): Promise<void> {
  for (let buy = 0; buy < 11 && cards(m).length > 0; buy += 1) {
    await click(cards(m)[0]);
    await waitFor(() => {
      if (cards(m).length === 0 && !stepButton(m)) throw new Error('waiting for the next slot or the first season');
    });
  }
  for (let step = 0; step < 12 && stepButton(m); step += 1) {
    await click(stepButton(m) as HTMLButtonElement);
  }
  if (!resultCard(m)) throw new Error('the seasons never reached the reveal');
}

function fingerprint(m: MountedPage): string {
  const card = resultCard(m);
  if (!card) return 'no result card';
  const copy = card.cloneNode(true) as Element;
  copy.querySelectorAll('button').forEach(b => b.remove());
  return (copy.textContent ?? '').trim();
}

export default defineDriver<MountedPage>({
  slug: 'player-stock-market',
  keyPrefix: 'player-stock-market-daily-',
  restoreStyle: 'initializer',

  async mount() {
    const year = startYearFor(dailyCampaignSeed(getTodayET()));
    const { pool, histories } = fixtures(year);
    setTableFixture('player_market_tracked', pool);
    setTableFixture('player_market_values_dedup', histories);
    const m = mountPage(<PlayerStockMarket />, '/player-stock-market');
    await waitFor(() => {
      if (!findButton(m.container, /^Daily market|^Today's market is closed/) && !resultCard(m)) throw new Error('neither the mode menu nor a result has come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,
  fingerprint,

  /* The result's own button leads to the mode menu, where the daily is
     closed and reopens the result. A live board at any point is played to
     the end, because that is the replay that would re-pay the score. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    const card = resultCard(m);
    const cta = card ? card.querySelector('button.bg-primary') : null;
    if (cta) await click(cta);
    await enterDaily(m);
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /new market|play again|replay|reset|redraw/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});

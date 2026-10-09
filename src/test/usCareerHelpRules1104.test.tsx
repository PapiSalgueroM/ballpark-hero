/**
 * Round 1104, the fix pass: the rules this round changed are on a screen.
 *
 * The round wrote them into the page's howToPlay steps, which render nowhere
 * while the game has a guide. They now reach the "?" through GameHelp's
 * extraRules. This file mounts the four REAL career pages, lets the first
 * visit guide open, and reads the dialog a person reads:
 *   1. NFL My Career shows the four lines (slot pay, the kicker's round, the
 *      16 game throwback, the bank), each exactly once.
 *   2. The NBA, MLB and NHL pages show the bank line once (one bank, four
 *      careers, so one line on four pages).
 *   3. The lines carry the engine's own numbers: what rookieDeal pays picks 1
 *      and 224, the round the kicker offset lands on, and the two season
 *      lengths with the year the ledger changes.
 * Mocks as in careerEntryGuide.test.tsx: nothing here reaches the network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

import NbaMyCareer from '@/pages/NbaMyCareer';
import NflMyCareer from '@/pages/NflMyCareer';
import MlbMyCareer from '@/pages/MlbMyCareer';
import NhlMyCareer from '@/pages/NhlMyCareer';
import { nflTruthHelpRules } from '@/lib/nflCareerHelpRules';
import { NFL_KICKER_PICK_OFFSET, nflSeasonLength } from '@/lib/nflMyCareer';
import { US_BANK_HELP_RULE } from '@/lib/usCareerBank';
import { rookieDeal } from '@/lib/usCareerRookieDeal';

const pages: Record<string, ComponentType> = { nba: NbaMyCareer, nfl: NflMyCareer, mlb: MlbMyCareer, nhl: NhlMyCareer };
const tick = (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const count = (text: string, needle: string) => text.split(needle).length - 1;

/** Mount the real page as a first visit and hand back the text of the guide that opens. */
async function helpText(slug: string): Promise<string> {
  const Page = pages[slug];
  render(<MemoryRouter initialEntries={[`/${slug}-my-career`]}><Page /></MemoryRouter>);
  let dialog: HTMLElement | null = null;
  for (let i = 0; i < 100 && !dialog; i += 1) {
    await tick(50);
    dialog = screen.queryByRole('dialog', { name: 'How to play' });
  }
  expect(dialog, `${slug}: the first visit guide opened`).not.toBeNull();
  return dialog!.textContent ?? '';
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Round 1104: the changed rules are on the "?" screen', () => {
  it('NFL My Career shows slot pay, the kicker rule, the 16 game throwback and the bank, once each', async () => {
    const text = await helpText('nfl');
    const rules = nflTruthHelpRules();
    expect(rules).toHaveLength(4);
    for (const rule of rules) expect(count(text, rule), `help: ${rule.slice(0, 50)}`).toBe(1);
  }, 120_000);

  it('the NBA, MLB and NHL pages show the bank line once', async () => {
    for (const slug of ['nba', 'mlb', 'nhl']) {
      const text = await helpText(slug);
      expect(count(text, US_BANK_HELP_RULE), `${slug}: the bank line`).toBe(1);
      cleanup();
      localStorage.clear();
    }
  }, 240_000);

  it('the lines carry the numbers the engine plays', () => {
    const [pay, kicker, schedule, bank] = nflTruthHelpRules();
    const first = rookieDeal('nfl', 'now', 1)!.salary;
    const last = rookieDeal('nfl', 'now', 224)!.salary;
    expect(pay).toContain(`the first pick makes $${first}M a year`);
    expect(pay).toContain(`the last pick about $${last}M`);
    expect(pay).toContain('signs for four years');
    expect(first).toBeGreaterThan(last);
    /* Round four is where the offset puts a kicker: pick 97 at the earliest, 32 picks a round. */
    expect(Math.ceil((NFL_KICKER_PICK_OFFSET + 1) / 32)).toBe(4);
    expect(kicker).toBe('In this game a kicker goes in round four or later.');
    expect(schedule).toContain(`Throwback seasons are ${nflSeasonLength(2005)} games`);
    expect(nflSeasonLength(2020)).toBe(nflSeasonLength(2005));
    expect(nflSeasonLength(2021)).not.toBe(nflSeasonLength(2020));
    expect(schedule).toContain('until 2021');
    expect(schedule).toContain(`From 2021 on a season is ${nflSeasonLength(2021)} games.`);
    expect(bank).toBe(US_BANK_HELP_RULE);
    expect(bank).toContain('savings first');
    expect(bank).toContain('sold at a bad price');
    /* No dash of either long kind in copy a player reads. */
    for (const line of [pay, kicker, schedule, bank]) expect(/[–—]/.test(line)).toBe(false);
  });
});

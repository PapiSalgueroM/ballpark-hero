/**
 * Round 796 review: the rival choice card in the four real My Career boards.
 *
 * scripts/simCareerInboxBeats.mjs proves the engine half (the roll, the
 * gate, every button honest to the number). This holds the half only a
 * render can see: a save with a choice pending opens on the card, a tap pays
 * exactly what the button printed and writes it to the save at once, the
 * card then shows what happened until Continue, and a save from before the
 * round (no choice fields at all) opens on the hub with no card from nowhere.
 */
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { ARCHETYPES, startCareer } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer } from '@/lib/nhlMyCareer';
import { NFL_RIVALRY_CHOICES } from '@/lib/nflCareerRivalryEvents';
import { NBA_RIVALRY_CHOICES } from '@/lib/nbaCareerRivalryEvents';
import { MLB_RIVALRY_CHOICES } from '@/lib/mlbCareerRivalryEvents';
import { NHL_RIVALRY_CHOICES } from '@/lib/nhlCareerRivalryEvents';
import { rivalryChoiceCard } from '@/lib/careerRivalryChoices';
import type { RivalryChoiceCard, RivalryChoiceDef } from '@/lib/careerRivalryChoices';

/** The fields of a saved career this test reads and writes. */
interface SavedCareer {
  name: string;
  pos: string;
  fanbase: number;
  karma?: number;
  rival?: { name: string; retired: boolean } | null;
  pendingRivalryChoice?: RivalryChoiceCard | null;
  rivalryChoicesSeen?: string[];
}

interface Case {
  label: string;
  saveKey: string;
  Board: ComponentType;
  make: () => SavedCareer;
  /** The sport's first table entry, the flare up after the whistle. */
  def: RivalryChoiceDef<never, never>;
}

const fixedRandom = () => 0.5;

const CASES: Case[] = [
  { label: 'NFL', saveKey: 'nfl-my-career-save-v1', Board: NflMyCareerBoard, def: NFL_RIVALRY_CHOICES[0] as unknown as RivalryChoiceDef<never, never>, make: () => startCareer('Choice NFL', 'QB', ARCHETYPES.QB[0], fixedRandom) as unknown as SavedCareer },
  { label: 'NBA', saveKey: 'nba-my-career-save-v1', Board: NbaMyCareerBoard, def: NBA_RIVALRY_CHOICES[0] as unknown as RivalryChoiceDef<never, never>, make: () => startNbaCareer('Choice NBA', 'PG', NBA_ARCHETYPES.PG[0], fixedRandom) as unknown as SavedCareer },
  { label: 'MLB', saveKey: 'mlb-my-career-save-v1', Board: MlbMyCareerBoard, def: MLB_RIVALRY_CHOICES[0] as unknown as RivalryChoiceDef<never, never>, make: () => startMlbCareer('Choice MLB', 'CF', MLB_ARCHETYPES.CF[0], fixedRandom) as unknown as SavedCareer },
  { label: 'NHL', saveKey: 'nhl-my-career-save-v1', Board: NhlMyCareerBoard, def: NHL_RIVALRY_CHOICES[0] as unknown as RivalryChoiceDef<never, never>, make: () => startNhlCareer('Choice NHL', 'C', NHL_ARCHETYPES.C[0], fixedRandom) as unknown as SavedCareer },
];

const store = (key: string, c: SavedCareer) =>
  localStorage.setItem(key, JSON.stringify({ c, phase: 'season', teamQuality: 80, coach: null }));
const saved = (key: string): SavedCareer => JSON.parse(localStorage.getItem(key) ?? '{}').c;
/** The hub's name chip, "<name> · <pos>", the tell that the board restored. */
const hubChip = (c: SavedCareer) => screen.findAllByText((_t, el) => el?.tagName === 'SPAN' && el.textContent === `${c.name} · ${c.pos}`);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the rival choice card in the My Career boards', () => {
  it.each(CASES)('$label: a pending choice opens on the card, pays what it printed, and Continue goes back to the hub', async ({ saveKey, Board, make, def }) => {
    const c = make();
    expect(c.rival, 'every American save drafts a rival on day one').toBeTruthy();
    c.fanbase = 50;
    c.karma = 50;
    const card = rivalryChoiceCard(def, c as never, c.rival as never);
    c.pendingRivalryChoice = card;
    c.rivalryChoicesSeen = [card.id];
    store(saveKey, c);

    render(<Board />);
    expect(await screen.findByText(card.title)).toBeInTheDocument();
    expect(card.description).toContain(c.rival!.name);
    /* The calm option, no gamble: it pays exactly its printed numbers. */
    const calm = def.choices.findIndex(o => !o.risk && (o.promise?.effect.fanbase ?? 0) > 0);
    expect(calm).toBeGreaterThanOrEqual(0);
    const promise = def.choices[calm].promise!.effect;
    const button = document.querySelector(`[data-rivalry-option="${calm}"]`);
    expect(button?.textContent).toContain(card.choices[calm].consequence);
    fireEvent.click(button!);

    /* Written to the save at the tap, before Continue. */
    const after = saved(saveKey);
    expect(after.pendingRivalryChoice ?? null).toBeNull();
    expect(after.fanbase).toBe(50 + (promise.fanbase ?? 0));
    expect(after.karma).toBe(50 + (promise.karma ?? 0));
    expect(await screen.findByText(`You chose: ${card.choices[calm].emoji} ${card.choices[calm].label}`)).toBeInTheDocument();
    /* A second tap has nothing to land on: the options are gone. */
    expect(document.querySelector('[data-rivalry-option]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByText(card.title)).toBeNull();
    expect((await hubChip(c)).length).toBeGreaterThan(0);
  });

  it.each(CASES)('$label: a save from before the round opens on the hub with no card from nowhere', async ({ saveKey, Board, make }) => {
    const c = make();
    delete c.pendingRivalryChoice;
    delete c.rivalryChoicesSeen;
    store(saveKey, c);
    expect(localStorage.getItem(saveKey)).not.toContain('rivalryChoice');

    render(<Board />);
    expect((await hubChip(c)).length).toBeGreaterThan(0);
    expect(document.querySelector('[data-rivalry-choice]')).toBeNull();
  });
});

/* Round 1220: draft night on the four real boards. A new file on purpose:
   src/test/usCareerProspect.test.tsx is the other lane's (Round 993) and
   scripts/simUsCareerProspect.mjs counts its cases exactly, so it gets no diff.
   What is held here: the night only plays in the mount that pressed "Draft
   day", it adds nothing to the save, nothing above the board gives the ending
   away while the rows arrive, and the career that starts is the pick and the
   club the closing row showed. */
import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { createUsCareerProspect, type UsCareerProspect } from '@/lib/usCareerProspect';
import {
  preDraftChoose, preDraftPlaySeason, preDraftProjection, preDraftProjectionLine, preDraftRunDraft, preDraftShowcase, preDraftStart,
} from '@/lib/careerPreDraft';
import { buildCareerDraftNight, careerNightResultLine } from '@/lib/careerDraftNight';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Prospect fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

interface SportCase { label: string; Board: ComponentType; sport: UsCareerSport }
const SPORTS: SportCase[] = [
  { label: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT },
  { label: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT },
  { label: 'MLB', Board: MlbMyCareerBoard, sport: MLB_CAREER_SPORT },
  { label: 'NHL', Board: NhlMyCareerBoard, sport: NHL_CAREER_SPORT },
];
type View = ReturnType<typeof render>;
type Save = { c: UsCareerCore | null; phase: string; teamQuality: number | null; coach: null; prospect?: UsCareerProspect };
const mount = (row: SportCase) => render(<StrictMode><row.Board /></StrictMode>);
const saved = (row: SportCase): Save => JSON.parse(localStorage.getItem(row.sport.saveKey)!);
const journey = (view: View) => view.container.querySelector<HTMLElement>('[data-prospect-journey]')!;
const buttons = (view: View) => within(journey(view));
const prospectSave = (p: UsCareerProspect): Save => ({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: p });

/** A prospect the real engine walked to the "Draft day" button. */
function atDraft(row: SportCase, seedId = 'night', rating?: number): UsCareerProspect {
  const sport = row.sport, pos = sport.create.defaultPos;
  const made = createUsCareerProspect(sport, { name: 'Simulated Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: defaultAppearance(), seed: `${sport.slug}:${seedId}` });
  const p = rating ? { ...made, rating, pot: Math.max(made.pot, rating) } : made;
  const desc = sport.preDraft(p.eraId);
  let state = preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 8 && state.phase !== 'showcase'; n++) state = state.phase === 'season' ? preDraftPlaySeason(desc, state) : preDraftChoose(desc, state, 0);
  return { ...p, state: preDraftShowcase(desc, state, 'steady') };
}
/** The night is a lazy chunk the journey asks for at the draft step. */
async function nightLoaded() {
  for (let n = 0; n < 3; n++) await act(async () => { await import('@/components/career/DraftNightSequence'); await Promise.resolve(); });
}
const srTitle = (view: View) => journey(view).querySelector('h3.sr-only');
const fileOf = (view: View) => journey(view).querySelector<HTMLElement>('[data-prospect-file]')!.textContent ?? '';
const nightOf = (view: View) => journey(view).querySelector<HTMLElement>('[data-career-night]');
const closingRow = (view: View) => nightOf(view)!.querySelector<HTMLElement>("[data-night-row='you'], [data-night-row='unpicked']")!;

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.4);
  vi.spyOn(Date, 'now').mockReturnValue(1790985600000);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('draft night on the actual boards', () => {
  it.each(SPORTS)('$label the night plays, holds its ending, lands, and starts the career it showed', async row => {
    const p = atDraft(row), desc = row.sport.preDraft(p.eraId);
    localStorage.setItem(row.sport.saveKey, JSON.stringify(prospectSave(p)));
    const view = mount(row);
    expect(journey(view)).toHaveAttribute('data-prospect-phase', 'draft');
    // Before the press: the range, from the arithmetic the draft is about to draw with.
    expect(buttons(view).getByTestId('draft-range')).toHaveTextContent(preDraftProjectionLine(preDraftProjection(desc, p.state!), 'have'));
    await nightLoaded();
    const done = { ...p, state: preDraftRunDraft(desc, p.state!) };
    const out = done.state.draft!;
    const fileBefore = fileOf(view);
    fireEvent.click(buttons(view).getByRole('button', { name: 'Draft day' }));
    // The save is the save it always was: the night adds no field.
    expect(saved(row)).toEqual(prospectSave(done));
    const night = nightOf(view)!;
    expect(night).not.toBeNull();
    expect(night).toHaveAttribute('data-night-stage', 'live');
    // Both ways off are live in the first frame, and there is one way on, not two.
    expect(buttons(view).getAllByRole('button', { name: 'Start your career' })).toHaveLength(1);
    expect(buttons(view).getByRole('button', { name: 'Start your career' })).toBeEnabled();
    expect(buttons(view).getByRole('button', { name: 'Skip to my pick' })).toBeEnabled();
    // Nothing above the board says how it ends: the words wait on the board's clock,
    // and the heading a screen reader lands on is neutral.
    const stage = journey(view).querySelector<HTMLElement>('[data-arrival]')!;
    expect(stage).toHaveAttribute('data-night-hold');
    expect(journey(view).style.getPropertyValue('--night-hold')).toMatch(/^\d+(\.\d+)?s$/);
    expect(srTitle(view)).toHaveTextContent('Draft night.');
    expect(document.activeElement).toBe(srTitle(view));
    // The file under the stage still reads as it did before the press: the age and the
    // rating after the minors would say how the night ends, and nothing in it goes blank.
    expect(fileOf(view)).toBe(fileBefore);
    if (desc.postDraft) expect(out.devSeasons.length).toBeGreaterThan(0);
    const result = buttons(view).getByTestId('draft-result');
    expect(result.className).toContain('cm-rise');
    expect(result.style.animationDelay).toBe(journey(view).style.getPropertyValue('--night-hold'));
    expect(within(result).queryByRole('button')).toBeNull();
    // A screen reader reads through opacity, so the ending is out of its tree as well until the row lands.
    const ending = () => [journey(view).querySelector('[data-arrival] h2')!, journey(view).querySelector('[data-arrival] h2 + p')!, buttons(view).getByTestId('draft-result'), closingRow(view)];
    for (const el of ending()) expect(el).toHaveAttribute('aria-hidden', 'true');
    // The closing row is the saved outcome, and the rows are the builder's.
    const built = buildCareerDraftNight(desc, done.state)!;
    expect([...night.querySelectorAll<HTMLElement>('[data-night-row]')].map(r => r.dataset.nightRow)).toEqual(built.board.map(r => r.kind));
    expect(closingRow(view)).toHaveTextContent(desc.teamLabel(out.team));
    expect(night.querySelectorAll('[data-lottery-slot]').length).toBe(desc.lottery ? desc.lottery.drawn : 0);
    expect(within(night).getByRole('status')).toBeEmptyDOMElement();
    // The row lands: the skip goes, the words are said, the save has not moved.
    fireEvent.animationEnd(closingRow(view));
    expect(nightOf(view)).toHaveAttribute('data-night-stage', 'landed');
    for (const el of ending()) expect(el).not.toHaveAttribute('aria-hidden');
    expect(buttons(view).queryByRole('button', { name: 'Skip to my pick' })).toBeNull();
    expect(srTitle(view)).toHaveTextContent(out.pick === null ? 'A different way in.' : 'This is your moment.');
    expect(within(nightOf(view)!).getByRole('status')).toHaveTextContent(careerNightResultLine(built.board[built.board.length - 1], desc.teamLabel));
    // Now the file moves on to the numbers the career starts with.
    expect(fileOf(view)).toContain(`${p.pos} · Age ${out.ageAfter}`);
    expect(fileOf(view)).toContain(`Rating${out.ratingAfter}`);
    expect(fileOf(view) !== fileBefore).toBe(out.devSeasons.length > 0);
    expect(saved(row)).toEqual(prospectSave(done));
    // And the career that starts is the pick and the club the row showed.
    fireEvent.click(buttons(view).getByRole('button', { name: 'Start your career' }));
    expect(saved(row).c).toMatchObject({ team: out.team, draftPick: out.pick ?? 0, ovr: out.ratingAfter, age: out.ageAfter, prospect: done.state });
    expect(journey(view)).toBeNull();
  });

  it.each(SPORTS)('$label skip lands the last frame, and a reload shows the result with no night', async row => {
    const p = atDraft(row, 'skip'), desc = row.sport.preDraft(p.eraId);
    localStorage.setItem(row.sport.saveKey, JSON.stringify(prospectSave(p)));
    let view = mount(row);
    await nightLoaded();
    fireEvent.click(buttons(view).getByRole('button', { name: 'Draft day' }));
    expect(nightOf(view)).toHaveAttribute('data-night-stage', 'live');
    fireEvent.click(buttons(view).getByRole('button', { name: 'Skip to my pick' }));
    expect(nightOf(view)).toHaveAttribute('data-night-stage', 'skipped');
    for (const r of nightOf(view)!.querySelectorAll<HTMLElement>('[data-night-row]')) expect(r.className).not.toMatch(/cm-(tick-in|slam|rise)/);
    // Nothing of the ending is kept from a screen reader once the skip has landed it.
    for (const el of [closingRow(view), buttons(view).getByTestId('draft-result'), journey(view).querySelector('[data-arrival] h2')!]) expect(el).not.toHaveAttribute('aria-hidden');
    expect(journey(view).querySelector('[data-night-hold]')).toBeNull();
    expect(journey(view).style.getPropertyValue('--night-hold')).toBe('');
    expect(buttons(view).getByTestId('draft-result').className).toBe('space-y-2');
    expect(srTitle(view)).not.toHaveTextContent('Draft night.');
    expect(buttons(view).getAllByRole('button', { name: 'Start your career' })).toHaveLength(1);
    // A reload at the result: the flag was never saved, so there is no night to replay.
    const bytes = localStorage.getItem(row.sport.saveKey);
    view.unmount(); view = mount(row);
    await nightLoaded();
    expect(journey(view)).toHaveAttribute('data-prospect-phase', 'done');
    expect(nightOf(view)).toBeNull();
    expect(journey(view).querySelector('[data-night-hold]')).toBeNull();
    const result = buttons(view).getByTestId('draft-result');
    expect(within(result).getByRole('button', { name: 'Start your career' })).toBeEnabled();
    expect(result).toHaveTextContent(desc.teamLabel(saved(row).prospect!.state!.draft!.team));
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
  });

  it.each(SPORTS)('$label with the chunk not here yet the press shows the result it always showed', row => {
    const p = atDraft(row, 'early');
    localStorage.setItem(row.sport.saveKey, JSON.stringify(prospectSave(p)));
    const view = mount(row);
    // Same tick as the mount: the import cannot have come back.
    fireEvent.click(buttons(view).getByRole('button', { name: 'Draft day' }));
    expect(journey(view)).toHaveAttribute('data-prospect-phase', 'done');
    expect(nightOf(view)).toBeNull();
    expect(journey(view).querySelector('[data-night-hold]')).toBeNull();
    expect(within(buttons(view).getByTestId('draft-result')).getByRole('button', { name: 'Start your career' })).toBeEnabled();
  });

  it.each(SPORTS)('$label less motion starts on the last frame and an undrafted night names no club early', async row => {
    const real = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...real(q), matches: /reduce/.test(q) })) as typeof window.matchMedia;
    try {
      // A low rated prospect, so the real draft passes him by on this seed or the next.
      let p: UsCareerProspect | undefined;
      for (let n = 0; n < 40 && !p; n++) {
        const made = atDraft(row, `undrafted-${n}`, 40);
        if (preDraftRunDraft(row.sport.preDraft(made.eraId), made.state!).draft!.pick === null) p = made;
      }
      expect(p, 'the real draft must pass a 40 rated prospect by').toBeTruthy();
      const desc = row.sport.preDraft(p!.eraId);
      localStorage.setItem(row.sport.saveKey, JSON.stringify(prospectSave(p!)));
      const view = mount(row);
      // The range already said this was possible.
      expect(buttons(view).getByTestId('draft-range')).toHaveTextContent('undrafted');
      await nightLoaded();
      fireEvent.click(buttons(view).getByRole('button', { name: 'Draft day' }));
      expect(nightOf(view)).toHaveAttribute('data-night-stage', 'skipped');
      expect(journey(view).querySelector('[data-night-hold]')).toBeNull();
      expect(closingRow(view)).toHaveAttribute('data-night-row', 'unpicked');
      expect(closingRow(view)).toHaveTextContent(desc.teamLabel(saved(row).prospect!.state!.draft!.team));
      expect(nightOf(view)!.querySelector('.cm-confetti')).toBeNull();
      expect(buttons(view).queryByRole('button', { name: 'Skip to my pick' })).toBeNull();
    } finally { window.matchMedia = real; }
  });
});

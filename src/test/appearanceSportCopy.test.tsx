import { useState } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import type { AppearanceSport } from '@/lib/careerAppearanceCopy';
import { ACCESSORIES, BOOTS, CELEBRATIONS, type PlayerAppearance } from '@/lib/soccerCareerAppearance';

const LOOK: PlayerAppearance = Object.freeze({
  skinTone: 'honey', hairstyle: 'braids', hairColor: 'purple', facialHair: 'goatee',
  celebration: 'knee_slide', boots: 'vortex_strike', accessory: 'chain',
});
const SPORTS = [
  { label: 'NFL', sport: 'nfl', gear: 'Cleats', pose: 'Sideline Salute' },
  { label: 'NBA', sport: 'nba', gear: 'Sneakers', pose: 'Crowd Point' },
  { label: 'MLB', sport: 'mlb', gear: 'Cleats', pose: 'Dugout Point' },
  { label: 'NHL', sport: 'nhl', gear: 'Skates', pose: 'Stick Raise' },
] as const;
const SOCCER_CONTEXT = /Every goal, you|corner flag|halfway line|away end|across the grass|nap on the grass|slide tackle|free kicks|Sunday League|Captain's Band|Scrum Cap|\bSnood\b/i;
type View = ReturnType<typeof render>;

function Editor({ sport, onEdit = () => undefined }: { sport?: AppearanceSport; onEdit?: (value: PlayerAppearance) => void }) {
  const [appearance, setAppearance] = useState(LOOK);
  return <>
    <AppearanceBuilder appearance={appearance} sport={sport} onChange={next => { onEdit(next); setAppearance(next); }} />
    <output data-testid="saved-appearance">{JSON.stringify(appearance)}</output>
  </>;
}
const editor = (view: View) => view.container.firstElementChild as HTMLElement;
const saved = (view: View): PlayerAppearance => JSON.parse(view.getByTestId('saved-appearance').textContent!);
const tab = (view: View, label: string) => fireEvent.click(within(editor(view)).getByRole('button', { name: new RegExp(`${label}$`) }));
function options(view: View, count: number) {
  const buttons = within(editor(view)).getAllByRole('button');
  // The existing six tabs and Surprise me precede the selectable saved options.
  expect(buttons).toHaveLength(7 + count);
  return buttons.slice(7);
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('sport copy on the actual appearance editor', () => {
  it('omitting sport retains every soccer label, flavor and goal line', () => {
    const view = render(<Editor />);
    expect(editor(view)).not.toHaveAttribute('data-career-appearance');
    expect(editor(view)).toHaveTextContent('Every goal, you tear off toward the corner flag and slide across the grass on your knees.');
    expect(editor(view)).not.toHaveTextContent('Signature pose:');
    tab(view, 'Boots');
    const boots = options(view, 18);
    expect(boots.map(button => button.textContent)).toEqual(BOOTS.map(boot => boot.label));
    BOOTS.forEach((boot, index) => {
      fireEvent.click(boots[index]);
      expect(editor(view)).toHaveTextContent(boot.flavor);
      expect(saved(view)).toEqual({ ...LOOK, boots: boot.id });
    });
    tab(view, 'Celebration');
    const celebrations = options(view, 19);
    CELEBRATIONS.forEach((pose, index) => {
      expect(celebrations[index]).toHaveTextContent(pose.label);
      fireEvent.click(celebrations[index]);
      expect(editor(view)).toHaveTextContent(`Every goal, you ${pose.line}.`);
      expect(saved(view)).toEqual({ ...LOOK, boots: BOOTS.at(-1)!.id, celebration: pose.id });
    });
    tab(view, 'Extras');
    expect(options(view, 16).map(button => button.textContent)).toEqual(ACCESSORIES.map(accessory => accessory.label));
  });

  it.each(SPORTS)('$label keeps every saved option while showing its own sport context', ({ sport, gear, pose }) => {
    const view = render(<Editor sport={sport} />);
    tab(view, gear);
    expect(editor(view)).toHaveAttribute('data-career-appearance', sport);
    expect(editor(view)).toHaveTextContent(pose);
    expect(editor(view)).toHaveTextContent('Signature pose:');
    expect(editor(view)).toHaveTextContent('Fictional gear and signature poses, just for your look.');
    expect(editor(view).textContent).not.toMatch(SOCCER_CONTEXT);
    const boots = options(view, 18);
    BOOTS.forEach((boot, index) => {
      expect(boots[index]).toHaveTextContent(boot.id === 'sunday_league' ? 'Weekend Classic' : boot.label);
      fireEvent.click(boots[index]);
      expect(within(editor(view)).getByText(new RegExp(`^${gear} in .+\\.$`))).toBeVisible();
      expect(editor(view).textContent).not.toMatch(SOCCER_CONTEXT);
      expect(saved(view)).toEqual({ ...LOOK, boots: boot.id });
    });
    tab(view, 'Celebration');
    const celebrations = options(view, 19);
    CELEBRATIONS.forEach((option, index) => {
      fireEvent.click(celebrations[index]);
      expect(editor(view).textContent).not.toMatch(SOCCER_CONTEXT);
      expect(editor(view)).toHaveTextContent('Signature pose:');
      expect(saved(view)).toEqual({ ...LOOK, boots: BOOTS.at(-1)!.id, celebration: option.id });
    });
    tab(view, 'Extras');
    const extras = options(view, 16);
    const renamed: Record<string, string> = { captain: 'Armband', cap: 'Soft Cap', snood: 'Neck Warmer' };
    ACCESSORIES.forEach((accessory, index) => {
      expect(extras[index]).toHaveTextContent(renamed[accessory.id] ?? accessory.label);
      fireEvent.click(extras[index]);
      expect(editor(view).textContent).not.toMatch(SOCCER_CONTEXT);
      expect(saved(view)).toEqual({ ...LOOK, boots: BOOTS.at(-1)!.id, celebration: CELEBRATIONS.at(-1)!.id, accessory: accessory.id });
    });
  }, 15000);

  it('changing tabs or sport preserves the selected saved appearance without a write', () => {
    const onEdit = vi.fn(), view = render(<Editor sport="nfl" onEdit={onEdit} />);
    tab(view, 'Cleats');
    fireEvent.click(within(editor(view)).getByRole('button', { name: 'Weekend Classic' }));
    tab(view, 'Celebration');
    fireEvent.click(within(editor(view)).getByRole('button', { name: /^✊\s*Fist Pump$/ }));
    const bytes = view.getByTestId('saved-appearance').textContent;
    expect(saved(view)).toEqual({ ...LOOK, boots: 'sunday_league', celebration: 'backflip' });
    expect(onEdit).toHaveBeenCalledTimes(2);
    for (const sport of ['nhl', 'nba', 'mlb', 'soccer'] as const) {
      view.rerender(<Editor sport={sport} onEdit={onEdit} />);
      for (const label of ['Skin', 'Hair', 'Beard', 'Extras', 'Celebration']) tab(view, label);
      expect(view.getByTestId('saved-appearance').textContent).toBe(bytes);
      expect(onEdit).toHaveBeenCalledTimes(2);
    }
    expect(editor(view)).toHaveTextContent('Every goal, you throw a full backflip that makes the physio cover their eyes.');
  });

  it.each(['soccer', 'nfl', 'nba', 'mlb', 'nhl'] as const)('%s Surprise me preserves the existing seven random draws and save values', sport => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.4), onEdit = vi.fn();
    const view = render(<Editor sport={sport} onEdit={onEdit} />);
    expect(random).not.toHaveBeenCalled();
    fireEvent.click(within(editor(view)).getByRole('button', { name: /Surprise me/ }));
    expect(random).toHaveBeenCalledTimes(7);
    const expected: PlayerAppearance = {
      skinTone: 'olive', hairstyle: 'mullet', hairColor: 'auburn', facialHair: 'chinstrap',
      celebration: 'binoculars', boots: 'pulse_venom', accessory: 'tape',
    };
    expect(saved(view)).toEqual(expected);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenLastCalledWith(expected);
  });
});

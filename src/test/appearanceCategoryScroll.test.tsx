import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { defaultAppearance, type PlayerAppearance } from '@/lib/soccerCareerAppearance';
import { careerAppearanceCopy, type AppearanceSport } from '@/lib/careerAppearanceCopy';

const sports = [
  { sport: 'soccer', gear: 'Boots', first: 'Knee Slide' },
  { sport: 'nfl', gear: 'Cleats', first: 'Sideline Salute' },
  { sport: 'nba', gear: 'Sneakers', first: 'Crowd Point' },
  { sport: 'mlb', gear: 'Cleats', first: 'Dugout Point' },
  { sport: 'nhl', gear: 'Skates', first: 'Stick Raise' },
] as const;
function Editor({ sport, onEdit }: { sport: AppearanceSport; onEdit: (next: PlayerAppearance) => void }) {
  const [look, setLook] = useState(defaultAppearance);
  return <><AppearanceBuilder sport={sport} appearance={look} onChange={next => { onEdit(next); setLook(next); }} />
    <output data-testid="appearance-state">{JSON.stringify(look)}</output></>;
}
type View = ReturnType<typeof render>;
const list = (view: View) => {
  const element = view.container.querySelector<HTMLDivElement>('.overflow-y-auto');
  expect(element, 'The actual appearance options scroller exists').not.toBeNull(); return element!;
};
const tab = (view: View, name: string) => fireEvent.click(view.getByRole('button', { name: new RegExp(`${name}$`) }));
const state = (view: View) => view.getByTestId('appearance-state').textContent;
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])));
let heldStores = '';
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('appearance-scroll-held-save', '{"career":"held"}'); sessionStorage.setItem('appearance-scroll-held-session', 'held');
  heldStores = stores(); vi.spyOn(Math, 'random');
});
afterEach(() => {
  cleanup(); expect(stores()).toBe(heldStores); expect(Math.random).not.toHaveBeenCalled(); vi.restoreAllMocks();
});

for (const spec of sports) {
  describe(`${spec.sport} appearance category scroll`, () => {
    it('starts a changed category at its first choices without changing the look', () => {
      const onEdit = vi.fn(), view = render(<Editor sport={spec.sport} onEdit={onEdit} />);
      tab(view, spec.gear);
      const before = state(view), svg = view.getByRole('img', { name: 'Player avatar' }).outerHTML;
      // This is a DOM scroll-state fixture. Physical overflow and visibility require the browser proof.
      list(view).scrollTop = 73; expect(list(view).scrollTop).toBe(73);
      tab(view, 'Celebration');
      expect(list(view).scrollTop, 'A changed appearance category must start at its first choices').toBe(0);
      expect(view.getByRole('button', { name: new RegExp(`${spec.first}$`) })).toBeInTheDocument();
      expect(state(view)).toBe(before); expect(onEdit).not.toHaveBeenCalled();
      expect(view.getByRole('img', { name: 'Player avatar' }).outerHTML).toBe(svg);
    });

    it('keeps the same category and scroll when its current category is clicked', () => {
      const onEdit = vi.fn(), view = render(<Editor sport={spec.sport} onEdit={onEdit} />);
      tab(view, spec.gear); const options = list(view), before = state(view);
      options.scrollTop = 73; expect(options.scrollTop).toBe(73);
      tab(view, spec.gear);
      expect(list(view)).toBe(options); expect(list(view).scrollTop).toBe(73);
      expect(state(view)).toBe(before); expect(onEdit).not.toHaveBeenCalled();
    });

    it('keeps the current options scroll when an option changes its saved field', () => {
      const onEdit = vi.fn(), view = render(<Editor sport={spec.sport} onEdit={onEdit} />);
      tab(view, spec.gear); const options = list(view), before: PlayerAppearance = JSON.parse(state(view)!);
      const gear = careerAppearanceCopy(spec.sport).boots.at(-1)!;
      const svg = view.getByRole('img', { name: 'Player avatar' }).outerHTML;
      options.scrollTop = 73; expect(options.scrollTop).toBe(73);
      fireEvent.click(view.getByRole('button', { name: gear.label }));
      expect(list(view)).toBe(options); expect(list(view).scrollTop).toBe(73);
      expect(JSON.parse(state(view)!)).toEqual({ ...before, boots: gear.id });
      expect(onEdit).toHaveBeenCalledExactlyOnceWith({ ...before, boots: gear.id });
      expect(view.getByRole('img', { name: 'Player avatar' }).outerHTML).toBe(svg);
    });
  });
}

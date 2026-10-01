import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DraftRoster } from '@/components/fantasy-draft/DraftRoster';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import motion from '@/components/fantasy-draft/DraftRosterMotion.module.css';

afterEach(cleanup);
const player = (id: string, position: string): DraftPlayer => ({
  id, name: `Generated Fixture ${id}`, position, nationality: 'Fixture', dominant_foot: 'Right', market_value_millions: 17.5,
});
const slots = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-draft-slot]')];

describe('committed draft pick feedback', () => {
  it('keeps both eleven-slot empty rosters quiet and the current-turn accents', () => {
    const view = render(<DraftRoster userTeam={[]} aiTeam={[]} currentTurn="user" />);
    expect(slots(view)).toHaveLength(22);
    expect(view.getAllByText('Empty slot')).toHaveLength(22);
    expect(view.getAllByText('0/11')).toHaveLength(2);
    expect(view.container.querySelectorAll('[data-draft-pick="latest"]')).toHaveLength(0);
    expect(view.getByText('Your XI').parentElement).toHaveClass('border-primary', 'text-primary');
    expect(view.getByText('AI XI').parentElement).toHaveClass('border-border', 'text-muted-foreground');
    expect(slots(view).every(slot => !slot.classList.contains(motion.pick))).toBe(true);
  });

  for (const side of ['user', 'ai'] as const) {
    it(`reveals only the committed ${side} pick and retains every slot and full name`, () => {
      const first = player('first', 'GK'), latest = player('latest', 'FWD');
      latest.name = 'Generated Fixture With A Very Long Full Name';
      const team = [first];
      const draw = (roster: DraftPlayer[], last: string | null) => <DraftRoster userTeam={side === 'user' ? roster : []} aiTeam={side === 'ai' ? roster : []} currentTurn="ai" lastPickId={last} />;
      const view = render(draw(team, null));
      const before = slots(view);
      const firstName = view.getByTitle(first.name);
      const original = JSON.stringify(team);
      view.rerender(draw([...team, latest], latest.id));
      const current = view.container.querySelector('[data-draft-pick="latest"]');
      expect(current).toHaveClass(motion.pick);
      expect(current).toHaveTextContent('FWD');
      expect(current).toHaveTextContent('£17.5M');
      expect(view.getByTitle(latest.name)).toHaveTextContent(latest.name);
      expect(view.container.querySelectorAll(`.${motion.pick}`)).toHaveLength(1);
      expect(slots(view)).toEqual(before);
      expect(view.getByTitle(first.name)).toBe(firstName);
      expect(JSON.stringify(team)).toBe(original);
      expect(view.getByText('2/11')).toBeInTheDocument();
      view.rerender(draw([first, { ...latest }], latest.id));
      expect(view.container.querySelector('[data-draft-pick="latest"]')).toBe(current);
      expect(view.getByTitle(latest.name).closest('[data-draft-slot]')).toBe(current);
      view.rerender(draw([first, latest], null));
      expect(view.container.querySelectorAll(`.${motion.pick}`)).toHaveLength(0);
      expect(slots(view)).toEqual(before);
    });
  }

  it('keeps eleven completed slots, exact positions and values without an unknown pick cue', () => {
    const team = Array.from({ length: 11 }, (_, i) => player(String(i), ['GK', 'DEF', 'MID', 'FWD'][i % 4]));
    const view = render(<DraftRoster userTeam={team} aiTeam={team.map(p => ({ ...p, id: `ai-${p.id}` }))} currentTurn="user" lastPickId="missing" />);
    expect(view.getAllByText('11/11')).toHaveLength(2);
    expect(view.getAllByText('£17.5M')).toHaveLength(22);
    expect(view.queryByText('Empty slot')).not.toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-draft-pick="latest"]')).toHaveLength(0);
    for (const p of team) expect(view.getAllByTitle(p.name)).toHaveLength(2);
  });
});

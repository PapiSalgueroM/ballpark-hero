/* Release AP: the Club Manager dressing room counts every broken promise (Round 1152), and the list under it
   says when it stops at five (added with the review of that round). Before 1152 the sentence itself stopped at
   five: with eight players short of the football they were promised it said five. No test rendered the sentence.

   The squads are real startCareer squads. A promise is broken by the engine's own rule (brokenPromises): a player
   whose last games were all spent off the pitch. The count the screen prints is read against that rule's count. */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { RolesScreen } from '@/components/club-manager/RolesScreen';
import { brokenPromises, startCareer, type CareerState } from '@/lib/clubManager';

const base = startCareer('Brentford');
/** A career in which exactly `n` players have not played any of their last six games, and nobody else has a record yet. */
function careerWith(n: number): CareerState {
  let left = n;
  const squad = base.squad.map(p => {
    const benched = { ...p, lastTen: [0, 0, 0, 0, 0, 0] };
    if (left > 0 && brokenPromises({ ...base, squad: [benched] }).length === 1) { left -= 1; return benched; }
    return { ...p, lastTen: [] as number[] };
  });
  return { ...base, squad };
}
const card = (root: HTMLElement) => [...root.querySelectorAll('div')].find(d => d.firstElementChild?.textContent === 'Needs a word') ?? null;

afterEach(cleanup);

describe('Club Manager: the dressing room and its broken promises', () => {
  it.each([8, 6])('counts all %i of them, lists five and says the list stopped short', n => {
    const career = careerWith(n);
    expect(brokenPromises(career)).toHaveLength(n);
    const { container } = render(<RolesScreen career={career} onSetRole={() => {}} />);
    expect(container.textContent).toContain(`${n} players are not getting what you told them they would.`);
    const list = card(container);
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('button')).toHaveLength(5);
    expect(list!.querySelector('[data-broken-more]')?.textContent).toBe(`Showing 5 of ${n}. The rest are in their role tiles below.`);
    /* the five shown are the five furthest from what they were promised, in the engine's order */
    const shown = [...list!.querySelectorAll('button')].map(b => b.querySelector('.truncate')?.textContent);
    expect(shown).toEqual(brokenPromises(career).slice(0, 5).map(p => p.name));
  });

  it.each([5, 3, 1])('lists all %i with no such line when the list is whole', n => {
    const career = careerWith(n);
    expect(brokenPromises(career)).toHaveLength(n);
    const { container } = render(<RolesScreen career={career} onSetRole={() => {}} />);
    expect(container.textContent).toContain(n === 1 ? '1 player is not getting what you told him' : `${n} players are not getting what you told them they would.`);
    const list = card(container);
    expect(list!.querySelectorAll('button')).toHaveLength(n);
    expect(container.querySelector('[data-broken-more]')).toBeNull();
  });

  it('shows no list at all when every promise is kept', () => {
    const career = careerWith(0);
    expect(brokenPromises(career)).toHaveLength(0);
    const { container } = render(<RolesScreen career={career} onSetRole={() => {}} />);
    expect(container.textContent).toContain('Everybody is getting roughly the football he was promised.');
    expect(card(container)).toBeNull();
    expect(container.querySelector('[data-broken-more]')).toBeNull();
  });
});

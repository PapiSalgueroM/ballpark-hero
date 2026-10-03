/**
 * Round 965: the created manager on the career panel, rendered for real.
 * His face (Soccer Career's SVG bust, dressed for the touchline) shows on the
 * card when he has one, a Round 303 manager without one still gets his card,
 * a Skip career gets a button to name its man, and the Edit sheet refuses a
 * real footballer's name before anything reaches the save. The engine side is
 * scripts/simManagerSpec.mjs and scripts/simManagerXp.mjs.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import ClubManagerCareerPanel from '@/components/club-manager/ClubManagerCareerPanel';
import { startCareer, editManager, defaultManagerLook, CM_ROSTERS } from '@/lib/clubManager';
import type { CareerState, ManagerEdit, ManagerSpec } from '@/lib/clubManager';

const SPEC: ManagerSpec = { name: 'Sam Calloway', nationality: 'Spain', background: 'analyst', style: 'gegenpress' };

function hooks(onEdit?: (e: ManagerEdit) => void) {
  return {
    resignNation: vi.fn(), acceptNation: vi.fn(), answerApproach: vi.fn(),
    applyJob: vi.fn(), joinNow: vi.fn(), joinSummer: vi.fn(),
    updateManager: vi.fn((e: ManagerEdit) => onEdit?.(e)),
  };
}

/* Each case builds a real career and the first rename check folds every real
   name the game knows, which is seconds on a busy machine, not milliseconds:
   measured 4.8 s for the Skip case alone on a loaded box, against the 5 s default. */
describe('the manager on the career panel', { timeout: 60000 }, () => {
  it('shows his face, his name and his background point', () => {
    const c = startCareer('Arsenal', undefined, undefined, { ...SPEC, appearance: { ...defaultManagerLook(), outfit: 'suit', ageBand: 'sixties' } });
    const { container } = render(<ClubManagerCareerPanel c={c} g={hooks()} nationOffer={null} />);
    const face = container.querySelector('[data-manager-card] [data-manager-face]');
    expect(face).not.toBeNull();
    /* The bust and the touchline overlay are both drawn. */
    expect(face!.querySelectorAll('svg').length).toBe(2);
    expect(face!.querySelectorAll('path').length).toBeGreaterThan(10);
    const card = container.querySelector('[data-manager-card]')!;
    expect(card.textContent).toContain('Sam Calloway');
    expect(card.textContent).toContain('60s');
    expect(card.textContent).toContain('+1 Recruitment from his background');
  });

  it('keeps a Round 303 manager with no face on his card', () => {
    const c = startCareer('Arsenal', undefined, undefined, SPEC);
    expect(c.manager && 'appearance' in c.manager).toBe(false);
    const { container } = render(<ClubManagerCareerPanel c={c} g={hooks()} nationOffer={null} />);
    expect(container.querySelector('[data-manager-card]')).not.toBeNull();
    expect(container.querySelector('[data-manager-face]')).toBeNull();
    expect(container.querySelector('[data-name-manager]')).toBeNull();
  });

  it('lets a Skip career name its manager, background point and all', () => {
    let career: CareerState = startCareer('Arsenal');
    const g = hooks(e => { career = editManager(career, e) ?? career; });
    const { container } = render(<ClubManagerCareerPanel c={career} g={g} nationOffer={null} />);
    expect(container.querySelector('[data-manager-card]')).toBeNull();
    fireEvent.click(container.querySelector('[data-name-manager]') as HTMLButtonElement);
    const sheet = document.querySelector('[data-edit-manager-sheet]');
    expect(sheet).not.toBeNull();
    fireEvent.change(document.getElementById('edit-manager-name') as HTMLInputElement, { target: { value: 'Robin Ashgrove' } });
    /* No background picked yet: refused on the sheet, nothing reaches the save. */
    fireEvent.click(screen.getByRole('button', { name: 'Name him' }));
    expect(g.updateManager).not.toHaveBeenCalled();
    expect(sheet!.textContent).toContain('Pick where he came from.');
    fireEvent.click(screen.getByRole('button', { name: /Boardroom/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Name him' }));
    expect(g.updateManager).toHaveBeenCalledTimes(1);
    expect(career.manager?.name).toBe('Robin Ashgrove');
    expect(career.manager?.background).toBe('boardroom');
    expect(career.managerXp?.points.finance).toBe(1);
  });

  it('refuses a real footballer on rename before it reaches the save', () => {
    const c = startCareer('Arsenal', undefined, undefined, SPEC);
    const g = hooks();
    const { container } = render(<ClubManagerCareerPanel c={c} g={g} nationOffer={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    const real = Object.values(CM_ROSTERS).flat()[0].n;
    fireEvent.change(document.getElementById('edit-manager-name') as HTMLInputElement, { target: { value: real } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(g.updateManager).not.toHaveBeenCalled();
    expect(document.querySelector('[data-edit-manager-sheet] .text-red-400')).not.toBeNull();
    /* And the background is shown as fixed, not offered. */
    expect(document.querySelector('[data-edit-manager-sheet]')!.textContent).toContain('fixed');
    expect(container).toBeTruthy();
  });

  /* Round 965 review: Save used to resend the homeland every time, so a
     Round 303 American who only changed his name came back as the engine's
     "USA" and his home job market stopped knowing him. */
  it('leaves the homeland alone when only the name changes', () => {
    let career: CareerState = startCareer('Inter Miami', undefined, undefined, { ...SPEC, nationality: 'United States' });
    const g = hooks(e => { career = editManager(career, e) ?? career; });
    render(<ClubManagerCareerPanel c={career} g={g} nationOffer={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    fireEvent.change(document.getElementById('edit-manager-name') as HTMLInputElement, { target: { value: 'Robin Ashgrove' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(g.updateManager).toHaveBeenCalledTimes(1);
    expect(g.updateManager.mock.calls[0][0].nationality).toBeUndefined();
    expect(career.manager?.name).toBe('Robin Ashgrove');
    expect(career.manager?.nationality).toBe('United States');
  });

  it('opens a Skip career at an MLS club on its own country', () => {
    let career: CareerState = startCareer('Inter Miami');
    const g = hooks(e => { career = editManager(career, e) ?? career; });
    const { container } = render(<ClubManagerCareerPanel c={career} g={g} nationOffer={null} />);
    fireEvent.click(container.querySelector('[data-name-manager]') as HTMLButtonElement);
    fireEvent.change(document.getElementById('edit-manager-name') as HTMLInputElement, { target: { value: 'Robin Ashgrove' } });
    fireEvent.click(screen.getByRole('button', { name: /Boardroom/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Name him' }));
    expect(career.manager?.nationality).toBe('United States');
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomClubSpec } from '@/lib/clubManager';

let engine: typeof import('@/lib/clubManager');
beforeEach(async () => { engine = await import('@/lib/clubManager'); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

const spec: CustomClubSpec = {
  name: 'Rowan Borough', stadium: 'Rowan Park', crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RB' },
  budgetTier: 'mid', leagueId: 'epl', replacedClub: 'Burnley', quality: 75,
};

describe('Club Manager founding squad editor', () => {
  it('keeps the same 24 IDs, ratings and primary roles, then saves the edited player', () => {
    const deck = engine.buildCustomSquad(spec);
    const edited = { ...spec, founders: { 4: { name: 'Rémi Tallfern', age: 20, secondary: 'RWB' as const } } };
    const founders = engine.buildCustomSquad(edited);
    expect(founders).toHaveLength(24);
    expect(founders[4]).toMatchObject({ id: deck[4].id, name: 'Rémi Tallfern', age: 20, position: 'RB', secondaryPositions: ['RWB'], generated: true });
    expect(founders[4].value).not.toBe(deck[4].value);
    expect(founders.filter((_, i) => i !== 4)).toEqual(deck.filter((_, i) => i !== 4));
    const state = engine.startCareer(edited.name, engine.DEFAULT_ERA_ID, edited);
    const saved = JSON.parse(JSON.stringify(engine.trimCareer(state)));
    expect(saved.squad.find((p: { id: string }) => p.id === deck[4].id)).toMatchObject(founders[4]);
    expect(saved.customClub.founders['4']).toEqual(edited.founders[4]);
    localStorage.setItem(engine.SAVE_KEY, JSON.stringify(saved));
    expect(engine.loadCareer()?.squad.find(p => p.id === deck[4].id)).toMatchObject(founders[4]);
  });

  it('holds duplicate names, real roster names, invalid ages and goalkeeper swaps to their defaults', () => {
    const deck = engine.buildCustomSquad(spec);
    const edited = engine.buildCustomSquad({ ...spec, founders: {
      0: { name: 'Mohamed Salah', age: 9, secondary: 'ST' },
      1: { name: deck[7].name, age: 250, secondary: 'GK' },
      2: { name: '<div>', age: 25.5 },
    } });
    expect(edited).toEqual(deck);
    expect(engine.customFounderNameTaken('mohamed salah')).toBe(true);
  });

  it('edits one chosen slot and resets another from the mounted setup form', async () => {
    const { CustomClubForm } = await import('@/components/club-manager/CustomClubForm');
    const create = vi.fn();
    render(<CustomClubForm leagueName="Premier League" leagueId={engine.leagueOf('Everton').id} onCreate={create} onBack={() => {}} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Club name' }), { target: { value: spec.name } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit starting squad' }));
    const picker = screen.getByRole('combobox', { name: 'Founding player' });
    expect(picker.querySelectorAll('option')).toHaveLength(24);
    fireEvent.change(picker, { target: { value: '4' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Player name' }), { target: { value: 'Rémi Tallfern' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Starting age' }), { target: { value: '20' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Secondary position' }), { target: { value: 'RWB' } });
    fireEvent.change(picker, { target: { value: '23' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Player name' }), { target: { value: 'Teo Groverbend' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset this player' }));
    fireEvent.click(screen.getByRole('button', { name: 'Found the club' }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ founders: { 4: { name: 'Rémi Tallfern', age: 20, secondary: 'RWB' } } }));
  });
});

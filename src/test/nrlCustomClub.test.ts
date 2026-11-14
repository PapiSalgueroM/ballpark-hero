import { describe, expect, it } from 'vitest';
import { createNrlCareer, createNrlCustomCareer, loadNrlOpeningMatchdayCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { nrlClubName } from '@/lib/nrlClubIdentity';
import { sameNrlCareer } from '@/lib/nrlSaveSlots';

const raw = JSON.stringify;
const name = 'River City Redbacks';
const spec = { name, ground: 'River City Oval', colour: 'teal' } as const;
const parse = (state: NonNullable<ReturnType<typeof createNrlCustomCareer>>) => readNrlCareerSave(raw(state));

describe('NRL fictional club identities', () => {
  it.each([[2026, 'broncos'], [2027, 'bears']] as const)('creates and reloads a custom club on the %s slot without changing the world', (year, slotId) => {
    const control = createNrlCareer(slotId, 1, year, true, true);
    const state = createNrlCustomCareer(slotId, 1, year, spec, true, true)!;
    expect(state?.customClub).toEqual({ ...spec, slotId });
    const { customClub, ...world } = state;
    expect(raw(world)).toBe(raw(control));
    expect(state.openingRoster).toBeUndefined();
    expect(nrlClubName(year, slotId, customClub)).toBe(name);
    expect(nrlClubName(year, 'storm', customClub)).toBe('Storm');
    expect(nrlClubName(year, 'storm', customClub, 'full')).toBe('Melbourne Storm');
    expect(raw(parse(state))).toBe(raw(state));
    expect(sameNrlCareer(state, control)).toBe(false);
    expect(sameNrlCareer(state, createNrlCustomCareer(slotId, 1, year, { ...spec, name: 'Northside Redbacks' })!)).toBe(false);
    const half = reduceNrlCareer(state, { type: 'startLive' });
    expect(raw(parse(half))).toBe(raw(half));
    const end = reduceNrlCareer(half, { type: 'finishLive', year, round: 1, tactic: 'balanced' });
    expect(end.season).toEqual(reduceNrlCareer(control, { type: 'advance' }).season);
    expect(end.customClub).toEqual(customClub);
  });

  it('keeps the fictional club in the saved competition after moving and records its original seasons', () => {
    let state = createNrlCustomCareer('broncos', 1, 2026, spec)!;
    while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
    const moved = reduceNrlCareer(state, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(moved.season.clubId).toBe('bears');
    expect(moved.history[0].clubId).toBe('broncos');
    expect(nrlClubName(2026, moved.history[0].clubId, moved.customClub)).toBe(name);
    expect(nrlClubName(2027, 'broncos', moved.customClub)).toBe(name);
    expect(sameNrlCareer(state, moved)).toBe(true);
    expect(raw(parse(moved))).toBe(raw(moved));
    expect(parse({ ...moved, customClub: { ...moved.customClub!, slotId: 'bears' } })).toBeNull();
  });

  it('rejects duplicate club names, unavailable slots, invalid saved identity and named real rosters', async () => {
    expect(createNrlCustomCareer('broncos', 1, 2026, { ...spec, name: 'Brisbane Broncos' })).toBeNull();
    expect(createNrlCustomCareer('broncos', 1, 2026, { ...spec, name: '  bRoNcOs ' })).toBeNull();
    expect(createNrlCustomCareer('bears', 1, 2026, spec)).toBeNull();
    expect(createNrlCustomCareer('broncos', 1, 2026, { ...spec, ground: '<iframe>' })).toBeNull();
    const state = createNrlCustomCareer('broncos', 1, 2026, spec)!;
    expect(readNrlCareerSave(raw({ ...state, customClub: { ...state.customClub, extra: 'unsanctioned' } }))).toBeNull();
    const real = await loadNrlOpeningMatchdayCareer('broncos', 1, false);
    expect(readNrlCareerSave(raw({ ...real, customClub: state.customClub }))).toBeNull();
  });
});

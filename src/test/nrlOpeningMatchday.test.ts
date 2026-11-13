import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { NRL_OPENING_MATCHDAY_2026 } from '@/data/nrlOpeningMatchday2026';
import {
  createNrlCareer, createNrlOpeningMatchdayCareer, loadNrlPerthSigningsCareer, nrlCareerCap, nrlCareerSquad, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, NRL_ROLES } from '@/lib/nrlManager';
import { nrlOriginEligibility } from '@/lib/nrlOrigin';
import { sameNrlCareer } from '@/lib/nrlSaveSlots';

const bytes = JSON.stringify;
const real = (id: number) => 'nrl-real-' + id;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });

describe('NRL 2026 opening matchday names', () => {
  it('seeds the verified 13 and six named bench players with simulated depth and legal contracts in all 17 clubs', () => {
    const { clubs } = nrlSeasonPlan(2026);
    expect(Object.keys(NRL_OPENING_MATCHDAY_2026).sort()).toEqual(clubs.map(club => club.id).sort());
    const ids = new Set<number>();
    const names = new Set<string>();
    for (const club of clubs) {
      const facts = NRL_OPENING_MATCHDAY_2026[club.id];
      expect(facts).toHaveLength(19);
      for (const [id, name, age, role] of facts) {
        expect(ids.has(id)).toBe(false);
        expect(names.has(name)).toBe(false);
        expect(age).toBeGreaterThanOrEqual(18);
        expect(age).toBeLessThanOrEqual(37);
        expect(NRL_ROLES).toContain(role);
        ids.add(id);
        names.add(name);
      }
      const career = createNrlOpeningMatchdayCareer(club.id, 16, NRL_OPENING_MATCHDAY_2026);
      expect(career.openingRoster).toBe('matchday-2026');
      const squad = nrlCareerSquad(career);
      expect(squad).toHaveLength(30);
      expect(squad.filter(player => player.id.startsWith('nrl-real-'))).toHaveLength(19);
      for (const [id, name, age, role] of facts) {
        const player = squad.find(player => player.id === real(id))!;
        expect([player.name, player.age, player.role]).toEqual([name, age, role]);
      }
      expect(NRL_ROLES.map(role => career.season.lineup[role])).toEqual(facts.slice(0, 13).map(([id]) => real(id)));
      expect(career.season.bench).toEqual(facts.slice(13).map(([id]) => real(id)));
      expect(career.players.filter(player => player.id.startsWith('nrl-real-'))).toHaveLength(323);
      expect(nrlCareerCap(career)).toMatchObject({ slots: 30, openSlots: 0 });
      expect(nrlCareerCap(career).available).toBeGreaterThan(0);
      expect(bytes(readNrlCareerSave(bytes(career)))).toBe(bytes(career));
    }
    expect(ids.size).toBe(323);
    expect(names.size).toBe(323);
  });

  it('retains a sourced player through a full season and a fictional Perth expansion', () => {
    const initial = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026, true);
    const walsh = initial.players.find(player => player.name === 'Reece Walsh')!;
    const pending = reduceNrlCareer(initial, { type: 'startLive' });
    expect(pending.season.live?.fixture).toEqual(nrlNextRound(initial.season).clubMatch);
    const restored = readNrlCareerSave(bytes(pending))!;
    expect(bytes(restored)).toBe(bytes(pending));
    let current = reduceNrlCareer(restored, { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced' });
    expect(bytes(current)).toBe(bytes(advance(initial)));
    while (current.season.phase !== 'complete') {
      current = advance(current);
      expect(readNrlCareerSave(bytes(current))).not.toBeNull();
    }
    const perth = reduceNrlCareer(current, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(perth.season.year).toBe(2027);
    expect(perth.season.clubId).toBe('bears');
    expect(perth.openingRoster).toBe('matchday-2026');
    expect(perth.season.squad.every(player => !player.id.startsWith('nrl-real-'))).toBe(true);
    expect(perth.players.find(player => player.id === walsh.id)?.age).toBe(walsh.age + 1);
    expect(sameNrlCareer(initial, perth)).toBe(true);
    expect(bytes(readNrlCareerSave(bytes(perth)))).toBe(bytes(perth));
    const freshPerth = createNrlCareer('bears', 16, 2027);
    expect(freshPerth).not.toHaveProperty('openingRoster');
    expect(freshPerth.players.every(player => !player.id.startsWith('nrl-real-'))).toBe(true);
  });

  it('separates checkpoint identity and rejects a named provenance marker on an imported/generated start', () => {
    const ordinary = createNrlCareer('broncos', 16);
    const named = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026);
    expect(sameNrlCareer(ordinary, named)).toBe(false);
    const legacy = readNrlCareerSave(bytes(createNrlSeason('broncos', 16)))!;
    const freshPerth = createNrlCareer('bears', 16, 2027);
    for (const state of [legacy, freshPerth, ordinary]) {
      expect(readNrlCareerSave(bytes({ ...state, openingRoster: 'matchday-2026' }))).toBeNull();
    }
    const { openingRoster, ...withoutMarker } = named;
    expect(readNrlCareerSave(bytes(withoutMarker))).toBeNull();
  });
});

describe('NRL 2027 Perth confirmed signings', () => {
  it('starts Perth with the sourced names and roles, generated depth and legal caps', async () => {
    const career = await loadNrlPerthSigningsCareer(16, true);
    expect(career).toMatchObject({ openingYear: 2027, openingRoster: 'perth-signings-2027', boardChallenge: true });
    const squad = nrlCareerSquad(career);
    expect(squad).toHaveLength(30);
    const named = career.players.filter(player => player.id.startsWith('nrl-real-'));
    expect(named).toHaveLength(27);
    expect(named.every(player => player.contract?.clubId === 'bears')).toBe(true);
    expect(new Set(career.players.map(player => player.name)).size).toBe(career.players.length);
    expect(new Set(career.players.map(player => player.id)).size).toBe(career.players.length);
    expect(squad).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Toby Sexton', role: 'Halfback' }),
      expect.objectContaining({ name: 'Mikolaj Oledzki', role: 'Prop 10' }),
      expect.objectContaining({ name: 'Nick Meaney', id: real(505537), role: 'Fullback' }),
      expect.objectContaining({ name: 'Gehamat Shibasaki', id: real(504371), role: 'Left Wing' }),
    ]));
    const sexton = squad.find(player => player.name === 'Toby Sexton')!;
    expect(nrlOriginEligibility(sexton.id)).toBeNull();
    expect(nrlOriginEligibility(real(504371))).toBe('qld');
    for (const role of NRL_ROLES) {
      expect(squad.find(player => player.id === career.season.lineup[role])?.role).toBe(role);
    }
    const selected = [...Object.values(career.season.lineup), ...career.season.bench!];
    expect(new Set(selected).size).toBe(19);
    expect(nrlCareerCap(career)).toMatchObject({ slots: 30, openSlots: 0 });
    expect(nrlCareerCap(career).available).toBeGreaterThan(0);
    expect(bytes(readNrlCareerSave(bytes(career)))).toBe(bytes(career));
    expect(bytes(readNrlCareerSave(bytes(advance(career))))).toBe(bytes(advance(career)));

    const generated = createNrlCareer('bears', 16, 2027, true);
    expect(sameNrlCareer(career, generated)).toBe(false);
    expect(readNrlCareerSave(bytes({ ...generated, openingRoster: 'perth-signings-2027' }))).toBeNull();
    expect(readNrlCareerSave(bytes({ ...career, openingRoster: undefined }))).toBeNull();
    let current = career;
    while (current.season.phase !== 'complete') current = advance(current);
    const moved = reduceNrlCareer(current, { type: 'startNextSeason', move: { fromYear: 2027, clubId: 'chiefs' } });
    expect(moved.season).toMatchObject({ year: 2028, clubId: 'chiefs' });
    expect(moved.openingRoster).toBe('perth-signings-2027');
    expect(sameNrlCareer(career, moved)).toBe(true);
    expect(bytes(readNrlCareerSave(bytes(moved)))).toBe(bytes(moved));
  });
});

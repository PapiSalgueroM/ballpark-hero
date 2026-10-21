import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCareerPanel from '@/components/us-career/CoachCareerPanel';
import * as Coach from '@/lib/usCoachCareer';
import { coachStanding, bestCoachTierAvailable, coachingVacancies, usTeamsFor } from '@/lib/usCareerToCoach';
import type { CoachCareerState } from '@/lib/usCoachCareer';
import type { UsCareerLike, UsSport } from '@/lib/usCareerToCoach';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Envelope = { c: Record<string, unknown>; phase: string; teamQuality: number; coach: CoachCareerState | null };
type Fixtures = { fresh: Envelope; freshCoach: CoachCareerState; stranded: Envelope; done: Envelope; nonNfl: Record<string, Envelope> };
let fixtures: Fixtures;
let offered: CoachCareerState;

function lowCareer(sport: UsSport): Record<string, unknown> {
  const catalogue = JSON.parse(fs.readFileSync(path.resolve('scripts/data/usBoardFixture.json'), 'utf8'));
  const saved = JSON.parse(catalogue.sports[sport].saves.coach) as Envelope;
  const c = clone(saved.c);
  const seasons = c.seasons as Record<string, unknown>[];
  const row = clone(seasons[0]);
  for (const key of Object.keys(row)) if (typeof row[key] === 'number') row[key] = 0;
  Object.assign(row, { year: 2039, team: c.team, ovr: 62, games: sport === 'nfl' ? 17 : sport === 'mlb' ? 162 : 82, awards: [], teamResult: 'Missed playoffs' });
  Object.assign(c, { name: 'Fictional Staff Applicant', year: 2040, age: 25, ovr: 62, retired: true, seasons: [row], rings: 0, cups: 0, mvps: 0, mvpCys: 0, harts: 0, allPros: 0, allNbas: 0, allStars: 0, finalsMvps: 0, connSmythes: 0 });
  return c;
}

beforeAll(() => {
  const c = lowCareer('nfl');
  const freshCoach = Coach.startCoachCareer('nfl', c as unknown as UsCareerLike, 2040, () => 0.5);
  let stranded = clone(freshCoach);
  for (let n = 0; n < 3; n++) stranded = Coach.sitOutCoachSeason(stranded, () => 0.5).state;
  const nonNfl: Record<string, Envelope> = {};
  for (const sport of ['nba', 'mlb', 'nhl'] as const) {
    const player = lowCareer(sport);
    const co = Coach.startCoachCareer(sport, player as unknown as UsCareerLike, 2040, () => 0.5);
    nonNfl[sport] = { c: player, phase: 'coach', teamQuality: 0.5, coach: co };
  }
  fixtures = {
    fresh: { c, phase: 'retired', teamQuality: 0.5, coach: null },
    freshCoach,
    stranded: { c: clone(c), phase: 'coach', teamQuality: 0.5, coach: stranded },
    done: { c: clone(c), phase: 'coach', teamQuality: 0.5, coach: { ...clone(stranded), done: true } },
    nonNfl,
  };
  offered = Coach.startCoachCareer('nfl', { ...c, ovr: 100, rings: 5, mvps: 3, allPros: 5 } as unknown as UsCareerLike, 2040, () => 0.5);
  expect(freshCoach.offers).toEqual([]);
  expect(freshCoach.profile.playingRep).toBeGreaterThanOrEqual(0);
  expect(freshCoach.profile.playingRep).toBeLessThan(5);
  expect(coachStanding(stranded.profile)).toBe(0);
  expect(stranded.offers).toEqual([]);
  expect(offered.offers.length).toBeGreaterThan(0);
  if (process.env.NFL_COACH_FIXTURE_OUT) fs.writeFileSync(process.env.NFL_COACH_FIXTURE_OUT, JSON.stringify(fixtures, null, 2) + '\n', { flag: 'wx' });
});

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function mounted(initial: CoachCareerState) {
  const changed = vi.fn();
  function LivePanel() {
    const [state, setState] = useState(initial);
    return <CoachCareerPanel state={state} playerName="Fictional Staff Applicant" feed={[]}
      onBack={() => undefined} onChange={(next, notes) => { changed(next, notes); setState(next); }} />;
  }
  return { ...render(<LivePanel />), changed };
}
const recovery = (view: ReturnType<typeof mounted>) => view.queryByRole('button', { name: 'Take a staff role' });
function sameEmployment(input: CoachCareerState, next: CoachCareerState) {
  expect(next.job?.tier).toBe(4);
  expect(next.job?.seasonsHere).toBe(0);
  expect(usTeamsFor('nfl')).toContain(next.job?.team);
  const openings = coachingVacancies('nfl', () => 0.5).filter(opening => opening.tier === 4);
  expect(openings.some(opening => opening.team === next.job?.team && opening.role === next.job?.role)).toBe(true);
  expect(next.unemployed).toBe(false);
  expect(next.offers).toEqual([]);
  expect(next.offerNote).toBe('');
  expect(next.profile).toEqual({ ...input.profile, seasonsOut: 0 });
  expect({ ...next, job: input.job, unemployed: input.unemployed, offers: input.offers, offerNote: input.offerNote, profile: input.profile }).toEqual(input);
}
function exerciseGuards(active: CoachCareerState, employed: CoachCareerState) {
  const action = (Coach as unknown as { takeNflStaffRole: (state: CoachCareerState, rng?: () => number) => CoachCareerState }).takeNflStaffRole;
  expect(typeof action).toBe('function');
  const guarded = [
    { ...clone(active), done: true }, employed, offered,
    { ...clone(active), unemployed: false },
    ...Object.values(fixtures.nonNfl).map(value => value.coach!),
  ];
  for (const state of guarded) {
    const held = clone(state), random = vi.fn(() => { throw new Error('A guarded recovery must not draw randomness'); });
    expect(action(state, random)).toBe(state);
    expect(state).toEqual(held);
    expect(random).not.toHaveBeenCalled();
  }
}

describe('actual NFL empty coaching market recovery', () => {
  it('fresh NFL retiree can take a staff role without skipping a season', () => {
    const state = clone(fixtures.freshCoach), held = clone(state), view = mounted(state);
    expect(state.offers).toEqual([]); expect(state.unemployed).toBe(true); expect(state.done).toBe(false);
    console.info('NFL_STAFF_ORIGINAL', JSON.stringify({ kind: 'fresh', year: state.year, standing: coachStanding(state.profile), offers: state.offers.length, body: view.container.textContent }));
    const button = recovery(view);
    expect(button, 'Fresh NFL Take a staff role is missing from the actual empty-market panel').not.toBeNull();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(button!);
    expect(view.changed).toHaveBeenCalledTimes(1);
    const next = view.changed.mock.calls[0][0] as CoachCareerState;
    sameEmployment(held, next); expect(state).toEqual(held);
    expect(recovery(view)).toBeNull();
    expect(view.getByRole('button', { name: 'Coach the 2040 season' })).toBeVisible();
    exerciseGuards(held, next);
  });

  it('JSON-restored stranded NFL coach can take staff work and keep the record', () => {
    const state = Coach.ensureCoachCareer(clone(fixtures.stranded.coach), 'nfl')!, held = clone(state), view = mounted(state);
    expect(state.results).toHaveLength(3); expect(coachStanding(state.profile)).toBe(0);
    expect(bestCoachTierAvailable(state.profile)).toBeNull(); expect(state.offers).toEqual([]);
    console.info('NFL_STAFF_ORIGINAL', JSON.stringify({ kind: 'stranded', year: state.year, standing: coachStanding(state.profile), offers: state.offers.length, body: view.container.textContent }));
    const button = recovery(view);
    expect(button, 'Stranded NFL Take a staff role is missing from the actual empty-market panel').not.toBeNull();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(button!); expect(view.changed).toHaveBeenCalledTimes(1);
    const next = view.changed.mock.calls[0][0] as CoachCareerState;
    sameEmployment(held, next); expect(state).toEqual(held);
    expect(Coach.ensureCoachCareer(clone(next), 'nfl')).toEqual(next);
    fireEvent.click(view.getByRole('button', { name: 'Coach the 2043 season' }));
    expect(view.changed).toHaveBeenCalledTimes(2);
    const played = view.changed.mock.calls[1][0] as CoachCareerState;
    expect(played).toEqual(Coach.playCoachSeason(next, () => 0.5).state);
    expect(played.year).toBe(2044); expect(played.results.slice(0, 3)).toEqual(held.results);
    expect(played.profile.ringsAsCoach).toBe(next.profile.ringsAsCoach);
  });

  it('unused recovery preserves the original empty market and idle decline', () => {
    const fresh = clone(fixtures.freshCoach), held = clone(fresh);
    expect(fresh.offers).toEqual([]); expect(fresh.profile.seasonsOut).toBe(0);
    let state = fresh;
    for (let n = 0; n < 3; n++) state = Coach.sitOutCoachSeason(state, () => 0.5).state;
    expect(state).toEqual(fixtures.stranded.coach); expect(fresh).toEqual(held);
    expect(state.year).toBe(2043); expect(state.profile.seasonsOut).toBe(3);
    expect(state.profile.seasonsSinceRetired).toBe(3); expect(coachStanding(state.profile)).toBe(0);
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      const copy = clone(state); Coach.refreshCoachOffers(copy, () => value); expect(copy.offers).toEqual([]);
    }
  });

  it('completed NFL coach keeps recovery and progression unavailable', () => {
    const state = clone(fixtures.done.coach!), held = clone(state), view = mounted(state);
    expect(recovery(view)).toBeNull();
    expect(view.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /^Sit out the/ })).toBeNull();
    const random = vi.fn(() => { throw new Error('Completed coaching must stay quiet'); });
    expect(Coach.playCoachSeason(state, random)).toEqual({ state, notes: [] });
    expect(Coach.sitOutCoachSeason(state, random)).toEqual({ state, notes: [] });
    expect(Coach.acceptCoachOffer(state, 0)).toBe(state);
    Coach.refreshCoachOffers(state, random); expect(random).not.toHaveBeenCalled(); expect(state).toEqual(held);
  });

  it('employed NFL coach keeps recovery unavailable and the ordinary season intact', () => {
    const state = Coach.acceptCoachOffer(clone(offered), 0), held = clone(state), view = mounted(state);
    expect(recovery(view)).toBeNull(); vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(view.getByRole('button', { name: 'Coach the 2040 season' }));
    expect(view.changed).toHaveBeenCalledTimes(1);
    expect(view.changed.mock.calls[0][0]).toEqual(Coach.playCoachSeason(held, () => 0.5).state);
    expect(state).toEqual(held);
  });

  it('earned NFL offers stay available without a staff shortcut', () => {
    const state = clone(offered), held = clone(state), view = mounted(state), offer = state.offers[0];
    expect(recovery(view)).toBeNull();
    const button = view.getByRole('button', { name: new RegExp(offer.team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    fireEvent.click(button); expect(view.changed).toHaveBeenCalledTimes(1);
    expect(view.changed.mock.calls[0][0]).toEqual(Coach.acceptCoachOffer(held, 0)); expect(state).toEqual(held);
  });

  it.each(['nba', 'mlb', 'nhl'] as const)('%s empty coaching keeps the existing sit-out path', sport => {
    const state = clone(fixtures.nonNfl[sport].coach!), held = clone(state), view = mounted(state);
    expect(state.offers).toEqual([]); expect(recovery(view)).toBeNull();
    expect(view.getByText('It gets harder every year you wait. That is the point.')).toBeVisible();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(view.getByRole('button', { name: 'Sit out the 2040 season' }));
    expect(view.changed).toHaveBeenCalledTimes(1);
    expect(view.changed.mock.calls[0][0]).toEqual(Coach.sitOutCoachSeason(held, () => 0.5).state); expect(state).toEqual(held);
  });
});

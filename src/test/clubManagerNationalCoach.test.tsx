import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { projectedWorldFor } from '@/lib/clubManagerEras';
import type { ComponentProps } from 'react';
import * as CM from '@/lib/clubManager';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import ClubManagerCareerPanel from '@/components/club-manager/ClubManagerCareerPanel';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

interface Candidate {
  key: string; name: string; position: CMPlayer['position']; rating: number; age: number;
  nation: string; source: 'modeled' | 'owned' | 'loan' | 'released'; employer: string | null;
}
interface Fixture { id: string; home: string; away: string; round: string; }
interface Played extends Fixture {
  homeGoals: number; awayGoals: number; pens: boolean; winner: string | null; xiStrength: number;
}
interface Campaign {
  version: 1; nation: string; year: number; eraId: string; revision: number;
  squadKeys: string[]; xiKeys: string[]; formationIndex: number;
  next: Fixture | null; results: Played[]; complete: boolean; settled: boolean;
  result: string | null; rngState: number;
}
interface View {
  year: number; nation: string; players: Candidate[]; unknown: number; campaign: Campaign | null;
}
interface Api {
  nationalCoachView(c: CareerState): View | null;
  beginNationalCampaign(c: CareerState): CareerState;
  setNationalSquad(c: CareerState, keys: string[], revision: number): CareerState;
  setNationalXi(c: CareerState, formationIndex: number, keys: string[], revision: number): CareerState;
  playNationalFixture(c: CareerState, fixtureId: string, revision: number): CareerState;
}
function api(): Api {
  const candidate = CM as unknown as Partial<Api>;
  expect(typeof candidate.nationalCoachView, 'CM_NATIONAL_API: current-year coaching view').toBe('function');
  expect(typeof candidate.beginNationalCampaign, 'CM_NATIONAL_API: saved campaign').toBe('function');
  return candidate as Api;
}
function career(): CareerState {
  const base = CM.startCareer('Arsenal');
  const slots = CM.FORMATIONS[0].slots;
  const players = Array.from({ length: 14 }, (_, i): CMPlayer => ({
    ...base.squad[0], id: 'national-fixture-' + i, name: 'Fictional Callup ' + i,
    position: slots[i % 11].allowed[0], age: 22 + i % 4, rating: 78 + i % 5,
    generated: true, isYouth: false, academyGrad: true, nation: 'England',
    injuryWeeks: 0, suspendedMatches: 0, worldRosterKey: undefined, secondaryPositions: [],
  }));
  return { ...base, startYear: 2030, season: 1, worldSeed: 31, squad: players, xiIds: players.slice(0, 11).map(p => p.id),
    loanedOut: [], freeAgents: [], goneNames: [], retiredNames: [], worldRoster: undefined,
    nationJob: { nation: 'England', since: 1, played: 0, won: 0, lastResult: null, lastYear: null } };
}
function campaign(c: CareerState): Campaign {
  const value = api().nationalCoachView(c)?.campaign;
  expect(value, 'CM_NATIONAL_CAMPAIGN: saved block exists').not.toBeNull();
  return value!;
}
function prepared(c = career()): CareerState {
  const a = api();
  let next = a.beginNationalCampaign(c);
  const pool = a.nationalCoachView(next)!;
  const selected = c.squad.map(p => pool.players.find(row => row.name === p.name));
  expect(selected.every(Boolean), 'CM_NATIONAL_FIXTURE: actual owned fictional pool').toBe(true);
  next = a.setNationalSquad(next, selected.map(p => p!.key), campaign(next).revision);
  return a.setNationalXi(next, 0, selected.slice(0, 11).map(p => p!.key), campaign(next).revision);
}
function clubOnly(c: CareerState): string {
  const copy = { ...c } as Record<string, unknown>;
  delete copy.nationJob; delete copy.aiHeadlines; delete copy.trophies;
  return JSON.stringify(copy);
}
function panel(c: CareerState, open = vi.fn()) {
  const g = { resignNation: vi.fn(), acceptNation: vi.fn(), answerApproach: vi.fn(),
    applyJob: vi.fn(), joinNow: vi.fn(), joinSummer: vi.fn(), updateManager: vi.fn(),
    openNationalCoach: open } as unknown as ComponentProps<typeof ClubManagerCareerPanel>['g'];
  return render(<ClubManagerCareerPanel c={c} g={g} nationOffer={null} />);
}
function interactivePanel(start: CareerState): () => CareerState {
  const a = api(); let latest = start;
  function Harness() {
    const [c, setC] = useState(start); latest = c;
    const g = { resignNation: () => setC(prev => CM.leaveNationJob(prev)), acceptNation: vi.fn(),
      answerApproach: vi.fn(), applyJob: vi.fn(), joinNow: vi.fn(), joinSummer: vi.fn(), updateManager: vi.fn(),
      openNationalCoach: () => setC(prev => a.beginNationalCampaign(prev)),
      chooseNationalSquad: (keys: string[], revision: number) => setC(prev => a.setNationalSquad(prev, keys, revision)),
      chooseNationalXi: (formationIndex: number, keys: string[], revision: number) => setC(prev => a.setNationalXi(prev, formationIndex, keys, revision)),
      playNationalNext: (id: string, revision: number) => setC(prev => a.playNationalFixture(prev, id, revision)),
    } as unknown as ComponentProps<typeof ClubManagerCareerPanel>['g'];
    return <ClubManagerCareerPanel c={c} g={g} nationOffer={null} />;
  }
  render(<Harness />); return () => latest;
}

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0.6); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager national coach foundation', () => {
  it('keeps the existing national job and step down control visible', () => {
    panel(career());
    expect(screen.getByText(/England manager/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Step down from the national team' })).toBeDefined();
  });
  it('offers a playable current-year national team from the existing career tile', () => {
    const open = vi.fn(); panel(career(), open);
    const controls = screen.queryAllByRole('button', { name: 'Manage national team' });
    expect(controls.length, 'CM_NATIONAL_COACH_ENTRY: playable national team control').toBe(1);
    fireEvent.click(controls[0]); expect(open).toHaveBeenCalledOnce();
  });
});

describe('Club Manager current-year national campaign', () => {
  it('reads the actual calendar year and excludes unknown or untracked nationality', () => {
    const a = api(), c = career();
    c.squad[12] = { ...c.squad[12], name: 'Fictional Unknown Nation', nation: undefined };
    c.squad[13] = { ...c.squad[13], name: 'Fictional Foreign Nation', nation: 'France' };
    const world = JSON.stringify(projectedWorldFor('now', CM.yearsOn(c), c.worldSeed));
    const before = JSON.stringify(c), random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('UNOWNED_DRAW'); });
    const view = a.nationalCoachView(c)!;
    expect(view.year, 'CM_NATIONAL_WORLD_YEAR: never the season index').toBe(2030);
    expect(view.players.some(p => p.name === c.squad[12].name), 'CM_NATIONAL_KNOWN_NATION').toBe(false);
    expect(view.players.some(p => p.name === c.squad[13].name)).toBe(false);
    expect(view.players.filter(p => p.name.startsWith('Fictional Callup')).every(p => p.source === 'owned' && p.nation === 'England')).toBe(true);
    expect(view.unknown).toBeGreaterThan(0);
    expect(JSON.stringify(c) === before).toBe(true); expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(projectedWorldFor('now', CM.yearsOn(c), c.worldSeed)) === world, 'CM_NATIONAL_WORLD_HELD').toBe(true);
  });
  it('keeps a verified retired identity terminal even beside a matching modeled or owned name', () => {
    const a = api(), c = career(), p = c.squad[0];
    const origin = { club: 'Fixture Source Club', name: p.name, position: p.position, birthYear: 2030 - p.age, since: 0 };
    const key = JSON.stringify(['now', origin.club, origin.name, origin.position, origin.birthYear, 0]);
    c.squad[0] = { ...p, worldRosterKey: key };
    c.worldRoster = { version: 1, eraId: 'now', records: [
      { key, origin, owner: null, status: 'retired', year: 2030, player: { ...p, worldRosterKey: key } },
    ] };
    const held = readWorldRoster(c);
    expect(held?.records.map(r => [r.key, r.status, r.owner])).toEqual([[key, 'retired', null]]);
    expect(a.nationalCoachView(c)!.players.some(row => row.key === key), 'CM_NATIONAL_RETIRED_PRECEDENCE').toBe(false);
  });
  it('lets unavailable called-up players be removed without admitting new ineligible records', async () => {
    const a = api(); let c = prepared(), saved = campaign(c);
    const extras = a.nationalCoachView(c)!.players.filter(p => !saved.squadKeys.includes(p.key)).slice(0, 9);
    expect(extras.length, 'CM_NATIONAL_CAP_FOUNDATION: nine additional current records').toBe(9);
    c = a.setNationalSquad(c, [...saved.squadKeys, ...extras.map(p => p.key)], saved.revision);
    const unavailable = { ...c, squad: c.squad.map((p, i) => i >= 12 ? { ...p, injuryWeeks: 2 } : p) };
    saved = campaign(unavailable); expect(saved.squadKeys.length).toBe(23);
    expect(a.setNationalSquad(unavailable, [...saved.squadKeys.slice(1), 'untracked-key'], saved.revision),
      'CM_NATIONAL_NO_NEW_INELIGIBLE').toBe(unavailable);
    const latest = interactivePanel(unavailable);
    fireEvent.click(screen.getByRole('button', { name: 'Manage national team' }));
    await waitFor(() => expect(screen.queryAllByRole('region', { name: 'Called-up national squad' }).length,
      'CM_NATIONAL_UNAVAILABLE_REMOVAL: unavailable selections remain removable').toBe(1));
    const list = screen.getByRole('region', { name: 'Called-up national squad' });
    expect(within(list).getAllByText(/unavailable for this selection/).length).toBe(2);
    fireEvent.click(within(list).getByRole('button', { name: 'Remove called-up Fictional Callup 12' }));
    expect(campaign(latest()).squadKeys.length, 'CM_NATIONAL_REMOVE_WHILE_OTHER_STALE').toBe(22);
    expect(within(list).queryAllByRole('button', { name: 'Remove called-up Fictional Callup 13' }).length).toBe(1);
    fireEvent.click(within(list).getByRole('button', { name: 'Remove called-up Fictional Callup 13' }));
    expect(campaign(latest()).squadKeys.length).toBe(21);
    expect(campaign(latest()).squadKeys.some(key => key === saved.squadKeys[12] || key === saved.squadKeys[13])).toBe(false);
  }, 30000);

  it('starts only an explicit modern campaign and leaves legacy jobs opt in', () => {
    const a = api(), c = career(), before = JSON.stringify(c);
    expect(a.nationalCoachView(c)!.campaign).toBeNull();
    const earned = { ...c, nationJob: null,
      trophies: Array.from({ length: 4 }, () => ({ season: 1, name: 'League', emoji: 'T' })),
      careerStats: { ...c.careerStats, played: 200, wins: 150 } };
    expect(CM.nationOfferFor(earned), 'CM_NATIONAL_OFFER_FOUNDATION').not.toBeNull();
    const accepted = CM.takeNationJob(earned);
    expect(campaign(accepted).year, 'CM_NATIONAL_NEW_JOB_PLAYABLE').toBe(2030);
    expect(campaign(accepted).results).toEqual([]);
    const begun = a.beginNationalCampaign(c), b = campaign(begun);
    expect(b.year).toBe(2030); expect(b.results).toEqual([]); expect(b.squadKeys).toEqual([]);
    expect(b.next).not.toBeNull(); expect(b.complete).toBe(false);
    expect(clubOnly(begun) === clubOnly(c)).toBe(true); expect(JSON.stringify(c) === before).toBe(true);
    expect(a.beginNationalCampaign(begun)).toBe(begun);
    expect(a.beginNationalCampaign({ ...c, eraId: 'era2010' })).toEqual({ ...c, eraId: 'era2010' });
    const offYear = a.beginNationalCampaign({ ...c, startYear: 2031 });
    expect((offYear.nationJob as unknown as { coachEnabled?: boolean }).coachEnabled, 'CM_NATIONAL_OFF_YEAR_OPT_IN').toBe(true);
    expect(a.nationalCoachView(offYear)!.campaign).toBeNull();
  });
  it('requires unique eligible callups and eleven positions with a real keeper boundary', () => {
    const a = api(); let c = a.beginNationalCampaign(career()), v = a.nationalCoachView(c)!;
    const keys = c.squad.map(p => v.players.find(row => row.name === p.name)!.key), r = campaign(c).revision;
    expect(a.setNationalSquad(c, [keys[0], keys[0]], r), 'CM_NATIONAL_UNIQUE_CALLUP').toBe(c);
    expect(a.setNationalSquad(c, ['untracked-key'], r)).toBe(c);
    c = a.setNationalSquad(c, keys, r); const next = campaign(c).revision;
    expect(a.setNationalXi(c, 0, keys.slice(1, 12), next), 'CM_NATIONAL_KEEPER_BOUNDARY').toBe(c);
    expect(a.setNationalXi(c, 0, keys.slice(0, 10), next)).toBe(c);
    const ready = a.setNationalXi(c, 0, keys.slice(0, 11), next);
    expect(campaign(ready).xiKeys).toEqual(keys.slice(0, 11));
    expect(campaign(ready).revision).toBe(next + 1);
  });
  it('plays only the next own fixture and persists its exact result across stale taps and reload', () => {
    const a = api(), c = prepared(), before = campaign(c), fixture = before.next!;
    const next = a.playNationalFixture(c, fixture.id, before.revision), played = campaign(next);
    expect(played.results.length, 'CM_NATIONAL_ONE_FIXTURE').toBe(1);
    expect(played.results[0].id).toBe(fixture.id);
    expect(played.revision).toBe(before.revision + 1); expect(played.rngState).not.toBe(before.rngState);
    expect(a.playNationalFixture(next, fixture.id, before.revision) === next, 'CM_NATIONAL_FIXTURE_ONCE').toBe(true);
    const noCampaign = { ...next, nationJob: { ...next.nationJob!, campaign: undefined } } as CareerState;
    CM.saveCareer(noCampaign);
    const baselineLoad = CM.loadCareer();
    expect(baselineLoad, 'CM_NATIONAL_BASELINE_LOAD_FOUNDATION').not.toBeNull();
    CM.saveCareer(next);
    const reload = CM.loadCareer();
    expect(reload, 'CM_NATIONAL_SAVE_LOAD_FOUNDATION').not.toBeNull();
    expect(clubOnly(reload!) === clubOnly(baselineLoad!), 'CM_NATIONAL_SAVED_CLUB_HELD').toBe(true);
    expect(a.playNationalFixture(reload!, fixture.id, before.revision)).toBe(reload);
    expect(campaign(reload!)).toEqual(played);
    expect(clubOnly(next) === clubOnly(c), 'CM_NATIONAL_CLUB_STATE_HELD').toBe(true);
  });
  it('revalidates current year eligibility and stale revisions before kickoff without drawing', () => {
    const a = api(), c = prepared(), b = campaign(c), before = JSON.stringify(c);
    expect(a.playNationalFixture(c, 'not-the-fixture', b.revision)).toBe(c);
    expect(a.playNationalFixture(c, b.next!.id, b.revision - 1)).toBe(c);
    const later = { ...c, season: 2 };
    expect(a.playNationalFixture(later, b.next!.id, b.revision), 'CM_NATIONAL_YEAR_RECHECK').toBe(later);
    const injured = { ...c, squad: c.squad.map((p, i) => i === 0 ? { ...p, injuryWeeks: 2 } : p) };
    expect(a.playNationalFixture(injured, b.next!.id, b.revision), 'CM_NATIONAL_KICKOFF_RECHECK').toBe(injured);
    expect(JSON.stringify(c) === before).toBe(true);
  });
  it('lets a changed selected XI reach the next match strength while holding an already played result', () => {
    const a = api(), c = prepared(), b = campaign(c);
    const first = a.playNationalFixture(c, b.next!.id, b.revision), p = campaign(first);
    expect(p.complete).toBe(false);
    const lifted = { ...first, squad: first.squad.map(row => ({ ...row, rating: row.rating - 15 })) };
    const second = a.playNationalFixture(lifted, p.next!.id, p.revision), now = campaign(second);
    expect(now.results[0]).toEqual(p.results[0]);
    expect(now.results[1].xiStrength, 'CM_NATIONAL_XI_INPUT').toBeLessThan(p.results[0].xiStrength);
    expect(now.results.length).toBe(2);
    let changedScores = 0;
    for (let seed = 0; seed < 12; seed++) {
      const paired = prepared({ ...career(), worldSeed: seed }), saved = campaign(paired);
      const strong = { ...paired, squad: paired.squad.map(p => ({ ...p, rating: 95 })) };
      const weak = { ...paired, squad: paired.squad.map(p => ({ ...p, rating: 55 })) };
      const high = campaign(a.playNationalFixture(strong, saved.next!.id, saved.revision)).results[0];
      const low = campaign(a.playNationalFixture(weak, saved.next!.id, saved.revision)).results[0];
      expect([high.id, high.home, high.away]).toEqual([low.id, low.home, low.away]);
      if (high.homeGoals !== low.homeGoals || high.awayGoals !== low.awayGoals) changedScores++;
    }
    expect(changedScores, 'CM_NATIONAL_SCORE_USES_XI: identical seed and opponent with different selected players').toBeGreaterThan(0);
  }, 30000);
  it('blocks an unfinished summer and settles a completed campaign only once', () => {
    const a = api(), c = prepared();
    const clubReady = { ...c, nationJob: null };
    const baselineRollover = CM.startNextSeason(clubReady);
    expect(baselineRollover.season, 'CM_NATIONAL_ROLLOVER_FOUNDATION: this club fixture can advance').toBe(c.season + 1);
    const held = CM.startNextSeason(c);
    expect(held === c, 'CM_NATIONAL_UNFINISHED_SUMMER').toBe(true);
    let current = c, count = 0;
    while (!campaign(current).complete && count < 24) {
      const b = campaign(current); current = a.playNationalFixture(current, b.next!.id, b.revision); count++;
    }
    const done = campaign(current);
    expect(done.complete, 'CM_NATIONAL_FINITE_CAMPAIGN').toBe(true); expect(done.settled).toBe(true);
    expect(current.nationJob!.played, 'CM_NATIONAL_SETTLE_ONCE').toBe(c.nationJob!.played + 1);
    expect(current.nationJob!.lastYear).toBe(2030);
    const replay = a.playNationalFixture(current, done.results[done.results.length - 1].id, done.revision);
    expect(replay).toBe(current); expect(replay.nationJob!.played).toBe(current.nationJob!.played);
  }, 30000);
  it('drops only a malformed new block when loading and preserves a legacy job', () => {
    const c = career();
    const malformed = { ...c, nationJob: { ...c.nationJob!, campaign: { version: 1, xiKeys: 'bad' } } };
    CM.saveCareer(malformed as unknown as CareerState); const loaded = CM.loadCareer()!;
    expect(loaded.nationJob?.nation).toBe('England');
    expect(api().nationalCoachView(loaded)!.campaign, 'CM_NATIONAL_BAD_BLOCK_ONLY').toBeNull();
    expect(loaded.budget).toBe(c.budget); expect(loaded.squad).toEqual(c.squad);
    CM.saveCareer(c); const old = CM.loadCareer()!;
    expect(api().nationalCoachView(old)!.campaign).toBeNull();
    const completed = { ...c, nationJob: { ...c.nationJob!, played: 1, lastYear: 2030, lastResult: 'Winner',
      campaign: { version: 1, xiKeys: 'bad' } } } as unknown as CareerState;
    CM.saveCareer(completed); const recovered = CM.loadCareer()!;
    expect(recovered.nationJob!.lastYear, 'CM_NATIONAL_SETTLED_SAVE_FOUNDATION').toBe(2030);
    const reopened = api().beginNationalCampaign(recovered);
    expect(api().nationalCoachView(reopened)!.campaign, 'CM_NATIONAL_NO_SETTLED_YEAR_REPLAY').toBeNull();
    expect(reopened.nationJob!.played).toBe(1);
    expect(reopened.trophies).toEqual(recovered.trophies);
  });
});

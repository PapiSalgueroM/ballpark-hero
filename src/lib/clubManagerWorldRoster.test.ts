import { describe, expect, it, vi } from 'vitest';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import {
  acceptBid, applyForJob, applyTargets, buildMarket, buyPlayer, exerciseLoanOption, loanIn,
  loadCareer, oppRosterFor, playNextEntry, refreshWorldRoster, releasePlayer, saveCareer, signFreeAgent,
  startCareer, startNextSeason, worldRosterFor, worldRosterXIAvg,
} from '@/lib/clubManager';
import { joinClubNow } from '@/lib/clubManagerCalendar';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import {
  readWorldRoster, recordWorldRosterTransfer, snapshotWorldRosterClub, worldRosterClub, worldRosterKey, worldRosterOwner,
  type WorldRosterCareer, type WorldRosterPlayer, type WorldRosterState,
} from '@/lib/clubManagerWorldRoster';

function player(patch: Partial<WorldRosterPlayer> = {}): WorldRosterPlayer {
  return { id: 'signed-forward', name: 'Recorded Forward', position: 'ST', rating: 78, age: 24,
    fitness: 90, morale: 78, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0,
    potential: 85, contractYears: 4, wage: 80, generated: true, signedTerms: { years: 4, wage: 80, role: 'rotation', season: 1 }, ...patch };
}
function career(club = 'Buyer Club', patch: Partial<WorldRosterCareer> = {}): WorldRosterCareer {
  return { saveVersion: 3, clubName: club, startYear: 2026, eraId: 'now', season: 1, squad: [player()],
    budget: 100, goneNames: [], transferLog: [], history: [], pendingSummary: null,
    ...patch } as WorldRosterCareer;
}
function bought(c = career(), p = c.squad[0]): WorldRosterCareer {
  return recordWorldRosterTransfer(c, { player: p, from: 'Source Club', to: c.clubName, kind: 'permanent', since: 0 });
}
function mutate(c: WorldRosterCareer, edit: (state: WorldRosterState) => void): WorldRosterCareer {
  const copy = structuredClone(c);
  edit(copy.worldRoster!);
  return copy;
}
function realCareer(): CareerState {
  const rng = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  try {
    const c = startCareer('Everton');
    return { ...c, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
  } finally { rng.mockRestore(); }
}

// Pure identity boundaries and actual engine transactions share the same saved ledger.
describe('save-scoped world roster ownership', () => {
  it('keeps the exact absent-overlay fallback, input and random stream unchanged', () => {
    const c = career(); const before = structuredClone(c); const fallback = [player()];
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('A roster read drew randomness'); });
    try {
      expect(readWorldRoster(c)).toBeNull();
      expect(worldRosterClub(c, 'Source Club', fallback)).toBe(fallback);
      expect(snapshotWorldRosterClub(c, c.clubName)).toBe(c);
      expect(worldRosterOwner(c, 'unknown')).toBeUndefined();
      expect(c).toEqual(before); expect(rng).not.toHaveBeenCalled();
    } finally { rng.mockRestore(); }
  });

  it('uses a stable game-age anchor rather than current age or signing ID', () => {
    const first = worldRosterKey(career(), 'Source Club', player(), 0);
    const later = worldRosterKey(career('Buyer Club', { season: 3 }), 'Source Club', player({ age: 26, id: 'new-signing-id' }), 0);
    expect(first).toBe(JSON.stringify(['now', 'Source Club', 'Recorded Forward', 'ST', 2002, 0]));
    expect(later).toBe(first);
    expect(worldRosterKey(career(), 'Another Source', player(), 0)).not.toBe(first);
  });

  it('preserves the complete actual buy result, original buyer and seller exclusion across serialization', () => {
    const c = realCareer();
    const target = buildMarket(c).find(p => p.club === 'Arsenal' && p.position !== 'GK')!;
    expect(target).toBeDefined();
    const signed = buyPlayer(c, target)!; expect(signed).not.toBeNull();
    const acquired = signed.squad.find(p => !c.squad.some(old => old.id === p.id))!;
    const before = structuredClone(signed);
    const state = recordWorldRosterTransfer(signed, { player: acquired, from: target.club, to: signed.clubName, kind: 'permanent' });
    const key = JSON.stringify(['now', target.club, acquired.name, acquired.position, 2026 - acquired.age, 0]);
    const full = { ...structuredClone(acquired), worldRosterKey: key };
    expect(state).toEqual({ ...before, squad: before.squad.map(p => p.id === acquired.id ? full : p),
      worldRoster: { version: 1, eraId: 'now', records: [{ key,
        origin: { club: target.club, name: acquired.name, position: acquired.position, birthYear: 2026 - acquired.age, since: 0 },
        owner: signed.clubName, status: 'owned', year: 2026, player: full }] } });
    expect(signed).toEqual(before);
    const departing = snapshotWorldRosterClub(state, state.clubName);
    const away = { ...departing, clubName: 'Liverpool', squad: [] };
    const raw = JSON.stringify(away); const loaded = JSON.parse(raw) as WorldRosterCareer;
    expect(JSON.stringify(loaded)).toBe(raw);
    expect(worldRosterClub(loaded, target.club, [acquired])).toEqual([]);
    const retained = worldRosterClub(loaded, signed.clubName, []);
    expect(retained).toEqual([full]);
    const rejoined = { ...loaded, clubName: signed.clubName, squad: [...retained] };
    expect(worldRosterOwner(rejoined, key)).toBe(signed.clubName);
    expect(worldRosterClub(rejoined, target.club, [acquired])).toEqual([]);
    expect(rejoined.squad[0]).toEqual(full);
  });

  it('records an actual accepted sale at its actual buyer without replaying the payment', () => {
    const c = realCareer();
    const target = buildMarket(c).find(p => p.club === 'Arsenal' && p.position !== 'GK')!;
    const signed = buyPlayer(c, target)!;
    const acquired = signed.squad.find(p => !c.squad.some(old => old.id === p.id))!;
    const tracked = recordWorldRosterTransfer(signed, { player: acquired, from: target.club, to: signed.clubName, kind: 'permanent' });
    const held = tracked.squad.find(p => p.id === acquired.id)!;
    const offer = { ...tracked, incomingBids: [{ playerId: held.id, playerName: held.name, club: 'Chelsea', offer: 25, status: 'open' as const }] };
    const sold = acceptBid(offer, held.id)!; expect(sold).not.toBeNull();
    const settled = recordWorldRosterTransfer(sold, { player: held, from: tracked.clubName, to: 'Chelsea', kind: 'permanent' });
    expect(settled.budget).toBe(sold.budget);
    expect(settled.seasonSignings).toEqual(sold.seasonSignings);
    expect(worldRosterOwner(settled, held.worldRosterKey!)).toBe('Chelsea');
    expect(worldRosterClub(settled, target.club, [acquired])).toEqual([]);
    expect(worldRosterClub(settled, tracked.clubName, [held])).toEqual([]);
    expect(worldRosterClub(settled, 'Chelsea', [])).toEqual([held]);
    expect(recordWorldRosterTransfer(settled, { player: held, from: tracked.clubName, to: 'Chelsea', kind: 'permanent' })).toBe(settled);
  });

  it('tracks an exercised permanent loan option only after the actual loan flags clear', () => {
    const c = realCareer(); const loan = player({ id: 'option-player', onLoan: true, loanFrom: 'Arsenal', loanOptionFee: 10 });
    const borrowing = { ...c, squad: [...c.squad, loan] };
    expect(recordWorldRosterTransfer(borrowing, { player: loan, from: 'Arsenal', to: c.clubName, kind: 'permanent' })).toBe(borrowing);
    const exercised = exerciseLoanOption(borrowing, loan.id)!; expect(exercised).not.toBeNull();
    const permanent = exercised.squad.find(p => p.id === loan.id)!;
    const tracked = recordWorldRosterTransfer(exercised, { player: permanent, from: 'Arsenal', to: c.clubName, kind: 'permanent' });
    expect(tracked.budget).toBe(exercised.budget);
    expect(tracked.squad.find(p => p.id === loan.id)).toEqual({ ...permanent, worldRosterKey: tracked.worldRoster!.records[0].key });
    expect(worldRosterClub(tracked, 'Arsenal', [loan])).toEqual([]);
    expect(worldRosterClub(tracked, c.clubName, []).map(p => p.onLoan)).toEqual([undefined]);
  });

  it.each([{ kind: 'loan' as const }, { kind: 'loan-return' as const }])('leaves temporary $kind outside permanent ownership', ({ kind }) => {
    const c = career(); const before = structuredClone(c);
    expect(recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Source Club', to: c.clubName, kind })).toBe(c);
    expect(c).toEqual(before);
  });

  it('refreshes only established permanent players from the actual departing squad', () => {
    const c = bought(); const original = structuredClone(c);
    const actual = { ...c.squad[0], rating: 83, seasonGoals: 9, seasonAssists: 4, fitness: 62, potential: 89 };
    const unknown = player({ id: 'old-signing', name: 'Unknown Legacy Origin' });
    const borrowed = player({ id: 'borrowed', name: 'Borrowed Forward', onLoan: true, loanFrom: 'Other Club' });
    const snapshot = snapshotWorldRosterClub({ ...c, squad: [actual, unknown, borrowed] }, c.clubName);
    expect(snapshot.worldRoster!.records).toHaveLength(1);
    expect(snapshot.worldRoster!.records[0].player).toEqual(actual);
    expect(worldRosterClub({ ...snapshot, clubName: 'Next Club', squad: [] }, c.clubName, [])).toEqual([actual]);
    expect(c).toEqual(original);
    actual.rating = 40; expect(snapshot.worldRoster!.records[0].player.rating).toBe(83);
  });

  it('refreshes the same carried identity after aging without substituting stale player stats', () => {
    const c = bought(); const key = c.worldRoster!.records[0].key;
    const future = { ...c, season: 2, squad: [{ ...c.squad[0], age: 25, rating: 82 }] };
    const fallback = [player({ age: 25, rating: 70 })];
    expect(readWorldRoster(future)?.records[0].year).toBe(2026);
    expect(worldRosterOwner(future, key)).toBe(c.clubName);
    expect(worldRosterClub(future, c.clubName, fallback)).toBe(fallback);
    const refreshed = snapshotWorldRosterClub(future, c.clubName);
    expect(refreshed.worldRoster!.records[0].key).toBe(key);
    expect(refreshed.worldRoster!.records[0].year).toBe(2027);
    expect(worldRosterClub(refreshed, c.clubName, [])).toEqual([{ ...future.squad[0] }]);
  });

  it.each([{ kind: 'release' as const, status: 'released' }, { kind: 'retire' as const, status: 'retired' }])('keeps $kind distinct from a permanent buyer', ({ kind, status }) => {
    const c = bought(); const held = c.squad[0];
    const ended = recordWorldRosterTransfer(c, { player: held, from: c.clubName, to: null, kind });
    expect(ended.worldRoster!.records[0].status).toBe(status);
    expect(worldRosterOwner(ended, held.worldRosterKey!)).toBeNull();
    expect(worldRosterClub(ended, 'Source Club', [held])).toEqual([]);
    expect(worldRosterClub(ended, c.clubName, [held])).toEqual([]);
    expect(recordWorldRosterTransfer(ended, { player: held, from: c.clubName, to: 'Other Club', kind: 'permanent' })).toBe(ended);
  });

  it('keeps carried identity through retraining and actual yearly aging', () => {
    const c = bought(); const key = c.worldRoster!.records[0].key;
    const retrained = { ...c.squad[0], position: 'CAM' as const, age: 25, rating: 82 };
    const next = { ...c, season: 2, squad: [retrained] };
    expect(worldRosterKey(next, 'Source Club', retrained, 0)).toBe(key);
    const refreshed = snapshotWorldRosterClub(next, c.clubName);
    expect(refreshed.worldRoster!.records[0].origin.position).toBe('ST');
    expect(refreshed.worldRoster!.records[0].player.position).toBe('CAM');
    expect(readWorldRoster(refreshed)).not.toBeNull();
    const sold = recordWorldRosterTransfer(refreshed, { player: retrained, from: c.clubName, to: 'Second Buyer', kind: 'permanent' });
    expect(sold.worldRoster!.records[0].key).toBe(key);
    expect(worldRosterClub(sold, 'Source Club', [player({ age: 25 })])).toEqual([]);
    expect(worldRosterClub(sold, 'Second Buyer', [])).toEqual([retrained]);
  });

  it('excludes stale original ownership without appending old payloads in a later season', () => {
    const c = bought(); const next = { ...c, season: 2, squad: [] };
    const sellerFallback = [player({ age: 25, rating: 79 })];
    expect(worldRosterClub(next, 'Source Club', sellerFallback)).toEqual([]);
    const buyerFallback = [player({ id: 'other-player', name: 'Other Player', age: 25 })];
    expect(worldRosterClub(next, c.clubName, buyerFallback)).toBe(buyerFallback);
    expect(worldRosterClub(next, c.clubName, [])).toEqual([]);
    expect(next.worldRoster!.records[0].year).toBe(2026);
    expect(worldRosterOwner(next, c.worldRoster!.records[0].key)).toBe(c.clubName);
  });

  it('re-signs only a certified released player from no club while preserving the original identity', () => {
    const c = bought(); const key = c.worldRoster!.records[0].key; const held = c.squad[0];
    const released = recordWorldRosterTransfer(c, { player: held, from: c.clubName, to: null, kind: 'release' });
    const newTerms = { ...held, id: 'free-agent-signing', contractYears: 2, wage: 65 };
    const signed = { ...released, clubName: 'New Buyer', squad: [newTerms] };
    const returned = recordWorldRosterTransfer(signed, { player: newTerms, from: null, to: signed.clubName, kind: 'permanent' });
    expect(returned.worldRoster!.records).toHaveLength(1);
    expect(returned.worldRoster!.records[0].key).toBe(key);
    expect(returned.worldRoster!.records[0].player).toEqual(newTerms);
    expect(worldRosterOwner(returned, key)).toBe('New Buyer');
    expect(worldRosterClub(returned, 'Source Club', [held])).toEqual([]);
    expect(worldRosterClub(returned, c.clubName, [held])).toEqual([]);
    expect(worldRosterClub(returned, 'New Buyer', [])).toEqual([newTerms]);
    expect(recordWorldRosterTransfer(returned, { player: newTerms, from: null, to: 'Another Buyer', kind: 'permanent' })).toBe(returned);
    const unknown = career('New Buyer', { squad: [player({ id: 'unknown-free-agent' })] });
    expect(recordWorldRosterTransfer(unknown, { player: unknown.squad[0], from: null, to: 'New Buyer', kind: 'permanent' })).toBe(unknown);
  });
  it('holds repeated completed transfers and an unchanged departing snapshot', () => {
    const c = bought();
    expect(recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Source Club', to: c.clubName, kind: 'permanent' })).toBe(c);
    expect(snapshotWorldRosterClub(c, c.clubName)).toBe(c);
  });

  it('carries the original source key across a second permanent owner and changed signing ID', () => {
    const c = bought(); const nextPlayer = { ...c.squad[0], id: 'second-signing' };
    const sold = recordWorldRosterTransfer(c, { player: nextPlayer, from: c.clubName, to: 'Second Buyer', kind: 'permanent' });
    expect(sold.worldRoster!.records).toHaveLength(1);
    expect(sold.worldRoster!.records[0].key).toBe(c.worldRoster!.records[0].key);
    expect(sold.worldRoster!.records[0].origin.club).toBe('Source Club');
    expect(worldRosterOwner(sold, nextPlayer.worldRosterKey!)).toBe('Second Buyer');
    expect(worldRosterClub(sold, 'Second Buyer', [])).toEqual([nextPlayer]);
  });

  it('does not remove a distinct same-name player with a different game-age anchor', () => {
    const c = bought(); const namesake = player({ id: 'namesake', age: 23 });
    expect(worldRosterClub(c, 'Source Club', [player(), namesake])).toEqual([namesake]);
    expect(worldRosterClub(c, 'Unrelated Club', [player()])).toEqual([player()]);
  });

  it('rejects duplicate keys rather than merging or discarding full player records', () => {
    const c = mutate(bought(), state => state.records.push(structuredClone(state.records[0])));
    const fallback = [player()]; const before = structuredClone(c);
    expect(readWorldRoster(c)).toBeNull();
    expect(worldRosterClub(c, 'Source Club', fallback)).toBe(fallback);
    expect(snapshotWorldRosterClub(c, c.clubName)).toBe(c);
    expect(recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Source Club', to: c.clubName, kind: 'permanent' })).toBe(c);
    expect(c).toEqual(before);
  });

  it('holds an ambiguous duplicate actual squad identity without partial snapshot updates', () => {
    const c = bought(); const copies = [{ ...c.squad[0], rating: 80 }, { ...c.squad[0], rating: 81 }];
    expect(snapshotWorldRosterClub(c, c.clubName, copies)).toBe(c);
  });

  it('holds unknown carried keys and transactions from a foreign owner', () => {
    const c = bought();
    expect(recordWorldRosterTransfer(c, { player: { ...c.squad[0], worldRosterKey: 'unknown' }, from: c.clubName, to: 'Other Club', kind: 'permanent' })).toBe(c);
    expect(recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Foreign Club', to: 'Other Club', kind: 'permanent' })).toBe(c);
  });

  it.each([
    { label: 'wrong era', edit: (s: WorldRosterState) => { s.eraId = 'era2010'; } },
    { label: 'future payload', edit: (s: WorldRosterState) => { s.records[0].year = 2027; } },
    { label: 'age mismatch', edit: (s: WorldRosterState) => { s.records[0].player.age = 25; } },
    { label: 'wrong key', edit: (s: WorldRosterState) => { s.records[0].key = 'wrong'; } },
    { label: 'blank owner', edit: (s: WorldRosterState) => { s.records[0].owner = ''; } },
    { label: 'retired owner', edit: (s: WorldRosterState) => { s.records[0].status = 'retired'; } },
    { label: 'loan payload', edit: (s: WorldRosterState) => { s.records[0].player.onLoan = true; } },
    { label: 'malformed loan flag', edit: (s: WorldRosterState) => { s.records[0].player.onLoan = 'yes' as unknown as boolean; } },
    { label: 'invalid rating', edit: (s: WorldRosterState) => { s.records[0].player.rating = NaN; } },
    { label: 'invalid value', edit: (s: WorldRosterState) => { s.records[0].player.value = NaN; } },
    { label: 'invalid potential', edit: (s: WorldRosterState) => { s.records[0].player.potential = -1; } },
    { label: 'future debut', edit: (s: WorldRosterState) => { s.records[0].origin.since = 1; } },
  ])('leaves $label optional records inactive without changing saved bytes', ({ edit }) => {
    const c = mutate(bought(), edit); const before = structuredClone(c); const fallback = [player()];
    const raw = JSON.stringify(c);
    expect(readWorldRoster(c)).toBeNull();
    expect(worldRosterClub(c, 'Source Club', fallback)).toBe(fallback);
    expect(recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Source Club', to: c.clubName, kind: 'permanent' })).toBe(c);
    expect(c).toEqual(before); expect(JSON.stringify(c)).toBe(raw);
  });

  it.each([{ payload: null }, { payload: [] }, { payload: 'old' }, { payload: { version: 1, eraId: 'now', records: null } }])('does not repair malformed optional containers', ({ payload }) => {
    const c = { ...career(), worldRoster: payload } as unknown as WorldRosterCareer;
    const raw = JSON.stringify(c); const fallback = [player()];
    expect(readWorldRoster(c)).toBeNull(); expect(worldRosterClub(c, c.clubName, fallback)).toBe(fallback);
    expect(snapshotWorldRosterClub(c, c.clubName)).toBe(c); expect(JSON.stringify(c)).toBe(raw);
  });


  it('certifies a fresh projected source key before the first ownership record, including retraining', () => {
    const key = JSON.stringify(['now', 'Source Club', 'Recorded Forward', 'ST', 2002, 0]);
    const p = player({ position: 'CAM', age: 26, worldRosterKey: key, worldRosterSince: 0 });
    const c = career('Buyer Club', { season: 3, squad: [p], worldSeed: 7 });
    const before = structuredClone(c);
    const tracked = recordWorldRosterTransfer(c, { player: p, from: 'Source Club', to: c.clubName,
      kind: 'permanent', since: 0, originPosition: 'ST' });
    expect(tracked.worldRoster!.records[0].key).toBe(key);
    expect(tracked.worldRoster!.records[0].origin.position).toBe('ST');
    expect(tracked.worldRoster!.records[0].player).toEqual(p);
    expect(readWorldRoster(tracked)).not.toBeNull(); expect(c).toEqual(before);
    expect(worldRosterClub(tracked, 'Source Club', [player({ age: 26 })])).toEqual([]);
    expect(recordWorldRosterTransfer(c, { player: p, from: 'Wrong Source', to: c.clubName,
      kind: 'permanent', since: 0, originPosition: 'ST' })).toBe(c);
    expect(recordWorldRosterTransfer(c, { player: p, from: 'Source Club', to: c.clubName,
      kind: 'permanent', since: 0, originPosition: 'LW' })).toBe(c);
    expect(recordWorldRosterTransfer(c, { player: p, from: 'Source Club', to: c.clubName,
      kind: 'permanent', since: 3, originPosition: 'ST' })).toBe(c);
  });
  it('does not use the capped transfer feed as evidence of ownership', () => {
    const c = career('Buyer Club', { transferLog: [{ name: 'Recorded Forward', from: 'Source Club', to: 'Wrong Club', fee: 30, season: 1, week: 2 }] });
    const tracked = bought(c); expect(worldRosterOwner(tracked, tracked.worldRoster!.records[0].key)).toBe('Buyer Club');
    expect(tracked.transferLog).toEqual(c.transferLog);
    expect(worldRosterClub(c, 'Source Club', c.squad)).toBe(c.squad);
  });

  it('keeps full input and returned player payloads independent with zero helper draws', () => {
    const c = career(); const before = structuredClone(c);
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('A roster transition drew randomness'); });
    try {
      const tracked = bought(c); const raw = structuredClone(tracked);
      const read = worldRosterClub(tracked, c.clubName, []);
      read[0].rating = 40;
      expect(tracked).toEqual(raw); expect(c).toEqual(before); expect(rng).not.toHaveBeenCalled();
    } finally { rng.mockRestore(); }
  });
});

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}
function applyAndJoin(c: CareerState, destination: string): CareerState {
  let pending = withRoll(0, () => applyForJob(c, destination));
  expect(pending).not.toBeNull();
  for (let n = 0; n < 20 && pending!.jobHunt?.open?.status === 'pending'; n++) {
    pending = withRoll(0.6, () => playNextEntry(pending!, { skipHalftime: true, noCoach: true }).state);
  }
  expect(pending!.jobHunt?.open?.status).toBe('accepted');
  const joined = withRoll(0.6, () => joinClubNow(pending!));
  expect(joined).not.toBeNull(); expect(joined!.clubName).toBe(destination);
  return joined!;
}

describe('actual world roster continuity through manager callbacks', () => {
  it('keeps the fresh world seed and complete constructor draw vector stable across other careers and clocks', async () => {
    await ensureEraRosters('era2010');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1791633600000);
    const run = (club: string, era: string, seed: number, manager?: CareerState['manager']) => {
      let a = seed >>> 0; const draws: number[] = [];
      const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        draws.push(value); return value;
      });
      try { return { value: startCareer(club, era, undefined, manager), draws }; }
      finally { random.mockRestore(); }
    };
    try {
      const fixtures = [
        { club: 'Everton', era: 'now' },
        { club: 'Lincoln City', era: 'now', manager: { name: 'Harness Manager', nationality: 'England', background: 'coachingBadges', style: 'counter' } as CareerState['manager'] },
        { club: 'Barcelona', era: 'era2010' },
      ];
      for (const [index, fixture] of fixtures.entries()) {
        clock.mockReturnValue(1791633600000);
        const first = run(fixture.club, fixture.era, 311 + index, fixture.manager);
        run('Real Madrid', 'now', 7301);
        clock.mockReturnValue(1791720000000);
        const interleaved = run(fixture.club, fixture.era, 311 + index, fixture.manager);
        expect(interleaved.draws).toEqual(first.draws);
        expect(interleaved.value.worldSeed).toBe(first.value.worldSeed);
        expect(interleaved.value.academy!.candidates.map(p => p.id)).not.toEqual(first.value.academy!.candidates.map(p => p.id));
      }
    } finally { clock.mockRestore(); }
  });
  it('records a first purchase from the actual seeded future market', () => {
    const future = withRoll(0.6, () => startNextSeason(realCareer(), 'Liverpool'));
    const c = { ...future, budget: 9999, wageCap: 9999 };
    const offer = buildMarket(c).find(p => p.club === 'Arsenal' && p.worldRosterKey && p.age < 27 && p.position !== 'GK')!;
    expect(offer).toBeDefined();
    const before = structuredClone(c);
    const signed = buyPlayer(c, offer)!; expect(signed).not.toBeNull();
    const p = signed.squad.find(x => x.name === offer.name)!;
    const record = readWorldRoster(signed)!.records.find(x => x.key === offer.worldRosterKey)!;
    expect(record).toBeDefined(); expect(record.owner).toBe(c.clubName);
    expect(record.origin).toEqual({ club: offer.club, name: offer.name, position: offer.position,
      birthYear: 2027 - offer.age, since: offer.worldRosterSince });
    expect(record.player).toEqual(p); expect(p.worldRosterKey).toBe(offer.worldRosterKey);
    expect(worldRosterFor(signed, offer.club).some(x => x.worldRosterKey === p.worldRosterKey)).toBe(false);
    expect(c).toEqual(before);
  });

  it('preserves an already higher seeded rating without raising the inherited growth ceiling', () => {
    const c = bought(career('Buyer Club', { squad: [player({ rating: 99, potential: 99 })], worldSeed: 7 }));
    const future = { ...c, clubName: 'Liverpool', season: 2, squad: [] };
    const refreshed = refreshWorldRoster(future);
    expect(readWorldRoster(refreshed)!.records[0].player.rating).toBe(99);
    expect(readWorldRoster(refreshed)!.records[0].player.potential).toBe(99);
    const real = realCareer();
    const id = real.squad.find(p => p.age < 24 && !p.onLoan)!.id;
    const high = { ...real, squad: real.squad.map(p => p.id === id ? { ...p, rating: 99, potential: 99, contractYears: 4 } : p) };
    const current = withRoll(0.6, () => startNextSeason(high));
    expect(current.squad.find(p => p.id === id)?.rating).toBe(99);
    const old = { ...high }; delete old.worldSeed;
    const legacy = withRoll(0.6, () => startNextSeason(old));
    expect(legacy.squad.find(p => p.id === id)?.rating).toBe(95);
    const below = { ...real, squad: real.squad.map(p => p.id === id ? { ...p, rating: 95, potential: 99, contractYears: 4, apps: 38 } : p) };
    expect(withRoll(0.6, () => startNextSeason(below)).squad.find(p => p.id === id)?.rating).toBe(95);
  });

  it('buys, joins another job, saves, reloads and rejoins the buyer without seller resurrection', () => {
    const c = realCareer();
    const offer = buildMarket(c).find(p => p.club === 'Arsenal' && p.age < 29 && p.position !== 'GK')!;
    const signed = buyPlayer(c, offer)!;
    const acquired = signed.squad.find(p => p.name === offer.name)!;
    expect(acquired.worldRosterKey).toBeDefined();
    const before = structuredClone(signed);
    const destination = applyTargets(signed).find(t => t.club !== signed.clubName && t.club !== offer.club)!.club;
    const away = applyAndJoin(signed, destination);
    expect(signed).toEqual(before);
    expect(oppRosterFor(away, offer.club).some(p => p.n === acquired.name)).toBe(false);
    expect(worldRosterFor(away, signed.clubName).find(p => p.n === acquired.name)?.worldRosterKey).toBe(acquired.worldRosterKey);
    expect(buildMarket(away).find(p => p.name === acquired.name)?.club).toBe(signed.clubName);
    localStorage.clear(); expect(saveCareer(away)).toBe(true);
    const loaded = withRoll(0.6, () => loadCareer())!;
    expect(loaded).not.toBeNull(); expect(loaded.worldRoster).toEqual(away.worldRoster);
    expect(loaded.worldSeed).toBe(away.worldSeed);
    const returned = applyAndJoin(loaded, signed.clubName);
    expect(returned.squad.filter(p => p.name === acquired.name)).toHaveLength(1);
    expect(returned.squad.find(p => p.name === acquired.name)?.worldRosterKey).toBe(acquired.worldRosterKey);
    expect(oppRosterFor(returned, offer.club).some(p => p.n === acquired.name)).toBe(false);
  });

  it('keeps the permanent buyer and seller consistent after actual summer moves and aging', () => {
    const c = realCareer();
    const offer = buildMarket(c).find(p => p.club === 'Arsenal' && p.age < 27 && p.position !== 'GK')!;
    const signed = buyPlayer(c, offer)!;
    const p = signed.squad.find(x => x.name === offer.name)!;
    const held = structuredClone(signed);
    const away = withRoll(0.6, () => startNextSeason(signed, 'Liverpool'));
    expect(signed).toEqual(held); expect(away.season).toBe(2);
    const record = readWorldRoster(away)!.records.find(r => r.key === p.worldRosterKey)!;
    expect(record.owner).toBe(signed.clubName); expect(record.year).toBe(2027);
    expect(record.player.age).toBe(p.age + 1);
    expect(worldRosterFor(away, signed.clubName).find(x => x.n === p.name)?.a).toBe(p.age + 1);
    expect(oppRosterFor(away, offer.club).some(x => x.n === p.name)).toBe(false);
    const returned = withRoll(0.6, () => startNextSeason(away, signed.clubName));
    expect(returned.squad.filter(x => x.name === p.name)).toHaveLength(1);
    expect(returned.squad.find(x => x.name === p.name)?.age).toBe(p.age + 2);
    expect(readWorldRoster(returned)!.records.find(r => r.key === p.worldRosterKey)?.owner).toBe(signed.clubName);
    expect(oppRosterFor(returned, offer.club).some(x => x.n === p.name)).toBe(false);
  });

  it('returns a temporary loan to its parent, then records an actually exercised permanent option', () => {
    const c = realCareer();
    const offer = buildMarket(c).find(p => p.age <= 23 && p.rating <= 84 && (p.value ?? p.price) <= 25 && p.position !== 'GK')!;
    expect(offer).toBeDefined();
    const loaned = loanIn(c, offer)!; expect(loaned).not.toBeNull();
    expect(loaned.worldRoster).toBeUndefined();
    const loan = loaned.squad.find(p => p.name === offer.name)!;
    const destination = offer.club === 'Liverpool' ? 'Manchester City' : 'Liverpool';
    const returned = withRoll(0.6, () => startNextSeason(loaned, destination));
    expect(returned.squad.some(p => p.name === loan.name)).toBe(false);
    expect(worldRosterFor(returned, offer.club).some(p => p.n === loan.name)).toBe(true);
    const bought = exerciseLoanOption(loaned, loan.id)!;
    expect(bought).not.toBeNull();
    const permanent = bought.squad.find(p => p.name === offer.name)!;
    expect(permanent.onLoan).toBeUndefined();
    const moved = withRoll(0.6, () => startNextSeason(bought, destination));
    expect(worldRosterFor(moved, bought.clubName).find(p => p.n === permanent.name)?.worldRosterKey).toBe(permanent.worldRosterKey);
    expect(worldRosterFor(moved, offer.club).some(p => p.n === permanent.name)).toBe(false);
  });

  it('records an actual sale and lets the actual buyer sell the same identity back on new terms', () => {
    const c = realCareer();
    const offer = buildMarket(c).find(p => p.club === 'Arsenal' && p.position !== 'GK' && p.age < 29)!;
    const signed = buyPlayer(c, offer)!; const p = signed.squad.find(x => x.name === offer.name)!;
    const sold = acceptBid({ ...signed, incomingBids: [{ playerId: p.id, playerName: p.name, club: 'Chelsea', offer: 25, status: 'open' }] }, p.id)!;
    expect(worldRosterFor(sold, 'Chelsea').find(x => x.n === p.name)?.worldRosterKey).toBe(p.worldRosterKey);
    expect(worldRosterFor(sold, offer.club).some(x => x.n === p.name)).toBe(false);
    const next = withRoll(0.6, () => startNextSeason(sold, 'Liverpool'));
    const resale = buildMarket({ ...next, budget: 9999, wageCap: 9999 }).find(x => x.name === p.name)!;
    expect(resale.club).toBe('Chelsea'); expect(resale.age).toBe(p.age + 1);
    const resigned = buyPlayer({ ...next, budget: 9999, wageCap: 9999 }, resale)!;
    expect(resigned).not.toBeNull(); expect(readWorldRoster(resigned)!.records.filter(r => r.key === p.worldRosterKey)).toHaveLength(1);
    expect(worldRosterOwner(resigned, p.worldRosterKey!)).toBe(next.clubName);
    expect(worldRosterFor(resigned, 'Chelsea').some(x => x.n === p.name)).toBe(false);
  });

  it('records a real release and preserves the existing manager re-signing restriction after a job change', () => {
    const c = realCareer();
    const offer = buildMarket(c).find(p => p.rating < 76 && p.position !== 'GK' && p.age < 30)!;
    const signed = buyPlayer(c, offer)!; const p = signed.squad.find(x => x.name === offer.name)!;
    const released = releasePlayer(signed, p.id)!; expect(released).not.toBeNull();
    expect(worldRosterOwner(released, p.worldRosterKey!)).toBeNull();
    const destination = withRoll(0.6, () => startNextSeason(released, 'Arsenal'));
    const fa = destination.freeAgents!.find(x => x.name === p.name)!; expect(fa).toBeDefined();
    expect(signFreeAgent({ ...destination, budget: 9999, wageCap: 9999 }, fa.name)).toBeNull();
    expect(worldRosterOwner(destination, p.worldRosterKey!)).toBeNull();
    expect(worldRosterFor(destination, offer.club).some(x => x.n === p.name)).toBe(false);
  });

  it('uses no global read draws and keeps the entire stale input unchanged during year refresh', () => {
    const c = bought(); const future = { ...c, clubName: 'Liverpool', season: 2, squad: [] };
    const before = structuredClone(future);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('World refresh drew global randomness'); });
    try {
      const first = refreshWorldRoster(future); const second = refreshWorldRoster(future);
      expect(first).toEqual(second); expect(future).toEqual(before);
      expect(readWorldRoster(first)!.records[0].player.age).toBe(25);
      worldRosterFor(first, c.clubName); worldRosterXIAvg(first, c.clubName); buildMarket(first);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });
});
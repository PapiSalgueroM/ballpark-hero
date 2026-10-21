import { describe, expect, it, vi } from 'vitest';
/* Round 1508, the reviews of 2026-10-16 (the run review's minors 2, 3 and 4, the read review's minor 5): the parts of
   adoptLivingWorld and of the writers it wakes that no fleet reaches. A career with no world seed (started before the
   13 October update) joins the living world at its next summer; these cases call the adoption itself on a career
   built the way such a save is, so each line below is held by an assertion that fails if the line goes.
   The projection never lists one name and age at two clubs in any bake (checked 2026-10-16), so the namesake case
   adds a twin through this mock, and only while `twin.name` is set. */
const twin = vi.hoisted(() => ({ name: '', age: 0, club: '' }));
vi.mock('@/lib/clubManagerEras', async importActual => {
  const actual = await importActual<typeof import('@/lib/clubManagerEras')>();
  return { ...actual, projectedWorldFor: (...args: Parameters<typeof actual.projectedWorldFor>) => {
    const world = actual.projectedWorldFor(...args);
    if (!twin.name) return world;
    const source = Object.values(world).flat().find(p => p.n === twin.name && p.a === twin.age);
    if (!source) throw new Error(`the twin ${twin.name} is not in the projection`);
    return { ...world, [twin.club]: [...(world[twin.club] ?? []), { ...source }] };
  } };
});
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import {
  adoptLivingWorld, buildMarket, buyPlayer, ensureEraRosters, ensureFreeAgents, eraRostersLoaded, freeAgentBlock,
  signFreeAgent, startCareer, worldRosterFor,
} from '@/lib/clubManager';
import { readWorldRoster, recordWorldRosterTransfer, type WorldRosterCareer } from '@/lib/clubManagerWorldRoster';

/** A career as an old save holds it: no world seed and no ledger, in its summer window. */
function oldCareer(): CareerState {
  const rng = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  try {
    const c = startCareer('Everton');
    delete c.worldSeed; delete c.worldRoster;
    return { ...c, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
  } finally { rng.mockRestore(); }
}

/** A man bought from `club` before the summer: an old career writes no ledger for it. */
function signedFrom(c: CareerState, club: string) {
  const offer = buildMarket(c).find(p => p.club === club && p.age < 29 && p.position !== 'GK')!;
  expect(offer).toBeDefined();
  const signed = buyPlayer(c, offer)!;
  expect(signed).not.toBeNull(); expect(signed.worldRoster).toBeUndefined();
  return { signed, offer, p: signed.squad.find(x => x.name === offer.name)! };
}

describe('Round 1508: an old career adopted into the living world', () => {
  /* First, before any case loads it: the 2005 era's squads have not arrived in this file. */
  it('waits for an era whose squads have not arrived, and adopts at the first summer that has them', async () => {
    const c: CareerState = { ...oldCareer(), eraId: 'era2005' };
    expect(eraRostersLoaded('era2005')).toBe(false);
    expect(adoptLivingWorld(c)).toBe(c);
    await ensureEraRosters('era2005');
    const adopted = adoptLivingWorld(c);
    expect(adopted.worldSeed).toBeUndefined(); expect(readWorldRoster(adopted)).not.toBeNull();
  });

  it('records a man I signed before the summer and loaned out across it as signed by me from his old club', () => {
    const { signed, offer, p } = signedFrom(oldCareer(), 'Arsenal');
    const out: CareerState = { ...signed, squad: signed.squad.filter(x => x.id !== p.id),
      loanedOut: [...(signed.loanedOut ?? []), { player: p, club: 'Chelsea', fee: 1, season: signed.season }] };
    const adopted = adoptLivingWorld(out);
    expect(adopted.worldSeed).toBeUndefined();
    const records = readWorldRoster(adopted)!.records.filter(r => r.player.name === p.name);
    expect(records).toHaveLength(1);
    expect(records[0].owner).toBe(out.clubName); expect(records[0].status).toBe('owned');
    expect(records[0].origin.club).toBe(offer.club);
    expect(worldRosterFor(adopted, offer.club).some(x => x.n === p.name)).toBe(false);
  });

  it('leaves a man of mine alone when the projection lists his name and age at two clubs', () => {
    const { signed, p } = signedFrom(oldCareer(), 'Arsenal');
    expect(readWorldRoster(adoptLivingWorld(signed))!.records.filter(r => r.player.name === p.name)).toHaveLength(1);
    twin.name = p.name; twin.age = p.age; twin.club = 'Chelsea';
    try {
      const adopted = adoptLivingWorld(signed);
      expect(readWorldRoster(adopted)).not.toBeNull();
      expect(readWorldRoster(adopted)!.records.filter(r => r.player.name === p.name)).toHaveLength(0);
    } finally { twin.name = ''; }
  });

  it('signs a free agent the ledger holds as released back onto my books in the ledger', () => {
    const adopted = adoptLivingWorld(oldCareer());
    expect(adopted.worldSeed).toBeUndefined(); expect(readWorldRoster(adopted)).not.toBeNull();
    const pool = structuredClone(adopted); ensureFreeAgents(pool);
    const fa = pool.freeAgents!.find(x => freeAgentBlock(pool, x) === null)!;
    expect(fa).toBeDefined();
    const man = { id: 'released-elsewhere', name: fa.name, position: fa.position, rating: fa.rating, age: fa.age,
      fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0,
      contractYears: 2, wage: 10 } as CMPlayer;
    const held = recordWorldRosterTransfer(pool as unknown as WorldRosterCareer,
      { player: man, from: 'Source Club', to: null, kind: 'release' }) as unknown as CareerState;
    const released = readWorldRoster(held)!.records.filter(r => r.player.name === fa.name);
    expect(released).toHaveLength(1); expect(released[0].status).toBe('released');
    const signed = signFreeAgent(held, fa.name)!;
    expect(signed).not.toBeNull();
    const after = readWorldRoster(signed)!.records.filter(r => r.key === released[0].key);
    expect(after).toHaveLength(1);
    expect(after[0].owner).toBe(held.clubName); expect(after[0].status).toBe('owned');
  });
});

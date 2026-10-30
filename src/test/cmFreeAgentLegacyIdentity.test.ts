import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freeAgentBlock, loadCareer, saveCareer, signFreeAgent, startCareer, type FreeAgent } from '@/lib/clubManager';
import { readWorldRoster, recordWorldRosterTransfer } from '@/lib/clubManagerWorldRoster';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Club Manager legacy free-agent identity', () => {
  it('keeps a verified youth pad fictional when a thin legacy pool row omits generated', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.6);
    const base = startCareer('Volos');
    const pad = base.squad.find(p => p.isYouth && !p.generated && !p.academyGrad && !p.onLoan);
    expect(pad, 'CM_FA_LEGACY_PAD_SETUP_ACTUAL_GENERATED_SQUAD').toBeDefined();
    expect(pad!.name).toContain(' (Youth)');
    const released = recordWorldRosterTransfer({
      ...base, squad: base.squad.filter(p => p.id !== pad!.id), budget: 9999, wageCap: 9999,
    }, { player: pad!, from: base.clubName, to: null, kind: 'release' });
    const canonical = readWorldRoster(released)?.records.filter(r => r.player.id === pad!.id) ?? [];
    expect(canonical, 'CM_FA_LEGACY_PAD_SETUP_REAL_RELEASED_RECORD').toHaveLength(1);
    expect(canonical[0]).toMatchObject({ status: 'released', owner: null });
    expect(canonical[0].player).toMatchObject({ isYouth: true });
    expect(canonical[0].player.generated).toBeUndefined();
    expect(canonical[0].player.academyGrad).toBeUndefined();
    // Older thin pool rows have no generated flag or canonical pointer to copy.
    const thin: FreeAgent = { name: pad!.name, position: pad!.position, age: pad!.age,
      rating: 40, value: .2, since: base.season - 1, reason: 'expired', fromMyClub: true };
    expect(saveCareer({ ...released, transferWindow: null, freeAgents: [thin] }),
      'CM_FA_LEGACY_PAD_SETUP_REAL_SAVE').toBe(true);
    const loaded = loadCareer();
    expect(loaded, 'CM_FA_LEGACY_PAD_SETUP_REAL_RELOAD').not.toBeNull();
    const fa = loaded!.freeAgents!.find(f => f.name === thin.name)!;
    expect(fa, 'CM_FA_LEGACY_PAD_SETUP_THIN_ROW_SURVIVES').toBeDefined();
    expect(fa.generated).toBeUndefined();
    expect(fa.worldRosterKey).toBeUndefined();
    expect(readWorldRoster(loaded!)?.records.filter(r => r.key === canonical[0].key),
      'CM_FA_LEGACY_PAD_SETUP_CANONICAL_SURVIVES').toHaveLength(1);
    expect(freeAgentBlock(loaded!, fa), 'CM_FA_LEGACY_PAD_SETUP_SIGNABLE').toBeNull();
    const signed = signFreeAgent(loaded!, fa.name);
    expect(signed, 'CM_FA_LEGACY_PAD_SETUP_REAL_SIGNING').not.toBeNull();
    const returned = signed!.squad.find(p => p.name === pad!.name)!;
    expect(returned, 'CM_FA_LEGACY_PAD_SETUP_RETURNED_PLAYER').toBeDefined();
    expect(returned.generated, 'CM_FA_LEGACY_FICTION_IDENTITY').toBe(true);
    expect(returned.isYouth).toBe(false);
    expect(returned.worldRosterKey).toBe(canonical[0].key);
    expect(signed!.squad.filter(p => p.name === pad!.name)).toHaveLength(1);
  });
});

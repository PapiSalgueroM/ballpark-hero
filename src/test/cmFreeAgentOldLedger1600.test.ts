/* Round 1600, the merge of main at 931308159: main's one free agent identity resolver (freeAgentRecord in
   src/lib/clubManager.ts) takes Round 1600's ledger rule (nearAges and bornNear in clubManagerWorldRoster.ts). A
   ledger of today's world without the curve stamp (a save from before the age read) reads a man a year either side
   of the birth year it recorded; a stamped ledger still reads it exactly. Both halves are held here on one real
   released record, the same setup cmFreeAgentLegacyIdentity.test.ts uses.
   Negative control (run on a runner, never committed): put the exact comparison back in freeAgentRecord
   (record.origin.birthYear === birthYear) and the first case fails on CM_FA_OLD_LEDGER_LINKED. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freeAgentBlock, loadCareer, saveCareer, signFreeAgent, startCareer, type CareerState, type FreeAgent } from '@/lib/clubManager';

/* No part of this file may reach the database: the client is replaced by nothing at all. */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '',
}));
import { nearAges, readWorldRoster, recordWorldRosterTransfer } from '@/lib/clubManagerWorldRoster';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

/* A released youth pad, saved with a thin expired pool row whose age is a year on from the record's. */
function oneYearOn(stamped: boolean) {
  vi.spyOn(Math, 'random').mockReturnValue(.6);
  const base = startCareer('Volos');
  const pad = base.squad.find(p => p.isYouth && !p.generated && !p.academyGrad && !p.onLoan);
  expect(pad, 'CM_FA_OLD_LEDGER_SETUP_PAD').toBeDefined();
  const released = recordWorldRosterTransfer({
    ...base, squad: base.squad.filter(p => p.id !== pad!.id), budget: 9999, wageCap: 9999,
  }, { player: pad!, from: base.clubName, to: null, kind: 'release' });
  const record = readWorldRoster(released)?.records.filter(r => r.player.id === pad!.id) ?? [];
  expect(record, 'CM_FA_OLD_LEDGER_SETUP_RECORD').toHaveLength(1);
  expect(record[0]).toMatchObject({ status: 'released', owner: null });
  const ledger = released.worldRoster as unknown as Record<string, unknown>;
  expect(ledger.curve, 'CM_FA_OLD_LEDGER_SETUP_STAMP').toBeDefined();
  const unstamped = { ...ledger };
  delete unstamped.curve;
  const career: CareerState = { ...released, worldRoster: (stamped ? ledger : unstamped) as unknown as CareerState['worldRoster'] };
  expect(nearAges(readWorldRoster(career)!), 'CM_FA_OLD_LEDGER_SETUP_NEAR').toBe(!stamped);
  const thin: FreeAgent = { name: pad!.name, position: pad!.position, age: pad!.age + 1,
    rating: 40, value: .2, since: base.season - 1, reason: 'expired', fromMyClub: true };
  expect(saveCareer({ ...career, transferWindow: null, freeAgents: [thin] }), 'CM_FA_OLD_LEDGER_SETUP_SAVE').toBe(true);
  const loaded = loadCareer();
  expect(loaded, 'CM_FA_OLD_LEDGER_SETUP_RELOAD').not.toBeNull();
  expect(nearAges(readWorldRoster(loaded!)!), 'CM_FA_OLD_LEDGER_SETUP_NEAR_AFTER_LOAD').toBe(!stamped);
  const fa = loaded!.freeAgents!.find(f => f.name === thin.name)!;
  expect(fa, 'CM_FA_OLD_LEDGER_SETUP_ROW').toBeDefined();
  expect(freeAgentBlock(loaded!, fa), 'CM_FA_OLD_LEDGER_SETUP_SIGNABLE').toBeNull();
  const signed = signFreeAgent(loaded!, fa.name);
  expect(signed, 'CM_FA_OLD_LEDGER_SETUP_SIGNING').not.toBeNull();
  const back = signed!.squad.filter(p => p.name === pad!.name);
  expect(back, 'CM_FA_OLD_LEDGER_ONCE').toHaveLength(1);
  return { key: record[0].key, padId: pad!.id, back: back[0] };
}

/* What is held is the resolver: whether the signing finds his saved record and brings his saved card back (main's
   restore: the id and the world roster key). The ledger write after it keeps its own exact identity check
   (samePlayer in recordWorldRosterTransfer), as it did on this branch before the merge, so it is not asserted. */
describe('Round 1600 merge: the free agent resolver reads an old ledger a year either side', () => {
  it('restores the saved card of a man a year on from his record in a ledger from before the age read', () => {
    const { key, padId, back } = oneYearOn(false);
    expect(back.worldRosterKey, 'CM_FA_OLD_LEDGER_LINKED').toBe(key);
    expect(back.id, 'CM_FA_OLD_LEDGER_CARD').toBe(padId);
  });
  it('still reads a stamped ledger exactly: the same man a year on is signed fresh', () => {
    const { padId, back } = oneYearOn(true);
    expect(back.worldRosterKey, 'CM_FA_STAMPED_LEDGER_EXACT').toBeUndefined();
    expect(back.id, 'CM_FA_STAMPED_LEDGER_FRESH_CARD').not.toBe(padId);
  });
});

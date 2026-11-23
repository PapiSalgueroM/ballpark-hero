import { describe, expect, it } from 'vitest';
import {
  cupScorerRace, isCupScorerLedger, newCupScorerLedger, recordCupScorerRound,
  type CupScorerCredit,
} from './clubManagerCupScorers';

const striker: CupScorerCredit = { id: 'striker', name: 'Alex Smith', club: 'Everton' };
const namesake: CupScorerCredit = { id: 'namesake', name: 'Alex Smith', club: 'Lyon' };
const scorer = (id: string, club: string): CupScorerCredit => ({ id, name: id, club });
const settle = (...credits: CupScorerCredit[]) => recordCupScorerRound(newCupScorerLedger(), 0, credits);

describe('Cup scorer ledger', () => {
  it('credits player IDs once per settled night and keeps the score fully accounted for', () => {
    const opening = newCupScorerLedger();
    const first = recordCupScorerRound(opening, 0, [striker, namesake, 'own-goal', null, striker]);
    expect(opening).toEqual(newCupScorerLedger());
    expect(first).toEqual({
      v: 1, nights: 1, unresolved: 1, ownGoals: 1,
      players: [['striker', 'Alex Smith', 'Everton', 2], ['namesake', 'Alex Smith', 'Lyon', 1]],
    });
    expect(recordCupScorerRound(first, 0, [striker])).toBe(first);
    expect(recordCupScorerRound(first, 2, [striker])).toBe(first);
    const moved = recordCupScorerRound(first, 1, [{ ...striker, club: 'Roma' }]);
    expect(moved.players).toEqual([['striker', 'Alex Smith', 'Roma', 3], ['namesake', 'Alex Smith', 'Lyon', 1]]);
    expect(first.players[0][3]).toBe(2);
    expect(isCupScorerLedger(JSON.parse(JSON.stringify(moved)))).toBe(true);
  });

  it('separates a race in progress from a final award or a missing score-only edition', () => {
    const ledger = settle(striker, striker, namesake);
    expect(cupScorerRace(undefined, 0, false).status).toBe('ahead');
    expect(cupScorerRace(ledger, 1, false).status).toBe('racing');
    expect(cupScorerRace(ledger, 1, true)).toMatchObject({
      status: 'winner', leaders: [{ id: 'striker', goals: 2 }],
    });
    expect(cupScorerRace(undefined, 1, true).status).toBe('unavailable');
    expect(cupScorerRace(ledger, 2, true).status).toBe('unavailable');
  });

  it('holds the award when unidentified goals could change the result', () => {
    const undecided = settle(striker, striker, namesake, null);
    expect(cupScorerRace(undecided, 1, true)).toMatchObject({ status: 'undecided', unresolved: 1, leaders: [] });
    const safe = settle(striker, striker, striker, namesake, null);
    expect(cupScorerRace(safe, 1, true)).toMatchObject({
      status: 'winner', unresolved: 1, leaders: [{ id: 'striker', goals: 3 }],
    });
    const onlyUnnamed = settle(null);
    expect(cupScorerRace(onlyUnnamed, 1, true).status).toBe('undecided');
  });

  it('shares a settled goals-only tie and gives no award for own goals alone', () => {
    const ledger = settle(scorer('Zed', 'Everton'), scorer('Ari', 'Lyon'), 'own-goal');
    expect(cupScorerRace(ledger, 1, true)).toMatchObject({
      status: 'shared', ownGoals: 1, leaders: [{ id: 'Ari', goals: 1 }, { id: 'Zed', goals: 1 }],
    });
    expect(cupScorerRace(settle(striker, namesake, null), 1, true).status).toBe('undecided');
    expect(cupScorerRace(settle('own-goal', 'own-goal'), 1, true).status).toBe('no-goals');
  });

  it('keeps malformed saved rows out of the race', () => {
    const ledger = settle(striker);
    for (const bad of [
      { ...ledger, nights: -1 },
      { ...ledger, unresolved: Infinity },
      { ...ledger, players: [['striker', 'Alex Smith', 'Everton', 0]] },
      { ...ledger, players: [...ledger.players, ...ledger.players] },
      { ...ledger, players: [null] },
    ]) {
      expect(isCupScorerLedger(bad)).toBe(false);
      expect(cupScorerRace(bad, 1, true).status).toBe('unavailable');
    }
  });
});

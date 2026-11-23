import { describe, expect, it } from 'vitest';
import {
  europaScorerRace, isEuropaScorerLedger, newEuropaScorerLedger, recordEuropaScorerNight,
  type EuropaScorerCredit,
} from './clubManagerEuropaScorers';

const striker: EuropaScorerCredit = { id: 'striker', name: 'Alex Smith', club: 'Everton' };
const namesake: EuropaScorerCredit = { id: 'namesake', name: 'Alex Smith', club: 'Lyon' };
const scorer = (id: string, club: string): EuropaScorerCredit => ({ id, name: id, club });
const settle = (...credits: EuropaScorerCredit[]) => recordEuropaScorerNight(newEuropaScorerLedger(), 0, credits);

describe('Europa League scorer ledger', () => {
  it('credits player IDs once per settled night and keeps the score fully accounted for', () => {
    const opening = newEuropaScorerLedger();
    const first = recordEuropaScorerNight(opening, 0, [striker, namesake, 'own-goal', null, striker]);
    expect(opening).toEqual(newEuropaScorerLedger());
    expect(first).toEqual({
      v: 1, nights: 1, unresolved: 1, ownGoals: 1,
      players: [['striker', 'Alex Smith', 'Everton', 2], ['namesake', 'Alex Smith', 'Lyon', 1]],
    });
    expect(recordEuropaScorerNight(first, 0, [striker])).toBe(first);
    expect(recordEuropaScorerNight(first, 2, [striker])).toBe(first);
    const moved = recordEuropaScorerNight(first, 1, [{ ...striker, club: 'Roma' }]);
    expect(moved.players).toEqual([['striker', 'Alex Smith', 'Roma', 3], ['namesake', 'Alex Smith', 'Lyon', 1]]);
    expect(first.players[0][3]).toBe(2);
    expect(isEuropaScorerLedger(JSON.parse(JSON.stringify(moved)))).toBe(true);
  });

  it('separates a race in progress from a final award or a missing score-only edition', () => {
    const ledger = settle(striker, striker, namesake);
    expect(europaScorerRace(undefined, 0, false).status).toBe('ahead');
    expect(europaScorerRace(ledger, 1, false).status).toBe('racing');
    expect(europaScorerRace(ledger, 1, true)).toMatchObject({
      status: 'winner', leaders: [{ id: 'striker', goals: 2 }],
    });
    expect(europaScorerRace(undefined, 1, true).status).toBe('unavailable');
    expect(europaScorerRace(ledger, 2, true).status).toBe('unavailable');
  });

  it('holds the award when unidentified goals could change the result', () => {
    const undecided = settle(striker, striker, namesake, null);
    expect(europaScorerRace(undecided, 1, true)).toMatchObject({ status: 'undecided', unresolved: 1, leaders: [] });
    const safe = settle(striker, striker, striker, namesake, null);
    expect(europaScorerRace(safe, 1, true)).toMatchObject({
      status: 'winner', unresolved: 1, leaders: [{ id: 'striker', goals: 3 }],
    });
    const onlyUnnamed = settle(null);
    expect(europaScorerRace(onlyUnnamed, 1, true).status).toBe('undecided');
  });

  it('shares a settled goals-only tie and gives no award for own goals alone', () => {
    const ledger = settle(scorer('Zed', 'Everton'), scorer('Ari', 'Lyon'), 'own-goal');
    expect(europaScorerRace(ledger, 1, true)).toMatchObject({
      status: 'shared', ownGoals: 1, leaders: [{ id: 'Ari', goals: 1 }, { id: 'Zed', goals: 1 }],
    });
    expect(europaScorerRace(settle(striker, namesake, null), 1, true).status).toBe('undecided');
    expect(europaScorerRace(settle('own-goal', 'own-goal'), 1, true).status).toBe('no-goals');
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
      expect(isEuropaScorerLedger(bad)).toBe(false);
      expect(europaScorerRace(bad, 1, true).status).toBe('unavailable');
    }
  });
});

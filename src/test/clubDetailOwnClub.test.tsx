import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClubDetailScreen } from '@/components/club-manager/ClubDetailScreen';
import { oppRosterFor, releaseBlock, releasePlayer, startCareer, type CareerState } from '@/lib/clubManager';

/* Club details use the saved owned squad for every career, including legacy
   saves. Rival clubs still use their current world roster. */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

const noop = () => {};
const screenText = (career: CareerState, club: string) =>
  render(<ClubDetailScreen clubName={club} career={career} onBack={noop} />).container.textContent ?? '';

/** A new (so seeded) Real Madrid career that has released one man, so it holds a world ledger too. */
function madridWithALedger(): { s: CareerState; gone: string } {
  const start: CareerState = withRoll(0.6, () => ({ ...startCareer('Real Madrid'), budget: 9999, wageCap: 9999, transferWindow: 'summer' as const }));
  expect(start.worldSeed).toBeDefined();
  const man = [...start.squad].filter(p => p.position !== 'GK' && !p.isYouth).find(p => releaseBlock(start, p) === null);
  expect(man).toBeDefined();
  const s = releasePlayer(start, man!.id);
  expect(s).not.toBeNull();
  expect(s!.worldRoster).toBeDefined();
  return { s: s!, gone: man!.name };
}

describe('the club screen reads my own club from my squad', () => {
  it('in a seeded career, my own club lists my squad, its best eleven and its worth', () => {
    const { s, gone } = madridWithALedger();
    /* Off the world roster my club is the men who are NOT mine: the test is only worth having while they exist. */
    const offWorld = oppRosterFor(s, 'Real Madrid');
    expect(offWorld.length).toBeGreaterThan(0);
    expect(offWorld.some(p => s.squad.some(q => q.name === p.n))).toBe(false);
    const text = screenText(s, 'Real Madrid');
    expect(text).toContain('your club');
    expect(text).toContain(`Squad (${s.squad.length} on the books)`);
    for (const p of s.squad) expect(text).toContain(p.name);
    for (const p of offWorld) expect(text).not.toContain(p.n);
    expect(text).not.toContain(gone);
    const best = [...s.squad].map(p => p.rating).sort((a, b) => b - a).slice(0, 11);
    expect(text).toContain(`${Math.round(best.reduce((a, r) => a + r, 0) / best.length)}Best XI`);
  });

  it('in a seeded career, a rival club still lists its world roster', () => {
    const { s } = madridWithALedger();
    const rival = oppRosterFor(s, 'Barcelona');
    expect(rival.length).toBeGreaterThan(11);
    expect(screenText(s, 'Barcelona')).toContain(`Squad (${rival.length} on the books)`);
  });

  it('a career from before the release reads its own club from its current saved squad', () => {
    const seeded = withRoll(0.6, () => startCareer('Real Madrid'));
    const old: CareerState = { ...seeded };
    delete old.worldSeed;
    expect(old.worldRoster).toBeUndefined();
    const projected = oppRosterFor(old, 'Real Madrid');
    expect(projected.length).toBeGreaterThan(0);
    expect(projected.length).not.toBe(old.squad.length);
    expect(screenText(old, 'Real Madrid')).toContain(`Squad (${old.squad.length} on the books)`);
  });
});

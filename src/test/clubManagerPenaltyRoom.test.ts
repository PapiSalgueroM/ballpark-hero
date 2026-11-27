import { beforeAll, describe, expect, it, vi } from 'vitest';
import { nextFixture, playNextEntry, runShootout, setShootoutOrder, shootoutSides, shootoutRosterSide, oppRosterFor, oppStrengthVsMe, startCareer, type CareerState } from '@/lib/clubManager';
import { rehearsalFixture } from '@/lib/clubManagerRehearsal';
import { keyedRng } from '@/lib/keyedRng';
import { beginPenalties, penaltyFixture, penaltyScore, readPenaltyRun, type PenaltyFixture } from '@/lib/clubManagerPenaltyRoom';

let career: CareerState;
let fixture: PenaltyFixture;
beforeAll(() => {
  const random = vi.spyOn(Math, 'random').mockImplementation(keyedRng('brentford-camp'));
  try {
    career = startCareer('Brentford');
    while (nextFixture(career).kind === 'window') career = playNextEntry(career).state;
    fixture = penaltyFixture(career)!;
  } finally { random.mockRestore(); }
});

function play(draw: number, order: string[], late = false) {
  const run = beginPenalties(fixture, draw, late);
  for (const id of order) {
    if (run.picks.includes(id) || penaltyScore(fixture, run).done) continue;
    run.picks.push(id);
  }
  return run;
}

describe('Penalty Room', () => {
  it('keeps revealed kicks fixed when choosing the next player, including the late takeover', () => {
    for (const late of [false, true]) for (let draw = 0; draw < 60; draw++) {
      const run = beginPenalties(fixture, draw, late);
      let score = penaltyScore(fixture, run);
      expect(score.kicks.filter(k => k.side === 'me')).toHaveLength(late ? 2 : 0);
      expect(score.done).toBe(false);
      for (const id of fixture.ids) {
        if (run.picks.includes(id) || score.done) continue;
        run.picks.push(id);
        const next = penaltyScore(fixture, run);
        expect(next.kicks.slice(0, score.kicks.length)).toEqual(score.kicks);
        expect(next.kicks[score.kicks.length].taker).toBe(fixture.players.find(p => p.id === id)!.name);
        expect(readPenaltyRun(JSON.stringify(run), fixture)).toEqual(run);
        score = next;
      }
      expect(score.done).toBe(true);
    }
  });

  it('reverses a shootout on the same rolls and uses the competitive engine and eligible order exactly', () => {
    const snapshot = JSON.stringify(career);
    const best = [...fixture.players].sort((a,b) => b.rating - a.rating).map(p => p.id);
    const worst = [...best].reverse();
    const fx = rehearsalFixture(career)!;
    const strength = oppStrengthVsMe(career, fx.fx.opponent);
    const theirs = shootoutRosterSide(oppRosterFor(career, fx.fx.opponent), strength);
    let winsReversed = 0;
    for (let draw = 0; draw < 200; draw++) {
      const a = play(draw, best), b = play(draw, worst);
      const score = penaltyScore(fixture, a), alternate = penaltyScore(fixture, b);
      if (score.mine > score.theirs && alternate.mine < alternate.theirs) winsReversed++;
      const applied = setShootoutOrder(career, a.picks)!;
      const tape = keyedRng('cm-penalty-room/' + draw);
      expect(runShootout({ ...shootoutSides(applied, applied.shootoutOrder!, fx.xi, theirs, strength), myFirst: tape() < 0.5 }, tape))
        .toEqual({ mine: score.mine, theirs: score.theirs, kicks: score.kicks });
      expect({ ...applied, shootoutOrder: career.shootoutOrder }).toEqual({ ...career, shootoutOrder: career.shootoutOrder });
    }
    expect(best).not.toEqual(worst);
    expect(winsReversed).toBeGreaterThan(0);
    expect(JSON.stringify(career)).toBe(snapshot);
  });

  it('rejects damaged, duplicate, expired and post-whistle calls', () => {
    const run = play(1, fixture.ids);
    const extra = fixture.ids.find(id => !run.picks.includes(id))!;
    for (const bad of [{ ...run, picks: [...run.picks, extra] }, { ...run, fixture: 'another match' },
      { ...run, picks: [fixture.ids[0], fixture.ids[0]] }, { ...run, picks: ['sold'] }, { ...run, baseline: [] },
      { ...run, late: true, picks: [] }, { ...run, draw: -1 }]) {
      expect(readPenaltyRun(JSON.stringify(bad), fixture)).toBeNull();
    }
    expect(readPenaltyRun('broken', fixture)).toBeNull();
  });
});

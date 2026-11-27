import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import TouchlineRehearsal from '@/components/club-manager/TouchlineRehearsal';
import { nextFixture, playNextEntry, setInstructions, startCareer, type CareerState } from '@/lib/clubManager';
import { REHEARSAL_KEY, matchCalls, readRehearsal, rehearseSpell, rehearsalFixture, rehearsalScore, startRehearsal, type RehearsalFixture } from '@/lib/clubManagerRehearsal';

let career: CareerState;
let fixture: RehearsalFixture;
beforeAll(() => {
  let seed = 151;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; });
  try {
    career = startCareer('Brentford');
    for (let i = 0; i < 6 && nextFixture(career).kind === 'window'; i++) career = playNextEntry(career).state;
    fixture = rehearsalFixture(career)!;
  } finally { random.mockRestore(); }
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Club Manager touchline rehearsal', () => {
  it('the real squad and opponent earn a draw or a loss on the same scoring rolls', () => {
    expect(fixture.fx.opponent).toBe('Tottenham');
    expect(fixture.xi).toHaveLength(11);
    const bytes = JSON.stringify(career);
    const run = startRehearsal(career, fixture, 'chase', 1);
    const chase = rehearsalScore(career, fixture, run, ['counter', 'counter']);
    const squeeze = rehearsalScore(career, fixture, run, ['squeeze', 'squeeze']);
    expect(chase).toMatchObject({ mine: 2, theirs: 2, achieved: true });
    expect(squeeze).toMatchObject({ mine: 2, theirs: 3, achieved: false });
    expect(squeeze.oppXg).toBeGreaterThan(chase.oppXg);
    expect(rehearsalScore(career, fixture, run, ['counter', 'counter'])).toEqual(chase);
    expect(JSON.stringify(career)).toBe(bytes);
    const lead = startRehearsal(career, fixture, 'protect', 0);
    expect(rehearsalScore(career, fixture, lead, ['standing', 'standing'])).toMatchObject({ mine: 1, theirs: 0, achieved: true });
    expect(rehearsalScore(career, fixture, lead, ['squeeze', 'squeeze'])).toMatchObject({ mine: 1, theirs: 1, achieved: false });
  });

  it('the other dugout reacts to the score at 75 and the game reads the actual available players', () => {
    const run = startRehearsal(career, fixture, 'chase', 1);
    const ahead = rehearseSpell(career, fixture, run, 'wide', 1, 2, 1);
    const behind = rehearseSpell(career, fixture, run, 'wide', 1, 0, 1);
    expect(ahead.oppXg).toBeGreaterThan(behind.oppXg);
    const tired = { ...career, squad: career.squad.map(p => ({ ...p, fitness: 48 })) };
    const fatigued = rehearsalFixture(tired)!;
    expect(fatigued.id).not.toBe(fixture.id);
    expect(rehearseSpell(tired, fatigued, run, 'squeeze', 0, 0, 1).ownXg).toBeLessThan(rehearseSpell(career, fixture, run, 'squeeze', 0, 0, 1).ownXg);
  });

  it('old saves enter without rehearsal data and corrupt or other-fixture checkpoints cannot resume', () => {
    const run = { ...startRehearsal(career, fixture, 'protect', 4), calls: ['wide'] };
    expect(readRehearsal(JSON.stringify(run), fixture.id)).toEqual(run);
    expect(readRehearsal(JSON.stringify(run), 'another fixture')).toBeNull();
    for (const raw of ['damaged', JSON.stringify({ ...run, calls: ['toString'] }), JSON.stringify({ ...run, calls: ['wide','standing','wide'] }),
      JSON.stringify({ ...run, brief: 'incorrect' }), JSON.stringify({ ...run, seed: 1.5 }), JSON.stringify({ ...run, standing: { press: 'high' } })]) expect(readRehearsal(raw, fixture.id)).toBeNull();
    expect(rehearsalFixture({ ...career, sacked: true })).toBeNull();
    expect(rehearsalFixture({ ...career, calendar: [] })).toBeNull();
  });

  it('resumes at 75, protects a newer tab and hands only the chosen instructions to the real kickoff', () => {
    const run = { ...startRehearsal(career, fixture, 'chase', 1), calls: ['counter'] };
    localStorage.setItem(REHEARSAL_KEY, JSON.stringify(run));
    const apply = vi.fn();
    render(<TouchlineRehearsal career={career} onApply={apply}/>);
    expect(screen.getByRole('heading', { name: /^75 minutes/ })).toBeVisible();
    const elsewhere = { ...run, calls: ['counter','counter'] };
    localStorage.setItem(REHEARSAL_KEY, JSON.stringify(elsewhere));
    fireEvent.click(screen.getByRole('button', { name: /^Squeeze the middle/ }));
    expect(screen.getByText(/changed in another tab/)).toBeVisible();
    expect(localStorage.getItem(REHEARSAL_KEY)).toBe(JSON.stringify(elsewhere));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply final call to team instructions' }));
    expect(apply).toHaveBeenCalledWith(matchCalls.counter.settings, career);
    const applied = setInstructions(career, matchCalls.counter.settings)!;
    expect({ ...applied, instructions: career.instructions }).toEqual({ ...career, instructions: career.instructions });
    expect(playNextEntry(applied).state.live?.instrLog?.[0]?.instructions).toEqual(matchCalls.counter.settings);
  });
});

import { describe, expect, it } from 'vitest';
import { createPracticeRun, giveUpPractice, guessPractice, nextPractice, parsePracticeRun, practiceFinished } from '@/lib/footlePracticeRun';
import { compareGuess } from '@/lib/gameLogic';
import { practicePlayers } from '@/test/fixtures/footlePracticePlayers';

describe('Footle practice model', () => {
  it.each(['easy', 'hard', 'insane'] as const)('selects five distinct %s answers excluding the daily', tier => {
    const daily = practicePlayers.find(player => player.difficulty === tier)!;
    const run = createPracticeRun(practicePlayers, tier, daily.name, () => 0.999)!;
    expect(run.targets).toHaveLength(5);
    expect(new Set(run.targets).size).toBe(5);
    expect(run.targets).not.toContain(daily.name);
    expect(run.targets.every(name => run.pool.find(player => player.name === name)?.difficulty === tier)).toBe(true);
  });

  it('refuses a short tier instead of borrowing another difficulty', () => {
    const pool = practicePlayers.filter(player => player.difficulty !== 'easy').concat(practicePlayers.slice(0, 4));
    expect(createPracticeRun(pool, 'easy', 'different daily')).toBeNull();
  });

  it('treats accent aliases as one identity for daily exclusion and distinct answers', () => {
    const pool = [{ ...practicePlayers[0], name: 'Fixture José' }, { ...practicePlayers[0], name: 'Fixture Jose' }, ...practicePlayers.slice(1)];
    const excluded = createPracticeRun(pool, 'easy', 'Fixture José', () => 0.999)!;
    expect(excluded.targets).not.toContain('Fixture Jose');
    expect(excluded.targets).not.toContain('Fixture José');
    const distinct = createPracticeRun(pool, 'easy', 'another daily', () => 0.999)!;
    expect(distinct.targets.filter(name => /Fixture Jos/.test(name))).toHaveLength(1);
    expect(parsePracticeRun(JSON.stringify(distinct))).toEqual(distinct);
  });

  it('caps misses and makes duplicate guesses and next inputs inert', () => {
    let run = createPracticeRun(practicePlayers, 'easy', 'different daily', () => 0)!;
    expect(nextPractice(run)).toBe(run);
    const wrong = run.pool.filter(player => player.name !== run.targets[0]);
    run = guessPractice(run, wrong[0].name);
    expect(guessPractice(run, wrong[0].name)).toBe(run);
    for (const player of wrong.slice(1, 8)) run = guessPractice(run, player.name);
    expect(run.rounds[0]).toEqual({ status: 'lost', guesses: wrong.slice(0, 8).map(player => player.name) });
    expect(guessPractice(run, run.targets[0])).toBe(run);
    run = nextPractice(run);
    expect(run.index).toBe(1);
    expect(nextPractice(run)).toBe(run);
    expect(practiceFinished(run)).toBe(false);
  });

  it('round trips a frozen pool and preserves null versus measured zero', () => {
    const source = practicePlayers.map(player => ({ ...player }));
    let run = createPracticeRun(source, 'hard', source[0].name, () => 0)!;
    run = guessPractice(run, run.targets[0]);
    source[0].club = 'Changed after the run';
    const restored = parsePracticeRun(JSON.stringify(run))!;
    expect(restored).toEqual(run);
    expect(restored.pool[0].club).toBe(practicePlayers[0].club);
    expect(restored.pool[0].assists).toBeNull();
    expect(restored.pool[1].assists).toBe(0);
    expect(restored.rounds[0].status).toBe('won');
  });

  it('rejects corrupt nested snapshots and impossible progress', () => {
    const run = createPracticeRun(practicePlayers, 'easy', 'different daily', () => 0)!;
    const corruptions = [
      (value: typeof run) => { value.pool[0].age = -1; },
      (value: typeof run) => { value.pool[0].goals = 'unknown' as never; },
      (value: typeof run) => { value.targets[1] = value.targets[0]; },
      (value: typeof run) => { value.targets[0] = practicePlayers.find(player => player.difficulty === 'hard')!.name; },
      (value: typeof run) => { value.rounds[0].guesses = ['not in pool']; },
      (value: typeof run) => { value.rounds[0].status = 'won'; },
      (value: typeof run) => { value.rounds[0].guesses = [value.targets[0]]; },
      (value: typeof run) => { value.index = 2; },
      (value: typeof run) => { value.rounds[4].status = 'lost'; },
    ];
    for (const corrupt of corruptions) {
      const value = structuredClone(run);
      corrupt(value);
      expect(parsePracticeRun(JSON.stringify(value))).toBeNull();
    }
    expect(parsePracticeRun('{')).toBeNull();
    expect(parsePracticeRun(null)).toBeNull();
  });

  it('finishes only after five outcomes and retains real attempt totals', () => {
    let run = createPracticeRun(practicePlayers, 'easy', 'different daily', () => 0)!;
    for (let index = 0; index < 5; index++) {
      run = index === 1 || index === 3 ? giveUpPractice(run) : guessPractice(run, run.targets[index]);
      if (index < 4) { expect(practiceFinished(run)).toBe(false); run = nextPractice(run); }
    }
    expect(practiceFinished(run)).toBe(true);
    expect(run.rounds.filter(round => round.status === 'won')).toHaveLength(3);
    expect(run.rounds.reduce((sum, round) => sum + round.guesses.length, 0)).toBe(3);
    expect(nextPractice(run)).toBe(run);
    expect(parsePracticeRun(JSON.stringify(run))).toEqual(run);
  });
});

describe('Footle factual clues', () => {
  it('compares known leagues and keeps either unknown league neutral', () => {
    const guess = practicePlayers[0], target = practicePlayers[1];
    expect(compareGuess(guess, target).cells.club.status).toBe('close');
    expect(compareGuess(guess, { ...target, league: 'La Liga' }).cells.club.status).toBe('incorrect');
    for (const [left, right] of [['Other', 'Other'], ['Other', 'Premier League'], ['Premier League', 'Other'], ['', 'Premier League']] as const) {
      expect(compareGuess({ ...guess, league: left as never }, { ...target, league: right }).cells.club.status).toBe('unknown');
    }
    expect(compareGuess({ ...guess, league: 'Other' }, { ...target, club: guess.club, league: 'Other' }).cells.club.status).toBe('correct');
  });

  it('places Guinea-Bissau with Africa rather than European nationality clues', () => {
    const guess = { ...practicePlayers[0], nationality: 'Guinea-Bissau' };
    expect(compareGuess(guess, { ...practicePlayers[1], nationality: 'Senegal' }).cells.nationality.status).toBe('close');
    expect(compareGuess(guess, { ...practicePlayers[1], nationality: 'Norway' }).cells.nationality.status).toBe('incorrect');
  });

  it('keeps unknown goals and assists neutral while real zero still compares', () => {
    for (const field of ['goals', 'assists'] as const) {
      for (const [left, right] of [[null, 0], [0, null], [null, null], [null, 12], [12, null]]) {
        const cell = compareGuess({ ...practicePlayers[0], [field]: left }, { ...practicePlayers[1], [field]: right }).cells[field];
        expect(cell.status).toBe('unknown');
        expect(cell.arrow).toBeUndefined();
        expect(cell.value).toBe(left === null ? '?' : String(left));
      }
      expect(compareGuess({ ...practicePlayers[0], [field]: 0 }, { ...practicePlayers[1], [field]: 0 }).cells[field]).toMatchObject({ value: '0', status: 'correct' });
      expect(compareGuess({ ...practicePlayers[0], [field]: 0 }, { ...practicePlayers[1], [field]: 2 }).cells[field]).toMatchObject({ value: '0', status: 'close', arrow: 'up' });
    }
  });
});

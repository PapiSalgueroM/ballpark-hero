import { describe, expect, it } from 'vitest';
import { factCheckDate, finals, independentSource, pilotSports, type PilotSport } from '@/data/sportChallengePilot';
import { createPilotRun, currentPilotPrompt, pilotRecap, pilotScore, pilotStorageKey, readPilotRun, updatePilotRun, type PilotRun } from '@/lib/sportChallengePilot';

const start = Date.parse('2026-11-26T16:00:00Z');
const day = 86400000;

function play(run: PilotRun, text: string) {
  return updatePilotRun(run, {type: 'answer', text}, run.startedAt + 100).run;
}

function finish(run: PilotRun) {
  while (!run.completed) {
    const q = currentPilotPrompt(run)!;
    const available = q.finalists.find(team => !run.answers.some(answer => answer.answerId === team));
    expect(available).toBeTruthy();
    run = play(run, available!);
  }
  return run;
}

describe.each(pilotSports)('%s Finals preview', sport => {
  it('rotates six solvable questions with two of each difficulty, whatever previous finalists were chosen', () => {
    const seen = new Set<string>();
    const coverage = new Set<string>();
    for (let offset = 0; offset < 366; offset++) {
      const now = start + day * offset;
      const run = createPilotRun(sport, 'daily', now);
      const deal = run.order.map(id => finals[sport].find(([year]) => id === String(year))!);
      expect(deal.map(row => row[1]).sort()).toEqual([10, 10, 15, 15, 20, 20]);
      for (const row of deal) {
        coverage.add(String(row[0]));
        expect(row.slice(2).some(team => deal.every(other => other === row || !other.slice(2).includes(team)))).toBe(true);
      }
      seen.add(run.order.join('/'));
    }
    expect(seen.size).toBeGreaterThan(300);
    expect(coverage.size).toBe(finals[sport].length);
    expect(factCheckDate).toBe('2026-11-26');
    expect(independentSource[sport]).toMatch(/^https:/);
  });

  it('preserves a deferred board, points and one terminal receipt across reload and repeated answers', () => {
    const original = createPilotRun(sport, 'daily', start);
    const initial = currentPilotPrompt(original)!;
    const answered = play(original, initial.finalists[0]);
    const deferred = updatePilotRun(answered, {type: 'defer'}, start + 200).run;
    expect(deferred.order.at(-1)).toBe(original.order[1]);
    expect(updatePilotRun(deferred, {type: 'defer'}, start + 300).run).toBe(deferred);
    const resumed = readPilotRun(JSON.stringify(deferred), sport, 'daily', start + 400)!;
    expect(resumed).toEqual(deferred);
    const complete = finish(resumed);
    expect(pilotScore(complete)).toBe(100);
    expect(pilotRecap(complete)).toHaveLength(6);
    expect(pilotRecap(complete).every(row => row.answer && row.finalists.includes(row.answer) && row.sourceUrl.startsWith('https:'))).toBe(true);
    expect(play(complete, initial.finalists[0])).toBe(complete);
    expect(readPilotRun(JSON.stringify(complete), sport, 'daily', start + 70000)).toEqual(complete);
  });

  it('uses an absolute deadline, rejects late submissions, and offers a fresh edition at Eastern midnight', () => {
    const beforeMidnight = Date.parse('2026-11-26T04:59:55Z');
    const run = createPilotRun(sport, 'daily', beforeMidnight);
    const q = currentPilotPrompt(run)!;
    expect(run.day).toBe('2026-11-25');
    expect(run.deadline).toBe(beforeMidnight + 5000);
    const closed = updatePilotRun(run, {type: 'answer', text: q.finalists[0]}, run.deadline).run;
    expect(closed.completed).toBe(true);
    expect(pilotScore(closed)).toBe(0);
    expect(readPilotRun(JSON.stringify(run), sport, 'daily', run.deadline)).toBeNull();
    const practice = createPilotRun(sport, 'practice', beforeMidnight);
    expect(practice.deadline).toBe(beforeMidnight + 60000);
    expect(readPilotRun(JSON.stringify(practice), sport, 'practice', practice.deadline)?.completed).toBe(true);
    expect(pilotRecap(run)).toEqual([]);
  });

  it('isolates practice, ignores altered scores, and rejects mismatched identities and shuffled saves', () => {
    const boards = Array.from({length: 64}, (_, i) => createPilotRun(sport, 'practice', start + i).order.join('/'));
    expect(new Set(boards).size).toBeGreaterThan(24);
    expect(pilotStorageKey(sport, 'daily')).not.toBe(pilotStorageKey(sport, 'practice'));
    const run = createPilotRun(sport, 'daily', start);
    expect(createPilotRun(sport, 'daily', start + 1000).order).toEqual(run.order);
    expect(readPilotRun(JSON.stringify(run), sport, 'practice', start)).toBeNull();
    const q = currentPilotPrompt(run)!;
    for (const invalid of ['', '  ', '.', 'definitely a different team']) expect(play(run, invalid)).toBe(run);
    const answered = play(run, q.finalists[0]);
    const forged = {...answered, answers: [{...answered.answers[0], points: 1000}]};
    expect(pilotScore(readPilotRun(JSON.stringify(forged), sport, 'daily', start)!)).toBe(q.points);
    expect(readPilotRun(JSON.stringify({...run, order: [...run.order].reverse()}), sport, 'daily', start)).toBeNull();
    expect(readPilotRun(JSON.stringify({...run, answers: [{promptId: q.id, answerId: 'Unknown'}]}), sport, 'daily', start)).toBeNull();
  });
});

it('accepts accents and common nicknames and rejects a repeat even when the team reached both finals', () => {
  const locate = (sport: PilotSport, id: string) => {
    for (let n = 0; n < 500; n++) {
      const run = createPilotRun(sport, 'practice', start + n);
      if (run.order[0] === id) return run;
    }
    throw Error('Missing opening prompt ' + id);
  };
  const bucs = locate('nfl', '2021');
  expect(currentPilotPrompt(bucs)!.text).toContain('played in 2021');
  expect(play(bucs, 'Bucs').answers[0].answerId).toBe('Tampa Bay Buccaneers');
  expect(play(bucs, 'Rams')).toBe(bucs);
  const rams = locate('nfl', '2022');
  expect(play(rams, 'Los Angeles')).toBe(rams);
  expect(play(rams, 'LA Rams').answers[0].answerId).toBe('Los Angeles Rams');
  const giants = locate('nfl', '2008');
  expect(play(giants, 'NY')).toBe(giants);
  expect(play(giants, 'New York')).toBe(giants);
  expect(play(giants, 'NYG').answers[0].answerId).toBe('New York Giants');
  const spain = locate('soccer', '2010');
  expect(play(spain, ' ESpaÑa ').answers[0].answerId).toBe('Spain');
  const cavs = locate('nba', '2016');
  expect(play(cavs, 'cavs').answers[0].answerId).toBe('Cleveland Cavaliers');
  let found = false;
  for (let n = 0; n < 2000 && !found; n++) {
    let run = createPilotRun('nba', 'practice', start + n);
    while (!run.completed) {
      const q = currentPilotPrompt(run)!;
      const repeated = q.finalists.find(team => run.answers.some(a => a.answerId === team));
      if (repeated) {
        expect(play(run, repeated)).toBe(run);
        found = true;
        break;
      }
      run = play(run, q.finalists[0]);
    }
  }
  expect(found).toBe(true);
});

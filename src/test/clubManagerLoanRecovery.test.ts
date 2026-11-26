import { afterEach, expect, it, vi } from 'vitest';
import { entryDatesOf } from '@/lib/clubManagerCalendar';
import { addDays, daysBetween, isoDate } from '@/lib/calDate';
import { loadCareer, loanOutPlayer, loanOutRefusal, playNextEntry, recallLoanedPlayer, startCareer } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';

afterEach(() => vi.restoreAllMocks());

it('serves a minor injury on real fixture days and recalls a fit loanee in January after reload', () => {
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('loan-health-calendar'));
  const c = startCareer('Manchester City');
  const [p, fresh, rehab] = c.squad.filter(m => m.position !== 'GK' && !loanOutRefusal(c, m.id));
  const returnDate = isoDate(addDays(entryDatesOf(c)[0], 350));
  c.squad = c.squad.map(m => m === p ? { ...m, fitness: 37, injuryWeeks: 3 } : m === fresh ? { ...m, fitness: 91, injuryWeeks: 0 } :
    m === rehab ? { ...m, fitness: 60, injuryWeeks: 50, majorInjury: { kind: 'acl', returnDate } } : m);
  const injured = loanOutPlayer(c, p.id, 'Brentford', undefined, 'straight')!;
  const rested = loanOutPlayer(injured, fresh.id, 'Brighton', undefined, 'straight')!;
  let s = loanOutPlayer(rested, rehab.id, 'Fulham', undefined, 'straight')!;
  const dates = entryDatesOf(s), read = () => s.loanedOut!.find(l => l.player.id === p.id)!;
  expect(read().player).toMatchObject({ fitness: 37, injuryWeeks: 3 });
  let observedPartial = false;
  while (s.week < s.calendar.length && s.transferWindow !== 'january') {
    const previous = s.week, old = JSON.stringify(s.loanedOut);
    const played = playNextEntry(s, { noCoach: true, skipHalftime: true, untilWeek: previous + 1 }).state;
    expect(JSON.stringify(s.loanedOut)).toBe(old);
    s = played;
    expect(s.week).toBeGreaterThan(previous);
    const elapsed = dates[s.week] && daysBetween(dates[0], dates[s.week]);
    if (elapsed !== undefined && elapsed > 0 && elapsed < 21) {
      expect(read().player.injuryWeeks).toBe(3 - Math.floor(elapsed / 7));
      if (elapsed % 7 > 0) {
        observedPartial = true;
        expect(read().injuryRecoveryDays).toBe(elapsed % 7);
        const stored = JSON.stringify(s);
        s = loadCareer(stored)!;
        expect(read().injuryRecoveryDays).toBe(elapsed % 7);
      }
    }
  }
  expect(observedPartial).toBe(true);
  expect(s.transferWindow).toBe('january');
  expect(read().player).toMatchObject({ fitness: 80, injuryWeeks: 0 });
  expect(read().injuryRecoveryDays).toBeUndefined();
  expect(s.loanedOut!.find(l => l.player.id === fresh.id)!.player).toMatchObject({ fitness: 91, injuryWeeks: 0 });
  const longInjury = s.loanedOut!.find(l => l.player.id === rehab.id)!.player;
  expect(longInjury.majorInjury?.returnDate).toBe(returnDate);
  expect(longInjury.injuryWeeks).toBeGreaterThan(0);
  expect(longInjury.injuryWeeks).toBeLessThan(50);
  const recalled = recallLoanedPlayer(loadCareer(JSON.stringify(s))!, p.id)!;
  expect(recalled.squad.find(m => m.name === p.name)).toMatchObject({ fitness: 80, injuryWeeks: 0 });
  expect(loadCareer(JSON.stringify(recalled))!.squad.find(m => m.name === p.name)?.fitness).toBe(80);
});

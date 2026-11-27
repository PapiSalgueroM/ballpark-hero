import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AcademyMentoringCard from '@/components/club-manager/AcademyMentoringCard';
import { ensureAcademy, groupOf, loadCareer, playNextEntry, promoteProspect, SAVE_KEY, saveCareer, startCareer } from '@/lib/clubManager';
import { academyMentors, canStartMentoring, recordMentoringMatch, restoreMentoring, startMentoring } from '@/lib/clubManagerMentoring';
import { keyedRng } from '@/lib/keyedRng';
import { saveFence } from '@/lib/saveFence';

beforeEach(() => { localStorage.clear(); saveFence.release(SAVE_KEY); vi.spyOn(Math, 'random').mockImplementation(keyedRng('senior-mentoring')); });
afterEach(() => { saveFence.release(SAVE_KEY); vi.restoreAllMocks(); });

function family() {
  const initial = startCareer('Crystal Palace');
  ensureAcademy(initial);
  const senior = initial.squad.find(p => p.position !== 'GK' && !p.onLoan && p.age >= 27)!;
  initial.academy!.prospects.push({ id: 'mentor-pupil', name: 'Academy prospect', position: senior.position, age: 17, rating: 62,
    potential: 70, lowGuess: 63, highGuess: 72, source: 'Academy', flag: '', fee: 0, season: initial.season });
  const c = promoteProspect(initial, 'mentor-pupil')!;
  const kid = c.squad.find(p => p.id === 'ac-mentor-pupil')!;
  const start = () => startMentoring(c, c.clubName, c.season, kid.id, senior.id)!;
  return { c, kid, senior, start };
}

it('records real overlapping stints, settles the exact boundary once, and restores the report', () => {
  const { kid, senior, start } = family();
  const c = start(), id = kid.id, old = kid.rating;
  recordMentoringMatch(c, 1, 'First opponent', { startXi: [id, senior.id] });
  const replacement = { off: senior.name, offId: senior.id, on: kid.name, onId: id, minute: 55 };
  recordMentoringMatch(c, 2, 'Second opponent', { startXi: [senior.id], subs: [replacement] });
  recordMentoringMatch(c, 3, 'Third opponent', { startXi: [id, senior.id], h1Cards: [{ id, name: kid.name, minute: 30, kind: 'red' }] });
  recordMentoringMatch(c, 3, 'Third opponent', { startXi: [id, senior.id] });
  expect(c.academy!.mentoring!.matches.map(m => m.minutes)).toEqual([90, 0, 30]);
  expect(c.squad.find(p => p.id === id)!.rating).toBe(old);
  expect(saveCareer(c)).toBe(true);
  const resumed = loadCareer()!;
  expect(recordMentoringMatch(resumed, 4, 'Fourth opponent', { startXi: [id] })).toContain('earned +1 OVR after 120 shared league minutes');
  expect(recordMentoringMatch(resumed, 4, 'Fourth opponent', { startXi: [id, senior.id] })).toBeUndefined();
  expect(resumed.squad.find(p => p.id === id)!.rating).toBe(old + 1);
  expect(resumed.academy!.mentoring!.gain).toBe(1);
  expect(saveCareer(resumed)).toBe(true);
  expect(loadCareer()!.academy!.mentoring).toEqual(resumed.academy!.mentoring);
  expect(startMentoring(resumed, resumed.clubName, resumed.season, id, senior.id)).toBeNull();
});

it('measures missed minutes, enforces the ceiling, and refuses an invalid or stale signing', () => {
  const { c, kid, senior, start } = family();
  const original = JSON.stringify(c);
  recordMentoringMatch(c, 1, 'First opponent', { startXi: [kid.id, senior.id] });
  expect(JSON.stringify(c)).toBe(original);
  expect(saveCareer(c)).toBe(true);
  expect(loadCareer()!.academy!.mentoring).toBeUndefined();
  expect(startMentoring(c, 'Another club', c.season, kid.id, senior.id)).toBeNull();
  expect(startMentoring(c, c.clubName, c.season + 1, kid.id, senior.id)).toBeNull();
  const outsider = c.squad.find(p => groupOf(p.position) !== groupOf(kid.position))!;
  expect(startMentoring(c, c.clubName, c.season, kid.id, outsider.id)).toBeNull();
  expect(canStartMentoring({ ...c, week: c.calendar.length - 1 })).toBe(false);
  for (const atCapacity of [false, true]) {
    const season = start(), p = season.squad.find(p => p.id === kid.id)!;
    if (atCapacity) p.potential = p.rating;
    for (let i = 1; i <= 4; i++) {
      recordMentoringMatch(season, i, 'Opponent ' + i, { startXi: [p.id, senior.id],
        h1Injuries: atCapacity ? [] : [{ id: senior.id, name: senior.name, weeks: 1, minute: 29 }] });
    }
    expect(season.academy!.mentoring!.matches.map(m => m.minutes)).toEqual(Array(4).fill(atCapacity ? 90 : 29));
    expect(season.academy!.mentoring!.gain).toBe(0);
    expect(p.rating).toBe(62);
  }
  const invalid = start();
  invalid.academy!.mentoring!.matches = [{ round: 1, opponent: 'Invalid score', minutes: 91 }];
  restoreMentoring(invalid);
  expect(invalid.academy!.mentoring).toBeUndefined();
  expect(invalid.squad).toHaveLength(c.squad.length);
});

it('offers the pairing, then advances it only when the real manager engine settles a league game', () => {
  const { c, kid, senior, start } = family();
  expect(academyMentors(c, kid).some(p => p.id === senior.id)).toBe(true);
  const onStart = vi.fn(() => true);
  const view = render(<AcademyMentoringCard career={c} onStart={onStart} />);
  fireEvent.click(screen.getByText('First-team mentoring'));
  fireEvent.change(screen.getByLabelText('Senior mentor'), { target: {value: senior.id} });
  fireEvent.click(screen.getByRole('button', {name: 'Start four-match plan'}));
  expect(onStart).toHaveBeenCalledWith(kid.id, senior.id);
  let season = start();
  let league = 0;
  while (league < 4 && season.week < season.calendar.length) {
    const oldWeek = season.week;
    season = playNextEntry(season, { skipHalftime: true, noCoach: true, untilWeek: oldWeek + 1 }).state;
    expect(season.week).toBeGreaterThan(oldWeek);
    league += season.calendar.slice(oldWeek, season.week).filter(entry => entry.type === 'league').length;
    expect(season.academy!.mentoring!.matches).toHaveLength(league);
  }
  expect(league).toBe(4);
  view.rerender(<AcademyMentoringCard career={season} onStart={onStart} />);
  expect(screen.getByText(/4\/4 league games/)).toBeVisible();
  expect(screen.queryByRole('button', {name: 'Start four-match plan'})).toBeNull();
}, 60000);

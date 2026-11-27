import { describe, expect, it } from 'vitest';
import { uniqueUfcFighters } from '@/data/ufcFighters';
import { keyedRng } from '@/lib/keyedRng';
import { canPlaceDebut, debutRound, debutScore, newDebutRun, placeDebut, readDebutRun, replayDebuts, scoutDebut, scoutsLeft, TIMELINE_ROUNDS } from '@/lib/ufcDebutTimeline';

const year = (name: string) => Number(uniqueUfcFighters.find(fighter => fighter.name === name)!.yearsActive.split('-')[0]);

describe('UFC debut timeline', () => {
  it('deals distinct verified years and rewards the real chronology over a matched wrong placement on every card', () => {
    const dealt = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      let win = newDebutRun(keyedRng('timeline ' + seed));
      let loss = win;
      const years = win.names.map(year);
      expect(new Set(years).size).toBe(7);
      expect(Math.min(...years)).toBeLessThan(2005);
      expect(Math.max(...years)).toBeGreaterThanOrEqual(2015);
      win.names.forEach(name => dealt.add(name));
      for (let i = 0; i < TIMELINE_ROUNDS; i++) {
        const round = debutRound(win);
        const slot = years.slice(0, i + 2).filter(value => value < years[i + 2]).length;
        expect(round.gaps).toContain(slot);
        const wrong = round.gaps.find(n => n !== slot);
        expect(wrong).toBeDefined();
        win = placeDebut(win, slot);
        loss = placeDebut(loss, wrong!);
      }
      expect(debutScore(win)).toBe(100);
      expect(debutScore(loss)).toBe(0);
      expect(replayDebuts(win)).toEqual({ ...replayDebuts(loss), previous: 100 });
      expect(debutRound(win).known.map(card => card.year)).toEqual([...years].sort((a,b) => a-b));
    }
    expect(dealt.size).toBe(uniqueUfcFighters.length);
  });

  it('makes scouts rule out a real alternative and charge ten points, surviving a reload before placement', () => {
    let run = newDebutRun(keyedRng('use the scouts'));
    for (let i = 0; i < TIMELINE_ROUNDS; i++) {
      const round = debutRound(run);
      if (i < 2) {
        run = scoutDebut(run);
        expect(scoutDebut(run)).toBe(run);
        const blocked = round.gaps.find(slot => !canPlaceDebut(run, slot));
        expect(blocked).toBeDefined();
        expect(placeDebut(run, blocked!)).toBe(run);
        expect(readDebutRun(JSON.stringify(run))).toEqual(run);
      } else {
        expect(scoutsLeft(run)).toBe(0);
        expect(scoutDebut(run)).toBe(run);
      }
      run = placeDebut(run, round.answer);
    }
    expect(debutScore(run)).toBe(80);
    expect(placeDebut(run, 0)).toBe(run);
    expect(replayDebuts(run)).toMatchObject({ names: run.names, placements: [], previous: 80 });
  });

  it('rejects unknown fighters, shared years and impossible saved actions', () => {
    const run = newDebutRun(keyedRng('restore'));
    const invalid = (patch: object) => expect(readDebutRun(JSON.stringify({ ...run, ...patch }))).toBeNull();
    invalid({ names: [...run.names.slice(0, 6), 'No such fighter'] });
    invalid({ names: [...run.names.slice(0, 6), run.names[0]] });
    invalid({ placements: [{ slot: 99, scouted: false }] });
    const scouted = scoutDebut(run);
    invalid({ placements: [{ slot: debutRound(run).gaps.find(slot => !canPlaceDebut(scouted, slot)), scouted: true }] });
    expect(readDebutRun('null')).toBeNull();
    expect(readDebutRun('{')).toBeNull();
    expect(replayDebuts(run)).toBe(run);
  });
});

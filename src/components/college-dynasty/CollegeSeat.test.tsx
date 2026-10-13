/**
 * Round 1320: the athletic director on both college boards, in jsdom, with
 * seeded saves built from the real engines. The held fixture
 * (collegeDynastyFixture.test.tsx) proves he changes nothing else; this file
 * proves what he does: the ask on the tile in the pack's words, the card and
 * its rules with Back, the live line read off the record, the grade and trust
 * on the recap, the offer to an older dynasty and "Not now" writing nothing,
 * and a block that does not check out loading as an old save.
 */
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import { initCfb } from '@/lib/cfbDynasty';
import { initCbb } from '@/lib/cbbDynasty';
import { cfbSeatBinding } from '@/lib/cfbSeatBind';
import { cbbSeatBinding } from '@/lib/cbbSeatBind';
import { collegeTileView, newCollegeSeat } from '@/lib/collegeSeat';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface Sport {
  name: 'cfb' | 'cbb'; Board: ComponentType; key: string; school: string; label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init: (id: string, rng: () => number, opts?: { depth?: boolean }) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  binding: any;
}
const SPORTS: Sport[] = [
  { name: 'cfb', Board: CfbDynastyBoard, key: 'cfb-dynasty-save-v1', school: 'ALA', label: 'Alabama', init: initCfb, binding: cfbSeatBinding },
  { name: 'cbb', Board: CbbDynastyBoard, key: 'cbb-dynasty-save-v1', school: 'UK', label: 'Kentucky', init: initCbb, binding: cbbSeatBinding },
];
const PLAY = /^(Play (Week|Round) \d+|Final week \+ the Playoff|Final round \+ March)$/;
const txt = (el: Element) => (el.textContent ?? '').trim();

function mount(sport: Sport, save?: unknown) {
  localStorage.clear();
  if (save !== undefined) localStorage.setItem(sport.key, JSON.stringify(save));
  const view = render(<sport.Board />);
  const q = (sel: string) => view.container.querySelector(sel);
  const buttons = () => [...view.container.querySelectorAll('button')];
  const button = (want: string | RegExp) => {
    const b = buttons().find(x => (typeof want === 'string' ? txt(x) === want : want.test(txt(x))));
    if (!b) throw new Error(`no button ${String(want)}`);
    return b;
  };
  const saved = () => JSON.parse(localStorage.getItem(sport.key) ?? 'null');
  return { view, q, button, buttons, saved };
}

describe('Round 1320: the athletic director on the college boards', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  for (const sport of SPORTS) {
    it(`${sport.name}: a new dynasty starts with him, the tile carries the ask, and the card opens and closes`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1320));
      const m = mount(sport);
      expect(m.q('[data-college-seat="pick"]')).toBeTruthy();
      fireEvent.click(m.button(new RegExp(`^${sport.label}Prestige`)));
      const st = m.saved().st;
      expect(st.seat?.v).toBe(1);
      const tile = m.q('[data-college-seat="tile"]')!;
      expect(tile).toBeTruthy();
      expect(txt(tile)).toContain(st.seat.mandate.text);
      expect(Object.values(GM_SEAT_PACKS[sport.name].asks).some(a => a.split('{')[0] && st.seat.mandate.text.startsWith(a.split('{')[0]))).toBe(true);
      expect(txt(tile)).toContain('Trust 60');
      fireEvent.click(tile);
      expect(m.q('[data-college-seat="card"]')).toBeTruthy();
      expect(m.buttons().some(b => txt(b) === 'Play')).toBe(true);
      fireEvent.click(m.view.container.querySelector('[aria-label="How the athletic director works"]')!);
      const rules = m.q('[data-college-seat="rules"]')!;
      expect(txt(rules)).toContain('Trust starts at 60 of 100');
      fireEvent.click(m.button(/Back$/));
      expect(m.q('[data-college-seat="card"]')).toBeTruthy();
      fireEvent.click(m.button(/Back$/));
      expect(m.q('[data-college-seat="card"]')).toBeNull();
      expect(m.q('[data-college-seat="tile"]')).toBeTruthy();
    });

    it(`${sport.name}: the live line follows the record, and the recap grades the year and moves trust`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1321));
      const m = mount(sport);
      fireEvent.click(m.button(new RegExp(`^${sport.label}Prestige`)));
      fireEvent.click(m.button('Play'));
      for (let i = 0; i < 30 && !m.q('[data-college-seat="recap"]'); i += 1) {
        const st = m.saved().st;
        const want = collegeTileView(st.seat, sport.binding.view(st));
        expect(txt(m.q('[data-college-seat="tile"]')!)).toContain(want!.line);
        fireEvent.click(m.button(PLAY));
      }
      const recap = m.q('[data-college-seat="recap"]')!;
      expect(recap).toBeTruthy();
      const st = m.saved().st;
      const s = st.seat.career.stints[0];
      expect(s.grades.length).toBe(1);
      expect(txt(recap)).toContain(`Trust upstairs: ${st.seat.trust} of 100`);
      const verdict = GM_SEAT_PACKS[sport.name].verdicts[s.grades[0] as 'met'];
      expect(txt(recap)).toContain(verdict.replace(/\{\w+\}/g, '').slice(0, 12));
      expect(m.buttons().some(b => txt(b).includes('Hit the recruiting trail'))).toBe(true);
    });

    it(`${sport.name}: an older dynasty is offered him at the first press; Not now writes nothing, Take the ask writes the block`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1322));
      const plain = { st: sport.init(sport.school, lehmer(7)), phase: 'season', recruits: null, portal: null };
      const m = mount(sport, plain);
      const before = localStorage.getItem(sport.key);
      expect(m.q('[data-college-seat="optin"]')).toBeTruthy();
      expect(txt(m.q('[data-college-seat="optin"]')!)).toContain('Trust at zero gets you let go');
      fireEvent.click(m.button('Not now'));
      expect(localStorage.getItem(sport.key)).toBe(before);
      expect(m.q('[data-college-seat="optin"]')).toBeNull();
      expect(m.q('[data-college-seat="passed"]')).toBeTruthy();
      cleanup();
      const again = mount(sport, plain);
      fireEvent.click(again.button('Take the ask'));
      expect(again.saved().st.seat.v).toBe(1);
      expect(again.q('[data-college-seat="tile"]')).toBeTruthy();
    });

    it(`${sport.name}: a block that does not check out loads as an old save, never a crash`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1323));
      const st = sport.init(sport.school, lehmer(8), { depth: true });
      const good = newCollegeSeat(sport.binding.view(st));
      for (const bad of [{ ...good, trust: 140 }, { ...good, trust: -5 }, { ...good, trust: '60' }, { ...good, career: { version: 1, stints: [], seasonsOut: 0 } }, 'seat']) {
        cleanup();
        const m = mount(sport, { st: { ...st, seat: bad }, phase: 'season', recruits: null, portal: null });
        expect(m.q('[data-college-seat="optin"]')).toBeTruthy();
        expect(m.q('[data-college-seat="tile"]')).toBeNull();
      }
    });
  }
});

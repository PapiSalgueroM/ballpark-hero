/**
 * Round 631: a cut costs dead money on all four front office boards.
 *
 * The engine rule is fenced by scripts/simFrontOfficeCuts.mjs. This is the
 * board, one parameterised file over the four sims the way
 * FrontOfficeSeasonClose.test.tsx is: the cut button quotes the dead money
 * before the first tap, the second tap is only offered with the whole cost
 * on screen, the save only moves on the second tap, the cap or payroll line
 * shows the dead money once there is some, and a man you cut this season
 * sits in the pool with the reason beside him and his Sign button greyed
 * while everybody else stays signable.
 *
 * Same setup as the season close test: a save from the real engine under a
 * seeded rng, the real board rendered on it, the save read back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague } from '@/lib/frontOffice';
import { initNbaLeague } from '@/lib/nbaFrontOffice';
import { initMlbLeague } from '@/lib/mlbFrontOffice';
import { initNhlLeague } from '@/lib/nhlFrontOffice';
import { deadMoneyFor } from '@/lib/frontOfficeCuts';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface BoardCase {
  name: string;
  load: () => Promise<{ default: ComponentType }>;
  saveKey: string;
  init: (rng: () => number) => any;
  /** Each sport's own words on the board, in the order the screen uses them. */
  verb: string;      // the button before the tap: "Cut", "DFA", "Waive"
  doIt: string;      // the confirm button: "Cut him", "DFA him", "Waive him"
  said: string;      // the refusal beside the greyed Sign button
  line: RegExp;      // the cap or payroll line
  floor: number;     // the roster floor, so the fixture team is above it
}

const CASES: BoardCase[] = [
  {
    name: 'NFL Front Office', load: () => import('@/components/front-office/FrontOfficeBoard'),
    saveKey: 'front-office-save-v1', init: initLeague,
    verb: 'Cut', doIt: 'Cut him', said: 'You cut him this season. He can come back after the offseason.',
    line: /cap \$/, floor: 6,
  },
  {
    name: 'NBA Front Office', load: () => import('@/components/nba-front-office/NbaFrontOfficeBoard'),
    saveKey: 'nba-front-office-save-v1', init: initNbaLeague,
    verb: 'Waive', doIt: 'Waive him', said: 'You waived him this season. He can come back after the offseason.',
    line: /Payroll \$/, floor: 8,
  },
  {
    name: 'MLB Front Office', load: () => import('@/components/mlb-front-office/MlbFrontOfficeBoard'),
    saveKey: 'mlb-front-office-save-v1', init: initMlbLeague,
    verb: 'DFA', doIt: 'DFA him', said: 'You designated him for assignment this season. He can come back after the offseason.',
    line: /Payroll \$/, floor: 9,
  },
  {
    name: 'NHL Front Office', load: () => import('@/components/nhl-front-office/NhlFrontOfficeBoard'),
    saveKey: 'nhl-front-office-save-v1', init: initNhlLeague,
    verb: 'Waive', doIt: 'Waive him', said: 'You waived him this season. He can come back after the offseason.',
    line: /Cap hit \$/, floor: 8,
  },
];

const rosterRow = (id: string) => document.querySelector(`[data-roster-row="${id}"]`) as HTMLElement;
const faRow = (id: string) => document.querySelector(`[data-fa-row="${id}"]`) as HTMLElement;

for (const c of CASES) {
  const { default: Board } = await c.load();
  const read = (): any => JSON.parse(localStorage.getItem(c.saveKey)!);

  describe(`${c.name}: a cut costs dead money on the board`, () => {
    let restoreRandom: (() => void) | null = null;
    beforeEach(() => {
      localStorage.clear();
      const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
      restoreRandom = () => spy.mockRestore();
    });
    afterEach(() => { cleanup(); restoreRandom?.(); });

    /* A fresh league, the GM on a team above the roster floor, and his
       dearest man with years left. liftCap raises the league's line so the
       market test can prove somebody else is still signable: the NBA ships
       most clubs over the cap, and the claim there is about the refusal, not
       the room. */
    const setup = (liftCap = false) => {
      const league = c.init(lehmer(7));
      const team = Object.keys(league.teams).find(a => league.teams[a].players.length > c.floor)!;
      const target = [...league.teams[team].players].filter((p: any) => p.years >= 2).sort((a: any, b: any) => b.salary - a.salary)[0];
      if (liftCap) league.cap += 1000;
      localStorage.setItem(c.saveKey, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
      render(<Board />);
      return { team, target, cost: deadMoneyFor(target) };
    };
    const armLabel = (now: number) => `${c.verb}, $${now}M dead`;

    it('quotes the dead money before the tap, asks twice, and only then charges it', () => {
      const { team, target, cost } = setup();
      fireEvent.click(screen.getByText('Roster'));
      const row = rosterRow(target.id);
      expect(row, `${c.name}: no roster row for ${target.name}`).toBeTruthy();
      /* the price is on the button before anything is tapped */
      const cut = within(row).getByText(armLabel(cost.now));
      expect(row.querySelector('[data-cut-confirm]')).toBeNull();

      fireEvent.click(cut);
      const confirm = row.querySelector('[data-cut-confirm]') as HTMLElement;
      expect(confirm).toBeTruthy();
      expect(confirm.textContent).toContain(`$${cost.now}M of his $${target.salary}M stays on this season's`);
      expect(confirm.textContent).toContain(`$${cost.next}M lands on next season's`);
      expect(confirm.textContent).toContain('cannot sign him back until the offseason');
      /* one tap changed nothing on the save */
      expect(read().league.teams[team].players.some((p: any) => p.id === target.id)).toBe(true);
      expect(read().league.teams[team].deadCap).toBeUndefined();

      /* keeping him closes the question */
      fireEvent.click(within(confirm).getByText('Keep him'));
      expect(row.querySelector('[data-cut-confirm]')).toBeNull();
      expect(read().league.teams[team].players.some((p: any) => p.id === target.id)).toBe(true);

      /* the second tap, with the cost on screen, is the cut */
      fireEvent.click(within(row).getByText(armLabel(cost.now)));
      fireEvent.click(within(row.querySelector('[data-cut-confirm]') as HTMLElement).getByText(c.doIt));
      const saved = read().league.teams[team];
      expect(saved.players.some((p: any) => p.id === target.id)).toBe(false);
      expect(saved.deadCap).toEqual([{ playerId: target.id, name: target.name, amount: cost.now, seasonsLeft: 2 }]);
      expect(saved.releasedThisSeason).toEqual([target.id]);
      expect(rosterRow(target.id)).toBeNull();
      /* and the cap or payroll line says so */
      const line = screen.getByText(c.line);
      expect(line.textContent).toContain(`dead money $${cost.now}M`);
    });

    it('shows why the man you cut cannot be signed back and greys his button', () => {
      const { team, target, cost } = setup(true);
      fireEvent.click(screen.getByText('Roster'));
      fireEvent.click(within(rosterRow(target.id)).getByText(armLabel(cost.now)));
      fireEvent.click(within(rosterRow(target.id).querySelector('[data-cut-confirm]') as HTMLElement).getByText(c.doIt));
      fireEvent.click(screen.getByText('Hub'));
      fireEvent.click(screen.getByText('Free agency'));
      const row = faRow(target.id);
      expect(row, `${c.name}: ${target.name} is not on the market after the cut`).toBeTruthy();
      expect(within(row).getByText(c.said)).toBeTruthy();
      const sign = within(row).getByText('Sign') as HTMLButtonElement;
      expect(sign.disabled).toBe(true);
      fireEvent.click(sign);
      expect(read().league.teams[team].players.some((p: any) => p.id === target.id)).toBe(false);
      /* somebody else in the pool is still signable, so the grey is his alone */
      const others = read().league.freeAgents.filter((p: any) => p.id !== target.id);
      const affordable = others.find((p: any) => faRow(p.id));
      expect(affordable, `${c.name}: no other free agent is drawn`).toBeTruthy();
      expect((within(faRow(affordable.id)).getByText('Sign') as HTMLButtonElement).disabled).toBe(false);
    });
  });
}

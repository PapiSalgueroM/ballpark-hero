/**
 * Round 631: a cut costs dead money on all four front office boards.
 *
 * The engine rule is fenced by scripts/simFrontOfficeCuts.mjs. This is the
 * board, one parameterised file over the four sims the way
 * FrontOfficeSeasonClose.test.tsx is: the cut button quotes the dead money
 * before the first tap, the second tap is only offered with the whole cost
 * on screen, the save only moves on the second tap, the cap or payroll line
 * shows the dead money once there is some, a man you cut this season sits in
 * the pool with the reason beside him and his Sign button greyed while
 * everybody else stays signable, and the hub's Free agency box stops
 * offering him. Since the Round 631 review it also covers the roster floor
 * (every cut greyed with the reason), the roster ceiling on the three boards
 * whose sign path has one (every Sign greyed with the reason), and the trade
 * screen (a man you cut cannot be traded back, and the row says why).
 *
 * Same setup as the season close test: a save from the real engine under a
 * seeded rng, the real board rendered on it, the save read back.
 *
 * scripts/simFrontOfficeCuts.mjs runs this file in section 6 and carries its
 * negative control, onetap: FO_CUTS_BOARD_NFL, FO_CUTS_BOARD_NBA,
 * FO_CUTS_BOARD_MLB and FO_CUTS_BOARD_NHL point it at copies of the boards
 * whose cut fires on the first tap, and the two rows that ask twice must fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, NFL_ROSTER_MIN } from '@/lib/frontOffice';
import { initNbaLeague, NBA_ROSTER_MIN, NBA_ROSTER_MAX } from '@/lib/nbaFrontOffice';
import { initMlbLeague, MLB_ROSTER_MIN, MLB_ROSTER_MAX } from '@/lib/mlbFrontOffice';
import { initNhlLeague, NHL_ROSTER_MIN, NHL_ROSTER_MAX } from '@/lib/nhlFrontOffice';
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
  /** The env var the onetap control uses to swap in a rewritten board. */
  env: string;
  load: () => Promise<{ default: ComponentType }>;
  saveKey: string;
  init: (rng: () => number) => any;
  /** Each sport's own words on the board, in the order the screen uses them. */
  verb: string;      // the button before the tap: "Cut", "DFA", "Waive"
  doIt: string;      // the confirm button: "Cut him", "DFA him", "Waive him"
  said: string;      // the refusal beside the greyed Sign and Open talks buttons
  line: RegExp;      // the cap or payroll line
  /** The engine's own roster floor and ceiling (null: its sign path has none). */
  min: number;
  max: number | null;
}

const CASES: BoardCase[] = [
  {
    name: 'NFL Front Office', env: 'FO_CUTS_BOARD_NFL', load: () => import('@/components/front-office/FrontOfficeBoard'),
    saveKey: 'front-office-save-v1', init: initLeague,
    verb: 'Cut', doIt: 'Cut him', said: 'You cut him this season. He can come back after the offseason.',
    line: /cap \$/, min: NFL_ROSTER_MIN, max: null,
  },
  {
    name: 'NBA Front Office', env: 'FO_CUTS_BOARD_NBA', load: () => import('@/components/nba-front-office/NbaFrontOfficeBoard'),
    saveKey: 'nba-front-office-save-v1', init: initNbaLeague,
    verb: 'Waive', doIt: 'Waive him', said: 'You waived him this season. He can come back after the offseason.',
    line: /Payroll \$/, min: NBA_ROSTER_MIN, max: NBA_ROSTER_MAX,
  },
  {
    name: 'MLB Front Office', env: 'FO_CUTS_BOARD_MLB', load: () => import('@/components/mlb-front-office/MlbFrontOfficeBoard'),
    saveKey: 'mlb-front-office-save-v1', init: initMlbLeague,
    verb: 'DFA', doIt: 'DFA him', said: 'You designated him for assignment this season. He can come back after the offseason.',
    line: /Payroll \$/, min: MLB_ROSTER_MIN, max: MLB_ROSTER_MAX,
  },
  {
    name: 'NHL Front Office', env: 'FO_CUTS_BOARD_NHL', load: () => import('@/components/nhl-front-office/NhlFrontOfficeBoard'),
    saveKey: 'nhl-front-office-save-v1', init: initNhlLeague,
    verb: 'Waive', doIt: 'Waive him', said: 'You waived him this season. He can come back after the offseason.',
    line: /Cap hit \$/, min: NHL_ROSTER_MIN, max: NHL_ROSTER_MAX,
  },
];

const rosterRow = (id: string) => document.querySelector(`[data-roster-row="${id}"]`) as HTMLElement;
const faRow = (id: string) => document.querySelector(`[data-fa-row="${id}"]`) as HTMLElement;
const tradeRow = (id: string) => document.querySelector(`[data-trade-row="${id}"]`) as HTMLElement;
/** A hub box, by the word on it. */
const tile = (title: string) => screen.getByText(title).closest('button') as HTMLElement;

for (const c of CASES) {
  const override = process.env[c.env];
  const { default: Board } = override ? await import(/* @vite-ignore */ override) : await c.load();
  const read = (): any => JSON.parse(localStorage.getItem(c.saveKey)!);
  const save = (league: any, team: string) =>
    localStorage.setItem(c.saveKey, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));

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
      const team = Object.keys(league.teams).find(a => league.teams[a].players.length > c.min)!;
      const target = [...league.teams[team].players].filter((p: any) => p.years >= 2).sort((a: any, b: any) => b.salary - a.salary)[0];
      if (liftCap) league.cap += 1000;
      save(league, team);
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
      /* Round 631 review: the hub's Free agency box used to offer the man you
         had just cut as the signing that fits your room. */
      expect(tile('Free agency').textContent, `${c.name}: the hub box still offers ${target.name}`).not.toContain(target.name);
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

    it('at the roster floor every cut is disabled with the reason', () => {
      const league = c.init(lehmer(7));
      const team = Object.keys(league.teams)[0];
      league.teams[team].players = [...league.teams[team].players].sort((a: any, b: any) => b.ovr - a.ovr).slice(0, c.min);
      save(league, team);
      render(<Board />);
      fireEvent.click(screen.getByText('Roster'));
      expect(document.querySelector('[data-cut-block]')?.textContent).toBe(`Your roster is at the minimum of ${c.min}, so nobody else can go.`);
      const rows = [...document.querySelectorAll('[data-roster-row]')] as HTMLElement[];
      expect(rows).toHaveLength(c.min);
      for (const r of rows) {
        const b = r.querySelector('button') as HTMLButtonElement;
        expect(b.disabled, `${c.name}: a cut button is live at the floor`).toBe(true);
        fireEvent.click(b);
        expect(r.querySelector('[data-cut-confirm]')).toBeNull();
      }
      expect(read().league.teams[team].players).toHaveLength(c.min);
    });

    if (c.max != null) {
      const max = c.max;
      it('at the roster ceiling every Sign is disabled with the reason', () => {
        const league = c.init(lehmer(7));
        league.cap += 1000;
        const team = Object.keys(league.teams)[0];
        const t = league.teams[team];
        while (t.players.length < max) t.players.push(league.freeAgents.shift());
        expect(league.freeAgents.length, `${c.name}: the fixture emptied the pool`).toBeGreaterThan(0);
        save(league, team);
        render(<Board />);
        /* the hub box says it too, instead of offering a man the sign path refuses */
        expect(tile('Free agency').textContent).toContain(`Roster full at ${max}.`);
        fireEvent.click(screen.getByText('Free agency'));
        expect(document.querySelector('[data-sign-block]')?.textContent).toBe(`Roster full at ${max}. Cut or trade someone first.`);
        const buttons = [...document.querySelectorAll('[data-fa-row] button')] as HTMLButtonElement[];
        expect(buttons.length).toBeGreaterThan(0);
        for (const b of buttons) expect(b.disabled, `${c.name}: a Sign button is live at the ceiling`).toBe(true);
      });
    }

    it('a man you cut this season cannot come back by trade, and the trade screen says why', () => {
      const league = c.init(lehmer(7));
      const abbrs = Object.keys(league.teams);
      const team = abbrs.find(a => league.teams[a].players.length > c.min)!;
      const partner = abbrs.find(a => a !== team && league.teams[a].players.length > c.min)!;
      const byOvr = [...league.teams[partner].players].sort((a: any, b: any) => b.ovr - a.ovr);
      const [back, other] = byOvr;
      /* the state after a cut that an AI club then signed: his id on your
         list for this season, his body on their roster */
      league.teams[team].releasedThisSeason = [back.id];
      save(league, team);
      render(<Board />);
      fireEvent.click(screen.getByText('Trades'));
      fireEvent.click(screen.getAllByText(partner).find(el => el.tagName === 'BUTTON')!);
      const piece = [...league.teams[team].players].sort((a: any, b: any) => b.ovr - a.ovr)[0];
      /* his name is on the Trade Finder's shop list too; the last copy is the
         "You send" column of the deal this row belongs to */
      const sends = screen.getAllByText(`${piece.name} (${piece.pos})`);
      fireEvent.click(sends[sends.length - 1]);
      const row = tradeRow(back.id);
      expect(row, `${c.name}: ${back.name} is not on ${partner}'s trade list`).toBeTruthy();
      expect(within(row).getByText(c.said)).toBeTruthy();
      expect((within(row).getByText('Open talks') as HTMLButtonElement).disabled).toBe(true);
      /* the grey is his alone: the next man on their list can still be called about */
      expect((within(tradeRow(other.id)).getByText('Open talks') as HTMLButtonElement).disabled).toBe(false);
    });
  });
}

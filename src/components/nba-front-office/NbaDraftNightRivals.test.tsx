/**
 * Round 1305: the rival rows on the NBA draft night card are the picks the
 * engine really made.
 *
 * scripts/simDraftNight.mjs section 5 holds the four boards to this by the
 * NAME of a variable (`rivalPicks` handed to `buildDraftNight`). That is a
 * weak fence: it went red on a board whose screen was right (the list had
 * been copied to another name on the way), and it would stay green for a
 * board that emptied the list before handing it over. This file is the
 * strong one. It renders the real board on a save in the middle of a draft,
 * presses one prospect, and compares the rows the card draws with what the
 * engine did to the save.
 *
 * HOW THE ENGINE'S PICKS ARE NAMED, AND WHY NOT BY IDS. The case holds two
 * picks on a club that owns two, so the first press does not close the
 * draft: the save after it holds the league and the class and no summer.
 * (With one pick left the same press runs the offseason, which fills every
 * computer club to the floor with new men who are on no row, so "every new
 * man on a rival roster" would be wrong before the board moved a line.)
 * The rival picks are named by what the engine did to the CLASS: the
 * prospects in the class before the press, less the class the save holds
 * after it, less his own man. Each must be on the roster of the club its
 * row names, and must not have been there before.
 *
 * WHAT THE CARD PROMISES. src/lib/draftNight.ts keeps his pick and the
 * first eight rivals (MAX_REVEALED is 9), so the rival rows are the
 * engine's picks in order: all of them when there are eight or fewer and
 * the first eight otherwise. A batch is at most five today, so this case
 * sees all of them; the count seen is asserted to be at least one and is
 * printed, so a later change of the batch size cannot pass on nothing.
 * The order is the class's own: `nbaAiDraftPicks` takes the head of the
 * class for each club in turn.
 *
 * Two saves: the GM desk off (the grades are the class's own) and the desk
 * on (every grade on the card is his scout's read, Round 1018).
 *
 * Negative control: DRAFT_CONTROL=norivals in scripts/simDraftNight.mjs
 * points this file at a copy of the board that hands the card an empty
 * list through FO_BOARD_NBA, and the test named RIVAL_ROWS_TEST below must
 * go red on that copy with the file loaded. Keep the name and that script
 * in step.
 *
 * Owed to the round that binds the draft you earn on all four boards: this
 * test over the four of them (one parameterised file, the shape of
 * FrontOfficeSeasonClose.test.tsx), after which section 5's two name checks
 * can go.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initNbaLeague, nbaDraftClass, NBA_ROUNDS } from '@/lib/nbaFrontOffice';
import { leagueNames } from '@/lib/foNames';
import { openNbaDesk } from '@/lib/nbaGmDesk';
import { MAX_REVEALED } from '@/lib/draftNight';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 120_000 });

/* The name scripts/simDraftNight.mjs looks for in the verbose report. */
const RIVAL_ROWS_TEST = 'the rival rows are the picks the engine made, in order, each on the club its row names';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'nba-front-office-save-v1';
const saved = (): any => JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');

const override = process.env.FO_BOARD_NBA;
const { default: Board } = (override
  ? await import(/* @vite-ignore */ override)
  : await import('@/components/nba-front-office/NbaFrontOfficeBoard')) as { default: ComponentType };

interface Row { overall: number; team: string; mine: boolean; name: string; grade: number }
interface Night {
  team: string;
  /* the save before the press and after it */
  before: any; after: any;
  /* the grade the draft screen printed beside each prospect before the press */
  printed: Map<string, number>;
  pressed: string;
  rows: Row[];
  /* the engine's picks, named by what happened to the class, in the class's order */
  taken: string[];
}

/** A save in the middle of a draft: two picks held on a club that owns two. */
function midDraftSave(withDesk: boolean): string {
  const rng = lehmer(9);
  const league = initNbaLeague(rng);
  const team = Object.keys(league.teams)[0];
  league.round = NBA_ROUNDS;
  league.teams[team].picks = [1, 2];
  const gm = withDesk ? openNbaDesk(league, team) : null;
  const draftClass = nbaDraftClass(rng, 24, leagueNames(league));
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    league, myTeam: team, phase: 'draft', titles: 0, seasonsPlayed: 1, draftClass, picksLeft: 2, draftAiBatchesLeft: 2,
    ...(gm ? { gm } : {}),
  }));
  return team;
}

/** Render the board, press the first prospect on the screen, and read the card and the save. */
function pressOne(withDesk: boolean): Night {
  const team = midDraftSave(withDesk);
  const before = saved();
  render(<Board />);
  const grid = document.querySelector('.grid.max-h-96') as HTMLElement;
  expect(grid, 'the draft screen draws its prospects').toBeTruthy();
  const printed = new Map<string, number>();
  const choices = [...grid.querySelectorAll('button')] as HTMLElement[];
  for (const b of choices) {
    const name = b.querySelector('span.block.text-sm')?.textContent ?? '';
    const spans = b.querySelectorAll(':scope > span');
    printed.set(name, Number(spans[spans.length - 1].textContent));
  }
  expect(document.querySelector('[data-draft-night]'), 'no card before a pick').toBeNull();
  const pressed = choices[0].querySelector('span.block.text-sm')!.textContent!;
  fireEvent.click(choices[0]);
  const after = saved();
  const rows: Row[] = [...document.querySelectorAll('[data-draft-night] ol li')].map(li => {
    const text = (li.querySelector('span.block.truncate')?.textContent ?? '').trim();
    const m = text.match(/^(\d+)\. (\S+) (select|take) (.+)$/);
    expect(m, `a row the card drew reads as a pick: "${text}"`).toBeTruthy();
    const spans = li.querySelectorAll(':scope > span');
    return { overall: Number(m![1]), team: m![2], mine: m![3] === 'select', name: m![4], grade: Number(spans[spans.length - 1].textContent) };
  });
  const left = new Set<string>((after.draftClass as any[]).map(p => p.name));
  const taken = (before.draftClass as any[]).map(p => p.name as string).filter(n => n !== pressed && !left.has(n));
  return { team, before, after, printed, pressed, rows, taken };
}

for (const withDesk of [false, true]) {
  describe(`NBA draft night, GM desk ${withDesk ? 'on' : 'off'}: the card shows the picks the engine made`, () => {
    let restoreRandom: (() => void) | null = null;
    beforeEach(() => {
      localStorage.clear();
      const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
      restoreRandom = () => spy.mockRestore();
    });
    afterEach(() => { cleanup(); restoreRandom?.(); });

    it('the case is the one it says it is: the first press leaves the draft open with no summer run', () => {
      const n = pressOne(withDesk);
      expect(n.after.phase).toBe('draft');
      expect(n.after.picksLeft).toBe(1);
      expect(n.after.league.season).toBe(n.before.league.season);
      expect(n.after.league.round).toBe(n.before.league.round);
    });

    it('exactly one row is his, and it is the man he pressed', () => {
      const n = pressOne(withDesk);
      const mine = n.rows.filter(r => r.mine);
      expect(mine).toHaveLength(1);
      expect(mine[0].name).toBe(n.pressed);
      expect(mine[0].team).toBe(n.team);
      expect(n.rows[0].mine, 'his pick is the first row').toBe(true);
      expect(n.after.league.teams[n.team].players.some((p: any) => p.name === n.pressed)).toBe(true);
    });

    it(RIVAL_ROWS_TEST, () => {
      const n = pressOne(withDesk);
      const rivals = n.rows.filter(r => !r.mine);
      const want = n.taken.slice(0, MAX_REVEALED - 1);
      console.log(`NBA draft night, desk ${withDesk ? 'on' : 'off'}: the engine took ${n.taken.length} for rival clubs, the card drew ${rivals.length} rival rows`);
      expect(n.taken.length, 'the engine picked for at least one rival club (a seed that picks nothing proves nothing)').toBeGreaterThanOrEqual(1);
      /* nothing dropped, nothing invented, and in the engine's order */
      expect(rivals.map(r => r.name)).toEqual(want);
      n.rows.forEach((r, i) => expect(r.overall).toBe(i + 1));
      for (const r of rivals) {
        expect(r.team, `${r.name} is on a rival row`).not.toBe(n.team);
        const club = n.after.league.teams[r.team];
        expect(club, `the row names a club of this league: ${r.team}`).toBeTruthy();
        expect(club.players.some((p: any) => p.name === r.name), `${r.name} is on ${r.team}'s roster in the save`).toBe(true);
        expect(n.before.league.teams[r.team].players.some((p: any) => p.name === r.name), `${r.name} was not on ${r.team} before the press`).toBe(false);
      }
      /* and every man the engine took sits on exactly one rival roster, shown or not */
      for (const name of n.taken) {
        const homes = Object.values(n.after.league.teams as Record<string, any>).filter(t => t.players.some((p: any) => p.name === name));
        expect(homes.map(t => t.abbr).filter(a => a !== n.team), `${name} joined one rival club`).toHaveLength(1);
      }
    });

    it('every rival row carries the grade the draft screen printed for that prospect before the press', () => {
      const n = pressOne(withDesk);
      const rivals = n.rows.filter(r => !r.mine);
      let read = 0;
      for (const r of rivals) {
        const was = n.printed.get(r.name);
        if (was === undefined) continue;
        read += 1;
        expect(r.grade, `${r.name}: the card says ${r.grade}, the draft screen said ${was}`).toBe(was);
      }
      console.log(`NBA draft night, desk ${withDesk ? 'on' : 'off'}: ${read} of ${rivals.length} rival rows were on the draft screen before the press, each grade equal`);
      expect(read, 'at least one rival row was a prospect the screen had printed').toBeGreaterThanOrEqual(1);
      const own = n.rows.find(r => r.mine)!;
      expect(own.grade).toBe(n.printed.get(n.pressed));
      if (!withDesk) {
        const cls = new Map<string, number>((n.before.draftClass as any[]).map(p => [p.name, p.grade]));
        for (const r of rivals) expect(r.grade).toBe(cls.get(r.name));
      }
    });
  });
}

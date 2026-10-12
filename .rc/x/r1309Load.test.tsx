/* Round 1309, a runner side probe (never committed): this tree's NFL board loads the saves the OTHER build wrote
   (r1309Write.test.tsx). On the base (Round 1308's head bb051ee0): every save the round writes outside the bracket
   passes the validator, opens on the board and plays on, and its next save holds no bracket; a save IN the bracket is
   refused (the validator says no and the save error screen offers its delete button), the rollback note of the
   brief's B14. On the round's head: every save the base wrote opens and plays on. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import { REGULAR_WEEKS } from '@/lib/frontOffice';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
import Board from '@/components/front-office/FrontOfficeBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 600_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = 'front-office-save-v1';
const head = fs.readFileSync('src/components/front-office/FrontOfficeBoard.tsx', 'utf8').includes('pressPlayoffs');
const saves: [string, string, boolean][] = JSON.parse(fs.readFileSync(process.env.R1309_SAVES_IN!, 'utf8'));
const deleteButton = () => screen.queryByText('Delete unusable save');

describe(`the ${head ? "round's head" : 'base (bb051ee0)'} loads the saves the other build wrote`, () => {
  it('the saves are the other build\'s', () => { expect(saves.length).toBe(head ? 3 : 5); });
  for (const [name, raw, inBracket] of saves) {
    it(name, () => {
      Math.random = lehmer(11);
      cleanup();
      localStorage.clear();
      localStorage.setItem(KEY, raw);
      const s = JSON.parse(raw);
      const valid = isFrontOfficeSave(s, 'NFL', REGULAR_WEEKS);
      render(<Board />);
      if (inBracket && !head) {
        console.log(`R1309 base refuses "${name}": validator ${valid}, delete button ${!!deleteButton()}`);
        expect(valid, 'the old validator refuses a save in the bracket').toBe(false);
        expect(deleteButton(), 'the save error screen with its delete button').not.toBeNull();
        expect(localStorage.getItem(KEY), 'and nothing is written').toBe(raw);
        return;
      }
      expect(valid).toBe(true);
      expect(deleteButton(), 'the save opens').toBeNull();
      if (s.phase !== 'hub') { console.log(`R1309 ${head ? 'head' : 'base'} opens "${name}" on its ${s.phase} screen`); return; }
      fireEvent.click(screen.getByText('This week'));
      const btn = [...document.querySelectorAll('[data-week-box] button')].find(b => /^Play Week \d+$|^Play the final week \+ playoffs$/.test((b.textContent ?? '').trim())) as HTMLButtonElement;
      expect(btn, 'a Play button').toBeTruthy();
      const label = (btn.textContent ?? '').trim();
      fireEvent.click(btn);
      const after = JSON.parse(localStorage.getItem(KEY)!);
      console.log(`R1309 ${head ? 'head' : 'base'} plays on "${name}" with "${label}": week ${s.league.week} to ${after.league.week}, phase ${after.phase}, bracket ${'playoffs' in after}`);
      expect(localStorage.getItem(KEY), 'the press played').not.toBe(raw);
      if (!head) expect('playoffs' in after, 'the base never writes a bracket').toBe(false);
    });
  }
});

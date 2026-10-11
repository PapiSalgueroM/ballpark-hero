/* Round 1305, a runner side proof (never committed), part two, run in a worktree of the build BEFORE the round
   (origin/release-av-gate cbfa94fd): the saves the round's board wrote (they hold `gameLog`, and the recap save
   holds told playoff scores) pass the old validator, open on the old board, play on, and the old board's next save
   has no such key. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import { REGULAR_WEEKS } from '@/lib/frontOffice';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
import Board from '@/components/front-office/FrontOfficeBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 300_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = 'front-office-save-v1';
const saves: [string, string][] = JSON.parse(fs.readFileSync(process.env.R1305_SAVES!, 'utf8'));
const read = (): any => JSON.parse(localStorage.getItem(KEY)!);

let restore: (() => void) | null = null;
beforeEach(() => { localStorage.clear(); const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11)); restore = () => spy.mockRestore(); });
afterEach(() => { cleanup(); restore?.(); });

describe('the build before Round 1305 loads a save the round wrote', () => {
  it('this really is the build before the round: it has no season log module', () => {
    expect(fs.existsSync('src/lib/gmGameLog.ts')).toBe(false);
    expect(saves).toHaveLength(3);
  });
  for (const [name, raw] of saves) {
    it(name, () => {
      const parsed = JSON.parse(raw);
      expect('gameLog' in parsed, 'the save holds the new key').toBe(true);
      expect(isFrontOfficeSave(parsed, 'NFL', REGULAR_WEEKS), 'the old validator accepts it').toBe(true);
      localStorage.setItem(KEY, raw);
      const first = render(<Board />);
      if (parsed.phase === 'hub') {
        fireEvent.click(screen.getByText('This week'));
        fireEvent.click(screen.getByText(`Play Week ${parsed.league.week}`));
        const next = read();
        expect(next.league.week).toBe(parsed.league.week + 1);
        expect('gameLog' in next, 'the old board writes its next save without the key').toBe(false);
      } else {
        /* the recap is drawn again from the saved rounds, told scores and all */
        expect(parsed.phase).toBe('recap');
        expect(screen.getByText(/win the 2026 title/)).toBeTruthy();
        const games = parsed.postseason.rounds.flatMap((r: any) => r.games);
        expect(games).toHaveLength(13);
        first.unmount();
        render(<Board />);
        fireEvent.click(screen.getByText('Go to the draft'));
        const next = read();
        expect(next.phase).toBe('draft');
        expect('gameLog' in next).toBe(false);
        expect(next.seasonsPlayed).toBe(1);
      }
      console.log(`R1305 old build: ${name}: loaded, played on, next save holds no gameLog key`);
    });
  }
});

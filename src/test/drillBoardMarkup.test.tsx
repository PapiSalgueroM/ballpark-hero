/* Round 1047: the training ground's boards, recorded BEFORE the Season
   Centre's moments reuse them.

   The moment boards are DrillBoard and ThroughBallBoard themselves, through
   one optional `match` prop. This suite is the proof that the prop costs
   the training ground nothing: with no `match` the markup of every drill,
   at the rules card, at the ready card and with a round live, is byte for
   byte what src/test/fixtures/drillBoardMarkup.recorded.json holds, and that
   file was written from the boards as they stood on main before the prop
   existed (commit "Round 1047: record the training boards' markup").

   The three drills on DrillBoard also hold the result card of a round and
   the second round's ready card, the two frames the prop's edits sit in
   (the Next button and the "Next one" label). Those six frames were added
   after the review of 2026-10-07 and were recorded from main's own
   DrillBoard.tsx (git show origin/main, before the prop), never from the
   board they are compared with. The one edited line no frame draws is the
   points line of a made round.

   Release AQ, 2026-10-09: Round 1174 changed the Wall Shot itself (a wider
   gap, a slower wall and two hint lines while a round is live), which is the
   one case the note below allows. wallshot:ready and wallshot:playing were
   recorded again from the merged board with no match prop. The other sixteen
   frames are byte for byte the record described above, so for those two
   frames the record now pins the board against itself from this release on,
   not against the board from before the prop.

   It fails closed: a missing record is a failure, never a fresh recording.
   To record on purpose (only when the training ground itself is meant to
   change): RECORD_DRILL_MARKUP=1 vitest run src/test/drillBoardMarkup.test.tsx */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import DrillBoard from '@/components/soccer-career/DrillBoard';
import ThroughBallBoard from '@/components/soccer-career/ThroughBallBoard';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { drillFrames } from './fixtures/drillBoardFrames';

const RECORD = resolve(process.cwd(), 'src/test/fixtures/drillBoardMarkup.recorded.json');
const recording = process.env.RECORD_DRILL_MARKUP === '1';
const fixture = (position: string) => ({ position, overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState);
const seen: Record<string, string> = {};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function drill(position: string, name: string) {
  /* five frames: the two after the round is over are where the match prop's edits sit */
  expect(drillFrames(DrillBoard, fixture(position), name, seen)).toEqual({ live: true, ended: true, second: true });
}

describe('the training boards with no match prop', { timeout: 20000 }, () => {
  it('draws the Wall Shot as recorded', () => drill('ST', 'wallshot'));
  it('draws the Tackle as recorded', () => drill('CB', 'tackle'));
  it('draws the Glove Save as recorded', () => drill('GK', 'gloves'));
  it('draws the Through Ball as recorded', () => {
    const view = render(<ThroughBallBoard career={fixture('CM')} canBank onBank={vi.fn()} onBack={vi.fn()} />);
    seen['throughball:intro'] = view.container.innerHTML;
    fireEvent.click(view.getByRole('button', { name: /Play today/ }));
    seen['throughball:ready'] = view.container.innerHTML;
    fireEvent.click(view.getByRole('button', { name: 'Start run' }));
    seen['throughball:playing'] = view.container.innerHTML;
    expect(view.container.querySelector('[data-phase="playing"]')).not.toBeNull();
  });

  it('matches the record made before the match prop existed', () => {
    const keys = Object.keys(seen).sort();
    expect(keys.length).toBe(18);
    for (const k of keys) expect(seen[k].length).toBeGreaterThan(200);
    if (recording) {
      writeFileSync(RECORD, `${JSON.stringify(seen, keys, 1)}\n`);
      return;
    }
    expect(existsSync(RECORD), 'the recorded markup is missing: restore it from git, never re-record').toBe(true);
    const want = JSON.parse(readFileSync(RECORD, 'utf8')) as Record<string, string>;
    expect(Object.keys(want).sort()).toEqual(keys);
    for (const k of keys) expect(seen[k], k).toBe(want[k]);
  });
});

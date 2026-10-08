/* Round 1048: the shared Season Centre says a few soccer things in literals.
   This round turns each into a lookup whose default is that literal, so the
   NBA and NFL can bring their own words. This test is the proof that soccer's
   screen did not move: the viewer's markup for a fixed soccer shaped season
   (src/test/fixtures/seasonCentreToy.ts), recorded BEFORE any of those
   substitutions, at the help sheet, the kick off card, a matchday at Results
   speed after full time, the halfway poster and the review, on a table season
   and a results season, at the desktop and the phone layout.

   THE RECORDING IS A STATEMENT ABOUT THE BASE'S VIEWER, NEVER ABOUT THIS
   ROUND'S. Rules (critic C2):
   1. RECORD_CENTRE_WORDS=1 writes it, never by default, and only from a tree
      whose src/components/season-centre/* and
      src/components/soccer-career/SoccerSeasonCentre.tsx are byte equal to
      origin/release-al-int at that moment (git diff --quiet; it refuses
      otherwise).
   2. After any merge that touches those paths, the recording is made again
      in a scratch worktree at the new origin/release-al-int holding ONLY this
      test and its toy fixture, the fixture is copied back and committed alone
      with the merge named in the message. This round's tree, hunks and all,
      must then equal it with none of the new fields set.
   3. A red here after a merge is expected exactly once (rule 2 clears it).
      Re-recording on this round's own tree deletes the proof.
   Rounds 1046 and 1050 keep their own recordings under other names; this
   pair is not theirs and theirs is not read here. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { SeasonCentre, type CentreModel } from '@/components/season-centre/SeasonCentre';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import { RESULTS_ROW, TABLE_ROW, soccerShapedModel, toySeason, type ToyRow } from './fixtures/seasonCentreToy';

const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/seasonCentreWords.recorded.json');
const BASE_PATHS = ['src/components/season-centre', 'src/components/soccer-career/SoccerSeasonCentre.tsx'];

function setWidth(wide: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('min-width') ? wide : false,
      media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
    }),
  });
}

const press = (root: HTMLElement, text: string) => {
  const b = [...root.querySelectorAll('button')].find(x => (x.textContent ?? '').includes(text));
  if (!b) throw new Error(`seasonCentreWords: no button reading "${text}"`);
  act(() => { fireEvent.click(b); });
};

/** Walk one season through the five screens and return each screen's markup. */
export function walk(model: CentreModel, wide: boolean, start = 'Kick off'): Record<string, string> {
  setWidth(wide);
  const out: Record<string, string> = {};
  const { container } = render(<MemoryRouter><SeasonCentre model={model} exitLabel="Back to your career" onClose={() => {}} /></MemoryRouter>);
  out.help = container.innerHTML;
  press(container, 'Got it');
  out.kickoff = container.innerHTML;
  press(container, start);
  press(container, 'Results');
  out.matchday = container.innerHTML;
  press(container, 'To the next big game');
  out.poster = container.innerHTML;
  press(container, 'Sim the rest');
  out.review = container.innerHTML;
  cleanup();
  return out;
}

const ROWS: Record<string, ToyRow> = { table: TABLE_ROW, results: RESULTS_ROW };

function soccerNow(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [mode, row] of Object.entries(ROWS)) {
    for (const wide of [true, false]) {
      localStorage.clear();
      resetCareerMomentsForTest();
      const screens = walk(soccerShapedModel(row, toySeason(row)), wide);
      for (const [screen, html] of Object.entries(screens)) out[`${mode}|${wide ? 'desktop' : 'phone'}|${screen}`] = html;
    }
  }
  return out;
}

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('Season Centre: soccer markup, recorded on the base (Round 1048)', () => {
  it('prints the soccer shaped season exactly as the base viewer did, with no new field set', () => {
    const now = soccerNow();
    expect(Object.keys(now)).toHaveLength(20);
    for (const [k, html] of Object.entries(now)) expect(html.length, k).toBeGreaterThan(400);
    if (process.env.RECORD_CENTRE_WORDS === '1') {
      execFileSync('git', ['diff', '--quiet', 'origin/release-al-int', '--', ...BASE_PATHS], { cwd: process.cwd() });
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, JSON.stringify(now, null, 0));
    }
    const recorded: Record<string, string> = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    expect(Object.keys(now).sort()).toEqual(Object.keys(recorded).sort());
    const moved = Object.keys(recorded).filter(k => now[k] !== recorded[k]);
    expect(moved, 'screens whose soccer markup moved').toEqual([]);
  });
});

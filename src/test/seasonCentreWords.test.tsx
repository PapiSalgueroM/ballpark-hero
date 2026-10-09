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
      the base at that moment (git diff --quiet; it refuses otherwise). The
      base is the branch this round's viewer hunks sit on top of: it was
      origin/release-al-int while the round was built, and it is origin/main
      since Release AL put Round 1047's viewer there (the clock gained a
      wrapper element, so every matchday's markup moved with no field set).
      A release train whose viewer has moved further names its own ref in
      RECORD_CENTRE_WORDS_BASE.
   2. After any merge that touches those paths, the recording is made again
      in a scratch worktree at the new base holding ONLY this test's soccer
      half (the first describe; the US half imports this round's files) and
      its toy fixture, the fixture is copied back and committed alone with
      the merge named in the message. This round's tree, hunks and all, must
      then equal it with none of the new fields set.
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
import { deriveSeason } from '@/lib/season/core';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import { NBA_SEASON } from '@/lib/season/nba';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import type { UsCareerCore } from '@/lib/usCareerSport';

const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/seasonCentreWords.recorded.json');
const BASE_PATHS = ['src/components/season-centre', 'src/components/soccer-career/SoccerSeasonCentre.tsx'];
const BASE_REF = process.env.RECORD_CENTRE_WORDS_BASE || 'origin/main';

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
      execFileSync('git', ['diff', '--quiet', BASE_REF, '--', ...BASE_PATHS], { cwd: process.cwd() });
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, JSON.stringify(now, null, 0));
    }
    const recorded: Record<string, string> = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    expect(Object.keys(now).sort()).toEqual(Object.keys(recorded).sort());
    const moved = Object.keys(recorded).filter(k => now[k] !== recorded[k]);
    expect(moved, 'screens whose soccer markup moved').toEqual([]);
  });
});

/* ─── The new fields print (a US shaped model in record mode) ─── */
function usModel(): CentreModel {
  const row = {
    year: 2026, team: 'DEN', age: 24, ovr: 84, games: 80, ppg: 25, rpg: 6.4, apg: 5.1, awards: ['All-NBA'],
    teamResult: 'Lost in the conference semis', salary: 20, poGames: 11, poPpg: 26, poRpg: 6.1, poApg: 5,
  } as unknown as UsRow;
  const career = { name: 'Trey Buckets', pos: 'SG', eraId: undefined, seasons: [row] } as unknown as UsCareerCore;
  const b = buildUsSeason(NBA_SEASON, career, row, NBA_CAREER_SPORT.teamLabelOf);
  if (b.ok === false) throw new Error('seasonCentreWords: the US row did not build');
  const s = deriveSeason(b.sport, row, b.ctx);
  if (!s) throw new Error('seasonCentreWords: the US row did not derive');
  /* one level game, so the viewer's letter for it is on screen (the NBA never has one; the NFL does) */
  const level = JSON.parse(JSON.stringify(s)) as typeof s;
  level.games[0].them = level.games[0].us;
  return buildUsModel(NBA_CAREER_SPORT, NBA_SEASON, career, row, b.ctx, level, b.key);
}

describe('Season Centre: a sport that brings its own words (Round 1048)', () => {
  it.each([[true, 'desktop'], [false, 'phone']] as const)('prints the US words, the record panel and the playoff path on the %s layout (%s)', (wide, _layout) => {
    const screens = walk(usModel(), wide, 'Tip off');
    /* the help sheet and its own key */
    expect(screens.help).toContain('How the Season Center works');
    expect(localStorage.getItem('seasonCentre:help:nba')).toBe('1');
    expect(localStorage.getItem('seasonCentre:help')).toBeNull();
    /* the tip off card */
    expect(screens.kickoff).toContain('▶ Tip off');
    expect(screens.kickoff).not.toContain('Kick off');
    expect(screens.kickoff).toContain('aria-label="How the Season Center works"');
    /* a game: the US clock words, his chip, the record panel, T for the level game */
    expect(screens.matchday).toContain('Game 1 ·');
    expect(screens.matchday).not.toContain('League game');
    expect(screens.matchday).toContain('>FINAL<');
    expect(screens.matchday).toMatch(/data-full-time="[^"]*">Final</);
    expect(screens.matchday).toMatch(/\d+ PTS<\/span>/);
    expect(screens.matchday).toContain('data-record-panel');
    expect(screens.matchday).toContain('data-record="0-0-1"');
    expect(screens.matchday).toMatch(/>T[ <]/);
    expect(screens.matchday).not.toContain('FINAL DAY');
    if (wide) {
      expect(screens.matchday).toContain('LAST GAME');
      expect(screens.matchday).toContain('aria-label="Schedule"');
      expect(screens.matchday).toContain('aria-label="Record"');
      expect(screens.matchday).toContain('Season so far');
      expect(screens.matchday).toContain('data-game-log');
      expect(screens.matchday).toContain('Division ');
    } else {
      expect(screens.matchday).toContain('🗓 Schedule');
      expect(screens.matchday).toContain('📋 Game log');
    }
    /* the scoreboard reads the game's own ids, the feed the full names */
    expect(screens.matchday).toMatch(/text-sm font-bold">(DEN|[A-Z]{3})<\/span>/);
    expect(screens.matchday).toContain('Denver Nuggets put up');
    /* the halfway poster and the review */
    expect(screens.poster).toContain('Best so far: Game ');
    expect(screens.poster).toMatch(/\d+ points?, \d+ rebounds?, \d+ assists?/);
    expect(screens.review).toContain('⭐ Best game: Game ');
    expect(screens.review).toContain('Regular season, the same numbers as your season card.');
    expect(screens.review).not.toContain('All competitions');
    expect(screens.review).toContain('data-playoff-path');
    expect(screens.review).toContain('First round');
    expect(screens.review).toContain('Conference semifinals');
    expect(screens.review.match(/data-playoff-round=/g)).toHaveLength(2);
    expect(screens.review).toContain('data-playoff-round="W"');
    expect(screens.review).toContain('data-playoff-round="L"');
    expect(screens.review).toContain('Your playoffs: 11 games');
    expect(screens.review).toContain('All-NBA');
  });
});

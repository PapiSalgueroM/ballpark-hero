/* Round 1212: the NBA and NFL Season Center screens, recorded on the round's
   base BEFORE the shared seam was widened for baseball.

   WHY. Binding MLB edits two files every NBA and NFL screen is worded by:
   `buildUsModel` (src/components/us-career/season/UsSeasonCentre.tsx: the
   tiles, the record line, the groups, the help, the halfway line) and the US
   binding (src/lib/season/us.ts). Soccer's recording
   (seasonCentreWords.recorded.json) holds no record panel and no US screen,
   and the US tests around it read single strings. So this file walks one
   NBA and one NFL season, each with a playoff path, through the screens a
   player sees (the "?", the start card, a game at Results speed with the
   record panel, on a phone the game log opened, the halfway poster, the
   review with its path), at the desktop and the phone layout, and holds
   every screen to what the base drew.

   THE RECORDING IS A STATEMENT ABOUT THE BASE, NEVER ABOUT THIS ROUND.
   RECORD_US_CENTRE_SCREENS=1 writes it (to RECORD_US_CENTRE_SCREENS_OUT when
   that is set, a runner cannot commit), never by default, and only from a
   tree whose viewer, US season folder and season library are byte equal to
   the base (RECORD_US_CENTRE_SCREENS_BASE, default the round's base commit):
   it refuses otherwise. Each screen is kept as a sha1 and a length: equal is
   equal, and the file stays small. Re-recording on a tree that has the
   round's hunks deletes the proof.

   THE CONTROLS are in this file: one output of `buildUsModel` changed at a
   time (a group label, the halfway line, the first tile's label, a review
   note, the help's footnote) must move a recorded screen, or the recording
   does not see the thing this round edits. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { SeasonCentre, type CentreModel } from '@/components/season-centre/SeasonCentre';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import { deriveSeason } from '@/lib/season/core';
import { buildUsSeason, usPlayoffPath, type UsRow, type UsSeasonBind } from '@/lib/season/us';
import { NBA_SEASON } from '@/lib/season/nba';
import { NFL_SEASON } from '@/lib/season/nfl';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { keyedRng } from '@/lib/keyedRng';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/usSeasonCentreScreens.recorded.json');
const BASE_PATHS = ['src/components/season-centre', 'src/components/us-career/season', 'src/lib/season'];
const BASE_REF = process.env.RECORD_US_CENTRE_SCREENS_BASE || '60188732845f1ba27a9a2801d9b8c05133eaad22';

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
  if (!b) throw new Error(`usSeasonCentreScreens: no button reading "${text}"`);
  act(() => { fireEvent.click(b); });
};

/** One season through the screens a player sees; each screen's markup. */
function walk(model: CentreModel, wide: boolean): Record<string, string> {
  setWidth(wide);
  const out: Record<string, string> = {};
  const { container } = render(<MemoryRouter><SeasonCentre model={model} exitLabel="Back to your season" onClose={() => {}} /></MemoryRouter>);
  out.help = container.innerHTML;
  press(container, 'Got it');
  out.start = container.innerHTML;
  press(container, model.copy?.start ?? 'Kick off');
  press(container, 'Results');
  out.game = container.innerHTML;
  if (!wide) {
    press(container, 'Game log');
    out.log = container.innerHTML;
    press(container, 'Back');
  }
  press(container, 'To the next big game');
  out.poster = container.innerHTML;
  press(container, 'Sim the rest');
  out.review = container.innerHTML;
  cleanup();
  return out;
}

/** The first keyed career of a sport that holds a season with a named schedule and a playoff path. */
function modelOf(SB: UsCareerSport, bind: UsSeasonBind, pos: string, seed: string): CentreModel {
  for (let n = 0; n < 40; n += 1) {
    const rng = keyedRng(`${seed}|${n}`);
    const c = SB.startCareer('Sam Screens', pos, SB.create.archetypes[pos][0], rng, null as never, 'now');
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let i = 0; i < 6; i += 1) {
      SB.campBattle(c, tq, rng);
      SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
    const career: UsCareerCore = JSON.parse(JSON.stringify(c));
    for (const season of career.seasons) {
      const row = season as UsRow;
      const b = buildUsSeason(bind, career, row, SB.teamLabelOf);
      if (b.ok === false || !b.ctx.shape) continue;
      if (!usPlayoffPath(bind, row, b.ctx, b.key)) continue;
      const s = deriveSeason(b.sport, row, b.ctx);
      if (!s) continue;
      return buildUsModel(SB, bind, career, row, b.ctx, s, b.key);
    }
  }
  throw new Error(`usSeasonCentreScreens: no ${bind.slug} career of seed ${seed} holds a named season with a playoff path`);
}

const MODELS: Record<string, () => CentreModel> = {
  nba: () => modelOf(NBA_CAREER_SPORT, NBA_SEASON, 'SG', 'screens-nba'),
  nfl: () => modelOf(NFL_CAREER_SPORT, NFL_SEASON, 'QB', 'screens-nfl'),
};

type Shot = { sha1: string; length: number };
const shot = (html: string): Shot => ({ sha1: createHash('sha1').update(html).digest('hex'), length: html.length });

function screensOf(model: CentreModel, sport: string): Record<string, Shot> {
  const out: Record<string, Shot> = {};
  for (const wide of [true, false]) {
    localStorage.clear();
    resetCareerMomentsForTest();
    for (const [screen, html] of Object.entries(walk(model, wide))) out[`${sport}|${wide ? 'desktop' : 'phone'}|${screen}`] = shot(html);
  }
  return out;
}

function allNow(): Record<string, Shot> {
  const out: Record<string, Shot> = {};
  for (const [sport, make] of Object.entries(MODELS)) Object.assign(out, screensOf(make(), sport));
  return out;
}

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('the NBA and NFL Season Center screens, recorded on the base of Round 1212', () => {
  it('draws every screen exactly as the base did', () => {
    const now = allNow();
    /* two sports, five screens at the desktop and six on a phone */
    expect(Object.keys(now)).toHaveLength(22);
    for (const [k, v] of Object.entries(now)) expect(v.length, k).toBeGreaterThan(400);
    if (process.env.RECORD_US_CENTRE_SCREENS === '1') {
      execFileSync('git', ['diff', '--quiet', BASE_REF, '--', ...BASE_PATHS], { cwd: process.cwd() });
      const out = process.env.RECORD_US_CENTRE_SCREENS_OUT || FIXTURE;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${JSON.stringify(now, null, 1)}\n`);
      if (out !== FIXTURE) return;
    }
    const recorded: Record<string, Shot> = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    expect(Object.keys(now).sort()).toEqual(Object.keys(recorded).sort());
    const moved = Object.keys(recorded).filter(k => now[k].sha1 !== recorded[k].sha1 || now[k].length !== recorded[k].length);
    expect(moved, 'screens whose NBA or NFL markup moved').toEqual([]);
  }, 120000);

  /* the controls: each changes ONE output of buildUsModel and must move the screen it is printed on */
  const CONTROLS: [string, (m: CentreModel) => void, string[]][] = [
    ['a group label', m => { m.groups![0].label = 'Divisions'; }, ['game']],
    ['the halfway line', m => { m.sport.half = () => 'A changed halfway line.'; }, ['poster']],
    ["the first tile's label", m => { m.review.tiles[0][0] = 'Starts'; }, ['review']],
    ['a review note', m => { m.review.notes = ['A changed note.']; }, ['review']],
    ["the help's footnote", m => { m.help = { ...m.help!, footnote: `${m.help!.footnote} Changed.` }; }, ['help']],
  ];
  for (const [what, change, screens] of CONTROLS) {
    it(`control: ${what} changed moves a recorded screen`, () => {
      if (process.env.RECORD_US_CENTRE_SCREENS === '1' && process.env.RECORD_US_CENTRE_SCREENS_OUT) return;
      const recorded: Record<string, Shot> = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
      for (const sport of Object.keys(MODELS)) {
        const model = MODELS[sport]();
        change(model);
        const now = screensOf(model, sport);
        for (const layout of ['desktop', 'phone']) {
          for (const screen of screens) {
            const k = `${sport}|${layout}|${screen}`;
            expect(now[k].sha1, `${k} with ${what} changed`).not.toBe(recorded[k].sha1);
          }
        }
      }
    }, 120000);
  }
});

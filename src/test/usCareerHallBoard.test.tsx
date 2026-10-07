/**
 * Round 1039: the retirement talk, the farewell season and the Hall of Fame on
 * the one US career board, through all four real bindings.
 *
 * WHAT THIS HOLDS, per sport:
 *   1. An old active save already inside the talk rule opens on the talk (not
 *      on Play), and opening writes nothing. A reload asks it again.
 *   2. Retire now ends the career on the last season played; one more year
 *      goes on to the hub and is not asked again for that season; a farewell
 *      season carries its banner, is played, and ends the career after it.
 *   3. Retire now in the middle of an offseason drops the dealt card unapplied.
 *   4. A retired save, old (no blocks) or new, shows the Hall card; the
 *      induction speech is given once and survives a reload; the Hall pill
 *      waits for the ballot to land.
 *   5. A corrupt retirement, speech or jersey block is dropped alone.
 *   6. The card prints class years only from the rules' verifiedFromClass.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { dealSummer } from '@/lib/usCareerSummer';
import { pendingTalk } from '@/lib/usCareerRetirementFlow';
import { hallRecordFor, runHallBallot, type HallRecord } from '@/lib/careerHallOfFame';
import { HallOfFameCard } from '@/components/career/HallOfFameCard';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const SPORTS: [string, () => UsCareerSport][] = [
  ['nfl', () => NFL_CAREER_SPORT], ['nba', () => NBA_CAREER_SPORT],
  ['mlb', () => MLB_CAREER_SPORT], ['nhl', () => NHL_CAREER_SPORT],
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A career four seasons in, played by the real engine, then aged and dropped
 *  ten points under its best season, so the talk rule holds and the hard stop
 *  does not. Built as an old save would be: no Round 1039 blocks. */
function talkCareer(sport: UsCareerSport, seed: number): { c: UsCareerCore; tq: number } {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s);
    const pos = sport.create.defaultPos;
    const c = sport.startCareer(`Hall ${sport.label} ${s}`, pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'now');
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 4; y += 1) {
      sport.campBattle(c, tq, rng);
      sport.simSeason(c, tq, rng);
      sport.progress(c, rng);
      tq = sport.rollTeamQuality(tq, rng);
    }
    c.pendingRivalryEvent = null;
    c.pendingRivalryChoice = null;
    c.suspendedSeasons = 0;
    c.contractYears = 3;
    c.age = 34;
    c.ovr = 76;
    c.seasons[0].ovr = 86;
    if (sport.shouldRetire(c) || !pendingTalk(c, sport.hall)) continue;
    return { c, tq };
  }
  throw new Error(`${sport.label}: no career inside the talk rule in 300 seeds`);
}

/** A whole career played by the engine to its hard stop, retired. */
function retiredCareer(sport: UsCareerSport, seed: number, wantHof: boolean | null): UsCareerCore {
  for (let s = seed; s < seed + 400; s += 1) {
    const rng = mulberry32(s);
    const pos = sport.create.defaultPos;
    const c = sport.startCareer(`Ballot ${sport.label} ${s}`, pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'now');
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 30 && !sport.shouldRetire(c); y += 1) {
      sport.campBattle(c, tq, rng);
      sport.simSeason(c, tq, rng);
      sport.progress(c, rng);
      tq = sport.rollTeamQuality(tq, rng);
    }
    c.retired = true;
    c.pendingRivalryEvent = null;
    c.pendingRivalryChoice = null;
    if (wantHof !== null && sport.legacyOf(c).hof !== wantHof) continue;
    return c;
  }
  throw new Error(`${sport.label}: no retired career with hof ${wantHof} in 400 seeds`);
}

const save = (sport: UsCareerSport, c: UsCareerCore, tq: number | null, phase: string) =>
  localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase, teamQuality: tq, coach: null }));
const read = (sport: UsCareerSport) => JSON.parse(localStorage.getItem(sport.saveKey)!);
const mount = (sport: UsCareerSport) => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text));
const lastYear = (c: UsCareerCore) => c.seasons[c.seasons.length - 1].year;

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1039));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(SPORTS)('%s: the retirement talk on the board', (_slug, getSport) => {
  it('an old active save inside the rule opens on the talk, writes nothing, and a reload asks again', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 11);
    save(sport, c, tq, 'season');
    const bytes = localStorage.getItem(sport.saveKey);
    mount(sport);
    expect(await waitFor(() => { const t = document.body.textContent ?? ''; expect(t).toContain('Is it time?'); return t; })).not.toContain(`Play the ${c.year} season`);
    expect(localStorage.getItem(sport.saveKey), 'opening writes nothing').toBe(bytes);
    cleanup();
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain('Is it time?'));
  });

  it('Retire now ends the career on the last season played', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 21);
    save(sport, c, tq, 'season');
    mount(sport);
    await waitFor(() => expect(button('Retire now')).toBeTruthy());
    fireEvent.click(button('Retire now')!);
    const after = read(sport);
    expect(after.phase).toBe('retired');
    expect(after.c.retired).toBe(true);
    expect(after.c.seasons.length).toBe(c.seasons.length);
    expect(after.c.retirement).toEqual({ retiredYear: lastYear(c) });
    expect(document.body.textContent).toContain(`${c.name} retires`);
  });

  it('One more year goes to the hub and is not asked again for that season', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 31);
    save(sport, c, tq, 'season');
    mount(sport);
    await waitFor(() => expect(button('One more year')).toBeTruthy());
    fireEvent.click(button('One more year')!);
    expect(read(sport).c.retirement).toEqual({ declinedYears: [lastYear(c)] });
    expect(document.body.textContent).not.toContain('Is it time?');
    expect(button(`Play the ${c.year} season`)).toBeTruthy();
    cleanup();
    mount(sport);
    expect(document.body.textContent).not.toContain('Is it time?');
    expect(button(`Play the ${c.year} season`)).toBeTruthy();
  });

  it('a farewell season carries its banner, is played, and ends the career after it', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 41);
    save(sport, c, tq, 'season');
    mount(sport);
    await waitFor(() => expect(button('Announce a farewell season')).toBeTruthy());
    fireEvent.click(button('Announce a farewell season')!);
    expect(read(sport).c.retirement).toEqual({ farewellYear: lastYear(c) + 1 });
    await waitFor(() => expect(document.body.textContent).toContain(`Farewell season, ${c.year}`));
    fireEvent.click(button(`Play the ${c.year} season`)!);
    const after = read(sport);
    expect(after.phase).toBe('retired');
    expect(after.c.retired).toBe(true);
    expect(lastYear(after.c)).toBe(lastYear(c) + 1);
    expect(document.body.textContent).toContain('Farewell season');
  });

  it('Retire now in the middle of an offseason drops the dealt card unapplied', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 51);
    dealSummer(c, sport);
    expect(c.summer?.ids.length ?? 0).toBeGreaterThan(0);
    save(sport, c, tq, 'event');
    mount(sport);
    await waitFor(() => expect(button('Retire now')).toBeTruthy());
    expect(document.querySelector('[data-career-event]'), 'the talk comes before the card').toBeNull();
    fireEvent.click(button('Retire now')!);
    const after = read(sport).c as UsCareerCore & Record<string, unknown>;
    const before = copy(c) as UsCareerCore & Record<string, unknown>;
    for (const k of ['retired', 'retirement', 'summer']) { delete after[k]; delete before[k]; }
    expect(after, 'nothing but the end and the dropped summer changed').toEqual(before);
  });
});

describe.each(SPORTS)('%s: the Hall of Fame on the retirement screen', (_slug, getSport) => {
  const pills = (sport: UsCareerSport, hof: boolean) => [...document.querySelectorAll('span')].filter(s => s.textContent === sport.hallLine(hof));

  it('an old retired save with no blocks shows the Hall card, and the Hall pill waits for the ballot', async () => {
    const sport = getSport();
    const c = retiredCareer(sport, 100, null);
    save(sport, c, null, 'retired');
    const bytes = localStorage.getItem(sport.saveKey);
    mount(sport);
    const hof = sport.legacyOf(c).hof;
    expect(pills(sport, hof).length, 'the pill is held back while the ballot plays').toBe(0);
    await waitFor(() => expect(document.body.textContent).toContain(sport.hall!.rules.hallName));
    const rec = hallRecordFor(sport.hall!, c);
    expect(rec.outcome === 'inducted').toBe(hof);
    await waitFor(() => expect(pills(sport, hof).length).toBe(1), { timeout: 12000 });
    expect(localStorage.getItem(sport.saveKey), 'opening a retired save writes nothing').toBe(bytes);
  }, 20000);

  it('the induction speech is given once and survives a reload', async () => {
    const sport = getSport();
    const c = retiredCareer(sport, 200, true);
    save(sport, c, null, 'retired');
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain('Your induction speech'));
    fireEvent.click(button('Keep it short')!);
    await waitFor(() => expect(read(sport).c.hallSpeech?.speechId).toBe('short'));
    const given = read(sport).c.hallSpeech;
    expect(given.line).toContain('Four minutes');
    expect(document.body.textContent).not.toContain('Your induction speech');
    cleanup();
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain('Four minutes'));
    expect(document.body.textContent).not.toContain('Your induction speech');
    expect(read(sport).c.hallSpeech).toEqual(given);
  }, 20000);

  it('Continue folds the card to its headline', async () => {
    const sport = getSport();
    const c = retiredCareer(sport, 300, false);
    save(sport, c, null, 'retired');
    mount(sport);
    await waitFor(() => expect(button('Continue')).toBeTruthy());
    const ballots = document.querySelectorAll('li').length;
    fireEvent.click(button('Continue')!);
    expect(document.querySelectorAll('li').length).toBeLessThanOrEqual(ballots);
    expect(button('Continue')).toBeFalsy();
    expect(document.body.textContent).toContain(sport.hall!.rules.hallName);
  }, 20000);

  it('a corrupt retirement, speech or jersey block is dropped alone', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 61);
    const broken = copy(c) as UsCareerCore & Record<string, unknown>;
    broken.retirement = { declinedYears: ['soon'] };
    broken.hallSpeech = { speechId: 'shout' };
    broken.numberRetiredBy = { team: '', year: 12 };
    save(sport, broken as UsCareerCore, tq, 'season');
    mount(sport);
    // The broken retirement block reads as never asked, so the talk comes.
    await waitFor(() => expect(button('One more year')).toBeTruthy());
    fireEvent.click(button('One more year')!);
    const after = read(sport).c;
    expect(after.retirement).toEqual({ declinedYears: [lastYear(c)] });
    expect(after.hallSpeech).toBeUndefined();
    expect(after.numberRetiredBy).toBeUndefined();
    expect(after.name).toBe(c.name);
    expect(after.seasons).toEqual(c.seasons);
  });
});

describe('the card prints class years only from the verified class', () => {
  it('a first class before verifiedFromClass shows ordinal ballots and no rule line; one at it shows the years', () => {
    for (const [, getSport] of SPORTS) {
      const sport = getSport();
      const { rules, lines } = sport.hall!;
      for (const [last, years] of [[rules.verifiedFromClass - rules.firstClassOffset - 1, false], [rules.verifiedFromClass - rules.firstClassOffset, true]] as const) {
        let rec: HallRecord | null = null;
        for (let k = 0; !rec || rec.ballots.length < 2; k += 1) {
          rec = { ...runHallBallot(rules, lines, { key: `era${k}`, hof: true, score: lines.hofLine + 1, lastSeasonYear: last }), jersey: null };
        }
        const view = render(<HallOfFameCard record={rec} rules={rules} onSpeech={() => {}} onDismiss={() => {}} />);
        const text = view.container.textContent ?? '';
        if (years) {
          expect(text).toContain(`Eligible from the Class of ${last + rules.firstClassOffset}.`);
          expect(text).toContain(`${last + rules.firstClassOffset}: `);
        } else {
          expect(text, `${sport.label}: no year before the verified class`).not.toMatch(/\b(19|20)\d\d\b/);
          expect(text).toContain('First ballot: ');
          expect(text).toContain('Second ballot: ');
          expect(text).not.toContain('percent of the vote');
        }
        cleanup();
      }
    }
  });
});

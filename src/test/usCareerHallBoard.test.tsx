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
 *   7. (Review fix) The deck's own retirement cards never come after the talk,
 *      through each of the board's three summer call sites: the deal in
 *      playSeason, the next card in chooseOption, and the card a save is
 *      restored onto. Each test first proves the card WOULD have been shown
 *      with no filter, so a board that drops the filter goes red here.
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
import { dealSummer, laterAnswerMovesRating, movesRating, seekSummerCard, summerCardAt, summerSeason } from '@/lib/usCareerSummer';
import { pendingTalk, repairHallOnLoad, RETIREMENT_CARD_IDS, stampOnRetirement, talkDeckFilter } from '@/lib/usCareerRetirementFlow';
import { HALL_CALIBRATION, hallCalibrationOf, hallRecordFor, runHallBallot, type HallRecord } from '@/lib/careerHallOfFame';
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
    /* Round 1051, review of 2026-10-08: a career a PLAYED season ends (the
       farewell here; the hard stop and a banned year end through the same two
       season end saves) is stamped like one the player ends by hand. Before
       this line a refactor that moved the stamp out of persist and into the
       two pressed handlers passed every test (mutation stampnotseason). */
    expect(after.c.hallCal).toBe(HALL_CALIBRATION);
    expect(hallCalibrationOf(after.c)).toBe(HALL_CALIBRATION);
  });

  it('a farewell season on the last year of the deal opens no extension talk (review fix)', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 45);
    c.contractYears = 1;
    save(sport, c, tq, 'season');
    mount(sport);
    await waitFor(() => expect(button('Announce a farewell season')).toBeTruthy());
    fireEvent.click(button('Announce a farewell season')!);
    await waitFor(() => expect(document.body.textContent).toContain(`Farewell season, ${c.year}`));
    const salary = read(sport).c.salary;
    fireEvent.click(button(`Play the ${c.year} season`)!);
    const after = read(sport);
    expect(after.phase, 'the season is played, not an extension talk').toBe('retired');
    expect(lastYear(after.c)).toBe(lastYear(c) + 1);
    expect(after.c.salary, 'the last year is paid at his own deal').toBe(salary);
    expect(document.body.textContent).not.toContain('reach free agency');
  });

  it('a farewell season with no deal left offers one year deals, and a push adds no year (closing check fix)', async () => {
    const sport = getSport();
    const { c, tq } = talkCareer(sport, 47);
    c.contractYears = 0;
    save(sport, c, tq, 'season');
    mount(sport);
    await waitFor(() => expect(button('Announce a farewell season')).toBeTruthy());
    fireEvent.click(button('Announce a farewell season')!);
    await waitFor(() => expect(document.body.textContent).toContain(`Farewell season, ${c.year}`));
    fireEvent.click(button(`Play the ${c.year} season`)!);
    await waitFor(() => expect(document.querySelector('[data-fa-window]')).toBeTruthy());
    const terms = () => [...document.querySelectorAll('[data-fa-offer]')].map(o => o.textContent?.match(/x (\d+) yr/)?.[1]);
    expect(terms().length).toBeGreaterThan(0);
    expect(terms().every(y => y === '1'), `offer lengths ${terms().join(',')}`).toBe(true);
    /* Every draw low: the push comes up and asks for length, which is the
       branch that used to add a year. */
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    fireEvent.click(button('Push for more')!);
    await waitFor(() => expect(document.body.textContent).toContain('came up'));
    expect(terms().every(y => y === '1'), `offer lengths after a push ${terms().join(',')}`).toBe(true);
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(47));
    fireEvent.click(button('Sign')!);
    expect(read(sport).c.contractYears).toBe(1);
    fireEvent.click(button(`Play the ${c.year} season`)!);
    const after = read(sport);
    expect(after.phase).toBe('retired');
    expect(lastYear(after.c)).toBe(lastYear(c) + 1);
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
    // Round 1051: the save that retires a career also stamps its legacy calibration.
    expect(after.hallCal).toBe(2);
    for (const k of ['retired', 'retirement', 'summer', 'hallCal']) { delete after[k]; delete before[k]; }
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
    broken.retirement = { declinedYears: ['soon'] } as unknown as UsCareerCore['retirement'];
    broken.hallSpeech = { speechId: 'shout' } as unknown as UsCareerCore['hallSpeech'];
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

/* Round 1051: the calibration stamp. One optional save key, hallCal, written
   only by the save that retires a career with the Hall bound, and only as
   today's calibration. A retired save with no stamp retired before the round:
   it reads calibration 1 and is never stamped afterwards, whatever is saved
   on top of it. Controls, each run once by hand and noted in the round's
   commit: the stamp line deleted from persist turns the first case red; a
   stampOnRetirement that ignores the disk turns the third case red. */
/** An active career six seasons in (so the hub has 'Hang them up now'),
 *  outside the talk rule and the hard stop. Built as an old save would be. */
function activeCareer(sport: UsCareerSport, seed: number): { c: UsCareerCore; tq: number } {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s);
    const pos = sport.create.defaultPos;
    const c = sport.startCareer(`Stamp ${sport.label} ${s}`, pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'now');
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 6; y += 1) {
      sport.campBattle(c, tq, rng);
      sport.simSeason(c, tq, rng);
      sport.progress(c, rng);
      tq = sport.rollTeamQuality(tq, rng);
    }
    c.pendingRivalryEvent = null;
    c.pendingRivalryChoice = null;
    c.suspendedSeasons = 0;
    c.contractYears = 3;
    if (c.retired || sport.shouldRetire(c) || pendingTalk(c, sport.hall)) continue;
    return { c, tq };
  }
  throw new Error(`${sport.label}: no active career outside the talk rule in 300 seeds`);
}

describe.each(SPORTS)('%s: the calibration stamp (Round 1051)', (_slug, getSport) => {
  const hangUp = async () => {
    await waitFor(() => expect(button('Hang them up now')).toBeTruthy());
    fireEvent.click(button('Hang them up now')!);
    await waitFor(() => expect(button('Retire this player')).toBeTruthy());
    fireEvent.click(button('Retire this player')!);
  };

  it('an active save retired through the board is saved with hallCal 2', async () => {
    const sport = getSport();
    const { c, tq } = activeCareer(sport, 71);
    expect((c as UsCareerCore).hallCal).toBeUndefined();
    save(sport, c, tq, 'season');
    mount(sport);
    await hangUp();
    await waitFor(() => expect(read(sport).phase).toBe('retired'));
    const after = read(sport).c as UsCareerCore;
    expect(after.retired).toBe(true);
    expect(after.hallCal).toBe(HALL_CALIBRATION);
    expect(HALL_CALIBRATION).toBe(3);
    expect(hallCalibrationOf(after)).toBe(3);
    // The retired screen reads the stamped career: its legacy is the saved one's.
    await waitFor(() => expect(document.body.textContent).toContain(`${c.name} retires`));
    expect(document.body.textContent).toContain(sport.legacyOf(after).verdict);
    // The ballot card says what the voters weighed: the record's own line, which opens with the sport's sentence.
    const line = await waitFor(() => { const el = document.querySelector('[data-hall-weighs]'); expect(el).toBeTruthy(); return el!; }, { timeout: 12000 });
    const rec = hallRecordFor(sport.hall!, after);
    expect(line.textContent).toBe(rec.weighs);
    expect(rec.weighs!.startsWith('The voters weigh the hardware first: ')).toBe(true);
    // A reload keeps the stamp and writes nothing.
    const bytes = localStorage.getItem(sport.saveKey);
    cleanup();
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain(`${c.name} retires`));
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  }, 20000);

  it('with no Hall bound the same retirement writes no hallCal: the save is byte for byte the old one', async () => {
    const sport = { ...getSport(), hall: undefined };
    const { c, tq } = activeCareer(sport, 71);
    save(sport, c, tq, 'season');
    mount(sport);
    await hangUp();
    await waitFor(() => expect(read(sport).phase).toBe('retired'));
    const expected = copy(c);
    expected.retired = true;
    expect(localStorage.getItem(sport.saveKey)).toBe(JSON.stringify({ c: expected, phase: 'retired', teamQuality: tq, coach: null }));
    expect('hallCal' in read(sport).c).toBe(false);
  }, 20000);

  it('a retired save with no stamp reads calibration 1 and is never stamped: not by the speech, not by a coach career', async () => {
    const sport = getSport();
    const c = retiredCareer(sport, 200, true);
    expect(hallCalibrationOf(c)).toBe(1);
    save(sport, c, null, 'retired');
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain('Your induction speech'));
    expect(document.querySelector('[data-hall-weighs]'), 'a calibration 1 card prints no voters line').toBeNull();
    expect('weighs' in hallRecordFor(sport.hall!, c)).toBe(false);
    fireEvent.click(button('Keep it short')!);
    await waitFor(() => expect(read(sport).c.hallSpeech?.speechId).toBe('short'));
    expect('hallCal' in read(sport).c, 'the speech writes no stamp on an old retired save').toBe(false);
    fireEvent.click(button('Go after a coaching job')!);
    await waitFor(() => expect(read(sport).phase).toBe('coach'));
    expect('hallCal' in read(sport).c, 'a coach career begun writes no stamp').toBe(false);
    await waitFor(() => expect(button('Back to the playing career')).toBeTruthy());
    fireEvent.click(button('Back to the playing career')!);
    await waitFor(() => expect(read(sport).phase).toBe('retired'));
    const after = read(sport).c as UsCareerCore;
    expect('hallCal' in after, 'a coach career left writes no stamp').toBe(false);
    expect(hallCalibrationOf(after)).toBe(1);
    expect(sport.legacyOf(after)).toEqual(sport.legacyOf(c));
  }, 30000);

  it('a junk stamp is dropped on load and the save reads calibration 1', async () => {
    const sport = getSport();
    const c = retiredCareer(sport, 200, true);
    (c as unknown as { hallCal: unknown }).hallCal = 7;
    const loaded = copy(c) as UsCareerCore;
    repairHallOnLoad(loaded);
    expect('hallCal' in loaded).toBe(false);
    expect(hallCalibrationOf(c)).toBe(1);
    save(sport, c, null, 'retired');
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain('Your induction speech'));
    fireEvent.click(button('Keep it short')!);
    await waitFor(() => expect(read(sport).c.hallSpeech?.speechId).toBe('short'));
    expect('hallCal' in read(sport).c, 'the next save no longer carries the junk stamp, and no new one').toBe(false);
  }, 20000);

  it('a retired save stamped 2 reads calibration 2 on every later load and keeps its stamp', async () => {
    const sport = getSport();
    const c = retiredCareer(sport, 200, true);
    c.hallCal = 2;
    expect(hallCalibrationOf(c)).toBe(2);
    save(sport, c, null, 'retired');
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain(sport.hall!.rules.hallName));
    const first = hallRecordFor(sport.hall!, c);
    if (first.outcome === 'inducted') {
      await waitFor(() => expect(document.body.textContent).toContain('Your induction speech'));
      fireEvent.click(button('Keep it short')!);
      await waitFor(() => expect(read(sport).c.hallSpeech?.speechId).toBe('short'));
    }
    expect(read(sport).c.hallCal).toBe(2);
    cleanup();
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain(sport.hall!.rules.hallName));
    await waitFor(() => expect(document.querySelector('[data-hall-weighs]')).toBeTruthy(), { timeout: 12000 });
    expect(read(sport).c.hallCal).toBe(2);
    expect(hallCalibrationOf(read(sport).c)).toBe(2);
  }, 20000);

  /* Review of 2026-10-08, measured on basketball: tab A retires him (the save
     is stamped), tab B still holds him live and retires him too. The second
     write used to carry no stamp, because the disk already said retired, and
     the career read calibration 1 on every later load. */
  it('two tabs: retired a moment ago in another tab, this tab\'s retirement keeps the stamp that tab wrote', async () => {
    const sport = getSport();
    const { c, tq } = activeCareer(sport, 71);
    save(sport, c, tq, 'season');
    mount(sport);
    await waitFor(() => expect(button('Hang them up now')).toBeTruthy());
    const other = copy(c);
    other.retired = true;
    other.hallCal = HALL_CALIBRATION;
    localStorage.setItem(sport.saveKey, JSON.stringify({ c: other, phase: 'retired', teamQuality: tq, coach: null, otherTab: true }));
    await hangUp();
    await waitFor(() => expect('otherTab' in read(sport), 'this tab has written its own save').toBe(false));
    const after = read(sport).c as UsCareerCore;
    expect(after.retired).toBe(true);
    expect(after.hallCal).toBe(HALL_CALIBRATION);
    expect(hallCalibrationOf(after)).toBe(HALL_CALIBRATION);
  }, 20000);

  it('the stamp reads the disk: a live save stamps, the same man retired there hands his stamp on, anyone else\'s is left alone', () => {
    const sport = getSport();
    const { c, tq } = activeCareer(sport, 71);
    const retiring = (): UsCareerCore => { const r = copy(c); r.retired = true; return r; };
    // The disk holds him live: this write is the retirement.
    save(sport, c, tq, 'season');
    const a = retiring();
    stampOnRetirement(a, sport.saveKey);
    expect(a.hallCal).toBe(HALL_CALIBRATION);
    // The disk holds him retired with no stamp: an old retired save written again.
    save(sport, retiring(), tq, 'retired');
    const b = retiring();
    stampOnRetirement(b, sport.saveKey);
    expect('hallCal' in b).toBe(false);
    // The disk holds him retired and stamped: the other tab's stamp is kept.
    const stamped = retiring();
    stamped.hallCal = HALL_CALIBRATION;
    save(sport, stamped, tq, 'retired');
    const d = retiring();
    stampOnRetirement(d, sport.saveKey);
    expect(d.hallCal).toBe(HALL_CALIBRATION);
    // The disk holds ANOTHER man retired and stamped: an old retired save takes nothing from him.
    const stranger = retiring();
    stranger.name = `${c.name} the Second`;
    stranger.hallCal = HALL_CALIBRATION;
    save(sport, stranger, tq, 'retired');
    const e = retiring();
    stampOnRetirement(e, sport.saveKey);
    expect('hallCal' in e).toBe(false);
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

/* ── 7. The deck's retirement cards never come after the talk (review fix) ── */

type Vet = UsCareerCore & { health: number; earnings: number };
const isRet = (id: string | null | undefined) => !!id && RETIREMENT_CARD_IDS.has(id);
const shownCard = () => document.querySelector('[data-career-event]')?.getAttribute('data-career-event') ?? null;
const option = (i: number) => document.querySelector<HTMLButtonElement>(`[data-career-decision-option="${i}"]`)!;

/** A veteran twelve seasons in, played by the real engine, then set inside the
 *  talk rule with the deck's own retirement cards open to him (old enough,
 *  healthy, paid). No rival, so no rivalry beat stands between a season and
 *  the talk. Built as an old save would be: no Round 1039 blocks. */
function deckCareer(sport: UsCareerSport, seed: number): { c: UsCareerCore; tq: number } {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s);
    const pos = sport.create.defaultPos;
    const c = sport.startCareer(`Deck ${sport.label} ${s}`, pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'now') as Vet;
    c.summerSalt = 'fixture';
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 12 && !sport.shouldRetire(c); y += 1) {
      sport.campBattle(c, tq, rng);
      sport.simSeason(c, tq, rng);
      sport.progress(c, rng);
      tq = sport.rollTeamQuality(tq, rng);
    }
    if (c.seasons.length < 12) continue;
    c.pendingRivalryEvent = null;
    c.pendingRivalryChoice = null;
    delete c.rival;
    c.suspendedSeasons = 0;
    c.contractYears = 3;
    c.age = 36;
    c.ovr = 74;
    c.health = 90;
    c.earnings = 500;
    c.seasons[0].ovr = 90;
    if (sport.shouldRetire(c) || !pendingTalk(c, sport.hall)) continue;
    if (!sport.eventDeck(c, mulberry32(s)).some(e => isRet(e.id))) continue;
    return { c, tq };
  }
  throw new Error(`${sport.label}: no veteran with a deck retirement card open in 300 seeds`);
}

/** The sport with the offseason's first draw forced to a deck retirement card
 *  whenever the deck holds one, so the test never waits on the draw to find
 *  it. The real draw still runs first, on the same stream. */
const rigged = (sport: UsCareerSport): UsCareerSport => ({
  ...sport,
  drawEvent: (c, r) => {
    const real = sport.drawEvent(c, r);
    return sport.eventDeck(c, r).find(e => isRet(e.id)) ?? real;
  },
});

describe.each(SPORTS)('%s: the deck retirement cards never come after the talk', (_slug, getSport) => {
  it('playSeason: a season played inside the rule deals none, and none is shown after One more year', async () => {
    const sport = rigged(getSport());
    const { c, tq } = deckCareer(sport, 71);
    c.retirement = { declinedYears: [lastYear(c)] };
    save(sport, c, tq, 'season');
    mount(sport);
    fireEvent.click(button(`Play the ${c.year} season`)!);
    const after = read(sport);
    expect(after.phase, 'the season ends in an offseason').toBe('event');
    expect(after.c.pendingRivalryEvent ?? null).toBeNull();
    expect(after.c.pendingRivalryChoice ?? null).toBeNull();
    expect(pendingTalk(after.c, sport.hall), 'the season lands inside the rule').not.toBeNull();
    // With no filter this same career is dealt the retirement card first.
    const open = copy(after.c);
    delete open.summer;
    dealSummer(open, sport);
    expect(isRet(open.summer?.ids[0]), 'unfiltered, the deal hands him the retirement card').toBe(true);
    expect((after.c.summer?.ids ?? []).filter(isRet), 'the board dealt none').toEqual([]);
    fireEvent.click(button('Continue')!);
    await waitFor(() => expect(button('One more year')).toBeTruthy());
    expect(shownCard(), 'the talk comes before any card').toBeNull();
    fireEvent.click(button('One more year')!);
    // Walk the whole summer: no card it shows is a retirement card.
    for (let k = 0; k < 4 && shownCard(); k += 1) {
      expect(isRet(shownCard()), `card ${k + 1} is not a retirement card`).toBe(false);
      fireEvent.click(option(0));
      const next = document.querySelector<HTMLButtonElement>('[data-decision-continue]');
      if (next) fireEvent.click(next);
    }
    expect(read(sport).c.retirement).toEqual({ declinedYears: [lastYear(c), lastYear(c) + 1] });
  });

  it('restore: a save standing on a deck retirement card dealt before the talk never shows it', async () => {
    const sport = getSport();
    const { c, tq } = deckCareer(sport, 81);
    const ret = sport.eventDeck(c, mulberry32(1)).find(e => isRet(e.id))!;
    // A summer dealt before the talk existed (a Round 1038 save) stands on it.
    c.summer = { year: summerSeason(c), ids: [ret.id], at: 0 };
    expect(seekSummerCard(copy(c), sport, null)?.id, 'unfiltered, the restore shows it').toBe(ret.id);
    save(sport, c, tq, 'event');
    mount(sport);
    await waitFor(() => expect(button('One more year')).toBeTruthy());
    fireEvent.click(button('One more year')!);
    expect(shownCard()).toBeNull();
    expect(document.body.textContent).not.toContain(ret.title);
    const after = read(sport).c;
    expect(after.summer).toBeUndefined();
    expect(after.retirement, 'none of its answers was applied').toEqual({ declinedYears: [lastYear(c)] });
  });

  it('chooseOption: a deck retirement card later in the summer is skipped after the talk was answered', () => {
    const sport = getSport();
    const { c, tq } = deckCareer(sport, 91);
    c.retirement = { declinedYears: [lastYear(c)] };
    // A rating already one over its ceiling: a +1 answer cannot move it, so
    // the later card rule alone would let the card through.
    c.pot = c.ovr - 1;
    const year = summerSeason(c);
    let found: { first: string; ret: string } | null = null;
    for (const ret of sport.eventDeck(c, mulberry32(1)).filter(e => isRet(e.id))) {
      for (const first of sport.eventDeck(c, mulberry32(2))) {
        if (isRet(first.id) || first.press || movesRating(c, first)) continue;
        const probe = copy(c);
        probe.summer = { year, ids: [first.id, ret.id], at: 0 };
        if (summerCardAt(probe, sport, 0)?.id !== first.id) continue;
        const later = summerCardAt(probe, sport, 1);
        if (!later || laterAnswerMovesRating(probe, sport, later, 1)) continue;
        found = { first: first.id, ret: ret.id };
        break;
      }
      if (found) break;
    }
    expect(found, `${sport.label}: a quiet first card and a still retirement card`).not.toBeNull();
    c.summer = { year, ids: [found!.first, found!.ret], at: 0 };
    save(sport, c, tq, 'event');
    mount(sport);
    expect(shownCard()).toBe(found!.first);
    fireEvent.click(option(0));
    const after = read(sport).c;
    // Unfiltered, the same career after the same answer is shown the card.
    const open = copy(after);
    open.summer = { year, ids: [found!.first, found!.ret], at: 1 };
    expect(seekSummerCard(open, sport, null)?.id, 'unfiltered, the next card is the retirement card').toBe(found!.ret);
    expect(read(sport).phase, 'the summer ends instead').toBe('season');
    expect(after.summer).toBeUndefined();
    expect(after.retirement).toEqual({ declinedYears: [lastYear(c)] });
    const next = document.querySelector<HTMLButtonElement>('[data-decision-continue]');
    if (next) fireEvent.click(next);
    expect(shownCard()).toBeNull();
  });

  it('the filter reads the career when it is asked, so a talk that comes mid-summer holds the cards out', () => {
    const sport = getSport();
    const { c } = deckCareer(sport, 101);
    const ret = sport.eventDeck(c, mulberry32(1)).find(e => isRet(e.id))!;
    const quiet = sport.eventDeck(c, mulberry32(1)).find(e => !isRet(e.id))!;
    expect(talkDeckFilter(c, undefined), 'no Hall bound, no filter').toBeNull();
    c.ovr = c.seasons[0].ovr;
    const filter = talkDeckFilter(c, sport.hall)!;
    expect(pendingTalk(c, sport.hall), 'back at his peak, no talk').toBeNull();
    expect(filter(ret)).toBe(false);
    c.ovr = 74;
    expect(filter(ret), 'the same filter, after a drop into the rule').toBe(true);
    expect(filter(quiet)).toBe(false);
    c.retirement = { declinedYears: [lastYear(c)] };
    expect(pendingTalk(c, sport.hall)).toBeNull();
    expect(filter(ret), 'answered One more year this offseason').toBe(true);
  });
});

/* ── 8. The jersey: the deck card's club, and saves from before the record (review fixes) ── */

const JERSEY: [string, () => UsCareerSport, string, string][] = [
  ['nfl', () => NFL_CAREER_SPORT, 'lifeB_jerseyRetirement', 'b_jersey'],
  ['nba', () => NBA_CAREER_SPORT, 'nbaB_jerseyRetirement', 'nb_jersey'],
  ['mlb', () => MLB_CAREER_SPORT, 'mlbB_numberRetired', 'b_number'],
];
type Flagged = UsCareerCore & { lifeFlags?: Record<string, number>; fanbase: number };

describe.each(JERSEY)('%s: the deck jersey card and the Hall card', (_slug, getSport, cardId, flagName) => {
  it('the card is offered only by a club he has played a season for', () => {
    const sport = getSport();
    const { c } = deckCareer(sport, 111);
    const f = c as Flagged;
    f.fanbase = 90;
    expect(sport.eventDeck(c, mulberry32(3)).some(e => e.id === cardId), 'a long career at his club is offered it').toBe(true);
    // The same career just traded: not one season line at the club he is at.
    for (const s of c.seasons) s.team = `${s.team}-before`;
    expect(sport.eventDeck(c, mulberry32(3)).some(e => e.id === cardId), 'a club he never played for is not').toBe(false);
  });

  it('an old save whose deck card retired the number, with no club kept, shows no jersey line', async () => {
    const sport = getSport();
    let c: UsCareerCore | null = null;
    for (let s = 200; !c; s += 1) {
      const cand = retiredCareer(sport, s, true);
      if (hallRecordFor(sport.hall!, cand).jersey) c = cand;
    }
    const plain = hallRecordFor(sport.hall!, c);
    const old = copy(c) as Flagged;
    old.lifeFlags = { ...(old.lifeFlags ?? {}), [flagName]: 1 };
    expect(hallRecordFor(sport.hall!, old).jersey, 'retired on the card, club unknown').toBeNull();
    old.lifeFlags[flagName] = 2;
    expect(hallRecordFor(sport.hall!, old).jersey).toBeNull();
    old.lifeFlags[flagName] = 3;
    expect(hallRecordFor(sport.hall!, old).jersey, 'the wait answer leaves jerseyFor deciding').toEqual(plain.jersey);
    old.lifeFlags[flagName] = 1;
    old.numberRetiredBy = { team: c.seasons[0].team, year: c.seasons[0].year };
    expect(hallRecordFor(sport.hall!, old).jersey?.team, 'a recorded club wins').toBe(c.seasons[0].team);
    delete old.numberRetiredBy;
    save(sport, old, null, 'retired');
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain(sport.hall!.rules.hallName));
    expect(document.body.textContent).not.toContain('retired your number');
    // The same career without the flag prints the line, so the check above is not empty.
    cleanup();
    save(sport, c, null, 'retired');
    mount(sport);
    await waitFor(() => expect(document.body.textContent).toContain('retired your number'));
  }, 20000);
});

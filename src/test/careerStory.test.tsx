/**
 * Round 974: the Soccer Career story keeps every finished season.
 *
 * Both season steps used to start with events = [], so a career could only
 * ever read the season it was in. The engine now writes the season that is
 * ending into CareerState.story at both resets. This file holds:
 *   1. Twelve seasons driven by the real engine on three seeds: every
 *      season's lines are in the story, in order, nothing lost, nothing
 *      written twice, each under the year of the row it belongs to.
 *   2. The story draws nothing: the same seed with the story stripped before
 *      every step plays the identical career.
 *   3. An old save with no story loads with an empty one, shows the current
 *      season only, and starts its story from the season it loads.
 *   4. A damaged story resets alone and costs the career nothing else.
 *   5. Save size: the longest career the engine plays plus a ten season
 *      dugout career stays under SIZE_BOUND (measured, see the constant).
 *   6. The real page: Latest Events opens the story, a season tile opens and
 *      Back returns to the tiles; the retired screen carries the same list.
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  const supabase = {
    from: () => chain(),
    rpc: () => chain(),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import SoccerCareer from '@/pages/SoccerCareer';
import CareerStory, { storyTiles, storyStartsLate } from '@/components/soccer-career/CareerStory';

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'soccerCareerSave';
const clubs = E.FALLBACK_CLUBS;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const tick = (ms = 5) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const mount = (el: JSX.Element) => render(<HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>);
async function press(el: Element) { await act(async () => { fireEvent.click(el); }); await tick(); }

type Archived = { year: number; age: number; club: string; lines: string[] };
/* One answer per screen, the way the page would have been answered. Before
   every season step it notes what the log holds and which row it belongs to,
   which is exactly what the story must end up holding. */
function step(s: CareerState, seen: Archived[], strip = false): CareerState {
  const before = strip ? { ...s, story: undefined } : s;
  const note = () => {
    const row = s.seasons[s.seasons.length - 1];
    if (s.events.length > 0) seen.push({ year: row.year, age: row.age, club: row.club, lines: [...s.events] });
  };
  switch (s.phase) {
    case 'youth': note(); return E.advanceYouthYear(before, clubs);
    case 'playing': note(); return E.advanceProSeason(before, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': return (s.transferSituation as any)?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`no move for ${s.phase}`);
  }
}

function newCareer(seed: number, ovr = 70): CareerState {
  const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
  return E.initCareer(`Story ${seed}`, 'England', 'CM', '2020s', st, ovr, 2020, clubs, null, 88);
}
/* Plays until `seasons` season steps have run (or the career ends). */
function play(seed: number, seasons: number, strip = false): { s: CareerState; seen: Archived[] } {
  Math.random = seeded(seed);
  let s = newCareer(seed);
  const seen: Archived[] = [];
  let steps = 0;
  for (let guard = 0; guard < 2000; guard++) {
    if (s.retired || steps >= seasons) break;
    const isStep = s.phase === 'youth' || s.phase === 'playing';
    s = step(s, seen, strip);
    if (isStep) steps++;
  }
  return { s, seen };
}

const realRandom = Math.random;
beforeEach(() => {
  localStorage.clear();
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* jsdom */ }
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  if (!('IntersectionObserver' in window)) {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  }
  if (!('ResizeObserver' in window)) {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  }
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Math.random = realRandom; });
afterAll(async () => { await new Promise(r => setTimeout(r, 1500)); });

describe('Soccer Career: the story keeps every season', () => {
  it.each([9741, 9742, 9743])('twelve seasons on seed %i: every line kept, in order, once', seed => {
    const { s, seen } = play(seed, 13);
    const story = s.story ?? [];
    expect(seen.length, 'the driver saw twelve finished seasons').toBeGreaterThanOrEqual(12);
    expect(story.length).toBe(seen.length);
    story.forEach((entry, i) => {
      expect(entry.year, `season ${i} year`).toBe(seen[i].year);
      expect(entry.age).toBe(seen[i].age);
      expect(entry.club).toBe(seen[i].club);
      expect(entry.lines, `season ${i} lines`).toEqual(seen[i].lines);
      expect(entry.more, 'no season was cut').toBeUndefined();
    });
    for (let i = 1; i < story.length; i++) expect(story[i].year).toBeGreaterThan(story[i - 1].year);
    const kept = story.reduce((n, e) => n + e.lines.length, 0);
    expect(kept).toBe(seen.reduce((n, e) => n + e.lines.length, 0));
    expect(kept, 'a real story, not an empty one').toBeGreaterThan(36);
  });

  it('the story draws nothing: the same seed without it plays the same career', () => {
    const a = play(9744, 14).s;
    const b = play(9744, 14, true).s;
    expect(JSON.stringify(b.seasons)).toBe(JSON.stringify(a.seasons));
    expect(b.events).toEqual(a.events);
    expect(b.overall).toBe(a.overall);
    expect(b.netWorth).toBe(a.netWorth);
  });

  it('a signing and a loan add to the season log instead of writing over it', () => {
    Math.random = seeded(9753);
    let s = newCareer(9753);
    const seen: Archived[] = [];
    for (let guard = 0; guard < 400 && s.phase !== 'contract_offer'; guard++) s = step(s, seen);
    expect(s.phase).toBe('contract_offer');
    const before = [...s.events];
    expect(before.length).toBeGreaterThan(0);
    const offer = s.pendingOffers[0];
    const signed = E.acceptOffer(s, offer);
    expect(signed.events.slice(0, before.length), 'the season before the signing is still there').toEqual(before);
    expect(signed.events[before.length]).toContain(`Signed with ${offer.club.name}`);
    const loaned = E.acceptLoan(signed, { ...offer, isLoan: true });
    expect(loaned.events.slice(0, signed.events.length)).toEqual(signed.events);
    expect(loaned.events.some(l => l.includes('Off on loan'))).toBe(true);
    expect(s.events, 'the save it came from is untouched').toEqual(before);
  });
});

describe('Soccer Career: old and damaged stories', () => {
  it('a save with no story loads empty, shows this season only, and starts its story here', () => {
    const { s } = play(9745, 6);
    const old = JSON.parse(JSON.stringify(s));
    delete old.story;
    const loaded = E.repairCareer(old as CareerState);
    expect(loaded.story).toEqual([]);
    const tiles = storyTiles(loaded);
    expect(tiles.length).toBe(1);
    expect(tiles[0].current).toBe(true);
    expect(tiles[0].lines).toEqual(s.events);
    expect(storyStartsLate(loaded, tiles), 'earlier seasons are honestly missing').toBe(tiles[0].year);
    let next = loaded;
    const seen: Archived[] = [];
    for (let guard = 0; guard < 200 && seen.length < 1; guard++) next = step(next, seen);
    expect(next.story?.length).toBe(1);
    expect(next.story?.[0].lines).toEqual(seen[0].lines);
    expect(seen[0].lines.slice(0, s.events.length), "the loaded season opens its story").toEqual(s.events);
  });

  it('a damaged story resets alone', () => {
    const { s } = play(9746, 5);
    const good = s.story ?? [];
    expect(good.length).toBeGreaterThan(2);
    const notList = E.repairCareer({ ...s, story: 'garbage' as any });
    expect(notList.story).toEqual([]);
    expect(notList.seasons).toEqual(s.seasons);
    expect(notList.events).toEqual(s.events);
    const oneBad = E.repairCareer({ ...s, story: [good[0], { year: 'x', lines: [] }, good[1], { ...good[2], lines: [1, 2] }] as any });
    expect(oneBad.story).toEqual([good[0], good[1]]);
    const same = E.repairCareer({ ...s });
    expect(same.story, 'a good story comes back as the same list').toBe(s.story);
  });

  it('a season longer than the cap keeps the cap and counts the rest', () => {
    const { s } = play(9747, 3);
    const flood = Array.from({ length: E.STORY_LINES_PER_SEASON + 7 }, (_, i) => `line ${i}`);
    const story = E.archiveSeasonStory({ ...s, events: flood });
    const last = story[story.length - 1];
    expect(last.lines.length).toBe(E.STORY_LINES_PER_SEASON);
    expect(last.lines[0]).toBe('line 0');
    expect(last.more).toBe(7);
    expect(story.length).toBe((s.story ?? []).length + 1);
  });
});

/* MEASURED 2026-10-03 by this test, the longest career the engine plays
   (27 to 29 season rows) plus ten manager seasons:
     seed 9748: 27 rows, 26 story seasons, story 13,278 B, save 49,227 B (35,949 without)
     seed 9749: 28 rows, 27 story seasons, story 14,058 B, save 53,267 B (39,209 without)
     seed 9750: 29 rows, 28 story seasons, story 13,772 B, save 52,645 B (38,873 without)
   So the story adds about 13 to 14 KB, roughly 500 bytes a season. The bound
   is 80,000 bytes for the whole save (half again over the largest measured)
   and 1,000 bytes a story season (twice the measured mean), so a story line
   that starts carrying data instead of words, or a season written twice,
   fails here long before a browser quota would notice.

   RE-MEASURED at Release AQ (2026-10-09, release-aq-int f4aed166, on a CI
   runner), because the Soccer Career train (the other lane's Rounds 1169 to
   1178) saves more on purpose: Round 1173 keeps every season's continental
   cup games on its row (about 2 KB a season he qualified, 40 KB on seed
   9750), Round 1175 keeps each 2026 on season's own division (the 18 to 24
   clubs, its champion and the two or three clubs that left it) and the
   career's ten divisions, and the log gained the lines for a ban, a move and
   a club changing division:
     seed 9748: 28 rows, 27 story seasons, story 15,424 B, save 121,128 B
     seed 9749: 28 rows, 27 story seasons, story 19,322 B, save 111,444 B
     seed 9750: 28 rows, 27 story seasons, story 17,737 B, save 129,978 B
   As the train arrived these were 149,900, 147,263 and 162,178 B: every row
   also carried the whole world's 26 moves a season, read by nothing, which
   the release cut to the clubs that left his own division (34 to 40 KB).
   The bound keeps its rule, half again over the largest measured, which is
   195,000 B now. The story's own bound does not move (571 to 716 B a season
   here). THIS NUMBER IS THE RELEASE LEAD'S TO CONFIRM: it was moved by the
   integration, in a commit of its own, so the whole suite could be read. */
const SIZE_BOUND = 195_000;
const STORY_BYTES_PER_SEASON = 1_000;
describe('Soccer Career: the story keeps the save small', () => {
  it.each([9748, 9749, 9750])('the longest career on seed %i plus ten dugout seasons stays under the bound', seed => {
    let { s } = play(seed, 99);
    expect(s.retired, 'the career ran to its end').toBe(true);
    const playing = s.seasons.length;
    s = E.choosePostRetirement(s, 'manager', clubs);
    for (let i = 0; i < 10; i++) s = E.advanceManagerSeason(s, clubs);
    const bytes = JSON.stringify(s).length;
    const story = JSON.stringify(s.story ?? []).length;
    console.log(`[story size] seed ${seed}: ${playing} season rows, ${s.story?.length} story seasons, story ${story} bytes, save ${bytes} bytes, save without story ${bytes - story}`);
    expect(playing + 10, 'thirty seasons and more in all').toBeGreaterThanOrEqual(30);
    expect(bytes).toBeLessThan(SIZE_BOUND);
    expect(story / Math.max(1, s.story?.length ?? 0)).toBeLessThan(STORY_BYTES_PER_SEASON);
    expect(s.story?.length, 'every finished playing season is in the book').toBe(playing - 1);
    /* the save in the train's parts, see THE PARTS below */
    const p = saveParts(s);
    console.log(`[save parts] seed ${seed}: rest ${p.rest} bytes, cup games ${p.cup} bytes over ${p.cupRows} seasons, division ${p.division} bytes over ${p.divisionRows} seasons, ten divisions ${p.ten} bytes`);
    expect(p.rest, 'what the save held before the train still fits the bound it had then').toBeLessThan(REST_BOUND);
    expect(p.cupRows, 'continental seasons to measure').toBeGreaterThanOrEqual(PART_SEASONS_FLOOR);
    expect(p.divisionRows, 'seasons with a division to measure').toBeGreaterThanOrEqual(PART_SEASONS_FLOOR);
    expect(p.cup / p.cupRows).toBeLessThan(CUP_BYTES_PER_SEASON);
    expect(p.division / p.divisionRows).toBeLessThan(DIVISION_BYTES_PER_SEASON);
    expect(p.ten).toBeLessThan(TEN_DIVISIONS_BYTES);
  });
});

/* THE PARTS (Release AQ, 2026-10-09). The whole save bound above had to move
   for the Soccer Career train, and a bound half again over 130 KB cannot see
   what the old one saw: the 34 to 40 KB the train first wasted on every row
   (the whole world's moves) would have passed under 195,000. So the save is
   also measured in the parts the train made of it, each against its own
   number:
     the rest: everything but the three parts below, which is what the save
       held before the train. It keeps the bound the whole save had before the
       train, 80,000, unchanged.
     cup games: a season row's continental cup games (Round 1173), by the
       season that kept them. Twice the measured mean, the story's rule.
     division: a 2026 on season row's own division (Round 1175), by the season
       that kept one. Twice the measured mean.
     ten divisions: the career's ten divisions, one object. Half again over
       the largest measured, the whole save's rule.
   MEASURED by this test on release-aq-int 80ff26bd (CI runner):
     seed 9748: save 120,662 B; rest 65,922; cup games 36,723 over 21 seasons
       (1,749 a season); division 12,902 over 21 (614); ten divisions 4,491
     seed 9749: save 110,158 B; rest 72,165; cup games 20,184 over 12 seasons
       (1,682 a season); division 12,810 over 21 (610); ten divisions 4,501
     seed 9750: save 129,978 B; rest 73,150; cup games 40,056 over 23 seasons
       (1,742 a season); division 11,655 over 19 (613); ten divisions 4,495
   The same test on Release AP (cbff760c, the release before the train; the
   seeds play other careers there, the train moves the draws) measured the
   whole save at 61,560, 70,636 and 78,058 B, so the rest sits where the whole
   save sat and the old bound has more room over it than it had then. Budgets:
   cup games 3,500 a season (mean 1,724), division 1,250 a season (mean 612),
   ten divisions 6,800 (largest 4,501). With the world's moves back on every
   row a season's division measures about 2,350 on the harness's careers.
   scripts/simCareerStory.mjs holds the same parts in bands over 96 careers,
   with the controls that put the waste back (worldmoves, cuptwice). */
const REST_BOUND = 80_000;
const CUP_BYTES_PER_SEASON = 3_500;
const DIVISION_BYTES_PER_SEASON = 1_250;
const TEN_DIVISIONS_BYTES = 6_800;
const PART_SEASONS_FLOOR = 8;
function saveParts(s: CareerState) {
  const bytesOf = (v: unknown) => (v === undefined ? 0 : JSON.stringify(v).length);
  const cupRows = s.seasons.filter(r => r.clubCupRun);
  const divisionRows = s.seasons.filter(r => r.leagueWorld);
  return {
    cup: cupRows.reduce((n, r) => n + bytesOf(r.clubCupRun), 0), cupRows: cupRows.length,
    division: divisionRows.reduce((n, r) => n + bytesOf(r.leagueWorld), 0), divisionRows: divisionRows.length,
    ten: bytesOf(s.leagueWorld),
    rest: bytesOf({ ...s, leagueWorld: undefined, seasons: s.seasons.map(r => ({ ...r, clubCupRun: undefined, leagueWorld: undefined })) }),
  };
}

function playToSeasonStart(seed: number, seasons: number): CareerState {
  let { s } = play(seed, seasons);
  const seen: Archived[] = [];
  for (let guard = 0; guard < 300 && s.phase !== 'playing'; guard++) s = step(s, seen);
  expect(s.phase).toBe('playing');
  return s;
}
const q = (root: ParentNode, sel: string) => root.querySelector(sel);
const qa = (root: ParentNode, sel: string) => Array.from(root.querySelectorAll(sel));

describe('Soccer Career: the story on the real page', () => {
  it('Latest Events opens the story, a season opens, Back returns, Close shuts it', async () => {
    const s = playToSeasonStart(9751, 8);
    const story = s.story ?? [];
    expect(story.length).toBeGreaterThanOrEqual(7);
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const v = mount(<SoccerCareer />);
    await tick(60);
    expect(q(v.container, '[data-career-story]'), 'closed until asked').toBeNull();
    await press(q(v.container, '[data-open-career-story]')!);
    const dialog = q(document.body, '[data-career-story="dialog"]')!;
    expect(dialog).not.toBeNull();
    const tiles = qa(dialog, '[data-story-tile]');
    expect(tiles.length).toBe(story.length + 1);
    expect(tiles[0].textContent).toContain(String(story[0].year));
    await press(q(dialog, '[data-story-tile="s1"]')!);
    const page = q(dialog, '[data-story-season="s1"]')!;
    expect(page, 'the season opened').not.toBeNull();
    expect(qa(page, '[data-story-line]').length).toBe(story[1].lines.length);
    expect(q(dialog, '[data-story-tiles]'), 'one screen at a time').toBeNull();
    await press(q(dialog, '[data-story-back]')!);
    expect(qa(dialog, '[data-story-tile]').length, 'back to every season').toBe(story.length + 1);
    const close = qa(dialog, 'button').find(b => (b.textContent ?? '').trim() === 'Close')!;
    await press(close);
    expect(q(document.body, '[data-career-story="dialog"]')).toBeNull();
  }, 120_000);

  it('the retired screen carries the same story, the last chapter included', async () => {
    let { s } = play(9752, 99);
    expect(s.retired).toBe(true);
    s = E.choosePostRetirement(s, 'retire', clubs);
    expect(s.phase).toBe('retired');
    const story = s.story ?? [];
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const card = q(v.container, '[data-career-story="inline"]')!;
    expect(card, 'the story card is on the retired screen').not.toBeNull();
    const tiles = qa(card, '[data-story-tile]');
    expect(tiles.length).toBe(story.length + 1);
    expect(tiles[tiles.length - 1].textContent).toContain('LAST');
    const mid = Math.floor(story.length / 2);
    await press(q(card, `[data-story-tile="s${mid}"]`)!);
    expect(qa(card, '[data-story-line]').length).toBe(story[mid].lines.length);
    await press(q(card, '[data-story-back]')!);
    expect(qa(card, '[data-story-tile]').length).toBe(story.length + 1);
  }, 120_000);
});

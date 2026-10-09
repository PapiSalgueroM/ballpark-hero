/* Release AP: the page side of Round 1167 (own goals in the Soccer Career Season Centre).

   The engine rule has its own harness (scripts/simSoccerOwnGoals.mjs), which calls
   soccerOwnGoals directly. Nothing read what the PAGE does with it, and the page is
   where the round met Rounds 1046 and 1047 in a real merge conflict: CentreBody plans
   the season's moments, decides the season from the ledger and only then tags own
   goals. A review turned own goals off there, handed the pass the wrong moment list
   and named the wrong club, one change at a time, and every check stayed green.

   So this mounts the real SoccerSeasonCentre on saves played through the real engine
   and reads the lines under the clock, three ways each:
     live    the season he just played, moments on offer (onCareer handed in)
     held    opened later from the career page while the save still holds this
             season's moments ledger (offer false)
     replay  opened later with no ledger at all (offer false)
   The saves are FOUND, never written by hand: a bounded search over seeded careers for
     an own goal for each side (so the words and the club that got the goal are read)
     a goal the moments protect: one in a return match that the pass WOULD tag if it
     were not told about the season's moments (so a replay that forgets them is seen).
   A search that finds none of a kind fails the test rather than passing on nothing. */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import SoccerSeasonCentre from '@/components/soccer-career/SoccerSeasonCentre';
import MiniPitch from '@/components/season-centre/MiniPitch';
import { postersFor } from '@/components/season-centre/SeasonCentre';
import { writeResume } from '@/components/season-centre/resumeStore';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import { SOCCER, buildSoccerSeasonCtx } from '@/lib/season/soccer';
import { deriveSeason, planMoments, type DerivedSeason, type Moment, type SeasonEvent } from '@/lib/season/core';
import { soccerOwnGoals } from '@/lib/season/soccerEvents';

const CLUBS = E.FALLBACK_CLUBS;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One passive step of a career, or null when the driver has no move (the career is over). */
function step(s: CareerState): CareerState | null {
  switch (s.phase as string) {
    case 'youth': return E.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return E.advanceProSeason(s, CLUBS);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, CLUBS);
    case 'ballon_dor': return E.dismissBallonDor(s, CLUBS);
    case 'international_debut': return E.dismissDebut(s, CLUBS);
    case 'world_cup': return E.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return E.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': return E.dismissMoralDilemma(s, CLUBS);
    case 'random_events': return s.pendingEvents && s.pendingEvents[0] ? E.applyEventChoice(s, 0, CLUBS) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'red_card_appeal_result': return E.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return E.applyRehabChoice(s, 0);
    case 'transfer_window': return E.stayAtClub(s);
    default: return null;
  }
}

/** A save right after a season was played, with everything the page will derive from it. */
interface Spot {
  career: CareerState; row: SeasonRecord; key: string; planned: Moment[];
  /** The season as every way of opening it must show it: the plan, own goals tagged with its moments protected. */
  marked: DerivedSeason; names: string[]; md: number;
}
const found: { us: Spot | null; them: Spot | null; guarded: Spot | null; seasons: number } = { us: null, them: null, guarded: null, seasons: 0 };

function look(live: CareerState) {
  /* the save as a browser would hand it back */
  const career = JSON.parse(JSON.stringify(live)) as CareerState;
  const row = career.seasons[career.seasons.length - 1];
  if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
  const ctx = buildSoccerSeasonCtx(career, CLUBS, row);
  const key = SOCCER.seasonKey(row, ctx);
  const plan = deriveSeason(SOCCER, row, ctx);
  if (!plan || !key) return;
  found.seasons += 1;
  const planned = planMoments(SOCCER, row, ctx, plan);
  const marked = soccerOwnGoals(plan, planned);
  const bare = soccerOwnGoals(plan, []);
  const momentMds = new Set(planned.map(m => m.md));
  const names = plan.labels.map(l => (l.named ? l.name : SOCCER.words.unnamed));
  const spot = (md: number): Spot => ({ career, row, key, planned, marked, names, md });
  /* a game the clock plays straight through from a resume: no moment of its own, no poster, not the first or the last */
  const plain = (md: number) => md > 1 && md < plan.games.length && !momentMds.has(md) && postersFor(plan, md).length === 0;
  for (const g of marked.games) {
    if (!plain(g.md)) continue;
    const tags = g.events.filter(e => e.ownGoalBy);
    if (!found.us && tags.some(e => e.side === 'us')) found.us = spot(g.md);
    if (!found.them && tags.some(e => e.side === 'them')) found.them = spot(g.md);
    const unprotected = bare.games[g.md - 1].events.filter(e => e.ownGoalBy).length;
    if (!found.guarded && tags.length === 0 && unprotected > 0) found.guarded = spot(g.md);
  }
}

beforeAll(() => {
  const real = Math.random;
  const POS = ['ST', 'CM', 'CB', 'GK', 'LW'];
  const abil = (o: number) => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  try {
    for (let c = 0; c < 60 && !(found.us && found.them && found.guarded); c += 1) {
      Math.random = seeded(c * 7919 + 1167);
      let s: CareerState | null = E.initCareer(`Fixer ${c}`, 'England', POS[c % POS.length], '2010-14', abil(70 + (c % 12)), 70 + (c % 12), 2010, CLUBS, null, 92);
      for (let g = 0; g < 600 && s && !s.retired && !(found.us && found.them && found.guarded); g += 1) {
        const before = s.seasons.length;
        s = step(s);
        if (s && s.seasons.length > before) look(s);
      }
    }
  } finally {
    Math.random = real;
  }
}, 240_000);

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

type Way = 'live' | 'held' | 'replay';
interface Line { minute: string; words: string }

/** The lines under the clock of matchday `spot.md`, at full time, with the season opened one way. */
async function linesOf(spot: Spot, way: Way, ledger: number[][] = []): Promise<Line[]> {
  cleanup();
  localStorage.clear();
  resetCareerMomentsForTest();
  setWidth(true);
  localStorage.setItem('seasonCentre:help', '1');
  /* his place: every round before this one already watched, the clock at Results speed */
  writeResume('soccer', { key: spot.key, year: spot.row.year, md: spot.md - 1, speed: 'results', stable: true, round: 'Matchday' });
  expect(spot.career.seasonMoments, 'a career that never took a moment has no ledger').toBeUndefined();
  const career = way === 'held' ? ({ ...spot.career, seasonMoments: { v: 1, key: spot.key, m: ledger } } as CareerState) : spot.career;
  const { container } = render(
    <MemoryRouter>
      <SoccerSeasonCentre career={career} clubs={CLUBS} row={spot.row} mode={way === 'live' ? 'live' : 'watch'} onClose={() => {}}
        {...(way === 'live' ? { onCareer: () => {} } : { offer: false })} />
    </MemoryRouter>,
  );
  await act(async () => {});
  const kick = container.querySelector<HTMLButtonElement>('[data-kickoff] button');
  if (!kick) throw new Error(`seasonCentreOwnGoals: no kick off card (${way}): ${container.textContent?.slice(0, 160)}`);
  expect(container.querySelector('[data-kickoff-resumed]')?.textContent, `${way}: the season opens at his place`).toContain(`${spot.md - 1} of ${spot.marked.games.length} played`);
  await act(async () => { fireEvent.click(kick); });
  /* a moment taken the other way can move a poster (the day the title is won) onto this matchday: step past it */
  const past = container.querySelector(`[data-matchday="${spot.md}"]`) ? null : container.querySelector<HTMLButtonElement>('[data-centre-bar] button');
  if (past) await act(async () => { fireEvent.click(past); });
  const day = container.querySelector(`[data-matchday="${spot.md}"]`);
  if (!day) throw new Error(`seasonCentreOwnGoals: matchday ${spot.md} is not on the stage (${way})`);
  expect(day.querySelector('[data-full-time]'), `${way}: the match is at full time`).not.toBeNull();
  return [...day.querySelectorAll('[data-clock-events] li')].map(li => {
    const spans = li.querySelectorAll('span');
    return { minute: spans[0]?.textContent ?? '', words: spans[1]?.textContent ?? '' };
  });
}

const WHO = { you: 'You', teammate: 'A teammate', opponent: 'An opponent' } as const;
/** What the page must print for an own goal of the game: the whole line, from the engine's facts. */
function ownGoalLines(spot: Spot): { at: number; minute: string; words: string }[] {
  const g = spot.marked.games[spot.md - 1];
  return g.events.flatMap((e: SeasonEvent, at: number) => (e.ownGoalBy
    ? [{ at, minute: `${e.min}'`, words: `⚽ ${WHO[e.ownGoalBy]} (O.G), goal for ${e.side === 'us' ? spot.row.club : spot.names[g.opp]}` }]
    : []));
}
/** A ledger that takes the season's first YOUR CALL the other way (or just uses its first moment). */
function usedFirstMoment(spot: Spot): number[][] {
  const call = spot.planned.find(m => m.mode === 'call') ?? spot.planned[0];
  return call ? [[call.md, call.id, call.mode === 'call' && call.planSuccess ? 0 : 3]] : [];
}

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('Season Centre: own goals on the page (Round 1167, read after the Release AP merge)', () => {
  it('found its three saves in the seeded careers', () => {
    expect(found.seasons, 'seasons looked at').toBeGreaterThan(0);
    expect(found.us, 'a season with an own goal for his club').not.toBeNull();
    expect(found.them, 'a season with an own goal against his club').not.toBeNull();
    expect(found.guarded, 'a season with a goal only its moments keep from being tagged').not.toBeNull();
  });

  it.each(['us', 'them'] as const)('prints an own goal for side "%s" with who did it and the club that got it, the same live, held and replayed', async side => {
    const spot = found[side]!;
    const events = spot.marked.games[spot.md - 1].events;
    const want = ownGoalLines(spot);
    expect(want.some(w => events[w.at].side === side)).toBe(true);
    const seen: Record<string, Line[]> = {};
    const ways: [string, Way, number[][]][] = [['live', 'live', []], ['held', 'held', []], ['held after a moment was played', 'held', usedFirstMoment(spot)], ['replay', 'replay', []]];
    for (const [name, way, ledger] of ways) {
      const lines = await linesOf(spot, way, ledger);
      seen[name] = lines;
      expect(lines, `${name}: one line an event`).toHaveLength(events.length);
      for (const w of want) expect(lines[w.at], `${name}: the own goal's line`).toEqual({ minute: w.minute, words: w.words });
      expect(lines.filter(l => l.words.includes('(O.G)')), `${name}: no other goal is called an own goal`).toHaveLength(want.length);
    }
    expect(seen.held).toEqual(seen.live);
    expect(seen['held after a moment was played']).toEqual(seen.live);
    expect(seen.replay).toEqual(seen.live);
  });

  it('leaves a return match alone in a replay exactly as it does live (the moments are planned, offered or not)', async () => {
    const spot = found.guarded!;
    expect(spot.planned.filter(m => m.mirrorMd === spot.md).length, 'the game is the return match of one of the moments').toBeGreaterThan(0);
    expect(ownGoalLines(spot)).toEqual([]);
    const events = spot.marked.games[spot.md - 1].events;
    const live = await linesOf(spot, 'live');
    const held = await linesOf(spot, 'held');
    const replay = await linesOf(spot, 'replay');
    const each: [string, Line[]][] = [['live', live], ['held', held], ['replay', replay]];
    for (const [name, lines] of each) {
      expect(lines.length, `${name}: the match has its events`).toBe(events.length);
      expect(lines.filter(l => l.words.includes('(O.G)')), `${name}: a goal in a return match is never an own goal`).toEqual([]);
    }
    expect(held).toEqual(live);
    expect(replay).toEqual(live);
  });

  it('hands back the same game for the same question, so the pitch does not take it for a changed match', () => {
    const spot = found.them!;
    const at = spot.md - 1;
    /* the season before the pass, as fresh objects: the rule draws from keys, never from what it answered before */
    const input: DerivedSeason = { ...spot.marked, games: spot.marked.games.map(g => ({ ...g, events: g.events.map(e => { const bare: SeasonEvent = { ...e }; delete bare.ownGoalBy; return bare; }) })) };
    const first = soccerOwnGoals(input, spot.planned);
    expect(first).toEqual(spot.marked);
    expect(first.games[at].events.some(e => e.ownGoalBy)).toBe(true);
    /* a game with nothing tagged is the input's own object */
    const quiet = first.games.findIndex(g => !g.events.some(e => e.ownGoalBy));
    expect(first.games[quiet]).toBe(input.games[quiet]);
    /* the season decided again the way the core does it: a new season, the first game replaced, every other game the same object */
    expect(at).toBeGreaterThan(0);
    const second = soccerOwnGoals({ ...input, games: input.games.map((g, i) => (i === 0 ? { ...g, events: g.events.slice() } : g)) }, spot.planned);
    expect(second).toEqual(first);
    expect(second.games.every((g, i) => i === 0 || g === first.games[i]), 'every game the decision did not touch is the same object').toBe(true);
    expect(second.games[at].events, 'the tagged game keeps its events array').toBe(first.games[at].events);
  });
});

describe('Season Centre: the little pitch and an own goal (Release AP)', () => {
  const events: SeasonEvent[] = [
    { min: 12, kind: 'goal', side: 'them', pts: 1, ownGoalBy: 'you' },
    { min: 40, kind: 'goal', side: 'us', pts: 1, ownGoalBy: 'opponent' },
    { min: 67, kind: 'goal', side: 'them', pts: 1 },
  ];
  const draw = (shown: number) => {
    cleanup();
    const { container } = render(<MiniPitch md={3} events={events} shown={shown} paused={false} instant usColor="#ef4444" role="ATT" onFrom={1} onTo={90} boxClass="relative" />);
    return {
      words: container.querySelector('[data-pitch-yours]')?.textContent ?? '',
      rings: [...container.querySelectorAll('[data-pitch-ring]')].map(f => f.getAttribute('data-pm-figure')),
      side: container.querySelector('[data-mini-pitch]')?.getAttribute('data-pitch-side'),
    };
  };
  it('says whose own goal it was under the pitch, and rings him when it was his', () => {
    expect(draw(12)).toEqual({ words: '⚽ Your own goal', rings: ['me'], side: 'them' });
    expect(draw(40).words).toBe('⚽ Own goal');
    expect(draw(40).side).toBe('us');
  });
  it('says nothing of the kind for an ordinary goal against', () => {
    expect(draw(67)).toEqual({ words: '', rings: [], side: 'them' });
  });
});

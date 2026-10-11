/* Release AX, ruling C3 extended to the Press room: a save part that cannot be verified is read as ABSENT.
 *
 * The Press room (the other lane's Rounds 1230 to 1234) keeps its answers in career.pressRoom and re-verifies
 * EVERY history row against career.seasons on every read. As it merged, one row that stopped matching made the
 * whole part unreadable, and an unreadable part closed the room for the rest of the career: the view answered
 * "The saved Press Room record could not be verified.", no answer was accepted, no promise settled, and the
 * tile left the page (it draws nothing when the room is not open and holds no history).
 * The ruling, as Release AW's closing pass applied it to three other parts: the reader never throws, the part
 * it cannot verify is read as if it were not there (no history, credibility 50), the room is offered again and
 * the next answer writes a fresh part over the unreadable one. A pending promise inside an unreadable part ends
 * with no verdict: nothing is paid and nothing is taken.
 *
 * In this order, as the brief asks:
 *   1. THE JOURNEY: whole careers on the real engine that answer the press every year and make a promise
 *      whenever one is offered, through loans, ban years, a prison year, severe injuries, retirement advice and
 *      Keep playing. After every step, and again after a save and a load, the part the game itself wrote must
 *      still be readable. This says whether an unreadable part can be reached in natural play.
 *   2. THE TESTS OF THE RULING, which fail on the head before the ruling's commit: every "is offered again",
 *      "no sentence about verifying" and "a fresh part is written" case below.
 *   3. The smallest change is in src/lib/soccerCareerPress.ts (the view no longer holds the room shut).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  acceptLoan, acceptOffer, advanceProSeason, advanceYouthYear, applyEventChoice, applyRehabChoice,
  declineRetirementSuggestion, determineLoanOffers, dismissAppealResult, dismissBallonDor, dismissDebut,
  dismissMoralDilemma, dismissNewspaper, dismissRivalryEvent, dismissSocialMediaPhase, dismissSummary,
  dismissWorldCup, FALLBACK_CLUBS, initCareer, repairCareer, stayAtClub, type CareerState, type SeasonRecord,
} from '@/lib/soccerCareerEngine';
import { answerSoccerPress, pressRoomView, settleSoccerPress } from '@/lib/soccerCareerPress';
import PressRoomTile from '@/components/soccer-career/PressRoomTile';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const CLUBS = FALLBACK_CLUBS;
const OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Bag = Record<string, unknown>;
const bag = (value: unknown) => value as Bag;

function seeded(seed: number): void {
  let a = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

/** The part the game wrote can still be read: every answer it holds comes back in the view. */
function readable(c: CareerState): boolean {
  const part = c.pressRoom;
  if (part === undefined) return true;
  return Array.isArray(part.history) && pressRoomView(c).history.length === part.history.length;
}

/* ───────────── 1. the journey ───────────── */

interface Tally { answers: number; promises: number; outcomes: Record<string, number>; loans: number; outYears: number; severe: number; keptPlaying: number; seasons: number; steps: number; }
/** One move of a career, the way the page's own buttons make it. */
function move(s: CareerState, tally: Tally): CareerState | null {
  switch (s.phase) {
    case 'youth': return advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers?.find(x => x.isHomegrown) ?? s.pendingOffers?.[0]; return o ? acceptOffer(s, o) : null; }
    case 'playing': return advanceProSeason(s, CLUBS);
    case 'newspaper': return dismissNewspaper(s);
    case 'season_summary': return dismissSummary(s, CLUBS);
    case 'ballon_dor': return dismissBallonDor(s, CLUBS);
    case 'international_debut': return dismissDebut(s, CLUBS);
    case 'world_cup': return dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': return dismissMoralDilemma(s, CLUBS);
    case 'red_card_appeal_result': return dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return applyRehabChoice(s, 1);
    case 'random_events': return s.pendingEvents?.length ? applyEventChoice(s, 0, CLUBS) : null;
    case 'retirement_suggestion': tally.keptPlaying += 1; return declineRetirementSuggestion(s, CLUBS);
    case 'transfer_window': {
      const t = s.transferSituation;
      if (t?.type === 'frozen_out' && t.mode === 'released') {
        const o = t.offers?.[0];
        return o ? (o.isLoan ? acceptLoan(s, o) : acceptOffer(s, o)) : null;
      }
      return stayAtClub(s);
    }
    default: return null;
  }
}

interface Journey { name: string; seed: number; nationality: string; position: string; potential: number; force?: (s: CareerState, played: number) => void }
function journey(j: Journey): { tally: Tally; unreadable: string[] } {
  seeded(j.seed);
  const tally: Tally = { answers: 0, promises: 0, outcomes: {}, loans: 0, outYears: 0, severe: 0, keptPlaying: 0, seasons: 0, steps: 0 };
  const unreadable: string[] = [];
  const abilities = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
  let s = initCareer(`Press journey ${j.seed}`, j.nationality, j.position, '2010-14', abilities, 60, 2010, CLUBS, null, j.potential);
  const check = (where: string) => {
    if (!readable(s)) unreadable.push(`${j.name} seed ${j.seed}: ${where}, ${s.seasons.length} seasons, phase ${s.phase}`);
    const loaded = repairCareer(clone(s));
    if (!readable(loaded)) unreadable.push(`${j.name} seed ${j.seed}: after a save and a load, ${where}`);
  };
  for (let step = 0; step < 420 && !s.retired && unreadable.length < 3; step += 1) {
    if (s.phase === 'playing') {
      const played = s.seasons.filter(r => r.type === 'playing').length;
      j.force?.(s, played);
      const loans = determineLoanOffers(s, CLUBS);
      if (loans?.length) { s = acceptLoan(s, loans[0]); if (s.loan) tally.loans += 1; check('after a loan'); }
      const view = pressRoomView(s);
      if (view.eligible) {
        const promise = view.options.find(o => o.id === 'ambitious')?.eligible;
        const choice = promise ? 'ambitious' : (j.seed + played) % 2 ? 'accountable' : 'calm';
        const next = answerSoccerPress(s, choice);
        if (next !== s) { tally.answers += 1; if (choice === 'ambitious') tally.promises += 1; }
        s = next;
        check(`after answering ${choice}`);
      }
    }
    const before = s.seasons.length;
    const next = move(s, tally);
    if (!next) break;
    s = next; tally.steps += 1;
    if (s.seasons.length > before) {
      const row = s.seasons[s.seasons.length - 1];
      tally.seasons += 1;
      if (OUT.includes(row.club)) tally.outYears += 1;
      if (row.injurySevere) tally.severe += 1;
    }
    check(`after ${s.phase}`);
  }
  for (const h of s.pressRoom?.history ?? []) if (h.promise) tally.outcomes[h.promise.outcome] = (tally.outcomes[h.promise.outcome] ?? 0) + 1;
  return { tally, unreadable };
}

const FLEET: Journey[] = [
  ...[11, 12, 13, 14, 15, 16].map((seed, i): Journey => ({ name: 'plain', seed, nationality: ['England', 'Spain', 'Germany', 'Belgium', 'Brazil', 'France'][i], position: ['ST', 'CM', 'CB', 'GK', 'LW', 'RB'][i], potential: 92 })),
  ...[21, 22, 23, 24].map((seed, i): Journey => ({ name: 'star', seed, nationality: ['England', 'Spain', 'Italy', 'Germany'][i], position: ['ST', 'CAM', 'CB', 'GK'][i], potential: 97 })),
  ...[31, 32, 33].map((seed, i): Journey => ({ name: 'a ban year', seed, nationality: 'England', position: ['ST', 'CM', 'CB'][i], potential: 92,
    force: (s, played) => { if (played === 4 + i && !s.matchFixBanned) s.matchFixBanned = 1; } })),
  ...[41, 42, 43].map((seed, i): Journey => ({ name: 'a prison year', seed, nationality: 'Spain', position: ['ST', 'CDM', 'LB'][i], potential: 92,
    force: (s, played) => { if (played === 5 + i && !s.prisonSeasons) s.prisonSeasons = 1; } })),
];

describe('the journey of ruling C3 for the Press room: can natural play make the part unreadable', () => {
  it('is NOT reached: every part the game writes stays readable through whole careers, a save and a load included', () => {
    const total: Tally = { answers: 0, promises: 0, outcomes: {}, loans: 0, outYears: 0, severe: 0, keptPlaying: 0, seasons: 0, steps: 0 };
    const unreadable: string[] = [];
    for (const j of FLEET) {
      const r = journey(j);
      vi.restoreAllMocks();
      unreadable.push(...r.unreadable);
      for (const k of ['answers', 'promises', 'loans', 'outYears', 'severe', 'keptPlaying', 'seasons', 'steps'] as const) total[k] += r.tally[k];
      for (const [k, v] of Object.entries(r.tally.outcomes)) total.outcomes[k] = (total.outcomes[k] ?? 0) + v;
    }
    console.log(`press journey: ${FLEET.length} careers, ${total.steps} steps, ${total.seasons} season rows, ${total.answers} answers, ${total.promises} promises ${JSON.stringify(total.outcomes)}, ${total.loans} loans, ${total.outYears} years out, ${total.severe} severe injuries, ${total.keptPlaying} times Keep playing; unreadable ${unreadable.length}`);
    expect(unreadable).toEqual([]);
    /* The fleet looked at something: careers were played, the press was answered, promises were made, and the
       years out and Keep playing were on the road. */
    expect(total.seasons).toBeGreaterThan(200);
    expect(total.answers).toBeGreaterThan(100);
    expect(total.promises).toBeGreaterThan(20);
    expect(total.outYears).toBeGreaterThan(0);
    expect(total.keptPlaying).toBeGreaterThan(0);
  }, 240_000);
});

/* ───────────── 2. the tests of the ruling ───────────── */

function savedRow(patch: Partial<SeasonRecord> = {}): SeasonRecord {
  return { year: 2028, age: 25, club: 'Twente', clubCountry: 'Netherlands', clubTier: 3,
    apps: 28, leagueApps: 24, goals: 14, assists: 8, cleanSheets: 10, yellowCards: 0, redCards: 0, rating: 7.1,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...patch };
}
/** The recorded save the other lane's own unit file stands on, shaped the way it shapes it. */
function career(): CareerState {
  const data = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const base = clone(data.saves.find((s: { id: string }) => s.id === 'ere').state) as CareerState;
  const state: CareerState = { ...base, playerName: 'Recorded Press Player', position: 'ST', age: 25, phase: 'playing', retired: false,
    currentClub: 'Twente', currentClubCountry: 'Netherlands', currentClubTier: 3, currentLeague: 'Eredivisie',
    contractYearsLeft: 3, seasons: [savedRow()], popularity: 50, morale: 50, events: [], story: [], awards: [],
    pendingSummary: null, pendingBallonDor: null, pendingRehab: null, matchFixBanned: 0, prisonSeasons: 0,
    corruptionHeat: 0, dirtyMoney: 0, pedActive: false, pedSeasonsRemaining: 0 };
  delete state.pressRoom;
  return state;
}
/** An honest part with one answer; `promise` makes it a pending public promise. */
const answered = (promise: boolean): CareerState => answerSoccerPress(career(), promise ? 'ambitious' : 'accountable');
/** An honest part whose promise has been settled by a second played year. */
function settled(): CareerState {
  const c = answered(true);
  const row = savedRow({ year: 2029, age: 26, goals: 20 });
  c.seasons = [...c.seasons, row];
  settleSoccerPress(c, row);
  expect(c.pressRoom!.history[0].promise!.outcome, 'the fixture holds a settled promise').toBe('met');
  return c;
}

/** Every way the ruling names for a part to be past verifying, each applied to an honest part. */
const DAMAGE: [string, () => CareerState][] = [
  ['a wrong shape', () => { const c = answered(false); bag(c).pressRoom = { version: 1 }; return c; }],
  ['another version', () => { const c = answered(true); bag(c).pressRoom = { ...bag(c.pressRoom), version: 2 }; return c; }],
  ['null', () => { const c = answered(false); bag(c).pressRoom = null; return c; }],
  ['a row whose season no longer matches', () => { const c = answered(true); c.seasons = [{ ...c.seasons[0], goals: c.seasons[0].goals + 1 }]; return c; }],
  ['a settled promise whose settled row no longer matches', () => { const c = settled(); c.seasons = [c.seasons[0], { ...c.seasons[1], goals: 3 }]; return c; }],
];
const SENTENCE = /verified/i;

describe('pressRoom: a part that cannot be verified is read as absent', () => {
  it('the fixtures are honest: each undamaged part is readable and its season is answered', () => {
    for (const c of [answered(false), answered(true), settled()]) {
      expect(readable(c)).toBe(true);
      expect(pressRoomView(c).history.length).toBe(1);
    }
    expect(pressRoomView(answered(false))).toMatchObject({ eligible: false, reason: 'You already answered for this saved season.' });
  });

  it.each(DAMAGE)('%s: it reads as no press room, the room is offered again and the next answer writes a fresh part', (_label, make) => {
    const c = make(), before = clone(c);
    const view = pressRoomView(c);
    expect(view.history, 'no history is read out of it').toEqual([]);
    expect(view.credibility, 'and credibility is the starting 50').toBe(50);
    expect(view.promise).toBeNull();
    expect(view.reason ?? '', 'no sentence about verifying').not.toMatch(SENTENCE);
    expect(view.eligible, 'the room is offered again').toBe(true);
    const next = answerSoccerPress(c, 'calm');
    expect(next, 'the answer is accepted').not.toBe(c);
    expect(c, 'the input is not edited').toEqual(before);
    expect(next.pressRoom).toEqual({ version: 1, credibility: 50, history: [expect.objectContaining({ choice: 'calm', source: view.source })] });
    expect([next.popularity, next.morale]).toEqual([c.popularity - 2, c.morale + 3]);
    expect(readable(next)).toBe(true);
    expect(pressRoomView(next)).toMatchObject({ eligible: false, reason: 'You already answered for this saved season.' });
    expect(answerSoccerPress(next, 'accountable'), 'the fresh part holds the once a season rule').toBe(next);
  });

  it.each(DAMAGE)('%s: the tile is on the page again', (_label, make) => {
    const c = make();
    const view = render(<PressRoomTile career={c} onCareer={() => undefined} />);
    const tile = view.container.querySelector('[data-press-room-open]');
    expect(tile, 'the Press room tile is drawn').not.toBeNull();
    expect(tile!.textContent).toContain('Answer for your season');
    expect(tile!.textContent).toContain('50/100');
  });

  it.each(DAMAGE)('%s: a played year never throws on it, pays nothing and leaves it as it lies', (_label, make) => {
    const c = make(), last = c.seasons[c.seasons.length - 1];
    const row = savedRow({ year: last.year + 1, age: last.age + 1, goals: 40 });
    c.seasons = [...c.seasons, row];
    const before = clone(c);
    expect(() => settleSoccerPress(c, row)).not.toThrow();
    expect(c, 'no verdict, no swing, the part untouched').toEqual(before);
  });

  it('a pending promise in an unreadable part ends with no verdict, on the real engine too', () => {
    const c = answered(true);
    bag(c).pressRoom = { ...bag(c.pressRoom), version: 2 };
    const part = clone(c.pressRoom);
    /* Play on, the way the page does, until the next season row is written. */
    const playOn = (start: CareerState): CareerState => {
      seeded(41);
      const tally = { keptPlaying: 0 } as Tally;
      let s = start;
      for (let i = 0; i < 8 && s.seasons.length === start.seasons.length; i += 1) { const next = move(s, tally); if (!next) break; s = next; }
      vi.restoreAllMocks();
      return s;
    };
    const played = playOn(clone(c));
    expect(played.seasons.length).toBe(c.seasons.length + 1);
    expect(played.pressRoom, 'the engine leaves the unreadable part as it lies').toEqual(part);
    const bare = clone(c);
    delete bare.pressRoom;
    const plain = playOn(bare);
    const aside = (s: CareerState) => { const rest = { ...s }; delete rest.pressRoom; return clone(rest); };
    expect(aside(played), 'and plays the year exactly as a save with no part').toEqual(aside(plain));
  });
});

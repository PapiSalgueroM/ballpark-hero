/* Release AX fix pass (the engine review, findings 2 and 3): two rules of the Press room that rested on a reading.
 *
 * 1. THE ORDER. At a played season the public promise settles BEFORE the season's money
 *    (settleSoccerPress, then simulateSeasonFinances, then settleSoccerProgramme). The order is a rule a player
 *    keeps: the year's sponsorship income reads popularity, and a kept or missed promise has just moved popularity
 *    by 6. The reviewer moved the press call below the money and the plan and every detector stayed green. Here
 *    one real career with a pending promise plays its next year from every starting popularity 4 to 96, beside
 *    the same save with the Press room part taken off (the settlement draws nothing, so the two years are the same
 *    year). Sponsorship is paid by fame lines, so the two incomes differ exactly where the 6 points cross a line:
 *    that must happen at some popularity, and always in the promise's direction. With the press call after the
 *    money the two incomes are equal everywhere and this goes red.
 * 2. THE SEVERE INJURY ROW. A year lost to a severe injury closes a pending promise with no verdict. Its removal
 *    was noticed only by an anchor (a position in the source), by no test of what the game does. A fleet plays
 *    careers that promise every year and holds every severe injury row that arrives with a promise pending.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acceptLoan, acceptOffer, advanceProSeason, advanceYouthYear, applyEventChoice, applyRehabChoice,
  declineRetirementSuggestion, dismissAppealResult, dismissBallonDor, dismissDebut, dismissMoralDilemma,
  dismissNewspaper, dismissRivalryEvent, dismissSocialMediaPhase, dismissSummary, dismissWorldCup, FALLBACK_CLUBS,
  initCareer, stayAtClub, type CareerState,
} from '@/lib/soccerCareerEngine';
import { answerSoccerPress, pressRoomView } from '@/lib/soccerCareerPress';

afterEach(() => { vi.restoreAllMocks(); });
const CLUBS = FALLBACK_CLUBS;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function seeded(seed: number): void {
  let a = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
/** One move of a career, the way the page's own buttons make it (the journey file's walker, without its tally). */
function move(s: CareerState): CareerState | null {
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
    case 'retirement_suggestion': return declineRetirementSuggestion(s, CLUBS);
    case 'transfer_window': {
      const t = s.transferSituation;
      if (t?.type === 'frozen_out' && t.mode === 'released') { const o = t.offers?.[0]; return o ? (o.isLoan ? acceptLoan(s, o) : acceptOffer(s, o)) : null; }
      return stayAtClub(s);
    }
    default: return null;
  }
}
const ABILITIES = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
const start = (seed: number, position: string) => initCareer(`Press order ${seed}`, 'England', position, '2010-14', ABILITIES, 60, 2010, CLUBS, null, 84);
const pending = (s: CareerState) => (s.pressRoom?.history ?? []).find(h => h.promise?.outcome === 'pending');
const promiseOpen = (s: CareerState) => { const v = pressRoomView(s); return v.eligible && !!v.options.find(o => o.id === 'ambitious')?.eligible; };

describe('the Press room settles in its ruled place', () => {
  it('a played season settles the promise BEFORE the money: its popularity swing is in the year\'s sponsorship income', () => {
    /* a real career on its playing screen with two played seasons behind it and a promise to make */
    seeded(7);
    let s = start(7, 'ST');
    for (let step = 0; step < 400 && !(s.phase === 'playing' && s.seasons.filter(r => r.type === 'playing').length >= 2 && promiseOpen(s)); step += 1) {
      const next = move(s); if (!next) break; s = next;
    }
    expect(s.phase === 'playing' && promiseOpen(s)).toBe(true);
    const promised = answerSoccerPress(s, 'ambitious');
    expect(pending(promised)).toBeTruthy();
    vi.restoreAllMocks();

    const rows: { p0: number; outcome: string; with: number; without: number }[] = [];
    for (let p0 = 4; p0 <= 96; p0 += 2) {
      const a = clone(promised); a.popularity = p0;
      const b = clone(a); delete b.pressRoom;
      seeded(99); const A = advanceProSeason(a, CLUBS);
      seeded(99); const B = advanceProSeason(b, CLUBS);
      vi.restoreAllMocks();
      /* the same year was played: the settlement draws nothing and writes nothing on the season row */
      expect(JSON.stringify(A.seasons[A.seasons.length - 1])).toBe(JSON.stringify(B.seasons[B.seasons.length - 1]));
      const outcome = A.pressRoom?.history.find(h => h.promise)?.promise?.outcome ?? 'no promise';
      expect(outcome).not.toBe('pending');
      if (outcome === 'met' || outcome === 'missed') rows.push({ p0, outcome, with: A.sponsorshipIncome, without: B.sponsorshipIncome });
    }
    const moved = rows.filter(r => r.with !== r.without);
    console.log(`press order: ${rows.length} of 47 starting popularities settled met or missed (${rows.filter(r => r.outcome === 'met').length} met); the year's sponsorship income differs from the save with no part at ${moved.length} of them: ${moved.map(r => `${r.p0}:${r.without}->${r.with}`).join(' ')}`);
    expect(rows.length).toBeGreaterThanOrEqual(24);
    /* the swing reached the money somewhere, and wherever it did it went the promise's way */
    expect(moved.length).toBeGreaterThanOrEqual(2);
    for (const r of moved) expect(Math.sign(r.with - r.without), `popularity ${r.p0}, ${r.outcome}`).toBe(r.outcome === 'met' ? 1 : -1);
  });

  it('a year lost to a severe injury closes a pending promise with no verdict, on the injury row itself', () => {
    const held: string[] = [], wrong: string[] = [];
    let careers = 0;
    for (let seed = 201; seed <= 236 && held.length < 6; seed += 1) {
      careers += 1;
      seeded(seed);
      let s = start(seed, ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM'][seed % 6]);
      for (let step = 0; step < 420 && !s.retired; step += 1) {
        if (s.phase === 'playing' && promiseOpen(s)) s = answerSoccerPress(s, 'ambitious');
        const waiting = !!pending(s), before = s.seasons.length;
        const next = move(s); if (!next) break; s = next;
        const row = s.seasons.length > before ? s.seasons[s.seasons.length - 1] : null;
        if (!row || !waiting || row.type !== 'playing' || row.injurySevere !== true) continue;
        const done = (s.pressRoom?.history ?? []).find(h => h.promise?.settledIndex === s.seasons.length - 1)?.promise;
        const line = `seed ${seed}, ${row.year} at ${row.club}: ${done ? done.outcome : 'STILL PENDING'}`;
        held.push(line);
        if (!done || done.outcome !== 'excused' || pending(s)) wrong.push(line);
      }
      vi.restoreAllMocks();
    }
    console.log(`press order: ${held.length} severe injury rows arrived with a promise pending in ${careers} careers: ${held.join('; ')}`);
    expect(wrong).toEqual([]);
    expect(held.length).toBeGreaterThanOrEqual(3);
  });
});

/* Release AX review (engine-saves), ruling C3 for pressRoom: fourteen damages at two points of a real career.
 * Each damaged part must be judged EXACTLY as the same save with no part: no throw in the view, the answer, a
 * played year, a save and a load, and the tile; the room offered again; the next answer writes a fresh part;
 * the played year and its draws equal the year of the save with no part. Copied into src/test on a runner. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  acceptOffer, advanceProSeason, advanceYouthYear, applyEventChoice, applyRehabChoice, declineRetirementSuggestion,
  dismissAppealResult, dismissBallonDor, dismissDebut, dismissMoralDilemma, dismissNewspaper, dismissRivalryEvent,
  dismissSocialMediaPhase, dismissSummary, dismissWorldCup, FALLBACK_CLUBS, initCareer, repairCareer, stayAtClub,
  type CareerState,
} from '@/lib/soccerCareerEngine';
import { answerSoccerPress, pressRoomView, settleSoccerPress } from '@/lib/soccerCareerPress';
import { chooseProgramme, settleSoccerProgramme } from '@/lib/soccerCareerProgramme';
import PressRoomTile from '@/components/soccer-career/PressRoomTile';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const CLUBS = FALLBACK_CLUBS;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
type Bag = Record<string, any>;
let draws = 0;
function seeded(seed: number): void {
  let a = seed >>> 0; draws = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    draws += 1; a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
function move(s: CareerState): CareerState | null {
  switch (s.phase) {
    case 'youth': return advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers?.[0]; return o ? acceptOffer(s, o) : null; }
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
    /* the LAST choice of an event: never "Take the deal", so the part stays the one the game wrote */
    case 'random_events': return s.pendingEvents?.length ? applyEventChoice(s, s.pendingEvents[0].choices.length - 1, CLUBS) : null;
    case 'retirement_suggestion': return declineRetirementSuggestion(s, CLUBS);
    case 'transfer_window': return stayAtClub(s);
    default: return null;
  }
}
/** A real career that answers every year, stopped on a playing screen once `stop` says so. */
function careerAt(seed: number, position: string, stop: (s: CareerState) => boolean): CareerState {
  seeded(seed);
  const flat = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
  let s = initCareer(`Damage ${seed}`, 'England', position, '2010-14', flat, 62, 2010, CLUBS, null, 93);
  for (let i = 0; i < 600 && !s.retired; i += 1) {
    if (s.phase === 'playing') {
      const v = pressRoomView(s);
      if (v.eligible) s = answerSoccerPress(s, v.options.find(o => o.id === 'ambitious')?.eligible ? 'ambitious' : 'accountable');
      if (stop(s)) return s;
    }
    const next = move(s);
    if (!next) break;
    s = next;
  }
  throw new Error(`the career of seed ${seed} never reached its stop (${s.seasons.length} rows, phase ${s.phase})`);
}
const history = (s: CareerState) => s.pressRoom?.history ?? [];
const pendingNow = (s: CareerState) => history(s).some(h => h.promise?.outcome === 'pending');
const settledCount = (s: CareerState) => history(s).filter(h => h.promise && h.promise.outcome !== 'pending').length;

const DAMAGES: Record<string, (c: Bag) => void> = {
  'the part is null': c => { c.pressRoom = null; },
  'the part is a string': c => { c.pressRoom = 'garbage'; },
  'the part is an array': c => { c.pressRoom = []; },
  'another version': c => { c.pressRoom.version = 2; },
  'the history is an object': c => { c.pressRoom.history = { 0: c.pressRoom.history[0] }; },
  'a null row in the history': c => { c.pressRoom.history.splice(1, 0, null); },
  'a row whose source is null': c => { c.pressRoom.history[0].source = null; },
  'a source row far past the seasons': c => { c.pressRoom.history[0].source.index = 1e9; },
  'credibility is a string': c => { c.pressRoom.credibility = '50'; },
  'credibility is 101': c => { c.pressRoom.credibility = 101; },
  'a promise that is a string': c => { const h = c.pressRoom.history.find((r: Bag) => r.promise); h.promise = 'promise'; },
  'the same season answered twice': c => { c.pressRoom.history.push(clone(c.pressRoom.history[0])); },
  'a settled row past the seasons, or a second pending promise': c => {
    const done = c.pressRoom.history.find((r: Bag) => r.promise && r.promise.outcome !== 'pending');
    if (done) done.promise.settledIndex = 1e6;
    else { const calm = c.pressRoom.history.find((r: Bag) => !r.promise); const p = c.pressRoom.history.find((r: Bag) => r.promise); calm.choice = 'ambitious'; calm.promise = clone(p.promise); }
  },
  'a recorded season gained four goals': c => { c.seasons[c.pressRoom.history[c.pressRoom.history.length - 1].source.index].goals += 4; },
};

const POINTS: [string, number, string, (s: CareerState) => boolean][] = [
  ['early, a promise pending', 41, 'ST', s => history(s).length >= 3 && pendingNow(s)],
  ['late, promises settled', 43, 'CM', s => history(s).length >= 9 && settledCount(s) >= 3 && pendingNow(s)],
];

describe.each(POINTS)('ruling C3, the Press room part damaged %s', (_name, seed, position, stop) => {
  it.each(Object.keys(DAMAGES))('%s: judged exactly as the save with no part, nothing throws', async damage => {
    const good = careerAt(seed, position, stop);
    vi.restoreAllMocks();
    expect(pressRoomView(good).history.length).toBe(good.pressRoom!.history.length);
    const hurt = clone(good) as Bag;
    DAMAGES[damage](hurt);
    const bad = clone(hurt) as unknown as CareerState;          /* what a browser reads back from storage */
    const none = clone(bad); delete (none as Bag).pressRoom;
    if (damage === 'a recorded season gained four goals') (none as Bag).seasons = clone(bad.seasons);
    /* the view */
    const view = pressRoomView(bad), plain = pressRoomView(none);
    expect(view.history).toEqual([]);
    expect(view.credibility).toBe(50);
    expect({ eligible: view.eligible, reason: view.reason, options: view.options, question: view.question }).toEqual({ eligible: plain.eligible, reason: plain.reason, options: plain.options, question: plain.question });
    expect(String(view.reason)).not.toMatch(/verif/i);
    /* a save and a load keep the bytes of the part and still read it as absent */
    const loaded = repairCareer(clone(bad));
    expect(JSON.stringify((loaded as Bag).pressRoom)).toBe(JSON.stringify((bad as Bag).pressRoom));
    expect(pressRoomView(loaded).history).toEqual([]);
    /* the next answer writes a fresh part, and pays what it pays on the save with no part */
    if (plain.eligible) {
      const a = answerSoccerPress(bad, 'calm'), b = answerSoccerPress(none, 'calm');
      expect(a.pressRoom).toEqual(b.pressRoom);
      expect(a.pressRoom!.history.length).toBe(1);
      expect([a.morale, a.popularity]).toEqual([b.morale, b.popularity]);
      expect(pressRoomView(a).history.length).toBe(1);
    }
    /* a played year: no throw, the same year and the same number of draws as on the save with no part */
    seeded(9000 + seed); const yearBad = advanceProSeason(clone(bad), CLUBS); const drawsBad = draws; vi.restoreAllMocks();
    seeded(9000 + seed); const yearNone = advanceProSeason(clone(none), CLUBS); const drawsNone = draws; vi.restoreAllMocks();
    const strip = (s: CareerState) => { const o = clone(s) as Bag; delete o.pressRoom; return o; };
    expect(drawsBad).toBe(drawsNone);
    expect(strip(yearBad)).toEqual(strip(yearNone));
    expect(JSON.stringify((yearBad as Bag).pressRoom)).toBe(JSON.stringify((bad as Bag).pressRoom));
    /* the tile that reads it */
    let latest = bad;
    const onCareer = (fn: (prev: CareerState) => CareerState) => { latest = fn(latest); };
    const { container } = render(<PressRoomTile career={bad} onCareer={onCareer} />);
    expect(container.querySelector('[data-press-room-open]') !== null).toBe(plain.eligible);
    expect(container.textContent ?? '').not.toMatch(/verif/i);
    if (plain.eligible) {
      expect(container.textContent).toContain('50/100');
      fireEvent.click(container.querySelector('[data-press-room-open]')!);
      /* the dialog (lazy) opens on the damaged part, shows no history, and an answer through it writes a fresh part */
      const start = await waitFor(() => { const b = document.querySelector<HTMLButtonElement>('[data-press-start]'); if (!b) throw new Error('the press room dialog is not open yet'); return b; }, { timeout: 20000 });
      expect(start.textContent).toBe('Answer for your season');
      fireEvent.click(start);
      const calm = await waitFor(() => { const b = document.querySelector<HTMLButtonElement>('[data-press-answer="calm"]'); if (!b) throw new Error('no answers on screen'); return b; });
      expect(document.body.textContent ?? '').not.toMatch(/verif/i);
      expect(document.body.textContent ?? '').not.toContain('Your past answers');
      fireEvent.click(calm);
      expect(latest.pressRoom?.history.length).toBe(1);
      expect(pressRoomView(latest).history.length).toBe(1);
    }
  });
});

/* Two promises on one season row at the clamps: the press promise (settleSoccerPress, plus or minus 3 morale) and
   the season plan's appearance promise (settleSoccerProgramme, plus 3 or minus 5), in the engine's order. */
describe('a press promise and the season plan promise settle on one row at the clamps', () => {
  const clampM = (n: number) => Math.max(0, Math.min(100, n));
  it.each([[99, true, true], [99, true, false], [99, false, true], [2, false, false], [2, false, true], [2, true, false], [50, true, true]])('morale %i, press kept %s, plan kept %s', (morale, pressKept, planKept) => {
    let s = careerAt(41, 'ST', c => history(c).length >= 3 && pendingNow(c));
    vi.restoreAllMocks();
    const planned = chooseProgramme(s, 'promise', 'starter');
    if (planned === s) { console.log('NOT EXERCISED: the season plan promise is not offered on this save'); return; }
    s = clone(planned);
    const held = history(s).find(h => h.promise?.outcome === 'pending')!;
    const last = s.seasons[s.seasons.length - 1];
    const row = { ...clone(last), year: last.year + 1, age: last.age + 1, club: s.currentClub, apps: 34, leagueApps: planKept ? 30 : 10, goals: pressKept ? held.promise!.target + 1 : 0, assists: 3, rating: 7.1 } as Bag;
    delete row.injury; delete row.injuryWeeks; delete row.injurySevere; delete row.suspensionMatches; delete row.programme; delete row.cupRun;
    s.seasons = [...s.seasons, row as any];
    s.morale = morale; s.popularity = 50;
    settleSoccerPress(s, row as any);
    const afterPress = s.morale;
    settleSoccerProgramme(s, row as any);
    const verdict = history(s).find(h => h.source.index === held.source.index)!.promise!;
    const receipt = (s as Bag).programme?.receipts?.find((r: Bag) => r.year === row.year);
    console.log(`CLAMPS morale ${morale}: press ${verdict.outcome} -> ${afterPress}, plan ${receipt?.promise} -> ${s.morale}`);
    expect(held.promise!.metric).toBe('goals');
    expect(verdict.outcome).toBe(pressKept ? 'met' : 'missed');
    expect(afterPress).toBe(clampM(morale + (pressKept ? 3 : -3)));
    expect(receipt?.promise).toBe(planKept ? 'met' : 'broken');
    expect(s.morale).toBe(clampM(afterPress + (planKept ? 3 : -5)));
    expect(pressRoomView(s).history.length).toBe(history(s).length);
    expect(pressRoomView(repairCareer(clone(s))).history.length).toBe(history(s).length);
  });
});

describe('ruling C3, the tile on a retired career with a damaged part', () => {
  it('draws nothing and does not throw', () => {
    const good = careerAt(41, 'ST', s => history(s).length >= 3 && pendingNow(s));
    vi.restoreAllMocks();
    for (const damage of Object.keys(DAMAGES)) {
      const hurt = clone(good) as Bag; DAMAGES[damage](hurt); hurt.retired = true; hurt.phase = 'retired';
      const { container, unmount } = render(<PressRoomTile career={hurt as unknown as CareerState} onCareer={() => undefined} />);
      expect(container.querySelector('[data-press-room-open]')).toBeNull();
      unmount();
    }
    expect(screen.queryByText(/could not be verified/i)).toBeNull();
  });
});

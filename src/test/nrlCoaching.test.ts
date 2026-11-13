import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCoachQuote, nrlMedicalUpgradeQuote, nrlOppositionReport, readNrlCareerSave,
  nrlCoachCourseQuote, nrlCoachRetentionQuote, nrlCoachSpend, nrlMutualReleaseQuote, nrlCareerSquad, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, type NrlCoachRole } from '@/lib/nrlManager';

const raw = (career: NrlCareerState) => JSON.stringify(career);
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const hire = (career: NrlCareerState, role: NrlCoachRole) => reduceNrlCareer(career, {
  type: 'hireCoach', role, year: career.season.year, round: career.season.round,
});
const retain = (career: NrlCareerState, enabled = true) => reduceNrlCareer(career, {
  type: 'setCoachRetention', enabled, year: career.season.year, clubId: career.season.clubId,
});
function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = advance(career);
  return career;
}
const enrol = (career: NrlCareerState) => reduceNrlCareer(career, {
  type: 'startCoachCourse', year: career.season.year, clubId: career.season.clubId, round: career.season.round,
});

describe('NRL assistant coaching', () => {
  it.each([[2026, 'storm', 'attack', 5], [2027, 'bears', 'defense', 14]] as const)(
    'funds the %i assistant course and applies the earned rating only to the retained assistant and tactic',
    (year, club, role, seed) => {
      const initial = createNrlCareer(club, seed, year);
      expect(enrol(initial)).toBe(initial);
      const hired = hire(initial, role);
      const plainCourse = nrlCoachCourseQuote(hired);
      expect(plainCourse).toMatchObject({ reason: null, remaining: 4 });
      expect(plainCourse.fee).toBeGreaterThan(0);
      const started = enrol(hired);
      expect(started.season).toBe(hired.season);
      expect(nrlCareerFinance(started).cash).toBe(nrlCareerFinance(hired).cash - plainCourse.fee);
      expect(enrol(started)).toBe(started);
      expect(readNrlCareerSave(raw(started))).toEqual(started);
      let chosen = started, control = hired;
      for (let remaining = 3; remaining >= 0; remaining--) {
        chosen = advance(chosen); control = advance(control);
        expect(chosen.season).toEqual(control.season);
        expect(nrlCoachCourseQuote(chosen).remaining).toBe(remaining);
      }
      const complete = finish(chosen), ordinary = finish(control);
      expect(complete.season).toEqual(ordinary.season);
      const plain = reduceNrlCareer(retain(ordinary), { type: 'startNextSeason' });
      const trained = reduceNrlCareer(retain(complete), { type: 'startNextSeason' });
      expect(trained.finance.coachHire).toEqual({ role, round: 1, paidRounds: 0, retained: true, qualified: true });
      expect(trained.history.at(-1)?.finance?.coachCourseRound).toBe(1);
      expect(nrlCoachQuote(trained).current).toEqual(nrlCoachQuote(complete).current);
      expect(nrlCoachSpend(trained.finance)).toEqual(nrlCoachSpend(plain.finance));
      const roleEdge = role === 'attack' ? 'attackEdge' : 'defenseEdge';
      const apply = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'setTactic', tactic: role });
      expect(nrlOppositionReport(trained)).toEqual(nrlOppositionReport(plain));
      expect(nrlOppositionReport(apply(trained))![roleEdge] - nrlOppositionReport(apply(plain))![roleEdge]).toBeCloseTo(1);
      const live = reduceNrlCareer(apply(trained), { type: 'startLive' });
      const ordinaryLive = reduceNrlCareer(apply(plain), { type: 'startLive' });
      expect(live.season.live).toBeDefined();
      expect(readNrlCareerSave(raw(live))).toEqual(live);
      expect(live.season.live).not.toEqual(ordinaryLive.season.live);
      expect(readNrlCareerSave(raw({ ...live, season: { ...live.season, live: ordinaryLive.season.live } }))).toBeNull();
      const quick = advance(apply(trained));
      const ordinaryQuick = advance(apply(plain));
      const isManaged = (result: typeof quick.season.results[number]) => result.homeId === club || result.awayId === club;
      expect(quick.season.results.find(isManaged)).not.toEqual(ordinaryQuick.season.results.find(isManaged));
      expect(quick.season.results.filter(result => !isManaged(result))).toEqual(ordinaryQuick.season.results.filter(result => !isManaged(result)));
      expect(reduceNrlCareer(live, { type: 'finishLive', year: year + 1, round: 1, tactic: role })).toEqual(quick);
      const moved = reduceNrlCareer(retain(complete), { type: 'startNextSeason', move: { fromYear: year, clubId: year === 2026 ? 'bears' : 'chiefs' } });
      expect(moved.finance.coachHire).toBeUndefined();
      expect(moved.history.at(-1)?.finance?.coachCourseRound).toBe(1);
      expect(readNrlCareerSave(raw(moved))).toEqual(moved);
      expect(reduceNrlCareer(complete, { type: 'startNextSeason' }).finance.coachHire).toBeUndefined();
      expect(readNrlCareerSave(raw(trained))).toEqual(trained);
      expect(nrlCoachCourseQuote(trained).reason).toMatch(/cannot carry/);
      expect(enrol(trained)).toBe(trained);
      const forged = { ...plain, finance: { ...plain.finance, coachHire: { ...plain.finance.coachHire!, qualified: true } } };
      expect(readNrlCareerSave(JSON.stringify(forged))).toBeNull();
    },
  );

  it('protects reserved wages and needs four regular rounds, with live and stale decisions refused', () => {
    const initial = createNrlCareer('storm', 5, 2026);
    const development = reduceNrlCareer(initial, { type: 'hireCoach', role: 'development', year: 2026, clubId: 'storm', round: 1 });
    expect(enrol(development)).toBe(development);
    const hired = hire(initial, 'attack');
    const { fee } = nrlCoachCourseQuote(hired);
    const short = { ...hired, finance: { ...hired.finance, openingCash: hired.finance.openingCash + fee - nrlCareerFinance(hired).cash } };
    expect(nrlCareerFinance(short).cash).toBe(fee);
    expect(nrlCoachCourseQuote(short).reason).toMatch(/assistant.*wages/i);
    expect(enrol(short)).toBe(short);
    const live = reduceNrlCareer(hired, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(enrol(live)).toBe(live);
    expect(reduceNrlCareer(hired, { type: 'startCoachCourse', year: 2026, clubId: 'storm', round: 2 })).toBe(hired);
    let late = hired;
    while (late.season.round < 24) late = advance(late);
    expect(nrlCoachCourseQuote(late).reason).toBeNull();
    const enrolled = enrol(late);
    expect(readNrlCareerSave(raw(enrolled))).toEqual(enrolled);
    late = advance(late);
    expect(nrlCoachCourseQuote(late).reason).toMatch(/four regular-season rounds/);
    expect(enrol(late)).toBe(late);
    expect(nrlCoachCourseQuote(finish(enrolled)).remaining).toBe(0);
  });

  it.each([[2026, 'storm'], [2027, 'bears']] as const)(
    'keeps the %i assistant for one extra year without a fresh hire fee',
    (year, club) => {
      const hired = hire(createNrlCareer(club, 4, year), 'defense');
      expect(retain(hired)).toBe(hired);
      const complete = finish(hired);
      const original = nrlCoachQuote(complete).current;
      expect(nrlCoachRetentionQuote(complete)).toEqual({ reason: null, reservedWages: 558_000 });
      const pending = retain(complete);
      expect(pending.coachRetention).toBe(true);
      expect(pending.finance).toBe(complete.finance);
      expect(pending.season).toBe(complete.season);
      expect(raw(retain(pending, false))).toBe(raw(complete));
      expect(readNrlCareerSave(raw(pending))).toEqual(pending);
      const plain = reduceNrlCareer(complete, { type: 'startNextSeason' });
      const extended = reduceNrlCareer(pending, { type: 'startNextSeason' });
      expect(extended.coachRetention).toBeUndefined();
      expect(extended.history.at(-1)?.coachRetained).toBe(true);
      expect(extended.finance.coachHire).toEqual({ role: 'defense', round: 1, paidRounds: 0, retained: true });
      expect(nrlCoachQuote(extended).current).toEqual(original);
      expect(nrlCoachSpend(extended.finance)).toEqual({ signingFee: 0, wages: 0 });
      expect(extended.season).toEqual(plain.season);
      expect(nrlCareerFinance(extended).cash).toBe(nrlCareerFinance(plain).cash);
      const played = advance(extended);
      expect(nrlCoachSpend(played.finance)).toEqual({ signingFee: 0, wages: 18_000 });
      expect(raw(readNrlCareerSave(raw(played))!)).toBe(raw(played));
      const finished = finish(played);
      expect(nrlCoachRetentionQuote(finished).reason).toMatch(/already extended/);
      expect(retain(finished)).toBe(finished);
      const dropped = reduceNrlCareer(finished, { type: 'startNextSeason' });
      expect(dropped.finance.coachHire).toBeUndefined();
      expect(readNrlCareerSave(raw(dropped))).toEqual(dropped);
      const forged = { ...extended, history: plain.history };
      expect(readNrlCareerSave(raw(forged))).toBeNull();
    },
  );

  it('clears a pending retention on a move or retirement without charging another club', () => {
    const complete = finish(hire(createNrlCareer('storm', 4), 'attack'));
    const pending = retain(complete);
    const move = { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } } as const;
    expect(raw(reduceNrlCareer(pending, move))).toBe(raw(reduceNrlCareer(complete, move)));
    const retire = { type: 'retireCareer', year: 2026, clubId: 'storm' } as const;
    expect(raw(reduceNrlCareer(pending, retire))).toBe(raw(reduceNrlCareer(complete, retire)));
    expect(reduceNrlCareer(pending, { type: 'setCoachRetention', enabled: false, year: 2027, clubId: 'storm' })).toBe(pending);
  });

  it('honours the wage reservation and the player settlement in either order', () => {
    const complete = finish(hire(createNrlCareer('storm', 4), 'attack'));
    const player = nrlCareerSquad(complete).find(candidate => nrlMutualReleaseQuote(complete, candidate.id).ok)!;
    const quote = nrlMutualReleaseQuote(complete, player.id);
    const release = { type: 'agreeMutualRelease', year: 2026, clubId: 'storm', playerId: player.id } as const;
    expect(quote.ok).toBe(true);
    const both = reduceNrlCareer(retain(complete), release);
    expect(both.coachRetention).toBe(true);
    expect(both.finance.mutualRelease?.playerId).toBe(player.id);
    expect(raw(retain(reduceNrlCareer(complete, release)))).toBe(raw(both));
    expect(readNrlCareerSave(raw(both))).toEqual(both);
    const short = { ...complete, finance: { ...complete.finance,
      openingCash: complete.finance.openingCash + 558_000 - nrlCareerFinance(complete).cash,
    } };
    const held = retain(short);
    expect(held.coachRetention).toBe(true);
    expect(nrlMutualReleaseQuote(held, player.id)).toMatchObject({ ok: false, reason: /assistant.*wages/ });
    expect(reduceNrlCareer(held, release)).toBe(held);
    const released = reduceNrlCareer(short, release);
    expect(released.finance.mutualRelease).toBeDefined();
    expect(nrlCoachRetentionQuote(released).reason).toMatch(/enough cash/);
    expect(retain(released)).toBe(released);
  });

  it('quotes stable fictional choices, charges a fee once and pays one wage per settled round', () => {
    const initial = createNrlCareer('panthers', 1);
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    const quote = nrlCoachQuote?.(initial);
    expect(quote).toMatchObject({ fee: 120_000, wagePerRound: 18_000, remainingWages: 558_000, reason: null });
    expect(quote?.candidates.slice(0, 2).map(candidate => candidate.role)).toEqual(['attack', 'defense']);
    expect(new Set(quote!.candidates.slice(0, 2).map(candidate => candidate.name)).size).toBe(2);
    expect(nrlCoachQuote(readNrlCareerSave(raw(initial))!)).toStrictEqual(quote);
    const hired = hire(initial, 'attack');
    expect(hired.finance.coachHire).toEqual({ role: 'attack', round: 1, paidRounds: 0 });
    expect(nrlCareerFinance(hired).cash).toBe(nrlCareerFinance(initial).cash - 120_000);
    expect(nrlCareerCap(hired)).toEqual(nrlCareerCap(initial));
    expect(hire(hired, 'defense')).toBe(hired);
    const after = advance(hired);
    expect(after.finance.coachHire?.paidRounds).toBe(1);
    expect(nrlCareerFinance(after).cash).toBe(nrlCareerFinance(advance(initial)).cash - 138_000);
    expect(raw(readNrlCareerSave(raw(after))!)).toBe(raw(after));
  });

  it('uses the specialist only with the matching tactic, including a saved Live kickoff', () => {
    const initial = createNrlCareer('broncos', 3);
    const attackHire = hire(initial, 'attack');
    expect(attackHire?.finance.coachHire?.role).toBe('attack');
    const defenseHire = hire(initial, 'defense');
    expect(nrlOppositionReport(attackHire)).toEqual(nrlOppositionReport(initial));
    expect(advance(attackHire).season.results).toEqual(advance(initial).season.results);
    const attack = reduceNrlCareer(initial, { type: 'setTactic', tactic: 'attack' });
    const coachedAttack = reduceNrlCareer(attackHire, { type: 'setTactic', tactic: 'attack' });
    const defense = reduceNrlCareer(initial, { type: 'setTactic', tactic: 'defense' });
    const coachedDefense = reduceNrlCareer(defenseHire, { type: 'setTactic', tactic: 'defense' });
    expect(nrlOppositionReport(coachedAttack)!.attackEdge - nrlOppositionReport(attack)!.attackEdge).toBeCloseTo(2);
    expect(nrlOppositionReport(coachedAttack)!.defenseEdge).toBeCloseTo(nrlOppositionReport(attack)!.defenseEdge);
    expect(nrlOppositionReport(coachedDefense)!.defenseEdge - nrlOppositionReport(defense)!.defenseEdge).toBeCloseTo(2);
    expect(nrlOppositionReport(coachedDefense)!.attackEdge).toBeCloseTo(nrlOppositionReport(defense)!.attackEdge);
    const pending = reduceNrlCareer(coachedAttack, { type: 'startLive' });
    expect(pending.season.live).toBeDefined();
    expect(pending.season.live!.homeScoring).not.toEqual(reduceNrlCareer(attack, { type: 'startLive' }).season.live!.homeScoring);
    expect(hire(pending, 'defense')).toBe(pending);
    const restored = readNrlCareerSave(raw(pending))!;
    expect(raw(restored)).toBe(raw(pending));
    const action = { type: 'finishLive', year: 2026, round: 1, tactic: 'attack' } as const;
    const finished = reduceNrlCareer(restored, action);
    expect(raw(finished)).toBe(raw(advance(coachedAttack)));
    expect(reduceNrlCareer(finished, action)).toBe(finished);
  });

  it('activates a specialist only after switching to that tactic at halftime', () => {
    const initial = createNrlCareer('broncos', 26);
    const standard = reduceNrlCareer(initial, { type: 'startLive' });
    const assisted = reduceNrlCareer(hire(initial, 'attack'), { type: 'startLive' });
    expect(assisted.season.live).toEqual(standard.season.live);
    const action = { type: 'finishLive', year: 2026, round: 1, tactic: 'attack' } as const;
    const normal = reduceNrlCareer(standard, action);
    const coached = reduceNrlCareer(readNrlCareerSave(raw(assisted))!, action);
    expect(coached.season.results[0].homeScore).toBeGreaterThan(normal.season.results[0].homeScore);
    expect(coached.season.results.slice(1)).toEqual(normal.season.results.slice(1));
  });

  it('reserves all remaining wages before approving a discretionary medical purchase', () => {
    let career = createNrlCareer('storm', 1);
    while (career.season.round < 9) career = advance(career);
    const room = reduceNrlCareer(career, { type: 'upgradeMedical', level: 2 });
    expect(nrlMedicalUpgradeQuote(room).reason).toBeNull();
    const hired = hire(room, 'attack');
    expect(hired?.finance.coachHire?.role).toBe('attack');
    expect(nrlCareerFinance(hired).cash).toBeGreaterThanOrEqual(2_600_000);
    expect(nrlMedicalUpgradeQuote(hired).reason).toMatch(/assistant.*wages/);
    expect(reduceNrlCareer(hired, { type: 'upgradeMedical', level: 3 })).toBe(hired);
    expect(raw(readNrlCareerSave(raw(hired))!)).toBe(raw(hired));
    const otherOrder = reduceNrlCareer(hire(career, 'attack'), { type: 'upgradeMedical', level: 2 });
    expect(otherOrder.finance).toEqual(hired.finance);
    expect(raw(readNrlCareerSave(raw(otherOrder))!)).toBe(raw(otherOrder));
  });

  it('settles only one round of pay for a Grand Final hire, archives it, and opens a new shortlist next year', () => {
    let career = createNrlCareer('storm', 4);
    while (career.season.round < 31) career = advance(career);
    expect(nrlNextRound(career.season).clubMatch?.tieId).toBe('GF');
    expect(nrlCoachQuote?.(career)).toMatchObject({ remainingWages: 18_000, reason: null });
    const hired = hire(career, 'defense');
    const closed = advance(hired);
    expect(closed.season.phase).toBe('complete');
    expect(closed.history[0].finance?.coachHire).toEqual({ role: 'defense', round: 31, paidRounds: 1 });
    expect(nrlCareerFinance(closed).cash).toBe(nrlCareerFinance(advance(career)).cash - 138_000);
    expect(hire(closed, 'attack')).toBe(closed);
    const next = reduceNrlCareer(closed, { type: 'startNextSeason' });
    expect(next.finance.openingCash).toBe(nrlCareerFinance(closed).cash);
    expect(next.finance.coachHire).toBeUndefined();
    expect(nrlCoachQuote(next).reason).toBeNull();
    expect(raw(readNrlCareerSave(raw(next))!)).toBe(raw(next));
    expect(reduceNrlCareer(next, { type: 'hireCoach', role: 'attack', year: 2026, round: 31 })).toBe(next);
  });

  it('rejects a forged wage tick and does not open a coaching contract in an imported season', () => {
    const initial = createNrlCareer('broncos', 16);
    const forged = { ...initial, finance: { ...initial.finance, coachHire: { role: 'attack', round: 1, paidRounds: 1 } } };
    expect(readNrlCareerSave(raw(forged as NrlCareerState)) === null).toBe(true);
    const pending = reduceNrlCareer(initial, { type: 'startLive' });
    expect(hire(pending, 'attack')).toBe(pending);
    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('broncos', 16)))!;
    expect(hire(legacy, 'attack')).toBe(legacy);
    expect(nrlCoachQuote(legacy).reason).toMatch(/imported season/);
    let eliminated = createNrlCareer('titans', 1);
    while (eliminated.season.round < 28) eliminated = advance(eliminated);
    expect(nrlNextRound(eliminated.season).clubStatus).toBe('eliminated');
    expect(nrlCoachQuote(eliminated).reason).toMatch(/no matches left/);
    expect(hire(eliminated, 'attack')).toBe(eliminated);
    const forgedFinals = { ...eliminated, finance: { ...eliminated.finance, coachHire: { role: 'attack', round: 28, paidRounds: 0 } } };
    expect(readNrlCareerSave(JSON.stringify(forgedFinals)) === null).toBe(true);
  });
});

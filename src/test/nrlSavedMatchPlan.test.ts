import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlSavedMatchPlanPreview, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlInjuries, nrlNextRound, nrlSavedLineupPreview, NRL_ROLES } from '@/lib/nrlManager';

const frame = ({ season: { year, clubId, round } }: NrlCareerState) => ({ year, clubId, round });
const reload = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career))!;
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const setup = (career: NrlCareerState) => reduceNrlCareer(reduceNrlCareer(career, {
  type: 'setAttackPlan', ...frame(career), attackPlan: 'counter',
}), { type: 'setKickingPlan', ...frame(career), plan: 'contest' });
const save = (career: NrlCareerState, slot: 'first' | 'rotation' = 'first') =>
  reduceNrlCareer(career, { type: 'saveMatchPlan', ...frame(career), slot });
const apply = (career: NrlCareerState, previewKey: string, slot: 'first' | 'rotation' = 'first') =>
  reduceNrlCareer(career, { type: 'applySavedMatchPlan', ...frame(career), slot, previewKey });
const match = (career: NrlCareerState) => career.season.results.find(row => row.round === career.season.round - 1 && row.playerScoring)!;

describe('NRL saved match plans', () => {
  it('restores the saved attack and kicking choices and changes a real match', () => {
    const initial = createNrlCareer('bears', 3, 2027);
    const saved = save(setup(initial));
    expect(saved.savedMatchPlans?.first).toEqual({ attackPlan: 'counter', kickingPlan: 'contest' });
    expect(saved.savedLineup?.lineup).toEqual(initial.season.lineup);
    expect(save(saved)).toBe(saved);
    const ordinary = reload({ ...saved, season: initial.season });
    expect(ordinary.savedMatchPlans).toEqual(saved.savedMatchPlans);
    const preview = nrlSavedMatchPlanPreview(ordinary, 'first')!;
    expect(preview.changed).toBe(true);
    const prepared = apply(ordinary, preview.key);
    expect(prepared.season).toEqual(setup(initial).season);
    expect(prepared.players).toBe(ordinary.players);
    expect(prepared.finance).toBe(ordinary.finance);
    expect(apply(prepared, preview.key)).toBe(prepared);
    const quick = advance(reload(prepared));
    const usual = advance(ordinary);
    expect(match(quick)).toMatchObject({ counterStyle: 'middle', kickingPlan: 'contest' });
    expect([match(usual).homeScore, match(usual).awayScore]).toEqual([24, 28]);
    expect([match(quick).homeScore, match(quick).awayScore]).toEqual([30, 28]);
    expect(quick.season.attackPlan).toBeUndefined();
    expect(quick.season.kickingPlan).toBeUndefined();
    expect(quick.savedMatchPlans).toEqual(saved.savedMatchPlans);
    const half = reduceNrlCareer(prepared, { type: 'startLive' });
    expect(apply(half, preview.key)).toBe(half);
    const playedLive = reduceNrlCareer(reload(half), { type: 'finishLive', ...frame(half), tactic: half.season.tactic });
    expect(playedLive).toEqual(quick);
    expect(usual.season).toEqual(advance(initial).season);
  });

  it('repairs an injured saved starter and preserves a lineup-only apply', () => {
    const opening = createNrlCareer('storm', 4);
    const saved = save(setup(opening), 'rotation');
    let injured = advance(saved);
    while ((!nrlNextRound(injured.season).clubMatch || !Object.values(saved.savedRotationLineup!.lineup)
      .some(id => nrlInjuries(injured.season).has(id))) && injured.season.round < 24) injured = advance(injured);
    expect(nrlNextRound(injured.season).clubMatch).toBeTruthy();
    const preview = nrlSavedMatchPlanPreview(injured, 'rotation')!;
    expect(preview.lineup.replacements).toBeGreaterThan(0);
    const repaired = apply(injured, preview.key, 'rotation');
    for (const role of NRL_ROLES) expect(nrlInjuries(injured.season).has(repaired.season.lineup[role])).toBe(false);
    expect(repaired.season.attackPlan).toBe('counter');
    expect(repaired.season.kickingPlan).toBe('contest');
    expect(reload(repaired)).toEqual(repaired);

    const lineup = nrlSavedLineupPreview(injured.season, saved.savedRotationLineup!)!;
    const plain = reduceNrlCareer(injured, { type: 'applySavedLineup', slot: 'rotation', previewKey: lineup.key });
    expect(plain.season.attackPlan).toBe(injured.season.attackPlan);
    expect(plain.season.kickingPlan).toBe(injured.season.kickingPlan);
    const stale = reduceNrlCareer(injured, { type: 'setKickingPlan', ...frame(injured), plan: 'territory' });
    expect(apply(stale, preview.key, 'rotation')).toBe(stale);
  });

  it('never writes via an old save, a bye, a stale round or a forged slot', () => {
    const legacy = reload(createNrlSeason('storm', 4) as unknown as NrlCareerState);
    const bye = createNrlCareer('panthers', 16);
    expect(save(legacy)).toBe(legacy);
    expect(save(bye)).toBe(bye);
    const initial = createNrlCareer('bears', 3, 2027);
    expect(reduceNrlCareer(initial, { type: 'saveMatchPlan', ...frame(initial), round: 2, slot: 'first' })).toBe(initial);
    const saved = save(initial);
    expect(readNrlCareerSave(JSON.stringify({ ...saved, savedLineup: undefined }))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...saved, savedMatchPlans: { first: { attackPlan: 'standard', kickingPlan: 'unknown' } } }))).toBeNull();
  });

  it('keeps both slots independent and only carries them with the existing lineup choice', () => {
    const opening = createNrlCareer('storm', 4);
    const first = save(setup(opening));
    const rotation = save({ ...first, season: opening.season }, 'rotation');
    const settings = {
      first: { attackPlan: 'counter', kickingPlan: 'contest' },
      rotation: { attackPlan: 'standard', kickingPlan: 'mixed' },
    };
    expect(rotation.savedMatchPlans).toEqual(settings);
    const edited = reduceNrlCareer(rotation, { type: 'setKicker', playerId: opening.season.lineup.Fullback });
    let career = reduceNrlCareer(edited, { type: 'saveLineup', year: 2026, clubId: 'storm' });
    expect(career.savedLineup!.kickerId).toBe(opening.season.lineup.Fullback);
    expect(career.savedMatchPlans).toEqual(settings);
    expect(career.savedRotationLineup!.kickerId).toBe(opening.season.kickerId);
    while (career.season.phase !== 'complete') career = advance(career);
    const ordinary = reduceNrlCareer(career, { type: 'startNextSeason' });
    expect(ordinary.savedMatchPlans).toBeUndefined();
    const kept = reduceNrlCareer(career, {
      type: 'startNextSeason', carryLineups: { fromYear: 2026, clubId: 'storm' },
    });
    expect(kept.season.year).toBe(2027);
    expect(kept.savedLineup?.year).toBe(2027);
    expect(kept.savedRotationLineup?.year).toBe(2027);
    expect(kept.savedMatchPlans).toEqual(settings);
    expect(kept.season.attackPlan).toBeUndefined();
    expect(kept.season.kickingPlan).toBeUndefined();
    expect(reload(kept)).toEqual(kept);
  });
});

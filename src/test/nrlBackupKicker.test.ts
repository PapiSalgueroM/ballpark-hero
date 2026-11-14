import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlFitLineup, nrlHalftimeInterchanges, nrlInjuries, nrlNextRound, nrlStarterOptions } from '@/lib/nrlManager';

const advance = (current: NrlCareerState) => reduceNrlCareer(current, { type: 'advance' });
const ownMatch = (state: NrlCareerState, round: number) => state.season.results.find(result => result.round === round
  && (result.homeId === state.season.clubId || result.awayId === state.season.clubId))!;
const appoint = (state: NrlCareerState, playerId: string | null, round = state.season.round) =>
  reduceNrlCareer(state, { type: 'setBackupKicker', year: state.season.year, clubId: state.season.clubId, round, playerId });

describe('NRL backup goal kicker', () => {
  it.each([[2026, 'broncos', 1], [2027, 'bears', 1]] as const)('lets the %s backup take second-half place kicks after a genuine interchange', (year, clubId, seed) => {
    const original = createNrlCareer(clubId, seed, year);
    const primary = original.season.lineup.Hooker;
    const deputy = original.season.lineup.Lock;
    const reserve = original.season.squad.find(player => player.role === 'Hooker' && player.id !== primary)!;
    const chosen = reduceNrlCareer(original, { type: 'setKicker', playerId: primary });
    const selected = reduceNrlCareer(chosen, { type: 'selectBench', slot: 0, playerId: reserve.id });
    const liveBefore = reduceNrlCareer(selected, { type: 'startLive' });
    const live = reduceNrlCareer(appoint(selected, deputy), { type: 'startLive' });
    expect(live.season.live).toEqual(liveBefore.season.live);
    expect(nrlHalftimeInterchanges(liveBefore.season).some(row => row.starterId === primary)).toBe(false);
    const picked = nrlHalftimeInterchanges(live.season).find(row => row.starterId === primary)!;
    expect(picked.reserveId).toBe(reserve.id);
    const round = live.season.round;
    const at60 = reduceNrlCareer(live, { type: 'reachMinute60', year, round, tactic: 'balanced', interchange: picked });
    const reloaded = readNrlCareerSave(JSON.stringify(at60))!;
    expect(reloaded).toEqual(at60);
    const played = reduceNrlCareer(reloaded, { type: 'finishMinute60', year, round, tactic: 'balanced' });
    const result = ownMatch(played, round);
    const ownHome = result.homeId === clubId;
    const first = ownHome ? live.season.live!.homeScoring : live.season.live!.awayScoring;
    const total = ownHome ? result.homeScoring : result.awayScoring;
    const scoring = result.playerScoring!;
    expect(scoring).toMatchObject({ kickerId: primary, kickerHandoff: { playerId: deputy, openingConversions: first.conversions, openingPenalties: first.penalties } });
    const kicks = (id: string) => {
      const line = scoring.lines.find(row => row.playerId === id);
      return [line?.conversions ?? 0, line?.penalties ?? 0];
    };
    expect(kicks(primary)).toEqual([first.conversions, first.penalties]);
    expect(kicks(deputy)).toEqual([total.conversions - first.conversions, total.penalties - first.penalties]);
    expect(kicks(deputy).reduce((sum, goals) => sum + goals)).toBeGreaterThan(0);
    expect(readNrlCareerSave(JSON.stringify(played))).toEqual(played);
    const forged = { ...played, season: { ...played.season, results: played.season.results.map(match => match === result
      ? { ...match, playerScoring: { ...scoring, kickerHandoff: { ...scoring.kickerHandoff, playerId: primary } } } : match) } };
    expect(readNrlCareerSave(JSON.stringify(forged))).toBeNull();
  });

  it('protects the backup if the primary goes off, even if there is a held late reserve', () => {
    const initial = createNrlCareer('broncos', 1);
    const primary = initial.season.lineup.Hooker, deputy = initial.season.lineup.Lock;
    const cover = (role: 'Hooker' | 'Lock') => initial.season.squad.find(player => player.role === role && player.id !== initial.season.lineup[role])!;
    const pick = (state: NrlCareerState, slot: number, playerId: string) => reduceNrlCareer(state, { type: 'selectBench', slot, playerId });
    const withKicker = reduceNrlCareer(initial, { type: 'setKicker', playerId: primary });
    const appointed = appoint(pick(pick(withKicker, 0, cover('Hooker').id), 1, cover('Lock').id), deputy);
    const normal = reduceNrlCareer(appointed, { type: 'startLive' });
    const interchanges = nrlHalftimeInterchanges(normal.season);
    const first = interchanges.find(row => row.starterId === primary)!;
    const second = interchanges.find(row => row.starterId === deputy)!;
    const context = { year: 2026, round: 1, tactic: 'balanced' } as const;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(reduceNrlCareer(normal, { type: 'finishLive', ...context, interchange: first, secondInterchange: second })).toBe(normal);
    expect(reduceNrlCareer(normal, { type: 'reachMinute60', ...context, interchange: second, secondInterchange: first })).toBe(normal);
    const held = reduceNrlCareer(appointed, { type: 'startLive', hold: { ...context, reserveId: cover('Lock').id } });
    const at60 = reduceNrlCareer(held, { type: 'reachMinute60', ...context, interchange: first });
    expect(at60.season.live?.minute60).toBeDefined();
    expect(reduceNrlCareer(at60, { type: 'finishMinute60', ...context, reserveId: cover('Lock').id })).toBe(at60);
    expect(reduceNrlCareer(at60, { type: 'finishMinute60', ...context })).not.toBe(at60);
  });

  it.each([[2026, 'broncos'], [2027, 'bears']] as const)(
    'hands the %s kicking duties to a fit backup when a real match knocks out the starter',
    (year, club) => {
      let seed = 0;
      let start: NrlCareerState;
      let primary: string;
      do {
        start = createNrlCareer(club, ++seed, year);
        primary = ownMatch(advance(start), 1).injury?.playerId ?? '';
      } while ((!Object.values(start.season.lineup).includes(primary) || primary === start.season.lineup.Halfback) && seed < 120);
      expect(primary).not.toBe('');
      const role = start.season.squad.find(player => player.id === primary)!.role;
      const backupRole = role === 'Fullback' ? 'Left Wing' : 'Fullback';
      const backup = start.season.lineup[backupRole];
      const nominated = reduceNrlCareer(start, { type: 'setKicker', playerId: primary });
      const appointed = appoint(nominated, backup);
      expect(appointed.season?.backupKickerId).toBe(backup);
      expect(appoint(nominated, primary)).toBe(nominated);
      expect(appoint(nominated, backup, 2)).toBe(nominated);
      expect(JSON.stringify(readNrlCareerSave(JSON.stringify(appointed)))).toBe(JSON.stringify(appointed));
      const previewKey = nrlFitLineup(nominated.season)!.key;
      expect(nrlFitLineup(appointed.season)!.key).not.toBe(previewKey);
      const live = reduceNrlCareer(appointed, { type: 'startLive' });
      expect(appoint(live, null)).toBe(live);
      const hurt = advance(appointed);
      expect(nrlInjuries(hurt.season).has(primary)).toBe(true);
      expect(hurt.season.kickerId).toBe(backup);
      expect(hurt.season.backupKickerId).toBe(backup);
      for (let attempts = 0, next = hurt; attempts < 6; attempts++, next = advance(next)) {
        if (!nrlNextRound(next.season).clubMatch) continue;
        const played = ownMatch(advance(next), next.season.round);
        const score = played.homeId === club ? played.homeScoring : played.awayScoring;
        if (score.conversions + score.penalties === 0) continue;
        expect(played.playerScoring?.kickerId).toBe(backup);
        expect(played.playerScoring?.lines.find(player => player.playerId === backup)).toMatchObject({
          conversions: score.conversions, penalties: score.penalties,
        });
        return;
      }
      throw new Error('Seeded next fixtures did not record a goal kick');
    },
  );

  it.each([[2026, 'broncos'], [2027, 'bears']] as const)(
    'keeps the %s halfback fallback when both nominations leave the starting side',
    (year, club) => {
      const initial = createNrlCareer(club, 1, year);
      const primary = initial.season.lineup.Fullback, backup = initial.season.lineup['Left Wing'];
      const withPrimary = reduceNrlCareer(initial, { type: 'setKicker', playerId: primary });
      const withBackup = appoint(withPrimary, backup);
      expect(withBackup.season?.backupKickerId).toBe(backup);
      const unavailable = reduceNrlCareer(withBackup, { type: 'selectStarter', role: 'Left Wing',
        playerId: nrlStarterOptions(withBackup.season, 'Left Wing').find(player => player.id !== backup)!.id });
      const changed = reduceNrlCareer(unavailable, { type: 'selectStarter', role: 'Fullback',
        playerId: nrlStarterOptions(unavailable.season, 'Fullback').find(player => player.id !== primary)!.id });
      expect(changed.season.kickerId).toBe(changed.season.lineup.Halfback);
      expect(changed.season.backupKickerId).toBe(backup);
      expect(JSON.stringify(readNrlCareerSave(JSON.stringify(changed)))).toBe(JSON.stringify(changed));
      expect(readNrlCareerSave(JSON.stringify({ ...changed, season: { ...changed.season, backupKickerId: 'invalid' } }))).toBeNull();
      expect(JSON.stringify(appoint(withBackup, null))).toBe(JSON.stringify(withPrimary));
    },
  );

  it('keeps a returning squad backup through summer and clears the appointment on a club move', () => {
    const opening = createNrlCareer('broncos', 1, 2026);
    const returning = Object.values(opening.season.lineup).find(id => id !== opening.season.kickerId
      && opening.players.some(player => player.id === id && player.contract!.endYear > 2026))!;
    expect(returning).toBeDefined();
    let state = appoint(opening, returning);
    while (state.season.phase !== 'complete') state = advance(state);
    const staying = reduceNrlCareer(state, { type: 'startNextSeason' });
    expect(staying.season.year).toBe(2027);
    expect(staying.season.backupKickerId).toBe(returning);
    expect(readNrlCareerSave(JSON.stringify(staying))).toEqual(staying);
    const moving = reduceNrlCareer(state, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(moving.season.clubId).toBe('bears');
    expect(moving.season.backupKickerId).toBeUndefined();
    expect(moving.season.kickerId).toBe(moving.season.lineup.Halfback);
  });
});

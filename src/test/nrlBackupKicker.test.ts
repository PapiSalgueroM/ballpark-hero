import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlFitLineup, nrlInjuries, nrlNextRound, nrlStarterOptions } from '@/lib/nrlManager';

const advance = (current: NrlCareerState) => reduceNrlCareer(current, { type: 'advance' });
const ownMatch = (state: NrlCareerState, round: number) => state.season.results.find(result => result.round === round
  && (result.homeId === state.season.clubId || result.awayId === state.season.clubId))!;
const appoint = (state: NrlCareerState, playerId: string | null, round = state.season.round) =>
  reduceNrlCareer(state, { type: 'setBackupKicker', year: state.season.year, clubId: state.season.clubId, round, playerId });

describe('NRL backup goal kicker', () => {
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

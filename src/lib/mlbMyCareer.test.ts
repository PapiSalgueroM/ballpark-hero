import { expect, it } from 'vitest';
import { mulberry32 } from './leagueCore';
import {
  MLB_ARCHETYPES, mlbAssignRole, mlbCampBattle, mlbRollTeamQuality, simMlbSeason, startMlbCareer,
  type MlbCareerPos,
} from './mlbMyCareer';

const hitterNotes = {
  warm: '🔥 Everything you hit found grass. Career year.',
  cold: '🥶 Nothing fell in. You hit into everything.',
  october: '🧊 Ice in October. You were a different hitter once the lights came on.',
};
const pitcherNotes = {
  warm: '🔥 Your best pitches were working. Career year.',
  cold: '🥶 You never found your rhythm on the mound.',
  october: '🧊 Ice in October. Your best stuff showed up when the lights came on.',
};

const cases: [MlbCareerPos, number, number, keyof typeof hitterNotes][] = [
  ['SP', 1, 12, 'warm'], ['SP', 1, 6, 'cold'], ['SP', 1, 20, 'october'],
  ['RP', 5848, 40941, 'warm'], ['RP', 1, 2, 'cold'], ['RP', 1, 8, 'october'],
  ['1B', 1, 6, 'warm'], ['1B', 1, 25, 'cold'], ['1B', 1, 218, 'october'],
];

it.each(cases)('uses the right %s season note for draft %i, season seed %i (%s)', (pos, draftSeed, playSeed, note) => {
  const draft = mulberry32(draftSeed);
  const arch = MLB_ARCHETYPES[pos][0];
  const c = startMlbCareer('Season Note Test', pos, arch, draft);
  const teamQuality = mlbRollTeamQuality(null, draft);
  mlbAssignRole(c, teamQuality, draft);
  const rng = mulberry32(playSeed);
  mlbCampBattle(c, teamQuality, rng);
  const { line, notes } = simMlbSeason(c, teamQuality, rng);

  if (pos === 'SP' || pos === 'RP') {
    expect(line.era).toBeTypeOf('number');
    expect(line.hr).toBeUndefined();
    expect(notes).toContain(pitcherNotes[note]);
    expect(notes).not.toContain(hitterNotes[note]);
  } else {
    expect(line.hr).toBeTypeOf('number');
    expect(notes).toContain(hitterNotes[note]);
  }
});

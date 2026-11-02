import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import UsSeasonCentre from '@/components/us-career/season/UsSeasonCentre';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_SEASON } from '@/lib/season/mlb';
import { buildUsSeason, usPlayoffLay, type UsRow } from '@/lib/season/us';
import { deriveSeason } from '@/lib/season/core';
import { keyedRng } from '@/lib/keyedRng';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

declare global { interface Window { mlbReplayFixture: { initial: Record<string, unknown>; state: () => Record<string, unknown> } } }

function startFixture() {
  let career: UsCareerCore | null = null;
  let quality: number | null = null;
  let drawsNow = () => 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const stream = keyedRng(`mlb-playoff-viewer|division-exit|${attempt}`);
    let draws = 0;
    const rng = () => { draws += 1; return stream(); };
    const sport = MLB_CAREER_SPORT;
    const played = sport.startCareer('Replay Prospect', 'CF', sport.create.archetypes.CF[0], rng, null as never, 'now');
    let teamQuality = sport.rollTeamQuality(null, rng);
    sport.assignRole(played, teamQuality, rng);
    for (let year = 0; year < 2; year += 1) {
      sport.campBattle(played, teamQuality, rng);
      sport.simSeason(played, teamQuality, rng);
      sport.progress(played, rng);
      teamQuality = sport.rollTeamQuality(teamQuality, rng);
    }
    const copy = JSON.parse(JSON.stringify(played)) as UsCareerCore;
    const at = copy.seasons.length - 1;
    const row = { ...copy.seasons[at], teamResult: 'Lost the Division Series', poGames: 7, poLine: '9 for 28 (.321), 2 HR' } as UsRow;
    copy.seasons[at] = row;
    const built = buildUsSeason(MLB_SEASON, copy, row, sport.teamLabelOf);
    if (built.ok && deriveSeason(built.sport, row, built.ctx)) {
      career = copy; quality = teamQuality; drawsNow = () => draws; break;
    }
  }
  if (!career) throw new Error('No supported actual regular-season fixture');
  const saveKey = MLB_CAREER_SPORT.saveKey;
  const saveBytes = JSON.stringify({ c: career, phase: 'season', teamQuality: quality });
  localStorage.setItem(saveKey, saveBytes);
  const loaded = JSON.parse(localStorage.getItem(saveKey)!) as { c: UsCareerCore };
  const heldCareer = loaded.c;
  const row = heldCareer.seasons[heldCareer.seasons.length - 1] as UsRow;
  const built = buildUsSeason(MLB_SEASON, heldCareer, row, MLB_CAREER_SPORT.teamLabelOf);
  if (built.ok === false) throw new Error('Saved fixture lost its actual season context');
  const lay = usPlayoffLay(MLB_SEASON, row, built.ctx, built.key);
  if (!lay || lay.series.some(series => series.games === null)) throw new Error('Saved fixture has no complete playoff layout');
  const initial = {
    scope: 'Compiled UsSeasonCentre component fixture with production CSS; route, header, consent and save admission are not operated.',
    fixtureOverrides: 'The actual two-season hitter career gets the same explicit seven-game Division Series aggregate used by the admitted unit fixture.',
    rngObserver: 'Math.random delegates every call to the original function. Values and clocks are not forced.',
    saveBytes, careerBytes: JSON.stringify(heldCareer), constructorDraws: drawsNow(),
    finish: row.teamResult, line: row.poLine, games: row.poGames,
    series: lay.series.map(series => ({ round: series.round, games: series.games, need: series.need, won: series.won })),
  };
  const originalRandom = Math.random;
  let randomCalls = 0;
  Math.random = () => { randomCalls += 1; return originalRandom(); };
  let closed = 0;
  window.mlbReplayFixture = { initial, state: () => ({
    saveBytes: localStorage.getItem(saveKey), careerBytes: JSON.stringify(heldCareer), constructorDraws: drawsNow(), randomCalls, closed,
  }) };
  const root = createRoot(document.getElementById('root')!);
  const sport: UsCareerSport = { ...MLB_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(MLB_SEASON) };
  root.render(<MemoryRouter><UsSeasonCentre sport={sport} career={heldCareer} row={row} onClose={() => {
    closed += 1; Math.random = originalRandom; root.render(<p data-fixture-closed>Viewer closed.</p>);
  }} /></MemoryRouter>);
}

startFixture();

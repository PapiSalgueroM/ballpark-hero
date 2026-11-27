import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import { NBA_ARCHETYPES } from '@/lib/nbaCareerCreation';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { simNbaSeason, type NbaCareerPos, type NbaCareerState, type NbaSeasonLine } from '@/lib/nbaMyCareer';
import { keyedRng } from '@/lib/keyedRng';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer, type ProgrammeChoices } from '@/lib/usCareerProgramme';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = NbaCareerState & ProgrammeCareer;
const sport = NBA_CAREER_SPORT;
const open = () => render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
const read = (): Career => JSON.parse(localStorage.getItem(sport.saveKey)!).c;
const tenth = (n: number) => Math.round(n * 10) / 10;
const unaffected = ({ ppg, spg, bpg, awards, allDefensiveTeam, allNbaTeam, allStar, ...rest }: NbaSeasonLine) => rest;
const defence = (): ProgrammeChoices => ({ ...usProgrammeDefaults(), tactics: 'defend' });
const install = (c: Career, teamQuality = 86) => {
  const bytes = JSON.stringify({ c, phase: 'season', teamQuality, coach: null });
  localStorage.setItem(sport.saveKey, bytes);
  return bytes;
};
const staleProgramme = 'Your career changed in another tab. Reload this page to make changes.';

function openProgramme(board: ReturnType<typeof open>) {
  fireEvent.click(within(board.container).getByRole('button', { name: 'Plan your season' }));
  const dialog = within(screen.getByRole('dialog', { name: 'NBA season programme' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Continue to programme' }));
  return dialog;
}

function career(pos: NbaCareerPos, era = 'now', year?: number): Career {
  const c = sport.startCareer('Fixture Player', pos, sport.create.archetypes[pos][0], keyedRng(era + pos), null, era);
  if (year != null) c.year = year - 1;
  const { line } = simNbaSeason(c, 76, () => 0.8);
  sport.progress(c, keyedRng('first winter'), line.seasonRating);
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter', ovr: 89, pot: 94, morale: 80, health: 100, contractYears: 3 };
}

function playPair(c: Career, seed: string, teamQuality = 86) {
  const run = (input: Career) => {
    const rng = keyedRng(seed);
    let draws = 0;
    const preparation = prepareUsCareerProgramme(input, 'nba');
    const { line, notes } = simNbaSeason(input, teamQuality, () => { draws++; return rng(); }, true, preparation);
    restoreUsCareerProgramme(input, preparation);
    sport.progress(input, rng, line.seasonRating);
    settleUsCareerProgramme(input, line, 'nba', preparation);
    return { input, line, notes, draws };
  };
  return {
    original: run(structuredClone(c)),
    assigned: run(saveUsCareerProgramme(structuredClone(c), 'nba', defence()) as Career),
  };
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NBA defensive assignment', () => {
  it.each(['preview Apply', 'immediate choice', 'Clear'] as const)('refuses stale %s after another tab plays the season', action => {
    const c = career('PG');
    const olderBytes = install(action === 'Clear' ? saveUsCareerProgramme(c, 'nba', defence()) : c);
    const older = open();
    const newer = open();
    const play = within(newer.container).getByRole('button', { name: 'Play the ' + c.year + ' season' });
    const dialog = openProgramme(older);
    if (action === 'preview Apply') fireEvent.click(dialog.getByRole('button', { name: 'Try a plan' }));
    if (action !== 'Clear') fireEvent.click(dialog.getByRole('button', { name: /Tactical approach/ }));
    if (action === 'preview Apply') fireEvent.click(dialog.getByRole('button', { name: /Pressure the ball/ }));
    const button = dialog.getByRole('button', {
      name: action === 'Clear' ? 'Use your usual routine' : action === 'preview Apply' ? 'Apply plan' : /Pressure the ball/,
    });
    expect(button).toBeEnabled();
    expect(localStorage.getItem(sport.saveKey)).toBe(olderBytes);

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    fireEvent.click(play);
    const advanced = localStorage.getItem(sport.saveKey);
    expect(read().year).toBe(c.year + 1);
    expect(read().seasons).toHaveLength(c.seasons.length + 1);
    expect(read().seasons.at(-1)).toMatchObject({ year: c.year, team: c.team, games: 82 });
    if (action === 'Clear') expect(read().programmeResults?.at(-1)?.year).toBe(c.year);
    expect(advanced).not.toBe(olderBytes);

    fireEvent.click(button);
    expect(localStorage.getItem(sport.saveKey)).toBe(advanced);
    expect(dialog.getByRole('status')).toHaveTextContent(staleProgramme);
    expect(dialog.getByRole('status')).toBeVisible();
    expect(button).toBeDisabled();
  });

  it('still applies a fresh preview and clears the saved programme', () => {
    const c = career('PG');
    const raw = install(c);
    const dialog = openProgramme(open());
    fireEvent.click(dialog.getByRole('button', { name: 'Try a plan' }));
    fireEvent.click(dialog.getByRole('button', { name: /Tactical approach/ }));
    fireEvent.click(dialog.getByRole('button', { name: /Pressure the ball/ }));
    expect(localStorage.getItem(sport.saveKey)).toBe(raw);
    fireEvent.click(dialog.getByRole('button', { name: 'Apply plan' }));
    expect(read().programme).toMatchObject({ sport: 'nba', year: c.year, team: c.team, tactics: 'defend' });
    fireEvent.click(dialog.getByRole('button', { name: 'Use your usual routine' }));
    expect(read().programme).toBeUndefined();
    expect(dialog.queryByText(staleProgramme)).toBeNull();
  });

  it.each([
    ['PG', 'now', undefined, 'spg', 'bpg', 'Pressure the ball', 'steals per game', 82, 3],
    ['C', 'y2004', 2011, 'bpg', 'spg', 'Protect the rim', 'blocks per game', 66, 4],
  ] as const)('saves, reloads and plays the %s assignment on the %s slate', (pos, era, year, gain, unchanged, title, unit, games, cap) => {
    const c = career(pos, era, year);
    install(c);
    const original = open();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    fireEvent.click(original.getByRole('button', { name: 'Play the ' + c.year + ' season' }));
    const usual = read().seasons.at(-1)!;
    expect(usual.games).toBe(games);
    expect(usual[gain]).toBeLessThan(cap);
    original.unmount();

    const raw = install(c);
    const first = open();
    fireEvent.click(first.getByRole('button', { name: 'Plan your season' }));
    expect(screen.getByText(/A guard averaging 20.0 points and 1.5 steals/)).toBeVisible();
    expect(localStorage.getItem(sport.saveKey)).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try a plan' }));
    fireEvent.click(screen.getByRole('button', { name: /Tactical approach/ }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }));
    expect(localStorage.getItem(sport.saveKey)).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: 'Discard preview' }));
    fireEvent.click(screen.getByRole('button', { name: /Tactical approach/ }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }));
    expect(read().programme).toMatchObject({ tactics: 'defend', sport: 'nba', year: c.year, team: c.team });
    const saved = localStorage.getItem(sport.saveKey);
    first.unmount();

    const loaded = open();
    fireEvent.click(loaded.getByRole('button', { name: 'Plan your season' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' }));
    fireEvent.click(screen.getByRole('button', { name: /Tactical approach/ }));
    expect(screen.getByRole('button', { name: new RegExp(title) })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Scoring focus/ })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(document.querySelector('[data-us-programme-close]')!);
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    fireEvent.click(loaded.getByRole('button', { name: 'Play the ' + c.year + ' season' }));

    const after = read(), line = after.seasons.at(-1)!;
    expect(line).toMatchObject({ games, ppg: tenth(usual.ppg * 0.92), [unchanged]: usual[unchanged], teamResult: usual.teamResult, mpg: usual.mpg, rpg: usual.rpg, apg: usual.apg });
    expect(line[gain]).toBeGreaterThan(usual[gain]!);
    expect(after.programme).toBeUndefined();
    expect(after.archetype).toEqual(c.archetype);
    expect(after.programmeResults).toMatchObject([{ year: c.year, team: c.team, decisions: [{ section: 'tactics', label: title, outcome: 'completed', actual: line[gain], unit }] }]);
    expect(within(loaded.container.querySelector('[data-season-reveal]')!).getByText(new RegExp(title + '.*' + line[gain]!.toFixed(1)))).toBeInTheDocument();
    loaded.unmount();
    render(<UsCareerProgramme career={read()} sport="nba" onChange={vi.fn()} />);
    expect(screen.getByText(`${title}: completed (${line[gain]!.toFixed(1)} ${unit}).`)).toBeVisible();
  });

  it.each([['PG', 'now', undefined, 'spg', 3], ['C', 'y2004', 2011, 'bpg', 4]] as const)('makes an actionable %s trade on paired draws', (pos, era, year, key, cap) => {
    const c = career(pos, era, year);
    const otherStat = key === 'spg' ? 'bpg' : 'spg';
    let active = 0, withPlayoffs = 0, newDefensiveSelections = 0;
    for (let seed = 0; seed < 200; seed++) {
      const { original, assigned } = playPair(c, pos + seed);
      const baseline = original.line[key]!;
      const expected = tenth(Math.min(cap, Math.max(baseline + 0.1, baseline * 1.20)));
      expect(assigned.line[key]).toBe(expected);
      expect(assigned.line[otherStat]).toBe(original.line[otherStat]);
      expect(assigned.line.ppg).toBe(expected > baseline ? tenth(original.line.ppg * 0.92) : original.line.ppg);
      expect(unaffected(assigned.line)).toEqual(unaffected(original.line));
      expect(assigned.draws).toBe(original.draws);
      expect(assigned.line.awards.includes('Finals MVP')).toBe(original.line.awards.includes('Finals MVP'));
      expect(assigned.line.allDefensiveTeam ?? 3).toBeLessThanOrEqual(original.line.allDefensiveTeam ?? 3);
      if (expected > baseline) active++;
      if (original.line.poGames) withPlayoffs++;
      if (assigned.line.allDefensiveTeam && !original.line.allDefensiveTeam) newDefensiveSelections++;
    }
    expect(active).toBeGreaterThan(150);
    expect(withPlayoffs).toBeGreaterThan(100);
    expect(newDefensiveSelections).toBeGreaterThan(0);
  });

  it('leaves scoring intact at the steals cap and gives a low-minute blocker a visible increase', () => {
    const cappedCareer = career('PG');
    cappedCareer.archetype = NBA_ARCHETYPES.PG[2];
    cappedCareer.ovr = cappedCareer.pot = 99;
    cappedCareer.morale = 100;
    const lowMinutes = { ...career('C'), ovr: 62, pot: 62, role: 'backup' as const, morale: 50 };
    let capped = false, rounded = false;
    for (let seed = 0; seed < 40 && !(capped && rounded); seed++) {
      if (!capped) {
        const { original, assigned } = playPair(cappedCareer, 'cap' + seed, 100);
        if (original.line.spg === 3) {
          expect(assigned.line).toEqual(original.line);
          expect(assigned.notes).toContain('🛡️ Pressure the ball had no scoring cost. You were already at the 3.0 steals per game cap.');
          expect(assigned.input.programmeResults?.at(-1)?.decisions).toEqual([
            { section: 'tactics', label: 'Pressure the ball', outcome: 'unused' },
          ]);
          capped = true;
        }
      }
      if (!rounded) {
        const { original, assigned } = playPair(lowMinutes, 'rounding' + seed);
        const baseline = original.line.bpg!;
        if (tenth(baseline * 1.2) === baseline) {
          expect(assigned.line.bpg).toBe(tenth(baseline + 0.1));
          expect(assigned.line.ppg).toBeLessThan(original.line.ppg);
          rounded = true;
        }
      }
    }
    expect(capped).toBe(true);
    expect(rounded).toBe(true);
  });

  it('keeps this NBA role choice away from the other sports and rejects stale plans', () => {
    const c = career('PF');
    for (const pos of ['PG', 'SG', 'SF', 'PF', 'C']) {
      const choices = usProgrammeMenus({ ...c, pos }, 'nba').find(menu => menu.id === 'tactics')!.options;
      expect(choices.map(choice => choice.id)).toEqual(['normal', 'attack', 'support', 'defend', 'second-unit', 'late-shot', 'late-pass', 'playoff-minutes']);
      expect(choices.find(choice => choice.id === 'defend')?.label).toBe(['PF', 'C'].includes(pos) ? 'Protect the rim' : 'Pressure the ball');
    }
    for (const slug of ['nfl', 'nhl', 'mlb'] as const) {
      expect(saveUsCareerProgramme(c, slug, defence())).toBe(c);
      expect(usProgrammeMenus(c, slug).find(menu => menu.id === 'tactics')!.options.map(choice => choice.id)).toEqual(['normal', 'attack', 'support']);
    }
    const planned = saveUsCareerProgramme(c, 'nba', defence());
    expect(planned.programme?.tactics).toBe('defend');
    expect(prepareUsCareerProgramme({ ...planned, team: 'different team' }, 'nba')).toBeNull();
    expect(prepareUsCareerProgramme({ ...planned, year: c.year + 1 }, 'nba')).toBeNull();
    expect(prepareUsCareerProgramme({ ...planned, suspendedSeasons: 1 }, 'nba')).toBeNull();
  });
});

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import { keyedRng } from '@/lib/keyedRng';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { simNbaSeason, type NbaCareerState, type NbaSeasonLine } from '@/lib/nbaMyCareer';
import { nbaSeasonReview } from '@/lib/usCareerSeasonReview';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, type ProgrammeCareer } from '@/lib/usCareerProgramme';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = NbaCareerState & ProgrammeCareer;
const sport = NBA_CAREER_SPORT;
const label = 'Take extra playoff minutes';
const open = () => render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
const read = (): Career => JSON.parse(localStorage.getItem(sport.saveKey)!).c;
const book = (c: Career) => saveUsCareerProgramme(c, 'nba', { ...usProgrammeDefaults(), tactics: 'playoff-minutes' });

function starter(): Career {
  const c = sport.startCareer('Fixture Guard', 'PG', sport.create.archetypes.PG[0], keyedRng('playoff minutes'), null, 'now');
  for (let year = 0; year < 2; year++) {
    const { line } = simNbaSeason(c, 76, () => 0.99);
    sport.progress(c, () => 0.99, line.seasonRating);
  }
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter', ovr: 89, pot: 94, morale: 80, health: 90, contractYears: 3 };
}

function play(c: Career, quality = 86, random: () => number = () => 0.25) {
  let draws = 0;
  const rng = () => { draws++; return random(); };
  const prep = prepareUsCareerProgramme(c, 'nba');
  const { line, notes } = simNbaSeason(c, quality, rng, true, prep);
  restoreUsCareerProgramme(c, prep);
  sport.progress(c, rng, line.seasonRating);
  const receipt = settleUsCareerProgramme(c, line, 'nba', prep);
  return { c, line, notes, draws, prep, receipt };
}

function regularAndBracket(line: NbaSeasonLine) {
  const { poPpg, poRpg, poApg, poMpg, poSpg, poBpg, awards, ...regular } = line;
  return { ...regular, awards: awards.filter(award => award !== 'Finals MVP') };
}

function openTactics() {
  fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
  const dialog = within(screen.getByRole('dialog', { name: 'NBA season programme' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Continue to programme' }));
  fireEvent.click(dialog.getByRole('button', { name: /Tactical approach/ }));
  return dialog;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NBA career extra playoff minutes', () => {
  it('adds personal playoff production without changing the bracket or draws and charges 4 health once', () => {
    const c = starter();
    const usual = play(structuredClone(c));
    const extra = play(book(structuredClone(c)));

    expect(usual.line.teamResult).toBe('WON THE NBA FINALS');
    expect(extra.line.poMpg).toBeGreaterThan(0);
    expect(extra.line.poPpg).toBeGreaterThan(usual.line.poPpg!);
    expect(extra.line.poApg).toBeGreaterThan(usual.line.poApg!);
    expect(regularAndBracket(extra.line)).toEqual(regularAndBracket(usual.line));
    expect(extra.draws).toBe(usual.draws);
    expect(extra.c.rings).toBe(usual.c.rings);
    expect(extra.c.health).toBe(usual.c.health - 4);
    expect(extra.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'completed', actual: 3, unit: 'extra minutes per playoff game' }]);
    expect(nbaSeasonReview(extra.line).postseason).toContainEqual(expect.objectContaining({ label: 'Minutes per game', numeric: { raw: extra.line.poMpg, digits: 1 } }));
    expect(extra.line.poMpg).toBeGreaterThan(usual.line.poMpg!);
    expect(nbaSeasonReview(usual.line).postseason).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Team games', value: String(usual.line.poGames) }),
      expect.objectContaining({ label: 'Minutes per game', value: usual.line.poMpg!.toFixed(1) }),
      expect.objectContaining({ label: 'Steals per game', value: usual.line.poSpg!.toFixed(1) }),
      expect.objectContaining({ label: 'Blocks per game', value: usual.line.poBpg!.toFixed(1) }),
    ]));

    const settled = JSON.stringify(extra.c);
    expect(settleUsCareerProgramme(extra.c, extra.line, 'nba', extra.prep)).toBeNull();
    expect(JSON.stringify(extra.c)).toBe(settled);
  });

  it('keeps recorded zeroes and never fills in an older season from a newer one', () => {
    const { line } = play(starter());
    const regular = nbaSeasonReview({ ...line, spg: 0, bpg: 0, benchAppearances: 5 }).regular;
    expect(regular.filter(stat => stat.label === 'Minutes per game')).toHaveLength(1);
    expect(regular).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Team record', value: `${line.clubWins} wins, ${line.clubLosses} losses` }),
      expect.objectContaining({ label: 'Steals per game', value: '0.0' }),
      expect.objectContaining({ label: 'Blocks per game', value: '0.0' }),
    ]));
    const legacy = nbaSeasonReview({ ...line, mpg: undefined, spg: undefined, bpg: undefined, clubLosses: undefined,
      poMpg: undefined, poSpg: undefined, poBpg: undefined });
    expect(legacy.regular.map(stat => stat.label)).toEqual(['Points per game', 'Rebounds per game', 'Assists per game']);
    expect(legacy.postseason.map(stat => stat.label)).toEqual(['Team games', 'Points per game', 'Rebounds per game', 'Assists per game']);
    const missed = play(starter(), 40, () => 0.99).line;
    expect(missed.teamResult).toBe('Missed the playoffs');
    expect(missed.poMpg).toBeUndefined();
    expect(nbaSeasonReview(missed).postseason).toEqual([{ label: 'Postseason', value: 'Your team missed the playoffs' }]);
  });

  it('can cost games in the next season on the same injury draw', () => {
    const c = starter();
    const usual = play(structuredClone(c));
    const extra = play(book(structuredClone(c)));
    const injuryRoll = (1 - c.archetype.durability) * 0.5 + (100 - usual.c.health + 2) / 240;
    const nextSeason = (input: Career) => {
      let draws = 0;
      return simNbaSeason(input, 86, () => draws++ === 0 ? injuryRoll : 0.99).line;
    };
    expect(nextSeason(usual.c).games).toBe(82);
    expect(nextSeason(extra.c).games).toBeLessThan(82);
  });

  it.each(['missed playoffs', 'second unit', 'minute cap', 'insufficient health'] as const)('records unused and charges nothing for %s', reason => {
    const c = starter();
    if (reason === 'minute cap') Object.assign(c, { ovr: 99, pot: 99, morale: 100 });
    if (reason === 'insufficient health') c.health = 3;
    const planned = book(structuredClone(c));
    if (reason === 'second unit') c.role = planned.role = 'backup';
    const random = () => {
      let draw = 0;
      return () => {
        const index = draw++;
        // The elite fixture gets the playoff berth, then plays close to the usual minutes ceiling.
        if (reason === 'minute cap') return index === 12 ? 0.2 : 0.99;
        if (reason === 'missed playoffs' || (reason === 'insufficient health' && index === 0)) return 0.99;
        return 0.25;
      };
    };
    const usual = play(c, 86, random());
    const extra = play(planned, 86, random());
    expect(Boolean(usual.line.poGames)).toBe(reason !== 'missed playoffs');
    expect(extra.line).toEqual(usual.line);
    expect(extra.c.health).toBe(usual.c.health);
    expect(extra.draws).toBe(usual.draws);
    expect(extra.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'unused' }]);
    expect(extra.notes).toContain('🏀 Extra playoff minutes went unused. No health cost.');
  });

  it('offers the choice to signed NBA starters with prior games only', () => {
    const c = starter();
    expect(book(c).programme?.tactics).toBe('playoff-minutes');
    for (const excluded of [{ ...c, role: 'backup' as const }, { ...c, contractYears: 0 }, { ...c, seasons: [] }, { ...c, suspendedSeasons: 1 }]) {
      expect(book(excluded)).toBe(excluded);
    }
    for (const other of ['nfl', 'mlb', 'nhl'] as const) {
      expect(saveUsCareerProgramme(c, other, { ...usProgrammeDefaults(), tactics: 'playoff-minutes' })).toBe(c);
    }
  });

  it('saves the choice, reloads the board, and shows one settled outcome after playing', () => {
    const c = starter();
    const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 86, coach: null });
    localStorage.setItem(sport.saveKey, bytes);
    const first = open();
    const choice = openTactics().getByRole('button', { name: new RegExp(label) });
    expect(choice).toHaveTextContent(/signed starters.*played a season.*42.*4 health/i);
    fireEvent.click(choice);
    expect(read().programme).toMatchObject({ year: c.year, team: c.team, tactics: 'playoff-minutes' });
    const savedSelection = localStorage.getItem(sport.saveKey);
    first.unmount();

    const reloaded = open();
    expect(openTactics().getByRole('button', { name: new RegExp(label) })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(document.querySelector('[data-us-programme-close]')!);
    expect(localStorage.getItem(sport.saveKey)).toBe(savedSelection);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    fireEvent.click(screen.getByRole('button', { name: `Play the ${c.year} season` }));

    expect(read().health).toBe(c.health - 4);
    expect(read().programme).toBeUndefined();
    expect(read().programmeResults).toHaveLength(1);
    expect(read().seasons.at(-1)?.poMpg).toBeGreaterThan(0);
    expect(within(reloaded.container.querySelector('[data-season-reveal]')!).getByText(/extra playoff minutes.*4 health/i)).toBeInTheDocument();
    const settled = localStorage.getItem(sport.saveKey);
    reloaded.unmount();

    open().unmount();
    expect(localStorage.getItem(sport.saveKey)).toBe(settled);
    render(<UsCareerProgramme career={read()} sport="nba" onChange={vi.fn()} />);
    expect(screen.getByText(`${label}: completed (3.0 extra minutes per playoff game).`)).toBeVisible();
  });
});

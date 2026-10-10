/**
 * Release AU fix pass, ruling R1: a US season plan card states what the season
 * will really get, a plan whose whole gain is cut by a cap is not charged, and
 * a paid bonus is banked at the precision the four engines keep the bank in.
 *
 * Everything here goes through the plan's public calls only (the menus a
 * player reads, prepare, restore, settle) and the sport's own season calls, so
 * it holds whatever the library looks like inside. It lives in a file of its
 * own because the other lane's checker counts the cases of its own two files.
 */
import { describe, expect, it } from 'vitest';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import {
  prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme,
  usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer, type ProgrammeChoices, type ProgrammeSection,
} from '@/lib/usCareerProgramme';

const sports: UsCareerSport[] = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];
const copy = <T,>(v: T): T => structuredClone(v);
const r2 = (n: number) => Math.round(n * 100) / 100;
type Host = ProgrammeCareer & { archetype?: Record<string, number> };
interface Inputs { health: number; morale: number; durability: number; pos?: string; salary?: number }

function career<C extends UsCareerCore>(sport: UsCareerSport<C>, at: Inputs): Host {
  const pos = at.pos ?? sport.create.defaultPos;
  const c = sport.startCareer('Generated Card Test', pos, sport.create.archetypes[pos][0], () => 0.5, null, sport.create.eras[0].id) as unknown as Host;
  c.age = 31; c.health = at.health; c.morale = at.morale; c.salary = at.salary ?? 5; c.contractYears = 4; c.role = 'starter'; c.netWorth = 2;
  if (c.archetype) c.archetype = { ...c.archetype, durability: at.durability };
  return c;
}
const plan = (c: Host, sport: UsCareerSport, changes: Partial<ProgrammeChoices>) => saveUsCareerProgramme(c, sport.slug, { ...usProgrammeDefaults(), ...changes }) as Host;
const card = (c: Host, sport: UsCareerSport, section: ProgrammeSection, choice: string) =>
  usProgrammeMenus(c, sport.slug).find(m => m.id === section)?.options.find(o => o.id === choice)?.effect ?? '';
/** The signed number a card prints after a word ("health +8"), or 0 when the card does not name it. */
const printed = (text: string, word: string) => { const m = new RegExp(word + ' ([+-]\\d+(?:\\.\\d+)?)').exec(text); return m ? Number(m[1]) : 0; };
/** What the card says the SEASON gets: the reward a veteran plan pays after the season is not a season input. */
const seasonPart = (text: string) => text.split('After a season')[0];

const TRADES: [ProgrammeSection, string][] = [['workload', 'push'], ['workload', 'recover'], ['tactics', 'attack'], ['tactics', 'support'], ['reinvention', 'maintain']];
const GRID: Inputs[] = [];
for (const health of [100, 97, 80, 3]) for (const morale of [100, 97, 70, 2]) for (const durability of [1, 0.95, 0.8, 0.42]) GRID.push({ health, morale, durability });

describe.each(sports)('$label season plan cards', sport => {
  const positions = sport.slug === 'nhl' ? [sport.create.defaultPos, 'G'] : [sport.create.defaultPos];
  it('each card states the season inputs the season really gets, on every input a career can hold', () => {
    let read = 0;
    for (const pos of positions) for (const at of GRID) for (const [section, choice] of TRADES) {
      const c = plan(career(sport, { ...at, pos }), sport, { [section]: choice });
      const text = seasonPart(card(c, sport, section, choice));
      /* The NBA and an NHL skater trade one output for another through multipliers that no cap cuts. */
      if (section === 'tactics' && !/durability|Nothing to add/i.test(text)) continue;
      const prepared = prepareUsCareerProgramme(c, sport.slug);
      const got = { health: c.health - at.health, morale: c.morale - at.morale, durability: r2((c.archetype?.durability ?? at.durability) - at.durability) };
      const said = { health: printed(text, 'health'), morale: printed(text, 'morale'), durability: printed(text, 'durability') };
      expect({ pos, at, section, choice, text, ...said }).toEqual({ pos, at, section, choice, text, ...got });
      restoreUsCareerProgramme(c, prepared);
      expect([c.health, c.morale, c.archetype?.durability ?? at.durability]).toEqual([at.health, at.morale, at.durability]);
      read += 1;
    }
    expect(read).toBeGreaterThan(sport.slug === 'nba' ? 150 : 250);
  });
  it('a plan whose whole gain a cap cuts away says so and is not charged', () => {
    const cases: [Inputs, ProgrammeSection, string][] = [
      [{ health: 100, morale: 70, durability: 0.8 }, 'workload', 'recover'],
      [{ health: 80, morale: 100, durability: 0.8 }, 'workload', 'push'],
    ];
    if (sport.slug === 'nfl' || sport.slug === 'mlb') cases.push([{ health: 80, morale: 70, durability: 1 }, 'tactics', 'support'], [{ health: 80, morale: 100, durability: 0.8 }, 'tactics', 'attack']);
    for (const [at, section, choice] of cases) {
      const c = plan(career(sport, at), sport, { [section]: choice });
      expect(card(c, sport, section, choice)).toMatch(/Nothing to add/);
      expect(card(c, sport, section, choice)).toMatch(/costs nothing/);
      const prepared = prepareUsCareerProgramme(c, sport.slug);
      expect({ section, choice, health: c.health, morale: c.morale, durability: c.archetype?.durability }).toEqual({ section, choice, health: at.health, morale: at.morale, durability: c.archetype ? at.durability : undefined });
      const row: UsCareerSeason = { year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: sport.slug === 'nfl' ? 17 : sport.slug === 'mlb' ? 162 : 82, awards: [], teamResult: 'Recorded test season', salary: c.salary };
      c.seasons.push(row); restoreUsCareerProgramme(c, prepared);
      const result = settleUsCareerProgramme(c, row, sport.slug, prepared);
      expect(result?.decisions.find(d => d.section === section)?.outcome).toBe('unused');
    }
  });
  it('a paid bonus is banked in the bank\'s own unit: a season later the bank holds exactly the share the card printed', () => {
    const extra = sport.slug === 'nfl' ? { passTd: 60 } : sport.slug === 'nba' ? { apg: 20 } : sport.slug === 'mlb' ? { hr: 70 } : { assists: 120, goals: 80 };
    let paid = 0;
    for (const salary of [0.9, 2.5, 5, 12, 30]) for (const bonus of ['steady', 'stretch'] as const) {
      const c = plan(career(sport, { health: 80, morale: 70, durability: 0.8, salary }), sport, { bonus });
      const text = card(c, sport, 'bonus', bonus);
      const row = { year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: sport.slug === 'nfl' ? 17 : sport.slug === 'mlb' ? 162 : 82, awards: [], teamResult: 'Recorded test season', salary, ...extra } as UsCareerSeason;
      c.seasons.push(row);
      const result = settleUsCareerProgramme(c, row, sport.slug);
      expect(result?.bonusGross).toBeCloseTo(salary * (bonus === 'stretch' ? 0.05 : 0.02), 4);
      const banked = result!.bonusNet;
      if (banked > 0) { expect(text).toContain('$' + banked.toFixed(1) + 'M of it reaches the bank'); paid += 1; }
      else expect(text).toMatch(/none of it reaches the bank/);
      /* The twin never got the bonus. Both play one more season on one stream; the engine rounds the bank as it always has. */
      const twin = copy(c); twin.netWorth = Math.round(((twin.netWorth ?? 0) - banked) * 10000) / 10000; twin.earnings -= result!.bonusGross;
      for (const one of [c, twin]) {
        let n = 20261010; const rng = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
        one.year += 1; sport.campBattle(one as never, 75, rng); sport.simSeason(one as never, 75, rng); sport.progress(one as never, rng);
      }
      expect({ salary, bonus, kept: Math.round(((c.netWorth ?? 0) - (twin.netWorth ?? 0)) * 10000) / 10000 }).toEqual({ salary, bonus, kept: banked });
    }
    expect(paid).toBeGreaterThanOrEqual(4);
  });
});

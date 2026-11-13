import type { Position } from '@/types/game';
import { ALL_POSITIONS, FIT_PENALTY, gradeFit } from '@/lib/positionFit';
import {
  FORMATIONS, homelandEngineName, nationalCampaignThisSummer, nationalSummerAvailable,
  nationLift, refreshWorldRoster, worldRosterFor, worldSeedOf, worldYear, yearsOn,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, NationJob } from '@/lib/clubManager';
import { eraRostersLoaded, projectedWorldFor } from '@/lib/clubManagerEras';
import { readWorldRoster, worldRosterView } from '@/lib/clubManagerWorldRoster';
import { nationalityOf } from '@/data/playerNationalities';
import {
  managerCampaignDraw, managerCampaignField, managerCampaignScore, managerCampaignSort,
  NATION_CONFED, nationStrength, tournamentForYear,
} from '@/lib/soccerInternational';
import type { IntlTableRow, TournamentFormat } from '@/lib/soccerInternational';

export interface NationalCandidate {
  key: string; name: string; position: Position; secondaryPositions?: Position[];
  rating: number; age: number; nation: string;
  source: 'modeled' | 'owned' | 'loan' | 'released'; employer: string | null;
}
export interface NationalFixture {
  id: string; home: string; away: string; round: string;
  homeGoals: number | null; awayGoals: number | null; pens: boolean; winner: string | null;
}
export interface NationalPlayed extends NationalFixture { xiStrength: number; }
export interface NationalCampaign {
  version: 1; nation: string; year: number; eraId: string; revision: number;
  squadKeys: string[]; selected: NationalCandidate[]; xiKeys: string[]; formationIndex: number;
  format: TournamentFormat; stage: 'qualifying' | 'groups' | 'knockout' | 'complete';
  groups: string[][]; tables: IntlTableRow[][]; through: number; automatic: boolean;
  schedule: NationalFixture[]; cursor: number; knockout: string[]; knockoutRound: number;
  next: NationalFixture | null; results: NationalPlayed[]; complete: boolean; settled: boolean;
  result: string | null; rngState: number;
}
const rounds = ['R32', 'R16', 'QF', 'SF', 'F'] as const;
const exits = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Runner-up'];
function hash(value: string): number {
  let n = 2166136261;
  for (let i = 0; i < value.length; i++) n = Math.imul(n ^ value.charCodeAt(i), 16777619);
  return n >>> 0;
}
function stream(state: NationalCampaign): () => number {
  return () => {
    state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
    let n = state.rngState;
    n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled<T>(values: T[], rng: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function rows(group: string[]): IntlTableRow[] {
  return group.map(nation => ({ nation, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));
}
function schedule(state: NationalCampaign, groups: string[][], twice: boolean): NationalFixture[] {
  const out: NationalFixture[] = [];
  groups.forEach((group, g) => {
    group.forEach((home, i) => group.forEach((away, j) => {
      if (i === j || !twice && j < i) return;
      out.push({ id: state.year + ':' + state.nation + ':' + state.stage + ':' + g + ':' + i + ':' + j,
        home, away, round: state.stage === 'qualifying' ? 'Qualifying' : 'Group ' + String.fromCharCode(65 + g),
        homeGoals: null, awayGoals: null, pens: false, winner: null });
    }));
  });
  return out;
}
function apply(table: IntlTableRow[], fixture: NationalFixture): void {
  const a = table.find(row => row.nation === fixture.home), b = table.find(row => row.nation === fixture.away);
  if (!a || !b || fixture.homeGoals === null || fixture.awayGoals === null) return;
  a.played++; b.played++; a.gf += fixture.homeGoals; a.ga += fixture.awayGoals;
  b.gf += fixture.awayGoals; b.ga += fixture.homeGoals;
  if (fixture.homeGoals > fixture.awayGoals) { a.won++; a.points += 3; b.lost++; }
  else if (fixture.homeGoals < fixture.awayGoals) { b.won++; b.points += 3; a.lost++; }
  else { a.drawn++; b.drawn++; a.points++; b.points++; }
}
function finish(state: NationalCampaign, result: string): void {
  state.stage = 'complete'; state.complete = true; state.result = result; state.next = null;
}
function knockoutSchedule(state: NationalCampaign): void {
  state.schedule = [];
  for (let i = 0; i + 1 < state.knockout.length; i += 2) {
    state.schedule.push({
      id: state.year + ':' + state.nation + ':knockout:' + rounds[state.knockoutRound] + ':' + i / 2,
      home: state.knockout[i], away: state.knockout[i + 1], round: rounds[state.knockoutRound],
      homeGoals: null, awayGoals: null, pens: false, winner: null,
    });
  }
  state.cursor = 0;
}
function transition(state: NationalCampaign, rng: () => number): void {
  if (state.stage === 'qualifying') {
    const table = managerCampaignSort(state.tables[0]);
    const position = table.findIndex(row => row.nation === state.nation) + 1;
    if (!state.automatic && (position < 1 || position > state.through)) { finish(state, 'Did Not Qualify'); return; }
    const field = managerCampaignField(state.nation, state.format, rng);
    const seeded = [...field].sort((a, b) => nationStrength(b) - nationStrength(a));
    const pots = Array.from({ length: 4 }, (_, i) => shuffled(seeded.slice(i * state.format.groups, (i + 1) * state.format.groups), rng));
    state.stage = 'groups';
    state.groups = Array.from({ length: state.format.groups }, (_, i) => pots.map(pot => pot[i]).filter(Boolean));
    state.tables = state.groups.map(rows); state.schedule = schedule(state, state.groups, false); state.cursor = 0;
    return;
  }
  if (state.stage === 'groups') {
    const tables = state.tables.map(managerCampaignSort);
    const through = tables.flatMap(table => table.slice(0, 2).map(row => row.nation));
    const thirds = tables.map(table => table[2]).filter(Boolean).sort((a, b) =>
      b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
    through.push(...thirds.slice(0, state.format.thirdsThrough).map(row => row.nation));
    if (!through.includes(state.nation)) { finish(state, 'Group Stage'); return; }
    const first = state.format.firstRound ?? (through.length >= 32 ? 'R32' : through.length >= 16 ? 'R16' : through.length >= 8 ? 'QF' : 'SF');
    state.stage = 'knockout'; state.knockoutRound = rounds.indexOf(first);
    state.knockout = shuffled(through, rng).slice(0, 2 ** (rounds.length - state.knockoutRound));
    knockoutSchedule(state); return;
  }
  if (state.stage === 'knockout') {
    const own = state.schedule.find(fixture => fixture.home === state.nation || fixture.away === state.nation);
    if (!own || own.winner !== state.nation) { finish(state, exits[state.knockoutRound]); return; }
    state.knockout = state.schedule.map(fixture => fixture.winner!).filter(Boolean);
    if (state.knockout.length === 1) { finish(state, 'Winner'); return; }
    state.knockoutRound++; knockoutSchedule(state);
  }
}
function resolve(state: NationalCampaign, fixture: NationalFixture, strength: number, rng: () => number): void {
  const result = managerCampaignScore(
    fixture.home === state.nation ? strength : nationStrength(fixture.home),
    fixture.away === state.nation ? strength : nationStrength(fixture.away),
    state.stage === 'knockout', rng, state.stage === 'qualifying',
  );
  fixture.homeGoals = result.a; fixture.awayGoals = result.b; fixture.pens = result.pens;
  fixture.winner = result.a === result.b && !result.pens ? null : result.aWins ? fixture.home : fixture.away;
  if (state.stage !== 'knockout') {
    const group = state.groups.findIndex(group => group.includes(fixture.home));
    apply(state.tables[group], fixture);
  }
}
function prepareNext(state: NationalCampaign, rng: () => number): void {
  for (let guard = 0; guard < 400 && !state.complete; guard++) {
    const fixture = state.schedule[state.cursor];
    if (!fixture) { transition(state, rng); continue; }
    if (fixture.home === state.nation || fixture.away === state.nation) { state.next = { ...fixture }; return; }
    resolve(state, fixture, 0, rng); state.cursor++;
  }
  if (!state.complete) throw new Error('National campaign did not reach its next fixture');
}
export function beginCampaign(nation: string, year: number, eraId: string, seed: number): NationalCampaign | null {
  if (!NATION_CONFED[nation]) return null;
  const format = tournamentForYear(nation, year);
  if (!format) return null;
  const state: NationalCampaign = {
    version: 1, nation, year, eraId, revision: 0, squadKeys: [], selected: [], xiKeys: [], formationIndex: 0,
    format: JSON.parse(JSON.stringify(format)) as TournamentFormat, stage: 'qualifying', groups: [], tables: [], through: 0, automatic: false,
    schedule: [], cursor: 0, knockout: [], knockoutRound: 0, next: null, results: [],
    complete: false, settled: false, result: null, rngState: hash(eraId + '|' + seed + '|' + nation + '|' + year),
  };
  const rng = stream(state), draw = managerCampaignDraw(nation, format, rng);
  state.groups = [draw.group]; state.tables = [rows(draw.group)];
  state.through = draw.through; state.automatic = draw.automatic;
  if (draw.automatic) { state.cursor = 0; transition(state, rng); }
  else state.schedule = schedule(state, state.groups, true);
  prepareNext(state, rng);
  return state;
}
export function playCampaignFixture(state: NationalCampaign, strength: number): NationalCampaign {
  const next: NationalCampaign = JSON.parse(JSON.stringify(state));
  const rng = stream(next), fixture = next.schedule[next.cursor];
  if (!fixture || fixture.id !== next.next?.id || next.complete) return state;
  resolve(next, fixture, strength, rng);
  next.results.push({ ...fixture, xiStrength: strength }); next.cursor++; next.revision++;
  prepareNext(next, rng); return next;
}
/** A tracked, source-limited simulated pool. Raw untracked trajectory discoveries are not eligible. */
export function nationalCoachView(career: CareerState): {
  year: number; nation: string; players: NationalCandidate[]; unknown: number; campaign: NationalCampaign | null; canPlay: boolean; hasXI: boolean;
} | null {
  const job = career.nationJob;
  if (!job || !nationalSummerAvailable(career) || !eraRostersLoaded(career.eraId)) return null;
  const year = worldYear(career), era = career.eraId ?? 'now';
  const campaign = nationalCampaignThisSummer(career);
  const saved = readWorldRoster(career);
  if (career.worldRoster !== undefined && !saved) return { year, nation: job.nation, players: [], unknown: 0, campaign, canPlay: false, hasXI: false };
  const current = refreshWorldRoster(career), ledger = worldRosterView(current);
  const records = [...(saved?.records ?? []), ...(ledger?.records ?? [])];
  const blockedKeys = new Set(records.filter(row => row.status === 'retired').map(row => row.key));
  const blockedNames = new Set(current.retiredNames ?? []);
  const all = new Map<string, NationalCandidate>();
  const anchors = new Map<string, Set<string>>();
  let unknown = 0;
  const nationOf = (name: string, generated: boolean, nation?: string): string | undefined => {
    const raw = generated ? nation : nationalityOf(era, name);
    return raw ? homelandEngineName(raw) ?? raw : undefined;
  };
  const add = (key: string, p: { name: string; position: Position; secondaryPositions?: Position[]; rating: number; age: number;
    generated?: boolean; nation?: string; injuryWeeks?: number }, source: NationalCandidate['source'], employer: string | null): void => {
    all.delete(key);
    if (blockedKeys.has(key) || blockedNames.has(p.name)) return;
    const nation = nationOf(p.name, p.generated === true, p.nation);
    if (!nation) { unknown++; return; }
    if (nation !== job.nation || (p.injuryWeeks ?? 0) > 0 || !ALL_POSITIONS.includes(p.position)) return;
    all.set(key, { key, name: p.name, position: p.position, secondaryPositions: p.secondaryPositions ? [...p.secondaryPositions] : undefined,
      rating: p.rating, age: p.age, nation, source, employer });
  };
  for (const club of Object.keys(projectedWorldFor(era, yearsOn(current), worldSeedOf(current)))) {
    for (const p of worldRosterFor(current, club)) {
      const key = p.worldRosterKey ?? JSON.stringify([era, club, p.n, p.p, year - p.a, p.since]);
      const anchor = JSON.stringify([p.n, year - p.a]);
      const keys = anchors.get(anchor) ?? new Set<string>(); keys.add(key); anchors.set(anchor, keys);
      add(key, { name: p.n, position: p.p, rating: p.r, age: p.a, generated: p.g === true, nation: p.nation }, 'modeled', club);
    }
  }
  for (const row of ledger?.records ?? []) {
    const p = row.player;
    if (row.status === 'retired') { all.delete(row.key); continue; }
    add(row.key, { ...p, generated: p.generated || p.academyGrad || p.isYouth }, row.status === 'released' ? 'released' : 'owned', row.owner);
  }
  const own = (p: CMPlayer, source: 'owned' | 'loan', employer: string): void => {
    const generated = p.generated || p.academyGrad || p.isYouth;
    const matches = anchors.get(JSON.stringify([p.name, year - p.age]));
    const key = p.worldRosterKey ?? (generated ? JSON.stringify(['generated', era, p.id])
      : matches?.size === 1 ? [...matches][0] : null);
    if (!key) { unknown++; return; }
    add(key, { ...p, generated }, source, employer);
  };
  current.squad.forEach(p => own(p, p.onLoan ? 'loan' : 'owned', current.clubName));
  (current.loanedOut ?? []).forEach(loan => own(loan.player, 'loan', loan.club));
  const players = [...all.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
  const view = { year, nation: job.nation, players, unknown, campaign,
    hasXI: players.some(p => p.position === 'GK') && players.filter(p => p.position !== 'GK').length >= 10 };
  return { ...view, canPlay: canPlayNationalView(view) };
}
export function beginNationalCampaign(career: CareerState): CareerState {
  const view = nationalCoachView(career);
  if (!view?.hasXI || view.campaign || career.nationJob?.lastYear === view.year) return career;
  const campaign = beginCampaign(view.nation, view.year, career.eraId ?? 'now', worldSeedOf(career) ?? 0);
  return campaign ? { ...career, nationJob: { ...career.nationJob!, campaign } } : career;
}

export function setNationalSquad(career: CareerState, keys: string[], revision: number): CareerState {
  const view = nationalCoachView(career), campaign = view?.campaign;
  if (!view || !campaign || campaign.complete || campaign.revision !== revision || keys.length > 23
    || new Set(keys).size !== keys.length) return career;
  const selected = keys.map(key => view.players.find(row => row.key === key)
    ?? campaign.selected.find(row => row.key === key));
  if (selected.some(row => !row)) return career;
  return { ...career, nationJob: { ...career.nationJob!, campaign: { ...campaign, revision: revision + 1,
    squadKeys: [...keys], selected: selected.map(row => ({ ...row! })),
    xiKeys: campaign.xiKeys.map(key => keys.includes(key) ? key : '') } } };
}
export function setNationalXi(career: CareerState, formationIndex: number, keys: string[], revision: number): CareerState {
  const view = nationalCoachView(career), campaign = view?.campaign, formation = FORMATIONS[formationIndex];
  const picked = keys.filter(Boolean);
  if (!view || !campaign || campaign.complete || campaign.revision !== revision || !Number.isInteger(formationIndex)
    || !formation || keys.length !== 11 || new Set(picked).size !== picked.length) return career;
  for (let i = 0; i < keys.length; i++) {
    if (!keys[i]) continue;
    const p = view.players.find(row => row.key === keys[i]);
    if (!campaign.squadKeys.includes(keys[i])) return career;
    if (!p) {
      if (campaign.xiKeys[i] !== keys[i] || campaign.formationIndex !== formationIndex) return career;
      continue;
    }
    if (formation.slots[i].allowed.includes('GK') !== (p.position === 'GK')) return career;
  }
  return { ...career, nationJob: { ...career.nationJob!, campaign: { ...campaign,
    formationIndex, xiKeys: [...keys], revision: revision + 1 } } };
}
function canPlayNationalView(view: { players: NationalCandidate[]; campaign: NationalCampaign | null } | null): boolean {
  const c = view?.campaign;
  if (!view || !c || c.complete || !c.next || c.xiKeys.length !== 11 || new Set(c.xiKeys).size !== 11) return false;
  const formation = FORMATIONS[c.formationIndex];
  return !!formation && c.xiKeys.every((key, i) => {
    const p = view.players.find(row => row.key === key);
    return !!p && c.squadKeys.includes(key) && formation.slots[i].allowed.includes('GK') === (p.position === 'GK');
  });
}
export function playNationalFixture(career: CareerState, fixtureId: string, revision: number): CareerState {
  const view = nationalCoachView(career), campaign = view?.campaign;
  if (!view || !campaign || campaign.revision !== revision || campaign.next?.id !== fixtureId || !view.canPlay) return career;
  const formation = FORMATIONS[campaign.formationIndex];
  const xi = campaign.xiKeys.map(key => view.players.find(p => p.key === key)!);
  const strength = Math.max(0, Math.min(99, xi.reduce((sum, p, i) => sum + p.rating
    - FIT_PENALTY[gradeFit([p.position, ...(p.secondaryPositions ?? [])], formation.slots[i].allowed)], 0) / 11
    + nationLift(career)));
  return saveNationalResult(career, playCampaignFixture(campaign, strength));
}

export function finishNationalCampaignAutomatically(career: CareerState, fixtureId: string, revision: number): CareerState {
  const view = nationalCoachView(career), campaign = view?.campaign;
  if (!view || view.hasXI || !campaign || campaign.complete || campaign.next?.id !== fixtureId || campaign.revision !== revision) return career;
  const strength = nationStrength(campaign.nation) + nationLift(career);
  let next = campaign;
  while (!next.complete) {
    const played = playCampaignFixture(next, strength);
    if (played === next) return career;
    next = played;
  }
  return saveNationalResult(career, next);
}

function saveNationalResult(career: CareerState, result: NationalCampaign): CareerState {
  let next = result;
  let job: NationJob = { ...career.nationJob!, campaign: next };
  let trophies = career.trophies, headlines = career.aiHeadlines;
  if (next.complete && !next.settled) {
    next = { ...next, settled: true };
    job = { ...job, campaign: next, played: job.played + 1, won: job.won + (next.result === 'Winner' ? 1 : 0),
      lastYear: next.year, lastResult: next.result };
    if (next.result === 'Winner') trophies = [...trophies, { season: career.season, name: next.format.name, emoji: '\u{1F310}' }];
    headlines = [job.nation + ': ' + next.result + ' in the simulated ' + next.year + ' ' + next.format.name + '.', ...headlines].slice(0, 8);
  }
  return { ...career, nationJob: job, trophies, aiHeadlines: headlines };
}


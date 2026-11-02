import { keyedRng } from '@/lib/keyedRng';

export type CarArea = 'power' | 'aero' | 'reliability';
export type Pace = 'conserve' | 'balanced' | 'push';
export type Compound = 'soft' | 'medium' | 'hard' | 'wet';
export type GrandPrixFocus = 'balanced' | 'pace' | 'consistency' | 'tyreCare' | 'wet';
export interface GrandPrixDriver {
  id: string; name: string; age: number; potential: number; focus: GrandPrixFocus;
  skills: { pace: number; consistency: number; tyreCare: number; wet: number };
  contract: null | { teamId: string; years: number; wagePerRace: number; startsSeason?: number };
}
export interface GrandPrixMarketOffer {
  outgoingDriverId: string; incomingDriverId: string; startsSeason: number; years: 1;
  wagePerRace: number; signingFee: number; buyout: number; totalFee: number; reserveAfter: number; affordable: boolean;
}
export interface GrandPrixNextSeasonPlan {
  nextSeason: number; sponsor: number;
  automaticRenewals: { driverId: string; wagePerRace: number; signingFee: number }[];
  totalRenewalFee: number; nextReserved: number; cashAfter: number; affordable: boolean;
  seatReplacements: { departingDriverId: string; rookie: GrandPrixDriver; signingFee: number }[];
  totalReplacementFee: number;
}
export interface GrandPrixSeasonSummary {
  season: number; rounds: number;
  driverChampion: { driverId: string; name: string; teamId: string; points: number; wins: number; podiums: number };
  constructorChampion: { teamId: string; name: string; points: number; wins: number; podiums: number };
  team: { teamId: string; name: string; position: number; points: number; wins: number; podiums: number;
    drivers: { driverId: string; name: string; points: number; wins: number; podiums: number; races: number; finishes: number }[] };
  races: { roundId: string; trackName: string; points: number; teamPrize: number; operatingCost: number;
    drivers: { driverId: string; name: string; position: number; status: 'finished' | 'retired'; points: number }[] }[];
  roundsBothDriversFinished: number; endCash: number; finalCar: Record<CarArea, number>;
}
export interface GrandPrixCareerTotals {
  archivedSeasons: number; driverTitles: number; constructorTitles: number; sinceSeason: number; earlierSeasonsUnknown: boolean;
}
export interface GrandPrixTeam { id: string; name: string; car: Record<CarArea, number>; baselineCar: Record<CarArea, number> }
export interface GrandPrixTrack {
  id: string; name: string; laps: number; entryCost: number;
  powerWeight: number; aeroWeight: number; rainChance: number;
}
export interface GrandPrixRaceEntry {
  driverId: string; teamId: string; elapsedMs: number; completedLaps: number;
  compound: Compound; pace: Pace; tyreWear: number; stops: number;
  status: 'running' | 'retired' | 'finished';
}
export interface GrandPrixClassification {
  driverId: string; teamId: string; position: number; status: 'finished' | 'retired'; points: number;
}
export interface GrandPrixRace {
  roundId: string; lap: number; weather: 'dry' | 'wet';
  grid: { driverId: string; teamId: string; timeMs: number }[];
  entries: GrandPrixRaceEntry[];
}
export interface GrandPrixRaceResult {
  roundId: string; classification: GrandPrixClassification[]; teamPrize: number; operatingCost: number;
}
export interface GrandPrixCareer {
  version: 1; worldKind: 'fictional'; careerId: string; seed: number; revision: number;
  season: number; round: number; phase: 'preRace' | 'grid' | 'race' | 'raceResult' | 'seasonReview';
  teamId: string; cash: number; reserved: number; upgradeCosts: Record<CarArea, number | null>;
  marketOffers: GrandPrixMarketOffer[]; nextSeasonPlan: GrandPrixNextSeasonPlan | null;
  history: GrandPrixSeasonSummary[]; careerTotals: GrandPrixCareerTotals;
  teams: GrandPrixTeam[]; drivers: GrandPrixDriver[]; calendar: GrandPrixTrack[];
  race: GrandPrixRace | null; results: GrandPrixRaceResult[];
  driverStandings: { driverId: string; points: number; wins: number; podiums: number }[];
  constructorStandings: { teamId: string; points: number; wins: number; podiums: number }[];
}
export interface GrandPrixSetup { driverId: string; pace: Pace; compound: Compound }
export interface GrandPrixOrder { driverId: string; pace: Pace; pitTo?: Compound }
export type GrandPrixAction = { expectedRevision: number } & (
  { type: 'upgrade'; area: CarArea } | { type: 'qualify' } |
  { type: 'startRace'; setups: GrandPrixSetup[] } | { type: 'raceInterval'; orders: GrandPrixOrder[] } |
  { type: 'continue' } | { type: 'signDriver'; outgoingDriverId: string; incomingDriverId: string } |
  { type: 'renewDriver'; driverId: string } | { type: 'startNextSeason' } |
  { type: 'setDriverFocus'; driverId: string; focus: GrandPrixFocus }
);
export type GrandPrixTransition = {
  ok: true; state: GrandPrixCareer;
  receipt: { type: string; revision: number; cost?: number; teamPrize?: number; operatingCost?: number; sponsor?: number; renewalFee?: number; replacementFee?: number; cashDelta?: number };
} | { ok: false; reason: 'stale' | 'phase' | 'funds' | 'invalid' };

const AREAS: CarArea[] = ['power', 'aero', 'reliability'];
const PACES: Pace[] = ['conserve', 'balanced', 'push'];
const TYRES: Compound[] = ['soft', 'medium', 'hard', 'wet'];
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const INTERVALS = [12, 26, 40];
const SKILLS = ['pace', 'consistency', 'tyreCare', 'wet'] as const;
const FOCUSES: GrandPrixFocus[] = ['balanced', ...SKILLS];
const CAR_CARRY = 0.7;
const AI_INVESTMENT = 2;
const TEAM_NAMES = ['Cobalt Crane', 'Ember Vale', 'Juniper Pulse', 'Northstar Loom', 'Copper Harbor', 'Quartz Arrow', 'Indigo Crest', 'Silver Finch', 'Redwood Rally', 'Saffron Wing'];
const FIRST_NAMES = ['Arin', 'Tavo', 'Esko', 'Lio', 'Bren', 'Ilan', 'Soren', 'Tevo', 'Ari', 'Miro', 'Eren', 'Vico', 'Jaro', 'Nilo', 'Oren', 'Eli', 'Ravi', 'Kato', 'Davi', 'Zeno', 'Tarin', 'Avo', 'Ruen', 'Kiro', 'Elan', 'Toma'];
const LAST_NAMES = ['Venn', 'Marr', 'Leto', 'Keld', 'Roe', 'Dalen', 'Neri', 'Selo', 'Fenn', 'Vora', 'Taren', 'Vahl', 'Mori', 'Renn', 'Kova', 'Daro', 'Lenn', 'Sava', 'Rilo', 'Kern', 'Navo', 'Senn', 'Karo', 'Vero', 'Lorn', 'Daroa'];
const TRACK_NAMES = ['Harbor Loop', 'Copper Ridge', 'Juniper Ring', 'Quartz Straight', 'Indigo Hills', 'Redwood Turns', 'Silver Coast', 'Ember Valley', 'Cobalt Park', 'Saffron Bend', 'Northstar Circuit', 'Finch Bay'];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= lo && value <= hi;
const finite = (value: unknown, lo: number, hi: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= lo && value <= hi;
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 120;
const unique = (values: string[]) => new Set(values).size === values.length;
const roll = (state: Pick<GrandPrixCareer, 'seed' | 'season' | 'round'>, key: string) => keyedRng(`grand-prix|${state.seed}|${state.season}|${state.round}|${key}`)();
const mine = (state: GrandPrixCareer) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const quotes = (state: GrandPrixCareer): Record<CarArea, number | null> => {
  const car = state.teams.find(team => team.id === state.teamId)!.car;
  const cost = (area: CarArea) => car[area] >= 100 ? null : 450_000 + Math.round(Math.pow(Math.max(0, car[area] - 40), 2) * 900);
  return { power: cost('power'), aero: cost('aero'), reliability: cost('reliability') };
};
function reserve(state: GrandPrixCareer): number {
  const held = new Set(state.results.map(result => result.roundId));
  const remaining = state.calendar.filter(track => !held.has(track.id));
  return remaining.reduce((sum, track) => sum + track.entryCost, 0)
    + remaining.length * mine(state).reduce((sum, driver) => sum + driver.contract!.wagePerRace, 0);
}
const OFFER_KEYS = ['outgoingDriverId', 'incomingDriverId', 'startsSeason', 'years', 'wagePerRace', 'signingFee', 'buyout', 'totalFee', 'reserveAfter', 'affordable'];
const RENEWAL_KEYS = ['driverId', 'wagePerRace', 'signingFee'];
const PLAN_KEYS = ['nextSeason', 'sponsor', 'totalRenewalFee', 'nextReserved', 'cashAfter', 'affordable'];
const dealWage = (driver: GrandPrixDriver) => Math.round((70_000 + driver.skills.pace * 1_500) / 1_000) * 1_000;
const marketOpen = (state: GrandPrixCareer) => state.phase === 'preRace' && state.round === 0 && state.results.length === 0
  || state.phase === 'seasonReview' && state.results.length === state.calendar.length && state.round === state.calendar.length - 1;
function normalizeContractSeasons(state: GrandPrixCareer): void {
  for (const driver of state.drivers) if (driver.contract && driver.contract.startsSeason === undefined) driver.contract.startsSeason = state.season;
}
function retiring(driver: GrandPrixDriver, season: number): boolean {
  return driver.age + 1 >= 40 && (!driver.contract
    || (driver.contract.startsSeason ?? season) <= season && driver.contract.years === 1);
}
function retirementRookies(state: GrandPrixCareer, seats = mine(state)): Map<string, GrandPrixDriver> {
  const world = state.drivers.map(driver => seats.find(seat => seat.id === driver.id)
    ?? (driver.contract?.teamId === state.teamId ? { ...driver, contract: null } : driver));
  const usedIds = new Set(state.drivers.map(driver => driver.id)), usedNames = new Set(state.drivers.map(driver => driver.name));
  const rookies = new Map<string, GrandPrixDriver>();
  world.forEach((driver, index) => {
    if (!retiring(driver, state.season)) return;
    const random = keyedRng(`grand-prix-rookie|${state.seed}|${state.season + 1}|${index}`);
    const ri = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
    const baseId = `gp-rookie-${state.seed}-${state.season + 1}-${index}`;
    let id = baseId, suffix = 0;
    while (usedIds.has(id)) id = baseId + '-' + ++suffix;
    usedIds.add(id);
    let pair = ri(0, 675), name = '';
    do { name = FIRST_NAMES[pair % 26] + ' ' + LAST_NAMES[Math.floor(pair / 26)]; pair = (pair + 1) % 676; } while (usedNames.has(name));
    usedNames.add(name);
    const pace = ri(55, 72);
    const rookie: GrandPrixDriver = { id, name, age: ri(18, 21), potential: ri(pace + 8, Math.min(99, pace + 20)), focus: 'balanced',
      skills: { pace, consistency: ri(65, 85), tyreCare: ri(58, 85), wet: ri(50, 85) }, contract: null };
    if (driver.contract) rookie.contract = { teamId: driver.contract.teamId, years: 1, startsSeason: state.season + 1, wagePerRace: dealWage(rookie) };
    rookies.set(driver.id, rookie);
  });
  return rookies;
}
function developDriver(driver: GrandPrixDriver): void {
  driver.age += 1;
  const grow = (skill: typeof SKILLS[number], amount: number) => {
    if (driver.skills[skill] < driver.potential) driver.skills[skill] = Math.min(driver.potential, driver.skills[skill] + amount, 100);
  };
  if (driver.age < 27) {
    if (driver.focus === 'balanced') for (const skill of SKILLS) grow(skill, 1);
    else grow(driver.focus, 3);
  } else if (driver.age <= 32) {
    const weakest = SKILLS.reduce((held, skill) => driver.skills[skill] < driver.skills[held] ? skill : held);
    grow(driver.focus === 'balanced' ? weakest : driver.focus, 1);
  } else {
    if (driver.focus !== 'pace') driver.skills.pace = Math.max(0, driver.skills.pace - 1);
    if (driver.focus !== 'balanced' && driver.focus !== 'pace') grow(driver.focus, 1);
  }
}
function initializeLifecycle(state: GrandPrixCareer): void {
  const random = keyedRng(`grand-prix-world|${state.seed}`);
  const ri = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const baselines = TEAM_NAMES.map((_, index) => ({ power: 86 - index * 3 + ri(-2, 2), aero: 84 - index * 3 + ri(-2, 2), reliability: 91 - index * 2 }));
  for (const driver of state.drivers) driver.focus = 'balanced';
  for (const team of state.teams) {
    const index = Array.from({ length: 10 }, (_, i) => `gp-team-${i}`).indexOf(team.id);
    const original = index >= 0 ? baselines[index] : team.car;
    team.baselineCar = { power: Math.min(original.power, team.car.power), aero: Math.min(original.aero, team.car.aero), reliability: Math.min(original.reliability, team.car.reliability) };
  }
}
function lifecycleShape(state: GrandPrixCareer): 'legacy' | 'current' | 'invalid' {
  const absent = state.drivers.every(driver => driver.focus === undefined) && state.teams.every(team => team.baselineCar === undefined);
  if (absent) return 'legacy';
  if (state.history === undefined || state.careerTotals === undefined) return 'invalid';
  return state.drivers.every(driver => FOCUSES.includes(driver.focus)) && state.teams.every(team => record(team.baselineCar)
    && AREAS.every(area => integer(team.baselineCar[area], 0, team.car[area]))) ? 'current' : 'invalid';
}
function projectedSeason(state: GrandPrixCareer, seats = mine(state), cash = state.cash, lifecycle = true): GrandPrixNextSeasonPlan {
  const automaticRenewals: GrandPrixNextSeasonPlan['automaticRenewals'] = [];
  const seatReplacements: GrandPrixNextSeasonPlan['seatReplacements'] = [];
  const rookies = lifecycle ? retirementRookies(state, seats) : new Map<string, GrandPrixDriver>();
  const wages = seats.reduce((sum, driver) => {
    const contract = driver.contract!;
    const rookie = rookies.get(driver.id);
    if (rookie) {
      const wagePerRace = rookie.contract!.wagePerRace;
      seatReplacements.push({ departingDriverId: driver.id, rookie, signingFee: wagePerRace * 2 });
      return sum + wagePerRace;
    }
    if ((contract.startsSeason ?? state.season) <= state.season && contract.years === 1) {
      const wagePerRace = dealWage(driver);
      automaticRenewals.push({ driverId: driver.id, wagePerRace, signingFee: wagePerRace * 2 });
      return sum + wagePerRace;
    }
    return sum + contract.wagePerRace;
  }, 0);
  const sponsor = 12_000_000;
  const totalRenewalFee = automaticRenewals.reduce((sum, renewal) => sum + renewal.signingFee, 0);
  const nextReserved = state.calendar.reduce((sum, track) => sum + track.entryCost, 0) + state.calendar.length * wages;
  const totalReplacementFee = seatReplacements.reduce((sum, row) => sum + row.signingFee, 0);
  const cashAfter = cash + sponsor - totalRenewalFee - totalReplacementFee;
  return { nextSeason: state.season + 1, sponsor, automaticRenewals, totalRenewalFee, seatReplacements, totalReplacementFee, nextReserved, cashAfter,
    affordable: integer(cashAfter) && integer(nextReserved) && cashAfter >= nextReserved };
}
function offerFor(state: GrandPrixCareer, outgoing: GrandPrixDriver, incoming: GrandPrixDriver, renewal = false, lifecycle = true): GrandPrixMarketOffer {
  const startsSeason = state.phase === 'seasonReview' ? state.season + 1 : state.season;
  const wagePerRace = dealWage(incoming), signingFee = wagePerRace * 2;
  const old = outgoing.contract!;
  const unserved = (old.startsSeason ?? state.season) > state.season ? old.years * state.calendar.length
    : state.calendar.length - state.results.length + (old.years - 1) * state.calendar.length;
  const buyout = renewal ? 0 : Math.ceil(unserved * old.wagePerRace / 2), totalFee = signingFee + buyout;
  const replacement: GrandPrixDriver = { ...incoming, contract: { teamId: state.teamId, years: 1, startsSeason, wagePerRace } };
  const seats = mine(state).map(driver => driver.id === outgoing.id ? replacement : driver);
  const projected = state.phase === 'seasonReview' ? projectedSeason(state, seats, state.cash - totalFee, lifecycle) : null;
  const reserveAfter = projected ? projected.nextReserved
    : state.calendar.reduce((sum, track) => sum + track.entryCost, 0)
      + state.calendar.length * seats.reduce((sum, driver) => sum + driver.contract!.wagePerRace, 0);
  const affordable = integer(totalFee) && state.cash >= totalFee && (projected ? projected.affordable : state.cash - totalFee >= reserveAfter);
  return { outgoingDriverId: outgoing.id, incomingDriverId: incoming.id, startsSeason, years: 1,
    wagePerRace, signingFee, buyout, totalFee, reserveAfter, affordable };
}
function marketOffers(state: GrandPrixCareer, lifecycle = true): GrandPrixMarketOffer[] {
  if (!marketOpen(state)) return [];
  const offers: GrandPrixMarketOffer[] = [], available = state.drivers.filter(driver => driver.contract === null);
  for (const outgoing of mine(state)) {
    for (const incoming of available.filter(driver => !lifecycle || driver.age + (state.phase === 'seasonReview' ? 1 : 0) < 40)) offers.push(offerFor(state, outgoing, incoming, false, lifecycle));
    if (state.phase === 'seasonReview' && outgoing.contract!.years === 1 && (outgoing.contract!.startsSeason ?? state.season) <= state.season && (!lifecycle || !retiring(outgoing, state.season))) {
      offers.push(offerFor(state, outgoing, outgoing, true, lifecycle));
    }
  }
  return offers;
}
function refreshMarket(state: GrandPrixCareer, lifecycle = true): void {
  state.marketOffers = marketOffers(state, lifecycle);
  state.nextSeasonPlan = state.phase === 'seasonReview' ? projectedSeason(state, mine(state), state.cash, lifecycle) : null;
}
function rowsMatch(raw: unknown, expected: object[], keys: string[]): boolean {
  return Array.isArray(raw) && raw.length === expected.length && raw.every((row, index) => record(row)
    && Object.keys(row).length === keys.length && keys.every(key => row[key] === (expected[index] as Record<string, unknown>)[key]));
}
function replacementMatches(raw: unknown, expected: GrandPrixNextSeasonPlan['seatReplacements']): boolean {
  return Array.isArray(raw) && raw.length === expected.length && raw.every((row, index) => {
    const wanted = expected[index];
    if (!record(row) || Object.keys(row).length !== 3 || row.departingDriverId !== wanted.departingDriverId || row.signingFee !== wanted.signingFee || !record(row.rookie)) return false;
    const rookie = row.rookie, driver = wanted.rookie, skills = rookie.skills, contract = rookie.contract;
    return Object.keys(rookie).length === 7 && ['id', 'name', 'age', 'potential', 'focus'].every(key => rookie[key] === driver[key])
      && record(skills) && Object.keys(skills).length === 4 && SKILLS.every(key => skills[key] === driver.skills[key])
      && record(contract) && Object.keys(contract).length === 4
      && ['teamId', 'years', 'wagePerRace', 'startsSeason'].every(key => contract[key] === driver.contract![key]);
  });
}
function planMatches(raw: unknown, expected: GrandPrixNextSeasonPlan | null, lifecycle = true): boolean {
  if (expected === null) return raw === null;
  return record(raw) && Object.keys(raw).length === PLAN_KEYS.length + (lifecycle ? 3 : 1)
    && PLAN_KEYS.every(key => raw[key] === (expected as unknown as Record<string, unknown>)[key])
    && rowsMatch(raw.automaticRenewals, expected.automaticRenewals, RENEWAL_KEYS)
    && (!lifecycle || raw.totalReplacementFee === expected.totalReplacementFee && replacementMatches(raw.seatReplacements, expected.seatReplacements));
}
function safeMarket(state: GrandPrixCareer): boolean {
  if (!state.marketOffers.every(offer => [offer.startsSeason, offer.years, offer.wagePerRace, offer.signingFee, offer.buyout, offer.totalFee, offer.reserveAfter].every(value => integer(value)))) return false;
  const plan = state.nextSeasonPlan;
  return plan === null || [plan.nextSeason, plan.sponsor, plan.totalRenewalFee, plan.totalReplacementFee, plan.nextReserved, plan.cashAfter].every(value => integer(value))
    && plan.automaticRenewals.every(renewal => integer(renewal.wagePerRace, 1) && integer(renewal.signingFee, 1))
    && plan.seatReplacements.every(row => integer(row.signingFee, 1) && integer(row.rookie.contract!.wagePerRace, 1));
}
const honorsOrder = (a: { points: number; wins: number; podiums: number }, b: { points: number; wins: number; podiums: number }) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums;
function summarizeSeason(state: GrandPrixCareer): GrandPrixSeasonSummary {
  const participantIds = new Set(state.results.flatMap(result => result.classification.map(row => row.driverId)));
  const drivers = state.driverStandings.filter(row => participantIds.has(row.driverId)).slice().sort((a, b) => honorsOrder(a, b) || a.driverId.localeCompare(b.driverId));
  const teams = state.constructorStandings.slice().sort((a, b) => honorsOrder(a, b) || a.teamId.localeCompare(b.teamId));
  const winner = drivers[0], constructor = teams[0], owner = teams.find(row => row.teamId === state.teamId)!;
  const winnerTeam = state.results.flatMap(result => result.classification).find(row => row.driverId === winner.driverId)!.teamId;
  const races = state.results.map(result => {
    const owned = result.classification.filter(row => row.teamId === state.teamId);
    return { roundId: result.roundId, trackName: state.calendar.find(track => track.id === result.roundId)!.name,
      points: owned.reduce((sum, row) => sum + row.points, 0), teamPrize: result.teamPrize, operatingCost: result.operatingCost,
      drivers: owned.map(row => ({ driverId: row.driverId, name: state.drivers.find(driver => driver.id === row.driverId)!.name,
        position: row.position, status: row.status, points: row.points })) };
  });
  const ownerIds = [...new Set(races.flatMap(race => race.drivers.map(row => row.driverId)))];
  const seasonDrivers = ownerIds.map(driverId => {
    const standing = state.driverStandings.find(row => row.driverId === driverId)!;
    const rows = races.flatMap(race => race.drivers).filter(row => row.driverId === driverId);
    return { ...standing, name: state.drivers.find(driver => driver.id === driverId)!.name,
      races: rows.length, finishes: rows.filter(row => row.status === 'finished').length };
  });
  return { season: state.season, rounds: state.calendar.length,
    driverChampion: { ...winner, name: state.drivers.find(driver => driver.id === winner.driverId)!.name, teamId: winnerTeam },
    constructorChampion: { ...constructor, name: state.teams.find(team => team.id === constructor.teamId)!.name },
    team: { ...owner, name: state.teams.find(team => team.id === state.teamId)!.name, position: teams.findIndex(row => row.teamId === state.teamId) + 1, drivers: seasonDrivers },
    races, roundsBothDriversFinished: races.filter(race => race.drivers.every(row => row.status === 'finished')).length,
    endCash: state.cash, finalCar: { ...state.teams.find(team => team.id === state.teamId)!.car } };
}
function validHonors(value: unknown, rounds: number, team = false): boolean {
  return record(value) && integer(value.points, 0, (team ? POINTS[0] + POINTS[1] : POINTS[0]) * rounds)
    && integer(value.wins, 0, rounds) && integer(value.podiums, 0, (team ? 2 : 1) * rounds);
}
function validSummary(raw: unknown, ownerId: string): boolean {
  if (!record(raw)) return false;
  const row = raw as unknown as GrandPrixSeasonSummary;
  if (!integer(row.season, 1) || row.rounds !== 12 || !integer(row.endCash)
    || !record(row.finalCar) || !AREAS.every(area => integer(row.finalCar[area], 0, 100))
    || !record(row.driverChampion) || !text(row.driverChampion.driverId) || !text(row.driverChampion.name) || !text(row.driverChampion.teamId)
    || !validHonors(row.driverChampion, row.rounds)
    || !record(row.constructorChampion) || !text(row.constructorChampion.teamId) || !text(row.constructorChampion.name)
    || !validHonors(row.constructorChampion, row.rounds, true)
    || !record(row.team) || row.team.teamId !== ownerId || !text(row.team.name) || !integer(row.team.position, 1, 10)
    || !validHonors(row.team, row.rounds, true) || !Array.isArray(row.team.drivers) || row.team.drivers.length !== 2
    || !row.team.drivers.every(driver => record(driver) && text(driver.driverId) && text(driver.name) && validHonors(driver, row.rounds)
      && driver.races === row.rounds && integer(driver.finishes, 0, row.rounds))
    || !unique(row.team.drivers.map(driver => driver.driverId)) || !Array.isArray(row.races) || row.races.length !== row.rounds
    || !unique(row.races.map(race => race?.roundId)) || !integer(row.roundsBothDriversFinished, 0, row.rounds)) return false;
  const ownIds = row.team.drivers.map(driver => driver.driverId);
  for (const race of row.races) {
    if (!record(race) || !text(race.roundId) || !text(race.trackName) || !integer(race.points, 0, POINTS[0] + POINTS[1])
      || !integer(race.teamPrize) || !integer(race.operatingCost, 1) || !Array.isArray(race.drivers) || race.drivers.length !== 2
      || !unique(race.drivers.map(driver => driver?.driverId)) || !unique(race.drivers.map(driver => String(driver?.position)))
      || !race.drivers.every(driver => record(driver) && ownIds.includes(driver.driverId) && text(driver.name) && integer(driver.position, 1, 20)
        && ['finished', 'retired'].includes(driver.status) && driver.points === (driver.status === 'finished' ? POINTS[driver.position - 1] ?? 0 : 0))) return false;
    if (race.points !== race.drivers.reduce((sum, driver) => sum + driver.points, 0)
      || race.teamPrize !== race.points * 30_000 + race.drivers.filter(driver => driver.status === 'finished').length * 50_000) return false;
  }
  for (const driver of row.team.drivers) {
    const appearances = row.races.flatMap(race => race.drivers).filter(held => held.driverId === driver.driverId);
    if (appearances.length !== row.rounds || appearances.some(held => held.name !== driver.name)
      || driver.points !== appearances.reduce((sum, held) => sum + held.points, 0)
      || driver.wins !== appearances.filter(held => held.status === 'finished' && held.position === 1).length
      || driver.podiums !== appearances.filter(held => held.status === 'finished' && held.position <= 3).length
      || driver.finishes !== appearances.filter(held => held.status === 'finished').length) return false;
  }
  if (row.team.points !== row.team.drivers.reduce((sum, driver) => sum + driver.points, 0)
    || row.team.wins !== row.team.drivers.reduce((sum, driver) => sum + driver.wins, 0)
    || row.team.podiums !== row.team.drivers.reduce((sum, driver) => sum + driver.podiums, 0)
    || row.roundsBothDriversFinished !== row.races.filter(race => race.drivers.every(driver => driver.status === 'finished')).length
    || (row.constructorChampion.teamId === ownerId) !== (row.team.position === 1)) return false;
  if (row.constructorChampion.teamId === ownerId) {
    if (row.constructorChampion.name !== row.team.name || honorsOrder(row.constructorChampion, row.team) !== 0) return false;
  } else if ((honorsOrder(row.constructorChampion, row.team) || row.constructorChampion.teamId.localeCompare(row.team.teamId)) > 0) return false;
  const ownChampion = row.team.drivers.find(driver => driver.driverId === row.driverChampion.driverId);
  if (row.driverChampion.teamId === ownerId) {
    if (!ownChampion || ownChampion.name !== row.driverChampion.name || honorsOrder(ownChampion, row.driverChampion) !== 0) return false;
  } else if (ownChampion) return false;
  return !row.team.drivers.some(driver => (honorsOrder(driver, row.driverChampion) || driver.driverId.localeCompare(row.driverChampion.driverId)) < 0);
}
function normalizeHistory(state: GrandPrixCareer): boolean {
  if (state.history === undefined && state.careerTotals === undefined) {
    state.history = [];
    state.careerTotals = { archivedSeasons: 0, driverTitles: 0, constructorTitles: 0, sinceSeason: state.season, earlierSeasonsUnknown: state.season > 1 };
    return true;
  }
  if (!Array.isArray(state.history) || !record(state.careerTotals)) return false;
  const totals = state.careerTotals;
  if (!integer(totals.sinceSeason, 1, state.season) || totals.earlierSeasonsUnknown !== (totals.sinceSeason > 1)
    || totals.archivedSeasons !== state.season - totals.sinceSeason || !integer(totals.archivedSeasons)
    || !integer(totals.driverTitles, 0, totals.archivedSeasons) || !integer(totals.constructorTitles, 0, totals.archivedSeasons)
    || state.history.length !== Math.min(totals.archivedSeasons, 12)
    || !state.history.every((row, index) => validSummary(row, state.teamId) && row.season === state.season - state.history.length + index)) return false;
  const retainedDriverTitles = state.history.filter(row => row.driverChampion.teamId === state.teamId).length;
  const retainedTeamTitles = state.history.filter(row => row.constructorChampion.teamId === state.teamId).length;
  const omitted = totals.archivedSeasons - state.history.length;
  return totals.driverTitles >= retainedDriverTitles && totals.driverTitles <= retainedDriverTitles + omitted
    && totals.constructorTitles >= retainedTeamTitles && totals.constructorTitles <= retainedTeamTitles + omitted;
}
function committed(state: GrandPrixCareer, receipt: Omit<Extract<GrandPrixTransition, { ok: true }>['receipt'], 'revision'>): GrandPrixTransition {
  state.revision += 1;
  state.reserved = reserve(state);
  state.upgradeCosts = quotes(state);
  refreshMarket(state);
  return { ok: true, state, receipt: { ...receipt, revision: state.revision } };
}

export function createCareer(seed: number): GrandPrixCareer {
  if (!integer(seed, 0, 0xffffffff)) throw new RangeError('Use a whole seed from 0 to 4294967295.');
  const random = keyedRng(`grand-prix-world|${seed}`);
  const ri = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const teams = TEAM_NAMES.map((name, index) => {
    const car = { power: 86 - index * 3 + ri(-2, 2), aero: 84 - index * 3 + ri(-2, 2), reliability: 91 - index * 2 };
    return { id: `gp-team-${index}`, name, car, baselineCar: { ...car } };
  });
  const firstOffset = ri(0, 25), lastOffset = ri(0, 25);
  const drivers = Array.from({ length: 26 }, (_, index): GrandPrixDriver => {
    const team = index < 20 ? teams[Math.floor(index / 2)] : null;
    const pace = team ? clamp(team.car.power + ri(-6, 4), 45, 96) : ri(55, 76);
    return {
      id: `gp-driver-${index}`, name: `${FIRST_NAMES[(index + firstOffset) % 26]} ${LAST_NAMES[(index * 5 + lastOffset) % 26]}`,
      age: ri(19, 34), potential: clamp(pace + ri(4, 12), pace, 99), focus: 'balanced',
      skills: { pace, consistency: ri(65, 94), tyreCare: ri(58, 93), wet: ri(50, 92) },
      contract: team ? { teamId: team.id, years: ri(1, 3), wagePerRace: Math.round((70_000 + pace * 1_500) / 1_000) * 1_000 } : null,
    };
  });
  const teamId = teams[6].id;
  drivers[12].contract!.wagePerRace = 180_000;
  drivers[13].contract!.wagePerRace = 120_000;
  const calendar = TRACK_NAMES.map((name, index) => {
    const powerWeight = [0.8, 0.25, 0.5, 0.7, 0.3, 0.45][index % 6];
    return { id: `gp-round-${index}`, name, laps: 40, entryCost: 250_000, powerWeight, aeroWeight: 1 - powerWeight, rainChance: 0.12 + random() * 0.25 };
  });
  const state: GrandPrixCareer = {
    version: 1, worldKind: 'fictional', careerId: `grand-prix-${seed}`, seed, revision: 0,
    season: 1, round: 0, phase: 'preRace', teamId, cash: 12_000_000, reserved: 0,
    upgradeCosts: { power: null, aero: null, reliability: null }, marketOffers: [], nextSeasonPlan: null,
    history: [], careerTotals: { archivedSeasons: 0, driverTitles: 0, constructorTitles: 0, sinceSeason: 1, earlierSeasonsUnknown: false },
    teams, drivers, calendar, race: null, results: [],
    driverStandings: drivers.map(driver => ({ driverId: driver.id, points: 0, wins: 0, podiums: 0 })),
    constructorStandings: teams.map(team => ({ teamId: team.id, points: 0, wins: 0, podiums: 0 })),
  };
  normalizeContractSeasons(state);
  refreshMarket(state);
  state.reserved = reserve(state);
  state.upgradeCosts = quotes(state);
  return state;
}

function readOrders(value: unknown, ids: string[], starting: boolean): (GrandPrixOrder & { compound?: Compound })[] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  if (!value.every(row => record(row) && ids.includes(row.driverId as string) && PACES.includes(row.pace as Pace)
    && (starting ? TYRES.includes(row.compound as Compound) : row.pitTo === undefined || TYRES.includes(row.pitTo as Compound)))) return null;
  if (!unique(value.map(row => row.driverId))) return null;
  return value as (GrandPrixOrder & { compound?: Compound })[];
}
function qualifying(state: GrandPrixCareer): GrandPrixRace {
  const track = state.calendar[state.round];
  const grid = state.drivers.filter(driver => driver.contract).map(driver => {
    const team = state.teams.find(row => row.id === driver.contract!.teamId)!;
    const car = team.car.power * track.powerWeight + team.car.aero * track.aeroWeight;
    return {
      driverId: driver.id, teamId: team.id,
      timeMs: Math.round(90_000 - car * 200 - driver.skills.pace * 140 - driver.skills.consistency * 50
        + (roll(state, 'qualifying|' + driver.id) - 0.5) * 2_400),
    };
  }).sort((a, b) => a.timeMs - b.timeMs || a.driverId.localeCompare(b.driverId));
  const weather = roll(state, 'weather|0') < track.rainChance ? 'wet' : 'dry';
  return {
    roundId: track.id, lap: 0, weather, grid,
    entries: grid.map((row, index): GrandPrixRaceEntry => ({ ...row, elapsedMs: index * 350, completedLaps: 0,
      compound: weather === 'wet' ? 'wet' : 'medium', pace: 'balanced', tyreWear: 0, stops: 0, status: 'running' })),
  };
}
function aiOrder(state: GrandPrixCareer, entry: GrandPrixRaceEntry): GrandPrixOrder {
  const race = state.race!;
  const choice = roll(state, `pace|${entry.driverId}|${race.lap}`);
  const pace: Pace = choice < 0.2 ? 'push' : choice > 0.8 ? 'conserve' : 'balanced';
  let pitTo: Compound | undefined;
  if (race.lap > 0) {
    if (race.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
    else if (race.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
    else if (entry.tyreWear > 58) pitTo = race.weather === 'wet' ? 'wet' : 'hard';
  }
  return { driverId: entry.driverId, pace, ...(pitTo ? { pitTo } : {}) };
}
function advanceInterval(state: GrandPrixCareer, orders: GrandPrixOrder[]): void {
  const race = state.race!, track = state.calendar[state.round];
  const target = INTERVALS.find(lap => lap > race.lap)!;
  for (const entry of race.entries) {
    if (entry.status !== 'running') continue;
    const driver = state.drivers.find(row => row.id === entry.driverId)!;
    const team = state.teams.find(row => row.id === entry.teamId)!;
    const order = orders.find(row => row.driverId === entry.driverId) ?? aiOrder(state, entry);
    entry.pace = order.pace;
    if (order.pitTo) { entry.compound = order.pitTo; entry.tyreWear = 0; entry.stops += 1; entry.elapsedMs += 22_000; }
    for (let lap = race.lap + 1; lap <= target; lap += 1) {
      const risk = order.pace === 'push' ? 1.6 : order.pace === 'conserve' ? 0.65 : 1;
      const failure = (100 - team.car.reliability) * 0.000025 * risk;
      if (roll(state, `retirement|${entry.driverId}|${lap}`) < failure) { entry.status = 'retired'; break; }
      const car = team.car.power * track.powerWeight + team.car.aero * track.aeroWeight;
      const compoundTime = race.weather === 'wet'
        ? entry.compound === 'wet' ? 800 - driver.skills.wet * 8 : 8_500 + (100 - driver.skills.wet) * 25
        : entry.compound === 'wet' ? 6_500 : entry.compound === 'soft' ? -700 : entry.compound === 'hard' ? 450 : 0;
      const wearTime = Math.pow(Math.max(0, entry.tyreWear - 25), 2) * 0.9;
      const paceTime = order.pace === 'push' ? -600 : order.pace === 'conserve' ? 450 : 0;
      const noise = (roll(state, `lap|${entry.driverId}|${lap}`) - 0.5) * (1_100 - driver.skills.consistency * 8);
      entry.elapsedMs += Math.round(87_000 - car * 180 - driver.skills.pace * 95 + compoundTime + wearTime + paceTime + noise);
      entry.completedLaps = lap;
      const wearBase = { soft: 2.15, medium: 1.45, hard: 1.05, wet: 1.6 }[entry.compound];
      const wearPace = order.pace === 'push' ? 1.35 : order.pace === 'conserve' ? 0.8 : 1;
      entry.tyreWear = Math.round(clamp(entry.tyreWear + wearBase * (1.3 - driver.skills.tyreCare / 200) * wearPace, 0, 100) * 100) / 100;
    }
  }
  race.lap = target;
  if (target < track.laps) race.weather = roll(state, 'weather|' + target) < track.rainChance ? 'wet' : 'dry';
}
function settleRace(state: GrandPrixCareer): { teamPrize: number; operatingCost: number } {
  const race = state.race!;
  for (const entry of race.entries) if (entry.status === 'running') entry.status = 'finished';
  const ordered = [...race.entries].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'finished' ? -1 : 1;
    return b.completedLaps - a.completedLaps || a.elapsedMs - b.elapsedMs || a.driverId.localeCompare(b.driverId);
  });
  const classification: GrandPrixClassification[] = ordered.map((entry, index) => ({
    driverId: entry.driverId, teamId: entry.teamId, position: index + 1,
    status: entry.status === 'finished' ? 'finished' : 'retired',
    points: entry.status === 'finished' ? POINTS[index] ?? 0 : 0,
  }));
  for (const row of classification) {
    const driver = state.driverStandings.find(held => held.driverId === row.driverId)!;
    const team = state.constructorStandings.find(held => held.teamId === row.teamId)!;
    for (const standing of [driver, team]) {
      standing.points += row.points;
      if (row.position === 1 && row.status === 'finished') standing.wins += 1;
      if (row.position <= 3 && row.status === 'finished') standing.podiums += 1;
    }
  }
  state.driverStandings.sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.driverId.localeCompare(b.driverId));
  state.constructorStandings.sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.teamId.localeCompare(b.teamId));
  const myRows = classification.filter(row => row.teamId === state.teamId);
  const teamPrize = myRows.reduce((sum, row) => sum + row.points * 30_000 + (row.status === 'finished' ? 50_000 : 0), 0);
  const operatingCost = state.calendar[state.round].entryCost + mine(state).reduce((sum, driver) => sum + driver.contract!.wagePerRace, 0);
  state.cash += teamPrize - operatingCost;
  state.results.push({ roundId: race.roundId, classification, teamPrize, operatingCost });
  state.phase = state.results.length === state.calendar.length ? 'seasonReview' : 'raceResult';
  return { teamPrize, operatingCost };
}

export function applyAction(state: GrandPrixCareer, action: GrandPrixAction): GrandPrixTransition {
  if (!record(action) || !integer(action.expectedRevision)) return { ok: false, reason: 'invalid' };
  if (action.expectedRevision !== state.revision) return { ok: false, reason: 'stale' };
  const a = action as unknown as Record<string, unknown>;
  if (a.type === 'setDriverFocus') {
    if (!marketOpen(state)) return { ok: false, reason: 'phase' };
    const driver = mine(state).find(held => held.id === a.driverId);
    if (!driver || !FOCUSES.includes(a.focus as GrandPrixFocus) || driver.focus === a.focus) return { ok: false, reason: 'invalid' };
    const next = clone(state);
    next.drivers.find(held => held.id === driver.id)!.focus = a.focus as GrandPrixFocus;
    return committed(next, { type: 'setDriverFocus' });
  }
  if (a.type === 'startNextSeason') {
    if (state.phase !== 'seasonReview' || state.results.length !== state.calendar.length || state.round !== state.calendar.length - 1) return { ok: false, reason: 'phase' };
    const plan = projectedSeason(state);
    if (!plan.affordable) return { ok: false, reason: 'funds' };
    const next = clone(state);
    if (!normalizeHistory(next)) return { ok: false, reason: 'invalid' };
    const summary = summarizeSeason(next);
    const rookies = retirementRookies(state);
    next.history = [...next.history, summary].slice(-12);
    next.careerTotals.archivedSeasons += 1;
    if (summary.driverChampion.teamId === next.teamId) next.careerTotals.driverTitles += 1;
    if (summary.constructorChampion.teamId === next.teamId) next.careerTotals.constructorTitles += 1;
    for (const driver of next.drivers) {
      if (rookies.has(driver.id)) continue;
      const contract = driver.contract;
      if (!contract || (contract.startsSeason ?? state.season) > state.season) continue;
      if (contract.years > 1) { contract.years -= 1; continue; }
      const renewal = plan.automaticRenewals.find(row => row.driverId === driver.id);
      if (contract.teamId === next.teamId && !renewal) return { ok: false, reason: 'invalid' };
      driver.contract = { teamId: contract.teamId, years: 1, startsSeason: plan.nextSeason,
        wagePerRace: contract.teamId === next.teamId ? renewal!.wagePerRace : dealWage(driver) };
    }
    next.drivers = next.drivers.map(driver => {
      const rookie = rookies.get(driver.id);
      if (rookie) return clone(rookie);
      developDriver(driver);
      return driver;
    });
    for (const team of next.teams) {
      for (const area of AREAS) team.car[area] = team.baselineCar[area] + Math.floor(Math.max(0, team.car[area] - team.baselineCar[area]) * CAR_CARRY);
      if (team.id !== next.teamId) {
        const weakest = AREAS.reduce((held, area) => team.car[area] < team.car[held] ? area : held);
        team.car[weakest] = Math.min(100, team.car[weakest] + AI_INVESTMENT);
      }
    }
    next.cash = plan.cashAfter;
    next.season = plan.nextSeason; next.round = 0; next.phase = 'preRace'; next.race = null; next.results = [];
    next.calendar = state.calendar.map((track, index) => ({ ...track, id: `gp-season-${next.season}-round-${index}`,
      rainChance: 0.12 + keyedRng(`grand-prix-calendar|${next.seed}|${next.season}|${index}`)() * 0.25 }));
    next.driverStandings = next.drivers.map(driver => ({ driverId: driver.id, points: 0, wins: 0, podiums: 0 }));
    next.constructorStandings = next.teams.map(team => ({ teamId: team.id, points: 0, wins: 0, podiums: 0 }));
    return committed(next, { type: 'startNextSeason', sponsor: plan.sponsor, renewalFee: plan.totalRenewalFee, replacementFee: plan.totalReplacementFee, cashDelta: plan.cashAfter - state.cash });
  }
  if (a.type === 'signDriver' || a.type === 'renewDriver') {
    if (!marketOpen(state) || a.type === 'renewDriver' && state.phase !== 'seasonReview') return { ok: false, reason: 'phase' };
    const outgoingId = a.type === 'renewDriver' ? a.driverId : a.outgoingDriverId;
    const incomingId = a.type === 'renewDriver' ? a.driverId : a.incomingDriverId;
    if (!text(outgoingId) || !text(incomingId)) return { ok: false, reason: 'invalid' };
    const offer = marketOffers(state).find(row => row.outgoingDriverId === outgoingId && row.incomingDriverId === incomingId);
    if (!offer || a.type === 'signDriver' && outgoingId === incomingId) return { ok: false, reason: 'invalid' };
    if (!offer.affordable) return { ok: false, reason: 'funds' };
    const next = clone(state);
    const outgoing = next.drivers.find(driver => driver.id === outgoingId)!;
    const incoming = next.drivers.find(driver => driver.id === incomingId)!;
    if (outgoingId !== incomingId) outgoing.contract = null;
    incoming.contract = { teamId: next.teamId, years: 1, startsSeason: offer.startsSeason, wagePerRace: offer.wagePerRace };
    next.cash -= offer.totalFee;
    return committed(next, { type: a.type, cost: offer.totalFee });
  }
  if (a.type === 'upgrade') {
    if (state.phase !== 'preRace') return { ok: false, reason: 'phase' };
    if (!AREAS.includes(a.area as CarArea)) return { ok: false, reason: 'invalid' };
    const area = a.area as CarArea, cost = quotes(state)[area];
    if (cost === null) return { ok: false, reason: 'invalid' };
    if (cost > state.cash - reserve(state)) return { ok: false, reason: 'funds' };
    const next = clone(state);
    next.cash -= cost;
    const car = next.teams.find(team => team.id === next.teamId)!.car;
    car[area] = Math.min(100, car[area] + 2);
    return committed(next, { type: 'upgrade', cost });
  }
  if (a.type === 'qualify') {
    if (state.phase !== 'preRace') return { ok: false, reason: 'phase' };
    const next = clone(state); next.race = qualifying(next); next.phase = 'grid';
    return committed(next, { type: 'qualify' });
  }
  if (a.type === 'startRace') {
    if (state.phase !== 'grid' || !state.race) return { ok: false, reason: 'phase' };
    const setups = readOrders(a.setups, mine(state).map(driver => driver.id), true);
    if (!setups) return { ok: false, reason: 'invalid' };
    const next = clone(state);
    for (const setup of setups) {
      const entry = next.race!.entries.find(row => row.driverId === setup.driverId)!;
      entry.compound = setup.compound!; entry.pace = setup.pace;
    }
    next.phase = 'race';
    return committed(next, { type: 'startRace' });
  }
  if (a.type === 'raceInterval') {
    if (state.phase !== 'race' || !state.race || ![0, 12, 26].includes(state.race.lap)) return { ok: false, reason: 'phase' };
    const orders = readOrders(a.orders, mine(state).map(driver => driver.id), false);
    if (!orders || state.race.lap === 0 && orders.some(order => order.pitTo)) return { ok: false, reason: 'invalid' };
    const next = clone(state); advanceInterval(next, orders);
    const paid = next.race!.lap === next.calendar[next.round].laps ? settleRace(next) : {};
    return committed(next, { type: 'raceInterval', ...paid });
  }
  if (a.type === 'continue') {
    if (state.phase !== 'raceResult' || state.round + 1 >= state.calendar.length) return { ok: false, reason: 'phase' };
    const next = clone(state); next.round += 1; next.race = null; next.phase = 'preRace';
    return committed(next, { type: 'continue' });
  }
  return { ok: false, reason: 'invalid' };
}

export function validateSavedCareer(raw: unknown): { ok: true; state: GrandPrixCareer } | { ok: false; reason: 'invalid' | 'unsupported' } {
  const invalid = { ok: false as const, reason: 'invalid' as const };
  if (!record(raw)) return invalid;
  if (integer(raw.version, 2)) return { ok: false, reason: 'unsupported' };
  const s = raw as unknown as GrandPrixCareer;
  if (s.version !== 1 || s.worldKind !== 'fictional' || !text(s.careerId) || !integer(s.seed, 0, 0xffffffff)
    || !integer(s.revision) || !integer(s.season, 1) || !integer(s.round, 0, 11)
    || !['preRace', 'grid', 'race', 'raceResult', 'seasonReview'].includes(s.phase)
    || !integer(s.cash) || !integer(s.reserved) || s.cash < s.reserved) return invalid;
  if (!Array.isArray(s.teams) || s.teams.length !== 10 || !s.teams.every(team => record(team) && text(team.id) && text(team.name)
    && record(team.car) && AREAS.every(area => integer(team.car[area], 0, 100))) || !unique(s.teams.map(team => team.id))) return invalid;
  const teamIds = new Set(s.teams.map(team => team.id));
  if (!teamIds.has(s.teamId) || !Array.isArray(s.drivers) || s.drivers.length !== 26
    || !s.drivers.every(driver => record(driver) && text(driver.id) && text(driver.name) && integer(driver.age, 16)
      && integer(driver.potential, 0, 100) && record(driver.skills)
      && ['pace', 'consistency', 'tyreCare', 'wet'].every(key => integer(driver.skills[key], 0, 100))
      && (driver.contract === null || record(driver.contract) && teamIds.has(driver.contract.teamId)
        && integer(driver.contract.years, 1, 5) && integer(driver.contract.wagePerRace, 1)
        && (driver.contract.startsSeason === undefined || integer(driver.contract.startsSeason, 1, s.season + (s.phase === 'seasonReview' ? 1 : 0))
          && (driver.contract.startsSeason <= s.season || driver.contract.years === 1))))
    || !unique(s.drivers.map(driver => driver.id))) return invalid;
  if (s.teams.some(team => s.drivers.filter(driver => driver.contract?.teamId === team.id).length !== 2)) return invalid;
  const driverIds = new Set(s.drivers.map(driver => driver.id));
  if (!Array.isArray(s.calendar) || s.calendar.length !== 12 || !s.calendar.every(track => record(track) && text(track.id) && text(track.name)
    && track.laps === 40 && integer(track.entryCost, 1) && finite(track.powerWeight, 0, 1) && finite(track.aeroWeight, 0, 1)
    && Math.abs(track.powerWeight + track.aeroWeight - 1) < 0.000001 && finite(track.rainChance, 0, 1)) || !unique(s.calendar.map(track => track.id))) return invalid;
  const roundIds = new Set(s.calendar.map(track => track.id));
  if (!Array.isArray(s.results) || s.results.length > 12 || !unique(s.results.map(result => result?.roundId))
    || !s.results.every(result => record(result) && roundIds.has(result.roundId) && integer(result.teamPrize) && integer(result.operatingCost)
      && Array.isArray(result.classification) && result.classification.length === 20 && unique(result.classification.map(row => row?.driverId))
      && result.classification.every((row, index) => record(row) && driverIds.has(row.driverId) && teamIds.has(row.teamId)
        && row.position === index + 1 && ['finished', 'retired'].includes(row.status)
        && row.points === (row.status === 'finished' ? POINTS[index] ?? 0 : 0)))) return invalid;
  if (!Array.isArray(s.driverStandings) || s.driverStandings.length !== 26 || !unique(s.driverStandings.map(row => row?.driverId))
    || !s.driverStandings.every(row => record(row) && driverIds.has(row.driverId) && integer(row.points) && integer(row.wins) && integer(row.podiums))
    || !Array.isArray(s.constructorStandings) || s.constructorStandings.length !== 10 || !unique(s.constructorStandings.map(row => row?.teamId))
    || !s.constructorStandings.every(row => record(row) && teamIds.has(row.teamId) && integer(row.points) && integer(row.wins) && integer(row.podiums))) return invalid;
  for (const standing of [...s.driverStandings, ...s.constructorStandings]) {
    const rows = s.results.flatMap(result => result.classification).filter(row => 'driverId' in standing ? row.driverId === standing.driverId : row.teamId === standing.teamId);
    if (standing.points !== rows.reduce((sum, row) => sum + row.points, 0)
      || standing.wins !== rows.filter(row => row.status === 'finished' && row.position === 1).length
      || standing.podiums !== rows.filter(row => row.status === 'finished' && row.position <= 3).length) return invalid;
  }
  const settled = s.phase === 'raceResult' || s.phase === 'seasonReview';
  if (s.results.length !== s.round + (settled ? 1 : 0) || s.results.some((result, index) => result.roundId !== s.calendar[index].id)) return invalid;
  if (s.phase === 'seasonReview' && s.round !== 11 || s.phase === 'raceResult' && s.round === 11) return invalid;
  if (s.phase === 'preRace') { if (s.race !== null) return invalid; }
  else {
    const race = s.race;
    if (!record(race) || race.roundId !== s.calendar[s.round].id || ![0, 12, 26, 40].includes(race.lap)
      || !['dry', 'wet'].includes(race.weather) || (settled ? race.lap !== 40 : race.lap === 40)
      || s.phase === 'grid' && race.lap !== 0 || !Array.isArray(race.grid) || race.grid.length !== 20 || !unique(race.grid.map(row => row?.driverId))
      || !race.grid.every((row, index) => record(row) && driverIds.has(row.driverId) && teamIds.has(row.teamId) && integer(row.timeMs, 1)
        && (s.phase === 'seasonReview'
          ? s.results[s.round].classification.some(held => held.driverId === row.driverId && held.teamId === row.teamId)
          : s.drivers.find(driver => driver.id === row.driverId)?.contract?.teamId === row.teamId)
        && (index === 0 || row.timeMs >= race.grid[index - 1].timeMs))
      || !Array.isArray(race.entries) || race.entries.length !== 20 || !unique(race.entries.map(row => row?.driverId))
      || !race.entries.every(entry => record(entry) && race.grid.some(row => row.driverId === entry.driverId && row.teamId === entry.teamId)
        && integer(entry.elapsedMs) && integer(entry.completedLaps, 0, race.lap) && TYRES.includes(entry.compound)
        && PACES.includes(entry.pace) && finite(entry.tyreWear, 0, 100) && integer(entry.stops, 0, 3)
        && (race.lap === 0 ? entry.status === 'running' && entry.completedLaps === 0 && entry.stops === 0
          : entry.status === 'retired' ? entry.completedLaps < race.lap : entry.completedLaps === race.lap)
        && ['running', 'retired', 'finished'].includes(entry.status) && (settled ? entry.status !== 'running' : entry.status !== 'finished'))) return invalid;
  }
  if (s.reserved !== reserve(s) || !record(s.upgradeCosts)) return invalid;
  const expectedQuotes = quotes(s);
  if (AREAS.some(area => s.upgradeCosts[area] !== expectedQuotes[area])) return invalid;
  const shape = lifecycleShape(s);
  if (shape === 'invalid') return invalid;
  const normalized = clone(s);
  normalizeContractSeasons(normalized);
  refreshMarket(normalized, shape === 'current');
  if (!safeMarket(normalized)
    || s.marketOffers !== undefined && !rowsMatch(s.marketOffers, normalized.marketOffers, OFFER_KEYS)
    || s.nextSeasonPlan !== undefined && !planMatches(s.nextSeasonPlan, normalized.nextSeasonPlan, shape === 'current')) return invalid;
  if (!normalizeHistory(normalized)) return invalid;
  if (shape === 'legacy') { initializeLifecycle(normalized); refreshMarket(normalized); }
  return { ok: true, state: normalized };
}

export function seasonScore(summary: { teamPoints: number; roundsBothDriversFinished: number; rounds: number }): number {
  if (!integer(summary.rounds, 1) || !integer(summary.teamPoints) || !integer(summary.roundsBothDriversFinished, 0, summary.rounds)) return 0;
  const raceMaximum = POINTS[0] + POINTS[1];
  return clamp(Math.round(80 * summary.teamPoints / (summary.rounds * raceMaximum) + 20 * summary.roundsBothDriversFinished / summary.rounds), 0, 100);
}

/* ────────────────────────────────────────────────────────────────────────────
   clubManagerEras.ts, the world clock for Club Manager (Round 132)

   Club Manager had no clock. It handed you the real August 2026 squads and,
   as far as the sim was concerned, those players were that good forever: the
   transfer market was the frozen 2026 universe in season one and in season
   twenty, and every AI club's strength was recomputed from the same baked
   rosters every single summer. So a thirty three year old was exactly as good
   in 2036 as he was in 2026, and the world never moved on to the next
   generation.

   This file is the clock. It owns three things and nothing else:

     1. The ageing curve. One curve, shared by the human squad and by the
        projected world, so nobody ages on different rules than anybody else
        (Round 95's lesson about the human team and the AI running on different
        numbers).
     2. Retirement. Players stop playing, on odds that depend on age, on how
        good they still are and on where they play, because keepers last and
        full backs do not.
     3. The projection. Take the real baked roster year and run it forward N
        years: everybody ages, some retire, and the holes are filled with
        players this game MADE UP. Those carry generated:true forever so every
        screen can say so out loud.

   ⚠ DATA HONESTY. This repo has exactly ONE set of real rosters, baked as of
   August 2026. That means:
     - Year zero is real. The projection at yearsOn 0 is the identity: the
       same names, the same ages, the same ratings, the same values.
     - The future is honest as a PROJECTION, and it is labelled as one. A real
       player aged forward is still a real player with a made up rating, and a
       generated player is not real at all. realNameShare() measures the split
       so the UI can print the true number rather than a vibe.
     - The PAST cannot be done here at all. There is no historical roster data
       in this codebase, so a 2010 Barcelona squad would be twenty five invented
       players wearing real names. That is exactly the thing the owner's number
       one rule forbids, so no past era is offered and the picker says why.

   Everything in here is a PURE function of its arguments. buildMarket runs
   inside a useMemo on every career change, so the projected world has to come
   out identical every time it is asked. No Math.random anywhere in this file.
   ──────────────────────────────────────────────────────────────────────────── */
import type { Position } from '@/types/game';
import { CM_ROSTERS, CM_ROSTER_META } from '@/data/clubManagerRosters';
import type { BakedPlayer } from '@/data/clubManagerRosters';

/**
 * The calendar year the baked rosters describe. CM_ROSTER_META.asOf reads
 * "August 2026, after the summer window", so season one of a default career is
 * 2026-27. simEras asserts these two agree, so a re-bake cannot silently
 * desync the clock from the data.
 */
export const CM_BASE_YEAR = 2026;

/** "2026-27" from 2026. Every screen that shows a season shows it like this. */
export function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

/* ================================================================== */
/* Deterministic randomness                                           */
/* ================================================================== */

/** FNV-1a over a string, then one xorshift round. Same string, same number. */
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h << 13; h >>>= 0;
  h ^= h >>> 17;
  h ^= h << 5; h >>>= 0;
  return h >>> 0;
}

/** Deterministic [0,1) for a seed string. */
function rnd(seed: string): number {
  return hash32(seed) / 4294967296;
}

/** Deterministic integer in [lo,hi] for a seed string. */
function rndInt(seed: string, lo: number, hi: number): number {
  return lo + Math.floor(rnd(seed) * (hi - lo + 1));
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/* ================================================================== */
/* The ageing curve                                                   */
/* ================================================================== */

const PACE_POS = new Set<Position>(['LW', 'RW', 'ST', 'CF', 'LB', 'RB', 'LWB', 'RWB']);
const ANCHOR_POS = new Set<Position>(['CB', 'CDM']);

/**
 * How hard the decline bites at this position.
 *
 * This is the bit that makes the curve look like football rather than like a
 * spreadsheet. A goalkeeper at thirty six is often at his peak and plenty play
 * past forty. A centre half or a holding midfielder ages on positioning, which
 * does not slow down. A winger, a striker or a full back ages on legs, and the
 * legs are the first thing to go. Growth is untouched by position: a nineteen
 * year old keeper improves like a nineteen year old anybody.
 */
export function declineScale(position: Position): number {
  if (position === 'GK') return 0.5;
  if (ANCHOR_POS.has(position)) return 0.8;
  if (PACE_POS.has(position)) return 1.15;
  return 0.92;
}

/**
 * The inclusive band a player's rating moves by in one year, at the age he is
 * turning. Growth is Round 116's curve, untouched, so nothing about young
 * player development or the eleven rounds of calibration on top of it moves.
 * Decline is the new part and it is a curve, not the flat minus two the game
 * used to run from thirty three all the way to forty three.
 *
 * MEASURED against the old engine, mean drift per season by attained age:
 *   old  30:-1.0  31:-1.0  32:-1.0  33:-2.0  34:-2.0  35:-2.0  36:-2.0  37:-2.0  38+:-2.0
 *   new  30:-0.5  31:-1.0  32:-1.5  33:-2.0  34:-2.5  35:-3.0  36:-3.5  37:-4.5  38+:-5.5
 * So the first year over thirty is gentler than it was, thirty three is
 * identical, and every year after that bends away. That is the shape of a real
 * decline: it starts as a nudge and it ends as a cliff.
 */
export function ageDriftBand(age: number): [number, number] {
  if (age <= 19) return [1, 4];
  if (age <= 21) return [1, 3];
  if (age <= 23) return [0, 3];
  if (age <= 26) return [0, 2];
  if (age <= 29) return [0, 1];
  if (age === 30) return [-1, 0];
  if (age === 31) return [-2, 0];
  if (age === 32) return [-2, -1];
  if (age === 33) return [-3, -1];
  if (age === 34) return [-4, -1];
  if (age === 35) return [-4, -2];
  if (age === 36) return [-5, -2];
  if (age === 37) return [-6, -3];
  return [-7, -4];
}

/**
 * The chance a player calls it a career this summer, given the age he is
 * turning, what he is still rated and where he plays.
 *
 * Anchored on how football actually empties out rather than on a number that
 * sounded about right. Almost nobody retires before thirty three. The bulk go
 * between thirty four and thirty seven. A player still good enough to start
 * for a big side hangs on longer than a squad filler on the same birthday,
 * which is why quality scales it down. Keepers get a long grace period. And
 * forty two is the wall: everybody is done.
 */
export function retireChance(age: number, rating: number, position: Position): number {
  if (age >= 42) return 1;
  if (age < 32) return 0;
  const byAge: Record<number, number> = {
    32: 0.01, 33: 0.03, 34: 0.06, 35: 0.12, 36: 0.22,
    37: 0.35, 38: 0.52, 39: 0.68, 40: 0.8, 41: 0.88,
  };
  const base = byAge[age] ?? 0.9;
  const quality = rating >= 85 ? 0.5 : rating >= 78 ? 0.72 : rating >= 70 ? 1 : rating >= 62 ? 1.25 : 1.5;
  const keeper = position === 'GK' ? 0.6 : 1;
  return clamp(base * quality * keeper, 0, 1);
}

/**
 * The chance a player is simply not in one of these nine leagues next season,
 * for any reason that is not retirement: sold to a league this game does not
 * model, dropped a division, went to Turkey, never made it.
 *
 * This exists because the first version of the projection did not have it, and
 * ten simulated years turned every squad in the game into a retirement home.
 * Retirement alone is far too rare before thirty three to keep a squad young,
 * so squads aged from a mean of 25.2 to 29.6 and the future eras looked wrong
 * at a glance.
 *
 * The numbers are FITTED to the real thing rather than invented. The baked
 * 2942 player dataset is a snapshot of a stable population, so the ratio of
 * one age band to the next IS the survival rate of these leagues. Measured off
 * the bake: 8.3% of players are 27 and 7.8% are 28 (a 6% annual loss), 7.8%
 * are 28 and 5.4% are 29 (31%), 2.7% are 32 and 2.0% are 33 (26%), 2.0% are 33
 * and 1.1% are 34 (45%). Those are the numbers below, smoothed, and scaled by
 * how good the player still is, because a squad filler is the one who drops a
 * division and a star is not.
 */
export function dropOutChance(age: number, rating: number, position: Position): number {
  const byAge: Record<number, number> = {
    16: 0.09, 17: 0.09, 18: 0.09, 19: 0.09, 20: 0.09, 21: 0.09, 22: 0.1, 23: 0.1,
    24: 0.1, 25: 0.1, 26: 0.11, 27: 0.13, 28: 0.17, 29: 0.2, 30: 0.22,
    31: 0.24, 32: 0.26, 33: 0.3, 34: 0.36, 35: 0.4,
  };
  const base = age >= 36 ? 0.4 : (byAge[age] ?? 0.09);
  // The spread here is wide on purpose. Attrition in football is not spread
  // evenly across a squad: the players who quietly stop appearing in these
  // leagues are the fringe ones, and the very best are still there ten years
  // later. A narrow spread made the projection eat real stars at the same rate
  // as squad fillers, which read as wrong the moment you looked at a 2031
  // Liverpool and could not find anybody.
  const quality = rating >= 88 ? 0.16 : rating >= 85 ? 0.24 : rating >= 82 ? 0.36 : rating >= 79 ? 0.5
    : rating >= 76 ? 0.7 : rating >= 72 ? 0.95 : rating >= 68 ? 1.35 : 1.9;
  const keeper = position === 'GK' ? 0.8 : 1;
  return clamp(base * quality * keeper, 0, 0.9);
}

/** Retirement and dropping out, combined: the chance he is gone from the game. */
export function worldExitChance(age: number, rating: number, position: Position): number {
  return 1 - (1 - retireChance(age, rating, position)) * (1 - dropOutChance(age, rating, position));
}

/**
 * The age a made up player walks into a squad at, weighted the way real intake
 * actually is: mostly late teens and very early twenties, tailing off fast.
 * Reading straight off the bake, the 19 to 23 band is where clubs restock.
 */
const ENTRY_AGE_WEIGHTS: [number, number][] = [
  [17, 4], [18, 9], [19, 13], [20, 15], [21, 14], [22, 13], [23, 11], [24, 9], [25, 7], [26, 5],
];
const ENTRY_AGE_TOTAL = ENTRY_AGE_WEIGHTS.reduce((s, [, w]) => s + w, 0);

function entryAge(seed: string): number {
  let roll = rnd(seed) * ENTRY_AGE_TOTAL;
  for (const [age, w] of ENTRY_AGE_WEIGHTS) {
    roll -= w;
    if (roll <= 0) return age;
  }
  return 21;
}

/* ================================================================== */
/* Made up players                                                    */
/* ================================================================== */

/**
 * Names for the players this game invents. Deliberately a wide international
 * spread, because a 2041 Premier League drawn from twenty English surnames
 * would look sillier than the thing it is replacing. Nothing in here is a real
 * footballer: makeGeneratedName re-rolls if a combination collides with a name
 * in the baked data, so a made up player can never be mistaken for a real one.
 */
const GEN_FIRST = [
  'Aaron', 'Adem', 'Adrian', 'Ailton', 'Ake', 'Alan', 'Alfie', 'Alvaro', 'Amadou', 'Anders',
  'Andre', 'Anton', 'Arda', 'Ari', 'Armel', 'Arne', 'Aron', 'Asier', 'Aurel', 'Axel',
  'Baptiste', 'Bilal', 'Bo', 'Boris', 'Bruno', 'Caio', 'Callum', 'Cesar', 'Cheick', 'Ciro',
  'Colm', 'Dario', 'Davi', 'Dennis', 'Diogo', 'Dominik', 'Eero', 'Elias', 'Emil', 'Enrique',
  'Erik', 'Ethan', 'Ezra', 'Fabio', 'Felipe', 'Ferran', 'Filip', 'Finn', 'Florent', 'Gabriel',
  'Gani', 'Gino', 'Goran', 'Gustav', 'Hakan', 'Harvey', 'Hugo', 'Ibrahim', 'Idris', 'Ignacio',
  'Ilias', 'Iker', 'Ionut', 'Isaac', 'Ismael', 'Ivo', 'Jaden', 'Jarne', 'Jasper', 'Javier',
  'Jesper', 'Joaquin', 'Jonas', 'Jorge', 'Joris', 'Juan', 'Kai', 'Kalle', 'Karim', 'Kasper',
  'Keanu', 'Kelvin', 'Kian', 'Kimi', 'Kwame', 'Lars', 'Lasse', 'Lautaro', 'Levi', 'Liam',
  'Lorenzo', 'Louis', 'Lucas', 'Ludo', 'Maceo', 'Malik', 'Manu', 'Marek', 'Mateo', 'Mathis',
  'Matteo', 'Maxim', 'Mehdi', 'Miro', 'Moise', 'Musa', 'Nabil', 'Nando', 'Nico', 'Nikola',
  'Noel', 'Odin', 'Oliwier', 'Omar', 'Onur', 'Otto', 'Pablo', 'Pau', 'Pedro', 'Pelle',
  'Quentin', 'Rafa', 'Rasmus', 'Reece', 'Remi', 'Rian', 'Rico', 'Rodri', 'Ronan', 'Ruben',
  'Salim', 'Samir', 'Sander', 'Seb', 'Selim', 'Sergi', 'Silas', 'Simao', 'Sven', 'Tadeo',
  'Taye', 'Teo', 'Thiago', 'Timo', 'Tobias', 'Tomas', 'Tunde', 'Ugo', 'Valentin', 'Viktor',
  'Vito', 'Wesley', 'Wout', 'Yannick', 'Yaya', 'Youri', 'Zaid', 'Zeke', 'Zico', 'Zoran',
];

const GEN_LAST = [
  'Abara', 'Adeyemi', 'Aguirre', 'Ahlberg', 'Akande', 'Alonso', 'Amaral', 'Andrade', 'Antunes', 'Arslan',
  'Bakker', 'Balogun', 'Bardhi', 'Barros', 'Beck', 'Bergstrom', 'Bertrand', 'Bianchi', 'Boateng', 'Bogdan',
  'Bonucci', 'Bosco', 'Bouhaddi', 'Brandt', 'Bruns', 'Cabral', 'Caldeira', 'Camara', 'Cardoso', 'Carrasco',
  'Castillo', 'Cerny', 'Chukwu', 'Coelho', 'Colombo', 'Conte', 'Cordero', 'Costache', 'Crnkovic', 'Dahl',
  'Danielsen', 'Dembo', 'Diallo', 'Diarra', 'Dieng', 'Dijkstra', 'Doherty', 'Dovbyk', 'Drago', 'Duarte',
  'Eriksen', 'Escobar', 'Esposito', 'Falk', 'Faye', 'Fernandes', 'Ferrari', 'Fischer', 'Fonseca', 'Fortuna',
  'Gallardo', 'Garrido', 'Gerber', 'Gilbert', 'Gomes', 'Granados', 'Grimaldo', 'Gudmundsson', 'Guerrero', 'Haas',
  'Halilovic', 'Hansen', 'Hartmann', 'Hedlund', 'Herrera', 'Hofmann', 'Ibarra', 'Idrissi', 'Ilic', 'Iversen',
  'Jankovic', 'Jansen', 'Jelic', 'Jimenez', 'Johansen', 'Kabore', 'Kalu', 'Karlsson', 'Kaya', 'Keita',
  'Kessler', 'Kimura', 'Klein', 'Kolar', 'Konate', 'Kovacic', 'Kruger', 'Laakso', 'Lacroix', 'Lampe',
  'Larsen', 'Lehmann', 'Leite', 'Lima', 'Lindgren', 'Lorenzi', 'Lozano', 'Machado', 'Maes', 'Magnusson',
  'Mancini', 'Marchetti', 'Marino', 'Martel', 'Mbeki', 'Medina', 'Mendes', 'Mensah', 'Merino', 'Miranda',
  'Molina', 'Monteiro', 'Moreau', 'Mucci', 'Muller', 'Nakamura', 'Navarro', 'Ndiaye', 'Nielsen', 'Njoku',
  'Novak', 'Nowak', 'Nunes', 'Obi', 'Ohlsson', 'Okoro', 'Olsen', 'Ortega', 'Osei', 'Paredes',
  'Pavlik', 'Pereira', 'Petrov', 'Pinto', 'Popescu', 'Prieto', 'Quaresma', 'Radic', 'Ramires', 'Rasmussen',
  'Reyes', 'Ricci', 'Rocha', 'Roman', 'Rosales', 'Rossi', 'Ruiz', 'Saarinen', 'Sagna', 'Salcedo',
  'Sanchez', 'Santoro', 'Sarr', 'Schmid', 'Segura', 'Seydou', 'Silva', 'Sinclair', 'Soares', 'Sokolov',
  'Solberg', 'Sousa', 'Stankovic', 'Steiner', 'Sundberg', 'Tamm', 'Tavares', 'Teixeira', 'Thiam', 'Toure',
  'Trevisan', 'Ubeda', 'Ugarte', 'Vainio', 'Valdes', 'Vandermeer', 'Varela', 'Vasquez', 'Veloso', 'Vermeer',
  'Vidal', 'Vieira', 'Vogel', 'Wagner', 'Walsh', 'Weber', 'Wilms', 'Yildiz', 'Zabala', 'Zeman',
];

let REAL_NAME_SET: Set<string> | null = null;

/** Every name that appears anywhere in the baked real data. */
function realNames(): Set<string> {
  if (REAL_NAME_SET) return REAL_NAME_SET;
  const set = new Set<string>();
  for (const roster of Object.values(CM_ROSTERS)) {
    for (const p of roster) set.add(p.n);
  }
  REAL_NAME_SET = set;
  return set;
}

/**
 * A name for an invented player. Deterministic from the seed, and guaranteed
 * never to be the name of a real player in the dataset: if the roll collides
 * it walks the pool until it does not. That matters more than it sounds. A
 * made up "Jude Bellingham" in a 2041 squad would be a lie sitting right next
 * to a truth, which is the worst version of this whole feature.
 */
export function makeGeneratedName(seed: string): string {
  const real = realNames();
  const f0 = hash32(`${seed}|f`) % GEN_FIRST.length;
  const l0 = hash32(`${seed}|l`) % GEN_LAST.length;
  for (let i = 0; i < GEN_LAST.length; i++) {
    const name = `${GEN_FIRST[f0]} ${GEN_LAST[(l0 + i) % GEN_LAST.length]}`;
    if (!real.has(name)) return name;
  }
  return `${GEN_FIRST[f0]} ${GEN_LAST[l0]}`;
}

/* ================================================================== */
/* The projected world                                                */
/* ================================================================== */

/**
 * One player in a projected roster.
 *
 * `generated` is the whole honesty story in one boolean. False means this is a
 * real footballer from the August 2026 data, whose age and rating this game has
 * moved forward. True means this game invented him, name and all.
 */
export interface ProjectedPlayer {
  /** Full name. */
  n: string;
  /** Position. */
  p: Position;
  /** Age in the projected year. */
  a: number;
  /** Market value in £m, projected. */
  v: number;
  /** Game rating. */
  r: number;
  /** True if this game made him up. Absent on real players. */
  g?: boolean;
  /**
   * The level of the squad slot he occupies, carried from the real player who
   * held it in 2026. This is the mean reversion handle: it keeps a big club
   * big and a small club small however many generations pass through it.
   */
  anchor: number;
  /** Which projected year he first appeared. Real players are year 0. */
  since: number;
}

/** How a projected club's values relate to the raw curve, from its real data. */
function valueScaleFor(club: string, baked: BakedPlayer[]): number {
  // Round 105's lesson, applied to a different number: anchor on the squad you
  // were handed. A generated player's value has to sit on the same scale as
  // the real values in the same league, so it is derived from this club's own
  // ratio of real market value to raw curve value rather than from the curve.
  if (!baked.length) return 1;
  const ratios = baked
    .map(b => b.v / Math.max(0.5, rawCurveValue(b.r, b.a)))
    .sort((x, y) => x - y);
  return ratios[Math.floor(ratios.length / 2)] || 1;
}

/**
 * The raw rating+age value curve, duplicated from clubManager's baseValue on
 * purpose so this file imports nothing from the engine and the engine can
 * import this one without a cycle. simEras asserts the two agree exactly.
 */
export function rawCurveValue(rating: number, age: number): number {
  const mv = Math.pow(10, ((rating - 35) * Math.log10(1001)) / 64) - 1;
  const ageF =
    age <= 21 ? 1.3 :
    age <= 24 ? 1.15 :
    age <= 28 ? 1.0 :
    age <= 31 ? 0.7 :
    age <= 34 ? 0.4 : 0.2;
  return Math.max(0.5, mv * ageF);
}

/** One year on for one projected player. Null means he is gone from the game. */
function ageOne(club: string, pl: ProjectedPlayer, year: number, scale: number): ProjectedPlayer | null {
  const age = pl.a + 1;
  const key = `${club}|${pl.n}|${year}`;
  if (rnd(`${key}|ret`) < worldExitChance(age, pl.r, pl.p)) return null;
  const [lo, hi] = ageDriftBand(age);
  let drift = rndInt(`${key}|drift`, lo, hi);
  if (drift < 0) drift = Math.round(drift * declineScale(pl.p));
  if (drift > 0) {
    // Nobody grows past the level of the slot he is in by more than a little.
    // This is what stops a projected Wrexham squad from quietly becoming the
    // best side in Europe over fifteen simulated years.
    drift = Math.min(drift, Math.max(0, pl.anchor + 4 - pl.r));
  }
  const r = clamp(pl.r + drift, 40, 94);
  return { ...pl, a: age, r, v: Math.max(0.2, Math.round(rawCurveValue(r, age) * scale * 10) / 10) };
}

/**
 * A made up player for a slot that has just emptied. He walks in at the age a
 * club actually signs or promotes players, a bit short of the slot's level,
 * with room to grow into it.
 */
function generateFor(club: string, slot: ProjectedPlayer, year: number, idx: number, scale: number): ProjectedPlayer {
  const seed = `${club}|${year}|${idx}|${slot.p}`;
  const age = entryAge(`${seed}|age`);
  // The slot drifts a little each generation so clubs are not frozen either,
  // but it is fenced so the drift is a wobble and not a trend.
  const anchor = clamp(slot.anchor + rndInt(`${seed}|anch`, -2, 2), slot.anchor - 5, slot.anchor + 5);
  const green = Math.round(Math.max(0, 25 - age) * 0.9);
  const r = clamp(anchor - green + rndInt(`${seed}|r`, -2, 2), 45, 94);
  return {
    n: makeGeneratedName(seed),
    p: slot.p,
    a: age,
    r,
    v: Math.max(0.2, Math.round(rawCurveValue(r, age) * scale * 10) / 10),
    g: true,
    anchor,
    since: year,
  };
}

const WORLD_CACHE = new Map<number, Record<string, ProjectedPlayer[]>>();

/**
 * The whole football world, N years on from the baked roster year.
 *
 * yearsOn 0 is the identity: exactly the real August 2026 data, same names,
 * same ages, same ratings, same values, nothing touched. That is deliberate
 * and it is asserted in simEras, because it is the thing that guarantees a
 * default career in the current era plays exactly as it did before this round
 * and none of the eleven rounds of scoreline calibration moved.
 */
export function projectedWorld(yearsOn: number): Record<string, ProjectedPlayer[]> {
  const y = Math.max(0, Math.round(yearsOn));
  const hit = WORLD_CACHE.get(y);
  if (hit) return hit;
  const out: Record<string, ProjectedPlayer[]> = {};
  for (const [club, baked] of Object.entries(CM_ROSTERS)) {
    const scale = valueScaleFor(club, baked);
    let roster: ProjectedPlayer[] = baked.map(b => ({
      n: b.n, p: b.p, a: b.a, v: b.v, r: b.r, anchor: b.r, since: 0,
    }));
    const target = roster.length;
    for (let year = 1; year <= y; year++) {
      const kept: ProjectedPlayer[] = [];
      const emptied: ProjectedPlayer[] = [];
      for (const pl of roster) {
        const next = ageOne(club, pl, year, scale);
        if (next) kept.push(next); else emptied.push(pl);
      }
      // Every slot that emptied gets filled the same summer. A real club does
      // not carry a hole in its squad for a decade, and "no club runs out of
      // players" is one of the things this round has to hold true twenty
      // seasons out.
      emptied.forEach((slot, i) => kept.push(generateFor(club, slot, year, i, scale)));
      while (kept.length < target && emptied.length) {
        kept.push(generateFor(club, emptied[kept.length % emptied.length], year, kept.length + 50, scale));
      }
      // Value descending, which is the order the bake itself is in, because
      // buildSquad takes the top 26 off the front of this list and a career in
      // the current era has to get byte for byte the squad it always got.
      roster = kept.sort((a, b) => b.v - a.v || b.r - a.r || a.n.localeCompare(b.n));
    }
    out[club] = roster;
  }
  WORLD_CACHE.set(y, out);
  return out;
}

/** The projected roster for one club, or an empty list if it is not in the data. */
export function projectedRoster(club: string, yearsOn: number): ProjectedPlayer[] {
  return projectedWorld(yearsOn)[club] ?? [];
}

/** Best XI average of a projected roster. Null when there is no data at all. */
export function projectedXIAvg(club: string, yearsOn: number): number | null {
  const roster = projectedRoster(club, yearsOn);
  if (!roster.length) return null;
  const rs = roster.map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  while (rs.length < 11) rs.push(60);
  return Math.round((rs.reduce((s, r) => s + r, 0) / 11) * 10) / 10;
}

/**
 * How much of the projected world is still real people, as a share of players
 * from 0 to 1. This is what the era picker prints, so the number a player
 * reads is measured off the actual projection rather than written by hand.
 */
export function realNameShare(yearsOn: number): number {
  const world = projectedWorld(yearsOn);
  let real = 0;
  let all = 0;
  for (const roster of Object.values(world)) {
    for (const p of roster) { all += 1; if (!p.g) real += 1; }
  }
  return all ? real / all : 0;
}

/**
 * The same measurement, but only over the eleven best players at each club:
 * the people you actually put on a teamsheet or line up against. It runs
 * higher than the squad wide number because attrition eats fringe players
 * first, and it is the honest answer to "how much of this will I recognise",
 * which is the question somebody picking an era is really asking. Both numbers
 * go on the picker so neither one is doing any spinning.
 */
export function realStarterShare(yearsOn: number): number {
  const world = projectedWorld(yearsOn);
  let real = 0;
  let all = 0;
  for (const roster of Object.values(world)) {
    const xi = [...roster].sort((a, b) => b.r - a.r).slice(0, 11);
    for (const p of xi) { all += 1; if (!p.g) real += 1; }
  }
  return all ? real / all : 0;
}

/* ================================================================== */
/* Eras                                                               */
/* ================================================================== */

export interface CMEra {
  id: string;
  /** "2026-27". */
  label: string;
  /** Calendar year season one runs in. */
  startYear: number;
  emoji: string;
  /** The short pitch. */
  blurb: string;
  /** What is real here and what is not, in plain words. Always shown. */
  honesty: string;
}

/**
 * Every era this game can honestly offer, and no others.
 *
 * Round 139, and this list got shorter on the owner's direct instruction
 * (2026-08-16): "u could take control of diffrent teams in diffrent eras
 * meaning current or the pass. Not the future since we dont know the future.
 * So please remove that." So the plus5, plus10 and plus15 future starts that
 * Round 132 offered are gone. He is right about what they were: a projection
 * dressed up as a start date. The projection ENGINE below survives in full,
 * because it has a legitimate job this list never changed: a save that starts
 * today and runs deep still needs the world to age, retire and refill around
 * it, season by season, inside the sim.
 *
 * The PAST is the part he actually wants, and it is now genuinely buildable:
 * the Supabase table player_market_values holds real Transfermarkt history,
 * about six thousand real named players a year, every year back to 2004,
 * over a thousand clubs a year (measured 2026-08-16). A 2010 era built from
 * that is real data with thin patches, not invention. It needs its own baking
 * round (per-year rosters plus per-year league memberships, promotions and
 * relegations applied), so it is on the roadmap rather than in this array.
 * Until that bake lands, today is the only start the data supports, and the
 * picker says so out loud rather than quietly leaving a gap.
 */
export const CM_ERAS: CMEra[] = [
  {
    id: 'now',
    label: seasonLabel(CM_BASE_YEAR),
    startYear: CM_BASE_YEAR,
    emoji: '\u{1F4C5}',
    blurb: 'Today. Every squad exactly as it really is.',
    honesty: 'Real data. Every name, age and value is the real thing as of August 2026.',
  },
];

export const DEFAULT_ERA_ID = 'now';

export function eraById(id: string | undefined): CMEra {
  return CM_ERAS.find(e => e.id === id) ?? CM_ERAS[0];
}

/** The era a start year belongs to, for a save that only stored the year. */
export function eraForYear(year: number): CMEra {
  return CM_ERAS.find(e => e.startYear === year) ?? CM_ERAS[0];
}

/**
 * The honest one liner for an era tile, with the REAL measured share of real
 * players in it rather than a guess. Recomputed from the projection, so if the
 * curve is ever retuned the copy retunes itself.
 */
export function eraRealShareLabel(era: CMEra): string {
  const pct = Math.round(realStarterShare(era.startYear - CM_BASE_YEAR) * 100);
  if (pct >= 100) return 'Every player is real';
  if (pct <= 2) return 'Real clubs, made up players';
  return `${pct}% of first team players are real`;
}

/** The long version, both measurements, for the picker footnote. */
export function eraHonestyLine(era: CMEra): string {
  const yearsOn = era.startYear - CM_BASE_YEAR;
  if (yearsOn === 0) return era.honesty;
  const starters = Math.round(realStarterShare(yearsOn) * 100);
  const all = Math.round(realNameShare(yearsOn) * 100);
  return `${era.honesty} Measured right now: ${starters}% of first team players and ${all}% of all squad players are real footballers.`;
}

/** Sanity handle for the harness: the meta the clock is anchored on. */
export const CM_CLOCK_META = {
  baseYear: CM_BASE_YEAR,
  rosterAsOf: CM_ROSTER_META.asOf,
};

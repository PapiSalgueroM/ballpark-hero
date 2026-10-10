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
     - The PAST is real where, and only where, a real bake backs it. Round 146
       added clubManagerEra2010.ts: real year-2010 rows for the 2010-11
       Premier League and La Liga, so THAT past is offered. Any past without
       its own bake stays impossible, because a 2000 Barcelona squad would be
       invented players wearing real names, which the owner's number one rule
       forbids.

   Everything in here is a PURE function of its arguments. buildMarket runs
   inside a useMemo on every career change, so the projected world has to come
   out identical every time it is asked. No Math.random anywhere in this file.
   ──────────────────────────────────────────────────────────────────────────── */
import type { Position } from '@/types/game';
import { CM_ROSTER_META } from '@/data/clubManagerRosters';
import type { BakedPlayer } from '@/data/clubManagerRosters';
import { advanceClubManagerTrajectory } from '@/lib/clubManagerTrajectory';
// Round 1035: the modern squads, baked plus the A-League Men, joined once.
import { CM_WORLD_ROSTERS as CM_ROSTERS } from '@/data/clubManagerWorldRosters';
import { loadNationalityWorld, registerNationalityWorld } from '@/data/playerNationalities';
/* Round 832: the three era bakes are no longer imported here. Each one is its
   own chunk, fetched when its era is picked or an era save is opened (see
   ensureEraRosters below), so the page stops carrying all three past worlds
   for a player who only ever plays today's. */

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

/** Every name that appears anywhere in the baked real data, every era.
 *  Round 146: historic bakes joined the set, so a generated player can never
 *  wear the name of a real 2010 footballer either. */
/**
 * Round 199: five names that are real people on OTHER parts of this site.
 *
 * The guard below builds its blocklist from the Club Manager rosters, which
 * is the right universe for a Club Manager era world and misses everybody
 * else the site ships. An enumeration of all 32,000 combinations against
 * every real name in src/data found exactly five pairings that this
 * generator could still emit: an NFL centre, an NHL defenceman, an MLB
 * infielder, a Danish midfielder from a league Club Manager does not carry,
 * and a Brazilian defender no longer in the modern rosters. Five names, so
 * they are listed rather than gutting five useful surnames out of the pool.
 * simInventedNames recomputes this set from the data on every suite run and
 * fails if it is ever incomplete.
 */
const ALSO_REAL_ELSEWHERE = [
  'Cesar Ruiz', 'Erik Karlsson', 'Isaac Paredes', 'Rasmus Falk', 'Thiago Silva',
  /* Round 876: the 2026 window re-bake brought Alan Varela and Manu Silva
     into the modern rosters ahead of the nationality map the harness reads,
     and took Pedro Lima out of them (on loan at Sao Paulo) while the site
     still ships him elsewhere. Listing a man the rosters also carry is
     harmless: the set is a union. */
  'Alan Varela', 'Manu Silva', 'Pedro Lima',
  /* Round 876, Brazil: Bruno Gomes (a right back in the Serie A rosters) is
     not in the nationality map the harness reads either. */
  'Bruno Gomes',
  /* Round 883, Liga MX: two Mexican league men the nationality map the
     harness reads does not carry yet. */
  'Alan Medina', 'Javier Ruiz',
  /* Round 899: Kian Hansen, the Danish defender, left the 2015-16 world in
     its second review fix (Nantes to Midtjylland, May 2015) and is in no
     Club Manager world now. He is still a real man, and listing him here
     keeps the guard's set exactly what it was, so no seed re-rolls. */
  'Kian Hansen',
  /* Round 1015: Rafa Soares, the Portuguese left back, is withheld from
     every modern squad until two sources say where he plays (off the 2026-27
     Famalicao squad, probably at Estrela). Still a real man, so listing him
     keeps the set of the guard as it was and no seed re-rolls. */
  'Rafa Soares',
  /* Round 1052: Ismael Silva, a Brazilian midfielder born 1994-12-01, is in
     Akhmat Grozny's 2026-27 squad on three lists (the Russian Premier League
     joined the modern world in that round), and this generator could build
     his name. simInventedNames found him the moment his squad file existed. */
  'Ismael Silva',
];

/**
 * Round 832: every real player in the three era bakes whose name this
 * generator could build (a GEN_FIRST name, a space, a GEN_LAST name). The
 * guard used to read the era rosters themselves, which only ever mattered for
 * these few (eleven then, fourteen since Round 899), because the generator
 * can produce nothing else. The era
 * rosters now load with their era, so reading them here would make a name
 * depend on which eras this tab happened to open, and a modern save would
 * re-roll differently after a look at 2010. This list keeps the guard exactly
 * what it was without loading anything. simCmLeagueRules recomputes it from
 * the era files and fails unless it matches exactly, so a new era bake that
 * adds a colliding name goes red until the name is here.
 */
export const ERA_NAMES_THE_FILLER_COULD_BUILD = [
  'Bruno Fernandes', 'Gabriel Silva', 'Hugo Ibarra', 'Javier Garrido', 'Javier Paredes', 'Jorge Andrade',
  'Lorenzo Reyes', 'Lucas Silva', 'Mateo Kovacic', 'Pedro Mendes', 'Pedro Pereira',
  /* Round 899: the 2015-16 Bundesliga and Ligue 1 brought three more real men
     the generator could have named a made up youth after. (Jonas Hofmann
     left the era world in the review fix, back at Dortmund that summer; the
     2026 rosters still carry him, so the filler still cannot build him. Kian
     Hansen left it in the second review fix, Nantes to Midtjylland in May
     2015, and moved to ALSO_REAL_ELSEWHERE so the guard's set is unchanged.) */
  'Jesper Hansen', 'Thiago Silva', 'Yannick Carrasco',
  /* Round 902: the 2005-06 Serie A, Bundesliga and Ligue 1 brought four more. */
  'Lucas Pereira', 'Matteo Ferrari', 'Pablo Thiam', 'Yannick Fischer',
  /* Round 971: the 2020-21 big five holds four more real men the generator
     could build. Jonas Hofmann (Gladbach) and Juan Miranda (Schalke) are in
     the 2026 rosters too, so the guard's set does not change for them; Matteo
     Ricci (Spezia) and Thiago Mendes (Lyon) are new to it, so a made up
     youth who would have carried one of those two names now re-rolls, the
     one change this list makes to a seed's name. */
  'Jonas Hofmann', 'Juan Miranda', 'Matteo Ricci', 'Thiago Mendes',
];

function realNames(): Set<string> {
  if (REAL_NAME_SET) return REAL_NAME_SET;
  const set = new Set<string>();
  for (const roster of Object.values(CM_ROSTERS)) {
    for (const p of roster) set.add(p.n);
  }
  for (const n of ERA_NAMES_THE_FILLER_COULD_BUILD) set.add(n);
  for (const n of ALSO_REAL_ELSEWHERE) set.add(n);
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
  /** Save-scoped simulated development ceiling, absent on the original world. */
  potential?: number;
  /** Original source identity, carried unchanged when a player moves. */
  worldRosterKey?: string;
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
function ageOne(club: string, pl: ProjectedPlayer, year: number, scale: number, worldSeed?: number): ProjectedPlayer | null {
  const age = pl.a + 1;
  const key = `${club}|${pl.n}|${year}`;
  if (rnd(`${key}|ret`) < worldExitChance(age, pl.r, pl.p)) return null;
  if (worldSeed !== undefined && pl.worldRosterKey) {
    const next = advanceClubManagerTrajectory(pl, { seed: worldSeed, identity: pl.worldRosterKey, year,
      ageBand: ageDriftBand(age), declineScale: declineScale(pl.p) });
    return { ...next, v: Math.max(0.2, Math.round(rawCurveValue(next.r, next.a) * scale * 10) / 10) };
  }
  const [lo, hi] = ageDriftBand(age);
  let drift = rndInt(`${key}|drift`, lo, hi);
  if (drift < 0) drift = Math.round(drift * declineScale(pl.p));
  if (drift > 0) {
    // Nobody grows past the level of the slot he is in by more than a little.
    // This is what stops a projected Wrexham squad from quietly becoming the
    // best side in Europe over fifteen simulated years.
    drift = Math.min(drift, Math.max(0, pl.anchor + 4 - pl.r));
  }
  /* Round 166: the 94 ceiling assumed no anchor above 90 exists. Era
     legends sit above it now, so the ceiling follows the slot: a modern
     anchor still caps exactly where it always did, an uplifted era anchor
     gets its own headroom and never snaps down to 94 at the first summer. */
  const r = clamp(pl.r + drift, 40, Math.max(94, pl.anchor + 4));
  return { ...pl, a: age, r, v: Math.max(0.2, Math.round(rawCurveValue(r, age) * scale * 10) / 10) };
}

/**
 * A made up player for a slot that has just emptied. He walks in at the age a
 * club actually signs or promotes players, a bit short of the slot's level,
 * with room to grow into it.
 */
function generateFor(club: string, slot: ProjectedPlayer, year: number, idx: number, scale: number, trajectoryEra?: string): ProjectedPlayer {
  const seed = `${club}|${year}|${idx}|${slot.p}`;
  const name = makeGeneratedName(seed);
  const age = entryAge(`${seed}|age`);
  // The slot drifts a little each generation so clubs are not frozen either,
  // but it is fenced so the drift is a wobble and not a trend.
  const anchor = clamp(slot.anchor + rndInt(`${seed}|anch`, -2, 2), slot.anchor - 5, slot.anchor + 5);
  const green = Math.round(Math.max(0, 25 - age) * 0.9);
  const r = clamp(anchor - green + rndInt(`${seed}|r`, -2, 2), 45, 94);
  return {
    n: name,
    p: slot.p,
    a: age,
    r,
    v: Math.max(0.2, Math.round(rawCurveValue(r, age) * scale * 10) / 10),
    g: true,
    anchor,
    since: year,
    ...(trajectoryEra === undefined ? {} : { worldRosterKey: JSON.stringify([
      trajectoryEra, club, name, slot.p, eraById(trajectoryEra).startYear + year - age, year,
    ]) }),
  };
}

/* ================================================================== */
/* Historic era backing (Round 146)                                   */
/* ================================================================== */

/**
 * Round 146: the first PAST era, and the reason the ⚠ DATA HONESTY note
 * above stopped saying the past cannot be done. It can now, because the
 * 2010-11 world was baked from real year-2010 rows (see
 * scripts/bakeEra2010.mjs). Each entry here is a complete separate world:
 * the era decides which roster file is read, so the engine's one name, one
 * player rule holds WITHIN each era while Messi exists in both at different
 * ages.
 */
/* Round 832: each era's bake is fetched on demand. One loader per era id,
   and this table is what makes an era id historic, so an era exists from the
   first line of code whether or not its squads have arrived yet. A new era is
   one more row here pointing at its own bake file. */
/* Round 1042: an era's nationalities arrive in the same promise (ensureEraRosters below). Where
   every piece of Club Manager's data lives and what loads when: the top of
   src/data/playerNationalities.ts. Read it before adding a league or a season. */
interface EraBake { rosters: Record<string, BakedPlayer[]>; partial: string[]; players: number }
const ERA_BAKES: Record<string, () => Promise<EraBake>> = {
  era2010: () => import('@/data/clubManagerEra2010').then(m => ({ rosters: m.ERA2010_ROSTERS, partial: m.ERA2010_PARTIAL, players: m.ERA2010_META.players })),
  era2015: () => import('@/data/clubManagerEra2015').then(m => ({ rosters: m.ERA2015_ROSTERS, partial: m.ERA2015_PARTIAL, players: m.ERA2015_META.players })),
  era2005: () => import('@/data/clubManagerEra2005').then(m => ({ rosters: m.ERA2005_ROSTERS, partial: m.ERA2005_PARTIAL, players: m.ERA2005_META.players })),
  /* Round 971: the 2020-21 big five, its own chunk like the other three. */
  era2020: () => import('@/data/clubManagerEra2020').then(m => ({ rosters: m.ERA2020_ROSTERS, partial: m.ERA2020_PARTIAL, players: m.ERA2020_META.players })),
};

/** The era bakes that have arrived, keyed by era id. Filled by
 *  ensureEraRosters; an era that has not loaded has no entry. */
export const HISTORIC_ROSTERS: Record<string, Record<string, BakedPlayer[]>> = {};

/** The thin squads of each arrived era (the picker marks them). */
export const HISTORIC_PARTIAL: Record<string, string[]> = {};

const ERA_PLAYERS: Record<string, number> = {};
const ERA_LOADING = new Map<string, Promise<void>>();

export function isHistoricEra(id: string | undefined): boolean {
  return !!id && Object.prototype.hasOwnProperty.call(ERA_BAKES, id);
}

/** True when the engine can run this era right now: today's world always,
 *  a historic era once its bake has arrived. */
export function eraRostersLoaded(id: string | undefined): boolean {
  return !isHistoricEra(id) || Object.prototype.hasOwnProperty.call(HISTORIC_ROSTERS, id!);
}

/**
 * Round 832: fetch an era's squads before anything reads them. Resolves at
 * once for today's world and for an era already here; two calls for the same
 * era share one fetch. A failed fetch (offline, a dropped connection, a deploy
 * that replaced the chunk) rejects and is forgotten, so the next call tries
 * again, which is what the page's retry button relies on.
 */
export function ensureEraRosters(id: string | undefined): Promise<void> {
  if (eraRostersLoaded(id)) return Promise.resolve();
  const eraId = id!;
  const inFlight = ERA_LOADING.get(eraId);
  if (inFlight) return inFlight;
  const p = Promise.all([ERA_BAKES[eraId](), loadNationalityWorld(eraId)]).then(([bake, nationalities]) => {
    /* Round 1042: the era's nationalities arrive with its squads and are registered FIRST, so
       nothing can read a loaded era without them (nationBars caches a world's call up bars). */
    registerNationalityWorld(eraId, nationalities);
    HISTORIC_ROSTERS[eraId] = bake.rosters;
    HISTORIC_PARTIAL[eraId] = bake.partial;
    ERA_PLAYERS[eraId] = bake.players;
    ERA_LOADING.delete(eraId);
  }, err => {
    ERA_LOADING.delete(eraId);
    throw err;
  });
  ERA_LOADING.set(eraId, p);
  return p;
}

/** Every era at once, for the harnesses that walk all the worlds. */
export function ensureAllEraRosters(): Promise<void> {
  return Promise.all(Object.keys(ERA_BAKES).map(id => ensureEraRosters(id))).then(() => undefined);
}

/** The era ids this game offers, historic only, in table order. */
export function historicEraIds(): string[] {
  return Object.keys(ERA_BAKES);
}

/* ---------- Round 166: era legends rate like legends ---------- */

/**
 * The owner's complaint, word for word: "ur undermining the fact that these
 * are legends of the game and way better than anyone in the current
 * generation." The bake maps 2010 market money through the same curve as
 * 2026 money, which lands prime Messi at 90, level with today's best. This
 * uplift stretches an era's TOP END above a pivot so its giants sit where
 * legends sit (prime Messi and prime Ronaldo at 97) while the rank and file
 * below the pivot stay exactly as baked. Monotone, so no two players ever
 * swap order, and applied at load, so the AUTO-GENERATED data file stays
 * byte for byte the real bake.
 */
const ERA_RATING_UPLIFT: Record<string, { pivot: number; gain: number }> = {
  era2010: { pivot: 80, gain: 0.7 },
  /* Round 175, calibrated off the measured 2015 bake: raw Messi and Ronaldo
     read 91 (2015 money runs closer to 2026 money than 2010 money did, so
     the gain is gentler than 2010's). At 0.6 they land at 98, peak MSN-era
     numbers above the modern best of 94, with Neymar and Suarez at 96 and
     the pre-title Leicester squad untouched below the pivot. */
  era2015: { pivot: 80, gain: 0.6 },
  /* Round 176, calibrated off the measured 2005 bake: 2005 money is the
     smallest of all (the era's biggest value is 40 million pounds), so raw
     Ronaldinho and Henry read just 86 and the gain has to be the steepest.
     At 1.67 the two Ballon d'Or class giants land at 96, above the modern
     best of 94, Eto'o, Lampard and the Brazilian Ronaldo reach 91, and the
     17 year old Messi stays an honest 73 far below the pivot. The gain per
     era tracks how far that era's money sits below 2026's, which is why it
     climbs as the seasons get older: 0.6, 0.7, 1.67. */
  era2005: { pivot: 80, gain: 1.67 },
  /* Round 971, calibrated off the measured 2020 bake by the rule the three
     above follow, the gain tracking how far the era's money sits below
     2026's. Measured over the top 50 of each bake (the median ratio of an
     era's k-th best value to the 2026 bake's k-th best): 0.25 in 2005, 0.33
     in 2010, 0.50 in 2015 and 0.93 in 2020, which is 7.8, 6.2, 3.8 and 0.4
     rating points on the bake curve. The shipped gains are 0.21, 0.11 and
     0.16 per point of that gap, a mean of 0.16, and 0.16 times 0.4 is 0.06.
     2020 money is 2026 money give or take, so the uplift is close to
     nothing: raw Mbappé 93 lands at the modern best of 94, raw Messi, De
     Bruyne and Salah 91 at 92, and everyone at 88 or below stays put. */
  era2020: { pivot: 80, gain: 0.06 },
};

export function eraUpliftRating(eraId: string | undefined, r: number): number {
  const u = eraId ? ERA_RATING_UPLIFT[eraId] : undefined;
  if (!u || r <= u.pivot) return r;
  return Math.min(99, Math.round(r + (r - u.pivot) * u.gain));
}

/**
 * Round 640: the uplift run backwards. An engine rating above an era's pivot
 * goes back to the bake rating its money came from, unrounded so a price read
 * off it moves smoothly with the rating. The identity at or below the pivot
 * and in the current era, which has no uplift.
 */
export function eraBakeRating(eraId: string | undefined, r: number): number {
  const u = eraId ? ERA_RATING_UPLIFT[eraId] : undefined;
  if (!u || r <= u.pivot) return r;
  return u.pivot + (r - u.pivot) / (1 + u.gain);
}

/**
 * Round 640: the money the bakes put on a bake rating, in pounds millions,
 * unrounded. Every roster bake turns a real market value into a rating with
 * one line, r = round(-13.106 + 12.851 x log10(usd)), and stores the value as
 * usd x 0.75 / 1e6 (ratingOf and gbpM in scripts/bakeClubManagerRosters.mjs
 * and in the 2005, 2010 and 2015 bakes). This is that line run backwards, so
 * it is what a real player of the rating carries in the data: measured over
 * the 6,305 real players of the four bakes, the median real value at each
 * rating from 64 to 94 is 0.93 to 1.11 of it, inside the rounding of the
 * rating itself (0.914 to 1.094), with the same figure in every era, every
 * league and every age band.
 */
export function bakedValueForRating(bakeRating: number): number {
  return (Math.pow(10, (bakeRating + 13.106) / 12.851) * 0.75) / 1e6;
}

/** The UNtransformed roster source: tiers, budgets and expectations read
 *  this so an era's club stature stays exactly as it calibrated. */
export function eraRostersRaw(eraId: string | undefined): Record<string, BakedPlayer[]> {
  /* Round 832: an era whose squads have not arrived fails loudly rather than
     answering with today's world, which would quietly play a 2010 save on
     2026 squads and write the result into the save. Every way into an era
     awaits ensureEraRosters first. */
  if (isHistoricEra(eraId)) {
    const world = HISTORIC_ROSTERS[eraId!];
    if (!world) throw new Error(`Club Manager: the ${eraId} squads are not loaded yet (await ensureEraRosters first)`);
    return world;
  }
  return CM_ROSTERS;
}

const UPLIFTED_CACHE = new Map<string, Record<string, BakedPlayer[]>>();

/** The roster source for an era: its own bake if historic (with the era's
 *  rating uplift applied), else today's untouched. */
export function eraRosters(eraId: string | undefined): Record<string, BakedPlayer[]> {
  const raw = eraRostersRaw(eraId);
  if (!eraId || !isHistoricEra(eraId) || !ERA_RATING_UPLIFT[eraId]) return raw;
  const hit = UPLIFTED_CACHE.get(eraId);
  if (hit) return hit;
  const out: Record<string, BakedPlayer[]> = {};
  for (const [club, list] of Object.entries(raw)) {
    out[club] = list.map(b => ({ ...b, r: eraUpliftRating(eraId, b.r) }));
  }
  UPLIFTED_CACHE.set(eraId, out);
  return out;
}

const WORLD_CACHE = new Map<string, Record<string, ProjectedPlayer[]>>();

/**
 * The whole football world, N years on from the baked roster year.
 *
 * yearsOn 0 is the identity: exactly the real August 2026 data, same names,
 * same ages, same ratings, same values, nothing touched. That is deliberate
 * and it is asserted in simEras, because it is the thing that guarantees a
 * default career in the current era plays exactly as it did before this round
 * and none of the eleven rounds of scoreline calibration moved.
 */
export function projectedWorld(yearsOn: number, worldSeed?: number): Record<string, ProjectedPlayer[]> {
  return projectedWorldFor('now', yearsOn, worldSeed);
}

/**
 * Round 146: the same projection, anchored on an era's own bake. A 2010 save
 * that runs deep ages the 2010 squads with the same curve the current era
 * uses, and its year zero is the real 2010 data untouched. The cache key
 * carries the era so the two worlds can never bleed into each other.
 */
export function projectedWorldFor(eraId: string, yearsOn: number, worldSeed?: number): Record<string, ProjectedPlayer[]> {
  const y = Math.max(0, Math.round(yearsOn));
  const trajectoryEra = isHistoricEra(eraId) ? eraId : 'now';
  const seed = Number.isSafeInteger(worldSeed) && worldSeed! >= 0 && worldSeed! <= 4294967295
    && Number.isSafeInteger(y) && y > 0 ? worldSeed : undefined;
  const key = `${trajectoryEra}|${y}${seed === undefined ? '' : `|seed:${seed}`}`;
  const hit = WORLD_CACHE.get(key);
  if (hit) return hit;
  const out: Record<string, ProjectedPlayer[]> = {};
  for (const [club, baked] of Object.entries(eraRosters(eraId))) {
    const scale = valueScaleFor(club, baked);
    let roster: ProjectedPlayer[] = baked.map(b => ({
      n: b.n, p: b.p, a: b.a, v: b.v, r: b.r, anchor: b.r, since: 0,
      ...(seed === undefined ? {} : { worldRosterKey: JSON.stringify([
        trajectoryEra, club, b.n, b.p, eraById(trajectoryEra).startYear - b.a, 0,
      ]) }),
    }));
    const target = roster.length;
    for (let year = 1; year <= y; year++) {
      const kept: ProjectedPlayer[] = [];
      const emptied: ProjectedPlayer[] = [];
      for (const pl of roster) {
        const next = ageOne(club, pl, year, scale, seed);
        if (next) kept.push(next); else emptied.push(pl);
      }
      // Every slot that emptied gets filled the same summer. A real club does
      // not carry a hole in its squad for a decade, and "no club runs out of
      // players" is one of the things this round has to hold true twenty
      // seasons out.
      emptied.forEach((slot, i) => kept.push(generateFor(club, slot, year, i, scale, seed === undefined ? undefined : trajectoryEra)));
      while (kept.length < target && emptied.length) {
        kept.push(generateFor(club, emptied[kept.length % emptied.length], year, kept.length + 50, scale, seed === undefined ? undefined : trajectoryEra));
      }
      // Value descending, which is the order the bake itself is in, because
      // buildSquad takes the top 26 off the front of this list and a career in
      // the current era has to get byte for byte the squad it always got.
      roster = kept.sort((a, b) => b.v - a.v || b.r - a.r || a.n.localeCompare(b.n));
    }
    out[club] = roster;
  }
  WORLD_CACHE.set(key, out);
  return out;
}

/** The projected roster for one club, or an empty list if it is not in the data. */
export function projectedRoster(club: string, yearsOn: number, eraId: string = 'now', worldSeed?: number): ProjectedPlayer[] {
  return projectedWorldFor(eraId, yearsOn, worldSeed)[club] ?? [];
}

/** Best XI average of a projected roster. Null when there is no data at all. */
export function projectedXIAvg(club: string, yearsOn: number, eraId: string = 'now', worldSeed?: number): number | null {
  const roster = projectedRoster(club, yearsOn, eraId, worldSeed);
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
 * The PAST is the part he actually wants, and Round 146 delivered phase one
 * (2026-08-17, his words that morning: "U should have diffrent era like u can
 * be the manager for clubs in 2010 and 2000 and so on with all correct
 * lineups and everything like that and values and just everything"). The
 * 2010-11 era below is real year-2010 Transfermarkt rows for all forty clubs
 * of that season's Premier League and La Liga, with the famous summer 2010
 * moves corrected against the table's own year-2011 rows. More eras follow
 * the same recipe (scripts/bakeEra2010.mjs); the table reaches back to 2004,
 * so a 2005 era is buildable and an exact 2000 era is NOT, and we say that
 * rather than invent one.
 */
/* Round 832: an era's player count is read off its own bake, which now
   arrives with the era, so the honesty line asks for it when it is shown (the
   team step, after the era has loaded) and says it without the number on any
   path that reads it earlier. */
function eraPlayersPhrase(eraId: string): string {
  const n = ERA_PLAYERS[eraId];
  return n === undefined ? 'Real players' : `${n} real players`;
}

export const CM_ERAS: CMEra[] = [
  {
    id: 'now',
    label: seasonLabel(CM_BASE_YEAR),
    startYear: CM_BASE_YEAR,
    emoji: '\u{1F4C5}',
    /* Round 832: the old lines promised every squad exactly as it is and
       every name real, which the youth padding of thin squads made false.
       They say what the squads really are now. */
    blurb: 'Today. Real squads as of August 2026, thin ones topped up with made up youth.',
    honesty: 'Real data: every real player has his real name, age and value as of August 2026. Thin squads are padded with made up youth players and say so.',
  },
  /* Round 971: the fourth past season, the newest, so it sits first. The
     blurb names only squads the bake carries (its anchors in
     scripts/bakeEra2020.mjs), and the honesty line owns up to the summer
     movers no dated record placed.
     Review fix: the honesty line says what the bake does. A move is made
     where a dated record shows it AND the next season's row names the club;
     a leaver whose new club no row confirms is left out (Glik, Tatarusanu);
     a mover no record covered stays put (Lazaro, Biraghi). The empty
     stadiums are that season's, read 2026-10-05: premierleague.com ("How has
     the COVID-19 pandemic affected Premier League matches?": behind closed
     doors "largely ... throughout the season", fans back in limited numbers
     in December in some areas and in May) and Sky Sports ("How 2020 changed
     football: Fans stay at home"). The brief also asked for five
     substitutes, but the Premier League voted to stay at three for 2020-21
     (Sky Sports, "Premier League clubs vote against allowing five
     substitutes in 2020/21 season"; ESPN), so the card does not claim it.
     Closing check fix, every source read 2026-10-05. The empty stadiums
     were all five leagues', not only England's: Deloitte's Annual Review of
     Football Finance 2022 (deloitte.com/ce/en/industries/tmt/research/
     gx-annual-review-of-football-finance.html: "matches played behind
     closed doors and stadia empty for the majority of the season") and
     KPMG Football Benchmark on the big five clubs (essma.eu, 7 September
     2021: the 2020/21 season "was played in empty stadiums"). The
     substitutes are said as they were: five in the other four leagues
     (Inside World Football, 18 December 2020, naming La Liga, the
     Bundesliga, Serie A and Ligue 1; ESPN, Dale Johnson, 4 August 2022,
     espn.com/soccer/story/_/id/37630254), three in the Premier League (Sky
     Sports 12062269, 4 September 2020: "three replacements from seven";
     ESPN 37585852, 6 August 2020; NBC Sports, 17 December 2020). The engine
     allows three changes a match in every league (MAX_SUBS in
     clubManager.ts), so the card says that too and promises nothing the
     match does not apply. */
  {
    id: 'era2020',
    label: seasonLabel(2020),
    startYear: 2020,
    emoji: '\u{1F3DF}\u{FE0F}',
    blurb: 'Haaland and Bellingham at Dortmund, Mbappé and Neymar at PSG, Bruno at United, Lewandowski at Bayern. All of the big five, 2020-21.',
    get honesty() { return `Real data. ${eraPlayersPhrase('era2020')} with their real 2020 ages and values, all 98 clubs of the 2020-21 Premier League, La Liga, Serie A, Bundesliga and Ligue 1, a season played mostly in empty stadiums. Spain, Italy, Germany and France let a side make five changes that year while the Premier League stayed at three; every match here allows three. Summer 2020 moves are made where a dated record shows them and the next season's data agrees. A man who left for a club the data can't confirm is left out rather than guessed, and a mover no record covered still sits at his old club. Thin squads are padded with made up youth players and say so.`; },
  },
  {
    id: 'era2015',
    label: seasonLabel(2015),
    startYear: 2015,
    emoji: '\u{1F98A}',
    blurb: 'The Leicester season. MSN Barcelona, Vardy at 5000 to 1, Lewandowski at Bayern, Ibrahimovic at PSG. All of the big five, 2015-16.',
    get honesty() { return `Real data. ${eraPlayersPhrase('era2015')} with their real 2015 ages and values, all 98 clubs of the 2015-16 Premier League, La Liga, Serie A, Bundesliga and Ligue 1. Thin squads are padded with made up youth players and say so.`; },
  },
  {
    id: 'era2010',
    label: seasonLabel(2010),
    startYear: 2010,
    emoji: '\u{1F570}\u{FE0F}',
    /* Round 901, read 2026-10-03: Klopp's young Dortmund won the 2010-11
       Bundesliga (bundesliga.com, "Jurgen Klopp: how Borussia Dortmund won
       the 2010/11 German top flight"; ESPN, story 37503225), and Lille won
       Ligue 1 and the Coupe de France, their first double since 1946
       (UEFA.com, "Lille celebrating breakthrough double"; Al Jazeera, 21 May
       2011, "Lille win first French title in 57 years"; RSSSF's season). */
    blurb: 'Prime Messi. Mourinho\'s Madrid. Klopp\'s young Dortmund. Lille\'s double. All of the big five, 2010-11.',
    get honesty() { return `Real data. ${eraPlayersPhrase('era2010')} with their real 2010 ages and values, all 98 clubs of the 2010-11 Premier League, La Liga, Serie A, Bundesliga and Ligue 1. Thin squads are padded with made up youth players and say so.`; },
  },
  {
    id: 'era2005',
    label: seasonLabel(2005),
    startYear: 2005,
    emoji: '\u{1F4FC}',
    blurb: 'Ronaldinho\'s Ballon d\'Or. Mourinho\'s Chelsea. A 17 year old Messi. Shevchenko\'s Milan, Ballack\'s Bayern, Juninho\'s Lyon. All of the big five, 2005-06.',
    get honesty() { return `Real data. ${eraPlayersPhrase('era2005')} with their real 2005 ages and values, all 98 clubs of the 2005-06 Premier League, La Liga, Serie A, Bundesliga and Ligue 1. Thin squads are padded with made up youth players and say so.`; },
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
/* Round 832: the tile used to say every player is real, which a squad padded
   with made up youth is not. Kept short: the tile line has to fit one line on
   a phone, and the honesty line one tap on says it in full. */
const REAL_WITH_PADDING = 'Real players, made up youth fill gaps';

export function eraRealShareLabel(era: CMEra): string {
  // A historic era's year zero is its own bake: real by construction, like
  // today's, with the thin squads padded. The projection share math only
  // describes futures.
  if (era.startYear <= CM_BASE_YEAR) return REAL_WITH_PADDING;
  const pct = Math.round(realStarterShare(era.startYear - CM_BASE_YEAR) * 100);
  if (pct >= 100) return REAL_WITH_PADDING;
  if (pct <= 2) return 'Real clubs, made up players';
  return `${pct}% of first team players are real`;
}

/** The long version, both measurements, for the picker footnote. */
export function eraHonestyLine(era: CMEra): string {
  const yearsOn = era.startYear - CM_BASE_YEAR;
  if (yearsOn <= 0) return era.honesty;
  const starters = Math.round(realStarterShare(yearsOn) * 100);
  const all = Math.round(realNameShare(yearsOn) * 100);
  return `${era.honesty} Measured right now: ${starters}% of first team players and ${all}% of all squad players are real footballers.`;
}

/** Sanity handle for the harness: the meta the clock is anchored on. */
export const CM_CLOCK_META = {
  baseYear: CM_BASE_YEAR,
  rosterAsOf: CM_ROSTER_META.asOf,
};

/**
 * Round 1035: the A-League Men 2026-27 for Club Manager, generated OFFLINE
 * from committed files only (no database, no network):
 *
 *   scripts/data/gatheredSquads/aleague2026/<club>.json   Round 1034's ledgers:
 *       who is in each squad, two hosts a player, his position group and
 *       (where two hosts agreed) his birth date
 *   scripts/data/gatheredSquads/aleague2026/_values.json  each player's
 *       Transfermarkt 26/27 value and detailed position, by player id
 *   scripts/data/gatheredSquads/aleague2026/_people.json  nationality on two
 *       hosts or null, and the age with its two hosts
 *
 * and writes src/data/clubManagerALeague2026.ts in the BakedPlayer shape of
 * src/data/clubManagerRosters.ts. scripts/bakeClubManagerRosters.mjs is not
 * used: it reads the live value table, which holds 4 of these 312 men.
 *
 * Rules (the Round 1035 brief, section 1):
 * - Rating and value come from scripts/lib/cmValueCurve.mjs, the bake's own
 *   curve: EUR at the house rate to USD, USD to a 48 to 94 rating, USD to
 *   pounds. A player with no value on his club's page is NOT given one: he
 *   gets FLOOR_USD (the curve's floor, a positive value) and is listed in
 *   CM_ALEAGUE_NO_VALUE. Values are written to two decimals, because one
 *   decimal rounds a $50k player to zero.
 * - Position: Transfermarkt's detailed position through the bake's map.
 *   Where it falls outside the ledger's two source group (or is generic, like
 *   "Striker"), the group wins and the player takes the group's default.
 * - A ledger row with no group is skipped (two rows, both unsettled).
 * - A club where more than half the rows have no value is in
 *   CM_ALEAGUE_PARTIAL, the CM_PARTIAL shape.
 * - Nationality ships only where _people.json found two hosts agreeing.
 *
 * Regenerate with: node scripts/genClubManagerALeague.mjs
 * FAILS CLOSED, writing nothing, on any row it cannot resolve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POS_MAP, ratingOf, gbpM, usdOfEur, FLOOR_USD } from './lib/cmValueCurve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts/data/gatheredSquads/aleague2026');
const OUT = path.join(ROOT, 'src/data/clubManagerALeague2026.ts');
const read = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

/** Ledger slug -> the engine's club name (REAL_LEAGUES, CLUB_COLORS key). */
export const ENGINE_NAME = {
  'adelaide-united': 'Adelaide United', 'auckland-fc': 'Auckland FC', 'brisbane-roar': 'Brisbane Roar',
  'central-coast-mariners': 'Central Coast Mariners', 'macarthur-fc': 'Macarthur FC',
  'melbourne-city': 'Melbourne City', 'melbourne-victory': 'Melbourne Victory',
  'newcastle-jets': 'Newcastle Jets', 'perth-glory': 'Perth Glory', 'sydney-fc': 'Sydney FC',
  'wellington-phoenix': 'Wellington Phoenix', 'western-sydney-wanderers': 'Western Sydney Wanderers',
};
/** The ledger's group of each engine position, and each group's default. */
export const GROUP_OF = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD' };
export const GROUP_DEFAULT = { GK: 'GK', DEF: 'CB', MID: 'CM', FWD: 'ST' };

const errors = [];
const membership = read('_membership.json');
const values = read('_values.json');
const people = read('_people.json');
const valueOf = new Map();
for (const c of values.clubs) for (const p of c.players) valueOf.set(`${c.slug}|${p.name}`, { ...p, url: c.url });
const personOf = new Map(people.players.map(p => [`${p.club}|${p.name}`, p]));

const rosters = {};
const partial = [];
const noValue = [];
const nationalities = {};
let groupWon = 0;
let skipped = 0;
for (const club of membership.clubs) {
  const engine = ENGINE_NAME[club.slug];
  if (!engine) { errors.push(`no engine name for ${club.slug}`); continue; }
  const ledger = read(`${club.slug}.json`);
  const list = [];
  let clubNoValue = 0;
  for (const row of ledger.rows) {
    if (!row.group) { skipped += 1; continue; }
    if (!GROUP_DEFAULT[row.group]) { errors.push(`${row.name}: unknown group ${row.group}`); continue; }
    const val = valueOf.get(`${club.slug}|${row.name}`);
    const person = personOf.get(`${club.slug}|${row.name}`);
    if (!val) { errors.push(`${row.name} (${club.slug}) has no _values.json row`); continue; }
    if (!person) { errors.push(`${row.name} (${club.slug}) has no _people.json row`); continue; }
    if (!Number.isInteger(person.age) || person.age < 14 || person.age > 45) { errors.push(`${row.name}: age ${person.age} is not two sourced or not plausible`); continue; }
    if (person.ageHosts.length < 2) { errors.push(`${row.name}: age on ${person.ageHosts.length} host(s)`); continue; }
    let p = POS_MAP[val.tmPosition];
    if (!p || GROUP_OF[p] !== row.group) { p = GROUP_DEFAULT[row.group]; groupWon += 1; }
    let usd;
    if (Number.isFinite(val.valueEur) && val.valueEur > 0) usd = usdOfEur(val.valueEur);
    else { usd = FLOOR_USD; clubNoValue += 1; noValue.push(`${row.name}|${engine}`); }
    list.push({ n: row.name, p, a: person.age, v: gbpM(usd, 2), r: ratingOf(usd) });
    if (person.nationality) {
      if (person.nationalityHosts.length < 2) errors.push(`${row.name}: nationality on one host`);
      else if (nationalities[row.name] && nationalities[row.name] !== person.nationality) errors.push(`${row.name}: two nationalities for one name`);
      else nationalities[row.name] = person.nationality;
    }
  }
  list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));
  rosters[engine] = list;
  if (clubNoValue * 2 > list.length) partial.push(engine);
}

/* One name, one man: a name in two A-League squads would merge two players
   wherever the engine keys on the name. */
const seen = new Map();
for (const [club, list] of Object.entries(rosters)) {
  for (const p of list) {
    if (seen.has(p.n)) errors.push(`${p.n} is in two squads (${seen.get(p.n)}, ${club})`);
    seen.set(p.n, club);
  }
}

/* The baked world must not carry these men too. A name already in
   src/data/clubManagerRosters.ts is either the same man on a stale row
   there (the value table's snapshot is older than these ledgers) or a
   namesake, and only a person can tell which. So every such name must be
   listed here with the proof, or the run fails. A listed man is dropped from
   that baked club where the two files are joined
   (src/data/clubManagerWorldRosters.ts); the A-League ledger, read
   2026-10-06 on four hosts, is the newer truth. */
export const SUPERSEDES = {
  /* Same man: born 1994-02-24, a Scottish winger. The Round 1034 ledger has
     him in Macarthur FC's 2026-27 squad on the club page, ESPN (153012),
     Transfermarkt (146795) and FotMob (230916), all with that birth date.
     The baked Southampton row (age 31, LW) is the value table's old club. */
  'Ryan Fraser': 'Southampton',
};
const bakedText = fs.readFileSync(path.join(ROOT, 'src/data/clubManagerRosters.ts'), 'utf8').split('\r\n').join('\n');
const bakedClubOf = new Map();
for (const b of bakedText.matchAll(/^  '((?:[^'\\]|\\.)+)': \[\n([\s\S]*?)^  \],\n/gm)) {
  for (const m of b[2].matchAll(/\bn: '((?:[^'\\]|\\.)*)'/g)) {
    const n = m[1].replace(/\\'/g, "'");
    if (!bakedClubOf.has(n)) bakedClubOf.set(n, []);
    bakedClubOf.get(n).push(b[1].replace(/\\'/g, "'"));
  }
}
for (const n of seen.keys()) {
  const at = bakedClubOf.get(n);
  if (!at) continue;
  if (SUPERSEDES[n] === undefined) errors.push(`${n} is also in the baked ${at.join(', ')} squad: list him in SUPERSEDES with the proof he is the same man, or prove a namesake`);
  else if (at.length !== 1 || at[0] !== SUPERSEDES[n]) errors.push(`${n}: SUPERSEDES names ${SUPERSEDES[n]} but the baked file has him at ${at.join(', ')}`);
}
for (const n of Object.keys(SUPERSEDES)) if (!seen.has(n) || !bakedClubOf.has(n)) errors.push(`SUPERSEDES lists ${n}, who is no longer in both files: remove the line`);

/* nationalityOf reads the modern map first, so an A-League man whose name is
   already there must carry the same nationality, or the flag would be the
   other entry's. */
const natText = fs.readFileSync(path.join(ROOT, 'src/data/playerNationalities.ts'), 'utf8').split('\r\n').join('\n');
const nowBlock = natText.slice(natText.indexOf('\nnow: {'), natText.indexOf('\nera2020: {'));
for (const m of nowBlock.matchAll(/^  '((?:[^'\\]|\\.)*)': '((?:[^'\\]|\\.)*)',$/gm)) {
  const n = m[1].replace(/\\'/g, "'");
  const nat = m[2].replace(/\\'/g, "'");
  if (seen.has(n) && nationalities[n] !== nat) errors.push(`${n}: the modern nationality map says ${nat}, the A-League receipts say ${nationalities[n] ?? 'unknown'}`);
}
const total = Object.values(rosters).reduce((s, l) => s + l.length, 0);
if (Object.keys(rosters).length !== 12) errors.push(`expected 12 clubs, got ${Object.keys(rosters).length}`);

if (errors.length) {
  console.error('FAILED CLOSED, nothing written. Problems:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubs = Object.keys(rosters).sort();
let out = `// Round 1035: the A-League Men 2026-27, twelve real squads for Club Manager.
// GENERATED by scripts/genClubManagerALeague.mjs from committed files only:
// the Round 1034 squad ledgers (two hosts a player), each player's
// Transfermarkt 26/27 value (_values.json, read ${values.read}) and his
// nationality and age receipts (_people.json). Values in £m to two decimals,
// ratings 48-94 on the same curve as every other league
// (scripts/lib/cmValueCurve.mjs). ${total} players, ${clubs.length} clubs.
// Regenerate with: node scripts/genClubManagerALeague.mjs
// DO NOT EDIT BY HAND.
import type { BakedPlayer } from '@/data/clubManagerRosters';

export const CM_ALEAGUE_META = {
  read: '${values.read}',
  players: ${total},
  clubs: ${clubs.length},
};

/** Clubs where more than half the shipped rows have no market value. */
export const CM_ALEAGUE_PARTIAL: string[] = ${JSON.stringify(partial.sort())};

/** Players with no value on their club's page, as "name|club": each one is
 *  rated at the curve's floor, never given an invented value. */
export const CM_ALEAGUE_NO_VALUE: string[] = [
${noValue.map(s => `  '${esc(s)}',`).join('\n')}
];

/** Men the baked file still carries at an older club, by name: the join
 *  drops each from that club (proof in the generator's SUPERSEDES). */
export const CM_ALEAGUE_SUPERSEDES: Record<string, string> = ${JSON.stringify(SUPERSEDES)};

export const CM_ALEAGUE_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubs) {
  out += `  '${esc(club)}': [\n`;
  for (const p of rosters[club]) out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  out += `  ],\n`;
}
out += `};

/** Nationality where two hosts agree (_people.json); a name missing here is
 *  unknown and shows no flag. */
export const CM_ALEAGUE_NATIONALITIES: Record<string, string> = {
${Object.keys(nationalities).sort().map(n => `  '${esc(n)}': '${esc(nationalities[n])}',`).join('\n')}
};
`;
fs.writeFileSync(OUT, out);
console.log(`Wrote src/data/clubManagerALeague2026.ts: ${total} players, ${clubs.length} clubs, ${noValue.length} with no value, ${Object.keys(nationalities).length} nationalities, ${groupWon} positions set by the ledger group, ${skipped} rows skipped (no group), partial ${JSON.stringify(partial)}`);
for (const club of clubs) {
  const l = rosters[club];
  const xi = l.map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  console.log(`${club.padEnd(26)} ${String(l.length).padStart(3)}  XI ${(xi.reduce((s, r) => s + r, 0) / 11).toFixed(1)}  top ${l[0].n} (£${l[0].v}m, ${l[0].r})`);
}

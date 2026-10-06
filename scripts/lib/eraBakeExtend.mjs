/**
 * Round 899: the shared "add a league to a shipped era" step, lifted out of
 * the Round 191 extend mode in scripts/bakeEra2015.mjs so that every era
 * bake (2015-16 here, 2010-11 and 2005-06 right after) calls ONE piece
 * instead of copying it.
 *
 * The move, in one paragraph: the SHIPPED era file is the truth for the
 * leagues it already holds (its lines are carried through as text, never
 * re-typed and never re-derived), the new leagues come from an offline pull
 * of the base table player_market_values, and a declared list of window
 * corrections is applied on top. Nothing here reads the network.
 *
 * THE QUERY, REPRODUCED OFFLINE. The documented query is, per league,
 *   SELECT DISTINCT ON (player_name) player_name, club, position, age,
 *     market_value_usd FROM player_market_values
 *   WHERE year = <Y> AND club IN (<the league's table spellings>)
 *   ORDER BY player_name, market_value_usd DESC;
 * base table, exact year, no fallback year (thin is honest). From the pull
 * file that is: filter the year and the league's club spellings, keep one
 * row per player_name with the highest value, and break a tie on the LOWEST
 * id so the bake is deterministic (Postgres leaves that tie unspecified).
 * Where that one name has rows at two different clubs, the caller decides
 * which row stays (poolNamesakes below), never the value or the id.
 *
 * WHAT IT FAILS CLOSED ON: a club spelling with no rows in the pull, an
 * unmapped position, a correction naming nobody or an unknown club, a move
 * whose second proof (the table's own following-year row) does not name the
 * destination, a removal whose following-year row still sits inside the
 * world, an arrival already in the world, a name shared between a new
 * league and the shipped world that the caller did not declare, a name with
 * rows at two clubs of the new leagues that the caller did not settle, an
 * undeclared thin club, a missing anchor, and ANY shipped line that changed
 * or moved without a correction naming that player.
 *
 * The corrections a caller declares:
 *   moves     { n, to, why }            relocate inside the world (shipped line or new row)
 *   removals  { n, why, single?, later? }  left the world; `single` documents a one-source removal
 *                                       (no following-year row at all), `later` a following-year
 *                                       row that names a club of the world he only reached in a
 *                                       LATER window, so it cannot place him at the season's start
 *   arrivals  { n, from, to, why }      a year-Y row at table club `from`, outside the new
 *                                       leagues' pools (or removed from the shipped world by an
 *                                       earlier round), placed at engine club `to`
 *   folds     { n, why }                the same man is already a shipped line (an earlier
 *                                       round's arrival) and ALSO a new-league row: the shipped
 *                                       line stays, the row is dropped, and the two must carry
 *                                       the same position, age and value or it is not a fold
 *   namesakes { n, why }                two real men, one string: the higher value stays (the
 *                                       standing one name, one player rule), logged out loud
 *   poolNamesakes { n, keep, why }      one string with year-Y rows at two clubs of the NEW
 *                                       leagues (two men, or one man's two rows): the row at
 *                                       engine club `keep` stays; an undeclared one is fatal
 */
import fs from 'node:fs';
import path from 'node:path';

/* Same curves as bakeClubManagerRosters.mjs, verbatim, so an era value and a
 * 2026 value mean the same thing on the rating scale. 'Sweeper' came over
 * from scripts/bakeEra2005.mjs in Round 902 when that bake started reading
 * this map: no year 2005, 2010 or 2015 row in the pull carries it, so no
 * output moves, and the 2005 path keeps the map it always had. */
export const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF', 'Sweeper': 'CB',
};
export function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(48, Math.min(94, r));
}
export function gbpM(usd) {
  const m = (usd * 0.75) / 1e6;
  return Math.round(m * 10) / 10;
}

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const unesc = s => s.replace(/\\(.)/g, '$1');
const lineOf = p => `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },`;

class BakeError extends Error {}
const die = msg => { throw new BakeError(msg); };

/** Parse a shipped era file into { meta, partial, clubs: Map(club -> rows) }.
 *  Every player row keeps its exact source line, so carrying a row through
 *  is carrying its bytes. */
export function readShippedEra(file, prefix) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const num = key => {
    const m = text.match(new RegExp(`^  ${key}: (\\d+),$`, 'm'));
    if (!m) die(`${file}: no ${key} in ${prefix}_META`);
    return Number(m[1]);
  };
  const meta = { year: num('year'), players: num('players'), clubs: num('clubs'), moves: num('moves') };
  const start = text.indexOf(`export const ${prefix}_ROSTERS`);
  if (start < 0) die(`${file}: no ${prefix}_ROSTERS`);
  const clubs = new Map();
  let cur = null;
  for (const line of text.slice(start).split('\n').slice(1)) {
    const c = line.match(/^  '(.*)': \[$/);
    if (c) { cur = []; clubs.set(unesc(c[1]), cur); continue; }
    const p = line.match(/^    \{ n: '(.*)', p: '([A-Z]+)', a: (\d+), v: ([\d.]+), r: (\d+) \},$/);
    if (p) {
      if (!cur) die(`${file}: a player line outside any club`);
      cur.push({ n: unesc(p[1]), p: p[2], a: Number(p[3]), v: Number(p[4]), r: Number(p[5]), line, shipped: true });
      continue;
    }
    if (line === '  ],') { cur = null; continue; }
    if (line === '};' || line === '') continue;
    die(`${file}: a line this parser does not know: ${line}`);
  }
  const count = [...clubs.values()].reduce((s, l) => s + l.length, 0);
  if (count !== meta.players || clubs.size !== meta.clubs) {
    die(`${file}: parsed ${count} players in ${clubs.size} clubs, META says ${meta.players} in ${meta.clubs}`);
  }
  return { meta, clubs };
}

/** One league's pool from the pull: the documented DISTINCT ON, offline.
 *  Returns Map(player_name -> { engine, dbClub, position, age, usd, id }). */
export function leaguePool(rows, year, dbToEra, label) {
  const seenClubs = new Set();
  const pool = new Map();
  for (const r of rows) {
    if (r.year !== year) continue;
    const engine = dbToEra[r.club];
    if (!engine) continue;
    seenClubs.add(r.club);
    const prev = pool.get(r.player_name);
    const usd = r.market_value_usd ?? 0;
    if (!prev || usd > prev.usd || (usd === prev.usd && r.id < prev.id)) {
      pool.set(r.player_name, { engine, dbClub: r.club, position: r.position, age: r.age, usd, id: r.id, nat: r.nationality });
    }
  }
  for (const db of Object.keys(dbToEra)) {
    if (!seenClubs.has(db)) die(`${label}: the pull holds no year-${year} row at "${db}", the spelling map is wrong`);
  }
  return pool;
}

function bakeRow(name, rec) {
  const p = POS_MAP[rec.position];
  if (!p) die(`unmapped position "${rec.position}" (${name})`);
  if (!Number.isFinite(rec.age)) die(`no age on the row of ${name}`);
  return { n: name, p, a: rec.age, v: gbpM(rec.usd), r: ratingOf(rec.usd), shipped: false, nat: rec.nat };
}

/**
 * Extend a shipped era with new leagues. Pure: returns { text, stats, log }
 * and writes nothing, so a harness can run it and compare against the file.
 *
 * cfg = {
 *   file, prefix, year,            the shipped era file, 'ERA2015', 2015
 *   rows, nextRows,                the pull's rows (year Y) and the following year's
 *   newLeagues: [{ label, dbToEra }],
 *   worldDbToEra,                  EVERY league of the grown world, table spelling -> engine
 *                                  name (the following-year proof reads destinations by it)
 *   moves, removals, arrivals, folds, namesakes, poolNamesakes   (see the file header)
 *   anchors: [[club, name]], expectedThin: [club], thinUnder (default 8),
 *   header: stats => string[]      the comment lines above the import
 * }
 */
export function extendEra(cfg) {
  const { file, prefix, year, rows, nextRows, newLeagues, worldDbToEra } = cfg;
  const thinUnder = cfg.thinUnder ?? 8;
  const log = [];
  const shipped = readShippedEra(file, prefix);
  const world = new Map();
  const origin = new Map();
  for (const [club, list] of shipped.clubs) {
    world.set(club, [...list]);
    for (const p of list) {
      if (origin.has(p.n)) die(`the shipped file holds "${p.n}" twice`);
      origin.set(p.n, club);
    }
  }
  const newClubs = [];
  const pool = new Map();
  for (const lg of newLeagues) {
    for (const c of new Set(Object.values(lg.dbToEra))) {
      if (world.has(c)) die(`${lg.label}: the shipped file already holds ${c}; the extend must not run twice`);
      world.set(c, []);
      newClubs.push(c);
    }
    const lp = leaguePool(rows, year, lg.dbToEra, lg.label);
    log.push(`${lg.label} ${year}: ${lp.size} distinct names`);
    for (const [name, rec] of lp) {
      const prev = pool.get(name);
      if (prev) log.push(`  one name in two new leagues: '${name}' (${prev.dbClub} ${prev.usd} / ${rec.dbClub} ${rec.usd}), the higher value stays`);
      if (!prev || rec.usd > prev.usd || (rec.usd === prev.usd && rec.id < prev.id)) pool.set(name, rec);
    }
  }
  /* Round 901 review fix: one string with year-Y rows at two clubs of the new
     leagues (two real men, or one man's two rows) is never settled by value
     or id in silence. The 2010-11 Marco Rossi tie kept Sampdoria's, a man who
     spent that season at Bari, and dropped Genoa's captain. The caller names
     the club whose row stays. */
  const newDbToEra = Object.assign({}, ...newLeagues.map(lg => lg.dbToEra));
  const rowsByClub = new Map();
  for (const r of rows) {
    const engine = r.year === year ? newDbToEra[r.club] : null;
    if (!engine) continue;
    if (!rowsByClub.has(r.player_name)) rowsByClub.set(r.player_name, new Map());
    const byClub = rowsByClub.get(r.player_name);
    const usd = r.market_value_usd ?? 0;
    const prev = byClub.get(engine);
    if (!prev || usd > prev.usd || (usd === prev.usd && r.id < prev.id)) {
      byClub.set(engine, { engine, dbClub: r.club, position: r.position, age: r.age, usd, id: r.id, nat: r.nationality });
    }
  }
  const splitDeclared = new Map((cfg.poolNamesakes ?? []).map(x => [x.n, x]));
  const splits = [...rowsByClub].filter(([, byClub]) => byClub.size > 1);
  const undeclaredSplit = splits.filter(([name]) => !splitDeclared.has(name))
    .map(([name, byClub]) => `"${name}" (${[...byClub.values()].map(x => `${x.engine} ${x.position}, age ${x.age}, ${gbpM(x.usd)}m`).join('; ')})`);
  if (undeclaredSplit.length) die(`${undeclaredSplit.length} names have year-${year} rows at two clubs of the new leagues; declare each in poolNamesakes with the club whose row stays:\n  ${undeclaredSplit.join('\n  ')}`);
  for (const [name, byClub] of splits) {
    const d = splitDeclared.get(name);
    const kept = byClub.get(d.keep);
    if (!kept) die(`pool namesake "${name}" keeps ${d.keep}, but the rows sit at ${[...byClub.keys()].join(', ')}`);
    pool.set(name, kept);
    splitDeclared.delete(name);
    log.push(`  pool namesake: '${name}' kept at ${d.keep}, the row at ${[...byClub.keys()].filter(c => c !== d.keep).join(', ')} dropped (${d.why})`);
  }
  if (splitDeclared.size) die(`declared pool namesakes that never split: ${[...splitDeclared.keys()].join(', ')}`);
  const worldClubOf = db => worldDbToEra[db] ?? null;
  const nextOf = name => nextRows.filter(r => r.year === year + 1 && r.player_name === name);
  const proveAt = (name, to, kind) => {
    const next = nextOf(name);
    if (!next.some(r => worldClubOf(r.club) === to)) {
      die(`${kind} "${name}" to ${to}: no year-${year + 1} row names that club (rows: ${next.map(r => r.club).join(', ') || 'none'})`);
    }
  };
  const takeShipped = name => {
    const club = origin.get(name);
    const list = world.get(club);
    const idx = list.findIndex(p => p.n === name);
    if (idx < 0) die(`"${name}" was already taken out of ${club} by an earlier correction`);
    return list.splice(idx, 1)[0];
  };
  const touched = new Map();
  /* Where a name sits in the shipped world right now, or null once a correction took it out. */
  const liveClubOf = name => (origin.has(name) && world.get(origin.get(name)).some(p => p.n === name) ? origin.get(name) : null);
  const stats = { moved: 0, removed: 0, arrived: 0, folded: 0, collisions: 0 };

  /* Folds first: the same man on both sides, the shipped line stays. */
  for (const f of cfg.folds ?? []) {
    const rec = pool.get(f.n);
    const club = origin.get(f.n);
    if (!rec || !club) die(`fold "${f.n}" expected on both sides (new row: ${!!rec}, shipped line: ${!!club})`);
    const ship = world.get(club).find(p => p.n === f.n);
    const fresh = bakeRow(f.n, rec);
    if (!ship || ship.p !== fresh.p || ship.a !== fresh.a || ship.v !== fresh.v) {
      die(`fold "${f.n}": the shipped line and the ${rec.dbClub} row disagree, so this is not one man's one row`);
    }
    pool.delete(f.n);
    stats.folded += 1;
    log.push(`  fold: ${f.n} stays at ${club}, the ${rec.dbClub} row is dropped (${f.why})`);
  }
  /* One name, one player, per era world. A new-league name that is also a
     shipped name is two real men wearing one string (the engine keys players
     by name, so only one can exist): the higher value stays, a dead heat
     keeps the shipped line, and the caller must have declared the pair. */
  const declared = new Map((cfg.namesakes ?? []).map(x => [x.n, x.why]));
  const present = new Map();
  for (const [club, list] of world) for (const p of list) present.set(p.n, club);
  const undeclared = [...pool].filter(([name]) => present.has(name) && !declared.has(name))
    .map(([name, rec]) => `"${name}" (${rec.dbClub} row, age ${rec.age}, ${gbpM(rec.usd)}m; line at ${present.get(name)}, age ${world.get(present.get(name)).find(p => p.n === name).a}, ${world.get(present.get(name)).find(p => p.n === name).v}m)`);
  if (undeclared.length) die(`${undeclared.length} names sit on both sides; declare each as a fold (one man) or a namesake (two men):\n  ${undeclared.join('\n  ')}`);
  for (const [name, rec] of [...pool]) {
    const club = present.get(name);
    if (!club) continue;
    const row = world.get(club).find(p => p.n === name);
    if (gbpM(rec.usd) > row.v) {
      if (row.shipped) { takeShipped(name); touched.set(name, `dropped from ${club}, a namesake of ${rec.dbClub}'s higher valued player: ${declared.get(name)}`); }
      else world.set(club, world.get(club).filter(p => p.n !== name));
      log.push(`  namesake: '${name}' kept at ${rec.engine} over ${club}'s ${row.v}m (${declared.get(name)})`);
    } else {
      pool.delete(name);
      log.push(`  namesake: '${name}' kept at ${club} (${row.v}m) over the ${rec.dbClub} row (${declared.get(name)})`);
    }
    stats.collisions += 1;
    declared.delete(name);
  }
  if (declared.size) die(`declared namesakes that never collided: ${[...declared.keys()].join(', ')}`);
  /* Moves inside the world. */
  for (const mv of cfg.moves ?? []) {
    const rec = pool.get(mv.n);
    const club = liveClubOf(mv.n);
    if (!rec && !club) die(`mover "${mv.n}" is in neither the new rows nor the shipped world; the list is stale`);
    if (rec && club) die(`mover "${mv.n}" is on both sides; declare the fold or the namesake first`);
    if (!world.has(mv.to)) die(`mover "${mv.n}" is bound for unknown club "${mv.to}"`);
    proveAt(mv.n, mv.to, 'move');
    if (rec) {
      if (rec.engine === mv.to) die(`mover "${mv.n}" is already at ${mv.to}`);
      pool.delete(mv.n);
      world.get(mv.to).push(bakeRow(mv.n, rec));
    } else {
      if (club === mv.to) die(`mover "${mv.n}" is already at ${mv.to}`);
      world.get(mv.to).push(takeShipped(mv.n));
      touched.set(mv.n, `moved ${club} to ${mv.to}: ${mv.why}`);
    }
    stats.moved += 1;
  }
  /* Out of the world. */
  for (const rm of cfg.removals ?? []) {
    const rec = pool.get(rm.n);
    const club = liveClubOf(rm.n);
    if (!rec && !club) die(`removal "${rm.n}" is in neither the new rows nor the shipped world; the list is stale`);
    if (rec && club) die(`removal "${rm.n}" is on both sides; declare the fold or the namesake first`);
    const next = nextOf(rm.n);
    const stillIn = next.find(r => worldClubOf(r.club));
    if (stillIn && !rm.later) die(`removal "${rm.n}": the year-${year + 1} row sits at ${stillIn.club}, inside the world; that is a move, unless a documented later window took him there`);
    if (rm.later && !stillIn) die(`removal "${rm.n}" claims a later window but no year-${year + 1} row sits inside the world`);
    if (!next.length && !rm.single) die(`removal "${rm.n}": no year-${year + 1} row at all, so it needs a documented single-source reason`);
    if (rec) pool.delete(rm.n);
    else { takeShipped(rm.n); touched.set(rm.n, `removed from ${club}: ${rm.why}`); }
    stats.removed += 1;
  }
  /* Arrivals from outside the new pools. */
  for (const ar of cfg.arrivals ?? []) {
    if (pool.has(ar.n)) die(`arrival "${ar.n}" is already a new-league row; that is a move`);
    if (liveClubOf(ar.n)) die(`arrival "${ar.n}" is already in the shipped world`);
    if (!world.has(ar.to)) die(`arrival "${ar.n}" is bound for unknown club "${ar.to}"`);
    let best = null;
    for (const r of rows) {
      if (r.year !== year || r.player_name !== ar.n || r.club !== ar.from) continue;
      const usd = r.market_value_usd ?? 0;
      if (!best || usd > best.usd || (usd === best.usd && r.id < best.id)) best = { position: r.position, age: r.age, usd, id: r.id, nat: r.nationality };
    }
    if (!best) die(`arrival "${ar.n}": no year-${year} row at "${ar.from}"`);
    proveAt(ar.n, ar.to, 'arrival');
    world.get(ar.to).push(bakeRow(ar.n, best));
    stats.arrived += 1;
  }


  /* The rest of the new leagues, then the standing sort. */
  for (const [name, rec] of pool) world.get(rec.engine).push(bakeRow(name, rec));
  for (const list of world.values()) list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));
  const seen = new Map();
  for (const [club, list] of world) for (const p of list) {
    if (seen.has(p.n)) die(`"${p.n}" is at ${seen.get(p.n)} and at ${club}; one man, one club, in the whole world`);
    seen.set(p.n, club);
  }
  for (const [club, name] of cfg.anchors ?? []) {
    if (!(world.get(club) ?? []).some(p => p.n === name)) die(`anchor ${name} is missing from ${year} ${club}`);
  }
  const expectedThin = new Set(cfg.expectedThin ?? []);
  const clubsSorted = [...world.keys()].sort((a, b) => a.localeCompare(b));
  const partial = [];
  let total = 0;
  for (const club of clubsSorted) {
    const n = world.get(club).length;
    total += n;
    if (n < thinUnder) {
      partial.push(club);
      if (!expectedThin.has(club)) die(`${club} has only ${n} real ${year} players and was not expected thin`);
    } else if (expectedThin.has(club)) die(`${club} was expected thin and holds ${n}`);
  }

  /* THE AUDIT. Every shipped line survives as the same bytes, at the same
     club, in the same order, unless a correction above names that player. */
  for (const [club, list] of shipped.clubs) {
    const want = list.filter(p => !touched.has(p.n)).map(p => p.line);
    const got = world.get(club).filter(p => p.shipped && origin.get(p.n) === club).map(p => p.line);
    if (want.length !== got.length || want.some((l, i) => l !== got[i])) {
      die(`${club}: the shipped lines did not survive byte for byte (${want.length} expected, ${got.length} kept)`);
    }
  }
  stats.shippedLines = shipped.meta.players;
  stats.shippedKept = shipped.meta.players - [...touched.values()].filter(w => !w.startsWith('moved ')).length;
  stats.touched = [...touched].map(([n, why]) => `${n}: ${why}`);
  stats.players = total;
  stats.clubs = clubsSorted.length;
  stats.newClubs = newClubs.length;
  stats.partial = partial.sort();
  stats.moves = shipped.meta.moves + stats.moved + stats.removed + stats.arrived + stats.folded;
  stats.sizes = Object.fromEntries(newClubs.map(c => [c, world.get(c).length]));

  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const out = [...cfg.header(stats), `import type { BakedPlayer } from '@/data/clubManagerRosters';`, '',
    `export const ${prefix}_META = {`, `  year: ${year},`, `  players: ${total},`, `  clubs: ${clubsSorted.length},`, `  moves: ${stats.moves},`, '};', '',
    `/** ${year} clubs where the year-${year} table runs thin (under ${thinUnder} real players);`,
    ` *  the game pads these squads with youth players and the picker says so. */`,
    `export const ${prefix}_PARTIAL: string[] = ${JSON.stringify(stats.partial)};`, '',
    `export const ${prefix}_ROSTERS: Record<string, BakedPlayer[]> = {`];
  for (const club of clubsSorted) {
    out.push(`  '${esc(club)}': [`);
    for (const p of world.get(club)) out.push(p.shipped ? p.line : lineOf(p));
    out.push('  ],');
  }
  out.push('};', '');
  /* The nationality on the same row each new line was baked from, for the
     per world nationality map (updateNationalityBlock below). */
  const nationalities = new Map();
  for (const list of world.values()) for (const p of list) if (!p.shipped) nationalities.set(p.n, p.nat);
  return { text: out.join(eol), stats, log, world, nationalities };
}

/** Run an extend from a bake script: print the log, fail closed, write. */
export function runExtend(cfg, { write = true } = {}) {
  let res;
  try { res = extendEra(cfg); } catch (e) {
    if (e instanceof BakeError) { console.error(`FATAL: ${e.message}`); process.exit(1); }
    throw e;
  }
  for (const l of res.log) console.log(l);
  if (write) fs.writeFileSync(cfg.outFile ?? cfg.file, res.text);
  return res;
}

/** Read a pull file ({pulledAt, table, rows}) and refuse anything but the base table. */
export function readPull(file) {
  if (!fs.existsSync(file)) { console.error(`FATAL: no pull file at ${path.resolve(file)}`); process.exit(1); }
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (d.table !== 'player_market_values') { console.error(`FATAL: ${file} is a pull of "${d.table}", not the base table`); process.exit(1); }
  return d.rows;
}

/**
 * Bring one world's block of src/data/playerNationalities.ts in line with an
 * extended era: every new line gets the nationality of the row it was baked
 * from (which also re-points a name whose namesake won the one name, one
 * player rule), and an entry whose player left the world is dropped, so the
 * map holds exactly the world's names. Entries of lines that were already
 * shipped are carried through untouched. Fails closed on a world name left
 * without a country. Returns { added, changed, dropped, total }.
 */
export function updateNationalityBlock(file, worldKey, res) {
  const raw = fs.readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(`${worldKey}: {`);
  if (start < 0) die(`${file}: no block for ${worldKey}`);
  let end = start + 1;
  const map = new Map();
  for (; end < lines.length && lines[end] !== '},'; end++) {
    const m = lines[end].match(/^  '(.*)': '(.*)',$/);
    if (!m) die(`${file}: a line this parser does not know in ${worldKey}: ${lines[end]}`);
    map.set(unesc(m[1]), unesc(m[2]));
  }
  if (lines[end] !== '},') die(`${file}: the ${worldKey} block never closes`);
  const names = new Set();
  for (const list of res.world.values()) for (const p of list) names.add(p.n);
  let added = 0, changed = 0, dropped = 0;
  for (const n of [...map.keys()]) if (!names.has(n)) { map.delete(n); dropped += 1; }
  for (const [n, nat] of res.nationalities) {
    if (!nat) die(`${n} was baked from a row with no nationality`);
    if (!map.has(n)) added += 1; else if (map.get(n) !== nat) changed += 1;
    map.set(n, nat);
  }
  for (const n of names) if (!map.has(n)) die(`${worldKey}: ${n} is in the world and has no nationality`);
  const block = [...map.keys()].sort().map(n => `  '${esc(n)}': '${esc(map.get(n))}',`);
  lines.splice(start + 1, end - start - 1, ...block);
  fs.writeFileSync(file, lines.join(eol));
  return { added, changed, dropped, total: map.size };
}

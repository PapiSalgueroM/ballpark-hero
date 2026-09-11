/**
 * Round 531: bake src/data/careerPlayers.ts from the live career tables.
 *
 * WHAT THE FILE IS. The fallback pool for Career Ladder (useCareerGame) and
 * Transfer Path (useTransferPath), served only when career_players and
 * career_seasons cannot be read. Transfer Path validates guesses off the
 * graph built from whichever pool is loaded, so a wrong club season in the
 * fallback refuses a right answer while the table is down. Until this round
 * the file was hand typed (151 players, 1,648 seasons, no header, no source)
 * while the live table had grown to 253 players and 3,608 seasons, so the
 * two pools disagreed and nothing measured the gap.
 *
 * WHAT THIS DOES. It reads the two tables exactly the way
 * src/lib/fetchCareerPlayers.ts reads them: players ordered by player_name,
 * seasons paged 1,000 at a time (the REST cap) ordered by player_id then
 * sort_order, mapped to the CareerPlayer shape, assists left null where the
 * league did not record them (never coerced to 0). It writes the file with a
 * header naming the bake, the date and the counts, in the same row format the
 * old file used so every parser that reads it (simCareerSeasonTruth's regex,
 * the esbuild bundles in the Transfer Path harnesses) keeps working.
 *
 * FAILS CLOSED, nothing written, when the read comes back short or malformed:
 * fewer players or seasons than the previous bake, a player with no seasons,
 * two players sharing a name, a stat below zero, or a string the plain row
 * format cannot carry.
 *
 * The exports are shared with scripts/simCareerFallback.mjs, which renders a
 * fresh bake in memory and fails when the committed file differs from it.
 *
 * Run: node scripts/bakeCareerPlayers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_FILE = 'src/data/careerPlayers.ts';
export const BAKE_SCRIPT = 'scripts/bakeCareerPlayers.mjs';
/* the same page size as src/lib/fetchAllRows.ts, PostgREST's hard cap */
const PAGE_SIZE = 1000;
/* the counts of the previous bake; a read that comes back below them is a
   short read, not a smaller table, until somebody moves these on purpose */
const PLAYER_FLOOR = 253;
const SEASON_FLOOR = 3608;

/* ------------------------------------------------------------------ */
/* Supabase client from the app's own hardcoded values                */
/* ------------------------------------------------------------------ */
export function supabaseFromClientTs(root = ROOT) {
  const clientTs = fs.readFileSync(path.join(root, 'src/integrations/supabase/client.ts'), 'utf8');
  const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
  const keyMatch = clientTs.match(/eyJ[A-Za-z0-9_.-]+/);
  if (!urlMatch || !keyMatch) throw new Error('could not extract the Supabase URL and public key from client.ts');
  return createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });
}

/* ------------------------------------------------------------------ */
/* Read, exactly as fetchCareerPlayers.ts does                        */
/* ------------------------------------------------------------------ */
async function pageAll(page) {
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`career_seasons page from ${from} failed: ${error.message ?? JSON.stringify(error)}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

/** { players: CareerPlayer[], playerRows, seasonRows } straight from the tables. */
export async function fetchLiveCareerPlayers(supabase) {
  const playersResult = await supabase
    .from('career_players')
    .select('id, player_name, nationality, position')
    .order('player_name', { ascending: true });
  if (playersResult.error) throw new Error(`career_players read failed: ${playersResult.error.message}`);
  const seasonRows = await pageAll((from, to) =>
    supabase
      .from('career_seasons')
      .select('player_id, season, club, goals, assists, appearances, market_value, sort_order')
      .order('player_id', { ascending: true })
      .order('sort_order', { ascending: true })
      .range(from, to),
  );
  const seasonsByPlayer = new Map();
  for (const row of seasonRows) {
    const season = {
      season: row.season,
      club: row.club,
      goals: row.goals,
      assists: row.assists,
      appearances: row.appearances,
      marketValue: row.market_value,
    };
    const existing = seasonsByPlayer.get(row.player_id);
    if (existing) existing.push(season);
    else seasonsByPlayer.set(row.player_id, [season]);
  }
  const players = playersResult.data.map(p => ({
    name: p.player_name,
    nationality: p.nationality,
    position: p.position,
    career: seasonsByPlayer.get(p.id) ?? [],
  }));
  return { players, playerRows: playersResult.data, seasonRows };
}

/* ------------------------------------------------------------------ */
/* Shape checks, shared with the fence                                */
/* ------------------------------------------------------------------ */
/** Strings the plain row format carries verbatim: no quote, no backslash, no newline. */
const PLAIN = /^[^"\\\r\n]+$/;
const isCount = v => Number.isInteger(v) && v >= 0;

/** Every reason the pool is not fit to write. Empty when it is. */
export function poolProblems(players) {
  const problems = [];
  const names = new Map();
  for (const p of players) {
    if (typeof p.name !== 'string' || !PLAIN.test(p.name)) problems.push(`player name not plain: ${JSON.stringify(p.name)}`);
    if (typeof p.nationality !== 'string' || !PLAIN.test(p.nationality)) problems.push(`${p.name}: nationality not plain: ${JSON.stringify(p.nationality)}`);
    if (typeof p.position !== 'string' || !PLAIN.test(p.position)) problems.push(`${p.name}: position not plain: ${JSON.stringify(p.position)}`);
    names.set(p.name, (names.get(p.name) ?? 0) + 1);
    if (!Array.isArray(p.career) || p.career.length === 0) { problems.push(`${p.name}: no seasons`); continue; }
    for (const s of p.career) {
      const where = `${p.name} ${s.season} ${s.club}`;
      if (typeof s.season !== 'string' || !PLAIN.test(s.season)) problems.push(`${where}: season not plain`);
      if (typeof s.club !== 'string' || !PLAIN.test(s.club)) problems.push(`${where}: club not plain`);
      if (!isCount(s.goals)) problems.push(`${where}: goals ${s.goals}`);
      if (!(s.assists === null || isCount(s.assists))) problems.push(`${where}: assists ${s.assists}`);
      if (!isCount(s.appearances)) problems.push(`${where}: appearances ${s.appearances}`);
      if (!isCount(s.marketValue)) problems.push(`${where}: marketValue ${s.marketValue}`);
    }
  }
  for (const [name, n] of names) if (n > 1) problems.push(`${n} players named ${name}`);
  return problems;
}

/* ------------------------------------------------------------------ */
/* Emit                                                               */
/* ------------------------------------------------------------------ */
export function countNullAssists(players) {
  let n = 0;
  for (const p of players) for (const s of p.career) if (s.assists === null) n += 1;
  return n;
}

/** The module text for a pool and a stamp. Same row format as the hand typed file. */
export function renderCareerPlayersModule(players, stamp) {
  const seasons = players.reduce((n, p) => n + p.career.length, 0);
  const nullAssists = countNullAssists(players);
  let out = `/**
 * GENERATED by ${BAKE_SCRIPT} on ${stamp}. DO NOT EDIT BY HAND.
 *
 * The fallback pool for Career Ladder (useCareerGame) and Transfer Path
 * (useTransferPath), served only when career_players and career_seasons
 * cannot be read. It is a copy of those two tables, read the way
 * src/lib/fetchCareerPlayers.ts reads them: players ordered by name, seasons
 * paged 1,000 at a time ordered by player id then sort_order, and assists left
 * null where the league did not record them (never coerced to 0).
 *
 * ${players.length} players, ${seasons} season rows, ${nullAssists} of them with null assists.
 * scripts/simCareerFallback.mjs fails when this file differs from a fresh bake.
 * Regenerate with: node ${BAKE_SCRIPT}
 */
import type { CareerPlayer } from '@/types/career';

export const CAREER_FALLBACK_META = {
  generated: '${stamp}',
  players: ${players.length},
  seasons: ${seasons},
  nullAssists: ${nullAssists},
};

export const careerPlayers: CareerPlayer[] = [
`;
  for (const p of players) {
    out += `  {\n    name: "${p.name}",\n    nationality: "${p.nationality}",\n    position: "${p.position}",\n    career: [\n`;
    for (const s of p.career) {
      out += `      { season: "${s.season}", club: "${s.club}", goals: ${s.goals}, assists: ${s.assists === null ? 'null' : s.assists}, appearances: ${s.appearances}, marketValue: ${s.marketValue} },\n`;
    }
    out += `    ],\n  },\n`;
  }
  out += `];\n`;
  return out;
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */
const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const supabase = supabaseFromClientTs();
  const { players, seasonRows } = await fetchLiveCareerPlayers(supabase);
  const errors = poolProblems(players);
  if (players.length < PLAYER_FLOOR) errors.push(`only ${players.length} players read (floor ${PLAYER_FLOOR}); a short read, or move the floor on purpose`);
  if (seasonRows.length < SEASON_FLOOR) errors.push(`only ${seasonRows.length} seasons read (floor ${SEASON_FLOOR}); a short read, or move the floor on purpose`);
  if (errors.length) {
    console.error('FAILED CLOSED, nothing written. Problems:');
    for (const e of errors.slice(0, 40)) console.error('  - ' + e);
    if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
    process.exit(1);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const out = renderCareerPlayersModule(players, stamp);
  fs.writeFileSync(path.join(ROOT, OUT_FILE), out);
  console.log(`Wrote ${OUT_FILE} (${(out.length / 1024).toFixed(0)}KB): ${players.length} players, ${seasonRows.length} seasons, ${countNullAssists(players)} null assists, generated ${stamp}`);
}

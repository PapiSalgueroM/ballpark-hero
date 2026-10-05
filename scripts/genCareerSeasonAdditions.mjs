/**
 * Round 1010b: write a season ledger to the career tables, the bake and the
 * Transfer Path entries it moves, from one source of truth.
 *
 *   node scripts/genCareerSeasonAdditions.mjs [--ledger scripts/data/careerSeason2025.json] [--check]
 *
 * The ledger (see scripts/lib/careerSeasonLedger.mjs) carries the rows a
 * season adds, the snapshot rows it corrects field by field, the careers that
 * ended, the men held for a relabel round and the duplicate entries it
 * removes, each row with its sources. This script:
 *
 *   1. Reads the bake as it stood before the ledger (ledger.preBake.commit,
 *      git show, never the live tables) and proves it by its hash.
 *   2. Applies the ledger offline: the pool after it is exactly what the
 *      tables will read after the migration.
 *   3. Derives, on that pool and under each rule (classic, Europe only,
 *      Active players only), every Transfer Path entry the new pool beats or
 *      whose hint names a removed man, with scripts/lib/transferPathHints.mjs,
 *      the same search the game and simTransferPathHints use. The value each
 *      one replaces is the value live after Round 784 with the Round 531
 *      active refresh applied; puzzles naming a removed man are renamed to the
 *      man he is kept as, never deleted (deleting a row moves the daily).
 *   4. Writes the migration (one fail closed do-block, NOT applied by this
 *      script), src/data/careerPlayers.ts through the bake's own renderer (so
 *      the lead's re-bake after the apply changes only the date stamp), and
 *      the derived numbers back into the ledger (preBake, postBake, coverage,
 *      careerQuiz, transferPath).
 *
 * --check writes nothing and exits 1 when any output on disk differs from
 * what the ledger produces now. It reads no network and no database.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { poolProblems, renderCareerPlayersModule } from './bakeCareerPlayers.mjs';
import { ROUND_784_MIGRATION, buildGraph, deriveHint, parseActiveRefreshMigration, parseRuleEntryRefresh, parseTransferPathCompanionMigration, ruleProblems } from './lib/transferPathHints.mjs';
import { LEDGER_FILE, applyLedger, bakeHash, careerQuizShift, clone, coverage, loadSiteModules } from './lib/careerSeasonLedger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COMPANION = 'supabase/migrations/20260907173202_quarantine_unreachable_transfer_path_puzzles_and_refresh_hints.sql';
export const ACTIVE_REFRESH = 'supabase/migrations/20260911190000_refresh_verified_active_transfer_path_hints.sql';
export const MIGRATION_OUT = 'supabase/migrations/20261015120000_round_1010_career_season_2025_26.sql';
export const BAKE_OUT = 'src/data/careerPlayers.ts';
export const BAKE_FILE = 'src/data/careerPlayers.ts';
export const PUZZLE_COUNT = 885;
export const ACTIVE_REFRESHED = 212;
export const RULES = ['classic', 'europe', 'active'];
/* the Career Quiz apply date the lead plans (on or after 2026-10-15 ET) */
export const PLANNED_APPLY = '2026-10-15';

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const seasonCount = players => players.reduce((n, p) => n + p.career.length, 0);

/** The bake text at a commit, from git, never from the live tables. */
export function bakeTextAt(commit, root = ROOT) {
  return execFileSync('git', ['show', `${commit}:${BAKE_FILE}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** The pool before the ledger, proved by its hash when the ledger has one. */
export async function loadPreBake(ledger, root = ROOT) {
  const commit = ledger.preBake?.commit;
  if (!commit) throw new Error('the ledger names no preBake.commit');
  const site = await loadSiteModules(root, { bakeText: bakeTextAt(commit, root) });
  const pre = clone(site.careerPlayers);
  const hash = bakeHash(pre);
  if (ledger.preBake.sha256 && ledger.preBake.sha256 !== hash) throw new Error(`the bake at ${commit} hashes to ${hash}, the ledger records ${ledger.preBake.sha256}`);
  return { pre, hash, site };
}

/** Each duplicate entry the ledger removes, checked against the man he is kept as. */
export function removedProblems(pre, ledger) {
  const out = [];
  const keys = p => p.career.map(s => `${s.season}|${s.club}`).join(',');
  for (const r of ledger.removed ?? []) {
    const gone = pre.find(p => p.name === r.player), kept = pre.find(p => p.name === r.keptAs);
    if (!gone || !kept) { out.push(`${r.player} or ${r.keptAs} is not in the pool before the ledger`); continue; }
    if (keys(gone) !== keys(kept)) out.push(`${r.player} and ${r.keptAs} do not carry the same season and club keys`);
    if (r.copy && JSON.stringify(r.copy) !== JSON.stringify(gone)) out.push(`the ledger's copy of ${r.player} is not his entry in the pool before the ledger`);
  }
  return out;
}

/** Players whose club and season key sets are identical: the twin test. */
export function identicalKeySets(players) {
  const seen = new Map(), pairs = [];
  for (const p of players) {
    const k = p.career.map(s => `${s.season}|${s.club}`).sort().join(',');
    if (seen.has(k)) pairs.push([seen.get(k), p.name]); else seen.set(k, p.name);
  }
  return pairs;
}

/* ------------------------------------------------------------------ */
/* Transfer Path: the values live after Round 784, and what moves      */
/* ------------------------------------------------------------------ */

/**
 * puzzle id -> { a, b, classic, europe, active }: the pair and the value each
 * rule carries after the applied companion, the Round 784 rewrites and the
 * Round 531 active refresh (the state the migration requires before it runs).
 */
export function liveAfter784(root = ROOT) {
  const companion = parseTransferPathCompanionMigration(fs.readFileSync(path.join(root, COMPANION), 'utf8')).desired;
  const r784 = parseRuleEntryRefresh(fs.readFileSync(path.join(root, ROUND_784_MIGRATION), 'utf8'));
  const refresh = parseActiveRefreshMigration(fs.readFileSync(path.join(root, ACTIVE_REFRESH), 'utf8'));
  const live = new Map();
  for (const c of companion) {
    live.set(c.id, {
      a: c.playerA, b: c.playerB,
      classic: { minSteps: c.minSteps, hint: c.hint },
      europe: c.europeMinSteps === null ? null : { minSteps: c.europeMinSteps, hint: c.europeHint },
      active: null,
    });
  }
  for (const r of r784) {
    const p = live.get(r.id);
    if (!p || p.a !== r.a || p.b !== r.b) throw new Error(`Round 784 rewrites ${r.id}, which the companion does not carry as ${r.a} to ${r.b}`);
    p[r.rule] = { minSteps: r.minSteps, hint: r.hint };
  }
  for (const [id, r] of refresh) {
    const p = live.get(id);
    if (!p || p.a !== r.a || p.b !== r.b) throw new Error(`the active refresh writes ${id}, which the companion does not carry as ${r.a} to ${r.b}`);
    p.active = { minSteps: r.minSteps, hint: r.hint };
  }
  if (live.size !== PUZZLE_COUNT) throw new Error(`the companion carries ${live.size} puzzles, expected ${PUZZLE_COUNT}`);
  return live;
}

/** The three rule graphs of a pool, through the page's own rule filter. */
export function ruleGraphs(players, playersUnderRule) {
  return { classic: buildGraph(players), europe: buildGraph(playersUnderRule(players, 'europe')), active: buildGraph(playersUnderRule(players, 'active')) };
}

const sameEntry = (x, y) => (x === null && y === null) || (x !== null && y !== null && x.minSteps === y.minSteps && x.hint === y.hint);

/**
 * The renames and rewrites the ledger forces. A puzzle naming a removed man
 * is renamed to the man he is kept as. An entry is rewritten exactly when the
 * value live after Round 784 is wrong on the pool after the ledger under its
 * rule (the search beats it, finds a path where it says none, or its hint
 * names the wrong player), and the new value is the search's own.
 * `preGraphs` proves every old value true on the pool before the ledger.
 */
export function deriveTransferPath(live, preGraphs, postGraphs, ledger) {
  const renameTo = new Map((ledger.removed ?? []).map(r => [r.player, r.keptAs]));
  const renames = [], rewrites = [], problems = [];
  for (const [id, p] of live) {
    const a = renameTo.get(p.a) ?? p.a, b = renameTo.get(p.b) ?? p.b;
    if (a !== p.a || b !== p.b) renames.push({ id, oldA: p.a, oldB: p.b, a, b });
    for (const rule of RULES) {
      const old = p[rule];
      for (const pr of ruleProblems(preGraphs[rule], p.a, p.b, old)) problems.push(`${id} under ${rule} is already wrong before the ledger: ${pr}`);
      if (!ruleProblems(postGraphs[rule], a, b, old).length) continue;
      const d = deriveHint(postGraphs[rule], a, b);
      const next = d ? { minSteps: d.minSteps, hint: d.hint } : null;
      if (rule === 'classic' && !next) { problems.push(`${id}: ${a} to ${b} has no classic path after the ledger`); continue; }
      if (sameEntry(old, next)) { problems.push(`${id} under ${rule}: flagged, yet the search gives the same value`); continue; }
      if (next && (/[\u2013\u2014]/.test(next.hint) || next.hint.length > 200)) problems.push(`${id} under ${rule}: the new hint has a long dash or runs past 200 characters`);
      rewrites.push({ id, a, b, rule, old, next });
    }
  }
  return { renames, rewrites, problems };
}

/* ------------------------------------------------------------------ */
/* The migration                                                       */
/* ------------------------------------------------------------------ */

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const qn = (v, type) => (v === null || v === undefined ? `null::${type}` : type === 'text' ? q(v) : String(v));
const pad = '  ';

/** Every career row the ledger changes, grouped per row: [{ player, playerId, season, club, before, after }] */
export function changedRows(pre, post, ledger) {
  const rows = new Map();
  for (const c of ledger.changed ?? []) {
    const key = `${c.player}|${c.season}|${c.club}`;
    if (!rows.has(key)) {
      const before = pre.find(p => p.name === c.player).career.filter(s => s.season === c.season && s.club === c.club);
      const after = post.find(p => p.name === c.player).career.filter(s => s.season === c.season && s.club === c.club);
      if (before.length !== 1 || after.length !== 1) throw new Error(`${key}: expected exactly one row before and after, found ${before.length} and ${after.length}`);
      rows.set(key, { player: c.player, playerId: c.playerId, season: c.season, club: c.club, before: before[0], after: after[0] });
    }
  }
  return [...rows.values()];
}

/** The whole migration text for one ledger, deterministic. */
export function renderMigration({ ledger, pre, post, renames, rewrites, quiz, cover }) {
  const removed = ledger.removed ?? [];
  const added = ledger.added ?? [];
  const changed = changedRows(pre, post, ledger);
  const preSeasons = seasonCount(pre), postSeasons = seasonCount(post);
  const removedRows = removed.reduce((n, r) => n + r.copy.career.length, 0);
  if (preSeasons - removedRows + added.length !== postSeasons) throw new Error('season arithmetic does not add up');
  const activeBefore = [...liveAfter784().values()].filter(p => p.active).length;
  const activeAfter = activeBefore + rewrites.filter(r => r.rule === 'active').reduce((n, r) => n + (r.next ? 1 : 0) - (r.old ? 1 : 0), 0);
  const byRule = rule => rewrites.filter(r => r.rule === rule).length;
  const L = [];
  L.push(`-- Round 1010b, wave 1: the 2025-2026 season for the Liverpool men of the`);
  L.push(`-- career pool, their 2024-2025 rows corrected, and the Alisson twin removed.`);
  L.push(`--`);
  L.push(`-- GENERATED by scripts/genCareerSeasonAdditions.mjs from ${LEDGER_FILE},`);
  L.push(`-- which carries every row below with its sources. Do not edit by hand.`);
  L.push(`-- NOT APPLIED. Apply on or after ${PLANNED_APPLY} ET, away from midnight ET, after the`);
  L.push(`-- Round 531 active refresh (${path.basename(ACTIVE_REFRESH)}): this block refuses`);
  L.push(`-- to run on any other active state. After applying, node scripts/bakeCareerPlayers.mjs`);
  L.push(`-- must leave ${BAKE_OUT} unchanged except its date stamp, then run`);
  L.push(`-- node scripts/genCareerLadderRoster.mjs (expect an x line for the removed id).`);
  L.push(`--`);
  L.push(`--   added: ${added.length} rows for ${ledger.season}, assists only where two sources agree, market value 0 (n/a)`);
  L.push(`--   changed: ${changed.length} rows of ${ledger.previousSeason} that were mid-season snapshots, each guarded by its old values`);
  for (const r of removed) L.push(`--   removed: ${r.player} (${r.playerId}), kept as ${r.keptAs}; his ${r.copy.career.length} season rows go with him (ON DELETE CASCADE)`);
  L.push(`--   Transfer Path: ${renames.length} puzzles renamed, ${rewrites.length} entries rewritten (${byRule('classic')} classic, ${byRule('europe')} Europe, ${byRule('active')} active),`);
  L.push(`--   each guarded by the value it replaces and each the search's own on the pool after this migration`);
  L.push(`--   career_players ${pre.length} to ${post.length}, career_seasons ${preSeasons} to ${postSeasons}, active entries ${activeBefore} to ${activeAfter}`);
  L.push(`--   Career Quiz on ${quiz.start}: ${quiz.changedDays} of the next ${quiz.days} days deal a different man (${quiz.firstDay.before} becomes ${quiz.firstDay.after});`);
  L.push(`--   ${quiz.reDealtFromLastWindow} of those ${quiz.days} answers were dealt in the ${quiz.window} days before (0 without the change).`);
  L.push(`--   Coverage: ${cover.unaccounted.length} men still stop at ${ledger.previousSeason} after this wave.`);
  L.push('');
  L.push('do $migration$');
  L.push('declare');
  L.push(`${pad}n integer;`);
  L.push(`${pad}next_order integer;`);
  L.push(`${pad}desired record;`);
  L.push(`${pad}updated_this_row integer;`);
  L.push(`${pad}updated_rows integer := 0;`);
  L.push('begin');
  L.push(`${pad}select count(*) into n from public.career_players;`);
  L.push(`${pad}if n <> ${pre.length} then raise exception 'expected ${pre.length} career_players rows before this migration, found %', n; end if;`);
  L.push(`${pad}select count(*) into n from public.career_seasons;`);
  L.push(`${pad}if n <> ${preSeasons} then raise exception 'expected ${preSeasons} career_seasons rows before this migration, found %', n; end if;`);
  L.push(`${pad}select count(*) into n from public.transfer_path_puzzles;`);
  L.push(`${pad}if n <> ${PUZZLE_COUNT} then raise exception 'expected ${PUZZLE_COUNT} Transfer Path puzzles, found %', n; end if;`);
  L.push(`${pad}select count(*) into n from public.transfer_path_puzzles where active_min_steps is not null and active_hint is not null;`);
  L.push(`${pad}if n <> ${activeBefore} then raise exception 'expected the ${activeBefore} active entries of the Round 531 refresh, found %; apply ${path.basename(ACTIVE_REFRESH)} first', n; end if;`);
  renderCareerBlock(L, { ledger, pre, post, changed, preSeasons, postSeasons });
  renderPuzzleBlock(L, { renames, rewrites, activeAfter, removed });
  L.push('end');
  L.push('$migration$;');
  return L.join('\n') + '\n';
}

function renderCareerBlock(L, { ledger, pre, post, changed, preSeasons, postSeasons }) {
  for (const r of ledger.removed ?? []) {
    const rows = r.copy.career;
    L.push('');
    L.push(`${pad}-- ${r.player} is ${r.keptAs} twice: the same ${rows.length} season and club keys both ways, and exactly the rows the ledger copies`);
    L.push(`${pad}select count(*) into n from public.career_players where id = ${q(r.playerId)} and player_name = ${q(r.player)};`);
    L.push(`${pad}if n <> 1 then raise exception '${r.player}: expected one career_players row at ${r.playerId}, found %', n; end if;`);
    L.push(`${pad}select count(*) into n from public.career_players where id = ${q(r.keptId)} and player_name = ${q(r.keptAs)};`);
    L.push(`${pad}if n <> 1 then raise exception '${r.keptAs}: expected one career_players row at ${r.keptId}, found %', n; end if;`);
    L.push(`${pad}select count(*) into n from (select season, club from public.career_seasons where player_id = ${q(r.playerId)} except select season, club from public.career_seasons where player_id = ${q(r.keptId)}) x;`);
    L.push(`${pad}if n <> 0 then raise exception '${r.player} carries % season and club keys ${r.keptAs} does not', n; end if;`);
    L.push(`${pad}select count(*) into n from (select season, club from public.career_seasons where player_id = ${q(r.keptId)} except select season, club from public.career_seasons where player_id = ${q(r.playerId)}) x;`);
    L.push(`${pad}if n <> 0 then raise exception '${r.keptAs} carries % season and club keys ${r.player} does not', n; end if;`);
    L.push(`${pad}select count(*) into n from public.career_seasons where player_id = ${q(r.playerId)};`);
    L.push(`${pad}if n <> ${rows.length} then raise exception '${r.player}: expected ${rows.length} season rows, found %', n; end if;`);
    L.push(`${pad}select count(*) into n from public.career_seasons s join (values`);
    rows.forEach((s, i) => L.push(`${pad}${pad}(${q(s.season)}, ${q(s.club)}, ${s.goals}, ${qn(s.assists, 'integer')}, ${s.appearances}, ${s.marketValue})${i < rows.length - 1 ? ',' : ''}`));
    L.push(`${pad}) as v(season, club, goals, assists, appearances, market_value)`);
    L.push(`${pad}${pad}on s.season = v.season and s.club = v.club and s.goals = v.goals and s.assists is not distinct from v.assists and s.appearances = v.appearances and s.market_value = v.market_value`);
    L.push(`${pad}where s.player_id = ${q(r.playerId)};`);
    L.push(`${pad}if n <> ${rows.length} then raise exception '${r.player}: only % of his ${rows.length} rows are the ones the ledger copies', n; end if;`);
  }
  for (const c of changed) {
    const b = c.before, a = c.after;
    const guard = `player_id = ${q(c.playerId)} and season = ${q(c.season)} and club = ${q(c.club)} and goals = ${b.goals} and assists is not distinct from ${qn(b.assists, 'integer')} and appearances = ${b.appearances} and market_value = ${b.marketValue}`;
    L.push('');
    L.push(`${pad}-- ${c.player} ${c.season} ${c.club}: ${b.appearances} apps ${b.goals} goals to ${a.appearances} apps ${a.goals} goals (a mid-season snapshot)`);
    L.push(`${pad}select count(*) into n from public.career_players where id = ${q(c.playerId)} and player_name = ${q(c.player)};`);
    L.push(`${pad}if n <> 1 then raise exception '${c.player}: expected one career_players row at ${c.playerId}, found %', n; end if;`);
    L.push(`${pad}update public.career_seasons set goals = ${a.goals}, assists = ${qn(a.assists, 'integer')}, appearances = ${a.appearances}`);
    L.push(`${pad}where ${guard};`);
    L.push(`${pad}get diagnostics n = row_count;`);
    L.push(`${pad}if n <> 1 then raise exception '${c.player} ${c.season} ${c.club}: expected one row carrying the old values, updated %', n; end if;`);
  }
  const addedBy = new Map();
  for (const r of ledger.added ?? []) (addedBy.get(r.player) ?? addedBy.set(r.player, []).get(r.player)).push(r);
  for (const [player, rows] of addedBy) {
    const id = rows[0].playerId;
    const before = pre.find(p => p.name === player).career;
    const last = before[before.length - 1];
    L.push('');
    L.push(`${pad}-- ${player}: ${rows.map(r => `${r.season} ${r.club}`).join(', ')} after ${last.season} ${last.club}`);
    L.push(`${pad}select count(*) into n from public.career_players where id = ${q(id)} and player_name = ${q(player)};`);
    L.push(`${pad}if n <> 1 then raise exception '${player}: expected one career_players row at ${id}, found %', n; end if;`);
    L.push(`${pad}select count(*) into n from public.career_seasons where player_id = ${q(id)};`);
    L.push(`${pad}if n <> ${before.length} then raise exception '${player}: expected ${before.length} season rows, found %', n; end if;`);
    L.push(`${pad}select count(*) into n from (select season, club from public.career_seasons where player_id = ${q(id)} order by sort_order desc limit 1) t where t.season = ${q(last.season)} and t.club = ${q(last.club)};`);
    L.push(`${pad}if n <> 1 then raise exception '${player}: the path no longer ends at ${last.season} ${last.club}'; end if;`);
    for (const r of rows) {
      L.push(`${pad}select count(*) into n from public.career_seasons where player_id = ${q(id)} and season = ${q(r.season)} and club = ${q(r.club)};`);
      L.push(`${pad}if n <> 0 then raise exception '${player}: ${r.season} ${r.club} is already there'; end if;`);
      L.push(`${pad}select max(sort_order) into next_order from public.career_seasons where player_id = ${q(id)};`);
      L.push(`${pad}insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values`);
      L.push(`${pad}${pad}(${q(id)}, ${q(r.season)}, ${q(r.club)}, ${r.goals}, ${qn(r.assists, 'integer')}, ${r.appearances}, ${r.marketValue}, next_order + 1);`);
    }
  }
  for (const r of ledger.removed ?? []) {
    L.push('');
    L.push(`${pad}delete from public.career_players where id = ${q(r.playerId)} and player_name = ${q(r.player)};`);
    L.push(`${pad}get diagnostics n = row_count;`);
    L.push(`${pad}if n <> 1 then raise exception '${r.player}: expected to delete one career_players row, deleted %', n; end if;`);
    L.push(`${pad}select count(*) into n from public.career_seasons where player_id = ${q(r.playerId)};`);
    L.push(`${pad}if n <> 0 then raise exception '${r.player}: % season rows survived the delete', n; end if;`);
  }
  L.push('');
  L.push(`${pad}select count(*) into n from public.career_players;`);
  L.push(`${pad}if n <> ${post.length} then raise exception 'expected ${post.length} career_players rows after this migration, found %', n; end if;`);
  L.push(`${pad}select count(*) into n from public.career_seasons;`);
  L.push(`${pad}if n <> ${postSeasons} then raise exception 'expected ${postSeasons} career_seasons rows after this migration, found %', n; end if;`);
}

const RULE_COLUMNS = { classic: ['min_steps', 'hint'], europe: ['europe_min_steps', 'europe_hint'], active: ['active_min_steps', 'active_hint'] };

function renderPuzzleBlock(L, { renames, rewrites, activeAfter, removed }) {
  L.push('');
  L.push(`${pad}-- Transfer Path: every puzzle naming a removed man is renamed (never deleted, a delete moves the daily)`);
  L.push(`${pad}for desired in`);
  L.push(`${pad}${pad}select * from (values`);
  renames.forEach((r, i) => L.push(`${pad}${pad}${pad}(${q(r.id)}, ${q(r.oldA)}, ${q(r.oldB)}, ${q(r.a)}, ${q(r.b)})${i < renames.length - 1 ? ',' : ''}`));
  L.push(`${pad}${pad}) as rows(puzzle_id, old_player_a, old_player_b, player_a, player_b)`);
  L.push(`${pad}loop`);
  L.push(`${pad}${pad}update public.transfer_path_puzzles p set player_a = desired.player_a, player_b = desired.player_b`);
  L.push(`${pad}${pad}where p.puzzle_id = desired.puzzle_id and p.player_a = desired.old_player_a and p.player_b = desired.old_player_b;`);
  L.push(`${pad}${pad}get diagnostics updated_this_row = row_count;`);
  L.push(`${pad}${pad}if updated_this_row <> 1 then raise exception 'Transfer Path %: expected one row named % to %, renamed %', desired.puzzle_id, desired.old_player_a, desired.old_player_b, updated_this_row; end if;`);
  L.push(`${pad}${pad}updated_rows := updated_rows + 1;`);
  L.push(`${pad}end loop;`);
  L.push(`${pad}if updated_rows <> ${renames.length} then raise exception 'expected to rename ${renames.length} Transfer Path puzzles, renamed %', updated_rows; end if;`);
  for (const r of removed) {
    L.push(`${pad}select count(*) into n from public.transfer_path_puzzles where player_a = ${q(r.player)} or player_b = ${q(r.player)};`);
    L.push(`${pad}if n <> 0 then raise exception '% Transfer Path puzzles still name ${r.player}', n; end if;`);
  }
  L.push('');
  L.push(`${pad}-- the entries the new pool beats, each written only over the exact value it replaces (null allowed)`);
  L.push(`${pad}updated_rows := 0;`);
  L.push(`${pad}for desired in`);
  L.push(`${pad}${pad}select * from (values`);
  rewrites.forEach((r, i) => L.push(`${pad}${pad}${pad}(${q(r.id)}, ${q(r.a)}, ${q(r.b)}, ${q(r.rule)}, ${qn(r.old?.minSteps ?? null, 'smallint')}, ${qn(r.old?.hint ?? null, 'text')}, ${qn(r.next?.minSteps ?? null, 'smallint')}, ${qn(r.next?.hint ?? null, 'text')})${i < rewrites.length - 1 ? ',' : ''}`));
  L.push(`${pad}${pad}) as rows(puzzle_id, player_a, player_b, rule, old_min_steps, old_hint, min_steps, hint)`);
  L.push(`${pad}loop`);
  RULES.forEach((rule, i) => {
    const [min, hint] = RULE_COLUMNS[rule];
    L.push(`${pad}${pad}${i === 0 ? 'if' : 'elsif'} desired.rule = '${rule}' then`);
    L.push(`${pad}${pad}${pad}update public.transfer_path_puzzles p set ${min} = desired.min_steps, ${hint} = desired.hint`);
    L.push(`${pad}${pad}${pad}where p.puzzle_id = desired.puzzle_id and p.player_a = desired.player_a and p.player_b = desired.player_b`);
    L.push(`${pad}${pad}${pad}${pad}and p.${min} is not distinct from desired.old_min_steps and p.${hint} is not distinct from desired.old_hint;`);
  });
  L.push(`${pad}${pad}else`);
  L.push(`${pad}${pad}${pad}raise exception 'unknown Transfer Path rule %', desired.rule;`);
  L.push(`${pad}${pad}end if;`);
  L.push(`${pad}${pad}get diagnostics updated_this_row = row_count;`);
  L.push(`${pad}${pad}if updated_this_row <> 1 then raise exception 'Transfer Path % under %: expected one row carrying %, updated %', desired.puzzle_id, desired.rule, desired.old_min_steps, updated_this_row; end if;`);
  L.push(`${pad}${pad}updated_rows := updated_rows + 1;`);
  L.push(`${pad}end loop;`);
  L.push(`${pad}if updated_rows <> ${rewrites.length} then raise exception 'expected to rewrite ${rewrites.length} Transfer Path entries, rewrote %', updated_rows; end if;`);
  L.push(`${pad}select count(*) into n from public.transfer_path_puzzles where active_min_steps is not null and active_hint is not null;`);
  L.push(`${pad}if n <> ${activeAfter} then raise exception 'expected ${activeAfter} active entries after this migration, found %', n; end if;`);
  L.push(`${pad}select count(*) into n from public.transfer_path_puzzles;`);
  L.push(`${pad}if n <> ${PUZZLE_COUNT} then raise exception 'expected ${PUZZLE_COUNT} Transfer Path puzzles after this migration, found %', n; end if;`);
}

/* ------------------------------------------------------------------ */
/* Generate                                                            */
/* ------------------------------------------------------------------ */

/** Everything the ledger produces, in memory: { ledger, migration, bake, summary }. */
export async function generate(ledgerIn, root = ROOT) {
  const ledger = clone(ledgerIn);
  const { pre, hash, site } = await loadPreBake(ledger, root);
  ledger.preBake = { ...ledger.preBake, sha256: hash, players: pre.length, seasons: seasonCount(pre) };
  for (const r of ledger.removed ?? []) {
    const entry = pre.find(p => p.name === r.player);
    if (!entry) throw new Error(`removed ${r.player} is not in the pool before the ledger`);
    r.copy ??= clone(entry);
  }
  const errors = removedProblems(pre, ledger);
  const post = applyLedger(pre, ledger);
  errors.push(...poolProblems(post));
  for (const [x, y] of identicalKeySets(post)) errors.push(`${x} and ${y} carry identical club and season keys after the ledger`);
  const live = liveAfter784(root);
  const preGraphs = ruleGraphs(pre, site.playersUnderRule);
  const postGraphs = ruleGraphs(post, site.playersUnderRule);
  const { renames, rewrites, problems } = deriveTransferPath(live, preGraphs, postGraphs, ledger);
  errors.push(...problems);
  if (errors.length) throw new Error(`the ledger does not generate cleanly:\n  - ${errors.slice(0, 30).join('\n  - ')}`);
  const quiz = careerQuizShift(pre.map(p => p.name), post.map(p => p.name), PLANNED_APPLY);
  const cover = coverage(post, ledger);
  const stamp = ledger.waves[ledger.waves.length - 1].checked;
  ledger.postBake = { sha256: bakeHash(post), players: post.length, seasons: seasonCount(post), stamp };
  ledger.coverage = {
    baseline: cover.unaccounted.length,
    rule: `men whose last row is ${ledger.previousSeason} and who are neither added, ended nor held; simCareerSeasonAdditions fails when the count rises above this baseline, and each wave lowers it in the same commit`,
    stopAtOlderSeason: cover.olderStops,
    unaccounted: cover.unaccounted,
  };
  ledger.careerQuiz = {
    variant: 'plain delete of the twin; no swap-in, because no candidate has a fully two-sourced career',
    plannedApply: quiz.start,
    changedDaysOfNext60: quiz.changedDays,
    firstDay: quiz.firstDay,
    answersAlsoDealtInTheLast90Days: quiz.reDealtFromLastWindow,
    answersAlsoDealtInTheLast90DaysWithoutTheChange: quiz.reDealtFromLastWindowWithoutChange,
    daysRepeatingAManFromTheirOwnLast90Days: quiz.reDealt,
    daysRepeatingWithoutTheChange: quiz.reDealtWithoutChange,
  };
  const count = rule => rewrites.filter(r => r.rule === rule).length;
  ledger.transferPath = { renamed: renames.map(r => r.id), rewritten: { classic: count('classic'), europe: count('europe'), active: count('active') } };
  const migration = renderMigration({ ledger, pre, post, renames, rewrites, quiz, cover });
  const bake = renderCareerPlayersModule(post, stamp);
  return { ledger, migration, bake, pre, post, renames, rewrites, quiz, cover };
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const ledgerRel = args.includes('--ledger') ? args[args.indexOf('--ledger') + 1] : LEDGER_FILE;
  const check = args.includes('--check');
  const { formatLedger } = await import('./lib/careerSeasonLedger.mjs');
  let out;
  try { out = await generate(JSON.parse(read(ledgerRel))); } catch (e) { console.error('FAILED CLOSED, nothing written. ' + e.message); process.exit(1); }
  const files = [[ledgerRel, formatLedger(out.ledger)], [MIGRATION_OUT, out.migration], [BAKE_OUT, out.bake]];
  const norm = s => s.replaceAll('\r\n', '\n');
  let drift = 0;
  for (const [rel, text] of files) {
    const abs = path.join(ROOT, rel);
    const same = fs.existsSync(abs) && norm(fs.readFileSync(abs, 'utf8')) === norm(text);
    if (check) { if (!same) { drift += 1; console.error(`DIFFERS: ${rel} is not what the ledger generates`); } continue; }
    if (!same) fs.writeFileSync(abs, text);
    console.log(`${same ? 'unchanged' : 'wrote'} ${rel}`);
  }
  const t = out.ledger.transferPath;
  console.log(`pool ${out.pre.length} to ${out.post.length} players, ${seasonCount(out.pre)} to ${seasonCount(out.post)} seasons; ${t.renamed.length} puzzles renamed; rewrites classic ${t.rewritten.classic}, Europe ${t.rewritten.europe}, active ${t.rewritten.active}; coverage ${out.cover.unaccounted.length} unaccounted`);
  if (check) { if (drift) process.exit(1); console.log('genCareerSeasonAdditions --check: every output matches the ledger'); }
}

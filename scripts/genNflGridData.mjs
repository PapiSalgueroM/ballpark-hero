/* The NFL answer key, derived offline and keyed on identity.

   Round 403 built this from the tables the site holds (rosters from 2002).
   Round 404 reaches back to 1970 through the nflverse season roster files,
   the documented release the 2002 onward table itself came from, so a
   "played for the 49ers" cell no longer rejects Jerry Rice.

   WHY. The NFL grid validates through a free tier AI that runs out of
   quota; the NBA, MLB and NHL grids validate against a table in memory.
   This generator builds the NFL table's worth of facts, one row per player,
   so a later phase can judge a guess the way the NBA grid does and an
   archive can publish a real answer key.

   IDENTITY. A person is keyed on gsis_id (the NFL's own player id) wherever
   any of their rows carries one. The season files before the 1990s mostly
   do not carry ids (1970 to 1973 have none at all) but every row carries a
   birth date, so a person without an id is keyed on name plus birth date,
   and a bridge built from every row that has both joins the two: Jerry
   Rice's 1985 row has the same gsis_id as his 2004 row, Walter Payton's
   thirteen rows share one name and one birth date. A name shared by more
   than one person is flagged dup so the page can disambiguate before it
   lets a guess through.

   COVERAGE, STATED ON THE FILE. Rosters 1970 to 2025; stats 1999 to 2024
   (the weekly stats table starts in 1999), so a 1,000 yard season before
   1999 is not in the data and the file says so; colleges and draft data
   thin out before the 1990s and stay null rather than guessed.

   THE RULES, EACH ONE A DERIVATION FROM A COLUMN, NEVER A GUESS:
     teams     roster rows whose status is ACT, RES or INA (on the roster:
               active, reserve or inactive), plus PUP in the old files where
               the reserve lists are spelled out. CUT, DEV (practice squad),
               traded, retired and suspended rows do not make a team a
               player's team. Historical codes are mapped to the franchise's
               current code by season through scripts/lib/nflFranchiseCodes.mjs
               (STL 1980 is the Cardinals, STL 1999 is the Rams); the 39
               codes of the modern table are merged through nfl_team_codes.
     seasons   first and last roster season under the same rule.
     pos       the distinct raw position codes on those rows (QB, WR, OLB;
               the old files use coarse codes like DB, DL, OL and SPEC).
               Raw on purpose: mapping a label like "Defensive Back" onto
               codes is the page's rule and lives beside the page.
     college   the roster's college, the most frequent non empty value.
     draft     when a roster row carries a positive draft_number and a
               draft_club, that (nflverse fills both from the same record);
               otherwise an nfl_draft_picks row whose name matches and whose
               year is the entry year; otherwise, when the entry year is
               unknown, the one pick row of that name in the three drafts up
               to the first season; otherwise, if the entry year is 1990 or
               later and no pick row matches the name within a year of it,
               undrafted; otherwise null (unknown is unknown, not undrafted).
     stats     regular season weekly rows summed per season by gsis_id:
               the number of seasons with 1,000 or more rushing yards,
               1,000 or more receiving yards, 4,000 or more passing yards.
     sbWins    from 2002: roster rows whose game_type is SB (the snapshot
               taken at the Super Bowl) on the team super_bowls names as the
               winner of the game played in season plus one. Before 2002
               the files carry no game type, so a title is a counted roster
               row on the winning franchise that season.

   Output: scripts/data/nflGridPlayers.json (committed; a later phase loads
   it where the page can read it). scripts/simNflGridData.mjs holds the file
   to these rules against the live tables, the cached season files and a
   recorded second source.

   Run: node scripts/genNflGridData.mjs
        node scripts/genNflGridData.mjs --check   (rebuild in memory, compare, write nothing)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSeasonRoster } from './lib/nflverseRosters.mjs';
import { currentCodeFor, WINNER_NAME_CODES } from './lib/nflFranchiseCodes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts', 'data', 'nflGridPlayers.json');
export const ROSTER_STATUSES = ['ACT', 'RES', 'INA'];
export const OLD_ROSTER_STATUSES = ['ACT', 'RES', 'INA', 'PUP'];
export const OLD_SEASONS = { from: 1970, to: 2001 };
export const DRAFT_TABLE_COMPLETE_FROM = 1990;

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEADERS = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function rest(pathAndQuery) {
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res;
    try { res = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEADERS }); }
    catch (err) { last = `unreachable (${String(err).slice(0, 80)})`; res = null; }
    if (res && res.ok) return res.json();
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  throw new Error(`SUPABASE ${last} for ${pathAndQuery.slice(0, 120)} after 3 attempts. NOTHING WAS CHECKED.`);
}

/** Every row of a table, paged by 1000 on a stable order column. */
export async function pullAll(table, select, order, extra = '', onPage = null) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest(`${table}?select=${encodeURIComponent(select)}&order=${order}.asc${extra}&offset=${from}&limit=1000`);
    rows.push(...page);
    if (onPage) onPage(rows.length);
    if (page.length < 1000) break;
  }
  return rows;
}

export const normalizeName = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const num = v => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };

/** Merge the 39 modern roster codes to each franchise's current code. */
export function canonicalCodes(codes) {
  const byFranchise = new Map();
  for (const c of codes) {
    if (!byFranchise.has(c.franchise)) byFranchise.set(c.franchise, []);
    byFranchise.get(c.franchise).push(c);
  }
  const canon = {};
  for (const [franchise, list] of byFranchise) {
    const current = list.find(c => c.team_name === franchise) ?? list[0];
    for (const c of list) canon[c.team_code] = current.team_code;
  }
  return canon;
}

/** The season files and the site table, reduced to one row shape. */
export function unifyRows({ rosters = [], oldRosters = [] }, canon) {
  const out = [];
  for (const r of rosters) {
    const season = num(r.season);
    if (season == null) continue;
    out.push({
      gsis: r.gsis_id || '', name: String(r.full_name ?? '').trim(), birth: String(r.birth_date ?? '').trim(),
      team: canon[r.team] ?? r.team, season, onRoster: ROSTER_STATUSES.includes(r.status), sbSnapshot: r.game_type === 'SB',
      old: false, position: r.position, college: r.college, draftNumber: num(r.draft_number), draftClub: r.draft_club, entryYear: num(r.entry_year),
    });
  }
  for (const r of oldRosters) {
    const season = num(r.season);
    if (season == null) continue;
    out.push({
      gsis: r.gsis_id || '', name: String(r.full_name ?? '').trim(), birth: String(r.birth_date ?? '').trim(),
      team: currentCodeFor(r.team, season), season, onRoster: OLD_ROSTER_STATUSES.includes(r.status), sbSnapshot: false,
      old: true, position: r.position, college: r.college, draftNumber: null, draftClub: null, entryYear: num(r.entry_year),
    });
  }
  return out;
}

export function buildKey({ rosters = [], oldRosters = [], stats = [], picks = [], codes, superBowls }) {
  const canon = canonicalCodes(codes);
  const franchiseByName = new Map(Object.entries(WINNER_NAME_CODES));
  for (const c of codes) { franchiseByName.set(c.franchise, canon[c.team_code]); franchiseByName.set(c.team_name, canon[c.team_code]); }

  /* Super Bowl winners by SEASON: super_bowls.year is the calendar year the
     game was played, the season is the year before. */
  const winnerBySeason = new Map();
  for (const sb of superBowls) {
    const code = franchiseByName.get(sb.winner);
    if (code && sb.year) winnerBySeason.set(Number(sb.year) - 1, code);
  }

  /* Draft picks indexed by normalised name. */
  const picksByName = new Map();
  for (const p of picks) {
    const k = normalizeName(p.player_name);
    if (!picksByName.has(k)) picksByName.set(k, []);
    picksByName.get(k).push({ year: num(p.year), round: num(p.round), pick: num(p.pick), team: p.team, college: p.college });
  }

  /* Stat seasons by gsis_id, regular season only, summed per season. */
  const perSeason = new Map();
  for (const r of stats) {
    if (r.season_type !== 'REG' || !r.player_id) continue;
    const k = `${r.player_id}|${r.season}`;
    const acc = perSeason.get(k) ?? { id: r.player_id, pass: 0, rush: 0, rec: 0 };
    acc.pass += num(r.passing_yards) ?? 0;
    acc.rush += num(r.rushing_yards) ?? 0;
    acc.rec += num(r.receiving_yards) ?? 0;
    perSeason.set(k, acc);
  }
  const statSeasons = new Map();
  for (const acc of perSeason.values()) {
    const s = statSeasons.get(acc.id) ?? { pass4k: 0, rush1k: 0, rec1k: 0 };
    if (acc.pass >= 4000) s.pass4k += 1;
    if (acc.rush >= 1000) s.rush1k += 1;
    if (acc.rec >= 1000) s.rec1k += 1;
    statSeasons.set(acc.id, s);
  }

  /* Identity: gsis_id where any row of the person has one, joined to the
     id-less rows through name plus birth date. */
  const rows = unifyRows({ rosters, oldRosters }, canon);
  const nb = r => `${normalizeName(r.name)}|${r.birth}`;
  const bridge = new Map();
  for (const r of rows) if (r.gsis && r.name && r.birth && !bridge.has(nb(r))) bridge.set(nb(r), r.gsis);
  const pidOf = r => r.gsis || (r.name && r.birth ? (bridge.get(nb(r)) ?? `nb:${nb(r)}`) : '');

  const byId = new Map();
  for (const r of rows) {
    const id = pidOf(r);
    if (!id) continue;
    const e = byId.get(id) ?? {
      id, names: new Map(), teams: new Set(), first: null, last: null, pos: new Set(), colleges: new Map(),
      draftNumber: null, draftClub: null, entryYear: null, titleSeasons: new Set(), anyRoster: false, hasStatId: !!r.gsis,
    };
    if (r.name) e.names.set(r.name, (e.names.get(r.name) ?? 0) + 1);
    if (r.onRoster) {
      e.anyRoster = true;
      if (r.team) e.teams.add(r.team);
      e.first = e.first == null ? r.season : Math.min(e.first, r.season);
      e.last = e.last == null ? r.season : Math.max(e.last, r.season);
      if (r.position) e.pos.add(String(r.position).trim().toUpperCase());
      const college = String(r.college ?? '').trim();
      if (college) e.colleges.set(college, (e.colleges.get(college) ?? 0) + 1);
      /* One title per season at most: the old files can carry two counted
         rows for one person in a season (a reserve move mid year). */
      const winner = winnerBySeason.get(r.season);
      if (winner && winner === r.team && (r.old ? true : r.sbSnapshot)) e.titleSeasons.add(r.season);
    }
    /* A draft number of zero is a placeholder in the roster feed (Chris
       Johnson the running back carried 0.0 beside a real draft club), so
       only a positive pick counts as the roster knowing the draft. */
    if (r.draftNumber != null && r.draftNumber > 0 && r.draftClub) { e.draftNumber = r.draftNumber; e.draftClub = String(r.draftClub).trim().toUpperCase(); }
    if (r.entryYear != null && r.entryYear >= 1936) e.entryYear = e.entryYear == null ? r.entryYear : Math.min(e.entryYear, r.entryYear);
    byId.set(id, e);
  }

  const players = [];
  for (const e of byId.values()) {
    if (!e.anyRoster || e.teams.size === 0) continue;
    const name = [...e.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const college = [...e.colleges.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    let draft = null;
    const candidates = picksByName.get(normalizeName(name)) ?? [];
    if (e.draftNumber != null && e.draftClub) {
      /* The roster knows the pick. The pick table supplies the round and the
         year when a row of the same name carries the same overall pick (a
         name plus pick coincidence across years is not a real risk); a
         roster name the pick table spells differently (Sauce Gardner) keeps
         the pick with the round unknown rather than a guessed one. */
      const row = candidates.find(p => p.pick === e.draftNumber && (e.entryYear == null || p.year === e.entryYear))
        ?? candidates.find(p => p.pick === e.draftNumber);
      draft = { year: row?.year ?? e.entryYear ?? null, round: row?.round ?? null, pick: e.draftNumber };
    } else if (e.entryYear != null) {
      const exact = candidates.filter(p => p.year === e.entryYear);
      if (exact.length === 1) draft = { year: exact[0].year, round: exact[0].round, pick: exact[0].pick };
      else if (exact.length === 0 && e.entryYear >= DRAFT_TABLE_COMPLETE_FROM && !candidates.some(p => Math.abs(p.year - e.entryYear) <= 1)) draft = 'undrafted';
    } else if (e.first != null) {
      /* No entry year (the old files rarely carry one): the one pick row of
         this name in the three drafts up to the first season, or nothing. */
      const window = candidates.filter(p => p.year != null && p.year <= e.first && p.year >= e.first - 2);
      if (window.length === 1) draft = { year: window[0].year, round: window[0].round, pick: window[0].pick };
    }

    const s = (e.hasStatId ? statSeasons.get(e.id) : null) ?? { pass4k: 0, rush1k: 0, rec1k: 0 };
    players.push({
      id: e.id, name, teams: [...e.teams].sort(), seasons: [e.first, e.last], pos: [...e.pos].sort(),
      college, draft, pass4k: s.pass4k, rush1k: s.rush1k, rec1k: s.rec1k, sbWins: e.titleSeasons.size, dup: false,
    });
  }

  const seen = new Map();
  for (const p of players) { const k = normalizeName(p.name); seen.set(k, (seen.get(k) ?? 0) + 1); }
  for (const p of players) if ((seen.get(normalizeName(p.name)) ?? 0) > 1) p.dup = true;
  players.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));
  return players;
}

export async function pullOldRosters(log = () => {}) {
  const oldRosters = [];
  const files = [];
  for (let season = OLD_SEASONS.from; season <= OLD_SEASONS.to; season += 1) {
    const { rows, bytes } = await fetchSeasonRoster(season, { log });
    files.push({ season, rows: rows.length, bytes });
    oldRosters.push(...rows);
  }
  log(`old seasons ${OLD_SEASONS.from} to ${OLD_SEASONS.to}: ${oldRosters.length} rows`);
  return { oldRosters, files };
}

export async function pullSources(log = () => {}) {
  const codes = await rest('nfl_team_codes?select=team_code,team_name,franchise&limit=100');
  const superBowls = await rest('super_bowls?select=sb_number,year,winner&order=year.asc&limit=100');
  log(`codes ${codes.length}, super bowls ${superBowls.length}`);
  const rosters = await pullAll('nflfastr_rosters', 'gsis_id,esb_id,full_name,birth_date,team,season,status,game_type,position,college,draft_number,draft_club,entry_year', 'id', '', n => { if (n % 10000 === 0) log(`rosters ${n}`); });
  log(`rosters ${rosters.length}`);
  const { oldRosters, files } = await pullOldRosters(log);
  const picks = await pullAll('nfl_draft_picks', 'year,round,pick,player_name,team,college', 'id');
  log(`draft picks ${picks.length}`);
  const stats = await pullAll('nflfastr_player_stats', 'player_id,season,season_type,passing_yards,rushing_yards,receiving_yards', 'id', '&season_type=eq.REG', n => { if (n % 20000 === 0) log(`stats ${n}`); });
  log(`stat rows ${stats.length}`);
  return { rosters, oldRosters, oldFiles: files, stats, picks, codes, superBowls };
}

export function renderFile(players, sources) {
  return JSON.stringify({
    generatedOn: new Date().toISOString().slice(0, 10),
    round: 404,
    coverage: {
      rosters: '1970 to 2025 (nflverse season roster files 1970 to 2001, the site roster table 2002 to 2025)',
      stats: '1999 to 2024 regular season weekly rows',
      draft: 'nfl_draft_picks 1936 to 2025, treated as complete from 1990',
    },
    rules: {
      teams: `roster rows with status in ${ROSTER_STATUSES.join(', ')} (${OLD_ROSTER_STATUSES.join(', ')} in the 1970 to 2001 files), historical codes mapped to the franchise's current code by season, modern codes merged through nfl_team_codes`,
      identity: 'gsis_id where any row carries one; otherwise name plus birth date, bridged to a gsis_id when a row of the same name and birth date has one',
      pos: 'distinct raw roster position codes on those rows',
      draft: 'roster draft_number and draft_club when present; else the nfl_draft_picks row matching name and entry year; else, with no entry year, the one pick row of that name in the three drafts up to the first season; else undrafted when the entry year is 1990 or later and no pick within a year matches; else null',
      stats: 'regular season rows summed per season by gsis_id: seasons with 4,000 passing, 1,000 rushing, 1,000 receiving yards',
      sbWins: 'from 2002 roster rows with game_type SB on the winner super_bowls names for season plus one; before 2002 a counted roster row on the winning franchise that season',
    },
    sourceRows: sources,
    players,
  }, null, 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const check = process.argv.includes('--check');
  const src = await pullSources(m => console.log('   ' + m));
  const players = buildKey(src);
  const sources = { rosters: src.rosters.length, oldRosters: src.oldRosters.length, oldFiles: src.oldFiles, stats: src.stats.length, picks: src.picks.length, codes: src.codes.length, superBowls: src.superBowls.length };
  const dups = players.filter(p => p.dup).length;
  console.log(`${players.length} players, ${players.filter(p => !p.id.startsWith('nb:')).length} on a gsis_id, ${dups} carry a shared name, ${players.filter(p => p.draft === 'undrafted').length} undrafted, ${players.filter(p => p.sbWins > 0).length} with a Super Bowl win`);
  if (check) {
    const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const same = current && JSON.stringify(current.players) === JSON.stringify(players);
    console.log(same ? 'up to date: the committed file matches the derivation' : 'STALE: the committed file differs from the derivation');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, renderFile(players, sources));
  console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);
}

/* The NFL answer key, derived offline and keyed on identity.

   Round 403, phase 2 of docs/designs/NFL-GRID-ENGINE-DESIGN.md. The NFL grid
   validates through a free tier AI that runs out of quota; the NBA, MLB and
   NHL grids validate against a table in memory. This generator builds the
   NFL table's worth of facts, one row per player, from the documented tables
   the site already holds, so a later phase can judge a guess the way the
   NBA grid does and an archive can publish a real answer key.

   IDENTITY. Every row is keyed on gsis_id (the NFL's own player id, carried
   by nflfastr_rosters and nflfastr_player_stats), never on a name: 303 names
   in the roster table belong to two or more players. A name shared by more
   than one id is flagged dup so the page can disambiguate before it lets a
   guess through.

   COVERAGE, STATED ON THE FILE. The roster table starts in 2002 and the
   weekly stats end with the 2024 season, so every fact below is "within
   2002 to 2025 rosters" and "within 1999 to 2024 stats". Tom Brady's 2001
   title is not in the data and the file does not pretend it is; a consumer
   that needs pre 2002 careers must say so or keep another path for them.

   THE RULES, EACH ONE A DERIVATION FROM A COLUMN, NEVER A GUESS:
     teams     roster rows whose status is ACT, RES or INA (on the roster:
               active, reserve or inactive that week). CUT and DEV (practice
               squad) rows do not make a team a player's team. Codes are
               merged to the franchise's current code through nfl_team_codes
               (SD and LAC are both the Chargers).
     seasons   first and last roster season under the same rule.
     pos       the distinct raw position codes on those rows (QB, WR, OLB...).
               Raw on purpose: mapping a label like "Defensive Back" onto
               codes is the page's rule and lives beside the page.
     college   the roster's college, the most frequent non empty value.
     draft     when the roster carries draft_number and draft_club, that
               (nflverse fills both from the same record); otherwise an
               nfl_draft_picks row whose name matches and whose year is the
               entry year; otherwise, if the entry year is 1990 or later and
               no pick row matches the name within a year of it, undrafted;
               otherwise null (unknown is unknown, not undrafted).
     stats     regular season weekly rows summed per season by gsis_id:
               the number of seasons with 1,000 or more rushing yards,
               1,000 or more receiving yards, 4,000 or more passing yards.
     sbWins    roster rows whose game_type is SB (the roster snapshot taken at
               the Super Bowl) on the team that super_bowls names as the
               winner of the game played in season plus one.

   Output: scripts/data/nflGridPlayers.json (committed; a later phase loads
   it where the page can read it). scripts/simNflGridData.mjs holds the file
   to these rules against the live tables and to a recorded second source.

   Run: node scripts/genNflGridData.mjs
        node scripts/genNflGridData.mjs --check   (rebuild in memory, compare, write nothing)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts', 'data', 'nflGridPlayers.json');
export const ROSTER_STATUSES = ['ACT', 'RES', 'INA'];
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

/** Merge the 39 roster codes to each franchise's current code. */
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

export function buildKey({ rosters, stats, picks, codes, superBowls }) {
  const canon = canonicalCodes(codes);
  const franchiseByName = new Map(codes.map(c => [c.franchise, canon[c.team_code]]));
  for (const c of codes) franchiseByName.set(c.team_name, canon[c.team_code]);

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

  /* Roster rows by id. */
  const byId = new Map();
  for (const r of rosters) {
    const id = r.gsis_id;
    if (!id) continue;
    const season = num(r.season);
    if (season == null) continue;
    const onRoster = ROSTER_STATUSES.includes(r.status);
    const e = byId.get(id) ?? {
      id, names: new Map(), teams: new Set(), first: null, last: null, pos: new Set(), colleges: new Map(),
      draftNumber: null, draftClub: null, entryYear: null, sbWins: 0, anyRoster: false,
    };
    const name = String(r.full_name ?? '').trim();
    if (name) e.names.set(name, (e.names.get(name) ?? 0) + 1);
    if (onRoster) {
      e.anyRoster = true;
      const code = canon[r.team] ?? r.team;
      if (code) e.teams.add(code);
      e.first = e.first == null ? season : Math.min(e.first, season);
      e.last = e.last == null ? season : Math.max(e.last, season);
      if (r.position) e.pos.add(String(r.position).trim().toUpperCase());
      const college = String(r.college ?? '').trim();
      if (college) e.colleges.set(college, (e.colleges.get(college) ?? 0) + 1);
      if (r.game_type === 'SB' && winnerBySeason.get(season) === code) e.sbWins += 1;
    }
    /* A draft number of zero is a placeholder in the roster feed (Chris
       Johnson the running back carried 0.0 beside a real draft club), so
       only a positive pick counts as the roster knowing the draft. */
    const dn = num(r.draft_number);
    if (dn != null && dn > 0 && r.draft_club) { e.draftNumber = dn; e.draftClub = String(r.draft_club).trim().toUpperCase(); }
    const ey = num(r.entry_year);
    if (ey != null && ey >= 1936) e.entryYear = e.entryYear == null ? ey : Math.min(e.entryYear, ey);
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
    }

    const s = statSeasons.get(e.id) ?? { pass4k: 0, rush1k: 0, rec1k: 0 };
    players.push({
      id: e.id, name, teams: [...e.teams].sort(), seasons: [e.first, e.last], pos: [...e.pos].sort(),
      college, draft, pass4k: s.pass4k, rush1k: s.rush1k, rec1k: s.rec1k, sbWins: e.sbWins, dup: false,
    });
  }

  const seen = new Map();
  for (const p of players) { const k = normalizeName(p.name); seen.set(k, (seen.get(k) ?? 0) + 1); }
  for (const p of players) if ((seen.get(normalizeName(p.name)) ?? 0) > 1) p.dup = true;
  players.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));
  return players;
}

export async function pullSources(log = () => {}) {
  const codes = await rest('nfl_team_codes?select=team_code,team_name,franchise&limit=100');
  const superBowls = await rest('super_bowls?select=sb_number,year,winner&order=year.asc&limit=100');
  log(`codes ${codes.length}, super bowls ${superBowls.length}`);
  const rosters = await pullAll('nflfastr_rosters', 'gsis_id,full_name,team,season,status,game_type,position,college,draft_number,draft_club,entry_year', 'id', '', n => { if (n % 10000 === 0) log(`rosters ${n}`); });
  log(`rosters ${rosters.length}`);
  const picks = await pullAll('nfl_draft_picks', 'year,round,pick,player_name,team,college', 'id');
  log(`draft picks ${picks.length}`);
  const stats = await pullAll('nflfastr_player_stats', 'player_id,season,season_type,passing_yards,rushing_yards,receiving_yards', 'id', '&season_type=eq.REG', n => { if (n % 20000 === 0) log(`stats ${n}`); });
  log(`stat rows ${stats.length}`);
  return { rosters, stats, picks, codes, superBowls };
}

export function renderFile(players, sources) {
  return JSON.stringify({
    generatedOn: new Date().toISOString().slice(0, 10),
    round: 403,
    coverage: { rosters: '2002 to 2025 season roster snapshots', stats: '1999 to 2024 regular season weekly rows', draft: 'nfl_draft_picks 1936 to 2025, treated as complete from 1990' },
    rules: {
      teams: `roster rows with status in ${ROSTER_STATUSES.join(', ')}, codes merged to the franchise's current code`,
      pos: 'distinct raw roster position codes on those rows',
      draft: 'roster draft_number and draft_club when present; else the nfl_draft_picks row matching name and entry year; else undrafted when the entry year is 1990 or later and no pick within a year matches; else null',
      stats: 'regular season rows summed per season by gsis_id: seasons with 4,000 passing, 1,000 rushing, 1,000 receiving yards',
      sbWins: 'roster rows with game_type SB on the team super_bowls names as the winner of the game played in season plus one',
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
  const sources = { rosters: src.rosters.length, stats: src.stats.length, picks: src.picks.length, codes: src.codes.length, superBowls: src.superBowls.length };
  const dups = players.filter(p => p.dup).length;
  console.log(`${players.length} players, ${dups} carry a shared name, ${players.filter(p => p.draft === 'undrafted').length} undrafted, ${players.filter(p => p.sbWins > 0).length} with a Super Bowl win`);
  if (check) {
    const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const same = current && JSON.stringify(current.players) === JSON.stringify(players);
    console.log(same ? 'up to date: the committed file matches the derivation' : 'STALE: the committed file differs from the derivation');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, renderFile(players, sources));
  console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);
}

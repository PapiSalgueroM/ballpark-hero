/**
 * Round 709: audit every club season in career_seasons against two documented
 * sources, READ ONLY.
 *
 * WHY. career_players and career_seasons are the graph under Transfer Path (two
 * players link when they were at the same club in the same season), Career
 * Ladder's rows and the Soccer Grid import. Only the 27 researched 2025-2026
 * rows were ever pinned to two sources (simCareerSeasonTruth); the roughly
 * 3,500 seasons before them were typed by hand and never audited. Round 531
 * found an Alisson with two Roma seasons he never played, so every Transfer
 * Path link rests on memberships nobody had checked.
 *
 * THE TWO SOURCES, both read at scale, neither crawled:
 *   A. Wikidata (CC0), property P54 "member of sports team" with its start and
 *      end qualifiers (P580, P582) and the loan qualifier (P1642), read through
 *      the public SPARQL endpoint in batches of 50 items. It is a structured
 *      dataset, not the encyclopedia, but much of it was imported from the
 *      encyclopedia, so an encyclopedia page never counts as a second source
 *      for a fact whose first source is Wikidata.
 *   B. public.player_market_values, this project's Transfermarkt style yearly
 *      snapshot (2004 to 2026): one club per player per year, year Y being the
 *      season that ends in Y. Its person_key is null on every row, so one name
 *      is many men (there are seven different Alissons in it); every row used
 *      here is tied to the career player by birth year, from Wikidata, within
 *      one year. Its match and goal columns are not trusted for anything.
 * Both snapshots are committed in scripts/data/careerSeasonAudit/ with the
 * date they were read, so a rerun is reproducible and nothing hammers either
 * host. Refresh them on purpose with --pull-sources.
 *
 * WHAT IT REPORTS, per career row and per source membership:
 *   verified       Wikidata core membership AND market values agree
 *   wd-only        Wikidata core, market values silent (before 2004 or not listed)
 *   edge           Wikidata only touches the season at a join or leave boundary
 *   conflict       Wikidata core but market values name another club that year
 *   mv-only        market values agree, Wikidata has nothing
 *   reserve-only   Wikidata has only the club's reserve or youth side
 *   unsupported    neither source puts him there: a season he may never have played
 *   missing        a source membership with no career row: a season the table lacks
 *   spelling       one club written two ways, and whether that breaks a real link
 *   convention     rows whose appearances exceed any league season, so they are
 *                  all competition figures (the only convention the numbers can prove)
 * Seasons from 2025-2026 on are out of scope: that season is fenced by the
 * Round 531 quarantine and simCareerSeasonTruth, and 2026-2027 is under way.
 *
 * ORDER. Players are ranked by how many of the 885 puzzles depend on them: an
 * endpoint of the puzzle, or a man on at least one of its shortest chains on
 * the live graph. The report walks them in that order.
 *
 * It never writes to the database. The corrections it leads to live in a
 * migration written by hand from its output plus a third source where the two
 * disagree (supabase/migrations/20260930190000_round_709_career_season_audit.sql).
 *
 * Run:
 *   node scripts/auditCareerSeasons.mjs                 live read, full report
 *   node scripts/auditCareerSeasons.mjs --json out.json  also write every finding
 *   node scripts/auditCareerSeasons.mjs --player "Andrea Pirlo"
 *   node scripts/auditCareerSeasons.mjs --snapshot live.json   use a saved read
 *   node scripts/auditCareerSeasons.mjs --pull-sources   refresh both snapshots
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { supabaseFromClientTs } from './bakeCareerPlayers.mjs';
import { buildGraph, distances } from './lib/transferPathHints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'scripts/data/careerSeasonAudit');
export const WD_FILE = path.join(DATA, 'wikidataP54.json');
export const MV_FILE = path.join(DATA, 'marketValues.json');
export const CLUB_FILE = path.join(DATA, 'clubMap.json');
const TODAY = '2026-09-30';
const LAST_SEASON_IN_SCOPE = 2024; /* 2024-2025 is the last audited split season */
const USER_AGENT = 'DoUKnowBallAudit/1.0 (douknowball1@gmail.com) round709';

/* ------------------------------------------------------------------ */
/* Dates and seasons                                                  */
/* ------------------------------------------------------------------ */
const DAY = 86400000;
const dayOf = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const dayOfIso = iso => { const [y, m, d] = iso.split('-').map(Number); return dayOf(y, m, d); };
const TODAY_DAY = dayOfIso(TODAY);
export function seasonInterval(season) {
  const split = /^(\d{4})-(\d{4})$/.exec(season);
  if (split) return { start: dayOf(Number(split[1]), 7, 1), end: dayOf(Number(split[2]), 6, 30), style: 'split', year: Number(split[1]) };
  const cal = /^(\d{4})$/.exec(season);
  if (cal) return { start: dayOf(Number(cal[1]), 1, 1), end: dayOf(Number(cal[1]), 12, 31), style: 'calendar', year: Number(cal[1]) };
  return null;
}
const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start) + 1);
const overlapAny = (list, iv) => list.reduce((m, x) => Math.max(m, overlap(x, iv)), 0);
function subtract(list, cut) {
  const out = [];
  for (const iv of list) {
    if (cut.end < iv.start || cut.start > iv.end) { out.push(iv); continue; }
    if (cut.start > iv.start) out.push({ start: iv.start, end: cut.start - 1 });
    if (cut.end < iv.end) out.push({ start: cut.end + 1, end: iv.end });
  }
  return out;
}
/** market value year Y is the season that ends in Y */
const mvInterval = year => ({ start: dayOf(year - 1, 7, 1), end: dayOf(year, 6, 30) });

/* ------------------------------------------------------------------ */
/* Names                                                              */
/* ------------------------------------------------------------------ */
export const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l').trim();
/* career name -> the spelling the market value table uses, where it differs */
const MV_ALIASES = {
  'alisson becker': 'alisson',
  'cristian pulisic': 'christian pulisic',
  'dani carvajal': 'daniel carvajal',
  'son heung-min': 'heung-min son',
  'xavi hernandez': 'xavi',
  'ronaldo nazario': 'ronaldo',
};
/* Names Wikidata carries for many footballers, or under another label: the
   item is picked by the famous player's birth date, written beside it. */
const WD_OVERRIDES = {
  'David Silva': 'Q161069', /* 1986-01-08 */ Adriano: 'Q170452', /* 1982-02-17 */ Cafu: 'Q178683', /* 1970-06-07 */
  'Diego Costa': 'Q459707', /* 1988-10-07 */ 'Bruno Fernandes': 'Q4979316', /* 1994-09-08 */ Fernandinho: 'Q459356', /* 1985-05-04 */
  Ederson: 'Q17074511', /* 1993-08-17 */ 'Frank Lampard': 'Q41533', /* 1978-06-20 */ 'João Félix': 'Q27049064', /* 1999-11-10 */
  'Enzo Fernández': 'Q96105248', /* 2001-01-17 */ Marquinhos: 'Q39230', /* 1994-05-14 */ Marcelo: 'Q38136', /* 1988-05-12 */
  'Luis Díaz': 'Q28531111', /* 1997-01-13 */ 'Mohamed Salah': 'Q1354960', /* 1992-06-15 */ 'Luis Suárez': 'Q26517', /* 1987-01-24 */
  'Patrick Vieira': 'Q46347', /* 1976-06-23 */ 'Nemanja Vidić': 'Q163564', /* 1981-10-21 */ 'Kaká': 'Q203258', /* 1982-04-22 */
  Koke: 'Q276091', /* 1992-01-08 */ 'Kylian Mbappé': 'Q21621995', /* 1998-12-20 */ 'Romário': 'Q178649', /* 1966-01-29 */
  'Roberto Carlos': 'Q429039', /* 1973-04-10 */ Rodri: 'Q20994118', /* 1996-06-22 */ Robinho: 'Q58441', /* 1984-01-25 */
  Pedro: 'Q179773', /* 1987-07-28 */ 'Thiago Silva': 'Q210453', /* 1984-09-22 */ Pepe: 'Q485697', /* 1983-02-26 */
  Vitinha: 'Q66818509', /* 2000-02-13 */ 'Andrew Robertson': 'Q15915040', 'Angel Di María': 'Q251683', 'Arda Güler': 'Q108159340',
  'Claude Makélélé': 'Q184362', 'Cristian Pulisic': 'Q22279773', 'David Beckham': 'Q10520', 'Dusan Vlahović': 'Q23762815',
  'Estêvão': 'Q115332579', 'Jadon Sancho': 'Q30148558', 'Sergio Ramos': 'Q483309',
};

/* ------------------------------------------------------------------ */
/* Pull the two sources (only with --pull-sources)                    */
/* ------------------------------------------------------------------ */
function sparql(query, tmpDir) {
  const tmp = path.join(tmpDir, `audit709-${process.pid}.rq`);
  fs.writeFileSync(tmp, query);
  const body = execFileSync('curl', ['-s', '-m', '120', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', `query@${tmp}`,
    '-H', 'Accept: application/sparql-results+json', '-H', `User-Agent: ${USER_AGENT}`], { maxBuffer: 1 << 28 }).toString();
  fs.rmSync(tmp, { force: true });
  return JSON.parse(body).results.bindings;
}
const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const qid = uri => String(uri).split('/').pop();

async function pullSources(players) {
  const tmpDir = process.env.TEMP || process.env.TMP || DATA;
  const names = players.map(p => p.name);
  /* 1. candidates by English label or alias, occupation association football player */
  const cands = [];
  for (let i = 0; i < names.length; i += 60) {
    const chunk = names.slice(i, i + 60);
    const b = sparql(`SELECT ?name ?item WHERE { VALUES ?name { ${chunk.map(n => `"${esc(n)}"@en`).join(' ')} }
      { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name } ?item p:P106/ps:P106 wd:Q937857. }`, tmpDir);
    for (const x of b) cands.push({ name: x.name.value, item: qid(x.item.value) });
  }
  /* 2. names still open: the English encyclopedia article of that exact title */
  const picks = {};
  const open = [];
  for (const n of names) {
    if (WD_OVERRIDES[n]) { picks[n] = WD_OVERRIDES[n]; continue; }
    const c = [...new Set(cands.filter(x => x.name === n).map(x => x.item))];
    if (c.length === 1) picks[n] = c[0]; else open.push(n);
  }
  if (open.length) {
    const b = sparql(`SELECT ?title ?item WHERE { VALUES ?title { ${open.map(n => `"${esc(n)}"@en`).join(' ')} }
      ?a schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title. }`, tmpDir);
    for (const x of b) picks[x.title.value] = qid(x.item.value);
  }
  const items = [...new Set(Object.values(picks))];
  /* 3. birth dates and every P54 statement, with precision and loans */
  const birth = {};
  const statements = [];
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50).map(x => 'wd:' + x).join(' ');
    for (const x of sparql(`SELECT ?item ?b WHERE { VALUES ?item { ${chunk} } ?item wdt:P569 ?b }`, tmpDir)) birth[qid(x.item.value)] = x.b.value.slice(0, 10);
    const b = sparql(`SELECT ?item ?team ?teamLabel ?start ?sp ?end ?ep ?loan ?nt WHERE {
      VALUES ?item { ${chunk} } ?item p:P54 ?st. ?st ps:P54 ?team.
      OPTIONAL { ?st pqv:P580 ?sv. ?sv wikibase:timeValue ?start; wikibase:timePrecision ?sp }
      OPTIONAL { ?st pqv:P582 ?ev. ?ev wikibase:timeValue ?end; wikibase:timePrecision ?ep }
      OPTIONAL { ?st pq:P1642 ?loan }
      OPTIONAL { ?team wdt:P31 ?nt0. FILTER(?nt0 IN (wd:Q6979593, wd:Q1194951, wd:Q23847779)) BIND(1 AS ?nt) }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, tmpDir);
    const seen = new Set();
    for (const x of b) {
      const row = [qid(x.item.value), qid(x.team.value), x.teamLabel?.value ?? '', x.start?.value?.slice(0, 10) ?? null, x.sp ? Number(x.sp.value) : null,
        x.end?.value?.slice(0, 10) ?? null, x.ep ? Number(x.ep.value) : null, x.loan ? 1 : 0, x.nt ? 1 : 0];
      const k = JSON.stringify(row);
      if (!seen.has(k)) { seen.add(k); statements.push(row); }
    }
  }
  const wd = {
    source: 'Wikidata, property P54 (member of sports team) with qualifiers P580, P582 and P1642, public SPARQL endpoint https://query.wikidata.org/sparql',
    license: 'CC0 1.0',
    retrieved: new Date().toISOString().slice(0, 10),
    columns: ['item', 'team', 'teamLabel', 'start', 'startPrecision', 'end', 'endPrecision', 'loan', 'nationalTeam'],
    picks, birth, statements,
  };
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(WD_FILE, JSON.stringify(wd, null, 0).replace(/\],\[/g, '],\n['));
  /* 4. market value rows for every folded name, then tied to the man by birth year */
  const supabase = supabaseFromClientTs();
  const wanted = [...new Set(players.map(p => MV_ALIASES[fold(p.name)] ?? fold(p.name)))];
  const rows = [];
  for (let i = 0; i < wanted.length; i += 40) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('player_market_values').select('id, name_folded, age, club, year')
        .in('name_folded', wanted.slice(i, i + 40)).order('id').range(from, from + 999);
      if (error) throw new Error(`player_market_values read failed: ${error.message}`);
      rows.push(...data);
      if (data.length < 1000) break;
    }
  }
  const mv = {
    source: 'public.player_market_values (project table, Transfermarkt style yearly snapshot, year Y = the season ending in Y); only id, name_folded, age, club and year are kept',
    retrieved: new Date().toISOString().slice(0, 10),
    aliases: MV_ALIASES,
    columns: ['id', 'nameFolded', 'age', 'club', 'year'],
    rows: rows.sort((a, b) => a.id - b.id).map(r => [r.id, r.name_folded, r.age, r.club, r.year]),
  };
  fs.writeFileSync(MV_FILE, JSON.stringify(mv, null, 0).replace(/\],\[/g, '],\n['));
  console.log(`wrote ${path.relative(ROOT, WD_FILE)}: ${Object.keys(picks).length} of ${names.length} players resolved, ${statements.length} statements`);
  console.log(`wrote ${path.relative(ROOT, MV_FILE)}: ${rows.length} rows`);
  const unresolved = names.filter(n => !picks[n]);
  if (unresolved.length) console.log(`unresolved on Wikidata: ${unresolved.join(', ')}`);
}

/* ------------------------------------------------------------------ */
/* Live read, exactly as the bake reads, plus the puzzle pairs         */
/* ------------------------------------------------------------------ */
async function pageAll(page) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}
export async function readLive() {
  const supabase = supabaseFromClientTs();
  const players = await pageAll((f, t) => supabase.from('career_players').select('id, player_name, nationality, position').order('player_name').range(f, t));
  const seasons = await pageAll((f, t) => supabase.from('career_seasons').select('id, player_id, season, club, goals, assists, appearances, market_value, sort_order').order('player_id').order('sort_order').range(f, t));
  const puzzles = await pageAll((f, t) => supabase.from('transfer_path_puzzles').select('puzzle_id, player_a, player_b').order('puzzle_id').range(f, t));
  return { pulledAt: new Date().toISOString(), players, seasons, puzzles };
}
export function playersFromSnapshot(snap) {
  const byId = new Map(snap.players.map(p => [p.id, { id: p.id, name: p.player_name, nationality: p.nationality, position: p.position, career: [] }]));
  for (const s of snap.seasons) byId.get(s.player_id)?.career.push({ id: s.id, season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, marketValue: s.market_value, sortOrder: s.sort_order });
  return [...byId.values()];
}

/* ------------------------------------------------------------------ */
/* Puzzle weight                                                      */
/* ------------------------------------------------------------------ */
export function rankByPuzzleWeight(players, puzzles) {
  const graph = buildGraph(players);
  const weight = new Map(players.map(p => [p.name, { endpoint: 0, onPath: 0 }]));
  const cache = new Map();
  const dist = n => cache.get(n) ?? cache.set(n, distances(graph, n)).get(n);
  for (const z of puzzles) {
    const a = z.player_a, b = z.player_b;
    if (weight.has(a)) weight.get(a).endpoint += 1;
    if (weight.has(b)) weight.get(b).endpoint += 1;
    const da = dist(a), db = dist(b), d = da.get(b);
    if (d === undefined) continue;
    for (const [m, x] of da) if (m !== a && m !== b && db.has(m) && x + db.get(m) === d) weight.get(m).onPath += 1;
  }
  return players.map(p => ({ name: p.name, ...weight.get(p.name), weight: weight.get(p.name).endpoint + weight.get(p.name).onPath }))
    .sort((x, y) => y.weight - x.weight || x.name.localeCompare(y.name));
}

/* ------------------------------------------------------------------ */
/* Source memberships                                                 */
/* ------------------------------------------------------------------ */
const NATIONAL = /national|olympic|regional football team|autonomous football team|\bXI\b/i;
const RESERVE = /\b(II|B|C|Castilla|Atl[eè]tic|Mestalla|Juvenil|Youth|Academy|Under-\d+|U-?\d+|Primavera|Reserves?|Next Gen|Junior Team)\b|^Jong /i;

/** the Wikidata memberships of one item, as intervals, loans cut out of the parent spell */
export function wikidataMemberships(wd, item, clubOfTeam) {
  const rows = wd.statements.filter(s => s[0] === item).map(s => ({ team: s[1], label: s[2], start: s[3], sp: s[4], end: s[5], ep: s[6], loan: !!s[7], national: !!s[8] }));
  const out = [];
  for (const r of rows) {
    if (r.national || NATIONAL.test(r.label)) continue;
    const mapped = clubOfTeam.get(r.team);
    const kind = mapped?.kind ?? (RESERVE.test(r.label) ? 'reserve' : 'first');
    let possStart, coreStart, possEnd, coreEnd;
    if (!r.start || r.sp === null || r.sp < 9) { possStart = -Infinity; coreStart = null; }
    else if (r.sp >= 11) { possStart = coreStart = dayOfIso(r.start); }
    else if (r.sp === 10) { possStart = dayOfIso(r.start); coreStart = possStart + 14; }
    else { const y = Number(r.start.slice(0, 4)); possStart = dayOf(y, 1, 1); coreStart = dayOf(y, 12, 31); }
    if (!r.end || r.ep === null || r.ep < 9) {
      /* open ended: it runs until the next first team spell elsewhere starts, or today */
      const s0 = r.start ? dayOfIso(r.start) : -Infinity;
      const next = rows.filter(o => o !== r && !o.national && !NATIONAL.test(o.label) && !o.loan && o.start && dayOfIso(o.start) > s0 && o.team !== r.team)
        .map(o => dayOfIso(o.start)).sort((a, b) => a - b)[0];
      possEnd = coreEnd = next !== undefined && !r.loan ? next : TODAY_DAY;
      if (!r.end && r.ep === null && next === undefined && !r.loan && r.start && Number(r.start.slice(0, 4)) < 2015) coreEnd = null; /* a stale open spell proves nothing */
    } else if (r.ep >= 11) { possEnd = coreEnd = dayOfIso(r.end); }
    else if (r.ep === 10) { possEnd = dayOfIso(r.end) + 30; coreEnd = dayOfIso(r.end) + 14; }
    else { const y = Number(r.end.slice(0, 4)); possEnd = dayOf(y, 12, 31); coreEnd = dayOf(y, 1, 1); }
    const core = coreStart !== null && coreEnd !== null && coreEnd > coreStart ? [{ start: coreStart, end: coreEnd }] : [];
    const poss = [{ start: possStart, end: possEnd }];
    out.push({ team: r.team, label: r.label, club: mapped?.club ?? null, kind, loan: r.loan, core, poss, raw: `${r.label} ${r.start ?? '?'}(${r.sp ?? '-'}) to ${r.end ?? 'open'}(${r.ep ?? '-'})${r.loan ? ' loan' : ''}` });
  }
  /* a loan season belongs to the loan club: cut every loan out of the other first team spells */
  const loans = out.filter(m => m.loan && m.kind === 'first');
  for (const m of out) {
    if (m.loan || m.kind !== 'first') continue;
    for (const l of loans) for (const c of l.core) { if (l.team === m.team) continue; m.core = subtract(m.core, c); m.poss = subtract(m.poss, c); }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The audit of one player                                            */
/* ------------------------------------------------------------------ */
/* the most league matches any audited league played in one season; more than
   this is only possible counting cups and continental games */
const LEAGUE_MAX = { England: 46, Spain: 42, Italy: 38, Germany: 34, France: 38, Netherlands: 34, Portugal: 34, Scotland: 44, Turkey: 38 };

export function auditPlayer(p, { wd, mvRows, clubMap, clubOfTeam, mvToClub }) {
  const item = wd.picks[p.name] ?? null;
  const birthYear = item && wd.birth[item] ? Number(wd.birth[item].slice(0, 4)) : null;
  const members = item ? wikidataMemberships(wd, item, clubOfTeam) : [];
  const mvName = MV_ALIASES[fold(p.name)] ?? fold(p.name);
  const mv = mvRows.filter(r => r[1] === mvName && (birthYear === null || Math.abs((r[4] - 1 - r[2]) - birthYear) <= 1))
    .map(r => ({ id: r[0], year: r[4], club: r[3], mapped: mvToClub.get(r[3]) ?? null }));
  const mvYears = mv.map(r => r.year);
  const mvSpan = mv.length ? { start: mvInterval(Math.min(...mvYears)).start, end: mvInterval(Math.max(...mvYears)).end } : null;
  const findings = [];
  const rows = [];
  for (const s of p.career) {
    const iv = seasonInterval(s.season);
    if (!iv) { findings.push({ kind: 'bad-season', season: s.season, club: s.club, note: 'season string the graph cannot read' }); continue; }
    if (iv.year >= LAST_SEASON_IN_SCOPE + 1 && iv.style === 'split') { rows.push({ ...s, verdict: 'out-of-scope' }); continue; }
    if (iv.style === 'calendar' && iv.year >= LAST_SEASON_IN_SCOPE + 2) { rows.push({ ...s, verdict: 'out-of-scope' }); continue; }
    const at = members.filter(m => m.club === s.club && m.kind === 'first');
    const coreDays = at.reduce((mx, m) => Math.max(mx, overlapAny(m.core, iv)), 0);
    const possDays = at.reduce((mx, m) => Math.max(mx, overlapAny(m.poss, iv)), 0);
    const reserveDays = members.filter(m => m.club === s.club && m.kind === 'reserve').reduce((mx, m) => Math.max(mx, overlapAny(m.poss, iv)), 0);
    const wdState = !item ? 'unresolved' : coreDays >= 30 ? 'core' : possDays >= 1 ? 'possible' : reserveDays >= 1 ? 'reserve' : 'none';
    const mvHere = mv.filter(r => overlap(mvInterval(r.year), iv) >= 30);
    let mvState;
    if (!mv.length || !mvSpan || overlap(mvSpan, iv) < 30) mvState = 'na';
    else if (mvHere.some(r => r.mapped === s.club || (r.mapped && clubMap[r.mapped]?.wikidata.some(q => clubMap[s.club]?.wikidata.includes(q))))) mvState = 'yes';
    else if (mvHere.length) mvState = 'other';
    else mvState = 'absent';
    const verdict =
      wdState === 'core' && mvState === 'yes' ? 'verified'
      : wdState === 'core' && mvState === 'other' ? 'conflict'
      : wdState === 'core' ? 'wd-only'
      : wdState === 'possible' ? (mvState === 'yes' ? 'edge-mv' : 'edge')
      : mvState === 'yes' ? 'mv-only'
      : wdState === 'reserve' ? 'reserve-only'
      : 'unsupported';
    const others = [...new Set([
      ...members.filter(m => m.kind === 'first' && overlapAny(m.core, iv) >= 60 && m.club !== s.club).map(m => m.club ?? m.label),
    ])];
    const row = { ...s, verdict, wd: wdState, mv: mvState, mvClubs: mvHere.map(r => r.club), wdElsewhere: others };
    rows.push(row);
    if (!['verified', 'wd-only', 'edge-mv', 'out-of-scope'].includes(verdict)) findings.push({ kind: verdict, season: s.season, club: s.club, wd: wdState, mv: mvState, mvClubs: row.mvClubs, wdElsewhere: others });
    const country = clubMap[s.club]?.country;
    if (country && LEAGUE_MAX[country] && s.appearances > LEAGUE_MAX[country]) row.convention = 'all competitions';
  }
  /* seasons a source has that the table does not */
  const seasonsOf = (iv, style) => {
    const out = [];
    if (!Number.isFinite(iv.start) || !Number.isFinite(iv.end)) return out;
    const y0 = new Date(iv.start * DAY).getUTCFullYear() - 1, y1 = new Date(iv.end * DAY).getUTCFullYear();
    for (let y = y0; y <= y1; y++) out.push(style === 'calendar' ? String(y) : `${y}-${y + 1}`);
    return out;
  };
  const styleAt = club => p.career.find(s => s.club === club && /^\d{4}$/.test(s.season)) ? 'calendar' : clubMap[club]?.calendar ? 'calendar' : 'split';
  const has = (club, iv) => p.career.some(s => (s.club === club || (clubMap[s.club]?.wikidata ?? []).some(q => (clubMap[club]?.wikidata ?? []).includes(q))) && overlap(seasonInterval(s.season) ?? { start: 0, end: -1 }, iv) >= 30);
  const missing = new Map();
  for (const m of members) {
    if (m.kind !== 'first') continue;
    const style = m.club ? styleAt(m.club) : 'split';
    for (const c of m.core) for (const season of seasonsOf(c, style)) {
      const iv = seasonInterval(season);
      if (iv.year > LAST_SEASON_IN_SCOPE || overlap(c, iv) < 90) continue;
      if (m.club && has(m.club, iv)) continue;
      const key = `${m.club ?? m.label}|${season}`;
      const mvHere = mv.filter(r => overlap(mvInterval(r.year), iv) >= 30);
      const mvAgrees = m.club ? mvHere.some(r => r.mapped === m.club) : false;
      if (!missing.has(key)) missing.set(key, { kind: 'missing', club: m.club ?? `(not in pool) ${m.label}`, season, wd: 'core', mv: mvAgrees ? 'yes' : mvHere.length ? 'other' : 'na', mvClubs: mvHere.map(r => r.club), loan: m.loan });
    }
  }
  for (const r of mv) {
    if (!r.mapped || r.year > LAST_SEASON_IN_SCOPE + 1) continue;
    const iv = mvInterval(r.year);
    if (has(r.mapped, iv)) continue;
    const season = styleAt(r.mapped) === 'calendar' ? String(r.year - 1) : `${r.year - 1}-${r.year}`;
    const key = `${r.mapped}|${season}`;
    if (missing.has(key)) continue;
    const wdHere = members.filter(m => m.club === r.mapped && m.kind === 'first');
    const wdState = wdHere.some(m => overlapAny(m.core, iv) >= 30) ? 'core' : wdHere.some(m => overlapAny(m.poss, iv) >= 1) ? 'possible' : 'none';
    missing.set(key, { kind: 'missing', club: r.mapped, season, wd: wdState, mv: 'yes', mvClubs: [r.club] });
  }
  for (const m of missing.values()) findings.push(m);
  return { name: p.name, item, birth: item ? wd.birth[item] ?? null : null, mvRows: mv.length, rows, findings, members };
}

/* ------------------------------------------------------------------ */
/* Spellings: one club, two strings                                   */
/* ------------------------------------------------------------------ */
export function spellingFindings(players, clubMap) {
  const byItem = new Map();
  for (const [club, m] of Object.entries(clubMap)) for (const q of m.wikidata) (byItem.get(q) ?? byItem.set(q, new Set()).get(q)).add(club);
  const out = [];
  for (const [q, clubs] of byItem) {
    if (clubs.size < 2) continue;
    const names = [...clubs];
    const used = names.map(c => ({ club: c, rows: players.flatMap(p => p.career.filter(s => s.club === c).map(s => ({ player: p.name, season: s.season }))) })).filter(u => u.rows.length);
    if (used.length < 2) continue;
    /* links the split breaks: two men at the club in one season under different strings */
    const broken = [];
    for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) {
      for (const a of used[i].rows) for (const b of used[j].rows) {
        const ia = seasonInterval(a.season), ib = seasonInterval(b.season);
        if (a.player === b.player || !ia || !ib) continue;
        const same = a.season === b.season || (ia.style !== ib.style && overlap(ia, ib) >= 30);
        if (same) broken.push(`${a.player} (${used[i].club}) and ${b.player} (${used[j].club}), ${a.season === b.season ? a.season : a.season + ' / ' + b.season}`);
      }
    }
    out.push({ kind: 'spelling', item: q, spellings: used.map(u => ({ club: u.club, rows: u.rows.length, players: [...new Set(u.rows.map(r => r.player))] })), brokenLinks: broken });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */
export function loadSources() {
  const wd = JSON.parse(fs.readFileSync(WD_FILE, 'utf8'));
  const mvFile = JSON.parse(fs.readFileSync(MV_FILE, 'utf8'));
  const clubMap = JSON.parse(fs.readFileSync(CLUB_FILE, 'utf8'));
  const clubOfTeam = new Map();
  for (const [club, m] of Object.entries(clubMap)) {
    for (const q of m.wikidata) if (!clubOfTeam.has(q)) clubOfTeam.set(q, { club, kind: 'first' });
    for (const q of m.reserve ?? []) if (!clubOfTeam.has(q)) clubOfTeam.set(q, { club, kind: 'reserve' });
  }
  const mvToClub = new Map();
  for (const [club, m] of Object.entries(clubMap)) for (const name of m.marketValue ?? []) if (!mvToClub.has(name)) mvToClub.set(name, club);
  return { wd, mvRows: mvFile.rows, clubMap, clubOfTeam, mvToClub, wdRetrieved: wd.retrieved, mvRetrieved: mvFile.retrieved };
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const opt = name => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const snapPath = opt('--snapshot');
  const snap = snapPath ? JSON.parse(fs.readFileSync(snapPath, 'utf8')) : await readLive();
  const players = playersFromSnapshot(snap);
  if (argv.includes('--pull-sources')) { await pullSources(players); process.exit(0); }
  const src = loadSources();
  const ranked = rankByPuzzleWeight(players, snap.puzzles);
  const top = Number(opt('--top') ?? 120);
  const only = opt('--player');
  const byName = new Map(players.map(p => [p.name, p]));
  const results = [];
  const counts = {};
  const rowCounts = {};
  ranked.forEach((r, i) => {
    const a = auditPlayer(byName.get(r.name), src);
    results.push({ rank: i + 1, weight: r.weight, endpoint: r.endpoint, onPath: r.onPath, ...a });
  });
  for (const a of results) {
    for (const row of a.rows) rowCounts[row.verdict] = (rowCounts[row.verdict] ?? 0) + 1;
    for (const f of a.findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  }
  const spelling = spellingFindings(players, src.clubMap);
  console.log(`Round 709 career season audit. Live read ${snap.pulledAt}; Wikidata snapshot ${src.wdRetrieved}; market value snapshot ${src.mvRetrieved}.`);
  console.log(`${players.length} players, ${players.reduce((n, p) => n + p.career.length, 0)} season rows, ${snap.puzzles.length} puzzles; ${results.filter(r => r.item).length} players resolved on Wikidata.`);
  console.log(`rows by verdict: ${JSON.stringify(rowCounts)}`);
  console.log(`findings by kind: ${JSON.stringify(counts)}`);
  console.log(`\nclub spellings (${spelling.length}):`);
  for (const s of spelling) console.log(`  ${s.spellings.map(x => `"${x.club}" ${x.rows} rows (${x.players.join(', ')})`).join(' vs ')}; ${s.brokenLinks.length} broken link(s)${s.brokenLinks.length ? ': ' + s.brokenLinks.slice(0, 6).join('; ') : ''}`);
  for (const a of results) {
    if (only && a.name !== only) continue;
    if (!only && a.rank > top && !argv.includes('--all')) continue;
    const shown = a.findings;
    console.log(`\n#${a.rank} ${a.name} (weight ${a.weight}; ${a.item ?? 'no Wikidata item'}${a.birth ? ', born ' + a.birth : ''}; ${a.mvRows} market value rows) ${a.rows.filter(r => r.verdict === 'verified').length}/${a.rows.length} rows two sourced`);
    for (const f of shown) console.log(`   ${f.kind.padEnd(12)} ${String(f.season).padEnd(10)} ${f.club}  [wd ${f.wd}, mv ${f.mv}${f.mvClubs?.length ? ': ' + [...new Set(f.mvClubs)].join('/') : ''}${f.wdElsewhere?.length ? '; wikidata has ' + f.wdElsewhere.join('/') : ''}${f.loan ? '; loan' : ''}]`);
    if (only) for (const m of a.members) console.log(`      wd: ${m.kind} ${m.club ?? '-'} <- ${m.raw}`);
  }
  const jsonOut = opt('--json');
  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ pulledAt: snap.pulledAt, wd: src.wdRetrieved, mv: src.mvRetrieved, rowCounts, counts, spelling, players: results.map(({ members, ...rest }) => rest) }, null, 1));
    console.log(`\nwrote ${jsonOut}`);
  }
}

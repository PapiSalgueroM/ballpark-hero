/**
 * Round 708 harness: no junk shaped row out of soccer_awards or
 * national_team_squads reaches a game.
 *
 * Both tables are raw wiki scrapes with shifted columns. Measured with read
 * only SQL on 2026-09-30:
 *   soccer_awards: the three World Cup awards are one 131 row page scrape
 *     copied under three names (393 rows): winner_name holds outlets
 *     ('ESPN Deportes', 'Associated Press'), counts ('1'), nations
 *     ('Colombia'), five men at once, and club_or_team holds scorelines
 *     ('2 -0'). The three awards the List Quiz reads had smaller junk: five
 *     'Not awarded' Golden Shoe years dealt as an answer, and six '(tie)'
 *     tagged winners dealt as second answers nobody could type.
 *   national_team_squads: every player row stores the birth date in club and
 *     a sort digit in position ('4 FW'), 60 rows are a statistics table
 *     ('Player representation by league system', names like '17.53%'), and
 *     the 2026 slice is provisional lists for 39 of 48 nations.
 * Two unapplied migrations repair both. This harness is GREEN ON MAIN BEFORE
 * THEY LAND: the readers skip every junk shaped row, which is what makes the
 * games safe today. It also READS THE MIGRATIONS' EFFECT: while the junk is in
 * the tables it prints a PENDING line with the count, and once a migration has
 * landed it checks the table against what the migration promised. A table
 * that is half repaired fails.
 *
 * Sections:
 *   1. the shape test refuses every junk shape the scrape produced (offline)
 *   2. the shape test keeps and cleans real winners, and passes every row the
 *      World Cup migration will write (offline)
 *   3. the reader: awardWinners() refuses any award not on the verified list,
 *      runs the shape test, reads only winner and club, and nothing else in
 *      src or the edge functions reads soccer_awards (source, comments out)
 *   4. the three soccer lists as the quiz deals them: no junk, no tag, no
 *      'Not awarded', and at least the declared answer count (live)
 *   5. the verified awards lose nothing but 'nobody won' rows to the shape
 *      test, so it is not eating real winners (live)
 *   6. the World Cup awards: the migration's rows match the two source
 *      record row for row, every record row has a fifa.com source that
 *      renders plus ESPN, BBC Sport or AP, and the live table is either still
 *      junk (PENDING, and on the DO NOT USE list) or exactly the record
 *   7. national_team_squads: every reader selects player_name and nothing
 *      else, the names a nation slot pulls are all name shaped, the
 *      migration refuses to run on a moved table, and the live table is
 *      either the scrape (PENDING) or exactly what the migration promised
 *
 * NEGATIVE CONTROLS (SOCCER_AWARDS_SHAPE_CONTROL). Each edits only an in
 * memory copy (line endings normalised first), refuses to run unless its
 * anchor occurs exactly once and the edit changed something, and must turn
 * exactly its predicted sections red. Under a control the harness exits 1
 * when exactly those sections are red (the break was caught) and 2 when not.
 *   outlet    the outlet test is deleted from awardRowProblem          1
 *   tie       cleanAwardWinner stops stripping '(tie)'                 2, 4
 *   allowlist awardWinners stops checking the verified list            3
 *   greedy    'suarez' becomes an outlet word, eating a real winner    5
 *   wcsql     the migration's Just Fontaine row drifts to 12 goals     6
 *   squadcol  Build Your XI reads club from national_team_squads      7
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simSoccerAwardsShape.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHAPE = 'src/lib/awardRowShape.ts';
const LQ = 'src/lib/listQuiz.ts';
const LINEUP = 'src/pages/LineupBuilder.tsx';
const TEAMS = 'src/data/lineupTeams.ts';
const VALIDATE = 'supabase/functions/validate-player/index.ts';
const WC_SQL = 'supabase/migrations/20260930120000_round_708_soccer_awards_world_cup.sql';
const SQUAD_SQL = 'supabase/migrations/20260930121000_round_708_national_team_squads_realign.sql';
const RECORD = 'scripts/data/soccerAwardsVerified2026-09.json';
const WC_AWARDS = ['World Cup Golden Boot', 'World Cup Golden Glove', 'World Cup Best Young Player'];

const CONTROL = process.env.SOCCER_AWARDS_SHAPE_CONTROL || '';
const EXPECT = { outlet: [1], tie: [2, 4], allowlist: [3], greedy: [5], wcsql: [6], squadcol: [7] };
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`SOCCER_AWARDS_SHAPE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = (msg) => { red.add(section); failures += 1; console.error('  FAIL: ' + msg); };
const head = (n, title) => { section = n; console.log(`\n--- ${n}. ${title} ---`); };
const skipped = new Set();

const rewrite = (text, from, to, what) => {
  const hits = text.split(from).length - 1;
  if (hits !== 1) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} occurs ${hits} times, not once. The control is stale and a run would prove nothing.`);
    process.exit(2);
  }
  const out = text.replace(from, to);
  if (out === text) {
    console.error(`CONTROL ${CONTROL} cannot run: rewriting ${what} changed nothing.`);
    process.exit(2);
  }
  return out;
};

/* LF always, so an anchor spanning a line break matches on a CRLF checkout. */
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/* Code without its comments, so a guard is satisfied by the code and never by
   the prose explaining it. Strings are kept whole. */
const codeOnly = (text) => {
  let out = '';
  for (let i = 0; i < text.length;) {
    const c = text[i];
    const n2 = text.slice(i, i + 2);
    if (n2 === '//') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (n2 === '/*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; }
      out += text.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
};
const sqlCode = (text) => text.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');

/* One SQL tuple: quoted strings with '' escapes, integers, null. */
function parseTuple(body) {
  const out = [];
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === ' ' || c === ',' || c === '\n' || c === '\t') { i++; continue; }
    if (c === "'") {
      let s = '';
      i++;
      for (;;) {
        if (i >= body.length) throw new Error('unterminated string in ' + body);
        if (body[i] === "'" && body[i + 1] === "'") { s += "'"; i += 2; continue; }
        if (body[i] === "'") { i++; break; }
        s += body[i++];
      }
      out.push(s);
      continue;
    }
    const m = /^(null|-?\d+)/i.exec(body.slice(i));
    if (!m) throw new Error('cannot read SQL value at: ' + body.slice(i, i + 20));
    out.push(m[1].toLowerCase() === 'null' ? null : Number(m[1]));
    i += m[1].length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The shipped modules, bundled into a private temp directory with any control
// edit applied in memory.
const over = {};
let shapeText = src(SHAPE);
let lqText = src(LQ);
let lineupText = src(LINEUP);
let wcSqlText = src(WC_SQL);

if (CONTROL === 'outlet') {
  shapeText = rewrite(shapeText,
    "  if (words.some(w => OUTLET_WORDS.has(w))) return 'winner_name is a paper, a broadcaster or a sponsor';\n",
    '', 'the outlet test');
}
if (CONTROL === 'tie') {
  shapeText = rewrite(shapeText, '(?:\\d+|tie|joint|shared)', '(?:\\d+|joint|shared)', 'the tag pattern');
}
if (CONTROL === 'allowlist') {
  lqText = rewrite(lqText,
    "  if (!VERIFIED_SOCCER_AWARDS.includes(awardName)) {\n    throw new Error(`soccer_awards: ${awardName} is not a verified award`);\n  }\n",
    '', 'the verified award check');
}
if (CONTROL === 'greedy') {
  shapeText = rewrite(shapeText, "'guardian', 'reuters',", "'guardian', 'reuters', 'suarez',", 'the outlet word list');
}
if (CONTROL === 'wcsql') {
  wcSqlText = rewrite(wcSqlText, "'Just Fontaine', 'France', '13 goals'", "'Just Fontaine', 'France', '12 goals'", "the Fontaine row");
}
if (CONTROL === 'squadcol') {
  lineupText = rewrite(lineupText, ".from('national_team_squads')\n        .select('player_name')",
    ".from('national_team_squads')\n        .select('player_name, club')", 'the Build Your XI squad select');
}
over[SHAPE] = shapeText;
over[LQ] = lqText;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simSoccerAwardsShape-'));
const norm = (p) => path.resolve(p).toLowerCase();
const overrideMap = new Map(Object.entries(over).map(([k, v]) => [norm(path.join(ROOT, k)), v]));
const memoryPlugin = {
  name: 'soccer-awards-memory',
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, (a) => {
      const hit = overrideMap.get(norm(a.path));
      if (hit === undefined) return undefined;
      return { contents: hit, loader: a.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
    });
  },
};
let bundleNo = 0;
async function bundle(entrySource) {
  const entry = path.join(TMP, `e${bundleNo}.mjs`);
  const outfile = path.join(TMP, `m${bundleNo++}.mjs`);
  fs.writeFileSync(entry, entrySource);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [memoryPlugin],
  });
  return import(pathToFileURL(outfile).href);
}
const R = ROOT.replaceAll('\\', '/');
const shape = await bundle(`export * from '${R}/${SHAPE}';`);
const live = await bundle(`
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lq = await import('${R}/${LQ}');
export const client = await import('${R}/src/integrations/supabase/client.ts');
export const teams = await import('${R}/${TEAMS}');
`);
const supabase = live.client.supabase;
const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), 'utf8'));

/* Every read goes through here: a failed read is a skip, never a pass. */
async function readAll(table, columns, filter) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(columns).order('id').range(from, from + 999);
    if (filter) q = filter(q);
    let res;
    try {
      res = await Promise.race([q, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000))]);
    } catch { return null; }
    if (res.error || !res.data) return null;
    rows.push(...res.data);
    if (res.data.length < 1000) return rows;
  }
}

// ---------------------------------------------------------------------------
head(1, 'the shape test refuses every junk shape the scrape produced');
{
  const JUNK = [
    [{ winner_name: 'ESPN Deportes', club_or_team: '—' }, 'paper'],
    [{ winner_name: 'Associated Press' }, 'paper'],
    [{ winner_name: 'Sport-Magazin' }, 'paper'],
    [{ winner_name: 'Mundo Esportivo' }, 'paper'],
    [{ winner_name: "France Football and L'Équipe" }, 'paper'],
    [{ winner_name: 'Guerin Sportivo' }, 'paper'],
    [{ winner_name: 'Castrol Football' }, 'paper'],
    [{ winner_name: 'Fantasy Football' }, 'paper'],
    [{ winner_name: 'The Guardian' }, 'paper'],
    [{ winner_name: 'Estadio' }, 'paper'],
    [{ winner_name: 'Goles' }, 'paper'],
    [{ winner_name: '1', club_or_team: 'Mexico' }, 'number'],
    [{ winner_name: '17.53%' }, 'number'],
    [{ winner_name: '1st' }, 'rank'],
    [{ winner_name: 'Colombia' }, 'nation'],
    [{ winner_name: 'West Germany' }, 'nation'],
    [{ winner_name: 'England France' }, 'nation'],
    [{ winner_name: 'Brazil Spain' }, 'nation'],
    [{ winner_name: 'Not awarded' }, 'nobody'],
    [{ winner_name: 'Antoine Griezmann Eden Hazard Harry Kane Luka Modrić' }, 'several'],
    [{ winner_name: 'Carlos Alberto', club_or_team: '4 –1' }, 'scoreline'],
    [{ winner_name: 'Diego Maradona', club_or_team: '2 –0' }, 'scoreline'],
    [{ winner_name: 'Richarlison', club_or_team: '2 -0' }, 'scoreline'],
  ];
  let refused = 0;
  for (const [row, kind] of JUNK) {
    const why = shape.awardRowProblem(row);
    if (!why) fail(`${JSON.stringify(row)} passes the shape test; it is ${kind} junk the scrape produced`);
    else refused++;
  }
  console.log(`   ${refused} of ${JUNK.length} junk shapes refused`);
}

head(2, 'the shape test keeps real winners, cleans their tags, and passes every migration row');
{
  const KEEP = [
    [{ winner_name: 'Hugo Sánchez (tie)', club_or_team: 'Real Madrid' }, 'Hugo Sánchez'],
    [{ winner_name: 'Hristo Stoichkov (tie)', club_or_team: 'CSKA Sofia' }, 'Hristo Stoichkov'],
    [{ winner_name: 'Preki (2)', club_or_team: 'Ante Razov , John Spencer' }, 'Preki'],
    [{ winner_name: 'Thierry Henry (1)', club_or_team: 'France' }, 'Thierry Henry'],
    [{ winner_name: 'Guillermo Barros Schelotto' }, 'Guillermo Barros Schelotto'],
    [{ winner_name: 'Álex Pineda Chacón' }, 'Álex Pineda Chacón'],
    [{ winner_name: "N'Golo Kanté", club_or_team: 'France' }, "N'Golo Kanté"],
    [{ winner_name: 'Juninho Paulista', club_or_team: 'Brazil' }, 'Juninho Paulista'],
    [{ winner_name: 'Kees Kist', club_or_team: "AZ '67 (Alkmaar)" }, 'Kees Kist'],
    [{ winner_name: 'Eusébio', club_or_team: 'Benfica' }, 'Eusébio'],
    [{ winner_name: 'Israel Reyes' }, 'Israel Reyes'],
  ];
  let kept = 0;
  for (const [row, clean] of KEEP) {
    const why = shape.awardRowProblem(row);
    if (why) { fail(`${row.winner_name} is refused (${why}); it is a real winner`); continue; }
    const got = shape.cleanAwardWinner(row.winner_name);
    if (got !== clean) fail(`${row.winner_name} cleans to ${JSON.stringify(got)}, expected ${JSON.stringify(clean)}`);
    else kept++;
  }
  const rows = record.worldCupAwards ?? [];
  let migrationRows = 0;
  for (const r of rows) {
    const why = shape.awardRowProblem({ winner_name: r.winner, club_or_team: null });
    if (why) fail(`the migration's ${r.award} ${r.year} row (${r.winner}) fails the shape test: ${why}`);
    else migrationRows++;
  }
  console.log(`   ${kept} of ${KEEP.length} real winners kept and cleaned; ${migrationRows} of ${rows.length} migration rows pass`);
}

head(3, 'the reader: verified awards only, the shape test always, nothing else reads the table');
{
  const code = codeOnly(lqText);
  const start = code.indexOf('async function awardWinners(');
  const end = start < 0 ? -1 : code.indexOf('\n}\n', start);
  const body = start < 0 || end < 0 ? '' : code.slice(start, end);
  if (!body) fail('awardWinners() is gone from src/lib/listQuiz.ts, so nothing here knows how the quiz reads soccer_awards');
  const guard = body.indexOf('if (!VERIFIED_SOCCER_AWARDS.includes(awardName))');
  const query = body.indexOf(".from('soccer_awards'");
  if (guard < 0) fail('awardWinners() no longer refuses an award that is not on VERIFIED_SOCCER_AWARDS');
  else if (query >= 0 && guard > query) fail('awardWinners() queries the table before it checks the verified list');
  if (guard >= 0 && !/^\s*throw new Error/.test(body.slice(body.indexOf('{', guard) + 1))) {
    fail('the verified list check in awardWinners() does not throw');
  }
  if (!body.includes('dealableAwardWinners(')) fail('awardWinners() no longer runs the shape test over the rows');
  if (!body.includes(".select('winner_name, club_or_team')")) fail("awardWinners() no longer reads exactly winner_name and club_or_team");
  const calls = [...code.matchAll(/awardWinners\('([^']+)'\)/g)].map(m => m[1]);
  if (calls.length === 0) fail('no List Quiz puzzle calls awardWinners(), so section 4 checks nothing');
  for (const a of calls) {
    if (!shape.VERIFIED_SOCCER_AWARDS.includes(a)) fail(`a puzzle reads ${a}, which is not a verified award`);
  }
  for (const a of shape.VERIFIED_SOCCER_AWARDS) {
    if (a in shape.DO_NOT_USE_SOCCER_AWARDS) fail(`${a} is on the verified list and the DO NOT USE list at once`);
  }
  for (const a of WC_AWARDS) {
    if (shape.VERIFIED_SOCCER_AWARDS.includes(a) && !(record.worldCupAwards ?? []).some(r => r.award === a)) {
      fail(`${a} was made readable with no verified rows behind it`);
    }
  }
  /* Any other reader would bypass all of the above. The generated types
     file names every table and reads nothing. */
  const readers = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && codeOnly(fs.readFileSync(path.join(ROOT, rel), 'utf8')).includes('soccer_awards')) readers.push(rel);
    }
  };
  walk('src');
  walk('supabase/functions');
  const allowed = new Set([LQ, 'src/integrations/supabase/types.ts']);
  for (const f of readers) if (!allowed.has(f)) fail(`${f} reads soccer_awards without going through awardWinners() and its shape test`);
  console.log(`   ${calls.length} puzzles read ${[...new Set(calls)].join(', ')}; readers of the table: ${readers.join(', ')}`);
}

head(4, 'the three soccer lists as the quiz deals them');
const soccerIds = ['golden-shoe-winners', 'pl-player-of-season', 'mls-mvps'];
{
  let dealt = 0;
  for (const id of soccerIds) {
    const p = live.lq.LIST_PUZZLES.find(x => x.id === id);
    if (!p) { fail(`the List Quiz no longer has ${id}`); continue; }
    let raw = null;
    try {
      raw = await Promise.race([p.fetch(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000))]);
    } catch (e) {
      if (String(e?.message ?? e).includes('not a verified award')) { fail(`${id} is refused by the verified list`); continue; }
      raw = null;
    }
    if (raw === null) { skipped.add(4); console.log(`   ${id}: SKIPPED, SUPABASE UNREACHABLE. THIS LIST WAS NOT CHECKED.`); continue; }
    const answers = live.lq.cleanAnswers(raw);
    if (answers.length < p.minAnswers) fail(`${id}: ${answers.length} answers, the quiz promises at least ${p.minAnswers}`);
    for (const a of answers) {
      if (/[()%]|\d/.test(a)) fail(`${id}: ${JSON.stringify(a)} is dealt with a tag, a digit or a bracket in it`);
      if (/^(not awarded|vacant|none)$/i.test(a.trim())) fail(`${id}: ${JSON.stringify(a)} is dealt as a winner`);
      const why = shape.awardRowProblem({ winner_name: a });
      if (why) fail(`${id}: ${JSON.stringify(a)} is dealt and fails the shape test (${why})`);
    }
    if (id === 'golden-shoe-winners') {
      const flat = new Set(answers.map(a => live.lq.normalize(a)));
      for (const must of ['hugo sanchez', 'hristo stoichkov', 'diego forlan', 'thierry henry', 'luis suarez', 'cristiano ronaldo']) {
        if (!flat.has(must)) fail(`golden-shoe-winners: ${must} is not dealt as a plain name (a tagged copy is unguessable)`);
      }
    }
    dealt++;
    console.log(`   ${id}: ${answers.length} answers, all name shaped`);
  }
  if (dealt === 0 && skipped.has(4)) console.log('   NO LIST WAS CHECKED.');
}

head(5, 'the verified awards lose only nobody won rows to the shape test');
const awardRows = await readAll('soccer_awards', 'id, award_name, year, winner_name, nationality, club_or_team, notes');
if (!awardRows) {
  skipped.add(5); skipped.add(6);
  console.log('   SKIPPED, SUPABASE UNREACHABLE. THE TABLE WAS NOT CHECKED.');
} else {
  for (const a of shape.VERIFIED_SOCCER_AWARDS) {
    const rows = awardRows.filter(r => r.award_name === a);
    const dropped = rows.map(r => [r, shape.awardRowProblem(r)]).filter(([, why]) => why);
    for (const [r, why] of dropped) {
      if (why !== 'winner_name says nobody won') fail(`${a} ${r.year}: the shape test drops ${JSON.stringify(r.winner_name)} (${why}), a real winner`);
    }
    console.log(`   ${a}: ${rows.length} rows, ${dropped.length} dropped (${[...new Set(dropped.map(([r]) => r.winner_name))].join(', ') || 'none'})`);
  }
  const names = [...new Set(awardRows.map(r => r.award_name))];
  const unknown = names.filter(n => !shape.VERIFIED_SOCCER_AWARDS.includes(n) && !(n in shape.DO_NOT_USE_SOCCER_AWARDS));
  if (unknown.length) console.log(`   note: on neither list, so unreadable until someone verifies them: ${unknown.join(', ')}`);
}

head(6, 'the World Cup awards: the migration, the record, the live table');
{
  const rows = record.worldCupAwards ?? [];
  const HOSTS_SECOND = /(^|\.)espn\.(com|co\.uk|in|com\.au)$|(^|\.)bbc\.(co\.uk|com)$|(^|\.)apnews\.com$/;
  const SHELL_HOSTS = new Set(['www.fifa.com', 'fifa.com']);
  const host = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
  for (const r of rows) {
    const f = host(r.fifa?.url);
    const s = host(r.second?.url);
    if (!f.endsWith('fifa.com')) fail(`record ${r.award} ${r.year} ${r.winner}: the first source is not fifa.com`);
    else if (SHELL_HOSTS.has(f) && !r.fifa?.rendered) fail(`record ${r.award} ${r.year} ${r.winner}: the fifa.com source is a script shell with no recorded rendering`);
    if (!HOSTS_SECOND.test(s)) fail(`record ${r.award} ${r.year} ${r.winner}: the second source is not ESPN, BBC Sport or AP`);
  }
  const code = sqlCode(wcSqlText);
  const tuples = [...code.matchAll(/^\s*\((\d+,\s*'World Cup [^\n]*)\)\s*[,;]\s*$/gm)].map(m => parseTuple(m[1]));
  /* (ord, award, year, winner, nation, notes, keep_id, was) */
  const key = (award, year, winner, nation, notes) => JSON.stringify([award, year, winner, nation, notes ?? null]);
  const inSql = new Map(tuples.map(t => [key(t[1], t[2], t[3], t[4], t[5]), t]));
  const inRecord = new Map(rows.map(r => [key(r.award, r.year, r.winner, r.nation, r.notes), r]));
  for (const [k] of inRecord) if (!inSql.has(k)) fail(`the record row ${k} is not in the migration`);
  for (const [k] of inSql) if (!inRecord.has(k)) fail(`the migration row ${k} has no two source record behind it`);
  if (!/raise exception[\s\S]*delete from public\.soccer_awards/i.test(code)) fail('the World Cup migration does not check its guards before it deletes');
  console.log(`   ${rows.length} record rows, ${tuples.length} migration rows`);

  if (awardRows) {
    const wc = awardRows.filter(r => WC_AWARDS.includes(r.award_name));
    const junk = wc.filter(r => shape.awardRowProblem(r));
    const exact = wc.length === rows.length && wc.every(r => inRecord.has(key(r.award_name, r.year, r.winner_name, r.nationality, r.notes)) && r.club_or_team == null);
    if (exact) {
      console.log(`   APPLIED: the ${wc.length} World Cup award rows are exactly the record`);
    } else if (wc.length === 393 && junk.length > 0) {
      console.log(`   PENDING: the Round 708 migration has not landed. ${junk.length} of the ${wc.length} World Cup award rows are junk shaped; no reader deals them (section 3).`);
      for (const a of WC_AWARDS) {
        if (!(a in shape.DO_NOT_USE_SOCCER_AWARDS)) fail(`${a} is still junk and is not on the DO NOT USE list`);
        if (shape.VERIFIED_SOCCER_AWARDS.includes(a)) fail(`${a} is still junk and is on the verified list`);
      }
    } else {
      fail(`the World Cup awards are neither the scrape (393 rows) nor the record (${rows.length} rows): ${wc.length} rows, ${junk.length} junk shaped. Half applied, or moved.`);
    }
  }
}

head(7, 'national_team_squads: names only, name shaped, and the migration read');
{
  const files = [[LINEUP, lineupText], [VALIDATE, src(VALIDATE)]];
  let reads = 0;
  for (const [f, text] of files) {
    const code = codeOnly(text);
    const re = /\.from\((['"])national_team_squads\1\)\s*\.select\((['"])([^'"]*)\2\)/g;
    for (const m of code.matchAll(re)) {
      reads++;
      if (m[3].trim() !== 'player_name') fail(`${f} selects "${m[3]}" from national_team_squads; only player_name survived the scrape`);
    }
    const loose = (code.match(/\.from\((['"])national_team_squads\1\)/g) ?? []).length;
    if (loose !== (code.match(re) ?? []).length) fail(`${f} reads national_team_squads in a shape this check cannot see`);
  }
  if (reads < 2) fail(`found ${reads} squad reads, expected Build Your XI and validate-player`);
  const sql = sqlCode(src(SQUAD_SQL));
  const guardAt = sql.search(/raise exception/i);
  const firstWrite = sql.search(/\b(delete from|update|insert into) public\.national_team_squads/i);
  if (guardAt < 0 || firstWrite < 0 || guardAt > firstWrite) fail('the squads migration writes before it checks the table has not moved');

  const squadRows = await readAll('national_team_squads', 'id, year, country, player_name, jersey_number, position, club');
  if (!squadRows) {
    skipped.add(7);
    console.log('   SKIPPED, SUPABASE UNREACHABLE. THE TABLE WAS NOT CHECKED.');
  } else {
    let pulled = 0;
    for (const nation of live.teams.nations) {
      const term = live.teams.nationSquadTerm(nation);
      for (const r of squadRows.filter(x => x.country === term)) {
        pulled++;
        const n = String(r.player_name ?? '').trim();
        if (n.length < 2 || /[\d%]/.test(n)) fail(`${nation}: the nation slot pulls ${JSON.stringify(n)}, which is not a name`);
      }
    }
    const stats = squadRows.filter(r => /^Player representation/i.test(r.country ?? ''));
    const dobClubs = squadRows.filter(r => /^\(\s*\d{4}-\d{2}-\d{2}\s*\)/.test(r.club ?? ''));
    const digitPos = squadRows.filter(r => /^\d/.test(r.position ?? ''));
    const n2026 = new Map();
    for (const r of squadRows.filter(x => x.year === 2026)) n2026.set(r.country, (n2026.get(r.country) ?? 0) + 1);
    const over26 = [...n2026].filter(([, n]) => n > 26);
    const scrape = stats.length === 60 && dobClubs.length === 2724 && digitPos.length === 2724 && n2026.size === 39;
    const repaired = stats.length === 0 && dobClubs.length === 0 && digitPos.length === 0 && n2026.size === 48 && over26.length === 0
      && squadRows.every(r => ['GK', 'DF', 'MF', 'FW'].includes(r.position));
    console.log(`   ${pulled} names pulled across ${live.teams.nations.length} nation slots, all name shaped`);
    if (repaired) {
      console.log(`   APPLIED: no statistics rows, no birth dates in club, positions are codes, 2026 holds 48 nations of at most 26`);
    } else if (scrape) {
      console.log(`   PENDING: the Round 708 squads migration has not landed. ${stats.length} statistics rows, ${dobClubs.length} birth dates in club, 2026 covers ${n2026.size} of 48 nations with ${over26.length} over 26 (provisional lists). Readers take player_name only.`);
    } else {
      fail(`national_team_squads is neither the scrape nor the repair: ${stats.length} statistics rows, ${dobClubs.length} birth dates in club, ${digitPos.length} digit positions, ${n2026.size} nations in 2026, ${over26.length} over 26. Half applied, or moved.`);
    }
  }
}

// ---------------------------------------------------------------------------
console.log('');
if (skipped.size) console.log(`AT LEAST ONE SECTION DID NOT RUN (${[...skipped].join(', ')}). Re-run from a sandbox that reaches Supabase before trusting it.`);
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const got = [...red].sort((a, b) => a - b);
  if (want.some(s => skipped.has(s))) {
    console.error(`CONTROL ${CONTROL}: a predicted section did not run, so the control proves nothing.`);
    process.exit(2);
  }
  if (JSON.stringify(got) === JSON.stringify(want)) {
    console.log(`CONTROL ${CONTROL}: caught, exactly section${want.length > 1 ? 's' : ''} ${want.join(' and ')} red.`);
    process.exit(1);
  }
  console.error(`CONTROL ${CONTROL}: expected section ${want.join(' and ')} red, got ${got.join(', ') || 'none'}. The control proves nothing.`);
  process.exit(2);
}
if (failures > 0) {
  console.error(`simSoccerAwardsShape: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSoccerAwardsShape: green. No junk shaped award or squad row is dealt, and both tables read as the migrations expect.');

/* Round 703 harness: the Connect 4 franchise code maps are held to the data
 * they claim to describe.
 *
 * nba-, nfl-, nhl- and mlb-connect4-validate each carry a hand typed
 * TEAM_CODES map (Round 703): a board label ("Trail Blazers") to every team
 * code its franchise has worn in the career table that game's grid reads.
 * confirmTeamAttribute reads it to settle a team half from our own records
 * BEFORE a stored refusal is believed. It is confirm only, so a code that is
 * missing can refuse nothing, but a code that names the WRONG franchise
 * accepts a false answer and caches it as a proved fact forever. The MLB map
 * shipped with exactly that: "athletics": ["ATH", "OAK"], and ATH in Lahman is
 * the 1876 National League Philadelphia Athletics (one season, team PHN, active
 * N; its 1871 to 1875 National Association years are PNA; five careers in
 * mlb_grid_players, none past 1890), not the modern club,
 * which is OAK in every year including Philadelphia and Kansas City. A map
 * that is real world lineage data ships with a fence, and this is it.
 *
 * Everything here is read out of the SOURCE by shape, with comments blanked
 * first, because a guard that reads prose is satisfied by the sentence that
 * explains why the guard exists. The validators are discovered, not listed:
 * any supabase/functions/x/index.ts that declares a TEAM_CODES map and a
 * confirmTeamAttribute function is held, and the run refuses to pass with
 * fewer than four of them.
 *
 * WHAT IT HOLDS
 *   1. Each map parses, its keys are already in attrNorm form (the function
 *      looks them up that way), every code has the shape of a code, and the
 *      RECORDS_TABLE, RECORDS_NAME and RECORDS_TEAMS constants it reads exist.
 *   2. The prompt's own "Team names (...)" list and the map name the same
 *      labels: what the model is told is a team is what the records check.
 *   3. Every team label on that game's boards (src/data/*Connect4Boards.ts)
 *      has a key. A label counts as a team when the game's grid lib, the
 *      prompt or the map says so.
 *   4. The grid lib that reads the same table (src/lib/*Grid.ts, paired by
 *      RECORDS_TABLE) agrees: each of its franchise ids is carried by exactly
 *      one key, and a key that is a lib label carries the lib's id.
 *   5. No code sits under two keys.
 *   6. confirmTeamAttribute is RUN, not read: its source is lifted out of the
 *      file, typed away with esbuild and called against a fake client. A hit
 *      returns the stored name; a miss, a wrong team, a split name (two people
 *      and one never played there), a full page, a thrown error, an unknown
 *      label and a blank name all return null; an ASCII spelling reaches an
 *      accented stored name and the prefilter pattern reaches it too. A helper
 *      that settles on "some" rows instead of "every" row fails here, and so
 *      does one that answers from a full page.
 *   7. Fail closed: in every function that returns unverified:true, a catch
 *      block that carries a verdict says valid:false and unverified:true, and
 *      no catch block anywhere says valid:true. A catch that refuses an
 *      unreadable request with a 4xx is a bad request, not a judged guess, and
 *      is counted separately.
 *   8. LIVE, through the REST endpoint with the constants read from
 *      src/integrations/supabase/client.ts. Skipped, with a clear line, when
 *      the host does not answer or with CONNECT4_CODES_LIVE=off:
 *      a. lineage, where a table records it. NBA against nba_team_codes:
 *         every code has a current franchise, all codes under a key share it,
 *         its name ends with the key, and every code the table files under
 *         that franchise is in the key. MLB against Lahman: a label names a
 *         current club, so its one code is a franchise that is active and
 *         fielded a team in the copy's final season. ATH fails all three.
 *      b. every code occurs in the table's own teams values. A code the
 *         lineage table vouches for may be dormant (the NBA table has no row
 *         for SYR, MNL, FTW and seven more pre 1970 codes); it is printed, not
 *         failed, because the map's contract is the whole lineage. A code no
 *         table vouches for must occur.
 *
 * NEGATIVE CONTROLS, CONNECT4_CODES_CONTROL=<case>. Each edits the NBA source
 * in memory after asserting the text it edits is there, and the run must go
 * red: exit 1 with the planted defect reported, exit 2 if it went unreported,
 * which means the check is broken.
 *   drop       removes LAL from the Lakers (sections 4 and 8a)
 *   dup        files LAL under the Bucks as well (sections 5 and 8a)
 *   missing    deletes the Nets entry (sections 2 and 3)
 *   failopen   rows.every(played) becomes rows.some(played) (section 6)
 *   catchopen  the outer catch answers valid:true (section 7)
 *
 * Run: node scripts/simConnect4FranchiseCodes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const CONTROLS = ['drop', 'dup', 'missing', 'failopen', 'catchopen'];
const CONTROL = process.env.CONNECT4_CODES_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`CONNECT4_CODES_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const LIVE = (process.env.CONNECT4_CODES_LIVE || '') !== 'off';

let failures = 0;
const fail = (m) => { failures += 1; console.log('  FAIL: ' + m); };
const ok = (m) => console.log('  ok    ' + m);
const note = (m) => console.log('        ' + m);

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
/* Comments become spaces of the same length, so an index found in the blanked
   text is the same index in the raw text. */
const blankComment = (m) => m.replace(/[^\n]/g, ' ');
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, blankComment).replace(/^\s*\/\/.*$/gm, blankComment);
/* The same fold the validators apply to a label before the lookup. */
const attrNorm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const quoted = (s) => [...s.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1] ?? m[2]);
const shortList = (arr, n = 12) => (arr.length <= n ? arr.join(' ') : arr.slice(0, n).join(' ') + ` and ${arr.length - n} more`);

/* The index just past the brace that closes the block opened at `open`.
   String and template literals are skipped, so a brace inside a message or
   a ${} cannot miscount. */
function blockEnd(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      for (i++; i < code.length && code[i] !== ch; i++) if (code[i] === '\\') i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

function catchBlocks(code) {
  const out = [];
  for (const m of code.matchAll(/\bcatch\b\s*(?:\([^)]*\))?\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    const end = blockEnd(code, open);
    if (end < 0) { out.push({ text: code.slice(open), broken: true }); break; }
    out.push({ text: code.slice(open, end) });
  }
  return out;
}

/* ---------- read every function, arm the control, discover the fenced ones ---------- */

const validators = fs.readdirSync(FN_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(FN_DIR, e.name, 'index.ts')))
  .map((e) => ({ name: e.name, raw: read(path.join(FN_DIR, e.name, 'index.ts')) }));

if (CONTROL) {
  const v = validators.find((x) => x.name === 'nba-connect4-validate');
  if (!v) { console.error('the controls edit nba-connect4-validate and it is not there'); process.exit(1); }
  const before = v.raw;
  const edits = {
    drop: ['"lakers": ["LAL", "MNL"]', '"lakers": ["MNL"]'],
    dup: ['"bucks": ["MIL"]', '"bucks": ["MIL", "LAL"]'],
    missing: ['  "nets": ["BRK", "NJN", "NYN"],\n', ''],
    failopen: ['rows.every(played)', 'rows.some(played)'],
    catchopen: ['valid: false, unverified: true', 'valid: true, unverified: true'],
  };
  const [old, neu] = edits[CONTROL];
  /* The last fail closed literal in the file is the outer catch, which is the
     one catchopen must turn. The other edits occur once. */
  const at = v.raw.lastIndexOf(old);
  if (at < 0) { console.error(`control changed nothing: ${JSON.stringify(old)} is not in nba-connect4-validate`); process.exit(1); }
  v.raw = v.raw.slice(0, at) + neu + v.raw.slice(at + old.length);
  if (v.raw === before) { console.error('control changed nothing'); process.exit(1); }
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}, nba-connect4-validate edited in memory. This run must go red.\n`);
}

for (const v of validators) v.code = strip(v.raw);
const fenced = validators.filter((v) => /const TEAM_CODES\s*:/.test(v.code) && /async function confirmTeamAttribute\s*\(/.test(v.code));

/* ---------- 1. the maps parse out of the source ---------- */

console.log('1) the maps parse out of the source, by shape');
for (const v of fenced) {
  const m = v.code.match(/const TEAM_CODES\s*:\s*Record<string,\s*string\[\]>\s*=\s*\{([\s\S]*?)\n\};/);
  if (!m) { fail(`${v.name}: no TEAM_CODES map of the expected shape`); continue; }
  const map = new Map();
  for (const e of m[1].matchAll(/"([^"]+)"\s*:\s*\[([^\]]*)\]/g)) {
    const key = e[1];
    const codes = quoted(e[2]);
    if (map.has(key)) fail(`${v.name}: "${key}" is declared twice`);
    if (key !== attrNorm(key)) fail(`${v.name}: key "${key}" is not in attrNorm form, so confirmTeamAttribute can never find it`);
    if (codes.length === 0) fail(`${v.name}: "${key}" carries no code at all`);
    for (const c of codes) if (!/^[A-Z0-9]{2,3}$/.test(c)) fail(`${v.name}: "${key}" carries "${c}", which is not the shape of a team code`);
    map.set(key, codes);
  }
  const consts = {};
  for (const k of ['RECORDS_TABLE', 'RECORDS_NAME', 'RECORDS_TEAMS']) {
    const c = v.code.match(new RegExp(`const ${k}\\s*=\\s*"([^"]+)"`));
    if (!c) fail(`${v.name}: no ${k} constant`); else consts[k] = c[1];
  }
  const tn = v.code.match(/Team names \(((?:\s*"[^"]+"\s*,?)+)\)/);
  v.prompt = tn ? quoted(tn[1]) : [];
  if (v.prompt.length === 0) fail(`${v.name}: the prompt has no "Team names (...)" list to compare the map against`);
  if (map.size < 20) fail(`${v.name}: only ${map.size} labels parsed, a league has more teams than that`);
  v.map = map;
  v.consts = consts;
  v.promptSet = new Set(v.prompt.map(attrNorm));
  v.vouched = new Set();
  ok(`${v.name}: ${map.size} labels, ${[...map.values()].flat().length} codes, reads ${consts.RECORDS_TABLE}.${consts.RECORDS_TEAMS} by ${consts.RECORDS_NAME}, prompt names ${v.prompt.length} teams`);
}
if (fenced.length < 4) fail(`${fenced.length} validators carry a TEAM_CODES map; Round 703 shipped four and the floor is a ratchet`);
const parsed = fenced.filter((v) => v.map && v.consts.RECORDS_TABLE);

/* The grid lib that reads the same table is the repo's own list of that
   sport's franchise ids. Paired by the table name, never by a list here. */
const libFiles = fs.readdirSync(path.join(ROOT, 'src', 'lib')).filter((f) => /Grid\.ts$/.test(f));
for (const v of parsed) {
  const table = v.consts.RECORDS_TABLE;
  const hits = libFiles.filter((f) => new RegExp(`table:\\s*'${table}'`).test(strip(read(path.join(ROOT, 'src', 'lib', f)))));
  if (hits.length !== 1) { fail(`${v.name}: ${hits.length} grid libs read ${table} (${hits.join(', ') || 'none'}), expected exactly one`); continue; }
  const lib = strip(read(path.join(ROOT, 'src', 'lib', hits[0])));
  const pool = lib.match(/export const FRANCHISE_POOL[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!pool) { fail(`${hits[0]}: no FRANCHISE_POOL of the expected shape`); continue; }
  v.lib = { file: hits[0], pool: [...pool[1].matchAll(/\{\s*kind:\s*'franchise'\s*,\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*\}/g)].map((m) => ({ id: m[1], label: m[2] })) };
  if (v.lib.pool.length === 0) fail(`${hits[0]}: FRANCHISE_POOL parsed to nothing`);
}

/* ---------- 2. the prompt and the map agree ---------- */

console.log('2) the prompt and the map name the same teams');
for (const v of parsed) {
  const onlyPrompt = [...v.promptSet].filter((k) => !v.map.has(k));
  const onlyMap = [...v.map.keys()].filter((k) => !v.promptSet.has(k));
  if (onlyPrompt.length) fail(`${v.name}: the prompt calls ${onlyPrompt.join(', ')} a team and the map has no code for it, so our records can never answer it`);
  if (onlyMap.length) fail(`${v.name}: the map carries ${onlyMap.join(', ')} and the prompt never calls it a team`);
  if (!onlyPrompt.length && !onlyMap.length) ok(`${v.name}: ${v.promptSet.size} teams, one list`);
}

/* ---------- 3. every team label on the boards has a key ---------- */

console.log('3) every team label on the boards has a key');
const boardFiles = fs.readdirSync(path.join(ROOT, 'src', 'data')).filter((f) => /Connect4Boards\.ts$/.test(f));
for (const v of parsed) {
  const prefix = v.name.split('-')[0];
  const bf = boardFiles.find((f) => f.toLowerCase().startsWith(prefix));
  if (!bf) { fail(`${v.name}: no src/data/${prefix}Connect4Boards.ts to read the boards from`); continue; }
  const boards = strip(read(path.join(ROOT, 'src', 'data', bf)));
  const attrs = new Set();
  for (const m of boards.matchAll(/(?:columnAttributes|rowAttributes)\s*:\s*\[([^\]]*)\]/g)) for (const a of quoted(m[1])) attrs.add(a);
  if (attrs.size === 0) { fail(`${bf}: no attributes parsed`); continue; }
  const libLabels = new Set((v.lib?.pool ?? []).map((e) => attrNorm(e.label)));
  const teams = [...attrs].filter((a) => { const k = attrNorm(a); return v.map.has(k) || libLabels.has(k) || v.promptSet.has(k); });
  const missing = teams.filter((a) => !v.map.has(attrNorm(a)));
  if (missing.length) fail(`${v.name}: ${bf} puts ${missing.join(', ')} on a board and the map has no key for it`);
  if (teams.length < 10) fail(`${v.name}: only ${teams.length} team labels recognised on the boards, which is too few to be the whole set`);
  const used = new Set(teams.map(attrNorm));
  const unused = [...v.map.keys()].filter((k) => !used.has(k));
  if (!missing.length) ok(`${v.name}: ${attrs.size} attributes on the boards, ${teams.length} are teams, all keyed; ${unused.length} key${unused.length === 1 ? '' : 's'} no board uses yet${unused.length ? ' (' + unused.join(', ') + ')' : ''}`);
}

/* ---------- 4. the grid lib agrees ---------- */

console.log('4) the grid lib reading the same table agrees on every franchise id');
for (const v of parsed) {
  if (!v.lib) continue;
  let agreed = 0;
  const renamed = [];
  for (const { id, label } of v.lib.pool) {
    const carriers = [...v.map.entries()].filter(([, codes]) => codes.includes(id)).map(([k]) => k);
    if (carriers.length !== 1) { fail(`${v.name}: ${v.lib.file} has ${label} = ${id} and the map carries ${id} under ${carriers.length === 0 ? 'nobody' : carriers.join(' and ')}`); continue; }
    const k = attrNorm(label);
    if (v.map.has(k)) {
      if (!v.map.get(k).includes(id)) { fail(`${v.name}: the map has "${k}" without ${id}, which ${v.lib.file} says is its id`); continue; }
    } else {
      renamed.push(`${label} is "${carriers[0]}" on the boards`);
    }
    agreed += 1;
  }
  if (agreed === v.lib.pool.length) ok(`${v.name}: all ${agreed} ids in ${v.lib.file} agree${renamed.length ? ' (' + renamed.join('; ') + ')' : ''}`);
}

/* ---------- 5. no code under two keys ---------- */

console.log('5) no code sits under two keys');
for (const v of parsed) {
  const owner = new Map();
  let dup = 0;
  for (const [k, codes] of v.map) for (const c of codes) {
    if (owner.has(c) && owner.get(c) !== k) { dup += 1; fail(`${v.name}: ${c} is filed under both "${owner.get(c)}" and "${k}"`); }
    owner.set(c, k);
  }
  if (!dup) ok(`${v.name}: ${owner.size} codes, each under one key`);
}

/* ---------- 6. the function is run against a fake client ---------- */

console.log('6) confirmTeamAttribute, lifted out of each file and run against a fake client');
function fakeClient(answer) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table };
      calls.push(call);
      return {
        select(cols) {
          call.cols = cols;
          return {
            filter(col, op, pattern) {
              Object.assign(call, { col, op, pattern });
              return { limit(n) { call.limit = n; return Promise.resolve().then(() => ({ data: answer(call) })); } };
            },
          };
        },
      };
    },
  };
}
for (const v of parsed) {
  const start = v.code.search(/^const attrNorm\s*=/m);
  const sig = v.code.search(/async function confirmTeamAttribute\s*\(/);
  const open = sig < 0 ? -1 : v.code.indexOf('{', v.code.indexOf(')', sig));
  const end = open < 0 ? -1 : blockEnd(v.code, open);
  if (start < 0 || end < 0) { fail(`${v.name}: could not lift attrNorm through confirmTeamAttribute out of the source`); continue; }
  let factory;
  try {
    const { code: js } = await transform(v.raw.slice(start, end), { loader: 'ts', target: 'es2022' });
    factory = new Function('sb', `${js}\nreturn confirmTeamAttribute;`);
  } catch (e) { fail(`${v.name}: the lifted source does not compile: ${String(e).slice(0, 160)}`); continue; }
  const { RECORDS_TABLE: T, RECORDS_NAME: N, RECORDS_TEAMS: C } = v.consts;
  const [key, codes] = [...v.map.entries()][0];
  const code = codes[0];
  const label = key.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
  const row = (name, teams) => ({ [N]: name, [C]: teams });
  const run = async (answer, name, attr) => { const sb = fakeClient(answer); const r = await factory(sb)(name, attr); return { r, calls: sb.calls }; };
  const cases = [
    ['a hit, teams as text, returns the stored name', [row('Test Player', `ZZZ,${code}`)], 'Test Player', label, 'Test Player'],
    ['a hit, teams as an array, returns the stored name', [row('Test Player', ['ZZZ', code])], 'Test Player', label, 'Test Player'],
    ['a lowercase stored code still counts', [row('Test Player', code.toLowerCase())], 'Test Player', label, 'Test Player'],
    ['no row is null', [], 'Test Player', label, null],
    ['a row at another team is null', [row('Test Player', 'ZZZ')], 'Test Player', label, null],
    ['two people, one never there, is null', [row('Test Player', code), row('Test Player', 'ZZZ')], 'Test Player', label, null],
    ['a full page of fifty is null', Array.from({ length: 50 }, () => row('Test Player', code)), 'Test Player', label, null],
    ['a thrown error is null', () => { throw new Error('boom'); }, 'Test Player', label, null],
    ['an unknown label is null', [row('Test Player', code)], 'Test Player', 'Not A Team', null, 0],
    ['a blank name is null', [row('Test Player', code)], '   ', label, null, 0],
    ['an ASCII spelling reaches the accented stored name', [row('Nikola Jokić', code)], 'Nikola Jokic', label, 'Nikola Jokić'],
    ['a longer stored name is not the typed one', [row('Nikola Jokic Jr', code)], 'Nikola Jokic', label, null],
  ];
  let green = 0;
  for (const [what, rows, name, attr, want, wantCalls] of cases) {
    const answer = typeof rows === 'function' ? rows : () => rows;
    let got;
    try { got = await run(answer, name, attr); } catch (e) { fail(`${v.name}: ${what}: the function threw ${String(e).slice(0, 120)}`); continue; }
    if (got.r !== want) { fail(`${v.name}: ${what}: got ${JSON.stringify(got.r)}, wanted ${JSON.stringify(want)}`); continue; }
    if (wantCalls !== undefined && got.calls.length !== wantCalls) { fail(`${v.name}: ${what}: ${got.calls.length} table reads, wanted ${wantCalls}`); continue; }
    if (got.calls.length) {
      const c = got.calls[0];
      if (c.table !== T) { fail(`${v.name}: ${what}: read ${c.table}, not ${T}`); continue; }
      if (c.op !== 'imatch' || c.col !== N || c.limit !== 50) { fail(`${v.name}: ${what}: read ${c.col} by ${c.op} with limit ${c.limit}`); continue; }
      if (!/^\^/.test(c.pattern) || !/\$$/.test(c.pattern)) { fail(`${v.name}: ${what}: the prefilter pattern is not anchored: ${c.pattern}`); continue; }
      let re;
      try { re = new RegExp(c.pattern, 'i'); } catch { fail(`${v.name}: ${what}: the prefilter pattern is not a regex: ${c.pattern}`); continue; }
      const stored = rows.length ? String(rows[0][N]) : name;
      if (want !== null && !re.test(stored)) { fail(`${v.name}: ${what}: the prefilter ${c.pattern} does not reach "${stored}", so the database would never return the row`); continue; }
    }
    green += 1;
  }
  if (green === cases.length) ok(`${v.name}: ${green} cases, reading ${T}.${N} by anchored imatch, limit 50`);
}

/* ---------- 7. fail closed ---------- */

console.log('7) every catch that carries a verdict fails closed');
const contract = validators.filter((v) => /unverified:\s*true/.test(v.code));
const before7 = failures;
let catchesSeen = 0;
let verdictCatches = 0;
let badRequests = 0;
for (const v of contract) {
  for (const b of catchBlocks(v.code)) {
    catchesSeen += 1;
    if (b.broken) { fail(`${v.name}: a catch block never closes, the brace scan gave up`); continue; }
    if (/valid:\s*true/.test(b.text)) fail(`${v.name}: a catch block answers valid:true, the July 2026 fail open`);
    if (!/\bvalid:/.test(b.text)) continue;
    if (!/valid:\s*false/.test(b.text)) { fail(`${v.name}: a catch block carries a verdict that is not valid:false`); continue; }
    /* A request body that could not be read is refused with a 4xx. That is a
       bad request, not a guess the function failed to judge. */
    if (/,\s*4\d\d\s*\)|status:\s*4\d\d/.test(b.text)) { badRequests += 1; continue; }
    verdictCatches += 1;
    if (!/unverified:\s*true/.test(b.text)) fail(`${v.name}: a catch block carries a verdict without unverified:true, so the client would burn the guess`);
  }
}
for (const v of parsed) if (!contract.includes(v)) fail(`${v.name}: never returns unverified:true, so it has no fail closed path at all`);
if (failures === before7) ok(`${contract.length} functions return unverified:true; ${catchesSeen} catch blocks read, ${verdictCatches} carry a verdict and every one is valid:false with unverified:true, ${badRequests} refuse an unreadable request with a 4xx`);

/* ---------- 8. live ---------- */

console.log('8) the live tables, through the REST endpoint');
let liveNote = '';
if (!LIVE) {
  liveNote = 'skipped: live sections turned off by CONNECT4_CODES_LIVE=off';
  note(liveNote);
} else {
  const client = read(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'));
  const U = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const K = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  const H = { apikey: K, Authorization: `Bearer ${K}` };
  const probe = async () => {
    if (!U || !K) return { ok: false, why: 'no URL or key in src/integrations/supabase/client.ts' };
    try {
      const res = await fetch(`${U}/rest/v1/`, { headers: H, signal: AbortSignal.timeout(8000) });
      const body = await res.text().catch(() => '');
      if (/host not in allowlist/i.test(body)) return { ok: false, why: `the egress proxy refused the host (HTTP ${res.status})` };
      return { ok: true, why: `answered HTTP ${res.status}` };
    } catch (e) { return { ok: false, why: String(e).slice(0, 100) }; }
  };
  const up = await probe();
  if (!up.ok) {
    liveNote = `skipped: offline (${up.why}). Sections 1 to 7 held; the live checks did not run.`;
    note(liveNote);
  } else {
    const rest = async (qs, extra = {}) => {
      const res = await fetch(`${U}/rest/v1/${qs}`, { headers: { ...H, ...extra }, signal: AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} reading ${qs.split('?')[0]}`);
      return { rows: await res.json(), range: res.headers.get('content-range') || '' };
    };
    const count = async (table, nameCol) => {
      const { range } = await rest(`${table}?select=${nameCol}&limit=1`, { Prefer: 'count=exact' });
      return Number(range.split('/')[1]);
    };
    const splitCodes = (raw) => (Array.isArray(raw) ? raw : String(raw ?? '').split(',')).map((c) => String(c).trim().toUpperCase()).filter(Boolean);

    console.log('   8a) lineage, where a table records it');
    for (const v of parsed) {
      const T = v.consts.RECORDS_TABLE;
      try {
        if (T === 'nba_player_stats') {
          const { rows } = await rest('nba_team_codes?select=team_code,team_name,franchise&limit=1000');
          const byCode = new Map(rows.map((r) => [r.team_code, r]));
          const byFranchise = new Map();
          for (const r of rows) if (r.franchise) { if (!byFranchise.has(r.franchise)) byFranchise.set(r.franchise, new Set()); byFranchise.get(r.franchise).add(r.team_code); }
          let clean = 0;
          for (const [key, codes] of v.map) {
            let bad = false;
            const franchises = new Set();
            for (const c of codes) {
              const r = byCode.get(c);
              if (!r) { fail(`${v.name}: "${key}" carries ${c}, which nba_team_codes does not know`); bad = true; continue; }
              if (!r.franchise) { fail(`${v.name}: "${key}" carries ${c} (${r.team_name}), a defunct team with no current franchise in nba_team_codes`); bad = true; continue; }
              franchises.add(r.franchise);
            }
            if (franchises.size > 1) { fail(`${v.name}: "${key}" mixes ${[...franchises].join(' and ')}`); bad = true; }
            if (franchises.size === 1) {
              const f = [...franchises][0];
              if (!attrNorm(f).endsWith(key)) { fail(`${v.name}: "${key}" carries codes nba_team_codes files under ${f}`); bad = true; }
              const left = [...byFranchise.get(f)].filter((c) => !codes.includes(c));
              if (left.length) { fail(`${v.name}: nba_team_codes also files ${left.join(', ')} under ${f} and "${key}" leaves them out, so those years can confirm nothing`); bad = true; }
            }
            if (!bad) { clean += 1; for (const c of codes) v.vouched.add(c); }
          }
          if (clean === v.map.size) ok(`${v.name}: ${v.map.size} labels agree with nba_team_codes (${rows.length} codes, ${byFranchise.size} current franchises), every lineage complete`);
        } else if (T === 'mlb_grid_players') {
          const fr = (await rest('lahman_team_franchises?select=franchid,franchname,active&limit=1000')).rows;
          const last = (await rest('lahman_teams?select=yearid&order=yearid.desc&limit=1')).rows[0]?.yearid;
          const current = new Set((await rest(`lahman_teams?select=franchid&yearid=eq.${last}&limit=1000`)).rows.map((r) => r.franchid));
          let clean = 0;
          for (const [key, codes] of v.map) {
            let bad = false;
            if (codes.length !== 1) { fail(`${v.name}: "${key}" carries ${codes.length} codes (${codes.join(', ')}); Lahman franchise ids already fold relocations, so a club has one`); bad = true; }
            for (const c of codes) {
              const f = fr.find((r) => r.franchid === c);
              if (!f) { fail(`${v.name}: "${key}" carries ${c}, which is not a Lahman franchise id`); bad = true; continue; }
              if (f.active !== 'Y') { fail(`${v.name}: "${key}" carries ${c}, ${f.franchname}, active=${f.active} in Lahman, not a current club`); bad = true; }
              if (!current.has(c)) { fail(`${v.name}: "${key}" carries ${c}, which fielded no team in ${last}, the Lahman copy's final season`); bad = true; }
            }
            if (!bad) { clean += 1; for (const c of codes) v.vouched.add(c); }
          }
          if (clean === v.map.size) ok(`${v.name}: ${v.map.size} labels are ${v.map.size} active Lahman franchises, every one fielded a team in ${last} (${current.size} clubs that season)`);
        } else {
          note(`${v.name}: no lineage table for ${T} in the database, so every code must occur in 8b and the grid lib is the only other witness`);
        }
      } catch (e) {
        fail(`${v.name}: lineage could not be read (${String(e).slice(0, 120)}); this is the service, not the data, and it still counts`);
      }
    }

    console.log('   8b) every code occurs in the table it is read from, unless the lineage table vouches for it');
    for (const v of parsed) {
      const { RECORDS_TABLE: T, RECORDS_NAME: N, RECORDS_TEAMS: C } = v.consts;
      const codes = [...new Set([...v.map.values()].flat())];
      try {
        const total = await count(T, N);
        const sample = (await rest(`${T}?select=${C}&limit=1`)).rows[0]?.[C];
        const isArray = Array.isArray(sample);
        const absent = [];
        let detail;
        if (total <= 8000) {
          /* Small enough to read whole: the distinct code set is exact and
             the codes nothing in the map covers can be printed. */
          const seen = new Map();
          for (let offset = 0; ; offset += 1000) {
            const { rows } = await rest(`${T}?select=${C}&order=${N}&limit=1000&offset=${offset}`);
            for (const r of rows) for (const c of splitCodes(r[C])) seen.set(c, (seen.get(c) || 0) + 1);
            if (rows.length < 1000) break;
          }
          for (const c of codes) if (!seen.has(c)) absent.push(c);
          const uncovered = [...seen.keys()].filter((c) => !codes.includes(c)).sort();
          detail = `${total} rows, ${seen.size} distinct codes, ${uncovered.length} the map does not cover: ${shortList(uncovered) || 'none'}`;
        } else {
          /* Too big to page in a harness: one exact probe per code. */
          for (const c of codes) {
            const filter = isArray ? `${C}=cs.{${c}}` : `${C}=like.*${c}*`;
            const { rows } = await rest(`${T}?select=${C}&${filter}&limit=5`);
            if (!rows.some((r) => splitCodes(r[C]).includes(c))) absent.push(c);
          }
          detail = `${total} rows, probed one by one`;
        }
        const dormant = absent.filter((c) => v.vouched.has(c));
        const missing = absent.filter((c) => !v.vouched.has(c));
        for (const c of missing) fail(`${v.name}: ${c} occurs in no row of ${T}.${C} and no lineage table vouches for it`);
        if (!missing.length) ok(`${v.name}: ${codes.length - dormant.length} of ${codes.length} codes occur in ${T}.${C} (${detail})${dormant.length ? `; ${dormant.length} dormant, vouched for by the lineage table and confirming nothing today: ${dormant.join(' ')}` : ''}`);
      } catch (e) {
        fail(`${v.name}: could not read ${T} (${String(e).slice(0, 120)}); this is the service, not the data, and it still counts`);
      }
    }
  }
}

/* ---------- verdict ---------- */

console.log('');
if (CONTROL) {
  if (failures > 0) {
    console.log(`simConnect4FranchiseCodes control ${CONTROL}: the planted defect was reported (${failures} finding${failures === 1 ? '' : 's'}). This red is expected.`);
    process.exit(1);
  }
  console.error(`simConnect4FranchiseCodes control ${CONTROL}: RED. The planted defect went unreported, the check does not work.`);
  process.exit(2);
}
if (failures > 0) { console.error(`simConnect4FranchiseCodes: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log(`simConnect4FranchiseCodes: green. ${parsed.length} franchise code maps match the boards, the prompts, the grid libs and the function that reads them${liveNote ? ' (' + liveNote + ')' : ', and the live tables'}.`);

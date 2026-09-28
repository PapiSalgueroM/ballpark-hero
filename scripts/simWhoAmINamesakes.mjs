/* Who Am I namesakes and listed ages: the game knows who is who, and says how
   old its ages are.

   Round 668, from a player report (Who Am I, "Wrong answer", 2026-09-26) and
   the pool audit that followed it. Measured against the live table on
   2026-09-28, before the fix:

     person_key   NULL on all 141,916 rows of player_market_values, so no
                  collision in the pool maps to more than one person_key: the
                  column the round was asked to use carries nothing yet. What
                  the table DOES say about who is who is the stored spelling:
                  27,803 normalized names, 45 stored more than one way, and all
                  3 of those in the 600 player pool are different men (Éderson
                  and Ederson, Ladislav Krejčí and Krejci, Pepê, Pêpê and Pepe).
     search       the shared soccer search kept one row per normalized name, so
                  typing the Atalanta midfielder Éderson offered only the
                  Fenerbahce keeper Ederson, and picking him scored 40. 1 of the
                  600 pool players could not be won by typing his name. After:
                  0, and no namesake wins in anyone's place.
     club history every row under one spelling was pooled, so 27 pool players
                  share their spelling with rows of another birth year, and 23
                  of them carried another man's clubs (Rodri the Real Betis,
                  Huesca and Cartagena Rodris'; the Sporting Luis Suárez the
                  Uruguayan's Liverpool and Barcelona). 1,248 pool pairs lit the
                  Past club link only through such rows. After: 0.
     ages         every age is the table's, not today's. The table keeps a
                  yearly rule (3,914 of 4,013 players listed once in 2025 and
                  once in 2026 are exactly one year older, none the same age),
                  8 pool players sit on the 2025 list, and comparing their
                  listed age with a 2026 one called men a year apart the same
                  age. After: ages show as listed, the older list is named, and
                  the arrows compare both on the newest list.

   Sections (each is judged on its own, and each control reddens only its own):
     1. The search tells namesakes apart and the judge agrees. Every pool
        player, typed by his stored name through the real searchPlayers, is
        offered as his own row, resolves through the real whoAmIPlayerFromEntity
        and wins; every other row of the same name resolves and does NOT win;
        and every row whose name another row shares says which man it is, with
        the club of his latest row.
     2. The Past club link only through the man's own rows. The rows under each
        pool spelling are read independently here and split by the Round 385
        rule (isSameMan, imported from a pristine bundle so a control cannot
        bend the yardstick). Over every ordered pool pair the game's own
        scoreGuess must never light the link without an own-row club in common,
        and must light it whenever there is one. The pre-668 pooling, rebuilt
        here from the same rows, is the baseline that proves this measures a
        real defect.
     3. Ages say what they are. With comments stripped, the Who Am I and Clue
        Auction pages never render a bare .age, both go through listedAgeLabel,
        and Who Am I tells the player the ages are as listed. Every pool
        player's label carries his listed age and names his list when it is
        not the newest.
     4. Ages compare on one list. The yearly rule is measured live from every
        2025 and 2026 row (the hand swept rows of scripts/data/staleSweep2026.json
        left out, they carry their sweep day's age), and over every pool pair
        across the two lists the game's own age comparison must agree with it.
        The raw comparison is the baseline.

   Negative controls. Each asserts its anchor appears EXACTLY once in an in
   memory copy (exit 2 and refuse to run otherwise), rewrites the copy in the
   temp folder, points esbuild at it, and must redden its own section only:
     SIM_WHOAMI_NAMESAKES_CONTROL=folddedupe  the search dedupes by folded name
                                              again. Section 1 (Éderson).
     SIM_WHOAMI_NAMESAKES_CONTROL=nodisambig  shared names lose their club line.
                                              Section 1.
     SIM_WHOAMI_NAMESAKES_CONTROL=foldjudge   the judge compares folded names.
                                              Section 1 (a namesake wins).
     SIM_WHOAMI_NAMESAKES_CONTROL=pooled      the history takes every row under
                                              the spelling again. Section 2.
     SIM_WHOAMI_NAMESAKES_CONTROL=overstrict  the history keeps only current
                                              year rows. Section 2 (recall).
     SIM_WHOAMI_NAMESAKES_CONTROL=rawlabel    the age chip prints p.age. Section 3.
     SIM_WHOAMI_NAMESAKES_CONTROL=rawage      the arrows compare raw listed ages.
                                              Section 4.
     SIM_WHOAMI_NAMESAKES_CONTROL=listdrift   the fetched 2026 ages are moved back
                                              onto the 2025 ones in memory (a
                                              refresh that broke the yearly rule).
                                              Section 4.
   A control that turns nothing red, or turns another section red too, exits
   3, so it can never read as a pass or as the red it was meant to produce.

   Network: the live database, as simWorldXiPositions and simNoZeroFacts read
   it. Identical GET URLs are answered from a memo after the first live fetch.
   If the database cannot be reached the run says
   DATABASE UNREACHABLE. NOTHING WAS CHECKED. and exits 1.

   Run: node scripts/simWhoAmINamesakes.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');

const CONTROLS = {
  folddedupe: {
    section: 1, file: 'src/lib/playerSearch.ts', alias: '@/lib/playerSearch',
    anchor: 'const dedupeKey = personKey ?? normalized;',
    broken: 'const dedupeKey = normalized;',
    note: 'the search dedupes by folded name again',
  },
  nodisambig: {
    section: 1, file: 'src/lib/playerSearch.ts', alias: '@/lib/playerSearch',
    anchor: 'if (hint) entity.disambiguator = hint;',
    broken: 'if (hint) void hint;',
    note: 'rows sharing a name lose the line that says which man they are',
  },
  foldjudge: {
    section: 1, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'const isExact = guess.personKey && secret.personKey ? guess.personKey === secret.personKey : guess.name === secret.name;',
    broken: 'const isExact = normalizeName(guess.name) === normalizeName(secret.name);',
    note: 'the judge compares folded names, so a namesake counts as the answer',
  },
  pooled: {
    section: 2, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'if (!r.person_key && !isSameMan(owner, { age: r.age, year: r.year })) continue;',
    broken: '',
    note: 'the club history pools every row under the spelling again',
  },
  overstrict: {
    section: 2, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'if (!r.person_key && !isSameMan(owner, { age: r.age, year: r.year })) continue;',
    broken: 'if (!r.person_key && r.year !== owner.year) continue;',
    note: 'the club history keeps only rows from the current row\'s year',
  },
  rawlabel: {
    section: 3, file: 'src/pages/WhoAmI.tsx', alias: null,
    anchor: 'Age {listedAgeLabel(p)}',
    broken: 'Age {p.age}',
    note: 'the age chip prints the bare listed number again',
  },
  rawage: {
    section: 4, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'const ageDiff = ageOnNewestList(secret) - ageOnNewestList(guess);',
    broken: 'const ageDiff = secret.age - guess.age;',
    note: 'the arrows compare raw listed ages across lists again',
  },
  listdrift: {
    section: 4, file: null, alias: null, anchor: null, broken: null,
    note: 'the fetched 2026 ages are moved back onto the 2025 ones in memory',
  },
};
const CONTROL = process.env.SIM_WHOAMI_NAMESAKES_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_WHOAMI_NAMESAKES_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0, 4: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };

/* A worktree may check out CRLF while the anchors are written LF. */
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
const occurrences = (src, needle) => src.split(needle).length - 1;

/* In memory copies for the source controls. A control whose anchor is not in
   the file exactly once refuses to run: a rewrite of nothing proves nothing. */
const aliases = [];
const pageOverride = new Map();
if (CONTROL && CONTROLS[CONTROL].file) {
  const c = CONTROLS[CONTROL];
  const src = readLf(c.file);
  const n = occurrences(src, c.anchor);
  if (n !== 1) {
    console.error(`control cannot run: the anchor for ${CONTROL} appears ${n} times in ${c.file}, it must appear exactly once`);
    process.exit(2);
  }
  const copy = src.replace(c.anchor, c.broken);
  if (copy === src) { console.error(`control cannot run: rewriting ${c.file} for ${CONTROL} changed nothing`); process.exit(2); }
  if (c.alias) {
    const out = `${TMP}/whoAmINamesakes.${CONTROL}.${path.basename(c.file)}`;
    fs.writeFileSync(out, copy);
    aliases.push(`--alias:${c.alias}=${out}`);
  } else {
    pageOverride.set(c.file, copy);
  }
}
if (CONTROL) console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${CONTROLS[CONTROL].note}; section ${CONTROLS[CONTROL].section} must go red and only it`);

/* esbuild by walking up, so the harness also runs from a worktree whose own
   node_modules is not there. */
function findBin(name) {
  let dir = ROOT;
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, 'node_modules', '.bin', name);
    if (fs.existsSync(p) || fs.existsSync(p + '.cmd')) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return path.join(ROOT, 'node_modules', '.bin', name);
}
const ESBUILD = findBin('esbuild');

function bundle(tag, extra) {
  const entry = `${TMP}/whoAmINamesakes.${tag}.entry.mjs`;
  const out = `${TMP}/whoAmINamesakes.${tag}.bundle.mjs`;
  fs.writeFileSync(entry, `export * as w from '@/lib/whoAmI';\nexport * as ps from '@/lib/playerSearch';\n`);
  execSync(
    `"${ESBUILD}" "${entry}" --bundle --format=esm --platform=node --outfile="${out}" --log-level=error --alias:@=${ROOT_URL}/src ${extra.join(' ')}`,
    { stdio: 'inherit' },
  );
  return out;
}
/* The lib under test carries the control; the reference is always pristine
   and is only ever used as a yardstick (the isSameMan rule, the identity). */
const LIB = bundle(CONTROL ? `lib-${CONTROL}` : 'lib', aliases);
const REF = bundle('ref', []);

/* The supabase client reads localStorage and captures fetch as it loads. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const realFetch = globalThis.fetch;
const memo = new Map();
const net = { live: 0, memo: 0, failed: 0, refused: false };
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  if (method !== 'GET') return realFetch(input, init);
  if (!memo.has(url)) {
    net.live += 1;
    memo.set(url, (async () => {
      const r = await realFetch(input, init);
      const body = await r.text();
      if (/host not in allowlist/i.test(body)) net.refused = true;
      const headers = [...r.headers.entries()].filter(([k]) => !/^content-(encoding|length)$/i.test(k));
      return { status: r.status, statusText: r.statusText, headers, body };
    })().catch(err => { net.failed += 1; memo.delete(url); throw err; }));
  } else {
    net.memo += 1;
  }
  const c = await memo.get(url);
  return new Response(c.body, { status: c.status, statusText: c.statusText, headers: c.headers });
};

const { w, ps } = await import(pathToFileURL(LIB).href);
const ref = await import(pathToFileURL(REF).href);

const client = readLf('src/integrations/supabase/client.ts');
const DB_URL = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const DB_KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
async function rest(query, extraHeaders = {}) {
  const r = await fetch(`${DB_URL}/rest/v1/${query}`, { headers: { apikey: DB_KEY, authorization: `Bearer ${DB_KEY}`, ...extraHeaders } });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 80)}`);
  return { body: JSON.parse(text), range: r.headers.get('content-range') };
}
async function restAll(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { body } = await rest(`${query}&offset=${from}&limit=1000`);
    out.push(...body);
    if (body.length < 1000) break;
  }
  return out;
}
const unreachable = why => {
  console.error(`the database could not be reached: ${String(why).slice(0, 160)}`);
  console.error('DATABASE UNREACHABLE. NOTHING WAS CHECKED.');
  console.error('This harness reads the live database, so it can only run where egress to it is open (the desktop lane).');
  process.exit(1);
};

let data;
try {
  data = await w.fetchWhoAmIPool();
} catch (err) {
  unreachable(err);
}
if (!data || net.refused) {
  try { await rest('player_market_values?select=id&limit=1'); } catch (err) { unreachable(err); }
  console.error('  FAIL: the Who Am I pool did not load although the database answers');
  process.exit(1);
}
const pool = data.pool;
console.log(`pool ${pool.length} players (${pool.filter(p => p.year === w.NEWEST_LIST_YEAR).length} on the ${w.NEWEST_LIST_YEAR} list), club history for ${data.clubHistory.size}`);
/* Measured 600 on 2026-09-28. A floor that says "the real pool loaded". */
if (pool.length < 300) { section = 1; fail(`the pool came back with ${pool.length} players, too few to be the real pool`); }

/* Every row under every pool spelling, read here, not through the lib. */
const spellings = [...new Set(pool.map(p => p.name))];
const rowsBySpelling = new Map();
try {
  for (let i = 0; i < spellings.length; i += 40) {
    const inList = spellings.slice(i, i + 40).map(n => `"${n.replaceAll('"', '')}"`).join(',');
    const rows = await restAll(`player_market_values?select=id,player_name,club,position,age,year,market_value_usd,person_key&player_name=in.(${encodeURIComponent(inList)})&order=id.asc`);
    for (const r of rows) {
      const k = (r.player_name ?? '').trim();
      if (!rowsBySpelling.has(k)) rowsBySpelling.set(k, []);
      rowsBySpelling.get(k).push(r);
    }
  }
} catch (err) {
  unreachable(err);
}

/* Small concurrency pool for the per-player searches. */
async function eachLimited(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

/* ------------------------------------------------------------------ */
section = 1;
console.log('\n1) the search tells namesakes apart, and the judge agrees');
{
  let keyed = null;
  try {
    const { range } = await rest('player_market_values?select=id&person_key=not.is.null&limit=1', { Prefer: 'count=exact' });
    keyed = Number((range ?? '').split('/')[1]);
  } catch (err) { unreachable(err); }
  console.log(`   rows carrying a person_key: ${keyed}, so ${keyed > 0 ? 'some' : 'no'} pool collision can map to more than one person_key; the spelling is the identity the table holds`);

  let notOffered = 0, lost = 0, namesakeWins = 0, lookupFailed = 0, collided = 0, rowsShared = 0, badHint = 0;
  const firsts = {};
  const note = (k, m) => { if (!firsts[k]) firsts[k] = m; };
  await eachLimited(pool, 6, async secret => {
    const res = await ps.searchPlayers({ source: ps.SOCCER_MARKET_VALUE_SOURCE, query: secret.name, minChars: 2, limit: 8 });
    if (res.error) { lookupFailed += 1; note('lookup', `${secret.name}: ${res.error}`); return; }
    const same = res.results.filter(e => ps.normalizeName(e.name) === ps.normalizeName(secret.name));
    if (same.length > 1) {
      collided += 1;
      for (const e of same) {
        rowsShared += 1;
        /* Which man: his latest row, read straight from the table. */
        const own = (rowsBySpelling.get(e.rawName) ?? []).filter(r => ref.w.whoAmIPersonKey(r.player_name, r.person_key) === e.personKey);
        let latest = null;
        if (own.length) latest = own.reduce((a, b) => (b.year > a.year || (b.year === a.year && b.market_value_usd > a.market_value_usd) ? b : a));
        else {
          try {
            const { body } = await rest(`player_market_values?select=club,year,market_value_usd&player_name=eq.${encodeURIComponent(e.rawName)}&order=year.desc,market_value_usd.desc&limit=1`);
            latest = body[0] ?? null;
          } catch (err) { unreachable(err); }
        }
        const hintClub = (e.disambiguator ?? '').split(' · ')[0];
        if (!e.disambiguator || !latest || hintClub !== latest.club) {
          badHint += 1;
          note('hint', `typing "${secret.name}" offers ${e.rawName} with ${e.disambiguator ? `"${e.disambiguator}"` : 'no line saying which man he is'}, his latest row is at ${latest?.club ?? 'nowhere'}`);
        }
      }
    }
    const mine = same.find(e => e.personKey === secret.personKey);
    if (!mine) {
      notOffered += 1;
      note('offered', `typing "${secret.name}" (${secret.club}) offers ${same.map(e => `${e.rawName} (${e.meta.club})`).join(', ') || 'nobody of that name'}, never him`);
    } else {
      const g = await w.whoAmIPlayerFromEntity(mine);
      if (!g) { lookupFailed += 1; note('lookup', `${secret.name}: the guess lookup failed`); }
      else if (!w.scoreGuess(g, secret, data.clubHistory).isExact) {
        lost += 1;
        note('lost', `picking ${mine.rawName} for the secret ${secret.name} (${secret.club}) resolves to ${g.name} at ${g.club} and does not win`);
      }
    }
    for (const e of same) {
      if (e === mine) continue;
      const g = await w.whoAmIPlayerFromEntity(e);
      if (!g) { lookupFailed += 1; continue; }
      if (w.scoreGuess(g, secret, data.clubHistory).isExact) {
        namesakeWins += 1;
        note('wins', `picking ${e.rawName} (${g.club}) wins a round whose secret is ${secret.name} (${secret.club})`);
      }
    }
  });
  console.log(`   ${pool.length} pool players typed by name: ${notOffered} not offered, ${lost} offered but not winnable, ${namesakeWins} namesake wins, ${lookupFailed} lookups failed`);
  console.log(`   ${collided} pool names are shared by more than one man in the list, ${rowsShared} rows between them, ${badHint} without a line naming the latest club`);
  if (notOffered) fail(`${notOffered} pool players cannot be picked by typing their name: ${firsts.offered}`);
  if (lost) fail(`${lost} pool players are offered but picking them does not win: ${firsts.lost}`);
  if (namesakeWins) fail(`${namesakeWins} times a namesake wins in the secret's place: ${firsts.wins}`);
  if (badHint) fail(`${badHint} rows share a name without saying which man they are: ${firsts.hint}`);
  if (lookupFailed) fail(`${lookupFailed} lookups failed, so those players were not checked: ${firsts.lookup}`);
  /* Measured 3 on 2026-09-28 (Éderson, Ladislav Krejčí, Pepê). Floor at
     half, rounded up: below it the namesake half of this section would be
     checking almost nothing. */
  if (collided < 2) fail(`only ${collided} pool names are offered as more than one man, too few for this section to be testing namesakes`);
}

/* ------------------------------------------------------------------ */
section = 2;
console.log('\n2) the Past club link only through the man\'s own rows');
{
  const clubKey = ref.w.clubKey;
  const own = new Map();
  const pooledHist = new Map();
  let ownRows = 0, otherRows = 0;
  for (const p of pool) {
    const mine = new Set();
    const all = new Set();
    const cur = clubKey(p.club);
    if (cur) { mine.add(cur); all.add(cur); }
    for (const r of rowsBySpelling.get(p.name) ?? []) {
      const k = clubKey(r.club ?? '');
      if (!k) continue;
      all.add(k);
      const his = ref.w.whoAmIPersonKey(r.player_name, r.person_key) === p.personKey
        && (r.person_key || ref.w.isSameMan(p, { age: r.age, year: r.year }));
      if (his) { mine.add(k); ownRows += 1; } else otherRows += 1;
    }
    own.set(p.personKey, mine);
    pooledHist.set(p.personKey, all);
  }
  console.log(`   ${ownRows + otherRows} history rows under the pool's spellings, ${otherRows} of them another man's by the age rule`);

  const meets = (a, b) => { for (const c of a) if (b.has(c)) return true; return false; };
  let falseLib = 0, missedLib = 0, falseBase = 0, pairs = 0;
  let firstFalse = '', firstMissed = '', firstBase = '';
  for (const s of pool) {
    for (const g of pool) {
      if (s === g) continue;
      const gc = clubKey(g.club);
      if (gc !== '' && gc === clubKey(s.club)) continue;
      pairs += 1;
      const lit = w.scoreGuess(g, s, data.clubHistory).sharedClubPast;
      const ownShare = meets(own.get(g.personKey), own.get(s.personKey));
      const baseLit = meets(pooledHist.get(g.personKey), pooledHist.get(s.personKey));
      if (lit && !ownShare) { falseLib += 1; if (!firstFalse) firstFalse = `guessing ${g.name} (${g.club}) against ${s.name} (${s.club})`; }
      if (!lit && ownShare) { missedLib += 1; if (!firstMissed) firstMissed = `guessing ${g.name} (${g.club}) against ${s.name} (${s.club})`; }
      if (baseLit && !ownShare) { falseBase += 1; if (!firstBase) firstBase = `guessing ${g.name} against ${s.name}`; }
    }
  }
  console.log(`   ${pairs} ordered pool pairs not at the same club`);
  console.log(`   baseline, every row under the spelling pooled (pre-668): ${falseBase} pairs lit only through another man's rows, e.g. ${firstBase || 'none'}`);
  console.log(`   the game: ${falseLib} lit without an own-row club in common, ${missedLib} dark with one`);
  if (falseLib) fail(`${falseLib} pairs light the Past club link only through another man's rows, e.g. ${firstFalse}`);
  if (missedLib) fail(`${missedLib} pairs share a club on their own rows and the link stays dark, e.g. ${firstMissed}`);
  /* Measured 1,248 on 2026-09-28. The floor is half of it: this is what says
     the section is measuring a defect that exists in this table. */
  if (falseBase < 624) fail(`the pre-668 pooling only mislights ${falseBase} pairs, under the floor of 624 (measured 1,248), so this section may no longer be testing the defect it was written for`);
}

/* ------------------------------------------------------------------ */
section = 3;
console.log('\n3) ages say what they are');
{
  const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const pages = { 'src/pages/WhoAmI.tsx': 2, 'src/pages/ClueAuction.tsx': 1 };
  for (const [rel, minCalls] of Object.entries(pages)) {
    const code = strip(pageOverride.get(rel) ?? readLf(rel));
    const bare = code.match(/\{\s*[A-Za-z_$][\w$]*(?:\.[\w$]+)*\.age\s*\}|\$\{\s*[A-Za-z_$][\w$]*(?:\.[\w$]+)*\.age\s*\}/g) ?? [];
    const calls = occurrences(code, 'listedAgeLabel(');
    console.log(`   ${rel}: ${bare.length} bare age renders, ${calls} listedAgeLabel calls`);
    if (bare.length) fail(`${rel} renders a bare listed age as though it were today's: ${bare.join(', ')}`);
    if (calls < minCalls) fail(`${rel} calls listedAgeLabel ${calls} times, every age it shows (${minCalls}) must go through it`);
  }
  const whoAmI = strip(pageOverride.get('src/pages/WhoAmI.tsx') ?? readLf('src/pages/WhoAmI.tsx'));
  if (!whoAmI.includes('Ages are as our player list has them')) fail('Who Am I no longer tells the player that its ages are as listed');

  let unlabelled = 0, older = 0, firstBad = '';
  for (const p of pool) {
    const label = w.listedAgeLabel(p);
    const olderList = p.year > 0 && p.year < w.NEWEST_LIST_YEAR;
    if (olderList) older += 1;
    if (!label.startsWith(String(p.age)) || (olderList && !label.includes(`(${p.year} list)`))) {
      unlabelled += 1;
      if (!firstBad) firstBad = `${p.name} is listed at ${p.age} on the ${p.year} list and shows "${label}"`;
    }
  }
  console.log(`   ${pool.length} pool labels, ${older} of them from an older list and naming it`);
  if (unlabelled) fail(`${unlabelled} pool players show an age that is not their listed one or hide which list it is from: ${firstBad}`);
}

/* ------------------------------------------------------------------ */
section = 4;
console.log('\n4) ages compare on one list');
{
  let rows;
  try {
    rows = await restAll(`player_market_values?select=player_name,age,year&year=in.(${w.NEWEST_LIST_YEAR - 1},${w.NEWEST_LIST_YEAR})&age=gt.0&order=id.asc`);
  } catch (err) { unreachable(err); }
  const swept = new Set(JSON.parse(readLf('scripts/data/staleSweep2026.json')).active.map(a => a.name));
  if (CONTROL === 'listdrift') {
    const prev = new Map(rows.filter(r => r.year === w.NEWEST_LIST_YEAR - 1).map(r => [r.player_name, r.age]));
    let moved = 0;
    for (const r of rows) {
      if (r.year === w.NEWEST_LIST_YEAR && prev.has(r.player_name) && r.age !== prev.get(r.player_name)) { r.age = prev.get(r.player_name); moved += 1; }
    }
    if (!moved) { console.error('control cannot run: listdrift moved no 2026 age'); process.exit(2); }
    console.log(`   NEGATIVE CONTROL: ${moved} ages on the ${w.NEWEST_LIST_YEAR} list moved back onto the ${w.NEWEST_LIST_YEAR - 1} ones`);
  }
  const byName = new Map();
  for (const r of rows) {
    if (swept.has(r.player_name)) continue;
    if (!byName.has(r.player_name)) byName.set(r.player_name, { a: [], b: [] });
    byName.get(r.player_name)[r.year === w.NEWEST_LIST_YEAR ? 'b' : 'a'].push(r.age);
  }
  let both = 0, yearOn = 0;
  for (const { a, b } of byName.values()) {
    if (a.length !== 1 || b.length !== 1) continue;
    both += 1;
    if (b[0] - a[0] === 1) yearOn += 1;
  }
  const share = both ? yearOn / both : 0;
  console.log(`   the yearly rule: ${yearOn} of ${both} players listed once on each list are exactly a year older on the newer one (${(100 * share).toFixed(1)}%)`);
  /* Measured 97.5% (3,914 of 4,013) on 2026-09-28; the rest are namesakes on
     one spelling and typing slips. The data is static between refreshes, so
     the floor guards a refresh that changes the rule, not run to run noise. */
  if (both < 2000) fail(`only ${both} players sit on both lists, too few to measure the yearly rule`);
  if (share < 0.95) fail(`only ${(100 * share).toFixed(1)}% of players are a year older on the newer list, under the 95% floor, so moving an older list's age on by a year is no longer safe`);

  const olderList = pool.filter(p => p.year > 0 && p.year < w.NEWEST_LIST_YEAR);
  const newest = pool.filter(p => p.year === w.NEWEST_LIST_YEAR);
  const onNewest = p => p.age + (w.NEWEST_LIST_YEAR - p.year);
  let pairs = 0, wrong = 0, rawWrong = 0, first = '';
  for (const a of olderList) {
    for (const b of newest) {
      for (const [s, g] of [[a, b], [b, a]]) {
        pairs += 1;
        const want = Math.sign(onNewest(s) - onNewest(g));
        const got = Math.sign(w.scoreGuess(g, s, data.clubHistory).ageDiff);
        if (got !== want) { wrong += 1; if (!first) first = `${g.name} (${g.age} on the ${g.year} list) against ${s.name} (${s.age} on the ${s.year} list) reads ${got === 0 ? 'same age' : got > 0 ? 'secret older' : 'secret younger'}`; }
        if (Math.sign(s.age - g.age) !== want) rawWrong += 1;
      }
    }
  }
  console.log(`   ${pairs} pool pairs across the two lists: raw listed ages would misread ${rawWrong}, the game misreads ${wrong}`);
  if (wrong) fail(`${wrong} pairs across the two lists get the wrong older/younger/same age reading: ${first}`);
  /* The baseline must exist, or this section compares nothing that can differ. */
  if (olderList.length === 0) fail('no pool player sits on an older list, so the cross-list comparison is untested');
  else if (rawWrong === 0) fail('raw listed ages misread no cross-list pair, so this section is not testing the defect it was written for');
}

/* ------------------------------------------------------------------ */
console.log(`\nnetwork: ${net.live} live GETs, ${net.memo} answered from the memo, ${net.failed} failed`);
if (net.refused) unreachable('the proxy refused the database host');

if (CONTROL) {
  const target = CONTROLS[CONTROL].section;
  const others = Object.entries(bySection).filter(([s, n]) => Number(s) !== target && n > 0).map(([s]) => s);
  if (bySection[target] === 0) {
    console.error(`\nCONTROL DID NOT FIRE: section ${target} stayed green with SIM_WHOAMI_NAMESAKES_CONTROL=${CONTROL}`);
    process.exit(3);
  }
  if (others.length) {
    console.error(`\nCONTROL LEAKED: ${CONTROL} also reddened section(s) ${others.join(', ')}, so it does not isolate its own check`);
    process.exit(3);
  }
  console.log(`\nCONTROL FIRED: section ${target} went red (${bySection[target]} findings) and every other section stayed green`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`\nsimWhoAmINamesakes: ${failures} findings (section 1: ${bySection[1]}, 2: ${bySection[2]}, 3: ${bySection[3]}, 4: ${bySection[4]})`);
  process.exit(1);
}
console.log('\nsimWhoAmINamesakes: all green, namesakes apart, the judge and the club history agree, ages say what they are');

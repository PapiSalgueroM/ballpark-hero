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
                  of them carried another man's clubs (Rodri the clubs of the
                  three other men the table calls Rodri, told apart by their
                  ages and positions: a centre-back born about 1985 at
                  Barcelona and Almeria, a right midfielder born about 1987 at
                  Betis, Cartagena and Guadalajara, a left midfielder born
                  about 1977 at Huesca; the Sporting Luis Suárez the
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
        the club of his own latest row (the Round 668 re-review: a later row is
        his only when a person_key says so or its listed age walks with its
        year, by the pristine isSameMan).
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

   Added by the Round 668 fix, from the adversarial review:
     1 also: no leftover "(dup)" row is offered as a player (on rows, then
        live on every "(dup)" name the table holds).
     3 also: Who Am I's age chip reads through ageReading, never a bare tie
        of ageDiff, and Clue Auction's card goes through clueAge.
     4 also: the age chip over every ordered pool pair is 'same' (the green
        check) exactly when both are listed at the same number on the same
        list. Baseline: the ties across the two lists.
     5. Clue Auction sells the bracket of the age it reveals. Synthetic cases
        that cross a bracket edge (the pristine old rule sells another bracket
        for them) and every pool player: the clue bracket must hold the number
        on the reveal card. Baseline: the pool players the newest list rule
        mis-sold.
     6. Career Ladder keeps the search's namesakes apart. Every Career Ladder
        answer (career_players) is typed through the pristine search and the
        ladder's own merge and judge: no man the search offers under that name
        is folded away, and a pick wins exactly when it is the pool man.
        Floor: 2 names shared by more than one man (measured 4).

   Added by the Round 668 re-review:
     1 also: the line under a shared name describes the man shown, never the
        latest row of a spelling several men share. Every name the table
        stores more than one way (45 on 2026-09-28, found by reading every
        row's name) goes through the game's dedupe with all its rows, and
        every line must be the club, position and year of the shown row's own
        latest row. Baseline: the spelling's latest row, the line before the
        re-review (8 of 91 lines on another man, "Cafu" the Milan right-back
        with a Portuguesa left midfielder's line). Floors: 45 lines, 4
        baseline misses.

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
   Added by the Round 668 fix, each also naming the finding it must produce:
     lostpick      the guess lookup hands back a folded key. Section 1 (lost).
     dupshown      "(dup)" rows are offered again. Section 1.
     nonote        the note under the guess box is gone. Section 3.
     nolistname    the age label stops naming the older list. Section 3.
     pagetie       the chip goes green on any ageDiff tie. Section 3.
     cardraw       Clue Auction's card prints secret.age. Section 3.
     samecheck     ageReading calls a cross-list tie 'same'. Section 4.
     bracketshift  the bracket is sold from the newest list age. Section 5.
     ladderfold    Career Ladder merges by folded name. Section 6.
     ladderjudge   Career Ladder judges by folded name. Section 6.
   Added by the Round 668 re-review:
     hintspelling  the line under a shared name comes from the spelling's
                   latest row again, whoever that is. Section 1.
     hintshown     the line comes from the shown row itself, his row but not
                   his latest. Section 1.
   A control that turns nothing red, turns another section red too, or turns
   its section red without the finding it names, exits 3, so it can never
   read as a pass or as the red it was meant to produce.

   Network: the live database, as simWorldXiPositions and simNoZeroFacts read
   it. Identical GET URLs are answered from a memo after the first live fetch.
   If the database cannot be reached the run says
   DATABASE UNREACHABLE. NOTHING WAS CHECKED. and exits 1 (2 under a control,
   so a run that checked nothing never reads as a control firing). A server
   error or a dropped connection is retried 3 times; a read that still fails
   makes the run NO VERDICT with the same exit codes, because the search
   quietly works from part of the data when one of its reads fails.

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
    anchor: 'if (!r.k && !isSameMan(owner, { age: r.a, year: r.y })) continue;',
    broken: '',
    note: 'the club history pools every row under the spelling again',
  },
  overstrict: {
    section: 2, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'if (!r.k && !isSameMan(owner, { age: r.a, year: r.y })) continue;',
    broken: 'if (!r.k && r.y !== owner.year) continue;',
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
  /* Added by the Round 668 fix. Each names the finding it must produce
     (`expect`), so a control proves its own check and not a neighbour's. */
  lostpick: {
    section: 1, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'resolvedCurrentRows.set(person, row ? currentRowFrom(row) : null);',
    broken: "resolvedCurrentRows.set(person, row ? { ...currentRowFrom(row), personKey: 'nm:' + normalizeName(row.player_name ?? '') } : null);",
    expect: 'offered but picking them does not win',
    note: 'the guess lookup hands back a folded key, so the man the search offered cannot win',
  },
  dupshown: {
    section: 1, file: 'src/lib/playerSearch.ts', alias: '@/lib/playerSearch',
    anchor: 'if (DUP_MARK.test(name)) return null;',
    broken: '',
    expect: '"(dup)"',
    note: 'the search offers leftover "(dup)" rows as players again',
  },
  nonote: {
    section: 3, file: 'src/pages/WhoAmI.tsx', alias: null,
    anchor: 'Ages are as our player list has them, so a birthday since makes him a bit older.',
    broken: 'Good luck.',
    expect: 'no longer tells the player',
    note: 'the note under the guess box saying ages are as listed is gone',
  },
  nolistname: {
    section: 3, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: 'return p.year > 0 && p.year < NEWEST_LIST_YEAR ? `${p.age} (${p.year} list)` : String(p.age);',
    broken: 'return String(p.age);',
    expect: 'hide which list it is from',
    note: 'the age label stops naming the older list',
  },
  pagetie: {
    section: 3, file: 'src/pages/WhoAmI.tsx', alias: null,
    anchor: "age === 'none' ? 'miss' : age === 'same' ? 'hit' : Math.abs(b.ageDiff) <= 3 ? 'near' : 'miss',",
    broken: "age === 'none' ? 'miss' : b.ageDiff === 0 ? 'hit' : Math.abs(b.ageDiff) <= 3 ? 'near' : 'miss',",
    expect: 'green on a tie',
    note: 'the age chip goes green on any tie again, whatever the two lists say',
  },
  cardraw: {
    section: 3, file: 'src/pages/ClueAuction.tsx', alias: null,
    anchor: '{clueAge(secret).label}',
    broken: '{secret.age}',
    expect: 'ClueAuction.tsx',
    note: 'the Clue Auction reveal card prints the bare age instead of clueAge',
  },
  samecheck: {
    section: 4, file: 'src/lib/whoAmI.ts', alias: '@/lib/whoAmI',
    anchor: "return guess.age === secret.age && guess.year === secret.year ? 'same' : 'level';",
    broken: "return 'same';",
    expect: 'green check',
    note: 'the age chip calls a cross-list tie the same listed age',
  },
  bracketshift: {
    section: 5, file: 'src/lib/clueAuction.ts', alias: '@/lib/clueAuction',
    anchor: 'ageBracket: clueAge(secret).bracket,',
    broken: 'ageBracket: ageBracket(secret.age + Math.max(0, 2026 - (secret.year || 2026))),',
    expect: 'sells a bracket that leaves out',
    note: 'the age bracket is sold from the newest list age again while the card shows the listed one',
  },
  ladderfold: {
    section: 6, file: 'src/lib/careerLadder.ts', alias: '@/lib/careerLadder',
    anchor: 'const isPoolMan = poolName !== undefined && (!e.disambiguator || storedSpelling(e.rawName) === storedSpelling(poolName));',
    broken: 'const isPoolMan = poolName !== undefined;',
    expect: 'folds away',
    note: 'Career Ladder merges the search rows by folded name again',
  },
  ladderjudge: {
    section: 6, file: 'src/lib/careerLadder.ts', alias: '@/lib/careerLadder',
    anchor: 'return normalizeName(name) === normalizeName(answer) && poolNames.includes(name);',
    broken: 'return normalizeName(name) === normalizeName(answer);',
    expect: 'judge',
    note: 'Career Ladder judges by folded name alone, so a namesake wins',
  },
  /* Added by the Round 668 re-review. */
  hintspelling: {
    section: 1, file: 'src/lib/playerSearch.ts', alias: '@/lib/playerSearch',
    anchor: "const hint = disambiguatorFor(ownLatestRow(e.raw, e.rows, e.personKey?.startsWith('pk:') === true));",
    broken: 'const hint = disambiguatorFor(ownLatestRow(e.raw, e.rows, true));',
    expect: 'describe another man',
    note: 'the line under a shared name comes from the spelling\'s latest row again, whoever that is',
  },
  hintshown: {
    section: 1, file: 'src/lib/playerSearch.ts', alias: '@/lib/playerSearch',
    anchor: "const hint = disambiguatorFor(ownLatestRow(e.raw, e.rows, e.personKey?.startsWith('pk:') === true));",
    broken: 'const hint = disambiguatorFor(e.raw);',
    expect: 'not the shown man\'s latest row',
    note: 'the line under a shared name comes from the shown row itself, his but not his latest',
  },
};
const CONTROL = process.env.SIM_WHOAMI_NAMESAKES_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_WHOAMI_NAMESAKES_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
const failMessages = [];
const fail = m => { failures += 1; bySection[section] += 1; failMessages.push({ section, m }); console.error('  FAIL: ' + m); };

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
  fs.writeFileSync(entry, `export * as w from '@/lib/whoAmI';\nexport * as ps from '@/lib/playerSearch';\nexport * as ca from '@/lib/clueAuction';\nexport * as cl from '@/lib/careerLadder';\n`);
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
/* Round 668 fix: a server error (a statement timeout while other lanes load
   the database) is retried, and one that outlasts the retries is never
   memoised and makes the run no verdict (see the end). searchPlayers answers
   from its prominence leg alone when its name leg errors, so a timeout there
   once read as "typing Kevin offers nobody of that name" and reddened a
   section no control had touched. */
const RETRIES = 3;
const net = { live: 0, memo: 0, failed: 0, refused: false, retried: 0, serverErrors: 0 };
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  if (method !== 'GET') return realFetch(input, init);
  if (!memo.has(url)) {
    net.live += 1;
    memo.set(url, (async () => {
      for (let attempt = 0; ; attempt++) {
        let r, body;
        try {
          r = await realFetch(input, init);
          body = await r.text();
        } catch (err) {
          /* A dropped connection is retried the same way; only the last
             attempt's error reaches the caller (and counts as failed). */
          if (attempt >= RETRIES || (err && err.name === 'AbortError')) throw err;
          net.retried += 1;
          await new Promise(res => setTimeout(res, 1500 * (attempt + 1)));
          continue;
        }
        if (r.status >= 500 && attempt < RETRIES) {
          net.retried += 1;
          await new Promise(res => setTimeout(res, 1500 * (attempt + 1)));
          continue;
        }
        if (/host not in allowlist/i.test(body)) net.refused = true;
        if (r.status >= 500) { net.serverErrors += 1; memo.delete(url); }
        const headers = [...r.headers.entries()].filter(([k]) => !/^content-(encoding|length)$/i.test(k));
        return { status: r.status, statusText: r.statusText, headers, body };
      }
    })().catch(err => { net.failed += 1; memo.delete(url); throw err; }));
  } else {
    net.memo += 1;
  }
  const c = await memo.get(url);
  return new Response(c.body, { status: c.status, statusText: c.statusText, headers: c.headers });
};

const { w, ps, ca, cl } = await import(pathToFileURL(LIB).href);
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
/* Under a control, a run that checked nothing exits 2 (the control could not
   run), never 1, so a database timeout can never read as the red the control
   was meant to produce. */
const nothingCheckedExit = () => process.exit(CONTROL ? 2 : 1);
const unreachable = why => {
  console.error(`the database could not be reached: ${String(why).slice(0, 160)}`);
  console.error('DATABASE UNREACHABLE. NOTHING WAS CHECKED.');
  console.error('This harness reads the live database, so it can only run where egress to it is open (the desktop lane).');
  if (CONTROL) console.error(`control cannot run: ${CONTROL} checked nothing, rerun it`);
  nothingCheckedExit();
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
  if (CONTROL) console.error(`control cannot run: ${CONTROL} checked nothing, rerun it`);
  nothingCheckedExit();
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

/* Round 668 re-review: which table rows are the man a search result shows.
   The shown row is the result's meta (the row the search kept). A row is his
   when it is that row, when a person_key put it under his key, or when both
   list an age and it walks with the year by the pristine isSameMan. A row
   that proves neither is not his. The line under a shared name must be the
   club, position and year of his latest such row. */
const lineOf = r => [r.club, r.position, r.year].filter(v => v !== undefined && v !== null && v !== '').map(String).join(' · ');
const latestRow = rows => rows.reduce((a, b) => (b.year > a.year || (b.year === a.year && Number(b.market_value_usd) > Number(a.market_value_usd)) ? b : a));
function rowsOfShownMan(e, ownRows) {
  const s = { age: Number(e.meta.age) || 0, year: Number(e.meta.year) || 0 };
  const isShown = r => (r.club ?? undefined) === e.meta.club && r.year === e.meta.year && r.market_value_usd === e.meta.value
    && (r.position ?? undefined) === e.meta.position && (r.age ?? undefined) === e.meta.age;
  return ownRows.filter(r => isShown(r) || String(e.personKey ?? '').startsWith('pk:')
    || (s.age > 0 && s.year > 0 && r.age > 0 && r.year > 0 && ref.ps.isSameMan(s, { age: r.age, year: r.year })));
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
        /* Which man: the shown row's own latest row (the Round 668 re-review),
           read straight from the table. */
        let spellingRows = rowsBySpelling.get(e.rawName);
        if (!spellingRows) {
          try {
            spellingRows = await restAll(`player_market_values?select=id,player_name,club,position,age,year,market_value_usd,person_key&player_name=eq.${encodeURIComponent(e.rawName)}&order=id.asc`);
          } catch (err) { unreachable(err); }
        }
        const his = rowsOfShownMan(e, spellingRows.filter(r => ref.w.whoAmIPersonKey(r.player_name, r.person_key) === e.personKey));
        const latest = his.length ? latestRow(his) : null;
        const hintClub = (e.disambiguator ?? '').split(' · ')[0];
        if (!e.disambiguator || !latest || hintClub !== (latest.club ?? '')) {
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
  console.log(`   ${collided} pool names are shared by more than one man in the list, ${rowsShared} rows between them, ${badHint} without a line naming his own latest club`);
  if (notOffered) fail(`${notOffered} pool players cannot be picked by typing their name: ${firsts.offered}`);
  if (lost) fail(`${lost} pool players are offered but picking them does not win: ${firsts.lost}`);
  if (namesakeWins) fail(`${namesakeWins} times a namesake wins in the secret's place: ${firsts.wins}`);
  if (badHint) fail(`${badHint} rows share a name without a line naming his own latest club: ${firsts.hint}`);
  if (lookupFailed) fail(`${lookupFailed} lookups failed, so those players were not checked: ${firsts.lookup}`);
  /* Measured 3 on 2026-09-28 (Éderson, Ladislav Krejčí, Pepê). Floor at
     half, rounded up: below it the namesake half of this section would be
     checking almost nothing. */
  if (collided < 2) fail(`only ${collided} pool names are offered as more than one man, too few for this section to be testing namesakes`);

  /* Round 668 fix: a leftover "(dup)" row is never offered as a player. Run
     on rows first (so the check holds whatever the table still carries), then
     live on every "(dup)" name the table holds (15 on 2026-09-28, "Pepê (dup)"
     among them, each the exact twin of a row under the plain name). */
  const isDup = e => /\(\s*dup\s*\)/i.test(e.rawName ?? e.name ?? '');
  const pepeRows = [
    { player_name: 'Pepê', club: 'Grêmio Foot-Ball Porto Alegrense', position: 'Central Midfield', market_value_usd: 3000000, year: 2023, age: 24, person_key: null },
    { player_name: 'Pepê (dup)', club: 'Grêmio Foot-Ball Porto Alegrense', position: 'Central Midfield', market_value_usd: 3000000, year: 2023, age: 24, person_key: null },
  ];
  let dupShown = ps.dedupeAndRank([pepeRows], ps.SOCCER_MARKET_VALUE_SOURCE, ps.normalizeName('pepe'), { limit: 8 }).filter(isDup).length;
  let dupNames = [];
  try {
    dupNames = [...new Set((await restAll('player_market_values?select=player_name&player_name=ilike.*(dup)*&order=id.asc')).map(r => r.player_name))];
  } catch (err) { unreachable(err); }
  let firstDup = dupShown ? 'the rows "Pepê" and "Pepê (dup)" give a "(dup)" result' : '';
  for (const dn of dupNames) {
    const base = dn.replace(/\s*\(\s*dup\s*\)\s*$/i, '');
    const res = await ps.searchPlayers({ source: ps.SOCCER_MARKET_VALUE_SOURCE, query: base, minChars: 2, limit: 8 });
    if (res.error) { fail(`typing "${base}" failed (${res.error}), so its "(dup)" row was not checked`); continue; }
    const shown = res.results.filter(isDup);
    dupShown += shown.length;
    if (shown.length && !firstDup) firstDup = `typing "${base}" offers "${shown[0].rawName}"`;
  }
  console.log(`   leftover "(dup)" rows: ${dupNames.length} in the table, ${dupShown} offered as players (pure rows plus a search for each)`);
  if (dupShown) fail(`${dupShown} "(dup)" rows are offered as players: ${firstDup}`);

  /* Round 668 re-review: the line under a shared name describes the man
     shown, over every name the table stores more than one way, not only the
     pool's. Every row's name is read (keyset pages of 1,000), the names are
     folded with the pristine normalizeName, and every folded name with more
     than one stored spelling has all its rows put through the game's own
     dedupe. Each line must be his own latest row (rowsOfShownMan above). The
     baseline is the line before the re-review, the latest row under the
     spelling whoever that is. */
  const allNames = [];
  try {
    for (let last = 0; ;) {
      const { body } = await rest(`player_market_values?select=id,player_name&id=gt.${last}&order=id.asc&limit=1000`);
      for (const r of body) allNames.push(r.player_name ?? '');
      if (body.length < 1000) break;
      last = body[body.length - 1].id;
    }
  } catch (err) { unreachable(err); }
  const spellingsByFold = new Map();
  for (const n of allNames) {
    const f = ref.ps.normalizeName(n);
    if (!f) continue;
    if (!spellingsByFold.has(f)) spellingsByFold.set(f, new Set());
    spellingsByFold.get(f).add(n);
  }
  const multi = [...spellingsByFold].filter(([, s]) => new Set([...s].map(ref.ps.storedSpelling)).size > 1);
  const multiRaw = [...new Set(multi.flatMap(([, s]) => [...s]))];
  const rowsByRaw = new Map();
  try {
    for (let i = 0; i < multiRaw.length; i += 30) {
      const inList = multiRaw.slice(i, i + 30).map(n => `"${n.replaceAll('"', '')}"`).join(',');
      for (const r of await restAll(`player_market_values?select=id,player_name,club,position,age,year,market_value_usd,person_key&player_name=in.(${encodeURIComponent(inList)})&order=id.asc`)) {
        if (!rowsByRaw.has(r.player_name)) rowsByRaw.set(r.player_name, []);
        rowsByRaw.get(r.player_name).push(r);
      }
    }
  } catch (err) { unreachable(err); }
  const identity = ref.ps.SOCCER_MARKET_VALUE_SOURCE.identity;
  let lines = 0, noLine = 0, otherMan = 0, notLatest = 0, baseOtherMan = 0;
  let firstOther = '', firstNotLatest = '', firstNoLine = '', firstBase = '';
  for (const [f, spellingSet] of multi) {
    const rows = [...spellingSet].flatMap(n => rowsByRaw.get(n) ?? []);
    const res = ps.dedupeAndRank([rows], ps.SOCCER_MARKET_VALUE_SOURCE, f, { limit: 100 });
    if (res.length < 2) continue;
    for (const e of res) {
      const shownAs = `${e.rawName} (${e.meta.club}, ${e.meta.position}, ${e.meta.year}, listed ${e.meta.age})`;
      if (!e.disambiguator) { noLine += 1; if (!firstNoLine) firstNoLine = shownAs; continue; }
      lines += 1;
      const own = rows.filter(r => ref.ps.personKeyOf(identity, r.player_name, r.person_key) === e.personKey);
      const his = rowsOfShownMan(e, own);
      if (!his.some(r => lineOf(r) === e.disambiguator)) {
        otherMan += 1;
        if (!firstOther) firstOther = `${shownAs} carries "${e.disambiguator}"`;
      } else if (his.length && e.disambiguator !== lineOf(latestRow(his))) {
        notLatest += 1;
        if (!firstNotLatest) firstNotLatest = `${shownAs} carries "${e.disambiguator}", his latest row says "${lineOf(latestRow(his))}"`;
      }
      if (own.length && !his.some(r => lineOf(r) === lineOf(latestRow(own)))) {
        baseOtherMan += 1;
        if (!firstBase) firstBase = `${shownAs} would carry "${lineOf(latestRow(own))}"`;
      }
    }
  }
  console.log(`   every name the table stores more than one way: ${allNames.length} rows read, ${multi.length} such names, ${lines} lines under a shared name`);
  console.log(`   baseline, the line from the spelling's latest row (before the re-review): ${baseOtherMan} lines on another man, e.g. ${firstBase || 'none'}`);
  console.log(`   the game: ${otherMan} lines on another man, ${notLatest} on his row but not his latest, ${noLine} shared names with no line`);
  if (otherMan) fail(`${otherMan} lines under a shared name describe another man than the row shown: ${firstOther}`);
  if (notLatest) fail(`${notLatest} lines under a shared name are not the shown man's latest row: ${firstNotLatest}`);
  if (noLine) fail(`${noLine} results share a name with no line saying which man they are: ${firstNoLine}`);
  /* Measured 91 lines and 8 baseline misses on 2026-09-28. The floors are
     half: below them this check is no longer testing the defect it was
     written for. */
  if (lines < 45) fail(`only ${lines} lines under a shared name, under the floor of 45 (measured 91), so too few namesakes are being checked`);
  if (baseOtherMan < 4) fail(`the spelling's latest row puts only ${baseOtherMan} lines on another man, under the floor of 4 (measured 8), so this check may no longer be testing the defect it was written for`);
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
  /* Clue Auction's card goes through clueAge (Round 668 fix), which labels
     with listedAgeLabel and is also where its bracket clue comes from. */
  const pages = { 'src/pages/WhoAmI.tsx': ['listedAgeLabel(', 2], 'src/pages/ClueAuction.tsx': ['clueAge(', 1] };
  for (const [rel, [via, minCalls]] of Object.entries(pages)) {
    const code = strip(pageOverride.get(rel) ?? readLf(rel));
    const bare = code.match(/\{\s*[A-Za-z_$][\w$]*(?:\.[\w$]+)*\.age\s*\}|\$\{\s*[A-Za-z_$][\w$]*(?:\.[\w$]+)*\.age\s*\}/g) ?? [];
    const calls = occurrences(code, via);
    console.log(`   ${rel}: ${bare.length} bare age renders, ${calls} ${via.slice(0, -1)} calls`);
    if (bare.length) fail(`${rel} renders a bare listed age as though it were today's: ${bare.join(', ')}`);
    if (calls < minCalls) fail(`${rel} calls ${via.slice(0, -1)} ${calls} times, every age it shows (${minCalls}) must go through it`);
  }
  const whoAmI = strip(pageOverride.get('src/pages/WhoAmI.tsx') ?? readLf('src/pages/WhoAmI.tsx'));
  if (!whoAmI.includes('Ages are as our player list has them')) fail('Who Am I no longer tells the player that its ages are as listed');
  /* Round 668 fix: the age chip's colour, mark and tooltip come from
     ageReading, never from a bare tie of ageDiff, which is level across two
     lists whose listed numbers differ by a year. */
  const tieTests = whoAmI.match(/ageDiff\s*[!=]==?\s*0|0\s*[!=]==?\s*[\w.]*ageDiff|!\s*[\w.]*ageDiff\b/g) ?? [];
  const readings = occurrences(whoAmI, 'ageReading(');
  console.log(`   src/pages/WhoAmI.tsx: ${readings} ageReading calls, ${tieTests.length} bare ageDiff ties`);
  if (tieTests.length) fail(`Who Am I's age chip goes green on a tie of ageDiff (${tieTests.join(', ')}), which is level across lists whose listed ages differ`);
  if (readings < 1) fail('Who Am I does not read its age chip through ageReading');

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

  /* Round 668 fix: what the age chip says (ageReading). Over every ordered
     pool pair it must be 'same' (the green check) exactly when both are
     listed at the same number on the same list, 'level' on any other tie,
     and older or younger by the newest list reading otherwise. The baseline
     is how many ties cross the two lists, each of which the round's first
     build marked with a green check and "Same listed age". */
  let readWrong = 0, crossTies = 0, sameTies = 0, firstRead = '';
  for (const s of pool) {
    for (const g of pool) {
      if (s === g) continue;
      const got = w.ageReading(g, s, w.scoreGuess(g, s, data.clubHistory).ageDiff);
      const d = Math.sign(onNewest(s) - onNewest(g));
      const sameListed = g.age === s.age && g.year === s.year;
      const want = !(g.age > 0) || !(s.age > 0) ? 'none' : d > 0 ? 'older' : d < 0 ? 'younger' : sameListed ? 'same' : 'level';
      if (want === 'level') crossTies += 1;
      if (want === 'same') sameTies += 1;
      if (got !== want) {
        readWrong += 1;
        if (!firstRead) firstRead = `${g.name} (${w.listedAgeLabel(g)}) against ${s.name} (${w.listedAgeLabel(s)}) reads ${got}, should be ${want}`;
      }
    }
  }
  console.log(`   the age chip over every pool pair: ${sameTies} same listed age, ${crossTies} ties across the two lists (the baseline the first build marked green), ${readWrong} read wrong`);
  if (readWrong) fail(`${readWrong} pairs get the wrong age chip, a green check on two different listed ages among them: ${firstRead}`);
  if (crossTies === 0) fail('no pool pair ties across the two lists, so the chip\'s cross-list reading is untested');
}

/* ------------------------------------------------------------------ */
section = 5;
console.log('\n5) Clue Auction sells the bracket of the age it reveals');
{
  const inBracket = (n, b) => {
    if (b === 'Under 21') return n <= 20;
    if (b === '33 or older') return n >= 33;
    const m = /^(\d+) to (\d+)$/.exec(b ?? '');
    return !!m && n >= Number(m[1]) && n <= Number(m[2]);
  };
  const older = w.NEWEST_LIST_YEAR - 1;
  const synth = (age, year) => ({ name: `Edge ${age} ${year}`, nationality: 'Italy', position: 'Centre-Forward', club: 'SSC Napoli', value: 30000000, age, year, personKey: `sp:Edge ${age} ${year}` });
  /* Listed 24, 20, 28 and 32 on the older list sit on a bracket edge, so a
     year added crosses it (Raspadori was 24 on the 2025 list). The pristine
     yardstick proves the case crosses: the old rule sells another bracket. */
  const edges = [synth(24, older), synth(20, older), synth(28, older), synth(32, older), synth(24, w.NEWEST_LIST_YEAR)];
  const crossing = edges.filter(p => !inBracket(p.age, ref.ca.ageBracket(ref.w.ageOnNewestList(p)))).length;
  if (crossing === 0) fail('no synthetic case crosses a bracket edge, so this section proves nothing');
  const display = ca.buildClubDisplayMap(pool);
  let bad = 0, first = '', poolBase = 0, firstBase = '';
  for (const p of [...edges, ...pool]) {
    const shown = ca.clueAge(p);
    const sold = ca.buildClueReveals(p, data.clubHistory.get(p.personKey), display).ageBracket;
    const n = Number.parseInt(shown.label, 10);
    if (!(n > 0) || !inBracket(n, sold)) {
      bad += 1;
      if (!first) first = `${p.name}: the card shows "${shown.label}" and the clue sold "${sold}"`;
    }
  }
  for (const p of pool) {
    if (!inBracket(p.age, ref.ca.ageBracket(ref.w.ageOnNewestList(p)))) {
      poolBase += 1;
      if (!firstBase) firstBase = `${p.name} (${w.listedAgeLabel(p)})`;
    }
  }
  console.log(`   ${edges.length} edge cases (${crossing} crossing an edge by the old rule) and ${pool.length} pool players: ${bad} sold a bracket that leaves out the revealed age`);
  console.log(`   baseline, the bracket from the newest list age (the round's first build): ${poolBase} pool players mis-sold, e.g. ${firstBase || 'none today'}`);
  if (bad) fail(`${bad} secrets: the clue sells a bracket that leaves out the age the card reveals: ${first}`);
}

/* ------------------------------------------------------------------ */
section = 6;
console.log('\n6) Career Ladder keeps the search\'s namesakes apart');
{
  /* The search here is the pristine one (ref): this section tests the
     ladder's merge and judge, not the search, and a search control must not
     reach it. */
  let ladderPool;
  try {
    ladderPool = (await restAll('career_players?select=player_name&order=id.asc')).map(r => String(r.player_name ?? '')).filter(n => n.length > 0);
  } catch (err) { unreachable(err); }
  const fold = ref.cl.normalizeName;
  let shared = 0, foldedAway = 0, judgeWrong = 0, lookupFailed = 0;
  let firstFolded = '', firstJudge = '', firstLookup = '';
  const sharedNames = [];
  await eachLimited(ladderPool, 6, async P => {
    const res = await ref.ps.searchPlayers({ source: ref.ps.SOCCER_MARKET_VALUE_SOURCE, query: P, minChars: 2, limit: 12 });
    if (res.error) { lookupFailed += 1; if (!firstLookup) firstLookup = `${P}: ${res.error}`; return; }
    const f = fold(P);
    const men = new Set(res.results.filter(e => fold(e.name) === f).map(e => e.personKey ?? e.key));
    const rows = cl.ladderSuggestions(ladderPool, res.results, P, []).filter(s => fold(s.name) === f);
    if (men.size > 1) {
      shared += 1;
      sharedNames.push(`${P} (${men.size} men, ${rows.length} rows)`);
      if (rows.length < men.size) {
        foldedAway += 1;
        if (!firstFolded) firstFolded = `typing "${P}": the search offers ${men.size} men under that name, the ladder ${rows.length} (${rows.map(s => s.name).join(', ')})`;
      }
    }
    /* A pick wins exactly when it is the pool man, and the pool man is offered. */
    const poolRow = rows.find(s => ladderPool.includes(s.name));
    const wrongHere = rows.filter(s => cl.ladderGuessWins(s.name, P, ladderPool) !== (s === poolRow)).length + (poolRow ? 0 : 1);
    if (wrongHere) {
      judgeWrong += 1;
      if (!firstJudge) firstJudge = `typing "${P}": ${poolRow ? rows.filter(s => s !== poolRow && cl.ladderGuessWins(s.name, P, ladderPool)).map(s => `${s.name}${s.hint ? ` (${s.hint})` : ''}`).join(', ') + ' wins in his place' : 'the pool man is not offered'}`;
    }
  });
  console.log(`   ${ladderPool.length} Career Ladder answers typed by name: ${shared} are shared by more than one man in the search, ${foldedAway} of those fold a man away, ${judgeWrong} judged wrong, ${lookupFailed} lookups failed`);
  console.log(`   shared: ${sharedNames.sort().join('; ') || 'none'}`);
  if (foldedAway) fail(`${foldedAway} Career Ladder names: the suggestion list folds away a man the search offered: ${firstFolded}`);
  if (judgeWrong) fail(`${judgeWrong} Career Ladder names: the judge lets a namesake win or cannot be won by the pool man: ${firstJudge}`);
  if (lookupFailed) fail(`${lookupFailed} Career Ladder lookups failed, so those names were not checked: ${firstLookup}`);
  /* Four of the 253 answers share their folded name with another man in the
     table (Raúl, Ederson, Pepe, Cafu, 2026-09-28); the search's first 12 hold
     more than one man for 3 of them (Cafu, Ederson, Pepe; for Raúl they hold
     one). Floor at 2. */
  if (shared < 2) fail(`only ${shared} Career Ladder names are shared by more than one man in the search, too few for this section to be testing namesakes`);
}

/* ------------------------------------------------------------------ */
console.log(`\nnetwork: ${net.live} live GETs, ${net.memo} answered from the memo, ${net.retried} retried after a server error or a dropped connection, ${net.serverErrors} still a server error and ${net.failed} still failing after ${RETRIES} retries`);
if (net.refused) unreachable('the proxy refused the database host');
/* A read that never came back leaves the game code working from part of the
   data (the search silently drops its name leg), so red or green, the run is
   no verdict. Rerun it when the database is quieter. */
if (net.serverErrors || net.failed) {
  console.error(`\nNO VERDICT: ${net.serverErrors + net.failed} database reads never answered, so the game code ran on part of the data. Rerun.`);
  if (CONTROL) console.error(`control cannot run: ${CONTROL} ran on part of the data, rerun it`);
  nothingCheckedExit();
}

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
  const want = CONTROLS[CONTROL].expect;
  if (want && !failMessages.some(f => f.section === target && f.m.includes(want))) {
    console.error(`\nCONTROL MISSED ITS CHECK: section ${target} went red, but no finding says "${want}", so ${CONTROL} did not prove the check it was written for`);
    process.exit(3);
  }
  console.log(`\nCONTROL FIRED: section ${target} went red (${bySection[target]} findings) and every other section stayed green`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`\nsimWhoAmINamesakes: ${failures} findings (${Object.entries(bySection).map(([s, n]) => `section ${s}: ${n}`).join(', ')})`);
  process.exit(1);
}
console.log('\nsimWhoAmINamesakes: all green, namesakes apart and each line describes the man shown, the judge and the club history agree, ages say what they are, Clue Auction sells the age it reveals, Career Ladder keeps namesakes apart');

/**
 * simSportsFacts: Round 660. The hand typed facts in seven game files are pinned
 * to a verification record, and nothing ships that the record does not hold.
 *
 * WHY THIS EXISTS. The 2026-09-19 data audit found the Combat Chain accepting
 * fights that never happened (Aspinall "beat" Jones at UFC 313; they never
 * fought, and UFC 313 was Pereira v Ankalaev) and fights that went the other
 * way, UFC records a year out of date, F1 win counts that were a season stale,
 * Olympic medal totals that contradicted the athlete's own clue, and Bobby Jones
 * with five majors instead of seven. Every one of those files was hand typed and
 * none carried a source. Round 660 checked each fact against two independent
 * sources (one official, one independent, Wikipedia never one of them) and wrote
 * what it found to scripts/data/sportsFactsVerified2026-09.json with the URLs
 * and the date. This harness holds the shipped files to that record.
 *
 * WHAT IT CHECKS. Each section loads the shipped module itself (bundled with
 * esbuild, so it reads the values the game reads, not a regex over the text)
 * and compares it with the record, both ways: a shipped fact the record does not
 * hold fails, a shipped fact that disagrees with its verified value fails, and a
 * record entry the file no longer ships fails, so the record cannot rot into a
 * list of things that used to be true.
 *
 *    1. The record itself: every fact carries at least two sources on two
 *       different hosts, at least one official for its sport and at least one
 *       that is not, none on Wikipedia, and a check date that has happened.
 *    2. UFC Guesser (src/data/ufcFighters.ts): record, birth date, nationality,
 *       last UFC division, first and latest UFC year, knockouts, submissions.
 *    3. Combat Chain fighters (src/data/ufcChainData.ts UFC_FIGHTERS): record,
 *       a chain division the fighter really fought in, Hall of Fame flag.
 *    4. Combat Chain links (FIGHT_RESULTS): every link the chain accepts is a
 *       verified fight with the right winner, loser, event, year, method,
 *       round, time and title flag.
 *    5. F1 drivers (src/data/f1Drivers.ts): every clue, word for word.
 *    6. F1 constructors (src/data/f1Constructors.ts): every clue, word for word.
 *    7. Perfect Lineup F1 pool (src/data/f1PerfectLineupPool.ts): the team,
 *       era and nationality every card shows.
 *    8. The Medal Games (src/data/olympicsAthletes.ts): every field shown.
 *    9. Golf legends (src/data/golfLegends.ts): majors, first and last win,
 *       nationality and the majors won.
 *   10. The golf placeholder rows: public.golf_majors stores a single dash
 *       character (U+2014) for years a major was not played. Every read of that table in src and
 *       supabase/functions must go through the List Quiz's onlyNames filter,
 *       the four golf lists fetched through the real fetch closures (against a
 *       stub that serves dash rows) must return no dash, and no golfer in
 *       golfLegends may be a dash.
 *
 * Nothing here touches the network: section 10 stubs the database client.
 *
 * NEGATIVE CONTROLS (SPORTS_FACTS_CONTROL). Each edits only an in memory copy,
 * refuses to run if its anchor is missing or the edit changed nothing, and must
 * turn exactly its own section red. Under a control the harness exits 1 when
 * exactly the predicted section is red (the break was caught) and 2 when it is
 * not (the control proves nothing).
 *   onesource      one fact in the record loses its second source         section 1
 *   ufcfighter     one UFC Guesser fighter's win count changes            section 2
 *   chainfighter   one chain fighter is flagged a Hall of Famer wrongly   section 3
 *   fakefight      the invented Aspinall over Jones link is put back      section 4
 *   f1driver       Verstappen's win count goes back to 63                 section 5
 *   f1constructor  McLaren's title count goes back to 9                   section 6
 *   f1pool         Prost's card goes back to the 1990s                    section 7
 *   olympics       Biles's medal line goes back to 7, 1, 2                section 8
 *   golf           Bobby Jones goes back to 5 majors                      section 9
 *   golfdash       the Masters list reads golf_majors without onlyNames   section 10
 *
 * Run: node scripts/simSportsFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_PATH = path.join(ROOT, 'scripts/data/sportsFactsVerified2026-09.json');
const CONTROL = process.env.SPORTS_FACTS_CONTROL || '';
const EXPECT = {
  onesource: 1, ufcfighter: 2, chainfighter: 3, fakefight: 4, f1driver: 5,
  f1constructor: 6, f1pool: 7, olympics: 8, golf: 9, golfdash: 10,
};
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`SPORTS_FACTS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = (msg) => { red.add(section); failures += 1; console.error('  FAIL: ' + msg); };
const head = (n, title) => { section = n; console.log(`\n--- ${n}. ${title} ---`); };

/* A control that edits nothing proves nothing, so every edit asserts it landed. */
const rewrite = (text, from, to, what) => {
  if (!text.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} not found. The control is stale and a run would be green for the wrong reason.`);
    process.exit(2);
  }
  const out = text.replace(from, to);
  if (out === text) {
    console.error(`CONTROL ${CONTROL} cannot run: rewriting ${what} changed nothing.`);
    process.exit(2);
  }
  return out;
};

// ---------------------------------------------------------------------------
// Loading the shipped modules. Each is bundled on its own, with an optional in
// memory rewrite of one source file, into a private temp directory.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simSportsFacts-'));
const norm = (p) => path.resolve(p).toLowerCase();
let bundleNo = 0;
async function loadModule(rel, overrides = {}, stubs = {}) {
  const entry = path.join(ROOT, rel);
  const outfile = path.join(TMP, `m${bundleNo++}.mjs`);
  const overrideMap = new Map(Object.entries(overrides).map(([k, v]) => [norm(path.join(ROOT, k)), v]));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'sports-facts-memory',
      setup(b) {
        for (const [spec, code] of Object.entries(stubs)) {
          const filter = new RegExp('^' + spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$');
          b.onResolve({ filter }, () => ({ path: spec, namespace: 'stub' }));
          b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: stubs[a.path], loader: 'js' }));
        }
        b.onLoad({ filter: /\.(ts|tsx)$/ }, (a) => {
          const hit = overrideMap.get(norm(a.path));
          if (hit === undefined) return undefined;
          return { contents: hit, loader: a.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(outfile).href);
}
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---------------------------------------------------------------------------
let record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));

/* Controls on shipped files: one rewritten source per control. */
const over = {};
const UFCF = 'src/data/ufcFighters.ts';
const CHAIN = 'src/data/ufcChainData.ts';
const F1D = 'src/data/f1Drivers.ts';
const F1C = 'src/data/f1Constructors.ts';
const F1P = 'src/data/f1PerfectLineupPool.ts';
const OLY = 'src/data/olympicsAthletes.ts';
const GOLF = 'src/data/golfLegends.ts';
const LISTQUIZ = 'src/lib/listQuiz.ts';

if (CONTROL === 'onesource') {
  const f = record.golf['Bobby Jones'];
  if (!Array.isArray(f?.src) || f.src.length < 2) { console.error('CONTROL onesource cannot run: Bobby Jones has no second source to drop'); process.exit(2); }
  record = structuredClone(record);
  record.golf['Bobby Jones'].src = f.src.slice(0, 1);
}
if (CONTROL === 'ufcfighter') {
  const text = src(UFCF);
  const line = text.split('\n').find(l => l.includes("{ name: 'Alex Pereira',"));
  const m = line && line.match(/wins: (\d+),/);
  if (!m) { console.error("CONTROL ufcfighter cannot run: Pereira's row with a win count not found"); process.exit(2); }
  over[UFCF] = rewrite(text, line, line.replace(m[0], `wins: ${Number(m[1]) + 1},`), "Pereira's row in the UFC Guesser");
}
if (CONTROL === 'chainfighter') {
  const text = src(CHAIN);
  const line = text.split('\n').find(l => l.includes("{ name: 'Tom Aspinall', weightClass: 'Heavyweight'"));
  if (!line || !line.includes('isHallOfFamer: false')) { console.error("CONTROL chainfighter cannot run: Aspinall's chain row with isHallOfFamer: false not found"); process.exit(2); }
  over[CHAIN] = rewrite(text, line, line.replace('isHallOfFamer: false', 'isHallOfFamer: true'), "Aspinall's chain row");
}
if (CONTROL === 'fakefight') {
  over[CHAIN] = rewrite(src(CHAIN), 'export const FIGHT_RESULTS: FightResult[] = [',
    "export const FIGHT_RESULTS: FightResult[] = [\n  { winner: 'Tom Aspinall', loser: 'Jon Jones', event: 'UFC 313', year: 2025, method: 'TKO', round: 2, time: '3:45', wasChampionshipFight: true },",
    'the FIGHT_RESULTS array');
}
if (CONTROL === 'f1driver') {
  over[F1D] = rewrite(src(F1D), "'71 race wins through the 2025 season'", "'63 race wins through the 2025 season'", "Verstappen's win clue");
}
if (CONTROL === 'f1constructor') {
  over[F1C] = rewrite(src(F1C), "'Won 10 Constructors\\' Championships'", "'Won 9 Constructors\\' Championships'", "McLaren's title clue");
}
if (CONTROL === 'f1pool') {
  over[F1P] = rewrite(src(F1P), "{ name: 'Alain Prost', team: 'McLaren', era: '1980s'", "{ name: 'Alain Prost', team: 'McLaren', era: '1990s'", "Prost's card");
}
if (CONTROL === 'olympics') {
  over[OLY] = rewrite(src(OLY), "medalSummary: '7 Gold, 2 Silver, 2 Bronze (across three Games)'",
    "medalSummary: '7 Gold, 1 Silver, 2 Bronze (across three Games)'", "Biles's medal line");
}
if (CONTROL === 'golf') {
  over[GOLF] = rewrite(src(GOLF), "{ name: 'Bobby Jones', majors: 7,", "{ name: 'Bobby Jones', majors: 5,", "Bobby Jones's row");
}
if (CONTROL === 'golfdash') {
  over[LISTQUIZ] = rewrite(src(LISTQUIZ), "fetch: () => onlyNames(col('golf_majors', 'player_name', q => q.ilike('tournament', '%masters%'))),",
    "fetch: () => col('golf_majors', 'player_name', q => q.ilike('tournament', '%masters%')),", "the Masters list fetch");
}

// ---------------------------------------------------------------------------
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; } };
const onHost = (h, list) => list.some(d => h === d || h.endsWith('.' + d));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

head(1, 'the record: two sources, two hosts, one official, one not, no Wikipedia, a real check date');
{
  const today = new Date().toISOString().slice(0, 10);
  let facts = 0;
  const noOfficial = [];
  const walk = (sport, where, node) => {
    if (node && typeof node === 'object' && !Array.isArray(node) && 'src' in node) {
      facts += 1;
      const hosts = (node.src || []).map(hostOf);
      if ((node.src || []).length < 2) return fail(`${where}: ${node.src?.length ?? 0} source(s), two are required`);
      if (hosts.some(h => !h)) return fail(`${where}: a source is not a URL`);
      if (new Set(hosts).size < 2) return fail(`${where}: both sources are on ${hosts[0]}, which is one source twice`);
      if (hosts.some(h => onHost(h, ['wikipedia.org', 'wikimedia.org']))) return fail(`${where}: Wikipedia is a spot check, never a source`);
      const official = record.officialHosts[sport];
      /* A fact may stand on two independent sources without an official one
         only when it says why: the official page was unreachable, silent, or
         wrong (ufc.com prints the Win marker on the loser for UFC 43, 52 and
         79). Those are counted and listed, never silent. */
      if (!hosts.some(h => onHost(h, official))) {
        if (typeof node.noOfficial === 'string' && node.noOfficial.length > 20) noOfficial.push(where);
        else fail(`${where}: no official source (${official.join(', ')}) and no noOfficial reason`);
      }
      if (!hosts.some(h => !onHost(h, official))) fail(`${where}: no independent source, every source is official`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(node.on || '') || node.on > today) fail(`${where}: check date "${node.on}" is missing or in the future`);
      return;
    }
    if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(sport, `${where}.${k}`, v);
  };
  const SPORT = { ufcFighters: 'ufc', ufcChain: 'ufc', fightResults: 'ufc', f1Drivers: 'f1', f1Constructors: 'f1', f1Pool: 'f1', olympics: 'olympics', golf: 'golf' };
  for (const [key, sport] of Object.entries(SPORT)) {
    if (!record[key]) { fail(`the record has no ${key} block`); continue; }
    walk(sport, key, record[key]);
  }
  if (facts < 500) fail(`only ${facts} sourced facts found in the record, so the walk is broken`);
  else console.log(`  ${facts} facts, each with two sources on two hosts and an independent one; ${facts - noOfficial.length} carry an official source`);
  if (noOfficial.length) console.log(`  ${noOfficial.length} stand on two independent sources with a stated reason: ${noOfficial.slice(0, 8).join('; ')}${noOfficial.length > 8 ? ' ...' : ''}`);
}

// ---------------------------------------------------------------------------
head(2, 'UFC Guesser: every fighter matches the verified record');
{
  const { ufcFighters } = await loadModule(UFCF, over);
  const rec = record.ufcFighters;
  const seen = new Set();
  let n = 0;
  for (const f of ufcFighters) {
    const r = rec[f.name];
    if (!r) { fail(`${f.name} ships in the UFC Guesser with no verified record`); continue; }
    seen.add(f.name); n += 1;
    const want = {
      record: r.record.v, wins: Number(r.record.v.split('-')[0]), losses: Number(r.record.v.split('-')[1]), draws: Number(r.record.v.split('-')[2]),
      birthDate: r.birthDate.v, weightClass: r.weightClass.v, yearsActive: r.yearsActive.v,
      yearsActiveStart: Number(r.yearsActive.v.split('-')[0]), yearsActiveEnd: Number(r.yearsActive.v.split('-')[1]),
      koTko: r.koTko.v, submissions: r.submissions.v,
    };
    for (const [k, v] of Object.entries(want)) {
      if (!same(f[k], v)) fail(`${f.name}: ${k} ships as ${JSON.stringify(f[k])}, verified ${JSON.stringify(v)}`);
    }
    if (f.nationality !== r.nationality.v) fail(`${f.name}: nationality ships as ${f.nationality}, verified ${r.nationality.v}`);
    if ('age' in f || 'highestP4PRank' in f) fail(`${f.name}: carries a typed age or P4P rank again; age is computed from birthDate and the P4P column was retired`);
  }
  for (const name of Object.keys(rec)) if (!seen.has(name)) fail(`the record holds ${name} but the UFC Guesser no longer ships him or her`);
  if (n < 100) fail(`only ${n} fighters compared`);
  else console.log(`  ${n} fighters match the record on all ten fields`);
}

// ---------------------------------------------------------------------------
head(3, 'Combat Chain fighters: record, a division they really fought in, Hall of Fame');
let chainMod;
{
  chainMod = await loadModule(CHAIN, over);
  const rec = record.ufcChain;
  const seen = new Set();
  for (const f of chainMod.UFC_FIGHTERS) {
    const r = rec[f.name];
    if (!r) { fail(`${f.name} ships in the chain with no verified record`); continue; }
    seen.add(f.name);
    const [w, l, d] = r.record.v.split('-').map(Number);
    if (f.record !== r.record.v || f.wins !== w || f.losses !== l || f.draws !== d) {
      fail(`${f.name}: chain shows ${f.record} (${f.wins}-${f.losses}-${f.draws}), verified ${r.record.v}`);
    }
    if (!r.divisions.v.includes(f.weightClass)) fail(`${f.name}: chained in ${f.weightClass}, but the verified UFC divisions are ${r.divisions.v.join(', ')}`);
    if (Boolean(f.isHallOfFamer) !== r.hallOfFame.v) fail(`${f.name}: isHallOfFamer ships ${Boolean(f.isHallOfFamer)}, verified ${r.hallOfFame.v}`);
  }
  for (const name of Object.keys(rec)) if (!seen.has(name)) fail(`the record holds chain fighter ${name} but the chain no longer ships them`);
  /* The guesser and the chain share a fighter's record, so both must agree. */
  const guesser = record.ufcFighters;
  for (const [name, r] of Object.entries(rec)) {
    if (guesser[name] && guesser[name].record.v !== r.record.v) fail(`${name}: the record says ${guesser[name].record.v} for the guesser and ${r.record.v} for the chain`);
  }
  console.log(`  ${seen.size} chain fighters checked`);
}

// ---------------------------------------------------------------------------
head(4, 'Combat Chain links: every accepted link is a verified fight');
{
  const key = (x) => `${x.winner} > ${x.loser} @ ${x.event} ${x.year}`;
  const verified = new Map(record.fightResults.map(x => [key(x), x]));
  const shipped = new Set();
  const fighters = new Set(chainMod.UFC_FIGHTERS.map(f => f.name));
  for (const r of chainMod.FIGHT_RESULTS) {
    const k = key(r);
    const v = verified.get(k);
    if (!v) { fail(`the chain accepts "${k}" and no verified fight says so`); continue; }
    if (shipped.has(k)) fail(`"${k}" is listed twice`);
    shipped.add(k);
    const want = { method: v.method, round: v.round, time: v.time, wasChampionshipFight: v.title };
    for (const [f, val] of Object.entries(want)) if (r[f] !== val) fail(`"${k}": ${f} ships ${JSON.stringify(r[f])}, verified ${JSON.stringify(val)}`);
    if (!fighters.has(r.winner) || !fighters.has(r.loser)) fail(`"${k}": a fighter in this link is not in the chain's fighter list`);
  }
  for (const k of verified.keys()) if (!shipped.has(k)) fail(`the record holds "${k}" but the chain no longer ships it`);
  console.log(`  ${shipped.size} links, each a verified fight`);
}

// ---------------------------------------------------------------------------
const checkClues = (label, rows, idKey, rec) => {
  const seen = new Set();
  for (const p of rows) {
    const r = rec[p[idKey]];
    if (!r) { fail(`${label} ${p[idKey]} ships with no verified record`); continue; }
    seen.add(p[idKey]);
    if (p.clues.length !== r.clues.length) fail(`${label} ${p[idKey]}: ${p.clues.length} clues ship, the record holds ${r.clues.length}`);
    p.clues.forEach((c, i) => {
      const want = r.clues[i];
      if (!want) return;
      if (c !== want.text) fail(`${label} ${p[idKey]} clue ${i + 1} ships "${c}", verified "${want.text}"`);
      if (want.editorial && !(typeof want.why === 'string' && want.why.length > 5)) fail(`${label} ${p[idKey]} clue ${i + 1} is marked editorial without saying why`);
      if (!want.editorial && !want.src) fail(`${label} ${p[idKey]} clue ${i + 1} has no sources`);
    });
    /* The one word opener is flavour. Anything else marked editorial must be
       rare, or "editorial" becomes the way a fact dodges its sources. */
    const editorial = r.clues.filter(x => x.editorial).length;
    if (editorial > 2) fail(`${label} ${p[idKey]}: ${editorial} clues are marked editorial, at most 2 may be`);
    if (!r.clues[0]?.editorial) fail(`${label} ${p[idKey]}: the first clue is expected to be the editorial one word opener`);
  }
  for (const id of Object.keys(rec)) if (!seen.has(id)) fail(`the record holds ${label} ${id} but the file no longer ships it`);
  return seen.size;
};

head(5, 'F1 drivers: every clue is the verified text');
{
  const { F1_DRIVERS } = await loadModule(F1D, over);
  const n = checkClues('driver', F1_DRIVERS, 'id', record.f1Drivers);
  console.log(`  ${n} drivers, ${n * 6} clues compared`);
}

head(6, 'F1 constructors: every clue is the verified text');
{
  const { F1_CONSTRUCTORS } = await loadModule(F1C, over);
  const n = checkClues('constructor', F1_CONSTRUCTORS, 'id', record.f1Constructors);
  console.log(`  ${n} constructors, ${n * 6} clues compared`);
}

head(7, 'Perfect Lineup F1: every card\'s team, era and nationality');
{
  const { F1_POOL } = await loadModule(F1P, over);
  const rec = record.f1Pool;
  const seen = new Set();
  for (const d of F1_POOL) {
    const r = rec[d.name];
    if (!r) { fail(`${d.name} ships in the F1 pool with no verified record`); continue; }
    seen.add(d.name);
    for (const k of ['team', 'era', 'nationality']) if (d[k] !== r[k].v) fail(`${d.name}: ${k} ships "${d[k]}", verified "${r[k].v}"`);
  }
  for (const n of Object.keys(rec)) if (!seen.has(n)) fail(`the record holds ${n} but the pool no longer ships him`);
  console.log(`  ${seen.size} drivers compared`);
}

head(8, 'The Medal Games: every field a player can be shown');
{
  const { olympicAthletes } = await loadModule(OLY, over);
  const rec = record.olympics;
  const seen = new Set();
  const FIELDS = ['name', 'sport', 'country', 'gamesYear', 'hostCity', 'achievement', 'careerContext', 'medalSummary'];
  for (const a of olympicAthletes) {
    const r = rec[a.id];
    if (!r) { fail(`${a.id} ships with no verified record`); continue; }
    if (seen.has(a.id)) fail(`${a.id} ships twice`);
    seen.add(a.id);
    for (const k of FIELDS) if (!same(a[k], r[k]?.v)) fail(`${a.id}: ${k} ships ${JSON.stringify(a[k])}, verified ${JSON.stringify(r[k]?.v)}`);
    /* The guess box accepts the full name or the last word of it, so an answer
       with a bracket or a symbol in it cannot be typed. */
    if (!/^[\p{L}][\p{L} .'&-]*$/u.test(a.name)) fail(`${a.id}: the answer "${a.name}" is not something a player can type`);
  }
  for (const id of Object.keys(rec)) if (!seen.has(id)) fail(`the record holds ${id} but the file no longer ships it`);
  console.log(`  ${seen.size} athletes compared on ${FIELDS.length} fields`);
}

head(9, 'Golf legends: majors, first and last win, nationality, the majors won');
{
  const { golfLegends } = await loadModule(GOLF, over);
  const rec = record.golf;
  const seen = new Set();
  for (const g of golfLegends) {
    const r = rec[g.name];
    if (!r) { fail(`${g.name} ships with no verified record`); continue; }
    seen.add(g.name);
    for (const k of ['majors', 'firstWin', 'lastWin', 'nationality']) if (g[k] !== r[k].v) fail(`${g.name}: ${k} ships ${g[k]}, verified ${r[k].v}`);
    if (!same([...g.tournaments].sort(), [...r.tournaments.v].sort())) fail(`${g.name}: majors won ship as ${g.tournaments.join(', ')}, verified ${r.tournaments.v.join(', ')}`);
  }
  for (const n of Object.keys(rec)) if (!seen.has(n)) fail(`the record holds ${n} but golfLegends no longer ships him`);
  console.log(`  ${seen.size} golfers compared`);
}

// ---------------------------------------------------------------------------
head(10, 'golf_majors placeholder rows are never counted as a player');
{
  /* Static half: every read of the table in code (comments stripped, so the
     prose explaining the filter cannot satisfy it) goes through onlyNames. */
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const files = [];
  const walkDir = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkDir(p);
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) files.push(p);
    }
  };
  walkDir(path.join(ROOT, 'src'));
  if (fs.existsSync(path.join(ROOT, 'supabase/functions'))) walkDir(path.join(ROOT, 'supabase/functions'));
  let reads = 0;
  for (const p of files) {
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    if (rel === 'src/integrations/supabase/types.ts') continue; // generated table types, not a reader
    const text = stripComments(over[rel] ?? fs.readFileSync(p, 'utf8'));
    for (const m of text.matchAll(/['"`]golf_majors['"`]/g)) {
      reads += 1;
      const before = text.slice(Math.max(0, m.index - 20), m.index);
      if (!/onlyNames\(col\($/.test(before)) {
        const line = text.slice(0, m.index).split('\n').length;
        fail(`${rel}:${line} reads golf_majors without onlyNames, so a year the major was not played counts as a golfer`);
      }
    }
  }
  if (reads < 4) fail(`found ${reads} reads of golf_majors, expected the four List Quiz golf lists`);
  else console.log(`  ${reads} reads of golf_majors in code, each through onlyNames`);

  /* Behavioural half: the real fetch closures, against a client that serves
     the table's real shape. Measured 2026-09-19: the placeholder is a single
     U+2014 character, 25 rows (the war years, 1871 and 2020 at The Open), and
     Bobby Jones's 1923 and 1929 U.S. Opens sit under "Bobby Jones" plus a
     U+2021 mark. The stub serves those, plus a hyphen and an en dash in case
     the table is ever re-scraped with a different character. */
  const STUB = `
const ROWS = ['Horton Smith', '\\u2014', 'Byron Nelson', '\\u2014', '-', ' \\u2013 ', 'Bobby Jones \\u2021', 'Jack Nicklaus'];
function q() { const o = { select: () => o, ilike: () => o, eq: () => o, order: () => o, in: () => o, not: () => o, gte: () => o, lte: () => o, range: () => o, limit: () => Promise.resolve({ data: ROWS.map(v => ({ player_name: v })), error: null }) }; return o; }
export const supabase = { from: () => q(), rpc: () => Promise.resolve({ data: [], error: null }) };
export const SUPABASE_URL = 'http://stub.invalid';
export const SUPABASE_PUBLISHABLE_KEY = 'stub';
`;
  const lq = await loadModule(LISTQUIZ, over, { '@/integrations/supabase/client': STUB });
  const golfIds = ['masters-champs', 'pga-champs', 'theopen-champs', 'usopen-golf-champs'];
  for (const id of golfIds) {
    const p = lq.LIST_PUZZLES.find(x => x.id === id);
    if (!p) { fail(`the List Quiz has no ${id} list`); continue; }
    const got = await p.fetch();
    const dashes = got.filter(v => !/\p{L}/u.test(v ?? ''));
    if (dashes.length) fail(`${id}: the fetch returns ${dashes.length} placeholder row(s) (${JSON.stringify(dashes)}) as golfers`);
    else console.log(`  ${id}: ${got.length} names from a stub serving 4 dash rows, none of them a dash`);
    const cleaned = lq.cleanAnswers(got);
    if (cleaned.some(v => !/\p{L}/u.test(v))) fail(`${id}: a placeholder survives the quiz's own cleaning`);
    if (got.length !== 4) fail(`${id}: expected the 4 real names back from the stub, got ${got.length}`);
  }

  const { golfLegends } = await loadModule(GOLF, over);
  const bad = golfLegends.filter(g => !/\p{L}/u.test(g.name));
  if (bad.length) fail(`golfLegends ships ${bad.length} placeholder golfer(s)`);
}

// ---------------------------------------------------------------------------
fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const reds = [...red].sort((a, b) => a - b);
  if (reds.length === 1 && reds[0] === want) {
    console.log(`\nCONTROL ${CONTROL}: section ${want} is red and no other section is. The check caught the break.`);
    process.exit(1);
  }
  console.error(`\nCONTROL ${CONTROL}: expected only section ${want} red, got [${reds.join(', ')}]. The control proves nothing.`);
  process.exit(2);
}
if (failures) { console.error(`\nsimSportsFacts: ${failures} failure(s) in section(s) ${[...red].sort((a, b) => a - b).join(', ')}`); process.exit(1); }
console.log('\nsimSportsFacts: every shipped fact in the seven files matches its two source record, every chain link is a verified fight, and no golf placeholder counts as a player.');

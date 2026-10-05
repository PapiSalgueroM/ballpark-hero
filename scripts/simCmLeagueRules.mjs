/* Round 832: Club Manager's league rules live in one table, and moving them
   there changed nothing.

   The owner, 2026-10-01: "we are yet to have way more leagues and players for
   like soccer manager". Two things stood in the way of the next leagues and
   this round removed both without adding one:

     A. Every era's rosters shipped in the engine chunk, so the page carried
        all three historical worlds whatever you picked. Each era now loads
        its own chunk when it is picked.
     B. A league's shape (drop zone, promotion pairing, cup, European places,
        nation and flag, season shape) was spread through the engine as id
        branches. It is one rules table now, and a new league is a row plus
        its clubs and rosters.

   What this holds:

   1. DIGEST, MODERN (hard). For every one of the 20 modern leagues a career
      at its first listed club plays a full seeded season, finishes it and
      rolls the summer over (the four pyramid leagues play a second season on
      the moved memberships). Results, every table in the world, the cup
      bracket and winner, the Champions League group, field and bracket,
      trophies, board objectives, the summer's promotions and relegations
      and next season's European places are hashed, plus the whole state.
      Every hash must equal the baseline in scripts/data/cmLeagueRulesDigest.json,
      which was taken on the tree BEFORE any code moved (origin/main at
      3fb92eea), held unchanged through the merge of 51e7f87f (whose own
      tree gave the same hashes), and re-taken from main's own tree at
      f3b1ea14 when Release P changed the match engine (CM_RULES_ROOT pointed
      at a git archive of main's src, nothing of this branch in it); the
      branch then matched it hash for hash. Round 899 rewrote the eras and
      pure entries three times, each time after attribution: the branch tree
      with the round's change taken back out reproduced the old entries
      exactly (eras 7/0 and pure 30/0 for the two new leagues; eras 9/0 and
      pure 32/0 for the review's window corrections, and again eras 9/0 and
      pure 32/0 for the second review's, which also move two 2005 digests in
      "whole"; the 2015-16 data file and its nationality block were the only
      difference between the two trees, so the data moved them, by a path
      this harness does not isolate). Round 901 rewrote them once more after
      the same attribution: the round's base tree (06dc0741, the change taken
      back out) reproduced the baseline exactly (eras 9/0, pure 32/0); on the
      round's tree the two 2010-11 leagues moved, its three new ones were
      added, the views gained them, and the 2015-16 and 2005-06 saves moved
      in "whole" only (laliga2005 in "start" too), the path Round 899 met.
      Its review fix rewrote them again: the pre-fix head e8515be9 matched
      the entries (the review ran eras and pure green on it), and the fix
      changed only the 2010-11 data file and its nationality block in src;
      on the fixed tree the five 2010-11 leagues moved, the 2015-16 and
      2005-06 saves in "whole" only, and pure in the day one objectives of
      laliga2010, bundesliga2010 and ligue12010. Release AB then re-took the
      whole baseline on main for Round 978 (main had no Round 901), so the
      merge took main's file and re-took the eras and pure entries on the
      merged tree: modern, drop4, cupless and shapes matched main's baseline
      there untouched, and eras and pure differed exactly by this round's
      footprint (the five 2010-11 leagues, three of them new, "whole" in the
      2015-16 and 2005-06 saves with laliga2005 "start", the 2010-11
      objectives and the views' leagueNations and euroSlots).
      Round 902 rewrote the eras and pure entries once more, for the
      2005-06 era's Serie A, Bundesliga and Ligue 1, after the same
      attribution: Round 899's head (06dc0741, a git archive of its src,
      CM_RULES_ROOT) reproduced the old entries exactly (eras 9/0, pure
      32/0), and the round's own diff is that era's data file, its
      nationality block and its rows in the engine. MERGE_ATTRIBUTION_TODO
   2. DIGEST, ERAS (hard). The same for every league of every historic era,
      one career each.
   3. DIGEST, PURE (hard). For every modern and era league: the drop count,
      the Champions League places, the board's demand at every rank, tier
      and title gap, every club's day one board objectives, and the exported
      views (PYRAMIDS, LEAGUE_NATIONS, NATIONS, EURO_SLOTS, cup names).
      relegationSpots and leagueDemand are private to the engine, so the
      bundle appends an export of them in memory, which works on both trees.
   4. SYNTHETIC LEAGUES (hard). A bundled engine copy gains, in memory, the
      two shapes no real league used before this round: a nation whose top
      flight relegates FOUR into a modelled second tier of its own, and a
      league with NO domestic cup. Each is added as rows only (a rules row,
      a league row, a nation row), the way the next real league will be.
      Ten seasons in each: no crash, four down and four up every summer with
      the union and the sizes held, and the cupless save never schedules,
      draws, grades or shows a cup.
   4c. SHAPES (hard, added by the review). Two more shapes the table can
      express as rows only, both broken in the engine until the review: a
      three tier chain (a second tier with a second tier of its own) and a
      cupless league inside a nation that has a cup. Ten seasons: the three
      divisions hold the same sixty clubs at 20/20/20 with none in two, the
      right clubs move both ways at both steps, and no club of the cupless
      league is ever drawn into the nation's cup. Part pure's table check
      (3b) also refuses a drop a division cannot carry, two leagues sharing a
      second tier, and a chain that loops.
   5. CHUNKS (hard, needs a build in dist/). Each era's roster block sits in
      its own chunk, the engine chunk carries none of them, and the only way
      in is a dynamic import (no chunk imports an era chunk statically).
      Asserted on dist/assets, never on source text. Skipped with a notice
      when dist/ has no build.

   Determinism: Math.random is seeded per save from the save's own key and
   Date.now is pinned, so a run is a pure function of the tree. Run the same
   part twice and the hashes agree (checked when the baseline was taken).

   NEGATIVE CONTROLS (each must turn the run red, each refuses to run when
   the thing it mutates is not in the source):
     CM_RULES_CONTROL=dropcount  puts one league's old drop constant back
                                 differently (Austria drops 2), part pure
                                 must go red;
     CM_RULES_CONTROL=fourth     drops the fourth relegated club of the
                                 synthetic league, part synthetic must go red;
     CM_RULES_CONTROL=chainstart the summer reads the memberships the season
                                 started with (the engine before the review),
                                 part shapes must go red;
     CM_RULES_CONTROL=cupfield   the cup draws from every league of the
                                 nation, cup or not, part shapes must go red;
     CM_RULES_CONTROL=thintier   the Premier League drops 25 into a 24 club
                                 Championship, part pure's table check must
                                 go red;
     CM_RULES_CONTROL=idbranch   plants a championship branch in leagueDemand
                                 and a map keyed by premier into the source
                                 part pure's id scan (3d) reads, which must
                                 name both;
     CM_RULES_CONTROL=static     the chunk check reads a copy of dist/assets
                                 whose engine chunk carries 2010 rows and a
                                 static import of the 2010 chunk (what a
                                 static era import does to a vite build), part
                                 chunks must go red (2 failures, measured);
     CM_RULES_CONTROL=staticbuild the literal control: the engine is built by
                                 a real code splitting bundler (esbuild,
                                 minified) with clubManagerEras.ts given a
                                 static import of the 2010 bake beside its
                                 dynamic one, and part chunks must go red (the
                                 2010 rows land in a chunk the entry imports
                                 statically: 2 failures, measured). A vite
                                 build with that patch ran past nine minutes
                                 on the loaded build machine and was stopped,
                                 so esbuild stands in for it.

   Measured 2026-10-01: modern 53s, eras plus pure about 60s, drop4 17s,
   cupless about 20s, chunks under 15s.

   Run: node scripts/simCmLeagueRules.mjs [--part=modern|eras|pure|synthetic|chunks] [--write]
   --write rewrites the baseline for the parts run, from this tree. Only do
   that for a change that is MEANT to move the game, and say why in the
   commit.
*/
import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* CM_RULES_ROOT points the bundler at another tree (a checkout of main), so
   the baseline can be taken from a tree this harness is not part of. */
const ROOT = path.resolve(process.env.CM_RULES_ROOT || SCRIPT_ROOT);
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const BASELINE = path.join(SCRIPT_ROOT, 'scripts', 'data', 'cmLeagueRulesDigest.json');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const partArg = args.find(a => a.startsWith('--part='));
const PARTS = partArg ? partArg.slice(7).split(',') : ['modern', 'eras', 'pure', 'drop4', 'cupless', 'shapes', 'chunks'];
/* The structural checks read this tree's own table; a baseline taken from
   another tree (CM_RULES_ROOT) runs the digest only. */
const OWN_TREE = path.resolve(process.env.CM_RULES_ROOT || SCRIPT_ROOT) === path.resolve(SCRIPT_ROOT);
const CONTROL = process.env.CM_RULES_CONTROL || '';
const CONTROLS = ['dropcount', 'fourth', 'static', 'staticbuild', 'chainstart', 'cupfield', 'thintier', 'idbranch'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CM_RULES_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }
if (CONTROL && WRITE) { console.error('a control run never writes the baseline'); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
const PINNED_NOW = 1790000000000;
Date.now = () => PINNED_NOW;

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmrules-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

/* The engine, bundled from ROOT. `transform` rewrites clubManager.ts in
   memory (exports of private helpers, synthetic rows, controls), so no file
   in the tree is ever touched. */
let bundleSeq = 0;
async function bundleEngine(transform) {
  bundleSeq += 1;
  const entry = path.join(TMP, `entry${bundleSeq}.mjs`);
  const out = path.join(TMP, `engine${bundleSeq}.mjs`);
  fs.writeFileSync(entry, [
    `export * as cm from '${ROOT_FWD}/src/lib/clubManager.ts';`,
    `export * as eras from '${ROOT_FWD}/src/lib/clubManagerEras.ts';`,
  ].join('\n'));
  const enginePath = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: out,
    alias: { '@': `${ROOT_FWD}/src` },
    logLevel: 'error',
    plugins: [{
      name: 'cm-transform',
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, args2 => {
          /* Line endings normalised first, so a transform's anchors match on a
             CRLF checkout too (template literals read CRLF as LF anyway). */
          let src = fs.readFileSync(args2.path, 'utf8').replaceAll('\r\n', '\n');
          if (path.resolve(args2.path) === path.resolve(enginePath) && transform) src = transform(src);
          return { contents: src, loader: 'ts', resolveDir: path.dirname(args2.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

/* relegationSpots and leagueDemand are private on both trees; the digest
   exports them in memory so the old tree and the new one can be asked the
   same question. */
function exposePrivates(src) {
  const extra = [];
  if (/\nfunction relegationSpots\(/.test(src)) extra.push('relegationSpots as __relegationSpots');
  if (/\nfunction leagueDemand\(/.test(src)) extra.push('leagueDemand as __leagueDemand');
  return extra.length ? `${src}\nexport { ${extra.join(', ')} };\n` : src;
}

/* An era's rosters load with the era since this round. The old tree has no
   loader and every era is already there, so a missing loader is fine. */
async function ensureEra(mod, eraId) {
  const load = mod.eras.ensureEraRosters ?? mod.cm.ensureEraRosters;
  if (typeof load === 'function') await load(eraId);
}

function playSeason(cm, state) {
  let s = state;
  for (let i = 0; i < 160; i++) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') return { state: s, entries: i + 1 };
    if (s.sacked) return { state: s, entries: i + 1, sacked: true };
  }
  return { state: s, entries: 160, stuck: true };
}

const tableRows = (cm, rows) => cm.sortedTable(rows ?? []).map(r => [r.club, r.pts, r.gf, r.ga, r.w, r.d, r.l]);

function seasonComponents(cm, s) {
  return {
    table: hash(tableRows(cm, s.table)),
    results: hash(s.resultLog ?? []),
    world: hash(Object.keys(s.world ?? {}).sort().map(id => [id, s.world[id].round, tableRows(cm, s.world[id].table)])),
    cup: hash({ round: s.cupRound, exit: s.cupExit ?? null, bracket: s.cupBracket ?? null }),
    europe: hash({ group: s.uclGroup, world: s.uclWorld ?? null, bracket: s.uclBracket ?? null, ko: s.uclKoRound, field: s.uclField ?? null }),
    trophies: hash(s.trophies),
    objectives: hash(s.boardObjectives ?? []),
    whole: hash(s),
  };
}

function nextComponents(next) {
  const calendarTypes = {};
  for (const e of next.calendar ?? []) calendarTypes[e.type] = (calendarTypes[e.type] ?? 0) + 1;
  return {
    promotions: hash(next.leagueOverrides ?? null),
    europeNext: hash({ field: next.uclField ?? null, inGroup: !!next.uclGroup, group: next.uclGroup }),
    objectivesNext: hash(next.boardObjectives ?? []),
    calendarNext: hash(calendarTypes),
    cupDrawNext: hash(next.cupBracket ?? null),
    wholeNext: hash(next),
  };
}

/* A readable line per save, kept beside the hashes so a reader can see what
   the digest pinned without running anything. */
function readable(cm, s, summary, next, myLeagueId) {
  const t = cm.sortedTable(s.table ?? []);
  const cupFinal = (s.cupBracket ?? []).find(x => x.round === 'F');
  const uclFinal = (s.uclBracket ?? []).find(x => x.round === 'F');
  const moved = {};
  for (const [id, clubs] of Object.entries(next.leagueOverrides ?? {})) moved[id] = clubs.length;
  return {
    position: summary.position,
    champion: t[0]?.club ?? null,
    bottom: t[t.length - 1]?.club ?? null,
    cupWinner: cupFinal?.winner ?? null,
    uclWinner: uclFinal?.winner ?? null,
    nextLeague: myLeagueId,
    nextUcl: !!next.uclGroup,
    overrides: moved,
  };
}

async function digestSaves(saves, mod) {
  const { cm } = mod;
  const out = {};
  for (const sv of saves) {
    if (sv.eraId !== 'now') await ensureEra(mod, sv.eraId);
    Math.random = seeded(hashKey(`cm-league-rules|${sv.key}`));
    let s = cm.startCareer(sv.club, sv.eraId);
    const comp = { start: hash(s) };
    let played = playSeason(cm, s);
    if (played.stuck) fail(`${sv.key}: season one never ended`);
    s = played.state;
    Object.assign(comp, seasonComponents(cm, s));
    const fin = cm.finishSeason(s);
    comp.summary = hash(fin.summary);
    const next = cm.startNextSeason(fin.state);
    Object.assign(comp, nextComponents(next));
    const rec = { club: sv.club, eraId: sv.eraId, entries: played.entries, read: readable(cm, s, fin.summary, next, cm.careerLeagueOf(next).id), hashes: comp };
    if (sv.second) {
      played = playSeason(cm, next);
      if (played.stuck) fail(`${sv.key}: season two never ended`);
      const two = seasonComponents(cm, played.state);
      for (const [k, v] of Object.entries(two)) comp[`s2_${k}`] = v;
    }
    out[sv.key] = rec;
    Math.random = REAL_RANDOM;
  }
  return out;
}

function compare(label, got, want) {
  if (!want) { fail(`${label}: no baseline recorded for this part (run with --write on the tree before the change)`); return; }
  let bad = 0;
  const keys = new Set([...Object.keys(got), ...Object.keys(want)]);
  for (const key of keys) {
    const g = got[key];
    const w = want[key];
    if (!g) { fail(`${label}: ${key} is in the baseline and was not produced`); bad += 1; continue; }
    if (!w) { fail(`${label}: ${key} was produced and is not in the baseline`); bad += 1; continue; }
    const gh = g.hashes ?? g;
    const wh = w.hashes ?? w;
    const diff = Object.keys({ ...gh, ...wh }).filter(k => gh[k] !== wh[k]);
    if (diff.length) { fail(`${label}: ${key} differs in ${diff.join(', ')}`); bad += 1; }
  }
  console.log(`   ${keys.size} entries compared, ${bad} differ`);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { parts: {} };
const written = {};

/* ------------------------------------------------------------------ */

async function partModern() {
  console.log('1) digest, every modern league: a seeded season, the summer, and the pyramids twice');
  const mod = await bundleEngine(exposePrivates);
  const pyramidIds = new Set(mod.cm.PYRAMIDS.flatMap(p => [p.top, p.second]));
  const saves = mod.cm.REAL_LEAGUES.map(l => ({ key: `now|${l.id}`, club: l.clubs[0], eraId: 'now', second: pyramidIds.has(l.id) }));
  /* Round 876: 21 with Brazil's Serie A. Baseline rewritten from the Round 876
     tree on purpose (see that commit for the attribution of every moved hash).
     Round 883: 22 with Liga MX, rewritten the same way and attributed in its commit. */
  if (saves.length !== 22) fail(`the game has ${saves.length} modern leagues where this round found 22 (a league added later regenerates the baseline on purpose)`);
  const got = await digestSaves(saves, mod);
  if (WRITE) written.modern = got; else compare('modern', got, baseline.parts.modern);
}

async function partEras() {
  console.log('2) digest, every league of every historic era');
  const mod = await bundleEngine(exposePrivates);
  const saves = [];
  for (const [eraId, leagues] of Object.entries(mod.cm.ERA_LEAGUES)) {
    for (const l of leagues) saves.push({ key: `${eraId}|${l.id}`, club: l.clubs[0], eraId, second: false });
  }
  /* Round 899: nine, the 2015-16 era gained its Bundesliga and its Ligue 1 (a league added to an era
     regenerates the baseline on purpose, like a modern one). Round 901: twelve, the 2010-11 era
     gained its Serie A, Bundesliga and Ligue 1. Round 902: fifteen, the 2005-06 era gained the same three. */
  if (saves.length !== 15) fail(`the eras hold ${saves.length} leagues where Rounds 901 and 902 left 15`);
  const got = await digestSaves(saves, mod);
  if (WRITE) written.eras = got; else compare('eras', got, baseline.parts.eras);
}

async function partPure() {
  console.log('3) digest, the pure rules: drop zones, European places, board demands, the exported views');
  const transform = src => {
    let s = exposePrivates(src);
    if (CONTROL === 'dropcount') s = controlDropCount(s);
    if (CONTROL === 'thintier') s = controlThinTier(s);
    return s;
  };
  const mod = await bundleEngine(transform);
  const { cm, eras } = mod;
  if (typeof cm.__relegationSpots !== 'function' || typeof cm.__leagueDemand !== 'function') { fail('relegationSpots or leagueDemand could not be reached in the bundle'); return; }
  for (const e of Object.keys(cm.ERA_LEAGUES)) await ensureEra(mod, e);
  const got = {};
  const all = [...cm.REAL_LEAGUES.map(l => ({ l, eraId: undefined })), ...Object.entries(cm.ERA_LEAGUES).flatMap(([e, ls]) => ls.map(l => ({ l, eraId: e })))];
  for (const { l, eraId } of all) {
    const size = l.clubs.length;
    const demand = [];
    for (let rank = 1; rank <= size; rank++) {
      for (let tier = 1; tier <= 4; tier++) {
        for (const gap of [0, 2.6, 6, 20]) demand.push(cm.__leagueDemand(rank, tier, size, l, gap, eraId));
      }
    }
    const objectives = l.clubs.map(c => [c, cm.buildBoardObjectives(c, true, size, eraId), cm.buildBoardObjectives(c, false, size, eraId), cm.boardWantLabel(c, eraId)]);
    got[`${eraId ?? 'now'}|${l.id}`] = {
      drop: hash(cm.__relegationSpots(l.id)),
      ucl: hash(cm.uclPlacesIn(l)),
      def: hash({ id: l.id, name: l.name, cupName: l.cupName, euro: l.euro, clubs: l.clubs }),
      demand: hash(demand),
      objectives: hash(objectives),
    };
  }
  /* Lists keep their order (the picker reads NATIONS in order and the summer
     walks PYRAMIDS in order); lookups by id are hashed with their keys
     sorted, because nothing reads them in order and a rules table derives
     them in its own. */
  const sortedKeys = rec => Object.fromEntries(Object.keys(rec).sort().map(k => [k, rec[k]]));
  got.views = {
    pyramids: hash(cm.PYRAMIDS),
    nations: hash(cm.NATIONS),
    leagueNations: hash(sortedKeys(cm.LEAGUE_NATIONS)),
    euroSlots: hash(sortedKeys(Object.fromEntries(Object.entries(cm.EURO_SLOTS).map(([k, v]) => [k, sortedKeys(v)])))),
    eraIds: hash(Object.keys(cm.ERA_LEAGUES)),
    historic: hash(['now', 'era2005', 'era2010', 'era2015', 'era2020', ''].map(e => eras.isHistoricEra(e))),
  };
  const drops = Object.fromEntries(all.map(({ l }) => [l.id, cm.__relegationSpots(l.id)]));
  console.log(`   drop counts: ${Object.entries(drops).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (WRITE) written.pure = got; else compare('pure', got, baseline.parts.pure);
  if (OWN_TREE && !WRITE) { tableIsComplete(cm, all); fillerNamesComplete(mod); await noIdBranches(cm); }
}

/* Round 832 review: "nothing else branches on a league id", held on the code.
   Every Club Manager source (the engine and its modules, the hook, the page,
   the club manager components) is read with its comments stripped (esbuild's
   own transform, so a comment explaining a rule can never satisfy or trip
   this), and a league or nation id may not appear as a literal in a
   comparison, a switch case, a lookup, a list or set membership test, a
   prefix test, nor as the key of an object literal anywhere but LEAGUE_RULES.
   The review found exactly one survivor this way, the tiebreak map, and moved
   it onto the rows. Control idbranch plants one comparison and one keyed map
   in memory and both must be named. */
async function noIdBranches(cm) {
  console.log('3d) no league or nation id is branched on outside the rules table');
  const ids = [...new Set([...Object.keys(cm.LEAGUE_RULES), ...cm.NATIONS.map(n => n.id)])];
  const leagueIds = Object.keys(cm.LEAGUE_RULES);
  const files = [
    ...fs.readdirSync(path.join(ROOT, 'src', 'lib')).filter(f => /^clubManager.*\.ts$/.test(f)).map(f => `src/lib/${f}`),
    'src/hooks/useClubManager.ts', 'src/pages/ClubManager.tsx',
    ...fs.readdirSync(path.join(ROOT, 'src', 'components', 'club-manager')).filter(f => f.endsWith('.tsx')).map(f => `src/components/club-manager/${f}`),
  ];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lit = `["'\`](?:${ids.map(esc).join('|')})["'\`]`;
  const prefixes = new Set(ids.flatMap(i => Array.from({ length: Math.max(0, i.length - 2) }, (_, n) => i.slice(0, n + 3))));
  const shapes = [
    ['a comparison', new RegExp(`(?:===|!==|==|!=)\\s*${lit}|${lit}\\s*(?:===|!==|==|!=)`, 'g')],
    ['a switch case', new RegExp(`case\\s+${lit}\\s*:`, 'g')],
    ['a lookup', new RegExp(`\\[\\s*${lit}\\s*\\]`, 'g')],
    ['a list membership test', new RegExp(`\\[[^\\]\\n]*${lit}[^\\]\\n]*\\]\\s*\\.(?:includes|indexOf|some|has)\\(`, 'g')],
    ['a set of ids', new RegExp(`new Set\\(\\[[^\\]\\n]*${lit}`, 'g')],
  ];
  const keyRe = new RegExp(`^\\s*["']?(${leagueIds.map(esc).join('|')})["']?\\s*:`);
  let findings = 0, scanned = 0;
  for (const rel of files) {
    let raw = fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
    if (CONTROL === 'idbranch' && rel === 'src/lib/clubManager.ts') {
      const anchor = '  const rules = leagueRulesOf(league.id);\n';
      if (raw.split(anchor).length !== 2) { console.error('control idbranch cannot run: leagueDemand does not read its rules row in the shape it plants beside'); process.exit(1); }
      raw = raw.replace(anchor, `${anchor}  if (league.id === 'championship') return { target: 6, label: 'Make the promotion playoffs' };\n`)
        + '\nconst CONTROL_DROPS: Record<string, number> = {\n  premier: 3,\n};\nvoid CONTROL_DROPS;\n';
      console.log('NEGATIVE CONTROL ON: a championship branch in leagueDemand and a map keyed by premier, 3d must name both');
    }
    const { code } = await transform(raw, { loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', jsx: 'preserve', legalComments: 'none' });
    scanned += 1;
    const lines = code.split('\n');
    const report = (why, at) => {
      const ln = code.slice(0, at).split('\n').length;
      findings += 1;
      fail(`${rel}: a league or nation id in ${why}: ${lines[ln - 1].trim().slice(0, 120)}`);
    };
    for (const [why, re] of shapes) for (const m of code.matchAll(re)) report(why, m.index);
    for (const m of code.matchAll(/\.(startsWith|endsWith|includes)\(\s*["'`]([A-Za-z0-9]+)["'`]\s*\)/g)) {
      if (prefixes.has(m[2]) || ids.includes(m[2])) report(`a ${m[1]} test`, m.index);
    }
    let decl = null;
    lines.forEach(l => {
      const d = l.match(/^(?:export )?(?:const|let|var) (\w+)/);
      if (d) decl = d[1];
      if (keyRe.test(l) && decl !== 'LEAGUE_RULES') { findings += 1; fail(`${rel}: an object keyed by a league id outside LEAGUE_RULES (${decl}): ${l.trim().slice(0, 100)}`); }
    });
  }
  if (scanned < 40) fail(`only ${scanned} Club Manager sources were read, the file list is broken`);
  console.log(`   ${scanned} sources read, ${ids.length} ids, ${findings} finding(s)`);
}

/* The table answers for every league and names nothing that is not there.
   Read off the real exported values. */
function tableIsComplete(cm, all) {
  console.log('3b) the rules table: a row for every league, every row used, every reference real');
  const R = cm.LEAGUE_RULES;
  if (!R) { fail('LEAGUE_RULES is not exported'); return; }
  const defIds = new Set(all.map(({ l }) => l.id));
  for (const id of defIds) if (!Object.prototype.hasOwnProperty.call(R, id)) fail(`league ${id} has no LEAGUE_RULES row`);
  for (const id of Object.keys(R)) if (!defIds.has(id)) fail(`LEAGUE_RULES has a row for ${id}, which no league def uses`);
  const nationIds = new Set(cm.NATIONS.map(n => n.id));
  for (const [id, r] of Object.entries(R)) {
    if (!nationIds.has(r.nationId)) fail(`${id} names nation ${r.nationId}, which NATIONS does not hold`);
    if (r.season !== 'autumnSpring' && r.season !== 'calendarYear') fail(`${id} does not say which calendar its real league plays`);
    if (!Number.isInteger(r.drop) || r.drop < 0) fail(`${id} drops ${r.drop}`);
    if (r.ladder === 'promotion' && !r.playoff) fail(`${id} is a promotion ladder with no playoff rung`);
    if (r.ladder === 'playoffs' && (!r.playoff || r.drop !== 0)) fail(`${id} is a playoffs ladder that relegates or has no playoff rung`);
    if (r.secondTier) {
      const below = R[r.secondTier];
      if (!below || !cm.REAL_LEAGUES.some(l => l.id === r.secondTier)) fail(`${id} names second tier ${r.secondTier}, which is not a modern league`);
      else if (below.ladder !== 'promotion') fail(`${id}'s second tier ${r.secondTier} does not talk about promotion`);
      if (r.drop < 1) fail(`${id} has a second tier and relegates nobody`);
    }
    const def = all.find(({ l }) => l.id === id)?.l;
    /* Round 832 review: a drop the divisions cannot carry. The summer only
       trades when both sides can move the full count, so a second tier with
       fewer clubs than the drop above it (or a league dropping its whole size)
       never relegates anybody, silently, while its board still threatens it. */
    if (def && r.drop >= def.clubs.length) fail(`${id} drops ${r.drop} of its ${def.clubs.length} clubs`);
    if (r.secondTier) {
      const belowDef = cm.REAL_LEAGUES.find(l => l.id === r.secondTier);
      if (belowDef && belowDef.clubs.length <= r.drop) fail(`${id} sends ${r.drop} down into ${r.secondTier}, which has only ${belowDef.clubs.length} clubs to send ${r.drop} up`);
      const sharing = Object.entries(R).filter(([, x]) => x.secondTier === r.secondTier).map(([k]) => k);
      if (sharing.length > 1 && sharing[0] === id) fail(`${sharing.join(' and ')} each name ${r.secondTier} as their second tier`);
      for (let at = r.secondTier, hops = 0; at && R[at]; at = R[at].secondTier, hops += 1) {
        if (at === id || hops > 10) { fail(`${id}'s chain of second tiers loops back on itself`); break; }
      }
    }
    if (def && def.cupName !== r.cup) fail(`${id}'s league def carries cup ${def.cupName} where its row says ${r.cup}`);
    if (def && def.euro !== (r.europe !== null)) fail(`${id}'s league def has euro ${def.euro} where its row has places ${JSON.stringify(r.europe)}`);
  }
  for (const n of cm.NATIONS) if (!n.leagueIds.length) fail(`nation ${n.id} has no league`);
  console.log(`   ${Object.keys(R).length} rows for ${defIds.size} leagues, ${cm.NATIONS.length} nations, ${cm.PYRAMIDS.length} pyramids`);
}

/* The name guard's list of era names is exactly the era players whose names
   the filler can build, recomputed from the era bakes and the generator's own
   banks. An incomplete list would let a made up player wear a real era
   name; an extra name would re-roll a name the old guard allowed. */
function fillerNamesComplete(mod) {
  console.log('3c) the era names the filler could build are listed exactly');
  const listed = mod.eras.ERA_NAMES_THE_FILLER_COULD_BUILD;
  if (!Array.isArray(listed)) { fail('ERA_NAMES_THE_FILLER_COULD_BUILD is not exported'); return; }
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'clubManagerEras.ts'), 'utf8');
  const bank = name => {
    const m = src.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
  };
  const first = new Set(bank('GEN_FIRST'));
  const last = new Set(bank('GEN_LAST'));
  if (first.size < 100 || last.size < 100) { fail(`the generator banks read ${first.size} x ${last.size}, the read is broken`); return; }
  const buildable = n => { const i = n.indexOf(' '); return i > 0 && first.has(n.slice(0, i)) && last.has(n.slice(i + 1)); };
  const want = new Set();
  let eraPlayers = 0;
  for (const world of Object.values(mod.eras.HISTORIC_ROSTERS)) {
    for (const roster of Object.values(world)) for (const p of roster) { eraPlayers += 1; if (buildable(p.n)) want.add(p.n); }
  }
  if (eraPlayers < 2000) { fail(`only ${eraPlayers} era players were loaded, so the list cannot be checked`); return; }
  const have = new Set(listed);
  const missing = [...want].filter(n => !have.has(n));
  const extra = [...have].filter(n => !want.has(n));
  if (missing.length) fail(`the filler could build these real era names and the guard does not list them: ${missing.join(', ')}`);
  if (extra.length) fail(`the guard lists names no era player has: ${extra.join(', ')}`);
  console.log(`   ${eraPlayers} era players, ${want.size} buildable names, ${listed.length} listed`);
}

/* ------------------------------------------------------------------ */
/* The two new shapes, on synthetic leagues added as rows only          */
/* ------------------------------------------------------------------ */

const SYNTH_TOP = Array.from({ length: 20 }, (_, i) => `Synthtop Rovers ${i + 1}`);
const SYNTH_SECOND = Array.from({ length: 20 }, (_, i) => `Synthsecond Town ${i + 1}`);
const SYNTH_NOCUP = Array.from({ length: 18 }, (_, i) => `Nocup United ${i + 1}`);
const EXPECT_DROP = 4;

/* Rows only: a rules row each, a league row each, a nation row each, exactly
   what the next real league adds. Every anchor must be in the source once. */
function injectSynthetic(src) {
  const once = (needle, label) => {
    const n = src.split(needle).length - 1;
    if (n !== 1) { console.error(`synthetic leagues cannot be added: ${label} appears ${n} times in clubManager.ts`); process.exit(1); }
  };
  const rulesAnchor = 'export const LEAGUE_RULES: Record<string, LeagueRules> = {\n';
  const leaguesAnchor = 'export const REAL_LEAGUES: LeagueDef[] = [\n';
  const nationsAnchor = '].map(n => ({ ...n, leagueIds:';
  once(rulesAnchor, 'the LEAGUE_RULES opening');
  once(leaguesAnchor, 'the REAL_LEAGUES opening');
  once(nationsAnchor, 'the NATIONS closing');
  const drop = CONTROL === 'fourth' ? EXPECT_DROP - 1 : EXPECT_DROP;
  if (CONTROL === 'fourth') console.log(`NEGATIVE CONTROL ON: the synthetic top flight sends ${drop} down, not ${EXPECT_DROP}, part drop4 must go red`);
  const rules = [
    `  synthTop: { nationId: 'synthland', flag: '', cup: 'Synth Cup', europe: null, drop: ${drop}, secondTier: 'synthSecond', ladder: 'top', season: 'calendarYear' },`,
    `  synthSecond: { nationId: 'synthland', flag: '', cup: 'Synth Cup', europe: null, drop: 2, ladder: 'promotion', playoff: { rankUpTo: 8, target: 6, label: 'Make the promotion playoffs' }, season: 'calendarYear' },`,
    `  synthNoCup: { nationId: 'nocupia', flag: '', cup: null, europe: null, drop: 0, ladder: 'playoffs', playoff: { rankUpTo: 8, target: 7, label: 'Make the playoffs' }, floorFromBottom: 4, season: 'autumnSpring' },`,
  ].join('\n') + '\n';
  const rows = [
    `  { id: 'synthTop', name: 'Synth Top Division', clubs: ${JSON.stringify(SYNTH_TOP)} },`,
    `  { id: 'synthSecond', name: 'Synth Second Division', clubs: ${JSON.stringify(SYNTH_SECOND)} },`,
    `  { id: 'synthNoCup', name: 'Nocup League', clubs: ${JSON.stringify(SYNTH_NOCUP)} },`,
  ].join('\n') + '\n';
  const nations = `  { id: 'synthland', name: 'Synthland', flag: '' },\n  { id: 'nocupia', name: 'Nocupia', flag: '' },\n`;
  let out = src.replace(rulesAnchor, rulesAnchor + rules);
  out = out.replace(leaguesAnchor, leaguesAnchor + rows);
  out = out.replace(nationsAnchor, nations + nationsAnchor);
  return out;
}

/* Ten seasons of one club, the board held off so the season always runs to
   its end (the board is not what this checks). Every summer is handed over
   as { before, fin, next, read }, where read is what beforeRollover read off
   the finished season BEFORE the rollover registered next season's
   memberships (league lookups answer for the registered ones). */
function tenSeasons(cm, club, seedKey, onSummer, beforeRollover = () => null) {
  Math.random = seeded(hashKey(`cm-league-rules|${seedKey}`));
  let s = cm.startCareer(club, 'now');
  for (let season = 1; season <= 10; season++) {
    for (let i = 0; i < 160; i++) {
      s = { ...s, boardConfidence: Math.max(s.boardConfidence, 50) };
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
      if (i === 159) fail(`${club}: season ${season} never ended`);
    }
    if (s.sacked) { fail(`${club}: sacked in season ${season} with the board held off`); break; }
    const fin = cm.finishSeason(s);
    const read = beforeRollover(fin);
    const next = cm.startNextSeason(fin.state);
    onSummer({ season, before: s, fin, next, read });
    s = next;
  }
  Math.random = REAL_RANDOM;
  return s;
}

async function partDrop4() {
  console.log(`4a) a synthetic top flight that sends ${EXPECT_DROP} down into a modelled second tier, ten seasons`);
  const mod = await bundleEngine(src => injectSynthetic(exposePrivates(src)));
  const { cm } = mod;
  const top = cm.REAL_LEAGUES.find(l => l.id === 'synthTop');
  const second = cm.REAL_LEAGUES.find(l => l.id === 'synthSecond');
  if (!top || !second) { fail('the synthetic leagues did not reach REAL_LEAGUES'); return; }
  const pyr = cm.PYRAMIDS.find(p => p.top === 'synthTop');
  if (!pyr || pyr.second !== 'synthSecond') fail('the synthetic pair is not in PYRAMIDS');
  const nation = cm.NATIONS.find(n => n.id === 'synthland');
  if (!nation || nation.leagueIds.join('|') !== 'synthTop|synthSecond') fail(`the synthetic nation holds ${nation?.leagueIds.join(', ')}`);
  /* The board's floor for a bottom club off the title band reads the drop:
     size minus four. (Every synthetic club rates the same, so a club's own
     objectives all ask for the title; the ladder is asked directly.) */
  const floor = cm.__leagueDemand(20, 4, 20, top, 20);
  console.log(`   bottom of the ladder: "${floor.label}" target ${floor.target}`);
  if (floor.target !== 20 - EXPECT_DROP) fail(`the board's floor in the top flight is ${floor.target}, expected ${20 - EXPECT_DROP}`);
  if (cm.__relegationSpots('synthTop') !== EXPECT_DROP) fail(`relegationSpots reads ${cm.__relegationSpots('synthTop')} for the synthetic top flight`);
  const staticUnion = [...top.clubs, ...second.clubs].sort().join('|');
  let summers = 0, moves = 0, myMoves = 0;
  /* The final tables, by the engine's own sort, read before the rollover. */
  const readTables = fin => {
    const s = fin.state;
    const prevTop = s.leagueOverrides?.synthTop ?? top.clubs;
    const myId = prevTop.includes(s.clubName) ? 'synthTop' : 'synthSecond';
    const tableOf = id => (myId === id ? cm.sortedLeagueTable(s) : cm.sortedWorldTable(s, id, s.world?.[id]?.table ?? []));
    return { myId, top: tableOf('synthTop').map(r => r.club), second: tableOf('synthSecond').map(r => r.club) };
  };
  tenSeasons(cm, SYNTH_TOP[0], 'drop4', ({ season, before, next, read }) => {
    summers += 1;
    const prevTop = before.leagueOverrides?.synthTop ?? top.clubs;
    const prevSecond = before.leagueOverrides?.synthSecond ?? second.clubs;
    const ov = next.leagueOverrides ?? {};
    const nowTop = ov.synthTop ?? [];
    const nowSecond = ov.synthSecond ?? [];
    if (nowTop.length !== 20 || nowSecond.length !== 20) { fail(`summer ${season}: the divisions hold ${nowTop.length} and ${nowSecond.length}`); return; }
    if ([...nowTop, ...nowSecond].sort().join('|') !== staticUnion) fail(`summer ${season}: the two divisions no longer hold the same forty clubs`);
    const up = nowTop.filter(c => !prevTop.includes(c));
    const down = nowSecond.filter(c => !prevSecond.includes(c));
    if (up.length !== EXPECT_DROP) fail(`summer ${season}: ${up.length} came up, expected ${EXPECT_DROP}`);
    if (down.length !== EXPECT_DROP) fail(`summer ${season}: ${down.length} went down, expected ${EXPECT_DROP}`);
    /* And the RIGHT clubs: the bottom of the top flight's final table and the
       top of the second's. */
    const topSet = new Set(prevTop), secondSet = new Set(prevSecond);
    if (read.top.length !== 20 || read.second.length !== 20) fail(`summer ${season}: the final tables read ${read.top.length} and ${read.second.length} rows`);
    const wantDown = read.top.filter(c => topSet.has(c)).slice(-EXPECT_DROP).sort().join('|');
    const wantUp = read.second.filter(c => secondSet.has(c)).slice(0, EXPECT_DROP).sort().join('|');
    if ([...down].sort().join('|') !== wantDown) fail(`summer ${season}: down ${down.join(', ')}, the table's bottom ${EXPECT_DROP} were ${wantDown}`);
    if ([...up].sort().join('|') !== wantUp) fail(`summer ${season}: up ${up.join(', ')}, the table's top ${EXPECT_DROP} were ${wantUp}`);
    moves += up.length + down.length;
    const wasIn = prevTop.includes(before.clubName) ? 'synthTop' : 'synthSecond';
    const nowIn = cm.careerLeagueOf(next).id;
    if (nowIn !== wasIn) myMoves += 1;
    const expectIn = up.includes(before.clubName) ? 'synthTop' : down.includes(before.clubName) ? 'synthSecond' : wasIn;
    if (nowIn !== expectIn) fail(`summer ${season}: my club plays in ${nowIn}, the table put it in ${expectIn}`);
    if (next.leagueClubs.length !== 20) fail(`summer ${season}: my next league has ${next.leagueClubs.length} clubs`);
  }, readTables);
  if (summers !== 10) fail(`${summers} summers ran, expected 10`);
  console.log(`   ${summers} summers, ${moves} club moves, my club changed division ${myMoves} times`);
}

async function partCupless() {
  console.log('4b) a synthetic league with no domestic cup, ten seasons');
  const mod = await bundleEngine(src => injectSynthetic(src));
  const { cm } = mod;
  const lg = cm.REAL_LEAGUES.find(l => l.id === 'synthNoCup');
  if (!lg) { fail('the cupless league did not reach REAL_LEAGUES'); return; }
  if (lg.cupName !== null) fail(`the cupless league's def carries cup ${lg.cupName}`);
  let summers = 0, matches = 0, cupWeeks = 0, cupObjectives = 0, cupResults = 0, cupTrophies = 0;
  const check = (s, label) => {
    cupWeeks += s.calendar.filter(e => e.type === 'cup').length;
    cupObjectives += (s.boardObjectives ?? []).filter(o => o.id === 'cup' || o.id === 'double').length;
    if (s.cupBracket && s.cupBracket.length) fail(`${label}: a cup bracket was drawn`);
    if (Object.keys(s.cupDraw ?? {}).length) fail(`${label}: a cup opponent was drawn`);
    if (s.cupRound !== 'out' || s.cupExit) fail(`${label}: cupRound ${s.cupRound}, cupExit ${s.cupExit}`);
    if (cm.careerLeagueOf(s).cupName !== null) fail(`${label}: the save reads a cup name`);
  };
  tenSeasons(cm, SYNTH_NOCUP[0], 'cupless', ({ season, before, fin, next }) => {
    summers += 1;
    if (season === 1) check(before, 'season 1');
    for (const r of before.resultLog ?? []) { matches += 1; if (r.competition === 'cup') cupResults += 1; }
    cupTrophies += before.trophies.filter(t => t.emoji === '🏅').length;
    const cupGraded = (fin.summary.objectives ?? []).filter(o => /\bcup\b|double/i.test(o.label));
    if (cupGraded.length) fail(`summer ${season}: the season review grades a cup: ${cupGraded.map(o => o.label).join(' | ')}`);
    check(next, `season ${season + 1}`);
    const ov = next.leagueOverrides?.synthNoCup;
    if (ov) fail(`summer ${season}: the cupless league's membership moved`);
  });
  if (summers !== 10) fail(`${summers} summers ran, expected 10`);
  if (matches < 300) fail(`only ${matches} matches were logged across ten seasons, the seasons did not run`);
  if (cupWeeks) fail(`${cupWeeks} cup weeks were scheduled`);
  if (cupObjectives) fail(`${cupObjectives} cup objectives were set`);
  if (cupResults) fail(`${cupResults} cup matches were played`);
  if (cupTrophies) fail(`${cupTrophies} cup trophies were lifted`);
  /* The same engine still runs the cup where there is one: the synthetic
     top flight's nation has the Synth Cup. */
  Math.random = seeded(7);
  const withCup = cm.startCareer(SYNTH_TOP[0], 'now');
  Math.random = REAL_RANDOM;
  if (withCup.calendar.filter(e => e.type === 'cup').length !== 4) fail('a league with a cup lost its four cup weeks');
  if (!withCup.cupBracket?.length) fail('a league with a cup drew no bracket');
  console.log(`   ${summers} summers, ${matches} matches, ${cupWeeks} cup weeks, ${cupObjectives} cup objectives, ${cupResults} cup matches; the cup league next door still plays its four rounds`);
}

/* Round 832 review: two more shapes the table can now express as rows only,
   both broken in the engine until the review. A THIRD TIER (a second tier
   that names a second tier of its own) and a CUPLESS LEAGUE INSIDE A NATION
   THAT HAS A CUP. Measured before the fixes with these same rows: the chain
   put clubs in two divisions from the first summer (57 distinct clubs of 60
   by summer 1, 44 by summer 10, the top flight down to 13), and three clubs
   of the cupless league turned up in three FA Cup style brackets. */
const CHAIN_A = Array.from({ length: 20 }, (_, i) => `Chainalpha United ${i + 1}`);
const CHAIN_B = Array.from({ length: 20 }, (_, i) => `Chainbeta City ${i + 1}`);
const CHAIN_C = Array.from({ length: 20 }, (_, i) => `Chaingamma Town ${i + 1}`);
const CHAIN_NOCUP = Array.from({ length: 18 }, (_, i) => `Chainland Nocup ${i + 1}`);
const CHAIN_DROP = { chainA: 3, chainB: 2 };

function injectShapes(src) {
  const once = (needle, label) => {
    const n = src.split(needle).length - 1;
    if (n !== 1) { console.error(`shapes cannot be added: ${label} appears ${n} times in clubManager.ts`); process.exit(1); }
  };
  const rulesAnchor = 'export const LEAGUE_RULES: Record<string, LeagueRules> = {\n';
  const leaguesAnchor = 'export const REAL_LEAGUES: LeagueDef[] = [\n';
  const nationsAnchor = '].map(n => ({ ...n, leagueIds:';
  once(rulesAnchor, 'the LEAGUE_RULES opening');
  once(leaguesAnchor, 'the REAL_LEAGUES opening');
  once(nationsAnchor, 'the NATIONS closing');
  let out = src;
  if (CONTROL === 'chainstart') {
    const fixed = 'const topClubs = next[pyr.top] ?? topDef.clubs;\n    const secondClubs = next[pyr.second] ?? secondDef.clubs;';
    if (out.split(fixed).length !== 2) { console.error('control chainstart cannot run: the summer does not read this summer\'s memberships in the shape it reverts'); process.exit(1); }
    out = out.replace(fixed, 'const topClubs = carried?.[pyr.top] ?? topDef.clubs;\n    const secondClubs = carried?.[pyr.second] ?? secondDef.clubs;');
    console.log('NEGATIVE CONTROL ON: the summer reads the memberships the season started with, part shapes must go red');
  }
  if (CONTROL === 'cupfield') {
    const fixed = 'nation.leagueIds.filter(id => leagueRulesOf(id).cup === myLeague.cupName)';
    if (out.split(fixed).length !== 2) { console.error('control cupfield cannot run: the cup field is not filtered by cup in the shape it reverts'); process.exit(1); }
    out = out.replace(fixed, 'nation.leagueIds');
    console.log('NEGATIVE CONTROL ON: the cup draws from every league of the nation, cup or not, part shapes must go red');
  }
  const rules = [
    `  chainA: { nationId: 'chainland', flag: '', cup: 'Chain Cup', europe: null, drop: ${CHAIN_DROP.chainA}, secondTier: 'chainB', ladder: 'top', season: 'autumnSpring' },`,
    `  chainB: { nationId: 'chainland', flag: '', cup: 'Chain Cup', europe: null, drop: ${CHAIN_DROP.chainB}, secondTier: 'chainC', ladder: 'promotion', playoff: { rankUpTo: 8, target: 6, label: 'Make the promotion playoffs' }, season: 'autumnSpring' },`,
    `  chainC: { nationId: 'chainland', flag: '', cup: 'Chain Cup', europe: null, drop: 0, ladder: 'promotion', playoff: { rankUpTo: 8, target: 6, label: 'Make the promotion playoffs' }, season: 'autumnSpring' },`,
    `  chainNoCup: { nationId: 'chainland', flag: '', cup: null, europe: null, drop: 0, ladder: 'top', season: 'autumnSpring' },`,
  ].join('\n') + '\n';
  const rows = [
    `  { id: 'chainA', name: 'Chain First Division', clubs: ${JSON.stringify(CHAIN_A)} },`,
    `  { id: 'chainB', name: 'Chain Second Division', clubs: ${JSON.stringify(CHAIN_B)} },`,
    `  { id: 'chainC', name: 'Chain Third Division', clubs: ${JSON.stringify(CHAIN_C)} },`,
    `  { id: 'chainNoCup', name: 'Chain Cupless League', clubs: ${JSON.stringify(CHAIN_NOCUP)} },`,
  ].join('\n') + '\n';
  out = out.replace(rulesAnchor, rulesAnchor + rules);
  out = out.replace(leaguesAnchor, leaguesAnchor + rows);
  out = out.replace(nationsAnchor, `  { id: 'chainland', name: 'Chainland', flag: '' },\n` + nationsAnchor);
  return out;
}

async function partShapes() {
  console.log('4c) a three tier chain and a cupless league in a nation with a cup, ten seasons');
  const mod = await bundleEngine(src => injectShapes(src));
  const { cm } = mod;
  const pyr = cm.PYRAMIDS.filter(p => p.top.startsWith('chain')).map(p => `${p.top}>${p.second}:${p.count}`).join(' ');
  if (pyr !== 'chainA>chainB:3 chainB>chainC:2') fail(`the chain reads as ${pyr}`);
  const union = [...CHAIN_A, ...CHAIN_B, ...CHAIN_C].sort().join('|');
  const ids = ['chainA', 'chainB', 'chainC'];
  const finals = fin => {
    const s = fin.state;
    const now = Object.fromEntries(ids.map(id => [id, s.leagueOverrides?.[id] ?? cm.REAL_LEAGUES.find(l => l.id === id).clubs]));
    const myId = ids.find(id => now[id].includes(s.clubName));
    const tableOf = id => (myId === id ? cm.sortedLeagueTable(s) : cm.sortedWorldTable(s, id, s.world?.[id]?.table ?? [])).map(r => r.club);
    return { now, tables: Object.fromEntries(ids.map(id => [id, tableOf(id)])), cup: (s.cupBracket ?? []).flatMap(t => [t.home, t.away]) };
  };
  let summers = 0, brokenSummers = 0, cupless = 0, brackets = 0, myMoves = 0;
  tenSeasons(cm, CHAIN_A[0], 'chain', ({ season, before, next, read }) => {
    summers += 1;
    const after = Object.fromEntries(ids.map(id => [id, next.leagueOverrides?.[id] ?? []]));
    const all = ids.flatMap(id => after[id]);
    const sizes = ids.map(id => after[id].length).join('/');
    const twice = all.length - new Set(all).size;
    let bad = 0;
    if (sizes !== '20/20/20') { bad += 1; fail(`summer ${season}: the divisions hold ${sizes}`); }
    if (twice) { bad += 1; fail(`summer ${season}: ${twice} club(s) sit in two divisions`); }
    if ([...new Set(all)].sort().join('|') !== union) { bad += 1; fail(`summer ${season}: the three divisions no longer hold the same sixty clubs (${new Set(all).size} distinct)`); }
    /* and the right clubs: A's bottom three down, B's top three up, B's
       bottom two (of the clubs that stayed) down, C's top two up */
    const { now, tables } = read;
    const inOf = id => tables[id].filter(c => now[id].includes(c));
    const want = {
      downA: inOf('chainA').slice(-3), upB: inOf('chainB').slice(0, 3),
      downB: inOf('chainB').slice(-2), upC: inOf('chainC').slice(0, 2),
    };
    const has = (id, c) => after[id].includes(c);
    for (const c of want.downA) if (!has('chainB', c)) { bad += 1; fail(`summer ${season}: ${c} finished in A's bottom three and is not in B`); }
    for (const c of want.upB) if (!has('chainA', c)) { bad += 1; fail(`summer ${season}: ${c} finished in B's top three and is not in A`); }
    for (const c of want.downB) if (!has('chainC', c)) { bad += 1; fail(`summer ${season}: ${c} finished in B's bottom two and is not in C`); }
    for (const c of want.upC) if (!has('chainB', c)) { bad += 1; fail(`summer ${season}: ${c} finished in C's top two and is not in B`); }
    if (bad) brokenSummers += 1;
    /* my own club goes where its table put it (read off the memberships the
       finished season ran under, not the registered ones) */
    const wasIn = ids.find(id => now[id].includes(before.clubName));
    const nowIn = cm.careerLeagueOf(next).id;
    const expectIn = want.downA.includes(before.clubName) || want.upC.includes(before.clubName) ? 'chainB'
      : want.upB.includes(before.clubName) ? 'chainA' : want.downB.includes(before.clubName) ? 'chainC' : wasIn;
    if (nowIn !== expectIn) fail(`summer ${season}: my club plays in ${nowIn}, its table put it in ${expectIn}`);
    if (nowIn !== wasIn) myMoves += 1;
    /* the cup the season just played drew nobody from the cupless league */
    brackets += 1;
    cupless += read.cup.filter(c => CHAIN_NOCUP.includes(c)).length;
  }, finals);
  if (summers !== 10) fail(`${summers} summers ran, expected 10`);
  if (cupless) fail(`${cupless} clubs of a league with no domestic cup were drawn into the Chain Cup over ${brackets} brackets`);
  if (brackets < 10) fail(`only ${brackets} cup brackets were read`);
  console.log(`   ${summers} summers, ${brokenSummers} broken, my club changed division ${myMoves} times; ${brackets} cup brackets, ${cupless} cupless clubs in them`);
}

/* ------------------------------------------------------------------ */
/* Each era's squads in a chunk of their own, on the built files        */
/* ------------------------------------------------------------------ */

async function partChunks() {
  console.log('5) the built chunks: each era in its own chunk, reached only by a dynamic import');
  /* CM_RULES_DIST reads another build (the real static import control). */
  const distRoot = path.resolve(process.env.CM_RULES_DIST || path.join(SCRIPT_ROOT, 'dist'));
  let dir = path.join(distRoot, 'assets');
  if (!fs.existsSync(dir)) { console.log('   (no build in dist/, skipped: run vite build first)'); return; }
  const mod = await bundleEngine(null);
  await mod.eras.ensureAllEraRosters?.();
  const worlds = { now: mod.cm.CM_ROSTERS, ...mod.eras.HISTORIC_ROSTERS };
  if (Object.keys(worlds).length !== 4) { fail(`the bundle holds ${Object.keys(worlds).length} worlds`); return; }
  /* A probe is the start of one roster row as the minifier prints it, for a
     plain ASCII name, kept only when no other world has the same name, age
     and position, so a probe found in a file belongs to exactly one world. */
  const keyOf = p => `{n:${JSON.stringify(p.n)},p:${JSON.stringify(p.p)},a:${p.a},`;
  const owners = new Map();
  for (const [w, rosters] of Object.entries(worlds)) {
    for (const roster of Object.values(rosters)) for (const p of roster) {
      if (!/^[A-Za-z .'-]+$/.test(p.n) || p.n.includes("'")) continue;
      const k = keyOf(p);
      owners.set(k, owners.has(k) && owners.get(k) !== w ? null : w);
    }
  }
  const probes = {};
  for (const [k, w] of owners) if (w) (probes[w] ??= []).push(k);
  for (const w of Object.keys(worlds)) {
    probes[w] = (probes[w] ?? []).slice(0, 40);
    if (probes[w].length < 20) { fail(`only ${probes[w].length} probes for ${w}`); return; }
  }
  if (CONTROL === 'staticbuild') {
    /* The literal control: the engine built by a real code splitting bundler
       (esbuild, minified, the same row shape) with clubManagerEras.ts given a
       static import of the 2010 bake beside its dynamic one, the shape every
       era had before this round. The check must find the 2010 rows outside
       a chunk of their own. A full vite build takes over five minutes on a
       loaded machine, so this stands in for it. */
    const out = path.join(TMP, 'staticbuild', 'assets');
    const erasPath = path.join(ROOT, 'src', 'lib', 'clubManagerEras.ts');
    const importAnchor = "import type { BakedPlayer } from '@/data/clubManagerRosters';";
    const regAnchor = 'export const HISTORIC_ROSTERS: Record<string, Record<string, BakedPlayer[]>> = {};';
    await build({
      stdin: { contents: `export * from '${ROOT_FWD}/src/lib/clubManager.ts';`, resolveDir: ROOT, loader: 'ts' },
      bundle: true, splitting: true, format: 'esm', platform: 'node', minify: true,
      outdir: out, alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
      plugins: [{
        name: 'static-era',
        setup(b) {
          b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManagerEras\.ts$/ }, a => {
            let src = fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n');
            if (path.resolve(a.path) === path.resolve(erasPath)) {
              if (src.split(importAnchor).length !== 2 || src.split(regAnchor).length !== 2) { console.error('control cannot run: the anchors it patches are not in clubManagerEras.ts once each'); process.exit(1); }
              src = src.replace(importAnchor, `${importAnchor}\nimport { ERA2010_ROSTERS as STATIC_2010 } from '@/data/clubManagerEra2010';`)
                .replace(regAnchor, `${regAnchor}\nHISTORIC_ROSTERS.era2010 = STATIC_2010;`);
            }
            return { contents: src, loader: 'ts', resolveDir: path.dirname(a.path) };
          });
        },
      }],
    });
    console.log('NEGATIVE CONTROL ON: a split build with the 2010 bake imported statically, part chunks must go red');
    dir = out;
  }
  if (CONTROL === 'static') {
    /* What a static import of an era does to a build: its rows land in a
       chunk the engine reaches without asking (here, the engine chunk
       itself) and that chunk names the era chunk in a static import. Done to
       a copy of dist/assets, so the real build is untouched. */
    const copy = path.join(TMP, 'assets');
    fs.cpSync(dir, copy, { recursive: true });
    const files = fs.readdirSync(copy).filter(f => f.endsWith('.js'));
    const engine = files.find(f => probes.now.some(k => fs.readFileSync(path.join(copy, f), 'utf8').includes(k)));
    const era = files.find(f => probes.era2010.some(k => fs.readFileSync(path.join(copy, f), 'utf8').includes(k)));
    if (!engine || !era || engine === era) { console.error('control cannot run: the engine chunk and the 2010 chunk are not two separate files in this build'); process.exit(1); }
    fs.appendFileSync(path.join(copy, engine), `\nimport"./${era}";\nconst __planted=[${probes.era2010.slice(0, 5).map(k => `${k}v:1,r:1}`).join(',')}];\n`);
    console.log(`NEGATIVE CONTROL ON: ${engine} imports ${era} statically and carries 2010 rows, part chunks must go red`);
    dir = copy;
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  const text = new Map(files.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const holders = w => files.filter(f => probes[w].some(k => text.get(f).includes(k)));
  const engineFiles = holders('now');
  if (engineFiles.length !== 1) { fail(`today's rosters sit in ${engineFiles.length} files: ${engineFiles.join(', ')}`); return; }
  const engine = engineFiles[0];
  const eraChunks = {};
  for (const w of Object.keys(worlds).filter(x => x !== 'now')) {
    const hs = holders(w);
    if (hs.length !== 1) fail(`${w}'s rosters sit in ${hs.length} files: ${hs.join(', ')}`);
    /* The era's own chunk is the holder that is not the engine; the import
       checks below run on it even when the rows also leaked elsewhere. */
    const f = hs.find(h => h !== engine) ?? hs[0];
    if (!f) continue;
    eraChunks[w] = f;
    const found = probes[w].filter(k => text.get(f).includes(k)).length;
    if (found !== probes[w].length) fail(`${w}'s chunk ${f} holds ${found} of its ${probes[w].length} probe rows`);
    if (f === engine) fail(`${w}'s rosters are in the engine chunk ${f}`);
    for (const other of Object.keys(worlds)) if (other !== w && probes[other].some(k => text.get(f).includes(k))) fail(`${w}'s chunk ${f} also carries ${other} rows`);
  }
  for (const [w, f] of Object.entries(eraChunks)) {
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const staticRe = new RegExp(`(?:import|export)\\s*(?:[^"'()]*?from\\s*)?["']\\./${esc}["']`);
    const dynamicRe = new RegExp(`import\\(\\s*["']\\./${esc}["']\\s*\\)`);
    const statics = files.filter(g => staticRe.test(text.get(g)));
    const dynamics = files.filter(g => dynamicRe.test(text.get(g)));
    if (statics.length) fail(`${w}'s chunk ${f} is imported statically by ${statics.join(', ')}`);
    if (!dynamics.length) fail(`nothing imports ${w}'s chunk ${f} dynamically, so nothing can load it`);
    const indexHtml = path.join(distRoot, 'index.html');
    if (fs.existsSync(indexHtml) && fs.readFileSync(indexHtml, 'utf8').includes(f)) fail(`dist/index.html preloads ${w}'s chunk ${f}`);
    console.log(`   ${w}: ${f}, ${probes[w].length} probe rows, reached by import() from ${dynamics.length} file(s), statically from ${statics.length}`);
  }
  console.log(`   today's rosters: ${engine}`);
}

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

function controlDropCount(src) {
  /* Austria drops one. Before this round that was an id in a chain of ifs
     inside relegationSpots; since it is one row of the rules table. Either
     shape is rewritten to two, and a run that finds neither refuses. */
  const rowRe = /(\n\s*austria: \{[^\n]*?\bdrop: )1\b/;
  if (rowRe.test(src)) { console.log('NEGATIVE CONTROL ON: Austria drops 2 in the rules row, part pure must go red'); return src.replace(rowRe, '$12'); }
  const old = "leagueId === 'austria' || ";
  if (src.includes(old)) { console.log('NEGATIVE CONTROL ON: Austria leaves the drop-one chain, part pure must go red'); return src.replace(old, ''); }
  console.error('control cannot run: neither the rules row nor the old chain names Austria\'s drop count');
  process.exit(1);
}

function controlThinTier(src) {
  /* Round 832 review: the Premier League's row made to send 25 down, more
     clubs than either division holds. Part pure's table check (3b) must name
     it (the digest differs too, which is not what this control is about). */
  const row = /(\n\s*premier: \{[^\n]*?\bdrop: )3(,[^\n]*?secondTier: 'championship')/;
  if (!row.test(src)) { console.error('control thintier cannot run: the Premier League row does not drop 3 into the Championship'); process.exit(1); }
  console.log('NEGATIVE CONTROL ON: the Premier League drops 25 into a 24 club Championship, part pure\'s table check must go red');
  return src.replace(row, '$125$2');
}

/* ------------------------------------------------------------------ */

const PART_FNS = { modern: partModern, eras: partEras, pure: partPure, drop4: partDrop4, cupless: partCupless, shapes: partShapes, chunks: partChunks };
for (const p of PARTS) {
  const fn = PART_FNS[p];
  if (!fn) { console.log(`(part ${p} is not built yet)`); continue; }
  await fn();
}

if (WRITE) {
  const next = { note: 'Round 832 baseline: hashes of seeded Club Manager seasons and pure league rules. Rewrite only for a change meant to move the game.', parts: { ...baseline.parts, ...written } };
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(next, null, 1) + '\n');
  console.log(`baseline written for ${Object.keys(written).join(', ')} from ${ROOT_FWD}`);
}

if (failures) {
  console.error(`\nsimCmLeagueRules: ${failures} failure(s)${CONTROL ? ` (control ${CONTROL})` : ''}`);
  process.exit(1);
}
if (CONTROL) {
  console.error(`\nsimCmLeagueRules: control ${CONTROL} was ON and nothing failed, so the control did not fire`);
  process.exit(0);
}
console.log(`\nsimCmLeagueRules: all checks passed (${PARTS.join(', ')})`);

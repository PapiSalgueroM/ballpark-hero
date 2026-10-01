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
      3fb92eea, then re-taken on the merged main before the final gate).
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
     CM_RULES_CONTROL=static     the chunk check reads a copy of the engine
                                 chunk with an era roster block planted in it
                                 (the shape a static era import produces), part
                                 chunks must go red. The real static import is
                                 also proven red by building with it, see the
                                 Round 832 notes in the header of
                                 src/lib/clubManagerEras.ts.

   Run: node scripts/simCmLeagueRules.mjs [--part=modern|eras|pure|synthetic|chunks] [--write]
   --write rewrites the baseline for the parts run, from this tree. Only do
   that for a change that is MEANT to move the game, and say why in the
   commit.
*/
import { build } from 'esbuild';
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
const PARTS = partArg ? partArg.slice(7).split(',') : ['modern', 'eras', 'pure', 'synthetic', 'chunks'];
const CONTROL = process.env.CM_RULES_CONTROL || '';
const CONTROLS = ['dropcount', 'fourth', 'static'];
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
          let src = fs.readFileSync(args2.path, 'utf8');
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
  if (saves.length !== 20) fail(`the game has ${saves.length} modern leagues where this round found 20 (a league added later regenerates the baseline on purpose)`);
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
  if (saves.length !== 7) fail(`the eras hold ${saves.length} leagues where this round found 7`);
  const got = await digestSaves(saves, mod);
  if (WRITE) written.eras = got; else compare('eras', got, baseline.parts.eras);
}

async function partPure() {
  console.log('3) digest, the pure rules: drop zones, European places, board demands, the exported views');
  const transform = src => {
    let s = exposePrivates(src);
    if (CONTROL === 'dropcount') s = controlDropCount(s);
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
}

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

function controlDropCount(src) {
  /* Austria drops one. Before this round that was an id in a chain of ifs
     inside relegationSpots; since it is one row of the rules table. Either
     shape is rewritten to two, and a run that finds neither refuses. */
  const rowRe = /(\n\s*austria:\s*\{[^}]*?drop:\s*)1\b/;
  if (rowRe.test(src)) { console.log('NEGATIVE CONTROL ON: Austria drops 2 in the rules row, part pure must go red'); return src.replace(rowRe, '$12'); }
  const old = "leagueId === 'austria' || ";
  if (src.includes(old)) { console.log('NEGATIVE CONTROL ON: Austria leaves the drop-one chain, part pure must go red'); return src.replace(old, ''); }
  console.error('control cannot run: neither the rules row nor the old chain names Austria\'s drop count');
  process.exit(1);
}

/* ------------------------------------------------------------------ */

const PART_FNS = { modern: partModern, eras: partEras, pure: partPure };
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

/**
 * Round 612: season one's Champions League field is who really qualified.
 *
 * WHY THIS EXISTS. A player reported on 2026-09-10 that a 2026-27 Club Manager
 * save put a club that missed the places into the Champions League. Round 547
 * derived the field from final tables, but only from season two, because the
 * save has no last season to read on day one. So season one kept the old
 * answer: startCareer put any club with club.tier <= 2 in Europe and drew its
 * opponents from a prestige pool. Chelsea finished 10th in 2025-26 and started
 * in the group stage. Round 612 made the real 2025-26 final tables data
 * (src/data/clubManagerFinalTables2025_26.ts, two source verified) and hands
 * them to the same rule the rollover uses, now shared as uclFieldFromTables.
 *
 * WHAT THIS HOLDS:
 *   1. The data file is well formed: every club is an exact member of its
 *      league's clubs array, no club twice, every league has both source
 *      families with URLs and read dates, the holders are a real club, the
 *      tables are the season before the modern era's season one, and
 *      CM_FINAL_TABLES_PARTIAL is exactly the European leagues with no table.
 *   2. A new 2026-27 career's field equals the rule applied to the data file,
 *      computed here independently, in order, whoever you manage.
 *   3. Your club is in Europe exactly when it earned a place (a league place
 *      or the holders), for every club of every European league, and the
 *      board's Champions League objective follows. The fill place tops up the
 *      AI field and never hands you a group: Hoffenheim (5th, fill) start
 *      outside. Chelsea start outside it, Aston Villa inside, with their group
 *      and the other seven groups drawn from the field.
 *   4. PSG are in as the holders, and the holders' route really runs: with PSG
 *      moved out of Ligue 1's places in memory, they are still in, and so is
 *      a PSG career.
 *   5. Every European league's verified qualifiers are in the field.
 *   6. A historic era's season one is byte identical to the reference's.
 *   7. A custom club starts outside Europe, byte identical to the reference's.
 *   8. The rollover's field (uclQualifiersFrom) equals the rule written out
 *      here over the tables the save finished with, and it and the whole
 *      season two it builds are byte identical to the reference's on fixed
 *      seeded careers, including one whose season one was played on the
 *      reference.
 *   9. A season one save written by the reference loads and plays a whole
 *      season byte identical to the reference, its stored group never rewritten.
 *  10. A European league marked in CM_FINAL_TABLES_PARTIAL (none is today, so
 *      the harness marks one in memory) sends nobody off a table, its own
 *      clubs keep the old squad tier rule, and every other league is untouched.
 *  11. Liverpool and Real Betis, 5th and really in through their country's
 *      European Performance Spot, start outside Europe because the game gives
 *      England and Spain 4 places. That is held on purpose until the owner
 *      decides whether to model the extra spots, so it cannot change by accident.
 *
 * THE REFERENCE, for sections 6 to 9, is the day one from before Round 612.
 *   Before Round 612 is on main: a real bundle of origin/main as this branch
 *   left it (the merge base, so later commits on main are not mistaken for
 *   this branch's), every src file that differs loaded from `git show`.
 *   UCL_S1_BASE=<ref> uses another ref's merge base.
 *   Once the base carries Round 612 (after the merge, and on every branch cut
 *   from main since), that base is this engine, and comparing against it is
 *   the engine against itself: the Round 612 review ran exactly that and
 *   section 9 went red for good. So the reference becomes THIS engine with
 *   season one's derived field switched off (the call the tier control
 *   nulls), which is the old day one on top of whatever main has since, so
 *   later rounds never turn these sections red. The rollover code is then the
 *   same on both sides, which is why section 8 also holds it to the rule
 *   written out here. It refuses to run if that switch is not there exactly
 *   once.
 * Math.random and Date.now are pinned for every compared step, and each
 * comparison first proves the engine agrees with itself on the same seed, so
 * a green is not two noisy runs happening to match.
 *
 * NEGATIVE CONTROLS, UCL_S1_CONTROL=<name>. Each rewrites the bundle of THIS
 * branch's engine before it is imported (vacuous swaps the reference
 * instead), refuses to run unless its target appears exactly once, and must
 * turn its sections red, with either kind of reference:
 *   tier      restore the tier based seeding (no field on day one)     2, 3
 *   holders   drop the holders from season one's call to the rule       4
 *   datafile  move Chelsea into 4th in the engine's copy of the data    2, 3, 5
 *   name      misspell Aston Villa in the engine's copy of the data     1
 *   historic  let the 2025-26 tables reach a historic era               6
 *   custom    hand a custom club's season one the derived field         7
 *   rollover  make the shared rule skip every league's champion         8
 *   rewrite   make loadCareer rewrite a pre Round 612 season one group  9
 *   partial   ignore CM_FINAL_TABLES_PARTIAL                            10
 *   fill      your club qualifies off the whole field, fill included   3, 10
 *   ownholders  your club's qualification drops the holders' route     4
 *   places    give the Premier League a fifth place (others go red too:
 *             no fill place is left, the rollover changes)               11
 *   vacuous   the reference is this engine as it stands, season one on,
 *             which is what the harness compared against after a merge
 *             before the Round 612 review                               9
 *
 * Run: node scripts/simUclSeasonOne.mjs      (no database)
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const git = cmd => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let failures = 0;
let section = '';
const redSections = new Set();
const fail = m => { failures += 1; redSections.add(section); console.error('  FAIL: ' + m); };
const run = async (id, title, body) => {
  section = id;
  console.log(`${id}) ${title}`);
  const before = failures;
  let note = '';
  try { note = (await body()) || ''; } catch (e) { fail(`threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
  if (failures === before && note) console.log(`   ${note}`);
};

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

const PREMIER_2025_26 = ['Arsenal', 'Manchester City', 'Manchester United', 'Aston Villa', 'Liverpool', 'Bournemouth', 'Sunderland', 'Brighton', 'Brentford', 'Chelsea'];
const seqRe = names => new RegExp(names.map(n => JSON.stringify(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(',\\s*'), 'g');
const quoteList = names => names.map(n => JSON.stringify(n)).join(', ');

const CONTROLS = {
  tier: {
    red: ['2', '3'],
    what: 'season one seeded by squad tier and the prestige pool again',
    re: /custom \? null : seasonOneUclField\((\w+)\.id\)/g,
    to: () => 'null',
  },
  holders: {
    red: ['4'],
    what: 'season one hands the rule no holders',
    re: /uclFieldFromTables\((\w+), CM_FINAL_TABLES_2025_26\.holders\)/g,
    to: (_m, tables) => `uclFieldFromTables(${tables}, null)`,
  },
  datafile: {
    red: ['2', '3', '5'],
    what: "Chelsea moved into 4th in the engine's copy of the 2025-26 Premier League",
    re: seqRe(PREMIER_2025_26),
    to: () => quoteList(['Arsenal', 'Manchester City', 'Manchester United', 'Chelsea', 'Aston Villa', 'Liverpool', 'Bournemouth', 'Sunderland', 'Brighton', 'Brentford']),
  },
  name: {
    red: ['1'],
    what: "Aston Villa misspelled in the engine's copy of the data",
    re: seqRe(PREMIER_2025_26),
    to: () => quoteList(PREMIER_2025_26.map(n => (n === 'Aston Villa' ? 'Aston Villa FC' : n))),
  },
  historic: {
    red: ['6'],
    what: 'the 2025-26 tables reach a historic era',
    re: /if \(isHistoricEra\((\w+)\.id\) \|\| \1\.startYear !== CM_FINAL_TABLES_2025_26\.startYear \+ 1\)\s*return null;/g,
    to: () => '',
  },
  custom: {
    red: ['7'],
    what: "a custom club's season one gets the derived field",
    re: /custom \? null : seasonOneUclField\((\w+)\.id\)/g,
    to: (_m, era) => `seasonOneUclField(${era}.id)`,
  },
  rollover: {
    red: ['8'],
    what: "the shared rule skips every league's champion",
    re: /(\w+)\.clubs\.slice\(0, uclPlacesIn\(\1\.league\)\)/g,
    to: (_m, t) => `${t}.clubs.slice(1, 1 + uclPlacesIn(${t}.league))`,
  },
  fill: {
    red: ['3', '10'],
    what: "your club qualifies off the whole field again, fill place included",
    re: /(\w+) && seasonOneTableOf\((\w+)\.id\) \? uclDirectQualifiersFromTables\(seasonOneTables\(\), CM_FINAL_TABLES_2025_26\.holders\)\.includes\((\w+)\.name\)/g,
    to: (_m, field, league, club) => `${field} && seasonOneTableOf(${league}.id) ? ${field}.includes(${club}.name)`,
  },
  ownholders: {
    red: ['4'],
    what: "your club's own qualification ignores the holders' route",
    re: /uclDirectQualifiersFromTables\(seasonOneTables\(\), CM_FINAL_TABLES_2025_26\.holders\)/g,
    to: () => 'uclDirectQualifiersFromTables(seasonOneTables(), null)',
  },
  places: {
    red: ['11'],
    what: 'the Premier League gets a fifth Champions League place',
    re: /premier: \{ ucl: 4, uel: 5, uecl: 6 \}/g,
    to: () => 'premier: { ucl: 5, uel: 6, uecl: 7 }',
  },
  vacuous: {
    red: ['9'],
    on: 'reference',
    what: 'the reference is this engine with season one left on, so sections 6 to 9 compare it with itself',
    re: /custom \? null : seasonOneUclField\((\w+)\.id\)/g,
  },
  partial: {
    red: ['10'],
    what: 'CM_FINAL_TABLES_PARTIAL is ignored, so a marked league still sends clubs off its table',
    re: /if \(CM_FINAL_TABLES_PARTIAL\.includes\((\w+)\)\)\s*return null;/g,
    to: () => '',
  },
  rewrite: {
    red: ['9'],
    what: 'loadCareer rewrites a season one group written before Round 612',
    re: /ensureBoardAsks\((\w+)\);\s*return \1;/g,
    to: (_m, p) => `ensureBoardAsks(${p}); if (${p}.season === 1 && !${p}.uclField) { ${p}.uclGroup = null; ${p}.uclWorld = void 0; } return ${p};`,
  },
};
const CONTROL = process.env.UCL_S1_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`UCL_S1_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Bundles                                                             */
/* ------------------------------------------------------------------ */

/* origin/main as this branch left it: the merge base, so commits that land on
   main after the branch was cut are not mistaken for this branch's changes. */
const BASE = process.env.UCL_S1_BASE || 'origin/main';
let baseSha = '';
try { baseSha = git(`merge-base HEAD ${BASE}`).trim(); } catch { /* reported below */ }
if (!baseSha) {
  console.error(`Cannot find where this branch left ${BASE} (a shallow clone, or no such ref), so sections 6 to 9 have nothing to compare against. Fetch it or set UCL_S1_BASE.`);
  process.exit(1);
}
/* Round 612 review: does the base already carry Round 612? Read the code, not
   a comment: the declaration itself, at the start of a line. */
const ENGINE = 'src/lib/clubManager.ts';
const baseHasRound612 = /^export function seasonOneUclField\(/m.test(git(`show ${baseSha}:${ENGINE}`));
const changedFromBase = baseHasRound612
  ? new Set()
  : new Set(git(`diff --name-only ${baseSha} -- src`).split('\n').map(s => s.trim()).filter(Boolean));
const existsAtBase = rel => { try { git(`cat-file -e ${baseSha}:${rel}`); return true; } catch { return false; } };

const TMP = os.tmpdir();
const OUT = { mine: path.join(TMP, 'uclSeasonOne.bundle.mjs'), ref: path.join(TMP, 'uclSeasonOne.ref.bundle.mjs'), data: path.join(TMP, 'uclSeasonOne.data.bundle.mjs') };
const entry = file => ({ contents: `export * as mod from '${ROOT_FWD}/${file}';`, resolveDir: ROOT, sourcefile: 'entry.mjs', loader: 'js' });
const common = { bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' };

/* The base engine: any src file this branch changed is read from the base ref. */
const fromBase = {
  name: 'from-base',
  setup(build) {
    build.onLoad({ filter: /\.(ts|tsx|js|mjs|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).replaceAll('\\', '/');
      if (!changedFromBase.has(rel)) return undefined;
      if (!existsAtBase(rel)) return { errors: [{ text: `${rel} does not exist at the base but the base engine imports it` }] };
      const ext = path.extname(rel).slice(1);
      return { contents: git(`show ${baseSha}:${rel}`), loader: ext === 'mjs' ? 'js' : ext, resolveDir: path.dirname(args.path) };
    });
  },
};

const [mineOut, dataOut, baseOut] = await Promise.all([
  esbuild.build({ ...common, stdin: entry(ENGINE) }),
  esbuild.build({ ...common, stdin: entry('src/data/clubManagerFinalTables2025_26.ts') }),
  baseHasRound612 ? null : esbuild.build({ ...common, stdin: entry(ENGINE), plugins: [fromBase] }),
]);
let mineText = mineOut.outputFiles[0].text;

/* The reference (see the header). With a base that already carries Round 612
   it is this engine with season one's derived field call nulled, taken before
   any control touches this engine. */
let refText;
let REF_LABEL;
if (baseHasRound612) {
  const SEASON_ONE_SWITCH = /custom \? null : seasonOneUclField\((\w+)\.id\)/g;
  const hits = (mineText.match(SEASON_ONE_SWITCH) || []).length;
  if (hits !== 1) {
    console.error(`${BASE}'s merge base already carries Round 612, so the reference is this engine with season one's derived field switched off, but that switch appears ${hits} times in the bundle, not exactly once. Refusing to run.`);
    process.exit(1);
  }
  refText = mineText.replace(SEASON_ONE_SWITCH, 'null');
  REF_LABEL = 'this engine with season one switched off';
} else {
  refText = baseOut.outputFiles[0].text;
  REF_LABEL = BASE;
}

if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const hits = mineText.match(c.re) || [];
  if (hits.length !== 1) {
    console.error(`CONTROL ${CONTROL}: its target appears ${hits.length} times in the bundle, not exactly once, so it refuses to run`);
    process.exit(1);
  }
  if (c.on === 'reference') {
    /* The Round 612 engine, season one on, stands in as the reference. */
    if (refText === mineText) { console.error(`CONTROL ${CONTROL} changed nothing`); process.exit(1); }
    refText = mineText;
  } else {
    const mutated = mineText.replace(c.re, c.to);
    if (mutated === mineText) { console.error(`CONTROL ${CONTROL} changed nothing`); process.exit(1); }
    mineText = mutated;
  }
  console.log(`   NEGATIVE CONTROL ON (${CONTROL}): ${c.what}. Section(s) ${c.red.join(', ')} must go red.`);
}
fs.writeFileSync(OUT.mine, mineText);
fs.writeFileSync(OUT.ref, refText);
fs.writeFileSync(OUT.data, dataOut.outputFiles[0].text);

/* One in memory localStorage shared by both engines, so a save one writes is
   the save the other opens. Installed before either bundle is evaluated. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
};

/* The engine keeps a few module level counters (youth ids, inbox ids), so the
   same call twice in one instance differs by design. Every compared run gets
   a FRESH instance of its bundle, which is what a page load is. */
let instances = 0;
const fresh = async which => (await import(`${pathToFileURL(OUT[which]).href}?instance=${++instances}`)).mod;
const mine = await fresh('mine');
const DATA = (await import(pathToFileURL(OUT.data).href)).mod;
console.log(baseHasRound612
  ? `\nBase: ${BASE} as this branch left it (${baseSha.slice(0, 8)}) already carries Round 612, so sections 6 to 9 compare against ${REF_LABEL}, and section 8 holds the rollover to the rule written out here`
  : `\nBase: ${BASE} as this branch left it (${baseSha.slice(0, 8)}). src files that differ: ${[...changedFromBase].join(', ') || 'none'}`);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const seeded = seed => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const REAL_NOW = Date.now;
/** Run fn with a pinned random stream and a pinned clock. */
const pinned = (seed, fn) => {
  const r = Math.random;
  Math.random = seeded(seed);
  Date.now = () => 1789430400000;
  try { return fn(); } finally { Math.random = r; Date.now = REAL_NOW; }
};
const json = v => JSON.stringify(v);
/** Where two JSON strings first part, for a failure message. */
const firstDiff = (a, b) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `at char ${i}: ...${a.slice(Math.max(0, i - 60), i + 60)}... vs ...${b.slice(Math.max(0, i - 60), i + 60)}...`;
};
/** Same seed, fresh instances, this branch against the reference, after
 *  proving this branch agrees with itself. Returns this branch's result and
 *  whether the reference matched it. */
const compareEngines = async (label, seed, fn) => {
  const m1 = await fresh('mine');
  const m2 = await fresh('mine');
  const r0 = await fresh('ref');
  const a1 = pinned(seed, () => json(fn(m1)));
  const a2 = pinned(seed, () => json(fn(m2)));
  const value = JSON.parse(a1);
  if (a1 !== a2) { fail(`${label}: this branch disagrees with itself on the same seed, so a comparison would mean nothing (${firstDiff(a1, a2)})`); return { ok: false, value }; }
  const b = pinned(seed, () => json(fn(r0)));
  if (a1 !== b) { fail(`${label}: differs from ${REF_LABEL} (${firstDiff(a1, b)})`); return { ok: false, value }; }
  return { ok: true, value };
};
const playSeason = (engine, s) => {
  let guard = 0;
  while (s.week < s.calendar.length && guard++ < 500) {
    const r = engine.playNextEntry(s, { skipHalftime: true });
    if (r && r.state) s = r.state; else break;
  }
  return s;
};
/** A save as a player would reopen it: written, then loaded, in that engine. */
const reopen = (engine, save) => { engine.saveCareer(save); return engine.loadCareer(); };

const { REAL_LEAGUES, EURO_SLOTS } = mine;
const euroLeagues = REAL_LEAGUES.filter(l => l.euro);

/** THE RULE applied to the data file's tables. */
function ruleFromData(data) {
  const tables = euroLeagues
    .filter(l => !data.CM_FINAL_TABLES_PARTIAL.includes(l.id) && data.CM_FINAL_TABLES_2025_26.leagues[l.id])
    .map(l => ({ id: l.id, places: EURO_SLOTS[l.id].ucl, clubs: data.CM_FINAL_TABLES_2025_26.leagues[l.id].table }));
  return ruleOver(tables, data.CM_FINAL_TABLES_2025_26.holders);
}

/** THE RULE, written out again here from its description rather than imported,
 *  over European leagues in world order: { id, places, clubs in finishing order }. */
function ruleOver(tables, holder) {
  const out = [];
  const reason = new Map();
  const add = (c, why) => { if (c && !out.includes(c)) { out.push(c); reason.set(c, why); } };
  for (const t of tables) t.clubs.slice(0, t.places).forEach((c, i) => add(c, `${t.id} ${i + 1}`));
  if (!out.length) return { field: [], reason };
  add(holder, 'holders');
  const deepest = [...tables].sort((a, b) => (b.places - a.places) || (a.id < b.id ? -1 : 1));
  for (let k = 0; out.length < 32 && k < 8; k++) {
    for (const t of deepest) {
      if (out.length >= 32) break;
      add(t.clubs[t.places + k], `${t.id} ${t.places + k + 1}, fill`);
    }
  }
  return { field: out.slice(0, 32), reason };
}
const expected = ruleFromData(DATA);
const expectedSet = new Set(expected.field);
/* The clubs that earned a place: a league place or the holders, never the fill. */
const expectedDirect = new Set(expected.field.filter(c => !expected.reason.get(c).endsWith('fill')));

/* ------------------------------------------------------------------ */
await run('1', 'The data file the engine ships is well formed', async () => {
  const T = mine.CM_FINAL_TABLES_2025_26;
  const partial = mine.CM_FINAL_TABLES_PARTIAL;
  const byId = new Map(REAL_LEAGUES.map(l => [l.id, l]));
  let clubs = 0;
  for (const [id, lt] of Object.entries(T.leagues)) {
    const lg = byId.get(id);
    if (!lg || !lg.euro) { fail(`${id} is not a European league of the 2026-27 world`); continue; }
    if (new Set(lt.table).size !== lt.table.length) fail(`${id}: a club appears twice in its table`);
    for (const c of lt.table) {
      clubs += 1;
      if (!lg.clubs.includes(c)) fail(`${id}: "${c}" is not a club string in that league`);
    }
    const places = mine.uclPlacesIn(lg);
    if (lt.table.length < places + 3) fail(`${id}: ${lt.table.length} verified places, fewer than its ${places} Champions League places plus 3`);
    for (const fam of ['official', 'press']) {
      if (!Array.isArray(lt[fam]) || !lt[fam].length) { fail(`${id}: no ${fam} source family`); continue; }
      for (const s of lt[fam]) {
        if (!/^https:\/\//.test(s.url || '')) fail(`${id}: a ${fam} source has no https URL`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s.readOn || '')) fail(`${id}: a ${fam} source has no read date`);
        if (!s.publisher) fail(`${id}: a ${fam} source has no publisher`);
      }
    }
  }
  if (!euroLeagues.some(l => l.clubs.includes(T.holders))) fail(`the holders "${T.holders}" are not a club in any European league`);
  if (!T.holdersSources.official.length || !T.holdersSources.press.length) fail('the holders are missing a source family');
  const noTable = euroLeagues.filter(l => !T.leagues[l.id]).map(l => l.id).sort();
  if (json([...partial].sort()) !== json(noTable)) fail(`CM_FINAL_TABLES_PARTIAL is ${json(partial)} but the European leagues with no table are ${json(noTable)}`);
  const now = mine.eraById(mine.DEFAULT_ERA_ID);
  if (T.startYear + 1 !== now.startYear) fail(`the tables are ${T.season} but the modern era's season one starts in ${now.startYear}`);
  if (Object.keys(T.leagues).length !== euroLeagues.length) fail(`${Object.keys(T.leagues).length} tables for ${euroLeagues.length} European leagues`);
  return `${Object.keys(T.leagues).length} leagues, ${clubs} verified places, every one a real club string; holders ${T.holders}; partial list ${json(partial)} matches`;
});

/* ------------------------------------------------------------------ */
await run('2', 'A new 2026-27 career\'s field is the rule applied to the data file', async () => {
  if (expected.field.length !== 32) fail(`the rule applied to the data gives ${expected.field.length} clubs, not 32`);
  const direct = mine.seasonOneUclField('now');
  if (json(direct) !== json(expected.field)) fail(`seasonOneUclField('now') is not the rule applied to the data: ${json(direct)}`);
  for (const club of ['Aston Villa', 'Chelsea', 'Celtic', 'Real Madrid', 'Hoffenheim']) {
    const s = pinned(612, () => mine.startCareer(club));
    if (json(s.uclField) !== json(expected.field)) {
      fail(`${club}: the stored field is ${s.uclField ? `${s.uclField.length} clubs, not the rule's` : 'missing'}${s.uclField ? ` (${firstDiff(json(s.uclField), json(expected.field))})` : ''}`);
    }
  }
  const fills = expected.field.filter(c => expected.reason.get(c).endsWith('fill'));
  return `32 clubs in the rule's order for five different managers; fill: ${fills.map(c => `${c} (${expected.reason.get(c)})`).join(', ') || 'none'}`;
});

/* ------------------------------------------------------------------ */
await run('3', 'Your club is in Europe exactly when it earned a place, never through the fill', async () => {
  const chelsea = pinned(1, () => mine.startCareer('Chelsea'));
  if (chelsea.uclGroup !== null) fail('Chelsea, 10th in 2025-26, start season one in the Champions League');
  if (chelsea.uclWorld !== undefined) fail('Chelsea are out of Europe but the save carries the other groups');
  if (chelsea.boardObjectives.some(o => o.id === 'ucl')) fail('Chelsea\'s board sets a Champions League objective for a club that is not in it');

  const villa = pinned(2, () => mine.startCareer('Aston Villa'));
  if (!villa.uclGroup) {
    fail('Aston Villa, 4th in 2025-26, do not start season one in the Champions League');
  } else {
    const premier = new Set(mine.leagueOf('Aston Villa').clubs);
    for (const opp of villa.uclGroup.opponents) {
      if (!expectedSet.has(opp)) fail(`Aston Villa's group opponent ${opp} did not qualify`);
      if (premier.has(opp)) fail(`Aston Villa's group opponent ${opp} is from their own league`);
    }
    const groups = villa.uclWorld || [];
    if (groups.length !== 7) fail(`Aston Villa's draw has ${groups.length} other groups, not 7`);
    const drawn = [villa.clubName, ...villa.uclGroup.opponents, ...groups.flatMap(g => g.clubs)];
    if (new Set(drawn).size !== drawn.length) fail('a club is drawn into two groups');
    for (const c of drawn) if (!expectedSet.has(c)) fail(`${c} is in the group stage without qualifying`);
    if (!villa.boardObjectives.some(o => o.id === 'ucl')) fail('Aston Villa are in the Champions League and their board sets no objective for it');
  }

  /* Round 612 review: the fill place tops up the AI field and must never hand
     the manager a group. A 2026-27 Hoffenheim (5th, four places) started in
     the Champions League off it, the reported bug in a new shirt. */
  const fills = expected.field.filter(c => !expectedDirect.has(c));
  if (!fills.length) fail('the rule gives no fill place on the real tables, so "never through the fill" was not exercised');
  for (const club of fills) {
    const s = pinned(300, () => mine.startCareer(club));
    if (s.uclGroup !== null) fail(`${club} (${expected.reason.get(club)}) start season one in the Champions League through the fill, without a league place`);
    if (s.boardObjectives.some(o => o.id === 'ucl')) fail(`${club} have no place and the board sets a Champions League objective`);
    if (json(s.uclField) !== json(expected.field)) fail(`${club}: the AI field lost its fill place when this club is managed`);
  }

  let checked = 0;
  let inEurope = 0;
  for (const lg of euroLeagues) {
    for (const club of lg.clubs) {
      const s = pinned(checked + 100, () => mine.startCareer(club));
      checked += 1;
      const earned = expectedDirect.has(s.clubName);
      if (!!s.uclGroup !== earned) fail(`${club} (${lg.id}): ${s.uclGroup ? `starts in Europe without a league place or the holders' route${expectedSet.has(club) ? ' (a fill place)' : ''}` : 'earned a place and starts outside Europe'}`);
      if (s.boardObjectives.some(o => o.id === 'ucl') !== !!s.uclGroup) fail(`${club}: the board's Champions League objective does not match the group`);
      if (s.uclGroup && !expectedSet.has(s.clubName)) fail(`${club} are in Europe but not in the field their opponents are drawn from`);
      if (s.uclGroup) inEurope += 1;
    }
  }
  return `Chelsea out, Aston Villa in with 8 groups of qualifiers; fill ${fills.join(', ')} kept out; ${checked} clubs across ${euroLeagues.length} leagues, ${inEurope} in Europe, each exactly when it earned a place`;
});

/* ------------------------------------------------------------------ */
await run('4', 'PSG are in as the holders, and the holders\' route really runs', async () => {
  const T = mine.CM_FINAL_TABLES_2025_26;
  if (T.holders !== 'PSG') fail(`the holders are "${T.holders}", not the game's PSG`);
  if (!expectedSet.has('PSG')) fail('PSG are not in the field');
  /* PSG also won Ligue 1, so on the real tables the holders' step adds nobody.
     To see the route itself, move PSG out of Ligue 1's places in the engine's
     own data, in memory, and ask again. */
  const ligue1 = T.leagues.ligue1.table;
  const saved = [...ligue1];
  try {
    ligue1.splice(0, ligue1.length, ...saved.filter(c => c !== 'PSG'), 'PSG');
    const field = mine.seasonOneUclField('now') || [];
    if (!field.includes('PSG')) fail('with PSG last in Ligue 1, the holders are no longer in the field');
    for (const c of ligue1.slice(0, mine.uclPlacesIn({ id: 'ligue1', euro: true }))) {
      if (!field.includes(c)) fail(`with PSG moved down, ${c} took a Ligue 1 place and is not in the field`);
    }
    if (field.length !== 32) fail(`with PSG moved down the field has ${field.length} clubs`);
    /* Round 612 review: the holders' route is a place earned, so it lets the
       manager's own club in too, where the fill never does. */
    const psg = pinned(401, () => mine.startCareer('PSG'));
    if (!psg.uclGroup) fail('with PSG last in Ligue 1, a PSG career starts outside Europe although PSG are the holders');
    const lyon = pinned(402, () => mine.startCareer('Lyon'));
    if (!lyon.uclGroup) fail('with PSG moved down, Lyon take a Ligue 1 place and a Lyon career starts outside Europe');
  } finally {
    ligue1.splice(0, ligue1.length, ...saved);
  }
  if (json(mine.seasonOneUclField('now')) !== json(expected.field)) fail('restoring Ligue 1 did not restore the field');
  return 'PSG in; moved to last in Ligue 1 they stay in as holders (a PSG career too) and Lens, Lille and Lyon take the places';
});

/* ------------------------------------------------------------------ */
await run('5', 'Every European league\'s verified qualifiers are in', async () => {
  const field = new Set(pinned(5, () => mine.startCareer('Celtic')).uclField || []);
  let n = 0;
  for (const lg of euroLeagues) {
    const lt = DATA.CM_FINAL_TABLES_2025_26.leagues[lg.id];
    if (!lt) continue;
    for (const c of lt.table.slice(0, EURO_SLOTS[lg.id].ucl)) {
      n += 1;
      if (!field.has(c)) fail(`${c}, in ${lg.id}'s verified places, is not in the field`);
    }
  }
  if (!field.has('Aston Villa')) fail('Aston Villa, 4th in the Premier League, are not in the field');
  if (field.has('Chelsea')) fail('Chelsea, 10th in the Premier League, are in the field');
  return `${n} league places across ${euroLeagues.length} leagues, all in; Chelsea not`;
});

/* ------------------------------------------------------------------ */
await run('6', `A historic era's season one is byte identical to ${REF_LABEL}`, async () => {
  const cases = [['Barcelona', 'era2015'], ['Aston Villa', 'era2015'], ['Chelsea', 'era2010'], ['Chelsea', 'era2005']];
  let groups = 0;
  for (const [i, [club, era]] of cases.entries()) {
    const { ok, value: s } = await compareEngines(`${club} ${era}`, 6000 + i, e => e.startCareer(club, era));
    if (s.uclField) fail(`${club} ${era}: a historic save carries a derived field`);
    if (ok && s.uclGroup) groups += 1;
  }
  if (!groups) fail('not one historic career started in Europe, so the era pool draw was never compared');
  return `${cases.length} historic starts identical in full, ${groups} of them with a Champions League group`;
});

/* ------------------------------------------------------------------ */
await run('7', `A custom club starts outside Europe, byte identical to ${REF_LABEL}`, async () => {
  const spec = over => ({
    name: 'Real Anthony', stadium: 'Salguero Park',
    crest: { shape: 0, pattern: 2, color1: '#7c3aed', color2: '#f8fafc', initials: 'RA' },
    budgetTier: 'big', leagueId: 'premier', replacedClub: '', ...over,
  });
  const leagues = ['premier', 'switzerland'];
  for (const [i, leagueId] of leagues.entries()) {
    const { value: s } = await compareEngines(`custom club in ${leagueId}`, 7000 + i, e => e.startCareer('Real Anthony', 'now', spec({ leagueId })));
    if (s.uclGroup !== null) fail(`a custom club in ${leagueId} starts in the Champions League`);
    if (s.uclField !== undefined) fail(`a custom club in ${leagueId} carries a season one field`);
    if (s.boardObjectives.some(o => o.id === 'ucl')) fail(`a custom club in ${leagueId} has a Champions League objective`);
  }
  return `custom clubs in ${leagues.join(' and ')} start outside Europe, identical in full`;
});

/* ------------------------------------------------------------------ */
await run('8', `The rollover's field follows the rule, and it and season two are byte identical to ${REF_LABEL}`, async () => {
  /* Two fixed seeded careers: one whose season one was played on the
     reference (the shape every live save has), one on this branch (the new
     day one). */
  const careers = [
    { label: 'Real Madrid, season one on the reference', which: 'ref', club: 'Real Madrid', seed: 8001 },
    { label: 'Aston Villa, season one on this branch', which: 'mine', club: 'Aston Villa', seed: 8002 },
    { label: 'Chelsea, season one on this branch', which: 'mine', club: 'Chelsea', seed: 8003 },
  ];
  let fields = 0;
  let byRule = 0;
  let twos = 0;
  for (const c of careers) {
    const e0 = await fresh(c.which);
    const finJson = pinned(c.seed, () => json(e0.finishSeason(playSeason(e0, e0.startCareer(c.club))).state));
    const { ok, value: field } = await compareEngines(`${c.label}: uclQualifiersFrom`, c.seed, e => e.uclQualifiersFrom(reopen(e, JSON.parse(finJson))));
    if (field.length !== 32) fail(`${c.label}: the rollover's field has ${field.length} clubs, so the comparison did not exercise a real field`);
    if (ok && field.length === 32) fields += 1;

    /* Round 612 review: the same field against the rule written out here,
       over the tables the save finished with. It needs no second engine, so
       it still guards the rollover once the reference is this same file. */
    const e1 = await fresh('mine');
    const save = reopen(e1, JSON.parse(finJson));
    const myLeagueId = e1.careerLeagueOf(save).id;
    const tables = [];
    for (const lg of e1.worldLeagueDefs(save).filter(l => l.euro)) {
      if (!EURO_SLOTS[lg.id]) { fail(`${c.label}: ${lg.id} is a European league with no EURO_SLOTS row`); continue; }
      const rows = lg.id === myLeagueId
        ? e1.sortedLeagueTable(save)
        : (save.world && save.world[lg.id] ? e1.sortedWorldTable(save, lg.id, save.world[lg.id].table) : []);
      if (rows.length) tables.push({ id: lg.id, places: EURO_SLOTS[lg.id].ucl, clubs: rows.map(r => r.club) });
    }
    const holder = (save.uclBracket || []).find(t => t.round === 'F')?.winner;
    const rule = ruleOver(tables, holder).field;
    if (tables.length < 10) fail(`${c.label}: only ${tables.length} European tables in the finished save, so the rule was not exercised`);
    if (json(field) !== json(rule)) fail(`${c.label}: the rollover's field is not the rule applied to the tables the save finished with (${firstDiff(json(field), json(rule))})`);
    else byRule += 1;

    const two = await compareEngines(`${c.label}: season two`, c.seed + 10, e => e.startNextSeason(reopen(e, JSON.parse(finJson))));
    if (json(two.value.uclField) !== json(field)) fail(`${c.label}: season two did not store the rollover's field`);
    if (two.ok) twos += 1;
  }
  return `${byRule} rollover fields of 32 follow the rule over their final tables; ${fields} fields and ${twos} whole season twos identical to the reference`;
});

/* ------------------------------------------------------------------ */
await run('9', `A season one save from before this round loads and plays unchanged`, async () => {
  /* Chelsea on the reference start in Europe by squad tier, which is exactly
     the save a player can have on disk today. It must keep that group. If the
     reference does not do that, it is not the day one from before Round 612
     and nothing below would mean anything (control: vacuous). */
  const r0 = await fresh('ref');
  const old = pinned(9001, () => r0.startCareer('Chelsea'));
  if (!old.uclGroup) { fail(`${REF_LABEL} did not put Chelsea in Europe, so it is not the day one from before Round 612 and this save does not exercise the case`); return ''; }
  if (old.uclField) { fail(`the save from ${REF_LABEL} already carries a field, so it is not a save from before this round`); return ''; }
  const oldJson = json(old);
  const { ok: loadedOk, value: loaded } = await compareEngines('loading the save', 9002, e => reopen(e, JSON.parse(oldJson)));
  if (!loaded || json(loaded.uclGroup) !== json(old.uclGroup)) fail('loading rewrote the stored Champions League group');
  if (loaded && loaded.uclField) fail('loading gave an old season one save a derived field');
  const { ok: playedOk, value: played } = await compareEngines('playing season one to the end', 9003, e => playSeason(e, reopen(e, JSON.parse(oldJson))));
  if (!played.uclGroup || json(played.uclGroup.opponents) !== json(old.uclGroup.opponents)) { fail('the group opponents changed during the season'); return ''; }
  if ((played.uclGroup.matchday ?? 0) < 6) fail(`the save's group only reached matchday ${played.uclGroup.matchday}, so the season did not play it`);
  return loadedOk && playedOk ? `Chelsea's pre Round 612 group (${old.uclGroup.opponents.join(', ')}) loads and plays ${played.week} entries identical to the reference` : '';
});

/* ------------------------------------------------------------------ */
await run('10', 'A league with no verified table falls back to the old day one, and only that league', () => {
  /* No league is partial today, so the fallback has no live user. Mark the
     Premier League partial in the engine's own list, in memory, and look. */
  const partial = mine.CM_FINAL_TABLES_PARTIAL;
  const premier = mine.leagueOf('Chelsea');
  if (partial.includes('premier')) { fail('the Premier League is already marked partial, so this section cannot mark it'); return ''; }
  partial.push('premier');
  let bigOnes = 0;
  try {
    const field = mine.seasonOneUclField('now') || [];
    const english = field.filter(c => premier.clubs.includes(c));
    if (english.length) fail(`with the Premier League partial, ${english.join(', ')} are still in the field off its table`);
    if (field.length !== 32) fail(`with the Premier League partial the field has ${field.length} clubs, not 32 topped up from the other leagues`);
    for (const club of premier.clubs) {
      const s = pinned(10000 + bigOnes, () => mine.startCareer(club));
      const byTier = mine.clubDefFor(club).tier <= 2;
      if (!!s.uclGroup !== byTier) fail(`${club}: with its league partial it ${s.uclGroup ? 'starts in Europe' : 'starts outside Europe'} but its squad tier says ${byTier ? 'in' : 'out'}`);
      if (byTier) bigOnes += 1;
    }
    const villaSpain = pinned(10100, () => mine.startCareer('Villarreal'));
    if (!villaSpain.uclGroup) fail('Villarreal, whose league is still verified, lost their place because another league went partial');
    /* Round 612 review: in the field is not enough, a club must have earned
       its place; the fill clubs the partial league frees up stay home. */
    const marked = ruleFromData({ ...DATA, CM_FINAL_TABLES_PARTIAL: ['premier'] });
    if (json(field) !== json(marked.field)) fail(`with the Premier League partial the field is not the rule applied to the other leagues (${firstDiff(json(field), json(marked.field))})`);
    for (const c of field) {
      const s = pinned(10200, () => mine.startCareer(c));
      const byFill = marked.reason.get(c)?.endsWith('fill');
      if (!byFill && !s.uclGroup) fail(`${c} earned a place with the Premier League partial and starts outside Europe`);
      if (byFill && s.uclGroup) fail(`${c} is only a fill place with the Premier League partial and starts in Europe`);
    }
  } finally {
    partial.splice(partial.indexOf('premier'), 1);
  }
  if (!bigOnes) fail('no Premier League club has a squad tier that qualifies it, so the fallback was never seen letting a club in');
  if (json(mine.seasonOneUclField('now')) !== json(expected.field)) fail('unmarking the Premier League did not restore the field');
  return `Premier League marked partial: none of its clubs in the field, ${bigOnes} in Europe by squad tier, La Liga still by its table`;
});

/* ------------------------------------------------------------------ */
await run('11', 'Liverpool and Real Betis start outside Europe, a decision on the game\'s place count', async () => {
  /* Round 612 review. England and Spain each really had a fifth place in
     2025-26 (the European Performance Spot), so Liverpool and Real Betis, both
     5th, are in the real 2026-27 league phase. The game gives both leagues 4
     (EURO_SLOTS), and the rule reads that. Modelling the extra spots is owed
     to the owner, not slipped in here: it makes 33 earned places for a 32
     club field, so somebody real would have to be cut, and reconciled.json
     carries the spot itself on one source family only. Until that is decided
     this section holds today's answer on purpose, so it changes only when
     someone means it to (control: places). */
  const cases = [['premier', 'Liverpool'], ['laliga', 'Real Betis']];
  for (const [leagueId, club] of cases) {
    const table = DATA.CM_FINAL_TABLES_2025_26.leagues[leagueId].table;
    const places = mine.uclPlacesIn({ id: leagueId, euro: true });
    if (table.indexOf(club) !== 4) { fail(`${club} are no longer 5th in the ${leagueId} data, so this decision needs a fresh look`); continue; }
    if (places !== 4) fail(`${leagueId} now has ${places} Champions League places, so ${club}'s status is no longer today's decision; update this section on purpose`);
    const s = pinned(1100, () => mine.startCareer(club));
    if (s.uclGroup !== null) fail(`${club} (5th, with ${places} places in the game) start season one in the Champions League`);
    if (s.boardObjectives.some(o => o.id === 'ucl')) fail(`${club}'s board sets a Champions League objective on day one`);
    if ((s.uclField || []).includes(club)) fail(`${club} are in the AI field although the fill place goes to the deepest league first`);
  }
  return 'both 5th, one below the game\'s 4 places, both start outside Europe and outside the field (decision owed: the 2025-26 European Performance Spots)';
});

/* ------------------------------------------------------------------ */
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  const stayedGreen = want.filter(s => !redSections.has(s));
  if (!stayedGreen.length) { console.log(`\n   CONTROL FIRED: ${CONTROL} turned section(s) ${want.join(', ')} red`); process.exit(0); }
  console.error(`\n   CONTROL DID NOT FIRE: ${CONTROL} left section(s) ${stayedGreen.join(', ')} green`);
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s) in section(s) ${[...redSections].join(', ')}`); process.exit(1); }
console.log('\nsimUclSeasonOne: all green');

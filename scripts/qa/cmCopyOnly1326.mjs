/* Round 1326: the proof that the round's copy changes move no draw and no save.

   node scripts/qa/cmCopyOnly1326.mjs --base <root> [--head <root>] [--fleet=A,B,C,D]

   The engine is bundled twice, once from each tree (its own temp folder, its own
   module), and the same careers are played on both in lockstep, one entry at a
   time, with Math.random a seeded generator wrapped in a counter on each tree.
   After EVERY entry (the inbox, the news and the headlines keep only eight
   each, so a season end would miss most words) the two states are compared:
   the same keys, the same array lengths, the same value at every number,
   boolean, null and undefined leaf, and every string equal or a pair one of the
   round's five declared rewrites explains (its old shape on the base, its new
   shape on the head). Then the draw counts must be equal. Anything else is red.

   THE REWRITES (the only words the round may change in a save):
     article-board  "Win the La Liga" becomes "Win La Liga" (and Serie A, Serie B,
                    Ligue 1, Ligue 2: every name toLeague leaves bare). "Win the
                    La Liga and Copa del Rey double" is NOT one: the article
                    belongs to "double" and the label stays as it is.
     article-news   "top the La Liga on" and "sharpest attack in the La Liga:"
                    in the weekly news, the same names.
     drama          a drama message's text opens every sentence on a capital
                    (kind drama, field text, and nothing else may change).
     intl           the break note's clause about the fixture list.
     staff          the approach headline counts offers, not matches, and gives
                    the weeks (club, man and count read off the old line).
   The screens' lines (Match Centre, world editor, the calendar's window line)
   and the money card are not in the save, so they are not rewrites here.
   A rewrite is ACTIVE when the head's source carries its new words; an active
   rewrite that fires zero times over the fleets run is red: widen the fleet
   with more seasons (COPY_ONLY_SEASONS), never pick seeds.

   THE FLEETS (two seasons a career unless COPY_ONLY_SEASONS says otherwise):
     A  13 careers, seed cm1326|<club>|<era>: quick sim with skipHalftime, every
        open inbox message answered with its first option the entry it lands,
        no job taken, no trade, finishSeason and startNextSeason at the end.
     B  simCmLeagueRules' own saves (its digestSaves, scripts/simCmLeagueRules.mjs
        lines 662 to 693 on c9c77eba): every modern league and every era league,
        its first club, seed cm-league-rules|<key>, realLeagueFixtures deleted,
        nothing answered, the second season for the pyramid leagues only. The
        tool FAILS if its key list differs from scripts/data/cmLeagueRulesDigest.json.
        This fleet is the attribution of that digest's retake, save by save.
     C  the four committed old saves, loaded through loadCareer, compared at the
        load with NO rewrite allowed (their saved words stay as written), then
        played to the end of their season and one season more, seed
        cm1326old|<file>; each round trips JSON through loadCareer at the end.
     D  Arsenal, Liverpool and Brentford with every staff man on level 9 on day
        one (scripts/simGmStaff.mjs's recipe, its line 333), fleet A's policy,
        and every fresh approach matched while it can be, so a later one arrives
        with no matches left.

   NEGATIVE CONTROLS (each rewrites one line of the HEAD's bundled engine, asserts
   the line occurs exactly once and that the rewritten file reached the bundle):
     COPY_ONLY_CONTROL=draw  one Math.random() call at the top of
                             generateWeeklyNews: FIRES as a draw difference.
     COPY_ONLY_CONTROL=word  "Title race." becomes "Title chase.": FIRES as an
                             undeclared string.
   Exit: 0 green, 1 red (or a control that FIRED), 2 could not run, 3 a control
   that did not fire.
*/
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const argVal = k => {
  const eq = args.find(a => a.startsWith(`--${k}=`));
  if (eq) return eq.slice(k.length + 3);
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const cannot = m => { console.error(`cmCopyOnly1326: could not run: ${m}`); process.exit(2); };
const BASE_ROOT = argVal('base') ? path.resolve(argVal('base')) : cannot('--base <root> is required');
const HEAD_ROOT = path.resolve(argVal('head') ?? SCRIPT_ROOT);
const FLEETS = (argVal('fleet') ?? 'A').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const SEASONS = Math.max(1, Number(process.env.COPY_ONLY_SEASONS ?? 2));
const CONTROL = process.env.COPY_ONLY_CONTROL ?? '';
for (const f of FLEETS) if (!'ABCD'.includes(f) || f.length !== 1) cannot(`unknown fleet ${f}`);
for (const r of [BASE_ROOT, HEAD_ROOT]) if (!fs.existsSync(path.join(r, 'src', 'lib', 'clubManager.ts'))) cannot(`${r} holds no src/lib/clubManager.ts`);

/* The generator and the key hash of scripts/simCmLeagueRules.mjs (its lines 532
   and 533), so fleet B plays exactly the digest's saves. */
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

/* ---- the two trees, each bundled into its own temp folder ---- */
const CONTROLS = {
  draw: { fixed: 'export function generateWeeklyNews(state: CareerState): void {\n', add: '  const __cm1326draw = Math.random();\n', mark: '__cm1326draw' },
  word: { fixed: 'Title race.`);', to: 'Title chase.`);', mark: 'Title chase.' },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`COPY_ONLY_CONTROL=${CONTROL} is not a control this tool knows (${Object.keys(CONTROLS).join(', ')})`);
const TEMP_ROOT = process.env.TEMP || process.env.TMP || os.tmpdir();
const temps = [];
process.on('exit', () => { for (const t of temps) { try { fs.rmSync(t, { recursive: true, force: true }); } catch { /* best effort */ } } });

async function bundleTree(label, root, control) {
  const tmp = fs.mkdtempSync(path.join(TEMP_ROOT, `cm1326-${label}-`));
  temps.push(tmp);
  const fwd = root.replaceAll(String.fromCharCode(92), '/');
  const entry = path.join(tmp, 'entry.mjs');
  const out = path.join(tmp, 'engine.mjs');
  fs.writeFileSync(entry, [
    `export * as cm from '${fwd}/src/lib/clubManager.ts';`,
    `export * as eras from '${fwd}/src/lib/clubManagerEras.ts';`,
    `export * as staff from '${fwd}/src/lib/clubManagerStaff.ts';`,
  ].join('\n'));
  const enginePath = path.resolve(root, 'src', 'lib', 'clubManager.ts');
  let reached = false;
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${fwd}/src` }, logLevel: 'error', jsx: 'automatic',
    /* A base exported outside the repo still finds the packages (esbuild only). */
    nodePaths: [path.join(SCRIPT_ROOT, 'node_modules')],
    plugins: [{
      name: 'cm1326-control',
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, a => {
          if (!control || path.resolve(a.path) !== enginePath) return undefined;
          const src = fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n');
          const c = CONTROLS[control];
          if (src.split(c.fixed).length !== 2) cannot(`control ${control}: clubManager.ts does not hold exactly one copy of the line it rewrites`);
          reached = true;
          const next = c.add ? src.replace(c.fixed, c.fixed + c.add) : src.replace(c.fixed, c.to);
          return { contents: next, loader: 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  if (control) {
    if (!reached || !fs.readFileSync(out, 'utf8').includes(CONTROLS[control].mark)) cannot(`control ${control}: the rewritten engine never reached the bundle`);
    console.log(`CONTROL ${control}: one line of the head's clubManager.ts rewritten in the bundle, the run must go red`);
  }
  const mod = await import(pathToFileURL(out).href);
  const rng = { n: 0, gen: seeded(1) };
  const tree = { label, root, ...mod, rng };
  tree.run = fn => {
    Math.random = () => { rng.n += 1; return rng.gen(); };
    try { return fn(); } finally { Math.random = REAL_RANDOM; }
  };
  tree.seed = key => { rng.gen = seeded(hashKey(key)); rng.n = 0; };
  return tree;
}

const readSrc = (root, f) => fs.readFileSync(path.join(root, 'src', 'lib', f), 'utf8').replaceAll('\r\n', '\n');
const ENGINE_FILES = ['clubManager.ts', 'clubManagerInternationals.ts', 'clubManagerStaff.ts'];
const SAME_TREE = ENGINE_FILES.every(f => readSrc(BASE_ROOT, f) === readSrc(HEAD_ROOT, f));

/* ---- the five declared rewrites ---- */
const OLD_INTL = 'and your fixtures do not stop for it, so they went straight after your last game';
const NEW_INTL = 'and the calendar here keeps your fixtures going through it, so they went straight after your last game';
const OLD_STAFF = /^(.+)\. Match them or lose him: (\d+) match(?:es)? left this season\.$/;
const NEW_STAFF_ON = /^(.+), your ([a-z ]+)\. Match their offer on the Staff desk within (\d+) weeks? or he goes\. You can match (\d+) more offers? this season\.$/;
const NEW_STAFF_NONE = /^(.+), your ([a-z ]+)\. You have matched all the offers you can this season, so he goes in (\d+) weeks? unless you let him go sooner\.$/;
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sentenceCaps = s => s.replace(/(^|[.?!] )([a-z])/g, (m, p, c) => p + c.toUpperCase());
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function makeRewrites(head, base) {
  const names = new Set();
  for (const t of [head, base]) {
    for (const l of t.cm.REAL_LEAGUES ?? []) names.add(l.name);
    for (const ls of Object.values(t.cm.ERA_LEAGUES ?? {})) for (const l of ls) names.add(l.name);
  }
  /* Every name toLeague leaves bare (the head's own rule, Round 1040). */
  const bare = [...names].filter(n => head.cm.toLeague(n) === n).sort((a, b) => b.length - a.length);
  if (!bare.length) cannot('toLeague leaves no league name bare: the article rewrites have nothing to read');
  const alt = bare.map(escRe).join('|');
  const winRe = new RegExp(`Win the (${alt})(?! and )`, 'g');
  const topRe = new RegExp(` top the (${alt}) on `, 'g');
  const attackRe = new RegExp(`sharpest attack in the (${alt}): `, 'g');
  const postLabels = new Set(Object.values(head.staff.STAFF_POST_INFO ?? {}).map(p => p.label.toLowerCase()));
  const weeks = head.staff.POACH_WEEKS;
  const staffPair = (b, h) => {
    const bm = b.match(OLD_STAFF);
    if (!bm) return false;
    const n = Number(bm[2]);
    const on = h.match(NEW_STAFF_ON);
    const none = h.match(NEW_STAFF_NONE);
    const hm = n > 0 ? on : none;
    if (!hm || hm[1] !== bm[1] || !postLabels.has(hm[2]) || Number(hm[3]) !== weeks) return false;
    if (n > 0 && Number(hm[4]) !== n) return false;
    const w = plural(weeks, 'week');
    return n > 0
      ? h === `${bm[1]}, your ${hm[2]}. Match their offer on the Staff desk within ${w} or he goes. You can match ${plural(n, 'more offer')} this season.`
      : h === `${bm[1]}, your ${hm[2]}. You have matched all the offers you can this season, so he goes in ${w} unless you let him go sooner.`;
  };
  const rewrites = [
    { id: 'article-board', apply: s => s.replace(winRe, 'Win $1') },
    { id: 'article-news', apply: s => s.replace(topRe, ' top $1 on ').replace(attackRe, 'sharpest attack in $1: ') },
    { id: 'intl', apply: s => s.split(OLD_INTL).join(NEW_INTL) },
    { id: 'drama', when: (parent, key) => key === 'text' && parent && parent.kind === 'drama', apply: sentenceCaps },
  ];
  return { bare, rewrites, staffPair };
}

/* ---- the comparison: base on the left, head on the right ---- */
const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
function makeComparer(rw) {
  const explain = (b, h, parent, key) => {
    let cur = b;
    const ids = [];
    for (const r of rw.rewrites) {
      if (r.when && !r.when(parent, key)) continue;
      const next = r.apply(cur);
      if (next !== cur) { ids.push(r.id); cur = next; }
    }
    if (cur === h) return ids.length ? ids : null;
    if (rw.staffPair(cur, h)) return [...ids, 'staff'];
    return null;
  };
  return (a, b, label, noRewrites = false) => {
    const diffs = [];
    const fired = {};
    const walk = (x, y, p, parent, key) => {
      if (x === y || diffs.length >= 40) return;
      const tx = typeOf(x);
      const ty = typeOf(y);
      if (tx !== ty) { diffs.push(`${p}: ${tx} on base, ${ty} on head`); return; }
      if (tx === 'number') { if (!(Number.isNaN(x) && Number.isNaN(y))) diffs.push(`${p}: ${x} on base, ${y} on head`); return; }
      if (tx === 'string') {
        const ids = noRewrites ? null : explain(x, y, parent, key);
        if (ids) { for (const id of ids) fired[id] = (fired[id] ?? 0) + 1; return; }
        diffs.push(`${p}: an undeclared string${noRewrites ? ' (no rewrite is allowed here)' : ''}\n        base: ${JSON.stringify(x).slice(0, 240)}\n        head: ${JSON.stringify(y).slice(0, 240)}`);
        return;
      }
      if (tx === 'array') {
        if (x.length !== y.length) { diffs.push(`${p}: length ${x.length} on base, ${y.length} on head`); return; }
        for (let i = 0; i < x.length; i++) walk(x[i], y[i], `${p}[${i}]`, x, i);
        return;
      }
      if (tx === 'object') {
        const kx = Object.keys(x);
        const ky = Object.keys(y);
        const sx = new Set(kx);
        const sy = new Set(ky);
        const only = [...kx.filter(k => !sy.has(k)).map(k => `-${k}`), ...ky.filter(k => !sx.has(k)).map(k => `+${k}`)];
        if (only.length) { diffs.push(`${p}: keys differ (${only.join(', ')})`); return; }
        for (const k of kx) walk(x[k], y[k], `${p}.${k}`, x, k);
        return;
      }
      diffs.push(`${p}: ${String(x)} on base, ${String(y)} on head`);
    };
    walk(a, b, label, null, null);
    return { diffs, fired };
  };
}

/* ---- one career on both trees, in lockstep ---- */
let failures = 0;
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const totalFired = {};

function stepEntry(tree, s, policy) {
  const r = tree.cm.playNextEntry(s, { skipHalftime: true });
  let st = r.state;
  if (policy.answer) {
    const open = (st.inbox ?? []).filter(m => !m.resolved && (m.options ?? []).length).map(m => m.id);
    for (const id of open) st = tree.cm.answerMessage(st, id, 0);
  }
  if (policy.matchStaff) {
    const desk = tree.staff.staffOf(st);
    if (desk.poach && desk.matchesLeft > 0) {
      const m = tree.staff.matchStaffOffer(st);
      if (m) st = m;
    }
  }
  return { kind: r.kind, state: st };
}

function playCareer(spec, base, head, cmp) {
  const rec = { name: spec.name, league: '', seasons: 0, entries: 0, bytes: [], fired: {}, stopped: '' };
  const note = (where, a, b, noRewrites = false) => {
    const { diffs, fired } = cmp(a, b, where, noRewrites);
    for (const [k, v] of Object.entries(fired)) { rec.fired[k] = (rec.fired[k] ?? 0) + v; totalFired[k] = (totalFired[k] ?? 0) + v; }
    if (base.rng.n !== head.rng.n) diffs.unshift(`${where}: ${base.rng.n} draws on base, ${head.rng.n} on head`);
    if (!diffs.length) return true;
    fail(`${spec.name}: ${where} differs\n      ${diffs.slice(0, 12).join('\n      ')}`);
    rec.stopped = where;
    return false;
  };
  base.seed(spec.seedKey);
  head.seed(spec.seedKey);
  let sb = base.run(() => spec.start(base));
  let sh = head.run(() => spec.start(head));
  if (!sb || !sh) { fail(`${spec.name}: did not start (base ${!!sb}, head ${!!sh})`); return rec; }
  if (!note('the start', sb, sh, spec.startNoRewrites)) return rec;
  rec.league = base.cm.careerLeagueOf(sb).name;
  for (let season = 0; season < spec.seasons; season++) {
    let over = false;
    for (let i = 0; i < 220 && !over; i++) {
      const rb = base.run(() => stepEntry(base, sb, spec.policy));
      const rh = head.run(() => stepEntry(head, sh, spec.policy));
      sb = rb.state;
      sh = rh.state;
      rec.entries += 1;
      const where = `season ${season + 1} entry ${i + 1} (week ${sb.week})`;
      if (rb.kind !== rh.kind) { fail(`${spec.name}: ${where} ends as ${rb.kind} on base, ${rh.kind} on head`); rec.stopped = where; return rec; }
      if (!note(where, sb, sh)) return rec;
      if (rb.kind === 'seasonOver') over = true;
      else if (sb.sacked) { rec.stopped = `sacked at ${where}`; return rec; }
    }
    if (!over) { fail(`${spec.name}: season ${season + 1} never ended`); rec.stopped = 'stuck'; return rec; }
    rec.seasons += 1;
    rec.bytes.push(`${JSON.stringify(sb).length}/${JSON.stringify(sh).length}`);
    if (spec.digestEnd && season === spec.seasons - 1) break;
    const fb = base.run(() => base.cm.finishSeason(sb));
    const fh = head.run(() => head.cm.finishSeason(sh));
    if (!note(`season ${season + 1} finishSeason summary`, fb.summary, fh.summary)) return rec;
    if (!note(`season ${season + 1} finishSeason state`, fb.state, fh.state)) return rec;
    sb = base.run(() => base.cm.startNextSeason(fb.state));
    sh = head.run(() => head.cm.startNextSeason(fh.state));
    if (!note(`season ${season + 2} startNextSeason`, sb, sh)) return rec;
  }
  /* The save round trips JSON through loadCareer on both trees. */
  const trip = (tree, s) => tree.run(() => { store.clear(); store.set(tree.cm.SAVE_KEY, JSON.stringify(s)); return tree.cm.loadCareer(); });
  const tb = trip(base, sb);
  const th = trip(head, sh);
  if (!tb || !th) fail(`${spec.name}: the last save did not load back (base ${!!tb}, head ${!!th})`);
  else {
    const same = [JSON.stringify(tb) === JSON.stringify(sb), JSON.stringify(th) === JSON.stringify(sh)];
    if (same[0] !== same[1]) fail(`${spec.name}: the save round trips byte equal on ${same[0] ? 'base' : 'head'} only`);
    note('the reloaded save', tb, th);
  }
  return rec;
}

/* ---- the fleets ---- */
const FLEET_A = [
  ['Liverpool', 'now'], ['Barcelona', 'now'], ['Real Madrid', 'now'], ['Celta Vigo', 'now'], ['Juventus', 'now'],
  ['PSG', 'now'], ['Palermo', 'now'], ['OB', 'now'], ['Dundee', 'now'], ['West Ham', 'now'],
  ['Everton', 'era2005'], ['Leicester City', 'era2015'], ['Bayern Munich', 'era2020'],
];
const FLEET_C = ['cmOldSave1052Fixture.json', 'cmSecondTierOldSaveFixture.json', 'cmBookSaveEvertonFixture.json', 'cmBookSaveHerthaFixture.json'];
const FLEET_D = ['Arsenal', 'Liverpool', 'Brentford'];
const CM_POSTS = ['attack', 'defence', 'goalkeeping', 'scout'];

async function ensureEra(tree, eraId) {
  if (!eraId || eraId === 'now') return;
  const load = tree.eras.ensureEraRosters ?? tree.cm.ensureEraRosters;
  if (typeof load === 'function') await load(eraId);
}
const inLeagues = (tree, club, eraId) => (eraId === 'now' ? tree.cm.REAL_LEAGUES : tree.cm.ERA_LEAGUES[eraId] ?? []).some(l => l.clubs.includes(club));

async function fleetSpecs(fleet, base, head) {
  const specs = [];
  if (fleet === 'A') {
    for (const [club, eraId] of FLEET_A) {
      await ensureEra(base, eraId); await ensureEra(head, eraId);
      if (!inLeagues(base, club, eraId)) cannot(`fleet A: ${club} is in no league of ${eraId} on the base`);
      specs.push({ name: `A ${club} (${eraId})`, seedKey: `cm1326|${club}|${eraId}`, seasons: SEASONS, policy: { answer: true }, start: t => t.cm.startCareer(club, eraId) });
    }
  }
  if (fleet === 'B') {
    /* scripts/simCmLeagueRules.mjs digestSaves and partModern / partEras, c9c77eba lines 662 to 747. */
    const digest = JSON.parse(fs.readFileSync(path.join(SCRIPT_ROOT, 'scripts', 'data', 'cmLeagueRulesDigest.json'), 'utf8'));
    const pyramidIds = new Set(base.cm.PYRAMIDS.flatMap(p => [p.top, p.second]));
    const saves = base.cm.REAL_LEAGUES.map(l => ({ key: `now|${l.id}`, club: l.clubs[0], eraId: 'now', second: pyramidIds.has(l.id) }));
    for (const [eraId, leagues] of Object.entries(base.cm.ERA_LEAGUES)) for (const l of leagues) saves.push({ key: `${eraId}|${l.id}`, club: l.clubs[0], eraId, second: false });
    const want = [...Object.keys(digest.parts?.modern ?? {}), ...Object.keys(digest.parts?.eras ?? {})].sort();
    const got = saves.map(s => s.key).sort();
    if (JSON.stringify(want) !== JSON.stringify(got)) fail(`fleet B: its ${got.length} keys differ from the ${want.length} of scripts/data/cmLeagueRulesDigest.json (${got.filter(k => !want.includes(k)).concat(want.filter(k => !got.includes(k)).map(k => `-${k}`)).join(', ')})`);
    for (const sv of saves) {
      await ensureEra(base, sv.eraId); await ensureEra(head, sv.eraId);
      specs.push({
        name: `B ${sv.key} (${sv.club})`, seedKey: `cm-league-rules|${sv.key}`, seasons: sv.second ? 2 : 1, digestEnd: sv.second, policy: {},
        start: t => { const s = t.cm.startCareer(sv.club, sv.eraId); delete s.realLeagueFixtures; return s; },
      });
    }
  }
  if (fleet === 'C') {
    for (const file of FLEET_C) {
      const raw = fs.readFileSync(path.join(SCRIPT_ROOT, 'scripts', 'data', file), 'utf8');
      const eraId = JSON.parse(raw).eraId ?? 'now';
      await ensureEra(base, eraId); await ensureEra(head, eraId);
      specs.push({
        name: `C ${file}`, seedKey: `cm1326old|${file}`, seasons: SEASONS, policy: { answer: true }, startNoRewrites: true,
        start: t => { store.clear(); store.set(t.cm.SAVE_KEY, raw); return t.cm.loadCareer(); },
      });
    }
  }
  if (fleet === 'D') {
    for (const club of FLEET_D) {
      specs.push({
        name: `D ${club} (every man on level 9)`, seedKey: `cm1326staff|${club}`, seasons: SEASONS, policy: { answer: true, matchStaff: true },
        start: t => {
          const s = t.cm.startCareer(club);
          const desk = t.staff.ensureStaff(s);
          for (const post of CM_POSTS) if (desk[post]) desk[post] = { ...desk[post], level: 9, potential: 10, wage: t.staff.staffWage(9, false) };
          return s;
        },
      });
    }
  }
  return specs;
}

/* ---- the run ---- */
const base = await bundleTree('base', BASE_ROOT, '');
const head = await bundleTree('head', HEAD_ROOT, CONTROL);
const rw = makeRewrites(head, base);
const cmp = makeComparer(rw);
const headEngine = readSrc(HEAD_ROOT, 'clubManager.ts');
const ACTIVE = SAME_TREE ? {} : {
  'article-board': headEngine.includes('label: `Win ${toLeague(league.name)}`'),
  'article-news': headEngine.includes('top ${toLeague(league.name)} on'),
  drama: headEngine.includes('export function dramaText('),
  intl: readSrc(HEAD_ROOT, 'clubManagerInternationals.ts').includes(NEW_INTL),
  staff: readSrc(HEAD_ROOT, 'clubManagerStaff.ts').includes('Match their offer on the Staff desk'),
};
console.log(`cmCopyOnly1326: base ${BASE_ROOT}, head ${HEAD_ROOT}${SAME_TREE ? ' (the same engine: no rewrite may fire)' : ''}`);
console.log(`  fleets ${FLEETS.join(',')}, ${SEASONS} seasons a career; bare league names ${rw.bare.join(', ')}`);
console.log(`  active rewrites: ${Object.entries(ACTIVE).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`);
let careers = 0;
for (const fleet of FLEETS) {
  const specs = await fleetSpecs(fleet, base, head);
  console.log(`fleet ${fleet}: ${specs.length} careers`);
  for (const spec of specs) {
    const t0 = performance.now();
    const rec = playCareer(spec, base, head, cmp);
    careers += 1;
    const fired = Object.entries(rec.fired).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
    console.log(`  ${rec.name} [${rec.league}]: seasons ${rec.seasons}, entries ${rec.entries}, draws ${base.rng.n}/${head.rng.n}, bytes ${rec.bytes.join(' ') || '-'}, rewrites ${fired}${rec.stopped ? `, stopped: ${rec.stopped}` : ''} (${Math.round((performance.now() - t0) / 1000)}s)`);
  }
}
const firedLine = Object.entries(totalFired).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
console.log(`rewrites fired over ${careers} careers: ${firedLine}`);
if (SAME_TREE && Object.keys(totalFired).length) fail('the two trees hold the same engine and a rewrite fired');
for (const [id, on] of Object.entries(ACTIVE)) if (on && !totalFired[id]) fail(`rewrite ${id} is active on the head and fired zero times over fleets ${FLEETS.join(',')}: widen the fleet (COPY_ONLY_SEASONS), never pick seeds`);
if (CONTROL) {
  if (failures) { console.log(`cmCopyOnly1326: CONTROL ${CONTROL} FIRED (${failures} failures, as it must)`); process.exit(1); }
  console.log(`cmCopyOnly1326: CONTROL ${CONTROL} DID NOT FIRE: the proof is blind to it`);
  process.exit(3);
}
if (failures) { console.log(`cmCopyOnly1326: RED, ${failures} failures`); process.exit(1); }
console.log(`cmCopyOnly1326: green. ${careers} careers, every entry equal on both trees but for the declared rewrites (${firedLine}), draws equal.`);
process.exit(0);

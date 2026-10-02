/* The staff desk, lifted: one module for every manager game on the site.

   Round 910. The owner, 2026-10-02: every manager game in every sport should
   behave like the soccer one, with its own sport's things. Club Manager has a
   staff desk (hire, sack, poach, promote) and nothing else on the site did.
   src/lib/gmStaff.ts is that desk with the posts handed in as data,
   src/data/gmStaff/packs.ts is every game's post list, and
   src/lib/clubManagerStaff.ts now delegates its shared parts to it.

   HEADER_SECTIONS (filled in as the sections land)

   Run:    node scripts/simGmStaff.mjs
   Record: GM_STAFF_RECORD=1 node scripts/simGmStaff.mjs   (rewrites the fixture; only ever run on a tree
           where clubManagerStaff.ts is known good, and say why in the commit)
*/
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const FIXTURE = path.join(ROOT, 'scripts/data/cmStaffFixture.json');
const RECORD = process.env.GM_STAFF_RECORD === '1';
const CONTROL = process.env.GM_STAFF_CONTROL || '';
const CONTROLS = ['fixturewage', 'fixturecore', 'flat', 'nocap', 'noscout', 'poachhead', 'dearstaff', 'wrongwords'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`GM_STAFF_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
if (CONTROL && RECORD) { console.error('refusing to record a fixture with a control on'); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const lf = s => s.replace(/\r\n/g, '\n');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/* A worktree has no node_modules of its own, so the bundler is found by
   walking up, the same way node resolves a package. */
function findBin(name) {
  let d = ROOT;
  for (;;) {
    const p = path.join(d, 'node_modules', '.bin', name);
    if (fs.existsSync(p) || fs.existsSync(`${p}.cmd`)) return p.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) throw new Error(`no node_modules/.bin/${name} above ${ROOT}`);
    d = up;
  }
}
const ESBUILD = findBin('esbuild');
/* Its own folder per run, so two runs at once can never read each other's bundle. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simGmStaff-')).replaceAll('\\', '/');

/* One seeded stream, restarted for every club, so a club's history does not
   depend on which clubs ran before it. The staff desk itself draws nothing
   from Math.random (it is all hashes); this pins startCareer's squad. */
function seedRandom(key) {
  let a = 0x811c9dc5 >>> 0;
  for (let i = 0; i < key.length; i++) { a ^= key.charCodeAt(i); a = Math.imul(a, 0x01000193) >>> 0; }
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- bundle Club Manager and its staff desk, with a control copy when asked ---- */
const PATHS = {
  desk: `${ROOT_URL}/src/lib/clubManagerStaff.ts`,
  core: `${ROOT_URL}/src/lib/gmStaff.ts`,
  packs: `${ROOT_URL}/src/data/gmStaff/packs.ts`,
};
const SOURCES = { desk: 'src/lib/clubManagerStaff.ts', core: 'src/lib/gmStaff.ts', packs: 'src/data/gmStaff/packs.ts' };
/** Bundle a copy of one module with one line changed. Refuses to run when the line is not there. */
function controlCopy(which, fixed, broken, what) {
  const src = lf(fs.readFileSync(path.join(ROOT, SOURCES[which]), 'utf8'));
  if (!src.includes(fixed)) { console.error(`control cannot run: ${SOURCES[which]} is not in the shape GM_STAFF_CONTROL=${CONTROL} rewrites`); process.exit(1); }
  PATHS[which] = `${TMP}/${which}.${CONTROL}.ts`;
  fs.writeFileSync(PATHS[which], src.replace(fixed, broken));
  console.log(`NEGATIVE CONTROL ON: ${what}`);
}
if (CONTROL === 'fixturewage') controlCopy('desk', '  wagePerLevel: 2.1,', '  wagePerLevel: 2.2,', 'a Club Manager coach earns 2.2 a level instead of 2.1');
if (CONTROL === 'fixturecore') {
  controlCopy('core', 'const chance = p.potential - p.level >= 3 ? rules.growChanceRoomy : rules.growChance;', 'const chance = rules.growChance;',
    'the shared summer forgets that a man with three levels of room grows more often');
}
if (CONTROL === 'flat') {
  /* The two ends stay right and every level between them does nothing: the
     shape a check on level 1 against level 10 alone would wave through. */
  controlCopy('core', 'const raw = effect.none + ((effect.best - effect.none) * (level - 1)) / (maxLevel - 1);', 'const raw = level >= maxLevel ? effect.best : effect.none;',
    'an effect is worth nothing until the top level, then all of it');
}
if (CONTROL === 'nocap') {
  controlCopy('core', 'return clamp(raw, Math.min(effect.none, effect.best), Math.max(effect.none, effect.best));', 'return raw;',
    'an effect is no longer held between its two ends');
}
if (CONTROL === 'noscout') {
  controlCopy('core', 'return draw * (gmScoutSpread(level) / GM_SCOUT_SPREAD_NONE);', 'return draw;',
    'the scouting error ignores who the scouting director is');
}
if (CONTROL === 'poachhead') {
  controlCopy('core', 'if (rules.unpoachable?.includes(post)) continue;', '',
    'a rival can come in for the head coach');
}
if (CONTROL === 'dearstaff') {
  controlCopy('packs', 'wageBase: 3, wagePerLevel: 2.1, feeBase: 0.1,', 'wageBase: 3, wagePerLevel: 6.3, feeBase: 0.1,',
    'a pro staff costs three times as much a level');
}
if (CONTROL === 'wrongwords') {
  controlCopy('core', 'const pct = Math.round((v / effect.none - 1) * 1000) / 10;', 'const pct = Math.round((effect.best / effect.none - 1) * 1000) / 10;',
    'every multiplier tile promises the top level\'s lift whatever the level');
}
const ENTRY = `${TMP}/entry.mjs`;
const BUNDLE = `${TMP}/bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const desk = await import('${PATHS.desk}');
export const core = await import('${PATHS.core}');
export const packs = await import('${PATHS.packs}');
`);
const aliases = [
  `--alias:@/lib/clubManagerStaff=${PATHS.desk}`,
  `--alias:@/lib/gmStaff=${PATHS.core}`,
  `--alias:@/data/gmStaff/packs=${PATHS.packs}`,
  `--alias:@=${ROOT_URL}/src`,
];
execSync(`"${ESBUILD}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`, { stdio: 'inherit' });
const mod = await import(pathToFileURL(BUNDLE).href);
const cm = mod.engine;
const desk = mod.desk;
const core = mod.core;
const PACKS = mod.packs.GM_STAFF_PACKS;
await cm.ensureAllEraRosters();

/* ================= the Club Manager staff history, recorded and replayed ================= */

const CM_WEEKS = 46;
const CM_SEASONS = 3;
const CM_POSTS = ['attack', 'defence', 'goalkeeping', 'scout'];

const manLine = p => (p ? `${p.name} L${p.level}/P${p.potential} w${p.wage} since${p.since} ${p.academy ? 'academy' : 'outside'} ${p.id}` : 'EMPTY');
const poachLine = p => (p ? `${p.postId}>${p.club} in ${p.weeksLeft}` : 'none');
const candLine = c => `${c.person.name} L${c.person.level}/P${c.person.potential} w${c.person.wage} fee${c.fee} ${c.person.academy ? 'A' : 'O'} ${c.person.id} "${c.from}"`;

/** Every word and number the desk shows for one career, as lines. */
function snapshot(L, tag, career) {
  const s = desk.staffOf(career);
  for (const post of CM_POSTS) {
    const p = s[post];
    L.push(`${tag} ${post}: ${manLine(p)} | sev ${desk.severanceFor(career, post)} | ${desk.staffEffectLine(career, post)}${p ? ` | ${desk.staffWageLine(career, p)} | art ${sha(desk.staffPortraitSvg(p))}` : ''}`);
  }
  L.push(`${tag} desk: payroll ${desk.staffPayrollWeekly(career)} poach ${poachLine(s.poach)} matches ${s.matchesLeft} hires ${s.hires} spend ${s.seasonSpend} budget ${career.budget} valid ${desk.isValidStaff(career.staff)}`);
  for (const post of CM_POSTS) L.push(`${tag} list ${post}: ${desk.staffShortlist(career, post).map(candLine).join(' ; ')}`);
}

/**
 * One club, three seasons, through the real desk: the weekly tick, an answer
 * to every approach (match, release, ignore, in turn), a hire into every
 * vacancy (each candidate in turn, the academy man when the kitty is short),
 * three scheduled sackings and the summer rollover. `nines` puts every man on
 * level 9 first, which is the only way a small club ever draws an approach.
 */
function driveClub(clubName, eraId, mode) {
  seedRandom(`cmStaffFixture|${clubName}|${eraId || 'now'}|${mode}`);
  const L = [];
  let career = eraId ? cm.startCareer(clubName, eraId) : cm.startCareer(clubName);
  const historic = !!eraId && cm.isHistoricEra(eraId);
  if (mode === 'nines') {
    const s = desk.ensureStaff(career);
    for (const post of CM_POSTS) if (s[post]) s[post] = { ...s[post], level: 9, potential: 10, wage: desk.staffWage(9, historic) };
  }
  let approaches = 0;
  let hires = 0;
  const SACKS = { '0:9': 'attack', '1:30': 'scout', '2:15': 'goalkeeping' };
  for (let season = 0; season < CM_SEASONS; season++) {
    snapshot(L, `S${season}`, career);
    /* The two refusals a desk must make, once a season. */
    {
      const open = { ...desk.staffOf(career), poach: null };
      const vacant = { ...career, staff: { ...open, defence: null } };
      const broke = { ...vacant, budget: 0 };
      const list = desk.staffShortlist(broke, 'defence');
      const promoted = desk.hireStaff(broke, 'defence', list[list.length - 1].person.id);
      L.push(`S${season} refuse: bogus id ${desk.hireStaff(vacant, 'defence', 'st-nobody') === null}`
        + `, sack on empty ${desk.sackStaff(vacant, 'defence') === null}`
        + `, match with no approach ${desk.matchStaffOffer({ ...career, staff: open }) === null}`
        + `, release with no approach ${desk.releaseToPoacher({ ...career, staff: open }) === null}`
        + `, outside man on an empty kitty ${desk.hireStaff(broke, 'defence', list[0].person.id) === null}`
        + `, academy man on an empty kitty ${promoted ? `${promoted.aiHeadlines[0]} budget ${promoted.budget}` : 'REFUSED'}`
        + `, pay off on an empty kitty ${desk.sackStaff({ ...career, staff: open, budget: 0 }, 'attack') === null}`);
    }
    for (let week = 1; week <= CM_WEEKS; week++) {
      career.week = week;
      const tag = `S${season}W${week}`;
      const before = JSON.stringify(career.staff);
      const head0 = career.aiHeadlines[0];
      desk.tickStaff(career);
      if (JSON.stringify(career.staff) !== before) {
        L.push(`${tag} tick: poach ${poachLine(desk.staffOf(career).poach)}${career.aiHeadlines[0] !== head0 ? ` | ${career.aiHeadlines[0]}` : ''}`);
      }
      const st = desk.staffOf(career);
      if (st.poach && st.poach.weeksLeft === desk.POACH_WEEKS) {
        /* A fresh approach: match, release, ignore, in turn. With every man
           on level 9 the turn is match, match, match, release, so the third
           match of a season runs into the limit and he is left to walk. */
        const n = approaches++;
        const turn = mode === 'nines' ? (n % 4 === 3 ? 1 : 0) : n % 3;
        if (turn === 0) {
          const r = desk.matchStaffOffer(career);
          L.push(`${tag} match: ${r ? `${r.aiHeadlines[0]} | left ${desk.staffOf(r).matchesLeft}` : 'REFUSED, none left'}`);
          if (r) career = r;
        } else if (turn === 1) {
          const r = desk.releaseToPoacher(career);
          L.push(`${tag} release: ${r ? r.aiHeadlines[0] : 'REFUSED'}`);
          if (r) career = r;
        } else L.push(`${tag} ignore`);
      }
      const sackPost = SACKS[`${season}:${week}`];
      if (sackPost) {
        const quoted = desk.severanceFor(career, sackPost);
        const r = desk.sackStaff(career, sackPost);
        L.push(`${tag} sack ${sackPost}: quoted ${quoted} | ${r ? `${r.aiHeadlines[0]} | budget ${career.budget} to ${r.budget} | spend ${desk.staffOf(r).seasonSpend}` : 'REFUSED'}`);
        if (r) career = r;
      }
      for (const post of CM_POSTS) {
        if (desk.staffOf(career)[post]) continue;
        const list = desk.staffShortlist(career, post);
        L.push(`${tag} vacancy ${post}: ${list.map(candLine).join(' ; ')}`);
        const pick = list[hires++ % list.length];
        let r = desk.hireStaff(career, post, pick.person.id);
        if (!r) { L.push(`${tag} hire ${post}: REFUSED ${pick.person.name} at fee ${pick.fee} on budget ${career.budget}, promoting`); r = desk.hireStaff(career, post, list[list.length - 1].person.id); }
        L.push(`${tag} hire ${post}: ${r ? `${r.aiHeadlines[0]} | budget ${career.budget} to ${r.budget} | spend ${desk.staffOf(r).seasonSpend} hires ${desk.staffOf(r).hires}` : 'REFUSED'}`);
        if (r) { L.push(`${tag} refill: filled post refuses ${desk.hireStaff(r, post, pick.person.id) === null}`); career = r; }
        break; /* one appointment a week */
      }
    }
    /* The summer. The last one is also read as a move, which must drop the block. */
    const next = { ...structuredClone(career), season: (career.season ?? 1) + 1, week: 1 };
    if (season === CM_SEASONS - 1) {
      const moved = { ...structuredClone(career), season: (career.season ?? 1) + 1, week: 1 };
      desk.rolloverStaff(moved, career, true);
      L.push(`S${season} move: staff dropped ${moved.staff === undefined}`);
    }
    desk.rolloverStaff(next, career, false);
    career = next;
  }
  snapshot(L, 'END', career);
  return L;
}

/** Twenty clubs: four from each tier of today's world, spread across the leagues, and four from the eras. */
function fixtureClubs() {
  const byTier = { 1: [], 2: [], 3: [], 4: [] };
  for (const l of cm.REAL_LEAGUES) for (const c of cm.playableClubs(l.id)) if (byTier[c.tier]) byTier[c.tier].push(c.name);
  const out = [];
  for (const tier of [1, 2, 3, 4]) {
    const names = [...new Set(byTier[tier])].sort();
    for (let i = 0; i < 4; i++) out.push({ club: names[Math.floor((i * names.length) / 4)], era: '' });
  }
  const eras = cm.CM_ERAS.filter(e => cm.isHistoricEra(e.id));
  for (let i = 0; out.length < 20 && eras.length; i++) {
    const era = eras[i % eras.length];
    const clubs = cm.eraLeaguesFor(era.id).flatMap(l => cm.eraPlayableClubs(era.id, l.id)).map(c => c.name).sort();
    out.push({ club: clubs[Math.floor(((i + 1) * clubs.length) / 6)], era: era.id });
  }
  return out;
}

/** The plain tables: the wage curve past both ends, every club's day one levels, and what the validator refuses. */
function tables() {
  const wage = [];
  for (const historic of [false, true]) for (let level = -1; level <= 12; level++) wage.push(`${historic ? 'era' : 'now'} L${level} ${desk.staffWage(level, historic)}`);
  const starts = [];
  for (const l of cm.REAL_LEAGUES) for (const c of cm.playableClubs(l.id)) starts.push(`${c.name}: ${CM_POSTS.map(p => desk.staffStartLevel(c, c.name, p)).join(',')}`);
  for (const era of cm.CM_ERAS.filter(e => cm.isHistoricEra(e.id))) {
    for (const l of cm.eraLeaguesFor(era.id)) for (const c of cm.eraPlayableClubs(era.id, l.id)) starts.push(`${era.id}/${c.name}: ${CM_POSTS.map(p => desk.staffStartLevel(c, c.name, p)).join(',')}`);
  }
  seedRandom('cmStaffFixture|validity');
  const good = desk.staffOf(cm.startCareer('Everton'));
  const man = good.attack;
  const mangled = {
    good,
    'no block': undefined,
    'null block': null,
    'array': [],
    'wrong version': { ...good, v: 2 },
    'post missing': (({ scout, ...rest }) => rest)(good),
    'empty post': { ...good, defence: null },
    'level 0': { ...good, attack: { ...man, level: 0 } },
    'level 11': { ...good, attack: { ...man, level: 11, potential: 11 } },
    'level 4.5': { ...good, attack: { ...man, level: 4.5 } },
    'potential under level': { ...good, attack: { ...man, level: 6, potential: 5 } },
    'negative wage': { ...good, attack: { ...man, wage: -1 } },
    'NaN wage': { ...good, attack: { ...man, wage: NaN } },
    'no name': { ...good, attack: { ...man, name: '' } },
    'no id': { ...good, attack: { ...man, id: '' } },
    'academy not a boolean': { ...good, attack: { ...man, academy: 1 } },
    'poach for a post nobody holds': { ...good, scout: null, poach: { postId: 'scout', club: 'Leeds United', weeksLeft: 2 } },
    'poach for an unknown post': { ...good, poach: { postId: 'physio', club: 'Leeds United', weeksLeft: 2 } },
    'poach with no club': { ...good, poach: { postId: 'attack', club: '', weeksLeft: 2 } },
    'poach negative weeks': { ...good, poach: { postId: 'attack', club: 'Leeds United', weeksLeft: -1 } },
    'good poach': { ...good, poach: { postId: 'attack', club: 'Leeds United', weeksLeft: 2 } },
    'matches over the limit': { ...good, matchesLeft: 3 },
    'matches negative': { ...good, matchesLeft: -1 },
    'hires not whole': { ...good, hires: 1.5 },
    'spend negative': { ...good, seasonSpend: -0.1 },
    'spend NaN': { ...good, seasonSpend: NaN },
  };
  const validity = Object.entries(mangled).map(([k, v]) => `${k}: ${desk.isValidStaff(v)}`);
  return { wage, startsSha: sha(starts.join('\n')), startsCount: starts.length, startsSample: starts.filter((_, i) => i % 40 === 0), validity };
}

function recordAll() {
  const runs = [];
  for (const { club, era } of fixtureClubs()) {
    for (const mode of ['natural', 'nines']) {
      const lines = driveClub(club, era, mode);
      runs.push({ club, era, mode, sha: sha(lines.join('\n')), lines });
    }
  }
  return { runs, tables: tables() };
}

const serialise = fx => JSON.stringify(fx, null, 1) + '\n';

if (RECORD) {
  const head = execSync('git rev-parse --short=8 HEAD', { cwd: ROOT }).toString().trim();
  const body = recordAll();
  const again = recordAll();
  if (serialise(body) !== serialise(again)) { console.error('the recorder is not deterministic: two recordings in one process differ'); process.exit(1); }
  const fixture = {
    _about: 'Club Manager staff desk history, recorded from src/lib/clubManagerStaff.ts by GM_STAFF_RECORD=1 node scripts/simGmStaff.mjs. '
      + 'Twenty clubs, three seasons each, twice (as the club opens, and with every man on level 9 so approaches arrive). '
      + 'Replayed by section 1 of scripts/simGmStaff.mjs on every run. Never edit by hand.',
    recordedAt: head,
    weeks: CM_WEEKS,
    seasons: CM_SEASONS,
    sha: sha(serialise(body)),
    ...body,
  };
  fs.writeFileSync(FIXTURE, serialise(fixture));
  const lines = body.runs.reduce((n, r) => n + r.lines.length, 0);
  console.log(`recorded ${body.runs.length} runs, ${lines} lines, at ${head}: ${fixture.sha}`);
  process.exit(0);
}

/* ---------- 1. Club Manager's desk still does exactly what it did ---------- */
console.log('1) The Club Manager staff history replays identically');
{
  if (!fs.existsSync(FIXTURE)) { console.error('no fixture: scripts/data/cmStaffFixture.json is missing'); process.exit(1); }
  const fixture = JSON.parse(lf(fs.readFileSync(FIXTURE, 'utf8')));
  const now = recordAll();
  let counted = 0;
  let events = 0;
  if (now.runs.length !== fixture.runs.length) fail(`the fixture holds ${fixture.runs.length} runs and the replay made ${now.runs.length}`);
  for (let i = 0; i < Math.min(now.runs.length, fixture.runs.length); i++) {
    const want = fixture.runs[i];
    const got = now.runs[i];
    counted += got.lines.length;
    events += got.lines.filter(l => /W\d+ (tick|match|release|ignore|sack|hire)\b/.test(l)).length;
    if (want.club !== got.club || want.era !== got.era || want.mode !== got.mode) { fail(`run ${i} is ${got.club} ${got.era} ${got.mode}, the fixture has ${want.club} ${want.era} ${want.mode}`); continue; }
    if (want.sha === got.sha && want.lines.length === got.lines.length) continue;
    const at = want.lines.findIndex((l, n) => l !== got.lines[n]);
    fail(`${got.club}${got.era ? ` (${got.era})` : ''} ${got.mode}: line ${at} of ${want.lines.length} differs\n      was: ${want.lines[at]}\n      now: ${got.lines[at]}`);
  }
  for (const key of ['wage', 'startsSample', 'validity']) {
    const want = fixture.tables[key];
    const got = now.tables[key];
    const at = want.findIndex((l, n) => l !== got[n]);
    if (at >= 0 || want.length !== got.length) fail(`table ${key}: row ${at} was "${want[at]}", now "${got[at]}"`);
  }
  if (fixture.tables.startsSha !== now.tables.startsSha || fixture.tables.startsCount !== now.tables.startsCount) {
    fail(`day one levels: ${now.tables.startsCount} clubs hash ${now.tables.startsSha}, the fixture has ${fixture.tables.startsCount} at ${fixture.tables.startsSha}`);
  }
  if (events < 200) fail(`the history only holds ${events} desk events, too thin to prove anything`);
  console.log(`   ${now.runs.length} runs, ${counted} lines, ${events} desk events, ${now.tables.startsCount} clubs' day one levels (recorded at ${fixture.recordedAt})`);
}

/* ================= the packs ================= */

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const EPS = 1e-9;
const person = (level, id = 'x') => ({ id: `st-${id}`, name: `Test ${id}`, level, potential: Math.max(level, 1), wage: 1, since: 1, academy: false });
/** A block with the given level in each post (null leaves the chair empty). Built by hand, so it can be corrupt on purpose. */
function blockAt(pack, levelOf) {
  const b = { v: pack.rules.version, poach: null, matchesLeft: pack.rules.matchesPerSeason, hires: 0, seasonSpend: 0 };
  for (const post of pack.posts) { const lv = levelOf(post.id); b[post.id] = lv === null ? null : person(lv, post.id); }
  return b;
}

/* ---------- 2. Every pack is a desk the core can run ---------- */
console.log('2) Every pack is well formed: its posts, its keys and its bounds agree');
{
  let posts = 0;
  let effects = 0;
  const DASH = /[–—]/;
  for (const pack of PACKS) {
    const ids = pack.posts.map(p => p.id);
    if (new Set(ids).size !== ids.length) fail(`${pack.id}: two posts share an id`);
    if (ids.join('|') !== pack.rules.posts.join('|')) fail(`${pack.id}: the rules list ${pack.rules.posts.join(',')} and the posts are ${ids.join(',')}`);
    for (const id of ids) if (core.GM_STAFF_RESERVED_KEYS.includes(id)) fail(`${pack.id}: a post is called ${id}, which the block keeps for itself`);
    const heads = pack.posts.filter(p => p.head).map(p => p.id);
    if ((pack.rules.unpoachable ?? []).join('|') !== heads.join('|')) fail(`${pack.id}: head posts ${heads.join(',')} but unpoachable ${(pack.rules.unpoachable ?? []).join(',')}`);
    if (['nfl', 'nba', 'mlb', 'nhl'].includes(pack.id) && heads.length !== 1) fail(`${pack.id}: a front office has exactly one head coach to appoint, found ${heads.length}`);
    if (!pack.posts.some(p => p.headCoachTrack) && pack.id !== 'fightGym') fail(`${pack.id}: nobody on the staff can be hired away as a head coach`);
    for (const p of pack.posts) {
      posts += 1;
      if (p.head && p.headCoachTrack) fail(`${pack.id}/${p.id}: the head coach cannot also be the assistant who leaves to be one`);
      for (const text of [p.label, p.short, p.blurb]) {
        if (!text || !text.trim()) fail(`${pack.id}/${p.id}: an empty label, short name or blurb`);
        if (DASH.test(text)) fail(`${pack.id}/${p.id}: a dash in "${text}"`);
      }
      if (!p.effects.length) fail(`${pack.id}/${p.id}: a post that does nothing`);
      for (const e of p.effects) {
        effects += 1;
        const k = pack.keys[e.key];
        if (!k) { fail(`${pack.id}/${p.id}: moves ${e.key}, which the pack does not declare`); continue; }
        if (e.none !== k.none) fail(`${pack.id}/${p.id}/${e.key}: an empty chair is ${e.none} here and ${k.none} on the key`);
        if (k.mult && k.none !== 1) fail(`${pack.id}/${e.key}: a multiplier that is not 1 with nobody in the job (Round 95)`);
        if (e.best === e.none) fail(`${pack.id}/${p.id}/${e.key}: the top level is worth the same as nobody`);
        if (e.best < k.lo - EPS || e.best > k.hi + EPS) fail(`${pack.id}/${p.id}/${e.key}: best ${e.best} is outside the key's ${k.lo} to ${k.hi}`);
      }
    }
    for (const [key, k] of Object.entries(pack.keys)) {
      if (!(k.lo <= k.none && k.none <= k.hi)) fail(`${pack.id}/${key}: nobody in the job (${k.none}) is outside ${k.lo} to ${k.hi}`);
      const movers = pack.posts.flatMap(p => p.effects.filter(e => e.key === key));
      if (!movers.length) { fail(`${pack.id}/${key}: declared and moved by nobody`); continue; }
      /* The whole desk at the top level, added up by hand: it must land inside the bound, so the bound never eats a level somebody paid for. */
      const raw = k.mult ? movers.reduce((t, e) => t * (e.best / e.none), k.none) : movers.reduce((t, e) => t + (e.best - e.none), k.none);
      if (raw < k.lo - EPS || raw > k.hi + EPS) fail(`${pack.id}/${key}: a full top level desk makes ${raw}, past the bound ${k.lo} to ${k.hi}`);
      const got = core.gmStaffEffect(pack, blockAt(pack, () => 10), key);
      if (Math.abs(got - raw) > EPS) fail(`${pack.id}/${key}: the desk reads ${got} at the top, by hand it is ${raw}`);
      const empty = core.gmStaffEffect(pack, blockAt(pack, () => null), key);
      if (empty !== k.none) fail(`${pack.id}/${key}: an empty desk reads ${empty}, not ${k.none}`);
      if (core.gmStaffEffect(pack, null, key) !== k.none) fail(`${pack.id}/${key}: a save with no desk at all does not read ${k.none}`);
    }
    if (core.gmStaffEffect(pack, blockAt(pack, () => 10), 'noSuchKey') !== 0) fail(`${pack.id}: a key nobody declared is worth something`);
    for (const m of ['wageUnit', 'purseUnit', 'purseNote']) if (!pack.money[m]) fail(`${pack.id}: money.${m} is empty`);
    if (!(pack.money.ticksPerSeason >= 1) || !(pack.money.seasonPurse > 0)) fail(`${pack.id}: no season to pay the staff over`);
  }
  if (PACKS.length !== 8) fail(`${PACKS.length} packs, the round ships 8 (NFL, NBA, MLB, NHL, CFB, CBB, the fight gym, Australian football)`);
  if (new Set(PACKS.map(p => p.id)).size !== PACKS.length) fail('two packs share an id');
  console.log(`   ${PACKS.length} packs, ${posts} posts, ${effects} effects`);
}

if (CONTROL) {
  if (failures) { console.log(`\nGM STAFF: control ${CONTROL} fired, ${failures} failure(s), which is what a control is for`); process.exit(1); }
  console.error(`\nGM STAFF: control ${CONTROL} did NOT fire. The check it guards proves nothing.`);
  process.exit(2);
}
console.log(failures ? `\nGM STAFF: ${failures} failure(s)` : '\nGM STAFF: all green');
process.exit(failures ? 1 : 0);

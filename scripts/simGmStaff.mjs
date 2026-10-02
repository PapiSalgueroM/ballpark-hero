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
const CONTROLS = ['fixturewage', 'fixturecore', 'flat', 'nocap', 'noscout', 'poachhead', 'nopoach', 'dearstaff', 'wrongwords'];
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
if (CONTROL === 'nopoach') {
  controlCopy('core', 'return level < rules.poachFromLevel ? 0 : rules.poachPerLevel * (level - (rules.poachFromLevel - 1));', 'return 0;',
    'no rival ever comes in for anybody');
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
    for (const m of ['wageUnit', 'purseUnit', 'purseNote', 'tickWord']) if (!pack.money[m]) fail(`${pack.id}: money.${m} is empty`);
    if (!(pack.money.ticksPerSeason >= 1) || !(pack.money.seasonPurse > 0)) fail(`${pack.id}: no season to pay the staff over`);
  }
  if (PACKS.length !== 8) fail(`${PACKS.length} packs, the round ships 8 (NFL, NBA, MLB, NHL, CFB, CBB, the fight gym, Australian football)`);
  if (new Set(PACKS.map(p => p.id)).size !== PACKS.length) fail('two packs share an id');
  console.log(`   ${PACKS.length} packs, ${posts} posts, ${effects} effects`);
}

/* ---------- 3. Every level moves every effect ---------- */
console.log('3) Every level from 1 to 10 moves every effect its post declares, on the ladder and on the desk');
{
  let steps = 0;
  let thinnest = Infinity;
  for (const pack of PACKS) {
    for (const post of pack.posts) {
      for (const e of post.effects) {
        const k = pack.keys[e.key];
        const dir = Math.sign(e.best - e.none);
        const stepWant = Math.abs(e.best - e.none) / 9;
        const at = lv => core.gmEffectAt(e, lv, pack.rules.maxLevel);
        if (at(1) !== e.none) fail(`${pack.id}/${post.id}/${e.key}: level 1 is ${at(1)}, not exactly ${e.none}`);
        if (Math.abs(at(10) - e.best) > EPS) fail(`${pack.id}/${post.id}/${e.key}: level 10 is ${at(10)}, not ${e.best}`);
        /* The desk total with this man alone, and with everybody else already at the top. */
        const alone = lv => core.gmStaffEffect(pack, blockAt(pack, id => (id === post.id ? lv : null)), e.key);
        const crowded = lv => core.gmStaffEffect(pack, blockAt(pack, id => (id === post.id ? lv : 10)), e.key);
        for (const [what, read] of [['ladder', at], ['desk, alone', alone], ['desk, the rest at 10', crowded]]) {
          for (let lv = 1; lv < 10; lv++) {
            const move = (read(lv + 1) - read(lv)) * dir;
            steps += 1;
            /* Relative size of the step against an even ninth of the whole ladder. */
            const share = what === 'ladder' || !k.mult ? move / stepWant : move / (Math.abs(read(10) - read(1)) / 9);
            thinnest = Math.min(thinnest, share);
            if (!(share > 0.5)) fail(`${pack.id}/${post.id}/${e.key} (${what}): level ${lv} to ${lv + 1} moved ${move.toFixed(5)}, an even step is ${stepWant.toFixed(5)}`);
          }
        }
        if (alone(1) !== k.none) fail(`${pack.id}/${post.id}/${e.key}: a level 1 man alone on the desk reads ${alone(1)}, not ${k.none}`);
      }
    }
  }
  console.log(`   ${steps} level steps read, the thinnest ${thinnest.toFixed(3)} of an even ninth (floor 0.5; the flat control reads 0)`);
}

/* ---------- 4. Nothing pushes an effect past its ends ---------- */
console.log('4) A corrupt level cannot push a unit past its cap');
{
  const CORRUPT = [-1e9, -5, 0, 0.5, 10.5, 11, 99, 1e9, Infinity, -Infinity, NaN, '7', null, undefined];
  let readings = 0;
  let worst = 0;
  for (const pack of PACKS) {
    for (const post of pack.posts) {
      for (const e of post.effects) {
        const lo = Math.min(e.none, e.best);
        const hi = Math.max(e.none, e.best);
        for (const lv of CORRUPT) {
          const v = core.gmEffectAt(e, lv, pack.rules.maxLevel);
          readings += 1;
          if (!(v >= lo - EPS && v <= hi + EPS)) { fail(`${pack.id}/${post.id}/${e.key}: level ${String(lv)} reads ${v}, outside ${lo} to ${hi}`); worst = Math.max(worst, Math.abs(v)); }
        }
      }
    }
    /* And the whole desk, every chair corrupt at once, straight off a block no validator has seen. */
    for (const lv of [99, -99, 1e9]) {
      const bad = blockAt(pack, () => 5);
      for (const post of pack.posts) bad[post.id].level = lv;
      for (const [key, k] of Object.entries(pack.keys)) {
        const v = core.gmStaffEffect(pack, bad, key);
        readings += 1;
        if (!(v >= k.lo - EPS && v <= k.hi + EPS)) fail(`${pack.id}/${key}: a desk of level ${lv} reads ${v}, outside ${k.lo} to ${k.hi}`);
      }
      if (core.gmIsValidStaff(pack.rules, bad)) fail(`${pack.id}: a block with level ${lv} in every chair passes the validator`);
    }
  }
  /* The two sided edge the college coordinators carry, at the numbers collegeProgram.ts uses. */
  for (const r of [-1e9, 0, 45, 70, 95, 150, 1e9, NaN, Infinity]) {
    const v = core.gmBoundedEdge(r, 70, 0.12, 3);
    readings += 1;
    if (!(v >= -3 && v <= 3)) fail(`gmBoundedEdge(${r}) is ${v}, past the cap of 3`);
  }
  if (core.gmBoundedEdge(95, 70, 0.12, 3) !== 3 || core.gmBoundedEdge(45, 70, 0.12, 3) !== -3 || core.gmBoundedEdge(70, 70, 0.12, 3) !== 0) fail('gmBoundedEdge does not give a coordinator his 3, minus 3 and 0');
  console.log(`   ${readings} corrupt readings, every one inside its two ends`);
}

/* ---------- 5. The scouting read tightens at every level ---------- */
console.log('5) Draft grade noise shrinks at every level of scouting director, from 4 down to 1');
{
  const GRID = 9000;
  const us = Array.from({ length: GRID }, (_, i) => (i + 0.5) / GRID);
  const meanAbs = lv => us.reduce((t, u) => t + Math.abs(core.gmScoutNoise(u, lv)), 0) / GRID;
  /* With nobody in the job it is the front offices' own constant, draw for draw. */
  let same = 0;
  for (const u of us) if (core.gmScoutNoise(u, 1) === Math.floor(u * 9) - 4) same += 1;
  if (same !== GRID) fail(`at level 1 only ${same} of ${GRID} draws equal Math.floor(u * 9) - 4`);
  const stripped = lf(fs.readFileSync(path.join(ROOT, 'src/lib/frontOffice.ts'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (!stripped.includes('Math.floor(rng() * 9) - 4')) fail('frontOffice.ts no longer draws its scouting error as Math.floor(rng() * 9) - 4, so level 1 here is not "the draft as it is today" any more');
  if (core.gmScoutSpread(1) !== 4 || Math.abs(core.gmScoutSpread(10) - 1) > EPS) fail(`the spread runs ${core.gmScoutSpread(1)} to ${core.gmScoutSpread(10)}, not 4 to 1`);
  const means = LEVELS.map(meanAbs);
  let thinnest = Infinity;
  for (let i = 0; i < 9; i++) {
    const drop = means[i] - means[i + 1];
    thinnest = Math.min(thinnest, drop);
    /* Measured: every step drops the mean error by 0.185 (2.222 at level 1, 0.556 at level 10). Half of that is the floor. */
    if (!(drop > 0.09)) fail(`scouting level ${i + 1} to ${i + 2}: mean error ${means[i].toFixed(3)} to ${means[i + 1].toFixed(3)}, a drop of ${drop.toFixed(3)}`);
    const a = core.gmScoutBand(75, i + 1);
    const b = core.gmScoutBand(75, i + 2);
    if (!(b.spread < a.spread) || b.hi - b.lo > a.hi - a.lo) fail(`scouting level ${i + 1} to ${i + 2}: the band did not tighten (${a.lo} to ${a.hi}, then ${b.lo} to ${b.hi})`);
  }
  const b1 = core.gmScoutBand(75, 1);
  const b10 = core.gmScoutBand(75, 10);
  if (b1.lo !== 71 || b1.hi !== 79 || b10.lo !== 74 || b10.hi !== 76) fail(`a 75 is shown as ${b1.lo} to ${b1.hi} with nobody and ${b10.lo} to ${b10.hi} at the top, not 71 to 79 and 74 to 76`);
  for (const lv of [NaN, -3, 99, null]) if (!(core.gmScoutSpread(lv) >= 1 && core.gmScoutSpread(lv) <= 4)) fail(`scout spread at level ${String(lv)} is ${core.gmScoutSpread(lv)}`);
  /* Every pack that has a scouting post reads the same ladder through its own desk. */
  for (const pack of PACKS) {
    if (!pack.keys.scoutSpread) continue;
    const post = pack.posts.find(p => p.effects.some(e => e.key === 'scoutSpread'));
    for (const lv of LEVELS) {
      const v = core.gmStaffEffect(pack, blockAt(pack, id => (id === post.id ? lv : null)), 'scoutSpread');
      if (Math.abs(v - core.gmScoutSpread(lv)) > EPS) fail(`${pack.id}: the ${post.label} at level ${lv} reads a spread of ${v}, the ladder says ${core.gmScoutSpread(lv)}`);
    }
  }
  console.log(`   mean error ${means.map(m => m.toFixed(2)).join(' > ')}; thinnest step ${thinnest.toFixed(3)} (floor 0.09)`);
}

/* ---------- 6. The staff is affordable on each game's own money ---------- */
console.log('6) A full desk fits inside each game\'s season purse, and still costs something');
{
  const rows = [];
  for (const pack of PACKS) {
    const r = pack.rules;
    const season = (block, money = 1) => (core.gmStaffPayroll(r, block) * pack.money.ticksPerSeason) / r.wagePerPurse * money;
    const at = lv => {
      const b = blockAt(pack, () => lv);
      for (const post of pack.posts) b[post.id].wage = core.gmStaffWage(r, lv, 1, post.id);
      return b;
    };
    const top = season(at(10)) / pack.money.seasonPurse;
    const bottom = season(at(1)) / pack.money.seasonPurse;
    /* A middling owner's day one desk, the way a bind would open it. */
    const ctx = { owner: `Middling ${pack.id}`, world: 'now', season: 1, week: 1, money: 1, anchor: post => core.gmStatureAnchor(`Middling ${pack.id}`, post, 0.5), inHouse: 2, rivals: () => ['Rival A', 'Rival B'] };
    const day1 = season(core.gmDefaultStaff(r, ctx)) / pack.money.seasonPurse;
    /* Hiring a whole top level desk off the shortlist: the fees together. */
    const fees = pack.posts.reduce((t, p) => t + Math.max(r.feeBase, r.feeBase + r.feePerLevel * 10 * (r.pay?.[p.id] ?? 1)), 0) / pack.money.seasonPurse;
    const sev = pack.posts.reduce((t, p) => t + core.gmSeverance(r, { ...person(10), wage: core.gmStaffWage(r, 10, 1, p.id) }), 0) / pack.money.seasonPurse;
    rows.push(`${pack.id} top ${(top * 100).toFixed(0)}% day1 ${(day1 * 100).toFixed(0)}% floor ${(bottom * 100).toFixed(0)}% fees ${(fees * 100).toFixed(0)}% payoffs ${(sev * 100).toFixed(0)}%`);
    if (!(top <= 0.85)) fail(`${pack.id}: a full level 10 desk costs ${(top * 100).toFixed(0)}% of the season purse (ceiling 85%)`);
    if (!(day1 <= 0.6)) fail(`${pack.id}: a middling owner's day one desk costs ${(day1 * 100).toFixed(0)}% of the season purse (ceiling 60%)`);
    if (!(bottom >= 0.03)) fail(`${pack.id}: a level 1 desk costs ${(bottom * 100).toFixed(1)}% of the purse, which is nothing`);
    if (!(fees <= 0.6)) fail(`${pack.id}: hiring a whole level 10 desk costs ${(fees * 100).toFixed(0)}% of the purse in fees (ceiling 60%)`);
    if (!(sev <= 0.6)) fail(`${pack.id}: paying off a whole level 10 desk costs ${(sev * 100).toFixed(0)}% of the purse (ceiling 60%)`);
    if (!(top > day1 && day1 > bottom)) fail(`${pack.id}: the payroll does not rise with the level (${bottom}, ${day1}, ${top})`);
  }
  console.log(`   ${rows.join('\n   ')}`);
}

/* ---------- 7. Every pack's desk, run for six seasons ---------- */
console.log('7) Six seasons of every desk: approaches arrive at a measured rate, never for the head coach, and the books add up');
const RATES = {};
{
  const RIVALS = Array.from({ length: 12 }, (_, i) => `Rival ${i + 1}`);
  const SEASONS = 6;
  const OWNERS = 40;
  let ticks = 0;
  let hires = 0;
  let headApproaches = 0;
  let lowApproaches = 0;
  let grew = 0;
  for (const pack of PACKS) {
    const r = pack.rules;
    const dp = r.purseDp ?? 2;
    const roundTo = n => Math.round(n * 10 ** dp) / 10 ** dp;
    for (const salt of ['a', 'b', 'c']) {
      for (const regime of ['natural', 'strong']) {
        let approaches = 0;
        let assistantCalls = 0;
        for (let o = 0; o < OWNERS; o++) {
          const owner = `${pack.id} owner ${salt}${o}`;
          const stature = o / (OWNERS - 1);
          const ctxAt = (season, week) => ({ owner, world: 'now', season, week, money: 1, anchor: post => core.gmStatureAnchor(owner, post, stature), inHouse: 2, rivals: () => RIVALS });
          let block = core.gmDefaultStaff(r, ctxAt(1, 0));
          if (regime === 'strong') for (const p of pack.posts) block[p.id] = { ...block[p.id], level: 8, potential: 10, wage: core.gmStaffWage(r, 8, 1, p.id) };
          let answered = 0;
          for (let season = 1; season <= SEASONS; season++) {
            let purse = pack.money.seasonPurse;
            let matched = 0;
            for (let week = 1; week <= pack.money.ticksPerSeason; week++) {
              ticks += 1;
              const ctx = ctxAt(season, week);
              const ev = core.gmTickStaff(r, block, ctx);
              if (ev?.kind === 'approach') {
                approaches += 1;
                const post = pack.posts.find(p => p.id === ev.post);
                if (post.head) headApproaches += 1;
                if (post.headCoachTrack) assistantCalls += 1;
                if (ev.person.level < r.poachFromLevel) lowApproaches += 1;
                const turn = answered++ % 3;
                if (turn === 0) {
                  const m = core.gmMatchStaffOffer(r, block);
                  if (m) { matched += 1; block = m.next; if (m.raised.wage < m.person.wage + 1) fail(`${pack.id}: matching did not raise his wage`); }
                } else if (turn === 1) block = core.gmReleaseToPoacher(block).next;
              }
              if (matched > r.matchesPerSeason) fail(`${pack.id}: ${matched} matches in one season, the limit is ${r.matchesPerSeason}`);
              for (const p of pack.posts) {
                if (block[p.id]) continue;
                const list = core.gmStaffShortlist(r, block, ctx, p.id);
                const pick = list.find(c => c.fee <= purse && !c.person.academy) ?? list[list.length - 1];
                const done = core.gmHireStaff(r, block, ctx, p.id, pick.person.id, purse);
                if (!done) { fail(`${pack.id}: could not appoint anybody to ${p.id} on a purse of ${purse}`); break; }
                if (done.purse !== roundTo(purse - pick.fee)) fail(`${pack.id}: a hire left ${done.purse}, the fee was ${pick.fee} on ${purse}`);
                purse = done.purse;
                block = done.next;
                hires += 1;
                const halves = list.flatMap(c => c.person.name.split(' '));
                if (new Set(halves).size !== halves.length) fail(`${pack.id}: a shortlist with two people sharing half a name: ${list.map(c => c.person.name).join(', ')}`);
                break;
              }
              purse = roundTo(purse - (core.gmStaffPayroll(r, block) / r.wagePerPurse));
              if (!core.gmIsValidStaff(r, block)) { fail(`${pack.id}: the block failed its own validator in season ${season} week ${week}`); break; }
              const seated = pack.posts.map(p => block[p.id]?.name).filter(Boolean).flatMap(n => n.split(' '));
              if (new Set(seated).size !== seated.length) fail(`${pack.id}: two people on one desk share half a name: ${seated.join(' ')}`);
            }
            const next = core.gmRolloverStaff(r, block, ctxAt(season + 1, 0));
            for (const p of pack.posts) {
              const a = block[p.id];
              const b = next[p.id];
              if (a && b && b.level > a.level) grew += 1;
              if (b && (b.level > b.potential || b.level - (a?.level ?? 0) > 1)) fail(`${pack.id}: ${p.id} went from ${a?.level} to ${b.level} (potential ${b.potential}) in one summer`);
            }
            block = next;
          }
        }
        const perSeason = approaches / (OWNERS * SEASONS);
        RATES[`${pack.id}|${regime}|${salt}`] = perSeason;
        if (regime === 'strong' && pack.posts.some(p => p.headCoachTrack) && assistantCalls === 0) fail(`${pack.id}: nobody ever came in for a strong assistant`);
      }
    }
  }
  /* Measured on 2026-10-02, three owner sets of forty, six seasons each: the
     strong desk (everybody on level 8) drew the rates in STRONG_MEASURED a
     season. The band is half the lowest to one and a half times the highest,
     so a desk whose approaches halved or grew by half fails and the spread
     between owner sets (about ten percent) does not. The nopoach control
     reads 0 everywhere. */
  const STRONG_MEASURED = { nfl: [1.33, 1.40], nba: [1.05, 1.18], mlb: [1.27, 1.38], nhl: [1.18, 1.24], cfb: [0.32, 0.36], cbb: [0.29, 0.34], fightGym: [1.48, 1.65], afl: [1.38, 1.60] };
  for (const pack of PACKS) {
    const [lo, hi] = STRONG_MEASURED[pack.id] ?? [NaN, NaN];
    for (const salt of ['a', 'b', 'c']) {
      const strong = RATES[`${pack.id}|strong|${salt}`];
      const natural = RATES[`${pack.id}|natural|${salt}`];
      if (!(strong >= lo * 0.5 && strong <= hi * 1.5)) fail(`${pack.id} (owner set ${salt}): a strong desk drew ${strong.toFixed(2)} approaches a season, the band is ${(lo * 0.5).toFixed(2)} to ${(hi * 1.5).toFixed(2)}`);
      /* Outcome against a baseline: good staff get noticed. Measured ratio 1.85 at the lowest. */
      if (!(strong >= natural * 1.3)) fail(`${pack.id} (owner set ${salt}): a level 8 desk drew ${strong.toFixed(2)} a season against ${natural.toFixed(2)} as it opens, under 1.3 times`);
    }
  }
  if (headApproaches) fail(`${headApproaches} approaches for a head coach, whom only the GM can let go`);
  if (lowApproaches) fail(`${lowApproaches} approaches for somebody under level 6`);
  const line = PACKS.map(p => `${p.id} ${['natural', 'strong'].map(g => ['a', 'b', 'c'].map(s => RATES[`${p.id}|${g}|${s}`].toFixed(2)).join('/')).join(' then ')}`);
  console.log(`   ${ticks} ticks, ${hires} appointments, ${grew} summer steps up; approaches a season (as the desk opens, then all on level 8, three owner sets):\n   ${line.join('\n   ')}`);
}

/* ---------- 8. Every tile says what the code does ---------- */
console.log('8) Every effect line, at every level, says the number the game applies');
{
  let lines = 0;
  const DASH = /[–—]/;
  for (const pack of PACKS) {
    for (const post of pack.posts) {
      for (const e of post.effects) {
        const k = pack.keys[e.key];
        if (core.gmEffectLine(k, e, null) !== core.GM_STAFF_EMPTY_LINE) fail(`${pack.id}/${post.id}: an empty chair promises something`);
        for (const lv of LEVELS) {
          const line = core.gmEffectLine(k, e, lv, pack.rules.maxLevel);
          const v = core.gmEffectAt(e, lv, pack.rules.maxLevel);
          lines += 1;
          if (DASH.test(line)) fail(`${pack.id}/${post.id}: a dash in "${line}"`);
          if (lv === 1) { if (line !== core.GM_STAFF_NO_LIFT_LINE) fail(`${pack.id}/${post.id}/${e.key}: level 1 says "${line}"`); continue; }
          let said = NaN;
          let truth = NaN;
          let tol = 0;
          if (k.mult) { said = Number(line.match(/^([+-]?\d+(?:\.\d+)?)% on /)?.[1]) / 100; truth = v / e.none - 1; tol = 0.0005 + EPS; }
          else if (e.none === 0) { said = Number(line.match(/^\+(\d+(?:\.\d+)?) /)?.[1]); truth = v; tol = 0.005 + EPS; }
          else { said = Number(line.match(/^(\d+(?:\.\d+)?), from /)?.[1]); truth = v; tol = 0.05 + EPS; }
          if (!(Math.abs(said - truth) <= tol)) fail(`${pack.id}/${post.id}/${e.key} at level ${lv}: the tile says "${line}", the game applies ${truth.toFixed(4)}`);
          if (!line.includes(k.what)) fail(`${pack.id}/${post.id}/${e.key}: the line does not say what it moves: "${line}"`);
        }
      }
    }
  }
  /* The panel prints those lines and reads the limits; it never types a number of its own. */
  const panelPath = path.join(ROOT, 'src/components/front-office-shared/GmStaffPanel.tsx');
  if (fs.existsSync(panelPath)) {
    const panel = lf(fs.readFileSync(panelPath, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
    for (const need of ['gmEffectLine', 'matchesLeft', 'gmStaffShortlist', 'wageUnit']) if (!panel.includes(need)) fail(`GmStaffPanel.tsx does not use ${need}`);
    if (/\b\d+ match(es)? left/.test(panel)) fail('GmStaffPanel.tsx types the match limit as a number instead of reading it');
    if (DASH.test(panel)) fail('a dash in GmStaffPanel.tsx');
  } else fail('src/components/front-office-shared/GmStaffPanel.tsx is missing');
  console.log(`   ${lines} lines read back against the ladder`);
}

if (CONTROL) {
  if (failures) { console.log(`\nGM STAFF: control ${CONTROL} fired, ${failures} failure(s), which is what a control is for`); process.exit(1); }
  console.error(`\nGM STAFF: control ${CONTROL} did NOT fire. The check it guards proves nothing.`);
  process.exit(2);
}
console.log(failures ? `\nGM STAFF: ${failures} failure(s)` : '\nGM STAFF: all green');
process.exit(failures ? 1 : 0);

/* Round 1225 harness: binding real fixture lists moved nothing it was not meant to move.
 *
 * WHY. A league's real 2026/27 list is bound in ONE line of REAL_LEAGUE_FIXTURES. Only a new original career
 * whose page fetched that list may play it. Everything else has to be the game it was: a caller that fetches
 * nothing (every harness, every test, the two dailies), an old save, a custom or edited world, another start
 * year. This harness holds that by league, against the WHOLE src tree of a base commit bundled on its own.
 *
 *   CM_FIXTURE_BASE=<commit> node scripts/simCmFixtureFleet.mjs
 *
 * SECTIONS (a red names the leagues it is red for):
 *  1. nofetch   Nothing fetched, as every harness and test runs. For every league of the game, 2 clubs x 3 seeds:
 *               startCareer, twelve entries and the saved bytes equal the base's, draw for draw, with NO field
 *               taken out. The same for every league of the four past seasons (2 clubs x 2 seeds), a founded
 *               club in three leagues and two edited worlds. So no cohort anywhere can carry a new key.
 *  2. oldsaves  Every list fetched, as a page that opened a bound save has them. Saves made by the BASE engine
 *               in every registered league (2 clubs x 2 seeds, at week 0, after fifteen league rounds and in the
 *               last week of season one; the Premier League's hold their key, and again with it taken out):
 *               the candidate loads each, plays a match week (in the last week: the rollover and into season
 *               two) and saves the same bytes as the base doing the same, after the same number of draws.
 *  3. dailies   Manager Hot Seat and Deadline Day for one club of every registered league and one league with
 *               no list: with every list fetched the day carries no key and is dealt exactly as with nothing
 *               fetched. (scripts/simDailyDeals.mjs holds the dated deals against Release AS; this is the
 *               case its bundle cannot reach, a player who started a career and then opened a daily.)
 * Sections 1 and 2 need the base. Without CM_FIXTURE_BASE they are NOT RUN and the run says so in one loud
 * line; section 3 always runs. A base that cannot be read is an error (exit 2), never a skip.
 *
 * CONTROLS (CM_FIXTURE_FLEET_CONTROL=<name>, each runs its own section alone; exit 1 and a last line that says
 * FIRED when exactly the leagues it names went red, exit 3 when it did not fire, exit 2 when it could not run):
 *   prefetch  section 1 with every list fetched first: every league with a list in a file of its own, and
 *             only those, must go red (their fresh saves now hold a key). This is why section 1 fetches nothing.
 *   keyless   section 2 with the helper reading a league's list whatever key the save holds: every
 *             registered league must go red.
 *   nostrip   section 3 with the Hot Seat's strip of the key taken out: every registered league must go red
 *             and the league with no list must stay green.
 * Green is the closing summary line and exit code 0.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CM_FIXTURE_BASE || '';
const CONTROL = process.env.CM_FIXTURE_FLEET_CONTROL || '';
const cannot = why => { console.error(`simCmFixtureFleet: cannot run: ${why}`); process.exit(2); };
const CONTROLS = {
  prefetch: { section: 'nofetch' },
  keyless: { section: 'oldsaves', file: 'src/lib/clubManagerFixtures.ts', from: 'e.key === state.realLeagueFixtures', to: 'e.leagueId === leagueId' },
  nostrip: { section: 'dailies', file: 'src/lib/managerHotSeat.ts', from: '  delete s.realLeagueFixtures;', to: '' },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL}, the controls are ${Object.keys(CONTROLS).join(', ')}`);
const NEEDS_BASE = ['nofetch', 'oldsaves'];
if (CONTROL && NEEDS_BASE.includes(CONTROLS[CONTROL].section) && !BASE) cannot(`the control ${CONTROL} runs a section that compares with a base, so it needs CM_FIXTURE_BASE=<commit>`);
const OUTSIDER = 'scottish';

function seeded(seed, fn) {
  const random = Math.random, now = Date.now;
  let a = seed >>> 0, draws = 0;
  Math.random = () => {
    draws++;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => 1791547200000;
  try { return { value: fn(), draws }; }
  finally { Math.random = random; Date.now = now; }
}
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 20);
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const savedBytes = (engine, state) => { store.clear(); assert.equal(engine.saveCareer(state), true, 'the save is written'); return store.get(engine.SAVE_KEY); };

/* ---- the two engines ---- */
const tempRoot = path.join(ROOT, '.sim-control');
fs.mkdirSync(tempRoot, { recursive: true });
const folder = fs.mkdtempSync(path.join(tempRoot, 'cm-fixture-fleet-'));
const require = createRequire(import.meta.url);
const fresh = file => { delete require.cache[require.resolve(file)]; return require(file); };
const P = file => JSON.stringify(file.split(path.sep).join('/'));
async function bundleTree(name, src, withDailies) {
  const entry = path.join(folder, `${name}-entry.ts`), out = path.join(folder, `${name}.cjs`);
  fs.writeFileSync(entry, `export * as cm from ${P(path.join(src, 'lib/clubManager.ts'))};\n`
    + (withDailies ? `export * as fx from ${P(path.join(src, 'lib/clubManagerFixtures.ts'))};\nexport * as hs from ${P(path.join(src, 'lib/managerHotSeat.ts'))};\nexport * as dd from ${P(path.join(src, 'lib/deadlineDay.ts'))};\n` : ''));
  const spec = withDailies && CONTROL ? CONTROLS[CONTROL] : null;
  const plugin = {
    name: 'fleet-control',
    setup(b) {
      if (!spec || !spec.file) return;
      const target = path.join(ROOT, spec.file);
      b.onLoad({ filter: /\.ts$/ }, args => {
        if (path.resolve(args.path) !== target) return null;
        const text = fs.readFileSync(args.path, 'utf8');
        const count = text.split(spec.from).length - 1;
        if (count !== 1) cannot(`control ${CONTROL}: its anchor is in ${spec.file} ${count} times, it must be there exactly once`);
        return { contents: text.replace(spec.from, spec.to), loader: 'ts' };
      });
    },
  };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
    alias: { '@': src }, nodePaths: [path.join(ROOT, 'node_modules')], plugins: [plugin] });
  return out;
}
let baseSha = '', baseFile = null;
if (BASE) {
  try { baseSha = execFileSync('git', ['rev-parse', '--verify', `${BASE}^{commit}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch (error) { cannot(`the base ${BASE} is not a commit this clone has (${String(error.stderr || error.message).trim().split('\n')[0]})`); }
  const dir = path.join(folder, 'base');
  fs.mkdirSync(dir);
  try {
    execFileSync('git', ['archive', '--format=tar', '-o', path.join(dir, 'src.tar'), baseSha, 'src'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    execFileSync('tar', ['-xf', 'src.tar'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) { cannot(`the src tree of the base ${baseSha} could not be read (${String(error.stderr || error.message).trim().split('\n')[0]})`); }
  baseFile = await bundleTree('base', path.join(dir, 'src'), false);
}
const candidateFile = await bundleTree('candidate', path.join(ROOT, 'src'), true);
/** A fresh copy of the candidate. fetch: every registered list is fetched first, the way a page fetches one. */
async function candidate(fetch) {
  const mod = fresh(candidateFile);
  if (fetch) for (const e of mod.fx.REAL_LEAGUE_FIXTURES) await mod.fx.ensureRealLeagueFixtures(e.key);
  return mod;
}
const probe = fresh(candidateFile);
const REGISTERED = probe.fx.REAL_LEAGUE_FIXTURES.map(e => ({ key: e.key, leagueId: e.leagueId, lazy: !e.ledger }));
const LEAGUES = probe.cm.REAL_LEAGUES.map(l => ({ id: l.id, clubs: [...l.clubs] }));
const clubsOf = (mod, leagueId, count) => {
  const playable = mod.cm.playableClubs(leagueId).filter(c => !c.partial).map(c => c.name);
  const pool = playable.length >= count ? playable : LEAGUES.find(l => l.id === leagueId).clubs;
  return [pool[0], pool[pool.length - 1], pool[Math.floor(pool.length / 2)]].slice(0, count);
};
const reds = { nofetch: new Map(), oldsaves: new Map(), dailies: new Map() };
const red = (section, leagueId, why) => { if (!reds[section].has(leagueId)) reds[section].set(leagueId, why); };
const counts = { nofetch: 0, oldsaves: 0, dailies: 0 };
const clone = value => JSON.parse(JSON.stringify(value));
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

/* ---- 1. nofetch ---- */
function compareCareer(leagueId, label, base, cand, start, seed, entries = 12) {
  counts.nofetch += 1;
  const a = seeded(seed, () => start(base.cm)), b = seeded(seed, () => start(cand.cm));
  if (a.draws !== b.draws) return red('nofetch', leagueId, `${label}: startCareer drew ${b.draws} random numbers, the base ${a.draws}`);
  if (!same(a.value, b.value)) return red('nofetch', leagueId, `${label}: the fresh save is not the base's${'realLeagueFixtures' in b.value && !('realLeagueFixtures' in a.value) ? ' (it holds a fixture key the base does not)' : ''}`);
  let sa = a.value, sb = b.value;
  for (let i = 0; i < entries; i++) {
    const x = seeded(seed + 100 + i, () => base.cm.playNextEntry(sa, { skipHalftime: true }));
    const y = seeded(seed + 100 + i, () => cand.cm.playNextEntry(sb, { skipHalftime: true }));
    if (x.draws !== y.draws || !same(x.value, y.value)) return red('nofetch', leagueId, `${label}: entry ${i + 1} is not the base's`);
    sa = x.value.state; sb = y.value.state;
  }
  if (savedBytes(base.cm, sa) !== savedBytes(cand.cm, sb)) red('nofetch', leagueId, `${label}: the saved bytes after ${entries} entries are not the base's`);
  return null;
}
async function nofetch() {
  const fetch = CONTROL === 'prefetch';
  for (const league of LEAGUES) {
    const base = fresh(baseFile), cand = await candidate(fetch);
    for (const club of clubsOf(probe, league.id, 2)) for (const seed of [1101, 2202, 3303]) compareCareer(league.id, `${club} seed ${seed}`, base, cand, cm => cm.startCareer(club), seed);
  }
  for (const eraId of ['era2020', 'era2015', 'era2010', 'era2005']) {
    const base = fresh(baseFile), cand = await candidate(fetch);
    await base.cm.ensureEraRosters(eraId); await cand.cm.ensureEraRosters(eraId);
    const eraLeagues = cand.cm.worldLeagueDefs({ eraId });
    assert.ok(eraLeagues.length > 0, `the past season ${eraId} has leagues`);
    for (const league of eraLeagues) {
      const names = cand.cm.eraPlayableClubs(eraId, league.id).map(c => c.name);
      for (const club of [names[0], names[names.length - 1]]) for (const seed of [4404, 5505]) compareCareer(league.id, `${eraId} ${club} seed ${seed}`, base, cand, cm => cm.startCareer(club, eraId), seed);
    }
  }
  for (const leagueId of ['premier', 'laliga', OUTSIDER]) {
    const clubs = LEAGUES.find(l => l.id === leagueId).clubs;
    const spec = { name: 'Test Fixture FC', stadium: 'Test Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'TFC' }, budgetTier: 'small', leagueId, replacedClub: clubs.at(-1) };
    for (const seed of [6606, 7707]) compareCareer(leagueId, `a founded club, seed ${seed}`, fresh(baseFile), await candidate(fetch), cm => cm.startCareer(spec.name, 'now', clone(spec)), seed);
  }
  for (const leagueId of ['premier', 'bundesliga']) {
    const clubs = LEAGUES.find(l => l.id === leagueId).clubs;
    compareCareer(leagueId, 'an edited world', fresh(baseFile), await candidate(fetch), cm => cm.startCareer(clubs[0], 'now', undefined, undefined, undefined, { [leagueId]: [...clubs] }), 8808);
  }
}

/* ---- 2. oldsaves ---- */
function carry(engine, bytes, seed) {
  try {
    store.clear(); store.set(engine.SAVE_KEY, bytes);
    const loaded = seeded(seed, () => engine.loadCareer());
    if (!loaded.value) return { refused: true };
    let state = loaded.value;
    const draws = [loaded.draws];
    for (let i = 0; i < 4; i++) {
      if (state.week >= state.calendar.length) {
        const closed = seeded(seed + 10 + i, () => engine.finishSeason(state));
        const next = seeded(seed + 20 + i, () => engine.startNextSeason(closed.value.state));
        draws.push(closed.draws, next.draws); state = next.value;
      }
      const run = seeded(seed + 30 + i, () => engine.playNextEntry(state, { skipHalftime: true }));
      draws.push(run.draws); state = run.value.state;
    }
    return { bytes: sha(savedBytes(engine, state)), draws: draws.join(','), season: state.season, week: state.week };
  } catch (error) { return { threw: String(error && error.message) }; }
}
async function oldsaves() {
  for (const reg of REGISTERED) {
    for (const club of clubsOf(probe, reg.leagueId, 2)) for (const seed of [41, 42]) {
      /* The save is made by the base's own code, start to last week, in a copy of the base engine of its own:
         the engine keeps counters in its module, and the two engines that carry a save must both start clean. */
      const base = fresh(baseFile);
      let state = seeded(seed, () => base.cm.startCareer(club)).value;
      const stages = [['week 0', clone(state)]];
      let leagueRounds = 0;
      for (let i = 0; i < 400 && state.week < state.calendar.length - 1; i++) {
        const entry = state.calendar[state.week], before = state.week;
        state = seeded(seed * 1000 + i, () => base.cm.playNextEntry(state, { skipHalftime: true })).value.state;
        if (state.week === before) break;
        if (entry.type === 'league') leagueRounds += 1;
        if (leagueRounds === 15 && stages.length === 1) stages.push(['after fifteen league rounds', clone(state)]);
      }
      stages.push([`week ${state.week + 1} of ${state.calendar.length}, the end of season one`, clone(state)]);
      for (const [stage, saved] of stages) {
        const bytes = savedBytes(base.cm, saved);
        const variants = [[stage, bytes]];
        if (JSON.parse(bytes).realLeagueFixtures) { const bare = JSON.parse(bytes); delete bare.realLeagueFixtures; variants.push([`${stage}, its key taken out`, JSON.stringify(bare)]); }
        for (const [label, input] of variants) {
          counts.oldsaves += 1;
          const x = carry(fresh(baseFile).cm, input, seed + 500), y = carry((await candidate(true)).cm, input, seed + 500);
          if (x.threw || x.refused) red('oldsaves', reg.leagueId, `${club} seed ${seed}, ${label}: the BASE could not carry its own save (${x.threw || 'refused'})`);
          else if (!same(x, y)) red('oldsaves', reg.leagueId, `${club} seed ${seed}, ${label}: base ${JSON.stringify(x)}, candidate ${JSON.stringify(y)}`);
        }
      }
    }
  }
}

/* ---- 3. dailies ---- */
async function dealt(club, fetch) {
  const mod = await candidate(fetch), date = '2026-10-10';
  store.clear();
  return seeded(9001, () => {
    let run = mod.hs.startHotSeat({ club, seed: 771, daily: date });
    let keyed = 'realLeagueFixtures' in run.state;
    const opened = [run.takeover, run.target, mod.hs.upcoming(run), run.state.table];
    for (let guard = 0; !run.verdict && guard < 40; guard++) run = mod.hs.pendingPress(run) ? mod.hs.answerHotSeatPress(run, 0) : mod.hs.playHotSeatMatch(run, 'balanced', null);
    keyed ||= 'realLeagueFixtures' in run.state;
    const played = [run.log.map(m => [m.compLabel, m.opponent, m.home, m.myGoals, m.oppGoals, m.res]), run.verdict ? [run.verdict.kind, run.points] : null];
    let deadline;
    try {
      const day = mod.dd.startDeadlineDay({ ...mod.dd.dailyDeadlineDay(date), club });
      keyed ||= 'realLeagueFixtures' in day.state;
      deadline = [day.needs, day.targets, day.sales, day.startBudget, day.ticker, mod.dd.gradeWindow(mod.dd.endDay(day))];
    } catch (error) { deadline = ['Deadline Day would not start for this club', String(error && error.message)]; }
    return { keyed, digest: sha([opened, played, deadline]) };
  }).value;
}
async function dailies() {
  for (const leagueId of [...REGISTERED.map(r => r.leagueId), OUTSIDER]) {
    const club = clubsOf(probe, leagueId, 1)[0];
    counts.dailies += 1;
    const plain = await dealt(club, false), fetched = await dealt(club, true);
    if (plain.keyed || fetched.keyed) red('dailies', leagueId, `${club}: the day carries the real fixture key${fetched.keyed && !plain.keyed ? ' once the lists are fetched' : ''}`);
    else if (plain.digest !== fetched.digest) red('dailies', leagueId, `${club}: the day is dealt differently once the lists are fetched (${plain.digest} and ${fetched.digest})`);
  }
}

/* ---- run ---- */
const SECTIONS = { nofetch, oldsaves, dailies };
const wanted = CONTROL ? [CONTROLS[CONTROL].section] : Object.keys(SECTIONS);
const notRun = wanted.filter(s => !BASE && NEEDS_BASE.includes(s));
let exit = 0;
try {
  for (const name of wanted) {
    if (notRun.includes(name)) continue;
    await SECTIONS[name]();
    const mine = reds[name];
    console.log(`${name}: ${mine.size ? `RED for ${[...mine.keys()].join(', ')}` : 'green'} (${counts[name]} ${name === 'nofetch' ? 'careers' : name === 'oldsaves' ? 'saves' : 'clubs'})`);
    for (const [leagueId, why] of [...mine].slice(0, 12)) console.log(`  FAIL ${leagueId}: ${why.slice(0, 400)}`);
  }
  const registered = `${REGISTERED.length} registered league(s), ${REGISTERED.filter(r => r.lazy).length} in a file of their own`;
  if (CONTROL) {
    const section = CONTROLS[CONTROL].section;
    const want = (CONTROL === 'prefetch' ? REGISTERED.filter(r => r.lazy) : REGISTERED).map(r => r.leagueId).sort();
    const got = [...reds[section].keys()].sort();
    if (!want.length) { console.error(`simCmFixtureFleet: CONTROL ${CONTROL} COULD NOT RUN: no list is registered that it could move`); exit = 2; }
    else if (same(got, want)) { console.log(`simCmFixtureFleet: CONTROL ${CONTROL} FIRED: section ${section} went red for exactly its ${want.length} league(s) (${want.join(', ')}) and no other`); exit = 1; }
    else { console.error(`simCmFixtureFleet: CONTROL ${CONTROL} DID NOT FIRE as it must: section ${section} red for [${got.join(', ')}], wanted exactly [${want.join(', ')}]`); exit = 3; }
  } else {
    const total = Object.values(reds).reduce((sum, m) => sum + m.size, 0);
    if (notRun.length) console.log(`simCmFixtureFleet: NOT RUN, ${notRun.join(' and ')}: they compare with a base engine and no CM_FIXTURE_BASE was given.`);
    if (total) { console.error(`simCmFixtureFleet: ${total} FAILURE(S): ${Object.entries(reds).filter(([, m]) => m.size).map(([s, m]) => `${s} [${[...m.keys()].join(', ')}]`).join(', ')}`); exit = 1; }
    else console.log(`simCmFixtureFleet: green. ${registered}. nofetch ${notRun.includes('nofetch') ? 'NOT RUN' : `${counts.nofetch} careers`}, oldsaves ${notRun.includes('oldsaves') ? 'NOT RUN' : `${counts.oldsaves} saves`}, dailies ${counts.dailies} clubs${BASE ? `, against the base ${baseSha}` : ''}.`);
  }
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
}
process.exit(exit);

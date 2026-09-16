/* Club Manager: the league fixture list alternates venues the way a real one
   does, and a save from before the change keeps the list it started with.

   Round 617. roundPairs in src/lib/clubManager.ts builds each league round
   with the circle method and used to swap home and away on (r + i) % 2,
   where r is the round inside the half and i the pair index. For every
   rotating club the pair index moves with the round, so (r + i) keeps its
   parity and the club keeps its venue for its whole run through one row of
   the circle: the club at shuffled slot k plays k rounds at one venue and
   the rest of the half at the other. Longest same venue run 19 in a 20 club
   league, 17 in an 18 club league. Seen in play: Newcastle away for its
   first fifteen league rounds.

   The fix (docs/design/round-617-fixture-list-contract.md) is per save.
   roundPairs(clubs, round, balanced) swaps on the round's parity alone when
   balanced is true and on (r + i) when it is false, byte for byte the old
   output. CareerState carries balancedFixtures?: true, startCareer and
   startNextSeason set it, every caller passes !!state.balancedFixtures, and
   a save without the field keeps its old venues for the season it is in.

   Sections:
     1) the balanced rule over every league size the game plays. The sizes
        come off REAL_LEAGUES and every historic era's leagues through the
        engine's own exports, never from a list typed here, plus 13 and 15
        for the odd path. Over a whole season every club plays once a round
        (or sits out exactly once a round in an odd league, and the bye ghost
        never gets out into a pair), meets every other club once at home and
        once away, has home equal to away, and never has a same venue run
        past 2. Prints the sizes and the worst run.
     2) the old rule is untouched: roundPairs(clubs, r, false) equals a
        verbatim copy of the pre 617 function, kept below as the oracle, for
        every round of every size in section 1. The oracle is also held to
        the documented defect (a worst run of n minus 1) so it cannot quietly
        become a copy of the new rule. This is what protects a save mid
        season.
     3) through the engine. One career per distinct real league size:
        startCareer sets the field, fixtureFor over the whole calendar's
        league entries gives my club a run of at most 2 with home equal to
        away; the same save with the field deleted answers the OLD pattern
        venue for venue, read as every club in the league; one played entry
        and a save and load leave the field absent (nothing migrates it mid
        season); finishSeason then startNextSeason on that save returns one
        with the field set.
     4) the AI world plays the same list. After a fresh career's first eight
        league rounds, every world league's pair ledger (the results the
        world really wrote) holds exactly the balanced pairs for the rounds
        it has played, and the replayed list has no club at one venue three
        rounds running.
     5) words match code, on the comment stripped source: roundPairs is
        exported with (clubs, round, balanced), one branch swaps on the round
        alone with the flag on its line or the six above, one swaps on
        (r + i), every caller passes three arguments with the save's
        balancedFixtures as the third, the interface declares the field, both
        season starts set it, the file has no dash, and no other file under src
        carries its own copy of the venue swap (the detector is first held to
        the old calendar card's body, so a clean result is a real one).

   What a same venue run is here. It is measured over rounds. In an odd
   league a club's bye round ends the run: the balanced rule then gives at
   most 2 at 13 and 15 clubs, which is the contract's figure. Measured over
   games played with the bye skipped it gives 3 (away, bye, away, away is
   possible), so if that stricter reading is ever wanted the rule has to
   change first, not this number.

   The shapes section 5 and the controls look for, in roundPairs' body and
   outside comments. Either one remainder over a ternary operand,
   `(balanced ? r : r + i) % 2`, which is how Round 617 wrote it, or two
   expressions, the round parity as `r % 2` and the legacy parity as
   `(r + i) % 2` (or `(i + r) % 2`), with the flag on the round parity's line
   or within six lines above it. A body that writes them another way reads
   as missing here. In startCareer and startNextSeason the field is set as
   `balancedFixtures: true` in the state literal or
   `state.balancedFixtures = true` on a line of its own.

   Negative controls (house rule: prove the checks can fail). Each rewrites
   a copy of clubManager.ts that is bundled in place of the real one, refuses
   to run if its text is not there, and prints which sections it expects red;
   the run passes only if every one of those went red:
     FIXTURE_CONTROL=oldparity  the balanced branch swaps on (r + i) too.
                                Sections 1, 3 and 4 must go red.
     FIXTURE_CONTROL=noflag     startCareer no longer sets the field.
                                Section 3 must go red.
     FIXTURE_CONTROL=flipold    the legacy branch swaps on the round alone.
                                Sections 2 and 3 must go red.

   Nothing here asserts a max of a noisy quantity: the schedule is a pure
   function of (clubs, round, balanced), so "at most 2" is a structural fact.

   Run: node scripts/simFixtureBalance.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENGINE_REL = 'src/lib/clubManager.ts';
const ENGINE_PATH = path.join(ROOT, ENGINE_REL);
const lf = s => s.replaceAll('\r\n', '\n');
const norm = p => path.resolve(p).replaceAll('\\', '/').toLowerCase();

let failures = 0;
let section = '';
const redSections = new Set();
const fail = m => { failures += 1; redSections.add(section); console.error('  FAIL: ' + m); };
const run = (id, title, body) => {
  section = id;
  console.log(`${id}) ${title}`);
  let note = '';
  try { note = body() || ''; } catch (e) { fail(`threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
  if (note) console.log(`   ${note}`);
};
/* Many faults of one kind are one story: print a few, count the rest. */
const reportFaults = (faults, label, cap = 4) => {
  faults.slice(0, cap).forEach(f => fail(`${label}: ${f}`));
  if (faults.length > cap) fail(`${label}: and ${faults.length - cap} more like it`);
};

/* ---- the source, read as code: comments blanked to spaces so an offset in
   the blanked text is the same offset in the original ---- */
function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/^([ \t]*)\/\/[^\n]*/gm, m => ' '.repeat(m.length))
    .replace(/[ \t]+\/\/[^'"`\n]*$/gm, m => ' '.repeat(m.length));
}
/** The span of a top level function, from its declaration to its closing brace at column 0. */
function functionRegion(text, name) {
  const m = new RegExp(`^(?:export )?function ${name}\\(`, 'm').exec(text);
  if (!m) return null;
  const close = text.indexOf('\n}', m.index);
  if (close < 0) return null;
  return { start: m.index, end: close + 2 };
}
/* Two shapes for "swap on r % 2 when balanced, on (r + i) % 2 otherwise":
   one remainder over a ternary operand, or two expressions. See the header. */
const ROUND_PARITY = /\br\s*%\s*2\b/;
const LEGACY_PARITY = /\(\s*(?:r\s*\+\s*i|i\s*\+\s*r)\s*\)\s*%\s*2\b/;
const OPERAND_TERNARY = /\(\s*balanced\s*\?\s*r\s*:\s*\(?\s*(?:r\s*\+\s*i|i\s*\+\s*r)\s*\)?\s*\)(?=\s*%\s*2\b)/;
/* The en and em dash, built from their code points so this file carries neither. */
const DASH_RE = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']');
const SETS_FLAG_LINE = /^[ \t]*(?:balancedFixtures:\s*true,?|\w+\.balancedFixtures\s*=\s*true;?)[ \t]*\n/;
/** Replaces every match of `re` inside function `regionName`, skipping comments, in the ORIGINAL text. */
function rewriteOutsideComments(src, regionName, re, to) {
  const blank = blankComments(src);
  const region = functionRegion(blank, regionName);
  if (!region) return { out: src, hits: 0 };
  const hits = [...blank.slice(region.start, region.end).matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];
  let out = src;
  for (const h of [...hits].reverse()) {
    const at = region.start + h.index;
    out = out.slice(0, at) + to + out.slice(at + h[0].length);
  }
  return { out, hits: hits.length };
}

/* ---- controls ---- */
/* Each control tries its rewrites in order and uses the first whose text is
   there: the ternary operand shape first, then the two expression shape. */
const CONTROLS = {
  oldparity: {
    red: ['1', '3', '4'], region: 'roundPairs', what: 'the balanced branch swaps on (r + i) as well, so the flag changes nothing',
    rewrites: [[OPERAND_TERNARY, '(balanced ? r + i : r + i)'], [ROUND_PARITY, '(r + i) % 2']],
  },
  flipold: {
    red: ['2', '3'], region: 'roundPairs', what: 'the legacy branch swaps on the round alone, so a save without the field gets the new venues',
    rewrites: [[OPERAND_TERNARY, '(balanced ? r : r)'], [LEGACY_PARITY, 'r % 2']],
  },
  noflag: {
    red: ['3'], region: 'startCareer', what: 'startCareer no longer sets balancedFixtures',
    rewrites: [[new RegExp(SETS_FLAG_LINE.source, 'm'), '']],
  },
};
const CONTROL = process.env.FIXTURE_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`FIXTURE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const rawEngine = lf(fs.readFileSync(ENGINE_PATH, 'utf8'));
let engineText = rawEngine;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  let applied = null;
  for (const [re, to] of c.rewrites) {
    const { out, hits } = rewriteOutsideComments(rawEngine, c.region, re, to);
    if (hits) { applied = { out, hits, re }; break; }
  }
  if (!applied) { console.error(`control cannot run: ${ENGINE_REL} has none of ${c.rewrites.map(([re]) => re.source).join(' or ')} in ${c.region}, so FIXTURE_CONTROL=${CONTROL} has nothing to rewrite`); process.exit(1); }
  if (applied.out === rawEngine) { console.error(`control cannot run: FIXTURE_CONTROL=${CONTROL} found ${applied.re.source} ${applied.hits} time(s) but changed nothing`); process.exit(1); }
  engineText = applied.out;
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${c.what} (rewrote ${applied.re.source}, ${applied.hits} hit${applied.hits === 1 ? '' : 's'}). Section(s) ${c.red.join(', ')} must go red.`);
}

/* ---- bundle the engine, with the control's copy swapped in for the real file ---- */
const ENTRY = `${TMP}/simFixtureBalance.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/simFixtureBalance.${process.pid}.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/${ENGINE_REL}');
`);
const underControl = {
  name: 'engine-under-control',
  setup(build) {
    build.onLoad({ filter: /clubManager\.ts$/ }, args => {
      if (norm(args.path) !== norm(ENGINE_PATH)) return undefined;
      return { contents: engineText, loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  },
};
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  absWorkingDir: ROOT, alias: { '@': `${ROOT_URL}/src` }, plugins: CONTROL ? [underControl] : [],
});
const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
const {
  startCareer, startNextSeason, finishSeason, playNextEntry, fixtureFor, leagueRounds, worldLeagueDefs,
  playableClubs, REAL_LEAGUES, CM_ERAS, isHistoricEra, saveCareer, loadCareer,
} = cm;
/* Exported since Round 617 (contract section 3). Absent on an older engine, and
   sections 1, 2 and 4 say so rather than throwing. */
const roundPairs = typeof cm.roundPairs === 'function' ? cm.roundPairs : null;
const NO_ROUND_PAIRS = 'roundPairs is not exported by the engine (contract section 3 says it must be), so the rule cannot be called directly';

/* ---- seeded streams, the sibling harnesses' shape ---- */
function makeStream(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED_OFFSET = (Number(process.env.SIM_SEED) || 0) * 7919;
const withStream = (seed, fn) => {
  const saved = Math.random;
  Math.random = makeStream(seed + SEED_OFFSET);
  try { return fn(); } finally { Math.random = saved; }
};
const clone = s => JSON.parse(JSON.stringify(s));

/* ---- the oracle: roundPairs as it stood before Round 617, verbatim from
   src/lib/clubManager.ts at Round 616 (line 8040), types and export dropped.
   Do not "fix" it: its job is to be the old rule. ---- */
const ORACLE_BYE = '__BYE__';
function oraclePairs(clubs, round) {
  const list = clubs.length % 2 === 0 ? clubs : [...clubs, ORACLE_BYE];
  const n = list.length;
  const r = round % (n - 1);
  const rest = list.slice(1);
  const rot = [...rest.slice(r), ...rest.slice(0, r)];
  const arr = [list[0], ...rot];
  const pairs = [];
  for (let i = 0; i < n / 2; i++) {
    let h = arr[i];
    let a = arr[n - 1 - i];
    if ((r + i) % 2 === 1) [h, a] = [a, h];
    if (round >= n - 1) [h, a] = [a, h];
    if (h === ORACLE_BYE || a === ORACLE_BYE) continue;
    pairs.push([h, a]);
  }
  return pairs;
}

/* ---- measuring a schedule ---- */
const clubList = n => Array.from({ length: n }, (_, i) => `Club ${String(i + 1).padStart(2, '0')}`);
/** Longest same venue run over a sequence of 'H', 'A' and '-' (a sit out, which ends the run). */
const longestRun = seq => {
  let best = 0, cur = 0, last = '';
  for (const v of seq) {
    if (v === '-') { cur = 0; last = ''; continue; }
    cur = v === last ? cur + 1 : 1;
    last = v;
    if (cur > best) best = cur;
  }
  return best;
};
/** Plays `rounds` rounds of `pairsAt(round)` and measures the season. */
function auditSeason(clubs, rounds, pairsAt) {
  const set = new Set(clubs);
  const venues = new Map(clubs.map(c => [c, []]));
  const met = new Map();
  const faults = [];
  for (let r = 0; r < rounds; r++) {
    const seen = new Set();
    for (const [h, a] of pairsAt(r)) {
      if (!set.has(h) || !set.has(a)) { faults.push(`round ${r + 1}: "${h}" v "${a}" is not two clubs of the league (a ghost got out)`); continue; }
      if (h === a) faults.push(`round ${r + 1}: ${h} plays itself`);
      if (seen.has(h) || seen.has(a)) faults.push(`round ${r + 1}: ${seen.has(h) ? h : a} plays twice`);
      seen.add(h); seen.add(a);
      venues.get(h).push('H');
      venues.get(a).push('A');
      const k = `${h}|${a}`;
      met.set(k, (met.get(k) ?? 0) + 1);
    }
    const out = clubs.filter(c => !seen.has(c));
    for (const c of out) venues.get(c).push('-');
    if (out.length !== clubs.length % 2) faults.push(`round ${r + 1}: ${out.length} clubs sit out, expected ${clubs.length % 2}`);
  }
  let worst = 0;
  for (const c of clubs) {
    const v = venues.get(c);
    const home = v.filter(x => x === 'H').length;
    const away = v.filter(x => x === 'A').length;
    if (home !== away) faults.push(`${c}: ${home} home, ${away} away`);
    if (home + away !== 2 * (clubs.length - 1)) faults.push(`${c}: ${home + away} games, expected ${2 * (clubs.length - 1)}`);
    for (const o of clubs) {
      if (o === c) continue;
      const times = met.get(`${c}|${o}`) ?? 0;
      if (times !== 1) faults.push(`${c} host ${o} ${times} times`);
    }
    worst = Math.max(worst, longestRun(v));
  }
  return { venues, worst, faults };
}

/* ---- the sizes, off the engine ---- */
const engineSizes = new Set(REAL_LEAGUES.map(l => l.clubs.length));
for (const era of CM_ERAS.filter(e => isHistoricEra(e.id))) {
  const leagues = worldLeagueDefs({ eraId: era.id });
  if (!leagues.length) { console.error(`historic era ${era.id} has no league list, so its sizes cannot be read`); process.exit(1); }
  for (const l of leagues) engineSizes.add(l.clubs.length);
}
if (engineSizes.size < 3) { console.error(`only ${engineSizes.size} league sizes came off the engine, which is not the game this harness knows`); process.exit(1); }
const SIZES = [...new Set([...engineSizes, 13, 15])].sort((a, b) => a - b);

/* Clubs come off the playable lists, never from memory, and are picked now,
   before any rollover in section 3 registers next season's memberships. */
const PICKS = [];
for (const n of [...new Set(REAL_LEAGUES.map(l => l.clubs.length))].sort((a, b) => a - b)) {
  let pick = null;
  for (const l of REAL_LEAGUES.filter(l => l.clubs.length === n)) {
    const c = playableClubs(l.id)[0];
    if (c && l.clubs.includes(c.name)) { pick = { n, league: l, club: c.name }; break; }
  }
  if (!pick) { console.error(`no playable club in any ${n} club league`); process.exit(1); }
  PICKS.push(pick);
}
const WORLD_CLUB = PICKS.find(p => p.league.id === REAL_LEAGUES[0].id)?.club ?? PICKS[0].club;

/* ---------- 1. The balanced rule over every league size ---------- */
run('1', 'The balanced rule over every league size the game plays: once a round, once each way, home equals away, no venue run past 2', () => {
  if (!roundPairs) { fail(NO_ROUND_PAIRS); return ''; }
  let worst = 0;
  let checked = 0;
  for (const n of SIZES) {
    const clubs = clubList(n);
    const rounds = leagueRounds(n);
    const a = auditSeason(clubs, rounds, r => roundPairs(clubs, r, true));
    reportFaults(a.faults, `${n} clubs`);
    if (a.worst > 2) fail(`${n} clubs: longest same venue run is ${a.worst}, the rule promises at most 2`);
    worst = Math.max(worst, a.worst);
    checked += rounds;
  }
  return `sizes ${SIZES.join(', ')} (${engineSizes.size} off the engine's leagues, 13 and 15 added for the odd path), ${checked} rounds audited; worst same venue run ${worst}`;
});

/* ---------- 2. The old rule is untouched ---------- */
run('2', 'The old rule is untouched: roundPairs(clubs, r, false) equals the pre 617 function for every size and round', () => {
  if (!roundPairs) { fail(NO_ROUND_PAIRS); return ''; }
  let compared = 0;
  let differed = 0;
  for (const n of SIZES) {
    const clubs = clubList(n);
    const rounds = leagueRounds(n);
    for (let r = 0; r < rounds; r++) {
      const got = JSON.stringify(roundPairs(clubs, r, false));
      const want = JSON.stringify(oraclePairs(clubs, r));
      compared += 1;
      if (got !== want) {
        differed += 1;
        if (differed <= 4) fail(`${n} clubs, round ${r + 1}: the flagless call gives ${got}, the old rule gave ${want}`);
      }
    }
    /* The oracle has to BE the old rule: the defect it carries is a worst run
       of n minus 1 at every size, and a copy that lost it proves nothing. */
    const oracleWorst = auditSeason(clubs, rounds, r => oraclePairs(clubs, r)).worst;
    if (oracleWorst !== n - 1) fail(`${n} clubs: the oracle's worst run is ${oracleWorst}, the old rule's was ${n - 1}, so the oracle is not the old rule any more`);
  }
  if (differed > 4) fail(`and ${differed - 4} more rounds differ from the old rule`);
  return `${compared} rounds across ${SIZES.length} sizes compared to the verbatim pre 617 function, ${differed} differ; the oracle's worst run is n minus 1 at every size`;
});

/* ---------- 3. Through the engine ---------- */
run('3', 'Through the engine: a new career carries the field and plays the balanced list, the same save without it plays the old one, and the rollover sets it', () => {
  let flagged = 0, balancedOk = 0, oldOk = 0, rolled = 0, worstNew = 0, worstOld = 0;
  for (const [i, { n, league, club }] of PICKS.entries()) {
    const state = withStream(300 + i, () => startCareer(club));
    const where = `${club} (${league.id}, ${n} clubs)`;
    if (state.balancedFixtures === true) flagged += 1;
    else fail(`${where}: a new career's balancedFixtures is ${JSON.stringify(state.balancedFixtures)}, not true`);
    if (state.leagueClubs.length !== n) fail(`${where}: leagueClubs has ${state.leagueClubs.length} clubs`);
    const entries = state.calendar.filter(e => e.type === 'league');
    if (entries.length !== leagueRounds(n)) fail(`${where}: ${entries.length} league entries in the calendar, expected ${leagueRounds(n)}`);
    /* fixtureFor reads clubName, leagueClubs and the flag, so the same save
       read as another club of the league is that club's list. */
    const venuesOf = (st, name) => entries.map(e => { const fx = fixtureFor({ ...st, clubName: name }, e); return fx ? (fx.home ? 'H' : 'A') : '-'; });
    const mine = venuesOf(state, club);
    const home = mine.filter(v => v === 'H').length;
    const away = mine.filter(v => v === 'A').length;
    const byes = mine.filter(v => v === '-').length;
    if (home !== away) fail(`${where}: ${home} home and ${away} away league games (${mine.join('')})`);
    if (byes !== (n % 2 ? 2 : 0)) fail(`${where}: ${byes} bye weeks`);
    const runNew = longestRun(mine);
    worstNew = Math.max(worstNew, runNew);
    if (runNew > 2) fail(`${where}: longest same venue run ${runNew} with the field set (${mine.join('')})`);
    else balancedOk += 1;

    /* The same save with the field deleted answers the OLD pattern, for every slot. */
    const flagless = clone(state);
    delete flagless.balancedFixtures;
    let slotsOk = 0, slotsBad = 0;
    for (const name of flagless.leagueClubs) {
      const got = venuesOf(flagless, name).join('');
      const want = entries.map(e => {
        const p = oraclePairs(flagless.leagueClubs, e.round).find(([h, a]) => h === name || a === name);
        return p ? (p[0] === name ? 'H' : 'A') : '-';
      }).join('');
      worstOld = Math.max(worstOld, longestRun(want.split('')));
      if (got === want) slotsOk += 1;
      else { slotsBad += 1; if (slotsBad <= 2) fail(`${where}, the save without the field read as ${name}: fixtureFor answers ${got}, the old rule gives ${want}`); }
    }
    if (slotsBad > 2) fail(`${where}: and ${slotsBad - 2} more clubs of the league get the wrong list without the field`);
    if (slotsOk === flagless.leagueClubs.length) oldOk += 1;

    /* Nothing migrates it mid season: one played entry, and a save and load. */
    const stepped = withStream(600 + i, () => playNextEntry(flagless, { skipHalftime: true })).state;
    if (stepped.balancedFixtures !== undefined) fail(`${where}: one played entry gave the save without the field balancedFixtures ${JSON.stringify(stepped.balancedFixtures)}; nothing may migrate it mid season`);
    const store = new Map();
    globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    saveCareer(flagless);
    const loaded = loadCareer();
    if (!loaded) fail(`${where}: the save without the field did not load`);
    else if (loaded.balancedFixtures !== undefined) fail(`${where}: loadCareer gave the save without the field balancedFixtures ${JSON.stringify(loaded.balancedFixtures)}`);

    /* The rollover converges it. */
    const closed = withStream(400 + i, () => finishSeason(flagless)).state;
    const next = withStream(500 + i, () => startNextSeason(closed));
    if (next.balancedFixtures === true) rolled += 1;
    else fail(`${where}: startNextSeason on a save without the field returned balancedFixtures ${JSON.stringify(next.balancedFixtures)}`);
  }
  return `${PICKS.length} careers (${PICKS.map(p => `${p.club} in ${p.n}`).join(', ')}): ${flagged} carry the field, ${balancedOk} play a run of at most 2 with it (worst ${worstNew}), ${oldOk} answer the old pattern for every club without it (worst old run ${worstOld}), field still absent after a played entry and a load, ${rolled} rollovers set it`;
});

/* ---------- 4. The AI world plays the same list ---------- */
run('4', 'The AI world plays the same list: every world league\'s pair ledger is the balanced pairs, and no club sits at one venue three rounds running', () => {
  if (!roundPairs) { fail(NO_ROUND_PAIRS); return ''; }
  let s = withStream(700, () => startCareer(WORLD_CLUB));
  const myPlayed = st => st.calendar.slice(0, st.week).filter(e => e.type === 'league').length;
  withStream(701, () => {
    let guard = 0;
    while (myPlayed(s) < 8 && guard < 60 && !s.sacked) {
      guard += 1;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
  });
  if (myPlayed(s) < 6) fail(`only ${myPlayed(s)} of my league rounds played, so the world barely moved`);
  let leagues = 0, ledgers = 0, roundsSeen = 0, worst = 0, minRounds = Infinity, runFaults = 0;
  for (const lg of worldLeagueDefs(s)) {
    const w = s.world?.[lg.id];
    if (!w) continue;
    leagues += 1;
    minRounds = Math.min(minRounds, w.round);
    roundsSeen += w.round;
    const venues = new Map(lg.clubs.map(c => [c, []]));
    const replay = new Set();
    for (let r = 0; r < w.round; r++) {
      const seen = new Set();
      for (const [h, a] of roundPairs(lg.clubs, r, true)) {
        venues.get(h)?.push('H');
        venues.get(a)?.push('A');
        seen.add(h); seen.add(a);
        replay.add(`${h}|${a}`);
      }
      for (const c of lg.clubs) if (!seen.has(c)) venues.get(c).push('-');
    }
    for (const c of lg.clubs) {
      const run = longestRun(venues.get(c));
      worst = Math.max(worst, run);
      if (run > 2) { runFaults += 1; if (runFaults <= 3) fail(`${lg.id}: ${c} at one venue ${run} rounds running in its first ${w.round} rounds (${venues.get(c).join('')})`); }
    }
    /* The ledger is what the world really wrote (notePair keeps it for every
       league with a tiebreak rule): its keys are home|away, so a flipped
       venue is a different key. */
    const ledger = s.pairResults?.[lg.id];
    if (!ledger) continue;
    ledgers += 1;
    const played = new Set(Object.keys(ledger));
    const missing = [...replay].filter(k => !played.has(k));
    const extra = [...played].filter(k => !replay.has(k));
    if (missing.length || extra.length) fail(`${lg.id}: after ${w.round} rounds the world's ledger holds ${played.size} results and the balanced list has ${replay.size} fixtures; ${missing.length} balanced fixtures were never played and ${extra.length} played fixtures are not on the balanced list (for example ${extra[0] ?? missing[0]})`);
  }
  if (runFaults > 3) fail(`and ${runFaults - 3} more clubs of the world sit at one venue past two rounds`);
  if (!leagues) fail('the save has no world leagues');
  else if (!ledgers) fail('no world league keeps a pair ledger, so the venues the world really played could not be read back');
  if (leagues && minRounds < 3) fail(`a world league has played only ${minRounds} rounds, too few to see a run of three`);
  return `${WORLD_CLUB}'s world after ${myPlayed(s)} of my league rounds: ${leagues} leagues, ${roundsSeen} rounds replayed (fewest ${minRounds}), ${ledgers} pair ledgers hold exactly the balanced fixtures; worst same venue run ${worst}; the save's flag reads ${JSON.stringify(s.balancedFixtures)}`;
});

/* ---------- 5. Words match code ---------- */
run('5', 'Words match code: the balanced branch swaps on the round alone, the legacy branch on (r + i), every caller passes the flag, both season starts set it, no dash', () => {
  const src = engineText;
  const blank = blankComments(src);
  const region = functionRegion(blank, 'roundPairs');
  if (!region) { fail('no top level function roundPairs in clubManager.ts'); return ''; }
  const braceAt = blank.indexOf('{', region.start);
  const head = blank.slice(region.start, braceAt);
  if (!/^export function roundPairs\(/.test(head)) fail('roundPairs is not exported');
  if (!/\(\s*clubs\b[^)]*,\s*round\b[^)]*,\s*balanced\b[^)]*\)/.test(head)) fail(`roundPairs does not take (clubs, round, balanced): ${head.replace(/\s+/g, ' ').trim()}`);
  const body = blank.slice(braceAt, region.end);
  if (!/\bbalanced\b/.test(body)) fail('the body of roundPairs never reads balanced');
  const lines = body.split('\n');
  const ternaryLine = lines.findIndex(l => OPERAND_TERNARY.test(l));
  const roundLine = lines.findIndex(l => ROUND_PARITY.test(l));
  const legacyLine = lines.findIndex(l => LEGACY_PARITY.test(l));
  /* When a shape is missing, show the lines that do take a remainder, so the
     mismatch is readable from this output alone. */
  const parityLines = lines.map((l, i) => [i + 1, l.trim()]).filter(([, l]) => /%/.test(l)).map(([i, l]) => `body line ${i}: ${l}`).join(' | ') || '(no line of the body takes a remainder)';
  let shape = '';
  if (ternaryLine >= 0) {
    shape = `one remainder over (balanced ? r : r + i) on body line ${ternaryLine + 1}`;
  } else if (roundLine >= 0 && legacyLine >= 0) {
    shape = `round parity on body line ${roundLine + 1}, (r + i) on body line ${legacyLine + 1}`;
    if (!lines.slice(Math.max(0, roundLine - 6), roundLine + 1).some(l => /\bbalanced\b/.test(l))) fail('the round parity swap is not under the flag: no "balanced" on its line or the six above it');
    if (roundLine !== legacyLine && !lines.slice(Math.max(0, legacyLine - 6), legacyLine + 1).some(l => /\bbalanced\b|\belse\b/.test(l))) fail('the (r + i) swap is not the other arm of the flag: no "balanced" or "else" on its line or the six above it');
  } else {
    if (roundLine < 0) fail(`no branch of roundPairs swaps on the round parity alone (r % 2, or the r arm of (balanced ? r : r + i)); the body's remainder lines are: ${parityLines}`);
    if (legacyLine < 0) fail(`no branch of roundPairs swaps on (r + i) % 2 (or the r + i arm of (balanced ? r : r + i)); the body's remainder lines are: ${parityLines}`);
    shape = 'neither shape found';
  }

  /* Every caller passes three arguments, the third reading the save's field. */
  const calls = [];
  const callRe = /\broundPairs\(/g;
  let m;
  while ((m = callRe.exec(blank))) {
    if (m.index >= region.start && m.index < braceAt) continue;
    const open = m.index + m[0].length - 1;
    let depth = 0, j = open;
    for (; j < blank.length; j++) {
      if (blank[j] === '(') depth += 1;
      else if (blank[j] === ')') { depth -= 1; if (depth === 0) break; }
    }
    const args = [];
    let d = 0, cur = '';
    for (const ch of blank.slice(open + 1, j)) {
      if (ch === '(' || ch === '[' || ch === '{') d += 1;
      if (ch === ')' || ch === ']' || ch === '}') d -= 1;
      if (ch === ',' && d === 0) { args.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) args.push(cur.trim());
    calls.push({ line: blank.slice(0, m.index).split('\n').length, args });
  }
  for (const c of calls) {
    if (c.args.length !== 3) fail(`the roundPairs call at line ${c.line} passes ${c.args.length} argument(s): (${c.args.join(', ')})`);
    else if (!/\bbalancedFixtures\b/.test(c.args[2])) fail(`the roundPairs call at line ${c.line} passes "${c.args[2]}" as the flag, not the save's balancedFixtures`);
  }
  if (calls.length < 4) fail(`${calls.length} roundPairs caller(s) found, the contract names four`);

  /* ROUND 626: EVERY CALLER ANYWHERE IN src, NOT JUST THE ONES IN THE ENGINE.
     Everything above this reads only clubManager.ts, because `src` is set to the
     engine text at the top of this section. Round 617 created a FIFTH caller
     outside it, in src/components/club-manager/CalendarCard.tsx, replacing that
     card's own private copy of the circle method. Nothing here could see it, and
     the floor of four was satisfied by the engine's four on its own.

     Reproduced on this branch before the fix was written: hardcoding the card's
     third argument to true left this harness printing PASS and reporting
     "4 callers", under a heading that reads "every caller passes the flag".
     The other cross file check in this section cannot cover it either, because
     a card calling roundPairs with the wrong flag carries no copy of the venue
     swap to find.

     What it would cost. A save from before Round 617 has no balancedFixtures
     field, so a card with the flag hardcoded would list the balanced opponent
     and venue while the engine plays the legacy one, and the next up card would
     name a different opponent, at a different ground, from the match the player
     actually gets. That is exactly the disagreement Round 617 exists to end. */
  const argsOfCallsIn = (text) => {
    const out = [];
    const re = /\broundPairs\(/g;
    let mm;
    while ((mm = re.exec(text))) {
      const open = mm.index + mm[0].length - 1;
      let depth = 0, j = open;
      for (; j < text.length; j++) {
        if (text[j] === '(') depth += 1;
        else if (text[j] === ')') { depth -= 1; if (depth === 0) break; }
      }
      const args = [];
      let d = 0, cur = '';
      for (const ch of text.slice(open + 1, j)) {
        if (ch === '(' || ch === '[' || ch === '{') d += 1;
        if (ch === ')' || ch === ']' || ch === '}') d -= 1;
        if (ch === ',' && d === 0) { args.push(cur.trim()); cur = ''; } else cur += ch;
      }
      if (cur.trim()) args.push(cur.trim());
      out.push({ line: text.slice(0, mm.index).split('\n').length, args });
    }
    return out;
  };

  const outsideCalls = [];
  const walkCallers = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walkCallers(p); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (path.resolve(p) === path.resolve(ENGINE_PATH)) continue;
      const text = blankComments(fs.readFileSync(p, 'utf8'));
      for (const c of argsOfCallsIn(text)) {
        outsideCalls.push({ file: path.relative(ROOT, p).split(path.sep).join('/'), line: c.line, args: c.args });
      }
    }
  };
  walkCallers(path.join(ROOT, 'src'));

  for (const c of outsideCalls) {
    if (c.args.length !== 3) {
      fail(`the roundPairs call in ${c.file} line ${c.line} passes ${c.args.length} argument(s), not three: (${c.args.join(', ')})`);
    } else if (!/\bbalancedFixtures\b/.test(c.args[2])) {
      fail(`the roundPairs call in ${c.file} line ${c.line} passes "${c.args[2]}" as the balanced flag instead of reading the save's balancedFixtures, so that screen can disagree with the engine about who plays where`);
    }
  }
  /* A floor on the SCAN itself, so a walk that silently finds nothing fails
     here rather than reporting every caller as correct. Round 617 created one
     caller outside the engine and it is still there. */
  if (outsideCalls.length < 1) {
    fail(`the cross file caller scan found no roundPairs callers outside the engine, and Round 617 created one in CalendarCard.tsx, so the scan itself is broken`);
  }

  if (!/^\s*balancedFixtures\?:\s*true;/m.test(blank)) fail('CareerState does not declare balancedFixtures?: true');
  for (const name of ['startCareer', 'startNextSeason']) {
    const rg = functionRegion(blank, name);
    if (!rg) { fail(`no top level function ${name}`); continue; }
    if (!new RegExp(SETS_FLAG_LINE.source, 'm').test(blank.slice(rg.start, rg.end))) fail(`${name} does not set balancedFixtures: true`);
  }
  if (DASH_RE.test(src)) fail('a dash in clubManager.ts');
  /* Round 617 review: no other file under src carries its own copy of the
     circle method's venue swap. The calendar card had one from the days the
     engine's pairing function was private, and a copy keeps whichever rule it
     was written with, so it would have printed the old venues beside the new
     list. The detector is held to a sample of that old body first, so a clean
     result here means none found, not that the detector never fired. */
  const SWAP_RE = /\[\s*h\s*,\s*a\s*\]\s*=\s*\[\s*a\s*,\s*h\s*\]/;
  const OLD_CARD = 'for (let i = 0; i < n / 2; i++) {\n    let h = arr[i];\n    let a = arr[n - 1 - i];\n    if ((r + i) % 2 === 1) [h, a] = [a, h];';
  if (!SWAP_RE.test(blankComments(OLD_CARD))) fail('the venue swap detector does not fire on the old calendar card body, so a clean result would mean nothing');
  const copies = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && path.resolve(p) !== path.resolve(ENGINE_PATH) && SWAP_RE.test(blankComments(fs.readFileSync(p, 'utf8').split('\r\n').join('\n')))) copies.push(path.relative(ROOT, p).replaceAll('\\', '/'));
    }
  };
  walk(path.join(ROOT, 'src'));
  for (const c of copies) fail(`${c} carries its own copy of the circle method's venue swap; it must read roundPairs from the engine`);
  return `roundPairs ${/^export /.test(head) ? 'exported' : 'not exported'}; ${shape}; ${calls.length} callers, third arguments: ${calls.map(c => c.args[2] ?? '(none)').join(' / ')}; interface, startCareer and startNextSeason checked; ${DASH_RE.test(src) ? 'a dash found' : 'no dash'}; ${copies.length} other copies of the venue swap under src`;
});

console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  const stayedGreen = want.filter(s => !redSections.has(s));
  const extra = [...redSections].filter(s => !want.includes(s));
  if (!stayedGreen.length) {
    console.log(`simFixtureBalance: CONTROL FIRED (${CONTROL}). Section(s) ${want.join(', ')} went red as they must${extra.length ? `; ${extra.join(', ')} went red as well` : ''}.`);
    process.exit(0);
  }
  console.error(`simFixtureBalance: CONTROL DID NOT FIRE (${CONTROL}). Section(s) ${stayedGreen.join(', ')} stayed green.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simFixtureBalance: ${failures} failure${failures === 1 ? '' : 's'} in section(s) ${[...redSections].join(', ')}`);
  process.exit(1);
}
console.log('simFixtureBalance: PASS. Every club alternates venues with a longest run of 2 at every league size, a save without the field keeps its old list, the rollover converges it, the AI world plays the same list, and the words match the code.');

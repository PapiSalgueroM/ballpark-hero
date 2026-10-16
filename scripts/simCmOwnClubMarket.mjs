/* Round 1339: Club Manager's transfer market lists nobody at the club you manage, in every career.
 *
 * WHY. Since Release BE your club's page lists exactly your squad in every career (ClubDetailScreen). The market of a
 * career with no world seed (every career started before 2026-10-13 18:23 EDT, and a Manager Hot Seat day handed
 * over) still listed men "at" your club who are not in your squad: the bake's men beyond the 26 a squad starts with,
 * and from the next season the men you sold and the men whose deals ran out, on sale from your own club and named in
 * the feed as signed from it. Round 1339 makes worldMarket (src/lib/clubManager.ts) drop the managed club's rows for
 * every career; scripts/lib/cmOwnClubMarket1339.mjs holds the line as text.
 *
 * TWO ARMS, built from THIS tree's text (never from a commit, so the harness runs on every later tree):
 *   rule      the head carries the rule: HEAD = this tree, PARENT = this tree with the old line put back.
 *   probe     OWNCLUB_MARKET_PROBE=1 on a head that still carries main's line: HEAD = this tree with the rule
 *             composed, PARENT = this tree. Step 2 of the round, before src moved.
 *   as-is     a head with main's line and no probe: both arms are this tree, so sections 1 and 2 go red (the
 *             harness sees the defect); sections 3 to 5 are not run (the arms are one engine).
 *   commit    OWNCLUB_MARKET_PARENT=<commit>: PARENT is that commit's source (the one time proof against the real
 *             parent of the round). The mode that ran is printed first.
 * Every step of both arms runs on the same counter tape (scripts/simCmUnseededWorld.mjs), every draw kept.
 *
 * SECTIONS (OWNCLUB_MARKET_SECTIONS=1,2,... runs a subset; the default runs every section the mode allows):
 *   1 old: the fixture (scripts/data/cmPreAzMarketFixture.json, made by scripts/genCmPreAzMarketFixture.mjs from
 *     36cc9ffe), the four committed old saves, and a fleet of saves written by the pre AZ engine (36cc9ffe): five
 *     eras, three clubs an era (the deepest bake, the first league's first club, the first club of the thinnest
 *     league), two shapes (season 1 at the start; season 3's summer after the two most valuable men were listed and
 *     sold), three seeds. Each is opened by both arms. HARD: (1a) HEAD's market lists no row at the save's club;
 *     (1b) HEAD's market equals PARENT's with that club's rows taken out, in order; (1c) fixtures A and B remove at
 *     least their recorded counts and the fleet removes some. MEASURED: each save's removed count and how many sat in
 *     PARENT's first 120, the namesakes (a removed man who shares his name with a man at a rival), and what HEAD
 *     does with fixture C, a talk the old engine opened for a man at my own club.
 *   2 feed: fixture B and every season 3 fleet save whose PARENT first 120 held a man at my club. HARD: (2a) HEAD's
 *     first 120 (the pool generateHeadlines shuffles) holds none; (2b) played to the January window on HEAD, no
 *     transfer the window logged leaves my club with a man who was not in my squad, and no headline signs one "from"
 *     it. MEASURED (2c): the same count on PARENT.
 *   3 fresh: every playable club of every era, three created clubs and one edited world started on both arms under
 *     two seeds (HARD: state and draws equal), then a seeded journey fleet (three eras, three clubs, three seeds:
 *     start, buy, accept an AI bid, January, the season out, the summer, a save and reload after each step; HARD:
 *     states, draws and saved bytes equal).
 *   4 dailies: Manager Hot Seat on 120 dates and Deadline Day on 60 dates from 2026-10-10, each date a fresh engine
 *     on each arm, the Hot Seat day played to its verdict and handed over, the Deadline Day scripted with a signing
 *     and a sale. HARD: the whole runs and draws equal. Printed: how many Hot Seat days cross the January window.
 *   5 headroom: each start of section 3 (seed one) with goneNames emptied and no seed, the market as the start moment
 *     read it. HARD: (5a) the best man at my own club sits at index 160 or later of PARENT's market (0 based; the
 *     minimum is printed with its club and era); (5b) buildBoardAsks equal on both arms, and each ask candidate's
 *     objective and minSpend equal. MEASURED: candidates whose `targets` count differs (a count no screen shows).
 *
 * CONTROLS (OWNCLUB_MARKET_CONTROL), each asserting the text it rewrites stands exactly once:
 *   legacy   HEAD's line put back to main's (both arms the old engine): sections 1 and 2 red.
 *   slice    HEAD's generateHeadlines draws from 119 rows: section 3 red on every start, section 4 on every date,
 *            sections 1 and 2 green.
 *   shallow  buildSquad keeps the bake's first 9 men on both arms: 5a red on at least one (club, era); the lowest
 *            index it produced is printed.
 * OWNCLUB_MARKET_FLEET=quick plays one seed and a third of the clubs (for trying it out; never a gate line).
 * Exit 0 green, 1 red or a control that fired (its last line says FIRED), 2 could not run, 3 a control that did not
 * fire. Each section prints its seconds.
 *
 *   node scripts/simCmOwnClubMarket.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { lf, lineOf, withRuleToday, withLegacyToday, withSlice119, withShallowSquad } from './lib/cmOwnClubMarket1339.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const PRE_AZ = '36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c';
const FIXTURE = 'scripts/data/cmPreAzMarketFixture.json';
const FIXTURE_SHA = '49b784530d4381060a477347dea5a835b4764a2aa4e22d31c734dfc8f3cfe6da';
const OLD_SAVES = ['cmOldSave1052Fixture', 'cmSecondTierOldSaveFixture', 'cmBookSaveEvertonFixture', 'cmBookSaveHerthaFixture'];
const CONTROL = process.env.OWNCLUB_MARKET_CONTROL || '';
const PROBE = process.env.OWNCLUB_MARKET_PROBE === '1';
const PARENT_REF = process.env.OWNCLUB_MARKET_PARENT || '';
const QUICK = process.env.OWNCLUB_MARKET_FLEET === 'quick';
const cannot = why => { console.log(`simCmOwnClubMarket: cannot run: ${why}`); process.exit(2); };
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const hasCommit = ref => { try { git('cat-file', '-e', `${ref}^{commit}`); return true; } catch { return false; } };
if (CONTROL && !['legacy', 'slice', 'shallow'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
if (!hasCommit(PRE_AZ)) cannot(`the pre AZ commit ${PRE_AZ.slice(0, 8)} is not in this clone (fetch the whole history, fetch-depth 0)`);
if (PARENT_REF && !hasCommit(PARENT_REF)) cannot(`OWNCLUB_MARKET_PARENT ${PARENT_REF} is not a commit in this clone`);
{
  const text = lf(fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8'));
  if (sha(text) !== FIXTURE_SHA) cannot(`${FIXTURE} is not the file this harness was written for (sha256 ${sha(text).slice(0, 8)}, want ${FIXTURE_SHA.slice(0, 8)})`);
}

/* The two arms. HEAD_LINE is the line this tree carries; the edits are composed in memory, never on disk. */
const HEAD_TEXT = lf(fs.readFileSync(path.join(ROOT, ENGINE), 'utf8'));
const HEAD_LINE = lineOf(HEAD_TEXT);
if (!HEAD_LINE) cannot(`${ENGINE} carries neither main's line nor the rule exactly once`);
if (PROBE && HEAD_LINE === 'rule') cannot('OWNCLUB_MARKET_PROBE is for a head that still carries main\'s line, and this one carries the rule');
const MODE = PARENT_REF ? 'commit' : HEAD_LINE === 'rule' ? 'rule' : PROBE ? 'probe' : 'as-is';
if (CONTROL && MODE === 'as-is') cannot('a control needs the rule on the head arm (run it with OWNCLUB_MARKET_PROBE=1 before the fix)');
const headEdits = [], parentEdits = [];
if (PROBE) headEdits.push(withRuleToday);
if (MODE === 'rule') parentEdits.push(withLegacyToday);
if (CONTROL === 'legacy') headEdits.push(withLegacyToday);
if (CONTROL === 'slice') headEdits.push(withSlice119);
if (CONTROL === 'shallow') { headEdits.push(withShallowSquad); parentEdits.push(withShallowSquad); }
const ALL = MODE === 'as-is' ? [1, 2] : [1, 2, 3, 4, 5];
const SECTIONS = process.env.OWNCLUB_MARKET_SECTIONS ? process.env.OWNCLUB_MARKET_SECTIONS.split(',').map(Number).filter(n => ALL.includes(n)) : ALL;
if (!SECTIONS.length) cannot(`OWNCLUB_MARKET_SECTIONS names no section this mode runs (${ALL.join(', ')})`);
console.log(`simCmOwnClubMarket: mode ${MODE}${PARENT_REF ? ` (PARENT ${PARENT_REF})` : ''}, head arm ${PROBE ? 'this tree with the rule' : 'this tree'}, parent arm ${PARENT_REF ? PARENT_REF.slice(0, 8) : MODE === 'rule' ? 'this tree with main\'s line' : 'this tree'}${CONTROL ? `, control ${CONTROL}` : ''}, sections ${SECTIONS.join(', ')}${QUICK ? ', QUICK fleet' : ''}`);

const FULL_ENTRY = ['cm:clubManager', 'eras:clubManagerEras', 'hs:managerHotSeat', 'dd:deadlineDay', 'asks:clubManagerBoardAsks', 'we:clubManagerWorldEdit'];
/* One engine, bundled once and run in a fresh vm context per journey (module state must not leak from one save
   into the next), with the held clock, an in memory localStorage and no network. */
async function engine(label, { ref = null, edits = [], entry = FULL_ENTRY } = {}) {
  const read = rel => ref ? lf(git('show', `${ref}:${rel}`)) : lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  let engineText;
  const receipts = [];
  try { engineText = edits.reduce((text, edit) => edit(text, receipts), read(ENGINE)); } catch (e) { cannot(`the ${label} engine: ${e.message}`); }
  const plugin = {
    name: 'own-club-market-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        return { contents: rel === ENGINE ? engineText : read(rel), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const source = entry.map(x => { const [k, f] = x.split(':'); return `export * as ${k} from './src/lib/${f}';`; }).join('\n');
  const out = await build({ stdin: { contents: source, resolveDir: ROOT, sourcefile: `own-club-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' })
    .catch(e => cannot(`the ${label} engine did not build: ${e.message.slice(0, 300)}`));
  const script = new vm.Script(out.outputFiles[0].text, { filename: `own-club-${label}.cjs` });
  return {
    label, receipts,
    async fresh() {
      const module = { exports: {} };
      const store = new Map();
      const NOW = 1791633600000;
      class HeldDate extends Date {
        constructor(...a) { super(...(a.length ? a : [NOW])); }
        static now() { return NOW; }
      }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/* The counter generator of scripts/simCmUnseededWorld.mjs, the same on both arms, every draw kept. */
function tape(seed, action) {
  let state = seed >>> 0; const draws = [];
  const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    const d = ((v ^ v >>> 14) >>> 0) / 4294967296; draws.push(d); return d;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}
/* Where two JSON texts first part, forty characters either side. */
function firstDifference(x, y) {
  let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
  return `at character ${i}: parent ...${x.slice(Math.max(0, i - 40), i + 40)}... head ...${y.slice(Math.max(0, i - 40), i + 40)}...`;
}
const PLAY = { skipHalftime: true, noCoach: true };
const ERAS = ['now', 'era2020', 'era2015', 'era2010', 'era2005'];
const seconds = t0 => Math.round((Date.now() - t0) / 1000);
const fails = { 1: [], 2: [], 3: [], 4: [], 5: [] };
const fail = (n, why) => fails[n].push(String(why).slice(0, 500));
const H = await engine('head', { edits: headEdits });
const P = await engine('parent', { ref: PARENT_REF || null, edits: parentEdits });

/* ---- the old saves: the fixture, the committed old saves, and a fleet written by the pre AZ engine ---- */
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8'));
async function oldSaves() {
  const list = ['A', 'B', 'C'].map(k => ({ name: `fixture ${k}`, key: k, raw: FX.saves[k], season3: k === 'B' }));
  for (const f of OLD_SAVES) list.push({ name: f, committed: true, raw: fs.readFileSync(path.join(ROOT, `scripts/data/${f}.json`), 'utf8') });
  const B = await engine('pre-az', { ref: PRE_AZ, entry: ['cm:clubManager', 'eras:clubManagerEras'] });
  const M0 = await B.fresh();
  const seeds = QUICK ? [0x1339f1] : [0x1339f1, 0x1339f2, 0x1339f3];
  for (const era of ERAS) {
    const leagues = era === 'now' ? M0.cm.REAL_LEAGUES : M0.cm.ERA_LEAGUES[era];
    if (!leagues?.length) cannot(`the pre AZ engine has no leagues for ${era}`);
    const size = c => M0.eras.projectedRoster(c, 0, era).length;
    const all = [...new Set(leagues.flatMap(l => l.clubs))];
    const deep = [...all].sort((x, y) => size(y) - size(x) || x.localeCompare(y))[0];
    const mean = l => l.clubs.reduce((n, c) => n + size(c), 0) / l.clubs.length;
    const thinLeague = [...leagues].sort((x, y) => mean(x) - mean(y) || x.id.localeCompare(y.id))[0];
    const picks = [...new Set([deep, leagues[0].clubs[0], thinLeague.clubs[0], ...thinLeague.clubs])].slice(0, QUICK ? 1 : 3);
    console.log(`  fleet ${era}: ${picks.map(c => `${c} (${size(c)} bake men)`).join(', ')}`);
    for (const club of picks) for (const seed of seeds) {
      const M = await B.fresh();
      let s = tape(seed, () => M.cm.startCareer(club, era)).value;
      const save = (st, shape) => { M.store.clear(); if (!M.cm.saveCareer(st)) cannot(`the pre AZ engine would not save ${club} (${era})`); list.push({ name: `${club} (${era}, ${shape}, seed ${seed.toString(16)})`, raw: M.store.get(M.cm.SAVE_KEY), season3: shape === 'season 3' }); };
      save(s, 'season 1');
      const top = s.squad.filter(p => !p.onLoan).sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.id.localeCompare(b.id)).slice(0, 2);
      s = tape(seed + 1, () => top.reduce((cur, p) => M.cm.setTransferStatus(cur, p.id, 'listed'), s)).value;
      s = tape(seed + 2, () => { const next = { ...s }; M.cm.generateIncomingBids(next); return next; }).value;
      for (const [i, p] of top.entries()) s = tape(seed + 3 + i, () => M.cm.acceptBid(s, p.id)).value ?? s;
      for (let season = 0; season < 2; season += 1) {
        for (let i = 0; i < 220; i += 1) {
          const r = tape(seed + 101 + season * 977 + i * 7919, () => M.cm.playNextEntry(s, PLAY)).value;
          s = r.state; if (r.kind === 'seasonOver') break;
        }
        s = tape(seed + 51 + season, () => M.cm.finishSeason(s).state).value;
        s = tape(seed + 61 + season, () => M.cm.startNextSeason(s)).value;
      }
      save(s, 'season 3');
    }
  }
  return list;
}
async function open(E, raw) {
  const M = await E.fresh();
  M.store.clear(); M.store.set(M.cm.SAVE_KEY, raw);
  const s = M.cm.loadCareer();
  return { M, s };
}
const own = (market, club) => market.map((p, i) => ({ p, i })).filter(x => x.p.club === club);

/* ---- section 1, old, and section 2, feed ---- */
const measured = { removed: 0, in120: 0, namesakes: 0, rows: [], feedParent: 0, feedSaves: 0 };
async function sectionsOldAndFeed(saves) {
  const t0 = Date.now();
  for (const save of saves) {
    const h = await open(H, save.raw), p = await open(P, save.raw);
    if (!h.s || !p.s) { fail(1, `${save.name}: an arm would not open it`); continue; }
    const club = h.s.clubName;
    const mH = h.M.cm.buildMarket(h.s), mP = p.M.cm.buildMarket(p.s);
    const mine = own(mP, club);
    const in120 = mine.filter(x => x.i < 120).length;
    save.in120 = in120;
    if (SECTIONS.includes(1)) {
      if (own(mH, club).length) fail(1, `${save.name}: (1a) the head's market lists ${own(mH, club).length} men at ${club}, first ${own(mH, club)[0].p.name}`);
      const x = JSON.stringify(mP.filter(m => m.club !== club)), y = JSON.stringify(mH);
      if (x !== y) fail(1, `${save.name}: (1b) the head's market is not the parent's without ${club}'s rows, ${firstDifference(x, y)}`);
      const world = h.M.eras.projectedWorldFor(h.s.eraId ?? 'now', h.M.cm.yearsOn(h.s));
      const namesakes = mine.filter(x => Object.entries(world).some(([c, roster]) => c !== club && roster.some(b => b.n === x.p.name))).length;
      if (save.committed) console.log(`  ${save.name}: removed ${mine.length} (a season 1 save of a club no deeper than 26: the no op)`);
      else { measured.removed += save.key ? 0 : mine.length; measured.in120 += save.key ? 0 : in120; measured.namesakes += namesakes; }
      measured.rows.push(`${save.name}: removed ${mine.length}, ${in120} in the parent's first 120, ${namesakes} namesakes`);
      if (save.key && save.key !== 'C' && mine.length < FX.expect[save.key].names.length) fail(1, `${save.name}: (1c) removed ${mine.length}, the fixture records ${FX.expect[save.key].names.length} men at ${club} on the old engine`);
      if (save.key) console.log(`  ${save.name} (${club}, season ${h.s.season}): removed ${mine.length} (${in120} in the parent's first 120; the old engine listed ${FX.expect[save.key].names.length}), ${namesakes} namesakes`);
      if (save.key === 'C') {
        const talk = h.s.negotiation;
        let outcome = 'no talk on the head';
        if (talk) {
          const ask = talk.theirAsk ?? 0;
          const offered = tape(0x1339c1, () => h.M.cm.makeOffer({ ...h.s, budget: Math.max(h.s.budget, ask + 50) }, ask)).value;
          const terms = offered?.negotiation?.phase === 'terms' && offered.negotiation.terms ? tape(0x1339c2, () => h.M.cm.offerTerms(offered, offered.negotiation.terms.want)).value : null;
          const name = talk.player?.name ?? talk.mp?.name ?? FX.expect.C.talk;
          const times = terms ? terms.squad.filter(m => m.name === name).length : 0;
          outcome = `the talk for ${name} is shown (phase ${talk.phase}); a fee at the ask ${offered ? `left it at ${offered.negotiation?.phase ?? offered.negotiation?.status ?? 'closed'}` : 'was refused'}; ${terms ? `terms met: status ${terms.negotiation?.status}, ${name} in my squad ${times} time(s)` : 'no terms reached'}`;
        }
        console.log(`  fixture C (open question 3, MEASURED): ${outcome}`);
      }
    }
    if (SECTIONS.includes(2) && save.season3 && (save.key === 'B' || in120 > 0)) await feed(save, h, p, club);
  }
  if (SECTIONS.includes(1)) {
    console.log(`section 1 old: ${saves.length} saves, the fleet removed ${measured.removed} men at their own club (${measured.in120} in the parent's first 120), ${measured.namesakes} namesakes, ${fails[1].length} red, ${seconds(t0)}s`);
    if (!QUICK && measured.removed === 0) fail(1, '(1c) the fleet removed nobody: the section cannot see the defect');
  }
  if (SECTIONS.includes(2)) console.log(`section 2 feed: ${measured.feedSaves} season 3 saves played to January, the parent's window named ${measured.feedParent} men from my club who were not mine (MEASURED), ${fails[2].length} red`);
}
/* Plays one arm to the January window; the names the window sells "from" my club who were not in my squad. */
function toJanuary(M, s0, seedBase) {
  let s = s0, before = null;
  for (let i = 0; i < 160; i += 1) {
    if (s.calendar[s.week]?.type === 'window') before = { squad: new Set(s.squad.map(m => m.name)), log: new Set((s.transferLog ?? []).map(t => JSON.stringify(t))) };
    const r = tape(seedBase + i * 7919, () => M.cm.playNextEntry(s, PLAY)).value;
    s = r.state;
    if (before) {
      const club = s.clubName;
      const logged = (s.transferLog ?? []).filter(t => !before.log.has(JSON.stringify(t)) && t.from === club && !before.squad.has(t.name)).map(t => t.name);
      const heads = (s.aiHeadlines ?? []).map(line => { const a = line.indexOf(' sign '), b = line.indexOf(` from ${club} for `); return a >= 0 && b > a ? line.slice(a + 6, b) : null; })
        .filter(n => n && !before.squad.has(n));
      return { reached: true, bad: [...new Set([...logged, ...heads])] };
    }
    if (r.kind === 'seasonOver') break;
  }
  return { reached: false, bad: [] };
}
async function feed(save, h, p, club) {
  measured.feedSaves += 1;
  const first = h.M.cm.buildMarket(h.s).slice(0, 120).filter(m => m.club === club);
  if (first.length) fail(2, `${save.name}: (2a) the head's first 120 hold ${first.length} men at ${club}, first ${first[0].name}`);
  const a = toJanuary(h.M, h.s, 0x1339e0), b = toJanuary(p.M, p.s, 0x1339e0);
  if (!a.reached) fail(2, `${save.name}: (2b) the head never reached the January window`);
  if (a.bad.length) fail(2, `${save.name}: (2b) the head's January window sold ${a.bad.join(', ')} from ${club}, never in my squad`);
  measured.feedParent += b.bad.length;
  console.log(`  feed ${save.name}: the parent's first 120 held ${save.in120} men at my club; its January named ${b.bad.length} (${b.bad.slice(0, 3).join(', ') || 'none'}), the head's ${a.bad.length}`);
}

/* ---- section 3, fresh, and section 5, headroom ---- */
const clone = v => JSON.parse(JSON.stringify(v));
function startList(M) {
  const list = [];
  for (const era of ERAS) {
    const leagues = era === 'now' ? M.cm.REAL_LEAGUES : M.cm.ERA_LEAGUES[era];
    const clubs = [...new Set(leagues.flatMap(l => (era === 'now' ? M.cm.playableClubs(l.id) : M.cm.eraPlayableClubs(era, l.id)).map(c => c.name)))];
    for (const club of QUICK ? clubs.filter((_, i) => i % 3 === 0) : clubs) list.push({ era, club, args: [club, era] });
  }
  for (const tier of ['small', 'mid', 'big']) {
    const spec = { name: 'Round Club FC', stadium: 'Round Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'RCF' }, budgetTier: tier, leagueId: 'premier', replacedClub: '' };
    list.push({ era: 'now', club: `a created club (${tier})`, args: ['Round Club FC', 'now', spec] });
  }
  const L = M.cm.REAL_LEAGUES;
  const edit = M.we.validWorldEdit(M.we.swapClubs(null, L[0].clubs[0], L[1].clubs[0]));
  if (!edit) cannot('the edited world start: the swap of two clubs did not validate');
  list.push({ era: 'now', club: `${L[0].clubs[0]} in an edited world`, args: [L[0].clubs[0], 'now', undefined, undefined, undefined, clone(edit)] });
  return list;
}
const argsOf = item => item.args.map(a => a === undefined ? undefined : clone(a));
const head5 = { ranks: 0, under: 0, none: 0, min: null, targets: 0, candidates: 0, gone: [Infinity, 0] };
function headroom(item, started, ctx) {
  const st = clone(started); st.goneNames = []; delete st.worldSeed;
  head5.gone = [Math.min(head5.gone[0], started.goneNames?.length ?? 0), Math.max(head5.gone[1], started.goneNames?.length ?? 0)];
  const club = st.clubName;
  const market = ctx.p.cm.buildMarket(clone(st));
  const best = market.findIndex(m => m.club === club);
  head5.ranks += 1;
  if (best < 0) head5.none += 1;
  else {
    if (!head5.min || best < head5.min.rank) head5.min = { rank: best, club: item.club, era: item.era, name: market[best].name };
    if (best < 160) { head5.under += 1; fail(5, `${item.club} (${item.era}): (5a) the best man at ${club} sits at index ${best} of the parent's market (${market[best].name})`); }
  }
  const aP = tape(0x1339a5, () => ctx.p.asks.buildBoardAsks(clone(st))), aH = tape(0x1339a5, () => ctx.h.asks.buildBoardAsks(clone(st)));
  const x = JSON.stringify(aP.value), y = JSON.stringify(aH.value);
  if (x !== y || sha(aP.draws) !== sha(aH.draws)) fail(5, `${item.club} (${item.era}): (5b) buildBoardAsks differs, ${x !== y ? firstDifference(x, y) : 'in its draws'}`);
  const cP = tape(0x1339a6, () => ctx.p.asks.askCandidates(clone(st))).value, cH = tape(0x1339a6, () => ctx.h.asks.askCandidates(clone(st))).value;
  const key = list => JSON.stringify(list.map(c => [c.objective, c.minSpend]));
  if (key(cP) !== key(cH)) fail(5, `${item.club} (${item.era}): (5b) an ask candidate's objective or minSpend differs, ${firstDifference(key(cP), key(cH))}`);
  head5.candidates += cP.length;
  head5.targets += cP.filter((c, i) => cH[i] && c.targets !== cH[i].targets).length;
}
const fresh3 = { starts: 0, red: 0 };
async function sectionsFreshAndHeadroom() {
  const t0 = Date.now();
  const list = startList(await H.fresh());
  const seeds = QUICK ? [0x1339a1] : [0x1339a1, 0x1339a2];
  for (const seed of seeds) {
    let ctx = null, ctxEra = null;
    for (const item of list) {
      if (!ctx || ctxEra !== item.era) { ctx = { h: await H.fresh(), p: await P.fresh() }; ctxEra = item.era; }
      const a = tape(seed, () => ctx.p.cm.startCareer(...argsOf(item))), b = tape(seed, () => ctx.h.cm.startCareer(...argsOf(item)));
      if (SECTIONS.includes(3)) {
        fresh3.starts += 1;
        const x = JSON.stringify(a.value), y = JSON.stringify(b.value);
        if (x !== y || sha(a.draws) !== sha(b.draws)) {
          fresh3.red += 1;
          fail(3, `${item.club} (${item.era}, seed ${seed.toString(16)}): ${x !== y ? `the state differs ${firstDifference(x, y)}` : `the draws differ (${a.draws.length} against ${b.draws.length})`}`);
        }
      }
      if (SECTIONS.includes(5) && seed === seeds[0]) headroom(item, a.value, ctx);
    }
  }
  console.log(`  starts: ${list.length} clubs (${ERAS.map(e => `${e} ${list.filter(x => x.era === e).length}`).join(', ')}, three created clubs and an edited world among 'now') under ${seeds.length} seed(s), ${seconds(t0)}s`);
  if (SECTIONS.includes(3)) console.log(`section 3 fresh starts: ${fresh3.starts} starts compared, ${fresh3.red} red`);
  if (SECTIONS.includes(3)) await journeys(list);
  if (SECTIONS.includes(5)) console.log(`section 5 headroom: ${head5.ranks} starts; the best man at my own club ${head5.min ? `sits at index ${head5.min.rank} at the lowest (${head5.min.name}, ${head5.min.club}, ${head5.min.era})` : 'is never on the market'}; ${head5.under} under 160; ${head5.none} starts list nobody at their club; the start's own headlines took ${head5.gone[0]} to ${head5.gone[1]} names; ${head5.targets} of ${head5.candidates} ask candidates count a different number of targets (MEASURED); ${fails[5].length} red`);
}

/* Section 3's seeded journeys: one career on one arm, a save and a reload after every step. */
async function journey(E, item, seed) {
  const M = await E.fresh();
  const steps = []; let s = null; let k = 0;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed + k * 7919) >>> 0, () => fn(s));
    const got = r.value ?? {};
    if (got.state) s = got.state;
    steps.push({ label, note: got.note ?? '', json: JSON.stringify(s), draws: sha(r.draws), saved: got.saved ?? null });
  };
  const reload = () => step('save-and-reload', cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { note: 'the save was refused' };
    const saved = sha([...M.store.entries()].sort());
    return { state: M.cm.loadCareer(), saved };
  });
  step('start', () => ({ state: M.cm.startCareer(...argsOf(item)) }));
  reload();
  step('buy', cur => {
    const mine = new Set(cur.squad.map(p => p.name));
    const mp = M.cm.buildMarket(cur).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
    const next = mp && M.cm.buyPlayer(cur, mp);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('ai-bid', cur => {
    const bid = (cur.incomingBids ?? []).find(b => b.status === 'open' && !b.loan);
    const next = bid && M.cm.acceptBid(cur, bid.playerId);
    return next ? { state: next, note: 'done' } : { note: bid ? 'refused' : 'no bid' };
  });
  reload();
  for (let i = 0; i < 160; i += 1) {
    let reached = false;
    step(`to-january-${i + 1}`, cur => { reached = cur.calendar[cur.week]?.type === 'window'; return { state: M.cm.playNextEntry(cur, PLAY).state }; });
    if (reached) break;
  }
  reload();
  for (let i = 0; i < 220; i += 1) {
    let over = false;
    step(`rest-${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, PLAY); over = r.kind === 'seasonOver'; return { state: r.state }; });
    if (over) break;
  }
  step('finish', cur => ({ state: M.cm.finishSeason(cur).state }));
  step('summer', cur => ({ state: M.cm.startNextSeason(cur) }));
  reload();
  return steps;
}
async function journeys(list) {
  const t0 = Date.now();
  const eras = QUICK ? ['now'] : ['now', 'era2010', 'era2020'];
  const seeds = QUICK ? [0x1339d1] : [0x1339d1, 0x1339d2, 0x1339d3];
  let n = 0, red = 0; const notes = {};
  for (const era of eras) {
    const clubs = list.filter(x => x.era === era && x.args.length === 2);
    for (const item of [clubs[0], clubs[Math.floor(clubs.length / 2)], clubs[clubs.length - 1]]) for (const seed of seeds) {
      const a = await journey(P, item, seed), b = await journey(H, item, seed);
      n += 1;
      for (const x of a) if (x.note && !x.label.startsWith('save')) notes[`${x.label} ${x.note}`] = (notes[`${x.label} ${x.note}`] ?? 0) + 1;
      const at = a.findIndex((x, i) => !b[i] || x.label !== b[i].label || x.json !== b[i].json || x.draws !== b[i].draws || x.saved !== b[i].saved || x.note !== b[i].note);
      if (at >= 0 || a.length !== b.length) {
        red += 1;
        const x = a[at] ?? a.at(-1), y = b[at] ?? b.at(-1);
        fail(3, `journey ${item.club} (${era}, seed ${seed.toString(16)}) at step ${at} ${x.label}: ${x.json !== y?.json ? `the state differs ${firstDifference(x.json, y?.json ?? '')}` : 'the draws, the saved bytes or the step differ'}`);
      }
    }
  }
  console.log(`section 3 journeys: ${n} seeded careers (start, buy, an AI bid, January, the season, the summer; ${Object.entries(notes).sort().map(([k, v]) => `${k} ${v}`).join(', ')}), ${red} red, ${seconds(t0)}s`);
}

/* ---- section 4, dailies: each date a fresh engine on each arm ---- */
const dateList = n => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 9, 10 + i)).toISOString().slice(0, 10));
async function hotSeatDay(E, date) {
  const M = await E.fresh();
  return tape(0x4807, () => {
    const setup = M.hs.dailyHotSeat(date);
    let run = M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
    const opened = JSON.stringify(run);
    const win = run.state.calendar.findIndex(e => e.type === 'window'), from = run.state.week;
    for (let g = 0; !run.verdict && g < 60; g += 1) run = M.hs.pendingPress(run) ? M.hs.answerHotSeatPress(run, 0) : M.hs.playHotSeatMatch(run, 'balanced', null);
    return { club: setup.club, json: JSON.stringify([opened, run, run.verdict ? M.hs.handoverState(run) : null]), crossed: win >= from && win < run.state.week };
  });
}
async function deadlineDay(E, date) {
  const M = await E.fresh();
  return tape(0x4808, () => {
    const setup = M.dd.dailyDeadlineDay(date);
    let run = M.dd.startDeadlineDay(setup);
    const opened = JSON.stringify(run);
    for (let i = 0, signed = false; i < run.targets.length && !signed; i += 1) {
      const talks = M.dd.openTalks(run, i);
      if (talks === run) continue;
      run = talks;
      for (let k = 0; k < 4 && run.targets[i].status === 'talks'; k += 1) {
        const ask = run.targets[i].neg?.theirAsk;
        if (!(ask > 0) || ask > run.state.budget) break;
        const next = M.dd.placeBid(run, i, ask); if (next === run) break; run = next;
      }
      for (let k = 0; k < 3 && run.targets[i].status === 'terms'; k += 1) {
        const want = run.targets[i].neg.terms.want;
        const next = M.dd.offerPersonalTerms(run, i, { wage: want.wage, years: want.years, bonus: want.bonus }); if (next === run) break; run = next;
      }
      signed = run.targets[i].status === 'signed';
    }
    for (let k = 0; k < run.sales.length; k += 1) { const next = M.dd.sellPlayer(run, k); if (next !== run) { run = next; break; } }
    run = M.dd.endDay(run);
    return { club: setup.club, json: JSON.stringify([opened, run]) };
  });
}
const days = { hot: 0, deadline: 0, crossed: 0, red: 0 };
async function sectionDailies() {
  const t0 = Date.now();
  for (const [kind, n, play] of [['hot', 120, hotSeatDay], ['deadline', 60, deadlineDay]]) {
    for (const date of dateList(QUICK ? Math.round(n / 6) : n)) {
      const a = await play(P, date), b = await play(H, date);
      days[kind] += 1;
      if (kind === 'hot' && a.value.crossed) days.crossed += 1;
      if (a.value.json !== b.value.json || sha(a.draws) !== sha(b.draws)) {
        days.red += 1;
        fail(4, `${kind === 'hot' ? 'Hot Seat' : 'Deadline Day'} ${date} (${a.value.club}): ${a.value.json !== b.value.json ? `the day differs ${firstDifference(a.value.json, b.value.json)}` : 'the draws differ'}`);
      }
    }
  }
  if (days.crossed === 0) fail(4, 'no Hot Seat day crossed the January window: the section cannot see the window path (widen the dates)');
  console.log(`section 4 dailies: ${days.hot} Hot Seat days (${days.crossed} cross the January window) and ${days.deadline} Deadline Days compared, ${days.red} red, ${seconds(t0)}s`);
}

/* ---- run, then the verdict ---- */
if (SECTIONS.includes(1) || SECTIONS.includes(2)) {
  const t0 = Date.now();
  const saves = await oldSaves();
  console.log(`  ${saves.length} old saves (3 fixture, ${OLD_SAVES.length} committed, ${saves.length - 3 - OLD_SAVES.length} written by the pre AZ engine), ${seconds(t0)}s`);
  await sectionsOldAndFeed(saves);
}
if (SECTIONS.includes(3) || SECTIONS.includes(5)) await sectionsFreshAndHeadroom();
if (SECTIONS.includes(4)) await sectionDailies();
for (const n of SECTIONS) {
  for (const f of fails[n].slice(0, 6)) console.log(`  FAIL ${n} ${f}`);
  if (fails[n].length > 6) console.log(`  ... and ${fails[n].length - 6} more in section ${n}`);
}
const red = n => fails[n].length > 0;
const ran = n => SECTIONS.includes(n);
const greenWhereRun = list => list.every(n => !ran(n) || !red(n));
let verdict, code;
if (CONTROL === 'legacy') {
  const fired = ran(1) && red(1) && (!ran(2) || red(2)) && greenWhereRun([3, 4, 5]);
  verdict = fired ? `CONTROL legacy FIRED: with main's line on the head, section 1 went red (${fails[1].length})${ran(2) ? ` and section 2 (${fails[2].length})` : ''}, and the rest stayed green`
    : `CONTROL legacy DID NOT FIRE as it must: ${SECTIONS.map(n => `section ${n} ${red(n) ? 'red' : 'green'}`).join(', ')}`;
  code = fired ? 1 : 3;
} else if (CONTROL === 'slice') {
  const fired = ran(3) && fresh3.starts > 0 && fresh3.red === fresh3.starts && (!ran(4) || days.red === days.hot + days.deadline) && greenWhereRun([1, 2]);
  verdict = fired ? `CONTROL slice FIRED: one row fewer in the feed's pool moved every start (${fresh3.red} of ${fresh3.starts})${ran(4) ? ` and every daily (${days.red})` : ''}; sections 1 and 2 stayed green`
    : `CONTROL slice DID NOT FIRE as it must: starts red ${fresh3.red} of ${fresh3.starts}, dailies red ${days.red}, ${[1, 2].filter(ran).map(n => `section ${n} ${red(n) ? 'red' : 'green'}`).join(', ')}`;
  code = fired ? 1 : 3;
} else if (CONTROL === 'shallow') {
  const fired = ran(5) && head5.under > 0;
  verdict = fired ? `CONTROL shallow FIRED: with squads of 9, ${head5.under} starts put a man of my club in the market's first 160, the lowest at index ${head5.min.rank} (${head5.min.name}, ${head5.min.club}, ${head5.min.era})`
    : `CONTROL shallow DID NOT FIRE as it must: the lowest index was ${head5.min ? `${head5.min.rank} (${head5.min.club}, ${head5.min.era})` : 'none'}`;
  code = fired ? 1 : 3;
} else {
  const total = SECTIONS.reduce((n, s) => n + fails[s].length, 0);
  verdict = total === 0
    ? `green (mode ${MODE}, sections ${SECTIONS.join(', ')}): ${MODE === 'as-is' ? 'as the head stands the harness sees no defect' : 'the market lists nobody at my own club in every old save and moves nothing else'}`
    : `${total} FAILURE(S) (mode ${MODE}, sections ${SECTIONS.filter(red).join(', ')} red)${MODE === 'as-is' ? ': as the head stands, the defect is seen' : ''}`;
  code = total === 0 ? 0 : 1;
}
console.log(`simCmOwnClubMarket: ${verdict}`);
process.exit(code);

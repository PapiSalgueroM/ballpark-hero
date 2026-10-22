/* Round 1533: a GM's career on the NFL Front Office board, fired being a
 * chapter and not the end. The Round 1223 desk host (src/lib/gmDeskHost.ts)
 * is bound to the NFL board (FrontOfficeBoard.tsx) through src/lib/nflGmDesk.ts,
 * and this harness drives the real NFL engine in the board's own call order.
 *
 * A DRIVE table keyed by sport holds each board's calls. This round fills the
 * 'nfl' row; the next bind adds a row and runs every section over it.
 *
 * Sections (each says what it proves and what it does not):
 *   1  the default path. A desk on save, ten seeds of five seasons, driven in
 *      the board's call order. A sha1 a season over the league (ids with
 *      their epoch taken out), Round 1019's three blocks (contracts, picks,
 *      staff) and the save's trust, fired and mandate. RECORDED from the
 *      commit the round started on, grading with today's two engine calls
 *      (gradeSeason then applyMandateResult); replayed grading through
 *      hostSeasonVerdict, the board's path from step 1. It proves the host's
 *      verdict is today's grade on THIS driver, and that the only keys the
 *      desk gains are `seat` and `xp`. It is not a proof of the board: the
 *      board itself is held by FrontOfficeOnePress.test.tsx and the default
 *      path block of FrontOfficeGmCareer.test.tsx.
 *   4  the market after a real firing (MEASURE): twenty seeds, twelve
 *      seasons, one league a seed played in the board's order with every club
 *      graded as a GM's club: its own mandate from its strength rank each
 *      summer, its own trust from the start figure, its own record through
 *      the host's close, fired at zero and a new GM put in. The clubs' own
 *      CPU moves stand in for a GM's. It prints the share of first out of
 *      work screens that read offers, quiet and closed (with the host's rule
 *      and with the raw feed beside it), the share of those with offers that
 *      are last calls, and the share re hired within three feeds.
 *
 * Controls (SIM_GM_CAREER_CONTROL), each must go red in its section:
 *   epoch (1)    the id epoch is not pinned before the bundle is evaluated
 *   addkey (1)   the host's close writes a third block
 * Exit 0 green, 1 red (or a control fired), 2 could not run.
 *
 * Recording: SIM_GM_CAREER_RECORD=<sha of the base> writes the fixture
 * (scripts/data/gmCareerFixture.json, or SIM_GM_CAREER_OUT) and stops.
 * Recorded twice in two processes on a runner; both printed one digest.
 * Production is off limits: the bundle is refused if it names the database.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const lf = s => s.replaceAll('\r\n', '\n');
const J = v => JSON.stringify(v);
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'gmCareerFixture.json');

const CONTROL = process.env.SIM_GM_CAREER_CONTROL || '';
const RECORD = process.env.SIM_GM_CAREER_RECORD || '';
const ONLY = (process.env.SIM_GM_CAREER_ONLY || '').split(',').filter(Boolean);
const runs = id => ONLY.length === 0 || ONLY.includes(id);
const CONTROLS = { epoch: '1', addkey: '1' };
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_GM_CAREER_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();

let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 8) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 9) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const ok = (cond, m) => { if (!cond) fail(m); };
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  host: path.join(ROOT, 'src', 'lib', 'gmDeskHost.ts'),
  desk: path.join(ROOT, 'src', 'lib', 'nflGmDesk.ts'),
  seat: path.join(ROOT, 'src', 'lib', 'gmSeat.ts'),
  board: path.join(ROOT, 'src', 'components', 'front-office', 'FrontOfficeBoard.tsx'),
};
const EDITS = {
  addkey: ['host', '  next = withGmBlock(next, GM_HOST_KEYS.xp, nextXp);\n',
    "  next = withGmBlock(next, GM_HOST_KEYS.xp, nextXp);\n  next = withGmBlock(next, 'extra', 1);\n"],
};
const overrides = new Map();
let fired = 0;
if (CONTROL && EDITS[CONTROL]) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape SIM_GM_CAREER_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (src.split(from).length !== 2) { console.error(`control cannot run: the text ${CONTROL} rewrites is there more than once`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), src.replace(from, to));
  fired += 1;
}
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}; section ${CONTROLS[CONTROL]} must go red`);

/* ---- one bundle, in a folder of this run's own so two runs cannot mix ---- */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simGmCareer-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
const lib = n => `'${ROOT_URL}/src/lib/${n}.ts'`;
fs.writeFileSync(ENTRY, `
export { makeIdMinter } from ${lib('entityIds')};
export * as E from ${lib('frontOffice')};
export * as D from ${lib('nflGmDesk')};
export * as H from ${lib('gmDeskHost')};
export * as FM from ${lib('foOwnerMandate')};
export * as SEAT from ${lib('gmSeat')};
export * as G from ${lib('gmDesk')};
export * as K from ${lib('keyedRng')};
export { nflDeskHost } from ${lib('gmDeskHostNfl')};
export { leagueNames } from ${lib('foNames')};
export { FO_DEPTH } from '${ROOT_URL}/src/data/frontOfficeDepth.ts';
export { FO_TEAMS } from '${ROOT_URL}/src/data/frontOfficePlayers.ts';
export * as S from ${lib('gmStaff')};
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE, logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        return hit === undefined ? undefined : { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
{
  const text = fs.readFileSync(BUNDLE, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) {
    if (text.includes(host)) { console.error(`refusing to run: the bundle names ${host}`); process.exit(2); }
  }
}

/* ---- seeded draws ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* THE ID EPOCH IS PINNED. entityIds.ts draws its epoch from Math.random when
   the bundle is evaluated, and a desk on save hashes ids (the trainer's weeks
   out, the scout's read), so the stream it is drawn from is fixed here, right
   at the require, whatever was drawn before. Control `epoch`: unpinned. */
const realRandom = Math.random;
if (CONTROL === 'epoch') {
  Math.random = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;
  fired += 1;
} else {
  Math.random = mulberry32(1533);
}
const M = createRequire(import.meta.url)(BUNDLE);
Math.random = realRandom;
const { E, D, H, FM, SEAT, G, K, S, nflDeskHost, leagueNames, FO_DEPTH, FO_TEAMS } = M;
const EPOCH = (() => { const id = M.makeIdMinter('x')(); return id.slice(1, id.lastIndexOf('-')); })();
const unEpoch = s => s.split(EPOCH).join('E');

const NFL_WORDS = { title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17 };
const LABEL = Object.fromEntries(FO_TEAMS.map(t => [t.abbr, `${t.city} ${t.name}`]));
const label = id => LABEL[id] ?? id;
const sameId = id => id;

/* ================================================================== */
/* The DRIVE table: each board's calls, in that board's own order.      */
/* ================================================================== */
const byValue = arr => [...arr].sort((a, b) => E.tradeValue(a) - E.tradeValue(b) || a.id.localeCompare(b.id));
const strengthsOf = lg => Object.fromEntries(Object.entries(lg.teams).map(([a, t]) => [a, E.teamStrength(t)]));

/** The board holds Play until his roster fits: the GM lets the weakest go, the board's two tap release. */
function nflCut(lg, team) {
  const mine = lg.teams[team];
  while (E.deepOverLimit(mine) > 0) {
    const down = byValue(mine.players)[0];
    if (!E.releasePlayer(mine, lg.freeAgents, down.id)) break;
  }
}

/** Draft night as the board runs it (openDraft, draftProspect, draftWithoutPicks): he takes the best grade he sees. */
function nflDraft(lg, team, rng, desk) {
  const mine = lg.teams[team];
  const count = mine.picks.length;
  let batches = Math.max(3, count);
  const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + t.picks.length, 0);
  let cls = E.generateDraftClass(rng, Math.max(40, count + Math.min(rivalCapital, batches * 6)), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(D.nflStaffOf(desk, lg, team).block, 'scouting') : null;
  const grade = pr => (level !== null ? D.nflScoutRead(pr, team, lg.season, level) : pr.grade);
  if (count <= 0) {
    for (let i = 0; i < batches; i++) cls = E.nflAiDraftPicks(lg, cls, team, rng).remaining;
    return desk;
  }
  let picksLeft = count;
  while (picksLeft > 0) {
    const pr = [...cls].sort((a, b) => grade(b) - grade(a) || a.id.localeCompare(b.id))[0];
    if (!pr) break;
    const round = mine.picks[0];
    if (!E.consumeDraftPick(mine)) break;
    const p = E.prospectToPlayer(pr, rng);
    if (p && desk) D.nflSignDraftee(p);
    if (p) mine.players.push(p);
    if (p && desk) desk = D.nflNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = picksLeft - 1;
    const now = nextPicks <= 0 ? batches : Math.min(1, batches);
    for (let i = 0; i < now; i++) cls = E.nflAiDraftPicks(lg, cls, team, rng).remaining;
    batches -= now;
    picksLeft = nextPicks;
  }
  return desk;
}

const DRIVE = {
  nfl: {
    host: nflDeskHost,
    team: 'KC',
    newLeague: (rng, team) => E.initLeague(rng, { depth: FO_DEPTH, userTeam: team }),
    cut: nflCut,
    openDesk: (lg, team) => D.openNflDesk(lg, team),
    /* The board's mandateFor. */
    mandateFor: (lg, team, defendingChamp, tilt = 0) => FM.buildOwnerMandate(
      FM.strengthRank(strengthsOf(lg), team), Object.keys(lg.teams).length, defendingChamp, NFL_WORDS, lg.season, tilt),
    /* playWeek pressed every week, the final week's one press playing the playoffs, then closeSeason's champion. */
    season(lg, team, rng, desk) {
      for (;;) {
        const deskWeek = desk ? D.nflDeskWeekOptions(desk, lg, team) : null;
        if (deskWeek) E.injuryPass(lg.teams, rng, deskWeek.weeksFor); else E.injuryPass(lg.teams, rng);
        E.aiWeeklyMoves(lg, team, rng);
        lg.schedule[lg.week - 1].map(g => (deskWeek ? E.simGame(g, lg.teams, rng, deskWeek.edges) : E.simGame(g, lg.teams, rng)));
        if (desk) desk = D.nflDeskAfterWeek(desk, lg, team).desk;
        if (lg.week >= E.REGULAR_WEEKS) break;
        lg.week += 1;
      }
      const po = E.runPlayoffs(lg.teams, rng, desk ? D.nflDeskEdges(desk, lg, team) : undefined);
      lg.champions.push({ season: lg.season, team: po.champion });
      return { desk, rounds: po.rounds, champion: po.champion };
    },
    /* The season as the mandate grades it: the bind's one reader once it exists, today's inline input before. */
    outcome: (lg, team, rounds, champion) => (typeof D.nflOutcome === 'function'
      ? D.nflOutcome(lg, team, rounds, champion)
      : { wins: lg.teams[team].wins, ...FM.nflPostseason(rounds, team), wonTitle: champion === team }),
    draft: nflDraft,
    /* finishDraft: the desk summer when the desk is on, the engine's own otherwise. */
    summer(lg, team, rng, desk) {
      if (!desk) { E.runOffseason(lg, rng, team); return desk; }
      const s = D.nflDeskOffseason(lg, desk, team, rng);
      return s.desk;
    },
    /* A season with nobody in any chair, every club on the CPU's policy: the measuring run's league. */
    cpuLeague: rng => E.initLeague(rng, { depth: FO_DEPTH, userTeam: '-' }),
    cpuSeason(lg, rng) {
      for (;;) {
        E.injuryPass(lg.teams, rng);
        E.aiWeeklyMoves(lg, '', rng);
        lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, rng));
        if (lg.week >= E.REGULAR_WEEKS) break;
        lg.week += 1;
      }
      const po = E.runPlayoffs(lg.teams, rng);
      lg.champions.push({ season: lg.season, team: po.champion });
      return { rounds: po.rounds, champion: po.champion };
    },
    cpuSummer(lg, rng) {
      let cls = E.generateDraftClass(rng, 40, leagueNames(lg));
      for (let i = 0; i < 3; i++) cls = E.nflAiDraftPicks(lg, cls, '', rng).remaining;
      E.runOffseason(lg, rng);
    },
  },
};
const SPORT = process.env.SIM_GM_CAREER_SPORT || 'nfl';
if (!DRIVE[SPORT]) { console.error(`no DRIVE row for ${SPORT}`); process.exit(2); }
const d = DRIVE[SPORT];

/* ================================================================== */
/* 1. The default path, recorded from the base and replayed            */
/* ================================================================== */
const S1_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const S1_SEASONS = 5;
const DESK_KEYS = ['contracts', 'picks', 'staff'];
const GAINED_KEYS = ['seat', 'xp'];
/* FIRST, before anything else mints an id, so the recorder and the replay walk the same id stream. */
const s1 = { hashes: {}, seasons: 0, firedAt: [], badKeys: 0 };
for (const seed of S1_SEEDS) {
  const rng = mulberry32(seed);
  const team = d.team;
  const lg = d.newLeague(rng, team);
  d.cut(lg, team);
  let desk = d.openDesk(lg, team);
  let mandate = d.mandateFor(lg, team, false);
  let trust = FM.FO_TRUST_START, firedNow = false, seasonsPlayed = 0, titles = 0;
  const out = s1.hashes[seed] = [];
  const snap = where => out.push(`${where}:${sha(unEpoch(J({
    league: lg, blocks: Object.fromEntries(DESK_KEYS.map(k => [k, desk.blocks[k] ?? null])), trust, fired: firedNow, mandate,
  })))}`);
  for (let s = 0; s < S1_SEASONS; s++) {
    const r = d.season(lg, team, rng, desk);
    desk = r.desk;
    const outcome = d.outcome(lg, team, r.rounds, r.champion);
    if (RECORD) {
      const grade = FM.gradeSeason(mandate, outcome);
      const applied = FM.applyMandateResult(trust, grade);
      trust = applied.trust; firedNow = applied.fired;
    } else {
      const v = H.hostSeasonVerdict(d.host, lg, { team, mandate, trust, fired: firedNow, outcome, desk, seasonsPlayed, titles });
      trust = v.trust; firedNow = v.fired; desk = v.desk;
      const extra = Object.keys(desk.blocks).filter(k => !DESK_KEYS.includes(k) && !GAINED_KEYS.includes(k));
      if (extra.length) { s1.badKeys++; if (s1.badKeys <= 3) console.error(`  seed ${seed} season ${s + 1}: the desk gained ${J(extra)}, only seat and xp are this round's`); }
    }
    titles += r.champion === team ? 1 : 0;
    seasonsPlayed += 1;
    s1.seasons++;
    snap('close');
    if (firedNow) { s1.firedAt.push(`${seed}:${s + 1}`); break; }
    desk = d.draft(lg, team, rng, desk);
    desk = d.summer(lg, team, rng, desk);
    const built = d.mandateFor(lg, team, r.champion === team, 0);
    mandate = RECORD ? built : H.hostSummerMandate(mandate, built, lg.season);
    d.cut(lg, team);
    snap('summer');
  }
}
const s1Digest = sha(J(s1.hashes));
if (RECORD) {
  const file = process.env.SIM_GM_CAREER_OUT || FIXTURE;
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  prior[SPORT] = { recordedFrom: RECORD, team: d.team, seeds: S1_SEEDS, seasons: S1_SEASONS, digest: s1Digest, hashes: s1.hashes };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${J(prior, null, 2)}\n`);
  console.log(`RECORDED ${SPORT} from ${RECORD}: ${S1_SEEDS.length} seeds, ${s1.seasons} seasons, fired at ${J(s1.firedAt)}, digest ${s1Digest} -> ${path.relative(ROOT, file)}`);
  process.exit(0);
}
if (runs('1')) {
  begin('1', 'the default path: a desk on save graded through the host is the base\'s, season for season, and gains only seat and xp');
  const fixture = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8'))[SPORT] : null;
  if (!fixture) fail(`no ${SPORT} recording in ${path.relative(ROOT, FIXTURE)}: record it on the base with SIM_GM_CAREER_RECORD`);
  else {
    let compared = 0, moved = 0;
    for (const seed of S1_SEEDS) {
      const want = fixture.hashes[seed] ?? [], got = s1.hashes[seed];
      if (want.length !== got.length) fail(`seed ${seed}: ${got.length} checkpoints played, the base played ${want.length}`);
      for (let i = 0; i < Math.min(want.length, got.length); i++) {
        compared++;
        if (want[i] !== got[i]) { moved++; fail(`seed ${seed} checkpoint ${i + 1} (${got[i].split(':')[0]}): not the base's`); break; }
      }
    }
    ok(s1.badKeys === 0, `${s1.badKeys} closes wrote a block other than seat and xp`);
    console.log(`   ${compared} checkpoints over ${s1.seasons} seasons against ${fixture.recordedFrom} (${moved} moved); fired at ${J(s1.firedAt)}; digest ${s1Digest}`);
  }
}

/* ================================================================== */
/* 4. The market after real firings                                    */
/* ================================================================== */
const S4_SEEDS = (process.env.SIM_GM_CAREER_MEASURE_SEEDS || '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20').split(',').map(Number);
const S4_SEASONS = Number(process.env.SIM_GM_CAREER_MEASURE_SEASONS || 12);
const S4 = {
  firings: 0, first: { offers: 0, quiet: 0, closed: 0 }, raw: { offers: 0, quiet: 0, closed: 0 },
  lastCalls: 0, rawLastCalls: 0, firstCalls: 0, eligible: 0, hired3: 0, rawHired3: 0, feedsRead: 0,
};
/** The feed without any rule the host adds on top: gmSeat's own offers, keyed as the host keys them. */
function rawMarket(host, lg, seat) {
  const season = host.season(lg);
  const teams = H.hostSeatTeams(host, lg, label);
  const offers = SEAT.seatOffers(host.pack, teams, seat.career, season + 1, K.keyedRng(H.hostFeedKey(host.sport, seat, season)), host.champion(lg, season));
  const { nextYear } = H.hostNextYear(seat, SEAT.leagueTiers(teams));
  return { offers, nextYear, state: offers.length > 0 ? 'offers' : nextYear === 'shut' ? 'closed' : 'quiet' };
}
const sitOut = seat => ({ ...seat, career: SEAT.sitOutYear(seat.career) });
if (runs('4')) {
  begin('4', 'the market after real firings: every club graded as a GM\'s club, the first out of work screen and the next two');
  const host = d.host;
  for (const seed of S4_SEEDS) {
    const rng = mulberry32(4000 + seed);
    const lg = d.cpuLeague(rng);
    const ids = Object.keys(lg.teams).sort();
    const tierNow = id => SEAT.leagueTiers(H.hostSeatTeams(host, lg, sameId)).get(id);
    const gm = {};
    const newGm = (id, from) => ({
      desk: G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, H.hostNewSeat(id, tierNow(id), from)),
      trust: FM.FO_TRUST_START, seasonsPlayed: 0, titles: 0, mandate: null,
    });
    for (const id of ids) gm[id] = newGm(id, lg.season);
    const askAll = champion => { for (const id of ids) gm[id].mandate = d.mandateFor(lg, id, champion === id, 0); };
    askAll(null);
    /* Men between seats: one track read through the host, one through the raw feed. */
    const tracks = [];
    for (let s = 0; s < S4_SEASONS; s++) {
      const r = d.cpuSeason(lg, rng);
      /* A year on for everyone still out of work, read before this close fires anybody new. */
      for (const t of tracks) {
        for (const k of ['host', 'raw']) {
          const w = t[k];
          if (w.done || w.feeds >= 3) continue;
          if (w.next === 'shut') { w.done = true; continue; }
          w.seat = sitOut(w.seat);
          const m = k === 'host' ? H.hostMarket(host, lg, w.seat, label) : rawMarket(host, lg, w.seat);
          S4.feedsRead++;
          w.feeds++; w.next = m.nextYear;
          if (m.state === 'offers') { w.hired = true; w.done = true; } else if (m.state === 'closed') w.done = true;
        }
      }
      for (const id of ids) {
        const g = gm[id];
        const outcome = d.outcome(lg, id, r.rounds, r.champion);
        const v = H.hostSeasonVerdict(host, lg, { team: id, mandate: g.mandate, trust: g.trust, fired: false, outcome, desk: g.desk, seasonsPlayed: g.seasonsPlayed, titles: g.titles });
        g.trust = v.trust; g.desk = v.desk; g.seasonsPlayed += 1; g.titles += r.champion === id ? 1 : 0;
        if (!v.fired) continue;
        S4.firings++;
        const legacy = H.hostLegacy(host, lg, { team: id, seasonsPlayed: g.seasonsPlayed, titles: g.titles, fired: true, seasonCounted: true });
        const seat = H.hostSeatOf(g.desk, legacy);
        const m = H.hostMarket(host, lg, seat, label);
        const raw = rawMarket(host, lg, seat);
        S4.first[m.state]++; S4.raw[raw.state]++;
        if (m.state === 'offers' && m.nextYear === 'shut') S4.lastCalls++;
        if (raw.state === 'offers' && raw.nextYear === 'shut') S4.rawLastCalls++;
        if (m.offers.length > raw.offers.length) S4.firstCalls++;
        const room = S4_SEASONS - 1 - s >= 2;
        const track = w => ({ seat, feeds: 1, next: w.nextYear, hired: w.state === 'offers', done: w.state !== 'quiet' });
        tracks.push({ room, host: track(m), raw: track(raw) });
        gm[id] = newGm(id, lg.season + 1);
      }
      d.cpuSummer(lg, rng);
      askAll(r.champion);
    }
    for (const t of tracks) {
      if (!t.room) continue;
      S4.eligible++;
      if (t.host.hired) S4.hired3++;
      if (t.raw.hired) S4.rawHired3++;
    }
  }
  const pct = (n, of) => (of ? `${((100 * n) / of).toFixed(1)}%` : 'n/a');
  const f = S4.first, rw = S4.raw;
  console.log(`   MEASURE ${S4_SEEDS.length} seeds x ${S4_SEASONS} seasons: ${S4.firings} firings`);
  console.log(`   first screen with the host's rule: offers ${f.offers} (${pct(f.offers, S4.firings)}), quiet ${f.quiet} (${pct(f.quiet, S4.firings)}), closed ${f.closed} (${pct(f.closed, S4.firings)}); first calls ${S4.firstCalls}`);
  console.log(`   first screen on the raw feed:      offers ${rw.offers} (${pct(rw.offers, S4.firings)}), quiet ${rw.quiet} (${pct(rw.quiet, S4.firings)}), closed ${rw.closed} (${pct(rw.closed, S4.firings)})`);
  console.log(`   of the screens with offers, last calls: host ${S4.lastCalls} of ${f.offers} (${pct(S4.lastCalls, f.offers)}), raw ${S4.rawLastCalls} of ${rw.offers} (${pct(S4.rawLastCalls, rw.offers)})`);
  console.log(`   re hired within three feeds (firings with two seasons left to read, ${S4.eligible}): host ${S4.hired3} (${pct(S4.hired3, S4.eligible)}), raw ${S4.rawHired3} (${pct(S4.rawHired3, S4.eligible)}); ${S4.feedsRead} later feeds read`);
  ok(S4.firings > 0, 'no club was fired in the measuring run, so it measured nothing');
}

/* ================================================================== */
const total = [...failedIn.values()].reduce((a, b) => a + b, 0);
if (CONTROL) {
  const hit = failedIn.get(CONTROLS[CONTROL]) ?? 0;
  console.log(`CONTROL ${CONTROL}: ${fired} rewrite(s) applied, ${hit} failure(s) in section ${CONTROLS[CONTROL]}${hit > 0 ? ' (FIRED)' : ' (DID NOT FIRE)'}`);
  if (fired === 0) process.exit(2);
  process.exit(hit > 0 ? 1 : 3);
}
if (total > 0) {
  console.log(`simGmCareer: ${total} failure(s) in ${[...failedIn.keys()].join(', ')}`);
  process.exit(1);
}
console.log(`simGmCareer: all checks passed (${SPORT}${ONLY.length ? `, sections ${ONLY.join(',')}` : ''})`);

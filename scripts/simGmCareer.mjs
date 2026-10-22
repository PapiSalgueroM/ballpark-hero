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
 *   2  the verdict on every club's real season of the fleet: desk off it is
 *      today's two engine calls; desk on it records once, pays the four
 *      facts' XP once, a reload pays nothing, a new save's first close is its
 *      own season. OWNERSHIP (step 2): through the same verdict at levels 0
 *      to 5, exact against gmXp.cushionTrustLoss over gradeSeason's own
 *      change; level 0 is today's number; every level strictly gentler than
 *      the one below on every losing season, the same on every winning one;
 *      the worked example (trust 16, a missed season: fired at level 0, kept
 *      on trust 1 at level 1).
 *   3  MEDIA (step 3): the board's answerPress read off its source (comments
 *      out) is one hostPressOption over hostXpEffects of its desk handed to
 *      applyGmPressChoice with one Math.random; then that call over every
 *      presser buildGmPresser makes for the NFL's words (four kinds) and every
 *      answer, at levels 0 to 5, on a half step roll grid of 1000: each gamble
 *      lands exactly GM_PRESS_ODDS_PER_POINT x 1000 more times a level (read,
 *      never typed), level 0 lands at its own odds, a safe answer is the same
 *      object and the same trust at every level, the tilt never moves, and
 *      the draws an answer takes never move.
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
 *      ASSERTED on every first feed: never the club that fired him, nothing
 *      above the second tier straight after a 'badly' season, every ask for
 *      the season after the league's, the same feed on a second read and
 *      after a reload.
 *   5  taking a seat, on every fired GM of section 4 and every offer of his
 *      first feed (nflTakeSeat on a copy, the board's desk): the league and
 *      the desk byte equal but for the two clubs' contracts and staff and the
 *      old club's saved depth chart (planted first, so its reset is seen);
 *      picks conserved; his XP equal; the new stint open from next season and
 *      the old one ended fired; the new ledger and staff the new club's own;
 *      the save's six fields takeSeat's. The first offer is followed through
 *      the new club's draft and summer: arriving until the summer has run,
 *      graded on the offer's ask.
 *   6  a season out through nflAwayHost, twenty seeds, up to three years
 *      each: one decided season a year with one champion, every club plays
 *      17 games, every club inside the roster limit after the summer, no id
 *      minted in a week or the playoffs, picks conserved, his record gains a
 *      year out and nothing else, his XP and the old club's blocks untouched,
 *      and refusals (in a seat, a closed market, a last call) leave the league
 *      byte equal. Against a measured baseline (the same seeds with an idle GM
 *      in the old club's chair, the board's calls with that club as the user),
 *      read on the other 31 clubs only (the old club is the engine's user club
 *      in the baseline, so it is never cut, tagged or drafted for there): the
 *      drafted men on rosters after the years out, and the mean roster after
 *      a summer.
 *   7  whole careers: ten seeds of twelve seasons, a sacking forced every
 *      third season (trust 5 under a title ask, as playOwnerMandate forces
 *      one), then a take or a year out by the seed: at every step the save
 *      passes isFrontOfficeSave, the record fits the save, stints never
 *      overlap, and the record's seasons and titles are the save's counters.
 *   8  the words (and the arrival line, Round 1533 step 4).
 *
 * Controls (SIM_GM_CAREER_CONTROL), each must go red in its section:
 *   epoch (1)    the id epoch is not pinned before the bundle is evaluated
 *   addkey (1)   the host's close writes a third block
 *   deskoffblock, paytwice, lateseat, flatowner (2); emptytile, nameinline (8)
 *   flatmedia, extradraw (3); firedclub, unkeyed (4)
 *   staffrides, ledgerrides, rostermove, depthstays, askrebuilt (5)
 *   halfseason, notrim, awayxp, lastcall, noawaydraft (6)
 *   overlap, firedlost (7)
 * Exit 0 green, 1 red (or a control fired), 2 could not run, 3 a control did not fire.
 *
 * MEASURED 2026-10-22 on GitHub runners (r1533-s4b, head 8a1fdbcb), the floors set near 70 percent of each:
 *   section 4: 475 first feeds asserted, 311 straight after a badly season (floors 300, 200)
 *   section 5: 493 offers in the first feeds, 475 firings followed (floors 400, 300)
 *   section 6: 60 years out on each of three seed sets; bands beside S6_BAND
 *   section 7: 17 firings, 8 seats taken, 17 years out, 9 careers closed for good (floors 12, 5, 10)
 *   controls: firedclub 2, unkeyed 580, staffrides 503, ledgerrides 505, rostermove 934, depthstays 503,
 *   askrebuilt 326, halfseason 60, awayxp 60, lastcall 20, noawaydraft 1, overlap 55, firedlost 27,
 *   nameinline 128 failures. notrim did not fire on the roster limit alone (the old club never passed 53), so
 *   section 6 replays every away summer against the engine's offseason with no user club, which it must equal.
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
const CONTROLS = {
  epoch: '1', addkey: '1', deskoffblock: '2', paytwice: '2', lateseat: '2', emptytile: '8', nameinline: '8',
  flatowner: '2', flatmedia: '3', extradraw: '3', firedclub: '4', unkeyed: '4', staffrides: '5', ledgerrides: '5', rostermove: '5', depthstays: '5', askrebuilt: '5',
  halfseason: '6', notrim: '6', awayxp: '6', lastcall: '6', noawaydraft: '6', overlap: '7', firedlost: '7',
};
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
  deskoffblock: ['host', '  if (!i.desk) return out;', '  if (!i.desk) return { ...out, desk: { v: 1, blocks: { seat: 1 } } };'],
  paytwice: ['host', '  if (seat.last !== undefined && f.season <= seat.last) return same;', '  if (false) return same;'],
  lateseat: ['host', 'titles: i.titles, fired: i.fired, seasonCounted: false,', 'titles: i.titles, fired: i.fired, seasonCounted: true,'],
  emptytile: ['host', "value: 'No more calls',", "value: '',"],
  /* Section 3: Media. The option handed through unchanged at every level; the board's press drawing twice. */
  flatmedia: ['host', '  if (!g || fx.points.media <= 0) return opt;', '  if (!g || fx.points.media <= 9) return opt;'],
  extradraw: ['board', "    const res = applyGmPressChoice(trust, hostPressOption(presser.options[i], hostXpEffects(gm, 'nfl')), Math.random);",
    "    const res = applyGmPressChoice(trust, hostPressOption(presser.options[i], hostXpEffects(gm, 'nfl')), () => (Math.random(), Math.random()));"],
  /* Section 2: Ownership's cushion not applied. */
  flatowner: ['host', '  const trustDelta = fx.trustDelta(grade.trustDelta) + movers;', '  const trustDelta = grade.trustDelta + movers;'],
  /* Section 4: the feed. The fired club let back into it; the feed drawn from Math.random, not its key. */
  firedclub: ['seat', '.filter(t => t.id !== last.team)', '.filter(t => true)'],
  unkeyed: ['host', '    keyedRng(hostFeedKey(host.sport, seat, season)), host.champion(league, season),', '    Math.random, host.champion(league, season),'],
  /* Section 5: taking a seat. His staff or his old ledger follow him; a man of the old club changes club with him;
     the old club keeps the depth chart he saved; the summer builds the ask again. */
  staffrides: ['desk', "    { key: NFL_DESK_KEYS.staff, owner: 'club', fresh: (league, team) => freshStaff(league, team) },", "    { key: NFL_DESK_KEYS.staff, owner: 'gm' },"],
  ledgerrides: ['desk', "    { key: NFL_DESK_KEYS.contracts, owner: 'club', fresh: (league, team) => openLedger(league, team) },", "    { key: NFL_DESK_KEYS.contracts, owner: 'gm' },"],
  rostermove: ['desk', '  const old = league.teams[legacy.team];\n  if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);',
    '  const old = league.teams[legacy.team];\n  if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);\n  if (old && league.teams[teamId]) league.teams[teamId].players.push(old.players.pop()!);'],
  depthstays: ['desk', '  const old = league.teams[legacy.team];\n  if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);', '  const old = league.teams[legacy.team];'],
  askrebuilt: ['host', '  return stored && stored.season === season ? stored : built;', '  return built;'],
  /* Section 6: the year out. The last week skipped; the old club named as the summer's user club, so it is not cut;
     his XP not put back; the last call refusal removed; the away draft skipped. */
  halfseason: ['desk', '    periods: () => REGULAR_WEEKS,', '    periods: () => REGULAR_WEEKS - 1,'],
  notrim: ['desk', '      runOffseason(league, rng);', '      runOffseason(league, rng, oldTeam);'],
  awayxp: ['host', '  if (Object.prototype.hasOwnProperty.call(a.desk.blocks, GM_HOST_KEYS.xp)) blocks[GM_HOST_KEYS.xp] = a.desk.blocks[GM_HOST_KEYS.xp];', '  /* his XP is not put back */'],
  lastcall: ['host', "  if (!hostCanSitOut(market)) return { ok: false, reason: 'last-call' };", "  if (false) return { ok: false, reason: 'last-call' };"],
  noawaydraft: ['desk', "      for (let i = 0; i < batches; i++) cls = nflAiDraftPicks(league, cls, '', rng).remaining;", '      /* the draft skipped */'],
  /* Section 7: whole careers. A new stint opened for the league's season instead of the next; the firing not recorded. */
  overlap: ['host', '  const career = startSeatStint(seat.career, offer, market.season);', '  const career = startSeatStint(seat.career, offer, market.season - 1);'],
  firedlost: ['host', "  if (f.fired) career = endSeatStint(career, 'fired');", '  /* the firing not recorded */'],
  /* Section 8: a player's name put into the arrival line. */
  nameinline: ['host', 'return `You take over the ${nameOf(s.team)}. They finished ${row.record}, ${ordinal(row.place)} in the league.`;',
    'return `You take over the ${nameOf(s.team)}. They finished ${row.record}, ${ordinal(row.place)} in the league. ${(league as any).teams?.[s.team]?.players?.[0]?.name ?? \'\'}`;'],
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
export * as X from ${lib('gmXp')};
export * as P from ${lib('gmPicks')};
export * as FP from ${lib('foGmPress')};
export { isFrontOfficeSave } from ${lib('frontOfficeSave')};
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
const { E, D, H, FM, FP, SEAT, G, K, S, X, P, isFrontOfficeSave, nflDeskHost, leagueNames, FO_DEPTH, FO_TEAMS } = M;
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
/* The fleet: real closed seasons, every club's own, for sections 2, 8 */
/* ================================================================== */
const FLEET_SEEDS = [1, 2, 3, 4];
const FLEET_SEASONS = 3;
function buildFleet() {
  const out = [];
  for (const seed of FLEET_SEEDS) {
    const rng = mulberry32(2000 + seed);
    const lg = d.cpuLeague(rng);
    const ids = Object.keys(lg.teams).sort();
    let champion = null;
    for (let s = 0; s < FLEET_SEASONS; s++) {
      const mandates = Object.fromEntries(ids.map(id => [id, d.mandateFor(lg, id, champion === id, 0)]));
      const r = d.cpuSeason(lg, rng);
      champion = r.champion;
      out.push({ seed, s, lg: JSON.parse(J(lg)), rounds: r.rounds, champion: r.champion, mandates });
      d.cpuSummer(lg, rng);
    }
  }
  return out;
}
const FLEET = runs('2') || runs('8') ? buildFleet() : [];
const tiersOf = lg => SEAT.leagueTiers(H.hostSeatTeams(d.host, lg, sameId));

/* ================================================================== */
/* 2. The verdict on every club's real season                          */
/* ================================================================== */
const RECAP_LINES = [];
if (runs('2')) {
  begin('2', 'the verdict on every club\'s real season: desk off it is today\'s two calls, desk on it records once and pays once');
  const S2 = { off: 0, on: 0, reloads: 0, old: 0, paid: 0 };
  for (const snap of FLEET) {
    const lg = snap.lg, season = lg.season, tiers = tiersOf(lg), clubs = d.host.clubs(lg);
    const before = J(lg);
    for (const id of Object.keys(lg.teams).sort()) {
      const at = `seed ${snap.seed} season ${snap.s + 1} ${id}`;
      const mandate = snap.mandates[id];
      const outcome = d.outcome(lg, id, snap.rounds, snap.champion);
      const grade = FM.gradeSeason(mandate, outcome);
      /* Desk off: exactly gradeSeason then applyMandateResult over the same grade, and no desk written. */
      for (const trust of [60, 30, 12]) {
        const today = FM.applyMandateResult(trust, grade);
        const v = H.hostSeasonVerdict(d.host, lg, { team: id, mandate, trust, fired: false, outcome, desk: null, seasonsPlayed: 2, titles: 0 });
        S2.off++;
        if (v.desk !== null) fail(`${at} trust ${trust}: a desk off close wrote a desk`);
        if (v.trust !== today.trust || v.fired !== today.fired || J(v.grade) !== J(grade)) fail(`${at} trust ${trust}: desk off reads ${v.trust}/${v.fired}, today's two calls ${today.trust}/${today.fired}`);
      }
      /* Desk on, a new save: start writes his record the day he takes the club, so the first close records the
         season he started in, pays once, and the recap after it is his season (not an arrival). */
      const fresh = G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, H.hostNewSeat(id, tiers.get(id), season));
      const v1 = H.hostSeasonVerdict(d.host, lg, { team: id, mandate, trust: 60, fired: false, outcome, desk: fresh, seasonsPlayed: 0, titles: 0 });
      S2.on++;
      const seat1 = v1.desk?.blocks?.seat;
      if (!v1.award || !seat1 || seat1.last !== season || seat1.career.stints.length !== 1 || seat1.career.stints[0].from !== season
        || seat1.career.stints[0].grades.join() !== grade.result) fail(`${at}: a new save's first close is not one graded season from ${season} (${J(seat1?.career)})`);
      else if (H.hostArriving(seat1, season)) fail(`${at}: his first recap reads as an arrival`);
      if (v1.trust !== FM.applyMandateResult(60, grade).trust) fail(`${at}: with no point spent the desk on trust is not today's`);
      const club = clubs.find(c => c.id === id);
      const want = X.gmSeasonXp({ winPct: club.games ? club.wins / club.games : 0, titles: outcome.wonTitle ? 1 : 0, playoffRoundsWon: outcome.roundsWon,
        mandateSteps: X.mandateSteps(grade.result), placesAboveExpectation: 0, prospectsGraduated: 0 });
      if (v1.award && v1.award.total !== want.total) fail(`${at}: paid ${v1.award.total} XP, the four facts pay ${want.total}`);
      if (v1.award) { S2.paid += v1.award.total; RECAP_LINES.push(H.hostXpRecapLine({ award: v1.award, levelAfter: v1.levelAfter, desk: v1.desk }, D.NFL_XP_LIVE ?? [])); }
      /* A reload on the recap closes the same season again: nothing is paid and nothing moves. */
      const v2 = H.hostSeasonVerdict(d.host, lg, { team: id, mandate, trust: 60, fired: false, outcome, desk: v1.desk, seasonsPlayed: 1, titles: outcome.wonTitle ? 1 : 0 });
      S2.reloads++;
      if (v2.award !== null || J(v2.desk) !== J(v1.desk)) fail(`${at}: a second close of the same season paid again or moved his record`);
      /* An older desk on save (no record yet): the record starts the season the counters say, never a season late. */
      const v3 = H.hostSeasonVerdict(d.host, lg, { team: id, mandate, trust: 60, fired: false, outcome, desk: G.freshGmDesk(), seasonsPlayed: 3, titles: 0 });
      S2.old++;
      const seat3 = v3.desk?.blocks?.seat;
      if (!seat3 || seat3.career.stints[0].from !== season - 3) fail(`${at}: an older save's record starts in ${seat3?.career.stints[0].from}, he took the club in ${season - 3}`);
    }
    if (J(lg) !== before) fail(`seed ${snap.seed} season ${snap.s + 1}: a verdict changed the league`);
  }
  console.log(`   ${S2.off} desk off closes equal today's two calls; ${S2.on} desk on closes recorded once (${S2.paid} XP paid, the median club ${Math.round(S2.paid / Math.max(1, S2.on))} a season), ${S2.reloads} reloads paid nothing, ${S2.old} older saves started on time`);
  ok(S2.on >= 300, `only ${S2.on} real club seasons read, too few to hold the verdict`);

  /* OWNERSHIP (step 2), through the board's own verdict at every level 0 to 5. The expected loss is
     gmXp.cushionTrustLoss read off gradeSeason's own change, never typed. Level 0 is today's number exactly; on a
     losing season every level is strictly gentler than the one below, on a winning one every level is the same.
     Control flatowner: the cushion not applied. */
  const ownDesk = (id, season, tier, k) => {
    let b = X.addXp(X.defaultGmXp(), 1e6);
    for (let i = 0; i < k; i++) b = X.spendGmPoint(b, 'ownership');
    return G.withGmBlock(G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, H.hostNewSeat(id, tier, season)), H.GM_HOST_KEYS.xp, b);
  };
  const O = { losing: 0, winning: 0, ladders: {} };
  for (const snap of FLEET) {
    const lg = snap.lg, season = lg.season, tiers = tiersOf(lg);
    for (const id of Object.keys(lg.teams).sort()) {
      const mandate = snap.mandates[id], outcome = d.outcome(lg, id, snap.rounds, snap.champion);
      const grade = FM.gradeSeason(mandate, outcome);
      for (const trust of [60, 16]) {
        const costs = [];
        for (let k = 0; k <= 5; k++) {
          const v = H.hostSeasonVerdict(d.host, lg, { team: id, mandate, trust, fired: false, outcome, desk: ownDesk(id, season, tiers.get(id), k), seasonsPlayed: 0, titles: 0 });
          const want = FM.applyMandateResult(trust, { ...grade, trustDelta: X.cushionTrustLoss(grade.trustDelta, k) });
          if (v.trust !== want.trust || v.fired !== want.fired) fail(`${id} ${grade.result} trust ${trust} level ${k}: the verdict reads ${v.trust}/${v.fired}, the cushion ${want.trust}/${want.fired}`);
          if (k === 0 && J([v.trust, v.fired]) !== J([FM.applyMandateResult(trust, grade).trust, FM.applyMandateResult(trust, grade).fired])) fail(`${id}: level 0 is not today's number`);
          costs.push(trust - v.trust);
        }
        if (trust !== 60) continue;
        if (grade.trustDelta < 0) {
          O.losing++;
          for (let k = 1; k <= 5; k++) if (!(costs[k] < costs[k - 1])) fail(`${id} ${grade.result}: level ${k} costs ${costs[k]}, level ${k - 1} cost ${costs[k - 1]}: not gentler`);
          O.ladders[grade.result] ??= costs.join(', ');
        } else {
          O.winning++;
          if (new Set(costs).size !== 1) fail(`${id} ${grade.result}: a winning season moves with Ownership (${costs.join(', ')})`);
        }
      }
    }
  }
  /* The worked example: a GM on trust 16 who misses is fired at level 0 and keeps the job at level 1. */
  {
    const snap = FLEET[0], lg = snap.lg, tiers = tiersOf(lg);
    const id = Object.keys(lg.teams).sort().find(x => FM.gradeSeason(snap.mandates[x], d.outcome(lg, x, snap.rounds, snap.champion)).result === 'missed');
    if (!id) fail('no missed season in the first league to walk the worked example on');
    else {
      const at = k => H.hostSeasonVerdict(d.host, lg, { team: id, mandate: snap.mandates[id], trust: 16, fired: false, outcome: d.outcome(lg, id, snap.rounds, snap.champion), desk: ownDesk(id, lg.season, tiers.get(id), k), seasonsPlayed: 0, titles: 0 });
      const v0 = at(0), v1 = at(1);
      ok(v0.fired === true && v1.fired === false && v1.trust === 1, `trust 16 and a missed season: level 0 ${v0.trust}/${v0.fired}, level 1 ${v1.trust}/${v1.fired}`);
      O.example = `trust 16, missed: level 0 fired (${v0.trust}), level 1 keeps the job on ${v1.trust}`;
    }
  }
  console.log(`   OWNERSHIP: ${O.losing} losing and ${O.winning} winning club seasons walked at levels 0 to 5; from trust 60 a season costs ${Object.entries(O.ladders).map(([r, c]) => `${r} ${c}`).join('; ')}; ${O.example ?? ''}`);
  ok(O.losing >= 100 && O.winning >= 100, `too few seasons walked (${O.losing} losing, ${O.winning} winning)`);
}

/* ================================================================== */
/* 3. Media, through the board's own call                               */
/* ================================================================== */
if (runs('3')) {
  begin('3', 'Media: every gamble lands exactly one step more often a level, the safe answers and the tilt never move, one draw an answer');
  /* The board's answerPress, read off its source with the comments out: one hostPressOption over hostXpEffects of
     its own desk, handed to applyGmPressChoice with ONE Math.random (control extradraw: the board draws twice). */
  const boardSrc = lf(overrides.get(path.resolve(FILES.board).toLowerCase()) ?? fs.readFileSync(FILES.board, 'utf8'));
  const from = boardSrc.indexOf('const answerPress = ');
  const body = from < 0 ? '' : boardSrc.slice(from, boardSrc.indexOf('\n  };', from));
  const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const count = s => code.split(s).length - 1;
  ok(count('Math.random') === 1 && count('hostPressOption(') === 1 && count("hostXpEffects(gm, 'nfl')") === 1 && count('applyGmPressChoice(') === 1,
    `the board's answerPress is not one eased option and one draw (${J({ random: count('Math.random'), option: count('hostPressOption('), effects: count("hostXpEffects(gm, 'nfl')") })})`);
  /* The same call over every presser the board can build, at every Media level, on a half step roll grid. */
  const deskWith = k => {
    let b = X.addXp(X.defaultGmXp(), 1e6);
    for (let i = 0; i < k; i++) b = X.spendGmPoint(b, 'media');
    return G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.xp, b);
  };
  const answer = (trust, opt, desk, rng) => FP.applyGmPressChoice(trust, H.hostPressOption(opt, H.hostXpEffects(desk, 'nfl')), rng);
  const base = { justHired: false, teamLabel: 'Kansas City Chiefs', fired: false, wonTitle: false, gradeResult: null, tradeLine: null, seasonsPlayed: 3 };
  const kinds = new Map();
  for (const f of [{ justHired: true }, { wonTitle: true, gradeResult: 'title' }, { gradeResult: 'missed' }, { gradeResult: 'badly' },
    { gradeResult: 'met', tradeLine: 'a deal for a pass rusher' }, { gradeResult: 'overachieved', tradeLine: 'a deal' }]) {
    const p = FP.buildGmPresser(NFL_WORDS, { ...base, ...f });
    if (p) kinds.set(p.id, p);
  }
  ok(kinds.size === 4, `the board builds ${kinds.size} kinds of presser, the press file names four`);
  const step = Math.round(X.GM_PRESS_ODDS_PER_POINT * 1000);
  const ladders = [];
  let gambles = 0, safes = 0;
  for (const p of kinds.values()) {
    for (const opt of p.options) {
      const lands = [], drawn = [], tilts = new Set(), trusts = new Set();
      for (let k = 0; k <= 5; k++) {
        const desk = deskWith(k);
        let landed = 0, draws = 0;
        for (let n = 0; n < 1000; n++) {
          const roll = (n + 0.5) / 1000;
          const res = answer(50, opt, desk, () => { draws++; return roll; });
          if (opt.effect.gamble && res.trust === Math.min(100, 50 + opt.effect.trust + opt.effect.gamble.gain)) landed++;
          tilts.add(res.tilt);
          if (!opt.effect.gamble) trusts.add(res.trust);
        }
        lands.push(landed); drawn.push(draws);
      }
      const at = `${p.id} "${opt.label}"`;
      ok(new Set(drawn).size === 1 && drawn[0] === (opt.effect.gamble ? 1000 : 0), `${at}: the draws an answer takes move with the level (${drawn.join(', ')})`);
      ok(tilts.size === 1, `${at}: the tilt moves with Media`);
      if (!opt.effect.gamble) {
        safes++;
        ok(trusts.size === 1 && H.hostPressOption(opt, H.hostXpEffects(deskWith(5), 'nfl')) === opt, `${at}: a safe answer moves with Media`);
        continue;
      }
      gambles++;
      ok(lands[0] === Math.round(opt.effect.gamble.odds * 1000), `${at}: level 0 lands ${lands[0]} of 1000, the odds say ${opt.effect.gamble.odds}`);
      for (let k = 1; k <= 5; k++) if (lands[k] - lands[k - 1] !== step) fail(`${at}: level ${k} lands ${lands[k]}, level ${k - 1} ${lands[k - 1]}: not ${step} more`);
      ladders.push(`${p.id.replace('gmPress', '')} ${lands.join('/')}`);
    }
  }
  console.log(`   ${kinds.size} pressers, ${gambles} gambles and ${safes} safe answers at levels 0 to 5; landed of 1000: ${ladders.join('; ')}`);
  ok(gambles >= 6 && safes >= 4, `too few answers walked (${gambles} gambles, ${safes} safe)`);
}

/* ================================================================== */
/* 8. The words                                                        */
/* ================================================================== */
const WORDS = [];
if (runs('8')) {
  begin('8', 'the words: never empty, no dash, no quote, no placeholder, no player\'s name, a closed line never says sit, every box fits');
  const careers = [['met'], ['badly'], ['missed', 'missed'], ['badly', 'badly', 'badly'], ['title', 'met', 'overachieved']];
  const pack = d.host.pack;
  const boxes = [];
  for (const snap of FLEET.filter(x => x.s === FLEET_SEASONS - 1)) {
    const lg = snap.lg, tiers = tiersOf(lg), season = lg.season;
    const names = new Set(Object.values(lg.teams).flatMap(t => [...t.players, ...(t.practice ?? [])].map(p => p.name)).concat(lg.freeAgents.map(p => p.name)));
    const say = (s, where) => WORDS.push([s, `${where} (seed ${snap.seed})`, names]);
    for (const id of Object.keys(lg.teams).sort()) {
      for (const grades of careers) for (const out of [0, 1, 2]) {
        let c = SEAT.newGmCareer(id, tiers.get(id), season - out - grades.length + 1);
        for (const g of grades) c = SEAT.recordSeatSeason(c, g);
        c = SEAT.endSeatStint(c, 'fired');
        for (let i = 0; i < out; i++) c = SEAT.sitOutYear(c);
        const seat = { v: 1, career: c, last: season - out };
        const m = H.hostMarket(d.host, lg, seat, label);
        const at = `${id} ${grades.join(',')} out ${out}`;
        say(m.line, `the market line, ${at}`);
        if (m.state === 'closed' && /\bsit\b/i.test(m.line)) fail(`${at}: a closed line says sit`);
        const tile = H.hostMarketTile(m);
        boxes.push([tile, `the Job market box, ${at}`]);
        const card = H.hostOutOfWorkCard(d.host, lg, seat, m, label);
        say(card.title, `the card title, ${at}`); card.lines.forEach(l => say(l, `the card, ${at}`));
        say(H.hostSitArmLine(m, true), `the stay out arm, ${at}`); say(H.hostSitArmLine(m, false), `the stay out arm, desk off, ${at}`);
        for (const o of m.offers) {
          say(o.reason, `an offer's reason, ${at}`); say(o.ask.text, `an offer's ask, ${at}`);
          say(H.hostTakeArmLine(pack, o, true), `the take arm, ${at}`); say(H.hostTakeArmLine(pack, o, false), `the take arm, desk off, ${at}`);
          if (m.facts[o.teamId]) say(H.hostOfferFactsLine(m.facts[o.teamId], 'cap'), `an offer's facts, ${at}`);
        }
        boxes.push([H.hostCareerTile(seat, label), `the Career box, ${at}`]);
        say(H.hostCareerTotalsLine(seat), `the career totals, ${at}`);
        for (const v of H.hostStintViews(seat, label)) { say(v.arrival, `a stint, ${at}`); say(v.ended, `a stint end, ${at}`); }
      }
      /* The Career box while he holds the seat, under the club's real name. */
      boxes.push([H.hostCareerTile(H.hostNewSeat(id, tiers.get(id), season), label), `the Career box held, ${id}`]);
      /* The arrival recap's line, the day he takes this club (control nameinline: a player's name put in it). */
      const arrival = H.hostArrivalLine(d.host, lg, { v: 1, career: SEAT.newGmCareer(id, tiers.get(id), season + 1) }, label);
      if (arrival === null) fail(`${id}: no arrival line on the day he takes the club`); else say(arrival, `the arrival line, ${id}`);
    }
    for (const deskOn of [true, false]) boxes.push([H.hostXpTile(null, D.NFL_XP_LIVE ?? [], deskOn), `the GM level box, desk ${deskOn ? 'on' : 'off'}`]);
  }
  for (const l of [...H.hostMarketHelp(d.host.pack), ...H.hostCareerHelp(d.host.pack), ...H.hostXpHelp(), H.hostEarnsLine(D.NFL_XP_SOURCES ?? [])]) WORDS.push([l, 'a help line', new Set()]);
  for (const l of RECAP_LINES) WORDS.push([l, 'the recap XP line', new Set()]);
  const NOT_ALLOWED = [[String.fromCharCode(0x2013), 'an en dash'], [String.fromCharCode(0x2014), 'an em dash'], ['"', 'a quote mark'],
    [String.fromCharCode(0x201c), 'a quote mark'], [String.fromCharCode(0x201d), 'a quote mark']];
  const RAW = /[{}]|undefined|NaN|\bnull\b|\[object/;
  for (const [s, where, names] of WORDS) {
    if (typeof s !== 'string' || !s.trim()) { fail(`an empty string on ${where}`); continue; }
    for (const [ch, what] of NOT_ALLOWED) if (s.includes(ch)) fail(`${what} on ${where}: ${s.slice(0, 80)}`);
    if (RAW.test(s)) fail(`an unfilled value on ${where}: ${s.slice(0, 80)}`);
    for (const n of names) if (n && s.includes(n)) { fail(`a player's name (${n}) on ${where}: ${s.slice(0, 80)}`); break; }
  }
  for (const [t, where] of boxes) {
    if (!t) continue;
    if (!t.value || !t.sub) fail(`an empty box on ${where}`);
    if (t.value.length > H.HOST_TILE_VALUE_MAX || t.sub.length > H.HOST_TILE_SUB_MAX) fail(`${where} outgrows its box: ${t.value} / ${t.sub}`);
  }
  console.log(`   ${WORDS.length} strings and ${boxes.length} boxes read over ${FLEET_SEEDS.length} leagues, every roster name checked`);
}

/* ================================================================== */
/* 4. The market after real firings                                    */
/* ================================================================== */
const S4_SEEDS = (process.env.SIM_GM_CAREER_MEASURE_SEEDS || '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20').split(',').map(Number);
const S4_SEASONS = Number(process.env.SIM_GM_CAREER_MEASURE_SEASONS || 12);
const S4 = {
  firings: 0, first: { offers: 0, quiet: 0, closed: 0 }, raw: { offers: 0, quiet: 0, closed: 0 },
  lastCalls: 0, rawLastCalls: 0, firstCalls: 0, eligible: 0, hired3: 0, rawHired3: 0, feedsRead: 0, asserted: 0, badly: 0,
};
const S5 = { takes: 0, follows: 0, planted: 0, refused: 0 };
const clone = v => JSON.parse(J(v));
/** The league as a take must leave it: the old club's saved depth chart is the one thing allowed to go. */
const withoutDepth = (lg, team) => { const c = clone(lg); if (c.teams[team]) delete c.teams[team].depth; return J(c); };
const pickCount = lg => Object.values(lg.teams).reduce((n, t) => n + t.picks.length, 0);

/* ================================================================== */
/* 5. Taking a seat, on every fired GM of section 4 and every offer     */
/* ================================================================== */
/**
 * Every offer of his first feed is taken on a copy of the league the moment he is fired (the board's takeSeat
 * hands nflTakeSeat a copy). The desk is the one the board would hold: Round 1019's three blocks opened on his old
 * club, his record and his XP. A saved depth chart is planted on the old club first, so its reset can be seen.
 * With the two clubs' contracts and staff blocks set aside and the old club's depth taken out, the league and the
 * desk are byte equal before and after; the six SeatSave fields are takeSeat's; the new ledger and staff are the
 * new club's fresh ones. The first offer is then followed through his new club's draft and summer: he is arriving
 * until the summer has run, and the ask he is graded on is the offer's.
 */
function takeChecks(lgAtFiring, old, g, seat, m0, salt) {
  const prev = check;
  check = '5';
  /* The depth chart he saved is part of the league the market reads (a chart moves the club's strength), so the
     feed he chooses from is read on the league with it, as the board reads it. */
  const planted = clone(lgAtFiring);
  const pt = planted.teams[old];
  const qbs = pt.players.filter(p => p.pos === 'QB');
  const hasChart = qbs.length >= 2 && E.swapDepth(pt, 'QB', qbs[0].id, qbs[1].id) && !!pt.depth;
  const m = H.hostMarket(d.host, planted, seat, label) ?? m0;
  for (const [k, offer] of m.offers.entries()) {
    const lg = clone(planted);
    if (hasChart) S5.planted++;
    let desk = D.openNflDesk(lg, old);
    D.syncNflPicks(lg, D.nflPicksOf(desk, lg));
    desk = G.withGmBlock(desk, H.GM_HOST_KEYS.seat, g.desk.blocks.seat);
    if (g.desk.blocks.xp !== undefined) desk = G.withGmBlock(desk, H.GM_HOST_KEYS.xp, g.desk.blocks.xp);
    const save = { myTeam: old, trust: g.trust, fired: true, mandate: g.mandate, pressTilt: 1, seasonTradeLine: 'a deal' };
    const legacy = H.hostLegacy(d.host, lg, { team: old, seasonsPlayed: g.seasonsPlayed, titles: g.titles, fired: true, seasonCounted: true });
    const at = `${old} to ${offer.teamId} (${salt})`;
    const lgBefore = withoutDepth(lg, old), picksBefore = pickCount(lg), deskBefore = J(desk);
    /* The new club's own blocks, opened on the league as the take reads it (before the old chart goes back). */
    const fresh = D.openNflDesk(clone(lg), offer.teamId);
    const r = D.nflTakeSeat(lg, desk, save, legacy, offer.teamId, label);
    if (!r) { S5.refused++; fail(`${at}: an offer on the table was refused`); continue; }
    S5.takes++;
    ok(J(desk) === deskBefore, `${at}: the desk handed in was changed`);
    ok(withoutDepth(lg, old) === lgBefore, `${at}: taking the seat moved the league (a roster, a pick, a standing)`);
    ok(lg.teams[old].depth === undefined, `${at}: his old club kept the depth chart he saved`);
    ok(pickCount(lg) === picksBefore && J(r.desk.blocks.picks) === J(desk.blocks.picks), `${at}: picks were not conserved`);
    ok(J(r.desk.blocks.xp) === J(desk.blocks.xp), `${at}: his XP moved`);
    ok(J(r.save) === J(SEAT.takeSeat(save, offer)) && r.save.myTeam === offer.teamId && r.save.trust === FM.FO_TRUST_START
      && r.save.fired === false && J(r.save.mandate) === J(offer.ask), `${at}: the save's six fields are not takeSeat's`);
    ok(J(r.desk.blocks.contracts) === J(fresh.blocks.contracts), `${at}: the re-sign ledger is not the new club's own`);
    ok(J(r.desk.blocks.staff) === J(fresh.blocks.staff), `${at}: the staff is not the new club's own`);
    const ns = r.desk.blocks.seat, st = SEAT.currentStint(ns.career), before = ns.career.stints.at(-2);
    ok(H.isGmSeatBlock(ns) && st.team === offer.teamId && st.from === lg.season + 1 && !st.ended && before && before.ended === 'fired',
      `${at}: the new stint is not open from ${lg.season + 1} with the old one ended fired`);
    const extra = Object.keys(r.desk.blocks).filter(key => ![...DESK_KEYS, ...GAINED_KEYS].includes(key));
    ok(extra.length === 0, `${at}: the move wrote ${J(extra)}`);
    if (k !== 0) continue;
    /* The first offer, followed through his new club's draft and summer, as the board runs them. */
    S5.follows++;
    const rng = mulberry32(5000 + salt);
    let deskF = r.desk;
    ok(H.hostArriving(deskF.blocks.seat, lg.season), `${at}: the arrival recap does not read as an arrival`);
    deskF = d.draft(lg, offer.teamId, rng, deskF);
    ok(H.hostArriving(deskF.blocks.seat, lg.season), `${at}: the draft ended the arrival`);
    deskF = d.summer(lg, offer.teamId, rng, deskF);
    const champion = lg.champions.find(c => c.season === lg.season - 1)?.team ?? null;
    const mandate = H.hostSummerMandate(r.save.mandate, d.mandateFor(lg, offer.teamId, champion === offer.teamId, 0), lg.season);
    ok(J(mandate) === J(offer.ask), `${at}: the ask after the summer is not the one he was shown`);
    ok(!H.hostArriving(deskF.blocks.seat, lg.season), `${at}: still arriving once the summer has run`);
  }
  check = prev;
}
/** The feed without any rule the host adds on top: gmSeat's own offers, keyed as the host keys them. */
function rawMarket(host, lg, seat) {
  const season = host.season(lg);
  const teams = H.hostSeatTeams(host, lg, label);
  const offers = SEAT.seatOffers(host.pack, teams, seat.career, season + 1, K.keyedRng(H.hostFeedKey(host.sport, seat, season)), host.champion(lg, season));
  const { nextYear } = H.hostNextYear(seat, SEAT.leagueTiers(teams));
  return { offers, nextYear, state: offers.length > 0 ? 'offers' : nextYear === 'shut' ? 'closed' : 'quiet' };
}
const sitOut = seat => ({ ...seat, career: SEAT.sitOutYear(seat.career) });
if (runs('4') || runs('5')) {
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
        /* ASSERTED: the club that let him go never calls, nothing above the second tier straight after a 'badly'
           season, every ask is for the season he would first be graded in, and the feed is the same on a second
           read and after a reload (controls firedclub, unkeyed). */
        if (runs('4')) {
          const at = `seed ${seed} season ${s + 1} ${id}`;
          S4.asserted++;
          ok(!m.offers.some(o => o.teamId === id), `${at}: the club that fired him is in his feed`);
          const lastGrade = SEAT.currentStint(seat.career).grades.at(-1);
          if (lastGrade === 'badly') { S4.badly++; ok(m.offers.every(o => o.tier >= 2), `${at}: a top tier club called straight after a badly season`); }
          ok(m.offers.every(o => o.ask.season === lg.season + 1) && m.season === lg.season + 1, `${at}: an ask is not for ${lg.season + 1}`);
          ok(J(H.hostMarket(host, lg, seat, label)) === J(m), `${at}: a second read of the feed is not the first`);
          ok(J(H.hostMarket(host, JSON.parse(J(lg)), JSON.parse(J(seat)), label)) === J(m), `${at}: the feed after a reload is not the feed before it`);
        }
        if (runs('5')) takeChecks(lg, id, g, seat, m, seed * 100 + s);
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
  if (runs('4')) {
    console.log(`   ASSERTED on ${S4.asserted} first feeds (${S4.badly} straight after a badly season): never the club that fired him, no top tier after badly, every ask for next season, keyed`);
    ok(S4.asserted >= 300 && S4.badly >= 200, `only ${S4.asserted} feeds (${S4.badly} after badly) asserted, too few to hold the rules`);
  }
  if (runs('5')) {
    check = '5';
    console.log(`5) taking a seat: ${S5.takes} offers taken (${S5.planted} with a planted depth chart), ${S5.follows} followed through the draft and the summer, ${S5.refused} refused`);
    ok(S5.takes >= 400 && S5.follows >= 300 && S5.planted >= 0.9 * S5.takes, `too few seats taken (${S5.takes}, ${S5.follows} followed, ${S5.planted} planted)`);
  }
}

/* ================================================================== */
/* 6. A season out, through the board's own away host                   */
/* ================================================================== */
const S6_SEEDS = (process.env.SIM_GM_CAREER_AWAY_SEEDS || '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20').split(',').map(Number);
const S6_YEARS = 3;
/* MEASURED 2026-10-22 on a GitHub runner (r1533-s4b, head 8a1fdbcb), three seed sets of twenty, three years out each:
     seeds  1-20: drafted men on the other 31 clubs away 1066, idle GM 1080, ratio 0.987; mean roster 52.25 vs 52.23
     seeds 21-40: away 1059, idle GM 1080, ratio 0.981; mean roster 52.26 vs 52.25
     seeds 41-60: away 1064, idle GM 1080, ratio 0.985; mean roster 52.26 vs 52.25
   The idle GM's rivals take exactly 18 a season (three batches of six), so 1080 is a ceiling the away path cannot
   pass (its old club picks among them): the band's top is that ceiling, its floor sits well under the lowest of
   the three. noawaydraft measured ratio 0.000 and a roster 0.19 short. */
const S6_BAND = { draft: [0.95, 1.01], roster: [-0.1, 0.1] };
const S6 = {
  years: 0, stopped: 0, over: 0, minted: 0, inSeat: 0, closed: 0, lastCall: 0, shadows: 0,
  away: { drafted: 0, rosters: 0, clubSummers: 0 }, base: { drafted: 0, rosters: 0, clubSummers: 0 },
};
const rosterIds = (lg, skip) => new Set(Object.entries(lg.teams).filter(([a]) => a !== skip).flatMap(([, t]) => [...t.players, ...(t.practice ?? [])].map(p => p.id)));
const everyId = lg => { const s = rosterIds(lg, null); for (const p of lg.freeAgents) s.add(p.id); return s; };
const firedSeatFor = (team, tier, season, grades, out = 0) => {
  let c = SEAT.newGmCareer(team, tier, season - out - grades.length + 1);
  for (const gr of grades) c = SEAT.recordSeatSeason(c, gr);
  c = SEAT.endSeatStint(c, 'fired');
  for (let i = 0; i < out; i++) c = SEAT.sitOutYear(c);
  return { v: 1, career: c, last: season - out };
};
/** Every club's pick in every round of every year carried exists exactly once, and every engine list is the ledger's (simNflGmDesk check 4). */
function picksHold(lg, desk, at) {
  const ledger = desk.blocks[D.NFL_DESK_KEYS.picks], ids = Object.keys(lg.teams), rules = D.nflGamePickRules();
  if (!P.validateLedger(ledger, ids, rules)) { fail(`${at}: the stored pick ledger does not validate`); return; }
  for (const p of P.ledgerProblems(ledger, ids, lg.season, rules)) fail(`${at}: ${p}`);
  for (const [abbr, t] of Object.entries(lg.teams)) {
    const held = P.picksHeldBy(ledger, abbr, lg.season).map(p => p.round).sort((a, b) => a - b);
    if (J(held) !== J([...t.picks].sort((a, b) => a - b))) fail(`${at}: ${abbr}'s engine list is not the ledger's`);
  }
}
if (runs('6')) {
  begin('6', 'a season out: the league plays a whole season without him, his record gains a year out and nothing else, and refusals touch nothing');
  const host = d.host, team = d.team;
  for (const seed of S6_SEEDS) {
    const rng0 = mulberry32(6000 + seed);
    const lg0 = d.newLeague(rng0, team);
    d.cut(lg0, team);
    d.season(lg0, team, rng0, d.openDesk(lg0, team));
    const tiers = tiersOf(lg0);
    const legacyOf = (lg, old, fired = true) => H.hostLegacy(host, lg, { team: old, seasonsPlayed: 3, titles: 0, fired, seasonCounted: false });
    /* The refusals, each on a copy that must come back byte equal: in a seat, a closed market, a last call. */
    const refuse = (seat, old, why) => {
      const lg = clone(lg0), before = J(lg);
      const desk = G.withGmBlock(D.openNflDesk(lg, old), H.GM_HOST_KEYS.seat, seat);
      const r = H.hostSeasonAway({ host, away: D.nflAwayHost(old), league: lg, desk, legacy: legacyOf(lg, old, why !== 'in-seat'), rng: mulberry32(seed) });
      ok(r.ok === false && r.reason === why && J(lg) === before, `seed ${seed} ${old}: a year out that must be refused (${why}) was not, or moved the league (${r.ok === false ? r.reason : 'played'})`);
    };
    refuse(H.hostNewSeat(team, tiers.get(team), lg0.season), team, 'in-seat'); S6.inSeat++;
    let closed = null, last = null;
    for (const id of Object.keys(lg0.teams).sort()) {
      for (const grades of [['badly', 'badly', 'badly'], ['missed', 'badly'], ['badly'], ['missed', 'missed']]) {
        for (const out of [0, 1, 2]) {
          const seat = firedSeatFor(id, tiers.get(id), lg0.season, grades, out), m = H.hostMarket(host, lg0, seat, label);
          if (!closed && m.state === 'closed') closed = [seat, id];
          if (!last && m.state === 'offers' && m.nextYear === 'shut') last = [seat, id];
        }
      }
      if (closed && last) break;
    }
    if (closed) { refuse(closed[0], closed[1], 'market-closed'); S6.closed++; }
    if (last) { refuse(last[0], last[1], 'last-call'); S6.lastCall++; }

    /* The away path: fired at the close of the season he ran, with a record good enough that next year stays open. */
    const lgA = clone(lg0);
    let desk = G.withGmBlock(D.openNflDesk(lgA, team), H.GM_HOST_KEYS.seat, firedSeatFor(team, tiers.get(team), lg0.season, ['overachieved', 'met', 'missed']));
    desk = G.withGmBlock(desk, H.GM_HOST_KEYS.xp, X.addXp(X.defaultGmXp(), 777));
    D.syncNflPicks(lgA, D.nflPicksOf(desk, lgA));
    const xpBefore = J(desk.blocks.xp), clubBlocks = J([desk.blocks.contracts, desk.blocks.staff]);
    const totalsBefore = J(SEAT.careerTotals(desk.blocks.seat.career));
    const rngA = mulberry32(7000 + seed), drafted = new Set();
    let years = 0;
    for (let y = 0; y < S6_YEARS; y++) {
      const at = `seed ${seed} year out ${y + 1}`;
      const away = D.nflAwayHost(team);
      const noneMinted = (step, b, lg) => { for (const id of everyId(lg)) if (!b.has(id)) { S6.minted++; fail(`${at}: ${step} minted a player`); break; } };
      const wrapped = {
        awayDraft(lg, r, dk) { const b = rosterIds(lg, null); const out = away.awayDraft(lg, r, dk); for (const id of rosterIds(lg, null)) if (!b.has(id)) drafted.add(id); return out; },
        awaySummer(lg, r, dk) {
          /* The summer with nobody in the chair is the engine's offseason with NO user club, then the ledger rolled:
             replayed on a copy with the same draws, it must be the league the away host left (control notrim: the
             old club named as the user club, so the CPU neither cuts nor tags it). */
          const shadow = clone(lg), draws = [];
          const before = D.nflPicksOf(dk, shadow), closed = shadow.season, ids = Object.keys(shadow.teams);
          const out = away.awaySummer(lg, () => { const x = r(); draws.push(x); return x; }, dk);
          let i = 0;
          E.runOffseason(shadow, () => (i < draws.length ? draws[i++] : NaN));
          D.syncNflPicks(shadow, P.rollLedger(before, ids, closed, D.nflGamePickRules()));
          S6.shadows++;
          const noIds = v => JSON.stringify(v, (key, x) => (key === 'id' ? undefined : x)); /* the restock mints ids from a counter the copy has moved on */
          if (i !== draws.length || noIds(shadow) !== noIds(lg)) fail(`${at}: the away summer is not the engine's offseason with no user club (${i} of ${draws.length} draws replayed)`);
          for (const [abbr, t] of Object.entries(lg.teams)) {
            if (E.deepOverLimit(t) > 0) { S6.over++; fail(`${at}: ${abbr} is over the roster limit after the summer`); }
            if (abbr !== team) { S6.away.rosters += t.players.length; S6.away.clubSummers++; }
          }
          return out;
        },
        periods: lg => away.periods(lg),
        playRound(lg, r, dk) { const b = everyId(lg); const out = away.playRound(lg, r, dk); noneMinted('a week', b, lg); return out; },
        playoffs(lg, r, dk) { const b = everyId(lg); const out = away.playoffs(lg, r, dk); noneMinted('the playoffs', b, lg); return out; },
      };
      const season = lgA.season, champs = lgA.champions.length;
      const r = H.hostSeasonAway({ host, away: wrapped, league: lgA, desk, legacy: legacyOf(lgA, team), rng: rngA });
      if (r.ok === false) { if (y === 0) fail(`${at}: the first year out was refused (${r.reason})`); S6.stopped++; break; }
      years++; S6.years++;
      ok(lgA.season === season + 1 && lgA.champions.length === champs + 1 && new Set(lgA.champions.map(c => c.season)).size === lgA.champions.length,
        `${at}: not one more decided season with one champion`);
      ok(Object.values(lgA.teams).every(t => t.wins + t.losses === E.REGULAR_WEEKS), `${at}: a club did not play ${E.REGULAR_WEEKS} games`);
      const seat = r.desk.blocks.seat;
      ok(H.isGmSeatBlock(seat) && seat.career.seasonsOut === y + 1 && J(SEAT.careerTotals(seat.career)) === totalsBefore, `${at}: the record moved beyond one more year out`);
      ok(J(r.desk.blocks.xp) === xpBefore, `${at}: his XP moved in a year out`);
      ok(J([r.desk.blocks.contracts, r.desk.blocks.staff]) === clubBlocks, `${at}: the old club's ledger or staff moved`);
      picksHold(lgA, r.desk, at);
      desk = r.desk;
    }
    S6.away.drafted += [...rosterIds(lgA, team)].filter(id => drafted.has(id)).length;

    /* The baseline: the same league with an idle GM in the old club's chair, the board's calls with him as the user. */
    const lgB = clone(lg0), rngB = mulberry32(7000 + seed), draftedB = new Set();
    let deskB = D.openNflDesk(lgB, team);
    for (let y = 0; y < years; y++) {
      const b = rosterIds(lgB, null);
      deskB = d.draft(lgB, team, rngB, deskB);
      for (const id of rosterIds(lgB, null)) if (!b.has(id)) draftedB.add(id);
      deskB = d.summer(lgB, team, rngB, deskB);
      d.cut(lgB, team);
      for (const [abbr, t] of Object.entries(lgB.teams)) if (abbr !== team) { S6.base.rosters += t.players.length; S6.base.clubSummers++; }
      deskB = d.season(lgB, team, rngB, deskB).desk;
    }
    S6.base.drafted += [...rosterIds(lgB, team)].filter(id => draftedB.has(id)).length;
  }
  const draftRatio = S6.away.drafted / Math.max(1, S6.base.drafted);
  const rosterA = S6.away.rosters / Math.max(1, S6.away.clubSummers), rosterB = S6.base.rosters / Math.max(1, S6.base.clubSummers);
  console.log(`   ${S6.years} years out over ${S6_SEEDS.length} seeds (${S6.stopped} stopped early); refusals: ${S6.inSeat} in a seat, ${S6.closed} closed, ${S6.lastCall} last calls`);
  console.log(`   drafted men on the other clubs' rosters after the years out: away ${S6.away.drafted}, idle GM ${S6.base.drafted} (ratio ${draftRatio.toFixed(3)}); mean roster after a summer: away ${rosterA.toFixed(2)}, idle GM ${rosterB.toFixed(2)}`);
  ok(S6.years >= 0.9 * S6_SEEDS.length * S6_YEARS && S6.shadows === S6.years, `only ${S6.years} years out played (${S6.shadows} summers replayed)`);
  ok(S6.closed >= 1 && S6.lastCall >= 1, `no closed market or no last call found to refuse (${S6.closed}, ${S6.lastCall})`);
  ok(draftRatio >= S6_BAND.draft[0] && draftRatio <= S6_BAND.draft[1], `the away draft put ${draftRatio.toFixed(3)} of the idle GM baseline's draftees on the other clubs, band ${J(S6_BAND.draft)}`);
  ok(rosterA - rosterB >= S6_BAND.roster[0] && rosterA - rosterB <= S6_BAND.roster[1], `the mean roster after an away summer differs from the baseline by ${(rosterA - rosterB).toFixed(2)}, band ${J(S6_BAND.roster)}`);
}

/* ================================================================== */
/* 7. Whole careers: fired every third season, then a take or a year out */
/* ================================================================== */
const S7_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const S7_SEASONS = 12;
const TITLE_ASK = season => ({ tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season });
if (runs('7')) {
  begin('7', 'whole careers: the save, the record and the counters agree at every step across firings, takes and years out');
  const host = d.host;
  const S7 = { checks: 0, forced: 0, firings: 0, takes: 0, sits: 0, closed: 0, seasons: 0 };
  for (const seed of S7_SEEDS) {
    const rng = mulberry32(8000 + seed);
    const lg = d.newLeague(rng, d.team);
    d.cut(lg, d.team);
    let desk = G.withGmBlock(d.openDesk(lg, d.team), H.GM_HOST_KEYS.seat, H.hostNewSeat(d.team, tiersOf(lg).get(d.team), lg.season));
    const save = {
      league: lg, myTeam: d.team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
      mandate: d.mandateFor(lg, d.team, false), trust: FM.FO_TRUST_START, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null,
    };
    const point = where => {
      S7.checks++;
      const at = `seed ${seed} ${where} (${lg.season})`;
      ok(isFrontOfficeSave({ ...save, gm: desk }, 'NFL', E.REGULAR_WEEKS), `${at}: the save does not pass isFrontOfficeSave`);
      const b = desk.blocks[H.GM_HOST_KEYS.seat];
      if (!H.isGmSeatBlock(b)) { fail(`${at}: the seat block is not sound`); return; }
      const cur = SEAT.currentStint(b.career);
      ok(cur.team === save.myTeam && (cur.ended !== undefined) === save.fired, `${at}: the record does not fit the save`);
      const st = b.career.stints;
      for (let i = 1; i < st.length; i++) ok(st[i - 1].from + st[i - 1].grades.length <= st[i].from, `${at}: stint ${i + 1} overlaps the one before it`);
      const tot = SEAT.careerTotals(b.career);
      ok(tot.seasons + (b.before?.seasons ?? 0) === save.seasonsPlayed, `${at}: the record holds ${tot.seasons} seasons, the save ${save.seasonsPlayed}`);
      ok(tot.titles === save.titles, `${at}: the record holds ${tot.titles} titles, the save ${save.titles}`);
    };
    const summer = () => {
      const champion = save.postseason?.champion ?? null;
      desk = d.draft(lg, save.myTeam, rng, desk);
      desk = d.summer(lg, save.myTeam, rng, desk);
      save.mandate = H.hostSummerMandate(save.mandate, d.mandateFor(lg, save.myTeam, champion === save.myTeam, 0), lg.season);
      d.cut(lg, save.myTeam);
      save.phase = 'hub'; save.postseason = null;
    };
    point('start');
    for (let s = 0; s < S7_SEASONS; s++) {
      if (!save.fired) {
        if (s % 3 === 2) { save.trust = 5; save.mandate = TITLE_ASK(lg.season); S7.forced++; }
        const r = d.season(lg, save.myTeam, rng, desk);
        desk = r.desk;
        const v = H.hostSeasonVerdict(host, lg, {
          team: save.myTeam, mandate: save.mandate, trust: save.trust, fired: false,
          outcome: d.outcome(lg, save.myTeam, r.rounds, r.champion), desk, seasonsPlayed: save.seasonsPlayed, titles: save.titles,
        });
        desk = v.desk; save.trust = v.trust; save.fired = v.fired;
        save.titles += r.champion === save.myTeam ? 1 : 0; save.seasonsPlayed += 1; S7.seasons++;
        save.postseason = { rounds: r.rounds, champion: r.champion, gradeLine: v.grade?.verdict ?? null };
        save.phase = v.fired ? 'fired' : 'recap';
        point('close');
        if (!v.fired) { summer(); point('summer'); continue; }
        S7.firings++;
      }
      const legacy = H.hostLegacy(host, lg, { team: save.myTeam, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: true, seasonCounted: D.nflSeasonCounted('fired', desk) });
      const m = H.hostMarket(host, lg, H.hostSeatOf(desk, legacy), label);
      if (m.offers.length > 0 && ((seed + s) % 2 === 0 || !H.hostCanSitOut(m))) {
        const r = D.nflTakeSeat(lg, desk, { myTeam: save.myTeam, trust: save.trust, fired: true, mandate: save.mandate, pressTilt: save.pressTilt, seasonTradeLine: save.seasonTradeLine }, legacy, m.offers[0].teamId, label);
        if (!r) { fail(`seed ${seed}: an offer on the table was refused`); break; }
        Object.assign(save, r.save, { phase: 'recap' });
        save.postseason = { ...save.postseason, gradeLine: null };
        desk = r.desk; S7.takes++;
        point('take');
        summer();
        point('summer after a take');
      } else if (H.hostCanSitOut(m)) {
        const r = H.hostSeasonAway({ host, away: D.nflAwayHost(save.myTeam), league: lg, desk, legacy, rng });
        if (r.ok === false) { fail(`seed ${seed}: a year out on offer was refused (${r.reason})`); break; }
        desk = r.desk; S7.sits++;
        save.postseason = { rounds: [], champion: r.report.champion, gradeLine: null };
        point('year out');
      } else { S7.closed++; break; }
    }
  }
  console.log(`   ${S7_SEEDS.length} careers, ${S7.seasons} seasons run: ${S7.forced} sackings forced, ${S7.firings} firings, ${S7.takes} seats taken, ${S7.sits} years out, ${S7.closed} closed for good; ${S7.checks} checkpoints`);
  ok(S7.firings >= 12 && S7.takes >= 5 && S7.sits >= 10, `too few firings (${S7.firings}), takes (${S7.takes}) or years out (${S7.sits}) to hold a career`);
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

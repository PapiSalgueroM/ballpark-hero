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
 *   overlap, firedlost, hubcounted (7)
 * Exit 0 green, 1 red (or a control fired), 2 could not run, 3 a control did not fire.
 *
 * MEASURED 2026-10-22 on GitHub runners (r1533-s4b, head 8a1fdbcb), the floors set near 70 percent of each:
 *   section 4: 475 first feeds asserted, 311 straight after a badly season (floors 300, 200)
 *   section 5: 493 offers in the first feeds, 475 firings followed (floors 400, 300)
 *   section 6: 60 years out on each of three seed sets; bands beside S6_BAND
 *   section 7: 17 firings, 8 seats taken, 17 years out, 9 closed (8a1fdbcb); 21, 14, 15, 6 (37876c81: the id counter
 *              moves with the sections before it) (floors 12, 5, 10)
 *   controls: firedclub 2, unkeyed 580, staffrides 503, ledgerrides 505, rostermove 934, depthstays 503,
 *   askrebuilt 326, halfseason 60, awayxp 60, lastcall 20, noawaydraft 1, overlap 55, firedlost 27,
 *   nameinline 128 failures. notrim did not fire on the roster limit alone (the old club never passed 53), so
 *   section 6 replays every away summer against the engine's offseason with no user club, which it must equal.
 *
 * ROUND 1559 (the dark half of the GM career on the other boards): the DRIVE
 * table gains the 'nhl' row (SIM_GM_CAREER_SPORT=nhl), its section 1 recorded
 * from 115c68092 (digest 838cdddf); sections 2 to 8 read every sport's name
 * through the row; 2t holds the guide's rule of thumb (Round 1533's finding 8);
 * 9 holds the bands seed by seed (S9_BANDS, calibrated beside them) and 10 the
 * lift (the shared bind, season counted rule and retained step equal the NFL
 * copies they came from). The nhl row reads forty leagues in 4, 5, 9 and 10
 * (measureSeeds). Controls added: contribstays (5), awaycontrib, retainedrolled
 * (6), thumbfalse (2t), firenever, nooffers, xpflat, nevershut (9), legacyleak,
 * retainedlift (10); the NFL's own (staffrides ... noawaydraft) are re-aimed at
 * the nhl row's own lines. The fired counts of every control on both rows are
 * in Round 1559's report (results-g/finish-1559.md) and docs/audits.
 *
 * ROUND 1559 FIX PASS (the two adversarial reviews, results-g/review-run-1559.md and review-read-1559.md):
 *   section 6 on the nhl row runs every summer out a second time on a probe copy whose old club is planted over
 *   the roster limit (the row's plantOverLimit) and asserts the trim reaches it; control namedsummer (the summer
 *   names the old club, so the engine skips it) must fire there. Before this the nhl row's check held vacuously for the old club: it never
 *   stood over 15 at the trim in 360 years out (r1559-run-b, r1559-run-d2).
 *   section 6 on both rows replays every round out on a copy with the same draws against the row's own statement
 *   of the board's round with nobody in the chair (awayRound), as the summer was already replayed; control
 *   awaymoves (the rivals' in season moves dropped) must fire there. Before this nothing held those moves: the
 *   mean roster moved (12.52 against 12.66) and is printed, not asserted (review minor 2).
 *   section 6 on both rows replays every draft out the same way (awayDraftReplay, ids aside); control oldskip (the
 *   old club left out of the draft) must fire there. The draft ratio reads the other clubs only, so it could not
 *   see that; the old club's own draftees are printed, not asserted: on the NHL 2, 0, 6 and 4 over the four seed
 *   sets of sixty years out, too few to hold a floor that is not a coin toss (r1559-fx2; the NFL 11, 15, 21).
 *   section 5 on the nhl row plants a retained salary row on the desk before every take and asserts the rows stay
 *   the league's; control retainedclub (the rows made the club's) must fire (review minor 3).
 *   section 10's bind cases gain controls syncalways and refusedrelease in gmCareerBind.ts (review minor 6).
 *
 * CONTROL COUNTS ARE NOT FIXTURES (review minor 4). The green run is deterministic to the digit, but a control's
 * failure count is not: nhl notrim failed 105 times in r1559-f1 and 110 in r1559-run-a on the same src. Read a
 * control by its exit code and its "(FIRED)" line, never by matching a count; the counts in the header and the
 * audit notes are what one run printed.
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
/* Round 1559: a DRIVE row whose career is not bound yet runs section 1 alone (set once the row is chosen). */
let ROW_BOUND = true;
const runs = id => (ONLY.length === 0 || ONLY.includes(id)) && (ROW_BOUND || id === '1');
const CONTROLS = {
  epoch: '1', addkey: '1', deskoffblock: '2', paytwice: '2', lateseat: '2', emptytile: '8', nameinline: '8',
  flatowner: '2', flatmedia: '3', extradraw: '3', firedclub: '4', unkeyed: '4', staffrides: '5', ledgerrides: '5', rostermove: '5', depthstays: '5', askrebuilt: '5',
  halfseason: '6', notrim: '6', awayxp: '6', lastcall: '6', noawaydraft: '6', overlap: '7', firedlost: '7', hubcounted: '7',
  /* Round 1559 */
  contribstays: '5', awaycontrib: '6', retainedrolled: '6', thumbfalse: '2t',
  firenever: '9', nooffers: '9', xpflat: '9', nevershut: '9', legacyleak: '10', retainedlift: '10',
  /* Round 1559 fix pass (the adversarial reviews) */
  namedsummer: '6', awaymoves: '6', oldskip: '6', retainedclub: '5', syncalways: '10', refusedrelease: '10',
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
  /* Round 1550: the hub boxes and the record reader moved here word for word */
  face: path.join(ROOT, 'src', 'lib', 'gmCareerFace.ts'),
  desk: path.join(ROOT, 'src', 'lib', 'nflGmDesk.ts'),
  /* Round 1550: nflTakeSeat and nflLegacy moved here word for word (the board fetches them with the career kit) */
  career: path.join(ROOT, 'src', 'lib', 'nflGmCareer.ts'),
  /* Round 1559: the take and the legacy read are every sport's, the NFL's facts handed in through nflCareer() */
  bind: path.join(ROOT, 'src', 'lib', 'gmCareerBind.ts'),
  /* Round 1559: the NHL row's own career file (its facts for the bind, its year out) */
  nhlCareer: path.join(ROOT, 'src', 'lib', 'nhlGmCareer.ts'),
  trade: path.join(ROOT, 'src', 'lib', 'gmTradePackage.ts'),
  seat: path.join(ROOT, 'src', 'lib', 'gmSeat.ts'),
  board: path.join(ROOT, 'src', 'components', 'front-office', 'FrontOfficeBoard.tsx'),
  /* Round 1561: the NHL board, bound to the career (its press through hostPressOption) */
  nhlBoard: path.join(ROOT, 'src', 'components', 'nhl-front-office', 'NhlFrontOfficeBoard.tsx'),
};
const EDITS = {
  addkey: ['host', '  next = withGmBlock(next, GM_HOST_KEYS.xp, nextXp);\n',
    "  next = withGmBlock(next, GM_HOST_KEYS.xp, nextXp);\n  next = withGmBlock(next, 'extra', 1);\n"],
  deskoffblock: ['host', '  if (!i.desk) return out;', '  if (!i.desk) return { ...out, desk: { v: 1, blocks: { seat: 1 } } };'],
  paytwice: ['host', '  if (seat.last !== undefined && f.season <= seat.last) return same;', '  if (false) return same;'],
  lateseat: ['host', 'titles: i.titles, fired: i.fired, seasonCounted: false,', 'titles: i.titles, fired: i.fired, seasonCounted: true,'],
  emptytile: ['face', "value: 'No more calls',", "value: '',"],
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
  staffrides: ['career', "    { key: NFL_DESK_KEYS.staff, owner: 'club', fresh: (league, team) => freshStaff(league, team) },", "    { key: NFL_DESK_KEYS.staff, owner: 'gm' },"],
  ledgerrides: ['career', "    { key: NFL_DESK_KEYS.contracts, owner: 'club', fresh: (league, team) => openLedger(league, team) },", "    { key: NFL_DESK_KEYS.contracts, owner: 'gm' },"],
  /* Round 1559 (critic 3): both anchored where the lift put them, rostermove in the shared take after the move is
     made, depthstays in the NFL spec's releaseOldClub. */
  rostermove: ['bind', '  s.releaseOldClub(league, legacy.team);\n  return { ...r, opened };',
    '  s.releaseOldClub(league, legacy.team);\n  { const lt = (league as any).teams; if (lt[legacy.team] && lt[teamId]) lt[teamId].players.push(lt[legacy.team].players.pop()); }\n  return { ...r, opened };'],
  depthstays: ['career', '      const old = league.teams[team];\n      if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);', '      const old = league.teams[team];'],
  askrebuilt: ['face', '  return stored && stored.season === season ? stored : built;', '  return built;'],
  /* Section 6: the year out. The last week skipped; the old club named as the summer's user club, so it is not cut;
     his XP not put back; the last call refusal removed; the away draft skipped. */
  halfseason: ['career', '    periods: () => REGULAR_WEEKS,', '    periods: () => REGULAR_WEEKS - 1,'],
  notrim: ['career', '      runOffseason(league, rng);', '      runOffseason(league, rng, oldTeam);'],
  awayxp: ['host', '  if (Object.prototype.hasOwnProperty.call(a.desk.blocks, GM_HOST_KEYS.xp)) blocks[GM_HOST_KEYS.xp] = a.desk.blocks[GM_HOST_KEYS.xp];', '  /* his XP is not put back */'],
  lastcall: ['host', "  if (!hostCanSitOut(market)) return { ok: false, reason: 'last-call' };", "  if (false) return { ok: false, reason: 'last-call' };"],
  noawaydraft: ['career', "      for (let i = 0; i < batches; i++) cls = nflAiDraftPicks(league, cls, '', rng).remaining;", '      /* the draft skipped */'],
  /* Section 7: whole careers. A new stint opened for the league's season instead of the next; the firing not recorded. */
  overlap: ['host', '  const career = startSeatStint(seat.career, offer, market.season);', '  const career = startSeatStint(seat.career, offer, market.season - 1);'],
  firedlost: ['host', "  if (f.fired) career = endSeatStint(career, 'fired');", '  /* the firing not recorded */'],
  /* Section 7, Round 1533's fix pass: the hub reads the league's season as already on his record. */
  /* Round 1559 (finding 11): the rule is every sport's now, hostSeasonCounted in the face, the NFL's name a re-export. */
  hubcounted: ['face', "  if (phase === 'hub' || phase === 'pick') return false;", "  if (phase === 'pick') return false;"],
  /* Section 8: a player's name put into the arrival line. */
  nameinline: ['host', 'return `You take over the ${nameOf(s.team)}. They finished ${row.record}, ${ordinal(row.place)} in the league.`;',
    'return `You take over the ${nameOf(s.team)}. They finished ${row.record}, ${ordinal(row.place)} in the league. ${(league as any).teams?.[s.team]?.players?.[0]?.name ?? \'\'}`;'],
  /* Round 1559, section 2t (finding 8): Ownership level 4 handed level 5's step, so three bad years no longer fire
     a GM with four points on the grades alone. Anchored in the host's own effect, never in gmXp.ts (session I's). */
  thumbfalse: ['host', '    trustDelta: delta => cushionTrustLoss(delta, points.ownership),',
    '    trustDelta: delta => cushionTrustLoss(delta, points.ownership === 4 ? 5 : points.ownership),'],
  /* Round 1559, section 9: the verdict never fires; the market never offers; the season's XP never reaches the
     block (the consumer, hostCloseSeason, critic 18). */
  firenever: ['host', '    grade, trustDelta, trust: applied.trust, fired: applied.fired, warning: applied.warning,',
    '    grade, trustDelta, trust: applied.trust, fired: false, warning: applied.warning,'],
  nooffers: ['host', '  const { nextYear, climbTo } = hostNextYear(seat, leagueTiers(teams));',
    '  offers = [];\n  const { nextYear, climbTo } = hostNextYear(seat, leagueTiers(teams));'],
  xpflat: ['host', '  const nextXp = addXp(xp, award.total);', '  const nextXp = addXp(xp, 0);'],
  /* next year is never shut: no last call, no closed market, so the closed share a year later falls out of its band */
  nevershut: ['host', '  return seatNextYear(seat.career, tiers);', "  return { ...seatNextYear(seat.career, tiers), nextYear: 'open' };"],
  /* Round 1559, section 10: the shared legacy read grades a season the save has not counted; the shared retained
     step keeps a figure that is not the one the club kept. */
  legacyleak: ['bind', '    lastGrade: f.seasonCounted ? hostLastGrade(s.host, league, f.mandate, outcome) : null,',
    '    lastGrade: hostLastGrade(s.host, league, f.mandate, outcome),'],
  retainedlift: ['trade', '    entry.amount = r.kept;', '    entry.amount = r.kept + 0.1;'],
  /* Round 1559 fix pass (review minor 2): a week out with the rivals' moves dropped (the round replay, section 6). */
  awaymoves: ['career', "      aiWeeklyMoves(league, '', rng);", "      /* the rivals' moves dropped */"],
  /* Round 1559 fix pass (review minor 7): the old club left out of the year out's draft (named as the user club). */
  oldskip: ['career', "      for (let i = 0; i < batches; i++) cls = nflAiDraftPicks(league, cls, '', rng).remaining;",
    '      for (let i = 0; i < batches; i++) cls = nflAiDraftPicks(league, cls, oldTeam, rng).remaining;'],
  /* Round 1559 fix pass (review minor 6): the shared take syncs the picks on every take, not only on a desk it just
     opened; a refused take hands the old club its lineup back anyway (section 10's bind cases). */
  syncalways: ['bind', '  if (opened) s.syncOpened(league, r.desk);', '  s.syncOpened(league, r.desk);'],
  refusedrelease: ['bind', '  if (!r) return null;', '  if (!r) { s.releaseOldClub(league, legacy.team); return null; }'],
};
/* Round 1559: the controls anchored in a sport's own file, re-aimed at the NHL row's own lines. A control in
   NFL_ONLY with no NHL line (the board's press, the depth chart) is not a control of the nhl row and says so. */
const EDITS_BY_SPORT = {
  nhl: {
    /* Round 1561: the NHL board's press drawing twice (section 3 reads the bound board's answerPress) */
    extradraw: ['nhlBoard', "    const res = applyGmPressChoice(trust, hostPressOption(presser.options[i], hostXpEffects(gm, 'nhl')), Math.random);",
      "    const res = applyGmPressChoice(trust, hostPressOption(presser.options[i], hostXpEffects(gm, 'nhl')), () => (Math.random(), Math.random()));"],
    staffrides: ['nhlCareer', "    { key: NHL_DESK_KEYS.staff, owner: 'club', fresh: (league, team) => freshStaff(league, team) },", "    { key: NHL_DESK_KEYS.staff, owner: 'gm' },"],
    ledgerrides: ['nhlCareer', "    { key: NHL_DESK_KEYS.contracts, owner: 'club', fresh: (league, team) => openLedger(league, team) },", "    { key: NHL_DESK_KEYS.contracts, owner: 'gm' },"],
    /* the old club keeps the contributors he chose (the NHL's depthstays) */
    contribstays: ['nhlCareer', '      const old = league.teams[team];\n      if (old) nhlResetContributors(old);', '      const old = league.teams[team];'],
    halfseason: ['nhlCareer', '    periods: () => NHL_FO_ROUNDS,', '    periods: () => NHL_FO_ROUNDS - 1,'],
    /* the summer run with nobody named and no option: the engine trims nobody */
    notrim: ['nhlCareer', '      nhlOffseason(league, rng, undefined, { noUserClub: true });', '      nhlOffseason(league, rng, undefined);'],
    /* Round 1559 fix pass (review MAJOR 1): the summer names the old club as its user club, the NFL's notrim edit:
       every other club is trimmed, the old one is skipped (the half of noUserClub naming no club cannot give) */
    namedsummer: ['nhlCareer', '      nhlOffseason(league, rng, undefined, { noUserClub: true });', '      nhlOffseason(league, rng, oldTeam);'],
    /* Round 1559 fix pass (review minor 2): a round out with the rivals' in season moves dropped */
    awaymoves: ['nhlCareer', "      nhlAiMoves(league, '', rng);", "      /* the rivals' moves dropped */"],
    /* Round 1559 fix pass (review minor 7): the old club filtered out of the year out's draft order */
    oldskip: ['nhlCareer', '        const order = nhlFoStandings(league).map(t => t.abbr).reverse();', '        const order = nhlFoStandings(league).map(t => t.abbr).reverse().filter(a => a !== oldTeam);'],
    noawaydraft: ['nhlCareer', '        cls = nhlAiDraftPicks(league, cls, order, rng).remaining;', '        /* the draft skipped */'],
    /* a year out leaves the old club's contributors as he chose them */
    awaycontrib: ['nhlCareer', '      const old = league.teams[oldTeam];\n      if (old) nhlResetContributors(old);', '      const old = league.teams[oldTeam];'],
    /* Round 1559 fix pass (review minor 3): the retained salary rows made the club's on a move, the new club's empty */
    retainedclub: ['nhlCareer', "    { key: NHL_DESK_KEYS.retained, owner: 'league' },", "    { key: NHL_DESK_KEYS.retained, owner: 'club', fresh: () => [] },"],
    /* the year out's summer rolls the retained rows' dead cap like any other entry */
    retainedrolled: ['nhlCareer', '      const retained = keepRetainedOverSummer(league.teams, retainedBefore);', '      const retained = retainedBefore;'],
  },
};
const NFL_ONLY = new Set(['staffrides', 'ledgerrides', 'depthstays', 'halfseason', 'notrim', 'noawaydraft', 'extradraw', 'awaymoves', 'oldskip']);
const SPORT_OF_RUN = process.env.SIM_GM_CAREER_SPORT || 'nfl';
const overrides = new Map();
let fired = 0;
const EDIT = !CONTROL ? null
  : (EDITS_BY_SPORT[SPORT_OF_RUN] ?? {})[CONTROL] ?? (SPORT_OF_RUN !== 'nfl' && NFL_ONLY.has(CONTROL) ? null : EDITS[CONTROL] ?? null);
if (CONTROL && !EDIT && (EDITS[CONTROL] || Object.values(EDITS_BY_SPORT).some(e => e[CONTROL]))) {
  console.error(`SIM_GM_CAREER_CONTROL=${CONTROL} is not a control of the ${SPORT_OF_RUN} row (it rewrites another sport's own file)`);
  process.exit(2);
}
if (CONTROL && EDIT) {
  const [which, from, to] = EDIT;
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
export * as C from ${lib('nflGmCareer')};
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
export { GM_SPORTS } from ${lib('gmSport')};
export * as EN from ${lib('nhlFrontOffice')};
export * as DN from ${lib('nhlGmDesk')};
export { nhlDeskHost } from ${lib('gmDeskHostNhl')};
export { NHL_OPENING_RATINGS } from '${ROOT_URL}/src/data/nhlOpeningRatings.ts';
export { NHL_TEAMS } from '${ROOT_URL}/src/data/conquestDataNhl.ts';
export * as NC from ${lib('nhlGmCareer')};
export * as B from ${lib('gmCareerBind')};
export * as TP from ${lib('gmTradePackage')};
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
const { E, D, C, H, FM, FP, SEAT, G, K, S, X, P, isFrontOfficeSave, nflDeskHost, leagueNames, FO_DEPTH, FO_TEAMS } = M;
const { GM_SPORTS, EN, DN, nhlDeskHost, NHL_OPENING_RATINGS, NHL_TEAMS, TP, B } = M;
const EPOCH = (() => { const id = M.makeIdMinter('x')(); return id.slice(1, id.lastIndexOf('-')); })();
const unEpoch = s => s.split(EPOCH).join('E');

const NFL_WORDS = { title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17 };
/* Round 1559: a sport's words for the owner's ask are its descriptor's (gmSport.ts), the four fields the boards hand
   buildOwnerMandate and buildGmPresser (simGmDesk check 2 holds the descriptor to the engines). */
const foWords = key => { const w = GM_SPORTS[key].words; return { title: w.title, playoffs: w.playoffs, round: w.round, games: w.games }; };
const NHL_WORDS = foWords('nhl');
const LABELS = {
  nfl: Object.fromEntries(FO_TEAMS.map(t => [t.abbr, `${t.city} ${t.name}`])),
  nhl: Object.fromEntries(NHL_TEAMS.map(t => [t.id, `${t.city} ${t.name}`])),
};
const SPORT = process.env.SIM_GM_CAREER_SPORT || 'nfl';
const LABEL = LABELS[SPORT] ?? {};
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

/** Round 1559: the NHL board holds Play while his roster is over NHL_ROSTER_MAX; the GM lets the weakest go (doRelease). */
function nhlCut(lg, team) {
  const mine = lg.teams[team];
  while (mine.players.length > EN.NHL_ROSTER_MAX) {
    const down = [...mine.players].sort((a, b) => EN.nhlTradeValue(a) - EN.nhlTradeValue(b) || a.id.localeCompare(b.id))[0];
    if (!down || !EN.nhlRelease(mine, lg.freeAgents, down.id, lg.ratingModelVersion)) break;
  }
}

/** Draft night as the NHL board runs it (openDraft, draftPick, draftWithoutPicks): he takes the best grade he sees,
    his scout's read with the desk on; two batches of the rivals' picks, the order read again before each. */
function nhlDraft(lg, team, rng, desk) {
  const mine = lg.teams[team];
  const count = EN.nhlDraftCapital(mine) ?? 0;
  let cls = EN.nhlDraftClass(rng, Math.max(24, count + 10), leagueNames(lg));
  const level = desk ? S.gmStaffLevel(DN.nhlStaffOf(desk, lg, team).block, 'scouting') : null;
  const grade = pr => (level !== null ? DN.nhlScoutRead(pr, team, lg.season, level) : pr.grade);
  let left = 2, picksLeft = count;
  const aiBatch = () => {
    const order = EN.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    cls = EN.nhlAiDraftPicks(lg, cls, order, rng).remaining;
    left -= 1;
  };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = [...cls].sort((a, b) => grade(b) - grade(a) || a.id.localeCompare(b.id))[0];
    const round = mine.picks[0];
    if (!EN.nhlConsumeDraftPick(mine)) break;
    const p = EN.nhlProspectToPlayer(pr, rng, lg.ratingModelVersion);
    if (desk) DN.nhlSignDraftee(p);
    mine.players.push(p);
    if (desk) desk = DN.nhlNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    for (let i = nextPicks === 0 ? left : Math.min(1, left); i > 0; i--) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
  return desk;
}

const DRIVE = {
  nfl: {
    sport: 'nfl',
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
    outcome: (lg, team, rounds, champion) => (typeof C.nflOutcome === 'function'
      ? C.nflOutcome(lg, team, rounds, champion)
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
    /* Round 1559: what sections 2 to 8 read through the row, the NFL's own names */
    words: NFL_WORDS,
    xpLive: () => D.NFL_XP_LIVE ?? [],
    xpSources: () => D.NFL_XP_SOURCES ?? [],
    board: 'board',
    saveSport: 'NFL',
    periods: () => E.REGULAR_WEEKS,
    gamesOf: t => t.wins + t.losses,
    games: () => E.REGULAR_WEEKS,
    postKey: 'rounds',
    takeSeat: (...a) => C.nflTakeSeat(...a),
    awayHost: old => C.nflAwayHost(old),
    seasonCounted: (phase, desk) => D.nflSeasonCounted(phase, desk),
    picksOf: (desk, lg) => D.nflPicksOf(desk, lg),
    syncPicks: (lg, ledger) => D.syncNflPicks(lg, ledger),
    pickRules: () => D.nflGamePickRules(),
    picksKey: () => D.NFL_DESK_KEYS.picks,
    spec: () => C.nflCareer(),
    legacyOf: (lg, f) => C.nflLegacy(lg, f),
    /* The old club's own lineup a take hands back to automatic: the depth chart he saved. Planted on the QBs. */
    lineupField: 'depth',
    plantLineup(t) {
      const qbs = t.players.filter(p => p.pos === 'QB');
      return qbs.length >= 2 && E.swapDepth(t, 'QB', qbs[0].id, qbs[1].id) && !!t.depth;
    },
    /* The summer with nobody in the chair as the engine runs it, for the year out's replay (section 6). */
    engineSummer: (lg, rng) => E.runOffseason(lg, rng),
    /* Round 1559 fix pass: playWeek's order with nobody in the chair (injuries, the rivals' moves, every game, the week
       moved on below the last), for the year out's round replay (section 6, control awaymoves). */
    /* Round 1559 fix pass: the board's draft with nobody in the chair (the old club's depth chart back to automatic,
       openDraft's class size rule with no picks of his, draftWithoutPicks's three batches with nobody left out), for
       the year out's draft replay (section 6, control oldskip). */
    awayDraftReplay(lg, rng, oldTeam) {
      const old = lg.teams[oldTeam];
      if (old) for (const pos of E.DEPTH_GROUPS) E.resetDepth(old, pos);
      const capital = Object.values(lg.teams).reduce((sum, t) => sum + t.picks.length, 0);
      let cls = E.generateDraftClass(rng, Math.max(40, Math.min(capital, 18)), leagueNames(lg));
      for (let i = 0; i < 3; i++) cls = E.nflAiDraftPicks(lg, cls, '', rng).remaining;
    },
    awayRound(lg, rng) {
      E.injuryPass(lg.teams, rng);
      E.aiWeeklyMoves(lg, '', rng);
      for (const g of lg.schedule[lg.week - 1]) E.simGame(g, lg.teams, rng);
      if (lg.week < E.REGULAR_WEEKS) lg.week += 1;
    },
    overLimit: t => E.deepOverLimit(t) > 0,
  },
  /* Round 1559: the NHL Front Office in its board's own call order (NhlFrontOfficeBoard.tsx: start, playRound,
     openDraft, draftPick and draftWithoutPicks, finishDraft). Section 1 only until the round binds the career. */
  nhl: {
    sport: 'nhl',
    host: nhlDeskHost,
    team: 'TOR',
    deskKeys: ['contracts', 'picks', 'staff', 'retained'],
    newLeague: rng => EN.initNhlLeague(rng, NHL_OPENING_RATINGS),
    cut: nhlCut,
    openDesk: (lg, team) => DN.openNhlDesk(lg, team),
    /* The board's mandateFor. */
    mandateFor: (lg, team, defendingChamp, tilt = 0) => FM.buildOwnerMandate(
      FM.strengthRank(Object.fromEntries(Object.entries(lg.teams).map(([a, t]) => [a, EN.nhlStrength(t)])), team),
      Object.keys(lg.teams).length, defendingChamp, NHL_WORDS, lg.season, tilt),
    /* playRound pressed every round (the round, the rivals' moves, the desk's tick), the last one playing the playoffs. */
    season(lg, team, rng, desk) {
      for (;;) {
        EN.simNhlRound(lg, team, rng, desk ? DN.nhlDeskRoundOptions(desk, lg, team) : undefined);
        EN.nhlAiMoves(lg, team, rng);
        if (desk) desk = DN.nhlDeskAfterRound(desk, lg, team).desk;
        if (lg.round >= EN.NHL_FO_ROUNDS) break;
        lg.round += 1;
      }
      const po = EN.runNhlFoPlayoffs(lg, rng, desk ? DN.nhlDeskEdges(desk, lg, team) : undefined);
      lg.champions.push({ season: lg.season, team: po.champion });
      return { desk, rounds: po.series, champion: po.champion };
    },
    /* The board's close: seriesPostseason over the bracket, the bind's one reader once it exists. */
    outcome: (lg, team, series, champion) => (M.NC && typeof M.NC.nhlOutcome === 'function'
      ? M.NC.nhlOutcome(lg, team, series, champion)
      : { wins: lg.teams[team].wins, ...FM.seriesPostseason(series, team), wonTitle: champion === team }),
    draft: nhlDraft,
    /* finishDraft: the desk summer when the desk is on, the engine's own (with his club named) otherwise. */
    summer(lg, team, rng, desk) {
      if (!desk) { EN.nhlOffseason(lg, rng, team); return desk; }
      const s = DN.nhlDeskOffseason(lg, desk, team, rng);
      if (s.ok === false) throw new Error(`the NHL desk summer refused to run: ${s.lines.join(' ')}`);
      return s.desk;
    },
    /* Round 1559: a season with nobody in any chair, every club on the CPU's policy (the measuring run's league):
       the board's round with no user club, its draft with no picks of his, and the summer with nobody in the chair
       (the engine option this round adds, so every club is trimmed as a CPU club is). */
    cpuLeague: rng => EN.initNhlLeague(rng, NHL_OPENING_RATINGS),
    cpuSeason(lg, rng) {
      for (;;) {
        EN.simNhlRound(lg, '', rng);
        EN.nhlAiMoves(lg, '', rng);
        if (lg.round >= EN.NHL_FO_ROUNDS) break;
        lg.round += 1;
      }
      const po = EN.runNhlFoPlayoffs(lg, rng);
      lg.champions.push({ season: lg.season, team: po.champion });
      return { rounds: po.series, champion: po.champion };
    },
    cpuSummer(lg, rng) {
      let cls = EN.nhlDraftClass(rng, 24, leagueNames(lg));
      for (let b = 0; b < 2; b++) cls = EN.nhlAiDraftPicks(lg, cls, EN.nhlFoStandings(lg).map(t => t.abbr).reverse(), rng).remaining;
      EN.nhlOffseason(lg, rng, undefined, { noUserClub: true });
    },
    /* Sections 4, 5, 9 and 10 read forty leagues, not twenty: the NHL fires about 0.036 of its graded club seasons
       against the NFL's 0.061 (r1559-s2a), so twenty leagues held 278 first feeds, under section 4's floor of 300.
       More careers, never a lower floor. Section 9's bands are for sets of this many seeds. */
    measureSeeds: 40,
    /* Section 7 walks twenty careers on this row (its comment says why). */
    careerSeeds: 20,
    /* Section 5's floor on the takes whose old club had a lineup planted: an NHL roster at the close (12 to 15 men,
       some out hurt) has no spare healthy man at any position on about one take in six: 491 of 584 planted (0.84,
       r1559-s2c) against the NFL's QBs, always two. The floor sits near 90 percent of the measured share. */
    plantShare: 0.75,
    words: NHL_WORDS,
    xpLive: () => DN.NHL_XP_LIVE,
    xpSources: () => DN.NHL_XP_SOURCES,
    /* Round 1561: the board is bound, so section 3 reads its answerPress */
    board: 'nhlBoard',
    saveSport: 'NHL',
    /* Round 1559 fix pass (review minor 9, critic advice 12): the season's shape and the roster limit read from the
       sport's descriptor (src/lib/gmSport.ts), as the games count is; simGmDesk check 2 holds it equal to the engine,
       and the board's own calls above keep the engine's constants. */
    periods: () => GM_SPORTS.nhl.periods,
    gamesOf: t => t.wins + t.losses + t.otLosses,
    games: () => GM_SPORTS.nhl.words.games,
    postKey: 'series',
    takeSeat: (...a) => M.NC.nhlTakeSeat(...a),
    awayHost: old => M.NC.nhlAwayHost(old),
    seasonCounted: (phase, desk) => H.hostSeasonCounted(phase, desk),
    picksOf: (desk, lg) => DN.nhlPicksOf(desk, lg),
    syncPicks: (lg, ledger) => DN.syncNhlPicks(lg, ledger),
    pickRules: () => DN.nhlGamePickRules(),
    picksKey: () => DN.NHL_DESK_KEYS.picks,
    spec: () => M.NC.nhlCareer(),
    legacyOf: (lg, f) => M.NC.nhlLegacy(lg, f),
    /* The old club's own lineup a take hands back to automatic: the contributors he chose. Planted by benching
       one forward of the automatic six for a healthy one outside it; on a club with no healthy forward spare (a
       roster of 15 at the close, with men out, often has none: 133 of 293 planted on forwards alone, r1559-s2a),
       one of the four defensemen, then the goalie. */
    lineupField: 'contributors',
    plantLineup(t) {
      const cur = EN.nhlContributors(t);
      const spare = (isPos, used) => t.players.find(p => p.out === 0 && isPos(p.pos) && !used.includes(p.id));
      const fwd = spare(pos => pos === 'C' || pos === 'W', cur.forwards);
      if (fwd && cur.forwards.length > 0 && EN.nhlSetContributors(t, { ...cur, forwards: [...cur.forwards.slice(0, -1), fwd.id] })) return t.contributors !== undefined;
      const def = spare(pos => pos === 'D', cur.defense);
      if (def && cur.defense.length > 0 && EN.nhlSetContributors(t, { ...cur, defense: [...cur.defense.slice(0, -1), def.id] })) return t.contributors !== undefined;
      const g = spare(pos => pos === 'G', cur.goalie === null ? [] : [cur.goalie]);
      if (g && cur.goalie !== null && EN.nhlSetContributors(t, { ...cur, goalie: g.id })) return t.contributors !== undefined;
      return false;
    },
    engineSummer: (lg, rng) => EN.nhlOffseason(lg, rng, undefined, { noUserClub: true }),
    /* Round 1559 fix pass: playRound's order with nobody in the chair (the round, the rivals' moves, the round moved
       on below the last), for the year out's round replay (section 6, control awaymoves). */
    /* Round 1559 fix pass: the board's draft with nobody in the chair (the old club's contributors back to automatic,
       openDraft's class of 24, draftWithoutPicks's two batches over the standings reversed, read again before each,
       nobody filtered out), for the year out's draft replay (section 6, control oldskip). */
    awayDraftReplay(lg, rng, oldTeam) {
      const old = lg.teams[oldTeam];
      if (old) EN.nhlResetContributors(old);
      let cls = EN.nhlDraftClass(rng, 24, leagueNames(lg));
      for (let b = 0; b < 2; b++) cls = EN.nhlAiDraftPicks(lg, cls, EN.nhlFoStandings(lg).map(t => t.abbr).reverse(), rng).remaining;
    },
    awayRound(lg, rng) {
      EN.simNhlRound(lg, '', rng);
      EN.nhlAiMoves(lg, '', rng);
      if (lg.round < EN.NHL_FO_ROUNDS) lg.round += 1;
    },
    /* the retained rows the desk summer keeps (decision 2g), on the replay as on the league */
    afterSummer: (lg, desk) => { TP.keepRetainedOverSummer(lg.teams, DN.nhlRetainedOf(desk)); },
    retainedOf: desk => DN.nhlRetainedOf(desk),
    /* A rival still paying half of a man it traded, three seasons to run, as the trade desk writes one. */
    plantRetained(lg, desk, team) {
      const club = Object.keys(lg.teams).sort().find(a => a !== team);
      const t = lg.teams[club];
      t.deadCap = [...(t.deadCap ?? []), { playerId: 'retained-1559', name: 'Retained fixture', amount: 2.4, seasonsLeft: 3 }];
      return G.withGmBlock(desk, DN.NHL_DESK_KEYS.retained, [{ club, playerId: 'retained-1559', name: 'Retained fixture', share: 0.5, kept: 2.4 }]);
    },
    /* Round 1559 fix pass (review MAJOR 1): the old club planted over the roster limit before a summer out, so the
       half of noUserClub that naming no club cannot give (none skipped, the old club trimmed too) is seen reaching
       it. Low rated men on long deals: they outlive the summer's ageing and contract steps (years 3, age 27) and are
       the trim's first releases (rated 40, under anyone the summer keeps); enough of them that the club stands over
       the limit at the trim whoever else leaves (every man who could retire or reach the end of his deal counted
       out). Returns the planted ids. */
    plantOverLimit(lg, team, tag) {
      const t = lg.teams[team], max = GM_SPORTS.nhl.roster.max;
      const stays = t.players.filter(p => p.years >= 2 && p.age < 37).length;
      const ids = [];
      for (let i = 0; i < Math.max(1, max + 1 - stays); i++) {
        const id = `over-1559-${tag}-${i}`;
        t.players.push({ id, name: `Planted ${tag} ${i}`, pos: 'W', age: 27, ovr: 40, salary: EN.nhlSalaryFor(40, lg.ratingModelVersion), years: 3, out: 0, pot: 40 });
        ids.push(id);
      }
      return ids;
    },
    overLimit: t => t.players.length > GM_SPORTS.nhl.roster.max,
  },
};
if (!DRIVE[SPORT]) { console.error(`no DRIVE row for ${SPORT}`); process.exit(2); }
const d = DRIVE[SPORT];
if (d.bound === false) {
  ROW_BOUND = false;
  if (!RECORD) console.log(`sections 2 to 8 not bound for ${SPORT} yet: section 1 alone`);
}

/* ================================================================== */
/* 1. The default path, recorded from the base and replayed            */
/* ================================================================== */
const S1_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const S1_SEASONS = 5;
/* Round 1019's three blocks on the NFL; the NHL's desk has a fourth, the retained salary rows. */
const DESK_KEYS = d.deskKeys ?? ['contracts', 'picks', 'staff'];
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
const FLEET = runs('2') || runs('8') || runs('10') ? buildFleet() : [];
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
      if (v1.award) { S2.paid += v1.award.total; RECAP_LINES.push(H.hostXpRecapLine({ award: v1.award, levelAfter: v1.levelAfter, desk: v1.desk }, d.xpLive())); }
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

  /* Round 1559, Round 1533's finding 8: the guide's rule of thumb held in code ("A fresh GM always survives one bad
     year, and on the grades alone only a full Ownership tree gets him through three", football.ts). From trust 60,
     a real 'badly' season three times through the board's own verdict at each Ownership level, no press: levels 0
     to 4 are fired and level 5 is not, and one bad year never fires a fresh GM. Then the room: the best safe answer
     the press offers after each of the first two seasons (buildGmPresser's own options, no gamble) keeps a GM below
     level 5 in the job, which is why the sentence says "on the grades alone". Computed, never typed. Control
     thumbfalse (level 4 handed level 5's step) turns 2t red. */
  begin('2t', 'the rule of thumb: three bad years from trust 60 fire Ownership levels 0 to 4 on the grades alone and not 5, and the press can change that');
  {
    let found = null;
    for (const snap of FLEET) {
      const id = Object.keys(snap.lg.teams).sort().find(x => FM.gradeSeason(snap.mandates[x], d.outcome(snap.lg, x, snap.rounds, snap.champion)).result === 'badly');
      if (id) { found = { snap, id }; break; }
    }
    if (!found) fail('no badly season in the fleet to walk the rule of thumb on');
    else {
      const { snap, id } = found, lg = snap.lg, mandate = snap.mandates[id], outcome = d.outcome(lg, id, snap.rounds, snap.champion);
      const tier = tiersOf(lg).get(id);
      const presser = FP.buildGmPresser(d.words, { justHired: false, teamLabel: label(id), fired: false, wonTitle: false, gradeResult: 'badly', tradeLine: null, seasonsPlayed: 1 });
      const safe = (presser?.options ?? []).filter(o => !o.effect.gamble).sort((a, b) => b.effect.trust - a.effect.trust)[0] ?? null;
      const walk = (k, press) => {
        const desk = ownDesk(id, lg.season, tier, k);
        let trust = 60;
        const path = [trust];
        for (let n = 0; n < 3; n++) {
          const v = H.hostSeasonVerdict(d.host, lg, { team: id, mandate, trust, fired: false, outcome, desk, seasonsPlayed: n, titles: 0 });
          trust = v.trust; path.push(trust);
          if (v.fired) return { fired: true, after: n + 1, path };
          if (press && safe) { trust = FP.applyGmPressChoice(trust, H.hostPressOption(safe, H.hostXpEffects(desk, d.sport)), () => 0.5).trust; path.push(trust); }
        }
        return { fired: false, after: 3, path };
      };
      const alone = [0, 1, 2, 3, 4, 5].map(k => walk(k, false));
      alone.forEach((w, k) => ok(w.fired === (k <= 4), `level ${k} on the grades alone: ${w.fired ? `fired after ${w.after}` : 'kept'} (${w.path.join(' > ')}), the rule says ${k <= 4 ? 'fired' : 'kept'}`));
      ok(alone[0].after >= 2, `a fresh GM was fired by one bad year (${alone[0].path.join(' > ')})`);
      const saved = [0, 1, 2, 3, 4].filter(k => !walk(k, true).fired);
      ok(safe !== null && saved.length > 0, `no safe press answer keeps a GM below level 5 in the job (${safe ? safe.label : 'no safe answer'})`);
      console.log(`   from trust 60, three badly seasons of ${id}: ${alone.map((w, k) => `level ${k} ${w.fired ? `fired after ${w.after}` : 'kept'}`).join(', ')}; with "${safe?.label}" after each: kept at levels ${saved.join(', ') || 'none'} (level 4: ${walk(4, true).path.join(' > ')})`);
    }
  }
}

/* ================================================================== */
/* 3. Media, through the board's own call                               */
/* ================================================================== */
if (runs('3')) {
  begin('3', 'Media: every gamble lands exactly one step more often a level, the safe answers and the tilt never move, one draw an answer');
  /* The board's answerPress, read off its source with the comments out: one hostPressOption over hostXpEffects of
     its own desk, handed to applyGmPressChoice with ONE Math.random (control extradraw: the board draws twice). */
  /* Round 1559: a row whose board is not bound yet (the NHL's, Round 1561) has no answerPress to read; the presser
     grid below still runs on its own words and its own sport's effects. */
  if (d.board) {
    /* the read normalised where it is made (simHarnessAnchors section 2 cannot tell which FILES entry a keyed read names) */
    const boardSrc = lf(overrides.get(path.resolve(FILES[d.board]).toLowerCase()) ?? lf(fs.readFileSync(FILES[d.board], 'utf8')));
    const from = boardSrc.indexOf('const answerPress = ');
    const body = from < 0 ? '' : boardSrc.slice(from, boardSrc.indexOf('\n  };', from));
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const count = s => code.split(s).length - 1;
    const fxCall = `hostXpEffects(gm, '${d.sport}')`;
    ok(count('Math.random') === 1 && count('hostPressOption(') === 1 && count(fxCall) === 1 && count('applyGmPressChoice(') === 1,
      `the board's answerPress is not one eased option and one draw (${J({ random: count('Math.random'), option: count('hostPressOption('), effects: count(fxCall) })})`);
  } else console.log(`   the ${d.sport} board is not bound to the career yet: its answerPress is read when it is`);
  /* The same call over every presser the board can build, at every Media level, on a half step roll grid. */
  const deskWith = k => {
    let b = X.addXp(X.defaultGmXp(), 1e6);
    for (let i = 0; i < k; i++) b = X.spendGmPoint(b, 'media');
    return G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.xp, b);
  };
  const answer = (trust, opt, desk, rng) => FP.applyGmPressChoice(trust, H.hostPressOption(opt, H.hostXpEffects(desk, d.sport)), rng);
  const base = { justHired: false, teamLabel: label(d.team), fired: false, wonTitle: false, gradeResult: null, tradeLine: null, seasonsPlayed: 3 };
  const kinds = new Map();
  for (const f of [{ justHired: true }, { wonTitle: true, gradeResult: 'title' }, { gradeResult: 'missed' }, { gradeResult: 'badly' },
    { gradeResult: 'met', tradeLine: 'a deal for a pass rusher' }, { gradeResult: 'overachieved', tradeLine: 'a deal' }]) {
    const p = FP.buildGmPresser(d.words, { ...base, ...f });
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
        ok(trusts.size === 1 && H.hostPressOption(opt, H.hostXpEffects(deskWith(5), d.sport)) === opt, `${at}: a safe answer moves with Media`);
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
          if (m.facts[o.teamId]) say(H.hostOfferFactsLine(m.facts[o.teamId], GM_SPORTS[d.sport].cap.line), `an offer's facts, ${at}`);
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
    for (const deskOn of [true, false]) boxes.push([H.hostXpTile(null, d.xpLive(), deskOn), `the GM level box, desk ${deskOn ? 'on' : 'off'}`]);
  }
  for (const l of [...H.hostMarketHelp(d.host.pack), ...H.hostCareerHelp(d.host.pack), ...H.hostXpHelp(), H.hostEarnsLine(d.xpSources())]) WORDS.push([l, 'a help line', new Set()]);
  for (const r of ['in-seat', 'season-open', 'market-closed', 'last-call', 'broken-adapter']) WORDS.push([H.hostAwayRefusalLine(d.host.pack, r), 'a year out refused', new Set()]);
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
/* Round 1559: a row may read more leagues (the nhl row's measureSeeds); the nfl row reads 1 to 20 as it always has. */
const S4_SEEDS = (process.env.SIM_GM_CAREER_MEASURE_SEEDS || Array.from({ length: d.measureSeeds ?? 20 }, (_, i) => i + 1).join(',')).split(',').map(Number);
const S4_SEASONS = Number(process.env.SIM_GM_CAREER_MEASURE_SEASONS || 12);
const S4 = {
  firings: 0, first: { offers: 0, quiet: 0, closed: 0 }, raw: { offers: 0, quiet: 0, closed: 0 },
  lastCalls: 0, rawLastCalls: 0, firstCalls: 0, eligible: 0, hired3: 0, rawHired3: 0, feedsRead: 0, asserted: 0, badly: 0,
};
const S5 = { takes: 0, follows: 0, planted: 0, refused: 0, retained: 0 };
/* Round 1559: section 9 reads section 4's league seed by seed; section 10's bind cases run on section 5's takes. */
const S9 = { seeds: [] };
const S10 = { moves: 0, refusals: 0, deskOff: 0 };

/**
 * Round 1559, section 10: the shared take (gmCareerBind.ts) on the row's own spec, counted. On the first offer of
 * every fired GM of section 4: a desk off save opens its desk, syncs the picks once and hands the old club's lineup
 * back once; a take refused (his own old club, which never calls) leaves the league byte equal and calls neither.
 */
function bindCases(lgAt, desk, save, legacy, old, teamId, at) {
  const prev = check;
  check = '10';
  const counted = () => {
    const base = d.spec(), n = { open: 0, sync: 0, release: 0 };
    return { n, spec: { ...base,
      openDesk: (l, t) => { n.open++; return base.openDesk(l, t); },
      syncOpened: (l, dk) => { n.sync++; base.syncOpened(l, dk); },
      releaseOldClub: (l, t) => { n.release++; base.releaseOldClub(l, t); } } };
  };
  /* A desk off save reads its feed off the legacy record (no record block yet), so its offer is that feed's. */
  const legacyFeed = H.hostMarket(d.host, lgAt, H.hostSeatOf(G.freshGmDesk(), legacy), label);
  const offTeam = legacyFeed?.offers?.[0]?.teamId ?? null;
  if (offTeam) {
    const lg = clone(lgAt), { n, spec } = counted();
    const r = B.careerTakeSeat(spec, lg, null, save, legacy, offTeam, label);
    S10.deskOff++; S10.moves++;
    ok(r !== null && r.opened === true && n.open === 1 && n.sync === 1 && n.release === 1,
      `${at}: a desk off take opened ${n.open}, synced ${n.sync}, released ${n.release} (each once), opened flag ${r?.opened}`);
  }
  {
    const lg = clone(lgAt), { n, spec } = counted();
    const r = B.careerTakeSeat(spec, lg, clone(desk), save, legacy, teamId, label);
    S10.moves++;
    ok(r !== null && r.opened === false && n.open === 0 && n.sync === 0 && n.release === 1,
      `${at}: a desk on take opened ${n.open}, synced ${n.sync}, released ${n.release} (none, none, once), opened flag ${r?.opened}`);
  }
  {
    const lg = clone(lgAt), before = J(lg), { n, spec } = counted();
    const r = B.careerTakeSeat(spec, lg, clone(desk), save, legacy, old, label);
    S10.refusals++;
    ok(r === null && J(lg) === before && n.sync === 0 && n.release === 0 && n.open === 0,
      `${at}: a refused take (his old club) moved the league or called the spec (${J(n)})`);
    const lg2 = clone(lgAt), before2 = J(lg2), c2 = counted();
    const r2 = B.careerTakeSeat(c2.spec, lg2, null, save, legacy, old, label);
    ok(r2 === null && J(lg2) === before2 && c2.n.sync === 0 && c2.n.release === 0,
      `${at}: a refused desk off take moved the league or synced or released (${J(c2.n)})`);
  }
  check = prev;
}
const clone = v => JSON.parse(J(v));
/** The league as a take must leave it: the old club's own lineup (the NFL's saved depth chart, the NHL's chosen
    contributors: the row's lineupField) is the one thing allowed to go. */
const withoutDepth = (lg, team) => { const c = clone(lg); if (c.teams[team]) delete c.teams[team][d.lineupField]; return J(c); };
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
  const hasChart = d.plantLineup(planted.teams[old]);
  const m = H.hostMarket(d.host, planted, seat, label) ?? m0;
  for (const [k, offer] of m.offers.entries()) {
    const lg = clone(planted);
    if (hasChart) S5.planted++;
    let desk = d.openDesk(lg, old);
    d.syncPicks(lg, d.picksOf(desk, lg));
    desk = G.withGmBlock(desk, H.GM_HOST_KEYS.seat, g.desk.blocks.seat);
    if (g.desk.blocks.xp !== undefined) desk = G.withGmBlock(desk, H.GM_HOST_KEYS.xp, g.desk.blocks.xp);
    /* Round 1559 fix pass (review minor 3): on a desk that keeps retained salary, a row planted on a rival before the
       take, so the rows' owner on a move (the league's: they stay as they are) is seen (control retainedclub). */
    if (d.plantRetained) { desk = d.plantRetained(lg, desk, old); S5.retained++; }
    const save = { myTeam: old, trust: g.trust, fired: true, mandate: g.mandate, pressTilt: 1, seasonTradeLine: 'a deal' };
    const legacy = H.hostLegacy(d.host, lg, { team: old, seasonsPlayed: g.seasonsPlayed, titles: g.titles, fired: true, seasonCounted: true });
    const at = `${old} to ${offer.teamId} (${salt})`;
    const lgBefore = withoutDepth(lg, old), picksBefore = pickCount(lg), deskBefore = J(desk);
    /* The new club's own blocks, opened on the league as the take reads it (before the old chart goes back). */
    const fresh = d.openDesk(clone(lg), offer.teamId);
    if (k === 0 && runs('10')) bindCases(lg, desk, save, legacy, old, offer.teamId, at);
    const r = d.takeSeat(lg, desk, save, legacy, offer.teamId, label);
    if (!r) { S5.refused++; fail(`${at}: an offer on the table was refused`); continue; }
    S5.takes++;
    ok(J(desk) === deskBefore, `${at}: the desk handed in was changed`);
    ok(withoutDepth(lg, old) === lgBefore, `${at}: taking the seat moved the league (a roster, a pick, a standing)`);
    ok(lg.teams[old][d.lineupField] === undefined, `${at}: his old club kept the ${d.lineupField} he saved`);
    ok(pickCount(lg) === picksBefore && J(r.desk.blocks.picks) === J(desk.blocks.picks), `${at}: picks were not conserved`);
    if (d.retainedOf) ok(d.retainedOf(desk).length > 0 && J(d.retainedOf(r.desk)) === J(d.retainedOf(desk)), `${at}: the retained salary rows did not stay as they were (the league's): ${J(d.retainedOf(r.desk))}`);
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
if (runs('4') || runs('5') || runs('9') || runs('10')) {
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
    /* Round 1559, section 9: this seed's own counts (the seed is the sampling unit, R5) */
    /* passed: the men who passed on their first feed and sat the year out; closedNext: of them, the phone stopped a
       year later (a last call passed is closed at once: the board refuses a year out on it, hostCanSitOut). The
       host's first call means every first feed offers, so "closed a year later" is only ever reached by passing. */
    const P9 = { clubSeasons: 0, firings: 0, twoPlus: 0, offers: 0, passed: 0, closedNext: 0, xp: [] };
    for (let s = 0; s < S4_SEASONS; s++) {
      const r = d.cpuSeason(lg, rng);
      /* A year on for everyone still out of work, read before this close fires anybody new. */
      for (const t of tracks) {
        if (t.pass && !t.pass.done) {
          t.pass.done = true; P9.passed++;
          if (t.pass.next === 'shut') P9.closedNext++;
          else if (H.hostMarket(host, lg, sitOut(t.pass.seat), label).state === 'closed') P9.closedNext++;
        }
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
        P9.clubSeasons++; P9.xp.push(H.hostXpOf(v.desk).xp - H.hostXpOf(g.desk).xp);
        g.trust = v.trust; g.desk = v.desk; g.seasonsPlayed += 1; g.titles += r.champion === id ? 1 : 0;
        if (!v.fired) continue;
        S4.firings++; P9.firings++;
        const legacy = H.hostLegacy(host, lg, { team: id, seasonsPlayed: g.seasonsPlayed, titles: g.titles, fired: true, seasonCounted: true });
        const seat = H.hostSeatOf(g.desk, legacy);
        const m = H.hostMarket(host, lg, seat, label);
        const raw = rawMarket(host, lg, seat);
        P9.offers += m.offers.length; if (m.offers.length >= 2) P9.twoPlus++;
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
        if (runs('5') || runs('10')) takeChecks(lg, id, g, seat, m, seed * 100 + s);
        S4.first[m.state]++; S4.raw[raw.state]++;
        if (m.state === 'offers' && m.nextYear === 'shut') S4.lastCalls++;
        if (raw.state === 'offers' && raw.nextYear === 'shut') S4.rawLastCalls++;
        if (m.offers.length > raw.offers.length) S4.firstCalls++;
        const room = S4_SEASONS - 1 - s >= 2;
        const track = w => ({ seat, feeds: 1, next: w.nextYear, hired: w.state === 'offers', done: w.state !== 'quiet' });
        tracks.push({ room, host: track(m), raw: track(raw), pass: m.state === 'offers' ? { seat, next: m.nextYear, done: false } : null });
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
    {
      const roomy = tracks.filter(t => t.room);
      S9.seeds.push({ seed, clubSeasons: P9.clubSeasons, firings: P9.firings, twoPlus: P9.twoPlus, offers: P9.offers,
        eligible: roomy.length, hired3: roomy.filter(t => t.host.hired).length, passed: P9.passed, closedNext: P9.closedNext, xp: P9.xp });
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
    ok(S5.takes >= 400 && S5.follows >= 300 && S5.planted >= (d.plantShare ?? 0.9) * S5.takes, `too few seats taken (${S5.takes}, ${S5.follows} followed, ${S5.planted} planted, floor ${d.plantShare ?? 0.9} of the takes)`);
    if (d.plantRetained) {
      console.log(`   ${S5.retained} desks held a retained salary row at the take`);
      ok(S5.retained === S5.takes + S5.refused, `a retained row was planted on ${S5.retained} desks of ${S5.takes + S5.refused}`);
    }
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
   the three. noawaydraft measured ratio 0.000. The mean roster after a summer is printed and NOT asserted: across
   four runs it sat 0.05 under to 0.02 over the baseline, too near the 0.19 a skipped draft costs to hold a band
   that is not a coin toss, so the drafted ratio carries the check (the strongest signal) and the limit of 53 is
   asserted club by club. */
const S6_BANDS = {
  nfl: { draft: [0.95, 1.01] },
  /* Round 1559: the NHL row, measured on runners, three years out a seed, three sets of twenty and a held out set:
       seeds  1-20 ratio 0.987 (r1559-s2a and r1559-s2c, section 6 alone; 0.993 in a whole run, the id counter moves
       with the sections before it), 21-40 0.993, 41-60 0.990 (r1559-s2a), held out 61-80 0.997 (r1559-s2c).
     The idle GM's rivals take exactly 600 (ten a season over sixty summers), a ceiling the away path cannot pass. The
     NFL's band for the same check, its top that ceiling and its floor well under the lowest set; R5's own recipe on
     the three sets would give [0.982, 1.002], inside it. noawaydraft on this row skips the away draft. */
  nhl: { draft: [0.95, 1.01] },
};
const S6_BAND = S6_BANDS[SPORT_OF_RUN] ?? null;
const S6 = {
  years: 0, stopped: 0, over: 0, minted: 0, inSeat: 0, closed: 0, lastCall: 0, shadows: 0,
  away: { drafted: 0, rosters: 0, clubSummers: 0 }, base: { drafted: 0, rosters: 0, clubSummers: 0 },
  /* Round 1559: the retained salary rows a desk keeps over a summer out, and the old club's own lineup */
  retained: { rows: 0, kept: 0, dropped: 0 }, lineupFree: 0, lineupPlanted: 0,
  /* Round 1559 fix pass: summers the old club went into planted over the roster limit, and came out trimmed to it */
  oldPlanted: 0, oldTrimmed: 0,
  /* Round 1559 fix pass: rounds out replayed against the row's own round, and how many differed */
  roundShadows: 0, roundsOff: 0,
  /* Round 1559 fix pass: men the old club drafted in its years out; drafts out replayed, and how many differed */
  oldDrafted: 0, draftShadows: 0, draftsOff: 0,
};
/* Round 1559 fix pass: a league's JSON with every id taken out (a replay on a copy mints its own) */
const noIdsJ = v => JSON.stringify(v, (key, x) => (key === 'id' ? undefined : x));
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
  const ledger = desk.blocks[d.picksKey()], ids = Object.keys(lg.teams), rules = d.pickRules();
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
      const desk = G.withGmBlock(d.openDesk(lg, old), H.GM_HOST_KEYS.seat, seat);
      const r = H.hostSeasonAway({ host, away: d.awayHost(old), league: lg, desk, legacy: legacyOf(lg, old, why !== 'in-seat'), rng: mulberry32(seed) });
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
    let desk = G.withGmBlock(d.openDesk(lgA, team), H.GM_HOST_KEYS.seat, firedSeatFor(team, tiers.get(team), lg0.season, ['overachieved', 'met', 'missed']));
    desk = G.withGmBlock(desk, H.GM_HOST_KEYS.xp, X.addXp(X.defaultGmXp(), 777));
    /* Round 1559: his own lineup planted on the old club (the year out hands it back to automatic, controls
       awaycontrib on the NHL), and on a desk that keeps retained salary a row planted on a rival (its dead cap entry
       stands at the figure the club kept after every summer out, control retainedrolled). */
    if (d.plantLineup(lgA.teams[team])) S6.lineupPlanted++;
    if (d.plantRetained) { desk = d.plantRetained(lgA, desk, team); S6.retained.rows++; }
    const plantedRetained = d.retainedOf ? d.retainedOf(desk).length : 0;
    d.syncPicks(lgA, d.picksOf(desk, lgA));
    const xpBefore = J(desk.blocks.xp), clubBlocks = J([desk.blocks.contracts, desk.blocks.staff]);
    const totalsBefore = J(SEAT.careerTotals(desk.blocks.seat.career));
    const rngA = mulberry32(7000 + seed), drafted = new Set();
    let years = 0;
    for (let y = 0; y < S6_YEARS; y++) {
      const at = `seed ${seed} year out ${y + 1}`;
      const away = d.awayHost(team);
      const noneMinted = (step, b, lg) => { for (const id of everyId(lg)) if (!b.has(id)) { S6.minted++; fail(`${at}: ${step} minted a player`); break; } };
      const wrapped = {
        awayDraft(lg, r, dk) {
          const b = rosterIds(lg, null);
          /* Round 1559 fix pass (review minor 7): the draft replayed on a copy with the same draws against the row's
             own statement of the board's draft with nobody in the chair; it must be the league the away host left,
             ids aside (the copy mints its own). The ratio below reads the other clubs only, so a draft that leaves
             the old club out was green before this (control oldskip); its own draftees are counted and printed. */
          const shadow = d.awayDraftReplay ? clone(lg) : null, draws = [];
          const out = away.awayDraft(lg, shadow ? () => { const x = r(); draws.push(x); return x; } : r, dk);
          for (const id of rosterIds(lg, null)) if (!b.has(id)) drafted.add(id);
          const oldNow = lg.teams[team];
          if (oldNow) for (const p of [...oldNow.players, ...(oldNow.practice ?? [])]) if (!b.has(p.id)) S6.oldDrafted++;
          if (shadow) {
            let i = 0, threw = false;
            try { d.awayDraftReplay(shadow, () => { if (i >= draws.length) throw new Error('out of draws'); return draws[i++]; }, team); } catch { threw = true; }
            S6.draftShadows++;
            if (threw || i !== draws.length || noIdsJ(shadow) !== noIdsJ(lg)) { S6.draftsOff++; fail(`${at}: the draft out is not the board's draft with nobody in the chair (${i} of ${draws.length} draws replayed${threw ? ', the replay ran out' : ''})`); }
          }
          return out;
        },
        awaySummer(lg, r, dk) {
          /* The summer with nobody in the chair is the engine's offseason with NO user club, then the ledger rolled:
             replayed on a copy with the same draws, it must be the league the away host left (the old club named as
             the user club, so the CPU neither cuts nor tags it: control notrim on the NFL row, namedsummer on the
             NHL row; the NHL's notrim runs the summer with no club trimmed at all). Round 1559 fix pass: where the
             row can, a PROBE (a copy of the league at the summer's start, the old club planted over the roster limit,
             the away host's own summer run on it with a stream of its own) shows that the summer trims the old club
             too (MAJOR 1). A probe, not the league: planted men left on the real old club made it weaker and moved
             the draft ratio from 0.993 to 0.973 (r1559-fx1). */
          const probe = d.plantOverLimit ? clone(lg) : null;
          const shadow = clone(lg), draws = [];
          const before = d.picksOf(dk, shadow), closed = shadow.season, ids = Object.keys(shadow.teams);
          const out = away.awaySummer(lg, () => { const x = r(); draws.push(x); return x; }, dk);
          let i = 0;
          let threw = false;
          try { d.engineSummer(shadow, () => { if (i >= draws.length) throw new Error("out of draws"); return draws[i++]; }); } catch { threw = true; }
          d.syncPicks(shadow, P.rollLedger(before, ids, closed, d.pickRules()));
          if (d.afterSummer) d.afterSummer(shadow, dk);
          S6.shadows++;
          const noIds = v => JSON.stringify(v, (key, x) => (key === 'id' ? undefined : x)); /* the restock mints ids from a counter the copy has moved on */
          if (threw || i !== draws.length || noIds(shadow) !== noIds(lg)) fail(`${at}: the away summer is not the engine's offseason with no user club (${i} of ${draws.length} draws replayed${threw ? ", the replay ran out" : ""})`);
          for (const [abbr, t] of Object.entries(lg.teams)) {
            if (d.overLimit(t)) { S6.over++; fail(`${at}: ${abbr} is over the roster limit after the summer`); }
            if (abbr !== team) { S6.away.rosters += t.players.length; S6.away.clubSummers++; }
          }
          if (probe) {
            /* Over the limit at the trim by construction (plantOverLimit counts out every man who could leave), so
               ending at or under it means the trim reached the old club. */
            const plantedOver = d.plantOverLimit(probe, team, `${seed}-${y}`), going = probe.teams[team].players.length;
            away.awaySummer(probe, mulberry32(8000 + seed * 10 + y), clone(dk));
            S6.oldPlanted++;
            const oldT = probe.teams[team], left = oldT.players.filter(p => plantedOver.includes(p.id)).length;
            if (!d.overLimit(oldT)) S6.oldTrimmed++;
            else fail(`${at}: the old club, planted over the roster limit (${going} men going in), was not trimmed by the summer (${oldT.players.length} men, ${left} of ${plantedOver.length} planted still on it)`);
          }
          return out;
        },
        periods: lg => away.periods(lg),
        playRound(lg, r, dk) {
          const b = everyId(lg);
          /* Round 1559 fix pass (review minor 2): the round replayed on a copy with the same draws against the row's
             own statement of the board's round with nobody in the chair; it must be the league the away host left
             (control awaymoves: the rivals' in season moves dropped). */
          const shadow = d.awayRound ? clone(lg) : null, draws = [];
          const out = away.playRound(lg, shadow ? () => { const x = r(); draws.push(x); return x; } : r, dk);
          noneMinted('a week', b, lg);
          if (shadow) {
            let i = 0, threw = false;
            try { d.awayRound(shadow, () => { if (i >= draws.length) throw new Error('out of draws'); return draws[i++]; }); } catch { threw = true; }
            S6.roundShadows++;
            if (threw || i !== draws.length || J(shadow) !== J(lg)) { S6.roundsOff++; fail(`${at}: a round out is not the board's round with no user club (${i} of ${draws.length} draws replayed${threw ? ', the replay ran out' : ''})`); }
          }
          return out;
        },
        playoffs(lg, r, dk) { const b = everyId(lg); const out = away.playoffs(lg, r, dk); noneMinted('the playoffs', b, lg); return out; },
      };
      const season = lgA.season, champs = lgA.champions.length;
      const r = H.hostSeasonAway({ host, away: wrapped, league: lgA, desk, legacy: legacyOf(lgA, team), rng: rngA });
      if (r.ok === false) { if (y === 0) fail(`${at}: the first year out was refused (${r.reason})`); S6.stopped++; break; }
      years++; S6.years++;
      ok(lgA.season === season + 1 && lgA.champions.length === champs + 1 && new Set(lgA.champions.map(c => c.season)).size === lgA.champions.length,
        `${at}: not one more decided season with one champion`);
      ok(Object.values(lgA.teams).every(t => d.gamesOf(t) === d.games()), `${at}: a club did not play ${d.games()} games`);
      const seat = r.desk.blocks.seat;
      ok(H.isGmSeatBlock(seat) && seat.career.seasonsOut === y + 1 && J(SEAT.careerTotals(seat.career)) === totalsBefore, `${at}: the record moved beyond one more year out`);
      ok(J(r.desk.blocks.xp) === xpBefore, `${at}: his XP moved in a year out`);
      ok(J([r.desk.blocks.contracts, r.desk.blocks.staff]) === clubBlocks, `${at}: the old club's ledger or staff moved`);
      picksHold(lgA, r.desk, at);
      if (lgA.teams[team][d.lineupField] === undefined) S6.lineupFree++;
      else fail(`${at}: the old club kept the ${d.lineupField} he chose through a year out`);
      if (d.retainedOf) {
        const rows = d.retainedOf(r.desk);
        for (const row of rows) {
          const e = lgA.teams[row.club]?.deadCap?.find(x => x.playerId === row.playerId);
          if (!e) fail(`${at}: a retained row outlived its dead cap entry`);
          else if (e.amount !== row.kept) fail(`${at}: ${row.club}'s retained entry reads ${e.amount}, the club kept ${row.kept}`);
          else S6.retained.kept++;
        }
        if (rows.length < plantedRetained && y === S6_YEARS - 1) S6.retained.dropped += plantedRetained - rows.length;
      }
      desk = r.desk;
    }
    S6.away.drafted += [...rosterIds(lgA, team)].filter(id => drafted.has(id)).length;

    /* The baseline: the same league with an idle GM in the old club's chair, the board's calls with him as the user. */
    const lgB = clone(lg0), rngB = mulberry32(7000 + seed), draftedB = new Set();
    let deskB = d.openDesk(lgB, team);
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
  if (!S6_BAND) fail(`no measured draft band for the ${d.sport} row (S6_BANDS): ratio ${draftRatio.toFixed(3)}`);
  else ok(draftRatio >= S6_BAND.draft[0] && draftRatio <= S6_BAND.draft[1], `the away draft put ${draftRatio.toFixed(3)} of the idle GM baseline's draftees on the other clubs, band ${J(S6_BAND.draft)}`);
  if (S6.retained.rows > 0 || d.afterSummer) {
    console.log(`   retained rows planted ${S6.retained.rows}: ${S6.retained.kept} summers kept at the figure the club kept, ${S6.retained.dropped} dropped when the entry ran out; the old club's contributors back to automatic after ${S6.lineupFree} of ${S6.years} years`);
    ok(S6.retained.kept >= S6_SEEDS.length, `only ${S6.retained.kept} retained rows carried over a summer`);
  }
  console.log(`   the old club drafted ${S6.oldDrafted} men in its ${S6.years} years out (printed, not asserted: 2, 0, 6 and 4 on the NHL's four seed sets, r1559-fx2)`);
  if (d.awayDraftReplay) {
    console.log(`   drafts out replayed against the board's draft with nobody in the chair: ${S6.draftShadows}, ${S6.draftsOff} differed`);
    ok(S6.draftShadows === S6.years && S6.draftsOff === 0, `only ${S6.draftShadows} drafts out replayed for ${S6.years} years out, ${S6.draftsOff} differed`);
  }
  if (d.awayRound) {
    console.log(`   rounds out replayed against the board's round with no user club: ${S6.roundShadows}, ${S6.roundsOff} differed`);
    ok(S6.roundShadows >= S6.years * d.periods() && S6.roundsOff === 0, `only ${S6.roundShadows} rounds out replayed for ${S6.years} years out of ${d.periods()} rounds, ${S6.roundsOff} differed`);
  }
  if (d.plantOverLimit) {
    console.log(`   the old club planted over the roster limit before ${S6.oldPlanted} summers out: trimmed to it after ${S6.oldTrimmed}`);
    ok(S6.oldPlanted === S6.shadows && S6.oldTrimmed === S6.oldPlanted, `the old club went into ${S6.oldPlanted} of ${S6.shadows} summers out planted over the limit and came out trimmed after ${S6.oldTrimmed}`);
  }
}

/* ================================================================== */
/* 7. Whole careers: fired every third season, then a take or a year out */
/* ================================================================== */
/* Round 1559 fix pass: the nhl row walks twenty careers, not ten. Section 7's counts move with the id counter the
   sections before it advance, and the fix pass's replays in section 6 moved the nhl row's ten careers from 13 years
   out to 10, on the floor of 10 (r1559-fx3a; 18, 10, 13 in r1559-f1; the nfl row 20, 11, 22 against 21, 14, 15).
   More careers, never a lower floor. */
const S7_SEEDS = Array.from({ length: d.careerSeeds ?? 10 }, (_, i) => i + 1);
const S7_SEASONS = 12;
const TITLE_ASK = season => ({ tier: 'title', text: `Win ${d.words.title}. Anything less is a failed season upstairs.`, winFloor: 0, reqLevel: 4, season });
if (runs('7')) {
  begin('7', 'whole careers: the save, the record and the counters agree at every step across firings, takes and years out');
  const host = d.host;
  const S7 = { checks: 0, forced: 0, firings: 0, takes: 0, sits: 0, closed: 0, seasons: 0 };
  /* Critic correction 8, the row Round 1533's review found half built (only 'fired' was ever asked): the save's
     counters hold the league's season on the recap, the draft and the fired screen of a season he ran; never on
     the pick screen or the hub (a season being played: a legacy Career box would start his stint a season late,
     hostLegacySeat), and never after a year out (control hubcounted). Read off the save, so a desk off save too. */
  {
    const ranBlock = { v: 1, career: SEAT.newGmCareer(d.team, 4, 2026) };
    const awayBlock = { v: 1, career: SEAT.sitOutYear(SEAT.endSeatStint(SEAT.newGmCareer(d.team, 4, 2026), 'fired')) };
    const ran = G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, ranBlock);
    const away = G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, awayBlock);
    const ROWS = [['pick', null, false], ['hub', null, false], ['hub', ran, false], ['recap', null, true], ['recap', ran, true],
      ['draft', null, true], ['draft', ran, true], ['fired', null, true], ['fired', ran, true], ['fired', away, false]];
    for (const [phase, desk, want] of ROWS) {
      S7.checks++;
      const got = d.seasonCounted(phase, desk);
      if (got !== want) fail(`the season counted on ${phase}, ${desk === away ? 'after a year out' : desk ? 'desk on' : 'desk off'}: ${got}, the save says ${want}`);
    }
  }
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
      ok(isFrontOfficeSave({ ...save, gm: desk }, d.saveSport, d.periods()), `${at}: the save does not pass isFrontOfficeSave`);
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
        save.postseason = { [d.postKey]: r.rounds, champion: r.champion, gradeLine: v.grade?.verdict ?? null };
        save.phase = v.fired ? 'fired' : 'recap';
        point('close');
        if (!v.fired) { summer(); point('summer'); continue; }
        S7.firings++;
      }
      const legacy = H.hostLegacy(host, lg, { team: save.myTeam, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: true, seasonCounted: d.seasonCounted('fired', desk) });
      const m = H.hostMarket(host, lg, H.hostSeatOf(desk, legacy), label);
      if (m.offers.length > 0 && ((seed + s) % 2 === 0 || !H.hostCanSitOut(m))) {
        const r = d.takeSeat(lg, desk, { myTeam: save.myTeam, trust: save.trust, fired: true, mandate: save.mandate, pressTilt: save.pressTilt, seasonTradeLine: save.seasonTradeLine }, legacy, m.offers[0].teamId, label);
        if (!r) { fail(`seed ${seed}: an offer on the table was refused`); break; }
        Object.assign(save, r.save, { phase: 'recap' });
        save.postseason = { ...save.postseason, gradeLine: null };
        desk = r.desk; S7.takes++;
        point('take');
        summer();
        point('summer after a take');
      } else if (H.hostCanSitOut(m)) {
        const r = H.hostSeasonAway({ host, away: d.awayHost(save.myTeam), league: lg, desk, legacy, rng });
        if (r.ok === false) { fail(`seed ${seed}: a year out on offer was refused (${r.reason})`); break; }
        desk = r.desk; S7.sits++;
        save.postseason = { [d.postKey]: [], champion: r.report.champion, gradeLine: null };
        point('year out');
      } else { S7.closed++; break; }
    }
  }
  console.log(`   ${S7_SEEDS.length} careers, ${S7.seasons} seasons run: ${S7.forced} sackings forced, ${S7.firings} firings, ${S7.takes} seats taken, ${S7.sits} years out, ${S7.closed} closed for good; ${S7.checks} checkpoints`);
  ok(S7.firings >= 12 && S7.takes >= 5 && S7.sits >= 10, `too few firings (${S7.firings}), takes (${S7.takes}) or years out (${S7.sits}) to hold a career`);
}

/* ================================================================== */
/* 9. The bands: the career's rates on each sport's engine             */
/* ================================================================== */
/* Round 1559 (brief decision 8, R5, critic 6): section 4's league read seed by seed, the seed being the sampling
   unit (one league, zero sum standings, trust carried season to season), never a binomial error over club seasons.
   Per seed: the FIRING RATE (firings per graded club season), the OFFERS (the share of first feeds with two or more
   offers, the mean offers in a first feed), the share RE HIRED within three feeds, the CLOSED share a year later
   (of the men who pass on their first feed and sit the year out, the share whose phone has stopped the next
   summer; a passed last call counts closed, since the board refuses a year out on it; the host's first call means
   no first feed is ever quiet, so passing is the only way to a year later) and the XP a graded club season pays. A band is the three calibration sets' lowest and highest set mean, widened by the larger of
   half their spread and three standard errors of the per seed values; a held out fourth set must clear it. A rate
   that sits at 100 or 0 percent on every seed is an invariant, asserted exactly, never a band of width zero.
   The pace cross check ties copy to the engine: hostXpHelp says a .500 season that meets the ask pays N XP and
   "the median club is near this"; the measured median XP of a graded club season must sit inside PACE of N.
   simGmDeskHost measures the same pace on the four adapters with the host's own driver; this measures it in each
   board's own call order through the bind, which is what a player's GM earns. Bands hold for sets of S9_SET seeds
   (the row's calibration size, its measureSeeds: nfl 20, nhl 40): a run on another count prints its numbers and
   asserts only the invariants.
   Controls: firenever (the verdict never fires), nooffers (the market never offers: the offers bands and the re
   hired invariant), xpflat (a season's XP never reaches the block), nevershut (next year is never shut: the closed
   share). The four sports sit side by side once MLB (Part B) and NBA (Part C) add their rows; until
   then nfl and nhl. */
/* CALIBRATED 2026-10-29 on GitHub runners (r1559-s2c, head 5ce4d870c; the numbers recomputed from the logs by the
   R5 recipe): each statistic is the mean over a set's seeds of the per seed value; three calibration sets, then a
   held out fourth. Band = [lowest set mean - w, highest + w], w = the larger of half the three sets' spread and three
   times the largest per seed standard error of the three (the seed is the unit, never a club season).
     nfl, sets of 20 (seeds 1-20 / 21-40 / 41-60, held out 61-80):
       fireRate   .0618 / .0600 / .0581, held .0613; w .0057 (3 se)      -> [.0524, .0675]
       twoPlus    .0366 / .0361 / .0464, held .0488; w .0303 (3 se)      -> [.0058, .0767]
       meanOffers 1.0366 / 1.0361 / 1.0464, held 1.0488; w .0303         -> [1.0058, 1.0767]
       closedNext .5082 / .5504 / .5404, held .5297; w .0753             -> [.4329, .6257]
       xpMean     111.81 / 112.02 / 112.23, held 112.37; w 1.12          -> [110.69, 113.35]
     nhl, sets of 40 (seeds 1-40 / 41-80 / 81-120, held out 121-160):
       fireRate   .0366 / .0355 / .0351, held .0364; w .0030             -> [.0321, .0396]
       twoPlus    .0488 / .0568 / .0475, held .0441; w .0300             -> [.0175, .0868]
       meanOffers 1.0503 / 1.0568 / 1.0516, held 1.0441; w .0327         -> [1.0176, 1.0895]
       closedNext .4993 / .5523 / .4943, held .5300; w .0702             -> [.4241, .6225]
       xpMean     121.73 / 121.55 / 121.56, held 121.87; w .56           -> [120.98, 122.29]
     hired3 is 1 on every seed of every set of both rows: the host's first call means every first feed offers, so
     a man who wants a seat has one at once. An invariant, asserted on every seed, with nooffers as its control.
     THE PACE, one band for every sport because the copy is one sentence: the median XP of a graded club season over
     the .500 season that meets the ask (110 XP), sets nfl .864 / .864 / .918 and nhl .945 / .945 / .945, held out
     .864 and .945; widened by half the spread of the six -> [.824, .985]. simGmDeskHost measures 95 to 106 XP
     (.864 to .964) on the four adapters with its own driver, inside it, so MLB (Part B) and NBA (Part C) should
     join without moving it; this measures the pace in each board's own call order through the bind. */
const S9_SET = d.measureSeeds ?? 20;
const S9_BANDS = {
  nfl: {
    fireRate: [0.0524, 0.0675], twoPlus: [0.0058, 0.0767], meanOffers: [1.0058, 1.0767], closedNext: [0.4329, 0.6257],
    xpMean: [110.69, 113.35], invariants: { hired3: 1 },
  },
  nhl: {
    fireRate: [0.0321, 0.0396], twoPlus: [0.0175, 0.0868], meanOffers: [1.0176, 1.0895], closedNext: [0.4241, 0.6225],
    xpMean: [120.98, 122.29], invariants: { hired3: 1 },
  },
};
const S9_PACE = [0.824, 0.985];
if (runs('9')) {
  begin('9', 'the bands: the firing rate, the offers, re hiring, the closed share and the XP pace, seed by seed against the calibrated bands');
  const rows = S9.seeds;
  const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
  const stat = (name, pick) => { const v = rows.map(pick).filter(x => x !== null); return { name, v, m: mean(v), sd: sd(v), se: sd(v) / Math.sqrt(Math.max(1, v.length)), n: v.length }; };
  const stats = [
    stat('fireRate', r => r.clubSeasons ? r.firings / r.clubSeasons : null),
    stat('twoPlus', r => r.firings ? r.twoPlus / r.firings : null),
    stat('meanOffers', r => r.firings ? r.offers / r.firings : null),
    stat('hired3', r => r.eligible ? r.hired3 / r.eligible : null),
    stat('closedNext', r => r.passed ? r.closedNext / r.passed : null),
    stat('xpMean', r => r.xp.length ? mean(r.xp) : null),
  ];
  const allXp = rows.flatMap(r => r.xp), xpMedian = median(allXp);
  const even = X.gmSeasonXp({ winPct: 0.5, titles: 0, playoffRoundsWon: 0, mandateSteps: X.mandateSteps('met'), placesAboveExpectation: 0, prospectsGraduated: 0 }).total;
  const seedSpan = `${S4_SEEDS[0]}-${S4_SEEDS.at(-1)}`;
  for (const s of stats) console.log(`   S9 ${d.sport} seeds ${seedSpan}: ${s.name} mean ${s.m.toFixed(4)} sd ${s.sd.toFixed(4)} se ${s.se.toFixed(4)} min ${Math.min(...s.v).toFixed(4)} max ${Math.max(...s.v).toFixed(4)} over ${s.n} seeds`);
  console.log(`   S9 ${d.sport} seeds ${seedSpan}: xpMedian ${xpMedian} over ${allXp.length} graded club seasons; hostXpHelp's .500 season that meets the ask pays ${even} (ratio ${(xpMedian / even).toFixed(3)})`);
  ok(rows.length === S4_SEEDS.length && allXp.length > 0, `section 9 read ${rows.length} seeds of ${S4_SEEDS.length}`);
  const band = S9_BANDS[d.sport];
  if (!band) fail(`no calibrated bands for the ${d.sport} row (S9_BANDS)`);
  else {
    for (const s of stats) {
      if ((band.invariants ?? {})[s.name] !== undefined) {
        const want = band.invariants[s.name];
        ok(s.n > 0 && s.v.every(x => x === want), `${s.name}: an invariant at ${want} on every seed, read ${s.v.filter(x => x !== want).length} seeds off it of ${s.n} (mean ${s.m.toFixed(4)})`);
        continue;
      }
      const b = band[s.name];
      if (!b) { fail(`${s.name}: no band for the ${d.sport} row`); continue; }
      if (S4_SEEDS.length !== S9_SET) continue;
      ok(s.m >= b[0] && s.m <= b[1], `${s.name}: the set mean ${s.m.toFixed(4)} is outside the band ${J(b)}`);
    }
    if (S4_SEEDS.length !== S9_SET) console.log(`   the bands are for sets of ${S9_SET} seeds: on ${S4_SEEDS.length} seeds only the invariants are asserted`);
    else console.log(`   ${d.sport} bands held on ${S4_SEEDS.length} seeds: ${stats.filter(s => !(s.name in (band.invariants ?? {}))).map(s => `${s.name} ${s.m.toFixed(4)} in ${J(band[s.name])}`).join('; ')}`);
  }
  if (!S9_PACE) fail('no measured pace band (S9_PACE)');
  else ok(xpMedian / even >= S9_PACE[0] && xpMedian / even <= S9_PACE[1], `the median club earns ${xpMedian} XP a graded season, ${(xpMedian / even).toFixed(3)} of the ${even} hostXpHelp says, outside ${J(S9_PACE)}`);
}

/* ================================================================== */
/* 10. The lift: the shared pieces equal the NFL copies they came from */
/* ================================================================== */
/* Round 1559 (brief 3.7.1 and 3.7.7): the real proof of the lift is that section 1's recording and section 5's
   takes replay unchanged on the NFL; this section names the rest. careerLegacy through the row's spec equals the
   old inline body (nflGmCareer.ts before the lift) on every club of the fleet, counted or not, fired or not, and the
   row's own wrapper equals it; hostSeasonCounted equals the old nflSeasonCounted on section 7's table;
   keepRetainedOverSummer equals the old inline summer step (nhlGmDesk.ts and mlbGmDesk.ts before the lift) on
   planted rows; and the shared take, counted on section 5's first offers: a desk off take opens, syncs and
   releases once each, a desk on take releases once and syncs never, a refused take moves nothing and calls
   neither. Controls legacyleak (the legacy read grades a season the save has not counted) and retainedlift. */
if (runs('10')) {
  begin('10', 'the lift: the shared legacy read, season counted rule, retained step and take equal what the NFL wrote inline');
  let legacyRows = 0;
  for (const snap of FLEET) {
    const lg = snap.lg;
    for (const id of Object.keys(lg.teams).sort()) {
      const mandate = snap.mandates[id];
      for (const counted of [true, false]) for (const firedNow of [true, false]) {
        const f = { team: id, seasonsPlayed: 3, titles: 1, fired: firedNow, seasonCounted: counted, mandate };
        const outcome = snap.champion ? d.outcome(lg, id, snap.rounds, snap.champion) : null;
        const old = H.hostLegacy(d.host, lg, { team: id, seasonsPlayed: 3, titles: 1, fired: firedNow, seasonCounted: counted,
          lastGrade: counted ? H.hostLastGrade(d.host, lg, mandate, outcome) : null });
        const got = B.careerLegacy(d.spec(), lg, { ...f, post: snap.rounds, champion: snap.champion });
        const wrapped = d.legacyOf(lg, { ...f, [d.postKey]: snap.rounds, champion: snap.champion });
        legacyRows++;
        if (J(got) !== J(old)) fail(`seed ${snap.seed} ${id} counted ${counted} fired ${firedNow}: the shared legacy read is not the old body`);
        if (J(wrapped) !== J(got)) fail(`seed ${snap.seed} ${id}: the ${d.sport} wrapper is not the shared legacy read`);
      }
    }
  }
  const oldCounted = (phase, desk) => {
    if (phase === 'hub' || phase === 'pick') return false;
    const stored = desk ? desk.blocks[H.GM_HOST_KEYS.seat] : undefined;
    return !(H.isGmSeatBlock(stored) && stored.career.seasonsOut > 0);
  };
  const ranBlock = { v: 1, career: SEAT.newGmCareer(d.team, 4, 2026) };
  const awayBlock = { v: 1, career: SEAT.sitOutYear(SEAT.endSeatStint(SEAT.newGmCareer(d.team, 4, 2026), 'fired')) };
  let countedRows = 0;
  for (const phase of ['pick', 'hub', 'draft', 'recap', 'fired']) {
    for (const desk of [null, G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, ranBlock), G.withGmBlock(G.freshGmDesk(), H.GM_HOST_KEYS.seat, awayBlock)]) {
      countedRows++;
      const want = oldCounted(phase, desk);
      ok(H.hostSeasonCounted(phase, desk) === want && d.seasonCounted(phase, desk) === want, `${phase}: the season counted rule moved in the lift`);
    }
  }
  const oldKeep = (teams, rows) => rows.filter(r => {
    const entry = teams[r.club]?.deadCap?.find(x => x.playerId === r.playerId);
    if (!entry) return false;
    entry.amount = r.kept;
    return true;
  });
  let keepRows = 0;
  for (const snap of FLEET) {
    const clubs = Object.keys(snap.lg.teams).sort().slice(0, 6);
    const a = clone(snap.lg), b = clone(snap.lg), rows = [];
    clubs.forEach((club, i) => {
      for (const t of [a, b]) t.teams[club].deadCap = [...(t.teams[club].deadCap ?? []), { playerId: `keep-${i}`, name: `Keep ${i}`, amount: 1 + i / 10, seasonsLeft: 1 + (i % 3) }];
      rows.push({ club, playerId: `keep-${i}`, name: `Keep ${i}`, share: 0.5, kept: 3 + i / 4 });
      if (i % 2) rows.push({ club, playerId: `gone-${i}`, name: `Gone ${i}`, share: 0.25, kept: 1 });
    });
    const ra = TP.keepRetainedOverSummer(a.teams, rows), rb = oldKeep(b.teams, rows);
    keepRows += rows.length;
    ok(J(ra) === J(rb) && J(a) === J(b) && ra.length === clubs.length, `seed ${snap.seed}: the shared retained step is not the old summer step (${ra.length} rows kept, ${rb.length} by the old step)`);
  }
  console.log(`   ${legacyRows} legacy reads equal the old body and the ${d.sport} wrapper; ${countedRows} season counted rows; ${keepRows} retained rows through both summers' old step; the take: ${S10.moves} moves (${S10.deskOff} desk off), ${S10.refusals} refusals`);
  ok(legacyRows >= 200 && countedRows === 15 && keepRows >= 30, `too few lift rows (${legacyRows}, ${countedRows}, ${keepRows})`);
  ok(S10.moves >= 100 && S10.refusals >= 50 && S10.deskOff >= 20, `too few takes counted (${S10.moves} moves, ${S10.deskOff} desk off, ${S10.refusals} refusals)`);
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

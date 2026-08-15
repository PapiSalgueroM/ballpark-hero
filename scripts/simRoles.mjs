/**
 * Round 127 harness: squad roles, playing time promises and the dressing room.
 *
 * The question this exists to answer is the one Round 116 got burnt by: is
 * there a game under the screen, or is the screen the whole thing? So before a
 * line of the promises system was written, morale itself was measured, and it
 * turned out to be a much better foundation than the academy had been. Morale
 * pinned at the floor is worth 34.1 league points a season at Everton and
 * pinned at the ceiling 51.1, over forty runs an arm. Seventeen points. It
 * moves and it matters.
 *
 * What it did NOT do was notice individual players. The result moved every man
 * in the building by the same +5, -1 or -6, and across a whole season the only
 * thing separating a man who played every minute from one who never got off the
 * bench was three morale a goal. Measured over eight seasons: 4.47 morale
 * between the fifteen appearance men and the zero appearance men, and under 1.5
 * in three runs out of eight. Leaving your best striker out was free.
 *
 * So this measures OUTCOMES against a do nothing baseline, the way
 * simCareerEngaged does: two managers running the same club with the SAME
 * rotation policy, so the football is identical, differing only in what they
 * told the squad. It also checks the pieces underneath, because a headline
 * that comes out of one lucky run is worse than no headline.
 *
 * Run: node scripts/simRoles.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/rolesEntry.mjs';
const BUNDLE = '/tmp/roles.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  FORMATIONS, autoPickXI, isAvailable, sellValue,
  ensureRoles, roleOf, ROLE_INFO, ROLE_LADDER, deservedRole, standingGap,
  playingShare, promiseGap, promiseMood, setSquadRole, roleChangeCost,
  squadByRole, brokenPromises, PROMISE_WINDOW, PROMISE_WINDOW_MIN,
  answerMessage,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };
const se2 = a => (a.length ? 2 * sd(a) / Math.sqrt(a.length) : 0);

/* Round 125: Round 119 made every match stop at half time, and playNextEntry
   parks on the interval waiting for a decision unless it is told not to. This
   harness is about the season, not the interval, so every call takes the
   straight through path. */
function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. The ladder is a ladder ---------- */
console.log('1) Five rungs, ordered, and each one a real promise');
{
  if (ROLE_LADDER.length !== 5) fail(`the ladder has ${ROLE_LADDER.length} rungs`);
  const shares = ROLE_LADDER.map(r => ROLE_INFO[r].share);
  console.log(`   ${ROLE_LADDER.map((r, i) => `${ROLE_INFO[r].label} ${Math.round(shares[i] * 100)}%`).join(' · ')}`);
  for (let i = 1; i < shares.length; i++) {
    if (shares[i] >= shares[i - 1]) fail(`${ROLE_LADDER[i]} expects as much football as ${ROLE_LADDER[i - 1]}`);
  }
  if (shares[0] <= 0.7) fail('the top rung promises less than seventy percent of the matches');
  if (shares[shares.length - 1] > 0.15) fail('the bottom rung still promises real football, so it is not a bottom rung');
  for (const r of ROLE_LADDER) {
    if (!ROLE_INFO[r].label || !ROLE_INFO[r].promise) fail(`${r} has no label or no promise line`);
    if (/[_-]/.test(ROLE_INFO[r].label)) fail(`${r} reads like a config key, not like football`);
  }
}

/* ---------- 2. A fresh squad agrees with itself ---------- */
console.log('2) Nobody starts a save already furious');
{
  let insulted = 0, total = 0, missing = 0;
  const spread = {};
  for (const club of ['Everton', 'Manchester City', 'Burnley', 'Real Madrid', 'Inter Miami', 'Ajax', 'Leeds United']) {
    const s = startCareer(club);
    ensureRoles(s);
    for (const p of s.squad) {
      total += 1;
      if (!p.role) missing += 1;
      spread[roleOf(p)] = (spread[roleOf(p)] ?? 0) + 1;
      if (standingGap(s, p) >= 2) insulted += 1;
    }
    // every rung that matters is actually used
    const groups = squadByRole(s).filter(g => g.players.length > 0).map(g => g.role);
    if (groups.length < 3) fail(`${club} only used ${groups.length} rungs on day one`);
  }
  console.log(`   ${total} players across seven clubs: ${ROLE_LADDER.map(r => `${spread[r] ?? 0} ${r}`).join(', ')}`);
  console.log(`   ${insulted} of them start two or more rungs below what they think they have earned`);
  if (missing > 0) fail(`${missing} players came out of the repair with no role`);
  if (insulted > 0) fail('a fresh save hands you a dressing room that is already insulted');
  if ((spread.star ?? 0) < 7) fail('barely anybody is a star man, so the top rung is decoration');
  if ((spread.star ?? 0) > total * 0.25) fail('a quarter of every squad is a star man, so the rung means nothing');
}

/* ---------- 3. The window reads minutes, and forgives injuries ---------- */
console.log('3) His last ten counts games he could have played, and only those');
{
  let s = startCareer('Everton');
  s.xiIds = autoPickXI(s.squad, FORMATIONS[s.formationIndex] ?? FORMATIONS[0]);
  ensureRoles(s);
  const starter = s.squad.find(p => s.xiIds.includes(p.id) && p.position !== 'GK');
  const bench = s.squad.find(p => !s.xiIds.includes(p.id) && !p.isYouth);
  // one player is hurt for the whole run, so nothing should ever land in his window
  const crocked = s.squad.find(p => !s.xiIds.includes(p.id) && p.id !== bench.id);
  crocked.injuryWeeks = 60;
  const fixed = [...s.xiIds];
  for (let i = 0; i < 14 && s.week < s.calendar.length; i++) {
    s.xiIds = [...fixed];
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  const a = s.squad.find(p => p.id === starter.id);
  const b = s.squad.find(p => p.id === bench.id);
  const c = s.squad.find(p => p.id === crocked.id);
  console.log(`   ${a.name} (played): window ${a.lastTen.length} long, ${a.lastTen.reduce((x, y) => x + y, 0)} involved, share ${playingShare(a)}`);
  console.log(`   ${b.name} (benched): window ${b.lastTen.length} long, ${b.lastTen.reduce((x, y) => x + y, 0)} involved, share ${playingShare(b)}`);
  console.log(`   ${c.name} (injured throughout): window ${c.lastTen.length} long, gap ${promiseGap(c).toFixed(2)}`);
  if (a.lastTen.length > PROMISE_WINDOW) fail(`the window grew past ${PROMISE_WINDOW}`);
  if (playingShare(a) < 0.9) fail('a man who started every match does not read as a starter');
  // Round 125's margin lesson: the bench man is not guaranteed a clean zero,
  // because an injury in the XI drags him on. Half is the honest line.
  if (playingShare(b) > 0.5) fail('a man who was barely used reads as if he had played');
  if (c.lastTen.length !== 0) fail('a match he was injured for went into his window');
  if (promiseGap(c) !== 0) fail('an injured player is being judged on football he could not play');
  // and the window is silent until there is enough of a run
  const fresh = startCareer('Ajax');
  ensureRoles(fresh);
  fresh.squad[0].lastTen = [0, 0, 0];
  if (playingShare(fresh.squad[0]) !== null) fail(`a ${PROMISE_WINDOW_MIN - 1} match run is already being judged`);
  if (promiseGap(fresh.squad[0]) !== 0) fail('a player is being punished before he has had a run of games');
}

/* ---------- 4. Happiness moves in BOTH directions ---------- */
console.log('4) A backup who plays is content, a star who does not is finished');
{
  /* Paired seeds again, and Manchester City on purpose. At a club that loses
     a lot the whole squad is pinned to the morale floor by about week twelve
     and every arm reads the same, which is a property of the floor rather than
     of this round. City stays off the floor long enough for the difference to
     be readable, and the paired seed means the two arms play the identical
     season with one man carrying a different label. */
  const realRandom = Math.random;
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const SEEDS = 80, WEEKS = 14;
  const run = (role, inXi, seed) => {
    Math.random = mulberry32(seed);
    let s = startCareer('Manchester City');
    s.xiIds = autoPickXI(s.squad, FORMATIONS[s.formationIndex] ?? FORMATIONS[0]);
    ensureRoles(s);
    const subject = inXi
      ? s.squad.find(p => s.xiIds.includes(p.id) && p.position !== 'GK')
      : s.squad.filter(p => !s.xiIds.includes(p.id) && !p.isYouth).sort((a, b) => b.rating - a.rating)[0];
    const id = subject.id;
    s.squad = s.squad.map(p => (p.id === id ? { ...p, role } : p));
    const fixed = [...s.xiIds];
    for (let i = 0; i < WEEKS && s.week < s.calendar.length; i++) {
      s.xiIds = [...fixed];
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    Math.random = realRandom;
    const after = s.squad.find(p => p.id === id);
    const others = s.squad.filter(p => p.id !== id && fixed.includes(p.id));
    // Measured against the rest of HIS OWN team, so the season's results,
    // which move everybody equally, drop out of the number.
    return after.morale - mean(others.map(p => p.morale));
  };
  const benchedBackup = [], benchedStar = [], playingKey = [], playingBackup = [];
  for (let i = 0; i < SEEDS; i++) {
    const seed = 9000 + i;
    benchedBackup.push(run('backup', false, seed));
    benchedStar.push(run('star', false, seed));
    playingKey.push(run('key', true, seed));
    playingBackup.push(run('backup', true, seed));
  }
  const brokenCost = benchedBackup.map((v, i) => v - benchedStar[i]);
  const flatteryCost = playingKey.map((v, i) => v - playingBackup[i]);
  console.log(`   after ${WEEKS} weeks, morale relative to the rest of the XI (${SEEDS} paired seasons):`);
  console.log(`     benched man told he was a backup:          ${mean(benchedBackup).toFixed(1)}`);
  console.log(`     the SAME benched man told he was a star:   ${mean(benchedStar).toFixed(1)}   (paired cost ${mean(brokenCost).toFixed(2)}, 2se ${se2(brokenCost).toFixed(2)})`);
  console.log(`     playing man told he was a key first teamer: ${mean(playingKey).toFixed(1)}`);
  console.log(`     the SAME playing man told he was a backup: ${mean(playingBackup).toFixed(1)}   (paired cost ${mean(flatteryCost).toFixed(2)}, 2se ${se2(flatteryCost).toFixed(2)})`);
  if (mean(brokenCost) < 8) {
    fail(`telling a benched man he was a star costs only ${mean(brokenCost).toFixed(2)} morale, which is nothing`);
  }
  if (mean(flatteryCost) < 5) {
    fail('a man playing every week is as happy being called a backup as a key first teamer, so under-promising is farmable');
  }
  if (mean(benchedBackup) >= 0) fail('a man who never plays is not bothered at all');
}

/* ---------- 5. THE HEADLINE: same football, different promises ---------- */
console.log('5) Two managers, the same rotation, one of them keeps his word');
{
  const RUNS = 300;
  const CLUBS = ['Everton', 'Aston Villa', 'Manchester City'];

  /* Both arms rotate identically: a third of last week's starters are rested
     every match. That is the point of the design. The football is the same in
     both arms, so anything that comes out of this is the promise and only the
     promise. */
  const play = (club, allStar) => {
    let s = startCareer(club);
    const F = FORMATIONS[s.formationIndex] ?? FORMATIONS[0];
    s.xiIds = autoPickXI(s.squad, F);
    ensureRoles(s);
    if (allStar) for (const p of s.squad) p.role = 'star';
    let last = new Set(s.xiIds.filter(Boolean));
    let guard = 0;
    while (s.week < s.calendar.length && guard < 140) {
      guard++;
      const rest = new Set([...last].filter(() => Math.random() < 0.33));
      const used = new Set();
      const xi = [];
      for (const slot of F.slots) {
        const ok = p => isAvailable(p) && !used.has(p.id);
        let c = s.squad.filter(p => ok(p) && !rest.has(p.id) && slot.allowed.includes(p.position)).sort((a, b) => b.rating - a.rating)[0]
          ?? s.squad.filter(p => ok(p) && !rest.has(p.id)).sort((a, b) => b.rating - a.rating)[0]
          ?? s.squad.filter(ok).sort((a, b) => b.rating - a.rating)[0];
        if (c) { used.add(c.id); xi.push(c.id); } else xi.push(null);
      }
      s.xiIds = xi;
      last = new Set(xi.filter(Boolean));
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    const row = s.table.find(t => t.club === s.clubName);
    const sorted = [...s.table].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    const top11 = [...s.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
    return {
      pts: row ? row.pts : 0,
      pos: sorted.findIndex(t => t.club === s.clubName) + 1,
      conf: s.boardConfidence,
      sacked: s.sacked ? 1 : 0,
      requests: s.squad.filter(p => p.wantsOut).length,
      mor: mean(s.squad.map(p => p.morale)),
      topMor: mean(top11.map(p => p.morale)),
    };
  };

  const diffs = [];
  const summary = {};
  for (const club of CLUBS) {
    const honest = [], broken = [];
    for (let i = 0; i < RUNS; i++) honest.push(play(club, false));
    for (let i = 0; i < RUNS; i++) broken.push(play(club, true));
    const h = {
      pts: mean(honest.map(r => r.pts)), conf: mean(honest.map(r => r.conf)),
      req: mean(honest.map(r => r.requests)), mor: mean(honest.map(r => r.mor)),
      top: mean(honest.map(r => r.topMor)), sack: honest.reduce((s, r) => s + r.sacked, 0),
      pos: mean(honest.map(r => r.pos)),
    };
    const b = {
      pts: mean(broken.map(r => r.pts)), conf: mean(broken.map(r => r.conf)),
      req: mean(broken.map(r => r.requests)), mor: mean(broken.map(r => r.mor)),
      top: mean(broken.map(r => r.topMor)), sack: broken.reduce((s, r) => s + r.sacked, 0),
      pos: mean(broken.map(r => r.pos)),
    };
    summary[club] = { h, b };
    diffs.push(h.pts - b.pts);
    console.log(`   ${club}, ${RUNS} seasons an arm:`);
    console.log(`     KEEPS HIS WORD:  ${h.pts.toFixed(1)} pts (#${h.pos.toFixed(1)}), board ${h.conf.toFixed(0)}, squad morale ${h.mor.toFixed(1)}, best XI morale ${h.top.toFixed(1)}, ${h.req.toFixed(2)} transfer requests, sacked ${h.sack}/${RUNS}`);
    console.log(`     EVERYONE A STAR: ${b.pts.toFixed(1)} pts (#${b.pos.toFixed(1)}), board ${b.conf.toFixed(0)}, squad morale ${b.mor.toFixed(1)}, best XI morale ${b.top.toFixed(1)}, ${b.req.toFixed(2)} transfer requests, sacked ${b.sack}/${RUNS}`);

    // These two gaps are enormous and never flap, so they carry the assertions.
    if (h.mor <= b.mor + 10) fail(`${club}: over-promising costs only ${(h.mor - b.mor).toFixed(1)} squad morale`);
    if (h.req >= b.req * 0.5) fail(`${club}: over-promising produced ${b.req.toFixed(2)} transfer requests against ${h.req.toFixed(2)}, which is not a cost`);
    if (h.req > 4) fail(`${club}: a manager who keeps his word still gets ${h.req.toFixed(2)} transfer requests a season, which is the FC 26 complaint`);

  }

  const gap = mean(diffs);
  const confGap = mean(CLUBS.map(c => summary[c].h.conf - summary[c].b.conf));
  console.log(`   league points from keeping your word, averaged over the three clubs: ${gap.toFixed(2)} (${diffs.map(d => d.toFixed(1)).join(', ')})`);
  console.log(`   board confidence from keeping your word, same average: ${confGap.toFixed(2)}`);
  /* Board confidence is pooled for the same reason the points are. One club's
     end of season confidence is a random walk that spends real time pinned at
     nought or a hundred, so a per club assertion on it flapped at Aston Villa
     in two runs out of three before it was pooled. */
  if (confGap <= 2) fail(`the board notices ${confGap.toFixed(2)} confidence between a manager who keeps his word and one who does not`);
  /* Round 125's lesson about margins. A single club's difference carries about
     three points of two sigma noise at this sample size, which is the same size
     as the effect, so a per club assertion here WOULD flap. Pooling the three
     brings that to under two, and the measured pooled gap sits around three, so
     one point is inside the headroom and still well clear of nothing. */
  if (gap <= 0.75) fail(`keeping your word is worth only ${gap.toFixed(2)} league points, which is noise`);
  /* And the other rail. This system sits on top of eleven rounds of balance
     work and it is not allowed to become the whole game. */
  if (gap > 12) fail(`keeping your word is worth ${gap.toFixed(2)} league points, which drowns out everything else in the sim`);
  for (const club of CLUBS) {
    const { h, b } = summary[club];
    if (h.pts - b.pts > 12) fail(`${club}: the promise system alone swings ${(h.pts - b.pts).toFixed(1)} points`);
  }
}

/* ---------- 6. Breaking it has a cost you can point at ---------- */
console.log('6) A transfer request is a real thing, not a notification');
{
  let s = startCareer('Everton');
  ensureRoles(s);
  const p = s.squad.filter(x => !x.isYouth && x.rating >= 74).sort((a, b) => b.rating - a.rating)[0];
  const settled = sellValue(p);
  const asked = sellValue({ ...p, wantsOut: true });
  console.log(`   ${p.name} is worth ${settled}m settled and ${asked}m once he has asked to leave`);
  if (asked >= settled) fail('a public transfer request costs nothing on his value');
  if (asked < settled * 0.6) fail('a transfer request wipes out so much value that selling is never an option');

  // and the phone rings for him
  const withReq = JSON.parse(JSON.stringify(s));
  withReq.squad = withReq.squad.map(x => (x.id === p.id ? { ...x, wantsOut: true } : x));
  let bidRuns = 0, bidsFor = 0, bidsForSettled = 0;
  for (let i = 0; i < 200; i++) {
    bidRuns += 1;
    const a = JSON.parse(JSON.stringify(withReq));
    a.transferWindow = 'summer';
    const openedA = playNextEntry({ ...a, week: a.calendar.findIndex(e => e.type === 'window') }).state;
    if ((openedA.incomingBids ?? []).some(x => x.playerId === p.id)) bidsFor += 1;
    const c = JSON.parse(JSON.stringify(s));
    const openedB = playNextEntry({ ...c, week: c.calendar.findIndex(e => e.type === 'window') }).state;
    if ((openedB.incomingBids ?? []).some(x => x.playerId === p.id)) bidsForSettled += 1;
  }
  console.log(`   over ${bidRuns} January windows: ${bidsFor} bids for him once he wants out, ${bidsForSettled} while he was settled`);
  if (bidsFor <= bidsForSettled) fail('nobody comes in for a player who has publicly asked to leave');
  if (bidsFor < bidRuns * 0.4) fail('a transfer request barely makes the phone ring');
}

/* ---------- 7. The mistake is recoverable, and it is not free ---------- */
console.log('7) Renegotiating: it works, it costs, and it is not a way out of everything');
{
  let s = startCareer('Manchester City');
  ensureRoles(s);
  const man = s.squad.filter(p => !p.isYouth).sort((a, b) => b.rating - a.rating)[6];
  s.squad = s.squad.map(p => (p.id === man.id ? { ...p, role: 'star', morale: 40, wantsOut: true } : p));
  const before = s.budget;
  const cost = roleChangeCost(s.squad.find(p => p.id === man.id), 'rotation');
  const after = setSquadRole(s, man.id, 'rotation');
  if (!after) { fail('a role change with money in the bank was refused'); }
  else {
    const now = after.squad.find(p => p.id === man.id);
    console.log(`   ${man.name} on ${man.wage}k a week, star down to rotation: ${cost}m settlement, budget ${before}m to ${after.budget}m, morale ${man.morale} to ${now.morale}, request withdrawn ${!now.wantsOut}`);
    if (cost <= 0) fail('going back on a promise is free');
    if (after.budget >= before) fail('the settlement never left the budget');
    if (now.morale >= 40) fail('being demoted did not bother him at all');
    if (now.wantsOut) fail('sitting down and renegotiating did not take the request off the table');
    if (now.role !== 'rotation') fail('the new rung did not stick');
  }
  // going UP costs nothing in money and he likes it
  const up = setSquadRole(s, man.id, 'star');
  if (up) fail('promoting a man who is already a star was allowed');
  const kid = s.squad.filter(p => roleOf(p) === 'backup')[0];
  if (kid) {
    const promoted = setSquadRole(s, kid.id, 'key');
    if (!promoted) fail('promoting a backup was refused');
    else {
      const now = promoted.squad.find(p => p.id === kid.id);
      console.log(`   ${kid.name} promoted backup to key first teamer: cost ${(s.budget - promoted.budget).toFixed(1)}m, morale ${kid.morale} to ${now.morale}`);
      if (promoted.budget !== s.budget) fail('moving a man UP the ladder cost money');
      if (now.morale <= kid.morale) fail('being told you matter more did not lift him');
    }
  }
  // and you cannot buy your way out with no money
  const skint = { ...s, budget: 0 };
  const star = skint.squad.filter(p => roleOf(p) === 'star')[0];
  if (star && roleChangeCost(star, 'backup') > 0) {
    if (setSquadRole(skint, star.id, 'backup')) fail('a settlement went through with an empty budget');
  }
  // the settlement is anchored on his wage, not on a number that happens to be nearby
  const rich = { ...s.squad[0], wage: 300 };
  const poor = { ...s.squad[0], wage: 12 };
  const rc = roleChangeCost({ ...rich, role: 'star' }, 'rotation');
  const pc = roleChangeCost({ ...poor, role: 'star' }, 'rotation');
  console.log(`   dropping a 300k a week man two rungs costs ${rc}m, a 12k a week man ${pc}m`);
  if (rc <= pc * 4) fail('the settlement barely reads his wage, so it is the same price for everybody');
}

/* ---------- 8. The dressing room, and the word he asks for ---------- */
console.log('8) One unhappy man is felt by the rest, and the inbox can fix him');
{
  /* This one is measured on PAIRED SEEDS, and it has to be. The thing being
     measured is a bleed of well under one morale a week onto everybody who is
     not sulking, and squad morale at any given moment swings twenty points on
     the last three results, so an unpaired A/B at forty runs a side came back
     with the two arms in the WRONG order twice in three attempts. Same seed
     both sides means the same league, the same fixtures and very nearly the
     same results, and the three men on the bench are the only difference. */
  const realRandom = Math.random;
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const WEEKS = 20;
  const run = (poison, seed) => {
    Math.random = mulberry32(seed);
    let s = startCareer('Aston Villa');
    s.xiIds = autoPickXI(s.squad, FORMATIONS[s.formationIndex] ?? FORMATIONS[0]);
    ensureRoles(s);
    const bench = s.squad
      .filter(p => !s.xiIds.includes(p.id) && !p.isYouth && p.rating >= 72)
      .sort((a, b) => b.rating - a.rating).slice(0, 3);
    const ids = new Set(bench.map(p => p.id));
    // Same three men benched in both arms. Only what they were told differs.
    s.squad = s.squad.map(p => (ids.has(p.id) ? { ...p, role: poison ? 'star' : 'backup' } : p));
    const fixed = [...s.xiIds];
    for (let i = 0; i < WEEKS && s.week < s.calendar.length; i++) {
      s.xiIds = [...fixed];
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    Math.random = realRandom;
    return mean(s.squad.filter(p => fixed.includes(p.id)).map(p => p.morale));
  };
  const SEEDS = 200;
  const calm = [], poisoned = [], diffs = [];
  for (let i = 0; i < SEEDS; i++) {
    const a = run(false, 4000 + i);
    const b = run(true, 4000 + i);
    calm.push(a); poisoned.push(b); diffs.push(a - b);
  }
  const gap = mean(diffs);
  console.log(`   ${SEEDS} paired seasons: the XI sits on ${mean(calm).toFixed(1)} morale with a settled bench and ${mean(poisoned).toFixed(1)} with three men on it who were promised the earth`);
  console.log(`   paired difference ${gap.toFixed(2)} morale (2se ${se2(diffs).toFixed(2)})`);
  if (gap <= 1.5) fail(`three furious men in the building are worth ${gap.toFixed(2)} morale to everybody else, which is nothing`);
  if (gap > 25) fail(`three unhappy men cost the rest of the squad ${gap.toFixed(2)} morale, which no manager could ever come back from`);

  // The corridor conversation happens, and answering it does something.
  let s = startCareer('Everton');
  s.xiIds = autoPickXI(s.squad, FORMATIONS[s.formationIndex] ?? FORMATIONS[0]);
  ensureRoles(s);
  const benched = s.squad.filter(p => !s.xiIds.includes(p.id) && !p.isYouth).sort((a, b) => b.rating - a.rating)[0];
  s.squad = s.squad.map(p => (p.id === benched.id ? { ...p, role: 'star' } : p));
  const fixed = [...s.xiIds];
  let talks = 0, requests = 0, answeredHonestly = 0, spent = 0;
  for (let i = 0; i < 40 && s.week < s.calendar.length; i++) {
    s.xiIds = [...fixed];
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    // Answer everything, the way a player actually would, so the inbox never
    // silts up and blocks the very message this is looking for.
    for (const m of (s.inbox ?? []).filter(x => !x.resolved)) {
      if (m.kind === 'roleTalk') talks += 1;
      if (m.kind === 'wantMove') requests += 1;
      const honest = m.options.findIndex(o => o.effect === 'setRole');
      const idx = honest >= 0 ? honest : 0;
      const before = s.budget;
      s = answerMessage(s, m.id, idx);
      if (honest >= 0) { answeredHonestly += 1; spent += before - s.budget; }
    }
    if (r.kind === 'seasonOver') break;
  }
  console.log(`   one season of benching a man you called a star: ${talks} corridor conversations, ${requests} written requests, ${answeredHonestly} of them settled by telling him the truth for ${spent.toFixed(1)}m`);
  if (talks === 0) fail('a man you promised the earth to and then benched never once asks you about it');
  if (talks + requests === 0) fail('nobody says anything at all');

  // Every option on every message a season can produce must be answerable.
  let broke = 0;
  for (const m of (s.inbox ?? [])) {
    for (let i = 0; i < Math.max(1, m.options.length); i++) {
      const fresh = { ...s, inbox: s.inbox.map(x => ({ ...x, resolved: undefined })) };
      const out = answerMessage(fresh, m.id, i);
      if (!out || !Array.isArray(out.squad) || out.squad.length !== s.squad.length) broke += 1;
    }
  }
  if (broke > 0) fail(`${broke} inbox answers left the save in a bad state`);
}

/* ---------- 9. A save from before any of this existed ---------- */
console.log('9) Old saves repair themselves, twice over');
{
  const s = startCareer('Leeds United');
  const legacy = JSON.parse(JSON.stringify(s));
  for (const p of legacy.squad) { delete p.role; delete p.lastTen; delete p.wantsOut; }
  ensureRoles(legacy);
  const noRole = legacy.squad.filter(p => !p.role).length;
  const noWindow = legacy.squad.filter(p => !Array.isArray(p.lastTen)).length;
  console.log(`   repaired ${legacy.squad.length} players: ${noRole} without a role, ${noWindow} without a window`);
  if (noRole > 0 || noWindow > 0) fail('the repair left players unhandled');
  const snapshot = JSON.stringify(legacy);
  ensureRoles(legacy);
  if (JSON.stringify(legacy) !== snapshot) fail('the repair changed an already repaired save');

  // and a full pre-round save plays a season and rolls over without a crash
  const old = JSON.parse(JSON.stringify(startCareer('Ajax')));
  for (const p of old.squad) { delete p.role; delete p.lastTen; delete p.wantsOut; }
  let played = runSeason(old);
  const stillMissing = played.squad.filter(p => !p.role).length;
  console.log(`   a pre-round Ajax save played a full season: ${stillMissing} players still without a role afterwards`);
  if (stillMissing > 0) fail('playNextEntry did not repair the save it was handed');
  const done = finishSeason(played);
  const next = startNextSeason(done.state);
  const carried = next.squad.filter(p => p.role).length;
  const windows = next.squad.filter(p => (p.lastTen ?? []).length > 0).length;
  const grudges = next.squad.filter(p => p.wantsOut).length;
  console.log(`   after the summer: ${carried}/${next.squad.length} still carry a role, ${windows} carry last season's window, ${grudges} carry last season's transfer request`);
  if (carried === 0) fail('the summer wiped every promise you had made');
  if (windows > 0) fail("last season's ten games followed him into August");
  if (grudges > 0) fail("last season's transfer request followed him into August");
  // a new club means a new dressing room
  const moved = startNextSeason(done.state, done.state.pendingSummary?.offers?.[0]?.club);
  if (moved.squad.some(p => !p.role)) fail('changing clubs left somebody without a role');
}

/* ---------- 10. Nothing here breaks a normal save ---------- */
console.log('10) A manager who never opens the screen is where he always was');
{
  const RUNS = 60;
  const pts = [], reqs = [], sacked = [];
  for (let i = 0; i < RUNS; i++) {
    let s = runSeason(startCareer('Everton'));
    const row = s.table.find(t => t.club === s.clubName);
    pts.push(row ? row.pts : 0);
    reqs.push(s.squad.filter(p => p.wantsOut).length);
    sacked.push(s.sacked ? 1 : 0);
  }
  console.log(`   ${RUNS} do nothing Everton seasons: ${mean(pts).toFixed(1)} pts (2se ${se2(pts).toFixed(1)}), ${mean(reqs).toFixed(2)} transfer requests, sacked ${sacked.reduce((a, b) => a + b, 0)}/${RUNS}`);
  /* Before this round the same do nothing season came out at 44.4 points over
     forty runs. The promises system is not allowed to move that number much in
     either direction, because eleven rounds of balance sit on it. */
  if (mean(pts) < 36 || mean(pts) > 54) fail(`a do nothing Everton season now finishes on ${mean(pts).toFixed(1)} points, and it used to be 44.4`);
  if (mean(reqs) > 6) fail(`a manager who touched nothing collected ${mean(reqs).toFixed(2)} transfer requests`);
  if (sacked.reduce((a, b) => a + b, 0) > RUNS * 0.6) fail('a do nothing season now gets you sacked more often than not');
}

/* ---------- 11. Copy check ---------- */
console.log('11) Copy check');
{
  const files = [
    'src/lib/clubManager.ts',
    'src/components/club-manager/RolesScreen.tsx',
    'src/components/club-manager/SquadScreen.tsx',
    'src/components/club-manager/InboxCard.tsx',
    'src/hooks/useClubManager.ts',
    'src/pages/ClubManager.tsx',
    'scripts/simRoles.mjs',
  ];
  let dashes = 0;
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) { dashes++; fail(`${f}:${i + 1} has an em or en dash`); }
    });
  }
  if (dashes === 0) console.log(`   ${files.length} files clean`);
}

console.log(failures === 0 ? '\nALL ROLE CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

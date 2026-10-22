/**
 * Round 584 harness: Stadium Tycoon's league keeps playing while you are away.
 * Fifth round of the tycoon merge (docs/design/round-580-tycoon-merge.md).
 *
 * THE RULE. A matchday plays for every 28 minutes of a trip away (30 until Round
 * 1539, contract section 22), on the same
 * capped clock the away pay reads (awaySecondsOf), starting by finishing the
 * match in progress. The final matchday of a season never plays away, so a title,
 * a promotion and a Summit prize always happen with you watching. Away matchdays
 * pay no goal or win bonus. The milestones and badges an away matchday reaches
 * settle after it, as they would have live.
 *
 * THE RISK. An away match that is not the live match: a private loop that drifts
 * from tick() and plays a different game while you are gone, a count that pays a
 * closed tab and a hidden one differently, matches that slip money in, or a title
 * won in your absence.
 *
 * SECTIONS, in node over the bundled lib:
 *   1 Identity. 40 seeded clubs, 5 matches each through tick() at the hook's own
 *     cadence against playAwayMatchdays on the same roll stream: every scoreline,
 *     result, streak, matchNo, totalMatches and table row identical.
 *   2 Count. 0s, 29s, 1,679s, 1,680s, 1,799s, 3h, 7h, 8h away play 0, 0, 0, 1, 1,
 *     6, 15, 17 on the hook's own formula, read out of the hook, for a division 6
 *     club at its first matchday (17 is the clock and the final's hold at once), and
 *     8h plays 13 for a division 3 club there (its 14 matchday season's hold).
 *   3 No goal or win bonuses. 200 clubs away for 16 matchdays: money and lifetime
 *     move by exactly the milestones reached, and no other event pays.
 *   4 Finale waits. Every division, every matchday, with and without a leftover
 *     friendly: no title, promotion or season end, and the final matchday unplayed.
 *     It does NOT fence the friendly's own slot (a leftover friendly costs no league
 *     matchday): with that slot dropped every section here stays green (Round 1539
 *     review, mutation nofriendly). simTycoonScorelines S2's frozen body hash of
 *     awayMatchdaysPlayable and playFirstVisitDialogs' plant (the friendly plus 17,
 *     ABORTED otherwise) are what fence it.
 *   5 Outcome against baseline. The frozen V1 lib plays no away matchday; 40
 *     mid-season clubs away eight hours play a mean at or above the fence, and a
 *     squad of 50 wins clearly more of its away matches than a squad of 0.
 *   6 Firsts. A streak milestone or badge reached away is kept even when the run
 *     ends before you come back.
 * and in vitest over the real hook, src/test/tycoonAway.test.tsx:
 *   1 to 6 (Round 439's away pay) stay exact, 7 the load path counts, 8 a hidden
 *   tab plays as many as a closed one.
 *
 * CONTROLS, each a broken copy of the lib, run through both halves:
 *   off     away matchdays never play                          red 1, 2, 3, 5 and vitest 7, 8
 *   copy    a private loop without the squad's defence         red 1
 *   cash    away minutes pay their bonuses                     red 3 and vitest 3
 *   finale  the final matchday may play away                   red 2, 3, 4 and vitest 7
 *           (3 as well: a Summit title won away pays its prize, which is money;
 *           2 since Round 1539: the division 3 row plays min(17, 14) = 14, not 13)
 *   counter a matchday ends when the match counter moves           red 4
 *   nofirsts milestones and badges wait for the first live tick     red 6
 * The review before this round shipped found the counter overrun and the lost
 * streak firsts, both past green gates; sections 4's doctored counters and 6 are
 * its cases.
 *
 * Control copies go to dist/.tycoon-away-md-control-<name>/. Never run this while a
 * build is running.
 *
 * Run: node scripts/simTycoonAwayMatchdays.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const HOOK = path.join(ROOT, 'src/hooks/useStadiumTycoon.ts');
const FROZEN = path.join(ROOT, 'scripts/fixtures/tycoonV1/stadiumTycoon.ts');
const TEST = 'src/test/tycoonAway.test.tsx';
const SECTIONS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
/* Measured on the first run (Round 584): the 40 mid-season clubs away eight hours
   played a mean of 10.10 matchdays (seeded, so it does not wander). The fence sits
   under that and far above the 0 the old game plays. */
const MEAN_FENCE = 8;
/* Measured on the first run: a squad of 50 won 94.8% of its away matches and a
   squad of 0 won 8.8%, an 86 point gap on fixed seeds. Half that is the fence: far
   under the measurement, far over what a loop that ignored the squad could reach.
   Round 1532 re-anchors the two clubs to each division's par plus and minus 20 law
   points (S5 below); measured 2026-10-21 (remote check r1532-b3): 91.2% against
   4.0%, a gap of 0.87, as step 1 predicted. */
const WIN_GAP_FENCE = 0.5;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const stripComments = code => code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonawaymd-'));
const controlDirs = [];
process.on('exit', () => {
  for (const d of controlDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

function mustReplace(text, from, to, what) {
  if (text.split(from).length - 1 !== 1) abort(`  control: ${what} does not carry exactly one ${JSON.stringify(from.slice(0, 70))}, so this control would prove nothing`);
  return text.replace(from, to);
}
async function bundle(entry, name) {
  const out = path.join(tmp, `${name}-${Math.random().toString(36).slice(2)}.mjs`);
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`, { cwd: ROOT, shell: true });
  return import('file:///' + out.split(path.sep).join('/'));
}
const mulberry = seed => {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

/* The hook's own cadence and its own count, read out of the hook. */
const hookCode = stripComments(read(HOOK));
const cadence = /if \(acc >= ([0-9.]+)\)/.exec(hookCode);
if (!cadence) abort('cannot find the tick threshold in useStadiumTycoon.ts, so the cadence here would be a guess');
const DT = Number(cadence[1]);
const HOOK_COUNT = 'Math.floor(awaySecondsOf(trip, now) / AWAY_MATCHDAY_SEC)';

/** A club the away rules can be asked about. */
function clubOf(T, k, division, extra = {}) {
  const f = T.newTycoon(0);
  return {
    ...f,
    rep: k % 3,
    levels: { ...f.levels, squad: (k * 7) % 60 },
    minute: (k * 13) % 90,
    streak: k % 6,
    legacyPerks: k % 3 === 0 ? { shield: 1 } : {},
    league: T.newLeague(k % 3, division, k % 4),
    bestDivision: division,
    ...extra,
  };
}

function matchesOf(events) {
  const out = [];
  let gf = 0;
  let ga = 0;
  const minutes = [];
  for (const e of events) {
    if (e.kind === 'goal') { gf += 1; minutes.push(`f${e.minute}`); }
    if (e.kind === 'conceded') { ga += 1; minutes.push(`a${e.minute}`); }
    if (e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss') {
      out.push(`${e.kind} ${gf}-${ga} [${minutes.join(' ')}]`);
      gf = 0; ga = 0; minutes.length = 0;
    }
  }
  return out;
}
const tableOf = st => JSON.stringify((st.league?.clubs ?? []).map(c => [c.name, c.w, c.d, c.l, c.gf, c.ga, c.pts]));

function sections(T) {
  const out = { S1: [], S2: [], S3: [], S4: [], S5: [], S6: [] };
  const notes = {};

  /* 1 identity */
  let identical = 0;
  let compared = 0;
  for (let k = 0; k < 40; k += 1) {
    const s = clubOf(T, k, 3 + (k % 7));
    const n = T.awayMatchdaysPlayable(s, 5);
    if (n !== 5) { out.S1.push(`club ${k} could only play ${n} of 5, so the comparison would be short`); continue; }
    let live = s;
    const liveEvents = [];
    const rollA = mulberry(5840 + k);
    for (let guard = 0; (live.totalMatches ?? 0) < (s.totalMatches ?? 0) + n && guard < 200000; guard += 1) {
      const r = T.tick(live, DT, rollA);
      live = r.state;
      liveEvents.push(...r.events);
    }
    const away = T.playAwayMatchdays(s, n, mulberry(5840 + k));
    const a = matchesOf(liveEvents);
    const b = matchesOf(away.events);
    compared += a.length;
    const fields = [
      ['scorelines', a.join(' | '), b.join(' | ')],
      ['streak', live.streak, away.state.streak],
      ['totalWins', live.totalWins, away.state.totalWins],
      ['totalGoals', live.totalGoals, away.state.totalGoals],
      ['groundWins', live.groundWins, away.state.groundWins],
      ['matchNo', live.matchNo, away.state.matchNo],
      ['totalMatches', live.totalMatches, away.state.totalMatches],
      ['table', tableOf(live), tableOf(away.state)],
    ];
    const diff = fields.find(([, x, y]) => x !== y);
    if (diff) out.S1.push(`club ${k}: ${diff[0]} differ, live ${String(diff[1]).slice(0, 120)} against away ${String(diff[2]).slice(0, 120)}`);
    else identical += a.length;
  }
  notes.S1 = `${identical} of ${compared} matches identical between tick() at ${DT}s and playAwayMatchdays on the same rolls`;
  if (compared < 200) out.S1.push(`only ${compared} matches were compared`);

  /* 2 count */
  if (!hookCode.includes(HOOK_COUNT)) out.S2.push(`the hook no longer counts away matchdays as ${HOOK_COUNT}, so this section is not reading the game's rule`);
  /* Round 1539: the clock is 28 minutes. The division 6 club starts at matchday 0 of
     an 18 matchday season, so its 8 hour row is the clock and the final's hold at once
     (floor(28800 / 1680) = 17 = 18 - 1). The division 3 club's 14 matchday season
     holds at 13 under either clock, which tells the hold from the clock: the finale
     control lets it play 14 (min(17, 14)), so that control turns this section red too. */
  const top = clubOf(T, 1, 6, { minute: 0, savedAt: 0 });
  const third = clubOf(T, 1, 3, { minute: 0, savedAt: 0 });
  const absences = [
    [0, 0, top], [29, 0, top], [1679, 0, top], [1680, 1, top], [1799, 1, top],
    [3 * 3600, 6, top], [7 * 3600, 15, top], [8 * 3600, 17, top], [8 * 3600, 13, third],
  ];
  const counts = absences.map(([sec, , club]) => T.awayMatchdaysPlayable(club, Math.floor(T.awaySecondsOf(club, sec * 1000) / T.AWAY_MATCHDAY_SEC)));
  const played = absences.map(([sec, , club]) => {
    const n = Math.floor(T.awaySecondsOf(club, sec * 1000) / T.AWAY_MATCHDAY_SEC);
    const r = T.playAwayMatchdays(club, n, mulberry(sec + 1));
    return (r.state.totalMatches ?? 0) - (club.totalMatches ?? 0);
  });
  absences.forEach(([sec, want, club], i) => {
    if (played[i] !== want) out.S2.push(`${sec}s away in division ${club.league.division} played ${played[i]} matchdays (the count said ${counts[i]}), the rule says ${want}`);
  });
  notes.S2 = `absences of 0s, 29s, 1,679s, 1,680s, 1,799s, 3h, 7h, 8h (division 6) and 8h (division 3) played ${played.join(', ')}`;

  /* 3 money: no goal or win bonus away. The only money an away matchday can move
     is a milestone it reached, exactly as that milestone pays live. */
  let moved = 0;
  let matches3 = 0;
  let milestoneMoney = 0;
  for (let k = 0; k < 200; k += 1) {
    const s = clubOf(T, k, k % 10, { money: 1000 + k, lifetime: 5000 + k, fanbase: 400, levels: { ...T.newTycoon(0).levels, stands: 10, squad: (k * 7) % 60 } });
    const r = T.playAwayMatchdays(s, 16, mulberry(900 + k));
    matches3 += (r.state.totalMatches ?? 0) - (s.totalMatches ?? 0);
    const firsts = r.events.reduce((sum, e) => sum + (e.kind === 'milestone' ? e.amount ?? 0 : 0), 0);
    milestoneMoney += firsts;
    const bonus = r.events.find(e => e.amount !== undefined && e.kind !== 'milestone');
    if (bonus || !Object.is(r.state.money, s.money + firsts) || !Object.is(r.state.lifetime, s.lifetime + firsts)) {
      moved += 1;
      if (out.S3.length < 3) out.S3.push(`club ${k}: money ${s.money} to ${r.state.money} with ${firsts} of milestones${bonus ? `, and a ${bonus.kind} paid ${bonus.amount}` : ''}`);
    }
  }
  if (matches3 === 0) out.S3.push('no away matchday was played, so nothing was held still');
  notes.S3 = `200 clubs played ${matches3} away matchdays; ${moved} moved money beyond the ${milestoneMoney} their milestones paid`;

  /* 4 finale */
  let cases = 0;
  let maxPlayed = 0;
  for (let division = 0; division < T.DIVISIONS.length; division += 1) {
    const shape = T.leagueShape(division);
    for (let md = 0; md < shape.matchdays; md += 1) {
      for (const friendly of [false, true]) {
        const base = clubOf(T, md, division, { minute: (md * 29) % 90 });
        const league = { ...base.league, matchday: md, ...(friendly ? { carryover: 'Old Friendly FC' } : {}) };
        const s = { ...base, league };
        const r = T.playAwayMatchdays(s, 16, mulberry(division * 100 + md));
        cases += 1;
        maxPlayed = Math.max(maxPlayed, r.results.length);
        const loud = r.events.filter(e => e.kind === 'title' || e.kind === 'seasonEnd' || e.kind === 'promoted');
        const lg = r.state.league;
        const why = loud.length ? `a ${loud[0].kind} happened away`
          : lg.season !== s.league.season ? 'the season turned over away'
          : lg.division !== s.league.division ? 'the division changed away'
          : (r.state.leagueTitles ?? 0) !== (s.leagueTitles ?? 0) ? 'a title was counted away'
          : lg.matchday > shape.matchdays - 1 ? 'the final matchday was played away'
          : '';
        if (why && out.S4.length < 3) out.S4.push(`division ${division}, matchday ${md}${friendly ? ' with a friendly' : ''}: ${why}`);
      }
    }
  }
  /* The review's case: a doctored match counter the loader keeps. At 2^53 adding
     one changes nothing, so a matchday that ends when the counter moves never ends. */
  for (const counter of [2 ** 53, 1e17]) {
    for (let division = 0; division < T.DIVISIONS.length; division += 1) {
      const base = clubOf(T, 2, division, { totalMatches: counter, matchNo: counter, minute: 89, levels: { ...T.newTycoon(0).levels, squad: 200 } });
      const r = T.playAwayMatchdays(base, 16, () => 0.001);
      cases += 1;
      const loud = r.events.filter(e => e.kind === 'title' || e.kind === 'seasonEnd' || e.kind === 'promoted');
      const fullTimes = r.events.filter(e => e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss').length;
      if ((loud.length || fullTimes !== r.results.length || r.state.league.division !== division) && out.S4.length < 3) {
        out.S4.push(`a match counter of ${counter} in division ${division}: ${fullTimes} full times for ${r.results.length} listed results${loud.length ? `, and a ${loud[0].kind}${loud[0].amount ? ` paying ${loud[0].amount}` : ''}` : ''}`);
      }
    }
  }
  notes.S4 = `${cases} starting points across ${T.DIVISIONS.length} divisions (20 with a doctored match counter), up to ${maxPlayed} away matchdays each, and the final matchday always waited`;

  /* 6 firsts: a streak milestone or badge reached away is kept even when the run
     ends before you come back. Found by the review: 285 of 2,000 eight hour trips
     reached five straight wins away and came home under five, and got nothing. */
  const streakFirsts = [
    ...T.MILESTONES.filter(x => x.hit({ ...T.newTycoon(0), streak: 5 }) && !x.hit({ ...T.newTycoon(0), streak: 4 })).map(x => ({ kind: 'milestone', id: x.id, need: 5, has: st => (st.claimed ?? []).includes(x.id) })),
    ...T.ACHIEVEMENTS.filter(x => x.hit({ ...T.newTycoon(0), streak: 5 }) && !x.hit({ ...T.newTycoon(0), streak: 4 })).map(x => ({ kind: 'badge', id: x.id, need: 5, has: st => (st.ach ?? []).includes(x.id) })),
    ...T.ACHIEVEMENTS.filter(x => x.hit({ ...T.newTycoon(0), streak: 10 }) && !x.hit({ ...T.newTycoon(0), streak: 9 })).map(x => ({ kind: 'badge', id: x.id, need: 10, has: st => (st.ach ?? []).includes(x.id) })),
  ];
  if (streakFirsts.length < 3) out.S6.push(`only ${streakFirsts.length} streak milestones and badges were found, so this section is not reading the tables`);
  let peaked = 0;
  let lostRun = 0;
  /* Round 1532: under the scoring law a Squad of 30 to 59 in division 6 (rivals at
     61 law points) is 10 to 36 points short and never strings five wins together,
     so this case was never reached. The trips now start 10 to 29 levels above the
     division's par (8.5 to 24.6 points), where runs of five and of ten happen and
     some of them end before home, the case the review found. */
  const par6 = Math.round(T.DIVISIONS[6].rivalStrength / T.SQUAD_POINTS);
  for (let k = 0; k < 400; k += 1) {
    const s = { ...T.newTycoon(0), levels: { ...T.newTycoon(0).levels, squad: par6 + 10 + (k % 20) }, league: T.newLeague(k % 3, 6, k % 5), bestDivision: 6 };
    const r = T.playAwayMatchdays(s, 16, mulberry(6600 + k));
    let run = 0;
    let peak = 0;
    for (const m of r.results) { run = m.result === 'W' ? run + 1 : m.result === 'L' ? 0 : run; peak = Math.max(peak, run); }
    for (const f of streakFirsts) {
      if (peak < f.need) continue;
      peaked += 1;
      if (r.state.streak < f.need) lostRun += 1;
      if (!f.has(r.state) && out.S6.length < 3) out.S6.push(`trip ${k}: a run of ${peak} wins away, home on a streak of ${r.state.streak}, and the ${f.kind} ${f.id} was never given`);
    }
  }
  if (lostRun === 0) out.S6.push('no trip ended its run before coming home, so the case the review found was never exercised');
  notes.S6 = `${peaked} streak firsts reached away across 400 trips, ${lostRun} of them on runs that ended before home, all of them kept`;

  /* 5 outcome against baseline */
  const means = [];
  let losses = 0;
  let poorMatches = 0;
  for (let k = 0; k < 40; k += 1) {
    const division = 3 + (k % 7);
    const s = clubOf(T, k, division, { savedAt: 0 });
    s.league = { ...s.league, matchday: Math.floor(T.leagueShape(division).matchdays / 3) };
    const n = Math.floor(T.awaySecondsOf(s, 8 * 3600e3) / T.AWAY_MATCHDAY_SEC);
    means.push(T.playAwayMatchdays(s, n, mulberry(77 + k)).results.length);
    const poor = { ...T.newTycoon(0), league: T.newLeague(0, 0, k), savedAt: 0 };
    const pr = T.playAwayMatchdays(poor, 16, mulberry(4000 + k)).results;
    losses += pr.filter(x => x.result === 'L').length;
    poorMatches += pr.length;
  }
  const mean = means.reduce((a, b) => a + b, 0) / means.length;
  if (!(mean >= MEAN_FENCE)) out.S5.push(`40 mid-season clubs away eight hours played a mean of ${mean.toFixed(2)} matchdays, under the fence of ${MEAN_FENCE}`);
  /* The count above is arithmetic, as the review pointed out, so the outcome is
     measured too: a strong squad must win clearly more of its away matches than a
     squad of nothing, on the same divisions and seeds, or away play is not the match. */
  /* Round 1532: rivals now stand where their division puts them, so a fixed Squad of
     50 is strong at the bottom and hopeless at The Summit. The two clubs are anchored
     to each division's par (the Squad level whose strength equals its rivals'), plus
     and minus ceil(20 / SQUAD_POINTS) levels, which is plus and minus 20 points of the
     scoring law: the 86 point gap this fence was halved from (brief-1532 Q6, critic
     item 7). Fence and seeds unchanged. */
  const reach = Math.ceil(20 / T.SQUAD_POINTS);
  const winShare = side => {
    let w = 0;
    let all = 0;
    for (let k = 0; k < 60; k += 1) {
      const d = 3 + (k % 7);
      const squad = Math.max(0, Math.round(T.DIVISIONS[d].rivalStrength / T.SQUAD_POINTS) + side * reach);
      const s = { ...T.newTycoon(0), levels: { ...T.newTycoon(0).levels, squad }, league: T.newLeague(k % 3, d, 0), bestDivision: d };
      const r = T.playAwayMatchdays(s, 16, mulberry(8800 + k)).results;
      w += r.filter(m => m.result === 'W').length;
      all += r.length;
    }
    return all ? w / all : 0;
  };
  const strong = winShare(1);
  const weak = winShare(-1);
  if (!(strong - weak >= WIN_GAP_FENCE)) out.S5.push(`a club ${reach} Squad levels above its division's par won ${(100 * strong).toFixed(1)}% of its away matches and one ${reach} below won ${(100 * weak).toFixed(1)}%, a gap under the ${100 * WIN_GAP_FENCE} point fence`);
  notes.S5 = `mean ${mean.toFixed(2)} away matchdays over eight hours (fence ${MEAN_FENCE}); away win share ${(100 * strong).toFixed(1)}% for par plus ${reach} Squad levels against ${(100 * weak).toFixed(1)}% for par minus ${reach} (fence ${100 * WIN_GAP_FENCE} points); a club that buys nothing lost ${poorMatches ? ((100 * losses) / poorMatches).toFixed(0) : 0}% of its ${poorMatches} away matches`;
  return { out, notes };
}

function report(result, withNotes) {
  for (const k of SECTIONS) {
    console.log(`   ${result.out[k].length ? 'RED ' : 'ok  '} ${k}${result.out[k].length ? `: ${result.out[k][0]}` : withNotes ? `: ${result.notes[k]}` : ''}`);
  }
}

function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) { console.error(text.slice(-3000)); return null; }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-1500) : null;
  rows.notes = [...text.matchAll(/AWAY\| (.+)/g)].map(m => m[1].trim());
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) rows.push({ title: a.title || '', status: a.status, messages: (a.failureMessages || []).join('\n') });
  }
  return rows;
}
const sectionOf = title => Number((title.match(/^(\d+)/) || [])[1] || 0);
const detail = m => (m.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('at ')) || '').replace(/^AssertionError: /, '').slice(0, 220);

console.log('Round 584: the league keeps playing while you are away');
console.log(`   driving tick() at the hook's cadence, dt = ${DT}s`);
console.log('');
console.log('A) the shipped lib');
const T = await bundle(LIB, 'today');
const plain = sections(T);
report(plain, true);
for (const k of SECTIONS) for (const m of plain.out[k]) fail(`${k}: ${m}`);
const V1 = await bundle(FROZEN, 'v1');
const v1Plays = typeof V1.playAwayMatchdays === 'function' ? 'a playAwayMatchdays' : 'no away matchday';
console.log(`   baseline: the frozen V1 lib has ${v1Plays}, so the old game plays 0 away matchdays`);
if (typeof V1.playAwayMatchdays === 'function') fail('the frozen V1 lib is not the old game, it already plays away matchdays');

console.log('');
console.log('A.hook) the real hook, src/test/tycoonAway.test.tsx');
const live = runSuite({});
if (!live) abort('  FAIL: the away suite produced no report');
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < 8) fail(`only ${live.length} of the 8 away tests ran`);
for (const note of live.notes.filter(n => /matchday/.test(n))) console.log(`     ${note}`);

const PLAYABLE = '  const n = awayMatchdaysPlayable(s, count);';
const AWAY_MINUTE = 'playMinute(st, roll, events, { pay: false }, edge)';
const FINAL = '  const beforeFinal = Math.max(0, leagueShape(lg.division).matchdays - 1 - lg.matchday);';
function copyLoop(text) {
  const start = text.indexOf('export function playMinute(');
  const end = text.indexOf('\n}\n', start);
  if (start < 0 || end < 0) abort('  control copy: playMinute is not in stadiumTycoon.ts, so this control would prove nothing');
  const body = text.slice(start, end + 3)
    .replace('export function playMinute(', 'function awayMinuteCopy(')
    .split('roll() < oppChancePerMin(st, edge)').join("roll() < Math.max(0.008, Math.min(0.14, oppChancePerMin(st, edge) + levelOf(st, 'squad') * 0.0008))");
  if (!body.includes("levelOf(st, 'squad') * 0.0008")) abort('  control copy: the opponent roll is not in playMinute, so the copy would match the original');
  return mustReplace(text, AWAY_MINUTE, 'awayMinuteCopy(st, roll, events, { pay: false }, edge)', 'stadiumTycoon.ts') + '\n' + body;
}
const CONTROLS = [
  { name: 'off', why: 'away matchdays never play', build: t => mustReplace(t, PLAYABLE, '  const n = 0;', 'stadiumTycoon.ts'), red: ['S1', 'S2', 'S3', 'S5', 'S6'], green: ['S4'], vRed: [7, 8], vGreen: [1, 2, 3, 4, 5, 6] },
  /* Round 1532: the private loop adds back the old defence term, levelOf(squad) x
     0.0008 a minute, which at a Squad 24 levels over par is about six goals a match
     against, so S5's strong club loses too, and S6's clubs (Squad 82 to 101) never
     string five wins together: S5 and S6 join S1 in this control's red set. */
  { name: 'copy', why: 'the away minutes run a private loop whose opponent reads a different chance', build: copyLoop, red: ['S1', 'S5', 'S6'], green: ['S2', 'S3', 'S4'], vRed: [], vGreen: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: 'cash', why: 'away minutes pay their goal and win bonuses', build: t => mustReplace(t, AWAY_MINUTE, 'playMinute(st, roll, events, { pay: true }, edge)', 'stadiumTycoon.ts'), red: ['S3'], green: ['S1', 'S2', 'S4', 'S5', 'S6'], vRed: [3], vGreen: [1, 2, 4, 5, 6, 7, 8] },
  {
    name: 'counter',
    why: 'a matchday ends when the match counter moves, the review\'s overrun on a doctored counter',
    build: t => mustReplace(
      mustReplace(t, "    let result: TickEvent['kind'] | null = null;\n", "    let result: TickEvent['kind'] | null = null;\n    const before = st.totalMatches ?? 0;\n", 'stadiumTycoon.ts (counter)'),
      'guard <= 90 && result === null;', 'guard <= 90 && (st.totalMatches ?? 0) === before;', 'stadiumTycoon.ts (loop)'),
    red: ['S4'], green: ['S1', 'S2', 'S3', 'S5', 'S6'], vRed: [], vGreen: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    name: 'nofirsts',
    why: 'away matchdays leave milestones and badges for the first live tick again',
    build: t => mustReplace(t, '    settleFirsts(st, events);\n    results.push(', '    results.push(', 'stadiumTycoon.ts'),
    red: ['S6'], green: ['S1', 'S2', 'S3', 'S4', 'S5'], vRed: [], vGreen: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  { name: 'finale', why: 'the final matchday of a season may play away', build: t => mustReplace(t, FINAL, '  const beforeFinal = Math.max(0, leagueShape(lg.division).matchdays - lg.matchday);', 'stadiumTycoon.ts'), red: ['S2', 'S3', 'S4'], green: ['S1', 'S5', 'S6'], vRed: [7], vGreen: [1, 2, 3, 4, 5, 6, 8] },
];
for (const control of CONTROLS) {
  console.log('');
  console.log(`B.${control.name}) negative control: ${control.why}`);
  const dir = path.join(ROOT, 'dist', `.tycoon-away-md-control-${control.name}`);
  controlDirs.push(dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'stadiumTycoon.ts');
  fs.writeFileSync(file, control.build(read(LIB)));
  const lib = await bundle(file, `control-${control.name}`);
  const result = sections(lib);
  report(result, false);
  for (const s of control.red) if (result.out[s].length === 0) fail(`control ${control.name}: ${s} stayed green, so that check is dead`);
  for (const s of control.green) if (result.out[s].length > 0) fail(`control ${control.name}: ${s} went red too (${result.out[s][0]})`);
  const rows = runSuite({ TYCOON_LOADS_STADIUM_LIB: file.replaceAll('\\', '/') });
  fs.rmSync(dir, { recursive: true, force: true });
  if (!rows) { fail(`control ${control.name}: no vitest report`); continue; }
  if (rows.loadError) { fail(`control ${control.name}: the broken lib did not load:\n${rows.loadError}`); continue; }
  for (const row of rows) {
    const n = sectionOf(row.title);
    const want = control.vRed.includes(n) ? 'failed' : 'passed';
    const graded = control.vRed.includes(n) || control.vGreen.includes(n);
    console.log(`   ${!graded ? '--  ' : row.status === want ? 'ok  ' : 'BAD '} ${row.status.padEnd(6)} ${row.title}`);
    if (control.vRed.includes(n)) {
      if (row.status !== 'failed') fail(`control ${control.name}: vitest "${row.title}" stayed green`);
      else console.log(`         measured: ${detail(row.messages)}`);
    }
    if (control.vGreen.includes(n) && row.status !== 'passed') fail(`control ${control.name}: vitest "${row.title}" went red too (${detail(row.messages)})`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonAwayMatchdays: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonAwayMatchdays: green.');
console.log('   Away matchdays are the live match on the same rolls, one per 28 minutes, hidden or closed alike.');
console.log('   They pay no goal or win bonus, keep what they reach, and the final matchday of every season waits for you.');
console.log(`   All ${CONTROLS.length} controls fired exactly where they should, in node and in the real hook.`);

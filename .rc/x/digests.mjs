/* Review probe: the two daily games that deal from the Club Manager engine,
   Manager Hot Seat and Deadline Day, dealt and played through for 21 dates
   (2026-10-01 to 2026-10-21) on HEAD and on a true bundle of origin/main,
   and compared. After the previous fixer's dailyDigest.mjs and
   deadlineDigest.mjs (release-al-int scratch), which this copies the method of. */
import fs from 'node:fs';
import { ROOT, OUT, MAIN_SHA, bundleEngine, mainTree, sha, fail, done } from './sholib.mjs';

const EXTRA = [['hs', 'src/lib/managerHotSeat.ts'], ['dd', 'src/lib/deadlineDay.ts']];
const H = await bundleEngine(ROOT, 'head', null, EXTRA);
const M = await bundleEngine(mainTree(), 'main', null, EXTRA);
const dates = [];
for (let d = 1; d <= 21; d++) dates.push(`2026-10-${String(d).padStart(2, '0')}`);
const scrub = v => JSON.stringify(v, (k, x) => (k === 'id' && typeof x === 'string' && /\d{10,}/.test(x) ? 'ID' : x));

function hotSeat(hs, date) {
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: setup.daily });
  const row = {
    club: setup.club, seed: setup.seed,
    takeover: { position: run.takeover.position, played: run.takeover.played, points: run.takeover.points, form: run.takeover.form.join(''), week: run.takeover.week },
    target: run.target, matches: [], pens: 0,
  };
  let guard = 0;
  while (!run.verdict && guard++ < 40) {
    if (hs.pendingPress(run)) { run = hs.answerHotSeatPress(run, 0); continue; }
    run = hs.playHotSeatMatch(run, 'balanced', null);
    const m = run.log[run.log.length - 1];
    if (m.pens) row.pens += 1;
    row.matches.push(`${m.compLabel} ${m.home ? 'H' : 'A'} ${m.opponent} ${m.myGoals}-${m.oppGoals}${m.pens ? 'p' : ''} board ${m.board}`);
  }
  row.actions = run.actions;
  row.verdict = run.verdict ? `${run.verdict.kind} ${run.verdict.points}/${run.verdict.target}` : 'NONE';
  row.whole = sha(scrub(run));
  return row;
}
function deadline(dd, date) {
  const setup = dd.dailyDeadlineDay(date);
  let run = dd.startDeadlineDay(setup);
  const opened = sha(JSON.stringify({ b: run.startBudget, n: run.needs.map(n => [n.slot ?? n.label ?? '', n.level ?? '']), t: run.targets.map(t => [t.mp.name, t.mp.rating, t.mp.price ?? t.mp.value ?? '', t.mp.club ?? '', t.need, t.rival ? t.rival.club + t.rival.offer : '']), s: run.sales.map(x => [x.name, x.position]) }));
  const stateHash = sha(scrub(run.state ?? null));
  const wholeOpen = sha(scrub(run));
  run = dd.endDay(run);
  const g = dd.gradeWindow(run);
  return { club: setup.club, opened, stateHash, wholeOpen, grade: JSON.stringify(g).slice(0, 200) };
}

let hsSame = 0; let ddSame = 0; let hsPens = 0;
const out = { head: {}, main: {} };
for (const date of dates) {
  const a = hotSeat(H.hs, date); const b = hotSeat(M.hs, date);
  out.head[date] = { hs: a }; out.main[date] = { hs: b };
  hsPens += a.pens;
  if (JSON.stringify(a) === JSON.stringify(b)) hsSame += 1;
  else fail(`Hot Seat ${date}: HEAD deals ${a.club} ${a.verdict} (${a.whole}), main ${b.club} ${b.verdict} (${b.whole})`);
  const c = deadline(H.dd, date); const d = deadline(M.dd, date);
  out.head[date].dd = c; out.main[date].dd = d;
  if (JSON.stringify(c) === JSON.stringify(d)) ddSame += 1;
  else fail(`Deadline Day ${date}: HEAD deals ${c.club} ${c.opened}, main ${d.club} ${d.opened}`);
  console.log(`${date} | Hot Seat ${a.club}, ${a.matches.length} matches, ${a.verdict}, run ${a.whole} | Deadline Day ${c.club} opened ${c.opened} state ${c.stateHash}`);
}
console.log(`Hot Seat: ${hsSame} of ${dates.length} dates equal to origin/main ${MAIN_SHA.slice(0, 8)} (deal, every match, verdict, the whole run hashed); ${hsPens} matches in them went to penalties`);
console.log(`Deadline Day: ${ddSame} of ${dates.length} dates equal (deal, opening save, grade)`);
fs.writeFileSync(`${OUT}/digests.json`, JSON.stringify(out, null, 1));
done('digests');

// Release AT review (area cm): do the dailies that deal from the Club Manager engine deal the SAME day?
// usage, from a tree's root: node cmDaily.mjs <base|head> <shared dir>
//   base: run in a worktree of 54e3820a (Release AS), writes <dir>/daily-base.json
//   head: run in the merged head, writes <dir>/daily-head.json, compares with base, exit 1 on any difference
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2];
const shared = process.argv[3];
const root = process.cwd();
const out = process.env.RC_OUT || shared;
fs.mkdirSync(shared, { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-daily-'));
const entry = path.join(work, 'entry.ts');
const P = f => JSON.stringify(path.join(root, f).split(path.sep).join('/'));
fs.writeFileSync(entry, [
  'export * as hs from ' + P('src/lib/managerHotSeat.ts') + ';',
  'export * as dd from ' + P('src/lib/deadlineDay.ts') + ';',
  'export * as cm from ' + P('src/lib/clubManager.ts') + ';',
].join(String.fromCharCode(10)));
const bundle = path.join(work, 'daily.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
// v2: every date is dealt by a FRESH copy of the engine module, the way a page load deals it, so a counter one
// day moved cannot leak into the next day's digest.
const req = createRequire(import.meta.url);
let hs, dd;
const freshEngine = () => { delete req.cache[req.resolve(bundle)]; store.clear(); ({ hs, dd } = req(bundle)); };
freshEngine();

const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
// The key itself is one extra field on the head. Strip it so a digest only moves when the DEAL moves.
const strip = v => JSON.stringify(v, (k, val) => (k === 'realLeagueFixtures' ? undefined : val));
const N = Number(process.env.DAILY_DATES || 60);
const dates = [];
for (let i = 0; i < N; i++) dates.push(new Date(Date.UTC(2026, 9, 10 + i)).toISOString().slice(0, 10));

function hotSeat(date) {
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  const opened = {
    club: setup.club, league: setup.leagueName, seed: setup.seed,
    bound: run.state.realLeagueFixtures ?? null,
    takeover: run.takeover, target: run.target,
    next: hs.upcoming(run),
    tableSha: sha(strip(run.state.table)),
    stateSha: sha(strip(run.state)),
  };
  // One fixed way to play the day: balanced, no talk, first press answer.
  let guard = 0;
  while (!run.verdict && guard++ < 40) {
    const q = hs.pendingPress(run);
    run = q ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  }
  const played = {
    log: run.log.map(m => [m.compLabel, m.opponent, m.home, m.myGoals, m.oppGoals, m.res]),
    verdict: run.verdict ? [run.verdict.kind, run.points] : null,
    endSha: sha(strip(run.state)),
  };
  // A refreshed page rebuilds the run from its seed and saved choices.
  const again = hs.replayHotSeat(run.setup, run.actions);
  const replaySame = sha(strip(again.state)) === played.endSha;
  return { opened, played, replaySame, share: run.verdict ? hs.shareText(run) : null };
}

function deadline(date) {
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.startDeadlineDay(setup);
  const bound = run.state?.realLeagueFixtures ?? null;
  const ended = dd.endDay(run);
  const grade = dd.gradeWindow(ended);
  return { club: setup.club, league: setup.leagueName, bound, runSha: sha(strip(run)), endSha: sha(strip(ended)), grade: sha(strip(grade)) };
}

const rows = [];
for (const date of dates) {
  let h, d;
  freshEngine();
  try { h = hotSeat(date); } catch (e) { h = { error: String(e && e.message || e) }; }
  freshEngine();
  try { d = deadline(date); } catch (e) { d = { error: String(e && e.message || e) }; }
  rows.push({ date, hotSeat: h, deadline: d });
}
fs.writeFileSync(path.join(shared, `daily-${mode}.json`), JSON.stringify(rows));
console.log(`cmDaily ${mode}: ${rows.length} dates dealt, ${rows.filter(r => r.hotSeat.error).length} hot seat errors, ${rows.filter(r => r.deadline.error).length} deadline errors`);
if (mode !== 'head') process.exit(0);

const base = JSON.parse(fs.readFileSync(path.join(shared, 'daily-base.json'), 'utf8'));
const lines = [];
const tally = { dates: rows.length, first14: { hotSame: 0, hotDiffer: 0, ddSame: 0, ddDiffer: 0 }, all: { hotSame: 0, hotDiffer: 0, ddSame: 0, ddDiffer: 0 },
  hotBoundDays: 0, hotBoundDiffer: 0, hotUnboundDiffer: 0, ddBoundDays: 0, ddBoundDiffer: 0, pickDiffers: 0, replayBroken: 0 };
rows.forEach((r, i) => {
  const b = base[i];
  const J = JSON.stringify;
  const pickSame = J([r.hotSeat.opened?.club, r.hotSeat.opened?.seed]) === J([b.hotSeat.opened?.club, b.hotSeat.opened?.seed]);
  const openSame = J({ ...r.hotSeat.opened, bound: 0 }) === J({ ...b.hotSeat.opened, bound: 0 });
  const playSame = J(r.hotSeat.played) === J(b.hotSeat.played);
  const hotSame = pickSame && openSame && playSame;
  const ddSame = J({ ...r.deadline, bound: 0 }) === J({ ...b.deadline, bound: 0 });
  const bound = !!r.hotSeat.opened?.bound;
  for (const t of i < 14 ? [tally.first14, tally.all] : [tally.all]) {
    t[hotSame ? 'hotSame' : 'hotDiffer'] += 1; t[ddSame ? 'ddSame' : 'ddDiffer'] += 1;
  }
  if (!pickSame) tally.pickDiffers += 1;
  // What a player can SEE of the day: the club, the table place walked into, the target, the next match, every result.
  const vis = x => J([x.opened?.club, x.opened?.takeover, x.opened?.target, x.opened?.next, x.played?.log, x.played?.verdict, x.share]);
  const visSame = vis(r.hotSeat) === vis(b.hotSeat);
  if (!visSame) { tally.hotVisibleDiffer = (tally.hotVisibleDiffer ?? 0) + 1; (tally.hotVisibleDates ??= []).push(`${r.date} ${r.hotSeat.opened?.club}`); }
  else if (!hotSame) tally.hotDigestOnly = (tally.hotDigestOnly ?? 0) + 1;
  if (bound) { tally.hotBoundDays += 1; if (!hotSame) tally.hotBoundDiffer += 1; } else if (!hotSame) tally.hotUnboundDiffer += 1;
  if (r.deadline.bound) { tally.ddBoundDays += 1; if (!ddSame) tally.ddBoundDiffer += 1; }
  if (!r.hotSeat.replaySame) tally.replayBroken += 1;
  const tk = x => x.opened ? `${x.opened.takeover.position}/${x.opened.takeover.clubs} P${x.opened.takeover.played} ${x.opened.takeover.points}pts wk${x.opened.takeover.week} target ${x.opened.target} next ${J(x.opened.next).slice(0, 90)}` : x.error;
  const pl = x => x.played ? `${x.played.log.map(m => `${m[1]} ${m[3]}-${m[4]}`).join(', ')} => ${J(x.played.verdict)}` : '';
  lines.push(`${r.date} HOT ${r.hotSeat.opened?.club} (${r.hotSeat.opened?.league}) bound=${bound ? 'yes' : 'no'} ${hotSame ? 'SAME' : 'DIFFERENT'} | DEADLINE ${r.deadline.club} bound=${r.deadline.bound ? 'yes' : 'no'} ${ddSame ? 'SAME' : 'DIFFERENT'}`);
  if (!hotSame) {
    lines.push(`    AS   opened: ${tk(b.hotSeat)}`); lines.push(`    head opened: ${tk(r.hotSeat)}`);
    lines.push(`    AS   played: ${pl(b.hotSeat)}`); lines.push(`    head played: ${pl(r.hotSeat)}`);
  }
});
const NL = String.fromCharCode(10);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'daily-compare.txt'), lines.join(NL) + NL + JSON.stringify(tally, null, 2) + NL);
console.log(lines.slice(0, 60).join(NL));
console.log(JSON.stringify(tally));
const ok = tally.all.hotDiffer === 0 && tally.all.ddDiffer === 0;
console.log(ok ? `cmDaily: SAME DEAL on all ${tally.dates} dates, both dailies` : `cmDaily: RE-DEAL. Hot Seat differs on ${tally.all.hotDiffer} of ${tally.dates} dates (${tally.first14.hotDiffer} of the first 14), Deadline Day on ${tally.all.ddDiffer} (${tally.first14.ddDiffer} of the first 14); bound days ${tally.hotBoundDays}, of which ${tally.hotBoundDiffer} differ; unbound days that differ ${tally.hotUnboundDiffer}`);
process.exit(ok ? 0 : 1);

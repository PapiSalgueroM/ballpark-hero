// Reviewer probe (a runner only, sent as .rc/x/sack1593.mjs): does playing the Europa League get a manager sacked?
// For each club: season one on a fixed stream, its cup final handed to it (the walk's crafted route C), then season
// two on SACK_TRIES streams, twice: on the HEAD (the club plays the Europa League) and on the head with only the play
// opt in dropped (scripts/lib/worldUelPlay.mjs PLAY_EDITS: the same club watches it). Same season one, same streams.
// Prints per club: sacked count each arm, the median sack week, the board's objectives at a sack. Exit 0 always.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { engineOf, tape } = await import(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs'));
const { PLAY_EDITS } = await import(path.join(ROOT, 'scripts/lib/worldUelPlay.mjs'));
const cannot = why => { console.log(`sack1593: could not run. ${why}`); process.exit(2); };
const HEAD = await engineOf(ROOT, 'head', {}, cannot);
const OFF = await engineOf(ROOT, 'off', { edits: PLAY_EDITS }, cannot);
const opts = { skipHalftime: true, noCoach: true };
const CLUBS = (process.env.SACK_CLUBS || 'Crystal Palace,Everton,Brentford,Fulham,Nottingham Forest,Bournemouth,Aston Villa,Real Betis').split(',');
const TRIES = Number(process.env.SACK_TRIES || 10);
const clone = s => JSON.parse(JSON.stringify(s));
const tot = { head: 0, off: 0, n: 0 };
for (const [c, club] of CLUBS.entries()) {
  const row = {};
  for (const [arm, E] of [['head', HEAD], ['off', OFF]]) {
    const M = await E.fresh();
    let t = tape(0x2a000 + c, () => M.cm.startCareer(club)).value;
    for (let i = 0; i < 400 && t.week < t.calendar.length; i += 1) t = tape(0x2a100 + c * 512 + i, () => M.cm.playNextEntry(t, opts)).value.state;
    const f = tape(0x2a200 + c, () => M.cm.finishSeason(t)).value.state;
    const cf = (f.cupBracket ?? []).find(x => x.round === 'F');
    if (cf) cf.winner = club;
    const start = tape(0x2a300 + c, () => M.cm.startNextSeason(f)).value;
    const plays = start.worldComps?.uel?.me === club;
    const weeks = [];
    let objs = '';
    for (let a = 0; a < TRIES; a += 1) {
      let q = clone(start);
      for (let i = 0; i < 300 && q.week < q.calendar.length && !q.sacked; i += 1) q = tape(0x7000 + c * 65536 + a * 4096 + i, () => M.cm.playNextEntry(q, opts)).value.state;
      if (q.sacked) {
        weeks.push(q.week);
        if (!objs) objs = (M.cm.evaluateObjectives ? '' : '') + (q.boardObjectives ?? []).map(o => o.id).join(',');
      }
    }
    row[arm] = { plays, conf0: Math.round(start.boardConfidence), sacked: weeks.length, weeks: weeks.sort((x, y) => x - y).join('/'), objs, cal: start.calendar.length, uel: start.calendar.filter(e => e.type === 'uel').length };
    tot[arm] += weeks.length;
  }
  tot.n += TRIES;
  console.log(`${club}: head ${JSON.stringify(row.head)} | off ${JSON.stringify(row.off)}`);
}
console.log(`sack1593: sacked in season two, head (plays) ${tot.head} of ${tot.n}, opt in dropped ${tot.off} of ${tot.n}`);

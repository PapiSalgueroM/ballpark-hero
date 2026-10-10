/**
 * Round 1146 harness: the quick sim's coach uses his bench after the break.
 *
 * A player's report, 2026-10-08: "if i quick sim a game then it should
 * automatically make subs". Round 1072's coach replaced injured men and took
 * off men who were already spent at the break, so a fit eleven played ninety
 * minutes unchanged. This round he looks at his bench twice after the break
 * (QUICK_LEGS_WINDOWS in src/lib/clubManager.ts says how). The failure modes:
 * he still changes nothing; he weakens the side in a match that is still
 * alive; he spends the change he keeps for an injury; he stops being "a
 * manager making the same changes by hand" (he draws from the seeded stream);
 * the report does not show what he did.
 *
 * What it plays. FLEET: careers (clubs x seeds x SEASONS whole seasons), every
 * match a quick sim, once by the engine as committed (the candidate) and once
 * by the same engine with the one restLegs call taken out (the baseline, which
 * is the coach before the round). The two fleets part at the first change, so
 * they are two samples and are only ever compared as shares and means. BY
 * HAND: the first REPLAY careers are played once more, on a second copy of the
 * candidate engine and the same seed, with every match stopped at the break
 * and finished by hand: the changes on the quick sim's own report, made one at
 * a time through changeLive, with his rule read off the save just before each
 * one. Sections:
 *
 *   1 gap      with the round, the bench is used in far more matches than
 *              without it (the share of matches with at least one change)
 *   2 rule     every change of his after the break that is not for an injury
 *              falls on one of the match's two keyed minutes, never takes the
 *              keeper or a man who came on off, and either leaves the eleven
 *              no weaker by the engine's own strength or comes with my side
 *              two goals clear
 *     order    the man going off is a man on a yellow before anyone else,
 *              then the one with the least left in his legs: nobody he
 *              should have looked at first had a change open to him
 *     fresher  the man coming on is fresher than the man going off (more
 *              fitness, or the same and better morale), the break's own test
 *     fit      and he plays there: natural in that slot or the same family
 *   3 reserve  when he makes one, at most one change had been made before it
 *              and two fit men were on the bench
 *     thin     with ONE fit man on the bench he makes no change for legs
 *              (a save built for it: a fleet's benches are never that thin)
 *     clock    with the clock already past his first look he does not go
 *              back to it (a save built for it too)
 *   4 manual   a manager making the same changes by hand at the same minutes
 *              gets the same match, report and save, byte for byte
 *   5 report   the full time report lists every change he made, and its
 *              timeline has a row for each
 *
 * order, fresher and fit are the three clauses the help and What's New
 * promise ("a booked man first, then the least fit, for a fresher man who
 * plays there"). The round's first review deleted each of them in turn with
 * every gate green, because sections 2 and 3 read the minute, the keeper, the
 * strength and the reserve and never a yellow card, the incoming man's legs
 * or his fit. They are read off the save just before each change by the
 * harness's own code (the card list, the two men's fitness and morale, the
 * engine's fitGrade for the slot), not by asking the coach's.
 *
 * MEASURED on a GitHub runner, 2026-10-09, the default fleet (6 clubs x 3
 * seeds x 2 seasons, 36 seasons an arm) on five seed sets, with the round
 * against without it. Re-taken at a0b1e0b7, after the round's review fixed
 * what a substitute's match is worth in a player's last ten (windowEntry in
 * the engine): that moves morale, so every number here moved a little.
 *   seedset  changes a match  of which legs  bench used in    W percent    points a season  goals for, against a match
 *   0        1.64 / 0.73      0.97           88.3% / 47.3%    55.4 / 52.9  69.89 / 68.44    1.72, 0.95 / 1.73, 0.99
 *   1        1.62 / 0.70      0.97           88.4% / 46.4%    54.8 / 53.2  70.19 / 67.81    1.63, 0.93 / 1.76, 1.02
 *   2        1.71 / 0.74      0.99           90.4% / 47.9%    56.4 / 54.3  69.92 / 67.89    1.67, 0.95 / 1.73, 1.00
 *   3        1.69 / 0.66      0.97           89.2% / 44.9%    53.8 / 54.5  66.69 / 69.14    1.64, 0.99 / 1.75, 0.97
 *   4        1.70 / 0.73      1.05           91.0% / 47.2%    55.8 / 52.6  71.08 / 67.42    1.70, 0.91 / 1.71, 1.00
 * So before the round the bench came on in under half of all quick sims (an
 * injury in 0.25 of them, a spent man at the break in 0.46) and never after
 * the break unless somebody was hurt; with it, in nine in ten, about one
 * change for legs a match, and a season's appearances go to 21.6 men instead
 * of 20.5 (581 against 533).
 * Results. The two arms are separate samples of about 1,650 matches a seed
 * set, so one set reads a share of wins to about 1.7 points and a season's
 * points to about 2, and the five together to about 0.8 and 0.9. Wins are
 * 55.2 percent with the round and 53.5 without, points a season 69.6 and
 * 68.1: a point and a half of each, about two of those errors, so "a little
 * better if anything" is all this fleet can say, and it asserts nothing on
 * it. Goals do move a little: 1.67 for and 0.95 against a match with the
 * round, 1.74 and 1.00 without, about one goal in twenty five fewer at each
 * end. That is the engine's existing rule for ANY change, yours included: the
 * rest of the half is drawn again off the score as it stands at that minute
 * (the other side's shape reads it), and he now makes a change in most
 * matches. Nothing here asserts on results; the season balance harnesses do.
 * His rule, read on 1,229 matches played again by hand (527 of them with a
 * change for legs): 725 changes for legs, 471 with the match within a goal
 * or my side behind (the eleven no weaker every time, mean +0.09 to +0.10 of
 * the engine's strength a set) and 254 with my side two or more up (mean
 * -0.42 to -0.74, the bench given its minutes whatever it costs). 129 of the
 * 725 took a man on a yellow off (13 to 44 a set), which is what section
 * order needs to have something to read. Each of the 527 matches was played
 * twice more for the two built saves, thin and clock.
 * Section 1's bar of 20 points of matches is under half the 41 to 44 the
 * round adds; the control that takes the round out adds 0.
 *
 * NEGATIVE CONTROLS. CM_QUICK_LEGS_CONTROL=<name> patches the bundled copy of
 * the source (the anchor must occur exactly once or the run refuses) and the
 * run exits 0 only if the NAMED section went red:
 *   off      the restLegs call removed                          -> gap
 *   anyone   the "no weaker, or settled" test removed           -> rule
 *   unbooked "a man on a yellow first" dropped from the order   -> order
 *   stale    the fresher test dropped                           -> fresher
 *   anywhere the "plays there" test dropped                     -> fit
 *   nokeep   he may spend his last change on legs               -> reserve
 *   lastman  he may spend his last fit bench man on legs        -> thin
 *   noclock  he ignores where the saved clock stands            -> clock
 *   ambient  his two minutes are drawn from Math.random         -> manual
 *
 * Run: node scripts/simCmQuickLegs.mjs        (SEEDSET=n for another set of seeds)
 * Offline: bundles the engine from src, reads no network and no database.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const CONTROL = process.env.CM_QUICK_LEGS_CONTROL || '';
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const SEEDS = Number(process.env.SEEDS ?? 3);
const SEASONS = Number(process.env.SEASONS ?? 2);
const REPLAY = Number(process.env.REPLAY ?? 3);
const CLUBS = (process.env.CLUBS ?? 'Everton,Real Madrid,Ajax,Aston Villa,Barcelona,Manchester City').split(',');
/** Section 1: how much more often the bench must be used with the round than without it, in share of matches. */
const GAP = Number(process.env.GAP ?? 0.2);

const OFF = [{ file: ENGINE, from: '    restLegs(at);', to: '    void restLegs;' }];
const GUARD = 'if (live.subsUsed >= MAX_SUBS - 1 || (live.minute ?? 0) > at || benchFor(state).length < 2) return;';
const CONTROLS = {
  unbooked: { patch: [{ file: ENGINE, from: '.sort((a, b) => Number(booked.has(b.p.id)) - Number(booked.has(a.p.id)) || a.p.fitness - b.p.fitness);', to: '.sort((a, b) => a.p.fitness - b.p.fitness);' }], red: 'order' },
  stale: { patch: [{ file: ENGINE, from: '&& (p.fitness > out.p.fitness || (p.fitness === out.p.fitness && p.morale > out.p.morale)));', to: ');' }], red: 'fresher' },
  anywhere: { patch: [{ file: ENGINE, from: "benchFor(state, out.p.id).filter(p => (outFit(p) === 'natural' || outFit(p) === 'family')", to: 'benchFor(state, out.p.id).filter(p => (true)' }], red: 'fit' },
  lastman: { patch: [{ file: ENGINE, from: GUARD, to: GUARD.replace('benchFor(state).length < 2', 'benchFor(state).length < 1') }], red: 'thin' },
  noclock: { patch: [{ file: ENGINE, from: GUARD, to: GUARD.replace(' || (live.minute ?? 0) > at', '') }], red: 'clock' },
  off: { patch: OFF, red: 'gap' },
  anyone: { patch: [{ file: ENGINE, from: 'const coming = options.find(p => settled || noWeaker(p));', to: 'const coming = options[0];' }], red: 'rule' },
  nokeep: { patch: [{ file: ENGINE, from: GUARD, to: GUARD.replace('live.subsUsed >= MAX_SUBS - 1', 'live.subsUsed >= MAX_SUBS') }], red: 'reserve' },
  ambient: { patch: [{ file: ENGINE, from: 'lo + Math.floor(keyedRng(`${key}|${i}`)() * (hi - lo + 1))', to: 'lo + Math.floor(Math.random() * (hi - lo + 1))' }], red: 'manual' },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) { console.error(`simCmQuickLegs: unknown control "${CONTROL}"`); process.exit(2); }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-legs-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engine, bundled from src with a list of exact text patches applied to the bundle's copy of the source. */
async function engine(label, patches) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, ENGINE).replaceAll('\\', '/'))};\n`);
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-quick-legs-control', setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        const mine = patches.filter(p => path.resolve(ROOT, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          const n = text.split(p.from).length - 1;
          if (n !== 1) throw new Error(`control anchor occurs ${n} times, not once, in ${p.file}: ${p.from}`);
          text = text.replace(p.from, p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} patch(es) never met their file`);
  /* the bundle's address too, so a second copy of the same engine can be loaded (careerByHand) */
  return { mod: await import(pathToFileURL(out).href), href: pathToFileURL(out).href };
}

/* ---------- the seeded stream, with its place readable so a match can be played again from it ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  const draw = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.place = () => a;
  return draw;
}
function under(stream, fn) {
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = stream;
  Date.now = () => 1791302400000;
  try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; }
}

/* ---------- the sections ---------- */
const SECTIONS = ['gap', 'rule', 'order', 'fresher', 'fit', 'reserve', 'thin', 'clock', 'manual', 'report'];
const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (section, message) => red.get(section).push(message);
const tick = section => checked.set(section, checked.get(section) + 1);
const place = e => e.minute + (e.plus ?? 0) / 100;

/** What one fleet measured. */
const arm = () => ({ matches: 0, changes: 0, used: 0, none: 0, injury: 0, atBreak: 0, legs: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, seasons: 0, points: 0, appearances: 0, men: 0 });

/** One finished quick sim, counted. A change is "for an injury" when the man going off is on the report's injury list by then. */
function count(a, report, section5) {
  const d = report.detail;
  a.matches += 1;
  a.changes += d.subs.length;
  if (d.subs.length) a.used += 1; else a.none += 1;
  for (const s of d.subs) {
    const hurt = d.injuries.some(x => x.name === s.off && place(x) <= place(s));
    if (hurt) a.injury += 1;
    else if (s.minute === 46) a.atBreak += 1;
    else a.legs += 1;
  }
  const mine = report.myScorers.length;
  const theirs = report.oppScorers.length;
  a.gf += mine;
  a.ga += theirs;
  if (report.won) a.w += 1; else if (report.drawn) a.d += 1; else a.l += 1;
  if (!section5) return;
  /* Section 5: the report shows every change, in its list and on its timeline. */
  tick('report');
  const rows = d.timeline.filter(e => e.kind === 'sub' && e.side === 'me');
  if (rows.length !== d.subs.length) fail('report', `a report lists ${d.subs.length} changes and its timeline has ${rows.length} rows for them`);
  for (const s of d.subs) {
    if (!s.on || !s.off || !(s.minute >= 1)) fail('report', `a change on the report has no man or no minute: ${JSON.stringify(s)}`);
    else if (!rows.some(e => e.minute === s.minute && (e.plus ?? 0) === (s.plus ?? 0) && e.text === `${s.on} on for ${s.off}`)) fail('report', `the change ${s.on} for ${s.off} at ${s.minute}' has no timeline row`);
  }
}

/** A whole career by quick sim. With `keep`, every match's starting point (save and place in the stream) is kept for the replay. */
function playCareer(cm, club, seed, a, keep, section5) {
  const stream = seeded(seed);
  const kept = [];
  under(stream, () => {
    let s = cm.startCareer(club);
    for (let season = 0; season < SEASONS; season++) {
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 200) {
        const r = cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'match') {
          count(a, r.report, section5);
          if (keep) kept.push({ report: r.report, reportJson: JSON.stringify(r.report), stateJson: JSON.stringify(s), place: stream.place() });
        }
        if (r.kind === 'seasonOver') break;
      }
      const row = s.table.find(t => t.club === s.clubName);
      a.seasons += 1;
      a.points += row ? row.pts : 0;
      a.appearances += s.squad.reduce((n, p) => n + (p.apps ?? 0), 0);
      a.men += s.squad.filter(p => (p.apps ?? 0) > 0).length;
      s = cm.startNextSeason(cm.finishSeason(s).state);
    }
  });
  return kept;
}

/* ---------- the replay: his changes made by hand, his rule read before each one ---------- */
const legsTally = { changes: 0, live: 0, liveGain: 0, settled: 0, settledGain: 0, replayed: 0, withLegs: 0, bookedOff: 0, thin: 0, clock: 0 };

/** Sections 2 and 3 on one change of his that is not for an injury, read off the save just before it. */
function judge(cm, st, line) {
  const live = st.live;
  const out = st.squad.find(p => p.id === line.offId);
  tick('rule');
  const minutes = cm.quickLegsMinutes(st, live);
  if (!minutes.includes(line.minute) || line.plus) fail('rule', `a change at ${line.minute}' is on neither of the match's two minutes (${minutes.join(' and ')})`);
  if (!out || !live.onPitch.includes(line.offId)) { fail('rule', `the man going off at ${line.minute}' is not on the pitch`); return; }
  if (out.position === 'GK') fail('rule', `${out.name}, the keeper, was taken off for legs`);
  if ((live.subs ?? []).some(s => s.onId === line.offId)) fail('rule', `${out.name} came on and was taken off again at ${line.minute}'`);
  const now = cm.liveElevenStrength(st, line.minute);
  const then = cm.liveElevenStrength(st, line.minute, { outId: line.offId, inId: line.onId });
  const goals = xs => (xs ?? []).filter(g => g.minute <= line.minute).length;
  const lead = goals(live.h1My) + goals(live.h2My) - goals(live.h1Opp) - goals(live.h2Opp);
  const settled = lead >= cm.QUICK_LEGS_SETTLED;
  if (then < now && !settled) fail('rule', `${out.name} off at ${line.minute}' left the eleven weaker (${then.toFixed(2)} from ${now.toFixed(2)}) with my side ${lead >= 0 ? `${lead} up` : `${-lead} down`}`);
  legsTally.changes += 1;
  if (settled) { legsTally.settled += 1; legsTally.settledGain += then - now; } else { legsTally.live += 1; legsTally.liveGain += then - now; }
  /* The three clauses the help promises, each read off the save and never off his own code: who comes on is
     fresher (sections fresher) and plays there (fit), and who goes off is a man on a yellow before anyone else,
     then the one with the least left in his legs (order). */
  const coming = st.squad.find(p => p.id === line.onId);
  const formation = cm.FORMATIONS[live.formationIndex ?? st.formationIndex] ?? cm.FORMATIONS[0];
  const slotOf = id => formation.slots[live.onPitch.indexOf(id)] ?? null;
  const fresherThan = (a, b) => a.fitness > b.fitness || (a.fitness === b.fitness && a.morale > b.morale);
  const playsThere = (p, id) => { const slot = slotOf(id); const g = slot ? cm.fitGrade(p, slot) : 'wrong'; return g === 'natural' || g === 'family'; };
  tick('fresher');
  if (!coming || !fresherThan(coming, out)) fail('fresher', `${coming?.name ?? line.on} (fitness ${coming?.fitness}, morale ${coming?.morale}) came on at ${line.minute}' for ${out.name} (${out.fitness}, ${out.morale}) and is no fresher`);
  tick('fit');
  if (!coming || !playsThere(coming, out.id)) fail('fit', `${coming?.name ?? line.on} (${coming?.position}) came on at ${line.minute}' in ${out.name}'s place (${(slotOf(out.id)?.allowed ?? []).join('/')}), which he does not play`);
  tick('order');
  const gone = cm.liveGoneIds(live, line.minute);
  const cameOn = new Set((live.subs ?? []).map(s => s.onId));
  const booked = new Set([...(live.h1Cards ?? []), ...(live.h2Cards ?? [])].filter(c => c.kind === 'yellow' && c.minute <= line.minute).map(c => c.id));
  legsTally.bookedOff += booked.has(out.id) ? 1 : 0;
  /* a change was open to a man when somebody on the bench plays his place, is fresher, and keeps the side as strong (or the match is won) */
  const open = p => cm.benchFor(st, p.id).some(b => playsThere(b, p.id) && fresherThan(b, p)
    && (settled || (cm.liveElevenStrength(st, line.minute, { outId: p.id, inId: b.id }) ?? 0) >= now));
  const first = live.onPitch.map(id => st.squad.find(p => p.id === id))
    .filter(p => p && p.id !== out.id && !gone.has(p.id) && !cameOn.has(p.id) && p.position !== 'GK' && !(slotOf(p.id)?.allowed ?? []).includes('GK'))
    .filter(p => (booked.has(p.id) && !booked.has(out.id)) || (booked.has(p.id) === booked.has(out.id) && p.fitness < out.fitness))
    .find(open);
  if (first) fail('order', `${out.name} (fitness ${out.fitness}${booked.has(out.id) ? ', on a yellow' : ''}) went off at ${line.minute}' while ${first.name} (${first.fitness}${booked.has(first.id) ? ', on a yellow' : ''}) should have been looked at first and had a change open to him`);
  tick('reserve');
  if (live.subsUsed > 1) fail('reserve', `a change for legs at ${line.minute}' was his change number ${live.subsUsed + 1} of the match`);
  if (cm.benchFor(st).length < 2) fail('reserve', `a change for legs at ${line.minute}' took the last fit man off his bench`);
}

/** One match of his, finished by hand off the break: every change on the quick sim's report made through changeLive,
 *  with his rule read off the save just before each one. Throws when the engine refuses one. */
function finishByHand(cm, paused, report) {
  const plan = report.detail.subs;
  const hurtAtRestart = line => line.minute === 46 && report.detail.injuries.some(x => x.name === line.off && x.minute === 46);
  let st = paused;
  let legs = 0;
  /* The report prints a change as two names and a minute. The man going off is the one of that name on the pitch, the man coming on the one who is not. */
  const named = line => {
    const find = (name, onPitch) => (st.squad.find(p => p.name === name && st.live.onPitch.includes(p.id) === onPitch) ?? st.squad.find(p => p.name === name))?.id ?? null;
    return { ...line, offId: find(line.off, true), onId: find(line.on, false) };
  };
  const make = raw => {
    const line = named(raw);
    const next = cm.changeLive(st, line.minute, { kind: 'sub', outId: line.offId, inId: line.onId }, line.plus);
    if (!next) {
      const live = st.live;
      throw new Error(`the engine refused a change of his made by hand at ${line.minute}' (clock ${live.minute}, ${live.subsUsed} made, going off on the pitch: ${live.onPitch.includes(line.offId)}, coming on already on it: ${live.onPitch.includes(line.onId)}, second half drawn: ${!!live.h2Drawn}, by hand it is week ${live.week} against ${live.opponent} with ${live.startXi.length} starters of whom ${live.startXi.filter(id => report.detail.myRatings.some(p => p.name === (st.squad.find(q => q.id === id) ?? {}).name)).length} are on his report (${report.home} v ${report.away}), his list: ${plan.map(x => `${x.minute}${x.plus ? `+${x.plus}` : ''}`).join(' ')})`);
    }
    st = next;
  };
  for (const line of plan.filter(x => x.minute <= 45)) make(line);
  for (const line of plan.filter(x => x.minute === 46 && !hurtAtRestart(x))) make(line);
  st = cm.startSecondHalf(st);
  for (const line of plan.filter(x => (x.minute > 46 && x.minute <= 90) || hurtAtRestart(x))) {
    const hurt = [...(st.live.h1Injuries ?? []), ...(st.live.h2Injuries ?? [])].some(x => x.name === line.off && place(x) <= place(line));
    if (!hurt) { legs += 1; judge(cm, st, named(line)); }
    make(line);
  }
  if (cm.isExtraTimeDue(st)) st = cm.startExtraTime(st);
  for (const line of plan.filter(x => x.minute > 90)) make(line);
  legsTally.replayed += 1;
  if (legs) legsTally.withLegs += 1;
  return cm.resumeMatch(st);
}

/**
 * Sections thin and clock: two saves a fleet of whole careers never meets, built off a match of his that had a
 * change for legs, so a change is known to be open in it. Played on a third copy of the engine and under a stream
 * of their own, so the career by hand is not disturbed by them.
 *   thin   the bench is cut to ONE fit man, the very man he brought on for legs. He never spends his last fit man.
 *   clock  the second half is sent out by hand and the clock already stands past his first look. He does not go
 *          back to it: any change for legs he still makes sits on a keyed minute the clock has not passed.
 */
function probeGuards(cm, paused, report, seed) {
  const d = report.detail;
  const forLegs = d.subs.filter(s => s.minute > 46 && s.minute <= 90 && !d.injuries.some(x => x.name === s.off && place(x) <= place(s)));
  if (!forLegs.length) return;
  const legsMade = st => {
    const live = st.live;
    const hurt = [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])];
    return (live.subs ?? []).filter(s => s.minute > 46 && s.minute <= 90 && !hurt.some(x => (x.id ? x.id === s.offId : x.name === s.off) && place(x) <= place(s)));
  };
  const thin = JSON.parse(JSON.stringify(paused));
  const on = new Set(thin.live.onPitch);
  for (const p of thin.squad) if (!on.has(p.id) && p.name !== forLegs[0].on) p.injuryWeeks = Math.max(p.injuryWeeks ?? 0, 3);
  if (cm.benchFor(thin).length === 1) {
    const after = under(seeded(seed), () => cm.coachQuickMatch(thin));
    tick('thin');
    legsTally.thin += 1;
    const made = legsMade(after);
    if (made.length) fail('thin', `with one fit man left on the bench he still made a change for legs at ${made[0].minute}' (${made[0].on} for ${made[0].off})`);
  }
  const started = under(seeded(seed + 1), () => cm.startSecondHalf(paused));
  if (!started) return;
  const minutes = cm.quickLegsMinutes(started, started.live);
  const clock = minutes[0] + 1;
  const after = under(seeded(seed + 2), () => cm.coachQuickMatch(cm.markLiveMinute(started, clock)));
  tick('clock');
  legsTally.clock += 1;
  const late = legsMade(after).filter(s => !minutes.includes(s.minute) || s.minute < clock);
  if (late.length) fail('clock', `with the clock on ${clock}' he made a change for legs at ${late[0].minute}', which is not a look of his still to come (${minutes.join(' and ')})`);
}

/**
 * Section 4, and where sections 2 and 3 are read: the same career again, on a second copy of the same engine and
 * the same seed, with every match of mine finished BY HAND (stopped at the break, the quick sim's own list of
 * changes made one at a time). A second copy, because the engine fills a few tables the first time it needs them
 * and numbers its messages as it goes: only an engine with the same history is asked the same things. If the coach
 * is a manager making those changes by hand, the two careers never part: the same report and the same save after
 * every match, which also means the same place in the seeded stream.
 */
function careerByHand(cm, club, seed, plays, probe) {
  const stream = seeded(seed);
  under(stream, () => {
    let st = cm.startCareer(club);
    let i = 0;
    for (let season = 0; season < SEASONS; season++) {
      let guard = 0;
      while (st.week < st.calendar.length && guard++ < 200) {
        let r = cm.playNextEntry(st);
        if (r.kind === 'halftime') {
          const want = plays[i];
          if (!want) { fail('manual', `${club} seed ${seed}: the career by hand reached a match the quick sim career never played`); return; }
          probeGuards(probe, r.state, want.report, (seed + 7919 * (i + 1)) >>> 0);
          try { r = finishByHand(cm, r.state, want.report); } catch (error) { tick('manual'); fail('manual', `${club} seed ${seed}, match ${i + 1}: ${error.message}`); return; }
        }
        st = r.state;
        if (r.kind === 'match') {
          const want = plays[i];
          tick('manual');
          if (!want || JSON.stringify(r.report) !== want.reportJson) { fail('manual', `${club} seed ${seed}, match ${i + 1} (${r.report.home} v ${r.report.away}): the report of the quick sim is not the report of the same changes made by hand`); return; }
          if (JSON.stringify(st) !== want.stateJson) {
            const other = JSON.parse(want.stateJson);
            const parted = Object.keys({ ...st, ...other }).filter(key => JSON.stringify(st[key]) !== JSON.stringify(other[key]));
            fail('manual', `${club} seed ${seed}, match ${i + 1}: the save after the quick sim differs from the same changes made by hand in ${parted.slice(0, 6).join(', ')}`);
            return;
          }
          if (stream.place() !== want.place) { fail('manual', `${club} seed ${seed}, match ${i + 1} (${want.report.detail.subs.length} changes): the same report and save, but the seeded stream stands somewhere else after it`); return; }
          i += 1;
        }
        if (r.kind === 'seasonOver') break;
      }
      st = cm.startNextSeason(cm.finishSeason(st).state);
    }
    if (i !== plays.length) fail('manual', `${club} seed ${seed}: the career by hand played ${i} matches, the quick sim career ${plays.length}`);
  });
}

/* ---------- the run ---------- */
async function main() {
  const built = await engine('candidate', CONTROL ? CONTROLS[CONTROL].patch : []);
  const candidate = built.mod;
  /* the same bundle loaded a second time: its own tables, its own counters */
  const second = await import(`${built.href}?by-hand`);
  /* and a third time, for the two built saves of probeGuards */
  const probe = await import(`${built.href}?probe`);
  const baseline = (await engine('baseline', OFF)).mod;
  const pairs = [];
  for (let c = 0; c < CLUBS.length; c++) for (let k = 0; k < SEEDS; k++) pairs.push({ club: CLUBS[c], seed: 11461000 + SEEDSET * 100003 + c * 7919 + k * 104729 });
  const on = arm();
  const off = arm();
  for (const [n, pair] of pairs.entries()) {
    const kept = playCareer(candidate, pair.club, pair.seed, on, n < REPLAY, true);
    if (kept.length) careerByHand(second, pair.club, pair.seed, kept, probe);
    playCareer(baseline, pair.club, pair.seed, off, false, false);
  }

  /* Section 1: the bench is used in far more matches with the round than without. */
  const share = a => (a.matches ? a.used / a.matches : 0);
  tick('gap');
  if (share(on) - share(off) < GAP) fail('gap', `the bench is used in ${(100 * share(on)).toFixed(1)}% of quick sims with the round and ${(100 * share(off)).toFixed(1)}% without it, under the ${(100 * GAP).toFixed(0)} points the round must add`);
  if (!legsTally.changes && !CONTROL) fail('rule', `none of the ${legsTally.replayed} replayed matches had a change for legs to judge`);
  /* a section that looked at nothing is not green */
  if (!CONTROL) {
    if (!legsTally.bookedOff) fail('order', `none of the ${legsTally.changes} changes for legs took a man on a yellow off, so "booked first" was never read`);
    if (!legsTally.thin) fail('thin', 'no match was played again with one fit man on the bench');
    if (!legsTally.clock) fail('clock', 'no match was played again with the clock past his first look');
  }

  const per = (n, d) => (d ? (n / d).toFixed(2) : '0.00');
  const pc = (n, d) => (d ? (100 * n / d).toFixed(1) : '0.0');
  const line = (name, a) => `  MEASURED ${name}: ${a.matches} matches, ${per(a.changes, a.matches)} changes a match (${per(a.injury, a.matches)} for an injury, ${per(a.atBreak, a.matches)} at the break, ${per(a.legs, a.matches)} for legs after it), bench used in ${pc(a.used, a.matches)}% of matches; `
    + `W ${pc(a.w, a.matches)}% D ${pc(a.d, a.matches)}% L ${pc(a.l, a.matches)}%, ${per(a.gf, a.matches)} for and ${per(a.ga, a.matches)} against a match, ${per(a.points, a.seasons)} league points a season; ${per(a.appearances, a.seasons)} appearances a season shared by ${per(a.men, a.seasons)} men`;
  console.log(`simCmQuickLegs${CONTROL ? ` (control ${CONTROL})` : ''}: ${pairs.length} careers (${CLUBS.length} clubs x ${SEEDS} seeds, seedset ${SEEDSET}) x ${SEASONS} seasons, each by quick sim, with and without the round`);
  console.log(line('with the round', on));
  console.log(line('without it', off));
  console.log(`  MEASURED his rule, on ${legsTally.replayed} matches played again by hand (${legsTally.withLegs} with a change for legs): ${legsTally.changes} changes for legs, ${legsTally.live} with the match within a goal (mean strength ${legsTally.live ? (legsTally.liveGain / legsTally.live >= 0 ? '+' : '') + (legsTally.liveGain / legsTally.live).toFixed(3) : 'n/a'}) and ${legsTally.settled} with my side two or more up (mean ${legsTally.settled ? (legsTally.settledGain / legsTally.settled >= 0 ? '+' : '') + (legsTally.settledGain / legsTally.settled).toFixed(3) : 'n/a'}); ${legsTally.bookedOff} of them took a man on a yellow off; ${legsTally.thin} matches played again with one fit man on the bench and ${legsTally.clock} with the clock past his first look`);
  let failed = 0;
  for (const s of SECTIONS) {
    const xs = red.get(s);
    if (xs.length) { failed += 1; console.log(`  FAIL ${s}: ${xs.length} finding(s) on ${checked.get(s)} checks. ${xs.slice(0, 3).join(' | ')}`); }
    else console.log(`  ok ${s} (${checked.get(s)} checks)`);
  }
  if (CONTROL) {
    const target = CONTROLS[CONTROL].red;
    const fired = red.get(target).length > 0;
    console.log(fired
      ? `simCmQuickLegs: CONTROL ${CONTROL} FIRED, section ${target} went red as it must (red in all: ${SECTIONS.filter(s => red.get(s).length).join(', ')})`
      : `simCmQuickLegs: CONTROL ${CONTROL} did NOT fire, section ${target} stayed green`);
    return fired ? 0 : 1;
  }
  console.log(failed ? `simCmQuickLegs: FAILED, ${failed} of ${SECTIONS.length} sections red` : `simCmQuickLegs: PASS, ${SECTIONS.length} sections green`);
  return failed ? 1 : 0;
}

let code = 1;
try { code = await main(); } catch (error) { console.error(error.stack ?? String(error)); console.log('simCmQuickLegs: FAILED, the harness threw'); } finally { fs.rmSync(TMP, { recursive: true, force: true }); }
process.exit(code);

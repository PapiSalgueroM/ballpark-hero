/* simUsRivalSense.mjs (Round 1227). Does the rival of a US My Career play the player's position on the player's
   own stat line, and does "who had the better year" say what the two printed lines say?

   It plays the real engines through each sport's own descriptor (the binding the board drives): one esbuild
   bundle of src, on a seeded mulberry32 that is both Math.random and the rng handed to the engine. Nothing
   reads the network and nothing is written outside the temp folder.

   Size. Full size is 1,500 careers a sport a seed, seeds 1 to 5. RIVAL_SEEDS=1,2 and RIVAL_CAREERS=300 shrink
   it while iterating: a shrunk run prints every number and judges only the exact checks.

   THE FLEET (playFleet). Positions are cycled, every archetype of a position in turn, and in the NFL every
   second lap of the positions is a 2005 career (16 game seasons through 2020), so a season whose length is not
   the engine's own rate is always played. The loop is the engine's: a role on draft night, a camp every
   season, the season, progress, the retirement test. NO rivalry card is answered, so the player's own path is
   the draw count law and nothing else (section P1).

   Run:  node scripts/simUsRivalSense.mjs
   It ends with one line, "simUsRivalSense: N checks, F failed (full size)", and exits by F.

   THE SECTIONS are listed with their measured numbers under "WHAT WAS MEASURED" further down. */

import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = s => s.replace(/\r\n/g, '\n');
const srcOf = rel => norm(readFileSync(path.join(ROOT, rel), 'utf8'));
const SEEDS = (process.env.RIVAL_SEEDS || '1,2,3,4,5').split(',').map(Number).filter(Number.isFinite);
const CAREERS = Number(process.env.RIVAL_CAREERS || 1500);
const FULL = CAREERS >= 1500 && SEEDS.length >= 5;
const PROVE = process.env.RIVAL_PROVE || '';
const namesOf = v => (v || '').split(',').map(x => x.trim()).filter(x => x && x !== 'none');
const MOVED = namesOf(process.env.RIVAL_MOVED);
const CARDS = namesOf(process.env.RIVAL_CARDS);
const CONTROL = process.env.US_RIVAL_CONTROL || '';
const ALL = ['nfl', 'mlb', 'nhl', 'nba'];
for (const n of [...MOVED, ...CARDS]) if (!ALL.includes(n)) { console.error(`unknown sport "${n}" in RIVAL_MOVED or RIVAL_CARDS`); process.exit(2); }

/* The sports whose rival is bound to the player's own line ON THIS TREE. A bound sport is judged (U, F1, F2);
   one that is not is measured and printed (the BEFORE table). The NBA has been bound since Round 1112 and is
   judged by scripts/simNbaAwardsSense.mjs section R; here it rides the fleet for P1 and L. */
const BOUND = [];

/* NEGATIVE CONTROLS, US_RIVAL_CONTROL=<name>. Each swaps one line of source in memory (an esbuild plugin, never
   a file), refuses to run when the anchor is not there exactly once or the swap changed nothing (exit 2, "Refusing
   to run"), and must turn its own section red: the closing line names the sections that went red. */
const CONTROLS = {};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_RIVAL_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ') || '(none yet)'}`); process.exit(2); }
const edits = CONTROL ? [{ label: `control ${CONTROL}`, ...CONTROLS[CONTROL] }] : [];

function editedSource(list, file, src, onApplied = () => {}) {
  let out = src;
  for (const e of list.filter(x => file.replace(/\\/g, '/').endsWith(x.file))) {
    const hits = out.split(e.find).length - 1;
    if (hits !== 1) { console.error(`${e.label}: anchor ${e.find.slice(0, 80)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
    const was = out;
    out = out.replace(e.find, () => e.put);
    if (out === was) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
    onApplied(e);
  }
  return out;
}

const BUNDLE = {
  stdin: {
    contents: [
      "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
      "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
      "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
      "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
      "export * as nfl from './src/lib/nflMyCareer.ts';",
      "export * as awards from './src/lib/careerAwards.ts';",
      "export * as rival from './src/lib/careerRival.ts';",
      "export * as events from './src/lib/careerRivalryEvents.ts';",
      "export * as nflEvents from './src/lib/nflCareerRivalryEvents.ts';",
      "export * as lines from './src/lib/usCareerStatLine.ts';",
      "export { keyedRng } from './src/lib/keyedRng.ts';",
      "export { seasonSwing } from './src/lib/careerVariance.ts';",
      "export * as drive from './src/test/helpers/usCareerDrive.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engines with this run's control swapped in memory. */
async function bundleWith(list, tag) {
  let applied = 0;
  const plugin = {
    name: 'rival-control',
    setup(b) {
      if (!list.length) return;
      b.onLoad({ filter: /[.]ts$/ }, args => {
        if (!list.some(e => args.path.replace(/\\/g, '/').endsWith(e.file))) return undefined;
        return { contents: editedSource(list, args.path, norm(readFileSync(args.path, 'utf8')), () => { applied += 1; }), loader: 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-rival-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  if (applied !== list.length) { console.error(`${list.map(e => e.label).join(', ')}: ${applied} of ${list.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return mod;
}
/** The engines with every src file that differs from `commit` read at that commit (git show, in memory). Says
 *  how many files it took back, so a proof against a tree that is this tree cannot pass quietly. */
async function bundleAt(commit) {
  const changed = execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean);
  const served = new Set();
  const plugin = {
    name: 'rival-before',
    setup(b) {
      b.onLoad({ filter: /[.]tsx?$/ }, args => {
        const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
        if (!changed.includes(rel)) return undefined;
        let contents;
        try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; /* a file the round added */ }
        served.add(rel);
        return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-rival-${process.pid}-before.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return { mod, changed, served: [...served] };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pc = (n, d) => (d ? (100 * n) / d : 0);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const f2 = x => (Math.round(x * 100) / 100).toFixed(2);

let checks = 0; let failed = 0;
const failedSections = new Set();
/** One judged check. `exact` checks are judged at every size; a banded one only at full size. */
function check(section, cond, msg) {
  checks += 1;
  if (cond) { console.log(`   ok   ${section}: ${msg}`); return; }
  failed += 1; failedSections.add(section);
  console.log(`   FAIL ${section}: ${msg}`);
}

/* ------------------------------------------------------------------ */
/* What a printed line is, by sport and position                       */
/* ------------------------------------------------------------------ */
/* Written from the printers in src/lib/usCareerStatLine.ts (nflStatLine, mlbStatLine, nhlStatLine), part by
   part and in their order. STRICT is the player's own shape, character for character (thousands grouped, sacks
   in halves, a three place average with no leading zero). LOOSE finds the same labelled part anywhere in a
   line, so an old rival line that carries the right parts in another order or format can still be read back
   and scored: "readable" in the tables below means that. A line missing a part is "unread". */
const raw = String.raw;
const N = raw`(\d{1,3}(?:,\d{3})*)`;
const H = raw`(\d{1,3}(?:,\d{3})*(?:\.5)?)`;
const T = raw`([\d,]+(?:\.\d+)?)`;
const ERA = raw`(\d+\.\d{2})`;
const num = s => Number(s.replace(/,/g, ''));
const part = (key, tail, o = {}) => ({
  key, val: o.val ?? num,
  strict: `${o.head ?? ''}${o.strict ?? N}${tail}`,
  loose: `${o.head ?? ''}${o.loose ?? T}${o.looseTail ?? tail}`,
});
const three = { strict: raw`\.(\d{3})`, loose: raw`0?\.(\d{3})`, val: s => Number(`0.${s}`) };
const skater = [part('goals', ' G', { looseTail: ' ?G' }), part('assists', ' A', { looseTail: ' ?A' }), part('points', ' P', { looseTail: ' ?P' })];
const hitter = [part('avg', '', three), part('hr', ' HR'), part('rbi', ' RBI')];
const catcher = [part('rec', ' rec'), part('recYds', ' yds'), part('recTd', ' TD')];
const SHAPES = {
  nfl: {
    QB: [part('passYds', ' yds'), part('passTd', ' TD'), part('ints', ' INT')],
    RB: [part('rushYds', ' rush yds'), part('rushTd', ' TD'), part('rec', ' rec')],
    WR: catcher, TE: catcher,
    LB: [part('tackles', ' tackles?'), part('sacks', ' sacks?', { strict: H }), part('picks', ' INT')],
    CB: [part('picks', ' INT'), part('passDef', ' pass(?:es)? defended'), part('tackles', ' tackles?')],
    EDGE: [part('sacks', ' sacks?', { strict: H }), part('tackles', ' tackles?'), part('forcedFum', ' forced fumbles?')],
    K: [part('fgMade', raw` of [\d,]+ FG`), part('longFg', '', { head: 'long of ' })],
  },
  mlb: {
    SP: [part('wins', raw`-\d+`), part('era', ' ERA', { strict: ERA }), part('so', ' K')],
    RP: [part('saves', ' saves?'), part('holds', ' holds?'), part('era', ' ERA', { strict: ERA }), part('so', ' K')],
    C: hitter, '1B': hitter, '2B': hitter, '3B': hitter, SS: hitter, LF: hitter, CF: hitter, RF: hitter, DH: hitter,
  },
  nhl: { C: skater, LW: skater, RW: skater, D: skater, G: [part('wins', ' W'), part('svpct', ' SV%', three)] },
};
/** Is `text` the player's own shape at this position? */
function inShape(sport, pos, text) {
  const parts = SHAPES[sport]?.[pos];
  return !!parts && new RegExp(`^${parts.map(p => p.strict).join(', ')}$`).test(text);
}
/** The printed parts of a line as numbers, or null when a part is not there. */
function readBack(sport, pos, text) {
  const parts = SHAPES[sport]?.[pos];
  if (!parts) return null;
  const out = {};
  for (const p of parts) {
    const m = new RegExp(`(?:^|[ ,])${p.loose}(?=$|[ ,])`).exec(text);
    if (!m) return null;
    out[p.key] = p.val(m[1]);
  }
  return out;
}
/* A running back's line prints catches, not receiving yards, and the season score reads yards: the verdict
   reads his printed catches at 8 yards each. Typed HERE and not imported, so control `bridge` can fire. */
const RB_YARDS_A_CATCH = 8;
/** The season score of the PRINTED parts: what the screen shows decides. */
function printedScore(M, sport, pos, parts) {
  if (sport === 'nfl') return M.awards.nflSeasonScore(pos, pos === 'RB' ? { ...parts, recYds: parts.rec * RB_YARDS_A_CATCH } : parts);
  if (sport === 'mlb') return M.awards.mlbSeasonScore(pos, parts);
  return M.awards.nhlSeasonScore(pos, parts);
}

/* ------------------------------------------------------------------ */
/* The fleet                                                           */
/* ------------------------------------------------------------------ */
const FLEET = {
  nfl: { desc: M => M.NFL_CAREER_SPORT, pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'] },
  mlb: { desc: M => M.MLB_CAREER_SPORT, pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], eras: ['now'] },
  nhl: { desc: M => M.NHL_CAREER_SPORT, pos: ['C', 'LW', 'RW', 'D', 'G'], eras: ['now'] },
  nba: { desc: M => M.NBA_CAREER_SPORT, pos: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now'] },
};
const AGE_BANDS = [[0, 24, '24 and under'], [25, 27, '25 to 27'], [28, 30, '28 to 30'], [31, 33, '31 to 33'], [34, 99, '34 and over']];
const bandOf = age => AGE_BANDS.find(([lo, hi]) => age >= lo && age <= hi)[2];
const cell = () => ({ judged: 0, mine: 0, near: 0, off: 0, unread: 0, disagree: 0, careers: 0, retired: 0, badge: 0 });
const tally = () => ({ judged: 0, mine: 0 });
const bump = (o, k, mine) => { const t = (o[k] ??= tally()); t.judged += 1; if (mine) t.mine += 1; };
const sha = () => crypto.createHash('sha256');

/**
 * `per` careers of one sport on one seed, on the engines of bundle M. Returns the hashes section P1 compares
 * (the player's seasons and counters, the seasons a beat was dealt in, the notes without the rival's own, the
 * rival's trail, the beats word for word, every note) and what the tables print, by position.
 */
function playFleet(M, sport, seed, per) {
  const F = FLEET[sport]; const S = F.desc(M);
  const rnd = mulberry32(seed * 7919 + sport.charCodeAt(1) * 104729 + 1227);
  const keep = Math.random; Math.random = rnd;
  const h = { player: sha(), dealt: sha(), notes: sha(), rival: sha(), beats: sha(), allNotes: sha() };
  const by = {}; const job = {}; const age = {}; const arm = {}; const jobPos = {};
  const firstOff = []; const firstDisagree = [];
  try {
    for (let i = 0; i < per; i += 1) {
      const pos = F.pos[i % F.pos.length];
      const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
      const archs = S.create.archetypes[pos];
      const c = S.startCareer('Sim', pos, archs[i % archs.length], rnd, null, era);
      const m = (by[pos] ??= cell());
      let tq = S.rollTeamQuality(null, rnd);
      S.assignRole(c, tq, rnd);
      for (let guard = 0; guard < 30; guard += 1) {
        S.campBattle(c, tq, rnd);
        const r0 = c.rival; const judged = !!r0 && !r0.retired; const my0 = r0?.myYears ?? 0;
        const pend0 = c.pendingRivalryEvent; const role = c.role; const ageNow = c.age;
        const played = S.simSeason(c, tq, rnd);
        const r = c.rival;
        const beat = c.pendingRivalryEvent && c.pendingRivalryEvent !== pend0 ? c.pendingRivalryEvent : null;
        h.dealt.update(beat ? '1' : '0');
        h.beats.update(JSON.stringify(beat ? [beat.id, beat.emoji, beat.title, beat.description, beat.consequence] : 0));
        if (r) h.rival.update(JSON.stringify([r.lastLine, r.lastScore, r.myYears, r.hisYears, r.rings, r.ovr, r.age, r.retired, r.lastYear ?? null, r.lastAllStar ?? null]));
        const notes = played?.notes ?? [];
        h.allNotes.update(JSON.stringify(notes));
        h.notes.update(JSON.stringify(notes.filter(n => !n.startsWith('\u{1FA9E}'))));
        if (judged && sport !== 'nba') {
          const mine = r.myYears > my0;
          const hurt = notes.some(n => n.startsWith('\u{1F691}'));
          const jobNow = role === 'backup' && !(sport === 'nfl' && pos === 'K') ? 'backup' : hurt ? 'hurt' : 'starter';
          m.judged += 1; if (mine) m.mine += 1;
          if (notes.some(n => n.startsWith('\u{1FA9E}') && n.includes('Nothing in it again'))) m.near += 1;
          bump(job, jobNow, mine); bump(age, bandOf(ageNow), mine); bump(arm, `${pos} ${era}`, mine); bump(jobPos, `${pos} ${jobNow}`, mine);
          const hisText = r.lastLine; const myText = S.statLine(played.line, pos);
          if (!inShape(sport, pos, hisText)) { m.off += 1; if (firstOff.length < 3) firstOff.push(`${pos}: "${hisText}"`); }
          const his = readBack(sport, pos, hisText); const me = readBack(sport, pos, myText);
          if (!his || !me) m.unread += 1;
          else if ((printedScore(M, sport, pos, me) > printedScore(M, sport, pos, his)) !== mine) {
            m.disagree += 1;
            if (firstDisagree.length < 3) firstDisagree.push(`${pos} ${played.line.year}: mine "${myText}" his "${hisText}", the save gave the year to ${mine ? 'me' : 'him'}`);
          }
        }
        S.progress(c, rnd);
        if (S.shouldRetire(c)) break;
        tq = S.rollTeamQuality(tq, rnd);
      }
      const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
      h.player.update(JSON.stringify({ seasons: c.seasons, counters }));
      m.careers += 1;
      if (c.rival?.retired) { m.retired += 1; if (c.rival.myYears > c.rival.hisYears) m.badge += 1; }
    }
  } finally { Math.random = keep; }
  return { hash: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v.digest('hex')])), by, job, age, arm, jobPos, firstOff, firstDisagree };
}

/** Add one seed's table into a running one. */
function addInto(total, one) {
  for (const group of ['by', 'job', 'age', 'arm', 'jobPos']) {
    total[group] ??= {};
    for (const [k, v] of Object.entries(one[group])) {
      const t = (total[group][k] ??= {});
      for (const [f, n] of Object.entries(v)) t[f] = (t[f] ?? 0) + n;
    }
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* The tables                                                          */
/* ------------------------------------------------------------------ */
const shareOf = t => (t ? pc(t.mine, t.judged) : 0);
/** One sport's table, by position, with the by job, by age and by arm lines under it. */
function printTable(label, sport, total, perSeed) {
  console.log(`   ${label} ${sport}: my share of the head to head years by seed ${perSeed.map(f1).join(', ')} (mean ${f2(mean(perSeed))})`);
  for (const pos of FLEET[sport].pos) {
    const m = total.by[pos]; if (!m) continue;
    const read = m.judged - m.unread;
    const arms = FLEET[sport].eras.length > 1 ? `  (${FLEET[sport].eras.map(e => `${e} ${f1(shareOf(total.arm[`${pos} ${e}`]))}`).join(', ')})` : '';
    const hs = total.jobPos[`${pos} starter`];
    console.log(`     ${pos.padEnd(5)} judged ${String(m.judged).padStart(6)}  off shape ${f1(pc(m.off, m.judged)).padStart(5)}%  unread ${f1(pc(m.unread, m.judged)).padStart(5)}%  verdict against the printed lines: ${read ? `${f1(pc(m.disagree, read))}% disagree` : 'cannot be asked'}  my share ${f1(pc(m.mine, m.judged))}%${arms}  as a healthy starter ${f1(shareOf(hs))}% of ${hs?.judged ?? 0}  near ties ${f1(pc(m.near, m.judged))}%  rival retired behind me in ${f1(pc(m.badge, m.careers))}% of ${m.careers} careers`);
  }
  console.log(`     by job: ${['starter', 'backup', 'hurt'].map(j => `${j} ${f1(shareOf(total.job[j]))}% of ${total.job[j]?.judged ?? 0}`).join(', ')}`);
  console.log(`     by age: ${AGE_BANDS.map(([, , n]) => `${n} ${f1(shareOf(total.age[n]))}% of ${total.age[n]?.judged ?? 0}`).join(', ')}`);
}
/** Play every seed of one sport on bundle M. */
function runSport(M, sport) {
  const seeds = SEEDS.map(seed => playFleet(M, sport, seed, CAREERS));
  const total = seeds.reduce(addInto, {});
  const perSeed = seeds.map(s => { const t = Object.values(s.by).reduce((a, m) => ({ judged: a.judged + m.judged, mine: a.mine + m.mine }), tally()); return pc(t.mine, t.judged); });
  return { seeds, total, perSeed };
}

console.log(`simUsRivalSense: seeds ${SEEDS.join(', ')}, ${CAREERS} careers a sport a seed${FULL ? ' (full size)' : ' (SHRUNK: exact checks only)'}${CONTROL ? `, control ${CONTROL}` : ''}${PROVE ? `, proving against ${PROVE} (moved: ${MOVED.join(', ') || 'none'}; cards: ${CARDS.join(', ') || 'none'})` : ''}`);
const E = await bundleWith(edits, 'run');
const NOW = Object.fromEntries(ALL.map(s => [s, runSport(E, s)]));

console.log('T) the table on this tree (measured, printed; judged only where a sport is bound)');
for (const sport of ['nfl', 'mlb', 'nhl']) {
  printTable(BOUND.includes(sport) ? 'bound' : 'not bound', sport, NOW[sport].total, NOW[sport].perSeed);
  const first = NOW[sport].seeds[0];
  if (first.firstOff.length) console.log(`     off shape, for example: ${first.firstOff.join(' | ')}`);
  if (first.firstDisagree.length) console.log(`     disagreeing, for example: ${first.firstDisagree.join(' | ')}`);
}

/* ------------------------------------------------------------------ */
/* P1: the player's own path against the tree before                   */
/* ------------------------------------------------------------------ */
if (PROVE) {
  const B = await bundleAt(PROVE);
  console.log(`P1) the player's path against ${PROVE}: ${B.changed.length} src files differ, ${B.served.length} read at that commit (${B.served.join(', ') || 'none'})`);
  check('P1', B.served.length > 0, `the tree before is not this tree (${B.served.length} files taken back)`);
  const WAS = Object.fromEntries(ALL.map(s => [s, runSport(B.mod, s)]));
  console.log('B) the table on the tree before');
  for (const sport of ['nfl', 'mlb', 'nhl']) printTable('before', sport, WAS[sport].total, WAS[sport].perSeed);
  for (const sport of ALL) {
    const same = k => NOW[sport].seeds.every((s, i) => s.hash[k] === WAS[sport].seeds[i].hash[k]);
    check('P1', same('player'), `${sport}: every season line and every numeric counter on the final save is byte equal (${SEEDS.length} seeds of ${CAREERS})`);
    check('P1', same('dealt'), `${sport}: a rivalry beat is dealt in exactly the same seasons`);
    check('P1', same('notes'), `${sport}: every season note that is not the rival's own is equal line for line`);
    if (MOVED.includes(sport)) check('P1', !same('rival'), `${sport}: the rival's trail moved, as this step says it does`);
    else {
      check('P1', same('rival'), `${sport}: the rival's trail (his line, score, tally, rings, rating, age, retired, roster fact) is byte equal`);
      check('P1', same('allNotes'), `${sport}: every season note, the rival's included, is byte equal`);
      if (!CARDS.includes(sport)) check(sport === 'nba' ? 'L' : 'P1', same('beats'), `${sport}: every card dealt reads word for word and promises exactly what it did`);
    }
  }
  for (const sport of BOUND) {
    const t = Object.values(WAS[sport].total.by).reduce((a, m) => a + m.off, 0);
    check('B', t > 0, `${sport}: the tree before was not clean (${t} rival lines off the player's shape), so this proof is against the old line`);
  }
}

const size = FULL ? 'full size' : 'shrunk, exact checks only';
if (CONTROL) {
  const needs = CONTROLS[CONTROL].needs;
  const hit = needs.split(',').every(n => failedSections.has(n));
  console.log(`control ${CONTROL}: ${hit ? 'FIRED' : 'DID NOT FIRE'} (must turn ${needs} red; red: ${[...failedSections].join(', ') || 'nothing'})`);
}
console.log(`simUsRivalSense: ${checks} checks, ${failed} failed (${size})${failed ? `, red sections: ${[...failedSections].join(', ')}` : ''}`);
process.exit(failed ? 1 : 0);

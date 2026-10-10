/* Reviewer's independent probe of Round 1228's two libraries (the run lens). Reads the pushed source, edits
 * nothing. Usage, from the repo root: node .rc/x/rprobe.mjs [scale]   (scale 1 is the full run, 0.1 a taste)
 * Every rule below is written here a second time from the regulations as the ledger quotes them, with none
 * of the library's constants and none of the round's harness. Exit 0 no fault, 1 a fault, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const SCALE = Number(process.argv[2] || 1);
const N = n => Math.max(2, Math.round(n * SCALE));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rprobe-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, `export * as slate from ${JSON.stringify(path.join(ROOT, 'src/lib/leagueSlate.ts'))};\nexport * as ucl from ${JSON.stringify(path.join(ROOT, 'src/lib/uclLeaguePhase.ts'))};`);
const out = path.join(work, 'bundle.mjs');
try { await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } }); } catch (err) { console.log(`rprobe: cannot bundle: ${String(err).slice(0, 200)}`); process.exit(2); }
const { slate: S, ucl: U } = await import(pathToFileURL(out).href);

const faults = [];
const fault = msg => { if (faults.length < 400) faults.push(msg); };
const rng = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const POTS = [0, 1, 2, 3].map(p => Array.from({ length: 9 }, (_, i) => p * 9 + i));

/** Everything a legal slate must be, from its matches alone. Returns the breaks and over the cap it holds. */
function judge(assoc, matches, tag) {
  const opp = Array.from({ length: 36 }, () => []);
  const days = Array.from({ length: 36 }, () => []);
  const perDay = new Array(8).fill(0);
  if (matches.length !== 144) fault(`${tag}: ${matches.length} matches`);
  let breaks = 0;
  const faced = new Map();
  for (const [h, a, d] of matches) {
    if (!(Number.isInteger(h) && Number.isInteger(a) && h >= 0 && h < 36 && a >= 0 && a < 36 && h !== a)) { fault(`${tag}: a match of ${h} and ${a}`); continue; }
    if (!(Number.isInteger(d) && d >= 0 && d < 8)) { fault(`${tag}: matchday ${d}`); continue; }
    opp[h].push([a, 'H']); opp[a].push([h, 'A']); days[h].push(d); days[a].push(d); perDay[d] += 1;
    if (assoc[h] === assoc[a]) breaks += 1;
    else for (const [c, o] of [[h, a], [a, h]]) { const k = `${c}|${assoc[o]}`; faced.set(k, (faced.get(k) ?? 0) + 1); }
  }
  if (perDay.some(n => n !== 18)) fault(`${tag}: matches a matchday ${perDay.join(' ')}`);
  for (let c = 0; c < 36; c += 1) {
    if (opp[c].length !== 8 || new Set(opp[c].map(o => o[0])).size !== 8) fault(`${tag}: club ${c} has ${opp[c].length} matches against ${new Set(opp[c].map(o => o[0])).size} clubs`);
    if (new Set(days[c]).size !== days[c].length || days[c].length !== 8) fault(`${tag}: club ${c} plays on matchdays ${days[c].join(' ')}`);
    for (let p = 0; p < 4; p += 1) {
      const inPot = opp[c].filter(o => Math.floor(o[0] / 9) === p).map(o => o[1]).sort().join('');
      if (inPot !== 'AH') fault(`${tag}: club ${c} against pot ${p} is "${inPot}", not one at home and one away`);
    }
  }
  let overCap = 0;
  for (const n of faced.values()) overCap += Math.max(0, n - 2);
  return { breaks, overCap };
}

const timed = fn => { const t = process.hrtime.bigint(); const v = fn(); return [v, Number(process.hrtime.bigint() - t) / 1e6]; };
const stats = {};
function draw(kind, assoc, seed) {
  const [slate, ms] = timed(() => S.swissSlate({ pots: POTS, assoc }, rng(seed)));
  const row = (stats[kind] ??= { n: 0, nul: 0, fallback: 0, clean: 0, atFloor: 0, overFloor: 0, lied: 0, ms: 0, worst: 0, breaks: 0, over: 0, tries: 0 });
  row.n += 1; row.ms += ms; row.worst = Math.max(row.worst, ms);
  if (!slate) { row.nul += 1; fault(`${kind} seed ${seed}: null`); return null; }
  const held = judge(assoc, slate.matches, `${kind} seed ${seed}`);
  if (held.breaks !== slate.breaks || held.overCap !== slate.overCap) { row.lied += 1; fault(`${kind} seed ${seed}: the slate says ${slate.breaks}/${slate.overCap}, its matches hold ${held.breaks}/${held.overCap}`); }
  if (slate.fallback) row.fallback += 1;
  if (held.breaks === 0 && held.overCap === 0) row.clean += 1;
  if (held.breaks === slate.floor.breaks && held.overCap === slate.floor.overCap) row.atFloor += 1; else if (!slate.fallback) row.overFloor += 1;
  row.breaks += held.breaks; row.over += held.overCap; row.tries += slate.tries;
  return slate;
}

/* ── A. Fields of my own making ─────────────────────────────────────────────────────────────────────── */
/** The shipped game's mix (five big associations), seated by a strength that favours them more or less. */
function realLike(r, lift) {
  const sizes = [5, 5, 5, 5, 4, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1];
  const clubs = sizes.flatMap((n, a) => Array.from({ length: n }, () => ({ a, s: (a < 5 ? 78 + lift : 72) + (r() - 0.5) * 18 })));
  return clubs.sort((x, y) => y.s - x.s).map(c => c.a);
}
/** One association of `big` clubs on random seats, everybody else alone. */
function swollen(r, big) {
  const seats = Array.from({ length: 36 }, (_, c) => c);
  for (let i = 35; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
  const assoc = new Array(36);
  seats.forEach((c, i) => { assoc[c] = i < big ? 0 : 100 + c; });
  return assoc;
}
for (let i = 0; i < N(1500); i += 1) draw('real mix, even strength', realLike(rng(610000 + i), 0), 620000 + i);
for (let i = 0; i < N(1500); i += 1) draw('real mix, big five far stronger', realLike(rng(630000 + i), 8), 640000 + i);
for (const big of [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 27, 30, 36]) for (let i = 0; i < N(24); i += 1) draw(`one association of ${String(big).padStart(2, '0')}`, swollen(rng(650000 + big * 100 + i), big), 660000 + big * 100 + i);
/* Two and three associations that fill whole pots, and a field split in two. */
for (let i = 0; i < N(12); i += 1) draw('pot one all one association', POTS.flat().map(c => (c < 9 ? 0 : 100 + c)), 670000 + i);
for (let i = 0; i < N(12); i += 1) draw('pots one and two, one association each', POTS.flat().map(c => (c < 9 ? 0 : c < 18 ? 1 : 100 + c)), 671000 + i);
for (let i = 0; i < N(12); i += 1) draw('two associations of 18, by pot', POTS.flat().map(c => (c < 18 ? 0 : 1)), 672000 + i);
for (let i = 0; i < N(12); i += 1) draw('two associations of 18, alternating', POTS.flat().map(c => c % 2), 673000 + i);
for (let i = 0; i < N(12); i += 1) draw('four associations of 9, one a pot', POTS.flat().map(c => Math.floor(c / 9)), 674000 + i);
for (let i = 0; i < N(12); i += 1) draw('nine associations of 4', POTS.flat().map(c => c % 9), 675000 + i);

/* ── B. The wrapper a later round calls: seeds of every kind, and the readers against each other ──── */
const NAMES = Array.from({ length: 36 }, (_, i) => `Club ${String(i + 1).padStart(2, '0')}`);
const strengthOf = c => 100 - Number(c.slice(5));
const assocOf = c => `Land ${Number(c.slice(5)) % 12}`;
const wrap = seed => U.drawUclLeaguePhase({ field: NAMES, holder: 'Club 20', seed, strengthOf, assocOf });
const seedNotes = [];
const bySeed = new Map();
for (const seed of [0, 1, -1, 7, 2 ** 31 - 1, 2 ** 31, 2 ** 32 - 1, 2 ** 32, 2 ** 32 + 1, 2 ** 53, 1.5, 0.25, NaN, Infinity]) {
  let s1 = null;
  try { s1 = wrap(seed); } catch (err) { fault(`B: seed ${seed} threw ${String(err).slice(0, 80)}`); continue; }
  if (!s1) { fault(`B: seed ${seed} gave no slate`); continue; }
  if (JSON.stringify(wrap(seed)) !== JSON.stringify(s1)) fault(`B: seed ${seed} gave two slates`);
  const key = s1.fx.join(',');
  if (bySeed.has(key)) seedNotes.push(`${seed} draws what ${bySeed.get(key)} draws`); else bySeed.set(key, seed);
  const assoc = s1.clubs.map(c => assocOf(c));
  const matches = s1.fx.map(code => [Math.floor(code / 36) % 36, code % 36, Math.floor(code / 1296)]);
  const held = judge(assoc, matches, `B seed ${seed}`);
  if (held.breaks !== s1.breaks || held.overCap !== s1.overCap) fault(`B: seed ${seed} says ${s1.breaks}/${s1.overCap} and holds ${held.breaks}/${held.overCap}`);
  if (s1.clubs[0] !== 'Club 20') fault(`B: the holders are not top of pot one (${s1.clubs[0]})`);
  /* The three readers must tell one story about who is at home. */
  for (let d = 0; d < 8; d += 1) for (const [h, a] of U.slateFixtures(s1, d)) {
    const mine = U.slateFixtureOf(s1, h, d);
    const theirs = U.slateFixtureOf(s1, a, d);
    if (!mine || mine.opponent !== a || mine.home !== true) fault(`B: seed ${seed} matchday ${d}: slateFixtures says ${h} hosts ${a}, slateFixtureOf(${h}) says ${JSON.stringify(mine)}`);
    if (!theirs || theirs.opponent !== h || theirs.home !== false) fault(`B: seed ${seed} matchday ${d}: slateFixtures says ${a} visits ${h}, slateFixtureOf(${a}) says ${JSON.stringify(theirs)}`);
    if (!s1.fx.includes(d * 1296 + s1.clubs.indexOf(h) * 36 + s1.clubs.indexOf(a))) fault(`B: seed ${seed}: ${h} against ${a} on matchday ${d} is not a code of fx as the type documents it`);
  }
  for (const c of NAMES) { const o = U.slateOpponents(s1, c); if (o.length !== 8 || new Set(o).size !== 8) fault(`B: seed ${seed}: ${c} has opponents ${o.join(', ')}`); }
}
console.log(`B. drawUclLeaguePhase on 14 seeds of every kind: ${bySeed.size} different slates. ${seedNotes.length ? `Seeds that share a slate: ${seedNotes.join('; ')}` : 'No two seeds share a slate.'}`);
/* Does the saved slate SAY it is the recorded pattern when it is? Only a swollen field reaches the pattern. */
let patternSeen = 0;
let patternSaid = 0;
let wrapWorst = 0;
for (let i = 0; i < N(60); i += 1) {
  const who = swollen(rng(680000 + i), 18);
  const land = c => (who[Number(c.slice(5)) - 1] === 0 ? 'Big' : `Land ${c}`);
  const args = { field: NAMES, holder: null, seed: 5000 + i, strengthOf, assocOf: land };
  const [saved, ms] = timed(() => U.drawUclLeaguePhase(args));
  wrapWorst = Math.max(wrapWorst, ms);
  if (!saved) { fault(`B: a field of 18 of one association gave no saved slate (seed ${5000 + i})`); continue; }
  const assoc = saved.clubs.map(land);
  const held = judge(assoc, saved.fx.map(code => [Math.floor(code / 36) % 36, code % 36, Math.floor(code / 1296)]), `B swollen ${i}`);
  if (held.breaks !== saved.breaks || held.overCap !== saved.overCap) fault(`B: swollen ${i} says ${saved.breaks}/${saved.overCap} and holds ${held.breaks}/${held.overCap}`);
  /* The pattern is the only way past the search's budget of two over the floor on each count. */
  const floor = S.slateFloor({ pots: POTS, assoc });
  const pastBudget = held.breaks > floor.breaks + 2 || held.overCap > floor.overCap + 2;
  if (pastBudget) { patternSeen += 1; if (saved.fallback === true) patternSaid += 1; else fault(`B: swollen ${i} is past the search's budget (${held.breaks}/${held.overCap} against a floor of ${floor.breaks}/${floor.overCap}) and the saved slate does not say fallback`); }
}
console.log(`B. saved slates of 18 clubs of one association: ${patternSeen} were past the search's budget, ${patternSaid} of those say fallback. Worst draw through the wrapper ${wrapWorst.toFixed(0)} ms.`);

console.log('A. swissSlate on fields of the reviewer\'s own: n | null | pattern | inside both rules | at its floor | over its floor (searched) | lied | mean ms | worst ms | mean breaks | mean over cap | mean tries');
for (const [kind, r] of Object.entries(stats)) console.log(`   ${kind.padEnd(40)} ${String(r.n).padStart(5)} | ${r.nul} | ${String(r.fallback).padStart(3)} | ${String(r.clean).padStart(5)} | ${String(r.atFloor).padStart(5)} | ${String(r.overFloor).padStart(4)} | ${r.lied} | ${(r.ms / r.n).toFixed(1).padStart(7)} | ${r.worst.toFixed(0).padStart(6)} | ${(r.breaks / r.n).toFixed(2)} | ${(r.over / r.n).toFixed(2)} | ${(r.tries / r.n).toFixed(1)}`);

/* ── C. The table: Article 18.01 written again, on whole phases drawn by the wrapper ────────────────── */
const REAL = ['Atlético Madrid', 'Atalanta', 'Bodø/Glimt', 'Bayern München', 'Beşiktaş', 'Köln', 'Kortrijk', 'Malmö FF', 'Malmo City', 'Zürich', 'Zulte Waregem', 'Ålesund', 'AZ Alkmaar', 'Čukarički', 'Celtic', 'Ørebro', 'Olympiacos', 'İstanbul Başakşehir', 'Inter Milan', 'Łódź', 'Lyon', 'Saint-Étienne', 'Sevilla', 'Śląsk', 'Sparta Prague', 'Fenerbahçe', 'Feyenoord', 'Żalgiris', 'Zenit', 'Ñublense', 'Napoli', 'Þór', 'Tottenham', 'Újpest', 'Union SG', 'Vålerenga'];
let tables = 0;
let tableWrong = 0;
let nameDecided = 0;
for (let i = 0; i < N(300); i += 1) {
  const r = rng(700000 + i);
  const names = i % 2 ? REAL : NAMES;
  const saved = U.drawUclLeaguePhase({ field: names, holder: null, seed: 9000 + i, strengthOf: c => names.indexOf(c) % 7, assocOf: c => `L${names.indexOf(c) % 13}` });
  if (!saved) { fault(`C: no slate for table ${i}`); continue; }
  const rows = new Map(saved.clubs.map(club => [club, { club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  const extra = new Map(saved.clubs.map(club => [club, { awayGoals: 0, awayWins: 0, met: [] }]));
  const results = {};
  const upTo = i % 9; // 0 is the table before a ball is kicked
  for (let d = 0; d < upTo; d += 1) for (const [h, a] of U.slateFixtures(saved, d)) {
    const hg = Math.floor(r() * r() * 4);
    const ag = Math.floor(r() * r() * 4);
    results[`${h}|${a}`] = [hg, ag];
    const [H, A] = [rows.get(h), rows.get(a)];
    H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w += 1; H.pts += 3; A.l += 1; } else if (ag > hg) { A.w += 1; A.pts += 3; H.l += 1; extra.get(a).awayWins += 1; } else { H.d += 1; A.d += 1; H.pts += 1; A.pts += 1; }
    extra.get(a).awayGoals += ag; extra.get(h).met.push(a); extra.get(a).met.push(h);
  }
  const key = club => { const x = rows.get(club); const e = extra.get(club); const o = e.met.map(c => rows.get(c)); return [x.pts, x.gf - x.ga, x.gf, e.awayGoals, x.w, e.awayWins, o.reduce((s, y) => s + y.pts, 0), o.reduce((s, y) => s + y.gf - y.ga, 0), o.reduce((s, y) => s + y.gf, 0)]; };
  const list = [...rows.values()];
  for (let k = list.length - 1; k > 0; k -= 1) { const j = Math.floor(r() * (k + 1)); [list[k], list[j]] = [list[j], list[k]]; }
  const got = U.sortedLeaguePhaseTable(list, results).map(x => x.club);
  tables += 1;
  let bad = false;
  for (let k = 1; k < got.length; k += 1) {
    const [ka, kb] = [key(got[k - 1]), key(got[k])];
    const at = ka.findIndex((v, j) => v !== kb[j]);
    if (at >= 0 && ka[at] < kb[at]) bad = true;
    if (at < 0) nameDecided += 1;
  }
  if (bad || new Set(got).size !== 36) { tableWrong += 1; fault(`C: table ${i} after matchday ${upTo} is not in the order of Article 18.01`); }
  if (JSON.stringify(U.sortedLeaguePhaseTable([...list].reverse(), results).map(x => x.club)) !== JSON.stringify(got)) fault(`C: table ${i} depends on the order its rows are handed in`);
}
const byName = U.sortedLeaguePhaseTable(REAL.map(club => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }))).map(x => x.club);
const byCode = [...REAL].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const moved = byName.filter((c, i) => c !== byCode[i]).length;
console.log(`C. ${tables} tables at every matchday from 0 to 8: ${tableWrong} out of order; neighbours left to the name ${nameDecided} times. The name step is localeCompare: of 36 names with accents, ${moved} sit somewhere else than in plain code order (locale ${Intl.DateTimeFormat().resolvedOptions().locale}).`);

/* ── D. The knockout draw: Articles 19.01 to 19.04 written again ────────────────────────────────────── */
const FEEDS = { 1: [15, 16, 17, 18], 2: [13, 14, 19, 20], 3: [11, 12, 21, 22], 4: [9, 10, 23, 24] }; // by seeded line
const combos = [{}, {}, {}, {}];
let draws = 0;
let moves = 0;
for (let i = 0; i < N(4000); i += 1) {
  const r = rng(800000 + i);
  const order = Array.from({ length: 36 }, (_, c) => `T${String(c).padStart(2, '0')}`);
  for (let k = 35; k > 0; k -= 1) { const j = Math.floor(r() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  const pos = new Map(order.map((c, k) => [c, k + 1]));
  const seed = Math.floor(r() * 4294967296);
  const d = U.drawUclKnockout(order, seed);
  const tag = `D draw ${i}`;
  if (!d || d.seeds.length !== 8 || d.playoffs.length !== 8) { fault(`${tag}: no draw of eight`); continue; }
  draws += 1;
  const used = new Set();
  d.playoffs.forEach((t, slot) => {
    const sp = pos.get(d.seeds[slot]);
    const [hp, ap] = [pos.get(t.home), pos.get(t.away)];
    const line = Math.ceil(sp / 2);
    if (!(sp >= 1 && sp <= 8)) fault(`${tag}: slot ${slot} is seeded by position ${sp}`);
    if (!(ap >= 9 && ap <= 16 && hp >= 17 && hp <= 24)) fault(`${tag}: slot ${slot}: the play-off is ${hp} at home first against ${ap}`);
    if (!FEEDS[line]?.includes(hp) || !FEEDS[line]?.includes(ap)) fault(`${tag}: seed ${sp} is fed by ${hp} against ${ap}`);
    if (ap + hp !== 33 && ap + hp !== 32 && ap + hp !== 34) fault(`${tag}: ${ap} against ${hp} is not inside one pairing`);
    for (const p of [sp, hp, ap]) { if (used.has(p)) fault(`${tag}: position ${p} is in the bracket twice`); used.add(p); }
  });
  if (used.size !== 24 || [...used].some(p => p > 24)) fault(`${tag}: the bracket holds ${used.size} positions`);
  /* Play it: a side is the seed line it carries. */
  let sides = d.seeds.map(c => ({ seed: pos.get(c) }));
  for (const round of ['QF', 'SF', 'F']) {
    const next = [];
    for (let k = 0; k < sides.length / 2; k += 1) {
      const tie = U.nextRoundTie(sides, k);
      const [lo, hi] = [Math.min(tie.home.seed, tie.away.seed), Math.max(tie.home.seed, tie.away.seed)];
      const lines = [Math.ceil(lo / 2), Math.ceil(hi / 2)];
      if (round === 'QF' && !((lines[0] === 1 && lines[1] === 4) || (lines[0] === 2 && lines[1] === 3))) fault(`${tag}: a quarter-final of seeds ${lo} and ${hi}`);
      if (round === 'QF' && tie.away.seed !== lo) fault(`${tag}: the quarter-final return is at seed ${tie.away.seed}, not ${lo}`);
      if (round === 'SF' && !(lo <= 2 && hi >= 3 && hi <= 4 && tie.away.seed === lo)) fault(`${tag}: a semi-final of seeds ${lo} and ${hi}, return at ${tie.away.seed}`);
      if (round === 'F' && !(lo === 1 && hi === 2)) fault(`${tag}: a final of seeds ${lo} and ${hi}`);
      next.push({ seed: lo });
    }
    sides = next;
  }
  /* The three tosses of each line, all eight ways. */
  for (let line = 1; line <= 4; line += 1) {
    const odd = d.seeds.findIndex(c => pos.get(c) === line * 2 - 1);
    const firstHigh = FEEDS[line][0];
    const tieSlot = d.playoffs.findIndex(t => pos.get(t.away) === firstHigh);
    const straight = pos.get(d.playoffs[tieSlot].home) === FEEDS[line][2];
    const k = `${odd < 4 ? 1 : 0}${tieSlot < 4 ? 1 : 0}${straight ? 1 : 0}`;
    combos[line - 1][k] = (combos[line - 1][k] ?? 0) + 1;
  }
  /* A change below 24th moves nothing; a change of 9th moves only the 7 or 8 line. */
  if (i % 20 === 0) {
    const low = [...order]; [low[24], low[35]] = [low[35], low[24]];
    if (JSON.stringify(U.drawUclKnockout(low, seed)) !== JSON.stringify(d)) fault(`${tag}: a swap of 25th and 36th moved the draw`);
    const nine = [...order]; [nine[8], nine[30]] = [nine[30], nine[8]];
    const e = U.drawUclKnockout(nine, seed);
    d.seeds.forEach((c, slot) => { if (Math.ceil(pos.get(c) / 2) !== 4 && (e.seeds[slot] !== c || JSON.stringify(e.playoffs[slot]) !== JSON.stringify(d.playoffs[slot]))) { moves += 1; fault(`${tag}: a new 9th moved slot ${slot}, which is not on the 7 or 8 line`); } });
  }
}
const spread = combos.map(c => { const v = ['000', '001', '010', '011', '100', '101', '110', '111'].map(k => c[k] ?? 0); return `${Math.min(...v)} to ${Math.max(...v)}`; });
console.log(`D. ${draws} knockout draws played to a final under Articles 19.01 to 19.04: the eight ways the three tosses of a line can land each came up (least to most, expected ${Math.round(draws / 8)}): line 1/2 ${spread[0]}, 3/4 ${spread[1]}, 5/6 ${spread[2]}, 7/8 ${spread[3]}. Slots moved by a change that is not theirs: ${moves}.`);
if (combos.some(c => Object.keys(c).length !== 8)) fault('D: one of the eight ways a line can be drawn never came up');
for (const short of [0, 23]) if (U.drawUclKnockout(NAMES.slice(0, short), 1) !== null) fault(`D: an order of ${short} clubs gave a draw`);

for (const f of faults.slice(0, 30)) console.log(`  FAULT ${f}`);
console.log(`rprobe: ${faults.length === 0 ? 'NO FAULT' : `${faults.length} FAULTS`} (scale ${SCALE}).`);
process.exit(faults.length === 0 ? 0 : 1);

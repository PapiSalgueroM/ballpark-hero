/**
 * Round 1046: the Season Centre moves, and what moves is true (the pure half;
 * scripts/playSeasonCentreMotion.mjs is the browser half).
 *
 * It bundles the real src/lib/motion/rankShift.ts, src/lib/season/* and the
 * career engine the way simSeasonCentreTable.mjs does, and reads every table
 * season the awards probe's 48 seeded careers play.
 *
 *  1. EVERY STEP, NOT JUST THE ENDS. For every table season, every matchday k
 *     from 1 and every step from 1 to M - k: rankShift(order(k), order(k +
 *     step)) gives each club the `from` it has in table k and the `to` it has
 *     in table k + step. Both are checked against index maps this harness
 *     builds for itself with plain loops (never the module's own output, never
 *     indexOf on it), and the `to` values are every place exactly once. The
 *     keys are the ones the viewer puts in `data-club`, and a season with two
 *     rows sharing a key fails. Printed: seasons, pairs checked, and how many
 *     one matchday steps moved at least one club (a floor, so a probe whose
 *     tables never change cannot pass).
 *  2. THE RESUME RECORD (src/lib/season/resume.ts reads it, the lazy
 *     src/components/season-centre/resumeStore.ts writes it), through a storage this
 *     harness owns: a record round trips; fourteen shapes that are not a
 *     record, text that is not JSON and a storage that throws on every call
 *     all read as no record, with no exception; for every played row of
 *     every probe career a record carrying that row's key (the lazy entry's
 *     own: soccerSeasonKey) finds exactly that row, no two rows of one
 *     career share a key, and the same record finds NOTHING in any other
 *     career that played that year; a record that is not stable finds its
 *     row only while the save's league year is that row's year. And the
 *     key the career page builds for its Resume chip (one template line,
 *     read out of the page's source and run) is soccerSeasonKey's on every
 *     played row.
 *  3. SOURCE FENCES, comments and strings stripped (a guard reads code, never
 *     prose): src/lib/motion/* and src/lib/season/resume.ts import nothing; src/components/motion/*
 *     imports only react and src/lib/motion; neither folder has "season" or
 *     "soccer" in an import path; and none of the fenced files draws a random
 *     number (`Math.random`, `new Rng(`). The clean run also proves the
 *     stripper: the same call written in a comment and in a string is NOT a
 *     finding.
 *
 * Controls (SEASON_MOTION_SIM_CONTROL=), each a rewrite of the BUNDLED copy or
 * of the text the fence reads, never a file on disk, each refusing to run
 * unless its single line needle is there exactly once (CRLF normalised):
 *   shift      rankShift hands back from and to swapped            -> 1 red
 *   resumetag  the record's key is no longer compared              -> 2 red
 *   pagekey    the career page's key template loses one field      -> 2 red
 *   fence      a Math.random() call added in RankShiftTable's code -> 3 red
 *
 * Measured 2026-10-08 (the probe is seeded, so these repeat): 356 table
 * seasons, 240044 pairs of tables, 12799 of 12884 one matchday steps moved a
 * club (99.3 percent; the floor of 90 is there to catch a probe whose tables
 * stop changing, not to split hairs), 128391 club moves. Control shift: 239947
 * pairs wrong at item 1 and 0.0 percent moved; control fence: one finding at
 * item 3; each exit 1.
 *
 * Green is the closing "simSeasonCentreMotion: N checks, 0 failed" line and
 * exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { probeAwardsNight } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CONTROL = process.env.SEASON_MOTION_SIM_CONTROL ?? '';
const SHIFT_NEEDLE = '  return after.map((club, to) => ({ club, from: was.get(club) ?? -1, to }));';
const FENCE_NEEDLE = "const EASE = 'cubic-bezier(.2,.8,.2,1)';";
const RESUME_NEEDLE = "  return rows.findIndex(row => row.year === r.year && row.type === 'playing' && row.apps > 0 && keyOf(row) === r.key && (r.stable || liveYear === row.year));";
const BUNDLE_CONTROLS = {
  shift: [{ file: 'src/lib/motion/rankShift.ts', from: SHIFT_NEEDLE, to: '  return after.map((club, to) => ({ club, from: to, to: was.get(club) ?? -1 }));' }],
  resumetag: [{ file: 'src/lib/season/resume.ts', from: RESUME_NEEDLE, to: "  return rows.findIndex(row => row.year === r.year && row.type === 'playing' && row.apps > 0 && (r.stable || liveYear === row.year));" }],
};
const PAGEKEY_NEEDLE = '|${r.assists}';
if (CONTROL && !['shift', 'resumetag', 'pagekey', 'fence'].includes(CONTROL)) throw new Error(`unknown SEASON_MOTION_SIM_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: applied to the bundled copy or the text the fence reads, never a file on disk`);

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const once = (text, needle, what) => { const n = text.split(needle).length - 1; if (n !== 1) throw new Error(`control refused: ${what} holds its needle ${n} times, not once`); };
if (CONTROL === 'shift') once(read('src/lib/motion/rankShift.ts'), SHIFT_NEEDLE, 'src/lib/motion/rankShift.ts');
if (CONTROL === 'resumetag') once(read('src/lib/season/resume.ts'), RESUME_NEEDLE, 'src/lib/season/resume.ts');

const B = await bundleAwardsNight(ROOT, {
  patches: BUNDLE_CONTROLS[CONTROL] ?? [],
  extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', motion: 'src/lib/motion/rankShift.ts', resume: 'src/lib/season/resume.ts', store: 'src/components/season-centre/resumeStore.ts' },
});
const { soccer, season: S, core: C, motion: MO, resume: RS, store: ST } = B;
const CLUBS = soccer.FALLBACK_CLUBS;

let checks = 0, failed = 0;
const fails = new Map();
const fail = (item, msg) => { if (!fails.has(item)) fails.set(item, { n: 0, first: [] }); const f = fails.get(item); f.n += 1; if (f.first.length < 3) f.first.push(msg); };
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };

/* ---- 1. every step ---- */
const stats = { tables: 0, pairs: 0, steps1: 0, steps1Moved: 0, clubsMoved: 0 };
function checkSeason(s, tag) {
  const M = s.rounds.length;
  const keyOf = slot => s.labels[slot]?.key ?? `u${slot}`;
  const orders = [];
  for (let k = 0; k <= M; k += 1) orders.push(C.tableAt(s, k).map(r => keyOf(r.slot)));
  const n = orders[0].length;
  if (new Set(orders[0]).size !== n) { fail('1 keys', `${tag}: two rows share a key`); return; }
  stats.tables += 1;
  for (let k = 1; k < M; k += 1) {
    const was = {};
    for (let i = 0; i < n; i += 1) was[orders[k][i]] = i;
    for (let step = 1; k + step <= M; step += 1) {
      const after = orders[k + step];
      const now = {};
      for (let i = 0; i < n; i += 1) now[after[i]] = i;
      const moves = MO.rankShift(orders[k], after);
      stats.pairs += 1;
      if (moves.length !== n) { fail('1 shift', `${tag}: ${moves.length} moves for ${n} clubs, matchday ${k} plus ${step}`); continue; }
      const places = new Array(n).fill(0);
      let moved = 0, bad = false;
      for (let i = 0; i < n && !bad; i += 1) {
        const m = moves[i];
        if (m.club !== after[i] || m.from !== was[m.club] || m.to !== now[m.club] || m.to !== i) bad = true;
        else { places[m.to] += 1; if (m.from !== m.to) moved += 1; }
      }
      if (bad || places.some(c => c !== 1)) { fail('1 shift', `${tag}: matchday ${k} plus ${step}, a club's from or to is not its place in the two tables`); continue; }
      if (step === 1) { stats.steps1 += 1; if (moved > 0) { stats.steps1Moved += 1; stats.clubsMoved += moved; } }
    }
  }
}

const seen = new Set();
/* every career as its last step left it, for section 2 */
const careers = new Map();
probeAwardsNight(B, {
  onStep: (s, c) => {
    careers.set(c, { name: s.playerName, seasons: s.seasons });
    if (!['newspaper', 'season_summary', 'rehab_choice'].includes(s.phase)) return;
    const row = s.seasons[s.seasons.length - 1];
    if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
    const k = `${s.playerName}|${row.year}`;
    if (seen.has(k)) return;
    seen.add(k);
    const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
    const d = C.deriveSeason(S.SOCCER, row, ctx);
    if (d && d.mode === 'table') checkSeason(d, `${s.playerName} ${row.year} ${row.club}`);
  },
});
console.log(`1) every step: ${stats.tables} table seasons, ${stats.pairs} pairs of tables, ${stats.steps1Moved} of ${stats.steps1} one matchday steps moved a club (${stats.clubsMoved} club moves)`);
check(stats.tables >= 300, `1. the probe reached enough table seasons (${stats.tables}, floor 300)`);
check(stats.pairs >= 150000, `1. every step of every season was compared (${stats.pairs} pairs, floor 150000)`);
check(stats.steps1 > 0 && stats.steps1Moved / stats.steps1 >= 0.9, `1. one matchday steps that moved at least one club: ${(100 * stats.steps1Moved / Math.max(1, stats.steps1)).toFixed(1)}% (floor 90%)`);
for (const [item, f] of fails) console.log(`FAIL item ${item}: ${f.n} times, first: ${f.first.join(' | ')}`);
check(!fails.has('1 keys') && !fails.has('1 shift'), `1. every club's from and to are its places in the two tables${fails.size ? ` (${[...fails.entries()].map(([k, f]) => `${k}: ${f.n}`).join(', ')})` : ''}`);

/* ---- 2. the resume record ---- */
{
  const real = globalThis.localStorage;
  const map = new Map();
  const fake = { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); }, removeItem: k => { map.delete(k); } };
  globalThis.localStorage = fake;
  const GAME = 'soccer';
  const SLOT = RS.resumeStorageKey(GAME);
  const good = { key: 'a|b|2031|34|12|7|7.4|centre', year: 2031, md: 13, speed: 3, stable: false };
  ST.writeResume(GAME, good);
  const back = RS.readResume(GAME);
  check(SLOT === 'seasonCentre:v1:soccer' && JSON.stringify(back) === JSON.stringify(good), '2. a record round trips under seasonCentre:v1:soccer');
  ST.clearResume(GAME);
  check(RS.readResume(GAME) === null && !map.has(SLOT), '2. a cleared record is gone');
  const BAD = [null, 'x', 7, [good], {}, { ...good, key: '' }, { ...good, key: 'k'.repeat(201) }, { ...good, year: '2031' }, { ...good, year: 1899 }, { ...good, md: 0 }, { ...good, md: 2.5 }, { ...good, speed: 2 }, { ...good, stable: 1 }, { key: good.key, year: 2031, md: 13, speed: 3 }];
  let badRead = 0, threw = 0;
  for (const b of BAD) {
    map.set(SLOT, JSON.stringify(b));
    try { if (RS.readResume(GAME) !== null) badRead += 1; } catch { threw += 1; }
  }
  map.set(SLOT, '{not json');
  try { if (RS.readResume(GAME) !== null) badRead += 1; } catch { threw += 1; }
  globalThis.localStorage = { getItem: () => { throw new Error('refused'); }, setItem: () => { throw new Error('refused'); }, removeItem: () => { throw new Error('refused'); } };
  try { if (RS.readResume(GAME) !== null) badRead += 1; ST.writeResume(GAME, good); ST.clearResume(GAME); } catch { threw += 1; }
  globalThis.localStorage = real;
  check(badRead === 0 && threw === 0, `2. ${BAD.length} shapes that are not a record, text that is not JSON and a storage that throws: ${badRead} read as a record, ${threw} threw`);

  /* every played row of every career: a record with that row's key finds that row and nothing in another career */
  const list = [...careers.values()];
  const played = r => r.type === 'playing' && r.apps > 0;
  let rows = 0, own = 0, shared = 0, foreign = 0, foreignHit = 0, heldBack = 0, heldBad = 0;
  for (const A of list) {
    const keyA = r => S.soccerSeasonKey(A.name, r);
    const keys = new Set();
    A.seasons.forEach((row, at) => {
      if (!played(row)) return;
      rows += 1;
      const key = keyA(row);
      if (keys.has(key)) shared += 1;
      keys.add(key);
      const rec = { key, year: row.year, md: 3, speed: 1, stable: true };
      if (RS.resumeRowIndex(rec, A.seasons, keyA) === at) own += 1;
      else fail('2 own', `${A.name} ${row.year}: the record does not find its own row`);
      /* not stable: only while the save's league year is this row's */
      const loose = { ...rec, stable: false };
      heldBack += 1;
      if (RS.resumeRowIndex(loose, A.seasons, keyA, row.year) !== at || RS.resumeRowIndex(loose, A.seasons, keyA, row.year + 1) !== -1 || RS.resumeRowIndex(loose, A.seasons, keyA) !== -1) { heldBad += 1; fail('2 stable', `${A.name} ${row.year}: a record that is not stable is not held to its own year`); }
      for (const Bc of list) {
        if (Bc === A || !Bc.seasons.some(r => played(r) && r.year === row.year)) continue;
        foreign += 1;
        if (RS.resumeRowIndex(rec, Bc.seasons, r => S.soccerSeasonKey(Bc.name, r)) !== -1) { foreignHit += 1; fail('2 foreign', `${A.name} ${row.year}: the record finds a row in the career of ${Bc.name}`); }
      }
    });
  }
  console.log(`2) the resume record: ${list.length} careers, ${rows} played rows, ${foreign} checks against another career that played the same year`);
  check(list.length >= 40 && rows >= 600, `2. the probe gave enough careers and played rows (${list.length} careers, ${rows} rows; floors 40 and 600)`);
  check(own === rows && shared === 0, `2. every record finds its own row (${own} of ${rows}); rows of one career sharing a key: ${shared}`);
  check(foreign >= 5000 && foreignHit === 0, `2. a record finds nothing in another career (${foreignHit} of ${foreign} did; floor 5000 checks)`);
  check(heldBack === rows && heldBad === 0, `2. a record that is not stable is held to the league year of the save (${heldBad} of ${heldBack} were not)`);
  /* the Resume chip may not import the season code (it must stay a few hundred bytes), so it builds the season's key
     with one template line of its own. Read that line out of its file and hold it to soccerSeasonKey on every played row. */
  const pageLines = read('src/components/soccer-career/SeasonResumeChip.tsx').split('\n').filter(l => l.includes('resumeRowIndex(resume, career.seasons, r => `'));
  const tplMatch = pageLines.length === 1 ? /r => `([^`]+)`, career/.exec(pageLines[0]) : null;
  check(!!tplMatch, `2. the career page holds its key template on one line (${pageLines.length} lines found)`);
  if (tplMatch) {
    let tpl = tplMatch[1];
    if (CONTROL === 'pagekey') { once(tpl, PAGEKEY_NEEDLE, 'the page key template'); tpl = tpl.replace(PAGEKEY_NEEDLE, ''); }
    const pageKey = new Function('career', 'r', `return \`${tpl}\`;`);
    let drift = 0;
    for (const A of list) for (const row of A.seasons) if (played(row) && pageKey({ playerName: A.name }, row) !== S.soccerSeasonKey(A.name, row)) { drift += 1; fail('2 pagekey', `${A.name} ${row.year}: the page says ${pageKey({ playerName: A.name }, row)}, the season says ${S.soccerSeasonKey(A.name, row)}`); }
    check(drift === 0, `2. the page's key for a season is the Season Centre's own key on every played row (${drift} of ${rows} differ)`);
  }
  for (const [item, f] of fails) if (item.startsWith('2 ')) console.log(`FAIL item ${item}: ${f.n} times, first: ${f.first.join(' | ')}`);
}

/* ---- 3. source fences ---- */
/** The text with comments gone (`code`) and with string contents blanked too (`bare`). */
function strip(text) {
  let code = '', bare = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i += 1; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i += 1; i += 2; code += ' '; bare += ' '; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && text[j] !== c) { if (text[j] === '\\') j += 1; j += 1; }
      code += text.slice(i, j + 1);
      bare += c + c;
      i = j + 1;
      continue;
    }
    code += c; bare += c; i += 1;
  }
  return { code, bare };
}
function importsOf(code) {
  const out = [];
  for (const m of code.matchAll(/\bimport\s+(type\s+)?[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[2], typeOnly: !!m[1] });
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], typeOnly: false });
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], typeOnly: false });
  for (const m of code.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], typeOnly: false });
  return out;
}
const CHIP = 'src/components/soccer-career/SeasonResumeChip.tsx';
const listDir = rel => fs.readdirSync(path.join(ROOT, rel)).filter(f => /\.(ts|tsx)$/.test(f)).map(f => `${rel}/${f}`);
const LIB_MOTION = listDir('src/lib/motion');
const UI_MOTION = listDir('src/components/motion');
/* files that may draw nothing at random (the list grows as the round's parts land) */
const NO_DRAW = [...LIB_MOTION, ...UI_MOTION, 'src/lib/season/resume.ts', 'src/components/season-centre/resumeStore.ts', 'src/components/season-centre/SeasonPicker.tsx', 'src/components/season-centre/useBodyLock.ts', 'src/components/season-centre/MiniPitch.tsx', CHIP];
const IMPORTS_NOTHING = [...LIB_MOTION, 'src/lib/season/resume.ts'];

const MINI_PITCH = 'src/components/season-centre/MiniPitch.tsx';
/* the chip is loaded on the career page for anybody with a place kept: it may carry the record's reader and nothing else of the Season Centre */
const CHIP_MAY_IMPORT = ['react', '@/components/ui/button', '@/lib/season/resume'];
const CENTRE_FILES = [...listDir('src/components/season-centre'), 'src/components/soccer-career/SoccerSeasonCentre.tsx'];
function fenceFindings(textOf) {
  const out = [];
  for (const f of IMPORTS_NOTHING) for (const im of importsOf(strip(textOf(f)).code)) out.push(`${f} imports ${im.spec}: it must import nothing`);
  for (const f of UI_MOTION) for (const im of importsOf(strip(textOf(f)).code)) {
    if (im.spec !== 'react' && !im.spec.startsWith('@/lib/motion/')) out.push(`${f} imports ${im.spec}: only react and src/lib/motion`);
  }
  for (const f of [...LIB_MOTION, ...UI_MOTION]) for (const im of importsOf(strip(textOf(f)).code)) {
    if (/season|soccer/i.test(im.spec)) out.push(`${f} names a sport or the Season Centre in an import path (${im.spec})`);
  }
  for (const f of NO_DRAW) {
    const { bare } = strip(textOf(f));
    if (/Math\s*\.\s*random/.test(bare)) out.push(`${f} calls Math.random`);
    if (/new\s+Rng\s*\(/.test(bare)) out.push(`${f} makes an Rng`);
  }
  /* the pitch part has one way into the Season Centre, MiniPitch.tsx, and nothing of Club Manager's rides along with it */
  for (const f of CENTRE_FILES) for (const im of importsOf(strip(textOf(f)).code)) {
    if (im.spec.startsWith('@/components/pitch-motion') && f !== MINI_PITCH) out.push(`${f} imports the pitch part (${im.spec}): MiniPitch.tsx is the one file that may`);
    if (/clubManager|club-manager\/LiveSim/.test(im.spec) && !im.typeOnly && f === MINI_PITCH) out.push(`${f} imports ${im.spec} for more than its types`);
  }
  for (const im of importsOf(strip(textOf(CHIP)).code)) if (!im.typeOnly && !CHIP_MAY_IMPORT.includes(im.spec)) out.push(`${CHIP} imports ${im.spec}: it may carry react, the button and the record's reader only`);
  return out;
}

const SHIFT_UI = 'src/components/motion/RankShiftTable.tsx';
const DRAW_LINE = 'const fenceControl = Math.random();';
let textOf = read;
if (CONTROL === 'fence') {
  once(read(SHIFT_UI), FENCE_NEEDLE, SHIFT_UI);
  textOf = f => (f === SHIFT_UI ? read(f).replace(FENCE_NEEDLE, `${FENCE_NEEDLE}\n${DRAW_LINE}`) : read(f));
}
const found = fenceFindings(textOf);
console.log(`3) source fences: ${LIB_MOTION.length} files in src/lib/motion, ${UI_MOTION.length} in src/components/motion, ${NO_DRAW.length} that may draw nothing`);
for (const f of found.slice(0, 6)) console.log(`   finding: ${f}`);
check(LIB_MOTION.length >= 1 && UI_MOTION.length >= 1, '3. the fenced folders are not empty');
check(found.length === 0, `3. imports and random draws (${found.length} findings)`);
/* the stripper reads code: the same call in a comment and in a string is not a finding, and in code it is */
const asComment = f => (f === SHIFT_UI ? `${read(f)}\n// ${DRAW_LINE}\n/* ${DRAW_LINE} */\nconst words = '${DRAW_LINE}';\n` : read(f));
const asCode = f => (f === SHIFT_UI ? `${read(f)}\n${DRAW_LINE}\n` : read(f));
check(fenceFindings(asComment).length === 0, '3. the call written in a comment and in a string is not a finding');
check(fenceFindings(asCode).length === 1, '3. the same call in code is exactly one finding');

console.log(`simSeasonCentreMotion: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failed ? 1 : 0);

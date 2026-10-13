// Release AX, step d4: the attribution tool of the US board recording (scripts/data/usBoardFixture.json). It compares
// two recordings step by step and says whether what moved is ONLY the saved talks: no step before a path's first
// talk differs, the paths are the same sequence once the 'market wheel: ' steps are out, and no career field, team
// quality or coach hash differs at any aligned step. It was a scratch file of the integration; the fix pass
// committed it (the recording reviewer's minor 6) so the numbers in the header of scripts/simUsBoardParity.mjs can
// be made again. It reads two files and prints; it is not a harness and no runner discovers it.
// usage: git show <old commit>:scripts/data/usBoardFixture.json > old.json
//        node scripts/qa/compareUsBoardFixture.mjs old.json scripts/data/usBoardFixture.json
//        (the recording Release AX replaced is the one of 934c29d9; it closes with ATTRIBUTION HOLDS or with STOPs)
// Round 1313 added a second mode, for a round that moves the RIVAL of named sports and nothing else:
//        node scripts/qa/compareUsBoardFixture.mjs --rival mlb,nhl old.json new.json
//        The sports not named must be byte equal, section for section. In a named sport the path's first step whose
//        saved career differs must differ ONLY under c.rival or the pending rivalry card (every step before it is
//        byte equal by construction), and it prints where the click path parts if it does and the counts before
//        and after (clicks, seasons, screen steps, rival beats, rival choices, fixed saves moved, screen walks moved).
//        It closes with RIVAL ATTRIBUTION HOLDS or with STOPs. The default mode above is unchanged.
const RIVAL = process.argv[2] === '--rival' ? String(process.argv[3] ?? '').split(',').filter(Boolean) : null;
const FILES = RIVAL ? process.argv.slice(4) : process.argv.slice(2);
if (FILES.length < 2 || (RIVAL && !RIVAL.length)) { console.error('usage: node scripts/qa/compareUsBoardFixture.mjs [--rival <sport,sport>] <old.json> <new.json>'); process.exit(2); }
import fs from 'node:fs';
const [oldF, newF] = FILES.slice(0, 2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const WHEEL = 'market wheel: ';
const TALK = new Set(['extension', 'freeagency']);
const J = JSON.stringify;
let stops = 0;
const stop = m => { stops += 1; console.log(`   STOP ${m}`); };

/* The running field hashes of a walk: one map per step (after the step). */
function running(steps) {
  const out = []; const cur = {};
  for (const st of steps) {
    for (const [k, v] of Object.entries(st.d)) { if (v === 'gone') delete cur[k]; else cur[k] = v; }
    out.push({ ...cur });
  }
  return out;
}
function compareWalk(where, a, b) {
  const res = { where, old: a.length, new: b.length, wheel: 0, identical: 0, firstTalk: -1, prefixEqual: true, talkSteps: 0, withTalkField: 0,
    saveOnly: 0, markupOutsideTalk: [], labelDiff: null, careerDiff: null, wheelFields: new Set(), phases: new Set() };
  const runB = running(b), runA = running(a);
  res.firstTalk = b.findIndex(st => TALK.has(st.p));
  const upTo = res.firstTalk < 0 ? Math.min(a.length, b.length) : res.firstTalk;
  for (let i = 0; i < upTo; i += 1) if (J(a[i]) !== J(b[i])) { res.prefixEqual = false; stop(`${where}: step ${i} BEFORE the first talk differs (old "${a[i]?.a}", new "${b[i]?.a}")`); break; }
  /* align: the new walk with the wheel steps out */
  const kept = [];
  b.forEach((st, i) => {
    if (st.a.startsWith(WHEEL)) { res.wheel += 1; for (const k of Object.keys(st.d)) res.wheelFields.add(k); if (!st.a.endsWith('Skip animation') && !st.a.endsWith('Continue to the offers')) stop(`${where}: a wheel step pressed "${st.a}"`); }
    else kept.push(i);
  });
  if (kept.length !== a.length) { res.labelDiff = `aligned length ${kept.length} against ${a.length}`; }
  const n = Math.min(kept.length, a.length);
  for (let i = 0; i < n; i += 1) {
    const x = a[i], y = b[kept[i]];
    if (x.a !== y.a || x.n !== y.n) { if (!res.labelDiff) res.labelDiff = `aligned step ${i}: old "${x.a}" (${x.n} seasons), new "${y.a}" (${y.n} seasons)`; break; }
    const ra = runA[i], rb = runB[kept[i]];
    const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
    for (const k of keys) {
      if (k === 'phase' || k === 'contractTalk') continue;
      if (ra[k] !== rb[k]) { if (!res.careerDiff) res.careerDiff = `aligned step ${i} (after "${x.a}"): field ${k} differs`; }
    }
    if (J(x) === J(y)) { res.identical += 1; continue; }
    const inTalk = TALK.has(y.p); const hasTalk = rb.contractTalk !== undefined;
    res.phases.add(`${x.p}>${y.p}`);
    if (inTalk) res.talkSteps += 1;
    if (hasTalk) res.withTalkField += 1;
    const markupMoved = x.m !== y.m || x.t !== y.t;
    if (!markupMoved) res.saveOnly += 1;
    if (markupMoved && !inTalk) res.markupOutsideTalk.push(`${i}:"${x.a}" p ${x.p}>${y.p} t ${x.t === y.t ? 'same words' : 'words differ'}`);
    if (!inTalk && !hasTalk && x.s !== y.s) stop(`${where}: aligned step ${i} (after "${x.a}") has another save hash with no talk held`);
  }
  if (res.labelDiff) stop(`${where}: ${res.labelDiff}`);
  if (res.careerDiff) stop(`${where}: ${res.careerDiff}`);
  return res;
}
const line = r => `${r.where}: ${r.old} -> ${r.new} steps, ${r.wheel} wheel steps, first talk at ${r.firstTalk}, prefix ${r.prefixEqual ? 'equal' : 'DIFFERS'}, aligned identical ${r.identical}, differing ${r.old - r.identical} (inside a talk ${r.talkSteps}, talk on the save ${r.withTalkField}, save only ${r.saveOnly}, markup outside a talk ${r.markupOutsideTalk.length}), wheel steps move [${[...r.wheelFields].join(', ')}], phase pairs [${[...r.phases].join(' ')}]`;

if (RIVAL) { rivalMode(); process.exit(stops ? 1 : 0); }

/* Round 1313: the rival mode (see the header). */
function rivalMode() {
  const ONLY = new Set(['c.rival', 'c.pendingRivalryEvent']);
  const unknown = RIVAL.filter(s => !(s in newF.sports));
  if (unknown.length) stop(`--rival names ${unknown.join(', ')}, which the new recording does not hold`);
  const counts = s => ({ clicks: s.path.length, seasons: s.coverage.seasons, screenSteps: Object.values(s.screens).reduce((n, w) => n + w.length, 0),
    rivalBeats: s.coverage.rivalryBeat, rivalChoices: s.coverage.rivalryChoice });
  for (const slug of Object.keys(oldF.sports)) {
    const a = oldF.sports[slug], b = newF.sports[slug];
    console.log(`== ${slug}${RIVAL.includes(slug) ? ' (named: its rival moves)' : ''}`);
    if (!b) { stop(`${slug}: the new recording has no section`); continue; }
    if (!RIVAL.includes(slug)) {
      if (J(a) === J(b)) console.log('   byte equal, section for section');
      else stop(`${slug}: not named, and its section differs (${['path', 'saves', 'screens', 'coverage', 'ssrCreate'].filter(k => J(a[k]) !== J(b[k])).join(', ')})`);
      continue;
    }
    const firstStep = a.path.findIndex((st, i) => J(st) !== J(b.path[i]));
    const parts = a.path.findIndex((st, i) => !b.path[i] || st.a !== b.path[i].a);
    const runA = running(a.path), runB = running(b.path);
    const firstSave = runA.findIndex((ra, i) => { const rb = runB[i]; return !rb || [...new Set([...Object.keys(ra), ...Object.keys(rb)])].some(k => ra[k] !== rb[k]); });
    if (firstStep < 0 && a.path.length === b.path.length) console.log('   path byte equal');
    else console.log(`   path: first differing step ${firstStep} ("${a.path[firstStep]?.a}", ${a.path[firstStep]?.n} seasons; ${['s', 'm', 't', 'p', 'd'].filter(k => J(a.path[firstStep]?.[k]) !== J(b.path[firstStep]?.[k])).join(', ')} differ)`);
    if (firstSave >= 0) {
      const ra = runA[firstSave], rb = runB[firstSave] ?? {};
      const fields = [...new Set([...Object.keys(ra), ...Object.keys(rb)])].filter(k => ra[k] !== rb[k]);
      console.log(`   the first step whose saved career differs: ${firstSave} (after "${a.path[firstSave].a}"), fields [${fields.join(', ')}]`);
      const off = fields.filter(k => !ONLY.has(k));
      if (off.length) stop(`${slug}: the first saved career that differs differs off the rival, in [${off.join(', ')}]`);
      if (firstStep >= 0 && firstStep < firstSave && a.path[firstStep].s !== b.path[firstStep].s) stop(`${slug}: step ${firstStep} has another save hash before any field differs`);
    } else console.log('   no saved career differs on the path');
    console.log(parts < 0 && a.path.length === b.path.length ? '   the click path does not part' : `   the click path parts at step ${parts < 0 ? Math.min(a.path.length, b.path.length) : parts}: old "${a.path[parts]?.a}", new "${b.path[parts]?.a}"`);
    if (firstSave >= 0 && parts >= 0 && parts < firstSave) stop(`${slug}: the click path parts at ${parts}, before any saved career differs (${firstSave})`);
    const moved = Object.keys(a.saves).filter(n => a.saves[n] !== b.saves[n]);
    const walks = Object.keys(a.screens).filter(n => J(a.screens[n]) !== J(b.screens[n]));
    const ca = counts(a), cb = counts(b);
    console.log(`   counts old -> new: ${Object.keys(ca).map(k => `${k} ${ca[k]} -> ${cb[k]}`).join(', ')}; fixed saves moved ${moved.length} of ${Object.keys(a.saves).length} [${moved.join(', ')}]; screen walks moved ${walks.length} of ${Object.keys(a.screens).length}`);
    const gone = Object.keys(a.saves).filter(n => !(n in b.saves));
    if (gone.length) stop(`${slug}: fixed saves gone from the new recording: ${gone.join(', ')}`);
  }
  console.log(stops ? `RIVAL ATTRIBUTION: ${stops} STOP(S)` : `RIVAL ATTRIBUTION HOLDS: the sports not named are byte equal, and in ${RIVAL.join(' and ')} the first saved career that differs differs only under c.rival or the pending rivalry card`);
}

for (const slug of Object.keys(oldF.sports)) {
  const a = oldF.sports[slug], b = newF.sports[slug];
  console.log(`== ${slug}`);
  const p = compareWalk(`${slug} path`, a.path, b.path);
  console.log('   ' + line(p));
  if (p.markupOutsideTalk.length) console.log(`   path markup outside a talk: ${p.markupOutsideTalk.slice(0, 6).join(' | ')}`);
  if (J(a.coverage) !== J(b.coverage)) { console.log(`   coverage old ${J(a.coverage)}`); console.log(`   coverage new ${J(b.coverage)}`); stop(`${slug}: coverage differs`); } else console.log(`   coverage equal: extension ${a.coverage.extension}, freeagency ${a.coverage.freeagency}, seasons ${a.coverage.seasons}`);
  if (J(a.ssrCreate) !== J(b.ssrCreate)) stop(`${slug}: the server rendered create screen differs`);
  const names = Object.keys(b.saves);
  const added = names.filter(n => !(n in a.saves));
  console.log(`   saves: ${Object.keys(a.saves).length} -> ${names.length}, new [${added.join(', ')}]`);
  for (const n of Object.keys(a.saves)) {
    if (a.saves[n] === b.saves[n]) continue;
    const x = JSON.parse(a.saves[n]), y = JSON.parse(b.saves[n]);
    const top = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => J(x[k]) !== J(y[k]));
    const cKeys = top.includes('c') ? [...new Set([...Object.keys(x.c), ...Object.keys(y.c)])].filter(k => J(x.c[k]) !== J(y.c[k])) : [];
    console.log(`   save "${n}" differs in [${top.join(', ')}]${cKeys.length ? ` c fields [${cKeys.join(', ')}]` : ''}: phase ${x.phase} -> ${y.phase}`);
    if (cKeys.length) stop(`${slug}: fixed save "${n}" differs in a career field`);
  }
  for (const n of added) {
    const y = JSON.parse(b.saves[n]); const w = y.contractTalk?.wheel;
    console.log(`   new save "${n}": phase ${y.phase}, talk ${y.contractTalk ? y.contractTalk.kind ?? 'stub' : 'none'}${y.contractTalk?.talk ? `, pushed ${y.contractTalk.talk.pushed}` : ''}${w ? `, wheel ${w.result} seen ${w.seen} draws ${w.draws.length}` : ''}, screens ${b.screens[n]?.length ?? 0} steps, opens on "${(b.screens[n]?.[0]?.t ?? '').slice(0, 70)}" phase ${b.screens[n]?.[0]?.p}, then "${b.screens[n]?.[1]?.a ?? ''}"`);
  }
  let same = 0; const moved = [];
  for (const n of Object.keys(a.screens)) {
    if (J(a.screens[n]) === J(b.screens[n])) { same += 1; continue; }
    const r = compareWalk(`${slug} save "${n}"`, a.screens[n], b.screens[n] ?? []);
    moved.push(`${n}: ${r.old}->${r.new}, ${r.wheel} wheel, aligned identical ${r.identical}, in talk ${r.talkSteps}, talk held ${r.withTalkField}, markup outside ${r.markupOutsideTalk.length}`);
  }
  console.log(`   screens: ${same} of ${Object.keys(a.screens).length} old walks byte identical; moved: ${moved.join(' || ') || 'none'}`);
}
console.log(stops ? `ATTRIBUTION: ${stops} STOP(S)` : 'ATTRIBUTION HOLDS: no step before a first talk differs, the paths are the same sequence with the wheel steps out, and no career field, team quality or coach differs at any aligned step');

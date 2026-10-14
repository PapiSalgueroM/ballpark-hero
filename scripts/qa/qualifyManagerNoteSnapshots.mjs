/* Pinned remote qualification for three recorded Manager note descriptions.
   Context and desk identity are prepared; match settlement and saved replies are real. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Use remote offline CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PARENT = '8caf3307c980672fea887dddfbd33f38efcc0492';
/* Release BE join (Round BEG): the five core files are bound to CORE_REF. On the packet branch that is PARENT; on a
   newer core (Release BD's five substitutions) the join passes MANAGER_NOTES_CORE_REF=HEAD, so the core is the
   committed core of the tree under test while the decisions file still differs from PARENT by the three spans only. */
const CORE_REF = process.env.MANAGER_NOTES_CORE_REF || PARENT;
const PHASE = process.env.MANAGER_NOTES_PHASE;
assert(['baseline', 'fixed'].includes(PHASE));
assert(process.env.MANAGER_NOTES_OUT && path.isAbsolute(process.env.MANAGER_NOTES_OUT));
const OUT = path.join(process.env.MANAGER_NOTES_OUT, PHASE), ENGINE = path.join(ROOT, 'src/lib/clubManager.ts');
const DECISIONS = path.join(ROOT, 'src/lib/clubManagerDecisions.ts'), sha = value => createHash('sha256').update(value).digest('hex');
assert(!fs.existsSync(OUT), 'Refuse to replace note evidence'); fs.mkdirSync(OUT, { recursive: true });
const COPY = [
  { id: 'boardPressure', old: '    text: s => `Board patience is ${Math.round(s.boardConfidence * 10) / 10}. They want a progress review; the press officer offers an update too.`,',
    next: '    text: s => `Board patience was ${Math.round(s.boardConfidence * 10) / 10} when this note was written. They want a progress review; the press officer offers an update too.`,' },
  { id: 'pressPressure', old: '    text: s => `Press mood is ${s.press!.mood}. The press officer suggests a calm briefing, or a private review with the board.`,',
    next: '    text: s => `Press mood was ${s.press!.mood} when this note was written. The press officer suggests a calm briefing, or a private review with the board.`,' },
  { id: 'injurySupport', old: "    text: s => { const p = injuredPlayer(s)!; return `${p.name} has ${p.injuryWeeks} injury week${p.injuryWeeks === 1 ? '' : 's'} left. Staff suggest a check in or a board update. Neither changes the recovery time.`; },",
    next: "    text: s => { const p = injuredPlayer(s)!; return `${p.name} had ${p.injuryWeeks} injury week${p.injuryWeeks === 1 ? '' : 's'} left when this note was written. Staff suggest a check in or a board update. Neither changes the recovery time.`; }," },
];
const files = ['src/lib/clubManager.ts', 'src/lib/clubManagerDecisions.ts', 'src/lib/clubManagerMeters.ts',
  'src/hooks/useClubManager.ts', 'src/pages/ClubManager.tsx', 'src/components/club-manager/InboxCard.tsx',
  'scripts/qa/qualifyManagerNoteSnapshots.mjs', '.github/workflows/manager-note-snapshots.yml'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(ROOT, file), 'utf8')]));
for (const [file, text] of held) { const target = path.join(OUT, 'before', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text); }
function git(args) { const run = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run.status, 0); assert(!run.error && !run.signal); return run.stdout; }
const parent = git(['show', PARENT + ':src/lib/clubManagerDecisions.ts']), current = held.get('src/lib/clubManagerDecisions.ts');
let projected = parent;
for (const spec of COPY) { assert.equal(projected.split(spec.old).length - 1, 1); projected = projected.replace(spec.old, spec.next); }
assert.equal(current, PHASE === 'baseline' ? parent : projected, 'Only the three approved text spans may differ');
const inverse = COPY.reduce((text, spec) => text.replace(spec.next, spec.old), projected); assert.equal(inverse, parent);
fs.writeFileSync(path.join(OUT, 'decisions.parent.ts'), parent); fs.writeFileSync(path.join(OUT, 'decisions.projected.ts'), projected);
const parentBindings = files.slice(0, 6).map(file => { const source = git(['show', (file === 'src/lib/clubManagerDecisions.ts' ? PARENT : CORE_REF) + ':' + file]);
  if (file !== 'src/lib/clubManagerDecisions.ts') assert.equal(held.get(file), source);
  return { file, parentSha256: sha(source), candidateSha256: sha(held.get(file)) }; });
const record = { head: git(['rev-parse', 'HEAD']).trim(), parent: PARENT, coreRef: CORE_REF, phase: PHASE, status: 'running', parentBindings,
  textChanges: COPY, inverseSha256: sha(inverse), compilations: [], initialization: null, kickoff: [], cases: [], controls: [],
  limits: ['Fictional Manager identity and one complete halftime context are prepared. No natural offer rate is claimed.',
    'Name selection uses the original desk hash and never edits its queue. Actual match outcomes are not selected or rewritten.',
    'Parent and candidate execute original cores with complete input-vector replay. No observer or counter normalization is used.',
    'Baseline records three stale present-tense descriptions; it does not claim a gameplay effect bug.'] };
const write = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ...record, sourceReceipts: [...held].map(([file, before]) => ({
  file, beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(path.join(ROOT, file))) })) }, null, 2) + '\n'); write();
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true }); const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/manager-note-snapshots-'));
const previousStorage = globalThis.localStorage, PreviousDate = Date, memory = new Map(), clock = Date.parse('2026-10-13T16:00:00Z');
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key), clear: () => memory.clear(), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; } };
globalThis.Date = class extends PreviousDate { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } };
const copy = value => JSON.parse(JSON.stringify(value));
function random(input, action) { const previous = Math.random, draws = []; let seed = typeof input === 'number' ? input : 0;
  Math.random = () => { let value; if (Array.isArray(input)) { value = input[draws.length]; assert(value !== undefined, 'Unlisted replay input'); }
    else { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; value = ((t ^ t >>> 14) >>> 0) / 4294967296; }
    draws.push(value); return value; };
  try { const result = action(); if (Array.isArray(input)) assert.equal(draws.length, input.length); return { result, draws }; } finally { Math.random = previous; } }
async function compile(name, source, engine = false) { const outfile = path.join(tmp, name + '.mjs'), esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: [engine ? ENGINE : DECISIONS], outfile, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'actual-note-source-copy', setup(build) { build.onLoad({ filter: /\.ts$/ }, args =>
      path.resolve(args.path) === DECISIONS ? { contents: source, loader: 'ts', resolveDir: path.dirname(DECISIONS) } : undefined); } }] });
  fs.copyFileSync(outfile, path.join(OUT, name + '.mjs')); record.compilations.push({ file: name + '.mjs', sha256: sha(fs.readFileSync(outfile)), decisionsSha256: sha(source) }); write();
  return import(pathToFileURL(outfile).href); }
function saved(E, state, row) { const held = JSON.stringify(state), run = random([], () => { assert(E.saveCareer(state)); return E.loadCareer(); });
  row.push({ before: copy(state), raw: memory.get(E.SAVE_KEY), after: copy(run.result), draws: run.draws }); write();
  assert(run.result); assert.equal(JSON.stringify(state), held); assert.equal(JSON.stringify(run.result), held); return run.result; }
function textFor(id, snapshot) { if (id === 'boardPressure') return 'Board patience was 34 when this note was written. They want a progress review; the press officer offers an update too.';
  if (id === 'pressPressure') return 'Press mood was 34 when this note was written. The press officer suggests a calm briefing, or a private review with the board.';
  const p = snapshot.squad.find(player => player.injuryWeeks === 1 && player.morale === 40); assert(p);
  return p.name + ' had 1 injury week left when this note was written. Staff suggest a check in or a board update. Neither changes the recovery time.'; }
async function qualify() { try {
  const A = await compile('engine-parent', parent, true), B = await compile('engine-current', current, true), D = await compile('decisions-current', current);
  assert.notEqual(A, B); assert.notEqual(A.resumeMatch, B.resumeMatch);
  if (PHASE === 'baseline') assert.equal(record.compilations[0].sha256, record.compilations[1].sha256);
  const initialization = random(13620001, () => A.startCareer('Arsenal', undefined, undefined,
    { name: 'Snapshot Fixture', nationality: 'England', background: 'analyst', style: 'balanced' }));
  const replayed = random(initialization.draws, () => B.startCareer('Arsenal', undefined, undefined,
    { name: 'Snapshot Fixture', nationality: 'England', background: 'analyst', style: 'balanced' }));
  record.initialization = { original: copy(initialization), current: copy(replayed) }; write(); assert.deepEqual(replayed, initialization);
  let original = initialization.result, candidate = replayed.result;
  for (let entry = 0; entry < 8; entry++) { const before = copy(original), heldA = JSON.stringify(original), heldB = JSON.stringify(candidate);
    const a = random(13620002 + entry, () => A.playNextEntry(original, { skipHalftime: false }));
    const b = random(a.draws, () => B.playNextEntry(candidate, { skipHalftime: false })); record.kickoff.push({ before, original: copy(a), current: copy(b) }); write();
    assert.equal(JSON.stringify(original), heldA); assert.equal(JSON.stringify(candidate), heldB); assert.deepEqual(b, a); original = a.result.state; candidate = b.result.state;
    if (a.result.kind === 'halftime') break; assert.equal(a.result.kind, 'window'); }
  assert(original.live && candidate.live && record.kickoff.at(-1).original.result.kind === 'halftime');
  const target = original.squad.find(p => !p.isYouth && !original.live.onPitch.includes(p.id)); assert(target, 'Actual bench subject required');
  for (const spec of COPY) {
    const context = copy(original); context.boardConfidence = 34; context.press.mood = 34;
    context.squad = context.squad.map(p => p.id === target.id ? { ...p, injuryWeeks: 1, morale: 40 } : p);
    const row = { id: spec.id, preparation: ['Only fictional manager name, board34, press34 and the actual nonplaying subject injuryWeeks1/morale40 are prepared.'],
      subjectId: target.id, probes: [], snapshot: null, original: null, current: null, saves: [], replies: [] }; record.cases.push(row); write();
    for (let trial = 0; trial < 512; trial++) { context.manager.name = 'Snapshot Fixture ' + spec.id + ' ' + trial;
      const held = JSON.stringify(context), probe = random([], () => D.situationCard(context, []));
      row.probes.push({ trial, name: context.manager.name, card: copy(probe.result), draws: probe.draws }); write(); assert.equal(JSON.stringify(context), held);
      if (probe.result?.deckId === spec.id) break; }
    assert.equal(row.probes.at(-1).card?.deckId, spec.id, 'Original hash must select the disclosed note within512 names'); row.snapshot = copy(context); write();
    const before = JSON.stringify(context), candidateInput = copy(context), a = random(13620020, () => A.resumeMatch(context));
    const b = random(a.draws, () => B.resumeMatch(candidateInput));
    row.original = copy(a); row.current = copy(b); row.candidateInputAfter = copy(candidateInput); write();
    assert.equal(JSON.stringify(context), before); assert.equal(JSON.stringify(candidateInput), before); assert.deepEqual(b.draws, a.draws);
    assert.equal(a.result.kind, 'match'); assert.equal(b.result.kind, 'match'); assert(!a.result.state.sacked && !b.result.state.sacked);
    const oldNote = a.result.state.decisions.find(item => !item.resolved && item.deckId === spec.id), note = b.result.state.decisions.find(item => !item.resolved && item.deckId === spec.id);
    assert(oldNote && note); const expectedText = textFor(spec.id, context);
    /* Release BE join: structuredClone, not the JSON copy, so a field the newer core leaves undefined (Release BD's goal
       events carry assist: undefined) is held on both sides instead of vanishing from the parent side only. */
    const expectedResult = structuredClone(a.result); expectedResult.state.decisions = expectedResult.state.decisions.map(item => item.id === note.id
      ? { ...item, text: PHASE === 'baseline' ? oldNote.text : expectedText } : item);
    assert.deepEqual(b.result, expectedResult, 'Every actual match field outside the selected text must equal the parent');
    row.captured = { board: 34, press: 34, injuryWeeks: 1 }; row.settled = { board: b.result.state.boardConfidence, press: b.result.state.press.mood,
      injuryWeeks: b.result.state.squad.find(p => p.id === target.id).injuryWeeks }; write();
    assert.equal(row.settled.injuryWeeks, 0); assert.notEqual(row.settled.board, 34); assert.notEqual(row.settled.press, 34);
    assert.equal(note.text.includes('when this note was written'), PHASE === 'fixed'); assert(!oldNote.text.includes('when this note was written'));
    let loaded = saved(B, b.result.state, row.saves); loaded = saved(B, loaded, row.saves);
    for (const index of [0, note.options.length - 1]) { const input = copy(loaded), wanted = copy(input), effect = note.options[index].effect;
      let line = 'Noted. Nothing changed.';
      if (effect.kind === 'move') { if (spec.id === 'boardPressure') { wanted.boardConfidence = Math.min(100, Math.max(1, input.boardConfidence + 3)); line = 'Done. Board patience +3.'; }
        else if (spec.id === 'pressPressure') { wanted.press.mood = Math.min(100, Math.max(0, input.press.mood + 4)); line = 'Done. Press mood +4.'; }
        else { const p = wanted.squad.find(p => p.id === note.playerId); p.morale = Math.min(99, Math.max(5, p.morale + 6)); line = "Done. " + p.name + "'s morale +6."; } }
      wanted.decisions = wanted.decisions.map(item => item.id === note.id ? { ...item, options: [], resolved: line } : item);
      const held = JSON.stringify(input), run = random([], () => B.answerMessage(input, note.id, index)); row.replies.push({ index, before: input, actual: copy(run), expected: wanted }); write();
      assert.equal(JSON.stringify(input), held); assert.deepEqual(run.result, wanted); const after = saved(B, saved(B, run.result, row.saves), row.saves);
      const repeated = random([], () => B.answerMessage(after, note.id, index)); row.replies[row.replies.length - 1].repeated = copy(repeated); write();
      assert.equal(repeated.result, after, 'Actual resolved reply stays consumed'); }
    if (PHASE === 'fixed') { assert.equal(current.split(spec.next).length - 1, 1); const fault = current.replace(spec.next, spec.old);
      assert.notEqual(fault, current); assert.equal(fault.replace(spec.old, spec.next), current); fs.writeFileSync(path.join(OUT, spec.id + '.control.ts'), fault);
      const C = await compile('decisions-control-' + spec.id, fault), definition = C.DECK.find(card => card.id === spec.id);
      const run = random([], () => C.buildSituation(context, definition)); const expected = { ...note, text: oldNote.text };
      const control = { id: spec.id, beforeSha256: sha(current), faultSha256: sha(fault), inverseSha256: sha(fault.replace(spec.old, spec.next)),
        input: copy(context), actual: copy(run), expected, snapshotDetected: run.result.text === expectedText }; record.controls.push(control); write();
      assert.deepEqual(run.result, expected); assert.equal(control.snapshotDetected, false, 'Effective old caption must lose only the snapshot qualification'); }
  }
  assert.equal(record.cases.length, 3); assert.equal(record.controls.length, PHASE === 'fixed' ? 3 : 0);
  for (const [file, source] of held) assert.equal(fs.readFileSync(path.join(ROOT, file), 'utf8'), source);
  assert.equal(record.cases.reduce((sum, row) => sum + row.saves.length, 0), 18);
  assert.equal(record.cases.reduce((sum, row) => sum + row.replies.length, 0), 6);
  record.status = 'complete'; write(); console.log('Actual Manager notes: three original-whistle cases, full result/input holds and identical complete replay vectors.');
  console.log('Each actual note captures injury1 before the same whistle saves0, alongside board/press settlement after capture.');
  console.log('Actual saves: eighteen canonical write/load cycles; three meter replies, three free declines and six refused repeat attempts.');
  console.log('Phase ' + PHASE + ': three text-only snapshot observations; ' + record.controls.length + ' effective copied old-caption controls; no gameplay, core or schema change.');
} catch (error) { record.status = 'failed'; record.methodError = error?.stack || String(error); write(); throw error;
} finally { globalThis.Date = PreviousDate; if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  fs.rmSync(tmp, { recursive: true, force: true }); } }
await qualify();

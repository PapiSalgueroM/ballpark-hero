import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');

function ownedControl(id, actual, mutate, judge, marker) {
  const before = JSON.stringify(actual), changed = structuredClone(actual);
  mutate(changed);
  const after = JSON.stringify(changed);
  assert.notEqual(sha(after), sha(before), 'CHROME_CONTROL_ACTUAL_RECORD_CHANGED_' + id);
  let caught = null;
  try { judge(changed); } catch (error) { caught = error; }
  assert(caught instanceof assert.AssertionError && caught.message.includes(marker), 'CHROME_CONTROL_OWNED_ASSERTION_' + id);
  return { id, baselineSha256: sha(before), changedSha256: sha(after), ownedMarker: marker, actualNativeAssertion: caught.message };
}
function judgeOwnedEvidence(id, evidence, text) {
  if (id === 'live-fit') {
    const views = evidence.filter(row => Object.hasOwn(row, 'width'));
    assert.deepEqual(views.map(row => row.width), [320, 390, 768, 1280, 844], 'CHROME_FIXED_LIVE_FIVE_ACTUAL_VIEWS');
    for (const view of views) assert(view.back?.hit === true && view.score?.hit === true, 'CHROME_FIXED_LIVE_BACK_SCORE_HITS');
    const compact = evidence.find(row => Object.hasOwn(row, 'originalSuccessfulCompactPauseLines'))?.originalSuccessfulCompactPauseLines;
    assert(Array.isArray(compact) && compact.length === 1 && /^  ok    Back folds the match to a card reading ".+", and the clock held at \d+' for 2\.6 seconds$/.test(compact[0]), 'CHROME_FIXED_LIVE_COMPACT_PAUSE');
    assert(text.includes('playLiveMatchFit: all green. The goal in order, reduced motion, the fit at five sizes, nothing moves the page, the reload, Back, a wide screen, an own goal drawn as one.'), 'CHROME_FIXED_LIVE_ORIGINAL_CLOSING');
  } else if (id === 'draft-fold') {
    const row = evidence[0];
    assert(row && row.failed === 0 && row.originalCheckCount === 44 && row.checks.length === 44 && row.checks.every(check => check.ok === true), 'CHROME_FIXED_DRAFT_ALL_ORIGINAL_CHECKS');
    assert.equal(row.difficultyFold.length, 2, 'CHROME_FIXED_DRAFT_TWO_FOLD_CHECKS');
    for (const [tag, height] of [['390x844', 844], ['1280x900', 900]]) {
      const check = row.difficultyFold.find(check => check.label.startsWith(tag + ':'));
      const match = check?.label.match(/Deep Cuts ends at (\d+) of (\d+)/);
      assert(check?.ok === true && match && Number(match[2]) === height && Number(match[1]) <= height, 'CHROME_FIXED_DRAFT_DIFFICULTY_FOLD');
    }
    assert(/playDraftDetectiveReports: 44 checks, 0 failed\./.test(text), 'CHROME_FIXED_DRAFT_ORIGINAL_CLOSING');
  } else if (id === 'conquest-hit') {
    const labels = ['the timeline is in the viewport and under the mouse before the drag', 'the drag moved the thumb off the end',
      'dragging the thumb to the left end shows Start', 'the Start map paints one empire per home ring', 'release returns the map to now'];
    assert.equal(evidence.length, 4, 'CHROME_FIXED_CONQUEST_FOUR_REAL_JOURNEYS');
    for (const route of ['/conquest', '/soccer-conquest']) for (const width of [390, 430]) {
      const tag = route + ' @' + width, row = evidence.find(row => row.tag === tag);
      assert(row && row.originalTimelinePassLines.length === 5 && labels.every(label => row.originalTimelinePassLines.some(line => line.startsWith('  PASS  5. ' + label + ' (' + tag + ')'))), 'CHROME_FIXED_CONQUEST_ACTUAL_REACH_AND_DRAG');
    }
    assert(/\d+ checks, 0 failed/.test(text) && text.includes('ALL CONQUEST SCENE SCREEN CHECKS PASSED'), 'CHROME_FIXED_CONQUEST_ORIGINAL_CLOSING');
  }
}
async function main() {
  const root = process.cwd(), out = process.env.CHROME_BASELINE_OUT;
  assert(process.env.CI && out && path.isAbsolute(out), 'CHROME_BASELINE_REMOTE_SETUP');
  const recipes = [
    { id: 'live-fit', script: 'scripts/playLiveMatchFit.mjs', minutes: 18, env: { PORT: '4191' } },
    { id: 'draft-fold', script: 'scripts/playDraftDetectiveReports.mjs', minutes: 8, env: {} },
    { id: 'conquest-hit', script: 'scripts/playConquestScenes.mjs', minutes: 12, env: { WIDTHS: '390,430', ROUTES: '/conquest,/soccer-conquest' } },
    { id: 'career-depth', script: 'scripts/playSoccerCareerDepth.mjs', minutes: 10, env: {} },
    { id: 'route-menu-preserve', script: 'scripts/qa/playSharedChromeBaselineProbe.mjs', minutes: 3, env: {} },
  ];
  const runs = [];
  for (const recipe of recipes) {
    const directory = path.join(out, recipe.id);
    fs.mkdirSync(directory, { recursive: false });
    const transport = path.join(directory, 'node.transport');
    fs.writeFileSync(transport, '', { flag: 'wx' });
    const log = fs.openSync(path.join(directory, 'stdout.log'), 'wx');
    const err = fs.openSync(path.join(directory, 'stderr.log'), 'wx');
    const env = { ...process.env, ...recipe.env, CHROME_RECIPE_OUT: directory, RC_OUT: directory, SHOTS: directory,
      LIVE_FIT_SHOTS: directory, BASE: 'http://127.0.0.1:4173', SWEEP_BASE: 'http://127.0.0.1:4173',
      SIM_OFFLINE_RECEIPT: transport };
    for (const key of ['LIVE_FIT_REPORT', 'LIVE_FIT_REPLAY', 'LIVE_FIT_OWN', 'LIVE_FIT_SAVE', 'LIVE_FIT_CONTROL', 'CONQUEST_SCENES_CONTROL', 'NO_DOUBLE_SWAP']) delete env[key];
    const result = spawnSync(process.execPath, [recipe.script], { cwd: root, env, timeout: recipe.minutes * 60000, killSignal: 'SIGTERM', stdio: ['ignore', log, err] });
    fs.closeSync(log); fs.closeSync(err);
    const raw = { id: recipe.id, script: recipe.script, status: result.status, signal: result.signal, error: result.error ? String(result.error.stack || result.error) : null };
    fs.writeFileSync(path.join(directory, 'process.json'), JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(directory, 'exit.txt'), String(result.status) + '\n', { flag: 'wx' });
    const text = fs.readFileSync(path.join(directory, 'stdout.log'), 'utf8');
    const failures = text.split(/\r?\n/).filter(line => /^\s*FAIL(?::|\s)/.test(line));
    const errors = [], positiveEvidence = [], controls = [];
    const ioFile = path.join(directory, 'browser-io.jsonl'), ioPresent = fs.existsSync(ioFile);
    let io = null;
    if (ioPresent) {
      try {
        io = fs.readFileSync(ioFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
        const allowed = new Set(['prepared-font', 'source-shell-fixture', 'source-conquest-completion-refusal', 'local-flag-abort']);
        if (!io.every(row => row && typeof row === 'object' && !Array.isArray(row) && allowed.has(row.kind))) errors.push('unknown or malformed external browser telemetry');
      } catch { errors.push('malformed actual browser telemetry'); }
    } else if (recipe.id !== 'draft-fold') errors.push('required browser telemetry is missing');
    const unknown = io?.filter(row => row.kind === 'unknown') ?? null;
    if (result.error || result.signal || ![0, 1].includes(result.status)) errors.push('process/setup/timeout refusal');
    if (fs.statSync(transport).size !== 0) errors.push('Node transport receipt is nonempty');
    let owned = [], diagnostics = [];
    if (recipe.id === 'live-fit') {
      for (const width of [320, 390, 768, 1280, 844]) {
        const file = path.join(directory, 'fit-' + width + '.png.raw.json');
        if (!fs.existsSync(file)) { errors.push('missing actual fit snapshot ' + width); continue; }
        const sample = JSON.parse(fs.readFileSync(file, 'utf8'));
        const back = sample.nodes.filter(node => node.label === 'Back to the club page');
        const score = sample.nodes.filter(node => node.label === null && node.tag !== 'INPUT');
        if (!(sample.stageCount === 1 && back.length === 1 && score.length === 1)) errors.push('missing real stage Back/score snapshot ' + width);
        positiveEvidence.push({ width, back: back[0] ?? null, score: score[0] ?? null, source: path.basename(file) });
      }
      const compact = text.split(/\r?\n/).filter(line => /^  ok    Back folds the match to a card reading ".+", and the clock held at \d+' for 2\.6 seconds$/.test(line));
      positiveEvidence.push({ originalSuccessfulCompactPauseLines: compact, rawFoldedSidecar: false,
        source: 'scripts/playLiveMatchFit.mjs', gitBlob: '5d86ee9cd1b56195f5351c280b98f017928a6183' });
    } else if (recipe.id === 'draft-fold') {
      const file = path.join(directory, 'draft-detective-evidence.json');
      if (!fs.existsSync(file)) errors.push('missing actual draft evidence');
      else {
        const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
        positiveEvidence.push({ difficultyFold: evidence.checks.filter(row => /: both difficulty buttons are on the first screen \(Deep Cuts ends at \d+ of \d+\)/.test(row.label)),
          originalCheckCount: evidence.checksRun, failed: evidence.failed, checks: evidence.checks });
      }
    } else if (recipe.id === 'conquest-hit') {
      for (const route of ['/conquest', '/soccer-conquest']) for (const width of [390, 430]) {
        const tag = route + ' @' + width;
        positiveEvidence.push({ tag, originalTimelinePassLines: text.split(/\r?\n/).filter(line => line.startsWith('  PASS  5. ') && line.includes(' (' + tag + ')')) });
      }
    } else if (recipe.id === 'career-depth') {
      const allowed = new Set([
        'FAIL 390x844: closing the record sheet restores body scrolling without moving the page',
        'FAIL 390x844 failed chunk: error locks body scrolling without moving the page',
        'FAIL 390x844 failed chunk: Escape restores the tile focus and original body scrolling',
        'FAIL 390x844 failed chunk: keyboard Back restores tile focus and body scrolling after reopening',
      ]);
      diagnostics = failures.filter(line => allowed.has(line));
      if (new Set(diagnostics).size !== diagnostics.length) errors.push('duplicate pre-existing Depth diagnostic');
      if (!/playSoccerCareerDepth: 80 checks, [0-4] failed/.test(text)) errors.push('missing actual career-depth closing output');
    } else {
      const file = path.join(directory, 'probe.json');
      if (!fs.existsSync(file) || JSON.parse(fs.readFileSync(file, 'utf8')).status !== 'REAL_DELAYED_ROUTE_MENU_PASS') errors.push('missing actual delayed Search preserve');
    }
    if (['live-fit', 'draft-fold', 'conquest-hit'].includes(recipe.id)) {
      try {
        judgeOwnedEvidence(recipe.id, positiveEvidence, text);
        const mutate = recipe.id === 'live-fit' ? copy => { copy.find(row => Object.hasOwn(row, 'width')).back.hit = false; }
          : recipe.id === 'draft-fold' ? copy => { const row = copy[0].difficultyFold.find(row => row.label.startsWith('390x844:')); row.label = row.label.replace(/ends at \d+ of 844/, 'ends at 845 of 844'); }
          : copy => { copy[0].originalTimelinePassLines.splice(0, 1); };
        const marker = recipe.id === 'live-fit' ? 'CHROME_FIXED_LIVE_BACK_SCORE_HITS' : recipe.id === 'draft-fold' ? 'CHROME_FIXED_DRAFT_DIFFICULTY_FOLD' : 'CHROME_FIXED_CONQUEST_ACTUAL_REACH_AND_DRAG';
        controls.push(ownedControl(recipe.id + '-positive-contract', positiveEvidence, mutate, copy => judgeOwnedEvidence(recipe.id, copy, text), marker));
      } catch (error) { errors.push(String(error.stack || error)); }
    }
    const accepted = new Set(diagnostics);
    const stray = failures.filter(line => !accepted.has(line));
    if (stray.length) errors.push('unowned harness failures');
    if (recipe.id !== 'career-depth' && result.status !== 0) errors.push('owned fixed recipe exit0 not observed');
    if (recipe.id === 'career-depth' && result.status !== (failures.length ? 1 : 0)) errors.push('depth exit disagrees with its actual failures');
    runs.push({ ...raw, owned, positiveEvidence, controls, diagnostics, stray, unknown, errors,
      browserIoFilePresent: ioPresent, browserIoStatus: ioPresent ? 'OBSERVED_AND_CHECKED' : 'ABSENT_UNKNOWN_ORIGINAL_ROUTE_OVERRIDE',
      preparedFontRequests: io?.filter(row => row.kind === 'prepared-font').length ?? null });
  }
  const refused = runs.some(run => run.errors.length) || runs.flatMap(run => run.controls).length !== 3;
  const report = { status: refused ? 'FIXED_METHOD_OR_OWNERSHIP_REFUSED' : 'CURRENT_SHARED_CHROME_OWNED_FIXES_OBSERVED',
    source: process.env.GITHUB_SHA, base: process.env.BASE_SOURCE, applicationQualified: false, localExecution: false,
    runs, controls: runs.flatMap(run => run.controls), limits: ['Only the three named games are required to have no original harness failures; the four exact pre-existing Depth diagnostics remain separately reported if still observed.',
      'The original successful compact/pause line proves the original Back assertions; no folded-state raw sidecar or pixel review is claimed.',
      'The actual delayed Search journey is a preserve. A separate actual game host-arrival and nested chrome geometry probe is required.',
      'Full readers/caps/HomeFold and final visual qualification remain separate gates.'] };
  fs.writeFileSync(path.join(out, 'fixed-report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  if (refused) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

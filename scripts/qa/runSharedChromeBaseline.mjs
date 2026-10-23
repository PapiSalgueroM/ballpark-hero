import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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
    const ioFile = path.join(directory, 'browser-io.jsonl');
    const io = fs.existsSync(ioFile) ? fs.readFileSync(ioFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
    const unknown = io.filter(row => row.kind === 'unknown');
    const errors = [];
    if (result.error || result.signal || ![0, 1].includes(result.status)) errors.push('process/setup/timeout refusal');
    if (fs.statSync(transport).size !== 0) errors.push('Node transport receipt is nonempty');
    if (unknown.length) errors.push('unknown external browser requests were refused');
    let owned = [], diagnostics = [];
    if (recipe.id === 'live-fit') {
      owned = failures.filter(line => /Back is missing or covered|after Back there are 1 stage boxes and 0 compact cards/.test(line));
      for (const width of [320, 390, 768, 1280, 844]) {
        const file = path.join(directory, 'fit-' + width + '.png.raw.json');
        if (!fs.existsSync(file)) { errors.push('missing actual fit snapshot ' + width); continue; }
        const sample = JSON.parse(fs.readFileSync(file, 'utf8'));
        const back = sample.nodes.find(node => node.label === 'Back to the club page');
        if (!(sample.stageCount === 1 && back && back.hit === false && back.hitNode?.chrome === true))
          errors.push('missing actual shared-chrome Back hit refusal ' + width);
      }
      if (owned.filter(line => /Back is missing or covered/.test(line)).length !== 5) errors.push('expected five owned fit lines not observed');
      if (!owned.some(line => /after Back there are 1 stage boxes and 0 compact cards/.test(line))) errors.push('owned Back-to-card failure not observed');
      if (!/playLiveMatchFit: \d+ failures?\./.test(text)) errors.push('missing actual harness closing output');
    } else if (recipe.id === 'draft-fold') {
      owned = failures.filter(line => /390x844: both difficulty buttons are on the first screen \(Deep Cuts ends at \d+ of 844\)/.test(line));
      const evidenceFile = path.join(directory, 'draft-detective-evidence.json');
      if (!fs.existsSync(evidenceFile)) errors.push('missing actual draft evidence');
      else {
        const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
        const row = evidence.checks.find(row => row.ok === false && /390x844: both difficulty buttons/.test(row.label));
        const match = row?.label.match(/Deep Cuts ends at (\d+) of 844/);
        if (!(match && Number(match[1]) > 844)) errors.push('actual Deep Cuts bottom does not witness the owned fold failure');
      }
      if (owned.length !== 1) errors.push('expected one owned fold failure not observed');
    } else if (recipe.id === 'conquest-hit') {
      owned = failures.filter(line => /^\s*FAIL\s+5\. /.test(line));
      const reach = owned.filter(line => /timeline is in the viewport and under the mouse before the drag/.test(line) && /SOMETHING ELSE answers elementFromPoint/.test(line));
      if (!reach.some(line => /430/.test(line))) errors.push('actual430 timeline hit refusal not observed');
      for (const line of owned) {
        const tag = line.match(/\(([^()]*)\)/)?.[1];
        if (!tag || !reach.some(row => row.includes('(' + tag + ')'))) errors.push('timeline dependent failure without its actual reach refusal');
      }
      if (!/\d+ checks, \d+ failed/.test(text)) errors.push('missing actual conquest closing output');
    } else if (recipe.id === 'career-depth') {
      diagnostics = failures.filter(line => /closing the record sheet restores body scrolling without moving the page|error locks body scrolling without moving the page|Escape restores the tile focus and original body scrolling|keyboard Back restores tile focus and body scrolling after reopening/.test(line));
      if (!/playSoccerCareerDepth: \d+ checks, \d+ failed/.test(text)) errors.push('missing actual career-depth closing output');
    } else {
      if (result.status !== 0) errors.push('route-menu preserve failed');
      const file = path.join(directory, 'probe.json');
      if (!fs.existsSync(file) || JSON.parse(fs.readFileSync(file, 'utf8')).status !== 'REAL_DELAYED_ROUTE_MENU_PASS') errors.push('missing actual delayed-route preserve');
    }
    const accepted = new Set([...owned, ...diagnostics]);
    const stray = failures.filter(line => !accepted.has(line));
    if (stray.length) errors.push('unowned harness failures');
    if (recipe.id !== 'career-depth' && recipe.id !== 'route-menu-preserve' && result.status !== 1) errors.push('owned baseline RED process exit1 not observed');
    if (recipe.id === 'career-depth' && result.status !== (failures.length ? 1 : 0)) errors.push('depth exit disagrees with its actual failures');
    runs.push({ ...raw, owned, diagnostics, stray, unknown, errors, preparedFontRequests: io.filter(row => row.kind === 'prepared-font').length });
  }
  const refused = runs.some(run => run.errors.length);
  const report = { status: refused ? 'BASELINE_METHOD_OR_OWNERSHIP_REFUSED' : 'CURRENT_SHARED_CHROME_RED_OBSERVED',
    source: process.env.GITHUB_SHA, base: process.env.BASE_SOURCE, applicationQualified: false, localExecution: false,
    runs, limits: ['Career record-sheet failures remain separately observed diagnostics, not attributed to closed SiteMenu.',
      'No shared product has been changed. Fixed readers/caps/HomeFold and final visual qualification remain owed.'] };
  fs.writeFileSync(path.join(out, 'baseline-report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  if (refused) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

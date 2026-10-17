#!/usr/bin/env node
// Round BII (Release BI, part three): run a packet workflow's OWN run steps on a remote check runner, in its order,
// with its job env, so the release branch carries the packet's exact proof and validators rather than a retelling.
//
//   node .rc/x/wfrun.mjs <workflow.yml> [--set KEY=VALUE]... [--skip "<step name part>"]... [--only "<part>"]...
//
// --set overrides one job (and step) env value (the release's bindings, for example CM_HANDOVER_BASE=<the head before 287>).
// --skip leaves out every step whose name contains the text; --only runs just the steps whose names contain it.
// `uses:` steps (checkout, setup, artifact upload) are skipped: the remote check already checked out the full history
// and ran npm ci. Expressions: github.workspace, github.sha (the checked out commit), github.run_id, github.run_attempt,
// github.ref, inputs.NAME (read from INPUT_NAME, empty when unset) and quoted strings joined by ||; any other
// expression FAILS CLOSED, as does a shell other than bash, a second job without --job, or an if it cannot read.
// Every step runs even after an earlier one failed (keep going, so one known red cannot hide the rest), each prints
// "STEP <n>/<total> <name>: exit <code>", and the last line names every failed step; the exit is 1 if any failed.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import yaml from 'js-yaml';

const args = process.argv.slice(2);
const file = args.shift();
if (!file || !fs.existsSync(file)) { console.error('wfrun: no workflow file ' + file); process.exit(2); }
const sets = {}, skips = [], onlys = [];
let jobName = null;
while (args.length) {
  const a = args.shift(), v = args.shift();
  if (v === undefined) { console.error('wfrun: ' + a + ' needs a value'); process.exit(2); }
  if (a === '--set') { const i = v.indexOf('='); if (i < 1) { console.error('wfrun: --set KEY=VALUE'); process.exit(2); } sets[v.slice(0, i)] = v.slice(i + 1); }
  else if (a === '--skip') skips.push(v);
  else if (a === '--only') onlys.push(v);
  else if (a === '--job') jobName = v;
  else { console.error('wfrun: unknown option ' + a); process.exit(2); }
}

const wf = yaml.load(fs.readFileSync(file, 'utf8'));
const jobNames = Object.keys(wf.jobs || {});
if (!jobName) {
  if (jobNames.length !== 1) { console.error('wfrun: ' + jobNames.length + ' jobs, name one with --job'); process.exit(2); }
  jobName = jobNames[0];
}
const job = wf.jobs[jobName];
if (!job) { console.error('wfrun: no job ' + jobName); process.exit(2); }
/* On a remote check the checked out commit is the throwaway "rc request <name> for <head>" commit, which adds .rc/ and
   the runner's own workflow file to the branch head. A packet's bind step that diffs its base against the whole tree or
   .github/workflows would see those two and fail for that reason alone, so HEAD is moved back to the branch head it
   names (git reset --mixed: the two become untracked, no file changes) for the run and put back afterwards.
   WFRUN_KEEP_RC=1 keeps the request commit. */
const subject = execFileSync('git', ['log', '-1', '--format=%s'], { encoding: 'utf8' }).trim();
const rcMatch = /^rc request \S+ for ([0-9a-f]{40})$/.exec(subject);
const rcCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (rcMatch && process.env.WFRUN_KEEP_RC !== '1') {
  const parent = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
  if (parent !== rcMatch[1]) { console.error('wfrun: request commit parent ' + parent + ' is not the head it names'); process.exit(2); }
  execFileSync('git', ['reset', '-q', '--mixed', parent]);
  process.on('exit', () => { try { execFileSync('git', ['reset', '-q', '--mixed', rcCommit]); } catch { /* reported by the next line's own checks */ } });
  console.log('wfrun: HEAD moved from the request commit ' + rcCommit.slice(0, 12) + ' to the branch head it checks, ' + parent.slice(0, 12));
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const cwd = process.cwd();

function operand(t, env) {
  t = t.trim();
  let m;
  if ((m = /^'((?:[^']|'')*)'$/.exec(t))) return m[1].replace(/''/g, "'");
  if (t === 'github.workspace') return cwd;
  if (t === 'github.sha') return sha;
  if (t === 'github.run_id') return '0';
  if (t === 'github.run_attempt') return '1';
  if (t === 'github.ref') return 'refs/heads/rc';
  if ((m = /^inputs\.([A-Za-z_][A-Za-z0-9_-]*)$/.exec(t))) return process.env['INPUT_' + m[1]] || '';
  if ((m = /^env\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(t)) && env) return env[m[1]] ?? '';
  throw new Error('wfrun: expression it cannot read: ' + t);
}
function expr(inner, env) {
  for (const part of inner.split('||')) { const v = operand(part, env); if (v) return v; }
  return '';
}
function subst(s, env) {
  return String(s).replace(/\$\{\{([\s\S]*?)\}\}/g, (_, inner) => expr(inner, env));
}
function cond(raw, env, failed) {
  if (raw === undefined || raw === null) return true;
  let s = String(raw).trim();
  const w = /^\$\{\{([\s\S]*)\}\}$/.exec(s); if (w) s = w[1].trim();
  const strings = [];
  s = s.replace(/'((?:[^']|'')*)'/g, (_, v) => { strings.push(v.replace(/''/g, "'")); return ' S' + (strings.length - 1) + ' '; });
  s = s.replace(/env\.([A-Za-z_][A-Za-z0-9_]*)/g, (_, k) => { strings.push(env[k] ?? ''); return ' S' + (strings.length - 1) + ' '; });
  s = s.replace(/inputs\.([A-Za-z_][A-Za-z0-9_-]*)/g, (_, k) => { strings.push(process.env['INPUT_' + k] || ''); return ' S' + (strings.length - 1) + ' '; });
  s = s.replace(/always\(\)/g, ' T ').replace(/success\(\)/g, ' T ').replace(/failure\(\)/g, failed ? ' T ' : ' F ').replace(/cancelled\(\)/g, ' F ');
  if (!/^[\sSTF0-9=!&|()]*$/.test(s)) throw new Error('wfrun: if it cannot read: ' + raw);
  const js = s.replace(/S(\d+)/g, (_, i) => JSON.stringify(strings[+i])).replace(/\bT\b/g, 'true').replace(/\bF\b/g, 'false');
  return Boolean(Function('"use strict"; return (' + js + ');')());
}

const env = { ...process.env, GITHUB_WORKSPACE: cwd, GITHUB_SHA: sha, GITHUB_RUN_ID: '0', GITHUB_RUN_ATTEMPT: '1', CI: process.env.CI || 'true' };
for (const [k, v] of Object.entries({ ...(wf.env || {}), ...(job.env || {}) })) env[k] = subst(v, env);
for (const [k, v] of Object.entries(sets)) env[k] = v;
const defShell = job.defaults?.run?.shell || wf.defaults?.run?.shell || 'bash';
const steps = job.steps || [];
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'wfrun-'));
let failed = false;
const failedNames = [];
let ran = 0;
console.log('wfrun ' + file + ' job ' + jobName + ' at ' + sha + '; sets: ' + (Object.entries(sets).map(([k, v]) => k + '=' + v).join(' ') || 'none'));
steps.forEach((step, i) => {
  const name = step.name || (step.uses ? 'uses ' + step.uses : 'step ' + (i + 1));
  const tag = 'STEP ' + (i + 1) + '/' + steps.length + ' ' + name;
  if (step.uses) { console.log(tag + ': skipped (uses)'); return; }
  if (onlys.length && !onlys.some(o => name.includes(o))) { console.log(tag + ': skipped (--only)'); return; }
  if (skips.some(o => name.includes(o))) { console.log(tag + ': skipped (--skip)'); return; }
  const stepEnv = { ...env };
  for (const [k, v] of Object.entries(step.env || {})) stepEnv[k] = subst(v, stepEnv);
  for (const [k, v] of Object.entries(sets)) stepEnv[k] = v; /* a release binding wins over a step's own env too */
  if (!cond(step.if, stepEnv, failed)) { console.log(tag + ': skipped (if ' + step.if + ')'); return; }
  const shell = step.shell || defShell;
  if (shell !== 'bash') throw new Error('wfrun: shell ' + shell + ' in ' + name);
  const script = path.join(work, 'step' + (i + 1) + '.sh');
  fs.writeFileSync(script, subst(step.run, stepEnv));
  const ghEnv = path.join(work, 'env' + (i + 1)), ghPath = path.join(work, 'path' + (i + 1));
  fs.writeFileSync(ghEnv, ''); fs.writeFileSync(ghPath, '');
  stepEnv.GITHUB_ENV = ghEnv; stepEnv.GITHUB_PATH = ghPath;
  stepEnv.GITHUB_OUTPUT = path.join(work, 'out' + (i + 1)); stepEnv.GITHUB_STEP_SUMMARY = path.join(work, 'summary' + (i + 1));
  console.log('::: ' + tag + (failed ? ' (after an earlier failure)' : ''));
  if (process.env.WFRUN_DRY === '1') { console.log(tag + ': would run (dry), ' + fs.statSync(script).size + ' bytes'); return; }
  const t0 = Date.now();
  const r = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], { stdio: 'inherit', env: stepEnv, cwd: step['working-directory'] ? path.resolve(cwd, subst(step['working-directory'], stepEnv)) : cwd });
  const code = r.status === null ? 1 : r.status;
  ran++;
  console.log(tag + ': exit ' + code + ' (' + Math.round((Date.now() - t0) / 1000) + 's)');
  if (code !== 0) { failed = true; failedNames.push(name); }
  const lines = fs.readFileSync(ghEnv, 'utf8').split('\n');
  for (let j = 0; j < lines.length; j++) {
    const l = lines[j]; if (!l) continue;
    const h = /^([A-Za-z_][A-Za-z0-9_]*)<<(.+)$/.exec(l);
    if (h) { const body = []; j++; while (j < lines.length && lines[j] !== h[2]) body.push(lines[j++]); env[h[1]] = body.join('\n'); continue; }
    const e = l.indexOf('='); if (e > 0) env[l.slice(0, e)] = l.slice(e + 1);
  }
  for (const p of fs.readFileSync(ghPath, 'utf8').split('\n').filter(Boolean).reverse()) env.PATH = p + path.delimiter + env.PATH;
});
console.log('wfrun ' + path.basename(file) + ': ' + ran + ' steps ran, ' + failedNames.length + ' failed' + (failedNames.length ? ': ' + failedNames.join(' | ') : ''));
process.exit(failedNames.length ? 1 : 0);

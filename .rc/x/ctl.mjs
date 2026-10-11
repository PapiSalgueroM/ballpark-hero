// Reviewer's runner driver: every negative control that edits or copies one of the three US files the Release AX
// merge changed (UsCareerBoard.tsx, ExtensionCard.tsx, FreeAgencyPanel.tsx), in harnesses whose controls nobody
// ran after the merge. Run once on the head and once on the base; "compare" then says which controls behave
// differently. A control is judged by its exit code and its closing line, the base being the reference.
// usage: node ctl.mjs <head|base>      node ctl.mjs compare
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const OUT = process.env.RC_OUT || '/tmp/rc-out';
mkdirSync(OUT, { recursive: true });
const mode = process.argv[2];
const M = [
  ['simExtensionResponseMotion', 'EXTENSION_RESPONSE_MOTION_CONTROL', ['unreply']],
  ['simFreeAgencyFeedback', 'FREE_AGENCY_FEEDBACK_CONTROL', ['consumed', 'annual', 'years', 'total', 'local', 'receipt', 'status', 'focus', 'focusOwner', 'restored', 'replacement', 'finite', 'reduced']],
  ['simCareerDecisionOutcome', 'CAREER_DECISION_OUTCOME_CONTROL', ['snapshot', 'choice', 'apply', 'rapid', 'drawOrder', 'tradeDrawOrder', 'tradeTeam', 'persist', 'continueDraw', 'continueWrite', 'continueSeason', 'continueFocus']],
  ['simCareerSeasonReview', 'CAREER_SEASON_REVIEW_CONTROL', ['returnFocus', 'pendingEvent', 'retiredBack']],
  ['simUsCareerPractice', 'US_CAREER_PRACTICE_CONTROL', ['gain', 'save', 'abort', 'pending', 'carry']],
  ['simUsCareerProspect', 'US_CAREER_PROSPECT_CONTROL', ['save', 'restore', 'handoff', 'duplicate', 'undrafted', 'archive', 'back']],
  ['simUsCareerActionConfirm', 'US_CAREER_ACTION_CONTROL', ['retireWiring', 'restartWiring', 'legacy']],
  ['simNoDoubleRecord', 'NO_DOUBLE_CONTROL', ['coachflip']],
];
if (mode === 'compare') {
  const a = JSON.parse(readFileSync(path.join(OUT, 'ctl-head.json'), 'utf8'));
  const b = JSON.parse(readFileSync(path.join(OUT, 'ctl-base.json'), 'utf8'));
  let moved = 0;
  for (const k of Object.keys(b)) {
    const h = a[k];
    if (!h || h.exit !== b[k].exit) { moved += 1; console.log(`MOVED ${k}: base exit ${b[k].exit} "${b[k].last}" | head exit ${h?.exit} "${h?.last}" | head first error: ${h?.err ?? ''}`); }
  }
  console.log(`ctl compare: ${Object.keys(b).length} controls, ${moved} behave differently on the head`);
  process.exit(0);
}
const res = {};
for (const [script, env, names] of M) {
  if (!existsSync(`scripts/${script}.mjs`)) { console.log(`${mode} | ${script} | missing on this tree`); continue; }
  for (const name of names) {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'ctl-'));
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [`scripts/${script}.mjs`], { encoding: 'utf8', timeout: 600000, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, [env]: name, TMPDIR: tmp } });
    const text = `${r.stdout || ''}\n${r.stderr || ''}`;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const last = (lines.filter(l => !/^Node\.js v/.test(l)).pop() ?? '').slice(0, 150);
    const err = (lines.find(l => /Failed to resolve import|AssertionError|not unique|does not carry|must occur once|Error:/.test(l)) ?? '').slice(0, 200);
    res[`${script}:${name}`] = { exit: r.status, last, err: r.status === 0 ? '' : err, s: Math.round((Date.now() - t0) / 1000) };
    console.log(`${mode} | ${script} | ${name} | exit ${r.status} ${Math.round((Date.now() - t0) / 1000)}s | ${last}${r.status === 0 ? '' : ' | ' + err}`);
  }
}
writeFileSync(path.join(OUT, `ctl-${mode}.json`), JSON.stringify(res, null, 1));
const bad = Object.values(res).filter(v => v.exit !== 0).length;
console.log(`ctl ${mode}: ${Object.keys(res).length} controls run, ${bad} with a non zero exit`);
process.exit(0);

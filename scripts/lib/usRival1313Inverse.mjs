/* Release BB: the inverse of Round 1313 for the base pinned kits.
 *
 * Round 1313 (MLB and NHL My Career: your rival plays your position) changes the US seasons on purpose: the rival
 * is a man at your position, his year and the head to head are kept on the save, and the season's rival line reads
 * differently. It also took the US board recording and the three season receipts again, so its own harnesses hold.
 * A kit that compares a US season with a commit older than 1313 cannot know about any of that. The first one found is
 * the Press and market kit (scripts/qa/careerPressMarketKit.mjs, BASE 934c29d9): "No active Market retains the entire
 * original sport state and RNG" went red on the join, its first failing season (MLB) differing only in the rival's
 * fields (hisYears, myYears, lastLine, lastScore and the rival's line in the season's notes), and green on Release
 * BA alone (runner result rBBg-pm).
 *
 * The inverse is whole files, because 1313 is the only piece that touches them: every file below is loaded as it was
 * on 48cb9d4b (Release AY as published, the commit 1313 was cut from). It refuses unless the file on disk is byte for
 * byte 1313's closed head (642292de), so it cannot go quietly idle and cannot hide a later change: the next round that
 * edits one of these files must decide again, here. careerFactBeats.ts is new in 1313 and only these files import it,
 * so with them inverted it is never loaded; if anything else ever loads it, the inverse refuses.
 *
 * Applied only to the node copies compared with the base, never to the browser oracle of a native walk (that one is
 * compared with the built page, which keeps 1313).
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

export const US_RIVAL_1313_HEAD = '642292de';
export const US_RIVAL_1313_BASE = '48cb9d4b';
export const US_RIVAL_1313_FILES = [
  'src/lib/careerFactBeats.ts',
  'src/lib/careerRival.ts',
  'src/lib/careerRivalryEvents.ts',
  'src/lib/mlbCareerRivalryEvents.ts',
  'src/lib/mlbMyCareer.ts',
  'src/lib/nbaCareerRivalryEvents.ts',
  'src/lib/nflCareerRivalryEvents.ts',
  'src/lib/nhlCareerRivalryEvents.ts',
  'src/lib/nhlMyCareer.ts',
  'src/lib/usSeasonShape.ts',
];

/* Round 1523 lifted the morale term of mlbMyCareer.ts and nhlMyCareer.ts into src/lib/careerForm.ts (one import, one
   call, the same number: scripts/simCareerForm.mjs section 1 replays all four US careers byte identical). Decided
   again here: those two lines are put back first, each required exactly once, and the file must then still be 1313's
   closed head, so any other later change is still refused. */
const LIFT_1523 = {
  'src/lib/mlbMyCareer.ts': [["import { moraleForm } from './careerForm';\n", ''], ["const form = c.ovr + moraleForm('mlb', c.morale) + ", 'const form = c.ovr + (c.morale - 60) / 12 + ']],
  'src/lib/nhlMyCareer.ts': [["import { moraleForm } from './careerForm';\n", ''], ["const form = c.ovr + moraleForm('nhl', c.morale) + ", 'const form = c.ovr + (c.morale - 60) / 12 + ']],
};
function unlift1523(rel, text) {
  let out = text;
  for (const [from, to] of LIFT_1523[rel] ?? []) {
    assert.equal(out.split(from).length, 2, 'Round 1523: ' + rel + ' must hold its lifted morale line exactly once');
    out = out.replace(from, () => to);
  }
  return out;
}

/* Round 1534 (the US shop keeps its promises) edits mlbMyCareer.ts and nhlMyCareer.ts too: one import line, the heat
   drift reading the lawyer, the shop's settle call after the pay line, and (its step 3) the card words and the summer
   camp's buy case. Decided again here the way 1523 was: each hunk is put back first, required exactly once, and the
   file must then still be 1313's closed head, so any other later change is still refused. The inverse is whole
   files, so with these two inverted the kit's MLB and NHL careers run 48cb9d4b's engines, as before this round. */
const SETTLE_1534 = sport => '  /* Round 1534: the shop pays what its cards print (src/lib/usCareerAnnualBenefits.ts), straight after the pay\n'
  + '     line so Cash is in tenths, and before the money app. Stakes draw on their own keyed stream, never this rng. */\n'
  + '  for (const line of settleUsCareerShop(c, ' + sport + '_SPEND_ITEMS)) notes.push(line);\n';
const LIFT_1534_COMMON = sport => [
  ["import { settleUsCareerShop, usCareerSeasonCool } from './usCareerAnnualBenefits';\n", ''],
  ['const drift = dm > 0 ? Math.min(8, 2 + dm * 0.5) : -usCareerSeasonCool(c.purchased, 9);', 'const drift = dm > 0 ? Math.min(8, 2 + dm * 0.5) : -9;'],
  [SETTLE_1534(sport), ''],
];
const LIFT_1534 = {
  'src/lib/mlbMyCareer.ts': LIFT_1534_COMMON('MLB'),
  'src/lib/nhlMyCareer.ts': LIFT_1534_COMMON('NHL'),
};
function unlift1534(rel, text) {
  let out = text;
  for (const [from, to] of LIFT_1534[rel] ?? []) {
    assert.equal(out.split(from).length, 2, 'Round 1534: ' + rel + ' must hold its shop hunk exactly once: ' + from.slice(0, 60));
    out = out.replace(from, () => to);
  }
  return out;
}

const show = (commit, rel) => execFileSync('git', ['show', commit + ':' + rel], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8').replaceAll('\r\n', '\n');

/* contents: the file as read from disk (any line endings). rows: receives rel once per file inverted. */
export function inverseUsRival1313(rel, contents, rows) {
  if (!US_RIVAL_1313_FILES.includes(rel)) return contents;
  assert.equal(unlift1523(rel, unlift1534(rel, contents.replaceAll('\r\n', '\n'))), show(US_RIVAL_1313_HEAD, rel), 'Release BB: ' + rel + ' is no longer as Round 1313 closed it (' + US_RIVAL_1313_HEAD + '); decide its inverse again in scripts/lib/usRival1313Inverse.mjs');
  assert.notEqual(rel, 'src/lib/careerFactBeats.ts', 'Release BB: careerFactBeats.ts is new in Round 1313 and only its own files import it; something else loaded it, so the inverse of 1313 is no longer whole');
  rows.push(rel);
  return show(US_RIVAL_1313_BASE, rel);
}

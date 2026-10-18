import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const NFL_STAFF_RECOVERY_HUNK = `
/** An explicit NFL staff entry when the automatic market has nothing. */
export function takeNflStaffRole(
  prev: CoachCareerState,
  rng: () => number = Math.random,
): CoachCareerState {
  if (prev.sport !== 'nfl' || prev.done || !prev.unemployed || prev.job !== null || prev.offers.length !== 0) return prev;
  const opening = coachingVacancies('nfl', rng).find(job => job.tier === 4)!;
  return acceptCoachOffer({
    ...prev,
    offers: [{
      ...opening,
      brief: briefFor(4, 'nfl', rng),
      roster: rosterFor(4, rng),
      reason: 'You chose a staff role to get back to work.',
      keenness: 0,
    }],
  }, 0);
}
`;

export function stripNflStaffRecoveryHunk(text) {
  const source = text.replaceAll('\r\n', '\n');
  assert.equal(source.split(NFL_STAFF_RECOVERY_HUNK).length - 1, 1, 'Exactly one whole NFL staff recovery function');
  const stripped = source.replace(NFL_STAFF_RECOVERY_HUNK, '');
  assert.notEqual(stripped, source, 'NFL staff inverse removes executable code');
  return stripped;
}

const staffButton = `            {canTakeStaffRole && (
              <button
                onClick={takeStaffRole}
                className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Take a staff role
              </button>
            )}
`;
export const NFL_STAFF_RECOVERY_PANEL_HUNKS = [
  ['  acceptCoachOffer, playCoachSeason, sitOutCoachSeason, retireCoachCareer,\n', '  acceptCoachOffer, playCoachSeason, sitOutCoachSeason, retireCoachCareer, takeNflStaffRole,\n'],
  ['  const last = state.results[state.results.length - 1];\n', "  const last = state.results[state.results.length - 1];\n  const canTakeStaffRole = state.sport === 'nfl' && !state.done && state.unemployed && state.job === null && state.offers.length === 0;\n  const marketNote = canTakeStaffRole\n    ? 'No automatic offers right now. You can take a staff role or wait for another opening.'\n    : state.offerNote;\n"],
  ['  /* Round 1346: the player ends it himself, behind the shared confirm. Only `done` changes. */\n', "  const takeStaffRole = () => {\n    const next = takeNflStaffRole(state);\n    if (next === state) return;\n    onChange(next, [`You took a staff role with ${next.job!.team}. Work your way up from here.`]);\n  };\n  /* Round 1346: the player ends it himself, behind the shared confirm. Only `done` changes. */\n"],
  ["{state.done ? 'You retired from coaching, so nobody is calling now.' : state.offerNote || 'Nothing on the table right now.'}", "{state.done ? 'You retired from coaching, so nobody is calling now.' : marketNote || 'Nothing on the table right now.'}"],
  ['<p className="mt-1 text-[11px] italic text-muted-foreground">{state.offerNote}</p>', '<p className="mt-1 text-[11px] italic text-muted-foreground">{marketNote}</p>'],
  ['            <button\n              onClick={sitOut}\n', staffButton + '            <button\n              onClick={sitOut}\n'],
  ['            {state.offers.length === 0 && (\n', '            {state.offers.length === 0 && !canTakeStaffRole && (\n'],
];
export function stripNflStaffRecoveryPanelHunks(text) {
  let source = text.replaceAll('\r\n', '\n');
  for (const [original, fixed] of [...NFL_STAFF_RECOVERY_PANEL_HUNKS].reverse()) {
    assert.equal(source.split(fixed).length - 1, 1, 'Exactly one NFL staff panel inverse hunk');
    const stripped = source.replace(fixed, () => original);
    assert.notEqual(stripped, source, 'NFL staff panel inverse changes executable code');
    source = stripped;
  }
  assert.equal(createHash('sha256').update(source).digest('hex'), '9390fab969844b20ca4f7adbc097664191d3f5ea082090553f479305fe85d321', 'Whole historical panel SHA');
  return source;
}

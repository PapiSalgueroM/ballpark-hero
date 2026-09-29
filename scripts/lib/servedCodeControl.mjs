/**
 * Round 672: a negative control for a browser walk, without a rebuild.
 *
 * Nineteen browser harnesses were red on main, and most of them for the same
 * reason: the game moved on (a new screen, a renamed label, a sixth box) and
 * the walk did not. Fixing a walk is only half the job. The other half is
 * proving the fixed walk can still go red, because a walk that learned to step
 * past a new screen can just as easily have learned to step past the thing it
 * exists to check.
 *
 * So each fixed walk takes a control that REVERTS the game behaviour it guards
 * in the code the browser is served (the same trick playWc2026Reset plays on
 * its dev server, pointed at the built chunks in dist/assets instead), then
 * requires every check aimed at that behaviour to fail.
 *
 * Two rules, both from the repo's harness notes:
 *   - A mutation that matches nothing changes nothing, and a control that
 *     changes nothing proves nothing. Every mutation counts its hits and the
 *     verdict refuses a control whose mutation never landed.
 *   - A guarded check that stays green under the control is a MISS, and one
 *     miss fails the control run. So does any failure the control was not
 *     aimed at, because then the red proves nothing about the guarded check.
 *
 *   const { say, verdict } = controlledChecks(CONTROL);
 *   const proof = await installServedCodeControl(page, [{ label, find, replace }]);
 *   say(ok, 'what', true)   // true marks a check the control is aimed at
 *   process.exit(verdict('playX', proof, { minGuarded: 4 }));
 */

/** Rewrite served JS on a page or context. `find` is a global RegExp or a
    string; every hit is counted per label so the verdict can prove it landed.
    Pass the same `proof` object to every context a walk opens and the hits
    add up across them. */
export async function installServedCodeControl(target, mutations, proof = {}) {
  for (const m of mutations) proof[m.label] ??= 0;
  await target.route('**/assets/*.js', async route => {
    const response = await route.fetch();
    let body = await response.text();
    for (const m of mutations) {
      const hits = typeof m.find === 'string'
        ? body.split(m.find).length - 1
        : (body.match(m.find) || []).length;
      if (!hits) continue;
      const next = typeof m.find === 'string' ? body.split(m.find).join(m.replace) : body.replace(m.find, m.replace);
      if (next === body) continue;
      proof[m.label] += hits;
      body = next;
    }
    await route.fulfill({ response, body });
  });
  return proof;
}

/** A say() that knows about the control, and the verdict that goes with it. */
export function controlledChecks(control) {
  const state = { failures: 0, guarded: 0, caught: 0, missed: 0 };
  const say = (ok, what, guarded = false) => {
    if (control && guarded) {
      state.guarded += 1;
      if (ok) { state.missed += 1; console.log('  MISSED  ' + what); }
      else { state.caught += 1; console.log('  CAUGHT  ' + what); }
      return;
    }
    console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
    if (!ok) state.failures += 1;
  };
  /* Returns the exit code. Without a control it is just "any failure is red". */
  const verdict = (name, proof, { minGuarded = 1 } = {}) => {
    console.log('');
    if (!control) {
      if (state.failures) {
        console.error(`${name}: ${state.failures} failure${state.failures === 1 ? '' : 's'}`);
        return 1;
      }
      return 0;
    }
    const dead = Object.entries(proof || {}).filter(([, n]) => n < 1).map(([k]) => k);
    if (dead.length) {
      console.error(`${name} control ${control}: the mutation ${dead.join(', ')} matched no served code, so it proves nothing`);
      return 1;
    }
    if (state.guarded < minGuarded) {
      console.error(`${name} control ${control}: only ${state.guarded} guarded checks ran, expected at least ${minGuarded}`);
      return 1;
    }
    if (state.missed || state.failures) {
      console.error(`${name} control ${control}: ${state.caught}/${state.guarded} guarded checks fired, ${state.missed} missed, ${state.failures} unrelated failure(s)`);
      return 1;
    }
    console.log(`${name} control ${control}: all ${state.caught} guarded checks fired (mutations landed: ${JSON.stringify(proof)})`);
    return 0;
  };
  return { say, verdict, state };
}

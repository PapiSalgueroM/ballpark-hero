/* Round 1557 (critic-1541 correction 9, BINDING): every walk that plants or plays an NBA career says whether its
 * careers met the national team's call. The call is a beat of its own between seasons (Rounds 1541 and 1544), so a
 * later change to its bar (INTL_CALL_UP_OVR in src/lib/nbaCareerIntlGate.ts) can put a call in front of a walk that
 * never met one, or take one away, and the walk would then be walking something else without saying so. With this
 * line in its output the change shows the first time the walk runs.
 *
 *   await watchIntlCalls(pageOrContext)      before the first goto: counts, on a page or on a whole browser
 *                                            context, every arrival of the call's card ([data-intl-call]) and of
 *                                            the curtain line that announces it
 *   noteIntlCalls(what, pageOrContext)       prints "note <what>: national team calls met N, curtain lines M"
 *   noteIntlCallTotals(what)                 the same over every page and context watched in the run
 *   await noteNbaSaves(what, root, raws)     for a Node harness holding NBA saves: how many meet the call
 *   noteNoIntlCareer(what, why)              for a walk whose NBA save is not a career (so no bar reaches it): the
 *                                            print says so, and why
 *
 * Counting only; nothing here asserts, clicks or writes storage. */
const CURTAIN = 'The US national team wants you this summer';
const counts = new WeakMap();
const all = { watched: 0, calls: 0, curtains: 0 };

export async function watchIntlCalls(target) {
  if (counts.has(target)) return;
  const n = { calls: 0, curtains: 0 };
  counts.set(target, n);
  all.watched += 1;
  await target.exposeFunction('__dukbIntlCallSeen', kind => {
    if (kind === 'call') { n.calls += 1; all.calls += 1; } else { n.curtains += 1; all.curtains += 1; }
  });
  await target.addInitScript(curtain => {
    let call = false;
    let line = false;
    let queued = false;
    const look = () => {
      queued = false;
      const callNow = !!document.querySelector('[data-intl-call]');
      const lineNow = !!document.querySelector('[data-season-reveal]')?.textContent?.includes(curtain);
      if (callNow && !call) window.__dukbIntlCallSeen?.('call');
      if (lineNow && !line) window.__dukbIntlCallSeen?.('curtain');
      call = callNow;
      line = lineNow;
    };
    new MutationObserver(() => { if (!queued) { queued = true; setTimeout(look, 30); } })
      .observe(document, { childList: true, subtree: true, characterData: true });
  }, CURTAIN);
}

export function intlCallsMet(target) {
  const n = counts.get(target);
  return n ? `national team calls met ${n.calls}, curtain lines ${n.curtains}` : 'national team calls not watched';
}

export function noteIntlCalls(what, target) { console.log(`  note ${what}: ${intlCallsMet(target)}`); }

/** For a Node harness holding NBA saves as JSON strings: how many of them meet the call, read with the gate's own
 *  nbaIntlPendingYear, bundled from the tree under `root` so the bar is that tree's. A prospect (c null) carries no
 *  career and is counted apart. The gate is pure: reading it draws no random number and writes nothing. */
export async function noteNbaSaves(what, root, raws) {
  const pending = await gateOf(root);
  let careers = 0;
  let met = 0;
  for (const raw of raws) {
    let s = null;
    try { s = JSON.parse(raw); } catch { s = null; }
    if (!s || !s.c) continue;
    careers += 1;
    if (pending(s.c) !== null) met += 1;
  }
  console.log(`  note ${what}: ${raws.length} NBA saves, ${careers} of them careers, ${met} meeting the national team's call`);
}
let gate = null;
async function gateOf(root) {
  if (gate) return gate;
  const [{ build }, fs, os, path, { createRequire }] = await Promise.all([import('esbuild'), import('node:fs'), import('node:os'), import('node:path'), import('node:module')]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'intl-call-note-'));
  const out = path.join(dir, 'gate.cjs');
  try {
    await build({
      stdin: { contents: "export { nbaIntlPendingYear } from '@/lib/nbaCareerIntlGate';", resolveDir: root, sourcefile: 'intl-call-note.ts', loader: 'ts' },
      outfile: out, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(root, 'src') },
    });
    gate = createRequire(import.meta.url)(out).nbaIntlPendingYear;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return gate;
}

/** Every watched page or context of the run together, for a walk that opens the NBA many times. */
export function noteIntlCallTotals(what) {
  console.log(`  note ${what}: ${all.watched} NBA pages watched, national team calls met ${all.calls}, curtain lines ${all.curtains}`);
}

export function noteNoIntlCareer(what, why) { console.log(`  note ${what}: national team calls met 0 (${why})`); }

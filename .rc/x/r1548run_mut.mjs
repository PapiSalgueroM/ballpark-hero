/* Reviewer mutations (round 1548, run lens). node r1548run_mut.mjs <name> rewrites ONE source file in
   the runner's checkout; the request line restores it with git checkout. Aborts unless the text is there once. */
import fs from 'node:fs';

const LIB = 'src/lib/hallOfChampions.ts';
const HOOK = 'src/hooks/useHallOfChampions.ts';
const M = {
  /* the hook ignores visibility: a hidden tab at a 1 s throttle is paid as watched */
  novis: [HOOK, "advanceClock(wings, s, gap, document.visibilityState !== 'hidden')", 'advanceClock(wings, s, gap, true)'],
  /* a watched tick no longer closes the absence */
  noreset: [LIB, '  s.awayMs = 0;\n  const before = s.funds;\n  tick(wings, s, gapMs / 1000);', '  const before = s.funds;\n  tick(wings, s, gapMs / 1000);'],
  /* the loader drops the meter, so a reload starts a fresh eight hours */
  nometerload: [LIB, 'if (o.awayMs !== undefined) {', 'if (false) {'],
  /* the load welcome goes back to its own cap, outside the meter */
  offlineold: [LIB, 'return { earned: applyAway(wings, s, awaySec * 1000), capped };', '{ const b0 = s.funds; tick(wings, s, awaySec, { offline: true }); return { earned: s.funds - b0, capped }; }'],
  /* the meter is not read: every wake may use a fresh eight hours */
  capnometer: [LIB, 'const left = Math.max(0, OFFLINE_CAP_SEC * 1000 - used);', 'const left = OFFLINE_CAP_SEC * 1000;'],
  /* the welcome shows after any hidden spell */
  welcomebar: [HOOK, 'if (awayFor > WELCOME_AFTER_MS && paid > 1)', 'if (paid > 1)'],
  /* the save stamps the wall time again, not the time the museum was paid through */
  stampnow: [HOOK, 'try { localStorage.setItem(SAVE_KEY, serialize(s, lastTickRef.current)); } catch { /* storage full or blocked */ }', 'try { localStorage.setItem(SAVE_KEY, serialize(s, Date.now())); } catch { /* storage full or blocked */ }'],
  /* a stale constant: a visible page counts as watched for an hour */
  awayafter: [LIB, 'export const AWAY_AFTER_MS = 5000;', 'export const AWAY_AFTER_MS = 3_600_000;'],
  /* the copy aside no longer skips bytes it already kept */
  keepdedupe: [HOOK, '    for (const k of backupKeysOf(entry, storage)) if (storage.getItem(k) === raw) return;\n', ''],
  /* the welcome is never raised on return from a hidden spell */
  nowelcome: [HOOK, 'setOfflineEarned(e => (e ?? 0) + paid);', 'void paid;'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.error(`MUTATION ${name}: unknown. ABORTED`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name}: ${file} carries the text ${n} times, not once. ABORTED`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log(`MUTATION ${name} applied to ${file}`);

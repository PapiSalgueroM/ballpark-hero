/* Reviewer's mutation runner for Round 1132 (never committed). Runs on the remote check runner, serially:
     node .rc/x/rvmut.mjs <name>
   Plants ONE small mutation in the source (its needle must be there exactly once), runs the cheap gates
   (simSound, the round's three vitest files), and when both stay green builds the site and runs playSoundGate.
   Restores the file from HEAD whatever happened. The last line says who killed the mutation, or that it survived. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const CARD = 'src/components/career/AwardsNightCard.tsx';
const SW = 'src/lib/sound.ts';
const KIT = 'src/lib/soundKit.ts';
const HOOK = 'src/hooks/useSoundPlan.ts';
const MUTS = {
  m1: { what: 'one tick short (k < n - 1)', file: CARD, from: 'for (let k = 0; k < n; k += 1) play("tap"', to: 'for (let k = 0; k < n - 1; k += 1) play("tap"' },
  m2: { what: 'the result lands on the row pace start, 0.6, not the headline 0.75', file: CARD, from: 'revealAfter(n, 0.75) + SLAM_LANDS', to: 'revealAfter(n) + SLAM_LANDS' },
  m4: { what: 'the plan key drops the year', file: CARD, from: '${award.id}|${night.year}|${place}|${n}', to: '${award.id}|${place}|${n}' },
  m5: { what: 'any stored value but off counts as on', file: SW, from: "if (v === 'on' || v === 'off') return v === 'on';", to: "if (v) return v !== 'off';" },
  m6: { what: 'stopAll() with no scope leaves scoped sources sounding', file: KIT, from: '    if (scope && owner !== scope) continue;\n    try { src.stop(); }', to: '    if (owner !== scope) continue;\n    try { src.stop(); }' },
  m7: { what: 'a scoped hush no longer cancels an ask still waiting on the kit or the context', file: SW, from: '() => mine === gen && mineScope === genOf(scope), at)', to: '() => mine === gen, at)' },
  m8: { what: 'a hidden tab suspends without stopping what is scheduled', file: KIT, from: "if (document.visibilityState === 'hidden') { stopAll(); if (ctx)", to: "if (document.visibilityState === 'hidden') { if (ctx)" },
  m11: { what: 'the stale test loses its 250 ms of grace (due < 0)', file: KIT, from: 'if (due < -STALE_MS / 1000) return;', to: 'if (due < 0) return;' },
  m12: { what: 'a delayed buzz waits milliseconds where it meant seconds', file: KIT, from: '}, delay * 1000);', to: '}, delay);' },
  m13: { what: "the winner's crowd starts at 0.03 s, not 0.3 s", file: KIT, from: "{ cue: 'crowd', at: 0.3, gain: 0.9 }", to: "{ cue: 'crowd', at: 0.03, gain: 0.9 }" },
  m18: { what: 'switching off forgets to bump the generation', file: SW, from: '  } else {\n    gen += 1;\n    if (kitP)', to: '  } else {\n    if (kitP)' },
  m19: { what: 'leaving the screen no longer hushes the plan', file: HOOK, from: 'return () => { m.playedKey = null; hush(m.scope); };', to: 'return () => { m.playedKey = null; };' },
  m23: { what: 'a moment is scheduled on a context that is not running', file: KIT, from: "if (c.state !== 'running' || !alive()) return;", to: 'if (!alive()) return;' },
  m24: { what: 'the visit choice wins over a stored off (stored value no longer wins)', file: SW, from: "    if (v === 'on' || v === 'off') return v === 'on';\n  } catch", to: "    if (visit === null && (v === 'on' || v === 'off')) return v === 'on';\n  } catch" },
  m25: { what: 'the gesture listener wakes the audio even when the switch is off', file: KIT, from: '  tapped = true;\n  if (!soundOn()) return;\n  const c = ensure();', to: '  tapped = true;\n  const c = ensure();' },
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`unknown mutation ${name}. Known: ${Object.keys(MUTS).join(', ')}`); process.exit(2); }
const run = (cmd, extraEnv = {}) => {
  const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', env: { ...process.env, ...extraEnv }, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = out.split('\n').filter(l => l.trim());
  return { rc: r.status, last: lines[lines.length - 1] ?? '', out, lines };
};
const before = fs.readFileSync(m.file, 'utf8');
const hits = before.split(m.from).length - 1;
if (hits !== 1) { console.log(`MUT ${name}: CANNOT BE PLANTED, its needle appears ${hits} times in ${m.file}`); process.exit(1); }
fs.writeFileSync(m.file, before.replace(m.from, m.to));
console.log(`MUT ${name}: ${m.what} (${m.file})`);
let verdict = '';
try {
  const sim = run('node scripts/simSound.mjs');
  const simFails = sim.lines.filter(l => /FAIL/.test(l)).slice(0, 6);
  console.log(`  simSound exit=${sim.rc} | ${sim.last}`);
  for (const l of simFails) console.log(`     ${l.trim().slice(0, 220)}`);
  const vt = run('node_modules/.bin/vitest run src/test/soundToggle.test.tsx src/test/awardsNightSound.test.tsx src/test/freshBuildOptionalChunk.test.ts --testTimeout=300000 --hookTimeout=120000');
  const vtFails = vt.lines.filter(l => /FAIL|×|✗|AssertionError/.test(l)).slice(0, 6);
  const vtSum = vt.lines.filter(l => /^\s*Tests\s/.test(l)).pop() ?? vt.last;
  console.log(`  vitest exit=${vt.rc} | ${vtSum.trim()}`);
  for (const l of vtFails) console.log(`     ${l.trim().slice(0, 220)}`);
  const cheap = [sim.rc !== 0 ? 'simSound' : null, vt.rc !== 0 ? 'vitest' : null].filter(Boolean);
  let gate = null;
  if (!cheap.length || process.env.RV_ALWAYS_GATE) {
    const b = run('npm run build');
    console.log(`  build exit=${b.rc} | ${b.last.slice(0, 160)}`);
    if (b.rc === 0) {
      gate = run('node scripts/playSoundGate.mjs', { ENGINES: 'chromium', PORT: '4711' });
      console.log(`  playSoundGate exit=${gate.rc} | ${gate.last}`);
      for (const l of gate.lines.filter(x => /FAIL|NOT CHECKED|NOT RUN/.test(x)).slice(0, 10)) console.log(`     ${l.trim().slice(0, 240)}`);
    }
  }
  const killers = [...cheap, gate && gate.rc !== 0 ? 'playSoundGate' : null].filter(Boolean);
  verdict = killers.length ? `KILLED by ${killers.join(' and ')}` : `SURVIVED simSound, vitest${gate ? ' and playSoundGate' : ''}`;
} finally {
  fs.writeFileSync(m.file, before);
  const back = run(`git status --porcelain --untracked-files=no -- ${m.file}`);
  console.log(`  restored ${m.file}${back.out.trim() ? ` (git still shows: ${back.out.trim()})` : ''}`);
}
console.log(`MUT ${name} (${m.what}): ${verdict}`);
process.exit(0);

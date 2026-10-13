// Copies src/test/seasonCentreOwnGoals.test.tsx to a probe that prints what the stage shows when a matchday is
// missing, and how many steps past it takes to reach it. Runner only, never committed.
import fs from 'node:fs';
const src = fs.readFileSync('src/test/seasonCentreOwnGoals.test.tsx', 'utf8');
const from = "  if (!day) throw new Error(`seasonCentreOwnGoals: matchday ${spot.md} is not on the stage (${way})`);";
if (src.split(from).length !== 2) { console.error('probe: anchor not found'); process.exit(2); }
const to = `  if (!day) {
    const bars = [...container.querySelectorAll('[data-centre-bar] button')].map(b => b.textContent);
    const mds = [...container.querySelectorAll('[data-matchday]')].map(d => d.getAttribute('data-matchday'));
    let steps = 0, found = null;
    for (; steps < 6 && !found; steps += 1) {
      const btn = container.querySelector('[data-centre-bar] button');
      if (!btn) break;
      await act(async () => { fireEvent.click(btn); });
      found = container.querySelector(\`[data-matchday="\${spot.md}"]\`);
    }
    throw new Error(\`PROBE matchday \${spot.md} (\${way}) missing after one step; bar buttons \${JSON.stringify(bars)}; matchdays on stage \${JSON.stringify(mds)}; reached after \${steps} more steps: \${!!found}; text: \${container.textContent?.slice(0, 700)}\`);
  }`;
fs.writeFileSync('src/test/zzProbeOwnGoals.test.tsx', src.replace(from, () => to));
console.log('probe written');

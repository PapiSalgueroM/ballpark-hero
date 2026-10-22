// Review of Round 1554 (run lens): apply one mutation to the runner's checkout.
// Usage: node .rc/x/mut1554.mjs <id>. Refuses (exit 3) unless the target is in the file exactly once.
import fs from 'node:fs';

const M = {
  window: ['src/lib/collegeProgram.ts',
    'for (let r = spec.windowStart - 1; r < rr; r += 1) window.push(r);',
    'for (let r = spec.windowStart - 2; r < rr - 1; r += 1) window.push(r);'],
  ndsix: ['src/lib/cfbDynasty.ts', 'export const ND_ACC_GAMES = 5;', 'export const ND_ACC_GAMES = 6;'],
  norepeat: ['src/lib/collegeProgram.ts', '    if (used.has(slatePairKey(a, b))) return false;\n', '\n'],
  atlarge7: ['src/lib/cfbDynasty.ts', '.slice(0, 12 - champs.length);', '.slice(0, 7);'],
  g5sort: ['src/lib/cfbDynasty.ts', 'if (st.format && !LEAGUE_SET.has(conf)) {', 'if (false) {'],
  noformat: ['src/lib/cfbDynasty.ts', "  if (!st.depth || st.round !== 1) return;\n  if (st.slate && st.slate.season === st.season) return;",
    "  return;\n  if (st.slate && st.slate.season === st.season) return;"],
  noformatcbb: ['src/lib/cbbDynasty.ts', '  if (!st.depth || st.round !== 1 || st.format) return;', '  return;'],
  ndstatic: ['src/lib/cfbDynasty.ts', "{ id: 'ND', name: 'Notre Dame', color: '#0C2340', prestige: 92, conf: 'IND' },", "{ id: 'ND', name: 'Notre Dame', color: '#0C2340', prestige: 92, conf: 'ACC' },"],
  confsold: ['src/lib/cfbDynasty.ts', "export const CFB_CONFS = ['SEC', 'B1G', 'ACC', 'B12', 'G5', 'IND'] as const;", "export const CFB_CONFS = ['SEC', 'B1G', 'ACC', 'B12', 'G5'] as const;"],
  noseries: ['src/lib/cfbDynasty.ts', 'buildRivalries(CFB_SCHOOLS, CFB_SCHOOL_STATES, CFB_RIVALRY_SERIES)', 'buildRivalries(CFB_SCHOOLS, CFB_SCHOOL_STATES, [])'],
  noseriescbb: ['src/lib/cbbDynasty.ts', 'buildRivalries(CBB_SCHOOLS, CBB_SCHOOL_STATES, CBB_RIVALRY_SERIES)', 'buildRivalries(CBB_SCHOOLS, CBB_SCHOOL_STATES, [])'],
};

const ids = process.argv.slice(2);
for (const id of ids) {
  const m = M[id];
  if (!m) { console.error(`unknown mutation ${id}`); process.exit(3); }
  const [file, from, to] = m;
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const src = raw.replace(/\r\n/g, '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION ${id} CANNOT RUN: target found ${n} times in ${file}`); process.exit(3); }
  const out = src.replace(from, () => to);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log(`MUTATION ${id} APPLIED to ${file}`);
}

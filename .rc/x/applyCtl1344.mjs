// Runner only, never committed: node applyCtl.mjs <copy root> bridge|norepair
// bridge: scripts/lib/cmNoAiMoves1344.mjs into the copy's engine files; norepair: loadCareer's repairAiMoves call out.
import fs from 'node:fs';
import path from 'node:path';
const [root, mode] = process.argv.slice(2);
if (!root || !['bridge', 'norepair'].includes(mode)) { console.error('applyCtl: say <root> bridge|norepair'); process.exit(2); }
const lf = t => t.split('\r\n').join('\n');
if (mode === 'bridge') {
  const { withoutAiMoves, BRIDGE_FILES } = await import(path.resolve(root, 'scripts/lib/cmNoAiMoves1344.mjs'));
  for (const file of BRIDGE_FILES) {
    const p = path.join(root, file), before = lf(fs.readFileSync(p, 'utf8')), after = withoutAiMoves(before, file);
    if (after === before) { console.error(`applyCtl: the bridge changed nothing in ${file}`); process.exit(2); }
    fs.writeFileSync(p, after);
  }
  console.log('applyCtl: the bridge is in the copy');
} else {
  const p = path.join(root, 'src/lib/clubManager.ts'), text = lf(fs.readFileSync(p, 'utf8'));
  const from = '    repairAiMoves(parsed);\n', n = text.split(from).length - 1;
  if (n !== 1) { console.error(`applyCtl: the repair call stands ${n} times`); process.exit(2); }
  fs.writeFileSync(p, text.replace(from, ''));
  console.log('applyCtl: the repair call is out of the copy');
}

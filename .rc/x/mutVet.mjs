// Runner only: apply PR235's inverse (the club loan filter removed, exactly once) to a copy of the tree.
// usage: node mutVet.mjs <tree dir> [engine|both]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = process.argv[2], mode = process.argv[3] || 'engine';
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const rows = [
  { file: 'src/lib/soccerCareerEngine.ts',
    from: '        const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name) && projectLeagueApps(state.overall, c.tier, c.name, 0).min >= 20);',
    to: '        const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name));' },
];
if (mode === 'both') rows.push({ file: 'src/lib/soccerCareerAppearance.ts',
  from: 'line: "rock an imaginary baby cradle" },',
  to: 'line: "rock the baby cradle for the newest member of the family" },' });
for (const r of rows) {
  const p = path.join(dir, r.file), text = fs.readFileSync(p, 'utf8');
  const n = text.split(r.from).length - 1;
  if (n !== 1) { console.log(`ABORT ${r.file}: anchor count ${n}`); process.exit(2); }
  const out = text.replace(r.from, r.to);
  fs.writeFileSync(p, out);
  console.log(`inverse applied ${r.file}: ${sha(text)} -> ${sha(out)}`);
}

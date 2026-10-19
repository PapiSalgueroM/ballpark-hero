// Dash scan of files changed since a base commit, plus a look at the new What's New lines.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || 'e8683a19';
const files = execSync(`git diff --name-only ${base}`, { encoding: 'utf8' }).split('\n').filter(Boolean);
const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
let bad = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => { if (dashes.some((d) => l.includes(d))) { bad++; console.log(`DASH ${f}:${i + 1}`); } });
}
const msgs = execSync(`git log --format=%B ${base}..HEAD`, { encoding: 'utf8' });
const msgBad = dashes.some((d) => msgs.includes(d));
console.log(`files ${files.length}, dash lines ${bad}, commit message dashes ${msgBad}`);
const wn = fs.readFileSync('src/pages/WhatsNew.tsx', 'utf8').split('\n').slice(29, 32);
for (const l of wn) {
  const text = l.replace(/<[^>]+>/g, '');
  const q = /["“”‘’]/.test(text);
  console.log(`entry len ${text.trim().length} quote ${q} endsLi ${l.trimEnd().endsWith('</li>')}`);
}
process.exit(bad || msgBad ? 1 : 0);

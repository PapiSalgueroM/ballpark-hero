// Reviewer probe (never committed, runs only in the runner's throwaway checkout): point one of the other lane's
// base pinned harnesses at the commit just before its own pull request was merged on release-at-int, to see
// whether "engine baseline" is its only red and whether its browser walk is green on the integrated head.
// usage: node .rc/x/review-fences-repin.mjs <harness file> <new base commit>
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const [file, commit] = process.argv.slice(2);
const full = execSync('git rev-parse ' + commit, { encoding: 'utf8' }).trim();
const tree = execSync('git rev-parse ' + commit + '^{tree}', { encoding: 'utf8' }).trim();
const before = fs.readFileSync(file, 'utf8');
const m = before.match(/const BASE = '([0-9a-f]{40})', BASE_TREE = '([0-9a-f]{40})';/);
if (!m) { console.error('repin: anchor not found in ' + file); process.exit(2); }
if (before.split(m[0]).length !== 2) { console.error('repin: anchor not unique in ' + file); process.exit(2); }
const after = before.replace(m[0], "const BASE = '" + full + "', BASE_TREE = '" + tree + "';");
if (after === before) { console.error('repin: nothing changed in ' + file); process.exit(2); }
fs.writeFileSync(file, after);
console.log('repinned ' + file + ': base ' + m[1].slice(0, 8) + ' -> ' + full.slice(0, 8) + ', tree ' + m[2].slice(0, 8) + ' -> ' + tree.slice(0, 8));

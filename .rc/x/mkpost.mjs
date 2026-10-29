// runner probe (review-read 1574): build the post apply NHL table from the lead's 10-29 export and the table file,
// plus a copy with one unknown man, so strict live mode can be shown to fire. Writes /tmp/rr-post.json and
// /tmp/rr-post-unknown.json. Reads files only.
import fs from 'node:fs';
const ex = JSON.parse(fs.readFileSync('.rc/x/nhl-2026-10-29.json', 'utf8'));
const tb = JSON.parse(fs.readFileSync('scripts/data/nhlConnectionsTable-2026-10.json', 'utf8'));
const by = new Map(tb.rows.map(r => [r.puzzle_id, r]));
const post = ex.map(r => (by.has(r.puzzle_id) ? { ...r, groups_json: by.get(r.puzzle_id).board } : r));
fs.writeFileSync('/tmp/rr-post.json', JSON.stringify(post));
const bad = JSON.parse(JSON.stringify(post));
const row = bad.find(r => r.puzzle_id === 'nhlconn-009');
const g = typeof row.groups_json === 'string' ? JSON.parse(row.groups_json) : row.groups_json;
const was = g[0].players[0];
g[0].players[0] = 'Zed Nobodyson';
row.groups_json = g;
fs.writeFileSync('/tmp/rr-post-unknown.json', JSON.stringify(bad));
console.log(`post rows ${post.length}; replaced ${by.size}; unknown copy: nhlconn-009 "${g[0].theme}" ${was} -> Zed Nobodyson`);

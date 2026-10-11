// Release AU fix pass, ruling R3: the entry chunk of one build, raw and gzipped (level 9), and whether the keeper is in it.
// usage: node r3measure.mjs <dist dir> <tag>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [dist, tag] = process.argv.slice(2);
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const m = /<script[^>]+type="module"[^>]+src="\/assets\/([^"]+\.js)"/.exec(html);
if (!m) { console.error('r3measure: no module script in ' + dist + '/index.html'); process.exit(2); }
const file = path.join(dist, 'assets', m[1]);
const body = fs.readFileSync(file);
const gz = zlib.gzipSync(body, { level: 9 }).length;
const text = body.toString('utf8');
const line = `R3 ${tag}: entry ${m[1]} raw ${body.length} B, gzip ${gz} B (${(gz / 1024).toFixed(2)} K); keeper journal key in it: ${text.includes('dukb-save-pending')}; card words in it: ${text.includes('Put that save back')}`;
console.log(line);
if (process.env.RC_OUT) { fs.mkdirSync(process.env.RC_OUT, { recursive: true }); fs.appendFileSync(path.join(process.env.RC_OUT, 'r3-entry.txt'), line + '\n'); }

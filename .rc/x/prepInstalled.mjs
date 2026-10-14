// Release BE join: the installed.json a Codex manager workflow writes in its bind step, for its walks on an rc runner.
// usage: node .rc/x/prepInstalled.mjs <absolute out dir>
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const installed = Object.entries(lock.packages).filter(([p]) => p.startsWith('node_modules/') && fs.existsSync(p + '/package.json')).map(([p, entry]) => {
  const version = JSON.parse(fs.readFileSync(p + '/package.json', 'utf8')).version; assert.equal(version, entry.version, p);
  return { path: p, version };
});
fs.writeFileSync(out + '/installed.json', JSON.stringify(installed, null, 2) + '\n');
console.log('prepInstalled: ' + installed.length + ' installed locked versions written to ' + out);

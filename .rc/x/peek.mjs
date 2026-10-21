// Round 1520 weight probe: what the clubManager chunk carries of the round, as built.
import fs from 'node:fs';
import zlib from 'node:zlib';

const dir = process.argv[2] || 'dist/assets';
const file = fs.readdirSync(dir).find(f => /^clubManager-[A-Za-z0-9_-]{8}\.js$/.test(f));
const src = fs.readFileSync(`${dir}/${file}`, 'utf8');
console.log(`${file}: ${src.length} chars, ${zlib.gzipSync(src).length} gz`);
const at = src.indexOf('cm-made-up-nation');
console.log(`draw at ${at}`);
console.log(src.slice(Math.max(0, at - 600), at + 300));
for (const needle of ['clubCountry', 'Cote d', 'nationCountsAt', 'United States', '.nation']) {
  console.log(`${needle}: ${src.split(needle).length - 1}`);
}
const i = src.indexOf('United States');
console.log(src.slice(Math.max(0, i - 200), i + 2400));

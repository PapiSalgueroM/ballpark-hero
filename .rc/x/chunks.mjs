import fs from 'node:fs';
import zlib from 'node:zlib';
const dir = 'dist/assets';
const rows = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => [f.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''), zlib.gzipSync(fs.readFileSync(`${dir}/${f}`)).length, f]);
const out = rows.map(r => `${r[0]} ${r[1]} ${r[2]}`).sort().join('\n');
fs.writeFileSync(`${process.env.RC_OUT || '.'}/chunks.txt`, out);
const pick = rows.filter(r => /awardDraw|soccerSeasonAwards|careerAwards|AppearanceBuilder|SoccerCareer|soccerCareerEngine/.test(r[2]));
console.log(pick.map(r => `${r[2]} ${r[1]}`).join('\n'));
console.log(`chunks: ${rows.length}`);

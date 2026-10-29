// Light probe: recompute simSiteSearch section 7's guide hash from git objects
// at each commit given, and compare it with that commit's searchKeywords.json source.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const DIR = 'src/data/gameContent';

for (const sha of process.argv.slice(2)) {
  const names = git('ls-tree', '--name-only', `${sha}:${DIR}`).split('\n').filter(Boolean).sort();
  const types = git('ls-tree', `${sha}:${DIR}`).split('\n').filter(Boolean).map(l => l.split(/\s+/)[1]);
  const body = names.map(f => git('show', `${sha}:${DIR}/${f}`).replace(/\r\n/g, '\n')).join('\n');
  const live = createHash('sha256').update(body).digest('hex').slice(0, 16);
  const kw = JSON.parse(git('show', `${sha}:src/data/searchKeywords.json`));
  const verdict = kw.source === live ? 'MATCH' : 'STALE';
  console.log(`${sha.slice(0, 9)} files=${names.length} nonblob=${types.filter(t => t !== 'blob').length} guides=${live} index=${kw.source} ${verdict} sc=${JSON.stringify((kw.k || {})['/soccer-career'] || '')}`);
}

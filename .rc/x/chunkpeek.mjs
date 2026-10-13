// Round 1330 probe: what the shared chunks the soccer page now fetches hold (run from a repo root with dist/).
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const dir = 'dist/assets';
for (const f of readdirSync(dir).filter(f => /^(saveFence|useArrivalTop|useSaveFenceWatch|SaveMovedNotice|useRevealScroll)-.*\.js$/.test(f))) {
  const s = readFileSync(`${dir}/${f}`, 'utf8');
  console.log(`== ${f}: ${s.length} bytes, ${(gzipSync(s).length / 1024).toFixed(2)}K gz`);
  console.log(s.slice(0, 1400));
  console.log('...');
  console.log(s.slice(-300));
}

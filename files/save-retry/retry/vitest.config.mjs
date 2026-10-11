import { defineConfig } from "/home/runner/work/ballpark-hero/ballpark-hero/node_modules/vitest/dist/config.js";
import react from "/home/runner/work/ballpark-hero/ballpark-hero/node_modules/@vitejs/plugin-react-swc/index.js";
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(), dir = "/home/runner/work/_temp/rc-out/files/save-retry/retry", wanted = ["/home/runner/work/ballpark-hero/ballpark-hero/src/test/usCareerSaveRetry.test.tsx","/home/runner/work/ballpark-hero/ballpark-hero/src/components/us-career/UsCareerBoard.tsx","/home/runner/work/ballpark-hero/ballpark-hero/src/components/us-career/UsCareerSaveNotice.tsx","/home/runner/work/ballpark-hero/ballpark-hero/src/lib/careerTraining.ts","/home/runner/work/ballpark-hero/ballpark-hero/src/lib/nflCareerSport.ts","/home/runner/work/ballpark-hero/ballpark-hero/src/lib/nbaCareerSport.ts","/home/runner/work/ballpark-hero/ballpark-hero/src/lib/mlbCareerSport.ts","/home/runner/work/ballpark-hero/ballpark-hero/src/lib/nhlCareerSport.ts","/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx"];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({ root: "/home/runner/work/ballpark-hero/ballpark-hero", plugins: [react(), {
  name: 'retain-us-save-transform', enforce: 'post', transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\', '/'); if (!wanted.includes(file)) return null;
    const input = fs.readFileSync(file), output = 'transforms/' + hash(file).slice(0, 16) + '.js';
    fs.mkdirSync(path.join(dir, 'transforms'), { recursive: true }); fs.writeFileSync(path.join(dir, output), code);
    seen.set(file, { file, inputSha256: hash(input), transformedSha256: hash(code), output });
    fs.writeFileSync(path.join(dir, 'transforms.json'), JSON.stringify([...seen.values()], null, 2)); return null;
  }
}], test: { environment: 'jsdom', globals: true, setupFiles: ["/home/runner/work/ballpark-hero/ballpark-hero/src/test/setup.ts"], include: ["src/test/usCareerSaveRetry.test.tsx"], maxWorkers: 1, fileParallelism: false },
resolve: { alias: {"@/components/us-career/UsCareerBoard":"/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx","@":"/home/runner/work/ballpark-hero/ballpark-hero/src"} } });

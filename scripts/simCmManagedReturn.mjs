import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, [
  'node_modules/vitest/vitest.mjs','run','src/test/clubManagerReturnToPlay.test.ts',
  '--reporter=verbose','--minWorkers=1','--maxWorkers=1',
], {stdio:'inherit'});
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;

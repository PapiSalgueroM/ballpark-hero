import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath,
  ['node_modules/vitest/vitest.mjs', 'run', 'src/test/clubManagerCornerDelivery.test.ts', '--reporter=verbose', '--maxWorkers=1', '--minWorkers=1'],
  { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

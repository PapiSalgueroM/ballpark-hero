import { defineConfig } from 'vitest/config';
import path from 'path';

/* VERIFY scratch config, never committed: the reviewer's rv-vitest.config.ts with the paths of the runner
   (the probe is sent as .rc/x/vf-probe.test.ts, two folders under the repo root). */
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: { environment: 'jsdom', globals: true, include: ['.rc/x/vf-probe.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '../../src') } },
});

// Release AM reviewer (us-careers), never committed. The scratch clean-vs-recovered test on a remote runner.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

const ROOT = process.cwd();
export default defineConfig({
  root: ROOT,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [`${ROOT}/src/test/setup.ts`],
    include: ['.rc/x/cleanVsRecovered2.test.tsx'],
    maxWorkers: 1,
    fileParallelism: false,
  },
  resolve: { alias: { '@': `${ROOT}/src` } },
});

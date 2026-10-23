import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(root, '../../..');
const out = process.env.CM_COACHED_OUT;
assert(out && path.isAbsolute(out), 'CM_COACHED_OUT must be absolute');
assert(path.resolve(out) !== source && !path.resolve(out).startsWith(source + path.sep), 'Output outside checkout');
const outDir = path.join(out, 'fixture-dist');
assert(!fs.existsSync(outDir), 'Fresh fixture output required');
export default defineConfig({
  root, publicDir: false, plugins: [react()],
  resolve: { alias: { '@': path.join(source, 'src') } },
  build: { outDir, emptyOutDir: false, rollupOptions: { input: path.join(root, 'cmCoachedStyles.html') } },
});

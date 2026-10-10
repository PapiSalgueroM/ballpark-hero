/* Release AT fix2 probe (never committed): the repo's own vite config plus one plugin that
   records, for every built chunk, its gzipped size and the rendered length of each module in it.
   Usage, from the root of the tree to build:
     WEIGHT_JSON=/tmp/x.json node_modules/.bin/vite build --config <this file> --outDir /tmp/out --emptyOutDir */
import { loadConfigFromFile, mergeConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

export default async (env) => {
  const root = process.cwd();
  const loaded = await loadConfigFromFile(env, path.join(root, 'vite.config.ts'), root);
  if (!loaded) throw new Error('no vite.config.ts in ' + root);
  const out = process.env.WEIGHT_JSON;
  if (!out) throw new Error('WEIGHT_JSON is not set');
  const rel = (id) => {
    const clean = id.split('?')[0].split(path.sep).join('/');
    const nm = clean.lastIndexOf('/node_modules/');
    if (nm >= 0) return 'node_modules/' + clean.slice(nm + '/node_modules/'.length);
    const r = path.relative(root, clean).split(path.sep).join('/');
    return r;
  };
  const plugin = {
    name: 'weight-modules',
    generateBundle(_opts, bundle) {
      const rec = {};
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const mods = {};
        for (const [id, m] of Object.entries(chunk.modules)) {
          const k = rel(id);
          mods[k] = (mods[k] || 0) + m.renderedLength;
        }
        rec[path.basename(file)] = {
          name: chunk.name,
          isEntry: chunk.isEntry,
          bytes: Buffer.byteLength(chunk.code),
          gz: zlib.gzipSync(chunk.code).length,
          imports: chunk.imports.map((f) => path.basename(f)),
          modules: mods,
        };
      }
      fs.writeFileSync(out, JSON.stringify(rec));
      console.log('weight-modules: ' + Object.keys(rec).length + ' chunks recorded in ' + out);
    },
  };
  return mergeConfig(loaded.config, { plugins: [plugin] });
};

/* Round 1550 probe (sent to a runner as an extra file, never committed): the repo's own vite config plus one
   plugin that writes every chunk's modules (rendered length) and imports into $RC_OUT/chunks.json. */
import fs from 'node:fs';
import base from '../../vite.config';

export default (env: { mode: string; command: string }) => {
  const c = (base as unknown as (e: typeof env) => Record<string, unknown>)(env);
  const plugins = (c.plugins as unknown[]) ?? [];
  c.plugins = [...plugins, {
    name: 'r1550-dump-chunks',
    apply: 'build',
    generateBundle(_o: unknown, bundle: Record<string, any>) {
      const out: unknown[] = [];
      for (const [f, ch] of Object.entries(bundle)) {
        if (ch.type !== 'chunk') continue;
        const mods: Record<string, number> = {};
        for (const [id, m] of Object.entries(ch.modules as Record<string, { renderedLength: number }>)) {
          mods[id.replace(process.cwd(), '').replace(/\\/g, '/')] = m.renderedLength;
        }
        out.push({ f, entry: ch.isEntry, imports: ch.imports, dyn: ch.dynamicImports, mods });
      }
      const dir = process.env.RC_OUT || '.';
      fs.writeFileSync(`${dir}/${process.env.R1550_TAG || 'head'}-chunks.json`, JSON.stringify(out));
    },
  }];
  return c;
};

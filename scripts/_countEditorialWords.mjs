import { readFileSync } from 'node:fs';

const t = readFileSync('src/data/gameEditorialGuides.ts', 'utf8');
const starts = [...t.matchAll(/  '(\/[^']+)': \{/g)];
for (let i = 0; i < starts.length; i++) {
  const path = starts[i][1];
  const from = starts[i].index;
  const to = i + 1 < starts.length ? starts[i + 1].index : t.length;
  const chunk = t.slice(from, to);
  const paras = [...chunk.matchAll(/paragraphs: \[([\s\S]*?)\]/g)].map((m) => m[1]);
  const texts = [];
  for (const p of paras) {
    const strs = [...p.matchAll(/'((?:\\'|[^'])*)'/g)].map((x) => x[1].replace(/\\'/g, "'"));
    texts.push(...strs);
  }
  const words = texts.join(' ').split(/\s+/).filter(Boolean);
  console.log(`${path}\t${words.length}`);
}

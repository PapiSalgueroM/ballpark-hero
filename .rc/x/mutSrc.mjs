/* Round 1225 fixer: source mutations for the runner, each applied in a scratch worktree (never in the checkout
   other request lines read). Usage: node mutSrc.mjs <root> <name>. Exit 7 when an anchor is not there exactly once. */
import fs from 'node:fs';
import path from 'node:path';

const [root, name] = process.argv.slice(2);
const MUTATIONS = {
  /* The reviewer's alwayspublished: every list is shown as first published in June 2026. */
  alwayspublished: {
    file: 'src/lib/clubManagerFixtures.ts',
    from: "return 'published' in asOf ? `the list as first published in ${asOf.published}` : `the list as it stood on ${asOf.stoodOn}`;",
    to: "return `the list as first published in ${'published' in asOf ? asOf.published : 'June 2026'}`;",
  },
  /* Help's component drops one league from the paragraph it renders (the source form of the control helpdrift). */
  helpdrops: {
    file: 'src/components/club-manager/ClubManagerHelp.tsx',
    from: '  for (const entry of REAL_LEAGUE_FIXTURES) {\n    const asOf',
    to: "  for (const entry of REAL_LEAGUE_FIXTURES) {\n    if (entry.leagueId === 'bundesliga') continue;\n    const asOf",
  },
  /* A link planted in the Help paragraph itself (the source form of the control helplink). */
  helplinks: {
    file: 'src/components/club-manager/ClubManagerHelp.tsx',
    from: 'Your Calendar names the two sources for your league.</p>',
    to: 'Your Calendar names the two sources for your league. <a href="/whats-new">More</a></p>',
  },
  /* What's New stops listing one league (the source form of the control newsdrift). */
  newsdrops: {
    file: 'src/pages/WhatsNew.tsx',
    from: 'data-cm-fixture-leagues="championship laliga seriea bundesliga eredivisie primeira superlig bundesliga2 ligue2"',
    to: 'data-cm-fixture-leagues="championship laliga seriea bundesliga eredivisie primeira superlig bundesliga2"',
  },
  /* What's New tells Barcelona's example the way the reviewed build did. */
  newsopens: {
    file: 'src/pages/WhatsNew.tsx',
    from: "Barcelona's matchday one is at home to Athletic Club and matchday two is away at Elche.",
    to: 'Barcelona open away at Elche and then host Athletic Club.',
  },
};
/* The weight attribution: the registry with its nine lazy lines taken out (the Premier League's line stays). */
if (name === 'noninelines') {
  const file = path.join(root, 'src/lib/clubManagerFixtures.ts');
  const lines = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n').split('\n');
  const kept = lines.filter(line => !(line.startsWith("  { key: '") && line.includes('load: () => import(')));
  if (lines.length - kept.length !== 9) { console.error(`mutSrc noninelines: ${lines.length - kept.length} lazy registry lines found, wanted exactly 9`); process.exit(7); }
  fs.writeFileSync(file, kept.join('\n'));
  console.log('mutSrc noninelines: nine lazy registry lines taken out of src/lib/clubManagerFixtures.ts');
  process.exit(0);
}
const m = MUTATIONS[name];
if (!m) { console.error(`mutSrc: no mutation ${name}: ${Object.keys(MUTATIONS).join(', ')}`); process.exit(7); }
const file = path.join(root, m.file);
const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const count = text.split(m.from).length - 1;
if (count !== 1) { console.error(`mutSrc ${name}: the anchor is in ${m.file} ${count} times, wanted exactly once`); process.exit(7); }
fs.writeFileSync(file, text.replace(m.from, m.to));
console.log(`mutSrc ${name}: applied to ${m.file}`);

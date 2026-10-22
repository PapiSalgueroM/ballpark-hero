// Review of Round 1536 (lens: runs things). Applies ONE named mutation on the runner, in the current checkout.
// Each edit asserts its "from" string exists exactly once first, so a mutation that did not apply cannot pass as green.
// usage: node .rc/x/apply.mjs <name> [suffix]
import fs from 'node:fs';

const WALK = 'scripts/playFirstVisitDialogs.mjs';
const NINE = ['/stadium-tycoon', '/idle-arena', '/wonderkid-factory'].flatMap(r => [320, 390, 1280].map(w => `${r}@${w}`));
const list = keys => `const EXPECTED_SITE_RED = { ${keys.map(k => `'${k}': 'review'`).join(', ')} };`;

const MOCK_ROUTE = [
  'await page.route(/supabase\\.co/, r => {',
  '      const u = new URL(r.request().url());',
  "      if (!u.pathname.startsWith('/rest/v1/') || r.request().method() !== 'GET') return r.abort();",
  "      const sel = (u.searchParams.get('select') || 'id').split(',').map(s => s.trim()).filter(Boolean).map(c => c.split(':').pop().split('(')[0]);",
  "      const num = c => /year|season|score|^id$|_id$|rating|ovr|points|goals|count|rank|age|num|pct|wins|losses/i.test(c);",
  "      const rows = Array.from({ length: 24 }, (_, i) => Object.fromEntries(sel.map(c => [c, num(c) ? 1990 + i : `Mock ${c} ${i}`])));",
  "      const single = /vnd\\.pgrst\\.object/.test(r.request().headers()['accept'] || '');",
  "      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? rows[0] : rows) });",
  '    });',
].join('\n');

const M = {
  // product mutations
  stalevar: { file: 'src/components/game/aboveConsentBanner.ts', edits: [['var(--dukb-consent-height, 0px)', 'var(--dukb-consent-heigth, 0px)']] },
  nocap: { file: 'src/components/game/aboveConsentBanner.ts', edits: [['maxHeight: `min(${cap}, 100%)`', 'maxHeight: cap']] },
  roleback: { file: 'src/pages/IdleArena.tsx', edits: [
    [` style={boxInsideOverlay('85vh')} role="dialog" aria-modal="true" aria-label="How Idle Arena works">`, ` style={boxInsideOverlay('85vh')}>`],
    ['px-4" style={OVERLAY_ABOVE_BANNER}>', 'px-4" style={OVERLAY_ABOVE_BANNER} role="dialog" aria-modal="true" aria-label="How Idle Arena works">'],
  ] },
  notop: { file: 'src/index.css', edits: [['  top: calc((100dvh - var(--dukb-consent-height, 230px)) / 2);\n', '']] },
  rulegone: { file: 'src/index.css', edits: [["body[data-consent-pending] [role='dialog'] {", "body[data-consent-pending-review-off] [role='dialog'] {"]] },
  noclose: { file: 'src/pages/StadiumTycoon.tsx', edits: [[
    '              onClick={() => setShowHelp(false)}\n              className="mt-4 w-full py-3 rounded-xl font-bold bg-primary',
    '              onClick={() => {}}\n              className="mt-4 w-full py-3 rounded-xl font-bold bg-primary',
  ]] },
  // walk variants, written beside the walk so its relative imports still resolve
  expect9: { file: WALK, out: 'scripts/_rvExpect9.mjs', edits: [['const EXPECTED_SITE_RED = {};', list(NINE)]] },
  expect8: { file: WALK, out: 'scripts/_rvExpect8.mjs', edits: [['const EXPECTED_SITE_RED = {};', list(NINE.filter(k => k !== '/idle-arena@390'))]] },
  landscape: { file: WALK, out: 'scripts/_rvLandscape.mjs', edits: [['const WIDTHS = [[320, 640], [390, 844], [1280, 900]];', 'const WIDTHS = [[844, 390], [640, 360], [568, 320]];']] },
  mockdb: { file: WALK, out: 'scripts/_rvMockWalk.mjs', edits: [['await page.route(/supabase\\.co/, r => r.abort());', MOCK_ROUTE]] },
};

const name = process.argv[2];
const suffix = process.argv[3] || '';
const m = M[name];
if (!m) { console.error(`MUTATION NOT APPLIED: unknown mutation ${name}`); process.exit(9); }
let src = fs.readFileSync(m.file, 'utf8');
for (const [from, to] of m.edits) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION NOT APPLIED: ${name} expected 1 occurrence of ${JSON.stringify(from).slice(0, 90)} in ${m.file}, found ${n}`); process.exit(9); }
  src = src.replace(from, () => to);
}
const out = m.out ? m.out.replace('.mjs', `${suffix}.mjs`) : m.file;
fs.writeFileSync(out, src);
console.log(`MUTATION ${name} applied to ${m.file}${m.out ? ` (written to ${out})` : ''}`);

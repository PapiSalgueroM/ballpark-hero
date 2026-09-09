/*
 * Round 516: the Club Manager league table row has to fit a phone.
 *
 * WHY THIS EXISTS RATHER THAN A THIRD MEASUREMENT BY HAND. The column widths
 * were trimmed in Round 465 and measured WITHOUT the star that marks your own
 * club before a ball is kicked, so your row, the one row a player looks at
 * first, was the only one in the table that clipped. That was found by an
 * adversarial review, sat in the open bugs list, and its note said "measure it
 * in a browser at 390 before changing the template again". This is that
 * measurement, kept.
 *
 * It renders the row's OWN markup against the SHIPPED stylesheet instead of
 * driving the game to a table. That is deliberate. The clipping depends on
 * exactly two things, the grid template and the strings, and both are here;
 * driving five picker steps to reach a table adds a lot of ways to fail that
 * have nothing to do with what is being measured, and a harness that breaks for
 * unrelated reasons stops being run.
 *
 * The club names are the real ones the engine ships, pulled from its own league
 * data rather than typed here, so a longer club arriving in a future data
 * refresh is measured rather than assumed.
 *
 * THE PAGE PADDING IS 16px AND NOT 12. Every Club Manager screen is drawn inside
 * GameShell, whose wrapper is `px-4` (src/components/game/GameShell.tsx). The
 * first version of this harness wrapped the card in 12px, which made its name
 * column 8px WIDER than the shipped one, so the guard was measuring a table
 * that is roomier than the real page and could have passed while the real page
 * clipped. Found by the adversarial review of this very round.
 *
 * Control: TABLE_FIT_CONTROL=star puts the star back inside the name cell,
 * which is the shipped bug, so the check must go red naming your own club.
 *
 * Run: node scripts/playLeagueTableFit.mjs   (needs dist, and a built stylesheet)
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');

const CONTROL = process.env.TABLE_FIT_CONTROL || '';
if (CONTROL && CONTROL !== 'star') {
  console.error(`TABLE_FIT_CONTROL=${CONTROL} is not a control this harness knows (star)`);
  process.exit(1);
}

const distDir = path.join(ROOT, 'dist/assets');
if (!fs.existsSync(distDir)) {
  console.log('DIST NOT BUILT. NOTHING WAS CHECKED.');
  process.exit(1);
}
const cssFile = fs.readdirSync(distDir).find(f => f.endsWith('.css'));
if (!cssFile) {
  console.log('DIST NOT BUILT. NOTHING WAS CHECKED.');
  process.exit(1);
}
const css = fs.readFileSync(path.join(distDir, cssFile), 'utf8');

/* ---------- the row template, read from the component itself ---------- */
const CARD = path.join(ROOT, 'src/components/club-manager/LeagueTableCard.tsx');
const cardSrc = fs.readFileSync(CARD, 'utf8');
const gridMatch = cardSrc.match(/grid grid-cols-\[[^\]]+\] gap-x-1 items-center text-xs py-1\.5/);
if (!gridMatch) {
  console.error('could not find the row grid template in LeagueTableCard.tsx, so this harness would be measuring a template it invented');
  process.exit(1);
}
const GRID = gridMatch[0];

/* The star belongs in the position cell. If the component ever puts it back in
   the name, this harness still measures the component's own choice rather than
   a shape it assumed, so read which cell carries it. */
const starInName = /\{preseason && mine \? '⭐ ' : ''\}\{r\.club\}/.test(cardSrc);
const starInPos = /preseason \? \(mine \? '⭐' : '·'\)/.test(cardSrc);
const armStarInName = CONTROL === 'star' ? true : starInName;
if (CONTROL === 'star' && starInName) {
  console.error('control cannot run: the component already puts the star in the name, so the control changes nothing');
  process.exit(1);
}
if (!CONTROL && !starInName && !starInPos) {
  console.error('LeagueTableCard marks your club in a way this harness does not recognise; re-read it before trusting this run');
  process.exit(1);
}

/* ---------- the real club names, from the engine ---------- */
const ENTRY = `${TMP}/tableFit.entry.mjs`;
const BUNDLE = `${TMP}/tableFit.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const e = await import('${ROOT_URL}/src/lib/clubManager.ts');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { e } = await import(pathToFileURL(BUNDLE).href);

const clubs = new Set();
const SEEDS = ['Arsenal', 'Real Madrid', 'Bayern Munich', 'Juventus', 'Paris Saint-Germain', 'Ajax', 'Porto', 'Celtic'];
for (const seed of SEEDS) {
  try {
    const c = e.startCareer(seed);
    for (const club of e.careerLeagueOf(c).clubs) clubs.add(club);
  } catch { /* a seed the build does not carry is simply skipped */ }
}
const CLUBS = [...clubs];
if (CLUBS.length < 20) {
  console.log('COULD NOT READ THE LEAGUE DATA. NOTHING WAS CHECKED.');
  process.exit(1);
}
console.log(`   ${CLUBS.length} real club names pulled from ${SEEDS.length} leagues, longest "${CLUBS.slice().sort((a, b) => b.length - a.length)[0]}"`);

/* ---------- measure ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rowHtml = (club, mine) => {
  const starName = armStarInName && mine ? '&#11088; ' : '';
  const posCell = !armStarInName && mine ? '&#11088;' : '&#183;';
  return `
  <div class="${GRID} ${mine ? 'bg-primary/10 rounded-md -mx-1 px-1' : ''}">
    <span class="font-bold text-muted-foreground">${posCell}</span>
    <span class="truncate ${mine ? 'text-primary font-bold' : 'text-foreground'}" data-club="${esc(club)}" data-mine="${mine}">${starName}${esc(club)}</span>
    <span class="text-center text-muted-foreground">0</span>
    <span class="text-center text-muted-foreground">0</span>
    <span class="text-center text-muted-foreground">0</span>
    <span class="text-center text-muted-foreground text-[11px] tabular-nums">0-0</span>
    <span class="text-center text-muted-foreground">0</span>
    <span class="text-right font-bold text-foreground">0</span>
  </div>`;
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

console.log('1) At 390 wide, no club name clips, including your own starred row');
let measured = 0;
let clippedTotal = 0;
/* Every club takes a turn as YOURS, because the star only ever sits on one row
   and the bug was specific to that row. Twenty-odd renders is cheap. */
for (let i = 0; i < CLUBS.length; i++) {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${css}</style></head>
    <body class="dark"><div style="padding:0 16px"><div class="bg-card border border-border rounded-2xl p-3">
    ${CLUBS.map((c, j) => rowHtml(c, j === i)).join('')}
    </div></div></body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  const res = await page.evaluate(() => Array.from(document.querySelectorAll('[data-club]')).map(el => {
    const r = el.getBoundingClientRect();
    return {
      club: el.getAttribute('data-club'),
      mine: el.getAttribute('data-mine') === 'true',
      width: Math.round(r.width),
      need: el.scrollWidth,
      clipped: el.scrollWidth > Math.ceil(r.width) + 1,
    };
  }));
  measured += res.length;
  for (const r of res.filter(x => x.clipped)) {
    clippedTotal += 1;
    if (clippedTotal <= 5) {
      fail(`"${r.club}" clips at 390 wide${r.mine ? ' as YOUR starred club' : ''}: the column is ${r.width}px and the name needs ${r.need}px`);
    }
  }
}
if (clippedTotal > 5) fail(`and ${clippedTotal - 5} more clipped names`);
console.log(`   ${measured} name cells measured across ${CLUBS.length} renders, ${clippedTotal} clipped`);
if (measured < CLUBS.length * CLUBS.length) fail(`only ${measured} cells were measured, so the sweep did not cover every club as yours`);

/*
 * How much room is actually left, which is worth printing even when nothing
 * clips because the answer turned out to be "almost none".
 *
 * scrollWidth CANNOT answer this: on a truncating element it returns the
 * client width whenever the text fits, so every name reports zero slack and the
 * line reads as though the column were permanently on the edge. The intrinsic
 * width has to be measured on a copy that is allowed to be as wide as it wants.
 */
const margin = await page.evaluate(() => {
  const cell = document.querySelector('[data-club]');
  if (!cell) return null;
  const colWidth = Math.round(cell.getBoundingClientRect().width);
  /* The probe has to carry the cell's COMPUTED font, not its class list. The
     row sets text-xs on the grid container and the cell inherits it, so a probe
     appended to document.body renders at the default 16px and overstates every
     name by about a third. That is how the first version of this line reported
     a name needing 146px of a 125px column while nothing was clipping. */
  const cs = getComputedStyle(cell);
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;';
  probe.style.font = cs.font;
  probe.style.fontWeight = cs.fontWeight;
  probe.style.fontSize = cs.fontSize;
  probe.style.fontFamily = cs.fontFamily;
  probe.style.letterSpacing = cs.letterSpacing;
  document.body.appendChild(probe);
  let worst = null;
  for (const el of Array.from(document.querySelectorAll('[data-club]'))) {
    const club = el.getAttribute('data-club');
    probe.textContent = club;
    const need = Math.ceil(probe.getBoundingClientRect().width);
    const slack = colWidth - need;
    if (!worst || slack < worst.slack) worst = { club, slack, colWidth, need };
  }
  probe.remove();
  return worst;
});
if (margin) {
  console.log(`   tightest fit: "${margin.club}" needs ${margin.need}px of a ${margin.colWidth}px column, ${margin.slack}px to spare`);
  /* Not a failure, because nothing is clipping today and a warning that fails
     the build would be a threshold nobody measured. It is printed loudly
     because the next longer club name in a data refresh clips on its own, with
     no star involved, and whoever sees that should know it was expected.
     Ten rather than six: on the page's real 16px padding the margin is 7px,
     which is about one more character, so a warning set at six would never fire
     until something had already clipped. */
  if (margin.slack < 10) {
    console.log(`   NOTE: only ${margin.slack}px spare. A club name longer than "${margin.club}" will clip on its own, star or no star.`);
  }
}

await browser.close();

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else if (failures) {
  console.error(`\nplayLeagueTableFit: ${failures} FAILURES`);
  process.exitCode = 1;
} else {
  console.log('\nplayLeagueTableFit: green. Every club name fits the row at 390, including the one wearing the star.');
}

/**
 * fix-1583 (review-run-1583 minor 2): what the four US Connections pages show of a dated club group is held by a
 * committed check, not only by a walk nobody committed.
 *
 * Rounds 1567, 1574 and 1583 date the club groups of Baseball, NFL, NHL and NBA Connections ("Played for the Boston
 * Celtics (as of 2025-26)"). Two things a player reads depend on page code no data harness touches, and reverting
 * either left every gate green (review-run-1583, mutations m-page and m-dialog):
 *   1) a revealed group's label goes through ConnectionsGroupLabel (src/components/game/ConnectionsGroupLabel.tsx),
 *      which keeps "(as of 2025-26)" whole on one line at 390 wide; and a page that shows the receipt after a solve
 *      ("Locked: <label>. Those five are solved.") sends it through ConnectionsReceiptText for the same reason. So a
 *      page may not render a theme or the notice as a raw JSX text child ({group.theme}, {notice.text}); it must
 *      import the component and render it with the theme or the notice.
 *   2) the How to play dialog says what the date means: 'A team group marked "as of <date>" only counts seasons up
 *      to then, so a <trade or signing> later on can't change the answer.', and its <date> is a date the sport's own
 *      file boards carry (src/data/<sport>ConnectionsPuzzles.ts), so a round that moves every date must move the
 *      sentence too.
 * Source is read with comments removed and line endings normalised, so the prose explaining a rule (this header
 * included) can never satisfy it.
 *
 *   node scripts/simConnectionsDatedCopy.mjs        exit 0 green, 1 on any finding (light, no network, no build)
 *   CONN_COPY_CONTROL=page     NBA's revealed label back to {group.theme} in memory (raw-label, nba)
 *   CONN_COPY_CONTROL=receipt  NBA's receipt back to {notice.text} in memory (raw-receipt, nba)
 *   CONN_COPY_CONTROL=dialog   NBA's dialog sentence taken out in memory (no-sentence, nba)
 *   CONN_COPY_CONTROL=datemove NHL's dialog date read as 2026-27, a date its boards do not carry (wrong-date, nhl)
 *   CONN_COPY_CONTROL=comment  NBA's revealed label back to {group.theme} with the component kept in a comment
 *                              beside it (raw-label, nba): proves a comment cannot hold the rule
 * A control is red (exit 1) only when its own rule fires for its sport; one whose input is missing says ABORTED and
 * exits 2. Measured 2026-10-29 on the fix head: plain 0 findings over 4 pages, 4 dialogs, 45 dated labels.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CONN_COPY_CONTROL ?? '';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/* block comments (JSX ones included) and line comments outside strings; a // inside a quoted string or a URL is kept */
const code = src => src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

const GAMES = {
  baseball: { page: 'src/pages/BaseballConnections.tsx', dialog: 'src/components/baseball-connections/BaseballConnectionsHowToPlay.tsx', data: 'src/data/baseballConnectionsPuzzles.ts' },
  nfl: { page: 'src/pages/NflConnections.tsx', dialog: 'src/components/nfl-connections/NflConnectionsHowToPlay.tsx', data: 'src/data/nflConnectionsPuzzles.ts' },
  nhl: { page: 'src/pages/NhlConnections.tsx', dialog: 'src/components/nhl-connections/NhlConnectionsHowToPlay.tsx', data: 'src/data/nhlConnectionsPuzzles.ts' },
  nba: { page: 'src/pages/NbaConnections.tsx', dialog: 'src/components/nba-connections/NbaConnectionsHowToPlay.tsx', data: 'src/data/nbaConnectionsPuzzles.ts' },
};
const src = {};
for (const [s, g] of Object.entries(GAMES)) src[s] = { page: read(g.page), dialog: read(g.dialog), data: read(g.data) };

/* ---- the controls: each changes one file's text in memory, proves it did, and must end red ---- */
const LABEL = '<ConnectionsGroupLabel theme={group.theme} />';
const RECEIPT = '<ConnectionsReceiptText text={notice.text} />';
const SENTENCE = /A team group marked "as of ([^"]+)" only counts seasons up to then, so a (trade|signing) later on can't change the answer\./;
let own = null;
const swap = (s, part, from, to) => {
  const n = src[s][part].split(from).length - 1;
  if (n !== 1) { console.log(`CONN_COPY_CONTROL=${CONTROL} ABORTED: ${GAMES[s][part]} holds ${JSON.stringify(from)} ${n} times, not once`); process.exit(2); }
  src[s][part] = src[s][part].replace(from, to);
};
if (CONTROL === 'page') { swap('nba', 'page', LABEL, '{group.theme}'); own = ['raw-label', 'nba']; }
else if (CONTROL === 'receipt') { swap('nba', 'page', RECEIPT, '{notice.text}'); own = ['raw-receipt', 'nba']; }
else if (CONTROL === 'dialog') {
  const m = src.nba.dialog.match(SENTENCE);
  if (!m) { console.log('CONN_COPY_CONTROL=dialog ABORTED: the NBA dialog holds no sentence to take out'); process.exit(2); }
  swap('nba', 'dialog', m[0], ''); own = ['no-sentence', 'nba'];
} else if (CONTROL === 'datemove') { swap('nhl', 'dialog', 'A team group marked "as of 2025-26"', 'A team group marked "as of 2026-27"'); own = ['wrong-date', 'nhl']; }
else if (CONTROL === 'comment') { swap('nba', 'page', LABEL, `{/* ${LABEL} */}{group.theme}`); own = ['raw-label', 'nba']; }
else if (CONTROL) { console.log(`CONN_COPY_CONTROL=${CONTROL} is not a control here`); process.exit(2); }
if (CONTROL) console.log(`CONN_COPY_CONTROL=${CONTROL}: the input was changed in memory; this run must end red`);

const fires = [];
const fail = (kind, s, msg) => { fires.push({ kind, s }); console.error(`  FAIL ${kind} ${s}: ${msg}`); };
let labels = 0;
for (const [s, g] of Object.entries(GAMES)) {
  const page = code(src[s].page);
  const dialog = code(src[s].dialog);
  const data = code(src[s].data);
  /* 1) the label and the receipt */
  /* a JSX text child: not an attribute value (key={...}, theme={...}) and not a template literal's ${...} */
  const raw = [...page.matchAll(/(?<![=\w$])\{\s*([\w.]+\.theme)\s*\}/g)].map(m => m[1]);
  for (const r of raw) fail('raw-label', s, `${g.page} renders {${r}} as text, so a dated label can break inside its date`);
  if (!/import\s*\{[^}]*\bConnectionsGroupLabel\b[^}]*\}\s*from\s*'@\/components\/game\/ConnectionsGroupLabel'/.test(page)) fail('raw-label', s, `${g.page} does not import ConnectionsGroupLabel`);
  if (!/<ConnectionsGroupLabel\s+theme=\{[\w.]+\.theme\}\s*\/>/.test(page)) fail('raw-label', s, `${g.page} renders no group label through ConnectionsGroupLabel`);
  const notice = /\bnotice\.text\b/.test(page);
  if (notice) {
    if (/(?<![=\w$])\{\s*notice\.text\s*\}/.test(page)) fail('raw-receipt', s, `${g.page} renders {notice.text} as text, so the receipt can break inside a date`);
    if (!/<ConnectionsReceiptText\s+text=\{notice\.text\}\s*\/>/.test(page)) fail('raw-receipt', s, `${g.page} shows a receipt but not through ConnectionsReceiptText`);
  }
  /* 2) the dialog sentence and its date */
  const dates = new Set([...data.matchAll(/\(as of ([^)]+)\)/g)].map(m => m[1]));
  labels += [...data.matchAll(/\(as of [^)]+\)/g)].length;
  const m = dialog.match(SENTENCE);
  if (!m) fail('no-sentence', s, `${g.dialog} does not say what "as of" means`);
  else if (!dates.has(m[1])) fail('wrong-date', s, `${g.dialog} says "as of ${m[1]}", a date no board in ${g.data} carries (${[...dates].join(', ') || 'none'})`);
  console.log(`   ${s}: ${raw.length} raw labels, receipt ${notice ? 'shown' : 'not shown'}, dialog date ${m ? m[1] : 'missing'} (boards carry ${[...dates].join(', ') || 'none'})`);
}

if (CONTROL) {
  const hit = fires.filter(f => f.kind === own[0] && f.s === own[1]).length;
  if (hit) { console.error(`CONN_COPY_CONTROL=${CONTROL} fired its own rule ${hit} time(s): ${own[0]} for ${own[1]} (${fires.length} findings in all)`); process.exit(1); }
  console.log(`CONN_COPY_CONTROL=${CONTROL} did NOT fire its own rule (${own[0]} for ${own[1]}); this control proves nothing as the code stands`);
  process.exit(0);
}
if (fires.length) { console.error(`simConnectionsDatedCopy: ${fires.length} finding(s)`); process.exit(1); }
console.log(`simConnectionsDatedCopy: green. The four US Connections pages render every group label through ConnectionsGroupLabel and every receipt through ConnectionsReceiptText, and each How to play dialog says what "as of" means with a date its own boards carry (${labels} dated labels).`);

/**
 * Round 656 harness: /world-cup-2026-results says what src/data/wc2026Results.ts
 * says, and reaches a crawler saying it.
 *
 * WHAT CHANGED. The 2026 World Cup has been two source verified in
 * src/data/wc2026Results.ts since Round 395, and until this round the only thing
 * that printed it was the bracket game's results panel, knockout half only,
 * behind a button. src/pages/WorldCup2026Results.tsx now prints all of it on its
 * own address: the final, every group in finishing order, every knockout score
 * and how it was settled, and the awards.
 *
 * WHAT THIS HOLDS. It recomputes everything from the results file with helpers
 * written here, never the page's own, and compares against the SAVED page in
 * public/, which is what a crawler receives:
 *   1. Registration. A route in App.tsx (comments stripped), a sitemap entry, a
 *      line in pageSchema.ts's type table, a saved page with a snapshot block,
 *      a link in from the bodies of /soccer, /records and /world-cup-bracket (the
 *      footer does not count), and no link from the page to a retired route.
 *   2. The final. Exactly one final row, its winner one of its two teams and the
 *      file's champion, runner-up and third place constants agreeing with the
 *      rows. The h2 is the final recomputed ("Spain 1-0 Argentina after extra
 *      time"), the row under it is cell for cell, and the opening line and the
 *      meta description state the same result.
 *   3. The group order. Twelve h3s, Group A to Group L in the file's order, each
 *      holding its four teams in the file's order with the position and how far
 *      each team got, recomputed from the knockout rows. The teams in the round
 *      of 32 are exactly the top twos and the qualified thirds, so the sentence
 *      saying so is true, and its count of thirds is the file's. The section
 *      never says "table": the file holds positions, not points.
 *   4. The match list. Every round from the round of 32 to the third place
 *      match has its h2, and under it exactly that round's rows, earliest first,
 *      cell for cell: date, teams, score, how it was decided. Every row is sane:
 *      a shootout only after a level extra time and won by the side with more
 *      kicks scored, otherwise won by the side with more goals.
 *   5. The awards, cell for cell against WC2026_AWARDS.
 *   6. The head. One h1, a title a result will not cut, a description of 120 to
 *      160 characters, the page's own canonical, no noindex, and a three step
 *      BreadcrumbList through /soccer ending at this page.
 *   7. No clock and a source line. The page's code reads no clock, draws no
 *      random number and fetches nothing, so the saved page cannot go stale on a
 *      schedule, and the saved page says where the data came from.
 *
 * NEGATIVE CONTROLS. SIM_WC2026_PAGE_CONTROL=<name> breaks one input in memory
 * for the check it targets, and the run is green only if THAT check went red and
 * every other check stayed green. Each control refuses to run if the thing it
 * changes is not there. SIM_WC2026_PAGE_CONTROL=all runs every control in turn.
 *
 * Run: node scripts/simWc2026ResultsPage.mjs        (after npm run build:seo)
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const SITE = 'https://douknowball.com';
const ROUTE = '/world-cup-2026-results';

/* control name -> the check it must turn red, and nothing else */
const CONTROLS = {
  noroute: 1, nositemap: 1,
  final: 2,
  grouporder: 3,
  dropmatch: 4, shootout: 4,
  award: 5,
  longtitle: 6, nocrumb: 6,
  clock: 7,
};
const CONTROL = process.env.SIM_WC2026_PAGE_CONTROL || '';

if (CONTROL === 'all') {
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, SIM_WC2026_PAGE_CONTROL: name }, encoding: 'utf8' });
    const last = (r.stdout || '').trim().split('\n').pop() || (r.stderr || '').trim().split('\n').pop() || '';
    const ok = r.status === 0;
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${name.padEnd(12)} ${last}`);
  }
  console.log('');
  if (bad) { console.error(`simWc2026ResultsPage controls: ${bad} of ${Object.keys(CONTROLS).length} did not behave.`); process.exit(1); }
  console.log(`simWc2026ResultsPage controls: green. All ${Object.keys(CONTROLS).length} controls turned their own check red and only that one.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`SIM_WC2026_PAGE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(2);
}
if (CONTROL) console.log(`NEGATIVE CONTROL ${CONTROL} is on: check ${CONTROLS[CONTROL]} is SUPPOSED to go red, and only that one.\n`);

/* ---- per check bookkeeping ---- */
const failedChecks = new Map();
let current = 0;
const fail = m => {
  failedChecks.set(current, (failedChecks.get(current) || 0) + 1);
  if (failedChecks.get(current) <= 6) console.error('  FAIL: ' + m);
};
const refuse = m => { console.error(`control ${CONTROL} cannot run: ${m}`); process.exit(2); };

/* ---- the results file, bundled from the source the page imports ---- */
const TMP = path.join(os.tmpdir(), `simWc2026ResultsPage-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `export * from '${ROOT.replaceAll('\\', '/')}/src/data/wc2026Results.ts';\n`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error' });
const data = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(TMP, { recursive: true, force: true });

/* copies, so a control edits these and never the module */
const groups = data.WC2026_GROUPS.map(g => ({ ...g, teams: [...g.teams] }));
const knockout = data.WC2026_KNOCKOUT.map(m => ({ ...m }));
const awards = JSON.parse(JSON.stringify(data.WC2026_AWARDS));

/* line endings normalised on every read: a Windows checkout can hand these files over with CRLF */
const readFile = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const read = rel => readFile(path.join(ROOT, rel));
const pageFile = route => path.join(ROOT, 'public', route.replace(/^\//, ''), 'index.html');

/* ---- helpers written here, not imported from the page ---- */
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = t => String(t)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
/** source code with its comments removed: block, JSX and line comments (a "//"
    right after a colon or a quote is a URL or a string, not a comment) */
const stripComments = src => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
/** The readable body of a saved page, one block per line, site chrome removed. */
function bodyLines(html) {
  const i = html.indexOf('<div id="dukb-snapshot">');
  if (i < 0) return [];
  return html.slice(i)
    .replace(/<div data-site-chrome>[\s\S]*?<\/div>/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^<(h[1-4]|p|li|a|tr)\b/.test(l));
}
const textOf = line => unesc(line.replace(/<[^>]+>/g, '')).trim();
const tagOf = line => (line.match(/^<([a-z0-9]+)/) || [])[1];
const hrefsIn = lines => new Set(lines.flatMap(l => [...l.matchAll(/href="([^"]+)"/g)].map(m => m[1])));
/** Everything between the h2 whose text is `heading` and the next h2. */
function sectionAfter(lines, heading) {
  const at = lines.findIndex(l => tagOf(l) === 'h2' && textOf(l) === heading);
  if (at < 0) return null;
  let end = lines.length;
  for (let j = at + 1; j < lines.length; j++) if (tagOf(lines[j]) === 'h2') { end = j; break; }
  return lines.slice(at + 1, end);
}
/** the table cells of a section, as text, in order: since Round 652 a saved table is one <tr> per line */
const cellsIn = sec => sec.flatMap(l => (tagOf(l) === 'tr' ? [...l.matchAll(/<(td|th)>([\s\S]*?)<\/\1>/g)].map(c => textOf(c[2])) : []));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = iso => { const [, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; };
const loser = m => (m.winner === m.team1 ? m.team2 : m.team1);
const goals = (m, t) => (t === m.team1 ? m.score1 : m.score2);
const kicks = m => { const [a, b] = m.penalties.split('-').map(Number); return m.winner === m.team1 ? [a, b] : [b, a]; };
const decided = m => (m.penalties
  ? `Level after extra time, ${m.winner} won ${kicks(m).join('-')} on penalties`
  : m.extraTime ? `${m.winner} won after extra time` : `${m.winner} won in normal time`);
const rowCells = m => [day(m.date), `${m.team1} v ${m.team2}`, `${m.score1}-${m.score2}`, decided(m)];
const MATCH_HEAD = ['Date', 'Match', 'Score', 'How it was decided'];
const ROUNDS = [['r32', 'Round of 32'], ['r16', 'Round of 16'], ['qf', 'Quarter-finals'], ['sf', 'Semi-finals'], ['tp', 'Third place']];
const inRound = r => knockout.filter(m => m.round === r).map((m, i) => ({ m, i }))
  .sort((a, b) => a.m.date.localeCompare(b.m.date) || a.i - b.i).map(x => x.m);

/* ---- the saved documents, read once; controls edit these copies only ---- */
let page = fs.existsSync(pageFile(ROUTE)) ? readFile(pageFile(ROUTE)) : '';
const mutatePage = (from, to, why) => {
  if (!page.includes(from)) refuse(`${why}: ${JSON.stringify(from.slice(0, 70))} is not in the saved page`);
  page = page.replace(from, to);
};
if (CONTROL === 'dropmatch') {
  const last = inRound('r32').slice(-1)[0];
  if (!last) refuse('there is no round of 32 row to drop');
  mutatePage('<tr>' + rowCells(last).map(c => `<td>${esc(c)}</td>`).join('') + '</tr>\n', '', 'dropmatch');
}
if (CONTROL === 'longtitle') {
  const t = (page.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1];
  if (!t) refuse('the saved page has no title');
  mutatePage(`<title>${t}</title>`, `<title>${t} and Every Group Standing Too</title>`, 'longtitle');
}
if (CONTROL === 'nocrumb') mutatePage('"@type":"BreadcrumbList"', '"@type":"ItemList"', 'nocrumb');
const lines = bodyLines(page);
const texts = lines.map(textOf);

const final = knockout.filter(m => m.round === 'f');
const theFinal = final[0];
const third = knockout.find(m => m.round === 'tp');
const year = theFinal ? theFinal.date.slice(0, 4) : '';

/* ======================================================================= */
current = 1;
console.log('1) a route, a sitemap entry, a type, a saved page, links in, and no link to a retired route');
{
  let app = read('src/App.tsx');
  let sitemap = read('public/sitemap.xml');
  const schema = stripComments(read('src/lib/pageSchema.ts'));
  const routeLine = /[^\n]*<Route\s+path="\/world-cup-2026-results"[^\n]*/;
  if (CONTROL === 'noroute') {
    if (!routeLine.test(app)) refuse('App.tsx has no route line for the page');
    app = app.replace(routeLine, '');
  }
  if (CONTROL === 'nositemap') {
    const loc = `<loc>${SITE}${ROUTE}</loc>`;
    if (!sitemap.includes(loc)) refuse(`public/sitemap.xml has no ${loc}`);
    sitemap = sitemap.replace(loc, `<loc>${SITE}/removed-by-control</loc>`);
  }
  app = stripComments(app);
  if (!/<Route\s+path="\/world-cup-2026-results"\s+element=\{\s*<WorldCup2026Results\s*\/>\s*\}/.test(app)) fail(`App.tsx has no <Route path="${ROUTE}"> drawing WorldCup2026Results`);
  if (!/const WorldCup2026Results = lazy\(\(\) => import\("\.\/pages\/WorldCup2026Results"\)\)/.test(app)) fail('App.tsx does not lazy load ./pages/WorldCup2026Results');
  if (!sitemap.includes(`<loc>${SITE}${ROUTE}</loc>`)) fail(`${ROUTE} is not in public/sitemap.xml`);
  if (!/'\/world-cup-2026-results':\s*'WebPage'/.test(schema)) fail(`${ROUTE} is not typed WebPage in src/lib/pageSchema.ts`);
  if (!page) fail(`there is no saved page at public${ROUTE}/index.html`);
  else if (!/id="dukb-snapshot"/.test(page)) fail('the saved page has no snapshot block, so a crawler gets the fallback');
  let linkedFrom = 0;
  for (const from of ['/soccer', '/records', '/world-cup-bracket']) {
    const f = pageFile(from);
    if (!fs.existsSync(f)) { fail(`no saved page for ${from}`); continue; }
    if (hrefsIn(bodyLines(readFile(f))).has(ROUTE)) linkedFrom += 1;
    else fail(`the body of ${from} does not link ${ROUTE} (the footer does not count)`);
  }
  const retired = new Set([...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{\s*<Navigate\b/g)].map(m => m[1]));
  const bad = [...hrefsIn(lines)].filter(h => retired.has(h));
  for (const h of bad) fail(`the page links ${h}, a retired route, so a crawler is walked into a redirect`);
  console.log(`   route, sitemap and type read with comments stripped; linked from ${linkedFrom} of 3 pages; ${retired.size} retired routes, ${bad.length} linked`);
}

/* ======================================================================= */
current = 2;
console.log('2) the final: the heading, the row, the opening line and the description are the file\'s final');
{
  if (CONTROL === 'final') {
    if (!theFinal) refuse('there is no final row to change');
    theFinal.score1 += 1;
    console.log(`   control: the final now reads ${theFinal.team1} ${theFinal.score1}-${theFinal.score2} ${theFinal.team2}`);
  }
  if (final.length !== 1) fail(`${final.length} final rows, expected exactly one`);
  if (theFinal) {
    const f = theFinal;
    if (f.winner !== f.team1 && f.winner !== f.team2) fail(`the final's winner ${f.winner} played in neither slot`);
    if (data.WC2026_CHAMPION !== f.winner) fail(`WC2026_CHAMPION is ${data.WC2026_CHAMPION}, the final's row says ${f.winner}`);
    if (data.WC2026_RUNNER_UP !== loser(f)) fail(`WC2026_RUNNER_UP is ${data.WC2026_RUNNER_UP}, the final's row says ${loser(f)}`);
    if (!third || data.WC2026_THIRD !== third.winner) fail(`WC2026_THIRD is ${data.WC2026_THIRD}, the third place row says ${third?.winner}`);
    const et = f.penalties ? `, ${f.winner} won ${kicks(f).join('-')} on penalties` : f.extraTime ? ' after extra time' : '';
    const heading = `The final: ${f.team1} ${f.score1}-${f.score2} ${f.team2}${et}`;
    const sec = sectionAfter(lines, heading);
    if (!sec) fail(`no h2 ${JSON.stringify(heading)} on the saved page`);
    else {
      const want = [...MATCH_HEAD, ...rowCells(f)];
      const got = cellsIn(sec);
      if (JSON.stringify(got) !== JSON.stringify(want)) fail(`the final's row reads ${JSON.stringify(got)}, the file gives ${JSON.stringify(want)}`);
    }
    const w = f.winner, l = loser(f);
    const short = `${w} beat ${l} ${goals(f, w)}-${goals(f, l)}${f.extraTime ? ' after extra time' : ''} in the final`;
    const opening = `${w} won the ${year} World Cup, beating ${l} ${goals(f, w)}-${goals(f, l)}${f.extraTime ? ' after extra time' : ''} in the final on ${day(f.date)}, ${year}.`
      + (third ? ` ${third.winner} beat ${loser(third)} ${goals(third, third.winner)}-${goals(third, loser(third))} for third place.` : '');
    if (!texts.includes(opening)) fail(`the page does not open with ${JSON.stringify(opening)}`);
    const desc = unesc((page.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
    if (!desc.includes(short)) fail(`the description ${JSON.stringify(desc)} does not state ${JSON.stringify(short)}`);
    console.log(`   ${heading}`);
  }
}

/* ======================================================================= */
current = 3;
console.log('3) the group order: twelve groups in the file\'s order, four teams each, positions and how far each got');
{
  if (CONTROL === 'grouporder') {
    const g = groups[0];
    if (!g || g.teams.length < 2) refuse('the first group has no two teams to swap');
    [g.teams[0], g.teams[1]] = [g.teams[1], g.teams[0]];
    console.log(`   control: Group ${g.letter} now lists ${g.teams[0]} first`);
  }
  const all = groups.flatMap(g => g.teams);
  if (groups.length !== 12) fail(`${groups.length} groups in the file, expected 12`);
  if (all.length !== 48 || new Set(all).size !== 48) fail(`${all.length} team slots and ${new Set(all).size} distinct teams, expected 48 of each`);
  const thirds = groups.filter(g => g.thirdQualified).length;
  const through = new Set(groups.flatMap(g => [g.teams[0], g.teams[1], ...(g.thirdQualified ? [g.teams[2]] : [])]));
  const r32 = new Set(knockout.filter(m => m.round === 'r32').flatMap(m => [m.team1, m.team2]));
  const missing = [...through].filter(t => !r32.has(t));
  const extra = [...r32].filter(t => !through.has(t));
  if (missing.length || extra.length) fail(`the round of 32 is not the top twos plus the qualified thirds (${missing.length} missing, ${extra.length} extra${extra[0] ? `: ${extra[0]}` : missing[0] ? `: ${missing[0]}` : ''})`);

  const final1 = knockout.find(m => m.round === 'f');
  const tp = knockout.find(m => m.round === 'tp');
  const OUT = { r32: 'Out in the round of 32', r16: 'Out in the round of 16', qf: 'Out in the quarter-finals' };
  const finish = t => {
    if (final1 && t === final1.winner) return 'Champions';
    if (final1 && t === loser(final1)) return 'Runners-up';
    if (tp && t === tp.winner) return 'Third place';
    if (tp && t === loser(tp)) return 'Fourth place';
    const lost = knockout.find(m => (m.team1 === t || m.team2 === t) && m.winner !== t && OUT[m.round]);
    return lost ? OUT[lost.round] : 'Out in the group stage';
  };

  const sec = sectionAfter(lines, 'Final group standings');
  if (!sec) fail('no h2 "Final group standings" on the saved page');
  else {
    const intro = `The top two in each group went through to the round of 32, along with the ${thirds} best third placed teams.`;
    if (!sec.some(l => textOf(l).includes(intro))) fail(`the standings do not say ${JSON.stringify(intro)}`);
    const table = sec.map(textOf).find(t => /\btables?\b/i.test(t));
    if (table) fail(`the standings say "table" (${JSON.stringify(table.slice(0, 80))}), and the file holds positions, not a points table`);
    const h3s = sec.filter(l => tagOf(l) === 'h3').map(textOf);
    const wantH3 = groups.map(g => `Group ${g.letter}`);
    if (JSON.stringify(h3s) !== JSON.stringify(wantH3)) fail(`the group h3s read ${JSON.stringify(h3s)}, the file gives ${JSON.stringify(wantH3)}`);
    let ok = 0;
    for (const g of groups) {
      const at = sec.findIndex(l => tagOf(l) === 'h3' && textOf(l) === `Group ${g.letter}`);
      if (at < 0) continue;
      let end = sec.length;
      for (let j = at + 1; j < sec.length; j++) if (tagOf(sec[j]) === 'h3') { end = j; break; }
      const got = cellsIn(sec.slice(at + 1, end));
      const want = ['Position', 'Team', 'How far they got', ...g.teams.flatMap((t, i) => [['1st', '2nd', '3rd', '4th'][i], t, finish(t)])];
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        const i = want.findIndex((w, k) => got[k] !== w);
        fail(`Group ${g.letter}: cell ${i} is ${JSON.stringify(got[i] ?? '(nothing)')}, the file gives ${JSON.stringify(want[i])}`);
      } else ok += 1;
    }
    console.log(`   ${ok} of ${groups.length} groups match the file cell for cell; ${thirds} qualified thirds; ${r32.size} teams in the round of 32`);
  }
}

/* ======================================================================= */
current = 4;
console.log('4) the match list: every round, every row, earliest first, cell for cell');
{
  if (CONTROL === 'shootout') {
    const m = knockout.find(x => x.penalties);
    if (!m) refuse('no match went to penalties, so there is no shootout to turn round');
    m.penalties = m.penalties.split('-').reverse().join('-');
    console.log(`   control: ${m.team1} v ${m.team2} now has the shootout ${m.penalties} and still says ${m.winner} won`);
  }
  if (knockout.length !== 32) fail(`${knockout.length} knockout rows, expected 32`);
  for (const m of knockout) {
    const tag = `${m.round} ${m.team1} v ${m.team2}`;
    if (m.winner !== m.team1 && m.winner !== m.team2) { fail(`${tag}: the winner ${m.winner} played in neither slot`); continue; }
    if (m.penalties) {
      if (!/^\d+-\d+$/.test(m.penalties)) { fail(`${tag}: the shootout ${m.penalties} is not a score`); continue; }
      if (!m.extraTime) fail(`${tag}: a shootout with no extra time`);
      if (m.score1 !== m.score2) fail(`${tag}: a shootout after a ${m.score1}-${m.score2}`);
      const [w, l] = kicks(m);
      if (w <= l) fail(`${tag}: ${m.winner} is the winner and scored ${w} kicks to ${l}`);
    } else if (goals(m, m.winner) <= goals(m, loser(m))) fail(`${tag}: ${m.winner} is the winner with ${goals(m, m.winner)} goals to ${goals(m, loser(m))}`);
  }
  let rows = 0;
  for (const [round, heading] of ROUNDS) {
    const sec = sectionAfter(lines, heading);
    if (!sec) { fail(`no h2 ${JSON.stringify(heading)} on the saved page`); continue; }
    const list = inRound(round);
    if (!list.length) { fail(`the file has no ${round} rows`); continue; }
    const want = [...MATCH_HEAD, ...list.flatMap(rowCells)];
    const got = cellsIn(sec);
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      const i = want.findIndex((w, k) => got[k] !== w);
      fail(`${heading}: cell ${i < 0 ? want.length : i} is ${JSON.stringify(got[i < 0 ? want.length : i] ?? '(nothing)')}, the file gives ${JSON.stringify(want[i] ?? '(nothing)')} (${got.length} cells, ${want.length} wanted)`);
    } else rows += list.length;
  }
  console.log(`   ${rows} of ${knockout.length - 1} matches below the final match the file cell for cell, earliest first`);
}

/* ======================================================================= */
current = 5;
console.log('5) the awards, cell for cell');
{
  if (CONTROL === 'award') {
    if (!awards.goldenBall?.player) refuse('there is no Golden Ball winner to change');
    awards.goldenBall.player = 'Somebody Else';
  }
  const NAMES = [['goldenBall', 'Golden Ball'], ['goldenBoot', 'Golden Boot'], ['goldenGlove', 'Golden Glove'], ['youngPlayer', 'Best Young Player']];
  const sec = sectionAfter(lines, `${year} World Cup awards`);
  if (!sec) fail(`no h2 "${year} World Cup awards" on the saved page`);
  else {
    const want = ['Award', 'Player', 'Nation'];
    for (const [key, name] of NAMES) {
      const a = awards[key];
      if (!a) { fail(`WC2026_AWARDS has no ${key}`); continue; }
      if ('goals' in a && !(Number.isInteger(a.goals) && a.goals > 0)) fail(`the Golden Boot's goals are ${a.goals}`);
      want.push(name, 'goals' in a ? `${a.player}, ${a.goals} goals` : a.player, a.nation);
    }
    const got = cellsIn(sec);
    if (JSON.stringify(got) !== JSON.stringify(want)) fail(`the awards read ${JSON.stringify(got)}, the file gives ${JSON.stringify(want)}`);
    console.log(`   ${NAMES.length} awards checked`);
  }
}

/* ======================================================================= */
current = 6;
console.log('6) the head: one h1, title, description, canonical, no noindex, breadcrumb');
{
  const h1s = lines.filter(l => tagOf(l) === 'h1').map(textOf);
  const h1 = `${year} World Cup results`;
  if (h1s.length !== 1 || h1s[0] !== h1) fail(`the h1s are ${JSON.stringify(h1s)}, expected exactly ${JSON.stringify(h1)}`);
  const title = unesc((page.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '');
  if (!title) fail('no title');
  else {
    if (title.length > 60) fail(`the title is ${title.length} characters, so a result cuts it: ${title}`);
    if (!title.startsWith(`${year} World Cup Results`)) fail(`the title does not lead with the search phrase: ${title}`);
  }
  const desc = unesc((page.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  if (desc.length < 120 || desc.length > 160) fail(`the description is ${desc.length} characters, outside 120 to 160`);
  const canon = [...page.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m => m[1]);
  if (canon.length !== 1 || canon[0] !== `${SITE}${ROUTE}`) fail(`canonical ${JSON.stringify(canon)}, expected exactly ${SITE}${ROUTE}`);
  if (/<meta[^>]+name="robots"[^>]+noindex/i.test(page)) fail('the saved page carries a noindex');
  let crumbs = null;
  for (const m of page.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); for (const o of Array.isArray(j) ? j : [j]) if (o['@type'] === 'BreadcrumbList') crumbs = o; } catch { /* simSchema owns parse failures */ }
  }
  if (!crumbs) fail('no BreadcrumbList in the head');
  else {
    const items = crumbs.itemListElement || [];
    const want = [SITE, `${SITE}/soccer`, `${SITE}${ROUTE}`];
    if (JSON.stringify(items.map(i => i.item)) !== JSON.stringify(want)) fail(`the breadcrumb runs ${JSON.stringify(items.map(i => i.item))}, expected ${JSON.stringify(want)}`);
    else if (items[2].name !== h1) fail(`the breadcrumb names this page ${JSON.stringify(items[2].name)}`);
  }
  console.log(`   title ${title.length} characters, description ${desc.length}, ${canon.length} canonical, breadcrumb ${crumbs ? crumbs.itemListElement.length : 0} steps`);
}

/* ======================================================================= */
current = 7;
console.log('7) the page reads no clock, draws nothing random, fetches nothing, and says where its data came from');
{
  let src = read('src/pages/WorldCup2026Results.tsx');
  if (CONTROL === 'clock') {
    const anchor = 'const WorldCup2026Results = () => {';
    if (!src.includes(anchor)) refuse('the page has no component line to put a clock read after');
    src = src.replace(anchor, `${anchor}\n  const stamp = Date.now();`);
  }
  const code = stripComments(src);
  for (const [re, what] of [[/\bDate\.now\s*\(/, 'Date.now()'], [/\bnew Date\s*\(/, 'new Date()'], [/\bMath\.random\s*\(/, 'Math.random()'], [/\bfetch\s*\(/, 'fetch()'], [/supabase/i, 'the database client']]) {
    if (re.test(code)) fail(`the page's code uses ${what}, so the saved page can go stale or differ between builds`);
  }
  const sec = sectionAfter(lines, 'Where this comes from');
  if (!sec) fail('no h2 "Where this comes from" on the saved page');
  else {
    const t = sec.map(textOf).join(' ');
    if (!t.includes('two independent sources')) fail('the source line does not state the two source rule');
    if (!t.includes(`all ${knockout.length} knockout scores`)) fail(`the source line does not count the ${knockout.length} knockout scores it vouches for`);
  }
  console.log('   code read with comments stripped; source line read from the saved page');
}

/* ======================================================================= */
console.log('');
const red = [...failedChecks.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (red.length === 1 && red[0] === want) {
    console.log(`simWc2026ResultsPage control ${CONTROL}: green. Check ${want} went red (${failedChecks.get(want)} finding${failedChecks.get(want) === 1 ? '' : 's'}) and no other check did.`);
    process.exit(0);
  }
  console.error(`simWc2026ResultsPage control ${CONTROL}: RED. Expected only check ${want} to fail, got ${red.length ? red.join(', ') : 'none'}.`);
  process.exit(1);
}
if (red.length) {
  const n = [...failedChecks.values()].reduce((a, b) => a + b, 0);
  console.error(`simWc2026ResultsPage: ${n} failure${n === 1 ? '' : 's'} in check${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  process.exit(1);
}
console.log(`simWc2026ResultsPage: green. The saved page carries the final, ${groups.length} groups and ${knockout.length} matches exactly as src/data/wc2026Results.ts has them.`);

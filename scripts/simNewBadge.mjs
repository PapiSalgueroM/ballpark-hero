/* The NEW badge means new.

   Round 447. His words, 2026-09-04: "a problem i have with ur labiling is that
   u call like everything new". Measured: 111 of 131 registry entries carried
   isNew: true, on tiles that had shipped as far back as February. A badge on
   85 percent of the tiles points at nothing.

   The fix is a change of shape, not of list. "New" was a boolean someone had
   to remember to turn off, and nobody ever did. It is now DERIVED: the
   registry records the day each game shipped (addedOn), and the badge is
   computed from that day against a pinned today, for a fixed window. The day
   itself is not typed by hand either: it is the day the game's page file first
   landed in git, and this harness asks git.

   WHAT THIS HOLDS:
     1) No live registry entry carries isNew any more. The literal is gone
        from the type and from every entry; a commented out retired entry may
        still say it, and is ignored.
     2) Every live entry records addedOn, and it agrees with git's first add
        date of the page file the route renders. Derived, never asserted: a
        typed date that drifts from the truth fails here by route.
     3) The window is at most 14 days (src/lib/newBadge.ts), which is what was
        measured to keep the badge rare.
     4) The badge rule applied across the last 60 days never badges more than
        half of the live tiles on any single day. This is a ratchet against
        the defect, not a design target: the defect was 85 percent, and the
        healthiest history measured peaks at 20 percent (2026-07-14, a July
        launch burst) and 12 percent (2026-08-11, eleven games in a day).
        Half sits far from both, so a busy launch fortnight cannot trip it
        and a return to the flag cannot pass it.
     5) The home page renders the badge from the derived rule, not a flag.

   Negative controls:
     NEW_BADGE_CONTROL=forever   every live entry gets isNew: true again and
       loses addedOn, the exact shape he complained about. Sections 1, 2 and
       5 must go red.
     NEW_BADGE_CONTROL=wrongdate one entry's addedOn is moved a year forward.
       Section 2 must name that route.
   Each refuses to run if its rewrite changed nothing.

   Run: node scripts/simNewBadge.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NEW_BADGE_CONTROL || '';
if (CONTROL && !['forever', 'wrongdate'].includes(CONTROL)) {
  console.error(`NEW_BADGE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

let registry = read('src/data/gameRegistry.ts');
let index = read('src/pages/Index.tsx');
const badge = read('src/lib/newBadge.ts');
const app = read('src/App.tsx');

/* Live entries only: a line that begins with // is a retired entry kept for
   the record, and it is allowed to say whatever it said when it was retired. */
const liveLines = registry.split('\n').filter(l => /^\s*\{ path: '/.test(l));
const entryOf = line => {
  const route = /path: '([^']+)'/.exec(line)?.[1];
  const addedOn = /addedOn: '([^']+)'/.exec(line)?.[1];
  const hasIsNew = /\bisNew:/.test(line);
  return { route, addedOn, hasIsNew, line };
};

if (CONTROL === 'forever') {
  let changed = 0;
  registry = registry.split('\n').map(l => {
    if (!/^\s*\{ path: '/.test(l) || !/addedOn: '[^']+'/.test(l)) return l;
    changed += 1;
    return l.replace(/addedOn: '[^']+'/, 'isNew: true');
  }).join('\n');
  index = index.replace(/isNewGame\(/g, 'Boolean(');
  if (changed === 0) { console.error('control cannot run: no live entry carries addedOn to rewrite'); process.exit(1); }
  console.log(`NEGATIVE CONTROL ON: ${changed} live entries wear isNew: true again and lose their ship date`);
}
if (CONTROL === 'wrongdate') {
  const m = /(\{ path: '\/free-kick'[^\n]*addedOn: ')(\d{4})(-\d\d-\d\d')/.exec(registry);
  if (!m) { console.error('control cannot run: /free-kick has no addedOn to move'); process.exit(1); }
  registry = registry.replace(m[0], `${m[1]}${Number(m[2]) + 1}${m[3]}`);
  console.log('NEGATIVE CONTROL ON: /free-kick claims to have shipped a year later than it did');
}

const entries = registry.split('\n').filter(l => /^\s*\{ path: '/.test(l)).map(entryOf);
console.log(`live registry entries: ${entries.length} (of ${liveLines.length} before any control)`);

console.log('1) no live entry carries the isNew flag');
{
  const flagged = entries.filter(e => e.hasIsNew);
  if (flagged.length) fail(`${flagged.length} live entries still carry isNew (${flagged.slice(0, 4).map(e => e.route).join(', ')}${flagged.length > 4 ? ', ...' : ''}), the boolean nobody turns off`);
  if (/\bisNew\?:/.test(registry)) fail('GameDef still declares isNew, so the flag can come back');
  if (!flagged.length) console.log('   the flag is gone from every live entry');
}

console.log('2) every live entry records addedOn, and git agrees with the date');
{
  const lazyOf = {};
  for (const m of app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/pages\/([^"]+)"\)\)/g)) lazyOf[m[1]] = m[2];
  const elementOf = {};
  for (const m of app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)/g)) elementOf[m[1]] = m[2];

  const gitFirstAdd = page => {
    for (const cand of [`src/pages/${page}.tsx`, `src/pages/${page}/index.tsx`]) {
      try {
        const out = execSync(`git log --diff-filter=A --format=%as --follow -- "${cand}"`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const d = out.trim().split('\n').filter(Boolean).pop();
        if (d) return d;
      } catch { /* try the next shape */ }
    }
    return '';
  };

  let missing = 0, unmapped = 0, disagree = [];
  for (const e of entries) {
    if (!e.addedOn) { missing += 1; continue; }
    const page = lazyOf[elementOf[e.route]];
    if (!page) { unmapped += 1; continue; }
    const truth = gitFirstAdd(page);
    if (truth && truth !== e.addedOn) disagree.push(`${e.route} says ${e.addedOn}, git says ${truth}`);
  }
  if (missing) fail(`${missing} live entries record no addedOn, so they can never be new and never stop being new by accident either; the fact must be recorded for every game`);
  if (unmapped) console.log(`   ${unmapped} live entries render through a shape this check does not map, so their date was recorded but not compared`);
  if (disagree.length) fail(`${disagree.length} typed date(s) disagree with git: ${disagree.slice(0, 3).join('; ')}`);
  if (!missing && !disagree.length) console.log(`   ${entries.length - unmapped} dates checked against git, all agree`);
}

console.log('3) the window is short enough to mean something');
{
  const m = /export const NEW_BADGE_DAYS = (\d+)/.exec(badge);
  if (!m) fail('src/lib/newBadge.ts has no readable NEW_BADGE_DAYS');
  else if (Number(m[1]) > 14) fail(`NEW_BADGE_DAYS is ${m[1]}; anything past 14 was measured to badge a fifth of the site at once`);
  else console.log(`   NEW_BADGE_DAYS = ${m[1]}`);
}

console.log('4) across the last 60 days the badge never covers more than half of the tiles');
{
  const days = Number(/export const NEW_BADGE_DAYS = (\d+)/.exec(badge)?.[1] ?? 14);
  const dayNum = s => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86_400_000);
  const dated = entries.filter(e => e.addedOn).map(e => dayNum(e.addedOn));
  const newest = dated.length ? Math.max(...dated) : dayNum('2026-09-04');
  let worst = 0, worstDay = '';
  for (let back = 0; back < 60; back += 1) {
    const t = newest - back;
    const n = dated.filter(d => t - d >= 0 && t - d < days).length;
    if (n > worst) { worst = n; worstDay = new Date(t * 86_400_000).toISOString().slice(0, 10); }
  }
  const share = entries.length ? worst / entries.length : 0;
  console.log(`   worst day in the window: ${worst} of ${entries.length} tiles badged (${(100 * share).toFixed(0)}%) on ${worstDay || 'n/a'}`);
  if (share > 0.5) fail(`the badge covered ${(100 * share).toFixed(0)}% of the tiles on ${worstDay}, which is wallpaper again`);
  if (CONTROL === 'forever') {
    /* With the flag restored and the dates gone, the rule has nothing to
       derive from and the count above is vacuous, so the control's real
       measurement is the flag count. */
    const flagged = entries.filter(e => e.hasIsNew).length;
    if (flagged / entries.length > 0.5) fail(`${flagged} of ${entries.length} tiles carry the flag, ${(100 * flagged / entries.length).toFixed(0)}%`);
  }
}

console.log('5) the home page derives the badge rather than reading a flag');
{
  if (!/isNewGame\(/.test(index)) fail('Index.tsx does not call isNewGame, so the badge is not derived from the ship date');
  if (/game\.isNew\b/.test(index)) fail('Index.tsx still reads game.isNew');
  if (/isNewGame\(/.test(index) && !/game\.isNew\b/.test(index)) console.log('   Index.tsx renders the badge from isNewGame');
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimNewBadge: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimNewBadge: green. New means shipped in the last two weeks, and the date is the one git remembers.');

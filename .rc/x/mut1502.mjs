/* Review of Round 1502 (runs lens): one small plausible mutation of the binding, applied to a COPY of the tree
   (a git worktree on the runner), never to the branch. Usage: node mut1502.mjs <name> <dir>. Each `from` must
   stand exactly once or it exits 2 (the mutation did not apply, so nothing it proves). --list prints the names. */
import fs from 'node:fs';
import path from 'node:path';

const CM = 'src/lib/clubManager.ts';
const MUT = {
  /* correction 8's defect, put into the place table instead of the count: a matchday counts once the week
     is past the entry BEFORE its European midweek (the league round), one entry early. */
  mdearly: [CM, '      put(night, i < 0 ? prev.at : i, i < 0 ? prev.round : roundOf(i), i >= 0);',
    '      put(night, i < 0 ? prev.at : i - 1, i < 0 ? prev.round : roundOf(i), i >= 0);'],
  /* a league phase mark night counts once its league round is played, before the midweek entries after it. */
  markearly: [CM, '      put(night, r < rounds ? blockEnd(r) : cal.length - 1, r, false);\n      return;',
    '      put(night, r < rounds ? leagueAt[r] : cal.length - 1, r, false);\n      return;'],
  /* the stand in for my club in an era's 32 is the WEAKEST era club outside it, not the strongest. */
  standweak: [CM, '    .sort((a, b) => b.xi - a.xi || plain(a.c, b.c))[0]?.c;',
    '    .sort((a, b) => a.xi - b.xi || plain(a.c, b.c))[0]?.c;'],
  /* the holder is never put first in pot one (the draw forgets the holder). */
  noholdertop: [CM, '  const top = holder && field.includes(holder) ? holder : undefined;',
    '  const top: string | undefined = undefined;'],
  /* a mid season move to an entrant of the watched competition carries the slice anyway. */
  carryentrant: [CM, '      if (slice.s !== joined.season || names.some(c => slice.clubs.includes(c))) return;',
    '      if (slice.s !== joined.season) return;'],
  /* the evaluation memo forgets the night count in its key (first evaluation of a slice is served forever). */
  memokey: [CM, "  const key = `${state.eraId ?? ''}|${k}`;", "  const key = `${state.eraId ?? ''}`;"],
  /* the watched field skips customExitUclField on a summer move away from a created club (advice 24). */
  nocustomexit: [CM, '    const tables = moving && watchTables ? watchTables.map(t => ({ ...t, clubs: customExitUclField(career, t.clubs) })) : watchTables;',
    '    const tables = watchTables;'],
};

const [name, dir] = process.argv.slice(2);
if (name === '--list') { console.log(Object.keys(MUT).join(' ')); process.exit(0); }
if (!MUT[name] || !dir) { console.log(`mut1502: unknown mutation ${name} or no dir`); process.exit(2); }
const [file, from, to] = MUT[name];
const p = path.join(dir, file);
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
const text = crlf ? raw.split('\r\n').join('\n') : raw;
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`mut1502: ${name}: the line stands ${n} times in ${file}, must be once: NOT APPLIED`); process.exit(2); }
const out = text.replace(from, to);
fs.writeFileSync(p, crlf ? out.split('\n').join('\r\n') : out);
console.log(`mut1502: ${name} APPLIED to ${p}`);

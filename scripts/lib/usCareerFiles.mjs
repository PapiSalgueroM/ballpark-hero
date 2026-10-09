/* Round 900: where the US career boards live, for every harness that reads
 * them by path.
 *
 * Before Round 900 there were four boards, one file per sport, and a dozen
 * harnesses each carried their own list of those four paths. The four files
 * are now thin wrappers around one board plus one binding per sport:
 *
 *   src/components/us-career/UsCareerBoard.tsx      the board, imports no sport
 *   src/lib/<slug>CareerSport.ts                    the sport's words and engine
 *   src/components/<slug>-my-career/<X>MyCareerBoard.tsx   the wrapper
 *
 * A check that used to hold in four files has to say which of the three
 * places it now holds in, and it must still cover all four sports. This file
 * is the one list, and `wrapperProblems` is the link that makes "the shared
 * board does X" mean "all four careers do X": a wrapper that stops handing
 * the shared board its own binding is named here, by every harness that
 * leans on that link.
 */
import fs from 'node:fs';
import path from 'node:path';

export const US_CAREER_BOARD = 'src/components/us-career/UsCareerBoard.tsx';
export const US_CAREER_DESCRIPTOR = 'src/lib/usCareerSport.ts';

const sport = (slug, pascal, upper) => ({
  slug,
  pascal,
  upper,
  route: `/${slug}-my-career`,
  wrapper: `src/components/${slug}-my-career/${pascal}MyCareerBoard.tsx`,
  binding: `src/lib/${slug}CareerSport.ts`,
  engine: `src/lib/${slug}MyCareer.ts`,
  constName: `${upper}_CAREER_SPORT`,
});

export const US_CAREER_SPORTS = [
  sport('nfl', 'Nfl', 'NFL'),
  sport('nba', 'Nba', 'NBA'),
  sport('mlb', 'Mlb', 'MLB'),
  sport('nhl', 'Nhl', 'NHL'),
];

export const usCareerSport = slug => {
  const s = US_CAREER_SPORTS.find(x => x.slug === String(slug).toLowerCase());
  if (!s) throw new Error(`usCareerFiles: no US career called ${slug}`);
  return s;
};

/** Source with line endings normalised, so an anchor reads the same on a
 *  CRLF checkout as on an LF one. */
export const readUsSource = (root, rel) =>
  fs.readFileSync(path.join(root, rel), 'utf-8').replace(/\r\n/g, '\n');

/** The code of a file without its comments. A guard that reads source must
 *  read the code: the prose explaining a rule is the one place the string a
 *  guard looks for is certain to appear. Strings are left alone, so a `//`
 *  inside a URL literal would be eaten; none of these files has one. */
export const stripComments = src =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

/** Why a sport's wrapper does NOT put that sport on the shared board, or an
 *  empty list when it does. */
export function wrapperProblems(root, s) {
  const out = [];
  const code = stripComments(readUsSource(root, s.wrapper));
  if (!/import UsCareerBoard from '@\/components\/us-career\/UsCareerBoard'/.test(code)) {
    out.push(`${s.wrapper}: does not import the shared board`);
  }
  if (!code.includes(`import { ${s.constName} } from '@/lib/${s.slug}CareerSport'`)) {
    out.push(`${s.wrapper}: does not import its own binding`);
  }
  if (!code.includes(`<UsCareerBoard sport={${s.constName}} />`)) {
    out.push(`${s.wrapper}: does not render the shared board with its own binding`);
  }
  for (const other of US_CAREER_SPORTS) {
    if (other.slug === s.slug) continue;
    if (new RegExp(`@/lib/${other.slug}[A-Z]`).test(code)) {
      out.push(`${s.wrapper}: imports ${other.upper} code, so this route would load another sport`);
    }
  }
  return out;
}

/** Every reason the four careers are not all on the one board. */
export const allWrapperProblems = root => US_CAREER_SPORTS.flatMap(s => wrapperProblems(root, s));

/* The weight rule: the shared board (every file in its folder) and the
 * descriptor import no sport, and a binding imports only its own sport, so a
 * route never loads another sport's engine through them. Only DIRECT imports
 * are read. What those shared modules pull in further down is not fenced
 * here: the coach career already reaches the NFL engine and the NBA, MLB and
 * NHL conquest data through src/lib/usCareerToCoach.ts, which was so before
 * Round 900 and is written up as a defect rather than hidden by this fence. */
export const US_CAREER_SHARED_DIR = 'src/components/us-career';
/* Round 1048: the Season Center's entry, host and lazy viewer live one folder
 * down and are shared by every sport that binds a Season Center, so they may
 * import no sport either (the viewer reaches a sport's numbers only through
 * the descriptor's own loader). */
export const US_CAREER_SEASON_DIR = 'src/components/us-career/season';

/** Every module a file imports for real: static, re-exported and dynamic.
 *  `import type` is left out, because it is erased and loads nothing. */
export function importsOf(code) {
  const out = [];
  const stat = /(?:^|[\n;])\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
  for (const m of code.matchAll(stat)) if (!m[1]) out.push(m[2]);
  for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
  return out;
}

/** The US career sport a module path belongs to, by its name, or null: a
 *  segment that starts with the slug (nflMyCareer, nfl-my-career) or ends
 *  with it (conquestDataNba). */
export function sportOfModule(spec) {
  for (const seg of spec.split('/').map(x => x.replace(/\.[a-z]+$/, ''))) {
    for (const s of US_CAREER_SPORTS) {
      if (new RegExp(`^${s.slug}(?![a-z])`).test(seg) || seg.endsWith(s.pascal)) return s.slug;
    }
  }
  return null;
}

/** Why one file breaks the weight rule. `own` is the binding's sport, or null
 *  for a shared file, which may import no sport at all. */
export function weightProblemsIn(file, code, own) {
  return importsOf(stripComments(code)).flatMap(spec => {
    const sp = sportOfModule(spec);
    if (!sp || sp === own) return [];
    const who = own ? `the ${own.toUpperCase()} binding` : 'a file all four routes load';
    return [`${file}: imports ${spec}, ${sp.toUpperCase()} code in ${who}`];
  });
}

/** Every file the weight rule covers, with the sport it may import (null = none). */
export function weightFiles(root) {
  const filesIn = dir => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)) : [])
    .filter(f => /\.(tsx?|jsx?)$/.test(f))
    .map(f => `${dir}/${f}`);
  const shared = [...filesIn(US_CAREER_SHARED_DIR), ...filesIn(US_CAREER_SEASON_DIR)];
  return [
    ...[...shared, US_CAREER_DESCRIPTOR].map(file => ({ file, own: null })),
    ...US_CAREER_SPORTS.map(s => ({ file: s.binding, own: s.slug })),
  ];
}

/** Every reason a US career route would load another sport through the board. */
export const weightProblems = root =>
  weightFiles(root).flatMap(({ file, own }) => weightProblemsIn(file, readUsSource(root, file), own));

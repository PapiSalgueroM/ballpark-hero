/**
 * Round 541: a component that returns early must not reach for a binding that
 * has not run yet.
 *
 * WHY THIS EXISTS. A player reported on 2026-09-11 that Club Manager crashed
 * on "See Season Review" and the save could not progress. The cause was one
 * identifier. src/pages/ClubManager.tsx is a single component function with a
 * dozen early-return blocks. The SEASON END block read `c` for a currency
 * symbol, and the only binding of `c` it could resolve to sat at function body
 * level BELOW that return, so `c` was in the temporal dead zone and evaluating
 * it threw "ReferenceError: Cannot access 'c' before initialization". The save
 * was not lost, but every route forward out of a finished season landed on
 * that screen, so the career was unreachable.
 *
 * IT WAS THE SECOND TIME IN THREE DAYS. Round 514 fixed the identical trap for
 * the `money` identifier in the same file, and its own fix moved the trap onto
 * `c` at one call site it did not re-check. That is the argument for a rule
 * rather than another careful read: a person fixing an instance of this cannot
 * see the instance they are creating.
 *
 * WHY NO EXISTING GATE CATCHES IT. TypeScript has exactly this check (TS2448)
 * and it does not fire, because the use sits inside an arrow function passed
 * to `.map()` and the compiler cannot prove that callback runs before the
 * declaration. `tsc --noEmit -p tsconfig.app.json` is at zero on the broken
 * tree. The build is green too, and so is every sim harness, because they call
 * the season close as a pure function and never render it. The browser walk
 * that does render it never signs a player, and the crashing block is behind
 * `signings.length > 0`. Four gates, all green, on code that threw.
 *
 * WHAT THIS HOLDS. For every function in the scanned files, using the
 * TypeScript checker's own symbol resolution so that shadowing is handled
 * properly rather than by matching names:
 *
 *   A reference to a block-scoped binding (const/let) declared at that
 *   function's own statement level is a failure when the reference sits
 *   textually ABOVE the declaration and inside a block that can return before
 *   reaching it.
 *
 * WHAT IT DELIBERATELY ALLOWS. A reference inside a JSX event handler
 * attribute (onClick and friends) is deferred: it runs on a tap, long after
 * the declaration has executed, so it is not a hazard and flagging it would
 * make the harness noisy enough to be switched off. Everything else inside an
 * early-return block is evaluated during that render, `.map()` callbacks very
 * much included, which is exactly what the real bug was.
 *
 * RATCHET, NOT A CLEAN SHEET. Anything already in BASELINE is recorded and
 * allowed; anything new fails. A file that gets fixed must leave the list, and
 * the harness fails if a baseline entry no longer reproduces, so the list
 * cannot rot into a permanent excuse.
 *
 * NEGATIVE CONTROL: EARLY_RETURN_CONTROL=tdz injects the exact shape of the
 * real bug into a copy of a scanned file held in memory (it re-points an
 * early-return block at a function-body binding declared below it) and the
 * check must go red. It asserts the injection actually changed the source
 * first and refuses to run otherwise, per the house rule that a control which
 * changes nothing makes the harness green for the wrong reason.
 *
 * Run: node scripts/simEarlyReturnScope.mjs      (no database, no build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.EARLY_RETURN_CONTROL || '';
const KNOWN_CONTROLS = ['tdz'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`EARLY_RETURN_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* Known and accepted. Empty on purpose: the one real offender was fixed in the
 * round that wrote this file. An entry is "file::function::identifier". */
const BASELINE = [];

/* ------------------------------------------------------------------ */
/* The files to scan                                                  */
/* ------------------------------------------------------------------ */
const SCAN_DIRS = ['src/pages', 'src/components', 'src/hooks'];
const files = [];
const walk = dir => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(rel);
  }
};
for (const d of SCAN_DIRS) walk(d);
if (files.length < 100) {
  console.error(`only ${files.length} files found to scan, which is too few to be the real tree`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Control: inject the real bug's shape                               */
/* ------------------------------------------------------------------ */
const overrides = new Map();
if (CONTROL === 'tdz') {
  const target = 'src/pages/ClubManager.tsx';
  const src = fs.readFileSync(path.join(ROOT, target), 'utf8');
  /* The season end block declares its own `c` since Round 541. Take that line
   * away and the block falls through to the function body binding below it,
   * which is precisely the shape that shipped and crashed. */
  const needle = `    const c = g.career;\n    const trophyLine =`;
  if (!src.includes(needle)) {
    console.error('CONTROL tdz cannot find the season end career binding to remove, so it would change nothing');
    process.exit(1);
  }
  const mutated = src.replace(needle, `    const trophyLine =`);
  if (mutated === src) { console.error('CONTROL tdz changed nothing'); process.exit(1); }
  overrides.set(target, mutated);
  console.log('   NEGATIVE CONTROL ON: the season end block loses its own career binding, the check must go red');
}

/* ------------------------------------------------------------------ */
/* Program                                                            */
/* ------------------------------------------------------------------ */
const cfgPath = path.join(ROOT, 'tsconfig.app.json');
const cfgRaw = ts.readConfigFile(cfgPath, p => fs.readFileSync(p, 'utf8'));
const cfg = ts.parseJsonConfigFileContent(cfgRaw.config, ts.sys, ROOT);

const host = ts.createCompilerHost(cfg.options, true);
const origGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, langVersion, onError, shouldCreate) => {
  const rel = path.relative(ROOT, fileName).split(path.sep).join('/');
  if (overrides.has(rel)) {
    return ts.createSourceFile(fileName, overrides.get(rel), langVersion, true, ts.ScriptKind.TSX);
  }
  return origGetSourceFile(fileName, langVersion, onError, shouldCreate);
};

const program = ts.createProgram(files.map(f => path.join(ROOT, f)), cfg.options, host);
const checker = program.getTypeChecker();

/* ------------------------------------------------------------------ */
/* The check                                                          */
/* ------------------------------------------------------------------ */
const isFunctionLike = n =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n);

/** The nearest enclosing function whose BODY is a block. */
const owningFunction = node => {
  let p = node.parent;
  while (p) {
    if (isFunctionLike(p) && p.body && ts.isBlock(p.body)) return p;
    p = p.parent;
  }
  return null;
};

/** True when the reference sits inside a JSX event handler attribute, which
 *  runs on a tap rather than during this render. */
const insideEventHandler = node => {
  let p = node.parent;
  while (p) {
    if (ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && /^on[A-Z]/.test(p.name.text)) return true;
    p = p.parent;
  }
  return false;
};

/** The statement of `fn`'s body block that contains `node`, or null. */
const bodyStatementContaining = (fn, node) => {
  for (const st of fn.body.statements) {
    if (node.getStart() >= st.getStart() && node.getEnd() <= st.getEnd()) return st;
  }
  return null;
};

/** Does this body statement return before control could reach later statements? */
const canReturnEarly = st => {
  let found = false;
  const visit = n => {
    if (found) return;
    if (ts.isReturnStatement(n)) { found = true; return; }
    if (isFunctionLike(n)) return; /* a nested function's return is its own */
    ts.forEachChild(n, visit);
  };
  visit(st);
  return found;
};

const findings = [];

for (const rel of files) {
  const sf = program.getSourceFile(path.join(ROOT, rel));
  if (!sf) continue;

  const visit = node => {
    if (ts.isIdentifier(node)) {
      /* Skip declaration names, property names, JSX tag names. */
      const p = node.parent;
      const isDeclName = p && (ts.isVariableDeclaration(p) || ts.isParameter(p) ||
        ts.isBindingElement(p) || ts.isFunctionDeclaration(p) || ts.isPropertyAssignment(p) ||
        ts.isImportSpecifier(p) || ts.isImportClause(p)) && p.name === node;
      const isPropAccess = p && ts.isPropertyAccessExpression(p) && p.name === node;
      if (!isDeclName && !isPropAccess) {
        const sym = checker.getSymbolAtLocation(node);
        const decl = sym?.declarations?.[0];
        if (decl && ts.isVariableDeclaration(decl) && decl.getSourceFile() === sf) {
          const list = decl.parent;
          const stmt = list?.parent;
          /* Only block-scoped bindings have a temporal dead zone. */
          const blockScoped = ts.isVariableDeclarationList(list) &&
            (list.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) !== 0;
          if (blockScoped && stmt && ts.isVariableStatement(stmt)) {
            const declFn = owningFunction(decl);
            const refFn = owningFunction(node);
            /* The declaration must sit at the statement level of its function
             * body, and the reference must be inside that same function. */
            const declAtBodyLevel = declFn && declFn.body.statements.includes(stmt);
            let sameFn = false;
            for (let q = refFn; q; q = owningFunction(q)) { if (q === declFn) { sameFn = true; break; } }
            if (declAtBodyLevel && sameFn && node.getStart() < stmt.getStart() && !insideEventHandler(node)) {
              const host = bodyStatementContaining(declFn, node);
              if (host && canReturnEarly(host)) {
                const fnName = declFn.parent && ts.isVariableDeclaration(declFn.parent) &&
                  ts.isIdentifier(declFn.parent.name) ? declFn.parent.name.text : '(anonymous)';
                const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
                const declLine = sf.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
                findings.push({ key: `${rel}::${fnName}::${node.text}`, rel, fnName, name: node.text, line, declLine });
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/* Collapse repeats of the same identifier in the same function. */
const byKey = new Map();
for (const f of findings) if (!byKey.has(f.key)) byKey.set(f.key, f);
const unique = [...byKey.values()];

console.log(`1. Scanned ${files.length} files for a binding read above its own declaration`);
const fresh = unique.filter(f => !BASELINE.includes(f.key));
const baselineHit = unique.filter(f => BASELINE.includes(f.key));

for (const f of fresh) {
  fail(`${f.rel}:${f.line} reads "${f.name}" but the only binding it resolves to is declared at line ${f.declLine}, below an early return. This throws ReferenceError at render.`);
}
if (!fresh.length) console.log(`   no new offenders (${baselineHit.length} baseline entries still present)`);

/* A baseline entry that stopped reproducing must leave the list, so the list
 * cannot quietly become a permanent excuse. */
const stale = BASELINE.filter(k => !byKey.has(k));
for (const k of stale) fail(`BASELINE still lists ${k} but it no longer reproduces. Remove it from the list.`);

if (CONTROL === 'tdz') {
  const fired = fresh.some(f => f.rel === 'src/pages/ClubManager.tsx' && f.name === 'c');
  if (fired) {
    console.log('   CONTROL FIRED: the injected temporal dead zone was caught');
    process.exit(0);
  }
  console.error('   CONTROL DID NOT FIRE: the harness cannot see the very bug it was written for');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimEarlyReturnScope: all green');

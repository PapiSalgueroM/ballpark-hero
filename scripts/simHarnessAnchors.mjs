/* Round 629: a harness may not carry an anchor that can never match, and a
 * harness that does not parse may not hide.
 *
 * WHY THIS EXISTS, and it is not hypothetical. Round 620 shipped five negative
 * controls with `simFightCareer`. Two of them, `noretire` and `driftdaily`,
 * had never once fired. Round 625 shipped `simFightGym` with the same defect
 * in `noretire`, and `simTransferPathRepeat` and `simPollCharacter` carried it
 * too. In every case the harness read a file under `src/` with a plain
 * `readFileSync`, then looked for an anchor written across more than one line.
 *
 * Anthony's checkout stores those files CRLF. An anchor written inside a
 * harness is LF. So a SINGLE line anchor matches and a MULTI line one cannot,
 * ever. The well written harnesses then abort with "control cannot run", which
 * is loud and safe but means the control has never actually been exercised
 * here. The badly written ones replace nothing, stay green, and the section
 * reads as verified when its control did nothing at all. It is invisible on an
 * LF checkout, where every one of these works perfectly.
 *
 * The first version of this fence was reviewed and found much weaker than it
 * said. It exempted a harness if the normaliser text appeared ANYWHERE in it,
 * comments included, so simSiteSearch (one read normalised, the read its
 * `catalogdump` control searches left raw) read as compliant while that
 * control had never run. It only saw reads with a src path typed inside the
 * call, so a helper like simFightGym's `readSrc` was invisible. It decided
 * "anchor" against this checkout's raw bytes, so on an LF clone it found
 * nothing while its vacuity guard, which counted normalisers rather than
 * anchors, still said ok. And the fix it shipped for simPollCharacter put real
 * line breaks inside two string literals, so that harness stopped parsing and
 * nothing here noticed. Widening it found five more harnesses with a control
 * that could never run on this checkout.
 *
 * THE RULE. For every multi line anchor a harness carries into a file X under
 * `src/`, every read in that harness that can reach X, and whose text can
 * reach the anchor, must normalise line endings. Not one read somewhere in
 * the file: each of them.
 *
 * WHAT COUNTS AS AN ANCHOR. The harness is tokenised, so comments, strings,
 * template literals and regex literals are told apart and prose never counts
 * as code. A candidate has at least 20 characters and a line break that is
 * not preceded by a carriage return, and is built from any of:
 *   - a quoted string, 'x\ny' or "x\ny"
 *   - a template literal with no interpolation, with the break written as \n
 *     or as a real line break (JS reads a real break as LF either way)
 *   - each static stretch of a template literal that does interpolate
 *   - a `+` chain of those, or of consts holding exactly one of those
 *   - an array of those joined with a literal, [a, b].join('\n')
 *   - a regex literal containing \n, counted when it matches X with LF
 *     endings and does not match X with CRLF endings
 * It is an anchor into X when it appears in X with line endings normalised.
 * That never looks at this checkout's bytes, so an LF clone finds exactly
 * what Anthony's CRLF machine finds.
 *
 * WHICH READS CAN REACH X. Every `readFileSync(` and `readFile(` call. Its
 * path is resolved through consts, lets, reassignments, `for (... of [...])`
 * lists, object properties, ternaries, local functions' return values and
 * nested `path.join` calls, with function parameters kept unresolved. A read
 * reaches X when the resolved path can name X, or, when the path cannot be
 * resolved at all, when the harness names X somewhere by path or file name
 * (that is how `readSrc('src/lib/fightGym.ts')` is tied to its file).
 *
 * WHETHER ITS TEXT CAN REACH THE ANCHOR. The fence follows the text a short
 * way, and when in doubt it says yes:
 *   - passed straight to JSON.parse: no, it is not text any more
 *   - returned by an arrow handed to a library call, such as a TypeScript
 *     host or an esbuild plugin: no, the library keeps it
 *   - consumed on the spot by .match, .includes, .indexOf, .split and the
 *     like: only when that call's arguments use the anchor
 *   - kept in a const or let declared inside a block, and never returned,
 *     assigned outward or put in an object or array: only when that block
 *     uses the anchor, directly or through a const or function it names
 *   - anything else: yes
 *
 * WHAT COUNTS AS NORMALISED. Decided by running the call, not by its
 * spelling: `.replace`, `.replaceAll` or `.split` with literal arguments whose
 * result on "a\r\nb\r\nc" keeps no carriage return. That accepts
 * replaceAll('\r\n', '\n'), replace(/\r\n?/g, '\n'), replace(/\r/g, ''),
 * split(/\r\n/).join('\n'), split(/\r?\n/) and the rest. It can sit
 *   - chained on the read, or on any call wrapping it
 *   - in a wrapper function whose body normalises, lf(fs.readFileSync(...))
 *   - in a later reassignment, s = s.replace(/\r\n/g, '\n') or s = lf(s)
 *   - at every call site of a helper that returns the read
 *
 * STILL OUT OF REACH, said plainly so nobody reads a green run as full
 * coverage:
 *   - anchors assembled at runtime: new RegExp(string), String.raw, strings
 *     built in loops, a `+` chain through anything but a one literal const,
 *     a join over a computed array, text read from another file
 *   - a template literal whose multi line text runs across an interpolation
 *     (each static stretch is checked alone, never the joined whole)
 *   - anchors shorter than 20 characters
 *   - anchors into files outside `src/` (index.html, public, scripts,
 *     supabase) and src files other than .ts, .tsx, .css and .html
 *   - reads outside the harness file (a helper imported from scripts/lib) or
 *     through anything but readFileSync and readFile (git show, streams)
 *   - a read whose path cannot be resolved and that reaches X without the
 *     harness ever naming X (walking src/ and choosing files by content)
 *   - text that leaves a block by a route the escape test does not know,
 *     such as a closure stored outside the block
 *   - a path the resolver gets wrong: it treats every call it does not know
 *     as passing its arguments through, so path.basename keeps directories
 *   - normalisation in any shape not listed above. That one errs toward a
 *     false failure, never a false pass, and normalising on read clears it.
 *
 * THE PARSE CHECK. `node --check` on every scripts/sim*, play* and sweep*
 * .mjs. Round 629 left simPollCharacter unparseable and in the suite it read
 * exactly like an ordinary red harness, with none of its controls able to
 * run. Here a syntax error is named as a syntax error.
 *
 * CONTROLS, one at a time. Each analyses a copy of the scripts directory with
 * one planted fault, passes ONLY when the failures name the planted harness
 * and nothing else, refuses to run when its edit changed nothing, and removes
 * its copy when done:
 *   ANCHOR_CONTROL=strip    simFightCareer loses its normalisation
 *   ANCHOR_CONTROL=oneread  simSiteSearch loses it on the read its catalogdump
 *                           control searches, and keeps it on its other read
 *   ANCHOR_CONTROL=helper   simFightGym's readSrc helper loses it
 *   ANCHOR_CONTROL=comment  simFightCareer loses it and mentions it in comments
 *   ANCHOR_CONTROL=lf       strip, analysed against LF copies of scripts and
 *                           src written to disk, the way a fresh clone stores
 *                           them
 *   ANCHOR_CONTROL=parse    simPollCharacter gets the Round 629 damage back,
 *                           real line breaks inside its two string literals
 *
 * Run: node scripts/simHarnessAnchors.mjs
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = 'simHarnessAnchors.mjs';
const HARNESS = /^(sim|play|sweep).*\.mjs$/;
const CONTROL = process.env.ANCHOR_CONTROL || '';

/* ---------------------------------------------------------------- scanning */

const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const CONTROL_WORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'await', 'new', 'with']);
/* a token that starts a line and still continues the expression above it */
const CONT_NEXT = new Set(['.', '?.', ',', '+', '-', '*', '/', '%', '&', '|', '^', '?', ':', '=', '<', '>', '=>', ')', ']', '}']);
/* a token that ends a line and still expects the expression to go on */
const CONT_PREV = new Set(['.', '?.', ',', '+', '-', '*', '/', '%', '&', '|', '^', '?', ':', '=', '<', '>', '=>', '!', '...', '(', '[', '{']);

function cook(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (c !== '\\') { out += c; continue; }
    i += 1;
    const d = raw[i];
    if (d === undefined) break;
    if (d === 'n') out += '\n';
    else if (d === 'r') out += '\r';
    else if (d === 't') out += '\t';
    else if (d === 'b') out += '\b';
    else if (d === 'f') out += '\f';
    else if (d === 'v') out += '\v';
    else if (d === '0' && !/[0-9]/.test(raw[i + 1] || '')) out += '\0';
    else if (d === 'x') { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 3), 16) || 0); i += 2; }
    else if (d === 'u' && raw[i + 1] === '{') {
      const e = raw.indexOf('}', i);
      out += String.fromCodePoint(Math.min(0x10ffff, parseInt(raw.slice(i + 2, e), 16) || 0));
      i = e < 0 ? raw.length : e;
    } else if (d === 'u') { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16) || 0); i += 4; }
    else if (d === '\r') { if (raw[i + 1] === '\n') i += 1; }
    else if (d === '\n') { /* a line continuation adds nothing */ }
    else out += d;
  }
  return out;
}

/**
 * Tokens of a JS module: identifiers, numbers, punctuation, strings, template
 * stretches and regex literals. Comments are dropped here, so nothing below
 * ever reads prose as code.
 */
function scan(text) {
  const toks = [];
  const n = text.length;
  const braces = [];
  let nl = false;
  let i = 0;
  const push = t => { t.nl = nl; nl = false; toks.push(t); };
  const templateChunk = (p, head) => {
    let j = p;
    while (j < n) {
      const ch = text[j];
      if (ch === '\\') { j += 2; continue; }
      if (ch === '`') {
        push({ type: 'tpl', start: p, end: j + 1, head, tail: true, value: cook(text.slice(p, j).replace(/\r\n?/g, '\n')) });
        return j + 1;
      }
      if (ch === '$' && text[j + 1] === '{') {
        push({ type: 'tpl', start: p, end: j + 2, head, tail: false, value: cook(text.slice(p, j).replace(/\r\n?/g, '\n')) });
        braces.push('tpl');
        return j + 2;
      }
      j += 1;
    }
    push({ type: 'tpl', start: p, end: n, head, tail: true, value: '' });
    return n;
  };
  if (text.startsWith('#!')) { const e = text.indexOf('\n'); i = e < 0 ? n : e; }
  while (i < n) {
    const c = text[i];
    if (c === '\n') { nl = true; i += 1; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\uFEFF' || c === '\u00A0') { i += 1; continue; }
    if (c === '/' && text[i + 1] === '/') { const e = text.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      if (text.slice(i, end).includes('\n')) nl = true;
      i = end;
      continue;
    }
    if (c === '\'' || c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== c && text[j] !== '\n') {
        if (text[j] === '\\') j += text[j + 1] === '\r' && text[j + 2] === '\n' ? 3 : 2;
        else j += 1;
      }
      push({ type: 'str', start: i, end: j + 1, value: cook(text.slice(i + 1, Math.min(j, n))) });
      i = j + 1;
      continue;
    }
    if (c === '`') { i = templateChunk(i + 1, true); continue; }
    if (c === '}' && braces.length && braces[braces.length - 1] === 'tpl') {
      braces.pop();
      i = templateChunk(i + 1, false);
      continue;
    }
    if (c === '{') braces.push('code');
    if (c === '}') braces.pop();
    if (/[A-Za-z_$]/.test(c) || c > '\u007F') {
      let j = i + 1;
      while (j < n && (/[\w$]/.test(text[j]) || text[j] > '\u007F')) j += 1;
      push({ type: 'id', v: text.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] || ''))) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(text[j])) j += 1;
      push({ type: 'num', start: i, end: j });
      i = j;
      continue;
    }
    if (c === '/') {
      const prev = toks[toks.length - 1];
      const division = prev && (
        prev.type === 'num' || prev.type === 'str' || prev.type === 're' ||
        (prev.type === 'tpl' && prev.tail) ||
        (prev.type === 'id' && !REGEX_AFTER_WORD.has(prev.v)) ||
        (prev.type === 'p' && (prev.v === ')' || prev.v === ']' || prev.v === '}')));
      if (!division) {
        let j = i + 1;
        let cls = false;
        let closed = false;
        while (j < n) {
          const ch = text[j];
          if (ch === '\n' || ch === '\r') break;
          if (ch === '\\') { j += 2; continue; }
          if (ch === '[') cls = true;
          else if (ch === ']') cls = false;
          else if (ch === '/' && !cls) { closed = true; break; }
          j += 1;
        }
        if (closed) {
          let k = j + 1;
          while (k < n && /[a-z]/i.test(text[k])) k += 1;
          push({ type: 're', source: text.slice(i + 1, j), flags: text.slice(j + 1, k), start: i, end: k });
          i = k;
          continue;
        }
      }
    }
    if (c === '=' && text[i + 1] === '>') { push({ type: 'p', v: '=>', start: i, end: i + 2 }); i += 2; continue; }
    if (c === '?' && text[i + 1] === '.' && !/[0-9]/.test(text[i + 2] || '')) { push({ type: 'p', v: '?.', start: i, end: i + 2 }); i += 2; continue; }
    if (c === '.' && text[i + 1] === '.' && text[i + 2] === '.') { push({ type: 'p', v: '...', start: i, end: i + 3 }); i += 3; continue; }
    push({ type: 'p', v: c, start: i, end: i + 1 });
    i += 1;
  }
  return toks;
}

/* ---------------------------------------------------------------- analysis */

const SAMPLE = 'a\r\nb\r\nc';
const CONSUMERS = new Set(['match', 'matchAll', 'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'search', 'split']);
const ARRAY_METHODS = new Set(['map', 'flatMap', 'filter', 'forEach', 'reduce', 'some', 'every', 'find', 'findIndex', 'sort', 'then']);
const OUTWARD_METHODS = new Set(['push', 'set', 'add', 'unshift', 'concat', 'splice']);
const GLOBALS = new Set(['process', '__dirname', '__filename', 'undefined', 'null', 'true', 'false', 'import', 'new', 'await', 'typeof', 'URL', 'JSON', 'Math', 'Object', 'Array', 'String', 'Number', 'Buffer', 'globalThis']);

function literalOf(t) {
  if (!t) return undefined;
  if (t.type === 'str') return t.value;
  if (t.type === 'tpl' && t.head && t.tail) return t.value;
  if (t.type === 're') { try { return new RegExp(t.source, t.flags); } catch { return undefined; } }
  return undefined;
}

/** One harness, tokenised, with the questions the rule asks of it. */
function harnessModel(text) {
  const toks = scan(text);
  const N = toks.length;
  const match = new Int32Array(N).fill(-1);
  const parent = new Int32Array(N).fill(-1);
  {
    const stack = [];
    for (let k = 0; k < N; k += 1) {
      const t = toks[k];
      parent[k] = stack.length ? stack[stack.length - 1] : -1;
      if (t.type !== 'p') continue;
      if (t.v === '(' || t.v === '[' || t.v === '{') stack.push(k);
      else if (t.v === ')' || t.v === ']' || t.v === '}') {
        const o = stack.pop();
        if (o !== undefined) { match[o] = k; match[k] = o; }
        parent[k] = stack.length ? stack[stack.length - 1] : -1;
      }
    }
  }
  const isP = (k, v) => k >= 0 && k < N && toks[k].type === 'p' && toks[k].v === v;
  const isId = (k, v) => k >= 0 && k < N && toks[k].type === 'id' && (v === undefined || toks[k].v === v);
  const isDecl = k => isId(k, 'const') || isId(k, 'let') || isId(k, 'var');
  const afterDot = k => isP(k - 1, '.') || isP(k - 1, '?.');
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineOf = k => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= toks[k].start) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };

  /* the last token of the expression starting at k */
  function exprEnd(k) {
    let j = k;
    while (j < N) {
      const t = toks[j];
      if (j > k && t.nl && !(t.type === 'p' && CONT_NEXT.has(t.v)) && !(toks[j - 1].type === 'p' && CONT_PREV.has(toks[j - 1].v))) return j - 1;
      if (t.type === 'p' && (t.v === '(' || t.v === '[' || t.v === '{')) {
        if (match[j] < 0) return N - 1;
        j = match[j] + 1;
        continue;
      }
      if (t.type === 'p' && (t.v === ';' || t.v === ',' || t.v === ')' || t.v === ']' || t.v === '}')) return j - 1;
      j += 1;
    }
    return N - 1;
  }

  /* index of the closing paren when a normalising .replace/.replaceAll/.split starts at the dot k */
  function normCallAt(k) {
    if (!(isP(k, '.') || isP(k, '?.')) || !isId(k + 1) || !isP(k + 2, '(')) return -1;
    const method = toks[k + 1].v;
    if (method !== 'replace' && method !== 'replaceAll' && method !== 'split') return -1;
    const a = literalOf(toks[k + 3]);
    if (a === undefined) return -1;
    try {
      if (method === 'split') {
        if (!isP(k + 4, ')')) return -1;
        return SAMPLE.split(a).join('|') === 'a|b|c' ? k + 4 : -1;
      }
      if (!isP(k + 4, ',') || !isP(k + 6, ')')) return -1;
      const b = literalOf(toks[k + 5]);
      if (typeof b !== 'string') return -1;
      const out = SAMPLE[method](a, b);
      return !out.includes('\r') && out.replaceAll('\n', '') === 'abc' ? k + 6 : -1;
    } catch {
      return -1;
    }
  }
  const normEnds = new Int32Array(N);
  for (let k = 0; k < N; k += 1) normEnds[k] = normCallAt(k);
  const normCallEnd = k => (k >= 0 && k < N ? normEnds[k] : -1);

  /* every function scope: its parameter names and body range, named or not */
  const scopes = [];
  const fnDefs = new Map();
  const defByBody = new Map();
  const paramNames = (a, b) => {
    const names = new Set();
    for (let q = a; q <= b; q += 1) if (isId(q) && !afterDot(q) && !isP(q - 1, ':')) names.add(toks[q].v);
    return names;
  };
  for (let k = 0; k < N; k += 1) {
    let po = -1;
    let body = -1;
    let name = null;
    if (isP(k, '=>')) {
      if (isP(k - 1, ')') && match[k - 1] >= 0) po = match[k - 1];
      body = k + 1;
      const params = po >= 0 ? paramNames(po + 1, k - 2) : (isId(k - 1) ? new Set([toks[k - 1].v]) : new Set());
      const start = po >= 0 ? po : k - 1;
      const at = isId(start - 1, 'async') ? start - 1 : start;
      if (isP(at - 1, '=') && isId(at - 2) && isDecl(at - 3)) name = toks[at - 2].v;
      const b = isP(body, '{') ? match[body] : exprEnd(body);
      scopes.push({ params, a: body, b });
      if (name) { defByBody.set(body, name); if (!fnDefs.has(name)) fnDefs.set(name, []); fnDefs.get(name).push({ a: body, b, at: at - 2 }); }
      continue;
    }
    if (isId(k, 'function')) {
      if (isId(k + 1)) { name = toks[k + 1].v; po = k + 2; } else po = k + 1;
      if (!isP(po, '(') || !isP(match[po] + 1, '{')) continue;
      body = match[po] + 1;
      if (!name && isP(k - 1, '=') && isId(k - 2) && isDecl(k - 3)) name = toks[k - 2].v;
      scopes.push({ params: paramNames(po + 1, match[po] - 1), a: body, b: match[body] });
      if (name) { defByBody.set(body, name); if (!fnDefs.has(name)) fnDefs.set(name, []); fnDefs.get(name).push({ a: body, b: match[body], at: isId(k + 1) ? k + 1 : k - 2 }); }
    }
  }
  const inRange = (k, r) => k >= r.a && k <= r.b;
  const isDefSite = k => (fnDefs.get(toks[k].v) || []).some(d => d.at === k);
  const isParamAt = (k, name) => scopes.some(sc => inRange(k, sc) && sc.params.has(name));

  /* functions whose body normalises: lf, norm, and friends */
  const normFns = new Set();
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [name, defs] of fnDefs) {
      if (normFns.has(name)) continue;
      for (const d of defs) {
        let hit = false;
        for (let k = d.a; k <= d.b && !hit; k += 1) {
          if (normCallEnd(k) >= 0) hit = true;
          else if (isId(k) && !afterDot(k) && isP(k + 1, '(') && normFns.has(toks[k].v)) hit = true;
        }
        if (hit) { normFns.add(name); break; }
      }
    }
  }
  const containsNormaliser = (a, b) => {
    for (let k = a; k <= b; k += 1) {
      if (normCallEnd(k) >= 0) return true;
      if (isId(k) && !afterDot(k) && isP(k + 1, '(') && normFns.has(toks[k].v)) return true;
    }
    return false;
  };

  /* is the brace at o the body of a function */
  const isFnBody = o => {
    if (!isP(o, '{')) return false;
    if (isP(o - 1, '=>')) return true;
    if (!isP(o - 1, ')') || match[o - 1] < 0) return false;
    const before = match[o - 1] - 1;
    return isId(before, 'function') || (isId(before) && !CONTROL_WORDS.has(toks[before].v));
  };
  const isObjectBrace = o => isP(o, '{') && (isP(o - 1, '=') || isP(o - 1, '(') || isP(o - 1, ',') || isP(o - 1, ':') || isP(o - 1, '[') || isP(o - 1, '?') || isId(o - 1, 'return'));

  /* The name of the function whose value an expression at s is: the arrow
     body that starts at s, or the innermost function body holding a
     `return` at s - 1. An anonymous callback answers null, never the named
     function around it. */
  function returnedBy(s) {
    if (isP(s - 1, '=>')) return defByBody.get(s) ?? null;
    for (let o = parent[s]; o >= 0; o = parent[o]) {
      if (isFnBody(o)) return defByBody.get(o) ?? null;
    }
    return null;
  }

  const memberStart = k => { let s = k; while ((isP(s - 1, '.') || isP(s - 1, '?.')) && isId(s - 2)) s -= 2; return s; };

  /* declarations and reassignments of a name: the token ranges of their values */
  const valuesMemo = new Map();
  function valuesOf(name) {
    if (valuesMemo.has(name)) return valuesMemo.get(name);
    const out = [];
    valuesMemo.set(name, out);
    for (let k = 0; k < N; k += 1) {
      if (!isId(k, name) || afterDot(k)) continue;
      if (isP(k + 1, '=') && !isP(k + 2, '=') && !isP(k + 2, '>')) {
        out.push({ kind: 'value', a: k + 2, b: exprEnd(k + 2), at: k });
      } else if (isDecl(k - 1) && (isId(k + 1, 'of') || isId(k + 1, 'in')) && isP(parent[k], '(') && isId(parent[k] - 1, 'for')) {
        out.push({ kind: 'each', a: k + 2, b: match[parent[k]] - 1, at: k });
      }
    }
    return out;
  }

  /* where a value's declaration can be seen; null for a reassignment, which is seen wherever its name is */
  function declScope(v) {
    if (v.kind === 'each') {
      const fp = parent[v.at];
      const bs = match[fp] + 1;
      return { a: fp, b: isP(bs, '{') ? match[bs] : exprEnd(bs) };
    }
    const kw = v.at - 1;
    if (!isDecl(kw)) return null;
    const o = parent[kw];
    if (o < 0) return { a: 0, b: N - 1 };
    return { a: o, b: match[o] };
  }
  /* the values a name can hold at token q: none for a parameter, else the declarations in scope and every reassignment */
  function visibleValues(name, q) {
    if (isParamAt(q, name)) return [];
    return valuesOf(name).filter(v => {
      if (q >= v.a && q <= v.b) return false;
      const sc = declScope(v);
      return !sc || (q >= sc.a && q <= sc.b);
    });
  }

  /**
   * What happens to the text a read call [s..e] gives back. Answers one of
   * normalised, json, handed, consumed (with the consuming call's argument
   * range), block (with the block range), calls (the fates at every call of
   * the helper that returns it) or raw. `pathArg` is the read's own path
   * argument, which a block scan leaves out.
   */
  function fateOf(s, e, depth, pathArg) {
    for (let guard = 0; guard < 40; guard += 1) {
      let j = e + 1;
      while (j < N) {
        if (isP(j, '.') || isP(j, '?.')) {
          if (normCallEnd(j) >= 0) return { kind: 'normalised' };
          if (isId(j + 1) && CONSUMERS.has(toks[j + 1].v) && isP(j + 2, '(') && match[j + 2] > 0) {
            return { kind: 'consumed', a: j + 3, b: match[j + 2] - 1 };
          }
          j += 2;
          if (isP(j, '(') && match[j] > 0) j = match[j] + 1;
          continue;
        }
        if ((isP(j, '[') || isP(j, '(')) && match[j] > 0) { j = match[j] + 1; continue; }
        break;
      }
      e = j - 1;
      if (isId(s - 1, 'await')) { s -= 1; continue; }
      const o = parent[s];
      if (o < 0 || !isP(o, '(')) break;
      const soleArg = o === s - 1 && match[o] === e + 1;
      const anArg = (isP(s - 1, '(') || isP(s - 1, ',')) && (isP(e + 1, ',') || isP(e + 1, ')'));
      if (!soleArg && !anArg) break;
      const callee = o - 1;
      if (isId(callee) && !CONTROL_WORDS.has(toks[callee].v)) {
        if (!afterDot(callee) && normFns.has(toks[callee].v)) return { kind: 'normalised' };
        if (toks[callee].v === 'parse' && isP(callee - 1, '.') && isId(callee - 2, 'JSON')) return { kind: 'json' };
        s = memberStart(callee);
        e = match[o];
        continue;
      }
      if (soleArg && !isId(callee)) { s = o; e = match[o]; continue; }
      break;
    }
    /* assigned, then normalised in place later: s = s.replace(/\r\n/g, '\n') or s = lf(s) */
    if (isP(s - 1, '=') && isId(s - 2) && !afterDot(s - 2)) {
      const v = toks[s - 2].v;
      for (let k = e + 1; k < N; k += 1) {
        if (!isId(k, v) || afterDot(k) || !isP(k + 1, '=') || isP(k + 2, '=') || isP(k + 2, '>')) continue;
        const end = exprEnd(k + 2);
        let usesV = false;
        for (let q = k + 2; q <= end; q += 1) if (isId(q, v) && !afterDot(q)) usesV = true;
        if (usesV && containsNormaliser(k + 2, end)) return { kind: 'normalised' };
      }
    }
    if (isId(s - 1, 'return') || isP(s - 1, '=>')) {
      const name = returnedBy(s);
      if (name) {
        if (depth >= 3) return { kind: 'raw' };
        const calls = [];
        for (let k = 0; k < N; k += 1) {
          if (!isId(k, name) || afterDot(k) || !isP(k + 1, '(') || isDefSite(k) || isId(k - 1, 'function')) continue;
          if (fnDefs.get(name).some(d => inRange(k, d))) continue;
          calls.push(k);
        }
        if (!calls.length) return { kind: 'raw' };
        const fates = calls.map(k => fateOf(k, match[k + 1], depth + 1, { a: k + 2, b: match[k + 1] - 1 }));
        if (fates.every(f => f.kind === 'normalised')) return { kind: 'normalised' };
        return { kind: 'calls', fates };
      }
      /* an anonymous arrow handed to a call: a library keeps the text, an array method hands it back */
      if (isP(s - 1, '=>')) {
        const arrowStart = isP(s - 2, ')') && match[s - 2] >= 0 ? match[s - 2] : s - 2;
        const o = parent[arrowStart];
        if ((isP(arrowStart - 1, '(') || isP(arrowStart - 1, ',')) && isP(o, '(') && isId(o - 1) && afterDot(o - 1) && !ARRAY_METHODS.has(toks[o - 1].v)) {
          return { kind: 'handed' };
        }
      }
      return { kind: 'raw' };
    }
    /* kept in a block scoped name that never leaves the block */
    if (isP(s - 1, '=') && isId(s - 2) && isDecl(s - 3)) {
      const B = parent[s - 3];
      if (B >= 0 && isP(B, '{') && !isFnBody(B) && !escapes(toks[s - 2].v, s - 2, B)) return { kind: 'block', a: B, b: match[B], path: pathArg };
    }
    return { kind: 'raw' };
  }

  function escapes(v, declAt, B) {
    for (let q = declAt + 1; q < match[B]; q += 1) {
      if (!isId(q, v) || afterDot(q)) continue;
      /* text.matchAll(...), text.includes(...): what travels on is a result, not the text */
      if ((isP(q + 1, '.') || isP(q + 1, '?.')) && isId(q + 2) && (CONSUMERS.has(toks[q + 2].v) || toks[q + 2].v === 'length')) continue;
      if (isId(q - 1, 'return') || isP(q - 1, '=>') || isP(q - 1, ':') || isP(q - 1, '...') || isP(q - 1, '?') || isId(q - 1, 'yield')) return true;
      const po = parent[q];
      if (isP(po, '[') && (po === q - 1 || isP(q - 1, ','))) return true;
      if (isObjectBrace(po) && (po === q - 1 || isP(q - 1, ','))) return true;
      if (isP(po, '(') && isId(po - 1) && OUTWARD_METHODS.has(toks[po - 1].v)) return true;
      if (isP(q - 1, '=') && !isP(q - 2, '=') && !isP(q - 2, '!') && !isP(q - 2, '<') && !isP(q - 2, '>')) {
        /* fine when it lands in itself or in a name declared inside the block */
        const lhs = q - 2;
        const local = isId(lhs) && !afterDot(lhs) && (toks[lhs].v === v || visibleValues(toks[lhs].v, lhs).some(x => {
          const sc = declScope(x);
          return sc && sc.a >= B && sc.b <= match[B];
        }));
        if (!local) return true;
      }
    }
    return false;
  }

  /* Does [a..b] use one of the anchor tokens, directly or through any chain of
     consts and functions it names. Names are matched without scopes, which
     can only tie more reads, never fewer. */
  const usesMemo = new WeakMap();
  function usesAnchor(a, b, anchorAt, skip = null) {
    if (!usesMemo.has(anchorAt)) usesMemo.set(anchorAt, new Map());
    const skipKey = skip ? `${skip.a}:${skip.b}` : '-';
    if (!usesMemo.get(anchorAt).has(skipKey)) usesMemo.get(anchorAt).set(skipKey, new Map());
    const memo = usesMemo.get(anchorAt).get(skipKey);
    const hidden = k => skip && k >= skip.a && k <= skip.b;
    const rangeUses = (x, y) => {
      const key = `${x}:${y}`;
      if (memo.has(key)) return memo.get(key);
      memo.set(key, false);
      let hit = false;
      for (const k of anchorAt) if (k >= x && k <= y && !hidden(k)) hit = true;
      for (let q = x; q <= y && !hit; q += 1) {
        if (hidden(q) || !isId(q) || afterDot(q)) continue;
        const ranges = [...visibleValues(toks[q].v, q), ...(isParamAt(q, toks[q].v) ? [] : fnDefs.get(toks[q].v) || [])];
        if (ranges.some(r => !(q >= r.a && q <= r.b) && rangeUses(r.a, r.b))) hit = true;
      }
      memo.set(key, hit);
      return hit;
    };
    return rangeUses(a, b);
  }

  /* Does the text a read gives back reach one of the anchor tokens */
  function fateReaches(fate, anchorAt) {
    switch (fate.kind) {
      case 'normalised': case 'json': case 'handed': return false;
      case 'consumed': return usesAnchor(fate.a, fate.b, anchorAt);
      /* the read's own path argument is plumbing, not a place the text goes */
      case 'block': return usesAnchor(fate.a, fate.b, anchorAt, fate.path);
      case 'calls': return fate.fates.some(f => fateReaches(f, anchorAt));
      default: return true;
    }
  }

  /**
   * The path an expression can name, as pieces: {lit}, {wild} for anything
   * unresolvable, {seq: [...]}, {alt: [[...], ...]} for a choice.
   */
  function pathPieces(a, b, depth, seen) {
    if (depth > 8) return [{ wild: true }];
    /* a ternary or a fallback is a choice, not a sequence */
    for (let q = a; q <= b; q += 1) {
      if (parent[q] !== parent[a]) continue;
      if (isP(q, '?') && !isP(q + 1, '.')) {
        for (let c = q + 1; c <= b; c += 1) {
          if (parent[c] === parent[a] && isP(c, ':')) return [{ alt: [pathPieces(q + 1, c - 1, depth + 1, seen), pathPieces(c + 1, b, depth + 1, seen)] }];
        }
      }
      if ((isP(q, '|') && isP(q + 1, '|')) || (isP(q, '?') && isP(q + 1, '?'))) {
        return [{ alt: [pathPieces(a, q - 1, depth + 1, seen), pathPieces(q + 2, b, depth + 1, seen)] }];
      }
    }
    const out = [];
    for (let k = a; k <= b; k += 1) {
      const t = toks[k];
      if (t.type === 'str' || t.type === 'tpl') { out.push({ lit: t.value }); continue; }
      if (t.type !== 'id' || afterDot(k) || GLOBALS.has(t.v)) continue;
      const name = t.v;
      if (isP(k + 1, '(')) {
        /* a local function gives back what it returns; any other call is read through its arguments */
        if (fnDefs.has(name) && !isParamAt(k, name)) out.push({ alt: returnPieces(name, depth + 1, new Set(seen).add(`fn:${name}`)) });
        continue;
      }
      if (isParamAt(k, name)) { out.push({ wild: true }); continue; }
      const member = isP(k + 1, '.') || isP(k + 1, '?.');
      if (importNames.has(name)) { if (!member) out.push({ wild: true }); continue; }
      if (fnDefs.has(name) && !valuesOf(name).length) continue;
      if (seen.has(name)) { out.push({ wild: true }); continue; }
      const next = new Set(seen).add(name);
      if (member && isId(k + 2) && !isP(k + 3, '(')) { out.push({ alt: propertyPieces(name, toks[k + 2].v, k, depth + 1, next) }); k += 2; continue; }
      if (isP(k + 1, '[')) { out.push({ wild: true }); k = match[k + 1]; continue; }
      out.push({ alt: identPieces(name, k, depth + 1, next) });
    }
    return out;
  }
  const trivial = v => v.a === v.b && (toks[v.a].type === 'num' || isId(v.a, 'null') || isId(v.a, 'undefined') || isId(v.a, 'true') || isId(v.a, 'false'));
  function elementsOf(a, b, depth, seen) {
    if (isP(a, '[') && match[a] === b) {
      const alts = [];
      let from = a + 1;
      for (let q = a + 1; q <= b; q += 1) {
        if (q === b || (isP(q, ',') && parent[q] === a)) {
          if (q > from) alts.push(pathPieces(from, q - 1, depth, seen));
          from = q + 1;
        }
      }
      return alts.length ? alts : [[{ wild: true }]];
    }
    if (a === b && isId(a) && !seen.has(toks[a].v)) {
      const vals = visibleValues(toks[a].v, a).filter(v => v.kind === 'value' && !trivial(v));
      if (vals.length) return vals.flatMap(v => elementsOf(v.a, v.b, depth + 1, new Set(seen).add(toks[a].v)));
    }
    return [[{ wild: true }]];
  }
  function identPieces(name, k, depth, seen) {
    const vals = visibleValues(name, k).filter(v => !trivial(v));
    if (!vals.length) return [[{ wild: true }]];
    return vals.flatMap(v => (v.kind === 'each' ? elementsOf(v.a, v.b, depth, seen) : [pathPieces(v.a, v.b, depth, seen)]));
  }
  function propertyPieces(name, prop, k, depth, seen) {
    const alts = [];
    for (const v of visibleValues(name, k).filter(x => !trivial(x))) {
      if (!(isP(v.a, '{') && match[v.a] === v.b)) return [[{ wild: true }]];
      let found = false;
      for (let q = v.a + 1; q < v.b; q += 1) {
        if (parent[q] !== v.a || !isId(q, prop)) continue;
        if (!(isP(q - 1, '{') || isP(q - 1, ','))) continue;
        if (isP(q + 1, ':')) { alts.push(pathPieces(q + 2, exprEnd(q + 2), depth, seen)); found = true; break; }
        if (isP(q + 1, ',') || isP(q + 1, '}')) { alts.push(...identPieces(prop, q, depth, seen)); found = true; break; }
      }
      if (!found) return [[{ wild: true }]];
    }
    return alts.length ? alts : [[{ wild: true }]];
  }
  function returnPieces(name, depth, seen) {
    const alts = [];
    for (const d of fnDefs.get(name)) {
      if (!isP(d.a, '{')) { alts.push(pathPieces(d.a, d.b, depth, seen)); continue; }
      for (let q = d.a; q <= d.b; q += 1) {
        if (!isId(q, 'return')) continue;
        let o = parent[q];
        while (o >= 0 && !isFnBody(o)) o = parent[o];
        if (o === d.a) alts.push(pathPieces(q + 1, exprEnd(q + 1), depth, seen));
      }
    }
    return alts.length ? alts : [[{ wild: true }]];
  }

  const importNames = new Set();
  for (let k = 0; k < N; k += 1) {
    if (!isId(k, 'import') || isP(k + 1, '.') || isP(k + 1, '(')) continue;
    for (let q = k + 1; q < N && !isId(q, 'from') && !isP(q, ';') && toks[q].type !== 'str'; q += 1) {
      if (isId(q) && !isId(q, 'as') && !isId(q + 1, 'as')) importNames.add(toks[q].v);
    }
  }

  /* every read, with the path it can name and what becomes of its text */
  const reads = [];
  for (let k = 0; k < N; k += 1) {
    if (!(isId(k, 'readFileSync') || isId(k, 'readFile')) || !isP(k + 1, '(') || match[k + 1] < 0) continue;
    if (isId(k - 1, 'function') || isId(k - 1, 'import') || isDecl(k - 1)) continue;
    if (!afterDot(k) && !importNames.has(toks[k].v)) continue;
    const s = afterDot(k) ? memberStart(k) : k;
    const e = match[k + 1];
    let argEnd = e - 1;
    for (let q = k + 2; q < e; q += 1) if (isP(q, ',') && parent[q] === k + 1) { argEnd = q - 1; break; }
    reads.push({ line: lineOf(k), pieces: pathPieces(k + 2, argEnd, 0, new Set()), fate: fateOf(s, e, 0, { a: k + 2, b: argEnd }) });
  }

  /* every literal the harness names, for tying an unresolvable read to a file */
  const named = [];
  for (const t of toks) if (t.type === 'str' || (t.type === 'tpl' && t.head && t.tail)) named.push(t.value.replaceAll('\\', '/'));

  /* candidate anchors, each with the token it stands at */
  const constLiteral = name => {
    const vals = valuesOf(name);
    if (vals.length !== 1 || vals[0].kind !== 'value' || vals[0].a !== vals[0].b) return undefined;
    const v = literalOf(toks[vals[0].a]);
    return typeof v === 'string' ? v : undefined;
  };
  const stringAt = k => {
    const v = literalOf(toks[k]);
    if (typeof v === 'string') return v;
    if (isId(k) && !afterDot(k) && !isP(k + 1, '(') && !isP(k + 1, '.')) return constLiteral(toks[k].v);
    return undefined;
  };
  const candidates = [];
  const addCandidate = (value, k) => { if (typeof value === 'string') candidates.push({ value, k, line: lineOf(k) }); };
  for (let k = 0; k < N; k += 1) {
    const t = toks[k];
    if (t.type === 'str' || t.type === 'tpl') addCandidate(t.value, k);
    if (t.type === 're' && t.source.includes('\\n')) candidates.push({ regex: literalOf(t), k, line: lineOf(k) });
    /* a + chain of literals, started only at its first element */
    if (isP(k + 1, '+') && !isP(k - 1, '+') && stringAt(k) !== undefined) {
      let value = stringAt(k);
      let q = k;
      while (isP(q + 1, '+') && stringAt(q + 2) !== undefined) { value += stringAt(q + 2); q += 2; }
      if (q > k) addCandidate(value, k);
    }
    /* [a, b].join(sep) */
    if (isP(k, '[') && match[k] > 0 && isP(match[k] + 1, '.') && isId(match[k] + 2, 'join') && isP(match[k] + 3, '(')) {
      const sep = literalOf(toks[match[k] + 4]);
      if (typeof sep === 'string' && isP(match[k] + 5, ')')) {
        const parts = [];
        let ok = true;
        for (let q = k + 1; q < match[k]; q += 2) {
          const v = stringAt(q);
          if (v === undefined || !(isP(q + 1, ',') || q + 1 === match[k])) { ok = false; break; }
          parts.push(v);
          if (isP(q + 1, ',') && q + 2 === match[k]) break;
        }
        if (ok && parts.length > 1) addCandidate(parts.join(sep), k);
      }
    }
  }
  return { reads, named, candidates, fateReaches };
}

/* ------------------------------------------------------------- the corpus */

/** Every source file a harness might anchor into, keyed by its path from the root, LF. */
function readCorpus(root) {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|css|html)$/.test(e.name)) {
        const rel = path.relative(root, p).split(path.sep).join('/');
        /* normalised here on purpose: the question is what the file SAYS, and
           the answer must not depend on how this checkout stores it */
        files.push({ rel, norm: fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n') });
      }
    }
  })(path.join(root, 'src'));
  let text = '';
  const starts = [];
  for (const f of files) { starts.push(text.length); text += f.norm + '\u0000'; }
  /* a line index, so a printed message is ruled out without a scan of 16MB */
  const lines = new Set();
  const heads = new Set();
  const tails = new Set();
  for (const f of files) {
    for (const line of f.norm.split('\n')) {
      lines.add(line);
      if (line.length >= 16) { heads.add(line.slice(0, 16)); tails.add(line.slice(-16)); }
    }
  }
  return { files, text, starts, lines, heads, tails };
}

/* false only when no run of lines in the corpus could hold the value */
function mightContain(corpus, value) {
  const seg = value.split('\n');
  for (let i = 1; i < seg.length - 1; i += 1) if (!corpus.lines.has(seg[i])) return false;
  const last = seg[seg.length - 1];
  const first = seg[0];
  if (last.length >= 16 && !corpus.heads.has(last.slice(0, 16))) return false;
  if (first.length >= 16 && !corpus.tails.has(first.slice(-16))) return false;
  return true;
}

function filesContaining(corpus, value) {
  if (!mightContain(corpus, value)) return [];
  const hit = [];
  let from = 0;
  for (;;) {
    const at = corpus.text.indexOf(value, from);
    if (at < 0) return hit;
    let lo = 0;
    let hi = corpus.starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (corpus.starts[mid] <= at) lo = mid; else hi = mid - 1; }
    hit.push(corpus.files[lo].rel);
    from = lo + 1 < corpus.starts.length ? corpus.starts[lo + 1] : corpus.text.length;
  }
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WILD = Symbol('wild');

/* every concrete shape a path can take, as lists of literal text and WILD */
function expandPieces(list) {
  let outs = [[]];
  for (const p of list) {
    let next = outs;
    if (p.wild) next = outs.map(o => [...o, WILD]);
    else if (p.lit !== undefined) {
      const lit = p.lit.replaceAll('\\', '/').replace(/^(?:\.\.?\/)+/, '').replace(/^\.\.?$/, '');
      if (lit) next = outs.map(o => [...o, lit]);
    } else if (p.seq || p.alt) {
      const subs = p.seq ? expandPieces(p.seq) : p.alt.flatMap(expandPieces);
      next = outs.flatMap(o => subs.map(s => [...o, ...s]));
    }
    if (next.length > 64) return [[WILD]];
    outs = next;
  }
  return outs;
}

/**
 * Which files a read's path can name. Adjacent unknowns are merged before a
 * regex is built, so the pattern never nests `.*` against `.*` (the first
 * draft of this backtracked for minutes on a path of three unknowns).
 */
function piecesPattern(pieces) {
  const res = [];
  let open = false;
  for (const shape of expandPieces(pieces)) {
    const merged = shape.filter((x, i) => !(x === WILD && shape[i - 1] === WILD));
    if (!merged.some(x => x !== WILD)) { open = true; break; }
    const body = merged.map(x => (x === WILD ? '.*' : escapeRe(x))).join('/?');
    res.push(new RegExp(`${merged[0] === WILD ? '^' : '^(?:.*/)?'}${body}$`));
  }
  return { open, test: rel => res.some(re => re.test(rel)) };
}

/** The whole analysis over one scripts directory. */
function analyse(dir, corpus) {
  const files = fs.readdirSync(dir).filter(f => HARNESS.test(f)).sort();
  const bad = [];
  let withAnchors = 0;
  let guardedReads = 0;
  for (const f of files) {
    if (f === SELF) continue;   // it quotes every idiom and plants the faults it looks for
    const model = harnessModel(fs.readFileSync(path.join(dir, f), 'utf8'));
    /* file -> the candidate tokens that anchor into it */
    const anchorsInto = new Map();
    const note = (rel, c) => {
      if (!anchorsInto.has(rel)) anchorsInto.set(rel, []);
      anchorsInto.get(rel).push(c);
    };
    for (const c of model.candidates) {
      if (c.regex !== undefined) {
        if (!(c.regex instanceof RegExp)) continue;
        const re = new RegExp(c.regex.source, c.regex.flags.replace(/[gy]/g, ''));
        if (!re.test(corpus.text)) continue;
        for (const file of corpus.files) {
          if (re.test(file.norm) && !re.test(file.norm.replaceAll('\n', '\r\n'))) note(file.rel, c);
        }
        continue;
      }
      if (c.value.length < 20 || !/[^\r]\n/.test(c.value)) continue;
      for (const rel of filesContaining(corpus, c.value)) note(rel, c);
    }
    if (!anchorsInto.size) continue;
    withAnchors += 1;
    const tokensInto = new Map([...anchorsInto].map(([rel, cs]) => [rel, new Set(cs.map(c => c.k))]));
    const offences = [];
    for (const r of model.reads) {
      const { test, open } = piecesPattern(r.pieces);
      for (const [rel, cs] of anchorsInto) {
        const base = rel.split('/').pop();
        const reaches = open
          ? model.named.some(v => v === base || (v.includes('/') && rel.endsWith(v.replace(/^(?:\.\.?\/)+/, ''))))
          : test(rel);
        if (!reaches) continue;
        if (r.fate.kind === 'normalised') { guardedReads += 1; break; }
        if (!model.fateReaches(r.fate, tokensInto.get(rel))) continue;
        offences.push({ line: r.line, rel, anchorLine: cs[0].line });
        break;
      }
    }
    if (offences.length) bad.push({ f, offences });
  }
  return { files: files.length, withAnchors, guardedReads, bad };
}

/* ------------------------------------------------------------ parse check */

function parseCheck(dir) {
  const files = fs.readdirSync(dir).filter(f => HARNESS.test(f)).sort();
  const broken = [];
  let checked = 0;
  let next = 0;
  const worker = () => new Promise(resolve => {
    const one = () => {
      if (next >= files.length) return resolve();
      const f = files[next];
      next += 1;
      execFile(process.execPath, ['--check', path.join(dir, f)], { timeout: 60000, windowsHide: true }, (err, _out, stderr) => {
        checked += 1;
        if (err) {
          const why = String(stderr || err.message).split(/\r?\n/).find(l => /Error/.test(l)) || 'did not parse';
          broken.push({ f, why: why.trim() });
        }
        one();
      });
    };
    one();
  });
  const width = Math.max(2, Math.min(16, os.cpus().length));
  return Promise.all(Array.from({ length: width }, worker)).then(() => ({ files: files.length, checked, broken }));
}

/* ---------------------------------------------------------------- controls */

const CONTROLS = {
  strip: { victim: 'simFightCareer.mjs', edit: s => s.split(".replaceAll('\\r\\n', '\\n')").join('') },
  oneread: {
    victim: 'simSiteSearch.mjs',
    edit: s => {
      /* the point is that the OTHER read still normalises, so insist on it */
      const other = ".map(f => fs.readFileSync(path.join(ROOT, 'src/data/gameContent', f), 'utf8').replace(/\\r\\n/g, '\\n'))";
      if (!s.includes(other)) return s;
      return s.split("let source = fs.readFileSync(SRC, 'utf8').replace(/\\r\\n/g, '\\n');").join("let source = fs.readFileSync(SRC, 'utf8');");
    },
  },
  helper: {
    victim: 'simFightGym.mjs',
    edit: s => s.split("const readSrc = p => deAlias(fs.readFileSync(path.join(ROOT, p), 'utf8').replaceAll('\\r\\n', '\\n'));")
      .join("const readSrc = p => deAlias(fs.readFileSync(path.join(ROOT, p), 'utf8'));"),
  },
  comment: {
    victim: 'simFightCareer.mjs',
    edit: s => {
      const stripped = s.split(".replaceAll('\\r\\n', '\\n')").join('');
      if (stripped === s) return s;
      return "/* every read here goes through .replaceAll('\\r\\n', '\\n') first */\n// and this one too: .replace(/\\r\\n/g, '\\n')\n" + stripped;
    },
  },
  lf: { victim: 'simFightCareer.mjs', lf: true, edit: s => s.split(".replaceAll('\\r\\n', '\\n')").join('') },
  parse: {
    victim: 'simPollCharacter.mjs',
    parse: true,
    edit: s => s.split(".replaceAll('\\r\\n', '\\n');").join(".replaceAll('\n', '\n');"),
  },
};

/* ------------------------------------------------------------------- main */

if (CONTROL && !CONTROLS[CONTROL]) {
  console.log(`   FAIL unknown control ${CONTROL}, expected one of ${Object.keys(CONTROLS).join(', ')}`);
  process.exit(1);
}

let dir = path.join(ROOT, 'scripts');
let corpusRoot = ROOT;
let tmp = null;
const control = CONTROLS[CONTROL];
let exitCode = 0;
try {
  if (control) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anchors-'));
    const scripts = path.join(tmp, 'scripts');
    fs.mkdirSync(scripts);
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (!fs.statSync(p).isFile()) continue;
      const q = path.join(scripts, f);
      if (control.lf && f.endsWith('.mjs')) fs.writeFileSync(q, fs.readFileSync(p, 'utf8').split('\r\n').join('\n'));
      else fs.copyFileSync(p, q);
    }
    if (control.lf) {
      /* a real LF copy of src on disk, the way a fresh clone stores it */
      let carriageReturns = 0;
      (function copy(from, to) {
        fs.mkdirSync(to, { recursive: true });
        for (const e of fs.readdirSync(from, { withFileTypes: true })) {
          if (e.isDirectory()) copy(path.join(from, e.name), path.join(to, e.name));
          else if (/\.(ts|tsx|css|html)$/.test(e.name)) {
            const lf = fs.readFileSync(path.join(from, e.name), 'utf8').split('\r\n').join('\n');
            if (lf.includes('\r')) carriageReturns += 1;
            fs.writeFileSync(path.join(to, e.name), lf);
          }
        }
      })(path.join(ROOT, 'src'), path.join(tmp, 'src'));
      corpusRoot = tmp;
      console.log(`   [control lf: src copied with LF endings, ${carriageReturns} file(s) still holding a lone carriage return]`);
    }
    const victim = path.join(scripts, control.victim);
    const before = fs.readFileSync(victim, 'utf8');
    const after = control.edit(before);
    if (after === before) {
      console.log(`   FAIL control ${CONTROL} found nothing to change in ${control.victim}, so it would prove nothing`);
      exitCode = 1;
    } else {
      fs.writeFileSync(victim, after);
      console.log(`   [control ${CONTROL} applied to a copy of ${control.victim}]`);
      dir = scripts;
    }
  }
  if (!exitCode) await run();
} finally {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(exitCode);

async function run() {
  const failures = [];
  const fail = (m, names) => { failures.push({ m, names }); console.log(`   FAIL ${m}`); };
  const ok = m => console.log(`   ok   ${m}`);

  console.log('1) every harness parses');
  const p = await parseCheck(dir);
  if (p.files < 100 || p.checked !== p.files) {
    fail(`the parse check looked at ${p.checked} of ${p.files} harnesses, so it is not looking at the scripts directory`, []);
  }
  for (const b of p.broken) fail(`${b.f} does not parse: ${b.why}`, [b.f]);
  if (!p.broken.length) ok(`${p.checked} harnesses pass node --check`);

  console.log('2) no harness carries an anchor it can never match');
  const corpus = readCorpus(corpusRoot);
  const r = analyse(dir, corpus);
  console.log(`   ${r.files} harnesses, ${r.withAnchors} carry a multi line anchor into src, ${r.guardedReads} normalised reads guard one`);
  /* Measured on 2026-09-16: 72 harnesses carry one and 68 normalised reads
     guard one. The floors sit at about a third of each, well over zero, so a
     scanner or a resolver that stops finding them goes red instead of passing
     on nothing, and ordinary churn in the harness list does not. */
  if (r.withAnchors < 25) fail(`only ${r.withAnchors} harnesses carry a multi line anchor into src, so the anchor scan has probably gone blind`, []);
  else ok(`${r.withAnchors} harnesses are in scope, so the check is looking at something`);
  if (r.guardedReads < 20) fail(`only ${r.guardedReads} normalised reads were tied to an anchor, so the read resolution has probably gone blind`, []);
  for (const b of r.bad) {
    const o = b.offences[0];
    fail(`${b.f} reads ${o.rel} raw at line ${o.line} and searches it with a multi line anchor (line ${o.anchorLine}), so on a CRLF checkout it matches nothing${b.offences.length > 1 ? ` (${b.offences.length} raw reads in all)` : ''}`, [b.f]);
  }
  if (!r.bad.length) ok('every read a multi line anchor can search normalises line endings first');

  console.log('');
  if (control) {
    const named = new Set(failures.flatMap(x => x.names));
    const unnamed = failures.filter(x => !x.names.length);
    const firedRightCheck = control.parse
      ? p.broken.some(b => b.f === control.victim)
      : r.bad.some(b => b.f === control.victim);
    if (firedRightCheck && !unnamed.length && named.size === 1 && named.has(control.victim)) {
      console.log(`control "${CONTROL}": the planted fault in ${control.victim} was named and nothing else was, the check works`);
    } else {
      console.log(`control "${CONTROL}": expected exactly ${control.victim} named by the ${control.parse ? 'parse' : 'anchor'} check, got ${named.size ? [...named].join(', ') : 'nothing'}${unnamed.length ? ` plus ${unnamed.length} unnamed failure(s)` : ''}, so this control proves nothing`);
      exitCode = 1;
    }
  } else if (failures.length) {
    console.log(`simHarnessAnchors: ${failures.length} failure(s)`);
    exitCode = 1;
  } else {
    console.log('simHarnessAnchors: green. Every harness parses and none carries an unmatchable anchor.');
  }
}

/* Reading src as code: comments out, strings, templates and regexes kept.

   Round 645 lifted these out of scripts/simNoDoubleRecord.mjs (Round 643),
   verbatim, so the ranked recorder fence and the no double record fence read
   a call site the same way. A guard that reads source must read the code and
   not the prose about it (CLAUDE.md, verification gates), and both fences
   prove it on every run by writing their target shapes into a comment and
   asserting nothing flags.

   stripComments  the file with every comment blanked to spaces (lines kept,
                  so a line number in the result is a line number in the file)
   callsOf        every call of `name(` with its top level arguments
   resolveSlug    a quoted literal, or a const bound to one in the same file
   resolveExpr    a bare identifier's const initialiser in the same file
   srcFiles       every .ts and .tsx under src, tests and control copies out
   readLF         a file with CRLF folded to LF (the worktree checks out CRLF
                  and every anchor a fence carries is written LF) */
import fs from 'node:fs';
import path from 'node:path';

export function stripComments(src) {
  let out = '';
  const n = src.length;
  const REGEX_AFTER = '(,=:[!&|?{};+-*%<>~^';
  function code(i, untilBrace) {
    let depth = 0;
    let prev = '';
    let word = '';
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i += 1; continue; }
      if (c === '/' && d === '*') {
        const e = src.indexOf('*/', i + 2);
        const end = e < 0 ? n : e + 2;
        out += src.slice(i, end).replace(/[^\n]/g, ' ');
        i = end;
        continue;
      }
      if (c === "'" || c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j += 1; j += 1; }
        out += src.slice(i, j + 1);
        i = j + 1; prev = c; word = '';
        continue;
      }
      if (c === '`') { i = template(i); prev = '`'; word = ''; continue; }
      if (c === '/' && (prev === '' || REGEX_AFTER.includes(prev) || /^(return|typeof|case|in|of|new|delete|void|throw|yield|await)$/.test(word))) {
        let j = i + 1;
        let cls = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '[') cls = true;
          else if (src[j] === ']') cls = false;
          else if (src[j] === '/' && !cls) break;
          j += 1;
        }
        j += 1;
        while (j < n && /[a-z]/i.test(src[j])) j += 1;
        out += src.slice(i, j);
        i = j; prev = '/'; word = '';
        continue;
      }
      if (untilBrace) {
        if (c === '{') depth += 1;
        else if (c === '}') { if (depth === 0) return i; depth -= 1; }
      }
      out += c;
      i += 1;
      if (/\s/.test(c)) continue;
      word = /[A-Za-z0-9_$]/.test(c) ? (/[A-Za-z0-9_$]/.test(prev) ? word + c : c) : '';
      prev = c;
    }
    return i;
  }
  function template(i) {
    out += '`';
    i += 1;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { out += '`'; return i + 1; }
      if (c === '$' && src[i + 1] === '{') { out += '${'; i = code(i + 2, true); out += '}'; i += 1; continue; }
      out += c;
      i += 1;
    }
    return i;
  }
  code(0, false);
  return out;
}

/* Every call of `name(` in the code, with its top level arguments. */
export function callsOf(code, name) {
  const found = [];
  const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(code))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let cur = '';
    const args = [];
    let quote = '';
    for (; i < code.length; i += 1) {
      const c = code[i];
      if (quote) { cur += c; if (c === '\\') { cur += code[i + 1]; i += 1; } else if (c === quote) quote = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
      if (c === '(' || c === '[' || c === '{') depth += 1;
      if (c === ')' || c === ']' || c === '}') {
        if (depth === 0 && c === ')') { args.push(cur.trim()); break; }
        depth -= 1;
      }
      if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    found.push({ args: args.filter(a => a !== ''), at: code.slice(0, m.index).split('\n').length });
  }
  return found;
}

const LITERAL = /^(['"`])([^'"`$]*)\1$/;
export function resolveSlug(code, expr) {
  const lit = expr.match(LITERAL);
  if (lit) return lit[2];
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
    const def = code.match(new RegExp(`\\b(?:const|let|var)\\s+${expr}\\s*(?::[^=]+)?=\\s*(['"\`])([^'"\`$]+)\\1`));
    if (def) return def[2];
  }
  return null;
}
export function resolveExpr(code, expr) {
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
    const def = code.match(new RegExp(`\\bconst\\s+${expr}\\s*(?::[^=]+)?=\\s*([^;]+);`));
    if (def) return def[1].trim();
  }
  return expr;
}

export const readLF = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8').split('\r\n').join('\n');

/* Every file under src (tests out), keyed by its repo relative path. */
export function srcFiles(root) {
  const out = new Map();
  const walk = dir => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (rel !== 'src/test') walk(rel); continue; }
      if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name) || e.name.startsWith('__control_')) continue;
      out.set(rel, readLF(root, rel));
    }
  };
  walk('src');
  return out;
}

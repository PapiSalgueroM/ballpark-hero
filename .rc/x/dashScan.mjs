// Count lines holding an en or em dash. Usage: node .tmp-fx/dashScan.mjs dir <folder> | diff <rev> | log <rev>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const D = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const has = (l) => D.some((d) => l.includes(d));
const [mode, arg] = process.argv.slice(2);
let bad = [];
if (mode === "dir") {
  const files = fs.readdirSync(arg);
  for (const f of files) fs.readFileSync(path.join(arg, f), "utf8").split("\n").forEach((l, i) => { if (has(l)) bad.push(`${f}:${i + 1}`); });
  console.log(`${files.length} files, ${bad.length} lines with an en or em dash ${bad.slice(0, 10).join(" ")}`);
} else if (mode === "diff") {
  const out = execFileSync("git", ["diff", arg, "HEAD"], { encoding: "utf8", maxBuffer: 1 << 28 });
  let file = "";
  for (const l of out.split("\n")) { if (l.startsWith("+++ ")) file = l.slice(6); else if (l.startsWith("+") && has(l)) bad.push(file); }
  console.log(`git diff ${arg} HEAD: ${bad.length} added lines with an en or em dash ${[...new Set(bad)].slice(0, 10).join(" ")}`);
} else if (mode === "log") {
  const out = execFileSync("git", ["log", "--format=%H %B", `${arg}..HEAD`], { encoding: "utf8", maxBuffer: 1 << 28 });
  bad = out.split("\n").filter(has);
  console.log(`commit messages ${arg}..HEAD: ${bad.length} lines with an en or em dash`);
}
process.exit(bad.length ? 1 : 0);

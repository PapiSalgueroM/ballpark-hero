/**
 * The six withdrawn Boot Room endpoints are inert tombstones.
 *
 * This harness executes each real TypeScript handler and holds the public
 * response contract. It also rejects any dependency, environment read,
 * network call, or database client that could restore privileged behavior.
 *
 * Negative controls mutate an in-memory copy of one real fixture:
 *   RETIRED_BOOTROOM_CONTROL=status
 *   RETIRED_BOOTROOM_CONTROL=db
 *   RETIRED_BOOTROOM_CONTROL=jwt
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS = [
  "bootroom-generate-squad",
  "bootroom-scout-report",
  "bootroom-simulate-match",
  "bootroom-reveal",
  "bootroom-transfer-market",
  "bootroom-season-rollover",
];
const EXPECTED_BODY = '{"error":"This legacy function has been retired."}';
const EXPECTED_ORIGIN = "https://douknowball.com";
const CONTROL = process.env.RETIRED_BOOTROOM_CONTROL || "";
const CONTROLS = new Set(["status", "db", "jwt"]);

if (CONTROL && !CONTROLS.has(CONTROL)) {
  console.error(`RETIRED_BOOTROOM_CONTROL=${CONTROL} is not a known control`);
  process.exit(1);
}

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`  FAIL: ${message}`);
};
const normalise = (text) => text.replaceAll("\r\n", "\n");

function mutateOnce(text, needle, replacement, label) {
  const hits = text.split(needle).length - 1;
  if (hits !== 1) {
    console.error(`control cannot run: ${label} matched ${hits} times, expected 1`);
    process.exit(1);
  }
  const changed = text.replace(needle, replacement);
  if (changed === text) {
    console.error(`control cannot run: ${label} did not change its fixture`);
    process.exit(1);
  }
  return changed;
}

const sources = new Map();
for (const slug of FUNCTIONS) {
  const sourcePath = path.join(ROOT, "supabase", "functions", slug, "index.ts");
  if (!fs.existsSync(sourcePath)) {
    fail(`${slug}: local retirement handler is missing`);
    continue;
  }
  sources.set(slug, normalise(fs.readFileSync(sourcePath, "utf8")));
}

let config = normalise(fs.readFileSync(path.join(ROOT, "supabase", "config.toml"), "utf8"));
const controlSlug = FUNCTIONS[0];
if (CONTROL === "status") {
  sources.set(
    controlSlug,
    mutateOnce(sources.get(controlSlug), "status: 410", "status: 200", "status control"),
  );
} else if (CONTROL === "db") {
  sources.set(
    controlSlug,
    mutateOnce(
      sources.get(controlSlug),
      "Deno.serve(",
      'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");\n\nDeno.serve(',
      "database control",
    ),
  );
} else if (CONTROL === "jwt") {
  const block = `[functions.${controlSlug}]\nverify_jwt = true`;
  config = mutateOnce(config, block, `${block.slice(0, -4)}false`, "JWT control");
}

if (CONTROL) {
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): one real retirement fixture was broken in memory.`);
}

console.log("1) every local handler is dependency-free and inert");
for (const slug of FUNCTIONS) {
  const source = sources.get(slug);
  if (!source) continue;

  let code;
  try {
    ({ code } = await transform(source, {
      loader: "ts",
      format: "iife",
      target: "es2022",
      legalComments: "none",
    }));
  } catch (error) {
    fail(`${slug}: TypeScript source did not parse (${error.message})`);
    continue;
  }

  const unsafe = [];
  if (/\bimport\s*(?:\(|["'{])|\brequire\s*\(/.test(code)) unsafe.push("a dependency import");
  if (/\b(?:createClient|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS?|SUPABASE_DB_URL)\b|\bDeno\.env\b|\bfetch\s*\(|\.from\s*\(|\.rpc\s*\(/.test(code)) {
    unsafe.push("a secret, database, or network access path");
  }

  let handler;
  let serveCalls = 0;
  let envReads = 0;
  let fetchCalls = 0;
  const deno = {
    env: { get: () => { envReads += 1; return ""; } },
    serve: (candidate) => { serveCalls += 1; handler = candidate; },
  };
  const countedFetch = async () => {
    fetchCalls += 1;
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    new Function("Deno", "Request", "Response", "Headers", "fetch", code)(
      deno,
      Request,
      Response,
      Headers,
      countedFetch,
    );
  } catch (error) {
    fail(`${slug}: compiled handler did not load (${error.message})`);
    continue;
  }

  if (serveCalls !== 1 || typeof handler !== "function") {
    fail(`${slug}: expected one Deno.serve handler, found ${serveCalls}`);
    continue;
  }

  const behaviorProblems = [];
  for (const method of ["GET", "POST", "OPTIONS"]) {
    const init = {
      method,
      headers: { Origin: EXPECTED_ORIGIN },
      ...(method === "POST" ? { body: "{}" } : {}),
    };
    let response;
    try {
      response = await handler(new Request(`https://example.test/functions/v1/${slug}`, init));
    } catch (error) {
      behaviorProblems.push(`${method} threw ${error.message}`);
      continue;
    }
    if (!(response instanceof Response)) {
      behaviorProblems.push(`${method} did not return a Response`);
      continue;
    }
    const body = await response.text();
    if (response.status !== 410) behaviorProblems.push(`${method} returned ${response.status}, not 410`);
    if (body !== EXPECTED_BODY) behaviorProblems.push(`${method} returned ${JSON.stringify(body)}, not the retired JSON`);
    if (response.headers.get("content-type") !== "application/json") behaviorProblems.push(`${method} did not return application/json`);
    const cors = response.headers.get("access-control-allow-origin");
    if (cors !== EXPECTED_ORIGIN || cors === "*") behaviorProblems.push(`${method} has unsafe CORS ${JSON.stringify(cors)}`);
  }
  if (envReads || fetchCalls) unsafe.push(`${envReads} environment reads and ${fetchCalls} network calls during execution`);
  if (unsafe.length) fail(`${slug}: retirement source contains ${[...new Set(unsafe)].join(" and ")}`);
  if (behaviorProblems.length) fail(`${slug}: ${behaviorProblems.join("; ")}`);
}
console.log(`   checked ${FUNCTIONS.length} handlers across GET, POST, and OPTIONS`);

console.log("2) the gateway requires a verified JWT for every retired endpoint");
const configLines = config.split("\n");
for (const slug of FUNCTIONS) {
  const header = `[functions.${slug}]`;
  const starts = configLines.flatMap((line, index) => line.trim() === header ? [index] : []);
  if (starts.length !== 1) {
    fail(`${slug}: config has ${starts.length} exact function sections, expected 1`);
    continue;
  }
  const start = starts[0];
  let end = configLines.length;
  for (let index = start + 1; index < configLines.length; index += 1) {
    if (/^\s*\[/.test(configLines[index])) { end = index; break; }
  }
  const jwtLines = configLines.slice(start + 1, end).filter((line) => /^\s*verify_jwt\s*=/.test(line));
  if (jwtLines.length !== 1 || jwtLines[0].trim() !== "verify_jwt = true") {
    fail(`${slug}: function section must contain exactly verify_jwt = true`);
  }
}

console.log("");
if (CONTROL) {
  if (failures === 1) {
    console.log(`simRetiredBootroom control (${CONTROL}): green. The planted defect was caught once.`);
    process.exit(0);
  }
  console.error(`simRetiredBootroom control (${CONTROL}): RED. Expected 1 finding, found ${failures}.`);
  process.exit(1);
}
if (failures) {
  console.error(`simRetiredBootroom: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log(`simRetiredBootroom: green. ${FUNCTIONS.length} legacy endpoints are authenticated 410 tombstones.`);

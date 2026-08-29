/**
 * Round 222 harness (number 89): the IndexNow wiring cannot drift apart.
 *
 * The submission only works if three things agree forever: the key file in
 * public/ (which Bing fetches off the live site to verify ownership), the
 * key constant inside scripts/indexnowSubmit.mjs (which goes in the POST
 * body), and the sitemap (which supplies the URL list). Each lives in a
 * different file, nothing ties them together at build time, and a drift in
 * any one of them turns every future submission into a silent no-op on
 * Bing's side: the POST is accepted with a 200 and the key check then
 * fails out of sight. This fence makes that drift loud instead.
 *
 * Checks, all offline, no network, no side effects:
 *   1. exactly one 32-hex-char key file exists in public/, its content is
 *      exactly its own filename stem, no stray bytes, because the spec
 *      says the file must contain the key
 *   2. the KEY constant in indexnowSubmit.mjs equals that file's key, and
 *      the HOST constant is douknowball.com
 *   3. the sitemap parses, every <loc> is on https://douknowball.com, and
 *      the URL count ratchet holds: 117 as of Round 231. A shrink is
 *      lost coverage; growth without raising the floor here is a page
 *      nobody fenced. Raise the floor in the round that adds pages.
 *
 * Run: node scripts/simIndexNow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITEMAP_FLOOR = 129; /* raised R323, /sports-bingo; before that 128 (R314, Overrated or Underrated and Tier List retired at the owner's call), 130 (R306, /accessibility), 129 (R293, /idle-arena and /face-off), 127 (R270, the five sport hubs) */

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

console.log("1) the key file");
const keyFiles = fs.readdirSync(path.join(ROOT, "public")).filter(f => /^[a-f0-9]{32}\.txt$/.test(f));
if (keyFiles.length !== 1) fail(`expected exactly one 32-hex key file in public/, found ${keyFiles.length} (${keyFiles.join(", ") || "none"})`);
let key = null;
if (keyFiles.length === 1) {
  key = keyFiles[0].replace(/\.txt$/, "");
  const body = fs.readFileSync(path.join(ROOT, "public", keyFiles[0]), "utf-8");
  if (body !== key) fail(`the key file's content is not exactly its own key (${body.length} bytes for a ${key.length} char key)`);
  console.log(`   ${keyFiles[0]}: content matches the name`);
}

console.log("2) the submit script agrees");
const script = fs.readFileSync(path.join(ROOT, "scripts/indexnowSubmit.mjs"), "utf-8");
const mKey = script.match(/const KEY = "([a-f0-9]{32})"/);
const mHost = script.match(/const HOST = "([^"]+)"/);
if (!mKey) fail("no 32-hex KEY constant found in indexnowSubmit.mjs");
else if (key && mKey[1] !== key) fail(`KEY in the script (${mKey[1]}) is not the key file's key (${key})`);
else console.log("   KEY constant matches the key file");
if (!mHost || mHost[1] !== "douknowball.com") fail(`HOST in the script is ${mHost ? mHost[1] : "missing"}, expected douknowball.com`);

console.log("3) the sitemap the submission reads");
const xml = fs.readFileSync(path.join(ROOT, "public/sitemap.xml"), "utf-8");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const offHost = locs.filter(u => !u.startsWith("https://douknowball.com"));
if (offHost.length) fail(`${offHost.length} sitemap URLs are not on https://douknowball.com (first: ${offHost[0]})`);
if (locs.length < SITEMAP_FLOOR) fail(`sitemap shrank to ${locs.length} URLs (floor ${SITEMAP_FLOOR})`);
if (locs.length > SITEMAP_FLOOR) fail(`sitemap grew to ${locs.length} URLs without the floor being raised here`);
console.log(`   ${locs.length} URLs, all on the right host`);

console.log("");
if (failures > 0) {
  console.error(`simIndexNow: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simIndexNow: green. The key file, the script and the sitemap agree.");

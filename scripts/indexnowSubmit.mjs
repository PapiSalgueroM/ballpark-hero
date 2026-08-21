/**
 * Round 222: tell Bing the moment the site changes, instead of waiting to
 * be crawled.
 *
 * Bing is this site's number one traffic source (6,947 visits in the 31
 * days to 2026-08-20, 4.3x Google), and IndexNow is Bing's own keyless
 * push protocol: POST the changed URLs with a key you host, the engine
 * fetches /<key>.txt off the live site to prove you own it, and the pages
 * join the crawl queue in minutes rather than days. DuckDuckGo, Yahoo and
 * Naver read the same feed. Google does not, and needs nothing here, its
 * crawler already follows the sitemap.
 *
 * This is an OPERATIONAL script, not a harness. It is named so the sim
 * runner never discovers it, because running it has a side effect
 * (a submission). The offline consistency fence lives in
 * scripts/simIndexNow.mjs.
 *
 * When to run: from the cloud session, right after a publish is verified
 * live (see docs/SHIP-PIPELINE.md, Deploying). Not before: the very first
 * useful run needs the round that ships public/<key>.txt to be LIVE, and
 * this script refuses to submit until it can read the key off the live
 * site itself, because a submission Bing cannot verify is worse than no
 * submission.
 *
 * Modes:
 *   node scripts/indexnowSubmit.mjs              submit every sitemap URL
 *   URLS=/a,/b node scripts/indexnowSubmit.mjs   submit just those routes
 *   DRY=1 node scripts/indexnowSubmit.mjs        print, send nothing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "douknowball.com";
const KEY = "16211a5a50cff8f3434e5db883a21d8f";
const KEY_URL = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(ROOT, "public/sitemap.xml"), "utf-8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

const urls = process.env.URLS
  ? process.env.URLS.split(",").map(u => `https://${HOST}${u.trim()}`)
  : sitemapUrls();

if (urls.length === 0 || urls.some(u => !u.startsWith(`https://${HOST}/`) && u !== `https://${HOST}`)) {
  console.error(`refusing: the URL list is empty or contains something not on ${HOST}`);
  process.exit(1);
}

console.log(`${urls.length} URLs to submit for ${HOST}`);

if (process.env.DRY) {
  console.log(urls.slice(0, 5).map(u => "  " + u).join("\n") + (urls.length > 5 ? `\n  ...and ${urls.length - 5} more` : ""));
  console.log("DRY set, nothing sent.");
  process.exit(0);
}

/* fail closed: the key file must already be readable off the LIVE site,
   with a cache buster because the CDN edges hold stale copies for hours */
const probe = await fetch(`${KEY_URL}?v=${Date.now()}`).catch(() => null);
const probeBody = probe && probe.ok ? (await probe.text()).trim() : null;
if (probeBody !== KEY) {
  console.error(`refusing: ${KEY_URL} is not serving the key yet (got ${probe ? probe.status : "no response"}).`);
  console.error("Publish the round that ships the key file first, then run this again.");
  process.exit(1);
}
console.log("key file verified live");

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_URL, urlList: urls }),
}).catch(e => ({ ok: false, status: String(e) }));

/* 200 is accepted, 202 is accepted pending key verification. Anything
   else is a real refusal and must be seen, never shrugged off. */
if (res.ok || res.status === 202) {
  console.log(`accepted (HTTP ${res.status}). Bing and friends will fetch the key and queue the crawl.`);
} else {
  console.error(`submission refused: HTTP ${res.status}`);
  process.exit(1);
}

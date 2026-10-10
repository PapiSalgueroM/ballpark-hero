/**
 * Round 1213: save a fixture source as RAW BYTES, exactly as the host sent them.
 *
 * A page read through a summarising reader is a lead, never a row. Every row in
 * a Club Manager fixture ledger is parsed by a committed parser from bytes this
 * file saved, and the receipt records the byte count and the SHA256 of each
 * saved file, so the step from "what the host sent" to "what the game ships"
 * can be rerun by anybody who has the snapshot.
 *
 * The snapshots are NOT committed: they are other publishers' pages. They are
 * kept beside the handoff (CM_FIXTURE_RAW, default below) and only their hashes
 * reach the repo.
 *
 * A plain request on purpose: one GET, an honest User-Agent that says who is
 * asking, no cookies, no script, no retry past a transport reset. A host that
 * refuses this is not worked around here; the league waits for a later round.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/* A folder on the owner's PC, beside the handoff. On any other machine this path does not exist (on Linux it
   would even be a relative one), so the tool refuses to run without --dir or CM_FIXTURE_RAW there rather
   than make a folder of this name inside the repo (scripts/genCmLeagueFixtures.mjs). */
export const DEFAULT_RAW_ROOT = 'C:/Users/antho/dukb-handoff/2026-10-10/cm-fixtures-raw';
export const rawRoot = () => (process.env.CM_FIXTURE_RAW || DEFAULT_RAW_ROOT).replaceAll('\\', '/');

const USER_AGENT = 'Mozilla/5.0 (compatible; DoUKnowBall-fixture-check/1.0; +https://douknowball.com/contact)';

export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

/** One GET. Returns the body as a Buffer plus what the response said about it. */
export async function getBytes(url, { timeoutMs = 45000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json,application/pdf;q=0.9,*/*;q=0.5' },
    });
    const body = Buffer.from(await res.arrayBuffer());
    return { status: res.status, finalUrl: res.url, contentType: res.headers.get('content-type') || '', body };
  } finally {
    clearTimeout(timer);
  }
}

/** The file a source page is kept in. One page a file, numbered from 1. */
export function snapshotPath(dir, sourceId, page, ext) {
  return path.join(dir, `${sourceId}${page ? `-p${String(page).padStart(2, '0')}` : ''}.${ext}`);
}

/**
 * Fetch every page of one source into dir. An existing snapshot is never
 * overwritten: a recorded hash must stay reproducible from the kept bytes, so
 * a second read goes into a second folder.
 */
export async function saveSource(dir, source) {
  fs.mkdirSync(dir, { recursive: true });
  const urls = source.pages ?? [source.url];
  const saved = [];
  for (let i = 0; i < urls.length; i += 1) {
    const file = snapshotPath(dir, source.id, urls.length > 1 ? i + 1 : 0, source.ext);
    const metaFile = `${file}.meta.json`;
    if (fs.existsSync(file) && fs.existsSync(metaFile)) {
      saved.push({ ...JSON.parse(fs.readFileSync(metaFile, 'utf8')), kept: true });
      continue;
    }
    let got;
    try {
      got = await getBytes(urls[i]);
    } catch (e) {
      saved.push({ url: urls[i], error: String(e && e.cause ? `${e.message}: ${e.cause.code || e.cause.message}` : e) });
      continue;
    }
    const meta = {
      url: urls[i], finalUrl: got.finalUrl, status: got.status, contentType: got.contentType,
      readAtUtc: new Date().toISOString(), bytes: got.body.length, sha256: sha256(got.body),
    };
    if (got.status === 200 && got.body.length > 0) {
      fs.writeFileSync(file, got.body);
      fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
    }
    saved.push(meta);
  }
  return saved;
}

/** Read a kept snapshot back, and refuse it if the bytes no longer match the hash recorded at the read. */
export function readSnapshot(dir, source) {
  const count = (source.pages ?? [source.url]).length;
  const pages = [];
  for (let i = 0; i < count; i += 1) {
    const file = snapshotPath(dir, source.id, count > 1 ? i + 1 : 0, source.ext);
    if (!fs.existsSync(file)) throw new Error(`no snapshot for ${source.id} at ${file}: run the fetch step first`);
    const body = fs.readFileSync(file);
    const meta = JSON.parse(fs.readFileSync(`${file}.meta.json`, 'utf8'));
    if (sha256(body) !== meta.sha256 || body.length !== meta.bytes) {
      throw new Error(`snapshot ${file} no longer matches the hash recorded when it was read`);
    }
    pages.push({ file, body, meta });
  }
  return pages;
}

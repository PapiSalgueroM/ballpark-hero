// Round 1052 research tooling. Reads each club's three squad lists once and keeps the answers in
// GATHERED_RAW, so the rows can be rebuilt (build.mjs) without asking the hosts again.
//   node fetch.mjs <clubs module> [from] [to]      (club index range, so one run stays short)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const { LEAGUE, CLUBS } = mod;
const from = Number(process.argv[3] ?? 0);
const to = Number(process.argv[4] ?? CLUBS.length);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
fs.mkdirSync(LEAGUE.raw, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function get(url, file) {
  try {
    const out = execFileSync('curl', ['-s', '-L', '-m', '25', '-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9', '-o', file, '-w', '%{http_code} %{size_download}', url], { encoding: 'utf8' });
    return out.trim();
  } catch (err) {
    return 'FAILED curl status ' + err.status;
  }
}
export const espnUrl = c => `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE.code}/teams/${c.espn}/roster?season=${LEAGUE.tmSeason}`;
export const tmUrl = c => `https://www.transfermarkt.com/${c.tm[0]}/kader/verein/${c.tm[1]}/saison_id/${LEAGUE.tmSeason}/plus/1`;

const log = [];
for (const c of CLUBS.slice(from, to)) {
  const e = path.join(LEAGUE.raw, `espn-${c.slug}.json`);
  const t = path.join(LEAGUE.raw, `tm-${c.slug}.html`);
  const stamp = new Date().toISOString();
  const re = fs.existsSync(e) && fs.statSync(e).size > 2000 ? 'kept' : get(espnUrl(c), e);
  await sleep(700);
  const rt = fs.existsSync(t) && fs.statSync(t).size > 20000 ? 'kept' : get(tmUrl(c), t);
  await sleep(1800);
  /* the third host: its squad page carries the squad as JSON in the page; keep that block only */
  const f = path.join(LEAGUE.raw, `fotmob-${c.slug}.json`);
  const fUrl = `https://www.fotmob.com/teams/${c.fotmob[0]}/squad/${c.fotmob[1]}`;
  let rf = 'kept';
  if (!(fs.existsSync(f) && fs.statSync(f).size > 1000)) {
    const tmp = path.join(LEAGUE.raw, `_fotmob-page.html`);
    rf = get(fUrl, tmp);
    if (rf.startsWith('200')) {
      const html = fs.readFileSync(tmp, 'utf8');
      const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      const fb = m ? JSON.parse(m[1]).props.pageProps.fallback : null;
      const key = fb ? Object.keys(fb).find(k => k === 'team-' + c.fotmob[0]) : null;
      if (key) fs.writeFileSync(f, JSON.stringify({ url: fUrl, read: stamp, details: { id: fb[key].details.id, name: fb[key].details.name, latestSeason: fb[key].details.latestSeason }, squad: fb[key].squad }));
      else rf = 'FAILED no squad block';
    }
    await sleep(1500);
  }
  log.push(`${c.slug}: espn ${re} | tm ${rt} | fotmob ${rf}`);
  fs.appendFileSync(path.join(LEAGUE.raw, '_fetchlog.txt'), `${stamp} ${c.slug} espn[${re}] ${espnUrl(c)} tm[${rt}] ${tmUrl(c)} fotmob[${rf}] ${fUrl}\n`);
}
console.log(log.join('\n'));

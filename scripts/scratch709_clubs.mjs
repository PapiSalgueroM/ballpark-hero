// Scratch, not committed: propose career club -> Wikidata team and -> market value club matches.
import fs from 'node:fs';

const [snapFile, wdFile, mvFile, outFile] = process.argv.slice(2);
const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
const wd = JSON.parse(fs.readFileSync(wdFile, 'utf8'));
const mv = JSON.parse(fs.readFileSync(mvFile, 'utf8'));
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set(['fc', 'f.c.', 'cf', 'c.f.', 'afc', 'a.f.c.', 'sc', 's.c.', 'ac', 'a.c.', 'club', 'de', 'del', 'futbol', 'football', 'calcio', 'sk', 's.k.', 'j.k.', 'jk', 'bc', 'ssc', 's.s.c.', 'ss', 'us', 'u.s.', 'as', 'a.s.', 'rc', 'r.c.', 'rcd', 'cd', 'ud', 'sd', 'sv', 'tsg', 'vfl', 'vfb', 'fk', 'nk', 'n.k.', 'hnk', 'gnk', 'cr', 'ec', 'e.c.', 'fr', 'f.r.', 'sfc', 'balompie', 'esporte', 'clube', 'futebol', 'football', 'soccer', 'the', 'cf.', 'if', 'bk', 'boldklub', 'sad', 'kv', 'krc', 'rsc', 'kaa', 'ksk', 'osc', 'hsc', 'ogc', 'fco', 'sco', 'a.d.', 'c.a.', 'ca', 'club.', 'real', 'sporting', '04', 'atletico', 'athletic', 'club', 'e', 'y', 'da', 'do']);
const toks = s => fold(s).replace(/[()'.,&]/g, ' ').split(/[\s-]+/).filter(t => t && !STOP.has(t) && !/^\d{4}$/.test(t));
const sim = (a, b) => {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const t of A) if (B.has(t)) inter += 1;
  return inter / Math.min(A.size, B.size);
};
const itemOf = new Map(Object.entries(wd.picks));
const byPlayer = new Map(snap.players.map(p => [p.id, p.player_name]));
const clubsPlayers = new Map();
for (const s of snap.seasons) { const n = byPlayer.get(s.player_id); (clubsPlayers.get(s.club) ?? clubsPlayers.set(s.club, new Set()).get(s.club)).add(n); }
const fold2 = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const out = {};
for (const [club, players] of [...clubsPlayers].sort()) {
  const wdScore = new Map(), mvScore = new Map();
  for (const n of players) {
    const q = itemOf.get(n);
    for (const st of wd.statements.filter(x => x.item === q && !x.national)) {
      const s = sim(club, st.teamLabel ?? '');
      if (s > 0) wdScore.set(st.team + '|' + st.teamLabel, Math.max(wdScore.get(st.team + '|' + st.teamLabel) ?? 0, s));
    }
    for (const r of mv.filter(x => x.name_folded === fold2(n))) {
      const s = sim(club, r.club);
      if (s > 0) mvScore.set(r.club, Math.max(mvScore.get(r.club) ?? 0, s));
    }
  }
  out[club] = {
    wikidata: [...wdScore].sort((a, b) => b[1] - a[1]).map(([k, s]) => `${k}|${s.toFixed(2)}`),
    marketValue: [...mvScore].sort((a, b) => b[1] - a[1]).map(([k, s]) => `${k}|${s.toFixed(2)}`),
  };
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const [club, m] of Object.entries(out)) console.log(`${club}\n   WD: ${m.wikidata.slice(0, 3).join(' ; ')}\n   MV: ${m.marketValue.slice(0, 3).join(' ; ')}`);

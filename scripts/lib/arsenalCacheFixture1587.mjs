/* Round 1587 (review major 2): a made up ai_validation_cache slice for genArsenalCachePurge1587.mjs, used by
   simClubNamesakes section C (in node) and rehearseClubNamesakes1587 section D (in PGlite). Every key is built the way
   the validator writes it: validate-player's flat(player)|flat(team)|pos|c, and football-connect4-validate's
   norm(player|row|column) pair key and attr|norm(player)|norm(attribute) fact. One sarandi man S and one london man L
   of the ledger. want: delete (a yes for S at Arsenal), keep (a refusal, L, another club, another game), held (a one
   word key that is only S's last name). */
const marks = /[̀-ͯ]/g;
const dbFold = s => String(s || '').normalize('NFD').replace(marks, '').toLowerCase().replace(/\s+/g, ' ').trim();
const flat = s => dbFold(s).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const norm = s => String(s).toLowerCase().normalize('NFD').replace(marks, '').trim();

export function cacheFixture(ledger, market) {
  const byId = new Map(market.map(r => [r.id, r]));
  const pick = v => ledger.men.find(m => m.verdict === v && String(byId.get(m.rows[0])?.player_name).includes(' '));
  const S = pick('sarandi'), L = pick('london');
  if (!S || !L) return null;
  const s = byId.get(S.rows[0]).player_name, l = byId.get(L.rows[0]).player_name;
  const last = s.split(' ').pop();
  const yes = (name, team) => ({ valid: true, reason: `Verified from our own records: ${name} is on file at ${team}.`, fullName: name });
  const rows = [
    ['build-your-xi', `${flat(s)}|arsenal|CB|c`, yes(s, 'Arsenal'), 'delete'],
    ['build-your-xi', `${flat(s)}|arsenal||c`, { valid: false, reason: 'not on file at Arsenal' }, 'keep'],
    ['build-your-xi', `${flat(l)}|arsenal|FW|c`, yes(l, 'Arsenal'), 'keep'],
    ['build-your-xi', `${flat(s)}|chelsea||c`, yes(s, 'Chelsea'), 'keep'],
    ['football-connect4', norm(`${s}|Played for Arsenal|Played for Chelsea`), { valid: true, matchesRow: true, matchesColumn: true, fullName: s }, 'delete'],
    ['football-connect4', norm(`${s}|Played for Chelsea|Played for Arsenal`), { valid: false, matchesRow: false, matchesColumn: true, fullName: s }, 'keep'],
    ['football-connect4', `attr|${norm(s)}|${norm('Played for Arsenal')}`, { match: true, fullName: s }, 'delete'],
    ['football-connect4', `attr|${norm(l)}|${norm('Played for Arsenal')}`, { match: true, fullName: l }, 'keep'],
    ['football-connect4', `attr|${norm(last)}|${norm('Played for Arsenal')}`, { match: true, fullName: s }, 'held'],
    ['soccer-grid', `${norm(s)}|played for arsenal|argentina`, { valid: true, fullName: s }, 'keep'],
  ].map(([game, cache_key, verdict, want]) => ({ game, cache_key, verdict, want }));
  return { S: s, L: l, rows };
}
